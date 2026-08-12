"""Prepare the exact Meshy-A geometry for Meshy's native rigger.

The rig API rejects untextured meshes. This script only adds a UV layer and a
packed 4x4 neutral texture; it does not add, remove, subdivide or deform body
geometry. The authored character materials are restored after rigging.
"""
import bpy
import sys


def arg(name):
    args = sys.argv[sys.argv.index("--") + 1:]
    return args[args.index(name) + 1]


src = arg("--input")
dst = arg("--output")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert len(meshes) == 1, f"expected exact one-body Meshy surface, got {len(meshes)} meshes"
body = meshes[0]

# UV projection changes only the corner UV attribute, never POSITION/topology.
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project(cube_size=1.0, correct_aspect=True)
bpy.ops.object.mode_set(mode="OBJECT")

image = bpy.data.images.new("CV_NATIVE_RIG_NEUTRAL", width=4, height=4, alpha=True)
image.pixels = [channel for _ in range(16) for channel in (0.34, 0.42, 0.30, 1.0)]
image.pack()
material = bpy.data.materials.new("CV_NATIVE_RIG_INPUT_ONLY")
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
bsdf = nodes.get("Principled BSDF")
texture = nodes.new("ShaderNodeTexImage")
texture.image = image
links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
body.data.materials.clear()
body.data.materials.append(material)

# Meshy-A geometry integrity receipt, emitted before export.
print({
    "object": body.name,
    "vertices": len(body.data.vertices),
    "edges": len(body.data.edges),
    "polygons": len(body.data.polygons),
    "uv_layers": len(body.data.uv_layers),
})

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    use_selection=False,
    export_apply=False,
    export_animations=False,
)
