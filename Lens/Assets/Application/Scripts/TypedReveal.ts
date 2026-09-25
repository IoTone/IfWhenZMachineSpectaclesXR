/**
 * Character-rate text reveal (UX2 §3.3: "text is typed, never popped").
 *
 * Text is queued with a speed; tick(dt) hands characters to the sink at that
 * rate. Big backlogs (a long intro) speed up proportionally so a wall of text
 * never takes more than a few seconds, and flush() skips to the end whenever
 * the player acts. Not a component: the owner drives tick() from its own
 * UpdateEvent, so idle costs nothing beyond an empty-queue check.
 */
export class TypedReveal {
    private queue: { text: string; cps: number }[] = [];
    private pos: number = 0;
    private budget: number = 0;

    /** Backlog (chars) above which the reveal speeds up proportionally. */
    public backlogChars: number = 300;

    constructor(private readonly sink: (chars: string) => void) {}

    public push(text: string, cps: number): void {
        if (text.length > 0) {
            this.queue.push({ text: text, cps: cps });
        }
    }

    public get busy(): boolean {
        return this.queue.length > 0;
    }

    private pending(): number {
        let n = -this.pos;
        for (const seg of this.queue) {
            n += seg.text.length;
        }
        return n;
    }

    /** Advance by dt seconds. Returns true if any characters were revealed. */
    public tick(dt: number): boolean {
        if (this.queue.length === 0) {
            this.budget = 0;
            return false;
        }
        const boost = Math.max(1, this.pending() / this.backlogChars);
        this.budget += dt * this.queue[0].cps * boost;
        let out = "";
        while (this.budget >= 1 && this.queue.length > 0) {
            const seg = this.queue[0];
            const take = Math.min(Math.floor(this.budget), seg.text.length - this.pos);
            out += seg.text.substr(this.pos, take);
            this.pos += take;
            this.budget -= take;
            if (this.pos >= seg.text.length) {
                this.queue.shift();
                this.pos = 0;
            }
        }
        if (out.length > 0) {
            this.sink(out);
            return true;
        }
        return false;
    }

    /** Reveal everything queued immediately. */
    public flush(): void {
        let out = "";
        for (const seg of this.queue) {
            out += seg.text.substr(this.pos);
            this.pos = 0;
        }
        this.queue = [];
        this.budget = 0;
        if (out.length > 0) {
            this.sink(out);
        }
    }

    /** Drop everything queued (session reset). */
    public clear(): void {
        this.queue = [];
        this.pos = 0;
        this.budget = 0;
    }
}
