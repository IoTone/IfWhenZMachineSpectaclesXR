"use strict";
// Platform-independent host layer for running the Z-Machine on Spectacles.
//
// This is the testable half of the Lens integration: it implements the
// ZMInputOutputDevice interface the interpreter core expects, translates the
// core's terminal-oriented output (VT100 escape sequences, status-line
// repaints) into clean text callbacks a Text component can render, and queues
// user input into the promise-based readLine the core awaits.
//
// The Lens component (ZMachineHost.ts) is a thin wrapper: it forwards
// onText/onStatus to Text components, backs `storage` with
// PersistentStorageSystem, and calls pushInput() from UI events. Everything
// here runs (and is verified) in plain Node.

// ---------------------------------------------------------------------------
// VT100 stream filter
// ---------------------------------------------------------------------------
// The interpreter emits:
//   ESC 7 ... ESC 8        cursor save/restore wrapping v3 status-line repaints
//   ESC [ ... <letter>     CSI sequences (cursor moves, scroll region, styles)
// Between ESC7/ESC8 the text (minus CSI noise) is the status line; everything
// outside (minus CSI noise) is game text.
class Vt100Filter {
    constructor(onText, onStatus) {
        this.onText = onText;
        this.onStatus = onStatus;
        this.inStatus = false;
        this.statusBuf = "";
        this.pending = ""; // holds a trailing partial escape sequence between writes
    }
    feed(chunk) {
        let s = this.pending + chunk;
        this.pending = "";
        let text = "";
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (c !== "\x1b") {
                if (this.inStatus) this.statusBuf += c;
                else text += c;
                i++;
                continue;
            }
            // Escape sequence. If it may be truncated at the chunk boundary,
            // stash the remainder for the next feed().
            if (i + 1 >= s.length) {
                this.pending = s.slice(i);
                break;
            }
            const next = s[i + 1];
            if (next === "7") {
                // cursor save: status-line block begins
                this.inStatus = true;
                this.statusBuf = "";
                i += 2;
                continue;
            }
            if (next === "8") {
                // cursor restore: status-line block ends
                if (this.inStatus) {
                    const line = this.statusBuf.replace(/\s+/g, " ").trim();
                    if (line) this.onStatus?.(line);
                }
                this.inStatus = false;
                this.statusBuf = "";
                i += 2;
                continue;
            }
            if (next === "[") {
                // CSI: ESC [ params <final byte 0x40-0x7e>
                let j = i + 2;
                while (j < s.length && !(s[j] >= "@" && s[j] <= "~")) j++;
                if (j >= s.length) {
                    this.pending = s.slice(i);
                    break;
                }
                i = j + 1; // drop the whole sequence
                continue;
            }
            // Unknown two-char escape (ESC c etc.) - drop both
            i += 2;
        }
        if (text) this.onText?.(text);
    }
}

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------
class SpectaclesZDevice {
    /**
     * opts:
     *   onText(str)    - clean game text (may be partial lines; includes \n)
     *   onStatus(str)  - v3 status line, already normalized
     *   onEcho(str)    - called with the command when input is consumed
     *   rows           - reported screen height (default 24)
     */
    constructor(opts = {}) {
        this.rows = opts.rows || 24;
        this.onEcho = opts.onEcho;
        this.filter = new Vt100Filter(opts.onText, opts.onStatus);
        this.inputQueue = [];
        this.pendingLine = null; // resolver waiting for a full line
        this.pendingChar = null; // resolver waiting for a single key
    }
    /** UI entry point: submit a full command line. */
    pushInput(line) {
        if (this.pendingChar) {
            // A read_char is outstanding ("press any key") - satisfy it first.
            const resolve = this.pendingChar;
            this.pendingChar = null;
            resolve("\r");
            if (line.trim() !== "") this.inputQueue.push(line);
            return;
        }
        if (this.pendingLine) {
            const resolve = this.pendingLine;
            this.pendingLine = null;
            this.onEcho?.(line);
            resolve(line);
        }
        else {
            this.inputQueue.push(line);
        }
    }
    /** True when the game is blocked waiting for the player. */
    get awaitingInput() {
        return this.pendingLine !== null || this.pendingChar !== null;
    }
    // --- ZMInputOutputDevice interface ---
    async readLine() {
        if (this.inputQueue.length > 0) {
            const line = this.inputQueue.shift();
            this.onEcho?.(line);
            return line;
        }
        return new Promise((resolve) => {
            this.pendingLine = resolve;
        });
    }
    async readChar() {
        if (this.inputQueue.length > 0) return "\r"; // queued command implies a keypress
        return new Promise((resolve) => {
            this.pendingChar = resolve;
        });
    }
    async writeChar(c) {
        this.filter.feed(c);
    }
    async writeString(s) {
        this.filter.feed(s);
    }
    close() {}
}

// ---------------------------------------------------------------------------
// Run loop
// ---------------------------------------------------------------------------
/**
 * Create and start a Z-Machine game against a SpectaclesZDevice.
 *
 * opts:
 *   ZMachine    - the interpreter class (from the bundle entry)
 *   gameBytes   - Uint8Array/Buffer of the story file
 *   device      - a SpectaclesZDevice (or compatible)
 *   onQuit()    - the game executed @quit
 *   onError(e)  - fatal interpreter error
 *   yieldEvery  - instructions between yields (default 20000)
 *   yieldFn     - async fn called between batches; the Lens host passes a
 *                 frame-yielding implementation so long turns can't stall the
 *                 render thread. Defaults to a microtask.
 *
 * Returns { zm, device, running() } after starting the loop (does not await it).
 */
function runGame(opts) {
    const { ZMachine, gameBytes, device, onQuit, onError } = opts;
    const yieldEvery = opts.yieldEvery || 20000;
    const yieldFn = opts.yieldFn || (() => Promise.resolve());
    const zm = new ZMachine(gameBytes, device);
    let running = true;
    (async () => {
        try {
            await zm.load();
            let sinceYield = 0;
            while (running) {
                await zm.executeInstruction();
                if (++sinceYield >= yieldEvery) {
                    sinceYield = 0;
                    await yieldFn();
                }
            }
        }
        catch (err) {
            running = false;
            if (err instanceof Error && err.message === "QUIT") onQuit?.();
            else onError?.(err);
        }
    })();
    return {
        zm,
        device,
        running: () => running,
        stop: () => {
            running = false;
        },
    };
}

module.exports = { Vt100Filter, SpectaclesZDevice, runGame };
