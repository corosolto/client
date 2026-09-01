"""Render measured wrist-orientation grids without changing the pilot build."""
from importlib.util import module_from_spec, spec_from_file_location
import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
BUILDER = Path(__file__).with_name("build_ak_pilot.py")
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "renders" / "orientation_grid"
OUT.mkdir(parents=True, exist_ok=True)

spec = spec_from_file_location("ak_pilot_builder", BUILDER)
builder = module_from_spec(spec)
spec.loader.exec_module(builder)
weapon = bpy.data.objects["coro_solto_ak"]
builder.ARM.animation_data_clear()

bpy.context.scene.render.resolution_x = 750
bpy.context.scene.render.resolution_y = 500
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.frame_set(1)

for x_degrees in (0, 90, 180, 270):
    for y_degrees in (0, 90, 180, 270):
        builder.pose_idle(
            weapon,
            right_rotation=(math.radians(x_degrees), math.radians(y_degrees), 0.0),
        )
        path = OUT / f"right_x{x_degrees:03d}_y{y_degrees:03d}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)

for local_x in (-0.12, -0.16, -0.20):
    for local_z in (-0.12, -0.16, -0.20):
        builder.pose_idle(
            weapon,
            right_rotation=(0.0, math.radians(270), 0.0),
            right_local=(local_x, -0.005, local_z),
        )
        path = OUT / f"position_x{abs(int(local_x * 100)):02d}_z{abs(int(local_z * 100)):02d}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)

print(f"WRIST_GRID {OUT}")
