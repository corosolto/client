"""Build the high-resolution AK FPS pilot using project geometry only.

The supplied CC0 AK-12 file contributes its high-resolution first-person hand
topology, rig and action structure. Every donor weapon mesh and donor material
is deleted. The project AK is fitted in donor rig-local space and attached to
the donor Rifle/Mag anchors so the existing contact animation drives our asset.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "ak-12animated.glb"
PROJECT_AK = ROOT / "public" / "models" / "weapons" / "ak.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "ak-hires-pilot"
BLEND = OUT / "ak-hires-pilot.blend"
GLB = OUT / "ak-hires-pilot.glb"
RENDERS = OUT / "renders"

# Measured registration delta between the project AK magazine centroid and the
# CC0 animation's hidden magazine proxy. This is animation metadata only: the
# visible mesh remains the project magazine. Registering the project copy to
# the proxy keeps it centered in the support palm during Reload.
REPLACEMENT_MAG_OFFSET = Vector((-0.000887, -0.028286, 0.029107))


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


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
    world = bpy.data.worlds.new("CoroSolto_AK_Hires_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.055, 0.075, 0.095, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world


def material(name: str, color: tuple[float, float, float, float], roughness: float,
             metallic: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
    return mat


def tattoo_material() -> bpy.types.Material:
    # Keep the pilot material inside glTF's supported Principled subset.  The
    # earlier procedural Noise -> ColorRamp graph rendered brown in Blender,
    # but the exporter could not serialize it and the browser showed white
    # donor sleeves.  A constant project-skin colour is intentionally plain,
    # but survives Blender -> GLB -> Three.js exactly.  Tattoo decals come only
    # after anatomy/contact approval and will use an exportable texture map.
    return material("CoroSolto_Mandrake_Sleeves", (0.018, 0.045, 0.075, 1.0), 0.74)


def replace_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True


def key_pose_bone(bone: bpy.types.PoseBone, frame: float) -> None:
    """Key one pose control without assuming its rotation representation."""
    bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    if bone.rotation_mode == "QUATERNION":
        bone.keyframe_insert(
            data_path="rotation_quaternion", frame=frame, group=bone.name
        )
    elif bone.rotation_mode == "AXIS_ANGLE":
        bone.keyframe_insert(
            data_path="rotation_axis_angle", frame=frame, group=bone.name
        )
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def trim_upper_arms(obj: bpy.types.Object, rig: bpy.types.Object) -> None:
    """Remove donor shoulders and taper the sleeve ends behind the camera."""
    group_indices = {
        group.index for group in obj.vertex_groups
        if group.name in {"upper_arm.L_metarig", "upper_arm.R_metarig"}
    }
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for vertex in obj.data.vertices:
        vertex.select = sum(a.weight for a in vertex.groups if a.group in group_indices) > 0.35
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="VERT")

    # The two large boundaries are the cuts created above.  A flat cap reads as
    # a black hollow oval whenever reload rotates an elbow toward the FPS
    # camera.  Extend each loop back toward its anatomical shoulder, taper it
    # twice, and close only the tiny terminal ring.  The extension remains
    # below/behind the camera while the original sculpted forearm stays intact.
    bm = bmesh.from_edit_mesh(obj.data)
    boundary_edges = [edge for edge in bm.edges if len(edge.link_faces) == 1]
    components: list[list[bmesh.types.BMEdge]] = []
    remaining = set(boundary_edges)
    while remaining:
        seed = remaining.pop()
        component = [seed]
        frontier = [seed]
        while frontier:
            edge = frontier.pop()
            neighbours = {
                linked
                for vertex in edge.verts
                for linked in vertex.link_edges
                if linked in remaining
            }
            for linked in neighbours:
                remaining.remove(linked)
                component.append(linked)
                frontier.append(linked)
        components.append(component)
    shoulder_loops = sorted(components, key=len, reverse=True)[:2]
    new_faces = []
    for edges in shoulder_loops:
        source_vertices = {vertex for edge in edges for vertex in edge.verts}
        center = sum((vertex.co for vertex in source_vertices), Vector()) / len(source_vertices)
        side = "L" if center.x >= 0.0 else "R"
        shoulder_world = (
            rig.matrix_world
            @ rig.data.bones[f"upper_arm.{side}_metarig"].head_local
        )
        shoulder = obj.matrix_world.inverted() @ shoulder_world
        sleeve_axis = (shoulder - center).normalized()

        first = bmesh.ops.extrude_edge_only(bm, edges=edges)
        first_vertices = {
            element for element in first["geom"]
            if isinstance(element, bmesh.types.BMVert) and element not in source_vertices
        }
        first_center = center + sleeve_axis * 0.075
        for vertex in first_vertices:
            # extrude_edge_only copies the boundary's existing deform weights.
            # Keeping those weights intact makes this short closure follow the
            # forearm instead of stretching between forearm and upper arm.
            vertex.co = first_center + (vertex.co - center) * 0.58
        first_ring = [
            edge for edge in bm.edges
            if len(edge.link_faces) == 1 and all(vertex in first_vertices for vertex in edge.verts)
        ]

        second = bmesh.ops.extrude_edge_only(bm, edges=first_ring)
        second_vertices = {
            element for element in second["geom"]
            if isinstance(element, bmesh.types.BMVert) and element not in first_vertices
        }
        second_center = center + sleeve_axis * 0.125
        for vertex in second_vertices:
            vertex.co = second_center + (vertex.co - first_center) * 0.18
        terminal_ring = [
            edge for edge in bm.edges
            if len(edge.link_faces) == 1 and all(vertex in second_vertices for vertex in edge.verts)
        ]
        result = bmesh.ops.holes_fill(bm, edges=terminal_ring, sides=0)
        new_faces.extend(result.get("faces", []))
    if new_faces:
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")


def load_anatomy_rig() -> bpy.types.Object:
    imported = import_glb(DONOR)
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    hands = next(obj for obj in imported if obj.name == "Requests_Studio_Hands_0")
    forearms = next(obj for obj in imported if obj.name == "Requests_Studio_Hands_1")
    watch = next(obj for obj in imported if obj.name == "watch_0")

    keep = {rig, hands, forearms, watch}
    # Preserve the empty parent chain because it contains the donor coordinate
    # conversion used by the rig and its animation actions.
    parent = rig.parent
    while parent:
        keep.add(parent)
        parent = parent.parent
    for obj in list(imported):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    replace_material(hands, material("CoroSolto_FP_Gloves", (0.018, 0.028, 0.040, 1.0), 0.70))
    replace_material(forearms, tattoo_material())
    trim_upper_arms(forearms, rig)
    replace_material(watch, material("CoroSolto_FP_Watch", (0.12, 0.14, 0.16, 1.0), 0.30, 0.65))
    hands.name = "coro_solto_hires_gloved_hands"
    forearms.name = "coro_solto_hires_project_sleeves"
    watch.name = "coro_solto_hires_watch"
    rig.name = "coro_solto_hires_fp_rig"
    rig["geometry_origin"] = "project-ak-only"
    rig["anatomy_origin"] = "cc0-hires-topology-reskinned"
    rig["reference_policy"] = "donor-weapon-and-textures-deleted"
    return rig


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
        polygon.select = -0.075 <= center.x <= 0.105 and center.z <= 0.041
        selected += int(polygon.select)
    if selected < 30:
        raise RuntimeError(f"Project AK magazine mask too small: {selected}")
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    magazine = next(obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH")
    magazine.name = "coro_solto_project_ak_magazine"
    return magazine


def trim_first_person_stock(weapon: bpy.types.Object) -> None:
    """Remove only the buttstock hidden behind the FPS camera.

    The world/pickup GLB remains complete.  This edit is applied only to the
    authored first-person copy, at the model's existing rear seam.  Keeping the
    firing hand while omitting geometry that is physically behind the player's
    eye is standard viewmodel construction and avoids solving the problem by
    cropping the hand together with the stock.
    """
    bm = bmesh.new()
    bm.from_mesh(weapon.data)
    remaining = set(bm.verts)
    rear: set[bmesh.types.BMVert] = set()
    rear_components = 0
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
        # The project mesh is authored as loose hard-surface shells.  Delete
        # complete shells behind the stock seam; never bisect a shell, because
        # that also opens the receiver and disconnects the pistol grip.
        if max(vertex.co.x for vertex in component) < -0.240:
            rear.update(component)
            rear_components += 1
    removed = len(rear)
    if removed < 250 or rear_components < 20:
        bm.free()
        raise RuntimeError(
            f"Project AK stock mask too small: {removed} verts / {rear_components} shells"
        )
    bmesh.ops.delete(bm, geom=list(rear), context="VERTS")
    bm.to_mesh(weapon.data)
    bm.free()
    weapon.data.update()
    weapon["fps_stock_policy"] = "complete rear shells removed behind seam x=-0.240"
    weapon["fps_stock_vertices_removed"] = removed
    weapon["fps_stock_shells_removed"] = rear_components


def bind_rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.parent = rig
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_local = Matrix.Identity(4)
    modifier = obj.modifiers.new("CoroSolto_Hires_FP_Rig", "ARMATURE")
    modifier.object = rig


def fit_project_ak(
    rig: bpy.types.Object,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    imported = import_glb(PROJECT_AK)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    for obj in imported:
        if obj is not weapon and obj.type == "EMPTY":
            bpy.data.objects.remove(obj, do_unlink=True)
    weapon.name = "coro_solto_project_ak_body"
    magazine = split_magazine(weapon)
    trim_first_person_stock(weapon)

    # Donor rig-local combined gun envelope:
    # x[-.169,-.126], y[-1.729,-1.484], z[-.825,.038].
    # Project AK axes are +X muzzle, +Z up. Donor local +Y maps to world DOWN
    # through its imported root conversion, so project +Z must map to donor
    # -Y. Flip the thickness axis with it to preserve handedness. The earlier
    # +Z -> +Y mapping rolled our AK 180 degrees: magazine and grip pointed up.
    basis = Matrix((
        (0.0, 1.0, 0.0, 0.0),
        (0.0, 0.0, -1.0, 0.0),
        (-1.0, 0.0, 0.0, 0.0),
        (0.0, 0.0, 0.0, 1.0),
    ))
    fit = (
        # Anchor the receiver/magazine well, not the total silhouette. The
        # classic project AK has a different stock-to-muzzle proportion from
        # the donor AK-12; bbox centering put its grip about 4 cm too far
        # forward relative to the trigger hand.
        Matrix.Translation(Vector((-0.1475, -1.6065, -0.3500)))
        @ basis
        @ Matrix.Diagonal(Vector((0.863, 0.62, 0.808, 1.0)))
    )
    for obj in (weapon, magazine):
        obj.data.transform(fit)
        obj.matrix_world = Matrix.Identity(4)

    # The donor reload uses two magazine anchors: Mag is the empty magazine
    # leaving the rifle; Mag.001 is the fresh magazine carried by the support
    # hand.  Binding our only magazine to Mag made the empty magazine float by
    # itself while the hand manipulated an invisible replacement.  Duplicate
    # only our project magazine geometry and place its rest geometry in the
    # second anchor so the existing CC0 hand contact drives a real visible
    # replacement magazine. Both meshes must keep the same armature-local rest
    # geometry. Moving the vertices into Mag.001's rest matrix here applies the
    # rest transform twice during skinning and makes the magazine jump toward
    # the foregrip instead of entering the actual magazine well.
    replacement_magazine = magazine.copy()
    replacement_magazine.data = magazine.data.copy()
    replacement_magazine.name = "coro_solto_project_ak_replacement_magazine"
    bpy.context.collection.objects.link(replacement_magazine)
    replacement_magazine.matrix_world = Matrix.Identity(4)
    replacement_magazine.data.transform(Matrix.Translation(REPLACEMENT_MAG_OFFSET))

    # The source AK mesh has no separately animated charging handle. Add a
    # small handle authored from primitives at the measured receiver location;
    # it is our geometry/material and follows only the donor's Bolt anchor.
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0065, depth=0.038)
    bolt = bpy.context.object
    bolt.name = "coro_solto_project_ak_charging_handle"
    bolt.data.transform(
        fit
        @ Matrix.Translation(Vector((-0.045, -0.036, 0.105)))
        @ Matrix.Rotation(math.radians(90.0), 4, "X")
    )
    bolt.matrix_world = Matrix.Identity(4)
    bolt.data.materials.append(
        material("CoroSolto_AK_Bolt", (0.018, 0.022, 0.028, 1.0), 0.34, 0.72)
    )
    bevel = bolt.modifiers.new("CoroSolto_Bolt_Edge", "BEVEL")
    bevel.width = 0.0015
    bevel.segments = 2
    bind_rigid(weapon, rig, "Rifle_metarig")
    bind_rigid(magazine, rig, "Mag_metarig")
    bind_rigid(replacement_magazine, rig, "Mag.001_metarig")
    bind_rigid(bolt, rig, "Bolt_metarig")
    return weapon, magazine, replacement_magazine, bolt


def rebuild_idle_from_valid_contact_pose(rig: bpy.types.Object) -> dict[str, Matrix]:
    """Replace the donor's broken open-hand Idle with its valid Equip end pose.

    The untouched source was rendered before accepting it. Its Idle action has
    the support hand floating beside the rifle, while Equip frame 58 and Shoot
    frame 0 have stable two-hand contact. Bake that verified pose into a clean
    100-frame hold action instead of shipping a mislabeled donor animation.
    """
    source = bpy.data.actions.get("Equip")
    rejected = bpy.data.actions.get("Idle")
    if source is None or rejected is None:
        raise RuntimeError("Expected donor Equip and Idle actions")

    rig.animation_data_create()
    rig.animation_data.action = source
    bpy.context.scene.frame_set(58)
    bpy.context.view_layer.update()
    pose = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}

    rejected.name = "Idle_DonorRejected"
    idle = bpy.data.actions.new("Idle")
    rig.animation_data.action = idle
    for frame in (0, 50, 100):
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis = pose[bone.name]
            bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
            if bone.rotation_mode == "QUATERNION":
                bone.keyframe_insert(
                    data_path="rotation_quaternion", frame=frame, group=bone.name
                )
            elif bone.rotation_mode == "AXIS_ANGLE":
                bone.keyframe_insert(
                    data_path="rotation_axis_angle", frame=frame, group=bone.name
                )
            else:
                bone.keyframe_insert(
                    data_path="rotation_euler", frame=frame, group=bone.name
                )
            bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)
    idle["source_pose"] = "Equip frame 58"
    idle["visual_gate"] = "two-hand contact verified in donor diagnostic"
    bpy.data.actions.remove(rejected)
    return pose


def close_reload_on_hold_pose(rig: bpy.types.Object, hold_pose: dict[str, Matrix]) -> None:
    """Finish the two-magazine reload with the fresh magazine seated."""
    reload_action = bpy.data.actions.get("Reload")
    idle_action = bpy.data.actions.get("Idle")
    if reload_action is None or idle_action is None:
        raise RuntimeError("Expected rebuilt Idle and donor Reload actions")

    # Capture the seated magazine matrix in armature space.  Copying
    # matrix_basis between Mag and Mag.001 is incorrect because the anchors
    # have different rest transforms.
    rig.animation_data.action = idle_action
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    seated_matrix = rig.pose.bones["Mag_metarig"].matrix.copy()
    old_rest = rig.data.bones["Mag_metarig"].matrix_local
    new_rest = rig.data.bones["Mag.001_metarig"].matrix_local
    # The mobile copy is registered to the animation's hidden proxy while in
    # the palm. Compensate that registration when it reaches the receiver so
    # its vertices coincide with the installed project magazine exactly.
    registration = Matrix.Translation(REPLACEMENT_MAG_OFFSET)
    fresh_seated_matrix = (
        seated_matrix
        @ old_rest.inverted()
        @ registration.inverted()
        @ new_rest
    )

    rig.animation_data.action = reload_action

    empty_mag = rig.pose.bones["Mag_metarig"]
    fresh_mag = rig.pose.bones["Mag.001_metarig"]
    rifle = rig.pose.bones["Rifle_metarig"]
    support_chain = [
        rig.pose.bones["upper_arm.L_metarig"],
        rig.pose.bones["forearm.L_metarig"],
        rig.pose.bones["hand.L_metarig"],
    ]

    def is_descendant_of(
        bone: bpy.types.PoseBone, ancestor: bpy.types.PoseBone
    ) -> bool:
        parent = bone.parent
        while parent is not None:
            if parent == ancestor:
                return True
            parent = parent.parent
        return False

    support_fingers = [
        bone
        for bone in rig.pose.bones
        if is_descendant_of(bone, support_chain[-1])
    ]

    def blend_matrix(start: Matrix, end: Matrix, factor: float) -> Matrix:
        """Interpolate a pose without introducing shear between key poses."""
        start_location, start_rotation, start_scale = start.decompose()
        end_location, end_rotation, end_scale = end.decompose()
        return Matrix.LocRotScale(
            start_location.lerp(end_location, factor),
            start_rotation.slerp(end_rotation, factor),
            start_scale.lerp(end_scale, factor),
        )

    def key_pose_transform(bone: bpy.types.PoseBone, frame: int) -> None:
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert(
                data_path="rotation_quaternion", frame=frame, group=bone.name
            )
        elif bone.rotation_mode == "AXIS_ANGLE":
            bone.keyframe_insert(
                data_path="rotation_axis_angle", frame=frame, group=bone.name
            )
        else:
            bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)

    # The replacement mesh must not exist visually outside Reload. Its donor
    # anchor is close enough to the FPS camera to appear below the rifle unless
    # it is explicitly collapsed in every other exported action.
    for action_name in ("Idle", "Shoot", "Equip"):
        action = bpy.data.actions.get(action_name)
        if action is None:
            continue
        rig.animation_data.action = action
        start, end = (int(action.frame_range[0]), int(action.frame_range[1]))
        # Bake every frame because the source actions already contain hidden
        # scale keys (notably Idle frame 50). Endpoints alone let Bezier
        # interpolation regrow the spare magazine in the browser.
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            fresh_mag.scale = Vector((0.001, 0.001, 0.001))
            fresh_mag.keyframe_insert(data_path="scale", frame=frame, group=fresh_mag.name)

    rig.animation_data.action = reload_action

    # Capture the donor's original, anatomically valid support-arm path before
    # adding any keys.  We keep the elbow and forearm on this path and move the
    # magazine to the hand; dragging the whole arm rigidly by the magazine made
    # the forearm cross the camera during the removal transition.
    source_support_basis = {}
    source_finger_basis = {}
    source_hand_matrix = {}
    source_empty_path = {}
    source_fresh_path = {}

    def without_scale(matrix: Matrix) -> Matrix:
        location, rotation, _scale = matrix.decompose()
        return Matrix.LocRotScale(location, rotation, Vector((1.0, 1.0, 1.0)))

    for frame in range(20, 41):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        source_support_basis[frame] = {
            bone.name: bone.matrix_basis.copy() for bone in support_chain
        }
        source_finger_basis[frame] = {
            bone.name: bone.matrix_basis.copy() for bone in support_fingers
        }
        source_hand_matrix[frame] = support_chain[-1].matrix.copy()
        if frame <= 26:
            source_empty_path[frame] = without_scale(empty_mag.matrix.copy())
        if frame >= 26:
            # The donor hides this proxy with scale=.001. Strip scale before
            # deriving hand-relative transforms, otherwise inversion magnifies
            # the contact offset by 1000x and sends the arm through the camera.
            source_fresh_path[frame] = without_scale(fresh_mag.matrix.copy())
    bpy.context.scene.frame_set(40)
    bpy.context.view_layer.update()
    insertion_start = source_fresh_path[40]
    # Express both endpoints in rifle-local space. The donor rotates the rifle
    # throughout Reload; interpolating toward one fixed armature-space target
    # made the magazine appear to stop in the air while the weapon moved onto
    # it. A rifle-local path keeps the receiver authoritative: the support
    # hand and magazine travel to the well while the weapon pose settles.
    insertion_start_local = rifle.matrix.inverted() @ insertion_start
    seated_local = rifle.matrix.inverted() @ fresh_seated_matrix
    chain_on_mag = {
        bone.name: insertion_start.inverted() @ bone.matrix.copy()
        for bone in support_chain
    }
    frozen_finger_basis = {
        bone.name: bone.matrix_basis.copy() for bone in support_fingers
    }

    def fresh_pose_as_old(fresh_matrix: Matrix) -> Matrix:
        """Pose Mag so its mesh exactly overlaps Mag.001 at any transform."""
        return fresh_matrix @ new_rest.inverted() @ registration @ old_rest

    def old_pose_as_fresh(old_matrix: Matrix) -> Matrix:
        """Express an installed Mag mesh pose in Mag.001 bone space."""
        return old_matrix @ old_rest.inverted() @ registration.inverted() @ new_rest

    # Visibility is baked every frame to avoid Bezier scale morphs. The old
    # magazine remains real through its complete travel out of the receiver.
    # At frame 34 both meshes overlap exactly; the identity swap is therefore
    # invisible. The old mesh collapses only on the following frame.
    for frame in range(0, 101):
        bpy.context.scene.frame_set(frame)
        empty_mag.scale = (
            Vector((1.0, 1.0, 1.0))
            if frame <= 34
            else Vector((0.001, 0.001, 0.001))
        )
        fresh_mag.scale = (
            Vector((1.0, 1.0, 1.0))
            if 34 <= frame <= 100
            else Vector((0.001, 0.001, 0.001))
        )
        empty_mag.keyframe_insert(data_path="scale", frame=frame, group=empty_mag.name)
        fresh_mag.keyframe_insert(data_path="scale", frame=frame, group=fresh_mag.name)

    # Frames 20-24: keep the old magazine locked to the rifle. The hand follows
    # the donor approach until frame 22, then closes onto the installed
    # magazine. Nothing begins moving before visible palm contact.
    carried_hand_relation = (
        source_fresh_path[26].inverted() @ source_hand_matrix[26]
    )
    installed_fresh_24 = old_pose_as_fresh(source_empty_path[24])
    seated_hand_contact = installed_fresh_24 @ carried_hand_relation
    for frame in range(20, 25):
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = source_empty_path[frame]
        empty_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(empty_mag, frame)
        for bone in support_chain:
            bone.matrix_basis = source_support_basis[frame][bone.name]
            key_pose_transform(bone, frame)
        if frame >= 22:
            linear = (frame - 22) / 2.0
            eased = linear * linear * (3.0 - 2.0 * linear)
            support_chain[-1].matrix = blend_matrix(
                source_hand_matrix[frame], seated_hand_contact, eased
            )
            bpy.context.view_layer.update()
            key_pose_transform(support_chain[-1], frame)
        for bone in support_fingers:
            if frame >= 22:
                bone.matrix_basis = blend_matrix(
                    source_finger_basis[frame][bone.name],
                    source_finger_basis[26][bone.name],
                    eased,
                )
            else:
                bone.matrix_basis = source_finger_basis[frame][bone.name]
            key_pose_transform(bone, frame)

    # Frames 25-26: with the fingers already wrapped, move the hand and old
    # magazine together from the well into the donor's carried pose.
    for frame in range(25, 27):
        linear = (frame - 24) / 2.0
        eased = linear * linear * (3.0 - 2.0 * linear)
        magazine_path = blend_matrix(
            installed_fresh_24, source_fresh_path[26], eased
        )
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = fresh_pose_as_old(magazine_path)
        empty_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(empty_mag, frame)
        for bone in support_chain[:-1]:
            bone.matrix_basis = source_support_basis[frame][bone.name]
            key_pose_transform(bone, frame)
        support_chain[-1].matrix = magazine_path @ carried_hand_relation
        bpy.context.view_layer.update()
        key_pose_transform(support_chain[-1], frame)
        for bone in support_fingers:
            bone.matrix_basis = source_finger_basis[26][bone.name]
            key_pose_transform(bone, frame)

    # Frames 27-34: continue on the donor's hand/magazine contact path. At frame
    # 34 the old mesh exactly overlaps the fresh mesh, making the identity swap
    # invisible while retaining continuous motion and an anatomical elbow.
    for frame in range(27, 35):
        magazine_path = source_fresh_path[frame]
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = fresh_pose_as_old(magazine_path)
        empty_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(empty_mag, frame)
        for bone in support_chain:
            bone.matrix_basis = source_support_basis[frame][bone.name]
            key_pose_transform(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = source_finger_basis[frame][bone.name]
            key_pose_transform(bone, frame)

    # Frames 34-40: the replacement magazine follows the source's continuous
    # carried path and original arm motion. This bridges the removal directly
    # into the verified rigid-contact insertion segment below.
    for frame in range(34, 41):
        magazine_path = source_fresh_path[frame]
        bpy.context.scene.frame_set(frame)
        fresh_mag.matrix = magazine_path
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(fresh_mag, frame)
        for bone in support_chain:
            bone.matrix_basis = source_support_basis[frame][bone.name]
            key_pose_transform(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = source_finger_basis[frame][bone.name]
            key_pose_transform(bone, frame)

    # The donor clip loses contact after frame 40: its support hand moves to the
    # wooden handguard while the spare magazine continues independently.  Keep
    # the verified frame-40 hand/magazine relationship rigid and drive both as
    # one unit along a short, smooth path into our measured magazine well.
    for frame in range(40, 73):
        linear = (frame - 40) / 32.0
        eased = linear * linear * (3.0 - 2.0 * linear)
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        local_mag_pose = blend_matrix(insertion_start_local, seated_local, eased)
        fresh_mag.matrix = rifle.matrix @ local_mag_pose
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(fresh_mag, frame)
        bpy.context.view_layer.update()
        # Assign the articulated chain from parent to child and update the
        # dependency graph after every parent.  Without these updates Blender
        # converts the child's world matrix against the parent's stale matrix,
        # producing the detached hand seen in the previous visual gate.
        for bone in support_chain:
            bone.matrix = fresh_mag.matrix @ chain_on_mag[bone.name]
            bpy.context.view_layer.update()
            key_pose_transform(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = frozen_finger_basis[bone.name]
            key_pose_transform(bone, frame)

    # At frame 72 the fresh magazine is visibly seated and the support hand is
    # still wrapped around it. Blend every non-magazine control from this
    # contact pose back to the verified idle hold, rather than letting hidden
    # donor keys snap the hand onto the first wooden handguard.
    bpy.context.scene.frame_set(72)
    bpy.context.view_layer.update()
    closure_start = {
        bone.name: bone.matrix_basis.copy()
        for bone in rig.pose.bones
        if bone.name not in {"Mag_metarig", "Mag.001_metarig"}
    }
    for frame in range(72, 89):
        linear = (frame - 72) / 16.0
        eased = linear * linear * (3.0 - 2.0 * linear)
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            if bone.name in {"Mag_metarig", "Mag.001_metarig"}:
                continue
            bone.matrix_basis = blend_matrix(
                closure_start[bone.name], hold_pose[bone.name], eased
            )
            key_pose_transform(bone, frame)

    # Hold the seated replacement on the receiver until the action hands
    # control back to Idle (where the original magazine replaces it at the same
    # world transform, making the swap invisible).
    for frame in range(72, 101):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        fresh_mag.matrix = rifle.matrix @ seated_local
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(fresh_mag, frame)
    # The source ends with the spare magazine still detached. Blend back to the
    # verified hold pose and key an exact settled state at the action boundary.
    # Bake every closure frame. The donor contains additional keys between 80
    # and 92; merely keying the endpoints lets those hidden keys reopen and
    # float the support hand at frame 86.
    for frame in range(89, 101):
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            if bone.name in {"Mag_metarig", "Mag.001_metarig"}:
                continue
            bone.matrix_basis = hold_pose[bone.name]
            key_pose_transform(bone, frame)

    # The closure bake above deliberately skips both magazine anchors. Reapply
    # the fresh magazine seat after it, and keep the empty one collapsed, so no
    # hidden donor key can bring the spare magazine back under the rifle.
    for frame in range(72, 101):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        fresh_mag.matrix = rifle.matrix @ seated_local
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_transform(fresh_mag, frame)
        empty_mag.scale = Vector((0.001, 0.001, 0.001))
        empty_mag.keyframe_insert(data_path="scale", frame=frame, group=empty_mag.name)

    # The imported donor action carries unused keys to frame 125. They keep the
    # browser playing a second, unrelated tail after our settled frame 100.
    # Remove that tail so the authored reload ends where the visual gate ends.
    if hasattr(reload_action, "slots") and reload_action.slots:
        reload_curves = []
        for slot in reload_action.slots:
            channelbag = reload_action.layers[0].strips[0].channelbag(slot)
            if channelbag is not None:
                reload_curves.extend(channelbag.fcurves)
    else:
        reload_curves = list(reload_action.fcurves)
    for curve in reload_curves:
        for index in range(len(curve.keyframe_points) - 1, -1, -1):
            point = curve.keyframe_points[index]
            if point.co.x > 100.0:
                curve.keyframe_points.remove(point, fast=True)
        curve.update()
    reload_action["closure_fix"] = (
        "support hand grips seated magazine frames 20-26; old magazine and "
        "hand travel together frames 27-34; silhouette-matched old/fresh "
        "identity swap at 34; visible fresh mag "
        "keeps rigid hand contact from 40 and follows a rifle-local insertion "
        "path into the receiver at 72; "
        "verified hold blend frames 72-88; hold baked frames 89-100"
    )


def dampen_shoot_recoil(rig: bpy.types.Object, hold_pose: dict[str, Matrix]) -> None:
    """Reduce the donor's whole-rig kick while preserving trigger mechanics.

    The authored AK bypasses the game's procedural viewmodel kick, so the
    visible recoil comes entirely from this action.  Blend only the structural
    controls toward the approved two-hand hold pose. Finger curl, trigger and
    bolt motion remain at full amplitude.
    """
    shoot = bpy.data.actions.get("Shoot")
    if shoot is None:
        raise RuntimeError("Expected Shoot action")

    def blend_pose_matrix(start: Matrix, end: Matrix, factor: float) -> Matrix:
        start_location, start_rotation, start_scale = start.decompose()
        end_location, end_rotation, end_scale = end.decompose()
        return Matrix.LocRotScale(
            start_location.lerp(end_location, factor),
            start_rotation.slerp(end_rotation, factor),
            start_scale.lerp(end_scale, factor),
        )

    def key_pose_bone(bone: bpy.types.PoseBone, frame: float) -> None:
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert(
                data_path="rotation_quaternion", frame=frame, group=bone.name
            )
        elif bone.rotation_mode == "AXIS_ANGLE":
            bone.keyframe_insert(
                data_path="rotation_axis_angle", frame=frame, group=bone.name
            )
        else:
            bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)

    rig.animation_data.action = shoot
    end = float(shoot.frame_range[1])
    frames: list[float] = [float(frame) for frame in range(int(math.floor(end)) + 1)]
    if not math.isclose(frames[-1], end):
        frames.append(end)

    for bone in rig.pose.bones:
        bone.matrix_basis = hold_pose[bone.name]
    bpy.context.view_layer.update()
    rifle = rig.pose.bones["Rifle_metarig"]
    installed = rig.pose.bones["Mag_metarig"]
    installed_on_rifle = rifle.matrix.inverted() @ installed.matrix

    rig.animation_data.action = shoot
    source: dict[float, dict[str, Matrix]] = {}
    for frame in frames:
        bpy.context.scene.frame_set(int(frame), subframe=frame % 1.0)
        bpy.context.view_layer.update()
        source[frame] = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}

    full_motion = {"Bolt_metarig", "Trigger_metarig", "Mag.001_metarig"}
    recoil_gain = 0.55
    for frame in frames:
        bpy.context.scene.frame_set(int(frame), subframe=frame % 1.0)
        for bone in rig.pose.bones:
            keep = (
                bone.name in full_motion
                or bone.name.startswith("f_")
                or bone.name.startswith("thumb.")
            )
            if keep:
                bone.matrix_basis = source[frame][bone.name]
            else:
                bone.matrix_basis = blend_pose_matrix(
                    hold_pose[bone.name], source[frame][bone.name], recoil_gain
                )
            key_pose_bone(bone, frame)
        bpy.context.view_layer.update()
        installed.matrix = rifle.matrix @ installed_on_rifle
        bpy.context.view_layer.update()
        key_pose_bone(installed, frame)
        # The spare magazine must stay collapsed in Shoot even though its rest
        # pose in hold_pose is full scale.
        spare = rig.pose.bones["Mag.001_metarig"]
        spare.scale = Vector((0.001, 0.001, 0.001))
        spare.keyframe_insert(data_path="scale", frame=frame, group=spare.name)
    shoot["recoil_gain"] = recoil_gain
    shoot["recoil_gate"] = (
        "structural motion damped; bolt/trigger/fingers preserved; installed "
        "magazine rigid on rifle with idle scale"
    )


def rebuild_reload_v24(rig: bpy.types.Object, hold_pose: dict[str, Matrix]) -> None:
    """Author a readable two-magazine reload with uninterrupted hand contact.

    The previous pilot performed an on-screen identity swap: the magazine just
    removed from the rifle became the replacement while still visible. It also
    derived the seated target against the rifle at the wrong animation frame,
    which made the rifle appear to move onto a magazine suspended in space.
    """
    reload_action = bpy.data.actions.get("Reload")
    idle_action = bpy.data.actions.get("Idle")
    if reload_action is None or idle_action is None:
        raise RuntimeError("Expected rebuilt Idle and donor Reload actions")

    empty_mag = rig.pose.bones["Mag_metarig"]
    fresh_mag = rig.pose.bones["Mag.001_metarig"]
    rifle = rig.pose.bones["Rifle_metarig"]
    support_chain = [
        rig.pose.bones["upper_arm.L_metarig"],
        rig.pose.bones["forearm.L_metarig"],
        rig.pose.bones["hand.L_metarig"],
    ]

    def is_descendant_of(bone: bpy.types.PoseBone, ancestor: bpy.types.PoseBone) -> bool:
        parent = bone.parent
        while parent is not None:
            if parent == ancestor:
                return True
            parent = parent.parent
        return False

    support_fingers = [
        bone for bone in rig.pose.bones if is_descendant_of(bone, support_chain[-1])
    ]

    def blend_matrix(start: Matrix, end: Matrix, factor: float) -> Matrix:
        start_location, start_rotation, start_scale = start.decompose()
        end_location, end_rotation, end_scale = end.decompose()
        return Matrix.LocRotScale(
            start_location.lerp(end_location, factor),
            start_rotation.slerp(end_rotation, factor),
            start_scale.lerp(end_scale, factor),
        )

    def without_scale(matrix: Matrix) -> Matrix:
        location, rotation, _scale = matrix.decompose()
        return Matrix.LocRotScale(location, rotation, Vector((1.0, 1.0, 1.0)))

    # Measure the installed socket and rifle in the SAME frame. This invariant
    # prevents the animated rifle from moving onto a world-space magazine.
    rig.animation_data.action = idle_action
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    seated_old = without_scale(empty_mag.matrix.copy())
    idle_rifle = without_scale(rifle.matrix.copy())
    old_rest = rig.data.bones["Mag_metarig"].matrix_local
    new_rest = rig.data.bones["Mag.001_metarig"].matrix_local
    registration = Matrix.Translation(REPLACEMENT_MAG_OFFSET)
    seated_fresh = seated_old @ old_rest.inverted() @ registration.inverted() @ new_rest
    seated_fresh_on_rifle = idle_rifle.inverted() @ seated_fresh

    # The replacement must not leak into any other action.
    for action_name in ("Idle", "Shoot", "Equip"):
        action = bpy.data.actions.get(action_name)
        if action is None:
            continue
        rig.animation_data.action = action
        start = int(math.floor(action.frame_range[0]))
        end = int(math.ceil(action.frame_range[1]))
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            fresh_mag.scale = Vector((0.001, 0.001, 0.001))
            fresh_mag.keyframe_insert(data_path="scale", frame=frame, group=fresh_mag.name)

    rig.animation_data.action = reload_action
    source_support = {}
    source_fingers = {}
    source_hand = {}
    source_empty = {}
    source_fresh = {}
    source_rifle = {}
    for frame in range(20, 45):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        source_support[frame] = {bone.name: bone.matrix.copy() for bone in support_chain}
        source_fingers[frame] = {
            bone.name: bone.matrix_basis.copy() for bone in support_fingers
        }
        source_hand[frame] = support_chain[-1].matrix.copy()
        source_empty[frame] = without_scale(empty_mag.matrix.copy())
        source_fresh[frame] = without_scale(fresh_mag.matrix.copy())
        source_rifle[frame] = without_scale(rifle.matrix.copy())

    def fresh_pose_as_old(fresh_matrix: Matrix) -> Matrix:
        return fresh_matrix @ new_rest.inverted() @ registration @ old_rest

    def old_pose_as_fresh(old_matrix: Matrix) -> Matrix:
        return old_matrix @ old_rest.inverted() @ registration.inverted() @ new_rest

    # Convert camera-space down into armature space. The old/fresh swap happens
    # only after the hand and magazine have both left the image.
    camera_location = Vector((0.21, 0.31, 4.48))
    camera_target = Vector((0.16, -1.35, 4.00))
    camera_rotation = (camera_target - camera_location).to_track_quat("-Z", "Y")
    screen_down_world = camera_rotation @ Vector((0.0, -1.0, 0.0))
    screen_down_armature = (
        rig.matrix_world.to_3x3().inverted() @ screen_down_world
    ).normalized()
    screen_right_world = camera_rotation @ Vector((1.0, 0.0, 0.0))
    screen_right_armature = (
        rig.matrix_world.to_3x3().inverted() @ screen_right_world
    ).normalized()

    removal_start = source_fresh[34]
    # The discarded magazine leaves completely below/right of frame.  The
    # replacement is picked up at a different, only partially hidden location
    # below/left.  Keeping these paths distinct makes the object identity read
    # correctly while ensuring the new magazine remains visible in the hand
    # for most of the insertion phase.
    discard_pose = (
        Matrix.Translation(screen_down_armature * 0.68 + screen_right_armature * 0.16)
        @ removal_start
    )
    pickup_pose = (
        Matrix.Translation(screen_down_armature * 0.16 - screen_right_armature * 0.06)
        @ removal_start
    )
    removal_chain_relation = {
        bone.name: removal_start.inverted() @ source_support[34][bone.name]
        for bone in support_chain
    }
    frozen_fingers = {
        bone.name: source_fingers[34][bone.name].copy() for bone in support_fingers
    }

    # Explicit visibility phases. No magazine ever scales while visible.
    for frame in range(0, 101):
        bpy.context.scene.frame_set(frame)
        empty_mag.scale = Vector((1.0, 1.0, 1.0)) if frame <= 43 else Vector((0.001, 0.001, 0.001))
        fresh_mag.scale = Vector((1.0, 1.0, 1.0)) if frame >= 44 else Vector((0.001, 0.001, 0.001))
        empty_mag.keyframe_insert(data_path="scale", frame=frame, group=empty_mag.name)
        fresh_mag.keyframe_insert(data_path="scale", frame=frame, group=fresh_mag.name)

    carried_hand_relation = source_fresh[26].inverted() @ source_hand[26]
    installed_as_fresh = old_pose_as_fresh(source_empty[24])
    seated_hand_contact = installed_as_fresh @ carried_hand_relation

    # Approach and wrap around the installed magazine before it moves.
    for frame in range(20, 25):
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = source_empty[frame]
        empty_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(empty_mag, frame)
        for bone in support_chain:
            bone.matrix = source_support[frame][bone.name]
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)
        if frame >= 22:
            t = (frame - 22) / 2.0
            eased = t * t * (3.0 - 2.0 * t)
            support_chain[-1].matrix = blend_matrix(source_hand[frame], seated_hand_contact, eased)
            bpy.context.view_layer.update()
            key_pose_bone(support_chain[-1], frame)
        for bone in support_fingers:
            bone.matrix_basis = source_fingers[26][bone.name] if frame >= 22 else source_fingers[frame][bone.name]
            key_pose_bone(bone, frame)

    # Remove the old magazine with hand contact intact.
    chain_from_hand_26 = {
        bone.name: source_hand[26].inverted() @ source_support[26][bone.name]
        for bone in support_chain
    }
    for frame in range(25, 35):
        t = min(1.0, (frame - 24) / 10.0)
        eased = t * t * (3.0 - 2.0 * t)
        magazine_path = blend_matrix(installed_as_fresh, removal_start, eased)
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = fresh_pose_as_old(magazine_path)
        empty_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(empty_mag, frame)
        hand_pose = magazine_path @ carried_hand_relation
        for bone in support_chain:
            bone.matrix = hand_pose @ chain_from_hand_26[bone.name]
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = frozen_fingers[bone.name]
            key_pose_bone(bone, frame)

    # Carry the removed magazine completely below the viewport and swap it for
    # a distinct replacement at the hidden transform.
    for frame in range(35, 45):
        t = (frame - 34) / 10.0
        eased = t * t * (3.0 - 2.0 * t)
        magazine_path = blend_matrix(removal_start, discard_pose, eased)
        bpy.context.scene.frame_set(frame)
        empty_mag.matrix = fresh_pose_as_old(magazine_path)
        empty_mag.scale = Vector((1.0, 1.0, 1.0)) if frame <= 43 else Vector((0.001, 0.001, 0.001))
        key_pose_bone(empty_mag, frame)
        # At the hidden identity swap, put the new magazine on its own pickup
        # path instead of inheriting the discarded magazine's off-screen pose.
        fresh_path = pickup_pose if frame == 44 else magazine_path
        fresh_mag.matrix = fresh_path
        fresh_mag.scale = Vector((1.0, 1.0, 1.0)) if frame >= 44 else Vector((0.001, 0.001, 0.001))
        key_pose_bone(fresh_mag, frame)
        chain_path = fresh_path if frame == 44 else magazine_path
        for bone in support_chain:
            bone.matrix = chain_path @ removal_chain_relation[bone.name]
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = frozen_fingers[bone.name]
            key_pose_bone(bone, frame)

    bpy.context.scene.frame_set(44)
    bpy.context.view_layer.update()
    retrieval_rifle_local = source_rifle[44].inverted() @ pickup_pose
    chain_on_fresh = {
        bone.name: pickup_pose.inverted() @ bone.matrix.copy()
        for bone in support_chain
    }

    # Carry the visible replacement continuously to the rifle-local socket.
    for frame in range(44, 73):
        t = (frame - 44) / 28.0
        eased = t * t * (3.0 - 2.0 * t)
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        current_rifle = without_scale(rifle.matrix.copy())
        local_pose = blend_matrix(retrieval_rifle_local, seated_fresh_on_rifle, eased)
        fresh_pose = current_rifle @ local_pose
        fresh_mag.matrix = fresh_pose
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(fresh_mag, frame)
        for bone in support_chain:
            bone.matrix = fresh_pose @ chain_on_fresh[bone.name]
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)
        for bone in support_fingers:
            bone.matrix_basis = frozen_fingers[bone.name]
            key_pose_bone(bone, frame)

    # Hold the seated replacement before allowing the hand to return.
    bpy.context.scene.frame_set(72)
    bpy.context.view_layer.update()
    seated_contact_basis = {
        bone.name: bone.matrix_basis.copy()
        for bone in rig.pose.bones
        if bone.name not in {"Mag_metarig", "Mag.001_metarig"}
    }
    for frame in range(72, 77):
        bpy.context.scene.frame_set(frame)
        current_rifle = without_scale(rifle.matrix.copy())
        fresh_mag.matrix = current_rifle @ seated_fresh_on_rifle
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(fresh_mag, frame)
        for bone in support_chain:
            bone.matrix = fresh_mag.matrix @ chain_on_fresh[bone.name]
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)
    for frame in range(77, 95):
        t = (frame - 76) / 18.0
        eased = t * t * (3.0 - 2.0 * t)
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            if bone.name in {"Mag_metarig", "Mag.001_metarig"}:
                continue
            bone.matrix_basis = blend_matrix(seated_contact_basis[bone.name], hold_pose[bone.name], eased)
            key_pose_bone(bone, frame)
    for frame in range(95, 101):
        bpy.context.scene.frame_set(frame)
        for bone in rig.pose.bones:
            if bone.name in {"Mag_metarig", "Mag.001_metarig"}:
                continue
            bone.matrix_basis = hold_pose[bone.name]
            key_pose_bone(bone, frame)

    # Keep the replacement seated relative to the animated rifle until the
    # action hands control back to Idle.
    for frame in range(72, 101):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        fresh_mag.matrix = without_scale(rifle.matrix.copy()) @ seated_fresh_on_rifle
        fresh_mag.scale = Vector((1.0, 1.0, 1.0))
        key_pose_bone(fresh_mag, frame)
        empty_mag.scale = Vector((0.001, 0.001, 0.001))
        empty_mag.keyframe_insert(data_path="scale", frame=frame, group=empty_mag.name)

    if hasattr(reload_action, "slots") and reload_action.slots:
        reload_curves = []
        for slot in reload_action.slots:
            channelbag = reload_action.layers[0].strips[0].channelbag(slot)
            if channelbag is not None:
                reload_curves.extend(channelbag.fcurves)
    else:
        reload_curves = list(reload_action.fcurves)
    for curve in reload_curves:
        for index in range(len(curve.keyframe_points) - 1, -1, -1):
            if curve.keyframe_points[index].co.x > 100.0:
                curve.keyframe_points.remove(curve.keyframe_points[index], fast=True)
        curve.update()
    reload_action["closure_fix"] = (
        "v24 old magazine removed below frame; distinct replacement acquired "
        "offscreen at 44; hand and replacement rigid through rifle-local seat "
        "at 72; support hand returns only after seated hold through 76"
    )


def add_reload_bolt_cycle(rig: bpy.types.Object, hold_pose: dict[str, Matrix]) -> None:
    """Give the project charging handle a visible pull/release during reload."""
    shoot = bpy.data.actions.get("Shoot")
    reload_action = bpy.data.actions.get("Reload")
    if shoot is None or reload_action is None:
        raise RuntimeError("Expected Shoot and Reload actions")

    rig.animation_data.action = shoot
    bpy.context.scene.frame_set(5)
    bpy.context.view_layer.update()
    pulled = rig.pose.bones["Bolt_metarig"].matrix_basis.copy()

    rig.animation_data.action = reload_action
    bolt = rig.pose.bones["Bolt_metarig"]
    for frame, pose in (
        (0, hold_pose["Bolt_metarig"]),
        (60, hold_pose["Bolt_metarig"]),
        (68, pulled),
        (76, hold_pose["Bolt_metarig"]),
        (92, hold_pose["Bolt_metarig"]),
        (100, hold_pose["Bolt_metarig"]),
    ):
        bpy.context.scene.frame_set(frame)
        bolt.matrix_basis = pose
        bolt.keyframe_insert(data_path="location", frame=frame, group=bolt.name)
        if bolt.rotation_mode == "QUATERNION":
            bolt.keyframe_insert(
                data_path="rotation_quaternion", frame=frame, group=bolt.name
            )
        elif bolt.rotation_mode == "AXIS_ANGLE":
            bolt.keyframe_insert(data_path="rotation_axis_angle", frame=frame, group=bolt.name)
        else:
            bolt.keyframe_insert(data_path="rotation_euler", frame=frame, group=bolt.name)
        bolt.keyframe_insert(data_path="scale", frame=frame, group=bolt.name)
    reload_action["bolt_cycle"] = "closed 60, pulled 68, released 76"


def lock_strong_hand_to_project_grip(rig: bpy.types.Object) -> None:
    """Register the firing hand to this AK's pistol grip and trigger.

    The CC0 donor's AK-12 grip is farther back than the project's wooden AK
    grip.  Reusing the donor hand transform therefore leaves only fingertips
    visible beside the stock.  Measure the correction once from the accepted
    hold pose, express it in rifle-local space, then bake that contact through
    every action.  The donor finger pose cannot be preserved: its trigger
    belongs to a different rifle and leaves the index visibly floating below
    our guard.  After registering the palm, solve the three index phalanges
    against the animated Trigger anchor and bake that contact into every
    action.
    """
    idle = bpy.data.actions.get("Idle")
    if idle is None:
        raise RuntimeError("Expected Idle action before strong-hand registration")

    hand = rig.pose.bones["hand.R_metarig"]
    rifle = rig.pose.bones["Rifle_metarig"]
    trigger = rig.pose.bones["Trigger_metarig"]
    finger_chains = {}
    for finger in ("index", "middle", "ring", "pinky", "thumb"):
        prefix = "thumb" if finger == "thumb" else f"f_{finger}"
        finger_chains[finger] = [
            rig.pose.bones[f"{prefix}.01.R_metarig"],
            rig.pose.bones[f"{prefix}.02.R_metarig"],
            rig.pose.bones[f"{prefix}.03.R_metarig"],
        ]
    rig.animation_data.action = idle
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()

    # Blender diagnostic contact render: down the donor armature's Z axis
    # brings the palm around the wooden pistol grip; a small X correction puts
    # the index finger beside the trigger instead of behind the receiver.
    # Seat the firing hand on the project AK's wooden pistol grip.  The donor
    # AK-12 grip is higher/forward, so its original hand pose floated under the
    # receiver instead of wrapping our grip and trigger.
    # The AKM wooden grip occupies rifle-local z[-0.121,-0.029].  The former
    # -0.070 Z correction put the palm root at z=-0.137, entirely below that
    # measured envelope.  Keep the lateral/rear registration, but raise the
    # whole firing hand so the four knuckles span the actual grip height.
    corrected = Matrix.Translation(Vector((0.065, 0.040, 0.000))) @ hand.matrix
    hand_on_rifle = rifle.matrix.inverted() @ corrected
    # O alcance anatômico do indicador saturou a 10,1 mm do gatilho mesmo com
    # o alvo FABRIK já além da peça. Registrar a mão forte 1 cm no espaço local
    # da arma fecha essa distância preservando a mesma rotação e o envolvimento
    # dos outros quatro dedos no punho de madeira.
    hand_on_rifle = Matrix.Translation(Vector((-0.0014, 0.0076, 0.0065))) @ hand_on_rifle
    minimum_trigger_contact = math.inf

    def solve_finger_chain(
        chain: list[bpy.types.PoseBone],
        target_local: Vector,
        guide_1_local: Vector,
        guide_2_local: Vector,
        frame: int,
    ) -> None:
        """Bake one three-phalange contact in rifle-local coordinates.

        Explicit knuckle guides are important here.  A fingertip-only solve can
        reach the grip while leaving the phalanges as a flat shelf underneath
        it, which was the exact browser-visible defect on the AKM.
        """
        root = chain[0].head.copy()
        target = rifle.matrix @ target_local
        points = [
            root,
            rifle.matrix @ guide_1_local,
            rifle.matrix @ guide_2_local,
            target,
        ]
        lengths = [bone.length for bone in chain]
        for _ in range(16):
            points[3] = target
            for index in range(2, -1, -1):
                direction = points[index] - points[index + 1]
                if direction.length > 1e-8:
                    points[index] = (
                        points[index + 1]
                        + direction.normalized() * lengths[index]
                    )
            points[0] = root
            for index in range(3):
                direction = points[index + 1] - points[index]
                if direction.length > 1e-8:
                    points[index + 1] = (
                        points[index]
                        + direction.normalized() * lengths[index]
                    )

        for index, bone in enumerate(chain):
            current_direction = (bone.tail - bone.head).normalized()
            desired_direction = (points[index + 1] - points[index]).normalized()
            rotation = current_direction.rotation_difference(desired_direction)
            pivot = bone.head.copy()
            bone.matrix = (
                Matrix.Translation(pivot)
                @ rotation.to_matrix().to_4x4()
                @ Matrix.Translation(-pivot)
                @ bone.matrix
            )
            bpy.context.view_layer.update()
            key_pose_bone(bone, frame)

    for action_name in ("Idle", "Shoot", "Reload", "Equip"):
        action = bpy.data.actions.get(action_name)
        if action is None:
            continue
        rig.animation_data.action = action
        start = int(math.floor(action.frame_range[0]))
        end = int(math.ceil(action.frame_range[1]))
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            hand.matrix = rifle.matrix @ hand_on_rifle
            bpy.context.view_layer.update()
            key_pose_bone(hand, frame)

            # Put the fingertip on the project trigger, not merely beside it.
            # Work in rifle-local space so the contact survives recoil and the
            # AK/AKM geometry variants. A short FABRIK solve gives the finger
            # an upward hook through the guard instead of the donor's downward
            # floating pose.
            rifle_inv = rifle.matrix.inverted()
            trigger_local = rifle_inv @ trigger.head
            trigger_press = 0.0
            if action_name == "Shoot" and end > start:
                phase = (frame - start) / (end - start)
                # Squeeze quickly, then return before the clip loops.
                trigger_press = math.sin(math.pi * phase) ** 2
            index_target = (
                trigger_local
                # The former five-millimetre target delta produced only about
                # 1.3 mm at the skinned fingertip after the parent-chain solve,
                # visually indistinguishable in the browser.  Use a measured
                # full squeeze so the fingertip crosses the trigger face and
                # returns while the palm remains rigid on the wooden grip.
                + Vector(
                    (
                        # Após a primeira correção, a ponta exportada ainda foi
                        # medida 3,2 mm à direita, 7,3 mm atrás e 6,2 mm abaixo
                        # do gatilho. Compensar o alvo nos três eixos fecha o
                        # contato sem deslocar a palma já aprovada no punho.
                        -0.012 * trigger_press,
                        0.016 + 0.010 * trigger_press,
                        0.006 + 0.020 * trigger_press,
                    )
                )
            )
            solve_finger_chain(
                finger_chains["index"],
                index_target,
                index_target + Vector((0.025, -0.010, -0.008)),
                index_target + Vector((0.012, 0.004, 0.022)),
                frame,
            )
            if action_name == "Shoot":
                bpy.context.view_layer.update()
                fingertip_local = rifle_inv @ finger_chains["index"][-1].tail
                minimum_trigger_contact = min(
                    minimum_trigger_contact,
                    (fingertip_local - trigger_local).length,
                )

            # Wrap the remaining fingers around the rear half of the wooden
            # pistol grip.  The targets sit just beyond the far face while the
            # guides remain on the near face, producing a visible curved grip
            # instead of the donor's open/platform pose.
            wrap_contacts = {
                "middle": (
                    Vector((-0.020, -0.055, -0.055)),
                    Vector((0.038, -0.020, -0.050)),
                    Vector((0.010, -0.050, -0.048)),
                ),
                "ring": (
                    Vector((-0.018, -0.050, -0.082)),
                    Vector((0.038, -0.018, -0.079)),
                    Vector((0.010, -0.047, -0.077)),
                ),
                "pinky": (
                    Vector((-0.015, -0.042, -0.108)),
                    Vector((0.034, -0.014, -0.104)),
                    Vector((0.008, -0.040, -0.100)),
                ),
                "thumb": (
                    Vector((-0.018, -0.040, -0.040)),
                    Vector((0.018, -0.068, -0.035)),
                    Vector((-0.006, -0.052, -0.038)),
                ),
            }
            for finger, (target_local, guide_1_local, guide_2_local) in wrap_contacts.items():
                solve_finger_chain(
                    finger_chains[finger],
                    target_local,
                    guide_1_local,
                    guide_2_local,
                    frame,
                )
        action["strong_hand_contact"] = (
            "hand.R rigid on project wooden grip; all five three-bone finger "
            "chains wrapped around grip; Shoot index squeeze baked to Trigger"
        )
    if not math.isfinite(minimum_trigger_contact):
        raise RuntimeError("Strong-hand trigger contact was not measured")
    rig["strong_hand_trigger_contact_m"] = float(minimum_trigger_contact)
    rig["strong_hand_trigger_contact_limit_m"] = 0.0045


def setup_camera_and_lights() -> None:
    scene = bpy.context.scene
    data = bpy.data.cameras.new("AK_Hires_FP_Camera")
    camera = bpy.data.objects.new("AK_Hires_FP_Camera", data)
    bpy.context.collection.objects.link(camera)
    # Move the eye inside the open shoulder ends, as a true FPS camera does,
    # so only forearms/hands enter the frame and no hollow sleeve caps appear.
    # Orbit toward the weapon's rear axis. The previous x=1.00 viewpoint saw
    # the AK almost perfectly side-on. x=0.62 keeps the CS-like lower-right
    # composition while exposing receiver/top-cover depth and foreshortening.
    camera.location = (0.21, 0.31, 4.48)
    # Aim slightly above/left of the subject so the viewmodel occupies the
    # lower-right quadrant instead of covering the crosshair region.
    target = Vector((0.16, -1.35, 4.00))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(58.0)
    # Camera.shift_x is not serialized by glTF. Keeping it here made Blender
    # look correct while the wooden stock returned in the browser. Browser-safe
    # framing is applied to the complete rig after the exported camera inverse.
    data.shift_x = 0.0
    data.clip_start = 0.03
    data.clip_end = 50.0
    # Contrato consumido pelo navegador. A câmera faz parte do viewmodel; ela não pode
    # ser reconstruída depois com números copiados, pois qualquer diferença de aspect
    # ratio muda a perspectiva e destrói o encaixe mão/arma.
    camera["coro_viewmodel_camera"] = True
    camera["vertical_fov_deg"] = 58.0
    camera["reference_aspect"] = "3:2"
    scene.camera = camera

    key_data = bpy.data.lights.new("AK_Hires_Key", "AREA")
    key_data.energy = 420.0
    key_data.shape = "DISK"
    key_data.size = 2.0
    key = bpy.data.objects.new("AK_Hires_Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-2.5, -1.0, 6.0)

    fill_data = bpy.data.lights.new("AK_Hires_Fill", "AREA")
    fill_data.energy = 250.0
    fill_data.color = (0.40, 0.66, 0.92)
    fill_data.size = 2.0
    fill = bpy.data.objects.new("AK_Hires_Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (2.0, -0.5, 4.5)

    rim_data = bpy.data.lights.new("AK_Hires_Rim", "AREA")
    rim_data.energy = 350.0
    rim_data.color = (0.95, 0.28, 0.08)
    rim_data.size = 1.5
    rim = bpy.data.objects.new("AK_Hires_Rim", rim_data)
    bpy.context.collection.objects.link(rim)
    rim.location = (-1.5, -2.5, 4.5)


def render_action(rig: bpy.types.Object, action_name: str, frames: list[int], prefix: str) -> None:
    action = bpy.data.actions.get(action_name)
    if action is None:
        raise RuntimeError(f"Missing donor action {action_name}")
    rig.animation_data_create()
    rig.animation_data.action = action
    scene = bpy.context.scene
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(RENDERS / f"{prefix}_{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


def export(rig: bpy.types.Object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    camera = bpy.context.scene.camera
    if camera is None:
        raise RuntimeError("AK pilot requires an exported first-person camera")
    camera.select_set(True)
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
    OUT.mkdir(parents=True, exist_ok=True)
    RENDERS.mkdir(parents=True, exist_ok=True)
    setup_scene()
    rig = load_anatomy_rig()
    hold_pose = rebuild_idle_from_valid_contact_pose(rig)
    rebuild_reload_v24(rig, hold_pose)
    dampen_shoot_recoil(rig, hold_pose)
    add_reload_bolt_cycle(rig, hold_pose)
    lock_strong_hand_to_project_grip(rig)
    fit_project_ak(rig)
    setup_camera_and_lights()
    render_action(rig, "Idle", [0, 50, 100], "idle")
    render_action(rig, "Shoot", [0, 5, 10], "fire")
    render_action(
        rig,
        "Reload",
        [
            0,
            8,
            14,
            20,
            22,
            24,
            26,
            28,
            30,
            32,
            34,
            36,
            38,
            40,
            44,
            48,
            52,
            54,
            56,
            60,
            64,
            68,
            72,
            74,
            76,
            80,
            86,
            92,
            100,
        ],
        "reload",
    )
    export(rig)
    print(f"AK_HIRES_PILOT blend={BLEND} glb={GLB} renders={RENDERS}")


if __name__ == "__main__":
    main()
