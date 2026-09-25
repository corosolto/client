from pathlib import Path
import math

import bpy


donor = Path.home() / "Downloads" / "fps_pistol_animated.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(donor))
rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
action = next(iter(bpy.data.actions))
rig.animation_data_create()
rig.animation_data.action = action

names = ("R_point1_031", "R_point2_032", "R_point3_033")
print("ACTION_RANGE", tuple(action.frame_range))
base = {}
bpy.context.scene.frame_set(0)
for name in names:
    base[name] = rig.pose.bones[name].matrix_basis.to_quaternion()
for name in names:
    ranked = []
    for frame in range(int(action.frame_range[0]), int(action.frame_range[1]) + 1):
        bpy.context.scene.frame_set(frame)
        q = rig.pose.bones[name].matrix_basis.to_quaternion()
        ranked.append((math.degrees(base[name].rotation_difference(q).angle), frame))
    print("MAX_DELTA", name, sorted(ranked, reverse=True)[:12])
for frame in (0, 160, 164, 168, 172, 176, 180, 184):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    print("FRAME", frame)
    for name in names:
        bone = rig.pose.bones[name]
        print(name, "basis", tuple(round(v, 5) for row in bone.matrix_basis for v in row),
              "head", tuple(round(v, 4) for v in bone.head),
              "tail", tuple(round(v, 4) for v in bone.tail))
