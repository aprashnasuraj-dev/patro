"""
Image generation.

* OG / social cards (1200x630 PNG) drawn with Pillow + raqm so Devanagari
  shapes correctly. Each card is unique: the moon disc shows the actual
  phase of the festival's tithi, ridgelines are seeded per place, and trek
  cards draw the real altitude profile.
* Inline SVGs for pages: moon phase, altitude profile, day timeline.
"""
from __future__ import annotations

import hashlib
import math
import random
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"

W, H = 1200, 630
INK = (31, 42, 90)          # night-sky indigo  #1F2A5A
INK_DEEP = (17, 23, 54)     # #111736
MARIGOLD = (242, 162, 12)   # #F2A20C
CRIMSON = (200, 16, 46)     # #C8102E
PAPER = (247, 248, 251)     # #F7F8FB
MIST = (167, 177, 214)      # #A7B1D6
GREEN = (46, 125, 91)       # #2E7D5B


@lru_cache(maxsize=32)
def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    # Mukta (Ek Type, SIL OFL): one family for Devanagari and Latin, with real
    # Nepali numerals. Merged from the Fontsource subsets in assets/fonts.
    f = {"bold": "Mukta-800.ttf", "semibold": "Mukta-700.ttf", "medium": "Mukta-600.ttf",
         "regular": "Mukta-500.ttf", "light": "Mukta-400.ttf"}[weight]
    return ImageFont.truetype(str(FONTS / f), size, layout_engine=ImageFont.Layout.RAQM)


def _seed(s: str) -> random.Random:
    return random.Random(int(hashlib.sha1(s.encode()).hexdigest()[:12], 16))


def _ridges(img: Image.Image, seed: str, top: int = 330, layers: int = 4, profile=None):
    """Layered Himalayan ridgelines. If profile (list of 0..1 heights) is given,
    the front ridge follows it (trek altitude profile)."""
    rnd = _seed(seed)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(layers):
        depth = i / max(1, layers - 1)                       # 0 back .. 1 front
        base = top + int(depth * 170)
        amp = 150 - depth * 70
        col = tuple(int(INK_DEEP[c] * (1 - depth) + INK[c] * depth * 0.55) for c in range(3))
        alpha = int(120 + depth * 135)
        pts = [(0, H)]
        if profile and i == layers - 1:
            n = len(profile)
            for k in range(n):
                x = int(k * W / (n - 1))
                pts.append((x, int(H - 60 - profile[k] * 260)))
        else:
            x = 0
            y = base
            while x <= W + 40:
                pts.append((x, y))
                x += rnd.randint(30, 90)
                y = max(top - 120, min(H - 40, base - int(rnd.random() * amp) + rnd.randint(-20, 20)))
        pts.append((W, H))
        d.polygon(pts, fill=col + (alpha,))


def _moon(img: Image.Image, cx: int, cy: int, r: int, tithi: int | None):
    """Draw the moon with the phase of the given tithi (1..30)."""
    d = ImageDraw.Draw(img, "RGBA")
    # glow
    img.alpha_composite(_glow_layer(cx, cy, r))
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 70, 120, 255))
    if tithi is None:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(250, 228, 170, 255))
        return
    elong = (tithi - 0.5) * 12.0
    k = (1 - math.cos(math.radians(elong))) / 2           # illuminated fraction
    waxing = elong < 180
    # draw lit part as polygon: semicircle + elliptical terminator
    pts = []
    steps = 60
    for s in range(steps + 1):
        a = -math.pi / 2 + math.pi * s / steps
        x = math.cos(a) * r
        y = math.sin(a) * r
        pts.append((cx + (x if waxing else -x), cy + y))
    tx = (2 * k - 1) * r
    for s in range(steps + 1):
        a = math.pi / 2 - math.pi * s / steps
        x = math.cos(a) * tx
        y = math.sin(a) * r
        pts.append((cx + (-x if waxing else x), cy + y))
    d.polygon(pts, fill=(250, 228, 170, 255))


def _fit(draw, text, weight, size, max_w, min_size=28):
    while size > min_size:
        f = font(weight, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(weight, min_size)


def _leaf(img, x, y, day: str, month: str, year: str, w=300, h=330):
    """The 'patro leaf' — a wall-calendar page."""
    d = ImageDraw.Draw(img, "RGBA")
    # shadow
    img.alpha_composite(_shadow_layer(x, y, w, h))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([x, y, x + w, y + h], 18, fill=PAPER + (255,))
    d.rounded_rectangle([x, y, x + w, y + 78], 18, fill=CRIMSON + (255,))
    d.rectangle([x, y + 60, x + w, y + 78], fill=CRIMSON + (255,))
    # binding rings
    for rx in (x + 70, x + w - 70):
        d.ellipse([rx - 9, y - 12, rx + 9, y + 6], fill=(220, 224, 236, 255), outline=(150, 158, 190, 255), width=3)
    fm = _fit(d, month, "medium", 40, w - 40)
    d.text((x + w / 2, y + 40), month, font=fm, fill=PAPER, anchor="mm")
    fd = _fit(d, day, "bold", 168, w - 40, 80)
    d.text((x + w / 2, y + 190), day, font=fd, fill=INK, anchor="mm")
    fy = font("medium", 34)
    d.text((x + w / 2, y + h - 40), year, font=fy, fill=(91, 100, 120), anchor="mm")


def _brand(img, text="aafnaipatro.com"):
    d = ImageDraw.Draw(img, "RGBA")
    f = font("medium", 26)
    d.text((W - 48, H - 40), text, font=f, fill=(255, 255, 255, 210), anchor="rs")
    d.ellipse([W - 48 - d.textlength(text, font=f) - 26, H - 58, W - 48 - d.textlength(text, font=f) - 12, H - 44], fill=MARIGOLD)


def _base(seed: str, profile=None, ridges=True) -> Image.Image:
    img = Image.new("RGBA", (W, H), INK_DEEP + (255,))
    # vertical sky gradient
    grad = Image.new("RGBA", (1, H))
    for yy in range(H):
        t = yy / H
        c = tuple(int(INK_DEEP[i] * (1 - t) + INK[i] * t) for i in range(3))
        grad.putpixel((0, yy), c + (255,))
    img.alpha_composite(grad.resize((W, H)))
    # stars
    rnd = _seed(seed + "stars")
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(90):
        sx, sy = rnd.randint(0, W), rnd.randint(0, 300)
        a = rnd.randint(60, 200)
        d.ellipse([sx, sy, sx + 2, sy + 2], fill=(255, 255, 255, a))
    if ridges:
        _ridges(img, seed, profile=profile)
    return img


def _text_block(img, x, y, max_w, lines):
    """lines: list of (text, weight, size, color). Returns final y."""
    d = ImageDraw.Draw(img, "RGBA")
    for text, weight, size, color in lines:
        if not text:
            continue
        f = _fit(d, text, weight, size, max_w)
        d.text((x, y), text, font=f, fill=color)
        bbox = d.textbbox((x, y), text, font=f)
        y = bbox[3] + int(size * 0.35)
    return y


def _save(img: Image.Image, path: Path):
    """Progressive JPEG: ~5x faster to encode than optimised PNG and a third
    of the size, and accepted by every social network's card crawler."""
    img.convert("RGB").save(path, "JPEG", quality=86, progressive=True, subsampling=0)


@lru_cache(maxsize=4)
def _glow_layer(cx: int, cy: int, r: int) -> Image.Image:
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - r * 2, cy - r * 2, cx + r * 2, cy + r * 2], fill=(242, 200, 120, 40))
    return glow.filter(ImageFilter.GaussianBlur(28))


@lru_cache(maxsize=4)
def _shadow_layer(x: int, y: int, w: int, h: int) -> Image.Image:
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([x + 8, y + 14, x + w + 8, y + h + 14], 18, fill=(0, 0, 0, 110))
    return sh.filter(ImageFilter.GaussianBlur(10))


def festival_card(path: Path, *, seed: str, day: str, month: str, year: str,
                  title: str, subtitle: str, place: str, line3: str, tithi: int | None):
    img = _base(seed)
    _moon(img, 1060, 110, 46, tithi)
    _leaf(img, 64, 150, day, month, year)
    _text_block(img, 410, 168, 720, [
        (title, "bold", 64, PAPER),
        (subtitle, "medium", 38, MARIGOLD),
        (place, "medium", 34, (225, 230, 245)),
        (line3, "regular", 30, MIST),
    ])
    _brand(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, path)


def place_card(path: Path, *, seed: str, title: str, subtitle: str, line3: str, line4: str = ""):
    img = _base(seed)
    _moon(img, 1060, 110, 46, None)
    _text_block(img, 72, 150, 900, [
        (title, "bold", 76, PAPER),
        (subtitle, "medium", 40, MARIGOLD),
        (line3, "regular", 32, (225, 230, 245)),
        (line4, "regular", 30, MIST),
    ])
    _brand(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, path)


def peak_card(path: Path, *, seed: str, title: str, height: str, line3: str, line4: str = ""):
    img = _base(seed, ridges=False)
    # one dominant peak silhouette + foothills
    d = ImageDraw.Draw(img, "RGBA")
    rnd = _seed(seed)
    px = rnd.randint(720, 900)
    top = rnd.randint(110, 170)
    lsh = (px - rnd.randint(180, 260), top + rnd.randint(150, 220))
    rsh = (px + rnd.randint(90, 160), top + rnd.randint(90, 160))
    poly = [(0, H), (0, 520), (rnd.randint(200, 320), rnd.randint(450, 500)), lsh, (px, top), rsh,
            (min(1180, rsh[0] + rnd.randint(60, 120)), rsh[1] - rnd.randint(0, 40)), (1200, rnd.randint(330, 430)), (1200, H)]
    d.polygon(poly, fill=(44, 56, 110, 255))
    snow = top + rnd.randint(70, 110)
    d.polygon([(px - (snow - top) * 0.9, snow), (px, top), (px + (snow - top) * 0.7, snow - 8),
               (px + 18, snow - 18), (px - 12, snow - 4)], fill=(240, 244, 255, 255))
    d.polygon([(0, H), (0, 560), (300, 520), (520, 545), (800, 500), (1200, 560), (1200, H)], fill=(25, 33, 75, 255))
    _text_block(img, 72, 120, 640, [
        (title, "bold", 70, PAPER),
        (height, "bold", 92, MARIGOLD),
        (line3, "regular", 32, (225, 230, 245)),
        (line4, "regular", 28, MIST),
    ])
    _brand(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, path)


def trek_card(path: Path, *, seed: str, title: str, subtitle: str, line3: str, profile: list[float],
              labels: list[str] | None = None):
    img = _base(seed)
    n = len(profile)
    x0, x1, ybase, yspan = 72, W - 72, H - 90, 250
    pts = [(x0 + (x1 - x0) * k / (n - 1), ybase - profile[k] * yspan) for k in range(n)]
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).polygon([(x0, ybase + 30)] + pts + [(x1, ybase + 30)], fill=(242, 162, 12, 52))
    img.alpha_composite(layer)
    d = ImageDraw.Draw(img, "RGBA")
    d.line(pts, fill=MARIGOLD + (255,), width=6, joint="curve")
    f = font("medium", 24)
    for k, (px, py) in enumerate(pts):
        d.ellipse([px - 8, py - 8, px + 8, py + 8], fill=PAPER + (255,), outline=MARIGOLD + (255,), width=4)
        if labels and labels[k]:
            anchor = "ls" if k == 0 else ("rs" if k == n - 1 else "ms")
            d.text((px, py - 20), labels[k], font=f, fill=PAPER, anchor=anchor)
    _text_block(img, 72, 90, 1000, [
        (title, "bold", 68, PAPER),
        (subtitle, "medium", 38, MARIGOLD),
        (line3, "regular", 30, (225, 230, 245)),
    ])
    _brand(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, path)


# --------------------------------------------------------------------------
# Inline SVGs (use CSS variables so they follow light/dark themes)
# --------------------------------------------------------------------------
def moon_svg(tithi: int, size: int = 40, label: str = "") -> str:
    r = size / 2 - 1
    c = size / 2
    elong = (tithi - 0.5) * 12.0
    k = (1 - math.cos(math.radians(elong))) / 2
    waxing = elong < 180
    tx = (2 * k - 1) * r
    sweep_outer = 1 if waxing else 0
    # lit region: outer semicircle on lit side + terminator ellipse
    x0, y0, y1 = c, c - r, c + r
    rx = abs(tx)
    term_sweep = (1 if tx > 0 else 0) if waxing else (0 if tx > 0 else 1)
    path = (f"M{x0:.2f},{y0:.2f} A{r:.2f},{r:.2f} 0 0 {sweep_outer} {x0:.2f},{y1:.2f} "
            f"A{rx:.2f},{r:.2f} 0 0 {term_sweep} {x0:.2f},{y0:.2f} Z")
    return (f'<svg class="moon" width="{size}" height="{size}" viewBox="0 0 {size} {size}" role="img" aria-label="{label}">'
            f'<circle cx="{c}" cy="{c}" r="{r:.2f}" fill="var(--moon-dark)"/>'
            f'<path d="{path}" fill="var(--moon-lit)"/></svg>')


def altitude_svg(stops: list[dict], width: int = 720, height: int = 220, highlight: str | None = None,
                 unit: str = "m", label: str = "") -> str:
    alts = [s["alt_m"] for s in stops]
    lo = min(alts) - 200
    hi = max(alts) + 300
    padl, padr, padt, padb = 56, 16, 16, 20
    iw, ih = width - padl - padr, height - padt - padb
    n = len(stops)
    xs = [padl + (iw * i / (n - 1) if n > 1 else iw / 2) for i in range(n)]
    ys = [padt + ih - (a - lo) / (hi - lo) * ih for a in alts]
    line = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(zip(xs, ys)))
    area = line + f" L{xs[-1]:.1f},{padt + ih:.1f} L{xs[0]:.1f},{padt + ih:.1f} Z"
    grid = []
    step = 1000 if hi - lo > 2500 else 500
    g = (int(lo) // step + 1) * step
    while g < hi:
        y = padt + ih - (g - lo) / (hi - lo) * ih
        grid.append(f'<line x1="{padl}" x2="{width - padr}" y1="{y:.1f}" y2="{y:.1f}" class="alt-grid"/>'
                    f'<text x="{padl - 6}" y="{y + 4:.1f}" class="alt-axis" text-anchor="end">{g:,}</text>')
        g += step
    # 3,000 m line (AMS threshold)
    ams = ""
    if lo < 3000 < hi:
        y = padt + ih - (3000 - lo) / (hi - lo) * ih
        ams = f'<line x1="{padl}" x2="{width - padr}" y1="{y:.1f}" y2="{y:.1f}" class="alt-ams"/>'
    dots = []
    for i, s in enumerate(stops):
        cls = "alt-dot is-here" if s.get("id") == highlight else "alt-dot"
        dots.append(f'<circle cx="{xs[i]:.1f}" cy="{ys[i]:.1f}" r="{6 if s.get("id") == highlight else 4}" class="{cls}">'
                    f'<title>{s["name"]}: {s["alt_m"]:,} {unit}</title></circle>')
    return (f'<svg class="alt-profile" viewBox="0 0 {width} {height}" role="img" aria-label="{label}" preserveAspectRatio="none">'
            + "".join(grid) + ams +
            f'<path d="{area}" class="alt-area"/><path d="{line}" class="alt-line"/>' + "".join(dots) + "</svg>")


def day_timeline_svg(sunrise: datetime, sunset: datetime, windows: list[tuple[str, datetime, datetime, str]],
                     label: str = "", ticks: list[str] | None = None) -> str:
    """24-hour strip from 00:00 to 24:00 local, night shaded, daylight lit,
    windows drawn as bands. windows: (css_class, start, end, title)."""
    w, h = 720, 76
    day0 = sunrise.replace(hour=0, minute=0, second=0, microsecond=0)

    def x(t: datetime) -> float:
        mins = (t - day0).total_seconds() / 60.0
        return max(0.0, min(w, mins / 1440.0 * w))

    parts = [f'<rect x="0" y="14" width="{w}" height="28" rx="6" class="tl-night"/>',
             f'<rect x="{x(sunrise):.1f}" y="14" width="{x(sunset) - x(sunrise):.1f}" height="28" class="tl-day"/>']
    for cls, a, b, title in windows:
        segs = [(a, b)]
        if b > day0 + timedelta(days=1):       # spills past midnight → wrap
            segs = [(a, day0 + timedelta(days=1)), (day0 + timedelta(days=1), b)]
        for sa, sb in segs:
            if sb <= day0 + timedelta(days=1):
                xa, xb = x(sa), x(sb)
            else:
                xa, xb = x(sa - timedelta(days=1)), x(sb - timedelta(days=1))
            parts.append(f'<rect x="{xa:.1f}" y="10" width="{max(2.0, xb - xa):.1f}" height="36" rx="3" class="{cls}"><title>{title}</title></rect>')
    for hh in (0, 6, 12, 18, 24):
        xx = hh / 24 * w
        anchor = "start" if hh == 0 else ("end" if hh == 24 else "middle")
        txt = (ticks or ["00", "06", "12", "18", "24"])[hh // 6]
        parts.append(f'<text x="{xx:.1f}" y="72" class="tl-tick" text-anchor="{anchor}">{txt}</text>')
    parts.append(f'<circle cx="{x(sunrise):.1f}" cy="28" r="5" class="tl-sun"/><circle cx="{x(sunset):.1f}" cy="28" r="5" class="tl-sun"/>')
    return (f'<svg class="timeline" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">' + "".join(parts) + "</svg>")


def kati_card(path: Path, *, seed: str, question: str, answer: str, sub: str):
    """Card for the kati pages: the question, then the answer as a big equation."""
    img = _base(seed)
    d = ImageDraw.Draw(img, "RGBA")
    _text_block(img, 72, 96, 1056, [
        (sub, "medium", 34, MARIGOLD),
        (question, "bold", 72, PAPER),
    ])
    # answer plate
    plate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle([60, 330, W - 60, 470], 22, fill=(247, 248, 251, 240))
    img.alpha_composite(plate)
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([60, 330, 76, 470], 6, fill=MARIGOLD + (255,))
    f = _fit(d, answer, "bold", 76, W - 200, 34)
    d.text((110, 400), answer, font=f, fill=INK, anchor="lm")
    _brand(img)
    path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, path)
