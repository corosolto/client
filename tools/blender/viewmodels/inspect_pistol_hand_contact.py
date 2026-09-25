"""Measure the evaluated support-hand surface during the pistol reload."""
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"


def weighted_surface(obj: bpy.types.Object, prefixes: tuple[str, ...]) -> tuple[Vector, Vector, Vector, int]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    selected: list[Vector] = []
    for index, vertex in enumerate(obj.data.vertices):
        names = {
            obj.vertex_groups[group.group].name
            for group in vertex.groups
            if group.weight >= 0.2
        }
        if any(name.startswith(prefixes) for name in names):
            selected.append(evaluated.matrix_world @ mesh.vertices[index].co)
    evaluated.to_mesh_clear()
    minimum = Vector(tuple(min(point[axis] for point in selected) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in selected) for axis in range(3)))
    centroid = sum(selected, Vector()) / len(selected)
    return minimum, maximum, centroid, len(selected)


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]
    meshes = [
        obj for obj in bpy.data.objects
        if obj.type == "MESH" and any(mod.type == "ARMATURE" and mod.object == rig for mod in obj.modifiers)
    ]
    print("ARM_MESHES", [obj.name for obj in meshes])
    for frame in (0, 10, 14, 15, 18, 21, 25):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
        wrist_screen = world_to_camera_view(bpy.context.scene, bpy.context.scene.camera, wrist)
        print(
            f"HAND_FRAME {frame} wrist={tuple(round(v, 3) for v in wrist)} "
            f"screen={tuple(round(v, 3) for v in wrist_screen)}"
        )
        for obj in meshes:
            for label, prefixes in (
                ("palm", ("L_wrist", "L_hand")),
                ("fingers", ("L_point", "L_middle", "L_ring", "L_pinky", "L_thumb")),
            ):
                try:
                    minimum, maximum, centroid, count = weighted_surface(obj, prefixes)
                except (ValueError, ZeroDivisionError):
                    continue
                print(
                    f"HAND_SURFACE {frame} {obj.name} {label} count={count} "
                    f"min={tuple(round(v, 3) for v in minimum)} "
                    f"max={tuple(round(v, 3) for v in maximum)} "
                    f"centroid={tuple(round(v, 3) for v in centroid)} "
                    f"offset={tuple(round(v, 3) for v in centroid - wrist)} "
                    f"screen={tuple(round(v, 3) for v in world_to_camera_view(bpy.context.scene, bpy.context.scene.camera, centroid))}"
                )


if __name__ == "__main__":
    main()
