"use strict";
// Variable manipulation handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_inc = h_inc;
exports.h_dec = h_dec;
exports.h_load = h_load;
exports.h_store = h_store;
exports.h_inc_chk = h_inc_chk;
exports.h_dec_chk = h_dec_chk;
function toSigned16(n) {
    return n > 32767 ? n - 65536 : n;
}
// Z-spec 6.3.4: the indirect-variable opcodes (inc, dec, inc_chk, dec_chk,
// load, store, pull) access variable 0 as the TOP OF STACK IN PLACE - they
// must not push or pop.
function readVarInPlace(vm, varNum) {
    if (varNum === 0) {
        return vm.stack.length > 0 ? vm.stack[vm.stack.length - 1] : 0;
    }
    return vm.getVariableValue(varNum);
}
function writeVarInPlace(vm, varNum, value) {
    if (varNum === 0) {
        if (vm.stack.length > 0) {
            vm.stack[vm.stack.length - 1] = value;
        }
        else {
            vm.stack.push(value);
        }
        return;
    }
    vm.setVariableValue(varNum, value);
}
function h_inc(vm, [varNum]) {
    const value = readVarInPlace(vm, varNum);
    writeVarInPlace(vm, varNum, (value + 1) & 0xffff);
}
function h_dec(vm, [varNum]) {
    const value = readVarInPlace(vm, varNum);
    writeVarInPlace(vm, varNum, (value - 1) & 0xffff);
}
function h_load(vm, [varNum], ctx) {
    const value = readVarInPlace(vm, varNum);
    ctx.store?.(value);
}
function h_store(vm, [varNum, value]) {
    writeVarInPlace(vm, varNum, value);
}
function h_inc_chk(vm, [varNum, compareValue], ctx) {
    const value = readVarInPlace(vm, varNum);
    const newValue = (value + 1) & 0xffff;
    writeVarInPlace(vm, varNum, newValue);
    const signedNew = toSigned16(newValue);
    const signedCompare = toSigned16(compareValue);
    ctx.branch?.(signedNew > signedCompare);
}
function h_dec_chk(vm, [varNum, compareValue], ctx) {
    const value = readVarInPlace(vm, varNum);
    const newValue = (value - 1) & 0xffff;
    writeVarInPlace(vm, varNum, newValue);
    const signedNew = toSigned16(newValue);
    const signedCompare = toSigned16(compareValue);
    ctx.branch?.(signedNew < signedCompare);
}
