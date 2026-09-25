#!/usr/bin/env node
/* ============================================================================
   vm-regua-arma.mjs — A ARMA EM VISTA ORTOGRÁFICA CALIBRADA: PIXEL VIRA COORDENADA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   A caixa do carregador precisa ser autorada por arma (quatro tentativas de achar
   o pente automaticamente deram quatro peças erradas — ver BUG-90). Mas autorar
   lendo o perfil de profundidade em ASCII é chute: em 12/09 a caixa da mp5 saiu
   larga, a da scar estreita e a da uzi funda, e a da m92 não mudou nada.

   O que faltava era um instrumento que traduzisse figura em coordenada. Esta
   vista é ORTOGRÁFICA e enquadrada EXATAMENTE na caixa da arma no eixo longo:
   a borda esquerda da imagem é `xmin`, a direita é `xmax`, e a relação é linear.
   Então "o carregador começa a 46% da largura" vira `x` com uma regra de três —
   e quem lê a fração pode ser um crítico de contexto limpo, que é bom nisso e não
   tem interesse no resultado.

   USO
     node tools/eval/vm-regua-arma.mjs --porta=4361 --armas=m92,mp5,svd
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const DIR = arg('dir', 'public/models/weapons');
const SAIDA = arg('saida', 'artifacts/regua-arma');
const SO = (arg('armas', '') || '').split(',').filter(Boolean);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 400 } });
// `domcontentloaded` basta: esta ferramenta só precisa do import map, e esperar
// o `load` da página do jogo inteira dava timeout com o rasterizador carregado.
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => Boolean(document.querySelector('script[type="importmap"]')), null, { timeout: 60000 });

const armas = fs.readdirSync(DIR).filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace(/\.glb$/, ''))
  .filter((a) => !SO.length || SO.includes(a)).sort();

const res = await page.evaluate(async ([lista, dir]) => {
  const mapa = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  const THREE = await import(mapa.three);
  const { GLTFLoader } = await import(`${mapa['three/addons/']}loaders/GLTFLoader.js`);
  const carregador = new GLTFLoader();
  const lona = document.createElement('canvas');
  lona.width = 1200; lona.height = 400;
  const rnd = new THREE.WebGLRenderer({ canvas: lona, antialias: true, preserveDrawingBuffer: true });
  rnd.setClearColor(0x12161c, 1);
  const saida = {};
  for (const nome of lista) {
    try {
      const gltf = await carregador.loadAsync(`/${dir.replace(/^public\//, '')}/${nome}.glb`);
      const cena = new THREE.Scene();
      gltf.scene.updateMatrixWorld(true);
      cena.add(gltf.scene);
      cena.add(new THREE.HemisphereLight(0xffffff, 0x30353c, 2.6));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(0.4, 1.6, 1.2); cena.add(sol);
      const caixa = new THREE.Box3().setFromObject(cena);
      const tam = caixa.getSize(new THREE.Vector3());
      const centro = caixa.getCenter(new THREE.Vector3());
      /* Ortográfica enquadrada na caixa: sem perspectiva, a fração da largura da
         imagem É a fração ao longo da arma. É isso que torna a figura mensurável. */
      const meia = tam.x / 2;
      const cam = new THREE.OrthographicCamera(-meia, meia, meia * (400 / 1200), -meia * (400 / 1200), 0.001, 100);
      cam.position.set(centro.x, centro.y, centro.z + Math.max(tam.y, tam.z) * 3 + 1);
      cam.up.set(0, 1, 0);
      cam.lookAt(centro);
      rnd.render(cena, cam);
      saida[nome] = {
        foto: lona.toDataURL('image/png'),
        xmin: +caixa.min.x.toFixed(4), xmax: +caixa.max.x.toFixed(4),
        ymin: +caixa.min.y.toFixed(4), ymax: +caixa.max.y.toFixed(4),
      };
      cena.remove(gltf.scene);
    } catch (e) { saida[nome] = { erro: String(e).slice(0, 100) }; }
  }
  return saida;
}, [armas, DIR]);

await browser.close();
const mapa = {};
for (const [nome, r] of Object.entries(res)) {
  if (r.erro) { console.log(`  ✗ ${nome.padEnd(11)} ${r.erro}`); continue; }
  fs.writeFileSync(path.join(SAIDA, `${nome}.png`), Buffer.from(r.foto.split(',')[1], 'base64'));
  mapa[nome] = { xmin: r.xmin, xmax: r.xmax, ymin: r.ymin, ymax: r.ymax };
  console.log(`  ${nome.padEnd(11)} x[${r.xmin}, ${r.xmax}]  y[${r.ymin}, ${r.ymax}]  ← borda esquerda da imagem = xmin, direita = xmax`);
}
fs.writeFileSync(path.join(SAIDA, 'escala.json'), JSON.stringify(mapa, null, 2));
console.log(`\n  figuras e escala em ${SAIDA}\n`);
