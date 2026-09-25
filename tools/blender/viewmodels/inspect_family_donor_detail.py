"""Inspect one CC0 FPS family donor in rig space.

This is a read-only diagnostic used before authoring project viewmodels.  It
reports which bones drive each visible mesh, world envelopes at representative
frames and the dominant transforms of weapon proxy bones.  The report prevents
guessing animation segments from filenames alone.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def bounds(obj: bpy.types.Object) -> dict[str, list[float]]:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return {
        "min": [round(value, 5) for value in low],
        "max": [round(value, 5) for value in high],
        "center": [round(value, 5) for value in ((low + high) * 0.5)],
        "size": [round(value, 5) for value in (high - low)],
    }


def main() -> None:
    if "--" not in sys.argv:
        raise SystemExit("usage: blender --background --python script -- donor.glb [frames]")
    args = sys.argv[sys.argv.index("--") + 1:]
    path = Path(args[0]).expanduser().resolve()
    requested = [int(value) for value in args[1:]]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    action = next(iter(bpy.data.actions))
    rig.animation_data_create()
    rig.animation_data.action = action
    frames = requested or list(range(int(action.frame_range[0]), int(action.frame_range[1]) + 1, 8))

    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    for obj in bpy.data.objects:
        chain = []
        parent = obj.parent
        while parent is not None:
            chain.append(parent.name)
            parent = parent.parent
        if obj.type != "MESH" or obj.name != "Icosphere":
            print(
                "OBJECT_CHAIN=" + json.dumps({
                    "name": obj.name,
                    "type": obj.type,
                    "parent_chain": chain,
                    "parent_type": obj.parent_type,
                    "parent_bone": obj.parent_bone,
                    "action": getattr(getattr(obj, "animation_data", None), "action", None).name
                    if getattr(getattr(obj, "animation_data", None), "action", None) else "",
                    "action_slot": getattr(
                        getattr(getattr(obj, "animation_data", None), "action_slot", None),
                        "identifier",
                        "",
                    ),
                }, sort_keys=True)
            )
    for candidate in bpy.data.actions:
        slots = []
        for slot in getattr(candidate, "slots", []):
            bag = None
            if candidate.layers and candidate.layers[0].strips:
                bag = next(
                    (
                        item
                        for item in candidate.layers[0].strips[0].channelbags
                        if item.slot_handle == slot.handle
                    ),
                    None,
                )
            slots.append({
                "identifier": slot.identifier,
                "target_id_type": slot.target_id_type,
                "curves": len(bag.fcurves) if bag else 0,
                "paths": sorted({curve.data_path for curve in bag.fcurves})[:12] if bag else [],
            })
        print("ACTION_SLOTS=" + json.dumps({"action": candidate.name, "slots": slots}, sort_keys=True))
    print(f"DONOR_DETAIL file={path.name!r} rig={rig.name!r} action={action.name!r} range={tuple(action.frame_range)}")
    for obj in meshes:
        armature = next((modifier.object for modifier in obj.modifiers if modifier.type == "ARMATURE"), None)
        groups = sorted(
            ((group.name, sum(1 for vertex in obj.data.vertices if any(link.group == group.index and link.weight > 0.5 for link in vertex.groups)))
             for group in obj.vertex_groups),
            key=lambda item: item[1],
            reverse=True,
        )
        print(
            "MESH_DETAIL=" + json.dumps({
                "name": obj.name,
                "verts": len(obj.data.vertices),
                "parent": obj.parent.name if obj.parent else None,
                "armature": armature.name if armature else None,
                "groups": groups[:12],
                "bounds_frame0": bounds(obj),
            }, sort_keys=True)
        )

    proxy_names = [
        bone.name for bone in rig.pose.bones
        if not any(token in bone.name.lower() for token in (
            "wrist", "thumb", "index", "middle", "ring", "pinky", "elbow", "shoulder", "arm"
        ))
    ]
    print("PROXY_BONES=" + json.dumps(proxy_names, sort_keys=True))
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        record = {
            "frame": frame,
            "meshes": {obj.name: bounds(obj) for obj in meshes if len(obj.data.vertices) > 100},
            "bones": {
                name: {
                    "location": [round(value, 5) for value in rig.pose.bones[name].matrix.translation],
                    "scale": [round(value, 5) for value in rig.pose.bones[name].matrix.to_scale()],
                }
                for name in proxy_names
            },
        }
        print("FRAME_STATE=" + json.dumps(record, sort_keys=True))


if __name__ == "__main__":
    main()
