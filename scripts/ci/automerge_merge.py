#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys

try:
    from .check_automerge import revalidate_decision
except ImportError:
    from check_automerge import revalidate_decision

PR_FIELDS = (
    'title,body,assignees,isDraft,labels,reviewDecision,mergeStateStatus,'
    'statusCheckRollup,latestReviews,reviewRequests,files,changedFiles,'
    'baseRefName,baseRefOid,headRefName,headRefOid,headRepository'
)


def merge_command(pr: str, head_oid: str, merge_kind: str) -> list[str]:
    command = ['gh', 'pr', 'merge', pr, '--merge', '--match-head-commit', head_oid]
    if merge_kind != 'release-batch':
        command.append('--delete-branch')
    return command


def selftest() -> int:
    release = merge_command('1332', 'a' * 40, 'release-batch')
    safe = merge_command('1328', 'b' * 40, 'safe')
    assert release == ['gh', 'pr', 'merge', '1332', '--merge', '--match-head-commit', 'a' * 40]
    assert safe == ['gh', 'pr', 'merge', '1328', '--merge', '--match-head-commit', 'b' * 40, '--delete-branch']
    print('AUTOMERGE-MERGE selftest ok: exact head, merge commit, staging preserved')
    return 0


def attest_current_pr(pr: str) -> dict:
    raw = subprocess.check_output([
        'gh', 'pr', 'view', pr, '--json', PR_FIELDS,
    ], text=True)
    payload = json.load(open('/tmp/automerge-attestation-input.json'))
    payload['pr'] = json.loads(raw)
    payload['expected_repository'] = os.environ['GITHUB_REPOSITORY']
    # Revalidate the current head/base, live refs, ancestry, and complete diff
    # before producing the exact eligibility shape used by the first decision.
    result = subprocess.run([
        'python3', 'scripts/ci/pr_attestation.py', '--apply',
    ], input=json.dumps(payload), stdout=subprocess.PIPE, text=True, check=True)
    return json.loads(result.stdout)


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    evaluated = json.load(open('/tmp/automerge.json'))
    data = json.load(open('/tmp/automerge-result.json'))
    pr = os.environ['PR_NUMBER']
    status = attest_current_pr(pr)
    head_oid = status.get('headRefOid') or ''
    if not re.fullmatch(r'[0-9a-f]{40}', head_oid):
        raise RuntimeError('automerge requires the evaluated canonical head OID')
    current_data = revalidate_decision(evaluated, data, status)
    if not current_data.get('eligible'):
        print('pronto-pra-merge: not eligible')
        subprocess.run(['gh', 'pr', 'edit', pr, '--remove-label', 'pronto-pra-merge'], check=False)
        return 0
    # No label or comment mutation may open a window between revalidation and
    # the merge pinned to the same freshly attested head.
    subprocess.run(merge_command(pr, head_oid, current_data.get('merge_kind')), check=True)
    try:
        already_labeled = subprocess.run(
            ['gh', 'pr', 'view', pr, '--json', 'labels', '--jq',
             '[.labels[].name] | index("pronto-pra-merge") != null'],
            capture_output=True, text=True,
        ).stdout.strip() == 'true'
        subprocess.run(['gh', 'pr', 'edit', pr, '--add-label', 'pronto-pra-merge'], check=True)
        if not already_labeled:
            kind = 'the daily release batch' if current_data.get('merge_kind') == 'release-batch' else 'a safe change'
            subprocess.run(['gh', 'pr', 'comment', pr, '--body',
                f'🤖 **csbrasil-bot**: required checks passed and the diff met the '
                f'`check_automerge` criteria. Merged automatically as {kind}.',
            ], check=True)
    except subprocess.CalledProcessError as error:
        print(f'warning: post-merge bookkeeping failed ({error}); merge already completed', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
