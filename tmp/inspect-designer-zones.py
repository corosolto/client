import pathlib
import sys
from collections import Counter

import bpy

source = pathlib.Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
body = max((obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent and obj.parent.type == "ARMATURE"), key=lambda obj: len(obj.data.vertices))
names = {group.index: group.name for group in body.vertex_groups}
zones = {
    "tablet": lambda co: -34.5 < co.x < -18.5 and -8.0 < co.y < 1.0 and 48.0 < co.z < 73.0,
    "fan": lambda co: 14.0 < co.x < 38.0 and -8.0 < co.y < 1.0 and 47.0 < co.z < 77.0,
    "bun": lambda co: abs(co.x) < 14.0 and -3.0 < co.y < 18.0 and co.z > 152.0,
}
for label, predicate in zones.items():
    vertices = [vertex for vertex in body.data.vertices if predicate(vertex.co)]
    dominant = Counter()
    for vertex in vertices:
        membership = max(vertex.groups, key=lambda value: value.weight, default=None)
        dominant[names.get(membership.group, "none") if membership else "none"] += 1
    print(label, len(vertices), dominant)
    for axis in range(3):
        counts = Counter(round(vertex.co[axis], 3) for vertex in vertices)
        print(label, "xyz"[axis], counts.most_common(12))
