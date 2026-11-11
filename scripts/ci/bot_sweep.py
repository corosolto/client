#!/usr/bin/env python3
"""Persistent, change-aware state for the two scheduled bot sweeps."""
import base64
import binascii
import hashlib
import json
import re
import sys

PREFIX = "<!-- csbrasil-bot-sweep:"
SUFFIX = " -->"
BOT_AUTHOR = "csbrasil-bot"
BOT_AUTHORS = {BOT_AUTHOR, "github-actions[bot]"}
STATE_RE = re.compile(r"<!-- csbrasil-bot-sweep:(classify|automerge):([A-Za-z0-9_-]+) -->")


def _digest(value):
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()
    return hashlib.sha256(encoded).hexdigest()


def fingerprint(pr):
    """Base, head, labels, rollup, and reviews are the debounce keys.

    Review state is included because fork review events cannot authenticate the
    classifier. External DCO/status changes are already represented by the rollup.
    Base advancement changes the diff and labels change classification or eligibility,
    even when the head and check rollup stay fixed.
    """
    return {
        "version": 1,
        "title_digest": _digest(pr.get("title")),
        "body_digest": _digest(pr.get("body")),
        "base_oid": pr.get("baseRefOid"),
        "head_oid": pr.get("headRefOid"),
        "label_digest": _digest(sorted(
            label.get("name") for label in pr.get("labels") or []
        )),
        "rollup_digest": _digest(pr.get("statusCheckRollup")),
        "review_digest": _digest({
            "latestReviews": pr.get("latestReviews"),
            "reviewRequests": pr.get("reviewRequests"),
            "reviewDecision": pr.get("reviewDecision"),
        }),
    }


def encode_state(kind, pr):
    if kind not in {"classify", "automerge"}:
        raise ValueError("unknown sweep kind")
    raw = json.dumps(fingerprint(pr), sort_keys=True, separators=(",", ":")).encode()
    encoded = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    return f"{PREFIX}{kind}:{encoded}{SUFFIX}"


def decode_state(marker, kind):
    match = STATE_RE.fullmatch(marker.strip())
    if not match or match.group(1) != kind:
        raise ValueError("state marker kind does not match")
    encoded = match.group(2)
    try:
        raw = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        state = json.loads(raw)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError, binascii.Error) as error:
        raise ValueError("malformed sweep state") from error
    if not isinstance(state, dict) or state.get("version") != 1:
        raise ValueError("unsupported sweep state")
    if not re.fullmatch(r"[0-9a-f]{40}", state.get("head_oid") or ""):
        raise ValueError("sweep state has no canonical evaluated head")
    if not re.fullmatch(r"[0-9a-f]{40}", state.get("base_oid") or ""):
        raise ValueError("sweep state has no canonical evaluated base")
    if any(not re.fullmatch(r"[0-9a-f]{64}", state.get(field) or "")
           for field in ("title_digest", "body_digest", "label_digest", "rollup_digest", "review_digest")):
        raise ValueError("sweep state has malformed digests")
    return state


def last_evaluated(comments, kind):
    markers = []
    for comment in comments or []:
        if (comment.get("user") or {}).get("login") not in BOT_AUTHORS:
            continue
        body = comment.get("body") or ""
        matches = [match for match in STATE_RE.finditer(body) if match.group(1) == kind]
        if matches:
            markers.append(matches[-1].group(0))
    if not markers:
        return None
    # Workflows maintain one marker per kind. If duplication or corruption occurs,
    # fail open to one reevaluation rather than suppressing a required decision.
    return decode_state(markers[-1], kind)


def should_dispatch(pr, comments, kind):
    try:
        previous = last_evaluated(comments, kind)
    except ValueError:
        return True
    return previous != fingerprint(pr)


def selftest():
    failures = 0
    pr = {
        "baseRefOid": "c" * 40,
        "headRefOid": "a" * 40,
        "labels": [{"name": "release"}, {"name": "safe-automerge"}],
        "statusCheckRollup": [{"__typename": "CheckRun", "name": "dco", "conclusion": "SUCCESS"}],
        "latestReviews": [],
        "reviewRequests": [],
        "reviewDecision": "APPROVED",
    }

    def check(name, expected, current=pr, comments=None, kind="classify"):
        nonlocal failures
        actual = should_dispatch(current, comments, kind)
        if actual == expected:
            print(f"  ok   {name}")
        else:
            failures += 1
            print(f"  FALHOU {name}: {actual}")

    for kind in ("classify", "automerge"):
        marker = encode_state(kind, pr)
        comments = [{"body": f"bot result\n{marker}", "user": {"login": BOT_AUTHOR}}]
        check(f"{kind}: first evaluation dispatches", True, comments=[], kind=kind)
        check(f"{kind}: unchanged head and rollup debounce", False, comments=comments, kind=kind)
        check(f"{kind}: reordered labels debounce", False,
              current=dict(pr, labels=list(reversed(pr["labels"]))), comments=comments, kind=kind)
        check(f"{kind}: title edit dispatches", True,
              current=dict(pr, title="New English title"), comments=comments, kind=kind)
        check(f"{kind}: body edit dispatches", True,
              current=dict(pr, body="New English body"), comments=comments, kind=kind)
        check(f"{kind}: base advancement with fixed head/rollup/reviews dispatches", True,
              current=dict(pr, baseRefOid="d" * 40), comments=comments, kind=kind)
        check(f"{kind}: label change with fixed head/rollup/reviews dispatches", True,
              current=dict(pr, labels=[{"name": "release"}]), comments=comments, kind=kind)
        check(f"{kind}: github-actions bot state debounces", False, comments=[{
            "body": f"fallback token result\n{marker}", "user": {"login": "github-actions[bot]"},
        }], kind=kind)
        check(f"{kind}: new head dispatches", True,
              current=dict(pr, headRefOid="b" * 40), comments=comments, kind=kind)
        check(f"{kind}: external DCO rollup change dispatches", True,
              current=dict(pr, statusCheckRollup=[
                  {"__typename": "CheckRun", "name": "dco", "conclusion": "FAILURE"}
              ]), comments=comments, kind=kind)
        check(f"{kind}: external review change dispatches", True,
              current=dict(pr, latestReviews=[{"state": "CHANGES_REQUESTED"}]),
              comments=comments, kind=kind)
        check(f"{kind}: malformed state fails open", True,
              comments=[{"body": f"{PREFIX}{kind}:broken{SUFFIX}", "user": {"login": BOT_AUTHOR}}],
              kind=kind)
        check(f"{kind}: other bot state does not suppress", True,
              comments=[{
                  "body": encode_state("automerge" if kind == "classify" else "classify", pr),
                  "user": {"login": BOT_AUTHOR},
              }], kind=kind)
        check(f"{kind}: forged user state does not suppress", True,
              comments=[{"body": marker, "user": {"login": "pull-request-author"}}], kind=kind)
    if decode_state(encode_state("classify", pr), "classify") != fingerprint(pr):
        failures += 1
        print("  FALHOU state round trip")
    else:
        print("  ok   state round trip")
    return 0 if not failures else 1


def main():
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    if "--encode" in sys.argv:
        print(encode_state(payload["kind"], payload["pr"]))
        return 0
    if "--should-dispatch" in sys.argv:
        print(json.dumps(should_dispatch(payload["pr"], payload.get("comments"), payload["kind"])))
        return 0
    raise ValueError("choose --encode, --should-dispatch, or --selftest")


if __name__ == "__main__":
    raise SystemExit(main())
