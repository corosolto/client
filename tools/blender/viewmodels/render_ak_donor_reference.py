"""Render the untouched CC0 donor only as a private fit diagnostic.

Nothing produced here is exported to the game. The images answer one question:
whether the source action itself maintains hand/weapon contact before the Coro
Solto AK replaces the donor geometry.
"""
from pathlib import Path
import importlib.util

import bpy


HERE = Path(__file__).resolve().parent
BUILD_PATH = HERE / "build_ak_hires_pilot.py"
SPEC = importlib.util.spec_from_file_location("ak_hires_build", BUILD_PATH)
BUILD = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(BUILD)

OUT = BUILD.OUT / "donor-diagnostic"
OUT.mkdir(parents=True, exist_ok=True)

BUILD.setup_scene()
imported = BUILD.import_glb(BUILD.DONOR)
rig = next(obj for obj in imported if obj.type == "ARMATURE")
BUILD.setup_camera_and_lights()

rig.animation_data_create()
rig.animation_data.action = bpy.data.actions["Idle"]
for frame in (0, 50, 100):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = str(OUT / f"idle_{frame:03d}.png")
    bpy.ops.render.render(write_still=True)

rig.animation_data.action = bpy.data.actions["Reload"]
for frame in (0, 20, 40, 60, 80, 100):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = str(OUT / f"reload_{frame:03d}.png")
    bpy.ops.render.render(write_still=True)

for action_name, frames in (("Equip", (0, 15, 30, 45, 58)), ("Shoot", (0, 5, 10))):
    rig.animation_data.action = bpy.data.actions[action_name]
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = str(
            OUT / f"{action_name.lower()}_{frame:03d}.png"
        )
        bpy.ops.render.render(write_still=True)

print(f"DONOR_DIAGNOSTIC={OUT}")
