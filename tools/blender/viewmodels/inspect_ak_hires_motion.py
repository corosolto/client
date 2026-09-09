"""Print numeric first-person contact diagnostics for the AK pilot scene."""

from __future__ import annotations

import json
import re

import bpy
from mathutils import Vector


FRAMES = (0, 15, 20, 28, 34, 42, 50, 60, 68, 76, 86, 100)
IMPORTANT = re.compile(r"hand|wrist|finger|thumb|index|middle|ring|pinky|mag|rifle|bolt", re.I)


def world_bone_location(rig: bpy.types.Object, name: str) -> Vector:
    return rig.matrix_world @ rig.pose.bones[name].matrix.translation


def evaluated_world_centroid(obj: bpy.types.Object) -> Vector:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        return sum(points, Vector()) / max(1, len(points))
    finally:
        evaluated.to_mesh_clear()


def principal_axis(obj: bpy.types.Object) -> Vector:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        center = sum(points, Vector()) / max(1, len(points))
        covariance = [[0.0] * 3 for _ in range(3)]
        for point in points:
            delta = point - center
            for row in range(3):
                for column in range(3):
                    covariance[row][column] += delta[row] * delta[column]
        axis = Vector((1.0, 1.0, 0.2)).normalized()
        for _ in range(20):
            axis = Vector(
                sum(covariance[row][column] * axis[column] for column in range(3))
                for row in range(3)
            ).normalized()
        return axis
    finally:
        evaluated.to_mesh_clear()


def main() -> None:
    scene = bpy.context.scene
    rig = bpy.data.objects["coro_solto_hires_fp_rig"]
    reload_action = bpy.data.actions["Reload"]
    rig.animation_data_create()
    rig.animation_data.action = reload_action
    names = [bone.name for bone in rig.pose.bones if IMPORTANT.search(bone.name)]
    print("AK_INSPECT_BONES=" + json.dumps(names))

    hand_names = [name for name in names if re.search(r"hand|wrist", name, re.I)]
    finger_names = [name for name in names if re.search(r"finger|thumb|index|middle|ring|pinky", name, re.I)]
    magazine = bpy.data.objects["coro_solto_project_ak_replacement_magazine"]
    seated = bpy.data.objects["coro_solto_project_ak_magazine"]
    body = bpy.data.objects["coro_solto_project_ak_body"]

    for label, obj in (("project_mag", seated), ("replacement_mag", magazine)):
        points = [vertex.co for vertex in obj.data.vertices]
        center = sum(points, Vector()) / len(points)
        mins = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
        maxs = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
        print(
            "AK_INSPECT_REST="
            + json.dumps(
                {"label": label, "center": list(center), "min": list(mins), "max": list(maxs)},
                sort_keys=True,
            )
        )

    scene.frame_set(100)
    bpy.context.view_layer.update()
    axis = principal_axis(body)
    camera_forward = -(scene.camera.matrix_world.to_quaternion() @ Vector((0.0, 0.0, 1.0)))
    print(
        "AK_INSPECT_VIEW="
        + json.dumps(
            {
                "principal_axis": [round(value, 5) for value in axis],
                "camera_forward": [round(value, 5) for value in camera_forward],
                "abs_axis_dot_view": round(abs(axis.dot(camera_forward)), 5),
            },
            sort_keys=True,
        )
    )

    for frame in FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        fresh_center = evaluated_world_centroid(magazine)
        seated_center = evaluated_world_centroid(seated)
        record = {
            "frame": frame,
            "fresh_mag": [round(value, 5) for value in fresh_center],
            "seated_mag": [round(value, 5) for value in seated_center],
            "hands": {
                name: [round(value, 5) for value in world_bone_location(rig, name)]
                for name in hand_names
            },
            "nearest_fingers": sorted(
                (
                    round((world_bone_location(rig, name) - fresh_center).length, 5),
                    name,
                )
                for name in finger_names
            )[:8],
        }
        print("AK_INSPECT_FRAME=" + json.dumps(record, sort_keys=True))


if __name__ == "__main__":
    main()
