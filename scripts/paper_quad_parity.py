"""The backend's corners of the receipt for the parity check of src/features/capture/paperQuad.ts (spec 017, SC-001).

For each real receipt and the captures of tests/golden/real_variants.py, writes into OUT the grey probe the backend
looks at (`_gray_probe`, raw bytes) and the corners `_paper_quad` finds in it, following the same steps as the
TypeScript port (a paper lying sideways is transposed; without clean edges, the paper's box). Then
`PARITY_DIR=OUT pnpm exec vitest run src/features/capture/paperQuad.parity.test.ts` compares the port.

Real receipts hold personal data: OUT must be outside both repositories (a scratch folder). Run with the backend's
environment, from Backend/:

    PYTHONPATH=. uv run --no-sync python ../Frontend/scripts/paper_quad_parity.py ../Receipts OUT
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from PIL import Image, ImageFilter

from basketiq.pipeline.preprocess import (
    PAPER_MAX_AREA,
    PAPER_MIN_AREA,
    PAPER_TEXT_GAP,
    _gray_probe,
    _otsu_threshold,
    _paper_box,
    _paper_quad,
)
from tests.golden.real_variants import _TRANSFORMS, _capture, _source

VARIANTS = ("photographed", "rotated_15", "perspective", "sideways", "upside_down", "far", "glare_fold")
SUFFIXES = {".jpg", ".jpeg", ".png", ".pdf"}


def corners(gray: np.ndarray) -> list[list[float]] | None:
    """Corners as shares of the probe (top-left, top-right, bottom-right, bottom-left as seen), or None."""
    h, w = gray.shape
    threshold = _otsu_threshold(gray)
    box = _paper_box(gray > threshold)
    if box is None:
        return None
    left, top, right, bottom = box
    if not PAPER_MIN_AREA * w * h <= (right - left) * (bottom - top) <= PAPER_MAX_AREA * w * h:
        return None
    if right - left > bottom - top:
        turned = corners(np.ascontiguousarray(gray.T))
        if turned is None:
            return None
        a, b, c, d = ([y, x] for x, y in turned)
        return [a, d, c, b]
    closed = Image.fromarray(gray).filter(ImageFilter.MaxFilter(PAPER_TEXT_GAP)).filter(ImageFilter.MinFilter(PAPER_TEXT_GAP))
    quad = _paper_quad(np.asarray(closed) > threshold, box)
    if quad is not None:
        tl, tr, br, bl = (np.array(p) for p in quad)
        width = max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl))
        height = max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr))
        if not PAPER_MIN_AREA * w * h <= width * height <= PAPER_MAX_AREA * w * h:
            quad = None
    if quad is None:
        quad = ((left, top), (right, top), (right, bottom), (left, bottom))
    return [[float(x) / w, float(y) / h] for x, y in quad]


def main(receipts: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    documents = sorted(p for p in receipts.rglob("*") if p.suffix.lower() in SUFFIXES)
    for index, document in enumerate(documents):
        source, is_page = _source(SimpleNamespace(document=document))
        capture = _capture(source, is_page)
        for variant in VARIANTS:
            if variant == "photographed" and not is_page:
                continue
            image = _TRANSFORMS[variant](capture, index)
            gray, _ = _gray_probe(image)
            name = f"{index:03d}-{variant}"
            (out / f"{name}.gray").write_bytes(np.ascontiguousarray(gray).tobytes())
            h, w = gray.shape
            manifest.append({"name": name, "w": w, "h": h, "quad": corners(gray)})
            print(name, document.name, "quad" if manifest[-1]["quad"] else "none", flush=True)
    (out / "manifest.json").write_text(json.dumps(manifest))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
