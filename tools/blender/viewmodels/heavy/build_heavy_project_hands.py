"""Build AWP and shotgun pilots with the approved Coro Solto project hands."""
from __future__ import annotations

import json
import math
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[4]
TEMPLATE = ROOT / "tools" / "blender" / "viewmodels" / "heavy" / "sources" / "approved-project-hands.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "heavy-project-hands"
PUBLIC = ROOT / "public" / "models" / "viewmodels" / "coro" / "heavy"


@dataclass(frozen=True)
class Pilot:
    name: str
    weapon_file: str
    transform: Matrix
    support: Vector
    mechanism: Vector
    reload_low: Vector
    reload_contact: Vector


PILOTS = {
    "awp": Pilot(
        "awp", "awp.glb",
        Matrix.Translation((0.0, -18.0, 10.6)) @ Matrix.Rotation(math.radians(102), 4, "Z") @ Matrix.Scale(40.0, 4),
        Vector((3.0, -21.0, 5.5)), Vector((1.0, -8.0, 11.1)),
        Vector((9.0, -8.0, -1.0)), Vector((1.5, -12.0, 5.0)),
    ),
    "shotgun": Pilot(
        "shotgun", "shotgun.glb",
        Matrix.Translation((0.0, -18.0, 10.4)) @ Matrix.Rotation(math.radians(-12), 4, "Z") @ Matrix.Scale(44.0, 4),
        Vector((1.0, -22.0, 6.0)), Vector((1.0, -20.0, 7.8)),
        Vector((8.0, -8.0, 2.0)), Vector((1.5, -12.0, 8.0)),
    ),
}


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
    world = bpy.data.worlds.new("CoroSolto_Heavy_ProjectHands_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.04, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world


def project_material(name: str, color: tuple[float, float, float, float], roughness: float, metallic: float = 0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def import_objects(path: Path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def add_mechanism_bone(rig) -> None:
    if "CoroMechanism" in rig.data.bones and "CoroShell" in rig.data.bones:
        return
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    if "CoroMechanism" not in rig.data.edit_bones:
        bone = rig.data.edit_bones.new("CoroMechanism")
        bone.head = (0.24, 0, 0)
        bone.tail = (0.24, 1, 0)
        bone.use_deform = True
    if "CoroShell" not in rig.data.edit_bones:
        shell = rig.data.edit_bones.new("CoroShell")
        wrist = rig.data.edit_bones["L_wrist_02"]
        shell.matrix = wrist.matrix.copy()
        shell.parent = wrist
        shell.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")


def bind_rigid(obj, rig, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    modifier = obj.modifiers.new(f"CoroSolto_{bone_name}_Armature", "ARMATURE")
    modifier.object = rig
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()


def rounded_box(name: str, center: Vector, size: Vector, material, bevel: float):
    bpy.ops.mesh.primitive_cube_add(location=center, scale=size * 0.5)
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    edge = obj.modifiers.new("CoroSolto_Rounded", "BEVEL")
    edge.width = bevel
    edge.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=edge.name)
    return obj


def capsule(name: str, start: Vector, end: Vector, radius: float, material):
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=direction.length, location=(start + end) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(material)
    edge = obj.modifiers.new("CoroSolto_Rounded", "BEVEL")
    edge.width = radius * 0.35
    edge.segments = 3
    return obj


def import_project_weapon(pilot: Pilot, rig):
    imported = import_objects(ROOT / "public" / "models" / "weapons" / pilot.weapon_file)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon:
            bpy.data.objects.remove(obj, do_unlink=True)
    weapon.data.transform(weapon.matrix_world)
    weapon.matrix_world = Matrix.Identity(4)
    weapon.data.transform(pilot.transform)
    bounds = [weapon.data.vertices[i].co for i in range(len(weapon.data.vertices))]
    print("CORO_HEAVY_BOUNDS", pilot.name,
          tuple(round(min(v[i] for v in bounds), 3) for i in range(3)),
          tuple(round(max(v[i] for v in bounds), 3) for i in range(3)))
    weapon.name = f"coro_solto_project_{pilot.name}_body"
    bind_rigid(weapon, rig, "CoroWeapon")

    mechanics = project_material("CoroSolto_Heavy_Mechanics", (0.025, 0.035, 0.05, 1), 0.48, 0.62)
    shell_mat = project_material("CoroSolto_Shotgun_Shell", (0.82, 0.035, 0.012, 1), 0.34, 0.08)
    if pilot.name == "awp":
        stem = capsule("coro_solto_awp_bolt_stem", Vector((0.4, -10.2, 12.0)), Vector((3.4, -10.2, 12.0)), 0.32, mechanics)
        knob = rounded_box("coro_solto_awp_bolt_knob", Vector((3.8, -10.2, 12.0)), Vector((1.2, 1.1, 1.2)), mechanics, 0.24)
        bpy.ops.object.select_all(action="DESELECT")
        stem.select_set(True); knob.select_set(True); bpy.context.view_layer.objects.active = stem
        bpy.ops.object.join(); mechanism = stem; mechanism.name = "coro_solto_awp_bolt"
        magazine = rounded_box("coro_solto_awp_magazine", Vector((0.5, -12.0, 5.2)), Vector((3.2, 2.2, 6.2)), mechanics, 0.38)
    else:
        # Keep the project's shotgun mesh intact. The support hand drives the
        # pump gesture; no proxy pump/cylinder may leak into the final asset.
        mechanism = None
        # The shell geometry is authored around the support wrist's rest-space
        # pivot. This prevents the skinned rigid body from inheriting a second,
        # visible offset when the support arm moves away from the pump.
        magazine = capsule("coro_solto_shotgun_shell", Vector((21.706, -27.030, -0.023)), Vector((24.506, -27.030, -0.023)), 0.68, shell_mat)
    if mechanism is not None:
        bind_rigid(mechanism, rig, "CoroMechanism")
    bind_rigid(magazine, rig, "CoroShell" if pilot.name == "shotgun" else "CoroMagazine")
    return weapon, mechanism, magazine


def capture_idle(rig):
    source = bpy.data.actions.get("Idle")
    rig.animation_data.action = source
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def apply_pose(rig, pose) -> None:
    for bone in rig.pose.bones:
        bone.matrix_basis = pose.get(bone.name, Matrix.Identity(4))
    bpy.context.view_layer.update()


def support_pose(rig, base, target: Vector, wrist_rotation=(0.0, 0.0, 0.0)):
    apply_pose(rig, base)
    wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
    arm = rig.pose.bones["L_arm_01"]
    matrix = arm.matrix.copy()
    matrix.translation += target - wrist
    arm.matrix = matrix
    bpy.context.view_layer.update()
    wrist_bone = rig.pose.bones["L_wrist_02"]
    for axis, degrees in zip("XYZ", wrist_rotation):
        wrist_bone.matrix_basis = wrist_bone.matrix_basis @ Matrix.Rotation(math.radians(degrees), 4, axis)
    bpy.context.view_layer.update()
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def key_bone(bone, frame: int) -> None:
    bone.keyframe_insert("location", frame=frame, group=bone.name)
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    bone.keyframe_insert("scale", frame=frame, group=bone.name)


def key_state(rig, action, frame: int, pose, control=None) -> None:
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    apply_pose(rig, pose)
    for name, matrix in (control or {}).items():
        rig.pose.bones[name].matrix_basis = matrix
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
        key_bone(bone, frame)


def delta(translation=(0, 0, 0), scale=1.0):
    return Matrix.Translation(Vector(translation)) @ Matrix.Scale(scale, 4)


def build_actions(pilot: Pilot, rig, base):
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    support = support_pose(rig, base, pilot.support, (0, 0, -78 if pilot.name == "awp" else -25))
    mechanism = support_pose(rig, base, pilot.mechanism, (0, 0, -8))
    low = support_pose(rig, base, pilot.reload_low, (12, -8, 20))
    contact = support_pose(rig, base, pilot.reload_contact, (5, -5, 12))
    actions = {}
    magazine_bone = "CoroShell" if pilot.name == "shotgun" else "CoroMagazine"

    idle = bpy.data.actions.new("Idle"); idle.use_fake_user = True
    for frame in (0, 30, 60):
        key_state(rig, idle, frame, support, {magazine_bone: delta(scale=0.001)})
    actions["Idle"] = idle

    fire = bpy.data.actions.new("Fire"); fire.use_fake_user = True
    if pilot.name == "awp":
        for frame, hand_pose, mech_y in ((0, support, 0), (2, support, 0), (5, mechanism, 0), (8, mechanism, 5.5), (11, mechanism, 5.5), (14, mechanism, 0), (20, support, 0)):
            key_state(rig, fire, frame, hand_pose, {"CoroMechanism": delta((0, mech_y, 0)), magazine_bone: delta(scale=0.001)})
    else:
        for frame, pump_y in ((0, 0), (2, 0), (5, 5.5), (10, 5.5), (14, 0), (20, 0)):
            hand = support_pose(rig, base, pilot.support + Vector((0, pump_y, 0)), (0, 0, -25))
            key_state(rig, fire, frame, hand, {"CoroMechanism": delta((0, pump_y, 0)), magazine_bone: delta(scale=0.001)})
    actions["Fire"] = fire

    reload_action = bpy.data.actions.new("Reload"); reload_action.use_fake_user = True
    if pilot.name == "awp":
        keys = (
            (0, support, delta(scale=1)), (8, contact, delta(scale=1)),
            (16, contact, delta((0, 0, -3.0))), (24, low, delta((8.0, 4.0, -6.0))),
            (32, low, delta((8.0, 4.0, -6.0))), (40, contact, delta((0, 0, -3.0))),
            (48, contact, delta(scale=1)), (60, support, delta(scale=1)),
        )
    else:
        keys = (
            (0, support, delta(scale=0.001)), (8, low, delta(scale=1)),
            (16, low, delta(scale=1)), (26, contact, delta(scale=1)),
            (34, contact, delta(scale=0.55)), (42, contact, delta(scale=0.001)),
            (54, support, delta(scale=0.001)), (60, support, delta(scale=0.001)),
        )
    for frame, hand_pose, mag in keys:
        key_state(rig, reload_action, frame, hand_pose, {magazine_bone: mag})
    actions["Reload"] = reload_action
    return actions


def setup_lights() -> None:
    for name, loc, energy, size, color in (
        ("Heavy_Key", (-18, -2, 28), 2600, 10, (0.74, 0.86, 1.0)),
        ("Heavy_Fill", (18, -6, 14), 1800, 8, (1.0, 0.68, 0.38)),
        ("Heavy_Rim", (0, -32, 20), 2200, 7, (0.25, 0.55, 1.0)),
    ):
        data = bpy.data.lights.new(name, "AREA"); data.energy = energy; data.shape = "DISK"; data.size = size; data.color = color
        light = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(light); light.location = loc


def configure_camera(camera) -> None:
    """Restore the approved pistol camera intent after the hand-only GLB round-trip."""
    camera.location = (0.0, 55.0, 30.0)
    target = Vector((0.0, -18.0, 12.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 42
    camera.data.sensor_width = 36
    camera.data.clip_start = 0.1
    camera.data.clip_end = 500


def render_evidence(pilot: Pilot, rig, actions):
    render_dir = OUT / "renders" / pilot.name
    render_dir.mkdir(parents=True, exist_ok=True)
    for stale in render_dir.glob("*.png"): stale.unlink()
    if os.environ.get("CORO_VM_FAST") == "1":
        frames = {"Idle": (0,)}
    elif os.environ.get("CORO_VM_RELOAD_FAST") == "1":
        frames = {"Reload": (8, 16, 34, 54)}
    else:
        frames = {"Idle": (0, 30, 60), "Fire": (0, 5, 8, 14, 20), "Reload": (0, 8, 16, 26, 34, 42, 54, 60)}
    paths = []
    for action_name, samples in frames.items():
        rig.animation_data.action = actions[action_name]
        for frame in samples:
            bpy.context.scene.frame_set(frame); bpy.context.view_layer.update()
            if pilot.name == "shotgun" and action_name == "Reload":
                shell = bpy.data.objects.get("coro_solto_shotgun_shell")
                depsgraph = bpy.context.evaluated_depsgraph_get()
                evaluated = shell.evaluated_get(depsgraph)
                mesh = evaluated.to_mesh()
                center = sum((evaluated.matrix_world @ vertex.co for vertex in mesh.vertices), Vector()) / len(mesh.vertices)
                evaluated.to_mesh_clear()
                wrist = rig.matrix_world @ rig.pose.bones["L_wrist_02"].matrix.translation
                print("CORO_SHELL_CONTACT", frame,
                      tuple(round(v, 3) for v in center),
                      tuple(round(v, 3) for v in wrist),
                      tuple(round(center[i] - wrist[i], 3) for i in range(3)))
                if frame == 34:
                    deform = rig.pose.bones["CoroShell"].matrix @ rig.data.bones["CoroShell"].matrix_local.inverted()
                    print("CORO_SHELL_DEFORM", *[tuple(round(value, 4) for value in deform[row][:3]) for row in range(3)])
            path = render_dir / f"{action_name.lower()}_{frame:03d}.png"
            bpy.context.scene.render.filepath = str(path); bpy.ops.render.render(write_still=True); paths.append(path)
    sheet = OUT / "contact_sheets" / f"{pilot.name}-project-hands.png"; sheet.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["magick", "montage", *map(str, paths), "-thumbnail", "375x250", "-tile", "4x", "-geometry", "+4+4", str(sheet)], check=True)
    return sheet


def export(pilot: Pilot, rig, actions):
    rig.animation_data.action = actions["Idle"]
    PUBLIC.mkdir(parents=True, exist_ok=True)
    path = PUBLIC / f"{pilot.name}-pilot.glb"
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CAMERA"}: obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS",
        export_skins=True, export_morph=True, export_cameras=True,
        export_lights=False, export_extras=True, export_apply=False,
    )
    return path


def build(pilot: Pilot):
    setup_scene()
    imported = import_objects(TEMPLATE)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    print("CORO_WRIST_REST", tuple(round(v, 3) for v in rig.data.bones["L_wrist_02"].head_local), tuple(round(v, 3) for v in rig.data.bones["L_wrist_02"].tail_local))
    camera = next(obj for obj in imported if obj.type == "CAMERA")
    configure_camera(camera)
    bpy.context.scene.camera = camera
    add_mechanism_bone(rig)
    base = capture_idle(rig)
    import_project_weapon(pilot, rig)
    actions = build_actions(pilot, rig, base)
    setup_lights()
    sheet = render_evidence(pilot, rig, actions) if os.environ.get("CORO_VM_SKIP_RENDERS") != "1" else None
    path = export(pilot, rig, actions)
    return {"pilot": pilot.name, "glb": str(path.relative_to(ROOT)), "bytes": path.stat().st_size, "contact_sheet": str(sheet.relative_to(ROOT)) if sheet else None}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    requested = os.environ.get("CORO_VM_ONLY")
    reports = [build(PILOTS[name]) for name in ((requested,) if requested else ("awp", "shotgun"))]
    validation = {"hand_template": str(TEMPLATE.relative_to(ROOT)), "pilots": reports, "accepted": False, "gate": "browser visual comparison against pistol required"}
    (OUT / "validation.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
