from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
blend = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
out = Path("/tmp/pistol-trigger-action-side")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(blend))
scene = bpy.context.scene
rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
camera = bpy.data.objects["Pistol_Hires_FP_Camera"]
camera.data.lens = 62.0
camera.data.shift_x = 0.0
camera.data.shift_y = 0.0
scene.render.resolution_x = 900
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
rig.animation_data.action = bpy.data.actions["Shoot"]

views = {
    "right": (Vector((48.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8))),
    "left": (Vector((-42.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8))),
}
for view_name, (location, target) in views.items():
    camera.location = location
    camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    for frame in (0, 2, 4, 6, 8):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(out / f"{view_name}_{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
