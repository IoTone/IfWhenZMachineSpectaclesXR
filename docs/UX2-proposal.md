# IFWhenZMachine — UX2 Proposal: "1983"

Status: PROPOSAL (2026-09-24) · Owner: dkords · Supersedes the visual layer of
[`design-splash-and-menu.md`](design-splash-and-menu.md) (flow and registry stay as designed there).
Style reference: the LENSFEST / SPECS '24 spot, `Promo/lensfest.py` →
`Promo/out/IFWhen_LENSFEST_SPECS24_30s_720p.mp4`.

---

## 1. Why

The promo gave the project a clear visual identity: a green-phosphor terminal and a synthwave
horizon, with chrome titles, a loading screen styled on the Commodore 64 and a room that
"paints in" before going 3D. The shipping Lens has none of that. It shows off-the-shelf kit
buttons (LocalJoost scroll menu, `MyButton` prefab) and plain floating text. Almost every
beat of the video matches something the Lens already does:

| Promo beat | What the Lens does today | UX2 surface |
|---|---|---|
| CRT power-on, phosphor text typing | Splash tunnel → text appears all at once | **Boot sequence** + **Terminal Monitor** |
| ASCII tunnel burst + chrome title | `SplashTunnel.ts` (tunnel + flat title) | **Title drop** |
| Tilted 3D terminal playing Adventure | `ZMachineHost` output/status `Text` at fixed offsets | **Terminal Monitor** |
| Wireframe → AI paint → spatial layers | `RoomIllustrator` pops the finished image in after ~7 s | **Room Viewport** |
| Hold-to-talk orb, meter, narrated reply | `MicHoldToTalk` + `Narrator` (functional, plain) | **Voice Orb** |
| C64 `LOAD "LIBRARY",8,1` story list | `GameLibraryMenu` (button column + detail text) | **Cassette Library** |
| End card, CRT power-off | Nothing (quit just stops) | **Power-off / return to library** |

The goal: make the Lens *feel* like the video without harming the three things that already
work (the interpreter, the grammar-guided command menu, the illustration pipeline) or the thermal
headroom that the ASR/mic fix (`5b1fa47`) won back.

## 2. Spectacles reality check (read before designing anything)

The video is a 2D screen, but Spectacles is an **additive, see-through display**, and that changes
the translation:

1. **Black is transparent.** Each pixel adds light to the real room. The video's dark purple sky,
   black CRT glass and black panel backgrounds become invisible. **The room is the background.**
   What survives is light: neon strokes, glowing text, the sun, grid lines. That works in our
   favour, because the synthwave look is mostly emissive lines.
2. **No full-screen post-processing.** Bloom, RGB split, scanlines and barrel distortion ran as a
   full-frame pass in the promo. On-device that costs GPU and heat, and a head-locked full-FOV
   effect is uncomfortable. Put the effect **inside materials instead**: scanlines and rim glow in
   the panel shader, glow as a baked halo in the text/texture, and glitch only as a short
   per-panel vertex/UV jitter.
3. **Legibility beats nostalgia.** The phosphor green `#3CFF78` reads well additively; the
   Commodore-blue background from the video would read as a faint violet haze. Keep type in
   JetBrains Mono (already bundled). Don't set body text below the current in-game size.
4. **World-locked, not head-locked.** Keep today's rig model: the game rig parks in front of the
   user (`rigDistance`) and stays put. The horizon "stage" is optional ambience and never follows
   the head.
5. **Thermals and battery.** Every always-on animation is a cost. Anything that animates
   continuously (the grid scroll, star twinkle, the tunnel) must either stop once idle or be
   cheap enough to measure as noise. The budgets in §6 are targets to measure, not measured numbers.

## 3. Visual language

### 3.1 Colour tokens (`Theme.ts`)

| Token | Hex | Use |
|---|---|---|
| `phosphor` | `#3CFF78` | Game text, prompt, cursor, command echo |
| `amber` | `#FFB000` | Narration, system notices, "AI ART" stage |
| `cyan` | `#22F0FF` | Labels, wireframe, depth scan, interactive affordance |
| `magenta` | `#FF2BD6` | Grid, frame rims, active/held state |
| `pink` | `#FF6EC7` | Neon script, highlights |
| `sunTop → sunBot` | `#FFE250 → #FF2896` | Sun gradient, chrome sunset band |
| `c64Text` | `#AAA0F0` | Cassette Library rows (a light lilac; the dark C64 blue is dropped, see §2.1) |

A single `Theme.ts` module exports these as `vec4`s, so no script hard-codes colours again. The
scripts hard-code them today.

### 3.2 Type

- **JetBrains Mono** for everything the game or the player "types". Its monospace grid is what
  sells the terminal, and it's already bundled with its OFL notice.
- **Chrome headline** for the handful of display words (`IFWHEN`, library title, feature toasts).
  Runtime chrome needs a gradient, so implement it in the existing `text_3d.ss_graph` as a
  vertical 5-stop gradient (sky → horizon line → sunset) plus an emissive rim. That keeps it a
  material on a Text/Text3D, not a baked PNG per word.
- **Neon** is a text material with an emissive core and a soft halo. Use it for labels like
  `WIREFRAME`, `NARRATED ALOUD` and `LISTENING…`.

### 3.3 Motion rules

- **Text is typed, never popped.** Game output reveals at about 110 characters/second (the promo
  used 75–110). Player commands show at typing speed. A tap on the Monitor or any new command
  skips to the end, so the reveal never slows play.
- **State changes cut, with a short glitch.** A panel UV/vertex jitter plus a brief RGB offset for
  about 150 ms on: splash→library, library→game, game→library, and a new room arriving. Nowhere
  else.
- **Things arrive with a slight overshoot.** Titles and panels use the promo's `back_out` easing
  (k≈1.7, 350–450 ms).
- **Idle means still.** Once text has finished typing and nothing is loading, the only motion is
  the blinking cursor (about 2.2 Hz).

### 3.4 Sound language

Short, dry, 1983-style cues, generated the same way the promo's `sfx` were (the synth code in
`lensfest.py` can export them as WAVs):

| Cue | When |
|---|---|
| `key_click` | Each character of a player command as it echoes (quiet, varied pitch) |
| `blip_row` | Library row prints / highlight moves |
| `zap_cut` | A state-change glitch |
| `crt_on` / `crt_off` | Boot / quit to library |
| `paint_tick` | Soft tick per ~10 scanlines during the room paint-in |

Narration (R8) always wins: when TTS plays, ducking drops cues to about −8 dB. There's also a
"Sound FX" toggle next to "Narrate".

## 4. Surfaces

### 4.1 Boot sequence (extends `SplashTunnel.ts`)

1. **Power-on (0–0.35 s):** a horizontal phosphor line expands to the panel height. This covers
   the engine warm-up that the splash already hides.
2. **Cold open (≈1.5 s):** the Monitor types one line of real opening text from the most recently
   played game, or Adventure's `At End Of Road` on first run. It's a quiet reminder that the
   world is made of words.
3. **Tunnel drop:** on a `zap_cut`, the existing ASCII ring tunnel bursts outward (keep
   `RING_CHARS`) and fades out over about 1 s. Chrome `IFWHEN` lands with `back_out`, then neon
   `Z · MACHINE` slides in. The version line stays as-is.
4. Hand off to the Cassette Library through the existing `flyThrough()`.

Keep the existing constraint: minimum splash time plus engine-ready gating (`AppFlow`).

### 4.2 Horizon stage (new, optional ambience)

A low-poly stage anchored **on the floor about 2 m beyond the rig**: magenta perspective grid,
two cyan/violet wireframe mountain ridges, and a slatted sun sitting on the horizon. It's all
emissive lines and a few triangles, with no textures beyond the sun gradient.

- The grid scrolls only during transitions (like the promo's title drop) and during generation
  (as a "working" indicator). It's static otherwise.
- The **"Stage" setting** has three values: *Full* (grid + sun + ridges), *Sun only*, and *Off*.
  The default is *Sun only*: the sun gives the brand moment, and the grid is the most expensive
  and busiest element when you're sitting in a real room.
- Floor placement uses the Spectacles world/ground estimate if it's available, or else a fixed
  offset below the rig. Placement is an open question; see §8.

### 4.3 Cassette Library (replaces the `GameLibraryMenu` visuals, keeps `games/registry.ts`)

One panel, modelled on the promo's C64 screen but on transparent glass:

```
**** IFWHEN Z-MACHINE  V0.2 ****

10 CLASSIC STORIES. FREE. BUILT IN.

READY.
LOAD "LIBRARY",8,1
 1  LOST PIG                  2007
 2  ADVENTURE                 1976
▌3  THE DREAMHOLD             2004▐   ← highlight bar (filled c64Text, text knocked out)
 4  CHRISTMINSTER             1995
 …
```

- **On open**, `LOAD` types itself, then rows print one by one (about 75 ms each, with
  `blip_row`). This plays the first time only; afterwards the list opens straight away.
- **Selection:** the highlight bar is the only interactive element. Pinch-drag on the panel
  scrolls it, a tap selects a row, and a second tap (or the `[ ▶ PLAY ]` / `[ ⟳ RESUME ]` chips)
  launches. One interactable instead of eleven buttons means less SIK overhead and less clutter.
- **Detail "inlay card"** beside the panel: title in chrome, author · year · rating, the blurb,
  and the **attribution line** (a release requirement in `GAMES-LICENSES.md`). If the game has
  been played, the cover art is the cached first-room illustration (`ill-<gameKey>-<room>`).
  Otherwise it's a wireframe placeholder in the Room Viewport style.
- **Voice** still works: "play lost pig", "resume". Routing stays in `AppFlow`.
- Mini-Zork stays out of public builds, as `GAMES-LICENSES.md` already requires.

### 4.4 Terminal Monitor (restyles `ZMachineHost` output + status)

The promo's tilted terminal, as the main reading surface:

- It's a **CRT panel material**: transparent glass (black, so it's see-through), a 3 px magenta
  rounded rim with glow, faint scanlines (every third row at about 70%), and a slight
  pincushion only on the rim, never on the text.
- It sits yawed 8–10° toward the user, like the promo, with a small idle float (±0.5 cm, slow).
  The float can be switched off.
- **Status line** is a top strip inside the rim: room name (left), score/turns (right), in
  `cyan`. The multi-line upper windows routed to the status HUD (`969d25d`) stay there.
- **Typed reveal** (§3.3), with a blinking block cursor at the prompt.
- **Scrollback:** the last N lines stay visible and older lines dim by age (spatial history is a
  README design goal). A pinch-drag scrolls back.

### 4.5 Command chips (restyles `ScrollButtonDataLoader` / `ActionsPanel`, same grammar logic)

> **Superseded (2026-09-25) by the Command Deck in §11.** Restyling the SIK button list as neon
> chips doesn't fix its real problems: one long flat list that's hard to scroll and mixes game
> commands with settings. Kept below for history.

The grammar-guided builder is one of the strongest pieces of the Lens, so only its presentation
changes:

- Buttons become **neon chips**: a mono label, a cyan outline, a magenta fill when armed.
- The armed-verb preview (`take ___`) renders **inside the Monitor at the prompt**, typed, rather
  than in a separate header. You watch your command being built exactly where the game will
  answer.
- On submit, the chip text "flies" to the prompt and echoes with `key_click`s.
- Grouping is unchanged (nouns / verbs / compass / meta). Compass chips get a small arrow glyph
  drawn as geometry, because JetBrains Mono lacks some arrow glyphs (the promo hit this with ►).

### 4.6 Room Viewport (restyles `RoomIllustrator` display; the pipeline is unchanged)

The promo's three stages turn the real generation latency (Gemini image ≈7 s, spatialization
≈5 s more, measured 2026-09-22 in Preview) into a show instead of a wait:

| Stage | Trigger | Visual | Label |
|---|---|---|---|
| **WIREFRAME** | Room change / generation starts (`onSceneLoadStart`) | A procedural cyan wire sketch draws itself: horizon line, a ground ellipse, and 3–6 primitive shapes chosen from the room's noun list (e.g. `grate` → a grid quad, `tree` → a triangle, `door` → a rectangle). A generic grid is the fallback. It loops slowly until the image arrives. | `WIREFRAME` (cyan) |
| **AI ART** | Image decoded (`display()`) | A top-to-bottom **scanline paint-in** of the real image over ~1 s, with an ordered-dither edge (a 4×4 Bayer matrix in the shader). The wire fades to about 25% on top. | `AI ART` (amber) |
| **SPATIAL IMAGE · 3D** | Spatial frame `onLoaded` | Swap to the Spatial Image mesh while a cyan depth-scan line sweeps once. The flat image stays as the backstop, as it does today. | `SPATIAL IMAGE · 3D` (cyan) |

- Under the viewport, a mono caption types the first sentence of the room description (the
  promo's `Outside Grate: You are in a 20-foot depression…`).
- A cached room skips WIREFRAME and does a quick 300 ms paint-in, so revisits stay instant.
- Offline or failed generation settles on the wireframe with the label `TEXT ONLY`. That's more
  honest than today's empty slot, and it still looks intentional.
- The existing `SceneLoadingIndicator` hooks (`onSceneLoadStart` / `onImageShown` /
  `onImageUnavailable`) are exactly the stage transitions, so no new plumbing is needed.

### 4.7 Voice Orb (restyles `MicHoldToTalk` + `Narrator` feedback)

- **Idle:** a violet orb with a white mic glyph, labelled `HOLD TO TALK`.
- **Held/listening:** the orb turns magenta and three pink rings ripple outward. The label reads
  `LISTENING…` and ASR interim words type into the Monitor prompt as they arrive (the promo
  streamed words in the same way).
- **Level meter:** a 24-bar LED meter (cyan → amber → magenta), shown only while held. Where the
  level comes from is an open question (§8), because we must not reopen a continuous mic session.
- **Narration:** an amber speaker glyph with arcs plus `NARRATED ALOUD` beside the Monitor while
  TTS plays, with the same meter driven by the TTS audio envelope if we can read it cheaply.
- The **retro narrator voice** in the promo (macOS "Fred") isn't available on-device. The R8 voice
  choice stays with Snap's TTS voices.

### 4.8 Quit / back to library

A CRT power-off (collapse to a line, then a dot, about 450 ms, with `crt_off`), then the Cassette
Library opens straight to the list (no `LOAD` replay). The engine autosaves before the effect
(R14), so the effect never hides an unsaved state.

## 5. Component plan

| Script / asset | Change | Notes |
|---|---|---|
| `Theme.ts` | **new** | Colour tokens, timing constants (`typeCps`, `glitchMs`, easing). |
| `Materials/CrtPanel.ss_graph` | **new** | Transparent glass, rim glow, scanlines, glitch jitter parameter. Used by Monitor, Library, Viewport frame. |
| `text_3d.ss_graph` | extend | Add chrome-gradient and neon-halo variants. |
| `SplashTunnel.ts` | extend | Power-on, cold-open line, chrome/neon title drop. |
| `HorizonStage.ts` + meshes | **new** | Grid, ridges and sun; `Stage` setting; scrolls only in transitions/generation. |
| `GameLibraryMenu.ts` | rewrite view | Cassette panel, highlight-bar selection, inlay card. Registry untouched. |
| `ZMachineHost.ts` | small | Emits text to a `TypedReveal` instead of setting `Text.text` directly. |
| `TypedReveal.ts` | **new** | Char-rate reveal with skip-on-tap; drives `key_click` for echoed commands. |
| `ScrollButtonDataLoader.ts` / `ActionsPanel.ts` | restyle | Neon chips; armed-verb preview moves into the Monitor prompt. |
| `RoomIllustrator.ts` | small | Emits stage events; the viewport owns the visuals. |
| `RoomViewport.ts` | **new** | Wireframe sketcher (noun → primitive table), paint-in shader, stage labels, caption. |
| `MicHoldToTalk.ts` / `Narrator.ts` | restyle | Orb states, meter, `NARRATED ALOUD` badge. |
| `Sfx.ts` + `Audio/sfx/*.wav` | **new** | Cue bank and ducking under TTS; WAVs exported from the promo synth. |
| Settings | extend | `Stage` (Full / Sun / Off), `Sound FX`, `Effects` (Full / Reduced, see §7). |

## 6. Performance and comfort budget

These are targets to **measure on device** with the Lens Studio profiler and a 20-minute play
soak on Spectacles. None of them are measured numbers.

- Idle play (text typed, nothing loading) should have **no per-frame script work** beyond the
  cursor blink. No continuously scrolling grid, no per-frame text rebuild.
- The tunnel keeps its existing 10–12 fps throttle and runs only during boot.
- Shader effects must be cheap enough to leave on everywhere: a scanline multiply and rim glow on
  a few panels.
- Draw calls: the Library goes from 11+ button prefabs to a single panel, and command chips stay
  pooled as they are today.
- **Thermal regression gate:** the 20-minute soak must stay at or below the post-`5b1fa47`
  baseline. Note the baseline before starting phase 1.

## 7. Accessibility and comfort

- An **Effects: Reduced** setting turns off the glitch cuts, the float, the typed reveal (text
  appears instantly) and the horizon scroll, and keeps colour and type.
- Contrast: body text is always `phosphor` or white. Magenta and pink are used only for rims and
  state, never for text the player must read.
- Narration (R8) and voice input (R9) stay first-class, and every surface is operable by voice or
  by pinch.
- No flashing above 3 Hz. The only flash is the single title-drop flash, and it's skipped under
  Reduced.

## 8. Open questions

1. **Mic level for the meter.** ASR doesn't expose amplitude. Options: (a) animate from interim
   transcription events (free, less literal); (b) a mic level tap only while the orb is held
   (must be closed on release, see `5b1fa47`). Recommendation: start with (a).
2. **Horizon placement.** Ground-plane estimate versus a fixed offset below the rig. Also, does the
   stage get in the way in small rooms? Needs a real-room playtest; *Sun only* as the default
   hedges this.
3. **Wireframe sketcher vocabulary.** How many noun → primitive mappings are worth hand-authoring?
   Proposal: about 20 common nouns (door, grate, tree, table, window, stairs, box, lamp…) plus
   the fallback grid.
4. **Cold-open line source.** Needs the last-played game's first output cached at quit time.
   Small, but it touches autosave (R14).
5. **Chrome in `text_3d.ss_graph` vs. baked textures** for the few fixed display words. Baking is
   simpler and cheaper but can't localize. Proposal: shader first; bake if the gradient doesn't
   hold up on device.

## 9. Phasing

Each phase ships on its own and is playtested on device before the next starts.

1. **Foundation:** `Theme.ts`, `CrtPanel` material, `TypedReveal`, Terminal Monitor restyle, and
   the Reduced setting. *Biggest felt change; lowest risk.*
2. **Cassette Library:** panel, highlight bar, inlay card with attribution.
3. **Room Viewport:** stage events, wireframe sketcher, paint-in shader, captions.
4. **Voice Orb and sound:** orb states, meter (option a), `Sfx.ts`, ducking under TTS.
5. **Boot and Horizon:** power-on, title drop, horizon stage with the `Stage` setting, and the
   quit power-off.

## 10. Reference frames

Render stills from the promo at any timestamp to use as mock-ups:

```
cd Promo && PREVIEW=2,4.6,10.5,13.9,15.2,18.8,22.6,25 uv run --with pillow --with numpy lensfest.py
# -> Promo/build/lensfest/preview_<t>.png
```

| t (s) | Shows |
|---|---|
| 2.0 | Boot / phosphor cold open |
| 4.6 | Tunnel drop + chrome title |
| 10.5 | Terminal Monitor |
| 13.9 / 15.2 | Room Viewport: AI ART paint-in / SPATIAL |
| 18.8 | Voice Orb + narration badge |
| 22.6 | Cassette Library |
| 25.0 | End card (brand reference) |

Remember §2 when reading these: the stills show the look on a black screen. On glass, every dark
area in them is the room.

## 11. Addendum (2026-09-25): Scrollback and the Command Deck

Phases 1–3 and the Cassette Library are built. Two problems remain, and both come down to text
that doesn't fit its box:

1. **Long output is lost.** The transcript keeps only its last `maxLines` (16) lines. A long intro
   or room description scrolls its beginning away before you can read it, and there's no way back.
2. **"Choose an action" is the last stock-SIK surface, and it's hard to use.** It's one flat
   scroll list of ~29 buttons: room/inventory nouns, ten fixed verbs, twelve compass
   directions, then settings (Narrate, Effects, Immersive, Save, New Game, Library) mixed in with
   the game commands. It's slow to scroll, hard to scan, and suggests verbs the story may not
   understand.

The answer to both is one shared piece, a **CRT list with scrolling** (§11.1). The transcript
(§11.2) and a new **Command Deck** (§11.3) are built on it, in the Cassette Library's style: mono
lilac/phosphor text on the warped grid, an inverse-video highlight bar, a bezel, and glitches.

### 11.1 `CrtList`: the shared scroll component

Extracted from what the Cassette Library already does, so there's one implementation:

- **Windowing:** a fixed pool of *N* Text rows (e.g. 12–16) shows lines `offset .. offset+N`
  of any length of content. Rows are reused, never created per line, so a 400-line history
  costs the same to draw as 16 lines.
- **One touch surface** (collider + Interactable) over the rows, as in the Cassette:
  - hover moves the highlight bar (for lists that select);
  - **pinch-drag scrolls**: vertical hand travel maps to lines, with a little momentum;
  - a pinch without drag is a tap: select or activate.
- **Gutter:** a one-column scrollbar drawn as text on the right edge: `▲`, a `█` thumb sized to
  the visible fraction on a `│` track, `▼`. Tapping ▲/▼ pages. It's only drawn when content
  overflows.
- **Follow mode:** sticks to the bottom as content arrives. If you scroll up, it stays put and
  shows a blinking `▼ MORE` in the gutter until you return to the bottom.
- **Look:** the same warp (per-row scale), bezel and glitch hooks as the Cassette; Effects:
  Reduced turns off momentum and glitches.
- **Cost:** per-frame work only while dragging or animating. Idle is one flag check.

Retrofit: the Cassette Library moves onto `CrtList` (11 stories fit today; the library can now
grow past one screen).

### 11.2 Transcript scrollback and `— MORE —` paging

- **History:** ZMachineHost keeps a rolling transcript history (e.g. the last 400 wrapped lines)
  instead of truncating to 16. The Terminal Monitor shows it through `CrtList` (display-only rows;
  no highlight bar).
- **Scroll back:** pinch-drag on the monitor glass, or tap the gutter's ▲. A new turn snaps back to
  the bottom only if you were already there. Otherwise `▼ MORE` blinks and you catch up when
  ready.
- **`— MORE —` paging:** when one turn's output is taller than the screen, the typed reveal
  (`TypedReveal`) pauses at the page boundary and shows a reverse-video `— MORE —` line, the way
  1983 terminals did. Tap the monitor, pinch, or say "more" to continue. Effects: Reduced and
  "skip" (any command) still flush everything at once.
- **Narration is unaffected:** TTS already receives whole turns; paging is display-only.

### 11.3 The Command Deck (replaces "Choose an action")

A CRT control panel at the current lectern position (below and between the Monitor and the
Viewport, tilted up toward the eyes; the world-locked placement already works ergonomically).
It's a **text tree** of what you can type or say, in two trunks:

```
┌─────────────────────────────────────┐
│ > TAKE ▒                        ⌫ ⏎ │  <- command line (also typed at the Monitor prompt)
│                                     │
│ GAME                                │
│  ├ GO ▸     N  S  E  W  UP  DOWN ... │  <- directions: one dense row, not 12 buttons
│  ├ LOOK   INVENTORY   WAIT   AGAIN  │  <- no-object verbs submit immediately
│  ├ TAKE ▾                           │  <- expanded: objects for this verb
│  │   ├ LEAFLET        (here)        │
│  │   └ SMALL MAILBOX  (here)        │
│  ├ DROP ▸      (only when carrying) │
│  ├ OPEN ▸  CLOSE ▸  READ ▸  PUT ▸   │
│  ├ EXAMINE ▸                        │
│  └ MORE VERBS ▸  (story dictionary) │
│ RECENT  > open mailbox  > north     │  <- last 3 commands, one tap to repeat
│ SYSTEM                              │
│  ├ SAVE   RESTORE   UNDO            │
│  ├ NARRATE: ON  EFFECTS: FULL       │
│  ├ IMMERSIVE: ON                    │
│  └ NEW GAME   LIBRARY               │
└─────────────────────────────────────┘
```

**Navigation (all on `CrtList`):**
- Hover moves the inverse bar. Pinch on a `▸` branch expands it in place (`▾`) and collapses the
  previous one, so at most one branch is open and the list stays short.
- Picking a transitive verb types it onto the **command line** (`> TAKE ▒`). Picking an object
  completes it and submits (`> TAKE LEAFLET`), keeping the current grammar-guided behaviour. `⌫`
  backs up a word; `⏎` submits a command you composed yourself (e.g. `PUT` + object + `IN` +
  object).
- The command line is mirrored at the Monitor prompt, as the proposal's §4.5 intended. You watch
  the command form where the game answers, and it echoes with the typed reveal.
- The whole tree scrolls when expanded branches overflow, and the gutter shows where you are.

**What makes entries "valid" (the part that never worked well):**
1. **Objects** come from the live scene context, as today: room objects under verbs that act on
   the world, carried objects under DROP/PUT/GIVE, tagged `(here)` / `(carried)`. Verbs with
   nothing to act on are dimmed or hidden (no DROP with empty hands).
2. **Verbs** come from the **story's own dictionary.** Every Z-machine story ships a dictionary of
   every word its parser accepts, and the header already gives us its address
   (`dictionaryAddress` in `ZMachine.parseHeader`). Words flagged as verbs, minus the common set
   shown on the top level, become `MORE VERBS ▸`. So the tree offers only words *this* story
   understands (Adventure's `XYZZY`, 9:05's `SHOWER`), instead of a guessed list. The top-level
   verbs are also filtered through the dictionary, so a story without `READ` won't offer it.
3. **Directions:** all twelve on one row; any the current room's description names first are
   shown brighter. That's cheap to do from the room text; true exit detection isn't possible in
   general Z-code.
4. **RECENT:** the last three submitted commands, one tap to repeat (a lot of IF is `AGAIN` and
   small variations).

**Voice:** the deck doubles as the cheat sheet for what you can say. While the mic is held, the
command line shows the live transcription, and a spoken command that matches a tree path lights
it briefly on submit, so players learn the vocabulary from the tree.

**System vs game:** the SYSTEM trunk holds everything that isn't a story command. Settings live
here instead of among the verbs. SAVE/RESTORE/UNDO go to the interpreter as today.

### 11.4 Build steps

Each step is compiled, run in Preview and checked on device before the next, as in phases 1–3.

| Step | What | Retires |
|---|---|---|
| **6A** | `CrtList.ts`: pooled rows, warp, highlight bar, drag-scroll with momentum, text gutter, follow mode. Cassette Library moves onto it. | Cassette's bespoke list code |
| **6B** | Transcript history + scrollback on the Terminal Monitor; `— MORE —` paging in `TypedReveal`. | 16-line truncation |
| **6C** | **Dictionary reader** in tszm (`host-core`): list words and verb flags for the loaded story. Verify the flag layout on all 11 library stories with `tszm/test/validate-library.js` before any UI depends on it. | — |
| **6D** | Command Deck v1: bezel panel at the lectern, command line, GAME/SYSTEM trunks, one-open-branch expansion, objects from scene context, RECENT. | SIK "Choose an action" scroll menu, QuickButtons "Clear" (becomes `⌫`) |
| **6E** | Dictionary-filtered verbs + `MORE VERBS ▸`, direction hints from room text, voice path lighting. | Hard-coded `VERBS` list |

### 11.5 Open questions

1. **Deck placement:** keep the lectern (below, tilted up), or a vertical side panel? The lectern
   suits "control panel" and keeps the Monitor/Viewport pair clear. Recommendation: lectern.
2. **Drag vs. buttons for scrolling:** SIK pinch-drag on a collider should work on device, but
   needs a real-hand test. The gutter ▲/▼ tap targets are the fallback if drag feels poor.
3. **Dictionary verb flags:** Inform 6 and Infocom stories mark verbs differently in the
   dictionary's data bytes, and some games under-flag. 6C's validation decides whether
   `MORE VERBS` is filtered by flag, or shows all dictionary words minus nouns already known from
   the object tree.
4. **How many rows** the deck shows before scrolling: 14 looks right at the Cassette's text size,
   to be tuned on device.
