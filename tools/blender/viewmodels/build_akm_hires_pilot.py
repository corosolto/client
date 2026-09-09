"""Build the project AKM through the approved AK v27 production pipeline.

The intermediate AK blend is intentionally not used as a template: Blender's
saved action-slot state does not reproduce the contact pose used by the good
browser export.  Instead this builder reruns the exact CC0 anatomy/action
pipeline that produced AK v27 and inserts only the project's AKM geometry.
The donor weapon and donor materials are still deleted.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_ak_hires_pilot as pilot  # noqa: E402


ROOT = Path(__file__).resolve().parents[3]
PROJECT_WEAPON = ROOT / "public" / "models" / "weapons" / "akm.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "akm-hires-pilot"
BLEND = OUT / "akm-hires-pilot.blend"
GLB = OUT / "akm-hires-pilot.glb"
RENDERS = OUT / "renders"
PUBLIC_GLB = ROOT / "public" / "models" / "viewmodels" / "coro" / "akm-hires.glb"


def remove_approved_ak_geometry() -> None:
    names = (
        "coro_solto_project_ak_body",
        "coro_solto_project_ak_charging_handle",
        "coro_solto_project_ak_magazine",
        "coro_solto_project_ak_replacement_magazine",
    )
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)


def split_magazine(weapon: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    weapon.select_set(True)
    bpy.context.view_layer.objects.active = weapon
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    selected = 0
    for polygon in weapon.data.polygons:
        center = polygon.center
        polygon.select = -0.105 <= center.x <= 0.078 and center.z <= 0.052
        selected += int(polygon.select)
    if selected < 24:
        raise RuntimeError(f"Project AKM magazine mask too small: {selected}")
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    magazine = next(obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH")
    magazine.name = "coro_solto_project_akm_magazine"
    # The low-poly source stores many tiny receiver/trigger details as loose
    # triangles. A center-only crop catches a few of them near the magazine
    # well, which then appear as black splinters attached to the reload hand.
    # Every real magazine strip extends well below the receiver; remove loose
    # components that never reach the curved body of the magazine.
    bm = bmesh.new()
    bm.from_mesh(magazine.data)
    remaining = set(bm.verts)
    debris = set()
    while remaining:
        seed = remaining.pop()
        component = {seed}
        frontier = [seed]
        while frontier:
            vertex = frontier.pop()
            for edge in vertex.link_edges:
                linked = edge.other_vert(vertex)
                if linked in remaining:
                    remaining.remove(linked)
                    component.add(linked)
                    frontier.append(linked)
        xs = [vertex.co.x for vertex in component]
        zs = [vertex.co.z for vertex in component]
        if min(zs) > -0.045 or min(xs) < -0.112 or max(xs) > 0.086:
            debris.update(component)
    if debris:
        bmesh.ops.delete(bm, geom=list(debris), context="VERTS")
    kept = len(bm.verts)
    if kept < 150:
        bm.free()
        raise RuntimeError(f"Project AKM cleaned magazine too small: {kept} vertices")
    bm.to_mesh(magazine.data)
    bm.free()
    magazine.data.update()
    magazine["debris_vertices_removed"] = len(debris)
    magazine["contact_anchor"] = "Mag_metarig"
    return magazine


def trim_first_person_stock(weapon: bpy.types.Object) -> None:
    """Remove complete AKM buttstock shells behind the first-person eye."""
    bm = bmesh.new()
    bm.from_mesh(weapon.data)
    remaining = set(bm.verts)
    rear = set()
    components = 0
    while remaining:
        seed = remaining.pop()
        component = {seed}
        frontier = [seed]
        while frontier:
            vertex = frontier.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other)
                    component.add(other)
                    frontier.append(other)
        if min(vertex.co.x for vertex in component) > 0.240:
            rear.update(component)
            components += 1
    if len(rear) < 120:
        bm.free()
        raise RuntimeError(f"Project AKM stock mask too small: {len(rear)}")
    bmesh.ops.delete(bm, geom=list(rear), context="VERTS")
    bm.to_mesh(weapon.data)
    bm.free()
    weapon.data.update()
    weapon["fps_stock_policy"] = "complete rear shells removed behind seam x=+0.240"
    weapon["fps_stock_vertices_removed"] = len(rear)
    weapon["fps_stock_shells_removed"] = components


def fit_project_akm(rig: bpy.types.Object):
    imported = pilot.import_glb(PROJECT_WEAPON)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon and obj.type == "EMPTY":
            bpy.data.objects.remove(obj, do_unlink=True)
    weapon.name = "coro_solto_project_akm_body"
    magazine = split_magazine(weapon)
    pilot.replace_material(
        magazine,
        pilot.material("CoroSolto_AKM_Magazine", (0.012, 0.016, 0.021, 1.0), 0.28, 0.78),
    )
    trim_first_person_stock(weapon)

    # AKM source: -X is muzzle. Mirror X and thickness relative to the AK v27
    # basis while keeping +Z mapped to donor-local down. This preserves a
    # right-handed transform and registers the receiver at the approved grip.
    basis = Matrix((
        (0.0, -1.0, 0.0, 0.0),
        (0.0, 0.0, -1.0, 0.0),
        (1.0, 0.0, 0.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    ))
    fit = (
        Matrix.Translation(Vector((-0.1475, -1.6065, -0.3500)))
        @ basis
        @ Matrix.Diagonal(Vector((0.863, 0.62, 0.808, 1.0)))
    )
    for obj in (weapon, magazine):
        obj.data.transform(fit)
        obj.matrix_world = Matrix.Identity(4)

    replacement = magazine.copy()
    replacement.data = magazine.data.copy()
    replacement.name = "coro_solto_project_akm_replacement_magazine"
    bpy.context.collection.objects.link(replacement)
    replacement.data.transform(Matrix.Translation(pilot.REPLACEMENT_MAG_OFFSET))
    replacement.matrix_world = Matrix.Identity(4)
    replacement["contact_anchor"] = "Mag.001_metarig"

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0065, depth=0.038)
    bolt = bpy.context.object
    bolt.name = "coro_solto_project_akm_charging_handle"
    bolt.data.transform(
        fit
        @ Matrix.Translation(Vector((0.045, 0.036, 0.105)))
        @ Matrix.Rotation(math.radians(90.0), 4, "X")
    )
    bolt.matrix_world = Matrix.Identity(4)
    bolt.data.materials.append(
        pilot.material("CoroSolto_AKM_Bolt", (0.018, 0.022, 0.028, 1.0), 0.34, 0.72)
    )
    bevel = bolt.modifiers.new("CoroSolto_Bolt_Edge", "BEVEL")
    bevel.width = 0.0015
    bevel.segments = 2

    # A malha low-poly do projeto deixa aberto o interior do conjunto
    # cano/tubo de gases. Contra um fundo claro (principalmente o céu), essa
    # abertura vira um recorte azul artificial atravessando a arma. Uma peça
    # interna escura sela o volume sem alterar a silhueta externa nem substituir
    # a arma própria do projeto.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.0135,
        depth=0.34,
        location=(-0.1475, -1.596, -0.475),
    )
    front_occluder = bpy.context.object
    front_occluder.name = "coro_solto_project_akm_front_occluder"
    front_occluder.data.materials.append(
        pilot.material("CoroSolto_AKM_Internal", (0.006, 0.008, 0.011, 1.0), 0.42, 0.82)
    )
    front_occluder["occlusion_role"] = "seal-front-sky-leak"
    front_occluder["external_silhouette"] = "unchanged"
    occluder_bevel = front_occluder.modifiers.new("CoroSolto_Internal_Edge", "BEVEL")
    occluder_bevel.width = 0.0012
    occluder_bevel.segments = 2

    pilot.bind_rigid(weapon, rig, "Rifle_metarig")
    pilot.bind_rigid(magazine, rig, "Mag_metarig")
    pilot.bind_rigid(replacement, rig, "Mag.001_metarig")
    pilot.bind_rigid(bolt, rig, "Bolt_metarig")
    pilot.bind_rigid(front_occluder, rig, "Rifle_metarig")
    weapon["weapon_id"] = "akm"
    weapon["registration_source"] = "approved-ak-v27-contact-rig"
    return weapon, magazine, replacement, bolt, front_occluder


def configure_output() -> None:
    pilot.OUT = OUT
    pilot.BLEND = BLEND
    pilot.GLB = GLB
    pilot.RENDERS = RENDERS


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    PUBLIC_GLB.parent.mkdir(parents=True, exist_ok=True)
    configure_output()
    pilot.setup_scene()
    rig = pilot.load_anatomy_rig()
    hold_pose = pilot.rebuild_idle_from_valid_contact_pose(rig)
    pilot.rebuild_reload_v24(rig, hold_pose)
    pilot.dampen_shoot_recoil(rig, hold_pose)
    pilot.add_reload_bolt_cycle(rig, hold_pose)
    pilot.lock_strong_hand_to_project_grip(rig)
    rig["weapon_family"] = "akm"
    rig["source_template"] = "ak-v27-approved"
    fit_project_akm(rig)
    pilot.setup_camera_and_lights()

    # Contact-sheet frames: stable pose, recoil, empty-mag removal, fresh-mag
    # transport and insertion. These are the required visual acceptance states.
    pilot.render_action(rig, "Equip", [73], "hold")
    pilot.render_action(rig, "Shoot", [0, 5, 10], "fire")
    pilot.render_action(
        rig,
        "Reload",
        [0, 20, 34, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 92, 100],
        "reload",
    )
    pilot.export(rig)
    PUBLIC_GLB.write_bytes(GLB.read_bytes())
    print(f"AKM_HIRES_PILOT blend={BLEND} glb={GLB} public={PUBLIC_GLB}")


if __name__ == "__main__":
    main()
