"""Fail closed when a heavy pilot leaks donors or loses required clips."""
from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts" / "viewmodels" / "heavy" / "validation" / "export_validation.json"
FORBIDDEN = {
    "armmesh", "requests_studio", "base_sniper", "scope_sniper", "bolt_sniper",
    "base_bmg", "base_shotgun", "pump_shotgun", "slug_shotgun", "donor",
}


def validate(name: str) -> dict:
    path = ROOT / "public" / "models" / "viewmodels" / "coro" / "heavy" / f"{name}-pilot.glb"
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    object_names = sorted(obj.name for obj in bpy.data.objects)
    material_names = sorted(material.name for material in bpy.data.materials)
    action_names = sorted(action.name for action in bpy.data.actions)
    searchable = " ".join(object_names + material_names).lower()
    leaks = sorted(token for token in FORBIDDEN if token in searchable)
    required_objects = {
        f"coro_solto_project_{name}_body",
        f"coro_solto_{name}_fp_rig",
        f"coro_solto_{name}_arm_L",
        f"coro_solto_{name}_arm_R",
    }
    required_actions = {"Idle", "Fire", "Reload"}
    missing_objects = sorted(required_objects - set(object_names))
    missing_actions = sorted(required_actions - set(action_names))
    result = {
        "pilot": name,
        "path": str(path.relative_to(ROOT)),
        "size_bytes": path.stat().st_size,
        "object_names": object_names,
        "material_names": material_names,
        "action_names": action_names,
        "forbidden_name_hits": leaks,
        "missing_required_objects": missing_objects,
        "missing_required_actions": missing_actions,
    }
    result["pass"] = not leaks and not missing_objects and not missing_actions and path.stat().st_size < 5_000_000
    return result


def main() -> None:
    reports = [validate(name) for name in ("awp", "shotgun")]
    result = {"blender": bpy.app.version_string, "reports": reports, "pass": all(report["pass"] for report in reports)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not result["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
