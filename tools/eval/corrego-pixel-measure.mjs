// MEDIÇÃO DE PIXEL da frente B (fy_corrego) — prova de browser para a régua:
//   1. censo: o jacaré/capivara GLB está NO JOGO REAL (loader de verdade, com textura);
//   2. água: com a pose CONGELADA (re-afirmada antes de cada shot), frames a 1,2 s
//      mudam pixels da faixa do canal com ?agua=1 e não mudam com ?agua=0;
//   3. fauna: censo é a prova decisiva; pixels complementam — máscara marrom da
//      capivara (GLB texturizado tem variação, proxy chapado não) e amarelo do papo.
// Uso: sh tools/eval/with-browser-lock.sh env BASE=http://127.0.0.1:8131 node tools/eval/corrego-pixel-measure.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8131';
const OUT = 'tools/eval/asset-evidence/maps/fy_corrego';
const VW = 1500, VH = 1000;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });

async function boot(qs) {
  for (let att = 0; att < 3; att++) {
    try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_corrego${qs}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { if (att === 2) throw e; }
  }
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const g = window.__game;
    for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
    g.player.hp = 1e9;
    if (g.vm && g.vm.root) g.vm.root.visible = false;
    if (g.world && g.world.ambience) g.world.ambience.setPaused(true);   // bicho parado: diff só da água
  });
  await page.addStyleTag({ content: '#hud,.screen{display:none!important}' });
}
// congela a câmera: assenta, zera vel, re-afirma imediatamente antes do shot
const congelar = (x, y, z, yaw, pitch) => page.evaluate(([px, py, pz, yw, pt]) => {
  const g = window.__game;
  g.player.pos.set(px, py, pz);
  g.player.yaw = yw; g.player.pitch = pt;
  g.player.vel.set(0, 0, 0);
  g.player.grounded = true;
}, [x, y, z, yaw, pitch]);
async function shotCongelado(nome, p, settle = 1600) {
  await congelar(...p);
  await page.waitForTimeout(settle);
  await congelar(...p);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${nome}.png`, timeout: 90000 });
}

/* ── fase A: default (GLB + água viva) ── */
await boot('');
const censo = await page.evaluate(() => {
  const g = window.__game;
  const fauna = [], lamina = [];
  g.world.root.traverse((o) => {
    if (o.userData?.fauna && o.visible !== false) fauna.push({ f: o.userData.fauna, src: o.userData.source || 'sistema' });
    if (o.userData?.corregoWaterSurface === 'base') lamina.push({
      segs: [o.geometry.parameters?.widthSegments, o.geometry.parameters?.heightSegments],
      onBeforeCompile: typeof o.material.onBeforeCompile === 'function', uAgua: !!o.material.userData?.uAgua, amp: o.userData.aguaAmp,
    });
  });
  const uAgua = lamina[0] && g.world.root.traverse(() => {}) !== undefined ? null : null;
  return { fauna, lamina, gramaSpots: (g.world.gramaSpots || []).length };
});
console.log('CENSO (browser, loader real):', JSON.stringify(censo));
// o relógio da água avança no jogo de verdade?
const relogio = await page.evaluate(async () => {
  const g = window.__game;
  let u = null;
  g.world.root.traverse((o) => { if (!u && o.userData?.corregoWaterSurface === 'base') u = o.material.userData?.uAgua; });
  if (!u) return null;
  const a = u.value;
  await new Promise((r) => setTimeout(r, 1000));
  return { antes: a, depois: u.value };
});
console.log('RELOGIO uAgua (browser):', JSON.stringify(relogio));

const POSES = {
  'jacare-canal': [2.5, -1.15, -3.5, 0.40, -0.12],
  'jacare-ponte-c': [0, 0.9, -2.5, 0, -0.55],
  'capivara-margem': [-2.0, 1.5, -34.5, 0.74, -0.23],
  'capivara-perto': [-4.0, 1.1, -36.4, 3.5, -0.18],
  'agua-ponte-norte': [0, 1.6, -21, 0, -0.35],
  'agua-rasante': [4.5, 0.2, 6, 0.643, -0.23],
  'agua-fundo-canal': [2.2, -1.4, -16, 0.9, -0.1],
  'geral-alta': [10, 8, -26, 0.558, -0.4],
};
for (const [nome, p] of Object.entries(POSES)) {
  await shotCongelado(`depois-${nome}`, p);
  console.log('  shot depois-' + nome);
}
await congelar(...POSES['agua-rasante']);
await page.waitForTimeout(1200);
await congelar(...POSES['agua-rasante']);
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/depois-agua-rasante-t2.png`, timeout: 90000 });
console.log('  shot depois-agua-rasante-t2');

/* ── fase B: ?agua=0 ── */
await boot('&agua=0');
await shotCongelado('depois-agua-rasante-morta', POSES['agua-rasante']);
await congelar(...POSES['agua-rasante']);
await page.waitForTimeout(1200);
await congelar(...POSES['agua-rasante']);
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/depois-agua-rasante-morta-t2.png`, timeout: 90000 });
console.log('  shot agua morta (2 frames)');
await browser.close();

/* ── medições (browser 2, canvas) ── */
const b2 = await chromium.launch({ headless: true, args: ['--headless=new'] });
const p2 = await b2.newPage();
const medir = async (fA, fB, expr) => p2.evaluate(async ([fa, fb, e]) => {
  const load = async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); return i; };
  const ia = await load(fa), ib = fb ? await load(fb) : null;
  const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(ia, 0, 0);
  const a = ctx.getImageData(0, 0, c.width, c.height).data;
  let b = null;
  if (ib) { ctx.drawImage(ib, 0, 0); b = ctx.getImageData(0, 0, c.width, c.height).data; }
  const fn = new Function('a', 'b', 'w', 'h', e);
  return fn(a, b, c.width, c.height);
}, [readFileSync(`${OUT}/${fA}`).toString('base64'), fB ? readFileSync(`${OUT}/${fB}`).toString('base64') : null, expr]);

const bandaCanal = `
  const y0 = (h*0.30)|0, y1 = (h*0.80)|0;
  let soma = 0, n = 0;
  for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y*w+x)*4;
    soma += Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]);
    n++;
  }
  return soma / n;
`;
const tela = bandaCanal.replace('0.30', '0.0').replace('0.80', '1.0');
const amarelo = `
  let n = 0, total = 0;
  const y0 = (h*0.25)|0, y1 = h;
  for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y*w+x)*4, r = a[i]/255, g = a[i+1]/255, bb = a[i+2]/255;
    total++;
    const mx = Math.max(r,g,bb), mn = Math.min(r,g,bb);
    const sat = mx ? (mx-mn)/mx : 0;
    const hue = mx===mn ? 0 : 60*(mx===r ? ((g-bb)/(mx-mn)+6)%6 : mx===g ? (bb-r)/(mx-mn)+2 : (r-g)/(mx-mn)+4);
    if (hue >= 40 && hue <= 70 && sat >= 0.28 && mx >= 0.22) n++;
  }
  return n / total;
`;
const marromStd = `
  let s = 0, s2 = 0, n = 0;
  const y0 = (h*0.30)|0, y1 = h;
  for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y*w+x)*4, r = a[i]/255, g = a[i+1]/255, bb = a[i+2]/255;
    const mx = Math.max(r,g,bb), mn = Math.min(r,g,bb);
    const sat = mx ? (mx-mn)/mx : 0;
    const hue = mx===mn ? 0 : 60*(mx===r ? ((g-bb)/(mx-mn)+6)%6 : mx===g ? (bb-r)/(mx-mn)+2 : (r-g)/(mx-mn)+4);
    if (hue >= 8 && hue <= 38 && sat >= 0.18 && mx < 0.75 && r > bb) {
      const l = (r*0.299 + g*0.587 + bb*0.114);
      s += l; s2 += l*l; n++;
    }
  }
  if (n < 50) return -1;
  const m = s/n;
  return Math.sqrt(s2/n - m*m);
`;
const r = {};
r.aguaVivaDiffBanda = await medir('depois-agua-rasante.png', 'depois-agua-rasante-t2.png', bandaCanal);
r.aguaMortaDiffBanda = await medir('depois-agua-rasante-morta.png', 'depois-agua-rasante-morta-t2.png', bandaCanal);
r.aguaVivaDiffTela = await medir('depois-agua-rasante.png', 'depois-agua-rasante-t2.png', tela);
r.aguaMortaDiffTela = await medir('depois-agua-rasante-morta.png', 'depois-agua-rasante-morta-t2.png', tela);
r.jacareAmareloAntes = await medir('antes-jacare-canal.png', null, amarelo);
r.jacareAmareloDepois = await medir('depois-jacare-canal.png', null, amarelo);
r.capivaraMarromStdAntes = await medir('antes-capivara-perto.png', null, marromStd);
r.capivaraMarromStdDepois = await medir('depois-capivara-perto.png', null, marromStd);
console.log('MEDIDAS:', JSON.stringify(r, null, 1));
await b2.close();
process.exit(errors ? 1 : 0);
