"""Build the Coro Solto high-resolution pistol FPS family pilot.

The CC0 donor contributes only first-person anatomy, rig deformation and motion
timing.  Its visible pistol and all donor materials are removed.  The weapon
seen in the export is public/models/weapons/pistol.glb plus a project-authored
internal magazine used by the reload contact animation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "fps_pistol_animated.glb"
PROJECT = ROOT / "public" / "models" / "weapons" / "pistol.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot"
BLEND = OUT / "pistol-hires-pilot.blend"
GLB = OUT / "pistol-hires-pilot.glb"
PUBLIC = ROOT / "public" / "models" / "viewmodels" / "coro" / "pistol-hires.glb"
RENDERS = OUT / "renders"

IDLE_SOURCE = 0
# The source package is authored as a one-handed pistol.  Frame 36 is the one
# moment where the support palm is already vertical and closed around the base
# of the firing grip.  Borrowing only that arm channel gives us a genuine
# two-hand stance; later reload frames put the palm above the slide and produced
# the floating/deformed hand seen in the rejected browser pilot.
IDLE_SUPPORT_SOURCE = 36
SUPPORT_PREFIX = "L_"
# Screen-space registration validated against the idle/fire contact sheet.  The
# rejected (2, -3, -2) pose parked the support palm under the magazine.  This
# offset brings both palms together around the firing grip while keeping the
# support thumb clear of the slide and trigger guard.
SUPPORT_WRIST_OFFSET = Vector((6.0, -1.0, -0.35))
# The donor support frame is a reload contact, so its thumb remains vertical.
# A measured local Z correction converts it into a compact two-hand firing
# grip while preserving the donor's finger curl and high-resolution anatomy.
SUPPORT_WRIST_ROTATION_DEG = (0.0, 0.0, 30.0)
CLIPS = {
    # Frame 48 is the settled loaded pose.  Starting at 56 skipped the actual
    # hand-off and made the magazine appear already detached.
    "Reload": list(range(48, 105, 2)),
    "Equip": list(range(112, 145, 2)),
    "Shoot": list(range(160, 185)),
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--doador", type=Path, default=DONOR)
    parser.add_argument("--arma", type=Path, default=PROJECT)
    parser.add_argument("--saida", type=Path, default=OUT)
    parser.add_argument("--publicar", action="store_true")
    return parser.parse_args(argv)


def configure_paths(args: argparse.Namespace) -> None:
    global DONOR, PROJECT, OUT, BLEND, GLB, RENDERS
    DONOR = args.doador.resolve()
    PROJECT = args.arma.resolve()
    OUT = args.saida.resolve()
    BLEND = OUT / "pistol-hires-pilot.blend"
    GLB = OUT / "pistol-hires-pilot.glb"
    RENDERS = OUT / "renders"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def material(name: str, color: tuple[float, float, float, float], roughness: float,
             metallic: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def setup_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.fps = 30
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("CoroSolto_Pistol_Hires_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.045, 0.06, 0.08, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.35
    scene.world = world


def key_bone(bone: bpy.types.PoseBone, frame: int) -> None:
    bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    if bone.rotation_mode == "QUATERNION":
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
    elif bone.rotation_mode == "AXIS_ANGLE":
        bone.keyframe_insert(data_path="rotation_axis_angle", frame=frame, group=bone.name)
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def load_donor() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Action]:
    imported = import_glb(DONOR)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    arms = next(obj for obj in imported if obj.name == "Object_7")
    weapon_control = next(obj for obj in imported if obj.name == "BPpistol")
    mag_control = next(obj for obj in imported if obj.name == "clip")
    source = next(iter(bpy.data.actions))
    rig.animation_data_create()
    rig.animation_data.action = source

    # A single export-safe material makes the donor texture impossible to ship.
    arms.data.materials.clear()
    arms.data.materials.append(material("CoroSolto_FP_Gloves", (0.105, 0.052, 0.028, 1), 0.68))
    for polygon in arms.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    arms.name = "coro_solto_hires_pistol_hands"
    rig.name = "coro_solto_hires_pistol_rig"
    rig["geometry_origin"] = "project-pistol-only"
    rig["anatomy_origin"] = "cc0-hires-topology-reskinned"
    rig["reference_policy"] = "donor-weapon-and-textures-deleted"
    return rig, arms, weapon_control, mag_control, source


def add_control_bones(rig: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, x in (
        ("CoroWeapon", 0.0),
        ("CoroMagazine", 0.08),
        ("CoroFreshMagazine", 0.16),
    ):
        bone = rig.data.edit_bones.new(name)
        bone.head = (x, 0.0, 0.0)
        bone.tail = (x, 1.0, 0.0)
        bone.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")


def bind_rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    modifier = obj.modifiers.new(f"CoroSolto_{bone_name}_Armature", "ARMATURE")
    modifier.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


def fit_project_weapon(rig: bpy.types.Object) -> tuple[bpy.types.Object, bpy.types.Object]:
    imported = import_glb(PROJECT)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one project pistol mesh, got {[obj.name for obj in meshes]}")
    weapon = meshes[0]
    world = weapon.matrix_world.copy()
    weapon.data.transform(world)
    weapon.matrix_world = Matrix.Identity(4)
    # Project muzzle points along -X.  Register that to the donor's -Y optical
    # axis and place the grip inside the verified firing-hand contact pose.
    fit = (
        Matrix.Translation(Vector((0.0, -18.55, 10.65)))
        @ Matrix.Rotation(math.radians(90.0), 4, "Z")
        @ Matrix.Scale(26.8, 4)
    )
    weapon.data.transform(fit)
    weapon.name = "coro_solto_project_pistol"
    bind_rigid(weapon, rig, "CoroWeapon")

    # The source GLB does not expose a detachable magazine shell.  Author a
    # compact internal magazine in the same project material; it is concealed
    # by the grip at idle and becomes visible only while physically in-hand.
    # Keep the seated prop completely inside the firing grip.  The previous
    # 1.8 x 7.2 x 8.4 block protruded below the hand during Shoot and read as a
    # second hand holding a magazine.  This compact shell is only revealed by
    # the authored extraction path below.
    bpy.ops.mesh.primitive_cube_add(location=(0.0, -13.35, 5.15), scale=(0.78, 1.55, 3.15))
    magazine = bpy.context.object
    magazine.name = "coro_solto_project_pistol_magazine"
    # Apply the dimensions before shaping so both exported props share real
    # geometry rather than a raw cube with object-level scale.  Tapering the
    # lower third gives the silhouette of a detachable double-stack magazine
    # and prevents the blocky proxy from reading like an animation helper.
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    min_z = min(vertex.co.z for vertex in magazine.data.vertices)
    max_z = max(vertex.co.z for vertex in magazine.data.vertices)
    taper_limit = min_z + (max_z - min_z) * 0.42
    for vertex in magazine.data.vertices:
        if vertex.co.z <= taper_limit:
            vertex.co.x *= 0.86
            vertex.co.y *= 0.90
    # Keep the detachable part visually legible against both the dark glove and
    # the pistol grip.  Reusing the weapon material made it disappear inside the
    # palm even when its transforms were technically correct.
    magazine.data.materials.append(
        material("CoroSolto_Pistol_Mag", (0.16, 0.18, 0.20, 1), 0.34, 0.74)
    )
    bevel = magazine.modifiers.new("CoroSolto_Magazine_Edges", "BEVEL")
    bevel.width = 0.18
    bevel.segments = 2
    bpy.context.view_layer.objects.active = magazine
    magazine.select_set(True)
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    # A professional reload needs two independent props: the spent magazine
    # leaving the pistol and the fresh magazine travelling with the support
    # hand.  Reusing one mesh made the prop teleport, freeze in the air, or
    # force the pistol to move toward it.
    fresh_magazine = magazine.copy()
    fresh_magazine.data = magazine.data.copy()
    fresh_magazine.name = "coro_solto_project_pistol_fresh_magazine"
    bpy.context.collection.objects.link(fresh_magazine)
    for group in list(fresh_magazine.vertex_groups):
        fresh_magazine.vertex_groups.remove(group)
    bind_rigid(magazine, rig, "CoroMagazine")
    bind_rigid(fresh_magazine, rig, "CoroFreshMagazine")
    return weapon, magazine


def sample_source(rig: bpy.types.Object, source: bpy.types.Action,
                  weapon_control: bpy.types.Object, mag_control: bpy.types.Object,
                  frame: int) -> tuple[dict[str, Matrix], Matrix, Matrix]:
    rig.animation_data.action = source
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return (
        {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones if not bone.name.startswith("Coro")},
        rig.matrix_world.inverted() @ weapon_control.matrix_world,
        rig.matrix_world.inverted() @ mag_control.matrix_world,
    )


def register_support_grip(rig: bpy.types.Object, pose: dict[str, Matrix]) -> None:
    """Seat the support palm around the firing hand instead of the magazine."""
    source_action = rig.animation_data.action
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        if bone.name in pose:
            bone.matrix_basis = pose[bone.name]
    bpy.context.view_layer.update()

    support_wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
    dominant_wrist = rig.pose.bones["R_wrist_026"].matrix.translation.copy()
    support_arm = rig.pose.bones["L_arm_01"]
    support_arm_matrix = support_arm.matrix.copy()
    support_arm_matrix.translation += dominant_wrist + SUPPORT_WRIST_OFFSET - support_wrist
    support_arm.matrix = support_arm_matrix
    bpy.context.view_layer.update()

    support_wrist_bone = rig.pose.bones["L_wrist_02"]
    x_deg, y_deg, z_deg = SUPPORT_WRIST_ROTATION_DEG
    support_wrist_bone.matrix_basis = (
        support_wrist_bone.matrix_basis
        @ Matrix.Rotation(math.radians(x_deg), 4, "X")
        @ Matrix.Rotation(math.radians(y_deg), 4, "Y")
        @ Matrix.Rotation(math.radians(z_deg), 4, "Z")
    )
    bpy.context.view_layer.update()

    for bone in rig.pose.bones:
        if bone.name.startswith(SUPPORT_PREFIX):
            pose[bone.name] = bone.matrix_basis.copy()
    rig.animation_data.action = source_action


def register_trigger_contact(pose: dict[str, Matrix]) -> None:
    """Seat the firing index in the trigger guard before the squeeze.

    The donor root angle leaves the index below the Coro Solto guard.  Moving
    that bone translates/elongates the finger in local space and breaks the
    knuckle.  Register it with a root rotation instead; the shot can then use
    only the two distal phalanges, like the inspected donor animation.
    """
    pose["R_point1_031"] = (
        pose["R_point1_031"]
        @ Matrix.Rotation(math.radians(-20.0), 4, "Y")
    )


def register_support_magazine_grip(pose: dict[str, Matrix]) -> None:
    """Close the support fingers around a magazine without deforming the palm.

    Frozen-pose calibration proved that negative local Y is the flexion axis
    for the four support fingers.  The thumb opposes them with its own measured
    local-Y chain.  Applying the rotations to phalanges, rather than translating
    fingertips, preserves every finger length and produces continuous contact.
    """
    finger_chains = (
        ("L_point1_07", "L_point2_08", "L_point3_09"),
        ("L_middle1_011", "L_middle2_012", "L_middle3_013"),
        ("L_ring1_016", "L_ring2_017", "L_ring3_018"),
        ("L_pink1_020", "L_pink2_021", "L_pink3_022"),
    )
    thumb_chain = ("L_thumb1_03", "L_thumb2_04", "L_thumb3_05")
    for chain in finger_chains:
        for bone_name, degrees in zip(chain, (-18.0, -45.0, -32.0)):
            pose[bone_name] = (
                pose[bone_name]
                @ Matrix.Rotation(math.radians(degrees), 4, "Y")
            )
    for bone_name, degrees in zip(thumb_chain, (14.0, -28.0, -18.0)):
        pose[bone_name] = (
            pose[bone_name]
            @ Matrix.Rotation(math.radians(degrees), 4, "Y")
        )


def support_pose_fk(
    rig: bpy.types.Object,
    pose: dict[str, Matrix],
    arm_xyz: tuple[float, float, float] = (0.0, 0.0, 0.0),
    elbow_xyz: tuple[float, float, float] = (0.0, 0.0, 0.0),
    wrist_xyz: tuple[float, float, float] = (0.0, 0.0, 0.0),
    root_delta: Vector = Vector((0.0, 0.0, 0.0)),
) -> tuple[dict[str, Matrix], Vector]:
    """Pose the reload arm through joints and an optional rigid root offset.

    Joint rotations keep the anatomical arc.  A translation of the complete
    support chain is safe because the first-person shoulder starts outside the
    camera: it preserves every segment length while giving the hand enough
    screen-space travel to make the magazine exchange readable.  This is not
    the old wrist-target stretch, which moved only an end contact.
    """
    previous_action = rig.animation_data.action
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = pose.get(bone.name, Matrix.Identity(4))
    bpy.context.view_layer.update()

    for bone_name, rotations in (
        ("L_arm_01", arm_xyz),
        ("L_elbow_00", elbow_xyz),
        ("L_wrist_02", wrist_xyz),
    ):
        bone = rig.pose.bones[bone_name]
        for axis, degrees in zip("XYZ", rotations):
            bone.matrix_basis = (
                bone.matrix_basis
                @ Matrix.Rotation(math.radians(degrees), 4, axis)
            )
    bpy.context.view_layer.update()

    if root_delta.length_squared > 0.0:
        support_root = rig.pose.bones["L_arm_01"]
        translated = support_root.matrix.copy()
        translated.translation += root_delta
        support_root.matrix = translated
        bpy.context.view_layer.update()

    result = {
        bone.name: bone.matrix_basis.copy()
        for bone in rig.pose.bones if bone.name.startswith(SUPPORT_PREFIX)
    }
    wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
    rig.animation_data.action = previous_action
    return result, wrist


def bake_actions(rig: bpy.types.Object, source: bpy.types.Action,
                 weapon_control: bpy.types.Object, mag_control: bpy.types.Object) -> None:
    idle_pose, idle_weapon, idle_mag = sample_source(
        rig, source, weapon_control, mag_control, IDLE_SOURCE
    )
    support_pose, _, _ = sample_source(
        rig, source, weapon_control, mag_control, IDLE_SUPPORT_SOURCE
    )
    for bone_name, matrix in support_pose.items():
        if bone_name.startswith(SUPPORT_PREFIX):
            idle_pose[bone_name] = matrix
    register_support_grip(rig, idle_pose)
    register_trigger_contact(idle_pose)
    weapon_bone = rig.pose.bones["CoroWeapon"]
    mag_bone = rig.pose.bones["CoroMagazine"]
    fresh_mag_bone = rig.pose.bones["CoroFreshMagazine"]
    hidden_control = Matrix.Scale(0.001, 4)

    def control_transform(delta: Vector, visible: bool = True) -> Matrix:
        return Matrix.Translation(delta) @ (
            Matrix.Identity(4) if visible else hidden_control
        )

    def set_control_delta(bone: bpy.types.PoseBone, current: Matrix, base: Matrix) -> None:
        delta = current @ base.inverted()
        bone.matrix = delta @ bone.bone.matrix_local

    idle = bpy.data.actions.new("Idle")
    idle.use_fake_user = True
    rig.animation_data.action = idle
    for frame in (0, 50, 100):
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            if bone.name in idle_pose:
                bone.matrix_basis = idle_pose[bone.name]
            elif bone.name == "CoroFreshMagazine":
                bone.matrix_basis = hidden_control
            else:
                bone.matrix_basis = Matrix.Identity(4)
            key_bone(bone, frame)

    for action_name, source_frames in CLIPS.items():
        sampled = [sample_source(rig, source, weapon_control, mag_control, frame) for frame in source_frames]
        action = bpy.data.actions.new(action_name)
        action.use_fake_user = True
        rig.animation_data.action = action
        if action_name == "Equip":
            camera_location = Vector((20.0, 36.0, 24.0))
            camera_target = Vector((12.0, -19.0, 14.0))
            camera_rotation = (camera_target - camera_location).to_track_quat("-Z", "Y")
            screen_down_world = camera_rotation @ Vector((0.0, -1.0, 0.0))
            screen_down_armature = (
                rig.matrix_world.to_3x3().inverted() @ screen_down_world
            ).normalized()
            for target_frame, offset in (
                (0, 50.0), (6, 36.0), (15, 16.0), (24, -1.2), (30, 0.0)
            ):
                bpy.context.scene.frame_set(target_frame)
                for bone in rig.pose.bones:
                    if bone.name == "CoroFreshMagazine":
                        bone.matrix_basis = hidden_control
                    else:
                        bone.matrix_basis = idle_pose.get(bone.name, Matrix.Identity(4))
                bpy.context.view_layer.update()
                assembly = Matrix.Translation(screen_down_armature * offset)
                for root_name in ("_rootJoint", "CoroWeapon", "CoroMagazine"):
                    root = rig.pose.bones[root_name]
                    root.matrix = assembly @ root.matrix
                bpy.context.view_layer.update()
                for bone in rig.pose.bones:
                    key_bone(bone, target_frame)
            action["source_frames"] = "project-authored camera-space rise"
            action["visual_policy"] = "rigid two-hand draw from below frame into Idle"
            continue
        if action_name == "Reload":
            # The reference clip never inserts a fresh magazine: after dropping
            # the old one it opens the support hand and racks its own slide.  Its
            # later poses therefore cannot be retargeted into a believable Coro
            # reload.  Keep the approved compact two-hand anatomy and author the
            # complete remove -> fetch -> insert -> release sequence here.
            # Keep the already-approved support-hand grip while it travels.
            # The donor never grasps a fresh magazine: its late "closed" pose
            # is actually a slide-rack silhouette and opens the palm toward the
            # camera.  Reusing it made the hand look like a claw beside the
            # magazine.  The idle support hand already forms a compact wrapped
            # grip, so moving that complete articulation around the magazine is
            # both anatomically stable and visually continuous.
            hold_pose = {name: matrix.copy() for name, matrix in idle_pose.items()}
            magazine_grip_pose = {
                name: matrix.copy() for name, matrix in hold_pose.items()
            }
            register_support_magazine_grip(magazine_grip_pose)
            seated = Vector((0.0, -13.35, 5.15))
            support_pose_fk(rig, idle_pose)

            # The donor shoulder/elbow rotations crossed the hand over the
            # pistol.  Move the complete approved support chain instead: its
            # segment lengths, wrist orientation and grasp silhouette remain
            # intact while the hand travels down-left to the belt and returns
            # along the exact reverse path.  These are first-person framing
            # translations, not end-effector stretching.
            neutral_joint = (0.0, 0.0, 0.0)
            # The magazine is held by its lower half, not by its centre.  The
            # previous trajectory preserved the seated-magazine-to-idle-wrist
            # separation, leaving the prop about 7.5 units behind the moving
            # hand.  Author the contact from the evaluated wrist itself so the
            # hand, rather than the pistol or an invisible world point, owns
            # the prop throughout removal and insertion.
            # In the production camera +X travels left and -Z travels down.
            # Put the magazine beside/below the palm so its body remains
            # visible instead of being completely swallowed by the glove.
            # Measured on the final deformed support-hand mesh.  The palm
            # surface sits about (-1, -5.5, +1) from L_wrist_02.  Put the
            # magazine's upper third in that surface and leave its body below
            # the fingers.  The former +8 Y offset was on the opposite side of
            # the hand and is why the prop looked like a blue block in mid-air.
            # Camera-space calibration on the evaluated production mesh:
            # this offset leaves the upper magazine inside the closed palm
            # while keeping the long body visible below it.  The old offset
            # clipped most of the prop below the viewport.
            # +Y is toward the production camera.  Keep the upper magazine in
            # front of the closed fingers, while lowering its centre so the
            # magazine body remains visible below the fist throughout travel.
            # Projection QA showed the former contact box at screen Y
            # -0.15..0.18: most of the magazine was literally below frame.
            # Raise it into the palm and bring it slightly toward the camera so
            # the fingers overlap the upper third while the body stays legible.
            # Frame-14 frozen-pose calibration must move the visible spent
            # magazine (CoroMagazine), not the hidden fresh prop.  With that
            # corrected, -5 X seats the upper third between the opposed thumb
            # and curled fingers; -2 X was visibly parked beside the palm.
            # Reuse the same measured contact for the replacement magazine.
            magazine_contact_offset = Vector((-5.0, 1.5, 6.25))
            reload_keys = (
                # frame, hand shape, shoulder rotation, elbow rotation,
                # rigid support-chain translation,
                # old visible/follows hand/contact weight,
                # fresh visible/follows hand/contact weight
                (0, idle_pose, (0, 0, 0), (0, 0, 0), Vector((0, 0, 0)), True, False, 0.0, False, False, 0.0),
                (4, idle_pose, (0, 0, 0), (0, 0, 0), Vector((0, 0, 0)), True, False, 0.0, False, False, 0.0),
                (8, hold_pose, (0, 0, 0), (0, 0, 0), Vector((0, 0, 0)), True, False, 0.0, False, False, 0.0),
                # Ease the prop from the well into the palm instead of
                # teleporting its centre to the wrist on the first key.
                (12, magazine_grip_pose, neutral_joint, neutral_joint, Vector((4.0, 0.0, -0.25)), True, True, 0.35, False, False, 0.0),
                # The old magazine is now visibly owned by the support hand
                # well to the left of the pistol, instead of hovering directly
                # below the fixed weapon.
                (16, magazine_grip_pose, neutral_joint, neutral_joint, Vector((10.0, 0.0, -1.0)), True, True, 1.0, False, False, 0.0),
                # Dip below the frame to discard/fetch.  The prop swap happens
                # out of sight inside the same closed grip; this avoids a
                # floating magazine or a magical mid-screen replacement.
                (20, magazine_grip_pose, neutral_joint, neutral_joint, Vector((24.0, 0.0, -12.0)), False, False, 0.0, False, False, 0.0),
                (22, magazine_grip_pose, neutral_joint, neutral_joint, Vector((24.0, 0.0, -12.0)), False, False, 0.0, True, True, 1.0),
                # The hand leads the fresh prop back to the well.  Contact
                # weight eases to zero only as it physically reaches the gun.
                (26, magazine_grip_pose, neutral_joint, neutral_joint, Vector((18.0, 0.0, -5.0)), False, False, 0.0, True, True, 1.0),
                # Hold the replacement magazine in a readable lower-left
                # silhouette before moving it to the well.  The former four
                # frame return was too fast to read at gameplay scale.
                (30, magazine_grip_pose, neutral_joint, neutral_joint, Vector((10.0, 0.0, -1.0)), False, False, 0.0, True, True, 1.0),
                (36, magazine_grip_pose, neutral_joint, neutral_joint, Vector((3.0, 0.0, 0.0)), False, False, 0.0, True, True, 0.35),
                # Seat the magazine while the closed hand still surrounds its
                # base, then release and return to the firing grip.
                (40, magazine_grip_pose, neutral_joint, neutral_joint, Vector((0, 0, 0)), False, False, 0.0, True, False, 0.0),
                (44, idle_pose, (0, 0, 0), (0, 0, 0), Vector((0, 0, 0)), False, False, 0.0, True, False, 0.0),
                (48, idle_pose, (0, 0, 0), (0, 0, 0), Vector((0, 0, 0)), False, False, 0.0, True, False, 0.0),
            )
            for (
                target_frame, hand_shape, arm_xyz, elbow_xyz, root_delta,
                old_visible, old_follows_hand, old_contact_weight,
                fresh_visible, fresh_follows_hand, fresh_contact_weight,
            ) in reload_keys:
                support, wrist = support_pose_fk(
                    rig, hand_shape, arm_xyz=arm_xyz, elbow_xyz=elbow_xyz,
                    root_delta=root_delta,
                )
                # Blend between the seated well and a point rigidly owned by
                # the evaluated wrist.  At contact weight 1 the magazine is
                # beside and below the closed palm; intermediate weights ease
                # it out of / back into the well without a floating pause.
                contact_position = wrist + magazine_contact_offset
                old_position = (
                    seated.lerp(contact_position, old_contact_weight)
                    if old_follows_hand else seated
                )
                fresh_position = (
                    seated.lerp(contact_position, fresh_contact_weight)
                    if fresh_follows_hand else seated
                )
                rig.animation_data.action = action
                bpy.context.scene.frame_set(target_frame)
                for bone in rig.pose.bones:
                    if bone.name.startswith(SUPPORT_PREFIX):
                        bone.matrix_basis = support[bone.name]
                    else:
                        bone.matrix_basis = idle_pose.get(bone.name, Matrix.Identity(4))
                    if not bone.name.startswith("Coro"):
                        key_bone(bone, target_frame)
                weapon_bone.matrix_basis = Matrix.Identity(4)
                mag_bone.matrix_basis = control_transform(old_position - seated, old_visible)
                fresh_mag_bone.matrix_basis = control_transform(
                    fresh_position - seated, fresh_visible
                )
                key_bone(weapon_bone, target_frame)
                key_bone(mag_bone, target_frame)
                key_bone(fresh_mag_bone, target_frame)
            action["source_frames"] = "project-authored remove/fetch/insert/release trajectory"
            action["visual_policy"] = "spent-mag removal plus hand-led fresh-mag insertion"
            continue
        if action_name == "Shoot":
            # The donor's trigger flex lives at the end of a long one-handed
            # clip.  Compress only the firing index chain into the instant of
            # the shot; every other bone retains the approved two-hand grip.
            trigger_pose = {name: matrix.copy() for name, matrix in idle_pose.items()}
            trigger_fingers = {"R_point1_031", "R_point2_032", "R_point3_033"}
            # A six-variant side-view diagnostic proved the former negative-Y
            # root rotation straightened the index finger out of the guard.
            # Curl the three phalanges in positive local Y so the fingertip
            # moves rearward against the trigger instead of sliding forward.
            trigger_curl = {
                "R_point1_031": 14.0,
                "R_point2_032": 24.0,
                "R_point3_033": 14.0,
            }
            for bone_name, degrees in trigger_curl.items():
                trigger_pose[bone_name] = (
                    idle_pose[bone_name]
                    @ Matrix.Rotation(math.radians(degrees), 4, "Y")
                )
            recoil_factors = {0: 0.0, 1: 1.0, 3: 0.82, 5: 0.22, 8: 0.0}
            for target_frame, pressed in (
                (0, False), (1, True), (3, True), (5, False), (8, False)
            ):
                bpy.context.scene.frame_set(target_frame)
                for bone in rig.pose.bones:
                    if bone.name in trigger_fingers and pressed:
                        bone.matrix_basis = trigger_pose[bone.name]
                    elif bone.name in idle_pose:
                        bone.matrix_basis = idle_pose[bone.name]
                    elif bone.name == "CoroFreshMagazine":
                        bone.matrix_basis = hidden_control
                    else:
                        bone.matrix_basis = Matrix.Identity(4)
                # Move hands, pistol and seated magazine as one rigid assembly
                # during the shot.  This makes the authored clip unmistakable
                # in the browser without breaking either hand contact or making
                # the support hand look like it is holding a loose magazine.
                recoil = Vector((0.30, 2.05, 1.65)) * recoil_factors[target_frame]
                assembly = Matrix.Translation(recoil)
                for root_name in ("_rootJoint", "CoroWeapon", "CoroMagazine"):
                    root = rig.pose.bones[root_name]
                    root.matrix_basis = assembly @ idle_pose.get(root_name, Matrix.Identity(4))
                for bone in rig.pose.bones:
                    key_bone(bone, target_frame)
            action["source_frames"] = "project-authored trigger-chain compressed to frames 0-8"
            action["visual_policy"] = "two-hand firing grip with visible trigger press"
            continue
        # Reload begins and ends in the approved two-hand stance.  This prevents
        # the helper hand from popping away before it reaches the magazine.
        lead = 4 if action_name == "Reload" else 0
        if lead:
            bpy.context.scene.frame_set(0)
            for bone in rig.pose.bones:
                bone.matrix_basis = idle_pose.get(bone.name, Matrix.Identity(4))
                key_bone(bone, 0)
        for sample_index, (pose, weapon_matrix, mag_matrix) in enumerate(sampled):
            target_frame = sample_index + lead
            bpy.context.scene.frame_set(target_frame)
            corrected_mag_matrix = mag_matrix
            if action_name == "Reload":
                # Retarget only the support arm around the replacement pistol.
                # Counteracting the removed donor weapon's motion prevents the
                # pistol from chasing a magazine that appears fixed in space.
                previous_action = rig.animation_data.action
                rig.animation_data.action = None
                for bone in rig.pose.bones:
                    if bone.name in pose:
                        bone.matrix_basis = pose[bone.name]
                bpy.context.view_layer.update()
                weapon_delta = weapon_matrix @ idle_weapon.inverted()
                support_arm = rig.pose.bones["L_arm_01"]
                support_arm.matrix = weapon_delta.inverted() @ support_arm.matrix
                bpy.context.view_layer.update()
                for bone in rig.pose.bones:
                    if bone.name.startswith(SUPPORT_PREFIX):
                        pose[bone.name] = bone.matrix_basis.copy()
                corrected_mag_matrix = weapon_delta.inverted() @ mag_matrix
                rig.animation_data.action = previous_action
            for bone in rig.pose.bones:
                if bone.name in pose:
                    # The donor fires one-handed and moves the other hand as if
                    # it were still handling a magazine.  Coro Solto's firing
                    # clip keeps the complete approved two-hand grip; gameplay
                    # recoil moves the assembled viewmodel as one rigid unit.
                    if action_name == "Reload" and not bone.name.startswith(SUPPORT_PREFIX):
                        bone.matrix_basis = idle_pose[bone.name]
                    else:
                        bone.matrix_basis = pose[bone.name]
            if action_name in {"Shoot", "Reload"}:
                weapon_bone.matrix_basis = Matrix.Identity(4)
            else:
                set_control_delta(weapon_bone, weapon_matrix, idle_weapon)
            if action_name == "Reload":
                set_control_delta(mag_bone, corrected_mag_matrix, idle_mag)
            else:
                mag_bone.matrix_basis = Matrix.Identity(4)
            fresh_mag_bone.matrix_basis = hidden_control
            key_bone(weapon_bone, target_frame)
            key_bone(mag_bone, target_frame)
            key_bone(fresh_mag_bone, target_frame)
            for bone in rig.pose.bones:
                if not bone.name.startswith("Coro"):
                    key_bone(bone, target_frame)
        if action_name == "Reload":
            target_frame = len(sampled) + lead + 3
            bpy.context.scene.frame_set(target_frame)
            for bone in rig.pose.bones:
                bone.matrix_basis = idle_pose.get(bone.name, Matrix.Identity(4))
                key_bone(bone, target_frame)
            weapon_bone.matrix_basis = Matrix.Identity(4)
            mag_bone.matrix_basis = Matrix.Identity(4)
            fresh_mag_bone.matrix_basis = hidden_control
            key_bone(weapon_bone, target_frame)
            key_bone(mag_bone, target_frame)
            key_bone(fresh_mag_bone, target_frame)
        action["source_frames"] = f"{source_frames[0]}-{source_frames[-1]}"
        action["visual_policy"] = "baked CC0 anatomy motion; project weapon controls"
    bpy.data.actions.remove(source)


def remove_donor_weapon(rig: bpy.types.Object, arms: bpy.types.Object) -> None:
    keep = {rig, arms}
    parent = rig.parent
    while parent:
        keep.add(parent)
        parent = parent.parent
    for obj in list(bpy.data.objects):
        # A câmera do pacote CC0 é apenas uma prévia do autor e fica muito próxima das
        # mãos. Preservá-la fazia o carregador web escolher essa câmera antes da câmera
        # de produção, embora os renders do Blender usassem a câmera correta.
        if obj not in keep and not obj.name.startswith("coro_solto_project"):
            bpy.data.objects.remove(obj, do_unlink=True)
    # Delete orphan donor materials/images after the visible meshes are gone.
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)


def setup_camera_and_lights() -> None:
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Pistol_Hires_FP_Camera")
    camera = bpy.data.objects.new("Pistol_Hires_FP_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    # The donor preview camera sat inside the hands.  The production camera is
    # deliberately farther back and slightly right, matching the readable
    # CS-style screen occupancy established by the approved AK mold.
    # Move closer to the pistol's longitudinal axis.  This replaces the flat
    # side-profile silhouette with visible slide/top depth while preserving the
    # complete hand/weapon registration authored in the rig.
    # Keep the pistol on the classic lower-right FPS side, but view it much
    # closer to its optical axis.  The previous 41-degree yaw exposed too much
    # of the slide's side and made the two-hand grip read like a loose,
    # one-handed pose in game.  This 28-degree yaw preserves the silhouette
    # while letting the muzzle/front sight lead toward the crosshair.
    # Physical, zero-shift composition selected from the render grid.  glTF
    # does not serialize Blender's optical shift, so screen placement must be
    # encoded entirely by the camera transform.  This angle keeps the slide
    # readable from the front, preserves both hands, and occupies the classic
    # lower-right FPS quadrant after the exported camera inverse is applied.
    camera.location = (20.0, 36.0, 24.0)
    target = Vector((12.0, -19.0, 14.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.sensor_fit = "VERTICAL"
    camera_data.angle_y = math.radians(58.0)
    camera_data.shift_x = 0.0
    camera_data.shift_y = 0.0
    camera_data.clip_start = 0.03
    camera_data.clip_end = 1000.0
    camera["coro_viewmodel_camera"] = True
    camera["vertical_fov_deg"] = 58.0
    camera["reference_aspect"] = "3:2"
    scene.camera = camera

    key_data = bpy.data.lights.new("Pistol_Key", "AREA")
    key_data.energy = 4200
    key_data.shape = "DISK"
    key_data.size = 8.0
    key = bpy.data.objects.new("Pistol_Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-7.0, -7.0, 28.0)
    key.rotation_euler = (math.radians(35), 0.0, math.radians(-25))


def render_action(rig: bpy.types.Object, action: str, frames: list[int], prefix: str) -> None:
    rig.animation_data.action = bpy.data.actions[action]
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = str(RENDERS / f"{prefix}_{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


def export(rig: bpy.types.Object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CAMERA"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS",
        export_skins=True, export_morph=True, export_cameras=True,
        export_extras=True, export_apply=False,
    )


def main() -> None:
    args = parse_args()
    configure_paths(args)
    if not DONOR.is_file() or not PROJECT.is_file():
        raise RuntimeError(f"Pistol input missing: donor={DONOR} weapon={PROJECT}")
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    # Never mix frames from an older iteration into the current visual gate.
    # Stale PNGs previously made contact sheets look complete even when the
    # current build had failed or rendered a shorter sequence.
    for stale_render in RENDERS.glob("*.png"):
        stale_render.unlink()
    setup_scene()
    rig, arms, weapon_control, mag_control, source = load_donor()
    add_control_bones(rig)
    bake_actions(rig, source, weapon_control, mag_control)
    fit_project_weapon(rig)
    remove_donor_weapon(rig, arms)
    setup_camera_and_lights()
    if os.environ.get("CORO_VM_SKIP_RENDERS") != "1":
        render_action(rig, "Idle", [0, 50, 100], "idle")
        # Include the exact squeeze keys.  Sampling only even frames previously
        # allowed a visibly static trigger finger to pass the contact sheet.
        render_action(rig, "Shoot", [0, 1, 3, 5, 8], "shoot")
        render_action(rig, "Reload", list(range(0, 49, 2)), "reload")
        render_action(rig, "Equip", [0, 6, 15, 24, 30], "equip")
    export(rig)
    report = {
        "builder": str(Path(__file__).resolve()),
        "blender": bpy.app.version_string,
        "donor": {"path": str(DONOR), "sha256": sha256(DONOR)},
        "weapon": {"path": str(PROJECT), "sha256": sha256(PROJECT)},
        "blend": str(BLEND),
        "glb": {"path": str(GLB), "sha256": sha256(GLB)},
        "published": bool(args.publicar),
    }
    if args.publicar:
        PUBLIC.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(GLB, PUBLIC)
        report["publicGlb"] = {"path": str(PUBLIC), "sha256": sha256(PUBLIC)}
    (OUT / "build-report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print("PISTOL_HIRES_PILOT=" + json.dumps(report))


if __name__ == "__main__":
    main()
