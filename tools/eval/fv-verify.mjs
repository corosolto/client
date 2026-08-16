// Verificação estrutural do Ferro Velho (roda em cima do fveval.html):
//  1. WAYPOINTS: toda bandeira alcançável a partir dos 2 spawns (BFS no grafo do A*)
//  2. LOS spawn↔spawn: tem que continuar BLOQUEADA (raycast contra occluders)
//  3. roda nos dois modos: default (beco) e ?beco=0 (layout antigo)
// Uso: node tools/eval/fv-verify.mjs
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

let fail = 0;
for (const qs of ['', '?beco=0']) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`${BASE}/fveval.html${qs}`, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready === true, null, { timeout: 120000 });
  const r = await page.evaluate(() => {
    const w = window.__world;
    const { nodes, adj } = w.waypoints;
    // BFS a partir do nó mais próximo de um ponto
    const nearest = (x, z) => {
      let bi = -1, bd = 1e9;
      for (let i = 0; i < nodes.length; i++) { const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
      return bi;
    };
    const reach = (from) => {
      const seen = new Uint8Array(nodes.length); const q = [from]; seen[from] = 1;
      while (q.length) { const c = q.pop(); for (const m of adj[c]) if (!seen[m]) { seen[m] = 1; q.push(m); } }
      return seen;
    };
    const out = { nodes: nodes.length, flags: [] };
    for (const team of ['E', 'B']) {
      const s = w.spawns[team][0];
      const seen = reach(nearest(s.x, s.z));
      for (const f of w.ctfPoints) {
        const ok = !!seen[nearest(f.x, f.z)];
        out.flags.push(`${team}→${f.id}:${ok ? 'ok' : 'ISOLADA'}`);
      }
    }
    // LOS spawn↔spawn: raio do 1º spawn P ao 1º spawn B contra os occluders
    const THREE_R = window.__scene.children[0].constructor;   // hack p/ não importar three
    const a = w.spawns.E[0], b = w.spawns.B[0];
    const rc = new (Object.getPrototypeOf(window.__scene).constructor)();   // não usado
    // raycast manual: usa THREE exposto pelo módulo? — faz pelo renderer scene: cria via world
    out.losBlocked = (() => {
      // amostra 60 pontos no segmento e testa dentro de algum collider (AABB)
      const cs = w.colliders;
      for (let t = 0; t <= 1; t += 1 / 60) {
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = 1.7;
        for (const c of cs) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && y >= c.minY && y <= c.maxY) return true;
      }
      return false;
    })();
    out.flagW = w.ctfPoints.find(f => f.id === 'W');
    return out;
  });
  console.log(`modo '${qs || 'beco'}': nós=${r.nodes} LOS spawn↔spawn ${r.losBlocked ? 'BLOQUEADA(ok)' : 'LIVRE(FAIL)'} W=${JSON.stringify(r.flagW)}`);
  console.log('  ' + r.flags.join('  '));
  if (!r.losBlocked) fail++;
  if (r.flags.some(f => f.includes('ISOLADA'))) fail++;
  await page.close();
}
console.log(fail ? `FAIL (${fail})` : 'VERIFY OK');
await browser.close();
process.exit(fail ? 2 : 0);
