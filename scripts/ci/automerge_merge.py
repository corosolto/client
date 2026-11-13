#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys

from check_automerge import revalidate_decision


def merge_command(pr: str, head_oid: str, merge_kind: str) -> list[str]:
    command = ['gh', 'pr', 'merge', pr, '--merge', '--match-head-commit', head_oid]
    if merge_kind != 'release-batch':
        command.append('--delete-branch')
    return command


def validated_merge_command(pr: str, evaluated: dict, result: dict, current: dict):
    current_result = revalidate_decision(evaluated, result, current)
    head_oid = current.get('headRefOid') or ''
    if not re.fullmatch(r'[0-9a-f]{40}', head_oid):
        raise RuntimeError('automerge requires the evaluated canonical head OID')
    if not current_result.get('eligible'):
        return None, current_result
    return merge_command(pr, head_oid, current_result.get('merge_kind')), current_result


def selftest() -> int:
    release = merge_command('1332', 'a' * 40, 'release-batch')
    safe = merge_command('1328', 'b' * 40, 'safe')
    assert release == ['gh', 'pr', 'merge', '1332', '--merge', '--match-head-commit', 'a' * 40]
    assert safe == ['gh', 'pr', 'merge', '1328', '--merge', '--match-head-commit', 'b' * 40, '--delete-branch']
    evaluated = {
        'isDraft': False,
        'labels': [{'name': 'safe-automerge'}],
        'files': [{'path': 'docs/a.md'}],
        'changedFiles': 1,
        'reviewDecision': 'APPROVED',
        'mergeStateStatus': 'CLEAN',
        'statusCheckRollup': [{'__typename': 'CheckRun', 'conclusion': 'SUCCESS'}],
        'headRefOid': 'b' * 40,
    }
    result = {
        'eligible': True,
        'merge_kind': 'safe',
        'estragacodigo_blocked': False,
        'touches_workflows': False,
        'human_blocked': False,
        'lista_incompleta': False,
    }
    command, current_result = validated_merge_command('1328', evaluated, result, dict(evaluated))
    assert current_result == result
    assert command == safe
    try:
        validated_merge_command(
            '1328', evaluated, result,
            dict(evaluated, reviewDecision='CHANGES_REQUESTED'),
        )
    except ValueError:
        pass
    else:
        raise AssertionError('stale review state must abort the merge')
    print('AUTOMERGE-MERGE selftest ok: live eligibility, exact head, merge commit, staging preserved')
    return 0

def current_attested_pr(pr: str) -> dict:
    fields = (
        'title,body,assignees,isDraft,labels,reviewDecision,mergeStateStatus,'
        'statusCheckRollup,latestReviews,reviewRequests,files,changedFiles,'
        'baseRefName,baseRefOid,headRefName,headRefOid,headRepository'
    )
    current_raw = subprocess.run(
        ['gh', 'pr', 'view', pr, '--json', fields],
        capture_output=True, text=True, check=True,
    )
    payload = json.load(open('/tmp/automerge-attestation-input.json'))
    payload['pr'] = json.loads(current_raw.stdout)
    payload['expected_repository'] = os.environ['GITHUB_REPOSITORY']
    attested = subprocess.run(
        [sys.executable, 'scripts/ci/pr_attestation.py', '--apply'],
        input=json.dumps(payload), capture_output=True, text=True, check=True,
    )
    return json.loads(attested.stdout)


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    evaluated = json.load(open('/tmp/automerge.json'))
    result = json.load(open('/tmp/automerge-result.json'))
    current = current_attested_pr(os.environ['PR_NUMBER'])
    pr = os.environ['PR_NUMBER']
    command, current_result = validated_merge_command(pr, evaluated, result, current)
    if command is None:
        print('pronto-pra-merge: not eligible')
        subprocess.run(['gh', 'pr', 'edit', pr, '--remove-label', 'pronto-pra-merge'], check=False)
        return 0
    # No label or comment mutation may open a window after live revalidation.
    subprocess.run(command, check=True)
    try:
        already_labeled = subprocess.run(
            ['gh', 'pr', 'view', pr, '--json', 'labels', '--jq',
             '[.labels[].name] | index("pronto-pra-merge") != null'],
            capture_output=True, text=True,
        ).stdout.strip() == 'true'
        subprocess.run(['gh', 'pr', 'edit', pr, '--add-label', 'pronto-pra-merge'], check=True)
        if not already_labeled:
            kind = (
                'the daily release batch'
                if current_result.get('merge_kind') == 'release-batch'
                else 'a safe change'
            )
            subprocess.run([
                'gh', 'pr', 'comment', pr, '--body',
                f'🤖 **csbrasil-bot**: required checks passed and the diff met the '
                f'`check_automerge` criteria. Merged automatically as {kind}.',
            ], check=True)
    except subprocess.CalledProcessError as error:
        print(f'warning: post-merge bookkeeping failed ({error}); merge already completed', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
