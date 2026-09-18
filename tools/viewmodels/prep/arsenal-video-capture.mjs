#!/usr/bin/env node
// Vídeo contínuo das 26 armas no jogo real. Os stills congelam frações de clipe
// e por isso não mostram transição, tranco nem continuidade entre quadros — é a
// lacuna que os recibos declaram. Aqui o jogo roda em tempo real e a sequência
// sai pela mesma API de QA do capturador de stills (`__vmPrecisionQa`), sem
// tocar mixer nem pausar clipe.
//
// Uma sessão por proporção, não uma por arma: o boot do jogo custa ~30 s e
// gravá-lo 26 vezes dobrava o tempo de execução sem acrescentar evidência. A
// gravação inteira fica como mestre e o ffmpeg corta um arquivo por arma pelas
// marcas de tempo, sem reencodar.
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name, fallback = '') => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const PORT = option('porta', '4401');
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(process.env.CSBRASIL_VM_VIDEO_DIR
  || option('out', '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/arsenal-video'));

// Fonte derivável: as 26 de WEAPON_IDS. A faca tem controlador melee próprio e
// a AK é a golden pública — nenhuma das duas carrega marcador Mint.
const { WEAPON_IDS } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);
const { VM_FAMILY, VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const weapons = option('armas') ? option('armas').split(',').filter(Boolean) : [...WEAPON_IDS];
const unknown = weapons.filter((weapon) => weapon !== 'knife' && !VM_WEAPON[weapon]);
if (unknown.length) throw new Error(`armas fora do vmconfig: ${unknown}`);
const ASPECTS = { '3x2': [1440, 960], '16x9': [1440, 810] };
const aspects = option('aspecto') ? option('aspecto').split(',').filter(Boolean) : Object.keys(ASPECTS);
// Só as famílias que têm arma no catálogo: abrir `grenade` pede um GLB que não
// existe nesta lane e derruba um erro de viewmodel na sessão inteira.
const families = [...new Set(Object.values(VM_WEAPON).map((entry) => entry.family))];
const query = new URLSearchParams({
  debug: '1', auto: 'P,mst', map: 'piscina_treta', armaslazy: '0',
  vmauthored: '1', vmqa: 'precision',
  vmready: families.join(','),
  vmweapon: Object.keys(VM_WEAPON).join(','),
}).toString();

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const probeOf = (file) => {
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_read_packets', '-show_entries', 'format=duration',
    '-count_packets', '-of', 'json', file]).toString());
  return {
    seconds: +Number(probe.format.duration).toFixed(2),
    frames: Number(probe.streams[0].nb_read_packets),
    resolution: `${probe.streams[0].width}x${probe.streams[0].height}`,
  };
};
// Duração de recarga por família, do próprio vmconfig, com folga: sem isso a
// gravação corta a recarga longa (lmg/g3/svd fecham em 4,667 s).
const reloadWindow = (weapon) => Math.max(2.2, VM_FAMILY[VM_WEAPON[weapon]?.family]?.cs16?.reload || 3.2) + 1.2;

const localPlaywright = path.join(ROOT, 'node_modules/playwright/index.js');
const playwrightEntry = fs.existsSync(localPlaywright) ? localPlaywright
  : `${execSync('npm root -g').toString().trim()}/playwright/index.js`;
const playwright = await import(pathToFileURL(playwrightEntry).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });

fs.mkdirSync(OUT, { recursive: true });
const staging = fs.mkdtempSync(path.join(OUT, '.raw-'));
const masters = [];
const records = [];
const failures = [];

for (const aspect of aspects) {
  const [width, height] = ASPECTS[aspect];
  if (!width) throw new Error(`proporção desconhecida: ${aspect}`);
  const errors = [];
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: staging, size: { width, height } },
  });
  const page = await context.newPage();
  page.on('pageerror', (event) => errors.push({ kind: 'pageerror', message: event.message }));
  page.on('console', (event) => {
    if (event.type() === 'error' && !/favicon/i.test(event.text())) errors.push({ kind: 'console', message: event.text().slice(0, 500) });
  });
  const openedAt = Date.now();
  const at = () => +((Date.now() - openedAt) / 1000).toFixed(2);
  const cuts = [];
  await page.goto(`${BASE}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#vm-debug-badge,.tutorial-overlay,[data-vmqa]{display:none!important}' });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa, null, { timeout: 180000 });
  // A sessão inteira leva ~4,5 min e o round fecha em ROUND_TIME: sem segurar o
  // relógio, as últimas armas gravam o placar de fim de rodada em vez da arma.
  // Bots renascem, então o silenciamento também se repete a cada arma.
  const holdRound = () => page.evaluate(() => {
    const game = window.__game;
    for (const bot of game?.bots || []) { bot.nextShotAt = Infinity; bot.target = null; }
    game.player.hp = 100; game.player.alive = true;
    game.timeLeft = 600;
  });
  await holdRound();

  for (const weapon of weapons) {
    const timeline = [];
    const mark = (phase) => timeline.push({ phase, at: at() });
    const start = at();
    let state = null;
    try {
      await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 60000 });
      await holdRound();
      if (!await page.evaluate((w) => window.__vmPrecisionQa.equip(w), weapon)) throw new Error(`${weapon} não equipou`);
      // Pronto = o controlador que a arma realmente usa: Mint nas assadas,
      // melee na faca, autorado na golden pública.
      const ready = weapon === 'knife'
        ? () => page.waitForFunction(() => window.__vmPrecisionQa.state().melee, null, { timeout: 30000 })
        : VM_WEAPON[weapon].golden
          ? () => page.waitForFunction(() => window.__vmPrecisionQa.state().authored, null, { timeout: 30000 })
          : () => page.waitForFunction((w) => window.__authoredVm?.entry?.(w)?.mint?.active, weapon, { timeout: 30000 });
      await ready();
      mark('saque');
      await page.waitForTimeout(1500);
      if (weapon === 'knife') {
        for (const kind of ['quick', 'quick', 'heavy']) {
          mark(`faca-${kind}`);
          await page.evaluate((k) => window.__vmPrecisionQa.knife(k), kind);
          await page.waitForTimeout(800);
        }
      } else {
        mark('tiro');
        for (let shot = 0; shot < 3; shot += 1) {
          await page.evaluate(() => window.__vmPrecisionQa.shoot());
          await page.waitForTimeout(420);
        }
        await page.waitForTimeout(700);
        mark('recarga');
        await page.evaluate(() => window.__vmPrecisionQa.reload());
        await page.waitForTimeout(reloadWindow(weapon) * 1000);
        mark('ads-entra');
        await page.evaluate(() => window.__vmPrecisionQa.ads());
        await page.waitForTimeout(1100);
        mark('ads-sai');
        await page.evaluate(() => window.__vmPrecisionQa.ads());
        await page.waitForTimeout(900);
      }
      state = await page.evaluate(() => ({ ...window.__vmPrecisionQa.state(), round: window.__game.state }));
    } catch (error) {
      failures.push({ weapon, aspect, message: String(error.message || error) });
    }
    const end = at();
    cuts.push({ weapon, aspect, start, end, timeline, state });
    if (weapon === 'knife') {
      if (state && !state.melee) failures.push({ weapon, aspect, message: 'faca sem controlador melee' });
    } else if (state && !state.authored) {
      failures.push({ weapon, aspect, message: 'caiu no fallback legado' });
    }
    // Placar de fim de rodada em cima da arma invalida o clipe como evidência.
    if (state && state.round !== 'live') failures.push({ weapon, aspect, message: `rodada saiu de live: ${state.round}` });
    console.log(`SEQ ${weapon} ${aspect} ${start}s→${end}s authored=${state?.authored} melee=${state?.melee}`);
  }

  const video = page.video();
  await page.close();
  await context.close();
  const master = path.join(OUT, `arsenal-${aspect}.webm`);
  await video.saveAs(master);
  await video.delete().catch(() => {});
  const fatalErrors = errors.filter((item) => item.kind === 'pageerror'
    || /\[paid-viewmodel\]|THREE\.WebGLProgram|WebGL creation failed/i.test(item.message));
  if (fatalErrors.length) failures.push({ aspect, message: `${fatalErrors.length} erro fatal`, fatalErrors });
  masters.push({ aspect, file: path.basename(master), bytes: fs.statSync(master).size,
    sha256: sha256(master), ...probeOf(master), errors: errors.length, fatalErrors: fatalErrors.length });

  // Corte por arma sem reencodar: o `-ss` do webm encosta no keyframe anterior,
  // então o clipe pode começar uma fração antes — a linha do tempo do mestre
  // continua sendo a referência exata.
  for (const cut of cuts) {
    const file = path.join(OUT, `${cut.weapon}-${aspect}.webm`);
    fs.rmSync(file, { force: true });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(cut.start), '-to', String(cut.end),
      '-i', master, '-c', 'copy', file]);
    records.push({ weapon: cut.weapon, aspect, file: path.basename(file),
      master: path.basename(master), masterStart: cut.start, masterEnd: cut.end,
      bytes: fs.statSync(file).size, sha256: sha256(file), ...probeOf(file),
      authored: cut.state?.authored ?? null, melee: cut.state?.melee ?? null,
      fallback: cut.state?.fallback ?? null, timeline: cut.timeline });
    console.log(`VIDEO ${cut.weapon} ${aspect} ${probeOf(file).seconds}s`);
  }
}
await browser.close();
fs.rmSync(staging, { recursive: true, force: true });
const report = {
  schemaVersion: 1, kind: 'real-browser-arsenal-video',
  revision: execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(),
  base: BASE, weapons: weapons.length, aspects, masters, records, failures,
};
fs.writeFileSync(path.join(OUT, 'video.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: failures.length === 0, videos: records.length, masters: masters.length, failures: failures.length, output: OUT }));
if (failures.length) process.exitCode = 1;
