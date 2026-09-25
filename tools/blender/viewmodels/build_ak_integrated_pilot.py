"""Build the AK-only first-person pilot from the project gun and a CC0 hand rig.

The GoldSrc asset is used only as an anatomical/animation donor.  Its weapon
mesh and all donor textures are removed before the project AK is fitted to the
same rest-space anchors.  The result is an integrated Blender scene in which
hands, weapon, magazine and charging handle share one animated rig.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = ROOT / "public" / "models" / "viewmodels" / "goldsrc" / "ak47.glb"
PROJECT_AK = ROOT / "public" / "models" / "weapons" / "ak.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot-v2"
BLEND = OUT / "ak-integrated-pilot.blend"
GLB = OUT / "ak-integrated-pilot.glb"
RENDERS = OUT / "renders"


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
    scene.render.film_transparent = False
    scene.render.fps = 30
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = bpy.data.worlds.new("Coro_Solto_Viewmodel_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.075, 0.095, 0.115, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.92
    scene.world = world


def material(name: str, color: tuple[float, float, float, float], roughness: float,
             metallic: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Specular IOR Level"].default_value = 0.22
    return mat


def tattoo_skin_material() -> bpy.types.Material:
    """Original Mandrake-style brown skin with a restrained dark tattoo field."""
    mat = bpy.data.materials.new("CoroSolto_Mandrake_Tattooed_Skin")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.60
    bsdf.inputs["Specular IOR Level"].default_value = 0.25

    tex = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    wave = nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.rings_direction = "Z"
    wave.inputs["Scale"].default_value = 2.6
    wave.inputs["Distortion"].default_value = 7.0
    wave.inputs["Detail"].default_value = 4.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.38
    ramp.color_ramp.elements[0].color = (0.018, 0.008, 0.006, 1.0)
    ramp.color_ramp.elements[1].position = 0.58
    ramp.color_ramp.elements[1].color = (0.32, 0.085, 0.035, 1.0)
    links.new(tex.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    links.new(wave.outputs["Color"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def replace_donor_materials(hand: bpy.types.Object) -> None:
    glove = bpy.data.materials.get("CoroSolto_Glove") or material(
        "CoroSolto_Glove", (0.020, 0.032, 0.044, 1.0), 0.72
    )
    finger = bpy.data.materials.get("CoroSolto_Finger_Skin") or material(
        "CoroSolto_Finger_Skin", (0.28, 0.075, 0.033, 1.0), 0.62
    )
    skin = bpy.data.materials.get("CoroSolto_Mandrake_Tattooed_Skin") or tattoo_skin_material()
    # Donor order is glove / forearm skin / exposed finger skin.
    hand.data.materials.clear()
    hand.data.materials.append(glove)
    hand.data.materials.append(skin)
    hand.data.materials.append(finger)
    hand.name = hand.name.replace("hand", "_hand") + "_coro_solto"
    for polygon in hand.data.polygons:
        polygon.use_smooth = True
    bevel = hand.modifiers.new("CoroSolto_hand_edge_softening", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 2


def load_rig_and_hands() -> tuple[bpy.types.Object, bpy.types.Object]:
    imported = import_glb(DONOR)
    armature = next(obj for obj in imported if obj.type == "ARMATURE")
    donor_weapon = next(obj for obj in imported if obj.name.startswith("f_ak47"))
    hands = [obj for obj in imported if obj.type == "MESH" and "hand" in obj.name]
    if len(hands) != 2:
        raise RuntimeError(f"Expected two donor hands, found {[obj.name for obj in hands]}")
    for hand in hands:
        replace_donor_materials(hand)
    for obj in list(imported):
        if obj is donor_weapon or obj.name == "Icosphere":
            bpy.data.objects.remove(obj, do_unlink=True)
    armature.name = "coro_solto_fp_rig"
    armature["geometry_origin"] = "project-ak-only"
    armature["anatomy_origin"] = "cc0-topology-reskinned"
    armature["reference_policy"] = "no-donor-weapon-or-texture"
    return armature, donor_weapon


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
    magazine.name = "coro_solto_ak_magazine"
    return magazine


def fitted_project_ak(armature: bpy.types.Object) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    imported = import_glb(PROJECT_AK)
    weapon = next(obj for obj in imported if obj.type == "MESH")
    weapon.name = "coro_solto_project_ak"
    for obj in imported:
        if obj is not weapon and obj.type == "EMPTY":
            bpy.data.objects.remove(obj, do_unlink=True)
    magazine = split_magazine(weapon)

    # Project AK: +X muzzle.  CC0 rest rig: -Y muzzle.  Fit the project model
    # to the measured donor rest-space envelope without copying donor geometry.
    donor_center = Vector((2.7776, -21.2186, 2.54755))
    fit = (
        Matrix.Translation(donor_center)
        @ Matrix.Rotation(math.radians(-90.0), 4, "Z")
        @ Matrix.Diagonal(Vector((29.17, 16.82, 29.03, 1.0)))
    )
    for obj in (weapon, magazine):
        obj.data.transform(fit)
        obj.matrix_world = Matrix.Identity(4)

    # The donor action carries these bones through reload.  Body and magazine
    # now deform with the exact same anchors as the animated hands.
    bind_to_bone(weapon, armature, "Bone_AK47")
    bind_to_bone(magazine, armature, "Bone50")

    # A compact original charging handle follows the donor bolt anchor; no
    # weapon geometry from the reference remains in the file.
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.115, depth=0.62,
                                        location=(2.25, -21.20, 5.75),
                                        rotation=(math.radians(90), 0.0, 0.0))
    bolt = bpy.context.object
    bolt.name = "coro_solto_ak_charging_handle"
    bolt.data.materials.append(material("CoroSolto_AK_Bolt", (0.018, 0.022, 0.026, 1.0), 0.36, 0.72))
    bind_to_bone(bolt, armature, "Bone52")
    return weapon, magazine, bolt


def bind_to_bone(obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str) -> None:
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.parent = armature
    obj.matrix_parent_inverse = Matrix.Identity(4)
    modifier = obj.modifiers.new("CoroSolto_FP_Rig", "ARMATURE")
    modifier.object = armature
    modifier.use_deform_preserve_volume = False


def setup_camera_and_lights() -> None:
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("AK_FP_Camera")
    camera = bpy.data.objects.new("AK_FP_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    # Measured evaluated envelope at idle:
    # x [-1.0, 9.4], y [-27.8, 3.4], z [-11.3, -2.5].  Recede past the sleeve
    # roots and centre the view on the grip rather than the global origin.
    # The source viewmodel is authored around a player eye at world origin:
    # weapon x≈6 (right side), z<0 (below eye) and muzzle along -Y.
    # Centring the camera on the mesh bbox looked straight down the barrel and
    # destroyed the characteristic FPS three-quarter silhouette.
    camera.location = (0.0, 4.5, 0.0)
    # Track the authored -Y weapon axis while keeping Blender +Z as screen-up.
    # The former fixed Euler rotation inverted screen-up, placing the sleeves
    # above the gun and making an otherwise valid first-person rig look broken.
    target = Vector((0.0, -20.0, 0.0))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.sensor_fit = "VERTICAL"
    camera_data.angle_y = math.radians(62.0)
    camera_data.clip_start = 0.05
    camera_data.clip_end = 100.0
    scene.camera = camera

    key_data = bpy.data.lights.new("AK_Key", "AREA")
    key_data.energy = 650.0
    key_data.shape = "DISK"
    key_data.size = 6.0
    key = bpy.data.objects.new("AK_Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-6.0, -8.0, 9.0)
    key.rotation_euler = (math.radians(55), 0.0, math.radians(-35))

    fill_data = bpy.data.lights.new("AK_Fill", "AREA")
    fill_data.energy = 380.0
    fill_data.color = (0.45, 0.70, 0.88)
    fill_data.size = 5.0
    fill = bpy.data.objects.new("AK_Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (7.0, -13.0, 1.0)
    fill.rotation_euler = (math.radians(80), 0.0, math.radians(150))

    rim_data = bpy.data.lights.new("AK_Rim", "AREA")
    rim_data.energy = 450.0
    rim_data.color = (0.85, 0.25, 0.12)
    rim_data.size = 3.0
    rim = bpy.data.objects.new("AK_Rim", rim_data)
    bpy.context.collection.objects.link(rim)
    rim.location = (-5.0, -24.0, 6.0)
    rim.rotation_euler = (math.radians(110), 0.0, math.radians(-10))

    sun_data = bpy.data.lights.new("AK_Sun", "SUN")
    sun_data.energy = 2.2
    sun_data.angle = math.radians(18.0)
    sun = bpy.data.objects.new("AK_Sun", sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(-28))


def isolate_action(armature: bpy.types.Object, name: str) -> bpy.types.Action:
    animation = armature.animation_data
    if animation is None:
        raise RuntimeError("Imported rig has no animation data")
    for track in animation.nla_tracks:
        track.mute = True
    action = bpy.data.actions.get(name)
    if action is None:
        raise RuntimeError(f"Missing action {name}; got {[a.name for a in bpy.data.actions]}")
    animation.action = action
    return action


def render_samples(armature: bpy.types.Object) -> None:
    samples = {
        "idle": ("idle1", [0, 18, 36]),
        "fire": ("idle1-shoot1", [0, 4, 9, 16]),
        "reload": ("idle1-reload", [0, 8, 16, 24, 32, 40, 50, 58]),
    }
    RENDERS.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    for label, (action_name, frames) in samples.items():
        isolate_action(armature, action_name)
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(RENDERS / f"{label}_{frame:03d}.png")
            bpy.ops.render.render(write_still=True)


def save_and_export(armature: bpy.types.Object) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"ARMATURE", "MESH"} and obj.name not in {"AK_FP_Camera"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_skins=True,
        export_def_bones=True,
        export_morph=False,
        export_apply=False,
    )


def main() -> None:
    setup_scene()
    armature, _ = load_rig_and_hands()
    fitted_project_ak(armature)
    setup_camera_and_lights()
    render_samples(armature)
    isolate_action(armature, "idle1")
    bpy.context.scene.frame_set(0)
    save_and_export(armature)
    print(f"AK_INTEGRATED_PILOT blend={BLEND} glb={GLB} renders={RENDERS}")


if __name__ == "__main__":
    main()
