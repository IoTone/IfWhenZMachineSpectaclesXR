import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";
import { UIKitScrollMenuController } from "LocalJoost/Ui/ScrollWindow/Scripts/UIKitScrollMenuController";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent";
import { GAMES, GameEntry, getGame } from "./games/registry";
import { ZMachineHost } from "./ZMachineHost";
import { Theme } from "./Theme";
import { UxSettings } from "./UxSettings";

interface LibraryButtonData extends BaseScrollButtonData {
    gameId: string;
}

/**
 * The game library: one button per registry title on the left, a detail card
 * (author, year, rating, blurb, attribution) on the right, and a Play button.
 *
 * AppFlow shows this rig after the splash and hides it when a game launches;
 * the in-game "Game Library" menu button brings it back. Buttons are spawned
 * from the same MyButton prefab the command menu uses. Layout is code-driven.
 */
@component
export class GameLibraryMenu extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    @input
    buttonPrefab: ObjectPrefab;

    /** Scrollable story list (a dedicated LocalJoost scroll menu instance). */
    @input
    @allowUndefined
    scrollMenu: UIKitScrollMenuController;

    @input
    @allowUndefined
    titleText: Text;

    @input
    @allowUndefined
    detailText: Text;

    /** Distance (cm) in front of the user. */
    @input
    distance: number = 55;

    /** Soft-wrap column for the detail card. */
    @input
    wrapColumn: number = 38;

    /**
     * Registry id of the story selected (detail card populated) when the
     * library opens. Falls back to the first entry if the id isn't found.
     */
    @input
    defaultGameId: string = "minizork";

    /**
     * UX2 Cassette Library (docs/UX2-proposal.md §4.3): one C64-style panel
     * (banner, READY., typed LOAD "LIBRARY",8,1, rows printing in) with an
     * inverse-video highlight bar, instead of one kit button per story.
     * Off = the original scroll-menu buttons.
     */
    @input
    cassetteStyle: boolean = true;

    /** Monospace font for the cassette panel (JetBrains Mono). */
    @input
    @allowUndefined
    monoFont: Font;

    /** CRT bezel behind the panel (an Image showing crt_bezel.png). */
    @input
    @allowUndefined
    bezelImage: Image;

    /** Barrel-warp strength: how much narrower the top/bottom lines draw. */
    @input
    warp: number = 0.07;

    /** AppFlow assigns this; called with the selected game id on Play. */
    public onPlay: ((id: string) => void) | null = null;

    private selected: GameEntry = GAMES[0];
    private built: boolean = false;

    // ---- cassette panel state
    private static readonly SIZE = 34; // text size -> ~1.06 cm lines, ~0.49 cm chars
    private static readonly CHAR_W = 0.49; // cm per glyph at SIZE (JetBrains Mono)
    private static readonly LEFT = -26; // panel's left edge (cm, library space)
    private static readonly TOP = 14; // banner line
    private static readonly PITCH = 1.2; // cm between lines
    private static readonly ROW_LINE = 7; // screen line of the first story row
    private static readonly COLS = 36;
    private static readonly NBSP = "\u00A0"; // Lens trims leading spaces; NBSP survives
    private static playedIntro: boolean = false; // LOAD animation once per session
    private headTexts: Text[] = []; // banner, stories, READY., LOAD
    private rowTexts: Text[] = [];
    private barText: Text | null = null;
    private bandText: Text | null = null;
    private hoverRow: number = -1;
    private openT: number = 0;
    private animating: boolean = false;
    // glitch state
    private glitchIn: number = 3;
    private glitchLeft: number = 0;
    private glitchRows: number[] = [];
    private bandT: number = -1;
    private bandIn: number = 4;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.build());
        // AppFlow toggles this rig; every re-open replays (or skips) the intro
        this.createEvent("OnEnableEvent").bind(() => this.opened());
        this.createEvent("UpdateEvent").bind(() => this.animate());
    }

    private build(): void {
        if (this.built) {
            return;
        }
        this.built = true;
        this.getSceneObject()
            .getTransform()
            .setLocalPosition(new vec3(0, 2, -this.distance));
        if (this.titleText) {
            this.titleText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 17, 0));
            this.titleText.text = "IFWhenZMachine - Library";
        }
        if (this.detailText) {
            // The detail block centers vertically on its anchor; park it low
            // enough that an 8-10 line card stays clear of the title, and far
            // enough right that the story list frame never covers it.
            this.detailText.getSceneObject().getTransform().setLocalPosition(new vec3(9, 2, 0));
        }
        let playPos = new vec3(13, -8, 0);
        if (this.cassetteStyle) {
            if (this.titleText) {
                this.titleText.getSceneObject().enabled = false; // the banner replaces it
            }
            if (this.scrollMenu) {
                this.scrollMenu.getSceneObject().enabled = false;
            }
            this.buildCassette();
        } else if (this.scrollMenu) {
            // Scrollable story list on the left, clear of the detail card.
            const menuTransform = this.scrollMenu.getSceneObject().getTransform();
            menuTransform.setLocalPosition(new vec3(-17, -3, 0));
            menuTransform.setLocalRotation(quat.quatIdentity());
            const buttons: LibraryButtonData[] = [];
            for (const g of GAMES) {
                const data = new BaseScrollButtonData() as LibraryButtonData;
                data.buttonText = g.title;
                data.gameId = g.id;
                buttons.push(data);
            }
            this.scrollMenu.onButtonPressed.add((data) => {
                const g = getGame((data as LibraryButtonData).gameId);
                if (g) {
                    this.select(g);
                }
            });
            this.scrollMenu.clearButtons();
            this.scrollMenu.createButtons(buttons);
        } else {
            // Fallback: static column (small catalogs only).
            let y = 8;
            for (const g of GAMES) {
                const entry = g; // capture per-iteration
                this.spawn(g.title, new vec3(-13, y, 0), () => this.select(entry));
                y -= 5;
            }
            playPos = new vec3(-13, y - 1.5, 0);
        }
        const play = this.spawn("Play", playPos, () => {
            print("GameLibraryMenu: play " + this.selected.id);
            if (this.onPlay) {
                this.onPlay(this.selected.id);
            }
        });
        play.getSceneObject().getTransform().setLocalScale(new vec3(1.4, 1.4, 1));
        this.select(getGame(this.defaultGameId) || GAMES[0]);
        print("GameLibraryMenu: " + GAMES.length + " games listed (default " + this.selected.id + ")" +
            (this.cassetteStyle ? " [cassette]" : ""));
        this.opened();
    }

    // ------------------------------------------------------------ cassette
    private makeText(name: string, pos: vec3, color: vec4): Text {
        const obj = global.scene.createSceneObject(name);
        obj.setParent(this.getSceneObject());
        obj.getTransform().setLocalPosition(pos);
        const t = obj.createComponent("Component.Text") as Text;
        if (this.monoFont) {
            t.font = this.monoFont;
        }
        t.size = GameLibraryMenu.SIZE;
        t.textFill.color = color;
        t.horizontalAlignment = HorizontalAlignment.Left;
        t.verticalAlignment = VerticalAlignment.Top;
        t.worldSpaceRect = Rect.create(0, 40, -30, 0); // origin = top-left of the text
        t.text = "";
        return t;
    }

    /** y (cm) of a screen line; the screen is a 1983 text grid. */
    private lineY(line: number): number {
        return GameLibraryMenu.TOP - line * GameLibraryMenu.PITCH;
    }

    private rowY(i: number): number {
        return this.lineY(GameLibraryMenu.ROW_LINE + i);
    }

    private lastLine(): number {
        return GameLibraryMenu.ROW_LINE + GAMES.length - 1;
    }

    private rowString(i: number): string {
        const g = GAMES[i];
        const NB = GameLibraryMenu.NBSP;
        const num = (i + 1 < 10 ? NB : "") + (i + 1);
        let title = g.title.toUpperCase();
        const room = GameLibraryMenu.COLS - 4 - 4 - 1;
        if (title.length > room) {
            title = title.slice(0, room - 1) + "~";
        }
        while (title.length < room) {
            title += " ";
        }
        return num + NB + NB + title + " " + g.year;
    }

    /**
     * Barrel warp: a line at normalised height v (-1..1) draws narrower by
     * warp*v^2 and is re-centred, so the grid bulges like curved CRT glass.
     * Static - computed when placed, costs nothing per frame.
     */
    private placeLine(t: Text, line: number, xJolt: number, z: number): void {
        const last = this.lastLine();
        const v = (line / Math.max(1, last)) * 2 - 1;
        const sx = 1 - this.warp * v * v;
        const w = GameLibraryMenu.COLS * GameLibraryMenu.CHAR_W;
        const cx = GameLibraryMenu.LEFT + w / 2;
        const tr = t.getSceneObject().getTransform();
        tr.setLocalScale(new vec3(sx, 1, 1));
        tr.setLocalPosition(new vec3(cx - (w / 2) * sx + xJolt, this.lineY(line), z));
    }

    private buildCassette(): void {
        const L = GameLibraryMenu.LEFT;
        // header lines sit on the same warped grid as the rows
        const headLines = [0, 2, 4, 5]; // banner, stories, READY., LOAD
        for (let k = 0; k < headLines.length; k++) {
            const t = this.makeText("CassetteHead" + k, new vec3(L, this.lineY(headLines[k]), 0), Theme.c64Text);
            this.headTexts.push(t);
            this.placeLine(t, headLines[k], 0, 0);
        }
        for (let i = 0; i < GAMES.length; i++) {
            const t = this.makeText("CassetteRow" + i, new vec3(L, this.rowY(i), 0), Theme.c64Text);
            this.rowTexts.push(t);
            this.placeLine(t, GameLibraryMenu.ROW_LINE + i, 0, 0);
        }
        // inverse-video highlight: dark glyphs cut out of a lilac bar
        this.barText = this.makeText("CassetteBar", new vec3(L, this.rowY(0), 0.05), new vec4(0.08, 0.03, 0.16, 1));
        this.barText.backgroundSettings.enabled = true;
        this.barText.backgroundSettings.fill.color = Theme.c64Text;
        this.barText.renderOrder = 10;
        // rolling interference band
        this.bandText = this.makeText("CassetteBand", new vec3(L, this.lineY(0), 0.08),
            new vec4(Theme.c64Text.r, Theme.c64Text.g, Theme.c64Text.b, 0.22));
        let band = "";
        for (let c = 0; c < GameLibraryMenu.COLS; c++) {
            band += "▒";
        }
        this.bandText.text = band;
        this.bandText.getSceneObject().enabled = false;

        // CRT bezel wraps the whole grid (glass margin ~1.3 cm; the bezel
        // texture has 60 px margins on 1000x1200)
        if (this.bezelImage) {
            const bw = GameLibraryMenu.COLS * GameLibraryMenu.CHAR_W + 2.6;
            const btop = this.lineY(0) + 1.4;
            const bbottom = this.lineY(this.lastLine()) - GameLibraryMenu.PITCH - 1.0;
            const bt = this.bezelImage.getSceneObject().getTransform();
            this.bezelImage.stretchMode = StretchMode.Stretch;
            bt.setLocalRotation(quat.quatIdentity());
            bt.setLocalPosition(new vec3(L - 1.3 + bw / 2, (btop + bbottom) / 2, -0.4));
            bt.setLocalScale(new vec3(bw / (1 - 120 / 1000), (btop - bbottom) / (1 - 120 / 1200), 1));
        }

        // one invisible touch surface over the list: hover moves the bar,
        // pinch selects, pinching the selected row plays it
        const w = GameLibraryMenu.COLS * GameLibraryMenu.CHAR_W + 1;
        const top = this.rowY(0) + 0.3;
        const bottom = this.rowY(GAMES.length - 1) - GameLibraryMenu.PITCH;
        const hit = global.scene.createSceneObject("CassetteTouch");
        hit.setParent(this.getSceneObject());
        hit.getTransform().setLocalPosition(new vec3(L + w / 2 - 0.5, (top + bottom) / 2, 0.1));
        const col = hit.createComponent("Physics.ColliderComponent") as ColliderComponent;
        const shape = Shape.createBoxShape();
        shape.size = new vec3(w, top - bottom, 0.5);
        col.shape = shape;
        const touch = hit.createComponent(Interactable.getTypeName()) as Interactable;
        const rowAt = (e: InteractorEvent): number => {
            const info = e.interactor ? e.interactor.targetHitInfo : null;
            if (!info) {
                return -1;
            }
            const y = (top + bottom) / 2 + info.localHitPosition.y; // back to library space
            const i = Math.floor((this.rowY(0) + 0.3 - y) / GameLibraryMenu.PITCH);
            return i >= 0 && i < GAMES.length ? i : -1;
        };
        touch.onHoverUpdate.add((e: InteractorEvent) => this.setHover(rowAt(e)));
        touch.onHoverExit.add(() => this.setHover(-1));
        touch.onTriggerEnd.add((e: InteractorEvent) => {
            const i = rowAt(e);
            if (i < 0) {
                return;
            }
            if (GAMES[i].id === this.selected.id) {
                print("GameLibraryMenu: play " + this.selected.id + " (row tap)");
                if (this.onPlay) {
                    this.onPlay(this.selected.id);
                }
            } else {
                this.select(GAMES[i]);
            }
        });
    }

    private setHover(i: number): void {
        if (i !== this.hoverRow) {
            this.hoverRow = i;
            this.renderCassette();
        }
    }

    /** Library shown: replay the LOAD intro the first time, else show it all. */
    private opened(): void {
        if (!this.built || !this.cassetteStyle) {
            return;
        }
        this.openT = 0;
        this.animating = !GameLibraryMenu.playedIntro && !UxSettings.effectsReduced;
        GameLibraryMenu.playedIntro = true;
        this.renderCassette();
    }

    private animate(): void {
        if (!this.cassetteStyle || !this.built) {
            return;
        }
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        if (this.animating) {
            this.openT += dt;
            this.renderCassette();
        }
        if (!UxSettings.effectsReduced) {
            this.crtNoise(dt);
        }
    }

    /**
     * CRT misbehaviour, all cheap transform/colour pokes (no shader):
     *  - glitch bursts: every 2-6 s, 1-3 rows jolt sideways for ~0.2 s with a
     *    cyan/pink fringe, then snap back
     *  - rolling band: a faint ▒ bar rolls down the screen every ~5-10 s
     */
    private crtNoise(dt: number): void {
        const lines = this.rowTexts.length;
        if (this.glitchLeft > 0) {
            this.glitchLeft -= dt;
            const done = this.glitchLeft <= 0;
            for (const i of this.glitchRows) {
                const t = this.rowTexts[i];
                const jolt = done ? 0 : (Math.random() - 0.5) * 1.8;
                this.placeLine(t, GameLibraryMenu.ROW_LINE + i, jolt, 0);
                t.textFill.color = done ? Theme.c64Text : Math.random() < 0.5 ? Theme.cyan : Theme.pink;
            }
            if (done) {
                this.glitchRows = [];
                this.glitchIn = 2 + Math.random() * 4;
            }
        } else if ((this.glitchIn -= dt) <= 0 && lines > 0) {
            this.glitchLeft = 0.12 + Math.random() * 0.18;
            const n = 1 + Math.floor(Math.random() * 3);
            const start = Math.floor(Math.random() * lines);
            for (let k = 0; k < n && start + k < lines; k++) {
                this.glitchRows.push(start + k);
            }
        }
        if (this.bandText) {
            if (this.bandT >= 0) {
                this.bandT += dt;
                const p = this.bandT / 1.4;
                if (p >= 1) {
                    this.bandT = -1;
                    this.bandIn = 5 + Math.random() * 5;
                    this.bandText.getSceneObject().enabled = false;
                } else {
                    this.placeLine(this.bandText, p * (this.lastLine() + 1), 0, 0.08);
                }
            } else if ((this.bandIn -= dt) <= 0) {
                this.bandT = 0;
                this.placeLine(this.bandText, 0, 0, 0.08);
                this.bandText.getSceneObject().enabled = true;
            }
        }
    }

    /**
     * Timeline (seconds from open): banner + READY at once, LOAD line types at
     * 24 cps from 0.3 s, then rows print every 75 ms. Static once complete.
     */
    private renderCassette(): void {
        if (this.headTexts.length < 4) {
            return;
        }
        const load = 'LOAD "LIBRARY",8,1';
        const t = this.animating ? this.openT : 1e6;
        const typed = Math.max(0, Math.min(load.length, Math.floor((t - 0.3) * 24)));
        const rowsFrom = 0.3 + load.length / 24 + 0.35;
        const shown = Math.max(0, Math.min(GAMES.length, Math.floor((t - rowsFrom) / 0.075) + 1));
        const cursor = typed < load.length && Math.floor(t * 4) % 2 === 0 ? "█" : "";
        this.headTexts[0].text = "**** IFWHEN Z-MACHINE  V0.2 ****";
        this.headTexts[1].text = GAMES.length + " CLASSIC STORIES. FREE. BUILT IN.";
        this.headTexts[2].text = "READY.";
        this.headTexts[3].text = load.slice(0, typed) + cursor;
        const bar = this.hoverRow >= 0 ? this.hoverRow : GAMES.findIndex((g) => g.id === this.selected.id);
        for (let i = 0; i < this.rowTexts.length; i++) {
            const visible = t >= rowsFrom && i < shown;
            // the barred row is drawn by the bar itself (avoids double glyphs)
            this.rowTexts[i].text = visible && i !== bar ? this.rowString(i) : "";
        }
        if (this.barText) {
            const barVisible = t >= rowsFrom && bar >= 0 && bar < shown;
            this.barText.getSceneObject().enabled = barVisible;
            if (barVisible) {
                this.barText.text = this.rowString(bar);
                this.placeLine(this.barText, GameLibraryMenu.ROW_LINE + bar, 0, 0.05);
            }
        }
        if (this.animating && shown >= GAMES.length) {
            this.animating = false; // intro done: static from here
        }
    }

    private select(g: GameEntry): void {
        this.selected = g;
        if (this.cassetteStyle) {
            this.renderCassette();
        }
        if (this.detailText) {
            this.detailText.text =
                g.title + " (" + g.year + ")\n" +
                "by " + g.author + "  -  Rated " + g.rating + "\n\n" +
                this.wrap(g.blurb) + "\n\n" +
                this.wrap(g.attribution);
        }
    }

    private wrap(s: string): string {
        if (this.wrapColumn <= 0) {
            return s;
        }
        const words = s.split(" ");
        const lines: string[] = [""];
        for (const w of words) {
            const line = lines[lines.length - 1];
            if (line.length > 0 && line.length + 1 + w.length > this.wrapColumn) {
                lines.push(w);
            } else {
                lines[lines.length - 1] = line.length > 0 ? line + " " + w : w;
            }
        }
        return lines.join("\n");
    }

    private spawn(label: string, pos: vec3, onPress: () => void): BaseUIKitScrollButtonController {
        const button = this.buttonPrefab.instantiate(this.getSceneObject());
        button.getTransform().setLocalPosition(pos);
        button.enabled = true;
        const controller = getComponent<BaseUIKitScrollButtonController>(button, BaseUIKitScrollButtonController);
        const data = new BaseScrollButtonData();
        data.buttonText = label;
        controller.setButtonData(data);
        controller.onButtonPressed.add(() => onPress());
        return controller;
    }
}
