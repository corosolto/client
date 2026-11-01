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
  'public/vendor/addons/loaders/GLTFLoader.js', 'public/vendor/addons/utils/SkeletonUtils.js'];
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
const fail = why => { throw Error(`INFRA: three local ownership: ${why}`); };
const schema = 'csbrasil-owned-three-shim/1';
const packageText = JSON.stringify({ name: 'three', version: '0.160.0', type: 'module', main: 'index.js', exports: { '.': './index.js', './addons/*': './addons/*' } });
export function ensureLocalThree(inputRoot) {
  const root = fs.realpathSync(inputRoot), vendor = path.join(root, 'public/vendor');
  for (const [file, directory] of [['three.module.js', false], ['addons', true], ['addons/loaders/GLTFLoader.js', false], ['addons/utils/SkeletonUtils.js', false]]) {
    const target = path.join(vendor, file), st = lstat(target);
    if (!st || st.isSymbolicLink() || (directory ? !st.isDirectory() : !st.isFile()) || fs.realpathSync(target) !== target) fail(`vendor local inválido: ${file}`);
  }
  const modules = path.join(root, 'node_modules'), moduleStat = lstat(modules);
  if (moduleStat && (!moduleStat.isDirectory() || moduleStat.isSymbolicLink() || fs.realpathSync(modules) !== modules)) fail('node_modules não é diretório próprio');
  const shim = path.join(modules, 'three'), current = lstat(shim);
  if (current && (!current.isDirectory() || current.isSymbolicLink())) fail('three é link/pacote externo; nada foi alterado');
  const marker = path.join(shim, '.csbrasil-owned-shim.json'), pkg = path.join(shim, 'package.json');
  const expectedLinks = { 'index.js': '../../public/vendor/three.module.js', addons: '../../public/vendor/addons' };
  if (current) {
    const st = lstat(marker);
    if (!st) {
      // Pontes locais de harness/invariants são somente leitura; nunca adotar ou reparar legado.
      if (JSON.stringify(fs.readdirSync(shim).sort()) !== JSON.stringify(['addons', 'index.js', 'package.json'])) fail('shim sem marcador de posse');
      const ps = lstat(pkg);
      if (!ps?.isFile() || ps.isSymbolicLink() || fs.realpathSync(pkg) !== pkg || fs.readFileSync(pkg, 'utf8') !== packageText) fail('package legado desconhecido');
      for (const [name, target] of Object.entries(expectedLinks)) {
        const entry = path.join(shim, name), link = lstat(entry);
        if (!link?.isSymbolicLink() || path.resolve(shim, fs.readlinkSync(entry)) !== path.resolve(shim, target)
          || fs.realpathSync(entry) !== path.resolve(shim, target)) fail(`legado estrangeiro/incompleto: ${name}`);
      }
      return { owner: 'verified-local-legacy-readonly/1', index: 'public/vendor/three.module.js', addons: 'public/vendor/addons' };
    }
    if (!st.isFile() || st.isSymbolicLink() || fs.realpathSync(marker) !== marker) fail('marcador de posse inválido');
    const owner = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (owner.schema !== schema || Object.keys(owner).length !== 1) fail('marcador desconhecido');
    if (fs.readdirSync(shim).some(name => !['package.json', '.csbrasil-owned-shim.json', 'index.js', 'addons'].includes(name))) fail('filhos desconhecidos');
    const ps = lstat(pkg);
    if (ps && (!ps.isFile() || ps.isSymbolicLink() || fs.realpathSync(pkg) !== pkg || fs.readFileSync(pkg, 'utf8') !== packageText)) fail('package desconhecido');
    for (const [name, target] of Object.entries(expectedLinks)) {
      const entry = path.join(shim, name), st = lstat(entry);
      if (st && (!st.isSymbolicLink() || path.resolve(shim, fs.readlinkSync(entry)) !== path.resolve(shim, target))) fail(`entrada desconhecida: ${name}`);
    }
  }
  // Todas as fronteiras são validadas antes de criar somente os filhos ausentes do shim próprio.
  if (!moduleStat) fs.mkdirSync(modules);
  if (!current) {
    fs.mkdirSync(shim);
    fs.writeFileSync(marker, JSON.stringify({ schema }), { flag: 'wx' });
  }
  if (!lstat(pkg)) fs.writeFileSync(pkg, packageText, { flag: 'wx' });
  for (const [name, target] of Object.entries(expectedLinks)) if (!lstat(path.join(shim, name))) fs.symlinkSync(target, path.join(shim, name), name === 'addons' ? 'dir' : 'file');
  for (const [name, target] of Object.entries(expectedLinks)) if (fs.realpathSync(path.join(shim, name)) !== path.resolve(shim, target)) fail(`resolução estrangeira: ${name}`);
  return { owner: schema, index: 'public/vendor/three.module.js', addons: 'public/vendor/addons' };
}
