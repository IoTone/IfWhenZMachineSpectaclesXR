/**
 * UX2 "1983" design tokens (docs/UX2-proposal.md §3). One place for the
 * palette and motion constants so scripts stop hard-coding colours.
 *
 * Spectacles is additive: black is transparent, so every token here is a
 * light colour meant to glow against the room, never a background fill.
 */
function rgb(hex: number, a: number = 1.0): vec4 {
    return new vec4(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255, a);
}

export const Theme = {
    /** Game text, prompt, cursor, command echo. */
    phosphor: rgb(0x3cff78),
    /** Narration, system notices, the "AI ART" stage. */
    amber: rgb(0xffb000),
    /** Labels, wireframe, depth scan, interactive affordances. */
    cyan: rgb(0x22f0ff),
    /** Grid, frame rims, active/held state. Never for body text. */
    magenta: rgb(0xff2bd6),
    pink: rgb(0xff6ec7),
    sunTop: rgb(0xffe250),
    sunBottom: rgb(0xff2896),
    /** Cassette Library rows. */
    c64Text: rgb(0xaaa0f0),

    /** Typed reveal speeds, characters per second. */
    outputCps: 110,
    echoCps: 40,
    /** Cursor blink rate (Hz) and glyph. */
    cursorHz: 2.2,
    cursorGlyph: "█",
    /** State-change glitch cut length (seconds). */
    glitchSeconds: 0.15,
};
