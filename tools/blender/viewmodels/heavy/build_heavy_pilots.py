"""Build reproducible CORO SOLTO sniper and shotgun first-person pilots."""
from __future__ import annotations

import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts" / "viewmodels" / "heavy"
PUBLIC = ROOT / "public" / "models" / "viewmodels" / "coro" / "heavy"
RENDERS = OUT / "renders"


@dataclass(frozen=True)
class Pilot:
    name: str
    weapon_file: str
    axis_rotation: Matrix
    weapon_scale: float
    grip: Vector
    support: Vector
    mechanism: Vector
    magazine: Vector
    recoil: float


PILOTS = {
    "awp": Pilot(
        "awp", "awp.glb", Matrix.Rotation(math.radians(-8), 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Y"), 1.88,
        Vector((0.24, -0.18, -0.70)), Vector((0.13, -0.17, -1.22)),
        Vector((0.38, -0.02, -0.90)), Vector((0.22, -0.16, -0.90)), 0.085,
    ),
    "shotgun": Pilot(
        "shotgun", "shotgun.glb", Matrix.Rotation(math.radians(-25), 4, "Y") @ Matrix.Rotation(math.radians(-90), 4, "X"), 1.98,
        Vector((0.27, -0.19, -0.69)), Vector((0.18, -0.18, -1.18)),
        Vector((0.18, -0.10, -1.18)), Vector((0.24, -0.18, -0.84)), 0.115,
    ),
}


def mat(name: str, color: tuple[float, float, float, float], roughness: float, metallic: float = 0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def setup_scene(name: str) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.fps = 30
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new(f"CoroSolto_{name}_World")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.020, 0.032, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.25

    camera_data = bpy.data.cameras.new("camera_first_person_3x2")
    camera = bpy.data.objects.new("camera_first_person_3x2", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, 0, 0)
    camera.rotation_euler = (0, 0, 0)
    camera_data.lens = 27
    camera_data.sensor_width = 36
    camera_data.clip_start = 0.025
    camera_data.clip_end = 20
    scene.camera = camera

    for light_name, location, energy, size, color in (
        ("key", (-0.8, 1.2, -0.2), 650, 1.5, (0.72, 0.86, 1.0)),
        ("fill", (1.1, 0.0, -0.3), 480, 1.1, (1.0, 0.73, 0.42)),
        ("rim", (-0.3, 0.7, -1.8), 700, 0.8, (0.32, 0.68, 1.0)),
    ):
        data = bpy.data.lights.new(f"light_{light_name}", "AREA")
        data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
        obj = bpy.data.objects.new(f"light_{light_name}", data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (0, 0, 0)


def rounded_box(name: str, center: Vector, size: Vector, material, bevel: float = 0.012):
    bpy.ops.mesh.primitive_cube_add(location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size * 0.5
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("soft_edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 2
    obj.data.materials.append(material)
    return obj


def capsule(name: str, start: Vector, end: Vector, radius: float, material, vertices: int = 16):
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length)
    obj = bpy.context.object
    obj.name = name
    obj.location = (start + end) * 0.5
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("capsule_rounding", "BEVEL")
    bevel.width = radius * 0.48
    bevel.segments = 3
    return obj


def join_parts(parts: list, name: str):
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    parts[0].name = name
    return parts[0]


def make_arm(name: str, palm: Vector, side: int, sleeve, glove, green, yellow):
    elbow = Vector((0.58 * side, -0.58, -0.50))
    wrist = palm + Vector((0.10 * side, -0.085, 0.12))
    parts = [capsule(f"{name}_sleeve", elbow, wrist, 0.088, sleeve, 20)]
    parts.append(capsule(f"{name}_wrist_green", wrist - Vector((0, 0, 0.035)), wrist + Vector((0, 0, 0.005)), 0.091, green, 20))
    parts.append(capsule(f"{name}_wrist_yellow", wrist + Vector((0, 0, 0.005)), wrist + Vector((0, 0, 0.027)), 0.092, yellow, 20))
    parts.append(capsule(f"{name}_glove_bridge", wrist + Vector((0, 0, 0.018)), palm, 0.066, glove, 16))
    parts.append(rounded_box(f"{name}_palm", palm, Vector((0.145, 0.075, 0.19)), glove, 0.025))
    for index, xoff in enumerate((-0.052, -0.018, 0.018, 0.052)):
        finger_start = palm + Vector((xoff, 0.015, -0.055))
        finger_end = finger_start + Vector((0.008 * side, 0.026, -0.105))
        parts.append(capsule(f"{name}_finger_{index}", finger_start, finger_end, 0.019, glove, 12))
    thumb_start = palm + Vector((0.072 * side, -0.005, 0.015))
    parts.append(capsule(f"{name}_thumb", thumb_start, thumb_start + Vector((0.045 * side, 0.015, -0.065)), 0.024, glove, 12))
    return join_parts(parts, name)


def make_rig(pilot: Pilot):
    armature = bpy.data.armatures.new(f"coro_solto_{pilot.name}_fp_rig_data")
    rig = bpy.data.objects.new(f"coro_solto_{pilot.name}_fp_rig", armature)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name: str, head: Vector, parent=None):
        edit = armature.edit_bones.new(name)
        edit.head = head
        edit.tail = head + Vector((0, 0.08, 0))
        edit.parent = parent
        return edit

    root = bone("root", Vector((0, 0, 0)))
    weapon = bone("weapon", pilot.grip, root)
    right = bone("hand.R", pilot.grip, root)
    left = bone("hand.L", pilot.support, root)
    support = bone("support_contact", pilot.support, weapon)
    mechanism = bone("mechanism", pilot.mechanism, weapon)
    magazine = bone("magazine", pilot.magazine, weapon)
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["asset_policy"] = "project weapons and CORO SOLTO procedural skin only"
    rig["reference_policy"] = "donor meshes/materials/skins never imported by build"
    return rig


def rigid_bind(obj, rig, bone_name: str):
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    modifier = obj.modifiers.new("coro_solto_fp_rig", "ARMATURE")
    modifier.object = rig


def import_project_weapon(pilot: Pilot, rig, metal):
    path = ROOT / "public" / "models" / "weapons" / pilot.weapon_file
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon:
            bpy.data.objects.remove(obj, do_unlink=True)
    weapon.name = f"coro_solto_project_{pilot.name}_body"
    if pilot.name == "shotgun":
        mesh = bmesh.new()
        mesh.from_mesh(weapon.data)
        rear = [vertex for vertex in mesh.verts if vertex.co.y < -0.20]
        if len(rear) < 100:
            mesh.free()
            raise RuntimeError(f"shotgun FPS stock mask unexpectedly small: {len(rear)}")
        bmesh.ops.delete(mesh, geom=rear, context="VERTS")
        mesh.to_mesh(weapon.data)
        mesh.free()
        weapon.data.update()
        weapon["fps_stock_policy"] = "rear vertices y<-0.20 removed from viewmodel copy only"
    transform = Matrix.Translation(Vector((0.24, -0.12, -1.10))) @ pilot.axis_rotation @ Matrix.Scale(pilot.weapon_scale, 4)
    weapon.data.transform(transform)
    weapon.matrix_world = Matrix.Identity(4)
    rigid_bind(weapon, rig, "weapon")

    if pilot.name == "awp":
        stem = capsule("coro_solto_awp_bolt_stem", Vector((0.24, -0.015, -0.90)), Vector((0.38, -0.015, -0.90)), 0.013, metal, 16)
        knob = rounded_box("coro_solto_awp_bolt_knob", Vector((0.39, -0.015, -0.90)), Vector((0.055, 0.045, 0.055)), metal, 0.015)
        mechanism = join_parts([stem, knob], "coro_solto_awp_bolt")
        magazine = rounded_box("coro_solto_awp_magazine", pilot.magazine, Vector((0.11, 0.075, 0.22)), metal, 0.012)
    else:
        mechanism = rounded_box("coro_solto_shotgun_pump", pilot.mechanism, Vector((0.18, 0.12, 0.31)), metal, 0.028)
        magazine = capsule("coro_solto_shotgun_shell", pilot.magazine + Vector((-0.10, 0, 0)), pilot.magazine + Vector((0.02, 0, 0)), 0.020, mat("CoroSolto_Shell", (0.55, 0.035, 0.018, 1), 0.38, 0.35), 16)
        barrel = capsule("coro_solto_shotgun_barrel", Vector((0.30, -0.055, -0.73)), Vector((-0.15, -0.045, -1.95)), 0.043, metal, 20)
        tube = capsule("coro_solto_shotgun_tube", Vector((0.29, -0.125, -0.76)), Vector((-0.10, -0.115, -1.78)), 0.027, metal, 16)
        rigid_bind(barrel, rig, "weapon")
        rigid_bind(tube, rig, "weapon")
    rigid_bind(mechanism, rig, "mechanism")
    rigid_bind(magazine, rig, "magazine")
    return weapon, mechanism, magazine


def key_bone(bone, frame: int):
    bone.keyframe_insert("location", frame=frame, group=bone.name)
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    bone.keyframe_insert("scale", frame=frame, group=bone.name)


def key_pose(rig, frame: int, weapon_delta=Matrix.Identity(4), mech_delta=Vector(), mag_delta=Vector(),
             left_target="support_contact", right_target="weapon", mag_scale=1.0):
    scene = bpy.context.scene
    scene.frame_set(frame)
    for pose in rig.pose.bones:
        pose.rotation_mode = "QUATERNION"
        pose.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    rest = rig.data.bones
    pose = rig.pose.bones
    pose["weapon"].matrix = weapon_delta @ rest["weapon"].matrix_local
    bpy.context.view_layer.update()
    if mech_delta.length:
        pose["mechanism"].matrix = Matrix.Translation(mech_delta) @ pose["mechanism"].matrix
    if mag_delta.length:
        pose["magazine"].matrix = Matrix.Translation(mag_delta) @ pose["magazine"].matrix
    pose["magazine"].scale = Vector((mag_scale,) * 3)
    bpy.context.view_layer.update()
    pose["hand.L"].matrix = pose[left_target].matrix.copy()
    pose["hand.R"].matrix = pose[right_target].matrix.copy()
    for bone_name in ("weapon", "mechanism", "magazine", "hand.L", "hand.R"):
        key_bone(pose[bone_name], frame)


def finish_action(rig, action, end_frame: int):
    action.name = action.name.split("|")[-1]
    action.use_fake_user = True
    action["fps"] = 30
    action["frame_end"] = end_frame
    rig.animation_data.action = None


def make_actions(pilot: Pilot, rig):
    rig.animation_data_create()
    actions = {}

    action = bpy.data.actions.new("Idle")
    rig.animation_data.action = action
    for frame, y, roll in ((0, 0.0, -0.5), (30, 0.012, 0.65), (60, 0.0, -0.5)):
        delta = Matrix.Translation(Vector((0, y, 0))) @ Matrix.Rotation(math.radians(roll), 4, "Z")
        key_pose(rig, frame, delta, mag_scale=0.001)
    finish_action(rig, action, 60)
    actions["Idle"] = action

    action = bpy.data.actions.new("Fire")
    rig.animation_data.action = action
    if pilot.name == "awp":
        keys = [
            (0, 0.0, Vector(), "weapon"),
            (2, pilot.recoil, Vector(), "weapon"),
            (5, pilot.recoil * 0.35, Vector(), "mechanism"),
            (7, pilot.recoil * 0.15, Vector((0, 0, 0.16)), "mechanism"),
            (10, 0.0, Vector((0, 0, 0.16)), "mechanism"),
            (13, 0.0, Vector(), "mechanism"),
            (18, 0.0, Vector(), "weapon"),
        ]
        for frame, recoil, mech, right in keys:
            delta = Matrix.Translation(Vector((0, 0.035 if recoil else 0, recoil))) @ Matrix.Rotation(math.radians(-2.6 if recoil else 0), 4, "X")
            key_pose(rig, frame, delta, mech_delta=mech, right_target=right, mag_scale=0.001)
    else:
        keys = [(0, 0.0, 0.0), (2, pilot.recoil, 0.0), (5, pilot.recoil * 0.25, 0.16), (9, 0.0, 0.16), (13, 0.0, 0.0), (18, 0.0, 0.0)]
        for frame, recoil, pump in keys:
            delta = Matrix.Translation(Vector((0, 0.04 if recoil else 0, recoil))) @ Matrix.Rotation(math.radians(-3.3 if recoil else 0), 4, "X")
            key_pose(rig, frame, delta, mech_delta=Vector((0, 0, pump)), left_target="mechanism", mag_scale=0.001)
    finish_action(rig, action, 18)
    actions["Fire"] = action

    action = bpy.data.actions.new("Reload")
    rig.animation_data.action = action
    if pilot.name == "awp":
        keys = [
            (0, 0.0, Vector(), "support_contact", 0.001),
            (8, -3.0, Vector(), "support_contact", 0.001),
            (18, -5.5, Vector((0, -0.03, 0.02)), "magazine", 1.0),
            (28, -5.5, Vector((0, -0.18, 0.12)), "magazine", 1.0),
            (38, -3.0, Vector((0, -0.03, 0.02)), "magazine", 1.0),
            (48, 0.0, Vector(), "support_contact", 0.001),
            (58, 0.0, Vector(), "support_contact", 0.001),
        ]
        for frame, roll, mag_move, left, scale in keys:
            delta = Matrix.Rotation(math.radians(roll), 4, "Z") @ Matrix.Translation(Vector((0.04 if roll else 0, 0.01, 0)))
            key_pose(rig, frame, delta, mag_delta=mag_move, left_target=left, mag_scale=scale)
    else:
        keys = [
            (0, 0.0, Vector((0, -2.0, 0)), "mechanism", 0.001),
            (10, 2.5, Vector((-0.12, 0, 0)), "mechanism", 1.0),
            (20, 4.0, Vector((-0.06, -0.18, 0.18)), "magazine", 1.0),
            (32, 4.0, Vector((0.02, 0.02, -0.02)), "magazine", 1.0),
            (40, 2.0, Vector((0.02, 0.02, -0.02)), "magazine", 0.001),
            (52, 0.0, Vector((0, -2.0, 0)), "mechanism", 0.001),
            (60, 0.0, Vector((0, -2.0, 0)), "mechanism", 0.001),
        ]
        for frame, roll, shell_move, left, scale in keys:
            delta = Matrix.Rotation(math.radians(roll), 4, "Z")
            key_pose(rig, frame, delta, mag_delta=shell_move, left_target=left, mag_scale=scale)
    finish_action(rig, action, 60 if pilot.name == "shotgun" else 58)
    actions["Reload"] = action
    return actions


def set_interpolation(action, mode="BEZIER"):
    curves = []
    if hasattr(action, "fcurves"):
        curves = list(action.fcurves)
    else:
        for layer in action.layers:
            for strip in layer.strips:
                for channelbag in getattr(strip, "channelbags", []):
                    curves.extend(channelbag.fcurves)
    for curve in curves:
        for point in curve.keyframe_points:
            point.interpolation = mode


def render_evidence(pilot: Pilot, rig, actions):
    samples = {
        "Idle": (0, 15, 30, 45, 60),
        "Fire": (0, 2, 5, 9, 13, 18),
        "Reload": (0, 10, 20, 32, 40, 52, 60) if pilot.name == "shotgun" else (0, 8, 18, 28, 38, 48, 58),
    }
    paths = []
    for action_name, frames in samples.items():
        rig.animation_data.action = actions[action_name]
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            path = RENDERS / pilot.name / f"{action_name.lower()}_{frame:03d}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            bpy.context.scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            paths.append(str(path.relative_to(ROOT)))
    return paths


def contact_report(pilot: Pilot, rig, actions):
    samples = {
        "Idle": [(0, "support_contact", "weapon"), (30, "support_contact", "weapon"), (60, "support_contact", "weapon")],
        "Fire": ([(0, "support_contact", "weapon"), (5, "support_contact", "mechanism"), (7, "support_contact", "mechanism"), (13, "support_contact", "mechanism"), (18, "support_contact", "weapon")] if pilot.name == "awp" else [(0, "mechanism", "weapon"), (5, "mechanism", "weapon"), (9, "mechanism", "weapon"), (13, "mechanism", "weapon"), (18, "mechanism", "weapon")]),
        "Reload": ([(0, "support_contact", "weapon"), (18, "magazine", "weapon"), (28, "magazine", "weapon"), (38, "magazine", "weapon"), (58, "support_contact", "weapon")] if pilot.name == "awp" else [(0, "mechanism", "weapon"), (20, "magazine", "weapon"), (32, "magazine", "weapon"), (52, "mechanism", "weapon"), (60, "mechanism", "weapon")]),
    }
    result = []
    for action_name, entries in samples.items():
        rig.animation_data.action = actions[action_name]
        for frame, left_target, right_target in entries:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            pose = rig.pose.bones
            left = (pose["hand.L"].head - pose[left_target].head).length
            right = (pose["hand.R"].head - pose[right_target].head).length
            result.append({"action": action_name, "frame": frame, "left_target": left_target, "left_distance_m": round(left, 6), "right_target": right_target, "right_distance_m": round(right, 6), "pass": left <= 0.004 and right <= 0.004})
    return result


def make_contact_sheet(pilot_name: str):
    render_dir = RENDERS / pilot_name
    images = []
    for action in ("idle", "fire", "reload"):
        images.extend(sorted(render_dir.glob(f"{action}_*.png")))
    sheet = OUT / "contact_sheets" / f"{pilot_name}-contact-sheet.png"
    sheet.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "magick", "montage", *map(str, images), "-thumbnail", "300x200",
        "-background", "#182231", "-fill", "white", "-pointsize", "14",
        "-label", "%t", "-tile", "6x", "-geometry", "+8+26", str(sheet),
    ], check=True)
    return str(sheet.relative_to(ROOT))


def export_glb(pilot: Pilot, rig, actions):
    rig.animation_data.action = actions["Idle"]
    PUBLIC.mkdir(parents=True, exist_ok=True)
    path = PUBLIC / f"{pilot.name}-pilot.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", export_apply=False,
        export_animations=True, export_animation_mode="ACTIONS", export_extra_animations=True,
        export_cameras=True, export_lights=False, export_skins=True, export_materials="EXPORT",
        export_draco_mesh_compression_enable=False, export_extras=True,
    )
    return path


def build(pilot: Pilot):
    setup_scene(pilot.name)
    sleeve = mat("CoroSolto_Mandrake_Sleeve", (0.018, 0.045, 0.075, 1), 0.76)
    glove = mat("CoroSolto_FP_Glove", (0.012, 0.018, 0.025, 1), 0.68)
    green = mat("CoroSolto_Wristband_Green", (0.02, 0.24, 0.09, 1), 0.58)
    yellow = mat("CoroSolto_Wristband_Yellow", (0.95, 0.63, 0.03, 1), 0.48)
    metal = mat("CoroSolto_Heavy_Mechanics", (0.025, 0.035, 0.045, 1), 0.33, 0.72)
    rig = make_rig(pilot)
    import_project_weapon(pilot, rig, metal)
    left = make_arm(f"coro_solto_{pilot.name}_arm_L", pilot.support, -1, sleeve, glove, green, yellow)
    right = make_arm(f"coro_solto_{pilot.name}_arm_R", pilot.grip, 1, sleeve, glove, green, yellow)
    rigid_bind(left, rig, "hand.L")
    rigid_bind(right, rig, "hand.R")
    actions = make_actions(pilot, rig)
    for action in actions.values():
        set_interpolation(action)
    render_paths = render_evidence(pilot, rig, actions)
    contacts = contact_report(pilot, rig, actions)
    glb = export_glb(pilot, rig, actions)
    blend = OUT / "blends" / f"{pilot.name}-pilot.blend"
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    return {
        "pilot": pilot.name,
        "project_weapon": f"public/models/weapons/{pilot.weapon_file}",
        "output_glb": str(glb.relative_to(ROOT)),
        "output_bytes": glb.stat().st_size,
        "actions": {name: [round(action.frame_range[0]), round(action.frame_range[1])] for name, action in actions.items()},
        "render_frames": render_paths,
        "contact_samples": contacts,
        "all_contact_samples_pass": all(item["pass"] for item in contacts),
        "export_policy": "no donor objects, materials, textures or skins imported",
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "family": "heavy",
        "inventory": ["awp", "g3sg1", "mosin", "rem700", "svd", "shotgun"],
        "pilots": ["awp", "shotgun"],
        "source_roles": {
            "public/models/weapons/*.glb": "project geometry allowed in export",
            "~/Downloads/*sniper*.glb, fps_50cal.glb, shotgun_animated.glb": "motion reference only; forbidden from export",
        },
        "hard_gates": {"actions_exact": ["Idle", "Fire", "Reload"], "two_hand_contact_max_m": 0.004, "aspect_ratio": "3:2", "contact_sheet_required": True},
        "expected_mechanics": {"awp": "right hand follows bolt rearward and returns", "shotgun": "support hand follows pump rearward and returns"},
    }
    (OUT / "reference_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    reports = [build(PILOTS[name]) for name in ("awp", "shotgun")]
    for report in reports:
        report["contact_sheet"] = make_contact_sheet(report["pilot"])
    validation = {"blender": bpy.app.version_string, "reports": reports, "pass": all(report["all_contact_samples_pass"] for report in reports)}
    (OUT / "validation" / "heavy_validation.json").parent.mkdir(parents=True, exist_ok=True)
    (OUT / "validation" / "heavy_validation.json").write_text(json.dumps(validation, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"outputs": [report["output_glb"] for report in reports], "contact_gate": validation["pass"]}, indent=2))


if __name__ == "__main__":
    main()
