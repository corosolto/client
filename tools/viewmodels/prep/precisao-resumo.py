"""Resume evidências sem converter distância geométrica em aprovação visual."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import numpy as np

sys.dont_write_bytecode = True
RAIZ=Path(__file__).resolve().parents[3]
OUT=RAIZ/'artifacts/viewmodels/prep/precisao'
assert RAIZ.name=='vm-prep-precisao' and OUT.resolve().is_relative_to(RAIZ)
assert subprocess.check_output(['git','branch','--show-current'],cwd=RAIZ,text=True).strip()=='codex/vm-prep-precisao'
spec=importlib.util.spec_from_file_location('gltf',Path(__file__).with_name('precisao-gltf.py'))
gltf=importlib.util.module_from_spec(spec);spec.loader.exec_module(gltf)
inv=json.loads((OUT/'inventario.json').read_text())
pj,pb=gltf.ler(inv['pistol_uv_reference']['path'])
roles=('Plane.004','Plane.005','Hand-Tool1.008')
report={'weapons':{},'uv':{}}
for w in ('mosin','svd','sks'):
    d=inv['weapons'][w]
    own=json.loads((OUT/f'{w}-own-blender.json').read_text())['objects'][0]
    row={'own_bounds':own['bounds'],'own_extent':[own['bounds']['max'][i]-own['bounds']['min'][i] for i in range(3)],'vertices':own['vertices'],'components_not_parts':len(own['connected_components'])}
    path=OUT/f'{w}-native-blender.json'
    assert path.is_file(), f'Evidência nativa ausente: {path}'
    if path.exists():
        b=json.loads(path.read_text());samples=b['samples'];idle=samples[0]
        row['max_import_joint_position_error']=max(e for s in samples for e in s['gltf_joint_position_errors'].values())
        row['native_idle_hand_distance']=idle['hand_surface_distance']
        row['native_idle_projection']=idle['projection_native']
        row['sample_count']=len(samples)
        row['mechanisms']={}
        for name in sorted({s['clip'] for s in samples}):
            poses=[s for s in samples if s['clip']==name];pieces={}
            for bone in poses[0]['mechanism_world']:
                def local(s):
                    neutral=np.array(s['mechanism_world']['neutral_bone']['matrix'])
                    neutral[:3,:3] /= np.linalg.norm(neutral[:3,:3],axis=0)
                    return np.linalg.inv(neutral) @ np.array(s['mechanism_world'][bone]['matrix'])
                ref=local(poses[0]);delta=[np.linalg.norm(local(s)[:3,3]-ref[:3,3]) for s in poses]
                pieces[bone]={'max_local_displacement':max(delta),'sample_at_max_s':poses[int(np.argmax(delta))]['time_s']}
            row['mechanisms'][name]=pieces
    report['weapons'][w]=row
    j,b=gltf.ler(d['assets']['native']['path']);report['uv'][w]={}
    weapon_bones=set(d['assets']['native']['skins'][0]['joints'])
    row['channel_timing']={}
    for anim in j['animations']:
        ends={'arms':[],'weapon':[]};extrema=[]
        for c in anim['channels']:
            name=j['nodes'][c['target']['node']]['name'];q=anim['samplers'][c['sampler']]
            assert q.get('interpolation','LINEAR') in ('LINEAR','STEP')
            times=gltf.accessor(j,b,q['input']).ravel();values=gltf.accessor(j,b,q['output'])
            ends['weapon' if name in weapon_bones else 'arms'].append(float(times[-1]))
            typ=c['target']['path']
            if name not in weapon_bones or typ not in ('translation','rotation'):continue
            if typ=='translation':delta=np.linalg.norm(values-values[0],axis=1)
            else:
                normalized=values/np.linalg.norm(values,axis=1)[:,None]
                delta=np.degrees(2*np.arccos(np.clip(np.abs(normalized @ normalized[0]),0,1)))
            idx=int(np.argmax(delta))
            if delta[idx]>.01:
                extrema.append({'bone':name,'path':typ,'max_delta_from_first':float(delta[idx]),'source_time':float(times[idx]),'frame_60':float(times[idx])*60})
        row['channel_timing'][anim['name']]={'arms_end':max(ends['arms'],default=None),'weapon_end':max(ends['weapon'],default=None),'extrema':extrema}

    for name in roles:
        m=next(m for m in j['meshes'] if m['name']==name)['primitives'][0]
        pm=next(m for m in pj['meshes'] if m['name']==name)['primitives'][0]
        attrs={}
        for attr in ('TEXCOORD_0','JOINTS_0','WEIGHTS_0'):
            aa=gltf.accessor(j,b,m['attributes'][attr]);ab=gltf.accessor(pj,pb,pm['attributes'][attr]);attrs[attr]=bool(np.array_equal(aa,ab))
        attrs['indices']=bool(np.array_equal(gltf.accessor(j,b,m['indices']),gltf.accessor(pj,pb,pm['indices'])))
        attrs['material']=j['materials'][m['material']]['name']
        report['uv'][w][name]=attrs
(OUT/'resumo.json').write_text(json.dumps(report,indent=2)+'\n')
if '--relatorio' in sys.argv:
    arquivo=RAIZ/'docs/reports/VM-PREP-PRECISAO.md'
    assert arquivo.resolve().is_relative_to(RAIZ)
    texto=arquivo.read_text()
    def inserir(nome, linhas):
        global texto
        inicio=f'<!-- BEGIN:PRECISAO:{nome} -->'
        fim=f'<!-- END:PRECISAO:{nome} -->'
        assert texto.count(inicio)==1 and texto.count(fim)==1
        antes, resto=texto.split(inicio); _, depois=resto.split(fim)
        texto=antes+inicio+'\n\n'+'\n'.join(linhas)+'\n\n'+fim+depois
    linhas=['| Arma / insumo | Caminho relativo | Bytes | SHA-256 |','|---|---|---:|---|']
    for w,d in inv['weapons'].items():
        for tipo in ('own','native'):
            a=d['assets'][tipo]
            caminho=f'public/models/weapons/{w}.glb' if tipo=='own' else f"P/{d['family']}/{d['family']}-runtime.glb"
            linhas.append(f"| {w} / {tipo} | `{caminho}` | {a['bytes']} | `{a['sha256']}` |")
    inserir('insumos',linhas)
    linhas=['| Arma própria | Extensão X / Y / Z | Vértices | Ilhas por índice | Poses nativas | Erro máximo joint glTF ↔ Blender |','|---|---|---:|---:|---:|---:|']
    for w,d in report['weapons'].items():
        extent=' / '.join(f'{x:.6f}' for x in d['own_extent'])
        linhas.append(f"| {w} | {extent} | {d['vertices']} | {d['components_not_parts']} | {d['sample_count']} | {d['max_import_joint_position_error']:.8g} |")
    linhas += ['', '| Doador em idle / luva inteira | Mediana esquerda / direita | P95 esquerda / direita |', '|---|---|---|']
    for w,d in report['weapons'].items():
        dist=d['native_idle_hand_distance']
        esq=dist['GEO_FP_SK_Glove_01_l'];direita=dist['GEO_FP_SK_Glove_01_r']
        linhas.append(f"| {w} | {esq['median']:.6f} / {direita['median']:.6f} | {esq['p95']:.6f} / {direita['p95']:.6f} |")
    inserir('medidas',linhas)
    linhas=['| Arma / ação nativa | Última key dos braços (s) | Última key da arma (s) |','|---|---:|---:|']
    for w,d in report['weapons'].items():
        for nome,tempos in d['channel_timing'].items():
            if nome=='idle':continue
            linhas.append(f"| {w} / `{nome}` | {tempos['arms_end']:.6f} | {tempos['weapon_end']:.6f} |")
    inserir('tempos',linhas)
    arquivo.write_text(texto)
print(json.dumps(report,indent=2))
