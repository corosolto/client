/* SWITCHTEAM-CHECK — a troca de lado nunca deixa o Game com `playerDef` undefined.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Relatado pelo índice `js_error` em `2.0.0-alpha.248`, mapa `posto_treta`, modo `ctf`:

     Uncaught TypeError: Cannot read properties of undefined (reading 'id')
       at buildCharacterModel (js/glbchars.js:368)
       at Game._ensurePlayerTP (js/game.js:5105)
       at Game._tpDeath          (js/game.js:5159)
       at Game._updatePlayer     (js/game.js:5295)

   O defeito NÃO está em nenhuma dessas quatro linhas. `buildCharacterModel` recebeu
   `def === undefined` porque `this.playerDef` já estava undefined quando o jogador morreu;
   quem o deixou assim foi a troca de lado (tecla M):

     game.js:2788   if (charId) { this.playerDef = byId(charId); ... }

   `byId` é `CHARACTERS.find(...)` (characters.js:613): devolve **undefined** para id fora
   do elenco. O MESMO campo, no construtor, já tinha reserva — `byId(playerCharId) ||
   CHARACTERS[0]`, game.js:712, com aviso no 713. A linha da troca de lado não tinha, e a
   assimetria entre as duas é o defeito.

   E O QUE TORNOU ISSO CARO FOI O `catch` (a assinatura da lei 6 desta casa). Em
   main.js:2157 a chamada mora dentro de um `try { game._switchTeam(id) } catch (e) {
   console.error('switch team failed', e) }` e logo abaixo vem `game.resume()`. A atribuição
   de `playerDef = undefined` acontece ANTES da exceção; o `catch` engole a exceção, o
   `resume()` devolve o jogo ao jogador, e o Game segue rodando CORROMPIDO. A quebra só
   aparece na morte seguinte, em outro arquivo, a quatro quadros de distância da causa —
   foi assim que ela chegou como "crash no glbchars".

   MEDIDO ANTES DO CONSERTO (este script, cláusulas ST1/ST2, mapa posto_treta/ctf):
     _switchTeam('id-que-nao-existe')  ->  TypeError em game.js:2801 (`p.def.id`)
     estado deixado para trás          ->  playerDef undefined, player.def undefined
     _tpDeath(0.016) em seguida        ->  TypeError em glbchars.js:368 (a linha do relatório)

   O QUE FOI DESCARTADO COM MEDIÇÃO, NÃO COM PALPITE

     - "é defeito do `buildCharacterModel`, que deveria tolerar def nulo": não. Ele JÁ
       devolve null sem template (glbchars.js:369) e `_ensurePlayerTP` já trata null
       (game.js:5110). Tolerar `def` undefined lá só moveria o crash para o próximo leitor
       de `def.id` e apagaria o sinal de que o elenco do jogador está inconsistente.
     - "é defeito do CTF / do posto_treta": não. O arnês reproduz em qualquer mapa; o CTF
       só é onde há troca de lado frequente.

   CLÁUSULAS
     ST1  `_switchTeam` com id fora do elenco não lança E não deixa `playerDef` undefined
     ST2  o caminho do relatório (`_tpDeath` -> `_ensurePlayerTP` -> `buildCharacterModel`)
          não lança depois de uma troca de lado com id inválido
     ST3  ANTIVACUIDADE: com id VÁLIDO a troca continua trocando de verdade (lado, facção
          e personagem mudam) — sem isto bastaria transformar `_switchTeam` em no-op
     ST4  nenhuma atribuição a `this.playerDef` no game.js usa `byId(...)` sem reserva

   uso: node tools/eval/switchteam-check.mjs [--mutante=<nome>]
     semreserva    reaplica o defeito no FONTE lido pela ST4      -> ST4 vermelha
     defundefined  põe o Game no estado que o código antigo deixava -> ST2 vermelha
   Nas duas mutações a ST3 tem que continuar VERDE.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootGame, initTextures, CHARACTERS } from './harness.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ID_FORA = 'personagem-que-nao-existe-no-elenco';

const falhas = [];
const linhas = [];
const ok = (c, t, d) => { linhas.push(`${c} · ${t}\n   ${d}\n   PASSA`); };
const nok = (c, t, d) => { falhas.push(c); linhas.push(`${c} · ${t}\n   ${d}\n   FALHA`); };

const textures = initTextures();
const novoJogo = () => {
  const g = bootGame('posto_treta', { textures, ctf: true });
  g.state = 'live';
  g.player.alive = true;
  return g;
};

/* ST1 — a troca de lado com id fora do elenco. Mede as DUAS coisas que importam: não
   lançar, e não deixar o campo undefined. Só "não lançar" deixaria passar um Game
   corrompido em silêncio, que é justamente o que o `catch` do main.js fazia. */
{
  const g = novoJogo();
  const antes = g.playerDef.id;
  let erro = null;
  try { g._switchTeam(ID_FORA); } catch (e) { erro = e; }
  const def = g.playerDef;
  const pdef = g.player && g.player.def;
  const d = `antes '${antes}'   depois playerDef=${def ? `'${def.id}'` : String(def)}`
    + `   player.def=${pdef ? `'${pdef.id}'` : String(pdef)}   playerCharId=${String(g.playerCharId)}`
    + `   exceção ${erro ? erro.constructor.name + ': ' + erro.message : 'nenhuma'}`;
  const coerente = !erro && def && def.id && pdef === def
    && g.playerCharId === def.id && CHARACTERS.some((c) => c.id === def.id);
  if (coerente) ok('ST1', 'troca de lado com id fora do elenco não lança e não deixa playerDef undefined', d);
  else nok('ST1', 'troca de lado com id fora do elenco não lança e não deixa playerDef undefined', d);
}

/* ST2 — o caminho EXATO do relatório. Depois da troca com id inválido, matar o jogador
   tem de ser inócuo. O mutante `defundefined` reproduz o estado que o código antigo
   deixava, sem precisar reeditar o game.js: é o mesmo Game corrompido. */
{
  const g = novoJogo();
  try { g._switchTeam(ID_FORA); } catch { /* a ST1 já cobra a exceção; aqui medimos a morte */ }
  if (MUT === 'defundefined') { g.playerDef = undefined; g.player.def = undefined; }
  let erro = null;
  try { g._tpDeath(0.016); g._tpDeath(0.016); } catch (e) { erro = e; }
  const d = `playerDef=${g.playerDef ? `'${g.playerDef.id}'` : String(g.playerDef)}`
    + `   _tpDeath ${erro ? 'LANÇOU ' + erro.constructor.name + ': ' + erro.message : 'não lançou'}`;
  if (!erro) ok('ST2', 'a morte depois da troca de lado não lança (caminho do relatório)', d);
  else nok('ST2', 'a morte depois da troca de lado não lança (caminho do relatório)', d);
}

/* ST3 — ANTIVACUIDADE. Com id válido a troca tem de TROCAR. Sem esta cláusula, a maneira
   mais fácil de deixar ST1/ST2 verdes seria transformar `_switchTeam` num no-op. */
{
  const g = novoJogo();
  const ladoAntes = g.playerTeam, facAntes = g.playerFaction, charAntes = g.playerDef.id;
  const alvo = CHARACTERS.find((c) => c.team === g.enemyFaction);
  let erro = null;
  try { g._switchTeam(alvo.id); } catch (e) { erro = e; }
  const d = `lado ${ladoAntes}->${g.playerTeam}   facção ${facAntes}->${g.playerFaction}`
    + `   personagem '${charAntes}'->'${g.playerDef && g.playerDef.id}'`
    + `   exceção ${erro ? erro.message : 'nenhuma'}`;
  const trocou = !erro && g.playerTeam !== ladoAntes && g.playerFaction !== facAntes
    && g.playerDef && g.playerDef.id === alvo.id && g.playerCharId === alvo.id
    && g.player.def === g.playerDef;
  if (trocou) ok('ST3', 'com id válido a troca de lado continua trocando (antivacuidade)', d);
  else nok('ST3', 'com id válido a troca de lado continua trocando (antivacuidade)', d);
}

/* ST4 — a assimetria, lida no fonte. É esta cláusula que pega a PRÓXIMA cópia do erro:
   qualquer atribuição a `this.playerDef` tem de ter reserva na mesma expressão. */
{
  let src = fs.readFileSync(path.join(RAIZ, 'public/js/game.js'), 'utf8');
  if (MUT === 'semreserva') {
    /* MUTANTE: devolve o defeito no fonte que a ST4 lê — `byId(charId)` cru. */
    src = src.replace(/const def = byId\(charId\);/, 'this.playerDef = byId(charId);');
  }
  const linhasSrc = src.split('\n');
  const cruas = [];
  linhasSrc.forEach((l, i) => {
    const m = /this\.playerDef\s*=\s*(.+?);/.exec(l);
    if (!m) return;
    const rhs = m[1];
    // reserva aceita: `|| algo` na mesma expressão, ou atribuir uma variável já checada.
    if (/\|\|/.test(rhs)) return;
    if (/^(?:def|d)\b/.test(rhs) && /\|\|/.test(linhasSrc.slice(Math.max(0, i - 4), i).join('\n'))) return;
    if (/byId\(|\.find\(/.test(rhs)) cruas.push(`${i + 1}: ${l.trim()}`);
  });
  const d = cruas.length ? cruas.join('\n   ') : 'nenhuma atribuição crua a this.playerDef';
  if (cruas.length === 0) ok('ST4', 'nenhuma atribuição a this.playerDef usa byId() sem reserva', d);
  else nok('ST4', 'nenhuma atribuição a this.playerDef usa byId() sem reserva', d);
}

console.log(`\n${linhas.join('\n\n')}\n`);
if (MUT) console.log(`mutante aplicado: --mutante=${MUT}\n`);
console.log(falhas.length === 0
  ? 'PASSA (switchteam-check) — 4/4 cláusulas'
  : `REPROVA (switchteam-check) — ${falhas.join(', ')}`);
process.exit(falhas.length === 0 ? 0 : 1);
