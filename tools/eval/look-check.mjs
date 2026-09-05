/* ============================================================================
   look-check.mjs — RÉGUA DO RC1 (plans/23): A COR DO FOG É A COR DO HORIZONTE.
   ----------------------------------------------------------------------------
   O defeito que ela PREMIA não existir: céu de uma cor e névoa de outra. Onde o
   terreno distante encontra o céu, a "borda dura de neblina" só some quando a cor
   do fog É a cor do céu naquela direção (r3_fog.py comprou isso medindo frames;
   o dono comprou de novo apontando o horizonte dinâmico dos jogos AA).

   O que ela mede, no MESMO mundo em que o jogo roda:
     1. sobe o mapa de verdade pelo harness (bootGame) e lê `scene.fog.color` —
        a névoa que o jogo desenha, não a declaração;
     2. distingue skySource webp/procedural, recusando origem desconhecida;
     3. webp: mede skyUrl solicitado com look-horizonte.py (não atesta download no browser).
        Procedural: mede os bytes de scene.background criados pelo MESMO código runtime,
        com banda de 12 linhas acima do equador; ausência/formato errado são vermelhos;
        os extremos analíticos representam a mesma longitude e devem ter bytes iguais;
     4. compara em ΔE CIE76 (Lab D65, a partir do sRGB dos dois lados).

   O TETO E SUA PROCEDÊNCIA (Lei 2):
     ΔE76 ≤ 8. Não é o JND (2,3): o fog é UMA cor chapada e o horizonte não é —
     a dispersão interna da própria banda amostrada, medida com
     `python3 tools/eval/look-horizonte.py` (distância de cada pixel à mediana):
       sky_joa.webp  p50 = 6,0   sky_sp.webp  p50 = 5,1   sky_rj.webp  p50 = 2,3
     Um fog perfeito (== mediana) já convive com essa variação natural; exigir
     menos que ela reprovaria o estado ideal. 8 ≈ 1,3× a maior p50 medida.
     O estado ANTES do RC1 media 21–46 nos três mapas piloto (abaixo, reproduzível
     com `node tools/eval/look-check.mjs` no commit que introduz a régua).

   Assado: sem python3/PIL a régua cai no assado tools/eval/look-horizonte.json
   (gerado pelo sampler). COM python3 ela re-amostra e REPROVA se o assado
   divergir — "resultado velho" é item de régua, não surpresa.

   Uso:
     node tools/eval/look-check.mjs
     node tools/eval/look-check.mjs --mutante=fog   (descasa o fog → TEM que dar vermelho)
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as THREE from '../../public/vendor/three.module.js';
import { initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const TETO_DE = 8;
const MUTANTES = ['fog', 'ceu', 'costura', 'ceu-ausente'];
if (MUT && !MUTANTES.includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
let mutou = false;
// RC1: panoramas dos três mapas piloto e céu analítico do Sertão.
const MAPAS = ['mansao', 'corrego', 'campomorro', 'velho_oeste'];

/* ---------- sRGB -> Lab (D65), ΔE CIE76 ---------- */
function srgbParaLab(hex) {
  const lin = [0, 1, 2].map((i) => {
    const c = ((hex >> (16 - 8 * i)) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = lin;
  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  let z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE76 = (h1, h2) => {
  const A = srgbParaLab(h1), B = srgbParaLab(h2);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};

/* ---------- horizonte: fresco (python3+PIL) ou assado ---------- */
function horizontes(skies) {
  const problemas = [];
  if (!skies.length) return { tab: {}, origem: 'runtime', problemas };
  const assPath = path.join(HERE, 'look-horizonte.json');
  const assado = existsSync(assPath) ? JSON.parse(readFileSync(assPath, 'utf8')) : null;
  const r = spawnSync('python3', [path.join(HERE, 'look-horizonte.py'), ...skies.map((s) => path.join(RAIZ, 'public', s))], { encoding: 'utf8' });
  if (r.status === 0) {
    const fresco = JSON.parse(r.stdout);
    if (assado) {
      for (const k of Object.keys(fresco)) {
        if (!assado[k] || assado[k].horizonte !== fresco[k].horizonte)
          problemas.push(`assado velho: ${k} mudou (assado=${assado[k] && assado[k].horizonte} fresco=${fresco[k].horizonte}) — rode \`python3 tools/eval/look-horizonte.py --bake tools/eval/look-horizonte.json <webps>\` e revise o look do mapa`);
      }
    }
    return { tab: fresco, origem: 'fresco', problemas };
  }
  if (!assado) {
    problemas.push(`não sei medir o horizonte: python3/PIL falhou (${(r.stderr || '').trim().split('\n').pop()}) e não há assado look-horizonte.json`);
    return { tab: {}, origem: 'nenhuma', problemas };
  }
  console.log('  (python3/PIL indisponível — horizonte lido do assado look-horizonte.json)');
  return { tab: assado, origem: 'assado', problemas };
}

/* A DataTexture tem origem inferior (flipY=false). A banda usa os mesmos 12
   texels acima do equador do sampler webp, refletidos no eixo vertical. */
function horizonteProcedural(tex) {
  const im = tex?.image;
  if (!tex?.isDataTexture || !(im?.data instanceof Uint8Array) ||
      im.width !== 1024 || im.height !== 512 || im.data.length !== im.width * im.height * 4 ||
      tex.format !== THREE.RGBAFormat || tex.type !== THREE.UnsignedByteType ||
      tex.colorSpace !== THREE.SRGBColorSpace || tex.flipY !== false ||
      tex.mapping !== THREE.EquirectangularReflectionMapping || tex.wrapS !== THREE.RepeatWrapping)
    throw new Error('céu procedural usado não é DataTexture RGBA sRGB equiretangular 1024×512 mensurável');
  const channels = [[], [], []];
  let seam = 0;
  for (let y = im.height / 2; y < im.height; y++) {
    for (let c = 0; c < 3; c++) seam = Math.max(seam, Math.abs(im.data[y * im.width * 4 + c] - im.data[((y + 1) * im.width - 1) * 4 + c]));
  }
  for (let y = im.height / 2 + 2; y < im.height / 2 + 14; y++) {
    for (let x = Math.floor(im.width * .04); x < Math.floor(im.width * .96); x++) {
      for (let c = 0; c < 3; c++) channels[c].push(im.data[(y * im.width + x) * 4 + c]);
    }
  }
  const rgb = channels.map(values => { values.sort((a, b) => a - b); return Math.round((values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2); });
  return { horizonte: ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).padStart(6, '0'), seam };
}

const T = initTextures();
const falhas = [];
const porMapa = [];
for (const mapId of MAPAS) {
  const g = bootGame(mapId, { textures: T });
  const fog = g.scene.fog;
  if (!fog || !fog.color) { falhas.push(`${mapId}: scene.fog ausente — não sei medir`); continue; }
  if (MUT === 'fog') {
    const antes = fog.color.getHex();
    fog.color.r = Math.min(1, fog.color.r + 0.3);
    if (fog.color.getHex() === antes) throw new Error('mutante fog NÃO aplicou');
    mutou = true;
  }
  try {
    const source = g.scene.userData.skySource;
    const skyUrl = g.scene.userData.skyUrl;
    if (source?.kind === 'procedural') {
      if (source.model !== 'dry-afternoon' || skyUrl) throw new Error('fonte procedural desconhecida ou skyUrl obsoleto');
      if (mapId !== 'velho_oeste') throw new Error('céu procedural vazou para outro mapa');
      if (MUT === 'ceu-ausente') { g.scene.background = null; mutou = true; }
      if (MUT === 'ceu' || MUT === 'costura') {
        const d = g.scene.background?.image?.data;
        if (!d) throw new Error('mutante sem DataTexture');
        const before = d.slice();
        if (MUT === 'ceu') {
          for (let i = 0; i < d.length; i += 4) { d[i] = 255; d[i + 1] = 0; d[i + 2] = 255; }
        } else {
          for (let y = 256; y < 512; y++) d[y * 1024 * 4] ^= 255;
        }
        if (!d.some((v, i) => v !== before[i])) throw new Error('mutante céu NÃO aplicou');
        mutou = true;
      }
      const am = horizonteProcedural(g.scene.background);
      console.log(`  ${mapId} costura=${am.seam} níveis sRGB (extremos representam a mesma longitude)`);
      if (am.seam !== 0) falhas.push(`${mapId}: costura procedural ${am.seam} ≠ 0 — extremos não coincidem`);
      porMapa.push({ mapId, fogHex: fog.color.getHex(), sky: source.model, am });
    } else {
      if (mapId === 'velho_oeste') throw new Error('Sertão ainda usa panorama sem contrato de continuidade; esperado céu procedural medido em scene.background');
      if (source?.kind !== 'webp' || source.url !== skyUrl) throw new Error('fonte webp ausente/desconhecida ou URL usada divergente');
      if (!skyUrl || !existsSync(path.join(RAIZ, 'public', skyUrl))) throw new Error(`céu ${skyUrl} ausente em public/`);
      porMapa.push({ mapId, fogHex: fog.color.getHex(), sky: skyUrl.split('/').pop(), skyUrl });
    }
  } catch (e) { falhas.push(`${mapId}: ${e.message}`); }
}

const { tab, origem, problemas } = horizontes([...new Set(porMapa.filter(m => m.skyUrl).map(m => m.skyUrl))]);
falhas.push(...problemas);
let verdes = 0;
for (const m of porMapa) {
  const am = m.am || tab[m.sky];
  if (!am) { falhas.push(`${m.mapId}: horizonte de ${m.sky} não medido (${origem})`); continue; }
  const horHex = parseInt(am.horizonte, 16);
  const dE = dE76(m.fogHex, horHex);
  const ok = dE <= TETO_DE;
  if (ok) verdes++;
  const hx = (h) => '#' + h.toString(16).padStart(6, '0');
  console.log(`  ${m.mapId.padEnd(15)} fog=${hx(m.fogHex)} horizonte=${hx(horHex)} (${m.sky}, ${m.am ? 'texel runtime' : origem})  ΔE76=${dE.toFixed(1)} ${ok ? `≤ ${TETO_DE}` : `> ${TETO_DE}  ← VERMELHA`}`);
}
for (const f of falhas) console.log(`  LOOK VERMELHA · ${f}`);
if (MUT) {
  if (!mutou) { console.log(`LOOK VERMELHA · mutante '${MUT}' NÃO aplicou`); process.exit(1); }
  if (verdes < porMapa.length || falhas.length) { console.log(`LOOK ok · mutante '${MUT}' reprovado como esperado`); process.exit(0); }
  console.log(`LOOK VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
if (falhas.length || verdes !== MAPAS.length) {
  console.log(`LOOK VERMELHA · ${verdes}/${MAPAS.length} mapas com fog == horizonte (teto ΔE76 ${TETO_DE})`);
  process.exit(1);
}
console.log(`LOOK ok · ${verdes}/${MAPAS.length} mapas com fog == horizonte (teto ΔE76 ${TETO_DE}, webp ${origem}, procedural runtime)`);
