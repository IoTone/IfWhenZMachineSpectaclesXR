import { ZMachineHost } from "./ZMachineHost";

/**
 * Voice input for the Z-Machine: speech-to-text via VoiceML.
 *
 * Two triggers:
 *  - Pinch-to-talk (Spectacles): hold right-hand pinch to listen, release to
 *    stop. Armed via GestureModule when available.
 *  - toggleListen(): call from any UI (e.g. the "Speak" menu button) to
 *    start/stop listening — works in Preview with the microphone enabled.
 *
 * Final transcriptions are normalized (lowercase, punctuation stripped) and
 * submitted to the interpreter as player commands.
 */
@component
export class VoiceInput extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    // @ts-ignore - require is provided by the Lens runtime
    private vm: VoiceMLModule = require("LensStudio:VoiceMLModule");

    private listening: boolean = false;
    private micEnabledLogged: boolean = false;
    /** Cooldown after a hard error so pinch noise can't cause a retry storm. */
    private lastErrorTime: number = -10;

    onAwake() {
        this.vm.onListeningUpdate.add((eventData: VoiceML.ListeningUpdateEventArgs) => {
            if (eventData.transcription && eventData.isFinalTranscription) {
                this.onFinalTranscription(eventData.transcription);
            }
        });
        this.vm.onListeningError.add((eventData: VoiceML.ListeningErrorEventArgs) => {
            print("VoiceInput error: " + eventData.error + " - " + eventData.description);
            this.listening = false;
            // @ts-ignore - getTime is a Lens runtime global
            this.lastErrorTime = getTime();
            // Release the session; otherwise the module stays "in use" and
            // every retry fails with "Only a single VoiceML module is allowed".
            try {
                this.vm.stopListening();
            } catch (e) {
                // already stopped
            }
        });
        this.vm.onListeningEnabled.add(() => {
            // Fires repeatedly in Preview; log once.
            if (!this.micEnabledLogged) {
                this.micEnabledLogged = true;
                print("VoiceInput: microphone listening enabled");
            }
        });

        // Spectacles pinch-to-talk on the LEFT hand (the right hand pinches
        // to press UI buttons, which must not trigger listening). Skipped in
        // the editor, where the simulated hand's pinch fires on every click.
        // @ts-ignore - deviceInfoSystem is a Lens runtime global
        if (global.deviceInfoSystem.isEditor()) {
            print("VoiceInput: editor - use the Speak button");
        } else {
            try {
                // @ts-ignore
                const gestureModule: GestureModule = require("LensStudio:GestureModule");
                gestureModule.getPinchDownEvent(GestureModule.HandType.Left).add(() => this.startListen());
                gestureModule.getPinchUpEvent(GestureModule.HandType.Left).add(() => this.stopListen());
                print("VoiceInput: LEFT-hand pinch-to-talk armed");
            } catch (e) {
                print("VoiceInput: GestureModule unavailable, use the Speak button (" + e + ")");
            }
        }
    }

    /** UI entry point: toggle listening on/off (e.g. from the Speak button). */
    /** True while actively listening for speech. */
    public get isListening(): boolean {
        return this.listening;
    }

    /** Hold-to-talk: press. */
    public holdStart(): void {
        this.startListen();
    }

    /** Hold-to-talk: release (final transcription arrives after stop). */
    public holdEnd(): void {
        this.stopListen();
    }

    public toggleListen(): void {
        if (this.listening) {
            this.stopListen();
        } else {
            this.startListen();
        }
    }

    private startListen(): void {
        if (this.listening) {
            return;
        }
        // @ts-ignore - getTime is a Lens runtime global
        if (getTime() - this.lastErrorTime < 3.0) {
            return; // cooling down after an error (e.g. mic permission denied)
        }
        this.listening = true;
        try {
            const options = VoiceML.ListeningOptions.create();
            options.shouldReturnAsrTranscription = true;
            options.shouldReturnInterimAsrTranscription = false;
            this.vm.startListening(options);
            print("VoiceInput: listening...");
        } catch (e) {
            this.listening = false;
            // @ts-ignore
            this.lastErrorTime = getTime();
            print("VoiceInput: startListening failed: " + e);
        }
    }

    private stopListen(): void {
        if (!this.listening) {
            return;
        }
        this.listening = false;
        this.vm.stopListening();
        print("VoiceInput: stopped");
    }

    private onFinalTranscription(transcription: string): void {
        const command = transcription
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (command.length === 0) {
            return;
        }
        print('VoiceInput: heard "' + command + '"');
        if (this.zmHost) {
            this.zmHost.submitCommand(command);
        }
    }
}
