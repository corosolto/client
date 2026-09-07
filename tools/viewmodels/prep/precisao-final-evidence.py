"""Evidência visual offline dos GLBs assados: renders com a câmera real do runtime.

Fase A (este script em python puro): para cada arma/clip/fase, assa a pose
(avaliador próprio, mesma semântica three.js, idle-em-loop sob clipes autorais)
num GLB temporário sem animações.
Fase B (Blender): importa o GLB de pose, aplica câmera-inversa + mount do
FAMILY_FRAME (com variante ADS ads=0.55) e rende 1440 px em 3:2/16:9.

Uso:
  blender --background --factory-startup --python precisao-final-evidence.py
Saída em A/final/evidence/<arma>/...
"""
import bpy
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np

RAIZ = Path('/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao')
F = RAIZ / 'artifacts/viewmodels/prep/precisao/final'

FAMILIA = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'marksman'}


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


def node_trs(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    m = np.eye(4)
    m[:3, :3] = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]) @ np.diag(n.get('scale', [1, 1, 1]))
    m[:3, 3] = n.get('translation', [0, 0, 0])
    return m


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


def clip_dur(anim, j, b):
    return float(max(accessor(j, b, anim['samplers'][s]['input']).ravel().max()
                     for s in range(len(anim['samplers']))))


ICO_V = None


def ico_mesh():
    """Icosaedro unitário (12 verts, 20 tris) para marcadores esféricos."""
    global ICO_V
    if ICO_V is None:
        p = (1 + math.sqrt(5)) / 2
        ICO_V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0],
                 [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p],
                 [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]]
        ICO_V = (np.array(ICO_V, dtype=np.float64) / math.sqrt(1 + p * p)).tolist()
    F_ = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
          [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
          [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
          [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    return ICO_V, [v for f in F_ for v in f]


def acrescentar_marcadores(j, b, marc, r=0.008):
    """Injeta nós-esfera nos marcadores (coords de mundo do GLB, mesmo espaço
    do gates): vermelho = penetração visível na cena; amarelo = visível só
    pela arma (deve SUMIR no render — prova da oclusão pelas mãos)."""
    verts, idx = ico_mesh()
    verts = [[c * r for c in v] for v in verts]
    bin_extra = bytearray()
    bvs = []
    accs = []
    bv_base = len(j['bufferViews'])
    for arr, tipo, comp in ((verts, 'VEC3', 5126), (idx, 'SCALAR', 5125)):
        dt = '<f4' if comp == 5126 else '<u4'
        raw = np.array(arr, dtype=dt).tobytes()
        while (len(b) + len(bin_extra)) % 4:
            bin_extra += b'\x00'
        bvs.append({'buffer': 0, 'byteOffset': len(b) + len(bin_extra),
                    'byteLength': len(raw)})
        acc = {'bufferView': bv_base + len(bvs) - 1, 'componentType': comp,
               'count': len(arr), 'type': tipo}
        if tipo == 'VEC3':
            mn = [min(v[k] for v in verts) for k in range(3)]
            mx = [max(v[k] for v in verts) for k in range(3)]
            acc.update({'min': mn, 'max': mx})
        accs.append(acc)
        bin_extra += raw
    j['bufferViews'] += bvs
    j['accessors'] += accs
    acc_pos = len(j['accessors']) - 2
    acc_idx = len(j['accessors']) - 1
    j['materials'] += [{'name': 'MARCA_VERMELHO', 'pbrMetallicRoughness': {
        'baseColorFactor': [1, 0, 0, 1], 'metallicFactor': 0, 'roughnessFactor': 1}},
        {'name': 'MARCA_AMARELO', 'pbrMetallicRoughness': {
        'baseColorFactor': [1, 0.85, 0, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}]
    j['meshes'] += [{'primitives': [{'attributes': {'POSITION': acc_pos},
                                     'indices': acc_idx,
                                     'material': len(j['materials']) - 2}]},
                    {'primitives': [{'attributes': {'POSITION': acc_pos},
                                     'indices': acc_idx,
                                     'material': len(j['materials']) - 1}]}]
    novos = []
    for cor, mi in (('vermelho', 0), ('amarelo', 1)):
        for p in marc.get(cor, []):
            novos.append({'mesh': len(j['meshes']) - 2 + mi, 'translation': p[:3],
                          'name': f'MARCA_{cor}'})
    j['nodes'] += novos
    j['scenes'][j.get('scene', 0)]['nodes'] += list(
        range(len(j['nodes']) - len(novos), len(j['nodes'])))
    j['buffers'][0]['byteLength'] = len(b) + len(bin_extra)
    return bytes(bin_extra)


def pose_baked_glb(src, dst, anim_nome, fase, marc=None):
    j, b = ler(src)
    anims = j.get('animations', [])
    idle = next((a for a in anims if a['name'] == 'idle'), None)
    anim = next((a for a in anims if a['name'] == anim_nome), idle)
    t = clip_dur(anim, j, b) * fase if anim else 0.0
    ov = {}
    if idle is not None:
        di = clip_dur(idle, j, b)
        for k, v in amostra(idle, j, b, t % max(di, 1e-6)).items():
            ov[k] = dict(v)
    if anim is not None:
        ov.update(amostra(anim, j, b, t))
    for ni, paths in ov.items():
        n = j['nodes'][ni]
        for p in ('translation', 'rotation', 'scale'):
            if p in paths:
                n[p] = paths[p].tolist()
        n.pop('matrix', None)
    j['animations'] = []
    bin_extra = acrescentar_marcadores(j, b, marc) if marc else b''
    b = bytes(b) + bin_extra
    jb = json.dumps(j, separators=(',', ':')).encode()
    while len(jb) % 4:
        jb += b' '
    total = 12 + 8 + len(jb) + 8 + len(b)
    with open(dst, 'wb') as fh:
        fh.write(b'glTF\x02\x00\x00\x00')
        fh.write(struct.pack('<I', total))
        fh.write(struct.pack('<I', len(jb)))
        fh.write(b'JSON')
        fh.write(jb)
        fh.write(struct.pack('<I', len(b)))
        fh.write(b'BIN\x00')
        fh.write(bytes(b))
    return t


def frame_de(familia):
    import re
    src = (RAIZ / 'public/js/authoredvm.js').read_text()
    ini = src.index('const FAMILY_FRAME')
    fim = src.index('});', ini)
    bloco = src[ini:fim]
    m = re.search(rf'\n  {familia}:\s*\{{([^}}]+)\}}', bloco)
    b_ = m.group(1)
    vals = dict(re.findall(r'(\w+):\s*([^,\]]+)', b_))
    xyz = [float(x) for x in re.findall(r'-?[\d.]+', vals['x'] + ' ' + vals['y'] + ' ' + vals['z'])]
    rot = [float(x) for x in re.findall(r'-?[\d.]+', re.search(r'rotDeg:\s*\[([^\]]+)\]', b_).group(1))]
    return xyz, rot, float(vals['fov'])


def vfov_aspect(fov_deg, aspecto, ref=16 / 9):
    v0 = math.radians(fov_deg)
    halfH = math.tan(v0 / 2) * ref
    return 2 * math.atan(halfH / aspecto)


def main():
    A_out = F / 'evidence'
    A_out.mkdir(parents=True, exist_ok=True)
    tmp = F / '_pose-baked.glb'
    CLIPOS = {
        'mosin': [('idle', 0.0), ('idle', 0.5), ('shoot', 0.12), ('shoot', 0.35),
                  ('reload_start', 0.5), ('reload_loop', 0.35), ('reload_end', 0.4),
                  ('reload_empty', 0.62), ('equip_rifle', 0.3), ('inspect', 0.32)],
        'svd': [('idle', 0.0), ('idle', 0.5), ('shoot', 0.1), ('reload_tactical', 0.35),
                ('reload_tactical', 0.62), ('reload_empty', 0.4), ('reload_empty', 0.8),
                ('equip_rifle', 0.3), ('inspect', 0.32)],
        'sks': [('idle', 0.0), ('idle', 0.5), ('shoot', 0.1), ('reload_start', 0.5),
                ('reload_loop', 0.35), ('reload_empty', 0.62), ('reload_end', 0.4),
                ('equip_rifle', 0.3), ('inspect', 0.32)],
    }
    MARCA = '--marca' in sys.argv
    for arma, familia in FAMILIA.items():
        xyz, rot, fov = frame_de(familia)
        if MARCA:
            f_dump = F / f'c-ofensores-{arma}.json'
            if not f_dump.exists():
                continue
            items = [(e['clipe'], e['fase'], {'vermelho': e['vermelho'],
                                              'amarelo': e['amarelo']})
                     for e in json.loads(f_dump.read_text())]
            print(f'marca {arma}: {len(items)} quadros')
        else:
            items = [(clip, fase, None) for clip, fase in CLIPOS[arma]]
        for clip, fase, marc in items:
            pose_baked_glb(F / f'{arma}-baked-runtime.glb', tmp, clip, fase, marc)
            for aspecto, tag in ((3 / 2, '3x2'), (16 / 9, '16x9')):
                if clip == 'idle' and fase == 0.0 and tag == '16x9':
                    continue
                if clip != 'idle' and tag == '16x9':
                    continue
                if MARCA and tag != '3x2':
                    continue
                bpy.ops.wm.read_factory_settings(use_empty=True)
                bpy.ops.import_scene.gltf(filepath=str(tmp))
                objs = list(bpy.context.scene.objects)
                # câmera importada (VIEWMODEL_CAMERA) → usa a inversa no pai
                cam_obj = next((o for o in objs if o.type == 'CAMERA'), None)
                cam_inv = np.linalg.inv(np.array(cam_obj.matrix_world))
                for o in objs:
                    o.parent = None
                # mount
                rx, ry, rz = (math.radians(a) for a in rot)
                Rx = np.array([[1, 0, 0], [0, math.cos(rx), -math.sin(rx)], [0, math.sin(rx), math.cos(rx)]])
                Ry = np.array([[math.cos(ry), 0, math.sin(ry)], [0, 1, 0], [-math.sin(ry), 0, math.cos(ry)]])
                Rz = np.array([[math.cos(rz), -math.sin(rz), 0], [math.sin(rz), math.cos(rz), 0], [0, 0, 1]])
                M = np.eye(4)
                M[:3, :3] = Rz @ Ry @ Rx
                M[:3, 3] = xyz
                full = M @ cam_inv
                for o in objs:
                    if o.type == 'CAMERA':
                        continue
                    mw = np.array(o.matrix_world)
                    o.matrix_world = full @ mw
                    o.parent = None
                if cam_obj:
                    bpy.data.objects.remove(cam_obj, do_unlink=True)
                # câmera de render: origem, -Z, vfov do runtime
                cd = bpy.data.cameras.new('render_cam')
                cd.angle = vfov_aspect(fov, aspecto)
                cd.lens_unit = 'FOV'
                cd.clip_start = 0.01
                cd.clip_end = 50
                cam = bpy.data.objects.new('render_cam', cd)
                cam.rotation_euler = (0, 0, 0)
                bpy.context.collection.objects.link(cam)
                bpy.context.scene.camera = cam
                sc = bpy.context.scene
                sc.render.engine = 'BLENDER_WORKBENCH'
                sc.display.shading.light = 'STUDIO'
                sc.display.shading.show_object_outline = True
                sc.render.resolution_x = 1440
                sc.render.resolution_y = round(1440 / aspecto)
                out = A_out / arma
                out.mkdir(parents=True, exist_ok=True)
                prefix = 'MARCA_' if MARCA else ''
                sc.render.filepath = str(out / f'{prefix}{clip}_{fase:.2f}_{tag}.png')
                bpy.ops.render.render(write_still=True)
        print('evidence', arma, 'ok')
    tmp.unlink(missing_ok=True)


main()
