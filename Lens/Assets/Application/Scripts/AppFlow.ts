import { GameLibraryMenu } from "./GameLibraryMenu";
import { SplashTunnel } from "./SplashTunnel";
import { ZMachineHost } from "./ZMachineHost";

/**
 * App state machine: SPLASH -> MENU (game library) -> GAME.
 *
 * The splash owns the first frames (all game UI is hidden during awake, so
 * those components defer initialization too), flies through the tunnel into
 * the library menu, and the menu's Play launches the chosen game. The
 * in-game "Game Library" button calls showLibrary() to come back.
 *
 * Without a libraryMenu wired, falls back to SPLASH -> GAME with the
 * engine pre-booting behind the splash.
 */
@component
export class AppFlow extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    @input
    splash: SplashTunnel;

    @input
    @allowUndefined
    libraryMenu: GameLibraryMenu;

    /** Minimum time the splash stays up (seconds). */
    @input
    minSplashSeconds: number = 3.0;

    /**
     * Names of game-UI scene objects hidden while the splash/menu is up
     * (menu, mic, transcript, illustration...). Resolved by walking the
     * scene at awake — before any OnStart fires — so those components also
     * defer their own initialization until reveal. Do NOT list the
     * ZMachineHost object: the interpreter's frame-yield events must keep
     * firing for the game to run.
     */
    @input
    gameRigNames: string = "ScrollMenu,MicProp,Output,Status,SceneIllustration,SpatialFrame,RoomIllustrator";

    private engineStarted: boolean = false;
    private rigs: SceneObject[] = [];

    onAwake() {
        this.collectRigs();
        this.setGameRigsEnabled(false);
        if (this.libraryMenu) {
            this.libraryMenu.getSceneObject().enabled = false;
        }
        this.createEvent("OnStartEvent").bind(() => {
            if (this.libraryMenu) {
                this.libraryMenu.onPlay = (id: string) => this.launchGame(id);
            } else {
                // No menu: pre-boot the engine a beat behind the splash.
                const boot = this.createEvent("DelayedCallbackEvent");
                boot.bind(() => {
                    this.engineStarted = true;
                    this.zmHost.beginSession();
                });
                boot.reset(0.15);
            }

            const advance = this.createEvent("DelayedCallbackEvent");
            advance.bind(() => {
                if (this.libraryMenu) {
                    this.splash.flyThrough(() => {
                        this.libraryMenu.getSceneObject().enabled = true;
                        print("AppFlow: splash done, library open");
                    });
                } else if (this.engineStarted) {
                    this.splash.flyThrough(() => {
                        this.setGameRigsEnabled(true);
                        print("AppFlow: splash done, game on");
                    });
                } else {
                    advance.reset(0.25); // engine still booting; check again
                }
            });
            advance.reset(this.minSplashSeconds);
        });
    }

    /** Launch a library game: hide the menu, reveal the game UI, boot. */
    public launchGame(id: string): void {
        if (this.libraryMenu) {
            this.libraryMenu.getSceneObject().enabled = false;
        }
        this.setGameRigsEnabled(true);
        this.zmHost.launchGameById(id);
        print("AppFlow: game on (" + id + ")");
    }

    /** Return to the library (in-game "Game Library" button). */
    public showLibrary(): void {
        this.setGameRigsEnabled(false);
        if (this.libraryMenu) {
            this.libraryMenu.getSceneObject().enabled = true;
        }
        print("AppFlow: library open");
    }

    private collectRigs(): void {
        const wanted: { [name: string]: boolean } = {};
        for (const n of this.gameRigNames.split(",")) {
            if (n.trim().length > 0) {
                wanted[n.trim()] = true;
            }
        }
        const visit = (o: SceneObject) => {
            if (wanted[o.name]) {
                this.rigs.push(o);
            }
            for (let i = 0; i < o.getChildrenCount(); i++) {
                visit(o.getChild(i));
            }
        };
        // @ts-ignore - global.scene is a Lens runtime API
        const scene = global.scene;
        for (let i = 0; i < scene.getRootObjectsCount(); i++) {
            visit(scene.getRootObject(i));
        }
        print("AppFlow: hiding " + this.rigs.length + " game rig(s) during splash");
    }

    private setGameRigsEnabled(on: boolean): void {
        for (const rig of this.rigs) {
            if (rig) {
                rig.enabled = on;
            }
        }
    }
}
