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

    /** Overall prop scale (Sketchfab import chains are wildly sized). */
    @input
    micScale: number = 0.3;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            // Code-driven placement (editor transform writes proved flaky):
            // right of the transcript, below eye level, within arm's reach.
            const t = this.getSceneObject().getTransform();
            t.setLocalPosition(new vec3(16, -14, 10));
            t.setLocalScale(new vec3(this.micScale, this.micScale, this.micScale));
            // The grab sphere must cover the (rescaled) mesh: collider radius
            // is in local units, so compensate for the small object scale.
            try {
                const collider = this.getSceneObject().getComponent("Physics.ColliderComponent");
                if (collider && (collider as any).shape) {
                    ((collider as any).shape as any).radius = 40; // ~12cm at scale 0.3
                }
            } catch (e) {
                print("MicHoldToTalk: could not resize collider (" + e + ")");
            }
            if (!this.interactable) {
                print("MicHoldToTalk: no interactable assigned");
                return;
            }
            this.interactable.onTriggerStart.add(() => {
                if (this.voiceInput) {
                    this.voiceInput.holdStart();
                }
            });
            this.interactable.onTriggerEnd.add(() => {
                if (this.voiceInput) {
                    this.voiceInput.holdEnd();
                }
            });
            this.interactable.onTriggerCanceled.add(() => {
                if (this.voiceInput) {
                    this.voiceInput.holdEnd();
                }
            });
            print("MicHoldToTalk: armed (hold the mic to speak)");
        });
    }
}
