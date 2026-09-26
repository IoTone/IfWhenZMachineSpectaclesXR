"""IFWhen Z-Machine — LENSFEST / SPECS '24 spot: 30 s, 1983 synthwave, 1280x720 H.264 for YouTube.

  uv run --with pillow --with numpy lensfest.py [out.mp4]          full 30 s video (+ build/lensfest/score.wav)
  PREVIEW=2,5,10 uv run --with pillow --with numpy lensfest.py      dump build/lensfest/preview_<t>.png stills instead

Everything is procedural (PIL + numpy frames piped to ffmpeg, numpy-synthesized score), same approach as promo.py.
The on-screen game text is real output of the Lens' interpreter playing Adventure (Crowther & Woods, public
domain); Mini-Zork is deliberately not shown (dev-only licence, see GAMES-LICENSES.md). Voices are macOS `say`.

Structure is locked to the score: 120 BPM, one bar = 2 s, every scene cut lands on a downbeat.
"""
import math, os, random, subprocess, sys, textwrap, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
BUILD = os.path.join(HERE, "build", "lensfest")
os.makedirs(BUILD, exist_ok=True)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out", "IFWhen_LENSFEST_SPECS24_30s_720p.mp4")
PREVIEW = os.environ.get("PREVIEW")

W, H, FPS, DUR = 1280, 720, 30, 30.0
NF = int(DUR * FPS)
SR = 44100
BPM = 120
BEAT = 60 / BPM
CUTS = [4.0, 8.0, 12.0, 16.0, 20.0, 24.0]

# 1983 palette
INK = (7, 2, 15)
MAGENTA, PINK, CYAN = (255, 43, 214), (255, 110, 199), (34, 240, 255)
SUN_TOP, SUN_BOT = (255, 226, 80), (255, 40, 150)
PHOSPHOR, AMBER, WHITE = (60, 255, 120), (255, 176, 0), (255, 255, 255)
C64_BORDER, C64_BG, C64_TEXT = (136, 126, 203), (64, 49, 141), (170, 160, 240)

SUP = "/System/Library/Fonts/Supplemental/"
MONO_PATH = os.path.join(ROOT, "Lens/Assets/Application/Fonts/JetBrainsMono-Regular.ttf")
_fc = {}


def font(kind, size):
    key = (kind, size)
    if key not in _fc:
        if kind == "mono":
            _fc[key] = ImageFont.truetype(MONO_PATH, size)
        elif kind == "fut":
            _fc[key] = ImageFont.truetype(SUP + "Futura.ttc", size, index=4)     # Condensed ExtraBold
        elif kind == "brush":
            _fc[key] = ImageFont.truetype(SUP + "Brush Script.ttf", size)
        elif kind == "avenir":
            _fc[key] = ImageFont.truetype("/System/Library/Fonts/Avenir Next Condensed.ttc", size, index=2)
    return _fc[key]


def clamp01(x):
    return max(0.0, min(1.0, x))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x, p=3):
    return 1 - (1 - clamp01(x)) ** p


def back_out(x, k=1.7):
    x = clamp01(x) - 1
    return 1 + (k + 1) * x ** 3 + k * x ** 2


def window(t, t0, t1, fin=0.25, fout=0.25):
    return smooth((t - t0) / fin) * (1 - smooth((t - (t1 - fout)) / fout))


# ---------------------------------------------------------------- voices (macOS say) -> timing for the voice scene
def say(name, voice, text, rate):
    path = os.path.join(BUILD, name + ".f32")
    if not os.path.exists(path):
        aiff = os.path.join(BUILD, name + ".aiff")
        subprocess.run(["say", "-v", voice, "-r", str(rate), "-o", aiff, text], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", aiff, "-f", "f32le", "-ac", "1", "-ar", str(SR), path], check=True)
    x = np.fromfile(path, dtype=np.float32)
    loud = np.nonzero(np.abs(x) > 0.01)[0]
    return x[max(0, loud[0] - 400):loud[-1] + 2000]


VOX_CMD = say("vox_cmd", "Samantha", "Unlock grate with keys.", 175)
VOX_NAR = say("vox_nar", "Fred", "You unlock the steel grate.", 165)
VOX_CMD_T = 16.3
VOX_NAR_T = max(17.85, VOX_CMD_T + len(VOX_CMD) / SR + 0.2)
assert VOX_NAR_T + len(VOX_NAR) / SR < 19.95, "narrator line overruns the voice scene"


# ---------------------------------------------------------------- typed terminal text (shared by picture + keyclicks)
class Typer:
    """Terminal output over time: 'out' prints fast like a 1200-baud line, 'cmd' is typed by hand after a prompt."""

    def __init__(self, t0, segs, cols, out_cps=75.0, cmd_cps=13.0, seed=3):
        rnd = random.Random(seed)
        self.chars, self.clicks = [], []
        t = t0
        for i, (kind, text) in enumerate(segs):
            if kind == "pause":
                t += text
                continue
            if self.chars:
                self.chars.append((t, "\n"))
            if kind == "out":
                for line in text.split("\n"):
                    for ln in (textwrap.wrap(line, cols) or [""]):
                        for ch in ln:
                            self.chars.append((t, ch))
                            t += 1 / out_cps
                        self.chars.append((t, "\n"))
                        t += 0.04
                self.chars.pop()
            else:
                self.chars.append((t, ">"))
                self.chars.append((t, " "))
                t += 0.22
                for ch in text:
                    self.chars.append((t, ch))
                    self.clicks.append(t)
                    t += 1 / cmd_cps * rnd.uniform(0.65, 1.35)
        self.end = t

    def visible(self, t):
        return "".join(ch for ct, ch in self.chars if ct <= t)

    def typing(self, t):
        return any(abs(c - t) < 0.12 for c in self.clicks)


ADV_ROAD = ("At End Of Road\nYou are standing at the end of a road before a small brick building. "
            "Around you is a forest.")
ADV_BUILDING = "Inside Building\nYou are inside a building, a well house for a large spring."
ADV_GRATE = ("Outside Grate: You are in a 20-foot depression floored with bare dirt. "
             "Set into the dirt is a strong steel grate mounted in concrete.")

T_OPEN = Typer(0.45, [("out", ADV_ROAD), ("pause", 0.25), ("cmd", "enter building")], cols=44, out_cps=85)
T_ENGINE = Typer(8.35, [("cmd", "enter building"), ("out", ADV_BUILDING), ("pause", 0.2),
                        ("cmd", "take lamp"), ("out", "Taken.")], cols=38, out_cps=110, cmd_cps=16)
T_LOAD = Typer(20.25, [("cmd", 'LOAD "LIBRARY",8,1')], cols=40, cmd_cps=24)
T_URL = Typer(26.1, [("out", "github.com/IoTone/IfWhenZMachineSpectaclesXR")], cols=60, out_cps=40)

STORIES = [("LOST PIG", 2007), ("ADVENTURE", 1976), ("THE DREAMHOLD", 2004), ("CHRISTMINSTER", 1995),
           ("SUVEH NUX", 2007), ("9:05", 2000), ("DELUSIONS", 1996), ("SPIDER AND WEB", 1998),
           ("METAMORPHOSES", 2000), ("SLOUCHING TOWARDS BEDLAM", 2003)]
LIST_T0, LIST_DT = 21.05, 0.075                     # rows print one by one
HILITE_T0, HILITE_DT = 22.0, 0.26                   # highlight bar walks down the list
HILITE_STEPS = 6


# ---------------------------------------------------------------- sprites
def text_mask(text, fnt, stroke=0, pad=24, spacing=0):
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    bb = d.multiline_textbbox((0, 0), text, font=fnt, stroke_width=stroke, spacing=spacing)
    w, h = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).multiline_text((pad - bb[0], pad - bb[1]), text, font=fnt, fill=255, stroke_width=stroke,
                                     stroke_fill=255, spacing=spacing, align="center")
    return m


def shear(img, k):
    w, h = img.size
    extra = int(abs(k) * h)
    return img.transform((w + extra, h), Image.AFFINE, (1, k, -extra if k > 0 else 0, 0, 1, 0), Image.BICUBIC)


def colorize(mask, color):
    spr = Image.new("RGBA", mask.size, color + (0,))
    spr.putalpha(mask)
    return spr


_sc = {}


def chrome(text, size, italic=0.22, outline=PINK):
    """Classic 80s chrome: sky-to-horizon-to-sunset vertical gradient, hard horizon line, neon rim."""
    key = ("chrome", text, size, italic, outline)
    if key in _sc:
        return _sc[key]
    fnt = font("fut", size)
    core = shear(text_mask(text, fnt), -italic)
    rim = shear(text_mask(text, fnt, stroke=max(3, size // 28)), -italic)
    w, h = core.size
    ys = np.linspace(0, 1, h)[:, None]
    stops = [(0.0, (255, 255, 255)), (0.28, (150, 215, 255)), (0.5, (40, 60, 150)), (0.52, (20, 10, 40)),
             (0.56, (255, 120, 60)), (0.8, (255, 210, 150)), (1.0, (255, 255, 230))]
    # gradient spans the glyph band (pad 24 each side)
    band = np.clip((ys * h - 24) / max(1, h - 48), 0, 1)
    grad = np.zeros((h, 1, 3))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        f = np.clip((band - a) / (b - a), 0, 1) * ((band >= a) & (band <= b + 1e-9))
        for c in range(3):
            grad[..., c] = np.where((band >= a) & (band <= b + 1e-9), ca[c] + (cb[c] - ca[c]) * f, grad[..., c])
    grad = np.broadcast_to(grad, (h, w, 3)).astype(np.uint8)
    face = Image.fromarray(grad, "RGB").convert("RGBA")
    face.putalpha(core)
    glow = colorize(rim.filter(ImageFilter.GaussianBlur(size // 10)), outline)
    out = Image.new("RGBA", (w, h))
    out.alpha_composite(glow)
    out.alpha_composite(glow)
    out.alpha_composite(colorize(rim, outline))
    out.alpha_composite(face)
    _sc[key] = out
    return out


def neon(text, kind, size, color, blur=None, italic=0.0, spacing=0):
    key = ("neon", text, kind, size, color, italic)
    if key in _sc:
        return _sc[key]
    fnt = font(kind, size)
    core = text_mask(text, fnt, spacing=spacing, pad=40)
    if italic:
        core = shear(core, -italic)
    blur = blur or max(4, size // 6)
    tube = colorize(core, tuple(min(255, c + 150) for c in color))
    halo = colorize(core.filter(ImageFilter.GaussianBlur(blur)), color)
    halo2 = colorize(core.filter(ImageFilter.GaussianBlur(blur // 3 + 1)), color)
    out = Image.new("RGBA", core.size)
    for s in (halo, halo, halo2, tube):
        out.alpha_composite(s)
    _sc[key] = out
    return out


def flat(text, kind, size, color, spacing=0):
    key = ("flat", text, kind, size, color)
    if key not in _sc:
        _sc[key] = colorize(text_mask(text, font(kind, size), pad=8, spacing=spacing), color)
    return _sc[key]


def place(img, spr, cx, cy, scale=1.0, alpha=1.0, anchor="c"):
    if alpha <= 0.003 or scale <= 0.01:
        return
    if scale != 1.0:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BICUBIC)
    if alpha < 1.0:
        spr = spr.copy()
        spr.putalpha(spr.getchannel("A").point(lambda v: int(v * alpha)))
    x = int(cx - spr.width / 2) if anchor == "c" else int(cx)
    y = int(cy - spr.height / 2)
    if x >= img.width or y >= img.height or x + spr.width <= 0 or y + spr.height <= 0:
        return
    img.alpha_composite(spr, (max(0, x), max(0, y)), (max(0, -x), max(0, -y)))


# ---------------------------------------------------------------- synthwave world
HORIZON = 430


def _sky():
    y = np.linspace(0, 1, HORIZON)[:, None, None]
    top, mid, low = np.array([10, 0, 30]), np.array([60, 0, 90]), np.array([190, 30, 120])
    a = np.where(y < 0.7, top + (mid - top) * (y / 0.7), mid + (low - mid) * ((y - 0.7) / 0.3))
    sky = np.broadcast_to(a, (HORIZON, W, 3)).astype(np.uint8)
    ground = np.zeros((H - HORIZON, W, 3), np.uint8) + np.array([12, 0, 24], np.uint8)
    return Image.fromarray(np.concatenate([sky, ground]), "RGB").convert("RGBA")


def _sun(r=190):
    s = 2 * r + 80
    yy, xx = np.mgrid[0:s, 0:s] - s / 2
    d = np.sqrt(xx ** 2 + yy ** 2)
    f = np.clip((yy + r) / (2 * r), 0, 1)[..., None]
    col = np.array(SUN_TOP) * (1 - f) + np.array(SUN_BOT) * f
    alpha = np.clip(r - d + 1, 0, 1)
    # retro slats on the lower half, thicker toward the horizon
    yn = (yy / r)
    slat = np.ones_like(yn)
    for i, y0 in enumerate(np.linspace(0.05, 0.9, 7)):
        slat[(yn > y0) & (yn < y0 + 0.02 + i * 0.018)] = 0
    alpha = alpha * slat
    glow = np.clip(1 - (d - r) / 60, 0, 1) * (d > r) * 0.45
    rgba = np.dstack([col, np.maximum(alpha, glow) * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def _mountains():
    img = Image.new("RGBA", (W, 200))
    d = ImageDraw.Draw(img)
    rnd = random.Random(7)
    for layer, (col, amp) in enumerate([((120, 40, 200), 150), ((40, 200, 255), 90)]):
        pts, x = [], -20
        while x < W + 40:
            pts.append((x, 200 - rnd.uniform(0.25, 1.0) * amp * (0.4 + 0.6 * abs(math.sin(x / 260 + layer)))))
            x += rnd.uniform(40, 110)
        d.polygon(pts + [(W + 40, 200), (-20, 200)], fill=(18, 0, 36, 255))
        d.line(pts, fill=col + (255,), width=2)
    return img


SKY, SUN, MOUNT = _sky(), _sun(), _mountains()
STARS = [(random.Random(i).uniform(0, W), random.Random(i + 999).uniform(0, HORIZON - 120), random.Random(i + 5).random())
         for i in range(170)]


def world(t, speed=1.0, sun_y=0.0):
    img = SKY.copy()
    d = ImageDraw.Draw(img)
    for x, y, p in STARS:
        tw = 0.5 + 0.5 * math.sin(t * (2 + 3 * p) + p * 20)
        c = int(90 + 165 * tw * p)
        d.point((x, y), fill=(c, c, min(255, c + 40), 255))
        if p > 0.93:
            d.point([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], fill=(c, c, 255, 255))
    place(img, SUN, W / 2, HORIZON - 110 + sun_y)
    img.alpha_composite(MOUNT, (0, HORIZON - 200))
    # perspective grid
    vx = W / 2
    for i in range(-24, 25):
        xb = vx + i * 150
        d.line([(vx + i * 6, HORIZON), (xb, H)], fill=MAGENTA + (255,), width=2)
    phase = (t * speed * 1.6) % 1.0
    for k in range(18):
        z = (k + 1 - phase) * 0.9
        y = HORIZON + 260 / z
        if HORIZON < y < H:
            fade = int(255 * clamp01((y - HORIZON) / 90))
            d.line([(0, y), (W, y)], fill=MAGENTA[:2] + (MAGENTA[2],) + (fade,), width=2)
    d.line([(0, HORIZON), (W, HORIZON)], fill=(255, 150, 240, 255), width=2)
    return img


def tunnel(img, t, t0, alpha):
    """The Lens' own splash: ASCII rings (SplashTunnel.ts RING_CHARS) rushing outward."""
    if alpha <= 0:
        return
    chars = " .:-=+*#%@"
    cols, rows = 58, 21
    cx, cy = (cols - 1) / 2, (rows - 1) / 2
    ph = int((t - t0) * 14)
    fnt = font("mono", 30)
    layer = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(layer)
    for r in range(rows):
        for c in range(cols):
            ring = max(abs(c - cx) / 2.0, abs(r - cy))
            ch = chars[(int(ring) - ph) % len(chars)]
            if ch != " ":
                k = ring / max(cx / 2, cy)
                col = tuple(int(CYAN[i] * (1 - k) + MAGENTA[i] * k) for i in range(3))
                d.text((W / 2 + (c - cx) * 22 - 7, H / 2 + (r - cy) * 34 - 17), ch, font=fnt, fill=col + (int(255 * alpha),))
    img.alpha_composite(layer)


# ---------------------------------------------------------------- post: bloom, RGB split, scanlines, barrel, glitch
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
_u, _v = (xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)
_r2 = _u ** 2 * 0.75 + _v ** 2 * 0.6
_k = 0.045
_s = 1 / (1 + _k * 0.5)
MAPX = np.clip(((_u * (1 + _k * _r2) * _s) * (W / 2) + W / 2), -1, W).astype(np.int32)
MAPY = np.clip(((_v * (1 + _k * _r2) * _s) * (H / 2) + H / 2), -1, H).astype(np.int32)
OUTSIDE = (MAPX < 0) | (MAPX >= W) | (MAPY < 0) | (MAPY >= H)
MAPX, MAPY = np.clip(MAPX, 0, W - 1), np.clip(MAPY, 0, H - 1)
SCAN = np.where((np.arange(H) % 3) == 2, 0.70, 1.0).astype(np.float32)[:, None, None]
VIG = (1 - 0.38 * np.clip(_u ** 2 * 0.7 + _v ** 2 - 0.3, 0, 1.2))[..., None].astype(np.float32)


def glitch_amt(t):
    return max([0.0] + [clamp01(1 - abs(t - c) / 0.12) for c in CUTS])


def post(img, t, extra_glitch=0.0, bloom=1.0):
    rgb = img.convert("RGB")
    small = rgb.resize((320, 180), Image.BILINEAR)
    b1 = np.asarray(small.filter(ImageFilter.GaussianBlur(3)).resize((W, H), Image.BILINEAR), np.float32)
    b2 = np.asarray(small.filter(ImageFilter.GaussianBlur(10)).resize((W, H), Image.BILINEAR), np.float32)
    a = np.asarray(rgb, np.float32)
    a = a + bloom * (0.25 * b1 + 0.42 * b2)
    g = max(glitch_amt(t), extra_glitch)
    rnd = np.random.default_rng(int(t * FPS) + 11)
    sh = 2 + int(14 * g)
    a[..., 0] = np.roll(a[..., 0], sh, axis=1)
    a[..., 2] = np.roll(a[..., 2], -sh, axis=1)
    if g > 0:
        for _ in range(int(3 + 10 * g)):
            y0 = rnd.integers(0, H - 40)
            hh = rnd.integers(4, 40)
            a[y0:y0 + hh] = np.roll(a[y0:y0 + hh], int(rnd.integers(-80, 80) * g), axis=1)
        band = int((t * 900) % (H + 120)) - 60
        lo, hi = max(0, band), min(H, band + 26)
        if hi > lo:
            a[lo:hi] = a[lo:hi] * 0.5 + rnd.uniform(60, 220, (hi - lo, W, 1)) * g
    # gentle VHS tracking wobble always on
    a = a * SCAN * VIG
    a += rnd.normal(0, 3.0, (H, W, 1))
    a = a[MAPY, MAPX]
    a[OUTSIDE] = 0
    return np.clip(a, 0, 255).astype(np.uint8)


def crt_power(arr, t, on_t0, off_t0):
    """Picture-tube switch on (line expands) and off (collapses to a line, then a dot)."""
    if t < on_t0 + 0.35:
        p = ease_out((t - on_t0) / 0.35)
        hh = max(2, int(H * p))
        img = Image.fromarray(arr).resize((W, hh), Image.BILINEAR)
        out = np.zeros_like(arr)
        out[(H - hh) // 2:(H - hh) // 2 + hh] = np.asarray(img)
        if p < 0.5:
            out[(H - 2) // 2:(H + 2) // 2] = 255
        return out
    if t > off_t0:
        p = clamp01((t - off_t0) / 0.45)
        out = np.zeros_like(arr)
        if p < 0.6:
            hh = max(2, int(H * (1 - p / 0.6)))
            img = Image.fromarray(arr).resize((W, hh), Image.BILINEAR)
            out[(H - hh) // 2:(H - hh) // 2 + hh] = np.clip(np.asarray(img, np.float32) * (1 + 2 * p), 0, 255)
        elif p < 1:
            q = (p - 0.6) / 0.4
            ww = max(2, int(W * (1 - q)))
            out[H // 2 - 1:H // 2 + 2, (W - ww) // 2:(W + ww) // 2] = 255
            out[H // 2 - 3:H // 2 + 4, W // 2 - 3:W // 2 + 4] = min(255, int(135 * (1 - q) + 120))
        return out
    return arr


# ---------------------------------------------------------------- shared UI bits
def terminal_image(text, cols, rows, size, color, t, show_cursor=True, w=None, h=None, bg=(4, 16, 8, 235), border=True):
    fnt = font("mono", size)
    cw, lh = size * 0.6, int(size * 1.32)
    w = w or int(cols * cw + 60)
    h = h or int(rows * lh + 50)
    img = Image.new("RGBA", (w, h), bg)
    d = ImageDraw.Draw(img)
    if border:
        d.rounded_rectangle([2, 2, w - 3, h - 3], radius=18, outline=color + (255,), width=3)
    lines = text.split("\n")[-rows:]
    for i, ln in enumerate(lines):
        d.text((30, 25 + i * lh), ln, font=fnt, fill=color + (255,))
    if show_cursor and (t * 2.2) % 1 < 0.6:
        last = lines[-1] if lines else ""
        x0 = 30 + len(last) * cw + 2
        y0 = 25 + (len(lines) - 1) * lh
        d.rectangle([x0, y0 + 3, x0 + cw - 2, y0 + size + 3], fill=color + (255,))
    return img


def find_coeffs(dst, src):
    m = []
    for (x, y), (u, v) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    return np.linalg.solve(np.array(m, float), np.array(src, float).reshape(8))


def warp(img, panel, quad):
    w, h = panel.size
    co = find_coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)])
    img.alpha_composite(panel.transform((W, H), Image.PERSPECTIVE, tuple(co), Image.BICUBIC))


def feature_title(img, t, t0, num, tag, lines, sub, x, y, size=74):
    """'01 · ON-DEVICE' kicker, chrome headline (punches in), avenir subline typed on."""
    a = smooth((t - t0) / 0.2)
    place(img, neon(f"{num} · {tag}", "mono", 24, CYAN, blur=6), x - 12, y, alpha=a, anchor="l")
    for i, ln in enumerate(lines):
        p = back_out((t - t0 - 0.08 - i * 0.1) / 0.35)
        place(img, chrome(ln, size, italic=0.18), x - 28 + (1 - p) * -120, y + 70 + i * (size + 4), alpha=clamp01(p * 1.4), anchor="l")
    n = int(max(0, (t - t0 - 0.45) * 55))
    y2 = y + 70 + len(lines) * (size + 4) + 4
    for j, ln in enumerate(textwrap.wrap(sub, 34)):
        vis = ln[:max(0, n - sum(len(s) + 1 for s in textwrap.wrap(sub, 34)[:j]))]
        if vis:
            place(img, flat(vis, "avenir", 32, (235, 225, 255)), x, y2 + j * 40, anchor="l")


def bug(img, t):
    """Corner station bug, VHS-OSD style."""
    if t < 4.2 or t > 23.9:
        return
    a = smooth((t - 4.2) / 0.3) * 0.9
    spr = neon("LENSFEST · SPECS '24", "mono", 20, PINK, blur=5)
    place(img, spr, W - 80 - spr.width / 2, 62, alpha=a)


# ---------------------------------------------------------------- scenes
def s_open(t):
    img = Image.new("RGBA", (W, H), (2, 8, 4, 255))
    txt = T_OPEN.visible(t)
    term = terminal_image(txt, 44, 8, 34, PHOSPHOR, t, w=1100, h=420, bg=(0, 0, 0, 0), border=False)
    img.alpha_composite(term, (110, 120))
    if 0.35 < t < 2.0:
        if (t * 2) % 1 < 0.75:
            place(img, flat("PLAY", "mono", 30, WHITE), 90, 70, anchor="l")
            ImageDraw.Draw(img).polygon([(190, 58), (190, 82), (210, 70)], fill=WHITE + (255,))
    a1 = window(t, 0.9, 2.55, 0.3, 0.25)
    a2 = window(t, 2.65, 4.0, 0.3, 0.05)
    place(img, neon("1976.  A WORLD MADE OF WORDS.", "fut", 44, AMBER, blur=8), W / 2, 590, alpha=a1)
    place(img, neon("NOW IT'S ALL AROUND YOU.", "fut", 52, PINK, blur=9), W / 2, 590, alpha=a2)
    return img


def s_title(t):
    img = world(t, speed=1.0 + 3.0 * (1 - smooth((t - 4.0) / 1.5)), sun_y=40 * (1 - ease_out((t - 4.0) / 1.2)))
    tunnel(img, t, 4.0, 1 - smooth((t - 4.1) / 1.1))
    p = back_out((t - 4.05) / 0.4)
    place(img, chrome("IFWHEN", 200, italic=0.2), W / 2, 250, scale=0.4 + 0.6 * p + 1.5 * (1 - clamp01(p * 3)) * 0,
          alpha=clamp01((t - 4.05) / 0.08))
    q = ease_out((t - 4.45) / 0.35)
    place(img, neon("Z · MACHINE", "fut", 64, CYAN, blur=10, italic=0.18), W / 2 + (1 - q) * 500, 375, alpha=q)
    tag = "INTERACTIVE FICTION, SPATIAL."
    n = int(max(0, (t - 5.1) * 30))
    if n:
        place(img, flat(tag[:n], "mono", 30, WHITE), W / 2, 455)
    tag2 = "A LENS FOR SNAP SPECTACLES"
    n2 = int(max(0, (t - 6.2) * 30))
    if n2:
        place(img, flat(tag2[:n2], "mono", 26, (255, 200, 240)), W / 2, 500)
    if t < 4.12:
        img.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(255 * (1 - (t - 4.0) / 0.12)))))
    return img


def s_engine(t):
    img = world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 110)))
    feature_title(img, t, 8.05, "01", "ON-DEVICE", ["A REAL", "Z-MACHINE"],
                  "Classic Infocom-format stories, running on the glasses. Fully offline.", 90, 190)
    panel = terminal_image(T_ENGINE.visible(t), 38, 9, 26, PHOSPHOR, t, w=640, h=420)
    bob = math.sin(t * 1.3) * 8
    k = ease_out((t - 8.0) / 0.5)
    ox = (1 - k) * 700
    quad = [(640 + ox, 140 + bob), (1200 + ox, 95 + bob), (1215 + ox, 585 + bob), (650 + ox, 540 + bob)]
    warp(img, panel, quad)
    place(img, flat("Z-CODE  v3 · v5 · v8", "mono", 22, CYAN), 930 + ox, 630 + bob)
    return img


# ------- room art for 'Outside Grate' (Adventure): wireframe -> painted scanline load -> depth layers
def _grate_art():
    back, mid, front = [], [], []
    back.append(dict(kind="poly", pts=[(0, 0), (640, 0), (640, 190), (0, 190)], fill=(60, 30, 110), wire=False))
    back.append(dict(kind="poly", pts=[(0, 175), (80, 120), (170, 150), (260, 100), (360, 142), (450, 95), (560, 135),
                                       (640, 112), (640, 200), (0, 200)], fill=(40, 80, 110)))
    for x, s in [(40, 1.0), (110, 0.8), (520, 0.9), (600, 1.1), (470, 0.7), (170, 0.7)]:
        back.append(dict(kind="poly", pts=[(x, 195 - 90 * s), (x - 30 * s, 200), (x + 30 * s, 200)], fill=(30, 110, 70)))
    mid.append(dict(kind="poly", pts=[(0, 195), (640, 195), (640, 400), (0, 400)], fill=(120, 85, 55)))
    ell = [(320 + 260 * math.cos(a), 305 + 78 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 28)]
    mid.append(dict(kind="poly", pts=ell, fill=(85, 58, 38)))
    mid.append(dict(kind="line", pts=[(640, 215), (560, 232), (480, 250), (420, 268), (380, 280)], fill=(90, 120, 150), width=7))
    front.append(dict(kind="poly", pts=[(210, 262), (430, 262), (462, 336), (178, 336)], fill=(160, 160, 165)))
    g = [(232, 272), (408, 272), (432, 326), (208, 326)]
    front.append(dict(kind="poly", pts=g, fill=(25, 25, 30)))
    for i in range(1, 7):
        f = i / 7
        front.append(dict(kind="line", pts=[(g[0][0] + (g[1][0] - g[0][0]) * f, 272), (g[3][0] + (g[2][0] - g[3][0]) * f, 326)],
                          fill=(190, 195, 205), width=4))
    for f in (0.33, 0.66):
        y = 272 + 54 * f
        front.append(dict(kind="line", pts=[(232 - 24 * f, y), (408 + 24 * f, y)], fill=(190, 195, 205), width=4))
    for x, y, r in [(120, 360, 16), (520, 368, 20), (90, 300, 10), (560, 300, 12)]:
        front.append(dict(kind="poly", pts=[(x - r, y), (x - r / 2, y - r * 0.8), (x + r / 2, y - r), (x + r, y)], fill=(130, 120, 110)))
    return [back, mid, front]


ART = _grate_art()
AW, AH = 640, 400


def draw_layer(elems, mode, progress=1.0, segs_before=0, total_segs=1):
    img = Image.new("RGBA", (AW, AH))
    d = ImageDraw.Draw(img)
    seg_i = segs_before
    for e in elems:
        pts = e["pts"]
        if mode == "fill":
            if e["kind"] == "poly":
                d.polygon(pts, fill=e["fill"] + (255,))
            else:
                d.line(pts, fill=e["fill"] + (255,), width=e.get("width", 3), joint="curve")
            continue
        if not e.get("wire", True):
            continue
        loop = pts + [pts[0]] if e["kind"] == "poly" else pts
        for a, b in zip(loop, loop[1:]):
            f = progress * total_segs - seg_i
            seg_i += 1
            if f <= 0:
                continue
            f = min(1.0, f)
            d.line([a, (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)], fill=CYAN + (255,), width=2)
    return img, seg_i


def _count_segs():
    n = []
    for L in ART:
        c = 0
        for e in L:
            if e.get("wire", True):
                c += len(e["pts"]) if e["kind"] == "poly" else len(e["pts"]) - 1
        n.append(c)
    return n


SEGS = _count_segs()
TOTAL_SEGS = sum(SEGS)
DITHER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16


def room_art(t, t0):
    """Stage 1 wire (t0..+1.3), stage 2 painted scanline load (..+2.3), stage 3 spatialized parallax."""
    wire_p = clamp01((t - t0) / 1.2)
    paint_p = clamp01((t - t0 - 1.25) / 1.0)
    spat_p = smooth((t - t0 - 2.35) / 0.5)
    canvas = Image.new("RGBA", (AW + 120, AH + 80))
    before = 0
    for li, L in enumerate(ART):
        wire, before = draw_layer(L, "wire", wire_p, before, TOTAL_SEGS)
        if paint_p > 0:
            filled, _ = draw_layer(L, "fill")
            fa = np.asarray(filled).astype(np.float32)
            rows = np.arange(AH)[:, None]
            edge = paint_p * (AH + 40)
            thr = np.clip((edge - rows) / 40, 0, 1)
            dm = np.tile(DITHER, (AH // 4 + 1, AW // 4 + 1))[:AH, :AW]
            keep = (thr > dm)
            fa[..., 3] *= keep
            # keep wire overlay faintly after paint (spatial mesh look)
            wire_alpha = 1.0 - 0.75 * paint_p
            wa = np.asarray(wire).astype(np.float32)
            wa[..., 3] *= wire_alpha
            layer = Image.fromarray(fa.astype(np.uint8), "RGBA")
            layer.alpha_composite(Image.fromarray(wa.astype(np.uint8), "RGBA"))
        else:
            layer = wire
        depth = li - 1                                       # back -1, mid 0, front +1
        dx = spat_p * depth * 34 * math.sin((t - t0) * 2.1)
        dy = spat_p * depth * 10 * math.cos((t - t0) * 1.7)
        sc = 1.0 + spat_p * 0.05 * depth
        if sc != 1.0:
            layer = layer.resize((int(AW * sc), int(AH * sc)), Image.BICUBIC)
        canvas.alpha_composite(layer, (int(60 + dx - (layer.width - AW) / 2), int(40 + dy - (layer.height - AH) / 2)))
    if spat_p > 0:
        # depth-scan sweep
        d = ImageDraw.Draw(canvas)
        sy = 40 + ((t - t0 - 2.35) * 260) % AH
        d.line([(60, sy), (60 + AW, sy)], fill=CYAN + (int(200 * spat_p),), width=2)
        for x in range(60, 60 + AW, 16):
            d.point((x, sy - 3), fill=WHITE + (int(220 * spat_p),))
    return canvas


def s_art(t):
    img = world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 120)))
    t0 = 12.05
    art = room_art(t, t0)
    k = ease_out((t - 12.0) / 0.45)
    ox = (k - 1) * 800
    d = ImageDraw.Draw(img)
    fx, fy = 50 + ox, 110
    d.rounded_rectangle([fx, fy, fx + art.width + 20, fy + art.height + 20], radius=22, fill=(0, 0, 0, 200),
                        outline=MAGENTA + (255,), width=3)
    img.alpha_composite(art, (int(fx + 10), fy + 10))
    stage = "WIREFRAME" if t < t0 + 1.25 else ("AI ART" if t < t0 + 2.35 else "SPATIAL IMAGE · 3D")
    place(img, neon(stage, "mono", 24, CYAN if stage != "AI ART" else AMBER, blur=6), fx + 30, fy + art.height + 55, anchor="l")
    cap = ADV_GRATE[:int(max(0, (t - 12.5) * 70))]
    for j, ln in enumerate(textwrap.wrap(cap, 62)[:3]):
        place(img, flat(ln, "mono", 18, (200, 255, 210)), fx + 30, fy + art.height + 95 + j * 24, anchor="l")
    feature_title(img, t, 12.15, "02", "GENERATIVE", ["EVERY ROOM,", "ILLUSTRATED"],
                  "AI art for each room, then spatialized into 3D around you.", 790, 170, size=58)
    return img


def vu_levels(t):
    """Speech meter follows the actual voice envelopes."""
    lv = 0.0
    for start, vox in ((VOX_CMD_T, VOX_CMD), (VOX_NAR_T, VOX_NAR)):
        i = int((t - start) * SR)
        if 0 <= i < len(vox):
            seg = vox[max(0, i - 900):i + 900]
            lv = max(lv, float(np.sqrt(np.mean(seg ** 2))) * 6)
    return clamp01(lv)


def s_voice(t):
    img = world(t, speed=0.8)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 120)))
    feature_title(img, t, 16.05, "03", "HANDS-FREE", ["PINCH.", "SPEAK. PLAY."],
                  "Hold to talk your commands. The story reads itself aloud.", 90, 170)
    d = ImageDraw.Draw(img)
    k = ease_out((t - 16.0) / 0.4)
    ox = (1 - k) * 600
    cmd_end = VOX_CMD_T + len(VOX_CMD) / SR
    held = VOX_CMD_T - 0.2 < t < cmd_end + 0.1
    mx, my = 900 + ox, 200
    # hold-to-talk button (MicHoldToTalk) with ripples while held
    for r in range(3):
        if held:
            rr = 70 + ((t * 1.6 + r / 3) % 1) * 90
            d.ellipse([mx - rr, my - rr, mx + rr, my + rr], outline=PINK + (int(200 * (1 - (rr - 70) / 90)),), width=3)
    d.ellipse([mx - 66, my - 66, mx + 66, my + 66], fill=(MAGENTA if held else (70, 20, 90)) + (255,), outline=WHITE + (255,), width=3)
    d.rounded_rectangle([mx - 16, my - 38, mx + 16, my + 12], radius=16, fill=WHITE + (255,))
    d.arc([mx - 30, my - 20, mx + 30, my + 30], 0, 180, fill=WHITE + (255,), width=5)
    d.line([(mx, my + 30), (mx, my + 44)], fill=WHITE + (255,), width=5)
    place(img, flat("HOLD TO TALK" if not held else "LISTENING…", "mono", 22, (255, 220, 250)), mx, my + 100)
    # VU bars
    lv = vu_levels(t)
    for i in range(24):
        bx = 700 + ox + i * 21
        hgt = 6 + lv * 90 * (0.45 + 0.55 * abs(math.sin(i * 1.7 + t * 23 + i * i)))
        for s in range(int(hgt // 8)):
            y = 420 - s * 8
            col = CYAN if s < 6 else (AMBER if s < 9 else MAGENTA)
            d.rectangle([bx, y - 6, bx + 15, y], fill=col + (255,))
    # recognised words stream in as the voice speaks, then the game answers
    words = "unlock grate with keys".split()
    if t > VOX_CMD_T:
        n = min(len(words), int((t - VOX_CMD_T) / max(0.2, (cmd_end - VOX_CMD_T)) * len(words)) + 1)
        place(img, flat("> " + " ".join(words[:n]), "mono", 30, PHOSPHOR), 690 + ox, 480, anchor="l")
    if t > VOX_NAR_T - 0.1:
        reply = "You unlock the steel grate."
        place(img, flat(reply[:int((t - VOX_NAR_T + 0.1) * 40)], "mono", 30, WHITE), 690 + ox, 530, anchor="l")
        a = smooth((t - VOX_NAR_T) / 0.3)
        sx, sy = 700 + ox, 610
        d.polygon([(sx, sy - 10), (sx + 14, sy - 10), (sx + 30, sy - 24), (sx + 30, sy + 24), (sx + 14, sy + 10), (sx, sy + 10)],
                  fill=AMBER + (int(255 * a),))
        for r in range(3):
            rr = 18 + r * 14 + ((t * 2) % 1) * 6
            d.arc([sx + 30 - rr, sy - rr, sx + 30 + rr, sy + rr], -45, 45, fill=AMBER + (int(255 * a * (1 - r * 0.25)),), width=3)
        place(img, flat("NARRATED ALOUD", "mono", 24, AMBER), sx + 90, sy, alpha=a, anchor="l")
    return img


def s_library(t):
    img = Image.new("RGBA", (W, H), C64_BORDER + (255,))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = 110, 70, W - 110, H - 70
    d.rectangle([x0, y0, x1, y1], fill=C64_BG + (255,))
    f = font("mono", 26)
    lh = 32
    lines = ["    **** IFWHEN Z-MACHINE  V0.2 ****", "", " 10 CLASSIC STORIES. FREE. BUILT IN.", "", "READY."]
    for i, ln in enumerate(lines):
        d.text((x0 + 30, y0 + 22 + i * lh), ln, font=f, fill=C64_TEXT)
    load = T_LOAD.visible(t).replace("> ", "")
    ly = y0 + 22 + 5 * lh
    d.text((x0 + 30, ly), load, font=f, fill=C64_TEXT)
    if t < LIST_T0 - 0.1 and (t * 2.5) % 1 < 0.6:
        cx = x0 + 30 + len(load) * 15.6
        d.rectangle([cx, ly + 2, cx + 15, ly + 28], fill=C64_TEXT)
    hl = -1
    if t >= HILITE_T0:
        hl = min(HILITE_STEPS, int((t - HILITE_T0) / HILITE_DT))
    for i, (name, year) in enumerate(STORIES):
        if t < LIST_T0 + i * LIST_DT:
            break
        y = ly + lh + 8 + i * lh
        row = f"{i + 1:>2}  {name:<26}{year}"
        if i == hl:
            d.rectangle([x0 + 22, y - 2, x0 + 30 + d.textlength(row, font=f) + 8, y + lh - 4], fill=C64_TEXT)
            d.text((x0 + 30, y), row, font=f, fill=C64_BG)
        else:
            d.text((x0 + 30, y), row, font=f, fill=C64_TEXT)
    place(img, neon("04 · LIBRARY", "mono", 26, CYAN, blur=6), W - 330, 150, alpha=smooth((t - 20.3) / 0.3))
    p = back_out((t - 20.35) / 0.4)
    place(img, chrome("10 CLASSIC", 70, italic=0.18), W - 290, 250, alpha=clamp01(p * 1.4), scale=0.6 + 0.4 * p)
    place(img, chrome("STORIES", 70, italic=0.18), W - 290, 330, alpha=clamp01(p * 1.4), scale=0.6 + 0.4 * p)
    return img


ICON = None


def icon_disc(r):
    global ICON
    if ICON is None:
        src = Image.open(os.path.join(ROOT, "Lens/icon.png")).convert("RGBA")
        s = min(src.size)
        src = src.crop(((src.width - s) // 2, (src.height - s) // 2, (src.width + s) // 2, (src.height + s) // 2))
        src = src.resize((2 * r, 2 * r), Image.LANCZOS)
        m = Image.new("L", (2 * r, 2 * r), 0)
        ImageDraw.Draw(m).ellipse([10, 10, 2 * r - 10, 2 * r - 10], fill=255)
        src.putalpha(m)
        ICON = src
    return ICON


def s_cta(t):
    img = world(t, speed=0.6, sun_y=-10)
    img.alpha_composite(Image.new("RGBA", (W, H), (8, 0, 20, 70)))
    if t < 24.12:
        img.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(255 * (1 - (t - 24.0) / 0.12)))))
    # neon sign flickers on
    fl = 1.0 if t > 24.75 else (1.0 if int((t - 24.1) * 20) % 3 else 0.15) * clamp01((t - 24.1) * 5)
    place(img, neon("Lensfest", "brush", 120, PINK, blur=16), 520, 110, alpha=fl)
    place(img, chrome("SPECS '24", 70, italic=0.2, outline=CYAN), 860, 120, alpha=smooth((t - 24.5) / 0.25))
    k = back_out((t - 24.3) / 0.5)
    ir = 150
    icon = icon_disc(ir)
    ring = Image.new("RGBA", (2 * ir + 60, 2 * ir + 60))
    rd = ImageDraw.Draw(ring)
    rd.ellipse([22, 22, 2 * ir + 38, 2 * ir + 38], outline=CYAN + (255,), width=6)
    ring = Image.alpha_composite(ring.filter(ImageFilter.GaussianBlur(8)), ring)
    place(img, ring, 300, 400, scale=k, alpha=clamp01(k))
    place(img, icon, 300, 400, scale=k * 0.97, alpha=clamp01(k))
    p = back_out((t - 24.55) / 0.45)
    place(img, chrome("IFWHEN", 150, italic=0.2), 820, 330, scale=0.5 + 0.5 * p, alpha=clamp01(p * 1.5))
    q = ease_out((t - 24.9) / 0.35)
    place(img, neon("Z · MACHINE", "fut", 56, CYAN, blur=9, italic=0.18), 820 + (1 - q) * 300, 430, alpha=q)
    a = smooth((t - 25.4) / 0.3)
    place(img, flat("OPEN SOURCE  ·  FREE TO PLAY", "mono", 30, WHITE), 820, 500, alpha=a)
    place(img, flat(T_URL.visible(t), "mono", 22, (255, 200, 240)), 820, 548)
    if t > 27.4:
        n = int((t - 27.4) * 14)
        prompt = "> PLAY"[:n] + ("_" if (t * 2.2) % 1 < 0.6 else " ")
        place(img, flat(prompt, "mono", 36, PHOSPHOR), 590, 620, anchor="l")
    return img


def frame(t):
    if t < 4.0:
        img, g = s_open(t), 0.0
    elif t < 8.0:
        img, g = s_title(t), 0.0
    elif t < 12.0:
        img, g = s_engine(t), 0.0
    elif t < 16.0:
        img, g = s_art(t), 0.0
    elif t < 20.0:
        img, g = s_voice(t), 0.0
    elif t < 24.0:
        img, g = s_library(t), 0.0
    else:
        img, g = s_cta(t), 0.0
    bug(img, t)
    arr = post(img, t, g, bloom=0.3 if 20.0 <= t < 24.0 else 1.0)
    return crt_power(arr, t, 0.0, 29.3)


# ---------------------------------------------------------------- score: 120 BPM, Am - F - C - G, 15 bars
N = int(DUR * SR)
TT = np.arange(N) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = min(ia, n)
    e[:ia] = np.linspace(0, 1, ia) if ia else e[:ia]
    j = min(n, ia + idd)
    e[ia:j] = np.linspace(1, s, j - ia)
    if ir and n > ir:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def osc(freq, dur, shape="saw", cutoff=4000.0, detune=0.0, pw_odd=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * 2 ** (detune / 1200)
    out = np.zeros(n)
    kmax = int(min(80, 16000 / f))
    for k in range(1, kmax + 1):
        if shape == "square" and k % 2 == 0:
            continue
        amp = (1 / k) / (1 + (k * f / cutoff) ** 4)
        if amp < 1e-4:
            break
        out += amp * np.sin(2 * np.pi * k * f * t + k * 0.3)
    return out


def add(buf, x, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    x = x[:N - i]
    l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    buf[0, i:i + len(x)] += x * gain * l * 1.41
    buf[1, i:i + len(x)] += x * gain * r * 1.41


def noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def conv(x, ir):
    n = 1 << int(math.ceil(math.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[:len(x)]


CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]      # Am F C G
ROOTS = [33, 29, 36, 31]


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.3 * noise(n, 1) * np.exp(-t * 200)


def snare(seed=2):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    nz = fft_filter(noise(n, seed), lo=900, hi=9000) * np.exp(-t * 14)
    return 0.6 * body + 0.9 * nz


def hat(seed, open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return fft_filter(noise(n, seed), lo=7000) * np.exp(-t * (12 if open_ else 70))


def crash(seed=9):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    return fft_filter(noise(n, seed), lo=3500) * np.exp(-t * 1.6)


def tom(freq):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)


def blip(freq=1320, dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * freq * t)) * np.exp(-t * 30) * 0.5


def click(seed):
    n = int(0.018 * SR)
    t = np.arange(n) / SR
    return fft_filter(noise(n, seed), lo=1800, hi=8000) * np.exp(-t * 400)


def zap(seed):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 1800 * np.exp(-t * 14) + 80
    return 0.4 * np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 10) + 0.3 * noise(n, seed) * np.exp(-t * 20)


def build_score():
    mus = np.zeros((2, N))
    drums = np.zeros((2, N))
    send = np.zeros((2, N))             # to big hall reverb
    gated = np.zeros((2, N))            # to gated snare verb
    sfx = np.zeros((2, N))
    bars = int(DUR / 2)
    for b in range(bars):
        t0 = b * 2.0
        ci = b % 4
        # --- pad: detuned saws, filter opens through the intro, huge on the end card
        cut = 900 + 2600 * clamp01(t0 / 6) if b < 12 else 3800
        gain = (0.045 + 0.02 * clamp01(t0 / 4)) * (1.3 if b >= 12 else 1.0)
        dur = 2.0 if b < 14 else 2.2
        if b == 14:
            ci = 0                                             # resolve home on Am for the button
        for m in CHORDS[ci]:
            for det, pan in ((-8, -0.6), (0, 0.0), (8, 0.6)):
                v = osc(mtof(m), dur, "saw", cutoff=cut, detune=det) * adsr(int(dur * SR), 0.25 if b else 1.4, 0.3, 0.85, 0.3)
                add(mus, v, t0, gain, pan)
                add(send, v, t0, gain * 0.8, pan)
        # --- bass: 8th-note octave pulse from the drop
        if 2 <= b < 14:
            r = ROOTS[ci]
            for s in range(8):
                m = r + (12 if s % 2 else 0)
                v = osc(mtof(m), 0.24, "saw", cutoff=700 + 500 * (s % 2)) * adsr(int(0.24 * SR), 0.003, 0.08, 0.6, 0.04)
                add(mus, v, t0 + s * 0.25, 0.22)
        # --- arp: 16ths over the chord, filtered in the intro
        if b < 14:
            tones = CHORDS[ci] + [CHORDS[ci][0] + 12]
            pat = [0, 1, 2, 3, 2, 1, 0, 2] * 2
            for s in range(16):
                m = tones[pat[s]] + 12
                cut_a = 1400 if b < 2 else 3200
                v = osc(mtof(m), 0.12, "square", cutoff=cut_a) * adsr(int(0.12 * SR), 0.002, 0.05, 0.3, 0.03)
                pan = -0.5 if s % 2 else 0.5
                add(mus, v, t0 + s * 0.125, 0.05 if b < 2 else 0.065, pan)
                add(send, v, t0 + s * 0.125, 0.03, pan)
        # --- drums from the drop (bar 2) to bar 14
        if 2 <= b < 14:
            for beat in range(4):
                tb = t0 + beat * 0.5
                add(drums, kick(), tb, 0.6)
                if beat % 2 == 1:
                    add(drums, snare(b * 4 + beat), tb, 0.4)
                    add(gated, snare(b * 4 + beat), tb, 0.8)
                for e in range(4):
                    add(drums, hat(b * 64 + beat * 4 + e, open_=(e == 2)), tb + e * 0.125, 0.12 if e % 2 else 0.2,
                        0.3)
        # tom fill into the end card (bar 11, last beat pair)
        if b == 11:
            for i, (dt, fq) in enumerate([(1.0, 220), (1.125, 200), (1.25, 180), (1.375, 160), (1.5, 140), (1.625, 120),
                                          (1.75, 100), (1.875, 90)]):
                add(drums, tom(fq), t0 + dt, 0.55, -0.5 + i * 0.14)
                add(gated, tom(fq), t0 + dt, 0.4)
    # lead hook from 8 s to 24 s: pulse lead with vibrato + dotted-8th ping-pong echo
    hook = [(0, 76, 1.0), (1.0, 74, 0.5), (1.5, 72, 0.5), (2.0, 72, 1.0), (3.0, 69, 1.0),
            (4.0, 67, 0.5), (4.5, 72, 0.5), (5.0, 76, 1.0), (6.0, 74, 1.5), (7.5, 71, 0.5)]
    lead = np.zeros((2, N))
    for rep in range(2):
        base = 8.0 + rep * 8.0
        for bt, m, ln in hook:
            if rep == 1 and bt >= 6.0:
                m = {74: 79, 71: 76}.get(m, m)
            dur = ln * BEAT * 0.95
            n = int(dur * SR)
            t = np.arange(n) / SR
            f = mtof(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 3, 0, 1))
            ph = 2 * np.pi * np.cumsum(f) / SR
            v = (np.sign(np.sin(ph)) * 0.55 + np.sin(ph) * 0.45)
            v = fft_filter(v, hi=3000) * adsr(n, 0.01, 0.1, 0.8, 0.08)
            add(lead, v, base + bt * BEAT, 0.09)
    echo = np.zeros_like(lead)
    d = int(0.375 * SR)
    for k in range(1, 4):
        g = 0.45 ** k
        src = lead.mean(axis=0)
        ch = k % 2
        echo[ch, d * k:] += src[:-d * k] * g
    mus += lead + echo
    send += (lead + echo) * 0.5
    # impacts on the two big downbeats
    for tb in (4.0, 24.0):
        add(drums, kick(), tb, 1.2)
        add(drums, crash(int(tb)), tb, 0.35)
        add(send, crash(int(tb) + 1), tb, 0.25)
        add(gated, snare(77), tb, 1.0)
    add(drums, crash(40), 28.0, 0.25)
    # --- SFX locked to picture
    for i, c in enumerate(T_OPEN.clicks + T_ENGINE.clicks + T_LOAD.clicks):
        add(sfx, click(i), c, 0.35, random.Random(i).uniform(-0.3, 0.3))
    for i in range(len(STORIES)):
        add(sfx, blip(1760, 0.03), LIST_T0 + i * LIST_DT, 0.12)
    for i in range(HILITE_STEPS + 1):
        add(sfx, blip(1320), HILITE_T0 + i * HILITE_DT, 0.2)
    for i, c in enumerate([3.93, 7.93, 11.93, 15.93, 19.93, 23.93]):
        add(sfx, zap(100 + i), c, 0.22)
    # CRT on/off
    n = int(0.4 * SR)
    tt = np.arange(n) / SR
    add(sfx, np.sin(2 * np.pi * np.cumsum(60 + 400 * tt) / SR) * np.exp(-tt * 6) * 0.6 + 0.2 * noise(n, 5) * np.exp(-tt * 30), 0.0, 0.6)
    add(sfx, np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 5), 29.3, 0.25)
    # reverbs
    rng = np.random.default_rng(3)
    irn = int(2.2 * SR)
    ir_t = np.arange(irn) / SR
    hall = [fft_filter(rng.uniform(-1, 1, irn), hi=6000) * np.exp(-ir_t * 2.4) * 0.03 for _ in range(2)]
    gn = int(0.32 * SR)
    gate = [rng.uniform(-1, 1, gn) * np.linspace(1, 0.8, gn) * 0.05 for _ in range(2)]
    gate[0][-400:] *= np.linspace(1, 0, 400)
    gate[1][-400:] *= np.linspace(1, 0, 400)
    wet = np.stack([conv(send[c], hall[c]) for c in range(2)])
    gwet = np.stack([conv(gated[c], gate[c]) for c in range(2)])
    # voices, and the music ducks under them
    # each voice is levelled to the music bus RMS, so after ducking it sits ~7 dB on top
    body = slice(int(4 * SR), int(28 * SR))
    m_rms = np.sqrt(np.mean((mus + wet + drums + gwet)[:, body] ** 2))
    vox = np.zeros((2, N))
    for clip, t0, pan, shape in ((VOX_CMD, VOX_CMD_T, -0.1, False), (VOX_NAR, VOX_NAR_T, 0.1, True)):
        v = clip.astype(np.float64)
        if shape:
            v = fft_filter(v, lo=180, hi=5000)
        add(vox, v, t0, m_rms / np.sqrt(np.mean(v ** 2)), pan)
    env = np.abs(vox).max(axis=0)
    env = np.convolve(env, np.ones(2205) / 2205, mode="same")
    duck = 1 - 0.55 * np.clip(env * 8, 0, 1)
    music = (mus + wet) * duck + (drums + gwet * 0.9) * (0.6 + 0.4 * duck)
    mix = music + sfx + vox + np.stack([conv(vox[c], hall[c]) * 0.25 for c in range(2)])
    fade = np.ones(N)
    fo = int(1.4 * SR)
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    mix *= fade
    # gain-stage the body of the spot (4-28 s) to about -15 dBFS RMS, then soft-knee the peaks above 0.7
    body = mix[:, int(4 * SR):int(28 * SR)]
    mix *= 10 ** (-15 / 20) / np.sqrt(np.mean(body ** 2))
    over = np.abs(mix) > 0.7
    mix[over] = np.sign(mix[over]) * (0.7 + 0.25 * np.tanh((np.abs(mix[over]) - 0.7) / 0.25))
    path = os.path.join(BUILD, "score.wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype("<i2").tobytes())
    return path


# ---------------------------------------------------------------- render
def render(frame_fn, out, preview=None, tag="lensfest"):
    """Stills (preview="2,5,…") or the full video: frames piped to ffmpeg with the synthesized score."""
    if preview:
        for s in preview.split(","):
            t = float(s)
            path = os.path.join(BUILD, f"{tag}_preview_{t:05.2f}.png")
            Image.fromarray(frame_fn(t)).save(path)
            print("wrote", path)
        return 0
    print(f"[{tag}] synthesizing score…", flush=True)
    score = build_score()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", score, "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", "60", "-bf", "2",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-t", str(DUR), out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(NF):
        p.stdin.write(frame_fn(n / FPS).tobytes())
        if n % 150 == 0:
            print(f"[{tag}] {n}/{NF}", flush=True)
    p.stdin.close()
    return p.wait()


if __name__ == "__main__":
    sys.exit(render(frame, OUT, PREVIEW))
