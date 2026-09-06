"""Independent check of the C2 isolated assembly: do the NEW assembler outputs
close the arms/weapon temporal divergence that the observed natives carry?

Reads GLB samplers directly (no trust in assembly-report.json). The mutant is
the observed native itself: it must FAIL the coincident-ends criterion that the
new runtime passes. Inputs are read-only; nothing here writes to shared roots.
"""
import hashlib
import json
from pathlib import Path
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/viewmodels/prep/precisao/assembly-c2'
ISO = Path('/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated')
assert ROOT.name == 'vm-prep-precisao' and OUT.resolve().is_relative_to(ROOT.resolve())
assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'codex/vm-prep-precisao'
OUT.mkdir(parents=True, exist_ok=True)
inventory = json.loads((OUT.parent / 'inventario.json').read_text())
FAMILY = {'mosin': 'bolt', 'svd': 'svd', 'sks': 'marksman'}


def read(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', data)
    assert (magic, version, length) == (0x46546C67, 2, len(data))
    size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + size])
    offset = 20 + size
    size, kind = struct.unpack_from('<II', data, offset)
    assert kind == 0x004E4942
    return doc, data[offset + 8:offset + 8 + size]


def times(doc, blob, index):
    a = doc['accessors'][index]
    v = doc['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126 and a['type'] == 'SCALAR' and 'sparse' not in a
    offset = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<f', blob, offset + i * v.get('byteStride', 4))[0] for i in range(a['count'])]


def groups(doc):
    result = {}
    for skin in doc['skins']:
        if skin['name'] == 'RIG_FP_ARMS':
            result['arms'] = set(skin['joints'])
        elif skin['name'].startswith('RIG_WEAPON_'):
            result['weapon'] = set(skin['joints'])
    assert result.keys() == {'arms', 'weapon'}
    return result


def ends(doc, blob, animation):
    owners = groups(doc)
    return {name: max(times(doc, blob, animation['samplers'][c['sampler']]['input'])[-1]
                      for c in animation['channels'] if c['target']['node'] in nodes)
            for name, nodes in owners.items()}


report = {'method': 'Direct GLB sampler read: last input key of arms-skin channels vs weapon-skin channels. '
                    'Native acts as the mutation: it must fail the coincident-ends criterion the new output passes.',
          'isolated_root': str(ISO), 'weapons': {}}
for weapon, family in FAMILY.items():
    entry = inventory['weapons'][weapon]['assets']['native']
    native_path = Path(entry['path'])
    assert hashlib.sha256(native_path.read_bytes()).hexdigest() == entry['sha256']
    new_path = ISO / f'{family}-runtime.glb'
    record = {'native': str(native_path), 'native_sha256': entry['sha256'],
              'new_runtime': str(new_path), 'new_runtime_sha256': hashlib.sha256(new_path.read_bytes()).hexdigest(),
              'clips': []}
    old_doc, old_blob = read(native_path)
    new_doc, new_blob = read(new_path)
    old_by_name = {a['name']: a for a in old_doc['animations']}
    for animation in new_doc['animations']:
        name = animation['name']
        if name == 'idle' or name not in old_by_name:
            continue
        old_end = ends(old_doc, old_blob, old_by_name[name])
        new_end = ends(new_doc, new_blob, animation)
        old_gap = max(old_end.values()) - min(old_end.values())
        new_gap = max(new_end.values()) - min(new_end.values())
        assert new_gap < 1e-6, f'{weapon}/{name}: new output diverges ({new_gap})'
        assert old_gap > 1e-4, f'{weapon}/{name}: native no longer exposes the mismatch ({old_gap})'
        record['clips'].append({'name': name, 'native_ends': old_end, 'native_gap': old_gap,
                                'new_ends': new_end, 'new_gap': new_gap})
    report['weapons'][weapon] = record
(OUT / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({w: {'clips': len(r['clips']),
                      'max_native_gap': max(c['native_gap'] for c in r['clips']),
                      'max_new_gap': max(c['new_gap'] for c in r['clips'])}
                  for w, r in report['weapons'].items()}))
