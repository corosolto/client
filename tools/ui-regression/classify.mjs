#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baseDir = arg('--base', 'artifacts/ui-regression/base');
const headDir = arg('--head', 'artifacts/ui-regression/head');
const out = arg('--out', 'artifacts/ui-regression/classification');
await mkdir(out, { recursive: true });
const base = JSON.parse(await readFile(join(baseDir, 'manifest.json'), 'utf8'));
const head = JSON.parse(await readFile(join(headDir, 'manifest.json'), 'utf8'));
const levels = { SEM_REGRESSAO: 0, REVISAR: 1, INCONCLUSIVO: 2, REGRESSAO: 3 };
const report = { status: 'SEM_REGRESSAO', scenes: {}, thresholds: { changedPixelDelta: 24, reviewChangedFraction: 0.01, geometryDeltaPx: 4 } };
const rank = (status) => { if (levels[status] > levels[report.status]) report.status = status; };
const unique = (values) => [...new Set(values || [])];
const normalizedError = (value, source) => {
  let normalized = String(value);
  if (source) normalized = normalized.replaceAll(source, '<origin>');
  return normalized.replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:<port>');
};
const ignoredCache = new Map();
const isIgnoredAsset = (pathname) => {
  if (ignoredCache.has(pathname)) return ignoredCache.get(pathname);
  let relative;
  try { relative = `public${decodeURIComponent(pathname)}`; } catch { return false; }
  if (!relative.startsWith('public/') || relative.split('/').includes('..')) return false;
  const ignored = spawnSync('git', ['check-ignore', '-q', relative], { timeout: 5000 }).status === 0;
  ignoredCache.set(pathname, ignored);
  return ignored;
};

async function compareImages(name) {
  const first = await sharp(join(baseDir, `${name}.stable.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const second = await sharp(join(headDir, `${name}.stable.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = first.info; const b = second.info;
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    return { incompatible: true, base: [a.width, a.height], head: [b.width, b.height] };
  }
  let changed = 0; let sum = 0;
  const diff = Buffer.alloc(a.width * a.height * 3);
  for (let pixel = 0; pixel < a.width * a.height; pixel++) {
    const offset = pixel * 3;
    const delta = Math.max(...[0, 1, 2].map((channel) => Math.abs(first.data[offset + channel] - second.data[offset + channel])));
    sum += delta;
    if (delta > 24) { changed++; diff[offset] = 255; diff[offset + 1] = 50; diff[offset + 2] = 40; }
  }
  await sharp(diff, { raw: { width: a.width, height: a.height, channels: 3 } }).png().toFile(join(out, `${name}.diff.png`));
  return { changedFraction: Math.round(changed / (a.width * a.height) * 10000) / 10000, meanMaxDelta: Math.round(sum / (a.width * a.height) * 10) / 10 };
}

for (const name of new Set([...Object.keys(base.scenes), ...Object.keys(head.scenes)])) {
  const before = base.scenes[name]; const after = head.scenes[name];
  const scene = { status: 'SEM_REGRESSAO', reasons: [] };
  report.scenes[name] = scene;
  const mark = (status, reason) => { if (levels[status] > levels[scene.status]) scene.status = status; scene.reasons.push(reason); rank(status); };
  if (!before || before.failed) { mark('INCONCLUSIVO', `baseline indisponível: ${before?.failed || 'cena ausente'}`); continue; }
  if (!after || after.failed) { mark('REGRESSAO', `captura do PR falhou: ${after?.failed || 'cena ausente'}`); continue; }
  const baseErrors = unique(before.errors.map((error) => normalizedError(error, base.source)));
  const newErrors = unique(after.errors.map((error) => normalizedError(error, head.source))).filter((error) => !baseErrors.includes(error));
  if (newErrors.length) mark('REGRESSAO', `novo erro JavaScript: ${newErrors.slice(0, 2).join(' | ')}`);
  const added404 = unique(after.assets404).filter((path) => !unique(before.assets404).includes(path));
  const ignored404 = added404.filter((path) => isIgnoredAsset(path));
  const new404 = added404.filter((path) => !ignored404.includes(path));
  if (new404.length) mark('REGRESSAO', `novo 404 local: ${new404.slice(0, 3).join(', ')}`);
  if (ignored404.length) scene.reasons.push(`${ignored404.length} 404 adicionais de assets ignorados pelo Git (fora do pacote da CI)`);
  const inherited404 = unique(after.assets404).filter((path) => unique(before.assets404).includes(path));
  if (inherited404.length) scene.reasons.push(`404 herdados: ${inherited404.slice(0, 3).join(', ')}`);
  if (before.mediaReady === true && after.mediaReady === false) mark('REGRESSAO', 'prévia do mapa/personagem deixou de carregar');
  if (before.mediaReady === false && after.mediaReady === false) mark('INCONCLUSIVO', 'prévia do mapa/personagem não carregou na base nem no PR');
  for (const [selector, oldElement] of Object.entries(before.elements || {})) {
    const newElement = after.elements?.[selector];
    if (oldElement.visible && !newElement?.visible) {
      mark('REGRESSAO', `${selector} desapareceu`);
      continue;
    }
    if (!oldElement.visible || !newElement?.visible || !oldElement.rect || !newElement.rect) continue;
    const [x, y, w, h] = newElement.rect;
    const [viewportWidth, viewportHeight] = after.viewport;
    const oldRect = oldElement.rect;
    const wasInside = oldRect[0] >= -4 && oldRect[1] >= -4 && oldRect[0] + oldRect[2] <= before.viewport[0] + 4 && oldRect[1] + oldRect[3] <= before.viewport[1] + 4;
    const isOutside = x < -4 || y < -4 || x + w > viewportWidth + 4 || y + h > viewportHeight + 4;
    if (wasInside && isOutside) mark('REGRESSAO', `${selector} saiu da tela: ${newElement.rect.join(', ')}`);
    const maxDelta = Math.max(...oldRect.map((value, index) => Math.abs(value - newElement.rect[index])));
    if (maxDelta > 4) mark('REVISAR', `${selector} moveu/redimensionou ${Math.round(maxDelta)} px`);
  }
  try {
    scene.visual = await compareImages(name);
    if (scene.visual.incompatible) mark('REGRESSAO', 'dimensões da captura mudaram');
    else if (scene.visual.changedFraction > 0.01) mark('REVISAR', `${Math.round(scene.visual.changedFraction * 1000) / 10}% dos pixels estáveis mudou`);
  } catch (error) {
    mark('INCONCLUSIVO', `comparação visual falhou: ${String(error.message || error).slice(0, 180)}`);
  }
}

const rows = Object.entries(report.scenes).map(([name, scene]) => `| ${name} | ${scene.status} | ${scene.visual?.changedFraction == null ? '—' : `${Math.round(scene.visual.changedFraction * 1000) / 10}%`} | ${scene.reasons.join('; ') || 'Sem mudança detectada'} |`);
const summary = [
  `# Bot de regressão da UI: ${report.status}`,
  '',
  'Comparação do mesmo navegador e runner entre a base do PR e o código proposto. As capturas completas e os mapas de diferença estão no artefato do workflow.',
  '',
  '| Tela | Classificação | Pixels estáveis alterados | Evidência |',
  '|---|---|---:|---|',
  ...rows,
  '',
  'REGRESSAO = nova falha de execução, 404 de asset versionável ou elemento crítico desaparecido/saiu da tela. REVISAR = mudança visual/geométrica que exige olhar humano. INCONCLUSIVO = baseline ou comparação indisponível. SEM_REGRESSAO = nenhuma diferença acima dos limiares.',
  '',
].join('\n');
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(out, 'summary.md'), summary);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
if (report.status === 'REGRESSAO' || report.status === 'INCONCLUSIVO') process.exitCode = 1;
