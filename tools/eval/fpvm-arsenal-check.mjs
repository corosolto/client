/* Garante que nenhuma das armas jogáveis volte para uma mão/recarga genérica.
   Uso: node tools/eval/fpvm-arsenal-check.mjs [--mutante=remove:<id>] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const registryPath = path.join(ROOT, 'tools/blender/fpvm-arsenal.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const source = fs.readFileSync(path.join(ROOT, 'public/js/weapons.js'), 'utf8');
const idsMatch = source.match(/export const WEAPON_IDS\s*=\s*\[([\s\S]*?)\];/);
if (!idsMatch) throw new Error('WEAPON_IDS não encontrado em public/js/weapons.js');
const ids = [...idsMatch[1].matchAll(/'([a-z0-9]+)'/g)].map(m => m[1]);

const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice('--mutante='.length);
if (mutation?.startsWith('remove:')) delete registry.weapons[mutation.slice(7)];

const fail = [];
for (const id of ids) {
  const entry = registry.weapons[id];
  if (!entry) { fail.push(`${id}: sem ficha FP`); continue; }
  if (!entry.family || entry.family === 'default') fail.push(`${id}: família genérica`);
  if (!Array.isArray(entry.clips) || entry.clips.length < 6) fail.push(`${id}: clips insuficientes`);
  if (id === 'knife') {
    if (!entry.clips?.includes('attack_primary') || !entry.clips?.includes('attack_secondary')) fail.push('knife: ataques ausentes');
  } else if (!entry.clips?.some(clip => clip.startsWith('reload_'))) {
    fail.push(`${id}: reload ausente`);
  }
  if (id !== 'knife' && (!Array.isArray(entry.parts) || entry.parts.length === 0)) fail.push(`${id}: peça móvel ausente`);
}
for (const id of Object.keys(registry.weapons)) if (!ids.includes(id)) fail.push(`${id}: não é arma jogável`);

if (fail.length) {
  console.error(`FALHA FPVM: ${fail.join(' | ')}`);
  process.exit(1);
}
console.log(`PASSA FPVM: ${ids.length}/${ids.length} armas jogáveis têm família, clips e peças móveis declarados.`);
