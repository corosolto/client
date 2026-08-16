#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const read = (file) => fs.readFileSync(file, 'utf8');
let characters = read('public/js/characters.js');
let glbchars = read('public/js/glbchars.js');
let main = read('public/js/main.js');
let site = read('src/data/jogo.ts');
let mounttest = read('public/mounttest.html');
const staticAudit = JSON.parse(read('tools/eval/redesign-static-audit.json'));
const avatarHash = createHash('sha256').update(fs.readFileSync('public/img/chars/avatars/musculoso.webp')).digest('hex');

if (mutant === 'raridade') characters = characters.replace("rarity: 'raro'", "rarity: 'comum'");
if (mutant === 'media') characters = characters.replace('attrs: { vida: 3, velocidade: 3, precisao: 3, meme: 3 }', 'attrs: { vida: 5, velocidade: 1, precisao: 5, meme: 1 }');
if (mutant === 'modelo') glbchars = glbchars.replace("musculoso: 'bombado'", "musculoso: 'fantasma'");

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const roster = characters.match(/export const CHARACTERS = \[([\s\S]*?)\n\];\nexport const byId/)?.[1] || '';
const muscular = roster.match(/\{ id: 'musculoso',[\s\S]*?\n\s*pal: \{[^}]+\} \}/)?.[0] || '';

expect(muscular.includes("team: 'E'"), 'MUSC1 cadastro jogável no Time E');
expect(muscular.includes("name: 'Musculoso'"), 'MUSC2 nome público');
expect(muscular.includes("rarity: 'raro'"), 'MUSC3 raridade explícita RARO');
expect(muscular.includes('attrs: { vida: 3, velocidade: 3, precisao: 3, meme: 3 }'), 'MUSC4 atributos iguais à média arredondada 3/3/3/3');
expect(/musculoso:\s*'m4'/.test(characters), 'MUSC5 usa a mesma arma da Doutora do SUS');
expect(/GLB_CHARS[\s\S]*?'musculoso'/.test(glbchars), 'MUSC6 modelo incluído no preload');
expect(/musculoso:\s*'bombado'/.test(glbchars), 'MUSC7 fonte GLB doadora declarada');
expect(/c\.attrs\?\./.test(main) && /c\.rarity/.test(main), 'MUSC8 ficha honra atributos e raridade autorados');
expect(/id: 'musculoso', faccao: 'E', nome: 'Musculoso'/.test(site), 'MUSC9 espelho público sincronizado');
expect(!/zumbibombado|Zumbi Bombado|zombieGymKit/.test(characters + glbchars + site), 'MUSC10 identidade antiga e halter removidos');
expect(/CHAR_GRIP_REFERENCE[\s\S]*musculoso:\s*'doutora'/.test(glbchars), 'MUSC11 perfil de pegada referencia a Doutora do SUS');
expect(!/MUSCULOSO_GRIP_CURL/.test(glbchars), 'MUSC12 usa o fechamento padrão da referência');
expect(/const SHOT = qp\.get\('shot'\)/.test(mounttest) && /SHOT === 'busto'/.test(mounttest) && /qp\.get\('weapon'\) !== '0'/.test(mounttest), 'MUSC13 arnês oferece retrato frontal de busto sem arma reproduzível');
expect(staticAudit.musculosoAvatarReference === 'public/mounttest.html?char=musculoso&weapon=0&view=front&shot=busto' && staticAudit.musculosoAvatarSha256 === avatarHash, 'MUSC14 avatar publicado corresponde ao busto frontal auditado');

if (failures.length) {
  for (const failure of failures) console.error(`MUSC FALHA — ${failure}`);
  process.exit(1);
}
console.log('MUSC PASSA — Musculoso raro · média 3/3/3/3 · Time E · pegada corrigida');
