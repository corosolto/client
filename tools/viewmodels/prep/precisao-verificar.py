"""Confere integridade da entrega offline, sem executar testes ou builders globais."""
import datetime
import hashlib
import json
from pathlib import Path
import py_compile
import subprocess

RAIZ = Path(__file__).resolve().parents[3]
OUT = RAIZ / 'artifacts/viewmodels/prep/precisao'
assert RAIZ.name == 'vm-prep-precisao' and OUT.resolve().is_relative_to(RAIZ)

def git(*args):
    return subprocess.check_output(['git', *args], cwd=RAIZ, text=True).strip()

def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b''):
            h.update(bloco)
    return h.hexdigest()

assert git('branch', '--show-current') == 'codex/vm-prep-precisao'
subprocess.run(['git', 'merge-base', '--is-ancestor', '961c70d2', 'HEAD'], cwd=RAIZ, check=True)
subprocess.run(['git', 'diff', '--check'], cwd=RAIZ, check=True)
inv = json.loads((OUT / 'inventario.json').read_text())
resumo = json.loads((OUT / 'resumo.json').read_text())
entradas = {}
def visitar(item):
    if isinstance(item, dict):
        if item.get('exists') and 'sha256' in item:
            entradas[item['path']] = item['sha256']
        for valor in item.values(): visitar(valor)
    elif isinstance(item, list):
        for valor in item: visitar(valor)

# Ledgers da integradora podem evoluir durante a frente; seu hash é só um snapshot.
visitar({k: v for k, v in inv.items() if k != 'live_ledgers'})
conferidos = []
for nome, esperado in entradas.items():
    observado = sha(Path(nome))
    assert observado == esperado, f'Insumo mudou desde o inventário: {nome}'
    conferidos.append({'path': nome, 'sha256': observado})
scripts = []
for path in sorted((RAIZ / 'tools/viewmodels/prep').glob('precisao-*.py')):
    py_compile.compile(str(path), cfile=str(OUT / (path.stem + '.pyc')), doraise=True)
    scripts.append({'path': str(path.relative_to(RAIZ)), 'sha256': sha(path)})
for w, contagem in (('mosin', 42), ('svd', 21), ('sks', 21)):
    r = resumo['weapons'][w]
    assert r['sample_count'] == contagem
    assert r['max_import_joint_position_error'] < 1e-5
    for malha in resumo['uv'][w].values():
        assert all(malha[k] for k in ('TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0', 'indices'))
    for vista in ('lateral', 'superior'):
        imagem = OUT / f'{w}-own-{vista}.png'
        assert imagem.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
assert (OUT / 'fbx-fps.json').is_file()
assert (OUT / 'revisao-independente.md').is_file()
resultado = {
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'branch': git('branch', '--show-current'), 'head_na_verificacao': git('rev-parse', 'HEAD'),
    'base': inv['base'], 'scripts_compilados': scripts, 'insumos_inalterados': conferidos,
    'poses_conferidas': 84, 'uv_skin_indices_compativeis_com_pistol': True,
    'git_diff_check': 'passou', 'limite': 'Integridade offline; não certifica contato, render final ou Game.',
}
(OUT / 'verificacao.json').write_text(json.dumps(resultado, indent=2) + '\n')
manifesto = [{'path': str(p.relative_to(OUT)), 'bytes': p.stat().st_size, 'sha256': sha(p)}
             for p in sorted(OUT.rglob('*')) if p.is_file() and p.name != 'artefatos-sha256.json']
(OUT / 'artefatos-sha256.json').write_text(json.dumps(manifesto, indent=2) + '\n')
print(json.dumps({'scripts': len(scripts), 'insumos': len(conferidos), 'poses': 84,
                  'artefatos': len(manifesto), 'resultado': 'passou'}))
