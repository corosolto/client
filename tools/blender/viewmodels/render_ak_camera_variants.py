"""Render deterministic AK FPS camera alternatives from the built pilot scene."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT = Path("/tmp/coro-ak-camera-variants")
VARIANTS = {
    "a_current": ((1.00, 0.18, 4.40), (0.10, -1.35, 4.00)),
    "b_depth84": ((0.62, 0.18, 4.42), (0.10, -1.35, 4.00)),
    "c_depth90": ((0.42, 0.18, 4.44), (0.10, -1.35, 4.00)),
    "d_depth84_lower": ((0.62, 0.18, 4.34), (0.10, -1.35, 4.02)),
    "e_depth96": ((0.20, 0.18, 4.44), (0.10, -1.35, 4.00)),
    "f_depth100": ((0.00, 0.18, 4.44), (0.10, -1.35, 4.00)),
    "g_depth104": ((-0.20, 0.18, 4.44), (0.10, -1.35, 4.00)),
}


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = bpy.data.objects["coro_solto_hires_fp_rig"]
    rig.animation_data_create()
    # The saved authoring file retains the active Reload action. Frame 100 is
    # deliberately baked back to the accepted two-hand idle contact pose.
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(100)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.camera.data.sensor_fit = "VERTICAL"
    scene.camera.data.angle_y = math.radians(58.0)

    for name, (location, target) in VARIANTS.items():
        scene.camera.location = location
        scene.camera.rotation_euler = (
            Vector(target) - scene.camera.location
        ).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(OUTPUT / f"{name}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
