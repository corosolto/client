#!/usr/bin/env node
import { acceptsAuthoredLoad, AUTHORED_VM_ENABLED } from '../../public/js/authoredvm.js';
import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';
import { viewmodelVisibility } from '../../public/js/vmvisibility.js';

const checks = [];
const check = (ok, label, detail = '') => { checks.push({ ok: Boolean(ok), label }); console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`); };
const exactlyOne = (state) => Number(state.authored) + Number(state.fallback) === 1;
const WEAPONS = [{ weapon: 'rem700', key: 'bolt#rem700' }, { weapon: 'g3sg1', key: 'g3#g3sg1' }];

function matrix({ decide = viewmodelVisibility, accepts = acceptsAuthoredLoad,
  mutateEvent = (_weapon, _event, state) => state } = {}) {
  const errors = []; let samples = 0;
  for (const { weapon, key } of WEAPONS) for (let cycle = 0; cycle < 30; cycle += 1) {
    const aspect = cycle % 2 ? '1440x810' : '1440x960';
    const request = cycle * 3 + 1; const activeRequest = request + 1;
    if (accepts({ request, activeRequest, key, activeKey: key, utility: false })) errors.push(`${weapon}/${aspect}: Promise obsoleta aceita`);
    const loading = decide({ alive: true, firstPerson: true, authoredReady: false }); samples += 1;
    if (!exactlyOne(loading) || !loading.fallback) errors.push(`${weapon}/${aspect}: lacuna pré-load`);
    if (!accepts({ request: activeRequest, activeRequest, key, activeKey: key, utility: false })) errors.push(`${weapon}/${aspect}: Promise atual recusada`);
    for (const event of ['idle','draw-start','draw-end','shoot-start','shoot-end','reload-start','reload-loop','reload-end','inspect-start','inspect-end','ads-in','ads-out','switch-cancel','return']) {
      const state = mutateEvent(weapon, event, decide({ alive: true, firstPerson: true, authoredReady: true })); samples += 1;
      if (!exactlyOne(state) || !state.authored) errors.push(`${weapon}/${aspect}: sumiu em ${event}`);
    }
    for (const state of [decide({ alive: false, firstPerson: true, authoredReady: true }), decide({ alive: true, firstPerson: false, authoredReady: true })]) {
      samples += 1; if (state.root || state.authored || state.fallback || state.melee) errors.push(`${weapon}/${aspect}: primeira pessoa visível fora do estado válido`);
    }
  }
  return { errors, samples };
}

check(AUTHORED_VM_ENABLED === false, 'ativação global continua desligada sem opt-in');
check(VM_FAMILY.bolt.ready === false && VM_FAMILY.g3.ready === false, 'famílias DMR continuam ready:false');
check(VM_WEAPON.rem700.baked === true && VM_WEAPON.g3sg1.baked === true, 'DMRs usam candidatas baked por arma');
const baseline = matrix(); check(baseline.errors.length === 0, 'DMRs atravessam lifecycle 30x em 3:2 e 16:9', `${baseline.samples} amostras`);
check(matrix({ accepts: ({ key, activeKey, utility }) => key === activeKey && !utility }).errors.length > 0, 'mutante que aceita Promise obsoleta reprova');
check(matrix({ decide: (input) => input.authoredReady ? viewmodelVisibility(input) : { root: true, melee: false, authored: false, fallback: false } }).errors.length > 0, 'mutante que cria lacuna pré-load reprova');
for (const event of ['draw-end','shoot-end','reload-loop','inspect-end','ads-out']) check(matrix({ mutateEvent: (_weapon, current, state) => current === event ? { ...state, root: false, authored: false, fallback: false } : state }).errors.length > 0, `mutante que oculta mount em ${event} reprova`);
const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length, cyclesPerWeapon: 30, samples: baseline.samples, failed: failed.map((item) => item.label) }));
if (failed.length) process.exitCode = 1;
