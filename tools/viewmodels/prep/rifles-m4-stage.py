"""Mount an opt-in M4 preview on the existing local server, only under artifacts."""
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
stage = inv.OUT / 'local-server-8160'
assert stage.is_dir() and stage.resolve().is_relative_to(inv.OUT)
public = stage / 'public'

def materialize(directory):
    assert directory.is_relative_to(stage)
    if directory.is_symlink():
        source = directory.resolve(strict=True)
        entries = list(source.iterdir())
        directory.unlink()
        directory.mkdir()
        for entry in entries:
            (directory / entry.name).symlink_to(entry, target_is_directory=entry.is_dir())
    assert directory.resolve().is_relative_to(stage)

def write(path, content):
    assert path.parent.resolve().is_relative_to(stage)
    if path.is_symlink():
        path.unlink()
    path.write_text(content)

materialize(public / 'js')
materialize(public / 'js/data')
source_config = inv.ROOT / 'public/js/data/vmconfig.js'
config = source_config.read_text()
needle = "m4: W('ar'),"
assert config.count(needle) == 1
config = config.replace(needle, "m4: W('ar', typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('vmrifles') === 'm4-c1' ? { baked: true } : {}),")
write(public / 'js/data/vmconfig.js', config)
source_runtime = inv.ROOT / 'public/js/authoredvm.js'
runtime = source_runtime.read_text()
replacements = {
    'const frame = golden': "const frame = sourceKey === 'ar#m4' && _QS?.get('vmrifles') === 'm4-c1'\n    ? { x: 0, y: 0, z: 0, fov: cameraFov }\n    : golden",
    'this._setupGeneralMotion(entry, general);': "if (!(key === 'ar#m4' && _QS?.get('vmrifles') === 'm4-c1')) this._setupGeneralMotion(entry, general);",
}
for old, new in replacements.items():
    assert runtime.count(old) == 1
    runtime = runtime.replace(old, new)
write(public / 'js/authoredvm.js', runtime)
write(public / 'js/rifles-cpu.mjs', runtime + '\nexport { cameraSpacePackage };\n')
for directory in ['private-assets', 'private-assets/viewmodels', 'private-assets/viewmodels/ar']:
    materialize(public / directory)
asset = inv.OUT / 'm4-candidate/m4-baked-runtime.glb'
assert asset.is_file() and asset.resolve().is_relative_to(inv.OUT)
destination = public / 'private-assets/viewmodels/ar/m4-baked-runtime.glb'
if destination.is_symlink():
    destination.unlink()
assert not destination.exists()
destination.symlink_to(asset)
for name, source in [('rifles-m4', asset.parent), ('rifles-cs16', inv.OUT / 'cs16-reference'),
                     ('rifles-m4-before-hands', inv.OUT / 'm4-c1-before-hands')]:
    if not source.is_dir():
        continue
    link = public / name
    if link.is_symlink():
        assert link.resolve() == source
    else:
        assert not link.exists()
        link.symlink_to(source, target_is_directory=True)
record = {'status': 'opt-in composition preview, no action or visual certification',
          'url': 'http://127.0.0.1:8160/?debug=1&auto=E&vmweapon=m4&map=brasilia&armaslazy=0&vmready=ar&vmrifles=m4-c1',
          'source_hashes': {str(p.relative_to(inv.ROOT)): inv.digest(p) for p in [source_config,source_runtime]},
          'staged_hashes': {str(p.relative_to(stage)): inv.digest(p) for p in [public/'js/data/vmconfig.js',public/'js/authoredvm.js',destination]}}
(inv.OUT / 'm4-candidate/stage.json').write_text(json.dumps(record, indent=2)+'\n')
print(record['url'])
