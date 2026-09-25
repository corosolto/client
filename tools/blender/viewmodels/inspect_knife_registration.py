"""Report the donor/project knife registration facts used by the hires pilot."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "knife_animated.glb"
PROJECT = ROOT / "public" / "models" / "weapons" / "knife.glb"


def bounds(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    high = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    return tuple(round(v, 4) for v in low), tuple(round(v, 4) for v in high)


def dominant_bones(obj):
    if obj.type != "MESH" or not obj.vertex_groups:
        return []
    totals = {}
    for vertex in obj.data.vertices:
        for item in vertex.groups:
            name = obj.vertex_groups[item.group].name
            totals[name] = totals.get(name, 0.0) + item.weight
    return sorted(totals.items(), key=lambda item: item[1], reverse=True)[:12]


def import_and_report(path, label):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    print(f"{label} {path}")
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            print(
                "MESH", obj.name, "bounds", bounds(obj), "dominant", dominant_bones(obj),
                "parent", obj.parent.name if obj.parent else None, "parent_type", obj.parent_type,
                "parent_bone", obj.parent_bone,
                "dimensions", tuple(round(v, 4) for v in obj.dimensions),
                "matrix", tuple(round(v, 4) for row in obj.matrix_local for v in row),
            )
        elif obj.type == "ARMATURE":
            print("RIG", obj.name, "bones", [bone.name for bone in obj.data.bones])
        elif label == "DONOR":
            print(
                "OBJECT", obj.type, obj.name,
                "parent", obj.parent.name if obj.parent else None,
                "loc", tuple(round(v, 4) for v in obj.location),
                "rot", tuple(round(v, 4) for v in obj.rotation_euler),
                "scale", tuple(round(v, 4) for v in obj.scale),
            )
    for action in bpy.data.actions:
        print("ACTION", action.name, tuple(action.frame_range))
    if label == "DONOR":
        for obj in bpy.data.objects:
            if obj.animation_data and obj.animation_data.action:
                print("ANIMATED", obj.name, obj.animation_data.action.name)


import_and_report(DONOR, "DONOR")
import_and_report(PROJECT, "PROJECT")
