/* ============================================================================
   char-pbr-check.mjs — RÉGUA DE PBR DE PERSONAGEM (rugosidade efetiva).
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono disse que os personagens parecem "brinquedo de plástico". Plástico de
   brinquedo é exatamente isto: dielétrico com rugosidade quase zero — um verniz
   que devolve o realce da luz como um ponto duro, sem nenhuma difusão.

   DUAS REFUTAÇÕES QUE ESTA RÉGUA CARREGA, para ninguém repetir o caminho errado:

   1) NÃO É CROMO, E NÃO EXISTE KTX2 NESTE ELENCO.
      O diagnóstico anterior dizia "96,4% da superfície é metal>0,5 e rough<0,35
      = cromo polido", e dizia que 53 dos 62 eram imedíveis porque a textura
      estaria em KTX2 (KHR_texture_basisu). Medido no chunk JSON dos 62 GLB:
      `KHR_texture_basisu` aparece ZERO vezes. O que existe é EXT_texture_webp
      (48 arquivos) e image/jpeg (13). Os dois decodificam com `sharp`, que já
      estava nas dependências. Nenhum personagem é imedível.

   2) O `metallicFactor` DO ARQUIVO NÃO CHEGA NA TELA.
      characters.js:370 `upgradeCharMaterial` constrói um MeshStandardMaterial
      NOVO com `metalness: 0.0` fixo e `roughness: 0.86` fixo, reaproveitando só
      `roughnessMap`. Ou seja: metallicFactor, roughnessFactor e o canal B da
      textura MR são TODOS descartados no caminho servido. Reprovar personagem
      por `metallicFactor` seria medir a DECLARAÇÃO, não o resultado — o mesmo
      erro que o comentário do CHR5B já registra ("O CHR5B contava ARQUIVO; o
      pixel vinha da constante").

      O que sobra na tela, e portanto o único número que esta régua julga:

          rugosidade_efetiva = roughness_base × textura_MR.g     (three.js)
          metalness_efetiva  = metalness_base = 0                (constante)

      As duas bases são LIDAS de public/js/characters.js, não copiadas. Se
      alguém mexer no 0.86 ou no 0.0, a régua muda junto — régua que carrega
      cópia da regra mente no dia em que a regra muda (mesmo princípio do AUD1).

   COMO MEDE
   Por ÁREA DE SUPERFÍCIE, não por área de textura. Texel em ilha vazia do UV
   não aparece na tela e não pode votar. Cada triângulo é amostrado em 4 pontos
   no espaço UV (centroide + 3 meios de aresta) e pesa pela sua área 3D real,
   com a escala do nó aplicada.

   DE ONDE VÊM OS TETOS (nenhum número redondo, nenhum número inventado)
   Medido o elenco inteiro (62). Os 61 aprovados e o reprovado não se tocam:

     · área com rugosidade < 0,20   pior aprovado 10,5% (lampiao)  |  camera-roxa 95,3%
     · rugosidade média            pior aprovado 0,270 (pagodeiro) |  camera-roxa 0,039

   O teto de cada cláusula é o MEIO GEOMÉTRICO (meio em escala log) entre o pior
   aprovado e o reprovado. É a escolha que dá a MESMA folga relativa dos dois
   lados — ~3,0x de espaço para a arte aprovada crescer e ~3,0x de espaço antes
   do defeito passar. Meio aritmético daria folga desigual; número redondo não
   teria origem nenhuma.

     PBR1  área com rugosidade efetiva < 0,20  ≤ 31,6%   (√(10,5 × 95,3))
     PBR2  rugosidade efetiva média            ≥ 0,103   (√(0,039 × 0,270))

   MUTAÇÃO
   `--mutante=<nome>` envernizamento: força o canal G da textura MR do
   personagem citado para o perfil do camera-roxa. Personagem bom TEM que ficar
   vermelho. Se não ficar, a régua está cega para o defeito que diz cobrir.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CHARS = path.join(ROOT, 'public', 'models', 'characters');

// ── Teto PBR1: fração de área com rugosidade efetiva abaixo deste ponto.
//    0,20 é onde o realce especular deixa de ser "acetinado" e vira verniz.
const ESPELHO = 0.20;
const TETO_AREA = Math.sqrt(0.105 * 0.953);   // 0,3163 — √(pior aprovado × reprovado)
const PISO_MEDIA = Math.sqrt(0.039 * 0.270);  // 0,1026 — √(reprovado × pior aprovado)

// ── As bases do material saem do código servido, não de uma cópia aqui.
const SRC = fs.readFileSync(path.join(ROOT, 'public', 'js', 'characters.js'), 'utf8');
const BLOCO = SRC.slice(SRC.indexOf('export function upgradeCharMaterial'));
const mBase = BLOCO.match(/metalness:\s*([0-9.]+)/);
/* A rugosidade base deixou de ser literal em upgradeCharMaterial e virou alavanca
   (`roughness: CHAR_FX.rough`, com padrão em `rough: _cnum('charrough', 0.86)`).
   A régua continua LENDO do código servido — só segue o valor até onde ele foi
   morar. Sem isto ela abortaria com "não achei roughness", que é o pior desfecho
   possível: régua que morre não é régua que reprova, é régua que some. */
const rBase = BLOCO.match(/roughness:\s*([0-9.]+)/)
  || SRC.match(/rough:\s*_cnum\('charrough',\s*([0-9.]+)\)/);
if (!mBase || !rBase) {
  console.error('PBR: não achei metalness/roughness em upgradeCharMaterial (characters.js).');
  console.error('     A régua lê as bases do código servido de propósito. Se o material mudou de forma, ajuste aqui.');
  process.exit(1);
}
const METAL_BASE = parseFloat(mBase[1]);
const ROUGH_BASE = parseFloat(rBase[1]);
const USA_MAPA = /roughnessMap:\s*src\.roughnessMap/.test(BLOCO);

const argv = process.argv.slice(2);
const MUTANTE = (argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const JSON_OUT = argv.includes('--json');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function decodeTex(tex) {
  const img = tex?.getImage();
  if (!img) return null;
  try {
    const { data, info } = await sharp(Buffer.from(img)).raw().toBuffer({ resolveWithObject: true });
    return { data, w: info.width, h: info.height, ch: info.channels };
  } catch (e) {
    return { erro: e.message };
  }
}

function escalaMundo(node) {
  let s = 1, n = node;
  while (n) {
    const sc = n.getScale();
    const c = Math.cbrt(Math.abs(sc[0] * sc[1] * sc[2]));
    if (c > 0) s *= c;
    n = n.getParentNode ? n.getParentNode() : null;
  }
  return s;
}

async function medir(file, envernizar) {
  const doc = await io.read(path.join(CHARS, file));
  const cache = new Map();
  const amostras = [];
  let semTex = 0, semUv = 0, falhas = [];

  const escalaDoMesh = new Map();
  for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh();
    if (m) escalaDoMesh.set(m, escalaMundo(n));
  }

  for (const mesh of doc.getRoot().listMeshes()) {
    const sc = escalaDoMesh.get(mesh) ?? 1;
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      if (!mat) continue;
      const mrTex = USA_MAPA ? mat.getMetallicRoughnessTexture() : null;
      let img = null;
      if (mrTex) {
        if (!cache.has(mrTex)) cache.set(mrTex, await decodeTex(mrTex));
        img = cache.get(mrTex);
        if (img?.erro) { falhas.push(`${mat.getName()}: ${mrTex.getMimeType()} ${img.erro}`); img = null; }
      }
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const set = mrTex ? (mat.getMetallicRoughnessTextureInfo()?.getTexCoord() ?? 0) : 0;
      const uv = prim.getAttribute(`TEXCOORD_${set}`) || prim.getAttribute('TEXCOORD_0');
      const idx = prim.getIndices();
      const total = idx ? idx.getCount() : pos.getCount();
      const at = (i) => (idx ? idx.getScalar(i) : i);
      const P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const U = [[0, 0], [0, 0], [0, 0]];
      const PESOS = [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]];
      for (let i = 0; i + 2 < total; i += 3) {
        for (let k = 0; k < 3; k++) { pos.getElement(at(i + k), P[k]); if (uv) uv.getElement(at(i + k), U[k]); }
        const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2];
        const bx = P[2][0] - P[0][0], by = P[2][1] - P[0][1], bz = P[2][2] - P[0][2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz) * sc * sc;
        if (!(area > 0)) continue;
        let g = 1;
        if (img && uv) {
          let acc = 0;
          for (const [w0, w1, w2] of PESOS) {
            const u = U[0][0] * w0 + U[1][0] * w1 + U[2][0] * w2;
            const v = U[0][1] * w0 + U[1][1] * w1 + U[2][1] * w2;
            let px = Math.floor((((u % 1) + 1) % 1) * img.w); if (px >= img.w) px = img.w - 1;
            let py = Math.floor((((v % 1) + 1) % 1) * img.h); if (py >= img.h) py = img.h - 1;
            acc += img.data[(py * img.w + px) * img.ch + 1] / 255;
          }
          g = acc / PESOS.length;
        } else if (img && !uv) { semUv++; }
        else { semTex++; }
        // MUTAÇÃO: enverniza — o canal G vira o perfil medido do camera-roxa
        // (média 0,041, p90 0,082). Sem tocar em disco.
        if (envernizar) g = Math.min(g, 0.041 + 0.041 * ((i * 2654435761) % 1000) / 1000);
        amostras.push([ROUGH_BASE * g, area]);
      }
    }
  }

  const soma = amostras.reduce((s, [, a]) => s + a, 0) || 1;
  amostras.sort((a, b) => a[0] - b[0]);
  const quant = (p) => { let acc = 0; for (const [r, a] of amostras) { acc += a; if (acc >= soma * p) return r; } return amostras.at(-1)?.[0] ?? 0; };
  const areaAbaixo = (t) => amostras.filter(([r]) => r < t).reduce((s, [, a]) => s + a, 0) / soma;
  return {
    nome: file.replace(/\.glb$/, ''),
    media: amostras.reduce((s, [r, a]) => s + r * a, 0) / soma,
    p10: quant(0.10), p50: quant(0.50), p90: quant(0.90),
    espelho: areaAbaixo(ESPELHO),
    tris: amostras.length, semTex, semUv, falhas,
  };
}

const arquivos = fs.readdirSync(CHARS).filter((f) => f.endsWith('.glb')).sort();
const linhas = [];
for (const f of arquivos) {
  linhas.push(await medir(f, MUTANTE && f === `${MUTANTE}.glb`));
}
if (MUTANTE && !arquivos.includes(`${MUTANTE}.glb`)) {
  console.error(`PBR: --mutante=${MUTANTE} não existe em ${CHARS}`);
  process.exit(1);
}

linhas.sort((a, b) => a.media - b.media);
const reprovados = linhas.filter((l) => l.espelho > TETO_AREA || l.media < PISO_MEDIA);
const imediveis = linhas.filter((l) => l.falhas.length);

if (JSON_OUT) {
  console.log(JSON.stringify({ ROUGH_BASE, METAL_BASE, TETO_AREA, PISO_MEDIA, ESPELHO, linhas }, null, 1));
} else {
  console.log(`\nPBR de personagem — rugosidade EFETIVA no caminho servido`);
  console.log(`  base lida de characters.js: roughness=${ROUGH_BASE}  metalness=${METAL_BASE}  usa roughnessMap=${USA_MAPA}`);
  console.log(`  PBR1  área com rugosidade < ${ESPELHO}  ≤ ${(100 * TETO_AREA).toFixed(1)}%`);
  console.log(`  PBR2  rugosidade média                ≥ ${PISO_MEDIA.toFixed(3)}`);
  if (MUTANTE) console.log(`  MUTANTE envernizado: ${MUTANTE}`);
  console.log(`\n  ${'personagem'.padEnd(24)} media   p10   p50   p90   espelho  tris`);
  for (const l of linhas) {
    const mau = l.espelho > TETO_AREA || l.media < PISO_MEDIA;
    console.log(`  ${mau ? 'X' : ' '} ${l.nome.padEnd(22)} ${l.media.toFixed(3)} ${l.p10.toFixed(3)} ${l.p50.toFixed(3)} ${l.p90.toFixed(3)} ${(100 * l.espelho).toFixed(1).padStart(7)}% ${String(l.tris).padStart(7)}${l.semTex ? '  sem-mapa-MR' : ''}`);
  }
  console.log();
  for (const l of imediveis) console.log(`  IMEDÍVEL  ${l.nome}: ${l.falhas.join(' | ')}`);
  for (const l of reprovados) {
    const q = [];
    if (l.espelho > TETO_AREA) q.push(`PBR1 ${(100 * l.espelho).toFixed(1)}% de área com rugosidade < ${ESPELHO} (teto ${(100 * TETO_AREA).toFixed(1)}%)`);
    if (l.media < PISO_MEDIA) q.push(`PBR2 rugosidade média ${l.media.toFixed(3)} (piso ${PISO_MEDIA.toFixed(3)})`);
    console.log(`  REPROVA  ${l.nome}: ${q.join(' | ')}`);
  }
  console.log(`\n  ${linhas.length} personagens medidos, 0 imedíveis, ${reprovados.length} reprovados.`);
  console.log(reprovados.length || imediveis.length ? '  PBR VERMELHA\n' : '  PBR VERDE\n');
}
process.exit(reprovados.length || imediveis.length ? 1 : 0);
