"""Reporta e, opcionalmente, remove ilhas desconectadas de um GLB no Blender.

Uso:
  blender --background --python tools/blender-loose-parts.py -- in.glb report.json
  blender --background --python tools/blender-loose-parts.py -- in.glb report.json out.glb 2,5

Os IDs são estáveis para o mesmo arquivo: componentes ordenados por número de vértices
decrescente, depois pelo menor índice original. A remoção é explícita; sem a quarta entrada
o script é somente leitura. Serve para acessórios fundidos no atlas mas topologicamente
soltos (caso real: espada atravessando o peito do Bandeirante na seleção).
"""
import json
import pathlib
import sys

import bmesh
import bpy
from mathutils import Vector


def args_after_double_dash():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


argv = args_after_double_dash()
if len(argv) < 2:
    raise SystemExit("uso: blender-loose-parts.py -- entrada.glb relatorio.json [saida.glb ids_csv]")

source = pathlib.Path(argv[0]).resolve()
report_path = pathlib.Path(argv[1]).resolve()
output = pathlib.Path(argv[2]).resolve() if len(argv) >= 3 else None
remove_ids = {int(value) for value in argv[3].split(",") if value} if len(argv) >= 4 else set()
if bool(output) != bool(remove_ids):
    raise SystemExit("saída e ids_csv precisam ser fornecidos juntos")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
report = {"source": str(source), "blender": bpy.app.version_string, "meshes": []}

for mesh_index, obj in enumerate(meshes):
    mesh = obj.data
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    # GLBs gerados costumam duplicar vértices em costuras UV/normais. Índices distintos
    # na mesma posição ainda são a mesma ilha visual; sem esta união cada triângulo vira
    # um falso "componente" e a ferramenta não consegue selecionar um acessório inteiro.
    colocated = {}
    for vertex in mesh.vertices:
        key = tuple(round(value, 5) for value in vertex.co)
        colocated.setdefault(key, []).append(vertex.index)
    for indices in colocated.values():
        if len(indices) < 2:
            continue
        anchor = indices[0]
        for duplicate in indices[1:]:
            adjacency[anchor].add(duplicate)
            adjacency[duplicate].add(anchor)

    unseen = set(range(len(mesh.vertices)))
    components = []
    while unseen:
        seed = min(unseen)
        stack = [seed]
        unseen.remove(seed)
        vertices = []
        while stack:
            current = stack.pop()
            vertices.append(current)
            for neighbor in adjacency[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
        components.append(vertices)
    components.sort(key=lambda values: (-len(values), min(values)))

    rows = []
    for component_id, vertex_ids in enumerate(components):
        points = [obj.matrix_world @ mesh.vertices[index].co for index in vertex_ids]
        minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
        maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
        rows.append(
            {
                "id": component_id,
                "vertices": len(vertex_ids),
                "minVertex": min(vertex_ids),
                "boundsMin": [round(value, 6) for value in minimum],
                "boundsMax": [round(value, 6) for value in maximum],
                "span": [round(value, 6) for value in maximum - minimum],
                "center": [round(value, 6) for value in (minimum + maximum) * 0.5],
            }
        )
    report["meshes"].append({"index": mesh_index, "name": obj.name, "components": rows})

    if remove_ids:
        selected_vertices = {index for component_id, values in enumerate(components) if component_id in remove_ids for index in values}
        missing = remove_ids - set(range(len(components)))
        if missing:
            raise SystemExit(f"componentes inexistentes: {sorted(missing)}")
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.verts[index] for index in selected_vertices], context="VERTS")
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"REPORT_JSON={report_path}")

if output:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)
    print(f"CLEAN_GLB={output} removed={sorted(remove_ids)}")
