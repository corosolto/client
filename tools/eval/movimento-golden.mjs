/* GOLDEN DO MOVIMENTO DO JOGADOR.
   Existe por causa do multiplayer: o servidor autoritativo precisa aplicar a MESMA física do
   jogador a um slot remoto, e para isso o movimento tem que sair de dentro do `_updatePlayer`
   (315 linhas entrelaçadas com câmera, HUD e som) e virar um `_moveEntity(ent, input, dt)`
   reusável. Extrair física de um corpo tão grande é o jeito clássico de mudar o feel sem
   perceber — então esta régua CONGELA a trajetória antes da extração.

   Como funciona: dirige o jogador com uma sequência de teclas roteirizada, em passo fixo,
   com Math.random semeado, e grava a pose a cada 10 ticks. `--write` grava o baseline;
   sem flag, compara contra ele e reprova em qualquer divergência acima de 1e-6.

   A régua só vale se ela MORDE: `--mutar=<n>` injeta uma mudança na aceleração física.
   Com n pequeno a trajetória tem que divergir mesmo assim; o baseline vigente usa 48 m/s². */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, MAPS, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(HERE, 'movimento-golden.json');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const mutArg = args.find((a) => a.startsWith('--mutar='));
let MUT = 0;
if (mutArg) {
  MUT = Number(mutArg.slice(8));
  if (!Number.isFinite(MUT) || MUT === 0) {
    console.error(`[movimento-golden] --mutar=<n> exige número finito não nulo (recebi "${mutArg.slice(8)}")`);
    process.exit(2);
  }
}
const MUTANTES_COMPARACAO = ['truncado', 'caso-extra', 'nao-finito'];
const MUTANTE = (args.find((a) => a.startsWith('--mutante=')) || '').slice(10) || null;
if (MUTANTE && !MUTANTES_COMPARACAO.includes(MUTANTE)) {
  console.error(`[movimento-golden] mutante desconhecido: ${MUTANTE} (válido: ${MUTANTES_COMPARACAO.join(', ')})`);
  process.exit(2);
}
if (MUTANTE && WRITE) { console.error('[movimento-golden] --mutante com --write: baseline não é gravado sob mutante'); process.exit(2); }

// Roteiro de teclas: cobre andar, strafe, counter-strafe, correr, agachar, pular e parar.
// Cada entrada é [até que tick, teclas].
const ROTEIRO = [
  [60,  { KeyW: 1 }],
  [90,  { KeyW: 1, KeyD: 1 }],
  [120, { KeyD: 1, ShiftLeft: 1 }],
  [150, { KeyA: 1 }],                       // counter-strafe: inverte a direção
  [180, { KeyW: 1, Space: 1 }],             // pulo com corrida
  [210, { KeyW: 1, ControlLeft: 1 }],       // crouch andando
  [240, { KeyS: 1 }],
  [270, {}],                                // solta tudo: atrito
  [330, { KeyW: 1, KeyA: 1, Space: 1 }],
];

/* Ponto de partida FIXO por mapa (antes vinha do sorteio de spawn, que qualquer objeto
   THREE novo no construtor deslocava). Valores do baseline de 28/08, mapa jogável. */
const POS0 = {
  praca_poderes: [-8.999258, 0, 61.568891],
  piscinao_ramos: [-9.123785, 0, 62.462876],
};
/* piscinao_ramos é chave legada: resolve para a Praça; os casos usam seeds/POS0 distintos.
   Este golden cobre um mapa efetivo, sem alegar cobertura do Piscinão fora do registro. */

function rodar(mapId, seed) {
  seedRandom(seed);
  const g = new Game({
    renderer, textures: TEX, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'GOLDEN', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  /* Re-semeia DEPOIS da construção e do round. Sem isto a régua era refém do
     `THREE.MathUtils.generateUUID()`, que gasta 4 saques de Math.random por objeto
     criado: o #405 acrescentou 5 objetos no construtor (a fumaça do cano), gastou 20
     saques, deslocou a torrente ANTES do sorteio de spawn e pintou a régua de vermelho
     com a física byte a byte idêntica. Medido: o pré-merge com 20 saques queimados
     reproduz o spawn do merge casa por casa. O que esta régua mede é TRAJETÓRIA, não
     sorteio de spawn — então o ponto de partida é fixado à mão. */
  g.start ? g.start() : g._startRound();
  g.player.pos.set(...POS0[mapId]);
  g.player.vel.set(0, 0, 0);
  seedRandom(seed);
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  if (MUT) g.__mutAccel = MUT;   // consumido pelo _moveEntity quando existir (ver --mutar)

  const p = g.player;
  const poses = [];
  const DT = 1 / 60;
  for (let t = 0; t < 360; t++) {
    const passo = ROTEIRO.find(([ate]) => t < ate);
    g.keys = { ...(passo ? passo[1] : {}) };
    // yaw varre devagar: exercita a rotação do vetor de desejo (wish) sem depender do mouse
    p.yaw = t * 0.004;
    g.update(DT, false);
    if (t % 10 === 0) poses.push([
      +p.pos.x.toFixed(6), +p.pos.y.toFixed(6), +p.pos.z.toFixed(6),
      +p.vel.x.toFixed(6), +p.vel.y.toFixed(6), +p.vel.z.toFixed(6),
      +p.crouchF.toFixed(6), p.grounded ? 1 : 0,
    ]);
  }
  return poses;
}

const TEX = initTextures();
const CASOS = [['praca_poderes', 12345], ['piscinao_ramos', 777]];   // caso 2: legado, efetivo Praça (fallback DEFAULT_MAP)
const atual = {};
for (const [mapId, seed] of CASOS) atual[`${mapId}#${seed}`] = rodar(mapId, seed);
// Mutantes causais da COMPARAÇÃO: mutam `atual` em memória — o baseline em disco nunca é regravado.
if (MUTANTE) {
  const k1 = Object.keys(atual)[0];
  if (MUTANTE === 'truncado') atual[k1] = atual[k1].slice(0, Math.ceil(atual[k1].length / 2));
  else if (MUTANTE === 'caso-extra') atual[`st-${k1}`] = atual[k1].slice();
  else atual[k1][atual[k1].length - 1][2] = NaN;
}

if (WRITE) {
  fs.writeFileSync(BASELINE, JSON.stringify(atual, null, 1));
  console.log(`[movimento-golden] baseline gravado: ${Object.keys(atual).length} casos`);
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) { console.error('[movimento-golden] sem baseline — rode com --write'); process.exit(2); }
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
let falhas = 0;
/* O contador de impressão é POR CASO. A versão antiga usava o contador global e cortava
   o caso inteiro no 13º erro: `praca_poderes` sozinho gastava a cota, e `piscinao_ramos`
   aparecia com UMA divergência quando na verdade divergia nas 36 amostras. Régua que
   mente sobre o escopo do estrago custou meia hora de diagnóstico. */
const COLS = 8;
for (const k of Object.keys(atual)) if (!(k in base)) {
  console.error(`[movimento-golden] caso sem baseline (rode --write): ${k}`);
  falhas++;
}
for (const k of Object.keys(base)) {
  const a = base[k], b = atual[k];
  if (!b) { console.error(`[movimento-golden] caso sumiu: ${k}`); falhas++; continue; }
  if (!Array.isArray(b) || b.length !== a.length) {
    console.error(`[movimento-golden] ${k}: comprimento de amostras divergiu — baseline ${a.length}, atual ${Array.isArray(b) ? b.length : 'ausente'}`);
    falhas++;
    continue;
  }
  let doCaso = 0, impressas = 0, abortou = false;
  const acusa = (msg) => {
    doCaso++; falhas++;
    if (impressas < 6) { console.error(`[movimento-golden] ${k} ${msg}`); impressas++; }
  };
  for (let i = 0; i < a.length && !abortou; i++) {
    const ra = a[i], rb = b[i];
    if (!Array.isArray(ra) || !Array.isArray(rb) || ra.length !== COLS || rb.length !== COLS) {
      console.error(`[movimento-golden] ${k} amostra ${i}: linha com ${Array.isArray(ra) ? ra.length : '?'}×${Array.isArray(rb) ? rb.length : '?'} campos (exige ${COLS})`);
      falhas++; abortou = true; break;
    }
    for (let j = 0; j < COLS; j++) {
      const va = ra[j], vb = rb[j];
      if (!Number.isFinite(va) || !Number.isFinite(vb)) {
        falhas++; doCaso++;
        console.error(`[movimento-golden] ${k} amostra ${i} campo ${j}: valor não finito (${va} -> ${vb})`);
        continue;
      }
      if (Math.abs(va - vb) > 1e-6) acusa(`amostra ${i} campo ${j}: ${va} -> ${vb}`);
    }
  }
  if (doCaso && !abortou) console.error(`[movimento-golden] ${k}: ${doCaso} divergência(s) em ${a.length} amostras${doCaso > impressas ? ` (${impressas} impressas)` : ''}`);
}
if (falhas) { console.error(`[movimento-golden] REPROVADO — ${falhas} divergência(s)`); process.exit(1); }
console.log(`[movimento-golden] OK — ${Object.keys(base).length} casos, trajetória idêntica`);
