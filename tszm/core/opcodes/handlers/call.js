"use strict";
// Call/routine handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_call = h_call;
exports.h_call_1s = h_call_1s;
exports.h_call_2s = h_call_2s;
function h_call(vm, operands, ctx) {
    if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
    }
    // Calling packed address 0 means "return FALSE immediately"
    const packedAddress = operands[0];
    if (packedAddress === 0) {
        if (vm.trace) {
            console.log(`@call routine address 0: returning FALSE`);
        }
        ctx.store?.(0);
        return;
    }
    // Unpack routine address based on version
    let routineAddress = packedAddress;
    if (vm.header.version <= 3) {
        routineAddress *= 2;
    }
    else if (vm.header.version <= 5) {
        routineAddress *= 4;
    }
    else {
        routineAddress *= 8;
    }
    // Check if routine address is out of bounds
    if (routineAddress >= vm.memory.length) {
        if (vm.trace) {
            console.log(`@call Routine address ${routineAddress.toString(16)} (packed ${packedAddress.toString(16)}) is out of bounds (file size ${vm.memory.length}), returning FALSE`);
        }
        ctx.store?.(0);
        return;
    }
    if (vm.trace) {
        console.log(`@call Calling routine at ${routineAddress.toString(16)} with ${operands.length - 1} args`);
    }
    // Save return info on call stack
    vm.callStack.push(vm.pc);
    // Note: Store handling needs to be worked out with the new context system
    const storeTarget = vm._currentStoreTarget;
    if (storeTarget !== undefined) {
        vm.callStack.push(storeTarget);
    }
    // Save current local variables
    const savedLocalCount = vm.localVariables.length;
    for (let i = 0; i < savedLocalCount; i++) {
        vm.callStack.push(vm.localVariables[i]);
    }
    vm.callStack.push(savedLocalCount);
    const frameMarker = storeTarget !== undefined ? 1 : 0;
    vm.callStack.push(frameMarker);
    // Track argument count for @check_arg_count (kept on a parallel stack so
    // the Quetzal call-stack frame layout is unchanged).
    if (!vm.argCountStack) vm.argCountStack = [];
    vm.argCountStack.push(vm.currentArgCount || 0);
    vm.currentArgCount = operands.length - 1;
    // Set up new routine context
    vm.currentContext = routineAddress;
    let newPC = vm.currentContext;
    const localVarCount = vm.memory.readUInt8(newPC);
    newPC++;
    // Initialize local variables array
    vm.localVariables = [];
    if (vm.header.version <= 4) {
        // Version 1-4: initial values are in the story file
        for (let i = 0; i < localVarCount; i++) {
            const initialValue = vm.memory.readUInt16BE(newPC);
            newPC += 2;
            if (i < operands.length - 1) {
                vm.localVariables[i] = operands[i + 1];
            }
            else {
                vm.localVariables[i] = initialValue;
            }
        }
    }
    else {
        // Version 5+: no initial values in story file
        for (let i = 0; i < localVarCount; i++) {
            if (i < operands.length - 1) {
                vm.localVariables[i] = operands[i + 1];
            }
            else {
                vm.localVariables[i] = 0;
            }
        }
    }
    vm.pc = newPC;
}
function h_call_1s(vm, [packedAddr], ctx) {
    if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
    }
    // Calling packed address 0 means "return FALSE immediately"
    if (packedAddr === 0) {
        if (vm.trace) {
            console.log(`@call_1s routine address 0: returning FALSE`);
        }
        ctx.store?.(0);
        return;
    }
    // Unpack routine address based on version
    let routineAddress = packedAddr;
    if (vm.header.version <= 3) {
        routineAddress *= 2;
    }
    else if (vm.header.version <= 5) {
        routineAddress *= 4;
    }
    else {
        routineAddress *= 8;
    }
    // Check if routine address is out of bounds
    if (routineAddress >= vm.memory.length) {
        if (vm.trace) {
            console.log(`@call_1s Routine address ${routineAddress.toString(16)} (packed ${packedAddr.toString(16)}) is out of bounds (file size ${vm.memory.length}), returning FALSE`);
        }
        ctx.store?.(0);
        return;
    }
    if (vm.trace) {
        console.log(`@call_1s Calling routine at ${routineAddress.toString(16)}`);
    }
    // Save return info on call stack
    vm.callStack.push(vm.pc);
    // Store variable is handled by ctx.store callback after routine returns
    // For now, we need to save the store target
    // TODO: This needs to be refactored to work with the new context system
    const storeTarget = vm._currentStoreTarget;
    if (storeTarget !== undefined) {
        vm.callStack.push(storeTarget);
    }
    // Save current local variables
    const savedLocalCount = vm.localVariables.length;
    for (let i = 0; i < savedLocalCount; i++) {
        vm.callStack.push(vm.localVariables[i]);
    }
    vm.callStack.push(savedLocalCount);
    const frameMarker = storeTarget !== undefined ? 1 : 0;
    vm.callStack.push(frameMarker);
    // Track argument count for @check_arg_count (parallel stack; see h_call).
    if (!vm.argCountStack) vm.argCountStack = [];
    vm.argCountStack.push(vm.currentArgCount || 0);
    vm.currentArgCount = 0;
    if (vm.trace) {
        console.log(`@call_1s Pushed: returnPC=${vm.pc.toString(16)}, storeVar=${storeTarget}, savedLocals=${savedLocalCount}, marker=${frameMarker}`);
    }
    // Set up new routine context
    vm.currentContext = routineAddress;
    let newPC = vm.currentContext;
    const localVarCount = vm.memory.readUInt8(newPC);
    newPC++;
    // Initialize local variables array
    vm.localVariables = [];
    // In versions 1-4, read initial values for local variables
    // In versions 5+, locals are initialized to 0
    if (vm.header.version <= 4) {
        for (let i = 0; i < localVarCount; i++) {
            const initialValue = vm.memory.readUInt16BE(newPC);
            newPC += 2;
            vm.localVariables[i] = initialValue;
        }
    }
    else {
        for (let i = 0; i < localVarCount; i++) {
            vm.localVariables[i] = 0;
        }
    }
    // Set PC to start of routine body
    vm.pc = newPC;
}
function h_call_2s(vm, operands, ctx) {
    // call_2s is just call with 1 or 2 arguments (packed routine address + up to 2 args)
    // We can reuse h_call since it handles variable argument counts
    h_call(vm, operands, ctx);
}
// VAR:0xff check_arg_count (v5+): branch if the current routine was called
// with at least `argNum` arguments. Uses the parallel arg-count tracking
// maintained by the call handlers above.
function h_check_arg_count(vm, [argNum], ctx) {
    ctx.branch?.((vm.currentArgCount || 0) >= argNum);
}
exports.h_check_arg_count = h_check_arg_count;
