#!/usr/bin/env node
/* ============================================================================
   authored-ads-check.mjs — BOTÃO DIREITO DÁ SIGHT PICTURE, EM 16:9 E EM 3:2
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-75): o setAim() do pack era no-op — botão direito dava
   zoom de FOV e a arma nem se mexia. O ADS novo leva a ALÇA MEDIDA da arma
   Mint ao eixo da câmera; esta régua projeta a alça pela vmCamera no jogo real
   (?vmads=1 força o scoped do jogador) e cobra:
   AD1 alça a ≤3,5% do centro da tela (NDC), assentado o blend;
   AD2 a arma continua na tela (bbox ≥ 2% do quadro) — alinhar sem sumir.
   Roda nos DOIS aspectos que já morderam este repo: 16:9 e 3:2.
   Mutante: --mutante=sem-ads (remove ?vmads=1) tem que REPROVAR AD1 — prova
   que a medida discrimina quadril de mira.
   Uso: node tools/eval/authored-ads-check.mjs [--armas=ak] [--porta=8156]
   Requer private-assets — régua LOCAL (check:vm), fora do check:fast.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && MUT !== 'sem-ads') throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8156';
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || 'ak').split(',').filter(Boolean);
const VIEWPORTS = [
  { name: '16:9', width: 1280, height: 720 },
  { name: '3:2', width: 1290, height: 860 },
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const falhas = [];
const resultados = [];
function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) falhas.push(label);
}

try {
  for (const id of ARMAS) {
    const familia = VM_WEAPON[id]?.family;
    if (!familia) throw new Error(`arma sem família paga: ${id}`);
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const ads = MUT === 'sem-ads' ? '' : '&vmads=1';
      await page.goto(
        `${BASE}/?debug=1&auto=E&vmweapon=${id}&map=brasilia&armaslazy=0&vmready=${familia}${ads}`,
        { waitUntil: 'load', timeout: 180000 },
      );
      await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
      await page.waitForFunction(
        (weapon) => window.__authoredVm?.entry?.(weapon)?.mint?.active,
        id, { timeout: 120000 },
      );
      await page.waitForTimeout(1200);   // blend do ADS + draw assentados

      const medida = await page.evaluate((weapon) => {
        const g = window.__game;
        const vm = window.__authoredVm;
        const entry = vm.entry(weapon);
        const wrap = entry.mint.active;
        const metrics = wrap.userData.metrics;
        wrap.updateWorldMatrix(true, false);
        const sight = metrics.sight.clone().divideScalar(metrics.norm || 1);
        wrap.localToWorld(sight);
        const ndc = sight.clone().project(g.vmCamera);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const v = wrap.position.clone();
        wrap.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const bb = o.geometry.boundingBox;
          for (const cx of [bb.min.x, bb.max.x]) {
            for (const cy of [bb.min.y, bb.max.y]) {
              for (const cz of [bb.min.z, bb.max.z]) {
                v.set(cx, cy, cz).applyMatrix4(o.matrixWorld).project(g.vmCamera);
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
              }
            }
          }
        });
        const clip = (value) => Math.min(1, Math.max(-1, value));
        const areaFrac = ((clip(maxX) - clip(minX)) / 2) * ((clip(maxY) - clip(minY)) / 2);
        return { ndcX: ndc.x, ndcY: ndc.y, areaFrac, adsF: g.vm.adsF ?? 0 };
      }, id);

      const offCenter = Math.hypot(medida.ndcX, medida.ndcY);
      const label = `${id}@${viewport.name}`;
      if (MUT === 'sem-ads') {
        check(offCenter > 0.035, `AD1 ${label}: SEM ads a alça fica fora do centro (mutante)`,
          `desvio ${offCenter.toFixed(3)}`);
      } else {
        check(offCenter <= 0.035, `AD1 ${label}: alça no eixo da câmera`,
          `desvio ${offCenter.toFixed(3)} (adsF ${medida.adsF.toFixed(2)})`);
      }
      check(medida.areaFrac >= 0.02, `AD2 ${label}: arma na tela`, `área ${(medida.areaFrac * 100).toFixed(1)}%`);
      resultados.push({ id, viewport: viewport.name, ...medida, offCenter: Number(offCenter.toFixed(4)) });
      await page.close();
    }
  }
} finally {
  await browser.close();
  srv.kill();
}

console.log(JSON.stringify({ mutante: MUT || null, resultados, falhas }, null, 2));
process.exit(falhas.length ? 1 : 0);
