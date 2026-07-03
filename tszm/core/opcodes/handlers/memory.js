"use strict";
// Memory access handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_loadw = h_loadw;
exports.h_loadb = h_loadb;
exports.h_storew = h_storew;
exports.h_storeb = h_storeb;
function toSigned16(n) {
    return n > 32767 ? n - 65536 : n;
}
function h_loadw(vm, [arrayAddr, wordIndex], ctx) {
    if (!vm.memory) {
        console.error("Memory not loaded");
        return;
    }
    const signedIndex = toSigned16(wordIndex);
    const addr = arrayAddr + 2 * signedIndex;
    if (addr < 0 || addr >= vm.memory.length - 1) {
        console.error(`LOADW: Invalid memory address 0x${addr.toString(16)} ` +
            `(array=0x${arrayAddr.toString(16)}, index=${signedIndex}). ` +
            `Memory size: 0x${vm.memory.length.toString(16)}`);
        return;
    }
    const value = vm.memory.readUInt16BE(addr);
    ctx.store?.(value);
}
function h_loadb(vm, [arrayAddr, byteIndex], ctx) {
    if (!vm.memory) {
        console.error("Memory not loaded");
        return;
    }
    const signedIndex = toSigned16(byteIndex);
    const addr = arrayAddr + signedIndex;
    if (addr < 0 || addr >= vm.memory.length) {
        console.error(`LOADB: Invalid memory address 0x${addr.toString(16)} ` +
            `(array=0x${arrayAddr.toString(16)}, index=${signedIndex}). ` +
            `Memory size: 0x${vm.memory.length.toString(16)}`);
        return;
    }
    const value = vm.memory.readUInt8(addr);
    ctx.store?.(value);
}
function h_storew(vm, [arrayAddr, wordIndex, value]) {
    if (!vm.memory) {
        console.error("Memory not loaded");
        return;
    }
    const signedIndex = toSigned16(wordIndex);
    const addr = arrayAddr + 2 * signedIndex;
    if (addr < 0 || addr >= vm.memory.length - 1) {
        console.error(`STOREW: Invalid memory address 0x${addr.toString(16)} ` +
            `(array=0x${arrayAddr.toString(16)}, index=${signedIndex}). ` +
            `Memory size: 0x${vm.memory.length.toString(16)}`);
        return;
    }
    vm.memory.writeUInt16BE(value, addr);
}
function h_storeb(vm, [arrayAddr, byteIndex, value]) {
    if (!vm.memory) {
        console.error("Memory not loaded");
        return;
    }
    const signedIndex = toSigned16(byteIndex);
    const addr = arrayAddr + signedIndex;
    if (addr < 0 || addr >= vm.memory.length) {
        console.error(`STOREB: Invalid memory address 0x${addr.toString(16)} ` +
            `(array=0x${arrayAddr.toString(16)}, index=${signedIndex}). ` +
            `Memory size: 0x${vm.memory.length.toString(16)}`);
        return;
    }
    vm.memory.writeUInt8(value, addr);
}
// VAR:0xf7 scan_table (v4+): search a table for a value; store address of the
// match (or 0) and branch on found. form bit 7 = word entries, bits 0-6 = entry length.
function h_scan_table(vm, operands, ctx) {
    if (!vm.memory) {
        console.error("Memory not loaded");
        return;
    }
    const [x, table, len] = operands;
    const form = operands.length > 3 ? operands[3] : 0x82;
    const isWord = (form & 0x80) !== 0;
    const entryLen = form & 0x7f;
    if (entryLen === 0) {
        ctx.store?.(0);
        ctx.branch?.(false);
        return;
    }
    for (let i = 0; i < len; i++) {
        const addr = table + i * entryLen;
        const value = isWord ? vm.memory.readUInt16BE(addr) : vm.memory.readUInt8(addr);
        if (value === x) {
            ctx.store?.(addr);
            ctx.branch?.(true);
            return;
        }
    }
    ctx.store?.(0);
    ctx.branch?.(false);
}
exports.h_scan_table = h_scan_table;
