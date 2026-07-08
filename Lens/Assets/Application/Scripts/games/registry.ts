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
// @ts-ignore
const dreamhold = require("./Dreamhold.js");
// @ts-ignore
const bronze = require("./Bronze.js");
// @ts-ignore
const suvehNux = require("./SuvehNux.js");
// @ts-ignore
const nineOhFive = require("./NineOhFive.js");
// @ts-ignore
const photopia = require("./Photopia.js");
// @ts-ignore
const spiderAndWeb = require("./SpiderAndWeb.js");
// @ts-ignore
const violet = require("./Violet.js");
// @ts-ignore
const slouching = require("./SlouchingTowardsBedlam.js");

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
        id: "dreamhold",
        title: "The Dreamhold",
        author: "Andrew Plotkin",
        year: 2004,
        rating: "PG",
        blurb: "You wake in a wizard's silent stronghold with no memory. A patient tutorial voice makes this the gentlest doorway into interactive fiction.",
        attribution: "The Dreamhold by Andrew Plotkin. Freely distributable; from the IF Archive.",
        module: dreamhold,
    },
    {
        id: "bronze",
        title: "Bronze",
        author: "Emily Short",
        year: 2006,
        rating: "PG",
        blurb: "Beauty and the Beast, retold. Explore the Beast's castle and unravel the bargain that binds him. Adaptive hints guide you.",
        attribution: "Bronze by Emily Short. Creative Commons licensed; from the IF Archive.",
        module: bronze,
    },
    {
        id: "suvehnux",
        title: "Suveh Nux",
        author: "David Fisher",
        year: 2007,
        rating: "G",
        blurb: "Locked in a vault, you discover words of power. A perfect bite-sized magic puzzle box.",
        attribution: "Suveh Nux by David Fisher. Freely distributable; from the IF Archive.",
        module: suvehNux,
    },
    {
        id: "905",
        title: "9:05",
        author: "Adam Cadre",
        year: 2000,
        rating: "PG-13",
        blurb: "The phone rings. You overslept. Get up, get dressed, get to work. Ten minutes long, with a twist people still talk about.",
        attribution: "9:05 by Adam Cadre. Freely distributable; from the IF Archive.",
        module: nineOhFive,
    },
    {
        id: "photopia",
        title: "Photopia",
        author: "Adam Cadre",
        year: 1998,
        rating: "PG-13",
        blurb: "Interwoven stories in crystalline prose. A landmark of narrative interactive fiction. Bring tissues.",
        attribution: "Photopia by Adam Cadre. Freely distributable; from the IF Archive.",
        module: photopia,
    },
    {
        id: "spiderweb",
        title: "Spider and Web",
        author: "Andrew Plotkin",
        year: 1998,
        rating: "PG-13",
        blurb: "You are a tourist. That door is just a door. The interrogator does not believe you. A spy thriller told in flashback.",
        attribution: "Spider and Web by Andrew Plotkin. Freely distributable; from the IF Archive.",
        module: spiderAndWeb,
    },
    {
        id: "violet",
        title: "Violet",
        author: "Jeremy Freese",
        year: 2008,
        rating: "PG-13",
        blurb: "Write one thousand words today or lose her. One room, one deadline, and your girlfriend's voice in your head.",
        attribution: "Violet by Jeremy Freese. Freely distributable; from the IF Archive.",
        module: violet,
    },
    {
        id: "slouching",
        title: "Slouching Towards Bedlam",
        author: "Foster & Ravipinto",
        year: 2003,
        rating: "PG-13",
        blurb: "London, 1885. A Bethlehem asylum, a dead linguist, and an idea that spreads. Steampunk mystery with multiple endings.",
        attribution: "Slouching Towards Bedlam by Star Foster and Daniel Ravipinto. Freely distributable; from the IF Archive.",
        module: slouching,
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
