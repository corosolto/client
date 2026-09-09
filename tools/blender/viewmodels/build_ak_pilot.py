"""Build the first integrated Coro Solto AK first-person viewmodel pilot.

The project AK, both hands, camera and mechanical parts live in one Blender
scene.  This deliberately replaces the old browser-time donor attachment.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[3]
AK_PATH = ROOT / "public" / "models" / "weapons" / "ak.glb"
OUT_DIR = ROOT / "artifacts" / "viewmodels" / "ak-pilot"
OUT_BLEND = OUT_DIR / "ak-pilot.blend"
PREVIEW = OUT_DIR / "renders" / "blockout_idle.png"
FPS = 30

ARM = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
ARMS_MESH = next(obj for obj in bpy.data.objects if obj.type == "MESH")


def remove_old_scene_extras() -> None:
    keep = {ARM, ARMS_MESH}
    for obj in list(bpy.data.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    ARM.animation_data_clear()


def prepare_arms() -> None:
    ARMS_MESH.name = "mandrake_fp_arms"
    ARM.name = "mandrake_fp_rig"
    for polygon in ARMS_MESH.data.polygons:
        polygon.use_smooth = True

    # One measured subdivision pass removes the faceted mannequin silhouette,
    # while retaining the source rig and all 30 finger bones.
    if not any(mod.type == "SUBSURF" for mod in ARMS_MESH.modifiers):
        modifier = ARMS_MESH.modifiers.new("hand_surface", "SUBSURF")
        modifier.subdivision_type = "CATMULL_CLARK"
        modifier.levels = 1
        modifier.render_levels = 1

    glove = bpy.data.materials.get("Mandrake_Glove") or bpy.data.materials.new("Mandrake_Glove")
    glove.use_nodes = True
    glove_bsdf = glove.node_tree.nodes.get("Principled BSDF")
    glove_bsdf.inputs["Base Color"].default_value = (0.0025, 0.0035, 0.0045, 1.0)
    glove_bsdf.inputs["Roughness"].default_value = 0.74
    glove_bsdf.inputs["Sheen Weight"].default_value = 0.12
    glove_bsdf.inputs["Specular IOR Level"].default_value = 0.0

    # This is the project's own first-person costume, not a CS sleeve/skin.
    # Covering the low-poly source forearms also removes the nude mannequin
    # silhouette that made the old blockout look anatomically tubular.
    sleeve = bpy.data.materials.get("Mandrake_Sleeve") or bpy.data.materials.new("Mandrake_Sleeve")
    sleeve.use_nodes = True
    sleeve_bsdf = sleeve.node_tree.nodes.get("Principled BSDF")
    sleeve_bsdf.inputs["Base Color"].default_value = (0.055, 0.010, 0.014, 1.0)
    sleeve_bsdf.inputs["Roughness"].default_value = 0.82
    sleeve_bsdf.inputs["Sheen Weight"].default_value = 0.24
    sleeve_bsdf.inputs["Specular IOR Level"].default_value = 0.12

    ARMS_MESH.data.materials.clear()
    ARMS_MESH.data.materials.append(glove)
    ARMS_MESH.data.materials.append(sleeve)
    group_names = {group.index: group.name.lower() for group in ARMS_MESH.vertex_groups}
    for polygon in ARMS_MESH.data.polygons:
        hand_weighted = 0
        for vertex_index in polygon.vertices:
            vertex = ARMS_MESH.data.vertices[vertex_index]
            if any(
                item.weight > 0.06
                and ("wrist" in group_names.get(item.group, "") or "finger_" in group_names.get(item.group, ""))
                for item in vertex.groups
            ):
                hand_weighted += 1
        # One hand-weighted corner is enough to avoid bright skin wedges
        # between the glove fingers during the reload contact poses.
        polygon.material_index = 0 if hand_weighted else 1

    ARM.scale = (0.10, 0.10, 0.10)
    # The shoulders begin below and behind the weapon.  This keeps both IK
    # targets inside anatomical reach instead of stretching one forearm.
    ARM.location = (0.18, -0.54, -0.58)


def import_project_ak() -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(AK_PATH))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    weapon = next(obj for obj in imported if obj.type == "MESH")
    weapon.name = "coro_solto_ak"
    weapon.data.name = "coro_solto_ak_mesh"
    for obj in imported:
        if obj is not weapon and obj.type == "EMPTY":
            bpy.data.objects.remove(obj, do_unlink=True)

    # The project model points down local -X.  Define a classic right-handed
    # 3/4 FPS basis directly instead of guessing per-axis Euler offsets.
    muzzle_direction = Vector((-0.19, 0.09, -0.977)).normalized()
    # Inspection of the project mesh shows its muzzle on local +X.
    local_x_world = muzzle_direction
    local_y_world = Vector((0.0, 1.0, 0.0)).cross(local_x_world).normalized()
    local_z_world = local_x_world.cross(local_y_world).normalized()
    rotation = Matrix((local_x_world, local_y_world, local_z_world)).transposed().to_4x4()
    weapon.matrix_world = Matrix.Translation(Vector((0.18, -0.21, -0.80))) @ rotation
    return weapon


def separate_magazine(weapon: bpy.types.Object) -> bpy.types.Object:
    """Detach only the project AK magazine faces; keep receiver/trigger intact."""
    bpy.context.view_layer.objects.active = weapon
    weapon.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    selected = 0
    for polygon in weapon.data.polygons:
        center = polygon.center
        is_magazine = -0.075 <= center.x <= 0.105 and center.z <= 0.041
        polygon.select = is_magazine
        selected += int(is_magazine)
    if selected < 30:
        raise RuntimeError(f"Magazine mask unexpectedly small: {selected} faces")
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    magazine = next(obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH")
    magazine.name = "coro_solto_ak_magazine"
    bpy.context.view_layer.objects.active = magazine
    magazine.select_set(True)
    weapon.select_set(False)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    return magazine


def create_bolt_handle(weapon: bpy.types.Object) -> bpy.types.Object:
    """Add a restrained charging handle that follows the original AK receiver."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0065, depth=0.038)
    bolt = bpy.context.object
    bolt.name = "coro_solto_ak_bolt_handle"
    bolt.rotation_euler = (math.radians(90), 0.0, 0.0)
    bolt.location = (-0.045, -0.036, 0.105)
    bolt.matrix_world = weapon.matrix_world @ bolt.matrix_world
    material = bpy.data.materials.get("AK_Bolt_Steel") or bpy.data.materials.new("AK_Bolt_Steel")
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.018, 0.022, 0.028, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.72
    bsdf.inputs["Roughness"].default_value = 0.34
    bolt.data.materials.append(material)
    bevel = bolt.modifiers.new("bolt_edge", "BEVEL")
    bevel.width = 0.0015
    bevel.segments = 2
    return bolt


def make_weapon_hierarchy(weapon: bpy.types.Object, magazine: bpy.types.Object, bolt: bpy.types.Object) -> bpy.types.Object:
    root = bpy.data.objects.new("AK_Viewmodel_Root", None)
    bpy.context.collection.objects.link(root)
    for child in (weapon, magazine, bolt):
        world = child.matrix_world.copy()
        child.parent = root
        child.matrix_world = world
    return root


def close_hand(side: str, amount: float, trigger: bool = False) -> None:
    for finger in ("pinky", "ring", "middle", "index", "thumb"):
        for digit in (1, 2, 3):
            bone = ARM.pose.bones[f"finger_{finger}{digit}.{side}"]
            bone.rotation_mode = "QUATERNION"
            if finger == "thumb":
                bend = (0.36, 0.62, 0.50)[digit - 1] * amount
                # The left thumb was previously rotated like the right one,
                # which left it vertical in the classic "thumbs-up" defect.
                # The measured mirrored chain closes around local +Z.
                if side == "l":
                    bone.rotation_quaternion = Quaternion((0, 0, 1), bend)
                else:
                    bone.rotation_quaternion = Quaternion((0, 0, 1), -0.18 * amount)
                    bone.rotation_quaternion @= Quaternion((1, 0, 0), bend)
            else:
                bend = (0.46, 0.88, 0.76)[digit - 1] * amount
                if trigger and finger == "index":
                    bend *= (0.18, 0.10, 0.08)[digit - 1]
                # Measured on a six-axis contact grid.  The mirrored left
                # chains curl around local -Z; treating them like the right
                # hand opens the fingers into a claw instead of a grip.
                axis = (0, 0, 1) if side == "l" else (1, 0, 0)
                bone.rotation_quaternion = Quaternion(axis, -bend)


def world_to_armature(point: Vector) -> Vector:
    return ARM.matrix_world.inverted() @ point


def place_ik(name: str, world_point: Vector, rotation_offset=(0.0, 0.0, 0.0)) -> None:
    bone = ARM.pose.bones[name]
    target = world_to_armature(world_point)
    matrix = bone.matrix.copy()
    matrix.translation = target
    rotation = matrix.to_quaternion()
    rotation @= Quaternion((1, 0, 0), rotation_offset[0])
    rotation @= Quaternion((0, 1, 0), rotation_offset[1])
    rotation @= Quaternion((0, 0, 1), rotation_offset[2])
    matrix = Matrix.Translation(target) @ rotation.to_matrix().to_4x4()
    bone.matrix = matrix


def pose_idle(
    weapon: bpy.types.Object,
    left_rotation=(math.radians(90), math.radians(180), 0.0),
    right_rotation=(0.0, math.radians(270), 0.0),
    right_local=(-0.12, -0.005, -0.12),
    left_local=(0.245, -0.060, 0.040),
    right_close=1.0,
    left_close=0.94,
) -> None:
    for bone in ARM.pose.bones:
        bone.matrix_basis.identity()
        bone.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()

    # Targets are wrists, not palm centres.  They sit just stockward/below each
    # physical contact point so the fingers wrap onto the project mesh.
    right_grip = weapon.matrix_world @ Vector(right_local)
    left_foregrip = weapon.matrix_world @ Vector(left_local)

    # Preserve the authored wrist basis first; the contact render determines
    # the remaining small roll corrections, not a runtime approximation.
    place_ik("wrist_ik.r", right_grip, right_rotation)
    place_ik("wrist_ik.l", left_foregrip, left_rotation)
    place_ik("arm_target.r", Vector((0.34, -0.36, -0.40)))
    place_ik("arm_target.l", Vector((-0.10, -0.34, -0.55)))
    close_hand("r", right_close, trigger=True)
    close_hand("l", left_close, trigger=False)
    bpy.context.view_layer.update()
    print({
        "right_grip": list(right_grip),
        "left_foregrip": list(left_foregrip),
        "wrist_r": list(ARM.matrix_world @ ARM.pose.bones["wrist.r"].head),
        "wrist_l": list(ARM.matrix_world @ ARM.pose.bones["wrist.l"].head),
    })


def setup_camera_and_light() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.fps = FPS
    scene.render.filepath = str(PREVIEW)

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.028, 0.034, 0.042, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.42

    camera_data = bpy.data.cameras.new("AK_Pilot_Camera")
    camera = bpy.data.objects.new("AK_Pilot_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_euler = (0.0, 0.0, 0.0)
    camera_data.sensor_fit = "VERTICAL"
    # A dedicated viewmodel lens keeps classic FPS scale while the gameplay
    # camera remains wide.  It is validated independently at 3:2 and 16:9.
    camera_data.angle_y = math.radians(56.0)
    camera_data.clip_start = 0.025
    camera_data.clip_end = 20.0
    scene.camera = camera

    key_data = bpy.data.lights.new("AK_Key", "AREA")
    # Viewmodels are only centimetres from the lights.  The former 310 W key
    # clipped the dark glove to white and destroyed finger separation.
    key_data.energy = 32.0
    key_data.shape = "DISK"
    key_data.size = 2.0
    key = bpy.data.objects.new("AK_Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-0.8, 1.1, -0.4)
    key.rotation_euler = (math.radians(72), 0.0, math.radians(-28))

    fill_data = bpy.data.lights.new("AK_Fill", "AREA")
    fill_data.energy = 12.0
    fill_data.color = (0.72, 0.78, 0.86)
    fill_data.size = 1.2
    fill = bpy.data.objects.new("AK_Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (0.8, -0.1, -0.25)
    fill.rotation_euler = (math.radians(88), 0.0, math.radians(150))


def keyframe_pose(frame: int, weapon: bpy.types.Object, **pose_kwargs) -> None:
    scene = bpy.context.scene
    scene.frame_set(frame)
    pose_idle(weapon, **pose_kwargs)
    for name in ("wrist_ik.r", "wrist_ik.l", "arm_target.r", "arm_target.l"):
        bone = ARM.pose.bones[name]
        bone.keyframe_insert(data_path="location", frame=frame, group=name)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=name)
    for side in ("r", "l"):
        for finger in ("pinky", "ring", "middle", "index", "thumb"):
            for digit in (1, 2, 3):
                name = f"finger_{finger}{digit}.{side}"
                ARM.pose.bones[name].keyframe_insert(data_path="rotation_quaternion", frame=frame, group=name)


def keyframe_object(obj: bpy.types.Object, frame: int) -> None:
    obj.keyframe_insert(data_path="location", frame=frame)
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)


def animate_pilot(
    weapon: bpy.types.Object,
    magazine: bpy.types.Object,
    bolt: bpy.types.Object,
    root: bpy.types.Object,
) -> None:
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 285

    magazine_base = magazine.location.copy()
    bolt_base = bolt.location.copy()
    root_base = root.location.copy()
    weapon_basis = weapon.matrix_world.to_3x3()

    # Idle and fire. The two hands stay on their authored contact points.
    for frame in (1, 45, 90, 130, 142, 160):
        keyframe_pose(frame, weapon)
    for frame in (1, 130, 142, 160, 285):
        root.location = root_base
        root.rotation_euler = (0.0, 0.0, 0.0)
        keyframe_object(root, frame)
    root.location = root_base + Vector((0.012, -0.006, 0.052))
    root.rotation_euler = (math.radians(-1.6), math.radians(0.6), math.radians(-0.5))
    keyframe_object(root, 133)

    for frame in (1, 130, 142, 160):
        bolt.location = bolt_base
        keyframe_object(bolt, frame)
    bolt.location = bolt_base + weapon_basis @ Vector((-0.052, 0.0, 0.0))
    keyframe_object(bolt, 133)

    # Reload: support hand leaves the foregrip, locks to the moving magazine,
    # seats it, racks the charging handle and returns to its original contact.
    # Keep the validated support-hand basis throughout the path.  The old
    # draft changed all three wrist axes on every beat, creating the open-claw
    # silhouettes visible in the rejected contact sheet.
    support_grip = (math.radians(90), math.radians(180), 0.0)
    bolt_grip = (math.radians(180), math.radians(90), 0.0)

    # Reload staging is authored before the wrist keys so every contact point
    # is evaluated against the weapon's transformed world matrix.  Previously
    # the gun stayed frozen while the support arm moved by itself.
    reload_root_motion = {
        160: ((0.000, 0.000, 0.000), (0.0, 0.0, 0.0)),
        175: ((-0.020, 0.010, 0.000), (-1.0, -1.0, 5.0)),
        190: ((-0.045, 0.025, 0.010), (-2.0, -2.2, 10.0)),
        205: ((-0.065, 0.040, 0.020), (-3.0, -3.2, 15.0)),
        220: ((-0.075, 0.050, 0.022), (-3.5, -4.0, 18.0)),
        235: ((-0.060, 0.040, 0.015), (-2.8, -3.0, 14.0)),
        245: ((-0.030, 0.020, 0.005), (-1.5, -1.5, 8.0)),
        252: ((0.020, 0.025, 0.000), (-1.0, 4.0, -4.0)),
        262: ((0.025, 0.030, 0.000), (-1.5, 5.0, -6.0)),
        272: ((0.010, 0.010, 0.000), (-0.8, 2.0, -2.0)),
        285: ((0.000, 0.000, 0.000), (0.0, 0.0, 0.0)),
    }
    for frame, (position, rotation_degrees) in reload_root_motion.items():
        scene.frame_set(frame)
        root.location = root_base + Vector(position)
        root.rotation_euler = tuple(math.radians(value) for value in rotation_degrees)
        keyframe_object(root, frame)

    reload_poses = {
        175: ((0.105, -0.030, -0.030), support_grip, 0.90),
        190: ((0.045, -0.030, -0.030), support_grip, 0.98),
        205: ((0.052, -0.034, -0.115), support_grip, 0.98),
        220: ((0.080, -0.040, -0.205), support_grip, 0.98),
        235: ((0.055, -0.034, -0.120), support_grip, 0.98),
        245: ((0.045, -0.030, -0.030), support_grip, 0.98),
        252: ((-0.040, 0.010, 0.140), bolt_grip, 1.00),
        262: ((-0.090, 0.010, 0.140), bolt_grip, 1.00),
        272: ((-0.040, 0.010, 0.140), bolt_grip, 1.00),
        285: ((0.245, -0.060, 0.040), support_grip, 0.94),
    }
    for frame, (left_local, left_rotation, left_close) in reload_poses.items():
        keyframe_pose(
            frame,
            weapon,
            left_local=left_local,
            left_rotation=left_rotation,
            left_close=left_close,
        )

    mag_motion = {
        160: Vector((0.0, 0.0, 0.0)),
        190: Vector((0.0, 0.0, 0.0)),
        205: Vector((0.005, -0.006, -0.080)),
        220: Vector((0.030, -0.012, -0.172)),
        235: Vector((0.010, -0.006, -0.086)),
        245: Vector((0.0, 0.0, 0.0)),
        285: Vector((0.0, 0.0, 0.0)),
    }
    for frame, local_delta in mag_motion.items():
        magazine.location = magazine_base + weapon_basis @ local_delta
        keyframe_object(magazine, frame)

    for frame in (160, 245, 252, 272, 285):
        bolt.location = bolt_base
        keyframe_object(bolt, frame)
    bolt.location = bolt_base + weapon_basis @ Vector((-0.052, 0.0, 0.0))
    keyframe_object(bolt, 262)

    # Blender 5.2 stores keyed channels in layered Actions.  The default
    # interpolation is Bezier, which is the intended easing for this pilot.


def render_frame(frame: int, path: Path) -> None:
    bpy.context.scene.frame_set(frame)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_and_save() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    bpy.ops.render.render(write_still=True)
    print(f"AK_PILOT_BLOCKOUT blend={OUT_BLEND} preview={PREVIEW}")


def main() -> None:
    remove_old_scene_extras()
    prepare_arms()
    weapon = import_project_ak()
    magazine = separate_magazine(weapon)
    bolt = create_bolt_handle(weapon)
    root = make_weapon_hierarchy(weapon, magazine, bolt)
    setup_camera_and_light()
    animate_pilot(weapon, magazine, bolt, root)
    render_and_save()
    sample_dir = OUT_DIR / "renders" / "sequence"
    sample_dir.mkdir(parents=True, exist_ok=True)
    for frame in (1, 45, 90, 130, 133, 142, 160, 175, 190, 205, 220, 235, 245, 252, 262, 272, 285):
        render_frame(frame, sample_dir / f"frame_{frame:03d}.png")


if __name__ == "__main__":
    main()
