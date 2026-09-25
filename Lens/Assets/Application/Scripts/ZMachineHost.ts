// ZMachineHost — runs the tszm Z-Machine interpreter inside the Lens and
// bridges it to scene UI.
//
// Scene setup (Lens Studio):
//   1. Create a SceneObject with a Text component for the game transcript
//      (enable wrapping; size it like a page) and optionally a second Text
//      for the v3 status line (room name / score / moves).
//   2. Add this component, assign outputText / statusText.
//   3. Wire your input UI (buttons, keyboard, voice) to call submitCommand().
//      For a quick smoke test enable autoDemo — it plays a MiniZork opening
//      by itself in Preview.
//
// The interpreter bundle (tszm/tszm.js) and the game module (games/MiniZork.js)
// are plain CommonJS assets required by relative path.
//
// IMPORTANT: these require() calls must stay static string literals at module
// scope — Lens Studio's packager builds the module registry by statically
// scanning for require("...") literals, so a require(variable) resolves to
// "Cannot find module" at runtime even when the asset exists.
// @ts-ignore - require is provided by the Lens runtime
const tszmModule = require("./tszm/tszm.js");
import { GAMES, GameEntry, getGame } from "./games/registry";
import { Theme } from "./Theme";
import { TypedReveal } from "./TypedReveal";

@component
export class ZMachineHost extends BaseScriptComponent {
    @input
    outputText: Text;

    @input
    @allowUndefined
    statusText: Text;

    /** Rolling transcript window, in lines. */
    @input
    maxLines: number = 16;

    /** Soft-wrap transcript lines at this many characters (0 = off). */
    @input
    wrapColumn: number = 42;

    /** Play a scripted MiniZork opening automatically (Preview smoke test). */
    @input
    autoDemo: boolean = false;

    /** Optional: the illustration plane, positioned above the status line. */
    @input
    @allowUndefined
    illustration: SceneObject;

    /** Distance (cm) the whole rig sits in front of the user at start. */
    @input
    rigDistance: number = 60;

    /** Played when a command is accepted (assign the alert audio asset). */
    @input
    @allowUndefined
    commandSound: AudioTrackAsset;

    /** Game to boot at start (id from games/registry: lostpig, adventure, minizork). */
    @input
    startGameId: string = "minizork";

    /** Boot the engine at OnStart. Turn OFF when AppFlow drives the splash. */
    @input
    autoStart: boolean = true;

    /**
     * Auto-continue "[press any key to continue]" intro screens (read_char
     * prompts that occur before the game's first command prompt). The
     * buttonless UI can't supply a keypress, so a freshly loaded game would
     * otherwise hang on its title/intro. Fires only during the intro — in-game
     * menus and [MORE] paging keep responding to real button presses.
     */
    @input
    autoAdvanceIntroKeys: boolean = true;

    /** Seconds an intro key-prompt stays visible before it auto-continues. */
    @input
    autoAdvanceDelaySeconds: number = 1.5;

    /**
     * UX2 typed reveal: game output types onto the transcript instead of
     * popping in; any player command skips to the end. Off = instant text
     * (the "Effects: Reduced" behaviour).
     */
    @input
    typedReveal: boolean = true;

    /** Apply the UX2 Theme colours to the transcript and status line. */
    @input
    useThemeColors: boolean = true;

    private host: any = null;
    private tszm: any = null;
    private lines: string[] = [""];
    private loggedFirstText: boolean = false;
    private lastContext: any = null;
    private sceneContextListeners: ((ctx: any) => void)[] = [];
    private narrationListener: ((text: string) => void) | null = null;
    private turnBuffer: string = "";
    private latestTurnText: string = "";
    private offline: boolean = false;
    private lastStatusLine: string = "";
    /** True once the game reaches its first command (line) prompt this session. */
    private firstLinePromptSeen: boolean = false;
    private introCharWait: number = 0;
    private reveal: TypedReveal = new TypedReveal((chars) => this.writeChars(chars));
    private cursorClock: number = 0;
    private cursorOn: boolean = false;
    private demoCommands: string[] = [
        "open mailbox",
        "read leaflet",
        "north",
        "east",
        "open window",
        "enter window",
        "west",
        "take lamp",
        "turn on lamp",
        "move rug",
        "open trap door",
        "inventory",
    ];

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.applyLayout();
            this.watchConnectivity();
            if (this.autoStart) {
                this.beginSession();
            }
        });
        const tick = this.createEvent("UpdateEvent");
        tick.bind(() => {
            this.autoAdvanceTick();
            this.revealTick();
        });
    }

    /**
     * Auto-continue an intro "[press any key]" (read_char) the buttonless UI
     * can't answer. Runs only until the game reaches its first command (line)
     * prompt, so in-game menus and [MORE] paging still respond to real presses.
     */
    private autoAdvanceTick(): void {
        if (!this.autoAdvanceIntroKeys || this.firstLinePromptSeen || !this.host) {
            this.introCharWait = 0;
            return;
        }
        const dev = this.host.device;
        if (!dev || !dev.pendingChar || (dev.inputQueue && dev.inputQueue.length > 0)) {
            this.introCharWait = 0;
            return;
        }
        // @ts-ignore - getDeltaTime is a Lens runtime global
        this.introCharWait += getDeltaTime();
        if (this.introCharWait >= this.autoAdvanceDelaySeconds) {
            this.introCharWait = 0;
            print("ZMachineHost: auto-advancing intro key prompt");
            dev.pushInput(""); // resolves the read_char with the continue/exit key
        }
    }

    /**
     * Per-frame: feed the typed reveal, and blink the prompt cursor while the
     * game waits. Idle cost is one queue check plus a text write ~4x/second.
     */
    private revealTick(): void {
        // @ts-ignore - getDeltaTime is a Lens runtime global
        const dt = getDeltaTime();
        if (this.reveal.tick(dt)) {
            return; // writeChars already re-rendered
        }
        const want = this.host !== null && this.awaitingInput && !this.reveal.busy
            ? (this.cursorClock = (this.cursorClock + dt * Theme.cursorHz) % 1) < 0.6
            : false;
        if (want !== this.cursorOn) {
            this.cursorOn = want;
            this.renderTranscript();
        }
    }

    /** HUD indicator: prefix the status line while the network is down. */
    private watchConnectivity(): void {
        try {
            // @ts-ignore - deviceInfoSystem is a Lens runtime global
            const dis = global.deviceInfoSystem;
            this.offline = !dis.isInternetAvailable();
            dis.onInternetStatusChanged.add((args: any) => {
                this.offline = !args.isInternetAvailable;
                print("ZMachineHost: network " + (this.offline ? "OFFLINE" : "online"));
                this.renderStatus();
            });
        } catch (e) {
            // connectivity API unavailable; assume online
        }
        this.renderStatus();
    }

    private renderStatus(): void {
        if (this.statusText) {
            this.statusText.text = (this.offline ? "⚠ NO NETWORK   " : "") + this.lastStatusLine;
        }
    }

    /**
     * Code-driven layout: editor transform state proved unreliable to manage
     * remotely, so the canonical layout lives here. All positions are local
     * to the rig (this component's parent object), which is pushed
     * `rigDistance` cm in front of the user.
     *
     *   illustration  (-6, 19)   art above everything
     *   status        (-14, 12.5) room/score line
     *   transcript    (-14, 6)    prose column, grows downward
     *   actions panel (22, 6)     button columns, clear to the right
     */
    private applyLayout(): void {
        const rig = this.getSceneObject().getParent();
        if (rig) {
            rig.getTransform().setLocalPosition(new vec3(0, 0, -this.rigDistance));
        }
        if (this.outputText) {
            this.outputText.getSceneObject().getTransform().setLocalPosition(new vec3(-14, 6, 0));
        }
        if (this.statusText) {
            this.statusText.getSceneObject().getTransform().setLocalPosition(new vec3(-14, 11, 0));
        }
        if (this.useThemeColors) {
            if (this.outputText) {
                this.outputText.textFill.color = Theme.phosphor;
            }
            if (this.statusText) {
                this.statusText.textFill.color = Theme.cyan;
            }
        }
        if (this.illustration) {
            this.illustration.getTransform().setLocalPosition(new vec3(-6, 19, 0));
            this.illustration.getTransform().setLocalScale(new vec3(12, 7.5, 1));
        }
    }

    /** Public API: send a player command to the game. */
    public submitCommand(cmd: string): void {
        if (this.host) {
            this.reveal.flush(); // the player acted: show everything first
            this.host.device.pushInput(cmd);
            this.confirmCommand(cmd);
        }
    }

    /**
     * Command-accepted feedback hook: plays the confirmation sound. Extend
     * here for richer confirmation UX (flash the preview line, haptics, etc.).
     */
    private confirmAudio: AudioComponent | null = null;
    private confirmCommand(cmd: string): void {
        if (this.commandSound) {
            if (!this.confirmAudio) {
                this.confirmAudio = this.getSceneObject().createComponent("Component.AudioComponent") as AudioComponent;
                this.confirmAudio.audioTrack = this.commandSound;
            }
            try {
                this.confirmAudio.play(1);
            } catch (e) {
                // audio unavailable; feedback is non-critical
            }
        }
    }

    /** True when the game is blocked waiting for the player. */
    public get awaitingInput(): boolean {
        return this.host ? this.host.device.awaitingInput : false;
    }

    /** Stable per-game identifier (release.serial) for cache keys. */
    public get gameKey(): string {
        try {
            const header = this.host ? this.host.zm.getHeader() : null;
            return header ? header.release + "." + header.serial : "unknown";
        } catch (e) {
            return "unknown";
        }
    }

    /** The most recent completed turn's text (room descriptions etc.). */
    public get lastTurnText(): string {
        return this.latestTurnText;
    }

    /** Drop any commands queued while the game was busy (UI "clear"). */
    public clearQueuedInput(): void {
        if (this.host && this.host.device.clearQueue) {
            const dropped = this.host.device.clearQueue();
            if (dropped > 0) {
                print("ZMachineHost: cleared " + dropped + " queued command(s)");
            }
        }
    }

    /**
     * Register a listener for scene-context updates ({room, roomObjects,
     * inventory}), delivered every time the game waits for input. Fires
     * immediately with the latest context if one exists.
     */
    public setSceneContextListener(fn: (ctx: any) => void): void {
        this.addSceneContextListener(fn);
    }

    /** Multiple systems (menu, illustrator) can subscribe to context updates. */
    public addSceneContextListener(fn: (ctx: any) => void): void {
        this.sceneContextListeners.push(fn);
        if (this.lastContext) {
            fn(this.lastContext);
        }
    }

    /**
     * Register a listener that receives each completed turn's game text
     * (accumulated between input prompts) — used for TTS narration. If a
     * completed turn's text is already pending (the game boots before the
     * narrator registers), it is delivered immediately.
     */
    public setNarrationListener(fn: (text: string) => void): void {
        this.narrationListener = fn;
        const pending = this.turnBuffer.replace(/\s+/g, " ").trim();
        if (pending.length > 0 && this.awaitingInput) {
            this.turnBuffer = "";
            fn(pending);
        }
    }

    /** Public API: stop the current session and boot the game fresh. */
    public restartGame(): void {
        this.resetSession();
        this.launchGame();
        print("ZMachineHost: game restarted");
    }

    /** Public API: switch to another library game (id from games/registry). */
    public launchGameById(id: string): boolean {
        const entry = getGame(id);
        if (!entry) {
            print("ZMachineHost: unknown game id '" + id + "'");
            return false;
        }
        this.ensureEngine();
        this.currentGame = entry;
        this.resetSession();
        this.launchGame();
        return true;
    }

    /** The library catalog, for menu UIs. */
    public get library(): GameEntry[] {
        return GAMES;
    }

    /** The registry entry currently loaded. */
    public get currentGameEntry(): GameEntry | null {
        return this.currentGame;
    }

    private resetSession(): void {
        if (this.host) {
            this.host.stop();
            this.host = null;
        }
        this.lines = [""];
        this.loggedFirstText = false;
        this.turnBuffer = "";
        this.latestTurnText = "";
        this.lastContext = null;
        this.lastStatusLine = "";
        this.firstLinePromptSeen = false;
        this.introCharWait = 0;
        this.reveal.clear();
        this.cursorOn = false;
        if (this.statusText) {
            this.statusText.text = "";
        }
        if (this.outputText) {
            this.outputText.text = "";
        }
        // Tell subscribers the world is gone: the command menu must drop the
        // previous game's nouns immediately (a new game can take several
        // turns to reach its first prompt), and the illustrator must clear
        // the old room's image.
        for (const listener of this.sceneContextListeners) {
            listener(null);
        }
    }

    /** Boot the engine + first game. Idempotent (AppFlow or autoStart calls it). */
    public beginSession(): void {
        if (this.host) {
            return;
        }
        this.startGame();
    }

    private startGame(): void {
        this.ensureEngine();
        this.launchGame();
        if (this.autoDemo) {
            this.runDemo();
        }
    }

    /** One-time engine setup: interpreter module + save storage binding. */
    private ensureEngine(): void {
        if (this.tszm) {
            return;
        }
        this.tszm = tszmModule;

        // Persist saves via Lens persistent storage.
        // @ts-ignore - global.persistentStorageSystem is a Lens runtime API
        const store = global.persistentStorageSystem ? global.persistentStorageSystem.store : null;
        if (store) {
            this.tszm.setStorage({
                getItem: (k: string) => {
                    const v = store.getString(k);
                    return v && v.length > 0 ? v : null;
                },
                setItem: (k: string, v: string) => {
                    store.putString(k, v);
                },
            });
        } else {
            print("ZMachineHost: persistentStorageSystem unavailable - saves are in-memory only");
            const mem: Record<string, string> = {};
            this.tszm.setStorage({
                getItem: (k: string) => (k in mem ? mem[k] : null),
                setItem: (k: string, v: string) => {
                    mem[k] = v;
                },
            });
        }
    }

    // Resolved lazily: @input values are injected after field initializers run.
    private currentGame: GameEntry | null = null;

    private launchGame(): void {
        if (!this.currentGame) {
            this.currentGame = getGame(this.startGameId) || GAMES[0];
        }
        const game = this.currentGame.module;
        this.host = this.tszm.createZHost({
            gameBytes: game.getBytes(),
            onText: (t: string) => {
                this.appendText(t);
                this.turnBuffer += t;
            },
            onEcho: (cmd: string) => this.appendText("> " + cmd + "\n", Theme.echoCps),
            onStatus: (s: string) => {
                this.lastStatusLine = s;
                this.renderStatus();
            },
            onQuit: () => this.appendText("\n[Game over]\n"),
            onError: (e: any) => {
                print("ZMachineHost fatal: " + e + (e && e.stack ? "\n" + e.stack : ""));
                this.appendText("\n[Interpreter error - see logger]\n");
            },
            onPrompt: (ctx: any) => {
                // A line prompt means the intro is over: stop auto-advancing
                // read_char so in-game menus/[MORE] respond to real presses.
                this.firstLinePromptSeen = true;
                if (ctx) {
                    this.lastContext = ctx;
                    for (const listener of this.sceneContextListeners) {
                        listener(ctx);
                    }
                }
                // Turn is complete: hand the accumulated text to the narrator.
                // With no narrator registered yet, keep the buffer (capped) so
                // a late-registering narrator can speak the opening text.
                if (this.narrationListener) {
                    // Collapse spaces but KEEP line breaks — the narrator
                    // turns them into natural pauses.
                    const turnText = this.turnBuffer
                        .replace(/[ \t]+/g, " ")
                        .replace(/\n{2,}/g, "\n")
                        .trim();
                    this.turnBuffer = "";
                    if (turnText.length > 0) {
                        this.latestTurnText = turnText.replace(/\s+/g, " ");
                        this.narrationListener(turnText);
                    }
                } else if (this.turnBuffer.length > 2000) {
                    this.turnBuffer = this.turnBuffer.slice(-2000);
                }
            },
            // Yield to the render loop between instruction batches so a long
            // turn can't stall a frame.
            yieldEvery: 5000,
            yieldFn: () => this.frameYield(),
        });

        print("ZMachineHost: started " + game.name + " (z" + game.zVersion + ", release " + game.release + ")");
    }

    private appendText(chunk: string, cps: number = Theme.outputCps): void {
        if (!this.loggedFirstText && chunk.trim().length > 0) {
            this.loggedFirstText = true;
            print("ZMachineHost: first output: " + chunk.trim().slice(0, 100));
        }
        if (this.typedReveal) {
            this.reveal.push(chunk, cps);
        } else {
            this.writeChars(chunk);
        }
    }

    /** Commit characters to the transcript model (wrap + scroll), then render. */
    private writeChars(chunk: string): void {
        for (const ch of chunk) {
            if (ch === "\n") {
                this.lines.push("");
                continue;
            }
            let line = this.lines[this.lines.length - 1] + ch;
            // Soft word-wrap: break at the last space once the column is exceeded.
            if (this.wrapColumn > 0 && line.length > this.wrapColumn) {
                const breakAt = line.lastIndexOf(" ");
                if (breakAt > 0) {
                    this.lines[this.lines.length - 1] = line.slice(0, breakAt);
                    this.lines.push(line.slice(breakAt + 1));
                    continue;
                }
            }
            this.lines[this.lines.length - 1] = line;
        }
        if (this.lines.length > this.maxLines) {
            this.lines = this.lines.slice(this.lines.length - this.maxLines);
        }
        this.renderTranscript();
    }

    private renderTranscript(): void {
        if (this.outputText) {
            // The cursor slot is always occupied (glyph or a same-advance space in
            // the monospace font), so blinking never changes the text extents —
            // a changing extent makes the Text rescale the whole block.
            const slot = this.cursorOn ? Theme.cursorGlyph : this.awaitingInput ? " " : "";
            this.outputText.text = this.lines.join("\n") + slot;
        }
    }

    private frameYield(): Promise<void> {
        return new Promise((resolve) => {
            const evt = this.createEvent("DelayedCallbackEvent");
            evt.bind(() => {
                this.removeEvent(evt);
                resolve();
            });
            evt.reset(0);
        });
    }

    /** Feed demo commands whenever the game is waiting for input. */
    private runDemo(): void {
        const tick = this.createEvent("DelayedCallbackEvent");
        tick.bind(() => {
            if (this.host && this.host.running() && this.demoCommands.length > 0) {
                if (this.awaitingInput) {
                    const cmd = this.demoCommands.shift()!;
                    print("ZMachineHost demo: > " + cmd);
                    this.submitCommand(cmd);
                }
                tick.reset(1.5);
            } else {
                print("ZMachineHost demo: finished");
                this.removeEvent(tick);
            }
        });
        tick.reset(2.0);
    }
}
