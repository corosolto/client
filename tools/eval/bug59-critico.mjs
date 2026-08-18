/* bug59-critico.mjs — crítico adversarial NUMÉRICO do lote BUG-59.
   Não lê os logs dos geradores: re-deriva cada fato do arquivo final, com as
   MESMAS funções que o redesign-check.mjs usa (metaWebm/metaWebpAlpha/alphaBounds,
   cópias literais). O que este script não cobre — leitura visual ("parece o
   Brasil?", reconhecível à distância) — tem que ser feita por quem enxerga,
   com as pranchas de asset-evidence/bug59/. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const NOVOS = [
  'bandeirante', 'boto', 'camera-roxa', 'cuca', 'curupira', 'designer-ux',
  'doidinho-bairro', 'gilbomes', 'lampiao', 'lenda-lanhouse', 'lobisomem',
  'mariabonita', 'microfonildo', 'motoca-cachorro-loko', 'profeta-calcada',
  'programador-virado', 'saci', 'zumbi',
];
let falhas = 0;
const reprova = (msg) => { falhas++; console.error(`✗ ${msg}`); };
const aprova = (msg) => console.log(`✓ ${msg}`);

/* — cópias literais das funções do redesign-check.mjs — */
function bytesDepois(buf, id) {
  for (let pos = 0; pos <= buf.length - id.length - 2; pos++) {
    if (!id.every((byte, i) => buf[pos + i] === byte)) continue;
    const primeiro = buf[pos + id.length];
    let largura = 1;
    while (largura <= 8 && !(primeiro & (0x80 >> (largura - 1)))) largura++;
    if (largura > 8 || pos + id.length + largura >= buf.length) continue;
    let tamanho = primeiro & (0xff >> largura);
    for (let i = 1; i < largura; i++) tamanho = tamanho * 256 + buf[pos + id.length + i];
    const inicio = pos + id.length + largura;
    if (tamanho < 1 || tamanho > 8 || inicio + tamanho > buf.length) continue;
    let valor = 0;
    for (let i = 0; i < tamanho; i++) valor = valor * 256 + buf[inicio + i];
    if (valor > 0 && valor < 8192) return valor;
  }
  return null;
}
function metaWebm(rel) {
  const buf = readFileSync(join(ROOT, rel)).subarray(0, 131072);
  return { webm: buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), vp9: buf.includes(Buffer.from('V_VP9')), width: bytesDepois(buf, [0xb0]), height: bytesDepois(buf, [0xba]) };
}
function metaWebpAlpha(buf) {
  const chunk = buf.indexOf(Buffer.from('VP8X'));
  if (chunk < 0 || chunk + 18 > buf.length) return { alpha: false, width: null, height: null };
  const byte24 = (offset) => buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
  return { alpha: Boolean(buf[chunk + 8] & 0x10) && buf.includes(Buffer.from('ALPH')), width: byte24(chunk + 12) + 1, height: byte24(chunk + 15) + 1 };
}
async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = new Uint32Array(info.width), rows = new Uint32Array(info.height);
  let total = 0;
  for (let y = 0, p = 3; y < info.height; y++) for (let x = 0; x < info.width; x++, p += info.channels) {
    if (data[p] <= 8) continue;
    cols[x]++; rows[y]++; total++;
  }
  const quantile = (hist, q) => { const target = total * q; let acc = 0; for (let i = 0; i < hist.length; i++) { acc += hist[i]; if (acc >= target) return i; } return hist.length - 1; };
  const left = quantile(cols, .002), right = quantile(cols, .998), top = quantile(rows, .002), bottom = quantile(rows, .998);
  return { width: info.width, height: info.height, total, left: left / info.width, right: (info.width - 1 - right) / info.width, top: top / info.height, bottom: (info.height - 1 - bottom) / info.height };
}

/* 1 · inventário exato: nomes esperados × disco, para o elenco inteiro (UIA1 lê
      o diretório inteiro, não só os novos). */
const chars = readFileSync(join(ROOT, 'public/js/characters.js'), 'utf8');
const bloco = chars.match(/export const CHARACTERS = \[([\s\S]*?)\n\];\nexport const byId/);
const ids = [...bloco[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]).sort();
const esperado = {
  avatar: ids.map((id) => `${id}.webp`),
  selecao: ids.map((id) => `${id}.webm`),
  resultado: ids.flatMap((id) => [`${id}-derrota.webp`, `${id}-vitoria.webp`]).sort(),
};
const iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const leDir = (dir, re) => readdirSync(join(ROOT, dir)).filter((f) => re.test(f)).sort();
for (const [nome, dir, re] of [['avatar', 'public/img/chars/avatars', /\.webp$/], ['seleção', 'public/video/chars', /\.webm$/], ['resultado', 'public/img/resultado', /-(derrota|vitoria)\.webp$/]]) {
  const noDisco = leDir(dir, re);
  const falta = esperado[nome === 'avatar' ? 'avatar' : nome === 'seleção' ? 'selecao' : 'resultado'].filter((f) => !noDisco.includes(f));
  const sobra = noDisco.filter((f) => !esperado[nome === 'avatar' ? 'avatar' : nome === 'seleção' ? 'selecao' : 'resultado'].includes(f));
  if (!falta.length && !sobra.length) aprova(`inventário ${nome}: ${noDisco.length} arquivos exatos`);
  else reprova(`inventário ${nome}: faltam ${falta.join(',')} || sobram ${sobra.join(',')}`);
}

/* 2 · cada vídeo novo: WebM VP9 no quadro nativo (UIA2). */
let videosOk = 0;
for (const id of NOVOS) {
  for (const [rel, w, h] of [
    [`public/video/chars/${id}.webm`, 640, 854],
    [`public/video/resultado/${id}-vitoria.webm`, 640, 640],
    [`public/video/resultado/${id}-derrota.webm`, 640, 640],
  ]) {
    if (!existsSync(join(ROOT, rel))) { reprova(`${rel} ausente`); continue; }
    const m = metaWebm(rel);
    if (m.webm && m.vp9 && m.width === w && m.height === h) videosOk++;
    else reprova(`${rel}: webm=${m.webm} vp9=${m.vp9} ${m.width}x${m.height} (esperado ${w}x${h})`);
  }
}
if (videosOk === NOVOS.length * 3) aprova(`${videosOk}/${NOVOS.length * 3} vídeos novos WebM VP9 no quadro nativo`);

/* 3 · cada arte nova: 1024×1536, alpha VP8X+ALPH, margens UIA19, par idêntico. */
let artesOk = 0;
for (const id of NOVOS) {
  const vit = `public/img/resultado/${id}-vitoria.webp`;
  const der = `public/img/resultado/${id}-derrota.webp`;
  if (!existsSync(join(ROOT, vit)) || !existsSync(join(ROOT, der))) { reprova(`${id}: arte ausente`); continue; }
  const buf = readFileSync(join(ROOT, vit));
  const meta = metaWebpAlpha(buf);
  const b = await alphaBounds(buf);
  const uso = 1 - b.top - b.bottom;
  const identicos = createHash('sha256').update(buf).digest('hex') === createHash('sha256').update(readFileSync(join(ROOT, der))).digest('hex');
  const dentro = meta.alpha && meta.width === 1024 && meta.height === 1536
    && b.total >= 1024 * 1536 * .01
    && b.top >= .015 && b.top <= .20 && b.bottom >= .015 && b.bottom <= .20
    && b.right >= .015 && b.right <= .08 && b.left >= .015 && b.left <= .65
    && uso >= .72;
  if (dentro && identicos) artesOk++;
  else reprova(`${id}: alpha=${meta.alpha} ${meta.width}x${meta.height} t/b/l/r=${[b.top, b.bottom, b.left, b.right].map((v) => v.toFixed(3)).join('/')} uso=${uso.toFixed(3)} parIdêntico=${identicos}`);
}
if (artesOk === NOVOS.length) aprova(`${artesOk}/${NOVOS.length} artes novas nos limites UIA19, pares idênticos`);

/* 4 · avatares novos: 256×256, opacos (convenção do lote de 44, medido). */
let avOk = 0;
for (const id of NOVOS) {
  const f = join(ROOT, `public/img/chars/avatars/${id}.webp`);
  if (!existsSync(f)) { reprova(`avatar ${id} ausente`); continue; }
  const m = await sharp(f).metadata();
  if (m.width === 256 && m.height === 256 && !m.hasAlpha) avOk++;
  else reprova(`avatar ${id}: ${m.width}x${m.height} alpha=${m.hasAlpha}`);
}
if (avOk === NOVOS.length) aprova(`${avOk}/${NOVOS.length} avatares 256×256 opacos`);

/* 5 · avatares pinados INTACTOS (UIA28). */
for (const [id, sha] of [['punk', 'cb642e6968b6d45e07425874cf8827a407bd464d0f29ae1b7ac51010e39841e3'], ['gotinha', '1743f2dff0ccd39a3f7be9ee1fde376694cf75cd1a5ad08c54fc2cd87cf637a3']]) {
  const h = createHash('sha256').update(readFileSync(join(ROOT, `public/img/chars/avatars/${id}.webp`))).digest('hex');
  if (h === sha) aprova(`avatar ${id} pinado intacto`);
  else reprova(`avatar ${id} MUDOU: ${h}`);
}

console.log(falhas ? `\nCRÍTICO: ${falhas} reprovações` : '\nCRÍTICO NUMÉRICO: sem reprovações (a leitura visual falta — ver cabeçalho)');
process.exit(falhas ? 1 : 0);
