"""Inspect pistol finger/magazine contacts without modifying the production asset."""
from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


def project(scene, camera, world):
    p = world_to_camera_view(scene, camera, world)
    return tuple(round(value, 4) for value in (p.x, p.y, p.z))


def main() -> None:
    blend = Path(sys.argv[sys.argv.index("--") + 1])
    out = Path(sys.argv[sys.argv.index("--") + 2])
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    camera = scene.camera
    production_camera_matrix = camera.matrix_world.copy()
    production_lens = camera.data.lens
    production_shift_x = camera.data.shift_x
    production_shift_y = camera.data.shift_y
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100

    for action_name, frames in (("Shoot", (0, 1, 2, 3, 4, 5, 8)), ("Reload", (0, 7, 10, 14, 15, 18, 21, 25, 28, 36))):
        rig.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            values = []
            for name in ("R_point1_031", "R_point2_032", "R_point3_033", "L_wrist_02"):
                bone = rig.pose.bones[name]
                head = rig.matrix_world @ bone.head
                tail = rig.matrix_world @ bone.tail
                values.append(f"{name}=h{project(scene, camera, head)} t{project(scene, camera, tail)}")
            for name in ("coro_solto_project_pistol_magazine", "coro_solto_project_pistol_fresh_magazine"):
                obj = bpy.data.objects[name]
                center = obj.matrix_world @ (sum((Vector(corner) for corner in obj.bound_box), Vector()) / 8.0)
                values.append(f"{name}=c{project(scene, camera, center)} scale={tuple(round(v, 4) for v in obj.scale)} hide={obj.hide_render}")
            print(f"CONTACT {action_name} frame={frame} " + " | ".join(values))

    # Preserve the actual game composition while checking whether the hand-led
    # prop is readable.  A transform can be numerically correct and still be
    # completely occluded by the palm from the production camera.
    rig.animation_data.action = bpy.data.actions["Reload"]
    camera.matrix_world = production_camera_matrix
    camera.data.lens = production_lens
    camera.data.shift_x = production_shift_x
    camera.data.shift_y = production_shift_y
    for frame in (0, 7, 10, 14, 15, 18, 21, 25, 28, 36):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(out / f"reload-production-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)

    # Report how a small rig-space offset moves the extracted magazine on
    # screen.  This lets the production builder place it against the gripping
    # fingers instead of guessing world axes.
    scene.frame_set(14)
    bpy.context.view_layer.update()
    magazine_bone = rig.pose.bones["CoroMagazine"]
    magazine_obj = bpy.data.objects["coro_solto_project_pistol_magazine"]
    original_mag_basis = magazine_bone.matrix_basis.copy()
    for axis, delta in (
        ("+X", Vector((2, 0, 0))), ("-X", Vector((-2, 0, 0))),
        ("+Y", Vector((0, 2, 0))), ("-Y", Vector((0, -2, 0))),
        ("+Z", Vector((0, 0, 2))), ("-Z", Vector((0, 0, -2))),
    ):
        magazine_bone.matrix_basis = Matrix.Translation(delta) @ original_mag_basis
        bpy.context.view_layer.update()
        center = magazine_obj.matrix_world @ (
            sum((Vector(corner) for corner in magazine_obj.bound_box), Vector()) / 8.0
        )
        print(f"MAG_OFFSET {axis} projected={project(scene, camera, center)}")
    magazine_bone.matrix_basis = original_mag_basis

    # Diagnostic close-ups from three directions around the firing index.
    rig.animation_data.action = bpy.data.actions["Shoot"]
    scene.frame_set(0)
    bpy.context.view_layer.update()
    focus = rig.matrix_world @ rig.pose.bones["R_point2_032"].head
    for label, offset in (
        ("side", Vector((18.0, 0.0, 2.0))),
        ("rear", Vector((0.0, 18.0, 2.0))),
        ("under", Vector((7.0, 8.0, -8.0))),
    ):
        camera.location = focus + offset
        camera.rotation_euler = (focus - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.lens = 72
        camera.data.shift_x = 0
        camera.data.shift_y = 0
        for frame in (0, 1, 3, 5, 8):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(out / f"trigger-{label}-{frame:03d}.png")
            bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
