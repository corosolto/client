#!/usr/bin/env node
/* ============================================================================
   pause-check.mjs — RÉGUA DA PAUSA: "o jogo não pode sair da partida sozinho".
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito do dono, 04/08, CINCO ocorrências):
     "pela quinta vez o jogo reiniciou sozinho, eu estava no meio de uma partida
      e ele foi pro menu principal sozinho"

   CAUSA RAIZ, medida — e NÃO era caminho automático nenhum:
     `quitToMenu()` tem exatamente dois chamadores em public/js/main.js, os dois
     `onclick` (SAIR PRO MENU e MENU). O clique era REAL. O que estava errado é que
     o jogo PÕE esses botões debaixo da mira, sozinho, no meio do tiroteio:

       1. `_plc` (game.js) pausa a QUALQUER perda de pointer lock — alt-tab, ESC,
          notificação do SO, o Chrome tirando o foco. O jogador não pediu pausa.
       2. O menu de pausa nasce clicável no MESMO frame, centrado na tela.
       3. Medido em Chromium 1536×1024 (3:2, o enquadramento do dono), com o pause
          aberto (cláusula PAUSA3 abaixo, `--geo`):
              canvas sob o cursor ............  0,00 % da tela
              #pause-menu (fundo) ............ 95,59 %
              os 5 botões .................... 4,42 %  (REINICIAR+SAIR = 1,66 %)
              centro da tela ................. CONFIGURAÇÕES
              centro + 100 px ................ REINICIAR PARTIDA
              centro + 150 px ................ SAIR PRO MENU
          Ou seja: a coluna de botões fica exatamente na linha de tiro, e as duas
          ações destrutivas a um flick da mira.
       4. O escape hatch estava MORTO: `_md` só retomava com
          `e.target === renderer.domElement`, e com 0,00 % de canvas exposto isso
          nunca acontece pausado. Todo clique do jogador só podia virar botão.

   O QUE ESTA RÉGUA COBRA (e as MUTAÇÕES que a fazem ficar VERMELHA):

     PAUSA1  perda de pointer lock pausa com o painel DESARMADO (pointer-events:none)
             mutação: `PAUSE_ARM_MS = 0` em game.js  → vermelha
     PAUSA2  clique durante a guarda RETOMA a partida em vez de apertar botão
             mutação: apagar o bloco `if (this.paused && this._pauseBackdrop(...))`
             de `_md` (volta ao estado de 04/08) → vermelha
     PAUSA3  passada a guarda, o painel VOLTA a aceitar clique
             (senão ressuscita o G2-R2: "clico em SAIR PRO MENU e não acontece nada")
             mutação: `pauseArmed(){ return false; }` → vermelha
     PAUSA4  clique no BOTÃO (painel armado) NÃO retoma — o menu tem que funcionar
             mutação: `_pauseBackdrop(){ return true; }` → vermelha
     PAUSA5  nenhum caminho AUTOMÁTICO tira uma partida ativa do jogo: todo chamador de
             `quitToMenu()` e todo `show('main-menu')` está num handler deliberado. A
             única exceção é a fronteira de `startGame`, antes de existir partida
             utilizável, que limpa uma abertura quebrada e entrega o BUG-42 ao modal.
             mutação: `setTimeout(quitToMenu, 1000)` em qualquer lugar → vermelha
     PAUSA6  as duas ações destrutivas exigem DOIS toques com intervalo mínimo
             (um clique só nunca tira o jogador da partida; e uma rajada de cliques
             no mesmo pixel também não, que é o que o jogador faz de verdade)
             mutação: trocar `needsConfirm($('btn-quit'), …)` por
             `$('btn-quit').onclick = …` direto → vermelha

   USO
     node tools/eval/pause-check.mjs          # cláusulas 1-6 (node puro, ~5 s)
     node tools/eval/pause-check.mjs --mutante=automenu
     node tools/eval/pause-check.mjs --geo    # + a medição de geometria (Chromium)
                                              #   precisa de `node tools/eval/serve.mjs 8123`
   Sai 1 se qualquer cláusula falhar.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initTextures, bootGame, confirmGate, CONFIRM_MIN_MS } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const JSON_OUT = process.argv.includes('--json');
const GEO = process.argv.includes('--geo');
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'automenu') {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(1);
}

const out = [];
const put = (id, desc, ok, evid) => out.push({ id, desc, ok, evid });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GAME_JS = readFileSync(join(ROOT, 'public/js/game.js'), 'utf8');
let MAIN_JS = readFileSync(join(ROOT, 'public/js/main.js'), 'utf8');
if (MUTANTE === 'automenu') MAIN_JS += '\nsetTimeout(quitToMenu, 1000); // MUTANTE PAUSA5\n';

/* ---------- 1-4: COMPORTAMENTO, na classe Game de verdade -------------------
   Nada de ler declaração de constante: a régua DIRIGE o jogo. Ela derruba o
   pointer lock (é o gatilho real do defeito), dispara o `_plc` de produção e
   entrega ao `_md` de produção os mesmos alvos que o browser entregaria. */
const textures = initTextures();
const g = bootGame('praca_poderes', { textures });
g.testMode = false;                 // testMode desliga a pausa por perda de lock
g.state = 'live';
g._requestLock = () => { g.__pediuLock = (g.__pediuLock || 0) + 1; };   // não há canvas de verdade aqui
const painel = g.el.pauseActions;
const fundo = g.el.pause;
const botao = { closest: (sel) => (sel === '.pause-actions' || sel === '#pause-menu' ? painel : null) };

// gatilho REAL: o pointer lock caiu (alt-tab / ESC / notificação)
globalThis.document.pointerLockElement = null;
g._plc();

put('PAUSA1', 'perda de pointer lock pausa com o painel DESARMADO',
  g.paused === true && !!painel && painel.style.pointerEvents === 'none',
  `paused=${g.paused} pointerEvents=${painel && painel.style.pointerEvents}`);

// o tiro que já estava saindo: mousedown no overlay (durante a guarda o painel está com
// pointer-events:none, então até o clique MIRADO no botão chega como fundo)
g._md({ button: 0, target: fundo });
put('PAUSA2', 'clique durante a guarda RETOMA a partida (não aperta botão)',
  g.paused === false && g.__pediuLock > 0,
  `paused=${g.paused} pedidosDeLock=${g.__pediuLock || 0}`);

// segunda pausa: espera a guarda passar e confere que o painel VOLTA a ser clicável
g._plc();
const armadoNaHora = g.pauseArmed();
await sleep(750);
put('PAUSA3', 'passada a janela de guarda o painel volta a aceitar clique',
  armadoNaHora === false && g.pauseArmed() === true && painel.style.pointerEvents === '',
  `armadoNaHora=${armadoNaHora} armadoDepois=${g.pauseArmed()} pointerEvents="${painel.style.pointerEvents}"`);

// com o painel armado, um clique NO BOTÃO não pode retomar: o menu tem que funcionar
const pausadoAntes = g.paused;
g._md({ button: 0, target: botao });
put('PAUSA4', 'clique no BOTÃO (armado) não retoma — o menu de pausa continua funcionando',
  pausadoAntes === true && g.paused === true,
  `pausadoAntes=${pausadoAntes} pausadoDepois=${g.paused}`);

/* ---------- 5: nenhum caminho AUTOMÁTICO tira uma partida ativa do jogo ----
   Toda linha de main.js que chama `quitToMenu()` ou `show('main-menu')` tem que estar
   num handler de clique (`.onclick`/`addEventListener('click'`) ou no handler de ESC do
   próprio menu. A exceção é o catch delimitado de `startGame`: ele desfaz uma partida
   que não terminou de abrir e aciona o modal do BUG-42. */
{
  const linhas = MAIN_JS.split('\n');
  /* O CORPO de quitToMenu() é isento — quem decide são os chamadores dela, e eles passam
     por esta mesma varredura. A isenção é por FAIXA DE LINHA calculada, não por "tem
     'function quitToMenu' perto": a versão frouxa passou verde com um
     `setTimeout(quitToMenu, 1000)` colado logo abaixo do fim da função (mutação medida). */
  const ini = linhas.findIndex((l) => /^\s*function quitToMenu\s*\(/.test(l));
  let fim = -1;
  if (ini >= 0) for (let j = ini + 1; j < linhas.length; j++) if (/^\}/.test(linhas[j])) { fim = j; break; }
  const startIni = linhas.findIndex((l) => /^async function startGame\s*\(/.test(l));
  const startFim = linhas.findIndex((l, i) => i > startIni && /^async function _startGame\s*\(/.test(l));
  const startBloco = startIni >= 0 && startFim > startIni ? linhas.slice(startIni, startFim).join('\n') : '';
  const fronteiraDeAbertura = /__gameLaunch\?\.begin/.test(startBloco)
    && /catch\s*\(/.test(startBloco) && /game = null/.test(startBloco)
    && /__gameLaunch\?\.fail/.test(startBloco);
  const suspeitas = [];
  for (let i = 0; i < linhas.length; i++) {
    const L = linhas[i];
    /* qualquer MENÇÃO a quitToMenu conta, não só `quitToMenu(`: passar a função como
       callback (`setTimeout(quitToMenu, 1000)`, `.then(quitToMenu)`) é justamente o jeito
       de criar um caminho automático sem escrever um par de parênteses — e foi assim que
       a primeira versão desta cláusula passou verde na própria mutação. */
    const chamada = /\bquitToMenu\b/.test(L) && !/^\s*function quitToMenu\s*\(/.test(L);
    if (!chamada && !/show\(\s*['"]main-menu['"]\s*\)/.test(L)) continue;
    if (/^\s*(function|\/\/|\*)/.test(L)) continue;            // a própria definição / comentário
    // dentro do corpo de quitToMenu, só o `show` é isento; uma CHAMADA a quitToMenu ali
    // dentro seria recursão e continua sendo suspeita
    if (!chamada && ini >= 0 && i > ini && i < fim) continue;
    if (!chamada && fronteiraDeAbertura && i > startIni && i < startFim) continue;
    // contexto: o handler pode abrir algumas linhas acima (onclick de bloco)
    const ctx = linhas.slice(Math.max(0, i - 8), i + 1).join('\n');
    const porClique = /\.onclick\s*=|addEventListener\(\s*['"]click['"]|addEventListener\(\s*['"]keydown['"]|needsConfirm\(/.test(ctx);
    if (!porClique) suspeitas.push(`${i + 1}: ${L.trim().slice(0, 90)}`);
  }
  // o boot (`show(isMobile ? … : 'main-menu')`) é legítimo: não há partida nenhuma ainda
  const reais = suspeitas.filter((s) => !/isMobile/.test(s));
  put('PAUSA5', 'nenhum caminho AUTOMÁTICO tira uma partida ativa do jogo',
    reais.length === 0, reais.length ? reais.join(' | ') : 'ok — só ação deliberada ou catch delimitado de startGame');
}

/* ---------- 6: um clique só nunca destrói a partida ------------------------
   Metade estática (os dois botões passam pelo confirmador) e metade COMPORTAMENTAL: a
   regra de verdade (`confirmGate`, exportada do game.js) é dirigida com as três mãos que
   importam. A rajada é o caso que reprovou a PRIMEIRA versão desta trava: 8 cliques a
   60 ms no mesmo pixel confirmaram sozinhos e o jogo saiu pro menu no Chromium. */
{
  const semConfirm = [];
  for (const id of ['btn-quit', 'btn-restart']) {
    const direto = new RegExp(`\\$\\(\\s*['"]${id}['"]\\s*\\)\\.onclick`).test(MAIN_JS);
    const confirmado = new RegExp(`needsConfirm\\(\\s*\\$\\(\\s*['"]${id}['"]`).test(MAIN_JS);
    if (direto || !confirmado) semConfirm.push(`${id}${direto ? ' (onclick direto)' : ' (sem needsConfirm)'}`);
  }
  // simula o botão de verdade: `armado` é o estado que o main.js guarda por botão
  const aperta = (cliques) => {
    let armado = 0, saiu = false;
    for (const t of cliques) {
      const a = confirmGate(t, armado);
      if (a === 'confirma') { saiu = true; break; }
      armado = t;
    }
    return saiu;
  };
  const T0 = 1000;   // performance.now() no 1º clique nunca é 0 (0 é "desarmado")
  const umToque = aperta([T0]);
  const rajada = aperta(Array.from({ length: 40 }, (_, i) => T0 + i * 60));       // 2,4 s a 60 ms
  const rajadaLenta = aperta(Array.from({ length: 20 }, (_, i) => T0 + i * 200)); // 4,0 s a 200 ms
  const deliberado = aperta([T0, T0 + 900]);
  put('PAUSA6', 'SAIR PRO MENU e REINICIAR exigem 2 toques deliberados (rajada não confirma)',
    semConfirm.length === 0 && !umToque && !rajada && !rajadaLenta && deliberado,
    semConfirm.length ? semConfirm.join(', ')
      : `ok — 1 toque=${umToque} rajada60ms=${rajada} rajada200ms=${rajadaLenta} deliberado(0,900ms)=${deliberado} (MIN=${CONFIRM_MIN_MS}ms)`);
}

/* ---------- geometria (opcional, precisa de Chromium + serve.mjs) ---------- */
if (GEO) {
  const { chromium } = await import('playwright');
  const [W, H] = [1536, 1024];
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8123/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const geo = await page.evaluate(({ w, h }) => {
    const SCR = ['main-menu', 'map-screen', 'team-select', 'char-select', 'settings-panel', 'howto-panel', 'ranking-panel', 'pause-menu', 'match-end', 'mobile-warning'];
    const bs = document.getElementById('boot-splash'); if (bs) bs.remove();
    document.getElementById('load-overlay').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    for (const s of SCR) document.getElementById(s).classList.toggle('hidden', s !== 'pause-menu');
    const probe = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.id || (e.closest('[id]') || {}).id || e.tagName) : 'null'; };
    const c = {}; let tot = 0;
    for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) { tot++; const k = probe(x, y); c[k] = (c[k] || 0) + 1; }
    return {
      area: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +(100 * v / tot).toFixed(2)])),
      centro: probe(w / 2, h / 2), mais100: probe(w / 2, h / 2 + 100), mais150: probe(w / 2, h / 2 + 150),
    };
  }, { w: W, h: H });
  await browser.close();
  const destrutiva = (geo.area['btn-quit'] || 0) + (geo.area['btn-restart'] || 0);
  put('PAUSA-GEO', 'medição: quanto da tela vira ação destrutiva com o pause aberto', true,
    `canvas=${geo.area['game-container'] || geo.area.CANVAS || 0}% fundo=${geo.area['pause-menu']}% destrutivos=${destrutiva.toFixed(2)}% ` +
    `| centro=${geo.centro} +100=${geo.mais100} +150=${geo.mais150}`);
}

const falhas = out.filter((r) => r.ok === false);
if (JSON_OUT) console.log(JSON.stringify({ out, falhas: falhas.length }, null, 2));
else {
  for (const r of out) console.log(`${r.ok === false ? '✗' : '✓'} ${r.id} — ${r.desc}\n    ${r.evid}`);
  console.log(`\n${out.length - falhas.length}/${out.length} cláusulas passam`);
  // linha estável pro portão (invariants.mjs faz o parse desta linha, não da tabela)
  console.log(`PAUSECHECK ${out.length - falhas.length}/${out.length} clausulas`);
  console.log(`FALHAS: ${falhas.map((f) => `${f.id} (${f.evid})`).join(' | ')}`);
}
process.exit(falhas.length ? 1 : 0);
