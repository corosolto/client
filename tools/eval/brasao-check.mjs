/* brasao-check.mjs — A RÉGUA DAS BANDEIRAS DE FACÇÃO.
   ═══════════════════════════════════════════════════════════════════════════════════
   O QUE ELA MEDE, E POR QUE CADA MEDIDA EXISTE

   Bandeira é vista DE LONGE. Aprovar um brasão olhando ele a 512 px é o mesmo erro que
   aprovar tipografia no zoom de 400 % — está escrito na docstring do
   `canarinho-icon.mjs` ("o que decide o resultado: 16 pixels"). Então tudo aqui é medido
   no tamanho em que a coisa é SERVIDA, e a folha de contato mostra 256 e 64 lado a lado.

     C1 · CONTRASTE DE WEBER do brasão contra a cor do time, a 64 px.
          |L_brasão − L_fundo| / L_fundo >= 0,25 — o mesmo teto que o canarinho usa.
          O caso perigoso não é teórico: os funkeiros são OURO e o emblema deles é
          ouro-e-preto. Sem medida, "emblema dourado em bandeira dourada" passa.

     C2 · DISTINÇÃO ENTRE AS CINCO, a 64 px. Bandeira serve para saber DE QUEM É o ponto
          do outro lado do mapa. Cinco emblemas lindos e indistinguíveis a 64 px são
          cinco emblemas inúteis. Mede-se a distância média por pixel entre cada par.

     C3 · A BANDEIRA PINTA A COR DA ORIGEM. Havia aqui um espelho: `brasoes.js` declarava
          `COR_TIME` copiando `_teamColor()` de `game.js`, e esta cláusula extraía o hex
          do TEXTO do `game.js` para comparar as duas cópias. O espelho acabou — a cor de
          facção nasce em `public/js/paleta.js` e os três consumidores importam de lá —,
          então o C3 deixou de garimpar fonte e passa a importar a origem. O que ele mede
          continua valendo e é o que interessa ao jogador: a cor que a BANDEIRA de fato
          pinta é a da facção. Quem impede o espelho de voltar é o F2 do
          `faccao-paleta-check.mjs`, que é node puro e roda no `check:fast`.

   ── A MUTAÇÃO QUE DEIXA A RÉGUA VERMELHA ────────────────────────────────────────
   Régua que nunca falhou não é régua, é decoração. As duas mutações abaixo são o teste
   da própria régua, e ambas foram executadas:

     --mutar=sem-brasao   não desenha o emblema  -> C1 desaba (só pano contra pano)
     --mutar=cor-errada   pinta F com a cor de U -> C3 acusa a divergência de paleta

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/brasao-check.mjs                     # mede + grava a folha
     node tools/eval/brasao-check.mjs --mutar=sem-brasao  # prova que a régua fecha
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTAR = val('mutar', '');
const OUT = val('out', 'tools/eval/out');

const FACS = ['E', 'B', 'U', 'C', 'F'];
/* `E` e não `P`: terceira ocorrência do mesmo rename esquecido no mesmo arquivo — aqui ele
   não dava número errado, dava CRASH (`NOME[it.f].padEnd` de undefined) depois do C3. */
const NOME = { E: 'TIME E', B: 'TIME B', U: 'TRIBOS URBANAS', C: 'PALHAÇOS', F: 'FUNKEIROS' };
const WEBER_MIN = 0.25;      // mesmo teto do canarinho
const DIST_MIN = 14;         // distância média por pixel entre duas bandeiras a 64 px

/* ── C3: a paleta de ORIGEM, agora importada em vez de garimpada no texto ──────────
   Esta função lia o corpo de `_teamColor` com um regex sobre 900 caracteres de
   `game.js`. Isso já tinha custado uma cegueira própria (a lista `[PBUCF]` dentro do
   regex envelheceu no rename Time E e o C3 passou a comparar vazio com vazio para a
   facção do jogador), e o comentário antigo justificava o garimpo assim: *"`_teamColor`
   é método de instância, então não há import possível"*.

   Isso deixou de ser verdade. O que é de instância é QUAL facção está de cada lado; a
   cor de cada facção mora em `public/js/paleta.js` e é importável. `_teamColor` hoje só
   escolhe entre `ESPELHO` e `tons(facção)` — não há mais hex nenhum para garimpar.

   Com import não existe regex para envelhecer. Quem garante que `game.js` de fato usa
   esta origem é o F2 do `faccao-paleta-check.mjs` (nenhum espelho novo), que é node puro
   e roda no `check:fast`; aqui o C3 volta ao que sempre quis ser — o export do
   `brasoes.js` bate com a origem. */
async function paletaDaOrigem() {
  const { PALETA } = await import(pathToFileURL(path.resolve('public/js/paleta.js')).href);
  return Object.fromEntries(Object.entries(PALETA).map(([f, t]) => [f, t.base]));
}

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1200);

/* Roda o MÓDULO DE VERDADE (`public/js/brasoes.js`) no navegador — não uma reimplementação
   dele aqui. Se o módulo quebrar, a régua quebra junto, que é o ponto. */
const dados = await page.evaluate(async ({ facs, mutar }) => {
  const B = await import('./js/brasoes.js');
  const esperaImg = (src) => new Promise((res) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  });
  const out = { cores: B.CORES_BANDEIRA, itens: [], nulo: B.bandeiraTextura('ZZ') === null };
  for (const f of facs) {
    // garante o PNG carregado ANTES de ler o canvas (a textura repinta no onload)
    const bras = await esperaImg(`img/brasoes/${f.toLowerCase()}.png`);
    const tex = B.bandeiraTextura(f);
    if (!tex) { out.itens.push({ f, erro: 'bandeiraTextura devolveu null' }); continue; }
    await new Promise((r) => setTimeout(r, 60));
    const cv = tex.image;

    /* MUTAÇÃO sem-brasao: repinta só o pano por cima, apagando o emblema. É a prova de
       que C1 realmente enxerga o emblema e não algum artefato do pano. */
    if (mutar === 'sem-brasao') {
      const x = cv.getContext('2d');
      x.fillStyle = B.CORES_BANDEIRA[f]; x.fillRect(0, 0, cv.width, cv.height);
    }

    /* Máscara do emblema: o MESMO PNG desenhado no MESMO retângulo que o módulo usa
       (0,74 da altura, centro em 0,5125). O alfa dele diz quais pixels do pano são
       brasão e quais são fundo — sem precisar de acesso ao interno do módulo. */
    const W = cv.width, H = cv.height;
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
    const mx = mc.getContext('2d');
    if (bras) {
      const h = H * 0.74, w = h * (bras.naturalWidth / bras.naturalHeight || 1);
      mx.drawImage(bras, W / 2 - w / 2, H * 0.5125 - h / 2, w, h);
    }
    out.itens.push({
      f,
      flag: cv.toDataURL('image/png'),
      mask: mc.toDataURL('image/png'),
      cor: B.CORES_BANDEIRA[f],
    });
  }
  return out;
}, { facs: FACS, mutar: MUTAR });

await browser.close();

const buf = (u) => Buffer.from(u.split(',')[1], 'base64');
/* MESMA definição de `tools/eval/header-bird-check.mjs:81-82` — luma de vídeo e MEDIANA,
   não média. A diferença não é estilo: a primeira versão desta régua usou a MÉDIA sobre
   todos os pixels do emblema e reprovou as cinco bandeiras com Weber ~0,03. O motivo é
   aritmético e vale registrar — um emblema de duas tintas (preto + ouro) tem média de
   luminância NO MEIO DA ESCALA, que é exatamente onde a média do pano também cai. A
   média mede "quanto o emblema é claro", e o que decide se a forma se lê é "quanto a
   MASSA dele se separa do que está atrás". Mediana + moldura local é a resposta que a
   casa já tinha. */
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mediana = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

fs.mkdirSync(OUT, { recursive: true });
console.log(`RÉGUA DAS BANDEIRAS${MUTAR ? `  [MUTAÇÃO: ${MUTAR}]` : ''}\n`);

/* ── C3 ─────────────────────────────────────────────────────────────────────────── */
const doJogo = await paletaDaOrigem();
let c3 = true;
console.log('C3 · o que a bandeira pinta bate com a origem (brasoes.js  vs  paleta.js)');
for (const f of FACS) {
  let meu = (dados.cores[f] || '').toLowerCase();
  if (MUTAR === 'cor-errada' && f === 'F') meu = '#4aa3ff';
  const dele = (doJogo[f] || '').toLowerCase();
  const ok = meu === dele && !!dele;
  if (!ok) c3 = false;
  console.log(`   ${f}  bandeira ${meu || '—'}   origem ${dele || '—'}   ${ok ? 'ok' : 'DIVERGE'}`);
}
console.log(`   ${c3 ? 'PASSA' : 'FALHA'}\n`);

/* ── C1 + preparo das miniaturas ──────────────────────────────────────────────────── */
const PX = 64;
const mini = {};
let c1 = true;
console.log(`C1 · contraste de Weber do brasão contra a cor do time, a ${PX} px  (min ${WEBER_MIN})`);
for (const it of dados.itens) {
  if (it.erro) { console.log(`   ${it.f}  ${it.erro}`); c1 = false; continue; }
  /* `removeAlpha()` não é detalhe: o canvas devolve PNG RGBA, e `.raw()` sem isso entrega
     4 CANAIS. A primeira versão indexava `flag[i*3]` e lia pixels embaralhados — foi o que
     produziu Weber ~0,03 para as cinco bandeiras e quase me fez "consertar" uma arte que
     estava certa. Número que discorda do olho é suspeito de bug antes de ser veredito. */
  const flag = await sharp(buf(it.flag)).resize(PX, PX, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const mask = await sharp(buf(it.mask)).resize(PX, PX, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  mini[it.f] = flag;
  /* Máscara do emblema e MOLDURA LOCAL de 2 px em volta dela — o pano em que o brasão
     ENCOSTA, com ondulação e sujeira incluídas, não uma cor de fundo idealizada. */
  const N = PX * PX;
  const emb = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (mask[i * 4 + 3] > 140) emb[i] = 1;
  const ring = new Uint8Array(N);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const i = y * PX + x;
    if (emb[i]) continue;
    let perto = false;
    for (let dy = -2; dy <= 2 && !perto; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= PX || ny >= PX) continue;
      if (emb[ny * PX + nx]) { perto = true; break; }
    }
    if (perto) ring[i] = 1;
  }
  const lumaDe = (sel) => { const o = []; for (let i = 0; i < N; i++) if (sel[i]) o.push(luma(flag[i * 3], flag[i * 3 + 1], flag[i * 3 + 2])); return o; };
  const Lf = mediana(lumaDe(emb)), Lb = mediana(lumaDe(ring));
  const weber = Lb > 0 ? Math.abs(Lf - Lb) / Lb : 0;
  /* Diagnóstico, não portão: quanto da ÁREA do emblema realmente se separa. Uma mediana
     boa com área separada pequena seria um emblema com um detalhe forte e o resto sumido. */
  const lf = lumaDe(emb);
  const sep = lf.filter((v) => Math.abs(v - Lb) / (Lb || 1) >= WEBER_MIN).length / (lf.length || 1);
  const ok = weber >= WEBER_MIN;
  if (!ok) c1 = false;
  console.log(`   ${it.f} ${NOME[it.f].padEnd(15)} fundo ${it.cor}  luma brasão ${Lf.toFixed(1).padStart(5)}  moldura ${Lb.toFixed(1).padStart(5)}`
    + `  Weber ${weber.toFixed(3)}  área separada ${(sep * 100).toFixed(0)} %  ${ok ? 'ok' : 'ABAIXO'}`);
}
console.log(`   ${c1 ? 'PASSA' : 'FALHA'}\n`);

/* ── C2 ─────────────────────────────────────────────────────────────────────────── */
let c2 = true, pior = { d: 1e9, par: '' };
console.log(`C2 · distinção entre as cinco a ${PX} px  (distância média por pixel, min ${DIST_MIN})`);
for (let i = 0; i < FACS.length; i++) for (let j = i + 1; j < FACS.length; j++) {
  const a = mini[FACS[i]], b = mini[FACS[j]];
  if (!a || !b) { c2 = false; continue; }
  let s = 0;
  for (let k = 0; k < PX * PX * 3; k++) s += Math.abs(a[k] - b[k]);
  const d = s / (PX * PX * 3);
  if (d < pior.d) pior = { d, par: `${FACS[i]}×${FACS[j]}` };
  if (d < DIST_MIN) { c2 = false; console.log(`   ${FACS[i]}×${FACS[j]}  ${d.toFixed(1)}  PARECIDAS DEMAIS`); }
}
console.log(`   pior par: ${pior.par} = ${pior.d.toFixed(1)}`);
console.log(`   ${c2 ? 'PASSA' : 'FALHA'}\n`);

/* ── C4: o contrato ─────────────────────────────────────────────────────────────── */
const c4 = dados.nulo === true;
console.log(`C4 · contrato: bandeiraTextura('ZZ') === null  ->  ${dados.nulo}  ${c4 ? 'PASSA' : 'FALHA'}\n`);

/* ── FOLHA DE CONTATO: 256 e 64 lado a lado, que é o ponto todo ─────────────────── */
const G = 256, m = 12, rot = 26;
const linha = G + m + PX * 2 + m * 2;
const sheetW = m + FACS.length * (G + m + PX * 2 + m) + m;
const partes = [];
let px0 = m;
for (const f of FACS) {
  const it = dados.itens.find((d) => d.f === f);
  if (!it || it.erro) continue;
  partes.push({ input: await sharp(buf(it.flag)).resize(G, Math.round(G * 320 / 512)).png().toBuffer(), left: px0, top: m + rot });
  partes.push({
    input: await sharp(buf(it.flag)).resize(PX, Math.round(PX * 320 / 512))
      .resize(PX * 2, Math.round(PX * 320 / 512) * 2, { kernel: 'nearest' }).png().toBuffer(),
    left: px0 + G + m, top: m + rot,
  });
  px0 += G + m + PX * 2 + m;
}
const sheetH = m + rot + Math.round(G * 320 / 512) + m;
const svg = `<svg width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" fill="#1b1b1f"/>` +
  FACS.map((f, i) => `<text x="${m + i * (G + m + PX * 2 + m)}" y="${m + 16}" fill="#e8e6e2" font-family="sans-serif" font-size="15">${NOME[f]} · 256 px | 64 px</text>`).join('') +
  `</svg>`;
const folha = path.join(OUT, `brasao-folha${MUTAR ? `-${MUTAR}` : ''}.png`);
await sharp(Buffer.from(svg)).composite(partes).png().toFile(folha);
console.log(`folha de contato: ${folha}  (${(fs.statSync(folha).size / 1024).toFixed(0)} KB)`);

/* ── PESO ────────────────────────────────────────────────────────────────────────── */
let total = 0;
console.log('\npeso dos brasões publicados:');
for (const f of FACS) {
  const p = `public/img/brasoes/${f.toLowerCase()}.png`;
  if (!fs.existsSync(p)) { console.log(`   ${f}  AUSENTE`); continue; }
  const s = fs.statSync(p).size; total += s;
  console.log(`   ${f}  ${(s / 1024).toFixed(1)} KB`);
}
console.log(`   total ${(total / 1024).toFixed(1)} KB`);

const passou = c1 && c2 && c3 && c4;
console.log(`\n${passou ? 'VERDE — as cinco bandeiras passam.' : 'VERMELHO — ver os critérios acima.'}`);
process.exit(passou ? 0 : 1);
