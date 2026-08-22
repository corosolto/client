import bpy
from mathutils import Vector
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/models/props/fav_modular.glb"
OUT = ROOT / "public/models/props"
CENTERS = (-7.5, -5.0, -2.5, 0.0, 2.5, 5.0, 7.5)


def world_bounds(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(c[i] for c in corners) for i in range(3))),
        Vector(tuple(max(c[i] for c in corners) for i in range(3))),
    )


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def main():
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    groups = [[] for _ in CENTERS]
    for obj in meshes:
        lo, hi = world_bounds(obj)
        center_x = (lo.x + hi.x) * 0.5
        index = min(range(len(CENTERS)), key=lambda i: abs(center_x - CENTERS[i]))
        groups[index].append(obj)

    for index, source_objects in enumerate(groups, start=1):
        copies = []
        for source in source_objects:
            duplicate = source.copy()
            duplicate.data = source.data.copy()
            duplicate.animation_data_clear()
            bpy.context.collection.objects.link(duplicate)
            duplicate.parent = None
            duplicate.matrix_world = source.matrix_world.copy()
            copies.append(duplicate)

        bounds = [world_bounds(obj) for obj in copies]
        lo = Vector(tuple(min(pair[0][axis] for pair in bounds) for axis in range(3)))
        hi = Vector(tuple(max(pair[1][axis] for pair in bounds) for axis in range(3)))
        origin = Vector(((lo.x + hi.x) * 0.5, (lo.y + hi.y) * 0.5, lo.z))
        for obj in copies:
            obj.location -= origin
            obj["source_asset"] = "Modular Slums by lexferreira89"
            obj["source_license"] = "CC-BY-4.0"

        bpy.ops.object.select_all(action="DESELECT")
        for obj in copies:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = copies[0]
        output = OUT / f"lajes_casa_{index:02d}.glb"
        bpy.ops.export_scene.gltf(
            filepath=str(output),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_extras=True,
            export_materials="EXPORT",
        )
        print(f"exported {output.name}: {len(copies)} meshes, {(hi - lo)[:]} bounds")
        for obj in copies:
            bpy.data.objects.remove(obj, do_unlink=True)


if __name__ == "__main__":
    main()
