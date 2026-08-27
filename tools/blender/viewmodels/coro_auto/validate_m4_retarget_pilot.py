"""Validate the exported M4 retarget candidate and enforce its visual verdict."""
from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-retarget-pilot"
GLB = OUT / "candidate-m4-retarget-pilot.glb"
VISUAL = OUT / "visual_review.json"
REPORT = OUT / "validation_report.json"
SOCKETS = {"GripSocket", "TriggerSocket", "SupportSocket", "MagwellSocket", "M4MagazinePivot"}
FORBIDDEN = ("Cube_GunPlastic", "Cube_GunMetal", "broke's css", "GunPlastic", "GunMetal", "Ch22_Body", "Upper_reciever")
SAMPLES = {"Idle": (0, 40, 80), "Shoot": (0, 4, 8), "Reload": (0, 9, 18, 26, 44)}


def matrix_delta(left: Matrix, right: Matrix) -> float:
    return max(abs(left[row][column] - right[row][column]) for row in range(4) for column in range(4))


def main() -> int:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    visual = json.loads(VISUAL.read_text(encoding="utf-8"))
    rig = bpy.data.objects.get("coro_auto_m4_retarget_rig")
    hands = bpy.data.objects.get("coro_solto_pistol_hands_geometry_literal")
    magazine = bpy.data.objects.get("coro_auto_m4_retarget_closed_magazine")
    mesh_names = [obj.name for obj in bpy.data.objects if obj.type == "MESH"]
    material_names = [material.name for material in bpy.data.materials]
    action_names = sorted(action.name for action in bpy.data.actions)
    bone_names = {bone.name for bone in rig.data.bones}
    checks = {
        "no_donor_visual_assets": {
            "pass": not any(term in name for term in FORBIDDEN for name in (*mesh_names, *material_names)),
            "meshes": mesh_names,
            "materials": material_names,
        },
        "approved_hands": {
            "pass": hands is not None and len(hands.data.vertices) == 7438 and hands.material_slots[0].material.name == "CoroSolto_FP_Gloves",
            "vertices": len(hands.data.vertices) if hands else None,
        },
        "actions": {"pass": action_names == ["Idle", "Reload", "Shoot"], "names": action_names},
        "sockets": {"pass": SOCKETS <= bone_names, "present": sorted(SOCKETS & bone_names)},
        "closed_project_magazine": {
            "pass": magazine is not None and magazine.material_slots[0].material.name == "CoroAuto_M4_Retarget_Magazine",
            "export_vertices": len(magazine.data.vertices) if magazine else None,
        },
    }

    strong_drift = 0.0
    trigger_drift = 0.0
    strong_reference = None
    trigger_reference = None
    for action_name, frames in SAMPLES.items():
        rig.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            strong_relative = rig.pose.bones["CoroWeapon"].matrix.inverted() @ rig.pose.bones["R_wrist_026"].matrix
            trigger_relative = rig.pose.bones["TriggerSocket"].matrix.inverted() @ rig.pose.bones["R_point3_033"].matrix
            strong_reference = strong_relative.copy() if strong_reference is None else strong_reference
            trigger_reference = trigger_relative.copy() if trigger_reference is None else trigger_reference
            strong_drift = max(strong_drift, matrix_delta(strong_reference, strong_relative))
            trigger_drift = max(trigger_drift, matrix_delta(trigger_reference, trigger_relative))
    checks["dominant_socket_stability"] = {"pass": strong_drift < 0.001 and trigger_drift < 0.001, "wrist_matrix_delta": strong_drift, "trigger_index_matrix_delta": trigger_drift}

    rig.animation_data.action = bpy.data.actions["Reload"]
    support_mag_distances = {}
    for frame in (9, 18, 26):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        support_mag_distances[str(frame)] = (rig.pose.bones["L_wrist_02"].matrix.translation - rig.pose.bones["M4MagazinePivot"].matrix.translation).length
    checks["support_magazine_socket_distance"] = {
        "pass": max(support_mag_distances.values()) - min(support_mag_distances.values()) < 0.25,
        "distances": support_mag_distances,
        "note": "Stable bone distance cannot override visible palm separation in the browser gate.",
    }

    visual_failures = [name for name, value in visual["gates"].items() if value == "FAIL"]
    checks["browser_visual_gate"] = {"pass": visual["status"] == "PASS" and not visual_failures, "status": visual["status"], "failures": visual_failures, "evidence": visual["evidence"]}
    structural_names = [name for name in checks if name != "browser_visual_gate"]
    structural_pass = all(checks[name]["pass"] for name in structural_names)
    overall_pass = all(check["pass"] for check in checks.values())
    report = {
        "schema": "coro_auto.m4_retarget.validation.v1",
        "candidate": str(GLB.relative_to(ROOT)),
        "structural_status": "PASS" if structural_pass else "FAIL",
        "visual_status": visual["status"],
        "overall_status": "PASS" if overall_pass else "FAIL",
        "propagation": "ALLOWED" if overall_pass else "BLOCKED",
        "checks": checks,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("M4_RETARGET_VALIDATION=" + json.dumps(report, sort_keys=True))
    return 0 if overall_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
