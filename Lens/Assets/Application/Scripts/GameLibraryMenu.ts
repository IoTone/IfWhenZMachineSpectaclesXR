import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";
import { UIKitScrollMenuController } from "LocalJoost/Ui/ScrollWindow/Scripts/UIKitScrollMenuController";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import { GAMES, GameEntry, getGame } from "./games/registry";
import { ZMachineHost } from "./ZMachineHost";

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

    /** AppFlow assigns this; called with the selected game id on Play. */
    public onPlay: ((id: string) => void) | null = null;

    private selected: GameEntry = GAMES[0];
    private built: boolean = false;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.build());
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
        if (this.scrollMenu) {
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
        this.select(GAMES[0]);
        print("GameLibraryMenu: " + GAMES.length + " games listed");
    }

    private select(g: GameEntry): void {
        this.selected = g;
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
