"use strict";
// Bitwise/logical operation handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_and = h_and;
exports.h_or = h_or;
exports.h_not = h_not;
exports.h_test = h_test;
function h_and(vm, [a, b]) {
    const res = a & b & 0xffff;
    vm._storeResult?.(res);
}
function h_or(vm, [a, b]) {
    const res = (a | b) & 0xffff;
    vm._storeResult?.(res);
}
function h_not(vm, [a]) {
    const res = ~a & 0xffff;
    vm._storeResult?.(res);
}
function h_test(vm, [bitmap, flags], ctx) {
    ctx.branch?.((bitmap & flags) === flags);
}
