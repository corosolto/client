#!/usr/bin/env node
// Captura de validação visual no JOGO REAL da branch (dmr-capture).
// Frames determinísticos com action.time pausado (padrão vm-cs16-frames.mjs),
// em 3:2 e 16:9, de idle, tiro, recarga e ADS. Uso:
//   node tools/viewmodels/prep/dmr-capture.mjs [porta] [--sem-override]
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORTA = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : '4401';
const BASE = `http://127.0.0.1:${PORTA}`;
const OUT = path.join(ROOT, 'artifacts/viewmodels/integration/dmr/latest');
const errors = [];
const records = [];
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ARSENAL = {
  rem700: { familia: 'bolt', recarga: ['reload_loop', 'reload_end'], tiros: [0.3, 0.6] },
  g3sg1: { familia: 'g3', recarga: ['reload_tactical'], tiros: [] },
};

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const [arma, cfg] of Object.entries(ARSENAL)) {
  const out = path.join(OUT, arma);
  fs.mkdirSync(out, { recursive: true });
  for (const [tag, vw, vh] of [['3x2', 1440, 960], ['16x9', 1440, 810]]) {
    const page = await browser.newPage({ viewport: { width: vw, height: vh } });
    page.on('pageerror', (error) => errors.push({ arma, viewport: tag, kind: 'pageerror', message: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error' && !/favicon/i.test(message.text())) {
        errors.push({ arma, viewport: tag, kind: 'console', message: message.text().slice(0, 500) });
      }
    });
    const qs = `debug=1&auto=P,mst&vmweapon=${arma}&map=piscina_treta&armaslazy=0&vmauthored=1&vmqa=precision`;
    await page.goto(`${BASE}/?${qs}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#vm-debug-badge{display:none!important}' });
    await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa,
      null, { timeout: 180000 });
    const equipped = await page.evaluate((w) => window.__vmPrecisionQa.equip(w), arma);
    if (!equipped) throw new Error(`${arma}/${tag}: não equipou pelo arnês real`);
    await page.waitForFunction((w) => window.__authoredVm?.entry?.(w)?.mint?.active, arma, { timeout: 120000 });
    await page.evaluate(() => {
      for (const bot of window.__game?.bots || []) { bot.nextShotAt = Number.POSITIVE_INFINITY; bot.target = null; }
      if (window.__game?.player) { window.__game.player.hp = 100; window.__game.player.alive = true; }
    });
    await page.waitForTimeout(900);
    const snap = async (state) => {
      const file = path.join(out, `${arma}-${state}-${tag}.png`);
      const runtime = await page.evaluate((w) => {
        const vm = window.__authoredVm;
        const entry = vm?.entry?.(w);
        return { weapon: vm?.weapon, key: entry?.key, visible: entry?.mount?.visible,
          mint: entry?.mint?.active?.name, clips: entry ? [...entry.clips.keys()] : [] };
      }, arma);
      await page.screenshot({ path: file });
      records.push({ arma, viewport: { width: vw, height: vh }, state, runtime,
        file: path.relative(OUT, file), bytes: fs.statSync(file).size, sha256: sha256(file) });
    };
    await snap('idle');

    // tiro: estado shoot com clipe pausado
    for (const t of cfg.tiros) {
      await page.evaluate(({ w, t: tt }) => {
        const vm = window.__authoredVm;
        const e = vm.entry(w);
        const clip = e.clips.get('shoot');
        const a = e.mixer.clipAction(clip);
        a.paused = true; a.play(); a.time = Math.min(tt, clip.duration - 1e-4);
        e.action = a; e.mixer.update(0);
      }, { w: arma, t });
      await snap(`shoot-t${t.toFixed(2)}`);
    }

    // recarga: frames pausados do clipe-chave
    for (const nome of cfg.recarga) {
      const dur = await page.evaluate(({ w, n }) => {
        const e = window.__authoredVm.entry(w);
        const clip = e.clips.get(n);
        const a = e.mixer.clipAction(clip);
        a.paused = true; a.play(); a.action = a;
        return clip.duration;
      }, { w: arma, n: nome });
      for (const fr of [0.45, 0.8]) {
        await page.evaluate(({ w, n, t }) => {
          const e = window.__authoredVm.entry(w);
          const clip = e.clips.get(n);
          const a = e.mixer.clipAction(clip);
          a.paused = true; a.time = Math.min(t * clip.duration, clip.duration - 1e-4);
          e.action = a; e.mixer.update(0);
        }, { w: arma, n: nome, t: fr });
        await snap(`${nome}-t${(fr * 100) | 0}`);
      }
    }

    // ADS: alça no eixo óptico via setAim
    await page.evaluate((w) => { window.__authoredVm.setAim(w, 1); }, arma);
    await page.waitForTimeout(400);
    await snap('ads');
    await page.close();
    console.log('DMR_CAPTURE', arma, tag, 'ok');
  }
}
await browser.close();
const fatalErrors = errors.filter((entry) => entry.kind === 'pageerror'
  || /\[paid-viewmodel\]|THREE\.WebGLProgram|WebGL creation failed/i.test(entry.message));
const manifest = { schemaVersion: 1, kind: 'real-browser-dmr-capture', revision:
  execSync('git rev-parse HEAD').toString().trim(), base: BASE, records, errors, fatalErrors };
fs.writeFileSync(path.join(OUT, 'capture.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: fatalErrors.length === 0, captures: records.length,
  errors: errors.length, fatalErrors: fatalErrors.length, output: OUT }));
if (fatalErrors.length) process.exitCode = 1;
