"""Render the AK pilot reload continuously for motion-quality inspection.

Run after opening ak-hires-pilot.blend in Blender background mode.
"""

from pathlib import Path

import bpy


ROOT = Path("/Users/ruben/csbrasil/client")
OUT = ROOT / "artifacts/viewmodels/ak-hires-pilot/preview/reload"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects["coro_solto_hires_fp_rig"]
    action = bpy.data.actions.get("Reload")
    if action is None:
        raise RuntimeError("Missing Reload action")
    rig.animation_data_create()
    rig.animation_data.action = action

    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = 100
    scene.render.resolution_x = 640
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUT / "reload_")
    scene.render.film_transparent = False
    bpy.ops.render.render(animation=True)
    print(f"AK_RELOAD_PREVIEW frames={OUT}")


if __name__ == "__main__":
    main()
