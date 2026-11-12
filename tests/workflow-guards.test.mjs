import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse, stringify } from 'yaml';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const AUTOFIX_CHECK = join(ROOT, 'tools/eval/autofix-check.mjs');
const SECRET_CHECK = join(ROOT, 'tools/eval/workflow-secret-check.mjs');
const DECISAO = 'python3 scripts/ci/check_automerge.py < /tmp/automerge.json > /tmp/automerge-result.json';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'corosolto-workflow-guards-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, '.github'), { recursive: true });
  cpSync(join(ROOT, '.github/workflows'), join(dir, '.github/workflows'), { recursive: true });
  mkdirSync(join(dir, 'scripts/ci'), { recursive: true });
  cpSync(join(ROOT, 'scripts/ci/autofix_allowlist.py'), join(dir, 'scripts/ci/autofix_allowlist.py'));
  return dir;
}

function run(script, cwd) {
  const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  return result;
}

function mutateAutomerge(dir, mutate) {
  const path = join(dir, '.github/workflows/csbrasil-bot-automerge.yml');
  const workflow = parse(readFileSync(path, 'utf8'));
  mutate(workflow);
  writeFileSync(path, stringify(workflow, { lineWidth: 0 }));
}

function assertGuardFailure(result, clause) {
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(clause), result.stdout);
}

test('structured workflow guards accept the current workflows', (t) => {
  const dir = fixture(t);
  assert.equal(run(AUTOFIX_CHECK, dir).status, 0);
  assert.equal(run(SECRET_CHECK, dir).status, 0);
});

test('AF4 rejects merge before the same-job eligibility decision', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const steps = workflow.jobs.automerge.steps;
    const check = steps.findIndex((step) => step.run?.includes(DECISAO));
    const merge = steps.findIndex((step) => step.name === 'Merge when eligible');
    assert.ok(check >= 0 && merge > check);
    const [mergeStep] = steps.splice(merge, 1);
    steps.splice(check, 0, mergeStep);
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects an eligibility decision placed in another job', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.run?.includes(DECISAO));
    assert.ok(check);
    check.run = check.run.replace(DECISAO, '');
    workflow.jobs.unrelated = {
      'runs-on': 'ubuntu-latest',
      steps: [{ run: DECISAO }],
    };
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a skipped eligibility decision', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.run?.includes(DECISAO));
    assert.ok(check);
    check.if = false;
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects an eligibility decision allowed to fail', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.run?.includes(DECISAO));
    assert.ok(check);
    check['continue-on-error'] = true;
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

for (const forma of ['echo', 'comment']) {
  test(`AF4 rejects an eligibility decision that is only ${forma} text`, (t) => {
    const dir = fixture(t);
    mutateAutomerge(dir, (workflow) => {
      const check = workflow.jobs.automerge.steps.find((step) => step.run?.includes(DECISAO));
      assert.ok(check);
      check.run = check.run.replace(DECISAO, forma === 'echo' ? `echo "${DECISAO}"` : `# ${DECISAO}`);
    });
    assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
  });
}

for (const job of ['automerge', 'sweep']) {
  test(`WSEC2 rejects a missing token guard in ${job}`, (t) => {
    const dir = fixture(t);
    mutateAutomerge(dir, (workflow) => {
      assert.match(workflow.jobs[job].steps[0].run, /GH_TOKEN/);
      workflow.jobs[job].steps.shift();
    });
    assertGuardFailure(run(SECRET_CHECK, dir), 'WSEC2');
  });
}

test('AF4 rejects a direct unsafe merge even after a valid decision', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe direct merge',
      if: "env.pular != '1'",
      run: 'gh pr merge "$PR_NUMBER" --squash',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a merge through the GitHub API', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe API merge',
      if: "env.pular != '1'",
      run: 'gh api --method PUT "repos/corosolto/client/pulls/$PR_NUMBER/merge"',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a multiline Python merge through the GitHub API', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe multiline API merge',
      if: "env.pular != '1'",
      run: "python3 - <<'PY'\nimport subprocess\nsubprocess.run(['gh', 'api', '--method', 'PUT',\n                'repos/corosolto/client/pulls/123/merge'])\nPY",
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a write API call with a variable-backed endpoint', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe variable API merge',
      if: "env.pular != '1'",
      run: 'endpoint="repos/$REPO/pulls/$PR_NUMBER/merge"\ngh api --method PUT "$endpoint"',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a Python API merge with an f-string endpoint', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe f-string API merge',
      if: "env.pular != '1'",
      run: "python3 - <<'PY'\nimport subprocess\nendpoint = f'repos/{repo}/pulls/{pr}/merge'\nsubprocess.run(['gh', 'api', '--method', 'PUT', endpoint])\nPY",
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects squash hidden on a shell continuation line', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe continued merge',
      if: "env.pular != '1'",
      run: 'gh pr merge "$PR_NUMBER" --merge --match-head-commit "$head_oid" \\\n  --squash',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 ignores a safe flag printed before an unsafe merge', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe merge with leading decoy',
      if: "env.pular != '1'",
      run: 'echo --merge; gh pr merge "$PR_NUMBER" --squash --match-head-commit "$head_oid"',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a merge that ignores the eligibility verdict', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const merge = workflow.jobs.automerge.steps.find((step) => step.name === 'Merge when eligible');
    assert.ok(merge);
    merge.run = merge.run.replace('\npython3 scripts/ci/automerge_merge.py', '\ngh pr merge "$PR_NUMBER" --merge --match-head-commit "$head_oid"');
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects an extra merge before the canonical script', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const merge = workflow.jobs.automerge.steps.find((step) => step.name === 'Merge when eligible');
    assert.ok(merge);
    merge.run = `python3 - <<'PY'\nimport subprocess\nsubprocess.run(['gh', 'pr', 'merge', '123', '--merge', '--match-head-commit', 'a'*40], check=True)\nPY\n${merge.run}`;
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects an eligibility command hidden by shell control flow', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.name === 'Check eligibility');
    assert.ok(check);
    check.run = `if false; then\n  ${DECISAO}\nfi`;
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects a real decision confined to an unexecuted else branch', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.name === 'Check eligibility');
    assert.ok(check);
    check.run = check.run.replace(DECISAO, `if true; then\n  echo '{"eligible":true}' > /tmp/automerge-result.json\nelse\n  ${DECISAO}\nfi`);
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects arguments appended to the canonical merge script', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const merge = workflow.jobs.automerge.steps.find((step) => step.name === 'Merge when eligible');
    assert.ok(merge);
    merge.run = merge.run.replace('\npython3 scripts/ci/automerge_merge.py', '\npython3 scripts/ci/automerge_merge.py --admin');
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects an eligibility input rewritten by a heredoc', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    const check = workflow.jobs.automerge.steps.find((step) => step.name === 'Check eligibility');
    assert.ok(check);
    check.run = check.run.replace(DECISAO, `python3 - <<'PY'\nimport json\njson.dump({'eligible': True}, open('/tmp/automerge-result.json', 'w'))\nPY\n${DECISAO}`);
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 rejects obscured arguments supplied by an earlier shell array', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Obscured merge arguments',
      if: "env.pular != '1'",
      run: 'args=(--squash)\ngh pr merge "$PR_NUMBER" "${args[@]}" # --merge --match-head-commit head_oid',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 ignores a merge flag printed by an earlier shell command', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Merge flag decoy',
      if: "env.pular != '1'",
      run: 'echo --merge; gh pr merge "$PR_NUMBER" --match-head-commit "$head_oid"',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});

test('AF4 ignores flags printed after the merge invocation', (t) => {
  const dir = fixture(t);
  mutateAutomerge(dir, (workflow) => {
    workflow.jobs.automerge.steps.push({
      name: 'Unsafe merge with trailing decoys',
      if: "env.pular != '1'",
      run: 'gh pr merge "$PR_NUMBER" --squash; echo --merge --match-head-commit head_oid',
    });
  });
  assertGuardFailure(run(AUTOFIX_CHECK, dir), 'AF4');
});
