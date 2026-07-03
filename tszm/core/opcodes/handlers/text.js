"use strict";
// Text output handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.h_print = h_print;
exports.h_print_ret = h_print_ret;
exports.h_new_line = h_new_line;
exports.h_print_num = h_print_num;
exports.h_print_addr = h_print_addr;
exports.h_print_paddr = h_print_paddr;
function h_print(vm) {
    vm.print();
}
function h_print_ret(vm) {
    vm.print();
    if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString("\n");
    }
    else {
        console.log("\n");
    }
    vm.returnFromRoutine(1);
}
function h_new_line(vm) {
    if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString("\n");
    }
    else {
        console.log("\n");
    }
}
function h_print_num(vm, [n]) {
    // Convert to signed 16-bit
    const signedNum = n > 32767 ? n - 65536 : n;
    if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(signedNum.toString());
    }
    else {
        console.log(signedNum.toString());
    }
}
function h_print_addr(vm, [addr]) {
    const origPC = vm.pc;
    vm.pc = addr;
    vm.print();
    vm.pc = origPC;
}
function h_print_paddr(vm, [packedAddr]) {
    // Packed string address calculation depends on version
    // V1-3: multiply by 2
    // V4-5: multiply by 4
    // V6-7: multiply by 4 (or 8 for some V6/7 games, but typically 4)
    // V8: multiply by 8
    const version = vm.header?.version || 3;
    let multiplier;
    if (version <= 3) {
        multiplier = 2;
    }
    else if (version <= 5) {
        multiplier = 4;
    }
    else if (version <= 7) {
        multiplier = 4; // Some V6/7 may use 8, but 4 is standard
    }
    else {
        multiplier = 8;
    }
    const addr = packedAddr * multiplier;
    const origPC = vm.pc;
    vm.pc = addr;
    vm.print();
    vm.pc = origPC;
}
