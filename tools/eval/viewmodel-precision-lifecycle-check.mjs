#!/usr/bin/env node
import { acceptsAuthoredLoad, AUTHORED_VM_ENABLED } from '../../public/js/authoredvm.js';
import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';
import { viewmodelVisibility } from '../../public/js/vmvisibility.js';

const checks = [];
const check = (ok, label, detail = '') => {
  checks.push({ ok: Boolean(ok), label, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};
const exactlyOne = (state) => Number(state.authored) + Number(state.fallback) === 1;

function matrix({ decide = viewmodelVisibility, accepts = acceptsAuthoredLoad,
  mutateEvent = (_event, state) => state } = {}) {
  const errors = [];
  let samples = 0;
  for (let cycle = 0; cycle < 30; cycle += 1) {
    const aspect = cycle % 2 ? '1440x810' : '1440x960';
    const request = cycle * 4 + 2;
    const activeRequest = request + 1;
    const staleAccepted = accepts({ request, activeRequest, key: 'svd#svd',
      activeKey: 'svd#svd', utility: false });
    if (staleAccepted) errors.push(`${aspect} ciclo ${cycle}: promise obsoleta aceita`);

    const beforeLoad = decide({ alive: true, firstPerson: true, authoredReady: false });
    samples += 1;
    if (!exactlyOne(beforeLoad) || !beforeLoad.fallback) errors.push(`${aspect} ciclo ${cycle}: lacuna pré-load`);

    const freshAccepted = accepts({ request: activeRequest, activeRequest, key: 'svd#svd',
      activeKey: 'svd#svd', utility: false });
    if (!freshAccepted) errors.push(`${aspect} ciclo ${cycle}: promise atual recusada`);

    for (const event of ['idle', 'shoot-1', 'shoot-10', 'reload-tactical-start',
      'reload-tactical-end', 'reload-empty-start', 'reload-empty-end', 'reload-cancel-switch',
      'reload-cancel-return']) {
      const state = mutateEvent(event, decide({ alive: true, firstPerson: true, authoredReady: true }));
      samples += 1;
      if (!exactlyOne(state) || !state.authored) errors.push(`${aspect} ciclo ${cycle}: sumiu em ${event}`);
    }

    for (const mask of [0, 0.54, 0.55, 0.551, 1, 0.551, 0.55, 0.54, 0]) {
      const state = decide({ alive: true, firstPerson: true, realScope: true,
        scopeMask: mask, authoredReady: true });
      samples += 1;
      if (mask <= 0.55 && (!exactlyOne(state) || !state.authored)) {
        errors.push(`${aspect} ciclo ${cycle}: lacuna no limite ${mask}`);
      }
      if (mask > 0.55 && (!state.scopeCovered || state.authored || state.fallback)) {
        errors.push(`${aspect} ciclo ${cycle}: overlay não domina em ${mask}`);
      }
    }

    for (const [event, state] of [
      ['morto', decide({ alive: false, firstPerson: true, authoredReady: true })],
      ['terceira-pessoa', decide({ alive: true, firstPerson: false, authoredReady: true })],
    ]) {
      samples += 1;
      if (state.root || state.authored || state.fallback || state.melee) {
        errors.push(`${aspect} ciclo ${cycle}: primeira pessoa visível em ${event}`);
      }
    }
  }
  return { errors, samples };
}

check(AUTHORED_VM_ENABLED === false, 'ativação global segue desligada em ambiente sem opt-in');
check(['bolt', 'svd', 'marksman'].every((family) => VM_FAMILY[family].ready === false),
  'três famílias de precisão permanecem ready:false');
check(['mosin', 'svd', 'sks'].every((weapon) => VM_WEAPON[weapon].baked === true),
  'três candidatos usam contrato baked próprio');

const baseline = matrix();
check(baseline.errors.length === 0, 'SVD atravessa lifecycle/reload 30x em 3:2 e 16:9',
  `${baseline.samples} amostras`);

const thresholdMutant = matrix({ decide: (input) => {
  const state = viewmodelVisibility(input);
  if (input.realScope && input.scopeMask === 0.55) {
    return { ...state, root: false, authored: false, fallback: false, scopeCovered: true };
  }
  return state;
} });
check(thresholdMutant.errors.length > 0, 'mutante de comparação assimétrica em 0,55 reprova');

const staleMutant = matrix({ accepts: ({ key, activeKey, utility }) => key === activeKey && !utility });
check(staleMutant.errors.length > 0, 'mutante que aceita Promise obsoleta reprova');

const preLoadMutant = matrix({ decide: (input) => input.authoredReady
  ? viewmodelVisibility(input)
  : { root: true, melee: false, authored: false, fallback: false, scopeCovered: false } });
check(preLoadMutant.errors.length > 0, 'mutante que oculta fallback antes do load reprova');

for (const event of ['shoot-1', 'reload-tactical-end', 'reload-cancel-return']) {
  const hidden = matrix({ mutateEvent: (current, state) => current === event
    ? { ...state, root: false, authored: false, fallback: false } : state });
  check(hidden.errors.length > 0, `mutante que oculta mount em ${event} reprova`);
}

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length,
  samples: baseline.samples, cycles: 30, failed: failed.map((x) => x.label) }));
if (failed.length) process.exitCode = 1;
