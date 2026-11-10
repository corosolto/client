#!/usr/bin/env python3
"""Fail pull requests whose public title or description is not English."""
import json
import re
import sys

try:
    from langdetect import DetectorFactory, LangDetectException, detect
except ModuleNotFoundError:
    DetectorFactory = None
    LangDetectException = Exception
    detect = None

if DetectorFactory is not None:
    DetectorFactory.seed = 0

STRONG_PORTUGUESE = {
    "nao", "não", "para", "porque", "quando", "entao", "então", "esta", "está",
    "isso", "esse", "essa", "deste", "desta", "sem", "atraves", "através",
    "corrigir", "correcao", "correção", "corrige", "consertar", "conserta", "adicionar", "adiciona", "remover", "atualizar",
    "atualiza", "melhorar", "melhora", "implementar", "implementa", "criar", "cria", "alterar",
    "altera", "ajustar", "ajusta", "ajuste", "suporte", "reconexao", "reconexão", "comportamento",
    "servidor", "cliente", "dados", "novo", "nova", "problema", "quebra", "quebrado",
    "erro", "falha", "mudanca", "mudança", "descricao", "descrição", "resumo", "validacao", "validação", "teste", "testes",
    "feito", "agora", "ainda", "usuario", "usuário", "jogador", "jogo", "mapa",
    "personagem", "producao", "produção",
}


def detect_language_error(combined: str) -> str | None:
    if detect is None:
        return "langdetect is required for positive English detection; install langdetect==1.0.9"
    try:
        detected = detect(combined)
    except LangDetectException:
        return "title and description language could not be determined; write them in English"
    if detected != "en":
        return f"title and description must be English (detected language: {detected})"
    return None


def public_text(markdown: str) -> str:
    text = re.sub(r"```.*?```", " ", markdown or "", flags=re.DOTALL)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/\S*)?", " ", text)
    return text.lower()


def portuguese_markers(markdown: str) -> list[str]:
    words = set(re.findall(r"[a-zà-ÿ]+", public_text(markdown)))
    return sorted(words & STRONG_PORTUGUESE)


def validate(pr: dict) -> list[str]:
    title = pr.get("title") or ""
    body = pr.get("body") or ""
    errors = []
    if not title.strip():
        errors.append("title must not be empty")
    elif markers := portuguese_markers(title):
        errors.append(f"title must be English (Portuguese markers: {', '.join(markers)})")
    if not public_text(body).strip():
        errors.append("description must not be empty")
    elif markers := portuguese_markers(body):
        errors.append(f"description must be English (Portuguese markers: {', '.join(markers)})")
    if errors:
        return errors

    combined = public_text(f"{title}\n{body}")
    if len(re.findall(r"[a-zà-ÿ]", combined)) < 12:
        return ["title and description must contain enough English prose for language detection"]
    error = detect_language_error(combined)
    return [error] if error else []


def selftest() -> int:
    english = {
        "title": "fix: repair lobby reconnect",
        "body": "## Summary\n\nRepair reconnect handling for Flávio's profile.\n\n"
                "## Validation\n\n`npm run check:fast` passed.\n\n```text\nerro de exemplo\n```",
    }
    cases = [
        ("English title and body pass", english, 0),
        ("Portuguese title fails", {**english, "title": "fix: correção do lobby"}, 1),
        ("Unaccented Portuguese title fails", {**english, "title": "fix: corrige reconexao"}, 1),
        ("Portuguese feature wording fails", {**english, "title": "Implementa suporte inicial"}, 1),
        ("Portuguese body fails", {**english, "body": "Corrige o erro quando o jogador entra."}, 1),
        ("empty body fails", {**english, "body": ""}, 1),
        ("code blocks stay out of language detection", english, 0),
        ("accented proper names do not imply Portuguese", english, 0),
        ("English articles do not trigger weak markers", {**english, "body": "Add a guard for a null player."}, 0),
        ("English a and no combination passes", {**english, "body": "Add a guard when no player exists."}, 0),
        ("English a and as combination passes", {**english, "body": "Add a guard as a fallback for every player."}, 0),
        ("Scheme-less repository URL passes", {**english, "body": "See github.com/corosolto/client for the build fix."}, 0),
        ("Concise English with an accented name passes", {"title": "Fix typo", "body": "Correct spelling in Flávio."}, 0),
        ("German is not accepted as English", {"title": "Behebt die Wiederverbindung", "body": "Diese Änderung stellt die Verbindung wieder her."}, 1),
        ("two Portuguese function words fail", {**english, "body": "Update o comportamento no lobby."}, 1),
    ]
    failures = 0
    for name, pr, expected_failures in cases:
        errors = validate(pr)
        ok = (len(errors) > 0) == (expected_failures > 0)
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {name}: {errors}")
    global detect
    installed = detect
    try:
        detect = None
        missing_error = detect_language_error("fix: repair the player reconnect")
        ok = missing_error is not None and "langdetect is required" in missing_error
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} missing detector fails closed: {missing_error}")
    finally:
        detect = installed
    return 0 if not failures else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    errors = validate(json.load(sys.stdin))
    for error in errors:
        print(f"::error::{error}")
    if errors:
        print("Rewrite the pull request title and description in English.")
        return 1
    print("Pull request title and description are English.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
