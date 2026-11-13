#!/usr/bin/env python3
import json
import os
import sys

GOOD = {"SUCCESS", "SKIPPED", "NEUTRAL"}


def check_rollup_ok(rollup: list[dict]) -> bool:
    for item in rollup:
        t = item.get("__typename")
        if t == "CheckRun":
            if item.get("conclusion") not in GOOD:
                return False
        elif t == "StatusContext":
            if item.get("state") not in {"SUCCESS"}:
                return False
    return True


def decide(pr: dict) -> dict:
    """PR grande demais devolve `files: null` — não uma lista vazia.

    A leitura anterior (`pr.get("files", [])`) só cobria a CHAVE AUSENTE: com a chave
    presente e nula o `default` não vale e o `decide` morria de TypeError, que é check
    vermelho por defeito da régua, não por defeito do PR (medido no #623, 1720
    arquivos). Mesmo defeito e mesmo conserto do pr_classify.py (#624).

    E o remendo óbvio — `or []` e segue — é pior que o erro: sem a lista, o
    `touches_workflows` nunca acende e um PR que mexe em `.github/workflows/` sai
    ELEGÍVEL. Lista incompleta é DESCONHECIMENTO, e desconhecimento aqui trava: sem
    saber o que o diff encosta, nada de `pronto-pra-merge`. Este bot só ACRESCENTA
    etiqueta, então travar de graça custa uma etiqueta; liberar de graça custa um PR
    vermelho com o carimbo de pronto.

    `statusCheckRollup` nulo entra na mesma conta pelo mesmo motivo: rollup que não deu
    para ler não é rollup verde.
    """
    labels = {l["name"] for l in (pr.get("labels") or [])}
    arquivos_brutos = pr.get("files")
    rollup_bruto = pr.get("statusCheckRollup")
    files = [f.get("path", "") for f in arquivos_brutos] if arquivos_brutos else []
    changed_files = int(pr.get("changedFiles") if pr.get("changedFiles") is not None else len(files))
    lista_incompleta = arquivos_brutos is None or changed_files > len(files)
    desconhecido = lista_incompleta or rollup_bruto is None
    touches_workflows = any(path.startswith(".github/workflows/") for path in files)
    touches_sensitive = any(path.startswith(("public/", "src/", "supabase/")) for path in files)
    human_blocked = touches_sensitive or bool(
        labels.intersection({"needs-human-gameplay", "needs-human-backend", "needs-hotfix-review"})
    )
    estragacodigo_blocked = (
        "needs-estragacodigo-resolution" in labels
        and "estragacodigo-resolved" not in labels
    )
    checks_green = bool(rollup_bruto) and check_rollup_ok(rollup_bruto)
    hotfix_main = "hotfix" in labels and pr.get("baseRefName") == "main"
    hotfix_verified = any(
        item.get("__typename") == "CheckRun"
        and item.get("name") == "hotfix-ancestry"
        and item.get("conclusion") == "SUCCESS"
        for item in rollup_bruto or []
    )
    common = (
        not pr.get("isDraft", False)
        and not estragacodigo_blocked
        and pr.get("mergeStateStatus") in {"CLEAN", "HAS_HOOKS"}
        and checks_green
    )
    release_batch = (
        "release" in labels
        and not labels.intersection({"needs-human-gameplay", "needs-human-backend", "needs-hotfix-review"})
        and pr.get("baseRefName") == "main"
        and (not lista_incompleta or pr.get("full_diff_verified") is True)
        and pr.get("headRefName") == "staging"
        and (pr.get("headRepository") or {}).get("nameWithOwner") == pr.get("expected_repository")
        and bool(pr.get("expected_repository"))
    )
    eligible_safe = (
        not desconhecido
        and "safe-automerge" in labels
        and not touches_workflows
        and not human_blocked
        and (not hotfix_main or ("release" in labels and hotfix_verified))
    )
    batch_review_ok = "estragacodigo-resolved" in labels and pr.get("reviewDecision") != "CHANGES_REQUESTED"
    eligible = common and (
        (release_batch and batch_review_ok)
        or (eligible_safe and pr.get("reviewDecision") == "APPROVED")
    )
    return {
        "eligible": eligible,
        "merge_kind": "release-batch" if release_batch else "safe",
        "estragacodigo_blocked": estragacodigo_blocked,
        "touches_workflows": touches_workflows,
        "human_blocked": human_blocked,
        "lista_incompleta": lista_incompleta,
    }


def revalidate_decision(evaluated_pr, evaluated_result, current_pr):
    """Reject stale eligibility even when a mutation leaves the decision unchanged."""
    if current_pr != evaluated_pr:
        raise ValueError("automerge eligibility inputs changed after evaluation; aborting merge")
    current_result = decide(current_pr)
    if current_result != evaluated_result:
        raise ValueError("automerge eligibility decision changed after evaluation; aborting merge")
    return current_result


def selftest() -> int:
    """Fixtures do que NUNCA pode virar merge automático.

    Este script decide merge sem humano no caminho. Nasceu sem teste, e um `not`
    trocado aqui mescla PR vermelho na main - o defeito mais caro que este
    arquivo consegue produzir. Cada caso abaixo é uma condição de bloqueio.
    """
    base = {
        "isDraft": False,
        "labels": [{"name": "safe-automerge"}],
        "files": [{"path": "docs/a.md"}],
        "reviewDecision": "APPROVED",
        "mergeStateStatus": "CLEAN",
        "statusCheckRollup": [{"__typename": "CheckRun", "conclusion": "SUCCESS"}],
    }

    def com(**kw):
        pr = dict(base)
        pr.update(kw)
        return pr

    casos = [
        ("caminho feliz mescla", base, True),
        ("draft não mescla", com(isDraft=True), False),
        ("sem o label safe-automerge não mescla", com(labels=[]), False),
        ("PR que toca workflow não mescla", com(files=[{"path": ".github/workflows/ci.yml"}]), False),
        ("estragacodigo pendente bloqueia",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-estragacodigo-resolution"}]), False),
        ("estragacodigo resolvido libera",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-estragacodigo-resolution"},
                     {"name": "estragacodigo-resolved"}]), True),
        ("label sem regra de revisão não bloqueia",
         com(labels=[{"name": "safe-automerge"}, {"name": "legacy-review-note"}]), True),
        ("mudança pedida não mescla", com(reviewDecision="CHANGES_REQUESTED"), False),
        ("revisão obrigatória pendente não mescla", com(reviewDecision="REVIEW_REQUIRED"), False),
        ("decisão de revisão ausente não mescla", com(reviewDecision=None), False),
        ("conflito não mescla", com(mergeStateStatus="DIRTY"), False),
        ("check vermelho não mescla",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": "FAILURE"}]), False),
        ("check pendente não mescla",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": None}]), False),
        ("status legado vermelho não mescla",
         com(statusCheckRollup=[{"__typename": "StatusContext", "state": "FAILURE"}]), False),
        ("skipped e neutral não bloqueiam",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": "SKIPPED"},
                                {"__typename": "CheckRun", "conclusion": "NEUTRAL"}]), True),
        ("lista de arquivos nula (PR grande) não mescla",
         com(files=None, changedFiles=1720), False),
        ("lista truncada conta como desconhecida",
         com(files=[{"path": "docs/a.md"}], changedFiles=300), False),
        ("lista completa e declarada mescla",
         com(files=[{"path": "docs/a.md"}], changedFiles=1), True),
        ("rollup nulo não mescla", com(statusCheckRollup=None), False),
        ("rollup vazio não prova build verde", com(statusCheckRollup=[]), False),
        ("lote oficial verde mescla mesmo com superfícies sensíveis já integradas",
         com(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}], files=[{"path": ".github/workflows/ci.yml"}],
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), True),
        ("lote oficial sem resolução de revisão não mescla nem com aprovação",
         com(labels=[{"name": "release"}], baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote com lista incompleta e diff Git verificado mescla",
         com(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}],
             files=None, changedFiles=1720, full_diff_verified=True,
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), True),
        ("lote com lista incompleta e sem prova de diff não mescla",
         com(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}],
             files=None, changedFiles=1720,
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote resolvido mescla sem reviewDecision formal",
         com(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}],
             reviewDecision=None, baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), True),
        ("lote com mudanças pedidas não mescla nem com label de resolução",
         com(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}],
             reviewDecision="CHANGES_REQUESTED", baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote de fork não mescla",
         com(labels=[{"name": "release"}], baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "fork/client"}, expected_repository="corosolto/client"), False),
        ("staging de outro repo do mesmo dono não mescla",
         com(labels=[{"name": "release"}], baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/other"}, expected_repository="corosolto/client"), False),
        ("branch comum com label release não vira lote",
         com(labels=[{"name": "release"}], baseRefName="main", headRefName="feature",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote com check vermelho não mescla",
         com(labels=[{"name": "release"}], baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client",
             statusCheckRollup=[{"__typename": "CheckRun", "conclusion": "FAILURE"}]), False),
        ("lote com revisão pendente não mescla",
         com(labels=[{"name": "release"}, {"name": "needs-estragacodigo-resolution"}],
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote com bloqueio de hotfix não mescla",
         com(labels=[{"name": "release"}, {"name": "needs-hotfix-review"}],
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote com bloqueio humano de gameplay não mescla",
         com(labels=[{"name": "release"}, {"name": "needs-human-gameplay"}],
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("lote com bloqueio humano de backend não mescla",
         com(labels=[{"name": "release"}, {"name": "needs-human-backend"}],
             baseRefName="main", headRefName="staging",
             headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client"), False),
        ("label manual não libera gameplay",
         com(files=[{"path": "public/js/game.js"}]), False),
        ("label manual não libera backend",
         com(files=[{"path": "src/pages/api/ranking.ts"}]), False),
        ("label humana pendente bloqueia mesmo em docs",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-human-gameplay"}]), False),
        ("hotfix com ancestry incerta não mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-hotfix-review"}]), False),
        ("hotfix na main sem check de ancestry não mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}],
             baseRefName="main"), False),
        ("hotfix na main com ancestry verde mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}],
             baseRefName="main",
             statusCheckRollup=[{"__typename": "CheckRun", "name": "pr-fast", "conclusion": "SUCCESS"},
                                {"__typename": "CheckRun", "name": "hotfix-ancestry", "conclusion": "SUCCESS"}]), True),
        ("hotfix na main com ancestry vermelha não mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}],
             baseRefName="main",
             statusCheckRollup=[{"__typename": "CheckRun", "name": "hotfix-ancestry", "conclusion": "FAILURE"}]), False),
        ("hotfix na staging não exige ancestry main-only para integrar",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release-hotfix"}],
             baseRefName="staging"), True),
    ]
    erros = 0
    for nome, pr, esperado in casos:
        obtido = decide(pr)["eligible"]
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: eligible={obtido} (esperado {esperado})")

    evaluated_result = decide(base)
    revalidation_cases = [
        ("revalidação inalterada preserva elegibilidade", dict(base), True),
        ("revalidação rejeita label posterior", com(labels=[
            {"name": "safe-automerge"}, {"name": "target:staging"},
        ]), False),
        ("revalidação rejeita review posterior", com(reviewDecision="CHANGES_REQUESTED"), False),
        ("revalidação rejeita check posterior", com(statusCheckRollup=[
            {"__typename": "CheckRun", "conclusion": "FAILURE"},
        ]), False),
    ]
    for nome, current_pr, deve_aceitar in revalidation_cases:
        try:
            revalidate_decision(base, evaluated_result, current_pr)
        except ValueError:
            aceitou = False
        else:
            aceitou = True
        ok = aceitou == deve_aceitar
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    payload['expected_repository'] = os.environ.get('GITHUB_REPOSITORY', '')
    print(json.dumps(decide(payload)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
