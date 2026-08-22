/* char-result-stills.mjs — artes de vitória/derrota dos personagens, renderizadas
   do MESMO GLB que o jogo monta (buildCharacterModel), com alpha de verdade.

   POR QUE EXISTE: o lote de 44 (commits ef0a392/6975586) não deixou ferramenta
   commitada — só os webp e o hash no redesign-static-audit.json. O BUG-59
   acrescentou 18 personagens e a UIA1/UIA19 cobram o lote completo. Este script
   é a reconstrução do pipeline: mesma luz do preview da seleção (cópia do rig
   documentado no canarinho-icon.mjs), pose idle assentada como o mounttest faz
   (ctrl._to('idle') + updates), renderer alpha único para o lote inteiro.

   CONVENÇÃO DO LOTE EXISTENTE (medida, não assumida): os 44 pares
   <id>-vitoria.webp/<id>-derrota.webp são byte-idênticos (shasum 44/44) — a arte
   é uma por personagem, publicada nos dois nomes. Este script segue a mesma
   convenção: renderiza UMA arte e copia.

   ENQUADRAMENTO (UIA19): 1024×1536 com alpha; alvo medido nas artes existentes:
   top ~0.089 · bottom ~0.037 · right ~0.045 · uso vertical ~0.87, figura ancorada
   à direita-embaixo (o CSS do resultado ancora right bottom/contain).

   Uso (um browser por vez — com with-browser-lock):
     BASE=http://127.0.0.1:8124 sh tools/eval/with-browser-lock.sh \
       node tools/eval/char-result-stills.mjs [id1 id2 ...]      # default: os 18 do BUG-59
 */
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'bandeirante', 'boto', 'camera-roxa', 'cuca', 'curupira', 'designer-ux',
  'doidinho-bairro', 'gilbomes', 'lampiao', 'lenda-lanhouse', 'lobisomem',
  'mariabonita', 'microfonildo', 'motoca-cachorro-loko', 'profeta-calcada',
  'programador-virado', 'saci', 'zumbi',
];

/* Alvo de composição medido nas 44 artes existentes (bug59-calibra.mjs). */
const CANVAS_W = 1024, CANVAS_H = 1536;
const FIG_H = 1342;          // 1536 × 0.874 (uso vertical medido ~0.87-0.89)
const MARGIN_TOP = 137;      // 1536 × 0.089
const MARGIN_RIGHT = 24;     // ~1024 × 0.023 — o quantile .998 da régua descarta até
                             // ~50px de conteúdo esparso (ponta de arma/cauda do lobisomem)

/* Margens aceitas pela UIA19 — se a arte cair fora, o script reprova sozinho. */
const LIMITES = { top: [.015, .20], bottom: [.015, .20], left: [.015, .65], right: [.015, .08], uso: .72 };

const gRoot = execSync('npm root -g').toString().trim();
const { default: pw } = await import(`${gRoot}/playwright/index.js`).catch(() => ({ default: null }));
const chromiumMod = pw?.chromium || chromium;

const browser = await chromiumMod.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => { throw new Error(`[pageerror] ${e.message}`); });
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1500);

/* Toda a montagem/render acontece NA PÁGINA (import map do jogo); o Node só
   recebe PNG base64 e compõe com sharp. */
await page.evaluate(() => {
  const P = {};
  window.__stills = P;
  P.init = async () => {
    P.THREE = await import('three');
    P.G = await import('./js/glbchars.js');
    P.C = await import('./js/characters.js');
    P.scene = new P.THREE.Scene();
    /* Mesmo rig de luz do preview da seleção (ver canarinho-icon.mjs cena()). */
    P.scene.add(new P.THREE.HemisphereLight(0xffe6c0, 0x5a4a38, 1.05));
    const key = new P.THREE.DirectionalLight(0xffe8c0, 2.1); key.position.set(2.6, 4.2, 3.6); P.scene.add(key);
    const rim = new P.THREE.DirectionalLight(0x9ec0ff, 1.35); rim.position.set(-3.4, 2.6, -2.0); P.scene.add(rim);
    const rim2 = new P.THREE.DirectionalLight(0xffb066, 0.7); rim2.position.set(3.4, 2.0, -2.6); P.scene.add(rim2);
    P.canvas = document.createElement('canvas');
    P.rend = new P.THREE.WebGLRenderer({ canvas: P.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    P.rend.outputColorSpace = P.THREE.SRGBColorSpace;
    P.rend.toneMapping = P.THREE.ACESFilmicToneMapping;
  };
  /* Caixa do que a GPU desenha (cópia do caixaVisivel do canarinho-icon: bbox de
     geometria não segue esqueleto; sombra/hitbox invisíveis ficam de fora). */
  P.caixa = (grupo) => {
    const THREE = P.THREE;
    const bb = new THREE.Box3(); const tmp = new THREE.Box3();
    grupo.updateMatrixWorld(true);
    grupo.traverse((o) => {
      if (!o.isMesh || !o.visible || (o.material && o.material.visible === false)) return;
      for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
      if (!o.geometry) return;
      if (o.isSkinnedMesh) {
        const pos = o.geometry.attributes.position, v = new THREE.Vector3();
        const step = Math.max(1, Math.ceil(pos.count / 8000));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v);
          bb.expandByPoint(o.localToWorld(v));
        }
      } else { tmp.setFromObject(o); bb.union(tmp); }
    });
    return bb;
  };
  P.quadro = async (id) => {
    const THREE = P.THREE;
    const def = P.C.CHARACTERS.find((c) => c.id === id);
    if (!def) throw new Error(`id desconhecido: ${id}`);
    await P.G.preloadCharacterAssets([id]);
    const wid = P.C.charWeapon(id);
    const built = P.G.buildCharacterModel(def, { weaponId: wid });
    if (!built || !built.group) throw new Error(`sem modelo para ${id}`);
    if (built.ctrl && built.ctrl.shadow) built.ctrl.shadow.visible = false;
    if (built.ctrl && built.ctrl._to) built.ctrl._to('idle');
    /* 96 updates ≈ 3,2s a 30fps: mesmo tempo de assentamento do vídeo de seleção. */
    for (let i = 0; i < 96; i++) if (built.ctrl) built.ctrl.update(1 / 30, 0, false, 0);
    built.group.updateMatrixWorld(true);
    P.scene.add(built.group);
    const bb = P.caixa(built.group);
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
    /* O caixa() (bbox por esqueleto) subestima a largura em alguns rigs Mint
       (bandeirante/cuca/lobisomem/microfonildo saíam cortados na borda): primeira
       passada com 1,6× de folga; se o conteúdo ainda toca borda, 2,4× e de novo.
       O trim exato vem depois, no Node, pelo alpha renderizado. */
    const renderCom = (escala) => {
      const halfH = (bb.max.y - bb.min.y) * 0.56 * escala;
      const halfW = Math.max((bb.max.x - bb.min.x) * 0.56, halfH * 0.8) * escala;
      const cam = new THREE.OrthographicCamera(cx - halfW, cx + halfW, cy + halfH, cy - halfH, 0.01, 100);
      cam.position.set(cx, cy, 6); cam.lookAt(cx, cy, 0);
      const W = 1000, H = Math.round((1000 * (halfH * 2)) / (halfW * 2));
      P.canvas.width = W; P.canvas.height = H;
      P.rend.setSize(W, H, false);
      P.rend.setClearColor(0x000000, 0);
      P.rend.render(P.scene, cam);
      /* canvas WebGL não dá getContext('2d'): lê via canvas 2D de blitz. */
      const c2 = P.probe || (P.probe = document.createElement('canvas'));
      c2.width = W; c2.height = H;
      const ctx = c2.getContext('2d');
      ctx.drawImage(P.canvas, 0, 0);
      const img = ctx.getImageData(0, 0, W, H).data;
      const toca = (step) => {
        for (let x = 0; x < W; x += step) {
          if (img[(0 * W + x) * 4 + 3] > 8 || img[((H - 1) * W + x) * 4 + 3] > 8) return true;
        }
        for (let y = 0; y < H; y += step) {
          if (img[(y * W) * 4 + 3] > 8 || img[(y * W + W - 1) * 4 + 3] > 8) return true;
        }
        return false;
      };
      return { url: P.canvas.toDataURL('image/png'), tocaBorda: toca(4) };
    };
    let r = renderCom(1.6);
    if (r.tocaBorda) r = renderCom(2.4);
    if (r.tocaBorda) r = renderCom(3.5);
    const url = r.url;
    P.scene.remove(built.group);
    return url;
  };
});
await page.evaluate(() => window.__stills.init());

async function alphaBounds(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = new Uint32Array(info.width), rows = new Uint32Array(info.height);
  let total = 0;
  for (let y = 0, p = 3; y < info.height; y++) {
    for (let x = 0; x < info.width; x++, p += info.channels) {
      if (data[p] <= 8) continue;
      cols[x]++; rows[y]++; total++;
    }
  }
  const quantile = (hist, q) => {
    const target = total * q; let acc = 0;
    for (let i = 0; i < hist.length; i++) { acc += hist[i]; if (acc >= target) return i; }
    return hist.length - 1;
  };
  return {
    left: quantile(cols, .002) / info.width,
    right: (info.width - 1 - quantile(cols, .998)) / info.width,
    top: quantile(rows, .002) / info.height,
    bottom: (info.height - 1 - quantile(rows, .998)) / info.height,
    total,
  };
}

/* Trim manual por bbox de alpha>8: o .trim() do sharp 0.35.3 é no-op/parcial com
   fundo transparente (medido: PNG sintético 300×300 com quadrado central volta
   300×300), o que deixava bandeirante/cuca/lobisomem/microfonildo com o canvas
   inteiro e uso vertical < 0.72 na UIA19. Mesmo limiar da alphaBounds da régua. */
async function trimAlpha(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0, p = 3; y < info.height; y++) {
    for (let x = 0; x < info.width; x++, p += info.channels) {
      if (data[p] <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('quadro sem conteúdo');
  const pad = 2;
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  return sharp(buf).extract({
    left, top,
    width: Math.min(info.width - left, maxX - minX + 1 + pad * 2),
    height: Math.min(info.height - top, maxY - minY + 1 + pad * 2),
  }).png().toBuffer();
}

mkdirSync(join(ROOT, 'public/img/resultado'), { recursive: true });
let ruins = 0;
for (const id of IDS) {
  const url = await page.evaluate((x) => window.__stills.quadro(x), id);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  const fig = await sharp(await trimAlpha(buf)).resize({ height: FIG_H, width: 963, fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  const meta = await sharp(fig).metadata();
  const left = Math.max(15, CANVAS_W - MARGIN_RIGHT - meta.width);
  const top = MARGIN_TOP + Math.max(0, FIG_H - meta.height) / 2;
  const vitoria = join(ROOT, `public/img/resultado/${id}-vitoria.webp`);
  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fig, left: Math.round(left), top: Math.round(top) }])
    .webp({ quality: 88, alphaQuality: 100 }).toFile(vitoria);
  copyFileSync(vitoria, join(ROOT, `public/img/resultado/${id}-derrota.webp`));
  const b = await alphaBounds(readFileSync(vitoria));
  const uso = 1 - b.top - b.bottom;
  const fora = b.top < LIMITES.top[0] || b.top > LIMITES.top[1]
    || b.bottom < LIMITES.bottom[0] || b.bottom > LIMITES.bottom[1]
    || b.left < LIMITES.left[0] || b.left > LIMITES.left[1]
    || b.right < LIMITES.right[0] || b.right > LIMITES.right[1]
    || uso < LIMITES.uso;
  if (fora) ruins++;
  console.log(`${fora ? '✗' : '✓'} ${id} ${meta.width}×${meta.height}@fig margens t/b/l/r=${[b.top, b.bottom, b.left, b.right].map((v) => v.toFixed(3)).join('/')} uso=${uso.toFixed(3)} ${Math.round(statSync(vitoria).size / 1024)}KB`);
}
await browser.close();
if (ruins) { console.error(`${ruins} artes fora dos limites UIA19`); process.exit(1); }
console.log('FIM');
