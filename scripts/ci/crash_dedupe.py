#!/usr/bin/env python3
"""Duplicata de crash: agrupa por CLASSE de defeito, não por semelhança de título.

O detector nasceu comparando títulos com SequenceMatcher a >= 0.84, e por isso não
via o caso mais comum. "Could not create a WebGL context, VENDOR = 0xffff, DEVICE =
0xffff, GL_VENDOR = Disabled…" e "Web page caused context loss and was blocked" são
o MESMO defeito - o navegador não entregou contexto WebGL -, mas o texto que o
navegador cospe muda tanto entre fabricante e driver que a semelhança fica abaixo do
piso. Medido em 12/08/2026: das 33 issues `crash-auto` abertas, **14 eram essa única
classe**, mais 4 de textura GLTF e 3 de shader. O backlog parou de significar.

A classe vem de um sinal ESTÁVEL (a API que falhou), e não da prosa do erro. Título
que casa a mesma classe é duplicata, sem depender de semelhança. Fora de classe
conhecida, o comportamento antigo continua valendo - classificador que não conhece o
caso não pode virar "não é duplicata" nem "é".

`--selftest` roda as fixtures com os títulos REAIS das issues que motivaram a
mudança.
"""
import json
import re
import sys
from difflib import SequenceMatcher

PISO_SEMELHANCA = 0.84

# Classe -> sinal. A ordem importa: a primeira que casar vence, e as mais
# específicas vêm antes (shader é um erro DENTRO de um contexto que existe).
CLASSES: list[tuple[str, re.Pattern]] = [
    ("shader-compilacao", re.compile(r"webglprogram|shader error|validate_status", re.I)),
    ("gltf-textura", re.compile(r"gltfloader.*(couldn't load|failed to load)", re.I)),
    ("webgl-sem-contexto", re.compile(
        r"sem_webgl|could not create a webgl|webgl context could not|context loss|"
        r"webgl creation failed|exhausted gl driver", re.I)),
    ("midia-bloqueada", re.compile(
        r"media resource was aborted|play method is not allowed|notallowederror", re.I)),
    ("rede", re.compile(r"load failed|network error|error in input stream|failed to fetch", re.I)),
    ("prod-watch", re.compile(r"prod-watch", re.I)),
]


def classify(title: str) -> str | None:
    for nome, sinal in CLASSES:
        if sinal.search(title):
            return nome
    return None


def normalize(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"blob:https?://\S+", "blob:<id>", t)
    t = re.sub(r"\b[0-9a-f]{8,}\b", "<hex>", t)
    t = re.sub(r"\s+", " ", t)
    return t


def find_duplicate(current: dict, others: list[dict]) -> dict | None:
    current_num = current["number"]
    current_classe = classify(current["title"])
    current_norm = normalize(current["title"])

    # Canônica da classe: a issue ABERTA mais antiga (menor número). Fechar em
    # direção à mais antiga preserva a discussão que já existe.
    if current_classe:
        mesma_classe = sorted(
            (i for i in others
             if i["number"] != current_num and classify(i["title"]) == current_classe),
            key=lambda i: i["number"],
        )
        if mesma_classe:
            alvo = mesma_classe[0]
            return {
                "number": alvo["number"],
                "title": alvo["title"],
                "url": alvo.get("url", ""),
                "score": 1.0,
                "classe": current_classe,
                "motivo": "mesma classe de defeito",
            }

    best, best_score = None, 0.0
    for issue in others:
        if issue["number"] == current_num:
            continue
        score = SequenceMatcher(None, current_norm, normalize(issue["title"])).ratio()
        if score > best_score:
            best_score, best = score, issue

    if best and best_score >= PISO_SEMELHANCA:
        return {
            "number": best["number"],
            "title": best["title"],
            "url": best.get("url", ""),
            "score": round(best_score, 3),
            "classe": None,
            "motivo": "títulos semelhantes",
        }
    return None


def selftest() -> int:
    reais = {
        196: "crash em produção: sem_webgl: nenhum contexto foi criado · webgl2/economia: Could not create a WebGL context, VENDOR = 0xffff, DEVICE = 0xffff, GL_VENDOR = Disabled",
        206: "crash em produção: sem_webgl: nenhum contexto foi criado · experimental-webgl/economia: Web page caused context loss and was blocked",
        128: "crash em produção: THREE.WebGLRenderer: A WebGL context could not be created. Reason:  WebGL creation failed: * tryANGLE",
        130: "crash em produção: THREE.WebGLProgram: Shader Error 1282 - VALIDATE_STATUS false",
        113: "crash em produção: THREE.GLTFLoader: Couldn't load texture blob:https://www.csbrasil.online/8b888933",
        114: "crash em produção: THREE.GLTFLoader: Couldn't load texture blob:https://www.csbrasil.online/4e3a6d00",
        117: "crash em produção: The play method is not allowed by the user agent or the platform",
        122: "crash em produção: The fetching process for the media resource was aborted by the user agent",
        125: "crash em produção: network error",
        170: "crash em produção: Load failed",
        176: "Sugestão: sistema de progressão e evolução do jogador",
    }
    outras = [{"number": n, "title": t, "url": f"u{n}"} for n, t in reais.items()]

    casos = [
        # a canônica é a ABERTA mais antiga da classe, e é por isso que o alvo é #128
        ("webgl vendor x context loss", 206, 128, "webgl-sem-contexto"),
        ("webgl renderer entra na mesma classe", 128, 196, "webgl-sem-contexto"),
        ("shader NÃO cai em webgl", 130, None, None),
        ("gltf agrupa com gltf", 114, 113, "gltf-textura"),
        ("autoplay e mídia abortada são a mesma classe", 122, 117, "midia-bloqueada"),
        ("load failed e network error são a mesma classe", 170, 125, "rede"),
        ("issue humana não vira duplicata de crash", 176, None, None),
    ]
    erros = 0
    for nome, num, esperado_num, esperada_classe in casos:
        atual = {"number": num, "title": reais[num]}
        d = find_duplicate(atual, outras)
        obtido = d["number"] if d else None
        classe = d["classe"] if d else None
        ok = obtido == esperado_num and (esperada_classe is None or classe == esperada_classe)
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: #{num} -> {obtido} ({classe})")

    # A classe não pode engolir defeito que ainda não tem classe: sem sinal
    # conhecido, o piso de semelhança continua sendo quem decide.
    solto = {"number": 900, "title": "crash em produção: SyntaxError: illegal character U+009E"}
    d = find_duplicate(solto, outras)
    ok = d is None
    erros += 0 if ok else 1
    print(f"  {'ok  ' if ok else 'FALHOU'} defeito sem classe não vira duplicata: {d}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    print(json.dumps({"duplicate": find_duplicate(payload["current"], payload["others"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
