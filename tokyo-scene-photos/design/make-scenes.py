#!/usr/bin/env python3
"""Convert existing scene PNGs to 3:2 WebP and write an id-to-URL manifest.

Requires Pillow: python -m pip install Pillow
Run from any directory: python design/make-scenes.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IDS = (
    "weekend", "ramen", "late", "report", "hungry", "kyoto",
    "app", "shift", "speakers", "cold", "moving", "presentation",
)


def main():
    destination = ROOT / "public/scenes"
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for scene_id in IDS:
        source = ROOT / "design/scenes" / f"{scene_id}.png"
        if not source.is_file():
            continue
        with Image.open(source) as original:
            photo = ImageOps.exif_transpose(original).convert("RGB")
            # Largest exact 3:2 rectangle, without upscaling.
            unit = min(photo.width // 3, photo.height // 2, 512)
            if unit < 1:
                raise ValueError(f"Image too small: {source}")
            photo = ImageOps.fit(photo, (3 * unit, 2 * unit), Image.Resampling.LANCZOS)
            photo.save(destination / f"{scene_id}.webp", "WEBP", quality=88, method=6)
        manifest[scene_id] = f"/scenes/{scene_id}.webp"
    manifest_path = ROOT / "src/content/scenes.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Created {len(manifest)} WebP images and {manifest_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
