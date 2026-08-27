"""Build a non-integrated AR-family M4 pilot with dedicated rifle poses."""
from __future__ import annotations

import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[4]
PISTOL = Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb")
M4 = ROOT / "public/models/weapons/m4.glb"
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-ar-pilot"
RENDERS = OUT / "renders"
GLB = OUT / "candidate-m4-ar-pilot.glb"
M4_SCALE = 45.0
M4_MATRIX = Matrix((
    (0.0, -M4_SCALE, 0.0, 0.0),
    (M4_SCALE, 0.0, 0.0, -14.5),
    (0.0, 0.0, M4_SCALE, 11.0),
    (0.0, 0.0, 0.0, 1.0),
))
SUPPORT_OFFSET = Vector((1.1, -21.0, 5.8))
SUPPORT_TURN_Y = math.radians(-82.0)
SUPPORT_TURN_Z = math.radians(18.0)
SUPPORT_FINGERS = (
    "L_middle1_011", "L_middle2_012", "L_middle3_013",
    "L_pink1_020", "L_pink2_021", "L_pink3_022",
    "L_ring1_016", "L_ring2_017", "L_ring3_018",
    "L_point1_07", "L_point2_08", "L_point3_09",
    "L_thumb1_03", "L_thumb2_04", "L_thumb3_05",
)


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
    elif bone.rotation_mode == "AXIS_ANGLE":
        bone.keyframe_insert(data_path="rotation_axis_angle", frame=frame, group=bone.name)
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def load_hand_source():
    imported = import_glb(PISTOL)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    hands = next(obj for obj in imported if obj.name == "coro_solto_hires_pistol_hands")
    camera = next(obj for obj in imported if obj.type == "CAMERA")
    idle = bpy.data.actions["Idle"]
    reload_action = bpy.data.actions["Reload"]
    rig.animation_data.action = idle
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    base_basis = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    base_matrices = {bone.name: bone.matrix.copy() for bone in rig.pose.bones}
    rig.animation_data.action = reload_action
    bpy.context.scene.frame_set(24)
    bpy.context.view_layer.update()
    mag_finger_basis = {name: rig.pose.bones[name].matrix_basis.copy() for name in SUPPORT_FINGERS}
    mag_wrist_matrix = rig.pose.bones["L_wrist_02"].matrix.copy()
    for obj in list(imported):
        if obj not in {rig, hands, camera}:
            remove_object(obj)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    mag_bone = rig.data.edit_bones.new("M4Magazine")
    mag_bone.head = (0.0, 0.0, 0.0)
    mag_bone.tail = (0.0, 1.0, 0.0)
    mag_bone.parent = rig.data.edit_bones.get("_rootJoint")
    bpy.ops.object.mode_set(mode="POSE")
    base_basis["M4Magazine"] = rig.pose.bones["M4Magazine"].matrix_basis.copy()
    base_matrices["M4Magazine"] = rig.pose.bones["M4Magazine"].matrix.copy()
    bpy.ops.object.mode_set(mode="OBJECT")
    hands.name = "coro_solto_pistol_hands_geometry_literal"
    rig.name = "coro_auto_m4_ar_dedicated_rig"
    camera.name = "CoroAuto_M4_AR_FP_Camera"
    return rig, hands, camera, base_basis, base_matrices, mag_finger_basis, mag_wrist_matrix


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
    obj.data.update()


def make_mag_material() -> bpy.types.Material:
    material = bpy.data.materials.new("CoroAuto_M4_AR_AuthoredMagazine")
    material.use_nodes = True
    material.diffuse_color = (0.055, 0.067, 0.075, 1.0)
    material.metallic = 0.66
    material.roughness = 0.31
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.055, 0.067, 0.075, 1.0)
    principled.inputs["Metallic"].default_value = 0.66
    principled.inputs["Roughness"].default_value = 0.31
    return material


def add_box(vertices, faces, center, half):
    start = len(vertices)
    cx, cy, cz = center
    hx, hy, hz = half
    vertices.extend([
        (cx-hx, cy-hy, cz-hz), (cx+hx, cy-hy, cz-hz),
        (cx+hx, cy+hy, cz-hz), (cx-hx, cy+hy, cz-hz),
        (cx-hx, cy-hy, cz+hz), (cx+hx, cy-hy, cz+hz),
        (cx+hx, cy+hy, cz+hz), (cx-hx, cy+hy, cz+hz),
    ])
    faces.extend([
        (start, start+1, start+2, start+3), (start+4, start+7, start+6, start+5),
        (start, start+4, start+5, start+1), (start+1, start+5, start+6, start+2),
        (start+2, start+6, start+7, start+3), (start+4, start, start+3, start+7),
    ])


def create_closed_magazine() -> bpy.types.Object:
    # Side silhouette measured from the M4 source magazine.  Each ring is
    # (z, center_x, half_width); thickness is constant like a STANAG magazine.
    rings = [
        (0.020, 0.027, 0.040),
        (-0.020, 0.025, 0.041),
        (-0.070, 0.018, 0.040),
        (-0.125, 0.006, 0.037),
        (-0.178, -0.010, 0.033),
    ]
    half_y = 0.032
    vertices = []
    for z, center_x, half_x in rings:
        vertices.extend([
            (center_x-half_x, -half_y, z), (center_x+half_x, -half_y, z),
            (center_x+half_x, half_y, z), (center_x-half_x, half_y, z),
        ])
    faces = [(0, 3, 2, 1), (16, 17, 18, 19)]
    for ring in range(len(rings)-1):
        a, b = ring*4, (ring+1)*4
        faces.extend([
            (a, a+1, b+1, b), (a+1, a+2, b+2, b+1),
            (a+2, a+3, b+3, b+2), (a+3, a, b, b+3),
        ])
    # Closed feed tower and floor plate, both with their own usable silhouette.
    add_box(vertices, faces, (0.027, 0.0, 0.041), (0.034, 0.026, 0.021))
    add_box(vertices, faces, (-0.010, 0.0, -0.184), (0.038, 0.036, 0.008))
    # Six shallow side ribs follow the curved center line on both visible sides.
    for y in (-0.0355, 0.0355):
        for x_offset in (-0.024, 0.0, 0.024):
            add_box(vertices, faces, (x_offset+0.005, y, -0.085), (0.004, 0.0025, 0.082))
    mesh = bpy.data.meshes.new("coro_auto_m4_ar_closed_magazine_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("coro_auto_m4_ar_closed_magazine", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_mag_material())
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bevel = obj.modifiers.new("M4_AR_Magazine_Bevel", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)
    return obj


def rigid_bind(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj.parent = rig
    modifier = obj.modifiers.new("CoroAuto_M4_AR_Armature", "ARMATURE")
    modifier.object = rig


def load_m4(rig):
    imported = import_glb(M4)
    body = next(obj for obj in imported if obj.type == "MESH")
    for obj in list(imported):
        if obj is not body:
            remove_object(obj)
    remove_static_magazine(body)
    body.name = "coro_auto_project_m4_ar_body"
    magazine = create_closed_magazine()
    body.matrix_world = M4_MATRIX
    magazine.matrix_world = M4_MATRIX
    bpy.ops.object.select_all(action="DESELECT")
    magazine.select_set(True)
    bpy.context.view_layer.objects.active = magazine
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    rigid_bind(body, rig, "CoroWeapon")
    rigid_bind(magazine, rig, "M4Magazine")
    return body, magazine


def rotate_about(matrix: Matrix, pivot: Vector, axis: str, angle: float) -> Matrix:
    return Matrix.Translation(pivot) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-pivot) @ matrix


def support_handguard_matrix(base_matrices) -> Matrix:
    desired = base_matrices["L_wrist_02"].copy()
    desired.translation += SUPPORT_OFFSET
    desired = rotate_about(desired, desired.translation.copy(), "Y", SUPPORT_TURN_Y)
    desired = rotate_about(desired, desired.translation.copy(), "Z", SUPPORT_TURN_Z)
    return desired


def create_action(rig, name, frames, base_basis, base_matrices, mag_finger_basis):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    scene = bpy.context.scene
    support_idle = support_handguard_matrix(base_matrices)
    weapon_base = base_matrices["CoroWeapon"]
    strong_names = ("R_arm_024", "R_elbow_025", "R_wrist_026")
    for frame, state in frames:
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis = base_basis[bone.name].copy()
        bpy.context.view_layer.update()
        recoil = state.get("recoil", 0.0)
        recoil_matrix = Matrix.Translation((0.0, 1.2*recoil, 0.75*recoil)) @ Matrix.Rotation(math.radians(-3.2*recoil), 4, "X")
        weapon = rig.pose.bones["CoroWeapon"]
        weapon.matrix = recoil_matrix @ weapon_base
        key_pose_bone(weapon, frame)
        for bone_name in strong_names:
            bone = rig.pose.bones[bone_name]
            bone.matrix = recoil_matrix @ base_matrices[bone_name]
            key_pose_bone(bone, frame)
        support = rig.pose.bones["L_wrist_02"]
        support_matrix = state.get("support_matrix", support_idle)
        support.matrix = recoil_matrix @ support_matrix
        key_pose_bone(support, frame)
        use_mag_grip = state.get("mag_grip", False)
        for finger_name in SUPPORT_FINGERS:
            finger = rig.pose.bones[finger_name]
            finger.matrix_basis = (mag_finger_basis if use_mag_grip else base_basis)[finger_name].copy()
            key_pose_bone(finger, frame)
        magazine = rig.pose.bones["M4Magazine"]
        magazine.matrix = state.get("magazine_matrix", recoil_matrix @ weapon_base)
        key_pose_bone(magazine, frame)
        for bone in rig.pose.bones:
            if bone.name not in {"CoroWeapon", "M4Magazine", "L_wrist_02", *strong_names, *SUPPORT_FINGERS}:
                key_pose_bone(bone, frame)
    return action


def build_actions(rig, base_basis, base_matrices, mag_finger_basis, mag_wrist_matrix):
    support_idle = support_handguard_matrix(base_matrices)
    weapon = base_matrices["CoroWeapon"]
    mag_seated = base_matrices["M4Magazine"].copy()
    # The authored magazine object carries its M4 registration in object space;
    # its bone uses deltas from the seated pistol-rig matrix.  The wrist target
    # is authored directly in armature space beside the M4 magazine well.
    mag_grip = mag_wrist_matrix.copy()
    mag_grip.translation = Vector((6.2, -13.0, 6.4))
    detach_delta = Matrix.Translation((5.5, 0.0, -2.0))
    carry_delta = Matrix.Translation((10.0, 3.0, -2.5)) @ Matrix.Rotation(math.radians(-18), 4, "Y")
    insert_delta = Matrix.Translation((2.5, 0.5, -0.8)) @ Matrix.Rotation(math.radians(-5), 4, "Y")
    detach = detach_delta @ mag_seated
    carry = carry_delta @ mag_seated
    insert = insert_delta @ mag_seated
    create_action(rig, "Idle", [(0, {}), (40, {}), (80, {})], base_basis, base_matrices, mag_finger_basis)
    create_action(rig, "Shoot", [(0, {}), (4, {"recoil": 1.0}), (8, {})], base_basis, base_matrices, mag_finger_basis)
    create_action(rig, "Reload", [
        (0, {}),
        (12, {"support_matrix": mag_grip, "mag_grip": True, "magazine_matrix": mag_seated}),
        (24, {"support_matrix": detach_delta @ mag_grip, "mag_grip": True, "magazine_matrix": detach}),
        (40, {"support_matrix": carry_delta @ mag_grip, "mag_grip": True, "magazine_matrix": carry}),
        (56, {"support_matrix": insert_delta @ mag_grip, "mag_grip": True, "magazine_matrix": insert}),
        (64, {"support_matrix": mag_grip, "mag_grip": True, "magazine_matrix": mag_seated}),
        (72, {}),
        (80, {}),
    ], base_basis, base_matrices, mag_finger_basis)
    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()


def track(camera, target):
    camera.rotation_mode = "QUATERNION"
    camera.rotation_quaternion = (Vector(target)-camera.location).to_track_quat("-Z", "Y")


def setup_scene(camera):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 1.4
    camera.data.lens = 38
    scene.camera = camera
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.015, 0.026, 0.045, 1.0)
    background.inputs["Strength"].default_value = 0.6
    for name, energy, color, location, size in (
        ("AR_Key", 1250, (1.0, 0.84, 0.70), (8, 5, 25), 8),
        ("AR_Fill", 1000, (0.52, 0.72, 1.0), (-15, 2, 17), 9),
        ("AR_Rim", 1200, (0.62, 0.82, 1.0), (3, -28, 20), 7),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.size = energy, color, size
        light = bpy.data.objects.new(name, data)
        light.location = location
        bpy.context.collection.objects.link(light)


def make_ads_camera(camera):
    ads = camera.copy()
    ads.data = camera.data.copy()
    ads.name = "CoroAuto_M4_AR_ADS_Camera"
    bpy.context.collection.objects.link(ads)
    ads.location = (0.0, 10.0, 15.5)
    ads.data.lens = 55
    ads.data.clip_start = 12.0
    track(ads, (0.0, -35.0, 15.5))
    return ads


def render(rig, camera, action, frame, name):
    scene = bpy.context.scene
    rig.animation_data.action = bpy.data.actions[action]
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    scene.camera = camera
    path = RENDERS / f"{name}.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return str(path.relative_to(ROOT))


def export_candidate(rig, hands, cameras, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (rig, hands, *cameras, *objects):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB), export_format="GLB", use_selection=True,
        export_animations=True, export_cameras=True, export_lights=False,
        export_apply=False, export_yup=True,
    )


def reload_metrics(rig, magazine):
    action = bpy.data.actions["Reload"]
    rig.animation_data.action = action
    result = {}
    for frame in (0, 12, 24, 40, 56, 64, 80):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        evaluated = magazine.evaluated_get(bpy.context.evaluated_depsgraph_get())
        coords = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
        result[str(frame)] = {
            "mag_min": [round(min(value[i] for value in coords), 4) for i in range(3)],
            "mag_max": [round(max(value[i] for value in coords), 4) for i in range(3)],
            "bone": [round(value, 4) for value in rig.pose.bones["M4Magazine"].matrix.translation],
            "wrist": [round(value, 4) for value in rig.pose.bones["L_wrist_02"].matrix.translation],
        }
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, hands, camera, base_basis, base_matrices, mag_finger_basis, mag_wrist_matrix = load_hand_source()
    body, magazine = load_m4(rig)
    build_actions(rig, base_basis, base_matrices, mag_finger_basis, mag_wrist_matrix)
    setup_scene(camera)
    ads = make_ads_camera(camera)
    rendered = []
    for action, frames in (("Idle", [0, 40, 80]), ("Shoot", [0, 4, 8]), ("Reload", [24, 40, 56, 80])):
        for frame in frames:
            rendered.append(render(rig, camera, action, frame, f"{action.lower()}_{frame:03d}"))
    rendered.append(render(rig, ads, "Idle", 0, "ads_000"))
    metrics = reload_metrics(rig, magazine)
    export_candidate(rig, hands, [camera, ads], [body, magazine])
    report = {
        "schema": "coro_auto_m4_ar_pilot_build.v1",
        "integration": "artifact_candidate_only",
        "hands_geometry_material_source": str(PISTOL),
        "hand_meshes": 1,
        "hand_vertices": len(hands.data.vertices),
        "hand_material": hands.material_slots[0].material.name,
        "poses": "dedicated rifle actions authored in this builder",
        "magazine": {
            "strategy": "closed authored STANAG silhouette measured from project M4",
            "vertices": len(magazine.data.vertices),
            "source_boundary_edges": 0,
            "material": magazine.material_slots[0].material.name,
            "own_feed_tower": True,
            "own_origin_pivot": True,
        },
        "candidate_glb": str(GLB.relative_to(ROOT)),
        "rendered": rendered,
        "reload_metrics": metrics,
        "visual_status": "pending_browser_and_contact_sheet_gate",
    }
    (OUT / "build_report.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print("M4_AR_PILOT="+json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
