"""Validate the exported CORO SOLTO M4 pilot against its hand-contact contract."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_GLB = ROOT / "public/models/viewmodels/coro-auto/m4-pilot.glb"
DEFAULT_REPORT = ROOT / "artifacts/viewmodels/coro-auto/m4-pilot/validation/m4_contract.json"
ACTION_RANGES = {"Idle": range(0, 81), "Shoot": range(0, 11), "Reload": range(0, 81)}


def cli_paths() -> tuple[Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return (
        Path(args[0]).resolve() if args else DEFAULT_GLB,
        Path(args[1]).resolve() if len(args) > 1 else DEFAULT_REPORT,
    )


def action_named(name: str) -> bpy.types.Action:
    matches = [action for action in bpy.data.actions if action.name == name or action.name.endswith(f"|{name}")]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one {name} action, found {[action.name for action in matches]}")
    return matches[0]


def relative_drift(
    rig: bpy.types.Object,
    action: bpy.types.Action,
    reference_bone: str,
    tracked_bone: str,
    frames: range,
) -> dict[str, float]:
    rig.animation_data.action = action
    reference: Matrix | None = None
    max_translation = 0.0
    max_rotation = 0.0
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        relative = rig.pose.bones[reference_bone].matrix.inverted() @ rig.pose.bones[tracked_bone].matrix
        if reference is None:
            reference = relative.copy()
            continue
        assert reference is not None
        max_translation = max(max_translation, (relative.translation - reference.translation).length)
        max_rotation = max(
            max_rotation,
            math.degrees(reference.to_quaternion().rotation_difference(relative.to_quaternion()).angle),
        )
    return {
        "max_translation_m": round(max_translation, 7),
        "max_rotation_deg": round(max_rotation, 5),
    }


def bone_motion_extent(
    rig: bpy.types.Object,
    action: bpy.types.Action,
    bone_name: str,
    frames: range,
) -> dict[str, float]:
    """Measure visible motion from the first pose and the final return error."""
    rig.animation_data.action = action
    start: Matrix | None = None
    last: Matrix | None = None
    max_translation = 0.0
    max_rotation = 0.0
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        current = rig.pose.bones[bone_name].matrix.copy()
        if start is None:
            start = current
        else:
            max_translation = max(max_translation, (current.translation - start.translation).length)
            max_rotation = max(
                max_rotation,
                math.degrees(start.to_quaternion().rotation_difference(current.to_quaternion()).angle),
            )
        last = current
    assert start is not None and last is not None
    return {
        "max_translation_m": round(max_translation, 7),
        "max_rotation_deg": round(max_rotation, 5),
        "return_translation_m": round((last.translation - start.translation).length, 7),
        "return_rotation_deg": round(
            math.degrees(start.to_quaternion().rotation_difference(last.to_quaternion()).angle), 5
        ),
    }


def evaluated_points(obj: bpy.types.Object) -> list[Vector]:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]


def side_points(hands: bpy.types.Object, side: str) -> list[Vector]:
    evaluated = hands.evaluated_get(bpy.context.evaluated_depsgraph_get())
    side_tokens = (".L_", ".L.") if side == "left" else (".R_", ".R.")
    side_groups = {
        group.index for group in hands.vertex_groups if any(token in group.name for token in side_tokens)
    }
    result: list[Vector] = []
    for source, deformed in zip(hands.data.vertices, evaluated.data.vertices):
        side_weight = sum(link.weight for link in source.groups if link.group in side_groups)
        if side_weight > 0.5:
            result.append(evaluated.matrix_world @ deformed.co)
    if not result:
        raise RuntimeError(f"No {side} hand vertices found")
    return result


def minimum_distance(points_a: list[Vector], points_b: list[Vector]) -> float:
    tree = KDTree(len(points_b))
    for index, point in enumerate(points_b):
        tree.insert(point, index)
    tree.balance()
    return min(tree.find(point)[2] for point in points_a)


def sampled_surface_distances(
    rig: bpy.types.Object,
    action: bpy.types.Action,
    hands: bpy.types.Object,
    target: bpy.types.Object,
    side: str,
    frames: list[int],
) -> dict[str, float]:
    rig.animation_data.action = action
    distances: dict[str, float] = {}
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        distance = minimum_distance(side_points(hands, side), evaluated_points(target))
        distances[str(frame)] = round(distance, 6)
    return distances


def main() -> None:
    glb, report_path = cli_paths()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    rigs = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    cameras = [obj for obj in bpy.data.objects if obj.type == "CAMERA"]
    project = {obj.name: obj for obj in bpy.data.objects if obj.name.startswith("coro_auto_project_m4_")}
    rig = rigs[0] if len(rigs) == 1 else None
    actions = {name: action_named(name) for name in ACTION_RANGES}
    hands = bpy.data.objects.get("coro_solto_hires_gloved_hands")
    forbidden = [
        obj.name
        for obj in bpy.data.objects
        if obj.type == "MESH" and ("assault_ak" in obj.name.lower() or obj.name.lower() == "cylinder")
    ]
    if rig is None or hands is None:
        raise RuntimeError("Export must contain exactly one armature and the project hands")

    body = project.get("coro_auto_project_m4_body")
    old_mag = project.get("coro_auto_project_m4_magazine")
    new_mag = project.get("coro_auto_project_m4_replacement_magazine")
    if not all((body, old_mag, new_mag)):
        raise RuntimeError(f"Missing project M4 objects: {sorted(project)}")

    strong_drift = {
        name: relative_drift(rig, action, "Rifle_metarig", "hand.R_metarig", ACTION_RANGES[name])
        for name, action in actions.items()
    }
    support_fire_drift = relative_drift(
        rig, actions["Shoot"], "Rifle_metarig", "hand.L_metarig", ACTION_RANGES["Shoot"]
    )
    fire_recoil = bone_motion_extent(
        rig, actions["Shoot"], "Rifle_metarig", ACTION_RANGES["Shoot"]
    )
    removal_drift = relative_drift(
        rig, actions["Reload"], "Mag_metarig", "hand.L_metarig", range(20, 33)
    )
    insertion_drift = relative_drift(
        rig, actions["Reload"], "Mag_metarig", "hand.L_metarig", range(36, 61)
    )
    strong_surface = sampled_surface_distances(
        rig, actions["Shoot"], hands, body, "right", [0, 5, 10]
    )
    support_surface = sampled_surface_distances(
        rig, actions["Shoot"], hands, body, "left", [0, 5, 10]
    )
    removal_surface = sampled_surface_distances(
        rig, actions["Reload"], hands, old_mag, "left", [20, 24, 28, 32]
    )
    insertion_surface = sampled_surface_distances(
        rig, actions["Reload"], hands, old_mag, "left", [36, 40, 44, 48, 52, 56, 60]
    )

    checks = {
        "one_armature": len(rigs) == 1,
        "one_camera": len(cameras) == 1,
        "required_actions": set(actions) == set(ACTION_RANGES),
        "project_weapon_objects": len(project) == 3,
        "no_donor_weapon_objects": not forbidden,
        "strong_hand_fixed_to_weapon": all(
            value["max_translation_m"] <= 0.002 and value["max_rotation_deg"] <= 0.5
            for value in strong_drift.values()
        ),
        "support_hand_fixed_during_fire": (
            support_fire_drift["max_translation_m"] <= 0.004
            and support_fire_drift["max_rotation_deg"] <= 0.75
        ),
        "fire_recoil_short_readable_and_returns": (
            0.030 <= fire_recoil["max_translation_m"] <= 0.080
            and 2.0 <= fire_recoil["max_rotation_deg"] <= 6.0
            and fire_recoil["return_translation_m"] <= 0.002
            and fire_recoil["return_rotation_deg"] <= 0.5
        ),
        "removal_contact_transform_continuous": (
            removal_drift["max_translation_m"] <= 0.004 and removal_drift["max_rotation_deg"] <= 0.75
        ),
        "insertion_contact_transform_continuous": (
            insertion_drift["max_translation_m"] <= 0.004 and insertion_drift["max_rotation_deg"] <= 0.75
        ),
        # Surface distance is a secondary guard.  Visual inspection remains
        # the hard gate because nearest vertices cannot detect bad finger pose.
        "strong_hand_surface_contact": max(strong_surface.values()) <= 0.006,
        "support_hand_surface_contact": max(support_surface.values()) <= 0.006,
        "removal_mag_surface_contact": max(removal_surface.values()) <= 0.010,
        "insertion_mag_surface_contact": max(insertion_surface.values()) <= 0.010,
    }
    report = {
        "schema": "coro_auto_m4_contract_validation.v1",
        "asset": str(glb.relative_to(ROOT)),
        "contract_source": "/Users/ruben/csbrasil/client/artifacts/pistol-pilot-14/browser-qa/visual-qa.md",
        "checks": checks,
        "metrics": {
            "strong_hand_relative_drift": strong_drift,
            "support_fire_relative_drift": support_fire_drift,
            "fire_recoil_extent": fire_recoil,
            "removal_relative_drift": removal_drift,
            "insertion_relative_drift": insertion_drift,
            "strong_hand_surface_distance_m": strong_surface,
            "support_hand_surface_distance_m": support_surface,
            "removal_mag_surface_distance_m": removal_surface,
            "insertion_mag_surface_distance_m": insertion_surface,
        },
        "visual_gate": "manual_contact_sheet_inspection_required",
        "passed": all(checks.values()),
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("M4_CONTRACT_VALIDATION=" + json.dumps(report, sort_keys=True))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
