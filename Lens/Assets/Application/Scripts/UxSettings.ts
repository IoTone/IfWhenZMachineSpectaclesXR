/**
 * Player-facing UX settings (docs/UX2-proposal.md §7). Currently one switch:
 * Effects Full / Reduced. Reduced turns off motion (typed reveal, cursor
 * blink, and later glitch cuts, float and horizon scroll) but keeps colour
 * and type. Persisted in PersistentStorageSystem so it survives restarts.
 */
const KEY_EFFECTS = "ifwhen.ux.effects";

type Listener = (reduced: boolean) => void;

let loaded = false;
let reduced = false;
const listeners: Listener[] = [];

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
    } catch (e) {
        reduced = false;
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
};
