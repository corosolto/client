"""Build the licensed grenade pack and KINEMATION throw clips as one private GLB."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_paid_family import (  # noqa: E402
    add_viewmodel_camera,
    import_fbx,
    imported_armature,
    reset_scene,
    setup_arm_materials,
    transfer_fbx_action,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = REPO_ROOT / "tools/viewmodels/paid-pack-manifest.json"
DEFAULT_EXTRACTED = Path("/Users/ruben/csbrasil-private-assets/generated/extracted")
DEFAULT_MODELS = Path("/Users/ruben/csbrasil-private-assets/sources/grenadepack1.blend")


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    parser.add_argument("--models", type=Path, default=DEFAULT_MODELS)
    parser.add_argument("--output", type=Path)
    return parser.parse_args(values)


def append_grenade_models(path: Path) -> dict[str, bpy.types.Object]:
    with bpy.data.libraries.load(str(path), link=False) as (source, target):
        target.objects = list(source.objects)
    loaded = [obj for obj in target.objects if obj]
    by_name = {obj.name: obj for obj in loaded}
    roots = {
        "he": by_name["Grenade_m67"],
        "flash": by_name["m7920_flash_grenade"],
        "smoke": by_name["m18"],
    }

    def selected(obj: bpy.types.Object) -> bool:
        cursor = obj
        while cursor:
            if cursor in roots.values():
                return True
            cursor = cursor.parent
        return False

    for obj in loaded:
        if selected(obj):
            bpy.context.collection.objects.link(obj)
        else:
            bpy.data.objects.remove(obj, do_unlink=True)
    for kind, root in roots.items():
        root.name = f"UTILITY_{kind.upper()}"
        root.location = (0.0, 0.0, 0.0)
        root["utility_kind"] = kind
        for material in root.data.materials:
            if material:
                material.name = f"CoroSolto_Utility_{kind}_{material.name}"
    return roots


def place_at_grip(root: bpy.types.Object) -> None:
    # The glTF post-process parents this world-space registration under hand_r. Doing
    # that after export avoids Blender's bone-tail parent convention changing the socket.
    # hand_r wrist is (-0.287, -0.260, 1.443) in the authored pose; the palm/fingers
    # close around this offset while hand_l remains free to pull the pin.
    root.matrix_world = Matrix.Translation((-0.255, -0.305, 1.525))


def build() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    config = manifest["families"]["grenade"]
    extracted = args.extracted.expanduser().resolve()
    animation_root = extracted / manifest["source"]["assetRoot"] / config["source"] / "Character"
    character_root = extracted / "Assets/KINEMATION/FPSAnimationPack/Character"
    output = (args.output or (Path(manifest["output"]["privateRoot"]) / "grenade")).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)

    reset_scene()
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    arm_objects = import_fbx(character_root / "SK_Arms_Mono.fbx")
    arms = imported_armature(arm_objects)
    arms.name = "RIG_FP_ARMS"
    if arms.animation_data:
        arms.animation_data_clear()
    for obj in arm_objects:
        if obj.type == "MESH":
            obj.name = f"GEO_FP_{obj.name}"
    setup_arm_materials(arm_objects, character_root)

    clip_files = {
        "idle": "A_FP_Grenade_Pose.FBX",
        "throw_start": "A_FP_GrenadeThrow_Start.FBX",
        "throw_loop": "A_FP_GrenadeThrow_Loop.FBX",
        "throw_end": "A_FP_GrenadeThrow_End.FBX",
    }
    clips = {
        name: transfer_fbx_action(animation_root / filename, arms, name)
        for name, filename in clip_files.items()
    }
    scene.frame_set(1)
    bpy.context.view_layer.update()

    roots = append_grenade_models(args.models.expanduser().resolve())
    for root in roots.values():
        place_at_grip(root)
    camera = add_viewmodel_camera()
    scene["viewmodel_family"] = "grenade"
    scene["viewmodel_contract"] = "self-contained-utility-v1"

    blend_path = output / "grenade.blend"
    glb_path = output / "grenade.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path), export_format="GLB", export_cameras=True,
        export_lights=False, export_animations=True, export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK", export_skins=True, export_morph=True,
        export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82,
        export_optimize_animation_size=True, export_optimize_animation_keep_anim_armature=True,
        export_yup=True,
    )
    # Small world-space pack: thrown projectiles reuse the paid geometry instead of
    # reverting to the old low-poly sphere after leaving the player's hand.
    for obj in scene.objects:
        obj.select_set(False)
    for root in roots.values():
        root.matrix_world = Matrix.Identity(4)
        root.select_set(True)
        for child in root.children_recursive:
            child.select_set(True)
    world_path = output / "grenades-world.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(world_path), export_format="GLB", use_selection=True,
        export_cameras=False, export_lights=False, export_animations=False,
        export_skins=False, export_morph=False, export_materials="EXPORT",
        export_image_format="WEBP", export_image_quality=78, export_yup=True,
    )
    report = {
        "schemaVersion": 1,
        "family": "grenade",
        "glb": str(glb_path),
        "glbBytes": glb_path.stat().st_size,
        "worldGlb": str(world_path),
        "worldGlbBytes": world_path.stat().st_size,
        "camera": {"name": camera.name, "fov": camera["viewmodel_fov"]},
        "arms": {"bones": len(arms.data.bones), "clips": clips},
        "models": sorted(roots),
    }
    (output / "build-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CORO_PAID_GRENADE_BUILD=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    build()
