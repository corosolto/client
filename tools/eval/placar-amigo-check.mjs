#!/usr/bin/env node
/* ============================================================================
   placar-amigo-check.mjs — O PLACAR SABE A QUEM PEDIR AMIZADE?
   ----------------------------------------------------------------------------
   O CASO (lane glm/amigos): o dono quer +AMIGO em qualquer momento em que o
   placar esteja aberto (TAB, fim de round e fim de partida). O nó publica o pid
   de cada GENTE no roster (PR backend glm/placar-pid); esta régua trava o lado
   do cliente:

   C1 netgame marca o corpo remoto com row.pid;
   C2 o placar renderiza o botão SÓ para combatante online, com pid, que não é
      você, e que ainda não recebeu pedido nesta sessão;
   C3 o clique chama /api/social {action:'request', target:pid} com credencial
      same-origin e traduz os erros conhecidos (sessão, limite, sem conta);
   C4 a delegação é ligada ao montar o placar (uma vez por elemento).

   MUTAÇÕES: `sem-botao` (some com o botão da célula), `sem-pid` (netgame não
   marca o corpo), `clique-mudo` (fetch sem action request).

   Uso: node tools/eval/placar-amigo-check.mjs [--mutante=...]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
let game = readFileSync('public/js/game.js', 'utf8');
let netgame = readFileSync('public/js/netgame.js', 'utf8');

if (mutante === 'sem-botao') game = game.replace('${this._botaoAmigo(c)}', '');
else if (mutante === 'sem-pid') netgame = netgame.replace('if (row && row.pid) bot._playerId = row.pid;', '');
else if (mutante === 'clique-mudo') game = game.replace("body: JSON.stringify({ action: 'request', target: pid })", "body: JSON.stringify({ action: 'state', target: pid })");
else if (mutante) throw new Error(`mutante desconhecido: ${mutante}`);

const falhas = [];
const exige = (cond, msg) => { if (!cond) falhas.push(msg); };

exige(/if \(row && row\.pid\) bot\._playerId = row\.pid;/.test(netgame), 'C1: netgame não marca o corpo com o pid do roster');
exige(/\$\{this\._botaoAmigo\(c\)\}/.test(game), 'C2: célula do nome sem o botão');
exige(/!this\.online \|\| c\.isPlayer \|\| !c\._playerId/.test(game), 'C2: botão sem os filtros (online, não-você, com pid)');
exige(/_amigosPedidos\?\.has\(c\._playerId\)/.test(game), 'C2: sem memo de pedido já enviado na sessão');
exige(/fetch\('\/api\/social'[\s\S]{0,200}action: 'request', target: pid/.test(game), 'C3: clique não pede amizade pelo pid');
exige(/credentials: 'same-origin'/.test(game), 'C3: pedido sem credencial de sessão');
exige(/session_expired/.test(game), 'C3: sem tradução para quem não está logado');
exige(/_ligarAmigoPlacar\(\);/.test(game), 'C4: delegação de clique não é ligada ao montar o placar');
exige(/closest\('button\.sb-amigo'\)/.test(game), 'C4: delegação não filtra o botão certo');
exige(/#scoreboard \.sb-amigo/.test(readFileSync('public/style.css', 'utf8')), 'sem estilo para o botão do placar');

if (mutante) {
  const mapa = { 'sem-botao': 'C2', 'sem-pid': 'C1', 'clique-mudo': 'C3' };
  const morde = falhas.some(f => f.startsWith(mapa[mutante]));
  console.log(morde ? `mutante ${mutante} reprovado como devia.` : `MUTAÇÃO PASSOU — ${mutante} não foi sentido.`);
  process.exit(morde ? 0 : 1);
}
if (falhas.length) {
  console.error('placar com amizade reprovado:');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('placar confere: pid marca o corpo, botão com filtros, pedido com sessão e erros traduzidos, delegação ligada.');
