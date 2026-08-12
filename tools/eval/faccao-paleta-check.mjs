/* faccao-paleta-check.mjs - REGISTRO cobre elenco e todos os consumidores.
   -----------------------------------------------------------------------
   O caso original de 07/08 foi Time E ausente em tres espelhos de cor. Em 09/08 os
   espelhos foram removidos: `public/js/factions.js` virou a fonte importada por jogo,
   personagem e bandeira. A regua agora garante a arquitetura que impede reincidencia.

   MUTACOES:
     --mutar=sem-e       remove E do registro em memoria -> F1 vermelho
     --mutar=cor-errada  iguala E a U -> F3 vermelho por cores indistinguiveis
*/
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MUTAR = ((process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '');
const src = (path) => fs.readFileSync(path, 'utf8');
const mod = await import(`${pathToFileURL('public/js/factions.js')}?audit=${Date.now()}`);
let faccoes = mod.FACTIONS.map((f) => ({ ...f }));
if (MUTAR === 'sem-e') faccoes = faccoes.filter((f) => f.id !== 'E');
if (MUTAR === 'cor-errada') faccoes.find((f) => f.id === 'E').color = faccoes.find((f) => f.id === 'U').color;
const byId = new Map(faccoes.map((f) => [f.id, f]));
const elenco = [...src('public/js/characters.js').matchAll(/team\s*:\s*'([A-Z])'/g)].map((m) => m[1]);
const rosterIds = [...new Set(elenco)].sort();

console.log(`REGUA DA PALETA DE FACCAO${MUTAR ? ` [MUTACAO: ${MUTAR}]` : ''}`);
console.log(`elenco declara ${rosterIds.length} faccoes: ${rosterIds.join(', ')}\n`);

console.log('F1 - toda faccao do elenco existe no registro');
const missing = rosterIds.filter((id) => !byId.has(id));
console.log(`   ${missing.length ? `FALTA ${missing.join(', ')}` : 'ok'}`);
const f1 = missing.length === 0;
console.log(`   ${f1 ? 'PASSA' : 'FALHA'}\n`);

console.log('F2 - jogo, personagem e bandeira importam a fonte unica');
const consumers = [
  ['game.js', 'public/js/game.js', /from\s*['"]\.\/factions\.js['"]/],
  ['characters.js', 'public/js/characters.js', /from\s*['"]\.\/factions\.js['"]/],
  ['brasoes.js', 'public/js/brasoes.js', /from\s*['"]\.\/factions\.js['"]/],
];
let f2 = true;
for (const [label, path, pattern] of consumers) {
  const ok = pattern.test(src(path)); f2 &&= ok;
  console.log(`   ${label.padEnd(16)} ${ok ? 'ok' : 'FALTA IMPORT'}`);
}
console.log(`   ${f2 ? 'PASSA' : 'FALHA'}\n`);

console.log('F3 - cores claras/escuras sao hex validos e a cor principal distingue faccoes');
const hex = /^#[0-9a-f]{6}$/i;
const invalid = faccoes.filter((f) => !hex.test(f.color) || !hex.test(f.dark) || !hex.test(f.ink)).map((f) => f.id);
const duplicate = [];
const seen = new Map();
for (const f of faccoes) {
  const owner = seen.get(f.color.toLowerCase());
  if (owner) duplicate.push(`${owner}/${f.id}`); else seen.set(f.color.toLowerCase(), f.id);
}
const f3 = invalid.length === 0 && duplicate.length === 0;
console.log(`   invalidas: ${invalid.join(', ') || '0'}; duplicadas: ${duplicate.join(', ') || '0'}`);
console.log(`   ${f3 ? 'PASSA' : 'FALHA'}\n`);

const pass = f1 && f2 && f3;
console.log(pass ? 'OK FAC1 registro e paleta de faccao coerentes' : 'X FAC1 faccao sem registro ou consumidor fora da fonte unica');
process.exit(pass ? 0 : 1);
