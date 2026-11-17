#!/usr/bin/env python3
"""Executa a decisão do `check_automerge.py`: status `politica-merge` + auto-merge nativo.

Ordem fixa, e a ordem é a segurança:
1. relê o PR e rejeita decisão velha (`revalidate_decision`);
2. publica `politica-merge` na head avaliada — ANTES de mexer no auto-merge, para que
   um bloqueio novo segure o merge nativo mesmo se o desarme falhar ou for cancelado;
3. arma o auto-merge (merge commit, `expectedHeadOid`) quando a política permite e o
   ruleset da base exige todos os `REQUIRED_CONTEXTS`; senão, desarma se estiver armado.

Merge DIRETO (`gh pr merge --merge --match-head-commit`) só acontece com o critério
completo antigo (`eligible`): quando o GitHub recusa armar porque o PR já está limpo, ou
enquanto o ruleset da base não exige os contextos (settings do dono ainda não aplicados).
"""
import json
import os
import re
import subprocess
import sys

from check_automerge import POLICY_CONTEXT, REQUIRED_CONTEXTS, revalidate_decision
from pr_threads import unresolved_review_threads

ARM = """
mutation($id: ID!, $head: GitObjectID!) {
  enablePullRequestAutoMerge(input: {pullRequestId: $id, mergeMethod: MERGE, expectedHeadOid: $head}) {
    pullRequest { autoMergeRequest { mergeMethod } }
  }
}
"""
DISARM = """
mutation($id: ID!) {
  disablePullRequestAutoMerge(input: {pullRequestId: $id}) { pullRequest { autoMergeRequest { mergeMethod } } }
}
"""
# O GitHub recusa armar PR que já pode entrar agora ("Pull request is in clean status") e
# repositório com `allow_auto_merge` desligado. Os dois caem no critério do merge direto;
# qualquer outro erro do GraphQL continua fatal.
JA_LIMPO = re.compile(r"\b(clean|unstable|has_hooks) status\b", re.IGNORECASE)
SEM_AUTO_MERGE = re.compile(r"auto[ -]?merge is not allowed", re.IGNORECASE)
REVIEW_THREADS_RULE = '<required review thread resolution>'


def merge_command(pr: str, head_oid: str, merge_kind: str) -> list[str]:
    command = ['gh', 'pr', 'merge', pr, '--merge', '--match-head-commit', head_oid]
    if merge_kind != 'release-batch':
        command.append('--delete-branch')
    return command


def canonical_head(current: dict) -> str:
    head_oid = current.get('headRefOid') or ''
    if not re.fullmatch(r'[0-9a-f]{40}', head_oid):
        raise RuntimeError('automerge requires the evaluated canonical head OID')
    return head_oid


def missing_contexts(base: str, rules: list[dict]) -> list[str]:
    """Contextos que o ruleset ativo da base ainda não exige. Base fora do mapa nunca arma."""
    exigidos = REQUIRED_CONTEXTS.get(base)
    if exigidos is None:
        return [f'<no native policy for base {base}>']
    faltam = []
    if not any(
        rule.get('type') == 'pull_request'
        and (rule.get('parameters') or {}).get('required_review_thread_resolution') is True
        for rule in rules
    ):
        faltam.append(REVIEW_THREADS_RULE)
    presentes = {
        check.get('context')
        for rule in rules if rule.get('type') == 'required_status_checks'
        for check in (rule.get('parameters') or {}).get('required_status_checks') or []
    }
    return faltam + [contexto for contexto in exigidos if contexto not in presentes]


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
        'baseRefName': 'staging',
        'statusCheckRollup': [
            {'__typename': 'CheckRun', 'name': contexto, 'conclusion': 'SUCCESS'}
            for contexto in REQUIRED_CONTEXTS['staging'] if contexto != POLICY_CONTEXT
        ],
        'unresolvedReviewThreads': 0,
        'headRefOid': 'b' * 40,
    }
    from check_automerge import decide
    result = decide(evaluated)
    assert result['auto_merge'] and result['eligible'] and result['policy_state'] == 'success'
    sem_portao = dict(evaluated, statusCheckRollup=[
        item for item in evaluated['statusCheckRollup'] if item['name'] != 'portao'])
    assert decide(sem_portao)['auto_merge'] and not decide(sem_portao)['eligible'], \
        'required check absent from the rollup must block the direct merge'
    assert revalidate_decision(evaluated, result, dict(evaluated)) == result
    for stale in (dict(evaluated, reviewDecision='CHANGES_REQUESTED'),
                  dict(evaluated, unresolvedReviewThreads=1)):
        try:
            revalidate_decision(evaluated, result, stale)
        except ValueError:
            pass
        else:
            raise AssertionError('stale review state must abort before status or merge')
    try:
        canonical_head(dict(evaluated, headRefOid='main'))
    except RuntimeError:
        pass
    else:
        raise AssertionError('non-canonical head must abort')
    regra = lambda *ctx: {'type': 'required_status_checks', 'parameters': {
        'required_status_checks': [{'context': c} for c in ctx]}}
    conversas = {'type': 'pull_request', 'parameters': {'required_review_thread_resolution': True}}
    assert missing_contexts('main', [conversas, regra(*REQUIRED_CONTEXTS['main'])]) == []
    assert missing_contexts('main', [regra(*REQUIRED_CONTEXTS['main'])]) == [REVIEW_THREADS_RULE]
    assert missing_contexts('main', [conversas, regra('build', 'dco', 'versao-bumpada', 'ratchet')])
    assert POLICY_CONTEXT in missing_contexts(
        'staging', [conversas, regra(*[c for c in REQUIRED_CONTEXTS['staging'] if c != POLICY_CONTEXT])])
    assert missing_contexts('feature/x', [regra(*REQUIRED_CONTEXTS['main'])])
    assert missing_contexts('main', [{'type': 'pull_request'}]) == [
        REVIEW_THREADS_RULE, *REQUIRED_CONTEXTS['main']]
    # Formato real de GET repos/corosolto/client/rules/branches/main (17/11/2026): a resposta é
    # um ARRAY de regras ativas, cada uma com a origem do ruleset; não há envelope `rules`.
    real = json.loads(
        '[{"type":"deletion","ruleset_source_type":"Repository","ruleset_source":"corosolto/client",'
        '"ruleset_id":19116007},{"parameters":{"required_review_thread_resolution":true},'
        '"ruleset_id":19116007,"ruleset_source":"corosolto/client","ruleset_source_type":"Repository",'
        '"type":"pull_request"},{"parameters":{"do_not_enforce_on_create":false,"required_status_checks":'
        '[{"context":"build"},{"context":"dco"},{"context":"versao-bumpada"},{"context":"ratchet"},'
        '{"context":"english"},{"context":"hotfix-ancestry"}],"strict_required_status_checks_policy":false},'
        '"ruleset_id":19116007,"ruleset_source":"corosolto/client","ruleset_source_type":"Repository",'
        '"type":"required_status_checks"}]')
    assert missing_contexts('main', real) == [
        POLICY_CONTEXT, 'portao-decide', 'portao', 'smoke-decide', 'smoke', 'chat-desktop']
    assert JA_LIMPO.search('GraphQL: Pull request Pull request is in clean status (enablePullRequestAutoMerge)')
    assert not JA_LIMPO.search('GraphQL: Pull request Auto merge is not allowed for this repository')
    assert SEM_AUTO_MERGE.search('GraphQL: Pull request Auto merge is not allowed for this repository (enablePullRequestAutoMerge)')
    assert not SEM_AUTO_MERGE.search('GraphQL: Could not resolve to a node with the global id')
    print('AUTOMERGE-MERGE selftest ok: live policy, status before arm, native arm only with full ruleset, merge commit')
    return 0


def gh(args, **kwargs):
    return subprocess.run(['gh', *args], capture_output=True, text=True, **kwargs)


def gh_read(args, **kwargs):
    """Leitura de metadata com o GITHUB_TOKEN: campos `login` exigem `read:org`, que o PAT não tem."""
    env = dict(os.environ, GH_TOKEN=os.environ.get('READ_GH_TOKEN') or os.environ.get('GH_TOKEN', ''))
    return subprocess.run(['gh', *args], capture_output=True, text=True, env=env, **kwargs)


def current_attested_pr(pr: str) -> dict:
    fields = (
        'title,body,assignees,isDraft,labels,reviewDecision,mergeStateStatus,'
        'statusCheckRollup,latestReviews,reviewRequests,files,changedFiles,'
        'baseRefName,baseRefOid,headRefName,headRefOid,headRepository'
    )
    current_raw = gh_read(['pr', 'view', pr, '--json', fields], check=True)
    payload = json.load(open('/tmp/automerge-attestation-input.json'))
    payload['pr'] = json.loads(current_raw.stdout)
    payload['pr']['unresolvedReviewThreads'] = unresolved_review_threads(os.environ['GITHUB_REPOSITORY'], int(pr))
    payload['expected_repository'] = os.environ['GITHUB_REPOSITORY']
    attested = subprocess.run(
        [sys.executable, 'scripts/ci/pr_attestation.py', '--apply'],
        input=json.dumps(payload), capture_output=True, text=True, check=True,
    )
    return json.loads(attested.stdout)


def post_policy_status(repo: str, head_oid: str, result: dict) -> None:
    run_url = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{repo}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
    gh(['api', '-X', 'POST', f'repos/{repo}/statuses/{head_oid}',
        '-f', f"state={result['policy_state']}", '-f', f'context={POLICY_CONTEXT}',
        '-f', f"description={result['policy_description'][:140]}", '-f', f'target_url={run_url}'], check=True)
    print(f"{POLICY_CONTEXT}={result['policy_state']} on {head_oid}: {result['policy_description']}")


def comment(pr: str, body: str) -> None:
    resultado = gh(['pr', 'comment', pr, '--body', body])
    if resultado.returncode:
        print(f'warning: comment failed: {resultado.stderr.strip()}', file=sys.stderr)


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    repo = os.environ['GITHUB_REPOSITORY']
    pr = os.environ['PR_NUMBER']
    evaluated = json.load(open('/tmp/automerge.json'))
    result = json.load(open('/tmp/automerge-result.json'))
    current = current_attested_pr(pr)
    current_result = revalidate_decision(evaluated, result, current)
    head_oid = canonical_head(current)
    post_policy_status(repo, head_oid, current_result)

    live = json.loads(gh_read(['pr', 'view', pr, '--json', 'id,autoMergeRequest,headRefOid,labels'], check=True).stdout)
    if live['headRefOid'] != head_oid:
        raise RuntimeError('head moved after the policy status; the next bot run evaluates the new head')
    armed = live.get('autoMergeRequest') is not None
    labeled = any(label['name'] == 'pronto-pra-merge' for label in live.get('labels') or [])

    if not current_result['auto_merge']:
        if armed:
            gh(['api', 'graphql', '-f', f'query={DISARM}', '-f', f"id={live['id']}"], check=True)
            comment(pr, f"🤖 **csbrasil-bot**: auto-merge disarmed — `{POLICY_CONTEXT}`: "
                        f"{current_result['policy_description']}.")
        if labeled:
            gh(['api', '-X', 'DELETE', f'repos/{repo}/issues/{pr}/labels/pronto-pra-merge'])
        print(f"auto-merge not allowed by policy (armed before: {armed})")
        return 0

    rules = json.loads(gh(['api', f"repos/{repo}/rules/branches/{current['baseRefName']}"], check=True).stdout)
    faltam = missing_contexts(current['baseRefName'], rules)
    if armed:
        print('auto-merge already armed; GitHub merges when the required checks pass')
        return 0
    if not faltam:
        armou = gh(['api', 'graphql', '-f', f'query={ARM}', '-f', f"id={live['id']}", '-f', f'head={head_oid}'])
        if armou.returncode == 0:
            if not labeled:
                gh(['api', '-X', 'POST', f'repos/{repo}/issues/{pr}/labels', '-f', 'labels[]=pronto-pra-merge'])
                comment(pr, f"🤖 **csbrasil-bot**: `{POLICY_CONTEXT}` passed; auto-merge armed (merge commit, "
                            f"head `{head_oid[:12]}`). GitHub merges when the required checks pass.")
            print('auto-merge armed')
            return 0
        erro = armou.stderr + armou.stdout
        if JA_LIMPO.search(erro):
            print('GitHub reports the PR as already mergeable; falling back to the full direct-merge criteria')
        elif SEM_AUTO_MERGE.search(erro):
            print('::notice title=Auto-merge nativo desligado::allow_auto_merge=false no repositório; '
                  'só merge direto com o critério completo')
        else:
            raise RuntimeError(f'enablePullRequestAutoMerge failed: {armou.stderr.strip()}')
    else:
        print(f"::notice title=Auto-merge nativo inativo::ruleset de {current['baseRefName']} não exige "
              f"{', '.join(faltam)}; só merge direto com rollup inteiro verde")
    if not current_result['eligible']:
        print('direct merge not eligible yet (rollup or mergeable state); waiting for the next bot event')
        return 0
    # Nenhuma mutação de label ou comentário entre a revalidação e o merge.
    subprocess.run(merge_command(pr, head_oid, current_result['merge_kind']), check=True)
    kind = 'the daily release batch' if current_result['merge_kind'] == 'release-batch' else 'a safe change'
    comment(pr, f'🤖 **csbrasil-bot**: required checks passed and `{POLICY_CONTEXT}` is green. '
                f'Merged automatically as {kind}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
