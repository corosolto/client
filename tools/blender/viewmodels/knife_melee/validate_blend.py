"""Validate structure, provenance and strong-hand contact in the melee blend."""
from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot"
REPORT = OUT / "validation/structural_validation.json"
EVIDENCE = ROOT / "tools/eval/asset-evidence/knife-melee/structural-gate.json"
EXPECTED_ACTIONS = {"Idle", "Draw", "Slash", "Stab"}
EXPECTED_BONES = {"hand_control.R", "hand_control.L", "weapon_root", "grip_r",
                  "support_l", "muzzle", "sight"}


def world_bvh(obj: bpy.types.Object) -> BVHTree:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    polygons = [[index for index in polygon.vertices] for polygon in mesh.polygons]
    tree = BVHTree.FromPolygons(vertices, polygons, all_triangles=False)
    evaluated.to_mesh_clear()
    return tree


def main() -> None:
    rig = bpy.data.objects.get("coro_solto_melee_fp_rig")
    knife = bpy.data.objects.get("coro_solto_project_knife")
    camera = bpy.data.objects.get("Melee_Hires_FP_Camera")
    if rig is None or knife is None or camera is None:
        raise RuntimeError("Missing rig, project knife or exported camera")
    rig.animation_data_create()
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()

    tree = world_bvh(knife)
    authored_points = json.loads(rig["strong_hand_contact_points"])
    gaps = {}
    for finger, xyz in authored_points.items():
        nearest = tree.find_nearest(Vector(xyz))
        gaps[finger] = round(float(nearest[3]), 6) if nearest else None

    actions = {action.name for action in bpy.data.actions}
    bones = {bone.name for bone in rig.data.bones}
    materials = {material.name for material in bpy.data.materials}
    meshes = {obj.name for obj in bpy.data.objects if obj.type == "MESH"}
    images = [image.name for image in bpy.data.images]
    checks = {
        "actions_exact": actions == EXPECTED_ACTIONS,
        "required_bones": EXPECTED_BONES <= bones,
        "two_authored_arm_meshes": {
            "coro_solto_melee_hand_forearm.R", "coro_solto_melee_hand_forearm.L"
        } <= meshes,
        "project_knife_present": "coro_solto_project_knife" in meshes,
        "camera_export_contract": bool(camera.get("coro_viewmodel_camera")) and
                                  camera.get("reference_aspect") == "3:2",
        "donor_geometry_absent": bool(rig.get("donor_geometry_exported")) is False and
                                 not any("armmesh" in name.lower() for name in meshes),
        "donor_materials_absent": not any(token in name.lower() for name in materials
                                           for token in ("armmesh", "knife_knife_0")),
        "finger_controls_complete": sum(name.startswith("finger.") for name in bones) == 30,
        "contact_all_measured": all(value is not None for value in gaps.values()),
        "contact_max_gap": max(value for value in gaps.values() if value is not None) <= 0.025,
        "public_glb_under_5mb": (ROOT / "public/models/viewmodels/coro/melee/knife-hires.glb").stat().st_size < 5_000_000,
    }
    report = {
        "pass": all(checks.values()), "checks": checks, "actions": sorted(actions),
        "bones": len(bones), "meshes": sorted(meshes), "materials": sorted(materials),
        "packed_images": images, "strong_hand_surface_gap_m": gaps,
        "max_contact_gap_m": max(value for value in gaps.values() if value is not None),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    report_text = json.dumps(report, indent=2) + "\n"
    REPORT.write_text(report_text, encoding="utf-8")
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(report_text, encoding="utf-8")
    print("KNIFE_STRUCTURAL_VALIDATION=" + json.dumps(report, sort_keys=True))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
