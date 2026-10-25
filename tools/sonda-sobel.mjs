/* sonda-sobel.mjs — a otimização do `normalFromCanvas` muda algum pixel?
   ═══════════════════════════════════════════════════════════════════════════════════
   Roda as DUAS versões lado a lado, no navegador real, sobre as MESMAS texturas que o
   boot gera, e compara byte a byte. É a prova que o comentário de `textures.js` cita:
   otimização de boot que mexe num pixel é regressão de arte, não ganho.

   O `normalFromCanvas` antigo é reinjetado como `window.__sobelAntigo` por interceptação
   de rota — o arquivo em disco não é tocado.

   USO: node tools/sonda-sobel.mjs
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'https://www.csbrasil.online';

/* Cópia LITERAL da versão de origin/main (textures.js:67-84, v2.1.0-alpha.123). Ela mora
   aqui e não no git history de propósito: a prova tem que ser legível junto do resultado. */
const ANTIGO = `window.__sobelAntigo = function (src, strength, canvas, MAX_DETAIL) {
  const w = Math.min(src.width, MAX_DETAIL), h = Math.min(src.height, MAX_DETAIL);
  const tmp = canvas(w, h); const tctx = tmp.getContext('2d');
  tctx.drawImage(src, 0, 0, w, h);
  const s = tctx.getImageData(0, 0, w, h).data;
  const out = canvas(w, h), octx = out.getContext('2d');
  const img = octx.createImageData(w, h), d = img.data;
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength;
    const dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const nx = -dx, ny = dy, nz = 1, l = Math.sqrt(nx * nx + ny * ny + 1);
    const i = (y * w + x) * 4;
    d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (nz / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
};
`;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
let saida = 1;
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => {
    try { localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false, updatedAt: new Date(0).toISOString() })); } catch {}
  });
  const corpo = readFileSync(new URL('../public/js/textures.js', import.meta.url), 'utf8');
  /* Cada canvas de albedo que passa pelo withDetail é guardado; o comparador roda depois,
     fora do caminho crítico, para não misturar o custo da prova com o custo do boot. */
  const marcado = corpo.replace(
    '    const n = mk(normalFromCanvas(src, strength)), r = mk(roughFromCanvas(src, lo, hi));',
    '    try { (window.__albedos = window.__albedos || []).push({ src, strength }); window.__sobelNovo = normalFromCanvas; window.__sobelCanvas = canvas; window.__sobelMax = MAX_DETAIL; } catch {}\n    const n = mk(normalFromCanvas(src, strength)), r = mk(roughFromCanvas(src, lo, hi));',
  );
  if (marcado === corpo) throw new Error('não achei a linha do withDetail para instrumentar');
  await context.route('**/js/textures.js*', async (rota) => {
    const r = await rota.fetch();
    await rota.fulfill({ response: r, body: ANTIGO + marcado });
  });
  await context.route('**/js/main.js*', async (rota) => {
    const r = await rota.fetch();
    await rota.fulfill({ response: r, body: readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8') });
  });

  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'commit', timeout: 180000 });
  await page.waitForFunction(() => {
    const se = document.getElementById('splash-enter');
    return !!se && !se.classList.contains('hidden');
  }, null, { timeout: 180000, polling: 150 });

  const r = await page.evaluate(() => {
    const albedos = window.__albedos || [];
    const saida = { total: albedos.length, iguais: 0, diferentes: [], msNovo: 0, msAntigo: 0 };
    const pixels = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let k = 0; k < albedos.length; k++) {
      const { src, strength } = albedos[k];
      let t = performance.now();
      const novo = window.__sobelNovo(src, strength);
      saida.msNovo += performance.now() - t;
      t = performance.now();
      const velho = window.__sobelAntigo(src, strength, window.__sobelCanvas, window.__sobelMax);
      saida.msAntigo += performance.now() - t;
      const a = pixels(novo), b = pixels(velho);
      let dif = 0;
      if (a.length !== b.length) dif = -1;
      else for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dif++;
      if (dif === 0) saida.iguais++;
      else saida.diferentes.push({ i: k, w: novo.width, h: novo.height, bytes: dif });
    }
    return saida;
  });

  console.log(`texturas comparadas: ${r.total}`);
  console.log(`idênticas byte a byte: ${r.iguais}`);
  console.log(`tempo somado — novo ${r.msNovo.toFixed(0)} ms · antigo ${r.msAntigo.toFixed(0)} ms (${(r.msAntigo / Math.max(r.msNovo, 0.001)).toFixed(1)}× mais rápido)`);
  if (r.diferentes.length) {
    console.error('✗ DIFERENÇAS:', JSON.stringify(r.diferentes));
  } else if (r.total === 0) {
    console.error('✗ nenhuma textura passou pelo withDetail — a sonda não mediu nada');
  } else {
    console.log('✓ saída idêntica');
    saida = 0;
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
} finally {
  await browser.close().catch(() => {});
}
process.exit(saida);
