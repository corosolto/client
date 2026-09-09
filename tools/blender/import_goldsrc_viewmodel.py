"""Import a decompiled GoldSrc viewmodel QC and export an animated GLB.

Run with Blender and the open-source Blender Source Tools checkout:
  blender --background --python tools/blender/import_goldsrc_viewmodel.py -- \
    input.qc output.glb output.blend /path/to/BlenderSourceTools
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import bpy


def args() -> tuple[Path, Path, Path, Path]:
    values = sys.argv[sys.argv.index("--") + 1 :]
    if len(values) != 4:
        raise SystemExit("expected: input.qc output.glb output.blend BlenderSourceTools")
    return tuple(Path(value).resolve() for value in values)  # type: ignore[return-value]


def qc_sequences(qc: Path) -> dict[str, int]:
    text = qc.read_text(errors="replace")
    found: dict[str, int] = {}
    for match in re.finditer(r"(?ims)^\s*\$sequence\s+(\S+)(.*?)(?=^\s*\$|\Z)", text):
        fps = re.search(r"\bfps\s+(\d+)", match.group(2), re.I)
        found[match.group(1).strip('"')] = int(fps.group(1)) if fps else 30
    return found


qc, output_glb, output_blend, source_tools = args()
sys.path.insert(0, str(source_tools))
import io_scene_valvesource  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
io_scene_valvesource.register()
result = bpy.ops.import_scene.smd(
    filepath=str(qc), doAnim=True, createCollections=False, makeCamera=False,
    append="APPEND", upAxis="Z", rotMode="QUATERNION", boneMode="NONE",
)
if "FINISHED" not in result:
    raise RuntimeError(f"Source Tools import failed: {result}")

sequences = qc_sequences(qc)
scene = bpy.context.scene
scene.render.fps = 30
scene.render.fps_base = 1
scene["authoredViewmodel"] = True
scene["hands"] = 2
scene["weaponMeshes"] = sum(1 for obj in scene.objects if obj.type == "MESH")
scene["sourceFormat"] = "GoldSrc MDL v10"

for material in bpy.data.materials:
    image_file = qc.parent / "maps_8bit" / material.name
    if not image_file.exists():
        continue
    material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    image = bpy.data.images.load(str(image_file), check_existing=True)
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    shader.inputs["Metallic"].default_value = 0.05
    shader.inputs["Roughness"].default_value = 0.62

for action in bpy.data.actions:
    slots = list(action.slots) if hasattr(action, "slots") else []
    if slots:
        action.name = slots[0].name_display
        for slot in slots:
            source_fps = sequences.get(slot.name_display, 30)
            scale = 30 / source_fps
            channelbag = action.layers[0].strips[0].channelbag(slot)
            if channelbag is None or abs(scale - 1) <= 1e-6:
                continue
            for curve in channelbag.fcurves:
                for key in curve.keyframe_points:
                    key.co.x *= scale
                    key.handle_left.x *= scale
                    key.handle_right.x *= scale
    else:
        source_fps = sequences.get(action.name, 30)
        scale = 30 / source_fps
        if abs(scale - 1) > 1e-6:
            for curve in action.fcurves:
                for key in curve.keyframe_points:
                    key.co.x *= scale
                    key.handle_left.x *= scale
                    key.handle_right.x *= scale

armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
if len(armatures) != 1:
    raise RuntimeError(f"expected one armature, found {len(armatures)}")
armature = armatures[0]
armature.name = "viewmodel_rig"
armature["authoredViewmodel"] = True
armature["hands"] = 2
armature["weaponMeshes"] = scene["weaponMeshes"]

if armature.animation_data is None:
    armature.animation_data_create()
armature.animation_data.action = None

output_glb.parent.mkdir(parents=True, exist_ok=True)
output_blend.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
bpy.ops.export_scene.gltf(
    filepath=str(output_glb), export_format="GLB", export_extras=True,
    export_animations=True, export_nla_strips=False, export_def_bones=True,
    export_skins=True, export_morph=False, export_apply=False,
    export_image_format="AUTO", export_texture_dir="textures",
)
print("GOLDSRC_VIEWMODEL", qc.name, sorted(sequences), output_glb)
