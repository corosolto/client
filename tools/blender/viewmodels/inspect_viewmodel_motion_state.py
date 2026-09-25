"""Report evaluated mesh and bone positions across FPS animation states."""

from __future__ import annotations

import json
import sys

import bpy
from mathutils import Vector


def evaluated_bounds(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
        maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
        return {
            "center": [round(v, 6) for v in (minimum + maximum) * 0.5],
            "size": [round(v, 6) for v in maximum - minimum],
        }
    finally:
        evaluated.to_mesh_clear()


def report_frame(rig, action, frame):
    rig.animation_data_create()
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    meshes = {}
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or "magazine" not in obj.name.lower():
            continue
        meshes[obj.name] = {
            **evaluated_bounds(obj),
            "hide_render": bool(obj.hide_render),
            "hide_viewport": bool(obj.hide_viewport),
        }
    bones = {}
    for name in ("Rifle_metarig", "Mag_metarig", "Mag.001_metarig", "hand.L", "hand.R"):
        bone = rig.pose.bones.get(name)
        if bone is None:
            continue
        point = rig.matrix_world @ bone.matrix.translation
        bones[name] = [round(v, 6) for v in point]
    return {"frame": frame, "meshes": meshes, "bones": bones}


def main():
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    action_name = values[0] if values else "Reload"
    frames = [int(value) for value in values[1:]] or [0, 20, 40, 48, 52, 54, 60, 68, 80, 100]
    rig = bpy.data.objects.get("coro_solto_hires_fp_rig")
    action = bpy.data.actions.get(action_name)
    if rig is None or action is None:
        raise RuntimeError(f"Missing rig/action: {action_name}")
    result = {
        "blend": bpy.data.filepath,
        "action": action_name,
        "states": [report_frame(rig, action, frame) for frame in frames],
    }
    print("CORO_VIEWMODEL_MOTION_STATE=" + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
