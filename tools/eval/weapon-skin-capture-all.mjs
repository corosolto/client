#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEAPON_SKINS } from '../../public/js/data/weapon-skin-definitions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const capture = path.join(ROOT, 'tools/eval/weapon-skin-capture.mjs');
const checkOnly = process.argv.includes('--check');
const ids = Object.values(WEAPON_SKINS).map((skin) => skin.id).sort();
const started = Date.now();

for (const [index, skinId] of ids.entries()) {
  console.log(`[${index + 1}/${ids.length}] ${checkOnly ? 'check' : 'capture'} ${skinId}`);
  execFileSync(process.execPath, [capture, ...(checkOnly ? ['--check'] : [])], {
    cwd: ROOT,
    env: { ...process.env, SKIN_ID: skinId },
    stdio: 'inherit',
  });
}

console.log(JSON.stringify({ checked: checkOnly, skins: ids.length, seconds: Number(((Date.now() - started) / 1000).toFixed(1)) }, null, 2));
