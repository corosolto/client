#!/usr/bin/env node
/* Driver de cenários LMG no jogo real (playwright + serve.mjs da casa).
 *
 * Captura com medidas EM-PÁGINA por frame: mãos em quadro (amostra de
 * vértices skinados da luva projetados), contato luva↔arma em px, bbox da
 * arma. Cenários: idle, PRIMEIRA coleta (sessão limpa), SEGUNDA coleta
 * (troca knife→lmg), ADS (setAim), fire e recargas em scrub pausado.
 * Uso: node lmg-frames-game.mjs --porta=8166 --aspecto=32 --tag=vermelho
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '8166';
const ASPECTO = arg('aspecto') || '32';
const TAG = arg('tag') || 'run';
const OUT = path.join(ROOT, 'artifacts/viewmodels/prep/lmg/game-frames', `${TAG}-${ASPECTO}`);
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMA = 'lmg';

const VIEWPORT = ASPECTO === '32' ? { width: 1440, height: 960 } : { width: 1440, height: 810 };
const EQUIP_TEMPOS = [0.06, 0.15, 0.3, 0.55, 1.02];
const RELOAD_FRACOES = [0, 0.18, 0.36, 0.5, 0.62, 0.8, 0.93, 0.99];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// o servidor vem de fora (bash), para o log não morrer engolido
let srv = null;
try { if (!(await fetch(BASE)).ok) throw 0; } catch {
  srv = spawn('node', [path.join(ROOT, 'tools/eval/serve.mjs'), PORTA], { cwd: ROOT });
  process.on('exit', () => srv?.kill());
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
}
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const report = { tag: TAG, aspecto: ASPECTO, viewport: VIEWPORT, frames: [] };

async function medir(page, cenario, detalhe) {
  const m = await page.evaluate((arma) => {
    const g = window.__game;
    const vm = window.__authoredVm;
    const e = vm.entry(arma);
    const cam = g.vmCamera;
    cam.updateMatrixWorld(true);
    const W = innerWidth, H = innerHeight;
    const px = (v) => {
      const p = v.clone().project(cam);
      return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, fora: p.z > 1 || p.x < -1.05 || p.x > 1.05 || p.y < -1.05 || p.y > 1.05 };
    };
    const V3 = e.mount.position.constructor;
    const ladoDoVertice = (mesh, index) => {
      if (!mesh.isSkinnedMesh || !mesh.skeleton || !mesh.geometry.attributes.skinIndex) return '';
      const indices = mesh.geometry.attributes.skinIndex;
      const pesos = mesh.geometry.attributes.skinWeight;
      let esquerda = 0, direita = 0;
      for (let slot = 0; slot < 4; slot += 1) {
        const indexBone = [indices.getX(index), indices.getY(index), indices.getZ(index), indices.getW(index)][slot];
        const peso = pesos ? [pesos.getX(index), pesos.getY(index), pesos.getZ(index), pesos.getW(index)][slot] : 0;
        const bone = mesh.skeleton.bones[indexBone]?.name || '';
        if (/_l$/i.test(bone)) esquerda += peso;
        if (/_r$/i.test(bone)) direita += peso;
      }
      return esquerda > direita ? 'apoio' : direita > esquerda ? 'forte' : '';
    };
    const amostra = (meshes, maxPts, lado = '') => {
      const pts = [];
      const total = meshes.reduce((sum, c) => sum + c.geometry.attributes.position.count, 0) || 1;
      for (const c of meshes) {
        const pos = c.geometry.attributes.position;
        const step = Math.max(1, Math.floor(total / maxPts));
        const v = new V3();
        for (let i = 0; i < pos.count; i += step) {
          if (lado && ladoDoVertice(c, i) !== lado) continue;
          v.fromBufferAttribute(pos, i);
          if (c.isSkinnedMesh && c.applyBoneTransform) c.applyBoneTransform(i, v);
          pts.push(v.clone().applyMatrix4(c.matrixWorld));
        }
      }
      return pts;
    };
    const cena = e.scene;
    cena.updateWorldMatrix(true, true);
    const eMao = (name) => /GEO_FP_SK_|fp-character|(^|[_.\-])(glove|hand|forearm|sleeve|cloth)/i.test(name || '');
    const visivel = (obj) => { let p = obj; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
    const luvas = [], armas = [];
    cena.traverse((c) => {
      if (!c.isMesh || !c.geometry?.attributes?.position || !visivel(c)) return;
      let p = c.parent, mao = eMao(c.name);
      while (!mao && p) { if (/fp-character/i.test(p.name || '')) mao = true; p = p.parent; }
      (mao ? luvas : armas).push(c);
    });
    const apoioPts = amostra(luvas, 300, 'apoio');
    const fortePts = amostra(luvas, 300, 'forte');
    const armaPts = amostra(armas, 300);
    const projetarMao = (pts) => {
      let dentro = 0; const pxs = [];
      for (const p of pts) {
        const s = px(p);
        if (!s.fora) { dentro += 1; pxs.push(s); }
      }
      return { dentro, pxs };
    };
    const apoio = projetarMao(apoioPts);
    const forte = projetarMao(fortePts);
    const luvaPx = [...apoio.pxs, ...forte.pxs];
    let handIn = apoio.dentro + forte.dentro;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, wIn = 0;
    const armaPx = [];
    for (const p of armaPts) {
      const s = px(p);
      if (!s.fora) {
        wIn += 1;
        armaPx.push(s);
        minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
        minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
      }
    }
    let contatoPx = null;
    if (luvaPx.length && armaPx.length) {
      contatoPx = 1e9;
      for (const a of luvaPx) {
        for (const b of armaPx) {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < contatoPx) contatoPx = d;
        }
      }
      contatoPx = Math.round(contatoPx);
    }
    const diag = (maxX > minX) ? Math.round(Math.hypot(maxX - minX, maxY - minY)) : 0;
    const contato = (mao) => {
      if (!mao.length || !armaPx.length) return null;
      let best = Infinity;
      for (const a of mao) for (const b of armaPx) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
      return Math.round(best);
    };
    return {
      handIn, handTotal: apoioPts.length + fortePts.length, weaponIn: wIn, weaponTotal: armaPts.length,
      apoioEmQuadro: apoio.dentro, apoioAmostra: apoioPts.length, apoioContato_px: contato(apoio.pxs),
      forteEmQuadro: forte.dentro, forteAmostra: fortePts.length, forteContato_px: contato(forte.pxs),
      contato_px: contatoPx, arma_diag_px: diag,
      arma_bbox: maxX > minX ? [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)] : null,
    };
  }, ARMA);
  m.cenario = cenario;
  m.detalhe = detalhe;
  report.frames.push(m);
  return m;
}

async function capturar(page, cenario, detalhe) {
  const m = await medir(page, cenario, detalhe);
  const nome = `${cenario}${detalhe ? '-' + detalhe : ''}`.replace(/[^a-z0-9-]/gi, '_');
  await page.screenshot({ path: path.join(OUT, `${nome}.png`) });
  console.log(`${cenario}/${detalhe}: hand ${m.handIn}/${m.handTotal} contato ${m.contato_px}px diag ${m.arma_diag_px}px`);
}

try {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${BASE}/?debug=1&auto=E&vmweapon=${ARMA}&map=brasilia&armaslazy=0&vmready=${ARMA}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction((w) => window.__authoredVm?.entry?.(w)?.mint?.active, ARMA, { timeout: 120000 });
  // PRIMEIRA COLETA em sessão limpa: captura DURANTE o primeiro equip
  const t0 = Date.now();
  for (const t of EQUIP_TEMPOS) {
    const espera = t * 1000 - (Date.now() - t0);
    if (espera > 0) await page.waitForTimeout(espera);
    await capturar(page, 'equip1', `t${String(t).replace('.', '')}`);
  }
  await page.waitForTimeout(1200);
  await capturar(page, 'idle', '');
  // ADS
  await page.evaluate((w) => { window.__authoredVm.setAim(w, 1); }, ARMA);
  await page.waitForTimeout(400);
  await capturar(page, 'ads', '');
  await page.evaluate((w) => { window.__authoredVm.setAim(w, 0); }, ARMA);
  await page.waitForTimeout(300);
  // fire
  await page.evaluate((w) => { window.__authoredVm.shoot(w); }, ARMA);
  await capturar(page, 'fire', 'pico');
  await page.waitForTimeout(600);
  // SEGUNDA COLETA: troca pra faca e volta
  await page.evaluate(() => { window.__game._switchWeapon('knife'); });
  await page.waitForTimeout(700);
  const t1 = Date.now();
  await page.evaluate((w) => { window.__game._switchWeapon(w); }, ARMA);
  for (const t of EQUIP_TEMPOS) {
    const espera = t * 1000 - (Date.now() - t1);
    if (espera > 0) await page.waitForTimeout(espera);
    await capturar(page, 'equip2', `t${String(t).replace('.', '')}`);
  }
  await page.waitForTimeout(800);
  // recargas em scrub pausado (determinístico, imune ao fps)
  for (const clipe of ['reload_tactical', 'reload_empty']) {
    const dur = await page.evaluate(({ arma, clipe }) => {
      const vmg = window.__game.vm;
      for (const k of ['awp', 'pistol', 'knife']) vmg[k] && (vmg[k].visible = false);
      if (vmg.models) for (const m of Object.values(vmg.models)) m && (m.visible = false);
      if (vmg.arms?.group) vmg.arms.group.visible = false;
      const e = window.__authoredVm.entry(arma);
      e.queue = [];
      e.mixer.stopAllAction();
      const c = e.clips.get(clipe);
      const a = e.mixer.clipAction(c);
      a.reset();
      a.play();
      a.paused = true;
      e.action = a;
      return c.duration;
    }, { arma: ARMA, clipe });
    for (const f of RELOAD_FRACOES) {
      await page.evaluate(({ arma, t }) => {
        const e = window.__authoredVm.entry(arma);
        e.action.time = Math.min(t, e.action.getClip().duration - 1e-4);
        // `action.time` só vira pose após o mixer avaliar; sem isto o primeiro
        // scrub mede a pose anterior enquanto a captura já mostra o novo frame.
        e.mixer.update(0);
        e.scene.updateWorldMatrix(true, true);
      }, { arma: ARMA, t: dur * f });
      await page.waitForTimeout(220);
      await capturar(page, clipe, `f${String(Math.round(f * 100)).padStart(3, '0')}`);
    }
  }
  await browser.close();
} finally {
  await browser.close().catch(() => {});
}
await fs.writeFile(path.join(OUT, 'frames.json'), JSON.stringify(report, null, 1));
console.log(`LMG_GAME_FRAMES=${OUT}`);
