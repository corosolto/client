"""List disconnected AK mesh islands with stable geometric measurements."""
from pathlib import Path
import json

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "source_analysis" / "ak_components.json"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "public" / "models" / "weapons" / "ak.glb"))
weapon = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
mesh = weapon.data

adjacency = [set() for _ in mesh.vertices]
for edge in mesh.edges:
    a, b = edge.vertices
    adjacency[a].add(b)
    adjacency[b].add(a)

remaining = set(range(len(mesh.vertices)))
components = []
while remaining:
    seed = remaining.pop()
    stack = [seed]
    vertices = {seed}
    while stack:
        current = stack.pop()
        for neighbour in adjacency[current]:
            if neighbour in remaining:
                remaining.remove(neighbour)
                vertices.add(neighbour)
                stack.append(neighbour)
    coordinates = [mesh.vertices[index].co for index in vertices]
    minimum = Vector((min(v.x for v in coordinates), min(v.y for v in coordinates), min(v.z for v in coordinates)))
    maximum = Vector((max(v.x for v in coordinates), max(v.y for v in coordinates), max(v.z for v in coordinates)))
    components.append({
        "vertices": sorted(vertices),
        "vertex_count": len(vertices),
        "min": [round(value, 6) for value in minimum],
        "max": [round(value, 6) for value in maximum],
        "center": [round(value, 6) for value in ((minimum + maximum) * 0.5)],
        "extent": [round(value, 6) for value in (maximum - minimum)],
    })

components.sort(key=lambda item: item["vertex_count"], reverse=True)
for rank, component in enumerate(components):
    component["rank"] = rank

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"component_count": len(components), "components": components}, indent=2))
print(f"AK_COMPONENTS count={len(components)} out={OUT}")
for component in components[:40]:
    print({key: component[key] for key in ("rank", "vertex_count", "min", "max", "center", "extent")})
