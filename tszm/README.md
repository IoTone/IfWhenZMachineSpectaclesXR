# tszm — Spectacles build project

This directory is the **source of truth** for the Z-Machine interpreter that ships
in the Lens. The Lens asset
`Lens/Assets/Application/Scripts/tszm/tszm.js` is a **build output**, not source.

## Where this came from

The original repo only contained the minified esbuild bundle (`tszm.js`) plus its
source map (`tszm.map`). The map embedded `sourcesContent` for all 21 modules, so the
full readable source was recovered from it. This is **not** `bitblit/tszm` (a different,
generator-based, weaker interpreter that merely shares the name); it is the more advanced
ZMCDN-capable fork (browneverettlewis / "tscdn" lineage) the bundle was actually built from.

## Layout

- `core/` — the recovered interpreter, as compiled JS. Treat as vendored upstream; keep
  edits minimal and clearly marked. Node dependencies are localized:
  - `Buffer` — only in `core/ZMachine.js` and `core/opcodes/handlers/io.js`
  - `fs/promises` / `fetch` — 4 load/save sites in `core/ZMachine.js`
  - `process` — runtime detection + entry
- `host/` — the host I/O + entry layer (TS). `ZConsole.ts` implements the
  `ZMInputOutputDevice` interface (`readChar`, `readLine`, `writeChar`, `writeString`,
  `close`, optional `rows`). This is the layer we replace for Spectacles.

## Port targets (Node -> Spectacles "specs24" runtime)

1. Buffer polyfill (Uint8Array/DataView) + base64 codec + `crypto.randomUUID` shim.
2. Add a `spectacles` branch to load()/saveData()/restoreFromSave()/@save/@restore.
   - game files: bundled as base64 modules, decoded to Uint8Array (offline).
   - saves/settings: `PersistentStorageSystem`.
3. Replace `ZConsole` with a Spectacles host bridging the `readline` standin to a
   scrolling text UI; ZMCDN http -> Remote Service Gateway; graphics -> AI image gen
   + native Spatial Image (photo -> spatialized mesh).

## Build

esbuild bundles `host/tszm.ts` (+ `core/`) into the Lens asset above, targeting the
Spectacles JS runtime (no Node externals; `print`/`global`/`require("../readline")`).
TODO: add `package.json` + esbuild config.
