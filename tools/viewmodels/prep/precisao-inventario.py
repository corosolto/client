#!/usr/bin/env python3
"""Inventário somente leitura; saídas confinadas à frente de precisão."""
import hashlib
import json
from pathlib import Path
import struct
import subprocess

RAIZ = Path(__file__).resolve().parents[3]
FONTE = RAIZ.parent / 'vm-astra-pistol'
SAIDA = RAIZ / 'artifacts/viewmodels/prep/precisao'
ARMAS = {'mosin': ('bolt', 'Kar98K'), 'svd': ('svd', 'SVD'), 'sks': ('marksman', 'Mk14EBR')}

def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()

def metadados(p):
    d = {'path': str(p), 'realpath': str(p.resolve()), 'exists': p.is_file()}
    if p.is_file():
        d.update(bytes=p.stat().st_size, sha256=sha(p))
    return d

def glb(p):
    d = metadados(p)
    if not d['exists']:
        return d
    b = p.read_bytes()
    assert b[:4] == b'glTF'
    n = struct.unpack_from('<I', b, 12)[0]
    j = json.loads(b[20:20+n])
    d.update(asset=j.get('asset'), extensions=j.get('extensionsUsed', []), cameras=j.get('cameras', []))
    nodes = j.get('nodes', [])
    d['nodes'] = [{k: v for k, v in x.items() if k != 'extras'} for x in nodes]
    d['skins'] = [{'name': x.get('name'), 'joints': [nodes[i].get('name') for i in x['joints']]} for x in j.get('skins', [])]
    d['materials'] = [m.get('name') for m in j.get('materials', [])]
    d['meshes'] = []
    for m in j.get('meshes', []):
        prims = []
        for pr in m['primitives']:
            attrs = {k: {a: j['accessors'][v].get(a) for a in ('count', 'type', 'min', 'max')} for k, v in pr['attributes'].items()}
            uv = pr['attributes'].get('TEXCOORD_0')
            uv_sha = None
            if uv is not None:
                acc = j['accessors'][uv]
                view = j['bufferViews'][acc['bufferView']]
                binary_start = 20 + n + 8
                start = binary_start + view.get('byteOffset', 0)
                uv_sha = hashlib.sha256(b[start:start+view['byteLength']]).hexdigest()
            prims.append({'attributes': attrs, 'material': pr.get('material'), 'uv_buffer_view_sha256': uv_sha})
        d['meshes'].append({'name': m.get('name'), 'primitives': prims})
    d['animations'] = []
    for a in j.get('animations', []):
        samplers = a['samplers']
        duration = max(j['accessors'][s['input']].get('max', [0])[0] for s in samplers)
        targets = sorted({nodes[c['target']['node']].get('name', '') for c in a['channels']})
        d['animations'].append({'name': a.get('name'), 'duration': duration, 'channels': len(a['channels']), 'targets': targets})
    return d

def main():
    assert RAIZ.name == 'vm-prep-precisao'
    assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=RAIZ, text=True).strip() == 'codex/vm-prep-precisao'
    assert SAIDA.resolve().is_relative_to(RAIZ)
    SAIDA.mkdir(parents=True, exist_ok=True)
    inventario = {'base': subprocess.check_output(['git', 'rev-parse', '961c70d2'], cwd=RAIZ, text=True).strip(), 'weapons': {}}
    for w, (f, pacote) in ARMAS.items():
        raiz_privada = FONTE / 'public/private-assets/viewmodels'
        paths = {'own': RAIZ / f'public/models/weapons/{w}.glb', 'base': raiz_privada / f'{f}/{f}.glb', 'native': raiz_privada / f'{f}/{f}-runtime.glb', 'baked': raiz_privada / f'{f}/{w}-baked-runtime.glb', 'goldsrc': raiz_privada / f'goldsrc-vm/{w}-runtime.glb', 'retarget': raiz_privada / f'retarget-vm/{w}-runtime.glb'}
        fonte_fbx = Path('/Users/ruben/csbrasil-private-assets/generated/extracted/Assets/KINEMATION/FPSAnimationPack/Animations') / pacote
        inventario['weapons'][w] = {'family': f, 'assets': {k: glb(p) for k, p in paths.items()}, 'blend': metadados(raiz_privada / f'{f}/{f}.blend'), 'fbx': [metadados(p) for p in sorted(fonte_fbx.rglob('*')) if p.suffix.lower() == '.fbx']}
    inventario['source_package'] = metadados(Path('/Users/ruben/csbrasil-private-assets/sources/fpsanimationpack_ultimate.unitypackage'))
    inventario['controls'] = [metadados(FONTE / p) for p in ('public/models/viewmodels/coro/ak-hires.glb', 'public/private-assets/viewmodels/pistol/pistol-runtime.glb')]
    inventario['pistol_uv_reference'] = glb(FONTE / 'public/private-assets/viewmodels/pistol/pistol-runtime.glb')
    inventario['inputs'] = [metadados(RAIZ / p) for p in ('public/js/authoredvm.js', 'public/js/data/vmconfig.js', 'public/js/data/weapons.js', 'public/js/weapons.js', 'public/js/game.js', 'public/js/vmhands.js', 'tools/viewmodels/paid-pack-manifest.json')]
    inventario['live_ledgers'] = [metadados(FONTE / 'docs/reports' / p) for p in ('PROMPTS-PARALELOS-VIEWMODELS.md', 'VIEWMODEL-SERIES-HANDOFF.md', 'VIEWMODEL-INVENTARIO.md')]
    (SAIDA / 'inventario.json').write_text(json.dumps(inventario, indent=2) + '\n')
    print(json.dumps({w: {k: {'exists': a['exists'], 'bytes': a.get('bytes'), 'clips': [c['name'] for c in a.get('animations', [])]} for k, a in v['assets'].items()} for w, v in inventario['weapons'].items()}, indent=2))

if __name__ == '__main__':
    main()
