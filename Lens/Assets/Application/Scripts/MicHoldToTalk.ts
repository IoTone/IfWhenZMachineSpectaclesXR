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

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            // Position/scale come from the editor transform (single source of
            // truth — code overrides fought the Inspector and always won).
            // Only the grab sphere is code-managed: collider radius is in
            // local units, so compensate for the object scale to keep a
            // consistent world-size grab zone the user is never inside of.
            try {
                const scale = Math.max(this.getSceneObject().getTransform().getLocalScale().x, 0.001);
                const collider = this.getSceneObject().getComponent("Physics.ColliderComponent");
                if (collider && (collider as any).shape) {
                    const maxWorldRadius = 60; // cm
                    ((collider as any).shape as any).radius = Math.min(40, maxWorldRadius / scale);
                }
            } catch (e) {
                print("MicHoldToTalk: could not resize collider (" + e + ")");
            }
            if (!this.interactable) {
                print("MicHoldToTalk: no interactable assigned");
                return;
            }
            this.interactable.onHoverEnter.add(() => {
                print("MicHoldToTalk: hover");
            });
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
            print("MicHoldToTalk: armed (hold the mic to speak)");
        });
    }
}
