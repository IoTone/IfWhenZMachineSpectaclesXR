import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import { ZMachineHost } from "./ZMachineHost";

/**
 * Grammar-guided command builder: a floating panel of verb buttons plus a
 * noun grid regenerated every turn from the Z-Machine's live object tree
 * (what's in the room, what you're carrying).
 *
 * Interaction:
 *  - Intransitive verb (Look, Inventory, Wait) -> submits immediately.
 *  - Transitive verb (Take, Open, ...) -> arms the preview ("take ___");
 *    the next noun tap completes and submits the command.
 *  - Noun with no armed verb -> "examine <noun>".
 *  - Cancel clears the armed verb.
 */
interface ActionButtonData extends BaseScrollButtonData {
    kind: "verb" | "noun" | "cancel";
    command?: string; // verb word, or full noun phrase
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
    { label: "Cancel", command: "", transitive: false },
];

const MAX_ROOM_NOUNS = 6;
const MAX_INV_NOUNS = 4;

@component
export class ActionsPanel extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    @input
    buttonPrefab: ObjectPrefab;

    /** Parent for spawned buttons (a child object of the panel). */
    @input
    buttonsRoot: SceneObject;

    @input
    @allowUndefined
    previewText: Text;

    /** Vertical spacing between button rows (matches the scroll menu). */
    @input
    yOffset: number = 5;

    /** Horizontal half-spacing for the two columns. */
    @input
    columnSize: number = 4;

    private pendingVerb: string | null = null;
    private nounButtons: SceneObject[] = [];
    private verbRows: number = 0;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.initialize());
    }

    private initialize(): void {
        // Code-driven layout (see ZMachineHost.applyLayout for rationale):
        // panel to the right of the transcript, preview line above the grid.
        this.getSceneObject().getTransform().setLocalPosition(new vec3(10, 6, 0));
        if (this.previewText) {
            this.previewText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 4, 0));
        }
        // Fixed verb buttons at the top of the panel.
        for (let i = 0; i < VERBS.length; i++) {
            const v = VERBS[i];
            const data: ActionButtonData = new BaseScrollButtonData() as ActionButtonData;
            data.buttonText = v.label;
            data.kind = v.label === "Cancel" ? "cancel" : "verb";
            data.command = v.command;
            data.transitive = v.transitive;
            this.spawnButton(data, i);
        }
        this.verbRows = Math.ceil(VERBS.length / 2);
        this.setPreview("");
        print("ActionsPanel: " + VERBS.length + " verb buttons ready");
        this.zmHost.setSceneContextListener((ctx) => this.refreshNouns(ctx));
    }

    /** Rebuild the noun grid from the latest scene context. */
    private refreshNouns(ctx: any): void {
        for (const obj of this.nounButtons) {
            obj.destroy();
        }
        this.nounButtons = [];

        const nouns: { name: string; held: boolean }[] = [];
        for (const o of ctx.roomObjects.slice(0, MAX_ROOM_NOUNS)) {
            nouns.push({ name: o.name, held: false });
        }
        for (const o of ctx.inventory.slice(0, MAX_INV_NOUNS)) {
            nouns.push({ name: o.name, held: true });
        }

        print("ActionsPanel: [" + ctx.room + "] nouns: " +
            nouns.map((n) => (n.held ? "*" : "") + n.name).join(", "));
        // Noun grid continues directly below the verb rows.
        const startIndex = this.verbRows * 2;
        for (let i = 0; i < nouns.length; i++) {
            const n = nouns[i];
            const data: ActionButtonData = new BaseScrollButtonData() as ActionButtonData;
            data.buttonText = (n.held ? "* " : "") + n.name;
            data.kind = "noun";
            data.command = n.name;
            this.nounButtons.push(this.spawnButton(data, startIndex + i));
        }
    }

    /** Instantiate a button prefab at grid slot `index` (2 columns). */
    private spawnButton(data: ActionButtonData, index: number): SceneObject {
        const button = this.buttonPrefab.instantiate(this.buttonsRoot);
        const t = button.getTransform();
        const xPos = index % 2 === 0 ? -this.columnSize : this.columnSize;
        const yPos = -Math.floor(index / 2) * this.yOffset;
        t.setLocalPosition(new vec3(xPos, yPos, 0.1));
        button.enabled = true;
        const controller = getComponent<BaseUIKitScrollButtonController>(button, BaseUIKitScrollButtonController);
        controller.setButtonData(data);
        controller.onButtonPressed.add((d) => this.onPressed(d as ActionButtonData));
        return button;
    }

    private onPressed(data: ActionButtonData): void {
        if (data.kind === "cancel") {
            this.pendingVerb = null;
            this.setPreview("");
            return;
        }
        if (data.kind === "verb") {
            if (data.transitive) {
                this.pendingVerb = data.command!;
                this.setPreview(data.command + " ___");
            } else {
                this.zmHost.submitCommand(data.command!);
            }
            return;
        }
        // noun
        const noun = data.command!;
        if (this.pendingVerb) {
            this.zmHost.submitCommand(this.pendingVerb + " " + noun);
            this.pendingVerb = null;
            this.setPreview("");
        } else {
            this.zmHost.submitCommand("examine " + noun);
        }
    }

    private setPreview(text: string): void {
        if (this.previewText) {
            this.previewText.text = text;
        }
    }
}
