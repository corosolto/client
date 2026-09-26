"""Builder dos GLBs assados finais (mosin/svd/sks): arma própria nos braços do pack.

Por arma, a partir do runtime C2 da família (timing verificado):
- remove o MESH de arma doador (os ossos ficam: os clipes continuam mirando neles);
- insere a arma própria como MINT_WEAPON_<ARMA> sob o rig de arma, alinhada pela
  matriz ICP+polimento de alinhamento-<arma>.json;
- separa peças (ferrolho/carregador) por caixa medida e pendura no osso do mecanismo;
- adiciona pente e cartuchos PROCEDURAIS nos ossos Clip/CartridgeClip*/Cartridge
  (bolt base), dimensionados pela medição do doador e ancorados na pose de idle;
- adiciona SOCKET_MINT_MUZZLE/SOCKET_MINT_SIGHT;
- copia equip_rifle do General retargeteado por nome;
- autura `shoot` (svd/sks: recuo rígido do conjunto) e `inspect` (varredura rígida)
  no nó RIG_FP_ARMS — movimento rígido preserva contatos por construção.

Clipe de entrada permanece intacto (canais de braços e de mecanismo): o gate de
timing continua medindo o GLB final. Saída: A/final/<arma>-baked-runtime.glb.
"""
import argparse
import json
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
META = None
OUT = None
ISO = None
GENERAL = None

# caixas de peças no espaço-objeto da própria (gltf), por análise de componentes
PECAS = {
    'mosin': {'nome': 'bolt', 'bone': 'Bolt',
              'box': dict(x=[-0.145, -0.110], y=[-0.005, 0.030], z=[0.020, 0.055])},
    'svd': {'nome': 'mag', 'bone': 'Mag',
            'box': dict(x=[-0.165, -0.020], y=[-0.118, -0.028], z=[-0.048, 0.048])},
    'sks': {'nome': 'handle', 'bone': 'Bolt',
            'box': dict(x=[-0.110, 0.010], y=[0.020, 0.060], z=[0.010, 0.045])},
}
# base C2 e clipes a manter por arma
PLANOS = {
    'mosin': dict(base='bolt', keep=['idle', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty', 'shoot'],
                  shoot_donor=True, clip_proc=True,
                  # equip@0.5: punho direito afunda na junção coronha/empunhadura
                  # (região ocava) — nudge de 10 mm do nó da arma na janela do equip
                  equip_nudge=dict(janela=(0.30, 0.72),
                                   delta_local=[-5e-05, -9.99e-03, 3.5e-04])),
    'svd': dict(base='svd', keep=['idle', 'reload_tactical', 'reload_empty'],
                shoot_donor=False, clip_proc=False, mag_autoral=True,
                correcao_braco=dict(clipe='reload_tactical', osso='upperarm_r'),
                # Gate C @ reload_tactical/0.50: um vertice da luva, pintado
                # 85% por thumb_02_r, fica 8,4 mm dentro do receptor. A direção
                # abaixo é a extração medida até a superfície + 3 mm de folga.
                correcao_polegar=dict(clipe='reload_tactical', osso='thumb_02_r',
                                      fase=0.50, delta_world=[0.0118, -0.0053, 0.0003])),
    'sks': dict(base='bolt', keep=['idle', 'reload_start', 'reload_loop', 'reload_end', 'reload_empty'],
                shoot_donor=False, clip_proc=True,
                # Gate C @ inspect/0.86: um vertice da luva esquerda, pintado
                # 77% por hand_l e 23% por thumb_01_l, fica 4,9 mm dentro do
                # receptor. A direção abaixo alcança a superfície + 3 mm.
                correcoes_inspect=[
                    dict(clipe='inspect', osso='hand_l', fase=0.86,
                         delta_world=[0.00731, 0.00283, 0.00075]),
                    # Com o pivô correto, a inspeção também expõe um vértice
                    # 94% ring_01_l, 7,6 mm dentro da lateral do receptor.
                    dict(clipe='inspect', osso='ring_01_l', fase=0.86,
                         delta_world=[-0.04950, 0.01870, -0.00185]),
                ]),
}


def ler(path):
    b = Path(path).read_bytes()
    n = struct.unpack_from('<I', b, 12)[0]
    return json.loads(b[20:20 + n]), b[28 + n:]


def accessor(j, b, i):
    a = j['accessors'][i]
    if a.get('bufferView') is None:
        return np.zeros((a.get('count', 0), 1))
    v = j['bufferViews'][a['bufferView']]
    tipos = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1', 5122: '<i2', 5120: '<i1'}
    tam = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dt = np.dtype(tipos[a['componentType']])
    stride = v.get('byteStride', tam * dt.itemsize)
    x = np.ndarray((a['count'], tam), dtype=dt, buffer=b,
                   offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                   strides=(stride, dt.itemsize)).copy()
    if a.get('normalized'):
        x = x.astype(float) / np.iinfo(dt).max
    return x


def trs_mat(t=None, r=None, s=None):
    m = np.eye(4)
    if r is not None:
        x, y, z, w = r
        m[:3, :3] = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    if s is not None:
        m[:3, :3] = m[:3, :3] @ np.diag(s)
    if t is not None:
        m[:3, 3] = t
    return m


def node_trs(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    return trs_mat(n.get('translation'), n.get('rotation'), n.get('scale'))


def amostra(anim, j, b, t):
    out = {}
    for c in anim['channels']:
        tgt = c['target']
        if tgt.get('node') is None:
            continue
        q = anim['samplers'][c['sampler']]
        ts = accessor(j, b, q['input']).ravel()
        val = accessor(j, b, q['output'])
        idx = int(np.searchsorted(ts, t, side='right') - 1)
        idx = max(0, min(idx, len(ts) - 1))
        if idx >= len(ts) - 1 or t <= ts[0] or q.get('interpolation') == 'STEP':
            v = val[idx]
        else:
            f = (t - ts[idx]) / (ts[idx + 1] - ts[idx])
            u, w = val[idx], val[idx + 1]
            if tgt['path'] == 'rotation':
                dot = np.dot(u, w)
                if dot < 0:
                    w = -w
                    dot = -dot
                if dot < .9995:
                    ang = np.arccos(np.clip(dot, -1, 1))
                    v = (np.sin((1 - f) * ang) * u + np.sin(f * ang) * w) / np.sin(ang)
                else:
                    v = u * (1 - f) + w * f
                v = v / np.linalg.norm(v)
            else:
                v = u * (1 - f) + w * f
        out.setdefault(tgt['node'], {})[tgt['path']] = v
    return out


def node_mats(j, override=None):
    nodes = [dict(n) for n in j['nodes']]
    if override:
        for ni, paths in override.items():
            nodes[ni].update(paths)
    parents = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    cache = {}

    def mat(i):
        if i not in cache:
            cache[i] = (mat(parents[i]) if i in parents else np.eye(4)) @ node_trs(nodes[i])
        return cache[i]
    for i in range(len(nodes)):
        mat(i)
    return cache


def quat_de_matriz(M):
    R = M[:3, :3]
    tr = R[0, 0] + R[1, 1] + R[2, 2]
    if tr > 0:
        s = np.sqrt(tr + 1) * 2
        w = 0.25 * s
        x = (R[2, 1] - R[1, 2]) / s
        y = (R[0, 2] - R[2, 0]) / s
        z = (R[1, 0] - R[0, 1]) / s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        w = (R[2, 1] - R[1, 2]) / s
        x = 0.25 * s
        y = (R[0, 1] + R[1, 0]) / s
        z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        w = (R[0, 2] - R[2, 0]) / s
        x = (R[0, 1] + R[1, 0]) / s
        y = 0.25 * s
        z = (R[1, 2] + R[2, 1]) / s
    else:
        s = np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        w = (R[1, 0] - R[0, 1]) / s
        x = (R[0, 2] + R[2, 0]) / s
        y = (R[1, 2] + R[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w], dtype=float)
    return (q / np.linalg.norm(q)).tolist()


class Builder:
    """Acrescenta dados ao GLB base: um buffer único (original + appended)."""

    def __init__(self, j, bin_bytes):
        self.j = j
        self.bin = bytearray(bin_bytes)
        while len(self.bin) % 4:
            self.bin += b'\0'

    def view(self, arr, target=None):
        raw = arr.astype(arr.dtype.newbyteorder('<')).tobytes()
        off = len(self.bin)
        self.bin += raw
        while len(self.bin) % 4:
            self.bin += b'\0'
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(raw)}
        if target is not None:
            v['target'] = target
        self.j['bufferViews'].append(v)
        return len(self.j['bufferViews']) - 1

    def acc(self, arr, gtype, comp, normalized=False, bounds=True):
        tipos = {'float32': 5126, 'uint16': 5123, 'uint8': 5121, 'uint32': 5125}
        tam = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[gtype]
        flat = arr.reshape(len(arr), tam)
        a = {'bufferView': self.view(flat), 'componentType': tipos[arr.dtype.name],
             'count': len(arr), 'type': gtype}
        if normalized:
            a['normalized'] = True
        if bounds and gtype in ('SCALAR', 'VEC2', 'VEC3'):
            if len(arr):
                a['min'] = flat.min(0).tolist()
                a['max'] = flat.max(0).tolist()
        self.j['accessors'].append(a)
        return len(self.j['accessors']) - 1

    def node(self, name, parent_idx, t=None, r=None, s=None, children=None):
        n = {'name': name}
        if t is not None:
            n['translation'] = [float(x) for x in t]
        if r is not None:
            n['rotation'] = [float(x) for x in r]
        if s is not None:
            n['scale'] = [float(x) for x in s]
        if children:
            n['children'] = children
        self.j['nodes'].append(n)
        i = len(self.j['nodes']) - 1
        if parent_idx is not None:
            self.j['nodes'][parent_idx].setdefault('children', []).append(i)
        return i


def mesh_prims(j, b, node_idx):
    node = j['nodes'][node_idx]
    mesh = j['meshes'][node['mesh']]
    out = []
    for prim in mesh['primitives']:
        out.append({
            'pos': accessor(j, b, prim['attributes']['POSITION']).astype(np.float64),
            'nrm': accessor(j, b, prim['attributes']['NORMAL']).astype(np.float64) if 'NORMAL' in prim['attributes'] else None,
            'uv': accessor(j, b, prim['attributes'].get('TEXCOORD_0')).astype(np.float64) if 'TEXCOORD_0' in prim['attributes'] else None,
            'idx': accessor(j, b, prim['indices']).astype(np.int64) if 'indices' in prim else None,
            'material': prim.get('material'),
        })
    return out


def own_prims(arma):
    j, b = ler(RAIZ / f'public/models/weapons/{arma}.glb')
    ni = next(i for i, n in enumerate(j['nodes']) if n.get('mesh') is not None)
    prims = mesh_prims(j, b, ni)
    # material/texture da própria: copia imagem e material inteiros
    return j, b, prims, ni


def copia_material_proprio(bd, jo, bo, mat_idx):
    """Copia material+texturas+imagens do GLB próprio para o builder de saída."""
    j, b = bd.j, bd.bin
    mapa_img = {}
    mapa_tex = {}
    mapa_mat = {}
    mat = jo['materials'][mat_idx]
    novo = json.loads(json.dumps(mat))
    pbr = novo.get('pbrMetallicRoughness', {})
    for chave in ('baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'occlusionTexture', 'emissiveTexture'):
        tex_ref = pbr.get(chave) or novo.get(chave)
        if not tex_ref:
            continue
        ti = tex_ref['index']
        if ti in mapa_tex:
            tex_ref['index'] = mapa_tex[ti]
            continue
        tex = jo['textures'][ti]
        img_i = tex.get('source')
        if img_i is None:
            img_i = tex.get('extensions', {}).get('EXT_texture_webp', {}).get('source')
        assert img_i is not None, f'textura sem source: {tex}'
        if 'EXT_texture_webp' not in j.get('extensionsUsed', []):
            j.setdefault('extensionsUsed', []).append('EXT_texture_webp')
        if img_i not in mapa_img:
            img = jo['images'][img_i]
            bv = jo['bufferViews'][img['bufferView']]
            raw = bo[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
            off = len(b)
            b += raw
            while len(b) % 4:
                b += b'\0'
            j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(raw)})
            nv = len(j['bufferViews']) - 1
            nimg = {'bufferView': nv, 'mimeType': img.get('mimeType', 'image/png')}
            j['images'].append(nimg)
            mapa_img[img_i] = len(j['images']) - 1
        ntex = {'source': mapa_img[img_i]}
        if 'sampler' in tex:
            s = jo['samplers'][tex['sampler']]
            j['samplers'].append(json.loads(json.dumps(s)))
            ntex['sampler'] = len(j['samplers']) - 1
        j['textures'].append(ntex)
        mapa_tex[ti] = len(j['textures']) - 1
        tex_ref['index'] = mapa_tex[ti]
    j['materials'].append(novo)
    return len(j['materials']) - 1


def caixa_contem(cx, V):
    return ((V[:, 0] >= cx['x'][0]) & (V[:, 0] <= cx['x'][1])
            & (V[:, 1] >= cx['y'][0]) & (V[:, 1] <= cx['y'][1])
            & (V[:, 2] >= cx['z'][0]) & (V[:, 2] <= cx['z'][1]))


def cilindro(r, h, seg=8, eixo='z', y0=0.0):
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    circ = np.stack([np.cos(ang), np.sin(ang)], axis=1) * r
    base_lo = np.c_[circ[:, 0], np.full(seg, y0), circ[:, 1]]
    base_hi = np.c_[circ[:, 0], np.full(seg, y0 + h), circ[:, 1]]
    V = np.vstack([base_lo, base_hi, [[0, y0, 0], [0, y0 + h, 0]]])
    idx = []
    c_lo, c_hi = 2 * seg, 2 * seg + 1
    for i in range(seg):
        n = (i + 1) % seg
        idx += [[i, n, seg + n], [i, seg + n, seg + i], [c_lo, n, i], [c_hi, seg + i, seg + n]]
    if eixo == 'z':
        # cilindro ao longo de X (cano da arma): troca x↔z
        V = V[:, [2, 1, 0]]
    return V, np.array(idx, dtype=np.uint16)


def corrige_mangas_svd(bd, j, b, mutante=False):
    """Faz a manga terminar fora do quadro sem esmagar a malha do antebraco.

    O doador deixa o anel aberto do ombro apontado para a camera. Como o runtime
    precisa de DoubleSide nesse rig espelhado, a face interna virava dois discos
    dominantes. Um fade de vertice só no terco do ombro preserva geometria,
    pesos, joints, contato e volume do antebraco; o anel some antes da borda.
    """
    ni = next(i for i, n in enumerate(j['nodes']) if n.get('name') == 'GEO_FP_SK_Cloth_01')
    for prim in j['meshes'][j['nodes'][ni]['mesh']]['primitives']:
        pos = accessor(j, b, prim['attributes']['POSITION']).astype(np.float64)
        if not mutante:
            alpha = 1.0 - np.clip((pos[:, 1] - 1.22) / (1.38 - 1.22), 0.0, 1.0)
            alpha = alpha * alpha * (3.0 - 2.0 * alpha)  # smoothstep invertido
            color = np.ones((len(pos), 4), dtype=np.float32)
            color[:, 3] = alpha.astype(np.float32)
            prim['attributes']['COLOR_0'] = bd.acc(color, 'VEC4', 'f4', bounds=False)
        mat = j['materials'][prim['material']]
        mat['doubleSided'] = True
        if not mutante:
            mat['alphaMode'] = 'BLEND'


def parse_args():
    ap = argparse.ArgumentParser(description='Rebuild isolado dos candidatos de precisao')
    ap.add_argument('--metadata-root', required=True, type=Path,
                    help='diretorio publico com alinhamentos e relatorios causais')
    ap.add_argument('--base-root', required=True, type=Path,
                    help='diretorio privado com bolt/svd/marksman-runtime.glb')
    ap.add_argument('--general', required=True, type=Path,
                    help='general-runtime.glb usado apenas como doador de equip')
    ap.add_argument('--output-root', required=True, type=Path)
    ap.add_argument('--weapons', default='mosin,svd,sks')
    ap.add_argument('--mutante-peca', action='store_true')
    ap.add_argument('--mutant-clip-index', action='store_true')
    ap.add_argument('--mutant-sleeve-double-sided', action='store_true')
    return ap.parse_args()


def main():
    global META, OUT, ISO, GENERAL
    args = parse_args()
    META = args.metadata_root.resolve()
    OUT = args.output_root.resolve()
    ISO = args.base_root.resolve()
    GENERAL = args.general.resolve()
    weapons = {x.strip() for x in args.weapons.split(',') if x.strip()}
    unknown = weapons - set(PLANOS)
    if unknown:
        raise SystemExit(f'armas desconhecidas: {sorted(unknown)}')
    for required in (META, ISO, GENERAL):
        if not required.exists():
            raise SystemExit(f'input ausente: {required}')
    OUT.mkdir(parents=True, exist_ok=True)
    resumo = {}
    for arma, plano in PLANOS.items():
        if arma not in weapons:
            continue
        base = plano['base']
        j, b = ler(ISO / f'{base}-runtime.glb')
        names = [n.get('name', f'node{i}') for i, n in enumerate(j['nodes'])]
        idx = {n: i for i, n in enumerate(names)}
        idle = next(a for a in j['animations'] if a['name'] == 'idle')
        mats = node_mats(j, amostra(idle, j, b, 0.0))

        T_align = np.array(json.loads((META / f'alinhamento-{arma}.json').read_text())
                           ['T_obj_para_idle_scene'])

        bd = Builder(j, b)
        j = bd.j

        if arma == 'svd':
            corrige_mangas_svd(bd, j, b, mutante=args.mutant_sleeve_double_sided)

        # ---- material/malha da arma própria ----
        jo, bo, oprims, own_node = own_prims(arma)
        own_pos = np.vstack([p['pos'] for p in oprims])
        own_nrm = np.vstack([p['nrm'] for p in oprims])
        own_uv = np.vstack([p['uv'] for p in oprims]) if all(p['uv'] is not None for p in oprims) else None
        own_idx = []
        base_v = 0
        for p in oprims:
            own_idx.append(p['idx'].reshape(-1, 3) + base_v)
            base_v += len(p['pos'])
        own_idx = np.vstack(own_idx)
        mat_idx = copia_material_proprio(bd, jo, bo, oprims[0]['material'])

        # ---- split de peça ----
        peca_cfg = PECAS[arma]
        nverts_peca = caixa_contem(peca_cfg['box'], own_pos)
        conta = np.zeros(len(own_pos), dtype=int)
        for tri in own_idx:
            for v in tri:
                if nverts_peca[v]:
                    conta[tri] += 0  # noop para clareza
        tri_peca = np.array([sum(nverts_peca[v] for v in tri) >= 2 for tri in own_idx])
        body_idx = own_idx[~tri_peca]
        piece_idx = own_idx[tri_peca]

        # ---- nó da arma sob o rig do doador ----
        rig_root = next((idx[n] for n in ('RIG_WEAPON_BOLT', 'RIG_WEAPON_SVD', 'RIG_WEAPON_MARKSMAN')
                         if n in idx), None)
        if rig_root is None:
            rig_root = next(idx[n] for n in names if n.startswith('SOCKET_WEAPON_'))
        local_body = np.linalg.inv(mats[rig_root]) @ T_align
        # preserva escala (a raiz do rig tem 0.01; o local carrega ~100)
        esc_body = np.linalg.norm(local_body[:3, :3], axis=0)
        rot_body = local_body[:3, :3] / esc_body
        m_esc = np.eye(4)
        m_esc[:3, :3] = rot_body
        q = quat_de_matriz(m_esc)

        def add_mesh_node(nome, pai, verts, norms, uvs, indices, mat_i, extra=None):
            prim = {'attributes': {'POSITION': bd.acc(verts.astype(np.float32), 'VEC3', 'f4'),
                                   'NORMAL': bd.acc(norms.astype(np.float32), 'VEC3', 'f4')},
                    'material': mat_i, 'mode': 4}
            if indices is not None and len(indices):
                prim['indices'] = bd.acc(indices.astype(np.uint32).reshape(-1), 'SCALAR', 'u4',
                                         bounds=False)
            j['meshes'].append({'primitives': [prim]})
            mi = len(j['meshes']) - 1
            node = {'name': nome, 'mesh': mi}
            if extra:
                node.update(extra)
            j['nodes'].append(node)
            ni = len(j['nodes']) - 1
            j['nodes'][pai].setdefault('children', []).append(ni)
            return ni

        ni_body = bd.node(f'MINT_WEAPON_{arma.upper()}', rig_root,
                          t=local_body[:3, 3], r=q, s=esc_body)
        add_mesh_node(f'GEO_MINT_{arma.upper()}', ni_body, own_pos, own_nrm, own_uv,
                      body_idx, mat_idx)

        # peça no osso do mecanismo (mutante: presa ao corpo, sem movimento)
        bone_idx = rig_root if args.mutante_peca else idx[peca_cfg['bone']]
        local_piece = np.linalg.inv(mats[bone_idx]) @ T_align
        esc_piece = np.linalg.norm(local_piece[:3, :3], axis=0)
        m_esc_p = np.eye(4)
        m_esc_p[:3, :3] = local_piece[:3, :3] / esc_piece
        ni_piece = bd.node(f'MINT_{arma.upper()}_{peca_cfg["bone"].upper()}', bone_idx,
                           t=local_piece[:3, 3], r=quat_de_matriz(m_esc_p), s=esc_piece)
        add_mesh_node(f'GEO_MINT_{arma.upper()}_PIECE', ni_piece, own_pos, own_nrm, own_uv,
                      piece_idx, mat_idx)

        # ---- sockets ----
        # eixo do comprimento por PCA (a orientação own-local varia por modelo:
        # mosin/sks ao longo de x, SVD não); boca = extremidade cujo eixo
        # boca→mira minimiza o ângulo contra -Z em idle (régua do gate A)
        y_max = own_pos[:, 1].max()
        scope_mask = own_pos[:, 1] > y_max - 0.015
        scope_obj = own_pos[scope_mask].mean(0)
        sight_w = T_align[:3, :3] @ scope_obj + T_align[:3, 3]
        c_ = own_pos.mean(0)
        _, _, vt_ = np.linalg.svd(own_pos - c_, full_matrices=False)
        proj = (own_pos - c_) @ vt_[0]
        cands = []
        for sinal, lim in ((+1, proj.max() - 0.012), (-1, proj.min() + 0.012)):
            m_ = proj > lim if sinal > 0 else proj < lim
            p_ = own_pos[m_].mean(0)
            w_ = T_align[:3, :3] @ p_ + T_align[:3, 3]
            eixo = w_ - sight_w
            eixo = eixo / max(np.linalg.norm(eixo), 1e-9)
            cands.append((float(eixo[2]), p_))
        muzzle_obj = min(cands, key=lambda c: c[0])[1]
        for nome_s, pt in (('SOCKET_MINT_MUZZLE', muzzle_obj), ('SOCKET_MINT_SIGHT', scope_obj)):
            w = T_align[:3, :3] @ pt + T_align[:3, 3]
            # filho do CORPO (mundo do corpo = T_align): local = inv(T_align) @ w.
            # (inv(local_body) estaria no referencial do rig, não do corpo.)
            loc = np.linalg.inv(T_align) @ np.array([*w, 1.0])
            bd.node(nome_s, ni_body, t=loc[:3])

        # ---- pente e cartuchos procedurais (bolt base) ----
        if plano['clip_proc']:
            wnode = next(i for i, n in enumerate(j['nodes'])
                         if n.get('mesh') is not None and 'GEO_WEAPON' in n.get('name', ''))
            skin = j['skins'][j['nodes'][wnode]['skin']]
            jms = [mats[x] for x in skin['joints']]
            ibm = accessor(j, bytes(bd.bin), skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
            wverts = []
            wbones = []
            meshj = j['meshes'][j['nodes'][wnode]['mesh']]
            for primj in meshj['primitives']:
                pos = accessor(j, bytes(bd.bin), primj['attributes']['POSITION'])
                jnts = accessor(j, bytes(bd.bin), primj['attributes']['JOINTS_0']).astype(int)
                wts = accessor(j, bytes(bd.bin), primj['attributes']['WEIGHTS_0']).astype(float)
                accv = np.zeros((len(pos), 3))
                ph = np.c_[pos, np.ones(len(pos))]
                for k in range(4):
                    jj = jnts[:, k]
                    for bij in np.unique(jj):
                        sel = jj == bij
                        if not sel.any():
                            continue
                        M = jms[bij] @ ibm[bij]
                        accv[sel] += (M @ ph[sel].T).T[:, :3] * wts[sel, k][:, None]
                wverts.append(accv)
                wbones.append(jnts)
            wverts = np.vstack(wverts)
            wbones = np.vstack(wbones)
            j['materials'].append({'name': 'CoroSolto_precisao_steel',
                                   'pbrMetallicRoughness': {'baseColorFactor': [0.42, 0.44, 0.47, 1],
                                                            'metallicFactor': 0.85, 'roughnessFactor': 0.45}})
            mat_steel = len(j['materials']) - 1
            j['materials'].append({'name': 'CoroSolto_precisao_brass',
                                   'pbrMetallicRoughness': {'baseColorFactor': [0.78, 0.62, 0.28, 1],
                                                            'metallicFactor': 0.9, 'roughnessFactor': 0.35}})
            mat_brass = len(j['materials']) - 1

            def caixa_mesh(cx, cy, cz, sx, sy, sz):
                hx, hy, hz = sx / 2, sy / 2, sz / 2
                V = np.array([[cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
                              [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
                              [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
                              [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]])
                I = np.array([[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5],
                              [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3],
                              [3, 7, 4], [3, 4, 0]], dtype=np.uint32)
                return V, I

            clip_stats = {}
            for bone_nome in ['Clip', 'CartridgeClip0', 'CartridgeClip1', 'CartridgeClip2',
                              'CartridgeClip3', 'CartridgeClip4', 'Cartridge']:
                if bone_nome not in idx:
                    continue
                # JOINTS_0 guarda o slot dentro de skin.joints, nao o indice
                # global do node. Confundir os dois seleciona milhares de
                # vertices aleatorios e produz o bloco bege dominante.
                joint_slot = (idx[bone_nome] if args.mutant_clip_index
                              else skin['joints'].index(idx[bone_nome]))
                sel = wbones == joint_slot
                selv = wverts[sel.any(1)]
                if len(selv) < 4:
                    continue
                centro = selv.mean(0)
                ext = selv.max(0) - selv.min(0)
                B = mats[idx[bone_nome]]
                if bone_nome == 'Clip':
                    sx = max(ext[0], 0.030)
                    sy = max(ext[1], 0.010)
                    sz = max(ext[2], 0.010)
                    V, I = caixa_mesh(centro[0], centro[1], centro[2], sx, sy, sz)
                    mat_i = mat_steel
                else:
                    # O osso Cartridge do doador carrega pesos residuais de
                    # outras partes. Mesmo com o slot correto, limita o estojo
                    # a dimensoes fisicas plausiveis para impedir dominancia.
                    r_raw = max(min(ext[1], ext[2]) * 0.45, 0.0035)
                    comp_raw = max(ext[0], 0.030) * 0.9
                    # O mutante precisa preservar a consequência causal do
                    # slot errado. Aplicar o limitador físico também nele faria
                    # a régua ficar verde apesar da seleção incorreta.
                    r = r_raw if args.mutant_clip_index else min(r_raw, 0.0065)
                    comp = comp_raw if args.mutant_clip_index else min(comp_raw, 0.055)
                    V, I = cilindro(r, comp, seg=8, eixo='z')
                    V = V + np.array([centro[0] - comp / 2, centro[1], centro[2]])
                    mat_i = mat_brass
                loc = (np.linalg.inv(B) @ np.c_[V, np.ones(len(V))].T).T[:, :3]
                # normais por face via cross product
                e1 = loc[I[:, 1]] - loc[I[:, 0]]
                e2 = loc[I[:, 2]] - loc[I[:, 0]]
                nn = np.cross(e1, e2)
                nn = nn / np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-12)
                NRM = np.repeat(nn, 3, axis=0)
                Vt = loc[I].reshape(-1, 3)
                add_mesh_node(f'GEO_PROC_{bone_nome}', idx[bone_nome], Vt, NRM, None, None, mat_i)
                clip_stats[bone_nome] = {'centro_assembly': centro.tolist(),
                                         'ext': ext.tolist(), 'n_verts_doador': int(sel.sum())}
            resumo[f'{arma}_clip_stats'] = clip_stats
            (OUT / f'clip-ancoras-{arma}.json').write_text(json.dumps(clip_stats, indent=1) + '\n')

        # ---- remove mesh de arma doador (nó + mesh + skin) ----
        wnode2 = next(i for i, n in enumerate(j['nodes'])
                      if n.get('mesh') is not None and 'GEO_WEAPON' in n.get('name', ''))
        # tira o nó da árvore
        for n in j['nodes']:
            if 'children' in n and wnode2 in n['children']:
                n['children'] = [c for c in n['children'] if c != wnode2]
        j['nodes'][wnode2] = {'name': f'_removido_{names[wnode2]}'}
        # mesh/skin órfãos ficam, mas sem nó referenciando (válido; tamanho revisado pelo optimizer)

        # ---- animações: manter somente os da família; equip/shoot/inspect novos ----
        j['animations'] = [a for a in j['animations'] if a['name'] in plano['keep']]

        # equip_rifle do General, retargeteado por nome
        jg, bg = ler(GENERAL)
        gen_names = [n.get('name', f'node{i}') for i, n in enumerate(jg['nodes'])]
        gen = next(a for a in jg['animations'] if a['name'] == 'equip_rifle')
        canais = []
        samplers = []
        for c in gen['channels']:
            tgt = c['target']
            if tgt.get('node') is None:
                continue
            nm = gen_names[tgt['node']]
            if nm not in idx or nm == 'VIEWMODEL_CAMERA':
                continue
            q = gen['samplers'][c['sampler']]
            tin = accessor(jg, bg, q['input']).astype(np.float32)
            tout = accessor(jg, bg, q['output']).astype(np.float32)
            ii = bd.acc(tin.reshape(-1), 'SCALAR', 'f4')
            oo = bd.acc(tout, {'translation': 'VEC3', 'rotation': 'VEC4', 'scale': 'VEC3'}[tgt['path']],
                        'f4', bounds=False)
            samplers.append({'input': ii, 'output': oo,
                             'interpolation': q.get('interpolation', 'LINEAR')})
            canais.append({'sampler': len(samplers) - 1,
                           'target': {'node': idx[nm], 'path': tgt['path']}})
        # cauda: blend do fim do equip (pose genérica do General) para o idle da família
        idle_base = next(a for a in j['animations'] if a['name'] == 'idle')
        idle_pose = amostra(idle_base, j, b, 0.0)
        bin_atual = bytes(bd.bin)
        dur_equip = max(accessor(j, bin_atual, sp['input']).ravel().max() for sp in samplers)
        for ci_, ch in enumerate(canais):
            sp = samplers[ch['sampler']]
            ti = accessor(j, bin_atual, sp['input']).ravel()
            vo = accessor(j, bin_atual, sp['output'])
            ni_node = ch['target']['node']
            path = ch['target']['path']
            alvo = idle_pose.get(ni_node, {}).get(path)
            if alvo is None:
                continue
            novos_t = np.append(ti, dur_equip + 0.18)
            novos_v = np.vstack([vo, np.asarray(alvo, dtype=np.float32)[None]]) \
                if path != 'rotation' else np.vstack([vo, (np.asarray(alvo) / np.linalg.norm(alvo)).astype(np.float32)[None]])
            sp['input'] = bd.acc(novos_t.astype(np.float32), 'SCALAR', 'f4')
            sp['output'] = bd.acc(novos_v, 'VEC3' if path == 'translation' else 'VEC4' if path == 'rotation' else 'VEC3',
                                  'f4', bounds=False)
        j['animations'].append({'name': 'equip_rifle', 'channels': canais, 'samplers': samplers})

        # nudge corretivo do nó da arma durante o equip (contato do punho na
        # pose genérica do General); zero nas pontas → sem pop no loop p/ idle
        nud = plano.get('equip_nudge')
        if nud:
            eq = j['animations'][-1]
            durT = dur_equip + 0.18
            base_t = np.asarray(j['nodes'][ni_body]['translation'], dtype=np.float32)
            d_loc = np.asarray(nud['delta_local'], dtype=np.float32)
            w0, w1 = nud['janela']
            ts_n = np.array([0.0, w0 * durT, 0.5 * durT, w1 * durT, durT], dtype=np.float32)
            vs_n = np.array([base_t, base_t + d_loc, base_t + d_loc, base_t, base_t], dtype=np.float32)
            eq['samplers'].append({'input': bd.acc(ts_n, 'SCALAR', 'f4'),
                                   'output': bd.acc(vs_n, 'VEC3', 'f4', bounds=False)})
            eq['channels'].append({'sampler': len(eq['samplers']) - 1,
                                   'target': {'node': ni_body, 'path': 'translation'}})

        # shoot/inspect autorais no nó-raiz RIG_FP_ARMS (movimento rígido do conjunto)
        def trilho(nome, tempos, trans, rots_deg, pivot=None):
            eixo = idx['RIG_FP_ARMS']
            tin = bd.acc(np.array(tempos, dtype=np.float32), 'SCALAR', 'f4')
            sam = []
            ch = []
            qs = None
            if rots_deg is not None:
                qs = []
                for e in rots_deg:
                    rx, ry, rz = np.deg2rad(e)
                    cx, sx = np.cos(rx / 2), np.sin(rx / 2)
                    cy, sy = np.cos(ry / 2), np.sin(ry / 2)
                    cz, sz = np.cos(rz / 2), np.sin(rz / 2)
                    qs.append([sx * cy * cz - cx * sy * sz,
                               cx * sy * cz + sx * cy * sz,
                               cx * cy * sz - sx * sy * cz,
                               cx * cy * cz + sx * sy * sz])
            if trans is not None:
                trans_out = np.asarray(trans, dtype=np.float64)
                if pivot is not None and qs is not None:
                    p_ = np.asarray(pivot, dtype=np.float64)
                    trans_out = np.asarray([
                        t_ + p_ - trs_mat(r=q_)[:3, :3] @ p_
                        for t_, q_ in zip(trans_out, qs)])
                oo = bd.acc(trans_out.astype(np.float32), 'VEC3', 'f4', bounds=False)
                sam.append({'input': tin, 'output': oo})
                ch.append({'sampler': 0, 'target': {'node': eixo, 'path': 'translation'}})
            if qs is not None:
                oo = bd.acc(np.array(qs, dtype=np.float32), 'VEC4', 'f4', bounds=False)
                sam.append({'input': tin, 'output': oo})
                ch.append({'sampler': len(sam) - 1, 'target': {'node': eixo, 'path': 'rotation'}})
            # Um AnimationAction único não mantém automaticamente os tracks do
            # idle que não existem neste clipe. Sem estes holds, ossos de arma
            # e mãos voltam ao bind depois do crossfade e o inspect some. A
            # autoria é rígida: congela a pose idle real e anima só a raiz.
            bin_pose = bytes(bd.bin)
            pose_hold = amostra(idle_base, j, bin_pose, 0.0)
            hold_t = bd.acc(np.array([tempos[0], tempos[-1]], dtype=np.float32),
                            'SCALAR', 'f4')
            occupied = {(c['target']['node'], c['target']['path']) for c in ch}
            for node_i, paths in pose_hold.items():
                for path_, value_ in paths.items():
                    if path_ not in ('translation', 'rotation', 'scale') \
                            or (node_i, path_) in occupied:
                        continue
                    value_ = np.asarray(value_, dtype=np.float32)
                    value_out = np.stack([value_, value_])
                    out_type = 'VEC4' if path_ == 'rotation' else 'VEC3'
                    sam.append({'input': hold_t,
                                'output': bd.acc(value_out, out_type, 'f4', bounds=False)})
                    ch.append({'sampler': len(sam) - 1,
                               'target': {'node': node_i, 'path': path_}})
            j['animations'].append({'name': nome, 'channels': ch, 'samplers': sam})

        def ease(t):
            return 0.5 - 0.5 * np.cos(np.pi * np.clip(t, 0, 1))

        if not plano['shoot_donor']:
            # recuo rígido: 0→0.05s recua/levanta, 0.5s retorna
            ts = [0.0, 0.05, 0.12, 0.22, 0.35, 0.5]
            amp = 0.014
            tr = [[0, 0, 0], [0, 0.004, amp], [0, 0.002, amp * 0.55],
                  [0, 0.001, amp * 0.25], [0, 0, amp * 0.07], [0, 0, 0]]
            ro = [[0, 0, 0], [-1.6, 0, 0], [-0.8, 0, 0], [-0.35, 0, 0], [-0.1, 0, 0], [0, 0, 0]]
            trilho('shoot', ts, tr, ro)
        # inspect: varredura rígida 3.4s
        ts = [0.0, 0.5, 1.1, 1.7, 2.3, 2.8, 3.4]
        tr = [[0, 0, 0], [0, -0.004, 0.02], [0, 0.002, 0.05], [0, 0.004, 0.03],
              [0, 0, 0.02], [0, -0.002, 0.006], [0, 0, 0]]
        ro = [[0, 0, 0], [4, -18, -6], [6, 10, 8], [-2, 24, 4], [2, 8, -4], [1, -6, -1], [0, 0, 0]]
        # Rotacionar a raiz no zero do rig varreria a arma (a ~1,5 m dele) para
        # fora do quadro. A compensação translacional mantém o pivô da arma no
        # lugar e transforma a sequência numa inspeção local, como pretendido.
        pivot_idle = node_mats(j, amostra(idle_base, j, bytes(bd.bin), 0.0))[ni_body][:3, 3]
        trilho('inspect', ts, tr, ro, pivot=pivot_idle)

        # ---- corretiva localizada de contato no inspect ----
        # O inspect move arma e braços rigidamente, mas uma pequena região da
        # luva esquerda do SKS que já estava dentro do receptor torna-se
        # visível no ângulo final. Mantém a pose idle amostrada a 30 Hz e
        # desloca apenas hand_l numa janela curta; fora dela o canal reproduz
        # exatamente a base, sem salto na entrada/saída do clipe.
        correcoes_ci = plano.get('correcoes_inspect', [])
        if correcoes_ci:
            binat_ci = bytes(bd.bin)
            idle_ci = next(a for a in j['animations'] if a['name'] == 'idle')

            def _dur_ci(a):
                return float(max(accessor(j, binat_ci, s['input']).ravel().max()
                                 for s in a['samplers']))

            D_idle_ci = _dur_ci(idle_ci)
            parents_ci = {c: i for i, n in enumerate(j['nodes'])
                          for c in n.get('children', [])}
            for ci in correcoes_ci:
                # A correção anterior anexou accessors ao buffer; a seguinte
                # deve ler a fotografia atual, não os bytes anteriores.
                binat_ci = bytes(bd.bin)
                anim_ci = next(a for a in j['animations'] if a['name'] == ci['clipe'])
                D_ci = _dur_ci(anim_ci)
                t_ci = D_ci * ci['fase']
                bone_ci = idx[ci['osso']]
                ov_ci = {k: dict(v) for k, v in
                         amostra(idle_ci, j, binat_ci, t_ci % D_idle_ci).items()}
                ov_ci.update(amostra(anim_ci, j, binat_ci, t_ci))
                mats_ci = node_mats(j, ov_ci)
                parent_ci = parents_ci[bone_ci]
                A_ci = mats_ci[parent_ci][:3, :3]
                delta_w_ci = np.asarray(ci['delta_world'], dtype=float)
                delta_l_ci = np.linalg.solve(A_ci, delta_w_ci)
                W_ci = np.array([max(0.0, t_ci - 0.28), t_ci - 0.10,
                                 t_ci + 0.10, min(D_ci, t_ci + 0.28)])
                # 30 Hz também preserva o loop curto do idle ao ser promovido
                # a canal explícito dentro do inspect.
                ts_ci = np.linspace(0.0, D_ci, max(2, int(np.ceil(D_ci * 30))) + 1)
                ts_ci = np.unique(np.concatenate([ts_ci, W_ci]))
                env_ci = np.interp(ts_ci, W_ci, [0.0, 1.0, 1.0, 0.0],
                                   left=0.0, right=0.0)
                vals_ci = []
                rest_ci = np.asarray(j['nodes'][bone_ci].get('translation', [0, 0, 0]),
                                     dtype=float)
                for t_ in ts_ci:
                    base_ci = amostra(idle_ci, j, binat_ci, float(t_ % D_idle_ci)) \
                        .get(bone_ci, {}).get('translation', rest_ci)
                    vals_ci.append(np.asarray(base_ci) + env_ci[len(vals_ci)] * delta_l_ci)
                ii_ci = bd.acc(ts_ci.astype(np.float32), 'SCALAR', 'f4')
                oo_ci = bd.acc(np.asarray(vals_ci, dtype=np.float32), 'VEC3', 'f4', bounds=False)
                existing_ci = next((c for c in anim_ci['channels']
                                    if c['target'].get('node') == bone_ci
                                    and c['target']['path'] == 'translation'), None)
                if existing_ci:
                    anim_ci['samplers'][existing_ci['sampler']] = {'input': ii_ci, 'output': oo_ci}
                else:
                    anim_ci['samplers'].append({'input': ii_ci, 'output': oo_ci})
                    anim_ci['channels'].append({'sampler': len(anim_ci['samplers']) - 1,
                                                'target': {'node': bone_ci, 'path': 'translation'}})
                resumo.setdefault('correcao_inspect', {}).setdefault(arma, {})[ci['osso']] = {
                    'clipe': ci['clipe'], 't': round(t_ci, 3),
                    'delta_world_mm': (delta_w_ci * 1000).round(2).tolist(),
                    'delta_local_mm': (delta_l_ci * 1000).round(1).tolist()}

        # ---- SVD: coreografia autoral do osso Mag ----
        # No doador o pente vive estacionado a ~60 cm da arma (a mão faz
        # mímica sem pente); seguir o canal do doador varre a peça por um
        # arco desconexo da mão. Aqui: assenta no alojamento, cai fora de
        # quadro, é carregado pela mão esquerda (offset calibrado por não-
        # penetração) e volta ao alojamento — fases detectadas da palma.
        if plano.get('mag_autoral'):
            import importlib.util as _ilu
            _sp = _ilu.spec_from_file_location(
                'alinh', RAIZ / 'tools/viewmodels/prep/precisao-final-alinhamento.py')
            _alinh = _ilu.module_from_spec(_sp)
            sys.modules.setdefault('alinh', _alinh)
            _sp.loader.exec_module(_alinh)
            binat = bytes(bd.bin)
            idle_anim = next(a for a in j['animations'] if a['name'] == 'idle')

            def _dur(a):
                return float(max(accessor(j, binat, a['samplers'][s]['input']).ravel().max()
                                 for s in range(len(a['samplers']))))

            def _pose(anim, t):
                di = _dur(idle_anim)
                ov = {}
                for k, v in amostra(idle_anim, j, binat, t % di).items():
                    ov[k] = dict(v)
                ov.update(amostra(anim, j, binat, t))
                return ov

            mag_i = idx[peca_cfg['bone']]
            hand_i = idx['hand_l']
            geo_peca = next(i for i, n in enumerate(j['nodes'])
                            if n.get('name') == f'GEO_MINT_{arma.upper()}_PIECE')
            nmag = j['nodes'][mag_i]
            rest_mag = {'translation': nmag.get('translation', [0, 0, 0]),
                        'rotation': nmag.get('rotation', [0, 0, 0, 1]),
                        'scale': nmag.get('scale', [1, 1, 1])}
            T_piece = node_trs(j['nodes'][ni_piece])
            inv_T_piece = np.linalg.inv(T_piece)
            uverts = np.unique(piece_idx)
            c_loc = own_pos[uverts].mean(0)
            # orientação do pente em repouso relativa ao corpo (assentar deve
            # reproduzir o repouso exato — sem pop nem folga no alojamento)
            parents = {c: i for i, n in enumerate(j['nodes']) for c in n.get('children', [])}
            pai_mag = parents[mag_i]

            def _ort(R):
                u, _, vt = np.linalg.svd(R)
                Rn = u @ vt
                if np.linalg.det(Rn) < 0:
                    u[:, -1] *= -1
                    Rn = u @ vt
                return Rn

            ov0 = amostra(idle_anim, j, binat, 0.0)
            ov0[mag_i] = dict(rest_mag)
            m_idle = node_mats(j, ov0)
            R_rel = _ort(m_idle[ni_body][:3, :3]).T @ _ort(m_idle[geo_peca][:3, :3])
            Pv = own_pos[uverts] - c_loc          # casca centrada na centróide

            for anim in j['animations']:
                if anim['name'] not in ('reload_tactical', 'reload_empty'):
                    continue
                D = _dur(anim)
                N = max(40, int(D * 30))
                ts = np.linspace(0.0, D, N + 1)
                seat = np.zeros((N + 1, 3))
                palm = np.zeros_like(seat)
                Rh = np.zeros((N + 1, 3, 3))
                Rb = np.zeros_like(Rh)
                for i, t in enumerate(ts):
                    ov = _pose(anim, float(t))
                    ov_m = {k: dict(v) for k, v in ov.items()}
                    ov_m[mag_i] = dict(rest_mag)
                    m = node_mats(j, ov_m)
                    seat[i] = m[geo_peca][:3, :3] @ c_loc + m[geo_peca][:3, 3]
                    palm[i] = m[hand_i][:3, 3]
                    Rh[i] = _ort(m[hand_i][:3, :3])
                    Rb[i] = _ort(m[ni_body][:3, :3])
                d_palm = np.linalg.norm(palm - seat, axis=1)
                # raio apertado: mão NO pente (6 cm da centróide assentada).
                # Cluster válido exige CHEGADA (período distante antes) — mão
                # parada perto desde o t=0 é handguard, não puxada.
                perto = d_palm < 0.06
                grupos = []
                em = False
                for i in range(N + 1):
                    if perto[i] and not em:
                        st_ = i
                        em = True
                    elif not perto[i] and em:
                        grupos.append((st_, i - 1))
                        em = False
                if em:
                    grupos.append((st_, N))
                grupos = [(a, b) for a, b in grupos if b - a >= 2 and a >= 3]
                pux = grupos[0] if grupos else None
                ins = grupos[-1] if len(grupos) >= 2 else None
                if pux:
                    i_reach, fim_pux = pux
                else:
                    i_reach = int(0.22 * N)
                    fim_pux = i_reach + int(0.05 * N)
                if ins:
                    i_back = ins[0]
                    i_end = min(ins[1] + int(0.06 * N), N)
                else:
                    i_back = int(0.80 * N)
                    i_end = min(i_back + int(0.12 * N), N)
                lo0, lo1 = fim_pux, i_back
                i_low = lo0 + int(np.argmin(palm[lo0:lo1 + 1, 1]))
                i_low = max(min(i_low, i_back - int(0.05 * N)), fim_pux + 1)

                # ---- calibração do offset de empunhadura (mão esquerda) ----
                i_mid = (i_low + i_back) // 2
                t_mid = float(ts[i_mid])
                m_h = node_mats(j, _pose(anim, t_mid))
                hverts = []
                for ni_ in (i_ for i_, n_ in enumerate(j['nodes'])
                            if n_.get('skin') is not None and 'GEO_FP_SK' in n_.get('name', '')):
                    hverts.append(_alinh.deform(_alinh.skin_prims(j, binat, ni_)[0], m_h))
                hv = np.vstack(hverts)
                near = hv[np.linalg.norm(hv - palm[i_mid], axis=1) < 0.07]
                if len(near) > 48:
                    near = near[np.argsort(np.linalg.norm(near - palm[i_mid], axis=1))[:48]]
                # casca do pente em orientação do corpo, centrada na palma
                remap = np.full(len(own_pos), -1, dtype=int)
                remap[uverts] = np.arange(len(uverts))
                Tv = remap[piece_idx]
                best = (np.inf, np.zeros(3), 9.9)
                R_mid = Rb[i_mid] @ R_rel
                for dx in np.arange(-0.04, 0.0401, 0.010):
                    for dy in np.arange(-0.06, 0.0301, 0.010):
                        for dz in np.arange(-0.04, 0.0801, 0.010):
                            off_w = Rh[i_mid] @ np.array([dx, dy, dz])
                            cen = palm[i_mid] + off_w
                            tris = Pv[Tv].copy()
                            tris = tris @ R_mid.T + cen
                            dd, ss = _alinh.closest_info(near, tris)
                            pen = float((np.maximum(0.003 - dd, 0) ** 2).sum() * 1e7
                                        + (np.maximum(dd - 0.022, 0) ** 2).sum() * 2e3)
                            if pen < best[0]:
                                best = (pen, np.array([dx, dy, dz]), float(dd.min()))
                off_local = best[1]
                resumo.setdefault('mag_autoral', {})[anim['name']] = {
                    'offset_local': off_local.round(4).tolist(),
                    'fases': [float(ts[i]) for i in (i_reach, i_low, i_back, i_end)],
                    'custo': round(best[0], 2),
                    'dd_min_mm': round(best[2] * 1000, 1),
                    'grupos': [list(map(int, g)) for g in grupos]}

                # ---- centro desejado por amostra ----
                k_ap = max(2, int(0.08 * N))
                # vértices de mão por amostra no carrego (de-penetração)
                hv_ts = {}
                for i in range(fim_pux + 1, min(i_end + 1, N + 1)):
                    mm = node_mats(j, _pose(anim, float(ts[i])))
                    vv = []
                    for ni_ in (i_ for i_, n_ in enumerate(j['nodes'])
                                if n_.get('skin') is not None and 'GEO_FP_SK' in n_.get('name', '')):
                        vv.append(_alinh.deform(_alinh.skin_prims(j, binat, ni_)[0], mm))
                    hvt = np.vstack(vv)
                    ancora = palm[i] + (Rh[i] @ off_local)
                    near2 = hvt[np.linalg.norm(hvt - ancora, axis=1) < 0.075]
                    if len(near2) > 80:
                        near2 = near2[np.argsort(np.linalg.norm(near2 - ancora, axis=1))[:80]]
                    hv_ts[i] = near2
                cen = np.zeros_like(seat)
                for i in range(N + 1):
                    off_w = Rh[i] @ off_local
                    na_mao = palm[i] + off_w
                    if i <= fim_pux:
                        cen[i] = seat[i]
                    elif i < i_back:
                        # puxada e carrego: o pente segue a mão continuamente
                        cen[i] = na_mao
                    elif i < i_end:
                        f = (i - i_back) / max(1, i_end - i_back)
                        cen[i] = na_mao * (1 - f) + seat[i] * f
                    else:
                        cen[i] = seat[i]
                    # de-penetração: afasta o pente da palma até 3,5 mm de
                    # folga (teto 36 mm), preservando o carrego visível
                    if fim_pux < i <= i_end and len(hv_ts.get(i, ())):
                        near2 = hv_ts[i]
                        rad = cen[i] - palm[i]
                        rad = rad / max(np.linalg.norm(rad), 1e-6)
                        for _ in range(4):
                            tris2 = Pv[Tv] @ (Rb[i] @ R_rel).T + cen[i]
                            dd2, _ = _alinh.closest_info(near2, tris2)
                            falta = float(np.maximum(0.0045 - dd2, 0).max())
                            if falta <= 0:
                                break
                            cen[i] = cen[i] + rad * min(falta + 0.0015, 0.012)

                # ---- canais do osso Mag (translação+rotação) ----
                k_t = np.zeros((N + 1, 3))
                k_r = np.zeros((N + 1, 4))
                for i, t in enumerate(ts):
                    ov = _pose(anim, float(t))
                    m = node_mats(j, ov)
                    T_des = np.eye(4)
                    T_des[:3, :3] = Rb[i] @ R_rel
                    T_des[:3, 3] = cen[i]
                    T_cinv = np.eye(4)
                    T_cinv[:3, 3] = -c_loc
                    bone_w = T_des @ T_cinv @ inv_T_piece
                    bone_l = np.linalg.inv(m[pai_mag]) @ bone_w
                    k_t[i] = bone_l[:3, 3]
                    m4 = np.eye(4)
                    m4[:3, :3] = _ort(bone_l[:3, :3])
                    k_r[i] = quat_de_matriz(m4)
                anim['channels'] = [c for c in anim['channels']
                                    if c['target'].get('node') != mag_i]
                ii = bd.acc(ts.astype(np.float32), 'SCALAR', 'f4')
                anim['samplers'].append({'input': ii,
                                         'output': bd.acc(k_t.astype(np.float32), 'VEC3', 'f4', bounds=False)})
                anim['channels'].append({'sampler': len(anim['samplers']) - 1,
                                         'target': {'node': mag_i, 'path': 'translation'}})
                anim['samplers'].append({'input': ii,
                                         'output': bd.acc(k_r.astype(np.float32), 'VEC4', 'f4', bounds=False)})
                anim['channels'].append({'sampler': len(anim['samplers']) - 1,
                                         'target': {'node': mag_i, 'path': 'rotation'}})

            # ---- corretiva de braço: punho/antebraço direito entra ~1 cm no
            # receptor durante a inclinação da recarga (doador tem folga aí;
            # nosso receptor é um pouco maior). Empurra a cadeia direita numa
            # janela curta, na direção de extração medida pelo gate. ----
            cb = plano.get('correcao_braco')
            arq_of = META / f'c-ofensores-{arma}.json'
            if cb and arq_of.exists():
                binat = bytes(bd.bin)   # inclui canais do Mag recém-anexados
                of = [x for x in json.loads(arq_of.read_text())
                      if x['clipe'] == cb['clipe'] and x['vermelho']]
                if of:
                    e0 = max(of, key=lambda x: len(x['vermelho']))
                    anim = next(a for a in j['animations'] if a['name'] == cb['clipe'])
                    D_c = _dur(anim)
                    t_off = min(max(e0['t'], 0.35), D_c - 0.35)
                    mats_c = node_mats(j, _pose(anim, t_off))
                    tris_c = []
                    for ni_ in (i_ for i_, n_ in enumerate(j['nodes'])
                                if n_.get('mesh') is not None
                                and (n_.get('name', '').startswith('GEO_MINT_')
                                     or n_.get('name', '').startswith('GEO_PROC_'))):
                        M_ = mats_c[ni_]
                        for p_ in j['meshes'][j['nodes'][ni_]['mesh']]['primitives']:
                            pos_ = accessor(j, binat, p_['attributes']['POSITION']).astype(np.float64)
                            w_ = (pos_ @ M_[:3, :3].T) + M_[:3, 3]
                            ii_ = accessor(j, binat, p_['indices']).astype(int).reshape(-1, 3) \
                                if 'indices' in p_ else np.arange(len(w_)).reshape(-1, 3)
                            tris_c.append(w_[ii_])
                    tris_c = np.vstack(tris_c)
                    Vs = np.array(e0['vermelho'])
                    a_, b_, c_ = tris_c[:, 0], tris_c[:, 1], tris_c[:, 2]
                    ab_, ac_ = b_ - a_, c_ - a_
                    aa = np.einsum('ti,ti->t', ab_, ab_)
                    bb = np.einsum('ti,ti->t', ab_, ac_)
                    cc = np.einsum('ti,ti->t', ac_, ac_)
                    det_ = aa * cc - bb * bb
                    safe_ = np.abs(det_) > 1e-15
                    bc_ = c_ - b_
                    bcn = np.einsum('ti,ti->t', bc_, bc_)
                    qs = []
                    for p_ in Vs:
                        ap_ = p_ - a_
                        d1 = np.einsum('ti,ti->t', ap_, ab_)
                        d2 = np.einsum('ti,ti->t', ap_, ac_)
                        u_ = np.where(safe_, (cc * d1 - bb * d2) / np.where(safe_, det_, 1), 0)
                        v_ = np.where(safe_, (aa * d2 - bb * d1) / np.where(safe_, det_, 1), 0)
                        ins_ = (u_ >= 0) & (v_ >= 0) & (u_ + v_ <= 1)
                        q_in = a_ + u_[:, None] * ab_ + v_[:, None] * ac_
                        t_ab = np.clip(d1 / np.where(aa > 1e-15, aa, 1), 0, 1)
                        q_ab = a_ + t_ab[:, None] * ab_
                        t_ac = np.clip(d2 / np.where(cc > 1e-15, cc, 1), 0, 1)
                        q_ac = a_ + t_ac[:, None] * ac_
                        bp_ = p_ - b_
                        t_bc = np.clip(np.einsum('ti,ti->t', np.broadcast_to(bp_, bc_.shape), bc_)
                                       / np.where(bcn > 1e-15, bcn, 1), 0, 1)
                        q_bc = b_ + t_bc[:, None] * bc_
                        cand = np.stack([q_in, q_ab, q_ac, q_bc,
                                         np.broadcast_to(a_, q_ab.shape),
                                         np.broadcast_to(b_, q_ab.shape),
                                         np.broadcast_to(c_, q_ab.shape)])
                        darr = np.linalg.norm(cand - p_, axis=2)
                        darr[0, ~ins_] = 1e9
                        k_ = np.unravel_index(np.argmin(darr), darr.shape)
                        qs.append(cand[k_])
                    delta_w = np.array(qs).mean(0) - Vs.mean(0)
                    delta_w *= 1.6
                    n_ = np.linalg.norm(delta_w)
                    if n_ < 0.012:
                        delta_w *= 0.012 / max(n_, 1e-9)
                    if n_ > 0.02:
                        delta_w *= 0.02 / n_
                    bone_i = idx[cb['osso']]
                    Rp = _ort(mats_c[parents[bone_i]][:3, :3])
                    # o espaço local do osso carrega escala herdada (raiz 0.01
                    # compensada ~100 nos níveis baixos): converte o delta do
                    # mundo para a unidade local correta
                    esc_p = float(np.linalg.norm(mats_c[parents[bone_i]][:3, :3], axis=0).mean())
                    delta_l = Rp.T @ delta_w / esc_p
                    ch_ = next((c for c in anim['channels']
                                if c['target'].get('node') == bone_i
                                and c['target']['path'] == 'translation'), None)
                    if ch_ is not None:
                        sp_ = anim['samplers'][ch_['sampler']]
                        ts_o = accessor(j, binat, sp_['input']).ravel().astype(np.float64)
                        vs_o = accessor(j, binat, sp_['output']).astype(np.float64)
                        W = [max(0.0, t_off - 0.30), t_off - 0.10, t_off + 0.10,
                             min(D_c, t_off + 0.30)]
                        env = [0.0, 1.0, 1.0, 0.0]

                        def _env(t):
                            if t <= W[0] or t >= W[3]:
                                return 0.0
                            for k_ in range(3):
                                if W[k_] <= t <= W[k_ + 1]:
                                    f_ = (t - W[k_]) / max(1e-9, W[k_ + 1] - W[k_])
                                    return env[k_] * (1 - f_) + env[k_ + 1] * f_
                            return 0.0

                        ts_n = np.unique(np.concatenate([ts_o, np.array(W)]))
                        env_n = np.array([_env(x) for x in ts_n])
                        vs_n = np.stack([np.interp(ts_n, ts_o, vs_o[:, kk])
                                         + env_n * delta_l[kk] for kk in range(3)], axis=1)
                        sp_['input'] = bd.acc(ts_n.astype(np.float32), 'SCALAR', 'f4')
                        sp_['output'] = bd.acc(vs_n.astype(np.float32), 'VEC3', 'f4', bounds=False)
                        resumo.setdefault('correcao_braco', {})[cb['clipe']] = {
                            't': round(t_off, 3),
                            'delta_local_mm': (delta_l * 1000).round(1).tolist()}

            # ---- corretiva local do polegar direito. O afinamento das mangas
            # tornou visível uma interpenetração que já existia sob o tecido.
            # Move só a falange responsável, numa janela curta da recarga; mão,
            # carregador e contato do grip permanecem nos clipes originais. ----
            cp = plano.get('correcao_polegar')
            if cp:
                binat = bytes(bd.bin)
                anim = next(a for a in j['animations'] if a['name'] == cp['clipe'])
                D_p = _dur(anim)
                t_p = D_p * cp['fase']
                bone_i = idx[cp['osso']]
                mats_p = node_mats(j, _pose(anim, t_p))
                parent_i = parents[bone_i]
                R_p = _ort(mats_p[parent_i][:3, :3])
                scale_p = float(np.linalg.norm(mats_p[parent_i][:3, :3], axis=0).mean())
                delta_w = np.array(cp['delta_world'], dtype=float)
                delta_l = R_p.T @ delta_w / scale_p
                ch_p = next((c for c in anim['channels']
                             if c['target'].get('node') == bone_i
                             and c['target']['path'] == 'translation'), None)
                if ch_p is not None:
                    sp_p = anim['samplers'][ch_p['sampler']]
                    ts_o = accessor(j, binat, sp_p['input']).ravel().astype(np.float64)
                    vs_o = accessor(j, binat, sp_p['output']).astype(np.float64)
                else:
                    ts_o = np.array([0.0, D_p], dtype=np.float64)
                    rest_t = np.array(j['nodes'][bone_i].get('translation', [0, 0, 0]), dtype=float)
                    vs_o = np.stack([rest_t, rest_t])
                    sp_p = None
                W = np.array([max(0.0, t_p - 0.28), t_p - 0.10,
                              t_p + 0.10, min(D_p, t_p + 0.28)])
                ts_n = np.unique(np.concatenate([ts_o, W]))
                env_n = np.interp(ts_n, W, [0.0, 1.0, 1.0, 0.0], left=0.0, right=0.0)
                vs_n = np.stack([np.interp(ts_n, ts_o, vs_o[:, kk])
                                 + env_n * delta_l[kk] for kk in range(3)], axis=1)
                ii_p = bd.acc(ts_n.astype(np.float32), 'SCALAR', 'f4')
                oo_p = bd.acc(vs_n.astype(np.float32), 'VEC3', 'f4', bounds=False)
                if sp_p is None:
                    anim['samplers'].append({'input': ii_p, 'output': oo_p})
                    anim['channels'].append({'sampler': len(anim['samplers']) - 1,
                                             'target': {'node': bone_i, 'path': 'translation'}})
                else:
                    sp_p['input'], sp_p['output'] = ii_p, oo_p
                resumo.setdefault('correcao_polegar', {})[cp['clipe']] = {
                    't': round(t_p, 3),
                    'delta_world_mm': (delta_w * 1000).round(1).tolist(),
                    'delta_local_mm': (delta_l * 1000).round(1).tolist()}

        # ---- grava GLB ----
        j['buffers'][0]['byteLength'] = len(bd.bin)
        json_bytes = json.dumps(j, separators=(',', ':')).encode()
        while len(json_bytes) % 4:
            json_bytes += b' '
        suffix = 'runtime'
        if args.mutante_peca:
            suffix = 'mutant-piece'
        elif args.mutant_clip_index:
            suffix = 'mutant-clip'
        elif args.mutant_sleeve_double_sided:
            suffix = 'mutant-sleeve'
        out = OUT / f'{arma}-baked-{suffix}.glb'
        total = 12 + 8 + len(json_bytes) + 8 + len(bd.bin)
        with open(out, 'wb') as fh:
            fh.write(b'glTF\x02\x00\x00\x00')
            fh.write(struct.pack('<I', total))
            fh.write(struct.pack('<I', len(json_bytes)))
            fh.write(b'JSON')
            fh.write(json_bytes)
            fh.write(struct.pack('<I', len(bd.bin)))
            fh.write(b'BIN\x00')
            fh.write(bytes(bd.bin))
        resumo[arma] = {
            'out': str(out), 'bytes': out.stat().st_size,
            'tri_body': int(len(body_idx)), 'tri_peca': int(len(piece_idx)),
            'clipes': [a['name'] for a in j['animations']],
        }
        print('==', arma, resumo[arma]['bytes'], 'bytes | tris corpo/peça:',
              len(body_idx), '/', len(piece_idx), '| clipes:', resumo[arma]['clipes'])

    (OUT / 'build-resumo.json').write_text(json.dumps(resumo, indent=1) + '\n')


if __name__ == '__main__':
    main()
