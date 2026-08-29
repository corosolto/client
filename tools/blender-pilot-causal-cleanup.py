"""Remove causalmente os componentes legados dos pilotos Programador/Motoca.

Entrada obrigatória: os GLBs reprovados pelo crítico limpo de 11/08/2026.
O SHA trava a seleção para que ranks de componente nunca sejam aplicados a outra malha.

Uso:
  blender --background --python tools/blender-pilot-causal-cleanup.py -- \
    programador|motoca entrada.glb saida.glb recibo.json
"""
import hashlib, json, pathlib, sys
from collections import defaultdict

import bmesh
import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(argv) != 4 or argv[0] not in {'programador', 'motoca'}:
    raise SystemExit('uso: blender ... -- programador|motoca entrada.glb saida.glb recibo.json')
mode = argv[0]
source, output, receipt = map(lambda value: pathlib.Path(value).resolve(), argv[1:])
EXPECTED_SHA = {
    'programador': '4913e7261d43b2313eaa45e7cd711f109c4830a8e7ceb6e11456d609526167b1',
    'motoca': '0837569e76c152d638aff32047193011373ca8226b703ae14039d2c94f07706a',
}

def sha256(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def face_counts(body):
    counts = defaultdict(int)
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        counts[slot.material.name if slot.material else '<none>'] += 1
    return dict(counts)

def components(body):
    vertex_faces = defaultdict(list)
    for face in body.data.polygons:
        for vertex in face.vertices: vertex_faces[vertex].append(face.index)
    remaining = set(range(len(body.data.polygons))); result = []; component_id = 0
    while remaining:
        seed = remaining.pop(); queue = [seed]; faces = []
        while queue:
            index = queue.pop(); faces.append(index)
            for vertex in body.data.polygons[index].vertices:
                for adjacent in vertex_faces[vertex]:
                    if adjacent in remaining: remaining.remove(adjacent); queue.append(adjacent)
        vertices = {vertex for index in faces for vertex in body.data.polygons[index].vertices}
        points = [body.matrix_world @ body.data.vertices[index].co for index in vertices]
        materials = defaultdict(int)
        for index in faces:
            slot = body.material_slots[body.data.polygons[index].material_index]
            materials[slot.material.name if slot.material else '<none>'] += 1
        result.append({'component': component_id, 'faceIndices': faces, 'faces': len(faces),
            'vertices': len(vertices), 'materials': dict(materials),
            'bounds': {axis: [min(point[i] for point in points), max(point[i] for point in points)] for i, axis in enumerate('xyz')}})
        component_id += 1
    result.sort(key=lambda item: item['faces'], reverse=True)
    for rank, item in enumerate(result): item['rank'] = rank
    return result

def delete_faces(body, face_indices):
    bm = bmesh.new(); bm.from_mesh(body.data); bm.faces.ensure_lookup_table()
    doomed = [bm.faces[index] for index in sorted(face_indices)]
    bmesh.ops.delete(bm, geom=doomed, context='FACES')
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context='VERTS')
    bm.to_mesh(body.data); bm.free(); body.data.update()
    return len(doomed)

def material(name, color, metallic=0, roughness=.7, alpha=1):
    value = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    value.diffuse_color = (*color, alpha); value.use_nodes = True
    bsdf = value.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, alpha)
    bsdf.inputs['Metallic'].default_value = metallic; bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1: value.surface_render_method = 'DITHERED'
    return value

def rigid_group(obj, bone):
    group = obj.vertex_groups.new(name=bone); group.add(range(len(obj.data.vertices)), 1, 'REPLACE')

def cube(name, location, dimensions, mat, bone):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object; obj.name = name; obj.dimensions = dimensions
    bpy.context.view_layer.objects.active = obj; obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(mat); rigid_group(obj, bone); obj.select_set(False)
    return obj

if sha256(source) != EXPECTED_SHA[mode]:
    raise SystemExit(f'{mode}: SHA de entrada inesperado; seleção causal recusada ({sha256(source)})')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
body = bpy.data.objects.get('char1')
if not body or body.type != 'MESH': raise SystemExit('char1 ausente')
before_counts = face_counts(body)
before_bones = sorted(bone.name for armature in bpy.data.armatures for bone in armature.bones)
before_animations = sorted(action.name for action in bpy.data.actions)

record = {'mode': mode, 'source': str(source), 'sourceSha256': sha256(source), 'blender': bpy.app.version_string,
    'beforeFacesByMaterial': before_counts, 'beforeBones': before_bones, 'beforeAnimations': before_animations}

if mode == 'programador':
    labels = components(body)
    # O laudo marcou asa/placa e hastes como um único cluster visual. Estes sete
    # componentes Material_1 são exatamente o cluster original, antes encoberto
    # por LAN_Beige; o SHA acima garante que ranks não migrem para roupa/corpo.
    legacy_ranks = {11, 14, 22, 33, 46, 55, 64, 76, 96, 154}
    selected = [item for item in labels if item['rank'] in legacy_ranks]
    if {item['rank'] for item in selected} != legacy_ranks or any(set(item['materials']) != {'Material_1'} for item in selected):
        raise SystemExit('inventário do cluster legado divergiu')
    doomed = {index for item in selected for index in item['faceIndices']}
    # O mouse/trackball e botões baixos eram o segundo volume pendurado por haste.
    # A decisão atual deixa somente teclado preso ao dorso + caneca na presilha.
    removed_named = defaultdict(int)
    replaced_keyboard = {'LAN_Keyboard_Shell', 'LAN_Keyboard_Keys', 'LAN_Keyboard_Mount'}
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        name = slot.material.name if slot.material else ''
        center_z = (body.matrix_world @ polygon.center).z
        if name in {'LAN_Mouse_Rev2', 'LAN_Trackball_Red', 'LAN_Cable_Visible'} or name in replaced_keyboard or (name == 'LAN_Mouse_Buttons' and center_z < 1.12):
            doomed.add(polygon.index); removed_named[name] += 1
    removed_faces = delete_faces(body, doomed)
    shell_mat = material('LAN_Keyboard_Shell', (.025, .030, .035), metallic=.08, roughness=.72)
    key_mat = material('LAN_Keyboard_Keys', (.16, .15, .13), roughness=.82)
    mount_mat = material('LAN_Keyboard_Mount', (.012, .015, .018), metallic=.12, roughness=.74)
    # Teclado cruza o dorso horizontalmente: largura em X, face em +Y e duas
    # pontes curtas entrando na mochila. O passe anterior trocou X/Y e produziu
    # barras verticais que só pareciam teclado no ângulo lateral.
    new_parts = [cube('LAN_Keyboard_Back', (.03, .172, 1.355), (.260, .034, .135), shell_mat, 'Spine')]
    for row, z in enumerate((1.315, 1.345, 1.375, 1.405)):
        for column, x in enumerate((-.070, -.030, .010, .050, .090)):
            new_parts.append(cube(f'LAN_Key_{row}_{column}', (x, .193, z), (.030, .008, .018), key_mat, 'Spine'))
    new_parts += [
        cube('LAN_Keyboard_Mount_Left', (-.075, .130, 1.355), (.030, .080, .034), mount_mat, 'Spine'),
        cube('LAN_Keyboard_Mount_Right', (.105, .130, 1.355), (.030, .080, .034), mount_mat, 'Spine'),
    ]
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True)
    for part in new_parts: part.select_set(True)
    bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
    record.update({'operation': 'delete connected legacy keyboard/wing/stem components; delete legacy mouse/trackball/low buttons',
        'componentLabels': [{key: value for key, value in item.items() if key != 'faceIndices'} for item in selected],
        'removedComponentRanks': sorted(legacy_ranks), 'removedNamedFaces': dict(removed_named), 'removedFaces': removed_faces,
        'newKeyboard': {'objects': len(new_parts), 'boundsBlender': {'x': [-.100, .160], 'y': [.090, .197], 'z': [1.2875, 1.4225]}, 'socket': 'Spine'}})
else:
    removed_names = {'CS_HARD_Motofrete_Helmet_FullFace', 'Motofrete_Visor_Smoke'}
    doomed = set(); removed_named = defaultdict(int)
    for polygon in body.data.polygons:
        slot = body.material_slots[polygon.material_index]
        name = slot.material.name if slot.material else ''
        if name in removed_names: doomed.add(polygon.index); removed_named[name] += 1
    if removed_named['CS_HARD_Motofrete_Helmet_FullFace'] < 4000 or removed_named['Motofrete_Visor_Smoke'] < 40:
        raise SystemExit(f'inventário do capacete reprovado divergiu: {dict(removed_named)}')
    removed_faces = delete_faces(body, doomed)
    shell_mat = material('CS_HARD_Motofrete_Helmet_FullFace', (.004, .006, .009), metallic=.12, roughness=.64)
    visor_mat = material('Motofrete_Visor_Smoke', (.012, .020, .028), metallic=.18, roughness=.18, alpha=1)
    # Uma única superfície fechada: a viseira é uma região curva desta mesma
    # topologia, não um objeto/aro/placa sobreposto. A metade inferior da elipse
    # é a queixeira contínua da própria casca.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, location=(0, 0, 1.590), scale=(.140, .155, .205))
    helmet = bpy.context.object; helmet.name = 'Motofrete_Helmet_FullFace_OneShell'
    bpy.context.view_layer.objects.active = helmet; helmet.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for vertex in helmet.data.vertices:
        world = helmet.matrix_world @ vertex.co
        if world.y < 0: vertex.co.y *= 1.60
        if world.y < -.04 and world.z < 1.515: vertex.co.y *= 1.08
        if world.z < 1.500: vertex.co.x *= .72
    helmet.data.materials.append(shell_mat); helmet.data.materials.append(visor_mat)
    visor_faces = 0
    for polygon in helmet.data.polygons:
        world = helmet.matrix_world @ polygon.center
        polygon.use_smooth = True
        if world.y < -.082 and 1.505 <= world.z <= 1.690 and abs(world.x) <= .122:
            polygon.material_index = 1; visor_faces += 1
        else: polygon.material_index = 0
    if visor_faces < 100: raise SystemExit(f'visor contíguo pequeno: {visor_faces}')
    rigid_group(helmet, 'Head')
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); helmet.select_set(True)
    bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
    record.update({'operation': 'delete all prior fullface/visor faces; create one closed connected full-face shell with one contiguous visor region',
        'removedNamedFaces': dict(removed_named), 'removedFaces': removed_faces,
        'newTopology': {'objects': 1, 'connectedShells': 1, 'separateVisorObjects': 0, 'visorFaces': visor_faces,
            'boundsBlender': {'x': [-.140, .140], 'y': [-.268, .155], 'z': [1.385, 1.795]}}})

validation_changed = body.data.validate(verbose=True, clean_customdata=True); body.data.update()
after_counts = face_counts(body)
after_bones = sorted(bone.name for armature in bpy.data.armatures for bone in armature.bones)
if after_bones != before_bones: raise SystemExit('hierarquia do rig mudou')
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_yup=True)
record.update({'output': str(output), 'outputSha256': sha256(output), 'afterFacesByMaterial': after_counts,
    'boneHierarchyPreserved': len(after_bones), 'meshValidationChanged': validation_changed,
    'scope': 'Programador: legacy props only; Motoca: helmet/visor only. M4/body/bag/phone/rig/anims untouched.'})
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'PILOT_CAUSAL_CLEANUP={output} mode={mode} sha256={record["outputSha256"]}')
