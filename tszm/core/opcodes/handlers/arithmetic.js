"use strict";
// Arithmetic instruction handlers. Keep pure, side-effects via ctx helpers when needed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_add = h_add;
exports.h_sub = h_sub;
exports.h_mul = h_mul;
exports.h_div = h_div;
exports.h_mod = h_mod;
// Helper to convert to signed 16-bit
function toSigned16(n) {
    return n > 32767 ? n - 65536 : n;
}
// Helper to convert to unsigned 16-bit
function toUnsigned16(n) {
    if (n < 0)
        n = n + 65536;
    return n & 0xffff;
}
function h_add(vm, [a, b]) {
    const signedA = toSigned16(a);
    const signedB = toSigned16(b);
    const result = toUnsigned16(signedA + signedB);
    vm._storeResult?.(result);
}
function h_sub(vm, [a, b]) {
    const signedA = toSigned16(a);
    const signedB = toSigned16(b);
    const result = toUnsigned16(signedA - signedB);
    vm._storeResult?.(result);
}
function h_mul(vm, [a, b]) {
    const signedA = toSigned16(a);
    const signedB = toSigned16(b);
    const result = toUnsigned16(signedA * signedB);
    vm._storeResult?.(result);
}
function h_div(vm, [a, b]) {
    const signedA = toSigned16(a);
    const signedB = toSigned16(b);
    if (signedB === 0) {
        console.error("Division by zero");
        return;
    }
    const result = toUnsigned16(Math.trunc(signedA / signedB));
    vm._storeResult?.(result);
}
function h_mod(vm, [a, b]) {
    const signedA = toSigned16(a);
    const signedB = toSigned16(b);
    if (signedB === 0) {
        console.error("Modulo by zero");
        return;
    }
    const result = toUnsigned16(signedA % signedB);
    vm._storeResult?.(result);
}
