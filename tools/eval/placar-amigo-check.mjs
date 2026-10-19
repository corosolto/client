#!/usr/bin/env node
/* ============================================================================
   placar-amigo-check.mjs — O PLACAR SABE A QUEM PEDIR AMIZADE?
   ----------------------------------------------------------------------------
   O CASO (lane glm/amigos): o dono quer +AMIGO em qualquer momento em que o
   placar esteja aberto (TAB, fim de round e fim de partida). O nó publica o pid
   de cada GENTE no roster (PR backend glm/placar-pid); esta régua trava o lado
   do cliente:

   C1 netgame aceita row.pid só quando é UUID de gente e limpa o id de corpos
      reaproveitados por bot;
   C2 o placar renderiza o botão SÓ na Treta Pop, para combatante online, com pid,
      que não é você e ainda não recebeu pedido nesta sessão;
   C3 o clique chama /api/social {action:'request', target:pid} com credencial
      same-origin e traduz os erros conhecidos (sessão, limite, sem conta);
   C4 a delegação é ligada ao montar o placar (uma vez por elemento).

   MUTAÇÕES: `sem-botao`, `sem-pid`, `clique-mudo`, `vaza-legado` e
   `pid-sem-validacao`.

   Uso: node tools/eval/placar-amigo-check.mjs [--mutante=...]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
let game = readFileSync('public/js/game.js', 'utf8');
let netgame = readFileSync('public/js/netgame.js', 'utf8');

if (mutante === 'sem-botao') game = game.replace('${this._botaoAmigo(c)}', '');
else if (mutante === 'sem-pid') netgame = netgame.replace("return !entity?.bot && PLAYER_ID.test(row?.pid || '') ? row.pid : '';", "return '';");
else if (mutante === 'clique-mudo') game = game.replace("body: JSON.stringify({ action: 'request', target: pid })", "body: JSON.stringify({ action: 'state', target: pid })");
else if (mutante === 'vaza-legado') game = game.replace("document.documentElement.dataset.ui !== 'v3' || ", '');
else if (mutante === 'pid-sem-validacao') netgame = netgame.replace("!entity?.bot && PLAYER_ID.test(row?.pid || '') ? row.pid : ''", "row?.pid || ''");
else if (mutante) throw new Error(`mutante desconhecido: ${mutante}`);

const falhas = [];
const exige = (cond, msg) => { if (!cond) falhas.push(msg); };

const helperStart = netgame.indexOf('function rosterPlayerId(');
const helperEnd = netgame.indexOf('\n}', helperStart) + 2;
exige(helperStart >= 0 && helperEnd > helperStart, 'C1: falta o resolvedor de pid do roster');
if (helperStart >= 0 && helperEnd > helperStart) {
  const resolver = new Function('PLAYER_ID', `${netgame.slice(helperStart, helperEnd)}; return rosterPlayerId;`)(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const pid = 'c026ab03-2aa8-4775-979c-fcb1414fa50b';
  exige(resolver({bot:0},{pid}) === pid, 'C1: gente com UUID válido perde o pid');
  exige(resolver({bot:1},{pid}) === '', 'C1: bot herdou pid humano');
  exige(resolver({bot:0},{pid:'invalido'}) === '', 'C1: pid inválido atravessou');
}
exige(/\$\{this\._botaoAmigo\(c\)\}/.test(game), 'C2: célula do nome sem o botão');
exige(/document\.documentElement\.dataset\.ui !== 'v3' \|\| !this\.online \|\| c\.isPlayer \|\| !c\._playerId/.test(game), 'C2: botão sem guarda da Treta Pop, online, não-você e pid');
exige(/_amigosPedidos\?\.has\(c\._playerId\)/.test(game), 'C2: sem memo de pedido já enviado na sessão');
exige(/fetch\('\/api\/social'[\s\S]{0,260}action: 'request', target: pid/.test(game), 'C3: clique não pede amizade pelo pid');
exige(/credentials: 'same-origin'/.test(game), 'C3: pedido sem credencial de sessão');
exige(/session_expired/.test(game), 'C3: sem tradução para quem não está logado');
exige(/_ligarAmigoPlacar\(\);/.test(game), 'C4: delegação de clique não é ligada ao montar o placar');
exige(/closest\('button\.sb-amigo'\)/.test(game), 'C4: delegação não filtra o botão certo');
exige(/:root\[data-ui=v3\] #scoreboard \.sb-amigo/.test(readFileSync('public/style.css', 'utf8')), 'C2: estilo do botão não está isolado na Treta Pop');

if (mutante) {
  const mapa = { 'sem-botao': 'C2', 'sem-pid': 'C1', 'clique-mudo': 'C3', 'vaza-legado': 'C2', 'pid-sem-validacao': 'C1' };
  const morde = falhas.some(f => f.startsWith(mapa[mutante]));
  console.log(morde ? `mutante ${mutante} reprovado como devia.` : `MUTAÇÃO PASSOU — ${mutante} não foi sentido.`);
  process.exit(morde ? 0 : 1);
}
if (falhas.length) {
  console.error('placar com amizade reprovado:');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('placar confere: pid de gente validado, legado intacto, botão com filtros, pedido com sessão e delegação ligada.');
