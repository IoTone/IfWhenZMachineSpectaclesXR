"use strict";
// Embedded runtime bundle entry. Installs the runtime shims (Buffer,
// crypto.randomUUID) as globals BEFORE the interpreter core loads, then
// re-exports the public API for non-web/non-Node hosts (Snap Spectacles is the
// first consumer).
//
// A host consumes the built artifact (dist/tszm.embedded.js) via require();
// see ../README.md for the build command.
const shims = require("./shims.js");

// Force the core's runtime detection to "embedded" even if the host embeds a
// Node-like or browser-like environment.
const g = shims.installShims();
g.__TSZM_EMBEDDED__ = true;

const { ZMachine } = require("../core/index.js");
const hostCore = require("./host-core.js");

module.exports = {
    ZMachine,
    shims,
    EmbeddedZDevice: hostCore.EmbeddedZDevice,
    Vt100Filter: hostCore.Vt100Filter,
    /**
     * One-call game start for an embedded host:
     *   const host = createZHost({ gameBytes, onText, onStatus, onEcho, onQuit, onError, yieldFn });
     *   host.device.pushInput("open mailbox");
     */
    createZHost(opts) {
        const device = new hostCore.EmbeddedZDevice(opts);
        return hostCore.runGame({ ...opts, ZMachine, device });
    },
    /**
     * Wire persistence for @save/@restore. `storage` must provide
     * getItem(key) -> string|null|Promise and setItem(key, value) -> void|Promise.
     * The Lens host backs this with PersistentStorageSystem.
     */
    setStorage(storage) {
        g.__tszmStorage = storage;
    },
    /**
     * Optional fallback game loader: called with the ZMachine's filePath when
     * no raw bytes were passed to the constructor. Must return bytes
     * (Uint8Array/ArrayBuffer/number[]) or a Promise of them.
     */
    setGameLoader(loader) {
        g.__tszmReadGameBytes = loader;
    },
};
