/* favela-finish-check.mjs — régua do acabamento M3 das favelas. Contrato completo e
   mutações: docs/visual-consistency/FAVELAS-M3.md (fonte única do porquê). */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { THREE, initTextures } from './harness.mjs';

const USO = 'uso: favela-finish-check.mjs [--mutar=fisica|esconder|verga|uv|occluder] [--gravar] [--fonte=<dir>]';
const args = process.argv.slice(2);
const vistos = new Set();
let MUTANTE = null, GRAVAR = false, FONTE = null;
for (const a of args) {
  const nome = a.startsWith('--') ? (a.includes('=') ? a.slice(0, a.indexOf('=')) : a) : null;
  if (vistos.has(nome)) { console.error(`argumento duplicado: ${a}\n${USO}`); process.exit(2); }
  if (a === '--gravar') { GRAVAR = true; vistos.add(a); }
  else if (nome === '--mutar' || nome === '--fonte') {
    const val = a.slice(a.indexOf('=') + 1);
    if (!val) { console.error(`valor ausente: ${a}\n${USO}`); process.exit(2); }
    if (nome === '--mutar') MUTANTE = val; else FONTE = val;
    vistos.add(nome);
  } else { console.error(`argumento desconhecido: ${a}\n${USO}`); process.exit(2); }
}
if (MUTANTE && !['fisica', 'esconder', 'verga', 'uv', 'occluder'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE} — conhecidos: fisica, esconder, verga, uv, occluder`);
  process.exit(2);
}

const BASELINE = new URL('./favela-finish-baseline.json', import.meta.url);

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };
const q = (v) => Math.round(v * 1e4) / 1e4;

/* snapshot físico COMPLETO: campos AABB e OBB (ry/cx/cz/hx/hz/cos/sin) — o _collideRot
   lê hx/cos/sin; AABB puro é cego a eles (achado 2 do crítico R2). */
const amostrasCampo = (w) => {
  const pts = [];
  for (let x = -33; x <= 33; x += 3) for (let z = -27; z <= 27; z += 3) pts.push(q(w.groundHeightAt(x, z)));
  return pts;
};
const amostrasCorrego = (w) => {
  const pts = [];
  for (let x = -23; x <= 23; x += 2) for (let z = -39; z <= 39; z += 2) pts.push(q(w.groundHeightAt(x, z, 10)));
  for (let x = -13.6; x <= 13.61; x += 0.4) pts.push(q(w.groundHeightAt(x, -11, 10)));
  for (const z of [-22, 0, 22]) for (let x = -5.9; x <= 5.91; x += 0.5) pts.push(q(w.groundHeightAt(x, z, 10)));
  return pts;
};
const num = (k, v) => (typeof v === 'number' && isFinite(v) ? q(v) : v);
const dados = (o) => JSON.parse(JSON.stringify(o, num));
const snapshot = (mapa, w) => ({
  colliders: w.colliders.map((c) => {
    const o = { min: [q(c.minX), q(c.minY), q(c.minZ)], max: [q(c.maxX), q(c.maxY), q(c.maxZ)] };
    if (c.ry !== undefined) Object.assign(o, { ry: q(c.ry), cx: q(c.cx), cz: q(c.cz), hx: q(c.hx), hz: q(c.hz), cos: q(c.cos), sin: q(c.sin) });
    return o;
  }),
  chao: mapa === 'campomorro' ? amostrasCampo(w) : amostrasCorrego(w),
  spawns: dados(w.spawns || null),
  ctf: dados(w.ctfPoints || null),
  pickups: (w.pickups || []).map((p) => dados({ id: p.id, x: p.x, y: p.y, z: p.z })),
  waypoints: w.waypoints ? { nodes: dados(w.waypoints.nodes), adj: dados(w.waypoints.adj) } : null,
  tactical: dados(w.tacticalRoutes || null),
});

async function sobe(mapa) {
  const mod = FONTE
    ? await import(pathToFileURL(`${FONTE}/map_${mapa}.js`).href)
    : await import(new URL(`../../public/js/map_${mapa}.js`, import.meta.url).href);
  const T = await initTextures();
  const scene = new THREE.Scene();
  const W = mod.buildCampoMorro ? mod.buildCampoMorro(scene, T) : mod.buildCorrego(scene, T);
  if (!W?.root || !Array.isArray(W?.colliders)) throw new Error(`build de ${mapa} devolveu mundo sem root/colliders`);
  W.root.updateMatrixWorld(true);
  return { W, scene };
}

const cenas = {};
try {
  cenas.campomorro = await sobe('campomorro');
  cenas.corrego = await sobe('corrego');
} catch (e) {
  console.error(`infraestrutura: build não sobiu — ${String(e?.message || e)}`);
  process.exit(3);
}

const atual = { campomorro: snapshot('campomorro', cenas.campomorro.W), corrego: snapshot('corrego', cenas.corrego.W) };
const segunda = {};
for (const mapa of ['campomorro', 'corrego']) segunda[mapa] = snapshot(mapa, (await sobe(mapa)).W);
const deterministico = JSON.stringify(atual) === JSON.stringify(segunda);

/* mutantes: mudam geometria/collider/lista REAIS em memória; matrixWorld re-bake antes de medir */
if (MUTANTE === 'fisica') {
  const alvo = cenas.corrego.W.colliders.find((c) => c.ry !== undefined && Number.isFinite(c.hx));
  if (!alvo) { console.error('infraestrutura: mutante fisica exige collider OBB (ry/hx finito) no Córrego'); process.exit(3); }
  alvo.hx *= 0.25;
  atual.corrego = snapshot('corrego', cenas.corrego.W);
} else if (MUTANTE === 'verga') {
  cenas.campomorro.W.root.traverse((o) => { if (o.userData?.favelaFinish) o.position.set(100, 100, 100); });
  cenas.campomorro.W.root.updateMatrixWorld(true);
} else if (MUTANTE === 'uv') {
  for (const { W } of Object.values(cenas)) W.root.traverse((o) => {
    if (!o.geometry?.attributes?.uv) return;
    if (o.geometry.userData) delete o.geometry.userData.texelEscalada;
    if (!o.userData?.favelaFinish && !o.material?.userData?.rebocoMetros) return;
    const uv = o.geometry.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.1, uv.getY(k) * 0.1);
  });
} else if (MUTANTE === 'esconder') {
  for (const { W } of Object.values(cenas)) {
    const alvo = [];
    W.root.traverse((o) => { if (o.userData?.favelaFinish) alvo.push(o); });
    for (const o of alvo) o.parent?.remove(o);
    W.root.updateMatrixWorld(true);
  }
} else if (MUTANTE === 'occluder') {
  const W = cenas.corrego.W;
  W.occluders = W.occluders.filter((o) => o.userData?.favelaFinish !== 'corrego');
}

if (GRAVAR) {
  if (!FONTE) { console.error('--gravar exige --fonte=<dir rebased do commit imutável>: baseline nunca sai da árvore editada'); process.exit(2); }
  writeFileSync(BASELINE, JSON.stringify({ fonte: FONTE, ...atual }));
  const obb = atual.campomorro.colliders.filter((c) => c.ry !== undefined).length + atual.corrego.colliders.filter((c) => c.ry !== undefined).length;
  console.log(`baseline gravado de ${FONTE} (${atual.campomorro.colliders.length + atual.corrego.colliders.length} colliders, ${obb} com rotação OBB completa)`);
}

/* FV-M1 — física completa (AABB+OBB) contra o baseline da fonte imutável */
let okFisica = false, msgF = 'baseline ausente — rode --gravar --fonte=<f4 rebased>';
if (existsSync(BASELINE)) {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const dif = (nome) => {
    const a = base[nome], b = atual[nome];
    if (!a) return `baseline sem ${nome}`;
    for (const campo of ['colliders', 'chao', 'spawns', 'ctf', 'pickups', 'waypoints', 'tactical']) {
      if (JSON.stringify(a[campo]) !== JSON.stringify(b[campo])) return `${campo} ${nome} divergiu do baseline`;
    }
    return null;
  };
  const dc = dif('campomorro'), dr = dif('corrego');
  okFisica = !dc && !dr && deterministico;
  msgF = okFisica
    ? `colliders (AABB+OBB ry/cx/cz/hx/hz/cos/sin), chão, spawns, ctf, pickups, waypoints e tactical idênticos ao baseline`
    : `FÍSICA MUDOU${deterministico ? '' : ' (build não determinística)'} — ${dc || dr}`;
} else if (MUTANTE === 'fisica') {
  msgF = 'baseline ausente: mutante físico não demonstrável';
}
put('FV-M1', okFisica, msgF);

/* FV-M2 — verga no topo REAL do vidro e peitoril na base REAL, em WORLD (matrixWorld) */
{
  const mundo = cenas.campomorro.W;
  const janelas = [];
  const wp = new THREE.Vector3();
  mundo.root.traverse((o) => {
    const p = o.geometry?.parameters;
    if (!p || !o.isMesh || !o.material) return;
    if ((p.height === 0.82 || p.height === 0.78) && (p.width === 0.05 || p.depth === 0.05)) {
      o.getWorldPosition(wp);
      janelas.push({ x: wp.x, z: wp.z, base: wp.y - p.height / 2, topo: wp.y + p.height / 2,
        hx: (p.width === 0.05 ? p.depth : p.width) / 2 });
    }
  });
  const verts = [];
  const v = new THREE.Vector3();
  mundo.root.traverse((o) => {
    if (!o.userData?.favelaFinish || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) verts.push(v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).clone());
  });
  const toca = (j, y) => verts.some((wv) =>
    Math.abs(wv.y - y) <= 0.02 && Math.abs(wv.x - j.x) <= j.hx + 0.2 && Math.abs(wv.z - j.z) <= j.hx + 0.2);
  const sem = janelas.filter((j) => !toca(j, j.topo) || !toca(j, j.base));
  put('FV-M2', janelas.length > 0 && sem.length === 0,
    `${janelas.length} janelas com verga/peitoril nos bounds WORLD reais${sem.length ? `; ${sem.length} sem acabamento (ex.: base ${sem[0].base.toFixed(2)}/topo ${sem[0].topo.toFixed(2)})` : ''}`);
}

/* UV por triângulo mundial: ambos valores singulares do Jacobiano em tiles/m.
   Sampler real THREE.Texture; NaN/Inf/canal ausente reprova. */
const razaoTris = (mesh) => {
  const uvA = mesh.geometry.attributes.uv, pos = mesh.geometry.attributes.position, idx = mesh.geometry.index;
  if (!uvA || !pos || !idx) return null;
  const nTri = idx.count / 3;
  const t = mesh.material?.map;
  const v2 = new THREE.Vector2();
  let M = null;
  if (t) {
    if (t.channel !== 0) return { tris: [], pares: [], invalidos: nTri, distintos: 0 };
    for (const c of [t.repeat, t.offset, t.center, t.rotation])
      if (c !== undefined && !Object.values(c).every(Number.isFinite)) return { tris: [], pares: [], invalidos: nTri, distintos: 0 };
    if (t.matrixAutoUpdate) t.updateMatrix(); // única mutação permitida: normalizar a matriz do sampler
    if (!t.matrix?.elements?.every(Number.isFinite)) return { tris: [], pares: [], invalidos: nTri, distintos: 0 };
    M = t.matrix;
  }
  const I3 = new THREE.Matrix3();
  const U = (i) => v2.set(uvA.getX(i), uvA.getY(i)).applyMatrix3(M ?? I3);
  const P = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
  const tris = [], pares = [];
  for (let k = 0; k < idx.count; k += 3) {
    const a = idx.getX(k), b = idx.getX(k + 1), c = idx.getX(k + 2);
    const d1 = U(b).clone().sub(U(a)), d2 = U(c).clone().sub(U(a));
    const e1 = P(b).sub(P(a)), e2 = P(c).sub(P(a));
    const L = e1.length();
    const x = e2.dot(e1) / L, y = e1.clone().cross(e2).length() / L;
    const uv2 = Math.abs(d1.x * d2.y - d2.x * d1.y) / 2, w2 = e1.clone().cross(e2).length() / 2;
    if (!Number.isFinite(uv2) || !Number.isFinite(w2) || L < 1e-9 || y < 1e-9)
      return { tris: [], pares: [], invalidos: nTri, distintos: 0 };
    const c1 = d1.clone().divideScalar(L);
    const c2 = d2.clone().sub(d1.clone().multiplyScalar(x / L)).divideScalar(y);
    const A = c1.dot(c1), B = c1.dot(c2), C = c2.dot(c2);
    const lm = (A + C - Math.hypot(A - C, 2 * B)) / 2, lp = (A + C + Math.hypot(A - C, 2 * B)) / 2;
    pares.push([Math.sqrt(lm), Math.sqrt(lp)]);
    tris.push(Math.sqrt(uv2 / w2));
  }
  const distintos = new Set([...Array(uvA.count)].map((_, i) => { const p = U(i); return `${q(p.x)},${q(p.y)}`; })).size;
  return { tris, pares, invalidos: 0, distintos };
};

/* FV-M3 — UV métrico EFETIVO por face (tile 2 m no Campo por EIXO; Córrego por
   spans/variância da malha com origem no UV autorado mu/mv das peças) */
{
  let paresCampo = [], invalidos = 0, medidos = 0;
  cenas.campomorro.W.root.traverse((o) => {
    if (!o.isMesh || !o.material?.userData?.rebocoMetros) return;
    const r = razaoTris(o);
    if (!r) return;
    medidos++;
    invalidos += r.invalidos;
    paresCampo = paresCampo.concat(r.pares);
  });
  const fora2m = paresCampo.filter(([lo, hi]) => lo < 0.4 || hi > 0.625).length;
  const sig = paresCampo.flatMap((p) => p);
  const campoOk = medidos > 0 && invalidos === 0 && paresCampo.length > 0 && fora2m === 0;
  const msgC = `Campo: ${medidos} malhas, ${paresCampo.length} tris, ${fora2m} fora do tile 2 m por eixo (σ∈[${sig.length ? q(Math.min(...sig)) : '—'}–${sig.length ? q(Math.max(...sig)) : '—'}] tiles/m), ${invalidos} inválidos`;
  const corrego = [];
  cenas.corrego.W.root.traverse((o) => {
    if (!o.userData?.favelaFinish || !o.geometry?.attributes?.uv) return;
    const r = razaoTris(o);
    if (!r) return;
    corrego.push({ r, ok: r.invalidos === 0 && r.distintos >= 4 && r.tris.length > 8
      && r.tris.every((t) => t > 0.01) });
  });
  const cOk = corrego.length >= 3 && corrego.every((c) => c.ok);
  const msgR = `Córrego: ${corrego.length} malhas; uv distintos ${corrego.map((c) => c.r.distintos).join('/')} (constante reprova); ` +
    `tiles/m medidos ${corrego.map((c) => `${q(Math.min(...c.r.tris))}–${q(Math.max(...c.r.tris))}`).join(' ')} — origem física mista (mu/mv×repeat do sampler), sem teto de gosto`;
  put('FV-M3', campoOk && cOk, `${msgC}. ${msgR}`);
}

/* FV-M4 — invisível não é acabamento */
{
  let visiveis = 0, escondidas = 0;
  for (const { W } of Object.values(cenas)) W.root.traverse((o) => {
    if (!o.userData?.favelaFinish) return;
    if (o.visible === false || o.material?.visible === false || !o.parent || !o.geometry?.attributes?.position?.count) escondidas++;
    else visiveis++;
  });
  put('FV-M4', visiveis > 0 && escondidas === 0, `${visiveis} malhas de acabamento visíveis${escondidas ? `, ${escondidas} escondidas/vazias` : ''}`);
}

/* FV-M5 — acabamento da travessia é superfície de verdade: registrado em occluders e
   ray REAL para baixo em (0,8,-11) acerta o topo do tabuleiro (≈5,6) */
{
  const W = cenas.corrego.W;
  const fins = [];
  W.root.traverse((o) => { if (o.userData?.favelaFinish === 'corrego') fins.push(o); });
  const registradas = fins.filter((m) => W.occluders.includes(m));
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 8, -11), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(W.occluders, false);
  const topo = hits.length ? q(hits[0].point.y) : null;
  const acertou = topo !== null && topo > 5.2 && topo < 6.0 && hits.some((h) => fins.includes(h.object));
  put('FV-M5', fins.length === 3 && registradas.length === 3 && acertou,
    `${registradas.length}/${fins.length} malhas em occluders; ray real (0,8,-11)↓ topo=${topo}`);
}

const verde = clausulas.every((c) => c.ok);
console.log(`\nFAVELA-FINISH ${verde ? 'VERDE' : 'VERMELHA'} · ${clausulas.filter((c) => c.ok).length}/${clausulas.length}`);
process.exit(verde ? 0 : 1);
