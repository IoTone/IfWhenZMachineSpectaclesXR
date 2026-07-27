# Overview

IfWhenIFSpectacles aims to build off decades of fantastic and innovative work in the world of interactive fiction, and provide a spatial UX around interactive fiction experiences

## Design Goals

A spatial experience in Interactive Fiction seems to be two comepting ideas that might seem at odds with each other, at first.  Spatial Computing is visual and possibly immersive.  Books, and things like books (words on a screen) are by nature, linear and 2 dimensional.  But what if you could bring the best of the old 3D interactive fiction (games like Myst) into the spatial universe, while keeping the beauty of prose, and letting the prose guide the experience?

Design elements we can add spatially:

- AI generated narration (or simply, generate synthesized speech)
- Spatial sound effects where sound is relative to the user in 3d space. 
- 3D text ... we don't have to adapt to linear 2D text design
- Spatial history .... you could keep track of previous conversations in 3d space instead of using a terminal
- Text input methods through other means: voice to text
- building 3D scenes: you can use something like ML-sharp to spatialize image content into Splats (.ply format or .sog) and visualize these in XR
 
## References

- Z-Machine Specification https://inform-fiction.org/zmachine/standards/ http://zspec.jaredreisinger.com 
- tszm: nice work making a compact zmachine in TS and making it portable to browser or node.js 
- zmcdn: TBD need a reference to this concept
- PoC Research tszm / IF AI : https://browneverettlewis.com/case-studies/tszm-tscdn.pdf
- ZorkUI: https://github.com/posabsolute/zork-ui/tree/main

## Requirements

TODO

- R1: a Spectacles compatible TS/JS library port of tszm to provide a zmachine
- R2: a standard text chat prompt UI for zmachine interaction
- R3: All IF runs in the spectacles, and can function offline (does not require a server)
- R4: The Lens is open source
- R5: incorporate zmcnd offers asynchronous loading of an image to match the text prompts fed in
- R6: zmcdn is optional
- R7: offer persistent setttings 
- R8: Setting availabe for turning on Audio  Narration and choice of voices
- R9: Create a pinch to talk guesture for recording voice and performing voice to text
- R10: Remote asset loading pipeline for spatialized (ML-sharp) images -> .ply/.sog->.obj (do this locally if it is possible computationally)
- R11: game memu (new resume select IF)
- R12: game menu has a library of IF options from creative commons/open source
- R13: game state managed (in game, not in game, quit, save)
- R14: autosave files generated 
- R15: setting for ZMCDN url

## Reference Design

- Snap Spectacles Lens: see v1 in this repository
- WebXR : TODO (Best viewed on a Meta Quest 3)

## Story Library

The Lens ships a curated set of Z-Machine (Infocom-format) interactive fiction.
Each title is validated end-to-end by `tszm/test/validate-library.js`, a 5-step
harness (boot → intro → room detection → command menu → play) that runs every
story through the same interpreter + scene-context path the Lens uses. The
current library is **11/11 passing**.

Only Z-code (`.z3`/`.z5`/`.z8`) stories run; Glulx, TADS, and Hugo games are not
supported by this interpreter.

| Story | Author | Year | Rating | About |
|-------|--------|------|--------|-------|
| Lost Pig | Admiral Jota | 2007 | G | Grunk the orc must find his lost pig. Funny, friendly, ideal for first-timers. |
| Adventure | Crowther & Woods | 1976 | G | The original Colossal Cave — treasure, magic, and twisty little passages. |
| The Dreamhold | Andrew Plotkin | 2004 | PG | Wake with no memory in a wizard's stronghold; the gentlest doorway into IF. |
| Christminster | Gareth Rees | 1995 | PG | A literate Oxbridge-college mystery and a centuries-old conspiracy. |
| Suveh Nux | David Fisher | 2007 | G | Locked in a vault, you discover words of power. A bite-sized magic puzzle box. |
| 9:05 | Adam Cadre | 2000 | PG-13 | You overslept. Get up, get to work. Ten minutes long, with a famous twist. |
| Delusions | C.E. Forman | 1996 | PG-13 | A mind-bending sci-fi mystery aboard a strange vessel. |
| Spider and Web | Andrew Plotkin | 1998 | PG-13 | A spy thriller told in flashback under interrogation. |
| Metamorphoses | Emily Short | 2000 | PG | A surreal manor of shifting matter you can shrink, grow, and transmute. |
| Slouching Towards Bedlam | Foster & Ravipinto | 2003 | PG-13 | London, 1885: an asylum, a dead linguist, an idea that spreads. Steampunk, multiple endings. |
| Mini-Zork I | Infocom | 1988 | PG | A compact tour of the Great Underground Empire. **Dev builds only** (see licensing). |

Ratings are held to **G–PG-13**.

### Licensing

The story files are **third-party content with their own terms**, separate from
this repository's code license — nothing here relicenses them. All were obtained
from the [IF Archive](https://ifarchive.org) and are embedded byte-for-byte
(unmodified). Full provenance and the pre-release checklist live in
[`GAMES-LICENSES.md`](GAMES-LICENSES.md).

- **Adventure** — original is public domain; Graham Nelson's Inform port is
  freely distributable.
- **Lost Pig, The Dreamhold, Christminster, Suveh Nux, 9:05, Delusions,
  Spider and Web, Metamorphoses, Slouching Towards Bedlam** — freeware; each
  author permits free distribution (via the IF Archive / their own terms).
- **Mini-Zork I** — © Infocom/Activision. Historically given away but never
  formally licensed. **Included for development only; it must be removed or
  cleared before any public open-source release** (R4).

Before shipping open-source (R4), each freeware title's own license statement
should be captured verbatim from its in-game `ABOUT`/`CREDITS` text, and the
bundled third-party UI/fonts credited — see `GAMES-LICENSES.md` for the list.

## Status

- in design exploration

## Design Challenges

- The porting of the node.js/browser code is about 85% done.  The readline async standin is in place but needs testing.  The code to handle http/https needs to be re-written.  We need an option to ignore SSL verification if certs are expired or invlid.
- latency and how to show the user that something is happening needs to be designed
- incorporating voice is a new element
- how do we run this without costing a lot of money?

## Known Issues

- Online required to generate LLM images in initial design
- Feature requirements not started: TBD

## Brainstorms

- Generate more accurate worlds for IF, and pre-render these in a common artistic design PEN
- Is a future with 3D mixed with narration possible?
- Can we ask an LLM to generate IF assets dynamically and offer dynamic loading of IF?
- Are there kinds of IF that are designed to generate beautifully illustrated stories that have been previously never illustrated?


## Support

Submit a PR or contact me to collaborate on this.

## Attributions

- Microphone: https://sketchfab.com/3d-models/microphone-cf9580db045e4bd6818306d50f2fa2ce
- Audio
