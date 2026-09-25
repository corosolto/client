from pathlib import Path
import math

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
blend = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
out = Path("/tmp/pistol-trigger-flex")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(blend))
scene = bpy.context.scene
rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
camera = bpy.data.objects["Pistol_Hires_FP_Camera"]
rig.animation_data.action = bpy.data.actions["Shoot"]
scene.frame_set(0)
bpy.context.view_layer.update()
base = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
rig.animation_data.action = None
scene.render.resolution_x = 900
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100

views = {
    "main": (Vector((28.0, 52.0, 24.0)), Vector((-7.0, -18.0, 7.8)), 46.0, 0.15, 0.12),
    "right": (Vector((48.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8)), 62.0, 0.0, 0.0),
    "left": (Vector((-42.0, 18.0, 15.0)), Vector((-7.0, -18.0, 7.8)), 62.0, 0.0, 0.0),
}
variants = {
    # root-Y, middle-Y, tip-Y.  The production action currently bends the
    # root in the negative direction; this grid includes both signs so the
    # anatomical pull can be selected from an actual side view.
    "rest": (0.0, 0.0, 0.0),
    "y_pos_soft": (6.0, 10.0, 6.0),
    "y_pos_medium": (10.0, 18.0, 10.0),
    "y_pos_strong": (14.0, 24.0, 14.0),
    "y_neg_soft": (-6.0, -10.0, -6.0),
    "y_neg_medium": (-10.0, -18.0, -10.0),
}
for view_name, (location, target, lens, shift_x, shift_y) in views.items():
    camera.location = location
    camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = lens
    camera.data.shift_x = shift_x
    camera.data.shift_y = shift_y
    for variant, (p1, p2, p3) in variants.items():
        for bone in rig.pose.bones:
            bone.matrix_basis = base[bone.name]
        if any((p1, p2, p3)):
            rig.pose.bones["R_point1_031"].matrix_basis = (
                base["R_point1_031"] @ Matrix.Rotation(math.radians(p1), 4, "Y")
            )
            rig.pose.bones["R_point2_032"].matrix_basis = (
                base["R_point2_032"] @ Matrix.Rotation(math.radians(p2), 4, "Y")
            )
            rig.pose.bones["R_point3_033"].matrix_basis = (
                base["R_point3_033"] @ Matrix.Rotation(math.radians(p3), 4, "Y")
            )
        bpy.context.view_layer.update()
        scene.render.filepath = str(out / f"{view_name}_{variant}.png")
        bpy.ops.render.render(write_still=True)
