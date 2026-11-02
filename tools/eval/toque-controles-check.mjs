#!/usr/bin/env node
/* ============================================================================
   toque-controles-check.mjs — O DEDO CONSEGUE JOGAR?
   ----------------------------------------------------------------------------
   O DONO REPROVOU, EM 21/10/2026: "ícones muito feios de armas, não tem o ícone
   de arma mesmo" e "a jogabilidade ainda tá ruim, os controles web". Medido no
   recorte deitado do Galaxy A25 (780×360), antes do conserto:

     · os 5 slots da barra eram SVG desenhado à mão, iguais para AWP, SVD e M4,
       enquanto /img/weapons já tinha 26 renders que o painel de munição, o
       killfeed e o seletor de modo usam (lá o dono já tinha reprovado glifo);
     · 300 px de arrasto giravam 41°, então a meia-volta pedia 1309 px — 3,4
       telas. Quem levava tiro pelas costas não conseguia virar;
     · arrastar a partir do botão ATIRA girava 0,0003 rad, ou seja, nada:
       corrigir a mira no meio da rajada exigia soltar o gatilho.

   O QUE ESTA RÉGUA COBRA (partida viva, toque de verdade, Pixel 5 deitado):
     TQ1  cada slot de arma mostra o RENDER da arma que o jogador carrega, e a
          imagem troca quando a arma troca;
     TQ2  uma passada de polegar vira o jogador: ≥100° em 300 px e meia-volta em
          ≤480 px, com `sensToque` escalando proporcionalmente;
     TQ3  arrastar a partir do ATIRA mira E continua atirando (um dedo só);
     TQ4  o caminho novo preserva inversão de eixo e o teto de pitch.
     TQ5  joystick não atira; gatilho tem dono e solta em cancelamento, blur e pausa.
     TQ6  o botão de câmera percorre as três vistas sem atirar.
     TQ7  snapshots de morte/respawn limpam os dedos e exigem um novo gatilho.
     TQ8  respawn local não herda clique/toque iniciado enquanto morto.
     TQ9  sobreviventes não carregam gatilho/joystick para outra rodada local ou MP.

   MUTANTES (reescrevem o arquivo SERVIDO, o disco não é tocado):
     --mutante=glifo-cru     volta o slot para SVG                  -> TQ1
     --mutante=mira-lenta    devolve 0,0024 rad/px                  -> TQ2
     --mutante=gatilho-mudo  tira o arrasto do gatilho              -> TQ3
     --mutante=joystick-atira, foco-preso                          -> TQ5
     --mutante=dedo-alheio                                        -> TQ5 e TQ7
     --mutante=camera-morta  desliga a alternância de câmera       -> TQ6
     --mutante=morte-mp-presa, respawn-mp-preso                    -> TQ7
     --mutante=respawn-sp-preso                                   -> TQ8
     --mutante=round-sp-preso, round-mp-preso                      -> TQ9

   Uso: BASE=http://127.0.0.1:9321 node tools/eval/toque-controles-check.mjs
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE_EXTERNA = process.env.BASE;
const PORTA = process.env.PORTA || '9322';
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ESPERADO = { 'glifo-cru': 'TQ1', 'mira-lenta': 'TQ2', 'gatilho-mudo': 'TQ3',
  'joystick-atira': 'TQ5', 'foco-preso': 'TQ5', 'dedo-alheio': ['TQ5', 'TQ7'], 'camera-morta': 'TQ6', 'morte-mp-presa': 'TQ7', 'respawn-mp-preso': 'TQ7', 'respawn-sp-preso': 'TQ8', 'round-sp-preso': 'TQ9', 'round-mp-preso': 'TQ9' };
if (MUT && !ESPERADO[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);

const PARTIDA = 'ui=v3&debug=1&auto=E,esquerdomacho&map=praca_poderes&lang=pt';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const devices = pw.devices || pw.default?.devices;

const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

/* O serve.mjs entrega a barra de ferramentas do Astro, que falha e levanta o overlay de
   crash por cima do jogo vivo. Mesmo stub das outras réguas de navegador. */
const STUB = 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + 'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
  args: ['--headless=new', '--mute-audio'],
});

async function abrir() {
  const ctx = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 780, height: 360 }, screen: { width: 780, height: 360 }, deviceScaleFactor: 3,
  });
  const page = await ctx.newPage();
  await page.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${MUT} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  if (MUT === 'glifo-cru') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace(
      'b.innerHTML = `<img class="touch-wep-art" src="/img/weapons/${id}.webp" alt="" draggable="false">`;',
      "b.innerHTML = '<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M2 10h13l3-2h4v2z\"/></svg>';"));
  }
  if (MUT === 'mira-lenta') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace('const TOUCH_LOOK_RAD_PX = 0.0078;', 'const TOUCH_LOOK_RAD_PX = 0.0024;'));
  }
  if (MUT === 'gatilho-mudo') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace('this._touchLook(t.clientX - x, t.clientY - y);', 'void x; void y;'));
  }
  if (MUT === 'joystick-atira') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace('if (mag < DZ) onVec(0, 0);', 'if (mag < DZ) { onVec(0, 0); this.mouseDown0 = true; this._tryShoot(); }'));
  }
  if (MUT === 'foco-preso') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace('this._blur = () => this._releaseInput();', 'this._blur = () => { this.keys = {}; };'));
  }
  if (MUT === 'dedo-alheio') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace('if (t.identifier === id) release();', 'release();'));
  }
  if (MUT === 'camera-morta') {
    await reescreve(/\/js\/tp\/hud\.js/, (t) => t.replace('(g) => g._toggleCamView()', '(g) => void g'));
  }
  if (MUT === 'morte-mp-presa' || MUT === 'respawn-mp-preso') {
    const metodo = MUT === 'morte-mp-presa' ? 'playerDied(e, snap)' : 'playerRespawned()';
    await reescreve(/\/js\/netgame\.js/, (t) => t.replace(
      `${metodo} {\n    const game = this.game;\n    game._releaseInput?.();`,
      `${metodo} {\n    const game = this.game;`));
  }
  if (MUT === 'respawn-sp-preso') {
    /* v7 da união: o guard `objective.eliminados` do modo javaporcos ficou ENTRE o
       releaseInput e o `const p`; a mordida continua removendo exatamente o
       `_releaseInput()` do renascer SP, seja lá o que vem depois. */
    await reescreve(/\/js\/game\.js/, (t) => t.replace(
      'if (this.online) return;\n    this._releaseInput();',
      'if (this.online) return;'));
  }
  if (MUT === 'round-sp-preso') {
    await reescreve(/\/js\/game\.js/, (t) => t.replace(
      '_resetPositions() {\n    this._releaseInput();', '_resetPositions() {'));
  }
  if (MUT === 'round-mp-preso') {
    await reescreve(/\/js\/netgame\.js/, (t) => t.replace(
      "} else if (depois === 'countdown') {\n        game._releaseInput?.();", "} else if (depois === 'countdown') {"));
  }
  await page.goto(`${BASE}/?${PARTIDA}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('crash-overlay')?.remove());
  return { page, fechar: () => ctx.close() };
}

const r = [];
const cobra = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

const { page, fechar } = await abrir();
const medido = await page.evaluate(async () => {
  const g = window.__game;
  const toque = (sel, tipo, x, y, id = 1) => {
    const alvo = document.querySelector(sel);
    if (!alvo) return false;
    const t = new Touch({ identifier: id, target: alvo, clientX: x, clientY: y });
    alvo.dispatchEvent(new TouchEvent(tipo, { touches: tipo === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    return true;
  };
  const arrasta = (sel, x0, y0, passos, dx, dy, id) => {
    toque(sel, 'touchstart', x0, y0, id);
    let x = x0, y = y0;
    for (let i = 0; i < passos; i++) { x += dx; y += dy; toque(sel, 'touchmove', x, y, id); }
    return { x, y };
  };
  const soltar = (sel, x, y, id) => toque(sel, 'touchend', x, y, id);

  // --- TQ1: arte por slot, e ela segue a arma na mão
  const arteDe = () => [...document.querySelectorAll('#touch-ui .touch-wep')].map((b) => ({
    slot: b.dataset.wep,
    src: b.querySelector('img')?.getAttribute('src') || null,
    ativa: b.classList.contains('ativa'),
  }));
  const antesTroca = arteDe();
  g.player.primary = 'ak';
  g._syncTouchWeps();
  const depoisTroca = arteDe();
  const imagensOk = await Promise.all([...document.querySelectorAll('#touch-ui .touch-wep-art')].map((img) => (img.complete && img.naturalWidth > 0)
    ? true
    : new Promise((res) => { img.addEventListener('load', () => res(img.naturalWidth > 0), { once: true }); img.addEventListener('error', () => res(false), { once: true }); setTimeout(() => res(img.naturalWidth > 0), 2000); })));

  // --- TQ2: giro por arrasto, com sensibilidade padrão e com metade dela
  const girar = (sens) => {
    g.settings.sensToque = sens;
    const yaw0 = g.player.yaw;
    const fim = arrasta('.touch-look', 620, 180, 10, -30, 0, 11);
    soltar('.touch-look', fim.x, fim.y, 11);
    return Math.abs(g.player.yaw - yaw0);
  };
  const giro300 = girar(1);
  const giroMetade = girar(0.5);
  g.settings.sensToque = 1;

  // --- TQ3: arrastar a partir do gatilho mira e segue atirando
  const fire = document.querySelector('.tp-toque-atira');
  const fb = fire?.getBoundingClientRect();
  let giroNoGatilho = 0, atirandoDurante = false;
  if (fb) {
    const yaw0 = g.player.yaw;
    const cx = fb.left + fb.width / 2, cy = fb.top + fb.height / 2;
    const fim = arrasta('.tp-toque-atira', cx, cy, 6, -25, 0, 12);
    atirandoDurante = !!g.mouseDown0;
    giroNoGatilho = Math.abs(g.player.yaw - yaw0);
    soltar('.tp-toque-atira', fim.x, fim.y, 12);
  }
  const soltouGatilho = !g.mouseDown0;

  // --- TQ4: inversão de eixo e teto de pitch no caminho novo
  g.player.pitch = 0; g.settings.invertY = false;
  g._touchLook(0, 40);
  const pitchNormal = g.player.pitch;
  g.player.pitch = 0; g.settings.invertY = true;
  g._touchLook(0, 40);
  const pitchInvertido = g.player.pitch;
  g.settings.invertY = false;
  g.player.pitch = 0;
  g._touchLook(0, -5000);
  const pitchTeto = g.player.pitch;

  // TQ5: movimento nunca é gatilho; só o dedo dono do ATIRA pode mantê-lo ativo.
  g.player.pitch = 0;
  const tentativas = [];
  const shoot = g._tryShoot;
  g._tryShoot = (...args) => { tentativas.push(g.mouseDown0); return shoot.apply(g, args); };
  g.mouseDown0 = false;
  const centro = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const joy = centro('.touch-joy-l');
  toque('.touch-joy-l', 'touchstart', ...joy, 20);
  toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 20);
  toque('.touch-joy-l', 'touchmove', ...joy, 20);
  const movimentoAtirou = g.mouseDown0 || tentativas.length > 0;
  soltar('.touch-joy-l', ...joy, 20);
  const gatilho = centro('.tp-toque-atira');
  toque('.tp-toque-atira', 'touchstart', ...gatilho, 21);
  toque('.tp-toque-atira', 'touchstart', ...gatilho, 22);
  soltar('.tp-toque-atira', ...gatilho, 22);
  const donoMantido = g.mouseDown0;
  toque('.tp-toque-atira', 'touchcancel', ...gatilho, 21);
  const cancelou = !g.mouseDown0;
  toque('.tp-toque-atira', 'touchstart', ...gatilho, 23);
  window.dispatchEvent(new Event('blur'));
  toque('.tp-toque-atira', 'touchmove', gatilho[0] - 10, gatilho[1], 23);
  const perdeuFoco = !g.mouseDown0;
  soltar('.tp-toque-atira', ...gatilho, 23);
  toque('.tp-toque-atira', 'touchstart', ...gatilho, 24);
  g.setPaused(true); g.setPaused(false);
  toque('.tp-toque-atira', 'touchmove', gatilho[0] - 10, gatilho[1], 24);
  const pausou = !g.mouseDown0;
  soltar('.tp-toque-atira', ...gatilho, 24);
  g._tryShoot = shoot;

  // TQ6: o antigo PING é a mesma troca de câmera da tecla B, sem disparar.
  g.setCamView('first'); g.mouseDown0 = false;
  const cameras = [];
  for (let i = 0; i < 3; i++) {
    toque('.tp-toque-camera', 'touchstart', 650, 230, 30 + i);
    soltar('.tp-toque-camera', 650, 230, 30 + i);
    cameras.push(g.camView);
  }
  const cameraSemTiro = !g.mouseDown0;

  // TQ7 usa o consumidor real do snapshot, inclusive o retorno antecipado da killcam.
  const { makeNetcode } = await import('/js/netgame.js');
  const net = { yourEnt: 7, meta: { events: true }, startPing() {}, stopPing() {} };
  const nc = makeNetcode(g, net);
  nc._netMap.set(7, g.player);
  let tick = 0;
  const snapshot = (alive) => {
    net.snap = { tick: ++tick, t: tick / 20, state: 'live', ents: [{ id: 7, alive,
      hp: alive ? 100 : 0, x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z,
      killedBy: 'TQ7', respawnIn: alive ? 0 : 1 }] };
    nc.applySnapshot();
  };
  const semEntrada = () => !g.mouseDown0 && !Object.values(g.keys).some(Boolean)
    && g.touchMove.x === 0 && g.touchMove.z === 0 && g.touchLook.x === 0 && g.touchLook.y === 0;
  const mp = {};
  try {
    snapshot(true);
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 40);
    toque('.touch-joy-l', 'touchstart', ...joy, 41);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 41);
    toque('.touch-look', 'touchstart', 600, 160, 42);
    g.keys.KeyW = true;
    mp.antesDaMorte = g.mouseDown0 && Math.abs(g.touchMove.z) > 0 && g.keys.KeyW;
    g._lastHit = { name: 'TQ7', at: g.time };
    snapshot(false);
    mp.morteLimpou = semEntrada();
    snapshot(true);
    const yaw = g.player.yaw;
    toque('.tp-toque-atira', 'touchmove', gatilho[0] - 15, gatilho[1], 40);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 41);
    toque('.touch-look', 'touchmove', 580, 160, 42);
    mp.dedosAntigosInativos = semEntrada() && g.player.yaw === yaw;
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 43);
    toque('.touch-joy-l', 'touchstart', ...joy, 44);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 44);
    soltar('.tp-toque-atira', ...gatilho, 40);
    soltar('.touch-joy-l', ...joy, 41);
    mp.novosDedosFuncionam = g.mouseDown0 && Math.abs(g.touchMove.z) > 0;
    soltar('.tp-toque-atira', ...gatilho, 43);
    soltar('.touch-joy-l', ...joy, 44);
    snapshot(false);
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 45);
    toque('.touch-joy-l', 'touchstart', ...joy, 46);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 46);
    snapshot(true);
    mp.respawnLimpou = semEntrada();
    toque('.tp-toque-atira', 'touchmove', gatilho[0] - 15, gatilho[1], 45);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 46);
    mp.toquesDaMorteInativos = semEntrada();
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 47);
    mp.novoGatilhoPosRespawn = g.mouseDown0;
  } finally {
    nc.dispose(); g._releaseInput();
  }

  // TQ8: clique desktop durante a morte e dedos móveis não atravessam a vida nova.
  const sp = {};
  const mobile = g.mobile, testMode = g.testMode;
  try {
    g.mobile = false; g.testMode = true; g.player.alive = false;
    g.renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    sp.cliqueDuranteMorte = g.mouseDown0;
    g._respawnPlayer();
    sp.mouseLimpo = semEntrada();
    g.renderer.domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    sp.novoCliqueFunciona = g.mouseDown0;
    document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    g.mobile = mobile; g.player.alive = false;
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 50);
    toque('.touch-joy-l', 'touchstart', ...joy, 51);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 51);
    g._respawnPlayer();
    sp.touchLimpo = semEntrada();
    const yaw = g.player.yaw;
    toque('.tp-toque-atira', 'touchmove', gatilho[0] - 15, gatilho[1], 50);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, 51);
    sp.dedosAntigosInativos = semEntrada() && g.player.yaw === yaw;
    toque('.tp-toque-atira', 'touchstart', ...gatilho, 52);
    sp.novoToqueFunciona = g.mouseDown0;
  } finally {
    g.mobile = mobile; g.testMode = testMode; g._releaseInput();
  }

  const rodada = {};
  const segurar = (id) => {
    toque('.tp-toque-atira', 'touchstart', ...gatilho, id);
    toque('.touch-joy-l', 'touchstart', ...joy, id + 1);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, id + 1);
  };
  const moverAntigos = (id) => {
    toque('.tp-toque-atira', 'touchmove', gatilho[0] - 15, gatilho[1], id);
    toque('.touch-joy-l', 'touchmove', joy[0], joy[1] - 45, id + 1);
  };
  try {
    segurar(60);
    rodada.spAntes = g.mouseDown0 && Math.abs(g.touchMove.z) > 0;
    g._startRound();
    rodada.spLimpa = semEntrada();
    moverAntigos(60);
    rodada.spAntigosInativos = semEntrada();
    segurar(62);
    rodada.spNovosFuncionam = g.mouseDown0 && Math.abs(g.touchMove.z) > 0;
  } finally { g._releaseInput(); }
  const netRound = { yourEnt: 7, meta: { events: true }, startPing() {}, stopPing() {} };
  const ncRound = makeNetcode(g, netRound);
  ncRound._netMap.set(7, g.player);
  const snapRound = (state, tick) => {
    netRound.snap = { state, tick, t: tick / 20, ents: [{ id: 7, alive: true, hp: 100,
      x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z }] };
    ncRound.applySnapshot();
  };
  try {
    snapRound('live', 1);
    segurar(64);
    rodada.mpAntes = g.mouseDown0 && Math.abs(g.touchMove.z) > 0;
    snapRound('roundEnd', 2); snapRound('countdown', 3);
    rodada.mpLimpa = semEntrada();
    moverAntigos(64);
    rodada.mpAntigosInativos = semEntrada();
    segurar(66);
    rodada.mpNovosFuncionam = g.mouseDown0 && Math.abs(g.touchMove.z) > 0;
  } finally { ncRound.dispose(); g._releaseInput(); }

  return {
    antesTroca, depoisTroca, imagensOk,
    giro300, grau300: giro300 * 180 / Math.PI, pxMeiaVolta: Math.PI / (giro300 / 300), giroMetade,
    giroNoGatilho, atirandoDurante, soltouGatilho,
    pitchNormal, pitchInvertido, pitchTeto,
    movimentoAtirou, donoMantido, cancelou, perdeuFoco, pausou, cameras, cameraSemTiro, mp, sp, rodada,
  };
});
await fechar();

const slots = medido.depoisTroca.filter((s) => ['primary', 'secondary', 'knife'].includes(s.slot));
const comArte = slots.filter((s) => s.src && /\/img\/weapons\/[a-z0-9_]+\.webp$/.test(s.src));
const trocou = medido.antesTroca.find((s) => s.slot === 'primary')?.src !== medido.depoisTroca.find((s) => s.slot === 'primary')?.src
  && medido.depoisTroca.find((s) => s.slot === 'primary')?.src === '/img/weapons/ak.webp';
cobra('TQ1', comArte.length === 3 && medido.imagensOk.every(Boolean) && trocou,
  comArte.length === 3
    ? `TQ1 · ${comArte.length} slots com render real (${comArte.map((s) => s.src.split('/').pop()).join(', ')}), imagens carregadas e a primária virou ak.webp ao trocar`
    : `TQ1 · só ${comArte.length}/3 slots com render de arma: ${slots.map((s) => `${s.slot}=${s.src || 'glifo'}`).join(' ')}`);

const escala = medido.giro300 > 0 ? medido.giroMetade / medido.giro300 : 0;
cobra('TQ2', medido.grau300 >= 100 && medido.pxMeiaVolta <= 480 && Math.abs(escala - 0.5) < 0.08,
  `TQ2 · 300 px giram ${medido.grau300.toFixed(0)}° (piso 100°), meia-volta em ${medido.pxMeiaVolta.toFixed(0)} px (teto 480) e sensToque 0,5 entrega ${(escala * 100).toFixed(0)}% do giro`);

cobra('TQ3', medido.giroNoGatilho > 0.3 && medido.atirandoDurante && medido.soltouGatilho,
  `TQ3 · arrastar do ATIRA girou ${medido.giroNoGatilho.toFixed(2)} rad ${medido.atirandoDurante ? 'ainda atirando' : 'mas o tiro caiu'}; soltar o dedo ${medido.soltouGatilho ? 'parou o tiro' : 'deixou o tiro preso'}`);

cobra('TQ4', medido.pitchNormal < 0 && medido.pitchInvertido > 0 && medido.pitchTeto <= 1.45 + 1e-9 && medido.pitchTeto >= 1.44,
  `TQ4 · eixo normal ${medido.pitchNormal.toFixed(2)}, invertido ${medido.pitchInvertido.toFixed(2)}, teto de pitch ${medido.pitchTeto.toFixed(2)}`);

cobra('TQ5', !medido.movimentoAtirou && medido.donoMantido && medido.cancelou && medido.perdeuFoco && medido.pausou,
  `TQ5 · ${JSON.stringify({ movimentoAtirou: medido.movimentoAtirou, donoMantido: medido.donoMantido, cancelou: medido.cancelou, perdeuFoco: medido.perdeuFoco, pausou: medido.pausou })}`);
cobra('TQ6', medido.cameras.join(',') === 'third,shoulder,first' && medido.cameraSemTiro,
  `TQ6 · câmera ${medido.cameras.join(' → ')}, sem disparo ${medido.cameraSemTiro}`);

cobra('TQ7', Object.values(medido.mp).every(Boolean), `TQ7 · snapshots MP ${JSON.stringify(medido.mp)}`);

cobra('TQ8', Object.values(medido.sp).every(Boolean), `TQ8 · respawn local ${JSON.stringify(medido.sp)}`);

cobra('TQ9', Object.values(medido.rodada).every(Boolean), `TQ9 · nova rodada ${JSON.stringify(medido.rodada)}`);

for (const c of r) console.log(`  ${c.ok ? 'ok  ' : 'FALHA'} ${c.msg}`);
const falhou = r.filter((c) => !c.ok).map((c) => c.id);
await browser.close();
servidor?.kill();

if (MUT) {
  const esperadas = [ESPERADO[MUT]].flat();
  const morde = falhou.length === esperadas.length && esperadas.every((id) => falhou.includes(id));
  console.log(morde ? `\nmutante ${MUT} reprovado como devia (${ESPERADO[MUT]})` : `\nMUTAÇÃO PASSOU — ${MUT} não acendeu ${ESPERADO[MUT]} (falhas: ${falhou.join(', ') || 'nenhuma'})`);
  process.exit(morde ? 0 : 1);
}
console.log(`\n${falhou.length ? 'REPROVADO' : 'APROVADO'} — controles de toque: ${r.length - falhou.length}/${r.length}`);
process.exit(falhou.length ? 1 : 0);
