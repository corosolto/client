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


def classify(payload: dict) -> dict:
    # PR conflitante/gigante devolve files: null na API — sem o guarda, o
    # classify morria com TypeError em vez de classificar com o que tem.
    files = [f["path"] for f in (payload.get("files") or [])]
    additions = int(payload.get("additions") or 0)
    deletions = int(payload.get("deletions") or 0)
    changed_files = int(payload.get("changedFiles", len(files)))
    base_branch = payload.get("baseRefName") or "main"

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
    only_safe = files and all(
        any(p == prefix or p.startswith(prefix) for prefix in SAFE_PREFIXES) for p in files
    )

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
    # regressão do #468: PR conflitante devolve files/additions nulos —
    # classifica com o que tem em vez de morrer com TypeError.
    nulo = classify({"files": None, "additions": None, "baseRefName": "main"})
    assert nulo["labels_add"] == ["target:main"], nulo
    doc = classify({
        "files": [{"path": "docs/comecando.md"}], "additions": 10,
        "deletions": 2, "changedFiles": 1, "baseRefName": "main",
    })
    assert "safe-automerge" in doc["labels_add"], doc
    jogo = classify({
        "files": [{"path": "public/js/game.js"}], "additions": 300,
        "deletions": 10, "changedFiles": 1, "baseRefName": "staging",
    })
    assert "needs-human-gameplay" in jogo["labels_add"], jogo
    assert "safe-automerge" in jogo["labels_remove"], jogo
    assert "target:staging" in jogo["labels_add"], jogo
    print("selftest ok")
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(classify(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
