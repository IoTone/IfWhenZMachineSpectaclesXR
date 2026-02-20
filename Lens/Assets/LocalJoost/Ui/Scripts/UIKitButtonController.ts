import { Interactable, TargetingVisual } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"

@component
export class UIKitButtonController extends BaseScriptComponent {
    @input
    @hint(
        "Defines how Interactors can target and interact with this Interactable. Options include:\n\
- Direct: Only allows close pinch interactions where a hand directly touches the Interactable.\n\
- Indirect: Allows interactions from a distance with raycasting.\n\
- Direct/Indirect: Supports both direct and indirect interaction methods.\n\
- Poke: Enables finger poking interactions.\n\
- All: Supports all targeting modes (Direct, Indirect, and Poke)."
    )
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem("Direct", 1),
            new ComboBoxItem("Indirect", 2),
            new ComboBoxItem("Direct/Indirect", 3),
            new ComboBoxItem("Poke", 4),
            new ComboBoxItem("All", 7)
        ])
    )
    targetingMode: number = 3

    /**
     * Sets the preferred targeting visual. (Requires the V2 Cursor to be enabled on InteractorCursors).
     * - 0: Cursor (default)
     * - 1: Ray
     * - 2: None
     */
    @input
    @hint(
        "Sets the preferred targeting visual. (Requires the V2 Cursor to be enabled on InteractorCursors).\n\n\
- 0: None\n\
- 1: Cursor (default)\n\
- 2: Ray"
    )
    @widget(new ComboBoxWidget([new ComboBoxItem("None", 0), new ComboBoxItem("Cursor", 1), new ComboBoxItem("Ray", 2)]))
    targetingVisual: number = TargetingVisual.Cursor

    /**
     * When enabled, this Interactable ignores any parent InteractionPlane and factors into the cursor's position and
     * targetingVisual. Use when the Interactable is parented for organization but not spatially within that plane.
     */
    @input
    @hint(
        "When enabled, this Interactable ignores any parent InteractionPlane and factors into the cursor's position and \
targetingVisual. Use when the Interactable is parented for organization but not spatially within that plane."
    )
    ignoreInteractionPlane: boolean = false

    /**
     * Defines the singular source of truth for feedback + UI + cursor components to poll to check
     * if the Interactable should exhibit sticky behavior during trigger
     * (cursor locks on Interactable, remains in active visual state even after de-hovering).
     */
    @input
    @hint(
        "Defines the singular source of truth for feedback + UI + cursor components to poll to check \
if the Interactable should exhibit sticky behavior during trigger \
(cursor locks on Interactable, remains in active visual state even after de-hovering)."
    )
    keepHoverOnTrigger: boolean = false

    /**
     * Enable this to allow the Interactable to instantly be dragged on trigger rather than obeying the Interactor's
     * drag threshold.
     */
    @input
    @hint(
        "Enable this to allow the Interactable to instantly be dragged on trigger rather than obeying the Interactor's \
drag threshold."
    )
    enableInstantDrag: boolean = false

    /**
     * A flag that enables scroll interactions when this element is interacted with. When true, interactions with this
     * element can scroll a parent ScrollView that has content extending beyond its visible bounds.
     */
    @input
    @hint(
        "A flag that enables scroll interactions when this element is interacted with. When true, interactions with this \
element can scroll a parent ScrollView that has content extending beyond its visible bounds."
    )
    isScrollable: boolean = false

    /**
     * Determines whether this Interactable can be simultaneously controlled by multiple Interactors. When false, only
     * one Interactor type (e.g., left hand or right hand) can interact with this Interactable at a time, and subsequent
     * interaction attempts from different Interactors will be blocked. Set to true to enable interactions from multiple
     * sources simultaneously, such as allowing both hands to manipulate the Interactable at once.
     */
    @input
    @hint(
        "Determines whether this Interactable can be simultaneously controlled by multiple Interactors. When false, only \
one Interactor type (e.g., left hand or right hand) can interact with this Interactable at a time, and subsequent \
interaction attempts from different Interactors will be blocked. Set to true to enable interactions from multiple \
sources simultaneously, such as allowing both hands to manipulate the Interactable at once."
    )
    allowMultipleInteractors: boolean = true

    /**
     * Enable Poke Directionality to help prevent accidental interactions when users approach from unwanted angles.
     */
    @ui.separator
    @input
    @hint("Enable Poke Directionality to help prevent accidental interactions when users approach from unwanted angles.")
    enablePokeDirectionality: boolean = false

    /**
     * Controls from which directions a poke interaction can trigger this Interactable along the X-axis:
     * - Left: Finger must approach from -X direction.
     * - Right: Finger must approach from +X direction.
     * - All: Accepts both directions.
     * - None: Disables X-axis poke detection.
     */
    @input
    @label("X")
    @showIf("enablePokeDirectionality")
    @hint(
        "Controls from which directions a poke interaction can trigger this Interactable along the X-axis:\n\
- Left: Finger must approach from -X direction.\n\
- Right: Finger must approach from +X direction.\n\
- All: Accepts both directions.\n\
- None: Disables X-axis poke detection."
    )
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem("None", 0),
            new ComboBoxItem("Right", 1),
            new ComboBoxItem("Left", 2),
            new ComboBoxItem("All", 3)
        ])
    )
    acceptableXDirections: number = 0

    /**
     * Controls from which directions a poke interaction can trigger this Interactable along the Y-axis:
     * - Top: Finger must approach from +Y direction
     * - Bottom: Finger must approach from -Y direction
     * - All: Accepts both directions
     * - None: Disables Y-axis poke detection
     */
    @input
    @label("Y")
    @showIf("enablePokeDirectionality")
    @hint(
        "Controls from which directions a poke interaction can trigger this Interactable along the Y-axis:\n\
- Top: Finger must approach from +Y direction.\n\
- Bottom: Finger must approach from -Y direction.\n\
- All: Accepts both directions.\n\
- None: Disables Y-axis poke detection."
    )
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem("None", 0),
            new ComboBoxItem("Top", 1),
            new ComboBoxItem("Bottom", 2),
            new ComboBoxItem("All", 3)
        ])
    )
    acceptableYDirections: number = 0

    /**
     * Controls from which directions a poke interaction can trigger this Interactable along the Z-axis:
     * - Front: Finger must approach from +Z direction.
     * - Back: Finger must approach from -Z direction.
     * - All: Accepts both directions.
     * - None: Disables Z-axis poke detection.
     */
    @input
    @label("Z")
    @showIf("enablePokeDirectionality")
    @hint(
        "Controls from which directions a poke interaction can trigger this Interactable along the Z-axis:\n\
- Front: Finger must approach from +Z direction.\n\
- Back: Finger must approach from -Z direction.\n\
- All: Accepts both directions.\n\
- None: Disables Z-axis poke detection."
    )
    @widget(
        new ComboBoxWidget([
            new ComboBoxItem("None", 0),
            new ComboBoxItem("Front", 1),
            new ComboBoxItem("Back", 2),
            new ComboBoxItem("All", 3)
        ])
    )
    acceptableZDirections: number = 1

    /**
     * Determines if the Interactable should listen to filtered pinch events when targeted by a HandInteractor.
     * Filtered pinch events are more stable when the hand is quickly moving but may add latency in non-moving cases.
     * Most interactions should use raw pinch events by default.
     * Spatial interactions with large hand movement (such as dragging, scrolling) should use filtered pinch events.
     * If an Interactable has a parent Interactable that uses filtered pinch events,
     * the Interactable will also use filtered pinch events.
     */
    @input
    @hint(
        "Determines if the Interactable should listen to filtered pinch events when targeted by a HandInteractor. \
Filtered pinch events are more stable when the hand is quickly moving but may add latency in non-moving cases. \
Most interactions should use raw pinch events by default. \
Spatial interactions with large hand movement (such as dragging, scrolling) should use filtered pinch events. \
If an Interactable has a parent Interactable that uses filtered pinch events, \
the Interactable will also use filtered pinch events."
    )
    useFilteredPinch: boolean = false

    onAwake() {
        this.tryGetInteractable();
    }

    private tryGetInteractable(attempts: number = 0): void {
        const interactable = this.getSceneObject().getComponent(Interactable.getTypeName()) as Interactable;

        if (interactable) {
            this.updateInteractableProperties(interactable);
        } else if (attempts < 10) { // Max 10 attempts
            const delayedEvent = this.createEvent("DelayedCallbackEvent");
            delayedEvent.bind(() => this.tryGetInteractable(attempts + 1));
            delayedEvent.reset(0.1); // Wait 100ms between attempts
        } else {
            print("UIKitButtonController: Failed to find Interactable component after 10 attempts");
        }
    }

    private updateInteractableProperties(interactable: Interactable): void {
        interactable.targetingMode = this.targetingMode;
        interactable.targetingVisual = this.targetingVisual;
        interactable.ignoreInteractionPlane = this.ignoreInteractionPlane;
        interactable.keepHoverOnTrigger = this.keepHoverOnTrigger;
        interactable.enableInstantDrag = this.enableInstantDrag;
        interactable.isScrollable = this.isScrollable;
        interactable.allowMultipleInteractors = this.allowMultipleInteractors;
        interactable.enablePokeDirectionality = this.enablePokeDirectionality;
        interactable.acceptableXDirections = this.acceptableXDirections;
        interactable.acceptableYDirections = this.acceptableYDirections;
        interactable.acceptableZDirections = this.acceptableZDirections;
        interactable.useFilteredPinch = this.useFilteredPinch;
    }

}