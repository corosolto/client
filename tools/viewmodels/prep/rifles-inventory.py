"""Inventário somente leitura; saídas limitadas à frente Rifles."""
import hashlib
import json
import struct
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT.parent / 'vm-astra-pistol'
OUT = ROOT / 'artifacts/viewmodels/prep/rifles'
WEAPONS = ['m4', 'md97', 'carbine', 'scar', 'famas', 'm92']


def guard():
    assert ROOT.name == 'vm-prep-rifles'
    branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    assert branch == 'codex/vm-prep-rifles', branch
    assert OUT.resolve().is_relative_to(ROOT)
    OUT.mkdir(parents=True, exist_ok=True)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read_glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', data)
    assert magic == 0x46546C67 and version == 2 and length == len(data)
    size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + size])
    offset = 20 + size
    blob = b''
    if offset < len(data):
        size, kind = struct.unpack_from('<II', data, offset)
        assert kind == 0x004E4942
        blob = data[offset + 8:offset + 8 + size]
    return doc, blob


def values(doc, blob, index):
    a = doc['accessors'][index]
    assert 'sparse' not in a
    view = doc['bufferViews'][a['bufferView']]
    assert view['buffer'] == 0
    fmt = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    stride = view.get('byteStride', struct.calcsize(fmt) * width)
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * width, blob, offset + n * stride) for n in range(a['count'])]


def inventory(path):
    result = {'path': str(path), 'realpath': str(path.resolve()), 'exists': path.is_file()}
    if not result['exists']:
        return result
    result.update(bytes=path.stat().st_size, sha256=digest(path))
    if path.suffix != '.glb':
        return result
    doc, blob = read_glb(path)
    nodes = doc.get('nodes', [])
    result.update(asset=doc['asset'], nodes=nodes, cameras=doc.get('cameras', []),
                  skins=[{'name': s.get('name'), 'joints': [nodes[n].get('name', str(n)) for n in s['joints']]} for s in doc.get('skins', [])],
                  materials=[m.get('name') for m in doc.get('materials', [])])
    result['meshes'] = []
    for mesh in doc.get('meshes', []):
        primitives = []
        for p in mesh['primitives']:
            attrs = p['attributes']
            uv = values(doc, blob, attrs['TEXCOORD_0']) if 'TEXCOORD_0' in attrs else []
            primitives.append({'vertices': doc['accessors'][attrs['POSITION']]['count'],
                               'bounds': {k: doc['accessors'][attrs['POSITION']].get(k) for k in ['min', 'max']},
                               'attributes': list(attrs), 'material': p.get('material'),
                               'uv_sha256': hashlib.sha256(json.dumps(uv).encode()).hexdigest() if uv else None,
                               'uv_bounds': [[min(v[i] for v in uv), max(v[i] for v in uv)] for i in range(2)] if uv else None})
        result['meshes'].append({'name': mesh.get('name'), 'primitives': primitives})
    result['clips'] = []
    for anim in doc.get('animations', []):
        times = [t[0] for s in anim['samplers'] for t in values(doc, blob, s['input'])]
        targets = sorted({nodes[c['target']['node']].get('name', str(c['target']['node'])) for c in anim['channels']})
        result['clips'].append({'name': anim.get('name'), 'start': min(times), 'end': max(times),
                                'duration': max(times) - min(times), 'channels': len(anim['channels']), 'targets': targets,
                                'extras': anim.get('extras')})
    return result


def main():
    guard()
    entries = {}
    for w in WEAPONS:
        entries[f'mint/{w}'] = ROOT / f'public/models/weapons/{w}.glb'
    private = SOURCE / 'public/private-assets/viewmodels'
    for family in ['ar', 'ak', 'pistol']:
        entries[f'native/{family}'] = private / family / f'{family}-runtime.glb'
    for family in ['ar', 'ak']:
        for name in [f'{family}.blend', f'{family}.glb', 'build-report.json', 'assembly-report.json']:
            entries[f'family-source/{family}/{name}'] = private / family / name
    for route in ['goldsrc-vm', 'retarget-vm']:
        for w in WEAPONS:
            entries[f'{route}/{w}'] = private / route / f'{w}-runtime.glb'
    entries['general'] = private / 'shared/general-runtime.glb'
    for f in ['docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md', 'docs/reports/VIEWMODEL-SERIES-HANDOFF.md',
              'docs/reports/VIEWMODEL-INVENTARIO.md', 'public/models/viewmodels/coro/ak-hires.glb']:
        entries[f'control/{Path(f).name}'] = SOURCE / f
    for f in ['public/js/game.js', 'public/js/weapons.js', 'public/js/data/weapons.js', 'public/js/data/vmconfig.js',
              'public/js/authoredvm.js', 'public/js/vmweapon.js', 'public/js/vmhands.js', 'tools/viewmodels/paid-pack-manifest.json',
              'mint-assets.json', 'public/models/viewmodels/FONTE.md', 'docs/LICENCA.md']:
        entries[f'code/{Path(f).name}'] = ROOT / f
    extracted = Path('/Users/ruben/csbrasil-private-assets/generated/extracted/Assets/KINEMATION/FPSAnimationPack/Animations')
    for family in ['MX16A4', 'AK']:
        for p in sorted((extracted / family).rglob('*')):
            if p.suffix.lower() in ['.fbx', '.anim']:
                entries[f'source/{p.relative_to(extracted)}'] = p
    result = {name: inventory(path) for name, path in entries.items()}
    (OUT / 'inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    for name, d in result.items():
        if 'clips' in d:
            print(name, d['bytes'], 'meshes', len(d['meshes']), 'joints', [len(s['joints']) for s in d['skins']],
                  'clips', [(c['name'], round(c['duration'], 4)) for c in d['clips']])


if __name__ == '__main__':
    main()
