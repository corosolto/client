/* RÉGUA DO PASSO DE SIMULAÇÃO — o que pode e o que não pode rodar num passo que NÃO desenha.

   O laço do navegador fatia um frame longo em até 4 passos de ≤ 50 ms e **só o último desenha**
   (`public/js/main.js`, PASSO_TETO). O comentário que criou esse desenho diz para o que ele
   serve: não multiplicar o custo de GPU em FPS baixo. Só que o corte protege apenas o render —
   tudo que acontece ANTES do `if (!render) return` roda de novo a cada passo.

   Aí mora um custo que ninguém vê: a 5 FPS, o quadro real leva 200 ms, o laço executa os 4
   passos, e o radar redesenha um Canvas2D de 150×150 QUATRO VEZES para um único quadro exibido
   — com dois gradientes radiais novos por chamada e `shadowBlur` sobre até 15 blips. Desenhar
   pixel que ninguém vai ver é o oposto do que o teto de passos foi criado para fazer, e o preço
   sobe justamente na máquina que já está no limite.

   Esta régua cobra a fronteira: o que é DESENHO fica depois do gate; o que é ESTADO fica antes.

   Uso: node tools/eval/passo-sim-check.mjs
        node tools/eval/passo-sim-check.mjs --mutar=antes-do-portao   # devolve o estado anterior
        node tools/eval/passo-sim-check.mjs --mutar=sem-render-teto
*/
import { readFileSync } from 'node:fs';
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

const mainSrc = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const teto = Number(mainSrc.match(/const PASSO_TETO = (\d+);/)?.[1]);
const inicio = mainSrc.indexOf('    let resto = dtReal;');
const fim = mainSrc.indexOf('\n  } else if (!game)', inicio);
if (inicio < 0 || fim < 0 || !Number.isFinite(teto)) throw new Error('Laço de produção não encontrado');
let loopSrc = mainSrc.slice(inicio, fim);
if (MUTAR === 'sem-render-teto') {
  loopSrc = loopSrc.replace('resto <= 1e-6 || n === PASSO_TETO - 1', 'resto <= 1e-6');
  console.log('\n  [MUTANTE: sem-render-teto] — a régua TEM que reprovar');
}
const quadro = new Function('game', 'dtReal', 'PASSO_TETO', loopSrc);
const casos = [
  [0, []], [1e-7, []], [0.016, [0.016]], [0.05, [0.05]],
  [0.1, [0.05, 0.05]], [0.12, [0.05, 0.05, 0.02]],
  [0.2, [0.05, 0.05, 0.05, 0.05]],
  [0.201, [0.05, 0.05, 0.05, 0.05]],
  [0.3, [0.05, 0.05, 0.05, 0.05]],
  [0.8, [0.05, 0.05, 0.05, 0.05]],
];
console.log('\n· laço de produção: desenho no último passo, inclusive ao esgotar o teto');
cobra(teto === 4, `PASSO5 · orçamento físico original de quatro passos (${teto})`);
for (const [dt, esperado] of casos) {
  const chamadas = [];
  quadro({ update: (passo, render) => chamadas.push({ passo, render }) }, dt, teto);
  const renders = chamadas.filter((c) => c.render).length;
  cobra(chamadas.length === esperado.length && chamadas.every((c, i) => Math.abs(c.passo - esperado[i]) < 1e-12),
    `PASSO6 · dt=${dt}s mantém os passos físicos [${chamadas.map((c) => c.passo.toFixed(3)).join(', ')}]`);
  cobra(renders === (esperado.length ? 1 : 0) && (!esperado.length || chamadas.at(-1).render === true),
    `PASSO7 · dt=${dt}s desenha só no último passo (${renders} render)`);
}

const TEX = initTextures();
seedRandom(4242);

const game = new Game({
  renderer, textures: TEX, sfx,
  settings: { bots: 5, quality: 'low', difficulty: 'normal', sens: 1 },
  playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
  nickname: 'REGUA', mapId: 'praca_poderes', ctf: false, testMode: true,
  onQuit() {}, onMatchEnd() {},
});
game._ensureDolly = () => {};
game.start ? game.start() : game._startRound();
game.scene.updateMatrixWorld(true); game.world.root.updateMatrixWorld(true);

/* CONTADORES. Envolve os dois métodos e o contexto 2d do radar; o stub de canvas do harness já
   é um Proxy de no-ops, então contar chamada nele é de graça e não muda o que o jogo faz. */
const conta = { radar: 0, hud: 0, desenho: 0 };
const OPS_DE_DESENHO = new Set([
  'clearRect', 'fillRect', 'drawImage', 'stroke', 'fill', 'fillText', 'strokeText',
  'createRadialGradient', 'createLinearGradient', 'arc', 'rect', 'beginPath',
]);
const radar0 = game._updateRadar.bind(game);
game._updateRadar = () => { conta.radar++; return radar0(); };
const hud0 = game._updateHud.bind(game);
game._updateHud = () => { conta.hud++; return hud0(); };
if (game.radarCtx) {
  const ctx0 = game.radarCtx;
  game.radarCtx = new Proxy(ctx0, {
    get(t, k) {
      const v = Reflect.get(t, k);
      if (typeof v === 'function' && OPS_DE_DESENHO.has(k)) {
        return (...a) => { conta.desenho++; return v.apply(t, a); };
      }
      return v;
    },
    set(t, k, v) { return Reflect.set(t, k, v); },
  });
}

/* MUTANTE: reproduz o estado anterior POR FORA do jogo — chama HUD e radar em todo passo, como
   fazia quando as duas linhas ficavam acima do `if (!render) return`. Sem gancho em produção. */
if (MUTAR === 'antes-do-portao') {
  const update0 = game.update.bind(game);
  game.update = (dt, render) => {
    if (!render) { game._updateHud(); game._updateRadar(); }
    return update0(dt, render);
  };
  console.log('\n  [MUTANTE: antes-do-portao] — a régua TEM que reprovar');
}

const zera = () => { conta.radar = 0; conta.hud = 0; conta.desenho = 0; };
const DT = 0.05;   // o passo máximo do laço do navegador

// aquece: o primeiro quadro monta cache (a planta do radar é um offscreen memoizado)
game.update(DT, true);
zera();

// A fronteira dentro do Game também precisa preservar três passos sem desenho e um com desenho.
game.update(DT, false);
game.update(DT, false);
game.update(DT, false);
const semDesenho = { radar: conta.radar, hud: conta.hud, desenho: conta.desenho };
game.update(DT, true);
const total = { radar: conta.radar, hud: conta.hud, desenho: conta.desenho };

console.log('\n· o que roda num passo que NÃO desenha (3 passos + 1 com desenho)');
console.log(`  radar: ${semDesenho.radar} chamadas sem desenho, ${total.radar} no total`);
console.log(`  hud:   ${semDesenho.hud} chamadas sem desenho, ${total.hud} no total`);
console.log(`  ops de canvas: ${semDesenho.desenho} sem desenho, ${total.desenho} no total\n`);

cobra(semDesenho.radar === 0,
  `PASSO1 · o radar não redesenha em passo sem render (${semDesenho.radar} chamadas em 3 passos)`);
cobra(semDesenho.desenho === 0,
  `PASSO2 · nenhuma operação de Canvas2D em passo sem render (${semDesenho.desenho} operações)`);
cobra(semDesenho.hud === 0,
  `PASSO3 · o HUD não é reescrito em passo sem render (${semDesenho.hud} chamadas em 3 passos)`);
/* A contraprova: o quadro que DESENHA tem que continuar desenhando. Uma régua que só cobra
   "não faça" é satisfeita apagando a função. */
cobra(total.radar >= 1 && total.desenho > 0,
  `PASSO4 · o quadro que desenha continua desenhando (${total.radar} radar, ${total.desenho} ops)`);

zera();
const tempo0 = game.time, frames0 = game._rafFrames || 0;
quadro(game, 0.3, teto);
cobra(Math.abs(game.time - tempo0 - 0.2) < 1e-12,
  `PASSO8 · frame de 300ms simula só os 200ms originais (${(game.time - tempo0).toFixed(3)}s)`);
cobra(game._rafFrames - frames0 === 1 && conta.hud === 1 && conta.radar === 1 && conta.desenho > 0,
  `PASSO9 · laço real desenha um quadro/HUD/radar em 300ms (${game._rafFrames - frames0} quadro, ${conta.hud} HUD, ${conta.radar} radar)`);

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
