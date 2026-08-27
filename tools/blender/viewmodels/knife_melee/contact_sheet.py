"""Build the required melee contact sheet and pixel-space validation report."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot"
RENDERS = OUT / "renders"
VALIDATION = OUT / "validation"
EVIDENCE = ROOT / "tools/eval/asset-evidence/knife-melee"
ACTIONS = ("idle", "draw", "slash", "stab")


def foreground_bbox(image: Image.Image):
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, rgb.getpixel((5, 5)))
    difference = ImageChops.difference(rgb, background).convert("L")
    mask = difference.point(lambda value: 255 if value > 18 else 0)
    return mask.getbbox(), mask


def main() -> None:
    files = [path for action in ACTIONS for path in sorted(RENDERS.glob(f"{action}_*.png"))]
    if len(files) != 20:
        raise SystemExit(f"Expected 20 current renders, found {len(files)}")
    VALIDATION.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default(size=18)
    tile_w, tile_h, label_h = 360, 240, 28
    sheet = Image.new("RGB", (tile_w * 5, (tile_h + label_h) * 4), (12, 19, 31))
    records = []
    previous_by_action = {}
    for index, path in enumerate(files):
        image = Image.open(path).convert("RGB")
        bbox, mask = foreground_bbox(image)
        action = path.stem.split("_")[0]
        diff_ratio = None
        if action in previous_by_action:
            delta = ImageChops.difference(image, previous_by_action[action]).convert("L")
            pixels = delta.get_flattened_data() if hasattr(delta, "get_flattened_data") else delta.getdata()
            diff_ratio = round(sum(1 for value in pixels if value > 10) / (image.width * image.height), 5)
        previous_by_action[action] = image
        top_margin = bbox[1] if bbox else None
        occupancy = round(((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / (image.width * image.height), 4) if bbox else 0
        records.append({"frame": path.name, "bbox": list(bbox) if bbox else None,
                        "top_margin_px": top_margin, "bbox_occupancy": occupancy,
                        "difference_from_previous": diff_ratio})
        thumb = image.copy()
        thumb.thumbnail((tile_w, tile_h), Image.Resampling.LANCZOS)
        x = (index % 5) * tile_w + (tile_w - thumb.width) // 2
        y = (index // 5) * (tile_h + label_h)
        sheet.paste(thumb, (x, y))
        ImageDraw.Draw(sheet).text((index % 5 * tile_w + 8, y + tile_h + 4), path.stem,
                                   font=font, fill=(235, 240, 248))
    sheet.save(VALIDATION / "contact_sheet.png")
    sheet.save(EVIDENCE / "contact-sheet.png")

    export_files = [VALIDATION / f"export_{action}.png" for action in ("idle", "slash", "stab")]
    if all(path.exists() for path in export_files):
        export_sheet = Image.new("RGB", (tile_w * 3, tile_h + label_h), (12, 19, 31))
        for index, path in enumerate(export_files):
            image = Image.open(path).convert("RGB")
            image.thumbnail((tile_w, tile_h), Image.Resampling.LANCZOS)
            export_sheet.paste(image, (index * tile_w + (tile_w - image.width) // 2, 0))
            ImageDraw.Draw(export_sheet).text((index * tile_w + 8, tile_h + 4), path.stem,
                                              font=font, fill=(235, 240, 248))
        export_sheet.save(EVIDENCE / "export-truth.png")

    idle = Image.open(RENDERS / "idle_000.png").convert("RGB")
    idle_bbox, _ = foreground_bbox(idle)
    overlay = idle.copy()
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((8, 8, idle.width - 9, idle.height - 9), outline=(50, 210, 110), width=4)
    if idle_bbox:
        draw.rectangle(idle_bbox, outline=(255, 185, 35), width=4)
    overlay.save(VALIDATION / "front_overlay_reference.png")

    nonempty = sum(record["bbox"] is not None for record in records)
    top_margins = [record["top_margin_px"] for record in records if record["top_margin_px"] is not None]
    motion_diffs = [record["difference_from_previous"] for record in records
                    if record["difference_from_previous"] is not None]
    checks = {
        "render_count": len(records) == 20,
        "minimum_nonempty_samples": nonempty >= 19,
        "minimum_top_margin_px": min(top_margins) >= 8,
        "motion_present": max(motion_diffs) >= 0.05,
        "idle_not_static_noise": max(record["difference_from_previous"] or 0 for record in records[:5]) < 0.05,
    }
    report = {"pass": all(checks.values()), "checks": checks, "records": records,
              "mask_method": "RGB distance from top-left background, threshold 18",
              "allowed_entry_edges": ["bottom", "left", "right"]}
    report_text = json.dumps(report, indent=2) + "\n"
    (VALIDATION / "front_mask_validation.json").write_text(report_text, encoding="utf-8")
    (EVIDENCE / "pixel-gate.json").write_text(report_text, encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
