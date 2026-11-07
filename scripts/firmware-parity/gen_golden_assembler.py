#!/usr/bin/env python3
"""
Generate keystone golden vectors for the first-party Thumb assembler.

  python gen_golden_assembler.py --out src/lib/firmware-patcher/assembler/__fixtures__/keystone-goldens.json

Each vector: {"f": family, "a": asm, "d": address, "r": hex | "ERR" | "NONE", "m": must_support}
  r == "ERR"  : keystone raised KsError
  r == "NONE" : keystone returned no bytes (odd branch targets)
  m           : the family is produced by an upstream call site; the TS encoder MUST match.
No firmware is involved; vectors are generated from instruction templates only.
"""

import argparse
import json
import random

import keystone

ks = keystone.Ks(keystone.KS_ARCH_ARM, keystone.KS_MODE_THUMB)
rng = random.Random(0xB00057)
VECTORS = []


def asm(code, addr):
    try:
        out, _ = ks.asm(code, addr)
        return "NONE" if out is None else bytes(out).hex()
    except Exception:  # noqa: BLE001 - keystone raises KsError
        return "ERR"


def add(family, code, addr=0, must=False, compact=None):
    """compact: (mnemonic, nops) -> TS rebuilds the label sweep program (keeps the fixture small)."""
    v = {"f": family, "a": "" if compact else code, "d": addr, "r": asm(code, addr), "m": must}
    if compact:
        v["c"] = list(compact)
    VECTORS.append(v)


ADDRS = [0, 2, 0x100, 0x102, 0xA010, 0xA012, 0x1C040, 0x1C042]

# --- single instructions ------------------------------------------------------------------
add("nop", "nop", 0, True)
for rd in list(range(0, 8)) + [8, 12]:
    for imm in [0, 1, 2, 5, 63, 64, 127, 128, 150, 188, 189, 255, 256, 300, 350, 511, 4096]:
        add("movs-imm", f"movs r{rd}, #{imm}", 0, rd <= 7 and imm <= 255)
for imm in [-1, -27, -128]:
    add("movs-imm-neg", f"movs r5,#{imm}", 0, False)
add("movs-imm", "movs r1, #0x1", 0, True)
add("movs-imm", "movs r2,#0x1", 0, True)
for rd in range(0, 16):
    for rm in range(0, 16):
        if rd in (13, 15) or rm in (13, 15):
            continue
        add("mov-reg", f"mov r{rd},r{rm}", 0, rd <= 7 and rm <= 7)
        if rd <= 7 and rm <= 7:
            add("movs-reg", f"movs r{rd},r{rm}", 0, True)
add("mov-reg", "MOV R0,R1", 0, True)
add("movs-reg", "MOVS R0, R1", 0, True)
for rn in list(range(0, 8)) + [8, 12]:
    for imm in [0, 1, 5, 30, 45, 90, 100, 188, 254, 255, 256, 300, 4096]:
        add("cmp-imm", f"cmp r{rn},#{imm}", 0, rn <= 7 and imm <= 255)
for rn in range(0, 9):
    for rm in range(0, 9):
        add("cmp-reg", f"cmp r{rn},r{rm}", 0, rn <= 7 and rm <= 7)
add("cmp-reg", "CMP R1,R0", 0, True)
add("cmp-reg", "CMP R0,R1", 0, True)
add("cmp-imm", "cmp r0,#0xff", 0, True)
for rd in range(0, 8):
    for rm in range(0, 8):
        for imm in [1, 2, 3, 31]:
            add("lsls", f"lsls r{rd}, r{rm}, #{imm}", 0, True)
add("lsls", "LSLS R1,R1,#0x1", 0, True)
for rt in range(0, 8):
    for imm in list(range(0, 1032, 4)) + [1, 2, 3, 6, 1022, 1024, -4]:
        add("ldr-pc", f"ldr r{rt},[pc, #{imm}]", 0x1000, rt <= 7 and 0 <= imm <= 1020 and imm % 4 == 0)
add("ldr-pc", "ldr r8,[pc,#4]", 0x1000, False)
for rt in range(0, 8):
    for rn in range(0, 8):
        for imm in [0, 1, 2, 5, 9, 31, 32]:
            add("ldrb", f"ldrb r{rt}, [r{rn}, #{imm}]", 0, imm <= 31)
        add("ldrb", f"ldrb r{rt}, [r{rn}]", 0, True)
for rt in range(0, 8):
    for base in ["r8", "ip", "r1", "r3"]:
        for imm in [0, 2, 5, 6, 4095, 4096]:
            add("ldrb.w", f"ldrb.w r{rt}, [{base}, #{imm}]", 0, imm <= 4095)
for rt in range(0, 8):
    for rn in range(0, 8):
        add("strh", f"strh r{rt},[r{rn}]", 0, True)
        add("strh", f"strh r{rt}, [r{rn}, #0]", 0, True)
        add("strh", f"strh r{rt}, [r{rn}, #62]", 0, True)
for rd in range(0, 8):
    for imm in [0, 1, 3, 7, 255, 256]:
        add("and", f"and r{rd}, r{rd}, #{imm}", 0, imm <= 255)
        add("and", f"and r{rd}, r{(rd + 1) % 8}, #{imm}", 0, imm <= 255)
for rd in range(0, 8):
    for sh in [1, 2, 3]:
        add("add.w", f"add.w r{rd}, r{rd}, r{rd}, lsl #{sh}", 0, True)
for rd in range(0, 8):
    for imm in [0, 1, 15, 150, 250, 255, 256, 350, 0x15E, 0x8000, 4095, 4096, 65535, 65536]:
        add("movw", f"movw r{rd}, #{imm}", 0, imm <= 0xFFFF)
    add("movw", f"movw r{rd}, #0x15e", 0, True)

# --- branches with numeric (absolute) targets --------------------------------------------------
for mn in ["b", "b.w", "bne", "bcs", "ble"]:
    for addr in [0, 0x1C042, 0x10000]:
        for d in list(range(-300, 300, 6)) + list(range(300, 2200, 38)) + list(range(-2200, -300, 46)):
            if addr + d < 0:
                continue
            must = (
                (mn in ("b", "b.w") and -2044 <= d <= 4096)
                or (mn not in ("b", "b.w") and 0 <= d <= 254)
            )
            add("branch-num", f"{mn} {addr + d}", addr, must)
        for d in [-3, -1, 1, 3, 5, 255, 257]:
            if addr + d >= 0:
                add("branch-num-odd", f"{mn} {addr + d}", addr, False)
for mn in ["b", "b.w"]:
    for t in [0x1234, 0x3B20, 0x8000, 0x1C010, 0x20000, 0x1FFFE]:
        for addr in [0xA010, 0xA012, 0x1C040]:
            add("branch-hex", f"{mn} {hex(t)}", addr, True)

# --- branches with labels ----------------------------------------------------------------------
for mn in ["b", "b.w", "bne", "bcs", "beq"]:
    for n in list(range(0, 140, 1)) + [200, 500, 1000, 1030]:
        add("label-fwd", f"{mn} L\n" + "nop\n" * n + "L:\nnop\n", 0x100, mn in ("b", "b.w") or n <= 127)
        add("label-bwd", "L:\n" + "nop\n" * n + f"{mn} L\n", 0x100, mn in ("b", "b.w") or n <= 125)

# --- upstream templates ----------------------------------------------------------------------
for n in [0, 1, 50, 100, 147, 148, 149, 150, 255]:
    add("tpl-mi4-dms", f"\n        MOVS R1, #{n}\n        LSLS R1,R1,#0x1\n        CMP R1,R0\n        BCS 10\n        MOVS R0, R1\n        ", 0, n <= 255)
    add("tpl-ultra4-dms", f"\n        MOVS R1,#{n}\n        LSLS R1,R1,#0x1\n        CMP R0,R1\n        BLE #0xe\n        MOV R0,R1\n        NOP; NOP; NOP; NOP; NOP;\n        ", 0, n <= 255)

MODES = [("ped", 1), ("drive", 2), ("sport", 3)]


def mode_checks(mode_reg, speed_reg, target, speeds):
    chosen = [(m, n) for m, n in MODES if m in speeds]
    code = ""
    for i, (m, n) in enumerate(chosen):
        nxt = f"check_{chosen[i + 1][0]}" if i + 1 < len(chosen) else "default_case"
        code += f"""
            check_{m}:
            cmp {mode_reg}, #{n}
            bne {nxt}
            movw {speed_reg}, #{speeds[m]}
            b {target}
            """
    return code


SUBSETS = [["ped"], ["drive"], ["sport"], ["ped", "drive"], ["ped", "sport"], ["drive", "sport"], ["ped", "drive", "sport"]]


def speeds_for(subset):
    return {m: rng.choice([10, 15, 60, 99, 100, 150, 250, 255, 256, 300, 350]) for m in subset}


# mi5elite
for _ in range(60):
    sub = rng.choice(SUBSETS)
    sp = speeds_for(sub)
    addr = rng.randrange(0x9000, 0x9800, 2)
    r1 = rng.randrange(0, 1020, 4)
    pp = rng.randrange(0x1000, 0x9000, 2)
    dp = rng.randrange(0x1000, 0x9000, 2)
    code = f"ldr r1, [pc, #{r1}]\n" + mode_checks("r0", "r0", hex(pp), sp) + f"""
        default_case:
        ldrb.w r0, [r8, #5]
        b {hex(dp)}
        """
    add("tpl-mi5elite-logic", code, addr, True)
    r0 = rng.randrange(0, 1020, 4)
    tgt = rng.randrange(0x1000, 0x9000, 2)
    add("tpl-mi5elite-hijack", f"\n        ldr r0, [pc, #{r0}]\n        ldrb r0, [r0, #0]\n        b {hex(tgt)}\n        ", rng.randrange(0x100, 0x9000, 2), True)

# leqi padding (mi6 v1, v2, mi6lite)
RELOADS = {
    "mi6-v1": ("\n        ldrb.w r2, [r8, #5]\n        ldrb.w r1, [r8, #2]\n        ", "r1", "r2", "r3"),
    "mi6-v2": ("\n        ldrb.w r0, [ip, #5]\n        ldrb.w r3, [ip, #2]\n        ", "r3", "r0", "r2"),
    "mi6lite": ("\n        ldrb r0, [r1, #5]\n        ldrb r2, [r1, #2]\n        ", "r2", "r0", "r1"),
}
for name, (reload_asm, mode_reg, speed_reg, ptr_reg) in RELOADS.items():
    for _ in range(40):
        sub = rng.choice(SUBSETS)
        sp = speeds_for(sub)
        addr = rng.randrange(0xA000, 0xB000, 2)
        ret = rng.randrange(0x1000, 0x9000, 2)
        code = reload_asm + "\n"
        code += f"and {mode_reg}, {mode_reg}, #3\n"
        code += mode_checks(mode_reg, speed_reg, "store", sp)
        code += f"""
        default_case:
        add.w {speed_reg}, {speed_reg}, {speed_reg}, lsl #2
        lsls {speed_reg}, {speed_reg}, #1
        store:
        ldr {ptr_reg}, [pc, #4]
        strh {speed_reg}, [{ptr_reg}]
        b.w {hex(ret)}
        """
        add(f"tpl-leqi-{name}", code, addr, True)

# mi5plus (literal pool)
for _ in range(40):
    sub = rng.choice(SUBSETS)
    sp = {m: rng.choice([1, 6, 15, 25, 35, 99, 255]) for m in sub}
    chosen = [(m, n) for m, n in MODES if m in sub]
    chk = ""
    for i, (m, n) in enumerate(chosen):
        nxt = f"check_{chosen[i + 1][0]}" if i + 1 < len(chosen) else "default_case"
        chk += f"""
            check_{m}:
            cmp r0, #{n}
            bne {nxt}
            movw r0, #{sp[m]}
            b store
            """
    code = f"""
        ldr r2, ={hex(0x20000218)}
        ldrb r0, [r2]
        and r0, r0, #3
        {chk}
        default_case:
        ldrb r0, [r7, #9]
        store:
        strh r0, [r1]
        b.w {hex(rng.randrange(0x1000, 0x1B000, 2))}
        """
    add("tpl-mi5plus", code, rng.randrange(0x1C000, 0x1D000, 2), True)

# one-off forms used by models
for addr in [0x100, 0x1C0A, 0x4D3C]:
    for n in [10, 40, 120, 130, 700, 2040, 2046, 2048, 2050, 3000]:
        add("tpl-branch-from-to", f"b {n}", 0, n <= 2046)
    add("region-movw-b", f"movw r2, {hex(0x15E)}\nb {hex(addr + 0x30)}", addr, True)
for rt in range(0, 8):
    for imm in range(0, 1021, 4):
        if rng.random() < 0.1:
            add("tpl-ldr-nop", f"ldr r{rt},[pc, #{imm}]", 0, True)
add("tpl-nop-pair", "nop", 0, True)
for reg in (5, 6):
    for v in list(range(0, 256, 17)) + [255, 256, 300, -27, -9]:
        add("tpl-ultra4-mss", f"movs r{reg}, #{v}", 0, 0 <= v <= 255)
for s in [0, 1, 50, 100, 188, 255, 300]:
    add("tpl-es32-mss", f"cmp r1,#{s}", 0, s <= 255)

# literal pool placement
for n in range(0, 6):
    for addr in [0x1C040, 0x1C042]:
        add("pool", "ldr r2, =0x20000218\n" + "nop\n" * n, addr, True)
add("pool-two", "ldr r2, =0x20000218\nldr r3, =0x20000230\nnop", 0x1C040, True)
add("pool-two", "ldr r2, =0x20000218\nldr r3, =0x20000230\nnop", 0x1C042, True)

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
args = ap.parse_args()
with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(
        {
            "generator": "scripts/firmware-parity/gen_golden_assembler.py",
            "keystone": "0.9.2 (KS_ARCH_ARM, KS_MODE_THUMB)",
            "count": len(VECTORS),
            "vectors": VECTORS,
        },
        fh,
        separators=(",", ":"),
    )
print("vectors:", len(VECTORS))
