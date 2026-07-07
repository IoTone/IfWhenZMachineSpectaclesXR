import { SplashTunnel } from "./SplashTunnel";
import { ZMachineHost } from "./ZMachineHost";

/**
 * App state machine: SPLASH -> GAME (MENU state arrives with the library UI).
 *
 * The splash renders from the very first frame while the Z-engine boot is
 * deferred a beat behind it — masking the cold-start lag — then flies
 * through the tunnel and hands over to the game.
 */
@component
export class AppFlow extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    @input
    splash: SplashTunnel;

    /** Minimum time the splash stays up (seconds). */
    @input
    minSplashSeconds: number = 3.0;

    /**
     * Names of game-UI scene objects hidden while the splash runs (menu, mic,
     * transcript, illustration...). Resolved by walking the scene at awake —
     * before any OnStart fires — so those components also defer their own
     * initialization until reveal. Do NOT list the ZMachineHost object: the
     * interpreter's frame-yield events must keep firing so the game boots
     * behind the splash.
     */
    @input
    gameRigNames: string = "ScrollMenu,MicProp,Output,Status,SceneIllustration,SpatialFrame";

    private engineStarted: boolean = false;
    private rigs: SceneObject[] = [];

    onAwake() {
        this.collectRigs();
        this.setGameRigsEnabled(false);
        this.createEvent("OnStartEvent").bind(() => {
            // Let the splash render a couple of frames before paying the
            // engine-boot cost (bundle require + game decode).
            const boot = this.createEvent("DelayedCallbackEvent");
            boot.bind(() => {
                this.engineStarted = true;
                this.zmHost.beginSession();
            });
            boot.reset(0.15);

            const advance = this.createEvent("DelayedCallbackEvent");
            advance.bind(() => {
                if (this.engineStarted) {
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
