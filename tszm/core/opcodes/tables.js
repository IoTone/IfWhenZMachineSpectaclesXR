"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_EXT = exports.TABLE_VAR = exports.TABLE_2OP = exports.TABLE_1OP = exports.TABLE_0OP = void 0;
const types_1 = require("./types");
const arithmetic_1 = require("./handlers/arithmetic");
const logic_1 = require("./handlers/logic");
const flow_1 = require("./handlers/flow");
const text_1 = require("./handlers/text");
const stack_1 = require("./handlers/stack");
const misc_1 = require("./handlers/misc");
const objects_1 = require("./handlers/objects");
const properties_1 = require("./handlers/properties");
const variables_1 = require("./handlers/variables");
const call_1 = require("./handlers/call");
const memory_1 = require("./handlers/memory");
const io_1 = require("./handlers/io");
const extended_1 = require("./handlers/extended");
// Per-family opcode tables. Undefined entries = illegal or unimplemented.
exports.TABLE_0OP = [];
exports.TABLE_1OP = [];
exports.TABLE_2OP = [];
exports.TABLE_VAR = [];
exports.TABLE_EXT = [];
// --- 0OP opcodes ---
exports.TABLE_0OP[0x00] = (0, types_1.d0)(0x00, {
    name: "rtrue",
    operandKinds: [],
    handler: (vm) => (0, flow_1.h_rtrue)(vm),
});
exports.TABLE_0OP[0x01] = (0, types_1.d0)(0x01, {
    name: "rfalse",
    operandKinds: [],
    handler: (vm) => (0, flow_1.h_rfalse)(vm),
});
exports.TABLE_0OP[0x02] = (0, types_1.d0)(0x02, {
    name: "print",
    operandKinds: [],
    handler: (vm) => (0, text_1.h_print)(vm),
});
exports.TABLE_0OP[0x03] = (0, types_1.d0)(0x03, {
    name: "print_ret",
    operandKinds: [],
    handler: (vm) => (0, text_1.h_print_ret)(vm),
});
exports.TABLE_0OP[0x04] = (0, types_1.d0)(0x04, {
    name: "nop",
    operandKinds: [],
    handler: (vm) => (0, misc_1.h_nop)(vm),
});
exports.TABLE_0OP[0x05] = (0, types_1.d0)(0x05, {
    name: "save",
    operandKinds: [],
    maxVersion: 3,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, io_1.h_save)(vm, ops, ctx),
});
exports.TABLE_0OP[0x06] = (0, types_1.d0)(0x06, {
    name: "restore",
    operandKinds: [],
    maxVersion: 3,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, io_1.h_restore)(vm, ops, ctx),
});
// TABLE_0OP[0x07] = restart - TODO: implement restart
exports.TABLE_0OP[0x08] = (0, types_1.d0)(0x08, {
    name: "ret_popped",
    operandKinds: [],
    handler: (vm) => (0, flow_1.h_ret_popped)(vm),
});
exports.TABLE_0OP[0x09] = (0, types_1.d0)(0x09, {
    name: "pop",
    operandKinds: [],
    handler: (vm) => (0, stack_1.h_pop)(vm),
});
exports.TABLE_0OP[0x0a] = (0, types_1.d0)(0x0a, {
    name: "quit",
    operandKinds: [],
    handler: (vm) => (0, flow_1.h_quit)(vm),
});
exports.TABLE_0OP[0x0b] = (0, types_1.d0)(0x0b, {
    name: "new_line",
    operandKinds: [],
    handler: (vm) => (0, text_1.h_new_line)(vm),
});
exports.TABLE_0OP[0x0c] = (0, types_1.d0)(0x0c, {
    name: "show_status",
    operandKinds: [],
    maxVersion: 3,
    handler: (vm) => (0, misc_1.h_show_status)(vm),
});
exports.TABLE_0OP[0x0d] = (0, types_1.d0)(0x0d, {
    name: "verify",
    operandKinds: [],
    minVersion: 3,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, misc_1.h_verify)(vm, ops, ctx),
});
// TABLE_0OP[0x0e] = extended (v5+) - handled specially in decode
exports.TABLE_0OP[0x0f] = (0, types_1.d0)(0x0f, {
    name: "piracy",
    operandKinds: [],
    minVersion: 5,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, misc_1.h_piracy)(vm, ops, ctx),
});
// --- 1OP opcodes ---
exports.TABLE_1OP[0x00] = (0, types_1.d1)(0x00, {
    name: "jz",
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, flow_1.h_jz)(vm, ops, ctx),
});
exports.TABLE_1OP[0x01] = (0, types_1.d1)(0x01, {
    name: "get_sibling",
    doesStore: true,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, objects_1.h_get_sibling)(vm, ops, ctx),
});
exports.TABLE_1OP[0x02] = (0, types_1.d1)(0x02, {
    name: "get_child",
    doesStore: true,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, objects_1.h_get_child)(vm, ops, ctx),
});
exports.TABLE_1OP[0x03] = (0, types_1.d1)(0x03, {
    name: "get_parent",
    doesStore: true,
    handler: (vm, ops, ctx) => (0, objects_1.h_get_parent)(vm, ops, ctx),
});
exports.TABLE_1OP[0x04] = (0, types_1.d1)(0x04, {
    name: "get_prop_len",
    doesStore: true,
    handler: (vm, ops, ctx) => (0, properties_1.h_get_prop_len)(vm, ops, ctx),
});
exports.TABLE_1OP[0x05] = (0, types_1.d1)(0x05, {
    name: "inc",
    handler: (vm, ops) => (0, variables_1.h_inc)(vm, ops),
});
exports.TABLE_1OP[0x06] = (0, types_1.d1)(0x06, {
    name: "dec",
    handler: (vm, ops) => (0, variables_1.h_dec)(vm, ops),
});
exports.TABLE_1OP[0x07] = (0, types_1.d1)(0x07, {
    name: "print_addr",
    handler: (vm, ops) => (0, text_1.h_print_addr)(vm, ops),
});
exports.TABLE_1OP[0x08] = (0, types_1.d1)(0x08, {
    name: "call_1s",
    minVersion: 4,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, call_1.h_call_1s)(vm, ops, ctx),
});
exports.TABLE_1OP[0x09] = (0, types_1.d1)(0x09, {
    name: "remove_obj",
    handler: (vm, ops) => (0, objects_1.h_remove_obj)(vm, ops),
});
exports.TABLE_1OP[0x0a] = (0, types_1.d1)(0x0a, {
    name: "print_obj",
    handler: (vm, ops) => (0, objects_1.h_print_obj)(vm, ops),
});
exports.TABLE_1OP[0x0b] = (0, types_1.d1)(0x0b, {
    name: "ret",
    handler: (vm, ops) => (0, flow_1.h_ret)(vm, ops),
});
exports.TABLE_1OP[0x0c] = (0, types_1.d1)(0x0c, {
    name: "jump",
    handler: (vm, ops) => (0, flow_1.h_jump)(vm, ops),
});
exports.TABLE_1OP[0x0d] = (0, types_1.d1)(0x0d, {
    name: "print_paddr",
    handler: (vm, ops) => (0, text_1.h_print_paddr)(vm, ops),
});
exports.TABLE_1OP[0x0e] = (0, types_1.d1)(0x0e, {
    name: "load",
    doesStore: true,
    handler: (vm, ops, ctx) => (0, variables_1.h_load)(vm, ops, ctx),
});
exports.TABLE_1OP[0x0f] = (0, types_1.d1)(0x0f, {
    name: "not",
    maxVersion: 4,
    doesStore: true,
    handler: (vm, ops) => (0, logic_1.h_not)(vm, ops),
});
// --- 2OP opcodes ---
// NOTE: Opcodes 0x01-0x1F can be encoded in either 2OP (long form) or VAR_2OP (variable form 0xC0-0xDF).
// Both encodings should use the same handlers below.
// TABLE_2OP[0x00] = reserved/nop
exports.TABLE_2OP[0x01] = (0, types_1.d2)(0x01, {
    name: "je",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, flow_1.h_je)(vm, ops, ctx),
});
exports.TABLE_2OP[0x02] = (0, types_1.d2)(0x02, {
    name: "jl",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, flow_1.h_jl)(vm, ops, ctx),
});
exports.TABLE_2OP[0x03] = (0, types_1.d2)(0x03, {
    name: "jg",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, flow_1.h_jg)(vm, ops, ctx),
});
exports.TABLE_2OP[0x04] = (0, types_1.d2)(0x04, {
    name: "dec_chk",
    operandKinds: ["small", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, variables_1.h_dec_chk)(vm, ops, ctx),
});
exports.TABLE_2OP[0x05] = (0, types_1.d2)(0x05, {
    name: "inc_chk",
    operandKinds: ["small", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, variables_1.h_inc_chk)(vm, ops, ctx),
});
exports.TABLE_2OP[0x06] = (0, types_1.d2)(0x06, {
    name: "jin",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, objects_1.h_jin)(vm, ops, ctx),
});
exports.TABLE_2OP[0x07] = (0, types_1.d2)(0x07, {
    name: "test",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, logic_1.h_test)(vm, ops, ctx),
});
exports.TABLE_2OP[0x08] = (0, types_1.d2)(0x08, {
    name: "or",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, logic_1.h_or)(vm, ops),
});
exports.TABLE_2OP[0x09] = (0, types_1.d2)(0x09, {
    name: "and",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, logic_1.h_and)(vm, ops),
});
exports.TABLE_2OP[0x0a] = (0, types_1.d2)(0x0a, {
    name: "test_attr",
    operandKinds: ["var", "var"],
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, objects_1.h_test_attr)(vm, ops, ctx),
});
exports.TABLE_2OP[0x0b] = (0, types_1.d2)(0x0b, {
    name: "set_attr",
    operandKinds: ["var", "var"],
    handler: (vm, ops) => (0, objects_1.h_set_attr)(vm, ops),
});
exports.TABLE_2OP[0x0c] = (0, types_1.d2)(0x0c, {
    name: "clear_attr",
    operandKinds: ["var", "var"],
    handler: (vm, ops) => (0, objects_1.h_clear_attr)(vm, ops),
});
exports.TABLE_2OP[0x0d] = (0, types_1.d2)(0x0d, {
    name: "store",
    operandKinds: ["small", "var"],
    handler: (vm, ops) => (0, variables_1.h_store)(vm, ops),
});
exports.TABLE_2OP[0x0e] = (0, types_1.d2)(0x0e, {
    name: "insert_obj",
    operandKinds: ["var", "var"],
    handler: (vm, ops) => (0, objects_1.h_insert_obj)(vm, ops),
});
exports.TABLE_2OP[0x0f] = (0, types_1.d2)(0x0f, {
    name: "loadw",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops, ctx) => (0, memory_1.h_loadw)(vm, ops, ctx),
});
exports.TABLE_2OP[0x10] = (0, types_1.d2)(0x10, {
    name: "loadb",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops, ctx) => (0, memory_1.h_loadb)(vm, ops, ctx),
});
exports.TABLE_2OP[0x11] = (0, types_1.d2)(0x11, {
    name: "get_prop",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops, ctx) => (0, properties_1.h_get_prop)(vm, ops, ctx),
});
exports.TABLE_2OP[0x12] = (0, types_1.d2)(0x12, {
    name: "get_prop_addr",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops, ctx) => (0, properties_1.h_get_prop_addr)(vm, ops, ctx),
});
exports.TABLE_2OP[0x13] = (0, types_1.d2)(0x13, {
    name: "get_next_prop",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops, ctx) => (0, properties_1.h_get_next_prop)(vm, ops, ctx),
});
// Note: put_prop has 3 operands, but 2OP form only supports 2
// It's typically called in VAR form
exports.TABLE_2OP[0x14] = (0, types_1.d2)(0x14, {
    name: "add",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, arithmetic_1.h_add)(vm, ops),
});
exports.TABLE_2OP[0x15] = (0, types_1.d2)(0x15, {
    name: "sub",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, arithmetic_1.h_sub)(vm, ops),
});
exports.TABLE_2OP[0x16] = (0, types_1.d2)(0x16, {
    name: "mul",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, arithmetic_1.h_mul)(vm, ops),
});
exports.TABLE_2OP[0x17] = (0, types_1.d2)(0x17, {
    name: "div",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, arithmetic_1.h_div)(vm, ops),
});
exports.TABLE_2OP[0x18] = (0, types_1.d2)(0x18, {
    name: "mod",
    operandKinds: ["var", "var"],
    doesStore: true,
    handler: (vm, ops) => (0, arithmetic_1.h_mod)(vm, ops),
});
exports.TABLE_2OP[0x19] = (0, types_1.d2)(0x19, {
    name: "call_2s",
    minVersion: 4,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, call_1.h_call_2s)(vm, ops, ctx),
});
// TABLE_2OP[0x1a] = call_2n (v5+) - TODO: implement
// TABLE_2OP[0x1b] = set_colour (v5+) - TODO: implement
// TABLE_2OP[0x1c] = throw (v5+) - TODO: implement
// --- VAR opcodes ---
// NOTE: VAR opcodes have variable-length operand lists (0-4 operands typically)
// The operandKinds field is omitted because operand types are encoded in a separate byte
// VAR opcodes use the full byte value 0xE0-0xFF as the index
exports.TABLE_VAR[0xe0] = (0, types_1.dv)(0xe0, {
    name: "call",
    doesStore: true,
    handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
});
exports.TABLE_VAR[0xe1] = (0, types_1.dv)(0xe1, {
    name: "storew",
    handler: (vm, ops) => (0, memory_1.h_storew)(vm, ops),
});
exports.TABLE_VAR[0xe2] = (0, types_1.dv)(0xe2, {
    name: "storeb",
    handler: (vm, ops) => (0, memory_1.h_storeb)(vm, ops),
});
exports.TABLE_VAR[0xe3] = (0, types_1.dv)(0xe3, {
    name: "put_prop",
    handler: (vm, ops) => (0, properties_1.h_put_prop)(vm, ops),
});
exports.TABLE_VAR[0xe4] = (0, types_1.dv)(0xe4, {
    name: "sread",
    handler: (vm, ops) => (0, io_1.h_sread)(vm, ops),
});
exports.TABLE_VAR[0xe5] = (0, types_1.dv)(0xe5, {
    name: "print_char",
    handler: (vm, ops) => (0, io_1.h_print_char)(vm, ops),
});
exports.TABLE_VAR[0xe6] = (0, types_1.dv)(0xe6, {
    name: "print_num",
    handler: (vm, ops) => (0, text_1.h_print_num)(vm, ops),
});
exports.TABLE_VAR[0xe7] = (0, types_1.dv)(0xe7, {
    name: "random",
    doesStore: true,
    handler: (vm, ops, ctx) => (0, stack_1.h_random)(vm, ops, ctx),
});
exports.TABLE_VAR[0xe8] = (0, types_1.dv)(0xe8, {
    name: "push",
    handler: (vm, ops) => (0, stack_1.h_push)(vm, ops),
});
exports.TABLE_VAR[0xe9] = (0, types_1.dv)(0xe9, {
    name: "pull",
    minVersion: 5,
    handler: (vm, ops) => (0, stack_1.h_pull)(vm, ops),
});
exports.TABLE_VAR[0xea] = (0, types_1.dv)(0xea, {
    name: "split_window",
    minVersion: 3,
    handler: (vm, ops) => (0, io_1.h_split_window)(vm, ops),
});
exports.TABLE_VAR[0xeb] = (0, types_1.dv)(0xeb, {
    name: "set_window",
    minVersion: 3,
    handler: (vm, ops) => (0, io_1.h_set_window)(vm, ops),
});
exports.TABLE_VAR[0xec] = (0, types_1.dv)(0xec, {
    name: "call_vs2",
    minVersion: 4,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
});
exports.TABLE_VAR[0xed] = (0, types_1.dv)(0xed, {
    name: "erase_window",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_erase_window)(vm, ops),
});
exports.TABLE_VAR[0xee] = (0, types_1.dv)(0xee, {
    name: "erase_line",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_erase_line)(vm, ops),
});
exports.TABLE_VAR[0xef] = (0, types_1.dv)(0xef, {
    name: "set_cursor",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_set_cursor)(vm, ops),
});
exports.TABLE_VAR[0xf0] = (0, types_1.dv)(0xf0, {
    name: "get_cursor",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_get_cursor)(vm, ops),
});
exports.TABLE_VAR[0xf1] = (0, types_1.dv)(0xf1, {
    name: "set_text_style",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_set_text_style)(vm, ops),
});
exports.TABLE_VAR[0xf2] = (0, types_1.dv)(0xf2, {
    name: "buffer_mode",
    minVersion: 4,
    handler: (vm, ops) => (0, io_1.h_buffer_mode)(vm, ops),
});
exports.TABLE_VAR[0xf3] = (0, types_1.dv)(0xf3, {
    name: "output_stream",
    minVersion: 3,
    handler: (vm, ops) => (0, io_1.h_output_stream)(vm, ops),
});
exports.TABLE_VAR[0xf4] = (0, types_1.dv)(0xf4, {
    name: "input_stream",
    minVersion: 3,
    handler: (vm, ops) => (0, io_1.h_input_stream)(vm, ops),
});
exports.TABLE_VAR[0xf5] = (0, types_1.dv)(0xf5, {
    name: "sound_effect",
    minVersion: 3,
    handler: (vm, ops) => (0, io_1.h_sound_effect)(vm, ops),
});
exports.TABLE_VAR[0xf6] = (0, types_1.dv)(0xf6, {
    name: "read_char",
    minVersion: 4,
    doesStore: true,
    handler: async (vm, ops, ctx) => await (0, io_1.h_read_char)(vm, ops, ctx),
});
// TABLE_VAR[0xf7] = scan_table (v4+) - TODO: implement h_scan_table
exports.TABLE_VAR[0xf8] = (0, types_1.dv)(0xf8, {
    name: "not",
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops) => (0, logic_1.h_not)(vm, ops),
});
// TABLE_VAR[0xf9] = call_vn (v5+) - TODO
// TABLE_VAR[0xfa] = call_vn2 (v5+) - TODO
// TABLE_VAR[0xfb] = tokenise (v5+) - TODO
// TABLE_VAR[0x1a] = not (v1-4) - handled by 0x0c above
// TABLE_VAR[0x1b] = call_vn (v5+) - TODO
// TABLE_VAR[0x1c] = call_vn2 (v5+) - TODO
// TABLE_VAR[0x1d] = tokenise (v5+) - TODO
exports.TABLE_VAR[0x1e] = (0, types_1.dv)(0x1e, {
    name: "print_table",
    minVersion: 5,
    handler: (vm, ops) => (0, io_1.h_print_table)(vm, ops),
});
// TABLE_VAR[0x1f] = check_arg_count (v5+) - TODO
// --- EXT opcodes (Extended opcodes, v5+) ---
// NOTE: EXT opcodes are accessed via the 0xBE prefix byte
// They have variable-length operand lists like VAR opcodes
// TABLE_EXT[0x00] = save (v5+) - store result, TODO: implement file I/O
// TABLE_EXT[0x01] = restore (v5+) - store result, TODO: implement file I/O
exports.TABLE_EXT[0x02] = {
    name: "log_shift",
    kind: "EXT",
    opcode: 0x02,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_log_shift)(vm, ops, ctx),
};
exports.TABLE_EXT[0x03] = {
    name: "art_shift",
    kind: "EXT",
    opcode: 0x03,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_art_shift)(vm, ops, ctx),
};
exports.TABLE_EXT[0x04] = {
    name: "set_font",
    kind: "EXT",
    opcode: 0x04,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_set_font)(vm, ops, ctx),
};
// TABLE_EXT[0x05] = draw_picture (v6) - TODO: implement graphics
// TABLE_EXT[0x06] = picture_data (v6) - branch, TODO: implement graphics
// TABLE_EXT[0x07] = erase_picture (v6) - TODO: implement graphics
// TABLE_EXT[0x08] = set_margins (v6) - TODO: implement
exports.TABLE_EXT[0x09] = {
    name: "save_undo",
    kind: "EXT",
    opcode: 0x09,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_save_undo)(vm, ops, ctx),
};
exports.TABLE_EXT[0x0a] = {
    name: "restore_undo",
    kind: "EXT",
    opcode: 0x0a,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_restore_undo)(vm, ops, ctx),
};
exports.TABLE_EXT[0x0b] = {
    name: "print_unicode",
    kind: "EXT",
    opcode: 0x0b,
    minVersion: 5,
    handler: (vm, ops) => (0, extended_1.h_print_unicode)(vm, ops),
};
exports.TABLE_EXT[0x0c] = {
    name: "check_unicode",
    kind: "EXT",
    opcode: 0x0c,
    minVersion: 5,
    doesStore: true,
    handler: (vm, ops, ctx) => (0, extended_1.h_check_unicode)(vm, ops, ctx),
};
// TABLE_EXT[0x0d] = set_true_colour (v5+) - TODO: implement
// TABLE_EXT[0x10] = move_window (v6) - TODO: implement
// TABLE_EXT[0x11] = window_size (v6) - TODO: implement
// TABLE_EXT[0x12] = window_style (v6) - TODO: implement
// TABLE_EXT[0x13] = get_wind_prop (v6) - store result, TODO: implement
// TABLE_EXT[0x14] = scroll_window (v6) - TODO: implement
// TABLE_EXT[0x15] = pop_stack (v6) - TODO: implement
// TABLE_EXT[0x16] = read_mouse (v6) - TODO: implement
// TABLE_EXT[0x17] = mouse_window (v6) - TODO: implement
// TABLE_EXT[0x18] = push_stack (v6) - branch, TODO: implement
// TABLE_EXT[0x19] = put_wind_prop (v6) - TODO: implement
// TABLE_EXT[0x1a] = print_form (v6) - TODO: implement
// TABLE_EXT[0x1b] = make_menu (v6) - branch, TODO: implement
// TABLE_EXT[0x1c] = picture_table (v6) - TODO: implement
// TABLE_EXT[0x1d] = buffer_screen (v6) - store result, TODO: implement
// Most EXT opcodes are for advanced features (graphics, sound, menus) in v6
// and are rarely used in practice. Placeholders provided for completeness.
// --- Missing v5+ opcodes ---
exports.TABLE_VAR[0xf7] = (0, types_1.dv)(0xf7, {
    name: "scan_table",
    minVersion: 4,
    doesStore: true,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, memory_1.h_scan_table)(vm, ops, ctx),
});
exports.TABLE_VAR[0xf9] = (0, types_1.dv)(0xf9, {
    name: "call_vn",
    minVersion: 5,
    handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
});
exports.TABLE_VAR[0xfa] = (0, types_1.dv)(0xfa, {
    name: "call_vn2",
    minVersion: 5,
    handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
});
exports.TABLE_VAR[0xfb] = (0, types_1.dv)(0xfb, {
    name: "tokenise",
    minVersion: 5,
    handler: (vm, ops) => (0, io_1.h_tokenise)(vm, ops),
});
exports.TABLE_VAR[0xff] = (0, types_1.dv)(0xff, {
    name: "check_arg_count",
    minVersion: 5,
    doesBranch: true,
    handler: (vm, ops, ctx) => (0, call_1.h_check_arg_count)(vm, ops, ctx),
});
exports.TABLE_0OP[0x07] = (0, types_1.d0)(0x07, {
    name: "restart",
    operandKinds: [],
    handler: async (vm) => await (0, flow_1.h_restart)(vm),
});
exports.TABLE_2OP[0x1c] = (0, types_1.d2)(0x1c, {
    name: "throw",
    minVersion: 5,
    handler: (vm, ops) => (0, flow_1.h_throw)(vm, ops),
});
// --- Version-dependent opcode overrides ---
// Consulted by decode.js before falling back to the static tables above.
// Each entry is a list of variants selected by the running story-file version.
exports.VERSION_OVERRIDES = {
    "0OP": {
        // v5+: `catch` (store frame handle); v1-4 static entry is `pop`
        0x09: [
            (0, types_1.d0)(0x09, {
                name: "catch",
                operandKinds: [],
                minVersion: 5,
                doesStore: true,
                handler: (vm, ops, ctx) => (0, flow_1.h_catch)(vm, ops, ctx),
            }),
        ],
    },
    "1OP": {
        // v5+: `call_1n` (call, discard result); v1-4 static entry is `not`
        0x0f: [
            (0, types_1.d1)(0x0f, {
                name: "call_1n",
                minVersion: 5,
                handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
            }),
        ],
    },
    "2OP": {},
    "VAR": {
        // v5+: `aread` stores the terminating character; v1-4 `sread` does not
        0xe4: [
            (0, types_1.dv)(0xe4, {
                name: "aread",
                minVersion: 5,
                doesStore: true,
                handler: async (vm, ops, ctx) => await (0, io_1.h_sread)(vm, ops, ctx),
            }),
        ],
    },
    "EXT": {},
};
exports.TABLE_2OP[0x1a] = (0, types_1.d2)(0x1a, {
    name: "call_2n",
    minVersion: 5,
    handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx),
});
exports.TABLE_2OP[0x1b] = (0, types_1.d2)(0x1b, {
    name: "set_colour",
    minVersion: 5,
    handler: () => { /* colours not supported; spec allows ignoring */ },
});
exports.TABLE_EXT[0x00] = {
    kind: "EXT",
    opcode: 0x00,
    name: "save",
    minVersion: 5,
    doesStore: true,
    handler: async (vm, ops, ctx) => await (0, io_1.h_save_ext)(vm, ops, ctx),
};
exports.TABLE_EXT[0x01] = {
    kind: "EXT",
    opcode: 0x01,
    name: "restore",
    minVersion: 5,
    doesStore: true,
    handler: async (vm, ops, ctx) => await (0, io_1.h_restore_ext)(vm, ops, ctx),
};
