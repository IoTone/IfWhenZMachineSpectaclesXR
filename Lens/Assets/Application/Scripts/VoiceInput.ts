import { ZMachineHost } from "./ZMachineHost";

/**
 * Voice input for the Z-Machine via the ASR Module (automatic speech
 * recognition). VoiceML is sunset; ASR is the supported API.
 *
 *   docs: developers.snap.com/spectacles/about-spectacles-features/apis/asr-module
 *
 * IMPORTANT: the ASR Module is @wearableOnly — it transcribes on Spectacles
 * hardware, NOT in Lens Studio editor Preview. In the editor startTranscribing
 * is a no-op/throws, so this class reports "voice needs Spectacles" and the
 * hold cycle still animates (proving the trigger path) but yields no text.
 *
 * Model:
 *   - One AsrTranscriptionOptions is created once; its update/error callbacks
 *     are registered once.
 *   - Hold-to-talk drives sessions: holdStart -> startTranscribing(options),
 *     holdEnd -> a short grace window to catch the final transcription, then
 *     stopTranscribing() and submit the recognized command.
 *
 * Feedback lifecycle (via statusLine, rendered by the mic indicator):
 *   idle -> LISTENING (interim words live) -> PROCESSING -> RESULT (~2.5s).
 */
@component
export class VoiceInput extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    /** Seconds after release to keep the session open for the final result. */
    @input
    processingGrace: number = 1.2;

    // @ts-ignore - require is provided by the Lens runtime
    private asr: AsrModule = require("LensStudio:AsrModule");
    private options: AsrModule.AsrTranscriptionOptions | null = null;
    private available: boolean = true;

    private capturing: boolean = false;
    private processing: boolean = false;
    private sessionActive: boolean = false;
    private heard: string = "";
    private lastResult: string = "";
    private lastError: string = "";
    private resultUntil: number = -1;
    private updateCount: number = 0;

    onAwake() {
        try {
            this.options = AsrModule.AsrTranscriptionOptions.create();
            this.options.mode = AsrModule.AsrMode.HighAccuracy;
            this.options.silenceUntilTerminationMs = 1000;
            this.options.onTranscriptionUpdateEvent.add((e: AsrModule.TranscriptionUpdateEvent) =>
                this.onUpdate(e)
            );
            this.options.onTranscriptionErrorEvent.add((code: AsrModule.AsrStatusCode) =>
                this.onError(code)
            );
        } catch (e) {
            this.available = false;
            print("VoiceInput: ASR module unavailable - device only (" + e + ")");
            return;
        }
        // On-demand transcription (see the class header's lifecycle): the ASR
        // session is started on holdStart and stopped after each command in
        // finishProcessing. We deliberately do NOT warm it at boot — an
        // always-on session streams the mic to cloud ASR continuously, which
        // overheats Spectacles within ~30s of a session.
    }

    private startSession(): void {
        if (!this.available || !this.options || this.sessionActive) {
            return;
        }
        try {
            this.asr.startTranscribing(this.options);
            this.sessionActive = true;
            this.lastError = "";
            print("VoiceInput: ASR session live (hold the mic to talk)");
        } catch (e) {
            print("VoiceInput: startTranscribing failed (device only?): " + e);
        }
    }

    /** Stop streaming the mic to ASR. Called after each command so the mic is
     *  cold between utterances; holdStart restarts it on the next hold. */
    private stopSession(): void {
        if (!this.available || !this.sessionActive) {
            return;
        }
        try {
            this.asr.stopTranscribing();
            print("VoiceInput: ASR session stopped (mic cold)");
        } catch (e) {
            print("VoiceInput: stopTranscribing failed: " + e);
        }
        this.sessionActive = false;
    }

    private onUpdate(e: AsrModule.TranscriptionUpdateEvent): void {
        if (this.updateCount < 12) {
            this.updateCount++;
            print(
                "VoiceInput.update #" + this.updateCount +
                " final=" + e.isFinal +
                ' text="' + (e.text || "") + '"'
            );
        }
        if (!this.capturing && !this.processing) {
            return;
        }
        if (e.text && e.text.trim().length > 0) {
            this.heard = e.text;
        }
        if (this.processing && e.isFinal) {
            this.finishProcessing();
        }
    }

    private onError(code: AsrModule.AsrStatusCode): void {
        let label = "asr error " + code;
        if (code === AsrModule.AsrStatusCode.Unauthenticated) {
            label = "not signed in";
        } else if (code === AsrModule.AsrStatusCode.NoInternet) {
            label = "no internet";
        } else if (code === AsrModule.AsrStatusCode.InternalError) {
            label = "asr internal error";
        }
        this.lastError = label;
        print("VoiceInput ASR error: " + code + " (" + label + ")");
        this.capturing = false;
        this.processing = false;
        this.sessionActive = false; // dead session; holdStart will restart it
    }

    /** True while the mic is held (drives the listening orb). */
    public get isListening(): boolean {
        return this.capturing;
    }

    /** True in the post-release window waiting for the final transcription. */
    public get isProcessing(): boolean {
        return this.processing;
    }

    /** Hold-to-talk: press — open the capture window (session stays warm). */
    public holdStart(): void {
        this.heard = "";
        this.capturing = true;
        this.processing = false;
        if (!this.available) {
            print("VoiceInput: ASR unavailable (test on Spectacles)");
            return;
        }
        // Restart the session if a prior error (or a finalized segment) killed
        // it; otherwise the warm session keeps running.
        if (!this.sessionActive) {
            this.startSession();
        }
    }

    /** Hold-to-talk: release — grace window, then submit (session stays warm). */
    public holdEnd(): void {
        if (!this.capturing) {
            return;
        }
        this.capturing = false;
        this.processing = true;
        const evt = this.createEvent("DelayedCallbackEvent");
        evt.bind(() => this.finishProcessing());
        evt.reset(this.processingGrace);
    }

    public toggleListen(): void {
        if (this.capturing) {
            this.holdEnd();
        } else {
            this.holdStart();
        }
    }

    private finishProcessing(): void {
        if (!this.processing) {
            return; // already handled (final arrived first, or a stale timer)
        }
        this.processing = false;
        // The command has been captured, so stop streaming the mic to cloud
        // ASR. Leaving it warm between commands overheats the device; holdStart
        // restarts the session for the next utterance.
        this.stopSession();
        const command = this.normalize(this.heard);
        this.lastResult = command;
        // @ts-ignore - getTime is a Lens runtime global
        this.resultUntil = getTime() + 2.5;
        this.heard = "";
        if (command.length === 0) {
            print("VoiceInput: nothing heard");
            return;
        }
        print('VoiceInput: heard "' + command + '"');
        if (this.zmHost) {
            this.zmHost.submitCommand(command);
        }
    }

    private normalize(transcription: string): string {
        return (transcription || "")
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * Animated single-line status for the mic label. Empty when idle.
     * Time-driven so callers just poll it each frame.
     */
    public get statusLine(): string {
        // @ts-ignore - getTime is a Lens runtime global
        const t = getTime();
        if (!this.available) {
            return "voice needs Spectacles";
        }
        if (this.lastError.length > 0 && !this.capturing && !this.processing) {
            return "! " + this.lastError;
        }
        if (this.capturing) {
            const dots = ".".repeat(1 + (Math.floor(t * 3) % 3));
            return this.heard.length > 0 ? "> " + this.heard : "[ listening" + dots + " ]";
        }
        if (this.processing) {
            const spin = "|/-\\"[Math.floor(t * 10) % 4];
            return spin + " processing voice command " + spin;
        }
        if (t < this.resultUntil) {
            return this.lastResult.length > 0 ? "heard: " + this.lastResult : "( no speech heard )";
        }
        return "";
    }
}
