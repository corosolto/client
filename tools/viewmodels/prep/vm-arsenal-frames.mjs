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
import { MEDIR } from './vm-frame-measure.mjs';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '8166');
const ASPECTO = arg('aspecto', '32');
const MODO = arg('modo', 'legado');
const TAG = arg('tag', 'run');
const ARMAS = arg('armas', '').split(',').filter(Boolean);
const SO_IDLE = process.argv.includes('--so-idle');
const MUTANTE = arg('mutante');
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
  if (MODO === 'autorado') {
    q.set('vmauthored', '1');
    q.set('vmready', 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,revolver,shotgun,lmg');
  }
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate((mutante) => { window.__VM_MUTANTE = mutante; }, MUTANTE);
  // expoe o flag de luneta do dado do jogo para a medicao ler
  await page.evaluate(async () => {
    const m = await import('/js/data/weapons.js');
    window.__WEAPONS_SCOPE = Object.fromEntries(Object.entries(m.WEAPONS).map(([k, v]) => [k, !!v.scope]));
    const c = await import('/js/data/vmconfig.js');
    window.__VM_BAKED = Object.fromEntries(Object.entries(c.VM_WEAPON).map(([k, v]) => [k, !!v.baked]));
    const w = await import('/js/weapons.js');
    window.__WEAPON_LEN = Object.fromEntries(Object.keys(c.VM_WEAPON).map((k) => [k, Math.round(w.weaponCFG(k).len * 1000) / 10]));
  });
  const lista = ARMAS.length ? ARMAS : await page.evaluate(() => window.__game.player.inventarioQA || null);
  relatorio.solicitadas = lista;   // inventário declarado: o portão reprova o que não foi medido
  for (const arma of lista) {
    let trocou = false;
    for (let t = 0; t < 3 && trocou !== true; t += 1) {
      trocou = await page.evaluate((w) => { try { window.__game._switchWeapon(w); return window.__game.player.weapon === w; } catch (e) { return String(e).slice(0, 80); } }, arma);
      if (trocou !== true) await page.waitForTimeout(600);
    }
    if (trocou !== true) { console.log(`${arma}: troca falhou (${trocou})`); continue; }
    /* 1,4 s pegava o arco de equip em voo (a mão ainda subindo, fora do quadro) e a
       medida saía 0 com a arma já em quadro — falso vermelho. Espera a contagem de
       mão estabilizar entre duas amostras antes de capturar. */
    /* Presenca NAO basta: durante o arco de equip a arma ainda se aproxima, e a
       diagonal aparente do mesmo par de armas chegou a inverter entre rodadas
       (akm 616 numa, 450 noutra). Espera a diagonal parar de andar (<3% entre duas
       amostras) antes de capturar. */
    let esperou = 0, diagAnterior = -1, assentou = false;
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(400);
      esperou += 400;
      const m = await page.evaluate(MEDIR, arma);
      if (m.maoEmQuadro > 0 && m.armaEmQuadro > 0 && esperou >= 1200) {
        const d = m.arma_diag_px || 0;
        if (diagAnterior > 0 && Math.abs(d - diagAnterior) / diagAnterior < 0.03) { assentou = true; break; }
        diagAnterior = d;
      }
    }
    relatorio.assentou = relatorio.assentou || {};
    relatorio.assentou[arma] = assentou;   // false = capturou sem assentar, o dado avisa
    relatorio.esperas = relatorio.esperas || {};
    relatorio.esperas[arma] = esperou;   // se bateu no teto, o viewmodel nao assentou
    await capturar(page, arma, 'idle');
    if (SO_IDLE) continue;
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(600);
    await capturar(page, arma, 'ads');
    await page.mouse.up({ button: 'right' });
    /* Arma com luneta usa ADS em ALTERNANCIA (game.js: "so solta o ADS das
       nao-sniper"): soltar o botao nao desmira. Sem este toggle as capturas
       seguintes saem todas com o viewmodel escondido — falso vermelho meu. */
    for (let i = 0; i < 10; i += 1) {
      const mirando = await page.evaluate(() => !!window.__game.player?.scoped);
      if (!mirando) break;
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(500);
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
if (relatorio.falha || !relatorio.capturas.length
  || relatorio.capturas.some((c) => c.classificacaoMaoCorreta === false)) process.exitCode = 1;
