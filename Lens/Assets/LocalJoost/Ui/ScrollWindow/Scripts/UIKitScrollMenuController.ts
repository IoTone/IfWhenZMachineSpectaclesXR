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

    // Button pool: buttons are created once and re-labeled on rebuilds.
    // Destroying buttons at runtime breaks ScrollWindow (it holds internal
    // references and interactions may be in flight on the pressed button).
    private buttonPool: SceneObject[] = [];
    private poolControllers: BaseUIKitScrollButtonController[] = [];
    private dimensionsHooked = false;
    private lastButtonCount = 0;

    private onAwake(): void {
        this.scrollArea = this.scrollWindow.getSceneObject();
        this.setMenuVisible(false);
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.initializeUI();
        });
        delayedEvent.reset(0.1);
    }

    /** Hide all pooled buttons (rebuilds re-enable the ones they use). */
    public clearButtons(): void {
        for (const button of this.buttonPool) {
            button.enabled = false;
        }
    }

    public createButtons(scrollButtonData: BaseScrollButtonData[]): void {
        var lines = Math.ceil(scrollButtonData.length / 2);
        var initOffset = lines % 2 != 0 ? this.yOffset : this.yOffset / 2;
        var yStart = Math.ceil(lines / 2) * this.yOffset - initOffset;
        var line = 0;
        this.lastButtonCount = scrollButtonData.length;
        if (!this.dimensionsHooked) {
            this.dimensionsHooked = true;
            this.scrollWindow.onInitialized.add(() => {
                this.applyScrollDimensions(this.lastButtonCount);
            });
        }
        this.applyScrollDimensions(this.lastButtonCount);
        this.setMenuVisible(true);

        for (let i = 0; i < scrollButtonData.length; i++) {
            var button: SceneObject;
            if (i < this.buttonPool.length) {
                button = this.buttonPool[i];
            } else {
                button = this.scrollButtonPrefab.instantiate(this.scrollArea);
                // Content must live inside the window's internal Scroller to be
                // masked/scrolled/managed correctly after initialization.
                this.scrollWindow.addObject(button);
                const controller = getComponent<BaseUIKitScrollButtonController>(button, BaseUIKitScrollButtonController);
                controller.onHovered.add((p) => {
                    this.scrollWindow.vertical = !p;
                });
                controller.onButtonPressed.add((data) => this.onButtonPressedEvent.invoke(data));
                this.buttonPool.push(button);
                this.poolControllers.push(controller);
            }
            var buttonTransform = button.getTransform();
            var xPos = (i % 2 == 0) ? -this.columnSize : this.columnSize;
            buttonTransform.setLocalPosition(new vec3(xPos, yStart - this.yOffset * line, 0.1));
            button.enabled = true;
            if (i % 2 != 0) {
                line++;
            }
            this.poolControllers[i].setButtonData(scrollButtonData[i]);
        }
        // Hide any leftover pooled buttons beyond this rebuild's needs.
        for (let i = scrollButtonData.length; i < this.buttonPool.length; i++) {
            this.buttonPool[i].enabled = false;
        }
        this.updateScrollPosition();
    }

    private applyScrollDimensions(buttonCount: number): void {
        const lines = Math.ceil(buttonCount / 2);
        try {
            this.scrollWindow.setScrollDimensions(new vec2(0, lines * this.yOffset));
        } catch (e) {
            // not initialized yet; the onInitialized hook applies it later
        }
    }

    protected initializeUI(): void {
        if (this.closeButton) {
            this.closeButton.onTriggerDown.add(() => this.closeMenu());
        }
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
