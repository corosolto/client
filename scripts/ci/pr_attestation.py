#!/usr/bin/env python3
"""Emit and validate the sole Git attestation trusted by the PR bots."""
import hashlib
import json
import re
import subprocess
import sys

SCHEMA_VERSION = 1
OID = re.compile(r"[0-9a-f]{40}")
DIGEST = re.compile(r"[0-9a-f]{64}")


def _oid(value, field):
    if not isinstance(value, str) or not OID.fullmatch(value):
        raise ValueError(f"{field} must be a canonical Git OID")
    return value


def _repository(pr):
    return ((pr.get("headRepository") or {}).get("nameWithOwner") or "")


def _ref(name, field):
    if not isinstance(name, str) or not name or name.startswith("-"):
        raise ValueError(f"{field} must be a branch name")
    result = subprocess.run(
        ["git", "check-ref-format", "--branch", name],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise ValueError(f"{field} must be a valid branch name")
    return name


def _git_lines(*args):
    return subprocess.check_output(["git", *args], text=True).splitlines()


def _remote_oid(name):
    _ref(name, "remote ref")
    ref = f"refs/heads/{name}"
    result = subprocess.run(
        ["git", "ls-remote", "--exit-code", "origin", ref],
        capture_output=True,
        text=True,
        check=True,
    )
    fields = result.stdout.strip().split()
    if len(fields) != 2 or fields[1] != ref:
        raise ValueError(f"could not resolve exact remote ref {ref}")
    return _oid(fields[0], ref)


def _diff_files(base_oid, head_oid):
    raw = subprocess.check_output([
        "git", "diff", "--no-ext-diff", "--no-textconv", "--name-only", "-z",
        f"{base_oid}...{head_oid}",
    ])
    files = [part.decode("utf-8", "strict") for part in raw.split(b"\0") if part]
    if len(files) != len(set(files)):
        raise ValueError("Git returned duplicate diff paths")
    return files


def _diff_digest(base_oid, head_oid):
    process = subprocess.Popen([
        "git", "diff", "--no-ext-diff", "--no-textconv", "--binary", "--full-index",
        f"{base_oid}...{head_oid}",
    ], stdout=subprocess.PIPE)
    assert process.stdout is not None
    digest = hashlib.sha256()
    with process.stdout:
        for chunk in iter(lambda: process.stdout.read(1024 * 1024), b""):
            digest.update(chunk)
    if process.wait() != 0:
        raise RuntimeError("git diff failed while hashing the complete patch")
    return digest.hexdigest()


def _bool(value, field):
    if not isinstance(value, bool):
        raise ValueError(f"{field} must be a boolean")
    return value


def validate_attestation(attestation, pr, expected_repository, pr_number,
                         remote_base_oid, remote_staging_oid, remote_main_oid):
    """Validate schema, current PR identity, and live base/staging/main refs.

    The remote OIDs are explicit so this function stays deterministic in selftests;
    the CLI resolves them directly from origin and never trusts an attestation copy.
    """
    if not isinstance(attestation, dict) or attestation.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("unsupported or malformed attestation schema")
    if not isinstance(expected_repository, str) or not expected_repository:
        raise ValueError("expected_repository is required")
    if attestation.get("expected_repository") != expected_repository:
        raise ValueError("attestation repository does not match expected_repository")
    if (type(attestation.get("pr_number")) is not int
            or attestation.get("pr_number") != pr_number
            or type(pr_number) is not int or pr_number <= 0):
        raise ValueError("attestation PR number does not match")

    base_ref = attestation.get("base_ref")
    head_ref = attestation.get("head_ref")
    if base_ref != pr.get("baseRefName") or head_ref != pr.get("headRefName"):
        raise ValueError("attestation branch identity is stale")
    if attestation.get("head_repository") != _repository(pr):
        raise ValueError("attestation head repository is stale")
    base_oid = _oid(attestation.get("base_oid"), "base_oid")
    head_oid = _oid(attestation.get("head_oid"), "head_oid")
    staging_oid = _oid(attestation.get("staging_oid"), "staging_oid")
    main_oid = _oid(attestation.get("main_oid"), "main_oid")
    if base_oid != pr.get("baseRefOid") or head_oid != pr.get("headRefOid"):
        raise ValueError("attestation does not match the current PR head/base OIDs")
    if base_oid != _oid(remote_base_oid, "remote base OID"):
        raise ValueError("attestation base is stale")
    if staging_oid != _oid(remote_staging_oid, "remote staging OID"):
        raise ValueError("attestation staging-disjoint evidence is stale")
    if main_oid != _oid(remote_main_oid, "remote main OID"):
        raise ValueError("attestation main ancestry evidence is stale")
    if base_ref == "main" and base_oid != main_oid:
        raise ValueError("main base OID does not match main ancestry OID")

    if not DIGEST.fullmatch(attestation.get("diff_digest") or ""):
        raise ValueError("diff_digest must be a SHA-256 hex digest")
    files = attestation.get("diff_files")
    if not isinstance(files, list) or any(
        not isinstance(path, str) or not path or "\0" in path for path in files
    ):
        raise ValueError("diff_files must be a complete list of nonempty paths")
    if files != sorted(files) or len(files) != len(set(files)):
        raise ValueError("diff_files must be sorted and unique")
    if (type(attestation.get("changed_files")) is not int
            or attestation.get("changed_files") != len(files)):
        raise ValueError("changed_files does not match diff_files")
    if attestation.get("full_diff_verified") is not True:
        raise ValueError("complete diff was not verified")

    main_is_ancestor = _bool(attestation.get("main_is_ancestor"), "main_is_ancestor")
    staging_disjoint = _bool(attestation.get("staging_disjoint"), "staging_disjoint")
    head_commit_count = attestation.get("head_commit_count")
    if type(head_commit_count) is not int or head_commit_count < 0:
        raise ValueError("head_commit_count must be a nonnegative integer")
    expected_hotfix_main_only = bool(
        base_ref == "main" and head_commit_count and main_is_ancestor and staging_disjoint
    )
    if attestation.get("hotfix_main_only") is not expected_hotfix_main_only:
        raise ValueError("hotfix_main_only is inconsistent with the ancestry facts")

    official_batch = base_ref == "main" and head_ref == "staging" and _repository(pr) == expected_repository
    if official_batch and head_oid != staging_oid:
        raise ValueError("official release batch head is not the attested staging OID")
    return attestation


def apply_attestation(payload, resolve_remote=_remote_oid):
    attestation = payload.get("attestation")
    pr = payload.get("pr")
    if not isinstance(pr, dict):
        raise ValueError("pr must be an object")
    expected_repository = payload.get("expected_repository")
    pr_number = payload.get("pr_number")
    validate_attestation(
        attestation, pr, expected_repository, pr_number,
        resolve_remote(pr.get("baseRefName")), resolve_remote("staging"), resolve_remote("main"),
    )
    result = dict(pr)
    result.update({
        "expected_repository": expected_repository,
        "files": [{"path": path} for path in attestation["diff_files"]],
        "changedFiles": attestation["changed_files"],
        "full_diff_verified": True,
        "hotfix_main_only": attestation["hotfix_main_only"],
    })
    return result


def emit_attestation(payload):
    pr = payload.get("pr")
    if not isinstance(pr, dict):
        raise ValueError("pr must be an object")
    expected_repository = payload.get("expected_repository")
    pr_number = payload.get("pr_number")
    if not isinstance(expected_repository, str) or not expected_repository:
        raise ValueError("expected_repository is required")
    if type(pr_number) is not int or pr_number <= 0:
        raise ValueError("pr_number must be a positive integer")
    base_name = _ref(pr.get("baseRefName"), "baseRefName")
    head_name = _ref(pr.get("headRefName"), "headRefName")
    local_base = "refs/remotes/pr-attestation/base"
    local_head = "refs/remotes/pr-attestation/head"
    local_staging = "refs/remotes/pr-attestation/staging"
    local_main = "refs/remotes/pr-attestation/main"
    subprocess.run([
        "git", "fetch", "--no-tags", "origin",
        f"+refs/heads/{base_name}:{local_base}",
        f"+refs/pull/{pr_number}/head:{local_head}",
        f"+refs/heads/staging:{local_staging}",
        f"+refs/heads/main:{local_main}",
    ], check=True)
    base_oid = _oid(_git_lines("rev-parse", local_base)[0], "base_oid")
    head_oid = _oid(_git_lines("rev-parse", local_head)[0], "head_oid")
    staging_oid = _oid(_git_lines("rev-parse", local_staging)[0], "staging_oid")
    main_oid = _oid(_git_lines("rev-parse", local_main)[0], "main_oid")
    if base_oid != pr.get("baseRefOid") or head_oid != pr.get("headRefOid"):
        raise ValueError("PR head/base moved while Git evidence was being fetched")

    official_batch = (
        base_name == "main" and head_name == "staging" and _repository(pr) == expected_repository
    )
    if official_batch and head_oid != staging_oid:
        raise ValueError("release batch head moved before classification or merge")
    files = _diff_files(base_oid, head_oid)
    if official_batch and not files:
        raise ValueError("release batch diff is empty")
    head_commits = _git_lines("rev-list", f"{main_oid}..{head_oid}")
    staging_commits = set(_git_lines("rev-list", f"{main_oid}..{staging_oid}"))
    if any(not OID.fullmatch(commit) for commit in head_commits):
        raise ValueError("Git returned a malformed head commit OID")
    if any(not OID.fullmatch(commit) for commit in staging_commits):
        raise ValueError("Git returned a malformed staging commit OID")
    ancestry = subprocess.run([
        "git", "merge-base", "--is-ancestor", main_oid, head_oid,
    ], check=False)
    if ancestry.returncode not in {0, 1}:
        raise RuntimeError("git merge-base failed while checking main ancestry")
    main_is_ancestor = ancestry.returncode == 0
    staging_disjoint = set(head_commits).isdisjoint(staging_commits)
    attestation = {
        "schema_version": SCHEMA_VERSION,
        "expected_repository": expected_repository,
        "pr_number": pr_number,
        "base_ref": base_name,
        "base_oid": base_oid,
        "head_ref": head_name,
        "head_oid": head_oid,
        "head_repository": _repository(pr),
        "staging_oid": staging_oid,
        "main_oid": main_oid,
        "diff_digest": _diff_digest(base_oid, head_oid),
        "diff_files": files,
        "changed_files": len(files),
        "full_diff_verified": True,
        "head_commit_count": len(head_commits),
        "main_is_ancestor": main_is_ancestor,
        "staging_disjoint": staging_disjoint,
        "hotfix_main_only": bool(
            base_name == "main" and head_commits and main_is_ancestor and staging_disjoint
        ),
    }
    # Reuse the exact consumer validation, including live remote revalidation.
    validate_attestation(
        attestation, pr, expected_repository, pr_number,
        _remote_oid(base_name), _remote_oid("staging"), _remote_oid("main"),
    )
    return attestation


def _fixture():
    pr = {
        "baseRefName": "main",
        "baseRefOid": "a" * 40,
        "headRefName": "hotfix",
        "headRefOid": "b" * 40,
        "headRepository": {"nameWithOwner": "corosolto/client"},
    }
    attestation = {
        "schema_version": 1,
        "expected_repository": "corosolto/client",
        "pr_number": 42,
        "base_ref": "main",
        "base_oid": "a" * 40,
        "head_ref": "hotfix",
        "head_oid": "b" * 40,
        "head_repository": "corosolto/client",
        "staging_oid": "c" * 40,
        "main_oid": "a" * 40,
        "diff_digest": "d" * 64,
        "diff_files": ["docs/a.md"],
        "changed_files": 1,
        "full_diff_verified": True,
        "head_commit_count": 1,
        "main_is_ancestor": True,
        "staging_disjoint": True,
        "hotfix_main_only": True,
    }
    return attestation, pr


def selftest():
    failures = 0

    def rejected(name, attestation, pr, base=None, staging=None, main=None):
        nonlocal failures
        try:
            validate_attestation(
                attestation, pr, "corosolto/client", 42,
                base or "a" * 40, staging or "c" * 40, main or "a" * 40,
            )
        except ValueError:
            print(f"  ok   {name}")
        else:
            failures += 1
            print(f"  FALHOU {name}")

    attestation, pr = _fixture()
    try:
        validate_attestation(attestation, pr, "corosolto/client", 42, "a" * 40, "c" * 40, "a" * 40)
        print("  ok   valid current attestation")
    except ValueError as error:
        failures += 1
        print(f"  FALHOU valid current attestation: {error}")

    stale_head = dict(pr, headRefOid="e" * 40)
    rejected("different current head is rejected", attestation, stale_head)
    rejected("different-head attestation is rejected", dict(attestation, head_oid="e" * 40), pr)
    rejected("stale base is rejected", attestation, pr, base="e" * 40)
    rejected("stale staging evidence is rejected", attestation, pr, staging="e" * 40)
    rejected("stale main evidence is rejected", attestation, pr, main="e" * 40)
    for name, mutation in (
        ("malformed digest", {"diff_digest": "not-a-digest"}),
        ("incomplete files", {"changed_files": 2}),
        ("unsorted files", {"diff_files": ["z", "a"]}),
        ("unverified diff", {"full_diff_verified": False}),
        ("inconsistent ancestry", {"hotfix_main_only": False}),
        ("wrong repository", {"expected_repository": "fork/client"}),
    ):
        rejected(name, dict(attestation, **mutation), pr)

    applied = apply_attestation(
        {"attestation": attestation, "pr": pr, "expected_repository": "corosolto/client", "pr_number": 42},
        resolve_remote=lambda name: "a" * 40 if name == "main" else "c" * 40,
    )
    if applied["full_diff_verified"] is True and applied["files"] == [{"path": "docs/a.md"}]:
        print("  ok   consumer receives complete verified files")
    else:
        failures += 1
        print("  FALHOU consumer receives complete verified files")
    return 0 if not failures else 1


def main():
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    if "--emit" in sys.argv:
        print(json.dumps(emit_attestation(payload)))
        return 0
    if "--apply" in sys.argv:
        print(json.dumps(apply_attestation(payload)))
        return 0
    if "--validate" in sys.argv:
        apply_attestation(payload)
        print(json.dumps({"valid": True, "head_oid": payload["attestation"]["head_oid"]}))
        return 0
    raise ValueError("choose --emit, --apply, --validate, or --selftest")


if __name__ == "__main__":
    raise SystemExit(main())
