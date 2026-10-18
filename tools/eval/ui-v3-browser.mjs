#!/usr/bin/env node
/* Metade de navegador da régua Treta Pop: o que a ui-v3-check lê no fonte, aqui é medido
   no que o Chrome desenha (fonte carregada, padrão v3 e rollback legado) e as pranchas são capturadas.
     BASE=http://127.0.0.1:9417 node tools/eval/ui-v3-browser.mjs [--mutantes]
   Saída: OUT (padrão tools/eval/out/ui-v3). Um navegador por vez (with-browser-lock.sh). */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9417';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3';
const MUTANTES = process.argv.includes('--mutantes');
const FAMILIAS = ['Anton', 'Barlow Semi Condensed', 'JetBrains Mono'];
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

async function abrir(caminho, { mutante = '', viewport = { width: 1536, height: 1024 } } = {}) {
  const page = await browser.newPage({ viewport });
  if (mutante === 'fonte-404') await page.route('**/fonts/anton-latin-400-normal.woff2', (r) => r.fulfill({ status: 404, body: '' }));
  if (mutante === 'default-opt-in') {
    await page.route((u) => u.pathname === '/' && !u.search, async (r) => {
      const res = await r.fetch();
      const antes = await res.text();
      const html = antes.replace("if (ui === 'legacy') return;", "if (ui !== 'v3') return;");
      if (html === antes) throw new Error('mutante default-opt-in não aplicou');
      await r.fulfill({ response: res, body: html });
    });
  }
  await page.goto(BASE + caminho, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  if (mutante === 'botao-baixo') {
    await page.addStyleTag({ content: '.tp-btn{line-height:1!important}' });
    if (!(await page.evaluate(() => [...document.styleSheets].some((f) => f.ownerNode?.textContent?.includes('line-height:1!important'))))) throw new Error('mutante botao-baixo não aplicou');
  }
  return page;
}

/* Primeira família da pilha computada de cada elemento com texto próprio e visível. */
const censo = () => {
  const conta = {};
  const novas = ['Anton', 'Barlow Semi Condensed', 'JetBrains Mono'];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.checkVisibility?.() || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const c = (conta[fam] ||= { n: 0, ex: [] });
    c.n++;
    if (!novas.includes(fam) && c.ex.length < 6) c.ex.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList[0] ? '.' + el.classList[0] : ''} "${el.textContent.trim().slice(0, 24)}"`);
  }
  return conta;
};

async function medir(mutante = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

  const kit = await abrir('/ui-v3-kit.html', { mutante });
  /* O Chrome só baixa a face que algo usa: load() força cada uma e prova que o arquivo decodifica. */
  const faces = await kit.evaluate(() => Promise.all([...document.fonts].filter((f) => /Anton|Barlow Semi|JetBrains/.test(f.family))
    .map((f) => f.load().catch(() => {}).then(() => ({ fam: f.family.replace(/["']/g, ''), peso: f.weight, status: f.status })))));
  const naoCarregou = faces.filter((f) => f.status !== 'loaded');
  const usadas = await kit.evaluate(censo);
  const fora = Object.keys(usadas).filter((f) => !FAMILIAS.includes(f)).map((f) => `${f} ${usadas[f].ex.join(', ')}`);
  const desenha = await kit.evaluate(() => ['400 40px Anton', '700 20px "Barlow Semi Condensed"', '800 20px "JetBrains Mono"'].filter((f) => !document.fonts.check(f)));
  add('TPB1', faces.length >= 8 && !naoCarregou.length && !fora.length && !desenha.length,
    naoCarregou.length ? `face não carregou: ${naoCarregou.map((f) => `${f.fam} ${f.peso} ${f.status}`).join(', ')}`
      : fora.length ? `kit cai em: ${fora.join(', ')}` : desenha.length ? `document.fonts.check falha: ${desenha.join(', ')}`
        : `${faces.length} faces carregadas; texto do kit só em ${Object.keys(usadas).join(' / ')}`);
  /* Alturas medidas em design/treta-pop-2026-10-14/png/00-main.png: JOGAR 82, TROCAR MAPA e LOBBY 61. */
  const alt = await kit.evaluate(() => Object.fromEntries(['.tp-btn--primario', '.tp-btn:not([class*="--"])', '.tp-btn--fantasma']
    .map((s) => [s, Math.round(document.querySelector(`#prancha-1 ${s}`).getBoundingClientRect().height)])));
  const [hP, hS, hF] = Object.values(alt);
  add('TPB5', Math.abs(hP - 82) <= 2 && Math.abs(hS - 61) <= 2 && hF === hS,
    `botões: primário ${hP} px (ref 82), secundário ${hS} (ref 61), fantasma ${hF} (igual ao secundário)`);
  if (!mutante) {
    await kit.screenshot({ path: `${OUT}/kit-prancha1.png` });
    for (const [nome, q] of [['prancha2', ''], ['prancha2-aberta', '&aba=2&gaveta&toast&barra']]) {
      await kit.goto(`${BASE}/ui-v3-kit.html?prancha=2${q}`);
      await kit.evaluate(() => document.fonts.ready);
      await kit.waitForTimeout(700);
      if (q) await kit.hover('#card-alvo');
      await kit.waitForTimeout(400);
      await kit.screenshot({ path: `${OUT}/kit-${nome}.png` });
    }
  }
  await kit.close();

  const v3 = await abrir('/?ui=v3', { mutante });
  await v3.waitForTimeout(2500);
  const m3 = await v3.evaluate(() => ({
    ui: document.documentElement.dataset.ui,
    body: getComputedStyle(document.body).fontFamily,
    peso: getComputedStyle(document.body).fontWeight,
    hub: getComputedStyle(document.querySelector('#main-menu') || document.body).getPropertyValue('--font').trim(),
  }));
  if (!mutante) { await v3.keyboard.press('Enter'); await v3.waitForTimeout(2000); }
  const censoV3 = await v3.evaluate(censo);
  if (!mutante) await v3.screenshot({ path: `${OUT}/menu-v3.png` });
  await v3.close();
  add('TPB2', m3.ui === 'v3' && /^"?Barlow Semi Condensed/.test(m3.body) && m3.peso === '500' && /tp-ui|Barlow Semi/.test(m3.hub),
    `?ui=v3 → data-ui=${m3.ui}, body ${m3.body.split(',')[0]} ${m3.peso}, --font do #main-menu ${m3.hub.split(',')[0]}`);

  const pad = await abrir('/', { mutante });
  await pad.waitForTimeout(2500);
  const mp = await pad.evaluate(() => ({
    ui: document.documentElement.dataset.ui || '',
    body: getComputedStyle(document.body).fontFamily,
    peso: getComputedStyle(document.body).fontWeight,
    hub: getComputedStyle(document.querySelector('#main-menu') || document.body).getPropertyValue('--font').trim(),
  }));
  if (!mutante) { await pad.keyboard.press('Enter'); await pad.waitForTimeout(2000); }
  if (!mutante) await pad.screenshot({ path: `${OUT}/menu-padrao.png` });
  await pad.close();
  add('TPB3', mp.ui === 'v3' && /^"?Barlow Semi Condensed/.test(mp.body) && mp.peso === '500' && /tp-ui|Barlow Semi/.test(mp.hub),
    `sem query → data-ui=${mp.ui}, body ${mp.body.split(',')[0]} ${mp.peso}, --font do #main-menu ${mp.hub.split(',')[0]}`);

  const leg = await abrir('/?ui=legacy', { mutante });
  await leg.waitForFunction(() => document.documentElement.dataset.ui === 'legacy', null, { timeout: 30000 }).catch(() => {});
  const ml = await leg.evaluate(() => ({
    ui: document.documentElement.dataset.ui || '',
    body: getComputedStyle(document.body).fontFamily,
    folha: [...document.styleSheets].some((s) => /\/css\/tp\//.test(s.href || '')),
  }));
  if (!mutante) await leg.screenshot({ path: `${OUT}/menu-legacy.png` });
  await leg.close();
  add('TPB4', ml.ui === 'legacy' && !/Barlow Semi|Anton|JetBrains/.test(ml.body) && !ml.folha,
    `?ui=legacy → data-ui="${ml.ui}", body "${ml.body.split(',')[0]}", folha Treta Pop ${ml.folha ? 'carregada' : 'ausente'}`);
  return { r, censoV3 };
}

mkdirSync(OUT, { recursive: true });
let sair = 0;
if (MUTANTES) {
  for (const [mut, alvo] of [['fonte-404', 'TPB1'], ['default-opt-in', 'TPB3'], ['botao-baixo', 'TPB5']]) {
    const { r } = await medir(mut);
    const c = r.find((x) => x.id === alvo);
    if (c.ok) sair = 1;
    console.log(`${c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const { r, censoV3 } = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  /* Linha de base para as fases 2-5: elementos do menu que ainda não estão nas três famílias. */
  console.log('\ncenso de fontes do menu padrão:', JSON.stringify(censoV3));
  writeFileSync(`${OUT}/censo-v3.json`, JSON.stringify(censoV3, null, 2));
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nui-v3 navegador: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
