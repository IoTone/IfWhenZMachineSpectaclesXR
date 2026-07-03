"use strict";
// Flow control handlers (return, branch, quit, etc.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_rtrue = h_rtrue;
exports.h_rfalse = h_rfalse;
exports.h_ret = h_ret;
exports.h_ret_popped = h_ret_popped;
exports.h_quit = h_quit;
exports.h_jz = h_jz;
exports.h_jl = h_jl;
exports.h_jg = h_jg;
exports.h_je = h_je;
exports.h_jump = h_jump;
function h_rtrue(vm) {
    vm.returnFromRoutine(1);
}
function h_rfalse(vm) {
    vm.returnFromRoutine(0);
}
function h_ret(vm, [val]) {
    vm.returnFromRoutine(val);
}
function h_ret_popped(vm) {
    const value = vm.stack.pop() || 0;
    vm.returnFromRoutine(value);
}
function h_quit(vm) {
    throw new Error("QUIT");
}
function h_jz(vm, [x], ctx) {
    ctx.branch?.(x === 0);
}
function h_jl(vm, [a, b], ctx) {
    const signedA = a > 32767 ? a - 65536 : a;
    const signedB = b > 32767 ? b - 65536 : b;
    ctx.branch?.(signedA < signedB);
}
function h_jg(vm, [a, b], ctx) {
    const signedA = a > 32767 ? a - 65536 : a;
    const signedB = b > 32767 ? b - 65536 : b;
    ctx.branch?.(signedA > signedB);
}
function h_je(vm, ops, ctx) {
    const [a, ...rest] = ops;
    ctx.branch?.(rest.some((v) => v === a));
}
function h_jump(vm, [offset]) {
    // Convert to signed 16-bit
    const signedOffset = offset > 32767 ? offset - 65536 : offset;
    vm.pc = vm.pc + signedOffset - 2;
}
// 0OP:0x09 catch (v5+): store an opaque handle for the current call frame.
// callStack.length uniquely identifies the frame boundary in this VM's layout,
// so it doubles as the handle @throw truncates back to.
function h_catch(vm, _operands, ctx) {
    ctx.store?.(vm.callStack.length);
}
exports.h_catch = h_catch;
// 2OP:0x1c throw (v5+): unwind the call stack to a frame handle produced by
// @catch, then return from that routine with the given value.
function h_throw(vm, [value, frame]) {
    if (frame > vm.callStack.length) {
        throw new Error(`@throw: invalid frame handle ${frame} (call stack size ${vm.callStack.length})`);
    }
    vm.callStack.length = frame;
    // argCountStack can't know how many frames were discarded; clamp so the
    // guarded pop in returnFromRoutine stays safe.
    if (vm.argCountStack && vm.argCountStack.length > frame) {
        vm.argCountStack.length = frame;
    }
    vm.returnFromRoutine(value);
}
exports.h_throw = h_throw;
// 0OP:0x07 restart: reload the game image and reset all execution state.
async function h_restart(vm) {
    vm.stack = [];
    vm.callStack = [];
    vm.localVariables = [];
    vm.currentContext = 0;
    vm.currentArgCount = 0;
    vm.argCountStack = [];
    await vm.load();
}
exports.h_restart = h_restart;
