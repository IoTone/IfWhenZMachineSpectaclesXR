import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { UIKitScrollMenuController } from "LocalJoost/Ui/ScrollWindow/Scripts/UIKitScrollMenuController";
import { ZMachineHost } from "./ZMachineHost";
import { VoiceInput } from "./VoiceInput";
import { Narrator } from "./Narrator";
import { AppFlow } from "./AppFlow";

/**
 * Drives the scroll menu as a grammar-guided Z-Machine command builder.
 *
 * The menu is rebuilt every turn from the interpreter's live scene context:
 *   [nouns in room / inventory]  <- dynamic, from the object tree
 *   [verbs]                      <- transitive verbs arm a pending command
 *   [compass directions]
 *   [meta: Speak / Save / Restore / New Game]
 *
 * Transitive verb (Take, Open, ...) -> menu header shows "take ___", next
 * noun tap completes and submits. Noun tap with no armed verb -> examine it.
 */
interface CommandButtonData extends BaseScrollButtonData {
    kind: "noun" | "verb" | "meta";
    command: string;
    transitive?: boolean;
}

const VERBS: { label: string; command: string; transitive: boolean }[] = [
    { label: "Examine", command: "examine", transitive: true },
    { label: "Take", command: "take", transitive: true },
    { label: "Open", command: "open", transitive: true },
    { label: "Close", command: "close", transitive: true },
    { label: "Read", command: "read", transitive: true },
    { label: "Drop", command: "drop", transitive: true },
    { label: "Look", command: "look", transitive: false },
    { label: "Inventory", command: "inventory", transitive: false },
    // Answer buttons: stories routinely ask direct questions ("Would you
    // like instructions?") that need a bare yes/no.
    { label: "Yes", command: "yes", transitive: false },
    { label: "No", command: "no", transitive: false },
];

// Full 8-point compass + vertical + in/out. Labels lowercase to the Z-machine
// direction words (all recognized by Infocom/Inform parsers, incl. Mini-Zork,
// whose above-ground map genuinely uses NE/SE exits).
const COMPASS = [
    "North", "South", "East", "West",
    "Northeast", "Northwest", "Southeast", "Southwest",
    "Up", "Down", "In", "Out",
];
const MAX_NOUNS = 10;

@component
export class ScrollButtonDataLoader extends BaseScriptComponent {
    @input scrollMenuController: UIKitScrollMenuController;

    @input
    @allowUndefined
    zmHost: ZMachineHost;

    @input
    @allowUndefined
    voiceInput: VoiceInput;

    @input
    @allowUndefined
    narrator: Narrator;

    @input
    @allowUndefined
    appFlow: AppFlow;

    /** Menu header used as the command preview ("take ___"). */
    @input
    @allowUndefined
    previewText: Text3D;

    private pendingVerb: string | null = null;
    private lastContext: any = null;
    private lastSignature: string = "";

    private onAwake(): void {
        this.placeMenu();
        this.scrollMenuController.onButtonPressed.add((data) => this.onPressed(data as CommandButtonData));
        this.rebuild();
        if (this.zmHost) {
            this.zmHost.setSceneContextListener((ctx) => {
                // ctx === null means a game switch: drop the previous game's
                // nouns and any half-built command so the menu is specific to
                // the new story from the first frame.
                if (!ctx) {
                    this.pendingVerb = null;
                }
                this.lastContext = ctx;
                this.rebuild();
            });
        }
    }

    /**
     * World-locked "lectern" placement: the menu sits ~30 degrees below the
     * user's initial forward gaze, tilted back to face the eyes. (The scene
     * file parks the ScrollMenu at y=1000 for the old Headlock behavior, so
     * this repositions it explicitly; Headlock/Billboard are disabled.)
     */
    private placeMenu(): void {
        const menuTransform = this.scrollMenuController.getSceneObject().getTransform();
        const angle = (30 * Math.PI) / 180;
        const distance = 50; // cm from the user
        menuTransform.setLocalPosition(new vec3(0, -distance * Math.sin(angle), -distance * Math.cos(angle)));
        menuTransform.setLocalRotation(quat.fromEulerAngles(-angle, 0, 0));
    }

    private button(label: string, kind: "noun" | "verb" | "meta", command: string, transitive?: boolean): CommandButtonData {
        const data = new BaseScrollButtonData() as CommandButtonData;
        data.buttonText = label;
        data.kind = kind;
        data.command = command;
        data.transitive = transitive;
        return data;
    }

    private rebuild(): void {
        const buttons: CommandButtonData[] = [];
        if (this.lastContext) {
            const nouns: { name: string; held: boolean }[] = [];
            for (const o of this.lastContext.roomObjects.slice(0, MAX_NOUNS)) {
                nouns.push({ name: o.name, held: false });
            }
            for (const o of this.lastContext.inventory.slice(0, MAX_NOUNS)) {
                nouns.push({ name: o.name, held: true });
            }
            for (const n of nouns) {
                buttons.push(this.button((n.held ? "* " : "") + n.name, "noun", n.name));
            }
        }
        for (const v of VERBS) {
            buttons.push(this.button(v.label, "verb", v.command, v.transitive));
        }
        for (const d of COMPASS) {
            buttons.push(this.button(d, "verb", d.toLowerCase(), false));
        }
        buttons.push(this.button(this.narrator && this.narrator.isOn ? "Narrate: On" : "Narrate: Off", "meta", "narrate"));
        buttons.push(this.button("Save", "verb", "save", false));
        buttons.push(this.button("Restore", "verb", "restore", false));
        buttons.push(this.button("New Game", "meta", "newgame"));
        if (this.appFlow) {
            buttons.push(this.button("Game Library", "meta", "library"));
        }

        // The scroll kit was designed for one-shot creation; rebuilding every
        // turn races its delayed scroll-reset and causes visual jitter. Skip
        // when nothing actually changed.
        const signature = buttons.map((b) => b.buttonText).join("|");
        if (signature === this.lastSignature) {
            this.updatePreview();
            return;
        }
        this.lastSignature = signature;
        this.scrollMenuController.clearButtons();
        this.scrollMenuController.createButtons(buttons);
        this.updatePreview();
        print("CommandMenu: " + buttons.length + " buttons" +
            (this.lastContext ? " [" + this.lastContext.room + "]" : " (no scene context yet)"));
    }

    private onPressed(data: CommandButtonData): void {
        if (data.kind === "meta") {
            if (data.command === "speak") {
                if (this.voiceInput) {
                    this.voiceInput.toggleListen();
                }
            } else if (data.command === "newgame" && this.zmHost) {
                this.zmHost.restartGame();
            } else if (data.command === "narrate") {
                if (this.narrator) {
                    this.narrator.toggle();
                    this.rebuild(); // refresh the On/Off label
                }
            } else if (data.command === "clear") {
                this.clearCommand();
            } else if (data.command === "library") {
                if (this.appFlow) {
                    this.appFlow.showLibrary();
                }
            }
            return;
        }
        if (!this.zmHost) {
            print("ScrollButtonDataLoader: no zmHost assigned; pressed: " + data.buttonText);
            return;
        }
        if (data.kind === "verb") {
            if (data.transitive) {
                this.pendingVerb = this.pendingVerb === data.command ? null : data.command; // tap again to cancel
                this.updatePreview();
            } else {
                this.zmHost.submitCommand(data.command);
            }
            return;
        }
        // noun
        if (this.pendingVerb) {
            this.zmHost.submitCommand(this.pendingVerb + " " + data.command);
            this.pendingVerb = null;
            this.updatePreview();
        } else {
            this.zmHost.submitCommand("examine " + data.command);
        }
    }

    /** Reset the command builder and drop any queued commands (Clear button). */
    public clearCommand(): void {
        this.pendingVerb = null;
        this.updatePreview();
        if (this.zmHost) {
            this.zmHost.clearQueuedInput();
        }
    }

    private updatePreview(): void {
        if (this.previewText) {
            this.previewText.text = this.pendingVerb ? this.pendingVerb + " ___" : "Choose an action";
        }
    }
}
