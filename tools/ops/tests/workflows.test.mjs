/* Os workflows que ligam a camada operacional ao CI têm contrato: sem estas linhas, a
   diagnose agendada, o aquecimento pós-deploy e o eval:boot no PR simplesmente deixam de
   existir sem nenhum vermelho (foi assim que eval:boot ficou quebrado na main por dias). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { casa } from '../../../scripts/ci/gatilho.mjs';

const wf = (n) => readFileSync(fileURLToPath(new URL(`../../../.github/workflows/${n}`, import.meta.url)), 'utf8');

test('ops-diag.yml: agendado e manual, navegador, artifact, issue em vermelho, fecha em verde, teto de tempo', () => {
  const s = wf('ops-diag.yml');
  assert.match(s, /schedule:\n\s+- cron: '/); assert.match(s, /workflow_dispatch:/);
  assert.match(s, /node tools\/ops\/diagnose\.mjs --browser --partida --sem-gpu --out=artifacts\/ops\/ci/);
  assert.match(s, /upload-artifact@[0-9a-f]{40}/); assert.match(s, /path: artifacts\/ops\/ci\//);
  assert.match(s, /codigo == '1'[\s\S]*gh issue (create|comment)/); assert.match(s, /codigo == '0'[\s\S]*gh issue close/);
  const t = Number(/timeout-minutes: (\d+)/.exec(s)?.[1]); assert.ok(t > 0 && t <= 30, `timeout ${t}`);
  assert.doesNotMatch(s, /pull_request/, 'gatilho cego de fork não pode ligar a diagnose (eval:wfsecret)');
  assert.match(s, /issues: write/);
});

test('prod-watch.yml: aquece o edge depois do purge, só no deployment_status, sem virar incidente', () => {
  const s = wf('prod-watch.yml');
  const i = s.indexOf('purge_cache'); const j = s.indexOf('run: node tools/ops/aquecer.mjs');
  assert.ok(i > 0 && j > i, 'o aquecimento tem de vir DEPOIS do purge');
  const bloco = s.slice(s.lastIndexOf('- name:', j), j);
  assert.match(bloco, /if: github\.event_name == 'deployment_status'/); assert.match(bloco, /continue-on-error: true/);
});

test('portao-browser.yml: eval:boot e os cenários de navegador do selftest rodam no PR que toca o boot', () => {
  const s = wf('portao-browser.yml');
  assert.match(s, /run: npm run eval:boot/); assert.match(s, /run: node tools\/ops\/selftest\.mjs --so=navegador/);
  // O filtro saiu do `paths:` para scripts/ci/gatilho.mjs (job `decide`): o contrato é o mesmo.
  assert.match(s, /node scripts\/ci\/gatilho\.mjs portao/);
  for (const p of ['public/js/main.js', 'public/js/ops.js', 'src/pages/index.astro', 'tools/eval/boot-check.mjs', 'tools/ops/selftest.mjs']) assert.ok(casa('portao', p), `gatilho sem ${p}`);
});

/* O portão LENTO em dois jobs paralelos (14/10/2026): o Sertão sozinho custava 8,7 a 12,9 min
   de um job de 18,7 a 27,7. Separar só vale se nenhum passo sair no caminho, e se o Sertão não
   esperar o resto (sem `needs:` entre os dois). */
test('portao-browser.yml: Sertão em job próprio e paralelo, e nenhum passo do portão saiu', () => {
  const s = wf('portao-browser.yml');
  const jobs = {};
  let atual = null;
  for (const l of s.slice(s.indexOf('\njobs:\n')).split('\n').slice(2)) {
    const id = /^ {2}([\w-]+):\s*$/.exec(l);
    if (id) { atual = id[1]; jobs[atual] = ''; } else if (atual) jobs[atual] += `${l}\n`;
  }
  const PASSOS = ['npm run eval:grafite-atual', 'npm run eval:select', 'npm run eval:entrada', 'npm run eval:armas', 'npm run eval:boot', 'node tools/ops/selftest.mjs --so=navegador', 'npm run eval:sertao-livestock-runtime', 'npm run eval:grafite:ar'];
  const todos = Object.values(jobs).join('');
  for (const p of PASSOS) assert.ok(new RegExp(`run: ${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(todos), `passo sumiu: ${p}`);
  const sertao = Object.entries(jobs).find(([, c]) => c.includes('run: npm run eval:sertao-livestock-runtime'));
  assert.ok(sertao, 'sem job com o Sertão');
  assert.ok(!/run: npm run eval:(grafite|select|entrada|armas|boot)\b/.test(sertao[1]), 'o Sertão divide job com o resto do portão');
  assert.doesNotMatch(sertao[1], /^ {4}needs:.*\bportao\b/m, 'o Sertão espera o resto do portão');
  for (const [nome, corpo] of Object.entries(jobs)) {
    if (!/run: npm run eval:/.test(corpo)) continue;
    assert.match(corpo, /run: npm run eval:serve/, `${nome} roda eval:* sem subir o eval:serve`);
    assert.match(corpo, /CHROME_BIN=/, `${nome} roda eval:* sem resolver o CHROME_BIN`);
  }
});

test('package.json: ops:aquecer existe e aponta para o script', () => {
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../../package.json', import.meta.url)), 'utf8'));
  assert.equal(pkg.scripts['ops:aquecer'], 'node tools/ops/aquecer.mjs');
});

/* O smoke em dois jobs paralelos (14/10/2026): o roteiro desktop do chat custa ~14,5 min dos
   12,7 a 27,7 do job inteiro. A partição tem de ser EXATA: a mesma string no `--grep` de um
   job e no `--grep-invert` do outro, e os três specs presentes. Teste que caísse entre os dois
   filtros sumiria do CI sem vermelho nenhum. */
test('smoke-web.yml: chat desktop em job próprio, partição exata, nenhum spec saiu', () => {
  const s = wf('smoke-web.yml');
  const execs = [...s.matchAll(/run: npx playwright test ([^\n]+)/g)].map((m) => m[1]);
  assert.ok(execs.length >= 2, 'o smoke ainda roda num job só');
  const SPECS = ['tests/smoke/web-smoke.spec.js', 'tests/smoke/web-assets.spec.js', 'tests/smoke/chat-sala.spec.js'];
  for (const spec of SPECS) assert.ok(execs.some((e) => e.includes(spec)), `spec sumiu: ${spec}`);
  const grep = execs.map((e) => /--grep "([^"]+)"/.exec(e)?.[1]).filter(Boolean);
  const invert = execs.map((e) => /--grep-invert "([^"]+)"/.exec(e)?.[1]).filter(Boolean);
  assert.equal(grep.length, 1, 'um job, e só um, filtra o chat desktop');
  assert.deepEqual(invert, grep, 'o --grep-invert do outro job tem de ser a mesma string do --grep');
  const comGrep = execs.find((e) => e.includes('--grep "'));
  assert.ok(comGrep.includes('tests/smoke/chat-sala.spec.js'), 'o --grep do chat desktop não roda o chat-sala.spec.js');
  const comInvert = execs.find((e) => e.includes('--grep-invert'));
  for (const spec of SPECS) assert.ok(comInvert.includes(spec), `o job do --grep-invert perdeu ${spec}`);
  for (const e of execs) assert.match(e, /--config=playwright\.smoke\.config\.mjs/);
});
