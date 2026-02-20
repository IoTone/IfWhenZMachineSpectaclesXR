import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";
import { ScrollWindow } from "SpectaclesUIKit.lspkg/Scripts/Components/ScrollWindow/ScrollWindow";
import { BaseUIKitScrollButtonController } from "./BaseUIKitScrollButtonController";
import { BaseScrollButtonData } from "./BaseScrollButtonData";
import { getComponent } from "LocalJoost/Utilities/SceneUtils";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

@component
export class UIKitScrollMenuController extends BaseScriptComponent {
    @input yOffset: number = 5;
    @input columnSize: number = 4;
    @input scrollButtonPrefab: ObjectPrefab;
    @input scrollWindow: ScrollWindow;
    @input menuRoot: SceneObject;
    @input closeButton: BaseButton;

    private onButtonPressedEvent = new Event<BaseScrollButtonData>();
    public readonly onButtonPressed = this.onButtonPressedEvent.publicApi();
    private scrollArea: SceneObject;

    private onAwake(): void {
        this.scrollArea = this.scrollWindow.getSceneObject();
        this.setMenuVisible(false);
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.initializeUI();
        });
        delayedEvent.reset(0.1);
    }

    public createButtons(scrollButtonData: BaseScrollButtonData[]): void {
        var lines = Math.ceil(scrollButtonData.length / 2);
        var initOffset = lines % 2 != 0 ? this.yOffset : this.yOffset / 2;
        var yStart = Math.ceil(lines / 2) * this.yOffset - initOffset;
        var line = 0;
        this.scrollWindow.onInitialized.add(() => {
            this.scrollWindow.setScrollDimensions(new vec2(0, lines * this.yOffset));
        });
        this.setMenuVisible(true);

        for (let i = 0; i < scrollButtonData.length; i++) {
            var button = this.scrollButtonPrefab.instantiate(this.scrollArea);
            var buttonTransform = button.getTransform();
            var xPos = (i % 2 == 0) ? -this.columnSize : this.columnSize;
            buttonTransform.setLocalPosition(new vec3(xPos, yStart - this.yOffset * line, 0.1));
            button.enabled = true;
            if (i % 2 != 0) {
                line++;
            }

            const buttonController = getComponent<BaseUIKitScrollButtonController>(button, BaseUIKitScrollButtonController);
            buttonController.setButtonData(scrollButtonData[i]);
            buttonController.onHovered.add((p) => {
                this.scrollWindow.vertical = !p;
            });
            buttonController.onButtonPressed.add((data) => this.onButtonPressedEvent.invoke(data));
        }
        this.updateScrollPosition();
    }

    protected initializeUI(): void {
        this.closeButton.onTriggerDown.add(() => this.closeMenu());
    }

    private updateScrollPosition(): void {
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.scrollWindow.scrollPositionNormalized = new vec2(0, 1);
            this.menuRoot.getTransform().setLocalScale(new vec3(1, 1, 1));
        });
        delayedEvent.reset(1);
    }

    closeMenu() {
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.setMenuVisible(false);
        });
        delayedEvent.reset(0.25);
        this.setMenuVisible(false);
    }

    public setMenuVisible(visible: boolean): void {
        this.menuRoot.enabled = visible;
    }
}