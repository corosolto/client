"""Build the Coro Solto knife/melee first-person asset family.

The external knife animation is reference-only. This builder never imports it:
all visible anatomy is project-authored here and the weapon mesh comes from
``public/models/weapons/knife.glb``.
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
DONOR_REFERENCE = Path.home() / "Downloads/knife_animated.glb"
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot"
RENDERS = OUT / "renders"
BLEND = OUT / "knife-melee-pilot.blend"
GLB = OUT / "knife-hires.glb"
PUBLIC = ROOT / "public/models/viewmodels/coro/melee/knife-hires.glb"

GRIP = Vector((0.24, -0.17, -1.05))
KNIFE_AXIS = Vector((-0.82, 0.32, -0.34)).normalized()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.fps = 30
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("CoroSolto_Melee_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.028, 0.045, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.72
    scene.world = world


def basis(long_axis: Vector) -> tuple[Vector, Vector, Vector]:
    u = long_axis.normalized()
    v = Vector((0.0, 0.0, 1.0)).cross(u).normalized()
    n = u.cross(v).normalized()
    if n.z < 0:
        v.negate()
        n.negate()
    return u, v, n


def oriented_matrix(center: Vector, axes: tuple[Vector, Vector, Vector]) -> Matrix:
    u, v, n = axes
    return Matrix(((u.x, v.x, n.x, center.x),
                   (u.y, v.y, n.y, center.y),
                   (u.z, v.z, n.z, center.z),
                   (0.0, 0.0, 0.0, 1.0)))


def ellipsoid(name: str, center: Vector, axes: tuple[Vector, Vector, Vector],
              radii: tuple[float, float, float], mat: bpy.types.Material,
              segments: int = 16) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=8, radius=1.0)
    obj = bpy.context.object
    obj.name = name
    obj.matrix_world = oriented_matrix(center, axes) @ Matrix.Diagonal((*radii, 1.0))
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def tapered_segment(name: str, start: Vector, end: Vector, r0: float, r1: float,
                    mat: bpy.types.Material) -> bpy.types.Object:
    delta = end - start
    center = (start + end) * 0.5
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=r0, radius2=r1,
                                    depth=delta.length, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def rigid_group(obj: bpy.types.Object, bone_name: str) -> None:
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")


def join_parts(parts: list[bpy.types.Object], name: str, rig: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    modifier = joined.modifiers.new(f"{name}_Armature", "ARMATURE")
    modifier.object = rig
    joined.parent = rig
    return joined


def finger_paths_right() -> dict[str, list[Vector]]:
    u, v, n = basis(KNIFE_AXIS)
    paths = {}
    for finger, along, length_scale in (
        ("index", 0.045, 1.00), ("middle", 0.014, 1.04),
        ("ring", -0.018, 0.98), ("pinky", -0.047, 0.86),
    ):
        p0 = GRIP + u * along + v * 0.055 + n * 0.032
        p1 = GRIP + u * along + v * 0.046 + n * 0.003
        p2 = GRIP + u * along + v * (0.010 * length_scale) - n * 0.027
        p3 = GRIP + u * along - v * (0.026 * length_scale) - n * 0.010
        paths[finger] = [p0, p1, p2, p3]
    paths["thumb"] = [
        GRIP - u * 0.048 - v * 0.038 + n * 0.030,
        GRIP - u * 0.020 - v * 0.026 + n * 0.045,
        GRIP + u * 0.014 - v * 0.006 + n * 0.042,
        GRIP + u * 0.030 + v * 0.020 + n * 0.030,
    ]
    return paths


def left_hand_layout() -> tuple[Vector, Vector, dict[str, list[Vector]]]:
    palm = Vector((-0.235, -0.225, -1.00))
    hand_axis = Vector((0.24, 0.67, -0.70)).normalized()
    u, v, n = basis(hand_axis)
    paths = {}
    spreads = {"index": -0.030, "middle": -0.010, "ring": 0.012, "pinky": 0.032}
    lengths = {"index": 0.115, "middle": 0.125, "ring": 0.116, "pinky": 0.095}
    for finger, across in spreads.items():
        length = lengths[finger]
        root = palm + u * 0.040 + v * across + n * 0.006
        paths[finger] = [
            root,
            root + u * (length * 0.38) + v * across * 0.20,
            root + u * (length * 0.70) + v * across * 0.45 - n * 0.006,
            root + u * length + v * across * 0.75 - n * 0.014,
        ]
    paths["thumb"] = [
        palm + u * 0.005 - v * 0.044 + n * 0.004,
        palm + u * 0.028 - v * 0.070 + n * 0.012,
        palm + u * 0.060 - v * 0.079 + n * 0.004,
        palm + u * 0.084 - v * 0.070 - n * 0.008,
    ]
    return palm, hand_axis, paths


def create_rig(right_paths: dict[str, list[Vector]], left_paths: dict[str, list[Vector]],
               left_palm: Vector, left_axis: Vector) -> bpy.types.Object:
    data = bpy.data.armatures.new("CoroSolto_Melee_FP_RigData")
    rig = bpy.data.objects.new("coro_solto_melee_fp_rig", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    right = data.edit_bones.new("hand_control.R")
    right.head = GRIP
    right.tail = GRIP + Vector((0.0, 0.08, 0.0))
    left = data.edit_bones.new("hand_control.L")
    left.head = left_palm - left_axis * 0.075
    left.tail = left.head + Vector((0.0, 0.08, 0.0))

    weapon = data.edit_bones.new("weapon_root")
    weapon.head = GRIP
    weapon.tail = GRIP + KNIFE_AXIS * 0.12
    weapon.parent = right
    for name, head in (
        ("grip_r", GRIP), ("support_l", left_palm),
        ("muzzle", GRIP + KNIFE_AXIS * 0.30), ("sight", GRIP + KNIFE_AXIS * 0.16),
    ):
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = head + Vector((0.0, 0.035, 0.0))
        bone.parent = weapon if name != "support_l" else left
        bone.use_deform = False

    for side, paths, parent in (("R", right_paths, right), ("L", left_paths, left)):
        for finger, points in paths.items():
            chain_parent = parent
            for index in range(3):
                bone = data.edit_bones.new(f"finger.{finger}.{index + 1}.{side}")
                bone.head = points[index]
                bone.tail = points[index + 1]
                bone.parent = chain_parent
                chain_parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["geometry_origin"] = "project-authored-procedural-anatomy-and-project-knife"
    rig["motion_reference"] = "knife_animated.glb timing-and-composition-only"
    rig["donor_geometry_exported"] = False
    rig["reference_aspect"] = "3:2"
    rig["strong_hand_contact_points"] = json.dumps({
        finger: list(points[-1]) for finger, points in right_paths.items()
    })
    return rig


def build_right_hand(rig: bpy.types.Object, paths: dict[str, list[Vector]],
                     skin: bpy.types.Material, sleeve: bpy.types.Material,
                     cuff: bpy.types.Material, accent: bpy.types.Material) -> bpy.types.Object:
    u, v, n = basis(KNIFE_AXIS)
    wrist = GRIP - u * 0.105 + n * 0.015
    parts: list[bpy.types.Object] = []
    palm = ellipsoid("GEO-melee_palm.R", GRIP - u * 0.025 + n * 0.024,
                     (u, v, n), (0.075, 0.052, 0.026), skin)
    rigid_group(palm, "hand_control.R")
    parts.append(palm)
    wrist_mesh = tapered_segment("GEO-melee_wrist.R", wrist - u * 0.015,
                                  GRIP - u * 0.045 + n * 0.018, 0.040, 0.046, skin)
    rigid_group(wrist_mesh, "hand_control.R")
    parts.append(wrist_mesh)
    forearm_end = wrist - u * 0.025
    forearm_start = Vector((0.61, -0.54, -0.78))
    sleeve_mesh = tapered_segment("GEO-melee_forearm.R", forearm_start, forearm_end,
                                   0.090, 0.060, sleeve)
    rigid_group(sleeve_mesh, "hand_control.R")
    parts.append(sleeve_mesh)
    for label, a, b, mat in (
        ("cuff", wrist - u * 0.060, wrist - u * 0.010, cuff),
        ("accent", wrist - u * 0.075, wrist - u * 0.061, accent),
    ):
        ring = tapered_segment(f"GEO-melee_{label}.R", a, b, 0.064, 0.064, mat)
        rigid_group(ring, "hand_control.R")
        parts.append(ring)
    for finger, points in paths.items():
        radii = (0.0145, 0.0130, 0.0110) if finger != "thumb" else (0.0165, 0.0145, 0.0125)
        for index in range(3):
            bone = f"finger.{finger}.{index + 1}.R"
            segment = tapered_segment(f"GEO-melee_{finger}_{index + 1}.R", points[index],
                                       points[index + 1], radii[index], radii[index] * 0.88, skin)
            rigid_group(segment, bone)
            parts.append(segment)
            joint = ellipsoid(f"GEO-melee_{finger}_joint_{index + 1}.R", points[index],
                              basis(points[index + 1] - points[index]),
                              (radii[index] * 1.05,) * 3, skin, 12)
            rigid_group(joint, bone)
            parts.append(joint)
    return join_parts(parts, "coro_solto_melee_hand_forearm.R", rig)


def build_left_hand(rig: bpy.types.Object, palm_center: Vector, hand_axis: Vector,
                    paths: dict[str, list[Vector]], skin: bpy.types.Material,
                    sleeve: bpy.types.Material, cuff: bpy.types.Material,
                    accent: bpy.types.Material) -> bpy.types.Object:
    u, v, n = basis(hand_axis)
    wrist = palm_center - u * 0.078
    parts: list[bpy.types.Object] = []
    palm = ellipsoid("GEO-melee_palm.L", palm_center, (u, v, n),
                     (0.070, 0.050, 0.024), skin)
    rigid_group(palm, "hand_control.L")
    parts.append(palm)
    wrist_mesh = tapered_segment("GEO-melee_wrist.L", wrist - u * 0.018,
                                  palm_center - u * 0.035, 0.039, 0.045, skin)
    rigid_group(wrist_mesh, "hand_control.L")
    parts.append(wrist_mesh)
    forearm_start = Vector((-0.61, -0.55, -0.74))
    sleeve_mesh = tapered_segment("GEO-melee_forearm.L", forearm_start, wrist - u * 0.018,
                                   0.088, 0.058, sleeve)
    rigid_group(sleeve_mesh, "hand_control.L")
    parts.append(sleeve_mesh)
    for label, a, b, mat in (
        ("cuff", wrist - u * 0.055, wrist - u * 0.005, cuff),
        ("accent", wrist - u * 0.070, wrist - u * 0.056, accent),
    ):
        ring = tapered_segment(f"GEO-melee_{label}.L", a, b, 0.062, 0.062, mat)
        rigid_group(ring, "hand_control.L")
        parts.append(ring)
    for finger, points in paths.items():
        radii = (0.0135, 0.0120, 0.0100) if finger != "thumb" else (0.0160, 0.0140, 0.0120)
        for index in range(3):
            bone = f"finger.{finger}.{index + 1}.L"
            segment = tapered_segment(f"GEO-melee_{finger}_{index + 1}.L", points[index],
                                       points[index + 1], radii[index], radii[index] * 0.86, skin)
            rigid_group(segment, bone)
            parts.append(segment)
            joint = ellipsoid(f"GEO-melee_{finger}_joint_{index + 1}.L", points[index],
                              basis(points[index + 1] - points[index]),
                              (radii[index] * 1.05,) * 3, skin, 12)
            rigid_group(joint, bone)
            parts.append(joint)
    return join_parts(parts, "coro_solto_melee_hand_forearm.L", rig)


def fit_project_knife(rig: bpy.types.Object) -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(PROJECT_KNIFE))
    meshes = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one project knife mesh, got {[obj.name for obj in meshes]}")
    knife = meshes[0]
    knife.data.transform(knife.matrix_world)
    knife.matrix_world = Matrix.Identity(4)
    rotation = Vector((1.0, 0.0, 0.0)).rotation_difference(KNIFE_AXIS).to_matrix().to_4x4()
    fit = Matrix.Translation(GRIP) @ rotation @ Matrix.Scale(0.44, 4) @ Matrix.Translation(Vector((0.30, 0.0, 0.0)))
    knife.data.transform(fit)
    knife.name = "coro_solto_project_knife"
    rigid_group(knife, "weapon_root")
    modifier = knife.modifiers.new("CoroSolto_Weapon_Armature", "ARMATURE")
    modifier.object = rig
    knife.parent = rig
    return knife


def pose_key(bone: bpy.types.PoseBone, frame: int, location: tuple[float, float, float],
             rotation_deg: tuple[float, float, float]) -> None:
    bone.rotation_mode = "XYZ"
    bone.location = location
    bone.rotation_euler = tuple(math.radians(value) for value in rotation_deg)
    bone.keyframe_insert("location", frame=frame, group=bone.name)
    bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)


def make_action(rig: bpy.types.Object, name: str, right_keys: list[tuple],
                left_keys: list[tuple]) -> bpy.types.Action:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for bone_name, keys in (("hand_control.R", right_keys), ("hand_control.L", left_keys)):
        bone = rig.pose.bones[bone_name]
        for frame, location, rotation in keys:
            pose_key(bone, frame, location, rotation)
    action[name.lower() + "_purpose"] = "authored melee motion with fixed strong-hand grip"
    return action


def build_actions(rig: bpy.types.Object) -> dict[str, list[int]]:
    zero = (0.0, 0.0, 0.0)
    make_action(rig, "Idle",
                [(0, zero, (0, 0, -1.5)), (30, (0, -0.006, 0.006), (0.8, -0.8, 1.5)),
                 (60, zero, (0, 0, -1.5))],
                [(0, zero, (0, 0, 1.0)), (30, (0, -0.004, 0.004), (-0.5, 0.8, -1.0)),
                 (60, zero, (0, 0, 1.0))])
    make_action(rig, "Draw",
                [(0, (0.11, -0.15, 0.12), (22, -16, 32)),
                 (7, (0.025, -0.025, 0.025), (-8, 7, -8)),
                 (14, (-0.008, 0.008, -0.006), (2, -2, 2)), (20, zero, zero)],
                [(0, (-0.11, -0.15, 0.11), (-19, 13, -27)),
                 (8, (-0.018, -0.020, 0.018), (7, -5, 8)),
                 (15, (0.006, 0.005, -0.004), (-2, 2, -2)), (20, zero, zero)])
    make_action(rig, "Slash",
                [(0, zero, zero), (4, (0.065, -0.025, 0.045), (-8, 15, -18)),
                 (9, (-0.185, 0.105, -0.075), (12, -34, 54)),
                 (14, (-0.055, 0.035, -0.025), (3, -11, 16)), (22, zero, zero)],
                [(0, zero, zero), (5, (-0.040, 0.015, 0.020), (5, -8, 10)),
                 (10, (0.085, -0.045, -0.025), (-8, 15, -18)), (22, zero, zero)])
    make_action(rig, "Stab",
                [(0, zero, zero), (5, (0.085, -0.045, 0.085), (-10, 10, -10)),
                 (10, (-0.105, 0.145, -0.255), (5, -42, 5)),
                 (15, (-0.030, 0.045, -0.075), (1, -12, 2)), (24, zero, zero)],
                [(0, zero, zero), (5, (-0.025, 0.015, 0.025), (4, -6, 8)),
                 (10, (0.055, -0.025, -0.045), (-5, 11, -12)), (24, zero, zero)])
    return {"Idle": [0, 15, 30, 45, 60], "Draw": [0, 3, 7, 14, 20],
            "Slash": [0, 4, 9, 14, 22], "Stab": [0, 5, 10, 15, 24]}


def setup_camera_lights() -> bpy.types.Object:
    scene = bpy.context.scene
    data = bpy.data.cameras.new("Melee_Hires_FP_Camera")
    camera = bpy.data.objects.new("Melee_Hires_FP_Camera", data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_euler = (0.0, 0.0, 0.0)
    data.lens = 42.0
    data.sensor_width = 36.0
    data.clip_start = 0.03
    data.clip_end = 20.0
    camera["coro_viewmodel_camera"] = True
    camera["vertical_fov_deg"] = math.degrees(data.angle_y)
    camera["reference_aspect"] = "3:2"
    scene.camera = camera

    for name, location, energy, size, color in (
        ("Melee_Key", (-0.65, 0.65, -0.20), 190.0, 0.65, (1.0, 0.78, 0.58)),
        ("Melee_Fill", (0.75, 0.20, -0.35), 125.0, 0.85, (0.32, 0.62, 1.0)),
        ("Melee_Rim", (-0.10, -0.55, -1.55), 165.0, 0.55, (0.92, 0.22, 0.10)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0.0, -0.18, -1.08)) - light.location).to_track_quat("-Z", "Y").to_euler()
    return camera


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
        "policy": "donor supplies timing/composition reference only; donor geometry, materials and textures are excluded",
        "sources": [
            {"path": str(PROJECT_KNIFE.relative_to(ROOT)), "role": "visible weapon geometry/material", "sha256": sha256(PROJECT_KNIFE)},
            {"path": str(DONOR_REFERENCE), "role": "local read-only motion/rig/composition reference", "exists": DONOR_REFERENCE.exists(),
             "excluded_from_export": True, "sha256": sha256(DONOR_REFERENCE) if DONOR_REFERENCE.exists() else None},
        ],
        "expected": {"clips": list(samples), "hands": 2, "forearms": 2,
                     "finger_segments_per_hand": 15, "camera_aspect": "3:2"},
        "hard_gates": {"render_count": sum(len(frames) for frames in samples.values()),
                       "minimum_nonempty_samples": 19, "minimum_top_margin_px": 8,
                       "intentional_entry_edges": ["bottom", "left", "right"],
                       "required_clips": list(samples)},
        "visual_gates": ["anatomical two-hand silhouette", "strong-hand grip contact",
                         "blade readability", "motion arcs", "frame aesthetics"],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "reference_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    analysis = {"project_knife_long_axis_m": 0.998, "project_knife_fit_scale": 0.44,
                "authored_grip_world": list(GRIP), "authored_blade_axis": list(KNIFE_AXIS),
                "donor_imported_by_builder": False}
    source_dir = OUT / "source_analysis"
    source_dir.mkdir(parents=True, exist_ok=True)
    (source_dir / "knife_registration.json").write_text(json.dumps(analysis, indent=2) + "\n", encoding="utf-8")


def export(rig: bpy.types.Object, camera: bpy.types.Object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    camera.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True,
                              export_animations=True, export_animation_mode="ACTIONS",
                              export_skins=True, export_cameras=True, export_extras=True,
                              export_apply=False)
    PUBLIC.write_bytes(GLB.read_bytes())


def main() -> None:
    if not PROJECT_KNIFE.exists():
        raise FileNotFoundError(PROJECT_KNIFE)
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    for stale in RENDERS.glob("*.png"):
        stale.unlink()
    setup_scene()
    skin = material("CoroSolto_Melee_Skin", (0.28, 0.095, 0.038, 1), 0.66)
    sleeve = material("CoroSolto_Melee_Sleeve", (0.11, 0.008, 0.014, 1), 0.80)
    cuff = material("CoroSolto_Melee_Cuff", (0.008, 0.011, 0.016, 1), 0.70)
    accent = material("CoroSolto_Melee_Accent", (0.86, 0.50, 0.06, 1), 0.34, 0.12)
    right_paths = finger_paths_right()
    left_palm, left_axis, left_paths = left_hand_layout()
    rig = create_rig(right_paths, left_paths, left_palm, left_axis)
    build_right_hand(rig, right_paths, skin, sleeve, cuff, accent)
    build_left_hand(rig, left_palm, left_axis, left_paths, skin, sleeve, cuff, accent)
    fit_project_knife(rig)
    samples = build_actions(rig)
    camera = setup_camera_lights()
    write_manifest(samples)
    if os.environ.get("CORO_VM_SKIP_RENDERS") != "1":
        render_actions(rig, samples)
    export(rig, camera)
    print(f"KNIFE_MELEE_PILOT blend={BLEND} glb={GLB} public={PUBLIC} renders={RENDERS}")


if __name__ == "__main__":
    main()
