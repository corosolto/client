#!/usr/bin/env node
// Structural coverage gate for the first-person viewmodel rollout.
// This deliberately does NOT declare visual approval: browser contact sheets and
// human review remain mandatory for each pilot and every specialized weapon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const source = fs.readFileSync(path.join(root, 'public/js/weapons.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'viewmodel-families.json'), 'utf8'));
const idsBody = source.match(/export const WEAPON_IDS\s*=\s*\[([\s\S]*?)\];/)?.[1];

if (!idsBody) throw new Error('WEAPON_IDS not found in public/js/weapons.js');
const sourceIds = [...idsBody.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
const seen = new Map();
const failures = [];

for (const [family, cfg] of Object.entries(manifest.families || {})) {
  if (!Array.isArray(cfg.members) || cfg.members.length === 0) failures.push(`${family}: no members`);
  if (!cfg.members?.includes(cfg.pilot)) failures.push(`${family}: pilot ${cfg.pilot} is not a member`);
  if (!Array.isArray(cfg.states) || cfg.states.length < 4) failures.push(`${family}: incomplete state matrix`);
  for (const id of cfg.members || []) {
    if (seen.has(id)) failures.push(`${id}: duplicated in ${seen.get(id)} and ${family}`);
    seen.set(id, family);
  }
}

for (const id of sourceIds) if (!seen.has(id)) failures.push(`${id}: missing family`);
for (const id of seen.keys()) if (!sourceIds.includes(id)) failures.push(`${id}: not present in WEAPON_IDS`);

if (failures.length) {
  console.error('VIEWMODEL FAMILY CONTRACT: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`VIEWMODEL FAMILY CONTRACT: STRUCTURAL PASS (${sourceIds.length} weapons, ${Object.keys(manifest.families).length} mechanical families)`);
console.log('Visual status: NOT EVALUATED — browser idle/fire/reload/ADS evidence is still required.');
