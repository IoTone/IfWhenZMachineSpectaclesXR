import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { ZMachineHost } from "./ZMachineHost";
import { Narrator } from "./Narrator";
import { AppFlow } from "./AppFlow";
import { Theme } from "./Theme";
import { UxSettings } from "./UxSettings";
import { CrtScroll } from "./CrtScroll";

/** A tappable span on a deck line. */
interface Tok {
    label: string;
    col: number;
    act: () => void;
}

interface DeckLine {
    text: string;
    toks: Tok[];
    header?: boolean;
    dim?: boolean;
}

/** Object verbs: which objects each acts on ("room", "held", or "any"). */
const OBJECT_VERBS: { verb: string; on: "room" | "held" | "any" }[] = [
    { verb: "examine", on: "any" },
    { verb: "take", on: "room" },
    { verb: "drop", on: "held" },
    { verb: "open", on: "any" },
    { verb: "close", on: "any" },
    { verb: "read", on: "any" },
    { verb: "push", on: "any" },
    { verb: "pull", on: "any" },
    { verb: "eat", on: "any" },
    { verb: "wear", on: "held" },
];
const SIMPLE_VERBS = ["look", "inventory", "wait", "again"];
const DIRECTIONS = [
    ["n", "north"], ["ne", "northeast"], ["e", "east"], ["se", "southeast"],
    ["s", "south"], ["sw", "southwest"], ["w", "west"], ["nw", "northwest"],
];
const VERTICALS = ["up", "down", "in", "out"];

/**
 * UX2 Command Deck (docs/UX2-proposal.md §11.3), step 6D: replaces the SIK
 * "Choose an action" scroll menu with a CRT text tree of what you can type or
 * say, at the same world-locked lectern.
 *
 *   > TAKE ▒                          ⌫  ⏎    command line (mirrored at the
 *   ─────────────────────────────────────     terminal prompt)
 *   GAME
 *    ├ N NE E SE S SW W NW / UP DOWN IN OUT   directions, always open
 *    ├ LOOK  INVENTORY  WAIT  AGAIN           submit at once
 *    ├ TAKE ▾                                 one object branch open at a time
 *    │   ├ LEAFLET (here)                     tap = "take leaflet"
 *    ├ MORE VERBS ▸ / OBJECTS ▸               compose anything the story knows
 *   RECENT  > north  > open mailbox
 *   SYSTEM  SAVE RESTORE UNDO / NARRATE EFFECTS IMMERSIVE / NEW GAME LIBRARY
 *
 * Verbs are filtered through the story's own dictionary (tszm getDictionary),
 * so the deck only offers words this story understands. Rows are pooled Texts
 * on the Cassette's warped grid; one touch surface handles hover (inverse bar
 * on the token under the pointer), tap, and drag-to-scroll via CrtScroll.
 */
@component
export class CommandDeck extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    @input
    @allowUndefined
    narrator: Narrator;

    @input
    @allowUndefined
    appFlow: AppFlow;

    @input
    @allowUndefined
    monoFont: Font;

    /** CRT bezel behind the deck (an Image using the CassetteBezel material). */
    @input
    @allowUndefined
    bezelImage: Image;

    /** Old SIK menu to switch off while the deck is in charge. */
    @input
    @allowUndefined
    legacyMenu: SceneObject;

    /** Lectern placement: degrees below the initial gaze, and distance (cm). */
    @input
    angleDegrees: number = 33;

    @input
    distance: number = 50;

    @input
    warp: number = 0.05;

    private static readonly SIZE = 34;
    private static readonly CHAR_W = 0.49;
    private static readonly PITCH = 1.2;
    private static readonly COLS = 38;
    private static readonly ROWS = 13; // visible tree rows
    private static readonly TREE_LINE = 2; // screen line of the first tree row
    private static readonly NB = " ";

    private rows: Text[] = [];
    private cmdText: Text | null = null;
    private sepText: Text | null = null;
    private barText: Text | null = null;
    private gutterText: Text | null = null;
    // a menu, not a transcript: start at the top (the compass), never follow the bottom
    private scroll: CrtScroll = new CrtScroll(CommandDeck.ROWS, false);
    private lines: DeckLine[] = [];
    private cmdToks: Tok[] = [];
    private ctx: any = null;
    private open: string | null = null; // expanded branch key
    private compose: string[] = [];
    private recent: string[] = [];
    private verbsKnown: { [w: string]: boolean } | null = null;
    private moreVerbs: string[] = [];
    private dictKey: string = "";
    private hover: { line: number; tok: Tok } | null = null;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.start());
    }

    private start(): void {
        if (this.legacyMenu) {
            this.legacyMenu.enabled = false;
        }
        this.place();
        this.build();
        if (this.zmHost) {
            this.zmHost.addSceneContextListener((ctx: any) => {
                this.ctx = ctx;
                if (!ctx) {
                    this.compose = [];
                    this.open = null;
                    this.recent = [];
                    this.verbsKnown = null; // a new story: new vocabulary
                    this.scroll.toTop();
                }
                this.refresh();
            });
        }
        UxSettings.onEffectsChanged(() => this.refresh());
        UxSettings.onImmersiveChanged(() => this.refresh());
        this.refresh();
        print("CommandDeck: ready");
    }

    /** World-locked lectern below the initial gaze, tilted back to face the eyes. */
    private place(): void {
        const a = (this.angleDegrees * Math.PI) / 180;
        const t = this.getSceneObject().getTransform();
        t.setLocalPosition(new vec3(0, -this.distance * Math.sin(a), -this.distance * Math.cos(a)));
        t.setLocalRotation(quat.fromEulerAngles(-a, 0, 0));
    }

    // ------------------------------------------------------------ geometry
    private width(): number {
        return CommandDeck.COLS * CommandDeck.CHAR_W;
    }

    private left(): number {
        return -this.width() / 2;
    }

    private lineY(line: number): number {
        const total = CommandDeck.TREE_LINE + CommandDeck.ROWS;
        return ((total - 1) / 2 - line) * CommandDeck.PITCH;
    }

    /** Barrel warp scale for a screen line. */
    private warpScale(line: number): number {
        const total = CommandDeck.TREE_LINE + CommandDeck.ROWS;
        const v = (line / Math.max(1, total - 1)) * 2 - 1;
        return 1 - this.warp * v * v;
    }

    /** Left edge (cm) of column `col` on a warped screen line. */
    private colX(line: number, col: number): number {
        const sx = this.warpScale(line);
        return -(this.width() / 2) * sx + col * CommandDeck.CHAR_W * sx;
    }

    private makeText(name: string, color: vec4): Text {
        const obj = global.scene.createSceneObject(name);
        obj.setParent(this.getSceneObject());
        const t = obj.createComponent("Component.Text") as Text;
        if (this.monoFont) {
            t.font = this.monoFont;
        }
        t.size = CommandDeck.SIZE;
        t.textFill.color = color;
        t.horizontalAlignment = HorizontalAlignment.Left;
        t.verticalAlignment = VerticalAlignment.Top;
        t.worldSpaceRect = Rect.create(0, 40, -3, 0);
        t.text = "";
        return t;
    }

    private placeText(t: Text, line: number, col: number, z: number): void {
        const tr = t.getSceneObject().getTransform();
        tr.setLocalScale(new vec3(this.warpScale(line), 1, 1));
        tr.setLocalPosition(new vec3(this.colX(line, col), this.lineY(line), z));
    }

    private build(): void {
        this.cmdText = this.makeText("DeckCommand", Theme.phosphor);
        this.placeText(this.cmdText, 0, 0, 0);
        this.sepText = this.makeText("DeckSeparator", new vec4(Theme.c64Text.r, Theme.c64Text.g, Theme.c64Text.b, 0.5));
        let sep = "";
        for (let c = 0; c < CommandDeck.COLS; c++) {
            sep += "─";
        }
        this.sepText.text = sep;
        this.placeText(this.sepText, 1, 0, 0);
        for (let r = 0; r < CommandDeck.ROWS; r++) {
            const t = this.makeText("DeckRow" + r, Theme.c64Text);
            this.placeText(t, CommandDeck.TREE_LINE + r, 0, 0);
            this.rows.push(t);
        }
        this.gutterText = this.makeText("DeckGutter", new vec4(Theme.cyan.r, Theme.cyan.g, Theme.cyan.b, 0.8));
        this.placeText(this.gutterText, CommandDeck.TREE_LINE, CommandDeck.COLS + 1, 0);
        this.barText = this.makeText("DeckBar", new vec4(0.08, 0.03, 0.16, 1));
        this.barText.backgroundSettings.enabled = true;
        this.barText.backgroundSettings.fill.color = Theme.c64Text;
        this.barText.renderOrder = 10;
        this.barText.getSceneObject().enabled = false;

        const w = this.width() + 2 * CommandDeck.CHAR_W; // include the gutter
        const top = this.lineY(0) + 0.3;
        const bottom = this.lineY(CommandDeck.TREE_LINE + CommandDeck.ROWS - 1) - CommandDeck.PITCH;
        if (this.bezelImage) {
            const bt = this.bezelImage.getSceneObject().getTransform();
            this.bezelImage.stretchMode = StretchMode.Stretch;
            bt.setLocalRotation(quat.quatIdentity());
            bt.setLocalPosition(new vec3(this.left() + w / 2, (top + bottom) / 2, -0.4));
            // bezel texture: 60 px margins on 1000x1200; ~1.3 cm glass margin
            bt.setLocalScale(new vec3((w + 2.6) / (1 - 120 / 1000), (top - bottom + 2.4) / (1 - 120 / 1200), 1));
        }
        this.buildTouch(w, top, bottom);
    }

    private buildTouch(w: number, top: number, bottom: number): void {
        const hitObj = global.scene.createSceneObject("DeckTouch");
        hitObj.setParent(this.getSceneObject());
        const cx = this.left() + w / 2;
        const cy = (top + bottom) / 2;
        hitObj.getTransform().setLocalPosition(new vec3(cx, cy, 0.1));
        const col = hitObj.createComponent("Physics.ColliderComponent") as ColliderComponent;
        const shape = Shape.createBoxShape();
        shape.size = new vec3(w, top - bottom, 0.5);
        col.shape = shape;
        const touch = hitObj.createComponent(Interactable.getTypeName()) as Interactable;
        const at = (e: InteractorEvent): vec3 | null => {
            const info = e.interactor ? e.interactor.targetHitInfo : null;
            return info ? new vec3(cx + info.localHitPosition.x, cy + info.localHitPosition.y, 0) : null;
        };
        let startY = 0;
        let moved = false;
        touch.onHoverUpdate.add((e: InteractorEvent) => {
            const p = at(e);
            this.setHover(p ? this.tokenAt(p) : null);
        });
        touch.onHoverExit.add(() => this.setHover(null));
        touch.onTriggerStart.add((e: InteractorEvent) => {
            const p = at(e);
            if (p) {
                startY = p.y;
                moved = false;
                this.scroll.beginDrag(p.y);
            }
        });
        touch.onTriggerUpdate.add((e: InteractorEvent) => {
            const p = at(e);
            if (!p || !this.scroll.overflowing) {
                return;
            }
            if (!moved && Math.abs(p.y - startY) > CommandDeck.PITCH * 0.6) {
                moved = true;
            }
            if (moved && this.scroll.dragTo(p.y, CommandDeck.PITCH)) {
                this.render();
            }
        });
        touch.onTriggerEnd.add((e: InteractorEvent) => {
            if (moved) {
                return;
            }
            const p = at(e);
            const hit = p ? this.tokenAt(p) : null;
            if (hit) {
                hit.tok.act();
                return;
            }
            // tap on the scrollbar column pages
            if (p && p.x > this.left() + this.width() && this.scroll.overflowing) {
                if (this.scroll.page(p.y > this.lineY(CommandDeck.TREE_LINE + CommandDeck.ROWS / 2) ? -1 : 1)) {
                    this.render();
                }
            }
        });
    }

    /** Screen line + token under a point (deck-local cm). line -1 = command line. */
    private tokenAt(p: vec3): { line: number; tok: Tok } | null {
        const screenLine = Math.floor((this.lineY(0) + CommandDeck.PITCH * 0.25 - p.y) / CommandDeck.PITCH);
        const sx = this.warpScale(Math.max(0, screenLine));
        const col = Math.floor((p.x - this.colX(Math.max(0, screenLine), 0)) / (CommandDeck.CHAR_W * sx));
        const hitTok = (toks: Tok[]): Tok | null => {
            let best: Tok | null = null;
            let bestDist = 2; // at most one column outside a token
            for (const t of toks) {
                const end = t.col + t.label.length - 1;
                const dist = col < t.col ? t.col - col : col > end ? col - end : 0;
                if (dist < bestDist) {
                    best = t;
                    bestDist = dist;
                }
            }
            return best;
        };
        if (screenLine === 0) {
            const t = hitTok(this.cmdToks);
            return t ? { line: -1, tok: t } : null;
        }
        const r = screenLine - CommandDeck.TREE_LINE;
        if (r < 0 || r >= CommandDeck.ROWS) {
            return null;
        }
        const li = this.scroll.offset + r;
        if (li >= this.lines.length) {
            return null;
        }
        const t = hitTok(this.lines[li].toks);
        return t ? { line: li, tok: t } : null;
    }

    private setHover(h: { line: number; tok: Tok } | null): void {
        const same = (a: typeof h, b: typeof h) => (a === null && b === null) || (!!a && !!b && a.line === b.line && a.tok === b.tok);
        if (!same(h, this.hover)) {
            this.hover = h;
            this.render();
        }
    }

    // ------------------------------------------------------------ vocabulary
    /** Dictionary-backed verb check (prefix match for truncated entries). */
    private knows(verb: string): boolean {
        this.loadVocabulary();
        if (!this.verbsKnown) {
            return true; // no dictionary: don't hide anything
        }
        if (this.verbsKnown[verb]) {
            return true;
        }
        for (const len of [6, 9]) {
            if (verb.length > len && this.verbsKnown[verb.slice(0, len)]) {
                return true;
            }
        }
        return false;
    }

    private loadVocabulary(): void {
        const key = this.zmHost ? this.zmHost.gameKey : "";
        if (this.verbsKnown && key === this.dictKey) {
            return;
        }
        const dict = this.zmHost ? this.zmHost.dictionary() : null;
        if (!dict) {
            this.verbsKnown = null;
            return;
        }
        this.dictKey = key;
        this.verbsKnown = {};
        const curated: { [w: string]: boolean } = {};
        for (const v of OBJECT_VERBS) {
            curated[v.verb] = true;
        }
        for (const v of SIMPLE_VERBS) {
            curated[v] = true;
        }
        const more: string[] = [];
        for (const w of dict.words) {
            if (w.verb) {
                this.verbsKnown[w.word] = true;
                if (w.display && !w.meta && !curated[w.word] && w.word.length > 2) {
                    more.push(w.word + (w.truncated ? "…" : ""));
                }
            }
        }
        more.sort();
        this.moreVerbs = more;
        print("CommandDeck: " + dict.format + " vocabulary, " + more.length + " more verbs");
    }

    // ------------------------------------------------------------ tree model
    private nouns(on: "room" | "held" | "any"): { name: string; held: boolean }[] {
        const out: { name: string; held: boolean }[] = [];
        if (!this.ctx) {
            return out;
        }
        if (on !== "held") {
            for (const o of this.ctx.roomObjects || []) {
                out.push({ name: String(o.name).toLowerCase(), held: false });
            }
        }
        if (on !== "room") {
            for (const o of this.ctx.inventory || []) {
                out.push({ name: String(o.name).toLowerCase(), held: true });
            }
        }
        return out;
    }

    /** Flow tokens onto lines of COLS columns, wrapping at `indent`. */
    private flow(indent: string, first: string, cont: string, items: { label: string; act: () => void }[], out: DeckLine[]): void {
        let text = indent + first;
        let toks: Tok[] = [];
        for (const it of items) {
            const need = (toks.length > 0 ? 2 : 0) + it.label.length;
            if (toks.length > 0 && text.length + need > CommandDeck.COLS) {
                out.push({ text: text, toks: toks });
                text = indent + cont;
                toks = [];
            }
            if (toks.length > 0) {
                text += "  ";
            }
            toks.push({ label: it.label, col: text.length, act: it.act });
            text += it.label;
        }
        out.push({ text: text, toks: toks });
    }

    private rebuildLines(): void {
        const L: DeckLine[] = [];
        const hdr = (s: string) => L.push({ text: s, toks: [], header: true });
        const submit = (cmd: string) => () => this.submit(cmd);

        hdr("GAME");
        // Compass, 6-column cells: short labels get wide, well-separated targets.
        const compass = [
            ["├", "nw", "n", "ne"],
            ["│", "w", "", "e"],
            ["│", "sw", "s", "se"],
        ];
        for (const row of compass) {
            let text = " " + row[0] + " ";
            const toks: Tok[] = [];
            for (let c = 1; c <= 3; c++) {
                const col = 3 + (c - 1) * 6;
                while (text.length < col) {
                    text += " ";
                }
                const short = row[c];
                if (!short) {
                    text += "·"; // compass centre
                    continue;
                }
                const full = DIRECTIONS.filter((d) => d[0] === short)[0][1];
                toks.push({ label: short.toUpperCase(), col: col, act: submit(full) });
                text += short.toUpperCase();
            }
            L.push({ text: text, toks: toks });
        }
        {
            let text = " │ ";
            const toks: Tok[] = [];
            for (const d of VERTICALS) {
                if (toks.length > 0) {
                    text += "   ";
                }
                toks.push({ label: d.toUpperCase(), col: text.length, act: submit(d) });
                text += d.toUpperCase();
            }
            L.push({ text: text, toks: toks });
        }
        this.flow(" ", "├ ", "│ ", SIMPLE_VERBS.filter((v) => this.knows(v) || v === "again")
            .map((v) => ({ label: v.toUpperCase(), act: submit(v) })), L);

        for (const v of OBJECT_VERBS) {
            if (!this.knows(v.verb)) {
                continue;
            }
            const objs = this.nouns(v.on);
            const isOpen = this.open === v.verb;
            const label = v.verb.toUpperCase() + (objs.length === 0 ? "" : isOpen ? " ▾" : " ▸");
            const line: DeckLine = { text: " ├ " + label, toks: [], dim: objs.length === 0 };
            if (objs.length > 0) {
                line.toks.push({ label: label, col: 3, act: () => this.toggle(v.verb, true) });
            }
            L.push(line);
            if (isOpen) {
                objs.forEach((o, i) => {
                    const name = o.name.toUpperCase();
                    const tag = o.held ? " (carried)" : " (here)";
                    const text = " │   " + (i === objs.length - 1 ? "└ " : "├ ") + name + tag;
                    L.push({ text: text, toks: [{ label: name, col: 7, act: submit(v.verb + " " + o.name) }] });
                });
            }
        }

        // compose anything else the story knows: MORE VERBS + OBJECTS append
        this.loadVocabulary();
        if (this.moreVerbs.length > 0) {
            const isOpen = this.open === "#more";
            const label = "MORE VERBS " + (isOpen ? "▾" : "▸");
            L.push({ text: " ├ " + label, toks: [{ label: label, col: 3, act: () => this.toggle("#more", false) }] });
            if (isOpen) {
                this.flow(" │   ", "", "", this.moreVerbs.map((w) => ({
                    label: w.toUpperCase(),
                    act: () => this.pushWord(w.replace("…", "")),
                })), L);
            }
        }
        const all = this.nouns("any");
        if (all.length > 0) {
            const isOpen = this.open === "#objects";
            const label = "OBJECTS " + (isOpen ? "▾" : "▸");
            L.push({ text: " └ " + label, toks: [{ label: label, col: 3, act: () => this.toggle("#objects", false) }] });
            if (isOpen) {
                this.flow("     ", "", "", all.map((o) => ({ label: o.name.toUpperCase(), act: () => this.pushWord(o.name) })), L);
            }
        }

        if (this.recent.length > 0) {
            hdr("RECENT");
            this.flow(" ", "", "", this.recent.map((c) => ({ label: "> " + c, act: submit(c) })), L);
        }

        hdr("SYSTEM");
        const sys: { label: string; act: () => void }[] = [
            { label: "SAVE", act: submit("save") },
            { label: "RESTORE", act: submit("restore") },
        ];
        if (this.knows("undo")) {
            sys.push({ label: "UNDO", act: submit("undo") });
        }
        this.flow(" ", "├ ", "│ ", sys, L);
        const narr = this.narrator ? (this.narrator.isOn ? "NARRATE: ON" : "NARRATE: OFF") : "";
        const settings: { label: string; act: () => void }[] = [];
        if (narr) {
            settings.push({ label: narr, act: () => { this.narrator.toggle(); this.refresh(); } });
        }
        settings.push({
            label: UxSettings.effectsReduced ? "EFFECTS: REDUCED" : "EFFECTS: FULL",
            act: () => { UxSettings.toggleEffects(); this.refresh(); },
        });
        this.flow(" ", "├ ", "│ ", settings, L);
        this.flow(" ", "├ ", "│ ", [{
            label: UxSettings.immersive ? "IMMERSIVE: ON" : "IMMERSIVE: OFF",
            act: () => { UxSettings.toggleImmersive(); this.refresh(); },
        }], L);
        const nav: { label: string; act: () => void }[] = [
            { label: "NEW GAME", act: () => this.zmHost.restartGame() },
        ];
        if (this.appFlow) {
            nav.push({ label: "LIBRARY", act: () => this.appFlow.showLibrary() });
        }
        this.flow(" ", "└ ", "  ", nav, L);
        this.lines = L;
        this.scroll.setTotal(L.length);
    }

    // ------------------------------------------------------------ actions
    private toggle(key: string, arm: boolean): void {
        this.open = this.open === key ? null : key;
        if (arm) {
            this.compose = this.open ? [key] : [];
        }
        this.refresh();
    }

    private pushWord(w: string): void {
        this.compose.push(w);
        this.refresh();
    }

    private submit(cmd: string): void {
        if (!this.zmHost) {
            return;
        }
        this.zmHost.submitCommand(cmd);
        this.recent = [cmd].concat(this.recent.filter((c) => c !== cmd)).slice(0, 3);
        this.compose = [];
        this.open = null;
        this.scroll.toTop(); // back to the compass for the next move
        this.refresh();
    }

    // ------------------------------------------------------------ render
    private refresh(): void {
        this.rebuildLines();
        this.render();
    }

    private render(): void {
        if (!this.cmdText) {
            return;
        }
        // command line: "> TAKE LEAFLET ▒" ... "⌫  ⏎" right-aligned
        const cmd = "> " + this.compose.join(" ").toUpperCase() + "▒";
        const right = "⌫  ⏎";
        let pad = "";
        while (cmd.length + pad.length + right.length < CommandDeck.COLS) {
            pad += CommandDeck.NB;
        }
        this.cmdText.text = cmd + pad + right;
        const rc = CommandDeck.COLS - right.length;
        this.cmdToks = [
            { label: "⌫", col: rc, act: () => { this.compose.pop(); this.refresh(); } },
            {
                label: "⏎",
                col: rc + 3,
                act: () => {
                    if (this.compose.length > 0) {
                        this.submit(this.compose.join(" "));
                    }
                },
            },
        ];
        if (this.zmHost) {
            this.zmHost.setComposeLine(this.compose.join(" "));
        }
        for (let r = 0; r < this.rows.length; r++) {
            const line = this.lines[this.scroll.offset + r];
            const t = this.rows[r];
            if (!line) {
                t.text = "";
                continue;
            }
            let text = line.text;
            const h = this.hover;
            if (h && h.line === this.scroll.offset + r) {
                // the bar draws this token; blank it underneath (no double text)
                let blank = "";
                for (let k = 0; k < h.tok.label.length; k++) {
                    blank += CommandDeck.NB;
                }
                text = text.slice(0, h.tok.col) + blank + text.slice(h.tok.col + h.tok.label.length);
            }
            // leading spaces are trimmed by Text: keep them as NBSP
            t.text = text.replace(/^ +/, (m) => m.replace(/ /g, CommandDeck.NB));
            t.textFill.color = line.header ? Theme.cyan : line.dim
                ? new vec4(Theme.c64Text.r, Theme.c64Text.g, Theme.c64Text.b, 0.4) : Theme.c64Text;
        }
        if (this.gutterText) {
            this.gutterText.text = this.scroll.gutter(false);
        }
        this.renderBar();
    }

    /** Inverse-video bar on the hovered token. */
    private renderBar(): void {
        if (!this.barText) {
            return;
        }
        const h = this.hover;
        if (!h) {
            this.barText.getSceneObject().enabled = false;
            return;
        }
        let screenLine: number;
        if (h.line === -1) {
            screenLine = 0;
        } else {
            const r = h.line - this.scroll.offset;
            if (r < 0 || r >= CommandDeck.ROWS) {
                this.barText.getSceneObject().enabled = false;
                return;
            }
            screenLine = CommandDeck.TREE_LINE + r;
        }
        this.barText.text = h.tok.label;
        this.placeText(this.barText, screenLine, h.tok.col, 0.05);
        this.barText.getSceneObject().enabled = true;
    }
}
