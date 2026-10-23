#!/usr/bin/env node
/* ============================================================================
   emote-partida-check.mjs — DÁ PRA DANÇAR NA PARTIDA, E A DANÇA SABE A HORA DE SAIR?
   ----------------------------------------------------------------------------
   O PR anterior entregou as 8 danças só no lobby. Em partida não havia tecla,
   menu nem corpo dançando — e o dono cobrou: "tinha que ter uma tecla e um menu".

   Esta régua cobra o caminho inteiro do jogador:
     EP1  a tecla T abre a roda com os 8 passos, e T/ESC fecham;
     EP2  escolher pelo dígito faz o CORPO de 3ª pessoa dançar, e a câmera sai da
          1ª pessoa sozinha (em 1ª pessoa o jogador não veria nada);
     EP3  andar cancela na hora e DEVOLVE a câmera ao que era;
     EP4  morto não dança: morrer derruba o passo e a roda não abre;
     EP5  dançando, a câmera AFASTA — de combate ela cola nas costas e esconde o
          passo.

   MUTANTES (reescrevem o arquivo servido; o disco não é tocado):
     --mutante=tecla-morta    T não abre a roda            -> EP1+EP2+EP3+EP5
     --mutante=camera-colada  não troca pra 3ª pessoa      -> EP2+EP5
     --mutante=anda-dancando  andar não cancela            -> EP3
     --mutante=morto-dancando o abate não derruba o passo  -> EP4
     --mutante=camera-perto   câmera não afasta            -> EP5

   Uso: BASE=http://127.0.0.1:9351 node tools/eval/emote-partida-check.mjs
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE_EXTERNA = process.env.BASE;
const PORTA = process.env.PORTA || '9352';
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ESPERADO = {
  // acoplamentos reais e declarados: sem roda nada toca, e sem 3a pessoa nao ha
  // distancia de camera pra medir.
  'tecla-morta': ['EP1', 'EP2', 'EP3', 'EP5'], 'camera-colada': ['EP2', 'EP5'], 'anda-dancando': ['EP3'],
  'morto-dancando': ['EP4'], 'camera-perto': ['EP5'], 'porta-aberta': ['EP6'],
};
if (MUT && !ESPERADO[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);

const PARTIDA = 'debug=1&auto=E,esquerdomacho&map=praca_poderes';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

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

const STUB = 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + 'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
const page = await ctx.newPage();
await page.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
const reescreve = (teste, troca) => page.route(teste, async (r) => {
  const res = await r.fetch();
  const antes = await res.text();
  const depois = troca(antes);
  if (depois === antes) throw new Error(`mutante ${MUT} não aplicou em ${r.request().url()}`);
  await r.fulfill({ response: res, body: depois });
});
/* A mecânica só existe com a porta aberta: EP1-EP5 medem o jogo com EMOTES_ENABLED
   ligado por reescrita do arquivo servido; EP6 mede o padrão de produção num contexto
   limpo, mais abaixo. O mutante `porta-aberta` só mexe no contexto de EP6. */
const LIGA_FLAG = (t) => t.replace('EMOTES_ENABLED = false', 'EMOTES_ENABLED = true');
await reescreve(/\/js\/emote-features\.js/, LIGA_FLAG);
if (MUT === 'tecla-morta') await reescreve(/\/js\/game\.js/, (t) => t.replace("if (e.code === 'KeyT' && !e.repeat) { this._emoteToggle(); return; }", "if (false) { return; }"));
if (MUT === 'camera-colada') await reescreve(/\/js\/game\.js/, (t) => t.replace("if (this.camView === 'first') { this.emoteCam = this.camView; this.setCamView('third'); }", "/* colada */"));
if (MUT === 'anda-dancando') await reescreve(/\/js\/game\.js/, (t) => t.replace('const andou = Math.abs(input?.ax || 0) > 0.01 || Math.abs(input?.az || 0) > 0.01;', 'const andou = false;'));
if (MUT === 'morto-dancando') await reescreve(/\/js\/game\.js/, (t) => t.replace('if (ent.isPlayer) this._emoteStop();   // ninguém dança morto', '/* cadaver dancando */'));
if (MUT === 'camera-perto') await reescreve(/\/js\/game\.js/, (t) => t.replace('+ 1.5 * danca;', '+ 0 * danca;'));

await page.goto(`${BASE}/?${PARTIDA}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById('crash-overlay')?.remove());

const leRoda = () => page.evaluate(() => ({
  aberta: !!window.__game.emoteOpen,
  visivel: !document.getElementById('emote-wheel')?.classList.contains('hidden'),
  itens: [...document.querySelectorAll('#emote-wheel .emote-fatia')].map((b) => b.dataset.emote),
}));

/* ---- EP1: tecla abre, tecla fecha ---- */
const camInicial = await page.evaluate(() => window.__game.camView);
await page.keyboard.press('KeyT');
await page.waitForTimeout(1500);
const abriu = await leRoda();
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const fechouEsc = await leRoda();
await page.keyboard.press('KeyT');
await page.waitForTimeout(600);

/* ---- EP2: dígito toca; corpo dança; câmera sai da 1ª ---- */
await page.keyboard.press('Digit4');
await page.waitForTimeout(700);
const tocando = await page.evaluate(() => ({
  emote: window.__game._emoteAtual,
  cam: window.__game.camView,
  rodaFechou: !window.__game.emoteOpen,
  corpo: !!window.__game.playerTP?.ctrl?.emoteAtual?.(),
}));
const corpoCm = await page.evaluate(async () => {
  const T = await import('/vendor/three.module.js');
  const g = window.__game, tp = g.playerTP;
  if (!tp) return 0;
  let mao = null; tp.group.traverse((o) => { if (!mao && o.isBone && o.name === 'RightHand') mao = o; });
  if (!mao) return 0;
  const pos = () => { tp.group.updateMatrixWorld(true); return mao.getWorldPosition(new T.Vector3()); };
  const p0 = pos(); let pico = 0;
  for (let i = 0; i < 90; i++) { g.update(1 / 60); pico = Math.max(pico, p0.distanceTo(pos()) * 100); }
  return +pico.toFixed(1);
});

/* ---- EP5: a câmera afasta enquanto dança ---- */
const distancias = await page.evaluate(async () => {
  const T = await import('/vendor/three.module.js');
  const g = window.__game;
  const dist = () => {
    const c = g.camera.getWorldPosition(new T.Vector3());
    return Math.hypot(c.x - g.player.pos.x, c.z - g.player.pos.z);
  };
  for (let i = 0; i < 40; i++) g.update(1 / 60);
  const dancando = dist();
  g._emoteStop();
  for (let i = 0; i < 90; i++) g.update(1 / 60);
  g.setCamView('third');
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  const parado = dist();
  return { dancando: +dancando.toFixed(2), parado: +parado.toFixed(2) };
});

/* ---- EP3: andar cancela e devolve a câmera ---- */
await page.evaluate(() => { window.__game.setCamView('first'); });
await page.waitForTimeout(300);
await page.keyboard.press('KeyT');
await page.waitForTimeout(600);
await page.keyboard.press('Digit1');
await page.waitForTimeout(700);
const antesAndar = await page.evaluate(() => ({ emote: window.__game._emoteAtual, cam: window.__game.camView }));
/* Em headless o rAF fica estrangulado (medido: 0,02 s de relogio em 0,8 s reais), entao a
   regua DIRIGE os quadros em vez de esperar o laço — senao mede congelamento, nao cancelamento. */
const aposAndar = await page.evaluate(() => {
  const g = window.__game;
  g.keys.KeyW = true;
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  g.keys.KeyW = false;
  for (let i = 0; i < 10; i++) g.update(1 / 60);
  return { emote: g._emoteAtual, cam: g.camView };
});

/* ---- EP4: morto não dança ---- */
await page.waitForTimeout(400);
const morte = await page.evaluate(async () => {
  const g = window.__game;
  g.setCamView('third');
  await g._emoteToggle();
  g._emotePick('samba');
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  const dancavaVivo = !!g._emoteAtual;
  g._damage(g.player, 9999, g.bots?.[0] || g.player, 'AWP');
  for (let i = 0; i < 40; i++) g.update(1 / 60);
  const aposMorte = g._emoteAtual;
  await g._emoteToggle();                       // morto não abre a roda
  const abriuMorto = !!g.emoteOpen;
  return { dancavaVivo, aposMorte, abriuMorto, vivo: g.player.alive };
});

await ctx.close();

/* ---- EP6: a PORTA. Contexto limpo, sem ligar a flag: é o que o jogador recebe hoje. ---- */
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 760 } });
const pageP = await ctxP.newPage();
await pageP.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
if (MUT === 'porta-aberta') {
  await pageP.route(/\/js\/game\.js/, async (rota) => {
    const res = await rota.fetch();
    const antes = await res.text();
    const depois = antes.replace('    if (!EMOTES_ENABLED) return;\n', '');
    if (depois === antes) throw new Error('mutante porta-aberta não aplicou em game.js');
    await rota.fulfill({ response: res, body: depois });
  });
}
await pageP.goto(`${BASE}/?${PARTIDA}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await pageP.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
await pageP.waitForTimeout(2000);
await pageP.keyboard.press('KeyT');
await pageP.waitForTimeout(1200);
const porta = await pageP.evaluate(() => ({
  aberta: !!window.__game.emoteOpen,
  visivel: !document.getElementById('emote-wheel')?.classList.contains('hidden'),
}));
await ctxP.close();
await browser.close();

/* ---------------------------- VEREDITO ---------------------------- */
const r = [];
const cobra = (id, ok, texto) => r.push({ id, ok, texto });

cobra('EP1', abriu.aberta && abriu.visivel && abriu.itens.length === 8 && !fechouEsc.aberta,
  `EP1 · tecla T abre a roda com ${abriu.itens.length} passos (${abriu.itens.slice(0, 3).join(', ')}…) e ESC fecha`);

cobra('EP2', tocando.emote === 'frevo' && tocando.corpo && tocando.rodaFechou
  && camInicial === 'first' && tocando.cam !== 'first' && corpoCm >= 20,
  `EP2 · dígito 4 tocou ${tocando.emote}: corpo moveu ${corpoCm} cm e a câmera saiu de ${camInicial} para ${tocando.cam}`);

cobra('EP3', antesAndar.emote && !aposAndar.emote && aposAndar.cam === 'first',
  `EP3 · andar derrubou ${antesAndar.emote} na hora e devolveu a câmera (${antesAndar.cam} → ${aposAndar.cam})`);

cobra('EP4', morte.dancavaVivo && !morte.aposMorte && !morte.abriuMorto && !morte.vivo,
  `EP4 · morrer derrubou o passo e a roda não abre morto`
  + (morte.aposMorte ? ` — SEGUIU DANÇANDO (${morte.aposMorte})` : '')
  + (morte.abriuMorto ? ' — RODA ABRIU MORTO' : ''));

cobra('EP5', distancias.dancando >= distancias.parado + 0.8,
  `EP5 · câmera afasta pra mostrar o passo: ${distancias.dancando} m dançando contra ${distancias.parado} m parado`);

cobra('EP6', !porta.aberta && !porta.visivel,
  'EP6 · porta fechada: com EMOTES_ENABLED=false a tecla T não abre a roda em partida'
  + (porta.aberta ? ' — RODA ABRIU' : '') + (porta.visivel ? ' — RODA VISÍVEL' : ''));

const falhou = r.filter((x) => !x.ok);
for (const x of r) console.log(`  ${x.ok ? 'ok  ' : 'FALHA'} ${x.texto}`);

if (MUT) {
  const esperado = ESPERADO[MUT];
  const acendeu = falhou.map((x) => x.id);
  const certo = esperado.every((e) => acendeu.includes(e)) && acendeu.every((a) => esperado.includes(a));
  console.log(certo
    ? `\n== ${MUT}: mutante reprovado como devia (${acendeu.join('+')})`
    : `\n== ${MUT}: MUTAÇÃO PASSOU — esperado ${esperado.join('+')}, acendeu ${acendeu.join('+') || 'nada'}`);
  process.exit(certo ? 0 : 1);
}

console.log(`\n${falhou.length ? 'REPROVADO' : 'APROVADO'} — dança em partida: ${r.length - falhou.length}/${r.length}`);
process.exit(falhou.length ? 1 : 0);
