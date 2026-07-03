"use strict";
// Stack manipulation handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_pop = h_pop;
exports.h_push = h_push;
exports.h_pull = h_pull;
exports.h_random = h_random;
function toSigned16(n) {
    return n > 32767 ? n - 65536 : n;
}
function h_pop(vm) {
    vm.stack.pop();
}
function h_push(vm, [value]) {
    vm.stack.push(value);
}
function h_pull(vm, [varNum]) {
    if (vm.trace) {
        console.log(`@pull: stack length=${vm.stack.length}, target var=${varNum}`);
    }
    if (vm.stack.length === 0) {
        console.error("Stack underflow in pull");
        return;
    }
    const value = vm.stack.pop() || 0;
    if (vm.trace) {
        console.log(`@pull: pulled value=${value}, storing to var ${varNum}`);
    }
    // Z-spec 6.3.4: pull to variable 0 writes the (new) top of stack in place.
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
function h_random(vm, [range], ctx) {
    const signedRange = toSigned16(range);
    let randomValue;
    if (signedRange > 0) {
        if (vm._rngSeed !== undefined) {
            // Seeded (predictable) mode: xorshift-style LCG for determinism
            vm._rngSeed = (vm._rngSeed * 1103515245 + 12345) & 0x7fffffff;
            randomValue = (vm._rngSeed % signedRange) + 1;
        }
        else {
            randomValue = Math.floor(Math.random() * signedRange) + 1;
        }
    }
    else if (signedRange < 0) {
        // Negative range: seed the RNG deterministically, return 0
        vm._rngSeed = -signedRange;
        randomValue = 0;
    }
    else {
        // Range 0: re-randomize (leave predictable mode), return 0
        vm._rngSeed = undefined;
        randomValue = 0;
    }
    ctx.store?.(randomValue);
}
