"""Render close orthogonal evidence of the AKM firing-hand contact.

Run after opening the generated AKM pilot blend.  The viewpoints are expressed
in Rifle_metarig space, so they remain useful when the complete viewmodel is
reframed for the browser.
"""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "artifacts/viewmodels/akm-hires-pilot/renders"


def main() -> None:
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    # Idle is baked into each authored clip but Blender can purge the standalone
    # action after export/save. Reload frame 0 is the identical accepted hold.
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(0)
    bpy.context.view_layer.update()

    rifle = rig.pose.bones["Rifle_metarig"]
    target_local = Vector((0.0, -0.045, -0.130))
    # PoseBone.matrix is expressed in armature-object space.  The generated
    # rig is not guaranteed to live at the world origin, so compose the two
    # transforms before positioning the diagnostic camera.
    rifle_world = rig.matrix_world @ rifle.matrix
    target = rifle_world @ target_local

    camera = scene.camera
    camera.data.lens = 62.0
    camera.data.sensor_fit = "HORIZONTAL"
    camera.data.clip_start = 0.01
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100

    views = {
        "right": Vector((0.46, -0.04, 0.02)),
        "left": Vector((-0.46, -0.04, 0.02)),
        "rear": Vector((0.02, -0.48, 0.03)),
        "underside": Vector((0.20, -0.20, -0.38)),
    }
    rotation = rifle_world.to_3x3()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, local_offset in views.items():
        camera.location = target + rotation @ local_offset
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"strong-hand-{name}.png")
        bpy.ops.render.render(write_still=True)

    # A static contact can still pass while the index never squeezes. Render
    # the Shoot clip from the trigger side at rest, peak press and recovery.
    rig.animation_data.action = bpy.data.actions["Shoot"]
    for frame in (0, 5, 10):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        rifle_world = rig.matrix_world @ rifle.matrix
        target = rifle_world @ target_local
        rotation = rifle_world.to_3x3()
        camera.location = target + rotation @ views["right"]
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"strong-hand-fire-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
