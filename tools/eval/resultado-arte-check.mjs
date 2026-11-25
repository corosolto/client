/* resultado-arte-check.mjs — a arte da tela de VITÓRIA/DERROTA está inteira e nítida?

   O DEFEITO (14/10, dono, prod alpha.92): "na tela de fim da partida vários personagens
   aparecem cropados ou com qualidade péssima". A UIA19 (redesign-check) estava VERDE,
   porque ela mede margem de alpha, e as três falhas reais passam por margem:

     · barbudo-derrota e julia-zanatta-derrota eram outra arte (foto, não caricatura),
       com o alto da cabeça e as pernas cortados, recolocada na mesma caixa de margem.
       O par vitória/derrota é byte-idêntico nos outros 61 (convenção do lote, ver
       char-result-stills.mjs), e o game.js escolhe o arquivo pelo resultado.
     · lobisomem, mariabonita, bandeirante, curupira e boto eram renders pequenos
       ampliados ~4× (o próprio char-result-stills registra "79×199 px ampliada 6,7×"
       antes do conserto dele); a margem fica certa e a figura sai em escada.

   O QUE ESTA RÉGUA MEDE, por personagem do elenco (characters.js):
     R1 par      derrota é byte-idêntica à vitória
     R2 corte    nenhum pixel de figura na borda do quadro, e o topo da figura não é
                 um corte reto (faixa de 0,4% da altura no topo com < 35% da largura)
     R3 nitidez  D = EQM(reduz 2× e volta) / EQM(reduz 4× e volta), na figura. Arte com
                 detalhe na escala do pixel perde muito mais em 4× do que em 2× (D baixo);
                 arte ampliada não tem o que perder em 2× (D perto de 1). Medido em
                 14/10: os 63 nítidos 0,47-0,65; os cinco ampliados 0,76-0,83; o mutante
                 `ampliada` 0,74. Limiar 0,70, no meio do vão. A folga é curta (0,05 de cada
                 lado): se um personagem novo e nítido passar de 0,70, meça antes de subir.

   --tela <BASE> (browser, fora do check:fast): abre a tela real (?tela=vitoria),
   troca a arte de cada personagem e mede, pela geometria do CSS computado, a
   figura na tela: cabeça e pés dentro da viewport com margem, e a densidade
   efetiva = px de figura no arquivo (metade se reprovar R3) / (px CSS × DPR).
   Densidade < 1 a DPR 1 reprova; a DPR 2 é dívida registrada (o arquivo tem
   1342 px de figura e a tela 3:2 retina pede ~1790), impressa, não escondida.

   Mutantes (a régua tem de ficar VERMELHA; se passar, sai 1):
     --mutante=par       troca a derrota do mst pela vitória do bombado
     --mutante=corte     corta 8% do topo da figura do mst
     --mutante=ampliada  reduz a arte do mst 4× e amplia de volta

   Uso: node tools/eval/resultado-arte-check.mjs
        node tools/eval/resultado-arte-check.mjs --mutante=ampliada
        BASE=http://localhost:9437 sh tools/eval/with-browser-lock.sh \
          node tools/eval/resultado-arte-check.mjs --tela */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIR = join(ROOT, 'public/img/resultado');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const TELA = process.argv.includes('--tela');
const LIMIAR_D = 0.70, LIMIAR_TOPO = 0.35, ALPHA = 24;

const ids = [...readFileSync(join(ROOT, 'public/js/characters.js'), 'utf8')
  .match(/export const CHARACTERS = ([\s\S]*?\n\]);/)[1]
  .matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
if (ids.length < 10) throw new Error(`elenco lido com ${ids.length} ids: parsing quebrado`);

async function carrega(id, pose) {
  let buf = readFileSync(join(DIR, `${id}-${pose}.webp`));
  if (id === 'mst' && MUT === 'par' && pose === 'derrota') buf = readFileSync(join(DIR, 'bombado-vitoria.webp'));
  if (id === 'mst' && MUT === 'ampliada') {
    const m = await sharp(buf).metadata();
    const pequeno = await sharp(buf).resize(Math.round(m.width / 4), Math.round(m.height / 4)).png().toBuffer();
    buf = await sharp(pequeno).resize(m.width, m.height, { kernel: 'nearest' }).webp({ quality: 88, alphaQuality: 100 }).toBuffer();
  }
  if (id === 'mst' && MUT === 'corte') {
    const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let y0 = info.height, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > ALPHA) { if (y < y0) y0 = y; y1 = y; }
    const corte = y0 + Math.round((y1 - y0) * 0.08);
    for (let y = 0; y < corte; y++) for (let x = 0; x < info.width; x++) data[(y * info.width + x) * 4 + 3] = 0;
    buf = await sharp(data, { raw: info }).webp({ quality: 88, alphaQuality: 100 }).toBuffer();
  }
  return buf;
}

async function mede(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const linhas = new Uint32Array(H);
  let x0 = W, x1 = -1, y0 = H, y1 = -1, borda = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] <= ALPHA) continue;
    linhas[y]++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) borda++;
  }
  const figW = x1 - x0 + 1, figH = y1 - y0 + 1;
  const faixa = Math.max(2, Math.round(figH * 0.004));
  let topo = 0;
  for (let i = 0; i < faixa; i++) topo = Math.max(topo, linhas[y0 + i]);
  const eqm = async (k) => {
    const peq = await sharp(data, { raw: info }).resize(Math.round(W / k), Math.round(H / k), { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
    const volta = await sharp(peq.data, { raw: peq.info }).resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer();
    let se = 0, n = 0;
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] < 200) continue;
      for (let c = 0; c < 3; c++) { const d = data[i * 4 + c] - volta[i * 4 + c]; se += d * d; }
      n += 3;
    }
    return se / Math.max(1, n);
  };
  const D = (await eqm(2)) / Math.max(1e-9, await eqm(4));
  return { W, H, x0, x1, y0, y1, figH, borda, topo: topo / figW, D };
}

const falhas = [];
const medidas = {};
for (const id of ids) {
  const v = await carrega(id, 'vitoria'), d = await carrega(id, 'derrota');
  if (!v.equals(d)) falhas.push(`${id}: R1 par — derrota difere da vitória (${v.length} × ${d.length} bytes)`);
  for (const [pose, buf] of [['vitoria', v], ...(v.equals(d) ? [] : [['derrota', d]])]) {
    const m = await mede(buf);
    medidas[`${id}-${pose}`] = m;
    if (m.borda) falhas.push(`${id}-${pose}: R2 corte — ${m.borda} px de figura na borda do quadro`);
    if (m.topo >= LIMIAR_TOPO) falhas.push(`${id}-${pose}: R2 corte — topo reto (${(m.topo * 100).toFixed(0)}% da largura na 1ª faixa)`);
    if (m.D > LIMIAR_D) falhas.push(`${id}-${pose}: R3 nitidez — D=${m.D.toFixed(2)} > ${LIMIAR_D} (arte ampliada)`);
  }
}

let telaFalhas = 0;
if (TELA) telaFalhas = await mede_tela();

const ok = falhas.length === 0 && telaFalhas === 0;
for (const f of falhas) console.log(`✗ ${f}`);
console.log(`${ok ? 'VERDE' : 'VERMELHA'} resultado-arte: ${ids.length} personagens, ${falhas.length} falha(s) de arquivo${TELA ? `, ${telaFalhas} de tela` : ''}`);
if (MUT) {
  if (ok) { console.error(`MUTANTE ${MUT} PASSOU: a régua não mede o que diz`); process.exit(1); }
  console.log(`mutante ${MUT} reprovado, como devia`);
  process.exit(0);
}
process.exit(ok ? 0 : 1);

async function mede_tela() {
  const { execSync } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');
  
  const pw = await import('playwright')
  const chromium = pw.chromium || pw.default?.chromium;
  const BASE = process.env.BASE;
  if (!BASE) throw new Error('--tela pede BASE explícito');
  const VPS = [['desk', 1920, 1080, 1], ['dono-3:2', 1536, 1024, 2], ['dono-3:2@1', 1536, 1024, 1], ['hd', 1280, 720, 1], ['mob', 390, 844, 3]];
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--headless=new', '--mute-audio'] });
  let ruins = 0;
  for (const [nome, w, h, dpr] of VPS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?tela=vitoria&time=E&char=mst`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => !document.getElementById('match-end')?.classList.contains('hidden'), null, { timeout: 60000 });
    const dens = [], divida = [];
    let semArte = 0;
    for (const id of ids) {
      const m = medidas[`${id}-vitoria`];
      const g = await page.evaluate(async ({ id, m }) => {
        const hero = document.getElementById('me-hero');
        const url = `/img/resultado/${id}-vitoria.webp`;
        hero.style.setProperty('--me-art', `url("${url}")`);
        const img = new Image(); img.src = url; await img.decode();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const cs = getComputedStyle(hero), r = hero.getBoundingClientRect();
        if (cs.display === 'none' || !r.width || !r.height) return null;
        if (cs.backgroundSize !== 'contain') return { erro: `background-size ${cs.backgroundSize}` };
        const s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        const [px, py] = cs.backgroundPosition.split(' ');
        const pos = (v, livre) => (v.endsWith('%') ? livre * parseFloat(v) / 100 : parseFloat(v));
        const ix = r.left + pos(px, r.width - dw), iy = r.top + pos(py || '50%', r.height - dh);
        return { t: iy + m.y0 * s, b: iy + (m.y1 + 1) * s, l: ix + m.x0 * s, r: ix + (m.x1 + 1) * s, vh: innerHeight, vw: innerWidth, dpr: devicePixelRatio };
      }, { id, m });
      if (!g) { semArte++; continue; }
      if (g.erro) { console.log(`✗ ${nome} ${id}: ${g.erro}`); ruins++; continue; }
      const margem = 0.01 * g.vh;
      if (g.t < margem || g.b > g.vh - margem || g.l < 0 || g.r > g.vw) { console.log(`✗ ${nome} ${id}: figura fora do quadro t=${g.t.toFixed(0)} b=${g.b.toFixed(0)} vh=${g.vh}`); ruins++; }
      const efetivo = m.figH * (m.D > LIMIAR_D ? 0.5 : 1);
      const d = efetivo / ((g.b - g.t) * g.dpr);
      dens.push(d);
      if (d < 1) (g.dpr > 1 ? divida : (ruins++, console.log(`✗ ${nome} ${id}: densidade ${d.toFixed(2)} < 1 a DPR ${g.dpr}`), [])).push(id);
    }
    const min = dens.length ? Math.min(...dens).toFixed(2) : '-';
    console.log(`· ${nome} ${w}×${h}@${dpr}: ${dens.length} com arte, ${semArte} sem arte (CSS esconde), densidade mín ${min}${divida.length ? `, DÍVIDA DPR>1 em ${divida.length}` : ''}`);
    await ctx.close();
  }
  await browser.close();
  return ruins;
}
