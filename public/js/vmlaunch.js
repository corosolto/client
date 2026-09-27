// Seletor único do runtime de viewmodel: autorado (braços K) ou legado (fparms).
// Tudo-ou-nada em produção; régua e mutantes em tools/eval/vm-launch-check.mjs.
import { VM_FAMILY, VM_WEAPON, VM_MELEE, VM_LAUNCH } from './data/vmconfig.js';
import { WEAPON_IDS } from './weapons.js';

// A granada não está no WEAPON_IDS, mas o arremesso autorado também mostra braços.
export const VM_LAUNCH_IDS = Object.freeze([...WEAPON_IDS, 'grenade']);

export function vmWeaponReady(id, config = { VM_FAMILY, VM_WEAPON, VM_MELEE }) {
  if (config.VM_MELEE?.[id]) return config.VM_MELEE[id].ready === true;
  if (id === 'grenade') return config.VM_FAMILY?.grenade?.ready === true;
  const weapon = config.VM_WEAPON?.[id];
  if (!weapon) return false;
  return config.VM_FAMILY?.[weapon.family]?.ready === true && weapon.ready !== false;
}

// `?vmauthored=1` é revisão (o portão por arma continua valendo); `=0` é kill-switch.
export function vmLaunchDecision({
  launch = VM_LAUNCH,
  ids = VM_LAUNCH_IDS,
  ready = (id) => vmWeaponReady(id),
  search = '',
} = {}) {
  const query = new URLSearchParams(search || '').get('vmauthored');
  const notReady = ids.filter((id) => !ready(id));
  if (query === '0') return { active: false, mode: 'desligado', notReady };
  if (query === '1') return { active: true, mode: 'revisao', notReady };
  const active = launch === true && ids.length > 0 && notReady.length === 0;
  return { active, mode: active ? 'lancamento' : 'legado', notReady };
}

export const VM_RUNTIME = Object.freeze(vmLaunchDecision({
  search: typeof window !== 'undefined' ? window.location?.search : '',
}));
