/* Nick de 2 a 32 em toda superfície do cliente (pedido do dono, 14/10/2026). O banco, a API e o
   nó levam o mesmo teto no backend (migration 065, api/reguas/nick-limit-check.mjs de lá).
   NL1 · NICK_RE do chat: 32 entra, 33 não, charset igual
   NL2 · formulários (conta, perfil, menu, clã) aceitam 32 e não 33; a dica diz "2 a 32"
   NL3 · cortes do jogo, badge e cartão de perfil não cortam abaixo de 32
   NL4 · killfeed e tela de morte escapam o nome (32 caracteres cabem uma tag com onload)
   Mutantes: node tools/eval/nick-limit-check.mjs --mutante=<nome> tem de reprovar. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const MUTANTES = {
  'chat-14': ['public/js/chat.js', '{2,32}$/;', '{2,14}$/;'],
  'conta-14': ['public/js/account-entry.js', 'nick.maxLength=32;', 'nick.maxLength=14;'],
  'perfil-14': ['public/js/community.js', 'input(auth.profile.nick,32)', 'input(auth.profile.nick,14)'],
  'menu-14': ['src/pages/index.astro', 'id="nick-input" maxlength="32"', 'id="nick-input" maxlength="14"'],
  'jogo-14': ['public/js/game.js', ".trim().slice(0, 32) || tr('VOCÊ')", ".trim().slice(0, 14) || tr('VOCÊ')"],
  'killfeed-cru': ['public/js/game.js', "tr('VOCÊ') : escapeClanName(e.name)}", "tr('VOCÊ') : e.name}"],
  'morte-cru': ['public/js/game.js', 'MORTO POR <b>${escapeClanName(h.name)}</b>', 'MORTO POR <b>${h.name}</b>'],
};
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);
const ler = (rel) => {
  let s = readFileSync(path.join(ROOT, rel), 'utf8');
  if (MUTANTES[mutante]?.[0] === rel) { const [, de, para] = MUTANTES[mutante]; const antes = s; s = s.replace(de, para); assert.notEqual(s, antes, `mutação ${mutante} aplicou`); }
  return s;
};
const falhas = [];
const cobra = (ok, msg) => { console.log(`  ${ok ? 'ok' : 'XX'}   ${msg}`); if (!ok) falhas.push(msg); };
const W32 = 'W'.repeat(32), W33 = 'W'.repeat(33);
const aceita = (re) => re.test(W32) && !re.test(W33) && re.test('ab') && !re.test('a') && !re.test('José') && !re.test('Ad min') && re.test('ru.ben_7-x');

const chat = ler('public/js/chat.js');
const NICK_RE = eval(chat.match(/export const NICK_RE = (\/[^\n]+\/[a-z]*);/)?.[1] || 'null');
cobra(NICK_RE && aceita(NICK_RE), 'NL1 · NICK_RE do chat aceita 2..32, recusa 33 e mantém o charset');

const conta = ler('public/js/account-entry.js'), perfil = ler('public/js/community.js'), menu = ler('src/pages/index.astro'), cla = ler('src/components/ClanPage.astro');
const padrao = (src, re) => { const m = src.match(re); return m && new RegExp(`^(?:${m[1].replace(/\\\\/g, '\\')})$`); };
cobra(/nick\.maxLength=32;/.test(conta) && aceita(padrao(conta, /nick\.pattern='([^']+)'/) || /x^/), 'NL2 · conta nova (account-entry): maxLength 32 e pattern 2..32');
cobra(/'2 a 32 letras, números, ponto, hífen ou _\.'/.test(conta), 'NL2 · conta nova diz "2 a 32"');
cobra(/input\(auth\.profile\.nick,32\)/.test(perfil) && aceita(padrao(perfil, /nick\.pattern='([^']+)'/) || /x^/), 'NL2 · trocar nick (comunidade): maxLength 32 e pattern 2..32');
cobra(/empty\('2 a 32 caracteres:/.test(perfil) && /nick_invalid:'Use de 2 a 32 /.test(perfil), 'NL2 · perfil e erro nick_invalid dizem "2 a 32"');
cobra(/id="nick-input" maxlength="32"/.test(menu), 'NL2 · nick local do menu (anônimo): maxlength 32');
cobra(/maxlength="32" pattern="([^"]+)"/.test(cla) && aceita(padrao(cla, /maxlength="32" pattern="([^"]+)"/) || /x^/), 'NL2 · perfil do clã: maxlength 32 e pattern 2..32');
for (const rel of ['src/pages/como-jogar.astro', 'src/pages/how-to-play.astro'])
  cobra(/2 (a|to) 32 (caracteres|characters)/.test(ler(rel)) && !/2 (a|to) 14/.test(ler(rel)), `NL2 · ${rel} diz 32`);

const jogo = ler('public/js/game.js');
cobra(/name: \(nickname \|\| ''\)\.trim\(\)\.slice\(0, 32\)/.test(jogo), 'NL3 · nome do jogador local corta em 32');
cobra(/const nick = key\.slice\(0, 32\);/.test(ler('src/pages/api/badge/[...path].png.ts')), 'NL3 · badge procura o nick com até 32');
cobra(/String\(p\.nick\)[^\n]*\.slice\(0,32\)/.test(ler('src/lib/profile-card.mjs')), 'NL3 · cartão de perfil (OG) recebe até 32');

cobra(/tr\('VOCÊ'\) : escapeClanName\(e\.name\)\}/.test(jogo), 'NL4 · killfeed escapa o nome');
cobra(/MORTO POR <b>\$\{escapeClanName\(h\.name\)\}<\/b>/.test(jogo), 'NL4 · tela de morte escapa o nome');

if (falhas.length) { console.log(`\x1b[31mNICK VERMELHO: ${falhas.length}\x1b[0m`); process.exit(1); }
if (mutante) throw new Error(`mutante ${mutante} não deixou a régua vermelha`);
console.log('\x1b[32mNICK verde: 2 a 32 no chat, formulários, jogo, badge e cartão; killfeed e morte escapados\x1b[0m');
