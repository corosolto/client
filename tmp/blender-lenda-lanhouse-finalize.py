"""Finaliza a Lenda da Lan House sobre o rig Meshy escolhido.

Remove causalmente a mochila/caixas laterais que o image-to-3D inventou e reconstrói
uma única torre compacta, o mouse de bolinha, fichas e o cabo em sockets do esqueleto.
O modo ``mutant`` reinsere uma mochila-slab para provar que o contrato visual morde.

Uso:
  blender --background --python tmp/blender-lenda-lanhouse-finalize.py -- \
    input.glb output.glb receipt.json [clean|mutant]
"""
import json
import math
import pathlib
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector


args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) not in (3, 4):
    raise SystemExit("uso: script -- input.glb output.glb receipt.json [clean|mutant]")
source = pathlib.Path(args[0]).resolve()
output = pathlib.Path(args[1]).resolve()
receipt_path = pathlib.Path(args[2]).resolve()
mode = args[3] if len(args) == 4 else "clean"
if mode not in {"clean", "mutant"}:
    raise SystemExit(f"modo inválido: {mode}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
body = max(
    (obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == armature),
    key=lambda obj: len(obj.data.vertices),
)

# O importador do Blender cria uma icosfera auxiliar para exibir bones. Ela não pertence
# ao documento glTF e não pode entrar no join do personagem.
for obj in list(bpy.context.scene.objects):
    if obj.type == "MESH" and obj != body and obj.parent is None and not obj.data.materials:
        bpy.data.objects.remove(obj, do_unlink=True)


def connected_components(obj):
    mesh = obj.data
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    colocated = {}
    for vertex in mesh.vertices:
        key = tuple(round(value, 5) for value in vertex.co)
        colocated.setdefault(key, []).append(vertex.index)
    for indices in colocated.values():
        for duplicate in indices[1:]:
            adjacency[indices[0]].add(duplicate)
            adjacency[duplicate].add(indices[0])
    unseen = set(range(len(mesh.vertices)))
    result = []
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
        points = [obj.matrix_world @ mesh.vertices[index].co for index in vertices]
        minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
        maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
        result.append({
            "vertices": vertices,
            "minimum": minimum,
            "maximum": maximum,
            "center": (minimum + maximum) * 0.5,
            "span": maximum - minimum,
        })
    return result


# Seleção por geometria em metros, e não por índice de componente: continua válida se o
# exportador reordenar vértices. Os três predicados identificam exatamente o slab traseiro,
# as duas caixas laterais duplicadas e o antigo prop branco comprido do quadril.
removed = []
delete_vertices = set()
for component in connected_components(body):
    center, span = component["center"], component["span"]
    backpack_slab = center.y > 0.115 and 0.98 < center.z < 1.36 and span.z > 0.44 and span.x > 0.30
    side_box = (
        center.y > 0.095
        and 0.92 < center.z < 1.14
        and span.z > 0.18
        and span.x < 0.115
        and abs(center.x) > 0.15
    )
    old_mouse_cluster = (
        center.y < -0.09
        and 0.73 < center.z < 0.88
        and 0.12 < center.x < 0.24
        and span.z > 0.12
    )
    old_mouse_loop = (
        center.y < -0.18
        and 0.68 < center.z < 0.84
        and 0.06 < center.x < 0.13
        and span.z > 0.14
    )
    old_ethernet_cluster = (
        -0.22 < center.x < -0.06
        and center.y < -0.14
        and 0.70 < center.z < 0.84
        and span.z > 0.05
    )
    old_back_fragment = (
        center.y > 0.06
        and 0.88 < center.z < 1.15
        and max(span) < 0.12
    )
    if backpack_slab or side_box or old_mouse_cluster or old_mouse_loop or old_ethernet_cluster or old_back_fragment:
        if backpack_slab:
            label = "backpack_slab"
        elif side_box:
            label = "side_box"
        elif old_mouse_cluster:
            label = "old_mouse_cluster"
        elif old_mouse_loop:
            label = "old_mouse_loop"
        elif old_ethernet_cluster:
            label = "old_ethernet_cluster"
        else:
            label = "old_back_fragment"
        removed.append({
            "label": label,
            "vertices": len(component["vertices"]),
            "center": [round(v, 6) for v in center],
            "span": [round(v, 6) for v in span],
        })
        delete_vertices.update(component["vertices"])

if not any(row["label"] == "backpack_slab" for row in removed):
    raise RuntimeError("a mochila-slab causal não foi encontrada; recuso gerar correção silenciosa")
if sum(row["label"] == "side_box" for row in removed) < 2:
    raise RuntimeError(f"esperava ao menos as duas caixas laterais; removi {removed}")
if not any(row["label"] == "old_mouse_cluster" for row in removed):
    raise RuntimeError("o cluster do mouse antigo não foi encontrado")
if not any(row["label"] == "old_mouse_loop" for row in removed):
    raise RuntimeError("o loop branco do mouse antigo não foi encontrado")
if sum(row["label"] == "old_ethernet_cluster" for row in removed) < 2:
    raise RuntimeError("o cabo Ethernet antigo não foi identificado por inteiro")
if sum(row["label"] == "old_back_fragment" for row in removed) < 2:
    raise RuntimeError("os fragmentos flutuantes do backpack não foram encontrados")

bm = bmesh.new()
bm.from_mesh(body.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[index] for index in sorted(delete_vertices)], context="VERTS")
bm.to_mesh(body.data)
bm.free()
body.data.update()


def material(name, color, metallic=0.0, roughness=0.62, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    value.diffuse_color = (*color, 1.0)
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if bsdf.inputs.get("IOR Level"):
        bsdf.inputs["IOR Level"].default_value = 0.0
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 0.35
    return value


beige = material("CS_LAN_BEIGE_PLASTIC", (0.43, 0.39, 0.28), 0.0, 0.78)
dark = material("CS_LAN_DARK_PLASTIC", (0.018, 0.022, 0.028), 0.0, 0.66)
vent = material("CS_LAN_VENT_METAL", (0.055, 0.060, 0.067), 0.35, 0.50)
red = material("CS_LAN_MOUSE_TRACKBALL", (0.72, 0.025, 0.018), 0.0, 0.36)
blue = material("CS_LAN_ETHERNET_BLUE", (0.015, 0.12, 0.58), 0.0, 0.44)
token_materials = [
    material("CS_LAN_TOKEN_RED", (0.78, 0.035, 0.025), 0.0, 0.48),
    material("CS_LAN_TOKEN_YELLOW", (0.96, 0.62, 0.025), 0.0, 0.48),
    material("CS_LAN_TOKEN_GREEN", (0.035, 0.58, 0.12), 0.0, 0.48),
    material("CS_LAN_TOKEN_BLUE", (0.02, 0.23, 0.84), 0.0, 0.48),
    material("CS_LAN_TOKEN_PURPLE", (0.46, 0.05, 0.73), 0.0, 0.48),
    material("CS_LAN_TOKEN_ORANGE", (0.95, 0.20, 0.025), 0.0, 0.48),
]


def rigid_skin(obj, bone="Hips"):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # O rig Meshy trabalha em centímetros locais sob Armature(scale=.01).
    for vertex in obj.data.vertices:
        vertex.co *= 100.0
    obj.parent = armature
    obj.matrix_parent_inverse = Matrix.Identity(4)
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    return obj


def add_box(name, dimensions, location, mat, bone="Hips", rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("soft_edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)


def add_segment(name, start, end, radius, mat, bone="Hips", vertices=12):
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)


def add_ellipsoid(name, location, scale, mat, bone="Hips", subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)


def add_torus(name, location, major_radius, minor_radius, mat, bone="Hips", rotation=(math.pi / 2, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=24,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return rigid_skin(obj, bone)


# Uma única torre compacta e central. O topo fica abaixo da linha dos ombros e a
# profundidade cresce só para trás; frente, clavículas e volume da coronha seguem livres.
add_box("CS_LAN_PC_TOWER", (0.292, 0.112, 0.366), (0.0, 0.168, 1.230), beige, "Spine01", bevel=0.018)
add_box("CS_LAN_PC_REAR_PANEL", (0.250, 0.012, 0.322), (0.0, 0.228, 1.230), dark, "Spine01", bevel=0.009)
add_torus("CS_LAN_PC_FAN_RING", (0.0, 0.238, 1.306), 0.061, 0.008, vent, "Spine01")
for index in range(8):
    angle = index * math.tau / 8
    start = (math.cos(angle) * 0.013, 0.241, 1.306 + math.sin(angle) * 0.013)
    end = (math.cos(angle) * 0.052, 0.241, 1.306 + math.sin(angle) * 0.052)
    add_segment(f"CS_LAN_PC_FAN_SPOKE_{index}", start, end, 0.0032, vent, "Spine01", 8)
for index in range(5):
    add_box(
        f"CS_LAN_PC_SLOT_{index}",
        (0.098, 0.007, 0.010),
        (-0.060, 0.239, 1.166 - index * 0.022),
        vent,
        "Spine01",
        bevel=0.002,
    )

# Mouse de bolinha de fato: carcaça baixa, trackball vermelha saliente e cabo curto.
add_ellipsoid("CS_LAN_BALL_MOUSE_BODY", (0.205, -0.205, 0.765), (0.055, 0.035, 0.082), beige, "Hips", 3)
add_ellipsoid("CS_LAN_BALL_MOUSE_RED_BALL", (0.205, -0.237, 0.778), (0.027, 0.014, 0.027), red, "Hips", 2)
add_segment("CS_LAN_MOUSE_CABLE", (0.205, -0.198, 0.835), (0.185, -0.176, 0.895), 0.005, dark, "Hips", 10)

# Seis fichas originais, sem texto/logos, presas por argola curta e abaixo do cinto.
add_torus("CS_LAN_TOKEN_KEYRING", (0.286, -0.190, 0.865), 0.026, 0.004, vent, "Hips")
for index, mat in enumerate(token_materials):
    x = 0.264 + (index % 2) * 0.035
    z = 0.817 - (index // 2) * 0.038
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.016,
        depth=0.007,
        location=(x, -0.214, z),
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    token = bpy.context.object
    token.name = f"CS_LAN_TOKEN_{index}"
    token.data.materials.append(mat)
    rigid_skin(token, "Hips")
    add_segment(f"CS_LAN_TOKEN_CHAIN_{index}", (0.286, -0.190, 0.850), (x, -0.205, z + 0.016), 0.0025, vent, "Hips", 8)

# O cabo azul já existia, mas era apenas uma mancha. A espira e o RJ45 geométricos
# tornam o prop verificável e mantêm tudo abaixo da mão em pose de arma.
add_torus("CS_LAN_ETHERNET_COIL", (-0.278, -0.174, 0.790), 0.073, 0.007, blue, "Hips")
add_box("CS_LAN_ETHERNET_RJ45", (0.028, 0.016, 0.038), (-0.327, -0.194, 0.694), blue, "Hips", bevel=0.003)
add_segment("CS_LAN_ETHERNET_TAIL", (-0.304, -0.180, 0.735), (-0.327, -0.190, 0.712), 0.005, blue, "Hips", 10)

if mode == "mutant":
    # Mutação causal: reintroduz exatamente a massa que ocultava torre e silhueta.
    add_box("MUTANT_BACKPACK_SLAB", (0.410, 0.170, 0.545), (0.0, 0.135, 1.190), beige, "Spine01", bevel=0.030)

# Um único SkinnedMesh, mesmo contrato dos personagens já aceitos.
bpy.ops.object.select_all(action="DESELECT")
content_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == armature]
for obj in content_meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = "lenda_lanhouse_final" if mode == "clean" else "lenda_lanhouse_mutant"

output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_yup=True)

receipt = {
    "source": str(source),
    "output": str(output),
    "mode": mode,
    "removedComponents": removed,
    "removedVertexCount": len(delete_vertices),
    "meshCountBeforeJoin": len(content_meshes),
    "finalVertices": len(body.data.vertices),
    "bones": len(armature.data.bones),
    "causalDefect": "provider backpack slab plus duplicated side boxes",
    "canonicalProps": [
        "vintage headset preserved from source",
        "single compact beige PC tower with rear fan",
        "mechanical mouse with red trackball",
        "six blank colored time tokens",
        "blue coiled Ethernet cable with RJ45",
    ],
}
receipt_path.parent.mkdir(parents=True, exist_ok=True)
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"LENDA_LANHOUSE_{mode.upper()}={output}")
print(f"RECEIPT={receipt_path}")
