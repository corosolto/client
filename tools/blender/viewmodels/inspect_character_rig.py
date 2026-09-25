"""Inspect the project's own Mandrake character as a first-person arm source."""
from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "public" / "models" / "characters" / "mandrake.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "source_analysis" / "mandrake_rig.json"


def main() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    bpy.context.view_layer.update()

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    report = {
        "source": str(SOURCE),
        "objects": [
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
            }
            for obj in bpy.context.scene.objects
        ],
        "armatures": [
            {
                "name": obj.name,
                "bones": [bone.name for bone in obj.data.bones],
                "bone_count": len(obj.data.bones),
            }
            for obj in armatures
        ],
        "meshes": [
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "polygons": len(obj.data.polygons),
                "parent": obj.parent.name if obj.parent else None,
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                "vertex_groups": [group.name for group in obj.vertex_groups],
            }
            for obj in meshes
        ],
        "actions": [
            {
                "name": action.name,
                "frame_range": [float(value) for value in action.frame_range],
            }
            for action in bpy.data.actions
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(OUT),
        "armatures": report["armatures"],
        "meshes": [
            {
                "name": item["name"],
                "vertices": item["vertices"],
                "polygons": item["polygons"],
                "material_count": len(item["materials"]),
                "group_count": len(item["vertex_groups"]),
            }
            for item in report["meshes"]
        ],
        "actions": report["actions"],
    }, indent=2))


if __name__ == "__main__":
    main()
