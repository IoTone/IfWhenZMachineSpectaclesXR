"use strict";
// Test harness: runs the vendored interpreter core the same way the Spectacles
// Lens will — shim Buffer installed first, `spectacles` runtime forced, game
// bytes passed to the constructor, storage via __tszmStorage — with a scripted
// I/O device instead of the Lens UI. Node's fs is used only to read the test
// game files from disk; the interpreter itself never touches fs.
//
// Usage: node run.js <game-file> [input-file | -] [--trace] [--max-steps N]
//   input-file: newline-separated commands fed to readLine; "-" or absent = none.

const fs = require("fs");
const path = require("path");

// Install shims BEFORE loading the core, then hide Node's Buffer from the test
// by making sure the core sees the spectacles runtime.
//
// TSZM_BUNDLE=1 tests the built artifact (dist/tszm.spectacles.js) instead of
// the source tree, and overrides the global Buffer with the shim so the bundle
// runs purely on the polyfill — the closest Node can get to the Lens runtime.
let shims;
let ZMachine;
if (process.env.TSZM_BUNDLE) {
    const bundle = require("../dist/tszm.spectacles.js");
    shims = bundle.shims;
    ZMachine = bundle.ZMachine;
    globalThis.Buffer = shims.Buffer;
    console.error("[harness] testing BUILT BUNDLE with shim Buffer");
}
else {
    shims = require("../spectacles/shims.js");
    globalThis.__TSZM_SPECTACLES__ = true;
    ZMachine = require("../core/index.js").ZMachine;
}

// In-memory storage stub standing in for PersistentStorageSystem.
const storage = {};
globalThis.__tszmStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => {
        storage[k] = v;
    },
};

function parseArgs(argv) {
    const args = { trace: false, maxSteps: 2_000_000, game: null, input: null };
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--trace") args.trace = true;
        else if (argv[i] === "--max-steps") args.maxSteps = parseInt(argv[++i], 10);
        else rest.push(argv[i]);
    }
    args.game = rest[0];
    args.input = rest[1] && rest[1] !== "-" ? rest[1] : null;
    return args;
}

class ScriptedDevice {
    constructor(commands) {
        this.commands = commands;
        this.output = "";
        this.rows = 24;
    }
    async writeChar(c) {
        this.output += c;
        process.stdout.write(c);
    }
    async writeString(s) {
        this.output += s;
        process.stdout.write(s);
    }
    async readLine() {
        if (this.commands.length === 0) throw new Error("INPUT_EXHAUSTED");
        const cmd = this.commands.shift();
        this.output += cmd + "\n";
        process.stdout.write(cmd + "\n");
        return cmd;
    }
    async readChar() {
        // Games use @read_char for "press any key" pauses; return CR.
        return "\r";
    }
    close() {}
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.game) {
        console.error("Usage: node run.js <game-file> [input-file|-] [--trace] [--max-steps N]");
        process.exit(2);
    }
    const gameBytes = shims.Buffer.from(new Uint8Array(fs.readFileSync(args.game)));
    const commands = args.input
        ? fs
              .readFileSync(args.input, "utf8")
              .split("\n")
              .map((l) => l.replace(/\r$/, ""))
              .filter((l) => l.length > 0 && !l.startsWith("#"))
        : [];

    const device = new ScriptedDevice(commands);
    const zm = new ZMachine(gameBytes, device);
    if (args.trace) zm.setTrace(true);

    let exitReason = "max-steps";
    await zm.load();
    if (zm.runtime !== "spectacles") throw new Error(`expected spectacles runtime, got ${zm.runtime}`);

    let steps = 0;
    try {
        for (; steps < args.maxSteps; steps++) {
            await zm.executeInstruction();
        }
    } catch (err) {
        if (err instanceof Error && err.message === "QUIT") exitReason = "quit";
        else if (err instanceof Error && err.message === "INPUT_EXHAUSTED") exitReason = "input-exhausted";
        else {
            console.error(`\n[harness] FATAL after ${steps} steps:`, err);
            process.exit(1);
        }
    }

    process.stderr.write(`\n[harness] exit=${exitReason} steps=${steps} game=${path.basename(args.game)}\n`);
    process.exit(exitReason === "max-steps" ? 3 : 0);
}

main().catch((e) => {
    console.error("[harness] error:", e);
    process.exit(1);
});
