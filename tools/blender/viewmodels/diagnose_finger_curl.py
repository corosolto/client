"""Find the mirrored local curl axis for the support-hand finger chains."""
from importlib.util import module_from_spec, spec_from_file_location
import math
from pathlib import Path

import bpy
from mathutils import Quaternion


ROOT = Path(__file__).resolve().parents[3]
BUILDER = Path(__file__).with_name("build_ak_pilot.py")
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "renders" / "finger_curl_grid"
OUT.mkdir(parents=True, exist_ok=True)

spec = spec_from_file_location("ak_pilot_builder", BUILDER)
builder = module_from_spec(spec)
spec.loader.exec_module(builder)
builder.ARM.animation_data_clear()
weapon = bpy.data.objects["coro_solto_ak"]

bpy.context.scene.render.resolution_x = 750
bpy.context.scene.render.resolution_y = 500
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.frame_set(1)

axes = {
    "x": (1.0, 0.0, 0.0),
    "y": (0.0, 1.0, 0.0),
    "z": (0.0, 0.0, 1.0),
}
for axis_name, axis in axes.items():
    for sign in (-1.0, 1.0):
        builder.pose_idle(
            weapon,
            right_rotation=(0.0, math.radians(270), 0.0),
            right_local=(-0.12, -0.005, -0.12),
            left_rotation=(math.radians(180), math.radians(90), 0.0),
            left_local=(-0.040, -0.045, 0.115),
            left_close=0.0,
        )
        for finger in ("pinky", "ring", "middle", "index"):
            for digit, bend in enumerate((0.46, 0.88, 0.76), start=1):
                bone = builder.ARM.pose.bones[f"finger_{finger}{digit}.l"]
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = Quaternion(axis, sign * bend)
        bpy.context.view_layer.update()
        label = "pos" if sign > 0 else "neg"
        path = OUT / f"curl_{axis_name}_{label}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)

print(f"FINGER_CURL_GRID {OUT}")
