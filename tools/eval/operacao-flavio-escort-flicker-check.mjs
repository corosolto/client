// Cintilação da escolta em marcha: troca de ameaça mais próxima, órbita de ameaça
// e pátio com trecho final obstruído não podem virar alternância de quadro no
// destino, no caminho (A*) ou na animação (parado/andando). Mede por guarda:
//   reversoes    — mudança de sentido do deslocamento entre quadros consecutivos;
//   mvToggles    — alternação da banda de animação (0,35 m/s) parado↔andando;
//   pathResets   — rota destruída (path≠null→null), o serrilhado do repath;
//   maxStep      — passo físico (teleporte);
//   slotInside   — fração de quadros dentro do slot (a suavização não pode
//                  desmontar a formação para parar de tremer).
// Pré-fix medido: troca de ameaça = salto de 5,0 m no destino em UM quadro,
// reversões 177/min, chiação de animação 2.134/min na marcha limpa.
// --diagnostico imprime as métricas sem afirmar nada (régua antes do fix).
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Game as BaseGame, PCHAR, initTextures, renderer, sfx, seedRandom } from './harness.mjs';

const reporter = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.slice(17);
if (reporter) {
  assert(['TypeError', 'AssertionError'].includes(reporter)); console.log('Mutação aplicada: controle-reporter');
  try { if (reporter === 'TypeError') throw new TypeError('controle'); assert.fail('controle'); }
  catch (error) { console.error(`✗ ${error.name}: ${error.message}`); }
  process.exit(1);
}
const diagnostico = process.argv.includes('--diagnostico');
const source = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const speed = Number(source.match(/const BOT_SPEED = ([\d.]+)/)?.[1]);
assert(Number.isFinite(speed), 'pré-condição: passo físico vem de BOT_SPEED real');
const mutations = {
  // A régua tem que morrer se a suavização do destino sair do ar: destino cru
  // devolve a troca de ameaça como salto de 180° no ponto de slot.
  'destino-cru': ['if (objectiveDestination) this._suavizaDestinoEscolta(b, objectiveDestination, dt);', ';'],
  // ...e se a histerese da formação soltar no same limiar de entrada.
  'sem-histerese-formacao': ['b._formacaoHoldAte = this.time + 0.35;', 'b._formacaoHoldAte = 0;'],
  // ...e se o escape direto puder rearmar a cada quadro com o VIP marchando.
  'sem-hold-escape-direto': ['escortCenterMoving && this.time > (b._escapeDiretoAt || 0) + 0.6', 'escortCenterMoving'],
  // ...e se a proteção de spawn voltar a piscar o corpo inteiro na escolta.
  'protecao-pisca': ["if (this.time < b.protUntil && this.world.mode !== 'escort') g.visible = Math.floor(this.time * 12) % 2 === 0;", 'if (this.time < b.protUntil) g.visible = Math.floor(this.time * 12) % 2 === 0;'],
};
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
let Game = BaseGame;
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante conhecido');
  const [before, after] = mutations[mutation];
  assert.equal(source.split(before).length, 2, 'mutação única');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => `from ${JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))}`);
  ({ Game } = await import(`data:text/javascript;base64,${Buffer.from(changed).toString('base64')}`));
  console.log(`Mutação aplicada: ${mutation}`);
}

const DT = 1 / 60, FRAMES = 1440, WARMUP = 300;   // 24 s medidos, 5 s de aquardecimento
const LATERAL = { x: 1, z: 0 };                    // eixo lateral ao avanço do VIP no pátio
const scenarios = [
  { name: 'troca', enemies: 'swap' },      // duas ameaças a ~17 m trocando de posto a 2/3 Hz
  { name: 'orbita', enemies: 'orbit' },    // uma ameaça circulando o VIP (r 17 m, 0,45 rad/s)
  { name: 'marcha', enemies: null },       // formação limpa: só o VIP e os guardas
  { name: 'bolso', enemies: 'ahead', blockedSlot: true },   // slot inacessível direto, em combate
];
const results = []; let failures = 0;
const cena = process.argv.find(arg => arg.startsWith('--cena='))?.slice(7);
for (const scenario of cena ? scenarios.filter(s => s.name === cena) : scenarios) {
  seedRandom(1);
  const game = new Game({ renderer, textures: initTextures(renderer), sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: PCHAR,
    playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'ESCORT-FLICKER-UNIT',
    mapId: 'operacao_flavio', ctf: false, testMode: true, dedicated: true, onQuit() {}, onMatchEnd() {} });
  game._ensureDolly = () => {}; game._startRound(); game.state = 'live'; game.time = 10;
  game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);
  const objective = game.objective;
  const vip = objective.vip;
  const guards = game.bots.filter(b => b.team === 'B' && b !== vip).slice(0, 3);
  const enemies = game.bots.filter(b => b.team === 'E').slice(0, 2);
  game.bots = [vip, ...guards, ...enemies]; game.combatants = [...game.bots];
  // VIP em marcha no meio do pátio: o estado do objetivo é a autoridade do movimento.
  objective.state.checkpoint = 4;
  objective.state.position.x = -9; objective.state.position.z = -31;
  vip.pos.set(-9, 0, -31);
  for (const guard of guards) {
    const slot = { ...objective.botDestination(guard) };
    guard.pos.set(slot.x, 0, slot.z); guard.yaw = 0;
    guard.path = null; guard.repathAt = 0; guard._repathMin = 0; guard._escapeUntil = 0;
    guard._regroupEscapePending = false; guard._regroupDirectEscape = false;
  }
  if (scenario.name === 'troca') {
    // Proteção de respawn não pode piscar o corpo inteiro no modo escolta.
    const protegido = guards[0]; protegido.protUntil = game.time + 2;
    let flips = 0, anterior = protegido.mesh.group.visible;
    for (let frame = 0; frame < 120; frame++) {
      game._updateBot(protegido, DT); game.time += DT;
      const atual = protegido.mesh.group.visible;
      if (atual !== anterior) flips++;
      anterior = atual;
    }
    assert.equal(flips, 0, 'troca: proteção de respawn não pisca o corpo na escolta');
  }
  for (const enemy of enemies) { enemy.hp = 1e9; enemy.pos.set(60, 0, 60); }
  const reach = game._walkReach;
  if (scenario.blockedSlot) {
    // Bolso em marcha: o slot físico segue inacessível em linha reta (fachada) e o
    // guarda está em COMBATE — o cenário do rearme de escape por quadro na marcha.
    game._walkReach = function (bot, node, ...rest) {
      if (guards.some(guard => node === guard._escortDestination)) return false;
      return reach.call(this, bot, node, ...rest);
    };
    // ROTEAMENTO LEGÍTIMO: o gate de ameaça do modo só engaja a formação com o que o
    // VIP VÊ (_ameacasRoteamento). A fachada deste cenário bloqueia a VISTA do VIP
    // pro inimigo à frente — sem isto a formação desengaja e o bolso deixa de ser
    // testado (medido: 192 reversões/min de formação desengajada, determinístico).
    // Olhos do VIP forçados; a física do guarda (LOS/aquisição) segue real.
    objective._vipTemLos = () => true;
  }
  const per = guards.map(() => ({ reversals: 0, mvToggles: 0, pathResets: 0, maxStep: 0,
    rawJumps: 0, rawReversals: 0, rawJumpMax: 0, goalStepMax: 0, inside: 0, insideLate: 0, lateFrames: 0, frames: 0 }));
  const vels = guards.map(() => ({ x: 0, z: 0, mv: false, has: false }));
  const goals = guards.map(() => null);
  const consumed = guards.map(() => null);
  const vipStart = objective.state.position.z;
  seedRandom(1);
  for (let frame = 0; frame < FRAMES; frame++) {
    const t = frame * DT;
    if (scenario.enemies === 'swap') {
      const wobble = 1.2 * Math.sin(2 * Math.PI * t / 3);
      enemies[0].pos.set(vip.pos.x + LATERAL.x * (17 + wobble), 0, vip.pos.z + LATERAL.z * (17 + wobble) - 2);
      enemies[1].pos.set(vip.pos.x - LATERAL.x * (17 - wobble), 0, vip.pos.z - LATERAL.z * (17 - wobble) - 2);
      for (const enemy of enemies) game._collide(enemy.pos, 0.38);
    } else if (scenario.enemies === 'orbit') {
      const a = 0.45 * t;
      enemies[0].pos.set(vip.pos.x + Math.cos(a) * 17, 0, vip.pos.z + Math.sin(a) * 17);
      game._collide(enemies[0].pos, 0.38);
    } else if (scenario.enemies === 'ahead') {
      // Ameaça parada 25 m à frente do VIP (fora do raio de ameaça do estado):
      // guarda engajado enquanto escolta com o trecho final obstruído.
      enemies[0].pos.set(vip.pos.x, 0, vip.pos.z + 25);
      game._collide(enemies[0].pos, 0.38);
    }
    objective.update(DT);
    game.time += DT;
    guards.forEach((guard, i) => {
      const m = per[i], v = vels[i];
      const goal = { ...objective.botDestination(guard) };
      const px = guard.pos.x, pz = guard.pos.z;
      const prevPath = guard.path;
      game._updateBot(guard, DT);
      const dx = guard.pos.x - px, dz = guard.pos.z - pz, spd = Math.hypot(dx, dz) / DT;
      // Destino CONSUMIDO (o objeto do modo sai de _updateBoot já suavizado): o arco
      // limita o passo a ~omega*raio*dt (~0,17 m/quadro). Sem suavização, o salto da
      // troca de ameaça atravessa inteiro (medido: até 5 m em um quadro).
      if (guard._escortDestination && frame >= WARMUP) {
        const c = guard._escortDestination;
        if (consumed[i]) m.goalStepMax = Math.max(m.goalStepMax, Math.hypot(c.x - consumed[i].x, c.z - consumed[i].z));
        consumed[i] = { x: c.x, z: c.z };
      }
      m.maxStep = Math.max(m.maxStep, Math.hypot(dx, dz));
      if (frame >= WARMUP) {
        m.frames++;
        const late = frame >= FRAMES - 720;
        if (late) { m.lateFrames++; m.insideLate += Number(Math.hypot(goal.x - guard.pos.x, goal.z - guard.pos.z) <= goal.slotRadius); }
        m.inside += Number(Math.hypot(goal.x - guard.pos.x, goal.z - guard.pos.z) <= goal.slotRadius);
        const dot = v.has ? (dx / DT) * v.x + (dz / DT) * v.z : 0;
        const mag = Math.hypot(dx / DT, dz / DT) * Math.hypot(v.x, v.z);
        if (v.has && dot < -0.25 * mag && Math.hypot(dx / DT, dz / DT) > 0.5 && Math.hypot(v.x, v.z) > 0.5) m.reversals++;
        const mv = spd > 0.35;
        if (v.has && mv !== v.mv) m.mvToggles++;
        if (prevPath && !guard.path) m.pathResets++;
        if (goals[i]) {
          const gdx = goal.x - goals[i].x, gdz = goal.z - goals[i].z, gmag = Math.hypot(gdx, gdz);
          m.rawJumpMax = Math.max(m.rawJumpMax, gmag);
          if (gmag > 0.8) m.rawJumps++;
          if (goals[i].hasDelta) {
            const pdx = goals[i].dx, pdz = goals[i].dz;
            const gdot = gdx * pdx + gdz * pdz;
            if (gdot < -0.5 * gmag * Math.hypot(pdx, pdz) && gmag > 0.15 && Math.hypot(pdx, pdz) > 0.15) m.rawReversals++;
          }
          goals[i].dx = gdx; goals[i].dz = gdz; goals[i].hasDelta = true;
        } else goals[i] = { x: goal.x, z: goal.z };
        goals[i].x = goal.x; goals[i].z = goal.z;
      }
      v.x = dx / DT; v.z = dz / DT; v.mv = spd > 0.35; v.has = true;
    });
  }
  const minutes = (FRAMES - WARMUP) * DT / 60;
  const aggregate = per.map(m => ({
    reversoesPorMin: +(m.reversals / minutes).toFixed(1),
    mvTogglesPorMin: +(m.mvToggles / minutes).toFixed(1),
    pathResetsPorMin: +(m.pathResets / minutes).toFixed(1),
    maxStep: +m.maxStep.toFixed(4),
    rawJumps: m.rawJumps, rawReversals: m.rawReversals, rawJumpMax: +m.rawJumpMax.toFixed(3),
    goalStepMax: +m.goalStepMax.toFixed(3),
    slotInsideFrac: +(m.inside / Math.max(1, m.frames)).toFixed(3),
    slotInsideFracFim: +(m.insideLate / Math.max(1, m.lateFrames)).toFixed(3),
  }));
  const vipProgress = objective.state.position.z - vipStart;
  const result = { cenario: scenario.name, aggregate, progressoVip: +vipProgress.toFixed(2),
    checkpointFinal: objective.state.checkpoint };
  try {
    if (!diagnostico) {
      // Passo físico + UMA fatia de despenetração limitada (2 passos/quadro): o
      // teleporte era o pop de ~0,9 m da despenetração integral em um único quadro.
      for (const a of aggregate) assert(a.maxStep <= speed / 60 + 0.3, `${scenario.name}: passo físico sem teleporte (${a.maxStep})`);
      if (scenario.enemies === 'swap') {
        assert(aggregate.some(a => a.rawJumps >= 10), `${scenario.name}: régua exerce troca de ameaça no destino cru`);
        for (const a of aggregate) assert(a.goalStepMax <= 0.5, `${scenario.name}: destino consumido anda por arco, não salta (${a.goalStepMax} m/quadro)`);
        for (const a of aggregate) {
          assert(a.reversoesPorMin <= 26, `${scenario.name}: sem alternância de sentido por quadro (${a.reversoesPorMin}/min)`);
          assert(a.mvTogglesPorMin <= 180, `${scenario.name}: animação sem chiação parado/andando (${a.mvTogglesPorMin}/min)`);
          assert(a.pathResetsPorMin <= 30, `${scenario.name}: rota sem serrilhado de repath (${a.pathResetsPorMin}/min)`);
        }
      } else if (scenario.enemies === 'orbit') {
        for (const a of aggregate) {
          assert(a.reversoesPorMin <= 26, `${scenario.name}: órbita rastreia sem inverter o passo (${a.reversoesPorMin}/min)`);
          assert(a.slotInsideFracFim >= 0.55, `${scenario.name}: suavização não desmonta a formação (${a.slotInsideFracFim})`);
        }
      } else if (scenario.name === 'marcha') {
        for (const a of aggregate) {
          assert(a.reversoesPorMin <= 12, `${scenario.name}: marcha limpa sem vai-e-vem (${a.reversoesPorMin}/min)`);
          assert(a.mvTogglesPorMin <= 30, `${scenario.name}: marcha limpa sem chiação de animação (${a.mvTogglesPorMin}/min)`);
          assert(a.pathResetsPorMin <= 24, `${scenario.name}: marcha limpa sem destruir rota (${a.pathResetsPorMin}/min)`);
        }
        // Maioria (2 de 3): um guarda em desvio de bolso é evento de cobertura, não
        // defeito de suavização — mas a formação em si tem que acompanhar o VIP.
        assert(aggregate.filter(a => a.slotInsideFracFim >= 0.6).length >= 2,
          `${scenario.name}: formação acompanha o VIP (${aggregate.map(a => a.slotInsideFracFim).join('/')})`);
        assert(vipProgress > 20, `marcha: VIP avança pelo pátio (${vipProgress.toFixed(1)} m)`);
      } else if (scenario.blockedSlot) {
        for (const a of aggregate) {
          // Rearme limitado a ~1/s (hold de 0,6 s); o bug era rearmar POR QUADRO
          // (~60/s). Cenário sintético de fachada permanente: o escape tenta de novo
          // a cada ciclo — com frequência de quadro a régua morre na hora.
          assert(a.pathResetsPorMin <= 90, `${scenario.name}: bolso em marcha sem rearmar rota por quadro (${a.pathResetsPorMin}/min)`);
          assert(a.reversoesPorMin <= 180, `${scenario.name}: bolso em marcha sem inverter o passo por quadro (${a.reversoesPorMin}/min)`);
        }
        assert(vipProgress > 10, `bolso: VIP continua avançando (${vipProgress.toFixed(1)} m)`);
      }
      console.log(`✓ ${scenario.name}: escolta sem cintilação`);
    } else {
      console.log(`▸ ${scenario.name}: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    failures++; result.falha = `${error.name}: ${error.message}`;
    console.error(`✗ ${result.falha}`);
  } finally { results.push(result); game.dispose(); }
}
const reportFile = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
const report = { unit: true, synthetic: true, browserQA: false, diagnostico, results };
if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (failures && !diagnostico) process.exitCode = 1;
