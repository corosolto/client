"""Inventory project heavy weapons and animation-only reference donors."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
PROJECT = {
    name: ROOT / "public" / "models" / "weapons" / f"{name}.glb"
    for name in ("awp", "g3sg1", "mosin", "rem700", "svd", "shotgun")
}
DONORS = {
    "sniper_animated": Path.home() / "Downloads" / "sniper_animated.glb",
    "fps_animations_sniper_rifle": Path.home() / "Downloads" / "fps_animations_sniper_rifle.glb",
    "fps_50cal": Path.home() / "Downloads" / "fps_50cal.glb",
    "shotgun_animated": Path.home() / "Downloads" / "shotgun_animated.glb",
}


def inspect(path: Path, source_role: str) -> dict:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    scene = bpy.context.scene
    meshes = []
    armatures = []
    for obj in scene.objects:
        if obj.type == "MESH":
            corners = [obj.matrix_world @ obj.data.vertices[i].co for i in range(len(obj.data.vertices))]
            if corners:
                mins = [min(v[i] for v in corners) for i in range(3)]
                maxs = [max(v[i] for v in corners) for i in range(3)]
            else:
                mins = maxs = [0.0, 0.0, 0.0]
            meshes.append({
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "faces": len(obj.data.polygons),
                "bounds_min": [round(v, 6) for v in mins],
                "bounds_max": [round(v, 6) for v in maxs],
                "material_count": len([slot for slot in obj.material_slots if slot.material]),
            })
        elif obj.type == "ARMATURE":
            armatures.append({
                "name": obj.name,
                "bone_count": len(obj.data.bones),
            })
    actions = []
    for action in bpy.data.actions:
        actions.append({
            "name": action.name,
            "frame_start": round(action.frame_range[0], 3),
            "frame_end": round(action.frame_range[1], 3),
            "slots": len(action.slots) if hasattr(action, "slots") else None,
        })
    return {
        "path": str(path),
        "role": source_role,
        "size_bytes": path.stat().st_size,
        "meshes": meshes,
        "armatures": armatures,
        "actions": actions,
    }


def main() -> None:
    output = {
        "blender": bpy.app.version_string,
        "policy": "project meshes may export; donor geometry/materials/skins are inspection-only",
        "sources": {},
    }
    for name, path in PROJECT.items():
        output["sources"][name] = inspect(path, "project_weapon_exportable")
    for name, path in DONORS.items():
        output["sources"][name] = inspect(path, "reference_animation_only_non_exportable")
    out_path = Path(sys.argv[-1]) if len(sys.argv) > 1 and sys.argv[-2] == "--" else ROOT / "artifacts" / "viewmodels" / "heavy" / "source_analysis" / "heavy_sources.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"HEAVY_SOURCE_ANALYSIS={out_path}")


if __name__ == "__main__":
    main()
