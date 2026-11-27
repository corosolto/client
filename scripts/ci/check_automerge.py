#!/usr/bin/env python3
"""Política de merge do csbrasil-bot: decide o `politica-merge` e o auto-merge nativo.

Duas saídas, de propósito separadas:

- `policy_state`/`policy_description`: o commit status `politica-merge` da head. O
  ruleset de `main` e `staging` exige esse contexto; `failure` ou `pending` segura
  QUALQUER merge que não seja de bypass actor (o dono), inclusive o auto-merge já armado.
- `auto_merge`: o bot pode armar o auto-merge nativo (merge commit). O GitHub mergeia
  quando os checks exigidos pelo ruleset ficarem verdes; o bot não espera check nenhum.

`eligible` continua sendo o critério antigo e completo (política + rollup inteiro verde +
estado CLEAN). Só ele autoriza merge DIRETO: quando o GitHub recusa armar porque o PR já
está limpo, ou enquanto os settings nativos não existem (ver `REQUIRED_CONTEXTS`).
"""
import json
import os
import sys

GOOD = {"SUCCESS", "SKIPPED", "NEUTRAL"}
POLICY_CONTEXT = "politica-merge"
# Workflows do próprio bot não são portão: o run que avalia aparece IN_PROGRESS no rollup
# da head, e o classify que o despacha ainda está fechando o job. Contá-los deixava o
# rollup eternamente "pendente" (por isso o `pronto-pra-merge` quase nunca acendia).
BOT_WORKFLOWS = {"csbrasil-bot-automerge", "csbrasil-bot-pr-classify"}
HUMAN_LABELS = {"needs-human-gameplay", "needs-human-backend"}
# Contextos que o ruleset da base precisa exigir para o auto-merge nativo valer o mesmo
# que o merge direto antigo (rollup inteiro verde). Sem todos eles o bot NÃO arma: cai no
# merge direto com o critério completo. É o que torna seguro este código entrar antes
# dos settings. Fonte única da lista proposta em docs/quality-gates.md.
REQUIRED_COMMON = (
    "build", "dco", "english", "hotfix-ancestry", POLICY_CONTEXT,
    "portao-decide", "portao", "smoke-decide", "smoke", "chat-desktop",
)
REQUIRED_CONTEXTS = {
    "main": REQUIRED_COMMON + ("versao-bumpada", "ratchet"),
    "staging": REQUIRED_COMMON + ("versao-bumpada", "ratchet"),
}


def _latest_runs(rollup: list[dict]) -> list[dict]:
    """Um item por check: o rollup traz TODOS os runs do SHA, inclusive o SKIPPED de um
    run de draft e o CANCELLED de run de bot superado. Vale o mais recente por
    workflow+nome; item sem nome (fixture, dado parcial) não é deduplicado."""
    latest: dict = {}
    for index, item in enumerate(rollup):
        if item.get("__typename") == "CheckRun":
            name = item.get("name")
            key = ("run", item.get("workflowName"), name) if name else ("idx", index)
            when = item.get("startedAt") or item.get("completedAt") or ""
        else:
            context = item.get("context")
            key = ("ctx", context) if context else ("idx", index)
            when = item.get("createdAt") or item.get("startedAt") or ""
        atual = latest.get(key)
        if atual is None or when >= atual[0]:
            latest[key] = (when, item)
    return [item for _, item in latest.values()]


def check_rollup_ok(rollup: list[dict]) -> bool:
    for item in _latest_runs(rollup):
        t = item.get("__typename")
        if t == "CheckRun":
            if item.get("workflowName") in BOT_WORKFLOWS:
                continue
            if item.get("conclusion") not in GOOD:
                return False
        elif t == "StatusContext":
            if item.get("context") == POLICY_CONTEXT:
                continue  # é o status que esta decisão vai publicar
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
    ELEGÍVEL. Lista incompleta é DESCONHECIMENTO, e desconhecimento aqui trava.

    `statusCheckRollup` nulo entra na mesma conta pelo mesmo motivo: rollup que não deu
    para ler não é rollup verde. `unresolvedReviewThreads` ausente idem: conversa que
    não deu para contar não está resolvida.
    """
    labels = {l["name"] for l in (pr.get("labels") or [])}
    arquivos_brutos = pr.get("files")
    rollup_bruto = pr.get("statusCheckRollup")
    files = [f.get("path", "") for f in arquivos_brutos] if arquivos_brutos else []
    changed_files = int(pr.get("changedFiles") if pr.get("changedFiles") is not None else len(files))
    lista_incompleta = arquivos_brutos is None or changed_files > len(files)
    threads = pr.get("unresolvedReviewThreads")
    threads_desconhecidas = type(threads) is not int or threads < 0
    touches_workflows = any(path.startswith(".github/workflows/") for path in files)
    touches_sensitive = any(path.startswith(("public/", "src/", "supabase/")) for path in files)
    human_labels = labels.intersection(HUMAN_LABELS)
    human_blocked = touches_sensitive or bool(human_labels) or "needs-hotfix-review" in labels
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
        for item in _latest_runs(rollup_bruto or [])
    )
    release_batch = (
        "release" in labels
        and not labels.intersection(HUMAN_LABELS | {"needs-hotfix-review"})
        and pr.get("baseRefName") == "main"
        and (not lista_incompleta or pr.get("full_diff_verified") is True)
        and pr.get("headRefName") == "staging"
        and (pr.get("headRepository") or {}).get("nameWithOwner") == pr.get("expected_repository")
        and bool(pr.get("expected_repository"))
    )
    eligible_safe = (
        not lista_incompleta
        and "safe-automerge" in labels
        and not touches_workflows
        and not human_blocked
        and (not hotfix_main or "release" in labels)
    )
    batch_review_ok = "estragacodigo-resolved" in labels and pr.get("reviewDecision") != "CHANGES_REQUESTED"

    # O status bloqueia merge de gente também, então só o que a política proíbe acende:
    # falha = pendência a consertar; pendente = falta decisão (dono/draft) ou dado.
    if estragacodigo_blocked:
        policy = ("failure", "estraga-codigo findings unresolved (needs-estragacodigo-resolution)")
    elif "needs-hotfix-review" in labels:
        policy = ("failure", "hotfix ancestry needs review (needs-hotfix-review)")
    elif lista_incompleta and pr.get("full_diff_verified") is not True:
        policy = ("pending", "policy inputs unknown (file list); re-run the bot")
    elif human_labels:
        policy = ("pending", f"owner decision required ({', '.join(sorted(human_labels))}); no auto-merge")
    elif touches_sensitive and not release_batch:
        # Mesmo sem label `needs-human-*` (classify atrasado, label removida à mão): diff em
        # public/, src/ ou supabase/ é decisão do dono. O lote oficial staging→main sempre
        # toca essas pastas, mas só recombina o que já passou pelo dono na staging.
        policy = ("pending", "owner decision required (diff touches public/, src/ or supabase/); no auto-merge")
    elif pr.get("isDraft", False):
        policy = ("pending", "draft pull request")
    else:
        policy = ("success", "no policy blocker")

    auto_merge = policy[0] == "success" and (
        (release_batch and batch_review_ok)
        or (eligible_safe and pr.get("reviewDecision") == "APPROVED")
    )
    # Merge direto exige cada contexto do ruleset-alvo PRESENTE e verde, não só "nenhum
    # vermelho": check exigido que nunca apareceu não é check verde. `politica-merge` fica
    # fora porque é o status que esta decisão publica. Base fora do mapa nunca mescla direto.
    verdes = {
        item.get("name") if item.get("__typename") == "CheckRun" else item.get("context")
        for item in _latest_runs(rollup_bruto or [])
        if (item.get("__typename") == "CheckRun" and item.get("conclusion") in GOOD)
        or (item.get("__typename") == "StatusContext" and item.get("state") == "SUCCESS")
    }
    exigidos = [c for c in REQUIRED_CONTEXTS.get(pr.get("baseRefName"), ()) if c != POLICY_CONTEXT]
    required_green = bool(exigidos) and all(contexto in verdes for contexto in exigidos)
    # Conversa aberta NÃO entra no status: resolver conversa não dispara Actions, e um
    # `failure` por conversa ficaria preso depois da resolução. Quem segura conversa aberta
    # é a regra nativa `required_review_thread_resolution` (o bot só arma quando a base a
    # exige, ver automerge_merge.missing_contexts), que o GitHub reavalia sozinho. O merge
    # DIRETO, que não passa pela regra nativa, exige zero conversa aberta e contagem lida.
    eligible = (
        auto_merge
        and pr.get("mergeStateStatus") in {"CLEAN", "HAS_HOOKS"}
        and checks_green
        and required_green
        and not threads_desconhecidas and threads == 0
        and (not hotfix_main or release_batch or hotfix_verified)
    )
    if auto_merge:
        policy = ("success", "no policy blocker; auto-merge armed")
    return {
        "eligible": eligible,
        "auto_merge": auto_merge,
        "policy_state": policy[0],
        "policy_description": policy[1],
        "merge_kind": "release-batch" if release_batch else "safe",
        "estragacodigo_blocked": estragacodigo_blocked,
        "touches_workflows": touches_workflows,
        "human_blocked": human_blocked,
        "lista_incompleta": lista_incompleta,
    }


# O que muda sem mudar a política: checks terminando e o mergeable recalculado. O resto
# (head, base, labels, arquivos, revisão, conversas, draft) mudou = decisão velha.
VOLATILE = {"statusCheckRollup", "mergeStateStatus"}
POLICY_KEYS = ("auto_merge", "policy_state", "policy_description", "merge_kind",
               "estragacodigo_blocked", "touches_workflows", "human_blocked", "lista_incompleta")


def revalidate_decision(evaluated_pr, evaluated_result, current_pr):
    """Reject stale policy even when a mutation leaves the decision unchanged."""
    def policy_inputs(pr):
        return {key: value for key, value in pr.items() if key not in VOLATILE}
    if policy_inputs(current_pr) != policy_inputs(evaluated_pr):
        raise ValueError("automerge policy inputs changed after evaluation; aborting")
    current_result = decide(current_pr)
    if any(current_result[key] != evaluated_result.get(key) for key in POLICY_KEYS):
        raise ValueError("automerge policy decision changed after evaluation; aborting")
    return current_result


def selftest() -> int:
    """Fixtures do que NUNCA pode virar merge automático.

    Este script decide merge sem humano no caminho. Nasceu sem teste, e um `not`
    trocado aqui mescla PR vermelho na main - o defeito mais caro que este
    arquivo consegue produzir. Cada caso abaixo é uma condição de bloqueio.
    """
    verdes = [
        {"__typename": "CheckRun", "workflowName": "gates", "name": contexto, "conclusion": "SUCCESS"}
        for contexto in REQUIRED_CONTEXTS["staging"] if contexto != POLICY_CONTEXT
    ]
    base = {
        "isDraft": False,
        "labels": [{"name": "safe-automerge"}],
        "files": [{"path": "docs/a.md"}],
        "reviewDecision": "APPROVED",
        "mergeStateStatus": "CLEAN",
        "baseRefName": "staging",
        "statusCheckRollup": verdes,
        "unresolvedReviewThreads": 0,
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
                                {"__typename": "CheckRun", "conclusion": "NEUTRAL"}] + verdes), True),
        ("check exigido ausente não mescla (ausente não é verde)",
         com(statusCheckRollup=[item for item in verdes if item["name"] != "portao"]), False),
        ("base fora do ruleset-alvo não mescla direto", com(baseRefName="feature/x"), False),
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
             baseRefName="main",
             statusCheckRollup=[item for item in verdes if item["name"] != "hotfix-ancestry"]), False),
        ("hotfix na main com ancestry verde mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}],
             baseRefName="main", statusCheckRollup=verdes), True),
        ("hotfix na main com ancestry vermelha não mescla",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}],
             baseRefName="main",
             statusCheckRollup=[{"__typename": "CheckRun", "name": "hotfix-ancestry", "conclusion": "FAILURE"}]), False),
        ("hotfix na staging não exige ancestry main-only para integrar",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release-hotfix"}],
             baseRefName="staging"), True),
        ("conversa de revisão aberta não mescla", com(unresolvedReviewThreads=1), False),
        ("conversas não contadas não mescla", com(unresolvedReviewThreads=None), False),
        ("run velho vermelho superado por run novo verde mescla",
         com(statusCheckRollup=[
             {"__typename": "CheckRun", "workflowName": "smoke-web", "name": "smoke",
              "conclusion": "FAILURE", "startedAt": "2026-11-17T01:00:00Z"},
             {"__typename": "CheckRun", "workflowName": "smoke-web", "name": "smoke",
              "conclusion": "SUCCESS", "startedAt": "2026-11-17T02:00:00Z"}] + verdes), True),
        ("run novo vermelho vence run velho verde",
         com(statusCheckRollup=[
             {"__typename": "CheckRun", "workflowName": "smoke-web", "name": "smoke",
              "conclusion": "SUCCESS", "startedAt": "2026-11-17T01:00:00Z"},
             {"__typename": "CheckRun", "workflowName": "smoke-web", "name": "smoke",
              "conclusion": "FAILURE", "startedAt": "2026-11-17T02:00:00Z"}] + verdes), False),
        ("run do próprio bot em andamento não é portão",
         com(statusCheckRollup=[
             {"__typename": "CheckRun", "workflowName": "csbrasil-bot-automerge", "name": "automerge",
              "conclusion": None},
             {"__typename": "CheckRun", "workflowName": "csbrasil-bot-pr-classify", "name": "classify",
              "conclusion": "CANCELLED"}] + verdes), True),
        ("status antigo do politica-merge não trava a reavaliação",
         com(statusCheckRollup=[
             {"__typename": "StatusContext", "context": "politica-merge", "state": "PENDING"}] + verdes), True),
        ("check de terceiro com mesmo nome de job do bot não é ignorado",
         com(statusCheckRollup=[
             {"__typename": "CheckRun", "workflowName": "ci", "name": "automerge", "conclusion": "FAILURE"}]), False),
    ]
    erros = 0
    for nome, pr, esperado in casos:
        obtido = decide(pr)["eligible"]
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: eligible={obtido} (esperado {esperado})")

    lote = dict(labels=[{"name": "release"}, {"name": "estragacodigo-resolved"}],
                baseRefName="main", headRefName="staging",
                headRepository={"nameWithOwner": "corosolto/client"}, expected_repository="corosolto/client")
    # (nome, pr, auto_merge esperado, policy_state esperado)
    politica = [
        ("caminho feliz arma e fica verde", base, True, "success"),
        ("check ainda rodando não impede armar: o nativo espera",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": None}], mergeStateStatus="BLOCKED"),
         True, "success"),
        ("PR comum sem safe-automerge: verde para merge humano, sem armar",
         com(labels=[]), False, "success"),
        ("workflow: verde para merge humano, sem armar",
         com(files=[{"path": ".github/workflows/ci.yml"}]), False, "success"),
        ("estraga-codigo pendente: vermelho",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-estragacodigo-resolution"}]), False, "failure"),
        ("needs-hotfix-review: vermelho",
         com(labels=[{"name": "needs-hotfix-review"}]), False, "failure"),
        ("conversa aberta não pinta o status: a regra nativa segura e reavalia sozinha",
         com(unresolvedReviewThreads=2), True, "success"),
        ("conversas não contadas não travam o status (só o merge direto)",
         com(unresolvedReviewThreads=None), True, "success"),
        ("gameplay: pendente, decisão do dono",
         com(labels=[{"name": "needs-human-gameplay"}]), False, "pending"),
        ("draft: pendente", com(isDraft=True), False, "pending"),
        ("PR sensível sem label needs-human-*: pendente (decisão do dono)",
         com(labels=[], files=[{"path": "public/js/game.js"}]), False, "pending"),
        ("PR sensível com safe-automerge e sem label humana: pendente, não arma",
         com(files=[{"path": "src/pages/api/ranking.ts"}]), False, "pending"),
        ("lote oficial que toca public/src continua verde e arma",
         com(**dict(lote, files=[{"path": "public/js/game.js"}, {"path": "src/pages/index.astro"}],
                    changedFiles=2)), True, "success"),
        ("lista incompleta sem prova de diff: pendente",
         com(files=None, changedFiles=1720), False, "pending"),
        ("lote oficial resolvido arma", com(**lote), True, "success"),
        ("lote oficial com mudanças pedidas não arma",
         com(**lote, reviewDecision="CHANGES_REQUESTED"), False, "success"),
        ("hotfix na main com release arma; hotfix-ancestry exigido pelo ruleset segura",
         com(labels=[{"name": "safe-automerge"}, {"name": "hotfix"}, {"name": "release"}], baseRefName="main"),
         True, "success"),
    ]
    for nome, pr, arma, estado in politica:
        resultado = decide(pr)
        ok = (resultado["auto_merge"] == arma and resultado["policy_state"] == estado
              and len(resultado["policy_description"]) <= 140)
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: auto_merge={resultado['auto_merge']} "
              f"politica={resultado['policy_state']} (esperado {arma}/{estado})")
    for nome, pr, esperado in casos:
        resultado = decide(pr)
        if resultado["eligible"] and not resultado["auto_merge"]:
            erros += 1
            print(f"  FALHOU {nome}: merge direto elegível sem a política permitir armar")
        if resultado["auto_merge"] and resultado["policy_state"] != "success":
            erros += 1
            print(f"  FALHOU {nome}: auto-merge com politica-merge fora do verde")
    if any(POLICY_CONTEXT not in contextos for contextos in REQUIRED_CONTEXTS.values()):
        erros += 1
        print("  FALHOU um ruleset proposto não exige politica-merge")

    evaluated_result = decide(base)
    revalidation_cases = [
        ("revalidação inalterada preserva elegibilidade", dict(base), True),
        ("revalidação rejeita label posterior", com(labels=[
            {"name": "safe-automerge"}, {"name": "target:staging"},
        ]), False),
        ("revalidação rejeita review posterior", com(reviewDecision="CHANGES_REQUESTED"), False),
        ("check terminando depois não invalida a política", com(statusCheckRollup=[
            {"__typename": "CheckRun", "conclusion": "FAILURE"},
        ]), True),
        ("revalidação rejeita conversa aberta depois", com(unresolvedReviewThreads=1), False),
        ("revalidação rejeita head nova", com(headRefOid="f" * 40), False),
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
