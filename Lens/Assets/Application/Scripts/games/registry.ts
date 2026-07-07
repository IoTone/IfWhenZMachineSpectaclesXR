// Game library registry — one entry per bundled story file.
//
// The require() calls MUST stay static string literals at module scope (the
// Lens packager scans for literals; require(variable) fails at runtime).
// To add a game: embed it with tszm/tools/embed-game.js, require it here,
// append a GameEntry. Keep ratings G..PG-13 and record the distribution
// terms in docs/design-splash-and-menu.md + GAMES-LICENSES.md.
// @ts-ignore - require is provided by the Lens runtime
const miniZork = require("./MiniZork.js");
// @ts-ignore
const lostPig = require("./LostPig.js");
// @ts-ignore
const adventure = require("./Adventure.js");

export interface GameEntry {
    id: string;
    title: string;
    author: string;
    year: number;
    rating: "G" | "PG" | "PG-13";
    blurb: string;
    attribution: string;
    /** Embedded module: { name, zVersion, release, serial, getBytes() }. */
    module: any;
}

export const GAMES: GameEntry[] = [
    {
        id: "lostpig",
        title: "Lost Pig",
        author: "Admiral Jota",
        year: 2007,
        rating: "G",
        blurb: "Pig lost! Grunk the orc must find pig before pig get eaten or brokened. Funny, friendly, and perfect for first-time adventurers.",
        attribution: "Lost Pig (And Place Under Ground) by Admiral Jota. Freely distributable; from the IF Archive.",
        module: lostPig,
    },
    {
        id: "adventure",
        title: "Adventure",
        author: "Crowther & Woods",
        year: 1976,
        rating: "G",
        blurb: "The original Colossal Cave. Somewhere nearby is a cave with treasure, magic, and a maze of twisty little passages, all alike.",
        attribution: "Adventure by Will Crowther and Don Woods (public domain); Inform port by Graham Nelson.",
        module: adventure,
    },
    {
        id: "minizork",
        title: "Mini-Zork I",
        author: "Infocom",
        year: 1988,
        rating: "PG",
        blurb: "A compact tour of the Great Underground Empire: the white house, the troll, the thief, and glorious treasure.",
        attribution: "Mini-Zork I © Infocom/Activision. Included for development; distribution status under review.",
        module: miniZork,
    },
];

export function getGame(id: string): GameEntry | null {
    for (const g of GAMES) {
        if (g.id === id) {
            return g;
        }
    }
    return null;
}
