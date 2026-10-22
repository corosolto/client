#!/usr/bin/env node
/* ============================================================================
   pose-verdade.mjs — O EXTRATOR DE VÍDEO RECONSTRÓI UMA ANIMAÇÃO QUE EU CONHEÇO?
   ----------------------------------------------------------------------------
   Antes de pedir pra alguém dançar na frente da câmera, o pipeline tem que provar
   que funciona com VERDADE CONHECIDA: renderizamos um clipe que já existe no jogo
   (walk/run), guardamos a direção real de cada osso quadro a quadro, passamos o
   vídeo pelo `tools/video-pose.py` e comparamos — erro em GRAUS por osso.

   Se não reconstrói uma animação fabricada por nós, não vai reconstruir ninguém
   dançando, e a filmagem seria desperdiçada.

   Uso:  node tools/eval/pose-verdade.mjs [--clipe=walk] [--seg=4]
   Saída: /tmp/pose-verdade/{video.mp4, verdade.json, medido.json} + relatório.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (nome, padrao) => {
  const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.split('=')[1] : padrao;
};
const CLIPE = arg('clipe', 'walk');
const CHAR = arg('char', '');
const SEG = Number(arg('seg', 4));
const FPS = 30;
const SAIDA = '/tmp/pose-verdade';
const PY = process.env.PY || '/opt/homebrew/bin/python3.10';
const BASE_EXTERNA = process.env.BASE;
const PORTA = process.env.PORTA || '9371';
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;

mkdirSync(SAIDA, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const STUB = 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + 'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 } });
const page = await ctx.newPage();
await page.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2500);

/* ---- renderiza o clipe de frente, guardando a direção real de cada osso ---- */
const captura = await page.evaluate(async ({ clipe, fps, seg, quero }) => {
  const T = await import('/vendor/three.module.js');
  const gc = await import('/js/glbchars.js');
  const ch = await import('/js/characters.js');
  const def = (quero && ch.CHARACTERS.find((c) => c.id === quero && gc.GLB_CHARS.has(c.id))) || ch.CHARACTERS.find((c) => gc.GLB_CHARS.has(c.id));
  await gc.preloadCharacterAssets([def.id]);
  const W = 540, H = 960;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H, false); r.setClearColor(0x202428, 1);
  const sc = new T.Scene();
  sc.add(new T.HemisphereLight(0xffffff, 0x707070, 1.4));
  const key = new T.DirectionalLight(0xffffff, 1.8); key.position.set(1, 4, 4); sc.add(key);
  const cam = new T.PerspectiveCamera(32, W / H, 0.1, 20); cam.position.set(0, 1.0, 3.6); cam.lookAt(0, 0.95, 0);
  const m = gc.buildCharacterModel(def, { weapon: false });
  m.group.rotation.y = Math.PI;        // de FRENTE pra câmera, como o dançarino estará
  sc.add(m.group);
  const ossos = {};
  m.group.traverse((o) => { if (o.isBone) ossos[o.name] = o; });
  const PARES = {
    RightArm: ['RightArm', 'RightForeArm'], RightForeArm: ['RightForeArm', 'RightHand'],
    LeftArm: ['LeftArm', 'LeftForeArm'], LeftForeArm: ['LeftForeArm', 'LeftHand'],
    RightUpLeg: ['RightUpLeg', 'RightLeg'], RightLeg: ['RightLeg', 'RightFoot'],
    LeftUpLeg: ['LeftUpLeg', 'LeftLeg'], LeftLeg: ['LeftLeg', 'LeftFoot'],
    Spine01: ['Hips', 'Spine01'], Head: ['Spine02', 'Head'],
  };
  const dir = (a, b) => {
    m.group.updateMatrixWorld(true);
    const pa = ossos[a].getWorldPosition(new T.Vector3());
    const pb = ossos[b].getWorldPosition(new T.Vector3());
    // o personagem está girado 180°: convertemos pro quadro do CORPO (X direita do
    // boneco, Z frente do boneco), que é o mesmo do extrator de vídeo
    const d = pb.sub(pa).normalize();
    return [-d.x, d.y, -d.z];
  };
  // trava o clipe pedido e roda a animação em passo fixo
  m.ctrl._to(clipe);
  for (let i = 0; i < 30; i++) m.ctrl.update(1 / fps, 1, false, 1.2);
  const quadros = [], verdade = [];
  const total = Math.round(fps * seg);
  for (let i = 0; i < total; i++) {
    m.ctrl.update(1 / fps, 1, false, 1.2);
    m.ctrl._to(clipe);
    r.render(sc, cam);
    quadros.push(cv.toDataURL('image/png'));
    verdade.push(Object.keys(PARES).map((k) => dir(PARES[k][0], PARES[k][1])));
  }
  return { quadros, verdade, ossos: Object.keys(PARES), charId: def.id };
}, { clipe: CLIPE, fps: FPS, seg: SEG, quero: CHAR });

await ctx.close();
await browser.close();

mkdirSync(`${SAIDA}/quadros`, { recursive: true });
captura.quadros.forEach((d, i) => {
  writeFileSync(`${SAIDA}/quadros/${String(i).padStart(4, '0')}.png`, Buffer.from(d.split(',')[1], 'base64'));
});
writeFileSync(`${SAIDA}/verdade.json`, JSON.stringify({ ossos: captura.ossos, direcoes: captura.verdade }));
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${SAIDA}/quadros/%04d.png -c:v libx264 -pix_fmt yuv420p ${SAIDA}/video.mp4`);
console.log(`vídeo de ${captura.quadros.length} quadros (${captura.charId}, clipe ${CLIPE}) em ${SAIDA}/video.mp4`);

/* ---- passa pelo extrator e compara ---- */
execSync(`${PY} tools/video-pose.py ${SAIDA}/video.mp4 ${SAIDA}/medido.json`, { stdio: 'inherit' });
const medido = JSON.parse(readFileSync(`${SAIDA}/medido.json`, 'utf8'));
const verdade = JSON.parse(readFileSync(`${SAIDA}/verdade.json`, 'utf8'));

const n = Math.min(medido.quadros, verdade.direcoes.length);
const anguloEntre = (a, b) => {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(d) * 180) / Math.PI;
};
const porOsso = {};
for (const nome of verdade.ossos) porOsso[nome] = [];
for (let i = 0; i < n; i++) {
  for (let j = 0; j < verdade.ossos.length; j++) {
    const nome = verdade.ossos[j];
    const k = medido.ossos.indexOf(nome);
    if (k < 0) continue;
    porOsso[nome].push(anguloEntre(verdade.direcoes[i][j], medido.direcoes[i][k]));
  }
}
const linhas = Object.entries(porOsso).filter(([, v]) => v.length).map(([nome, v]) => {
  const med = v.reduce((s, x) => s + x, 0) / v.length;
  const p90 = v.slice().sort((a, b) => a - b)[Math.floor(v.length * 0.9)];
  return { nome, medio: med, p90 };
});
console.log(`\n  erro de reconstrução (${n} quadros, confiança ${medido.confianca}):`);
for (const l of linhas.sort((a, b) => b.medio - a.medio)) {
  console.log(`    ${l.nome.padEnd(14)} médio ${l.medio.toFixed(1).padStart(5)}°   p90 ${l.p90.toFixed(1).padStart(5)}°`);
}
const geral = linhas.reduce((s, l) => s + l.medio, 0) / linhas.length;
const pior = Math.max(...linhas.map((l) => l.medio));
console.log(`\n  média geral ${geral.toFixed(1)}° · pior osso ${pior.toFixed(1)}°`);
console.log(geral <= 20 && pior <= 35
  ? '  VEREDITO: reconstrução utilizável — pode filmar.'
  : '  VEREDITO: erro alto demais — filmar agora seria desperdício.');
process.exit(geral <= 20 && pior <= 35 ? 0 : 1);
