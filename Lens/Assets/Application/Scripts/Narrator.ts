import { ZMachineHost } from "./ZMachineHost";

/**
 * Narrates the game: each completed turn's text is synthesized with Lens
 * Studio's Text-To-Speech and played back (R8). Toggle with toggle() — wired
 * to the "Narrate" menu button.
 *
 * Notes:
 *  - TTS synthesis needs connectivity (Snap voice service).
 *  - A new turn interrupts any narration still playing.
 */
@component
export class Narrator extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    /** Start with narration enabled. */
    @input
    autoNarrate: boolean = true;

    /** Longest text (chars) sent to TTS per turn; longer text is truncated. */
    @input
    maxChars: number = 400;

    // @ts-ignore - require is provided by the Lens runtime
    private tts: TextToSpeechModule = require("LensStudio:TextToSpeechModule");
    private audio: AudioComponent;
    private narrating: boolean = true;

    onAwake() {
        this.narrating = this.autoNarrate;
        this.audio = this.getSceneObject().createComponent("Component.AudioComponent") as AudioComponent;
        this.createEvent("OnStartEvent").bind(() => {
            if (this.zmHost) {
                this.zmHost.setNarrationListener((text) => this.onTurnText(text));
            }
            print("Narrator: ready (narration " + (this.narrating ? "on" : "off") + ")");
        });
    }

    /** UI entry point: toggle narration; returns the new state. */
    public toggle(): boolean {
        this.narrating = !this.narrating;
        if (!this.narrating) {
            this.stopPlayback();
        }
        print("Narrator: narration " + (this.narrating ? "on" : "off"));
        return this.narrating;
    }

    public get isOn(): boolean {
        return this.narrating;
    }

    private onTurnText(text: string): void {
        if (!this.narrating) {
            return;
        }
        let clean = text.trim();
        if (clean.length === 0) {
            return;
        }
        if (clean.length > this.maxChars) {
            // Truncate at a sentence boundary where possible.
            const cut = clean.lastIndexOf(".", this.maxChars);
            clean = clean.slice(0, cut > this.maxChars / 2 ? cut + 1 : this.maxChars);
        }
        this.speak(clean);
    }

    private stopPlayback(): void {
        try {
            if (this.audio.isPlaying()) {
                this.audio.stop(false);
            }
        } catch (e) {
            // nothing playing
        }
    }

    private speak(text: string): void {
        this.stopPlayback();
        try {
            // @ts-ignore - TextToSpeech is a Lens runtime global
            const options = TextToSpeech.Options.create();
            this.tts.synthesize(
                text,
                options,
                (audioTrack: AudioTrackAsset) => {
                    this.audio.audioTrack = audioTrack;
                    this.audio.play(1);
                },
                (error: any, description: string) => {
                    print("Narrator TTS error: " + error + " - " + description);
                }
            );
        } catch (e) {
            print("Narrator: synthesize failed: " + e);
        }
    }
}
