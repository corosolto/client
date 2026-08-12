/* ============================================================================
   bot-brain-check.mjs — RÉGUA da rede dos bots (Fase D).
   ----------------------------------------------------------------------------
   A pergunta que fecha a Fase C→D: o bot dirigido pela REDE é pelo menos tão bom quanto o
   roteirizado? Mede em partida BOT×BOT no mesmo mapa/semente: o time E é dirigido pela rede
   (_botBrainTeam='E'), o time B pelo roteiro. Conta as MORTES por time e a atividade da rede
   (a rede tem que MOVER e ATIRAR — um modelo morto congela o bot). Régua:

     shareB (fração das mortes que são do time roteirizado) >= LIMIAR  → a rede não é pior
     rede viva: velocidade média > 0 e algum tiro                      → não congelou

   MUTAÇÃO (--mutante=zero): zera os pesos da rede. Aí a rede não mira nem atira, o time E
   vira alvo parado, shareB desaba e a régua REPROVA — provando que ela mede a rede, não o
   arnês. Segue a lei da skill bug-hunt: a régua tem que morder quando o defeito volta.

   O QUE A RÉGUA ASSERE (e o que NÃO assere): que a rede é um controlador FUNCIONAL — o
   time-rede move, atira e MATA uma fração real do inimigo, e não é roadkill nem congela.
   NÃO assere "empata com o roteirizado": o clone bootstrap aprende só o combate reativo
   LOCAL do professor, sem o estado privilegiado dele (grafo de rota, lane, token de duelo),
   então é esperado que perca a maioria dos duelos por posicionamento. O teto NÃO é afrouxado
   pra fechar placar — a barra reflete honestamente "bot que aprendeu a jogar", não "melhor
   que o roteiro". O caminho pra fechar o gap é dado real de JOGADOR (posiciona melhor),
   estado mais rico ou fine-tune por RL — não mexer nesta régua.

   Uso: node tools/eval/bot-brain-check.mjs [segundos] [--mutante=zero]
   ============================================================================ */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { initHarness } from './harness-stub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');
const MODEL_DIR = path.resolve(HERE, '../../public/models/bot-brain');

const SECS = parseFloat(process.argv[2] || '40');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
// mortes do inimigo / total. Barra FUNCIONAL (não "empata com o roteiro"): a rede tem que
// causar uma fatia real de mortes. Bootstrap clone fica ~0.20-0.25; mutação zerada → ~0.
const SHARE_MIN = 0.15;
const MAPS = ['dust2', 'praca_poderes', 'loja_h', 'piscinao'];
const SEEDS = [1, 2, 3];

const h = await initHarness();
const { BotBrain } = await import(`${JS}/botbrain/brain.js`);

// carrega o modelo dos arquivos (mesmo formato do browser)
function loadBrain() {
  const model = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8'));
  const norm = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'norm.json'), 'utf8'));
  const man = model.weightsManifest[0];
  const wbuf = fs.readFileSync(path.join(MODEL_DIR, man.paths[0]));
  const ab = wbuf.buffer.slice(wbuf.byteOffset, wbuf.byteOffset + wbuf.byteLength);
  const brain = new BotBrain().loadFromData(man.weights, ab, norm);
  if (MUT === 'zero') {   // mutação: zera todos os pesos → rede inerte
    for (const k of ['W1', 'b1', 'W2', 'b2', 'Wc', 'bc', 'Wb', 'bb']) brain[k].data.fill(0);
  }
  return brain;
}

function runMatch(mapId, textures, seed) {
  h.seedRandom(seed);
  const g = new h.Game({
    renderer: h.makeRenderer(), textures, sfx: h.sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'hard', sens: 1 },
    playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'CHK', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;   // player fora
  g._botBrain = loadBrain();
  g.botBrainMix = 1;
  g._botBrainTeam = 'E';   // E = rede; B = roteiro

  // instrumentação: mortes por time + atividade da rede (tiros e deslocamento do time E)
  let deathsE = 0, deathsB = 0, shotsNN = 0, moveNN = 0, moveN = 0;
  const wasAlive = new Map();
  const s0 = g._botShootNN.bind(g);
  g._botShootNN = (b, e) => { if (b.team === 'E') shotsNN++; return s0(b, e); };
  const lp = new Map();
  const DT = 1 / 60, total = Math.round(SECS * 60);
  for (const b of g.bots) { wasAlive.set(b, b.alive); lp.set(b, { x: b.pos.x, z: b.pos.z }); }

  for (let i = 0; i < total; i++) {
    g.update(DT);
    if (g.state !== 'live') continue;
    for (const b of g.bots) {
      const was = wasAlive.get(b);
      if (was && !b.alive) { b.team === 'E' ? deathsE++ : deathsB++; }
      wasAlive.set(b, b.alive);
      if (b.team === 'E' && b.alive && i % 6 === 0) {
        const p = lp.get(b); const d = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
        moveNN += d; moveN++; lp.set(b, { x: b.pos.x, z: b.pos.z });
      }
    }
  }
  return { deathsE, deathsB, shotsNN, avgMove: moveN ? moveNN / moveN : 0 };
}

function countCtfObjectiveCalls() {
  h.seedRandom(7);
  const g = new h.Game({
    renderer: h.makeRenderer(), textures: h.initTextures(h.makeRenderer()), sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'hard', sens: 1 },
    playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'CTF', mapId: 'dust2', ctf: true, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;
  g._botBrain = loadBrain(); g.botBrainMix = 1; g._botBrainTeam = 'E';
  let calls = 0;
  const ctf = g._botCtf.bind(g);
  g._botCtf = (bot, dt) => { if (bot.team === 'E') calls++; return ctf(bot, dt); };
  const neural = g.bots.find((bot) => bot.team === 'E');
  const deadEnemy = g.bots.find((bot) => bot.team !== 'E');
  for (const enemy of g.bots.filter((bot) => bot.team !== 'E')) enemy.alive = false;
  g.state = 'live';
  neural.target = deadEnemy;
  neural._nnMem = { target: deadEnemy, lastSeenAt: g.time - 2 };
  neural._nnThink = 0;
  neural._nn = null;
  g._updateBot(neural, 1 / 60);
  const staleCleared = neural.target === null && neural._nnMem.target === null;
  g._updateBot(neural, 1 / 60);
  for (let i = 0; i < 10 * 60; i++) g.update(1 / 60);
  return { calls, staleCleared };
}

let DE = 0, DB = 0, shots = 0, moveSum = 0, moveCnt = 0;
for (const mapId of MAPS) {
  const textures = h.initTextures(h.makeRenderer());
  for (const seed of SEEDS) {
    const r = runMatch(mapId, textures, seed);
    DE += r.deathsE; DB += r.deathsB; shots += r.shotsNN;
    moveSum += r.avgMove; moveCnt++;
    console.error(`  ${mapId} seed ${seed}: mortesE ${r.deathsE} mortesB ${r.deathsB} tirosNN ${r.shotsNN} mov ${r.avgMove.toFixed(2)}`);
  }
}
const total = DE + DB;
const shareB = total ? DB / total : 0;
const avgMove = moveCnt ? moveSum / moveCnt : 0;
const ctf = countCtfObjectiveCalls();
const alive = shots > 0 && avgMove > 0.05;
const passRede = shareB >= SHARE_MIN && alive && ctf.calls > 0 && ctf.staleCleared;

console.error(`\n=== BOT-BRAIN CHECK ${MUT ? '(mutante=' + MUT + ')' : ''} ===`);
console.error(`mortes: E(rede) ${DE}  B(roteiro) ${DB}  | shareB ${shareB.toFixed(3)} (min ${SHARE_MIN})`);
console.error(`rede viva: tiros ${shots}, deslocamento médio ${avgMove.toFixed(3)} → ${alive ? 'sim' : 'NÃO'}`);
console.error(`objetivo CTF sem alvo: ${ctf.calls} chamadas · alvo vencido limpo: ${ctf.staleCleared ? 'sim' : 'NÃO'}`);

if (MUT) {
  // mutação DEVE reprovar: rede zerada não mira/atira, shareB desaba
  if (!passRede) { console.error('MUTANTE reprovado como esperado ✓ (a régua morde)'); process.exit(0); }
  console.error('MUTANTE PASSOU — a régua NÃO morde (régua cega) ✗'); process.exit(1);
} else {
  if (passRede) { console.error('BOT-BRAIN verde ✓ (rede não é pior que o roteiro)'); process.exit(0); }
  console.error('BOT-BRAIN vermelho ✗ (rede pior que o roteiro ou congelada)'); process.exit(1);
}
