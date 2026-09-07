"""Estágio local da candidata LMG (porta 8165, isolada das lanes de mapas).

Monta A/local-server-8165/public: código do jogo desta worktree por symlink;
private-assets com symlink por família da integradora (somente leitura) e um
diretório PRÓPRIO para lmg servindo a candidata no URL da família. Nunca
escreve na integradora nem em public/ do repo. HTTP smoke embutido: sobe,
confere 200 + hash do GLB servido e desce.
"""
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
A = ROOT / 'artifacts/viewmodels/prep/lmg'
STAGE = A / 'local-server-8165'
PORT = 8165
SOURCE = ROOT.parent / 'vm-astra-pistol'


def digest(path):
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main():
    assert ROOT.name == 'vm-lmg-final'
    pub = STAGE / 'public'
    (pub).mkdir(parents=True, exist_ok=True)
    # código do jogo desta worktree
    for item in ('js', 'models', 'vendor', 'audio', 'style.css'):
        src = ROOT / 'public' / item
        dst = pub / item
        if not dst.exists() and src.exists():
            dst.symlink_to(src, target_is_directory=src.is_dir())
    # o servidor lê src/pages, package.json e scripts/ do cwd
    for item in ('src', 'scripts', 'package.json'):
        src = ROOT / item
        dst = STAGE / item
        if not dst.exists() and src.exists():
            dst.symlink_to(src, target_is_directory=src.is_dir())
    # private-assets: famílias por symlink da integradora; lmg é NOSSO
    pa = pub / 'private-assets' / 'viewmodels'
    pa.mkdir(parents=True, exist_ok=True)
    src_pa = SOURCE / 'public/private-assets/viewmodels'
    for fam in src_pa.iterdir():
        if fam.name == 'lmg':
            continue
        dst = pa / fam.name
        if not dst.exists():
            dst.symlink_to(fam, target_is_directory=True)
    lmg_dir = pa / 'lmg'
    if lmg_dir.is_symlink():
        lmg_dir.unlink()
    lmg_dir.mkdir(exist_ok=True)
    candidate = A / 'lmg-candidate' / 'lmg-runtime-candidate.glb'
    served = lmg_dir / 'lmg-runtime.glb'
    served.write_bytes(candidate.read_bytes())
    report = {'port': PORT, 'served': str(served), 'sha256': digest(served),
              'candidate_sha256': digest(candidate)}
    assert report['sha256'] == report['candidate_sha256']

    serve = ROOT / 'tools/eval/serve.mjs'
    node = '/opt/homebrew/bin/node'
    proc = subprocess.Popen([node, str(serve), str(PORT)], cwd=str(STAGE),
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ok = False
        for _ in range(30):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/private-assets/viewmodels/lmg/lmg-runtime.glb', timeout=2) as r:
                    body = r.read()
                if hashlib.sha256(body).hexdigest() == report['sha256']:
                    ok = True
                    break
            except Exception:
                continue
        report['http_smoke'] = ok
        (STAGE / 'stage-report.json').write_text(json.dumps(report, indent=1))
        print('LMG_STAGE=' + json.dumps(report))
        if not ok:
            sys.exit(1)
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == '__main__':
    main()
