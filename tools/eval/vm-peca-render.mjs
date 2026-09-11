#!/usr/bin/env node
/* ============================================================================
   vm-peca-render.mjs — A ARMA SOZINHA, COM A PEÇA CANDIDATA PINTADA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Em 11/09 o recorte por componente conexo foi ligado em três armas e TODOS os
   números ficaram verdes — carga visível, via de fixação, malha na tela, régua de
   consistência de 14/19 para 17/19. A foto no jogo mostrou que na `carbine` a
   peça pendurada no osso do carregador era a **alavanca**. Contagem de vértice
   não sabe o que é um carregador.

   Mas a foto NO JOGO também não resolve: a `awp` ocupa a borda direita inteira e
   a peça fica escondida atrás do receptor; nos cinco quadros dela não aparece
   vermelho nenhum. Enquadramento ruim de viewmodel impede o julgamento da peça —
   são dois defeitos diferentes e um esconde o outro.

   Esta ferramenta tira a arma da cena: monta `weaponModel(id)` numa cena própria,
   pinta o componente que a regra escolheria, e renderiza de lado, de baixo e de
   trás, em fundo liso. É a figura que a lei 3 pede, sem o jogo no caminho.

   USO
     node tools/eval/vm-peca-render.mjs --armas=ak,awp,deagle --porta=4361
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || 'ak,awp,deagle,carbine').split(',').filter(Boolean);
const SAIDA = arg('saida', 'artifacts/pente-bug90/pecas');

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
await page.goto(`${BASE}/?debug=1&auto=E&map=brasilia&armaslazy=0`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });

const resultado = await page.evaluate(async (armas) => {
  const mapa = JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
  const W = await import(mapa['./js/weapons.js'] || Object.values(mapa).find((u) => /\/weapons\.js\?/.test(u)));
  const THREE = await import(mapa.three);
  const saida = {};

  const PECA_FRACAO_MIN = 0.01;
  const PECA_FRACAO_MAX = 0.15;
  const PECA_Z_MIN = -0.12;
  const PECA_Z_MAX = 0.35;

  const lona = document.createElement('canvas');
  lona.width = 900; lona.height = 300;
  const rnd = new THREE.WebGLRenderer({ canvas: lona, antialias: true, preserveDrawingBuffer: true });
  rnd.setClearColor(0x202428, 1);

  for (const id of armas) {
    try {
      if (!W.hasWeapon(id)) await W.preloadWeapons([id]);
      const wrap = W.weaponModel(id);
      if (!wrap) { saida[id] = { erro: 'sem malha' }; continue; }
      wrap.updateMatrixWorld(true);
      const norm = wrap.scale.x || 1;
      const mesh = wrap.getObjectByProperty('isMesh', true);
      const fonte = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = fonte.attributes.position;
      const toGun = wrap.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
      const v = new THREE.Vector3();

      const Q = 1e5;
      const pai = new Map();
      const achar = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
      const unir = (a, b) => { a = achar(a); b = achar(b); if (a !== b) pai.set(a, b); };
      const ks = []; const cen = [];
      for (let i = 0; i + 2 < pos.count; i += 3) {
        const t = [];
        let cx = 0; let cy = 0; let cz = 0;
        for (let k = 0; k < 3; k += 1) {
          v.fromBufferAttribute(pos, i + k).applyMatrix4(toGun);
          t.push(`${Math.round(v.x * Q)},${Math.round(v.y * Q)},${Math.round(v.z * Q)}`);
          cx += v.x; cy += v.y; cz += v.z;
        }
        for (const k of t) if (!pai.has(k)) pai.set(k, k);
        ks.push(t); cen.push([cx / 3, cy / 3, cz / 3]);
      }
      for (const t of ks) { unir(t[0], t[1]); unir(t[0], t[2]); }
      const grupo = new Map();
      ks.forEach((t, i) => {
        const r = achar(t[0]);
        let e = grupo.get(r);
        if (!e) { e = { tris: [], yMin: Infinity, zMin: Infinity, zMax: -Infinity }; grupo.set(r, e); }
        e.tris.push(i);
        const c = cen[i];
        if (c[1] * norm < e.yMin) e.yMin = c[1] * norm;
        if (c[2] * norm < e.zMin) e.zMin = c[2] * norm;
        if (c[2] * norm > e.zMax) e.zMax = c[2] * norm;
      });
      let peca = null;
      for (const e of grupo.values()) {
        const f = e.tris.length / ks.length;
        if (f < PECA_FRACAO_MIN || f > PECA_FRACAO_MAX) continue;
        const cz = (e.zMin + e.zMax) / 2;
        if (cz < PECA_Z_MIN || cz > PECA_Z_MAX) continue;
        if (!peca || e.yMin < peca.yMin) peca = e;
      }

      // Pinta os triângulos da peça por cor de vértice: não mexe na malha nem no
      // material do jogo, e a figura mostra exatamente o que seria recortado.
      const n = pos.count;
      const cor = new Float32Array(n * 3);
      const daPeca = new Set(peca ? peca.tris : []);
      for (let t = 0; t * 3 < n; t += 1) {
        const q = daPeca.has(t) ? [1, 0.12, 0.08] : [0.72, 0.72, 0.74];
        for (let k = 0; k < 3; k += 1) {
          cor[(t * 3 + k) * 3] = q[0]; cor[(t * 3 + k) * 3 + 1] = q[1]; cor[(t * 3 + k) * 3 + 2] = q[2];
        }
      }
      fonte.setAttribute('color', new THREE.BufferAttribute(cor, 3));

      const cena = new THREE.Scene();
      const malha = new THREE.Mesh(fonte, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 }));
      cena.add(malha);
      cena.add(new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(1, 2, 1.5); cena.add(sol);

      const caixa = new THREE.Box3().setFromObject(malha);
      const alvo = caixa.getCenter(new THREE.Vector3());
      const raio = caixa.getSize(new THREE.Vector3()).length() / 2;
      const cam = new THREE.PerspectiveCamera(35, 900 / 300, 0.01, 100);
      const vistas = { lado: [0, 0.12, 1], baixo: [0, -1, 0.25], tras: [1, 0.15, 0.1] };
      const fotos = {};
      for (const [nome, d] of Object.entries(vistas)) {
        const dir = new THREE.Vector3(...d).normalize();
        cam.position.copy(alvo).addScaledVector(dir, raio * 3.1);
        cam.up.set(0, nome === 'baixo' ? 0 : 1, nome === 'baixo' ? 1 : 0);
        cam.lookAt(alvo);
        rnd.render(cena, cam);
        fotos[nome] = lona.toDataURL('image/png');
      }
      saida[id] = { trisPeca: peca ? peca.tris.length : 0, componentes: grupo.size, total: ks.length, fotos };
    } catch (e) { saida[id] = { erro: String(e).slice(0, 120) }; }
  }
  return saida;
}, ARMAS);

await browser.close();

for (const [id, r] of Object.entries(resultado)) {
  if (r.erro) { console.log(`  ✗ ${id.padEnd(10)} ${r.erro}`); continue; }
  for (const [vista, url] of Object.entries(r.fotos)) {
    const f = path.join(SAIDA, `${id}-${vista}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(`  ${id.padEnd(10)} peça ${r.trisPeca} tri de ${r.total} · ${r.componentes} componentes · 3 vistas`);
}
console.log(`\n  figuras em ${SAIDA}\n`);
