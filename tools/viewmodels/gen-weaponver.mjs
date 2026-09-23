import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'public/js/data/weaponver.js');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
// `--so=grenade,...` regrava só essas famílias e preserva o resto do manifesto: um
// catálogo de revisão parcial não pode apagar a versão das famílias que ele não tem.
export async function gerar(so = []) {
  const worlds = {}, families = {};
  const worldRoot = path.join(root, 'public/models/weapons');
  for (const file of fs.readdirSync(worldRoot).filter(f => f.endsWith('.glb')).sort()) worlds[file.slice(0, -4)] = hash(path.join(worldRoot, file));
  const privateRoot = path.join(root, 'public/private-assets/viewmodels');
  if (!fs.existsSync(privateRoot)) throw Error('Catálogo privado ausente; preservar manifesto existente e gerar no checkout de assets.');
  for (const family of fs.readdirSync(privateRoot).sort()) {
    const file = path.join(privateRoot, family, `${family}-runtime.glb`);
    if (fs.existsSync(file)) families[family] = hash(file);
  }
  const expected = [...new Set([...Object.values(VM_WEAPON).map(c => c.family), 'grenade'])];
  if (so.length) {
    const atual = await import(`${pathToFileURL(output).href}?t=${Date.now()}`);
    const ausentes = so.filter(f => !families[f]);
    if (ausentes.length) throw Error(`Família pedida sem GLB no catálogo: ${ausentes.join(', ')}`);
    const escolhidas = Object.fromEntries(so.map(f => [f, families[f]]));
    for (const f of Object.keys(families)) delete families[f];
    Object.assign(families, atual.FAMILY_VER, escolhidas);
  }
  const missing = expected.filter(f => !families[f]);
  if (missing.length) throw Error(`Catálogo privado incompleto: ${missing.join(', ')}`);
  const ordenadas = Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b)));
  const text = '// GERADO por tools/viewmodels/gen-weaponver.mjs; revisão dos bytes, conforme BUG-157.\n'
    + `export const WORLD_VER = Object.freeze(${JSON.stringify(worlds, null, 2)});\n`
    + `export const FAMILY_VER = Object.freeze(${JSON.stringify(ordenadas, null, 2)});\n`;
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== text) fs.writeFileSync(output, text);
  return { worlds: Object.keys(worlds).length, families: Object.keys(families).length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const so = (process.argv.find(a => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
  console.log(JSON.stringify(await gerar(so)));
}
