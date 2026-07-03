"use strict";
// Strongly-typed, table-driven opcode metadata for the Z-Machine
Object.defineProperty(exports, "__esModule", { value: true });
exports.dv = exports.d2 = exports.d1 = exports.d0 = void 0;
// Tiny helpers to build descriptors with range checks
function mk(kind, max) {
    return (opcode, init) => {
        if (opcode < 0 || opcode > max)
            throw new Error(`${kind} opcode out of range: ${opcode}`);
        return { kind, opcode, ...init };
    };
}
exports.d0 = mk("0OP", 0x0f);
exports.d1 = mk("1OP", 0x0f);
exports.d2 = mk("2OP", 0x1f);
exports.dv = mk("VAR", 0xff); // VAR opcodes use full byte value 0xE0-0xFF
