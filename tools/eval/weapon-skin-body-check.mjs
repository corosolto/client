#!/usr/bin/env node
/*
  WB1 — todo pixel visível de símbolo, frase, bandeira ou brasão tem corpo da arma
  renderizado por baixo nas duas laterais. Mede o jogo real: pintura ligada × desligada
  contra uma máscara branca da própria malha, com 2 px de tolerância só para antialias.

  Caso real, 19/10/2026: o dono reprovou a bandeira do Pack MAGA 47 porque a placa
  atravessava a silhueta do receiver. A primeira medição encontrou 25,34–25,36% dos
  pixels fora na AK, 9,55–12,71% na pistola e 4,32–5,38% na AK Emo. O mutante
  `extravasar` amplia as imagens 2,4× e precisa deixar WB1 vermelho; mutante que não
  encontra imagem aborta a medição.
*/
import { execSync, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { WEAPON_SKINS } from '../../public/js/data/weapon-skin-definitions.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const arg = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').split('=')[1] || '';
const MUTANT = arg('mutante');
if (MUTANT && MUTANT !== 'extravasar') throw new Error(`mutante desconhecido: ${MUTANT}`);
const ONLY = new Set((arg('skins') || '').split(',').filter(Boolean));
const PORT = arg('porta') || '9484';
const REMOTE = process.env.BASE || '';
const BASE = REMOTE || `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT || '/tmp/weapon-skin-body';
const VIEWS = Object.freeze([
  Object.freeze({ id: 'left', rotation: 0 }),
  Object.freeze({ id: 'right', rotation: Math.PI }),
]);
const TARGETS = Object.values(WEAPON_SKINS)
  .filter((skin) => skin.markAsset && (!ONLY.size || ONLY.has(skin.id)))
  .flatMap((skin) => skin.targetWeapons.map((weapon) => ({ skin, weapon })));
if (!TARGETS.length) throw new Error('nenhuma skin com imagem para medir');

const gRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const server = REMOTE ? null : spawn(process.execPath, ['tools/eval/serve.mjs', PORT], { cwd: ROOT, stdio: 'ignore' });
const stopServer = () => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
};
process.on('exit', stopServer);
for (let attempt = 0; attempt < 80; attempt += 1) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch { /* subindo */ }
  if (attempt === 79) throw new Error(`servidor de avaliação não respondeu em ${BASE}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const failures = [];
const results = [];
let mutationCount = 0;

const raw = async (png) => sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const measure = async (paintedPng, basePng, maskPng) => {
  const [painted, base, mask] = await Promise.all([raw(paintedPng), raw(basePng), raw(maskPng)]);
  const { width, height, channels } = painted.info;
  if (base.info.width !== width || base.info.height !== height || mask.info.width !== width || mask.info.height !== height) {
    throw new Error('capturas com dimensões divergentes');
  }
  const body = new Uint8Array(width * height);
  for (let pixel = 0; pixel < body.length; pixel += 1) {
    const offset = pixel * channels;
    body[pixel] = Math.max(mask.data[offset], mask.data[offset + 1], mask.data[offset + 2]) >= 72 ? 1 : 0;
  }
  const supported = new Uint8Array(body.length);
  const radius = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = false;
      for (let dy = -radius; dy <= radius && !hit; dy += 1) {
        const row = y + dy;
        if (row < 0 || row >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const column = x + dx;
          if (column >= 0 && column < width && body[row * width + column]) { hit = true; break; }
        }
      }
      supported[y * width + x] = hit ? 1 : 0;
    }
  }
  let paintedPixels = 0;
  let outsidePixels = 0;
  for (let pixel = 0; pixel < body.length; pixel += 1) {
    const offset = pixel * channels;
    const difference = Math.max(
      Math.abs(painted.data[offset] - base.data[offset]),
      Math.abs(painted.data[offset + 1] - base.data[offset + 1]),
      Math.abs(painted.data[offset + 2] - base.data[offset + 2]),
    );
    if (difference < 18) continue;
    paintedPixels += 1;
    if (!supported[pixel]) outsidePixels += 1;
  }
  return {
    paintedPixels,
    outsidePixels,
    outsideRatio: paintedPixels ? outsidePixels / paintedPixels : 1,
  };
};

try {
  for (const { skin, weapon } of TARGETS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${BASE}/weapon-skin-review.html?weapon=${encodeURIComponent(weapon)}&skin=${encodeURIComponent(skin.id)}&view=side`, {
      waitUntil: 'networkidle',
      timeout: 120000,
    });
    await page.waitForFunction(() => window.REVIEW_READY === true, null, { timeout: 60000 });
    const markingCount = await page.evaluate((mutant) => {
      const markings = [];
      window.REVIEW_MODEL.traverse((object) => {
        if (object.isMesh && (object.name.startsWith('skin-') || object.name.startsWith('club-mark-'))) markings.push(object);
      });
      if (mutant === 'extravasar') {
        for (const marking of markings) marking.scale.multiplyScalar(2.4);
        window.REVIEW_MODEL.updateMatrixWorld(true);
      }
      return markings.length;
    }, MUTANT);
    if (!markingCount) {
      console.log(`NOTA WB1 ${skin.id}/${weapon} — imagem declarada sem plano lateral neste chassi`);
      await page.close();
      continue;
    }
    if (MUTANT) mutationCount += markingCount;

    for (const view of VIEWS) {
      await page.evaluate((rotation) => {
        window.REVIEW_MODEL.rotation.y = rotation;
        window.REVIEW_MODEL.updateMatrixWorld(true);
      }, view.rotation);
      await page.waitForTimeout(120);
      const paintedPng = await page.screenshot({ type: 'png' });
      await page.evaluate(() => {
        window.REVIEW_MODEL.traverse((object) => {
          if (object.isMesh && (object.name.startsWith('skin-') || object.name.startsWith('club-mark-'))) object.visible = false;
        });
      });
      await page.waitForTimeout(80);
      const basePng = await page.screenshot({ type: 'png' });
      await page.evaluate(() => {
        window.REVIEW_MODEL.traverse((object) => {
          if (!object.isMesh || object.name.startsWith('skin-') || object.name.startsWith('club-mark-')) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (!material) continue;
            material.map = null;
            material.alphaMap = null;
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            material.toneMapped = false;
            material.color?.set(0xffffff);
            material.emissive?.set(0xffffff);
            if ('emissiveIntensity' in material) material.emissiveIntensity = 1;
            if ('metalness' in material) material.metalness = 0;
            if ('roughness' in material) material.roughness = 1;
            material.onBeforeCompile = () => {};
            material.customProgramCacheKey = () => 'weapon-body-mask-v1';
            material.needsUpdate = true;
          }
        });
      });
      await page.waitForTimeout(120);
      const maskPng = await page.screenshot({ type: 'png' });
      const metrics = await measure(paintedPng, basePng, maskPng);
      const prefix = `${skin.id}-${weapon}-${view.id}`;
      await Promise.all([
        sharp(paintedPng).toFile(path.join(OUT, `${prefix}-painted.png`)),
        sharp(basePng).toFile(path.join(OUT, `${prefix}-base.png`)),
        sharp(maskPng).toFile(path.join(OUT, `${prefix}-mask.png`)),
      ]);
      const measurable = metrics.paintedPixels >= 40;
      const contained = measurable && metrics.outsidePixels === 0;
      const evidence = `${metrics.outsidePixels}/${metrics.paintedPixels} px fora (${(metrics.outsideRatio * 100).toFixed(2)}%)`;
      console.log(`${contained ? 'PASSA' : 'FALHA'} WB1 ${prefix} — ${evidence}`);
      results.push({ skin: skin.id, weapon, view: view.id, ...metrics, measurable, contained });
      if (!contained) failures.push(`${prefix}: ${measurable ? evidence : 'imagem sem pixels suficientes para medir'}`);
      await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForFunction(() => window.REVIEW_READY === true, null, { timeout: 60000 });
      if (MUTANT) {
        await page.evaluate(() => {
          window.REVIEW_MODEL.traverse((object) => {
            if (object.isMesh && (object.name.startsWith('skin-') || object.name.startsWith('club-mark-'))) object.scale.multiplyScalar(2.4);
          });
          window.REVIEW_MODEL.updateMatrixWorld(true);
        });
      }
    }
    if (errors.length) failures.push(`${skin.id}/${weapon}: console ${errors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
  stopServer();
}

if (MUTANT && !mutationCount) throw new Error('MUTANTE NÃO APLICOU: nenhum plano de imagem foi ampliado');
const summary = {
  targetPairs: TARGETS.length,
  measuredViews: results.length,
  failedViews: failures.length,
  mutationCount,
  out: OUT,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  console.error(`WB1 vermelho: ${failures.join('; ')}`);
  process.exit(1);
}
console.log(`WB1 verde: ${results.length} laterais com todos os pixels pintados dentro do corpo da arma`);
