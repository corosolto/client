/* scroll-arma-check.mjs — A RODINHA DO MOUSE TROCA DE ARMA COMO NO CS?
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE
     Pedido do dono (30/09): trocar de arma pelo scroll, igual ao CS:GO (`invnext` na
     rodinha para baixo, `invprev` para cima). Antes, o `wheel` só existia no preview de
     personagem do menu (main.js); dentro da partida a rodinha não fazia nada.

   O QUE ELA MEDE (no `Game` real, via harness, com o handler de PRODUÇÃO `_wh`)
     SA1 · rodinha para baixo percorre os slots na ordem do teclado: 1 → 2 → 3 → 1
     SA2 · rodinha para cima percorre ao contrário: 1 → 3 → 2 → 1
     SA3 · um deslize de trackpad com inércia (~600 ms, deltas decaindo de 18 a 1 px)
           troca UM slot — a 1ª versão, com janela contada a partir da troca, dava 4
           trocas nesse mesmo deslize (achado do crítico de contexto limpo, 30/09)
     SA4 · com o jogo pausado a rodinha não troca nada (mesma porta `_acceptInput`)
     SA5 · modo arma-única (#268): a rodinha nunca equipa slot proibido
     SA6 · Firefox (`deltaMode` 1, linhas) conta um degrau por evento, como o mouse
     SA7 · dois cliques de rodinha a 50 ms um do outro trocam DOIS slots (`invnext` do CS
           dispara por clique; a 1ª versão engolia o segundo)
     SA8 · resíduo de pixels não acumula para sempre: 13 eventos de 4 px espalhados em
           60 s não trocam nada

   MUTAÇÕES (aplicadas sobre public/js/game.js em 30/09, medidas e revertidas)
     `dir` invertido                                           -> SA1 SA2 SA3 SA6 SA7
     `WHEEL_IDLE_MS = 0` (todo evento abre gesto novo)         -> SA3
     sem o `if (this._wheelGesto === 'feito') return;`         -> SA3
     só `deltaMode` conta como clique                          -> SA7
     `deltaMode` ignorado                                      -> SA6
     parada da rodinha não zera `_wheelAcc`                    -> SA8
     sem `if (!this._acceptInput() || this.radioOpen) return;` -> SA4
     filtro `this._pickupAllowed(w)` do `_cycleWeapon` → `true` -> SA5
     sem o `this._wh`                                          -> SA1–SA8

   uso: node tools/eval/scroll-arma-check.mjs
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { bootGame, initTextures } from './harness.mjs';

const textures = initTextures();
const falhas = [];
const linha = (c, t, d, ok) => { console.log(`${c} · ${t}\n   ${d}\n   ${ok ? 'PASSA' : 'FALHA'}\n`); if (!ok) falhas.push(c); };

const novoJogo = () => {
  const g = bootGame('fy_ferrovelho', { textures, bots: 2 });
  g.state = 'live'; g.paused = false;
  g.player.alive = true;
  g.player.primary = 'ak'; g.player.secondary = 'pistol';
  g._switchWeapon('ak');
  return g;
};
let relogio = 1000;
const roda = (g, deltaY, { deltaMode = 0, dt = 250 } = {}) => {
  relogio += dt;
  if (typeof g._wh !== 'function') throw new Error('Game._wh não existe');
  g._wh({ deltaY, deltaMode, timeStamp: relogio, preventDefault() {} });
  return g.player.weapon;
};
const tenta = (c, t, fn) => {
  try { fn(); } catch (e) { linha(c, t, `exceção ${e.message}`, false); }
};

tenta('SA1', 'rodinha para baixo: primária → pistola → faca → primária', () => {
  const g = novoJogo();
  const seq = [g.player.weapon, roda(g, 100), roda(g, 100), roda(g, 100)];
  linha('SA1', 'rodinha para baixo: primária → pistola → faca → primária', seq.join(' → '),
    seq.join() === 'ak,pistol,knife,ak');
});

tenta('SA2', 'rodinha para cima: primária → faca → pistola → primária', () => {
  const g = novoJogo();
  const seq = [g.player.weapon, roda(g, -100), roda(g, -100), roda(g, -100)];
  linha('SA2', 'rodinha para cima: primária → faca → pistola → primária', seq.join(' → '),
    seq.join() === 'ak,knife,pistol,ak');
});

const conta = (g, eventos) => {
  let trocas = 0, antes = g.player.weapon;
  for (const [dy, dt] of eventos) { const w = roda(g, dy, { dt }); if (w !== antes) { trocas++; antes = w; } }
  return trocas;
};

tenta('SA3', 'deslize de trackpad com inércia troca um slot só', () => {
  const g = novoJogo();
  const inercia = Array.from({ length: 38 }, (_, i) => [Math.max(1, Math.round(18 * Math.exp(-i / 9))), 16]);
  const trocas = conta(g, inercia);
  linha('SA3', 'deslize de trackpad com inércia troca um slot só',
    `${inercia.length} eventos em ${inercia.length * 16} ms (18 → 1 px) -> ${trocas} troca(s), arma final ${g.player.weapon}`, trocas === 1);
});

tenta('SA4', 'pausado, a rodinha não troca', () => {
  const g = novoJogo();
  g.paused = true;
  const w = roda(g, 100);
  linha('SA4', 'pausado, a rodinha não troca', `arma depois do scroll pausado: ${w}`, w === 'ak');
});

tenta('SA5', 'modo arma-única nunca equipa slot proibido', () => {
  const g = novoJogo();
  const permitido = g._pickupAllowed;
  g._pickupAllowed = (w) => w !== 'pistol';
  const seq = [g.player.weapon, roda(g, 100), roda(g, 100), roda(g, -100)];
  g._pickupAllowed = permitido;
  linha('SA5', 'modo arma-única nunca equipa slot proibido', `pistola proibida: ${seq.join(' → ')}`,
    !seq.includes('pistol') && seq.join() === 'ak,knife,ak,knife');
});

tenta('SA6', 'deltaMode de linha (Firefox) conta um degrau por evento', () => {
  const g = novoJogo();
  const w = roda(g, 3, { deltaMode: 1 });
  linha('SA6', 'deltaMode de linha (Firefox) conta um degrau por evento', `3 linhas -> ${w}`, w === 'pistol');
});

tenta('SA7', 'dois cliques rápidos de rodinha trocam dois slots', () => {
  const g = novoJogo();
  const trocas = conta(g, [[100, 250], [100, 50]]);
  linha('SA7', 'dois cliques rápidos de rodinha trocam dois slots',
    `2 cliques de 100 px a 50 ms -> ${trocas} troca(s), arma final ${g.player.weapon}`, trocas === 2 && g.player.weapon === 'knife');
});

tenta('SA8', 'resíduo de pixels esparsos não vira troca', () => {
  const g = novoJogo();
  const trocas = conta(g, Array.from({ length: 13 }, () => [4, 5000]));
  linha('SA8', 'resíduo de pixels esparsos não vira troca', `13 × 4 px em 60 s -> ${trocas} troca(s)`, trocas === 0);
});

console.log(falhas.length ? `✗ SCROLL-ARMA FALHA: ${falhas.join(', ')}` : '✓ SCROLL-ARMA  a rodinha troca de arma como no CS');
process.exit(falhas.length ? 1 : 0);
