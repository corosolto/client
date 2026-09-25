"""Audita rig e skin de um personagem GLB usando o importador do Blender.

Uso:
  blender --background --python tools/blender-character-audit.py -- \
    public/models/characters/lobisomem.glb /tmp/lobisomem-blender-audit.json \
    /tmp/lobisomem-blender-renders

O script não salva nem altera o GLB. Ele mede o asset importado, inclusive arquivos que o
inspetor glTF em Node não consegue abrir por extensões de textura opcionais.
"""

import json
import math
import pathlib
import sys

import bpy
from mathutils import Vector


def args_after_double_dash():
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def percentile(values, q):
    if not values:
        return None
    ordered = sorted(values)
    pos = (len(ordered) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return ordered[lo]
    return ordered[lo] * (hi - pos) + ordered[hi] * (pos - lo)


def point_segment_distance(point, start, end):
    segment = end - start
    denom = segment.length_squared
    if denom == 0:
        return (point - start).length
    t = max(0.0, min(1.0, (point - start).dot(segment) / denom))
    return (point - (start + segment * t)).length


def rounded_vec(value):
    return [round(component, 6) for component in value]


argv = args_after_double_dash()
if not argv:
    raise SystemExit("uso: blender --background --python <script> -- <entrada.glb> [saida.json]")

source = pathlib.Path(argv[0]).resolve()
output = pathlib.Path(argv[1]).resolve() if len(argv) > 1 else None
render_dir = pathlib.Path(argv[2]).resolve() if len(argv) > 2 else None
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")

armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
# O importador glTF do Blender cria uma Icosphere de visualização e a aponta como
# `custom_shape` de cada pose bone. Ela existe na cena do Blender, mas não é nó/mesh do
# documento glTF (conferível com NodeIO/validator). Contá-la inventava um segundo mesh
# em todo rig Meshy. Separa helper de conteúdo antes de medir bounds e triângulos.
custom_shape_helpers = {
    pose_bone.custom_shape
    for armature in armatures
    for pose_bone in armature.pose.bones
    if pose_bone.custom_shape is not None
}
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj not in custom_shape_helpers]

result = {
    "source": str(source),
    "blender": bpy.app.version_string,
    "armatureCount": len(armatures),
    "meshCount": len(meshes),
    "importHelperMeshes": sorted(obj.name for obj in custom_shape_helpers),
    "armatures": [],
    "meshes": [],
    "focusBones": {},
}

bone_world = {}
for armature in armatures:
    bones = []
    for bone in armature.data.bones:
        head = armature.matrix_world @ bone.head_local
        tail = armature.matrix_world @ bone.tail_local
        bone_world[bone.name] = (head, tail)
        bones.append(
            {
                "name": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "head": rounded_vec(head),
                "tail": rounded_vec(tail),
                "length": round((tail - head).length, 6),
            }
        )
    result["armatures"].append(
        {
            "name": armature.name,
            "scale": rounded_vec(armature.scale),
            "rotationEuler": rounded_vec(armature.rotation_euler),
            "boneCount": len(bones),
            "bones": bones,
        }
    )

focus_tokens = ("shoulder", "arm", "forearm", "hand", "thumb", "index", "middle", "ring", "pinky")
focus_names = {
    name
    for name in bone_world
    if any(token in name.lower().replace("_", "") for token in focus_tokens)
}
focus_samples = {name: [] for name in focus_names}

for mesh in meshes:
    mesh.data.calc_loop_triangles()
    world_vertices = [mesh.matrix_world @ vertex.co for vertex in mesh.data.vertices]
    if world_vertices:
        minimum = Vector((min(v.x for v in world_vertices), min(v.y for v in world_vertices), min(v.z for v in world_vertices)))
        maximum = Vector((max(v.x for v in world_vertices), max(v.y for v in world_vertices), max(v.z for v in world_vertices)))
    else:
        minimum = maximum = Vector((0.0, 0.0, 0.0))

    result["meshes"].append(
        {
            "name": mesh.name,
            "parent": mesh.parent.name if mesh.parent else None,
            "vertices": len(mesh.data.vertices),
            "triangles": len(mesh.data.loop_triangles),
            "materials": [material.name for material in mesh.data.materials if material],
            "vertexGroups": [group.name for group in mesh.vertex_groups],
            "armatureModifiers": [
                modifier.object.name if modifier.object else None
                for modifier in mesh.modifiers
                if modifier.type == "ARMATURE"
            ],
            "hideRender": mesh.hide_render,
            "boundsMin": rounded_vec(minimum),
            "boundsMax": rounded_vec(maximum),
        }
    )

    group_names = {group.index: group.name for group in mesh.vertex_groups}
    for vertex, world_position in zip(mesh.data.vertices, world_vertices):
        for membership in vertex.groups:
            bone_name = group_names.get(membership.group)
            if bone_name not in focus_samples or membership.weight < 0.05:
                continue
            segment = bone_world.get(bone_name)
            distance = point_segment_distance(world_position, *segment) if segment else None
            focus_samples[bone_name].append((membership.weight, world_position, distance))

for name in sorted(focus_samples):
    samples = focus_samples[name]
    if not samples:
        continue
    total_weight = sum(weight for weight, _, _ in samples)
    centroid = sum((position * weight for weight, position, _ in samples), Vector()) / total_weight
    distances = [distance for _, _, distance in samples if distance is not None]
    result["focusBones"][name] = {
        "verticesWeightGte005": len(samples),
        "weightSum": round(total_weight, 6),
        "weightedCentroid": rounded_vec(centroid),
        "distanceToRestBoneP50": round(percentile(distances, 0.5), 6) if distances else None,
        "distanceToRestBoneP95": round(percentile(distances, 0.95), 6) if distances else None,
        "distanceToRestBoneMax": round(max(distances), 6) if distances else None,
    }

if render_dir:
    render_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AuditWorld")
    scene.world.color = (0.035, 0.035, 0.045)

    all_world_vertices = [
        obj.matrix_world @ vertex.co
        for obj in meshes
        for vertex in obj.data.vertices
    ]
    minimum = Vector(tuple(min(v[i] for v in all_world_vertices) for i in range(3)))
    maximum = Vector(tuple(max(v[i] for v in all_world_vertices) for i in range(3)))
    center = (minimum + maximum) * 0.5
    span = maximum - minimum
    distance = max(span) * 1.8

    bpy.ops.object.camera_add(location=(0, -distance, center.z))
    camera = bpy.context.object
    camera.data.lens = 55
    scene.camera = camera

    def point_at(obj, target):
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

    for location, energy, size in [
        ((-distance * 0.7, -distance * 0.8, maximum.z + span.z * 0.4), 1100, 4.0),
        ((distance * 0.8, distance * 0.4, center.z), 700, 3.0),
    ]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        point_at(light, center)

    renders = []
    for label, direction in [
        ("front", Vector((0, -1, 0))),
        ("left", Vector((-1, 0, 0))),
        ("back", Vector((0, 1, 0))),
    ]:
        camera.location = center + direction * distance
        camera.location.z = center.z
        point_at(camera, center)
        render_path = render_dir / f"{source.stem}-{label}.png"
        scene.render.filepath = str(render_path)
        bpy.ops.render.render(write_still=True)
        renders.append(str(render_path))
    result["renders"] = renders

encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
if output:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(encoded, encoding="utf-8")
    print(f"AUDIT_JSON={output}")
else:
    print(encoded)
