import { BaseScrollButtonData } from "LocalJoost/Ui/ScrollWindow/Scripts/BaseScrollButtonData";
import { UIKitScrollMenuController } from "LocalJoost/Ui/ScrollWindow/Scripts/UIKitScrollMenuController";

@component
export class ScrollButtonDataLoader extends BaseScriptComponent {
    @input scrollMenuController: UIKitScrollMenuController

    private onAwake(): void {
        const buttonDataArray: BaseScrollButtonData[] = [];
        for (let i = 1; i <= 20; i++) {
            const buttonData = new BaseScrollButtonData();
            buttonData.buttonText = "Button " + i;
            buttonDataArray.push(buttonData); 
        }
        this.scrollMenuController.createButtons(buttonDataArray);
        this.scrollMenuController.onButtonPressed.add((data) => {
            print("From UIKitScrollMenuController: button Pressed: " + data.buttonText);
        });
    }
}