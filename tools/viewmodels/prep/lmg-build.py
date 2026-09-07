"""Constrói a candidata LMG: braços MGX5 + arma Mint com mecanismo de verdade.

Abre o .blend privado do pack (montagem correta, somente leitura), troca a malha
MG5 pela Mint própria ancorada no envelope do doador e skinning por peça nos
bones reais (Top=receiver, Feed_Tray=tampa, Bag=caixa+cinto, Lever=alavanca),
grava sockets de boca/mira e autor os clipes nativos shoot/inspect. Recargas e
equip entram pelo assembler Node (lmg-assemble.mjs). A rotação Mint→rig usa base
destra verificada por asserts; a colocação é conferida por projeção na câmera do
jogo antes de salvar. Saída: artifacts/viewmodels/prep/lmg/lmg-candidate/.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('lmg-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()

OUT = inv.OUT / 'lmg-candidate'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE_BLEND = inv.SOURCE / 'public/private-assets/viewmodels/lmg/lmg.blend'
MINT_GLB = inv.ROOT / 'public/models/weapons/lmg.glb'
# espelha a distribuição de pesos do MG5: Top carrega o receiver (3914 vértices),
# Feed_Tray a tampa superior, Bag a caixa (o cinto bullet* pendura nela), Lever a alavanca
BONE_FOR = {'GEO_LMG_MINT_COVER': 'Feed_Tray', 'GEO_LMG_MINT_BOX': 'Bag', 'GEO_LMG_MINT_LEVER': 'Lever'}
BODY_BONE = 'Top'


def axis_and_ends(points):
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    axis = list(hi - lo).index(max(hi - lo))
    band = (hi[axis] - lo[axis]) * 0.05
    head = [p for p in points if p[axis] <= lo[axis] + band]
    tail = [p for p in points if p[axis] >= hi[axis] - band]
    zspread = lambda pts: (max(p.z for p in pts) - min(p.z for p in pts)) if pts else 1e9
    # boca = extremo de seção fina (cano); coronha é alta
    return (axis, +1, lo, hi) if zspread(head) < zspread(tail) else (axis, -1, lo, hi)


def right_handed(forward, up):
    lateral = up.cross(forward)
    return Matrix([forward, lateral, up]).transposed().to_4x4()


def mint_up(points, lo, hi):
    """Up da Mint pelo centróide: a caixa pendente puxa o receiver para o lado dela."""
    length = hi - lo
    long_axis = list(length).index(max(length))
    perp = Vector((1, 0, 0)) if long_axis != 0 else Vector((0, 1, 0))
    band_lo = lo + length * 0.2
    band_hi = lo + length * 0.7
    region = [p for p in points if all(band_lo[i] <= p[i] <= band_hi[i] for i in range(3))]
    region = region or points
    rc = Vector([sum(p[i] for p in region) / len(region) for i in range(3)])
    centroid = Vector([sum(p[i] for p in points) / len(points) for i in range(3)])
    # o centróide do receptor desvia para o lado da caixa (massa pendente)
    return -perp if (rc - centroid).dot(perp) < 0 else perp


def key_basis(pbone, frame):
    pbone.keyframe_insert(data_path='location', frame=frame)
    pbone.keyframe_insert(data_path='rotation_quaternion', frame=frame)
    pbone.keyframe_insert(data_path='scale', frame=frame)


def sstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def main():
    report = {'inputs': {'source_blend': str(SOURCE_BLEND), 'mint': str(MINT_GLB)}}
    inventory = json.loads((inv.OUT / 'inventory.json').read_text())
    assert inv.digest(MINT_GLB) == inventory['mint_lmg']['sha256']
    assert inv.digest(SOURCE_BLEND) == inventory['doador_lmg_blend']['sha256']

    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    scene = bpy.context.scene
    for o in scene.objects:
        if o.animation_data:
            o.animation_data.action = None
            for track in o.animation_data.nla_tracks:
                track.mute = True
    scene.frame_set(1)
    bpy.context.view_layer.update()

    mg5 = bpy.data.objects.get('GEO_WEAPON_LMG_MG5.001')
    assert mg5 is not None, 'malha doadora ausente no blend fonte'
    arms = bpy.data.objects['RIG_FP_ARMS']
    wrig = bpy.data.objects['RIG_WEAPON_LMG']

    # --- âncoras do doador no espaço do rig da arma ---
    mg5_m = wrig.matrix_world.inverted() @ mg5.matrix_world
    mg5_pts = [mg5_m @ v.co for v in mg5.data.vertices]
    axis, sign, lo, hi = axis_and_ends(mg5_pts)
    span = max(hi - lo)
    muzzle_mg5 = (lo if sign > 0 else hi).copy()
    tail_mg5 = (hi if sign > 0 else lo).copy()
    # eixo REAL boca->rabo do MG5 (o receiver fica inclinado ~16° no rig; alinhar
    # ao eixo principal do rig deixaria a Mint não-paralela ao doador)
    forward_rig = (muzzle_mg5 - tail_mg5).normalized()
    # up = mundo +Z levado ao espaço do rig: o socket flipa o rig (rig +Z é
    # ABAIXO no mundo); assumir +Z do rig rola a arma 180°
    rig_inv = wrig.matrix_world.inverted()
    up_rig = (rig_inv @ Vector((0, 0, 1)) - rig_inv @ Vector((0, 0, 0))).normalized()
    up_rig = (up_rig - forward_rig * up_rig.dot(forward_rig)).normalized()
    report['mg5'] = {'axis': axis, 'sign': sign, 'span': round(float(span), 4),
                     'muzzle': [round(float(c), 4) for c in muzzle_mg5]}

    # --- Mint: import, base destra, rotação verificada, ajuste de envelope ---
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MINT_GLB))
    mint = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
    mint_local = [v.co.copy() for v in mint.data.vertices]
    maxis, msign, mlo, mhi = axis_and_ends(mint_local)
    mspan = max(mhi - mlo)
    forward_mint = Vector((msign if i == maxis else 0 for i in range(3)))
    up_mint = mint_up(mint_local, mlo, mhi)
    b_mint = right_handed(forward_mint, up_mint)
    b_rig = right_handed(forward_rig, up_rig)
    rot = b_rig @ b_mint.inverted()
    det = rot.determinant()
    assert abs(det - 1) < 1e-6, f'rotação imprópria: det={det}'
    assert (rot @ forward_mint - forward_rig).length < 1e-6
    assert (rot @ up_mint - up_rig).length < 1e-6
    scale = span / mspan
    mint.matrix_world = wrig.matrix_world @ rot @ Matrix.Scale(scale, 4)
    bpy.context.view_layer.update()
    m = wrig.matrix_world.inverted() @ mint.matrix_world
    fitted = [m @ v.co for v in mint.data.vertices]
    flo = Vector([min(p[i] for p in fitted) for i in range(3)])
    fhi = Vector([max(p[i] for p in fitted) for i in range(3)])
    muzzle_mint = (flo if sign > 0 else fhi).copy()
    delta = muzzle_mg5 - muzzle_mint
    mint.matrix_world = wrig.matrix_world @ Matrix.Translation(delta) @ rot @ Matrix.Scale(scale, 4)
    bpy.context.view_layer.update()
    report['mint_fit'] = {'scale': round(float(scale), 6), 'delta': [round(float(c), 4) for c in delta],
                          'forward_mint': list(forward_mint), 'up_mint': list(up_mint),
                          'det_rot': round(float(rot.determinant()), 9)}

    # --- zonas -> vertex groups -> separação ---
    m = wrig.matrix_world.inverted() @ mint.matrix_world
    fitted = [m @ v.co for v in mint.data.vertices]
    flo = Vector([min(p[i] for p in fitted) for i in range(3)])
    fhi = Vector([max(p[i] for p in fitted) for i in range(3)])
    # referencial próprio da arma (frente/up/lateral ortonormais): os cortes por
    # eixo do rig não seguem a inclinação de ~16° do receiver no socket
    fwd_unit = forward_rig
    up_unit = up_rig
    lat_unit = fwd_unit.cross(up_unit)
    f0 = min(p.dot(fwd_unit) for p in fitted)
    f1 = max(p.dot(fwd_unit) for p in fitted)
    u0 = min(p.dot(up_unit) for p in fitted)
    u1 = max(p.dot(up_unit) for p in fitted)
    height = u1 - u0

    def frac(p):
        return (p.dot(fwd_unit) - f0) / (f1 - f0)

    def ufrac(p):
        return (p.dot(up_unit) - u0) / height

    receiver_top = 0.55
    receiver_bottom = 0.30
    zones = {
        'GEO_LMG_MINT_COVER': lambda p, f, u: u > receiver_top and 0.42 <= f <= 0.80,
        'GEO_LMG_MINT_BOX': lambda p, f, u: u < receiver_bottom and 0.42 <= f <= 0.72,
        'GEO_LMG_MINT_LEVER': lambda p, f, u: u > receiver_top - 0.12 and 0.80 <= f <= 0.88,
    }
    assignment = {}
    for i, v in enumerate(fitted):
        f = frac(v)
        u = ufrac(v)
        for name, test in zones.items():
            if test(v, f, u):
                assignment[i] = name
                break
    counts = {name: 0 for name in zones}
    for name in assignment.values():
        counts[name] += 1
    report['parts'] = {'counts': counts, 'total': len(mint.data.vertices),
                       'frame': {'f0': round(float(f0), 3), 'f1': round(float(f1), 3),
                                 'u0': round(float(u0), 3), 'u1': round(float(u1), 3)}}
    assert counts['GEO_LMG_MINT_COVER'] > 100, f'tampa pequena demais: {counts}'
    assert counts['GEO_LMG_MINT_BOX'] > 80, f'caixa pequena demais: {counts}'

    mint.name = 'GEO_LMG_MINT_BODY'
    for name in zones:
        mint.vertex_groups.new(name=name)
    for i, name in assignment.items():
        mint.vertex_groups[name].add([i], 1.0, 'REPLACE')
    bpy.context.view_layer.update()
    separated = []
    for name in BONE_FOR:
        bpy.ops.object.select_all(action='DESELECT')
        mint.select_set(True)
        bpy.context.view_layer.objects.active = mint
        mint.vertex_groups.active = mint.vertex_groups[name]
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.object.vertex_group_select()
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        part = next(o for o in bpy.data.objects if o.name.startswith('GEO_LMG_MINT_BODY') and o is not mint)
        part.name = name
        separated.append(part)
    body = mint

    # --- assa o ajuste direto nos vértices (import glTF deixa empty pai: transform_apply não basta) ---
    all_meshes = [body] + separated
    fit = wrig.matrix_world @ Matrix.Translation(delta) @ rot @ Matrix.Scale(scale, 4)
    for o in all_meshes:
        for v in o.data.vertices:
            v.co = fit @ v.co
        o.parent = None
        o.matrix_basis = Matrix.Identity(4)
        o.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()

    def bbox_world(objs):
        out = {}
        for o in objs:
            ws = [o.matrix_world @ v.co for v in o.data.vertices]
            out[o.name] = [[round(min(w[i] for w in ws)), round(max(w[i] for w in ws))] for i in range(3)]
        return out
    report['bbox_apos_apply'] = bbox_world(all_meshes)
    corners = {'mint_xlo': Vector((mlo.x, (mlo.y+mhi.y)/2, (mlo.z+mhi.z)/2)),
               'mint_xhi': Vector((mhi.x, (mlo.y+mhi.y)/2, (mlo.z+mhi.z)/2)),
               'mg5_rig_muzzle': muzzle_mg5, 'mg5_rig_tail': (hi if sign > 0 else lo).copy()}
    fc = {k: [round(float(c), 3) for c in (wrig.matrix_world @ Matrix.Translation(delta) @ rot @ Matrix.Scale(scale, 4) @ v)] for k, v in corners.items()}
    fc['mg5_world_muzzle'] = [round(float(c), 3) for c in (wrig.matrix_world @ muzzle_mg5)]
    fc['mg5_world_tail'] = [round(float(c), 3) for c in (wrig.matrix_world @ (hi if sign > 0 else lo))]
    report['corner_check'] = fc
    report['wrig_world'] = [[round(float(v), 3) for v in row] for row in wrig.matrix_world]

    # --- skinning: cada malha 100% no seu bone + ArmatureModifier (padrão MG5) ---
    def skin(obj, bone_name):
        for g in list(obj.vertex_groups):
            obj.vertex_groups.remove(g)
        vg = obj.vertex_groups.new(name=bone_name)
        vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
        mod = obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = wrig
        obj.parent = wrig
        obj.parent_type = 'OBJECT'
        # dados em coords de mundo no rest; o parent_inverse faz a arma cavalgar o rig
        obj.matrix_basis = Matrix.Identity(4)
        obj.matrix_parent_inverse = wrig.matrix_world.inverted().copy()

    skin(body, BODY_BONE)
    for part in separated:
        skin(part, BONE_FOR[part.name])
    report['parts']['skinned'] = {'GEO_LMG_MINT_BODY': BODY_BONE, **{p.name: BONE_FOR[p.name] for p in separated}}
    bpy.data.objects.remove(mg5, do_unlink=True)

    # --- sockets no espaço do rig, presos ao receiver ---
    cover_pts = [p for i, p in enumerate(fitted) if assignment.get(i) == 'GEO_LMG_MINT_COVER']
    cover_center = Vector([sum(p[i] for p in cover_pts) / len(cover_pts) for i in range(3)])
    sight_local = cover_center + up_unit * (height * 0.02)
    for name, world in (('SOCKET_MINT_MUZZLE', wrig.matrix_world @ muzzle_mg5),
                        ('SOCKET_MINT_SIGHT', wrig.matrix_world @ sight_local)):
        s = bpy.data.objects.new(name, None)
        scene.collection.objects.link(s)
        s.parent = wrig
        s.parent_type = 'OBJECT'
        s.matrix_parent_inverse = wrig.matrix_world.inverted().copy()
        s.matrix_basis = Matrix.Translation(world)

    # --- clipes nativos: shoot (0,5 s) e inspect (3,2 s), 24 fps ---
    scene.render.fps = 24
    arms.animation_data_create()
    wrig.animation_data_create()
    # a pose de pega vive na AÇÃO idle, não no rest: os deltas dos clipes
    # nativos têm que compor SOBRE a base do hold (senão o braço salta)
    for o in scene.objects:
        if o.animation_data:
            o.animation_data.action = None
            for track in o.animation_data.nla_tracks:
                track.mute = track.name != 'idle'
    scene.frame_set(2)
    bpy.context.view_layer.update()
    hold = {name: arms.pose.bones[name].matrix_basis.copy()
            for name in ('ik_hand_gun', 'spine_03', 'ik_hand_l')}
    for o in scene.objects:
        if o.animation_data:
            o.animation_data.action = None
            for track in o.animation_data.nla_tracks:
                track.mute = True

    act_shoot = bpy.data.actions.new('RIG_FP_ARMS_shoot')
    arms.animation_data.action = act_shoot
    ik = arms.pose.bones['ik_hand_gun']
    sp = arms.pose.bones['spine_03']
    # peso de LMG: coice curto e firme, retorno sem flutuar; a cadência do jogo
    # (0,085 s/tiro) manda no intervalo — o clipe só desenha o ciclo de 0,5 s
    for pbone, keys in (
        (ik, [(1, hold['ik_hand_gun'].copy()),
              (2, hold['ik_hand_gun'] @ Matrix.Translation((0, 0.028, 0.008)) @ Matrix.Rotation(math.radians(3.2), 4, 'X')),
              (5, hold['ik_hand_gun'] @ Matrix.Translation((0, 0.008, 0.002)) @ Matrix.Rotation(math.radians(0.8), 4, 'X')),
              (12, hold['ik_hand_gun'].copy())]),
        (sp, [(1, hold['spine_03'].copy()),
              (2, hold['spine_03'] @ Matrix.Rotation(math.radians(1.1), 4, 'X')),
              (6, hold['spine_03'] @ Matrix.Rotation(math.radians(0.3), 4, 'X')),
              (12, hold['spine_03'].copy())]),
    ):
        for frame, mat in keys:
            pbone.matrix_basis = mat
            key_basis(pbone, frame)
        pbone.matrix_basis = Matrix.Identity(4)
    track = arms.animation_data.nla_tracks.new()
    track.name = 'shoot'
    strip = track.strips.new('shoot', 1, act_shoot)
    strip.action_frame_start, strip.action_frame_end = 1, 12
    arms.animation_data.action = None

    act_inspect_arms = bpy.data.actions.new('RIG_FP_ARMS_inspect')
    act_inspect_weapon = bpy.data.actions.new('RIG_WEAPON_LMG_inspect')
    arms.animation_data.action = act_inspect_arms
    wrig.animation_data.action = act_inspect_weapon
    cover = wrig.pose.bones['Feed_Tray']
    hand_l_ik = arms.pose.bones['ik_hand_l']
    spine = arms.pose.bones['spine_03']
    cover_open = Matrix.Rotation(math.radians(-70), 4, 'Y').to_quaternion()
    identity_q = Matrix.Identity(4).to_quaternion()
    for f in range(77):
        t = f / 76
        lift = sstep(t / 0.2) * (1 - sstep((t - 0.9) / 0.1))
        open_w = sstep((t - 0.2) / 0.2) * (1 - sstep((t - 0.7) / 0.2))
        hand_l_ik.matrix_basis = hold['ik_hand_l'] @ Matrix.Translation((0, -0.09 * lift, 0.04 * lift)) @ Matrix.Rotation(math.radians(24 * lift), 4, 'X')
        key_basis(hand_l_ik, f)
        spine.matrix_basis = hold['spine_03'] @ Matrix.Rotation(math.radians(-6 * lift), 4, 'X') @ Matrix.Rotation(math.radians(10 * lift), 4, 'Z')
        key_basis(spine, f)
        cover.rotation_quaternion = identity_q.slerp(cover_open, open_w)
        cover.location = (0, 0, 0)
        cover.keyframe_insert(data_path='rotation_quaternion', frame=f)
        cover.keyframe_insert(data_path='location', frame=f)
    hand_l_ik.matrix_basis = Matrix.Identity(4)
    spine.matrix_basis = Matrix.Identity(4)
    cover.rotation_quaternion = identity_q
    for obj, act in ((arms, act_inspect_arms), (wrig, act_inspect_weapon)):
        track = obj.animation_data.nla_tracks.new()
        track.name = 'inspect'
        strip = track.strips.new('inspect', 1, act)
        strip.action_frame_start, strip.action_frame_end = 0, 76
        obj.animation_data.action = None

    # --- autoverificação por projeção na câmera do jogo (idle) ---
    for o in scene.objects:
        if o.animation_data:
            o.animation_data.action = None
            for track in o.animation_data.nla_tracks:
                track.mute = track.name != 'idle'
    scene.frame_set(2)
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    camera = bpy.data.objects['VIEWMODEL_CAMERA']
    # vertices NÃO deformados: o skinning do doador só avalia correto no glTF
    # runtime (o próprio MG5 se dispersa no rest do Blender); a régua do skin
    # fica no reimport Node (lmg-verify.mjs)
    proj = {}
    for o in all_meshes:
        pix = [world_to_camera_view(scene, camera, o.matrix_world @ v.co) for v in o.data.vertices]
        # a coronha passa do olho (normal em FP): fora do frustum a projeção
        # extrapola; a régua só conta o que está à frente do near
        front = [p for p in pix if p.z > 0.02]
        xs = [p.x * 1152 for p in front]
        ys = [(1 - p.y) * 768 for p in front]
        zs = [p.z for p in pix]
        proj[o.name] = {'x': [round(min(xs)), round(max(xs))], 'y': [round(min(ys)), round(max(ys))],
                        'depth': [round(min(zs), 3), round(max(zs), 3)], 'front_verts': len(front)}
    report['projection_idle_32'] = proj
    report['bbox_no_check'] = {o.name: [[round(float(c)),] for c in []] for o in []} if False else bbox_world(all_meshes)
    report['mw_no_check'] = {o.name: [[round(float(v), 3) for v in row] for row in o.matrix_world] for o in all_meshes}
    (OUT / 'build-report.json').write_text(json.dumps(report, indent=1))
    # pegada DENTRO do quadro (clamp): a coronha sai da tela por design (CS 1.6)
    xs_all = [min(max(v, 0), 1152) for p in proj.values() for v in p['x']]
    ys_all = [min(max(v, 0), 768) for p in proj.values() for v in p['y']]
    diag = math.hypot(max(xs_all) - min(xs_all), max(ys_all) - min(ys_all))
    report['weapon_diagonal_inframe_px'] = round(diag)
    assert 350 <= diag <= 900, f'diagonal em quadro fora do razoável: {diag} proj={proj}'
    cover_mid_y = sum(proj['GEO_LMG_MINT_COVER']['y']) / 2
    box_mid_y = sum(proj['GEO_LMG_MINT_BOX']['y']) / 2
    assert box_mid_y > cover_mid_y, f'caixa não está abaixo da tampa na tela: {box_mid_y} vs {cover_mid_y}'

    # O export 5.2 deixa textures sem source (GLTFLoader recusa); a identidade
    # visual das luvas vem do jogo (vmhands.js aplica material por time) e a
    # leitura de escala/contato não depende de textura: materiais simples.
    def plain_material(name, color, metal):
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.name = name
        mat.use_nodes = True
        mat.node_tree.nodes.clear()
        out_node = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
        bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.55
        bsdf.inputs['Metallic'].default_value = metal
        mat.node_tree.links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])
        return mat

    mat_for = [('GEO_FP_SK_Cloth_01', 'CoroSolto_FP_Cloth', (0.16, 0.21, 0.28), 0.0),
               ('GEO_FP_SK_Glove_01', 'CoroSolto_FP_Glove', (0.12, 0.15, 0.19), 0.0),
               ('GEO_FP_SK_Hand', 'CoroSolto_FP_Hand', (0.78, 0.58, 0.43), 0.0),
               ('GEO_LMG_MINT_BODY', 'CoroSolto_WEAPON_BODY', (0.20, 0.22, 0.25), 0.35),
               ('GEO_LMG_MINT_COVER', 'CoroSolto_WEAPON_COVER', (0.26, 0.28, 0.31), 0.35),
               ('GEO_LMG_MINT_BOX', 'CoroSolto_WEAPON_BOX', (0.30, 0.28, 0.18), 0.2),
               ('GEO_LMG_MINT_LEVER', 'CoroSolto_WEAPON_LEVER', (0.35, 0.33, 0.28), 0.5)]
    for obj_name, mat_name, color, metal in mat_for:
        o = bpy.data.objects.get(obj_name)
        if o is None or o.type != 'MESH':
            continue
        o.data.materials.clear()
        o.data.materials.append(plain_material(mat_name, color, metal))

    blend_out = OUT / 'lmg-candidate.blend'
    glb_out = OUT / 'lmg-candidate.glb'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_out),
        export_format='GLB',
        export_cameras=True,
        export_lights=False,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_merge_animation='NLA_TRACK',
        export_skins=True,
        export_morph=True,
        export_materials='EXPORT',
        export_image_format='WEBP',
        export_image_quality=82,
        export_yup=True,
    )
    report['output'] = {'blend': str(blend_out), 'glb': str(glb_out), 'glb_bytes': glb_out.stat().st_size}
    (OUT / 'build-report.json').write_text(json.dumps(report, indent=1))
    print('LMG_CANDIDATE_BUILT=' + json.dumps(report))


if __name__ == '__main__':
    main()
