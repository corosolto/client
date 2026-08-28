#!/usr/bin/env python3
"""Extract only the licensed FPS assets required by the private build pipeline.

Unity packages are tar archives containing GUID directories.  Each directory has a
``pathname`` entry and the original bytes in ``asset``.  This tool reconstructs the
original asset tree outside the public repository and records hashes for reproducible
builds.  It never writes licensed source files below the repository root.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tarfile
from typing import Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_MANIFEST = SCRIPT_DIR / "paid-pack-manifest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--package", type=Path, help="Override the Unity package path")
    parser.add_argument("--output", type=Path, help="Override the private extraction root")
    parser.add_argument("--family", action="append", default=[], help="Family key to extract; repeatable")
    parser.add_argument("--all", action="store_true", help="Extract every family in the manifest")
    parser.add_argument("--list", action="store_true", help="Print the selected package paths without writing")
    return parser.parse_args()


def load_manifest(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def assert_private_output(output: Path) -> None:
    resolved = output.expanduser().resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError:
        return
    raise SystemExit(f"refusing to extract licensed assets inside public repository: {resolved}")


def safe_relative_path(value: str) -> Path:
    pure = PurePosixPath(value.strip())
    if pure.is_absolute() or ".." in pure.parts or not pure.parts:
        raise ValueError(f"unsafe Unity pathname: {value!r}")
    return Path(*pure.parts)


def package_entries(package: Path) -> dict[str, tuple[tarfile.TarInfo, str]]:
    entries: dict[str, tuple[tarfile.TarInfo, str]] = {}
    with tarfile.open(package, "r:*") as archive:
        members = {member.name: member for member in archive.getmembers() if member.isfile()}
        for name, member in members.items():
            if not name.endswith("/pathname"):
                continue
            source = archive.extractfile(member)
            if source is None:
                continue
            pathname = source.read().decode("utf-8", "replace").strip()
            asset_name = f"{name[:-len('/pathname')]}/asset"
            asset = members.get(asset_name)
            if asset is not None:
                entries[pathname] = (asset, asset_name)
    return entries


def selected_prefixes(manifest: dict, family_keys: Iterable[str]) -> tuple[list[str], list[str]]:
    asset_root = manifest["source"]["assetRoot"].rstrip("/")
    families = manifest["families"]
    # The animation FBXs contain an Unreal mannequin as their motion carrier.  The
    # production mesh is SK_Arms_Mono.fbx, with its own skin/cloth/glove materials.
    # Always extract the complete Character subtree so builds never accidentally
    # render the mannequin or lose the authored first-person hand textures.
    prefixes = ["Assets/KINEMATION/FPSAnimationPack/Character/"]
    selected_sources: list[str] = []
    for key in family_keys:
        family = families.get(key)
        if family is None:
            raise SystemExit(f"unknown family {key!r}; choose from: {', '.join(sorted(families))}")
        source = family["source"]
        selected_sources.append(source)
        prefixes.append(f"{asset_root}/{source}/")
    return prefixes, selected_sources


def main() -> int:
    args = parse_args()
    manifest = load_manifest(args.manifest)
    package = (args.package or Path(manifest["source"]["package"])).expanduser().resolve()
    output = (args.output or (Path(manifest["output"]["privateRoot"]).parent / "extracted")).expanduser().resolve()
    assert_private_output(output)
    if not package.is_file():
        raise SystemExit(f"Unity package not found: {package}")

    family_keys = sorted(manifest["families"]) if args.all or not args.family else args.family
    prefixes, selected_sources = selected_prefixes(manifest, family_keys)
    entries = package_entries(package)
    selected = sorted(path for path in entries if any(path.startswith(prefix) for prefix in prefixes))
    if not selected:
        raise SystemExit("no matching assets found in Unity package")

    if args.list:
        print("\n".join(selected))
        print(f"selected {len(selected)} assets for {', '.join(selected_sources)}")
        return 0

    output.mkdir(parents=True, exist_ok=True)
    records = []
    with tarfile.open(package, "r:*") as archive:
        for pathname in selected:
            asset, _ = entries[pathname]
            relative = safe_relative_path(pathname)
            destination = output / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(asset)
            if source is None:
                raise RuntimeError(f"could not read package asset: {pathname}")
            digest = hashlib.sha256()
            with destination.open("wb") as handle:
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
                    handle.write(chunk)
            records.append({
                "path": pathname,
                "bytes": destination.stat().st_size,
                "sha256": digest.hexdigest(),
            })

    inventory = {
        "schemaVersion": 1,
        "package": str(package),
        "packageBytes": package.stat().st_size,
        "families": selected_sources,
        "assets": records,
    }
    inventory_path = output / "paid-pack-inventory.json"
    inventory_path.write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")
    total = sum(record["bytes"] for record in records)
    print(f"extracted {len(records)} assets ({total / 1024 / 1024:.1f} MiB) to {output}")
    print(f"inventory: {inventory_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
