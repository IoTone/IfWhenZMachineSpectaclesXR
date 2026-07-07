# IFWhenZMachine — Splash & Main Menu Design

Status: DRAFT (2026-07-08) · Owner: dkords · Implements: R12 (game library), plus the
first-launch splash/perf TODO.

---

## 1. Game library — starter catalog (10 titles)

Selection criteria: Z-machine format only (.z3/.z5/.z8 — no Glulx, our engine is
Z-code), G→PG-13 content, freely redistributable per the IF Archive index terms,
and *playable with our button/voice UI* (forgiving parsers, standard verbs).

| # | Title | Author / Year | Fmt | Rating | License / distribution | Why it fits |
|---|-------|---------------|-----|--------|------------------------|-------------|
| 1 | Adventure (Colossal Cave, 350 pt) | Crowther & Woods, Inform port G. Nelson | .z5 | G | Original is public domain; Inform port freely distributable | The ur-game; already verified running in our engine |
| 2 | Lost Pig | Admiral Jota, 2007 | .z8 | G | Freeware, freely redistributable | Beloved, funny, simple verbs, very forgiving — ideal first pick for new players |
| 3 | The Dreamhold | Andrew Plotkin, 2004 | .z8 | PG | Freeware, freely redistributable | Built-in tutorial voice; explicitly designed for IF newcomers |
| 4 | Bronze | Emily Short, 2006 | .z8 | PG | Creative Commons (verify exact CC variant before ship) | Beauty-and-the-Beast retelling; adaptive hints, compass-heavy = great for our menu |
| 5 | Suveh Nux | David Fisher, 2007 | .z5 | G | Freeware, freely redistributable | Tiny vocabulary magic-word puzzle box — perfect fit for button-driven play |
| 6 | 9:05 | Adam Cadre, 2000 | .z5 | PG-13 | Freeware, freely redistributable | 10-minute intro-sized story with a famous twist; great demo piece |
| 7 | Photopia | Adam Cadre, 1998 | .z5 | PG-13 (mature themes, tasteful) | Freeware, freely redistributable | Landmark narrative IF; minimal puzzles = low parser friction |
| 8 | Spider and Web | Andrew Plotkin, 1998 | .z5 | PG-13 | Freeware, freely redistributable | Spy thriller; showcase for illustration pipeline (interrogation room, tunnels) |
| 9 | Violet | Jeremy Freese, 2008 | .z5 | PG-13 (mild innuendo) | Freeware, freely redistributable | One-room game — the illustrator only needs one great image; strong writing |
| 10 | Slouching Towards Bedlam | Foster & Ravipinto, 2003 | .z5 | PG-13 | Freeware, freely redistributable | Steampunk mystery, multiple endings; save/restore showcase |

Alternates (if any of the above fails license verification or play-testing):
*Balances* (Nelson, G), *Winter Wonderland* (Laura Knauth, G), *All Things Devours*
(half sick of shadows, PG), *Metamorphoses* (Emily Short, PG).

**License caveats (do before shipping):**
- "Freely redistributable" on the IF Archive is NOT an open-source license. Ship game
  files as *content* with per-game attribution + original notices, NOT under the
  repo's code license. Add a `GAMES-LICENSES.md` with each game's terms verbatim.
- **Mini-Zork I (currently bundled) is Infocom/Activision property** — historically
  distributed free (magazine cassette) but with no formal license. Keep for dev, but
  either get comfortable with its status or swap it out of the public release.
  Zork I/II/III were officially free-download at times but were never open-licensed.
- Bronze: verify the exact CC variant (NC clauses matter if the Lens is ever monetized).

**Size budget:** .z3/.z5 ≤ 256 KB, .z8 ≤ 512 KB; base64 adds ~33%. Ten games ≈ 2–4 MB
of embedded JS modules — fine for a Lens, but embed lazily: one `games/<Title>.js`
module per game, `require`d only when selected (LS packager includes all literals in
the bundle, but decode-to-Uint8Array cost is paid per launch, not at boot).

---

## 2. Flow

```
Lens start
   └─ SPLASH (immediately, first frame — covers engine warmup)
        ├─ ascii tunnel animation + title/tagline
        ├─ background: defer Z-engine require + game registry init ~2 frames
        └─ auto-advance after min 2.5 s AND engine ready  → MENU
   └─ MENU (game library)
        ├─ game card selected → CONFIRM ("Play / Resume / New")
        └─ launch → GAME (existing IFThen rig)
   └─ GAME
        └─ meta button "Library" (replaces bare "New Game") → back to MENU
```

State machine lives in a new `AppFlow.ts` component; ZMachineHost stops auto-starting
(`autoStart=false` input) and gains `launchGameById(id)`; the IFThen rig, menu rig and
splash rig are three sibling scene objects toggled by AppFlow.

## 3. Splash — "ascii tunnel"

Look: classic ASCII tunnel animation (à la asciiart.eu/animations/ascii-tunnel):
concentric rectangular rings of characters rushing outward, monospace, terminal-green
on black, with the title fading in over it.

Copy (exact):
> **IFWhenZMachine**
> An interactive fiction adventure for visual text experiences.
> Based on tszm / tszm-tscdn concepts.

Implementation (`SplashTunnel.ts`, no assets needed):
- One Text component, **monospace font** (bundle a mono .ttf — LS default font is
  proportional and will shear the art), ~38 cols × 20 rows, single string rebuilt
  per tick.
- Procedural frames, not stored art: for each cell compute
  `ring = max(|col-cx|/aspect, |row-cy|)` then pick char by
  `RING_CHARS[(ring - t) mod n]` with `RING_CHARS = " .:-=+*#%@"` — advancing `t`
  makes rings flow outward; reversing gives fly-in. ~760 cells of integer math per
  frame, trivial CPU.
- Throttle to 10–12 fps via accumulated `getDeltaTime()` (full-rate text rebuild is
  wasteful and strobes).
- Title Text sits on top (separate component, larger size); alpha-fade in over 0.8 s
  starting at t=0.6 s. Tagline + credit line below at smaller size.
- Optional: pipe the splash through TTS? No — keep silent, narration starts in-game.
- Exit: AppFlow advances when (elapsed ≥ 2.5 s) && engineReady; tunnel does a fast
  "fly-through" (t speeds up 4×, 0.4 s) then the splash rig disables.

Engine warmup behind the splash (fixes the laggy first text):
- Frame 0: splash visible, nothing else enabled.
- Frame 1–2 (DelayedCallbackEvent): `require` the tszm bundle, build the game
  registry (metadata only — no game decode).
- Game byte decode + `launchGame` happens on selection, with the tunnel's
  fly-through reused as the loading transition into GAME.

## 4. Main menu — game library

Layout (reuses existing kit, no new UI tech):
- **Header**: "IFWhenZMachine — Library" (Text3D, same style as menu preview text).
- **Game list**: the LocalJoost scroll menu with one button per game:
  `"Lost Pig  ·  G  ·  Jota '07"`. Pooling already handles rebuilds.
- **Detail card** (right of list, where the transcript normally is): title, author,
  year, rating badge, 2–3 line blurb, license/attribution line, and — once the
  player has played it — the cached room illustration for the game's first room as
  cover art (cache key `ill-<gameKey>-<firstRoom>`; placeholder art otherwise).
- **Action buttons** (QuickButtons pattern, pinned below list):
  `[ ▶ Play ]` `[ ⟳ Resume ]` (only when a save exists for that gameKey in
  PersistentStorageSystem) `[ ⓘ About ]`.
- Selecting a list entry updates the detail card; Play/Resume launches.

Data model (`games/registry.ts`):
```ts
interface GameEntry {
  id: string;            // "lostpig"
  title: string;
  author: string;
  year: number;
  rating: "G" | "PG" | "PG-13";
  blurb: string;
  moduleName: string;    // "LostPig" -> require("./LostPig")
  firstRoom?: string;    // for cover art cache lookup
  attribution: string;   // shown on card + About
}
```
Each game embedded via existing `tools/embed-game.js` (byte-identical decode path
already proven with MiniZork).

Voice: menu supports "play lost pig" / "resume" via the existing VoiceInput listener
while in MENU state (AppFlow routes transcriptions to menu instead of the game).

## 5. Build order

1. `games/registry.ts` + embed 2 pilot games (Lost Pig, Adventure) alongside MiniZork.
2. `AppFlow.ts` + ZMachineHost `autoStart=false` / `launchGameById` (smallest risky
   change — verify existing flow still works when AppFlow launches MiniZork directly).
3. `SplashTunnel.ts` + mono font + title/tagline (pure add, no dependencies).
4. Menu rig: scroll-list-of-games + detail card + Play/Resume buttons.
5. Save/Resume detection per gameKey; "Library" meta button in-game.
6. Remaining 8 games: embed, playtest each with the button UI, write
   `GAMES-LICENSES.md`, drop or swap any that fight the parser.
