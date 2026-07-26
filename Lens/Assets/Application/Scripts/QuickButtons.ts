import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import { ScrollButtonDataLoader } from "./ScrollButtonDataLoader";

/**
 * Dedicated always-visible Clear button beside the command menu frame —
 * resets the armed verb and drops queued commands. (Voice input moved to the
 * grabbable microphone prop; the old Hold:Speak button intercepted touches.)
 */
@component
export class QuickButtons extends BaseScriptComponent {
    @input
    buttonPrefab: ObjectPrefab;

    /** Parent to attach the button to (the MenuFrame). */
    @input
    menuRoot: SceneObject;

    @input
    @allowUndefined
    loader: ScrollButtonDataLoader;

    /** Local position beside the menu window (left of the frame). */
    @input
    clearX: number = -14;

    @input
    clearY: number = 0;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => this.build());
    }

    private build(): void {
        this.spawn("Clear", new vec3(this.clearX, this.clearY, 0.1), () => {
            if (this.loader) {
                this.loader.clearCommand();
            }
        });
        print("QuickButtons: ready");
    }

    private spawn(label: string, pos: vec3, onPress: () => void): BaseUIKitScrollButtonController {
        const button = this.buttonPrefab.instantiate(this.menuRoot);
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
