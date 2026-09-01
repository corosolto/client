"""Cria o molde de mãos FP a partir de uma anatomia CC0, com luvas próprias.

O arquivo de origem CC0 é usado somente como molde de anatomia/ponderação. Esta etapa
recorta os antebraços, fixa poses específicas de empunhadura e substitui os materiais
por luvas e mangas criadas para o viewmodel. Nada de Counter-Strike ou dos vídeos de
referência é incorporado ao GLB exportado.
"""
from pathlib import Path
from mathutils import Matrix, Vector
import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path('/tmp/fpvm-source/oga-20260822/arms_low_poly.blend')
OUT = ROOT / 'public/models/viewmodels/fpvm_hands.glb'
PREVIEW = ROOT / 'public/models/viewmodels/fpvm_hands_preview.png'
BLEND = ROOT / 'public/models/viewmodels/fpvm_hands.blend'


def material(name, color, metallic=0.0, roughness=.52):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def group(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def cube(name, location, scale, mat, parent, bevel=.006):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new('rounded_edges', 'BEVEL')
    modifier.width = bevel
    modifier.segments = 3
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def make_source_pose():
    """Abre o molde CC0 e fecha dedos individualmente, sem exportar seu rig."""
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    mesh = bpy.data.objects['Arm']
    rig = bpy.data.objects['rig']
    # A pose de garra é explícita por dedo. O indicador direito fica menos fechado
    # para preservar a leitura do gatilho; as demais falanges abraçam o grip.
    for side in ('R', 'L'):
        for finger in ('f_index', 'f_middle', 'f_ring', 'f_pinky'):
            for part, angle in enumerate((.42, .63, .46), 1):
                bone = rig.pose.bones.get(f'{finger}.{part:02d}.{side}')
                if bone:
                    bone.rotation_mode = 'XYZ'
                    bone.rotation_euler.x = angle if side == 'R' else -angle
        for part, angle in enumerate((.35, .42, .25), 1):
            bone = rig.pose.bones.get(f'thumb.{part:02d}.{side}')
            if bone:
                bone.rotation_mode = 'XYZ'
                bone.rotation_euler.x = -angle if side == 'R' else angle
    bpy.context.view_layer.update()
    return mesh, rig


def source_hand(mesh, rig, side, glove, sleeve, parent):
    """Extrai apenas mão+antebraço avaliados, mantendo a malha anatômica CC0."""
    keep = [
        f'DEF-hand.{side}', f'DEF-forearm.{side}', f'DEF-forearm.{side}.001',
        f'DEF-palm.01.{side}', f'DEF-palm.02.{side}', f'DEF-palm.03.{side}', f'DEF-palm.04.{side}',
        f'DEF-thumb.01.{side}', f'DEF-thumb.02.{side}', f'DEF-thumb.03.{side}',
    ]
    for finger in ('f_index', 'f_middle', 'f_ring', 'f_pinky'):
        keep.extend(f'DEF-{finger}.{part:02d}.{side}' for part in range(1, 4))
    keep_indices = {mesh.vertex_groups[name].index for name in keep if mesh.vertex_groups.get(name)}
    selected = set()
    for vertex in mesh.data.vertices:
        if any(weight.group in keep_indices and weight.weight > .08 for weight in vertex.groups):
            selected.add(vertex.index)

    duplicate = mesh.copy()
    duplicate.data = mesh.data.copy()
    bpy.context.collection.objects.link(duplicate)
    duplicate.name = f'FPVM_GLOVE_{side}_MESH'
    bpy.context.view_layer.objects.active = duplicate
    duplicate.select_set(True)
    for modifier in list(duplicate.modifiers):
        if modifier.type == 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bm = bmesh.new()
    bm.from_mesh(duplicate.data)
    doomed = [vertex for vertex in bm.verts if vertex.index not in selected]
    bmesh.ops.delete(bm, geom=doomed, context='VERTS')
    bm.to_mesh(duplicate.data)
    bm.free()

    # O nó da mão é o grip socket. Todo o molde fica local a ele, pronto para ser
    # encaixado pelo runtime independentemente da escala da arma.
    anchor = rig.pose.bones[f'DEF-hand.{side}'].head.copy()
    duplicate.data.transform(Matrix.Translation(-anchor))
    duplicate.matrix_world = Matrix.Identity(4)
    duplicate.parent = parent
    duplicate.data.materials.clear()
    duplicate.data.materials.append(glove)
    duplicate.data.materials.append(sleeve)
    # A extremidade mais afastada do grip vira manga: contraste no punho, sem textura
    # de origem, com a leitura de luva mantida nos dedos.
    for polygon in duplicate.data.polygons:
        polygon.material_index = 1 if polygon.center.length > .19 else 0
        polygon.use_smooth = True
    return duplicate


def make_magazine(parent, mag_mat):
    prop = group('FPVM_RELOAD_PROPS', parent)
    # O molde inteiro passa por uma escala de visualização no jogo. Estas peças já
    # nascem compensadas para a recarga ler à distância: carregador separado, alto e
    # escuro, em vez de um detalhe microscópico que parece a arma simplesmente baixar.
    mag = cube('FPVM_MAGAZINE', (0, -.24, .07), (.055, .17, .035), mag_mat, prop, .008)
    mag.rotation_euler = (.12, .0, .08)
    bolt = cube('FPVM_BOLT_HANDLE', (-.06, .025, .16), (.014, .014, .055), mag_mat, prop, .006)
    bolt.hide_render = True
    bolt.hide_viewport = True
    return prop


def preview():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    world = bpy.data.worlds.new('FPVM review world') if scene.world is None else scene.world
    scene.world = world
    world.color = (.012, .018, .028)
    bpy.ops.object.camera_add(location=(.78, -1.15, .42))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, (0, 0, 0))
    scene.camera = camera
    for loc, power, size in (((.8, -.6, .8), 900, 2.5), ((-.7, -.35, .4), 550, 1.8)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        look_at(light, (0, 0, 0))
    scene.render.filepath = str(PREVIEW)
    bpy.ops.render.render(write_still=True)


mesh, rig = make_source_pose()
# A imagem exportada é um derivado de anatomia CC0; os materiais e o desenho de
# equipamento abaixo são autorais para o jogo.
# Azul-grafite separa os dedos escuros da arma preta e continua a ler como luva
# tática; o acabamento menos áspero preserva as articulações da mão no render web.
glove = material('csbrasil.glove.leather', (.045, .105, .19), .08, .44)
sleeve = material('csbrasil.sleeve.navy', (.012, .028, .070), .0, .58)
mag_mat = material('csbrasil.reload.steel', (.065, .08, .105), .75, .29)
root = group('FPVM_HANDS_ROOT')
right = group('FPVM_HAND_R', root)
left = group('FPVM_HAND_L', root)
right_mesh = source_hand(mesh, rig, 'R', glove, sleeve, right)
# O molde original tem ponderação esquerda inconsistente após aplicar o rig Rigify em
# modo batch. Para não exportar uma "segunda mão" vazia, espelhamos a malha anatômica
# direita já assada: preserva dedos, volumes e material, mas entrega uma palma de apoio
# íntegra no navegador.
left_mesh = right_mesh.copy()
left_mesh.data = right_mesh.data.copy()
bpy.context.collection.objects.link(left_mesh)
left_mesh.name = 'FPVM_GLOVE_L_MESH'
left_mesh.parent = left
left_mesh.scale.x = -1
make_magazine(root, mag_mat)

# O rig CC0 e todos os controles de origem saem antes da exportação; só as malhas
# derivadas, luvas e peças de recarga passam ao navegador.
for obj in list(bpy.context.scene.objects):
    # Só a hierarquia que começa por FPVM pertence ao artefato final. O arquivo
    # CC0 pode ter parents invisíveis, portanto testar apenas parent=None deixaria
    # um corpo inteiro entrar no GLB e mascararia as mãos no navegador.
    if not obj.name.startswith('FPVM_') and obj.type not in {'CAMERA', 'LIGHT'}:
        bpy.data.objects.remove(obj, do_unlink=True)
for obj in bpy.context.selected_objects:
    obj.select_set(False)
root.select_set(True)
bpy.context.view_layer.objects.active = root
preview()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=False,
                          export_materials='EXPORT', export_animations=False, export_apply=True)
