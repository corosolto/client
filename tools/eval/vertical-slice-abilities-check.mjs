/* VERTICAL-SLICE-ABILITIES-CHECK — as três fichas precisam existir no motor, não só no GLB.
   ═══════════════════════════════════════════════════════════════════════════════════
   A revisão adversarial encontrou os personagens visíveis e armados, mas as mecânicas
   descritas em plans/19-NOVAS-FACCOES-VERTICAL-SLICES.md não tinham caminho executável.

   VS1 Programador: só depois de sobreviver a dano, por 1,2 s, direção quantizada para
       aliados próximos; LOS obrigatório e nenhum x/z exato no evento.
   VS2 Motoca: 3 s contínuos em ritmo de corrida carregam o próximo ping de rota; o ping
       dura exatamente +1 s e a carga não muda hp nem velocidade.
   VS3 Doidinho: uma vez por round, a próxima interação própria com objetivo usa fator
       1/0,8 = 1,25 durante a interação inteira; sair consome a peça e o round repõe uma.
   VS4 Integração: dano, movimento, rádio, CTF e reset chamam os helpers no jogo real.

   Mutantes: --mutante=stack-wallhack|stack-exato|motoca-cedo|motoca-sem-bonus|peca-errada
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import { bootGame, initTextures } from './harness.mjs';

const MUT = (process.argv.find(a => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [];
const perto = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const textures = initTextures();

function live(id, { ctf = false } = {}) {
  const g = bootGame(ctf ? 'corrego' : 'ferro_velho', {
    textures, ctf, seed: 19002, bots: 4, playerCharId: id,
  });
  g.state = 'live'; g.time = 10; g.player.protUntil = 0;
  return g;
}

// VS4 primeiro: quando o helper ainda não existe, o gate deve reprovar de forma legível.
let fonte = fs.readFileSync('public/js/game.js', 'utf8');
const integracoes = [
  ['dano→stack trace', /_damage\([\s\S]*?this\._stackTrace\(/],
  ['movimento→carga Motoca', /_updatePlayer\([\s\S]*?this\._updateMotocaCharge\(/],
  ['movimento→trilha', /_updatePlayer\([\s\S]*?this\._recordRoutePoint\(/],
  ['rádio→ping de rota', /_radioPick\([\s\S]*?this\._routePing\(/],
  ['CTF→peça', /_updateCTF\([\s\S]*?this\._objectiveInteractionMultiplier\(/],
  ['round→reset', /_resetPositions\([\s\S]*?this\._resetSliceAbilities\(/],
];
for (const [nome, re] of integracoes) if (!re.test(fonte)) falhas.push(`VS4 sem integração ${nome}`);

// VS1 — runtime. O try mantém todas as cláusulas reportáveis no estado pré-implementação.
try {
  const g = live('programador-virado');
  const p = g.player;
  p.pos.set(0, 0, 0); p.hp = 100;
  const inimigo = g.bots.find(b => b.team !== p.team);
  const aliado = g.bots.find(b => b.team === p.team);
  inimigo.pos.set(7.3, 0, -9.1); inimigo.alive = true;
  aliado.pos.set(2, 0, 1); aliado.alive = true;
  g._losClear = () => true;
  g._damage(p, 5, inimigo, 'M4');
  if (p.hp !== 95) falhas.push(`VS1 dano de controle mudou: hp=${p.hp}`);
  if (!perto((aliado._stackUntil || 0) - g.time, 1.2)) falhas.push(`VS1 sinal não dura 1,2 s: ${((aliado._stackUntil || 0) - g.time).toFixed(3)} s`);
  const passo = Math.PI / 4;
  if (!Number.isFinite(aliado._stackBearing) || !perto(aliado._stackBearing / passo, Math.round(aliado._stackBearing / passo), 1e-5))
    falhas.push('VS1 direção não foi quantizada em oitantes aproximados');
  const ev = g._stackTraceEvent || {};
  if (MUT === 'stack-exato') ev.x = inimigo.pos.x;
  if (Object.keys(ev).some(k => /^(x|y|z|pos|position|attacker|target)$/i.test(k)))
    falhas.push(`VS1 evento vaza posição/alvo exato: ${Object.keys(ev).join(',')}`);

  // Recomeça sem LOS. O mutante reproduz o wallhack ao neutralizar a resposta da sonda.
  delete aliado._stackUntil; delete aliado._stackBearing; g._stackTraceEvent = null;
  g._losClear = () => false;
  if (MUT === 'stack-wallhack') {
    const original = g._stackTrace.bind(g);
    g._stackTrace = a => { const los = g._losClear; g._losClear = () => true; const r = original(a); g._losClear = los; return r; };
  }
  g._damage(p, 5, inimigo, 'M4');
  if (g._stackTraceEvent || aliado._stackUntil) falhas.push('VS1 revelou agressor sem linha de visão');
} catch (e) { falhas.push(`VS1 não executa: ${e.message}`); }

// VS2 — carregar, interromper, pingar; mede estado, duração e não-interferência balística.
try {
  const g = live('motoca-cachorro-loko');
  const p = g.player, hp0 = p.hp; p.vel.set(3.1, 0, 0); const vx0 = p.vel.x;
  const tick = (dt, correndo) => g._updateMotocaCharge(MUT === 'motoca-cedo' ? dt + 0.02 : dt, correndo);
  for (let i = 0; i < 29; i++) tick(0.1, true);
  if (p._motocaPingReady) falhas.push('VS2 carga ficou pronta antes de 3,0 s contínuos');
  tick(0.1, true);
  if (!p._motocaPingReady) falhas.push('VS2 carga não ficou pronta aos 3,0 s');
  if (p.hp !== hp0 || p.vel.x !== vx0) falhas.push('VS2 carga alterou vida ou velocidade');
  if (MUT === 'motoca-sem-bonus') p._motocaPingReady = false;
  const dur = g._routePing();
  if (!perto(dur, 3)) falhas.push(`VS2 ping carregado dura ${dur} s; esperado 3 s (2 + 1)`);
  if (p._motocaPingReady) falhas.push('VS2 ping não consumiu a carga');
  g._resetSliceAbilities();
  tick(1.5, true); tick(0.1, false); tick(1.6, true);
  if (p._motocaPingReady) falhas.push('VS2 pausa não zerou a corrida contínua');
} catch (e) { falhas.push(`VS2 não executa: ${e.message}`); }

// VS3 — fator matemático e ciclo de vida da peça no CTF.
try {
  const g = live('doidinho-bairro', { ctf: true });
  const p = g.player, pt = g.ctfPts[0];
  p.pos.set(pt.x, 0, pt.z); p.alive = true; p.team = 'E';
  let a = g._objectiveInteractionMultiplier(pt, 'E');
  if (MUT === 'peca-errada' && perto(a, 1.25)) a = 1.2;
  const b = g._objectiveInteractionMultiplier(pt, 'E');
  if (!perto(a, 1.25) || !perto(b, 1.25)) falhas.push(`VS3 fator durante interação=${a}/${b}; esperado 1,25`);
  if (p._pieceReady) falhas.push('VS3 peça não foi consumida ao começar a interação');
  p.pos.set(pt.x + pt.r + 2, 0, pt.z);
  g._objectiveInteractionMultiplier(pt, 'E');
  p.pos.set(pt.x, 0, pt.z);
  const c = g._objectiveInteractionMultiplier(pt, 'E');
  if (!perto(c, 1)) falhas.push(`VS3 peça reutilizada na mesma rodada: fator ${c}`);
  g._resetSliceAbilities();
  if (!p._pieceReady || p._pieceObjectiveId) falhas.push('VS3 round novo não repôs exatamente uma peça');
  const comum = live('programador-virado', { ctf: true });
  const q = comum.ctfPts[0]; comum.player.pos.set(q.x, 0, q.z);
  if (!perto(comum._objectiveInteractionMultiplier(q, 'E'), 1)) falhas.push('VS3 bônus vazou para outro personagem');
} catch (e) { falhas.push(`VS3 não executa: ${e.message}`); }

if (falhas.length) {
  for (const f of falhas) console.error('  ✗', f);
  console.error(`VERTICAL-SLICE-ABILITIES FALHA: ${falhas.length}${MUT ? ` (mutante ${MUT} mordido)` : ''}`);
  process.exit(1);
}
if (MUT) { console.error(`MUTANTE ${MUT} sobreviveu`); process.exit(1); }
console.log('✓ VS1 stack trace: LOS, direção aproximada, 1,2 s e sem posição exata');
console.log('✓ VS2 Motoca: corrida contínua de 3 s, ping 2+1 s, sem buff físico');
console.log('✓ VS3 Doidinho: próxima interação ×1,25, uma peça por round');
console.log('VERTICAL-SLICE-ABILITIES OK');
