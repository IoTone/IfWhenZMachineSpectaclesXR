import { GoogleGenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/GoogleGenAITypes";
import {
    RemoteServiceGatewayCredentials,
    AvaliableApiTypes,
} from "RemoteServiceGateway.lspkg/RemoteServiceGatewayCredentials";
import { ZMachineHost } from "./ZMachineHost";

const RSM_IMAGEN = requireAsset(
    "../../RemoteServiceGateway.lspkg/HostedExternal/RemoteServiceModules/Imagen_Sync.remoteServiceModule"
) as RemoteServiceModule;
const RSM_GEMINI = requireAsset(
    "../../RemoteServiceGateway.lspkg/HostedExternal/RemoteServiceModules/Gemini_Sync.remoteServiceModule"
) as RemoteServiceModule;

/**
 * Image models tried in order. Google retires model names without notice
 * (imagen-3.0-generate-002 now 404s through the RSG proxy), so a NOT_FOUND
 * falls through to the next entry; the first one that works is remembered
 * for the session. "gemini:" entries use Gemini's native image output.
 */
const IMAGE_MODELS: string[] = [
    // Gemini first: every Imagen name 404s through the proxy (2026-09-22..25),
    // and trying them first cost ~0.8 s on each session's first image.
    "gemini:gemini-2.5-flash-image",
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
];

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

    /**
     * Persist generated images across sessions (PersistentStorageSystem). Off
     * by default: a room is stable within a play session (in-memory cache) but
     * gets fresh art next session — see randomizeSeed. Turn on for a fully
     * consistent, mappable world (and to skip regeneration cost each session).
     */
    @input
    persistAcrossSessions: boolean = false;

    /**
     * Use a random Imagen seed each generation so re-illustrated rooms (new
     * session, or a cache miss) look different. With a fixed seed the same
     * prompt reproduces near-identical art.
     */
    @input
    randomizeSeed: boolean = true;

    private memCache: { [key: string]: Texture } = {};
    /**
     * Normalized description-sentence set each cached room's image was made
     * from, so a re-entry can tell a genuine state change (a NEW sentence
     * appears — e.g. the moved rug revealing a trap door) from a brief revisit
     * (a subset of the original sentences). See descriptionChangedFor.
     */
    private descCache: { [key: string]: { [sentence: string]: boolean } } = {};
    private lastRoom: string | null = null;
    private generating: boolean = false;
    private authFailed: boolean = false;
    private store: GeneralDataStore | null = null;
    /** Room that changed while a generation was in flight; served next. */
    private pendingRoom: string | null = null;

    /**
     * Scene-loading UX hooks (SceneLoadingIndicator). Fired around the
     * room-change illustration lifecycle:
     *  - onSceneLoadStart : a new room was entered; old image unloaded.
     *  - onImageShown     : an illustration is now on screen.
     *  - onImageUnavailable: no illustration will appear (offline/auth/decode).
     */
    private loadingListener: {
        onSceneLoadStart?: (room: string) => void;
        onImageShown?: (room: string) => void;
        onImageUnavailable?: (room: string) => void;
    } | null = null;

    public setLoadingListener(l: {
        onSceneLoadStart?: (room: string) => void;
        onImageShown?: (room: string) => void;
        onImageUnavailable?: (room: string) => void;
    }): void {
        this.loadingListener = l;
    }

    private fireSceneLoadStart(room: string): void {
        if (this.loadingListener && this.loadingListener.onSceneLoadStart) {
            this.loadingListener.onSceneLoadStart(room);
        }
    }
    private fireImageShown(room: string): void {
        if (this.loadingListener && this.loadingListener.onImageShown) {
            this.loadingListener.onImageShown(room);
        }
    }
    private fireImageUnavailable(room: string): void {
        if (this.loadingListener && this.loadingListener.onImageUnavailable) {
            this.loadingListener.onImageUnavailable(room);
        }
    }

    /** Hide both display paths (no image yet / stale image must not show). */
    public hideImages(): void {
        if (this.flatImage) {
            this.flatImage.getSceneObject().enabled = false;
        }
        if (this.spatialFrame) {
            this.spatialFrame.getSceneObject().enabled = false;
        }
    }

    onAwake() {
        // @ts-ignore - Lens runtime global
        this.store = global.persistentStorageSystem ? global.persistentStorageSystem.store : null;
        this.createEvent("OnStartEvent").bind(() => {
            // Nothing to show yet: the Image component's default texture is
            // a white placeholder that must never reach the player's eyes.
            this.hideImages();
            // Fill the RSG token store up front: both Imagen and the Spatial
            // Image queue read it, including on cache-hit paths that never
            // call generate().
            this.ensureCredentials();
            // Code-driven layout: park the spatial frame at the illustration
            // slot above the status line (local to the IFThen rig).
            if (this.spatialFrame) {
                // Slightly in front of the flat plane: when the mesh renders
                // it covers the flat image; when it doesn't, the flat remains.
                this.spatialFrame
                    .getSceneObject()
                    .getTransform()
                    .setLocalPosition(new vec3(-6, 19, 2));
                // Size the portal to the illustration slot; component defaults
                // (frameHeight 60, frameOffset -100) render a room-sized
                // backdrop a meter behind the rig.
                // spatialHeight <= 0 means: keep the component's native
                // portal size (frameHeight 100 / offset -200 / depth 100 —
                // the large backdrop look). Set a positive height to shrink.
                if (this.spatialHeight > 0) {
                    try {
                        const offset =
                            this.spatialOffset !== 0
                                ? this.spatialOffset
                                : (-200 * this.spatialHeight) / 100;
                        const depth = this.spatialDepth > 0 ? this.spatialDepth : this.spatialHeight;
                        (this.spatialFrame as any).setMaterialProperties(this.spatialHeight, offset, depth);
                        print("RoomIllustrator: spatial portal h=" + this.spatialHeight + " off=" + offset + " d=" + depth);
                    } catch (e) {
                        print("RoomIllustrator: could not size spatial frame (" + e + ")");
                    }
                } else {
                    print("RoomIllustrator: spatial portal at native size");
                }
                // Progressive display: the flat plane stays visible until the
                // spatialized mesh has actually loaded.
                try {
                    (this.spatialFrame as any).onLoaded.add(() => {
                        // Keep the flat image enabled as a backstop; the
                        // spatial portal sits in front and covers it.
                        print("RoomIllustrator: spatialized mesh ready");
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

    private lastGameKey: string | null = null;

    private onContext(ctx: any): void {
        // Game switch: the previous story's image must never linger into the
        // next one. Hide both display paths until the new game illustrates.
        const gameKey = this.zmHost ? this.zmHost.gameKey : "unknown";
        if (gameKey !== this.lastGameKey) {
            this.lastGameKey = gameKey;
            this.lastRoom = null;
            this.pendingRoom = null;
            this.hideImages();
        }
        if (!ctx || !ctx.room) {
            return;
        }
        const changed = ctx.room !== this.lastRoom;
        this.lastRoom = ctx.room;
        if (changed) {
            // Unload the previous room's image immediately so the loading
            // dialog (SceneLoadingIndicator) shows in its place, then signal
            // the start of the scene-loading sequence.
            this.hideImages();
            this.fireSceneLoadStart(ctx.room);
        }
        // Illustrate on room change; retry each turn if the current room still
        // has no image; and re-illustrate a cached room whose description
        // materially changed this turn (a state change, or an explicit "look").
        const key = this.cacheKey(ctx.room);
        const uncached = !this.memCache[key];
        const descChanged = !uncached && !this.generating && this.descriptionChangedFor(key, ctx.room);
        if (changed || descChanged || (uncached && !this.generating && !this.authFailed)) {
            this.illustrate(ctx.room);
        }
    }

    private cacheKey(room: string): string {
        return "ill-" + this.zmHost.gameKey + "-" + room.replace(/[^a-z0-9]+/gi, "_");
    }

    /**
     * The turn's printed text with the leading room-name header removed, or
     * null if this turn did NOT lead with the room name — i.e. it wasn't a room
     * description (movement/"look") but an action result like "Taken." (which
     * we must ignore, or picking things up would re-illustrate). lastTurnText is
     * already whitespace-collapsed, so the header is the room name at the front.
     */
    private descriptionBody(room: string): string | null {
        const raw = (this.zmHost.lastTurnText || "").trim();
        const roomName = room.trim();
        if (roomName.length === 0 || raw.toLowerCase().indexOf(roomName.toLowerCase()) !== 0) {
            return null;
        }
        return raw.slice(roomName.length).trim();
    }

    /** Normalized description sentences for this turn, or null if not a room
     *  description (see descriptionBody). Stripping the room name keeps the
     *  brief revisit ("<room> <object lines>") a clean subset of the first
     *  visit's sentences. */
    private descriptionSentences(room: string): string[] | null {
        const body = this.descriptionBody(room);
        if (body === null) {
            return null;
        }
        const out: string[] = [];
        for (const s of body.split(/[.!?]+\s+/)) {
            const t = s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
            if (t.length > 0) {
                out.push(t);
            }
        }
        return out;
    }

    private snapshotDescription(room: string): { [sentence: string]: boolean } {
        const set: { [sentence: string]: boolean } = {};
        const sentences = this.descriptionSentences(room);
        if (sentences) {
            for (const s of sentences) {
                set[s] = true;
            }
        }
        return set;
    }

    /**
     * True when a cached room re-prints a description this turn that introduces
     * a sentence not present when we illustrated it — a genuine state change
     * (rug moved to reveal a trap door, a room floods or is lit). A brief
     * revisit (subset of the original sentences) and non-description turns
     * ("Taken.") both return false, so they keep the cached image.
     */
    private descriptionChangedFor(key: string, room: string): boolean {
        const sentences = this.descriptionSentences(room);
        if (sentences === null) {
            return false;
        }
        const baseline = this.descCache[key];
        if (!baseline) {
            return false;
        }
        for (const s of sentences) {
            if (!baseline[s]) {
                return true;
            }
        }
        return false;
    }

    private illustrate(room: string): void {
        const key = this.cacheKey(room);
        // Layer 1: in-memory — reuse unless the room's description changed.
        const cached = this.memCache[key];
        if (cached && !this.descriptionChangedFor(key, room)) {
            this.display(cached, room, "memory");
            return;
        }
        if (cached) {
            print("RoomIllustrator: '" + room + "' description changed - re-illustrating");
            this.generate(room, key);
            return;
        }
        // Layer 2: persistent base64 (opt-in; off by default for per-session variety)
        if (this.persistAcrossSessions && this.store) {
            const b64 = this.store.getString(key);
            if (b64 && b64.length > 0) {
                Base64.decodeTextureAsync(
                    b64,
                    (texture: Texture) => {
                        this.memCache[key] = texture;
                        this.descCache[key] = this.snapshotDescription(room);
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

    /** The Google token straight from the credentials component's inputs. */
    private googleToken(): string {
        const fromComponent = this.credentials ? (this.credentials as any).googleToken : null;
        if (typeof fromComponent === "string" && fromComponent.length > 0 && fromComponent.indexOf("[INSERT") === -1) {
            return fromComponent;
        }
        return RemoteServiceGatewayCredentials.getApiToken(AvaliableApiTypes.Google) || "";
    }

    /** Index into IMAGE_MODELS of the model to try first (last one that worked). */
    private modelIndex: number = 0;

    /**
     * Base64 image for the prompt, walking IMAGE_MODELS from index i and
     * skipping models the proxy reports as NOT_FOUND. Other errors (auth,
     * network, quota) propagate unchanged.
     */
    private generateWithFallback(prompt: string, seed: number, i: number): Promise<string | null> {
        const model = IMAGE_MODELS[i];
        const attempt =
            model.indexOf("gemini:") === 0
                ? this.requestGeminiImage(model.slice("gemini:".length), prompt)
                : this.requestImagen({
                      model: model,
                      body: {
                          parameters: {
                              sampleCount: 1,
                              addWatermark: false,
                              aspectRatio: "4:3",
                              enhancePrompt: true,
                              seed: seed,
                          },
                          instances: [{ prompt: prompt }],
                      },
                  }).then((response) => {
                      const prediction = response.predictions && response.predictions[0];
                      return prediction && prediction.bytesBase64Encoded ? prediction.bytesBase64Encoded : null;
                  });
        return attempt.then(
            (b64) => {
                if (this.modelIndex !== i) {
                    print("RoomIllustrator: using image model " + model);
                    this.modelIndex = i;
                }
                return b64;
            },
            (error) => {
                const message = String(error);
                if (message.indexOf("NOT_FOUND") !== -1 && i + 1 < IMAGE_MODELS.length) {
                    print("RoomIllustrator: image model " + model + " unavailable, trying " + IMAGE_MODELS[i + 1]);
                    return this.generateWithFallback(prompt, seed, i + 1);
                }
                throw error;
            }
        );
    }

    /** Gemini native image generation (responseModalities IMAGE) via RSG. */
    private requestGeminiImage(model: string, prompt: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const apiToken = this.googleToken();
            if (apiToken.length === 0) {
                reject(new Error("Gemini API token not configured"));
                return;
            }
            const apiRequest = RemoteApiRequest.create();
            apiRequest.endpoint = "models";
            apiRequest.parameters = { "api-token": apiToken, model: model, type: "generateContent" };
            apiRequest.body = JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt + ". Landscape 4:3 composition." }] }],
                generationConfig: { responseModalities: ["IMAGE"] },
            });
            RSM_GEMINI.performApiRequest(apiRequest, (response) => {
                if (response.statusCode !== 1) {
                    reject(new Error(response.body));
                    return;
                }
                try {
                    const json = JSON.parse(response.body);
                    const parts =
                        (json.candidates && json.candidates[0] && json.candidates[0].content &&
                            json.candidates[0].content.parts) || [];
                    let said = "";
                    for (const part of parts) {
                        const inline = part.inlineData || part.inline_data;
                        if (inline && inline.data) {
                            resolve(inline.data);
                            return;
                        }
                        if (part.text) {
                            said += part.text;
                        }
                    }
                    // No image: say why (finish reason, safety block, or a text-only reply).
                    const cand = json.candidates && json.candidates[0];
                    const block = json.promptFeedback && json.promptFeedback.blockReason;
                    print(
                        "RoomIllustrator: Gemini returned no image (finishReason=" + (cand ? cand.finishReason : "none") +
                            (block ? ", blockReason=" + block : "") +
                            (said ? ', text="' + said.slice(0, 140) + '"' : "") + ")"
                    );
                    resolve(null);
                } catch (e) {
                    reject(new Error("Failed to parse Gemini image response: " + e));
                }
            });
        });
    }

    /**
     * Imagen request via the RSG remote service module. Mirrors the package's
     * Imagen.generateImage, but takes the token from googleToken() instead of
     * the package's static store: RemoteServiceGateway.lspkg exists in both
     * Assets/ and Packages/, and which copy's static store the credentials
     * component fills depends on load order.
     */
    private requestImagen(
        request: GoogleGenAITypes.Imagen.ImagenRequest
    ): Promise<GoogleGenAITypes.Imagen.ImagenResponse> {
        return new Promise((resolve, reject) => {
            const apiToken = this.googleToken();
            if (apiToken.length === 0) {
                reject(new Error("Imagen API token not configured"));
                return;
            }
            const apiRequest = RemoteApiRequest.create();
            apiRequest.endpoint = "imagen";
            apiRequest.parameters = { "api-token": apiToken, model: request.model };
            apiRequest.body = JSON.stringify(request.body);
            RSM_IMAGEN.performApiRequest(apiRequest, (response) => {
                if (response.statusCode !== 1) {
                    reject(new Error(response.body));
                    return;
                }
                try {
                    resolve(JSON.parse(response.body) as GoogleGenAITypes.Imagen.ImagenResponse);
                } catch (e) {
                    reject(new Error("Failed to parse Imagen API response: " + e));
                }
            });
        });
    }

    /**
     * Best-effort sync of the component's tokens into the static store this
     * module sees (the Spatial Image service reads it too). Always runs: the
     * store being populated here says nothing about the other package copy.
     */
    private ensureCredentials(): void {
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

    /** Extra immediate attempts when the model returns no image. */
    private static readonly EMPTY_RETRIES = 2;

    private generate(room: string, key: string): void {
        if (this.authFailed) {
            this.fireImageUnavailable(room); // text-only; let the loading UX clear
            return; // token missing; stay text-only without spamming the API
        }
        if (this.generating) {
            this.pendingRoom = room; // served as soon as the current one finishes
            return;
        }
        this.ensureCredentials();
        this.generating = true;
        const prompt = this.buildPrompt(room);
        // Snapshot the description this image is being made from, so a later
        // re-entry can tell whether the room has materially changed.
        const descSnapshot = this.snapshotDescription(room);
        const seed = this.randomizeSeed ? Math.floor(Math.random() * 1000000) : 0;
        print('RoomIllustrator: generating "' + room + '" (seed ' + seed + ')');
        // Gemini sometimes answers an image request with no image; retry a
        // couple of times right away instead of leaving the room blank until
        // the player's next command.
        const attempt = (tries: number): Promise<string | null> =>
            this.generateWithFallback(prompt, seed + tries, this.modelIndex).then((b64) => {
                if (!b64 && tries < RoomIllustrator.EMPTY_RETRIES && this.lastRoom === room) {
                    print("RoomIllustrator: empty image for " + room + ", retry " + (tries + 1));
                    return attempt(tries + 1);
                }
                return b64;
            });
        attempt(0)
            .then((b64) => {
                this.generating = false;
                this.drainPending();
                if (!b64) {
                    print("RoomIllustrator: empty image response for " + room);
                    this.fireImageUnavailable(room);
                    return;
                }
                this.persist(key, b64);
                Base64.decodeTextureAsync(
                    b64,
                    (texture: Texture) => {
                        this.memCache[key] = texture;
                        this.descCache[key] = descSnapshot;
                        this.display(texture, room, "generated");
                    },
                    () => {
                        print("RoomIllustrator: failed to decode generated image for " + room);
                        this.fireImageUnavailable(room);
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
                this.fireImageUnavailable(room);
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
        if (!this.persistAcrossSessions || !this.store) {
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
                this.spatialFrame.getSceneObject().enabled = true;
                (this.spatialFrame as any).setImage(texture, true);
            } catch (e) {
                print("RoomIllustrator: spatialization unavailable (" + e + ")");
            }
        }
        this.fireImageShown(room);
    }
}
