"""Corrige somente o perfil frontal da queixeira do Motoca já rigado.

Uso:
  blender --background --python tools/blender-motoca-front-profile.py -- \
    entrada.glb saida.glb recibo.json

O passe não cria rig, não repinta roupa e não toca bag/telefone. Ele seleciona vértices
do material rígido do capacete na ponta frontal baixa que o HARD8 mede. A placa atual
mede ~3,10:1 em projeção frontal; compactar somente sua largura a transforma numa
proteção estreita sem cobrir boca/rosto nem mover o casco.
"""
import hashlib
import json
import pathlib
import sys

import bpy
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) != 3:
    raise SystemExit("uso: blender --background --python <script> -- entrada.glb saida.glb recibo.json")
source, output, receipt = map(lambda value: pathlib.Path(value).resolve(), argv)
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 não encontrada")

helmet_name = "CS_HARD_Motofrete_Helmet_Black"
helmet_index = next((index for index, slot in enumerate(body.material_slots)
                     if slot.material and slot.material.name == helmet_name), None)
if helmet_index is None:
    raise SystemExit(f"material ausente: {helmet_name}")

helmet_vertices = {vertex_index for polygon in body.data.polygons
                   if polygon.material_index == helmet_index
                   for vertex_index in polygon.vertices}
inverse = body.matrix_world.inverted()
changed = []
before = []
after = []
for vertex_index in sorted(helmet_vertices):
    vertex = body.data.vertices[vertex_index]
    world = body.matrix_world @ vertex.co
    # Blender: -Y é frente; Z é altura. Esta é exatamente a ponta que vira
    # glTF z>=0,20 no HARD8, sem alcançar casco alto, rosto ou laterais.
    if not (1.34 <= world.z <= 1.47 and world.y <= -0.20):
        continue
    before.append([round(component, 6) for component in world])
    world.x *= 0.52
    # Recuo pequeno reduz a projeção sem empurrar a peça para dentro do rosto.
    world.y += 0.004
    vertex.co = inverse @ world
    after.append([round(component, 6) for component in world])
    changed.append(vertex_index)

if len(changed) < 24:
    raise SystemExit(f"queixeira frontal não localizada: {len(changed)} vértices")

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
record = {
    "source": str(source),
    "output": str(output),
    "sourceSha256": sha256(source),
    "outputSha256": sha256(output),
    "blender": bpy.app.version_string,
    "material": helmet_name,
    "changedVertices": len(changed),
    "changedVertexIndices": changed,
    "selection": "1.34 <= world.z <= 1.47 and world.y <= -0.20",
    "operation": "x *= 0.52; y += 0.004",
    "beforeBounds": {
        "min": [min(point[axis] for point in before) for axis in range(3)],
        "max": [max(point[axis] for point in before) for axis in range(3)],
    },
    "afterBounds": {
        "min": [min(point[axis] for point in after) for axis in range(3)],
        "max": [max(point[axis] for point in after) for axis in range(3)],
    },
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"MOTOCA_FRONT_PROFILE={output} changed={len(changed)} sha256={record['outputSha256']}")
