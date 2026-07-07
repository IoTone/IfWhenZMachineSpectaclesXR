import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import { VoiceInput } from "./VoiceInput";
import { ScrollButtonDataLoader } from "./ScrollButtonDataLoader";

/**
 * Two dedicated, always-visible action buttons pinned below the command menu
 * frame — outside the scroll window so they never move and are easy to hit
 * with poke or pinch:
 *
 *   [ Speak ]  toggles voice listening (label reflects live state)
 *   [ Clear ]  resets the armed verb and drops queued commands
 */
@component
export class QuickButtons extends BaseScriptComponent {
    @input
    buttonPrefab: ObjectPrefab;

    /** Parent to attach the buttons to (the MenuFrame). */
    @input
    menuRoot: SceneObject;

    @input
    @allowUndefined
    voiceInput: VoiceInput;

    @input
    @allowUndefined
    loader: ScrollButtonDataLoader;

    /** Local Y position under the menu window (frame is ~24 units tall). */
    @input
    yPosition: number = -16;

    private speakController: BaseUIKitScrollButtonController | null = null;
    private wasListening: boolean = false;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.build());
    }

    private build(): void {
        // Speak is HOLD-to-talk: press (pinch or poke) starts listening,
        // release stops and submits the transcription.
        // Hold-to-talk if the button exposes press/release events; otherwise
        // fall back to press-to-toggle. Wiring failures must never prevent
        // the Clear button below from spawning.
        let holdWired = false;
        this.speakController = this.spawn("Hold: Speak", -5.5, () => {
            if (!holdWired && this.voiceInput) {
                this.voiceInput.toggleListen(); // fallback mode
                this.refreshSpeakLabel();
            }
        });
        try {
            this.speakController.getSceneObject().getTransform().setLocalScale(new vec3(1.35, 1.35, 1));
            const uiButton = this.speakController.uiKitButton as any;
            if (uiButton && uiButton.onTriggerDown && uiButton.onTriggerUp) {
                uiButton.onTriggerDown.add(() => {
                    if (this.voiceInput) {
                        this.voiceInput.holdStart();
                        this.refreshSpeakLabel();
                    }
                });
                uiButton.onTriggerUp.add(() => {
                    if (this.voiceInput) {
                        this.voiceInput.holdEnd();
                        this.refreshSpeakLabel();
                    }
                });
                holdWired = true;
            }
        } catch (e) {
            print("QuickButtons: hold-to-talk unavailable, using toggle (" + e + ")");
        }
        this.spawn("Clear", 6, () => {
            if (this.loader) {
                this.loader.clearCommand();
            }
        });
        // Keep the Speak label honest even when listening stops on its own
        // (final transcription or error).
        const tick = this.createEvent("UpdateEvent");
        tick.bind(() => this.refreshSpeakLabel());
        print("QuickButtons: ready");
    }

    private refreshSpeakLabel(): void {
        if (!this.speakController || !this.voiceInput) {
            return;
        }
        const listening = this.voiceInput.isListening;
        if (listening !== this.wasListening) {
            this.wasListening = listening;
            const data = new BaseScrollButtonData();
            data.buttonText = listening ? "● Listening" : "Hold: Speak";
            this.speakController.setButtonData(data);
        }
    }

    private spawn(label: string, xPos: number, onPress: () => void): BaseUIKitScrollButtonController {
        const button = this.buttonPrefab.instantiate(this.menuRoot);
        button.getTransform().setLocalPosition(new vec3(xPos, this.yPosition, 0.1));
        button.enabled = true;
        const controller = getComponent<BaseUIKitScrollButtonController>(button, BaseUIKitScrollButtonController);
        const data = new BaseScrollButtonData();
        data.buttonText = label;
        controller.setButtonData(data);
        controller.onButtonPressed.add(() => onPress());
        return controller;
    }
}
