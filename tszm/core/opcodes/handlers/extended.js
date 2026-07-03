"use strict";
// Extended (EXT) opcode handlers for v5+ features
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_log_shift = h_log_shift;
exports.h_art_shift = h_art_shift;
exports.h_set_font = h_set_font;
exports.h_save_undo = h_save_undo;
exports.h_restore_undo = h_restore_undo;
exports.h_print_unicode = h_print_unicode;
exports.h_check_unicode = h_check_unicode;
function toSigned16(n) {
    return n > 32767 ? n - 65536 : n;
}
function h_log_shift(vm, [number, places], ctx) {
    // Logical shift: positive = left, negative = right
    const signedPlaces = toSigned16(places);
    let result;
    if (signedPlaces > 0) {
        // Left shift
        result = (number << signedPlaces) & 0xffff;
    }
    else if (signedPlaces < 0) {
        // Right shift (logical - zero fill)
        result = (number >>> -signedPlaces) & 0xffff;
    }
    else {
        result = number;
    }
    ctx.store?.(result);
}
function h_art_shift(vm, [number, places], ctx) {
    // Arithmetic shift: positive = left, negative = right
    // Arithmetic right shift preserves sign bit
    const signedPlaces = toSigned16(places);
    const signedNumber = toSigned16(number);
    let result;
    if (signedPlaces > 0) {
        // Left shift
        result = signedNumber << signedPlaces;
    }
    else if (signedPlaces < 0) {
        // Right shift (arithmetic - sign extend)
        result = signedNumber >> -signedPlaces;
    }
    else {
        result = signedNumber;
    }
    // Convert back to unsigned 16-bit
    if (result < 0)
        result = result + 65536;
    result = result & 0xffff;
    ctx.store?.(result);
}
function h_set_font(vm, [fontNum], ctx) {
    // Set font (v5+)
    // Font 0 = previous font
    // Font 1 = normal
    // Font 3 = character graphics
    // Font 4 = fixed-pitch
    // Return previous font number, or 0 if requested font unavailable
    // For now, just accept font 1 (normal) and return 1
    if (fontNum === 1 || fontNum === 0) {
        ctx.store?.(1);
    }
    else {
        // Font not available
        ctx.store?.(0);
    }
}
function h_save_undo(vm, _ops, ctx) {
    // Save current state for undo (v5+)
    // Return -1 on first call (save failed), or number of bytes saved
    // For now, not implemented
    ctx.store?.(-1);
}
function h_restore_undo(vm, _ops, ctx) {
    // Restore state from undo (v5+)
    // Return 0 if no undo state available, 2 if successful
    // For now, not implemented
    ctx.store?.(0);
}
function h_print_unicode(vm, [charCode]) {
    // Print a Unicode character (v5+)
    // For basic ASCII/Latin-1, this works the same as print_char
    if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(String.fromCharCode(charCode));
    }
    else {
        console.log(String.fromCharCode(charCode));
    }
}
function h_check_unicode(vm, [charCode], ctx) {
    // Check if Unicode character can be printed (v5+)
    // Return 0 = cannot print, 1 = can print
    // For simplicity, accept all characters in basic multilingual plane
    if (charCode >= 0 && charCode <= 0xffff) {
        ctx.store?.(1);
    }
    else {
        ctx.store?.(0);
    }
}
