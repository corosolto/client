#!/usr/bin/env node
/* ============================================================================
   viewmodel-visual-matrix.mjs — CONTACT SHEET idle/tiro/recarga/ADS POR ARMA
   ----------------------------------------------------------------------------
   Ferramenta do A/B das ondas do BUG-75 (M10): captura os 4 estados do
   viewmodel autorado NO JOGO REAL e compõe uma folha 2×2 por arma em
   tools/eval/out/viewmodel-matrix/<arma>.png. É o material que o dono compara
   com o golden gen-2 (ak-hires-viewer.html) antes de flipar ready:true.
   Uso: node tools/eval/viewmodel-visual-matrix.mjs [--armas=ak,akm] [--porta=8158]
   Requer private-assets + Playwright — ferramenta LOCAL, fora do check:fast.
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '8158';
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || 'ak').split(',').filter(Boolean);
const OUT = path.join(ROOT, 'tools/eval/out/viewmodel-matrix');
const CELL = { width: 960, height: 540 };

const gRoot = execSync('npm root -g').toString().trim();
const { pathToFileURL } = await import('node:url');
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const sheets = [];

try {
  for (const id of ARMAS) {
    const familia = VM_WEAPON[id]?.family;
    if (!familia) throw new Error(`arma sem família paga: ${id}`);
    const page = await browser.newPage({ viewport: CELL });
    await page.goto(
      `${BASE}/?debug=1&auto=E&vmweapon=${id}&map=brasilia&armaslazy=0&vmready=${familia}`,
      { waitUntil: 'load', timeout: 180000 },
    );
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction(
      (weapon) => window.__authoredVm?.entry?.(weapon)?.mint?.active,
      id, { timeout: 120000 },
    );
    await page.waitForTimeout(1000);

    const cells = [];
    const snap = async (label) => {
      const png = await page.screenshot({ type: 'png' });
      cells.push({ label, png });
    };

    await snap('idle');
    /* ANDANDO — a classe de estado que o print do dono (29/08) provou que a
       matriz não cobria: registro mão↔arma tem que sobreviver ao movimento. */
    const andou = await page.evaluate(() => {
      const g = window.__game;
      const antes = { x: g.player.pos.x, z: g.player.pos.z };
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      return antes;
    });
    await page.waitForTimeout(700);
    await snap('andando');
    const movimento = await page.evaluate((antes) => {
      const g = window.__game;
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
      return Math.hypot(g.player.pos.x - antes.x, g.player.pos.z - antes.z);
    }, andou);
    if (movimento < 0.5) console.warn(`aviso: célula andando de ${id} sem movimento real (${movimento.toFixed(2)} m)`);
    await page.waitForTimeout(400);
    // Tiro REAL pelo caminho do jogo (a munição TEM que cair — régua do crítico);
    // vm.shoot() sozinho só anima e a célula saía idêntica ao idle.
    const magazine = await page.evaluate(() => {
      const g = window.__game;
      const before = g.player.ammo?.[g.player.weapon]?.mag ?? null;
      g.player.scoped = false;
      g.mouseDown0 = true;
      g._tryShoot();
      g.mouseDown0 = false;
      return { before, after: g.player.ammo?.[g.player.weapon]?.mag ?? null };
    });
    if (magazine.before !== null && magazine.after === magazine.before) {
      console.warn(`aviso: célula tiro de ${id} sem disparo real (municão ${magazine.before}→${magazine.after})`);
    }
    await page.waitForTimeout(55);
    await snap('tiro');
    await page.evaluate((weapon) => window.__authoredVm.reload(weapon, 2.4, false), id);
    await page.waitForTimeout(850);
    await snap('recarga (saque do pente)');
    await page.waitForTimeout(750);
    await snap('recarga (encaixe)');
    /* ADS: dirige o blend direto no controlador — o probe não tem mouse. */
    await page.evaluate((weapon) => { window.__game.player.scoped = true; }, id);
    await page.waitForTimeout(500);
    await snap('ads');

    const labelled = await Promise.all(cells.map(async (cell) => sharp(cell.png)
      .composite([{
        input: Buffer.from(
          `<svg width="${CELL.width}" height="60"><rect width="100%" height="60" fill="#000000aa"/>` +
          `<text x="20" y="42" font-family="monospace" font-size="32" fill="#fff">${id} · ${cell.label}</text></svg>`,
        ),
        top: 0,
        left: 0,
      }])
      .png()
      .toBuffer()));
    const columns = cells.length > 4 ? 3 : 2;
    const rows = Math.ceil(cells.length / columns);
    const sheet = await sharp({
      create: { width: CELL.width * columns, height: CELL.height * rows, channels: 3, background: '#101418' },
    }).composite(labelled.map((input, index) => ({
      input,
      left: (index % columns) * CELL.width,
      top: Math.floor(index / columns) * CELL.height,
    }))).png().toBuffer();
    const target = path.join(OUT, `${id}.png`);
    await fs.writeFile(target, sheet);
    sheets.push(target);
    console.log(`matriz: ${path.relative(ROOT, target)}`);
    await page.close();
  }
} finally {
  await browser.close();
  srv.kill();
}

console.log(JSON.stringify({ armas: ARMAS, sheets: sheets.map((s) => path.relative(ROOT, s)) }, null, 2));
