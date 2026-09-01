"""Cria o molde autoral de braços/mãos para os viewmodels de primeira pessoa.

Uso:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    tools/blender/build_fpvm_base_rig.py

O arquivo .blend é a fonte; o GLB é somente a prévia/exportação. Cada parte da
luva é vinculada a um joint nomeado, inclusive as três falanges de cada dedo.
Assim as poses por arma e as recargas podem ser animadas sem o fallback de mão
genérica que o jogo usava antes.
"""

from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/viewmodels'
OUT.mkdir(parents=True, exist_ok=True)


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat


def joint(name, location, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = 'ARROWS'
    obj.empty_display_size = 0.045
    obj.location = location
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def shade_smooth(obj):
    if obj.type != 'MESH':
        return
    for poly in obj.data.polygons:
        poly.use_smooth = True


def between(name, a, b, radius, mat, parent=None, sides=12):
    """Cápsula/cilindro orientado entre dois pontos, com origem no começo."""
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=delta.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    shade_smooth(obj)
    bevel = obj.modifiers.new('soft_edges', 'BEVEL')
    bevel.width = radius * .22
    bevel.segments = 2
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def tapered_between(name, a, b, radius_a, radius_b, mat, parent=None, sides=16):
    """Segmento anatômico leve: mais largo no cotovelo/ombro que no pulso."""
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides, radius1=radius_a, radius2=radius_b,
        depth=delta.length, location=(a + b) / 2,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    shade_smooth(obj)
    bevel = obj.modifiers.new('soft_edges', 'BEVEL')
    bevel.width = min(radius_a, radius_b) * .20
    bevel.segments = 2
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def ellipsoid(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    shade_smooth(obj)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def rounded_box(name, location, scale, mat, parent=None, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    mod = obj.modifiers.new('rounds', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    shade_smooth(obj)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def palm(name, center, parent, glove, accent):
    # Palma arredondada, mais estreita no pulso; a silhueta não pode ler como cubo.
    ellipsoid(name, center, (.108, .070, .043), glove, parent)
    rounded_box(f'{name}_wrist', (center[0], center[1] - .068, center[2] - .010), (.075, .025, .037), glove, parent, .018)
    # Costas e proteção dos nós: detalhe que impede a leitura de "bloco".
    for i, x in enumerate((-0.060, -0.020, 0.020, 0.060)):
        pad = rounded_box(f'{name}_knuckle_{i}', (center[0] + x, center[1] + .063, center[2] + .018), (.014, .017, .010), accent, parent, .008)
        pad.rotation_euler[0] = math.radians(9)


def hand(side, wrist, glove, accent, root):
    """Mão modelada com dedos individuais em posição de empunhadura.

    O eixo +Y é a direção da arma. Dedos têm três joints para poderem fechar em
    torno de punhos, guarda-mãos, carregadores ou cabo de faca.
    """
    sign = 1 if side == 'R' else -1
    palm_joint = joint(f'hand.{side}', wrist, root)
    palm(f'palm.{side}', wrist, palm_joint, glove, accent)
    finger_specs = [
        ('thumb', .100, (-.100 * sign, .010, .000)),
        ('index', .078, (-.050 * sign, .062, .020)),
        ('middle', .088, (-.015 * sign, .076, .015)),
        ('ring', .080, (.020 * sign, .070, .010)),
        ('pinky', .067, (.055 * sign, .058, .000)),
    ]
    for fname, length, offset in finger_specs:
        base = Vector(wrist) + Vector(offset)
        # A curva já nasce suave; poses podem fechar as falanges sem deformar a luva.
        points = [
            base,
            base + Vector((0, length * .42, -.010)),
            base + Vector((0, length * .72, -.032)),
            base + Vector((0, length, -.050)),
        ]
        parent = palm_joint
        for segment in range(3):
            j = joint(f'{fname}_{segment + 1}.{side}', points[segment], parent)
            base_radius = .016 if fname != 'pinky' else .013
            tapered_between(
                f'{fname}_{segment + 1}_mesh.{side}', points[segment], points[segment + 1],
                base_radius, base_radius * (.82 if segment < 2 else .68), glove, j, 10,
            )
            parent = j
    return palm_joint


def armature_from_nodes():
    """Converte os empties do molde em uma única armature animável/exportável."""
    nodes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'EMPTY'}
    parents = {name: obj.parent.name if obj.parent and obj.parent.type == 'EMPTY' else None for name, obj in nodes.items()}
    worlds = {name: obj.matrix_world.copy() for name, obj in nodes.items()}

    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = 'FPVM_Armature'
    arm.data.name = 'FPVM_Armature'
    edit = arm.data.edit_bones
    edit.remove(edit[0])
    bones = {}
    for name, obj in nodes.items():
        bone = edit.new(name)
        bone.head = obj.location
        # O comprimento importa só para a leitura no Blender; os meshes estão em nodes filhos.
        bone.tail = obj.location + Vector((0, .045, 0))
        bones[name] = bone
    for name, parent in parents.items():
        if parent in bones:
            bones[name].parent = bones[parent]
            bones[name].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')

    for name, obj in nodes.items():
        obj.parent = arm
        obj.parent_type = 'BONE'
        obj.parent_bone = name
        obj.matrix_world = worlds[name]
    return arm


def key_pose(arm, name, transforms):
    """Uma Action no armature, exportada como um único clip de viewmodel."""
    arm.animation_data_create()
    action = bpy.data.actions.new(name)
    arm.animation_data.action = action
    for frame, bone_name, rotation in transforms:
        bone = arm.pose.bones[bone_name]
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = tuple(math.radians(v) for v in rotation)
        bone.keyframe_insert(data_path='rotation_euler', frame=frame, group=bone_name)
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    arm.animation_data.action = None
    return action


def main():
    clear()
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.film_transparent = False
    bpy.context.scene.world.color = (0.006, 0.009, 0.014)
    bpy.context.scene.view_settings.look = 'AgX - Medium High Contrast'

    glove = material('glove_rubber_dark', (0.025, 0.038, 0.052), .05, .34)
    accent = material('glove_knuckle_matte', (0.075, 0.11, 0.14), .0, .48)
    sleeve = material('sleeve_olive_canvas', (0.12, 0.18, 0.16), .0, .70)
    cuff = material('cuff_black', (0.018, 0.022, 0.028), .0, .42)

    root = joint('vm_root', (0, 0, 0))
    nodes = {'vm_root': root}
    # A pose de descanso é feita para a lente de primeira pessoa: direita no grip,
    # esquerda no guarda-mão. Não é um recorte de personagem de terceira pessoa.
    rig = {
        'upperarm.R': ((.38, -.62, -.52), (.46, -.20, -.33), 'R'),
        'forearm.R': ((.46, -.20, -.33), (.25, .26, -.15), 'R'),
        'upperarm.L': ((-.38, -.62, -.52), (-.34, -.18, -.28), 'L'),
        'forearm.L': ((-.34, -.18, -.28), (.03, .43, -.09), 'L'),
    }
    for name, (a, b, side) in rig.items():
        parent = root
        node = joint(name, a, parent)
        nodes[name] = node
        part_mat = sleeve if name.startswith('upperarm') else glove
        # A mão e a arma devem ler antes da manga; antebraço largo tapa o receiver.
        if name.startswith('upperarm'):
            tapered_between(f'{name}_mesh', a, b, .058, .046, part_mat, node, 16)
        else:
            tapered_between(f'{name}_mesh', a, b, .048, .036, part_mat, node, 16)
            # Proteção de cotovelo: quebra o contorno de tubo e ancora a leitura da luva.
            elbow = Vector(a).lerp(Vector(b), .22)
            ellipsoid(f'elbow_pad.{side}', elbow, (.060, .045, .026), accent, node)
        if name.startswith('forearm'):
            tapered_between(f'cuff.{side}', Vector(b) - (Vector(b) - Vector(a)).normalized() * .052, b, .052, .042, cuff, node, 16)

    hand_r = hand('R', (.25, .26, -.15), glove, accent, nodes['forearm.R'])
    hand_l = hand('L', (.03, .43, -.09), glove, accent, nodes['forearm.L'])
    nodes['hand.R'] = hand_r
    nodes['hand.L'] = hand_l
    # Pontos explícitos que cada arma preenche no seu arquivo de pose, por nome e nunca índice.
    joint('weapon_grip.R', (.25, .34, -.12), hand_r)
    joint('weapon_support.L', (.03, .47, -.07), hand_l)
    joint('weapon_muzzle', (.02, 1.08, .08), root)
    joint('weapon_magazine', (.08, .46, -.19), root)

    arm = armature_from_nodes()
    # Clips-base: chaves reais para o runtime; as armas vão ganhar variações por família.
    key_pose(arm, 'idle_rifle', [
        (1, 'upperarm.R', (0, 0, 0)), (1, 'forearm.R', (0, 0, 0)),
        (1, 'upperarm.L', (0, 0, 0)), (1, 'forearm.L', (0, 0, 0)),
        (24, 'upperarm.R', (1, 0, 0)), (24, 'forearm.R', (-1, 0, 0)),
        (24, 'upperarm.L', (-1, 0, 0)), (24, 'forearm.L', (1, 0, 0)),
    ])
    key_pose(arm, 'reload_rifle_blocking', [
        (1, 'upperarm.L', (0, 0, 0)), (1, 'forearm.L', (0, 0, 0)),
        (8, 'upperarm.L', (-18, 3, 8)), (8, 'forearm.L', (24, -6, -10)),
        (18, 'upperarm.L', (-30, 6, 16)), (18, 'forearm.L', (44, -10, -16)),
        (32, 'upperarm.L', (0, 0, 0)), (32, 'forearm.L', (0, 0, 0)),
    ])
    key_pose(arm, 'reload_pistol_blocking', [
        (1, 'upperarm.L', (0, 0, 0)), (1, 'forearm.L', (0, 0, 0)),
        (9, 'upperarm.L', (-26, 8, 14)), (9, 'forearm.L', (38, -18, -12)),
        (22, 'upperarm.L', (-12, 2, 7)), (22, 'forearm.L', (18, -6, -5)),
        (34, 'upperarm.L', (0, 0, 0)), (34, 'forearm.L', (0, 0, 0)),
    ])
    key_pose(arm, 'knife_slash_blocking', [
        (1, 'upperarm.R', (0, 0, 0)), (1, 'forearm.R', (0, 0, 0)),
        (7, 'upperarm.R', (-28, -8, -15)), (7, 'forearm.R', (-34, 9, 12)),
        (15, 'upperarm.R', (5, 2, 4)), (15, 'forearm.R', (7, -1, -3)),
    ])

    # Luz e câmara de revisão — a figura é parte obrigatória da produção do asset.
    bpy.ops.object.light_add(type='AREA', location=(1.6, -1.4, 1.5))
    bpy.context.object.data.energy = 280
    bpy.context.object.data.shape = 'DISK'
    bpy.context.object.data.size = 3.0
    bpy.ops.object.light_add(type='AREA', location=(-1.2, -.5, .2))
    bpy.context.object.data.energy = 120
    bpy.context.object.data.color = (.42, .62, 1.0)
    bpy.context.object.data.size = 2.0
    bpy.ops.object.camera_add(location=(0, -1.72, -.24))
    cam = bpy.context.object
    bpy.context.scene.camera = cam
    target = Vector((0, .30, -.13))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 55
    bpy.context.scene.render.filepath = str(OUT / 'fpvm_base_rig_preview.png')

    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'fpvm_base_rig.blend'))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / 'fpvm_base_rig.glb'),
        export_format='GLB',
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
    )


if __name__ == '__main__':
    main()
