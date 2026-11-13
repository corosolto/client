// CAPTURA DE EVIDÊNCIA 3:2 — BUG-55 (escala dos barracos do corrego).
// Antes×depois no recorte que o dono recebe (3:2), com referência humana ao lado:
// um bot do jogo E uma vareta de exatamente 1,70 m na soleira da porta.
// Uso: BASE=http://127.0.0.1:8124 node tools/eval/bug55-evidence-capture.mjs antes|depois
// Exige `npm run eval:serve` (ou outro BASE) e roda SOB with-browser-lock.sh.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { initTextures, bootGame } from './harness.mjs';

const FASE = process.argv[2] === 'depois' ? 'depois' : 'antes';
const OUT = `tools/eval/asset-evidence/bug55-corrego/${FASE}`;
const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const VW = parseInt(process.env.EV_W || "1500", 10), VH = parseInt(process.env.EV_W || "1500", 10) * 2 / 3;   // 3:2 — o dono joga e revisa em 3:2

/* As poses nascem do MESMO mundo que a régua mede (bootGame em node): a casa-alvo é a
   da fileira B leste mais próxima de z=-10 — mesma casa antes e depois do conserto. */
const g0 = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const casas = g0.world.colliders.filter((c) => c.minY > 1.0 && c.minY < 1.1 && c.minX > 14 && c.minX < 20);
const alvo = casas.sort((a, b) => Math.abs((a.minZ + a.maxZ) / 2 + 10) - Math.abs((b.minZ + b.maxZ) / 2 + 10))[0];
const cx = (alvo.minX + alvo.maxX) / 2, cz = (alvo.minZ + alvo.maxZ) / 2, fz = alvo.maxZ;
const yawPara = (de, para) => Math.atan2(-(para[0] - de[0]), -(para[2] - de[2]));   // forward = (-sen, -cos)
const PORTA = [cx, 1.0, fz + 0.1];                       // ponto na fachada (porta/onde ela nascerá)
/* porta da casa-alvo ocupa cx+0,1 … cx+1,1 em x (vão de 1,0 m a 0,6 do centro local):
   bot 0,4 m à DIREITA da porta e vareta 1,4 m à ESQUERDA — a porta fica LIVRE no meio
   (na primeira versão o bot parava EM CIMA da porta e o ASCII do pixel-probe mostrou o
   vão coberto pelo corpo). */
const BOT = [cx + 1.5, 0, fz + 0.55];                    // referência humana ao lado da soleira
const ROD_X = cx - 1.3;
const yaw = (de, para) => yawPara(de, para);
const POSES = [
  ['porta-fachada', [PORTA[0] + 4.6, 1.62, PORTA[2] + 3.1], PORTA],
  ['porta-perfil', [PORTA[0] + 2.3, 1.62, PORTA[2] + 2.0], PORTA],
  ['puxadinho-fileira-c', [20.9, 1.62, -11.9], [23.1, 1.5, -15]],
  ['palafita', [5.9, 1.62, -13.9], [5.5, 2.7, -19]],
  ['beco-janelas', [13.65, 1.62, -6.0], [13.65, 1.4, -21]],
];
console.log(`casa-alvo: cx=${cx.toFixed(2)} cz=${cz.toFixed(2)} fachada z=${fz.toFixed(2)}`);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
/* LOWQ + bloom=0: em SwiftShader o boot custa 7-10 min com pós; sem o composite ele cai
   pela metade (mesma geometria, mesma escala — o que esta evidência mede). */
await page.addInitScript(() => { try { localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', map: 'corrego' })); } catch (e) {} });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=corrego`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForTimeout(800);
/* Congela o ciclo de round SÓ nesta página de evidência: com o timer de round ativo,
   o _endRound rebuilda o world no meio da captura — a vareta morre com o root antigo e
   o player volta ao spawn (medido: rod no grafo, 0 px em 5 shots). Sem respawn, o pose
   de cada shot vale pelo resto da execução. */
await page.evaluate(() => {
  const g = window.__game;
  g._endRound = () => {};
  g.timeLeft = 1e9;
});
/* referência humana: todos os bots longe, menos um ao lado da soleira; vareta de 1,70 m
   no mesmo spot (THREE chega pelo importmap que o serve.mjs espelha). */
await page.evaluate(([bx, bz]) => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
  const ref = g.bots[0];
  ref.pos.set(bx, 0, bz); ref.hp = 1e9;
}, [BOT[0], BOT[2]]);
await page.evaluate(async ([rx, rz]) => {
  const THREE = await import('/vendor/three.module.js');
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xff2614 }));
  rod.position.set(rx, 0.85, rz);
  window.__game.world.root.add(rod);
}, [ROD_X, BOT[2]]);
/* SwiftShader roda a ~0,3 FPS: o settle da câmera lê estado JS FRESCO, mas o canvas
   mostra um frame de segundos atrás (medido: vareta projetando em (693,617) com pixel
   de parede no lugar). Espera 2 ticks de RAF e SÓ ACEITA o screenshot quando a vareta
   de 1,70 m aparece no buffer — a figura se prova sozinha antes de virar evidência. */
const temVareta = async (buf) => {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  const colunas = new Map();
  for (let x = 0; x < W; x += 2) {
    let run = 0, best = 0;
    for (let y = 0; y < info.height; y += 2) {
      const i = (y * W + x) * C;
      if (data[i] > 160 && data[i + 1] < 110 && data[i + 2] < 100 && data[i] - data[i + 1] > 80) { run++; if (run > best) best = run; } else run = 0;
    }
    if (best >= 12) colunas.set(x, best);   // vareta: coluna contínua ≥ 24 px reais
  }
  if (!colunas.size) return 0;
  return Math.max(...colunas.values()) * 2;
};
const rafDuplo = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

for (const [nome, cam, mira] of POSES) {
  await page.evaluate(([px2, py, pz2, yw, keepBot] ) => {
    const g = window.__game;
    g.player.pos.set(px2, py - 1.62, pz2);   // pos é dos pés; câmera soma 1,62
    g.player.yaw = yw; g.player.pitch = 0.02;
    g.player.vel.set(0, 0, 0);
    g.player.grounded = true;
    if (!keepBot && g.bots[0]) g.bots[0].pos.set(0, -80, 0);
  }, [cam[0], cam[1], cam[2], yaw(cam, mira), nome.startsWith('porta')]);
  if (nome.startsWith('porta')) {
    await page.evaluate(([bx, bz]) => { const b = window.__game.bots[0]; if (b) b.pos.set(bx, 0, bz); }, [BOT[0], BOT[2]]);
  }
  await page.waitForFunction(() => {
    const g = window.__game, c = g.camera.position;
    return Math.hypot(c.x - g.player.pos.x, c.z - g.player.pos.z) < 0.5 && Math.abs(c.y - (g.player.pos.y + 1.62)) < 0.3;
  }, null, { timeout: 30000, polling: 200 }).catch(() => console.log('  (câmera não colou em', nome, ')'));
  const precisa = nome.startsWith('porta');
  let px2 = 0;
  for (let att = 0; att < 6; att++) {
    await rafDuplo();
    await page.waitForTimeout(400);
    const buf = await page.screenshot({ type: 'png', timeout: 90000 });
    px2 = await temVareta(buf);
    if (!precisa || px2 > 0) { await import('node:fs').then(({ writeFileSync }) => writeFileSync(`${OUT}/${nome}.png`, buf)); break; }
    console.log(`  (frame velho em ${nome}, tentativa ${att + 1} — vareta ${px2}px)`);
  }
  console.log(`  shot ${nome}${precisa ? ` · vareta ${px2} px = 1,70 m` : ''}`);
}
console.log(`DONE -> ${OUT} | 0 erros = ${errors === 0}`);
await browser.close();
process.exit(errors ? 1 : 0);
