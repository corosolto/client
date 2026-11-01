/* campo-boundary-finish-check.mjs — régua R8 da guarda de borda do campomorro: degraus
   sem fresta, desenho efetivo, bijeção collider↔malha, snapshot completo pré-R5. FAVELAS-M3.md §R5. */
import { readFileSync, writeFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { THREE, initTextures } from './harness.mjs';

const USO = 'uso: campo-boundary-finish-check.mjs [--mutar=inteira|trecho|colisao|material|ancestral|orfao|obb|pickup|camblocker] [--gravar --fonte=<dir pré-R5>] [--fonte=<dir>]';
const args = process.argv.slice(2);
const vistos = new Set();
let MUTANTE = null, GRAVAR = false, FONTE = null;
for (const a of args) {
  const nome = a.startsWith('--') ? (a.includes('=') ? a.slice(0, a.indexOf('=')) : a) : null;
  if (a !== '--gravar' && !(nome === '--mutar' || nome === '--fonte') || (nome === '--mutar' || nome === '--fonte') && !a.includes('=')) {
    console.error(`argumento desconhecido ou sem '=': ${a}\n${USO}`); process.exit(2);
  }
  if (vistos.has(nome ?? a)) { console.error(`argumento duplicado: ${a}\n${USO}`); process.exit(2); }
  if (a === '--gravar') { GRAVAR = true; vistos.add(a); }
  else {
    const val = a.slice(a.indexOf('=') + 1);
    if (!val) { console.error(`valor ausente: ${a}\n${USO}`); process.exit(2); }
    if (nome === '--mutar') MUTANTE = val; else FONTE = val;
    vistos.add(nome);
  }
}
if (MUTANTE && !['inteira', 'trecho', 'colisao', 'material', 'ancestral', 'orfao', 'obb', 'pickup', 'camblocker'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}\n${USO}`); process.exit(2);
}
if (GRAVAR && (!FONTE || MUTANTE)) { console.error(`--gravar exige --fonte=<dir pré-R5 imutável> e não aceita --mutar\n${USO}`); process.exit(2); }

const HALF_X = 36, HALF_Z = 30;
const BASELINE = new URL('./campo-boundary-baseline.json', import.meta.url);

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };
const q = (v) => Math.round(v * 1e4) / 1e4;
const num = (k, v) => (typeof v === 'number' && isFinite(v) ? q(v) : v);
const dados = (o) => JSON.parse(JSON.stringify(o, num));

/* perímetro EXATO (definição única usada por exclusão e por CB-M2): collider/oclusor
   conta como guarda iff (|cx| ≥ HALF_X−0,35 e extensão em x ≤ 0,7) ou o simétrico em z. */
const eGuarda = (cx, cz, ex, ez) =>
  (Math.abs(cx) >= HALF_X - 0.35 && ex <= 0.7) || (Math.abs(cz) >= HALF_Z - 0.35 && ez <= 0.7);
const aabbMesh = (m) => {
  const b = new THREE.Box3().setFromObject(m);
  return { cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, ex: b.max.x - b.min.x, ez: b.max.z - b.min.z, maxY: b.max.y, b };
};

/* a fonte pré-R5 não tem package.json "type":"module": uma cópia de leitura é plantada
   em node_modules/ (gitignored, resolve o pacote-ponte `three` do harness) para importar. */
const fonteESM = () => {
  const alvo = new URL('../../node_modules/.campo-fonte-esm', import.meta.url).pathname;
  const sha = createHash('sha256').update(readFileSync(`${FONTE}/map_campomorro.js`)).digest('hex');
  let marcador = '';
  try { marcador = readFileSync(`${alvo}/.sha`, 'utf8').trim(); } catch { /* primeira vez */ }
  if (marcador !== sha) {
    rmSync(alvo, { recursive: true, force: true });
    cpSync(FONTE, `${alvo}/js`, { recursive: true });
    writeFileSync(`${alvo}/package.json`, '{"type":"module"}');
    cpSync(`${FONTE}/../vendor`, `${alvo}/vendor`, { recursive: true });
    writeFileSync(`${alvo}/.sha`, sha + '\n');
  }
  return `${alvo}/js/map_campomorro.js`;
};

async function sobe() {
  const mod = FONTE
    ? await import(pathToFileURL(fonteESM()).href)
    : await import(new URL('../../public/js/map_campomorro.js', import.meta.url).href);
  const T = await initTextures();
  const scene = new THREE.Scene();
  const W = mod.buildCampoMorro(scene, T);
  if (!W?.root || !Array.isArray(W?.colliders)) throw new Error('build devolveu mundo sem root/colliders');
  W.root.updateMatrixWorld(true);
  return { W, scene };
}

let W;
try { W = (await sobe()).W; } catch (e) {
  console.error(`infraestrutura: build não subiu — ${String(e?.message || e)}`); process.exit(3);
}

/* fonte pré-R5 não tem etiqueta: reconhece as 4 paredes reais por shape/bbox (fina na
   banda e cobrindo o lado inteiro) — nunca cai no 0-guarda trivial. */
const guardasDe = (w) => {
  const tag = [];
  w.root.traverse((m) => { if (m.userData?.guardaBorda) tag.push(m); });
  if (tag.length) return tag;
  const forma = w.occluders.filter((m) => {
    const p = aabbMesh(m);
    const fx = Math.abs(Math.abs(p.cx) - HALF_X) <= 0.35 && p.ex <= 0.7 && p.ez >= HALF_Z * 2 - 0.1;
    const fz = Math.abs(Math.abs(p.cz) - HALF_Z) <= 0.35 && p.ez <= 0.7 && p.ex >= HALF_X * 2 - 0.1;
    return fx || fz;
  }).map((m) => { m.userData.guardaBorda = Math.abs(aabbMesh(m).ex) < Math.abs(aabbMesh(m).ez) ? 'z' : 'x'; return m; });
  return forma;
};
const guardas = guardasDe(W);

/* mutações em memória: geometria/collider/lista REAIS, nada de if(MUT) no jogo. */
if (MUTANTE === 'inteira') {
  // antecedente da R5: uma parede por lado inteiro, do mínimo global ao máximo global + 3
  for (const m of guardas) { W.root.remove(m); const i = W.occluders.indexOf(m); if (i >= 0) W.occluders.splice(i, 1); }
  W.colliders = W.colliders.filter((c) => !eGuarda((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, c.maxZ - c.minZ));
  guardas.length = 0;
  for (const [fix, eixoX, from, to] of [[-HALF_X, 1, -HALF_Z, HALF_Z], [HALF_X, 1, -HALF_Z, HALF_Z], [-HALF_Z, 0, -HALF_X, HALF_X], [HALF_Z, 0, -HALF_X, HALF_X]]) {
    let min = Infinity, max = -Infinity;
    for (let u = from; u <= to + 0.001; u += 0.02) {
      const g = eixoX ? W.groundHeightAt(fix, u) : W.groundHeightAt(u, fix);
      min = Math.min(min, g); max = Math.max(max, g);
    }
    const h = (max - min) + 3;
    const geo = eixoX ? new THREE.BoxGeometry(0.5, h, to - from) : new THREE.BoxGeometry(to - from, h, 0.5);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
    m.position.set(eixoX ? fix : (from + to) / 2, min + h / 2, eixoX ? (from + to) / 2 : fix);
    m.userData.guardaBorda = eixoX ? 'x' : 'z'; m.visible = true;
    W.root.add(m); W.occluders.push(m); guardas.push(m);
    const x = m.position.x, z = m.position.z;
    W.colliders.push({ minX: x - (eixoX ? 0.25 : (to - from) / 2), maxX: x + (eixoX ? 0.25 : (to - from) / 2), minY: min, maxY: min + h, minZ: z - (eixoX ? (to - from) / 2 : 0.25), maxZ: z + (eixoX ? (to - from) / 2 : 0.25) });
  }
  W.root.updateMatrixWorld(true);
} else if (MUTANTE === 'trecho') {
  // fresta: o trecho do meio do lado sul some (malha, oclusor e collider)
  const alvo = guardas.filter((m) => m.userData.guardaBorda === 'z').sort((a, b) => a.position.x - b.position.x);
  const m = alvo[Math.floor(alvo.length / 2)];
  W.root.remove(m); guardas.splice(guardas.indexOf(m), 1);
  const i = W.occluders.indexOf(m); if (i >= 0) W.occluders.splice(i, 1);
  const b = new THREE.Box3().setFromObject(m);
  const k = W.colliders.findIndex((c) => q(c.minX) === q(b.min.x) && q(c.maxX) === q(b.max.x) && q(c.minY) === q(b.min.y) && q(c.maxZ) === q(b.max.z));
  if (k < 0) { console.error('infraestrutura: collider do trecho não achado'); process.exit(3); }
  W.colliders.splice(k, 1);
} else if (MUTANTE === 'colisao') {
  // colisão gigante invisível: collider da banda sobe 8 m sem malha correspondente
  const c = W.colliders.find((c) => eGuarda((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, c.maxZ - c.minZ));
  if (!c) { console.error('infraestrutura: nenhum collider na banda do perímetro'); process.exit(3); }
  c.maxY += 8;
} else if (MUTANTE === 'material') {
  // material compartilhado invisível: todas as guardas somem do desenho, colliders ficam
  guardas[0].material.visible = false;
} else if (MUTANTE === 'ancestral') {
  // ancestral oculto: nenhuma guarda desenha, m.visible continua true
  W.root.visible = false;
} else if (MUTANTE === 'orfao') {
  // collider órfão na banda: cópia de guarda sul com expansão invisível de 0,19 m para dentro
  const m = guardas.find((g) => g.userData.guardaBorda === 'z' && g.position.z > 0);
  if (!m) { console.error('infraestrutura: nenhuma guarda sul'); process.exit(3); }
  const b = new THREE.Box3().setFromObject(m);
  W.colliders.push({ minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z - 0.19, maxZ: b.max.z });
} else if (MUTANTE === 'obb') {
  // campos OBB num collider interior: AABB idêntico, física rotacionada aparece
  const c = W.colliders.find((c) => !eGuarda((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, c.maxZ - c.minZ));
  if (!c) { console.error('infraestrutura: nenhum collider interior'); process.exit(3); }
  Object.assign(c, { ry: 0.7, cx: (c.minX + c.maxX) / 2, cz: (c.minZ + c.maxZ) / 2, hx: 0.25, hz: 1, cos: Math.cos(0.7), sin: Math.sin(0.7) });
} else if (MUTANTE === 'pickup') {
  // identidade de pickup trocada (AK→AWP): posição intacta, arma muda
  if (!W.pickups?.length) { console.error('infraestrutura: sem pickups'); process.exit(3); }
  W.pickups[0].kind = 'awp'; W.pickups[0].weapon = 'awp';
} else if (MUTANTE === 'camblocker') {
  // camBlocker esticado: câmera para onde não deveria
  if (!W.camBlockers?.length) { console.error('infraestrutura: sem camBlockers'); process.exit(3); }
  W.camBlockers[0].max.x += 10;
}

/* CB-M1 — degrau: cobertura densa sem fresta, topo ≥ 3 m do solo local e o topo
   acompanha a encosta (≤ máx local em janela de trecho + 3 + 0,15). */
{
  const TOL = 0.15, JAN = 7.5;
  const lados = [
    { fix: -HALF_X, eixoX: 1, from: -HALF_Z, to: HALF_Z }, { fix: HALF_X, eixoX: 1, from: -HALF_Z, to: HALF_Z },
    { fix: -HALF_Z, eixoX: 0, from: -HALF_X, to: HALF_X }, { fix: HALF_Z, eixoX: 0, from: -HALF_X, to: HALF_X },
  ];
  let frestas = 0, altas = 0, foraFaixa = 0, detalhe = '';
  for (const L of lados) {
    const gs = [];   // amostras de solo na linha da borda
    for (let u = L.from; u <= L.to + 1e-6; u += 0.25) gs.push({ u, g: W.groundHeightAt(L.eixoX ? L.fix : u, L.eixoX ? u : L.fix) });
    const maxJanela = (u) => Math.max(...gs.filter((s) => Math.abs(s.u - u) <= JAN + 0.25).map((s) => s.g));
    const pecasLado = guardas.map(aabbMesh).filter((p) => L.eixoX ? Math.abs(p.cx - L.fix) <= 0.35 : Math.abs(p.cz - L.fix) <= 0.35);
    for (const p of pecasLado) {
      const len = L.eixoX ? p.ez : p.ex;
      if (len < 6.5 - 0.02 || len > 7.0 + 0.02) { foraFaixa++; detalhe ||= `trecho ${q(len)} m fora de [6,5;7,0]`; }
    }
    const ordenadas = pecasLado.map((p) => L.eixoX ? [p.cz - p.ez / 2, p.cz + p.ez / 2] : [p.cx - p.ex / 2, p.cx + p.ex / 2]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < ordenadas.length; i++) {
      const ov = ordenadas[i - 1][1] - ordenadas[i][0];
      if (ov <= 0 || ov > 0.2 + 1e-6) { foraFaixa++; detalhe ||= `sobreposição ${q(ov)} m fora de (0;0,2]`; }
    }
    if (ordenadas.length && (ordenadas[0][0] > L.from + 1e-3 || ordenadas.at(-1)[1] < L.to - 1e-3)) { foraFaixa++; detalhe ||= 'cobertura das extremidades incompleta'; }
    for (const s of gs) {
      const topo = Math.max(...pecasLado.filter((p) => (L.eixoX ? Math.abs(s.u - p.cz) <= p.ez / 2 + 1e-6 : Math.abs(s.u - p.cx) <= p.ex / 2 + 1e-6)).map((p) => p.maxY), -Infinity);
      if (!isFinite(topo) || topo < s.g + 3 - 0.01) { frestas++; detalhe ||= `u=${q(s.u)} topo=${isFinite(topo) ? q(topo) : 'sem parede'} solo=${q(s.g)}`; }
      else if (topo > maxJanela(s.u) + 3 + TOL) { altas++; detalhe ||= `u=${q(s.u)} topo=${q(topo)} excede máx local+3=${q(maxJanela(s.u) + 3)}`; }
    }
  }
  put('CB-M1', !frestas && !altas && !foraFaixa,
    `${guardas.length} trechos · frestas/alturas<3m: ${frestas} · topos fora da encosta: ${altas} · faixa/sobreposição: ${foraFaixa}${detalhe ? ' · ' + detalhe : ''}`);
}

/* desenho EFETIVO: ancestrais, material (visible/colorWrite/opacity), layers, drawRange/
   índices e escala — m.visible sozinho nem hit de raycast não provam render. */
const desenha = (m) => {
  for (let o = m; o; o = o.parent) if (o.visible === false) return false;
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  if (!mats.length || mats.some((mt) => !mt || mt.visible === false || mt.colorWrite === false || (mt.transparent && !(mt.opacity > 0.01)))) return false;
  if (!m.layers || m.layers.mask === 0) return false;
  const g = m.geometry;
  if (!g) return false;
  if (g.drawRange.count !== Infinity && g.drawRange.count <= 0) return false;
  if (g.index ? g.index.count === 0 : !g.attributes.position || g.attributes.position.count === 0) return false;
  if (['x', 'y', 'z'].some((e) => Math.abs(m.scale?.[e] ?? 1) < 1e-6)) return false;
  return true;
};

const SEIS = ['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ'];
/* collider corresponde à malha iff os 6 limites batem E não sobra campo físico nenhum
   (OBB/kind/…) que a malha não tenha: comparação por TODOS os campos determinísticos. */
const corresponde = (c, b) => SEIS.every((k, i) => Math.abs(c[k] - b[i]) < 1e-4)
  && Object.keys(c).every((k) => SEIS.includes(k));
const chave6 = (m) => { const b = new THREE.Box3().setFromObject(m); return [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z]; };

/* CB-M2 — bijeção finita guarda↔collider na banda: cada trecho desenhado, oclusor e com
   collider idêntico; todo collider da banda casado com no máximo UMA malha — nada órfão. */
{
  const problemas = [];
  const usados = new Set();
  for (const m of guardas) {
    const at = `@(${q(m.position.x)},${q(m.position.z)})`;
    if (!desenha(m)) problemas.push(`trecho sem desenho efetivo ${at}`);
    if (!W.occluders.includes(m)) problemas.push(`trecho fora de occluders ${at}`);
    const b = chave6(m);
    const k = W.colliders.findIndex((c, i) => !usados.has(i) && corresponde(c, b));
    if (k < 0) problemas.push(`sem collider equivalente (6 limites+campos) ${at}`);
    else usados.add(k);
  }
  const orfaos = W.colliders.filter((c, i) => !usados.has(i)
    && eGuarda((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, c.maxZ - c.minZ));
  if (orfaos.length) problemas.push(`${orfaos.length} collider(s) na banda sem malha correspondente (ex: z ${q(orfaos[0].minZ)}..${q(orfaos[0].maxZ)})`);
  put('CB-M2', !problemas.length, `${guardas.length} trechos desenhados/oclusores/colliders bijetivos · ${problemas.length ? problemas.slice(0, 3).join(' · ') : 'nenhum collider órfão na banda'}`);
}

/* CB-M3 — tiro de olho para fora não escapa: raio a 1,6 m do solo, 1,2 m para dentro da
   parede, perpendicular à borda, acerta a guarda em toda amostra densa. */
{
  let escapes = 0, detalhe = '';
  const dir = new THREE.Vector3(), orig = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  for (const [fix, eixoX, from, to, sinal] of [[-HALF_X, 1, -HALF_Z, HALF_Z, -1], [HALF_X, 1, -HALF_Z, HALF_Z, 1], [-HALF_Z, 0, -HALF_X, HALF_X, -1], [HALF_Z, 0, -HALF_X, HALF_X, 1]]) {
    for (let u = from + 1; u <= to - 1; u += 0.5) {
      const ix = eixoX ? fix - sinal * 1.2 : u, iz = eixoX ? u : fix - sinal * 1.2;
      orig.set(ix, W.groundHeightAt(ix, iz) + 1.6, iz);
      dir.set(eixoX ? sinal : 0, 0, eixoX ? 0 : sinal).normalize();
      ray.set(orig, dir); ray.far = 8;
      if (ray.intersectObjects(guardas, false).length === 0) { escapes++; detalhe ||= `(${q(orig.x)},${q(orig.z)}) → fora`; }
    }
  }
  put('CB-M3', !escapes, `raios de olho a 1,6 m: ${escapes ? escapes + ' escapam (' + detalhe + ')' : 'nenhum escapa do perímetro'}`);
}

/* CB-M4 — interior intocado: física completa e geometria/matrizes dos oclusores.
   A banda excluída é somente o conjunto casado em CB-M2; a fonte é pré-R5. */
const serCollider = (c) => {
  const o = {};
  for (const k of Object.keys(c).sort()) {
    const v = c[k];
    if (typeof v === 'number' && isFinite(v)) o[k] = q(v);
    else if (typeof v === 'boolean' || typeof v === 'string') o[k] = v;
  }
  return o;
};
const serAtributo = (a) => a ? {
  tipo: (a.array || a.data?.array)?.constructor.name,
  itemSize: a.itemSize, count: a.count, normalized: a.normalized,
  offset: a.offset ?? null, stride: a.data?.stride ?? null,
  valores: Array.from(a.array || a.data?.array || []),
} : null;
const geometriaSha = (g) => createHash('sha256').update(JSON.stringify({
  attributes: Object.fromEntries(Object.keys(g.attributes).sort().map((k) => [k, serAtributo(g.attributes[k])])),
  index: serAtributo(g.index), drawRange: g.drawRange, groups: g.groups,
  morphAttributes: Object.fromEntries(Object.keys(g.morphAttributes).sort().map((k) => [k, g.morphAttributes[k].map(serAtributo)])),
  morphTargetsRelative: g.morphTargetsRelative,
}, (_, v) => typeof v === 'number' && !Number.isFinite(v) ? ['numero-nao-finito', String(v)] : v)).digest('hex');
const serOclusor = (m) => {
  const e = [...m.matrixWorld.elements].map(q);
  const geometria = geometriaSha(m.geometry);
  const raycast = { layers: m.layers.mask, lados: (Array.isArray(m.material) ? m.material : [m.material]).map((mt) => mt?.side),
    morph: m.morphTargetInfluences ?? null };
  return m.isInstancedMesh ? ['i', m.count, e, [...m.instanceMatrix.array].map(q), geometria, raycast] : ['m', e, geometria, raycast];
};
const snapshot = (w) => {
  const gs = guardasDe(w).map(chave6);
  const ehGuarda = (c) => eGuarda((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, c.maxZ - c.minZ)
    && gs.some((b) => corresponde(c, b));
  const chao = [];
  for (let x = -33; x <= 33; x += 3) for (let z = -27; z <= 27; z += 3)
    if (Math.abs(x) < HALF_X - 1.5 && Math.abs(z) < HALF_Z - 1.5) chao.push(q(w.groundHeightAt(x, z)));
  const setGuardas = new Set(guardasDe(w));
  const oclusores = w.occluders.filter((m) => !setGuardas.has(m)).map(serOclusor);
  return {
    colliders: w.colliders.filter((c) => !ehGuarda(c)).map(serCollider),
    oclusores,
    camBlockers: (w.camBlockers || []).map((b) => [q(b.min.x), q(b.max.x), q(b.min.y), q(b.max.y), q(b.min.z), q(b.max.z)]),
    chao,
    spawns: dados(w.spawns || null),
    ctf: dados(w.ctfPoints || null),
    pickups: (w.pickups || []).map((p) => dados({ id: p.id, x: p.x, y: p.y, z: p.z, kind: p.kind, weapon: p.weapon, readyAt: p.readyAt })),
    waypoints: w.waypoints ? { nodes: dados(w.waypoints.nodes), adj: dados(w.waypoints.adj) } : null,
    tactical: dados(w.tacticalRoutes || null),
  };
};

/* determinismo mede DOIS builds limpos; W (que pode estar mutado em memória) só entra
   na comparação com o baseline — mutante é divergência de interior, não indeterminismo. */
let deterministico = false;
try {
  const w2 = (await sobe()).W, w3 = (await sobe()).W;
  deterministico = JSON.stringify(snapshot(w2)) === JSON.stringify(snapshot(w3));
}
catch (e) { console.error(`infraestrutura: builds de determinismo não subiram — ${String(e?.message || e)}`); process.exit(3); }

if (GRAVAR) {
  const sha = createHash('sha256').update(readFileSync(`${FONTE}/map_campomorro.js`)).digest('hex');
  writeFileSync(BASELINE, JSON.stringify({ meta: { fonte: FONTE, sha256: sha }, snap: snapshot(W) }, null, 1) + '\n');
  console.log(`baseline completo gravado da fonte pré-R5 (sha256 ${sha.slice(0, 12)}…)`);
}
let okM4 = false, msgM4 = 'baseline ausente — rode --gravar --fonte=<dir pré-R5>';
if (existsSync(BASELINE)) {
  if (!deterministico) put('CB-M4', false, 'build não determinística');
  else {
    const doc = JSON.parse(readFileSync(BASELINE, 'utf8'));
    if (!doc?.meta?.sha256 || !doc?.snap) put('CB-M4', false, 'baseline sem proveniência (meta.sha256/snap) — regrave com --gravar --fonte=<dir pré-R5>');
    else {
      const base = JSON.stringify(doc.snap);
      const agora = JSON.stringify(snapshot(W));
      okM4 = base === agora;
      msgM4 = okM4 ? `interior idêntico ao baseline pré-R5 (sha256 ${doc.meta.sha256.slice(0, 12)}… · colliders completos/oclusores-geometria-matriz/camBlockers/chão/spawns/ctf/pickups-kind/waypoints/tactical)` : 'interior divergiu do baseline';
      if (!okM4) {
        const a = doc.snap, b = JSON.parse(agora);  // já compactos: só chaves divergentes
        for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) msgM4 += ` · ${k}`;
      }
      put('CB-M4', okM4, msgM4);
    }
  }
} else {
  if (MUTANTE) msgM4 = 'baseline ausente: mutante não demonstrável em CB-M4';
  put('CB-M4', okM4, msgM4);
}

const verde = clausulas.every((c) => c.ok);
console.log(`\nCAMPO-BOUNDARY ${verde ? 'VERDE' : 'VERMELHA'} · ${clausulas.filter((c) => c.ok).length}/${clausulas.length}`);
process.exit(verde ? 0 : 1);
