// CAPTURA DE EVIDÊNCIA 3:2 — frente C v2.1 (plans/13): piscina entrável + jardim refeito.
// Antes×depois no recorte 3:2 que o dono revisa, com vareta de 1,70 m (altura do
// jogador) na borda da piscina e no jardim como referência de escala humana.
// Uso: BASE=http://127.0.0.1:8132 node tools/eval/mansao-v21-capture.mjs antes|depois
// Exige `node tools/eval/serve.mjs 8132` e roda SOB with-browser-lock.sh.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FASE = process.argv[2] === 'depois' ? 'depois' : 'antes';
const OUT = `tools/eval/asset-evidence/bug64-mansao-v21/${FASE}`;
const BASE = process.env.BASE || 'http://127.0.0.1:8132';
const VW = 1500, VH = 1000;   // 3:2

// [nome, x, y, z, yaw, pitch] — forward = (-sin yaw, -cos yaw): yaw 0 = norte(-z)
// Piscina com interior em z∈[-32,5, -26,5] (plans/13: cuba deslocada 2 m pro norte)
const POSES = [
  ['piscina-do-spawn', 0, 0, -24.2, 0, -0.12],        // vista B→piscina: lâmina, borda, vertedouro
  ['piscina-borda-sul', 0, 0, -25.3, 0, -0.26],       // de pé na borda: degraus de entrada, raso, fundo (vareta ao lado)
  ['piscina-dentro-fundo', 0, -1.85, -31.5, Math.PI, 0.08], // DE DENTRO do fundo: escada de saída e lâmina acima
  ['jardim-portao', 0, 0, 33.2, 0, 0.02],             // chegando pelo portão: caminho de pedras
  ['jardim-no-caminho', -0.6, 0, 24, Math.PI, 0.02],  // no caminho, olhando pro portão (vareta no caminho)
  ['jardim-composicao', -2, 7.5, 39, 0.16, -0.34],    // do muro sul alto: composição do jardim inteiro
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_mansao`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game;
  g._endRound = () => {}; g.timeLeft = 1e9;   // congela o round (bug55): rebuild mataria a vareta
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
});
// vareta de 1,70 m = altura do jogador (G3): na borda sul da piscina e no caminho do jardim
await page.evaluate(async () => {
  const THREE = await import('/vendor/three.module.js');
  const mk = (x, z) => {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.7, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff2614 }));
    rod.position.set(x, 0.85, z);
    window.__game.world.root.add(rod);
  };
  mk(1.6, -25.6);   // deck ao lado da borda sul da piscina (não tapa os degraus)
  mk(-2.2, 24.2);   // jardim, ao lado do caminho de pedras
});
for (const [nome, x, y, z, yaw, pitch] of POSES) {
  await page.evaluate(([px, py, pz, yw, pt]) => {
    const g = window.__game;
    g.player.pos.set(px, py, pz);
    g.player.yaw = yw; g.player.pitch = pt;
    g.player.vel.set(0, 0, 0);
    g.player.grounded = true;
  }, [x, y, z, yaw, pitch]);
  // SwiftShader rende ~1 frame por shot: sem esperar a câmera convergir pra pose,
  // o screenshot pega o frame da pose ANTERIOR (portao/no-caminho saíam gêmeos).
  // O re-pin a cada poll é o que segura a pose aérea (composicao): sem chão em
  // z>36 o jogador CAIA durante a espera e o frame saía preto debaixo do mapa.
  await page.waitForFunction(([px, py, pz, yw, pt]) => {
    const g = window.__game;
    g.player.pos.set(px, py, pz); g.player.yaw = yw; g.player.pitch = pt; g.player.vel.set(0, 0, 0);
    const c = g.cam || g.camera;
    return c && Math.hypot(c.position.x - px, c.position.z - pz) < 0.05;
  }, [x, y, z, yaw, pitch], { timeout: 20000 }).catch(() => {});
  // o frame apresentado fica 1-2 frames ATRÁS do estado JS no SwiftShader: mais
  // alguns polls re-pinados antes do shot, senão sai o frame da pose anterior
  for (let i = 0; i < 3; i++) {
    await page.evaluate(([px, py, pz, yw, pt]) => {
      const g = window.__game;
      g.player.pos.set(px, py, pz); g.player.yaw = yw; g.player.pitch = pt; g.player.vel.set(0, 0, 0);
    }, [x, y, z, yaw, pitch]);
    await page.waitForTimeout(180);
  }
  await page.screenshot({ path: `${OUT}/${nome}.png`, timeout: 90000 });
  console.log('  shot', nome);
}
console.log(`DONE -> ${OUT} | 0 erros = ${errors === 0}`);
await browser.close();
process.exit(errors ? 1 : 0);
