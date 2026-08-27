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
    "Reload": [0, 12, 24, 36, 48, 60, 72, 80],
}
MAG_REGISTRATION = Vector((-0.000887, -0.028286, 0.029107))


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
    selected: set[int] = set()
    selected_components = 0
    for component in component_vertices(weapon.data):
        coords = [weapon.data.vertices[index].co for index in component]
        low = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
        high = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
        center = (low + high) * 0.5
        # The M4 magazine is the only cluster of complete loose hard-surface
        # shells below the receiver, forward of the pistol grip.  Selecting
        # whole shells avoids an open cut and is reproducible from source axes.
        is_magazine = (
            center.x > 0.035
            and low.x > -0.065
            and high.x < 0.255
            and low.z < -0.070
            and center.z < 0.015
        )
        if is_magazine:
            selected.update(component)
            selected_components += 1
    if len(selected) < 100 or selected_components < 3:
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


def load_project_m4(rig: bpy.types.Object) -> tuple[list[bpy.types.Object], dict[str, int]]:
    imported = import_glb(PROJECT_M4)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon:
            remove_object(obj)
    weapon.name = "coro_auto_project_m4_body"
    magazine, split_report = split_project_magazine(weapon)

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
