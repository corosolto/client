import bmesh
import bpy
from pathlib import Path
from mathutils import Vector

# Inspect the freshly cut donor mesh before any cap is created.  This lets the
# build script distinguish shoulder cuts from the legitimate wrist cuffs by
# position instead of the unreliable "two largest loops" heuristic.
bpy.ops.wm.read_factory_settings(use_empty=True)
donor = Path.home() / "Downloads" / "ak-12animated.glb"
bpy.ops.import_scene.gltf(filepath=str(donor))
obj = bpy.data.objects["Requests_Studio_Hands_1"]
rig = next(candidate for candidate in bpy.data.objects if candidate.type == "ARMATURE")

upper_groups = {
    group.index
    for group in obj.vertex_groups
    if group.name in {"upper_arm.L_metarig", "upper_arm.R_metarig"}
}
bm_cut = bmesh.new()
bm_cut.from_mesh(obj.data)
deleting = [
    vertex
    for vertex in bm_cut.verts
    if sum(
        element.weight
        for element in obj.data.vertices[vertex.index].groups
        if element.group in upper_groups
    ) > 0.95
]
bmesh.ops.delete(bm_cut, geom=deleting, context="VERTS")
bm_cut.to_mesh(obj.data)
bm_cut.free()

bm = bmesh.new()
bm.from_mesh(obj.data)
for bone_name in (
    "upper_arm.L_metarig",
    "forearm.L_metarig",
    "hand.L_metarig",
    "upper_arm.R_metarig",
    "forearm.R_metarig",
    "hand.R_metarig",
):
    bone = rig.data.bones[bone_name]
    print(
        "BONE",
        bone_name,
        "head",
        tuple(round(value, 4) for value in bone.head_local),
        "tail",
        tuple(round(value, 4) for value in bone.tail_local),
    )
remaining = {edge for edge in bm.edges if len(edge.link_faces) == 1}
components = []
while remaining:
    seed = remaining.pop()
    component = [seed]
    frontier = [seed]
    while frontier:
        edge = frontier.pop()
        linked_edges = {
            linked
            for vertex in edge.verts
            for linked in vertex.link_edges
            if linked in remaining
        }
        for linked in linked_edges:
            remaining.remove(linked)
            component.append(linked)
            frontier.append(linked)
    components.append(component)

for index, edges in enumerate(sorted(components, key=len, reverse=True)):
    vertices = {vertex for edge in edges for vertex in edge.verts}
    center = sum((vertex.co for vertex in vertices), Vector()) / len(vertices)
    distances = {}
    for side in ("L", "R"):
        for role, bone_name in (
            ("shoulder", f"upper_arm.{side}_metarig"),
            ("wrist", f"hand.{side}_metarig"),
        ):
            distances[f"{role}.{side}"] = round(
                (center - rig.data.bones[bone_name].head_local).length, 4
            )
    print(
        "SLEEVE_BOUNDARY",
        index,
        "edges",
        len(edges),
        "center",
        tuple(round(value, 4) for value in center),
        "distances",
        distances,
    )
bm.free()
