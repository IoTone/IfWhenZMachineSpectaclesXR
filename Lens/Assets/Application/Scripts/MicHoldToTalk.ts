import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { VoiceInput } from "./VoiceInput";

/**
 * Grabbable microphone prop: while the player is holding (triggering) the
 * mic's Interactable, the Lens listens; on release the transcription is
 * submitted as a game command.
 *
 * Scene assembly (on the object holding your microphone model):
 *   1. The mic mesh (RenderMeshVisual from your imported asset)
 *   2. A ColliderComponent roughly fitting the mesh
 *   3. SIK "Interactable" component
 *   4. (optional) SIK "InteractableManipulation" so the mic can be picked
 *      up and moved while talking
 *   5. This script, with voiceInput and the object's Interactable assigned
 */
@component
export class MicHoldToTalk extends BaseScriptComponent {
    @input
    voiceInput: VoiceInput;

    @input
    interactable: Interactable;

    /**
     * Where the mic parks at start (local to its parent rig): down-right of
     * the command menu. Scale stays Inspector-owned. Tune this input in the
     * Inspector — component inputs persist reliably, unlike remote
     * transform edits.
     */
    @input
    micPosition: vec3 = new vec3(18, -22, 18);

    /** Monospace font for the status label (so the ASCII spinner aligns). */
    @input
    @allowUndefined
    statusFont: Font;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.getSceneObject().getTransform().setLocalPosition(this.micPosition);
            // Grab zone: a snug box around the mic body (the default sphere
            // ballooned far beyond the visual). Size is in local units, so
            // world size scales with the object's transform.
            try {
                const collider = this.getSceneObject().getComponent("Physics.ColliderComponent");
                if (collider) {
                    const box = Shape.createBoxShape();
                    box.size = new vec3(5, 3.5, 3.5);
                    (collider as any).shape = box;
                }
            } catch (e) {
                print("MicHoldToTalk: could not shape collider (" + e + ")");
            }
            if (!this.interactable) {
                print("MicHoldToTalk: no interactable assigned");
                return;
            }
            // In the editor a mouse click fires trigger start AND end in the
            // same instant — there's no way to "hold" to speak. So in the
            // editor the mic is CLICK-TO-TOGGLE (click to start, speak, click
            // to stop). On device it's genuine hold-to-talk.
            // @ts-ignore - deviceInfoSystem is a Lens runtime global
            const editor = global.deviceInfoSystem.isEditor();
            this.interactable.onHoverEnter.add(() => {
                print("MicHoldToTalk: hover");
            });
            if (editor) {
                this.interactable.onTriggerStart.add(() => {
                    if (!this.voiceInput) {
                        return;
                    }
                    if (this.voiceInput.isListening) {
                        print("MicHoldToTalk: click - stop (editor)");
                        this.voiceInput.holdEnd();
                    } else {
                        print("MicHoldToTalk: click - start listening (editor); speak, then click again");
                        this.voiceInput.holdStart();
                    }
                });
            } else {
                this.interactable.onTriggerStart.add(() => {
                    print("MicHoldToTalk: trigger start - listening");
                    if (this.voiceInput) {
                        this.voiceInput.holdStart();
                    }
                });
                this.interactable.onTriggerEnd.add(() => {
                    print("MicHoldToTalk: trigger end - submitting");
                    if (this.voiceInput) {
                        this.voiceInput.holdEnd();
                    }
                });
                this.interactable.onTriggerCanceled.add(() => {
                    print("MicHoldToTalk: trigger canceled");
                    if (this.voiceInput) {
                        this.voiceInput.holdEnd();
                    }
                });
            }
            this.buildIndicator();
            print("MicHoldToTalk: armed (hold the mic to speak)");
        });
        const tick = this.createEvent("UpdateEvent");
        tick.bind(() => this.refreshIndicator());
    }

    /**
     * Feedback above the mic: a colored orb (idle red / listening bright red /
     * processing amber) plus an animated status label ("[ listening... ]" ->
     * live words -> "| processing voice command |" -> "heard: <command>").
     */
    private orb: Text | null = null;
    private statusText: Text | null = null;

    private static readonly ORB_IDLE = new vec4(0.4, 0.1, 0.1, 0.75);
    private static readonly ORB_LIVE = new vec4(1.0, 0.12, 0.08, 1.0);
    private static readonly ORB_PROC = new vec4(1.0, 0.65, 0.1, 1.0);

    private buildIndicator(): void {
        try {
            // Siblings of the mic (not children) so the Sketchfab scale chain
            // can't distort them; parked just above the mic's position.
            const parent = this.getSceneObject().getParent();
            const micPos = this.getSceneObject().getTransform().getLocalPosition();

            // @ts-ignore - global.scene is a Lens runtime API
            const orbObj = global.scene.createSceneObject("MicOrb");
            if (parent) {
                orbObj.setParent(parent);
            }
            orbObj.getTransform().setLocalPosition(new vec3(micPos.x, micPos.y + 12, micPos.z));
            this.orb = orbObj.createComponent("Component.Text") as Text;
            this.orb.text = "●";
            this.orb.size = 56;
            (this.orb as any).horizontalAlignment = 1;
            this.orb.textFill.color = MicHoldToTalk.ORB_IDLE;

            // @ts-ignore
            const labelObj = global.scene.createSceneObject("MicStatus");
            if (parent) {
                labelObj.setParent(parent);
            }
            labelObj.getTransform().setLocalPosition(new vec3(micPos.x, micPos.y + 7, micPos.z));
            this.statusText = labelObj.createComponent("Component.Text") as Text;
            this.statusText.text = "";
            this.statusText.size = 26;
            (this.statusText as any).horizontalAlignment = 1;
            if (this.statusFont) {
                this.statusText.font = this.statusFont;
            }
        } catch (e) {
            print("MicHoldToTalk: could not create indicator (" + e + ")");
        }
    }

    private refreshIndicator(): void {
        if (!this.voiceInput) {
            return;
        }
        if (this.orb) {
            const color = this.voiceInput.isListening
                ? MicHoldToTalk.ORB_LIVE
                : this.voiceInput.isProcessing
                  ? MicHoldToTalk.ORB_PROC
                  : MicHoldToTalk.ORB_IDLE;
            this.orb.textFill.color = color;
        }
        if (this.statusText) {
            const line = this.voiceInput.statusLine;
            this.statusText.getSceneObject().enabled = line.length > 0;
            this.statusText.text = line;
        }
    }
}
