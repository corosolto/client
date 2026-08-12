"""Consolida um candidato aprovado em 1 mesh/1 material/1 atlas antes do Meshy rig.

O endpoint de rig funde meshes e, com 16 materiais, devolve zero material. Assar o
basecolor para um atlas único preserva os pixels aprovados e cai no contrato já medido
do restaurador PBR (1 material de entrada → 1 material rigado).
"""
import pathlib
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 3:
    raise SystemExit("uso: blender --background --python script -- input.glb output.glb atlas.png")
source, output, atlas_path = [pathlib.Path(value).resolve() for value in args]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise SystemExit("entrada sem mesh")

bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = max(meshes, key=lambda obj: len(obj.data.vertices))
bpy.ops.object.join()
obj = bpy.context.object
obj.name = "designer_ux_rig_atlas"
source_uv_name = obj.data.uv_layers.active.name if obj.data.uv_layers.active else None
if not source_uv_name:
    raise RuntimeError("mesh unida sem UV fonte")

# UV exclusivo do atlas; o UV original continua disponível para os materiais-fonte
# durante o bake. O Smart Project é determinístico para esta malha/versão do Blender.
atlas_uv = obj.data.uv_layers.new(name="CS_RIG_ATLAS")
obj.data.uv_layers.active = atlas_uv
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.012)
bpy.ops.object.mode_set(mode="OBJECT")
atlas_uv.active_render = True

atlas_path.parent.mkdir(parents=True, exist_ok=True)
image = bpy.data.images.new("CS_DESIGNER_UX_RIG_ATLAS", width=2048, height=2048, alpha=False)
image.generated_color = (0.01, 0.01, 0.012, 1.0)
image.filepath_raw = str(atlas_path)
image.file_format = "PNG"

source_materials = [material for material in obj.data.materials if material]
for material in source_materials:
    material.use_nodes = True
    uv_node = material.node_tree.nodes.new("ShaderNodeUVMap")
    uv_node.name = "CS_SOURCE_UV"
    uv_node.uv_map = source_uv_name
    for source_node in list(material.node_tree.nodes):
        if source_node.type == "TEX_IMAGE" and not source_node.inputs["Vector"].is_linked:
            material.node_tree.links.new(uv_node.outputs["UV"], source_node.inputs["Vector"])
    node = material.node_tree.nodes.new("ShaderNodeTexImage")
    node.name = "CS_RIG_ATLAS_TARGET"
    node.image = image
    material.node_tree.nodes.active = node

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 1
scene.render.bake.margin = 12
scene.render.bake.use_clear = True
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})
image.save()

material = bpy.data.materials.new("CS_DESIGNER_UX_ATLAS")
material.use_nodes = True
bsdf = material.node_tree.nodes.get("Principled BSDF")
texture = material.node_tree.nodes.new("ShaderNodeTexImage")
texture.image = image
atlas_uv_node = material.node_tree.nodes.new("ShaderNodeUVMap")
atlas_uv_node.uv_map = "CS_RIG_ATLAS"
material.node_tree.links.new(atlas_uv_node.outputs["UV"], texture.inputs["Vector"])
material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Metallic"].default_value = 0.05
bsdf.inputs["Roughness"].default_value = 0.58

obj.data.materials.clear()
obj.data.materials.append(material)
for polygon in obj.data.polygons:
    polygon.material_index = 0
for layer in list(obj.data.uv_layers):
    if layer.name != "CS_RIG_ATLAS":
        obj.data.uv_layers.remove(layer)
obj.data.uv_layers.active = obj.data.uv_layers["CS_RIG_ATLAS"]
obj.data.uv_layers["CS_RIG_ATLAS"].active_render = True

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
obj.data.calc_loop_triangles()
print(f"RIG_ATLAS={output} meshes=1 materials=1 tris={len(obj.data.loop_triangles)} atlas={atlas_path}")
