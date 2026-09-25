"""Acentua pesos de skin existentes sem trocar ossos nem rigidificar a malha.

Uso:
  blender --background --python tools/blender-sharpen-skin.py -- \
    entrada.glb saida.glb 1.5

Cada peso vira ``peso ** expoente`` e os pesos do vértice são renormalizados. Acima
de 1 reduz influências residuais; abaixo de 1 suaviza transições bruscas. Exige
comparação A/B nas mesmas animações; 1.0 é identidade.
"""
import pathlib
import sys

import bpy


def args_after_double_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


argv = args_after_double_dash()
if len(argv) != 3:
    raise SystemExit("uso: blender-sharpen-skin.py -- entrada.glb saida.glb expoente")

source = pathlib.Path(argv[0]).resolve()
output = pathlib.Path(argv[1]).resolve()
power = float(argv[2])
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")
if power < 0.5 or power > 4.0:
    raise SystemExit("expoente precisa ficar entre 0.5 e 4.0")

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
    for vertex in obj.data.vertices:
        weighted = [(membership.group, membership.weight ** power) for membership in vertex.groups if membership.weight > 0]
        total = sum(weight for _, weight in weighted)
        if total <= 0:
            continue
        for group_index, weight in weighted:
            obj.vertex_groups[group_index].add([vertex.index], weight / total, "REPLACE")
        vertices += 1

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
print(f"SHARPENED_SKIN_GLB={output} power={power} meshes={len(meshes)} vertices={vertices}")
