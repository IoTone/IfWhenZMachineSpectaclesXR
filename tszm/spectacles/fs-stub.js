"use strict";
// Build-time stand-in for Node's fs/promises. The interpreter only touches fs
// inside `runtime === 'node'` guards, which never execute on Spectacles — but
// Lens Studio's module converter refuses to load any module with an
// unresolvable require(), so the bundle aliases fs/promises here instead of
// marking it external.
async function unavailable() {
    throw new Error("fs/promises is not available in the Spectacles runtime");
}
module.exports = {
    readFile: unavailable,
    writeFile: unavailable,
};
