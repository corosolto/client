"""Converte pesos suaves em vínculo dominante para personagem mecânico segmentado.

Uso:
  blender --background --python tools/blender-rigid-skin.py -- entrada.glb saida.glb

Robôs de placas separadas não devem esticar como pele entre ossos. Cada vértice fica
100% no grupo de maior peso já escolhido pelo auto-rig; a ferramenta não inventa a
posição do esqueleto. Use apenas após uma régua de deformação reprovar e confira todos
os clipes visualmente, pois o mesmo tratamento é inadequado para roupa/carne contínua.
"""
import pathlib
import sys

import bpy


def args_after_double_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


argv = args_after_double_dash()
if len(argv) != 2:
    raise SystemExit("uso: blender-rigid-skin.py -- entrada.glb saida.glb")

source = pathlib.Path(argv[0]).resolve()
output = pathlib.Path(argv[1]).resolve()
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")

meshes = [
    obj for obj in bpy.context.scene.objects
    if obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers)
]
if not meshes:
    raise SystemExit("GLB sem malha skinnada")

vertices = 0
for obj in meshes:
    assignments = []
    for vertex in obj.data.vertices:
        weighted = [(membership.group, membership.weight) for membership in vertex.groups if membership.weight > 0]
        if not weighted:
            assignments.append(None)
            continue
        assignments.append(max(weighted, key=lambda pair: pair[1])[0])
    for group in obj.vertex_groups:
        group.remove(range(len(obj.data.vertices)))
    for vertex_index, group_index in enumerate(assignments):
        if group_index is None:
            continue
        obj.vertex_groups[group_index].add([vertex_index], 1.0, "REPLACE")
        vertices += 1

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"RIGID_SKIN_GLB={output} meshes={len(meshes)} vertices={vertices}")
