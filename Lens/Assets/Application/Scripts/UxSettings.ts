/**
 * Player-facing UX settings (docs/UX2-proposal.md §7). Currently one switch:
 * Effects Full / Reduced. Reduced turns off motion (typed reveal, cursor
 * blink, and later glitch cuts, float and horizon scroll) but keeps colour
 * and type. Persisted in PersistentStorageSystem so it survives restarts.
 */
const KEY_EFFECTS = "ifwhen.ux.effects";
const KEY_IMMERSIVE = "ifwhen.ux.immersive";

type Listener = (on: boolean) => void;

let loaded = false;
let reduced = false;
let immersive = true; // the room-sized spatial backdrop is the default
const listeners: Listener[] = [];
const immersiveListeners: Listener[] = [];

function store(): GeneralDataStore | null {
    // @ts-ignore - Lens runtime global
    const pss = global.persistentStorageSystem;
    return pss ? pss.store : null;
}

function load(): void {
    if (loaded) {
        return;
    }
    loaded = true;
    try {
        const s = store();
        reduced = s ? s.getString(KEY_EFFECTS) === "reduced" : false;
        immersive = s ? s.getString(KEY_IMMERSIVE) !== "off" : true;
    } catch (e) {
        reduced = false;
        immersive = true;
    }
}

export const UxSettings = {
    get effectsReduced(): boolean {
        load();
        return reduced;
    },

    setEffectsReduced(on: boolean): void {
        load();
        if (on === reduced) {
            return;
        }
        reduced = on;
        try {
            const s = store();
            if (s) {
                s.putString(KEY_EFFECTS, on ? "reduced" : "full");
            }
        } catch (e) {
            // persistence is best-effort
        }
        print("UxSettings: effects " + (on ? "REDUCED" : "full"));
        for (const l of listeners) {
            l(on);
        }
    },

    toggleEffects(): boolean {
        this.setEffectsReduced(!this.effectsReduced);
        return this.effectsReduced;
    },

    onEffectsChanged(l: Listener): void {
        listeners.push(l);
    },

    /**
     * Immersive ON: the Spatial Image renders as a room-sized backdrop.
     * OFF: it's contained in the Room Viewport (better text legibility).
     */
    get immersive(): boolean {
        load();
        return immersive;
    },

    toggleImmersive(): boolean {
        load();
        immersive = !immersive;
        try {
            const s = store();
            if (s) {
                s.putString(KEY_IMMERSIVE, immersive ? "on" : "off");
            }
        } catch (e) {
            // persistence is best-effort
        }
        print("UxSettings: immersive " + (immersive ? "ON" : "off"));
        for (const l of immersiveListeners) {
            l(immersive);
        }
        return immersive;
    },

    onImmersiveChanged(l: Listener): void {
        immersiveListeners.push(l);
    },
};
