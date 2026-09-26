"""IFWhen Z-Machine — LENSFEST / SPECS '24 spot v2: the refined UX2 UI, featuring real Spectacles Preview captures.

  uv run --with pillow --with numpy lensfest2.py [out.mp4]
  PREVIEW=9.5,13,14.4,17.2,18.6 uv run --with pillow --with numpy lensfest2.py

Reuses lensfest.py's engine (synthwave world, CRT post, fonts, score at 120 BPM) and its v1 scenes for the
boot, title, library and end card (which now shows the new icon). New scenes on the same bar-aligned cut grid:
  8-12  01 TERMINAL      forest_terminal_deck.png as live footage in a tilted neon frame
  12-16 02 VIEWPORT      dreamhold_wireframe.png paints down into dreamhold_immersive.png (dithered scanline)
  16-20 03 COMMAND DECK  an animated CRT Deck: compass hover, spoken command typed in sync, ⏎, narrator reply
Screenshots live in Promo/assets/screens (copied from the Preview captures).
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import lensfest as L

HERE = os.path.dirname(os.path.abspath(__file__))
SCREENS = os.path.join(HERE, "assets", "screens")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out", "IFWhen_LENSFEST_SPECS24_v2_30s_720p.mp4")
W, H = L.W, L.H
LILAC = (170, 160, 240)

# the v1 engine scene at 8-12 had typing clicks in the score; this cut has none
L.T_ENGINE = L.Typer(8.35, [], cols=38)

_shots = {}


def shot(name):
    if name not in _shots:
        _shots[name] = Image.open(os.path.join(SCREENS, name)).convert("RGBA")
    return _shots[name]


def screen_panel(img_src, h, zoom=1.0, focus=(0.5, 0.45)):
    """Crop (for a slow push-in) and scale a portrait capture to height h, with CRT scanlines."""
    sw, sh = img_src.size
    cw, ch = sw / zoom, sh / zoom
    cx = min(max(focus[0] * sw, cw / 2), sw - cw / 2)
    cy = min(max(focus[1] * sh, ch / 2), sh - ch / 2)
    crop = img_src.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2)))
    w = int(h * sw / sh)
    p = crop.resize((w, h), Image.BICUBIC)
    a = np.asarray(p).astype(np.float32)
    a[..., :3] *= 0.8                                  # the Preview's white room blooms out otherwise
    a[::3, :, :3] *= 0.82
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def rim(size, color, pad=10, radius=26, width=5):
    w, h = size
    r = Image.new("RGBA", (w + 2 * pad, h + 2 * pad))
    ImageDraw.Draw(r).rounded_rectangle([2, 2, w + 2 * pad - 3, h + 2 * pad - 3], radius=radius, outline=color + (255,), width=width)
    out = Image.new("RGBA", r.size)
    out.alpha_composite(r.filter(ImageFilter.GaussianBlur(9)))
    out.alpha_composite(r.filter(ImageFilter.GaussianBlur(3)))
    out.alpha_composite(r)
    return out


def rounded(panel, radius=22):
    m = Image.new("L", panel.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, panel.width - 1, panel.height - 1], radius=radius, fill=255)
    out = panel.copy()
    out.putalpha(Image.fromarray(np.minimum(np.asarray(panel.getchannel("A")), np.asarray(m))))
    return out


def footage(img, t, panel, cx, cy, tilt, t0, label="LIVE · SPECTACLES PREVIEW"):
    """Place a capture as tilted, framed footage (slides in at t0) with a blinking REC label."""
    k = L.ease_out((t - t0) / 0.45)
    bob = math.sin(t * 1.2) * 6
    w, h = panel.size
    ox = (1 - k) * 700 * (1 if cx > W / 2 else -1)
    framed = Image.new("RGBA", (w + 20, h + 20))
    framed.alpha_composite(rim((w, h), L.MAGENTA), (0, 0))
    framed.alpha_composite(rounded(panel), (10, 10))
    fw, fh = framed.size
    sk = tilt * fh
    quad = [(cx - fw / 2 + ox, cy - fh / 2 + bob + sk), (cx + fw / 2 + ox, cy - fh / 2 + bob - sk),
            (cx + fw / 2 + ox, cy + fh / 2 + bob + sk), (cx - fw / 2 + ox, cy + fh / 2 + bob - sk)]
    L.warp(img, framed, quad)
    if (t * 1.6) % 1 < 0.6:
        ImageDraw.Draw(img).ellipse([cx - fw / 2 + ox + 6, cy - fh / 2 - 30 + bob, cx - fw / 2 + ox + 20, cy - fh / 2 - 16 + bob],
                                   fill=(255, 50, 60, 255))
    L.place(img, L.flat(label, "mono", 18, (255, 220, 240)), cx - fw / 2 + ox + 30, cy - fh / 2 - 23 + bob, anchor="l")


# ---------------------------------------------------------------- 8-12: the terminal, live
def s_terminal(t):
    img = L.world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 120)))
    L.feature_title(img, t, 8.05, "01", "TERMINAL", ["SCROLL. PAGE.", "READ ALOUD."],
                    "400 lines of scrollback, — MORE — paging, and every word narrated.", 90, 180, size=64)
    z = 1.0 + 0.18 * L.smooth((t - 8.3) / 3.5)          # push in on the terminal + deck
    panel = screen_panel(shot("forest_terminal_deck.png"), 520, zoom=z, focus=(0.35, 0.5))
    footage(img, t, panel, 905, 405, -0.035, 8.0)
    return img


# ---------------------------------------------------------------- 12-16: sketch -> paint, live
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16


def paint_wipe(a, b, p):
    """Reveal b over a top-down: 4x4 ordered-dither edge in 3 px blocks, bright scanline on the edge."""
    A = np.asarray(a).astype(np.float32)
    B = np.asarray(b).astype(np.float32)
    h, w = A.shape[:2]
    edge = p * (h + 40)
    rows = np.arange(h)[:, None]
    blk = 3
    dm = np.tile(np.kron(BAYER, np.ones((blk, blk))), (h // (4 * blk) + 1, w // (4 * blk) + 1))[:h, :w]
    keep = np.clip((edge - rows) / 40, 0, 1) > dm
    out = np.where(keep[..., None], B, A)
    if 0 < p < 1:
        e = int(edge)
        if 0 <= e < h:
            out[max(0, e - 1):e + 2, :, :3] = [220, 255, 255]
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def s_viewport(t):
    img = L.world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 120)))
    z = 1.0 + 0.12 * L.smooth((t - 12.2) / 3.6)
    wire = screen_panel(shot("dreamhold_wireframe.png"), 560, zoom=z, focus=(0.6, 0.42))
    painted = screen_panel(shot("dreamhold_immersive.png"), 560, zoom=z, focus=(0.6, 0.42))
    p = L.clamp01((t - 13.4) / 1.1)
    panel = paint_wipe(wire, painted, p) if p > 0 else wire
    footage(img, t, panel, 370, 380, 0.035, 12.0)
    stage = "WIREFRAME" if p <= 0 else ("AI ART" if p < 1 else "SPATIAL IMAGE · 3D")
    col = L.CYAN if stage != "AI ART" else L.AMBER
    L.place(img, L.neon(stage, "mono", 22, col, blur=6), 170, 690, anchor="l")
    L.feature_title(img, t, 12.15, "02", "VIEWPORT", ["SKETCH.", "PAINT. 3D."],
                    "Every room is drawn while it generates, painted in, then spatialized.", 700, 180, size=64)
    return img


# ---------------------------------------------------------------- 16-20: the Command Deck
def deck_lines(t, cmd_end):
    submitted = t > cmd_end + 0.15
    speaking = L.VOX_CMD_T < t < cmd_end + 0.15
    lines = [
        ("GAME", "hdr"),
        (" ├ NW    N     NE", None),
        (" │ W     ·     E", None),
        (" │ SW    S     SE", None),
        (" │ UP   DOWN   IN   OUT", None),
        (" ├ LOOK  INVENTORY  WAIT  AGAIN", None),
        (" ├ EXAMINE ▸", None),
        (" ├ UNLOCK " + ("▾" if speaking else "▸"), None),
    ]
    if speaking:
        lines.append((" │   └ GRATE (here)", None))
    lines += [(" ├ OPEN ▸", None), (" ├ MORE VERBS ▸", None)]
    if submitted:
        lines.append(("RECENT  > unlock grate with keys", "hdr"))
    lines += [("SYSTEM", "hdr"), (" ├ NARRATE: ON  EFFECTS: FULL", None)]
    return lines


# hover path before speaking: (time, line index, col, label)
HOPS = [(16.10, 1, 3, "NW"), (16.20, 1, 9, "N"), (16.30, 1, 15, "NE"), (16.40, 5, 3, "LOOK")]


def deck_panel(t):
    fnt = L.font("mono", 24)
    cw, lh = 14.4, 30
    pw, ph = 560, 560
    panel = Image.new("RGBA", (pw, ph))
    bezel = Image.open(os.path.join(L.ROOT, "Lens/Assets/Application/Textures/crt_bezel.png")).convert("RGBA").resize((pw, ph))
    panel.alpha_composite(bezel)
    d = ImageDraw.Draw(panel)
    x0, y0 = 48, 46
    cmd_end = L.VOX_CMD_T + len(L.VOX_CMD) / L.SR
    words = "unlock grate with keys".split()
    n = 0
    if t > L.VOX_CMD_T:
        n = min(len(words), int((t - L.VOX_CMD_T) / max(0.2, cmd_end - L.VOX_CMD_T) * len(words)) + 1)
    submitted = t > cmd_end + 0.15
    compose = "" if submitted else " ".join(words[:n]).upper()
    d.text((x0, y0), "> " + compose + "▒", font=fnt, fill=L.PHOSPHOR)
    enter_flash = cmd_end - 0.05 < t < cmd_end + 0.35
    if enter_flash:
        d.rectangle([x0 + 30 * cw - 3, y0 - 2, x0 + 31 * cw + 3, y0 + 28], fill=LILAC)
        d.text((x0 + 30 * cw, y0), "⏎", font=fnt, fill=(20, 8, 40))
    else:
        d.text((x0 + 30 * cw, y0), "⏎", font=fnt, fill=L.PHOSPHOR)
    d.text((x0 + 27 * cw, y0), "⌫", font=fnt, fill=L.PHOSPHOR)
    d.text((x0, y0 + lh), "─" * 32, font=fnt, fill=LILAC + (130,))
    lines = deck_lines(t, cmd_end)
    hop = None
    for ht, li, col, label in HOPS:
        if t >= ht and t < L.VOX_CMD_T:
            hop = (li, col, label)
    if L.VOX_CMD_T <= t < cmd_end + 0.15:
        hop = (7, 3, "UNLOCK ▾")                        # the spoken verb lights its branch
    for i, (text, kind) in enumerate(lines):
        y = y0 + (i + 2) * lh
        color = L.CYAN if kind == "hdr" else LILAC
        d.text((x0, y), text, font=fnt, fill=color)
        if hop and hop[0] == i:
            li, col, label = hop
            d.rectangle([x0 + col * cw - 3, y - 2, x0 + (col + len(label)) * cw + 3, y + 28], fill=LILAC)
            d.text((x0 + col * cw, y), label, font=fnt, fill=(20, 8, 40))
    # scrollbar
    for k in range(len(lines)):
        ch = "▲" if k == 0 else "▼" if k == len(lines) - 1 else ("█" if 1 <= k <= 5 else "│")
        d.text((x0 + 33 * cw, y0 + (k + 2) * lh), ch, font=fnt, fill=L.CYAN + (200,))
    return panel


def s_deck(t):
    img = L.world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 120)))
    L.feature_title(img, t, 16.05, "03", "COMMAND DECK", ["PICK IT.", "OR SAY IT."],
                    "A CRT command tree of every verb the story knows.", 90, 180, size=64)
    k = L.ease_out((t - 16.0) / 0.4)
    panel = deck_panel(t)
    # lectern: tilted back, so the top recedes (narrower) - like the Lens
    cx, cy = 880 + (1 - k) * 600, 390
    w, h = panel.size
    quad = [(cx - w / 2 + 40, cy - h / 2 + 20), (cx + w / 2 - 40, cy - h / 2 + 20),
            (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)]
    L.warp(img, panel, quad)
    # the story answers, aloud
    if t > L.VOX_NAR_T - 0.1:
        reply = "You unlock the steel grate."
        L.place(img, L.flat(reply[:int((t - L.VOX_NAR_T + 0.1) * 40)], "mono", 26, L.WHITE), 90, 560, anchor="l")
        a = L.smooth((t - L.VOX_NAR_T) / 0.3)
        d = ImageDraw.Draw(img)
        sx, sy = 100, 620
        d.polygon([(sx, sy - 10), (sx + 14, sy - 10), (sx + 30, sy - 24), (sx + 30, sy + 24), (sx + 14, sy + 10), (sx, sy + 10)],
                  fill=L.AMBER + (int(255 * a),))
        for r in range(3):
            rr = 18 + r * 14 + ((t * 2) % 1) * 6
            d.arc([sx + 30 - rr, sy - rr, sx + 30 + rr, sy + rr], -45, 45, fill=L.AMBER + (int(255 * a * (1 - r * 0.25)),), width=3)
        L.place(img, L.flat("NARRATED ALOUD", "mono", 22, L.AMBER), sx + 90, sy, alpha=a, anchor="l")
    elif t > L.VOX_CMD_T:
        L.place(img, L.neon("LISTENING…", "mono", 22, L.PINK, blur=6), 90, 590, anchor="l")
    return img


def frame(t):
    if t < 4.0:
        img = L.s_open(t)
    elif t < 8.0:
        img = L.s_title(t)
    elif t < 12.0:
        img = s_terminal(t)
    elif t < 16.0:
        img = s_viewport(t)
    elif t < 20.0:
        img = s_deck(t)
    elif t < 24.0:
        img = L.s_library(t)
    else:
        img = L.s_cta(t)
    L.bug(img, t)
    arr = L.post(img, t, 0.0, bloom=0.3 if 20.0 <= t < 24.0 else 1.0)
    return L.crt_power(arr, t, 0.0, 29.3)


if __name__ == "__main__":
    sys.exit(L.render(frame, OUT, os.environ.get("PREVIEW"), tag="lensfest2"))
