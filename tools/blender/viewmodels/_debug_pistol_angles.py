from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
blend = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
out = Path("/tmp/pistol-trigger-side")
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

views = {
    "right": (Vector((48.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8))),
    "left": (Vector((-42.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8))),
}
rig.animation_data.action = bpy.data.actions["Idle"]
scene.frame_set(0)
bpy.context.view_layer.update()
point = rig.pose.bones["R_point1_031"]
base = point.matrix_basis.copy()
# Freeze the sampled idle pose.  Leaving Idle active makes Blender re-evaluate
# its F-curves on every dependency-graph update and silently overwrite each
# diagnostic matrix below, producing identical renders for every angle.
idle_pose = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.matrix_basis = idle_pose[bone.name]
bpy.context.view_layer.update()
variants = {
    "base": (Vector((0.60, 0.0, 0.0)), None, 0.0),
    "ym10": (Vector((0.60, 0.0, 0.0)), "Y", -10.0),
    "ym15": (Vector((0.60, 0.0, 0.0)), "Y", -15.0),
    "ym20": (Vector((0.60, 0.0, 0.0)), "Y", -20.0),
}
for view_name, (location, target) in views.items():
    camera.location = location
    camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    for variant, (offset, axis, degrees) in variants.items():
        point.matrix_basis = base.copy()
        point.matrix_basis.translation += offset
        if axis:
            point.matrix_basis = point.matrix_basis @ Matrix.Rotation(
                __import__("math").radians(degrees), 4, axis
            )
        bpy.context.view_layer.update()
        scene.render.filepath = str(out / f"seat_{view_name}_{variant}.png")
        bpy.ops.render.render(write_still=True)
