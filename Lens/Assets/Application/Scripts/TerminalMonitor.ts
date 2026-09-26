import { ZMachineHost } from "./ZMachineHost";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { Theme } from "./Theme";

/**
 * UX2 Terminal Monitor (docs/UX2-proposal.md §4.4): a glowing CRT rim with
 * faint scanlines around the transcript + status line, and the whole group
 * yawed toward the player like the promo's tilted terminal.
 *
 * Lives on the frame's own SceneObject (an Image showing monitor_frame.png),
 * as a child of the ZMachineHost object, which already groups Output + Status.
 *
 * Sizing is measured, not guessed: once the transcript shows a few lines, the
 * Text's rendered AABB gives the real character width and line height, and the
 * frame is fixed ONCE at wrapColumn x maxLines (+ status strip). It never
 * resizes after that, so text arriving can't make the frame pulse.
 */
@component
export class TerminalMonitor extends BaseScriptComponent {
    @input
    host: ZMachineHost;

    @input
    outputText: Text;

    @input
    @allowUndefined
    statusText: Text;

    /** Yaw (degrees) of the whole monitor group toward the player. 0 = flat. */
    @input
    tiltDegrees: number = 9;

    /** Raise the whole monitor group (cm), clear of the command lectern below. */
    @input
    lift: number = 1.5;

    /** Glass margin (cm) between the text and the rim. */
    @input
    padding: number = 1.2;

    /**
     * Size (cm) of the Image plane at scale 1. The Image's mesh AABB reports
     * twice the rendered size, so this is a known constant, not measured.
     */
    @input
    planeUnit: number = 1;

    /** Push the frame this far (cm) behind the text plane. */
    @input
    depthOffset: number = 0.6;

    /** Fraction of the texture occupied by the rim rectangle (monitor_frame.png: 44 px margins). */
    private static readonly RIM_FRAC_X = 1 - (2 * 44) / 1200;
    private static readonly RIM_FRAC_Y = 1 - (2 * 44) / 1000;

    private image: Image | null = null;
    private sized: boolean = false;
    private unitSize: vec2 | null = null;
    private baseParentPos: vec3 | null = null;
    private pollClock: number = 0;
    private diagClock: number = 0;
    // scrollback UI (§11.2): text scrollbar + touch surface on the glass
    private gutter: Text | null = null;
    private lastVersion: number = -1;
    private blinkOn: boolean = false;
    private lineH: number = 1;
    private measured: boolean = false;
    private gutterX: number = 0;
    private frameCx: number = 0;
    private touchObj: SceneObject | null = null;
    private touchShape: BoxShape | null = null;
    // metrics used for the current layout (defaults, then live measurement)
    private used = { left: 0, top: 0, charW: 0, lineH: 0 };

    /**
     * Default transcript geometry (group space, cm), measured on device with
     * JetBrains Mono at size 32: glyph-box left, top of line 0, char width,
     * line height. Lets the frame appear the moment the transcript does,
     * instead of waiting for a measurable screen (30 s on Metamorphoses).
     */
    private static readonly DEFAULT_GEOM = { left: -21.618, top: 8.25, charW: 0.46, lineH: 1.0 };

    /** Throttled "why aren't we sized yet" log (every 3 s). */
    private diag(msg: string): void {
        if (this.diagClock <= 0) {
            print("TerminalMonitor: waiting - " + msg);
            this.diagClock = 3;
        }
    }

    onAwake() {
        this.image = this.getSceneObject().getComponent("Component.Image") as Image;
        if (this.image) {
            this.image.stretchMode = StretchMode.Stretch; // the transform sets the aspect
        }
        this.createEvent("OnStartEvent").bind(() => {
            this.setVisible(false); // nothing to frame until the transcript has text
            this.measureUnitSize();
        });
        this.createEvent("UpdateEvent").bind(() => this.tick());
    }

    private setVisible(on: boolean): void {
        if (this.image) {
            this.image.enabled = on;
        }
    }

    /** The Image plane's size at scale 1, so we can scale it to cm exactly. */
    private measureUnitSize(): void {
        const u = this.planeUnit > 0 ? this.planeUnit : 1;
        this.unitSize = new vec2(u, u);
    }

    private tick(): void {
        const shown = this.outputText.getSceneObject().isEnabledInHierarchy;
        if (!this.sized) {
            if (shown && this.host && this.unitSize) {
                const d = TerminalMonitor.DEFAULT_GEOM;
                this.layout(d.left, d.top, d.charW, d.lineH, 0, "defaults");
            }
            return;
        }
        // AppFlow hides the transcript during splash/library; the frame follows it.
        if (this.image && this.image.enabled !== shown) {
            this.image.enabled = shown;
        }
        this.updateGutter();
        if (this.measured) {
            return; // fixed; idle cost is this check + a version compare
        }
        // refine once against a live measurement, if the defaults were off
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        this.pollClock += dt;
        this.diagClock -= dt;
        if (this.pollClock < 0.5) {
            return;
        }
        this.pollClock = 0;
        this.trySize();
    }

    /** AABB of a Text in the monitor group's space (its parent), as [min, max]. */
    private boxInGroup(text: Text): vec3[] | null {
        try {
            // Text's mesh AABB is empty (+-3.4e38); getBoundingBox() gives the
            // rendered text rect in the Text object's local space.
            const r = (text as any).getBoundingBox();
            if (!r || !(r.right - r.left > 0) || !(r.top - r.bottom > 0)) {
                return null;
            }
            const mn = new vec2(r.left, r.bottom);
            const mx = new vec2(r.right, r.top);
            const tr = text.getSceneObject().getTransform();
            const p = tr.getLocalPosition();
            const s = tr.getLocalScale();
            return [
                new vec3(p.x + mn.x * s.x, p.y + mn.y * s.y, p.z),
                new vec3(p.x + mx.x * s.x, p.y + mx.y * s.y, p.z),
            ];
        } catch (e) {
            return null;
        }
    }

    private trySize(): void {
        if (!this.outputText || !this.host || !this.unitSize) {
            this.diag("inputs/unitSize missing (unitSize=" + this.unitSize + ")");
            return;
        }
        // Blank lines take vertical space but add no glyphs, so the rendered box
        // spans only first..last non-empty line. Measure over that span, and
        // wait for enough lines that one line's ascent/descent doesn't skew it
        // (9:05 opens with blank lines; measuring by lines.length undersized it).
        const lines = (this.outputText.text || "").split("\n");
        let longest = 0;
        let first = -1;
        let last = -1;
        for (let i = 0; i < lines.length; i++) {
            const ln = lines[i].replace(/\s+$/, "");
            longest = Math.max(longest, ln.length);
            if (ln.length > 0) {
                if (first < 0) {
                    first = i;
                }
                last = i;
            }
        }
        const span = first < 0 ? 0 : last - first + 1;
        if (span < 8 || longest < 20) {
            return; // not enough text yet for a reliable measurement
        }
        // Lens doesn't reserve space for blank lines at the anchored edge, so
        // only measure when the anchored line has glyphs: then the glyph box
        // edge IS that line's edge (guessing blank-line offsets put the rim
        // four lines too high on 9:05).
        const bottomAligned = this.outputText.verticalAlignment === VerticalAlignment.Bottom;
        if (bottomAligned ? last !== lines.length - 1 : first !== 0) {
            return;
        }
        const box = this.boxInGroup(this.outputText);
        if (!box) {
            let raw = "n/a";
            try {
                const r = (this.outputText as any).getBoundingBox();
                raw = r ? "rect l" + r.left + " r" + r.right + " b" + r.bottom + " t" + r.top : "no rect";
            } catch (e) {
                raw = "throws: " + e;
            }
            this.diag("transcript AABB unusable: " + raw);
            return;
        }
        const charW = (box[1].x - box[0].x) / longest;
        const lineH = (box[1].y - box[0].y) / span;
        const left = box[0].x;
        const top = bottomAligned ? box[0].y + this.host.maxLines * lineH : box[1].y;
        this.measured = true;
        const u = this.used;
        const off = (a: number, b: number) => Math.abs(a - b) > Math.max(0.05 * Math.abs(b), 0.05);
        if (off(charW, u.charW) || off(lineH, u.lineH) || Math.abs(left - u.left) > 0.3 || Math.abs(top - u.top) > 0.3) {
            this.layout(left, top, charW, lineH, box[0].z, "measured");
        } else {
            print("TerminalMonitor: live measurement matches defaults (" + charW.toFixed(3) + "x" + lineH.toFixed(3) + ")");
        }
    }

    /**
     * Size and place the rim for a transcript whose line 0 starts at
     * (left, top) with the given glyph metrics, then tilt the group and
     * (re)place the scrollbar + touch surface. Safe to call again.
     */
    private layout(left: number, top: number, charW: number, lineH: number, z: number, source: string): void {
        if (!this.host || !this.unitSize) {
            return;
        }
        this.used = { left: left, top: top, charW: charW, lineH: lineH };
        const cols = this.host.wrapColumn > 0 ? this.host.wrapColumn : 42;
        // +2 columns: a gap and the text scrollbar
        const w = (cols + 2) * charW;
        const h = this.host.maxLines * lineH;
        const textTop = top;
        let frameTop = top;
        const bottom = top - h;
        if (this.statusText) {
            const sb = this.boxInGroup(this.statusText);
            // status line above the transcript; reserve room if not rendered yet
            frameTop = sb ? Math.max(frameTop, sb[1].y) : frameTop + lineH * 1.6;
        }
        const rimW = w + 2 * this.padding;
        const rimH = frameTop - bottom + 2 * this.padding;
        const cx = left + w / 2;
        const cy = (frameTop + bottom) / 2;

        const t = this.getSceneObject().getTransform();
        t.setLocalScale(new vec3(
            rimW / TerminalMonitor.RIM_FRAC_X / this.unitSize.x,
            rimH / TerminalMonitor.RIM_FRAC_Y / this.unitSize.y,
            1
        ));
        t.setLocalPosition(new vec3(cx, cy, z - this.depthOffset));
        this.applyTilt(new vec3(cx, cy, 0));
        this.setVisible(this.outputText.getSceneObject().isEnabledInHierarchy);
        this.sized = true;
        this.lineH = lineH;
        this.buildScrollUi(left + (cols + 1) * charW, frameTop, textTop, cx, cy, rimW, rimH, z);
        print(
            "TerminalMonitor: framed (" + source + ") " + cols + "x" + this.host.maxLines + " @ " + charW.toFixed(3) + "x" +
            lineH.toFixed(3) + " cm -> rim " + rimW.toFixed(1) + "x" + rimH.toFixed(1) + " cm, tilt " + this.tiltDegrees + " deg"
        );
    }

    /**
     * Scrollback UI: a one-column text scrollbar right of the transcript and
     * one touch surface over the glass. Drag = grab the text and scroll; tap
     * = continue at "— MORE —", or page with the ▲/▼ ends of the scrollbar.
     */
    private buildScrollUi(gutterX: number, _frameTop: number, textTop: number, cx: number, cy: number,
        rimW: number, rimH: number, z: number): void {
        const group = this.getSceneObject().getParent();
        if (!group || !this.host) {
            return;
        }
        if (this.gutter && this.touchObj && this.touchShape) {
            // re-layout: just move/resize what exists
            this.gutter.getSceneObject().getTransform().setLocalPosition(new vec3(gutterX, textTop, z));
            this.touchObj.getTransform().setLocalPosition(new vec3(cx, cy, z + 0.2));
            this.touchShape.size = new vec3(rimW, rimH, 0.5);
            this.gutterX = gutterX;
            this.frameCx = cx;
            return;
        }
        this.gutterX = gutterX;
        this.frameCx = cx;
        // scrollbar: same font + size as the transcript, so rows line up
        const gObj = global.scene.createSceneObject("TranscriptGutter");
        gObj.setParent(group);
        gObj.getTransform().setLocalPosition(new vec3(gutterX, textTop, z));
        const g = gObj.createComponent("Component.Text") as Text;
        g.font = this.outputText.font;
        g.size = this.outputText.size;
        g.textFill.color = new vec4(Theme.cyan.r, Theme.cyan.g, Theme.cyan.b, 0.8);
        g.horizontalAlignment = HorizontalAlignment.Left;
        g.verticalAlignment = VerticalAlignment.Top;
        g.worldSpaceRect = Rect.create(0, 2, -40, 0);
        g.text = "";
        this.gutter = g;

        const tObj = global.scene.createSceneObject("TranscriptTouch");
        tObj.setParent(group);
        tObj.getTransform().setLocalPosition(new vec3(cx, cy, z + 0.2));
        const col = tObj.createComponent("Physics.ColliderComponent") as ColliderComponent;
        const shape = Shape.createBoxShape();
        shape.size = new vec3(rimW, rimH, 0.5);
        col.shape = shape;
        this.touchObj = tObj;
        this.touchShape = shape;
        const touch = tObj.createComponent(Interactable.getTypeName()) as Interactable;
        const hit = (e: InteractorEvent): vec3 | null => {
            const info = e.interactor ? e.interactor.targetHitInfo : null;
            return info ? info.localHitPosition : null; // cm, frame-centred
        };
        let startY = 0;
        let moved = false;
        touch.onTriggerStart.add((e: InteractorEvent) => {
            const p = hit(e);
            if (!p) {
                return;
            }
            startY = p.y;
            moved = false;
            this.host.transcriptScroll.beginDrag(p.y);
        });
        touch.onTriggerUpdate.add((e: InteractorEvent) => {
            const p = hit(e);
            if (!p) {
                return;
            }
            if (!moved && Math.abs(p.y - startY) > this.lineH * 0.5) {
                moved = true;
            }
            if (moved && this.host.transcriptScroll.dragTo(p.y, this.lineH)) {
                this.host.refreshTranscript();
            }
        });
        touch.onTriggerEnd.add((e: InteractorEvent) => {
            if (moved) {
                return;
            }
            if (this.host.continueMore()) {
                return; // tap anywhere continues a paged turn
            }
            const p = hit(e);
            const gx = this.gutterX - this.frameCx; // scrollbar column, frame-centred
            if (p && p.x > gx - this.lineH * 0.6) {
                if (this.host.transcriptScroll.page(p.y > 0 ? -1 : 1)) {
                    this.host.refreshTranscript();
                }
            }
        });
        print("TerminalMonitor: scrollback armed (drag the glass, tap ▲/▼, tap to continue MORE)");
    }

    /** Redraw the scrollbar when the view changed; blink ▼ while text waits below. */
    private updateGutter(): void {
        if (!this.gutter || !this.host) {
            return;
        }
        const s = this.host.transcriptScroll;
        const waitingBelow = !s.following && s.offset < s.maxOffset;
        // @ts-ignore - getTime is a Lens runtime global
        const blink = waitingBelow && Math.floor(getTime() * 2.5) % 2 === 0;
        if (this.host.transcriptVersion === this.lastVersion && blink === this.blinkOn) {
            return;
        }
        this.lastVersion = this.host.transcriptVersion;
        this.blinkOn = blink;
        this.gutter.text = s.gutter(blink);
    }

    /** Yaw the monitor group (this object's parent) about the frame centre. */
    private applyTilt(pivot: vec3): void {
        const group = this.getSceneObject().getParent();
        if (!group) {
            return;
        }
        const gt = group.getTransform();
        if (!this.baseParentPos) {
            this.baseParentPos = gt.getLocalPosition();
        }
        const r = quat.angleAxis((this.tiltDegrees * Math.PI) / 180, vec3.up());
        // P = base + c - R*c keeps the pivot fixed while the group rotates.
        const rc = r.multiplyVec3(pivot);
        gt.setLocalRotation(r);
        gt.setLocalPosition(this.baseParentPos.add(pivot).sub(rc).add(new vec3(0, this.lift, 0)));
    }

    /** New game / library return: re-measure on the next text. */
    public reset(): void {
        this.sized = false;
        this.setVisible(false);
    }
}
