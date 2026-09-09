"""Render candidate two-hand idle poses by combining donor arm channels."""
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "fps_pistol_animated.glb"
PROJECT = ROOT / "public" / "models" / "weapons" / "pistol.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "composite-idle"
BASE_FRAME = 0
SUPPORT_FRAMES = (24, 36, 72, 84, 96, 120, 132)
SUPPORT_TARGET_OFFSETS = (
    (2, -3, -2), (4, -3, -2), (6, -3, -2),
    (2, -1, -1), (4, -1, -1), (6, -1, -1),
    (4, 1, 0), (6, 1, 0), (8, 1, 0),
)


def pose_at(rig, action, frame):
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def import_project_pistol():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(PROJECT))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    weapon = next(obj for obj in imported if obj.type == "MESH")
    world = weapon.matrix_world.copy()
    weapon.data.transform(world)
    weapon.matrix_world = Matrix.Identity(4)
    fit = (
        Matrix.Translation(Vector((0.0, -18.55, 10.65)))
        @ Matrix.Rotation(math.radians(90.0), 4, "Z")
        @ Matrix.Scale(26.8, 4)
    )
    weapon.data.transform(fit)
    weapon.name = "Inspection_Project_Pistol"
    return weapon


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    scene = bpy.context.scene
    rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    action = next(iter(bpy.data.actions))
    rig.animation_data_create()
    base = pose_at(rig, action, BASE_FRAME)
    support_poses = {frame: pose_at(rig, action, frame) for frame in SUPPORT_FRAMES}

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    hand_mat = bpy.data.materials.new("Inspection_Hands")
    hand_mat.diffuse_color = (0.32, 0.52, 0.82, 1.0)
    weapon_mat = bpy.data.materials.new("Inspection_Weapon")
    weapon_mat.diffuse_color = (0.16, 0.18, 0.22, 1.0)
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    hands = max(meshes, key=lambda obj: len(obj.data.vertices))
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(hand_mat if obj == hands else weapon_mat)

    donor_meshes = [obj for obj in meshes if obj != hands]
    for obj in donor_meshes:
        bpy.data.objects.remove(obj, do_unlink=True)
    weapon = import_project_pistol()
    weapon.data.materials.clear()
    weapon.data.materials.append(weapon_mat)

    camera_data = bpy.data.cameras.new("Inspection_Camera")
    camera = bpy.data.objects.new("Inspection_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (26.0, 52.0, 24.0)
    camera.rotation_euler = (Vector((-12.0, -19.0, 8.4)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 46.0
    scene.camera = camera
    light_data = bpy.data.lights.new("Inspection_Key", "AREA")
    light_data.energy = 5000
    light_data.size = 12
    light = bpy.data.objects.new("Inspection_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (-8.0, -8.0, 30.0)
    scene.world = bpy.data.worlds.new("Inspection_World")
    scene.world.color = (0.08, 0.08, 0.08)

    rig.animation_data.action = None
    for side in ("L_", "R_"):
        for support_frame, support in support_poses.items():
            for bone in rig.pose.bones:
                bone.matrix_basis = support[bone.name] if bone.name.startswith(side) else base[bone.name]
            bpy.context.view_layer.update()
            scene.render.filepath = str(OUT / f"support-{side[0]}-{support_frame:03d}.png")
            bpy.ops.render.render(write_still=True)

    # Fine-position the selected support hand relative to the dominant wrist,
    # rather than guessing absolute arm offsets.  This keeps the support palm
    # wrapped around the same grip even when the donor proportions change.
    support = support_poses[36]
    for index, offset in enumerate(SUPPORT_TARGET_OFFSETS):
        for bone in rig.pose.bones:
            bone.matrix_basis = support[bone.name] if bone.name.startswith("L_") else base[bone.name]
        bpy.context.view_layer.update()
        support_wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
        dominant_wrist = rig.pose.bones["R_wrist_026"].matrix.translation.copy()
        target = dominant_wrist + Vector(offset)
        arm = rig.pose.bones["L_arm_01"]
        matrix = arm.matrix.copy()
        matrix.translation += target - support_wrist
        arm.matrix = matrix
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"relative-{index}-{offset[0]}-{offset[1]}-{offset[2]}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
