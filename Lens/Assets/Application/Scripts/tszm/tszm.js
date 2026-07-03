"use strict";

var nt = Object.create;
var Ve = Object.defineProperty;
var ot = Object.getOwnPropertyDescriptor;
var st = Object.getOwnPropertyNames;
var it = Object.getPrototypeOf,
    at = Object.prototype.hasOwnProperty;
if (!this.runtime) {
    this.runtime = "specs24";
}
print(this.runtime);
var A = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
var ct = (e, t, r, n) => {
    if ((t && typeof t == "object") || typeof t == "function")
        for (let o of st(t))
            !at.call(e, o) && o !== r && Ve(e, o, { get: () => t[o], enumerable: !(n = ot(t, o)) || n.enumerable });
    return e;
};
var he = (e, t, r) => (
    (r = e != null ? nt(it(e)) : {}),
    ct(t || !e || !e.__esModule ? Ve(r, "default", { value: e, enumerable: !0 }) : r, e)
);
var Le = A((k) => {
    "use strict";
    Object.defineProperty(k, "__esModule", { value: !0 });
    k.dv = k.d2 = k.d1 = k.d0 = void 0;
    function ue(e, t) {
        return (r, n) => {
            if (r < 0 || r > t) throw new Error(`${e} opcode out of range: ${r}`);
            return { kind: e, opcode: r, ...n };
        };
    }
    k.d0 = ue("0OP", 15);
    k.d1 = ue("1OP", 15);
    k.d2 = ue("2OP", 31);
    k.dv = ue("VAR", 255);
});
var ke = A((H) => {
    "use strict";
    Object.defineProperty(H, "__esModule", { value: !0 });
    H.h_add = lt;
    H.h_sub = dt;
    H.h_mul = ht;
    H.h_div = ut;
    H.h_mod = ft;
    function C(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function ne(e) {
        return e < 0 && (e = e + 65536), e & 65535;
    }
    function lt(e, [t, r]) {
        let n = C(t),
            o = C(r),
            s = ne(n + o);
        e._storeResult?.(s);
    }
    function dt(e, [t, r]) {
        let n = C(t),
            o = C(r),
            s = ne(n - o);
        e._storeResult?.(s);
    }
    function ht(e, [t, r]) {
        let n = C(t),
            o = C(r),
            s = ne(n * o);
        e._storeResult?.(s);
    }
    function ut(e, [t, r]) {
        let n = C(t),
            o = C(r);
        if (o === 0) {
            console.error("Division by zero");
            return;
        }
        let s = ne(Math.trunc(n / o));
        e._storeResult?.(s);
    }
    function ft(e, [t, r]) {
        let n = C(t),
            o = C(r);
        if (o === 0) {
            console.error("Modulo by zero");
            return;
        }
        let s = ne(n % o);
        e._storeResult?.(s);
    }
});
var Ce = A((v) => {
    "use strict";
    Object.defineProperty(v, "__esModule", { value: !0 });
    v.h_and = pt;
    v.h_or = _t;
    v.h_not = gt;
    v.h_test = mt;
    function pt(e, [t, r]) {
        let n = t & r & 65535;
        e._storeResult?.(n);
    }
    function _t(e, [t, r]) {
        let n = (t | r) & 65535;
        e._storeResult?.(n);
    }
    function gt(e, [t]) {
        let r = ~t & 65535;
        e._storeResult?.(r);
    }
    function mt(e, [t, r], n) {
        n.branch?.((t & r) === r);
    }
});
var je = A((T) => {
    "use strict";
    Object.defineProperty(T, "__esModule", { value: !0 });
    T.h_rtrue = yt;
    T.h_rfalse = bt;
    T.h_ret = xt;
    T.h_ret_popped = St;
    T.h_quit = Bt;
    T.h_jz = wt;
    T.h_jl = It;
    T.h_jg = Et;
    T.h_je = At;
    T.h_jump = Ot;
    function yt(e) {
        e.returnFromRoutine(1);
    }
    function bt(e) {
        e.returnFromRoutine(0);
    }
    function xt(e, [t]) {
        e.returnFromRoutine(t);
    }
    function St(e) {
        let t = e.stack.pop() || 0;
        e.returnFromRoutine(t);
    }
    function Bt(e) {
        throw new Error("QUIT");
    }
    function wt(e, [t], r) {
        r.branch?.(t === 0);
    }
    function It(e, [t, r], n) {
        let o = t > 32767 ? t - 65536 : t,
            s = r > 32767 ? r - 65536 : r;
        n.branch?.(o < s);
    }
    function Et(e, [t, r], n) {
        let o = t > 32767 ? t - 65536 : t,
            s = r > 32767 ? r - 65536 : r;
        n.branch?.(o > s);
    }
    function At(e, t, r) {
        let [n, ...o] = t;
        r.branch?.(o.some((s) => s === n));
    }
    function Ot(e, [t]) {
        let r = t > 32767 ? t - 65536 : t;
        e.pc = e.pc + r - 2;
    }
});
var Me = A((D) => {
    "use strict";
    Object.defineProperty(D, "__esModule", { value: !0 });
    D.h_print = $t;
    D.h_print_ret = Pt;
    D.h_new_line = Tt;
    D.h_print_num = Ut;
    D.h_print_addr = Vt;
    D.h_print_paddr = Lt;
    function $t(e) {
        e.print();
    }
    function Pt(e) {
        e.print(),
            e.inputOutputDevice
                ? e.inputOutputDevice.writeString(`
`)
                : console.log(`
`),
            e.returnFromRoutine(1);
    }
    function Tt(e) {
        e.inputOutputDevice
            ? e.inputOutputDevice.writeString(`
`)
            : console.log(`
`);
    }
    function Ut(e, [t]) {
        let r = t > 32767 ? t - 65536 : t;
        e.inputOutputDevice ? e.inputOutputDevice.writeString(r.toString()) : console.log(r.toString());
    }
    function Vt(e, [t]) {
        let r = e.pc;
        (e.pc = t), e.print(), (e.pc = r);
    }
    function Lt(e, [t]) {
        let r = e.header?.version || 3,
            n;
        r <= 3 ? (n = 2) : r <= 5 || r <= 7 ? (n = 4) : (n = 8);
        let o = t * n,
            s = e.pc;
        (e.pc = o), e.print(), (e.pc = s);
    }
});
var ze = A((G) => {
    "use strict";
    Object.defineProperty(G, "__esModule", { value: !0 });
    G.h_pop = Ct;
    G.h_push = jt;
    G.h_pull = Mt;
    G.h_random = zt;
    function kt(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function Ct(e) {
        e.stack.pop();
    }
    function jt(e, [t]) {
        e.stack.push(t);
    }
    function Mt(e, [t]) {
        if ((e.trace && console.log(`@pull: stack length=${e.stack.length}, target var=${t}`), e.stack.length === 0)) {
            console.error("Stack underflow in pull");
            return;
        }
        let r = e.stack.pop() || 0;
        e.trace && console.log(`@pull: pulled value=${r}, storing to var ${t}`), e.setVariableValue(t, r);
    }
    function zt(e, [t], r) {
        let n = kt(t),
            o;
        n > 0 ? (o = Math.floor(Math.random() * n) + 1) : (o = 0), r.store?.(o);
    }
});
var fe = A((U) => {
    "use strict";
    Object.defineProperty(U, "__esModule", { value: !0 });
    U.h_get_sibling = Rt;
    U.h_get_child = Dt;
    U.h_get_parent = Ft;
    U.h_remove_obj = Kt;
    U.h_print_obj = Zt;
    U.h_test_attr = Nt;
    U.h_set_attr = qt;
    U.h_clear_attr = Ht;
    U.h_jin = Wt;
    U.h_insert_obj = Xt;
    function Rt(e, [t], r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o;
        e.header.version <= 3 ? (o = e.memory.readUInt8(n + 5)) : (o = e.memory.readUInt16BE(n + 9)),
            r.store?.(o),
            r.branch?.(o !== 0);
    }
    function Dt(e, [t], r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o;
        e.header.version <= 3 ? (o = e.memory.readUInt8(n + 6)) : (o = e.memory.readUInt16BE(n + 10)),
            r.store?.(o),
            r.branch?.(o !== 0);
    }
    function Ft(e, [t], r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o;
        e.header.version <= 3 ? (o = e.memory.readUInt8(n + 4)) : (o = e.memory.readUInt16BE(n + 6)), r.store?.(o);
    }
    function Kt(e, [t]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        if (t === 0) return;
        let r = e.getObjectAddress(t),
            n;
        if ((e.header.version <= 3 ? (n = e.memory.readUInt8(r + 4)) : (n = e.memory.readUInt16BE(r + 6)), n === 0))
            return;
        let o = e.getObjectAddress(n),
            s;
        if ((e.header.version <= 3 ? (s = e.memory.readUInt8(o + 6)) : (s = e.memory.readUInt16BE(o + 10)), s === t)) {
            let i;
            e.header.version <= 3
                ? ((i = e.memory.readUInt8(r + 5)), e.memory.writeUInt8(i, o + 6))
                : ((i = e.memory.readUInt16BE(r + 9)), e.memory.writeUInt16BE(i, o + 10));
        } else {
            let i = s;
            for (; i !== 0; ) {
                let a = e.getObjectAddress(i),
                    l;
                if (
                    (e.header.version <= 3 ? (l = e.memory.readUInt8(a + 5)) : (l = e.memory.readUInt16BE(a + 9)),
                    l === t)
                ) {
                    let d;
                    e.header.version <= 3
                        ? ((d = e.memory.readUInt8(r + 5)), e.memory.writeUInt8(d, a + 5))
                        : ((d = e.memory.readUInt16BE(r + 9)), e.memory.writeUInt16BE(d, a + 9));
                    break;
                }
                i = l;
            }
        }
        e.header.version <= 3
            ? (e.memory.writeUInt8(0, r + 4), e.memory.writeUInt8(0, r + 5))
            : (e.memory.writeUInt16BE(0, r + 6), e.memory.writeUInt16BE(0, r + 9));
    }
    function Zt(e, [t]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let r = e.getObjectAddress(t),
            n = e.header.version <= 3 ? 9 : 14,
            o = e.memory.readUInt16BE(r + n - 2),
            s = e.pc;
        (e.pc = o + 1), e.print(), (e.pc = s);
    }
    function Nt(e, [t, r], n) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s = e.header.version <= 3 ? 4 : 6,
            i = Math.floor(r / 8),
            a = 7 - (r % 8);
        if (i >= s) {
            console.error(`Invalid attribute number ${r}`);
            return;
        }
        let d = ((e.memory.readUInt8(o + i) >> a) & 1) === 1;
        n.branch?.(d);
    }
    function qt(e, [t, r]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o = e.header.version <= 3 ? 4 : 6,
            s = Math.floor(r / 8),
            i = 7 - (r % 8);
        if (s >= o) {
            console.error(`Invalid attribute number ${r}`);
            return;
        }
        let l = e.memory.readUInt8(n + s) | (1 << i);
        e.memory.writeUInt8(l, n + s);
    }
    function Ht(e, [t, r]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o = e.header.version <= 3 ? 4 : 6,
            s = Math.floor(r / 8),
            i = 7 - (r % 8);
        if (s >= o) {
            console.error(`Invalid attribute number ${r}`);
            return;
        }
        let l = e.memory.readUInt8(n + s) & ~(1 << i);
        e.memory.writeUInt8(l, n + s);
    }
    function Wt(e, [t, r], n) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s;
        e.header.version <= 3 ? (s = e.memory.readUInt8(o + 4)) : (s = e.memory.readUInt16BE(o + 6)),
            n.branch?.(s === r);
    }
    function Xt(e, [t, r]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = e.getObjectAddress(t),
            o = e.getObjectAddress(r);
        if (e.header.version <= 3) {
            let s = e.memory.readUInt8(n + 4);
            if (s !== 0) {
                e.playerObjectNumber ||
                    (e.lastRead &&
                        !e.lastRead.startsWith("dr") &&
                        !e.lastRead.startsWith("ta") &&
                        e.setPlayerObjectNumber(t));
                let a = e.getObjectAddress(s),
                    l = e.memory.readUInt8(a + 6);
                if (l === t) {
                    let d = e.memory.readUInt8(n + 5);
                    e.memory.writeUInt8(d, a + 6);
                } else {
                    let d = l;
                    for (; d !== 0; ) {
                        let c = e.getObjectAddress(d),
                            u = e.memory.readUInt8(c + 5);
                        if (u === t) {
                            let _ = e.memory.readUInt8(n + 5);
                            e.memory.writeUInt8(_, c + 5);
                            break;
                        }
                        d = u;
                    }
                }
            }
            let i = e.memory.readUInt8(o + 6);
            e.memory.writeUInt8(i, n + 5), e.memory.writeUInt8(t, o + 6), e.memory.writeUInt8(r, n + 4);
        } else {
            let s = e.memory.readUInt16BE(n + 6);
            if (
                (e.playerObjectNumber ||
                    (e.lastRead &&
                        !e.lastRead.startsWith("dr") &&
                        !e.lastRead.startsWith("ta") &&
                        e.setPlayerObjectNumber(t)),
                s !== 0)
            ) {
                let a = e.getObjectAddress(s),
                    l = e.memory.readUInt16BE(a + 10);
                if (l === t) {
                    let d = e.memory.readUInt16BE(n + 8);
                    e.memory.writeUInt16BE(d, a + 10);
                } else {
                    let d = l;
                    for (; d !== 0; ) {
                        let c = e.getObjectAddress(d),
                            u = e.memory.readUInt16BE(c + 8);
                        if (u === t) {
                            let _ = e.memory.readUInt16BE(n + 8);
                            e.memory.writeUInt16BE(_, c + 8);
                            break;
                        }
                        d = u;
                    }
                }
            }
            let i = e.memory.readUInt16BE(o + 10);
            e.memory.writeUInt16BE(i, n + 8), e.memory.writeUInt16BE(t, o + 10), e.memory.writeUInt16BE(r, n + 6);
        }
    }
});
var Ee = A((J) => {
    "use strict";
    Object.defineProperty(J, "__esModule", { value: !0 });
    J.h_nop = vt;
    J.h_show_status = Gt;
    J.h_verify = Jt;
    J.h_piracy = Qt;
    function vt(e) {}
    function Gt(e) {
        if (
            (e.trace && console.log("@show_status"),
            !e.inputOutputDevice || !e.memory || !e.header || e.header.version > 3)
        )
            return;
        let t = 80;
        e.inputOutputDevice?.cols
            ? (t = e.inputOutputDevice.cols)
            : typeof process < "u" && process.stdout?.columns && (t = process.stdout.columns);
        let r = e.getVariableValue(16);
        e.trace && console.log(`  Location object: ${r}`);
        let n = "";
        if (r && r > 0) {
            let { h_get_prop_addr: _ } = fe(),
                m =
                    e.header.objectTableAddress +
                    (e.header.version <= 3 ? 62 : 126) +
                    (r - 1) * (e.header.version <= 3 ? 9 : 14),
                p = e.header.version <= 3 ? 9 : 14,
                g = e.memory.readUInt16BE(m + p - 2),
                B = e.pc;
            (e.pc = g + 1), (n = e.decodeZSCII(!0)), (e.pc = B);
        }
        let s = (e.memory.readUInt8(1) & 2) !== 0,
            i = "";
        if (s) {
            let _ = e.getVariableValue(17) || 0,
                m = e.getVariableValue(18) || 0;
            e.trace && console.log(`  Time: ${_}:${m}`),
                (i = `Time: ${_.toString().padStart(2, " ")}:${m.toString().padStart(2, "0")}`);
        } else {
            let _ = e.getVariableValue(17) || 0,
                m = e.getVariableValue(18) || 0;
            e.trace && console.log(`  Score: ${_}, Moves: ${m}`), (i = `Score: ${_}  Moves: ${m}`);
        }
        let a = " " + n,
            l = t - a.length - i.length - 1,
            u = "\x1B7\x1B[1;1H\x1B[7m" + (a + " ".repeat(Math.max(0, l)) + i).slice(0, t - 1) + "\x1B[0m\x1B8";
        e.inputOutputDevice.writeString(u);
    }
    function Jt(e, t, r) {
        r.branch?.(!0);
    }
    function Qt(e, t, r) {
        r.branch?.(!0);
    }
});
var Re = A((W) => {
    "use strict";
    Object.defineProperty(W, "__esModule", { value: !0 });
    W.h_get_prop_len = Yt;
    W.h_get_prop = er;
    W.h_get_prop_addr = tr;
    W.h_get_next_prop = rr;
    W.h_put_prop = nr;
    function Yt(e, [t], r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        if (t === 0) {
            r.store?.(0);
            return;
        }
        let n = e.memory.readUInt8(t - 1),
            o;
        e.header.version <= 3
            ? (o = (n >> 5) + 1)
            : n & 128
              ? ((o = e.memory.readUInt8(t - 2) & 63), o === 0 && (o = 64))
              : (o = n & 64 ? 2 : 1),
            r.store?.(o);
    }
    function er(e, [t, r], n) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s = e.header.version <= 3 ? 9 : 14,
            i = e.memory.readUInt16BE(o + s - 2),
            a = e.memory.readUInt8(i),
            l = i + 1 + a * 2,
            d = 0,
            c = !1;
        for (;;) {
            let u = e.memory.readUInt8(l);
            if (u === 0) break;
            let _, m;
            if (
                (e.header.version <= 3
                    ? ((m = (u >> 5) + 1), (_ = u & 31), (l += 1))
                    : ((_ = u & 63),
                      u & 128
                          ? ((m = e.memory.readUInt8(l + 1) & 63), m === 0 && (m = 64), (l += 2))
                          : ((m = u & 64 ? 2 : 1), (l += 1))),
                _ === r)
            ) {
                if (m === 1) d = e.memory.readUInt8(l);
                else if (m === 2) d = e.memory.readUInt16BE(l);
                else {
                    console.error(`Invalid property size ${m} for get_prop`);
                    return;
                }
                c = !0;
                break;
            }
            l += m;
        }
        if (!c) {
            let u = e.header.objectTableAddress + (r - 1) * 2;
            d = e.memory.readUInt16BE(u);
        }
        n.store?.(d);
    }
    function tr(e, [t, r], n) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s = e.header.version <= 3 ? 9 : 14,
            i = e.memory.readUInt16BE(o + s - 2),
            a = e.memory.readUInt8(i),
            l = i + 1 + a * 2,
            d = 0;
        for (;;) {
            let c = e.memory.readUInt8(l);
            if (c === 0) break;
            let u, _, m;
            if (
                (e.header.version <= 3
                    ? ((_ = (c >> 5) + 1), (u = c & 31), (m = l + 1))
                    : ((u = c & 63),
                      c & 128
                          ? ((_ = e.memory.readUInt8(l + 1) & 63), _ === 0 && (_ = 64), (m = l + 2))
                          : ((_ = c & 64 ? 2 : 1), (m = l + 1))),
                u === r)
            ) {
                d = m;
                break;
            }
            l = m + _;
        }
        n.store?.(d);
    }
    function rr(e, [t, r], n) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s = e.header.version <= 3 ? 9 : 14,
            i = e.memory.readUInt16BE(o + s - 2),
            a = e.memory.readUInt8(i),
            l = i + 1 + a * 2;
        if (r === 0) {
            let d = e.memory.readUInt8(l);
            if (d === 0) {
                n.store?.(0);
                return;
            }
            let c;
            e.header.version <= 3 ? (c = d & 31) : (c = d & 63), n.store?.(c);
            return;
        }
        for (;;) {
            let d = e.memory.readUInt8(l);
            if (d === 0) {
                n.store?.(0);
                return;
            }
            let c, u;
            if (
                (e.header.version <= 3
                    ? ((u = (d >> 5) + 1), (c = d & 31), (l += 1))
                    : ((c = d & 63),
                      d & 128
                          ? ((u = e.memory.readUInt8(l + 1) & 63), u === 0 && (u = 64), (l += 2))
                          : ((u = d & 64 ? 2 : 1), (l += 1))),
                c === r)
            ) {
                l += u;
                let _ = e.memory.readUInt8(l);
                if (_ === 0) {
                    n.store?.(0);
                    return;
                }
                let m;
                e.header.version <= 3 ? (m = _ & 31) : (m = _ & 63), n.store?.(m);
                return;
            }
            l += u;
        }
    }
    function nr(e, [t, r, n]) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let o = e.getObjectAddress(t),
            s = e.header.version <= 3 ? 9 : 14,
            i = e.memory.readUInt16BE(o + s - 2),
            a = e.memory.readUInt8(i),
            l = i + 1 + a * 2;
        for (;;) {
            let d = e.memory.readUInt8(l);
            if (d === 0) {
                console.error(`Property ${r} not found on object ${t}`);
                return;
            }
            let c, u, _;
            if (
                (e.header.version <= 3
                    ? ((u = (d >> 5) + 1), (c = d & 31), (_ = l + 1))
                    : ((c = d & 63),
                      d & 128
                          ? ((u = e.memory.readUInt8(l + 1) & 63), u === 0 && (u = 64), (_ = l + 2))
                          : ((u = d & 64 ? 2 : 1), (_ = l + 1))),
                c === r)
            ) {
                if (u === 1) e.memory.writeUInt8(n & 255, _);
                else if (u === 2) e.memory.writeUInt16BE(n, _);
                else {
                    console.error(`Invalid property size ${u} for put_prop`);
                    return;
                }
                return;
            }
            l = _ + u;
        }
    }
});
var De = A((F) => {
    "use strict";
    Object.defineProperty(F, "__esModule", { value: !0 });
    F.h_inc = or;
    F.h_dec = sr;
    F.h_load = ir;
    F.h_store = ar;
    F.h_inc_chk = cr;
    F.h_dec_chk = lr;
    function pe(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function or(e, [t]) {
        let r = e.getVariableValue(t);
        e.setVariableValue(t, (r + 1) & 65535);
    }
    function sr(e, [t]) {
        let r = e.getVariableValue(t);
        e.setVariableValue(t, (r - 1) & 65535);
    }
    function ir(e, [t], r) {
        let n = e.getVariableValue(t);
        r.store?.(n);
    }
    function ar(e, [t, r]) {
        e.setVariableValue(t, r);
    }
    function cr(e, [t, r], n) {
        let s = (e.getVariableValue(t) + 1) & 65535;
        e.setVariableValue(t, s);
        let i = pe(s),
            a = pe(r);
        n.branch?.(i > a);
    }
    function lr(e, [t, r], n) {
        let s = (e.getVariableValue(t) - 1) & 65535;
        e.setVariableValue(t, s);
        let i = pe(s),
            a = pe(r);
        n.branch?.(i < a);
    }
});
var _e = A((oe) => {
    "use strict";
    Object.defineProperty(oe, "__esModule", { value: !0 });
    oe.h_call = Fe;
    oe.h_call_1s = dr;
    oe.h_call_2s = hr;
    function Fe(e, t, r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        let n = t[0];
        if (n === 0) {
            e.trace && console.log("@call routine address 0: returning FALSE"), r.store?.(0);
            return;
        }
        let o = n;
        if ((e.header.version <= 3 ? (o *= 2) : e.header.version <= 5 ? (o *= 4) : (o *= 8), o >= e.memory.length)) {
            e.trace &&
                console.log(
                    `@call Routine address ${o.toString(16)} (packed ${n.toString(16)}) is out of bounds (file size ${e.memory.length}), returning FALSE`
                ),
                r.store?.(0);
            return;
        }
        e.trace && console.log(`@call Calling routine at ${o.toString(16)} with ${t.length - 1} args`),
            e.callStack.push(e.pc);
        let s = e._currentStoreTarget;
        s !== void 0 && e.callStack.push(s);
        let i = e.localVariables.length;
        for (let c = 0; c < i; c++) e.callStack.push(e.localVariables[c]);
        e.callStack.push(i);
        let a = s !== void 0 ? 1 : 0;
        e.callStack.push(a), (e.currentContext = o);
        let l = e.currentContext,
            d = e.memory.readUInt8(l);
        if ((l++, (e.localVariables = []), e.header.version <= 4))
            for (let c = 0; c < d; c++) {
                let u = e.memory.readUInt16BE(l);
                (l += 2), c < t.length - 1 ? (e.localVariables[c] = t[c + 1]) : (e.localVariables[c] = u);
            }
        else
            for (let c = 0; c < d; c++) c < t.length - 1 ? (e.localVariables[c] = t[c + 1]) : (e.localVariables[c] = 0);
        e.pc = l;
    }
    function dr(e, [t], r) {
        if (!e.memory || !e.header) {
            console.error("Memory or header not loaded");
            return;
        }
        if (t === 0) {
            e.trace && console.log("@call_1s routine address 0: returning FALSE"), r.store?.(0);
            return;
        }
        let n = t;
        if ((e.header.version <= 3 ? (n *= 2) : e.header.version <= 5 ? (n *= 4) : (n *= 8), n >= e.memory.length)) {
            e.trace &&
                console.log(
                    `@call_1s Routine address ${n.toString(16)} (packed ${t.toString(16)}) is out of bounds (file size ${e.memory.length}), returning FALSE`
                ),
                r.store?.(0);
            return;
        }
        e.trace && console.log(`@call_1s Calling routine at ${n.toString(16)}`), e.callStack.push(e.pc);
        let o = e._currentStoreTarget;
        o !== void 0 && e.callStack.push(o);
        let s = e.localVariables.length;
        for (let d = 0; d < s; d++) e.callStack.push(e.localVariables[d]);
        e.callStack.push(s);
        let i = o !== void 0 ? 1 : 0;
        e.callStack.push(i),
            e.trace &&
                console.log(
                    `@call_1s Pushed: returnPC=${e.pc.toString(16)}, storeVar=${o}, savedLocals=${s}, marker=${i}`
                ),
            (e.currentContext = n);
        let a = e.currentContext,
            l = e.memory.readUInt8(a);
        if ((a++, (e.localVariables = []), e.header.version <= 4))
            for (let d = 0; d < l; d++) {
                let c = e.memory.readUInt16BE(a);
                (a += 2), (e.localVariables[d] = c);
            }
        else for (let d = 0; d < l; d++) e.localVariables[d] = 0;
        e.pc = a;
    }
    function hr(e, t, r) {
        Fe(e, t, r);
    }
});
var Ke = A((Q) => {
    "use strict";
    Object.defineProperty(Q, "__esModule", { value: !0 });
    Q.h_loadw = ur;
    Q.h_loadb = fr;
    Q.h_storew = pr;
    Q.h_storeb = _r;
    function ge(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function ur(e, [t, r], n) {
        if (!e.memory) {
            console.error("Memory not loaded");
            return;
        }
        let o = ge(r),
            s = t + 2 * o;
        if (s < 0 || s >= e.memory.length - 1) {
            console.error(
                `LOADW: Invalid memory address 0x${s.toString(16)} (array=0x${t.toString(16)}, index=${o}). Memory size: 0x${e.memory.length.toString(16)}`
            );
            return;
        }
        let i = e.memory.readUInt16BE(s);
        n.store?.(i);
    }
    function fr(e, [t, r], n) {
        if (!e.memory) {
            console.error("Memory not loaded");
            return;
        }
        let o = ge(r),
            s = t + o;
        if (s < 0 || s >= e.memory.length) {
            console.error(
                `LOADB: Invalid memory address 0x${s.toString(16)} (array=0x${t.toString(16)}, index=${o}). Memory size: 0x${e.memory.length.toString(16)}`
            );
            return;
        }
        let i = e.memory.readUInt8(s);
        n.store?.(i);
    }
    function pr(e, [t, r, n]) {
        if (!e.memory) {
            console.error("Memory not loaded");
            return;
        }
        let o = ge(r),
            s = t + 2 * o;
        if (s < 0 || s >= e.memory.length - 1) {
            console.error(
                `STOREW: Invalid memory address 0x${s.toString(16)} (array=0x${t.toString(16)}, index=${o}). Memory size: 0x${e.memory.length.toString(16)}`
            );
            return;
        }
        e.memory.writeUInt16BE(n, s);
    }
    function _r(e, [t, r, n]) {
        if (!e.memory) {
            console.error("Memory not loaded");
            return;
        }
        let o = ge(r),
            s = t + o;
        if (s < 0 || s >= e.memory.length) {
            console.error(
                `STOREB: Invalid memory address 0x${s.toString(16)} (array=0x${t.toString(16)}, index=${o}). Memory size: 0x${e.memory.length.toString(16)}`
            );
            return;
        }
        e.memory.writeUInt8(n, s);
    }
});
var Ne = A((S) => {
    "use strict";
    var gr =
            (S && S.__createBinding) ||
            (Object.create
                ? function (e, t, r, n) {
                      n === void 0 && (n = r);
                      var o = Object.getOwnPropertyDescriptor(t, r);
                      (!o || ("get" in o ? !t.__esModule : o.writable || o.configurable)) &&
                          (o = {
                              enumerable: !0,
                              get: function () {
                                  return t[r];
                              },
                          }),
                          Object.defineProperty(e, n, o);
                  }
                : function (e, t, r, n) {
                      n === void 0 && (n = r), (e[n] = t[r]);
                  }),
        mr =
            (S && S.__setModuleDefault) ||
            (Object.create
                ? function (e, t) {
                      Object.defineProperty(e, "default", { enumerable: !0, value: t });
                  }
                : function (e, t) {
                      e.default = t;
                  }),
        Ze =
            (S && S.__importStar) ||
            (function () {
                var e = function (t) {
                    return (
                        (e =
                            Object.getOwnPropertyNames ||
                            function (r) {
                                var n = [];
                                for (var o in r) Object.prototype.hasOwnProperty.call(r, o) && (n[n.length] = o);
                                return n;
                            }),
                        e(t)
                    );
                };
                return function (t) {
                    if (t && t.__esModule) return t;
                    var r = {};
                    if (t != null) for (var n = e(t), o = 0; o < n.length; o++) n[o] !== "default" && gr(r, t, n[o]);
                    return mr(r, t), r;
                };
            })();
    Object.defineProperty(S, "__esModule", { value: !0 });
    S.h_print_char = Sr;
    S.h_print_num = Br;
    S.h_sread = wr;
    S.h_print_table = Ir;
    S.h_split_window = Er;
    S.h_set_window = Ar;
    S.h_erase_window = Or;
    S.h_erase_line = $r;
    S.h_set_cursor = Pr;
    S.h_get_cursor = Tr;
    S.h_set_text_style = Ur;
    S.h_buffer_mode = Vr;
    S.h_output_stream = Lr;
    S.h_input_stream = kr;
    S.h_sound_effect = Cr;
    S.h_read_char = jr;
    S.h_save = Mr;
    S.h_restore = zr;
    function yr(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function br(e, t) {
        let r = "abcdefghijklmnopqrstuvwxyz",
            n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            o = ` 
0123456789.,!?_#'"/\\-:()`,
            s = [];
        for (let d = 0; d < t.length && s.length < 9; d++) {
            let c = String.fromCharCode(t[d]),
                u = r.indexOf(c);
            u >= 0
                ? s.push(u + 6)
                : ((u = n.indexOf(c)),
                  u >= 0
                      ? (s.push(4), s.push(u + 6))
                      : ((u = o.indexOf(c)),
                        u >= 0
                            ? (s.push(5), s.push(u + 6))
                            : (s.push(5), s.push(6), s.push((t[d] >> 5) & 31), s.push(t[d] & 31))));
        }
        for (; s.length < 6; ) s.push(5);
        if ((s.length > 6 && (s.length = 6), e.trace)) {
            let d = String.fromCharCode(...t);
            console.log(`  encodeWord("${d}"): zchars=[${s.join(",")}]`);
        }
        let i = (s[0] << 10) | (s[1] << 5) | s[2],
            l = (s[3] << 10) | (s[4] << 5) | s[5] | 32768;
        return (
            e.trace &&
                console.log(`  encoded as: ${i.toString(16).padStart(4, "0")} ${l.toString(16).padStart(4, "0")} 0000`),
            [i, l, 0]
        );
    }
    function xr(e, t, r) {
        if (!e.memory || !e.header) return;
        let n = [];
        if (e.header.version <= 4) {
            let p = 0,
                g = e.memory.readUInt8(t);
            for (; p < g; ) {
                let B = e.memory.readUInt8(t + 1 + p);
                if (B === 0) break;
                n.push(B), p++;
            }
        } else {
            let p = e.memory.readUInt8(t + 1);
            for (let g = 0; g < p; g++) n.push(e.memory.readUInt8(t + 2 + g));
        }
        let o = e.memory.readUInt8(r),
            s = [],
            i = [],
            a = 0;
        for (let p = 0; p < n.length; p++) {
            let g = n[p];
            g === 32
                ? i.length > 0 && (s.push({ word: i, start: a, length: i.length }), (i = []))
                : (i.length === 0 && (a = p), i.push(g));
        }
        if ((i.length > 0 && s.push({ word: i, start: a, length: i.length }), e.trace)) {
            console.log(`@tokenize: found ${s.length} tokens`);
            for (let p of s) {
                let g = String.fromCharCode(...p.word);
                console.log(`  token: "${g}" at position ${p.start}, length ${p.length}`);
            }
        }
        let l = e.header.dictionaryAddress,
            d = e.memory.readUInt8(l),
            c = e.memory.readUInt8(l + d + 1),
            u = e.memory.readUInt16BE(l + d + 2),
            _ = l + d + 4;
        if (e.trace) {
            console.log(`@tokenize: dictionary at 0x${l.toString(16)}, ${u} entries, ${c} bytes each`),
                console.log("  First 10 dictionary entries:");
            for (let p = 0; p < Math.min(10, u); p++) {
                let g = _ + p * c,
                    B = e.memory.readUInt16BE(g),
                    I = e.memory.readUInt16BE(g + 2),
                    E = e.memory.readUInt16BE(g + 4);
                console.log(
                    `    [${p}] @0x${g.toString(16)}: ${B.toString(16).padStart(4, "0")} ${I.toString(16).padStart(4, "0")} ${E.toString(16).padStart(4, "0")}`
                );
            }
            for (let p = 0; p < u; p++) {
                let g = _ + p * c,
                    B = e.memory.readUInt16BE(g),
                    I = e.memory.readUInt16BE(g + 2),
                    E = e.memory.readUInt16BE(g + 4),
                    y = e.pc;
                e.pc = g;
                let b = e.decodeZSCII(!1);
                (e.pc = y),
                    ["look", "quit", "yes", "y", "no", "n"].includes(b) &&
                        console.log(
                            `  Found "${b}" at entry ${p} @0x${g.toString(16)}: ${B.toString(16).padStart(4, "0")} ${I.toString(16).padStart(4, "0")} ${E.toString(16).padStart(4, "0")}`
                        );
            }
        }
        let m = Math.min(s.length, o);
        e.memory.writeUInt8(m, r + 1);
        for (let p = 0; p < m; p++) {
            let g = s[p],
                B = br(e, g.word),
                I = 0;
            for (let y = 0; y < u; y++) {
                let b = _ + y * c,
                    w = e.memory.readUInt16BE(b),
                    $ = e.memory.readUInt16BE(b + 2);
                if (w === B[0] && $ === B[1]) {
                    I = b;
                    break;
                }
            }
            e.trace && I > 0
                ? console.log(`  found "${String.fromCharCode(...g.word)}" in dictionary at 0x${I.toString(16)}`)
                : e.trace && console.log(`  "${String.fromCharCode(...g.word)}" not found in dictionary`);
            let E = r + 2 + p * 4;
            e.memory.writeUInt16BE(I, E), e.memory.writeUInt8(g.length, E + 2), e.memory.writeUInt8(g.start + 1, E + 3);
        }
    }
    function Sr(e, [t]) {
        e.inputOutputDevice
            ? e.inputOutputDevice.writeString(String.fromCharCode(t))
            : console.log(String.fromCharCode(t));
    }
    function Br(e, [t]) {
        let r = yr(t);
        e.inputOutputDevice ? e.inputOutputDevice.writeString(r.toString()) : console.log(r.toString());
    }
    async function wr(e, t) {
        if (!e.memory || !e.inputOutputDevice || !e.header) {
            console.error("Memory, input/output device, or header not loaded");
            return;
        }
        if (e.header.version <= 3) {
            let { h_show_status: a } = Ee();
            a(e);
        }
        let r = t[0],
            n = t[1],
            o = await e.inputOutputDevice.readLine();
        e.trace &&
            console.log(
                `@sread: textBufferAddr=0x${r.toString(16)}, parseBufferAddr=0x${n.toString(16)}, input="${o}"`
            );
        let s = e.memory.readUInt8(r),
            i = o.toLowerCase().slice(0, s);
        if ((e.setLastRead(i), e.header.version <= 4)) {
            for (let a = 0; a < i.length; a++) e.memory.writeUInt8(i.charCodeAt(a), r + 1 + a);
            i.length < s && e.memory.writeUInt8(0, r + 1 + i.length);
        } else {
            e.memory.writeUInt8(i.length, r + 1);
            for (let a = 0; a < i.length; a++) e.memory.writeUInt8(i.charCodeAt(a), r + 2 + a);
            i.length < s && e.memory.writeUInt8(0, r + 2 + i.length);
        }
        xr(e, r, n);
    }
    function Ir(e, t) {
        if (!e.memory) {
            console.error("Memory not loaded");
            return;
        }
        let r = t[0],
            n = t[1],
            o = t.length > 2 ? t[2] : 1,
            s = t.length > 3 ? t[3] : 0;
        if (r >= e.memory.length) {
            console.error(`print_table: Invalid address 0x${r.toString(16)}`);
            return;
        }
        for (let i = 0; i < o; i++) {
            let a = r + i * (n + s);
            if (a + n > e.memory.length) {
                console.error(`print_table: Row ${i} extends beyond memory`);
                break;
            }
            for (let l = 0; l < n; l++) {
                let d = e.memory.readUInt8(a + l);
                e.inputOutputDevice
                    ? e.inputOutputDevice.writeString(String.fromCharCode(d))
                    : process.stdout.write(String.fromCharCode(d));
            }
            i < o - 1 &&
                (e.inputOutputDevice
                    ? e.inputOutputDevice.writeString(`
`)
                    : process.stdout.write(`
`));
        }
    }
    function Er(e, [t]) {
        if ((e.trace && console.log(`@split_window ${t}`), e.inputOutputDevice)) {
            let n = (e.terminalHeight || 24) - 1;
            if ((e.splitWindowLines || (e.splitWindowLines = 0), (e.splitWindowLines = t), t === 0))
                e.inputOutputDevice.writeString(`\x1B[1;${n}r`);
            else {
                let o = t + 1;
                e.inputOutputDevice.writeString(`\x1B[${o};${n}r`), e.inputOutputDevice.writeString(`\x1B[${o};1H`);
            }
        }
    }
    function Ar(e, [t]) {
        if ((e.trace && console.log(`@set_window ${t}`), e.inputOutputDevice))
            if (((e.currentWindow = t), t === 1)) e.inputOutputDevice.writeString("\x1B[1;1H");
            else {
                let r = (e.splitWindowLines || 0) + 1,
                    n = e.splitWindowLines === 0 ? 1 : r;
                e.inputOutputDevice.writeString(`\x1B[${n};1H`);
            }
    }
    function Or(e, [t]) {
        if ((e.trace && console.log(`@erase_window ${t}`), e.inputOutputDevice)) {
            let r = t > 32767 ? t - 65536 : t;
            r === -1 || r === 2
                ? e.inputOutputDevice.writeString("\x1B[2J\x1B[H")
                : r === 0
                  ? e.inputOutputDevice.writeString("\x1B[J")
                  : r === 1 && e.inputOutputDevice.writeString("\x1B[K");
        }
    }
    function $r(e, [t]) {
        e.trace && console.log(`@erase_line ${t} (no-op)`);
    }
    function Pr(e, [t, r]) {
        if ((e.trace && console.log(`@set_cursor ${t},${r}`), e.inputOutputDevice)) {
            let n = `\x1B[${t};${r}H`;
            e.inputOutputDevice.writeString(n);
        }
    }
    function Tr(e, [t]) {
        e.memory && (e.memory.writeUInt16BE(1, t), e.memory.writeUInt16BE(1, t + 2)),
            e.trace && console.log(`@get_cursor ${t} (stub: returning 1,1)`);
    }
    function Ur(e, [t]) {
        e.trace && console.log(`@set_text_style ${t} (no-op)`);
    }
    function Vr(e, [t]) {
        e.trace && console.log(`@buffer_mode ${t} (no-op)`);
    }
    function Lr(e, [t, r]) {
        return;
        // e.trace && console.log(`@output_stream ${t}${r !== void 0 ? `,${r}` : ""} (no-op)`);
    }
    function kr(e, [t]) {
        return;
        // e.trace && console.log(`@input_stream ${t} (no-op)`);
    }
    function Cr(e, t) {
        e.trace && console.log(`@sound_effect ${t.join(",")} (no-op)`);
    }
    async function jr(e, [t, r, n], o) {
        if (!e.inputOutputDevice) {
            console.error("No input device"), o.store?.(13);
            return;
        }
        let s = await e.inputOutputDevice.readChar(),
            i = s.charCodeAt(0);
        e.trace && console.log(`@read_char returned '${s}' (code ${i})`), o.store?.(i);
    }
    async function Mr(e, t, r) {
        let n = e.pc;
        if (r.branchInfo) {
            let o = r.branchInfo.branchBytes;
            (n = e.pc - o),
                e.trace && console.log(`@save: PC=${e.pc.toString(16)}, branchBytes=${o}, savedPC=${n.toString(16)}`);
        }
        try {
            let o = await e.saveData(n);
            if (!o) {
                e.trace && console.log("@save failed: could not generate save data"), r.branch?.(!1);
                return;
            }
            if (e.runtime === "node") {
                // XXX Porting
                // let { writeFile: s } = await Promise.resolve().then(() => Ze(require("fs/promises"))),
                //    i = e.filePath + ".qzl";
                let s = undefined;
                await s(i, o), e.trace && console.log(`@save: saved to ${i}`), r.branch?.(!0);
            } else if (e.runtime === "browser") {
                let s = e.getHeader();
                if (!s) {
                    e.trace && console.log("@save failed: could not get game header"), r.branch?.(!1);
                    return;
                }
                let a = `tszm-save-${`${s.release}.${s.serial}`}`,
                    l = o.toString("base64");
                localStorage.setItem(a, l),
                    e.trace && console.log(`@save: saved ${o.length} bytes to localStorage key "${a}"`),
                    r.branch?.(!0);
            } else
                e.trace &&
                    console.log(
                        `@save: generated save data (${o.length} bytes) but not persisting (unknown environment)`
                    ),
                    r.branch?.(!0);
        } catch (o) {
            e.trace && console.log(`@save failed: ${o}`), r.branch?.(!1);
        }
    }
    async function zr(e, t, r) {
        try {
            if (e.runtime === "node") {
                // XXX Porting
                /* let { readFile: n } = await Promise.resolve().then(() => Ze(require("fs/promises"))),
                    o = e.filePath + ".qzl"; */
                let readfile = undefined;
                try {
                    let s = await n(o);
                    if (
                        (e.trace &&
                            console.log(`@restore: loaded save file (${s.length} bytes), calling restoreFromSave...`),
                        await e.restoreFromSave(s))
                    ) {
                        e.trace &&
                            (console.log(`@restore: SUCCESS - restoreFromSave() succeeded, PC=${e.pc.toString(16)}`),
                            console.log(
                                "@restore: Returning from handler without calling ctx.branch (PC has been set by restoreFromSave)"
                            ));
                        return;
                    } else
                        e.trace &&
                            console.log(
                                "@restore: FAILED - restoreFromSave() returned false, calling ctx.branch(false)"
                            ),
                            r.branch?.(!1);
                } catch (s) {
                    s.code === "ENOENT"
                        ? e.trace && console.log(`@restore: save file not found at ${o}`)
                        : e.trace && console.log(`@restore: error reading save file: ${s}`),
                        r.branch?.(!1);
                }
            } else if (e.runtime === "browser") {
                let n = e.getHeader();
                if (!n) {
                    e.trace && console.log("@restore failed: could not get game header"), r.branch?.(!1);
                    return;
                }
                let s = `tszm-save-${`${n.release}.${n.serial}`}`;
                try {
                    let i = localStorage.getItem(s);
                    if (!i) {
                        e.trace && console.log(`@restore: no save data found in localStorage for key "${s}"`),
                            r.branch?.(!1);
                        return;
                    }
                    let a = Buffer.from(i, "base64");
                    (await e.restoreFromSave(a))
                        ? e.trace && console.log(`@restore: restored ${a.length} bytes from localStorage key "${s}"`)
                        : (e.trace && console.log("@restore: failed to restore game state"), r.branch?.(!1));
                } catch (i) {
                    e.trace && console.log(`@restore: error reading from localStorage: ${i}`), r.branch?.(!1);
                }
            } else e.trace && console.log("@restore: not implemented for unknown environment"), r.branch?.(!1);
        } catch (n) {
            e.trace && console.log(`@restore failed: ${n}`), r.branch?.(!1);
        }
    }
});
var qe = A((R) => {
    "use strict";
    Object.defineProperty(R, "__esModule", { value: !0 });
    R.h_log_shift = Rr;
    R.h_art_shift = Dr;
    R.h_set_font = Fr;
    R.h_save_undo = Kr;
    R.h_restore_undo = Zr;
    R.h_print_unicode = Nr;
    R.h_check_unicode = qr;
    function Ae(e) {
        return e > 32767 ? e - 65536 : e;
    }
    function Rr(e, [t, r], n) {
        let o = Ae(r),
            s;
        o > 0 ? (s = (t << o) & 65535) : o < 0 ? (s = (t >>> -o) & 65535) : (s = t), n.store?.(s);
    }
    function Dr(e, [t, r], n) {
        let o = Ae(r),
            s = Ae(t),
            i;
        o > 0 ? (i = s << o) : o < 0 ? (i = s >> -o) : (i = s), i < 0 && (i = i + 65536), (i = i & 65535), n.store?.(i);
    }
    function Fr(e, [t], r) {
        t === 1 || t === 0 ? r.store?.(1) : r.store?.(0);
    }
    function Kr(e, t, r) {
        r.store?.(-1);
    }
    function Zr(e, t, r) {
        r.store?.(0);
    }
    function Nr(e, [t]) {
        e.inputOutputDevice
            ? e.inputOutputDevice.writeString(String.fromCharCode(t))
            : console.log(String.fromCharCode(t));
    }
    function qr(e, [t], r) {
        t >= 0 && t <= 65535 ? r.store?.(1) : r.store?.(0);
    }
});
var He = A((h) => {
    "use strict";
    Object.defineProperty(h, "__esModule", { value: !0 });
    h.TABLE_EXT = h.TABLE_VAR = h.TABLE_2OP = h.TABLE_1OP = h.TABLE_0OP = void 0;
    var f = Le(),
        se = ke(),
        ie = Ce(),
        j = je(),
        Y = Me(),
        me = ze(),
        ye = Ee(),
        M = fe(),
        ae = Re(),
        ee = De(),
        be = _e(),
        xe = Ke(),
        O = Ne(),
        X = qe();
    h.TABLE_0OP = [];
    h.TABLE_1OP = [];
    h.TABLE_2OP = [];
    h.TABLE_VAR = [];
    h.TABLE_EXT = [];
    h.TABLE_0OP[0] = (0, f.d0)(0, { name: "rtrue", operandKinds: [], handler: (e) => (0, j.h_rtrue)(e) });
    h.TABLE_0OP[1] = (0, f.d0)(1, { name: "rfalse", operandKinds: [], handler: (e) => (0, j.h_rfalse)(e) });
    h.TABLE_0OP[2] = (0, f.d0)(2, { name: "print", operandKinds: [], handler: (e) => (0, Y.h_print)(e) });
    h.TABLE_0OP[3] = (0, f.d0)(3, { name: "print_ret", operandKinds: [], handler: (e) => (0, Y.h_print_ret)(e) });
    h.TABLE_0OP[4] = (0, f.d0)(4, { name: "nop", operandKinds: [], handler: (e) => (0, ye.h_nop)(e) });
    h.TABLE_0OP[5] = (0, f.d0)(5, {
        name: "save",
        operandKinds: [],
        maxVersion: 3,
        doesBranch: !0,
        handler: (e, t, r) => (0, O.h_save)(e, t, r),
    });
    h.TABLE_0OP[6] = (0, f.d0)(6, {
        name: "restore",
        operandKinds: [],
        maxVersion: 3,
        doesBranch: !0,
        handler: (e, t, r) => (0, O.h_restore)(e, t, r),
    });
    h.TABLE_0OP[8] = (0, f.d0)(8, { name: "ret_popped", operandKinds: [], handler: (e) => (0, j.h_ret_popped)(e) });
    h.TABLE_0OP[9] = (0, f.d0)(9, { name: "pop", operandKinds: [], handler: (e) => (0, me.h_pop)(e) });
    h.TABLE_0OP[10] = (0, f.d0)(10, { name: "quit", operandKinds: [], handler: (e) => (0, j.h_quit)(e) });
    h.TABLE_0OP[11] = (0, f.d0)(11, { name: "new_line", operandKinds: [], handler: (e) => (0, Y.h_new_line)(e) });
    h.TABLE_0OP[12] = (0, f.d0)(12, {
        name: "show_status",
        operandKinds: [],
        maxVersion: 3,
        handler: (e) => (0, ye.h_show_status)(e),
    });
    h.TABLE_0OP[13] = (0, f.d0)(13, {
        name: "verify",
        operandKinds: [],
        minVersion: 3,
        doesBranch: !0,
        handler: (e, t, r) => (0, ye.h_verify)(e, t, r),
    });
    h.TABLE_0OP[15] = (0, f.d0)(15, {
        name: "piracy",
        operandKinds: [],
        minVersion: 5,
        doesBranch: !0,
        handler: (e, t, r) => (0, ye.h_piracy)(e, t, r),
    });
    h.TABLE_1OP[0] = (0, f.d1)(0, { name: "jz", doesBranch: !0, handler: (e, t, r) => (0, j.h_jz)(e, t, r) });
    h.TABLE_1OP[1] = (0, f.d1)(1, {
        name: "get_sibling",
        doesStore: !0,
        doesBranch: !0,
        handler: (e, t, r) => (0, M.h_get_sibling)(e, t, r),
    });
    h.TABLE_1OP[2] = (0, f.d1)(2, {
        name: "get_child",
        doesStore: !0,
        doesBranch: !0,
        handler: (e, t, r) => (0, M.h_get_child)(e, t, r),
    });
    h.TABLE_1OP[3] = (0, f.d1)(3, {
        name: "get_parent",
        doesStore: !0,
        handler: (e, t, r) => (0, M.h_get_parent)(e, t, r),
    });
    h.TABLE_1OP[4] = (0, f.d1)(4, {
        name: "get_prop_len",
        doesStore: !0,
        handler: (e, t, r) => (0, ae.h_get_prop_len)(e, t, r),
    });
    h.TABLE_1OP[5] = (0, f.d1)(5, { name: "inc", operandKinds: ["small"], handler: (e, t) => (0, ee.h_inc)(e, t) });
    h.TABLE_1OP[6] = (0, f.d1)(6, { name: "dec", operandKinds: ["small"], handler: (e, t) => (0, ee.h_dec)(e, t) });
    h.TABLE_1OP[7] = (0, f.d1)(7, { name: "print_addr", handler: (e, t) => (0, Y.h_print_addr)(e, t) });
    h.TABLE_1OP[8] = (0, f.d1)(8, {
        name: "call_1s",
        minVersion: 4,
        doesStore: !0,
        handler: (e, t, r) => (0, be.h_call_1s)(e, t, r),
    });
    h.TABLE_1OP[9] = (0, f.d1)(9, { name: "remove_obj", handler: (e, t) => (0, M.h_remove_obj)(e, t) });
    h.TABLE_1OP[10] = (0, f.d1)(10, { name: "print_obj", handler: (e, t) => (0, M.h_print_obj)(e, t) });
    h.TABLE_1OP[11] = (0, f.d1)(11, { name: "ret", handler: (e, t) => (0, j.h_ret)(e, t) });
    h.TABLE_1OP[12] = (0, f.d1)(12, { name: "jump", handler: (e, t) => (0, j.h_jump)(e, t) });
    h.TABLE_1OP[13] = (0, f.d1)(13, { name: "print_paddr", handler: (e, t) => (0, Y.h_print_paddr)(e, t) });
    h.TABLE_1OP[14] = (0, f.d1)(14, {
        name: "load",
        operandKinds: ["small"],
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, ee.h_load)(e, t, r),
    });
    h.TABLE_1OP[15] = (0, f.d1)(15, {
        name: "not",
        maxVersion: 4,
        doesStore: !0,
        handler: (e, t) => (0, ie.h_not)(e, t),
    });
    h.TABLE_2OP[1] = (0, f.d2)(1, {
        name: "je",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, j.h_je)(e, t, r),
    });
    h.TABLE_2OP[2] = (0, f.d2)(2, {
        name: "jl",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, j.h_jl)(e, t, r),
    });
    h.TABLE_2OP[3] = (0, f.d2)(3, {
        name: "jg",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, j.h_jg)(e, t, r),
    });
    h.TABLE_2OP[4] = (0, f.d2)(4, {
        name: "dec_chk",
        operandKinds: ["small", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, ee.h_dec_chk)(e, t, r),
    });
    h.TABLE_2OP[5] = (0, f.d2)(5, {
        name: "inc_chk",
        operandKinds: ["small", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, ee.h_inc_chk)(e, t, r),
    });
    h.TABLE_2OP[6] = (0, f.d2)(6, {
        name: "jin",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, M.h_jin)(e, t, r),
    });
    h.TABLE_2OP[7] = (0, f.d2)(7, {
        name: "test",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, ie.h_test)(e, t, r),
    });
    h.TABLE_2OP[8] = (0, f.d2)(8, {
        name: "or",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, ie.h_or)(e, t),
    });
    h.TABLE_2OP[9] = (0, f.d2)(9, {
        name: "and",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, ie.h_and)(e, t),
    });
    h.TABLE_2OP[10] = (0, f.d2)(10, {
        name: "test_attr",
        operandKinds: ["var", "var"],
        doesBranch: !0,
        handler: (e, t, r) => (0, M.h_test_attr)(e, t, r),
    });
    h.TABLE_2OP[11] = (0, f.d2)(11, {
        name: "set_attr",
        operandKinds: ["var", "var"],
        handler: (e, t) => (0, M.h_set_attr)(e, t),
    });
    h.TABLE_2OP[12] = (0, f.d2)(12, {
        name: "clear_attr",
        operandKinds: ["var", "var"],
        handler: (e, t) => (0, M.h_clear_attr)(e, t),
    });
    h.TABLE_2OP[13] = (0, f.d2)(13, {
        name: "store",
        operandKinds: ["small", "var"],
        handler: (e, t) => (0, ee.h_store)(e, t),
    });
    h.TABLE_2OP[14] = (0, f.d2)(14, {
        name: "insert_obj",
        operandKinds: ["var", "var"],
        handler: (e, t) => (0, M.h_insert_obj)(e, t),
    });
    h.TABLE_2OP[15] = (0, f.d2)(15, {
        name: "loadw",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t, r) => (0, xe.h_loadw)(e, t, r),
    });
    h.TABLE_2OP[16] = (0, f.d2)(16, {
        name: "loadb",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t, r) => (0, xe.h_loadb)(e, t, r),
    });
    h.TABLE_2OP[17] = (0, f.d2)(17, {
        name: "get_prop",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t, r) => (0, ae.h_get_prop)(e, t, r),
    });
    h.TABLE_2OP[18] = (0, f.d2)(18, {
        name: "get_prop_addr",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t, r) => (0, ae.h_get_prop_addr)(e, t, r),
    });
    h.TABLE_2OP[19] = (0, f.d2)(19, {
        name: "get_next_prop",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t, r) => (0, ae.h_get_next_prop)(e, t, r),
    });
    h.TABLE_2OP[20] = (0, f.d2)(20, {
        name: "add",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, se.h_add)(e, t),
    });
    h.TABLE_2OP[21] = (0, f.d2)(21, {
        name: "sub",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, se.h_sub)(e, t),
    });
    h.TABLE_2OP[22] = (0, f.d2)(22, {
        name: "mul",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, se.h_mul)(e, t),
    });
    h.TABLE_2OP[23] = (0, f.d2)(23, {
        name: "div",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, se.h_div)(e, t),
    });
    h.TABLE_2OP[24] = (0, f.d2)(24, {
        name: "mod",
        operandKinds: ["var", "var"],
        doesStore: !0,
        handler: (e, t) => (0, se.h_mod)(e, t),
    });
    h.TABLE_2OP[25] = (0, f.d2)(25, {
        name: "call_2s",
        minVersion: 4,
        doesStore: !0,
        handler: (e, t, r) => (0, be.h_call_2s)(e, t, r),
    });
    h.TABLE_VAR[224] = (0, f.dv)(224, { name: "call", doesStore: !0, handler: (e, t, r) => (0, be.h_call)(e, t, r) });
    h.TABLE_VAR[225] = (0, f.dv)(225, { name: "storew", handler: (e, t) => (0, xe.h_storew)(e, t) });
    h.TABLE_VAR[226] = (0, f.dv)(226, { name: "storeb", handler: (e, t) => (0, xe.h_storeb)(e, t) });
    h.TABLE_VAR[227] = (0, f.dv)(227, { name: "put_prop", handler: (e, t) => (0, ae.h_put_prop)(e, t) });
    h.TABLE_VAR[228] = (0, f.dv)(228, { name: "sread", handler: (e, t) => (0, O.h_sread)(e, t) });
    h.TABLE_VAR[229] = (0, f.dv)(229, { name: "print_char", handler: (e, t) => (0, O.h_print_char)(e, t) });
    h.TABLE_VAR[230] = (0, f.dv)(230, { name: "print_num", handler: (e, t) => (0, Y.h_print_num)(e, t) });
    h.TABLE_VAR[231] = (0, f.dv)(231, {
        name: "random",
        doesStore: !0,
        handler: (e, t, r) => (0, me.h_random)(e, t, r),
    });
    h.TABLE_VAR[232] = (0, f.dv)(232, { name: "push", handler: (e, t) => (0, me.h_push)(e, t) });
    h.TABLE_VAR[233] = (0, f.dv)(233, { name: "pull", minVersion: 5, handler: (e, t) => (0, me.h_pull)(e, t) });
    h.TABLE_VAR[234] = (0, f.dv)(234, {
        name: "split_window",
        minVersion: 3,
        handler: (e, t) => (0, O.h_split_window)(e, t),
    });
    h.TABLE_VAR[235] = (0, f.dv)(235, {
        name: "set_window",
        minVersion: 3,
        handler: (e, t) => (0, O.h_set_window)(e, t),
    });
    h.TABLE_VAR[236] = (0, f.dv)(236, {
        name: "call_vs2",
        minVersion: 4,
        doesStore: !0,
        handler: (e, t, r) => (0, be.h_call)(e, t, r),
    });
    h.TABLE_VAR[237] = (0, f.dv)(237, {
        name: "erase_window",
        minVersion: 4,
        handler: (e, t) => (0, O.h_erase_window)(e, t),
    });
    h.TABLE_VAR[238] = (0, f.dv)(238, {
        name: "erase_line",
        minVersion: 4,
        handler: (e, t) => (0, O.h_erase_line)(e, t),
    });
    h.TABLE_VAR[239] = (0, f.dv)(239, {
        name: "set_cursor",
        minVersion: 4,
        handler: (e, t) => (0, O.h_set_cursor)(e, t),
    });
    h.TABLE_VAR[240] = (0, f.dv)(240, {
        name: "get_cursor",
        minVersion: 4,
        handler: (e, t) => (0, O.h_get_cursor)(e, t),
    });
    h.TABLE_VAR[241] = (0, f.dv)(241, {
        name: "set_text_style",
        minVersion: 4,
        handler: (e, t) => (0, O.h_set_text_style)(e, t),
    });
    h.TABLE_VAR[242] = (0, f.dv)(242, {
        name: "buffer_mode",
        minVersion: 4,
        handler: (e, t) => (0, O.h_buffer_mode)(e, t),
    });
    h.TABLE_VAR[243] = (0, f.dv)(243, {
        name: "output_stream",
        minVersion: 3,
        handler: (e, t) => (0, O.h_output_stream)(e, t),
    });
    h.TABLE_VAR[244] = (0, f.dv)(244, {
        name: "input_stream",
        minVersion: 3,
        handler: (e, t) => (0, O.h_input_stream)(e, t),
    });
    h.TABLE_VAR[245] = (0, f.dv)(245, {
        name: "sound_effect",
        minVersion: 3,
        handler: (e, t) => (0, O.h_sound_effect)(e, t),
    });
    h.TABLE_VAR[246] = (0, f.dv)(246, {
        name: "read_char",
        minVersion: 4,
        doesStore: !0,
        handler: async (e, t, r) => await (0, O.h_read_char)(e, t, r),
    });
    h.TABLE_VAR[248] = (0, f.dv)(248, {
        name: "not",
        minVersion: 5,
        doesStore: !0,
        handler: (e, t) => (0, ie.h_not)(e, t),
    });
    h.TABLE_VAR[30] = (0, f.dv)(30, {
        name: "print_table",
        minVersion: 5,
        handler: (e, t) => (0, O.h_print_table)(e, t),
    });
    h.TABLE_EXT[2] = {
        name: "log_shift",
        kind: "EXT",
        opcode: 2,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_log_shift)(e, t, r),
    };
    h.TABLE_EXT[3] = {
        name: "art_shift",
        kind: "EXT",
        opcode: 3,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_art_shift)(e, t, r),
    };
    h.TABLE_EXT[4] = {
        name: "set_font",
        kind: "EXT",
        opcode: 4,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_set_font)(e, t, r),
    };
    h.TABLE_EXT[9] = {
        name: "save_undo",
        kind: "EXT",
        opcode: 9,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_save_undo)(e, t, r),
    };
    h.TABLE_EXT[10] = {
        name: "restore_undo",
        kind: "EXT",
        opcode: 10,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_restore_undo)(e, t, r),
    };
    h.TABLE_EXT[11] = {
        name: "print_unicode",
        kind: "EXT",
        opcode: 11,
        minVersion: 5,
        handler: (e, t) => (0, X.h_print_unicode)(e, t),
    };
    h.TABLE_EXT[12] = {
        name: "check_unicode",
        kind: "EXT",
        opcode: 12,
        minVersion: 5,
        doesStore: !0,
        handler: (e, t, r) => (0, X.h_check_unicode)(e, t, r),
    };
});
var We = A((Oe) => {
    "use strict";
    Object.defineProperty(Oe, "__esModule", { value: !0 });
    Oe.decodeNext = Hr;
    var ce = He();
    function Hr(e) {
        let t = e._fetchByte(),
            r,
            n = 0,
            o = !1;
        if (t === 190) (r = "EXT"), (n = e._fetchByte());
        else if ((t & 192) === 192) t >= 224 ? ((r = "VAR"), (n = t)) : ((r = "2OP"), (n = t & 31));
        else if ((t & 192) === 128) {
            let c = (t >> 4) & 3;
            (n = t & 15), c === 3 ? (r = "0OP") : (r = "1OP");
        } else (r = "2OP"), (n = t & 31), (o = !0);
        let i = (
            r === "0OP"
                ? ce.TABLE_0OP
                : r === "1OP"
                  ? ce.TABLE_1OP
                  : r === "2OP"
                    ? ce.TABLE_2OP
                    : r === "VAR"
                      ? ce.TABLE_VAR
                      : ce.TABLE_EXT
        )[n];
        if (!i) throw new Error(`Illegal/unknown opcode: ${r} ${n.toString(16)}`);
        let a = [],
            l = [];
        if (o) {
            let c = t & 64 ? "var" : "small",
                u = t & 32 ? "var" : "small",
                _ = e._decodeOperandWithInfo(c),
                m = e._decodeOperandWithInfo(u);
            a.push(_.value, m.value), l.push(_, m);
        } else if (r === "VAR" || r === "EXT" || (r === "2OP" && !o)) {
            let c = e._readOperandTypes(n);
            for (let u of c) {
                if (u === "omit") break;
                let _ = e._decodeOperandWithInfo(u);
                a.push(_.value), l.push(_);
            }
        } else if (r === "1OP" && !i.operandKinds) {
            let c = (t >> 4) & 3,
                u = c === 0 ? "large" : c === 1 ? "small" : "var",
                _ = e._decodeOperandWithInfo(u);
            a.push(_.value), l.push(_);
        } else if (i.operandKinds && i.operandKinds.length)
            for (let c of i.operandKinds) {
                let u = e._decodeOperandWithInfo(c);
                a.push(u.value), l.push(u);
            }
        let d = { desc: i, operands: a, operandInfo: l };
        return (
            i.doesStore && (d.storeTarget = e._fetchByte()), i.doesBranch && (d.branchInfo = e._readBranchOffset()), d
        );
    }
});
var Xe = A((z) => {
    "use strict";
    var Wr =
            (z && z.__createBinding) ||
            (Object.create
                ? function (e, t, r, n) {
                      n === void 0 && (n = r);
                      var o = Object.getOwnPropertyDescriptor(t, r);
                      (!o || ("get" in o ? !t.__esModule : o.writable || o.configurable)) &&
                          (o = {
                              enumerable: !0,
                              get: function () {
                                  return t[r];
                              },
                          }),
                          Object.defineProperty(e, n, o);
                  }
                : function (e, t, r, n) {
                      n === void 0 && (n = r), (e[n] = t[r]);
                  }),
        Xr =
            (z && z.__setModuleDefault) ||
            (Object.create
                ? function (e, t) {
                      Object.defineProperty(e, "default", { enumerable: !0, value: t });
                  }
                : function (e, t) {
                      e.default = t;
                  }),
        $e =
            (z && z.__importStar) ||
            (function () {
                var e = function (t) {
                    return (
                        (e =
                            Object.getOwnPropertyNames ||
                            function (r) {
                                var n = [];
                                for (var o in r) Object.prototype.hasOwnProperty.call(r, o) && (n[n.length] = o);
                                return n;
                            }),
                        e(t)
                    );
                };
                return function (t) {
                    if (t && t.__esModule) return t;
                    var r = {};
                    if (t != null) for (var n = e(t), o = 0; o < n.length; o++) n[o] !== "default" && Wr(r, t, n[o]);
                    return Xr(r, t), r;
                };
            })();
    Object.defineProperty(z, "__esModule", { value: !0 });
    z.ZMachine = void 0;
    var vr = We(),
        Pe = class {
            constructor(t, r) {
                (this.filePath = t),
                    (this.inputOutputDevice = r),
                    (this.pc = 0),
                    (this.header = null),
                    (this.memory = null),
                    (this.stack = []),
                    (this.callStack = []),
                    (this.currentContext = 0),
                    (this.localVariables = []),
                    (this.trace = !1),
                    (this.playerObjectNumber = 0),
                    (this.lastRead = ""),
                    (this.runtime = "unknown"),
                    typeof window < "u" && typeof document < "u" && (this.runtime = "browser"),
                    typeof process < "u" && process.versions?.node && (this.runtime = "node"),
                    this.runtime === "unknown" &&
                        typeof navigator < "u" &&
                        navigator.product === "ReactNative" &&
                        (this.runtime = "react-native");
            }
            async rleBuffer(t) {
                let r = [],
                    n = 0;
                for (; n < t.length; ) {
                    let o = t.readUInt8(n);
                    if (o > 0) r.push(o), n++;
                    else {
                        let s = 0;
                        for (; n < t.length && t.readUInt8(n) === 0 && s < 256; ) s++, n++;
                        r.push(0), r.push(s - 1);
                    }
                }
                return Buffer.from(r);
            }
            async saveData(t) {
                let r = null;
                if (this.runtime === "node") {
                    // XXX Porting
                    // let { readFile: x } = await Promise.resolve().then(() => $e(require("fs/promises")));
                    r = await x(this.filePath);
                }
                if (this.runtime === "browser") {
                    let P = await (await fetch(this.filePath)).arrayBuffer();
                    r = Buffer.from(P);
                }
                if (!r || !this.memory || !this.header) return null;
                let n = this.header.staticMemoryAddress,
                    o = [];
                for (let x = 0; x < n; x++) {
                    let P = r.readUInt8(x),
                        V = this.memory.readUInt8(x);
                    o.push(P ^ V);
                }
                let s = Buffer.from(o),
                    i = await this.rleBuffer(s),
                    a = Buffer.from("CMem", "ascii"),
                    l = Buffer.alloc(4);
                l.writeUInt32BE(i.length, 0);
                let d = Buffer.concat([a, l, i]),
                    c = [],
                    u = this.header.version <= 5 || this.header.version >= 7,
                    _ = u ? [1, 1, 1, 1] : [];
                console.log(`
=== SAVE: Parsing callStack (length=${this.callStack.length}) ===`),
                    console.log(`Current PC: 0x${t.toString(16)}`),
                    console.log(
                        `Current localVariables (${this.localVariables.length}): [${this.localVariables.map((x) => "0x" + x.toString(16)).join(", ")}]`
                    );
                let m = [],
                    p = this.callStack.length;
                for (; p > 0 && !(p < 2); ) {
                    let x = this.callStack[p - 1],
                        P = this.callStack[p - 2];
                    if ((x !== 0 && x !== 1) || P < 0 || P > 15) {
                        this.trace &&
                            console.error(`saveData: Invalid frame marker=${x} or localCount=${P} at idx=${p}`);
                        break;
                    }
                    p -= 2;
                    let V = [];
                    for (let L = 0; L < P; L++) {
                        if (p <= 0) {
                            console.error(`saveData: Ran out of callStack while reading locals at idx=${p}`);
                            break;
                        }
                        V.unshift(this.callStack[p - 1]), p--;
                    }
                    let N;
                    if (x === 1) {
                        if (p <= 0) {
                            console.error(`saveData: Ran out of callStack while reading storeVar at idx=${p}`);
                            break;
                        }
                        (N = this.callStack[p - 1]), p--;
                    }
                    if (p <= 0) {
                        console.error(`saveData: Ran out of callStack while reading returnPC at idx=${p}`);
                        break;
                    }
                    let q = this.callStack[p - 1];
                    p--,
                        m.unshift({ returnPC: q, storeVar: N, locals: V }),
                        console.log(
                            `CallStackEntry[${m.length - 1}]: returnPC=0x${q.toString(16)}, storeVar=${N}, locals(${V.length})=[${V.map((L) => "0x" + L.toString(16)).join(", ")}]`
                        );
                }
                console.log(`
Total callStackEntries: ${m.length}
`);
                let g = [];
                for (let x = 0; x < m.length; x++) {
                    let P = m[x],
                        V = x + 1 < m.length ? m[x + 1] : null,
                        N = V ? V.locals : this.localVariables,
                        q = x === m.length - 1;
                    g.push({
                        returnPC: P.returnPC,
                        storeVar: P.storeVar,
                        locals: N,
                        evalStack: q ? [...this.stack] : [],
                        argsMask: 0,
                    });
                }
                if (u) {
                    c.push(0, 0, 0),
                        c.push(0),
                        c.push(0),
                        c.push(0),
                        c.push((_.length >> 8) & 255),
                        c.push(_.length & 255);
                    for (let x of _) c.push((x >> 8) & 255), c.push(x & 255);
                }
                for (let x of g) {
                    c.push((x.returnPC >> 16) & 255), c.push((x.returnPC >> 8) & 255), c.push(x.returnPC & 255);
                    let P = x.locals.length & 15,
                        N = ((x.storeVar === void 0 ? 1 : 0) << 4) | P;
                    c.push(N), c.push(x.storeVar ?? 0), c.push(x.argsMask);
                    let q = x.evalStack.length;
                    c.push((q >> 8) & 255), c.push(q & 255);
                    for (let L of x.locals) c.push((L >> 8) & 255), c.push(L & 255);
                    for (let L of x.evalStack) c.push((L >> 8) & 255), c.push(L & 255);
                }
                let B = Buffer.from(c),
                    I = Buffer.from("Stks", "ascii"),
                    E = Buffer.alloc(4);
                E.writeUInt32BE(B.length, 0);
                let y = Buffer.concat([I, E, B]),
                    b = [];
                b.push((this.header.release >> 8) & 255), b.push(this.header.release & 255);
                let w = Buffer.from(this.header.serial.padEnd(6, "\0").slice(0, 6), "ascii");
                for (let x = 0; x < 6; x++) b.push(w[x]);
                b.push((this.header.checksum >> 8) & 255), b.push(this.header.checksum & 255);
                let $ = (t >> 16) & 255,
                    K = (t >> 8) & 255,
                    Ie = t & 255;
                b.push($), b.push(K), b.push(Ie);
                let le = Buffer.from(b),
                    de = Buffer.from("IFhd", "ascii"),
                    te = Buffer.alloc(4);
                te.writeUInt32BE(13, 0);
                let Z = Buffer.concat([de, te, le]),
                    re = le.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]),
                    Ye = i.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]),
                    et = B.length % 2 === 1 ? Buffer.from([0]) : Buffer.from([]),
                    Te = Buffer.concat([Z, re, d, Ye, y, et]),
                    tt = Buffer.from("FORM", "ascii"),
                    rt = Buffer.from("IFZS", "ascii"),
                    Ue = Buffer.alloc(4);
                return Ue.writeUInt32BE(4 + Te.length, 0), Buffer.concat([tt, Ue, rt, Te]);
            }
            async restoreFromSave(t) {
                let r = null;
                if (this.runtime === "node") {
                    let { readFile: y } = await Promise.resolve().then(() => $e(require("fs/promises")));
                    r = await y(this.filePath);
                }
                if (this.runtime === "browser") {
                    let b = await (await fetch(this.filePath)).arrayBuffer();
                    r = Buffer.from(b);
                }
                if (!r || !this.header) return !1;
                let n = 0,
                    o = null,
                    s = null,
                    i = null;
                if (t.length >= 12 && t.toString("ascii", 0, 4) === "FORM") {
                    let y = t.toString("ascii", 8, 12);
                    if (y !== "IFZS") return console.error(`Invalid FORM type: expected IFZS, got ${y}`), !1;
                    n = 12;
                }
                for (; n < t.length && !(n + 8 > t.length); ) {
                    let y = t.toString("ascii", n, n + 4);
                    n += 4;
                    let b = t.readUInt32BE(n);
                    if (((n += 4), n + b > t.length)) break;
                    let w = t.subarray(n, n + b);
                    (n += b),
                        b % 2 === 1 && (n += 1),
                        y === "IFhd" ? (o = w) : y === "CMem" ? (s = w) : y === "Stks" && (i = w);
                }
                if (!o || !s || !i) return console.error("Missing required chunks in save file"), !1;
                let a = o.readUInt16BE(0),
                    l = o.toString("ascii", 2, 8).replace(/\0/g, ""),
                    d = o.readUInt16BE(8),
                    c = (o.readUInt8(10) << 16) | (o.readUInt8(11) << 8) | o.readUInt8(12);
                if (this.header.release !== a || this.header.serial !== l || this.header.checksum !== d)
                    return console.error("Save file does not match current game file"), !1;
                let u = [],
                    _ = 0;
                for (; _ < s.length; ) {
                    let y = s.readUInt8(_);
                    if ((_++, y > 0)) u.push(y);
                    else {
                        if (_ >= s.length) break;
                        let b = s.readUInt8(_);
                        _++;
                        let w = b + 1;
                        for (let $ = 0; $ < w; $++) u.push(0);
                    }
                }
                this.memory = Buffer.from(r);
                let m = this.header.staticMemoryAddress;
                if (u.length > m)
                    return (
                        console.error(
                            `Decompressed save data size (${u.length}) is larger than dynamic memory size (${m})`
                        ),
                        !1
                    );
                if (u.length < m) {
                    let y = m - u.length;
                    this.trace && console.log(`CMem is ${u.length} bytes, padding with ${y} zeros to reach ${m} bytes`);
                    for (let b = 0; b < y; b++) u.push(0);
                }
                for (let y = 0; y < m; y++) {
                    let b = u[y],
                        w = r.readUInt8(y);
                    this.memory.writeUInt8(w ^ b, y);
                }
                let p = 0,
                    g = [];
                for (; p < i.length && !(p + 8 > i.length); ) {
                    let y = (i.readUInt8(p) << 16) | (i.readUInt8(p + 1) << 8) | i.readUInt8(p + 2);
                    p += 3;
                    let b = i.readUInt8(p);
                    p++;
                    let w = (b >> 4) & 1,
                        $ = b & 15,
                        K = i.readUInt8(p);
                    p++;
                    let Ie = i.readUInt8(p);
                    p++;
                    let le = i.readUInt16BE(p);
                    p += 2;
                    let de = [];
                    for (let Z = 0; Z < $ && !(p + 2 > i.length); Z++) {
                        let re = i.readUInt16BE(p);
                        de.push(re), (p += 2);
                    }
                    let te = [];
                    for (let Z = 0; Z < le && !(p + 2 > i.length); Z++) {
                        let re = i.readUInt16BE(p);
                        te.push(re), (p += 2);
                    }
                    g.push({
                        returnPC: y,
                        flags: b,
                        storeVar: w ? void 0 : K,
                        argsMask: Ie,
                        locals: de,
                        evalStack: te,
                    });
                }
                let B = 0,
                    I = [];
                g.length > 0 && g[0].returnPC === 0 && ((I = g[0].evalStack), (B = 1)), (this.callStack = []);
                for (let y = B; y < g.length - 1; y++) {
                    let b = g[y],
                        w = g[y + 1];
                    this.callStack.push(w.returnPC);
                    let $ = w.storeVar !== void 0 ? 1 : 0;
                    $ === 1 && w.storeVar !== void 0 && this.callStack.push(w.storeVar);
                    for (let K of b.locals) this.callStack.push(K);
                    this.callStack.push(b.locals.length), this.callStack.push($);
                }
                if (g.length > B) {
                    let y = g[g.length - 1];
                    (this.localVariables = y.locals), (this.stack = I.length > 0 ? I : y.evalStack), (this.pc = c);
                } else (this.localVariables = []), (this.stack = I.length > 0 ? I : []), (this.pc = c);
                let E = this._readBranchOffset();
                return (
                    this.trace &&
                        (console.log(
                            `Restored from save: PC before branch=${c.toString(16)}, after reading branch=${this.pc.toString(16)}`
                        ),
                        console.log(`Branch info: offset=${E.offset}, branchOnTrue=${E.branchOnTrue}`)),
                    this._applyBranch(E.offset, E.branchOnTrue, !0),
                    this.trace &&
                        console.log(
                            `Restored from save: final PC=${this.pc.toString(16)}, stack=${this.stack.length}, callStack=${this.callStack.length}, frames=${g.length}`
                        ),
                    !0
                );
            }
            async load() {
                if (this.runtime === "node") {
                    let { readFile: o } = await Promise.resolve().then(() => $e(require("fs/promises")));
                    this.memory = await o(this.filePath);
                }
                if (this.runtime === "browser") {
                    let s = await (await fetch(this.filePath)).arrayBuffer();
                    this.memory = Buffer.from(s);
                }
                if (!this.memory) throw new Error("No data loaded.");
                this.parseHeader(this.memory),
                    this.memory &&
                        this.header &&
                        (this.header.version >= 4 && (this.memory.writeUInt8(24, 32), this.memory.writeUInt8(80, 33)),
                        this.header.version >= 5 &&
                            (this.memory.writeUInt16BE(80, 34), this.memory.writeUInt16BE(24, 36)));
                let t = 24;
                this.inputOutputDevice?.rows
                    ? (t = this.inputOutputDevice.rows)
                    : typeof process < "u" && process.stdout?.rows && (t = process.stdout.rows);
                let r = t - 1;
                this.inputOutputDevice &&
                    this.header &&
                    ((this.terminalHeight = t),
                    this.header.version <= 3
                        ? (this.inputOutputDevice.writeString(`\x1B[2;${r}r`),
                          this.inputOutputDevice.writeString("\x1B[2;1H"))
                        : this.inputOutputDevice.writeString(`\x1B[1;${r}r`));
                let n = this.header?.version || 1;
                if (n <= 5) {
                    let o = this.header?.initialProgramCounter || 0;
                    if (n <= 3) this.pc = o;
                    else {
                        this.pc = 0;
                        let s = Math.floor(o / 4),
                            { h_call: i } = _e();
                        i(this, [s], { store: () => {} });
                    }
                } else {
                    this.pc = 0;
                    let o = this.header?.initialProgramCounter || 0,
                        { h_call: s } = _e();
                    s(this, [o], { store: () => {} });
                }
            }
            parseHeader(t) {
                this.header = {
                    version: t.readUInt8(0),
                    release: t.readUInt16BE(2),
                    serial: t.toString("ascii", 18, 24).replace(/\0/g, ""),
                    checksum: t.readUInt16BE(28),
                    initialProgramCounter: t.readUInt16BE(6),
                    dictionaryAddress: t.readUInt16BE(8),
                    objectTableAddress: t.readUInt16BE(10),
                    globalVariablesAddress: t.readUInt16BE(12),
                    staticMemoryAddress: t.readUInt16BE(14),
                    dynamicMemoryAddress: t.readUInt16BE(4),
                    highMemoryAddress: t.readUInt16BE(4),
                    abbreviationsAddress: t.readUInt16BE(24),
                    fileLength: t.readUInt16BE(26) * 2,
                    checksumValid: !1,
                    alphabetIdentifier: t.readUInt16BE(52),
                };
            }
            setPlayerObjectNumber(t) {
                this.playerObjectNumber = t;
            }
            getPlayerObjectNumber() {
                return this.playerObjectNumber;
            }
            setLastRead(t) {
                this.lastRead = t;
            }
            getLastRead() {
                return this.lastRead;
            }
            getGlobalVariableValue(t) {
                if (!this.header) {
                    console.error("Header not loaded");
                    return;
                }
                let r = this.header.globalVariablesAddress + (t - 16) * 2;
                return this.memory?.readUInt16BE(r);
            }
            setGlobalVariableValue(t, r) {
                if (!this.header) {
                    console.error("Header not loaded");
                    return;
                }
                let n = this.header.globalVariablesAddress + (t - 16) * 2;
                return this.memory?.writeUInt16BE(r & 65535, n);
            }
            getLocalVariableValue(t) {
                let r = this.localVariables[t - 1];
                return r !== void 0 ? r : 0;
            }
            setLocalVariableValue(t, r) {
                this.localVariables[t - 1] = r & 65535;
            }
            getVariableValue(t) {
                if (t === 0) return this.stack.pop();
                if (t < 16) return this.getLocalVariableValue(t);
                if (t >= 16) return this.getGlobalVariableValue(t);
            }
            setVariableValue(t, r) {
                if (t === 0) return this.stack.push(r & 65535);
                if (t < 16) return this.setLocalVariableValue(t, r);
                if (t >= 16) return this.setGlobalVariableValue(t, r);
            }
            getHeader() {
                return this.header;
            }
            setTrace(t) {
                this.trace = t;
            }
            async close() {
                this.fileHandle && (await this.fileHandle.close());
            }
            advancePC(t) {
                this.pc += t;
            }
            returnFromRoutine(t) {
                let r = this.callStack.pop();
                this.trace &&
                    console.log(`@return value=${t}, frameMarker=${r}, callStack size=${this.callStack.length}`);
                let n = this.callStack.pop();
                this.localVariables = [];
                for (let i = 0; i < (n || 0); i++) this.localVariables.unshift(this.callStack.pop() || 0);
                let o;
                r === 1 && (o = this.callStack.pop());
                let s = this.callStack.pop();
                s !== void 0 && ((this.pc = s), o !== void 0 && this.setVariableValue(o, t));
            }
            getPropertyDefaultSize() {
                if (!this.header) throw new Error("Header not loaded");
                return this.header.version <= 3 ? 62 : 126;
            }
            getObjectEntrySize() {
                if (!this.header) throw new Error("Header not loaded");
                return this.header.version <= 3 ? 9 : 14;
            }
            getObjectAddress(t) {
                if (!this.header) throw new Error("Header not loaded");
                let r = this.getPropertyDefaultSize(),
                    n = this.getObjectEntrySize();
                return this.header.objectTableAddress + r + (t - 1) * n;
            }
            getObjectName(t) {
                if (!this.memory || !this.header) return "";
                let r = this.getObjectAddress(t),
                    n = this.header.version <= 3 ? 9 : 14,
                    o = this.memory.readUInt16BE(r + n - 2),
                    s = this.pc;
                this.pc = o + 1;
                let i = this.decodeZSCII(!0);
                return (this.pc = s), i.toLowerCase().trim();
            }
            findPlayerParent() {
                if (!this.header || !this.memory || this.playerObjectNumber === 0) return null;
                let { h_get_parent: t } = fe(),
                    r = 0,
                    n = {
                        store: (s) => {
                            r = s;
                        },
                    };
                if ((t(this, [this.playerObjectNumber], n), r === 0)) return null;
                let o = this.getObjectName(r);
                return { objectNumber: r, name: o };
            }
            print(t = !0) {
                let r = this.decodeZSCII(t);
                this.inputOutputDevice ? this.inputOutputDevice.writeString(r) : console.log(r);
            }
            _fetchByte() {
                if (!this.memory) throw new Error("Memory not loaded");
                let t = this.memory.readUInt8(this.pc);
                return this.pc++, t;
            }
            _fetchWord() {
                if (!this.memory) throw new Error("Memory not loaded");
                let t = this.memory.readUInt16BE(this.pc);
                return (this.pc += 2), t;
            }
            _decodeOperand(t) {
                if (t === "large") return this._fetchWord();
                if (t === "small") return this._fetchByte();
                {
                    let r = this._fetchByte(),
                        n = this.getVariableValue(r);
                    return n == null || isNaN(n)
                        ? (console.error(`WARNING: getVariableValue(${r}) returned ${n}`), 0)
                        : n;
                }
            }
            _decodeOperandWithInfo(t) {
                if (t === "large") return { value: this._fetchWord(), type: "large" };
                if (t === "small") return { value: this._fetchByte(), type: "small" };
                {
                    let r = this._fetchByte(),
                        n = this.getVariableValue(r);
                    return n == null || isNaN(n)
                        ? (console.error(`WARNING: getVariableValue(${r}) returned ${n}`),
                          { value: 0, type: "var", varNum: r })
                        : { value: n, type: "var", varNum: r };
                }
            }
            _readOperandTypes(t) {
                let r = this._fetchByte(),
                    n = [],
                    o = !1;
                for (let i = 0; i < 4; i++) {
                    let a = (r >> (6 - i * 2)) & 3;
                    a === 0
                        ? n.push("large")
                        : a === 1
                          ? n.push("small")
                          : a === 2
                            ? n.push("var")
                            : (n.push("omit"), (o = !0));
                }
                if (!o && (t === 236 || t === 250)) {
                    let i = this._fetchByte();
                    for (let a = 0; a < 4; a++) {
                        let l = (i >> (6 - a * 2)) & 3;
                        if (l === 0) n.push("large");
                        else if (l === 1) n.push("small");
                        else if (l === 2) n.push("var");
                        else {
                            n.push("omit");
                            break;
                        }
                    }
                }
                return n;
            }
            _readBranchOffset() {
                if (!this.memory) throw new Error("Memory not loaded");
                let t = this._fetchByte(),
                    r = (t & 128) !== 0,
                    n = (t & 64) !== 0,
                    o,
                    s;
                if (n) (o = t & 63), (s = 1);
                else {
                    let i = this._fetchByte();
                    (o = ((t & 63) << 8) | i), o & 8192 && (o = o - 16384), (s = 2);
                }
                return { offset: o, branchOnTrue: r, branchBytes: s };
            }
            async step() {
                let t = this.pc,
                    r = (0, vr.decodeNext)(this),
                    n = this.pc - t;
                if (this.trace) {
                    let s = `${t.toString(16).padStart(4, "0")}:`;
                    for (let i = 0; i < n; i++)
                        s += ` ${this.memory
                            ?.readUInt8(t + i)
                            .toString(16)
                            .padStart(2, "0")}`;
                    if (((s += ` [${r.desc.name}`), r.operands.length > 0))
                        if (r.operandInfo && r.operandInfo.length > 0) {
                            let i = r.operandInfo.map((a) => {
                                if (a.type === "var" && a.varNum !== void 0) {
                                    let l = a.varNum,
                                        d;
                                    return (
                                        l === 0
                                            ? (d = "SP")
                                            : l < 16
                                              ? (d = `L${l.toString(16).padStart(2, "0")}`)
                                              : (d = `G${(l - 16).toString(16).padStart(2, "0")}`),
                                        `${d}`
                                    );
                                } else return `#${a.value.toString(16)}`;
                            });
                            s += ` ${i.join(",")}`;
                        } else s += ` ${r.operands.map((i) => i.toString(16)).join(",")}`;
                    if (r.storeTarget !== void 0) {
                        let i = r.storeTarget,
                            a;
                        i === 0
                            ? (a = "SP")
                            : i < 16
                              ? (a = `L${i.toString(16).padStart(2, "0")}`)
                              : (a = `G${(i - 16).toString(16).padStart(2, "0")}`),
                            (s += ` -> ${a}`);
                    }
                    r.branchInfo !== void 0 &&
                        (s += ` ?branch(${r.branchInfo.branchOnTrue ? "T" : "F"}:${r.branchInfo.offset})`),
                        (s += "]"),
                        console.log(s);
                }
                let o = {};
                if (r.storeTarget !== void 0) {
                    let s = r.storeTarget;
                    (o.store = (i) => this._storeVariable(s, i)),
                        (this._storeResult = (i) => this._storeVariable(s, i)),
                        (this._currentStoreTarget = s);
                } else (this._storeResult = void 0), (this._currentStoreTarget = void 0);
                if (r.branchInfo !== void 0) {
                    let { offset: s, branchOnTrue: i } = r.branchInfo;
                    (o.branch = (a) => this._applyBranch(s, i, a)), (o.branchInfo = r.branchInfo);
                }
                await r.desc.handler(this, r.operands, o);
            }
            async executeInstruction() {
                return this.step();
            }
            _storeVariable(t, r) {
                this.setVariableValue(t, r);
            }
            _applyBranch(t, r, n) {
                n === r && (t === 0 || t === 1 ? this.returnFromRoutine(t) : (this.pc = this.pc + t - 2));
            }
            decodeZSCII(t = !0) {
                let s = [
                        "abcdefghijklmnopqrstuvwxyz",
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                        ` 
0123456789.,!?_#'"/\\-:()`,
                    ],
                    i = "",
                    a = 0,
                    l = !1,
                    d = !1,
                    c = -1,
                    u = -1;
                if (!this.memory) return i;
                do {
                    let _ = this.memory.readUInt8(this.pc),
                        m = this.memory.readUInt8(this.pc + 1);
                    this.advancePC(2);
                    let p = [(_ & 124) >> 2, ((_ & 3) << 3) | ((m & 224) >> 5), m & 31];
                    _ & 128 && (d = !0);
                    for (let g of p) {
                        if (c === -2) {
                            (u = g), (c = -3);
                            continue;
                        }
                        if (c === -3) {
                            let B = (u << 5) | g;
                            (i += String.fromCharCode(B)), (c = -1), (u = -1), l !== !1 && ((a = l), (l = !1));
                            continue;
                        }
                        if (c > -1 && this.header) {
                            u = g;
                            let B = 32 * c + u,
                                I = this.header.abbreviationsAddress + B * 2,
                                E = this.memory.readUInt16BE(I),
                                y = E * 2;
                            this.trace &&
                                console.log(
                                    `    Abbreviation ${c}:${u} (num=${B}) abbrevAddr=${this.header.abbreviationsAddress} calc: ${this.header.abbreviationsAddress}+${B}*2=${I} (0x${I.toString(16)}) entry=${E.toString(16)} stringAddr=${y.toString(16)}`
                                );
                            let b = this.pc;
                            if (((this.pc = y), this.trace)) {
                                let $ = this.memory.readUInt8(y),
                                    K = this.memory.readUInt8(y + 1);
                                console.log(
                                    `    Reading abbrev string from 0x${y.toString(16)}: bytes ${$.toString(16).padStart(2, "0")} ${K.toString(16).padStart(2, "0")}`
                                );
                            }
                            let w = this.decodeZSCII(!1);
                            this.trace && console.log(`    Abbreviation expanded to: "${w}"`),
                                (i += w),
                                (this.pc = b),
                                (c = -1),
                                (u = -1);
                            continue;
                        }
                        if (g === 0) {
                            i += " ";
                            continue;
                        }
                        if ([1, 2, 3].includes(g))
                            if (t) {
                                c = g - 1;
                                continue;
                            } else continue;
                        if (g === 4) {
                            (l = a), (a = 1);
                            continue;
                        }
                        if (g === 5) {
                            (l = a), (a = 2);
                            continue;
                        }
                        if (g === 6 && a === 2) {
                            this.trace && console.log("    Z-char 6 in A2: ZSCII escape sequence starting"), (c = -2);
                            continue;
                        }
                        if (g >= 6 && g <= 31) {
                            (i += s[a][g - 6]), l !== !1 && ((a = l), (l = !1));
                            continue;
                        }
                    }
                } while (!d);
                return i;
            }
        };
    z.ZMachine = Pe;
});
var ve = A((Se) => {
    "use strict";
    Object.defineProperty(Se, "__esModule", { value: !0 });
    Se.ZMachine = void 0;
    var Gr = Xe();
    Object.defineProperty(Se, "ZMachine", {
        enumerable: !0,
        get: function () {
            return Gr.ZMachine;
        },
    });
});
var Qe = he(ve());
// XXX Porting
// import { createReadline } from ("../readline");
// var Ge = require("../readline");
var Ge = require("../readline"); 
const rl = Ge; //  Ge.createReadline();
// var Ge = require("../readline");
// var Ge = undefined
// var Ge = createReadline; // readline.ts export function createReadline() { let pendingResolve: (value: string) => void = null; return { // Called by your UI when the user submits text _pushInput(value: string) { if (pendingResolve) { pendingResolve(value); pendingResolve = null; } }, // Public API: await readline.question("...") question(prompt: string): Promise<string> { print(prompt); return new Promise(resolve => { pendingResolve = resolve; }); } }; }
var Be = class {
    constructor() {
        this.zmcdnSessionID = "";
        this.lastZMachineOutput = "";
        this.lastZMachineInput = "";
        this.playerLocation = "";
        this.gameIdentifier = "";
        this.illustrationFormat = "";
    }
};
var // XXX: PORTING Je = he(require("crypto")),
    /* Jr = he(require("http")),
    Qr = he(require("https")), */
    we = class e {
        constructor(t) {
            this.ZMCDNText = "";
            this.zm = null;
            this.zmcdnEnabled = !1;
            this.currentPrompt = "";
            this.zmcdnSessionId = "";
            this.lastzmcdnInput = null;
            this.inCursorSaveBlock = !1;
            let r = e.normalizeZmcdnUrl(t);
            r
                ? ((this.zmcdnServer = r), (this.zmcdnEnabled = !0))
                : typeof t == "string" &&
                  t.trim() !== "" &&
                  (console.warn(`Ignoring invalid --zmcdn value: ${String(t)}`), (this.zmcdnEnabled = !1)),
                // XXX Porting
                // https://github.com/bhoriuchi/readline-promise
                /* 
                (this.rl = (0, Ge.createInterface)({
                    input: process.stdin,
                    output: process.stdout,
                    historySize: 100,
                    prompt: "",
                }));
                */
                (this.r1 = Ge);
                // (this.r1 = undefined);
        }
        static getHttpModule(t) {
            // XXX PORTING
            return undefined;
            // XXX return t.protocol === "https:" ? Qr : Jr;
        }
        static normalizeZmcdnUrl(t) {
            if (!t) return;
            let r = t.trim();
            if (
                r &&
                ((r = r.replace(/^(https?)(\/\/)(?!\/)/i, (n, o) => `${o}://`)),
                !(/^[a-z][a-z0-9+\-.]*:\/\//i.test(r) && !/^https?:\/\//i.test(r)))
            ) {
                /^\/\//.test(r) && (r = `http:${r}`), /^https?:\/\//i.test(r) || (r = `http://${r}`);
                try {
                    let n = new URL(r);
                    return /^https?:$/.test(n.protocol) && /^https?\/\//i.test(n.hostname)
                        ? void 0
                        : ((n.hash = ""), n.toString().replace(/\/+$/, ""));
                } catch {
                    return;
                }
            }
        }
        setZMachine(t) {
            this.zm = t;
        }
        async processZMCDNText() {
            if (this.ZMCDNText && this.zmcdnEnabled) {
                this.zmcdnSessionId || (this.zmcdnSessionId = crypto.randomUUID());// XXX: Porting Je.randomUUID());
                let t = new Be();
                if (
                    ((t.zmcdnSessionID = this.zmcdnSessionId),
                    (t.lastZMachineOutput = this.ZMCDNText),
                    (this.ZMCDNText = ""),
                    !this.zm)
                ) {
                    console.error("ZMachine not initialized");
                    return;
                }
                t.lastZMachineInput = this.zm.getLastRead();
                let r = this.zm.getHeader();
                if (!r) {
                    console.error("Unable to read game header");
                    return;
                }
                t.gameIdentifier = `${r.release}.${r.serial}`;
                let n = this.zm.findPlayerParent();
                n ? (t.playerLocation = n.name) : (t.playerLocation = ""),
                    (t.illustrationFormat = "sixel"),
                    (this.lastzmcdnInput = t);
                let o = `${this.zmcdnServer}/illustrateMove`;
                try {
                    let s = await this.postJSON(o, t);
                    /* 
                    process.stdout.write(s),
                        process.stdout.write(`
`),
                        process.stdout.write(t.lastZMachineOutput);
                    */
                } catch (s) {
                    console.error(`Failed to fetch graphics from ${o}: ${s instanceof Error ? s.message : String(s)}`);
                }
            }
            return Promise.resolve();
        }
        postJSON(t, r) {
            return new Promise((n, o) => {
                let s = JSON.stringify(r),
                    i = new URL(t),
                    a = e.getHttpModule(i),
                    l = {
                        protocol: i.protocol,
                        hostname: i.hostname,
                        port: i.port || (i.protocol === "https:" ? 443 : 80),
                        path: `${i.pathname}${i.search}`,
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) },
                        auth: i.username
                            ? `${decodeURIComponent(i.username)}:${decodeURIComponent(i.password)}`
                            : void 0,
                    },
                    d = a.request(l, (c) => {
                        let u = "";
                        c.setEncoding("utf8"),
                            c.on("data", (_) => {
                                u += _;
                            }),
                            c.on("end", () => {
                                if (c.statusCode !== 200) {
                                    console.error(`HTTP ${c.statusCode} error response:`, u),
                                        o(new Error(`HTTP ${c.statusCode}: ${u}`));
                                    return;
                                }
                                n(u);
                            });
                    });
                d.on("error", o), d.write(s), d.end();
            });
        }
        // XXX: PORTING
        /* 
        fetchURL(t) {
            return new Promise((r, n) => {
                let o = new URL(t);
                e.getHttpModule(o)
                    .get(o, (a) => {
                        let l = a.statusCode ?? 0;
                        if (l !== 200) {
                            a.resume(), n(new Error(`HTTP ${l}`));
                            return;
                        }
                        let d = "";
                        a.setEncoding("utf8"),
                            a.on("data", (c) => {
                                d += c;
                            }),
                            a.on("end", () => r(d));
                    })
                    .on("error", n);
            });
        }
        postGenerate(t, r) {
            return new Promise((n, o) => {
                if (!this.zmcdnServer) return o(new Error("ZMCDN not configured"));
                let s = JSON.stringify({ gameID: t, text: r }),
                    i = new URL(`${this.zmcdnServer}/generate`),
                    a = e.getHttpModule(i),
                    l = {
                        protocol: i.protocol,
                        hostname: i.hostname,
                        port: i.port || (i.protocol === "https:" ? 443 : 80),
                        path: `${i.pathname}${i.search}`,
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(s) },
                        auth: i.username
                            ? `${decodeURIComponent(i.username)}:${decodeURIComponent(i.password)}`
                            : void 0,
                    },
                    d = a.request(l, (c) => {
                        let u = c.statusCode ?? 0;
                        if (u >= 400) {
                            c.resume(), o(new Error(`HTTP ${u}`));
                            return;
                        }
                        c.on("data", () => {}), c.on("end", () => n());
                    });
                d.on("error", o), d.write(s), d.end();
            });
        } */
        async readChar() {
            return (
                await this.processZMCDNText(),
                new Promise((t) => {
                    process.stdin.once("keypress", ({ shift: r, name: n }) => {
                        if (!n) {
                            t("\r");
                            return;
                        }
                        if (n.length === 1) {
                            if (r) {
                                t(n.toUpperCase());
                                return;
                            }
                            t(n.toLowerCase());
                            return;
                        }
                        switch (n) {
                            case "return":
                                t("\r");
                                return;
                            case "escape":
                                t("\x1B");
                                return;
                            case "delete":
                            case "backspace":
                                t("\b");
                                return;
                            case "up":
                                t("\x81");
                                return;
                            case "down":
                                t("\x82");
                                return;
                            case "left":
                                t("\x83");
                                return;
                            case "right":
                                t("\x84");
                                return;
                            default:
                                throw new Error(`Unhandled key "${n}"`);
                        }
                    });
                })
            );
        }
        async readLine() {
            return (
                await this.processZMCDNText(),
                this.rl.setPrompt(this.currentPrompt),
                new Promise((t) => {
                    this.rl.prompt(),
                        this.rl.once("line", (r) => {
                            let n = r.trim().match(/^\/trace\s+(on|off)$/);
                            if (n) {
                                let s = n[1];
                                return (
                                    this.zm
                                        ? s === "on"
                                            ? (this.zm.setTrace(!0), console.log("Trace enabled"))
                                            : (this.zm.setTrace(!1), console.log("Trace disabled"))
                                        : console.log("ZMachine not initialized"),
                                    this.readLine().then(t)
                                );
                            }
                            let o = r.trim().match(/^\/zmcdn\s+(.+)$/);
                            if (o) {
                                let s = o[1];
                                return (
                                    s === "off"
                                        ? ((this.zmcdnEnabled = !1), console.log("ZMCDN image fetching disabled"))
                                        : ((this.zmcdnServer = s),
                                          (this.zmcdnEnabled = !0),
                                          console.log(`ZMCDN image fetching enabled with server: ${s}`)),
                                    this.readLine().then(t)
                                );
                            }
                            if (r.trim() === "/redraw") {
                                if (!this.lastzmcdnInput) console.log("No previous ZMCDN input to redraw");
                                else if (!this.zmcdnEnabled) console.log("ZMCDN is disabled");
                                else {
                                    let s = { ...this.lastzmcdnInput, invalidate: !0 },
                                        i = `${this.zmcdnServer}/illustrateMove`;
                                    this.postJSON(i, s)
                                        .then((a) => {
                                            process.stdout.write(a),
                                                process.stdout.write(`
`),
                                                process.stdout.write(s.lastZMachineOutput);
                                        })
                                        .catch((a) => {
                                            console.error(
                                                `Failed to fetch graphics from ${i}: ${a instanceof Error ? a.message : String(a)}`
                                            );
                                        });
                                }
                                return this.readLine().then(t);
                            }
                            t(r);
                        });
                })
            );
        }
        async writeChar(t) {
            this.zmcdnEnabled ? (this.ZMCDNText += t) : process.stdout.write(t),
                t === "\x1B7"
                    ? (this.inCursorSaveBlock = !0)
                    : t === "\x1B8"
                      ? (this.inCursorSaveBlock = !1)
                      : this.inCursorSaveBlock ||
                        (t ===
                        `
`
                            ? (this.currentPrompt = "")
                            : ((this.currentPrompt += t),
                              this.currentPrompt.length > 50 && (this.currentPrompt = this.currentPrompt.slice(-50))));
        }
        async writeString(t) {
            let r = t.includes("\x1B");
            this.zmcdnEnabled && !r ? (this.ZMCDNText += t) : process.stdout.write(t);
            for (let n = 0; n < t.length; n++) {
                let o = t[n];
                if (o === "\x1B" && n + 1 < t.length && t[n + 1] === "7") {
                    (this.inCursorSaveBlock = !0), n++;
                    continue;
                }
                if (o === "\x1B" && n + 1 < t.length && t[n + 1] === "8") {
                    (this.inCursorSaveBlock = !1), n++;
                    continue;
                }
                this.inCursorSaveBlock ||
                    (o ===
                    `
`
                        ? (this.currentPrompt = "")
                        : ((this.currentPrompt += o),
                          this.currentPrompt.length > 50 && (this.currentPrompt = this.currentPrompt.slice(-50))));
            }
        }
        close() {
            this.rl.close();
        }
        get isZmcdnEnabled() {
            return this.zmcdnEnabled;
        }
        get zmcdnServerUrl() {
            return this.zmcdnServer;
        }
    };
async function Yr() {
    let e = process.argv.slice(2),
        t = e.includes("--trace"),
        r,
        n = e.indexOf("--zmcdn");
    n !== -1 && n + 1 < e.length && (r = e[n + 1]);
    let o = e.find((a) => !a.startsWith("--") && a !== r);
    o ||
        (console.error("Error: Z-image file path is required"),
        console.error("Usage: tszm <z-image-file> [--trace] [--zmcdn <server-url>]"),
        process.exit(1)),
        process.on("SIGINT", () => {
            console.log(`

Interrupted by user.`),
                process.exit(0);
        });
    let s = new we(r),
        i = new Qe.ZMachine(o, s);
    t && i.setTrace(!0);
    try {
        for (
            process.stdout.write("\x1B[2J\x1B[H"),
                await i.load(),
                s.setZMachine(i),
                t && (console.log("Header:", i.getHeader()), console.log("Starting execution..."));
            ;

        )
            try {
                await i.executeInstruction();
            } catch (a) {
                throw (
                    ((a instanceof Error && a.message === "QUIT") ||
                        (console.error("Error executing instruction:", a),
                        a instanceof Error && console.error("Stack trace:", a.stack)),
                    a)
                );
            }
    } catch (a) {
        a instanceof Error &&
            a.message === "QUIT" &&
            (console.log(`
Game quit.`),
            s.close(),
            process.exit(0)),
            console.error("Fatal error:", a),
            a instanceof Error && console.error("Stack trace:", a.stack),
            s.close(),
            process.exit(1);
    }
}
Yr().catch((e) => {
    // XXX Porting
    // console.error(e), process.exit(1);
});
//# sourceMappingURL=tszm.map
