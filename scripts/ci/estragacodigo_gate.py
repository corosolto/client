#!/usr/bin/env python3
import json
import sys


def decide(payload: dict) -> dict:
    reviews = payload.get("reviews") or []
    status_rollup = payload.get("statusCheckRollup") or []
    head_oid = payload.get("headRefOid")
    review_requests = payload.get("reviewRequests") or []
    new_estragacodigo_review = bool(payload.get("new_estragacodigo_review"))

    has_estragacodigo_review = any(
        ((review.get("author") or {}).get("login") or "").lower() == "estraga-codigo"
        and (review.get("state") or "").upper() != "DISMISSED"
        for review in reviews
    )
    has_estragacodigo_check = any(
        item.get("__typename") == "CheckRun"
        and (item.get("name") or "").lower() in {
            "estraga-codigo",
            "estraga codigo review",
            "estraga código review",
        }
        for item in status_rollup
    )
    reviewer_requested = any(
        ((request.get("login") or "") if isinstance(request, dict) else "").lower()
        == "estraga-codigo"
        for request in review_requests
    )
    reviewed_head = bool(head_oid) and any(
        ((review.get("author") or {}).get("login") or "").lower() == "estraga-codigo"
        and ((review.get("commit") or {}).get("oid") or "") == head_oid
        and (review.get("state") or "").upper() != "DISMISSED"
        for review in reviews
    )
    current_review_times = [
        review.get("submittedAt") or ""
        for review in reviews
        if ((review.get("author") or {}).get("login") or "").lower() == "estraga-codigo"
        and ((review.get("commit") or {}).get("oid") or "") == head_oid
        and (review.get("state") or "").upper() != "DISMISSED"
    ]
    latest_current_review_at = max(current_review_times, default="")
    resolved_at = str(payload.get("estragacodigo_resolved_at") or "")
    current_resolution = bool(
        latest_current_review_at and resolved_at
        and resolved_at >= latest_current_review_at
    )
    request_review = bool(head_oid) and not reviewer_requested and not reviewed_head


    precisa = (
        reviewer_requested
        or request_review
        or has_estragacodigo_review
        or has_estragacodigo_check
    )
    return {
        "needs_resolution": precisa,
        "labels_add": ["needs-estragacodigo-resolution"] if precisa else [],
        "labels_remove": ["estragacodigo-resolved"]
        if reviewer_requested or request_review
        or (new_estragacodigo_review and not current_resolution)
        or (reviewed_head and not current_resolution) else [],
        "request_review": request_review,
    }


def selftest() -> int:
    """O revisor real publica `reviews`; comentários comuns da mesma conta não contam.

    `estraga-codigo` também opera o plantão da produção em comentários de issue. Casar
    apenas pelo autor em `comments` travaria PR sem revisão. O login e a coleção são
    parte do contrato medido na revisão histórica da PR #373.
    """
    casos = [
        ("review do estragacodigo exige resolução",
         {"reviews": [{"author": {"login": "estraga-codigo"}, "state": "CHANGES_REQUESTED"}]}, True),
        ("review limpo ainda exige confirmação do mantenedor",
         {"reviews": [{"author": {"login": "estraga-codigo"}, "state": "COMMENTED"}]}, True),
        ("check futuro do estragacodigo exige resolução",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "Estraga Código Review"}]}, True),
        ("comentário de plantão não finge ser review",
         {"comments": [{"author": {"login": "estraga-codigo"}, "body": "check vermelho parado"}]}, False),
        ("coderabbit ausente não confunde",
         {"reviews": [{"author": {"login": "coderabbitai[bot]"}, "state": "CHANGES_REQUESTED"}]}, False),
        ("PR sem revisor não exige nada", {"reviews": [], "statusCheckRollup": []}, False),
        ("outro check não confunde",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "build"}]}, False),
        ("author nulo não explode", {"reviews": [{"author": None, "state": "COMMENTED"}]}, False),
        ("review descartado não vira pendência histórica",
         {"reviews": [{"author": {"login": "estraga-codigo"}, "state": "DISMISSED"}]}, False),
        ("payload vazio não explode", {}, False),
    ]
    pedidos = [
        ("PR novo pede o reviewer",
         {"headRefOid": "abc", "reviews": [], "reviewRequests": []}, True),
        ("pedido pendente não duplica",
         {"headRefOid": "abc", "reviewRequests": [{"login": "estraga-codigo"}]}, False),
        ("review do commit atual encerra o pedido",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"}}
         ]}, False),
        ("novo commit pede review de novo",
         {"headRefOid": "novo", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "antigo"}}
         ]}, True),
        ("review descartado no commit atual pede de novo",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"},
              "state": "DISMISSED"}
         ]}, True),
        ("payload sem head não dispara pedido", {}, False),
    ]
    transicoes = [
        ("pedido inicial fecha janela do automerge",
         {"headRefOid": "abc", "reviews": [], "reviewRequests": []},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": ["estragacodigo-resolved"]}),
        ("pedido pendente mantém o automerge fechado",
         {"headRefOid": "abc", "reviews": [],
          "reviewRequests": [{"login": "estraga-codigo"}]},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": ["estragacodigo-resolved"]}),
        ("review atual preserva resolução confirmada depois dela",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"},
              "state": "COMMENTED", "submittedAt": "2026-10-31T08:00:00Z"}
         ], "estragacodigo_resolved_at": "2026-10-31T08:05:00Z"},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": []}),
        ("resolução posterior vence corrida do evento de review",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"},
              "state": "COMMENTED", "submittedAt": "2026-10-31T08:00:00Z"}
         ], "estragacodigo_resolved_at": "2026-10-31T08:05:00Z",
          "new_estragacodigo_review": True},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": []}),
        ("nova review atual invalida resolução anterior",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"},
              "state": "COMMENTED"}
         ], "new_estragacodigo_review": True},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": ["estragacodigo-resolved"]}),
        ("sweep invalida resolução anterior à review atual",
         {"headRefOid": "abc", "reviews": [
             {"author": {"login": "estraga-codigo"}, "commit": {"oid": "abc"},
              "state": "COMMENTED", "submittedAt": "2026-10-31T08:05:00Z"}
         ], "estragacodigo_resolved_at": "2026-10-31T08:00:00Z"},
         {"needs_resolution": True,
          "labels_add": ["needs-estragacodigo-resolution"],
          "labels_remove": ["estragacodigo-resolved"]}),
    ]
    erros = 0
    for nome, payload, esperado in casos:
        d = decide(payload)
        labels_ok = d["labels_add"] == (["needs-estragacodigo-resolution"] if esperado else [])
        remove_ok = d["labels_remove"] == []
        ok = d["needs_resolution"] == esperado and labels_ok and remove_ok
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {d}")
    for nome, payload, esperado in pedidos:
        d = decide(payload)
        ok = d.get("request_review") == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {d}")
    for nome, payload, esperado in transicoes:
        d = decide(payload)
        ok = all(d.get(chave) == valor for chave, valor in esperado.items())
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {d}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(decide(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
