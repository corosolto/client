#!/usr/bin/env node
/* ============================================================================
   derivar-caixa-pente.mjs — A CAIXA DO PENTE, MEDIDA DA MALHA, NÃO CHUTADA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   `splitParts` (`public/js/vmweapon.js:85`) sabe recortar o carregador e pendurá-lo
   no osso `Mag` — é o que faz o pente SAIR da arma na recarga em vez de ficar
   soldado nela. Ele só roda quando a arma declara `parts.mag.box` no
   `vmconfig.js`, e em 11/09 só **duas** declaram: `ak` e `akm`. As duas viraram
   golden na mesma noite, então hoje o recorte não roda para arma nenhuma — e as
   8 armas de família recarregam com o carregador colado no corpo. É a queixa do
   dono ao pé da letra: *"a mão puxa o nada"*.

   Escrever 8 caixas à mão é a armadilha que esta frente já pagou com o
   alinhamento por coronha: uma suposição sobre a silhueta de UMA arma,
   generalizada no escuro. Então esta ferramenta **deriva** a caixa do perfil de
   profundidade da própria malha.

   COMO ELA GANHA O DIREITO DE SER USADA
   Derivando as caixas de `ak` e `akm`, que já são aprovadas, e comparando — mas
   **pelo conjunto de triângulos recortados**, não por distância de face. Em 11/09
   a caixa derivada da AKM ficou a 1,97 cm por face da aprovada (passaria em
   qualquer tolerância razoável) e recortava só **10,8%** dos mesmos triângulos.
   Distância de face aprova recorte errado; interseção sobre união não.

   Se a derivação não reproduz as duas conhecidas, ela não vale para as outras — e
   o programa diz isso e sai vermelho, em vez de aplicar mesmo assim.

   ONDE ELA MEDE
   Dentro da página, em cima de `weaponModel(id)` REAL — a mesma malha, a mesma
   `cfg.rot`, a mesma normalização que o jogo usa. Reimplementar isso em node era
   o caminho mais curto para medir uma arma que o jogo não serve, que é o defeito
   que a `vm-consistencia-check.mjs` tem hoje.

   USO
     node tools/viewmodels/derivar-caixa-pente.mjs --porta=4361            # valida em ak/akm
     node tools/viewmodels/derivar-caixa-pente.mjs --porta=4361 --armas=carbine,g3
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const JSON_OUT = process.argv.includes('--json');

/* As duas aprovadas, copiadas do `vmconfig.js`. São o gabarito: a derivação é
   conferida contra elas antes de valer para qualquer outra arma. */
const GABARITO = {
  ak:  { min: [-0.022, -0.145, 0.005], max: [0.022, 0.02, 0.2] },
  akm: { min: [-0.0145, -0.132, 0.015], max: [0.0145, 0.018, 0.184] },
};
/* Piso de interseção sobre união entre o recorte da caixa derivada e o da
   aprovada. 0,80 é exigente de propósito: o pente é uma peça pequena, e uma caixa
   que erra 20% dos triângulos já leva pedaço de receptor junto. */
const PISO_IOU = 0.80;

const ALVOS = (arg('armas') || Object.keys(GABARITO).join(',')).split(',').filter(Boolean);
const TODAS = [...new Set([...Object.keys(GABARITO), ...ALVOS])];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto(`${BASE}/?debug=1&auto=E&map=brasilia&armaslazy=0`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });

await page.evaluate((g) => { window.__gabaritoPente = g; }, GABARITO);
const medido = await page.evaluate(async (armas) => {
  // O módulo já está carregado; o import map dá a URL com a versão certa.
  const mapa = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  const url = mapa['./js/weapons.js'] || Object.values(mapa).find((u) => /\/weapons\.js\?/.test(u));
  if (!url) throw new Error('weapons.js não está no import map');
  const W = await import(url);
  const saida = {};

  for (const id of armas) {
    try {
      if (!W.hasWeapon(id)) { await W.preloadWeapons([id]); }
      const wrap = W.weaponModel(id);
      if (!wrap) { saida[id] = { erro: 'sem malha' }; continue; }
      wrap.updateMatrixWorld(true);
      const norm = wrap.scale.x || 1;

      /* Mesma malha e mesmo espaço que o `splitParts` usa: a PRIMEIRA malha do
         wrap, em coordenadas do wrap. Medir outra coisa é medir outra arma. */
      const mesh = wrap.getObjectByProperty('isMesh', true);
      if (!mesh?.geometry) { saida[id] = { erro: 'wrap sem malha' }; continue; }
      const fonte = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = fonte.attributes.position;
      const toGun = wrap.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
      const v = new (wrap.position.constructor)();
      const cen = [];
      for (let i = 0; i + 2 < pos.count; i += 3) {
        let cx = 0; let cy = 0; let cz = 0;
        for (let k = 0; k < 3; k += 1) {
          v.fromBufferAttribute(pos, i + k).applyMatrix4(toGun);
          cx += v.x; cy += v.y; cz += v.z;
        }
        cen.push([cx / 3, cy / 3, cz / 3]);
      }
      const pts = cen.map(([x, y, z]) => ({ x, y, z }));
      if (pts.length < 100) { saida[id] = { erro: `só ${pts.length} triângulos` }; continue; }

      // Perfil de profundidade: em cada fatia de z, quanto a silhueta desce.
      let zMin = Infinity; let zMax = -Infinity; let yMax = -Infinity;
      for (const p of pts) { if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z; if (p.y > yMax) yMax = p.y; }
      const N = 120;
      const passo = (zMax - zMin) / N;
      const fundo = new Array(N).fill(Infinity);
      for (const p of pts) {
        const k = Math.min(N - 1, Math.max(0, Math.floor((p.z - zMin) / passo)));
        if (p.y < fundo[k]) fundo[k] = p.y;
      }
      const validos = fundo.filter((y) => Number.isFinite(y)).slice().sort((a, b) => a - b);
      const mediana = validos[Math.floor(validos.length / 2)];

      // O carregador é a corrida CONTÍGUA de fatias que desce bem abaixo da
      // mediana da silhueta. `saliencia` é o quanto ela precisa descer.
      const saliencia = (yMax - mediana) * 0.28;
      const abaixo = fundo.map((y) => Number.isFinite(y) && y < mediana - saliencia);
      let melhor = null; let i = 0;
      while (i < N) {
        if (!abaixo[i]) { i += 1; continue; }
        let j = i;
        while (j + 1 < N && abaixo[j + 1]) j += 1;
        let prof = 0;
        for (let k = i; k <= j; k += 1) prof = Math.max(prof, mediana - fundo[k]);
        // Entre grip e carregador, fica o mais FUNDO; empate desempata no mais longo.
        const nota = prof * (j - i + 1) ** 0.25;
        if (!melhor || nota > melhor.nota) melhor = { i, j, prof, nota };
        i = j + 1;
      }
      if (!melhor) { saida[id] = { erro: 'nenhuma saliência para baixo' }; continue; }

      /* A corrida funda acha o CORPO do pente; o poço sobe mais raso e a caixa
         aprovada da AK o inclui (ela começa em z=0,005, colada no grip). Estende
         para os dois lados enquanto a silhueta ainda desce meia saliência. */
      let i0 = melhor.i; let j0 = melhor.j;
      const raso = mediana - saliencia * 0.4;
      while (i0 > 0 && Number.isFinite(fundo[i0 - 1]) && fundo[i0 - 1] < raso) i0 -= 1;
      while (j0 < N - 1 && Number.isFinite(fundo[j0 + 1]) && fundo[j0 + 1] < raso) j0 += 1;
      const z0 = zMin + i0 * passo;
      const z1 = zMin + (j0 + 1) * passo;

      /* Extensões só sobre a peça que DESCE. Medir sobre tudo abaixo da mediana
         puxa receptor e guarda-mato para dentro e deixa o x torto — na AK deu
         [-0,008 · +0,025] onde a caixa aprovada é simétrica em ±0,022. */
      let x1abs = 0; let y0 = Infinity; let y1 = -Infinity;
      let dentro = 0;
      for (const p of pts) {
        if (p.z < z0 || p.z > z1) continue;
        if (p.y > raso) continue;
        dentro += 1;
        if (Math.abs(p.x) > x1abs) x1abs = Math.abs(p.x);
        if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      }
      // Carregador é centrado no plano da arma; caixa torta é ruído de medida.
      const x0 = -x1abs; const x1 = x1abs;
      // O topo da caixa acompanha o corpo da arma, não o da fatia funda.
      y1 = Math.max(y1, mediana);
      const dentroDe = (c) => {
        const s = new Set();
        pts.forEach((p, k) => {
          if (p.x >= c.min[0] && p.x <= c.max[0] && p.y >= c.min[1] && p.y <= c.max[1]
            && p.z >= c.min[2] && p.z <= c.max[2]) s.add(k);
        });
        return s;
      };
      const caixaLocal = { min: [x0, y0, z0], max: [x1, y1, z1] };
      const D = dentroDe(caixaLocal);
      let iou = null;
      const gab = window.__gabaritoPente?.[id];
      if (gab) {
        // A spec do `vmconfig` está em metros gun-space: dividir por norm dá o
        // espaço do wrap, como o `splitParts` faz.
        const A = dentroDe({ min: gab.min.map((n) => n / norm), max: gab.max.map((n) => n / norm) });
        const inter = [...A].filter((k) => D.has(k)).length;
        const uni = new Set([...A, ...D]).size;
        iou = uni ? +(inter / uni).toFixed(3) : 0;
        saida[id] = { ...saida[id], aprovadaRecorta: A.size };
      }
      saida[id] = {
        ...saida[id],
        norm,
        // De volta a METROS gun-space, que é a unidade do `vmconfig`.
        min: [x0 * norm, y0 * norm, z0 * norm].map((n) => +n.toFixed(4)),
        max: [x1 * norm, y1 * norm, z1 * norm].map((n) => +n.toFixed(4)),
        recorta: D.size,
        fracao: +(D.size / pts.length * 100).toFixed(2),
        triangulos: pts.length,
        iou,
      };
    } catch (e) { saida[id] = { erro: String(e).slice(0, 90) }; }
  }
  return saida;
}, TODAS);

await browser.close();

let reprovas = 0;
const cx = (v) => `[${v.map((n) => n.toFixed(4)).join(', ')}]`;
console.log('\n  CAIXA DO PENTE DERIVADA DA MALHA\n');
for (const id of TODAS) {
  const r = medido[id];
  if (!r || r.erro) { console.log(`  ✗ ${id.padEnd(11)} ${r?.erro || 'sem resultado'}`); reprovas += 1; continue; }
  if (!GABARITO[id]) {
    console.log(`  · ${id.padEnd(11)} min ${cx(r.min)}  max ${cx(r.max)}  recorta ${r.recorta} de ${r.triangulos} triângulos (${r.fracao}%)`);
    continue;
  }
  const ok = (r.iou ?? 0) >= PISO_IOU;
  if (!ok) reprovas += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${id.padEnd(11)} GABARITO · IoU ${(r.iou * 100).toFixed(1)}% (piso ${(PISO_IOU * 100).toFixed(0)}%) · derivada recorta ${r.recorta}, aprovada ${r.aprovadaRecorta}, de ${r.triangulos}`);
  console.log(`      derivada  min ${cx(r.min)}  max ${cx(r.max)}`);
  console.log(`      aprovada  min ${cx(GABARITO[id].min)}  max ${cx(GABARITO[id].max)}`);
}

if (JSON_OUT) console.log(JSON.stringify(medido, null, 2));
console.log(reprovas
  ? `\n  A derivação NÃO reproduz o gabarito. Ela não vale para as outras armas.\n`
  : `\n  Derivação confere com as ${Object.keys(GABARITO).length} aprovadas.\n`);
process.exit(reprovas ? 1 : 0);
