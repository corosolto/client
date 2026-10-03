/* RÉGUA DOS 3 BUGS DE GAMEPLAY (feedback de jogador, 01/10/2026) — pulo, tiro no ar e reload.

   Cada bloco é um defeito reportado com a medição que o reprova:

   A · TIRO NO PULO IA RETO (pior com AWP). O cone no ar era só MULTIPLICATIVO
      (moveMul +2,5): a AWP com luneta partia de spreadScope 0,0008 rad e o pulo inteiro
      rendia 0,0028 rad — 2,8 cm de desvio a 20 m, tiro laser. O piso ADITIVO
      (SPREAD_AR, game.js aberturaCone) soma em cima do spreadHip, então a arma MAIS
      precisa no chão continua a MENOS precisa no ar, como no CS (inaccuracy_jump).
      A mesma aberturaCone decide o cone do cliente E o do nó dedicado (room.js
      chama coneDoDisparo), então as cláusulas A cobrem os dois caminhos.

   B · PULO AGACHADO LATERAL EXAGERADO. O carve-out `(p.grounded ? 1 : 0)` no maxSp
      devolvia velocidade CHEIA de corrida a um corpo agachado no ar: agachar (52 %
      no chão) + pular dava strafe a ~4,7 m/s com silhueta agachada — a esquiva que
      tirava a mira. Agora o fator de agachamento vale no ar: agachado pula igual em
      ALTURA (mesmo impulso) e MENOS em distância que em pé.

   C · CLIQUE DE ATIRAR RESETAVA O RELOAD. Com o pente vazio e o gatilho segurado, o
      auto-fire (que roda ANTES do bloco de conclusão no _updatePlayer) chamava
      _startReload no quadro em que o prazo vencia e a recarga recomeçava PARA SEMPRE
      (mag nunca voltava). O servidor já finaliza antes de atirar (room.js
      _finalizarRecarga → _serviceShooting); o guarda `reloadUntil > 0` casa o cliente
      com essa ordem.

   Uso: node tools/eval/pulo-tiro-recarga-check.mjs
        node tools/eval/pulo-tiro-recarga-check.mjs --mutante=cone-ar       # piso do cone some
        node tools/eval/pulo-tiro-recarga-check.mjs --mutante=crouch-ar     # carve-out volta
        node tools/eval/pulo-tiro-recarga-check.mjs --mutante=reload-rearma # guarda some
   Mutante aplicado tem que REPROVAR (lição 3: régua que não morde não existe). Os
   mutantes de arquivo (cone-ar, reload-rearma) rodam num processo filho com o jogo
   mutado e o arquivo é restaurado no finally — se o filho VERDEAR, o pai reprova com
   "mutante não mordeu". */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME_JS = path.resolve(HERE, '../../public/js/game.js');

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const INTERNO = process.argv.includes('--interno');
/* O harness planta o DOM/location que game.js exige ANTES do import do jogo — sem
   ele o módulo nem carrega em node. Só na execução de cláusulas: o PAI dos mutantes
   de arquivo só precisa de fs/spawn (e não pode bootar o jogo mutado duas vezes). */
const JOGO = async () => { await import('./harness.mjs'); return import('../../public/js/game.js'); };
const MUTACOES = {
  'cone-ar': {
    secao: 'A',
    aplicar: (s) => s.replace('Math.max(comBloom, W.spreadHip + SPREAD_AR)', 'comBloom'),
    checar: (m) => m.includes('return GUNFEEL && !estado.grounded ? comBloom : comBloom;'),
  },
  'reload-rearma': {
    secao: 'C',
    aplicar: (s) => s.replace('if (w === \'knife\' || !p.alive || p.reloadUntil > 0) return;',
      'if (w === \'knife\' || !p.alive || this._reloading()) return;'),
    checar: (m) => m.includes('!p.alive || this._reloading()) return;') && !m.includes('!p.alive || p.reloadUntil > 0) return;'),
  },
};

/* ---- PAI: aplica o mutante de arquivo, roda o filho, restaura, exige reprovação ---- */
if (!INTERNO && MUTACOES[MUTANTE]) {
  const original = fs.readFileSync(GAME_JS, 'utf8');
  const md5 = (s) => createHash('md5').update(s).digest('hex');
  const mutado = MUTACOES[MUTANTE].aplicar(original);
  if (!MUTACOES[MUTANTE].checar(mutado)) {
    console.error(`mutante ${MUTANTE} não aplicou: o trecho alvo mudou no game.js`);
    process.exit(1);
  }
  let filho;
  try {
    fs.writeFileSync(GAME_JS, mutado);
    filho = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--interno', `--mutante=${MUTANTE}`],
      { encoding: 'utf8', timeout: 120000 });
  } finally {
    fs.writeFileSync(GAME_JS, original);
  }
  if (md5(fs.readFileSync(GAME_JS, 'utf8')) !== md5(original)) {
    console.error(`mutante ${MUTANTE}: game.js não foi restaurado byte a byte`);
    process.exit(1);
  }
  console.log((filho.stdout || '') + (filho.stderr || ''));
  if (filho.status === 0) {
    console.error(`mutante ${MUTANTE} não mordeu: o jogo mutado passou verde onde devia reprovar`);
    process.exit(1);
  }
  console.log(`mutante ${MUTANTE} reprovou como devia (seção ${MUTACOES[MUTANTE].secao}) — régua morde.`);
  process.exit(0);
}
if (MUTANTE && !MUTACOES[MUTANTE] && MUTANTE !== 'crouch-ar') {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(2);
}

const { WEAPONS, aberturaCone, coneDoDisparo } = await JOGO();
let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };
const perto = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

/* ============================ A · CONE NO AR ============================ */
if (!INTERNO || MUTACOES[MUTANTE]?.secao === 'A') {
  console.log('\n· A — tiro no pulo tem piso de imprecisão (todas as armas, pior na AWP)');
  const ARMAS = Object.keys(WEAPONS).filter((w) => w !== 'knife');
  const semPiso = [];
  for (const w of ARMAS) {
    const W = WEAPONS[w];
    const ar = aberturaCone({ crouchF: 0, sp: 0, grounded: false, adsF: 1, bloom: 0, scoped: true }, W);
    if (!(ar >= W.spreadHip + 0.09 - 1e-9)) semPiso.push(`${w} ${ar.toFixed(4)}`);
  }
  cobra(semPiso.length === 0,
    `A1 · toda arma no ar (mesmo em ADS cheio) abre ≥ spreadHip+0,09 rad — fora do piso: ${semPiso.length ? semPiso.join(', ') : 'nenhuma'}`);

  // A contraprova da cláusula A1: no chão a luneta CONTINUA laser. Régua que só cobra
  // "espalha" seria satisfeita espalhando sempre.
  const awpChao = aberturaCone({ crouchF: 0, sp: 0, grounded: true, adsF: 1, bloom: 0, scoped: true }, WEAPONS.awp);
  cobra(awpChao <= 0.001,
    `A2 · AWP com luneta NO CHÃO continua precisa (spread ${awpChao.toFixed(4)} rad, teto 0,001)`);

  // O número do relato do jogador: "acerta o alvo com precisão total". Desvio médio de
  // 60 tiros de AWP no pulo a 20 m — tem que errar um alvo parado (torso ~0,35 m de meia-largura).
  const { seedRandom } = await import('./harness.mjs');
  seedRandom(777);
  let soma = 0; const N = 60;
  for (let i = 0; i < N; i++) {
    const [o] = coneDoDisparo({ crouchF: 0, sp: 0, grounded: false, adsF: 1, bloom: 0, scoped: true }, WEAPONS.awp, Math.random);
    soma += Math.hypot(o.x, o.y) * 20;   // offset em espaço de direção (z=-1) ≈ tan(ângulo) · distância
  }
  const desvioMedio = soma / N;
  cobra(desvioMedio >= 0.6,
    `A3 · 60 tiros de AWP no pulo: desvio médio ${desvioMedio.toFixed(2)} m a 20 m (piso 0,60 — alvo de tronco é ~0,35 m)`);

  // Semente POR TIRO: a mesma semente repete o MESMO cone (determinismo dentro do tiro),
  // sementes diferentes dão cones diferentes (varia entre tiros — não é desvio fixo).
  const coneDe = (seed) => { seedRandom(seed); return coneDoDisparo({ crouchF: 0, sp: 0, grounded: false, adsF: 1, bloom: 0, scoped: true }, WEAPONS.ak, Math.random)[0]; };
  const a = coneDe(4242), b = coneDe(4242), c = coneDe(9090);
  cobra(perto(a.x, b.x) && perto(a.y, b.y),
    'A4 · mesma semente → mesmo cone (o sorteio é reprodutível dentro do tiro — é o contrato do nó MP)');
  cobra(!perto(a.x, c.x) || !perto(a.y, c.y),
    'A5 · sementes diferentes → cones diferentes (o spread varia de tiro a tiro, não é offset fixo)');
}

/* ======================= B · PULO AGACHADO ======================= */
if (!INTERNO || MUTANTE === 'crouch-ar') {
  console.log('\n· B — pulo agachado: mesma altura, sem boost lateral');
  const h = await import('./harness.mjs');
  const g = h.bootGame('praca_poderes', { textures: h.initTextures(), seed: 4242, bots: 0 });
  const base = g.player;
  const DT = 1 / 60;

  const corpo = () => {
    const e = {
      pos: new h.THREE.Vector3(), vel: { x: 0, y: 0, z: 0 }, crouchF: 0, grounded: true,
      yaw: 0, _spaceHeld: false, coyoteUntil: 0, jumpBufferedUntil: 0, alive: true,
      weapon: base.weapon, scoped: false,
    };
    e.pos.set(base.pos.x, g.world.groundHeightAt(base.pos.x, base.pos.z, 60) + 0.001, base.pos.z);
    return e;
  };
  // strafe lateral segurando (ou não) o agachamento; devolve o que interessa do voo.
  // `spChaoAgachado` é a velocidade ESTÁVEL do corpo agachado no chão (o próprio jogo
  // calcula o maxSp — nada de copiar a tabela MOVE_MUL pra cá) e o teto do ar é ela
  // mais UM passo de aceleração (o clamp roda por quadro; um frame pode ultrapassar
  // por dt·accel antes de ser freado).
  const pulo = (crouch) => {
    const e = corpo();
    g.time = 100;
    const andar = { ax: 1, az: 0, crouch, shift: false, jump: false };
    for (let i = 0; i < 72; i++) { g._moveEntity(e, andar, DT); g.time += DT; }   // 1,2 s de aproximação
    const spChaoAgachado = Math.hypot(e.vel.x, e.vel.z);
    const voar = { ax: 1, az: 0, crouch, shift: false, jump: true };
    let decolou = false, aterrissou = false, apex = e.pos.y, vooDe = null, spMaxNoAr = 0;
    for (let i = 0; i < 132 && !aterrissou; i++) {
      const estavaNoChao = e.grounded;
      g._moveEntity(e, voar, DT); g.time += DT;
      if (estavaNoChao && !e.grounded) { decolou = true; vooDe = { x: e.pos.x, z: e.pos.z }; }
      if (decolou) {
        apex = Math.max(apex, e.pos.y);
        spMaxNoAr = Math.max(spMaxNoAr, Math.hypot(e.vel.x, e.vel.z));
        if (e.grounded) aterrissou = true;
      }
    }
    const solo = g.world.groundHeightAt(base.pos.x, base.pos.z, 60);
    return {
      apex: apex - solo,
      dist: aterrissou ? Math.hypot(e.pos.x - vooDe.x, e.pos.z - vooDe.z) : Infinity,
      spMaxNoAr, tetoAr: spChaoAgachado + 23 * DT + 0.05,
    };
  };

  const emPe = pulo(false), agachado = pulo(true);
  // mutante crouch-ar: devolve o carve-out "crouch só freia no chão" via gancho do jogo
  if (MUTANTE === 'crouch-ar') g.__mutCrouchAr = true;
  const agachadoMut = MUTANTE === 'crouch-ar' ? pulo(true) : null;
  g.__mutCrouchAr = false;

  cobra(agachado.spMaxNoAr <= agachado.tetoAr,
    `B1 · agachado NO AR não corre mais rápido que agachado no chão (${agachado.spMaxNoAr.toFixed(2)} m/s ≤ teto ${agachado.tetoAr.toFixed(2)} m/s)`);
  cobra(agachado.dist <= emPe.dist + 0.05,
    `B2 · pulo agachado NÃO vai mais longe que o em pé (${agachado.dist.toFixed(2)} m ≤ ${emPe.dist.toFixed(2)} m + 0,05)`);
  cobra(Math.abs(agachado.apex - emPe.apex) <= 0.02,
    `B3 · altura do pulo intacta (agachado ${agachado.apex.toFixed(3)} m vs em pé ${emPe.apex.toFixed(3)} m)`);
  if (MUTANTE === 'crouch-ar') {
    cobra(agachadoMut.spMaxNoAr <= agachadoMut.tetoAr,
      `B·MUT · com o carve-out antigo o corpo agachado voa a ${agachadoMut.spMaxNoAr.toFixed(2)} m/s (teto ${agachadoMut.tetoAr.toFixed(2)}) — este vermelho é o mutante mordendo`);
  }
}

/* ======================= C · RELOAD × GATILHO ======================= */
if (!INTERNO || MUTACOES[MUTANTE]?.secao === 'C') {
  console.log('\n· C — clique/gatilho preso não zera nem rearma a recarga');
  const h = await import('./harness.mjs');
  const g = h.bootGame('praca_poderes', { textures: h.initTextures(), seed: 4242, bots: 0 });
  const p = g.player;
  const DT = 1 / 60;
  g.state = 'live'; g.paused = false; p.alive = true;
  if (p.weapon !== 'ak') g._switchWeapon('ak');
  p.drawUntil = 0; p.nextShotAt = 0;
  // C1 — o relato na pior forma: pente VAZIO + gatilho SEGURADO (auto). O quadro em que o
  // prazo vence é exatamente onde o auto-fire rodava antes da conclusão. Rearmação REAL =
  // reloadUntil cresceu com o pente ainda vazio (o bug original rearma a cada virada e o
  // pente NUNCA volta — por isso a asserção é "chegou a 30", não "terminou em 30": com o
  // gatilho preso o pente cheio é gasto de novo, e isso é o comportamento CERTO).
  p.ammo.ak = { mag: 2, res: 90 };
  g.time = 300; let t = 300;
  g.mouseDown0 = true;
  let magMax = 0, rearmacoes = 0, prazoAntes = 0;
  for (let i = 0; i < Math.round(6 / DT); i++) {
    prazoAntes = p.reloadUntil;
    g._updatePlayer(DT); g.time = t += DT;
    magMax = Math.max(magMax, p.ammo.ak.mag);
    if (p.reloadUntil > prazoAntes + 0.01 && p.ammo.ak.mag === 0) rearmacoes++;
  }
  g.mouseDown0 = false;
  cobra(magMax >= 30,
    `C1 · pente vazio + gatilho segurado: a recarga COMPLETOU e o pente chegou a ${magMax} (≥30; no bug original ficava em 0 para sempre)`);
  cobra(rearmacoes <= 1,
    `C2 · nenhuma rearmação por cima de recarga vencendo (${rearmacoes}; ≤1 = só a 1ª recarga, zerar/rearmar era o bug)`);

  // C3 — cliques (mousedown novos) no MEIO da recarga tática não esticam o prazo. Depois de
  // completa, os cliques ATIRAM de novo — a asserção é sobre o PRAZO, não sobre o pente final.
  p.ammo.ak = { mag: 5, res: 90 };
  p.reloadUntil = 0; p.nextShotAt = 0;
  g.time = 400; t = 400;
  g._startReload();
  const prazo = p.reloadUntil;
  let esticou = false; magMax = 5;
  for (let i = 0; i < Math.round(4 / DT); i++) {
    if (i % 18 === 0) {
      g.mouseDown0 = true; g._tryShoot(); g.mouseDown0 = false;
      if (p.reloadUntil > prazo + 0.01 && p.ammo.ak.mag < 30) esticou = true;
    }
    g._updatePlayer(DT); g.time = t += DT;
    magMax = Math.max(magMax, p.ammo.ak.mag);
  }
  cobra(!esticou && magMax >= 30,
    `C3 · clique durante a recarga tática não zera nem reinicia o progresso (prazo ${prazo.toFixed(2)} intacto, pente chegou a ${magMax})`);

  // Contraprova: o gatilho continua VIVO fora da recarga — régua que só cobra "não atira"
  // seria satisfeita travando a arma.
  p.ammo.ak.mag = 30; p.reloadUntil = 0; p.nextShotAt = 0;
  g._tryShoot();
  cobra(p.ammo.ak.mag === 29,
    `C4 · fora da recarga o tiro continua saindo (mag 30→${p.ammo.ak.mag})`);
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
