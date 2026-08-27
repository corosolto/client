"""Read-only inventory for the final M4 iteration sources."""
from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
SOURCES = {
    "pistol_pilot": Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb"),
    "rifle_structure": Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/ak-hires.glb"),
    "project_m4": ROOT / "public/models/weapons/m4.glb",
}


def bounds(obj: bpy.types.Object) -> dict[str, list[float]]:
    coords = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return {
        "min": [round(min(v[i] for v in coords), 6) for i in range(3)],
        "max": [round(max(v[i] for v in coords), 6) for i in range(3)],
    }


report = {}
for label, path in SOURCES.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    rigs = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    pose_samples = {}
    if label == "pistol_pilot" and rigs:
        rig = rigs[0]
        for action in bpy.data.actions:
            rig.animation_data.action = action
            frames = sorted({int(action.frame_range[0]), int(sum(action.frame_range) / 2), int(action.frame_range[1])})
            pose_samples[action.name] = {}
            for frame in frames:
                bpy.context.scene.frame_set(frame)
                bpy.context.view_layer.update()
                pose_samples[action.name][str(frame)] = {
                    bone: [round(value, 5) for value in rig.pose.bones[bone].matrix.translation]
                    for bone in ("L_elbow_00", "L_wrist_02", "R_elbow_025", "R_wrist_026", "CoroMagazine", "CoroWeapon")
                }
    report[label] = {
        "path": str(path),
        "actions": {
            action.name: [round(value, 3) for value in action.frame_range]
            for action in bpy.data.actions
        },
        "cameras": [
            {
                "name": camera.name,
                "location": [round(value, 6) for value in camera.location],
                "rotation": [round(value, 6) for value in camera.rotation_euler],
                "lens": camera.data.lens,
            }
            for camera in bpy.data.objects
            if camera.type == "CAMERA"
        ],
        "pose_samples": pose_samples,
        "rigs": [
            {
                "name": rig.name,
                "bones": [bone.name for bone in rig.data.bones],
            }
            for rig in rigs
        ],
        "meshes": [
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                "parent": obj.parent.name if obj.parent else None,
                "modifiers": [modifier.type for modifier in obj.modifiers],
                "groups": [group.name for group in obj.vertex_groups],
                "bounds": bounds(obj),
            }
            for obj in bpy.data.objects
            if obj.type == "MESH"
        ],
    }

print("FINAL_M4_SOURCE_REPORT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))
