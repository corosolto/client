import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import crypto from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD_VER, FAMILY_VER } from '../../public/js/data/weaponver.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';
import { VM_BYTES } from '../../public/js/data/vmbytes.js';
import { SHARED_VER } from '../../public/js/data/vmsharedver.js';
import { SHARED_REQUIRED } from '../viewmodels/gen-vmsharedver.mjs';
const arg = n => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const mutant = arg('mutante');
const MUTANTS = ['world-congelado', 'private-congelado', 'familia-congelada', 'private-bypass', 'bytes-alterados',
  'entrada-ausente', 'produto-reassado', 'shared-congelado', 'shared-reexportado'];
if (process.argv.includes('--mutantes')) {
  const vivos = MUTANTS.filter((m) => spawnSync(process.execPath, [new URL(import.meta.url).pathname, `--mutante=${m}`], { encoding: 'utf8' }).status === 0);
  const base = spawnSync(process.execPath, [new URL(import.meta.url).pathname], { encoding: 'utf8' });
  console.log(JSON.stringify({ ok: base.status === 0 && !vivos.length, base: base.status === 0, mutantes: MUTANTS.length, vivos }));
  process.exit(base.status === 0 && !vivos.length ? 0 : 1);
}
if (mutant && !MUTANTS.includes(mutant)) throw Error(`mutante desconhecido ${mutant}`);
async function runtime(file, replacement, extra = '') {
  const base = new URL(file, import.meta.url);
  if (!replacement && !extra) return import(base.href);
  let source = fs.readFileSync(base, 'utf8');
  for (const [from, to] of (replacement && typeof replacement[0] === 'string' ? [replacement] : replacement || [])) {
    if (!source.includes(from)) throw Error('Mutação não encontrou expressão de produção');
    source = source.replace(from, to);
  }
  source = source.replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) => {
    const absolute = specifier.startsWith('.') ? new URL(specifier, base).href : import.meta.resolve(specifier);
    return `from ${quote}${absolute}${quote}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(source + extra).toString('base64')}`);
}
const { preloadWeapons } = await runtime('../../public/js/weapons.js', mutant === 'world-congelado'
  ? ["WORLD_VER[src] || 'sem-versao'", "'congelado'"] : null);
// Produto K por arma versiona por VM_BYTES; família crua (arma não assada e granada) por FAMILY_VER.
const replacement = mutant === 'private-congelado' ? ["VM_BYTES[weapon] || 'sem-versao'", 'CATALOG_VERSION']
  : mutant === 'familia-congelada' ? ['FAMILY_VER[family] || CATALOG_VERSION', 'CATALOG_VERSION']
  : mutant === 'private-bypass' ? ['return AUTHORED_VM_URLS[key];', 'return `/private-assets/viewmodels/${key}/${key}-runtime.glb?v=congelado`;'] : null;
const { loadFamilyGltf } = await runtime('../../public/js/authoredvm.js', replacement, '\nexport { loadFamilyGltf };');
const hash = file => {
  let bytes = fs.readFileSync(file);
  if (mutant === 'bytes-alterados' && file === 'public/models/weapons/deagle.glb') bytes = Buffer.concat([bytes, Buffer.from('mutacao')]);
  if (mutant === 'produto-reassado' && file.endsWith('/uzi-baked-runtime.glb')) bytes = Buffer.concat([bytes, Buffer.from('mutacao')]);
  if (mutant === 'shared-reexportado' && file.endsWith('/shared/general-runtime.glb')) bytes = Buffer.concat([bytes, Buffer.from('mutacao')]);
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
};
const failures = [], requests = [];
const baked = Object.entries(VM_WEAPON).filter(([, c]) => c.baked === true && c.golden !== true);
const expectedFamilies = [...new Set([...Object.values(VM_WEAPON).filter(c => c.baked !== true).map(c => c.family), 'grenade'])];
const original = GLTFLoader.prototype.load;
GLTFLoader.prototype.load = function(url, done) { requests.push(url); done({ scene: {} }); };
try {
  await preloadWeapons();
  for (const family of expectedFamilies) await loadFamilyGltf(family);
  for (const [weapon, config] of baked) await loadFamilyGltf(`${config.family}#${weapon}`);
} finally { GLTFLoader.prototype.load = original; }
const worldManifest = { ...WORLD_VER };
if (mutant === 'entrada-ausente') delete worldManifest.ak;
for (const file of fs.readdirSync('public/models/weapons').filter(f => f.endsWith('.glb'))) {
  const weapon = file.slice(0, -4);
  if (worldManifest[weapon] !== hash(`public/models/weapons/${file}`)) failures.push(`bytes:world:${weapon}`);
}
for (const url of requests.filter(u => u.startsWith('models/weapons/'))) {
  const weapon = /weapons\/(.+)\.glb\?/.exec(url)?.[1];
  if (!WORLD_VER[weapon] || !url.endsWith(`?v=${hash(`public/models/weapons/${weapon}.glb`)}`)) failures.push(`use:world:${weapon}`);
}
for (const family of expectedFamilies) {
  const urls = requests.filter(u => u.includes(`/viewmodels/${family}/${family}-runtime.glb?`));
  if (!FAMILY_VER[family] || !urls.length || urls.some(u => !u.endsWith(`?v=${FAMILY_VER[family]}`))) failures.push(`use:private:${family}`);
  const file = `public/private-assets/viewmodels/${family}/${family}-runtime.glb`;
  if (fs.existsSync(file)) {
    if (FAMILY_VER[family] !== hash(file)) failures.push(`bytes:private:${family}`);
  }
}
for (const [weapon, config] of baked) {
  const name = config.runtime === 'family' ? `${config.family}-runtime.glb` : `${weapon}-baked-runtime.glb`;
  const urls = requests.filter(u => u.includes(`/viewmodels/${config.family}/${name}?`));
  if (!VM_BYTES[weapon] || !urls.length || urls.some(u => !u.endsWith(`?v=${VM_BYTES[weapon]}`))) failures.push(`use:product:${weapon}`);
  const file = `public/private-assets/viewmodels/${config.family}/${name}`;
  if (fs.existsSync(file) && VM_BYTES[weapon] !== hash(file)) failures.push(`bytes:product:${weapon}`);
}
// Compartilhados: os três carregadores REAIS do runtime, com o portão de node/chave aberto.
const sharedSwap = [
  ['const NODE_RUNTIME = typeof process', 'const NODE_RUNTIME = false && typeof process'],
  ['const AUTHORED_KILLED = !AUTHORED_VM_ENABLED;', 'const AUTHORED_KILLED = false;'],
  ...(mutant === 'shared-congelado' ? [["SHARED_VER[name] || 'sem-versao'", 'CATALOG_VERSION']] : []),
];
const shared = await runtime('../../public/js/authoredvm.js', sharedSwap, '\nexport { sharedArmTextures, generalMotions, recoilParams };');
const sharedRequests = [];
const stubs = [[THREE.TextureLoader.prototype, 'loadAsync', () => new THREE.Texture()], [GLTFLoader.prototype, 'loadAsync', () => ({ animations: [] })]];
const saved = stubs.map(([proto, key]) => proto[key]);
const savedFetch = globalThis.fetch;
stubs.forEach(([proto, key, make]) => { proto[key] = function (url) { sharedRequests.push(url); return Promise.resolve(make()); }; });
globalThis.fetch = (url) => { sharedRequests.push(url); return Promise.resolve({ ok: false }); };
try {
  await Promise.all([shared.sharedArmTextures(), shared.generalMotions(), shared.recoilParams()]);
} finally {
  stubs.forEach(([proto, key], i) => { proto[key] = saved[i]; });
  globalThis.fetch = savedFetch;
}
for (const name of SHARED_REQUIRED) {
  const urls = sharedRequests.filter((u) => u.startsWith(`/private-assets/viewmodels/${name}?`));
  if (!SHARED_VER[name] || !urls.length || urls.some((u) => !u.endsWith(`?v=${SHARED_VER[name]}`))) failures.push(`use:shared:${name}`);
  const file = `public/private-assets/viewmodels/${name}`;
  if (fs.existsSync(file) && SHARED_VER[name] !== hash(file)) failures.push(`bytes:shared:${name}`);
}
requests.push(...sharedRequests);
console.log(JSON.stringify({ ok: !failures.length, mutant, requests, failures }, null, 2));
if (failures.length) process.exitCode = 1;
