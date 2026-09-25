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

   Escrever as caixas à mão é a armadilha que esta frente já pagou com o
   alinhamento por coronha: uma suposição sobre a silhueta de UMA arma,
   generalizada no escuro.

   A PRIMEIRA REGRA FALHOU, E ESTÁ REGISTRADO
   Tentei derivar a caixa do **perfil de profundidade** — a corrida de fatias em
   que a silhueta desce abaixo da mediana. Deu 80,0% de IoU na `ak` (raspando o
   piso), 1,7% na `akm`, e caixas sem sentido nas três alvo: a da `carbine` caía
   inteira ATRÁS do grip (a coronha), a da `awp` era uma lasca de 0,97% e a da
   `deagle` arrancava 22,8% da arma. Duas tentativas, offline e na página, mesma
   hipótese: descartada.

   A REGRA QUE VALE: COMPONENTE CONEXO
   O pente não é uma região do espaço — é uma PEÇA. Numa malha Mint de 4.576
   triângulos a `ak` tem 15 componentes conexos, e um deles, com 379 triângulos,
   ocupa `x[-0,008 · 0,025] y[-0,133 · 0,053] z[0,044 · 0,191]`. A caixa aprovada
   em 31/08 é `x[±0,022] y[-0,145 · 0,020] z[0,005 · 0,200]`: quem a autorou
   estava, sem saber, cercando esse componente. Achar a peça e usar a caixa DELA
   nunca corta geometria no meio, que é o risco todo do recorte por caixa.

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
// --encaixe=0 volta ao corte cru; o padrão leva a ilha inteira.
const ENCAIXE_CLI = arg('encaixe', '1') !== '0';

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

await page.evaluate(({ g, e }) => { window.__gabaritoPente = g; window.__encaixePente = e; },
  { g: GABARITO, e: ENCAIXE_CLI });
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

      /* União-busca sobre vértices coincidentes: dois triângulos que dividem uma
         posição são a mesma peça. É isto que separa o pente do corpo sem cortar
         nada — a malha Mint é um nó só, mas não é uma peça só. */
      const Q = 1e5;
      const chave = (i, k) => {
        v.fromBufferAttribute(pos, i + k).applyMatrix4(toGun);
        return `${Math.round(v.x * Q)},${Math.round(v.y * Q)},${Math.round(v.z * Q)}`;
      };
      const pai = new Map();
      const achar = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
      const unir = (a, b) => { a = achar(a); b = achar(b); if (a !== b) pai.set(a, b); };
      const chavesTri = [];
      for (let i = 0, t = 0; i + 2 < pos.count; i += 3, t += 1) {
        const ks = [chave(i, 0), chave(i, 1), chave(i, 2)];
        chavesTri.push(ks);
        for (const k of ks) if (!pai.has(k)) pai.set(k, k);
      }
      for (const ks of chavesTri) { unir(ks[0], ks[1]); unir(ks[0], ks[2]); }

      const comps = new Map();
      chavesTri.forEach((ks, t) => {
        const r = achar(ks[0]);
        let e = comps.get(r);
        if (!e) { e = { tris: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; comps.set(r, e); }
        e.tris.push(t);
        const p = pts[t];
        const c = [p.x, p.y, p.z];
        for (let k = 0; k < 3; k += 1) { if (c[k] < e.min[k]) e.min[k] = c[k]; if (c[k] > e.max[k]) e.max[k] = c[k]; }
      });

      /* Qual componente é o pente. Três filtros, cada um com o motivo:
         - 1% a 15% dos triângulos: menos é parafuso, mais é corpo da arma;
         - centro em z dentro da janela do punho: exclui coronha e cano;
         - entre os que sobram, o que DESCE MAIS. Testado contra o pente da `ak`,
           que é conhecido: a regra escolhe o componente certo, o de 379 tri. */
      const total = pts.length;
      const cands = [...comps.values()].filter((e) => {
        const f = e.tris.length / total;
        if (f < 0.01 || f > 0.15) return false;
        const cz = (e.min[2] + e.max[2]) / 2;
        return cz > -0.12 && cz < 0.35;
      });
      if (!cands.length) { saida[id] = { erro: `nenhum componente candidato entre ${comps.size}` }; continue; }
      const peca = cands.reduce((a, b) => (b.min[1] < a.min[1] ? b : a));

      const x0 = -Math.max(Math.abs(peca.min[0]), Math.abs(peca.max[0]));
      const x1 = -x0;
      const y0 = peca.min[1]; const y1 = peca.max[1];
      const z0 = peca.min[2]; const z1 = peca.max[2];
      const componentes = comps.size;
      const trisPeca = peca.tris.length;

      const dentroDe = (c) => {
        const s = new Set();
        pts.forEach((p, k) => {
          if (p.x >= c.min[0] && p.x <= c.max[0] && p.y >= c.min[1] && p.y <= c.max[1]
            && p.z >= c.min[2] && p.z <= c.max[2]) s.add(k);
        });
        return s;
      };
      const caixaLocal = { min: [x0, y0, z0], max: [x1, y1, z1] };
      const Dcru = dentroDe(caixaLocal);

      /* ENCAIXE POR ILHA. A caixa recorta o ESPAÇO e o carregador é uma PEÇA:
         onde a peça não cabe num paralelepípedo a caixa parte componente no meio
         e sobra metade do pente, ou entra metade do cano — que é o veredito do
         dono em 13/09 para m4, scar, uzi e m92. Aqui cada componente entra
         INTEIRO ou não entra: fica quem tem metade ou mais dos triângulos
         dentro. Medido nos dois modos para comparar sem fé. */
      const encaixar = (dentro) => {
        const fora = new Set();
        const saidaS = new Set();
        for (const e of comps.values()) {
          const n = e.tris.reduce((acc, t) => acc + (dentro.has(t) ? 1 : 0), 0);
          if (n >= 0.5 * e.tris.length) for (const t of e.tris) saidaS.add(t);
          else for (const t of e.tris) fora.add(t);
        }
        return saidaS;
      };
      const D = window.__encaixePente ? encaixar(Dcru) : Dcru;
      // Quantos triângulos de OUTRAS peças a caixa leva junto: é o preço de usar
      // caixa em vez de componente, e precisa ser pequeno.
      const daPeca = new Set(peca.tris);
      const intrusos = [...D].filter((k) => !daPeca.has(k)).length;
      let iou = null;
      const gab = window.__gabaritoPente?.[id];
      if (gab) {
        // A spec do `vmconfig` está em metros gun-space: dividir por norm dá o
        // espaço do wrap, como o `splitParts` faz.
        const A = dentroDe({ min: gab.min.map((n) => n / norm), max: gab.max.map((n) => n / norm) });
        const medirIoU = (S) => {
          const inter = [...A].filter((k) => S.has(k)).length;
          const uni = new Set([...A, ...S]).size;
          return uni ? +(inter / uni).toFixed(3) : 0;
        };
        iou = medirIoU(D);
        saida[id] = { ...saida[id], iouCru: medirIoU(Dcru), iouEncaixe: medirIoU(encaixar(Dcru)) };
        saida[id] = { ...saida[id], aprovadaRecorta: A.size };
      }
      saida[id] = {
        ...saida[id],
        norm,
        // De volta a METROS gun-space, que é a unidade do `vmconfig`.
        min: [x0 * norm, y0 * norm, z0 * norm].map((n) => +n.toFixed(4)),
        max: [x1 * norm, y1 * norm, z1 * norm].map((n) => +n.toFixed(4)),
        recorta: D.size, recortaCru: Dcru.size,
        fracao: +(D.size / pts.length * 100).toFixed(2),
        triangulos: pts.length,
        componentes, trisPeca, intrusos,
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
    console.log(`  · ${id.padEnd(11)} min ${cx(r.min)}  max ${cx(r.max)}`);
    console.log(`      peça de ${r.trisPeca} tri entre ${r.componentes} componentes · a caixa recorta ${r.recorta} (${r.fracao}%), sendo ${r.intrusos} de outras peças`);
    continue;
  }
  const ok = (r.iou ?? 0) >= PISO_IOU;
  if (!ok) reprovas += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${id.padEnd(11)} GABARITO · IoU ${(r.iou * 100).toFixed(1)}% (piso ${(PISO_IOU * 100).toFixed(0)}%) · peça de ${r.trisPeca} tri · caixa recorta ${r.recorta} (${r.intrusos} intrusos), aprovada ${r.aprovadaRecorta}, de ${r.triangulos}`);
  console.log(`      derivada  min ${cx(r.min)}  max ${cx(r.max)}`);
  console.log(`      aprovada  min ${cx(GABARITO[id].min)}  max ${cx(GABARITO[id].max)}`);
}

if (JSON_OUT) console.log(JSON.stringify(medido, null, 2));
console.log(reprovas
  ? `\n  A derivação NÃO reproduz o gabarito. Ela não vale para as outras armas.\n`
  : `\n  Derivação confere com as ${Object.keys(GABARITO).length} aprovadas.\n`);
process.exit(reprovas ? 1 : 0);
