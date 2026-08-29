"""Inspect the CC0 donor magazine geometry-to-bone registration.

This is a read-only diagnostic. It measures the hidden donor mesh so the
project magazine can inherit the animation's intended palm contact without
shipping any donor weapon geometry or material.
"""
from pathlib import Path

import bpy
from mathutils import Vector


DONOR = Path.home() / "Downloads" / "ak-12animated.glb"


def weighted_vertices(obj, group_name):
    group = obj.vertex_groups.get(group_name)
    if group is None:
        return []
    result = []
    for vertex in obj.data.vertices:
        weight = 0.0
        for membership in vertex.groups:
            if membership.group == group.index:
                weight = membership.weight
                break
        if weight > 0.5:
            result.append(vertex.co.copy())
    return result


def evaluated_centroid(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        return sum(points, Vector()) / len(points)
    finally:
        evaluated.to_mesh_clear()


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    print("DONOR_RIG", rig.name)
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for group_name in ("Mag_metarig", "Mag.001_metarig"):
            points = weighted_vertices(obj, group_name)
            if not points:
                continue
            center = sum(points, Vector()) / len(points)
            mins = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
            maxs = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
            print("DONOR_MAG", obj.name, group_name, "count", len(points), "center", list(center), "min", list(mins), "max", list(maxs))
    for bone_name in ("Mag_metarig", "Mag.001_metarig"):
        bone = rig.data.bones[bone_name]
        print("DONOR_REST", bone_name, [list(row) for row in bone.matrix_local])

    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["Reload"]
    mag = bpy.data.objects["mag_0"]
    fresh = bpy.data.objects["mag.001_0"]
    for frame in (0, 10, 20, 24, 28, 30, 34, 40, 48, 54, 60, 68, 76, 86, 100):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        print(
            "DONOR_FRAME",
            frame,
            "mag", list(evaluated_centroid(mag)),
            "fresh", list(evaluated_centroid(fresh)),
        )


if __name__ == "__main__":
    main()
