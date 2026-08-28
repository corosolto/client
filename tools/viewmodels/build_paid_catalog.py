#!/usr/bin/env python3
"""Build every licensed first-person family and write a private runtime catalog."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = REPO_ROOT / "tools/viewmodels/paid-pack-manifest.json"
DEFAULT_BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--blender", type=Path, default=DEFAULT_BLENDER)
    parser.add_argument("--family", action="append", default=[])
    parser.add_argument("--extract", action="store_true")
    return parser.parse_args()


def run(command: list[str]) -> None:
    print("CORO_VIEWMODEL_STEP=" + json.dumps(command), flush=True)
    subprocess.run(command, cwd=REPO_ROOT, check=True)


def main() -> int:
    args = parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    private_root = Path(manifest["output"]["privateRoot"]).expanduser().resolve()
    if REPO_ROOT.resolve() in [private_root, *private_root.parents]:
        raise SystemExit(f"refusing to place licensed builds inside public repository: {private_root}")
    if not args.blender.is_file():
        raise SystemExit(f"Blender executable not found: {args.blender}")

    available = {
        key: value for key, value in manifest["families"].items()
        if not value.get("externalWeapon")
    }
    selected = args.family or list(available)
    unknown = sorted(set(selected) - set(available))
    if unknown:
        raise SystemExit(f"unknown or external families: {', '.join(unknown)}")

    if args.extract:
        run([sys.executable, "tools/viewmodels/extract_paid_unitypackage.py", "--all"])

    results = []
    for family in selected:
        run([
            str(args.blender), "-b",
            "--python", "tools/blender/viewmodels/build_paid_family.py",
            "--", "--family", family, "--manifest", str(manifest_path),
        ])
        run([
            "node", "tools/viewmodels/assemble_paid_family.mjs",
            "--family", family, "--manifest", str(manifest_path),
        ])
        family_root = private_root / family
        build = json.loads((family_root / "build-report.json").read_text(encoding="utf-8"))
        assembly = json.loads((family_root / "assembly-report.json").read_text(encoding="utf-8"))
        results.append({
            "family": family,
            "source": available[family]["source"],
            "url": f'{manifest["output"]["runtimeUrl"]}/{family}/{family}-runtime.glb',
            "bytes": assembly["bytes"],
            "clips": [clip["name"] for clip in assembly["clips"]],
            "camera": build["camera"],
        })

    catalog = {
        "schemaVersion": 1,
        "license": manifest["source"]["license"],
        "redistributableAsSource": False,
        "families": results,
        "weapons": manifest["weapons"],
        "grenades": manifest["grenades"],
    }
    private_root.mkdir(parents=True, exist_ok=True)
    catalog_path = private_root / "catalog.json"
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print("CORO_PAID_VIEWMODEL_CATALOG=" + json.dumps({
        "path": str(catalog_path),
        "families": len(results),
        "weapons": len(manifest["weapons"]),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
