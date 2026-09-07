#!/usr/bin/env node
// Captura de validação visual no JOGO REAL da branch (dmr-capture).
// Frames determinísticos com action.time pausado (padrão vm-cs16-frames.mjs),
// em 3:2 e 16:9, de idle, tiro, recarga e ADS. Uso:
//   node tools/viewmodels/prep/dmr-capture.mjs [porta] [--sem-override]
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORTA = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : '8163';
const SEM_OVERRIDE = process.argv.includes('--sem-override');
const BASE = `http://127.0.0.1:${PORTA}`;
const ARSENAL = {
  rem700: { familia: 'bolt', recarga: ['reload_loop', 'reload_end'], tiros: [0.3, 0.6] },
  g3sg1: { familia: 'g3', recarga: ['reload_tactical'], tiros: [] },
};

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });

for (const [arma, cfg] of Object.entries(ARSENAL)) {
  const out = path.join(ROOT, 'artifacts/viewmodels/dmr', arma, 'runtime');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [tag, vw, vh] of [['3x2', 1440, 960], ['16x9', 1440, 810]]) {
    const page = await browser.newPage({ viewport: { width: vw, height: vh } });
    const qs = `debug=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0`
      + (SEM_OVERRIDE ? '' : `&vmready=${cfg.familia}`);
    await page.goto(`${BASE}/?${qs}`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction((w) => window.__authoredVm?.entry?.(w)?.mint?.active, arma, { timeout: 120000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, `${arma}-idle-${tag}.png`) });

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
      await page.screenshot({ path: path.join(out, `${arma}-shoot-t${t.toFixed(2)}-${tag}.png`) });
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
        await page.screenshot({ path: path.join(out, `${arma}-${nome}-t${(fr * 100) | 0}-${tag}.png`) });
      }
    }

    // ADS: alça no eixo óptico via setAim
    await page.evaluate((w) => { window.__authoredVm.setAim(w, 1); }, arma);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${arma}-ads-${tag}.png`) });
    await page.close();
    console.log('DMR_CAPTURE', arma, tag, 'ok');
  }
}
await browser.close();
console.log('DMR_CAPTURE_OK');
