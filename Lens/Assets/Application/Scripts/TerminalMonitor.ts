import { ZMachineHost } from "./ZMachineHost";

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
        if (this.sized) {
            // AppFlow hides the transcript during splash/library; the frame follows it.
            const shown = this.outputText.getSceneObject().isEnabledInHierarchy;
            if (this.image && this.image.enabled !== shown) {
                this.image.enabled = shown;
            }
            return; // fixed size; idle cost is this check
        }
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        this.pollClock += dt;
        this.diagClock -= dt;
        if (this.pollClock < 0.25) {
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
        const cols = this.host.wrapColumn > 0 ? this.host.wrapColumn : longest;
        const w = cols * charW;
        const h = this.host.maxLines * lineH;

        // Anchor on the edges that don't move as text arrives.
        const left = this.outputText.horizontalAlignment === HorizontalAlignment.Right ? box[1].x - w : box[0].x;
        let top: number;
        let bottom: number;
        if (bottomAligned) {
            bottom = box[0].y;
            top = bottom + h;
        } else {
            top = box[1].y;
            bottom = top - h;
        }
        if (this.statusText) {
            const sb = this.boxInGroup(this.statusText);
            if (sb) {
                top = Math.max(top, sb[1].y);
            } else {
                // status not rendered yet: reserve one line above the transcript
                top += lineH * 1.6;
            }
        }
        const rimW = w + 2 * this.padding;
        const rimH = top - bottom + 2 * this.padding;
        const cx = left + w / 2;
        const cy = (top + bottom) / 2;

        const t = this.getSceneObject().getTransform();
        t.setLocalScale(new vec3(
            rimW / TerminalMonitor.RIM_FRAC_X / this.unitSize.x,
            rimH / TerminalMonitor.RIM_FRAC_Y / this.unitSize.y,
            1
        ));
        t.setLocalPosition(new vec3(cx, cy, box[0].z - this.depthOffset));
        this.applyTilt(new vec3(cx, cy, 0));
        this.setVisible(true);
        this.sized = true;
        const op = this.outputText.getSceneObject().getTransform();
        print("TerminalMonitor: transcript rect " + box[0] + " .. " + box[1] + " (Output local pos " +
            op.getLocalPosition() + ", world pos " + op.getWorldPosition() + ")");
        print(
            "TerminalMonitor: framed " + cols + "x" + this.host.maxLines + " @ " + charW.toFixed(3) + "x" +
            lineH.toFixed(3) + " cm -> rim " + rimW.toFixed(1) + "x" + rimH.toFixed(1) + " cm, tilt " + this.tiltDegrees + " deg"
        );
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
