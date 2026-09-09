"""Render a small measured grid for the left-hand AK foregrip contact."""
from importlib.util import module_from_spec, spec_from_file_location
import math
from pathlib import Path

import bpy
from mathutils import Quaternion


ROOT = Path(__file__).resolve().parents[3]
BUILDER = Path(__file__).with_name("build_ak_pilot.py")
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "renders" / "support_contact_grid"
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


def apply_measured_left_grip() -> None:
    for finger in ("pinky", "ring", "middle", "index"):
        for digit, bend in enumerate((0.46, 0.88, 0.76), start=1):
            bone = builder.ARM.pose.bones[f"finger_{finger}{digit}.l"]
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = Quaternion((0.0, 0.0, 1.0), -bend * 0.94)
    for digit, bend in enumerate((0.36, 0.62, 0.50), start=1):
        bone = builder.ARM.pose.bones[f"finger_thumb{digit}.l"]
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion((0.0, 0.0, 1.0), bend * 0.94)


for local_y in (-0.060, -0.030, 0.000):
    for local_z in (-0.020, 0.010, 0.040):
        builder.pose_idle(
            weapon,
            left_rotation=(math.radians(90), math.radians(180), 0.0),
            left_local=(0.245, local_y, local_z),
            left_close=0.0,
        )
        apply_measured_left_grip()
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"support_y{local_y:+.3f}_z{local_z:+.3f}.png")
        bpy.ops.render.render(write_still=True)

print(f"SUPPORT_CONTACT_GRID {OUT}")
