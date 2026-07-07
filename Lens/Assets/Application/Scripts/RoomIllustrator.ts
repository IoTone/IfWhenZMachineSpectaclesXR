import { Imagen } from "RemoteServiceGateway.lspkg/HostedExternal/Imagen";
import { GoogleGenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/GoogleGenAITypes";
import {
    RemoteServiceGatewayCredentials,
    AvaliableApiTypes,
} from "RemoteServiceGateway.lspkg/RemoteServiceGatewayCredentials";
import { ZMachineHost } from "./ZMachineHost";

/**
 * Illustrates the current game room (R5/R10 — hybrid pipeline):
 *
 *   room change -> cache check -> Imagen generation (via Snap's Remote
 *   Service Gateway, Snap-minted Google token) -> flat display immediately
 *   -> Spatial Image spatialization (Snap's own genai cloud service) when a
 *   SpatialImageFrame is wired.
 *
 * Cache layers (never regenerate a room we've seen):
 *   1. in-memory Map<roomKey, Texture>          (this session, instant)
 *   2. PersistentStorageSystem base64 string    (across sessions; Snap may
 *      clear it after 60 days idle — regeneration is always a valid path)
 *
 * Degrades gracefully: no token / no connectivity -> quiet log, text-only.
 */
@component
export class RoomIllustrator extends BaseScriptComponent {
    @input
    zmHost: ZMachineHost;

    /** Flat display target (the SceneIllustration Image component). */
    @input
    @allowUndefined
    flatImage: Image;

    /**
     * Optional: the Spatial Image custom component's frame (SpatialImageFrame
     * script). When wired, generated textures are spatialized via
     * setImage(texture, true). Duck-typed to avoid a hard package dependency.
     */
    @input
    @allowUndefined
    spatialFrame: ScriptComponent;

    /**
     * The RemoteServiceGatewayCredentials component in the scene. The package
     * exists twice in the project's module graph, so the component's own
     * awake-time static copy can land in the wrong module instance; we copy
     * its token inputs into the instance Imagen actually imports.
     */
    @input
    @allowUndefined
    credentials: ScriptComponent;

    /** Spatial portal size/depth (see Spatial Image setMaterialProperties). */
    @input
    spatialHeight: number = 14;

    @input
    spatialOffset: number = 0;

    @input
    spatialDepth: number = 15;

    @input
    @widget(new TextAreaWidget())
    stylePrompt: string =
        "Painterly storybook illustration for a classic text adventure, atmospheric, muted colors, no text, no letters, no watermark";

    /** Generate at most this many chars of room description into the prompt. */
    @input
    maxDescriptionChars: number = 220;

    private memCache: { [key: string]: Texture } = {};
    private lastRoom: string | null = null;
    private generating: boolean = false;
    private authFailed: boolean = false;
    private store: GeneralDataStore | null = null;
    /** Room that changed while a generation was in flight; served next. */
    private pendingRoom: string | null = null;

    onAwake() {
        // @ts-ignore - Lens runtime global
        this.store = global.persistentStorageSystem ? global.persistentStorageSystem.store : null;
        this.createEvent("OnStartEvent").bind(() => {
            // Fill the RSG token store up front: both Imagen and the Spatial
            // Image queue read it, including on cache-hit paths that never
            // call generate().
            this.ensureCredentials();
            // Code-driven layout: park the spatial frame at the illustration
            // slot above the status line (local to the IFThen rig).
            if (this.spatialFrame) {
                this.spatialFrame
                    .getSceneObject()
                    .getTransform()
                    .setLocalPosition(new vec3(-6, 19, 0));
                // Size the portal to the illustration slot; component defaults
                // (frameHeight 60, frameOffset -100) render a room-sized
                // backdrop a meter behind the rig.
                try {
                    (this.spatialFrame as any).setMaterialProperties(
                        this.spatialHeight,
                        this.spatialOffset,
                        this.spatialDepth
                    );
                } catch (e) {
                    print("RoomIllustrator: could not size spatial frame (" + e + ")");
                }
                // Progressive display: the flat plane stays visible until the
                // spatialized mesh has actually loaded.
                try {
                    (this.spatialFrame as any).onLoaded.add(() => {
                        print("RoomIllustrator: spatialized mesh ready");
                        if (this.flatImage) {
                            this.flatImage.getSceneObject().enabled = false;
                        }
                    });
                } catch (e) {
                    print("RoomIllustrator: no onLoaded event (" + e + ")");
                }
            }
            if (this.zmHost) {
                this.zmHost.addSceneContextListener((ctx: any) => this.onContext(ctx));
                print("RoomIllustrator: ready" + (this.spatialFrame ? " (spatialization armed)" : " (flat only)"));
            }
        });
    }

    private onContext(ctx: any): void {
        if (!ctx || !ctx.room) {
            return;
        }
        const changed = ctx.room !== this.lastRoom;
        this.lastRoom = ctx.room;
        // Illustrate on room change — and also retry each turn if the current
        // room still has no image (earlier attempt failed or was skipped).
        const uncached = !this.memCache[this.cacheKey(ctx.room)];
        if (changed || (uncached && !this.generating && !this.authFailed)) {
            this.illustrate(ctx.room);
        }
    }

    private cacheKey(room: string): string {
        return "ill-" + this.zmHost.gameKey + "-" + room.replace(/[^a-z0-9]+/gi, "_");
    }

    private illustrate(room: string): void {
        const key = this.cacheKey(room);
        // Layer 1: in-memory
        const cached = this.memCache[key];
        if (cached) {
            this.display(cached, room, "memory");
            return;
        }
        // Layer 2: persistent base64
        if (this.store) {
            const b64 = this.store.getString(key);
            if (b64 && b64.length > 0) {
                Base64.decodeTextureAsync(
                    b64,
                    (texture: Texture) => {
                        this.memCache[key] = texture;
                        this.display(texture, room, "persistent");
                    },
                    () => {
                        print("RoomIllustrator: cached image for " + room + " failed to decode, regenerating");
                        this.generate(room, key);
                    }
                );
                return;
            }
        }
        // Layer 3: generate
        this.generate(room, key);
    }

    private buildPrompt(room: string): string {
        let description = this.zmHost.lastTurnText || "";
        if (description.length > this.maxDescriptionChars) {
            description = description.slice(0, this.maxDescriptionChars);
        }
        return this.stylePrompt + ". Scene: " + room + ". " + description;
    }

    /** Ensure the module instance Imagen imports actually holds the tokens. */
    private ensureCredentials(): void {
        const current = RemoteServiceGatewayCredentials.getApiToken(AvaliableApiTypes.Google) || "";
        if (current.length > 0 && current.indexOf("[INSERT") === -1) {
            return; // already populated
        }
        if (!this.credentials) {
            return;
        }
        const source = this.credentials as any;
        const statics = RemoteServiceGatewayCredentials as any;
        for (const field of ["googleToken", "snapToken", "openAIToken"]) {
            const token = source[field];
            if (typeof token === "string" && token.length > 0 && token.indexOf("[INSERT") === -1) {
                statics[field] = token;
            }
        }
        const after = RemoteServiceGatewayCredentials.getApiToken(AvaliableApiTypes.Google) || "";
        print("RoomIllustrator: credentials sync (google token " + (after.length > 0 ? "present" : "MISSING") + ")");
    }

    private generate(room: string, key: string): void {
        if (this.authFailed) {
            return; // token missing; stay text-only without spamming the API
        }
        if (this.generating) {
            this.pendingRoom = room; // served as soon as the current one finishes
            return;
        }
        this.ensureCredentials();
        this.generating = true;
        const prompt = this.buildPrompt(room);
        print('RoomIllustrator: generating "' + room + '"');
        const request: GoogleGenAITypes.Imagen.ImagenRequest = {
            model: "imagen-3.0-generate-002",
            body: {
                parameters: {
                    sampleCount: 1,
                    addWatermark: false,
                    aspectRatio: "4:3",
                    enhancePrompt: true,
                    language: "en",
                    seed: 0,
                },
                instances: [{ prompt: prompt }],
            },
        };
        Imagen.generateImage(request)
            .then((response) => {
                this.generating = false;
                this.drainPending();
                const prediction = response.predictions && response.predictions[0];
                if (!prediction || !prediction.bytesBase64Encoded) {
                    print("RoomIllustrator: empty Imagen response for " + room);
                    return;
                }
                const b64 = prediction.bytesBase64Encoded;
                this.persist(key, b64);
                Base64.decodeTextureAsync(
                    b64,
                    (texture: Texture) => {
                        this.memCache[key] = texture;
                        this.display(texture, room, "generated");
                    },
                    () => {
                        print("RoomIllustrator: failed to decode generated image for " + room);
                    }
                );
            })
            .catch((error) => {
                this.generating = false;
                this.drainPending();
                const message = String(error);
                if (message.indexOf("token not configured") !== -1 || message.indexOf("unauthorized") !== -1) {
                    this.authFailed = true;
                    print("RoomIllustrator: no Imagen credentials - illustrations disabled (" + message + ")");
                } else {
                    print("RoomIllustrator: generation failed for " + room + ": " + message);
                }
            });
    }

    /** If the player moved on during a generation, illustrate where they are now. */
    private drainPending(): void {
        const next = this.pendingRoom;
        this.pendingRoom = null;
        if (next && next === this.lastRoom && !this.memCache[this.cacheKey(next)]) {
            this.illustrate(next);
        }
    }

    private persist(key: string, b64: string): void {
        if (!this.store) {
            return;
        }
        try {
            this.store.putString(key, b64);
        } catch (e) {
            print("RoomIllustrator: persistent cache full or write failed (" + e + ")");
        }
    }

    private display(texture: Texture, room: string, source: string): void {
        print("RoomIllustrator: showing " + room + " (" + source + ")");
        // Flat image first — always visible immediately, never blocked on the
        // spatialization service. The spatial frame's onLoaded handler hides
        // it once the depth mesh is really there.
        if (this.flatImage) {
            const material = this.flatImage.mainMaterial.clone();
            this.flatImage.mainMaterial = material;
            this.flatImage.mainPass.baseTex = texture;
            this.flatImage.getSceneObject().enabled = true;
        }
        if (this.spatialFrame) {
            try {
                (this.spatialFrame as any).setImage(texture, true);
            } catch (e) {
                print("RoomIllustrator: spatialization unavailable (" + e + ")");
            }
        }
    }
}
