"""Build an isolated M4 pilot by retargeting donor motion onto approved hands."""
from __future__ import annotations

import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[4]
PISTOL = Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb")
DONOR = Path("/Users/ruben/Downloads/m4a1_animated_low_poly.glb")
M4 = ROOT / "public/models/weapons/m4.glb"
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-retarget-pilot"
RENDERS = OUT / "renders"
GLB = OUT / "candidate-m4-retarget-pilot.glb"
M4_SCALE = 45.0
M4_MATRIX = Matrix((
    (0.0, -M4_SCALE, 0.0, 0.0),
    (M4_SCALE, 0.0, 0.0, -10.5),
    (0.0, 0.0, M4_SCALE, 11.5),
    (0.0, 0.0, 0.0, 1.0),
))
SUPPORT_OFFSET = Vector((1.0, -20.0, 5.5))
SUPPORT_TURN_Y = math.radians(-78.0)
SUPPORT_TURN_Z = math.radians(12.0)
RIGHT_ARM = ("R_arm_024", "R_elbow_025", "R_wrist_026")
RIGHT_FINGERS = (
    "R_middle1_035", "R_middle2_036", "R_middle3_037",
    "R_pink1_044", "R_pink2_045", "R_pink3_046",
    "R_ring1_040", "R_ring2_041", "R_ring3_042",
    "R_point1_031", "R_point2_032", "R_point3_033",
    "R_thumb1_027", "R_thumb2_028", "R_thumb3_029",
)
LEFT_FINGER_MAP = {
    "l_middle_low_032": "L_middle1_011", "l_middle_mid_033": "L_middle2_012", "l_middle_tip_034": "L_middle3_013",
    "l_pinky_low_041": "L_pink1_020", "l_pinky_mid_042": "L_pink2_021", "l_pinky_tip_043": "L_pink3_022",
    "l_ring_low_035": "L_ring1_016", "l_ring_mid_036": "L_ring2_017", "l_ring_tip_037": "L_ring3_018",
    "l_index_low_038": "L_point1_07", "l_index_mid_039": "L_point2_08", "l_index_tip_040": "L_point3_09",
    "l_thumb_low_044": "L_thumb1_03", "l_thumb_mid_045": "L_thumb2_04", "l_thumb_tip_046": "L_thumb3_05",
}


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def remove_object(obj: bpy.types.Object) -> None:
    bpy.data.objects.remove(obj, do_unlink=True)


def key_pose_bone(bone: bpy.types.PoseBone, frame: int) -> None:
    bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    if bone.rotation_mode == "QUATERNION":
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def load_approved_hands():
    imported = import_glb(PISTOL)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    hands = next(obj for obj in imported if obj.name == "coro_solto_hires_pistol_hands")
    camera = next(obj for obj in imported if obj.type == "CAMERA")
    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    base_basis = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    base_matrices = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
    rig.animation_data.action = bpy.data.actions["Reload"]
    bpy.context.scene.frame_set(24)
    bpy.context.view_layer.update()
    magazine_finger_basis = {name: rig.pose.bones[name].matrix_basis.copy() for name in LEFT_FINGER_MAP.values()}
    for obj in list(imported):
        if obj not in {rig, hands, camera}:
            remove_object(obj)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    hands.name = "coro_solto_pistol_hands_geometry_literal"
    rig.name = "coro_auto_m4_retarget_rig"
    camera.name = "CoroAuto_M4_Retarget_FP_Camera"
    return rig, hands, camera, base_basis, base_matrices, magazine_finger_basis


def add_socket_bones(rig, base_matrices):
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    definitions = {
        "GripSocket": base_matrices["R_wrist_026"],
        "TriggerSocket": base_matrices["R_point3_033"],
        "SupportSocket": Matrix.Translation(SUPPORT_OFFSET) @ base_matrices["L_wrist_02"],
        "MagwellSocket": Matrix.Translation((0.0, -14.2, 7.2)),
        "M4MagazinePivot": Matrix.Translation((0.0, -14.2, 7.2)),
    }
    for name, matrix in definitions.items():
        bone = rig.data.edit_bones.new(name)
        bone.head = matrix.translation
        direction = matrix.to_quaternion() @ Vector((0.0, 1.0, 0.0))
        bone.tail = bone.head + direction.normalized()
        if name != "M4MagazinePivot":
            bone.parent = rig.data.edit_bones.get("CoroWeapon")
        else:
            bone.parent = rig.data.edit_bones.get("_rootJoint")
    bpy.ops.object.mode_set(mode="POSE")
    socket_rest = {name: rig.pose.bones[name].matrix.copy() for name in definitions}
    bpy.ops.object.mode_set(mode="OBJECT")
    return socket_rest


def capture_donor_motion():
    imported = import_glb(DONOR)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    samples = {}
    names = {"Gun_052", "Mag_054", "l_wrist_031", *LEFT_FINGER_MAP}
    for action_name, frames in (("Fire", range(0, 5)), ("Reload", range(0, 45))):
        action = bpy.data.actions[action_name]
        rig.animation_data.action = action
        samples[action_name] = {}
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            samples[action_name][frame] = {
                name: {
                    "matrix": rig.pose.bones[name].matrix.copy(),
                    "basis": rig.pose.bones[name].matrix_basis.copy(),
                }
                for name in names
            }
    for obj in list(imported):
        remove_object(obj)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    return samples


def mag_source_face(face: bmesh.types.BMFace) -> bool:
    return all(-0.07 < vert.co.x < 0.11 and vert.co.z < -0.012 for vert in face.verts)


def remove_static_magazine(obj: bpy.types.Object) -> None:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    faces = [face for face in bm.faces if mag_source_face(face)]
    bmesh.ops.delete(bm, geom=faces, context="FACES")
    loose = [vert for vert in bm.verts if not vert.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def make_magazine_material() -> bpy.types.Material:
    material = bpy.data.materials.new("CoroAuto_M4_Retarget_Magazine")
    material.use_nodes = True
    material.diffuse_color = (0.025, 0.032, 0.038, 1.0)
    material.metallic = 0.78
    material.roughness = 0.28
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.025, 0.032, 0.038, 1.0)
    principled.inputs["Metallic"].default_value = 0.78
    principled.inputs["Roughness"].default_value = 0.28
    return material


def create_closed_curved_magazine() -> bpy.types.Object:
    rings = [
        (0.052, 0.020, 0.026, 0.024),
        (0.025, 0.020, 0.037, 0.030),
        (-0.015, 0.018, 0.041, 0.033),
        (-0.060, 0.012, 0.041, 0.034),
        (-0.110, 0.002, 0.039, 0.034),
        (-0.158, -0.012, 0.036, 0.033),
        (-0.195, -0.026, 0.034, 0.032),
        (-0.212, -0.031, 0.038, 0.036),
    ]
    vertices = []
    segments = 8
    for z, center_x, half_x, half_y in rings:
        for segment in range(segments):
            angle = 2 * math.pi * segment / segments
            vertices.append((center_x + half_x * math.cos(angle), half_y * math.sin(angle), z))
    faces = [tuple(range(segments - 1, -1, -1))]
    for ring in range(len(rings) - 1):
        for segment in range(segments):
            nxt = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + nxt
            c = (ring + 1) * segments + nxt
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    last = (len(rings) - 1) * segments
    faces.append(tuple(last + index for index in range(segments)))
    mesh = bpy.data.meshes.new("coro_auto_m4_retarget_closed_magazine_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("coro_auto_m4_retarget_closed_magazine", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_magazine_material())
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bevel = obj.modifiers.new("M4_Retarget_Magazine_Bevel", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)
    return obj


def rigid_bind(obj, rig, bone_name):
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj.parent = rig
    modifier = obj.modifiers.new("CoroAuto_M4_Retarget_Armature", "ARMATURE")
    modifier.object = rig


def load_project_weapon(rig):
    imported = import_glb(M4)
    body = next(obj for obj in imported if obj.type == "MESH")
    for obj in list(imported):
        if obj is not body:
            remove_object(obj)
    remove_static_magazine(body)
    body.name = "coro_auto_project_m4_retarget_body"
    magazine = create_closed_curved_magazine()
    body.matrix_world = M4_MATRIX
    magazine.matrix_world = M4_MATRIX
    bpy.ops.object.select_all(action="DESELECT")
    magazine.select_set(True)
    bpy.context.view_layer.objects.active = magazine
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    rigid_bind(body, rig, "CoroWeapon")
    rigid_bind(magazine, rig, "M4MagazinePivot")
    return body, magazine


def rotation_delta(current: Matrix, reference: Matrix) -> Quaternion:
    return current.to_quaternion() @ reference.to_quaternion().inverted()


def reset_pose(rig, base_basis):
    for bone in rig.pose.bones:
        if bone.name in base_basis:
            bone.matrix_basis = base_basis[bone.name].copy()
        else:
            bone.matrix_basis = Matrix.Identity(4)


def create_action(rig, name, frame_states, base_basis, base_matrices, magazine_finger_basis, donor, socket_rest):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    source_name = "Fire" if name in {"Idle", "Shoot"} else "Reload"
    source_ref = donor[source_name][0]
    support_rest = socket_rest["SupportSocket"]
    mag_rest = socket_rest["M4MagazinePivot"]
    mag_center_rest = Vector((0.0, -14.2, 6.8))
    for frame, source_frame in frame_states:
        bpy.context.scene.frame_set(frame)
        reset_pose(rig, base_basis)
        bpy.context.view_layer.update()
        source = donor[source_name][source_frame]
        gun_delta_translation = (source["Gun_052"]["matrix"].translation - source_ref["Gun_052"]["matrix"].translation) * 0.9
        gun_delta_rotation = rotation_delta(source["Gun_052"]["matrix"], source_ref["Gun_052"]["matrix"])
        weapon_delta = Matrix.Translation(gun_delta_translation) @ gun_delta_rotation.to_matrix().to_4x4()
        weapon = rig.pose.bones["CoroWeapon"]
        weapon.matrix = weapon_delta @ base_matrices["CoroWeapon"]
        key_pose_bone(weapon, frame)
        for name_right in RIGHT_ARM:
            bone = rig.pose.bones[name_right]
            bone.matrix = weapon_delta @ base_matrices[name_right]
            key_pose_bone(bone, frame)
        for name_right in RIGHT_FINGERS:
            bone = rig.pose.bones[name_right]
            bone.matrix_basis = base_basis[name_right].copy()
            key_pose_bone(bone, frame)

        support = rig.pose.bones["L_wrist_02"]
        if name == "Reload":
            gun_ref_inv = source_ref["Gun_052"]["matrix"].inverted()
            relative_ref = gun_ref_inv @ source_ref["l_wrist_031"]["matrix"]
            relative_now = source["Gun_052"]["matrix"].inverted() @ source["l_wrist_031"]["matrix"]
            donor_offset = (relative_now.translation - relative_ref.translation) * 0.12
            support.matrix = Matrix.Translation(donor_offset) @ support_rest
        else:
            support.matrix = weapon_delta @ support_rest
        key_pose_bone(support, frame)

        for target_name in LEFT_FINGER_MAP.values():
            finger = rig.pose.bones[target_name]
            finger.matrix_basis = (magazine_finger_basis if name == "Reload" and 6 <= source_frame <= 34 else base_basis)[target_name].copy()
            key_pose_bone(finger, frame)

        magazine = rig.pose.bones["M4MagazinePivot"]
        if name == "Reload" and 6 <= source_frame <= 34:
            desired_center = support.matrix.translation + Vector((-4.8, -3.9, -0.4))
            move = desired_center - mag_center_rest
            magazine.matrix = Matrix.Translation(move) @ mag_rest
        else:
            magazine.matrix = weapon_delta @ mag_rest
        key_pose_bone(magazine, frame)

        for socket_name in ("GripSocket", "TriggerSocket", "SupportSocket", "MagwellSocket"):
            key_pose_bone(rig.pose.bones[socket_name], frame)
        for bone in rig.pose.bones:
            if bone.name not in {"CoroWeapon", "M4MagazinePivot", "L_wrist_02", *RIGHT_ARM, *RIGHT_FINGERS, *LEFT_FINGER_MAP.values(), "GripSocket", "TriggerSocket", "SupportSocket", "MagwellSocket"}:
                key_pose_bone(bone, frame)
    return action


def build_actions(rig, base_basis, base_matrices, magazine_finger_basis, donor, socket_rest):
    create_action(rig, "Idle", [(0, 0), (40, 0), (80, 0)], base_basis, base_matrices, magazine_finger_basis, donor, socket_rest)
    create_action(rig, "Shoot", [(frame * 2, frame) for frame in range(5)], base_basis, base_matrices, magazine_finger_basis, donor, socket_rest)
    create_action(rig, "Reload", [(frame, frame) for frame in range(45)], base_basis, base_matrices, magazine_finger_basis, donor, socket_rest)
    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(0)


def track(camera, target):
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (Vector(target) - camera.location).to_track_quat("-Z", "Y")


def setup_scene(camera):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 1.3
    camera.data.lens = 40
    scene.camera = camera
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.07, 0.12, 0.18, 1.0)
    background.inputs["Strength"].default_value = 0.85
    for name, energy, color, location, size in (
        ("Retarget_Key", 1350, (1.0, 0.83, 0.66), (8, 5, 25), 8),
        ("Retarget_Fill", 1250, (0.54, 0.76, 1.0), (-14, 4, 18), 10),
        ("Retarget_Rim", 1000, (0.66, 0.86, 1.0), (2, -28, 19), 7),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.size = energy, color, size
        light = bpy.data.objects.new(name, data)
        light.location = location
        bpy.context.collection.objects.link(light)


def make_ads_camera(camera):
    ads = camera.copy()
    ads.data = camera.data.copy()
    ads.name = "CoroAuto_M4_Retarget_ADS_Camera"
    bpy.context.collection.objects.link(ads)
    ads.location = (0.0, 11.0, 16.0)
    ads.data.lens = 58
    ads.data.clip_start = 10.0
    track(ads, (0.0, -35.0, 16.0))
    return ads


def render(rig, camera, action, frame, name):
    rig.animation_data.action = bpy.data.actions[action]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    bpy.context.scene.camera = camera
    path = RENDERS / f"{name}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return str(path.relative_to(ROOT))


def export_candidate(rig, hands, cameras, body, magazine):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (rig, hands, body, magazine, *cameras):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB), export_format="GLB", use_selection=True,
        export_animations=True, export_cameras=True, export_lights=False,
        export_apply=False, export_yup=True,
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, hands, camera, base_basis, base_matrices, magazine_finger_basis = load_approved_hands()
    socket_rest = add_socket_bones(rig, base_matrices)
    donor = capture_donor_motion()
    body, magazine = load_project_weapon(rig)
    build_actions(rig, base_basis, base_matrices, magazine_finger_basis, donor, socket_rest)
    setup_scene(camera)
    ads = make_ads_camera(camera)
    rendered = []
    for action, frames in (("Idle", [0]), ("Shoot", [0, 4, 8]), ("Reload", [0, 9, 18, 26, 44])):
        for frame in frames:
            rendered.append(render(rig, camera, action, frame, f"{action.lower()}_{frame:03d}"))
    rendered.append(render(rig, ads, "Idle", 0, "ads_000"))
    export_candidate(rig, hands, [camera, ads], body, magazine)
    report = {
        "schema": "coro_auto.m4_retarget.build.v1",
        "integration": "artifact_candidate_only",
        "motion_donor": str(DONOR),
        "motion_donor_usage": ["Fire action", "Reload action", "Gun_052", "Mag_054", "l_wrist_031 trajectory and timing"],
        "donor_visual_assets_exported": False,
        "hands_source": str(PISTOL),
        "hand_meshes": 1,
        "hand_vertices": len(hands.data.vertices),
        "hand_material": hands.material_slots[0].material.name,
        "weapon_source": str(M4.relative_to(ROOT)),
        "socket_bones": ["GripSocket", "TriggerSocket", "SupportSocket", "MagwellSocket", "M4MagazinePivot"],
        "magazine": {"closed": True, "source_vertices": len(magazine.data.vertices), "material": magazine.material_slots[0].material.name},
        "actions": ["Idle", "Shoot", "Reload"],
        "rendered": rendered,
        "candidate_glb": str(GLB.relative_to(ROOT)),
        "visual_status": "pending visual gate",
    }
    (OUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("M4_RETARGET_PILOT=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
