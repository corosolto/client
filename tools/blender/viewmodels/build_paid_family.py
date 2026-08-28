"""Build a self-contained first-person GLB from the licensed KINEMATION pack.

Run with Blender, for example:
  blender -b --python tools/blender/viewmodels/build_paid_family.py -- --family ak

Licensed inputs and generated binaries remain outside the public repository.  The
result keeps the authored arms, weapon rig and animation tracks together so the
browser only has to play named clips.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import re
import sys

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = REPO_ROOT / "tools/viewmodels/paid-pack-manifest.json"
DEFAULT_EXTRACTED = Path("/Users/ruben/csbrasil-private-assets/generated/extracted")


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--family", required=True)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    parser.add_argument("--output", type=Path)
    return parser.parse_args(values)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(path: Path) -> list[bpy.types.Object]:
    if not path.is_file():
        raise RuntimeError(f"missing FBX: {path}")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, use_image_search=True)
    return [obj for obj in bpy.data.objects if obj not in before]


def imported_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    rigs = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"expected one imported armature, found {[obj.name for obj in rigs]}")
    return rigs[0]


def remove_objects(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        if obj and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def add_nla_action(target: bpy.types.Object, action: bpy.types.Action, clip: str) -> None:
    animation = target.animation_data_create()
    track = animation.nla_tracks.new()
    track.name = clip
    start = int(math.floor(action.frame_range[0]))
    strip = track.strips.new(clip, start, action)
    strip.action_frame_start = action.frame_range[0]
    strip.action_frame_end = action.frame_range[1]
    track.mute = False


def transfer_fbx_action(path: Path, target: bpy.types.Object, clip: str) -> dict:
    imported = import_fbx(path)
    source = imported_armature(imported)
    action = source.animation_data.action if source.animation_data else None
    if action is None:
        remove_objects(imported)
        raise RuntimeError(f"no action in {path}")
    source_bones = {bone.name for bone in source.data.bones}
    target_bones = {bone.name for bone in target.data.bones}
    missing = sorted(source_bones - target_bones)
    if missing:
        remove_objects(imported)
        raise RuntimeError(f"{path.name} has bones absent from target: {missing}")
    action.name = f"{target.name}_{clip}"
    add_nla_action(target, action, clip)
    result = {
        "source": path.name,
        "frames": [float(action.frame_range[0]), float(action.frame_range[1])],
        "seconds": float((action.frame_range[1] - action.frame_range[0]) / 24.0),
        "bones": len(source_bones),
    }
    remove_objects(imported)
    return result


def set_principled_input(shader: bpy.types.Node, name: str, value) -> None:
    socket = shader.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def texture_node(nodes, path: Path, *, non_color: bool = False):
    image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = "Non-Color"
    node = nodes.new("ShaderNodeTexImage")
    node.image = image
    return node


def rebuild_textured_material(material, base: Path, normal: Path, orm: Path, tint) -> None:
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (360, 0)
    output.location = (620, 0)
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    set_principled_input(shader, "Base Color", (*tint, 1.0))
    set_principled_input(shader, "Roughness", 0.55)

    color = texture_node(nodes, base)
    color.location = (-620, 180)
    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 1.0
    mix.inputs[2].default_value = (*tint, 1.0)
    mix.location = (-120, 180)
    links.new(color.outputs["Color"], mix.inputs[1])
    links.new(mix.outputs["Color"], shader.inputs["Base Color"])

    normal_tex = texture_node(nodes, normal, non_color=True)
    normal_tex.location = (-620, -100)
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.location = (-120, -100)
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])

    orm_tex = texture_node(nodes, orm, non_color=True)
    orm_tex.location = (-620, -360)
    split = nodes.new("ShaderNodeSeparateColor")
    split.location = (-340, -360)
    links.new(orm_tex.outputs["Color"], split.inputs["Color"])
    links.new(split.outputs["Green"], shader.inputs["Roughness"])
    links.new(split.outputs["Blue"], shader.inputs["Metallic"])


def setup_arm_materials(arms: list[bpy.types.Object], character_root: Path) -> None:
    textures = character_root / "Textures"
    recipes = {
        "cloth": ("T_Cloth01_B.png", "T_Cloth01_N.png", "T_Cloth01_ORM.png", (0.16, 0.21, 0.28)),
        "glove": ("T_Glove01_B.png", "T_Glove01_N.png", "T_Glove01_ORM.png", (0.12, 0.15, 0.19)),
        "hand": ("T_Arm01_B.png", "T_Arm01_N.png", "T_Arm01_ORM.png", (0.78, 0.58, 0.43)),
    }
    for obj in arms:
        if obj.type != "MESH":
            continue
        key = next((name for name in recipes if name in obj.name.lower()), None)
        if key is None:
            continue
        base, normal, orm, tint = recipes[key]
        for material in obj.data.materials:
            if material:
                material.name = f"CoroSolto_FP_{key.title()}"
                rebuild_textured_material(material, textures / base, textures / normal, textures / orm, tint)


def unity_material_values(path: Path) -> tuple[tuple[float, float, float, float], float, float]:
    text = path.read_text(encoding="utf-8", errors="replace")
    color_match = re.search(
        r"- _BaseColor: \{r: ([\d.eE+-]+), g: ([\d.eE+-]+), b: ([\d.eE+-]+), a: ([\d.eE+-]+)\}",
        text,
    )
    metallic_match = re.search(r"- _Metallic: ([\d.eE+-]+)", text)
    smooth_match = re.search(r"- _Smoothness: ([\d.eE+-]+)", text)
    color = tuple(float(value) for value in color_match.groups()) if color_match else (0.18, 0.18, 0.18, 1.0)
    metallic = float(metallic_match.group(1)) if metallic_match else 0.0
    smoothness = float(smooth_match.group(1)) if smooth_match else 0.45
    return color, metallic, smoothness


def setup_weapon_materials(objects: list[bpy.types.Object], material_root: Path) -> None:
    material_files = {path.stem.lower(): path for path in material_root.glob("*.mat")}
    for obj in objects:
        if obj.type != "MESH":
            continue
        for material in obj.data.materials:
            if not material:
                continue
            source = material_files.get(material.name.lower())
            color, metallic, smoothness = unity_material_values(source) if source else ((0.12, 0.13, 0.14, 1.0), 0.55, 0.55)
            material.use_nodes = True
            shader = material.node_tree.nodes.get("Principled BSDF")
            if shader:
                set_principled_input(shader, "Base Color", color)
                set_principled_input(shader, "Metallic", metallic)
                set_principled_input(shader, "Roughness", 1.0 - smoothness)
                set_principled_input(shader, "Coat Weight", 0.12 if metallic > 0.2 else 0.04)
            material.name = f"CoroSolto_{material.name}"


def clip_name(path: Path) -> str | None:
    name = path.stem.lower().replace("-", "_")
    if "reload_tac" in name or "reloadtac" in name:
        return "reload_tactical"
    if "reload_empty" in name or "reloadempty" in name or "empty_reload" in name:
        return "reload_empty"
    if "reload_start" in name:
        return "reload_start"
    if "reload_loop" in name:
        return "reload_loop"
    if "reload_end" in name:
        return "reload_end"
    if "pump_empty" in name:
        return "pump_empty"
    if "pump" in name:
        return "pump"
    if "fire" in name or "firing" in name:
        return "shoot"
    if "pose" in name or "idle" in name or "inspect" in name or "bullets" in name:
        return "idle"
    return None


def discover_actions(folder: Path, preferred_idle: str) -> dict[str, Path]:
    result: dict[str, Path] = {}
    preferred = folder / preferred_idle
    if preferred.is_file():
        result["idle"] = preferred
    for path in sorted(folder.glob("*.FBX")) + sorted(folder.glob("*.fbx")):
        clip = clip_name(path)
        if clip and (clip != "idle" or "idle" not in result):
            result[clip] = path
    return result


def add_viewmodel_camera() -> bpy.types.Object:
    # FPSPlayer.prefab is the source of truth: Unity camera local position
    # (0.012, 1.654, 0.06), identity rotation and vertical FOV 80.  Unity's +Z
    # forward becomes Blender's -Y after FBX import, while +Y becomes +Z.
    data = bpy.data.cameras.new("VIEWMODEL_CAMERA_DATA")
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 24.0
    data.lens = (data.sensor_height * 0.5) / math.tan(math.radians(80.0) * 0.5)
    data.clip_start = 0.01
    data.clip_end = 50.0
    camera = bpy.data.objects.new("VIEWMODEL_CAMERA", data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.012, -0.06, 1.654)
    camera.rotation_euler = ((Vector((0.012, -1.06, 1.654)) - camera.location).to_track_quat("-Z", "Y").to_euler())
    camera["viewmodel_fov"] = 80.0
    camera["viewmodel_camera_source"] = "FPSPlayer.prefab"
    bpy.context.scene.camera = camera
    return camera


def build() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    config = manifest["families"].get(args.family)
    if not config or config.get("externalWeapon"):
        raise SystemExit(f"family {args.family!r} is not a directly buildable weapon family")

    extracted = args.extracted.expanduser().resolve()
    asset_root = extracted / manifest["source"]["assetRoot"] / config["source"]
    character_root = extracted / "Assets/KINEMATION/FPSAnimationPack/Character"
    output = (args.output or (Path(manifest["output"]["privateRoot"]) / args.family)).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)

    reset_scene()
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    arm_objects = import_fbx(character_root / "SK_Arms_Mono.fbx")
    arms_rig = imported_armature(arm_objects)
    arms_rig.name = "RIG_FP_ARMS"
    for obj in arm_objects:
        if obj.type == "MESH":
            obj.name = f"GEO_FP_{obj.name}"
    if arms_rig.animation_data:
        arms_rig.animation_data_clear()
    setup_arm_materials(arm_objects, character_root)

    # Blender cannot import the pack's ASCII reload FBXs.  The base build only needs
    # the binary idle/pose; the assembler bakes every remaining clip and merges it into
    # this GLB by bone name.  Keeping that boundary explicit avoids lossy FBX roundtrips.
    character_actions = discover_actions(asset_root / "Character", config["idleHint"])
    idle_path = character_actions.get("idle")
    if idle_path is None:
        raise RuntimeError(f"no idle/pose FBX for {args.family}")
    character_report = {"idle": transfer_fbx_action(idle_path, arms_rig, "idle")}
    scene.frame_set(1)
    bpy.context.view_layer.update()

    weapon_objects = import_fbx(asset_root / "Weapon" / config["weaponHint"])
    weapon_rig = imported_armature(weapon_objects)
    weapon_rig.name = f"RIG_WEAPON_{args.family.upper()}"
    if weapon_rig.animation_data:
        weapon_rig.animation_data_clear()
    weapon_root = next((obj for obj in weapon_objects if obj.parent is None and obj.type == "EMPTY"), None)
    if weapon_root is None:
        # Some newer pack families export the armature itself as the FBX root.
        # Its 0.01 transform is the authored unit conversion, so it can be mounted
        # directly without inventing another scaled parent.
        weapon_root = weapon_rig
    else:
        weapon_root.name = f"SOCKET_WEAPON_{args.family.upper()}"
    for obj in weapon_objects:
        if obj.type == "MESH":
            obj.name = f"GEO_WEAPON_{args.family.upper()}_{obj.name}"
    setup_weapon_materials(weapon_objects, asset_root / "Weapon/Materials_URP")

    # Unity anchors the weapon at the origin of ik_hand_gun.  Bone parenting in
    # Blender uses the tail, so copy the evaluated matrix exactly as the source pilot.
    socket_bone = arms_rig.pose.bones.get("ik_hand_gun")
    if socket_bone is None:
        raise RuntimeError("authored arms rig has no ik_hand_gun")
    socket_matrix = (arms_rig.matrix_world @ socket_bone.matrix).copy()
    weapon_root.parent = arms_rig
    weapon_root.parent_type = "OBJECT"
    weapon_root.matrix_parent_inverse = arms_rig.matrix_world.inverted()
    weapon_root.matrix_world = socket_matrix

    # The weapon idle FBX carries an object-level 0.01 import scale.  Reusing that
    # action on the already converted base rig applies the FBX scale twice and makes
    # the gun one hundredth of its authored size.  Idle weapon parts are static; the
    # assembler adds only normalized bone motion for shoot/reload clips later.
    weapon_report = {}

    camera = add_viewmodel_camera()
    scene["viewmodel_family"] = args.family
    scene["viewmodel_source"] = config["source"]
    scene["viewmodel_contract"] = "self-contained-v1"

    blend_path = output / f"{args.family}.blend"
    glb_path = output / f"{args.family}.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        export_cameras=True,
        export_lights=False,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK",
        export_skins=True,
        export_morph=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=82,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_yup=True,
    )

    report = {
        "schemaVersion": 1,
        "family": args.family,
        "source": config["source"],
        "glb": str(glb_path),
        "glbBytes": glb_path.stat().st_size,
        "camera": {
            "name": camera.name,
            "lens": camera.data.lens,
            "fov": camera["viewmodel_fov"],
            "source": camera["viewmodel_camera_source"],
            "position": list(camera.location),
        },
        "arms": {"bones": len(arms_rig.data.bones), "clips": character_report},
        "weapon": {"bones": len(weapon_rig.data.bones), "clips": weapon_report},
    }
    report_path = output / "build-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CORO_PAID_VIEWMODEL_BUILD=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    build()
