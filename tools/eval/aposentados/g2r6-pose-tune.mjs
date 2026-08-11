// G2-R6A pose tuning: aplica transforms candidatos nos viewmodels estáticos AO VIVO
// e captura uma grade por classe. O objetivo: cano apontando PRA FRENTE (pose clássica
// de hip, como a era r55), mãos no quadro, modelo Tripo legível.
// Uso: node tools/eval/g2r6-pose-tune.mjs <outDir> [cls,arma]...
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/g2r6-poses';
const PAIRS = (process.argv[3] || 'rifle,ak pistol,pistol awp,awp shotgun,shotgun').split(' ');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_pool_day`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
});

// Candidatos por classe: {tag, yaw, roll, pitch, pos, scale} — a rotação base é
// SEMPRE qy180*gunBasis(cls)^-1 (cano pra -Z, em pé); os deltas são pós-multiplicados.
const CANDS = {
  rifle: [
    { tag: 'base' },   // transform atual (baseline)
    { tag: 'fwd', pos: [0.16, -0.13, -0.40], scale: 0.45 },
    { tag: 'fwd-cant', yaw: -0.10, roll: -0.10, pitch: 0.02, pos: [0.16, -0.13, -0.40], scale: 0.45 },
    { tag: 'fwd-cant2', yaw: -0.16, roll: -0.14, pitch: 0.03, pos: [0.17, -0.14, -0.38], scale: 0.42 },
    { tag: 'fwd-far', yaw: -0.12, roll: -0.10, pitch: 0.02, pos: [0.15, -0.15, -0.46], scale: 0.40 },
  ],
  pistol: [
    { tag: 'y14', yaw: -0.14, roll: -0.06, pitch: 0.01, pos: [0.15, -0.15, -0.30], scale: 0.26 },
    { tag: 'y18', yaw: -0.18, roll: -0.06, pitch: 0.01, pos: [0.15, -0.15, -0.30], scale: 0.26 },
    { tag: 'y22', yaw: -0.22, roll: -0.04, pitch: 0.01, pos: [0.15, -0.15, -0.29], scale: 0.26 },
    { tag: 'y18r', yaw: -0.18, roll: -0.12, pitch: 0.01, pos: [0.15, -0.15, -0.30], scale: 0.26 },
  ],
  awp: [
    { tag: 'base' },
    { tag: 'fwd', pos: [0.14, -0.16, -0.42], scale: 0.42 },
    { tag: 'fwd-cant', yaw: -0.08, roll: -0.08, pitch: 0.02, pos: [0.14, -0.16, -0.42], scale: 0.42 },
    { tag: 'fwd-far', yaw: -0.10, roll: -0.08, pitch: 0.02, pos: [0.13, -0.17, -0.48], scale: 0.38 },
  ],
  shotgun: [
    { tag: 'r14', yaw: -0.10, roll: -0.14, pitch: 0.02, pos: [0.17, -0.14, -0.44], scale: 0.38 },
    { tag: 'r18', yaw: -0.12, roll: -0.18, pitch: 0.02, pos: [0.17, -0.14, -0.44], scale: 0.38 },
    { tag: 'y16r14', yaw: -0.16, roll: -0.14, pitch: 0.02, pos: [0.17, -0.14, -0.44], scale: 0.38 },
  ],
};

for (const pair of PAIRS) {
  const [cls, wid] = pair.split(',');
  const cands = CANDS[cls];
  if (!cands) continue;
  // guarda o transform original do representante
  await page.evaluate(({ wid }) => {
    const g = window.__game;
    g._switchWeapon(wid); g.player.drawUntil = 0; g.player.pitch = 0;
  }, { wid });
  await page.waitForTimeout(300);
  for (const c of cands) {
    await page.evaluate(async ({ cls, wid, c }) => {
      const THREE = await import('three');
      const g = window.__game;
      const entries = Object.entries(g.vm.staticVms).filter(([k]) =>
        cls === 'awp' ? ['awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks'].includes(k)
          : cls === 'rifle' ? !['pistol', 'deagle', 'revolver38', 'shotgun', 'md97', 'knife', 'awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks'].includes(k)
          : cls === 'pistol' ? ['pistol', 'deagle', 'revolver38'].includes(k)
          : ['shotgun', 'md97'].includes(k));
      if (c.tag === 'base') {
        // restaura o transform original salvo no 1º acesso
        for (const [k, m] of entries) { if (m.userData.__orig) { m.position.copy(m.userData.__orig.p); m.quaternion.copy(m.userData.__orig.q); m.scale.copy(m.userData.__orig.s); } }
        return;
      }
      const VM_GUNSPACE = {
        rifle: { stock: [0.275, -0.117, -0.431], muzzle: [-0.356, 0.285, 0.465] },
        pistol: { stock: [0.118, -0.235, -0.446], muzzle: [-0.230, 0.350, 0.462] },
        shotgun: { stock: [0.169, -0.200, -0.432], muzzle: [-0.117, 0.105, 0.463] },
        awp: { stock: [-0.054, -0.058, -0.428], muzzle: [-0.133, 0.136, 0.469] },
      };
      for (const [k, m] of entries) {
        if (!m.userData.__orig) m.userData.__orig = { p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.clone() };
        const gs = VM_GUNSPACE[cls];
        const st = new THREE.Vector3(...gs.stock), mz = new THREE.Vector3(...gs.muzzle);
        const axis = mz.clone().sub(st); axis.normalize();
        const up = new THREE.Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize();
        const side = new THREE.Vector3().crossVectors(up, axis);
        const M = new THREE.Matrix4().makeBasis(side, up, axis);
        const q = new THREE.Quaternion().setFromRotationMatrix(M).invert();
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        q.premultiply(qy);   // cano pra -Z (frente)
        // deltas de estilo (yaw/roll/pitch) — ordem: aplica DEPOIS do alinhamento
        const qd = new THREE.Quaternion().setFromEuler(new THREE.Euler(c.pitch || 0, c.yaw || 0, c.roll || 0, 'YXZ'));
        q.multiply(qd);
        // preserva o dScale por-arma (SNIPER_VM) embutido na escala original
        const s0 = m.userData.__orig.s.x;
        m.quaternion.copy(q);
        m.position.set(...c.pos);
        m.scale.setScalar(c.scale * (s0 / (cls === 'awp' ? 0.42 : cls === 'rifle' ? 0.45 : cls === 'pistol' ? 0.28 : 0.38)));
      }
    }, { cls, wid, c });
    await page.waitForTimeout(120);
    await page.evaluate(() => { const g = window.__game; g.player.drawUntil = 0; g.player.reloadUntil = 0; });
    await page.screenshot({ path: `${OUT}/${cls}-${c.tag}.png` });
    console.log('shot', cls, c.tag);
  }
}
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
