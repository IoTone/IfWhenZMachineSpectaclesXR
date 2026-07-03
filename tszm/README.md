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

## Build & test

```
npm install          # once (esbuild only)
npm run build        # -> dist/tszm.spectacles.js (+ sourcemap)
npm run deploy       # build straight into Lens/Assets/Application/Scripts/tszm/tszm.js
npm run test:czech   # CZECH conformance suite against the source tree
npm run test:bundle  # CZECH against the BUILT bundle, pure shim Buffer
npm run test:minizork / test:advent   # scripted game walkthroughs
```

The entry `spectacles/index.js` installs the shims as globals, forces the
`spectacles` runtime, and exports `{ ZMachine, shims, setStorage, setGameLoader }`
as a CommonJS module — the Lens host consumes it with `require()`. The only
external left in the bundle is `fs/promises`, inside `runtime === 'node'` guards
that never execute on device. Verified by loading and playing MiniZork inside a
bare `vm` context with no Node globals.

Status: CZECH 425 tests / 0 failures (source and bundle); MiniZork (v3) and
Adventure (v5) complete scripted walkthroughs incl. save/restore round-trips.
