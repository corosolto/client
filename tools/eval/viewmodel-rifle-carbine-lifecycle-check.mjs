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
    const request = cycle * 3 + 1;
    const activeRequest = request + 1;
    if (accepts({ request, activeRequest, key: 'ar#carbine', activeKey: 'ar#carbine', utility: false })) {
      errors.push(`${aspect} ciclo ${cycle}: promise obsoleta aceita`);
    }
    const loading = decide({ alive: true, firstPerson: true, authoredReady: false });
    samples += 1;
    if (!exactlyOne(loading) || !loading.fallback) errors.push(`${aspect} ciclo ${cycle}: lacuna pré-load`);
    if (!accepts({ request: activeRequest, activeRequest, key: 'ar#carbine', activeKey: 'ar#carbine', utility: false })) {
      errors.push(`${aspect} ciclo ${cycle}: promise atual recusada`);
    }
    for (const event of ['idle', 'equip-start', 'equip-end', 'shoot-1', 'shoot-10',
      'reload-tactical-start', 'reload-tactical-end', 'reload-empty-start',
      'reload-empty-end', 'inspect-start', 'inspect-end', 'ads-in', 'ads-out',
      'reload-cancel-switch', 'reload-cancel-return']) {
      const state = mutateEvent(event, decide({ alive: true, firstPerson: true, authoredReady: true }));
      samples += 1;
      if (!exactlyOne(state) || !state.authored) errors.push(`${aspect} ciclo ${cycle}: sumiu em ${event}`);
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

check(AUTHORED_VM_ENABLED === false, 'ativação global continua desligada sem opt-in');
check(VM_FAMILY.ar.ready === false, 'família AR continua ready:false');
check(VM_WEAPON.carbine.baked === true, 'Carabina usa candidato baked por arma');
const baseline = matrix();
check(baseline.errors.length === 0, 'Carabina atravessa lifecycle 30x em 3:2 e 16:9', `${baseline.samples} amostras`);

const stale = matrix({ accepts: ({ key, activeKey, utility }) => key === activeKey && !utility });
check(stale.errors.length > 0, 'mutante que aceita Promise obsoleta reprova');
const preload = matrix({ decide: (input) => input.authoredReady ? viewmodelVisibility(input)
  : { root: true, melee: false, authored: false, fallback: false, scopeCovered: false } });
check(preload.errors.length > 0, 'mutante que cria lacuna pré-load reprova');
for (const event of ['equip-end', 'reload-empty-end', 'inspect-end', 'ads-out']) {
  const hidden = matrix({ mutateEvent: (current, state) => current === event
    ? { ...state, root: false, authored: false, fallback: false } : state });
  check(hidden.errors.length > 0, `mutante que oculta mount em ${event} reprova`);
}
const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length,
  cycles: 30, samples: baseline.samples, failed: failed.map((item) => item.label) }));
if (failed.length) process.exitCode = 1;
