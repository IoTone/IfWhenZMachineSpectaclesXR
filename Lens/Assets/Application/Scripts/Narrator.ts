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

    /**
     * Longest text (chars) sent to TTS per turn; longer text is truncated at
     * a sentence boundary. Keep under ~300: the TTS response is capped at
     * 4MB (gRPC RESOURCE_EXHAUSTED beyond that).
     */
    @input
    maxChars: number = 280;

    /** TTS voice. Lens Studio ships "Sasha" and "Sam" (English). */
    @input
    @widget(new ComboBoxWidget([new ComboBoxItem("Sasha", "Sasha"), new ComboBoxItem("Sam", "Sam")]))
    voiceName: string = "Sasha";

    /** Speaking pace in percent (75 = slower, 125 = faster). */
    @input
    voicePace: number = 100;

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

    /**
     * Remove terminal/meta characters that should never be spoken: the input
     * prompt (">"), bracketed annotations ("[Game over]", "[Interpreter
     * error...]"), and stray list/emphasis glyphs.
     */
    private cleanForSpeech(text: string): string {
        return text
            .replace(/\[[^\]]*\]/g, " ") // bracketed metadata
            .replace(/[>*_|#]/g, " ") // prompt and markup glyphs
            // Legal/version boilerplate (game banners): keep the title and the
            // opening scene, silently drop copyright/trademark/serial lines.
            .replace(/Copyright\s*(\(c\)|©)?[^.]*\.\s*/gi, " ")
            .replace(/All rights reserved\.?/gi, " ")
            .replace(/\b[\w'-]+ is a registered trademark[^.]*\.\s*/gi, " ")
            .replace(/Interactive fiction[^.]*\.\s*/gi, " ")
            .replace(/Release\s+\d+\s*\/\s*Serial number\s+\d+/gi, " ")
            .replace(/Version\s+\d[^ ]*/gi, " ")
            // Line breaks become sentence pauses: end each line with a period
            // (unless it already has terminal punctuation) so the TTS voice
            // breathes naturally between lines.
            .split(/\n+/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => (/[.!?:,]$/.test(line) ? line : line + "."))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
    }

    private onTurnText(text: string): void {
        if (!this.narrating) {
            return;
        }
        let clean = this.cleanForSpeech(text);
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
            try {
                // voicePace is not in the TS type defs but is honored at runtime
                const opts = options as any;
                opts.voiceName = this.voiceName;
                opts.voicePace = this.voicePace;
            } catch (e) {
                // older runtime without these options - default voice
            }
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
