"""The scene photos (design/scenes/prompts.md), from what the maker saved out of ChatGPT to what the app shows.
Each design/scenes/<talk id>.(png|jpg|jpeg|webp) is cut to 3:2 around its middle, scaled to 1536x1024 (the size
ChatGPT makes) and written as public/scenes/<talk id>.<hash>.webp, named by its content as the audio clips are: a new
photo gets a new name, so no cache keeps showing the old one. src/content/scenes.json lists the talks that have one
(the app shows a photo only for those). A file named after no talk is reported and left alone.
    python design/make-scenes.py
"""
import hashlib
import io
import json
import os
import re

from PIL import Image

W, H = 1536, 1024


def talk_ids(root):
    with open(os.path.join(root, "src", "content", "talks.ts"), encoding="utf-8") as f:
        return re.findall(r'^    id: "([a-z0-9-]+)",$', f.read(), re.M)


def cut(img):
    img = img.convert("RGB")
    w, h = img.size
    if w / h > W / H:
        nw = round(h * W / H)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * H / W)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return img.resize((W, H), Image.LANCZOS)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = os.path.join(root, "design", "scenes")
    out = os.path.join(root, "public", "scenes")
    os.makedirs(out, exist_ok=True)
    ids = set(talk_ids(root))
    found = {}
    for name in sorted(os.listdir(src)):
        base, ext = os.path.splitext(name)
        if ext.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        if base not in ids:
            print(f"  {name}: no talk has this id (ids: {', '.join(sorted(ids))})")
            continue
        buf = io.BytesIO()
        cut(Image.open(os.path.join(src, name))).save(buf, "WEBP", quality=86, method=6)
        data = buf.getvalue()
        file = f"{base}.{hashlib.sha256(data).hexdigest()[:8]}.webp"
        with open(os.path.join(out, file), "wb") as f:
            f.write(data)
        found[base] = {"file": file, "w": W, "h": H}
        print(f"  {file}")
    kept = {v["file"] for v in found.values()}
    for name in os.listdir(out):
        if name.endswith(".webp") and name not in kept:
            os.remove(os.path.join(out, name))
    with open(os.path.join(root, "src", "content", "scenes.json"), "w", encoding="utf-8") as f:
        json.dump(dict(sorted(found.items())), f, ensure_ascii=False)
        f.write("\n")
    print(f"{len(found)} of {len(ids)} talks have a picture")


if __name__ == "__main__":
    main()
