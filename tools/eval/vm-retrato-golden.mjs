#!/usr/bin/env node
/* ============================================================================
   vm-retrato-golden.mjs — A ARMA GOLDEN ISOLADA, COM A PEÇA DO OSSO DO PENTE
   PINTADA. É A FIGURA QUE O CRÍTICO JULGA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Em 11/09/2026 o dono jogou e listou, arma a arma: *"recarregar tira o cano,
   não o carregador"* em svd, sks, md97, mosin, lmg, scar e p90; *"tira o
   trigger"* em famas e mp5; *"tira o coldre de trás"* em shotgun e carbine. Todas
   as réguas de CONTAGEM desta casa estavam VERDES nessas armas — elas contavam
   vértices presos ao osso sem saber se a peça era um carregador.

   Esta ferramenta mostra a peça. Carrega o GLB golden DIRETO (sem subir o jogo
   por arma), tinge de vermelho os vértices presos a um osso `Mag*` e renderiza
   em fundo liso, de lado, de baixo e de três quartos.

   POR QUE NÃO EM BLENDER
   Foi tentado e falhou três vezes: o filtro de mão por nome deixava braços na
   figura (o importador nomeia pelo NÓ, não pela malha), e o enquadramento errava
   porque a caixa vinha da pose de repouso enquanto a malha renderizava deformada
   pela armadura. O renderizador da página já tinha produzido figuras legíveis no
   mesmo dia; insistir no outro era girar.

   USO
     node tools/eval/vm-retrato-golden.mjs --porta=4361
     node tools/eval/vm-retrato-golden.mjs --porta=4361 --armas=ak,m4
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const SAIDA = arg('saida', 'artifacts/retrato-golden');
const DIR = arg('dir', 'public/models/viewmodels/coro');
const SO = (arg('armas', '') || '').split(',').filter(Boolean);

const armas = fs.readdirSync(DIR).filter((f) => f.endsWith('.glb'))
  .map((f) => ({ nome: f.replace(/-hires\.glb$|\.glb$/, ''), url: `/${DIR.replace(/^public\//, '')}/${f}` }))
  .filter((a) => !SO.length || SO.includes(a.nome)).sort((a, b) => a.nome.localeCompare(b.nome));

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 460 } });
// A página do jogo só serve para dar Three e o GLTFLoader; nada é jogado aqui.
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => Boolean(document.querySelector('script[type="importmap"]')), null, { timeout: 60000 });

const saida = await page.evaluate(async (lista) => {
  const mapa = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  const THREE = await import(mapa.three);
  const { GLTFLoader } = await import(`${mapa['three/addons/']}loaders/GLTFLoader.js`);
  const carregador = new GLTFLoader();
  const lona = document.createElement('canvas');
  lona.width = 1100; lona.height = 460;
  const rnd = new THREE.WebGLRenderer({ canvas: lona, antialias: true, preserveDrawingBuffer: true });
  rnd.setClearColor(0x1a1e24, 1);
  const res = {};

  const MAO = /glove|sleeve|hand|arm|cloth|skin/i;
  for (const { nome, url } of lista) {
    try {
      const gltf = await carregador.loadAsync(url);
      const cena = new THREE.Scene();
      let presos = 0;
      const malhas = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const rotulo = `${o.name} ${o.geometry?.name || ''} ${mats.map((m) => m?.name || '').join(' ')}`;
        if (MAO.test(rotulo)) return;   // fora braços e luvas
        malhas.push(o);
      });
      if (!malhas.length) { res[nome] = { erro: 'sem malha de arma' }; continue; }

      for (const o of malhas) {
        const g = o.geometry.clone();
        const n = g.attributes.position.count;
        const cor = new Float32Array(n * 3);
        cor.fill(0.68);
        const idx = g.attributes.skinIndex; const w = g.attributes.skinWeight;
        if (idx && w && o.isSkinnedMesh) {
          const alvos = new Set();
          o.skeleton.bones.forEach((b, i) => {
            if (/^mag/i.test(b.name || '')) alvos.add(i);
          });
          const ai = idx.array; const aw = w.array; const passo = idx.itemSize;
          for (let v = 0; v < n; v += 1) {
            for (let c = 0; c < passo; c += 1) {
              if (alvos.has(ai[v * passo + c]) && aw[v * w.itemSize + c] > 0.01) {
                cor[v * 3] = 0.88; cor[v * 3 + 1] = 0.08; cor[v * 3 + 2] = 0.06;
                presos += 1;
                break;
              }
            }
          }
        }
        g.setAttribute('color', new THREE.BufferAttribute(cor, 3));
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.12 }));
        m.applyMatrix4(o.matrixWorld);
        cena.add(m);
      }
      cena.add(new THREE.HemisphereLight(0xffffff, 0x33383f, 2.4));
      const sol = new THREE.DirectionalLight(0xffffff, 1.9); sol.position.set(1.2, 2, 1.4); cena.add(sol);

      /* O GLB do viewmodel vive no espaço do rig doador, onde **+Y é para BAIXO
         no mundo** (`build_ak_hires_pilot.py`: "Donor local +Y maps to world
         DOWN"). Desenhar com +Y para cima põe TODAS as armas de cabeça para
         baixo — e faz o pente da AK apontar para cima na figura, o que quase me
         levou a inventar um defeito de rolagem que não existe. */
      /* NÃO inverter Y aqui: tentado em 11/09 e o `scale.y = -1` espelha na
         horizontal (determinante negativo), não vira na vertical. O julgamento é
         RELATIVO à ak de qualquer jeito, e ela está na mesma convenção. */
      const caixa = new THREE.Box3().setFromObject(cena);
      const centro = caixa.getCenter(new THREE.Vector3());
      const raio = Math.max(1e-3, caixa.getSize(new THREE.Vector3()).length() / 2);
      const cam = new THREE.PerspectiveCamera(32, 1100 / 460, 0.001, 100);
      /* A câmera tem de ficar PERPENDICULAR ao eixo longo da arma — descoberto
         medindo, não fixo: na primeira tentativa a vista de "lado" olhava pela
         boca do cano e a AK saía como um risco vertical. */
      const tam = caixa.getSize(new THREE.Vector3());
      const eixo = tam.x >= tam.y && tam.x >= tam.z ? 0 : (tam.y >= tam.z ? 1 : 2);
      const perp = eixo === 0 ? [0, 0, 1] : eixo === 1 ? [1, 0, 0] : [1, 0, 0];
      const cima = eixo === 1 ? [0, 0, 1] : [0, 1, 0];
      const mistura = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
      const vistas = {
        lado: mistura(perp, cima, 0.08),
        baixo: cima.map((v) => -v * 1.0).map((v, i) => v + perp[i] * 0.22),
        tres: mistura(perp, cima, 0.32).map((v, i) => v + (eixo === 2 ? [0, 0, 0.55][i] : 0)),
      };
      const fotos = {};
      for (const [v, d] of Object.entries(vistas)) {
        const dir = new THREE.Vector3(...d).normalize();
        cam.position.copy(centro).addScaledVector(dir, raio * 2.9);
        cam.up.set(...(v === 'baixo' ? (eixo === 2 ? [0, 0, 1] : [0, 0, 1]) : cima));
        cam.lookAt(centro);
        rnd.render(cena, cam);
        fotos[v] = lona.toDataURL('image/png');
      }
      res[nome] = { presos, malhas: malhas.length, fotos };
    } catch (e) { res[nome] = { erro: String(e).slice(0, 120) }; }
  }
  return res;
}, armas);

await browser.close();
for (const [nome, r] of Object.entries(saida)) {
  if (r.erro) { console.log(`  ✗ ${nome.padEnd(11)} ${r.erro}`); continue; }
  for (const [v, url] of Object.entries(r.fotos)) {
    fs.writeFileSync(path.join(SAIDA, `${nome}-${v}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(`  ${nome.padEnd(11)} ${String(r.presos).padStart(5)} vértices no osso do pente · ${r.malhas} malhas de arma · 3 vistas`);
}
console.log(`\n  figuras em ${SAIDA}\n`);
