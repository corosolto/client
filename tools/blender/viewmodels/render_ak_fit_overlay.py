"""Overlay the donor weapon envelope as neon wireframe for fit diagnosis."""
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads" / "ak-12animated.glb"
OUT = ROOT / "artifacts" / "viewmodels" / "ak-hires-pilot" / "ak_fit_overlay.png"

# Keep the already-built Coro Solto rig on the same idle frame used by the
# donor diagnostic overlay. The .blend is saved after the reload renders, so
# without this reset the comparison mixes two different animation states.
own_rig = bpy.data.objects.get("coro_solto_hires_fp_rig")
own_idle = bpy.data.actions.get("Idle")
if own_rig and own_idle:
    if own_rig.animation_data is None:
        own_rig.animation_data_create()
    own_rig.animation_data.action = own_idle
    bpy.context.scene.frame_set(0)

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(DONOR))
imported = [obj for obj in bpy.data.objects if obj not in before]
rig = next(obj for obj in imported if obj.type == "ARMATURE")
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions.get("Idle.001") or bpy.data.actions.get("Idle")

mat = bpy.data.materials.new("FIT_REFERENCE_WIREFRAME_ONLY")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.0, 1.0, 0.05, 1.0)
bsdf.inputs["Emission Color"].default_value = (0.0, 1.0, 0.05, 1.0)
bsdf.inputs["Emission Strength"].default_value = 4.0

for obj in list(imported):
    if obj.type != "MESH":
        continue
    if "Requests_Studio_Hands" in obj.name or "watch" in obj.name or "Icosphere" in obj.name:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    wire = obj.modifiers.new("Fit_reference_wire", "WIREFRAME")
    wire.thickness = 0.004
    wire.use_replace = True

scene = bpy.context.scene
scene.frame_set(0)
bpy.context.view_layer.update()
scene.render.filepath = str(OUT)
bpy.ops.render.render(write_still=True)
