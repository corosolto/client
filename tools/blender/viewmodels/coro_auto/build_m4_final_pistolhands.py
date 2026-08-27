"""Build the single final M4 attempt from the approved pistol hand asset.

The exported hands/material/rig come literally from pistol-hires.glb.  The M4
body and exact curved magazine surfaces come from public/models/weapons/m4.glb.
No donor weapon geometry, substitute hand, or block magazine is created.
"""
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
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-final"
RENDERS = OUT / "renders"
GLB = OUT / "candidate-m4-final-pistolhands.glb"
BLEND = OUT / "m4-final-pistolhands.blend"

M4_SCALE = 45.0
M4_MATRIX = Matrix((
    (0.0, -M4_SCALE, 0.0, 0.0),
    (M4_SCALE, 0.0, 0.0, -14.5),
    (0.0, 0.0, M4_SCALE, 9.0),
    (0.0, 0.0, 0.0, 1.0),
))
SUPPORT_HANDGUARD_OFFSET = Vector((0.0, -16.0, 4.6))


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


def load_pistol_contract() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    imported = import_glb(PISTOL)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    hands = next(obj for obj in imported if obj.name == "coro_solto_hires_pistol_hands")
    camera = next(obj for obj in imported if obj.type == "CAMERA")
    for obj in list(imported):
        if obj not in {rig, hands, camera}:
            remove_object(obj)
    hands.name = "coro_solto_hires_pistol_hands_literal"
    rig.name = "coro_solto_hires_pistol_rig_literal"
    camera.name = "M4_Final_FP_Camera"
    return rig, hands, camera


def mag_face(face: bmesh.types.BMFace) -> bool:
    return all(-0.07 < vert.co.x < 0.11 and vert.co.z < -0.012 for vert in face.verts)


def filter_faces(obj: bpy.types.Object, keep_mag: bool) -> None:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    doomed = [face for face in bm.faces if mag_face(face) != keep_mag]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    loose = [vert for vert in bm.verts if not vert.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def rigid_bind(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj.parent = rig
    modifier = obj.modifiers.new("CoroAuto_Final_Armature", "ARMATURE")
    modifier.object = rig


def load_exact_project_m4(rig: bpy.types.Object) -> list[bpy.types.Object]:
    imported = import_glb(M4)
    source = next(obj for obj in imported if obj.type == "MESH")
    for obj in list(imported):
        if obj is not source:
            remove_object(obj)
    body = source
    installed = source.copy()
    installed.data = source.data.copy()
    bpy.context.collection.objects.link(installed)
    replacement = source.copy()
    replacement.data = source.data.copy()
    bpy.context.collection.objects.link(replacement)
    filter_faces(body, keep_mag=False)
    filter_faces(installed, keep_mag=True)
    filter_faces(replacement, keep_mag=True)
    body.name = "coro_auto_project_m4_final_body"
    installed.name = "coro_auto_project_m4_final_magazine"
    replacement.name = "coro_auto_project_m4_final_fresh_magazine"
    for obj, bone in (
        (body, "CoroWeapon"),
        (installed, "CoroMagazine"),
        (replacement, "CoroFreshMagazine"),
    ):
        obj.matrix_world = M4_MATRIX
        rigid_bind(obj, rig, bone)
        for material in obj.data.materials:
            if material:
                material.name = "CoroAuto_ProjectM4_Final_OriginalMaterial"
    return [body, installed, replacement]


def bake_support_handguard(rig: bpy.types.Object) -> None:
    """Move only the approved pistol support wrist; never duplicate geometry."""
    scene = bpy.context.scene
    wrist = rig.pose.bones["L_wrist_02"]
    for action_name, end in (("Idle", 80), ("Shoot", 6), ("Reload", 38)):
        target = bpy.data.actions[action_name]
        source = target.copy()
        source.name = f"__M4_FINAL_SOURCE_{action_name}"
        for frame in range(end + 1):
            rig.animation_data.action = source
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            desired = wrist.matrix.copy()
            if action_name == "Reload":
                if frame <= 8:
                    weight = 1.0 - frame / 8.0
                elif frame >= 30:
                    weight = (frame - 30.0) / 8.0
                else:
                    weight = 0.0
            else:
                weight = 1.0
            desired.translation += SUPPORT_HANDGUARD_OFFSET * weight
            if weight:
                pivot = desired.translation.copy()
                turn = Matrix.Rotation(math.radians(-88.0 * weight), 4, "Y")
                desired = Matrix.Translation(pivot) @ turn @ Matrix.Translation(-pivot) @ desired
            rig.animation_data.action = target
            scene.frame_set(frame)
            wrist.matrix = desired
            key_pose_bone(wrist, frame)
        bpy.data.actions.remove(source)
    rig.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(0)
    bpy.context.view_layer.update()


def bake_continuous_reload_magazine(rig: bpy.types.Object) -> None:
    """Keep the exact curved magazine in the support hand through the arc."""
    scene = bpy.context.scene
    target = bpy.data.actions["Reload"]
    source = target.copy()
    source.name = "__M4_FINAL_SOURCE_RELOAD_MAGAZINE"
    weapon = rig.pose.bones["CoroWeapon"]
    support = rig.pose.bones["L_wrist_02"]
    magazine = rig.pose.bones["CoroMagazine"]
    fresh = rig.pose.bones["CoroFreshMagazine"]
    rig.animation_data.action = source
    scene.frame_set(0)
    bpy.context.view_layer.update()
    seated_relative = weapon.matrix.inverted() @ magazine.matrix
    scene.frame_set(24)
    bpy.context.view_layer.update()
    grip_relative = support.matrix.inverted() @ magazine.matrix
    for frame in range(39):
        rig.animation_data.action = source
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        seated = weapon.matrix @ seated_relative
        carried = support.matrix @ grip_relative
        if frame <= 6:
            desired = seated
        elif frame <= 12:
            t = (frame - 6) / 6.0
            t = t * t * (3.0 - 2.0 * t)
            desired = seated.lerp(carried, t)
        elif frame <= 26:
            desired = carried
        elif frame <= 32:
            t = (frame - 26) / 6.0
            t = t * t * (3.0 - 2.0 * t)
            desired = carried.lerp(seated, t)
        else:
            desired = seated
        rig.animation_data.action = target
        scene.frame_set(frame)
        magazine.matrix = desired
        magazine.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(magazine, frame)
        fresh.scale = Vector((0.001, 0.001, 0.001))
        key_pose_bone(fresh, frame)
    bpy.data.actions.remove(source)
    rig.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(0)
    bpy.context.view_layer.update()


def setup_scene(camera: bpy.types.Object) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 2.0
    scene.camera = camera
    camera.data.lens = 38
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.018, 0.028, 0.045)
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.028, 0.045, 1.0)
    background.inputs["Strength"].default_value = 0.65
    for name, energy, color, location, size in (
        ("M4_Final_Key", 1200, (1.0, 0.82, 0.66), (8, 6, 25), 8),
        ("M4_Final_Fill", 900, (0.58, 0.76, 1.0), (-16, 2, 18), 10),
        ("M4_Final_Rim", 1100, (0.65, 0.82, 1.0), (4, -30, 20), 7),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.color = color
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        bpy.context.collection.objects.link(light)


def render_frame(rig: bpy.types.Object, camera: bpy.types.Object, action: str, frame: int, name: str) -> str:
    scene = bpy.context.scene
    rig.animation_data.action = bpy.data.actions[action]
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    scene.camera = camera
    path = RENDERS / f"{name}.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return str(path.relative_to(ROOT))


def ads_camera_from(camera: bpy.types.Object) -> bpy.types.Object:
    ads = camera.copy()
    ads.data = camera.data.copy()
    ads.name = "M4_Final_ADS_Camera"
    bpy.context.collection.objects.link(ads)
    ads.location = (0.0, 3.5, 12.4)
    direction = Vector((0.0, -24.0, 11.2)) - ads.location
    ads.rotation_mode = "QUATERNION"
    ads.rotation_quaternion = direction.to_track_quat("-Z", "Y")
    ads.data.lens = 58
    return ads


def export_glb(rig, hands, camera, project_objects) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [rig, hands, camera, *project_objects]:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_cameras=True,
        export_lights=False,
        export_apply=False,
        export_yup=True,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, hands, camera = load_pistol_contract()
    project_objects = load_exact_project_m4(rig)
    bake_support_handguard(rig)
    bake_continuous_reload_magazine(rig)
    setup_scene(camera)
    rendered = []
    for action, frames in (
        ("Idle", [0, 40, 80]),
        ("Shoot", [0, 3, 6]),
        ("Reload", [10, 16, 28, 38]),
    ):
        for frame in frames:
            rendered.append(render_frame(rig, camera, action, frame, f"{action.lower()}_{frame:03d}"))
    ads = ads_camera_from(camera)
    rendered.append(render_frame(rig, ads, "Idle", 0, "ads_000"))
    export_glb(rig, hands, camera, project_objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report = {
        "schema": "coro_auto_m4_final_build.v1",
        "hands_source": str(PISTOL),
        "literal_hand_mesh": hands.name,
        "hand_vertices": len(hands.data.vertices),
        "hand_materials": [slot.material.name for slot in hands.material_slots if slot.material],
        "visible_hand_mesh_count": 1,
        "weapon_source": "public/models/weapons/m4.glb",
        "magazine_strategy": "exact original curved M4 faces; no approximation",
        "magazine_vertices": len(project_objects[1].data.vertices),
        "rendered": rendered,
        "glb": str(GLB.relative_to(ROOT)),
        "visual_status": "candidate_only_pending_single_final_contact_sheet_inspection",
    }
    (OUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("M4_FINAL_BUILD=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
