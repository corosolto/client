"""Move caneca/mouse do Programador para sockets rígidos no quadril traseiro.

Toca somente os componentes identificados pelos materiais LAN_Mug*/LAN_Mouse* e
LAN_Cable_Visible. Teclado, corpo, rig e M4 não são alterados. Os vértices ficam
100% em Hips, eliminando a órbita que o peso em Spine02 produzia entre poses.

Uso:
  blender --background --python tools/blender-programador-prop-sockets.py -- \
    entrada.glb saida.glb recibo.json
"""
import hashlib
import json
import pathlib
import sys

import bpy
from mathutils import Vector


argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(argv) != 3:
    raise SystemExit("uso: blender --background --python <script> -- entrada.glb saida.glb recibo.json")
source, output, receipt = map(lambda value: pathlib.Path(value).resolve(), argv)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("malha char1 ausente")
hips = body.vertex_groups.get("Hips")
if hips is None:
    raise SystemExit("vertex group Hips ausente")

material_vertices = {}
for polygon in body.data.polygons:
    material = body.material_slots[polygon.material_index].material
    if material:
        material_vertices.setdefault(material.name, set()).update(polygon.vertices)

# Blender: +Y é traseira; glTF exporta -Y como +Z/frente. Os deslocamentos põem
# os props atrás do plano do torso e um pouco abaixo, junto ao cinto/quadril.
rules = {
    "LAN_MugSteel": (Vector((0.00, 0.20, -0.07)), None),
    "LAN_MugDark": (Vector((0.00, 0.20, -0.07)), None),
    "LAN_Mouse_Rev2": (Vector((0.05, 0.30, -0.04)), None),
    "LAN_Trackball_Red": (Vector((0.05, 0.30, -0.04)), None),
    "LAN_Cable_Visible": (Vector((0.05, 0.30, -0.04)), None),
    # LAN_Mouse_Buttons também pinta presilhas do teclado. Só os botões baixos
    # (z<1,12 m) pertencem ao mouse; as presilhas nas costas ficam intocadas.
    "LAN_Mouse_Buttons": (Vector((0.05, 0.30, -0.04)), lambda world: world.z < 1.12),
}

changed = []
before = []
after = []
for material_name, (delta, predicate) in rules.items():
    for vertex_index in sorted(material_vertices.get(material_name, ())):
        vertex = body.data.vertices[vertex_index]
        world = body.matrix_world @ vertex.co
        if predicate and not predicate(world):
            continue
        before.append(tuple(world))
        world += delta
        vertex.co = body.matrix_world.inverted() @ world
        after.append(tuple(world))
        changed.append(vertex_index)

changed = sorted(set(changed))
if len(changed) < 1800:
    raise SystemExit(f"inventário de props incompleto: {len(changed)} vértices")
for group in body.vertex_groups:
    group.remove(changed)
hips.add(changed, 1.0, "REPLACE")

def bounds(points):
    return {
        "min": [round(min(point[axis] for point in points), 6) for axis in range(3)],
        "max": [round(max(point[axis] for point in points), 6) for axis in range(3)],
    }

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
record = {
    "source": str(source),
    "output": str(output),
    "sourceSha256": sha256(source),
    "outputSha256": sha256(output),
    "blender": bpy.app.version_string,
    "socket": "Hips",
    "changedVertices": len(changed),
    "materials": list(rules),
    "operation": "mug += [0,+0.20,-0.07]; mouse/cable += [+0.05,+0.30,-0.04]; weights=Hips:1",
    "beforeBoundsBlenderWorld": bounds(before),
    "afterBoundsBlenderWorld": bounds(after),
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"PROGRAMADOR_PROP_SOCKETS={output} changed={len(changed)} sha256={record['outputSha256']}")
