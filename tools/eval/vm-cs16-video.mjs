#!/usr/bin/env node
/* ============================================================================
   vm-cs16-video.mjs — VÍDEO DE 10s DA MÁQUINA DE 6 ESTADOS (idle→tiro→recarga→saque)
   ----------------------------------------------------------------------------
   Grava o viewmodel autorado NO JOGO REAL (mesma página, mesmos caminhos de
   tiro/recarga do jogador) com o Playwright e apara para 10s com ffmpeg.
   É o material de aceite da redução cs16 do vmconfig: uma animação por vez,
   sem respiração/embalo, recuo só na câmera.
   Uso: node tools/eval/vm-cs16-video.mjs [--arma=ak] [--porta=8161] [--out=...]
   Requer private-assets + Playwright global + ffmpeg — ferramenta LOCAL.
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const ARMA = arg('arma') || 'ak';
const PORTA = arg('porta') || '8161';
const BASE = `http://127.0.0.1:${PORTA}`;
const OUT = arg('out') || path.join(ROOT, 'tools/eval/out', `vm-cs16-${ARMA}.mp4`);
const familia = VM_WEAPON[ARMA]?.family;
if (!familia) throw new Error(`arma sem família paga: ${ARMA}`);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

const videoDir = path.join(ROOT, 'tools/eval/out', 'vm-cs16-video-raw');
await fs.rm(videoDir, { recursive: true, force: true });
await fs.mkdir(videoDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
});
const t0 = Date.now();
const page = await context.newPage();
const espera = (ms) => page.waitForTimeout(ms);
const tecla = (code) => page.evaluate((c) => {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true }));
}, code);

let videoPath = '';
try {
  const extra = process.env.QS ? `&${process.env.QS}` : '';
  await page.goto(
    `${BASE}/?debug=1&auto=E&vmweapon=${ARMA}&map=brasilia&armaslazy=0&vmready=${familia}${extra}`,
    { waitUntil: 'load', timeout: 180000 },
  );
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction(
    (weapon) => window.__authoredVm?.entry?.(weapon)?.mint?.active,
    ARMA, { timeout: 120000 },
  );
  await espera(800);
  const inicio = (Date.now() - t0) / 1000;

  // idle (3s) — pose parada: sem respiração nem embalo por contrato cs16.
  await espera(3000);

  // tiro (3×, cadência ~0,3s): caminho REAL do jogo — munição cai, o estado
  // cicla shoot1→2→3 e o recuo aparece SÓ na câmera (GUNFEEL), não no mount.
  const estados = [];
  for (let i = 0; i < 3; i++) {
    // O relógio do jogo atrasa sob swiftshader e o cooldown pode rejeitar o
    // tiro — insiste até a munição cair de verdade (régua do crítico).
    let estado = '?';
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const r = await page.evaluate(() => {
        const g = window.__game;
        const antes = g.player.ammo?.[g.player.weapon]?.mag ?? null;
        g.player.scoped = false;
        g.mouseDown0 = true;
        g._tryShoot();
        g.mouseDown0 = false;
        return { antes, depois: g.player.ammo?.[g.player.weapon]?.mag ?? null, estado: window.__authoredVm?.state?.() || '?' };
      });
      estado = r.estado;
      if (r.antes === null || r.depois < r.antes) break;
      await espera(120);
    }
    estados.push(estado);
    await espera(320);
  }
  console.log(`estados de tiro: ${estados.join(' → ')}`);
  await espera(700);

  // recarga: tecla R (caminho do jogador). Duração vem do QC (2,43s) via cs16.
  await tecla('KeyR');
  await espera(2700);

  // saque: o estado draw do QC (equip_rifle a 1,03s).
  await page.evaluate((weapon) => window.__authoredVm.draw(weapon), ARMA);
  await espera(1300);

  // idle final até fechar a janela de ação.
  await espera(2000);

  await page.close();
  videoPath = await page.video().path();
  await context.close();
  await browser.close();
  srv.kill();

  // O relógio do vídeo atrasa em relação ao wall-clock (frames caem no
  // swiftshader) — aparar pelo FIM garante os 10s exatos terminando no idle.
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const bruto = parseFloat(execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
  ).toString());
  const corte = Math.max(0, bruto - 10);
  console.log(`bruto ${bruto.toFixed(1)}s (carregamento ~${inicio.toFixed(1)}s wall) — corte em ${corte.toFixed(2)}s`);
  execSync(
    `ffmpeg -nostdin -y -loglevel error -ss ${corte.toFixed(2)} -i "${videoPath}" -t 10 ` +
    `-c:v libx264 -pix_fmt yuv420p -crf 20 -r 30 "${OUT}"`,
  );
  console.log(`vídeo: ${path.relative(ROOT, OUT)}`);
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  srv.kill();
}
