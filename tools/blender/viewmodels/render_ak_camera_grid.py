"""Render measured camera alternatives for the AK high-resolution pilot."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "ak-hires-pilot" / "camera-grid"
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.resolution_x = 900
scene.render.resolution_y = 600
camera = scene.camera
rig = bpy.data.objects["coro_solto_hires_fp_rig"]
rig.animation_data.action = bpy.data.actions["Idle"]
scene.frame_set(0)

variants = [
    ("x020_z420", (0.20, 0.18, 4.20)),
    ("x060_z430", (0.60, 0.18, 4.30)),
    ("x100_z440", (1.00, 0.18, 4.40)),
    ("x140_z450", (1.40, 0.18, 4.50)),
    ("x100_y050", (1.00, 0.50, 4.40)),
    ("x140_y050", (1.40, 0.50, 4.50)),
]
target = Vector((-0.18, -1.35, 3.68))
for name, location in variants:
    camera.location = location
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"{name}.png")
    bpy.ops.render.render(write_still=True)
