/* ============================================================================
   praca-runtime-probe.mjs — CORPO REAL NA PRAÇA DOS TRÊS PODERES (navegador).
   ----------------------------------------------------------------------------
   POR QUE NO NAVEGADOR (LIÇÃO 3): os landmarks são GLB (Congresso, Catedral, ministérios,
   ônibus, barracas) e em node nenhum GLB carrega — a sonda de headroom mediria um mapa sem
   prédio. Aqui o corpo é movido por `Game._updatePlayer`/`_collide` de verdade (o mesmo
   caminho do jogador), com os GLBs carregados e as malhas VISÍVEIS como alvo dos raios.
   Padrão herdado da `escadao-runtime-probe.mjs` do Codex (06/09/2026), reduzido ao que a
   Praça tem: sem escada, sem varal, sem fauna sólida.

   O QUE MEDE (cada cláusula é número, e "não sei medir" é vermelho):
     PR0  o jogo real subiu (`state === 'live'`), grafo, spawns, bandeiras e pickups existem;
     PR1  ESTÁTICO: em cada waypoint o corpo cabe (`_collide` não desloca > 1 mm), tem chão
          (raio para baixo acerta malha visível em ≤ 0,61 m) e NÃO tem malha visível na
          faixa peito→olho (y+0,90 a y+1,62) em 5 raios (centro + 4 ombros a 0,38 m); a
          faixa do joelho (0,31–0,90) é só informação — a pegada de corpo deste mapa é a
          do PEITO por decisão do dono (PEGADA_CORPO), e perna dentro de saia é aceito;
     PR1b GRADE de 1 m alcançável a pé do spawn E (flood-fill por `_retaAndavel`): as mesmas
          três medidas fora do grafo — é ela que achou a caixa SEDEX flutuando e a soleira
          do espelho no ombro (06/09);
     PR2  ROTAS: spawn(slot 0) → bandeira do lado → ÔNIBUS → bandeira oposta → spawn, nos
          dois times, andando pelo A* do mapa (`findPath`) com W apertado e yaw no próximo
          nó; reprova se travar (> 3 s sem progresso), se a cabeça encostar em malha visível
          ou se o pé ficar sem chão;
     PR3  PASSEIO: 12 nós sorteados (semente fixa) × 6 saltos para vizinhos aleatórios, mesma
          medição — cobre o que as rotas de bandeira não cobrem (flancos, pilotis).
   Saída: JSON com contagens, amostras (posição + malha) e traço das pernas, e código 1 se
   qualquer cláusula ficar vermelha.

   USO
     BASE=http://127.0.0.1:8177 node tools/eval/praca-runtime-probe.mjs [saida.json]
     MUTANTE=cabeca   # abaixa a laje do ônibus sobre o corredor: PR1/PR2 têm que ficar vermelhas
     MUTANTE=parede   # colisor invisível no meio da lane: PR2 tem que travar
   ============================================================================ */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8177';
const OUT = process.argv[2] || 'artifacts/praca-poderes/runtime/runtime.json';
const MUTANTE = process.env.MUTANTE || '';
mkdirSync(path.dirname(OUT), { recursive: true });

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=praca_poderes`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForTimeout(2500);

const result = await page.evaluate(async (MUT) => {
  const THREE = await import('three');
  const g = window.__game, W = g.world, p = g.player;
  const falhas = [];
  const req = (c, m) => { if (!c) throw new Error(m); };
  req(W && p && typeof g._updatePlayer === 'function', 'PR0: Game real indisponível');
  req(W.waypoints?.nodes?.length > 100 && W.waypoints?.adj?.length, 'PR0: grafo ausente');
  req(W.spawns?.B?.length && W.spawns?.E?.length, 'PR0: spawns ausentes');
  req(W.ctfPoints?.length === 3, 'PR0: esperava 3 bandeiras (CONGRESSO/ÔNIBUS/CATEDRAL)');
  req((W.pickups?.length || 0) + (g.drops?.length || 0) > 0, 'PR0: nenhuma arma no chão (world.pickups/drops vazios)');
  const DT = 1 / 60, R = 0.38, EYE = 1.62;
  const nodes = W.waypoints.nodes, adj = W.waypoints.adj;

  // ---- MUTANTES (têm que aplicar; mutante que não aplica é decorativo — LIÇÃO 8) ----
  let mutAplicado = null;
  if (MUT === 'cabeca') {
    // laje visível a 1,2 m sobre a lane, entre a urna e o ônibus: cabeça bate, corpo passa
    const m = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    m.position.set(0, 1.25, 8); m.name = 'MUTANTE-cabeca'; W.root.add(m); m.updateMatrixWorld(true);
    mutAplicado = 'cabeca';
  } else if (MUT === 'parede') {
    // colisor INVISÍVEL atravessando a lane inteira em z=-15: nenhuma rota norte↔sul passa
    W.colliders.push({ minX: -50, maxX: 50, minY: 0, maxY: 3, minZ: -15.3, maxZ: -14.7 });
    mutAplicado = 'parede';
  }
  req(!MUT || mutAplicado === MUT, 'MUTANTE NÃO APLICOU: ' + MUT);

  // ---- neutraliza o loop real (o corpo é movido só por esta sonda) ----
  const orig = { update: g.update, _updateBot: g._updateBot, _checkCtfAlvo: g._checkCtfAlvo, _checkPace: g._checkPace, _collide: g._collide };
  g.update = () => {}; g._updateBot = () => {}; g._checkCtfAlvo = () => {}; g._checkPace = () => {};
  g._smokes = []; g.keys = {}; g.touchMove = null; g.mouseDown0 = false; g.state = 'live';
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
  p.hp = 1e9; p.alive = true;
  let run = null;
  g._collide = function (pos, r) {
    const bx = pos.x, bz = pos.z;
    orig._collide.call(this, pos, r);
    if (run && pos === p.pos) {
      const c = Math.hypot(pos.x - bx, pos.z - bz);
      run.collisionCalls++;
      if (c > 1e-6) { run.contacts++; if (run.contactSamples.length < 6) run.contactSamples.push([+bx.toFixed(2), +bz.toFixed(2), +c.toFixed(3)]); }
    }
  };

  // ---- malhas visíveis (alvo dos raios), com grade espacial (LIÇÃO 10) ----
  W.root.updateMatrixWorld(true);
  const visible = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
  const CELL = 4, grid = new Map(), boxes = new WeakMap();
  let nMesh = 0;
  W.root.traverse((o) => {
    if (!o.isMesh || o.isSprite || !visible(o)) return;
    if (o.userData?.nonSolidSurface) return;   // fauna / superfície declarada não sólida
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!mats.some((m) => m && m.visible !== false && !(m.transparent && m.opacity < 0.05))) return;
    const bb = new THREE.Box3().setFromObject(o);
    if (bb.isEmpty() || !isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
    boxes.set(o, bb); nMesh++;
    const x0 = Math.floor(Math.max(bb.min.x, W.bounds.minX - 2) / CELL), x1 = Math.floor(Math.min(bb.max.x, W.bounds.maxX + 2) / CELL);
    const z0 = Math.floor(Math.max(bb.min.z, W.bounds.minZ - 2) / CELL), z1 = Math.floor(Math.min(bb.max.z, W.bounds.maxZ + 2) / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); }
  });
  req(nMesh > 50, 'PR0: poucas malhas visíveis (' + nMesh + ') — GLBs não carregaram?');
  const ray = new THREE.Raycaster(), org = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
  const hit = (x, y, z, dir, far) => {
    const cands = (grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) || []).filter((o) => {
      const b = boxes.get(o); const y2 = y + dir.y * far;
      return x >= b.min.x - 0.01 && x <= b.max.x + 0.01 && z >= b.min.z - 0.01 && z <= b.max.z + 0.01 && b.max.y >= Math.min(y, y2) && b.min.y <= Math.max(y, y2);
    });
    if (!cands.length) return null;
    ray.set(org.set(x, y, z), dir); ray.near = 0; ray.far = far;
    const hs = ray.intersectObjects(cands, false);
    for (const h of hs) {
      const m = Array.isArray(h.object.material) ? h.object.material[h.face?.materialIndex ?? 0] : h.object.material;
      if (m && m.visible !== false) return h;
    }
    return null;
  };
  const desc = (o) => (o.name || '') + '#' + o.geometry?.type + (o.isInstancedMesh ? '[inst]' : '') + (o.parent && o.parent !== W.root && o.parent.name ? ' <' + o.parent.name : '');
  const SH = [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]];
  const bodyAt = (x, y, z, acc) => {
    const pos = [+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)];
    if (!hit(x, y + 0.30, z, DOWN, 0.61)) { acc.unsupported++; if (acc.unsupportedSamples.length < 8) acc.unsupportedSamples.push(pos); }
    for (const [dx, dz] of SH) {
      const h = hit(x + dx, y + 0.31, z + dz, UP, EYE - 0.31);
      if (!h) continue;
      const rel = h.point.y - y;
      // Faixa do JOELHO (0,31–0,90 m): saia de lona, assento de banco — o colisor de corpo
      // deste mapa é a pegada na altura do PEITO por decisão do dono (PEGADA_CORPO, 05/08:
      // "esbarrava em ar"). Perna dentro de saia é aceito e só entra como informação.
      // Faixa do PEITO/CABEÇA (0,90–1,62 m): câmera ou tronco dentro de malha = defeito.
      if (rel < 0.90) { acc.pernaHits++; if (acc.pernaSamples.length < 4) acc.pernaSamples.push({ pos, ombro: [dx, dz], y: +h.point.y.toFixed(2), malha: desc(h.object) }); continue; }
      acc.headHits++; if (acc.headSamples.length < 8) acc.headSamples.push({ pos, ombro: [dx, dz], y: +h.point.y.toFixed(2), malha: desc(h.object) });
    }
  };
  const bodyFree = (x, z) => {
    const s = new THREE.Vector3(x, W.groundHeightAt(x, z), z), b = s.clone();
    orig._collide.call(g, s, R);
    return s.distanceTo(b) <= 1e-3;
  };

  // ---- PR1: estático nos waypoints ----
  const st = { nodes: nodes.length, presos: 0, presosSamples: [], unsupported: 0, unsupportedSamples: [], headHits: 0, headSamples: [], pernaHits: 0, pernaSamples: [] };
  for (const n of nodes) {
    if (!bodyFree(n.x, n.z)) { st.presos++; if (st.presosSamples.length < 8) st.presosSamples.push([+n.x.toFixed(2), +n.z.toFixed(2)]); }
    bodyAt(n.x, W.groundHeightAt(n.x, n.z), n.z, st);
  }

  // ---- PR1b: GRADE ANDÁVEL de 1 m alcançável a pé do spawn E (fora do grafo) ----
  // O grafo tem passo 4,4 m e não passa junto dos props; o jogador passa. Flood-fill por
  // `_retaAndavel` (a mesma reta que o A* usa) a partir do spawn: só célula ALCANÇÁVEL entra
  // na conta — bolsão fechado dentro de um prédio não é lugar de jogador e não é defeito.
  const G = 1.0, B = W.bounds;
  const nx = Math.floor((B.maxX - B.minX) / G) + 1, nz = Math.floor((B.maxZ - B.minZ) / G) + 1;
  const cx = (i) => B.minX + i * G, cz = (k) => B.minZ + k * G;
  const s0 = W.spawns.E[0];
  const i0 = Math.round((s0.x - B.minX) / G), k0 = Math.round((s0.z - B.minZ) / G);
  req(bodyFree(cx(i0), cz(k0)), 'PR1b: o spawn E[0] não cabe o corpo');
  const seen = new Uint8Array(nx * nz), queue = [[i0, k0]]; seen[i0 * nz + k0] = 1;
  const gr = { celulas: 0, unsupported: 0, unsupportedSamples: [], headHits: 0, headSamples: [], headCelulas: 0, pernaHits: 0, pernaSamples: [] };
  for (let q = 0; q < queue.length; q++) {
    const [i, k] = queue[q]; const x = cx(i), z = cz(k);
    gr.celulas++;
    const y = W.groundHeightAt(x, z);
    const before = gr.headHits;
    bodyAt(x, y, z, gr);
    if (gr.headHits > before) gr.headCelulas++;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nk = k + dk; if (ni < 0 || nk < 0 || ni >= nx || nk >= nz) continue;
      const key = ni * nz + nk; if (seen[key]) continue;
      const x2 = cx(ni), z2 = cz(nk);
      if (!bodyFree(x2, z2) || !g._retaAndavel(x, z, x2, z2, R, 0.55)) continue;
      seen[key] = 1; queue.push([ni, nk]);
    }
  }

  // ---- andar de verdade ----
  const reset = (x, z) => {
    p.pos.set(x, W.groundHeightAt(x, z), z); p.vel.set(0, 0, 0); p.grounded = true; p.mantle = null;
    p.crouchF = 0; p.scoped = false; p.hp = 1e9; p.alive = true; p.pitch = 0; g._spaceHeld = false;
    g.keys = { KeyW: true };
  };
  const walkTo = (pts, id) => {
    run = { id, frames: 0, collisionCalls: 0, contacts: 0, contactSamples: [], unsupported: 0, unsupportedSamples: [], headHits: 0, headSamples: [], pernaHits: 0, pernaSamples: [], dist: 0, stall: null, maxNoProgress: 0, trace: [], end: null };
    for (const [tx, tz] of pts) {
      let frames = 0, noProg = 0, best = Math.hypot(tx - p.pos.x, tz - p.pos.z);
      const ARR = 0.45;
      while (Math.hypot(tx - p.pos.x, tz - p.pos.z) > ARR && frames < 900) {
        const ox = p.pos.x, oz = p.pos.z;
        p.yaw = Math.atan2(p.pos.x - tx, p.pos.z - tz);
        g.time += DT; g._updatePlayer(DT); frames++; run.frames++;
        const d = Math.hypot(p.pos.x - ox, p.pos.z - oz); run.dist += d;
        const rem = Math.hypot(tx - p.pos.x, tz - p.pos.z);
        if (rem < best - 1e-4) { best = rem; noProg = 0; } else noProg++;
        run.maxNoProgress = Math.max(run.maxNoProgress, noProg);
        if (run.frames % 6 === 0) { bodyAt(p.pos.x, p.pos.y, p.pos.z, run); run.trace.push([+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]); }
        if (noProg > 180) break;   // 3 s sem progresso = travado
      }
      if (Math.hypot(tx - p.pos.x, tz - p.pos.z) > ARR) { run.stall = { alvo: [+tx.toFixed(1), +tz.toFixed(1)], pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)] }; break; }
    }
    run.end = [+p.pos.x.toFixed(2), +p.pos.z.toFixed(2)];
    const r = run; run = null; return r;
  };
  const near = (x, z) => W.nearestWaypoint(x, z);
  const pathPts = (fx, fz, tx, tz) => {
    const a = near(fx, fz), b = near(tx, tz);
    const ids = W.findPath(a, b);
    if (ids.length < 2 && a !== b) return null;
    return ids.map((i) => [nodes[i].x, nodes[i].z]).concat([[tx, tz]]);
  };

  // ---- PR2: rotas de bandeira nos dois times ----
  const flags = Object.fromEntries(W.ctfPoints.map((c) => [c.id, c]));
  const legs = [];
  for (const team of ['B', 'E']) {
    const s = W.spawns[team][0];
    const seq = team === 'B' ? ['B', 'MID', 'E'] : ['E', 'MID', 'B'];
    reset(s.x, s.z);
    let cx = s.x, cz = s.z;
    for (const fid of seq.concat(['spawn'])) {
      const t = fid === 'spawn' ? { x: s.x, z: s.z } : flags[fid];
      const pts = pathPts(cx, cz, t.x, t.z);
      if (!pts) { legs.push({ id: team + '→' + fid, semCaminho: true }); break; }
      const r = walkTo(pts, team + '→' + fid);
      legs.push(r); cx = p.pos.x; cz = p.pos.z;
      if (r.stall) break;
    }
  }

  // ---- PR3: passeio aleatório com semente fixa ----
  let seed = 3311; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const walks = [];
  for (let k = 0; k < 12; k++) {
    let i = Math.floor(rnd() * nodes.length);
    reset(nodes[i].x, nodes[i].z);
    const pts = [];
    for (let h = 0; h < 6; h++) { const nb = adj[i]; if (!nb.length) break; i = nb[Math.floor(rnd() * nb.length)]; pts.push([nodes[i].x, nodes[i].z]); }
    walks.push(walkTo(pts, 'passeio' + k));
  }

  // restaura
  Object.assign(g, orig);
  const sum = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0);
  const todos = legs.concat(walks);
  if (st.presos) falhas.push(`PR1: ${st.presos} waypoint(s) com o corpo preso (ex.: ${JSON.stringify(st.presosSamples.slice(0, 3))})`);
  if (st.unsupported) falhas.push(`PR1: ${st.unsupported} waypoint(s) sem chão visível (ex.: ${JSON.stringify(st.unsupportedSamples.slice(0, 3))})`);
  if (st.headHits) falhas.push(`PR1: ${st.headHits} raio(s) de cabeça em malha visível nos waypoints (ex.: ${JSON.stringify(st.headSamples.slice(0, 3))})`);
  if (gr.unsupported) falhas.push(`PR1b: ${gr.unsupported} célula(s) alcançável(is) sem chão visível (ex.: ${JSON.stringify(gr.unsupportedSamples.slice(0, 3))})`);
  if (gr.headHits) falhas.push(`PR1b: ${gr.headCelulas} célula(s) alcançável(is) de ${gr.celulas} com malha visível entre ombro e olho (ex.: ${JSON.stringify(gr.headSamples.slice(0, 4))})`);
  for (const l of legs) { if (l.semCaminho) falhas.push(`PR2: sem caminho no grafo para ${l.id}`); else if (l.stall) falhas.push(`PR2: travou em ${l.id} em ${JSON.stringify(l.stall)}`); }
  if (sum(legs, 'headHits')) falhas.push(`PR2: ${sum(legs, 'headHits')} raio(s) de cabeça em malha visível andando (ex.: ${JSON.stringify(legs.flatMap((l) => l.headSamples || []).slice(0, 3))})`);
  if (sum(legs, 'unsupported')) falhas.push(`PR2: ${sum(legs, 'unsupported')} amostra(s) sem chão andando`);
  for (const w of walks) if (w.stall) falhas.push(`PR3: travou em ${w.id} em ${JSON.stringify(w.stall)}`);
  if (sum(walks, 'headHits')) falhas.push(`PR3: ${sum(walks, 'headHits')} raio(s) de cabeça em malha visível no passeio (ex.: ${JSON.stringify(walks.flatMap((w) => w.headSamples || []).slice(0, 3))})`);
  return {
    mutante: mutAplicado, malhasVisiveis: nMesh, waypoints: nodes.length, estatico: st, grade: gr,
    rotas: legs.map((l) => ({ id: l.id, semCaminho: !!l.semCaminho, frames: l.frames, dist: l.dist && +l.dist.toFixed(1), contacts: l.contacts, headHits: l.headHits, unsupported: l.unsupported, maxNoProgress: l.maxNoProgress, stall: l.stall, headSamples: l.headSamples, contactSamples: l.contactSamples, end: l.end })),
    passeio: walks.map((w) => ({ id: w.id, frames: w.frames, dist: +w.dist.toFixed(1), contacts: w.contacts, headHits: w.headHits, unsupported: w.unsupported, stall: w.stall, headSamples: w.headSamples })),
    totais: { frames: sum(todos, 'frames'), metros: +sum(todos, 'dist').toFixed(1), contatos: sum(todos, 'contacts'), headHits: sum(todos, 'headHits') + st.headHits, unsupported: sum(todos, 'unsupported') + st.unsupported },
    falhas,
  };
}, MUTANTE);

result.pageErrors = pageErrors;
result.gerado = new Date().toISOString();
writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(`PRACA RUNTIME${MUTANTE ? ' [mutante ' + MUTANTE + ']' : ''}: ${result.malhasVisiveis} malhas · ${result.waypoints} wps · grade ${result.grade.celulas} células · ${result.totais.frames} frames · ${result.totais.metros} m · contatos ${result.totais.contatos} · headHits ${result.totais.headHits} · joelho ${result.grade.pernaHits + result.estatico.pernaHits} (info) · semChão ${result.totais.unsupported}`);
for (const r of result.rotas) console.log(`  rota ${r.id.padEnd(9)} ${r.semCaminho ? 'SEM CAMINHO' : `${r.dist} m em ${r.frames} f · contatos ${r.contacts} · noProg máx ${r.maxNoProgress}${r.stall ? ' · TRAVOU ' + JSON.stringify(r.stall) : ''}`}`);
for (const f of result.falhas) console.log('  ✗ ' + f);
if (pageErrors.length) console.log('  pageerror: ' + pageErrors.slice(0, 3).join(' | '));
console.log(result.falhas.length ? `✗ ${result.falhas.length} cláusula(s) vermelha(s) -> ${OUT}` : `✓ PR1-PR3 verdes -> ${OUT}`);
await browser.close();
process.exit(result.falhas.length ? 1 : 0);
