#!/usr/bin/env node
/* ============================================================================
   vm-cs16-frames.mjs — MEDIÇÃO OBJETIVA + FRAMES DETERMINÍSTICOS DO VM cs16
   ----------------------------------------------------------------------------
   Ferramenta do gauntlet da escala/recarga (dono, 29/08): no jogo real,
   (1) mede a ESCALA APARENTE da arma Mint contra o gabarito CS 1.6 na MESMA
       vmCamera (comprimento projetado em px; razão alvo 1,00) e as bordas do
       bloco do viewmodel contra a régua 2.6 do BAR-CONSISTENCIA;
   (2) captura a recarga frame a frame com action.time PAUSADO — cada frame é
       um tempo exato do clipe, imune ao fps do swiftshader.
   O gabarito entra SÓ como números (centro/eixo/comprimento medidos no bake,
   baked-preview/<arma>-cs16-template-report.json) — nenhum pixel da Valve.
   Uso: node tools/eval/vm-cs16-frames.mjs [--arma=ak] [--porta=8162]
        [--frames=16] [--out=tools/eval/out/vm-cs16-frames]
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRIVATE_ROOT = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const ARMA = arg('arma') || 'ak';
const PORTA = arg('porta') || '8162';
const BASE = `http://127.0.0.1:${PORTA}`;
const N_FRAMES = parseInt(arg('frames') || '16', 10);
const OUT = arg('out') || path.join(ROOT, 'tools/eval/out/vm-cs16-frames');
const familia = VM_WEAPON[ARMA]?.family;
if (!familia) throw new Error(`arma sem família paga: ${ARMA}`);

const relatorioPath = path.join(PRIVATE_ROOT, familia, 'baked-preview', `${ARMA}-cs16-template-report.json`);
const gabarito = JSON.parse(await fs.readFile(relatorioPath, 'utf8'));

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

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
  await page.waitForTimeout(1200);

  // ---- medição de escala/enquadramento no idle, na MESMA vmCamera do jogo
  const medida = await page.evaluate(({ arma, gab }) => {
    const g = window.__game;
    const vm = window.__authoredVm;
    const e = vm.entry(arma);
    const cam = g.vmCamera;
    cam.updateMatrixWorld(true);
    const W = innerWidth, H = innerHeight;
    const px = (v) => {
      const p = v.clone().project(cam);
      return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, atras: p.z > 1 };
    };
    const V3 = e.mount.position.constructor; // THREE.Vector3 sem import
    // bloco do viewmodel (arma+mãos): bbox projetado de todos os meshes visíveis
    e.scene.updateWorldMatrix(true, true);
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    const box = { min: new V3(1e9, 1e9, 1e9), max: new V3(-1e9, -1e9, -1e9) };
    e.scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      for (let i = 0; i < 8; i++) {
        const c = new V3(
          i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z,
        ).applyMatrix4(o.matrixWorld);
        const s = px(c);
        if (!s.atras) {
          minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
          minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
        }
      }
    });
    // comprimento projetado da ARMA Mint: extremos do bbox do wrap ao longo do
    // maior eixo, em px
    const mint = e.mint.active;
    let mLo = new V3(1e9, 1e9, 1e9), mHi = new V3(-1e9, -1e9, -1e9);
    mint.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      for (let i = 0; i < 8; i++) {
        const c = new V3(
          i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z,
        ).applyMatrix4(o.matrixWorld);
        mLo = new V3(Math.min(mLo.x, c.x), Math.min(mLo.y, c.y), Math.min(mLo.z, c.z));
        mHi = new V3(Math.max(mHi.x, c.x), Math.max(mHi.y, c.y), Math.max(mHi.z, c.z));
      }
    });
    const dim = new V3().subVectors(mHi, mLo);
    const eixo = Math.abs(dim.z) >= Math.abs(dim.y) && Math.abs(dim.z) >= Math.abs(dim.x)
      ? 'z' : (Math.abs(dim.y) >= Math.abs(dim.x) ? 'y' : 'x');
    const centro = new V3().addVectors(mLo, mHi).multiplyScalar(0.5);
    // ESCALA APARENTE = comprimento ÷ profundidade do centro, no espaço da
    // câmera (a coronha passa rente à near-plane e a projeção em px explode —
    // razão angular é estável e é o que o olho compara).
    const mintLen = dim[eixo === 'x' ? 'x' : eixo === 'y' ? 'y' : 'z'];
    const mintDepth = Math.abs(centro.z);
    const gc = new V3(...gab.gabarito_centro_cam);
    const gabLen = Math.max(...gab.gabarito_dim_m);
    const gabDepth = Math.abs(gc.z);
    const gcPx = px(gc);
    return {
      viewport: { W, H },
      vmFov: cam.fov, aspecto: cam.aspect,
      blocoBordaEsq: +(minX / W).toFixed(3),
      blocoBordaTopo: +(minY / H).toFixed(3),
      mint: { len: +mintLen.toFixed(3), depth: +mintDepth.toFixed(3) },
      gabarito: { len: +gabLen.toFixed(3), depth: +gabDepth.toFixed(3) },
      razaoEscala: +((mintLen / mintDepth) / (gabLen / gabDepth)).toFixed(3),
      gabaritoCentroPx: { x: +gcPx.x.toFixed(0), y: +gcPx.y.toFixed(0) },
      mintCentroPx: (() => { const c = px(centro); return { x: +c.x.toFixed(0), y: +c.y.toFixed(0) }; })(),
      mintCentroCam: [+centro.x.toFixed(4), +centro.y.toFixed(4), +centro.z.toFixed(4)],
      // Ângulo REAL do cano em espaço de câmera, pelos sockets MEDIDOS
      // (boca−alça) — o eixo por bbox mentia em arma curta (deagle/awp 29/08).
      // Convenção do mount: +rx = boca DESCE; +ry = boca à esquerda.
      bocaAlcaPx: (() => {
        const vmw = window.__authoredVm;
        const boca = vmw.muzzleWorld(arma, cam);
        const alca = vmw.sightWorld(arma, cam);
        if (!boca || !alca) return null;
        const pb = px(boca), pa = px(alca);
        return { boca: [Math.round(pb.x), Math.round(pb.y)], alca: [Math.round(pa.x), Math.round(pa.y)] };
      })(),
      canoPitchYaw: (() => {
        const vmw = window.__authoredVm;
        const boca = vmw.muzzleWorld(arma, cam);
        const alca = vmw.sightWorld(arma, cam);
        if (!boca || !alca) return null;
        const d = boca.clone().sub(alca).normalize();
        return [
          +(Math.atan2(d.y, -d.z) * 180 / Math.PI).toFixed(2),
          +(Math.atan2(-d.x, -d.z) * 180 / Math.PI).toFixed(2),
        ];
      })(),
      rotSugerido: (() => {
        const vmw = window.__authoredVm;
        const boca = vmw.muzzleWorld(arma, cam);
        const alca = vmw.sightWorld(arma, cam);
        if (!boca || !alca) return null;
        const d = boca.clone().sub(alca).normalize();
        const pitch = Math.atan2(d.y, -d.z) * 180 / Math.PI;
        const yaw = Math.atan2(-d.x, -d.z) * 180 / Math.PI;
        const alvo = gab.cano_gabarito_pitch_yaw_deg;
        const rot = window.__authoredVm.entry(arma).frame.rotDeg || [0, 0, 0];
        return [
          +(rot[0] - (alvo[0] - pitch)).toFixed(1),
          +(rot[1] + (alvo[1] - yaw)).toFixed(1),
          rot[2] || 0,
        ];
      })(),
      gabaritoCentroCam: gab.gabarito_centro_cam,
      // frame novo sugerido: leva o centro Mint ao RAIO do gabarito, na
      // profundidade em que o comprimento angular casa (razão 1,00)
      frameSugerido: (() => {
        const alvoDepth = mintLen / (gabLen / gabDepth);
        const k = alvoDepth / gabDepth;
        const alvo = new V3(gc.x * k, gc.y * k, -alvoDepth);
        const f = window.__authoredVm.entry(arma).frame;
        return {
          x: +(f.x + alvo.x - centro.x).toFixed(3),
          y: +(f.y + alvo.y - centro.y).toFixed(3),
          z: +(f.z + alvo.z - centro.z).toFixed(3),
        };
      })(),
      frame: (window.__authoredVm.entry(arma).frame),
    };
  }, { arma: ARMA, gab: gabarito });
  await fs.writeFile(path.join(OUT, 'medidas.json'), JSON.stringify(medida, null, 1));
  console.log('MEDIDAS=' + JSON.stringify(medida));

  await page.screenshot({ path: path.join(OUT, 'idle.png') });

  // ---- recarga determinística: action pausada, varredura de action.time
  const duracao = await page.evaluate((arma) => {
    const e = window.__authoredVm.entry(arma);
    const clip = e.clips.get('reload_tactical') || e.clips.get('reload_empty')
      || e.clips.get('reload_start') || e.clips.get('pump');
    e.queue = [];
    e.mixer.stopAllAction();
    const a = e.mixer.clipAction(clip);
    a.reset();
    a.play();
    a.paused = true;
    e.action = a;
    return clip.duration;
  }, ARMA);
  for (let i = 0; i < N_FRAMES; i++) {
    const t = N_FRAMES > 1 ? (duracao * i) / (N_FRAMES - 1) : 0;
    await page.evaluate(({ arma, t }) => {
      const e = window.__authoredVm.entry(arma);
      e.action.time = Math.min(t, e.action.getClip().duration - 1e-4);
    }, { arma: ARMA, t });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `reload-${String(i).padStart(2, '0')}-t${t.toFixed(2)}.png`) });
  }
  console.log(`frames: ${N_FRAMES} em ${OUT} (clipe ${duracao.toFixed(2)}s)`);
} finally {
  await browser.close().catch(() => {});
  srv.kill();
}
