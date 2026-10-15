"""Render the PWA PNG icons from the same geometry as public/icons/icon.svg (Pillow).

Run: python scripts/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
COBALT, WHITE, MARKER = "#1D4E9E", "#FFFFFF", "#FFD54A"


def receipt(draw: ImageDraw.ImageDraw, s: float, ox: float = 0, oy: float = 0) -> None:
    def p(x: float, y: float) -> tuple[float, float]:
        return (ox + x * s, oy + y * s)

    teeth = [p(362, 396)]
    x = 362.0
    up = True
    while x > 150:
        x -= 26.5
        teeth.append(p(x, 376 if up else 396))
        up = not up
    draw.polygon([p(150, 96), p(362, 96), *teeth, p(150, 396)], fill=WHITE)
    for y, w, h, color in ((150, 140, 18, COBALT), (198, 96, 18, COBALT), (246, 120, 18, COBALT), (294, 140, 22, MARKER)):
        draw.rounded_rectangle([p(186, y), p(186 + w, y + h)], radius=h / 2 * s, fill=color)


def icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size / 512
    if maskable:
        draw.rectangle([0, 0, size, size], fill=COBALT)
        inner = 0.72  # keep the glyph inside the maskable safe zone
        receipt(draw, s * inner, ox=size * (1 - inner) / 2, oy=size * (1 - inner) / 2)
    else:
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=112 * s, fill=COBALT)
        receipt(draw, s)
    return img


OUT.mkdir(parents=True, exist_ok=True)
icon(192).save(OUT / "icon-192.png")
icon(512).save(OUT / "icon-512.png")
icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
icon(180, maskable=True).convert("RGB").save(OUT / "apple-touch-icon.png")
print("icons written to", OUT)
