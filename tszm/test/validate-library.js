"use strict";
// Library validator: runs every shipped IF story through the SAME stack the
// Lens uses (built bundle host + getSceneContext menu path) and applies a
// 5-step test per story, so we can pick the ~10 that work well.
//
//   Usage: node test/validate-library.js            # all games
//          node test/validate-library.js lostpig 905 # a subset (by id)
//
// The 5 steps (per game):
//   1. BOOT      loads + reaches first input prompt with no fatal error
//   2. INTRO     produces opening text; classify story-open vs question-open
//   3. ROOM      getSceneContext resolves a room (needed for illustration)
//   4. MENU      scene context yields noun buttons (the dynamic command menu)
//   5. PLAY      accepts a short command drive and stays alive (no crash)
//
// Exit code 0 iff every requested game passes steps 1,2,5 (hard) — steps 3/4
// are reported as quality signals, not hard fails, since a legitimately
// question-gated intro has no room until the player answers.

const fs = require("fs");
const path = require("path");
const bundle = require("../dist/tszm.spectacles.js");
globalThis.Buffer = bundle.shims.Buffer;

// Each game gets a fresh in-memory storage so saves never collide.
function freshStorage() {
    const mem = {};
    bundle.setStorage({
        getItem: (k) => (k in mem ? mem[k] : null),
        setItem: (k, v) => {
            mem[k] = v;
        },
    });
}

const GAMES_DIR = path.join(__dirname, "..", "..", "Lens", "Assets", "Application", "Scripts", "games");

// id -> embedded module file (mirrors registry.ts, the actual shipped bytes).
const LIBRARY = [
    { id: "lostpig", module: "LostPig.js" },
    { id: "adventure", module: "Adventure.js" },
    { id: "dreamhold", module: "Dreamhold.js" },
    { id: "christminster", module: "Christminster.js" },
    { id: "suvehnux", module: "SuvehNux.js" },
    { id: "905", module: "NineOhFive.js" },
    { id: "delusions", module: "Delusions.js" },
    { id: "spiderweb", module: "SpiderAndWeb.js" },
    { id: "metamorphoses", module: "Metamorphoses.js" },
    { id: "slouching", module: "SlouchingTowardsBedlam.js" },
    { id: "minizork", module: "MiniZork.js" },
];

// Verbs the Lens always offers (mirror of ScrollButtonDataLoader VERBS). The
// menu also lists nouns pulled from scene context; those are the dynamic part
// this harness scores.
const MAX_NOUNS = 8;

// A short, safe, generic drive. If the opening is a yes/no question we answer
// "no" first (decline instructions) to get into the world; then a few universal
// commands that no game should crash on.
const GENERIC_DRIVE = ["look", "examine me", "inventory", "wait"];

const SETTLE_MS = 40; // idle time with no output => the game is waiting on us
const STEP_TIMEOUT_MS = 8000; // per-command safety
const BOOT_TIMEOUT_MS = 12000;

function lastNonEmptyLine(text) {
    const lines = text.replace(/\s+$/g, "").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().length > 0) return lines[i].trim();
    }
    return "";
}

function looksLikeQuestion(openingText) {
    const tail = openingText.slice(-400).toLowerCase();
    // Strip a trailing input prompt ("> ") and padding so a question mark right
    // before the prompt still counts (Bronze: "...before? >").
    const line = lastNonEmptyLine(openingText)
        .toLowerCase()
        .replace(/[>\s]+$/g, "");
    if (line.endsWith("?")) return true;
    if (/would you (like|prefer)|have you (played|ever)|instructions,? or|type\s+(yes|no)\b/.test(tail)) {
        return true;
    }
    return false;
}

// Drive one game to completion of the 5-step test. Returns a report object.
function runGame(entry) {
    return new Promise((resolve) => {
        freshStorage();
        const mod = require(path.join(GAMES_DIR, entry.module));
        const gameBytes = mod.getBytes();

        let transcript = "";
        let opening = "";
        let bootDone = false;
        let fatal = null;
        let quit = false;
        const statusLog = [];
        const contexts = []; // scene-context snapshots at each prompt
        let lastOutputAt = Date.now();
        let promptCount = 0;

        const host = bundle.createZHost({
            gameBytes,
            // Yield via setImmediate so a game's post-input compute (e.g. after
            // dismissing a read_char title screen) can't starve the poll timer.
            yieldFn: () => new Promise((r) => setImmediate(r)),
            onText: (t) => {
                transcript += t;
                if (!bootDone) opening += t;
                lastOutputAt = Date.now();
            },
            onEcho: (cmd) => {
                transcript += "\n> " + cmd + "\n";
                lastOutputAt = Date.now();
            },
            onStatus: (s) => {
                statusLog.push(s);
                lastOutputAt = Date.now();
            },
            onPrompt: (ctx) => {
                promptCount++;
                contexts.push(ctx);
            },
            onQuit: () => {
                quit = true;
            },
            onError: (e) => {
                fatal = e && e.message ? e.message : String(e);
            },
        });

        const start = Date.now();
        let drive = null; // command queue, set after boot classification
        let driveIdx = 0;

        const finish = () => {
            clearInterval(poll);
            const report = grade(entry, {
                transcript,
                opening,
                statusLog,
                contexts,
                fatal,
                quit,
                running: host.running(),
                sceneNow: safe(() => host.sceneContext()),
            });
            try {
                host.stop();
            } catch (e) {
                /* ignore */
            }
            resolve(report);
        };

        const poll = setInterval(() => {
            if (fatal) {
                return finish();
            }
            const now = Date.now();
            const idle = now - lastOutputAt;
            const waiting = host.device.awaitingInput;

            if (!bootDone) {
                if (waiting && idle > SETTLE_MS) {
                    bootDone = true;
                    // Classify the intro, then choose the drive.
                    const q = looksLikeQuestion(opening);
                    drive = (q ? ["no"] : []).concat(GENERIC_DRIVE);
                    driveIdx = 0;
                }
                if (now - start > BOOT_TIMEOUT_MS) {
                    return finish(); // never reached a prompt
                }
                return;
            }

            if (waiting && idle > SETTLE_MS) {
                if (drive && driveIdx < drive.length) {
                    host.device.pushInput(drive[driveIdx++]);
                    lastOutputAt = Date.now();
                } else {
                    return finish(); // drive complete
                }
            }
            if (now - start > STEP_TIMEOUT_MS * (GENERIC_DRIVE.length + 3)) {
                return finish(); // global safety
            }
        }, 5);
    });
}

function safe(fn) {
    try {
        return fn();
    } catch (e) {
        return null;
    }
}

// Turn a scene context into the noun buttons the Lens would render.
function menuNouns(ctx) {
    if (!ctx) return [];
    const nouns = [];
    for (const o of (ctx.roomObjects || []).slice(0, MAX_NOUNS)) nouns.push(o.name);
    for (const o of (ctx.inventory || []).slice(0, MAX_NOUNS)) nouns.push(o.name);
    return nouns;
}

function grade(entry, s) {
    const openLen = s.opening.replace(/\s+/g, " ").trim().length;
    const questionOpen = looksLikeQuestion(s.opening);

    // Pick the best room context we saw at any prompt (boot may be null until
    // the intro question is answered).
    const roomContexts = s.contexts.filter((c) => c && c.room);
    const anyRoom = roomContexts.length > 0 || (s.sceneNow && s.sceneNow.room);
    const bestCtx =
        roomContexts[roomContexts.length - 1] || (s.sceneNow && s.sceneNow.room ? s.sceneNow : null);
    const nouns = menuNouns(bestCtx);

    const escapeLeak =
        s.transcript.includes("\x1b") || s.statusLog.some((x) => x.includes("\x1b"));

    const steps = {
        boot: !s.fatal && openLen > 0, // reached first prompt, no fatal error
        intro: openLen >= 40 && !escapeLeak, // real opening text, clean stream
        room: !!anyRoom, // illustration has a room to draw
        menu: nouns.length >= 1, // dynamic noun buttons exist
        play: !s.fatal, // survived the command drive
    };
    // Hard-fail steps decide pass/fail; room/menu are quality signals.
    const hardPass = steps.boot && steps.intro && steps.play;

    return {
        id: entry.id,
        steps,
        hardPass,
        questionOpen,
        openLen,
        room: bestCtx ? bestCtx.room : null,
        nouns,
        promptCount: s.contexts.length,
        fatal: s.fatal,
        escapeLeak,
        openingTail: lastNonEmptyLine(s.opening).slice(0, 90),
    };
}

async function main() {
    const argv = process.argv.slice(2);
    const wanted = argv.length ? LIBRARY.filter((g) => argv.includes(g.id)) : LIBRARY;
    if (!wanted.length) {
        console.error("No matching game ids. Known:", LIBRARY.map((g) => g.id).join(", "));
        process.exit(2);
    }

    const reports = [];
    for (const entry of wanted) {
        process.stdout.write(`\n=== ${entry.id} `.padEnd(60, "=") + "\n");
        const r = await runGame(entry);
        reports.push(r);
        printReport(r);
    }

    // Summary table.
    console.log("\n" + "=".repeat(72));
    console.log("SUMMARY  (B=boot I=intro R=room M=menu P=play)");
    console.log("-".repeat(72));
    const mark = (b) => (b ? "ok" : "XX");
    for (const r of reports) {
        const flags = [];
        if (r.questionOpen) flags.push("question-open");
        if (!r.steps.room) flags.push("no-room");
        if (r.steps.room && !r.steps.menu) flags.push("no-nouns");
        if (r.escapeLeak) flags.push("ansi-leak");
        if (r.fatal) flags.push("FATAL");
        console.log(
            r.id.padEnd(12) +
                ` B:${mark(r.steps.boot)} I:${mark(r.steps.intro)} R:${mark(r.steps.room)} ` +
                `M:${mark(r.steps.menu)} P:${mark(r.steps.play)}  ` +
                (r.hardPass ? "PASS" : "FAIL") +
                (flags.length ? "  [" + flags.join(", ") + "]" : "")
        );
    }

    const good = reports.filter((r) => r.hardPass && r.steps.room && r.steps.menu);
    console.log("-".repeat(72));
    console.log(
        `${good.length}/${reports.length} work well (boot+intro+play+room+menu): ` +
            good.map((r) => r.id).join(", ")
    );
    const failed = reports.filter((r) => !r.hardPass);
    console.log(failed.length ? `HARD FAILURES: ${failed.map((r) => r.id).join(", ")}` : "No hard failures.");
    process.exit(failed.length ? 1 : 0);
}

function printReport(r) {
    const line = (k, v) => console.log("  " + k.padEnd(14) + v);
    line("boot", r.steps.boot ? "ok (reached prompt)" : "FAIL " + (r.fatal || "no output"));
    line("intro", (r.steps.intro ? "ok" : "FAIL") + (r.questionOpen ? " [opens with a QUESTION]" : " [opens with story]"));
    line("last line", r.openingTail || "(none)");
    line("room", r.room ? "ok -> " + r.room : "none resolved");
    line("menu nouns", r.nouns.length ? r.nouns.join(", ") : "(none)");
    line("play", r.steps.play ? "ok (survived drive)" : "FAIL " + (r.fatal || ""));
    if (r.escapeLeak) line("WARN", "ANSI escape codes leaked into text/status");
}

main();
