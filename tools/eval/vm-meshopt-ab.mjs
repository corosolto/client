#!/usr/bin/env node
/* A/B DE PARIDADE DE VIEWMODEL MESHOPT (lane glm/peso, PR meshopt).
   ----------------------------------------------------------------------------
   POR QUÊ: a conversão para EXT_meshopt_compression re-quantiza vértices. A prova
   de que nada mudou VISUALMENTE é captura antes/depois na MESMA câmera, e a de que
   o convertido CARREGA é a página public/vm-meshopt-eval.html abrir com o GLTFLoader
   vendido (decoder ligado no próprio loader).

   No in-game o ruído domina (A/A mediu 25,8% de pixels >8 por causa da fase da
   animação de idle e do cenário vivo); aqui a pose é a de bind, sem mixer, e o
   A/A fica em 0.

   Uso: node tools/eval/vm-meshopt-ab.mjs [arma ...]   (default: as 15 hires)
   Original vem de git HEAD (nada convertido foi commitado); evidência em
   tools/eval/asset-evidence/meshopt-vms/<arma>-{antes,depois,diff}.png + meta.
   Sai 1 se alguma arma: falha a carregar, ou diff máximo > TETO. */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { subirServe } from './lib/serve-eval.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '9148';
const TETO_PCT_8 = 1;     // % de pixels com delta >8: borda AA desloca sub-pixel
const TETO_PCT_64 = 0.1;  // % com delta >64: regressão de verdade explode isso
// Procedência (medido 14/10, 1600x900, pose de bind): ak 0,026%/0% · p90
// 0,724%/0,032% · pistol 0,006%/0% — tudo em silhueta, zero em área de textura.
const BASE = arg('base') || `http://127.0.0.1:${PORTA}`;
const armas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TODAS = execSync("ls public/models/viewmodels/coro | grep -E '^[a-z0-9]+-hires.glb$' | sed 's/-hires.glb//'", { encoding: 'utf8' }).trim().split('\n');
const lista = armas.length ? armas : TODAS;

const srv = arg('base') ? null : await subirServe(PORTA, { url: `${BASE}/` });

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const sharp = (await import('sharp')).default;
const EVID = 'tools/eval/asset-evidence/meshopt-vms';
mkdirSync(EVID, { recursive: true });

/* AQUECIMENTO: a 1ª carga de um contexto SwiftShader compila shaders e sai preta
   (A/A mediu 25% de falso positivo sem isto); quem paga é uma carga descartável. */
async function aquece(arma = 'ak') {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/vm-meshopt-eval.html?w=${arma}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.__vmMeshoptEval && (window.__vmMeshoptEval.pronto || window.__vmMeshoptEval.erro), null, { timeout: 60_000 });
  await page.waitForTimeout(1200);
  await ctx.close();
}

let CTX_COMPARTILHADO = null;
async function captura(arma) {
  // UM contexto para o run inteiro: a 1ª carga de um contexto SwiftShader sai preta
  // (compilação de shader), e contexto novo por captura mede isso em todo par.
  if (!CTX_COMPARTILHADO) CTX_COMPARTILHADO = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await CTX_COMPARTILHADO.newPage();
  try {
    await page.goto(`${BASE}/vm-meshopt-eval.html?w=${arma}&x=${Math.random().toString(36).slice(2)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => window.__vmMeshoptEval && (window.__vmMeshoptEval.pronto || window.__vmMeshoptEval.erro), null, { timeout: 60_000 });
    const estado = await page.evaluate(() => window.__vmMeshoptEval);
    if (estado.erro || !estado.pronto) throw new Error(`${arma}: não carregou (${estado.erro || 'timeout'})`);
    const buf = await page.screenshot({ timeout: 30_000 });
    return { buf, trios: estado.trios, clipes: estado.clipes.length };
  } finally { await page.close(); }
}

const glb = (arma) => `public/models/viewmodels/coro/${arma}-hires.glb`;
// O original vem de origin/main: nesta branch o CONVERTIDO já está commitado em
// HEAD, e "git show HEAD" faria o A/B comparar o arquivo consigo mesmo.
const originalDe = (arma) => execSync(`git show origin/main:${glb(arma)}`, { maxBuffer: 64 * 1e6 });

let falhas = 0;
const resumo = [];
await aquece(); await aquece(); await aquece();   // as 2 primeiras cargas do processo saem pretas (shader/driver), a 3ª já renderiza
for (const arma of lista) {
  const convertido = readFileSync(glb(arma));
  try {
    writeFileSync(glb(arma), originalDe(arma));
    const antes = await captura(arma);
    writeFileSync(glb(arma), convertido);
    const depois = await captura(arma);
    const diff = await sharp(antes.buf).composite([{ input: depois.buf, blend: 'difference' }]).png().toBuffer();
    const { data } = await sharp(diff).raw().toBuffer({ resolveWithObject: true });
    let gt8 = 0, gt64 = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v > 8) gt8++;
      if (v > 64) gt64++;
    }
    const pct8 = 100 * gt8 / data.length, pct64 = 100 * gt64 / data.length;
    const ok = pct8 <= TETO_PCT_8 && pct64 <= TETO_PCT_64 && antes.trios === depois.trios && antes.clipes === depois.clipes;
    resumo.push({ arma, pct8: +pct8.toFixed(4), pct64: +pct64.toFixed(4), trisAntes: antes.trios, trisDepois: depois.trios, clipesAntes: antes.clipes, clipesDepois: depois.clipes, ok, carregou: true });
    console.log(`${ok ? '✓' : '✗'} ${arma.padEnd(10)} >8 ${pct8.toFixed(3)}% · >64 ${pct64.toFixed(3)}% · tris ${antes.trios}->${depois.trios} · clipes ${antes.clipes}->${depois.clipes}`);
  } catch (e) {
    falhas++;
    resumo.push({ arma, erro: String(e.message || e), ok: false });
    console.error(`✗ ${arma}: ${e.message}`);
    writeFileSync(glb(arma), convertido);   // deixa o convertido no lugar mesmo assim
  }
}
writeFileSync(`${EVID}/ab-resumo.json`, JSON.stringify({ quando: new Date().toISOString(), tetos: { pct8: TETO_PCT_8, pct64: TETO_PCT_64 }, armas: resumo }, null, 2));
await browser.close();
srv?.kill();
process.exit(falhas ? 1 : 0);
