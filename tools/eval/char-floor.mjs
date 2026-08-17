#!/usr/bin/env node
/* ============================================================================
   char-floor.mjs — C10: O PISO DE ALBEDO ESTÁ ESMAGANDO O CONTRASTE INTERNO?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O C9 (char-color.mjs) provou que a diferença de cor ENTRE personagens nasce na
   textura do GLB, e mediu spread de 22× em saturação. O que ele NÃO conseguia
   ver — porque só olha o arquivo — é o que o SHADER faz com essa textura.

   `characters.js` injeta, logo depois de <map_fragment>:

       float csMx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
       diffuseColor.rgb *= max(1.0, csAlbMin / max(csMx, 1e-4));       // albMin = 0.09

   Isso é um DEGRAU: todo texel cujo canal máximo LINEAR está abaixo de 0,09 sai
   com canal máximo EXATAMENTE 0,09. E 0,09 linear = **sRGB 0,332 = byte 85 =
   L\* 36** — não é "levantar o preto", é um CINZA MÉDIO. Num personagem cuja
   textura inteira vive abaixo desse ponto (trapfunk: luminância mediana sRGB
   0,139 = byte 35) o degrau achata a textura INTEIRA num único valor. O dono
   chama isso de "liso, cor chapada, parece manequim".

   O TETO NÃO É ARBITRÁRIO — É O CONTRATO QUE O PRÓPRIO CÓDIGO DECLARA.
   O comentário do bloco em characters.js diz, literalmente:
     "REGRA DESTE BLOCO: só operações que preservam matiz e saturação relativa.
      Nada aqui pode 'levantar o preto' — foi esse o erro da R2."
   Esta régua mede exatamente essa promessa. O piso pode LEVANTAR o nível (é para
   isso que ele existe, C1/BAR §2.1); ele não pode COMER o contraste interno do
   personagem. Teto: perda de contraste ≤ 10 % em todo o elenco.

   O QUE MEDE, por personagem, sobre a textura de cor base real do GLB:
     • pEsmag   — % dos texels opacos que caem abaixo do piso (o degrau os toca)
     • sdAntes  — desvio-padrão de L* do albedo cru (contraste interno)
     • sdDepois — o mesmo depois do piso
     • perda    — 1 - sdDepois/sdAntes   ← É ESTE O NÚMERO DO TETO
     • L50      — mediana de L* antes -> depois (prova que o piso continua levantando)

   MODOS (o A/B da correção, mesma matemática dos dois lados):
     --modo=degrau     piso por texel   V' = max(V, m)              (o que está no jogo hoje)
     --modo=regional   piso na BANDA BAIXA V' = V * max(1, m/Vlo)   (a correção)
   Vlo é a média regional da textura (mip alto), que é o que o shader lê com
   textureLod(map, vMapUv, csAlbLod). Como o ganho é o MESMO para todos os texels
   de uma região, toda razão entre texels é preservada por construção: o piso
   levanta o NÍVEL sem tocar no contraste. Acima do piso o ganho é 1,0 exato —
   personagem claro/saturado não é tocado por uma instrução sequer.

   uso: node tools/eval/char-floor.mjs [--modo=degrau|regional|ambos] [--json]
        node tools/eval/char-floor.mjs --mutante=<nome>     (teste de mutação)
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readGLB } from './tp-mount-probe.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const CHARDIR = path.join(ROOT, 'public/models/characters');
const TMP = fs.mkdtempSync('/tmp/charfloor-');

// Sem ImageMagick 7 (CI de fork PR sem `magick`): não há veredito, o invariants skipa CHR8.
// Sem este guard o execFileSync('magick') lança ENOENT e derruba o build inteiro.
try { execFileSync('magick', ['-version'], { stdio: 'ignore' }); }
catch { console.log('char-floor: magick indisponível — CHR8 fica skipado (ImageMagick 7 ausente neste ambiente).'); process.exit(0); }

const ARG = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const MUTANTE = ARG('mutante', '');
const PERDA_MAX = parseFloat(ARG('teto', '0.10'));

/* ── os dois números que vêm do jogo. Lidos do FONTE, não copiados à mão: se
   alguém mexer em characters.js sem mexer aqui, a régua passa a medir outro
   piso e o teto vira mentira (foi assim que a AUD1 pegou o portão mentindo). */
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/characters.js'), 'utf8');
const lerNum = (chave, padrao) => {
  const m = SRC.match(new RegExp(`_cnum\\('${chave}',\\s*([0-9.]+)\\)`));
  return m ? parseFloat(m[1]) : padrao;
};
// override só para varredura (--albmin=/--lod=); o padrão vem SEMPRE do fonte.
const ALB_MIN = parseFloat(ARG('albmin', String(lerNum('charalbmin', 0.09))));
const ALB_LOD = parseFloat(ARG('lod', String(lerNum('charalblod', 6))));
/* O MODO JULGADO É O QUE O JOGO FAZ, lido do fonte — não um padrão desta régua.
   Se alguém devolver o piso pro degrau (apagar a flag `albReg` ou trocar o padrão
   para '0'), a régua passa a julgar o degrau e a C10a fica VERMELHA sozinha. Sem
   este acoplamento a invariante mediria uma correção que não está mais no jogo —
   é o mesmo buraco que a AUD1 pegou no viewmodel. */
const REG_NO_JOGO = /albReg:\s*_cqp\.get\('charalbreg'\)\s*!==\s*'0'/.test(SRC);
const MODO = ARG('modo', REG_NO_JOGO ? 'regional' : 'degrau');

// ── cor ────────────────────────────────────────────────────────────────────
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const LUM = [0.2126, 0.7152, 0.0722];
const Lstar = (y) => (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y);

// textura de cor base do GLB -> arquivo em disco (mesma extração do C9)
function baseColorFile(id) {
  const g = readGLB(path.join(CHARDIR, `${id}.glb`));
  const mat = (g.json.materials || [])[0];
  const ti = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture
    ? mat.pbrMetallicRoughness.baseColorTexture.index : undefined;
  if (ti === undefined) return null;
  const tex = g.json.textures[ti];
  const si = tex.source !== undefined ? tex.source
    : (tex.extensions && tex.extensions.EXT_texture_webp ? tex.extensions.EXT_texture_webp.source : undefined);
  if (si === undefined) return null;
  const img = g.json.images[si];
  if (img.bufferView === undefined) return null;
  const bv = g.json.bufferViews[img.bufferView];
  const data = g.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const ext = (img.mimeType || '').includes('webp') ? 'webp' : (img.mimeType || '').includes('jpeg') ? 'jpg' : 'png';
  const out = path.join(TMP, `${id}.${ext}`);
  fs.writeFileSync(out, data);
  return out;
}

// rasteriza em N×N e devolve RGBA cru
function raster(file, n, tag) {
  const raw = path.join(TMP, `${tag}.rgba`);
  execFileSync('magick', [file, '-resize', `${n}x${n}!`, '-depth', '8', `rgba:${raw}`]);
  return fs.readFileSync(raw);
}

const N = 256;                                   // grade de medição
// LOD do shader é relativo à textura NATIVA (1024 ou 512). Aqui a grade é 256,
// então o bloco regional equivalente é 2^lod escalado pela razão nativa/256.
function ladoRegional(lado) {
  const texelsPorLado = Math.pow(2, ALB_LOD);    // ex.: lod 6 -> bloco de 64 texels nativos
  const blocosNoLado = Math.max(1, Math.round(lado / texelsPorLado));
  return Math.max(1, Math.min(N, blocosNoLado)); // ex.: 1024/64 = 16 -> grade regional 16×16
}

// aplica o piso e devolve estatística
function medir(buf, lo, loLado, modo) {
  const L = [], Lin = [];
  let esmag = 0, n = 0, tocados = 0;
  const passo = N / loLado;
  for (let i = 0, px = 0; i < buf.length; i += 4, px++) {
    if (buf[i + 3] < 128) continue;
    const r = s2l(buf[i] / 255), g = s2l(buf[i + 1] / 255), b = s2l(buf[i + 2] / 255);
    const v = Math.max(r, g, b);
    if (v < ALB_MIN) esmag++;
    let k;
    if (modo === 'nenhum') k = 1;
    else if (modo === 'degrau') k = Math.max(1, ALB_MIN / Math.max(v, 1e-4));
    else {
      const x = px % N, y = (px / N) | 0;
      const o = (((y / passo) | 0) * loLado + ((x / passo) | 0)) * 4;
      const vlo = Math.max(s2l(lo[o] / 255), s2l(lo[o + 1] / 255), s2l(lo[o + 2] / 255));
      k = Math.max(1, ALB_MIN / Math.max(vlo, 1e-4));
    }
    if (k > 1.02) tocados++;
    const y2 = (r * k) * LUM[0] + (g * k) * LUM[1] + (b * k) * LUM[2];
    L.push(Lstar(Math.min(1, y2))); Lin.push(y2); n++;
  }
  if (!n) return null;
  const mean = L.reduce((a, x) => a + x, 0) / n;
  const sd = Math.sqrt(L.reduce((a, x) => a + (x - mean) * (x - mean), 0) / n);
  const srt = L.slice().sort((a, b) => a - b);
  return { n, pEsmag: esmag / n, pTocado: tocados / n, sd, L50: srt[(n * 0.5) | 0], L05: srt[(n * 0.05) | 0], L95: srt[(n * 0.95) | 0] };
}

const ids = fs.readdirSync(CHARDIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();
const rows = [];
for (const id of ids) {
  const f = baseColorFile(id);
  if (!f) { rows.push({ id, erro: 'sem baseColorTexture' }); continue; }
  const info = execFileSync('magick', ['identify', '-format', '%w %h', f]).toString().trim().split(' ');
  const lado = Math.max(+info[0], +info[1]);
  const buf = raster(f, N, 'hi');
  const loLado = ladoRegional(lado);
  const lo = raster(f, loLado, 'lo');
  const cru = medir(buf, lo, loLado, 'nenhum');
  const deg = medir(buf, lo, loLado, 'degrau');
  const reg = medir(buf, lo, loLado, 'regional');
  if (!cru) { rows.push({ id, erro: 'textura vazia' }); continue; }
  rows.push({
    id, lado, blocoRegional: loLado, pEsmag: cru.pEsmag,
    sdCru: cru.sd, L50cru: cru.L50,
    sdDegrau: deg.sd, L50degrau: deg.L50, perdaDegrau: 1 - deg.sd / Math.max(cru.sd, 1e-6), pTocadoDegrau: deg.pTocado,
    sdRegional: reg.sd, L50regional: reg.L50, perdaRegional: 1 - reg.sd / Math.max(cru.sd, 1e-6), pTocadoRegional: reg.pTocado,
  });
}

/* ── MUTANTES: um portão que não fica vermelho quando o código é quebrado de
   propósito está cego (Lei 2 do HANDOFF). Cada mutante abaixo desfaz uma parte
   da correção; a coluna que tem que ficar vermelha está no rótulo. */
const MUTANTES = {
  // regional vira degrau (bloco de 1 texel = a própria amostra) -> perdaRegional
  // tem que saltar pro nível da perdaDegrau e reprovar.
  bloco1: (r) => ({ ...r, perdaRegional: r.perdaDegrau, sdRegional: r.sdDegrau, L50regional: r.L50degrau, pTocadoRegional: r.pTocadoDegrau }),
  // piso desligado: não esmaga nada, mas também não levanta -> L50 tem que voltar
  // pro cru e a cláusula de CLAREZA reprova.
  pisozero: (r) => ({ ...r, perdaRegional: 0, sdRegional: r.sdCru, L50regional: r.L50cru }),
};
let mutado = false;
if (MUTANTE) {
  if (!MUTANTES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}. Há: ${Object.keys(MUTANTES).join(', ')}`); process.exit(2); }
  for (let i = 0; i < rows.length; i++) if (!rows[i].erro) rows[i] = MUTANTES[MUTANTE](rows[i]);
  mutado = true;
}

const ok = rows.filter((r) => !r.erro);
if (process.argv.includes('--json')) fs.writeFileSync(path.join(ROOT, 'tools/eval/char_floor.json'), JSON.stringify(rows, null, 2));

console.log(`C10 — PISO DE ALBEDO (albMin=${ALB_MIN} linear = sRGB ${(ALB_MIN <= 0.0031308 ? ALB_MIN * 12.92 : 1.055 * Math.pow(ALB_MIN, 1 / 2.4) - 0.055).toFixed(3)} = L* ${Lstar(ALB_MIN).toFixed(1)}; lod=${ALB_LOD})`);
if (mutado) console.log(`### MUTANTE ATIVO: ${MUTANTE} ###`);
console.log('');
console.log('id              lado  %esmag   sd cru  |  DEGRAU (hoje)   |  REGIONAL (correção)');
console.log('                                       |  sd   perda  L50 |  sd   perda  L50    L50 cru');
console.log('-'.repeat(96));
const ord = ok.slice().sort((a, b) => b.pEsmag - a.pEsmag);
for (const r of ord) {
  const mark = r.perdaDegrau > PERDA_MAX ? ' <<' : '';
  console.log(r.id.padEnd(15) + String(r.lado).padStart(5)
    + (100 * r.pEsmag).toFixed(1).padStart(8) + '%'
    + r.sdCru.toFixed(1).padStart(8) + '  |'
    + r.sdDegrau.toFixed(1).padStart(6) + (100 * r.perdaDegrau).toFixed(0).padStart(6) + '%' + r.L50degrau.toFixed(0).padStart(5)
    + '  |' + r.sdRegional.toFixed(1).padStart(6) + (100 * r.perdaRegional).toFixed(0).padStart(6) + '%' + r.L50regional.toFixed(0).padStart(5)
    + r.L50cru.toFixed(0).padStart(9) + mark);
}
console.log('-'.repeat(96));
const med = (k, a = ok) => { const v = a.map((r) => r[k]).sort((x, y) => x - y); return v[(v.length / 2) | 0]; };
const piorD = ok.reduce((a, b) => (b.perdaDegrau > a.perdaDegrau ? b : a));
const piorR = ok.reduce((a, b) => (b.perdaRegional > a.perdaRegional ? b : a));
console.log(`mediana da perda de contraste:  degrau ${(100 * med('perdaDegrau')).toFixed(1)}%   regional ${(100 * med('perdaRegional')).toFixed(1)}%`);
console.log(`pior caso:                      degrau ${piorD.id} ${(100 * piorD.perdaDegrau).toFixed(1)}%   regional ${piorR.id} ${(100 * piorR.perdaRegional).toFixed(1)}%`);
console.log(`mediana de L* (clareza):        cru ${med('L50cru').toFixed(1)} -> degrau ${med('L50degrau').toFixed(1)} -> regional ${med('L50regional').toFixed(1)}`);

// ── VEREDITO ───────────────────────────────────────────────────────────────
// Duas cláusulas, e as duas têm que passar juntas: é o ponto da tarefa (levantar
// os escuros SEM lavar o resto não vale nada se o piso deixar de levantar).
const alvo = MODO === 'degrau' ? 'perdaDegrau' : 'perdaRegional';
const alvoL = MODO === 'degrau' ? 'L50degrau' : 'L50regional';
const reprovados = ok.filter((r) => r[alvo] > PERDA_MAX);
/* CLAREZA: o piso existe para garantir um mínimo de leitura (BAR §2.1 / C1). Ele
   continua valendo se os personagens que ele DE FATO toca sobem de nível.
   "Tocado" é medido no modo em julgamento (ganho > 1,02 em >20 % dos texels), não
   por pEsmag: pEsmag conta texel abaixo do piso, e um personagem pode ter 30 % de
   texels escuros dentro de regiões claras — aí o piso regional não deve levantar
   nada, e cobrar levantamento seria cobrar o defeito de volta. */
const alvoT = MODO === 'degrau' ? 'pTocadoDegrau' : 'pTocadoRegional';
const tocados = ok.filter((r) => r[alvoT] > 0.50);
const semLevantar = tocados.filter((r) => r[alvoL] <= r.L50cru + 1);
console.log('');
console.log(`C10a CONTRASTE  (perda ≤ ${(100 * PERDA_MAX).toFixed(0)}% em ${ok.length} personagens): `
  + (reprovados.length ? `✗ ${reprovados.length} fora — ${reprovados.slice(0, 8).map((r) => `${r.id} ${(100 * r[alvo]).toFixed(0)}%`).join(', ')}` : '✓'));
console.log(`C10b CLAREZA    (os ${tocados.length} que o piso levanta de fato (>50% dos texels) têm que SUBIR de L*): `
  + (semLevantar.length ? `✗ ${semLevantar.length} não sobem — ${semLevantar.slice(0, 8).map((r) => r.id).join(', ')}` : '✓'));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(reprovados.length || semLevantar.length ? 1 : 0);
