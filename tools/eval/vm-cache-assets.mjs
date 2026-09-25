import fs from 'node:fs';
import crypto from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD_VER, FAMILY_VER } from '../../public/js/data/weaponver.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';
const arg = n => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const mutant = arg('mutante');
async function runtime(file, replacement, extra = '') {
  const base = new URL(file, import.meta.url);
  if (!replacement && !extra) return import(base.href);
  let source = fs.readFileSync(base, 'utf8');
  if (replacement) {
    if (!source.includes(replacement[0])) throw Error('Mutação não encontrou expressão de produção');
    source = source.replace(replacement[0], replacement[1]);
  }
  source = source.replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) => {
    const absolute = specifier.startsWith('.') ? new URL(specifier, base).href : import.meta.resolve(specifier);
    return `from ${quote}${absolute}${quote}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(source + extra).toString('base64')}`);
}
const { preloadWeapons } = await runtime('../../public/js/weapons.js', mutant === 'world-congelado'
  ? ["WORLD_VER[src] || 'sem-versao'", "'congelado'"] : null);
const replacement = mutant === 'private-congelado' ? ['FAMILY_VER[family] || CATALOG_VERSION', 'CATALOG_VERSION']
  : mutant === 'private-bypass' ? ['return AUTHORED_VM_URLS[key];', 'return `/private-assets/viewmodels/${key}/${key}-runtime.glb?v=congelado`;'] : null;
const { loadFamilyGltf } = await runtime('../../public/js/authoredvm.js', replacement, '\nexport { loadFamilyGltf };');
const hash = file => {
  let bytes = fs.readFileSync(file);
  if (mutant === 'bytes-alterados' && file === 'public/models/weapons/deagle.glb') bytes = Buffer.concat([bytes, Buffer.from('mutacao')]);
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
};
const failures = [], requests = [];
const expectedFamilies = [...new Set([...Object.values(VM_WEAPON).map(c => c.family), 'grenade'])];
const original = GLTFLoader.prototype.load;
GLTFLoader.prototype.load = function(url, done) { requests.push(url); done({ scene: {} }); };
try {
  await preloadWeapons();
  for (const family of expectedFamilies) await loadFamilyGltf(family);
  for (const [weapon, config] of Object.entries(VM_WEAPON)) if (config.runtime === 'family') await loadFamilyGltf(`${config.family}#${weapon}`);
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
console.log(JSON.stringify({ ok: !failures.length, mutant, requests, failures }, null, 2));
if (failures.length) process.exitCode = 1;
