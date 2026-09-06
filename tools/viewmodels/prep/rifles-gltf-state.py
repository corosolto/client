"""Avaliação numérica do glTF original, sem conversão de bones do Blender."""
import importlib.util
import json
import sys
import math
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()


def matrix(t, q, s):
    x, y, z, w = q / np.linalg.norm(q)
    r = np.array([[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w],
                  [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w],
                  [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y]])
    m = np.eye(4)
    m[:3, :3] = r @ np.diag(s)
    m[:3, 3] = t
    return m


def mix(a, b, f, rotation):
    if not rotation:
        return a * (1-f) + b * f
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    dot = a @ b
    if dot < 0:
        b, dot = -b, -dot
    if dot > .9995:
        q = a * (1-f) + b * f
        return q / np.linalg.norm(q)
    theta = math.acos(np.clip(dot, -1, 1))
    return (math.sin((1-f)*theta)*a + math.sin(f*theta)*b) / math.sin(theta)


def bb(p):
    return {'min': p.min(axis=0).tolist(), 'max': p.max(axis=0).tolist(),
            'size': np.ptp(p, axis=0).tolist(), 'center': ((p.min(axis=0)+p.max(axis=0))/2).tolist()}


def inspect(path):
    doc, blob = inv.read_glb(path)
    nodes = doc['nodes']
    arrays = {}
    def arr(i):
        if i not in arrays:
            arrays[i] = np.array(inv.values(doc, blob, i))
        return arrays[i]
    parents = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    def evaluate(anim, seconds):
        trs = {i: {k: np.array(n.get(k, default), dtype=float) for k, default in
                   [('translation', [0,0,0]), ('rotation', [0,0,0,1]), ('scale', [1,1,1])]} for i, n in enumerate(nodes)}
        for c in anim.get('channels', []):
            s = anim['samplers'][c['sampler']]
            mode = s.get('interpolation', 'LINEAR')
            assert mode in ['LINEAR', 'STEP'], mode
            times, vals = arr(s['input'])[:,0], arr(s['output'])
            index = max(0, min(len(times)-1, int(np.searchsorted(times, seconds, side='right')-1)))
            following = min(index+1, len(times)-1)
            frac = (seconds-times[index])/(times[following]-times[index]) if following != index else 0
            frac = np.clip(frac, 0, 1) if mode != 'STEP' else 0
            target = c['target']
            assert target['path'] != 'weights'
            trs[target['node']][target['path']] = mix(vals[index], vals[following], frac, target['path']=='rotation')
        worlds = {}
        def world(i):
            if i not in worlds:
                n = nodes[i]
                v = trs[i]
                m = np.array(n['matrix']).reshape(4,4).T if 'matrix' in n else matrix(v['translation'], v['rotation'], v['scale'])
                worlds[i] = world(parents[i]) @ m if i in parents else m
            return worlds[i]
        meshes = {}
        for i, n in enumerate(nodes):
            if 'mesh' not in n:
                continue
            points = []
            for p in doc['meshes'][n['mesh']]['primitives']:
                a = p['attributes']
                pos = arr(a['POSITION'])
                p4 = np.column_stack([pos, np.ones(len(pos))])
                if 'skin' in n:
                    skin = doc['skins'][n['skin']]
                    ibm = arr(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
                    transforms = np.array([world(j) @ ibm[k] for k,j in enumerate(skin['joints'])])
                    joints, weights = arr(a['JOINTS_0']).astype(int), arr(a['WEIGHTS_0']).astype(float)
                    comp = doc['accessors'][a['WEIGHTS_0']]['componentType']
                    if comp in [5121, 5123]:
                        weights /= 255 if comp == 5121 else 65535
                    out = np.zeros_like(p4)
                    for lane in range(4):
                        out += np.einsum('nij,nj->ni', transforms[joints[:,lane]], p4)*weights[:,lane,None]
                else:
                    out = p4 @ world(i).T
                points.append(out[:,:3])
            meshes[n.get('name',str(i))] = np.concatenate(points)
        bones = {n['name']: world(i)[:3,3] for i,n in enumerate(nodes)
                 if n.get('name') in ['hand_l','hand_r','Mag','Charge','Bolt','ChargingHandle','BoltRelease']}
        return meshes, bones, worlds
    result = {}
    for anim in doc.get('animations', []):
        name = anim.get('name')
        if name not in ['idle', 'reload_tactical', 'reload_empty']:
            continue
        times = np.concatenate([arr(s['input'])[:,0] for s in anim['samplers']])
        start, end = float(times.min()), float(times.max())
        frames = []
        for f in [0,.18,.35,.5,.62,.75,.86,1]:
            meshes, bones, worlds = evaluate(anim, start+(end-start)*f)
            mags = {k:v for k,v in meshes.items() if 'MINT_WEAPON_MAG_' in k}
            distances = {f'{hand}->{mag}': float(np.linalg.norm(pts-bones[hand],axis=1).min())
                         for hand in ['hand_l','hand_r'] if hand in bones for mag,pts in mags.items()}
            frames.append({'fraction':f,'seconds':start+(end-start)*f,
                           'bounds':{k:bb(v) for k,v in meshes.items()},
                           'bones':{k:v.tolist() for k,v in bones.items()},
                           'bone_origin_to_mag_vertex':distances})
        result[name] = frames
    return result


data = json.loads((inv.OUT/'inventory.json').read_text())
result = {'space':'glTF Y-up world, original node transforms and inverse bind matrices', 'assets':{}}
for key, d in data.items():
    if key.startswith(('native/ar','native/ak','goldsrc-vm/','retarget-vm/')):
        assert inv.digest(Path(d['path'])) == d['sha256']
        result['assets'][key] = inspect(Path(d['path']))
        print('RIFLES_GLTF', key, flush=True)
(inv.OUT/'gltf-state.json').write_text(json.dumps(result,indent=2)+'\n')
