/* occluder-ray-dump.mjs — DIAGNÓSTICO (não é portão): roda a mesma sondagem do
   occluder-ray-check.mjs e despeja TODAS as violações agrupadas por objeto, para
   localizar a geometria responsável antes de mexer no mapa. Não tem teto, não reprova.
   Uso: node tools/eval/occluder-ray-dump.mjs --map=fy_corrego */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const argMapa = (process.argv.find((a) => a.startsWith('--map=')) || '--map=').split('=')[1];
if (!argMapa) throw new Error('uso: --map=<id>');
const MAPAS = argMapa.split(',');

const MEDIR = async () => {
  const g = window.__game;
  const W = g.world;
  g.scene.updateMatrixWorld(true);
  const THREE = await import('./vendor/three.module.js');
  const occ = W.occluders;
  const emCena = (o) => { for (let p = o; p; p = p.parent) if (p === g.scene) return true; return false; };
  const matsDe = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
  const UD_EXC = ['skyLife', 'routeCue', 'overheadCable', 'runningDrain', 'manhole',
    'proxyGLB', 'coverProxy', 'fauna', 'ambientLife', 'faunaPart', 'nonCollider', 'nonSolidSurface'];
  const dropSet = new Set((g.drops || []).map((d) => d.mesh));
  const cadeiaTem = (o, teste) => { for (let p = o; p && p !== g.scene; p = p.parent) if (teste(p)) return true; return false; };
  const vis = [];
  W.root.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    if (cadeiaTem(o, (p) => !p.visible)) return;
    const opaco = (m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9));
    if (!matsDe(o).some(opaco)) return;
    if (o.renderOrder < 0) return;
    const n = String(o.name || '');
    if (n.startsWith('decal:') || n.startsWith('mural:') || n.startsWith('faixa:') || n.startsWith('horizonte_')) return;
    if (cadeiaTem(o, (p) => UD_EXC.some((k) => (p.userData || {})[k]))) return;
    if (cadeiaTem(o, (p) => (p.userData || {}).botOwner)) return;
    if (cadeiaTem(o, (p) => dropSet.has(p))) return;
    vis.push(o);
  });
  const nodes = (W.waypoints && W.waypoints.nodes) || [];
  const passo = Math.max(1, Math.ceil(nodes.length / 140));
  const ray = new THREE.Raycaster(); ray.near = 0; ray.far = 60;
  const PISO = 0.30;
  const primeiro = (hits) => { for (const h of hits) if (h.distance >= PISO) return h; return null; };
  const cols = W.colliders || [];
  const dentroColisor = (x, y, z) => {
    for (const c of cols) {
      if (x >= c.minX - 0.1 && x <= c.maxX + 0.1 && y >= c.minY - 0.1 && y <= c.maxY + 0.1
        && z >= c.minZ - 0.1 && z <= c.maxZ + 0.1) return true;
    }
    return false;
  };
  const quem = (h) => {
    if (!h) return '—';
    const o = h.object;
    const ud = Object.keys(o.userData || {}).join('|');
    let inst = '';
    if (o.isInstancedMesh && h.instanceId !== undefined) {
      const m = new THREE.Matrix4(); o.getMatrixAt(h.instanceId, m);
      const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
      m.decompose(p, q, s);
      inst = `#${h.instanceId}@(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`;
    }
    return `${o.name || o.type}${o.isInstancedMesh ? '[inst]' : ''}${inst}/${o.geometry ? o.geometry.type : '?'}${ud ? ' ud:' + ud : ''}`;
  };
  const tiro = {}, atr = [];
  for (let i = 0; i < nodes.length; i += passo) {
    const nd = nodes[i];
    const gy = W.groundHeightAt(nd.x, nd.z);
    if (!Number.isFinite(gy)) continue;
    for (const h of [0.5, 1.3, 1.62]) {
      for (let d = 0; d < 8; d++) {
        const ang = d * Math.PI / 4;
        const ox = nd.x, oy = gy + h, oz = nd.z;
        const dx = Math.cos(ang), dz = Math.sin(ang);
        ray.set(new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, 0, dz));
        const hA = primeiro(ray.intersectObjects(occ, false));
        const hB = primeiro(ray.intersectObjects(vis, false));
        const dA = hA ? hA.distance : null, dB = hB ? hB.distance : null;
        if (hA && (!hB || dA < dB - 0.15)) {
          const k = quem(hA) + '  →  ' + quem(hB);
          (tiro[k] = tiro[k] || []).push(`(${ox.toFixed(1)},${oz.toFixed(1)}) y${oy.toFixed(2)} ang${(ang * 180 / Math.PI).toFixed(0)}° bala=${dA.toFixed(2)} vis=${dB === null ? '—' : dB.toFixed(2)}`);
        } else if (hB && (!hA || dB < dA - 0.30) && dentroColisor(ox + dx * dB, oy, oz + dz * dB)) {
          atr.push({ k: quem(hB) + '  (bala: ' + quem(hA) + ')', s: `(${ox.toFixed(1)},${oz.toFixed(1)}) y${oy.toFixed(2)} ang${(ang * 180 / Math.PI).toFixed(0)}° bala=${dA === null ? '—' : dA.toFixed(2)} vis=${dB.toFixed(2)}` });
        }
      }
    }
  }
  const atrG = {};
  for (const a of atr) (atrG[a.k] = atrG[a.k] || []).push(a.s);
  const pack = (grp) => Object.entries(grp).sort((a, b) => b[1].length - a[1].length)
    .map(([k, v]) => ({ objeto: k, n: v.length, exemplos: v.slice(0, 4) }));
  return { tiro: pack(tiro), atr: pack(atrG), nOcc: occ.length, nVis: vis.length };
};

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
for (const id of MAPAS) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${id}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
  await page.evaluate(() => { const g = window.__game; for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; } g.player.hp = 1e9; });
  const r = await page.evaluate(MEDIR);
  console.log(`\n===== ${id} — occluders ${r.nOcc}, superfícies visíveis ${r.nVis} =====`);
  console.log('--- TIRO-NO-AR (o que a bala vê antes do olho) ---');
  for (const g2 of r.tiro) { console.log(` ${g2.n}× ${g2.objeto}`); for (const e of g2.exemplos) console.log(`     ${e}`); }
  console.log('--- ATRAVESSA-PAREDE (o que o olho vê antes da bala, dentro de colisor) ---');
  for (const g2 of r.atr) { console.log(` ${g2.n}× ${g2.objeto}`); for (const e of g2.exemplos) console.log(`     ${e}`); }
  await page.close();
}
await browser.close();
