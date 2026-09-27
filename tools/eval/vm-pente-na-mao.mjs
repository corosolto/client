#!/usr/bin/env node
/* ============================================================================
   vm-pente-na-mao.mjs — O CARREGADOR APARECE NA MÃO DURANTE A RECARGA?
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Crítico cego r2 (artifacts/review-L1, 23/09): "tira carregador fantasma" na
   mp5 (a mão sai com um toco de 15–20 px), "tira no ar" na p90 (punho vazio) e
   "pente voa por cima da arma" na uzi. `vm-recarga-probe` e `vm-pente-carga`
   ficavam verdes nas três: a peça ANDA e TEM geometria — só não está na mão, ou
   está dentro do antebraço, de ponta para a câmera.

   O QUE MEDE
   No jogo real (`?vmauthored=1`), relógio do viewmodel segurado, peça pintada de
   magenta sem luz, em instantes da recarga em que a mão deveria segurá-la:
     1. fora    — a peça saiu do encaixe (≥ 3 cm do lugar dela no idle, medido no
                  referencial da arma); peça parada no encaixe não conta como "na mão";
     2. px      — pixels magenta VISÍVEIS na figura servida (luva por cima conta contra);
     3. fração  — visíveis ÷ silhueta inteira (mesma pose desenhada sem teste de
                  profundidade): pega o pente enterrado no antebraço;
     4. dist    — centróide visível até o osso da mão, projetado pela `vmCamera`.

   PISOS COM PROCEDÊNCIA — ver o bloco PISO abaixo (medidos pela própria régua,
   `--armas=ak`, 1440×960, na AK golden aprovada, pente de reposição na mão).

   MUTANTE
     --mutante=original   serve o GLB do catálogo Codex (antes do conserto): mp5,
                          p90 e uzi têm de ficar VERMELHAS.

   USO
     node tools/eval/vm-pente-na-mao.mjs --porta=4691 --armas=mp5,p90,uzi [--figuras=dir]
   ========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORTA = opt('porta', '4691');
const BASE = `http://127.0.0.1:${PORTA}`;
const MUTANTE = opt('mutante');
const FIGURAS = opt('figuras');
// AK golden, Reload 1,80/1,95/2,10 s (23/09): px 5 012–15 594, fração 0,30–0,53,
// dist 192–255 px. Pisos: px = 1/5 do mínimo, fração = 2/3 do mínimo, dist = máximo.
const PISO = { fora: 0.03, px: 1000, fracao: 0.2, dist: 260 };

// Instantes (s de clipe) com a peça na mão: janela cheia das receitas
// `tools/viewmodels/prep/mag-na-mao.json`; na AK, o trecho do pente de reposição.
const ALVOS = {
  ak: { peca: /ak_replacement_magazine$/i, arma: /ak_body$/i, mao: /^hand\.?L_metarig$/, clipes: { reload: [1.8, 1.95, 2.1] } },
  mp5: { peca: /^MINT_WEAPON_MAG_MP5$/, arma: /^GEO_WEAPON_MP5/, mao: /^hand_l$/, clipes: { reload_empty: [0.8, 1.0, 1.15], reload_tactical: [0.8, 1.0, 1.15] } },
  p90: { peca: /^MINT_WEAPON_MAG_P90$/, arma: /^GEO_WEAPON_P90/, mao: /^hand_l$/, clipes: { reload_empty: [0.8, 1.0, 1.15], reload_tactical: [0.8, 1.0, 1.15] } },
  uzi: { peca: /^MINT_WEAPON_MAG_UZI$/, arma: /^GEO_WEAPON_UZI$/, mao: /^hand_l$/, clipes: { reload_empty: [1.3, 1.45, 1.6], reload_tactical: [1.3, 1.45, 1.6] } },
};
const ARMAS = opt('armas', 'mp5,p90,uzi').split(',').filter(Boolean);
for (const arma of ARMAS) if (!ALVOS[arma]) throw new Error(`sem alvo para ${arma}`);

const ORIGINAL = path.join(os.homedir(), 'csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root/viewmodels');
const ROOT = process.cwd();
const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { WEAPONS } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/weapons.js')).href);
const families = [...new Set(Object.values(VM_WEAPON).map((e) => e.family))];
const query = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', armaslazy: '0', vmauthored: '1',
  vmqa: 'precision', vmready: families.join(','), vmweapon: Object.keys(VM_WEAPON).join(',') }).toString();
const pw = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.js`).href);
const browser = await (pw.chromium || pw.default.chromium).launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
if (MUTANTE === 'original') {
  await page.route(/\/private-assets\/viewmodels\/.+\.glb/, async (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname).split('/private-assets/viewmodels/')[1];
    const arquivo = path.join(ORIGINAL, rel);
    if (!fs.existsSync(arquivo)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: fs.readFileSync(arquivo), contentType: 'model/gltf-binary' });
  });
} else if (MUTANTE) throw new Error(`mutante desconhecido: ${MUTANTE}`);
if (FIGURAS) fs.mkdirSync(FIGURAS, { recursive: true });
await page.goto(`${BASE}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}' });
await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
await page.evaluate(() => {
  const vm = window.__authoredVm; const orig = vm.update; const cap = { hold: false, lastCtx: { ads: 0 } };
  vm.update = function (dt, ctx) { cap.lastCtx = ctx || cap.lastCtx; if (cap.hold) return; return orig.call(this, dt, ctx); };
  cap.step = (s) => { let r = s; while (r > 1e-6) { const d = Math.min(1 / 60, r); orig.call(vm, d, { ...cap.lastCtx, ads: 0, scoped: false }); r -= d; } };
  vm.__cap = cap;
});
const calma = () => page.evaluate(() => { const g = window.__game; for (const b of g?.bots || []) { b.nextShotAt = Infinity; b.target = null; } g.player.hp = 100; g.player.alive = true; g.timeLeft = 600; });
const desenhado = async () => { const f0 = await page.evaluate(() => window.__game._rafFrames || 0);
  await page.waitForFunction((f) => (window.__game._rafFrames || 0) >= f + 3, f0, { timeout: 20000 }); await page.waitForTimeout(60); };
const re = (r) => ({ source: r.source, flags: r.flags });

// Pixels magenta e centróide; com `raioX` a peça é desenhada por cima de tudo.
const contar = async (arma, alvo, raioX) => {
  await page.evaluate(({ x, raioX }) => { const e = window.__authoredVm.entry(x);
    for (const o of e.__pintadas) { o.material.depthTest = !raioX; o.renderOrder = raioX ? 999 : 0; } }, { x: arma, raioX });
  await desenhado();
  const png = await page.screenshot();
  const medida = await page.evaluate(async ({ b64, x, maoRe }) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height); const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data; let n = 0; let sx = 0; let sy = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200) { const k = i / 4; n += 1; sx += k % img.width; sy += Math.floor(k / img.width); }
    const e = window.__authoredVm.entry(x); const R = new RegExp(maoRe.source, maoRe.flags); let mao = null;
    e.mount.traverse((o) => { if (!mao && R.test(o.name)) mao = o; });
    const cam = window.__game.vmCamera; let dist = null;
    if (mao && n) { const v = mao.getWorldPosition(new cam.position.constructor()); v.project(cam);
      dist = Math.hypot(sx / n - (v.x + 1) / 2 * img.width, sy / n - (1 - v.y) / 2 * img.height); }
    return { px: n, dist: dist === null ? null : Math.round(dist) };
  }, { b64: png.toString('base64'), x: arma, maoRe: re(alvo.mao) });
  await page.evaluate((x) => { for (const o of window.__authoredVm.entry(x).__pintadas) { o.material.depthTest = true; o.renderOrder = 0; } }, arma);
  return { png, ...medida };
};
// Centro da peça no referencial do corpo da arma, em metros de mundo.
const noCorpo = (arma, alvo) => page.evaluate(async ({ x, armaRe }) => {
  const THREE = await import('three'); const e = window.__authoredVm.entry(x); const R = new RegExp(armaRe.source, armaRe.flags);
  let corpo = null; e.mount.traverse((o) => { if (!corpo && R.test(o.name)) corpo = o; });
  // Peça skinada (AK golden) anda pelo osso: o pente de reposição não tem encaixe no idle.
  if (e.__pintadas.some((o) => o.isSkinnedMesh)) return null;
  e.mount.updateWorldMatrix(true, true);
  const caixa = new THREE.Box3(); for (const o of e.__pintadas) caixa.expandByObject(o);
  const c = caixa.getCenter(new THREE.Vector3());
  return corpo ? c.applyMatrix4(corpo.matrixWorld.clone().invert()).multiply(corpo.getWorldScale(new THREE.Vector3())).toArray() : null;
}, { x: arma, armaRe: re(alvo.arma) });

const resultados = [];
for (const arma of ARMAS) {
  const alvo = ALVOS[arma];
  await calma();
  await page.evaluate(() => { window.__authoredVm.__cap.hold = false; });
  await page.evaluate((x) => window.__vmPrecisionQa.equip(x), arma);
  await page.waitForFunction((x) => { const e = window.__authoredVm.entry(x); return e && (e.golden || e.mint?.active) && e.mount.visible; }, arma, { timeout: 120000 });
  await page.waitForTimeout(1200);
  const pintadas = await page.evaluate(async ({ x, pecaRe }) => {
    const THREE = await import('three');
    const e = window.__authoredVm.entry(x); const R = new RegExp(pecaRe.source, pecaRe.flags); e.__pintadas = [];
    e.mount.traverse((o) => { if (o.isMesh && (R.test(o.name) || R.test(o.parent?.name || ''))) {
      o.material = new THREE.MeshBasicMaterial({ color: 0xff00ff, toneMapped: false, fog: false, side: THREE.DoubleSide }); e.__pintadas.push(o); } });
    return e.__pintadas.length;
  }, { x: arma, pecaRe: re(alvo.peca) });
  if (!pintadas) { resultados.push({ arma, passa: false, erro: 'peça não encontrada' }); console.log(`FALHA ${arma}: peça não encontrada`); continue; }
  await calma();
  await page.evaluate(() => { window.__authoredVm.__cap.hold = true; });
  await desenhado();
  const encaixe = await noCorpo(arma, alvo);
  const tempos = opt('tempos') ? opt('tempos').split(',').map(Number) : null;
  for (const [clipe, instantes] of Object.entries(tempos ? { [Object.keys(alvo.clipes)[0]]: tempos } : alvo.clipes)) {
    for (const t of instantes) {
      await calma();
      const iniciou = await page.evaluate(({ x, clipe, meio }) => {
        const g = window.__game; const p = g.player;
        p.reloadUntil = 0; p.drawUntil = 0; g._scope(false, true);
        const a = p.ammo[x]; a.mag = /tactical/.test(clipe) ? meio : 0; a.res = 999;
        g._startReload();
        return window.__authoredVm.entry(x).state === 'reload';
      }, { x: arma, clipe, meio: Math.max(1, Math.floor((WEAPONS[arma]?.mag || 30) / 2)) });
      let clipeAtual = ''; let tempo = 0;
      for (let i = 0; i < 1200; i += 1) {
        ({ clipeAtual, tempo } = await page.evaluate((x) => { const a = window.__authoredVm.entry(x).action; return { clipeAtual: a?.getClip?.()?.name || '', tempo: a?.time || 0 }; }, arma));
        if (tempo >= t - 1e-3) break;
        await page.evaluate(() => window.__authoredVm.__cap.step(1 / 60));
      }
      const agora = await noCorpo(arma, alvo);
      const fora = encaixe && agora ? Math.hypot(...agora.map((v, k) => v - encaixe[k])) : null;
      const visivel = await contar(arma, alvo, false);
      const inteira = await contar(arma, alvo, true);
      if (FIGURAS) fs.writeFileSync(path.join(FIGURAS, `${arma}-${clipe}-${t.toFixed(2)}.png`), visivel.png);
      const fracao = inteira.px ? visivel.px / inteira.px : 0;
      const passa = iniciou && (fora === null || fora >= PISO.fora) && visivel.px >= PISO.px && fracao >= PISO.fracao && visivel.dist !== null && visivel.dist <= PISO.dist;
      resultados.push({ arma, clipe: clipeAtual, t: +tempo.toFixed(3), fora: fora === null ? null : +fora.toFixed(3), px: visivel.px, fracao: +fracao.toFixed(2), dist: visivel.dist, passa });
      console.log(`${passa ? 'PASSA' : 'FALHA'} ${arma} ${clipeAtual}@${tempo.toFixed(2)} fora=${fora === null ? 'n/a' : `${(fora * 100).toFixed(1)}cm`} px=${visivel.px} fração=${fracao.toFixed(2)} dist=${visivel.dist}px`);
      await page.evaluate(() => { window.__authoredVm.__cap.step(5); window.__game.player.reloadUntil = 0; });
    }
  }
  await page.evaluate(() => { window.__authoredVm.__cap.hold = false; });
}
await browser.close();
const porArma = Object.fromEntries(ARMAS.map((a) => [a, resultados.filter((r) => r.arma === a).every((r) => r.passa)]));
const ok = resultados.every((r) => r.passa);
console.log(JSON.stringify({ ok, mutante: MUTANTE || null, porArma, piso: PISO }));
process.exit(ok ? 0 : 1);
