"""Build the Coro Solto knife pilot from the approved pistol hand contract.

The visible knife is always ``public/models/weapons/knife.glb``. The hand mesh,
material and deformation rig come from the already-approved Coro Solto pistol
viewmodel. No geometry, material or texture from the local knife reference is
imported or exported.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[4]
PROJECT_KNIFE = ROOT / "public/models/weapons/knife.glb"
DEFAULT_PISTOL = ROOT / "public/models/viewmodels/coro/pistol-hires.glb"
APPROVED_PISTOL = Path(os.environ.get("CORO_VM_APPROVED_PISTOL", DEFAULT_PISTOL)).resolve()
DONOR_REFERENCE = Path.home() / "Downloads/knife_animated.glb"
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot"
BLEND = OUT / "knife-melee-pilot.blend"
GLB = OUT / "knife-hires.glb"
PUBLIC = ROOT / "public/models/viewmodels/coro/melee/knife-hires.glb"
RENDERS = OUT / "renders"
VALIDATION = OUT / "validation"

ROOT_BONE = "_rootJoint"
WEAPON_BONE = "CoroWeapon"
GRIP = Vector((0.0, -11.5, 5.3))
# Give the own-project blade enough screen-space lateral component to read as a
# knife instead of collapsing into an end-on sliver in the pistol camera.
KNIFE_AXIS = Vector((0.38, -0.85, 0.36)).normalized()
PIVOT = Vector((0.0, -11.5, 5.5))


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


def setup_scene() -> None:
    if not APPROVED_PISTOL.exists():
        raise FileNotFoundError(
            f"Approved pistol viewmodel not found: {APPROVED_PISTOL}. "
            "Set CORO_VM_APPROVED_PISTOL while the pistol family is on another branch."
        )
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.fps = 30
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("CoroSolto_Melee_Hires_World")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.045, 0.06, 0.08, 1)
    background.inputs["Strength"].default_value = 1.65
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


def relax_support_hand(rig: bpy.types.Object) -> None:
    """Turn the pistol support grip into a relaxed, anatomically curled hand."""
    finger_chains = (
        ("L_point1_07", "L_point2_08", "L_point3_09"),
        ("L_middle1_011", "L_middle2_012", "L_middle3_013"),
        ("L_ring1_016", "L_ring2_017", "L_ring3_018"),
        ("L_pink1_020", "L_pink2_021", "L_pink3_022"),
    )
    # Negative local Y is flexion on this rig. Positive offsets partially open
    # the wrapped pistol support grip so palm and three staggered fingers read,
    # without returning to a flat/fanned hand.
    openness = ((8.0, 10.0, 6.0), (5.0, 8.0, 5.0),
                (2.0, 6.0, 4.0), (0.0, 4.0, 3.0))
    for chain, values in zip(finger_chains, openness):
        for bone_name, degrees in zip(chain, values):
            bone = rig.pose.bones[bone_name]
            bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(math.radians(degrees), 4, "Y")
    for bone_name, degrees in zip(
        ("L_thumb1_03", "L_thumb2_04", "L_thumb3_05"), (3.0, -3.0, -2.0)
    ):
        bone = rig.pose.bones[bone_name]
        bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(math.radians(degrees), 4, "Y")
    wrist = rig.pose.bones["L_wrist_02"]
    wrist.matrix_basis = (
        wrist.matrix_basis
        @ Matrix.Rotation(math.radians(28.0), 4, "X")
        @ Matrix.Rotation(math.radians(-20.0), 4, "Z")
    )
    bpy.context.view_layer.update()
    root = rig.pose.bones["L_arm_01"]
    moved = root.matrix.copy()
    # Park the relaxed hand low-left so its curled silhouette supports the
    # composition without ever meeting the blade during slash/stab.
    moved.translation += Vector((27.0, 0.0, -2.0))
    root.matrix = moved


def tighten_dominant_grip(rig: bpy.types.Object) -> None:
    """Close the pistol trigger finger and thumb around the knife handle."""
    for bone_name, degrees in {
        "R_point1_031": 35.0,
        "R_point2_032": 55.0,
        "R_point3_033": 35.0,
        # The pistol pose leaves the thumb laid along the receiver.  Curl all
        # three joints toward the knife handle so the runtime slash cannot
        # read as an open trigger/pointing gesture from the side camera.
        "R_thumb1_027": 24.0,
        "R_thumb2_028": 32.0,
        "R_thumb3_029": 22.0,
    }.items():
        bone = rig.pose.bones[bone_name]
        bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(math.radians(degrees), 4, "Y")


def load_approved_hands() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    imported = import_glb(APPROVED_PISTOL)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    hands = next(obj for obj in imported if obj.name == "coro_solto_hires_pistol_hands")
    camera = next(obj for obj in imported if obj.type == "CAMERA")
    idle = bpy.data.actions.get("Idle")
    if idle is None:
        raise RuntimeError("Approved pistol viewmodel has no Idle action")
    rig.animation_data_create()
    rig.animation_data.action = idle
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    base = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}

    # The professional hand mesh is the only inherited visible geometry.
    for obj in list(imported):
        if obj.type == "MESH" and obj != hands:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    rig.animation_data.action = None
    for track in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(track)

    for bone in rig.pose.bones:
        bone.matrix_basis = base.get(bone.name, Matrix.Identity(4))
    bpy.context.view_layer.update()
    relax_support_hand(rig)
    tighten_dominant_grip(rig)
    bpy.context.view_layer.update()
    rig["melee_hand_contract"] = "approved-pistol-hires-mesh-material-rig"
    rig["approved_pistol_sha256"] = sha256(APPROVED_PISTOL)
    rig["donor_knife_geometry_exported"] = False
    rig["donor_knife_materials_exported"] = False
    rig["project_weapon"] = "public/models/weapons/knife.glb"
    rig.name = "coro_solto_hires_melee_rig"
    hands.name = "coro_solto_hires_melee_hands"
    camera.name = "Melee_Hires_FP_Camera"
    camera.data.name = "Melee_Hires_FP_Camera"
    camera.data.lens = 46.0
    camera.data.sensor_width = 36.0
    camera.data.clip_start = 0.03
    camera.data.clip_end = 200.0
    camera["coro_viewmodel_camera"] = True
    camera["reference_aspect"] = "3:2"
    camera["source_contract"] = "approved-pistol-hires"
    bpy.context.scene.camera = camera
    return rig, hands, camera


def bind_rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    modifier = obj.modifiers.new("CoroSolto_Melee_Weapon_Armature", "ARMATURE")
    modifier.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


def fit_project_knife(rig: bpy.types.Object) -> bpy.types.Object:
    imported = import_glb(PROJECT_KNIFE)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one project knife mesh, got {[obj.name for obj in meshes]}")
    knife = meshes[0]
    knife.data.transform(knife.matrix_world)
    knife.matrix_world = Matrix.Identity(4)
    rotation = Vector((1.0, 0.0, 0.0)).rotation_difference(KNIFE_AXIS).to_matrix().to_4x4()
    fit = (
        Matrix.Translation(GRIP)
        @ rotation
        @ Matrix.Scale(37.0, 4)
        @ Matrix.Translation(Vector((0.36, 0.0, 0.0)))
    )
    knife.data.transform(fit)
    knife.name = "coro_solto_project_knife"
    bind_rigid(knife, rig, WEAPON_BONE)
    return knife


def base_pose(rig: bpy.types.Object) -> dict[str, Matrix]:
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def assembly_transform(translation: tuple[float, float, float],
                       rotation: tuple[float, float, float]) -> Matrix:
    matrix = Matrix.Translation(Vector(translation)) @ Matrix.Translation(PIVOT)
    for axis, degrees in zip("XYZ", rotation):
        matrix = matrix @ Matrix.Rotation(math.radians(degrees), 4, axis)
    return matrix @ Matrix.Translation(-PIVOT)


def pose_action_key(rig: bpy.types.Object, pose: dict[str, Matrix], frame: int,
                    translation: tuple[float, float, float],
                    rotation: tuple[float, float, float],
                    support_delta: tuple[float, float, float] = (0.0, 0.0, 0.0),
                    dominant_only: bool = False) -> None:
    for bone in rig.pose.bones:
        bone.matrix_basis = pose.get(bone.name, Matrix.Identity(4))
    bpy.context.view_layer.update()
    transform = assembly_transform(translation, rotation)
    animated_roots = ("R_arm_024", WEAPON_BONE) if dominant_only else (ROOT_BONE, WEAPON_BONE)
    for bone_name in animated_roots:
        bone = rig.pose.bones[bone_name]
        bone.matrix = transform @ bone.matrix
    if any(abs(value) > 1e-6 for value in support_delta):
        support = rig.pose.bones["L_arm_01"]
        moved = support.matrix.copy()
        moved.translation += Vector(support_delta)
        support.matrix = moved
    bpy.context.view_layer.update()
    for bone in rig.pose.bones:
        key_bone(bone, frame)


def make_action(rig: bpy.types.Object, pose: dict[str, Matrix], name: str,
                keys: list[tuple]) -> None:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for key in keys:
        frame, translation, rotation, support_delta, *options = key
        bpy.context.scene.frame_set(frame)
        pose_action_key(rig, pose, frame, translation, rotation, support_delta,
                        bool(options and options[0]))
    action["hand_contract"] = "approved-pistol-hires"
    action["visual_policy"] = "dominant grip contact; relaxed support counter-motion"


def build_actions(rig: bpy.types.Object) -> dict[str, list[int]]:
    pose = base_pose(rig)
    zero = (0.0, 0.0, 0.0)
    make_action(rig, pose, "Idle", [
        (0, zero, zero, zero),
        (30, (0.0, 0.12, 0.12), (0.0, 0.0, 0.6), (-0.12, 0.0, 0.08)),
        (60, zero, zero, zero),
    ])
    make_action(rig, pose, "Draw", [
        (0, (0.0, 3.0, -8.0), (12.0, -8.0, 18.0), (1.2, 0.0, -0.8)),
        (3, (0.0, 1.8, -4.2), (7.0, -5.0, 10.0), (0.7, 0.0, -0.4)),
        (7, (0.0, 0.5, -1.2), (2.0, -2.0, 3.0), (0.2, 0.0, -0.1)),
        (14, (0.0, -0.15, 0.25), (-1.0, 1.0, -1.5), (-0.1, 0.0, 0.1)),
        (20, zero, zero, zero),
    ])
    make_action(rig, pose, "Slash", [
        (0, zero, zero, zero, True),
        (4, (-0.7, 0.3, 0.2), (-3.0, 4.0, -18.0), (0.0, 0.0, -1.2), True),
        (9, (4.2, -0.7, 0.4), (4.0, -5.0, 68.0), (0.0, 0.0, -3.5), True),
        (14, (1.3, -0.2, 0.2), (1.0, -2.0, 22.0), (0.0, 0.0, -1.8), True),
        (22, zero, zero, zero, True),
    ])
    make_action(rig, pose, "Stab", [
        (0, zero, zero, zero, True),
        (5, (0.1, 0.8, -0.4), (-2.0, 3.0, -8.0), (-0.7, 0.1, -0.2), True),
        (10, (-0.2, -1.15, 0.9), (5.0, -6.0, -32.0), (-1.2, -0.2, 0.8), True),
        (15, (-0.1, -0.7, 0.5), (2.0, -3.0, -10.0), (-0.6, -0.1, 0.3), True),
        (24, zero, zero, zero, True),
    ])
    return {
        "Idle": [0, 15, 30, 45, 60],
        "Draw": [0, 3, 7, 14, 20],
        "Slash": [0, 4, 9, 14, 22],
        "Stab": [0, 5, 10, 15, 24],
    }


def setup_lights() -> None:
    for name, location, energy, size, color in (
        ("Melee_Key", (-7.0, -7.0, 28.0), 5600.0, 8.0, (1.0, 0.74, 0.54)),
        ("Melee_Fill", (18.0, -4.0, 12.0), 3200.0, 10.0, (0.34, 0.58, 1.0)),
        ("Melee_Rim", (-12.0, 10.0, 18.0), 2500.0, 7.0, (0.9, 0.22, 0.12)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (PIVOT - light.location).to_track_quat("-Z", "Y").to_euler()


def render_actions(rig: bpy.types.Object, samples: dict[str, list[int]]) -> None:
    for action_name, frames in samples.items():
        rig.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            bpy.context.scene.render.filepath = str(RENDERS / f"{action_name.lower()}_{frame:03d}.png")
            bpy.ops.render.render(write_still=True)


def write_manifest(samples: dict[str, list[int]]) -> None:
    manifest = {
        "family": "knife-melee",
        "policy": "approved pistol supplies project hand mesh/material/rig; local knife reference supplies visual rhythm only",
        "sources": [
            {"path": "public/models/weapons/knife.glb", "role": "visible project weapon", "sha256": sha256(PROJECT_KNIFE)},
            {"path": str(APPROVED_PISTOL), "role": "approved Coro Solto pistol hand mesh/material/rig", "sha256": sha256(APPROVED_PISTOL)},
            {"path": str(DONOR_REFERENCE), "role": "local read-only knife motion/composition reference",
             "exists": DONOR_REFERENCE.exists(), "excluded_from_export": True,
             "sha256": sha256(DONOR_REFERENCE) if DONOR_REFERENCE.exists() else None},
        ],
        "expected": {"clips": list(samples), "camera_aspect": "3:2",
                     "hand_contract": "approved-pistol-hires"},
        "hard_gates": {"render_count": sum(len(frames) for frames in samples.values()),
                       "required_clips": list(samples), "minimum_nonempty_samples": 19},
        "visual_gates": ["professional pistol-hand topology", "strong-hand handle contact",
                         "relaxed curled support hand", "support counter-motion",
                         "distinct slash and stab silhouettes", "HUD-safe framing"],
    }
    (OUT / "reference_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def cleanup_orphans() -> None:
    used_materials = {material for obj in bpy.data.objects if obj.type == "MESH"
                      for material in obj.data.materials if material}
    for material in list(bpy.data.materials):
        if material not in used_materials:
            bpy.data.materials.remove(material)
    used_images = {node.image for material in used_materials if material.use_nodes
                   for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image}
    for image in list(bpy.data.images):
        if image not in used_images and image.name != "Render Result":
            bpy.data.images.remove(image)


def export(rig: bpy.types.Object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
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
    PUBLIC.write_bytes(GLB.read_bytes())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    VALIDATION.mkdir(parents=True, exist_ok=True)
    for stale in RENDERS.glob("*.png"):
        stale.unlink()
    setup_scene()
    rig, _hands, _camera = load_approved_hands()
    fit_project_knife(rig)
    samples = build_actions(rig)
    setup_lights()
    cleanup_orphans()
    if os.environ.get("CORO_VM_SKIP_RENDERS") != "1":
        render_actions(rig, samples)
    write_manifest(samples)
    export(rig)
    print(f"KNIFE_MELEE_PILOT blend={BLEND} glb={GLB} public={PUBLIC} renders={RENDERS}")


if __name__ == "__main__":
    main()
