import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { UIKitScrollMenuController } from "LocalJoost/Ui/ScrollWindow/Scripts/UIKitScrollMenuController";
import { ZMachineHost } from "./ZMachineHost";
import { VoiceInput } from "./VoiceInput";

/**
 * Populates the scroll menu with Z-Machine quick commands and forwards
 * presses to the interpreter as player input.
 */
@component
export class ScrollButtonDataLoader extends BaseScriptComponent {
    @input scrollMenuController: UIKitScrollMenuController;

    @input
    @allowUndefined
    zmHost: ZMachineHost;

    @input
    @allowUndefined
    voiceInput: VoiceInput;

    /** Quick commands, in display order (two per menu row). */
    private commands: string[] = [
        "Speak",
        "North",
        "South",
        "East",
        "West",
        "Up",
        "Down",
        "Look",
        "Inventory",
        "Open",
        "Enter",
        "Take",
        "Drop",
        "Save",
        "Restore",
        "New Game",
    ];

    private onAwake(): void {
        const buttonDataArray: BaseScrollButtonData[] = [];
        for (const command of this.commands) {
            const buttonData = new BaseScrollButtonData();
            buttonData.buttonText = command;
            buttonDataArray.push(buttonData);
        }
        this.scrollMenuController.createButtons(buttonDataArray);
        this.scrollMenuController.onButtonPressed.add((data) => {
            if (data.buttonText === "Speak") {
                if (this.voiceInput) {
                    this.voiceInput.toggleListen();
                } else {
                    print("ScrollButtonDataLoader: no voiceInput assigned");
                }
                return;
            }
            if (data.buttonText === "New Game") {
                if (this.zmHost) {
                    this.zmHost.restartGame();
                }
                return;
            }
            if (this.zmHost) {
                this.zmHost.submitCommand(data.buttonText.toLowerCase());
            } else {
                print("ScrollButtonDataLoader: no zmHost assigned; pressed: " + data.buttonText);
            }
        });
    }
}
