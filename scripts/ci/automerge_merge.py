#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys


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


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    data = json.load(open('/tmp/automerge-result.json'))
    status = json.load(open('/tmp/automerge.json'))
    pr = os.environ['PR_NUMBER']
    head_oid = status.get('headRefOid') or ''
    if not re.fullmatch(r'[0-9a-f]{40}', head_oid):
        raise RuntimeError('automerge requires the evaluated canonical head OID')
    if not data.get('eligible'):
        print('pronto-pra-merge: not eligible')
        subprocess.run(['gh', 'pr', 'edit', pr, '--remove-label', 'pronto-pra-merge'], check=False)
        return 0
    already_labeled = subprocess.run(
        ['gh', 'pr', 'view', pr, '--json', 'labels', '--jq',
         '[.labels[].name] | index("pronto-pra-merge") != null'],
        capture_output=True, text=True,
    ).stdout.strip() == 'true'
    subprocess.run(['gh', 'pr', 'edit', pr, '--add-label', 'pronto-pra-merge'], check=True)
    if not already_labeled:
        kind = 'the daily release batch' if data.get('merge_kind') == 'release-batch' else 'a safe change'
        subprocess.run([
            'gh', 'pr', 'comment', pr, '--body',
            f'🤖 **csbrasil-bot**: required checks passed and the diff meets the '
            f'`check_automerge` criteria. Merging automatically as {kind}.',
        ], check=True)
    subprocess.run(merge_command(pr, head_oid, data.get('merge_kind')), check=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
