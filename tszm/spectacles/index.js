"use strict";
// Spectacles bundle entry. Installs the runtime shims (Buffer, crypto.randomUUID)
// as globals BEFORE the interpreter core loads, then re-exports the public API.
//
// The Lens consumes the built artifact (dist/tszm.spectacles.js) via require();
// see ../README.md for the build command.
const shims = require("./shims.js");

// Force the core's runtime detection to "spectacles" even if the host embeds a
// Node-like or browser-like environment.
const g = shims.installShims();
g.__TSZM_SPECTACLES__ = true;

const { ZMachine } = require("../core/index.js");

module.exports = {
    ZMachine,
    shims,
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
