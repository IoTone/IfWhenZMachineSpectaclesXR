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

    private currentData: BaseScrollButtonData | null = null;
    private eventsBound: boolean = false;

    /**
     * Assign (or re-assign) the data this button represents. Safe to call
     * repeatedly on a pooled/reused button: UIKit event handlers are bound
     * once and always dispatch the latest data.
     */
    public setButtonData(scrollButtonData: BaseScrollButtonData): void {
        this.currentData = scrollButtonData;
        if (this.uiKitButton != null) {
            if (!this.eventsBound) {
                this.eventsBound = true;
                this.uiKitButton.onHoverEnter.add(() => this.onHoveredEvent.invoke(true));
                this.uiKitButton.onHoverExit.add(() => this.onHoveredEvent.invoke(false));
                this.uiKitButton.onTriggerDown.add(() => {
                    if (this.currentData) {
                        this.onButtonPressedEvent.invoke(this.currentData);
                    }
                });
            }
            this.buttonText.text = scrollButtonData.buttonText;
            this.applyCustomSettings(scrollButtonData);
        }
    }

    protected applyCustomSettings(scrollButtonData: BaseScrollButtonData): void {
    }
}
