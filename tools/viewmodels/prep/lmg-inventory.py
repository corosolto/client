"""Inventário somente leitura dos insumos da frente LMG.

Fontes: Mint própria (public/models/weapons/lmg.glb), doador privado MGX5
(integradora, somente leitura), molde GoldSrc M249 e clipes compartilhados.
Saídas ficam em artifacts/viewmodels/prep/lmg/ desta worktree.
"""
import hashlib
import json
import struct
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT.parent / 'vm-astra-pistol'
OUT = ROOT / 'artifacts/viewmodels/prep/lmg'


def guard():
    assert ROOT.name == 'vm-lmg-final'
    branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    assert branch == 'glm/vm-lmg-final', branch
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


def animations(doc):
    out = []
    for anim in doc.get('animations', []):
        channels = {}
        for ch in anim.get('channels', []):
            target = ch.get('target', {})
            node = target.get('node')
            path = target.get('path')
            name = doc.get('nodes', [{}])[node].get('name', str(node)) if node is not None else '?'
            channels[f'{name}.{path}'] = ch.get('sampler')
        out.append({'name': anim.get('name'), 'channels': len(anim.get('channels', [])),
                    'tracks': sorted(channels)})
    return out


def inventory(path):
    result = {'path': str(path), 'realpath': str(path.resolve()), 'exists': path.is_file()}
    if not result['exists']:
        return result
    result.update(bytes=path.stat().st_size, sha256=digest(path))
    if path.suffix != '.glb':
        return result
    doc, blob = read_glb(path)
    nodes = doc.get('nodes', [])
    result.update(asset=doc['asset'],
                  cameras=doc.get('cameras', []),
                  skins=[{'name': s.get('name'), 'joints': [nodes[n].get('name', str(n)) for n in s['joints']]}
                         for s in doc.get('skins', [])],
                  materials=[m.get('name') for m in doc.get('materials', [])],
                  animations=animations(doc))
    result['meshes'] = []
    for mesh in doc.get('meshes', []):
        primitives = []
        for p in mesh['primitives']:
            attrs = p['attributes']
            primitives.append({'vertices': doc['accessors'][attrs['POSITION']]['count'],
                               'bounds': {k: doc['accessors'][attrs['POSITION']].get(k) for k in ['min', 'max']},
                               'attributes': list(attrs), 'material': p.get('material')})
        result['meshes'].append({'name': mesh.get('name'), 'primitives': primitives})
    return result


def main():
    guard()
    inputs = {
        'mint_lmg': ROOT / 'public/models/weapons/lmg.glb',
        'doador_lmg_runtime': SOURCE / 'public/private-assets/viewmodels/lmg/lmg-runtime.glb',
        'doador_lmg_glb': SOURCE / 'public/private-assets/viewmodels/lmg/lmg.glb',
        'doador_lmg_blend': SOURCE / 'public/private-assets/viewmodels/lmg/lmg.blend',
        'raw_reload_tactical_arms': SOURCE / 'public/private-assets/viewmodels/lmg/raw-clips/reload_tactical-arms.glb',
        'raw_reload_tactical_weapon': SOURCE / 'public/private-assets/viewmodels/lmg/raw-clips/reload_tactical-weapon.glb',
        'raw_reload_empty_arms': SOURCE / 'public/private-assets/viewmodels/lmg/raw-clips/reload_empty-arms.glb',
        'raw_reload_empty_weapon': SOURCE / 'public/private-assets/viewmodels/lmg/raw-clips/reload_empty-weapon.glb',
        'shared_general_runtime': SOURCE / 'public/private-assets/viewmodels/shared/general-runtime.glb',
        'goldsrc_m249': ROOT / 'public/models/viewmodels/goldsrc/m249.glb',
        'goldsrc_vm_lmg_runtime': SOURCE / 'public/private-assets/viewmodels/goldsrc-vm/lmg-runtime.glb',
        'golden_ak_controle': ROOT / 'public/models/viewmodels/coro/ak-hires.glb',
    }
    data = {key: inventory(path) for key, path in inputs.items()}
    (OUT / 'inventory.json').write_text(json.dumps(data, indent=1, ensure_ascii=False))
    for key, item in data.items():
        if not item['exists']:
            print(f'{key}: AUSENTE {item["path"]}')
            continue
        clips = [f"{a['name']}({a['channels']}ch)" for a in item.get('animations', [])]
        skins = [f"{s['name'] or "skin"}:{len(s['joints'])}j" for s in item.get('skins', [])]
        cams = [c.get('type') for c in item.get('cameras', [])]
        print(f'{key}: {item["bytes"]}B skins={skins} cams={cams} clips={clips}')


if __name__ == '__main__':
    main()
