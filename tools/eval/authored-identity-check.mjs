#!/usr/bin/env node
/* ============================================================================
   authored-identity-check.mjs — A ARMA NA MÃO É A DO MINT, E O CANO É O DELA
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-75, 28/08/2026)
   A integração do pack pago trocou 25 das 26 armas pela malha genérica KINEMATION
   (FAMAS→M16, SKS→Mk14, .38→Python…) e o flash/tracer nascia no cano da arma
   LEGADA invisível. Esta régua morde no jogo real, família a família.

   O QUE MEDE (jogo real, ?vmready=<família> abre o portão só na sonda)
   ID1 nenhuma malha GEO_WEAPON_* (pack) visível com a família ativa.
   ID2 o wrap Mint da arma (mint_weapon_<id>) está visível na mão.
   ID3 muzzleWorld cai DENTRO do bbox mundial do wrap Mint (+5 cm de folga).
   ID4 o maior eixo do wrap em mundo bate com a medida real (metrics.box) ±20%.

   Mutantes (provam que a régua morde):
     --mutante=escala        infla o wrap ×3 → ID4 tem que reprovar.
     --mutante=pack-visivel  religa as malhas do pack → ID1 tem que reprovar.
   Uso: node tools/eval/authored-identity-check.mjs [--armas=ak,akm] [--mutante=…] [--porta=8154]
   Requer private-assets (symlink public/private-assets) — régua LOCAL, fora do check:fast.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && !['escala', 'pack-visivel'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8154';
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || 'ak').split(',').filter(Boolean);
for (const id of ARMAS) if (!VM_WEAPON[id]) throw new Error(`arma sem família paga: ${id}`);

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
    const familia = VM_WEAPON[id].family;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(
      `${BASE}/?debug=1&auto=E&vmweapon=${id}&map=brasilia&armaslazy=0&vmready=${familia}`,
      { waitUntil: 'load', timeout: 180000 },
    );
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction(
      (weapon) => window.__authoredVm?.entry?.(weapon)?.mint?.active,
      id, { timeout: 120000 },
    );
    /* Dá dois frames para _applyVmVisibility assentar depois do onReady. */
    await page.waitForTimeout(400);

    const medida = await page.evaluate(async ([weapon, mutante]) => {
      const vm = window.__authoredVm;
      const g = window.__game;
      const entry = vm.entry(weapon);
      const wrap = entry.mint.active;
      if (mutante === 'escala') { wrap.scale.multiplyScalar(3); wrap.updateWorldMatrix(true, true); }
      if (mutante === 'pack-visivel') for (const mesh of entry.weaponMeshes) mesh.visible = true;

      const efetivamenteVisivel = (object) => {
        for (let node = object; node; node = node.parent) if (!node.visible) return false;
        return true;
      };
      /* Mesma fonte de verdade do esconderijo: a lista weaponMeshes classificada
         no load (o prefixo GEO_WEAPON_ fica no nó pai, não no mesh). */
      const packVisiveis = entry.weaponMeshes
        .filter((mesh) => !/^UTILITY_/.test(mesh.name) && !mesh.userData?.mintWrap && efetivamenteVisivel(mesh))
        .map((mesh) => mesh.name || '(sem nome)');

      const mintVisivel = efetivamenteVisivel(wrap)
        && wrap.name === `mint_weapon_${weapon}`;

      wrap.updateWorldMatrix(true, true);
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const v = wrap.position.clone();
      wrap.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        for (const cx of [bb.min.x, bb.max.x]) {
          for (const cy of [bb.min.y, bb.max.y]) {
            for (const cz of [bb.min.z, bb.max.z]) {
              v.set(cx, cy, cz).applyMatrix4(o.matrixWorld);
              g.camera.localToWorld(v);
              for (let lane = 0; lane < 3; lane += 1) {
                const value = [v.x, v.y, v.z][lane];
                if (value < min[lane]) min[lane] = value;
                if (value > max[lane]) max[lane] = value;
              }
            }
          }
        }
      });
      const muzzle = vm.muzzleWorld(weapon, g.camera);
      const folga = 0.05;
      const muzzleDentro = Boolean(muzzle)
        && muzzle.x >= min[0] - folga && muzzle.x <= max[0] + folga
        && muzzle.y >= min[1] - folga && muzzle.y <= max[1] + folga
        && muzzle.z >= min[2] - folga && muzzle.z <= max[2] + folga;

      const worldDim = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
      const m = wrap.userData.metrics;
      const realDim = m ? Math.max(
        m.box.max.x - m.box.min.x, m.box.max.y - m.box.min.y, m.box.max.z - m.box.min.z,
      ) : 0;

      /* M4: o GLB viaja com placeholder 1×1; o shared/ religa por nome ANTES da
         primeira pintura — material de mão com imagem ≤4 px é regressão. */
      const maosPlaceholder = [];
      for (const mesh of entry.handMeshes) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (!/CoroSolto_FP_/.test(material?.name || '')) continue;
          const image = material.map?.image || material.map?.source?.data;
          const width = image?.width ?? 0;
          if (width <= 4) maosPlaceholder.push(`${material.name}:${width}px`);
        }
      }
      const familyBytes = performance.getEntriesByType('resource')
        .filter((r) => r.name.includes('-runtime.glb') && !r.name.includes('general'))
        .reduce((worst, r) => Math.max(worst, r.encodedBodySize || r.transferSize || 0), 0);

      /* Lição dos prints do dono (29/08): parado, a mão NÃO pode vagar — o
         aditivo genérico arrancava o braço da pose. Amostra 8× em 3,5 s e mede
         o MAIOR desvio da mão de apoio em relação à primeira amostra. */
      const hand = entry.scene.getObjectByName('hand_l');
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const handAt = () => {
        entry.scene.updateWorldMatrix(true, true);
        const p = v.clone();
        hand.getWorldPosition(p);
        return [p.x, p.y, p.z];
      };
      const base = handAt();
      let breathDelta = 0;
      for (let sample = 0; sample < 8; sample += 1) {
        await sleep(440);
        const now = handAt();
        breathDelta = Math.max(breathDelta, Math.hypot(
          now[0] - base[0], now[1] - base[1], now[2] - base[2],
        ));
      }

      /* M2/M7: recarga escondida no meio não encalha — volta ao idle sozinha. */
      const reloadIniciou = vm.reload(weapon, 1.0, false);
      await sleep(150);
      entry.mount.visible = false;
      /* Headless com swiftshader roda a ~6 fps e o dt clampa em 50 ms: espera
         por TEMPO SIMULADO (updates×50 ms ≥ 1,5 s), não por tempo de parede. */
      let updatesEscondido = 0;
      const updateOriginal = vm.update.bind(vm);
      vm.update = (dtFrame, ctxFrame) => { updatesEscondido += 1; return updateOriginal(dtFrame, ctxFrame); };
      for (let waited = 0; updatesEscondido < 30 && waited < 12000; waited += 200) await sleep(200);
      vm.update = updateOriginal;
      entry.mount.visible = true;
      await sleep(300);
      const strandInfo = {
        reloadIniciou,
        updatesEscondido,
        acao: entry.action?.getClip?.().name ?? null,
        pausada: entry.action?.paused ?? null,
        fila: entry.queue.length,
        estado: g.state,
        vivo: g.player?.alive ?? null,
        armaAtual: g.player?.weapon ?? null,
      };
      const strandRecovered = strandInfo.acao === 'idle' && strandInfo.fila === 0;

      return {
        packVisiveis, mintVisivel, muzzleDentro, worldDim, realDim,
        maosPlaceholder, familyBytes, breathDelta, strandRecovered, strandInfo,
      };
    }, [id, MUT]);

    check(medida.packVisiveis.length === 0, `ID1 ${id}: pack invisível`, medida.packVisiveis.join(', '));
    check(medida.mintVisivel, `ID2 ${id}: malha Mint na mão`);
    check(medida.muzzleDentro, `ID3 ${id}: muzzle dentro da arma Mint`);
    const razao = medida.realDim > 0 ? medida.worldDim / medida.realDim : Infinity;
    check(razao >= 0.8 && razao <= 1.2, `ID4 ${id}: escala em mundo ±20%`, `razão ${razao.toFixed(3)}`);
    check(medida.maosPlaceholder.length === 0, `ID5 ${id}: mãos com textura real (shared religado)`,
      medida.maosPlaceholder.join(', '));
    check(medida.familyBytes > 0 && medida.familyBytes < 8 * 1024 * 1024,
      `ID6 ${id}: download da família < 8 MiB`, `${(medida.familyBytes / 1048576).toFixed(1)} MiB`);
    check(medida.breathDelta < 0.02, `ID7 ${id}: parado, a mão fica na arma (sem vagar)`,
      `desvio máximo ${(medida.breathDelta * 1000).toFixed(1)} mm em 3,5 s`);
    check(medida.strandRecovered, `ID8 ${id}: recarga escondida volta ao idle sem encalhar`);
    resultados.push({ id, familia, ...medida, razao: Number(razao.toFixed(3)) });
    await page.close();
  }
} finally {
  await browser.close();
  srv.kill();
}

console.log(JSON.stringify({ mutante: MUT || null, armas: ARMAS, resultados, falhas }, null, 2));
process.exit(falhas.length ? 1 : 0);
