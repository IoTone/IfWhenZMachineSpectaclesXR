"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// spectacles/shims.js
var require_shims = __commonJS({
  "spectacles/shims.js"(exports2, module2) {
    "use strict";
    var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var B64_REV = (() => {
      const t = new Int16Array(256).fill(-1);
      for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
      t["=".charCodeAt(0)] = -2;
      return t;
    })();
    function bytesToBase64(bytes) {
      let out = "";
      const len = bytes.length;
      let i = 0;
      for (; i + 2 < len; i += 3) {
        const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
        out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63];
      }
      const rem = len - i;
      if (rem === 1) {
        const n = bytes[i] << 16;
        out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + "==";
      } else if (rem === 2) {
        const n = bytes[i] << 16 | bytes[i + 1] << 8;
        out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + "=";
      }
      return out;
    }
    function base64ToBytes(str) {
      let valid = 0;
      let pad = 0;
      for (let i = 0; i < str.length; i++) {
        const code = B64_REV[str.charCodeAt(i) & 255];
        if (code >= 0) valid++;
        else if (code === -2) pad++;
      }
      const outLen = (valid + pad >> 2) * 3 - pad;
      const out = new Uint8Array(outLen < 0 ? 0 : outLen);
      let acc = 0;
      let bits = 0;
      let o = 0;
      for (let i = 0; i < str.length; i++) {
        const code = B64_REV[str.charCodeAt(i) & 255];
        if (code < 0) continue;
        acc = acc << 6 | code;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          out[o++] = acc >> bits & 255;
        }
      }
      return out;
    }
    function strToAsciiBytes(str) {
      const out = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 255;
      return out;
    }
    function strToUtf8Bytes(str) {
      const out = [];
      for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 128) {
          out.push(c);
        } else if (c < 2048) {
          out.push(192 | c >> 6, 128 | c & 63);
        } else if (c >= 55296 && c <= 56319 && i + 1 < str.length) {
          const c2 = str.charCodeAt(++i);
          c = 65536 + ((c & 1023) << 10) + (c2 & 1023);
          out.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
        } else {
          out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
        }
      }
      return Uint8Array.from(out);
    }
    function bytesToAscii(bytes, start, end) {
      let s = "";
      for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i] & 255);
      return s;
    }
    function bytesToUtf8(bytes, start, end) {
      let s = "";
      let i = start;
      while (i < end) {
        const b = bytes[i++];
        if (b < 128) {
          s += String.fromCharCode(b);
        } else if (b >= 192 && b < 224) {
          s += String.fromCharCode((b & 31) << 6 | bytes[i++] & 63);
        } else if (b >= 224 && b < 240) {
          s += String.fromCharCode((b & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
        } else {
          let cp = (b & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
          cp -= 65536;
          s += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023));
        }
      }
      return s;
    }
    var Buffer2 = class _Buffer extends Uint8Array {
      // new Buffer(size) | new Buffer(array | Uint8Array) | new Buffer(arrayBuffer)
      // (subarray/slice call the (buffer, byteOffset, length) Uint8Array form)
      static from(value, encoding) {
        if (typeof value === "string") {
          if (encoding === "base64") return new _Buffer(base64ToBytes(value));
          if (encoding === "utf8" || encoding === "utf-8") return new _Buffer(strToUtf8Bytes(value));
          return new _Buffer(strToAsciiBytes(value));
        }
        if (value instanceof Uint8Array) {
          const b = new _Buffer(value.length);
          b.set(value);
          return b;
        }
        if (value instanceof ArrayBuffer) {
          return new _Buffer(new Uint8Array(value));
        }
        return new _Buffer(Uint8Array.from(value));
      }
      static alloc(size) {
        return new _Buffer(size);
      }
      static concat(list, totalLength) {
        let total = totalLength;
        if (total === void 0) {
          total = 0;
          for (let i = 0; i < list.length; i++) total += list[i].length;
        }
        const out = new _Buffer(total);
        let offset = 0;
        for (let i = 0; i < list.length && offset < total; i++) {
          out.set(list[i], offset);
          offset += list[i].length;
        }
        return out;
      }
      static byteLength(value, encoding) {
        if (typeof value !== "string") return value.length;
        if (encoding === "base64") return base64ToBytes(value).length;
        if (encoding === "ascii" || encoding === "latin1" || encoding === "binary") return value.length;
        return strToUtf8Bytes(value).length;
      }
      static isBuffer(obj) {
        return obj instanceof _Buffer;
      }
      readUInt8(offset) {
        return this[offset];
      }
      readUInt16BE(offset) {
        return this[offset] << 8 | this[offset + 1];
      }
      readUInt32BE(offset) {
        return (this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]) >>> 0;
      }
      writeUInt8(value, offset) {
        this[offset] = value & 255;
        return offset + 1;
      }
      writeUInt16BE(value, offset) {
        this[offset] = value >>> 8 & 255;
        this[offset + 1] = value & 255;
        return offset + 2;
      }
      writeUInt32BE(value, offset) {
        this[offset] = value >>> 24 & 255;
        this[offset + 1] = value >>> 16 & 255;
        this[offset + 2] = value >>> 8 & 255;
        this[offset + 3] = value & 255;
        return offset + 4;
      }
      toString(encoding, start, end) {
        const s = start === void 0 ? 0 : start;
        const e = end === void 0 ? this.length : end;
        if (encoding === "base64") return bytesToBase64(this.subarray(s, e));
        if (encoding === "utf8" || encoding === "utf-8") return bytesToUtf8(this, s, e);
        return bytesToAscii(this, s, e);
      }
      // Share backing memory like Node and keep Buffer methods on the view.
      subarray(start, end) {
        const view = super.subarray(start, end);
        Object.setPrototypeOf(view, _Buffer.prototype);
        return view;
      }
      slice(start, end) {
        return this.subarray(start, end);
      }
    };
    function randomUUID() {
      const b = new Uint8Array(16);
      for (let i = 0; i < 16; i++) b[i] = Math.random() * 256 & 255;
      b[6] = b[6] & 15 | 64;
      b[8] = b[8] & 63 | 128;
      const hex = [];
      for (let i = 0; i < 256; i++) hex.push((i + 256).toString(16).slice(1));
      return hex[b[0]] + hex[b[1]] + hex[b[2]] + hex[b[3]] + "-" + hex[b[4]] + hex[b[5]] + "-" + hex[b[6]] + hex[b[7]] + "-" + hex[b[8]] + hex[b[9]] + "-" + hex[b[10]] + hex[b[11]] + hex[b[12]] + hex[b[13]] + hex[b[14]] + hex[b[15]];
    }
    function installShims() {
      const g2 = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : this;
      if (!g2.Buffer) g2.Buffer = Buffer2;
      if (!g2.crypto) g2.crypto = {};
      if (!g2.crypto.randomUUID) g2.crypto.randomUUID = randomUUID;
      return g2;
    }
    installShims();
    module2.exports = {
      Buffer: Buffer2,
      randomUUID,
      bytesToBase64,
      base64ToBytes,
      strToAsciiBytes,
      strToUtf8Bytes,
      installShims
    };
  }
});

// core/opcodes/types.js
var require_types = __commonJS({
  "core/opcodes/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.dv = exports2.d2 = exports2.d1 = exports2.d0 = void 0;
    function mk(kind, max) {
      return (opcode, init) => {
        if (opcode < 0 || opcode > max)
          throw new Error(`${kind} opcode out of range: ${opcode}`);
        return { kind, opcode, ...init };
      };
    }
    exports2.d0 = mk("0OP", 15);
    exports2.d1 = mk("1OP", 15);
    exports2.d2 = mk("2OP", 31);
    exports2.dv = mk("VAR", 255);
  }
});

// core/opcodes/handlers/arithmetic.js
var require_arithmetic = __commonJS({
  "core/opcodes/handlers/arithmetic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_add = h_add;
    exports2.h_sub = h_sub;
    exports2.h_mul = h_mul;
    exports2.h_div = h_div;
    exports2.h_mod = h_mod;
    function toSigned16(n) {
      return n > 32767 ? n - 65536 : n;
    }
    function toUnsigned16(n) {
      if (n < 0)
        n = n + 65536;
      return n & 65535;
    }
    function h_add(vm, [a, b]) {
      const signedA = toSigned16(a);
      const signedB = toSigned16(b);
      const result = toUnsigned16(signedA + signedB);
      vm._storeResult?.(result);
    }
    function h_sub(vm, [a, b]) {
      const signedA = toSigned16(a);
      const signedB = toSigned16(b);
      const result = toUnsigned16(signedA - signedB);
      vm._storeResult?.(result);
    }
    function h_mul(vm, [a, b]) {
      const signedA = toSigned16(a);
      const signedB = toSigned16(b);
      const result = toUnsigned16(signedA * signedB);
      vm._storeResult?.(result);
    }
    function h_div(vm, [a, b]) {
      const signedA = toSigned16(a);
      const signedB = toSigned16(b);
      if (signedB === 0) {
        console.error("Division by zero");
        return;
      }
      const result = toUnsigned16(Math.trunc(signedA / signedB));
      vm._storeResult?.(result);
    }
    function h_mod(vm, [a, b]) {
      const signedA = toSigned16(a);
      const signedB = toSigned16(b);
      if (signedB === 0) {
        console.error("Modulo by zero");
        return;
      }
      const result = toUnsigned16(signedA % signedB);
      vm._storeResult?.(result);
    }
  }
});

// core/opcodes/handlers/logic.js
var require_logic = __commonJS({
  "core/opcodes/handlers/logic.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_and = h_and;
    exports2.h_or = h_or;
    exports2.h_not = h_not;
    exports2.h_test = h_test;
    function h_and(vm, [a, b]) {
      const res = a & b & 65535;
      vm._storeResult?.(res);
    }
    function h_or(vm, [a, b]) {
      const res = (a | b) & 65535;
      vm._storeResult?.(res);
    }
    function h_not(vm, [a]) {
      const res = ~a & 65535;
      vm._storeResult?.(res);
    }
    function h_test(vm, [bitmap, flags], ctx) {
      ctx.branch?.((bitmap & flags) === flags);
    }
  }
});

// core/opcodes/handlers/flow.js
var require_flow = __commonJS({
  "core/opcodes/handlers/flow.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_rtrue = h_rtrue;
    exports2.h_rfalse = h_rfalse;
    exports2.h_ret = h_ret;
    exports2.h_ret_popped = h_ret_popped;
    exports2.h_quit = h_quit;
    exports2.h_jz = h_jz;
    exports2.h_jl = h_jl;
    exports2.h_jg = h_jg;
    exports2.h_je = h_je;
    exports2.h_jump = h_jump;
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
      const signedOffset = offset > 32767 ? offset - 65536 : offset;
      vm.pc = vm.pc + signedOffset - 2;
    }
    function h_catch(vm, _operands, ctx) {
      ctx.store?.(vm.callStack.length);
    }
    exports2.h_catch = h_catch;
    function h_throw(vm, [value, frame]) {
      if (frame > vm.callStack.length) {
        throw new Error(`@throw: invalid frame handle ${frame} (call stack size ${vm.callStack.length})`);
      }
      vm.callStack.length = frame;
      if (vm.argCountStack && vm.argCountStack.length > frame) {
        vm.argCountStack.length = frame;
      }
      vm.returnFromRoutine(value);
    }
    exports2.h_throw = h_throw;
    async function h_restart(vm) {
      vm.stack = [];
      vm.callStack = [];
      vm.localVariables = [];
      vm.currentContext = 0;
      vm.currentArgCount = 0;
      vm.argCountStack = [];
      await vm.load();
    }
    exports2.h_restart = h_restart;
  }
});

// core/opcodes/handlers/text.js
var require_text = __commonJS({
  "core/opcodes/handlers/text.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_print = h_print;
    exports2.h_print_ret = h_print_ret;
    exports2.h_new_line = h_new_line;
    exports2.h_print_num = h_print_num;
    exports2.h_print_addr = h_print_addr;
    exports2.h_print_paddr = h_print_paddr;
    function h_print(vm) {
      vm.print();
    }
    function h_print_ret(vm) {
      vm.print();
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString("\n");
      } else {
        console.log("\n");
      }
      vm.returnFromRoutine(1);
    }
    function h_new_line(vm) {
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString("\n");
      } else {
        console.log("\n");
      }
    }
    function h_print_num(vm, [n]) {
      const signedNum = n > 32767 ? n - 65536 : n;
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(signedNum.toString());
      } else {
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
      const version = vm.header?.version || 3;
      let multiplier;
      if (version <= 3) {
        multiplier = 2;
      } else if (version <= 5) {
        multiplier = 4;
      } else if (version <= 7) {
        multiplier = 4;
      } else {
        multiplier = 8;
      }
      const addr = packedAddr * multiplier;
      const origPC = vm.pc;
      vm.pc = addr;
      vm.print();
      vm.pc = origPC;
    }
  }
});

// core/opcodes/handlers/stack.js
var require_stack = __commonJS({
  "core/opcodes/handlers/stack.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_pop = h_pop;
    exports2.h_push = h_push;
    exports2.h_pull = h_pull;
    exports2.h_random = h_random;
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
      if (varNum === 0) {
        if (vm.stack.length > 0) {
          vm.stack[vm.stack.length - 1] = value;
        } else {
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
        if (vm._rngSeed !== void 0) {
          vm._rngSeed = vm._rngSeed * 1103515245 + 12345 & 2147483647;
          randomValue = vm._rngSeed % signedRange + 1;
        } else {
          randomValue = Math.floor(Math.random() * signedRange) + 1;
        }
      } else if (signedRange < 0) {
        vm._rngSeed = -signedRange;
        randomValue = 0;
      } else {
        vm._rngSeed = void 0;
        randomValue = 0;
      }
      ctx.store?.(randomValue);
    }
  }
});

// core/opcodes/handlers/objects.js
var require_objects = __commonJS({
  "core/opcodes/handlers/objects.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_get_sibling = h_get_sibling;
    exports2.h_get_child = h_get_child;
    exports2.h_get_parent = h_get_parent;
    exports2.h_remove_obj = h_remove_obj;
    exports2.h_print_obj = h_print_obj;
    exports2.h_test_attr = h_test_attr;
    exports2.h_set_attr = h_set_attr;
    exports2.h_clear_attr = h_clear_attr;
    exports2.h_jin = h_jin;
    exports2.h_insert_obj = h_insert_obj;
    function h_get_sibling(vm, [objectId], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      let siblingValue;
      if (vm.header.version <= 3) {
        siblingValue = vm.memory.readUInt8(objectAddress + 5);
      } else {
        siblingValue = vm.memory.readUInt16BE(objectAddress + 8);
      }
      ctx.store?.(siblingValue);
      ctx.branch?.(siblingValue !== 0);
    }
    function h_get_child(vm, [objectId], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      let childValue;
      if (vm.header.version <= 3) {
        childValue = vm.memory.readUInt8(objectAddress + 6);
      } else {
        childValue = vm.memory.readUInt16BE(objectAddress + 10);
      }
      ctx.store?.(childValue);
      ctx.branch?.(childValue !== 0);
    }
    function h_get_parent(vm, [objectId], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      let parentValue;
      if (vm.header.version <= 3) {
        parentValue = vm.memory.readUInt8(objectAddress + 4);
      } else {
        parentValue = vm.memory.readUInt16BE(objectAddress + 6);
      }
      ctx.store?.(parentValue);
    }
    function h_remove_obj(vm, [objectId]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      if (objectId === 0) {
        return;
      }
      const objAddress = vm.getObjectAddress(objectId);
      let parentId;
      if (vm.header.version <= 3) {
        parentId = vm.memory.readUInt8(objAddress + 4);
      } else {
        parentId = vm.memory.readUInt16BE(objAddress + 6);
      }
      if (parentId === 0) {
        return;
      }
      const parentAddress = vm.getObjectAddress(parentId);
      let parentChildId;
      if (vm.header.version <= 3) {
        parentChildId = vm.memory.readUInt8(parentAddress + 6);
      } else {
        parentChildId = vm.memory.readUInt16BE(parentAddress + 10);
      }
      if (parentChildId === objectId) {
        let objSiblingId;
        if (vm.header.version <= 3) {
          objSiblingId = vm.memory.readUInt8(objAddress + 5);
          vm.memory.writeUInt8(objSiblingId, parentAddress + 6);
        } else {
          objSiblingId = vm.memory.readUInt16BE(objAddress + 8);
          vm.memory.writeUInt16BE(objSiblingId, parentAddress + 10);
        }
      } else {
        let currentChildId = parentChildId;
        while (currentChildId !== 0) {
          const currentChildAddress = vm.getObjectAddress(currentChildId);
          let currentChildSiblingId;
          if (vm.header.version <= 3) {
            currentChildSiblingId = vm.memory.readUInt8(currentChildAddress + 5);
          } else {
            currentChildSiblingId = vm.memory.readUInt16BE(currentChildAddress + 8);
          }
          if (currentChildSiblingId === objectId) {
            let objSiblingId;
            if (vm.header.version <= 3) {
              objSiblingId = vm.memory.readUInt8(objAddress + 5);
              vm.memory.writeUInt8(objSiblingId, currentChildAddress + 5);
            } else {
              objSiblingId = vm.memory.readUInt16BE(objAddress + 8);
              vm.memory.writeUInt16BE(objSiblingId, currentChildAddress + 8);
            }
            break;
          }
          currentChildId = currentChildSiblingId;
        }
      }
      if (vm.header.version <= 3) {
        vm.memory.writeUInt8(0, objAddress + 4);
        vm.memory.writeUInt8(0, objAddress + 5);
      } else {
        vm.memory.writeUInt16BE(0, objAddress + 6);
        vm.memory.writeUInt16BE(0, objAddress + 8);
      }
    }
    function h_print_obj(vm, [objectId]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
      const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
      const origPC = vm.pc;
      vm.pc = propertyTableAddr + 1;
      vm.print();
      vm.pc = origPC;
    }
    function h_test_attr(vm, [objectId, attrNum], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const attrByteCount = vm.header.version <= 3 ? 4 : 6;
      const attrByteIndex = Math.floor(attrNum / 8);
      const attrBitIndex = 7 - attrNum % 8;
      if (attrByteIndex >= attrByteCount) {
        console.error(`Invalid attribute number ${attrNum}`);
        return;
      }
      const attrByte = vm.memory.readUInt8(objectAddress + attrByteIndex);
      const hasAttr = (attrByte >> attrBitIndex & 1) === 1;
      ctx.branch?.(hasAttr);
    }
    function h_set_attr(vm, [objectId, attrNum]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const attrByteCount = vm.header.version <= 3 ? 4 : 6;
      const attrByteIndex = Math.floor(attrNum / 8);
      const attrBitIndex = 7 - attrNum % 8;
      if (attrByteIndex >= attrByteCount) {
        console.error(`Invalid attribute number ${attrNum}`);
        return;
      }
      const attrByte = vm.memory.readUInt8(objectAddress + attrByteIndex);
      const newByte = attrByte | 1 << attrBitIndex;
      vm.memory.writeUInt8(newByte, objectAddress + attrByteIndex);
    }
    function h_clear_attr(vm, [objectId, attrNum]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const attrByteCount = vm.header.version <= 3 ? 4 : 6;
      const attrByteIndex = Math.floor(attrNum / 8);
      const attrBitIndex = 7 - attrNum % 8;
      if (attrByteIndex >= attrByteCount) {
        console.error(`Invalid attribute number ${attrNum}`);
        return;
      }
      const attrByte = vm.memory.readUInt8(objectAddress + attrByteIndex);
      const newByte = attrByte & ~(1 << attrBitIndex);
      vm.memory.writeUInt8(newByte, objectAddress + attrByteIndex);
    }
    function h_jin(vm, [obj1, obj2], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const obj1Address = vm.getObjectAddress(obj1);
      let parent;
      if (vm.header.version <= 3) {
        parent = vm.memory.readUInt8(obj1Address + 4);
      } else {
        parent = vm.memory.readUInt16BE(obj1Address + 6);
      }
      ctx.branch?.(parent === obj2);
    }
    function h_insert_obj(vm, [objectId, destId]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objAddress = vm.getObjectAddress(objectId);
      const destAddress = vm.getObjectAddress(destId);
      if (vm.header.version <= 3) {
        const oldParent = vm.memory.readUInt8(objAddress + 4);
        if (oldParent !== 0) {
          if (!vm.playerObjectNumber) {
            if (vm.lastRead) {
              if (!vm.lastRead.startsWith("dr") && !vm.lastRead.startsWith("ta"))
                vm.setPlayerObjectNumber(objectId);
            }
          }
          const oldParentAddress = vm.getObjectAddress(oldParent);
          const oldParentChild = vm.memory.readUInt8(oldParentAddress + 6);
          if (oldParentChild === objectId) {
            const objSibling = vm.memory.readUInt8(objAddress + 5);
            vm.memory.writeUInt8(objSibling, oldParentAddress + 6);
          } else {
            let currentObj = oldParentChild;
            while (currentObj !== 0) {
              const currentObjAddress = vm.getObjectAddress(currentObj);
              const nextSibling = vm.memory.readUInt8(currentObjAddress + 5);
              if (nextSibling === objectId) {
                const objSibling = vm.memory.readUInt8(objAddress + 5);
                vm.memory.writeUInt8(objSibling, currentObjAddress + 5);
                break;
              }
              currentObj = nextSibling;
            }
          }
        }
        const destChild = vm.memory.readUInt8(destAddress + 6);
        vm.memory.writeUInt8(destChild, objAddress + 5);
        vm.memory.writeUInt8(objectId, destAddress + 6);
        vm.memory.writeUInt8(destId, objAddress + 4);
      } else {
        const oldParent = vm.memory.readUInt16BE(objAddress + 6);
        if (!vm.playerObjectNumber) {
          if (vm.lastRead) {
            if (!vm.lastRead.startsWith("dr") && !vm.lastRead.startsWith("ta"))
              vm.setPlayerObjectNumber(objectId);
          }
        }
        if (oldParent !== 0) {
          const oldParentAddress = vm.getObjectAddress(oldParent);
          const oldParentChild = vm.memory.readUInt16BE(oldParentAddress + 10);
          if (oldParentChild === objectId) {
            const objSibling = vm.memory.readUInt16BE(objAddress + 8);
            vm.memory.writeUInt16BE(objSibling, oldParentAddress + 10);
          } else {
            let currentObj = oldParentChild;
            while (currentObj !== 0) {
              const currentObjAddress = vm.getObjectAddress(currentObj);
              const nextSibling = vm.memory.readUInt16BE(currentObjAddress + 8);
              if (nextSibling === objectId) {
                const objSibling = vm.memory.readUInt16BE(objAddress + 8);
                vm.memory.writeUInt16BE(objSibling, currentObjAddress + 8);
                break;
              }
              currentObj = nextSibling;
            }
          }
        }
        const destChild = vm.memory.readUInt16BE(destAddress + 10);
        vm.memory.writeUInt16BE(destChild, objAddress + 8);
        vm.memory.writeUInt16BE(objectId, destAddress + 10);
        vm.memory.writeUInt16BE(destId, objAddress + 6);
      }
    }
  }
});

// core/opcodes/handlers/misc.js
var require_misc = __commonJS({
  "core/opcodes/handlers/misc.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_nop = h_nop;
    exports2.h_show_status = h_show_status;
    exports2.h_verify = h_verify;
    exports2.h_piracy = h_piracy;
    function h_nop(vm) {
    }
    function h_show_status(vm) {
      if (vm.trace) {
        console.log("@show_status");
      }
      if (!vm.inputOutputDevice || !vm.memory || !vm.header) {
        return;
      }
      if (vm.header.version > 3) {
        return;
      }
      let termWidth = 80;
      if (vm.inputOutputDevice?.cols) {
        termWidth = vm.inputOutputDevice.cols;
      } else if (typeof process !== "undefined" && process.stdout?.columns) {
        termWidth = process.stdout.columns;
      }
      const locationObj = vm.getVariableValue(16);
      if (vm.trace) {
        console.log(`  Location object: ${locationObj}`);
      }
      let locationName = "";
      if (locationObj && locationObj > 0) {
        const { h_get_prop_addr } = require_objects();
        const objectAddress = vm.header.objectTableAddress + (vm.header.version <= 3 ? 31 * 2 : 63 * 2) + (locationObj - 1) * (vm.header.version <= 3 ? 9 : 14);
        const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
        const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
        const origPC = vm.pc;
        vm.pc = propertyTableAddr + 1;
        locationName = vm.decodeZSCII(true);
        vm.pc = origPC;
      }
      const flags1 = vm.memory.readUInt8(1);
      const isTimeGame = (flags1 & 2) !== 0;
      let rightText = "";
      if (isTimeGame) {
        const hours = vm.getVariableValue(17) || 0;
        const minutes = vm.getVariableValue(18) || 0;
        if (vm.trace) {
          console.log(`  Time: ${hours}:${minutes}`);
        }
        rightText = `Time: ${hours.toString().padStart(2, " ")}:${minutes.toString().padStart(2, "0")}`;
      } else {
        const score = vm.getVariableValue(17) || 0;
        const turns = vm.getVariableValue(18) || 0;
        if (vm.trace) {
          console.log(`  Score: ${score}, Moves: ${turns}`);
        }
        rightText = `Score: ${score}  Moves: ${turns}`;
      }
      const leftText = " " + locationName;
      const padding = termWidth - leftText.length - rightText.length - 1;
      const statusLine = leftText + " ".repeat(Math.max(0, padding)) + rightText;
      const finalStatusLine = statusLine.slice(0, termWidth - 1);
      const statusLineSequence = "\x1B7\x1B[1;1H\x1B[7m" + // Reverse video
      finalStatusLine + "\x1B[0m\x1B8";
      vm.inputOutputDevice.writeString(statusLineSequence);
    }
    function h_verify(vm, _ops, ctx) {
      ctx.branch?.(true);
    }
    function h_piracy(vm, _ops, ctx) {
      ctx.branch?.(true);
    }
  }
});

// core/opcodes/handlers/properties.js
var require_properties = __commonJS({
  "core/opcodes/handlers/properties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_get_prop_len = h_get_prop_len;
    exports2.h_get_prop = h_get_prop;
    exports2.h_get_prop_addr = h_get_prop_addr;
    exports2.h_get_next_prop = h_get_next_prop;
    exports2.h_put_prop = h_put_prop;
    function h_get_prop_len(vm, [propDataAddr], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      if (propDataAddr === 0) {
        ctx.store?.(0);
        return;
      }
      const sizeByte = vm.memory.readUInt8(propDataAddr - 1);
      let propLen;
      if (vm.header.version <= 3) {
        propLen = (sizeByte >> 5) + 1;
      } else {
        if (sizeByte & 128) {
          propLen = sizeByte & 63;
          if (propLen === 0)
            propLen = 64;
        } else {
          propLen = sizeByte & 64 ? 2 : 1;
        }
      }
      ctx.store?.(propLen);
    }
    function h_get_prop(vm, [objectId, propNum], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
      const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
      const nameLength = vm.memory.readUInt8(propertyTableAddr);
      let propAddr = propertyTableAddr + 1 + nameLength * 2;
      let propValue = 0;
      let found = false;
      while (true) {
        const sizeByte = vm.memory.readUInt8(propAddr);
        if (sizeByte === 0)
          break;
        let currentNum;
        let dataSize;
        if (vm.header.version <= 3) {
          dataSize = (sizeByte >> 5) + 1;
          currentNum = sizeByte & 31;
          propAddr += 1;
        } else {
          currentNum = sizeByte & 63;
          if (sizeByte & 128) {
            const secondByte = vm.memory.readUInt8(propAddr + 1);
            dataSize = secondByte & 63;
            if (dataSize === 0)
              dataSize = 64;
            propAddr += 2;
          } else {
            dataSize = sizeByte & 64 ? 2 : 1;
            propAddr += 1;
          }
        }
        if (currentNum === propNum) {
          if (dataSize === 1) {
            propValue = vm.memory.readUInt8(propAddr);
          } else if (dataSize === 2) {
            propValue = vm.memory.readUInt16BE(propAddr);
          } else {
            console.error(`Invalid property size ${dataSize} for get_prop`);
            return;
          }
          found = true;
          break;
        }
        propAddr += dataSize;
      }
      if (!found) {
        const defaultAddr = vm.header.objectTableAddress + (propNum - 1) * 2;
        propValue = vm.memory.readUInt16BE(defaultAddr);
      }
      ctx.store?.(propValue);
    }
    function h_get_prop_addr(vm, [objectId, propNum], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
      const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
      const nameLength = vm.memory.readUInt8(propertyTableAddr);
      let propAddr = propertyTableAddr + 1 + nameLength * 2;
      let result = 0;
      while (true) {
        const sizeByte = vm.memory.readUInt8(propAddr);
        if (sizeByte === 0)
          break;
        let currentNum;
        let dataSize;
        let dataAddr;
        if (vm.header.version <= 3) {
          dataSize = (sizeByte >> 5) + 1;
          currentNum = sizeByte & 31;
          dataAddr = propAddr + 1;
        } else {
          currentNum = sizeByte & 63;
          if (sizeByte & 128) {
            const secondByte = vm.memory.readUInt8(propAddr + 1);
            dataSize = secondByte & 63;
            if (dataSize === 0)
              dataSize = 64;
            dataAddr = propAddr + 2;
          } else {
            dataSize = sizeByte & 64 ? 2 : 1;
            dataAddr = propAddr + 1;
          }
        }
        if (currentNum === propNum) {
          result = dataAddr;
          break;
        }
        propAddr = dataAddr + dataSize;
      }
      ctx.store?.(result);
    }
    function h_get_next_prop(vm, [objectId, propNum], ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
      const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
      const nameLength = vm.memory.readUInt8(propertyTableAddr);
      let propAddr = propertyTableAddr + 1 + nameLength * 2;
      if (propNum === 0) {
        const sizeByte = vm.memory.readUInt8(propAddr);
        if (sizeByte === 0) {
          ctx.store?.(0);
          return;
        }
        let firstNum;
        if (vm.header.version <= 3) {
          firstNum = sizeByte & 31;
        } else {
          firstNum = sizeByte & 63;
        }
        ctx.store?.(firstNum);
        return;
      }
      while (true) {
        const sizeByte = vm.memory.readUInt8(propAddr);
        if (sizeByte === 0) {
          ctx.store?.(0);
          return;
        }
        let currentNum;
        let dataSize;
        if (vm.header.version <= 3) {
          dataSize = (sizeByte >> 5) + 1;
          currentNum = sizeByte & 31;
          propAddr += 1;
        } else {
          currentNum = sizeByte & 63;
          if (sizeByte & 128) {
            const secondByte = vm.memory.readUInt8(propAddr + 1);
            dataSize = secondByte & 63;
            if (dataSize === 0)
              dataSize = 64;
            propAddr += 2;
          } else {
            dataSize = sizeByte & 64 ? 2 : 1;
            propAddr += 1;
          }
        }
        if (currentNum === propNum) {
          propAddr += dataSize;
          const nextSizeByte = vm.memory.readUInt8(propAddr);
          if (nextSizeByte === 0) {
            ctx.store?.(0);
            return;
          }
          let nextNum;
          if (vm.header.version <= 3) {
            nextNum = nextSizeByte & 31;
          } else {
            nextNum = nextSizeByte & 63;
          }
          ctx.store?.(nextNum);
          return;
        }
        propAddr += dataSize;
      }
    }
    function h_put_prop(vm, [objectId, propNum, value]) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const objectAddress = vm.getObjectAddress(objectId);
      const objectEntrySize = vm.header.version <= 3 ? 9 : 14;
      const propertyTableAddr = vm.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
      const nameLength = vm.memory.readUInt8(propertyTableAddr);
      let propAddr = propertyTableAddr + 1 + nameLength * 2;
      while (true) {
        const sizeByte = vm.memory.readUInt8(propAddr);
        if (sizeByte === 0) {
          console.error(`Property ${propNum} not found on object ${objectId}`);
          return;
        }
        let currentNum;
        let dataSize;
        let dataAddr;
        if (vm.header.version <= 3) {
          dataSize = (sizeByte >> 5) + 1;
          currentNum = sizeByte & 31;
          dataAddr = propAddr + 1;
        } else {
          currentNum = sizeByte & 63;
          if (sizeByte & 128) {
            const secondByte = vm.memory.readUInt8(propAddr + 1);
            dataSize = secondByte & 63;
            if (dataSize === 0)
              dataSize = 64;
            dataAddr = propAddr + 2;
          } else {
            dataSize = sizeByte & 64 ? 2 : 1;
            dataAddr = propAddr + 1;
          }
        }
        if (currentNum === propNum) {
          if (dataSize === 1) {
            vm.memory.writeUInt8(value & 255, dataAddr);
          } else if (dataSize === 2) {
            vm.memory.writeUInt16BE(value, dataAddr);
          } else {
            console.error(`Invalid property size ${dataSize} for put_prop`);
            return;
          }
          return;
        }
        propAddr = dataAddr + dataSize;
      }
    }
  }
});

// core/opcodes/handlers/variables.js
var require_variables = __commonJS({
  "core/opcodes/handlers/variables.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_inc = h_inc;
    exports2.h_dec = h_dec;
    exports2.h_load = h_load;
    exports2.h_store = h_store;
    exports2.h_inc_chk = h_inc_chk;
    exports2.h_dec_chk = h_dec_chk;
    function toSigned16(n) {
      return n > 32767 ? n - 65536 : n;
    }
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
        } else {
          vm.stack.push(value);
        }
        return;
      }
      vm.setVariableValue(varNum, value);
    }
    function h_inc(vm, [varNum]) {
      const value = readVarInPlace(vm, varNum);
      writeVarInPlace(vm, varNum, value + 1 & 65535);
    }
    function h_dec(vm, [varNum]) {
      const value = readVarInPlace(vm, varNum);
      writeVarInPlace(vm, varNum, value - 1 & 65535);
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
      const newValue = value + 1 & 65535;
      writeVarInPlace(vm, varNum, newValue);
      const signedNew = toSigned16(newValue);
      const signedCompare = toSigned16(compareValue);
      ctx.branch?.(signedNew > signedCompare);
    }
    function h_dec_chk(vm, [varNum, compareValue], ctx) {
      const value = readVarInPlace(vm, varNum);
      const newValue = value - 1 & 65535;
      writeVarInPlace(vm, varNum, newValue);
      const signedNew = toSigned16(newValue);
      const signedCompare = toSigned16(compareValue);
      ctx.branch?.(signedNew < signedCompare);
    }
  }
});

// core/opcodes/handlers/call.js
var require_call = __commonJS({
  "core/opcodes/handlers/call.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_call = h_call;
    exports2.h_call_1s = h_call_1s;
    exports2.h_call_2s = h_call_2s;
    function h_call(vm, operands, ctx) {
      if (!vm.memory || !vm.header) {
        console.error("Memory or header not loaded");
        return;
      }
      const packedAddress = operands[0];
      if (packedAddress === 0) {
        if (vm.trace) {
          console.log(`@call routine address 0: returning FALSE`);
        }
        ctx.store?.(0);
        return;
      }
      let routineAddress = packedAddress;
      if (vm.header.version <= 3) {
        routineAddress *= 2;
      } else if (vm.header.version <= 5) {
        routineAddress *= 4;
      } else {
        routineAddress *= 8;
      }
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
      vm.callStack.push(vm.pc);
      const storeTarget = vm._currentStoreTarget;
      if (storeTarget !== void 0) {
        vm.callStack.push(storeTarget);
      }
      const savedLocalCount = vm.localVariables.length;
      for (let i = 0; i < savedLocalCount; i++) {
        vm.callStack.push(vm.localVariables[i]);
      }
      vm.callStack.push(savedLocalCount);
      const frameMarker = storeTarget !== void 0 ? 1 : 0;
      vm.callStack.push(frameMarker);
      if (!vm.argCountStack) vm.argCountStack = [];
      vm.argCountStack.push(vm.currentArgCount || 0);
      vm.currentArgCount = operands.length - 1;
      vm.currentContext = routineAddress;
      let newPC = vm.currentContext;
      const localVarCount = vm.memory.readUInt8(newPC);
      newPC++;
      vm.localVariables = [];
      if (vm.header.version <= 4) {
        for (let i = 0; i < localVarCount; i++) {
          const initialValue = vm.memory.readUInt16BE(newPC);
          newPC += 2;
          if (i < operands.length - 1) {
            vm.localVariables[i] = operands[i + 1];
          } else {
            vm.localVariables[i] = initialValue;
          }
        }
      } else {
        for (let i = 0; i < localVarCount; i++) {
          if (i < operands.length - 1) {
            vm.localVariables[i] = operands[i + 1];
          } else {
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
      if (packedAddr === 0) {
        if (vm.trace) {
          console.log(`@call_1s routine address 0: returning FALSE`);
        }
        ctx.store?.(0);
        return;
      }
      let routineAddress = packedAddr;
      if (vm.header.version <= 3) {
        routineAddress *= 2;
      } else if (vm.header.version <= 5) {
        routineAddress *= 4;
      } else {
        routineAddress *= 8;
      }
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
      vm.callStack.push(vm.pc);
      const storeTarget = vm._currentStoreTarget;
      if (storeTarget !== void 0) {
        vm.callStack.push(storeTarget);
      }
      const savedLocalCount = vm.localVariables.length;
      for (let i = 0; i < savedLocalCount; i++) {
        vm.callStack.push(vm.localVariables[i]);
      }
      vm.callStack.push(savedLocalCount);
      const frameMarker = storeTarget !== void 0 ? 1 : 0;
      vm.callStack.push(frameMarker);
      if (!vm.argCountStack) vm.argCountStack = [];
      vm.argCountStack.push(vm.currentArgCount || 0);
      vm.currentArgCount = 0;
      if (vm.trace) {
        console.log(`@call_1s Pushed: returnPC=${vm.pc.toString(16)}, storeVar=${storeTarget}, savedLocals=${savedLocalCount}, marker=${frameMarker}`);
      }
      vm.currentContext = routineAddress;
      let newPC = vm.currentContext;
      const localVarCount = vm.memory.readUInt8(newPC);
      newPC++;
      vm.localVariables = [];
      if (vm.header.version <= 4) {
        for (let i = 0; i < localVarCount; i++) {
          const initialValue = vm.memory.readUInt16BE(newPC);
          newPC += 2;
          vm.localVariables[i] = initialValue;
        }
      } else {
        for (let i = 0; i < localVarCount; i++) {
          vm.localVariables[i] = 0;
        }
      }
      vm.pc = newPC;
    }
    function h_call_2s(vm, operands, ctx) {
      h_call(vm, operands, ctx);
    }
    function h_check_arg_count(vm, [argNum], ctx) {
      ctx.branch?.((vm.currentArgCount || 0) >= argNum);
    }
    exports2.h_check_arg_count = h_check_arg_count;
  }
});

// core/opcodes/handlers/memory.js
var require_memory = __commonJS({
  "core/opcodes/handlers/memory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_loadw = h_loadw;
    exports2.h_loadb = h_loadb;
    exports2.h_storew = h_storew;
    exports2.h_storeb = h_storeb;
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
        console.error(`LOADW: Invalid memory address 0x${addr.toString(16)} (array=0x${arrayAddr.toString(16)}, index=${signedIndex}). Memory size: 0x${vm.memory.length.toString(16)}`);
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
        console.error(`LOADB: Invalid memory address 0x${addr.toString(16)} (array=0x${arrayAddr.toString(16)}, index=${signedIndex}). Memory size: 0x${vm.memory.length.toString(16)}`);
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
        console.error(`STOREW: Invalid memory address 0x${addr.toString(16)} (array=0x${arrayAddr.toString(16)}, index=${signedIndex}). Memory size: 0x${vm.memory.length.toString(16)}`);
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
        console.error(`STOREB: Invalid memory address 0x${addr.toString(16)} (array=0x${arrayAddr.toString(16)}, index=${signedIndex}). Memory size: 0x${vm.memory.length.toString(16)}`);
        return;
      }
      vm.memory.writeUInt8(value, addr);
    }
    function h_scan_table(vm, operands, ctx) {
      if (!vm.memory) {
        console.error("Memory not loaded");
        return;
      }
      const [x, table, len] = operands;
      const form = operands.length > 3 ? operands[3] : 130;
      const isWord = (form & 128) !== 0;
      const entryLen = form & 127;
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
    exports2.h_scan_table = h_scan_table;
  }
});

// spectacles/fs-stub.js
var require_fs_stub = __commonJS({
  "spectacles/fs-stub.js"(exports2, module2) {
    "use strict";
    async function unavailable() {
      throw new Error("fs/promises is not available in the Spectacles runtime");
    }
    module2.exports = {
      readFile: unavailable,
      writeFile: unavailable
    };
  }
});

// core/opcodes/handlers/io.js
var require_io = __commonJS({
  "core/opcodes/handlers/io.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_print_char = h_print_char;
    exports2.h_print_num = h_print_num;
    exports2.h_sread = h_sread;
    exports2.h_tokenise = h_tokenise;
    exports2.h_print_table = h_print_table;
    exports2.h_split_window = h_split_window;
    exports2.h_set_window = h_set_window;
    exports2.h_erase_window = h_erase_window;
    exports2.h_erase_line = h_erase_line;
    exports2.h_set_cursor = h_set_cursor;
    exports2.h_get_cursor = h_get_cursor;
    exports2.h_set_text_style = h_set_text_style;
    exports2.h_buffer_mode = h_buffer_mode;
    exports2.h_output_stream = h_output_stream;
    exports2.h_input_stream = h_input_stream;
    exports2.h_sound_effect = h_sound_effect;
    exports2.h_read_char = h_read_char;
    exports2.h_save = h_save;
    exports2.h_restore = h_restore;
    function toSigned16(n) {
      return n > 32767 ? n - 65536 : n;
    }
    function encodeWord(vm, chars) {
      const A0 = "abcdefghijklmnopqrstuvwxyz";
      const A1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const A2 = ` 
0123456789.,!?_#'"/\\-:()`;
      const zchars = [];
      for (let i = 0; i < chars.length && zchars.length < 9; i++) {
        const char = String.fromCharCode(chars[i]);
        let idx = A0.indexOf(char);
        if (idx >= 0) {
          zchars.push(idx + 6);
        } else {
          idx = A1.indexOf(char);
          if (idx >= 0) {
            zchars.push(4);
            zchars.push(idx + 6);
          } else {
            idx = A2.indexOf(char);
            if (idx >= 0) {
              zchars.push(5);
              zchars.push(idx + 6);
            } else {
              zchars.push(5);
              zchars.push(6);
              zchars.push(chars[i] >> 5 & 31);
              zchars.push(chars[i] & 31);
            }
          }
        }
      }
      const wordCount = vm.header && vm.header.version <= 3 ? 2 : 3;
      const maxZchars = wordCount * 3;
      while (zchars.length < maxZchars) {
        zchars.push(5);
      }
      if (zchars.length > maxZchars) {
        zchars.length = maxZchars;
      }
      if (vm.trace) {
        const wordStr = String.fromCharCode(...chars);
        console.log(`  encodeWord("${wordStr}"): zchars=[${zchars.join(",")}]`);
      }
      const words = [];
      for (let w = 0; w < wordCount; w++) {
        words.push(zchars[w * 3] << 10 | zchars[w * 3 + 1] << 5 | zchars[w * 3 + 2]);
      }
      words[wordCount - 1] |= 32768;
      if (vm.trace) {
        console.log(`  encoded as: ${words.map((w) => w.toString(16).padStart(4, "0")).join(" ")}`);
      }
      return words;
    }
    function tokenize(vm, textBufferAddr, parseBufferAddr) {
      if (!vm.memory || !vm.header)
        return;
      const text = [];
      if (vm.header.version <= 4) {
        let i = 0;
        const maxLen = vm.memory.readUInt8(textBufferAddr);
        while (i < maxLen) {
          const char = vm.memory.readUInt8(textBufferAddr + 1 + i);
          if (char === 0)
            break;
          text.push(char);
          i++;
        }
      } else {
        const textLength = vm.memory.readUInt8(textBufferAddr + 1);
        for (let i = 0; i < textLength; i++) {
          text.push(vm.memory.readUInt8(textBufferAddr + 2 + i));
        }
      }
      const maxTokens = vm.memory.readUInt8(parseBufferAddr);
      const tokens = [];
      let currentWord = [];
      let wordStart = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === 32) {
          if (currentWord.length > 0) {
            tokens.push({
              word: currentWord,
              start: wordStart,
              length: currentWord.length
            });
            currentWord = [];
          }
        } else {
          if (currentWord.length === 0) {
            wordStart = i;
          }
          currentWord.push(char);
        }
      }
      if (currentWord.length > 0) {
        tokens.push({
          word: currentWord,
          start: wordStart,
          length: currentWord.length
        });
      }
      if (vm.trace) {
        console.log(`@tokenize: found ${tokens.length} tokens`);
        for (const token of tokens) {
          const wordStr = String.fromCharCode(...token.word);
          console.log(`  token: "${wordStr}" at position ${token.start}, length ${token.length}`);
        }
      }
      const dictionaryAddr = vm.header.dictionaryAddress;
      const numWordSeparators = vm.memory.readUInt8(dictionaryAddr);
      const entryLength = vm.memory.readUInt8(dictionaryAddr + numWordSeparators + 1);
      const numEntries = vm.memory.readUInt16BE(dictionaryAddr + numWordSeparators + 2);
      const firstEntryAddr = dictionaryAddr + numWordSeparators + 4;
      if (vm.trace) {
        console.log(`@tokenize: dictionary at 0x${dictionaryAddr.toString(16)}, ${numEntries} entries, ${entryLength} bytes each`);
        console.log(`  First 10 dictionary entries:`);
        for (let i = 0; i < Math.min(10, numEntries); i++) {
          const entryAddr = firstEntryAddr + i * entryLength;
          const w1 = vm.memory.readUInt16BE(entryAddr);
          const w2 = vm.memory.readUInt16BE(entryAddr + 2);
          const w3 = vm.memory.readUInt16BE(entryAddr + 4);
          console.log(`    [${i}] @0x${entryAddr.toString(16)}: ${w1.toString(16).padStart(4, "0")} ${w2.toString(16).padStart(4, "0")} ${w3.toString(16).padStart(4, "0")}`);
        }
        for (let i = 0; i < numEntries; i++) {
          const entryAddr = firstEntryAddr + i * entryLength;
          const w1 = vm.memory.readUInt16BE(entryAddr);
          const w2 = vm.memory.readUInt16BE(entryAddr + 2);
          const w3 = vm.memory.readUInt16BE(entryAddr + 4);
          const origPC = vm.pc;
          vm.pc = entryAddr;
          const decoded = vm.decodeZSCII(false);
          vm.pc = origPC;
          if (["look", "quit", "yes", "y", "no", "n"].includes(decoded)) {
            console.log(`  Found "${decoded}" at entry ${i} @0x${entryAddr.toString(16)}: ${w1.toString(16).padStart(4, "0")} ${w2.toString(16).padStart(4, "0")} ${w3.toString(16).padStart(4, "0")}`);
          }
        }
      }
      const actualTokens = Math.min(tokens.length, maxTokens);
      vm.memory.writeUInt8(actualTokens, parseBufferAddr + 1);
      for (let i = 0; i < actualTokens; i++) {
        const token = tokens[i];
        const encodedWord = encodeWord(vm, token.word);
        let dictAddr = 0;
        for (let j = 0; j < numEntries; j++) {
          const entryAddr = firstEntryAddr + j * entryLength;
          let match = true;
          for (let w = 0; w < encodedWord.length; w++) {
            if (vm.memory.readUInt16BE(entryAddr + w * 2) !== encodedWord[w]) {
              match = false;
              break;
            }
          }
          if (match) {
            dictAddr = entryAddr;
            break;
          }
        }
        if (vm.trace && dictAddr > 0) {
          console.log(`  found "${String.fromCharCode(...token.word)}" in dictionary at 0x${dictAddr.toString(16)}`);
        } else if (vm.trace) {
          console.log(`  "${String.fromCharCode(...token.word)}" not found in dictionary`);
        }
        const tokenEntryAddr = parseBufferAddr + 2 + i * 4;
        vm.memory.writeUInt16BE(dictAddr, tokenEntryAddr);
        vm.memory.writeUInt8(token.length, tokenEntryAddr + 2);
        const positionBase = vm.header.version <= 4 ? 1 : 2;
        vm.memory.writeUInt8(token.start + positionBase, tokenEntryAddr + 3);
      }
    }
    function h_print_char(vm, [zsciiChar]) {
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(String.fromCharCode(zsciiChar));
      } else {
        console.log(String.fromCharCode(zsciiChar));
      }
    }
    function h_print_num(vm, [num]) {
      const signedNum = toSigned16(num);
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(signedNum.toString());
      } else {
        console.log(signedNum.toString());
      }
    }
    async function h_sread(vm, operands, ctx) {
      if (!vm.memory || !vm.inputOutputDevice || !vm.header) {
        console.error("Memory, input/output device, or header not loaded");
        return;
      }
      if (vm.header.version <= 3) {
        const { h_show_status } = require_misc();
        h_show_status(vm);
      }
      const textBufferAddr = operands[0];
      const parseBufferAddr = operands[1];
      const input = await vm.inputOutputDevice.readLine();
      if (vm.trace) {
        console.log(`@sread: textBufferAddr=0x${textBufferAddr.toString(16)}, parseBufferAddr=0x${parseBufferAddr.toString(16)}, input="${input}"`);
      }
      const maxLen = vm.memory.readUInt8(textBufferAddr);
      const text = input.toLowerCase().slice(0, maxLen);
      vm.setLastRead(text);
      if (vm.header.version <= 4) {
        for (let i = 0; i < text.length; i++) {
          vm.memory.writeUInt8(text.charCodeAt(i), textBufferAddr + 1 + i);
        }
        if (text.length < maxLen) {
          vm.memory.writeUInt8(0, textBufferAddr + 1 + text.length);
        }
      } else {
        vm.memory.writeUInt8(text.length, textBufferAddr + 1);
        for (let i = 0; i < text.length; i++) {
          vm.memory.writeUInt8(text.charCodeAt(i), textBufferAddr + 2 + i);
        }
        if (text.length < maxLen) {
          vm.memory.writeUInt8(0, textBufferAddr + 2 + text.length);
        }
      }
      if (parseBufferAddr) {
        tokenize(vm, textBufferAddr, parseBufferAddr);
      }
      ctx?.store?.(13);
    }
    function h_tokenise(vm, operands) {
      const [textBufferAddr, parseBufferAddr, dictAddr] = operands;
      if (dictAddr && vm.trace) {
        console.log(`@tokenise: custom dictionary 0x${dictAddr.toString(16)} not supported, using default`);
      }
      tokenize(vm, textBufferAddr, parseBufferAddr);
    }
    function h_print_table(vm, operands) {
      if (!vm.memory) {
        console.error("Memory not loaded");
        return;
      }
      const tableAddr = operands[0];
      const tableWidth = operands[1];
      const tableHeight = operands.length > 2 ? operands[2] : 1;
      const tableSkip = operands.length > 3 ? operands[3] : 0;
      if (tableAddr >= vm.memory.length) {
        console.error(`print_table: Invalid address 0x${tableAddr.toString(16)}`);
        return;
      }
      for (let row = 0; row < tableHeight; row++) {
        const rowAddr = tableAddr + row * (tableWidth + tableSkip);
        if (rowAddr + tableWidth > vm.memory.length) {
          console.error(`print_table: Row ${row} extends beyond memory`);
          break;
        }
        for (let col = 0; col < tableWidth; col++) {
          const charCode = vm.memory.readUInt8(rowAddr + col);
          if (vm.inputOutputDevice) {
            vm.inputOutputDevice.writeString(String.fromCharCode(charCode));
          } else {
            process.stdout.write(String.fromCharCode(charCode));
          }
        }
        if (row < tableHeight - 1) {
          if (vm.inputOutputDevice) {
            vm.inputOutputDevice.writeString("\n");
          } else {
            process.stdout.write("\n");
          }
        }
      }
    }
    function h_split_window(vm, [lines]) {
      if (vm.trace) {
        console.log(`@split_window ${lines}`);
      }
      if (vm.inputOutputDevice) {
        const termHeight = vm.terminalHeight || 24;
        const scrollBottom = termHeight - 1;
        if (!vm.splitWindowLines) {
          vm.splitWindowLines = 0;
        }
        vm.splitWindowLines = lines;
        if (lines === 0) {
          vm.inputOutputDevice.writeString(`\x1B[1;${scrollBottom}r`);
        } else {
          const scrollTop = lines + 1;
          vm.inputOutputDevice.writeString(`\x1B[${scrollTop};${scrollBottom}r`);
          vm.inputOutputDevice.writeString(`\x1B[${scrollTop};1H`);
        }
      }
    }
    function h_set_window(vm, [window2]) {
      if (vm.trace) {
        console.log(`@set_window ${window2}`);
      }
      if (vm.inputOutputDevice) {
        vm.currentWindow = window2;
        if (window2 === 1) {
          vm.inputOutputDevice.writeString("\x1B[1;1H");
        } else {
          const scrollTop = (vm.splitWindowLines || 0) + 1;
          const line = vm.splitWindowLines === 0 ? 1 : scrollTop;
          vm.inputOutputDevice.writeString(`\x1B[${line};1H`);
        }
      }
    }
    function h_erase_window(vm, [window2]) {
      if (vm.trace) {
        console.log(`@erase_window ${window2}`);
      }
      if (vm.inputOutputDevice) {
        const signedWindow = window2 > 32767 ? window2 - 65536 : window2;
        if (signedWindow === -1 || signedWindow === 2) {
          vm.inputOutputDevice.writeString("\x1B[2J\x1B[H");
        } else if (signedWindow === 0) {
          vm.inputOutputDevice.writeString("\x1B[J");
        } else if (signedWindow === 1) {
          vm.inputOutputDevice.writeString("\x1B[K");
        }
      }
    }
    function h_erase_line(vm, [value]) {
      if (vm.trace) {
        console.log(`@erase_line ${value} (no-op)`);
      }
    }
    function h_set_cursor(vm, [line, column]) {
      if (vm.trace) {
        console.log(`@set_cursor ${line},${column}`);
      }
      if (vm.inputOutputDevice) {
        const vt100Sequence = `\x1B[${line};${column}H`;
        vm.inputOutputDevice.writeString(vt100Sequence);
      }
    }
    function h_get_cursor(vm, [array]) {
      if (vm.memory) {
        vm.memory.writeUInt16BE(1, array);
        vm.memory.writeUInt16BE(1, array + 2);
      }
      if (vm.trace) {
        console.log(`@get_cursor ${array} (stub: returning 1,1)`);
      }
    }
    function h_set_text_style(vm, [style]) {
      if (vm.trace) {
        console.log(`@set_text_style ${style} (no-op)`);
      }
    }
    function h_buffer_mode(vm, [flag]) {
      if (vm.trace) {
        console.log(`@buffer_mode ${flag} (no-op)`);
      }
    }
    function h_output_stream(vm, [number, table]) {
      if (vm.trace) {
        console.log(`@output_stream ${number}${table !== void 0 ? `,${table}` : ""} (no-op)`);
      }
    }
    function h_input_stream(vm, [number]) {
      if (vm.trace) {
        console.log(`@input_stream ${number} (no-op)`);
      }
    }
    function h_sound_effect(vm, operands) {
      if (vm.trace) {
        console.log(`@sound_effect ${operands.join(",")} (no-op)`);
      }
    }
    async function h_read_char(vm, [one, time, routine], ctx) {
      if (!vm.inputOutputDevice) {
        console.error("No input device");
        ctx.store?.(13);
        return;
      }
      const char = await vm.inputOutputDevice.readChar();
      const charCode = char.charCodeAt(0);
      if (vm.trace) {
        console.log(`@read_char returned '${char}' (code ${charCode})`);
      }
      ctx.store?.(charCode);
    }
    async function h_save(vm, _operands, ctx) {
      let savedPC = vm.pc;
      if (ctx.branchInfo) {
        const branchBytes = ctx.branchInfo.branchBytes;
        savedPC = vm.pc - branchBytes;
        if (vm.trace) {
          console.log(`@save: PC=${vm.pc.toString(16)}, branchBytes=${branchBytes}, savedPC=${savedPC.toString(16)}`);
        }
      }
      try {
        const saveData = await vm.saveData(savedPC);
        if (!saveData) {
          if (vm.trace) {
            console.log(`@save failed: could not generate save data`);
          }
          ctx.branch?.(false);
          return;
        }
        if (vm.runtime === "node") {
          const { writeFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          const savePath = vm.filePath + ".qzl";
          await writeFile(savePath, saveData);
          if (vm.trace) {
            console.log(`@save: saved to ${savePath}`);
          }
          ctx.branch?.(true);
        } else if (vm.runtime === "browser") {
          const header = vm.getHeader();
          if (!header) {
            if (vm.trace) {
              console.log(`@save failed: could not get game header`);
            }
            ctx.branch?.(false);
            return;
          }
          const gameIdentifier = `${header.release}.${header.serial}`;
          const saveKey = `tszm-save-${gameIdentifier}`;
          const base64Data = saveData.toString("base64");
          localStorage.setItem(saveKey, base64Data);
          if (vm.trace) {
            console.log(`@save: saved ${saveData.length} bytes to localStorage key "${saveKey}"`);
          }
          ctx.branch?.(true);
        } else if (vm.runtime === "spectacles") {
          const header = vm.getHeader();
          if (!header) {
            if (vm.trace) {
              console.log(`@save failed: could not get game header`);
            }
            ctx.branch?.(false);
            return;
          }
          const store = typeof globalThis !== "undefined" && globalThis.__tszmStorage || null;
          if (!store) {
            if (vm.trace) {
              console.log(`@save failed: no __tszmStorage provided by host`);
            }
            ctx.branch?.(false);
            return;
          }
          const saveKey = `tszm-save-${header.release}.${header.serial}`;
          await store.setItem(saveKey, saveData.toString("base64"));
          if (vm.trace) {
            console.log(`@save: saved ${saveData.length} bytes to storage key "${saveKey}"`);
          }
          ctx.branch?.(true);
        } else {
          if (vm.trace) {
            console.log(`@save: generated save data (${saveData.length} bytes) but not persisting (unknown environment)`);
          }
          ctx.branch?.(true);
        }
      } catch (error) {
        if (vm.trace) {
          console.log(`@save failed: ${error}`);
        }
        ctx.branch?.(false);
      }
    }
    async function h_restore(vm, _operands, ctx) {
      try {
        if (vm.runtime === "node") {
          const { readFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          const savePath = vm.filePath + ".qzl";
          try {
            const saveData = await readFile(savePath);
            if (vm.trace) {
              console.log(`@restore: loaded save file (${saveData.length} bytes), calling restoreFromSave...`);
            }
            const success = await vm.restoreFromSave(saveData);
            if (success) {
              if (vm.trace) {
                console.log(`@restore: SUCCESS - restoreFromSave() succeeded, PC=${vm.pc.toString(16)}`);
                console.log(`@restore: Returning from handler without calling ctx.branch (PC has been set by restoreFromSave)`);
              }
              return;
            } else {
              if (vm.trace) {
                console.log(`@restore: FAILED - restoreFromSave() returned false, calling ctx.branch(false)`);
              }
              ctx.branch?.(false);
            }
          } catch (fileError) {
            if (fileError.code === "ENOENT") {
              if (vm.trace) {
                console.log(`@restore: save file not found at ${savePath}`);
              }
            } else {
              if (vm.trace) {
                console.log(`@restore: error reading save file: ${fileError}`);
              }
            }
            ctx.branch?.(false);
          }
        } else if (vm.runtime === "browser") {
          const header = vm.getHeader();
          if (!header) {
            if (vm.trace) {
              console.log(`@restore failed: could not get game header`);
            }
            ctx.branch?.(false);
            return;
          }
          const gameIdentifier = `${header.release}.${header.serial}`;
          const saveKey = `tszm-save-${gameIdentifier}`;
          try {
            const base64Data = localStorage.getItem(saveKey);
            if (!base64Data) {
              if (vm.trace) {
                console.log(`@restore: no save data found in localStorage for key "${saveKey}"`);
              }
              ctx.branch?.(false);
              return;
            }
            const saveData = Buffer.from(base64Data, "base64");
            const success = await vm.restoreFromSave(saveData);
            if (success) {
              if (vm.trace) {
                console.log(`@restore: restored ${saveData.length} bytes from localStorage key "${saveKey}"`);
              }
            } else {
              if (vm.trace) {
                console.log(`@restore: failed to restore game state`);
              }
              ctx.branch?.(false);
            }
          } catch (storageError) {
            if (vm.trace) {
              console.log(`@restore: error reading from localStorage: ${storageError}`);
            }
            ctx.branch?.(false);
          }
        } else if (vm.runtime === "spectacles") {
          const header = vm.getHeader();
          if (!header) {
            if (vm.trace) {
              console.log(`@restore failed: could not get game header`);
            }
            ctx.branch?.(false);
            return;
          }
          const store = typeof globalThis !== "undefined" && globalThis.__tszmStorage || null;
          if (!store) {
            if (vm.trace) {
              console.log(`@restore: no __tszmStorage provided by host`);
            }
            ctx.branch?.(false);
            return;
          }
          const saveKey = `tszm-save-${header.release}.${header.serial}`;
          try {
            const base64Data = await store.getItem(saveKey);
            if (!base64Data) {
              if (vm.trace) {
                console.log(`@restore: no save data found for key "${saveKey}"`);
              }
              ctx.branch?.(false);
              return;
            }
            const saveData = Buffer.from(base64Data, "base64");
            const success = await vm.restoreFromSave(saveData);
            if (success) {
              if (vm.trace) {
                console.log(`@restore: restored ${saveData.length} bytes from key "${saveKey}"`);
              }
            } else {
              if (vm.trace) {
                console.log(`@restore: failed to restore game state`);
              }
              ctx.branch?.(false);
            }
          } catch (storageError) {
            if (vm.trace) {
              console.log(`@restore: error reading from storage: ${storageError}`);
            }
            ctx.branch?.(false);
          }
        } else {
          if (vm.trace) {
            console.log(`@restore: not implemented for unknown environment`);
          }
          ctx.branch?.(false);
        }
      } catch (error) {
        if (vm.trace) {
          console.log(`@restore failed: ${error}`);
        }
        ctx.branch?.(false);
      }
    }
    function saveKeyFor(vm) {
      const header = vm.getHeader();
      if (!header)
        return null;
      return `tszm-save-${header.release}.${header.serial}`;
    }
    async function persistSaveData(vm, saveData) {
      const key = saveKeyFor(vm);
      if (!key)
        return false;
      if (vm.runtime === "spectacles") {
        const store = typeof globalThis !== "undefined" && globalThis.__tszmStorage || null;
        if (!store)
          return false;
        await store.setItem(key, saveData.toString("base64"));
        return true;
      }
      if (vm.runtime === "browser") {
        localStorage.setItem(key, saveData.toString("base64"));
        return true;
      }
      if (vm.runtime === "node") {
        const { writeFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
        await writeFile(vm.filePath + ".qzl", saveData);
        return true;
      }
      return false;
    }
    async function loadSaveData(vm) {
      const key = saveKeyFor(vm);
      if (!key)
        return null;
      if (vm.runtime === "spectacles") {
        const store = typeof globalThis !== "undefined" && globalThis.__tszmStorage || null;
        if (!store)
          return null;
        const base64Data = await store.getItem(key);
        return base64Data ? Buffer.from(base64Data, "base64") : null;
      }
      if (vm.runtime === "browser") {
        const base64Data = localStorage.getItem(key);
        return base64Data ? Buffer.from(base64Data, "base64") : null;
      }
      if (vm.runtime === "node") {
        try {
          const { readFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          return await readFile(vm.filePath + ".qzl");
        } catch {
          return null;
        }
      }
      return null;
    }
    async function h_save_ext(vm, _operands, ctx) {
      try {
        const savedPC = vm.pc - 1;
        const saveData = await vm.saveData(savedPC);
        if (!saveData) {
          ctx.store?.(0);
          return;
        }
        const ok = await persistSaveData(vm, saveData);
        if (vm.trace) {
          console.log(`@save(ext): ${ok ? `saved ${saveData.length} bytes` : "persist failed"}`);
        }
        ctx.store?.(ok ? 1 : 0);
      } catch (error) {
        if (vm.trace) {
          console.log(`@save(ext) failed: ${error}`);
        }
        ctx.store?.(0);
      }
    }
    async function h_restore_ext(vm, _operands, ctx) {
      try {
        const saveData = await loadSaveData(vm);
        if (!saveData) {
          ctx.store?.(0);
          return;
        }
        const success = await vm.restoreFromSave(saveData);
        if (!success) {
          ctx.store?.(0);
          return;
        }
        if (vm.trace) {
          console.log(`@restore(ext): restored ${saveData.length} bytes`);
        }
      } catch (error) {
        if (vm.trace) {
          console.log(`@restore(ext) failed: ${error}`);
        }
        ctx.store?.(0);
      }
    }
    exports2.h_save_ext = h_save_ext;
    exports2.h_restore_ext = h_restore_ext;
  }
});

// core/opcodes/handlers/extended.js
var require_extended = __commonJS({
  "core/opcodes/handlers/extended.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.h_log_shift = h_log_shift;
    exports2.h_art_shift = h_art_shift;
    exports2.h_set_font = h_set_font;
    exports2.h_save_undo = h_save_undo;
    exports2.h_restore_undo = h_restore_undo;
    exports2.h_print_unicode = h_print_unicode;
    exports2.h_check_unicode = h_check_unicode;
    function toSigned16(n) {
      return n > 32767 ? n - 65536 : n;
    }
    function h_log_shift(vm, [number, places], ctx) {
      const signedPlaces = toSigned16(places);
      let result;
      if (signedPlaces > 0) {
        result = number << signedPlaces & 65535;
      } else if (signedPlaces < 0) {
        result = number >>> -signedPlaces & 65535;
      } else {
        result = number;
      }
      ctx.store?.(result);
    }
    function h_art_shift(vm, [number, places], ctx) {
      const signedPlaces = toSigned16(places);
      const signedNumber = toSigned16(number);
      let result;
      if (signedPlaces > 0) {
        result = signedNumber << signedPlaces;
      } else if (signedPlaces < 0) {
        result = signedNumber >> -signedPlaces;
      } else {
        result = signedNumber;
      }
      if (result < 0)
        result = result + 65536;
      result = result & 65535;
      ctx.store?.(result);
    }
    function h_set_font(vm, [fontNum], ctx) {
      if (fontNum === 1 || fontNum === 0) {
        ctx.store?.(1);
      } else {
        ctx.store?.(0);
      }
    }
    function h_save_undo(vm, _ops, ctx) {
      ctx.store?.(-1);
    }
    function h_restore_undo(vm, _ops, ctx) {
      ctx.store?.(0);
    }
    function h_print_unicode(vm, [charCode]) {
      if (vm.inputOutputDevice) {
        vm.inputOutputDevice.writeString(String.fromCharCode(charCode));
      } else {
        console.log(String.fromCharCode(charCode));
      }
    }
    function h_check_unicode(vm, [charCode], ctx) {
      if (charCode >= 0 && charCode <= 65535) {
        ctx.store?.(1);
      } else {
        ctx.store?.(0);
      }
    }
  }
});

// core/opcodes/tables.js
var require_tables = __commonJS({
  "core/opcodes/tables.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TABLE_EXT = exports2.TABLE_VAR = exports2.TABLE_2OP = exports2.TABLE_1OP = exports2.TABLE_0OP = void 0;
    var types_1 = require_types();
    var arithmetic_1 = require_arithmetic();
    var logic_1 = require_logic();
    var flow_1 = require_flow();
    var text_1 = require_text();
    var stack_1 = require_stack();
    var misc_1 = require_misc();
    var objects_1 = require_objects();
    var properties_1 = require_properties();
    var variables_1 = require_variables();
    var call_1 = require_call();
    var memory_1 = require_memory();
    var io_1 = require_io();
    var extended_1 = require_extended();
    exports2.TABLE_0OP = [];
    exports2.TABLE_1OP = [];
    exports2.TABLE_2OP = [];
    exports2.TABLE_VAR = [];
    exports2.TABLE_EXT = [];
    exports2.TABLE_0OP[0] = (0, types_1.d0)(0, {
      name: "rtrue",
      operandKinds: [],
      handler: (vm) => (0, flow_1.h_rtrue)(vm)
    });
    exports2.TABLE_0OP[1] = (0, types_1.d0)(1, {
      name: "rfalse",
      operandKinds: [],
      handler: (vm) => (0, flow_1.h_rfalse)(vm)
    });
    exports2.TABLE_0OP[2] = (0, types_1.d0)(2, {
      name: "print",
      operandKinds: [],
      handler: (vm) => (0, text_1.h_print)(vm)
    });
    exports2.TABLE_0OP[3] = (0, types_1.d0)(3, {
      name: "print_ret",
      operandKinds: [],
      handler: (vm) => (0, text_1.h_print_ret)(vm)
    });
    exports2.TABLE_0OP[4] = (0, types_1.d0)(4, {
      name: "nop",
      operandKinds: [],
      handler: (vm) => (0, misc_1.h_nop)(vm)
    });
    exports2.TABLE_0OP[5] = (0, types_1.d0)(5, {
      name: "save",
      operandKinds: [],
      maxVersion: 3,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, io_1.h_save)(vm, ops, ctx)
    });
    exports2.TABLE_0OP[6] = (0, types_1.d0)(6, {
      name: "restore",
      operandKinds: [],
      maxVersion: 3,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, io_1.h_restore)(vm, ops, ctx)
    });
    exports2.TABLE_0OP[8] = (0, types_1.d0)(8, {
      name: "ret_popped",
      operandKinds: [],
      handler: (vm) => (0, flow_1.h_ret_popped)(vm)
    });
    exports2.TABLE_0OP[9] = (0, types_1.d0)(9, {
      name: "pop",
      operandKinds: [],
      handler: (vm) => (0, stack_1.h_pop)(vm)
    });
    exports2.TABLE_0OP[10] = (0, types_1.d0)(10, {
      name: "quit",
      operandKinds: [],
      handler: (vm) => (0, flow_1.h_quit)(vm)
    });
    exports2.TABLE_0OP[11] = (0, types_1.d0)(11, {
      name: "new_line",
      operandKinds: [],
      handler: (vm) => (0, text_1.h_new_line)(vm)
    });
    exports2.TABLE_0OP[12] = (0, types_1.d0)(12, {
      name: "show_status",
      operandKinds: [],
      maxVersion: 3,
      handler: (vm) => (0, misc_1.h_show_status)(vm)
    });
    exports2.TABLE_0OP[13] = (0, types_1.d0)(13, {
      name: "verify",
      operandKinds: [],
      minVersion: 3,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, misc_1.h_verify)(vm, ops, ctx)
    });
    exports2.TABLE_0OP[15] = (0, types_1.d0)(15, {
      name: "piracy",
      operandKinds: [],
      minVersion: 5,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, misc_1.h_piracy)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[0] = (0, types_1.d1)(0, {
      name: "jz",
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, flow_1.h_jz)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[1] = (0, types_1.d1)(1, {
      name: "get_sibling",
      doesStore: true,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, objects_1.h_get_sibling)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[2] = (0, types_1.d1)(2, {
      name: "get_child",
      doesStore: true,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, objects_1.h_get_child)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[3] = (0, types_1.d1)(3, {
      name: "get_parent",
      doesStore: true,
      handler: (vm, ops, ctx) => (0, objects_1.h_get_parent)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[4] = (0, types_1.d1)(4, {
      name: "get_prop_len",
      doesStore: true,
      handler: (vm, ops, ctx) => (0, properties_1.h_get_prop_len)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[5] = (0, types_1.d1)(5, {
      name: "inc",
      handler: (vm, ops) => (0, variables_1.h_inc)(vm, ops)
    });
    exports2.TABLE_1OP[6] = (0, types_1.d1)(6, {
      name: "dec",
      handler: (vm, ops) => (0, variables_1.h_dec)(vm, ops)
    });
    exports2.TABLE_1OP[7] = (0, types_1.d1)(7, {
      name: "print_addr",
      handler: (vm, ops) => (0, text_1.h_print_addr)(vm, ops)
    });
    exports2.TABLE_1OP[8] = (0, types_1.d1)(8, {
      name: "call_1s",
      minVersion: 4,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, call_1.h_call_1s)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[9] = (0, types_1.d1)(9, {
      name: "remove_obj",
      handler: (vm, ops) => (0, objects_1.h_remove_obj)(vm, ops)
    });
    exports2.TABLE_1OP[10] = (0, types_1.d1)(10, {
      name: "print_obj",
      handler: (vm, ops) => (0, objects_1.h_print_obj)(vm, ops)
    });
    exports2.TABLE_1OP[11] = (0, types_1.d1)(11, {
      name: "ret",
      handler: (vm, ops) => (0, flow_1.h_ret)(vm, ops)
    });
    exports2.TABLE_1OP[12] = (0, types_1.d1)(12, {
      name: "jump",
      handler: (vm, ops) => (0, flow_1.h_jump)(vm, ops)
    });
    exports2.TABLE_1OP[13] = (0, types_1.d1)(13, {
      name: "print_paddr",
      handler: (vm, ops) => (0, text_1.h_print_paddr)(vm, ops)
    });
    exports2.TABLE_1OP[14] = (0, types_1.d1)(14, {
      name: "load",
      doesStore: true,
      handler: (vm, ops, ctx) => (0, variables_1.h_load)(vm, ops, ctx)
    });
    exports2.TABLE_1OP[15] = (0, types_1.d1)(15, {
      name: "not",
      maxVersion: 4,
      doesStore: true,
      handler: (vm, ops) => (0, logic_1.h_not)(vm, ops)
    });
    exports2.TABLE_2OP[1] = (0, types_1.d2)(1, {
      name: "je",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, flow_1.h_je)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[2] = (0, types_1.d2)(2, {
      name: "jl",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, flow_1.h_jl)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[3] = (0, types_1.d2)(3, {
      name: "jg",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, flow_1.h_jg)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[4] = (0, types_1.d2)(4, {
      name: "dec_chk",
      operandKinds: ["small", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, variables_1.h_dec_chk)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[5] = (0, types_1.d2)(5, {
      name: "inc_chk",
      operandKinds: ["small", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, variables_1.h_inc_chk)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[6] = (0, types_1.d2)(6, {
      name: "jin",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, objects_1.h_jin)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[7] = (0, types_1.d2)(7, {
      name: "test",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, logic_1.h_test)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[8] = (0, types_1.d2)(8, {
      name: "or",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, logic_1.h_or)(vm, ops)
    });
    exports2.TABLE_2OP[9] = (0, types_1.d2)(9, {
      name: "and",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, logic_1.h_and)(vm, ops)
    });
    exports2.TABLE_2OP[10] = (0, types_1.d2)(10, {
      name: "test_attr",
      operandKinds: ["var", "var"],
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, objects_1.h_test_attr)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[11] = (0, types_1.d2)(11, {
      name: "set_attr",
      operandKinds: ["var", "var"],
      handler: (vm, ops) => (0, objects_1.h_set_attr)(vm, ops)
    });
    exports2.TABLE_2OP[12] = (0, types_1.d2)(12, {
      name: "clear_attr",
      operandKinds: ["var", "var"],
      handler: (vm, ops) => (0, objects_1.h_clear_attr)(vm, ops)
    });
    exports2.TABLE_2OP[13] = (0, types_1.d2)(13, {
      name: "store",
      operandKinds: ["small", "var"],
      handler: (vm, ops) => (0, variables_1.h_store)(vm, ops)
    });
    exports2.TABLE_2OP[14] = (0, types_1.d2)(14, {
      name: "insert_obj",
      operandKinds: ["var", "var"],
      handler: (vm, ops) => (0, objects_1.h_insert_obj)(vm, ops)
    });
    exports2.TABLE_2OP[15] = (0, types_1.d2)(15, {
      name: "loadw",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops, ctx) => (0, memory_1.h_loadw)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[16] = (0, types_1.d2)(16, {
      name: "loadb",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops, ctx) => (0, memory_1.h_loadb)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[17] = (0, types_1.d2)(17, {
      name: "get_prop",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops, ctx) => (0, properties_1.h_get_prop)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[18] = (0, types_1.d2)(18, {
      name: "get_prop_addr",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops, ctx) => (0, properties_1.h_get_prop_addr)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[19] = (0, types_1.d2)(19, {
      name: "get_next_prop",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops, ctx) => (0, properties_1.h_get_next_prop)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[20] = (0, types_1.d2)(20, {
      name: "add",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, arithmetic_1.h_add)(vm, ops)
    });
    exports2.TABLE_2OP[21] = (0, types_1.d2)(21, {
      name: "sub",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, arithmetic_1.h_sub)(vm, ops)
    });
    exports2.TABLE_2OP[22] = (0, types_1.d2)(22, {
      name: "mul",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, arithmetic_1.h_mul)(vm, ops)
    });
    exports2.TABLE_2OP[23] = (0, types_1.d2)(23, {
      name: "div",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, arithmetic_1.h_div)(vm, ops)
    });
    exports2.TABLE_2OP[24] = (0, types_1.d2)(24, {
      name: "mod",
      operandKinds: ["var", "var"],
      doesStore: true,
      handler: (vm, ops) => (0, arithmetic_1.h_mod)(vm, ops)
    });
    exports2.TABLE_2OP[25] = (0, types_1.d2)(25, {
      name: "call_2s",
      minVersion: 4,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, call_1.h_call_2s)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[224] = (0, types_1.dv)(224, {
      name: "call",
      doesStore: true,
      handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[225] = (0, types_1.dv)(225, {
      name: "storew",
      handler: (vm, ops) => (0, memory_1.h_storew)(vm, ops)
    });
    exports2.TABLE_VAR[226] = (0, types_1.dv)(226, {
      name: "storeb",
      handler: (vm, ops) => (0, memory_1.h_storeb)(vm, ops)
    });
    exports2.TABLE_VAR[227] = (0, types_1.dv)(227, {
      name: "put_prop",
      handler: (vm, ops) => (0, properties_1.h_put_prop)(vm, ops)
    });
    exports2.TABLE_VAR[228] = (0, types_1.dv)(228, {
      name: "sread",
      handler: (vm, ops) => (0, io_1.h_sread)(vm, ops)
    });
    exports2.TABLE_VAR[229] = (0, types_1.dv)(229, {
      name: "print_char",
      handler: (vm, ops) => (0, io_1.h_print_char)(vm, ops)
    });
    exports2.TABLE_VAR[230] = (0, types_1.dv)(230, {
      name: "print_num",
      handler: (vm, ops) => (0, text_1.h_print_num)(vm, ops)
    });
    exports2.TABLE_VAR[231] = (0, types_1.dv)(231, {
      name: "random",
      doesStore: true,
      handler: (vm, ops, ctx) => (0, stack_1.h_random)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[232] = (0, types_1.dv)(232, {
      name: "push",
      handler: (vm, ops) => (0, stack_1.h_push)(vm, ops)
    });
    exports2.TABLE_VAR[233] = (0, types_1.dv)(233, {
      name: "pull",
      minVersion: 5,
      handler: (vm, ops) => (0, stack_1.h_pull)(vm, ops)
    });
    exports2.TABLE_VAR[234] = (0, types_1.dv)(234, {
      name: "split_window",
      minVersion: 3,
      handler: (vm, ops) => (0, io_1.h_split_window)(vm, ops)
    });
    exports2.TABLE_VAR[235] = (0, types_1.dv)(235, {
      name: "set_window",
      minVersion: 3,
      handler: (vm, ops) => (0, io_1.h_set_window)(vm, ops)
    });
    exports2.TABLE_VAR[236] = (0, types_1.dv)(236, {
      name: "call_vs2",
      minVersion: 4,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[237] = (0, types_1.dv)(237, {
      name: "erase_window",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_erase_window)(vm, ops)
    });
    exports2.TABLE_VAR[238] = (0, types_1.dv)(238, {
      name: "erase_line",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_erase_line)(vm, ops)
    });
    exports2.TABLE_VAR[239] = (0, types_1.dv)(239, {
      name: "set_cursor",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_set_cursor)(vm, ops)
    });
    exports2.TABLE_VAR[240] = (0, types_1.dv)(240, {
      name: "get_cursor",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_get_cursor)(vm, ops)
    });
    exports2.TABLE_VAR[241] = (0, types_1.dv)(241, {
      name: "set_text_style",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_set_text_style)(vm, ops)
    });
    exports2.TABLE_VAR[242] = (0, types_1.dv)(242, {
      name: "buffer_mode",
      minVersion: 4,
      handler: (vm, ops) => (0, io_1.h_buffer_mode)(vm, ops)
    });
    exports2.TABLE_VAR[243] = (0, types_1.dv)(243, {
      name: "output_stream",
      minVersion: 3,
      handler: (vm, ops) => (0, io_1.h_output_stream)(vm, ops)
    });
    exports2.TABLE_VAR[244] = (0, types_1.dv)(244, {
      name: "input_stream",
      minVersion: 3,
      handler: (vm, ops) => (0, io_1.h_input_stream)(vm, ops)
    });
    exports2.TABLE_VAR[245] = (0, types_1.dv)(245, {
      name: "sound_effect",
      minVersion: 3,
      handler: (vm, ops) => (0, io_1.h_sound_effect)(vm, ops)
    });
    exports2.TABLE_VAR[246] = (0, types_1.dv)(246, {
      name: "read_char",
      minVersion: 4,
      doesStore: true,
      handler: async (vm, ops, ctx) => await (0, io_1.h_read_char)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[248] = (0, types_1.dv)(248, {
      name: "not",
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops) => (0, logic_1.h_not)(vm, ops)
    });
    exports2.TABLE_VAR[30] = (0, types_1.dv)(30, {
      name: "print_table",
      minVersion: 5,
      handler: (vm, ops) => (0, io_1.h_print_table)(vm, ops)
    });
    exports2.TABLE_EXT[2] = {
      name: "log_shift",
      kind: "EXT",
      opcode: 2,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_log_shift)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[3] = {
      name: "art_shift",
      kind: "EXT",
      opcode: 3,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_art_shift)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[4] = {
      name: "set_font",
      kind: "EXT",
      opcode: 4,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_set_font)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[9] = {
      name: "save_undo",
      kind: "EXT",
      opcode: 9,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_save_undo)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[10] = {
      name: "restore_undo",
      kind: "EXT",
      opcode: 10,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_restore_undo)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[11] = {
      name: "print_unicode",
      kind: "EXT",
      opcode: 11,
      minVersion: 5,
      handler: (vm, ops) => (0, extended_1.h_print_unicode)(vm, ops)
    };
    exports2.TABLE_EXT[12] = {
      name: "check_unicode",
      kind: "EXT",
      opcode: 12,
      minVersion: 5,
      doesStore: true,
      handler: (vm, ops, ctx) => (0, extended_1.h_check_unicode)(vm, ops, ctx)
    };
    exports2.TABLE_VAR[247] = (0, types_1.dv)(247, {
      name: "scan_table",
      minVersion: 4,
      doesStore: true,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, memory_1.h_scan_table)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[249] = (0, types_1.dv)(249, {
      name: "call_vn",
      minVersion: 5,
      handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[250] = (0, types_1.dv)(250, {
      name: "call_vn2",
      minVersion: 5,
      handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
    });
    exports2.TABLE_VAR[251] = (0, types_1.dv)(251, {
      name: "tokenise",
      minVersion: 5,
      handler: (vm, ops) => (0, io_1.h_tokenise)(vm, ops)
    });
    exports2.TABLE_VAR[255] = (0, types_1.dv)(255, {
      name: "check_arg_count",
      minVersion: 5,
      doesBranch: true,
      handler: (vm, ops, ctx) => (0, call_1.h_check_arg_count)(vm, ops, ctx)
    });
    exports2.TABLE_0OP[7] = (0, types_1.d0)(7, {
      name: "restart",
      operandKinds: [],
      handler: async (vm) => await (0, flow_1.h_restart)(vm)
    });
    exports2.TABLE_2OP[28] = (0, types_1.d2)(28, {
      name: "throw",
      minVersion: 5,
      handler: (vm, ops) => (0, flow_1.h_throw)(vm, ops)
    });
    exports2.VERSION_OVERRIDES = {
      "0OP": {
        // v5+: `catch` (store frame handle); v1-4 static entry is `pop`
        9: [
          (0, types_1.d0)(9, {
            name: "catch",
            operandKinds: [],
            minVersion: 5,
            doesStore: true,
            handler: (vm, ops, ctx) => (0, flow_1.h_catch)(vm, ops, ctx)
          })
        ]
      },
      "1OP": {
        // v5+: `call_1n` (call, discard result); v1-4 static entry is `not`
        15: [
          (0, types_1.d1)(15, {
            name: "call_1n",
            minVersion: 5,
            handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
          })
        ]
      },
      "2OP": {},
      "VAR": {
        // v5+: `aread` stores the terminating character; v1-4 `sread` does not
        228: [
          (0, types_1.dv)(228, {
            name: "aread",
            minVersion: 5,
            doesStore: true,
            handler: async (vm, ops, ctx) => await (0, io_1.h_sread)(vm, ops, ctx)
          })
        ]
      },
      "EXT": {}
    };
    exports2.TABLE_2OP[26] = (0, types_1.d2)(26, {
      name: "call_2n",
      minVersion: 5,
      handler: (vm, ops, ctx) => (0, call_1.h_call)(vm, ops, ctx)
    });
    exports2.TABLE_2OP[27] = (0, types_1.d2)(27, {
      name: "set_colour",
      minVersion: 5,
      handler: () => {
      }
    });
    exports2.TABLE_EXT[0] = {
      kind: "EXT",
      opcode: 0,
      name: "save",
      minVersion: 5,
      doesStore: true,
      handler: async (vm, ops, ctx) => await (0, io_1.h_save_ext)(vm, ops, ctx)
    };
    exports2.TABLE_EXT[1] = {
      kind: "EXT",
      opcode: 1,
      name: "restore",
      minVersion: 5,
      doesStore: true,
      handler: async (vm, ops, ctx) => await (0, io_1.h_restore_ext)(vm, ops, ctx)
    };
  }
});

// core/opcodes/decode.js
var require_decode = __commonJS({
  "core/opcodes/decode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.decodeNext = decodeNext;
    var tables_1 = require_tables();
    function decodeNext(vm) {
      const first = vm._fetchByte();
      let kind;
      let opnum = 0;
      let isLongForm2OP = false;
      if (first === 190) {
        kind = "EXT";
        opnum = vm._fetchByte();
      } else if ((first & 192) === 192) {
        if (first >= 224) {
          kind = "VAR";
          opnum = first;
        } else {
          kind = "2OP";
          opnum = first & 31;
        }
      } else if ((first & 192) === 128) {
        const operandTypeBits = first >> 4 & 3;
        opnum = first & 15;
        if (operandTypeBits === 3) {
          kind = "0OP";
        } else {
          kind = "1OP";
        }
      } else {
        kind = "2OP";
        opnum = first & 31;
        isLongForm2OP = true;
      }
      const table = kind === "0OP" ? tables_1.TABLE_0OP : kind === "1OP" ? tables_1.TABLE_1OP : kind === "2OP" ? tables_1.TABLE_2OP : kind === "VAR" ? tables_1.TABLE_VAR : tables_1.TABLE_EXT;
      let desc = table[opnum];
      const overrides = tables_1.VERSION_OVERRIDES && tables_1.VERSION_OVERRIDES[kind];
      const variants = overrides && overrides[opnum];
      if (variants) {
        const version = vm.header && vm.header.version || 3;
        const match = variants.find((v) => (v.minVersion === void 0 || version >= v.minVersion) && (v.maxVersion === void 0 || version <= v.maxVersion));
        if (match)
          desc = match;
      }
      if (!desc)
        throw new Error(`Illegal/unknown opcode: ${kind} ${opnum.toString(16)}`);
      const operands = [];
      const operandInfo = [];
      if (isLongForm2OP) {
        const type1 = first & 64 ? "var" : "small";
        const type2 = first & 32 ? "var" : "small";
        const info1 = vm._decodeOperandWithInfo(type1);
        const info2 = vm._decodeOperandWithInfo(type2);
        operands.push(info1.value, info2.value);
        operandInfo.push(info1, info2);
      } else if (kind === "VAR" || kind === "EXT" || kind === "2OP" && !isLongForm2OP) {
        const types = vm._readOperandTypes(opnum);
        for (const t of types) {
          if (t === "omit")
            break;
          const info = vm._decodeOperandWithInfo(t);
          operands.push(info.value);
          operandInfo.push(info);
        }
      } else if (kind === "1OP" && !desc.operandKinds) {
        const operandTypeBits = first >> 4 & 3;
        const type = operandTypeBits === 0 ? "large" : operandTypeBits === 1 ? "small" : "var";
        const info = vm._decodeOperandWithInfo(type);
        operands.push(info.value);
        operandInfo.push(info);
      } else if (desc.operandKinds && desc.operandKinds.length) {
        for (const kind2 of desc.operandKinds) {
          const info = vm._decodeOperandWithInfo(kind2);
          operands.push(info.value);
          operandInfo.push(info);
        }
      }
      const out = { desc, operands, operandInfo };
      if (desc.doesStore)
        out.storeTarget = vm._fetchByte();
      if (desc.doesBranch)
        out.branchInfo = vm._readBranchOffset();
      return out;
    }
  }
});

// core/ZMachine.js
var require_ZMachine = __commonJS({
  "core/ZMachine.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    }();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZMachine = void 0;
    var decode_1 = require_decode();
    var ZMachine2 = class {
      constructor(filePath, inputOutputDevice) {
        this.filePath = filePath;
        this.gameBytes = null;
        if (filePath != null && typeof filePath !== "string") {
          this.gameBytes = Buffer.from(filePath);
          this.filePath = "";
        }
        this.inputOutputDevice = inputOutputDevice;
        this.pc = 0;
        this.header = null;
        this.memory = null;
        this.stack = [];
        this.callStack = [];
        this.currentContext = 0;
        this.localVariables = [];
        this.trace = false;
        this.playerObjectNumber = 0;
        this.lastRead = "";
        this.runtime = "unknown";
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          this.runtime = "browser";
        }
        if (typeof process !== "undefined" && process.versions?.node) {
          this.runtime = "node";
        }
        if (this.runtime === "unknown") {
          if (typeof navigator !== "undefined" && navigator.product === "ReactNative")
            this.runtime = "react-native";
        }
        if (this.gameBytes || typeof globalThis !== "undefined" && globalThis.__TSZM_SPECTACLES__) {
          this.runtime = "spectacles";
        }
      }
      // Return a pristine copy of the original game image (Spectacles runtime).
      // Prefers bytes handed to the constructor; falls back to a host-registered
      // global provider keyed by filePath (e.g. a bundled base64 game registry).
      async _readGameBytes() {
        if (this.gameBytes) {
          return Buffer.from(this.gameBytes);
        }
        const provider = typeof globalThis !== "undefined" ? globalThis.__tszmReadGameBytes : void 0;
        if (typeof provider === "function") {
          return Buffer.from(await provider(this.filePath));
        }
        throw new Error("Spectacles runtime: no game bytes provided (pass bytes to ZMachine or set globalThis.__tszmReadGameBytes)");
      }
      async rleBuffer(input) {
        const outputBuffer = [];
        let inputIdx = 0;
        while (inputIdx < input.length) {
          const inByte = input.readUInt8(inputIdx);
          if (inByte > 0) {
            outputBuffer.push(inByte);
            inputIdx++;
          } else {
            let zeroCount = 0;
            while (inputIdx < input.length && input.readUInt8(inputIdx) === 0 && zeroCount < 256) {
              zeroCount++;
              inputIdx++;
            }
            outputBuffer.push(0);
            outputBuffer.push(zeroCount - 1);
          }
        }
        return Buffer.from(outputBuffer);
      }
      async saveData(pc) {
        let cleanMemory = null;
        if (this.runtime === "node") {
          const { readFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          cleanMemory = await readFile(this.filePath);
        }
        if (this.runtime === "browser") {
          const res = await fetch(this.filePath);
          const arrayBuffer = await res.arrayBuffer();
          cleanMemory = Buffer.from(arrayBuffer);
        }
        if (this.runtime === "spectacles") {
          cleanMemory = await this._readGameBytes();
        }
        if (!cleanMemory || !this.memory || !this.header) {
          return null;
        }
        const dynamicMemorySize = this.header.staticMemoryAddress;
        const xorBuffer = [];
        for (let idx2 = 0; idx2 < dynamicMemorySize; idx2++) {
          const cleanByte = cleanMemory.readUInt8(idx2);
          const dirtyByte = this.memory.readUInt8(idx2);
          xorBuffer.push(cleanByte ^ dirtyByte);
        }
        const saveBuffer = Buffer.from(xorBuffer);
        const rleBuffer = await this.rleBuffer(saveBuffer);
        const cmemType = Buffer.from("CMem", "ascii");
        const cmemLength = Buffer.alloc(4);
        cmemLength.writeUInt32BE(rleBuffer.length, 0);
        const cmemChunk = Buffer.concat([cmemType, cmemLength, rleBuffer]);
        const stackData = [];
        const needsDummyFrame = this.header.version <= 5 || this.header.version >= 7;
        const dummyFrameEvalStack = needsDummyFrame ? [1, 1, 1, 1] : [];
        if (this.trace) {
          console.log(`
=== SAVE: Parsing callStack (length=${this.callStack.length}) ===`);
          console.log(`Current PC: 0x${pc.toString(16)}`);
          console.log(`Current localVariables (${this.localVariables.length}): [${this.localVariables.map((v) => "0x" + v.toString(16)).join(", ")}]`);
        }
        const callStackEntries = [];
        let idx = this.callStack.length;
        while (idx > 0) {
          if (idx < 2)
            break;
          const frameMarker = this.callStack[idx - 1];
          const localCount = this.callStack[idx - 2];
          if (frameMarker !== 0 && frameMarker !== 1 || localCount < 0 || localCount > 15) {
            if (this.trace) {
              console.error(`saveData: Invalid frame marker=${frameMarker} or localCount=${localCount} at idx=${idx}`);
            }
            break;
          }
          idx -= 2;
          const locals = [];
          for (let i = 0; i < localCount; i++) {
            if (idx <= 0) {
              console.error(`saveData: Ran out of callStack while reading locals at idx=${idx}`);
              break;
            }
            locals.unshift(this.callStack[idx - 1]);
            idx--;
          }
          let storeVar;
          if (frameMarker === 1) {
            if (idx <= 0) {
              console.error(`saveData: Ran out of callStack while reading storeVar at idx=${idx}`);
              break;
            }
            storeVar = this.callStack[idx - 1];
            idx--;
          }
          if (idx <= 0) {
            console.error(`saveData: Ran out of callStack while reading returnPC at idx=${idx}`);
            break;
          }
          const returnPC = this.callStack[idx - 1];
          idx--;
          callStackEntries.unshift({
            returnPC,
            storeVar,
            locals
          });
          if (this.trace)
            console.log(`CallStackEntry[${callStackEntries.length - 1}]: returnPC=0x${returnPC.toString(16)}, storeVar=${storeVar}, locals(${locals.length})=[${locals.map((v) => "0x" + v.toString(16)).join(", ")}]`);
        }
        if (this.trace)
          console.log(`
Total callStackEntries: ${callStackEntries.length}
`);
        const frames = [];
        for (let i = 0; i < callStackEntries.length; i++) {
          const entry = callStackEntries[i];
          const nextEntry = i + 1 < callStackEntries.length ? callStackEntries[i + 1] : null;
          const frameLocals = nextEntry ? nextEntry.locals : this.localVariables;
          const isCurrentFrame = i === callStackEntries.length - 1;
          frames.push({
            returnPC: entry.returnPC,
            storeVar: entry.storeVar,
            locals: frameLocals,
            evalStack: isCurrentFrame ? [...this.stack] : [],
            argsMask: 0
          });
        }
        if (needsDummyFrame) {
          stackData.push(0, 0, 0);
          stackData.push(0);
          stackData.push(0);
          stackData.push(0);
          stackData.push(dummyFrameEvalStack.length >> 8 & 255);
          stackData.push(dummyFrameEvalStack.length & 255);
          for (const stackVal of dummyFrameEvalStack) {
            stackData.push(stackVal >> 8 & 255);
            stackData.push(stackVal & 255);
          }
        }
        for (const frame of frames) {
          stackData.push(frame.returnPC >> 16 & 255);
          stackData.push(frame.returnPC >> 8 & 255);
          stackData.push(frame.returnPC & 255);
          const localCount = frame.locals.length & 15;
          const discardResult = frame.storeVar === void 0 ? 1 : 0;
          const flags = discardResult << 4 | localCount;
          stackData.push(flags);
          stackData.push(frame.storeVar ?? 0);
          stackData.push(frame.argsMask);
          const evalStackSize = frame.evalStack.length;
          stackData.push(evalStackSize >> 8 & 255);
          stackData.push(evalStackSize & 255);
          for (const localVar of frame.locals) {
            stackData.push(localVar >> 8 & 255);
            stackData.push(localVar & 255);
          }
          for (const stackVal of frame.evalStack) {
            stackData.push(stackVal >> 8 & 255);
            stackData.push(stackVal & 255);
          }
        }
        const stackBuffer = Buffer.from(stackData);
        const stksType = Buffer.from("Stks", "ascii");
        const stksLength = Buffer.alloc(4);
        stksLength.writeUInt32BE(stackBuffer.length, 0);
        const stksChunk = Buffer.concat([stksType, stksLength, stackBuffer]);
        const ifhdData = [];
        ifhdData.push(this.header.release >> 8 & 255);
        ifhdData.push(this.header.release & 255);
        const serialBytes = Buffer.from(this.header.serial.padEnd(6, "\0").slice(0, 6), "ascii");
        for (let i = 0; i < 6; i++) {
          ifhdData.push(serialBytes[i]);
        }
        ifhdData.push(this.header.checksum >> 8 & 255);
        ifhdData.push(this.header.checksum & 255);
        const pcHigh = pc >> 16 & 255;
        const pcMid = pc >> 8 & 255;
        const pcLow = pc & 255;
        ifhdData.push(pcHigh);
        ifhdData.push(pcMid);
        ifhdData.push(pcLow);
        const ifhdBuffer = Buffer.from(ifhdData);
        const ifhdType = Buffer.from("IFhd", "ascii");
        const ifhdLength = Buffer.alloc(4);
        ifhdLength.writeUInt32BE(13, 0);
        const ifhdChunk = Buffer.concat([ifhdType, ifhdLength, ifhdBuffer]);
        const ifhdPadding = ifhdBuffer.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]);
        const cmemPadding = rleBuffer.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]);
        const stksPadding = stackBuffer.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]);
        const allChunks = Buffer.concat([
          ifhdChunk,
          ifhdPadding,
          cmemChunk,
          cmemPadding,
          stksChunk,
          stksPadding
        ]);
        const formType = Buffer.from("FORM", "ascii");
        const ifzsType = Buffer.from("IFZS", "ascii");
        const formSize = Buffer.alloc(4);
        formSize.writeUInt32BE(4 + allChunks.length, 0);
        const iffFile = Buffer.concat([formType, formSize, ifzsType, allChunks]);
        return iffFile;
      }
      async restoreFromSave(saveData) {
        let cleanMemory = null;
        if (this.runtime === "node") {
          const { readFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          cleanMemory = await readFile(this.filePath);
        }
        if (this.runtime === "browser") {
          const res = await fetch(this.filePath);
          const arrayBuffer = await res.arrayBuffer();
          cleanMemory = Buffer.from(arrayBuffer);
        }
        if (this.runtime === "spectacles") {
          cleanMemory = await this._readGameBytes();
        }
        if (!cleanMemory || !this.header) {
          return false;
        }
        let offset = 0;
        let ifhdData = null;
        let cmemData = null;
        let stksData = null;
        if (saveData.length >= 12 && saveData.toString("ascii", 0, 4) === "FORM") {
          const formType = saveData.toString("ascii", 8, 12);
          if (formType !== "IFZS") {
            console.error(`Invalid FORM type: expected IFZS, got ${formType}`);
            return false;
          }
          offset = 12;
        }
        while (offset < saveData.length) {
          if (offset + 8 > saveData.length)
            break;
          const chunkType = saveData.toString("ascii", offset, offset + 4);
          offset += 4;
          const chunkLength = saveData.readUInt32BE(offset);
          offset += 4;
          if (offset + chunkLength > saveData.length)
            break;
          const chunkData = saveData.subarray(offset, offset + chunkLength);
          offset += chunkLength;
          if (chunkLength % 2 === 1) {
            offset += 1;
          }
          if (chunkType === "IFhd") {
            ifhdData = chunkData;
          } else if (chunkType === "CMem") {
            cmemData = chunkData;
          } else if (chunkType === "Stks") {
            stksData = chunkData;
          }
        }
        if (!ifhdData || !cmemData || !stksData) {
          console.error("Missing required chunks in save file");
          return false;
        }
        const savedRelease = ifhdData.readUInt16BE(0);
        const savedSerial = ifhdData.toString("ascii", 2, 8).replace(/\0/g, "");
        const savedChecksum = ifhdData.readUInt16BE(8);
        const savedPC = ifhdData.readUInt8(10) << 16 | ifhdData.readUInt8(11) << 8 | ifhdData.readUInt8(12);
        if (this.header.release !== savedRelease || this.header.serial !== savedSerial || this.header.checksum !== savedChecksum) {
          console.error("Save file does not match current game file");
          return false;
        }
        const decompressedXor = [];
        let cmemIdx = 0;
        while (cmemIdx < cmemData.length) {
          const byte = cmemData.readUInt8(cmemIdx);
          cmemIdx++;
          if (byte > 0) {
            decompressedXor.push(byte);
          } else {
            if (cmemIdx >= cmemData.length)
              break;
            const length = cmemData.readUInt8(cmemIdx);
            cmemIdx++;
            const zeroCount = length + 1;
            for (let i = 0; i < zeroCount; i++) {
              decompressedXor.push(0);
            }
          }
        }
        this.memory = Buffer.from(cleanMemory);
        const dynamicMemorySize = this.header.staticMemoryAddress;
        if (decompressedXor.length > dynamicMemorySize) {
          console.error(`Decompressed save data size (${decompressedXor.length}) is larger than dynamic memory size (${dynamicMemorySize})`);
          return false;
        }
        if (decompressedXor.length < dynamicMemorySize) {
          const paddingNeeded = dynamicMemorySize - decompressedXor.length;
          if (this.trace) {
            console.log(`CMem is ${decompressedXor.length} bytes, padding with ${paddingNeeded} zeros to reach ${dynamicMemorySize} bytes`);
          }
          for (let i = 0; i < paddingNeeded; i++) {
            decompressedXor.push(0);
          }
        }
        for (let idx = 0; idx < dynamicMemorySize; idx++) {
          const xorByte = decompressedXor[idx];
          const cleanByte = cleanMemory.readUInt8(idx);
          this.memory.writeUInt8(cleanByte ^ xorByte, idx);
        }
        let stksIdx = 0;
        const frames = [];
        while (stksIdx < stksData.length) {
          if (stksIdx + 8 > stksData.length)
            break;
          const returnPC = stksData.readUInt8(stksIdx) << 16 | stksData.readUInt8(stksIdx + 1) << 8 | stksData.readUInt8(stksIdx + 2);
          stksIdx += 3;
          const flags = stksData.readUInt8(stksIdx);
          stksIdx++;
          const discardResult = flags >> 4 & 1;
          const localCount = flags & 15;
          const storeVar = stksData.readUInt8(stksIdx);
          stksIdx++;
          const argsMask = stksData.readUInt8(stksIdx);
          stksIdx++;
          const evalStackSize = stksData.readUInt16BE(stksIdx);
          stksIdx += 2;
          const locals = [];
          for (let i = 0; i < localCount; i++) {
            if (stksIdx + 2 > stksData.length)
              break;
            const localVal = stksData.readUInt16BE(stksIdx);
            locals.push(localVal);
            stksIdx += 2;
          }
          const evalStack = [];
          for (let i = 0; i < evalStackSize; i++) {
            if (stksIdx + 2 > stksData.length)
              break;
            const stackVal = stksData.readUInt16BE(stksIdx);
            evalStack.push(stackVal);
            stksIdx += 2;
          }
          frames.push({
            returnPC,
            flags,
            storeVar: discardResult ? void 0 : storeVar,
            argsMask,
            locals,
            evalStack
          });
        }
        let frameIdx = 0;
        let userStack = [];
        if (frames.length > 0 && frames[0].returnPC === 0) {
          userStack = frames[0].evalStack;
          frameIdx = 1;
        }
        this.callStack = [];
        for (let i = frameIdx; i < frames.length - 1; i++) {
          const frame = frames[i];
          const nextFrame = frames[i + 1];
          this.callStack.push(nextFrame.returnPC);
          const frameMarker = nextFrame.storeVar !== void 0 ? 1 : 0;
          if (frameMarker === 1 && nextFrame.storeVar !== void 0) {
            this.callStack.push(nextFrame.storeVar);
          }
          for (const local of frame.locals) {
            this.callStack.push(local);
          }
          this.callStack.push(frame.locals.length);
          this.callStack.push(frameMarker);
        }
        if (frames.length > frameIdx) {
          const currentFrame = frames[frames.length - 1];
          this.localVariables = currentFrame.locals;
          this.stack = userStack.length > 0 ? userStack : currentFrame.evalStack;
          this.pc = savedPC;
        } else {
          this.localVariables = [];
          this.stack = userStack.length > 0 ? userStack : [];
          this.pc = savedPC;
        }
        if (this.header.version <= 3) {
          const branchInfo = this._readBranchOffset();
          if (this.trace) {
            console.log(`Restored from save: PC before branch=${savedPC.toString(16)}, after reading branch=${this.pc.toString(16)}`);
            console.log(`Branch info: offset=${branchInfo.offset}, branchOnTrue=${branchInfo.branchOnTrue}`);
          }
          this._applyBranch(branchInfo.offset, branchInfo.branchOnTrue, true);
        } else {
          const storeVar = this.memory.readUInt8(this.pc);
          this.pc++;
          this._storeVariable(storeVar, 2);
        }
        if (this.trace) {
          console.log(`Restored from save: final PC=${this.pc.toString(16)}, stack=${this.stack.length}, callStack=${this.callStack.length}, frames=${frames.length}`);
        }
        return true;
      }
      async load() {
        if (this.runtime === "node") {
          const { readFile } = await Promise.resolve().then(() => __importStar(require_fs_stub()));
          this.memory = await readFile(this.filePath);
        }
        if (this.runtime === "browser") {
          const res = await fetch(this.filePath);
          const arrayBuffer = await res.arrayBuffer();
          this.memory = Buffer.from(arrayBuffer);
        }
        if (this.runtime === "spectacles") {
          this.memory = await this._readGameBytes();
        }
        if (!this.memory) {
          throw new Error("No data loaded.");
        }
        this.parseHeader(this.memory);
        if (this.memory && this.header) {
          if (this.header.version >= 4) {
            this.memory.writeUInt8(24, 32);
            this.memory.writeUInt8(80, 33);
          }
          if (this.header.version >= 5) {
            this.memory.writeUInt16BE(80, 34);
            this.memory.writeUInt16BE(24, 36);
          }
        }
        let termHeight = 24;
        if (this.inputOutputDevice?.rows) {
          termHeight = this.inputOutputDevice.rows;
        } else if (typeof process !== "undefined" && process.stdout?.rows) {
          termHeight = process.stdout.rows;
        }
        const scrollBottom = termHeight - 1;
        if (this.inputOutputDevice && this.header) {
          this.terminalHeight = termHeight;
          if (this.header.version <= 3) {
            this.inputOutputDevice.writeString(`\x1B[2;${scrollBottom}r`);
            this.inputOutputDevice.writeString("\x1B[2;1H");
          } else {
            this.inputOutputDevice.writeString(`\x1B[1;${scrollBottom}r`);
          }
        }
        const version = this.header?.version || 1;
        if (version <= 5) {
          const byteAddress = this.header?.initialProgramCounter || 0;
          if (version <= 3) {
            this.pc = byteAddress;
          } else {
            this.pc = 0;
            const packedAddress = Math.floor(byteAddress / 4);
            const { h_call } = require_call();
            const ctx = { store: () => {
            } };
            h_call(this, [packedAddress], ctx);
          }
        } else {
          this.pc = 0;
          const packedAddress = this.header?.initialProgramCounter || 0;
          const { h_call } = require_call();
          const ctx = { store: () => {
          } };
          h_call(this, [packedAddress], ctx);
        }
      }
      parseHeader(buffer) {
        this.header = {
          version: buffer.readUInt8(0),
          release: buffer.readUInt16BE(2),
          serial: buffer.toString("ascii", 18, 24).replace(/\0/g, ""),
          // 0x12-0x17
          checksum: buffer.readUInt16BE(28),
          initialProgramCounter: buffer.readUInt16BE(6),
          dictionaryAddress: buffer.readUInt16BE(8),
          objectTableAddress: buffer.readUInt16BE(10),
          globalVariablesAddress: buffer.readUInt16BE(12),
          staticMemoryAddress: buffer.readUInt16BE(14),
          dynamicMemoryAddress: buffer.readUInt16BE(4),
          // High memory base
          highMemoryAddress: buffer.readUInt16BE(4),
          // High memory base (same as dynamic)
          abbreviationsAddress: buffer.readUInt16BE(24),
          fileLength: buffer.readUInt16BE(26) * 2,
          checksumValid: false,
          alphabetIdentifier: buffer.readUInt16BE(52)
          // 0x34 for v5+, may not exist in v3
        };
      }
      setPlayerObjectNumber(objectNumber) {
        this.playerObjectNumber = objectNumber;
      }
      getPlayerObjectNumber() {
        return this.playerObjectNumber;
      }
      setLastRead(lastRead) {
        this.lastRead = lastRead;
      }
      getLastRead() {
        return this.lastRead;
      }
      getGlobalVariableValue(variableNumber) {
        if (!this.header) {
          console.error("Header not loaded");
          return;
        }
        const memoryAddress = this.header.globalVariablesAddress + (variableNumber - 16) * 2;
        return this.memory?.readUInt16BE(memoryAddress);
      }
      setGlobalVariableValue(variableNumber, value) {
        if (!this.header) {
          console.error("Header not loaded");
          return;
        }
        const memoryAddress = this.header.globalVariablesAddress + (variableNumber - 16) * 2;
        return this.memory?.writeUInt16BE(value & 65535, memoryAddress);
      }
      getLocalVariableValue(variableNumber) {
        const value = this.localVariables[variableNumber - 1];
        return value !== void 0 ? value : 0;
      }
      setLocalVariableValue(variableNumber, value) {
        this.localVariables[variableNumber - 1] = value & 65535;
      }
      getVariableValue(variableNumber) {
        if (variableNumber === 0) {
          return this.stack.pop();
        }
        if (variableNumber < 16) {
          return this.getLocalVariableValue(variableNumber);
        }
        if (variableNumber >= 16) {
          return this.getGlobalVariableValue(variableNumber);
        }
      }
      setVariableValue(variableNumber, value) {
        if (variableNumber === 0) {
          return this.stack.push(value & 65535);
        }
        if (variableNumber < 16) {
          return this.setLocalVariableValue(variableNumber, value);
        }
        if (variableNumber >= 16) {
          return this.setGlobalVariableValue(variableNumber, value);
        }
      }
      getHeader() {
        return this.header;
      }
      setTrace(enabled) {
        this.trace = enabled;
      }
      async close() {
        if (this.fileHandle) {
          await this.fileHandle.close();
        }
      }
      advancePC(offset) {
        this.pc += offset;
      }
      returnFromRoutine(returnValue) {
        if (this.argCountStack && this.argCountStack.length > 0) {
          this.currentArgCount = this.argCountStack.pop();
        } else {
          this.currentArgCount = 0;
        }
        const frameMarker = this.callStack.pop();
        if (this.trace) {
          console.log(`@return value=${returnValue}, frameMarker=${frameMarker}, callStack size=${this.callStack.length}`);
        }
        const savedLocalCount = this.callStack.pop();
        this.localVariables = [];
        for (let i = 0; i < (savedLocalCount || 0); i++) {
          this.localVariables.unshift(this.callStack.pop() || 0);
        }
        let returnStoreVar;
        if (frameMarker === 1) {
          returnStoreVar = this.callStack.pop();
        }
        const returnPC = this.callStack.pop();
        if (returnPC !== void 0) {
          this.pc = returnPC;
          if (returnStoreVar !== void 0) {
            this.setVariableValue(returnStoreVar, returnValue);
          }
        }
      }
      getPropertyDefaultSize() {
        if (!this.header)
          throw new Error("Header not loaded");
        return this.header.version <= 3 ? 31 * 2 : 63 * 2;
      }
      getObjectEntrySize() {
        if (!this.header)
          throw new Error("Header not loaded");
        return this.header.version <= 3 ? 9 : 14;
      }
      getObjectAddress(objectId) {
        if (!this.header)
          throw new Error("Header not loaded");
        const propertyDefaultSize = this.getPropertyDefaultSize();
        const objectEntrySize = this.getObjectEntrySize();
        return this.header.objectTableAddress + propertyDefaultSize + (objectId - 1) * objectEntrySize;
      }
      getObjectName(objectId) {
        if (!this.memory || !this.header)
          return "";
        const objectAddress = this.getObjectAddress(objectId);
        const objectEntrySize = this.header.version <= 3 ? 9 : 14;
        const propertyTableAddr = this.memory.readUInt16BE(objectAddress + objectEntrySize - 2);
        const origPC = this.pc;
        this.pc = propertyTableAddr + 1;
        const name = this.decodeZSCII(true);
        this.pc = origPC;
        return name.toLowerCase().trim();
      }
      findPlayerParent() {
        if (!this.header || !this.memory || this.playerObjectNumber === 0) {
          return null;
        }
        const { h_get_parent } = require_objects();
        let parentId = 0;
        const ctx = {
          store: (v) => {
            parentId = v;
          }
        };
        h_get_parent(this, [this.playerObjectNumber], ctx);
        if (parentId === 0) {
          return null;
        }
        const name = this.getObjectName(parentId);
        return {
          objectNumber: parentId,
          name
        };
      }
      print(abbreviations = true) {
        let fullString = this.decodeZSCII(abbreviations);
        if (this.inputOutputDevice) {
          this.inputOutputDevice.writeString(fullString);
        } else {
          console.log(fullString);
        }
      }
      // --- Helpers used by the decoder ---
      _fetchByte() {
        if (!this.memory)
          throw new Error("Memory not loaded");
        const byte = this.memory.readUInt8(this.pc);
        this.pc++;
        return byte;
      }
      _fetchWord() {
        if (!this.memory)
          throw new Error("Memory not loaded");
        const word = this.memory.readUInt16BE(this.pc);
        this.pc += 2;
        return word;
      }
      _decodeOperand(kind) {
        if (kind === "large") {
          return this._fetchWord();
        } else if (kind === "small") {
          return this._fetchByte();
        } else {
          const varNum = this._fetchByte();
          const value = this.getVariableValue(varNum);
          if (value === void 0 || value === null || isNaN(value)) {
            console.error(`WARNING: getVariableValue(${varNum}) returned ${value}`);
            return 0;
          }
          return value;
        }
      }
      _decodeOperandWithInfo(kind) {
        if (kind === "large") {
          return { value: this._fetchWord(), type: "large" };
        } else if (kind === "small") {
          return { value: this._fetchByte(), type: "small" };
        } else {
          const varNum = this._fetchByte();
          const value = this.getVariableValue(varNum);
          if (value === void 0 || value === null || isNaN(value)) {
            console.error(`WARNING: getVariableValue(${varNum}) returned ${value}`);
            return { value: 0, type: "var", varNum };
          }
          return { value, type: "var", varNum };
        }
      }
      _readOperandTypes(opcode) {
        const typeByte = this._fetchByte();
        const types = [];
        let hasOmit = false;
        for (let i = 0; i < 4; i++) {
          const bits = typeByte >> 6 - i * 2 & 3;
          if (bits === 0)
            types.push("large");
          else if (bits === 1)
            types.push("small");
          else if (bits === 2)
            types.push("var");
          else {
            types.push("omit");
            hasOmit = true;
          }
        }
        const supportsDoubleTypeByte = opcode === 236 || opcode === 250;
        if (!hasOmit && supportsDoubleTypeByte) {
          const typeByte2 = this._fetchByte();
          for (let i = 0; i < 4; i++) {
            const bits = typeByte2 >> 6 - i * 2 & 3;
            if (bits === 0)
              types.push("large");
            else if (bits === 1)
              types.push("small");
            else if (bits === 2)
              types.push("var");
            else {
              types.push("omit");
              break;
            }
          }
        }
        return types;
      }
      _readBranchOffset() {
        if (!this.memory)
          throw new Error("Memory not loaded");
        const firstByte = this._fetchByte();
        const branchOnTrue = (firstByte & 128) !== 0;
        const singleByte = (firstByte & 64) !== 0;
        let offset;
        let branchBytes;
        if (singleByte) {
          offset = firstByte & 63;
          branchBytes = 1;
        } else {
          const secondByte = this._fetchByte();
          offset = (firstByte & 63) << 8 | secondByte;
          if (offset & 8192) {
            offset = offset - 16384;
          }
          branchBytes = 2;
        }
        return { offset, branchOnTrue, branchBytes };
      }
      /**
       * Execute a single instruction using the handler-based architecture.
       */
      async step() {
        const startPC = this.pc;
        const di = (0, decode_1.decodeNext)(this);
        const bytesRead = this.pc - startPC;
        if (this.trace) {
          let traceOutput = `${startPC.toString(16).padStart(4, "0")}:`;
          for (let i = 0; i < bytesRead; i++) {
            traceOutput += ` ${this.memory?.readUInt8(startPC + i).toString(16).padStart(2, "0")}`;
          }
          traceOutput += ` [${di.desc.name}`;
          if (di.operands.length > 0) {
            if (di.operandInfo && di.operandInfo.length > 0) {
              const operandStrs = di.operandInfo.map((info) => {
                if (info.type === "var" && info.varNum !== void 0) {
                  const varNum = info.varNum;
                  let varName;
                  if (varNum === 0) {
                    varName = "SP";
                  } else if (varNum < 16) {
                    varName = `L${varNum.toString(16).padStart(2, "0")}`;
                  } else {
                    varName = `G${(varNum - 16).toString(16).padStart(2, "0")}`;
                  }
                  return `${varName}`;
                } else {
                  return `#${info.value.toString(16)}`;
                }
              });
              traceOutput += ` ${operandStrs.join(",")}`;
            } else {
              traceOutput += ` ${di.operands.map((o) => o.toString(16)).join(",")}`;
            }
          }
          if (di.storeTarget !== void 0) {
            const target = di.storeTarget;
            let targetName;
            if (target === 0) {
              targetName = "SP";
            } else if (target < 16) {
              targetName = `L${target.toString(16).padStart(2, "0")}`;
            } else {
              targetName = `G${(target - 16).toString(16).padStart(2, "0")}`;
            }
            traceOutput += ` -> ${targetName}`;
          }
          if (di.branchInfo !== void 0) {
            traceOutput += ` ?branch(${di.branchInfo.branchOnTrue ? "T" : "F"}:${di.branchInfo.offset})`;
          }
          traceOutput += `]`;
          console.log(traceOutput);
        }
        const ctx = {};
        if (di.storeTarget !== void 0) {
          const target = di.storeTarget;
          ctx.store = (v) => this._storeVariable(target, v);
          this._storeResult = (v) => this._storeVariable(target, v);
          this._currentStoreTarget = target;
        } else {
          this._storeResult = void 0;
          this._currentStoreTarget = void 0;
        }
        if (di.branchInfo !== void 0) {
          const { offset, branchOnTrue } = di.branchInfo;
          ctx.branch = (cond) => this._applyBranch(offset, branchOnTrue, cond);
          ctx.branchInfo = di.branchInfo;
        }
        await di.desc.handler(this, di.operands, ctx);
      }
      /**
       * Public API for executing an instruction. Just invokes step().
       */
      async executeInstruction() {
        return this.step();
      }
      _storeVariable(varNum, value) {
        this.setVariableValue(varNum, value);
      }
      _applyBranch(offset, branchOnTrue, condition) {
        const shouldBranch = condition === branchOnTrue;
        if (shouldBranch) {
          if (offset === 0 || offset === 1) {
            this.returnFromRoutine(offset);
          } else {
            this.pc = this.pc + offset - 2;
          }
        }
      }
      decodeZSCII(abbreviations = true) {
        const A0 = "abcdefghijklmnopqrstuvwxyz";
        const A1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const A2 = ` 
0123456789.,!?_#'"/\\-:()`;
        const ZSCII_TABLES = [A0, A1, A2];
        let result = "";
        let currentTable = 0;
        let oneShift = false;
        let isLast = false;
        let abbrev1 = -1;
        let abbrev2 = -1;
        if (!this.memory) {
          return result;
        }
        do {
          const firstByte = this.memory.readUInt8(this.pc);
          const secondByte = this.memory.readUInt8(this.pc + 1);
          this.advancePC(2);
          const zchars = [
            (firstByte & 124) >> 2,
            (firstByte & 3) << 3 | (secondByte & 224) >> 5,
            secondByte & 31
          ];
          if (firstByte & 128) {
            isLast = true;
          }
          for (let zchar of zchars) {
            if (abbrev1 === -2) {
              abbrev2 = zchar;
              abbrev1 = -3;
              continue;
            }
            if (abbrev1 === -3) {
              const zsciiCode = abbrev2 << 5 | zchar;
              result += String.fromCharCode(zsciiCode);
              abbrev1 = -1;
              abbrev2 = -1;
              if (oneShift !== false) {
                currentTable = oneShift;
                oneShift = false;
              }
              continue;
            }
            if (abbrev1 > -1) {
              if (this.header) {
                abbrev2 = zchar;
                const abbreviationNumber = 32 * abbrev1 + abbrev2;
                const abbrevTableAddr = this.header.abbreviationsAddress + abbreviationNumber * 2;
                const abbrevTableEntry = this.memory.readUInt16BE(abbrevTableAddr);
                const abbrevStringAddr = abbrevTableEntry * 2;
                if (this.trace) {
                  console.log(`    Abbreviation ${abbrev1}:${abbrev2} (num=${abbreviationNumber}) abbrevAddr=${this.header.abbreviationsAddress} calc: ${this.header.abbreviationsAddress}+${abbreviationNumber}*2=${abbrevTableAddr} (0x${abbrevTableAddr.toString(16)}) entry=${abbrevTableEntry.toString(16)} stringAddr=${abbrevStringAddr.toString(16)}`);
                }
                const origPC = this.pc;
                this.pc = abbrevStringAddr;
                if (this.trace) {
                  const b1 = this.memory.readUInt8(abbrevStringAddr);
                  const b2 = this.memory.readUInt8(abbrevStringAddr + 1);
                  console.log(`    Reading abbrev string from 0x${abbrevStringAddr.toString(16)}: bytes ${b1.toString(16).padStart(2, "0")} ${b2.toString(16).padStart(2, "0")}`);
                }
                const abbrevText = this.decodeZSCII(false);
                if (this.trace) {
                  console.log(`    Abbreviation expanded to: "${abbrevText}"`);
                }
                result += abbrevText;
                this.pc = origPC;
                abbrev1 = -1;
                abbrev2 = -1;
                continue;
              }
            }
            if (zchar === 0) {
              result += " ";
              continue;
            }
            if ([1, 2, 3].includes(zchar)) {
              if (abbreviations) {
                abbrev1 = zchar - 1;
                continue;
              } else {
                continue;
              }
            }
            if (zchar === 4) {
              oneShift = currentTable;
              currentTable = 1;
              continue;
            }
            if (zchar === 5) {
              oneShift = currentTable;
              currentTable = 2;
              continue;
            }
            if (zchar === 6 && currentTable === 2) {
              if (this.trace) {
                console.log(`    Z-char 6 in A2: ZSCII escape sequence starting`);
              }
              abbrev1 = -2;
              continue;
            }
            if (zchar >= 6 && zchar <= 31) {
              result += ZSCII_TABLES[currentTable][zchar - 6];
              if (oneShift !== false) {
                currentTable = oneShift;
                oneShift = false;
              }
              continue;
            }
          }
        } while (!isLast);
        return result;
      }
    };
    exports2.ZMachine = ZMachine2;
  }
});

// core/index.js
var require_core = __commonJS({
  "core/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZMachine = void 0;
    var ZMachine_1 = require_ZMachine();
    Object.defineProperty(exports2, "ZMachine", { enumerable: true, get: function() {
      return ZMachine_1.ZMachine;
    } });
  }
});

// spectacles/host-core.js
var require_host_core = __commonJS({
  "spectacles/host-core.js"(exports2, module2) {
    "use strict";
    var Vt100Filter = class {
      constructor(onText, onStatus) {
        this.onText = onText;
        this.onStatus = onStatus;
        this.inStatus = false;
        this.statusBuf = "";
        this.pending = "";
      }
      feed(chunk) {
        let s = this.pending + chunk;
        this.pending = "";
        let text = "";
        let i = 0;
        while (i < s.length) {
          const c = s[i];
          if (c !== "\x1B") {
            if (this.inStatus) this.statusBuf += c;
            else text += c;
            i++;
            continue;
          }
          if (i + 1 >= s.length) {
            this.pending = s.slice(i);
            break;
          }
          const next = s[i + 1];
          if (next === "7") {
            this.inStatus = true;
            this.statusBuf = "";
            i += 2;
            continue;
          }
          if (next === "8") {
            if (this.inStatus) {
              const line = this.statusBuf.replace(/\s+/g, " ").trim();
              if (line) this.onStatus?.(line);
            }
            this.inStatus = false;
            this.statusBuf = "";
            i += 2;
            continue;
          }
          if (next === "[") {
            let j = i + 2;
            while (j < s.length && !(s[j] >= "@" && s[j] <= "~")) j++;
            if (j >= s.length) {
              this.pending = s.slice(i);
              break;
            }
            i = j + 1;
            continue;
          }
          i += 2;
        }
        if (text) this.onText?.(text);
      }
    };
    var PLAYER_NAMES = ["you", "yourself", "cretin", "adventurer", "player", "self"];
    function objGetChild(vm, id) {
      const a = vm.getObjectAddress(id);
      return vm.header.version <= 3 ? vm.memory.readUInt8(a + 6) : vm.memory.readUInt16BE(a + 10);
    }
    function objGetSibling(vm, id) {
      const a = vm.getObjectAddress(id);
      return vm.header.version <= 3 ? vm.memory.readUInt8(a + 5) : vm.memory.readUInt16BE(a + 8);
    }
    function objChildren(vm, id) {
      const out = [];
      let c = objGetChild(vm, id);
      let guard = 0;
      while (c !== 0 && guard++ < 128) {
        out.push(c);
        c = objGetSibling(vm, c);
      }
      return out;
    }
    function getSceneContext(zm) {
      try {
        if (!zm.memory || !zm.header) return null;
        const roomId = zm.getGlobalVariableValue(16);
        if (!roomId || roomId > 2e3) return null;
        const roomName = zm.getObjectName(roomId);
        if (!roomName || !roomName.trim()) return null;
        const named = (id) => ({ id, name: (zm.getObjectName(id) || "").trim() });
        const withContents = (ids) => {
          const out = [];
          for (const id of ids) {
            out.push(id);
            for (const inner of objChildren(zm, id)) {
              out.push(inner);
            }
          }
          return out;
        };
        const kids = objChildren(zm, roomId).map(named).filter((o) => o.name);
        let player = kids.find((o) => PLAYER_NAMES.indexOf(o.name.toLowerCase()) !== -1) || null;
        if (player && zm.getPlayerObjectNumber() !== player.id) {
          zm.setPlayerObjectNumber(player.id);
        }
        const roomIds = kids.filter((o) => !player || o.id !== player.id).map((o) => o.id);
        const roomObjects = withContents(roomIds).map(named).filter((o) => o.name);
        const inventory = player ? withContents(objChildren(zm, player.id)).map(named).filter((o) => o.name) : [];
        return { room: roomName.trim(), roomObjects, inventory };
      } catch (err) {
        return null;
      }
    }
    var SpectaclesZDevice = class {
      /**
       * opts:
       *   onText(str)    - clean game text (may be partial lines; includes \n)
       *   onStatus(str)  - v3 status line, already normalized
       *   onEcho(str)    - called with the command when input is consumed
       *   rows           - reported screen height (default 24)
       */
      constructor(opts = {}) {
        this.rows = opts.rows || 24;
        this.onEcho = opts.onEcho;
        this.filter = new Vt100Filter(opts.onText, opts.onStatus);
        this.inputQueue = [];
        this.pendingLine = null;
        this.pendingChar = null;
      }
      /** UI entry point: submit a full command line. */
      pushInput(line) {
        if (this.pendingChar) {
          const resolve = this.pendingChar;
          this.pendingChar = null;
          resolve("\r");
          if (line.trim() !== "") this.inputQueue.push(line);
          return;
        }
        if (this.pendingLine) {
          const resolve = this.pendingLine;
          this.pendingLine = null;
          this.onEcho?.(line);
          resolve(line);
        } else {
          this.inputQueue.push(line);
        }
      }
      /** True when the game is blocked waiting for the player. */
      get awaitingInput() {
        return this.pendingLine !== null || this.pendingChar !== null;
      }
      /** Drop any queued-but-not-yet-consumed commands (UI "clear" action). */
      clearQueue() {
        const dropped = this.inputQueue.length;
        this.inputQueue = [];
        return dropped;
      }
      // --- ZMInputOutputDevice interface ---
      async readLine() {
        if (this.inputQueue.length > 0) {
          const line = this.inputQueue.shift();
          this.onEcho?.(line);
          return line;
        }
        return new Promise((resolve) => {
          this.pendingLine = resolve;
          this.onAwaitInput?.();
        });
      }
      async readChar() {
        if (this.inputQueue.length > 0) return "\r";
        return new Promise((resolve) => {
          this.pendingChar = resolve;
        });
      }
      async writeChar(c) {
        this.filter.feed(c);
      }
      async writeString(s) {
        this.filter.feed(s);
      }
      close() {
      }
    };
    function runGame(opts) {
      const { ZMachine: ZMachine2, gameBytes, device, onQuit, onError } = opts;
      const yieldEvery = opts.yieldEvery || 2e4;
      const yieldFn = opts.yieldFn || (() => Promise.resolve());
      const zm = new ZMachine2(gameBytes, device);
      if (opts.onPrompt) {
        device.onAwaitInput = () => {
          opts.onPrompt(getSceneContext(zm));
        };
      }
      let running = true;
      (async () => {
        try {
          await zm.load();
          let sinceYield = 0;
          while (running) {
            await zm.executeInstruction();
            if (++sinceYield >= yieldEvery) {
              sinceYield = 0;
              await yieldFn();
            }
          }
        } catch (err) {
          running = false;
          if (err instanceof Error && err.message === "QUIT") onQuit?.();
          else onError?.(err);
        }
      })();
      return {
        zm,
        device,
        running: () => running,
        stop: () => {
          running = false;
        },
        /** On-demand scene snapshot (also delivered via opts.onPrompt). */
        sceneContext: () => getSceneContext(zm)
      };
    }
    module2.exports = { Vt100Filter, SpectaclesZDevice, runGame, getSceneContext };
  }
});

// spectacles/index.js
var shims = require_shims();
var g = shims.installShims();
g.__TSZM_SPECTACLES__ = true;
var { ZMachine } = require_core();
var hostCore = require_host_core();
module.exports = {
  ZMachine,
  shims,
  SpectaclesZDevice: hostCore.SpectaclesZDevice,
  Vt100Filter: hostCore.Vt100Filter,
  /**
   * One-call game start for the Lens host:
   *   const host = createZHost({ gameBytes, onText, onStatus, onEcho, onQuit, onError, yieldFn });
   *   host.device.pushInput("open mailbox");
   */
  createZHost(opts) {
    const device = new hostCore.SpectaclesZDevice(opts);
    return hostCore.runGame({ ...opts, ZMachine, device });
  },
  /**
   * Wire persistence for @save/@restore. `storage` must provide
   * getItem(key) -> string|null|Promise and setItem(key, value) -> void|Promise.
   * The Lens host backs this with PersistentStorageSystem.
   */
  setStorage(storage) {
    g.__tszmStorage = storage;
  },
  /**
   * Optional fallback game loader: called with the ZMachine's filePath when
   * no raw bytes were passed to the constructor. Must return bytes
   * (Uint8Array/ArrayBuffer/number[]) or a Promise of them.
   */
  setGameLoader(loader) {
    g.__tszmReadGameBytes = loader;
  }
};
