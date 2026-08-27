"""Inventory donor rigs/actions/pivots without exporting donor visual assets."""
from __future__ import annotations

import json
import re
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-retarget-pilot/donor-compatibility"
SOURCES = {
    "m4a1_motion_donor": Path("/Users/ruben/Downloads/m4a1_animated_low_poly.glb"),
    "hk416_motion_donor": Path("/Users/ruben/Downloads/hk_416_a7_fps_animation.glb"),
    "approved_hands": Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb"),
    "project_m4": ROOT / "public/models/weapons/m4.glb",
}
BONE_PATH = re.compile(r'pose\.bones\["([^"]+)"\]')
SOCKET_TERMS = ("weapon", "gun", "rifle", "mag", "clip", "hand", "wrist", "camera", "root", "trigger")
POSE_BONES = (
    "Gun_052", "Mag_054", "r_upperarm_08", "r_forearm_09", "r_wrist_010",
    "r_index_low_017", "r_index_mid_018", "r_index_tip_019",
    "l_upperarm_029", "l_forearm_030", "l_wrist_031",
    "ARMA_043", "CARGADOR_051", "mixamorig2:RightArm_05",
    "mixamorig2:RightForeArm.001_09", "mixamorig2:RightHand_010",
    "mixamorig2:RightHandIndex1_014", "mixamorig2:RightHandIndex2_015",
    "mixamorig2:RightHandIndex3_016", "mixamorig2:LeftArm_00",
    "mixamorig2:LeftForeArm.001_026", "mixamorig2:LeftHand_027",
)


def bounds(obj: bpy.types.Object) -> dict[str, list[float]]:
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return {
        "min": [round(min(point[axis] for point in points), 6) for axis in range(3)],
        "max": [round(max(point[axis] for point in points), 6) for axis in range(3)],
        "center": [round((min(point[axis] for point in points) + max(point[axis] for point in points)) / 2, 6) for axis in range(3)],
    }


def action_info(action: bpy.types.Action) -> dict[str, object]:
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                channelbag = strip.channelbag(slot, ensure=False)
                if channelbag:
                    curves.extend(channelbag.fcurves)
    bones = sorted({match.group(1) for curve in curves if (match := BONE_PATH.search(curve.data_path))})
    frame_start, frame_end = action.frame_range
    return {
        "name": action.name,
        "frame_range": [round(frame_start, 3), round(frame_end, 3)],
        "duration_frames": round(frame_end - frame_start, 3),
        "fcurves": len(curves),
        "keyframes": sum(len(curve.keyframe_points) for curve in curves),
        "animated_bones": bones,
        "animated_bone_count": len(bones),
    }


def armature_info(obj: bpy.types.Object) -> dict[str, object]:
    bones = []
    for bone in obj.data.bones:
        bones.append({
            "name": bone.name,
            "parent": bone.parent.name if bone.parent else None,
            "head": [round(value, 6) for value in bone.head_local],
            "tail": [round(value, 6) for value in bone.tail_local],
            "length": round(bone.length, 6),
        })
    socket_candidates = [bone["name"] for bone in bones if any(term in bone["name"].lower() for term in SOCKET_TERMS)]
    return {
        "name": obj.name,
        "matrix_world": [[round(value, 6) for value in row] for row in obj.matrix_world],
        "bone_count": len(bones),
        "bones": bones,
        "socket_candidates": socket_candidates,
    }


def action_pose_samples(armatures: list[bpy.types.Object], action: bpy.types.Action) -> dict[str, object]:
    rig = max(armatures, key=lambda item: len(item.pose.bones), default=None)
    if rig is None:
        return {}
    rig.animation_data_create()
    rig.animation_data.action = action
    start, end = action.frame_range
    frames = sorted({round(start + (end - start) * fraction, 3) for fraction in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)})
    samples = {}
    for frame in frames:
        bpy.context.scene.frame_set(int(frame), subframe=frame - int(frame))
        bpy.context.view_layer.update()
        samples[str(frame)] = {
            name: {
                "translation": [round(value, 6) for value in rig.pose.bones[name].matrix.translation],
                "quaternion": [round(value, 6) for value in rig.pose.bones[name].matrix.to_quaternion()],
            }
            for name in POSE_BONES if name in rig.pose.bones
        }
    return samples


def inspect_source(label: str, path: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    cameras = [obj for obj in bpy.context.scene.objects if obj.type == "CAMERA"]
    return {
        "label": label,
        "path": str(path),
        "objects": [{"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None} for obj in bpy.context.scene.objects],
        "armatures": [armature_info(obj) for obj in armatures],
        "actions": [action_info(action) for action in bpy.data.actions],
        "action_pose_samples": {action.name: action_pose_samples(armatures, action) for action in bpy.data.actions},
        "cameras": [{
            "name": obj.name,
            "location": [round(value, 6) for value in obj.location],
            "rotation_quaternion": [round(value, 6) for value in obj.rotation_quaternion],
            "lens": round(obj.data.lens, 6),
        } for obj in cameras],
        "meshes_forbidden_for_output": [{
            "name": obj.name,
            "vertices": len(obj.data.vertices),
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "bounds": bounds(obj),
        } for obj in meshes],
    }


def build_compatibility(raw: dict[str, dict[str, object]]) -> dict[str, object]:
    pistol_bones = {bone["name"] for armature in raw["approved_hands"]["armatures"] for bone in armature["bones"]}
    donors = {}
    for label in ("m4a1_motion_donor", "hk416_motion_donor"):
        donor_bones = {bone["name"] for armature in raw[label]["armatures"] for bone in armature["bones"]}
        exact = sorted(pistol_bones & donor_bones)
        actions = raw[label]["actions"]
        donors[label] = {
            "donor_bones": len(donor_bones),
            "approved_hand_bones": len(pistol_bones),
            "exact_name_overlap": exact,
            "exact_name_overlap_count": len(exact),
            "actions": [{"name": action["name"], "frame_range": action["frame_range"], "animated_bone_count": action["animated_bone_count"]} for action in actions],
            "camera_count": len(raw[label]["cameras"]),
            "socket_candidates": [candidate for armature in raw[label]["armatures"] for candidate in armature["socket_candidates"]],
        }
    inspection = {}
    for label, source in raw.items():
        compact = {
            "path": source["path"],
            "armatures": [{
                "name": armature["name"],
                "bone_count": armature["bone_count"],
                "bone_names": [bone["name"] for bone in armature["bones"]],
                "socket_candidates": armature["socket_candidates"],
                "socket_pivots": [bone for bone in armature["bones"] if bone["name"] in armature["socket_candidates"]],
            } for armature in source["armatures"]],
            "actions": [{key: action[key] for key in ("name", "frame_range", "duration_frames", "fcurves", "keyframes", "animated_bone_count")} for action in source["actions"]],
            "cameras": source["cameras"],
            "visual_assets_forbidden_for_output": [{key: mesh[key] for key in ("name", "vertices", "materials")} for mesh in source["meshes_forbidden_for_output"]],
        }
        if label == "m4a1_motion_donor":
            compact["motion_pivot_samples"] = {
                action_name: {
                    frame: {name: pose[name] for name in ("Gun_052", "Mag_054", "r_wrist_010", "l_wrist_031") if name in pose}
                    for frame, pose in samples.items()
                }
                for action_name, samples in source["action_pose_samples"].items() if action_name in {"Fire", "Reload"}
            }
        inspection[label] = compact
    return {
        "schema": "coro_auto.m4_retarget.compatibility.v1",
        "order_guarantee": "This report is generated before any retarget candidate.",
        "donor_visual_asset_policy": "Meshes, materials and skins listed in raw inventory are inspection-only and forbidden from candidate export.",
        "inspection": inspection,
        "compatibility": donors,
        "decision": {
            "preferred_motion_donor": "m4a1_motion_donor",
            "preferred_actions": {
                "Idle": "M4A1 Fire frame 0 hold pose",
                "Shoot": "M4A1 Fire frames 0-4",
                "Reload": "M4A1 Reload frames 0-44",
                "ADS": "approved project camera aligned to explicit project M4 sight socket; donors contain no camera object",
            },
            "reload_review_frames": [0, 9, 18, 26, 44],
            "rejected_as_primary": {
                "hk416_motion_donor": "one monolithic Scene action (0.8-608), two armatures and no camera object; useful only as a secondary pose reference",
            },
            "retarget_strategy": "explicit semantic bone map plus project-owned grip/trigger/support/magwell/magazine sockets",
            "semantic_bone_map": {
                "Gun_052": "CoroWeapon",
                "Mag_054": "M4MagazinePivot",
                "r_upperarm_08": "R_arm_024",
                "r_forearm_09": "R_elbow_025",
                "r_wrist_010": "R_wrist_026",
                "r_index_low_017": "R_point1_031",
                "r_index_mid_018": "R_point2_032",
                "r_index_tip_019": "R_point3_033",
                "l_upperarm_029": "L_arm_01",
                "l_forearm_030": "L_elbow_00",
                "l_wrist_031": "L_wrist_02"
            },
            "direct_rig_copy_allowed": False,
            "donor_mesh_export_allowed": False,
        },
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    raw = {label: inspect_source(label, path) for label, path in SOURCES.items()}
    report = build_compatibility(raw)
    path = OUT / "compatibility.json"
    path.write_text(json.dumps(report, separators=(",", ":")) + "\n", encoding="utf-8")
    print("M4_DONOR_COMPATIBILITY=" + json.dumps({
        "path": str(path.relative_to(ROOT)),
        "compatibility": report["compatibility"],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
