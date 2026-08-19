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
     2. lê `scene.userData.skyUrl` — o céu que o mapa REALMENTE pediu (setMapSky
        grava ao aplicar; régua que lê declaração em vez de uso é o BUG-02);
     3. amostra o horizonte DESSE webp com tools/eval/look-horizonte.py
        (mediana das 12 linhas acima do equador equiretangular — ver a docstring);
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
import { initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const TETO_DE = 8;
// Piloto do RC1 (plans/23): os 3 primeiros mapas do look por mapa. O rollout
// estende esta lista aos demais mapas com céu webp.
const MAPAS = ['fy_mansao', 'fy_corrego', 'fy_campomorro'];

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

/* ---------- medição ---------- */
const T = initTextures();
const falhas = [];
const porMapa = [];
for (const mapId of MAPAS) {
  const g = bootGame(mapId, { textures: T });
  const fog = g.scene.fog;
  if (!fog || !fog.color) { falhas.push(`${mapId}: scene.fog ausente — não sei medir (névoa desligada é vermelho, não silêncio)`); continue; }
  if (MUT === 'fog') {
    const antes = fog.color.getHex();
    fog.color.r = Math.min(1, fog.color.r + 0.3);
    if (fog.color.getHex() === antes) { console.log('LOOK VERMELHA · mutante fog NÃO aplicou'); process.exit(1); }
  }
  const skyUrl = g.scene.userData.skyUrl;
  if (!skyUrl) { falhas.push(`${mapId}: scene.userData.skyUrl ausente — o mapa não passou pelo setMapSky instrumentado`); continue; }
  if (!existsSync(path.join(RAIZ, 'public', skyUrl))) { falhas.push(`${mapId}: céu ${skyUrl} não existe em public/`); continue; }
  porMapa.push({ mapId, fogHex: fog.color.getHex(), sky: skyUrl.split('/').pop(), skyUrl });
}

const { tab, origem, problemas } = horizontes([...new Set(porMapa.map((m) => m.skyUrl))]);
falhas.push(...problemas);

let verdes = 0;
for (const m of porMapa) {
  const am = tab[m.sky];
  if (!am) { falhas.push(`${m.mapId}: horizonte de ${m.sky} não medido (${origem})`); continue; }
  const horHex = parseInt(am.horizonte, 16);
  const dE = dE76(m.fogHex, horHex);
  const ok = dE <= TETO_DE;
  if (ok) verdes++;
  const hx = (h) => '#' + h.toString(16).padStart(6, '0');
  console.log(`  ${m.mapId.padEnd(15)} fog=${hx(m.fogHex)} horizonte=${hx(horHex)} (${m.sky}, ${origem})  ΔE76=${dE.toFixed(1)} ${ok ? `≤ ${TETO_DE}` : `> ${TETO_DE}  ← VERMELHA`}`);
}

if (MUT) {
  if (verdes < porMapa.length || falhas.length) { console.log(`LOOK ok · mutante '${MUT}' reprovado como esperado`); process.exit(0); }
  console.log(`LOOK VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}
for (const f of falhas) console.log(`  LOOK VERMELHA · ${f}`);
if (falhas.length || verdes < porMapa.length) {
  console.log(`LOOK VERMELHA · ${verdes}/${porMapa.length} mapas com fog == horizonte (teto ΔE76 ${TETO_DE})`);
  process.exit(1);
}
console.log(`LOOK ok · ${verdes}/${porMapa.length} mapas com fog == horizonte (teto ΔE76 ${TETO_DE}, horizonte ${origem})`);
