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
// @ts-ignore
const miniZorkModule = require("./games/MiniZork.js");

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

    private host: any = null;
    private tszm: any = null;
    private lines: string[] = [""];
    private loggedFirstText: boolean = false;
    private lastContext: any = null;
    private sceneContextListeners: ((ctx: any) => void)[] = [];
    private narrationListener: ((text: string) => void) | null = null;
    private turnBuffer: string = "";
    private latestTurnText: string = "";
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
            this.startGame();
        });
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
        if (this.illustration) {
            this.illustration.getTransform().setLocalPosition(new vec3(-6, 19, 0));
            this.illustration.getTransform().setLocalScale(new vec3(12, 7.5, 1));
        }
    }

    /** Public API: send a player command to the game. */
    public submitCommand(cmd: string): void {
        if (this.host) {
            this.host.device.pushInput(cmd);
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
        if (this.host) {
            this.host.stop();
            this.host = null;
        }
        this.lines = [""];
        this.loggedFirstText = false;
        if (this.statusText) {
            this.statusText.text = "";
        }
        this.launchGame();
        print("ZMachineHost: game restarted");
    }

    private startGame(): void {
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

        this.launchGame();
        if (this.autoDemo) {
            this.runDemo();
        }
    }

    private launchGame(): void {
        const game = miniZorkModule;
        this.host = this.tszm.createZHost({
            gameBytes: game.getBytes(),
            onText: (t: string) => {
                this.appendText(t);
                this.turnBuffer += t;
            },
            onEcho: (cmd: string) => this.appendText("> " + cmd + "\n"),
            onStatus: (s: string) => {
                if (this.statusText) {
                    this.statusText.text = s;
                }
            },
            onQuit: () => this.appendText("\n[Game over]\n"),
            onError: (e: any) => {
                print("ZMachineHost fatal: " + e + (e && e.stack ? "\n" + e.stack : ""));
                this.appendText("\n[Interpreter error - see logger]\n");
            },
            onPrompt: (ctx: any) => {
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
                    const turnText = this.turnBuffer.replace(/\s+/g, " ").trim();
                    this.turnBuffer = "";
                    if (turnText.length > 0) {
                        this.latestTurnText = turnText;
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

    private appendText(chunk: string): void {
        if (!this.loggedFirstText && chunk.trim().length > 0) {
            this.loggedFirstText = true;
            print("ZMachineHost: first output: " + chunk.trim().slice(0, 100));
        }
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
        if (this.outputText) {
            this.outputText.text = this.lines.join("\n");
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
