from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "source_analysis" / "sources.json"
AK = ROOT / "public" / "models" / "weapons" / "ak.glb"
REFERENCE = Path("/Users/ruben/Downloads/ak-12animated.glb")
DONOR = ROOT / "tools" / "blender" / "goldsrc" / "ak47.blend"


def bbox_world(objects: list[bpy.types.Object]) -> dict[str, list[float]]:
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return {"min": [0.0, 0.0, 0.0], "max": [0.0, 0.0, 0.0], "size": [0.0, 0.0, 0.0]}
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return {"min": list(lo), "max": list(hi), "size": list(hi - lo)}


def action_summary(action: bpy.types.Action) -> dict[str, object]:
    start, end = action.frame_range
    return {"name": action.name, "frame_start": float(start), "frame_end": float(end)}


def armature_summary(obj: bpy.types.Object) -> dict[str, object]:
    bones = [bone.name for bone in obj.data.bones]
    controls = []
    for bone in obj.data.bones:
        lower = bone.name.lower()
        if any(token in lower for token in ("wrist", "elbow", "shoulder", "forearm", "arm")):
            pose_bone = obj.pose.bones.get(bone.name)
            controls.append({
                "name": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "head": list(bone.head_local),
                "tail": list(bone.tail_local),
                "constraints": [
                    {
                        "type": constraint.type,
                        "name": constraint.name,
                        "target": constraint.target.name if getattr(constraint, "target", None) else None,
                        "subtarget": getattr(constraint, "subtarget", ""),
                        "pole_subtarget": getattr(constraint, "pole_subtarget", ""),
                    }
                    for constraint in (pose_bone.constraints if pose_bone else [])
                ],
            })
    return {
        "name": obj.name,
        "bone_count": len(bones),
        "bones": bones,
        "finger_bones": [name for name in bones if "finger" in name.lower() or "thumb" in name.lower()],
        "hand_bones": [name for name in bones if "hand" in name.lower() or "wrist" in name.lower()],
        "controls": controls,
    }


def mesh_summary(obj: bpy.types.Object) -> dict[str, object]:
    return {
        "name": obj.name,
        "vertices": len(obj.data.vertices),
        "polygons": len(obj.data.polygons),
        "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
        "parent": obj.parent.name if obj.parent else None,
        "vertex_groups": [group.name for group in obj.vertex_groups],
    }


def connected_components(obj: bpy.types.Object) -> list[dict[str, object]]:
    if obj.type != "MESH":
        return []
    mesh = obj.data
    adjacency: list[set[int]] = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    remaining = set(range(len(mesh.vertices)))
    components: list[dict[str, object]] = []
    while remaining:
        seed = remaining.pop()
        stack = [seed]
        indices = [seed]
        while stack:
            current = stack.pop()
            for neighbour in adjacency[current]:
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    stack.append(neighbour)
                    indices.append(neighbour)
        coords = [mesh.vertices[index].co for index in indices]
        lo = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
        hi = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
        components.append({
            "vertices": len(indices),
            "min": list(lo),
            "max": list(hi),
            "center": list((lo + hi) * 0.5),
            "size": list(hi - lo),
        })
    return sorted(components, key=lambda item: item["vertices"], reverse=True)


def snapshot(label: str) -> dict[str, object]:
    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    return {
        "label": label,
        "bbox": bbox_world(meshes),
        "objects": [{"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None} for obj in objects],
        "meshes": [mesh_summary(obj) for obj in meshes],
        "armatures": [armature_summary(obj) for obj in armatures],
        "actions": [action_summary(action) for action in bpy.data.actions],
    }


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def import_glb(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(path)
    bpy.ops.import_scene.gltf(filepath=str(path))
    bpy.context.view_layer.update()


def main() -> None:
    report: dict[str, object] = {
        "blender": bpy.app.version_string,
        "source_blend": bpy.data.filepath,
        "arms": snapshot("arms-source-blend"),
    }
    clear_scene()
    import_glb(AK)
    report["project_ak"] = snapshot("project-ak")
    report["project_ak"]["connected_components"] = connected_components(next(obj for obj in bpy.context.scene.objects if obj.type == "MESH"))
    clear_scene()
    import_glb(REFERENCE)
    report["motion_reference"] = snapshot("ak12-reference")
    bpy.ops.wm.open_mainfile(filepath=str(DONOR))
    report["cc0_donor"] = snapshot("cc0-goldsrc-ak")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(OUT),
        "arms": {
            "meshes": len(report["arms"]["meshes"]),
            "armatures": len(report["arms"]["armatures"]),
        },
        "project_ak": {
            "meshes": len(report["project_ak"]["meshes"]),
            "bbox": report["project_ak"]["bbox"],
        },
        "motion_reference": {
            "meshes": len(report["motion_reference"]["meshes"]),
            "actions": report["motion_reference"]["actions"],
        },
        "cc0_donor": {
            "meshes": len(report["cc0_donor"]["meshes"]),
            "armatures": len(report["cc0_donor"]["armatures"]),
            "actions": report["cc0_donor"]["actions"],
        },
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"AK_PILOT_SOURCE_INSPECTION_FAILED: {exc}", file=sys.stderr)
        raise
