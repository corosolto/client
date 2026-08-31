"""Extract the approved Coro Solto pistol hands as a weapon-free heavy-family template."""
from __future__ import annotations

import os
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
SOURCE = Path(os.environ.get(
    "CORO_APPROVED_PISTOL_SOURCE",
    "/Users/ruben/csbrasil/client/public/models/viewmodels/coro/pistol-hires.glb",
))
OUTPUT = ROOT / "tools" / "blender" / "viewmodels" / "heavy" / "sources" / "approved-project-hands.glb"


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    hands = next(obj for obj in bpy.context.scene.objects if obj.name == "coro_solto_hires_pistol_hands")
    camera = next(obj for obj in bpy.context.scene.objects if obj.type == "CAMERA")
    for obj in list(bpy.context.scene.objects):
        if obj not in {rig, hands, camera}:
            bpy.data.objects.remove(obj, do_unlink=True)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)
    rig.name = "coro_solto_heavy_hands_rig"
    hands.name = "coro_solto_heavy_hands"
    rig["template_origin"] = "approved Coro Solto pistol pilot; project material and complete hand topology"
    rig["template_policy"] = "weapon-free; no donor weapon, texture, material or skin"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (rig, hands, camera):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS",
        export_skins=True, export_morph=True, export_cameras=True,
        export_extras=True, export_apply=False,
    )
    print(f"PROJECT_HAND_TEMPLATE={OUTPUT}")


if __name__ == "__main__":
    main()
