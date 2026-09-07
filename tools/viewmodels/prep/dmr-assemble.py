#!/usr/bin/env python3
"""Splice glTF-level das candidatas DMR (lane vm-dmr-final).

Base = GLB de família da produção (bolt-runtime/g3-runtime: braços + rigs +
clipes + câmera, já servidos no jogo). Insumo = mini-GLB rígido do Blender
(dm r-build.py extrair: Mint/peça/props/sockets em coordenadas de mundo).

Cada peça vira NÓ FILHO RÍGIDO do bone correspondente (sem skin — o mesmo
mecanismo de hierarquia que o glTF usa para qualquer node). O local TRS é
calculado para que a pose de mundo no repouso seja EXATAMENTE a registrada no
Blender: local = inv(mundo_do_pai_no_runtime) @ mundo_da_peça. Assim o que o
three reconstrói na carga é a composição aprovada, independente das
peculiaridades internas do rig doador.

O nó/malha da arma DOADORA é removido; braços, clipes e câmera ficam intactos.
Saída: <arma>-baked-runtime.glb + assemble-report.json.
"""
import json
import math
import os
import struct
import sys

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
ART = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr')
INTEGRADORA = '/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol'
PACKS = os.path.join(INTEGRADORA, 'public', 'private-assets', 'viewmodels')

ARMAS = {
    'rem700': {
        'base': os.path.join(PACKS, 'bolt', 'bolt-runtime.glb'),
        'mini': os.path.join(ART, 'rem700', 'cand1', 'rem700-rigid.glb'),
        'saida': os.path.join(ART, 'rem700', 'cand1', 'rem700-baked-runtime.glb'),
        'remove_doador': ['GEO_WEAPON_BOLT_Kar98K'],
        'pais': {
            'MINT_WEAPON_REM700': 'StaticBolt',
            'MINT_BOLT_REM700': 'Bolt',
            'PROPS_Clip': 'Clip',
            'PROPS_Cartridge': 'Cartridge',
            'PROPS_CartridgeClip0': 'CartridgeClip0',
            'PROPS_CartridgeClip1': 'CartridgeClip1',
            'PROPS_CartridgeClip2': 'CartridgeClip2',
            'PROPS_CartridgeClip3': 'CartridgeClip3',
            'PROPS_CartridgeClip4': 'CartridgeClip4',
        },
        'sockets_pai': 'MINT_WEAPON_REM700',
    },
    'g3sg1': {
        'base': os.path.join(PACKS, 'g3', 'g3-runtime.glb'),
        'mini': os.path.join(ART, 'g3sg1', 'cand1', 'g3sg1-rigid.glb'),
        'saida': os.path.join(ART, 'g3sg1', 'cand1', 'g3sg1-baked-runtime.glb'),
        'remove_doador': ['GEO_WEAPON_G3_G3.001'],
        'pais': {
            'MINT_WEAPON_G3SG1': 'RIG_WEAPON_G3',
            'MINT_MAG_G3SG1': 'Mag',
        },
        'sockets_pai': 'MINT_WEAPON_G3SG1',
    },
}


# ------------------------------------------------------------ GLB io

def le_glb(caminho):
    with open(caminho, 'rb') as fh:
        raw = fh.read()
    if raw[:4] != b'glTF':
        raise SystemExit(f'não é GLB: {caminho}')
    total = struct.unpack('<I', raw[8:12])[0]
    doc = None
    bin_chunk = b''
    off = 12
    while off < total:
        clen, ctype = struct.unpack('<II', raw[off:off + 8])
        data = raw[off + 8:off + 8 + clen]
        if ctype == 0x4E4F534A:
            doc = json.loads(data.decode('utf-8').rstrip('\x00 '))
        elif ctype == 0x004E4942:
            bin_chunk = data
        off += 8 + clen + ((4 - (clen % 4)) % 4)
    return doc, bin_chunk


def escreve_glb(caminho, doc, bin_data):
    js = json.dumps(doc, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    if len(bin_data) % 4:
        bin_data = bin_data + b'\x00' * (4 - len(bin_data) % 4)
    total = 12 + 8 + len(js) + 8 + len(bin_data)
    with open(caminho, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A))
        fh.write(js)
        fh.write(struct.pack('<II', len(bin_data), 0x004E4942))
        fh.write(bin_data)


# ------------------------------------------------------------ mat4

def identidade():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def inversa(m):
    # Gauss-Jordan 4x4
    n = 4
    a = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(m)]
    for col in range(n):
        pivo = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivo][col]) < 1e-12:
            raise ValueError('matriz singular')
        a[col], a[pivo] = a[pivo], a[col]
        p = a[col][col]
        a[col] = [v / p for v in a[col]]
        for r in range(n):
            if r != col and a[r][col] != 0:
                f = a[r][col]
                a[r] = [v - f * w for v, w in zip(a[r], a[col])]
    return [row[n:] for row in a]


def trs_para_matriz(no):
    m = identidade()
    if 'matrix' in no:
        # glTF 'matrix' é COLUMN-MAJOR: elemento (i,j) = m[j*4+i]
        return [[no['matrix'][j * 4 + i] for j in range(4)] for i in range(4)]
    t = no.get('translation', [0, 0, 0])
    q = no.get('rotation', [0, 0, 0, 1])
    s = no.get('scale', [1, 1, 1])
    x, y, z, w = q
    # rotação por quaternion (coluna-major do glTF é tratada como linha aqui,
    # porque só usamos o produto consistente com a mesma convenção)
    r = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    for i in range(3):
        for j in range(3):
            m[i][j] = r[i][j] * s[j]
        m[i][3] = t[i]
    return m


def matriz_para_trs(m):
    tx, ty, tz = m[0][3], m[1][3], m[2][3]
    sx = math.sqrt(sum(m[i][0] ** 2 for i in range(3)))
    sy = math.sqrt(sum(m[i][1] ** 2 for i in range(3)))
    sz = math.sqrt(sum(m[i][2] ** 2 for i in range(3)))
    r = [[m[i][j] / (s if abs(s) > 1e-12 else 1.0) for j, s in enumerate((sx, sy, sz))]
         for i in range(3)]
    tr = r[0][0] + r[1][1] + r[2][2]
    if tr > 0:
        s_ = math.sqrt(tr + 1.0) * 2
        w = 0.25 * s_
        x = (r[2][1] - r[1][2]) / s_
        y = (r[0][2] - r[2][0]) / s_
        z = (r[1][0] - r[0][1]) / s_
    elif r[0][0] > r[1][1] and r[0][0] > r[2][2]:
        s_ = math.sqrt(1.0 + r[0][0] - r[1][1] - r[2][2]) * 2
        w = (r[2][1] - r[1][2]) / s_
        x = 0.25 * s_
        y = (r[0][1] + r[1][0]) / s_
        z = (r[0][2] + r[2][0]) / s_
    elif r[1][1] > r[2][2]:
        s_ = math.sqrt(1.0 + r[1][1] - r[0][0] - r[2][2]) * 2
        w = (r[0][2] - r[2][0]) / s_
        x = (r[0][1] + r[1][0]) / s_
        y = 0.25 * s_
        z = (r[1][2] + r[2][1]) / s_
    else:
        s_ = math.sqrt(1.0 + r[2][2] - r[0][0] - r[1][1]) * 2
        w = (r[1][0] - r[0][1]) / s_
        x = (r[0][2] + r[2][0]) / s_
        y = (r[1][2] + r[2][1]) / s_
        z = 0.25 * s_
    return [tx, ty, tz], [x, y, z, w], [sx, sy, sz]


def vertices_da_malha(doc, bin_data, mesh_idx):
    mesh = doc['meshes'][mesh_idx]
    prim = mesh['primitives'][0]
    acc = doc['accessors'][prim['attributes']['POSITION']]
    bv = doc['bufferViews'][acc['bufferView']]
    offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    n = acc['count']
    import struct as _s
    dados = bin_data[offset:offset + n * 12]
    return [list(_s.unpack('<fff', dados[i * 12:(i + 1) * 12])) for i in range(n)]


def mundo_do_no(doc, indice):
    """Matriz de mundo (glTF space) do nó, subindo a cadeia de pais."""
    filhos = {}
    for i, n in enumerate(doc['nodes']):
        for c in n.get('children', []):
            filhos[c] = i
    m = trs_para_matriz(doc['nodes'][indice])
    atual = indice
    while atual in filhos:
        atual = filhos[atual]
        m = mul(trs_para_matriz(doc['nodes'][atual]), m)
    return m


# ------------------------------------------------------------ splice

def montar(arma, cfg):
    base_doc, base_bin = le_glb(cfg['base'])
    mini_doc, mini_bin = le_glb(cfg['mini'])
    relatorio = {'arma': arma, 'base': cfg['base'], 'mini': cfg['mini'], 'saidas': [], 'removidos': []}

    indice_por_nome = {n.get('name', ''): i for i, n in enumerate(base_doc['nodes'])}
    mini_indice = {n.get('name', ''): i for i, n in enumerate(mini_doc['nodes'])}

    # 1. remove o mesh da arma doadora (nó, mesh, skin permanecem os demais)
    for alvo in cfg['remove_doador']:
        if alvo not in indice_por_nome:
            raise SystemExit(f'nó doador ausente: {alvo}')
        idx = indice_por_nom = indice_por_nome[alvo]
        no = base_doc['nodes'][idx]
        mesh_idx = no.get('mesh')
        for cena in base_doc.get('scenes', []):
            cena['nodes'] = [n for n in cena.get('nodes', []) if n != idx]
        for n in base_doc['nodes']:
            n['children'] = [c for c in n.get('children', []) if c != idx]
        no.pop('mesh', None)
        no.pop('skin', None)
        relatorio['removidos'].append(alvo)

    # 2. anexa buffer do mini no base (offset de bufferView)
    offset_bin = len(base_bin)
    novos_buffer_views = []
    for bv in mini_doc.get('bufferViews', []):
        novo = dict(bv)
        novo['buffer'] = 0
        novo['byteOffset'] = bv.get('byteOffset', 0) + offset_bin
        novos_buffer_views.append(novo)
    bin_final = base_bin + mini_bin

    def reindexa(lista, chave):
        mapa = {}
        for i, item in enumerate(lista):
            mapa[f'{chave}:{i}'] = len(base_doc.setdefault(chave, [])) + i
        return mapa

    acc_map = reindexa(mini_doc.get('accessors', []), 'accessors')
    mat_map = reindexa(mini_doc.get('materials', []), 'materials')
    mesh_map = reindexa(mini_doc.get('meshes', []), 'meshes')

    # 3. copia accessors/materiais/meshes com índices corrigidos
    for i, acc in enumerate(mini_doc.get('accessors', [])):
        novo = dict(acc)
        if 'bufferView' in novo:
            novo['bufferView'] = len(base_doc.get('bufferViews', [])) + \
                next(j for j, bv in enumerate(mini_doc['bufferViews']) if j == novo['bufferView'])
        base_doc.setdefault('accessors', []).append(novo)
    base_doc.setdefault('bufferViews', []).extend(novos_buffer_views)
    for mat in mini_doc.get('materials', []):
        base_doc.setdefault('materials', []).append(dict(mat))
    for i, mesh in enumerate(mini_doc.get('meshes', [])):
        novo = dict(mesh)
        prims = []
        for prim in novo['primitives']:
            p = dict(prim)
            p['indices'] = acc_map[f'accessors:{p["indices"]}'] if 'indices' in p else None
            if p.get('indices') is None:
                p.pop('indices', None)
            attrs = {}
            for k, v in p['attributes'].items():
                attrs[k] = acc_map[f'accessors:{v}']
            p['attributes'] = attrs
            if 'material' in p:
                p['material'] = mat_map[f'materials:{p["material"]}']
            prims.append(p)
        novo['primitives'] = prims
        base_doc.setdefault('meshes', []).append(novo)

    base_doc.setdefault('buffers', [{}])[0]['byteLength'] = len(bin_final)

    # 4. cria nós rígidos sob os bones, com local = inv(pai_mundo) @ peça_mundo
    for nome_peca, nome_pai in cfg['pais'].items():
        if nome_peca not in mini_indice:
            relatorio['saidas'].append({'peca': nome_peca, 'estado': 'AUSENTE_NO_MINI'})
            continue
        if nome_pai not in indice_por_nome:
            raise SystemExit(f'pai ausente no base: {nome_pai}')
        mundo_peca = mundo_do_no(mini_doc, mini_indice[nome_peca])
        mundo_pai = mundo_do_no(base_doc, indice_por_nome[nome_pai])
        local = mul(inversa(mundo_pai), mundo_peca)
        t, r, s = matriz_para_trs(local)
        no_mini = mini_doc['nodes'][mini_indice[nome_peca]]
        mesh_orig = no_mini.get('mesh')
        no = {'name': nome_peca, 'mesh': mesh_map[f'meshes:{mesh_orig}'],
              'translation': [round(v, 6) for v in t],
              'rotation': [round(v, 6) for v in r],
              'scale': [round(v, 6) for v in s]}
        base_doc['nodes'].append(no)
        idx_novo = len(base_doc['nodes']) - 1
        pai = base_doc['nodes'][indice_por_nome[nome_pai]]
        pai.setdefault('children', []).append(idx_novo)
        relatorio['saidas'].append({'peca': nome_peca, 'pai': nome_pai, 'no': idx_novo,
                                    'local_t': [round(v, 3) for v in t],
                                    'local_s': [round(v, 3) for v in s]})

    # 5. sockets calculados dos VÉRTICES reais da Mint no mini (a cadeia de
    # empties do blend não sobrevive ao export com escala limpa; os vértices sim).
    corpo_idx = next(i for i, n in enumerate(base_doc['nodes'])
                     if n.get('name') == cfg['sockets_pai'])
    corpo_mini = mini_doc['nodes'][mini_indice[cfg['sockets_pai']]]
    verts = vertices_da_malha(mini_doc, mini_bin, corpo_mini['mesh'])
    eixo = max(range(3), key=lambda i: max(v[i] for v in verts) - min(v[i] for v in verts))
    vs_eixo = sorted(verts, key=lambda v: v[eixo])
    # boca = extremo mais FINO (cano), coronha = extremo grosso
    def espessura(pts):
        vals = [[p[i] for p in pts] for i in range(3) if i != eixo]
        return max(max(a) - min(a) for a in vals)
    fino_no_min = espessura(vs_eixo[:max(4, len(verts) // 60)]) < espessura(vs_eixo[-max(4, len(verts) // 60):])
    sinal_boca = -1 if fino_no_min else 1
    boca = vs_eixo[0] if sinal_boca < 0 else vs_eixo[-1]
    cima = next(i for i in range(3) if i != eixo)
    alt_min = min(v[cima] for v in verts)
    alt_max = max(v[cima] for v in verts)
    topo = [v for v in verts if v[cima] >= alt_min + 0.88 * (alt_max - alt_min)]
    mira = (min if sinal_boca < 0 else max)(topo, key=lambda v: v[eixo]) if topo else boca
    mundo_pai = mundo_do_no(base_doc, corpo_idx)
    for nome_socket, ponto in (('SOCKET_MINT_MUZZLE', boca), ('SOCKET_MINT_SIGHT', mira)):
        local = mul(inversa(mundo_pai), trs_para_matriz({'translation': list(ponto)}))
        t, r, s_ = matriz_para_trs(local)
        no = {'name': nome_socket, 'translation': [round(v, 6) for v in t],
              'rotation': [round(v, 6) for v in r], 'scale': [round(v, 6) for v in s_]}
        base_doc['nodes'].append(no)
        base_doc['nodes'][corpo_idx].setdefault('children', []).append(len(base_doc['nodes']) - 1)
        relatorio['saidas'].append({'peca': nome_socket, 'pai': cfg['sockets_pai'],
                                    'mundo_mini': [round(v, 4) for v in ponto]})

    escreve_glb(cfg['saida'], base_doc, bin_final)
    with open(os.path.join(os.path.dirname(cfg['saida']), 'assemble-report.json'), 'w') as fh:
        json.dump(relatorio, fh, indent=1)
    print('DMR_ASSEMBLE_OK', arma, cfg['saida'], 'pecas', len(relatorio['saidas']))


if __name__ == '__main__':
    alvo = sys.argv[1] if len(sys.argv) > 1 else ''
    for arma, cfg in ARMAS.items():
        if alvo and arma != alvo:
            continue
        montar(arma, cfg)
