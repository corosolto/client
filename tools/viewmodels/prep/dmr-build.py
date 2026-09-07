#!/usr/bin/env python3
"""Builder das candidatas DMR (Rem700 ← doador bolt/Kar98K; G3SG1 ← doador g3/G3).

Estágios (rodar em ordem; cada um salva o .blend da candidata em
artifacts/viewmodels/dmr/<arma>/cand1/):
  montar  — abre o .blend doador SOMENTE LEITURA e salva cópia; importa a Mint,
            registra a Mint sobre o corpo do doador (cano/cima/lado + grip no
            hand_r), parenta a Mint no âncora de arma do rig doador, esconde o
            corpo do doador preservando props (clip/cartuchos), importa clipes.
  partes  — separa a peça móvel da Mint (ferrolho rem700 / carregador g3sg1) e
            parenta no bone correspondente do rig de arma do doador.
  sockets — cria SOCKET_MINT_MUZZLE/SOCKET_MINT_SIGHT dentro do grupo MINT.
  render  — amostra frames críticos dos clipes pela VIEWMODEL_CAMERA em 3:2/16:9.

O .blend doador original nunca é salvo. Uso:
  Blender --background --python dmr-build.py -- <arma> <estagio>
"""
import json
import os
import sys

import bpy
import mathutils
from mathutils import Vector, Matrix

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
ART = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr')
INTEGRADORA = '/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol'
PACKS = os.path.join(INTEGRADORA, 'public', 'private-assets', 'viewmodels')

ARMAS = {
    'rem700': {
        'familia': 'bolt',
        'donor_mesh': 'GEO_WEAPON_BOLT_Kar98K',
        'donor_rig': 'RIG_WEAPON_BOLT',
        'ancora': {'tipo': 'bone', 'bone': 'StaticBolt'},
        'len_m': 1.15, 'gripZ': 0.66,
        # maçã+haste do ferrolho: protrai além da meia-largura do receiver (|z|>0.09)
        # na janela do receiver medida no topo (x -0.11..-0.03, knob em +z)
        'parte': {'tipo': 'bolt', 'eixo': 'z', 'limiar': 0.090, 'x_min': -0.11, 'x_max': -0.03},
        'mint_axes': {'cima': 'Y', 'lado': 'Z'},   # no GLB Mint: X=cano(+boca), Y=cima, Z=lado
        'props_donor': ['Clip', 'Cartridge', 'CartridgeClip0', 'CartridgeClip1',
                        'CartridgeClip2', 'CartridgeClip3', 'CartridgeClip4'],
        'bone_corpo': 'StaticBolt',   # corpo do doador Kar98K é skinned neste bone
        'bone_parte': 'Bolt',
        'clipes': ['shoot', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty'],
    },
    'g3sg1': {
        'familia': 'g3',
        'donor_mesh': 'GEO_WEAPON_G3_G3.001',
        'donor_rig': 'RIG_WEAPON_G3',
        'ancora': {'tipo': 'objeto', 'objeto': 'SOCKET_WEAPON_G3'},
        'len_m': 1.12, 'gripZ': 0.58,
        # GLB Mint do g3sg1: X=cano(+boca), Z=CIMA, Y=lado (invertido vs rem700)
        'parte': {'tipo': 'mag', 'eixo': 'z', 'limiar': -0.048, 'x_min': -0.27, 'x_max': 0.03},
        'mint_axes': {'cima': 'Z', 'lado': 'Y'},
        'props_donor': ['Cartridge'],
        'bone_corpo': None,           # corpo do G3 não tem grupo: segue o objeto do rig
        'bone_parte': 'Mag',
        'clipes': ['reload_tactical', 'reload_empty'],
    },
}


def blend_path(arma):
    return os.path.join(ART, arma, 'cand1', f'{arma}-candidate.blend')


def out_dir(arma):
    return os.path.join(ART, arma, 'cand1')


def load_candidate(arma):
    path = blend_path(arma)
    if not os.path.exists(path):
        raise SystemExit(f'candidata inexistente: {path} (rode montar antes)')
    bpy.ops.wm.open_mainfile(filepath=path)
    return path


def bbox(vs):
    return (Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))),
            Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs))))


# ---------------------------------------------------------------- montar

def estagio_montar(arma, cfg):
    os.makedirs(out_dir(arma), exist_ok=True)
    pack = os.path.join(PACKS, cfg['familia'])
    dst = blend_path(arma)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.open_mainfile(filepath=os.path.join(pack, f"{cfg['familia']}.blend"))
    for o in list(bpy.data.objects):
        if o.name.startswith('Icosphere'):
            bpy.data.objects.remove(o, do_unlink=True)

    donor_mesh = bpy.data.objects[cfg['donor_mesh']]
    donor_rig = bpy.data.objects[cfg['donor_rig']]
    arm_fp = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FP_ARMS' in o.name)
    bpy.context.view_layer.update()

    # âncoras do doador em repouso: bbox do corpo, grip no head do hand_r
    dvs = [donor_mesh.matrix_world @ v.co.copy() for v in donor_mesh.data.vertices]
    dmn, dmx = bbox(dvs)
    dsp = dmx - dmn
    eixo = max(range(3), key=lambda i: dsp[i])

    def espessura(pts):
        a, b = (eixo + 1) % 3, (eixo + 2) % 3
        ca = [list(p)[a] for p in pts]
        cb = [list(p)[b] for p in pts]
        return max(max(ca) - min(ca), max(cb) - min(cb))

    lo = [v for v in dvs if abs(list(v)[eixo] - dmn[eixo]) < 0.03]
    hi = [v for v in dvs if abs(list(v)[eixo] - dmx[eixo]) < 0.03]
    boca_no_max = espessura(hi) < espessura(lo)
    if eixo == 0:
        dir_cano = Vector((1 if boca_no_max else -1, 0, 0))
    elif eixo == 1:
        dir_cano = Vector((0, 1 if boca_no_max else -1, 0))
    else:
        dir_cano = Vector((0, 0, 1 if boca_no_max else -1))
    cima = Vector((0, 0, 1)) if eixo != 2 else Vector((0, 1, 0))
    lado = dir_cano.cross(cima)
    grip_doador = arm_fp.matrix_world @ arm_fp.pose.bones['hand_r'].head

    # importa a Mint; no espaço dela X=cano (+X=boca), Y=cima, Z=lado
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(CWD, 'public', 'models', 'weapons', f'{arma}.glb'))
    mint_objs = [o for o in bpy.data.objects if o not in before]
    mint_mesh = next(o for o in mint_objs if o.type == 'MESH')
    mvs = [mint_mesh.matrix_world @ v.co.copy() for v in mint_mesh.data.vertices]
    mmn, mmx = bbox(mvs)
    mspan = mmx - mmn
    escala = cfg['len_m'] / mspan.x
    grip_mint = Vector((mmn.x + mspan.x * (1 - cfg['gripZ']),
                        (mmn.y + mmx.y) / 2, (mmn.z + mmx.z) / 2))

    # registra: p_world = T(grip_doador) ∘ [eixos Mint→doador] ∘ S ∘ T(-grip_mint).
    # A Mint tem X=cano; cima/lado podem estar em Y ou Z conforme a arma:
    # P reordena (cano, cima, lado) para as linhas de B.
    perm = {'rem700': ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
            'g3sg1': ((1, 0, 0), (0, 0, 1), (0, 1, 0))}[arma]
    m_perm = Matrix(perm).to_4x4()
    m_map = Matrix((dir_cano, cima, lado)).to_4x4().transposed()  # colunas = destino de cano/cima/lado
    reg = (Matrix.Translation(grip_doador) @ m_map @ m_perm @
           Matrix.Diagonal((escala, escala, escala, 1.0)).to_4x4() @
           Matrix.Translation(-grip_mint))

    mint_root = bpy.data.objects.new(f'MINT_WEAPON_{arma.upper()}', None)
    bpy.context.scene.collection.objects.link(mint_root)
    mint_root.matrix_world = reg
    bpy.context.view_layer.update()
    for o in mint_objs:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        bpy.context.scene.collection.objects.link(o)
        o.parent = mint_root
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = Matrix.Identity(4)
        # preserva a pose de import: local = inv(reg) @ mw_original
        o.matrix_local = reg.inverted() @ o.matrix_world
    bpy.context.view_layer.update()

    # parenta o grupo no âncora de arma do doador preservando o mundo
    ancora = cfg['ancora']
    if ancora['tipo'] == 'bone':
        mint_root.parent = donor_rig
        mint_root.parent_type = 'BONE'
        mint_root.parent_bone = ancora['bone']
        pb = donor_rig.pose.bones[ancora['bone']]
        espaco_pai = donor_rig.matrix_world @ pb.matrix
    else:
        pai = bpy.data.objects[ancora['objeto']]
        mint_root.parent = pai
        espaco_pai = pai.matrix_world
    mint_root.matrix_parent_inverse = espaco_pai.inverted() @ mint_root.matrix_world
    bpy.context.view_layer.update()

    nvs = [mint_mesh.matrix_world @ v.co.copy() for v in mint_mesh.data.vertices]
    nmn, nmx = bbox(nvs)
    print('DMR_MONTAR', arma, json.dumps({
        'donor_bbox': [list(dmn), list(dmx)], 'eixo_cano': eixo, 'boca_no_max': boca_no_max,
        'grip_doador': list(grip_doador), 'mint_bbox_reg': [list(round(c, 3) for c in nmn), list(round(c, 3) for c in nmx)],
        'escala': round(escala, 5),
    }))

    # corpo do doador some; props (clip/cartuchos) são separados e ficam
    manter = [g for g in cfg['props_donor'] if g in {vg.name for vg in donor_mesh.vertex_groups}]
    print('DMR_PROPS', arma, 'mantidos', manter)
    if manter:
        bpy.context.view_layer.objects.active = donor_mesh
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.object.mode_set(mode='OBJECT')
        for g in manter:
            idx = donor_mesh.vertex_groups.find(g)
            donor_mesh.vertex_groups.active_index = idx
            bpy.context.view_layer.objects.active = donor_mesh
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.object.vertex_group_select()
            bpy.ops.object.mode_set(mode='OBJECT')
        bpy.context.view_layer.objects.active = donor_mesh
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        for o in bpy.data.objects:
            if o != donor_mesh and o.type == 'MESH' and donor_mesh.name in o.name:
                o.name = f'PROPS_DONOR_{arma.upper()}'
                o.hide_render = False
    donor_mesh.hide_set(True)
    donor_mesh.hide_render = True

    # importa os clipes brutos (armas de fogo + arma) como ações nomeadas
    for nome in cfg['clipes']:
        for lado in ('arms', 'weapon'):
            caminho = os.path.join(pack, 'raw-clips', f'{nome}-{lado}.glb')
            if not os.path.exists(caminho):
                continue
            antes_a = set(bpy.data.actions)
            antes_o = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=caminho)
            for a in bpy.data.actions:
                if a not in antes_a:
                    a.name = f'{nome}_{lado}'
                    a.use_fake_user = True  # órfã sem fake user é expurgada no save
            for o in [o for o in bpy.data.objects if o not in antes_o]:
                bpy.data.objects.remove(o, do_unlink=True)
            print('DMR_CLIP_IMPORT', arma, f'{nome}_{lado}')

    bpy.ops.wm.save_as_mainfile(filepath=dst)
    print('DMR_MONTAR_OK', arma, dst)


# ---------------------------------------------------------------- partes

def estagio_partes(arma, cfg):
    load_candidate(arma)
    mint_root = bpy.data.objects[f'MINT_WEAPON_{arma.upper()}']
    mint_mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == mint_root)
    parte = cfg['parte']

    bpy.context.view_layer.objects.active = mint_mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    sel = []
    for v in mint_mesh.data.vertices:
        co = v.co  # espaço local Mint: X=cano(+boca); cima/lado conforme a arma
        valor = abs(co.z) if parte['tipo'] == 'bolt' else co.z
        if parte['tipo'] == 'bolt':
            ok = valor >= parte['limiar'] and parte['x_min'] <= co.x <= parte['x_max']
        else:
            ok = valor <= parte['limiar'] and parte['x_min'] <= co.x <= parte['x_max']
        if ok:
            sel.append(v.index)
    print('DMR_PARTE_VERTS', arma, len(sel), 'de', len(mint_mesh.data.vertices))
    if not sel:
        raise SystemExit('seleção vazia; ajuste a caixa da parte')

    vg = mint_mesh.vertex_groups.new(name=f'PARTE_{parte["tipo"]}')
    vg.add(sel, 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = mint_mesh
    mint_mesh.vertex_groups.active_index = mint_mesh.vertex_groups.find(vg.name)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')

    parte_obj = None
    for o in bpy.data.objects:
        if o.type == 'MESH' and o != mint_mesh and o.parent == mint_root and 'PARTE' not in o.name:
            parte_obj = o
    if parte_obj is None:
        raise SystemExit('peça separada não encontrada')
    nome = f'MINT_{parte["tipo"].upper()}_{arma.upper()}'
    parte_obj.name = nome
    parte_obj.vertex_groups.clear()
    print('DMR_PARTE_OK', arma, nome, '→ skin no estágio assar (bone', cfg['bone_parte'] + ')')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path(arma))


# ---------------------------------------------------------------- assar
# Converte o attachment exótico (empty + bone-parent com parent_inverse ×100)
# no padrão do doador: vértices no espaço do rig, objeto filho do ARMATURE com
# transform identidade e deform por vertex group. É o único padrão que o
# exporter glTF preserva (mesma lição do build da AK/M4).

def estagio_assar(arma, cfg):
    load_candidate(arma)
    mint_root = bpy.data.objects[f'MINT_WEAPON_{arma.upper()}']
    rig = bpy.data.objects[cfg['donor_rig']]
    bpy.context.view_layer.update()
    rig_mw = rig.matrix_world.copy()

    malhas = [o for o in bpy.data.objects
              if o.type == 'MESH' and o.parent == mint_root]
    parte_nome = f'MINT_{cfg["parte"]["tipo"].upper()}_{arma.upper()}'
    p = bpy.data.objects.get(parte_nome)
    if p and p not in malhas:
        malhas.append(p)

    for o in malhas:
        m = rig_mw.inverted() @ o.matrix_world
        for v in o.data.vertices:
            v.co = m @ v.co
        o.parent = rig
        o.parent_type = 'OBJECT'
        o.parent_bone = ''
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_local = Matrix.Identity(4)
        mod = o.modifiers.new('DMR_SKIN', 'ARMATURE')
        mod.object = rig
        o.vertex_groups.clear()

    parte_tag = cfg['parte']['tipo'].upper()
    corpo = next(o for o in malhas if parte_tag not in o.name)
    if cfg['bone_corpo']:
        vg = corpo.vertex_groups.new(name=cfg['bone_corpo'])
        vg.add([v.index for v in corpo.data.vertices], 1.0, 'REPLACE')
    if p:
        vgp = p.vertex_groups.new(name=cfg['bone_parte'])
        vgp.add([v.index for v in p.data.vertices], 1.0, 'REPLACE')

    # sockets: reparenta ANTES de remover o root; local limpo no espaço do rig
    for nome_socket in ('SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT'):
        s = bpy.data.objects.get(nome_socket)
        if not s:
            continue
        mundo = s.matrix_world.translation.copy()
        s.parent = corpo
        s.parent_type = 'OBJECT'
        s.matrix_parent_inverse = Matrix.Identity(4)
        s.matrix_local = Matrix.Translation(rig_mw.inverted() @ mundo)
        bpy.context.view_layer.update()
        print('DMR_ASSAR_SOCKET', arma, nome_socket,
              'local', [round(c, 2) for c in s.matrix_local.translation])

    # o empty root sai ANTES do rename para não gerar sufixo .001 no contrato
    bpy.data.objects.remove(mint_root, do_unlink=True)
    bpy.context.view_layer.update()
    corpo.name = f'MINT_WEAPON_{arma.upper()}'

    vs = [rig_mw @ v.co.copy() for v in corpo.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    print('DMR_ASSAR_OK', arma, 'bbox mundo', [round(c, 3) for c in mn], [round(c, 3) for c in mx])
    bpy.ops.wm.save_as_mainfile(filepath=blend_path(arma))


# ---------------------------------------------------------------- sockets

def estagio_sockets(arma, cfg):
    load_candidate(arma)
    mint_root = bpy.data.objects[f'MINT_WEAPON_{arma.upper()}']
    mint_mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == mint_root)
    # no espaço LOCAL da malha Mint: X=cano (+X=boca); cima é Y ou Z conforme a arma
    cima_idx = 1 if cfg['mint_axes']['cima'] == 'Y' else 2
    vs = [v.co.copy() for v in mint_mesh.data.vertices]
    boca_local = max(vs, key=lambda v: v.x)
    # luneta: cluster do topo (12%); óculo = ponto mais à RETAGUARDA (mínimo x)
    cmin = min(v[cima_idx] for v in vs)
    cmax = max(v[cima_idx] for v in vs)
    topo = [v for v in vs if v[cima_idx] >= cmin + 0.88 * (cmax - cmin)]
    mira_local = min(topo, key=lambda v: v.x) if topo else boca_local
    mw = mint_mesh.matrix_world
    for nome, ponto_local in (('SOCKET_MINT_MUZZLE', boca_local), ('SOCKET_MINT_SIGHT', mira_local)):
        if nome in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[nome], do_unlink=True)
        ponto = mw @ ponto_local
        s = bpy.data.objects.new(nome, None)
        bpy.context.scene.collection.objects.link(s)
        s.empty_display_size = 0.015
        s.matrix_world = Matrix.Translation(ponto)
        s.parent = mint_root
        s.matrix_parent_inverse = mint_root.matrix_world.inverted()
        bpy.context.view_layer.update()
        print('DMR_SOCKET', arma, nome, 'local', [round(c, 4) for c in ponto_local],
              'mundo', [round(c, 4) for c in ponto])
    bpy.ops.wm.save_as_mainfile(filepath=blend_path(arma))


# ---------------------------------------------------------------- render

AMOSTRAS = {
    'idle': [0.0],
    'shoot': [0.0, 0.3, 0.6, 0.9, 1.19],
    'reload_start': [0.0, 0.5, 1.0],
    'reload_loop': [0.0, 0.3, 0.6],
    'reload_end': [0.0, 0.8, 1.55],
    'reload_empty': [0.0, 1.0, 2.0, 3.0, 3.7],
    'reload_tactical': [0.0, 0.5, 1.0, 1.6, 2.1],
}


def estagio_render(arma, cfg, so_clip=''):
    load_candidate(arma)
    out = os.path.join(out_dir(arma), 'frames')
    os.makedirs(out, exist_ok=True)
    scene = bpy.context.scene
    cam = next(o for o in bpy.data.objects if o.type == 'CAMERA')
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.show_cavity = True
    scene.camera = cam
    bpy.context.preferences.view.render_display_type = 'NONE'
    arm_fp = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FP_ARMS' in o.name)
    rigs = [arm_fp, bpy.data.objects[cfg['donor_rig']]]

    for clip, tempos in AMOSTRAS.items():
        if so_clip and clip != so_clip:
            continue
        a_arms = bpy.data.actions.get(f'{clip}_arms')
        if not a_arms and clip == 'idle':
            a_arms = bpy.data.actions.get('RIG_FP_ARMS_idle')
        if not a_arms:
            continue
        a_weapon = bpy.data.actions.get(f'{clip}_weapon')
        for o in rigs:
            if o.animation_data:
                o.animation_data.action = None
        for o in rigs:
            for pb in o.pose.bones:
                pb.matrix_basis.identity()
        scene.frame_set(0)
        bpy.context.view_layer.update()
        if arm_fp.animation_data is None:
            arm_fp.animation_data_create()
        arm_fp.animation_data.action = a_arms
        if a_weapon:
            if rigs[1].animation_data is None:
                rigs[1].animation_data_create()
            rigs[1].animation_data.action = a_weapon
        for t in tempos:
            scene.frame_set(int(round(t * 30)))
            bpy.context.view_layer.update()
            for res, tag in (((1440, 960), '3x2'), ((1440, 810), '16x9')):
                scene.render.resolution_x, scene.render.resolution_y = res
                scene.render.filepath = os.path.join(out, f'{arma}-{clip}-t{t:.2f}-{tag}.png')
                bpy.ops.render.render(write_still=True)
            print('DMR_FRAME', arma, clip, t)
    print('DMR_RENDER_OK', arma, out)




# ---------------------------------------------------------------- extrair
# Mini-GLB com cópias RÍGIDAS (vértices em mundo, sem skin/pai) da Mint, da
# peça móvel e dos props por bone — insumo do splice glTF-level.

def estagio_extrair(arma, cfg):
    load_candidate(arma)
    bpy.context.view_layer.update()

    nomes_alvo = [f'MINT_WEAPON_{arma.upper()}',
                  f'MINT_{cfg["parte"]["tipo"].upper()}_{arma.upper()}']
    props = bpy.data.objects.get(f'PROPS_DONOR_{arma.upper()}')
    if props:
        for g in [vg.name for vg in props.vertex_groups]:
            antes = {o.name for o in bpy.data.objects}
            bpy.context.view_layer.objects.active = props
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='DESELECT')
            bpy.ops.object.mode_set(mode='OBJECT')
            props.vertex_groups.active_index = props.vertex_groups.find(g)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.object.vertex_group_select()
            bpy.ops.object.mode_set(mode='OBJECT')
            if not any(v.select for v in props.data.vertices):
                continue  # grupo já consumido por split anterior (pesos sobrepostos)
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.separate(type='SELECTED')
            bpy.ops.object.mode_set(mode='OBJECT')
            novos = [n for n in {o.name for o in bpy.data.objects} - antes]
            if novos:
                novo = bpy.data.objects[novos[0]]
                novo.name = f'PROPS_{g}'
                nomes_alvo.append(f'PROPS_{g}')
        bpy.data.objects.remove(props, do_unlink=True)

    nomes_alvo += ['SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']
    manter = [n for n in nomes_alvo if bpy.data.objects.get(n)]
    # duplica tudo que interessa e aplica transform de mundo
    bpy.ops.object.select_all(action='DESELECT')
    for nome in manter:
        o = bpy.data.objects[nome]
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects[manter[0]]
    bpy.ops.object.duplicate()
    copias = [o for o in bpy.context.selected_objects]
    for o in copias:
        matriz = o.matrix_world.copy()
        o.parent = None
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_world = matriz
        if o.type == 'MESH':
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        # empty não tem dados: transform_apply o moveria para a origem
    nomes_copia = {o.name for o in copias}
    for o in list(bpy.data.objects):
        if o.name not in nomes_copia:
            bpy.data.objects.remove(o, do_unlink=True)
    # nomes de contrato sem sufixo de duplicação (agora sem colisão)
    for o in copias:
        o.name = o.name.replace('.001', '').replace('.002', '').replace('.003', '')
    for o in bpy.data.objects:  # limpa modifiers de skin das cópias
        for m in list(o.modifiers):
            o.modifiers.remove(m)
        if o.type == 'MESH':
            o.vertex_groups.clear()

    out = os.path.join(out_dir(arma), f'{arma}-rigid.gltf')
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_selection=False,
        export_animations=False,
        export_skins=False,
        export_cameras=False,
        export_apply=False,
        export_yup=True,
    )
    glb = out[:-5] + '.glb' if not out.endswith('.glb') else out
    # exporter com GLB ignora a extensão dada? garante o nome certo:
    candidato_glb = os.path.join(out_dir(arma), f'{arma}-rigid.glb')
    if os.path.exists(candidato_glb):
        glb = candidato_glb
    print('DMR_EXTRAIR_OK', arma, glb, 'objetos', sorted(nomes_copia))

# ---------------------------------------------------------------- exportar

def estagio_exportar(arma, cfg):
    load_candidate(arma)
    out = out_dir(arma)
    glb_path = os.path.join(out, f'{arma}-baked-runtime.glb')

    # o corpo do doador fica fora do bake (props/cartuchos permanecem)
    donor = bpy.data.objects.get(cfg['donor_mesh'])
    if donor:
        bpy.data.objects.remove(donor, do_unlink=True)

    scene = bpy.context.scene
    scene.render.fps = 30
    arm_fp = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and 'FP_ARMS' in o.name)
    rig_arma = bpy.data.objects[cfg['donor_rig']]

    # NLA: um track por clipe, mesmo nome nos dois rigs → o exporter funde num
    # único animation glTF por track (contrato de nomes do runtime).
    for obj in (arm_fp, rig_arma):
        ad = obj.animation_data or obj.animation_data_create()
        ad.action = None
        for t in list(ad.nla_tracks):
            ad.nla_tracks.remove(t)

    clipes = list(cfg['clipes']) + ['idle']
    exportados = []
    for clip in clipes:
        a_arms = bpy.data.actions.get(f'{clip}_arms')
        if not a_arms and clip == 'idle':
            a_arms = bpy.data.actions.get('RIG_FP_ARMS_idle')
        a_weapon = bpy.data.actions.get(f'{clip}_weapon')
        if not a_arms:
            continue
        for obj, acao in ((arm_fp, a_arms), (rig_arma, a_weapon)):
            if acao is None:
                continue
            track = obj.animation_data.nla_tracks.new()
            track.name = clip
            track.mute = False
            inicio = int(acao.frame_range[0])
            track.strips.new(acao.name, inicio, acao)
        exportados.append(clip)

    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in ('MESH', 'ARMATURE', 'CAMERA', 'EMPTY'):
            o.select_set(True)
    bpy.context.view_layer.objects.active = arm_fp
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_skins=True,
        export_morph=False,
        export_cameras=True,
        export_extras=True,
        export_apply=False,
        export_yup=True,
    )
    print('DMR_EXPORT_OK', arma, glb_path, 'clipes', exportados)
    with open(os.path.join(out, 'export-report.json'), 'w') as fh:
        json.dump({'arma': arma, 'glb': glb_path, 'clipes': exportados,
                   'sockets': ['SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT'],
                   'mint_node': f'MINT_WEAPON_{arma.upper()}'}, fh, indent=1)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]
    arma, estagio = argv[0], argv[1]
    cfg = ARMAS[arma]
    if estagio == 'tudo':
        estagio_montar(arma, cfg)
        estagio_partes(arma, cfg)
        estagio_sockets(arma, cfg)
        estagio_assar(arma, cfg)
    elif estagio == 'extrair':
        estagio_extrair(arma, cfg)
    elif estagio == 'render' and len(argv) > 2:
        estagio_render(arma, cfg, so_clip=argv[2])
    else:
        {'montar': estagio_montar, 'partes': estagio_partes,
         'sockets': estagio_sockets, 'assar': estagio_assar,
         'render': estagio_render, 'exportar': estagio_exportar}[estagio](arma, cfg)
