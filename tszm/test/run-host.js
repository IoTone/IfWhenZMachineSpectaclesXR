"use strict";
// Verifies the Spectacles host layer (host-core via the BUILT bundle) exactly
// the way the Lens will drive it: pushInput() from "UI events", clean text and
// status-line callbacks, storage-backed save/restore. Node's Buffer is
// replaced with the shim so the whole stack runs on the polyfill.
//
// Usage: node run-host.js

const fs = require("fs");
const bundle = require("../dist/tszm.spectacles.js");
globalThis.Buffer = bundle.shims.Buffer;

const mem = {};
bundle.setStorage({
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
        mem[k] = v;
    },
});

let transcript = "";
let lastStatus = "";
const statusLog = [];

const gameBytes = new Uint8Array(fs.readFileSync(__dirname + "/games/minizork.z3"));
const host = bundle.createZHost({
    gameBytes,
    onText: (t) => {
        transcript += t;
    },
    onEcho: (cmd) => {
        transcript += cmd + "\n";
    },
    onStatus: (s) => {
        lastStatus = s;
        statusLog.push(s);
    },
    onQuit: () => {
        finish();
    },
    onError: (e) => {
        console.error("FATAL:", e);
        process.exit(1);
    },
});

// Simulate the player: send a command whenever the game is waiting for input.
const commands = [
    "open mailbox",
    "read leaflet",
    "north",
    "east",
    "open window",
    "enter window",
    "west",
    "take lamp",
    "save",
    "turn on lamp",
    "restore",
    "quit",
    "y",
];
const poll = setInterval(() => {
    if (!host.running()) return;
    if (host.device.awaitingInput && commands.length > 0) {
        host.device.pushInput(commands.shift());
    }
}, 5);

function finish() {
    clearInterval(poll);
    let failures = 0;
    const check = (name, cond) => {
        console.log(cond ? `ok   ${name}` : `FAIL ${name}`);
        if (!cond) failures++;
    };
    check("no escape codes in transcript", !transcript.includes("\x1b"));
    check("no escape codes in status", statusLog.every((s) => !s.includes("\x1b")));
    check("opening room shown", transcript.includes("West of House"));
    check("mailbox opens", transcript.includes("leaflet"));
    check("kitchen reachable", transcript.includes("Kitchen"));
    check("living room reachable", transcript.includes("Living Room"));
    check("lamp taken", transcript.includes("Taken"));
    check("save acknowledged", /save\nOk\./.test(transcript));
    check("restore acknowledged", /restore\nOk\./.test(transcript));
    // After restore, the lamp-on move is undone: quitting reports the pre-lamp score
    check("status line has room + score", /Living Room.*Score/.test(lastStatus));
    check("save persisted to storage", Object.keys(mem).some((k) => k.startsWith("tszm-save-")));
    console.log(failures === 0 ? "\nHOST TEST PASSED" : `\n${failures} HOST CHECKS FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

// Safety net
setTimeout(() => {
    console.error("TIMEOUT - game did not quit. Transcript tail:\n" + transcript.slice(-600));
    process.exit(1);
}, 30000);
