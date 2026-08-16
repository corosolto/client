#!/usr/bin/env node
import fs from 'node:fs';

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const read = (file) => fs.readFileSync(file, 'utf8');
let characters = read('public/js/characters.js');
let glbchars = read('public/js/glbchars.js');
let main = read('public/js/main.js');
let site = read('src/data/jogo.ts');

if (mutant === 'raridade') characters = characters.replace("rarity: 'raro'", "rarity: 'comum'");
if (mutant === 'media') characters = characters.replace('attrs: { vida: 3, velocidade: 3, precisao: 3, meme: 3 }', 'attrs: { vida: 5, velocidade: 1, precisao: 5, meme: 1 }');
if (mutant === 'modelo') glbchars = glbchars.replace("zumbibombado: 'bombado'", "zumbibombado: 'fantasma'");

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const roster = characters.match(/export const CHARACTERS = \[([\s\S]*?)\n\];\nexport const byId/)?.[1] || '';
const zombie = roster.match(/\{ id: 'zumbibombado',[\s\S]*?\n\s*pal: \{[^}]+\} \}/)?.[0] || '';

expect(zombie.includes("team: 'E'"), 'ZUMB1 cadastro jogável no Time E');
expect(zombie.includes("name: 'Zumbi Bombado'"), 'ZUMB2 nome público');
expect(zombie.includes("rarity: 'raro'"), 'ZUMB3 raridade explícita RARO');
expect(zombie.includes('attrs: { vida: 3, velocidade: 3, precisao: 3, meme: 3 }'), 'ZUMB4 atributos iguais à média arredondada 3/3/3/3');
expect(/zumbibombado:\s*'ak'/.test(characters), 'ZUMB5 arma inicial registrada');
expect(/GLB_CHARS[\s\S]*?'zumbibombado'/.test(glbchars), 'ZUMB6 modelo incluído no preload');
expect(/zumbibombado:\s*'bombado'/.test(glbchars), 'ZUMB7 fonte GLB doadora declarada');
expect(/c\.attrs\?\./.test(main) && /c\.rarity/.test(main), 'ZUMB8 ficha honra atributos e raridade autorados');
expect(/id: 'zumbibombado', faccao: 'E', nome: 'Zumbi Bombado'/.test(site), 'ZUMB9 espelho público sincronizado');

if (failures.length) {
  for (const failure of failures) console.error(`ZUMB FALHA — ${failure}`);
  process.exit(1);
}
console.log('ZUMB PASSA — Zumbi Bombado raro · média 3/3/3/3 · Time E · GLB doador bombado');
