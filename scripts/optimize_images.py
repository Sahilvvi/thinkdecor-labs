"""
Makes a .webp next to every .jpg under public/assets (same name, same size),
so pages can load the lighter format. Skips files whose .webp is already
newer than the .jpg. The .jpg stays: src/main.tsx falls back to it if a
browser can't load the .webp.

    python scripts/optimize_images.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "assets"
before = after = made = 0
for jpg in sorted(ROOT.rglob("*.jpg")):
    webp = jpg.with_suffix(".webp")
    before += jpg.stat().st_size
    if not webp.exists() or webp.stat().st_mtime < jpg.stat().st_mtime:
        Image.open(jpg).convert("RGB").save(webp, "WEBP", quality=78, method=6)
        made += 1
    after += webp.stat().st_size
print(f"{made} written · jpg {before/1e6:.1f} MB -> webp {after/1e6:.1f} MB")
