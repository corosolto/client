/* build-brasoes.mjs — NORMALIZA OS BRASÕES DAS 5 FACÇÕES PARA A CAIXA DA BANDEIRA.
   ═══════════════════════════════════════════════════════════════════════════════════
   O QUE ESTA FERRAMENTA RESOLVE

   Os 4 emblemas que já existiam (`public/img/symbols/{p,b,u,c}.png`) têm três defeitos
   que só aparecem quando se mede:

     1. PESO. 768×512 e ~900 KB CADA (3,58 MB somados) para serem desenhados numa caixa
        de ~250 px no pano da bandeira. É textura de herói servida como selo.
     2. ENQUADRAMENTO SOLTO. A caixa de conteúdo (alfa > 8) de cada um cai em lugar
        diferente do quadro — p: 167..669 × 31..511, b: 192..644 × 0..444, u: 125..608 ×
        0..436, c: 128..606 × 39..511. Desenhados "centrados no quadro", eles saem
        DESALINHADOS entre si na bandeira, e um fica maior que o outro sem motivo.
     3. FALTAVA O QUINTO. Os funkeiros nunca tiveram emblema — `_loadCtfSymbols()` em
        `game.js` só carrega P, B, U e C.

   Aqui cada brasão é recortado na sua PRÓPRIA caixa de conteúdo e reassentado no centro
   de um quadrado, com margem igual. Depois disso "desenhar centrado" passa a significar
   a mesma coisa para os cinco.

   ── O FUNDO SAI POR ALASTRAMENTO DA BORDA, NÃO POR COLOR-KEY ─────────────────────
   O brasão dos funkeiros nasce do gerador de imagem com fundo chapado, e a paleta dele
   é preto + ouro. Um color-key global ("tudo que for preto vira transparente") comeria
   o PRETO DE DENTRO do emblema — que é justamente a massa escura que faz ele ser legível
   sobre a bandeira DOURADA dos funkeiros. Então o fundo é achado por alastramento a
   partir da BORDA do quadro: só o preto conectado ao lado de fora cai.

   USO
     node tools/build-brasoes.mjs                                   # p, b, u, c
     node tools/build-brasoes.mjs --fac=f --src=/tmp/.../v2.png     # funkeiros
     node tools/build-brasoes.mjs --lado=256                        # muda o lado
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const LADO = parseInt(val('lado', '256'), 10);
const MARGEM = parseFloat(val('margem', '0.04'));   // fração do lado, em cada borda
const OUT = val('out', 'public/img/brasoes');
const FAC = val('fac');
const SRC = val('src');

/* Fundo = componente conexa que ENCOSTA na borda e é parecida com o pixel de canto.
   Ver docstring: color-key global comeria o preto interno do emblema. */
function alastraFundo(data, W, H, tol = 60) {
  const seed = [data[0], data[1], data[2]];
  const bg = new Uint8Array(W * H);
  const visto = new Uint8Array(W * H);
  const fila = new Int32Array(W * H);
  let ini = 0, fim = 0;
  const push = (i) => { if (!visto[i]) { visto[i] = 1; fila[fim++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (ini < fim) {
    const i = fila[ini++], o = i * 4;
    const d = Math.abs(data[o] - seed[0]) + Math.abs(data[o + 1] - seed[1]) + Math.abs(data[o + 2] - seed[2]);
    if (d > tol) continue;
    bg[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  return bg;
}

async function constroi(fac, src) {
  const raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = raw.info;
  const d = new Uint8ClampedArray(raw.data);

  // Se a fonte já é recortada (alfa útil < 95 % do quadro) confia no alfa dela;
  // senão é PNG opaco vindo do gerador -> alastra da borda.
  let opacos = 0;
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 8) opacos++;
  const precisaKey = opacos / (W * H) > 0.95;
  if (precisaKey) {
    const bg = alastraFundo(d, W, H);
    for (let i = 0; i < W * H; i++) if (bg[i]) d[i * 4 + 3] = 0;
  }

  // caixa de conteúdo -> recorte -> quadrado com margem igual (ver defeito 2)
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error(`${fac}: nada opaco em ${src}`);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const util = Math.round(LADO * (1 - 2 * MARGEM));
  const esc = util / Math.max(cw, ch);
  const nw = Math.max(1, Math.round(cw * esc)), nh = Math.max(1, Math.round(ch * esc));

  const recorte = await sharp(Buffer.from(d.buffer), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .resize(nw, nh, { fit: 'fill', kernel: 'lanczos3' })
    .png().toBuffer();

  const destino = path.join(OUT, `${fac}.png`);
  fs.mkdirSync(OUT, { recursive: true });
  await sharp({ create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recorte, left: Math.round((LADO - nw) / 2), top: Math.round((LADO - nh) / 2) }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(destino);

  const antes = fs.statSync(src).size, depois = fs.statSync(destino).size;
  console.log(`  ${fac}.png  ${W}×${H} ${(antes / 1024).toFixed(0)} KB  ->  ${LADO}×${LADO} ${(depois / 1024).toFixed(1)} KB`
    + `  (−${(100 * (1 - depois / antes)).toFixed(1)} %)${precisaKey ? '  [fundo alastrado da borda]' : ''}`);
  return depois;
}

const alvos = FAC
  ? [[FAC, SRC || `public/img/symbols/${FAC}.png`]]
  : [['p', 'public/img/symbols/p.png'], ['b', 'public/img/symbols/b.png'],
     ['u', 'public/img/symbols/u.png'], ['c', 'public/img/symbols/c.png']];

console.log(`brasões -> ${OUT}/  (lado ${LADO}, margem ${(MARGEM * 100).toFixed(0)} %)`);
let total = 0;
for (const [fac, src] of alvos) {
  if (!fs.existsSync(src)) { console.error(`  ${fac}: fonte não existe: ${src}`); process.exitCode = 1; continue; }
  total += await constroi(fac, src);
}
console.log(`total desta passada: ${(total / 1024).toFixed(1)} KB`);
