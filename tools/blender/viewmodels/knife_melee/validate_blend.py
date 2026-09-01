"""Validate the approved-pistol hand contract and knife grip in the blend."""
from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot"
REPORT = OUT / "validation/structural_validation.json"
EVIDENCE = ROOT / "tools/eval/asset-evidence/knife-melee/structural-gate.json"
EXPECTED_ACTIONS = {"Idle", "Draw", "Slash", "Stab"}
REQUIRED_BONES = {
    "_rootJoint", "CoroWeapon", "R_arm_024", "R_elbow_025", "R_wrist_026",
    "R_palm_039", "L_arm_01", "L_elbow_00", "L_wrist_02", "L_palm_015",
    "R_thumb1_027", "R_thumb2_028", "R_thumb3_029",
    "R_point1_031", "R_point2_032", "R_point3_033",
}


def world_bvh(obj: bpy.types.Object) -> BVHTree:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    polygons = [[index for index in polygon.vertices] for polygon in mesh.polygons]
    tree = BVHTree.FromPolygons(vertices, polygons, all_triangles=False)
    evaluated.to_mesh_clear()
    return tree


def strong_finger_indices(hands: bpy.types.Object) -> list[int]:
    right_fingers = {
        "R_thumb1_027", "R_thumb2_028", "R_thumb3_029",
        "R_point1_031", "R_point2_032", "R_point3_033",
        "R_middle1_035", "R_middle2_036", "R_middle3_037",
        "R_ring1_040", "R_ring2_041", "R_ring3_042",
        "R_pink1_044", "R_pink2_045", "R_pink3_046",
    }
    group_names = {group.index: group.name for group in hands.vertex_groups}
    indices = []
    for vertex in hands.data.vertices:
        weight = sum(group.weight for group in vertex.groups if group_names.get(group.group) in right_fingers)
        if weight >= 0.45:
            indices.append(vertex.index)
    return indices


def main() -> None:
    rig = bpy.data.objects.get("coro_solto_hires_melee_rig")
    hands = bpy.data.objects.get("coro_solto_hires_melee_hands")
    knife = bpy.data.objects.get("coro_solto_project_knife")
    camera = bpy.data.objects.get("Melee_Hires_FP_Camera")
    if None in (rig, hands, knife, camera):
        raise RuntimeError("Missing professional hands, rig, project knife or camera")

    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    tree = world_bvh(knife)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = hands.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh()
    finger_indices = strong_finger_indices(hands)
    gaps = []
    for index in finger_indices:
        nearest = tree.find_nearest(evaluated.matrix_world @ evaluated_mesh.vertices[index].co)
        if nearest:
            gaps.append(float(nearest[3]))
    evaluated.to_mesh_clear()
    gaps.sort()
    near_vertices = sum(value <= 1.1 for value in gaps)

    actions = {action.name for action in bpy.data.actions}
    bones = {bone.name for bone in rig.data.bones}
    meshes = {obj.name for obj in bpy.data.objects if obj.type == "MESH"}
    materials = {material.name for material in bpy.data.materials}
    checks = {
        "actions_exact": actions == EXPECTED_ACTIONS,
        "approved_rig_bones": len(bones) == 52 and REQUIRED_BONES <= bones,
        "single_professional_hand_mesh": meshes == {"coro_solto_hires_melee_hands", "coro_solto_project_knife"},
        "professional_topology": len(hands.data.vertices) == 7438 and len(hands.data.polygons) == 13700,
        "approved_pistol_material": [material.name for material in hands.data.materials] == ["CoroSolto_FP_Gloves"],
        "approved_source_recorded": rig.get("melee_hand_contract") == "approved-pistol-hires-mesh-material-rig",
        "project_knife_recorded": rig.get("project_weapon") == "public/models/weapons/knife.glb",
        "donor_knife_absent": not rig.get("donor_knife_geometry_exported") and
                              not rig.get("donor_knife_materials_exported"),
        "camera_export_contract": bool(camera.get("coro_viewmodel_camera")) and camera.get("reference_aspect") == "3:2",
        "strong_fingers_sampled": len(finger_indices) >= 1000,
        "strong_grip_surface_contact": near_vertices >= 16 and gaps and gaps[0] <= 0.12,
        "public_glb_under_5mb": (ROOT / "public/models/viewmodels/coro/melee/knife-hires.glb").stat().st_size < 5_000_000,
    }
    report = {
        "pass": all(checks.values()), "checks": checks, "actions": sorted(actions),
        "bones": len(bones), "meshes": sorted(meshes), "materials": sorted(materials),
        "professional_hand_vertices": len(hands.data.vertices),
        "strong_finger_vertices": len(finger_indices), "strong_finger_vertices_within_1_1cm": near_vertices,
        "minimum_grip_gap_cm": round(gaps[0], 6) if gaps else None,
        "p10_grip_gap_cm": round(gaps[max(0, len(gaps) // 10 - 1)], 6) if gaps else None,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(report, indent=2) + "\n"
    REPORT.write_text(text, encoding="utf-8")
    EVIDENCE.write_text(text, encoding="utf-8")
    print("KNIFE_STRUCTURAL_VALIDATION=" + json.dumps(report, sort_keys=True))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
