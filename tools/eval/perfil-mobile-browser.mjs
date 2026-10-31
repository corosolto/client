#!/usr/bin/env node
/* Perfil móvel integrado no jogo real. O gate puro perfil-mobile-check cobre a política;
   este prova que main.js aplica a política antes do primeiro GLB e mantém o jogo nela. */
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '9148';
const BASE_EXTERNA = arg('base') || process.env.BASE;
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUTANTE = arg('mutante');
if (MUTANTE && MUTANTE !== 'sem-perfil') throw new Error(`mutante desconhecido: ${MUTANTE}`);
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const devices = pw.devices || pw.default?.devices;
const fonteGlcontext = readFileSync(new URL('../../public/js/glcontext.js', import.meta.url), 'utf8');
const fonteMain = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const falhas = [];
const contexto = async () => {
  const ctx = await browser.newContext({
    ...devices['Pixel 5'],
    viewport: { width: 780, height: 360 }, screen: { width: 780, height: 360 },
    deviceScaleFactor: 3,
  });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('perfil-mobile-fixture')) {
      localStorage.clear();
      // Migração real: versões anteriores gravavam o `low` automático sem identificá-lo.
      localStorage.setItem('awpbr_settings', '{"quality":"low"}');
      sessionStorage.setItem('perfil-mobile-fixture', '1');
    }
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 8 });
  });
  return ctx;
};
const mutar = async (page) => {
  /* O runner usa SwiftShader. Para medir o perfil do CELULAR em vez do fallback de
     renderizador por software, fixamos somente os metadados da GPU como hardware. */
  await page.route('**/js/glcontext.js*', async (route) => {
    const changed = fonteGlcontext.replaceAll('SOFTWARE_RE.test(gpu)', 'false')
      .replace('renderer: gpu.slice(0, 120),', "renderer: 'Test Mobile GPU',");
    if (changed === fonteGlcontext) throw new Error('fixture de GPU hardware não aplicou');
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: changed });
  });
  if (MUTANTE !== 'sem-perfil') return;
  await page.route('**/js/main.js*', async (route) => {
    const changed = fonteMain.replace(
      "const MOBILE_AUTO = !COMPAT_MODE && AUTO_PROFILE && !QUALITY_WAS_MANUAL && POINTER_COARSE;",
      'const MOBILE_AUTO = false;',
    );
    if (changed === fonteMain) throw new Error('mutante sem-perfil não aplicou');
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: changed });
  });
};

const menuCtx = await contexto();
const menu = await menuCtx.newPage();
await mutar(menu);
const menuAudio = [];
const menuGlb = [];
menu.on('request', (request) => {
  const url = request.url();
  if (/\/audio\/menu-music\//.test(url)) menuAudio.push(url);
  if (/\.glb(?:[?#]|$)/.test(url)) menuGlb.push(url);
});
await menu.goto(`${BASE}/?debug=1`, { waitUntil: 'commit', timeout: 60_000 });
await menu.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 180_000 });
await menu.waitForTimeout(1500);
const estadoMenu = await menu.evaluate(() => {
  const canvas = document.querySelector('#game-container canvas');
  const ratio = canvas?.clientWidth ? canvas.width / canvas.clientWidth : 0;
  return {
    coarse: matchMedia('(pointer: coarse)').matches,
    degrau: window.__escada?.escada?.degrau,
    dpr: window.__escada?.renderer?.getPixelRatio?.() || ratio,
    texturaMax: window.__CS_TEXTURA_MAX__ || 0,
    loadingReady: document.getElementById('load-character-3d')?.dataset.ready || '',
    marcadorAutomatico: localStorage.getItem('cs_quality_auto'),
    cadencia: window.__escada?.cadencia?.fps,
  };
});
if (!estadoMenu.coarse) falhas.push('PMB1 contexto de toque não expôs pointer:coarse');
if (estadoMenu.degrau !== 6) falhas.push(`PMB2 menu começou no degrau ${estadoMenu.degrau}, queria 6`);
if (!(estadoMenu.dpr > 0 && estadoMenu.dpr <= 0.6)) falhas.push(`PMB2 DPR móvel ${estadoMenu.dpr}, queria ≤ 0,6`);
if (estadoMenu.texturaMax !== 1024) falhas.push(`PMB3 teto de textura ${estadoMenu.texturaMax}, queria 1024`);
if (estadoMenu.loadingReady === '1') falhas.push('PMB4 carregou personagem 3D atrás da splash no celular');
if (menuAudio.length) falhas.push(`PMB5 música baixou antes do primeiro gesto (${menuAudio.length} request)`);
if (menuGlb.length) falhas.push(`PMB5 menu móvel baixou ${menuGlb.length} GLB escondido(s) antes do gesto`);
if (estadoMenu.marcadorAutomatico !== '1') falhas.push('PMB8 menu não marcou a qualidade como automática para sobreviver ao próximo save');
if (estadoMenu.cadencia !== 30) falhas.push(`PMB8 menu pediu cadência ${estadoMenu.cadencia}, queria 30 FPS`);
await menuCtx.close();

const gameCtx = await contexto();
const gamePage = await gameCtx.newPage();
await mutar(gamePage);
const gameHeavy = [];
gamePage.on('request', (request) => {
  const url = request.url();
  if (/\/models\/ambient\//.test(url)) gameHeavy.push(url);
});
await gamePage.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'commit', timeout: 60_000 });
await gamePage.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 300_000 });
await gamePage.waitForTimeout(1500);
const estadoJogo = await gamePage.evaluate(() => ({
  qualidade: window.__game?.settings?.quality,
  dpr: window.__game?.renderer?.getPixelRatio?.(),
  sombras: window.__game?.renderer?.shadowMap?.enabled,
  degrau: window.__escada?.escada?.degrau,
  texturaMax: window.__CS_TEXTURA_MAX__ || 0,
  marcadorAutomatico: localStorage.getItem('cs_quality_auto'),
  efeitos: window.__game?._fxAdaptativa,
  limiteCasings: window.__game?._limiteCasings,
  limiteDecals: window.__game?._limiteDecals,
  limiteBlood: window.__game?._limiteBloodDecals,
  cadencia: window.__escada?.cadencia?.fps,
  authored: !!window.__game?.vm?.authored,
}));
if (estadoJogo.qualidade !== 'low') falhas.push(`PMB6 partida móvel ficou em qualidade ${estadoJogo.qualidade}, queria low`);
if (!(estadoJogo.dpr > 0 && estadoJogo.dpr <= 0.6)) falhas.push(`PMB6 partida móvel ficou em DPR ${estadoJogo.dpr}, queria ≤ 0,6`);
if (estadoJogo.sombras !== false) falhas.push('PMB6 sombras dinâmicas continuam ligadas no celular');
if (estadoJogo.degrau !== 6) falhas.push(`PMB6 partida saiu do degrau inicial ${estadoJogo.degrau}, queria 6`);
if (estadoJogo.texturaMax !== 1024) falhas.push(`PMB6 partida perdeu teto de textura (${estadoJogo.texturaMax})`);
if (gameHeavy.length) falhas.push(`PMB7 partida móvel bloqueou o início com assets pesados: ${gameHeavy.map((url) => new URL(url).pathname).join(', ')}`);
if (!estadoJogo.authored) falhas.push('PMB7 perfil móvel removeu o controlador de arma com mãos');
if (estadoJogo.cadencia !== 60) falhas.push(`PMB8 partida pediu cadência ${estadoJogo.cadencia}, queria 60 FPS`);
if (!(estadoJogo.efeitos > 0 && estadoJogo.efeitos <= 0.35)
  || estadoJogo.limiteCasings > 8 || estadoJogo.limiteDecals > 17 || estadoJogo.limiteBlood > 22) {
  falhas.push(`PMB8 efeitos móveis ficaram em ${estadoJogo.efeitos}; limites ${estadoJogo.limiteCasings}/${estadoJogo.limiteDecals}/${estadoJogo.limiteBlood}`);
}
await gamePage.evaluate(() => {
  window.__escada.escada.degrau = 7;
  window.__escada.aplicaDegrau(7);
});
await gamePage.reload({ waitUntil: 'commit', timeout: 60_000 });
await gamePage.waitForFunction(() => window.__escada, null, { timeout: 300_000 });
const estadoRestaurado = await gamePage.evaluate(() => ({
  degrau: window.__escada.escada.degrau,
  salvo: localStorage.getItem('cs_mobile_degrau_v1'),
  marcadorAutomatico: localStorage.getItem('cs_quality_auto'),
}));
if (estadoRestaurado.degrau !== 7 || estadoRestaurado.salvo !== '7' || estadoRestaurado.marcadorAutomatico !== '1') {
  falhas.push(`PMB9 reload perdeu o degrau móvel: ${JSON.stringify(estadoRestaurado)}`);
}
await gamePage.evaluate(() => {
  const qualidade = document.getElementById('set-quality');
  qualidade.value = 'med';
  qualidade.dispatchEvent(new Event('change'));
});
await gamePage.reload({ waitUntil: 'commit', timeout: 60_000 });
await gamePage.waitForFunction(() => window.__escada, null, { timeout: 300_000 });
const estadoManual = await gamePage.evaluate(() => ({
  degrau: window.__escada.escada.degrau,
  marcador: localStorage.getItem('cs_quality_auto'),
}));
if (estadoManual.degrau !== 0 || estadoManual.marcador !== 'manual') {
  falhas.push(`PMB10 escolha manual não venceu o automático: ${JSON.stringify(estadoManual)}`);
}
await gameCtx.close();
await browser.close();
servidor?.kill();

if (MUTANTE) {
  if (falhas.some((falha) => /^PMB[26]/.test(falha))) {
    console.log(`mutante sem-perfil reprovado como devia: ${falhas.filter((f) => /^PMB[26]/.test(f)).join('; ')}`);
    process.exit(0);
  }
  console.error(`MUTAÇÃO PASSOU: ${falhas.join('; ') || 'nenhuma cláusula acendeu'}`);
  process.exit(1);
}
if (falhas.length) {
  for (const falha of falhas) console.error(`  ✗ ${falha}`);
  process.exit(1);
}
console.log(`perfil móvel integrado: menu ${JSON.stringify(estadoMenu)}; jogo ${JSON.stringify(estadoJogo)}; reload ${JSON.stringify(estadoRestaurado)}; manual ${JSON.stringify(estadoManual)}; sem música/GLB ocultos antes do gesto.`);
