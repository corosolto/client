"""Teste controlado do modo FK do molde CC0 antes de produzir a pose de arma."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/models/viewmodels/fpvm_arms_working.blend'
OUT = ROOT / 'public/models/viewmodels/fpvm_cc0_fk_test.png'


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.wm.open_mainfile(filepath=str(BASE))
rig = bpy.data.objects['FPVM_Armature']
for side, direction in (('R', -.40), ('L', .40)):
    for original in (f'ORG-upper_arm.{side}', f'ORG-forearm.{side}', f'ORG-hand.{side}'):
        constraints = rig.pose.bones[original].constraints
        if len(constraints) > 1:
            constraints[1].influence = 0
    arm = rig.pose.bones[f'upper_arm_fk.{side}']
    fore = rig.pose.bones[f'forearm_fk.{side}']
    hand = rig.pose.bones[f'hand_fk.{side}']
    for bone in (arm, fore, hand):
        bone.rotation_mode = 'XYZ'
    arm.rotation_euler = (0, 0, direction)
    fore.rotation_euler = (.35, 0, direction * .20)
    hand.rotation_euler = (.55, 0, -direction * .45)
    for name in ('index', 'middle', 'ring', 'pinky'):
        for idx in range(1, 4):
            finger = rig.pose.bones[f'f_{name}.{idx:02d}.{side}']
            finger.rotation_mode = 'XYZ'
            finger.rotation_euler.x = -.38 if idx == 1 else -.25

scene = bpy.context.scene
camera = scene.camera
camera.location = (0, -2.1, .28)
camera.data.lens = 55
look_at(camera, (0, -.2, .38))
for obj in scene.objects:
    if obj.type == 'LIGHT':
        look_at(obj, (0, -.25, .4))
scene.render.filepath = str(OUT)
bpy.ops.render.render(write_still=True)
