#!/usr/bin/env node
/* Coleta medida do viewmodel NO JOGO REAL, arma por arma, caminho autorado OU legado.
 *
 * Por que existe: a reprovação de 07/09 foi diagnosticada como "curva de mão da LMG"
 * a partir de 16 screenshots que, medidos, são SETE armas diferentes (o frame
 * apontado como caso primário é a AWP). Régua de família só não enxerga isso.
 *
 * Mede EM-PÁGINA, por captura: vértices de mão em quadro, vértices de arma em
 * quadro, contato mão↔arma em px, bbox/diagonal aparente da arma. O inventário de
 * malhas vai no relatório: régua sem alvo declarado passa por vacuidade.
 *
 * Uso: node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=8166 --aspecto=32 \
 *        --armas=lmg,m4,awp --modo=legado --tag=vermelho
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '8166');
const ASPECTO = arg('aspecto', '32');
const MODO = arg('modo', 'legado');
const TAG = arg('tag', 'run');
const ARMAS = arg('armas', '').split(',').filter(Boolean);
// o id do mapa da revisao do dono e `piscina_treta`; `piscina` cai no padrao (Brasilia)
const MAPA = arg('mapa', 'piscina_treta');
const OUT = path.resolve(arg('out', path.join(ROOT, 'artifacts/viewmodels/arsenal', `${TAG}-${MODO}-${ASPECTO}`)));
const BASE = `http://127.0.0.1:${PORTA}`;
// 3:2 é como o dono joga (CONTRIBUTING: validar só em 16:9 já custou uma rodada).
const VIEWPORT = ASPECTO === '32' ? { width: 1440, height: 960 } : { width: 1440, height: 810 };

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const ok = await fetch(BASE).then((r) => r.ok).catch(() => false);
if (!ok) { console.error(`ERRO: nada servindo em ${BASE}. Suba o servidor antes.`); process.exit(2); }

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const relatorio = { tag: TAG, modo: MODO, aspecto: ASPECTO, viewport: VIEWPORT, base: BASE, capturas: [] };

/* A medição roda dentro da página: projeta vértices skinados na câmera do
   viewmodel e conta o que cai DENTRO do quadro. Mão e arma são separadas por
   nome — os dois caminhos batem no mesmo par de regex. */
const MEDIR = (arma) => {
  const g = window.__game;
  const cam = g.vmCamera;
  if (!cam) return { erro: 'sem vmCamera' };
  cam.updateMatrixWorld(true);
  const W = innerWidth, H = innerHeight;
  const raizes = [];
  if (g.vm?.root) raizes.push(g.vm.root);
  const ent = window.__authoredVm?.entry?.(arma);
  if (ent?.scene) raizes.push(ent.scene);
  /* `arm` cru NAO serve de token: todo skinned mesh pende de um no `Armature`, e
     com ele a primeira versao desta regua classificou a arma inteira como mao
     (m92: mao 278/306, arma 0/0). Tokens ancorados; so `fp-character` sobe na
     arvore, que e o grupo de bracos do caminho legado (fparms.js:217). */
  const eMao = (n) => /GEO_FP_SK_|fp-character|(^|[_.\-])(glove|hand|forearm|sleeve|cloth)/i.test(n || '');
  const visivel = (o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
  const maos = [], armas = [], invMao = [], invArma = [];
  for (const r of raizes) {
    r.updateWorldMatrix(true, true);
    r.traverse((c) => {
      if (!c.isMesh || !c.geometry?.attributes?.position || !visivel(c)) return;
      let n = c.name || '', p = c.parent, mao = eMao(n);
      while (!mao && p) { if (/fp-character/i.test(p.name || '')) mao = true; p = p.parent; }
      (mao ? maos : armas).push(c);
      (mao ? invMao : invArma).push(`${n || '?'}:${c.geometry.attributes.position.count}`);
    });
  }
  const V3 = cam.position.constructor;
  const amostrar = (lista, maxPts) => {
    const pts = [];
    const total = lista.reduce((s, c) => s + c.geometry.attributes.position.count, 0) || 1;
    for (const c of lista) {
      const pos = c.geometry.attributes.position;
      const passo = Math.max(1, Math.floor(total / maxPts));
      const v = new V3();
      for (let i = 0; i < pos.count; i += passo) {
        v.fromBufferAttribute(pos, i);
        if (c.isSkinnedMesh && c.applyBoneTransform) c.applyBoneTransform(i, v);
        pts.push(v.clone().applyMatrix4(c.matrixWorld));
      }
    }
    return pts;
  };
  const proj = (v) => {
    const p = v.clone().project(cam);
    return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, fora: p.z > 1 || p.z < -1 || p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1 };
  };
  const maoPts = amostrar(maos, 300), armaPts = amostrar(armas, 300);
  const maoPx = [], armaPx = [];
  for (const p of maoPts) { const s = proj(p); if (!s.fora) maoPx.push(s); }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of armaPts) {
    const s = proj(p);
    if (s.fora) continue;
    armaPx.push(s);
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  let contato = null;
  if (maoPx.length && armaPx.length) {
    contato = 1e9;
    for (const a of maoPx) for (const b of armaPx) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < contato) contato = d; }
    contato = Math.round(contato);
  }
  return {
    maoEmQuadro: maoPx.length, maoAmostra: maoPts.length,
    armaEmQuadro: armaPx.length, armaAmostra: armaPts.length,
    contato_px: contato,
    arma_diag_px: maxX > minX ? Math.round(Math.hypot(maxX - minX, maxY - minY)) : 0,
    arma_bbox: maxX > minX ? [minX, minY, maxX, maxY].map(Math.round) : null,
    quadro: [W, H],
    invMao: invMao.slice(0, 12), invArma: invArma.slice(0, 12),
    autorado: !!ent,
    /* De onde veio a arma desenhada. Escala aparente so se compara entre a MESMA
       fonte: o wrap Mint e a malha do pack tem tamanhos proprios, e desde o
       conserto do encaixe uma familia pode cair no pack enquanto o GLB de mundo
       nao chega (vmweapon.js pedirModeloDeMundo). */
    fonte: (ent?.mint?.weaponId === arma && ent.mint.active?.visible) ? 'mint' : (armas.length ? 'pack' : 'nenhuma'),
  };
};

async function capturar(page, arma, cenario) {
  const m = await page.evaluate(MEDIR, arma);
  const nome = `${arma}-${cenario}`.replace(/[^a-z0-9-]/gi, '_');
  await page.screenshot({ path: path.join(OUT, `${nome}.png`) });
  relatorio.capturas.push({ arma, cenario, png: `${nome}.png`, ...m });
  console.log(`${arma}/${cenario}: mao ${m.maoEmQuadro}/${m.maoAmostra} arma ${m.armaEmQuadro}/${m.armaAmostra} contato ${m.contato_px}px diag ${m.arma_diag_px}px${m.autorado ? ' [autorado]' : ''}`);
  return m;
}

const page = await browser.newPage({ viewport: VIEWPORT });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e).slice(0, 160)));
try {
  const q = new URLSearchParams({ debug: '1', auto: 'E', map: MAPA, armaslazy: '0' });
  if (MODO === 'autorado') q.set('vmready', 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,revolver,shotgun,lmg');
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  const lista = ARMAS.length ? ARMAS : await page.evaluate(() => window.__game.player.inventarioQA || null);
  for (const arma of lista) {
    const trocou = await page.evaluate((w) => { try { window.__game._switchWeapon(w); return window.__game.player.weapon === w; } catch (e) { return String(e).slice(0, 80); } }, arma);
    if (trocou !== true) { console.log(`${arma}: troca falhou (${trocou})`); continue; }
    await page.waitForTimeout(1400);
    await capturar(page, arma, 'idle');
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(600);
    await capturar(page, arma, 'ads');
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(90);
    await capturar(page, arma, 'fire');
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(500);
    const dur = await page.evaluate(() => { try { window.__game._startReload(); return window.__game.vm?.rig?.dur || 2.5; } catch { return 0; } });
    if (dur > 0) {
      let anterior = 0;
      for (const f of [0.15, 0.35, 0.6, 0.85]) {
        const espera = Math.max(0, dur * (f - anterior) * 1000); anterior = f;
        await page.waitForTimeout(espera);
        await capturar(page, arma, `reload-f${String(Math.round(f * 100)).padStart(3, '0')}`);
      }
      await page.waitForTimeout(dur * 200);
    }
  }
} catch (e) {
  console.error('FALHA:', String(e).slice(0, 400));
  relatorio.falha = String(e).slice(0, 400);
} finally {
  relatorio.errosPagina = erros.slice(0, 10);
  await fs.writeFile(path.join(OUT, 'frames.json'), JSON.stringify(relatorio, null, 1));
  await browser.close().catch(() => {});
}
console.log(`ARSENAL_FRAMES=${OUT}`);
