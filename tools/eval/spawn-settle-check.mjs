/* SPAWN-SETTLE-CHECK — quem nasce já nasce NO CHÃO. Nada de teleporte vertical.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Defeito do dono, jogando: *"o respawn do time dentro da loja, eles começam embaixo do
   mezanino e do nada sobem, isso tá esquisito."*

   MEDIDO antes do conserto (este script, cláusula SPAWN-1, loja_h / time B — o time que
   nasce no depósito do mezanino, y de projeto 3,40 m):
     BOT  B0..B3  y(frame 0) = 0,00  ->  y(frame 1) = 3,40   salto de 3,40 m em UM quadro
     PLAYER B0..B3 y(frame 0) = 0,00 -> y(frame 30) = 0,00   nasce no piso ERRADO (térreo)

   CAUSA RAIZ (uma só, duas caras): os três lugares que colocam alguém num spawn escreviam
   `pos.set(s.x, 0, s.z)` — Y ZERO LITERAL, sem perguntar ao mapa qual é o chão daquele
   (x, z). Enquanto todo mapa era plano isso era verdade por acidente. A Havan tem chão
   MULTINÍVEL (`map_havan.js/groundHeightAt(x, z, yRef)`): o spawn do time da loja fica
   DENTRO da pegada do mezanino, onde o mesmo (x, z) tem piso em 0,00 e em 3,40.
     · o BOT é realinhado todo frame por `groundHeightAt(x, z)` SEM yRef, que devolve a
       camada de cima -> ele aparece embaixo da laje e sobe 3,40 m no quadro seguinte;
     · o JOGADOR é resolvido com yRef = o próprio y (= 0) -> ele fica no térreo, embaixo do
       depósito, que não é o spawn que o mapa declara.
   Ou seja, não é defeito de mapa nem do resolvedor: é o CHAMADOR que não perguntava a
   altura. Correção escolhida pela medida: perguntar (`_spawnY`), em vez de mudar o mapa.

   CLÁUSULAS
     SPAWN-1  para TODO spawn de TODO mapa: |y(frame 30) − y(frame 0)| < 0,25 m, jogador e bot
     SPAWN-2  y(frame 0) é o chão do mapa naquele (x, z) — não um zero literal
     SPAWN-3  nenhum chamador de spawn escreve y literal 0 (leitura do fonte)

   O caminho medido é o REAL: `_respawnPlayer()` e o ramo de respawn do `_updateBot()`, com
   `_pickSpawn` fixado em cada ponto — não uma reimplementação da colocação aqui dentro,
   que mediria a régua e não o jogo.

   uso: node tools/eval/spawn-settle-check.mjs [--mutante=y0]
     y0  devolve o defeito (spawn em y literal 0) -> vermelha no loja_h
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import { bootGame, MAPS, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const TOL = 0.25;   // metros — teto do pedido: salto vertical de spawn tem que ser invisível
const falhas = [];
const linhas = [];

const textures = initTextures();
const DT = 1 / 60;

for (const id of Object.keys(MAPS)) {
  const g = bootGame(id, { textures, ctf: false, seed: 4242 });
  if (MUT === 'y0') g._spawnY = () => 0;   // o estado anterior ao conserto, na instância
  const gh = g.world.groundHeightAt ? (x, z, y) => g.world.groundHeightAt(x, z, y) : () => 0;
  g.state = 'live';

  for (const team of ['E', 'B']) {
    const list = g.world.spawns[team] || [];
    list.forEach((s, i) => {
      const rot = `${id} ${team}${i}`;
      const chao = gh(s.x, s.z);   // camada mais alta = o chão que o mapa declara nesse ponto

      /* ── JOGADOR: caminho real `_respawnPlayer()` ─────────────────────────────── */
      {
        const p = g.player;
        const pickOld = g._pickSpawn;
        g._pickSpawn = () => s;
        g._respawnPlayer();
        g._pickSpawn = pickOld;
        const y0 = p.pos.y;
        g._updatePlayer(DT);
        const y1 = p.pos.y;
        for (let k = 0; k < 29; k++) g._updatePlayer(DT);
        const y30 = p.pos.y;
        const d = Math.abs(y30 - y0);
        if (d >= TOL) falhas.push(`SPAWN-1 ${rot} JOGADOR saltou ${d.toFixed(2)} m depois de nascer (y0=${y0.toFixed(2)} y1=${y1.toFixed(2)} y30=${y30.toFixed(2)}) — o chão do mapa em (${s.x}, ${s.z}) é ${chao.toFixed(2)}`);
        if (Math.abs(y0 - chao) >= TOL) falhas.push(`SPAWN-2 ${rot} JOGADOR nasceu em y=${y0.toFixed(2)} e o chão do mapa ali é ${chao.toFixed(2)}`);
        linhas.push(`${rot.padEnd(20)} JOG  y0=${y0.toFixed(2).padStart(5)} y1=${y1.toFixed(2).padStart(5)} y30=${y30.toFixed(2).padStart(5)} Δ=${d.toFixed(2)}  chão=${chao.toFixed(2)}`);
      }

      /* ── BOT: caminho real (ramo de respawn do `_updateBot`) ──────────────────── */
      {
        const b = g.combatants.find((c) => !c.isPlayer && c.team === team);
        if (!b) return;
        b.alive = false; b.deadT = 9; b.respawnAt = -1;
        const pickOld = g._pickSpawn;
        g._pickSpawn = () => s;
        g._updateBot(b, DT);           // este frame RENASCE o bot e retorna
        g._pickSpawn = pickOld;
        const y0 = b.pos.y;
        g._updateBot(b, DT);           // primeiro frame vivo — é aqui que o teleporte aparecia
        const y1 = b.pos.y;
        for (let k = 0; k < 29; k++) g._updateBot(b, DT);
        const y30 = b.pos.y;
        const d = Math.abs(y30 - y0);
        if (d >= TOL) falhas.push(`SPAWN-1 ${rot} BOT saltou ${d.toFixed(2)} m depois de nascer (y0=${y0.toFixed(2)} y1=${y1.toFixed(2)} y30=${y30.toFixed(2)}) — o chão do mapa em (${s.x}, ${s.z}) é ${chao.toFixed(2)}`);
        if (Math.abs(y0 - chao) >= TOL) falhas.push(`SPAWN-2 ${rot} BOT nasceu em y=${y0.toFixed(2)} e o chão do mapa ali é ${chao.toFixed(2)}`);
        linhas.push(`${rot.padEnd(20)} BOT  y0=${y0.toFixed(2).padStart(5)} y1=${y1.toFixed(2).padStart(5)} y30=${y30.toFixed(2).padStart(5)} Δ=${d.toFixed(2)}  chão=${chao.toFixed(2)}`);
      }
    });
  }
  g.dispose && g.dispose();
}

/* ── SPAWN-3: leitura do FONTE — nenhum chamador volta a escrever y literal 0 ───── */
{
  /* SEM COMENTÁRIO — é cultura deste repo escrever o defeito antigo por extenso dentro do
     bloco que o explica, e a própria docstring do `_spawnY` contém `pos.set(s.x, 0, s.z)`.
     Régua que lê comentário reprova o conserto pelo texto do conserto. */
  let fonte = fs.readFileSync('public/js/game.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (MUT === 'y0') fonte = fonte.replace(/pos\.set\(([^,]+), this\._spawnY\([^)]*\)/g, 'pos.set($1, 0');
  // as três colocações em spawn: _resetPositions, _respawnPlayer e o respawn do _updateBot
  const zerados = (fonte.match(/pos\.set\(\s*s\.x[^)]*\)/g) || []).filter((l) => /,\s*0\s*,/.test(l));
  if (zerados.length) falhas.push(`SPAWN-3 ${zerados.length} colocação(ões) em spawn ainda escrevem y literal 0: ${zerados.join(' | ')}`);
  if (!/_spawnY\s*\(/.test(fonte)) falhas.push('SPAWN-3 não existe `_spawnY()` — quem pergunta ao mapa a altura do spawn?');
}

console.log('┌─ SPAWN-SETTLE-CHECK ─ |y(frame 30) − y(frame 0)| < ' + TOL.toFixed(2) + ' m em todo spawn');
for (const l of linhas) console.log('│ ' + l);
console.log('└─' + (MUT ? ` (mutante: ${MUT})` : ''));
if (falhas.length) {
  console.log('\nVERMELHA (' + falhas.length + '):');
  for (const f of falhas) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nVERDE — ${linhas.length} colocações (jogador + bot) em ${Object.keys(MAPS).length} mapas, nenhum salto ≥ ${TOL} m.`);
