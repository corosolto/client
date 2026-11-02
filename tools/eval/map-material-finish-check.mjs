// UV/acabamento de Ferro/Campo, tint mineral do solo e capim×balcão do escritório;
// método e limites em docs/visual-consistency/ACABAMENTO-MAPAS.md.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').slice(10);
const MUTANTES = new Set(['tijolo-8m', 'reboco-3x', 'solo-losango', 'reboco-sem-detalhe', 'ao-branco', 'solo-sem-tint', 'capim-no-balcao', 'capim-mesh-no-balcao', 'tijolo-face-colapsada', 'reboco-face-nan', 'tijolo-sem-grupos', 'reboco-grupo-truncado', 'tijolo-repeat', 'tijolo-offset-nan', 'tijolo-matriz', 'tijolo-canal', 'reboco-mesclado-periodo', 'reboco-mesclado-nan', 'reboco-mesclado-cisalha', 'reboco-mesclado-indice', 'reboco-mesclado-drawrange', 'reboco-mesclado-posicao']);
if (MUT && !MUTANTES.has(MUT)) throw Error(`Mutante desconhecido: ${MUT}`);
const SOLO_VEG = process.argv.includes('--solo-vegetacao');
const QUALITY = (process.argv.find((a) => a.startsWith('--quality=')) || '').slice(10) || null;
// LOWQ de map_ferrovelho é const avaliada no import a partir de localStorage: precisa
// existir ANTES do harness trazer o módulo do mapa (mesmo truque do probe de auditoria).
if (QUALITY) globalThis.localStorage = { getItem: (k) => (k === 'awpbr_settings' ? JSON.stringify({ quality: QUALITY }) : null) };
const { bootGame, initTextures, THREE } = await import('./harness.mjs');

const epsilonUV = ref => 64 * 2 ** -23 * ref;

const spanAxis = (geo, groups, axis) => {
  const uv = geo.attributes.uv, idx = geo.index;
  let min = Infinity, max = -Infinity;
  for (let k = groups.start; k < groups.start + groups.count; k++) {
    const v = axis === 'u' ? uv.getX(idx.getX(k)) : uv.getY(idx.getX(k));
    if (v < min) min = v; if (v > max) max = v;
  }
  return max - min;
};
const groupFace = (geo, materialIndex) => geo.groups.find((g) => (g.materialIndex | 0) === materialIndex);
const faceExt = (p, w, h, d) => p === 0 || p === 1 ? [d, h] : p === 2 || p === 3 ? [w, d] : [w, h];
// O período está baked no UV; os samplers reais devem preservar esse espaço.
const texturaMetrica = (m, rotulo) => {
  const material = Array.isArray(m.material) ? m.material : [m.material];
  const slots = ['map', 'normalMap', 'roughnessMap'];
  for (const mat of material) for (const slot of slots) {
    const t = mat?.[slot] || mat?.userData?.detalhe?.[slot];
    if (!t) continue;
    const params = [t.repeat.x, t.repeat.y, t.offset.x, t.offset.y, t.center.x, t.center.y, t.rotation];
    if (t.matrixAutoUpdate) t.updateMatrix();
    const identidade = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (t.channel !== 0 || !params.every(Number.isFinite)
      || !t.matrix.elements.every((v, i) => Number.isFinite(v) && Math.abs(v - identidade[i]) <= 64 * Number.EPSILON))
      out.falhas.push(`${rotulo}: textura ${slot} altera UV métrico — transformação/canal não identidade`);
  }
};
// Malha mesclada REAL (BufferGeometry sem parameters, material único): material único desenha
// o drawRange inteiro — sem groups é legítimo aqui; o contrato de caixa/grupos segue em medeParede.
const medeMesclada = (m, rotulo) => {
  texturaMetrica(m, rotulo);
  const geo = m.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index;
  const id = `${rotulo} malha mesclada ${m.uuid.slice(0, 8)}`;
  if (!pos || !uv || pos.itemSize !== 3 || uv.itemSize !== 2 || (idx && idx.itemSize !== 1)) {
    out.falhas.push(`${id}: atributos posição/UV/índice ausentes ou com itemSize inválido`); return [];
  }
  const total = idx ? idx.count : pos.count;
  const inicio = geo.drawRange.start, conta = geo.drawRange.count;
  if (!Number.isInteger(inicio) || inicio < 0 || inicio > total
    || !(conta === Infinity || (Number.isInteger(conta) && conta >= 0))) {
    out.falhas.push(`${id}: drawRange inválido`); return [];
  }
  const fim = Math.min(total, inicio + conta);
  if (geo.groups?.length) {   // valida partição, não confia: material único desenha o range todo
    const cobertura = new Uint8Array(fim - inicio);
    let particao = true;
    for (const grupo of geo.groups) {
      if (!Number.isInteger(grupo.start) || !Number.isInteger(grupo.count)
        || grupo.start < 0 || grupo.count < 0 || grupo.start % 3 || grupo.count % 3
        || grupo.start + grupo.count > total) { particao = false; continue; }
      for (let k = Math.max(inicio, grupo.start); k < Math.min(fim, grupo.start + grupo.count); k++) {
        if (cobertura[k - inicio]) particao = false;
        cobertura[k - inicio] = 1;
      }
    }
    if (!particao || cobertura.some(n => n !== 1)) out.falhas.push(`${id}: grupos sem partição exata — cobertura incompleta/sobreposta`);
  }
  const n = fim - inicio;
  if (n < 3 || n % 3) { out.falhas.push(`${id}: drawRange não fecha triângulos completos (${n} índices)`); return []; }
  m.updateWorldMatrix(true, false);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const pu = new THREE.Vector3(), pv = new THREE.Vector3();
  const vertice = (k) => {
    const i = idx ? idx.getX(k) : k;
    if (!Number.isInteger(i) || i < 0 || i >= pos.count || i >= uv.count)
      throw { msg: `${id}: índice desenhado inválido (${i})` };
    const u = uv.getX(i), v = uv.getY(i);
    if (!Number.isFinite(u) || !Number.isFinite(v)) throw { msg: `${id}: UV desenhado não finito` };
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
      throw { msg: `${id}: posição desenhada não finita` };
    return { u, v, x, y, z };
  };
  const achados = [];
  try {
    for (let k = inicio; k < fim; k += 3) {
      const t = (k - inicio) / 3;
      const v0 = vertice(k), v1 = vertice(k + 1), v2 = vertice(k + 2);
      A.set(v0.x, v0.y, v0.z).applyMatrix4(m.matrixWorld);
      B.set(v1.x, v1.y, v1.z).applyMatrix4(m.matrixWorld);
      C.set(v2.x, v2.y, v2.z).applyMatrix4(m.matrixWorld);
      const ax = B.x - A.x, ay = B.y - A.y, az = B.z - A.z;
      const bx = C.x - A.x, by = C.y - A.y, bz = C.z - A.z;
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const area2 = cx * cx + cy * cy + cz * cz;
      if (!Number.isFinite(area2) || area2 === 0) { out.falhas.push(`${id}: triângulo ${t} de área zero/não finita`); continue; }
      const du1 = v1.u - v0.u, du2 = v2.u - v0.u, dv1 = v1.v - v0.v, dv2 = v2.v - v0.v;
      const det = du1 * dv2 - du2 * dv1;
      if (!Number.isFinite(det) || det === 0) { out.falhas.push(`${id}: triângulo ${t} com UV de rank colapsado (det=${det})`); continue; }
      pu.set((ax * dv2 - bx * dv1) / det, (ay * dv2 - by * dv1) / det, (az * dv2 - bz * dv1) / det);
      pv.set((bx * du1 - ax * du2) / det, (by * du1 - ay * du2) / det, (bz * du1 - az * du2) / det);
      const lu = pu.length(), lv = pv.length();
      if (!(Number.isFinite(lu) && lu > 0) || !(Number.isFinite(lv) && lv > 0)) {
        out.falhas.push(`${id}: triângulo ${t} com período U/V não finito/zero`); continue;
      }
      const cos = pu.dot(pv) / (lu * lv);
      if (Math.abs(cos) > epsilonUV(1))
        out.falhas.push(`${id}: triângulo ${t} com cisalhamento UV (cos=${cos.toFixed(6)}) — U/V não ortogonais no mundo`);
      achados.push({ tileU_m: lu, tileV_m: lv, tri: t });
    }
  } catch (e) { if (!e?.msg) throw e; out.falhas.push(e.msg); return []; }
  if (!achados.length) out.falhas.push(`${id}: nenhum triângulo mensurável — cauda não pode sair em silêncio`);
  return achados;
};
// Medição por parede: as 4 faces verticais ESPERADAS precisam de grupo presente, UV finito e
// span finito > 0 — face colapsada/NaN reprova com identificação, não sai da lista em silêncio.
const medeParede = (m, rotulo) => {
  if (m.geometry.type === 'PlaneGeometry') return [];   // mural tem contrato próprio
  if (!Array.isArray(m.material) && !m.geometry.parameters) return medeMesclada(m, rotulo);
  texturaMetrica(m, rotulo);
  if (!m.geometry.groups?.length) { out.falhas.push(`${rotulo}: parede sem grupos — cobertura incompleta`); return []; }
  const geo = m.geometry, idx = geo.index, uv = geo.attributes.uv;
  if (!idx || !uv) { out.falhas.push(`${rotulo}: parede sem índices/UV`); return []; }
  const inicio = geo.drawRange.start, conta = geo.drawRange.count;
  if (!Number.isInteger(inicio) || inicio < 0 || inicio > idx.count
    || !(conta === Infinity || (Number.isInteger(conta) && conta >= 0))) {
    out.falhas.push(`${rotulo}: drawRange inválido`); return [];
  }
  const fim = Math.min(idx.count, inicio + conta), cobertura = new Uint8Array(fim - inicio);
  let particao = true;
  for (const grupo of geo.groups) {
    if (!Number.isInteger(grupo.start) || !Number.isInteger(grupo.count)
      || grupo.start < 0 || grupo.count < 0 || grupo.start % 3 || grupo.count % 3
      || grupo.start + grupo.count > idx.count) { particao = false; continue; }
    for (let k = Math.max(inicio, grupo.start); k < Math.min(fim, grupo.start + grupo.count); k++) {
      if (cobertura[k - inicio]) particao = false;
      cobertura[k - inicio] = 1;
    }
  }
  if (!particao || cobertura.some(n => n !== 1)) out.falhas.push(`${rotulo}: grupos sem partição exata — cobertura incompleta/sobreposta`);
  if (!particao) return [];
  // Material único desenha o index range inteiro, mesmo fora dos grupos de medida.
  for (let k = inicio; k < fim; k++) {
    const i = idx.getX(k);
    if (!Number.isInteger(i) || i < 0 || i >= uv.count
      || !Number.isFinite(uv.getX(i)) || !Number.isFinite(uv.getY(i))) {
      out.falhas.push(`${rotulo}: UV desenhado não finito/índice inválido`); break;
    }
  }
  const [W, H, D] = extents(m), achados = [];
  for (const face of [0, 1, 4, 5]) {
    const id = `${rotulo} parede ${W.toFixed(1)}x${H.toFixed(1)}x${D.toFixed(1)} face ${face}`;
    const g = groupFace(m.geometry, face);
    if (!g) { out.falhas.push(`${id}: grupo da face vertical ausente — cobertura incompleta`); continue; }
    const uv = m.geometry.attributes.uv, idx = m.geometry.index;
    for (let k = g.start; k < g.start + g.count; k++) {
      const i = idx.getX(k);
      if (!Number.isFinite(uv.getX(i)) || !Number.isFinite(uv.getY(i))) { out.falhas.push(`${id}: UV não finito`); break; }
    }
    const su = spanAxis(m.geometry, g, 'u'), sv = spanAxis(m.geometry, g, 'v');
    if (!(Number.isFinite(su) && su > 0) || !(Number.isFinite(sv) && sv > 0)) out.falhas.push(`${id}: span U=${su} V=${sv} — colapsado/não finito`);
    else {
      const [eu, ev] = faceExt(face, W, H, D);
      achados.push({ w: +W.toFixed(2), h: +H.toFixed(2), d: +D.toFixed(2), face, tileU_m: eu / su, tileV_m: ev / sv });
    }
  }
  return achados;
};
const extents = (m) => {
  m.geometry.computeBoundingBox();
  const b = m.geometry.boundingBox;
  return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
};

const out = { mutante: MUT || null, mapa: {}, custos: {}, falhas: [] };

const SLOTS_TEX = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'metalnessMap'];
const contaCusto = (game) => {
  const c = { meshes: 0, materiais: new Set(), texturas: new Set() };
  game.scene.traverse((o) => {
    if (!o.isMesh) return;
    c.meshes++;
    for (const mm of (Array.isArray(o.material) ? o.material : [o.material])) {
      c.materiais.add(mm.uuid);
      for (const slot of SLOTS_TEX) if (mm?.[slot]) c.texturas.add(mm[slot].uuid);
    }
  });
  return { meshes: c.meshes, materiais: c.materiais.size, texturas: c.texturas.size };
};

/* Capim × balcão: triângulo EFETIVO (instância × malha de folhagem) cruzando o volume
   sólido do balcão do escritório — por geometria, sem nome de clump nem de malha. */
function medirVegetacao(game, comInvasor) {
  const balcoes = [];
  game.scene.updateMatrixWorld(true);
  game.scene.traverse((o) => {
    const p = o.geometry?.parameters;
    if (o.isMesh && p?.width === 3.2 && p?.height === 1 && p?.depth === 1.4 && o.position.x === -8 && o.position.z === -31.5) balcoes.push(o);
  });
  if (balcoes.length !== 1) return { erro: `balcão ausente/ambíguo (${balcoes.length})` };
  const solido = new THREE.Box3().setFromObject(balcoes[0]);
  const folhagens = [];
  game.scene.traverse((o) => {
    if ((o.isInstancedMesh || (o.isMesh && !o.isInstancedMesh)) && o.userData.nonSolidSurface && o.material?.transparent && o.material.alphaTest > 0) folhagens.push(o);
  });
  if (!folhagens.length) return { erro: 'nenhuma folhagem nonSolidSurface+alphaTest — régua cega' };
  const comuns = folhagens.filter((f) => !f.isInstancedMesh);
  if (comInvasor === 'mesh') {
    if (!comuns.length) return { erro: 'nenhuma folhagem Mesh comum — invasor de classe Mesh não simulável (régua cega)' };
    const alvo = comuns[comuns.length - 1];
    alvo.position.set(-8, .9, -31.5);
    game.scene.updateMatrixWorld(true);
  }
  if (comInvasor === 'instanced') {
    const alvo = folhagens.find((f) => f.isInstancedMesh);
    const m = new THREE.Matrix4(); alvo.getMatrixAt(0, m);
    m.setPosition(-8, .9, -31.5);
    alvo.setMatrixAt(0, m); alvo.instanceMatrix.needsUpdate = true;
  }
  const m = new THREE.Matrix4(), world = new THREE.Matrix4();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = new THREE.Triangle(a, b, c);
  let instancias = 0; const invasoes = [];
  for (const f of folhagens) {
    const instanced = !!f.isInstancedMesh;
    const nInst = instanced ? f.count : 1;   // Mesh comum: 1 instância identidade sob matrixWorld
    instancias += nInst;
    const pos = f.geometry.attributes.position, idx = f.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < nInst; i++) {
      if (instanced) { f.getMatrixAt(i, m); world.multiplyMatrices(f.matrixWorld, m); }
      else world.copy(f.matrixWorld);
      let hit = 0;
      for (let k = 0; k < count; k += 3) {
        a.fromBufferAttribute(pos, idx ? idx.getX(k) : k).applyMatrix4(world);
        b.fromBufferAttribute(pos, idx ? idx.getX(k + 1) : k + 1).applyMatrix4(world);
        c.fromBufferAttribute(pos, idx ? idx.getX(k + 2) : k + 2).applyMatrix4(world);
        if (solido.intersectsTriangle(tri)) hit++;
      }
      if (hit) invasoes.push({ malha: f.uuid.slice(0, 8), instancia: i, classe: instanced ? 'instanced' : 'mesh', triangulos: hit });
    }
  }
  return { balcao: { min: solido.min.toArray(), max: solido.max.toArray() }, malhasFolha: folhagens.length, malhasComuns: comuns.length, instancias, invasoes };
}

// 'low' fixa LOWQ no import do mapa: o nível só existe em processo filho separado.
function vegetacaoLow() {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--solo-vegetacao', '--quality=low'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  const linha = (r.stdout || '').split('\n').find((l) => l.startsWith('__VEG__'));
  if (r.error) return { erro: `subprocesso low: ${r.error.message}` };
  if (r.status !== 0 || !linha) {
    const fim = (r.stderr || '').split('\n').filter(Boolean).slice(-2).join(' | ');
    return { erro: `subprocesso low saiu ${r.status}${fim ? `: ${fim}` : ''}` };
  }
  return JSON.parse(linha.slice(7));
}

if (SOLO_VEG) {
  const game = bootGame('ferro_velho', { textures: initTextures(), bots: 0 });
  console.log('__VEG__' + JSON.stringify(medirVegetacao(game, false)));
} else {

/* -------- FERRO: casa B (tag graffitiRespawnB da curadoria) + solo de referência ---- */
let vegMed = null;
{
  const game = bootGame('ferro_velho', { textures: initTextures(), bots: 0 });
  const casaB = [], solo = [];
  game.scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.graffitiRespawnB) casaB.push(o);
    const p = o.geometry?.parameters;
    if (p && p.width === 64 && p.height === 72 && o.material.map?.name === 'packed-junkyard-earth') solo.push(o);
  });
  if (MUT === 'tijolo-8m') for (const m of casaB) {
    const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 1.2 / 8);
  }
  if (MUT === 'tijolo-face-colapsada' && casaB[0]) {   // U zerado NUMA face: a face some da medida
    const m0 = casaB[0], g = groupFace(m0.geometry, 0), uv = m0.geometry.attributes.uv, idx = m0.geometry.index;
    const vistos = new Set();
    for (let k = g.start; k < g.start + g.count; k++) { const i = idx.getX(k); if (vistos.has(i)) continue; vistos.add(i); uv.setX(i, 0); }
    uv.needsUpdate = true;
  }
  if (MUT === 'tijolo-sem-grupos') {
    const parede = casaB.find(m => m.geometry.type !== 'PlaneGeometry' && m.geometry.groups.length);
    if (!parede) throw Error('tijolo-sem-grupos NAOAPLICOU: nenhuma caixa com grupos');
    parede.geometry.clearGroups(); parede.geometry.attributes.uv.array.fill(0);
  }
  if (MUT === 'tijolo-repeat') {
    if (!casaB[0]?.material?.map) throw Error('tijolo-repeat NAOAPLICOU: textura real ausente');
    casaB[0].material.map.repeat.set(3, 1);
  }
  if (['tijolo-offset-nan', 'tijolo-matriz', 'tijolo-canal'].includes(MUT)) {
    const t = casaB[0]?.material?.normalMap;
    if (!t) throw Error(`${MUT} NAOAPLICOU: normalMap real ausente`);
    if (MUT === 'tijolo-offset-nan') t.offset.x = NaN;
    if (MUT === 'tijolo-matriz') { t.matrixAutoUpdate = false; t.matrix.set(3, 0, 0, 0, 1, 0, 0, 0, 1); }
    if (MUT === 'tijolo-canal') t.channel = 1;
  }
  const medidas = [];
  for (const m of casaB) medidas.push(...medeParede(m, 'ferro'));
  for (const md of medidas) {
    if (Math.abs(md.tileU_m - 1.2) > epsilonUV(1.2)) out.falhas.push(`ferro: tileU do tijolo ${md.tileU_m} m (esperado 1,2) na parede ${md.w}x${md.h}x${md.d} face ${md.face}`);
    if (Math.abs(md.tileV_m - 2.0) > epsilonUV(2)) out.falhas.push(`ferro: tileV do tijolo ${md.tileV_m} m (esperado 2,0) na parede ${md.w}x${md.h}x${md.d} face ${md.face}`);
  }
  if (!medidas.length) out.falhas.push('ferro: nenhuma face de tijolo medida (tag graffitiRespawnB ausente?)');
  for (const m of casaB) {
    if (!m.geometry.attributes.color) out.falhas.push('ferro: casa B sem AO de vértice (cor removida)');
    else {
      const c = m.geometry.attributes.color;
      if (MUT === 'ao-branco') for (let i = 0; i < c.count; i++) c.setXYZ(i, 1, 1, 1);
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < c.count; i++) for (const get of ['getX', 'getY', 'getZ']) {
        const value = c[get](i);
        if (!Number.isFinite(value)) out.falhas.push('ferro: AO com componente não finito');
        min = Math.min(min, value); max = Math.max(max, value);
      }
      if (!(min < max)) out.falhas.push('ferro: AO da casa B perdeu a variação por vértice');
    }
  }

  if (!solo.length) out.falhas.push('ferro: terreno de referência 64x72 com packed-junkyard-earth não encontrado');
  for (const s of solo) {
    const cor = s.material.color;
    if (Math.abs(cor.r - 1) > 1e-3 || Math.abs(cor.g - 1) > 1e-3 || Math.abs(cor.b - 1) > 1e-3)
      out.falhas.push(`ferro: solo do Ferro ganhou tint (${cor.r.toFixed(3)},${cor.g.toFixed(3)},${cor.b.toFixed(3)}) — o tint mineral é só do Campo`);
  }
  const tileSolo = solo.length ? { x: 64 / solo[0].material.map.repeat.x, z: 72 / solo[0].material.map.repeat.y } : null;
  out.mapa.ferro = { paredes: casaB.length, medidas, tileSoloReferencia: tileSolo };
  out.custos.ferro = contaCusto(game);
  vegMed = medirVegetacao(game, MUT === 'capim-mesh-no-balcao' ? 'mesh' : MUT === 'capim-no-balcao' ? 'instanced' : false);
}

/* -------- CAMPO: reboco (tile 2 m + par detalhe) + solo na densidade do Ferro ------- */
{
  const game = bootGame('campomorro', { textures: initTextures(), bots: 0 });
  const reboco = [], solo = [];
  game.scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (m?.name === 'campo-reboco') reboco.push(o);
    }
    const p = o.geometry?.parameters;
    if (p && p.width === 72 && p.height === 60) solo.push(o);
  });
  if (MUT === 'reboco-3x') for (const m of reboco) {
    const uv = m.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) / 3); uv.setY(i, uv.getY(i) / 3); }
  }
  if (MUT === 'reboco-grupo-truncado') {
    const parede = reboco.find(m => m.geometry.type === 'BoxGeometry' && m.geometry.groups.length);
    if (!parede) throw Error('reboco-grupo-truncado NAOAPLICOU: nenhuma caixa com grupos');
    const grupo = groupFace(parede.geometry, 0);
    if (grupo.count <= 3) throw Error('reboco-grupo-truncado NAOAPLICOU: face já truncada');
    grupo.count = 3; parede.geometry.attributes.uv.setY(3, NaN);
  }
  if (MUT === 'reboco-face-nan' && reboco[0]) {   // NaN numa face: antes era descartada em silêncio
    const m0 = reboco.find((m) => m.geometry.groups?.length) || reboco[0], g = groupFace(m0.geometry, 4), uv = m0.geometry.attributes.uv, idx = m0.geometry.index;
    const vistos = new Set();
    for (let k = g.start; k < g.start + g.count; k++) { const i = idx.getX(k); if (vistos.has(i)) continue; vistos.add(i); uv.setY(i, NaN); }
    uv.needsUpdate = true;
  }
  // Mutantes de malha mesclada: alvo é BufferGeometry real sem groups, selecionado por
  // estrutura — nunca por nome/tag de piloto. Sem alvo real, NAOAPLICOU.
  if (MUT.startsWith('reboco-mesclado-')) {
    const m = reboco.find((mm) => mm.geometry.type === 'BufferGeometry' && !mm.geometry.groups?.length);
    if (!m) throw Error(`${MUT} NAOAPLICOU: nenhuma malha reboco mesclada real`);
    const geo = m.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index;
    if (!pos || !uv || !idx) throw Error(`${MUT} NAOAPLICOU: malha mesclada sem posição/UV/índice`);
    const fim = Math.min(idx.count, geo.drawRange.start + geo.drawRange.count);
    if (fim - geo.drawRange.start < 3) throw Error(`${MUT} NAOAPLICOU: drawRange vazio`);
    const a = idx.getX(fim - 3), b = idx.getX(fim - 2), c = idx.getX(fim - 1);
    if (MUT === 'reboco-mesclado-periodo') {
      if (!(Math.abs(uv.getX(b) - uv.getX(a)) > 0)) throw Error('reboco-mesclado-periodo NAOAPLICOU: último triângulo sem variação de U');
      for (const i of [a, b, c]) uv.setX(i, uv.getX(i) / 3);
      uv.needsUpdate = true;
    } else if (MUT === 'reboco-mesclado-nan') {
      if (!Number.isFinite(uv.getY(c))) throw Error('reboco-mesclado-nan NAOAPLICOU: último UV já não finito');
      uv.setY(c, NaN); uv.needsUpdate = true;
    } else if (MUT === 'reboco-mesclado-cisalha') {
      for (const i of [a, b, c]) uv.setX(i, uv.getX(i) + 0.25 * uv.getY(i));
      uv.needsUpdate = true;
    } else if (MUT === 'reboco-mesclado-indice') {
      idx.setX(fim - 1, pos.count + 7); idx.needsUpdate = true;
    } else if (MUT === 'reboco-mesclado-drawrange') {
      geo.drawRange.count = fim - geo.drawRange.start - 1;
    } else if (MUT === 'reboco-mesclado-posicao') {
      if (!Number.isFinite(pos.getZ(c))) throw Error('reboco-mesclado-posicao NAOAPLICOU: última posição já não finita');
      pos.setZ(c, NaN); pos.needsUpdate = true;
    }
  }
  if (MUT === 'reboco-sem-detalhe') game.scene.traverse((o) => {
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m?.name === 'campo-reboco') m.userData.detalhe = null;
  });
  if (MUT === 'solo-losango' && solo[0]) { solo[0].material.map.repeat.set(8, 7); solo[0].material.map.name = ''; }
  if (MUT === 'solo-sem-tint') for (const s of solo) s.material.color.setRGB(1, 1, 1);

  const medidas = [];
  for (const m of reboco) medidas.push(...medeParede(m, 'campo'));
  const piores = { tileU: 0, tileV: 0 };
  for (const md of medidas) {
    piores.tileU = Math.max(piores.tileU, Math.abs(md.tileU_m - 2.0));
    piores.tileV = Math.max(piores.tileV, Math.abs(md.tileV_m - 2.0));
  }
  const comDetalhe = reboco.filter((m) => (Array.isArray(m.material) ? m.material[0] : m.material).userData?.detalhe?.normalMap
    && (Array.isArray(m.material) ? m.material[0] : m.material).userData?.detalhe?.roughnessMap).length;
  out.mapa.campo = { paredesReboco: reboco.length, comParDetalhe: comDetalhe, medidas: medidas.length, piorDesvio: piores };
  if (!reboco.length) out.falhas.push('campo: nenhuma parede campo-reboco');
  else if (comDetalhe !== reboco.length) out.falhas.push(`campo: reboco sem par detalhe explícito (${comDetalhe}/${reboco.length}) — nome não basta como medidor`);
  if (!medidas.length) out.falhas.push('campo: nenhuma face de reboco mensurável');
  if (medidas.length && (piores.tileU > epsilonUV(2) || piores.tileV > epsilonUV(2)))
    out.falhas.push(`campo: reboco fora do período métrico 2,0 m (pior desvio U=${piores.tileU.toFixed(2)} V=${piores.tileV.toFixed(2)} m)`);

  if (!solo.length) out.falhas.push('campo: terreno 72x60 não encontrado');
  const TINT = 0xc0702d;
  for (const s of solo) {
    const map = s.material.map;
    if (map?.name !== 'packed-junkyard-earth')
      out.falhas.push(`campo: solo com mapa '${map?.name || '(sem nome)'}' — esperada a família do Ferro (packed-junkyard-earth)`);
    if (map?.repeat) {
      const ref = out.mapa.ferro.tileSoloReferencia;
      const tileX = 72 / map.repeat.x, tileZ = 60 / map.repeat.y;
      if (ref && (map.repeat.x !== Math.round(72 / ref.x) || map.repeat.y !== Math.round(60 / ref.z)))
        out.falhas.push(`campo: solo ${tileX.toFixed(3)}x${tileZ.toFixed(3)} m não usa a contagem inteira mais próxima da densidade do Ferro ${ref.x}x${ref.z} m`);
    }
    if (s.material.normalMap) out.falhas.push('campo: solo com normalMap — variação de cor virando relevo (proibido aqui)');
    // getHex volta ao sRGB: material.color guarda linear com ColorManagement ligado
    const hex = s.material.color.getHex(THREE.SRGBColorSpace);
    if (hex !== TINT)
      out.falhas.push(`campo: solo sem o tint mineral local (hex 0x${hex.toString(16)} ≠ 0xC0702D) — identidade vermelha do baseline perdida`);
  }
  out.custos.campo = contaCusto(game);
}

/* -------- capim × balcão: med em processo + low em subprocesso ---------------------- */
const vegLow = vegetacaoLow();
out.mapa.ferro.capimBalcao = { med: vegMed, low: vegLow };
for (const [nivel, v] of [['med', vegMed], ['low', vegLow]]) {
  if (v.erro) out.falhas.push(`ferro: capim×balcão ${nivel} — ${v.erro}`);
  else if (v.invasoes.length) {
    const tris = v.invasoes.reduce((s, i) => s + i.triangulos, 0);
    out.falhas.push(`ferro: capim atravessa o balcão em ${nivel} — ${v.invasoes.length} instância(s), ${tris} triângulo(s)`);
  }
}

out.veredito = out.falhas.length ? 'RED' : 'GREEN';
console.log(JSON.stringify(out, null, 1));
process.exit(out.falhas.length ? 1 : 0);
}
