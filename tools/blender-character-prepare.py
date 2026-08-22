"""Normaliza orientação e piso de um personagem GLB sem rig usando Blender.

Uso:
  blender --background --python tools/blender-character-prepare.py -- \
    entrada.glb saida.glb +x

O terceiro argumento diz para onde o rosto aponta no espaço importado do Blender
(`+x`, `-x`, `+y` ou `-y`). O arquivo exportado fica olhando para a frente glTF `+Z`,
que corresponde a `-Y` no Blender, e com o menor vértice em Z=0.

Execute antes do rig. Aplicar transformações depois da skin altera bind matrices e é
justamente o tipo de correção tardia que produz deformação silenciosa.
"""
import math
import pathlib
import sys

import bpy
from mathutils import Matrix


def args_after_double_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


argv = args_after_double_dash()
if len(argv) != 3:
    raise SystemExit("uso: blender-character-prepare.py -- entrada.glb saida.glb +x|-x|+y|-y")

source = pathlib.Path(argv[0]).resolve()
output = pathlib.Path(argv[1]).resolve()
front = argv[2].lower()
angles = {"+x": -math.pi / 2, "-x": math.pi / 2, "+y": math.pi, "-y": 0.0}
if front not in angles:
    raise SystemExit(f"frente invalida: {front}")
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
if any(obj.type == "ARMATURE" for obj in bpy.context.scene.objects):
    raise SystemExit("recusado: o GLB ja tem armature; prepare o personagem antes do rig")

roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not roots or not meshes:
    raise SystemExit("GLB sem raiz ou sem malha")

angle = angles[front]
for obj in roots:
    # O importador glTF costuma deixar os nós em rotation_mode=QUATERNION. Escrever
    # rotation_euler nesse modo não altera a transformação efetiva; a primeira versão
    # deste script exportou uma imagem pixelmente igual. Multiplicar matrix_world
    # funciona independentemente do modo de rotação do nó.
    obj.matrix_world = Matrix.Rotation(angle, 4, "Z") @ obj.matrix_world
bpy.context.view_layer.update()

# Aplica a rotação apenas às raízes. Filhos acompanham uma vez; selecionar a árvore
# inteira e aplicar em cada nó duplicaria a transformação em hierarquias importadas.
bpy.ops.object.select_all(action="DESELECT")
for obj in roots:
    obj.select_set(True)
bpy.context.view_layer.objects.active = roots[0]
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
bpy.context.view_layer.update()

min_z = min(
    (obj.matrix_world @ vertex.co).z
    for obj in meshes
    for vertex in obj.data.vertices
)
for obj in roots:
    obj.location.z -= min_z
bpy.context.view_layer.update()

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"PREPARED_GLB={output} front={front}->gltf:+Z groundShift={-min_z:.6f}")
