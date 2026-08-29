"""Render a measured support-hand position grid at the AK charging handle."""
from importlib.util import module_from_spec, spec_from_file_location
import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
BUILDER = Path(__file__).with_name("build_ak_pilot.py")
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "renders" / "bolt_contact_grid"
OUT.mkdir(parents=True, exist_ok=True)

spec = spec_from_file_location("ak_pilot_builder", BUILDER)
builder = module_from_spec(spec)
spec.loader.exec_module(builder)
builder.ARM.animation_data_clear()
weapon = bpy.data.objects["coro_solto_ak"]

scene = bpy.context.scene
scene.render.resolution_x = 750
scene.render.resolution_y = 500
scene.render.resolution_percentage = 100
scene.frame_set(1)

for local_y in (-0.020, 0.010, 0.040):
    for local_z in (0.080, 0.110, 0.140):
        builder.pose_idle(
            weapon,
            left_rotation=(math.radians(180), math.radians(90), 0.0),
            left_local=(-0.040, local_y, local_z),
            left_close=1.0,
        )
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"bolt_y{local_y:+.3f}_z{local_z:+.3f}.png")
        bpy.ops.render.render(write_still=True)

print(f"BOLT_CONTACT_GRID {OUT}")
