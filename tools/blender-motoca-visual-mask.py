"""Renderiza máscara frontal medida do capacete/telefone do Motoca.

Branco/cinza = casco+visor; vermelho = corpo/suporte do telefone; verde = tela.
O PNG é uma projeção ortográfica real da malha final em 360x463 (viewport 3:2
servido), não uma declaração de bounds. Uso:
  blender --background --python tools/blender-motoca-visual-mask.py -- in.glb out.png
"""
import pathlib
import sys

import bpy
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) != 2:
    raise SystemExit("uso: blender --background --python <script> -- entrada.glb saida.png")
source, output = map(lambda value: pathlib.Path(value).resolve(), argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None:
    raise SystemExit("char1 ausente")

categories = {}
for index, slot in enumerate(body.material_slots):
    name = slot.material.name if slot.material else ""
    if "Motofrete_Helmet" in name or "Motofrete_ChinBar" in name:
        categories[index] = "helmet"
    elif "Motofrete_Visor" in name:
        categories[index] = "visor"
    elif "Motofrete_PhoneScreen" in name:
        categories[index] = "screen"
    elif "Motofrete_Phone" in name:
        categories[index] = "phone"
if not categories:
    raise SystemExit("nenhum material Motofrete mensurável")

def emission(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    shader = tree.nodes.new("ShaderNodeEmission")
    shader.inputs["Color"].default_value = (*color, 1)
    shader.inputs["Strength"].default_value = 1
    tree.links.new(shader.outputs["Emission"], out.inputs["Surface"])
    return material

mask_materials = {
    "body": emission("MASK_BODY_OCCLUDER", (0, 0, 0)),
    "helmet": emission("MASK_HELMET", (1, 1, 1)),
    "visor": emission("MASK_VISOR", (.55, .55, .55)),
    "phone": emission("MASK_PHONE", (1, 0, 0)),
    "screen": emission("MASK_SCREEN", (0, 1, 0)),
}
# O corpo preto permanece como occluder de profundidade: na abertura real, rosto e
# cabelo escondem a parede traseira branca do casco. Sem ele uma esfera aberta
# projetaria o occipital pelo buraco e pareceria falsamente fechada.
for index, slot in enumerate(body.material_slots):
    slot.material = mask_materials[categories.get(index, "body")]

# Solta a cópia visual do armature preservando sua matriz; apagar o pai sem isto
# faz a malha desaparecer junto na avaliação da cena.
world_matrix = body.matrix_world.copy()
body.parent = None
body.matrix_world = world_matrix
for obj in list(bpy.context.scene.objects):
    if obj != body:
        bpy.data.objects.remove(obj, do_unlink=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 360
scene.render.resolution_y = 463
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.object.camera_add(location=(0, -4, 1.05))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = 2.10
camera.rotation_euler = (Vector((0, 0, 1.05)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = camera

output.parent.mkdir(parents=True, exist_ok=True)
scene.render.filepath = str(output)
bpy.ops.render.render(write_still=True)
print(f"MOTOCA_VISUAL_MASK={output}")
