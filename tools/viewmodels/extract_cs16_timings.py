#!/usr/bin/env python3
"""Extrai cs16-timings.json dos fontes SMD/QC do CS 1.6 (zip do dono).

Só PARÂMETROS saem daqui — $origin, fps e contagem de frames por sequência;
nenhum keyframe ou geometria da Valve. A seção `familias` mapeia cada família
KINEMATION ao doador mecânico e deriva as durações cs16 ((frames-1)/fps) que o
vmconfig.js copia — o vm-cs16-check.mjs compara os dois.

Uso: python3 tools/viewmodels/extract_cs16_timings.py <dir com v_*/ extraídos> \
       [saida.json]
  (dir = unzip de cs16_widescreen_src.zip; padrão de saída:
   tools/viewmodels/cs16-timings.json)
"""
import json
import pathlib
import re
import sys

# família KINEMATION -> (doador, nomes das sequências idle/draw/reload/shoot)
FAMILIAS = {
    "ak":       ("v_ak47",  {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    "ar":       ("v_m4a1",  {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    "mp5":      ("v_mp5",   {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    "smg":      ("v_mac10", {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    # p90: shoot2/3 (0.467) — shoot1 (0.4) é o único mais curto do trio.
    "p90":      ("v_p90",   {"draw": "draw", "reload": "reload", "shoot": "shoot2"}),
    # g3/marksman/svd compartilham o v_g3sg1 (G3/SVD não existem no CS 1.6).
    "g3":       ("v_g3sg1", {"draw": "draw", "reload": "reload", "shoot": "shoot"}),
    "marksman": ("v_g3sg1", {"draw": "draw", "reload": "reload", "shoot": "shoot"}),
    "svd":      ("v_g3sg1", {"draw": "draw", "reload": "reload", "shoot": "shoot"}),
    "sniper":   ("v_awp",   {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    "bolt":     ("v_scout", {"draw": "draw", "reload": "reload", "shoot": "shoot_1"}),
    "deagle":   ("v_deagle", {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    "pistol":   ("v_usp",   {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    # shotgun: sem sequência de reload no QC (recarga é laço de cartucho).
    "shotgun":  ("v_m3",    {"draw": "draw", "shoot": "shoot1"}),
    "lmg":      ("v_m249",  {"draw": "draw", "reload": "reload", "shoot": "shoot1"}),
    # revolver: sem doador — não existe no CS 1.6.
}


def frames_do_smd(caminho: pathlib.Path) -> int:
    n, dentro = 0, False
    for linha in caminho.read_text(errors="replace").splitlines():
        if linha.startswith("skeleton"):
            dentro = True
        elif dentro and linha.startswith("time "):
            n += 1
    return n


def sequencias(pasta: pathlib.Path) -> dict:
    qc = next(pasta.glob("*.qc"), None)
    if qc is None:
        return {}
    texto = qc.read_text(errors="replace")
    saida = {}
    for m in re.finditer(r'\$sequence\s+"?(\w+)"?\s+"?(\w+)"?[^\n]*?fps\s+(\d+)', texto):
        nome, smd, fps = m.group(1), m.group(2), int(m.group(3))
        arquivo = pasta / f"{smd}.smd"
        if not arquivo.exists():
            continue
        frames = frames_do_smd(arquivo)
        saida[nome] = {"fps": fps, "frames": frames, "dur": round((frames - 1) / fps, 3)}
    origem = re.search(r"^\$origin\s+([\d.\- ]+)", texto, re.M)
    return {"origin": origem.group(1).strip() if origem else None, "seqs": saida}


def main() -> None:
    raiz = pathlib.Path(sys.argv[1])
    destino = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else (
        pathlib.Path(__file__).with_name("cs16-timings.json"))
    modelos = {p.name: sequencias(p) for p in sorted(raiz.glob("v_*")) if p.is_dir()}
    modelos = {k: v for k, v in modelos.items() if v.get("seqs")}

    familias = {}
    for familia, (doador, nomes) in FAMILIAS.items():
        seqs = modelos.get(doador, {}).get("seqs", {})
        cs16 = {}
        for estado, seq in nomes.items():
            if seq in seqs:
                cs16[estado] = seqs[seq]["dur"]
        familias[familia] = {"doador": doador, "cs16": cs16}

    destino.write_text(json.dumps({
        "fonte": "cs16_widescreen_src.zip — parametros ($origin, fps, frames) "
                 "extraidos dos QC/SMD; nenhum keyframe",
        "reproduzir": "python3 tools/viewmodels/extract_cs16_timings.py <dir do unzip>",
        "familias": familias,
        "modelos": modelos,
    }, indent=1) + "\n")
    print(f"CS16_TIMINGS={destino} ({len(modelos)} modelos, {len(familias)} familias)")


main()
