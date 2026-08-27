"""Compose the five production-browser checkpoints for the knife pilot."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = ROOT / "tools/eval/asset-evidence/knife-melee-runtime"
FRAMES = (
    ("idle.jpg", "IDLE - grip fechado + apoio relaxado"),
    ("draw.jpg", "DRAW - entrada continua de baixo"),
    ("slash.jpg", "SLASH - arco lateral + apoio em contramovimento"),
    ("stab.jpg", "STAB - avanco frontal + silhueta distinta"),
    ("return-idle.jpg", "RETORNO - idle sem pose residual"),
)


def main() -> None:
    missing = [name for name, _label in FRAMES if not (EVIDENCE / name).exists()]
    if missing:
        raise SystemExit(f"Missing browser frames: {', '.join(missing)}")
    tile_w, tile_h, label_h = 504, 240, 32
    sheet = Image.new("RGB", (tile_w * 3, (tile_h + label_h) * 2), (10, 16, 26))
    font = ImageFont.load_default(size=17)
    for index, (name, label) in enumerate(FRAMES):
        image = Image.open(EVIDENCE / name).convert("RGB")
        image.thumbnail((tile_w, tile_h), Image.Resampling.LANCZOS)
        column, row = index % 3, index // 3
        x = column * tile_w + (tile_w - image.width) // 2
        y = row * (tile_h + label_h) + (tile_h - image.height) // 2
        sheet.paste(image, (x, y))
        ImageDraw.Draw(sheet).text((column * tile_w + 8, row * (tile_h + label_h) + tile_h + 5),
                                   label, font=font, fill=(235, 240, 248))
    sheet.save(EVIDENCE / "contact-sheet.png")
    print(EVIDENCE / "contact-sheet.png")


if __name__ == "__main__":
    main()
