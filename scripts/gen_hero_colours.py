"""
One-off generator for the homepage hero's colour swatches.

For every room pin + swatch in src/lib/heroColours.json it asks Gemini's image
model to recolour just that item in the room photo, and saves the result as
public/assets/rooms/colours/<room>-<pin>-<swatch>.jpg (1024 px wide, JPEG).
Existing files are skipped, so a rerun only fills the gaps.

    GEMINI_API_KEY=... python scripts/gen_hero_colours.py [--only living] [--force]

The key can also live in .env.local (GEMINI_API_KEY=...). It is never printed.
Without a local key, set HERO_GEN_PROXY (a function URL) + HERO_GEN_TOKEN to
send the same requests through a server that holds the key.
"""
import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "lib" / "heroColours.json"
OUT = ROOT / "public" / "assets" / "rooms" / "colours"
BASE_IMAGES = {
    "living": "hero.jpg",
    "bedroom": "room-bedroom.jpg",
    "kitchen": "room-kitchen.jpg",
    "hall": "room-hall.jpg",
}
# Same order the edge functions use (see supabase/functions/demo-redesign).
MODELS = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"]


def load_key() -> str:
    if os.environ.get("HERO_GEN_PROXY"):
        return ""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    for name in (".env.local", ".env"):
        p = ROOT / name
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("GEMINI_API_KEY not found (env var or .env.local).")


def build_prompt(pin: dict, swatch: dict) -> str:
    return (
        f"Edit this interior photo. Change ONLY {pin['target']} so it becomes {swatch['prompt']}. "
        "Everything else must stay exactly as it is: identical camera angle, framing, crop, lighting, "
        "shadows, walls, windows, rugs, decor and every other piece of furniture. The edited item keeps "
        "its exact shape, size and position; only its colour, material or finish changes, with realistic "
        "texture, reflections and shading for the room's light. Photorealistic, like a catalogue photo."
    )


def call_gemini(key: str, model: str, prompt: str, img_b64: str) -> bytes | None:
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}, {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }).encode()
    proxy = os.environ.get("HERO_GEN_PROXY")
    if proxy:
        req = urllib.request.Request(
            proxy,
            data=json.dumps({"model": model, "body": json.loads(body)}).encode(),
            headers={"Content-Type": "application/json", "x-gen-token": os.environ.get("HERO_GEN_TOKEN", "")},
        )
    else:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
        )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            data = json.loads(res.read())
    except urllib.error.HTTPError as e:
        msg = json.loads(e.read() or b"{}").get("error", {}).get("message", str(e))
        print(f"    {model}: HTTP {e.code} {msg[:160]}")
        return None
    for part in (data.get("candidates") or [{}])[0].get("content", {}).get("parts", []):
        if part.get("inlineData", {}).get("data"):
            return base64.b64decode(part["inlineData"]["data"])
    print(f"    {model}: no image ({(data.get('candidates') or [{}])[0].get('finishReason')})")
    return None


def save_jpeg(raw: bytes, dest: Path, size: tuple[int, int]) -> None:
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    # Match the source photo exactly so the swap on the stage doesn't jump.
    if img.size != size:
        img = img.resize(size, Image.LANCZOS)
    img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="room key to limit to (living, bedroom, kitchen, hall)")
    ap.add_argument("--force", action="store_true", help="regenerate even if the file exists")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many new images")
    args = ap.parse_args()

    key = load_key()
    rooms = json.loads(DATA.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    made = 0

    for room, pins in rooms.items():
        if args.only and room != args.only:
            continue
        base_path = ROOT / "public" / "assets" / "rooms" / BASE_IMAGES[room]
        size = Image.open(base_path).size
        img_b64 = base64.b64encode(base_path.read_bytes()).decode()
        for pin in pins:
            for sw in pin["swatches"]:
                if sw["key"] == "original":
                    continue
                dest = OUT / f"{room}-{pin['key']}-{sw['key']}.jpg"
                if dest.exists() and not args.force:
                    continue
                if args.limit and made >= args.limit:
                    continue
                made += 1
                print(f"{dest.name} ...", flush=True)
                prompt = build_prompt(pin, sw)
                raw = None
                for model in MODELS:
                    started = time.time()
                    raw = call_gemini(key, model, prompt, img_b64)
                    if raw:
                        print(f"    {model}: ok in {time.time() - started:.1f}s")
                        break
                if raw:
                    save_jpeg(raw, dest, size)
                else:
                    failed.append(dest.name)

    if failed:
        print("\nFailed:", ", ".join(failed))
        sys.exit(1)
    print("\nAll swatch images present.")


if __name__ == "__main__":
    main()
