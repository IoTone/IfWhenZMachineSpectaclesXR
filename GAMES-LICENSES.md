# Game Content — Licenses & Attribution

The story files bundled in `Lens/Assets/Application/Scripts/games/` are **content
with their own terms**, separate from this repository's code license. Nothing in
this repo relicenses them. This file records provenance and known terms for each
title, and what must still be verified before public release.

All files were obtained from the IF Archive (https://ifarchive.org), whose policy
is that authors retain all rights; inclusion in the Archive means the author
permitted distribution *via the Archive*. Redistribution inside this Lens relies
on each work's own freeware/CC terms, noted below. The Lens is free to use;
nothing here is sold.

Embedded modules are byte-identical base64 encodings of the original story files
(see `tszm/tools/embed-game.js`); no game has been modified.

Legend: ✅ = terms understood, bundling believed OK (confirm before release).
⚠ = must resolve before shipping publicly.

| Game | Author / Year | Source file (ifarchive.org) | Status |
|------|---------------|------------------------------|--------|
| Adventure (350 pt) | Crowther & Woods, 1976; Inform port G. Nelson | (bundled `advent.z5`, Release 9 / 060321) | ✅ original is public domain; Inform port freely distributable |
| Lost Pig | Admiral Jota, 2007 | `/if-archive/games/zcode/LostPig.z8` (Rel 2 / 080406) | ✅ freeware; IF Comp 2007 winner |
| The Dreamhold | Andrew Plotkin, 2004 | `/if-archive/games/zcode/dreamhold.z8` (Rel 5 / 041231) | ✅ Plotkin distributes his games as freeware; source published on the Archive |
| Christminster | Gareth Rees, 1995 | `/if-archive/games/zcode/minster.z5` (Rel 2) | ✅ freeware; long distributed free by the author and via the IF Archive |
| Suveh Nux | David Fisher, 2007 | `/if-archive/games/zcode/suvehnux.z5` (v1.1, Rel 1 / 150314) | ✅ freeware; One Room Game Comp 2007 winner |
| 9:05 | Adam Cadre, 2000 | `/if-archive/games/zcode/905.z5` (v1.1, 2012.0724) | ✅ Cadre distributes his games as freeware |
| Delusions | C.E. Forman, 1996 | `/if-archive/games/zcode/Delusns.z5` | ✅ freeware sci-fi mystery; from the IF Archive |
| Spider and Web | Andrew Plotkin, 1998 | `/if-archive/games/zcode/Tangle.z5` (Rel 4 / 980226) | ✅ Plotkin freeware |
| Metamorphoses | Emily Short, 2000 | `/if-archive/games/zcode/metamorp.z5` | ✅ freeware; from the IF Archive |
| Slouching Towards Bedlam | Star Foster & Daniel Ravipinto, 2003 | `/if-archive/games/competition2003/zcode/slouch/slouch.z5` | ✅ freeware; IF Comp 2003 winner |
| Mini-Zork I | Infocom, 1988 | (bundled `minizork.z3`, Rel 34 / 871124) | ⚠ **Infocom/Activision property.** Historically given away (UK magazine cassette) but never formally licensed. DEV BUILDS ONLY — remove or clear before public release |

## Pre-release checklist (R4)

- [ ] **Mini-Zork I**: remove from the public build, or obtain/verify
      permission. Do not ship it open-source by default.
- [ ] **Lost Pig byline**: credit as "Admiral Jota" (the author's chosen byline).
- [ ] For each ✅ title, capture the author's own license statement (game's
      ABOUT/CREDITS text, author website, or release notes) verbatim into this
      file. The in-game ABOUT command output is usually authoritative.
- [ ] Show attribution in-Lens: the Library detail card displays each game's
      attribution line (already implemented in `games/registry.ts`).
- [ ] Rotate the Google/Snap RSG tokens serialized in `Lens/Scene.scene`
      (unrelated to game content but same release gate).

## Other bundled third-party content

- **JetBrains Mono** (`Lens/Assets/Application/Fonts/JetBrainsMono-Regular.ttf`)
  — © 2020 The JetBrains Mono Project Authors, SIL Open Font License 1.1.
  Redistribution OK with the OFL notice; include the license text when
  open-sourcing.
- **LocalJoost ScrollWindow UI kit** (`Lens/Assets/LocalJoost/`) — by Joost van
  Schaik; verify the kit's license (MIT on his GitHub samples) and credit.
- **CZECH test suite** (`tszm/test/games/czech.*`) — Z-machine conformance
  tests by Amir Karger, freely distributable (dev-only, not shipped in Lens).
