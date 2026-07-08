/**
 * IFWhenZMachine splash: procedural ASCII tunnel (concentric character rings
 * rushing outward, classic asciiart.eu style) rendered into a Text component,
 * with the title/tagline fading in on top.
 *
 * No stored frames: each cell's ring distance minus a time phase picks a
 * character, so the whole animation is ~800 integer ops per tick. Needs a
 * MONOSPACE font on the tunnel Text or the art shears.
 *
 * Layout is code-driven (screen-locked feel): this object parks itself in
 * front of the user, closer than the game rig, and disables itself after
 * flyThrough() completes.
 */
@component
export class SplashTunnel extends BaseScriptComponent {
    @input
    tunnelText: Text;

    @input
    @allowUndefined
    titleText: Text;

    @input
    @allowUndefined
    taglineText: Text;

    /** Character grid size (columns x rows). */
    @input
    cols: number = 38;

    @input
    rows: number = 19;

    /** Animation rate; full-frame text rebuilds are throttled to this. */
    @input
    fps: number = 12;

    /** Distance (cm) in front of the user. */
    @input
    distance: number = 50;

    private static readonly RING_CHARS = " .:-=+*#%@";
    private phase: number = 0;
    private speed: number = 6; // rings per second
    private accum: number = 0;
    private elapsed: number = 0;
    private titleShown: boolean = false;
    private flying: boolean = false;
    private flyDone: (() => void) | null = null;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            const t = this.getSceneObject().getTransform();
            t.setLocalPosition(new vec3(0, 0, -this.distance));
            if (this.tunnelText) {
                this.tunnelText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0));
            }
            if (this.titleText) {
                this.titleText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 2, 1));
                this.titleText.getSceneObject().enabled = false;
            }
            if (this.taglineText) {
                this.taglineText.getSceneObject().getTransform().setLocalPosition(new vec3(0, -4.5, 1));
                this.taglineText.getSceneObject().enabled = false;
            }
            this.renderFrame();
        });
        const tick = this.createEvent("UpdateEvent");
        tick.bind(() => this.onTick());
    }

    private onTick(): void {
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        this.elapsed += dt;
        this.accum += dt;
        this.phase += dt * this.speed;
        if (!this.titleShown && this.elapsed > 0.6) {
            this.titleShown = true;
            if (this.titleText) {
                this.titleText.getSceneObject().enabled = true;
            }
            if (this.taglineText) {
                this.taglineText.getSceneObject().enabled = true;
            }
        }
        if (this.accum >= 1 / this.fps) {
            this.accum = 0;
            this.renderFrame();
        }
        // Byline color cycles smoothly between blue and orange.
        if (this.taglineText && this.titleShown) {
            const t = 0.5 + 0.5 * Math.sin(this.elapsed * 1.6);
            const blue = { r: 0.3, g: 0.55, b: 1.0 };
            const orange = { r: 1.0, g: 0.6, b: 0.15 };
            this.taglineText.textFill.color = new vec4(
                blue.r + (orange.r - blue.r) * t,
                blue.g + (orange.g - blue.g) * t,
                blue.b + (orange.b - blue.b) * t,
                1.0
            );
        }
    }

    /** Speed the tunnel up 4x for a moment, then hide the splash. */
    public flyThrough(onDone: () => void): void {
        if (this.flying) {
            return;
        }
        this.flying = true;
        this.flyDone = onDone;
        this.speed *= 4;
        const evt = this.createEvent("DelayedCallbackEvent");
        evt.bind(() => {
            this.getSceneObject().enabled = false;
            if (this.flyDone) {
                this.flyDone();
            }
        });
        evt.reset(0.45);
    }

    private renderFrame(): void {
        if (!this.tunnelText) {
            return;
        }
        const chars = SplashTunnel.RING_CHARS;
        const n = chars.length;
        const cx = (this.cols - 1) / 2;
        const cy = (this.rows - 1) / 2;
        // Character cells are ~2x taller than wide; compensate so rings are round.
        const aspect = 2.0;
        const lines: string[] = [];
        const t = Math.floor(this.phase);
        for (let r = 0; r < this.rows; r++) {
            let line = "";
            for (let c = 0; c < this.cols; c++) {
                const ring = Math.max(Math.abs(c - cx) / aspect, Math.abs(r - cy));
                let idx = (Math.floor(ring) - t) % n;
                if (idx < 0) {
                    idx += n;
                }
                line += chars[idx];
            }
            lines.push(line);
        }
        this.tunnelText.text = lines.join("\n");
    }
}
