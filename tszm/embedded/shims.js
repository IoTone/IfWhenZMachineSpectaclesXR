"use strict";
// Runtime shims for embedded JS runtimes (non-web/non-Node hosts, e.g. Snap
// Spectacles' "specs24").
//
// The vendored interpreter in ../core was compiled for Node and relies on the
// global `Buffer`, on `crypto.randomUUID`, and on base64 encode/decode. None of
// those are guaranteed to exist in an embedded runtime. Requiring this module
// first (the esbuild entry does) installs the missing globals so the core needs
// no edits.
//
// Buffer is implemented as a subclass of Uint8Array so that indexing, `.length`,
// iteration, and Uint8Array methods keep working; we add only the Node-specific
// read/write/toString/static helpers that the core actually calls. The exact
// surface used by ../core was enumerated before writing this:
//   static : from(arrayLike | string,'ascii' | string,'base64'), alloc, concat, byteLength, isBuffer
//   instance: readUInt8, readUInt16BE, readUInt32BE,
//             writeUInt8, writeUInt16BE, writeUInt32BE,
//             toString(['ascii'|'utf8'|'base64'][, start[, end]]), subarray

// ---------------------------------------------------------------------------
// base64 (no btoa/atob dependency — Spectacles may not provide them)
// ---------------------------------------------------------------------------
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_REV = (() => {
    const t = new Int16Array(256).fill(-1);
    for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
    t["=".charCodeAt(0)] = -2;
    return t;
})();

/** bytes (Uint8Array | number[]) -> base64 string */
function bytesToBase64(bytes) {
    let out = "";
    const len = bytes.length;
    let i = 0;
    for (; i + 2 < len; i += 3) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    }
    const rem = len - i;
    if (rem === 1) {
        const n = bytes[i] << 16;
        out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + "==";
    } else if (rem === 2) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
        out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + "=";
    }
    return out;
}

/** base64 string -> Uint8Array */
function base64ToBytes(str) {
    // Count valid (non-whitespace, non-padding) chars to size the output.
    let valid = 0;
    let pad = 0;
    for (let i = 0; i < str.length; i++) {
        const code = B64_REV[str.charCodeAt(i) & 255];
        if (code >= 0) valid++;
        else if (code === -2) pad++;
    }
    const outLen = ((valid + pad) >> 2) * 3 - pad;
    const out = new Uint8Array(outLen < 0 ? 0 : outLen);
    let acc = 0;
    let bits = 0;
    let o = 0;
    for (let i = 0; i < str.length; i++) {
        const code = B64_REV[str.charCodeAt(i) & 255];
        if (code < 0) continue; // skip whitespace and '='
        acc = (acc << 6) | code;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out[o++] = (acc >> bits) & 0xff;
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// text encode/decode
// ---------------------------------------------------------------------------
function strToAsciiBytes(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
}

function strToUtf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) {
            out.push(c);
        } else if (c < 0x800) {
            out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
            // surrogate pair
            const c2 = str.charCodeAt(++i);
            c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
            out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        } else {
            out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
    }
    return Uint8Array.from(out);
}

function bytesToAscii(bytes, start, end) {
    let s = "";
    for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i] & 0xff);
    return s;
}

function bytesToUtf8(bytes, start, end) {
    let s = "";
    let i = start;
    while (i < end) {
        const b = bytes[i++];
        if (b < 0x80) {
            s += String.fromCharCode(b);
        } else if (b >= 0xc0 && b < 0xe0) {
            s += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
        } else if (b >= 0xe0 && b < 0xf0) {
            s += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        } else {
            let cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            cp -= 0x10000;
            s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        }
    }
    return s;
}

// ---------------------------------------------------------------------------
// Buffer
// ---------------------------------------------------------------------------
class Buffer extends Uint8Array {
    // new Buffer(size) | new Buffer(array | Uint8Array) | new Buffer(arrayBuffer)
    // (subarray/slice call the (buffer, byteOffset, length) Uint8Array form)

    static from(value, encoding) {
        if (typeof value === "string") {
            if (encoding === "base64") return new Buffer(base64ToBytes(value));
            if (encoding === "utf8" || encoding === "utf-8") return new Buffer(strToUtf8Bytes(value));
            // default + 'ascii' / 'latin1' / 'binary'
            return new Buffer(strToAsciiBytes(value));
        }
        if (value instanceof Uint8Array) {
            const b = new Buffer(value.length);
            b.set(value);
            return b;
        }
        if (value instanceof ArrayBuffer) {
            return new Buffer(new Uint8Array(value));
        }
        // array-like of bytes
        return new Buffer(Uint8Array.from(value));
    }

    static alloc(size) {
        return new Buffer(size); // Uint8Array is already zero-filled
    }

    static concat(list, totalLength) {
        let total = totalLength;
        if (total === undefined) {
            total = 0;
            for (let i = 0; i < list.length; i++) total += list[i].length;
        }
        const out = new Buffer(total);
        let offset = 0;
        for (let i = 0; i < list.length && offset < total; i++) {
            out.set(list[i], offset);
            offset += list[i].length;
        }
        return out;
    }

    static byteLength(value, encoding) {
        if (typeof value !== "string") return value.length;
        if (encoding === "base64") return base64ToBytes(value).length;
        if (encoding === "ascii" || encoding === "latin1" || encoding === "binary") return value.length;
        return strToUtf8Bytes(value).length;
    }

    static isBuffer(obj) {
        return obj instanceof Buffer;
    }

    readUInt8(offset) {
        return this[offset];
    }

    readUInt16BE(offset) {
        return (this[offset] << 8) | this[offset + 1];
    }

    readUInt32BE(offset) {
        // >>> 0 keeps it unsigned
        return ((this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]) >>> 0;
    }

    writeUInt8(value, offset) {
        this[offset] = value & 0xff;
        return offset + 1;
    }

    writeUInt16BE(value, offset) {
        this[offset] = (value >>> 8) & 0xff;
        this[offset + 1] = value & 0xff;
        return offset + 2;
    }

    writeUInt32BE(value, offset) {
        this[offset] = (value >>> 24) & 0xff;
        this[offset + 1] = (value >>> 16) & 0xff;
        this[offset + 2] = (value >>> 8) & 0xff;
        this[offset + 3] = value & 0xff;
        return offset + 4;
    }

    toString(encoding, start, end) {
        const s = start === undefined ? 0 : start;
        const e = end === undefined ? this.length : end;
        if (encoding === "base64") return bytesToBase64(this.subarray(s, e));
        if (encoding === "utf8" || encoding === "utf-8") return bytesToUtf8(this, s, e);
        // default + 'ascii' / 'latin1' / 'binary'
        return bytesToAscii(this, s, e);
    }

    // Share backing memory like Node and keep Buffer methods on the view.
    subarray(start, end) {
        const view = super.subarray(start, end);
        Object.setPrototypeOf(view, Buffer.prototype);
        return view;
    }

    slice(start, end) {
        return this.subarray(start, end);
    }
}

// ---------------------------------------------------------------------------
// crypto.randomUUID
// ---------------------------------------------------------------------------
function randomUUID() {
    // RFC 4122 v4. Math.random is available in the Spectacles runtime.
    const b = new Uint8Array(16);
    for (let i = 0; i < 16; i++) b[i] = (Math.random() * 256) & 0xff;
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = [];
    for (let i = 0; i < 256; i++) hex.push((i + 0x100).toString(16).slice(1));
    return (
        hex[b[0]] + hex[b[1]] + hex[b[2]] + hex[b[3]] + "-" +
        hex[b[4]] + hex[b[5]] + "-" +
        hex[b[6]] + hex[b[7]] + "-" +
        hex[b[8]] + hex[b[9]] + "-" +
        hex[b[10]] + hex[b[11]] + hex[b[12]] + hex[b[13]] + hex[b[14]] + hex[b[15]]
    );
}

// ---------------------------------------------------------------------------
// install globals (idempotent)
// ---------------------------------------------------------------------------
function installShims() {
    const g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : this;
    if (!g.Buffer) g.Buffer = Buffer;
    if (!g.crypto) g.crypto = {};
    if (!g.crypto.randomUUID) g.crypto.randomUUID = randomUUID;
    return g;
}

installShims();

module.exports = {
    Buffer,
    randomUUID,
    bytesToBase64,
    base64ToBytes,
    strToAsciiBytes,
    strToUtf8Bytes,
    installShims,
};
