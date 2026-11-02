import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const HAND_DEBT = Object.freeze({
  'RIG:pistol@pintura': Object.freeze({
    rigHash: 'f468adc9279d',
    motivo: '#1128 — coro/pistol-hires.glb (gold#pistol, servido quando o jogador pinta a pistola) '
      + 'traz a malha armmesh_Mat_0 do rig L da faca (R_wrist_026) com o material CoroSolto_FP_Gloves; a linha '
      + 'golden é o rig A da AK (Requests_Studio_Hands + .001). Conserto é re-rig do GLB no Blender, não arnês.',
  }),
});
export const HAND_INPUTS = ['tools/eval/vm-hand-continuity-check.mjs', 'tools/eval/vm-hand-continuity-support.mjs',
  'tools/eval/vm-hand-continuity-control.mjs', 'public/js/authoredvm.js', 'public/js/meleevm.js', 'public/js/vmhands.js',
  'public/js/weapons.js', 'public/js/factions.js', 'public/js/game.js', 'public/js/data/vmconfig.js',
  'public/js/data/vmfabrica.js', 'public/js/data/goldenver.js', 'public/vendor/three.module.js',
  'public/vendor/addons/loaders/GLTFLoader.js', 'public/vendor/addons/utils/SkeletonUtils.js',
  'tools/eval/vm-hand-three-hooks.mjs', 'tools/eval/vm-hand-three-register.mjs'];
export const hashHandInputs = root => Object.fromEntries(HAND_INPUTS.map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
export function parseHandOptions(args) {
  const options = { mutante: '', arma: 'm4', strict: false, json: false }, seen = new Set();
  for (const arg of args) {
    const match = /^--(mutante|arma)=([a-z0-9-]+)$/.exec(arg);
    const key = match?.[1] || (arg === '--json' ? 'json' : arg === '--exigir-catalogo' ? 'strict' : null);
    if (!key || seen.has(key)) throw Error(`CLI: flag inválida/repetida: ${arg}`);
    seen.add(key); options[key] = match ? match[2] : true;
  }
  if (options.mutante && !['luva-por-arma', 'pbr-por-arma', 'troca-rig', 'luva-crua', 'divida-paga'].includes(options.mutante)) throw Error('CLI: mutante desconhecido');
  return options;
}
export function readHandWeaponIds(root) {
  const source = fs.readFileSync(path.join(root, 'public/js/weapons.js'), 'utf8');
  const matches = [...source.matchAll(/export const WEAPON_IDS\s*=\s*(\[[\s\S]*?\]);/g)];
  if (matches.length !== 1 || !/^\[\s*(?:'[a-z0-9_]+'\s*,?\s*)+\]$/.test(matches[0][1])) throw Error('INFRA: WEAPON_IDS literal boundary changed');
  return JSON.parse(matches[0][1].replaceAll("'", '"').replace(/,\s*\]/, ']'));
}
const lstat = file => { try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const fail = why => { throw Error(`INFRA: three vendor local: ${why}`); };
export function ensureLocalThree(inputRoot) {
  const root = fs.realpathSync(inputRoot), vendor = path.join(root, 'public/vendor');
  for (const [file, directory] of [['three.module.js', false], ['addons', true], ['addons/loaders/GLTFLoader.js', false], ['addons/utils/SkeletonUtils.js', false]]) {
    const target = path.join(vendor, file), st = lstat(target);
    if (!st || st.isSymbolicLink() || (directory ? !st.isDirectory() : !st.isFile()) || fs.realpathSync(target) !== target) fail(`vendor local inválido: ${file}`);
  }
  return { owner: 'vendor-hooks-readonly/1', index: 'public/vendor/three.module.js', addons: 'public/vendor/addons' };
}
