#!/usr/bin/env python3
import json
import sys

SENSITIVE_GAMEPLAY = (
    "public/js/game.js",
    "public/js/characters.js",
    "public/style.css",
)
SENSITIVE_PREFIXES = (
    "public/js/map",
    "src/pages/api/",
    "supabase/",
)
SAFE_PREFIXES = (
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".github/ISSUE_TEMPLATE/",
    ".github/PULL_REQUEST_TEMPLATE",
    "docs/",
)


def target_label(base_branch: str) -> str:
    base = (base_branch or "main").strip().lower()
    if base == "main":
        return "target:main"
    if base == "staging" or base.startswith("staging/"):
        return "target:staging"
    if base.startswith("release/") or base.startswith("release-"):
        return "target:release"
    return "target:main"


def classifica(payload: dict) -> dict:
    """PR grande demais devolve `files: null` — não uma lista vazia.

    A leitura anterior (`payload.get("files", [])`) só cobria a CHAVE AUSENTE: com a
    chave presente e nula o `default` não vale e o classify morria de TypeError, que é
    check vermelho por defeito da régua, não por defeito do PR (medido no #618, 439
    commits). E o remendo óbvio — `or []` e segue — é pior que o erro: sem a lista,
    NENHUM `touches_*` acende e o PR que mexe em game.js sai sem `needs-human-gameplay`.
    Lista incompleta é DESCONHECIMENTO, e desconhecimento aqui trava: pede humano e
    tira o `safe-automerge`.
    """
    arquivos_brutos = payload.get("files")
    files = [f["path"] for f in arquivos_brutos] if arquivos_brutos else []
    additions = int(payload.get("additions") or 0)
    deletions = int(payload.get("deletions") or 0)
    changed_files = int(payload.get("changedFiles") if payload.get("changedFiles") is not None else len(files))
    base_branch = payload.get("baseRefName") or "main"
    lista_incompleta = changed_files > len(files)

    labels_add: list[str] = []
    labels_remove: list[str] = []

    touches_backend = any(p.startswith(("src/pages/api/", "supabase/")) for p in files)
    touches_gameplay = any(
        p in SENSITIVE_GAMEPLAY or p.startswith("public/js/map") for p in files
    )
    touches_runtime_ui = touches_gameplay or any(
        p.startswith(("public/", "src/")) for p in files
    )
    touches_workflows = any(p.startswith(".github/workflows/") for p in files)
    only_safe = (not lista_incompleta) and files and all(
        any(p == prefix or p.startswith(prefix) for prefix in SAFE_PREFIXES) for p in files
    )

    if lista_incompleta:
        labels_add.append("needs-human-gameplay")
        labels_add.append("needs-staging")
        labels_remove.append("safe-automerge")

    if touches_backend:
        labels_add.append("needs-human-backend")
        labels_remove.append("safe-automerge")
    if touches_gameplay:
        labels_add.append("needs-human-gameplay")
        labels_remove.append("safe-automerge")
    if touches_runtime_ui and changed_files > 0:
        labels_add.append("needs-staging")
    if touches_workflows:
        labels_remove.append("safe-automerge")
    if only_safe and changed_files <= 5 and additions + deletions <= 160:
        labels_add.append("safe-automerge")
    elif changed_files > 0:
        labels_remove.append("safe-automerge")

    branch_target = target_label(base_branch)
    labels_add.append(branch_target)
    labels_remove.extend({"target:main", "target:staging", "target:release"} - {branch_target})

    return {
        "labels_add": sorted(set(labels_add)),
        "labels_remove": sorted(set(labels_remove)),
    }


def selftest() -> int:
    """A régua se prova antes de medir o PR — igual dco_check e agente_check."""
    casos = [
        ("lista nula (PR grande) pede humano e tira automerge",
         {"files": None, "changedFiles": 812, "additions": 9000, "deletions": 400, "baseRefName": "main"},
         {"tem": ["needs-human-gameplay", "needs-staging"], "nao_tem": ["safe-automerge"]}),
        ("lista truncada conta como desconhecida",
         {"files": [{"path": "docs/a.md"}], "changedFiles": 300, "baseRefName": "main"},
         {"tem": ["needs-human-gameplay"], "nao_tem": ["safe-automerge"]}),
        ("só docs, pequeno, segue automergeável",
         {"files": [{"path": "docs/a.md"}], "changedFiles": 1, "additions": 3, "deletions": 1, "baseRefName": "main"},
         {"tem": ["safe-automerge"], "nao_tem": []}),
        ("gameplay continua pedindo humano",
         {"files": [{"path": "public/js/game.js"}], "changedFiles": 1, "baseRefName": "main"},
         {"tem": ["needs-human-gameplay"], "nao_tem": ["safe-automerge"]}),
    ]
    erros = 0
    for nome, payload, esperado in casos:
        saida = classifica(payload)
        ok = (all(r in saida["labels_add"] for r in esperado["tem"])
              and all(r not in saida["labels_add"] for r in esperado["nao_tem"]))
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {saida['labels_add']}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(classifica(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
