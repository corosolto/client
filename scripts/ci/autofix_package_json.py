#!/usr/bin/env python3
"""Resolve o conflito de `package.json` que TODO release reabre — e só esse.

POR QUE ESTE ARQUIVO EXISTE
  Cada `chore(release)` na main bumpa a versão em package.json. Todo PR aberto que
  tenha acrescentado um script conflita ali, e `package.json` não está (nem pode
  estar, em bloco) no allowlist do autofix: o bot aborta, comenta "conflito de
  código", e o PR fica CONFLICTING para sempre. Medido em 24/09: sete PRs travados
  ao mesmo tempo, o autofix recusando cada um deles a cada disparo, e o único
  arquivo fora da lista era `package.json` — sempre com a mesma forma (versão nova
  contra script novo).

O QUE ELE ACEITA RESOLVER
  · `version`: fica o da BASE. PR não bumpa versão; quem bumpa é o release.
  · `scripts`: UNIÃO. Chave só de um lado entra. Chave nos dois com valores
    diferentes só passa se um dos lados for idêntico ao ancestral (aí vale o outro)
    ou se for um script AGREGADOR (`check:*`), e aí os tokens são unidos na ordem.

O QUE ELE SE RECUSA A RESOLVER (e aí o bot devolve para gente, como hoje)
  · qualquer mexida em dependências (`dependencies`, `devDependencies`, ...);
  · qualquer outra chave divergente dos dois lados;
  · script agregador que perderia token de algum lado.

A recusa é o comportamento SEGURO: é exatamente o que acontece hoje, para todo
conflito. Este script só reduz o conjunto de casos em que ele acontece.
"""
import json
import subprocess
import sys

DEPS = ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "bundledDependencies")
CAMINHO = "package.json"


def estagio(n: int, caminho: str = CAMINHO):
    """Lê um estágio do índice: 1=ancestral, 2=nosso (head do PR), 3=deles (base)."""
    try:
        bruto = subprocess.check_output(["git", "show", f":{n}:{caminho}"], text=True)
    except subprocess.CalledProcessError:
        return None
    return json.loads(bruto)


def une_agregador(base_v, nosso_v, deles_v):
    """`check:fast` e amigos são lista de tokens separados por espaço.

    União preservando a ordem de quem já estava: primeiro os tokens da base (que é
    quem manda na main), depois os que só o PR tem, na ordem em que ele os pôs.
    Devolve None quando a união perderia informação de algum lado.
    """
    tb, tn, td = (v.split() if v else [] for v in (base_v, nosso_v, deles_v))
    saida = list(td)
    for t in tn:
        if t not in saida:
            # respeita remoção deliberada da base: token que o ancestral tinha e a
            # base tirou não volta pela porta dos fundos
            if t in tb and t not in td:
                return None
            saida.append(t)
    return " ".join(saida)


def resolve(ancestral, nosso, deles):
    """Devolve o dict mesclado, ou levanta ValueError com o motivo da recusa."""
    ancestral = ancestral or {}
    saida = dict(deles)

    for chave in DEPS:
        if nosso.get(chave) != deles.get(chave) and nosso.get(chave) != ancestral.get(chave):
            raise ValueError(f"'{chave}' mudou dos dois lados — dependência é julgamento, não é minha")

    scripts_base = ancestral.get("scripts", {})
    scripts_nossos = nosso.get("scripts", {})
    scripts_deles = deles.get("scripts", {})
    scripts = dict(scripts_deles)
    for k, v in scripts_nossos.items():
        if k not in scripts:
            scripts[k] = v
            continue
        if scripts[k] == v:
            continue
        if scripts_base.get(k) == v:          # o PR não mexeu; a base mexeu
            continue
        if scripts_base.get(k) == scripts[k]:  # a base não mexeu; o PR mexeu
            scripts[k] = v
            continue
        if k.startswith("check:"):
            unido = une_agregador(scripts_base.get(k), v, scripts[k])
            if unido is None:
                raise ValueError(f"script agregador '{k}' perderia token na união")
            scripts[k] = unido
            continue
        raise ValueError(f"script '{k}' mudou dos dois lados com valores diferentes")
    saida["scripts"] = scripts

    for chave in set(nosso) | set(deles):
        if chave in ("scripts", "version") or chave in DEPS:
            continue
        n, d = nosso.get(chave), deles.get(chave)
        if n == d:
            continue
        if n == ancestral.get(chave):
            continue
        if d == ancestral.get(chave):
            saida[chave] = n
            continue
        raise ValueError(f"chave '{chave}' divergiu dos dois lados")

    return saida


def selftest() -> int:
    anc = {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "1"}}
    casos = [
        ("versão fica a da base, script novo do PR entra",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "novo": "y", "check:fast": "a b novo"}, "devDependencies": {"z": "1"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "1"}},
         lambda r: r["version"] == "1.0.1" and r["scripts"]["novo"] == "y" and r["scripts"]["check:fast"] == "a b novo"),
        ("agregador une os dois lados sem duplicar",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b pr"}, "devDependencies": {"z": "1"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a b main"}, "devDependencies": {"z": "1"}},
         lambda r: r["scripts"]["check:fast"] == "a b main pr"),
        ("remoção deliberada da base vence quando o PR não mexeu no agregador",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "1"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a"}, "devDependencies": {"z": "1"}},
         lambda r: r["scripts"]["check:fast"] == "a"),
        ("união que ressuscitaria token removido pela base recusa",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b pr"}, "devDependencies": {"z": "1"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a"}, "devDependencies": {"z": "1"}},
         None),
        ("dependência mexida dos dois lados recusa",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "2"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "3"}},
         None),
        ("script comum divergente dos dois lados recusa",
         anc,
         {"version": "1.0.0", "scripts": {"a": "pr", "check:fast": "a b"}, "devDependencies": {"z": "1"}},
         {"version": "1.0.1", "scripts": {"a": "main", "check:fast": "a b"}, "devDependencies": {"z": "1"}},
         None),
        ("chave nova só do PR sobrevive",
         anc,
         {"version": "1.0.0", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "1"}, "engines": {"node": ">=22"}},
         {"version": "1.0.1", "scripts": {"a": "x", "check:fast": "a b"}, "devDependencies": {"z": "1"}},
         lambda r: r["engines"] == {"node": ">=22"}),
    ]
    erros = 0
    for nome, a, n, d, espera in casos:
        try:
            r = resolve(a, n, d)
            ok = espera is not None and espera(r)
            detalhe = "resolveu"
        except ValueError as e:
            ok = espera is None
            detalhe = f"recusou ({e})"
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {detalhe}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    ancestral, nosso, deles = estagio(1), estagio(2), estagio(3)
    if nosso is None or deles is None:
        print("autofix_package_json: package.json não está em conflito de conteúdo", file=sys.stderr)
        return 1
    try:
        saida = resolve(ancestral, nosso, deles)
    except ValueError as e:
        print(f"autofix_package_json: recuso — {e}", file=sys.stderr)
        return 1
    with open(CAMINHO, "w") as f:
        json.dump(saida, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"autofix_package_json: resolvido — versão {saida.get('version')}, {len(saida.get('scripts', {}))} scripts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
