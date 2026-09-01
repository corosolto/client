"""Render a compact calibration grid for the support-hand finger curl axes."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "grasp-calibration"
OUT.mkdir(parents=True, exist_ok=True)

rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
action = bpy.data.actions["Reload"]
rig.animation_data.action = action
scene = bpy.context.scene
scene.render.resolution_percentage = 50

finger_bones = [
    bone.name
    for bone in rig.pose.bones
    if bone.name.startswith(("L_point", "L_middle", "L_ring", "L_pink"))
]

variants = [
    ("base", None, 0),
    ("xp35", "X", 35),
    ("xn35", "X", -35),
    ("yp35", "Y", 35),
    ("yn35", "Y", -35),
    ("zp35", "Z", 35),
    ("zn35", "Z", -35),
    ("xp60", "X", 60),
    ("xn60", "X", -60),
]

for label, axis, degrees in variants:
    scene.frame_set(14)
    bpy.context.view_layer.update()
    if axis:
        rotation = Matrix.Rotation(math.radians(degrees), 4, axis)
        for name in finger_bones:
            bone = rig.pose.bones[name]
            bone.matrix_basis = bone.matrix_basis @ rotation
        bpy.context.view_layer.update()
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)

print(f"PISTOL_GRASP_CALIBRATION {OUT}")
