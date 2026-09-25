"""Inspect detachable pistol props in the baked reload action."""
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def projected_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    scene = bpy.context.scene
    camera = scene.camera
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    points = [
        world_to_camera_view(scene, camera, evaluated.matrix_world @ vertex.co)
        for vertex in mesh.vertices
    ]
    evaluated.to_mesh_clear()
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]
    props = (
        bpy.data.objects["coro_solto_project_pistol_magazine"],
        bpy.data.objects["coro_solto_project_pistol_fresh_magazine"],
    )
    for frame in (0, 10, 14, 15, 18, 21, 25, 28, 32):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        wrist = rig.pose.bones["L_wrist_02"].matrix.translation
        print(f"RELOAD_FRAME {frame} wrist={tuple(round(value, 3) for value in wrist)}")
        for prop in props:
            minimum, maximum = world_bounds(prop)
            screen_minimum, screen_maximum = projected_bounds(prop)
            dimensions = maximum - minimum
            print(
                f"RELOAD_PROP {prop.name} min={tuple(round(value, 3) for value in minimum)} "
                f"max={tuple(round(value, 3) for value in maximum)} "
                f"size={tuple(round(value, 3) for value in dimensions)} "
                f"screen_min={tuple(round(value, 3) for value in screen_minimum)} "
                f"screen_max={tuple(round(value, 3) for value in screen_maximum)}"
            )


if __name__ == "__main__":
    main()
