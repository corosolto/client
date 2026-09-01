"""Build the authored first-person arm rig used by the browser game.

Run with:
  Blender --background tools/blender/source/fp-arms-source.blend \
    --python tools/blender/build_fp_arms.py

The source is the CC0 WRAD GoldSource-style armature.  This script keeps one
canonical rig and creates reusable animation clips for each FPS weapon family.
Weapon skins/models remain separate and are attached to this rig at runtime.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[2]
OUT_BLEND = ROOT / "tools" / "blender" / "fp-arms-authored.blend"
OUT_GLB = ROOT / "public" / "models" / "viewmodels" / "fp-arms.glb"
FPS = 30
ARM = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")


def prepare_mesh() -> None:
    """Turn the intentionally crunchy source into a clean browser viewmodel mesh."""
    mesh = next(obj for obj in bpy.data.objects if obj.type == "MESH")
    glove = bpy.data.materials.new("FP_Glove")
    glove.diffuse_color = (0.035, 0.055, 0.085, 1.0)
    glove.roughness = 0.82
    glove.metallic = 0.0
    mesh.data.materials.append(glove)
    glove_index = len(mesh.data.materials) - 1
    group_names = {group.index: group.name.lower() for group in mesh.vertex_groups}
    # Palm + articulated fingers become one continuous glove.  This adds the
    # strong hand silhouette of classic CS and avoids a generic skin-coloured
    # mannequin hand for every character.
    for polygon in mesh.data.polygons:
        hand_vertices = 0
        for vertex_index in polygon.vertices:
            vertex = mesh.data.vertices[vertex_index]
            if any(
                weight.weight > 0.12
                and ("wrist" in group_names.get(weight.group, "")
                     or "finger_" in group_names.get(weight.group, ""))
                for weight in vertex.groups
            ):
                hand_vertices += 1
        if hand_vertices >= max(1, len(polygon.vertices) // 2):
            polygon.material_index = glove_index
    for polygon in mesh.data.polygons:
        polygon.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    subdiv = mesh.modifiers.new("FP hand surface", "SUBSURF")
    subdiv.subdivision_type = "CATMULL_CLARK"
    subdiv.levels = 1
    subdiv.render_levels = 1
    # Deform the denser hand, rather than subdividing an already bent pose.
    bpy.ops.object.modifier_move_up(modifier=subdiv.name)
    bpy.ops.object.modifier_apply(modifier=subdiv.name)


def reset_pose() -> None:
    for bone in ARM.pose.bones:
        bone.matrix_basis.identity()
        bone.rotation_mode = "QUATERNION"


def new_action(name: str, end: int):
    action = bpy.data.actions.new(name=name)
    action.use_fake_user = True
    ARM.animation_data_create()
    ARM.animation_data.action = action
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end
    return action


def key_bone(name: str, frame: int) -> None:
    bone = ARM.pose.bones[name]
    bone.keyframe_insert("location", frame=frame, group=name)
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
    bone.keyframe_insert("scale", frame=frame, group=name)


def curl_hand(side: str, frame: int, amount: float, trigger: bool = False) -> None:
    """Natural cylindrical grip, authored on the actual finger bones."""
    for finger in ("pinky", "ring", "middle", "index", "thumb"):
        for digit in (1, 2, 3):
            name = f"finger_{finger}{digit}.{side}"
            bone = ARM.pose.bones[name]
            if finger == "thumb":
                base = (0.34, 0.52, 0.42)[digit - 1]
                # Thumb wraps across the grip instead of folding parallel to fingers.
                q = Quaternion((0, 0, 1), (-1 if side == "r" else 1) * 0.20 * amount)
                q @= Quaternion((1, 0, 0), base * amount)
            else:
                base = (0.46, 0.86, 0.74)[digit - 1]
                if trigger and finger == "index":
                    base *= (0.20, 0.12, 0.10)[digit - 1]
                q = Quaternion((1, 0, 0), base * amount)
            bone.rotation_quaternion = q
            key_bone(name, frame)


def grip_frame(frame: int, right: float = 1.0, left: float = 0.94,
               trigger: bool = True) -> None:
    curl_hand("r", frame, right, trigger)
    curl_hand("l", frame, left, False)


def offset_control(name: str, frame: int, offset=(0.0, 0.0, 0.0),
                   rotation=(0.0, 0.0, 0.0)) -> None:
    bone = ARM.pose.bones[name]
    bone.location = Vector(offset)
    bone.rotation_quaternion = Quaternion((1, 0, 0), rotation[0])
    bone.rotation_quaternion @= Quaternion((0, 1, 0), rotation[1])
    bone.rotation_quaternion @= Quaternion((0, 0, 1), rotation[2])
    key_bone(name, frame)


def make_hold(name: str, right=1.0, left=0.94, trigger=True) -> None:
    reset_pose()
    new_action(name, 2)
    grip_frame(1, right, left, trigger)
    grip_frame(2, right, left, trigger)


def make_reload(name: str, family: str, frames: int = 45) -> None:
    """Author family-specific hand travel; the browser aligns it to weapon sockets."""
    reset_pose()
    new_action(name, frames)
    for frame in (1, frames):
        grip_frame(frame)
        offset_control("wrist_ik.r", frame)
        offset_control("wrist_ik.l", frame)

    if family == "shotgun":
        # Support hand operates the pump and returns to the fore-end.
        for frame, delta in ((9, (0, 0, 0)), (20, (0, -0.18, 0)),
                             (31, (0, 0, 0))):
            grip_frame(frame)
            offset_control("wrist_ik.l", frame, delta)
    elif family == "bolt":
        # Firing hand releases the grip, pulls the bolt and reacquires the grip.
        for frame, delta in ((8, (0, 0, 0)), (17, (0.10, 0.03, 0.02)),
                             (25, (0.10, -0.11, 0.02)), (34, (0, 0, 0))):
            curl_hand("r", frame, 0.72, False)
            curl_hand("l", frame, 0.94, False)
            offset_control("wrist_ik.r", frame, delta)
    else:
        # Rifle/pistol magazine: support hand leaves the gun, extracts/inserts,
        # then operates bolt/slide before returning.
        reach_x = -0.11 if family == "pistol" else -0.16
        for frame, delta in ((7, (0, 0, 0)), (15, (reach_x, -0.11, -0.04)),
                             (24, (reach_x, -0.27, -0.06)),
                             (32, (reach_x, -0.11, -0.04)),
                             (39, (0.03, 0.02, 0.07)), (45, (0, 0, 0))):
            grip_frame(frame)
            offset_control("wrist_ik.l", frame, delta)


def make_knife() -> None:
    reset_pose()
    new_action("knife_slash", 20)
    for frame, right_off, left_off, roll in (
        (1, (0, 0, 0), (0, 0, 0), 0),
        (6, (0.08, 0.05, -0.10), (-0.03, 0.02, 0), -0.35),
        (12, (-0.12, 0.02, 0.12), (0.03, 0, 0), 0.55),
        (20, (0, 0, 0), (0, 0, 0), 0),
    ):
        grip_frame(frame, 1.0, 0.62, False)
        offset_control("wrist_ik.r", frame, right_off, (0, 0, roll))
        offset_control("wrist_ik.l", frame, left_off)


def build_actions() -> None:
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    make_hold("hold_rifle")
    make_reload("reload_rifle", "rifle")
    make_hold("hold_pistol", right=1.0, left=0.88, trigger=True)
    make_reload("reload_pistol", "pistol")
    make_hold("hold_shotgun")
    make_reload("reload_shotgun", "shotgun")
    make_hold("hold_bolt")
    make_reload("reload_bolt", "bolt")
    make_hold("hold_knife", right=1.0, left=0.62, trigger=False)
    make_knife()
    ARM.animation_data.action = None


def export() -> None:
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 45
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    ARM.select_set(True)
    mesh = next(obj for obj in bpy.data.objects if obj.type == "MESH")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = ARM
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_def_bones=False,
        export_skins=True,
        export_morph=False,
    )


prepare_mesh()
build_actions()
export()
print(f"FP_ARMS_BUILD actions={len(bpy.data.actions)} glb={OUT_GLB}")
