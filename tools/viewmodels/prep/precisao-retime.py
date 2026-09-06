"""Reproduce mergeSamples time normalization on private donor copies only."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/viewmodels/prep/precisao/timing-c1'
assert ROOT.name == 'vm-prep-precisao' and OUT.resolve().is_relative_to(ROOT.resolve())
assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'codex/vm-prep-precisao'
OUT.mkdir(parents=True, exist_ok=True)
inventory = json.loads((OUT.parent / 'inventario.json').read_text())


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
    assert not result['arms'] & result['weapon']
    return result


def ends(doc, blob, animation):
    return {name: max(times(doc, blob, animation['samplers'][c['sampler']]['input'])[-1]
                      for c in animation['channels'] if c['target']['node'] in nodes)
            for name, nodes in groups(doc).items()}


report = {'method': 'Same duration/sample.duration normalization as assemble_paid_family.mjs::mergeSamples. '
                    'Private donor timing experiment; does not certify authored contacts or original FBX frame correspondence.',
          'weapons': {}}
for weapon in ('mosin', 'svd', 'sks'):
    entry = inventory['weapons'][weapon]['assets']['native']
    source = Path(entry['path'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['sha256']
    original, binary = read(source)
    doc, blob = copy.deepcopy(original), bytearray(binary)
    record = {'source': str(source), 'source_sha256': entry['sha256'], 'clips': []}
    owners = groups(doc)
    for ai, animation in enumerate(doc['animations']):
        if animation['name'] == 'idle':
            continue
        before = ends(original, binary, original['animations'][ai])
        duration = max(before.values())
        assert min(before.values()) > 0
        changed = {}
        for channel in animation['channels']:
            owner = next((name for name, nodes in owners.items() if channel['target']['node'] in nodes), None)
            assert owner, channel['target']
            si = channel['sampler']
            if si in changed:
                assert changed[si] == owner, 'sampler shared across independently timed rigs'
                continue
            changed[si] = owner
            sampler = animation['samplers'][si]
            old = times(doc, blob, sampler['input'])
            assert old[0] == 0 and all(a < b for a, b in zip(old, old[1:]))
            normalized = [t * duration / before[owner] for t in old]
            blob.extend(b'\0' * (-len(blob) % 4))
            view = len(doc['bufferViews'])
            doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(normalized) * 4})
            blob.extend(struct.pack('<' + 'f' * len(normalized), *normalized))
            sampler['input'] = len(doc['accessors'])
            doc['accessors'].append({'bufferView': view, 'componentType': 5126, 'type': 'SCALAR',
                                     'count': len(normalized), 'min': [0.], 'max': [normalized[-1]]})
        after = ends(doc, blob, animation)
        assert max(after.values()) - min(after.values()) < 1e-6
        assert max(before.values()) - min(before.values()) > 1e-4, 'baseline does not expose the expected mismatch'
        record['clips'].append({'name': animation['name'], 'before': before, 'after': after,
                                'time_scale': {k: duration / v for k, v in before.items()},
                                'baseline_mutation_rejected': True})
    doc['buffers'][0]['byteLength'] = len(blob)
    header = json.dumps(doc, separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    blob.extend(b'\0' * (-len(blob) % 4))
    output = OUT / f'{weapon}-timing.glb'
    output.write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(header) + len(blob))
                       + struct.pack('<II', len(header), 0x4E4F534A) + header
                       + struct.pack('<II', len(blob), 0x004E4942) + blob)
    check, cb = read(output)
    assert cb[:len(binary)] == binary
    for key in ('nodes', 'meshes', 'skins', 'materials', 'textures', 'images', 'cameras'):
        assert check.get(key) == original.get(key), key
    for ai, animation in enumerate(check['animations']):
        prior = original['animations'][ai]
        assert animation['channels'] == prior['channels']
        for sampler, old_sampler in zip(animation['samplers'], prior['samplers']):
            assert {k: v for k, v in sampler.items() if k != 'input'} == {k: v for k, v in old_sampler.items() if k != 'input'}
        if animation['name'] == 'idle':
            assert animation == prior
        else:
            end = ends(check, cb, animation)
            assert max(end.values()) - min(end.values()) < 1e-6
    record.update(output=str(output), output_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                  original_binary_preserved=True, geometry_materials_skeleton_camera_preserved=True,
                  animation_outputs_preserved=True, idle_preserved=True)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['sha256']
    report['weapons'][weapon] = record
(OUT / 'timing-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: {'clips': len(v['clips']), 'hash': v['output_sha256']} for k, v in report['weapons'].items()}))
