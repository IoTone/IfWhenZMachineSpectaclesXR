"use strict";
// Platform-independent host layer for running the Z-Machine in an embedded host
// (non-web/non-Node runtimes; Snap Spectacles is the first consumer).
//
// This is the testable half of any embedder's integration: it implements the
// ZMInputOutputDevice interface the interpreter core expects, translates the
// core's terminal-oriented output (VT100 escape sequences, status-line
// repaints) into clean text callbacks a UI (e.g. a Text component) can render,
// and queues user input into the promise-based readLine the core awaits.
//
// A platform component (e.g. the Lens's ZMachineHost.ts) is a thin wrapper: it
// forwards onText/onStatus to UI, backs `storage` with the platform's key/value
// store, and calls pushInput() from UI events. Everything here runs (and is
// verified) in plain Node.

// ---------------------------------------------------------------------------
// VT100 stream filter
// ---------------------------------------------------------------------------
// The interpreter emits:
//   ESC 7 ... ESC 8        cursor save/restore wrapping v3 status-line repaints
//   ESC [ ... <letter>     CSI sequences (cursor moves, scroll region, styles)
// Between ESC7/ESC8 the text (minus CSI noise) is the status line; everything
// outside (minus CSI noise) is game text.
// Collapse an upper-window buffer into one clean status line. Rows arrive
// space-padded, and Inform redraws each line twice (full-width, then
// repositioned at a column), so segment on runs of 2+ spaces, drop the
// consecutive duplicates the double-draw produces, and join what's left.
function normalizeStatusLine(buf) {
    const segs = buf
        .split(/[ \t]{2,}|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const out = [];
    for (const seg of segs) {
        if (out[out.length - 1] !== seg) out.push(seg);
    }
    return out.join("   ");
}

class Vt100Filter {
    constructor(onText, onStatus) {
        this.onText = onText;
        this.onStatus = onStatus;
        this.inStatus = false;
        this.statusBuf = "";
        this.pending = ""; // holds a trailing partial escape sequence between writes
        // Height of the upper (status/HUD) window in rows. Learned from the
        // scroll-region escape split_window emits; 1 covers the classic
        // single-line status bar. Games with a multi-line header (e.g.
        // Metamorphoses: room name + a persistent elemental legend) set this
        // higher so every header row is routed to the HUD, not the transcript.
        this.upperRows = 1;
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
                    const line = normalizeStatusLine(this.statusBuf);
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
                const finalByte = s[j];
                const params = s.slice(i + 2, j);
                if (finalByte === "r") {
                    // Scroll region ESC[{top};{bottom}r (DECSTBM). split_window
                    // sets top = upperLines + 1, so rows 1..top-1 are the upper
                    // (status/HUD) window. Learn its height so a multi-line
                    // header is routed to the HUD in full instead of leaking
                    // its lower rows into the transcript.
                    const top = parseInt(params.split(";")[0] || "1", 10) || 1;
                    this.upperRows = Math.max(0, top - 1);
                    i = j + 1;
                    continue;
                }
                if (finalByte === "H" || finalByte === "f") {
                    // Cursor position ESC[row;colH. z4+ games draw the status
                    // area by moving into the upper window (rows 1..upperRows);
                    // text emitted there is the status line, NOT transcript.
                    // Inform positions segments with cursor jumps (no spaces
                    // between), so a jump inside the window gets a separator.
                    const parts = params.split(";");
                    const row = parts[0] !== "" && parts[0] !== undefined ? parseInt(parts[0], 10) : 1;
                    const statusRows = Math.max(1, this.upperRows);
                    if (row <= statusRows) {
                        if (!this.inStatus) {
                            this.inStatus = true;
                            this.statusBuf = "";
                        } else if (this.statusBuf.length > 0 && !this.statusBuf.endsWith(" ")) {
                            this.statusBuf += "   "; // row/column jump between segments
                        }
                    } else if (this.inStatus) {
                        const line = normalizeStatusLine(this.statusBuf);
                        if (line) this.onStatus?.(line);
                        this.inStatus = false;
                        this.statusBuf = "";
                    }
                }
                i = j + 1; // drop the sequence itself
                continue;
            }
            // Unknown two-char escape (ESC c etc.) - drop both
            i += 2;
        }
        if (text) this.onText?.(text);
    }
}

// ---------------------------------------------------------------------------
// Scene context (dynamic noun menus)
// ---------------------------------------------------------------------------
// The Z-Machine object tree tells us what the player can currently see, which
// lets the UI generate context-aware noun buttons every turn. The current room
// comes from global G0 — the Z-spec (8.2) defines the v3 status line as "the
// object whose number is in the first global variable", and Inform keeps the
// same convention in later versions. The player is identified as the room
// child with a self-referential name; inventory is that object's children.
const PLAYER_NAMES = ["you", "yourself", "cretin", "adventurer", "player", "self", "(self object)"];

// Whether an object's decoded short name is fit to show as a menu noun button.
// Authors mark hidden scenery with a debug short name — fully parenthesized
// ("(cellwall)", "(book_page)", "(self object)") or an internal identifier
// with underscores ("book_page") — precisely so a leak into player-facing
// output is obvious. Those must never become noun buttons. Real short names
// are human phrases ("small mailbox", "quill pen") with neither trait.
function isMenuNoun(name) {
    if (!name) return false;
    const n = name.trim();
    if (!n) return false;
    if (/^\(.*\)$/.test(n)) return false; // fully wrapped in parentheses
    if (n.indexOf("_") !== -1) return false; // internal identifier leaked
    return true;
}

// Key returned to satisfy an outstanding read_char when the player has queued
// a command. ESC continues "[MORE]" paging and quits Inform menus (HELP),
// where Enter would instead navigate the menu forever.
const MENU_EXIT_KEY = String.fromCharCode(27);

function objGetChild(vm, id) {
    const a = vm.getObjectAddress(id);
    return vm.header.version <= 3 ? vm.memory.readUInt8(a + 6) : vm.memory.readUInt16BE(a + 10);
}
function objGetSibling(vm, id) {
    const a = vm.getObjectAddress(id);
    return vm.header.version <= 3 ? vm.memory.readUInt8(a + 5) : vm.memory.readUInt16BE(a + 8);
}
function objChildren(vm, id) {
    const out = [];
    let c = objGetChild(vm, id);
    let guard = 0;
    while (c !== 0 && guard++ < 128) {
        out.push(c);
        c = objGetSibling(vm, c);
    }
    return out;
}
function objGetParent(vm, id) {
    const a = vm.getObjectAddress(id);
    return vm.header.version <= 3 ? vm.memory.readUInt8(a + 4) : vm.memory.readUInt16BE(a + 6);
}
function isPlayerName(name) {
    return !!name && PLAYER_NAMES.indexOf(name.trim().toLowerCase()) !== -1;
}
/**
 * Scan the object table for the player object ("yourself" in Inform games)
 * and derive the room from its parent. This is the reliable path for v4+
 * games, where the G0-holds-the-room convention (a v1-3 status line rule
 * that early Inform happened to follow) frequently does not hold.
 */
function findPlayerRoom(zm) {
    for (let id = 1; id < 2000; id++) {
        let name;
        try {
            name = zm.getObjectName(id);
        } catch (err) {
            break; // ran off the object table
        }
        if (!isPlayerName(name)) continue;
        try {
            const parent = objGetParent(zm, id);
            if (parent && objChildren(zm, parent).indexOf(id) !== -1) {
                const roomName = zm.getObjectName(parent);
                if (roomName && roomName.trim()) {
                    return { playerId: id, roomId: parent };
                }
            }
        } catch (err) {
            /* keep scanning */
        }
    }
    return null;
}

/**
 * Snapshot what the player can currently interact with.
 * Returns { room, roomObjects: [{id,name}], inventory: [{id,name}] } or null
 * (e.g. before the game has initialized its globals).
 */
/** Find an object whose short name matches (case-insensitive). */
function findObjectByName(zm, wanted) {
    const target = wanted.trim().toLowerCase();
    if (!target) return 0;
    for (let id = 1; id < 2000; id++) {
        let name;
        try {
            name = zm.getObjectName(id);
        } catch (err) {
            break;
        }
        if (name && name.trim().toLowerCase() === target) return id;
    }
    return 0;
}

/**
 * The story's own vocabulary: every word its parser accepts, classified.
 * Feeds the Lens Command Deck (UX2 §11.3), so it only offers verbs this
 * story understands.
 *
 * Returns { format, words: [{ word, verb, meta, noun, prep, dir, display,
 * truncated }] } or null. `display` is false for debug/internal entries
 * (",burnber", "#comm", "$ve", ".=") and single letters; `truncated` marks
 * words cut to the dictionary's 6 (v3) / 9 (v5+) letters ("activa" = activate).
 *
 * The dictionary's first data byte means different things per compiler:
 *  - Inform (6.x, and Inform 7 via I6): #dict_par1 flags
 *      1 = verb, 2 = meta verb (save/score...), 4 = plural,
 *      8 = preposition, 128 = noun
 *  - Infocom (ZIL): parts-of-speech flags
 *      0x80 = object, 0x40 = verb, 0x20 = adjective, 0x10 = direction,
 *      0x08 = preposition, 0x04 = buzz word
 * Inform 6 writes its compiler version at header 0x3C ("6.31"). Infocom files
 * leave it zero - and so does Inform 5 (Christminster). Zero-stamp stories
 * use the ZIL rule: Inform 5 marks verbs with bit 0 AND bit 6, so verbs are
 * still found; only Inform's separate meta flag is lost for them.
 */
function getDictionary(zm) {
    try {
        const mem = zm.memory;
        const header = zm.header || zm.getHeader();
        const addr = header.dictionaryAddress;
        if (!mem || !addr) {
            return null;
        }
        const stamp = String.fromCharCode(mem.readUInt8(0x3c), mem.readUInt8(0x3d), mem.readUInt8(0x3e), mem.readUInt8(0x3f));
        const inform = /^[5-7]\.\d\d$/.test(stamp);
        const nSep = mem.readUInt8(addr);
        const entryLength = mem.readUInt8(addr + nSep + 1);
        let count = mem.readInt16BE ? mem.readInt16BE(addr + nSep + 2) : mem.readUInt16BE(addr + nSep + 2);
        count = Math.abs(count); // negative = unsorted dictionary (v5+), same layout
        const first = addr + nSep + 4;
        const textBytes = header.version <= 3 ? 4 : 6;
        const maxLetters = header.version <= 3 ? 6 : 9;
        const words = [];
        const savedPc = zm.pc;
        try {
            for (let i = 0; i < count; i++) {
                const e = first + i * entryLength;
                zm.pc = e;
                const word = zm.decodeZSCII(false).trim();
                const f = entryLength > textBytes ? mem.readUInt8(e + textBytes) : 0;
                if (!word) {
                    continue;
                }
                const display = /^[a-z][a-z'-]+$/.test(word);
                const truncated = word.length >= maxLetters;
                if (inform) {
                    words.push({ word, verb: !!(f & 1), meta: !!(f & 2), noun: !!(f & 128), prep: !!(f & 8), dir: false, display, truncated });
                } else {
                    words.push({ word, verb: !!(f & 0x40), meta: false, noun: !!(f & 0x80), prep: !!(f & 0x08), dir: !!(f & 0x10), display, truncated });
                }
            }
        } finally {
            zm.pc = savedPc;
        }
        return { format: inform ? "inform " + stamp : "zil-flags", words };
    } catch (err) {
        return null; // never let vocabulary extraction break the game
    }
}

function getSceneContext(zm, visibleText, statusLine) {
    try {
        if (!zm.memory || !zm.header) return null;
        // Primary: find the player object by name and use its parent as the
        // room -- reliable for Inform games where G0 is not the room (e.g.
        // Slouching Towards Bedlam; Photopia's G0 is a random object).
        // Fallback: G0 as the room (the v1-3 status-line convention; also
        // needed for games whose player has a custom name, like Lost Pig's
        // Grunk). Games that keep the player outside the object tree
        // (Photopia between scenes) yield null: no room context.
        let roomId = 0;
        const found = findPlayerRoom(zm);
        if (found) {
            roomId = found.roomId;
        } else {
            const g0 = zm.getGlobalVariableValue(16); // global G0
            if (g0 && g0 <= 2000) {
                try {
                    const g0name = zm.getObjectName(g0);
                    // A real room has a name and contains something (at
                    // minimum the player). Photopia's G0 is a bare class
                    // object named "object" with no children -- reject.
                    if (g0name && g0name.trim() && objChildren(zm, g0).length > 0) {
                        roomId = g0;
                    }
                } catch (err) {
                    /* not an object */
                }
            }
        }
        if (!roomId) {
            // Last resort (Inform 7 games like Bronze, where the player
            // object carries a kind-name and rooms use printed-name
            // properties invisible to the object table): the game prints the
            // room name at the left edge of its self-drawn status bar, which
            // reaches us via onStatus (v3) or inline in the text stream
            // (v4+) as a line-start phrase followed by a wide gap of spaces.
            // If it resolves to an object we build a full context; otherwise
            // return a NAME-ONLY context so illustrations still work.
            const candidates = [];
            if (statusLine) {
                candidates.push(statusLine.split(/\s{2,}/)[0] || "");
            }
            if (visibleText) {
                // The freshest status-bar redraw is at the very end of the
                // stream; a narrow window sees only it, and the bar's FIRST
                // segment is the room (the rest is region/score clutter).
                const tail = visibleText.slice(-240);
                // Status bars arrive as one spaces-padded blob (no newlines):
                // "   drawbridge       n    great outdoors   ". Anchor on a
                // preceding run of 2+ spaces and require a 3+ space gap with
                // more content after it, so prose and bare echoed commands
                // ("look\n") never match.
                const re = /(?:^|[ ]{2,})([a-z][a-z'\u2019 -]{2,28}?)[ ]{3,}(?=\S)/g;
                let m;
                while ((m = re.exec(tail)) !== null) {
                    candidates.push(m[1]);
                }
            }
            let textRoom = "";
            for (let i = 0; i < candidates.length && !roomId; i++) {
                const c = (candidates[i] || "").trim();
                if (!c) continue;
                roomId = findObjectByName(zm, c);
                if (!roomId && !textRoom) textRoom = c;
            }
            if (!roomId) {
                return textRoom ? { room: textRoom, roomObjects: [], inventory: [] } : null;
            }
        }
        const roomName = zm.getObjectName(roomId);
        if (!roomName || !roomName.trim()) return null;
        const named = (id) => ({ id, name: (zm.getObjectName(id) || "").trim() });
        // Include one level of container contents (e.g. the leaflet inside a
        // mailbox) — but only once the story text has actually mentioned the
        // item, so the menu never spoils unrevealed contents. We can't read
        // the game-specific "open" attribute; the narrative itself is the
        // player-visible source of truth ("Opening the mailbox reveals a
        // leaflet"). `visibleText` is the lowercased text seen in this room.
        const revealed = (id) => {
            if (!visibleText) return false;
            const name = (zm.getObjectName(id) || "").trim().toLowerCase();
            return name.length > 0 && visibleText.indexOf(name) !== -1;
        };
        const withContents = (ids) => {
            const out = [];
            for (const id of ids) {
                out.push(id);
                for (const inner of objChildren(zm, id)) {
                    if (revealed(inner)) {
                        out.push(inner);
                    }
                }
            }
            return out;
        };
        const kids = objChildren(zm, roomId).map(named).filter((o) => o.name);
        let player = kids.find((o) => PLAYER_NAMES.indexOf(o.name.toLowerCase()) !== -1) || null;
        if (player && zm.getPlayerObjectNumber() !== player.id) {
            zm.setPlayerObjectNumber(player.id); // also fixes findPlayerParent/ZMCDN
        }
        const roomIds = kids.filter((o) => !player || o.id !== player.id).map((o) => o.id);
        const roomObjects = withContents(roomIds).map(named).filter((o) => isMenuNoun(o.name));
        const inventory = player
            ? withContents(objChildren(zm, player.id)).map(named).filter((o) => isMenuNoun(o.name))
            : [];
        return { room: roomName.trim(), roomObjects, inventory };
    } catch (err) {
        return null; // never let context extraction break the game loop
    }
}

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------
class EmbeddedZDevice {
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
        // Track the story text the player has actually seen. `turnText` holds
        // the current turn; `seenText` accumulates for the current room and is
        // used to decide which container contents have been revealed (no
        // spoiler buttons for items the game hasn't mentioned yet).
        this.turnText = "";
        this.seenText = "";
        const userOnText = opts.onText;
        this.filter = new Vt100Filter((t) => {
            this.turnText += t.toLowerCase();
            if (this.turnText.length > 8000) {
                this.turnText = this.turnText.slice(-8000);
            }
            userOnText?.(t);
        }, (status) => {
            this.lastStatus = status; // room-name fallback for getSceneContext
            opts.onStatus?.(status);
        });
        this.lastStatus = "";
        this.inputQueue = [];
        this.pendingLine = null; // resolver waiting for a full line
        this.pendingChar = null; // resolver waiting for a single key
    }
    /** Fold the completed turn's text into the room's seen-text history. */
    commitTurnText(roomChanged) {
        if (roomChanged) {
            this.seenText = this.turnText; // fresh room: only this turn's text
        } else {
            this.seenText += this.turnText;
            if (this.seenText.length > 16000) {
                this.seenText = this.seenText.slice(-16000);
            }
        }
        this.turnText = "";
    }
    /** UI entry point: submit a full command line. */
    pushInput(line) {
        if (this.pendingChar) {
            // A read_char is outstanding - satisfy it with the MENU-EXIT key.
            // read_char is used both for "[MORE]" paging (any key continues)
            // AND for Inform menus like HELP (arrow/Enter navigates, ESC
            // quits). Returning Enter would cycle a menu forever when a
            // command is queued; ESC continues [MORE] and quits menus.
            const resolve = this.pendingChar;
            this.pendingChar = null;
            resolve(MENU_EXIT_KEY);
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
    /** Drop any queued-but-not-yet-consumed commands (UI "clear" action). */
    clearQueue() {
        const dropped = this.inputQueue.length;
        this.inputQueue = [];
        return dropped;
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
            // Now blocked on the player: let the host refresh contextual UI.
            this.onAwaitInput?.();
        });
    }
    async readChar() {
        // A queued command means the player wants to move on: return the
        // menu-exit key so any open [MORE]/HELP menu closes instead of the
        // queued command endlessly navigating it.
        if (this.inputQueue.length > 0) return MENU_EXIT_KEY;
        return new Promise((resolve) => {
            this.pendingChar = resolve;
            // NB: do NOT fire onAwaitInput here. read_char is used for
            // "[MORE]" paging (e.g. HELP screens); refreshing the whole UI on
            // every page spams the menu/illustration and makes the Lens jerky.
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
 * Create and start a Z-Machine game against an EmbeddedZDevice.
 *
 * opts:
 *   ZMachine    - the interpreter class (from the bundle entry)
 *   gameBytes   - Uint8Array/Buffer of the story file
 *   device      - an EmbeddedZDevice (or compatible)
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
    let dictionaryCache; // undefined until first asked for
    const yieldEvery = opts.yieldEvery || 20000;
    const yieldFn = opts.yieldFn || (() => Promise.resolve());
    const zm = new ZMachine(gameBytes, device);
    // Fire opts.onPrompt(sceneContext) whenever the game waits for input, so
    // the UI can rebuild its dynamic noun menu. Turn text is folded into the
    // room's seen-text history first (resetting on room change) so revealed
    // container contents can be surfaced without spoiling unrevealed ones.
    let lastRoom = null;
    if (opts.onPrompt) {
        device.onAwaitInput = () => {
            const preview = getSceneContext(zm, device.seenText + device.turnText, device.lastStatus);
            const roomChanged = preview !== null && preview.room !== lastRoom;
            if (preview !== null) {
                lastRoom = preview.room;
            }
            device.commitTurnText(roomChanged);
            opts.onPrompt(getSceneContext(zm, device.seenText, device.lastStatus));
        };
    }
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
        /** On-demand scene snapshot (also delivered via opts.onPrompt). */
        sceneContext: () => getSceneContext(zm, device.seenText, device.lastStatus),
        /** The story's vocabulary (cached: the dictionary is static memory). */
        dictionary: () => {
            if (dictionaryCache === undefined) {
                dictionaryCache = getDictionary(zm);
            }
            return dictionaryCache;
        },
    };
}

module.exports = { Vt100Filter, EmbeddedZDevice, runGame, getSceneContext, getDictionary };
