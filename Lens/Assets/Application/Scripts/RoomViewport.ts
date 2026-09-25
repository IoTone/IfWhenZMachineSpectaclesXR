import { RoomIllustrator } from "./RoomIllustrator";
import { ZMachineHost } from "./ZMachineHost";
import { Theme } from "./Theme";
import { UxSettings } from "./UxSettings";

/**
 * UX2 Room Viewport (docs/UX2-proposal.md §4.6), step 3A.
 *
 * Turns the ~7 s image wait into the promo's staged reveal:
 *   WIREFRAME            room entered: a janky cyan sketch draws itself from
 *                        the room's objects (door -> rectangle, tree ->
 *                        triangle, grate -> grid...) and keeps re-sketching
 *   AI ART               the generated image is on screen
 *   SPATIAL IMAGE · 3D   the Spatial Image depth mesh loaded
 *   TEXT ONLY            no image is coming (offline / no image returned)
 *
 * When the image lands it PAINTS IN (step 3B): rows reveal top-down behind a
 * 4x4 ordered-dither edge, at sketch resolution, with the wireframe left
 * faintly over it; then the full-res flat image takes over.
 *
 * The sketch is drawn on the CPU into a small ProceduralTexture (no shader),
 * shown on this object's Image in the illustration slot. A mono caption types
 * the room's first sentence under it.
 */
@component
export class RoomViewport extends BaseScriptComponent {
    @input
    illustrator: RoomIllustrator;

    @input
    zmHost: ZMachineHost;

    /** The flat illustration plane; the sketch copies its placement. */
    @input
    illustrationSlot: SceneObject;

    @input
    @allowUndefined
    labelText: Text;

    @input
    @allowUndefined
    captionText: Text;

    @input
    @allowUndefined
    monoFont: Font;

    /** Neon rim around the viewport (an Image using the MonitorFrame material). */
    @input
    @allowUndefined
    frameImage: Image;

    /** Glass margin (cm) between the image and the rim. */
    @input
    framePadding: number = 1.0;

    /** Seconds to draw the full sketch, and to hold it before re-sketching. */
    @input
    drawSeconds: number = 1.4;

    @input
    holdSeconds: number = 1.2;

    /** Paint-in duration for a freshly generated image, and for a cached one. */
    @input
    paintSeconds: number = 1.0;

    @input
    cachedPaintSeconds: number = 0.35;

    private static readonly TW = 256;
    private static readonly TH = 160;
    private static readonly FPS = 15;

    private image: Image | null = null;
    private provider: ProceduralTextureProvider | null = null;
    private pixels: Uint8Array = new Uint8Array(RoomViewport.TW * RoomViewport.TH * 4);
    private segs: number[][] = [];
    private totalLen: number = 0;
    private sketching: boolean = false;
    private clock: number = 0;
    private frameClock: number = 0;
    private loop: number = 0;
    private room: string = "";
    private lastCtx: any = null;
    private caption: string = "";
    private captionShown: number = 0;
    // paint-in state
    private art: Uint8Array = new Uint8Array(RoomViewport.TW * RoomViewport.TH * 4);
    private wireMask: Uint8Array = new Uint8Array(RoomViewport.TW * RoomViewport.TH);
    private painting: boolean = false;
    private paintT: number = 0;
    private paintDur: number = 1;
    private roomT: number = 0;
    private sweeping: boolean = false;
    private sweepT: number = 0;
    /** monitor_frame.png rim rectangle as a fraction of the texture (44 px margins). */
    private static readonly RIM_FRAC_X = 1 - (2 * 44) / 1200;
    private static readonly RIM_FRAC_Y = 1 - (2 * 44) / 1000;
    private static readonly BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    onAwake() {
        this.image = this.getSceneObject().getComponent("Component.Image") as Image;
        this.createEvent("OnStartEvent").bind(() => this.start());
        this.createEvent("UpdateEvent").bind(() => this.tick());
    }

    private start(): void {
        let tex: Texture;
        try {
            tex = ProceduralTextureProvider.createWithFormat(RoomViewport.TW, RoomViewport.TH, TextureFormat.RGBA8Unorm);
        } catch (e) {
            tex = ProceduralTextureProvider.create(RoomViewport.TW, RoomViewport.TH, Colorspace.RGBA); // older runtimes
        }
        this.provider = tex.control as ProceduralTextureProvider;
        if (this.image) {
            this.image.stretchMode = StretchMode.Stretch;
            const mat = this.image.mainMaterial.clone();
            this.image.mainMaterial = mat;
            this.image.mainPass.baseTex = tex;
            this.image.enabled = false;
        }
        if (this.illustrator && this.illustrator.flatImage) {
            // Crop to the slot box (Fill let square images overflow it), so
            // the paint-in and the final image frame identically.
            this.illustrator.flatImage.stretchMode = StretchMode.FillAndCut;
        }
        this.placeOverSlot();
        this.styleText(this.labelText, 26, Theme.cyan);
        this.styleText(this.captionText, 20, Theme.phosphor);
        this.setLabel("");
        if (this.zmHost) {
            this.zmHost.addSceneContextListener((ctx: any) => {
                this.lastCtx = ctx;
                if (!ctx) {
                    this.sweeping = false;
                    this.setFrameVisible(false);
                    this.endPaint(false);
                    this.stopSketch();
                    this.setLabel("");
                    this.setCaption("");
                }
            });
        }
        if (this.illustrator) {
            this.illustrator.setLoadingListener({
                onSceneLoadStart: (room: string) => this.beginRoom(room),
                onImageShown: (_room: string, texture?: Texture) => this.paint(texture),
                onSpatialReady: () => this.spatialArrived(),
                onImageUnavailable: () => this.stage("TEXT ONLY", Theme.pink, true),
            });
            // We start in the same frame as the illustrator, often just after
            // it began the first room: catch up instead of missing it.
            const loading = this.illustrator.loadingRoom;
            if (loading) {
                this.beginRoom(loading);
            }
        }
        print("RoomViewport: ready");
    }

    /** Sit exactly on the illustration plane, a hair in front of it. */
    private placeOverSlot(): void {
        if (!this.illustrationSlot) {
            return;
        }
        const src = this.illustrationSlot.getTransform();
        const t = this.getSceneObject().getTransform();
        t.setWorldPosition(src.getWorldPosition().add(src.forward.uniformScale(2.6)));
        t.setWorldRotation(src.getWorldRotation());
        t.setWorldScale(src.getWorldScale());
        // Label + caption hang under the viewport's bottom-left corner. They
        // are siblings, not children, so the plane's non-uniform scale can't
        // stretch the type. The Image plane is 1 unit per scale unit.
        const sc = src.getWorldScale();
        const corner = src.getWorldPosition()
            .sub(src.right.uniformScale(sc.x / 2))
            .sub(src.up.uniformScale(sc.y / 2))
            .add(src.forward.uniformScale(0.3));
        const place = (text: Text, drop: number) => {
            if (!text) {
                return;
            }
            text.horizontalAlignment = HorizontalAlignment.Left;
            text.verticalAlignment = VerticalAlignment.Top;
            // Layout box starts AT the object (top-left), so the anchor we
            // compute is where the first glyph lands. The preset's box is
            // centred (-7.5..7.5), which shoved left-aligned text 7.5 cm left.
            text.worldSpaceRect = Rect.create(0, 40, -8, 0);
            const tt = text.getSceneObject().getTransform();
            tt.setWorldPosition(corner.sub(src.up.uniformScale(drop)));
            tt.setWorldRotation(src.getWorldRotation());
        };
        place(this.labelText, 0.9);
        place(this.captionText, 2.3);
        if (this.frameImage) {
            // rim hugs the viewport with a glass margin, just behind the image
            this.frameImage.stretchMode = StretchMode.Stretch;
            const ft = this.frameImage.getSceneObject().getTransform();
            ft.setWorldRotation(src.getWorldRotation());
            ft.setWorldPosition(src.getWorldPosition().sub(src.forward.uniformScale(0.3)));
            ft.setWorldScale(new vec3(
                (sc.x + 2 * this.framePadding) / RoomViewport.RIM_FRAC_X,
                (sc.y + 2 * this.framePadding) / RoomViewport.RIM_FRAC_Y,
                1
            ));
        }
    }

    private setFrameVisible(on: boolean): void {
        if (this.frameImage) {
            this.frameImage.enabled = on;
        }
    }

    private styleText(text: Text, size: number, color: vec4): void {
        if (!text) {
            return;
        }
        if (this.monoFont) {
            text.font = this.monoFont;
        }
        text.size = size;
        text.textFill.color = color;
    }

    private setLabel(s: string, color?: vec4): void {
        if (this.labelText) {
            this.labelText.text = s;
            if (color) {
                this.labelText.textFill.color = color;
            }
        }
    }

    private setCaption(s: string): void {
        this.caption = s;
        this.captionShown = UxSettings.effectsReduced ? s.length : 0;
        if (this.captionText) {
            this.captionText.text = s.substr(0, this.captionShown);
        }
    }

    // ------------------------------------------------------------ stages
    private beginRoom(room: string): void {
        this.endPaint(false);
        this.sweeping = false;
        this.setFrameVisible(true);
        this.room = room;
        this.roomT = 0;
        this.placeOverSlot(); // the rig may have been re-parked since start
        this.buildSketch(room, this.lastCtx);
        this.loop = 0;
        this.clock = 0;
        this.frameClock = 1; // draw on the next tick
        this.sketching = true;
        if (this.image) {
            this.image.enabled = true;
        }
        this.setLabel("WIREFRAME", Theme.cyan);
        // lastTurnText is published before scene listeners fire, so this is
        // the current room's description.
        this.setCaption(this.captionFor(room));
    }

    /** Image or its absence has arrived: stop re-sketching. */
    private stage(label: string, color: vec4, keepSketch: boolean): void {
        this.setLabel(label, color);
        if (keepSketch) {
            // no image is coming: settle on the finished sketch
            this.sketching = false;
            this.render(1.0, 0);
        } else {
            this.stopSketch();
        }
    }

    /** The image arrived: paint it in over the sketch (or just show it). */
    private paint(texture?: Texture): void {
        this.setLabel("AI ART", Theme.amber);
        if (!texture || UxSettings.effectsReduced || !this.provider || !this.readArt(texture)) {
            this.stopSketch();
            return;
        }
        // wire mask = the finished sketch, to leave faintly over the image
        this.render(1.0, this.loop);
        for (let i = 0; i < this.wireMask.length; i++) {
            this.wireMask[i] = this.pixels[i * 4 + 3] > 0 ? 1 : 0;
        }
        // Hide the full-res flat image while we paint (the illustrator enabled
        // it in this same frame, so it never flashes).
        this.setFlatVisible(false);
        this.sketching = false;
        this.painting = true;
        this.paintT = 0;
        // a cached room arrives almost instantly: short paint
        this.paintDur = this.roomT < 0.6 ? this.cachedPaintSeconds : this.paintSeconds;
        if (this.image) {
            this.image.enabled = true;
        }
        this.frameClock = 1;
    }

    /** Sample the image into `art` at sketch resolution, FillAndCut-cropped. */
    private readArt(texture: Texture): boolean {
        try {
            const w = texture.getWidth();
            const h = texture.getHeight();
            const readable = ProceduralTextureProvider.createFromTexture(texture);
            const src = new Uint8Array(w * h * 4);
            (readable.control as ProceduralTextureProvider).getPixels(0, 0, w, h, src);
            const TW = RoomViewport.TW;
            const TH = RoomViewport.TH;
            // centre crop to the viewport aspect
            let cw = w, ch = h;
            if (w / h > TW / TH) {
                cw = h * (TW / TH);
            } else {
                ch = w * (TH / TW);
            }
            const x0 = (w - cw) / 2, y0 = (h - ch) / 2;
            for (let ty = 0; ty < TH; ty++) {
                const sy = Math.min(h - 1, Math.floor(y0 + ((ty + 0.5) * ch) / TH));
                for (let tx = 0; tx < TW; tx++) {
                    const sx = Math.min(w - 1, Math.floor(x0 + ((tx + 0.5) * cw) / TW));
                    const si = (sy * w + sx) * 4, di = (ty * TW + tx) * 4;
                    this.art[di] = src[si];
                    this.art[di + 1] = src[si + 1];
                    this.art[di + 2] = src[si + 2];
                    this.art[di + 3] = 255;
                }
            }
            return true;
        } catch (e) {
            print("RoomViewport: can't read image pixels, skipping paint-in (" + e + ")");
            return false;
        }
    }

    /** Composite one paint frame: dithered reveal edge, wire ghost on top. */
    private renderPaint(p: number): void {
        const TW = RoomViewport.TW;
        const TH = RoomViewport.TH;
        const c = Theme.cyan;
        const cr = c.r * 255, cg = c.g * 255, cb = c.b * 255;
        const ghost = 0.3; // wire strength left over the painted image
        const edge = p * (TH + 8); // in sketch rows, top-down
        for (let ty = 0; ty < TH; ty++) {
            const ys = TH - 1 - ty; // sketch space: 0 = top
            const reveal = (edge - ys) / 6;
            for (let tx = 0; tx < TW; tx++) {
                const k = ty * TW + tx;
                const i = k * 4;
                const wire = this.wireMask[k] === 1;
                if (reveal > RoomViewport.BAYER[(ys & 3) * 4 + (tx & 3)] / 16) {
                    if (wire) {
                        this.pixels[i] = this.art[i] + (cr - this.art[i]) * ghost;
                        this.pixels[i + 1] = this.art[i + 1] + (cg - this.art[i + 1]) * ghost;
                        this.pixels[i + 2] = this.art[i + 2] + (cb - this.art[i + 2]) * ghost;
                    } else {
                        this.pixels[i] = this.art[i];
                        this.pixels[i + 1] = this.art[i + 1];
                        this.pixels[i + 2] = this.art[i + 2];
                    }
                    this.pixels[i + 3] = 255;
                } else if (wire) {
                    this.pixels[i] = cr;
                    this.pixels[i + 1] = cg;
                    this.pixels[i + 2] = cb;
                    this.pixels[i + 3] = 255;
                } else {
                    this.pixels[i + 3] = 0;
                }
            }
            // bright scanline riding the reveal edge
            if (Math.abs(ys - edge) < 1 && p < 1) {
                for (let tx = 0; tx < TW; tx++) {
                    const i = (ty * TW + tx) * 4;
                    this.pixels[i] = 220;
                    this.pixels[i + 1] = 255;
                    this.pixels[i + 2] = 255;
                    this.pixels[i + 3] = 255;
                }
            }
        }
        if (this.provider) {
            this.provider.setPixels(0, 0, TW, TH, this.pixels);
        }
    }

    /** Finish (hand over to the full-res image) or cancel the paint-in. */
    private endPaint(showFlat: boolean): void {
        if (!this.painting) {
            return;
        }
        this.painting = false;
        if (showFlat) {
            this.setFlatVisible(true);
            this.stopSketch();
        }
    }

    private setFlatVisible(on: boolean): void {
        if (this.illustrator && this.illustrator.flatImage) {
            this.illustrator.flatImage.getSceneObject().enabled = on;
        }
    }

    /** 3D mesh loaded: label it and run one depth-scan sweep down the viewport. */
    private spatialArrived(): void {
        this.setLabel("SPATIAL IMAGE · 3D", Theme.cyan);
        if (UxSettings.effectsReduced || !this.provider || this.painting) {
            return;
        }
        this.sketching = false;
        this.sweeping = true;
        this.sweepT = 0;
        this.frameClock = 1;
        if (this.image) {
            this.image.enabled = true;
        }
    }

    /** One sweep frame: a bright cyan scan line with a dotted trail. */
    private renderSweep(p: number): void {
        const TW = RoomViewport.TW;
        const TH = RoomViewport.TH;
        const c = Theme.cyan;
        this.pixels.fill(0);
        const ys = Math.floor(p * (TH - 1)); // sketch space, 0 = top
        const put = (x: number, y: number, r: number, g: number, b: number) => {
            if (y < 0 || y >= TH) {
                return;
            }
            const i = ((TH - 1 - y) * TW + x) * 4;
            this.pixels[i] = r;
            this.pixels[i + 1] = g;
            this.pixels[i + 2] = b;
            this.pixels[i + 3] = 255;
        };
        for (let x = 0; x < TW; x++) {
            put(x, ys, 220, 255, 255);
            put(x, ys - 1, c.r * 255, c.g * 255, c.b * 255);
            if (x % 6 === 0) {
                put(x, ys - 4, c.r * 255, c.g * 255, c.b * 255); // depth-sample dots
            }
        }
        if (this.provider) {
            this.provider.setPixels(0, 0, TW, TH, this.pixels);
        }
    }

    private stopSketch(): void {
        this.sketching = false;
        if (this.image) {
            this.image.enabled = false;
        }
    }

    private captionFor(room: string): string {
        let body = (this.zmHost && this.zmHost.lastTurnText) || "";
        const r = room.trim();
        // The room header precedes its description; take what follows its LAST
        // appearance, so a first turn's title banner isn't captioned.
        const at = r.length > 0 ? body.toLowerCase().lastIndexOf(r.toLowerCase()) : -1;
        if (at >= 0) {
            body = body.slice(at + r.length);
        }
        body = body.replace(/^\s*\([^)]*\)\s*/, "").trim(); // "(in bed)"
        const stop = body.search(/[.!?](\s|$)/);
        let first = stop >= 0 ? body.slice(0, stop + 1) : body;
        if (first.length > 96) {
            first = first.slice(0, 93).replace(/\s+\S*$/, "") + "...";
        }
        const head = r.length > 0 ? r.toUpperCase() + ": " : "";
        return this.wrap(head + first, 48);
    }

    private wrap(s: string, cols: number): string {
        const out: string[] = [];
        let line = "";
        for (const w of s.split(/\s+/)) {
            if (line.length > 0 && line.length + 1 + w.length > cols) {
                out.push(line);
                line = w;
            } else {
                line = line.length > 0 ? line + " " + w : w;
            }
        }
        if (line.length > 0) {
            out.push(line);
        }
        return out.join("\n");
    }

    // ------------------------------------------------------------ per frame
    private tick(): void {
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        if (this.captionText && this.captionShown < this.caption.length) {
            this.captionShown = Math.min(this.caption.length, this.captionShown + Math.max(1, Math.round(dt * 60)));
            this.captionText.text = this.caption.substr(0, this.captionShown);
        }
        this.roomT += dt;
        if (this.sweeping) {
            this.sweepT += dt;
            this.frameClock += dt;
            const p = this.sweepT / 0.8;
            if (p >= 1) {
                this.sweeping = false;
                this.stopSketch();
            } else if (this.frameClock >= 1 / 20) {
                this.frameClock = 0;
                this.renderSweep(p);
            }
            return;
        }
        if (this.painting) {
            this.paintT += dt;
            this.frameClock += dt;
            const p = Math.min(1, this.paintT / Math.max(0.05, this.paintDur));
            if (p >= 1) {
                this.endPaint(true);
            } else if (this.frameClock >= 1 / 20) {
                this.frameClock = 0;
                this.renderPaint(p);
            }
            return;
        }
        if (!this.sketching) {
            return;
        }
        this.clock += dt;
        this.frameClock += dt;
        if (this.frameClock < 1 / RoomViewport.FPS) {
            return;
        }
        this.frameClock = 0;
        if (UxSettings.effectsReduced) {
            this.render(1.0, 0); // Reduced: a still, finished sketch
            this.sketching = false;
            return;
        }
        const cycle = this.drawSeconds + this.holdSeconds;
        if (this.clock >= cycle) {
            this.clock -= cycle;
            this.loop++;
        }
        this.render(Math.min(1, this.clock / this.drawSeconds), this.loop);
    }

    // ------------------------------------------------------------ sketch
    private rnd(seed: number): () => number {
        let s = seed >>> 0 || 1;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    private hash(str: string): number {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 16777619);
        }
        return h >>> 0;
    }

    private line(x0: number, y0: number, x1: number, y1: number): void {
        this.segs.push([x0, y0, x1, y1]);
    }

    private poly(pts: number[][], close: boolean): void {
        for (let i = 0; i + 1 < pts.length; i++) {
            this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        }
        if (close && pts.length > 2) {
            const a = pts[pts.length - 1];
            this.line(a[0], a[1], pts[0][0], pts[0][1]);
        }
    }

    private rect(x: number, y: number, w: number, h: number): void {
        this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
    }

    /** Build the room's line list. Deterministic per room, so revisits match. */
    private buildSketch(room: string, ctx: any): void {
        this.segs = [];
        const W = RoomViewport.TW;
        const H = RoomViewport.TH;
        const r = this.rnd(this.hash(room));
        const indoor = /(room|kitchen|hall|office|bath|cellar|attic|study|library|chamber|lobby|corridor|closet|cell|vault|parlou?r|lab|bedroom|foyer|den|dining)/i.test(room);
        let groundY: number;
        if (indoor) {
            // perspective room box: back wall + edges to the corners
            const bx0 = W * 0.24, bx1 = W * 0.76, by0 = H * 0.16, by1 = H * 0.62;
            this.rect(bx0, by0, bx1 - bx0, by1 - by0);
            this.line(0, 0, bx0, by0);
            this.line(W, 0, bx1, by0);
            this.line(0, H, bx0, by1);
            this.line(W, H, bx1, by1);
            groundY = H * 0.8;
        } else {
            // horizon, jagged ridge, retro sun, converging ground lines
            const hy = H * 0.46;
            this.line(0, hy, W, hy);
            const ridge: number[][] = [];
            for (let x = 0; x <= W; x += 16 + r() * 22) {
                ridge.push([x, hy - 6 - r() * H * 0.22]);
            }
            ridge.push([W, hy - 8]);
            this.poly(ridge, false);
            const cx = W * (0.3 + r() * 0.4), rad = H * 0.12;
            const arc: number[][] = [];
            for (let a = 0; a <= Math.PI + 0.01; a += Math.PI / 10) {
                arc.push([cx + Math.cos(a) * rad, hy - Math.sin(a) * rad]);
            }
            this.poly(arc, false);
            for (let i = -3; i <= 3; i++) {
                this.line(W / 2 + i * 10, hy, W / 2 + i * 60, H);
            }
            groundY = H * 0.86;
        }
        // up to four objects from the room's nouns, in ground slots
        const names: string[] = [];
        if (ctx && ctx.roomObjects) {
            for (const o of ctx.roomObjects) {
                if (o && o.name) {
                    names.push(String(o.name).toLowerCase());
                }
            }
        }
        const slots = [0.2, 0.42, 0.62, 0.82];
        let placed = 0;
        for (const n of names) {
            if (placed >= slots.length) {
                break;
            }
            if (this.shapeFor(n, W * slots[placed], groundY - r() * 6, H * (0.2 + r() * 0.08), r)) {
                placed++;
            }
        }
        if (placed === 0 && !indoor) {
            this.shapeFor("tree", W * 0.15, groundY, H * 0.25, r);
            this.shapeFor("tree", W * 0.85, groundY, H * 0.22, r);
        }
        this.totalLen = 0;
        for (const s of this.segs) {
            this.totalLen += Math.hypot(s[2] - s[0], s[3] - s[1]);
        }
    }

    /** Append a primitive for a noun at base (x, y) with size s. False = no match. */
    private shapeFor(n: string, x: number, y: number, s: number, r: () => number): boolean {
        const has = (re: RegExp) => re.test(n);
        if (has(/house|building|cabin|hut|cottage|shed|church/)) {
            const w = s * 1.3, h = s * 0.8;
            this.rect(x - w / 2, y - h, w, h);
            this.poly([[x - w / 2 - 3, y - h], [x, y - h - s * 0.55], [x + w / 2 + 3, y - h]], false);
            this.rect(x - s * 0.12, y - s * 0.45, s * 0.24, s * 0.45);
        } else if (has(/tree|forest|wood|bush|shrub|pine|oak/)) {
            this.poly([[x - s * 0.35, y - s * 0.3], [x, y - s * 1.2], [x + s * 0.35, y - s * 0.3]], true);
            this.line(x, y - s * 0.3, x, y);
        } else if (has(/door|gate|entrance|portal|hatch/)) {
            this.rect(x - s * 0.25, y - s, s * 0.5, s);
            this.line(x + s * 0.14, y - s * 0.5, x + s * 0.17, y - s * 0.5);
        } else if (has(/window|mirror|painting|picture|poster/)) {
            const w = s * 0.6, yy = y - s * 1.3;
            this.rect(x - w / 2, yy, w, w);
            this.line(x, yy, x, yy + w);
            this.line(x - w / 2, yy + w / 2, x + w / 2, yy + w / 2);
        } else if (has(/table|desk|counter|bench|altar|workbench/)) {
            const w = s * 1.1;
            this.poly([[x - w / 2, y - s * 0.5], [x + w / 2, y - s * 0.5], [x + w / 2 - 6, y - s * 0.62], [x - w / 2 + 6, y - s * 0.62]], true);
            this.line(x - w / 2 + 3, y - s * 0.5, x - w / 2 + 3, y);
            this.line(x + w / 2 - 3, y - s * 0.5, x + w / 2 - 3, y);
        } else if (has(/bed|couch|sofa|cot/)) {
            const w = s * 1.3;
            this.rect(x - w / 2, y - s * 0.35, w, s * 0.35);
            this.rect(x - w / 2, y - s * 0.7, s * 0.12, s * 0.7);
        } else if (has(/box|chest|crate|mailbox|dresser|cabinet|trunk|safe|locker|drawer/)) {
            const w = s * 0.55, d = s * 0.18;
            this.rect(x - w / 2, y - w, w, w);
            this.poly([[x - w / 2, y - w], [x - w / 2 + d, y - w - d], [x + w / 2 + d, y - w - d], [x + w / 2 + d, y - d], [x + w / 2, y]], false);
            this.line(x + w / 2, y - w, x + w / 2 + d, y - w - d);
        } else if (has(/stair|step|ladder/)) {
            const pts: number[][] = [];
            for (let i = 0; i <= 5; i++) {
                pts.push([x - s * 0.5 + i * s * 0.2, y - i * s * 0.2]);
                pts.push([x - s * 0.5 + (i + 1) * s * 0.2, y - i * s * 0.2]);
            }
            this.poly(pts, false);
        } else if (has(/grate|grating|grill|grid|bars|cage/)) {
            const w = s * 1.1, h = s * 0.4;
            this.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 8, y - h], [x - w / 2 + 8, y - h]], true);
            for (let i = 1; i < 5; i++) {
                const f = i / 5;
                this.line(x - w / 2 + w * f, y, x - w / 2 + 8 + (w - 16) * f, y - h);
            }
            this.line(x - w / 2 + 4, y - h / 2, x + w / 2 - 4, y - h / 2);
        } else if (has(/lamp|lantern|candle|torch|light/)) {
            this.line(x, y, x, y - s * 0.7);
            this.poly([[x - s * 0.18, y - s * 0.7], [x + s * 0.18, y - s * 0.7], [x + s * 0.1, y - s * 0.95], [x - s * 0.1, y - s * 0.95]], true);
            for (let a = 0; a < 5; a++) {
                const ang = -Math.PI * (0.15 + a * 0.175);
                this.line(x + Math.cos(ang) * s * 0.35, y - s * 0.82 + Math.sin(ang) * s * 0.35,
                    x + Math.cos(ang) * s * 0.5, y - s * 0.82 + Math.sin(ang) * s * 0.5);
            }
        } else if (has(/stream|river|water|lake|pool|sea|fountain|brook/)) {
            const pts: number[][] = [];
            for (let i = 0; i <= 12; i++) {
                pts.push([x - s + i * (s / 6), y - 4 + Math.sin(i * 1.3 + r() * 0.5) * 4]);
            }
            this.poly(pts, false);
        } else if (has(/rug|carpet|mat|blanket|laundry|clothes|pile/)) {
            const w = s * 1.2;
            this.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 10, y - s * 0.22], [x - w / 2 + 10, y - s * 0.22]], true);
        } else if (n.length > 0) {
            // anything else portable: a little box
            const w = s * 0.3;
            this.rect(x - w / 2, y - w, w, w);
        } else {
            return false;
        }
        return true;
    }

    // ------------------------------------------------------------ raster
    /** Draw the first `progress` of the sketch's total length; wobble per loop. */
    private render(progress: number, loop: number): void {
        if (!this.provider) {
            return;
        }
        const W = RoomViewport.TW;
        const H = RoomViewport.TH;
        this.pixels.fill(0);
        const jit = this.rnd(this.hash(this.room) + loop * 7919);
        let budget = progress * this.totalLen;
        for (const s of this.segs) {
            if (budget <= 0) {
                break;
            }
            // hand-drawn boil: endpoints wobble a pixel between loops
            const x0 = s[0] + (jit() - 0.5) * 1.6, y0 = s[1] + (jit() - 0.5) * 1.6;
            const x1 = s[2] + (jit() - 0.5) * 1.6, y1 = s[3] + (jit() - 0.5) * 1.6;
            const len = Math.hypot(x1 - x0, y1 - y0);
            const f = Math.min(1, budget / Math.max(len, 1e-3));
            this.stroke(x0, y0, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, W, H);
            budget -= len;
        }
        this.provider.setPixels(0, 0, W, H, this.pixels);
    }

    /** 2-px line into the RGBA buffer (y down in sketch space, flipped for the texture). */
    private stroke(x0: number, y0: number, x1: number, y1: number, W: number, H: number): void {
        const c = Theme.cyan;
        const cr = Math.round(c.r * 255), cg = Math.round(c.g * 255), cb = Math.round(c.b * 255);
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const px = Math.round(x0 + (x1 - x0) * t);
            const py = Math.round(y0 + (y1 - y0) * t);
            for (let oy = 0; oy < 2; oy++) {
                for (let ox = 0; ox < 2; ox++) {
                    const xx = px + ox, yy = H - 1 - (py + oy);
                    if (xx < 0 || xx >= W || yy < 0 || yy >= H) {
                        continue;
                    }
                    const k = (yy * W + xx) * 4;
                    this.pixels[k] = cr;
                    this.pixels[k + 1] = cg;
                    this.pixels[k + 2] = cb;
                    this.pixels[k + 3] = 255;
                }
            }
        }
    }
}
