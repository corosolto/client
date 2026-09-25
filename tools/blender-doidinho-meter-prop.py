"""Reduz/retexturiza somente a gambiarra branca do Doidinho.

O conjunto de chuveiro/medidores é compactado 0,72x, movido para o centro traseiro
da mochila e ganha carcaça teal, aro cobre e seletor colorido. P90, roupa, corpo,
rig e animações não são tocados.
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

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def paint_and_rename(old, new, color, metallic=0.0, roughness=.68):
    material = bpy.data.materials.get(old)
    if material is None:
        raise RuntimeError(f"material ausente: {old}")
    material.name = new
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return material

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = bpy.data.objects.get("char1")
if body is None or body.type != "MESH":
    raise SystemExit("char1 ausente")

rename = {
    "Gambiarra_ShowerBody_Cream": ("Gambiarra_MeterBody_Teal", (.025, .205, .185), .10, .62),
    "Gambiarra_Shower_Cream": ("Gambiarra_MeterFace_Copper", (.46, .185, .055), .35, .45),
    "Gambiarra_Shower_Holes": ("Gambiarra_MeterDial_Navy", (.018, .040, .065), .15, .38),
    "Gambiarra_ShowerBody_Seam": ("Gambiarra_MeterSeam_Copper", (.35, .105, .025), .30, .48),
    "Gambiarra_TempSelector": ("Gambiarra_MeterSelector_Color", (.78, .055, .025), .10, .40),
}
old_names = set(rename) | {"Gambiarra_Wire_Yellow", "Gambiarra_Wire_Visible"}
material_vertices = {}
for polygon in body.data.polygons:
    material = body.material_slots[polygon.material_index].material
    if material and material.name in old_names:
        material_vertices.setdefault(material.name, set()).update(polygon.vertices)

indices = sorted(set().union(*material_vertices.values()))
if len(indices) < 1800:
    raise SystemExit(f"inventário Gambiarra incompleto: {len(indices)} vértices")

# Blender: X lateral, +Y traseiro, Z altura. Centro anterior equivale a
# glTF [0,145; 1,30; -0,08]. Reduz e desloca para junto do eixo da mochila.
center = Vector((.145, .080, 1.300))
shift = Vector((-.080, .030, 0))
inverse = body.matrix_world.inverted()
before, after = [], []
for index in indices:
    vertex = body.data.vertices[index]
    world = body.matrix_world @ vertex.co
    before.append(tuple(world))
    world = center + (world - center) * .72 + shift
    vertex.co = inverse @ world
    after.append(tuple(world))

materials = []
for old, (new, color, metallic, roughness) in rename.items():
    materials.append(paint_and_rename(old, new, color, metallic, roughness).name)

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
record = {
    "source": str(source), "output": str(output),
    "sourceSha256": sha256(source), "outputSha256": sha256(output),
    "blender": bpy.app.version_string, "changedVertices": len(indices),
    "operation": "Gambiarra *= 0.72 around backpack center; shift Blender [-0.08,+0.03,0]",
    "renamedMaterials": materials,
    "scope": "Gambiarra materials only; P90/clothes/body rig excluded",
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"DOIDINHO_METER_PROP={output} changed={len(indices)} sha256={record['outputSha256']}")
