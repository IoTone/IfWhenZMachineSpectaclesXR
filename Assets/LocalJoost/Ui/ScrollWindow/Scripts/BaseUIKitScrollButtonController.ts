import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";
import { BaseScrollButtonData } from "./BaseScrollButtonData";

@component
export class BaseUIKitScrollButtonController extends BaseScriptComponent {
    @input buttonText: Text;
    @input uiKitButton: BaseButton;

    private onButtonPressedEvent = new Event<BaseScrollButtonData>();
    public readonly onButtonPressed = this.onButtonPressedEvent.publicApi();

    public onHoveredEvent = new Event<boolean>();
    public onHovered = this.onHoveredEvent.publicApi();

    public setButtonData(scrollButtonData: BaseScrollButtonData): void {
        if (this.uiKitButton != null) {
            this.uiKitButton.onHoverEnter.add(() => this.onHoveredEvent.invoke(true));
            this.uiKitButton.onHoverExit.add(() => this.onHoveredEvent.invoke(false));
            this.uiKitButton.onTriggerDown.add(() => this.onButtonPressedEvent.invoke(scrollButtonData));
            this.buttonText.text = scrollButtonData.buttonText;
            this.applyCustomSettings(scrollButtonData);
        }
    }

    protected applyCustomSettings(scrollButtonData: BaseScrollButtonData): void {
    }
}
