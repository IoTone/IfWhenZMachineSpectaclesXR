/**
 * Scroll model for UX2 CRT text lists (docs/UX2-proposal.md §11.1).
 *
 * Pure state, no rendering: a window of `visible` lines over `total` lines,
 * with follow mode (stick to the bottom as content grows) and drag math.
 * The Terminal Monitor renders it into one Text; the Command Deck and the
 * Cassette Library can render it into pooled rows.
 */
export class CrtScroll {
    private _total: number = 0;
    private _offset: number = 0;
    private _follow: boolean = true;
    private dragFrom: number = 0;
    private dragOffset: number = 0;

    constructor(public visible: number) {}

    get total(): number {
        return this._total;
    }

    /** First visible line. */
    get offset(): number {
        return this._offset;
    }

    get maxOffset(): number {
        return Math.max(0, this._total - this.visible);
    }

    get atBottom(): boolean {
        return this._offset >= this.maxOffset;
    }

    /** True when following new content (the reader hasn't scrolled away). */
    get following(): boolean {
        return this._follow;
    }

    get overflowing(): boolean {
        return this._total > this.visible;
    }

    /** Content length changed; follow mode keeps the bottom in view. */
    setTotal(n: number): void {
        this._total = Math.max(0, n);
        if (this._follow) {
            this._offset = this.maxOffset;
        } else {
            this._offset = Math.min(this._offset, this.maxOffset);
        }
    }

    /** Content was trimmed from the top (history cap): keep the same lines in view. */
    shiftUp(removed: number): void {
        if (!this._follow) {
            this._offset = Math.max(0, this._offset - removed);
        }
    }

    scrollTo(offset: number): boolean {
        const clamped = Math.max(0, Math.min(this.maxOffset, Math.round(offset)));
        const changed = clamped !== this._offset;
        this._offset = clamped;
        this._follow = clamped >= this.maxOffset;
        return changed;
    }

    scrollBy(lines: number): boolean {
        return this.scrollTo(this._offset + lines);
    }

    page(dir: number): boolean {
        return this.scrollBy(dir * Math.max(1, this.visible - 2));
    }

    toBottom(): void {
        this._follow = true;
        this._offset = this.maxOffset;
    }

    /** Grab-the-content drag: y in the same units as lineHeight, up = positive. */
    beginDrag(y: number): void {
        this.dragFrom = y;
        this.dragOffset = this._offset;
    }

    dragTo(y: number, lineHeight: number): boolean {
        // content follows the hand: moving up reveals later lines
        const lines = (y - this.dragFrom) / Math.max(1e-3, lineHeight);
        return this.scrollTo(this.dragOffset + lines);
    }

    /**
     * Text scrollbar, one glyph per visible line: ▲ at the top, ▼ at the
     * bottom, a █ thumb on a │ track. `blinkDown` blanks the ▼ (caller blinks
     * it while new content waits below).
     */
    gutter(blinkDown: boolean): string {
        const n = this.visible;
        if (!this.overflowing || n < 3) {
            return "";
        }
        const track = n - 2;
        const thumb = Math.max(1, Math.round((track * this.visible) / this._total));
        const start = this.maxOffset > 0 ? Math.round(((track - thumb) * this._offset) / this.maxOffset) : 0;
        const rows: string[] = ["▲"];
        for (let i = 0; i < track; i++) {
            rows.push(i >= start && i < start + thumb ? "█" : "│");
        }
        rows.push(blinkDown ? " " : "▼");
        return rows.join("\n");
    }
}
