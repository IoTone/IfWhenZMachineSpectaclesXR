"""IFWhen Z-Machine app icon (UX2 "1983"): synthwave sun + grid horizon behind a neon CRT with a glowing prompt.

  uv run --with pillow --with numpy make_icon.py      -> Promo/out/icon_1024.png + Lens/icon.png (320x320)
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
S = 1024
C = S / 2
R = 492                                  # badge radius
HORIZON = 640
MAGENTA, PINK, CYAN = (255, 43, 214), (255, 110, 199), (34, 240, 255)
PHOSPHOR = (60, 255, 120)
MONO = os.path.join(ROOT, "Lens/Assets/Application/Fonts/JetBrainsMono-Regular.ttf")


def layer():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def glow(img, radius, strength=1.0):
    g = img.filter(ImageFilter.GaussianBlur(radius))
    if strength != 1.0:
        a = np.asarray(g).astype(np.float32)
        a[..., 3] = np.clip(a[..., 3] * strength, 0, 255)
        g = Image.fromarray(a.astype(np.uint8), "RGBA")
    return g


def sky():
    y = np.linspace(0, 1, S)[:, None]
    stops = [(0.0, (8, 0, 26)), (0.38, (46, 0, 80)), (0.56, (150, 20, 120)), (HORIZON / S, (255, 70, 150))]
    rgb = np.zeros((S, 1, 3))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (y >= a) & (y <= b)
        f = np.clip((y - a) / (b - a), 0, 1)
        for c in range(3):
            rgb[..., c] = np.where(m, ca[c] + (cb[c] - ca[c]) * f, rgb[..., c])
    img = np.broadcast_to(rgb, (S, S, 3)).astype(np.uint8)
    out = Image.fromarray(img, "RGB").convert("RGBA")
    # ground below the horizon
    d = ImageDraw.Draw(out)
    d.rectangle([0, HORIZON, S, S], fill=(14, 0, 28, 255))
    return out


def sun(img):
    r = 270
    cy = HORIZON - 250
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    d = np.sqrt((xx - C) ** 2 + (yy - cy) ** 2)
    f = np.clip((yy - (cy - r)) / (2 * r), 0, 1)[..., None]
    col = np.array([255, 232, 90]) * (1 - f) + np.array([255, 40, 150]) * f
    a = np.clip(r - d + 1, 0, 1)
    yn = (yy - cy) / r
    for i, y0 in enumerate(np.linspace(0.02, 0.8, 6)):
        a[(yn > y0) & (yn < y0 + 0.035 + i * 0.03)] = 0
    a[yy > HORIZON] = 0
    s = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), "RGBA")
    img.alpha_composite(glow(s, 40, 0.8))
    img.alpha_composite(s)


def mountains(img):
    m = layer()
    d = ImageDraw.Draw(m)
    pts = [(0, HORIZON), (90, HORIZON - 70), (170, HORIZON - 30), (250, HORIZON - 110), (330, HORIZON - 50),
           (700, HORIZON - 60), (780, HORIZON - 120), (860, HORIZON - 40), (940, HORIZON - 90), (S, HORIZON - 20), (S, HORIZON)]
    d.polygon(pts, fill=(20, 0, 44, 255))
    d.line(pts[:-1], fill=CYAN + (255,), width=5)
    img.alpha_composite(glow(m, 8, 0.7))
    img.alpha_composite(m)


def grid(img):
    g = layer()
    d = ImageDraw.Draw(g)
    for i in range(-14, 15):
        d.line([(C + i * 14, HORIZON), (C + i * 170, S)], fill=MAGENTA + (255,), width=4)
    for k in range(1, 12):
        y = HORIZON + (S - HORIZON) * (k / 11) ** 2.1
        d.line([(0, y), (S, y)], fill=MAGENTA + (int(90 + 165 * k / 11),), width=4)
    d.line([(0, HORIZON), (S, HORIZON)], fill=(255, 170, 240, 255), width=5)
    img.alpha_composite(glow(g, 10, 0.9))
    img.alpha_composite(g)


def crt(img):
    # monitor body: slightly bulged rounded rect sitting on the horizon
    x0, y0, x1, y1 = 312, 360, 712, 650
    body = layer()
    d = ImageDraw.Draw(body)
    d.rounded_rectangle([x0 - 22, y0 - 22, x1 + 22, y1 + 22], radius=64, fill=(26, 10, 44, 255))
    # stand
    d.polygon([(C - 90, y1 + 22), (C + 90, y1 + 22), (C + 130, y1 + 90), (C - 130, y1 + 90)], fill=(26, 10, 44, 255))
    img.alpha_composite(body)
    # screen glass with phosphor bloom, scanlines and a vignette
    scr = np.zeros((S, S, 4), np.float32)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([x0, y0, x1, y1], radius=46, fill=255)
    inside = np.asarray(m, np.float32) / 255
    u = (xx - C) / ((x1 - x0) / 2)
    v = (yy - (y0 + y1) / 2) / ((y1 - y0) / 2)
    vign = np.clip(1 - 0.55 * (u ** 2 * 0.6 + v ** 2 * 0.9), 0, 1)
    base = np.array([6, 22, 14], np.float32)
    scr[..., :3] = base + np.array([10, 50, 26]) * vign[..., None]
    scan = ((yy.astype(int) % 8) < 3).astype(np.float32)
    scr[..., :3] *= (0.78 + 0.22 * (1 - scan))[..., None]
    scr[..., 3] = inside * 255
    img.alpha_composite(Image.fromarray(np.clip(scr, 0, 255).astype(np.uint8), "RGBA"))
    # screen content: faint text lines + big prompt and cursor
    txt = layer()
    d = ImageDraw.Draw(txt)
    for i, w in enumerate([230, 280, 190]):
        yl = y0 + 48 + i * 36
        d.rounded_rectangle([x0 + 58, yl, x0 + 58 + w, yl + 16], radius=6, fill=PHOSPHOR + (110,))
    f = ImageFont.truetype(MONO, 170)
    d.text((x0 + 40, y1 - 215), ">", font=f, fill=PHOSPHOR + (255,))
    d.rectangle([x0 + 170, y1 - 170, x0 + 250, y1 - 60], fill=PHOSPHOR + (255,))
    img.alpha_composite(glow(txt, 22, 1.2))
    img.alpha_composite(glow(txt, 6, 0.9))
    img.alpha_composite(txt)
    # neon rim + glass highlight
    rim = layer()
    ImageDraw.Draw(rim).rounded_rectangle([x0 - 10, y0 - 10, x1 + 10, y1 + 10], radius=56, outline=PINK + (255,), width=12)
    img.alpha_composite(glow(rim, 22, 1.3))
    img.alpha_composite(rim)
    hl = layer()
    ImageDraw.Draw(hl).rounded_rectangle([x0 + 24, y0 + 12, x0 + 200, y0 + 28], radius=8, fill=(255, 255, 255, 60))
    img.alpha_composite(hl.filter(ImageFilter.GaussianBlur(4)))


def badge():
    img = sky()
    sun(img)
    mountains(img)
    grid(img)
    crt(img)
    # circular badge with a neon ring
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([C - R, C - R, C + R, C + R], fill=255)
    out = layer()
    out.paste(img, (0, 0), mask)
    ring = layer()
    d = ImageDraw.Draw(ring)
    d.ellipse([C - R + 6, C - R + 6, C + R - 6, C + R - 6], outline=CYAN + (255,), width=14)
    d.ellipse([C - R + 26, C - R + 26, C + R - 26, C + R - 26], outline=MAGENTA + (200,), width=5)
    out.alpha_composite(glow(ring, 14, 1.2))
    out.alpha_composite(ring)
    return out


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    big = badge()
    big.save(os.path.join(HERE, "out", "icon_1024.png"))
    big.resize((320, 320), Image.LANCZOS).save(os.path.join(ROOT, "Lens", "icon.png"))
    print("wrote Promo/out/icon_1024.png and Lens/icon.png")
