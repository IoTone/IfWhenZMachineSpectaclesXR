"use strict";
// UX2 step 6C: verify the story-dictionary reader (host-core getDictionary)
// against every shipped library story before the Command Deck relies on it.
//
//   npm run test:dictionary            # all games
//   node test/dictionary-report.js adventure 905
//
// For each story: boot to the first prompt, read the dictionary, report the
// compiler format, word/verb/noun counts, a sample of verbs, and spot checks
// for words that story is known to accept (below). Exits 1 if a spot check
// fails or a story yields no verbs.

const fs = require("fs");
const path = require("path");
const bundle = require("../dist/tszm.embedded.js");
globalThis.Buffer = bundle.shims.Buffer;

const GAMES_DIR = path.join(__dirname, "..", "..", "Lens", "Assets", "Application", "Scripts", "games");
const LIBRARY = [
    { id: "lostpig", module: "LostPig.js", expect: ["take", "look"] },
    { id: "adventure", module: "Adventure.js", expect: ["xyzzy", "plugh", "take"] },
    { id: "dreamhold", module: "Dreamhold.js", expect: ["take", "look"] },
    { id: "christminster", module: "Christminster.js", expect: ["take", "open"] },
    { id: "suvehnux", module: "SuvehNux.js", expect: ["take", "look"] },
    { id: "905", module: "NineOhFive.js", expect: ["shower", "take"] },
    { id: "delusions", module: "Delusions.js", expect: ["take", "look"] },
    { id: "spiderweb", module: "SpiderAndWeb.js", expect: ["take", "look"] },
    { id: "metamorphoses", module: "Metamorphoses.js", expect: ["take", "look"] },
    { id: "slouching", module: "SlouchingTowardsBedlam.js", expect: ["take", "look"] },
    { id: "minizork", module: "MiniZork.js", expect: ["take", "open"] },
];

const mem = {};
bundle.setStorage({ getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } });

function bootToPrompt(gameBytes, ms) {
    return new Promise((resolve) => {
        const host = bundle.createZHost({
            gameBytes,
            onText: () => {},
            onStatus: () => {},
            onEcho: () => {},
            onQuit: () => {},
            onError: () => {},
            yieldFn: () => new Promise((r) => setImmediate(r)),
        });
        const t0 = Date.now();
        const poll = setInterval(() => {
            const dev = host.device;
            if (dev.pendingChar) {
                dev.pushInput(""); // title "press any key"
            }
            if (dev.awaitingInput || Date.now() - t0 > ms) {
                clearInterval(poll);
                resolve(host);
            }
        }, 10);
    });
}

(async () => {
    const only = process.argv.slice(2);
    let failed = 0;
    for (const g of LIBRARY.filter((e) => only.length === 0 || only.includes(e.id))) {
        const mod = require(path.join(GAMES_DIR, g.module));
        const host = await bootToPrompt(mod.getBytes(), 4000);
        const dict = host.dictionary();
        host.stop();
        if (!dict) {
            console.log(`FAIL ${g.id}: no dictionary`);
            failed++;
            continue;
        }
        const verbs = dict.words.filter((w) => w.verb && w.display);
        const nouns = dict.words.filter((w) => w.noun);
        const meta = dict.words.filter((w) => w.meta);
        const byWord = new Map(dict.words.map((w) => [w.word, w]));
        const checks = g.expect.map((word) => {
            const w = byWord.get(word);
            return w && w.verb ? `${word}✓` : w ? `${word}(not verb)` : `${word}✗`;
        });
        const ok = verbs.length > 0 && checks.every((c) => c.endsWith("✓"));
        if (!ok) {
            failed++;
        }
        console.log(
            `${ok ? "ok  " : "FAIL"} ${g.id.padEnd(14)} ${dict.format.padEnd(12)} ` +
            `${String(dict.words.length).padStart(4)} words ${String(verbs.length).padStart(3)} verbs ` +
            `${String(nouns.length).padStart(4)} nouns ${String(meta.length).padStart(2)} meta  ${checks.join(" ")}`
        );
        const cut = verbs.filter((w) => w.truncated).length;
        console.log(`       verbs: ${verbs.slice(0, 20).map((w) => w.word + (w.truncated ? "…" : "")).join(" ")}${verbs.length > 20 ? " …" : ""}` +
            `   (${cut} truncated)`);
    }
    process.exit(failed ? 1 : 0);
})();
