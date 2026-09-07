#!/usr/bin/env python3
"""Staging local da lane vm-dmr-final (padrão rifles-m4-stage.py).

Materializa em artifacts/viewmodels/dmr/local-server-8162/ um checkout de
pré-visualização com opção opt-in `vmdmr=rem700|g3sg1`:
  - weapons.js/data/weapons.js: rem700 e g3sg1 voltam ao arsenal SOMENTE com a
    opção (decisão do dono de 30/08 permanece: sem a opção, o jogo não muda);
  - vmconfig.js: VM_WEAPON baked:true por arma sob a opção;
  - authoredvm.js: baked usa a câmera exportada, sem offsets de família (a
    composição foi registrada offline; offsets duplicariam o enquadramento).
Nada fora de artifacts/ é escrito. O repositório permanece intacto.
"""
import json
import os
import shutil

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
ART = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr')
STAGE = os.path.join(ART, 'local-server-8162')
INTEGRADORA = '/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol'
OPCAO = "new URLSearchParams(window.location.search).get('vmdmr')"


def link_fonte(rel, fonte=None, alvo=None):
    alvo = alvo or os.path.join(STAGE, rel)
    fonte = fonte or os.path.join(CWD, rel)
    os.makedirs(os.path.dirname(alvo), exist_ok=True)
    if os.path.islink(alvo) or os.path.isfile(alvo):
        os.remove(alvo)
    elif os.path.isdir(alvo):
        shutil.rmtree(alvo)
    os.symlink(fonte, alvo)


def materializar(rel):
    alvo = os.path.join(STAGE, rel)
    fonte = os.path.join(CWD, rel)
    os.makedirs(os.path.dirname(alvo), exist_ok=True)
    if os.path.islink(alvo):
        os.remove(alvo)
    elif os.path.isdir(alvo):
        shutil.rmtree(alvo)
    os.makedirs(alvo, exist_ok=True)
    for entrada in os.listdir(fonte):
        origem = os.path.join(fonte, entrada)
        destino = os.path.join(alvo, entrada)
        if not os.path.islink(destino):
            os.symlink(origem, destino)


def escrever(rel, conteudo):
    alvo = os.path.join(STAGE, rel)
    if os.path.islink(alvo):
        os.remove(alvo)
    with open(alvo, 'w') as fh:
        fh.write(conteudo)


def principal():
    os.makedirs(STAGE, exist_ok=True)
    # estrutura do site: cópias de metadados, symlinks do resto
    # config e package são COPIAS: symlink faria o vite resolver módulos pelo
    # realpath (na worktree sem node_modules) e morrer no boot.
    for rel in ('package.json', 'astro.config.mjs', 'tsconfig.json', 'vercel.json'):
        if os.path.exists(os.path.join(CWD, rel)):
            alvo = os.path.join(STAGE, rel)
            if os.path.islink(alvo) or os.path.isfile(alvo):
                os.remove(alvo)
            shutil.copy2(os.path.join(CWD, rel), alvo)
    for rel in ('src', 'scripts'):
        if os.path.exists(os.path.join(CWD, rel)):
            link_fonte(rel)
    # dependências: as da integradora, somente leitura (a worktree não tem)
    link_fonte('node_modules', fonte=os.path.join(INTEGRADORA, 'node_modules'))
    for rel in ('public/vendor', 'public/audio', 'public/models', 'public/maps',
                'public/img', 'public/css', 'public/fonts', 'public/js/botbrain'):
        if os.path.exists(os.path.join(CWD, rel)):
            link_fonte(rel)
    # js do jogo: materializado para edição
    materializar('public/js')
    materializar('public/js/data')

    # ---- weapons.js: CFG (dados inertes) + WEAPON_IDS filtrado pela opção
    with open(os.path.join(CWD, 'public/js/weapons.js')) as fh:
        s = fh.read()
    a = "const WEAPON_IDS = ['awp'"
    assert s.count(a) == 1, 'âncora WEAPON_IDS ausente'
    s = s.replace(a, (
        "// lane vm-dmr-final (staging): DMRs só entram no arsenal com ?vmdmr=<arma>.\n"
        f"const DMR_GATE = {OPCAO};\n"
        + a))
    s = s.replace("'svd', 'sks'];", (
        "'svd', 'sks', 'rem700', 'g3sg1'].filter(\n"
        "  (id) => (id !== 'rem700' && id !== 'g3sg1') || DMR_GATE === id);"))
    ancora_cfg = "  awp:     { len: 1.15, rot: [0, 90, 0], gripZ: 0.72, vm: 0.78 },"
    assert s.count(ancora_cfg) == 1, 'âncora CFG.awp ausente'
    s = s.replace(ancora_cfg, (
        "  // DMRs (pré-corte 84f691d1^): rem700 ferrolho, g3sg1 semi-auto; Mint própria.\n"
        "  rem700:  { len: 1.15, rot: [0, 270, 0], gripZ: 0.66, vm: 0.78 },\n"
        "  g3sg1:   { len: 1.12, rot: [0, 270, 0], gripZ: 0.58, vm: 0.71 },\n"
        + ancora_cfg))
    escrever('public/js/weapons.js', s)

    # ---- data/weapons.js: stats pré-corte (dados inertes; o arsenal filtra acima)
    with open(os.path.join(CWD, 'public/js/data/weapons.js')) as fh:
        d = fh.read()
    ancora = '  sks:'
    assert d.count(ancora) == 1, 'âncora sks ausente em data/weapons.js'
    bloco = (
        "  // lane vm-dmr-final (staging): stats pré-corte 84f691d1^.\n"
        "  rem700:   { name: 'REM 700 \"CAÇADOR\"', short: 'REM', dmg: 130, mag: 5, reserve: 25, rate: 1.5, reload: 3.2, spreadHip: 0.08, spreadScope: 0.0009, recoil: 0.05, scope: true },\n"
        "  g3sg1:    { name: 'G3SG1 \"FRITZ\"', short: 'G3SG1', dmg: 55, mag: 20, reserve: 60, rate: 0.22, reload: 2.8, spreadHip: 0.045, spreadScope: 0.0016, recoil: 0.026, auto: true, scope: true },\n"
    )
    d = d.replace(ancora, bloco + "  sks:")
    escrever('public/js/data/weapons.js', d)

    # ---- vmconfig.js: baked por arma sob a opção
    with open(os.path.join(CWD, 'public/js/data/vmconfig.js')) as fh:
        v = fh.read()
    a = "  svd: W('svd'),"
    assert v.count(a) == 1, 'âncora svd ausente em vmconfig.js'
    v = v.replace(a, (
        "  // lane vm-dmr-final (staging): rem700 → família bolt (reload bolt_loop do\n"
        "  // Kar98K: ferrolho + clip de 5 no mag interno); g3sg1 → família g3 (doador\n"
        "  // G3: carregador destacável, SEM movimento de ferrolho). baked só com ?vmdmr=.\n"
        f"  rem700: W('bolt', {OPCAO} === 'rem700' ? {{ baked: true }} : {{}}),\n"
        f"  g3sg1: W('g3', {OPCAO} === 'g3sg1' ? {{ baked: true }} : {{}}),\n"
        + a))
    escrever('public/js/data/vmconfig.js', v)

    # ---- authoredvm.js: baked DMR usa a câmera exportada, sem offsets
    with open(os.path.join(CWD, 'public/js/authoredvm.js')) as fh:
        r = fh.read()
    a = "    : (FAMILY_FRAME[family] || FAMILY_FRAME.default);"
    assert r.count(a) == 1, 'âncora FAMILY_FRAME ausente'
    r = r.replace(a, (
        f"    : (/^(bolt#rem700|g3#g3sg1)$/.test(sourceKey) && {OPCAO})\n"
        "    ? { x: 0, y: 0, z: 0, fov: cameraFov }  // lane vm-dmr-final: câmera registrada offline\n"
        + a))
    escrever('public/js/authoredvm.js', r)

    # ---- private-assets: árvore de famílias + GLBs baked da lane
    pa = os.path.join(STAGE, 'public/private-assets/viewmodels')
    os.makedirs(pa, exist_ok=True)
    base = os.path.join(INTEGRADORA, 'public/private-assets/viewmodels')
    for fam in ('bolt', 'g3', 'shared'):
        alvo = os.path.join(pa, fam)
        if not os.path.islink(alvo) and not os.path.exists(alvo):
            os.symlink(os.path.join(base, fam), alvo)
    for arma, fam in (('rem700', 'bolt'), ('g3sg1', 'g3')):
        destino = os.path.join(pa, fam, f'{arma}-baked-runtime.glb')
        if os.path.islink(destino):
            os.remove(destino)
        os.symlink(os.path.join(ART, arma, 'cand1', f'{arma}-baked-runtime.glb'), destino)

    registro = {
        'status': 'staging opt-in; nenhuma certificação visual ou de produção',
        'urls': [
            'http://127.0.0.1:8162/?debug=1&auto=E&vmweapon=rem700&map=brasilia&armaslazy=0&vmready=bolt&vmdmr=rem700',
            'http://127.0.0.1:8162/?debug=1&auto=E&vmweapon=g3sg1&map=brasilia&armaslazy=0&vmready=g3&vmdmr=g3sg1',
        ],
        'nota': 'rem700/g3sg1 só existem no arsenal com ?vmdmr=; sem a opção o jogo é a base.',
    }
    with open(os.path.join(ART, 'stage.json'), 'w') as fh:
        json.dump(registro, fh, indent=2)
    print(json.dumps(registro, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    principal()
