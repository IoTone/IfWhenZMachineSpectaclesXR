"use strict";
// Build-time stand-in for Node's fs/promises. The interpreter only touches fs
// inside `runtime === 'node'` guards, which never execute in an embedded host —
// but some module converters (e.g. Lens Studio's) refuse to load any module with
// an unresolvable require(), so the bundle aliases fs/promises here instead of
// marking it external.
async function unavailable() {
    throw new Error("fs/promises is not available in the embedded runtime");
}
module.exports = {
    readFile: unavailable,
    writeFile: unavailable,
};
