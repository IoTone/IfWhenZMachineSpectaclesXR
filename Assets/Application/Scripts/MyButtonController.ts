import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";

@component
export class MyButtonController extends BaseUIKitScrollButtonController {
    protected applyCustomSettings(scrollButtonData: BaseScrollButtonData): void {
        super.applyCustomSettings(scrollButtonData);
        this.uiKitButton.onTriggerDown.add(() => {
            print("From MyButtonController: button pressed: " + scrollButtonData.buttonText);
        });
    }
}
