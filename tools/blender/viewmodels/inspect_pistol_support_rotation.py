"""Render support-wrist rotation candidates on the actual pistol idle pose."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "fps_pistol_animated.glb"
PROJECT = ROOT / "public" / "models" / "weapons" / "pistol.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "support-rotation-fresh"
SUPPORT_OFFSET = Vector((4.0, -1.0, -1.0))


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def pose_at(rig: bpy.types.Object, action: bpy.types.Action, frame: int) -> dict[str, Matrix]:
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def import_project_pistol() -> bpy.types.Object:
    imported = import_glb(PROJECT)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    world = weapon.matrix_world.copy()
    weapon.data.transform(world)
    weapon.matrix_world = Matrix.Identity(4)
    weapon.data.transform(
        Matrix.Translation(Vector((0.0, -18.55, 10.65)))
        @ Matrix.Rotation(math.radians(90.0), 4, "Z")
        @ Matrix.Scale(26.8, 4)
    )
    return weapon


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = import_glb(DONOR)
    scene = bpy.context.scene
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    action = next(iter(bpy.data.actions))
    rig.animation_data_create()
    dominant = pose_at(rig, action, 0)
    support = pose_at(rig, action, 36)

    meshes = [obj for obj in imported if obj.type == "MESH"]
    hands = max(meshes, key=lambda obj: len(obj.data.vertices))
    for obj in meshes:
        if obj != hands:
            bpy.data.objects.remove(obj, do_unlink=True)

    hand_mat = bpy.data.materials.new("Support_Rotation_Hands")
    hand_mat.diffuse_color = (0.14, 0.38, 0.74, 1.0)
    hands.data.materials.clear()
    hands.data.materials.append(hand_mat)
    weapon = import_project_pistol()
    weapon_mat = bpy.data.materials.new("Support_Rotation_Weapon")
    weapon_mat.diffuse_color = (0.08, 0.09, 0.11, 1.0)
    weapon.data.materials.clear()
    weapon.data.materials.append(weapon_mat)

    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = support[bone.name] if bone.name.startswith("L_") else dominant[bone.name]
    bpy.context.view_layer.update()
    support_wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
    dominant_wrist = rig.pose.bones["R_wrist_026"].matrix.translation.copy()
    arm = rig.pose.bones["L_arm_01"]
    arm_matrix = arm.matrix.copy()
    arm_matrix.translation += dominant_wrist + SUPPORT_OFFSET - support_wrist
    arm.matrix = arm_matrix
    bpy.context.view_layer.update()
    wrist = rig.pose.bones["L_wrist_02"]
    baseline = wrist.matrix_basis.copy()

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    camera_data = bpy.data.cameras.new("Support_Rotation_Camera")
    camera = bpy.data.objects.new("Support_Rotation_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (42.0, 52.0, 24.0)
    camera.rotation_euler = (Vector((-20.0, -19.0, 8.4)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 46.0
    camera_data.shift_x = 0.15
    camera_data.shift_y = 0.12
    scene.camera = camera

    light_data = bpy.data.lights.new("Support_Rotation_Key", "AREA")
    light_data.energy = 5000
    light_data.size = 10
    light = bpy.data.objects.new("Support_Rotation_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (-8.0, -8.0, 30.0)
    world = bpy.data.worlds.new("Support_Rotation_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.045, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.4
    scene.world = world

    candidates = [
        ("base", 0, 0, 0),
        ("x-neg-30", -30, 0, 0),
        ("x-pos-30", 30, 0, 0),
        ("y-neg-30", 0, -30, 0),
        ("y-pos-30", 0, 30, 0),
        ("z-neg-30", 0, 0, -30),
        ("z-pos-30", 0, 0, 30),
        ("xneg-zneg", -25, 0, -25),
        ("xpos-zpos", 25, 0, 25),
    ]
    for label, x_deg, y_deg, z_deg in candidates:
        wrist.matrix_basis = (
            baseline
            @ Matrix.Rotation(math.radians(x_deg), 4, "X")
            @ Matrix.Rotation(math.radians(y_deg), 4, "Y")
            @ Matrix.Rotation(math.radians(z_deg), 4, "Z")
        )
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
