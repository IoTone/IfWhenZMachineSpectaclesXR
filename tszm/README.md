# tszm — embedded runtime target

A fork of [`cshepherd/tszm`](https://github.com/cshepherd/tszm) (TypeScript
Z-Machine / Inform interpreter) that adds an **embedded** runtime target: a way to
run the interpreter in hosts that are neither a web browser nor Node — no
`Buffer`, no `fs`, no `fetch`, no bundler-friendly `require()`. Snap Spectacles is
the first consumer, but nothing here is Spectacles-specific; the platform glue
lives in the host app, not in this repo.

This directory is also the **source of truth** for the interpreter that ships in
the IfWhen Z-Machine Lens: `Lens/Assets/Application/Scripts/tszm/tszm.js` in that
project is a **build output** (`npm run deploy`), not source.

## Provenance & license

The `core/` interpreter was recovered from the shipped bundle's source map
(`sourcesContent`, 21 modules), so it is present here as **compiled JS**, and the
`host/` TypeScript (`ZConsole.ts`, `tszm.ts`, `ZMCDNInput.ts`) is byte-identical to
`cshepherd/tszm`. This is **not** `bitblit/tszm` (a different, weaker interpreter
that merely shares the name); it is the ZMCDN-capable lineage the bundle was built
from. Upstream is BSD-style licensed (see `LICENSE`); that attribution is preserved
and the `embedded/` layer added here is offered back under the same terms.

## Layout

- `core/` — the recovered interpreter, as compiled JS. Treat as vendored upstream;
  keep edits minimal and clearly marked. Node dependencies are localized:
  - `Buffer` — only in `core/ZMachine.js` and `core/opcodes/handlers/io.js`
  - `fs/promises` / `fetch` — load/save sites in `core/ZMachine.js`
  - `process` — runtime detection
- `host/` — upstream's console host + entry (TS). `ZConsole.ts` implements the
  `ZMInputOutputDevice` interface (`readChar`, `readLine`, `writeChar`,
  `writeString`, `close`, optional `rows`).
- `embedded/` — **the port.** Runtime shims + a platform-independent host that any
  embedder can drive; contains **zero** platform-hardware API calls.
  - `shims.js` — `Buffer` polyfill (Uint8Array subclass), base64 codec,
    `crypto.randomUUID`. Installed as globals before the core loads.
  - `fs-stub.js` — build-time alias for `fs/promises` (unreachable at runtime).
  - `host-core.js` — `EmbeddedZDevice` (the I/O device), `Vt100Filter`
    (splits game text from status/HUD, handles multi-line upper windows),
    `getSceneContext`, and the frame-yielding `runGame` loop.
  - `index.js` — esbuild entry: installs shims, forces the `embedded` runtime,
    exports `{ ZMachine, shims, createZHost, setStorage, setGameLoader,
    EmbeddedZDevice, Vt100Filter }`.

The core selects the `embedded` runtime when the host passes raw game bytes to the
`ZMachine` constructor, or when `globalThis.__TSZM_EMBEDDED__` is set (the
`embedded/index.js` entry sets it). Save/restore keys are game-id based, so the
runtime label does not affect save compatibility.

## Build & test

```
npm install          # once (esbuild only)
npm run build        # -> dist/tszm.embedded.js (+ sourcemap)
npm run deploy       # build straight into a host's asset path (Lens tszm.js)
npm run test:czech   # CZECH conformance suite against the source tree
npm run test:bundle  # CZECH against the BUILT bundle, pure shim Buffer
npm run test:library # build + validate the 11-game IF library end-to-end
npm run test:minizork / test:advent   # scripted game walkthroughs
```

A host consumes the bundle with `require()` and one call:

```js
const tszm = require("./tszm.embedded.js");        // or the deployed tszm.js
tszm.setStorage(myKeyValueStore);                  // backs @save/@restore
const host = tszm.createZHost({ gameBytes, onText, onStatus, onQuit, onError, yieldFn });
host.device.pushInput("open mailbox");
```

The only external left in the bundle is `fs/promises`, inside `runtime === 'node'`
guards that never execute in an embedded host. Verified by loading and playing
MiniZork inside a bare `vm` context with no Node globals.

Status: CZECH 425 tests / 0 failures (source and bundle); the 11-game IF library
validates end-to-end; MiniZork (v3) and Adventure (v5) complete scripted
walkthroughs incl. save/restore round-trips.

## Example consumer: the Spectacles Lens

- `embedded/host-core.js` (bundled) — `EmbeddedZDevice` implements the
  interpreter's I/O interface: promise-based `readLine` fed by `pushInput()`,
  VT100 filtering that splits output into clean game text (`onText`) and the
  status/HUD (`onStatus`), plus a frame-yielding run loop (`createZHost`).
  Verified in Node via `npm run test:host`.
- `tools/embed-game.js` — embeds a story file as a dependency-free CJS asset.
- In the Lens, `ZMachineHost.ts` is the thin platform wrapper: it forwards
  `onText`/`onStatus` to Text components, backs `storage` with
  `PersistentStorageSystem`, and calls `pushInput()` from UI events. All the
  Snap-specific code lives there, not in this repo.
