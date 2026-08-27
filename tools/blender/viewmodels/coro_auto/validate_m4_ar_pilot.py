"""Validate the non-integrated AR-family M4 pilot, including its visual verdict."""
from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-ar-pilot"
GLB = OUT / "candidate-m4-ar-pilot.glb"
VISUAL = OUT / "visual_review.json"
BUILD = OUT / "build_report.json"
REPORT = OUT / "validation_report.json"
SAMPLES = {"Idle": (0, 40, 80), "Shoot": (0, 4, 8), "Reload": (0, 12, 24, 40, 56, 64, 80)}


def max_matrix_delta(left: Matrix, right: Matrix) -> float:
    return max(abs(left[row][column] - right[row][column]) for row in range(4) for column in range(4))


def point_aabb_distance(point: Vector, minimum: list[float], maximum: list[float]) -> float:
    squared = 0.0
    for axis in range(3):
        if point[axis] < minimum[axis]:
            squared += (minimum[axis] - point[axis]) ** 2
        elif point[axis] > maximum[axis]:
            squared += (point[axis] - maximum[axis]) ** 2
    return math.sqrt(squared)


def evaluated_bounds(obj: bpy.types.Object) -> tuple[list[float], list[float]]:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
    return (
        [min(point[axis] for point in points) for axis in range(3)],
        [max(point[axis] for point in points) for axis in range(3)],
    )


def main() -> int:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    rig = bpy.data.objects.get("coro_auto_m4_ar_dedicated_rig")
    hands = bpy.data.objects.get("coro_solto_pistol_hands_geometry_literal")
    body = bpy.data.objects.get("coro_auto_project_m4_ar_body")
    magazine = bpy.data.objects.get("coro_auto_m4_ar_closed_magazine")
    visual = json.loads(VISUAL.read_text(encoding="utf-8"))
    build = json.loads(BUILD.read_text(encoding="utf-8"))
    checks: dict[str, dict[str, object]] = {}

    hand_meshes = [obj for obj in bpy.data.objects if obj.type == "MESH" and "hands_geometry" in obj.name]
    checks["literal_hand_mesh"] = {
        "pass": len(hand_meshes) == 1 and hands is not None and len(hands.data.vertices) == 7438,
        "count": len(hand_meshes),
        "vertices": len(hands.data.vertices) if hands else None,
        "material": hands.material_slots[0].material.name if hands and hands.material_slots else None,
    }
    action_names = sorted(action.name for action in bpy.data.actions)
    checks["actions"] = {"pass": action_names == ["Idle", "Reload", "Shoot"], "names": action_names}
    checks["candidate_objects"] = {
        "pass": all(obj is not None for obj in (rig, hands, body, magazine)),
        "names": [obj.name if obj else None for obj in (rig, hands, body, magazine)],
    }

    armature_modifiers = [modifier for modifier in magazine.modifiers if modifier.type == "ARMATURE"]
    magazine_groups = [group.name for group in magazine.vertex_groups]
    checks["authored_magazine_structure"] = {
        "pass": (
            build["magazine"].get("source_boundary_edges") == 0
            and build["magazine"].get("own_feed_tower") is True
            and build["magazine"].get("own_origin_pivot") is True
            and len(armature_modifiers) == 1
            and "M4Magazine" in magazine_groups
        ),
        "vertices": len(magazine.data.vertices),
        "source_boundary_edges": build["magazine"].get("source_boundary_edges"),
        "note": "glTF import splits vertices at normals/skin seams; closure is measured on the authored source before export.",
        "armature_modifiers": len(armature_modifiers),
        "m4_magazine_group_present": "M4Magazine" in magazine_groups,
        "material": magazine.material_slots[0].material.name,
    }

    strong_drift = 0.0
    reference_relative = None
    for action_name, frames in SAMPLES.items():
        rig.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            relative = rig.pose.bones["CoroWeapon"].matrix.inverted() @ rig.pose.bones["R_wrist_026"].matrix
            reference_relative = relative.copy() if reference_relative is None else reference_relative
            strong_drift = max(strong_drift, max_matrix_delta(reference_relative, relative))
    checks["dominant_wrist_fixed_to_weapon"] = {"pass": strong_drift < 0.0001, "max_matrix_delta": strong_drift}

    rig.animation_data.action = bpy.data.actions["Shoot"]
    bpy.context.scene.frame_set(0)
    base_weapon = rig.pose.bones["CoroWeapon"].matrix.translation.copy()
    bpy.context.scene.frame_set(4)
    recoil_distance = (rig.pose.bones["CoroWeapon"].matrix.translation - base_weapon).length
    checks["fire_recoil_motion"] = {"pass": recoil_distance >= 1.2, "frame_0_to_4_distance": recoil_distance}

    rig.animation_data.action = bpy.data.actions["Reload"]
    contact_distances = {}
    magazine_positions = []
    for frame in (12, 24, 40, 56, 64):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        minimum, maximum = evaluated_bounds(magazine)
        wrist = rig.matrix_world @ rig.pose.bones["L_wrist_02"].matrix.translation
        contact_distances[str(frame)] = point_aabb_distance(wrist, minimum, maximum)
        magazine_positions.append(rig.pose.bones["M4Magazine"].matrix.translation.copy())
    path_span = max((point - magazine_positions[0]).length for point in magazine_positions)
    checks["reload_magazine_path"] = {
        "pass": path_span >= 8.0,
        "bone_path_span": path_span,
        "support_wrist_to_magazine_aabb": contact_distances,
        "note": "AABB proximity is structural evidence only; visible contact remains a visual gate.",
    }

    manual_failures = [name for name, result in visual["gates"].items() if result == "FAIL"]
    checks["browser_visual_gate"] = {
        "pass": visual["status"] == "PASS" and not manual_failures,
        "status": visual["status"],
        "failures": manual_failures,
        "evidence": visual["reviewed_evidence"],
    }
    structural_pass = all(value["pass"] for name, value in checks.items() if name != "browser_visual_gate")
    overall_pass = all(value["pass"] for value in checks.values())
    report = {
        "schema": "coro_auto.m4_ar.validation.v1",
        "candidate": str(GLB.relative_to(ROOT)),
        "structural_status": "PASS" if structural_pass else "FAIL",
        "visual_status": visual["status"],
        "overall_status": "PASS" if overall_pass else "FAIL",
        "propagation": "ALLOWED" if overall_pass else "BLOCKED",
        "checks": checks,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("M4_AR_VALIDATION=" + json.dumps(report, sort_keys=True))
    return 0 if overall_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
