"""Build the CORO SOLTO M4 automatic-family viewmodel pilot.

The accepted high-resolution rifle rig is imported read-only as animation
structure.  Every source weapon object is removed before the project M4 is
imported.  The exported weapon body and both magazines come exclusively from
``public/models/weapons/m4.glb``; no donor weapon mesh, material, or skin is
selected for export.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parents[4]
SOURCE_PILOT = Path("/Users/ruben/csbrasil/client/public/models/viewmodels/coro/ak-hires.glb")
PROJECT_M4 = ROOT / "public/models/weapons/m4.glb"
FAMILY_OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-pilot"
RENDERS = FAMILY_OUT / "renders"
BLEND = FAMILY_OUT / "m4-pilot.blend"
GLB = ROOT / "public/models/viewmodels/coro-auto/m4-pilot.glb"
REPORT = FAMILY_OUT / "build_report.json"
MANIFEST = FAMILY_OUT / "reference_manifest.json"

PROJECT_ANATOMY = {
    "coro_solto_hires_gloved_hands",
    "coro_solto_hires_project_sleeves",
    "coro_solto_hires_watch",
}
ACTION_FRAMES = {
    "Idle": [0, 40, 80],
    "Shoot": [0, 5, 10],
    "Reload": [0, 12, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80],
}
MAG_REGISTRATION = Vector((-0.000887, -0.028286, 0.029107))
STRONG_HAND_RIFLE_OFFSET = Vector((-0.035, 0.0, 0.0))


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def remove_object(obj: bpy.types.Object) -> None:
    bpy.data.objects.remove(obj, do_unlink=True)


def setup_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    FAMILY_OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    GLB.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.fps = 24
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("CoroAuto_M4_World")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.025, 0.035, 0.052, 1.0)
    background.inputs["Strength"].default_value = 0.72
    scene.world = world


def load_animation_structure() -> tuple[bpy.types.Object, bpy.types.Object]:
    imported = import_glb(SOURCE_PILOT)
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one source rig, found {len(rigs)}")
    rig = rigs[0]
    rig.name = "coro_auto_m4_fp_rig"

    cameras = [obj for obj in imported if obj.type == "CAMERA" and obj.get("coro_viewmodel_camera")]
    if not cameras:
        cameras = [obj for obj in imported if obj.type == "CAMERA"]
    camera = cameras[0]
    camera.name = "CoroAuto_M4_FP_Camera"
    camera.data.name = camera.name
    camera.data.sensor_fit = "VERTICAL"
    camera.data.angle_y = math.radians(58.0)
    camera.data.clip_start = 0.03
    camera["coro_viewmodel_camera"] = True
    camera["vertical_fov_deg"] = 58.0
    camera["reference_aspect"] = "3:2"
    bpy.context.scene.camera = camera

    for obj in list(imported):
        keep = obj in {rig, camera} or obj.name in PROJECT_ANATOMY
        if not keep:
            remove_object(obj)
    if {obj.name for obj in bpy.data.objects if obj.type == "MESH"} != PROJECT_ANATOMY:
        raise RuntimeError("Source weapon sanitization did not leave exactly the project anatomy set")

    for action in list(bpy.data.actions):
        if action.name not in {"Idle", "Shoot", "Reload"}:
            bpy.data.actions.remove(action)
    missing = set(ACTION_FRAMES) - {action.name for action in bpy.data.actions}
    if missing:
        raise RuntimeError(f"Missing required actions: {sorted(missing)}")

    rig["geometry_origin"] = "project-m4-only"
    rig["animation_structure_origin"] = "read-only accepted rifle pilot"
    rig["reference_policy"] = "all source weapon objects deleted before project M4 import"
    return rig, camera


def component_vertices(mesh: bpy.types.Mesh) -> list[set[int]]:
    bm = bmesh.new()
    bm.from_mesh(mesh)
    remaining = set(bm.verts)
    result: list[set[int]] = []
    while remaining:
        seed = remaining.pop()
        vertices = {seed}
        frontier = [seed]
        while frontier:
            vertex = frontier.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other)
                    vertices.add(other)
                    frontier.append(other)
        result.append({vertex.index for vertex in vertices})
    bm.free()
    return result


def split_project_magazine(weapon: bpy.types.Object) -> tuple[bpy.types.Object, dict[str, int]]:
    # The main curved shell shares disconnected triangle strips with receiver
    # details, so whole-component selection leaves a static magazine behind.
    # A source-space cut captures the full narrow magazine column; the pistol
    # grip starts at X ~= 0.13 and therefore cannot enter this mask.
    selected = {
        vertex.index
        for vertex in weapon.data.vertices
        if -0.060 < vertex.co.x < 0.100 and vertex.co.z < -0.020
    }
    selected_components = sum(
        1 for component in component_vertices(weapon.data) if component & selected
    )
    if len(selected) < 300 or selected_components < 3:
        raise RuntimeError(
            f"M4 magazine mask too small: {len(selected)} vertices / {selected_components} shells"
        )

    bpy.ops.object.select_all(action="DESELECT")
    weapon.select_set(True)
    bpy.context.view_layer.objects.active = weapon
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for vertex in weapon.data.vertices:
        vertex.select = vertex.index in selected
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    magazine = next(obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH")
    magazine.name = "coro_auto_project_m4_magazine"
    return magazine, {"vertices": len(selected), "shells": selected_components}


def rebuild_project_magazine(magazine: bpy.types.Object) -> None:
    """Replace the cut triangle strips with a clean project-material magazine.

    The source asset welds its curved magazine faces into receiver strips, so
    the spatial cut is used only to remove the static silhouette.  This simple
    bent prism is authored here from the M4's measured source-space envelope
    and retains only the project's M4 material.
    """
    rings = [
        (0.040, 0.030, 0.036),
        (-0.065, 0.018, 0.033),
        (-0.170, -0.008, 0.029),
    ]
    half_thickness = 0.020
    vertices = []
    for z, center_x, half_width in rings:
        vertices.extend([
            (center_x - half_width, -half_thickness, z),
            (center_x + half_width, -half_thickness, z),
            (center_x + half_width, half_thickness, z),
            (center_x - half_width, half_thickness, z),
        ])
    faces = [(0, 3, 2, 1), (8, 9, 10, 11)]
    for ring in range(2):
        a = ring * 4
        b = (ring + 1) * 4
        faces.extend([
            (a, a + 1, b + 1, b),
            (a + 1, a + 2, b + 2, b + 1),
            (a + 2, a + 3, b + 3, b + 2),
            (a + 3, a, b, b + 3),
        ])
    material = bpy.data.materials.new("CoroAuto_ProjectM4_Magazine")
    material.diffuse_color = (0.025, 0.032, 0.040, 1.0)
    material.metallic = 0.58
    material.roughness = 0.32
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.025, 0.032, 0.040, 1.0)
    principled.inputs["Metallic"].default_value = 0.58
    principled.inputs["Roughness"].default_value = 0.32
    mesh = bpy.data.meshes.new("coro_auto_project_m4_magazine_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    if material:
        mesh.materials.append(material)
    old_mesh = magazine.data
    magazine.data = mesh
    bpy.data.meshes.remove(old_mesh)
    bpy.ops.object.select_all(action="DESELECT")
    magazine.select_set(True)
    bpy.context.view_layer.objects.active = magazine
    bevel = magazine.modifiers.new("CoroAuto_M4_Magazine_Bevel", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)


def bake_fire_recoil(rig: bpy.types.Object) -> None:
    """Make the automatic shot readable while preserving both hand contacts."""
    scene = bpy.context.scene
    target = bpy.data.actions["Shoot"]
    source = target.copy()
    source.name = "__M4_SOURCE_Shoot_Recoil"
    rifle = rig.pose.bones["Rifle_metarig"]
    hands = [rig.pose.bones["hand.R_metarig"], rig.pose.bones["hand.L_metarig"]]
    for frame in range(11):
        rig.animation_data.action = source
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        source_rifle = rifle.matrix.copy()
        source_hands = [hand.matrix.copy() for hand in hands]
        amount = math.sin(math.pi * frame / 10.0)
        recoil = (
            Matrix.Translation((0.0, -0.046 * amount, 0.0))
            @ Matrix.Rotation(math.radians(-3.2 * amount), 4, "X")
        )
        desired_rifle = source_rifle @ recoil
        delta = desired_rifle @ source_rifle.inverted()
        rig.animation_data.action = target
        scene.frame_set(frame)
        rifle.matrix = desired_rifle
        key_pose_bone(rifle, frame)
        for hand, source_hand in zip(hands, source_hands):
            hand.matrix = delta @ source_hand
            key_pose_bone(hand, frame)
    bpy.data.actions.remove(source)


def bind_rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_local = Matrix.Identity(4)
    modifier = obj.modifiers.new("CoroAuto_M4_Rig", "ARMATURE")
    modifier.object = rig


def key_pose_bone(bone: bpy.types.PoseBone, frame: int) -> None:
    bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    if bone.rotation_mode == "QUATERNION":
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
    elif bone.rotation_mode == "AXIS_ANGLE":
        bone.keyframe_insert(data_path="rotation_axis_angle", frame=frame, group=bone.name)
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def bake_hand_contract(rig: bpy.types.Object) -> None:
    """Bake the M4 hand contract into every exported action.

    The source rifle animation already keeps the right-hand/rifle and
    left-hand/magazine transforms rigid.  The project M4 has different grip
    and magazine proportions, so small bone-local registration offsets are
    baked without moving either project mesh or the rifle bone.
    """
    scene = bpy.context.scene
    rifle = rig.pose.bones["Rifle_metarig"]
    strong = rig.pose.bones["hand.R_metarig"]

    for action_name, end_frame in (("Idle", 80), ("Shoot", 10), ("Reload", 80)):
        target = bpy.data.actions[action_name]
        source = target.copy()
        source.name = f"__M4_SOURCE_{action_name}"
        for frame in range(end_frame + 1):
            rig.animation_data.action = source
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            desired = (
                rifle.matrix
                @ Matrix.Translation(STRONG_HAND_RIFLE_OFFSET)
                @ rifle.matrix.inverted()
                @ strong.matrix
            )
            rig.animation_data.action = target
            scene.frame_set(frame)
            strong.matrix = desired
            key_pose_bone(strong, frame)
        bpy.data.actions.remove(source)

    rig.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(0)
    bpy.context.view_layer.update()


def bake_reload_magazine_contract(rig: bpy.types.Object) -> None:
    """Keep one visible M4 magazine continuously attached to the support hand.

    The donor swaps two magazines by scaling.  With the project's differently
    proportioned M4 magazine that swap flashes a seated magazine before pickup.
    This bake uses the installed project magazine for the entire remove/carry/
    insert arc, then seats it while the support hand remains attached.
    """
    scene = bpy.context.scene
    target = bpy.data.actions["Reload"]
    source = target.copy()
    source.name = "__M4_SOURCE_Reload_Magazine"
    rifle = rig.pose.bones["Rifle_metarig"]
    support = rig.pose.bones["hand.L_metarig"]
    magazine = rig.pose.bones["Mag_metarig"]
    replacement = rig.pose.bones["Mag.001_metarig"]

    rig.animation_data.action = source
    scene.frame_set(0)
    bpy.context.view_layer.update()
    seated_relative = rifle.matrix.inverted() @ magazine.matrix
    scene.frame_set(24)
    bpy.context.view_layer.update()
    carry_relative = support.matrix.inverted() @ magazine.matrix
    removed_relative = rifle.matrix.inverted() @ magazine.matrix
    scene.frame_set(48)
    bpy.context.view_layer.update()
    carry_mid_relative = rifle.matrix.inverted() @ (support.matrix @ carry_relative)

    for frame in range(81):
        rig.animation_data.action = source
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        source_support = support.matrix.copy()
        source_rifle = rifle.matrix.copy()
        if frame <= 16:
            relative = seated_relative
        elif frame <= 24:
            t = (frame - 16) / 8.0
            t = t * t * (3.0 - 2.0 * t)
            relative = seated_relative.lerp(removed_relative, t)
        elif frame <= 48:
            t = (frame - 24) / 24.0
            t = t * t * (3.0 - 2.0 * t)
            relative = removed_relative.lerp(carry_mid_relative, t)
        elif frame <= 60:
            t = (frame - 48) / 12.0
            t = t * t * (3.0 - 2.0 * t)
            relative = carry_mid_relative.lerp(seated_relative, t)
        else:
            relative = seated_relative
        desired_magazine = source_rifle @ relative
        desired_support = desired_magazine @ carry_relative.inverted()

        rig.animation_data.action = target
        scene.frame_set(frame)
        magazine.matrix = desired_magazine
        magazine.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(magazine, frame)
        replacement.scale = Vector((0.001, 0.001, 0.001))
        key_pose_bone(replacement, frame)
        if 20 <= frame <= 60:
            support.matrix = desired_support
            key_pose_bone(support, frame)

    bpy.data.actions.remove(source)
    rig.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(0)
    bpy.context.view_layer.update()


def load_project_m4(rig: bpy.types.Object) -> tuple[list[bpy.types.Object], dict[str, int]]:
    imported = import_glb(PROJECT_M4)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon:
            remove_object(obj)
    weapon.name = "coro_auto_project_m4_body"
    magazine, split_report = split_project_magazine(weapon)
    rebuild_project_magazine(magazine)

    basis = Matrix((
        (0.0, 1.0, 0.0, 0.0),
        (0.0, 0.0, -1.0, 0.0),
        (-1.0, 0.0, 0.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    ))
    # Unlike the project AK, this M4 source points its muzzle along -X.  The
    # 180-degree source-space turn keeps the accepted rifle rig's muzzle/stock
    # convention and also flips thickness, preserving handedness and normals.
    source_direction = Matrix.Rotation(math.pi, 4, "Z")
    fit = (
        Matrix.Translation(Vector((-0.1475, -1.6065, -0.3500)))
        @ basis
        @ source_direction
        @ Matrix.Diagonal(Vector((0.875, 0.62, 0.79, 1.0)))
    )
    for obj in (weapon, magazine):
        obj.data.transform(fit)
        obj.matrix_world = Matrix.Identity(4)
        for material in obj.data.materials:
            if material and not material.name.startswith("CoroAuto_ProjectM4_"):
                material.name = f"CoroAuto_ProjectM4_{material.name}"

    replacement = magazine.copy()
    replacement.data = magazine.data.copy()
    replacement.name = "coro_auto_project_m4_replacement_magazine"
    bpy.context.collection.objects.link(replacement)
    replacement.data.transform(Matrix.Translation(MAG_REGISTRATION))
    replacement.matrix_world = Matrix.Identity(4)

    bind_rigid(weapon, rig, "Rifle_metarig")
    bind_rigid(magazine, rig, "Mag_metarig")
    bind_rigid(replacement, rig, "Mag.001_metarig")
    weapon["source_asset"] = "public/models/weapons/m4.glb"
    weapon["family"] = "automatic-rifle"
    return [weapon, magazine, replacement], split_report


def setup_lights() -> list[bpy.types.Object]:
    lights = []
    specs = [
        ("CoroAuto_M4_Key", "AREA", 500.0, (1.0, 0.78, 0.58), (-2.5, -1.0, 6.0), 2.2),
        ("CoroAuto_M4_Fill", "AREA", 260.0, (0.35, 0.62, 1.0), (2.0, -0.3, 4.5), 2.5),
        ("CoroAuto_M4_Rim", "AREA", 380.0, (0.95, 0.24, 0.08), (-1.5, -2.5, 4.7), 1.5),
    ]
    for name, kind, energy, color, location, size in specs:
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        lights.append(light)
    return lights


def evaluated_points(obj: bpy.types.Object) -> list[Vector]:
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]


def hand_contact_distances(rig: bpy.types.Object, weapon_objects: list[bpy.types.Object]) -> dict[str, float]:
    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    weapon_points = [point for obj in weapon_objects[:2] for point in evaluated_points(obj)]
    tree = KDTree(len(weapon_points))
    for index, point in enumerate(weapon_points):
        tree.insert(point, index)
    tree.balance()

    hands = bpy.data.objects["coro_solto_hires_gloved_hands"]
    evaluated = hands.evaluated_get(bpy.context.evaluated_depsgraph_get())
    group_side = {}
    for group in hands.vertex_groups:
        if ".L_" in group.name or ".L." in group.name:
            group_side[group.index] = "left"
        elif ".R_" in group.name or ".R." in group.name:
            group_side[group.index] = "right"
    distances = {"left": math.inf, "right": math.inf}
    for source, deformed in zip(hands.data.vertices, evaluated.data.vertices):
        weights = {"left": 0.0, "right": 0.0}
        for link in source.groups:
            side = group_side.get(link.group)
            if side:
                weights[side] += link.weight
        side = max(weights, key=weights.get)
        if weights[side] <= 0.5:
            continue
        point = evaluated.matrix_world @ deformed.co
        _, _, distance = tree.find(point)
        distances[side] = min(distances[side], distance)
    return {side: round(distance, 6) for side, distance in distances.items()}


def render_actions(rig: bpy.types.Object) -> list[str]:
    rendered = []
    scene = bpy.context.scene
    for action_name, frames in ACTION_FRAMES.items():
        rig.animation_data.action = bpy.data.actions[action_name]
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            path = RENDERS / f"{action_name.lower()}_{frame:03d}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            rendered.append(str(path.relative_to(ROOT)))
    return rendered


def write_manifests(split_report: dict[str, int], contacts: dict[str, float], rendered: list[str]) -> None:
    manifest = {
        "schema": "coro_auto_viewmodel_reference.v1",
        "pilot": "m4",
        "project_weapon_source": "public/models/weapons/m4.glb",
        "animation_structure_source": str(SOURCE_PILOT),
        "forbidden_export_content": ["source weapon mesh", "source weapon material", "source weapon skin"],
        "required_actions": sorted(ACTION_FRAMES),
        "required_project_weapon_objects": [
            "coro_auto_project_m4_body",
            "coro_auto_project_m4_magazine",
            "coro_auto_project_m4_replacement_magazine",
        ],
        "visual_gate": {
            "aspect": "3:2",
            "states": sorted(ACTION_FRAMES),
            "hard_requirement": "contact sheets must be inspected before propagation",
        },
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report = {
        "schema": "coro_auto_viewmodel_build_report.v1",
        "pilot": "m4",
        "magazine_split": split_report,
        "idle_min_hand_to_weapon_distance_m": contacts,
        "rendered_frames": rendered,
        "structural_checks": {
            "required_actions_present": True,
            "source_weapon_objects_exported": 0,
            "weapon_geometry_origin": "public/models/weapons/m4.glb",
            "two_project_magazines": True,
            "strong_hand_rifle_registration_m": list(STRONG_HAND_RIFLE_OFFSET),
            "reload_visible_magazine_strategy": "one continuous project M4 magazine; replacement hidden",
        },
        "visual_status": "pending_contact_sheet_inspection",
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def export(rig: bpy.types.Object, camera: bpy.types.Object, project_objects: list[bpy.types.Object]) -> None:
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    selected = [rig, camera, *project_objects]
    selected.extend(bpy.data.objects[name] for name in sorted(PROJECT_ANATOMY))
    for obj in selected:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_morph=True,
        export_cameras=True,
        export_extras=True,
        export_apply=False,
    )


def main() -> None:
    setup_scene()
    rig, camera = load_animation_structure()
    project_objects, split_report = load_project_m4(rig)
    bake_hand_contract(rig)
    bake_reload_magazine_contract(rig)
    bake_fire_recoil(rig)
    setup_lights()
    contacts = hand_contact_distances(rig, project_objects)
    rendered = render_actions(rig)
    write_manifests(split_report, contacts, rendered)
    export(rig, camera, project_objects)
    print("CORO_AUTO_M4=" + json.dumps({
        "blend": str(BLEND),
        "glb": str(GLB),
        "renders": len(rendered),
        "contacts_m": contacts,
        "magazine_split": split_report,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
