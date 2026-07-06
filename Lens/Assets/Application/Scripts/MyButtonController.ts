import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { BaseUIKitScrollButtonController } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseUIKitScrollButtonController";

@component
export class MyButtonController extends BaseUIKitScrollButtonController {
    // Note: do not bind uiKitButton events here — setButtonData is called
    // repeatedly on pooled buttons and the base class already dispatches
    // onButtonPressed with the latest data.
    protected applyCustomSettings(scrollButtonData: BaseScrollButtonData): void {
        super.applyCustomSettings(scrollButtonData);
    }
}
