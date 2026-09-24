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
*/
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

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

/* O PADRÃO EXATO DO NAVEGADOR a 5 FPS: quatro passos, só o último desenha
   (public/js/main.js — `game.update(passo, resto <= 1e-6)`). */
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

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
