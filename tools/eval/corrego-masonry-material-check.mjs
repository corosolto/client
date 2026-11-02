// Samplers finitos e matrizes efetivas PBR: docs/visual-consistency/CORREGO-MATERIAL.md.
// CLI: 0 GREEN, 1 RED semântico, 2 uso, 3 infra.
const argv = process.argv.slice(2);
const uso = (msg) => { console.error(`uso: ${msg}`); process.exit(2); };
const flags = {};
for (const a of argv) {
  if (a === '--fisica') { if (flags.fisica) uso(`--fisica duplicado`); flags.fisica = true; }
  else if (a.startsWith('--mutante=')) { if (flags.mutante !== undefined) uso('--mutante duplicado'); flags.mutante = a.slice(10); }
  else uso(`argumento desconhecido: ${a}`);
}
const MUT = flags.mutante ?? '';
if (flags.mutante !== undefined && !flags.mutante) uso('--mutante vazio');
// CONJUNTO EXATO: multiset de IDs de falha idêntico ao alvo — defeito
// independente junto do mutante reprova (infra 3), nominal RED também.
const MUTANTES = {
  'procedural-faixas': { 'muro-fontes-pbr': 8 },
  'normal-srgb': { 'muro-normal-srgb': 8 },
  'repeat-diverge': { 'muro-samplers': 1, 'muro-sampler-transform': 1 },
  'rotacao-no-probe': { 'muro-sampler-transform': 1 },
  'offset-nan': { 'muro-sampler-finito': 1, 'muro-sampler-transform': 1 },
  'offset-diverge': { 'muro-sampler-transform': 1 },
  'rough-srgb': { 'cru-rough-srgb': 1 },
  'raw-double-tint': { 'cru-tint': 1 },
};
if (MUT && !Object.hasOwn(MUTANTES, MUT)) uso(`mutante desconhecido: ${MUT} (válidos: ${Object.keys(MUTANTES).join(', ')})`);
const FISICA = !!flags.fisica;
if (MUT && FISICA) uso('--mutante e --fisica são exclusivos');
const contagem = (fs) => fs.reduce((m, { id }) => (m[id] = (m[id] || 0) + 1, m), {});
const mesmoConjunto = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

// preparação fora de catch é crash 1 — aqui falha de import/leitura/build é infra 3
let THREE, W, createHash, src, muros, cru;
try {
  const { readFileSync } = await import('node:fs');
  ({ createHash } = await import('node:crypto'));
  const harness = await import('./harness.mjs');
  const { bootGame, initTextures } = harness;
  THREE = harness.THREE;
  src = readFileSync(new URL('../../public/js/map_corrego.js', import.meta.url), 'utf8');
  const bootLog = console.log, bootInfo = console.info;
  let game;
  try {
    console.log = console.info = (...args) => console.error(...args);
    game = bootGame('corrego', { textures: initTextures(), seed: 8012 });
  } finally { console.log = bootLog; console.info = bootInfo; }
  W = game.world;
  W.root.updateMatrixWorld(true);
  const coletar = () => {
    const m = [], c = [];
    for (const o of W.root.children) o.traverse?.((mesh) => {
      if (!mesh.isMesh || !mesh.material) return;
      for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material])) {
        if (mat.map?.name === 'pbr_paintedplaster017_color') m.push(mat);
        else if (mat.map?.name === 'pbr_bricks051_color') c.push(mat);
      }
    });
    return { muros: [...new Set(m)], cru: [...new Set(c)] };
  };
  ({ muros, cru } = coletar());
} catch (e) {
  console.error(`infra: preparação (import/leitura/bootGame/coleta) falhou: ${e?.message ?? e}`);
  process.exit(3);
}

// -------- validador puro: MESMO contrato para nominal e mutante --------
const round = (v) => Math.round(v * 1000) / 1000;
// oito tintas autoradas do A/B R1, preservadas pelo Root — repeat correspondente
// da MESMA família (índice i), não dois conjuntos independentes (correção R3)
const CORES_ALVENARIA = [0xffffff, 0xe6d4b4, 0xc9a883, 0xb9c9b4, 0xd9c78e, 0xa9c2c6, 0xd8b3a2, 0xcdc4ae];
const paresAutorados = CORES_ALVENARIA.map((c, i) => ({
  cor: new THREE.Color(c), rep: `${round(1.6 + (i % 3) * 0.4)},${round(1.6 + (i % 2) * 0.5)}`,
}));
// Compara a transformação inteira, inclusive rotações que coincidem em um único UV.
const transformEfetivo = (t) => {
  if (t.matrixAutoUpdate) t.updateMatrix();
  return [...t.matrix.elements];
};
const perto = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-6;
const samplerFinito = (t) => Number.isFinite(t.repeat?.x) && Number.isFinite(t.repeat?.y)
  && Number.isFinite(t.offset?.x) && Number.isFinite(t.offset?.y)
  && Number.isFinite(t.center?.x) && Number.isFinite(t.center?.y)
  && Number.isFinite(t.rotation)
  && [...t.matrix.elements].every((v) => Number.isFinite(v));

export function validarMateriais({ muros, cru }, fontes) {
  const falhas = [];
  const add = (id, msg) => falhas.push({ id, msg });
  const roleTex = (mat) => ({ map: mat.map, normalMap: mat.normalMap, roughnessMap: mat.roughnessMap });
  const checkFamily = (mats, familia, pfx, rotulo, esperados) => {
    if (mats.length !== esperados) add(`${pfx}-contagem`, `${rotulo}: ${mats.length} materiais (esperados ${esperados})`);
    const shared = new Set();
    for (const m of mats) for (const t of Object.values(roleTex(m))) if (t) shared.add(t.source);
    if (mats.length && shared.size !== 3)
      add(`${pfx}-fontes-compartilhadas`, `${rotulo}: ${shared.size} fontes de textura (esperadas 3: ${familia} color/normal/rough compartilhadas)`);
    for (const m of mats) {
      const { map, normalMap, roughnessMap } = roleTex(m);
      if (!map || !normalMap || !roughnessMap) { add(`${pfx}-trio-ausente`, `${rotulo}: material sem o trio map/normalMap/roughnessMap PBR`); continue; }
      if (!map.name.startsWith(familia + '_color') || !normalMap.name.startsWith(familia + '_normal') || !roughnessMap.name.startsWith(familia + '_rough'))
        add(`${pfx}-fontes-pbr`, `${rotulo}: fontes PBR erradas (${map.name}/${normalMap.name}/${roughnessMap.name})`);
      if (map.colorSpace !== THREE.SRGBColorSpace) add(`${pfx}-albedo-srgb`, `${rotulo}: albedo fora de SRGB (${map.colorSpace})`);
      if (normalMap.colorSpace !== THREE.NoColorSpace) add(`${pfx}-normal-srgb`, `${rotulo}: normalMap em SRGB (normal tem que ser raw)`);
      if (roughnessMap.colorSpace !== THREE.NoColorSpace) add(`${pfx}-rough-srgb`, `${rotulo}: roughnessMap em SRGB (rough double-encoded)`);
      const r = (t) => `${round(t.repeat.x)},${round(t.repeat.y)}`;
      if (r(map) !== r(normalMap) || r(map) !== r(roughnessMap))
        add(`${pfx}-samplers`, `${rotulo}: samplers desalinhados — map (${r(map)}) ≠ normalMap (${r(normalMap)}) / roughnessMap (${r(roughnessMap)})`);
      const aMap = transformEfetivo(map), aNor = transformEfetivo(normalMap), aRou = transformEfetivo(roughnessMap);
      for (const [canal, t] of [['map', map], ['normalMap', normalMap], ['roughnessMap', roughnessMap]])
        if (!samplerFinito(t))
          add(`${pfx}-sampler-finito`, `${rotulo}: ${canal} com sampler não finito (repeat/offset/center/rotation/matrix)`);
      if (!(aMap.every((v, i) => perto(v, aNor[i]) && perto(v, aRou[i]))))
        add(`${pfx}-sampler-transform`, `${rotulo}: matrizes UV efetivas divergentes entre albedo, normal e roughness`);
      for (const t of [map, normalMap, roughnessMap])
        if (t.wrapS !== THREE.RepeatWrapping || t.wrapT !== THREE.RepeatWrapping)
          add(`${pfx}-wrap`, `${rotulo}: sampler sem RepeatWrapping`);
      // protótipo R1 NÃO alterava o normalScale (default 1); o .4 do R2 era erro de
      // transcrição apontado pelo crítico R3 — o reboco liso das fotos vinha daqui
      if (!Number.isFinite(m.normalScale.x) || !Number.isFinite(m.normalScale.y)
        || Math.abs(m.normalScale.x - 1) > 1e-6 || Math.abs(m.normalScale.y - 1) > 1e-6)
        add(`${pfx}-normalscale`, `${rotulo}: normalScale ${m.normalScale.x}/${m.normalScale.y} (contrato do protótipo R1: 1, finito nos dois eixos)`);
      if (map.userData?.texelReference?.width !== 256 || map.userData?.texelReference?.height !== 256)
        add(`${pfx}-texelref`, `${rotulo}: albedo sem texelReference 256x256 (UV em mundo depende dela antes da imagem)`);
      for (const t of [map, normalMap, roughnessMap])
        if (t.anisotropy !== 4) add(`${pfx}-anisotropy`, `${rotulo}: anisotropy ${t.anisotropy} (contrato do protótipo R1: 4)`);
    }
  };
  checkFamily(muros, 'pbr_paintedplaster017', 'muro', 'MURO (reboco pintado)', 8);
  checkFamily(cru, 'pbr_bricks051', 'cru', 'matTijoloCru (tijolo exposto)', 1);

  // tint↔repeat correspondentes: cada material casa com EXATAMENTE um par autorado
  if (muros.length === 8) {
    const usados = new Array(8).fill(false);
    for (const m of muros) {
      const i = paresAutorados.findIndex((p) => m.color.equals(p.cor));
      if (i < 0) { add('muro-tinta-fora', `MURO: tinta ${m.color.getHexString()} fora das oito autoradas`); continue; }
      if (usados[i]) add('muro-tinta-repetida', `MURO: tinta ${m.color.getHexString()} repetida (esperadas 8 distintas)`);
      usados[i] = true;
      const rep = `${round(m.map.repeat.x)},${round(m.map.repeat.y)}`;
      if (rep !== paresAutorados[i].rep)
        add('muro-tinta-repeat', `MURO: tinta ${m.color.getHexString()} com repeat ${rep}, mas o autorado dessa família é ${paresAutorados[i].rep}`);
    }
    if (usados.some((u) => !u)) add('muro-tintas-incompletas', 'MURO: nem todas as oito tintas autoradas estão no mundo');
  }
  if (cru.length === 1) {
    const BRANCO = new THREE.Color(0xffffff);
    if (!cru[0].color.equals(BRANCO))
      add('cru-tint', `matTijoloCru: tint ${cru[0].color.getHexString()} sobre tijolo já impresso na imagem`);
    const rep = `${round(cru[0].map.repeat.x)},${round(cru[0].map.repeat.y)}`;
    if (rep !== '2.4,2') add('cru-repeat', `matTijoloCru: repeat ${rep} diverge do autorado 2.4,2`);
  }

  // favela_wall rejeitada pelo crítico R1: nenhuma textura do mundo pode ser ela
  const nomes = new Set();
  for (const o of W.root.children) o.traverse?.((m) => {
    if (m.isMesh && m.material) for (const mat of (Array.isArray(m.material) ? m.material : [m.material]))
      for (const t of Object.values(roleTex(mat))) if (t?.name) nomes.add(t.name);
  });
  if (nomes.has('favela_wall')) add('favela-wall', 'favela_wall carregada no córrego (rejeitada pelo crítico R1)');

  // TEX.zinco é carregada só no browser (TextureLoader); no Node o produto real não
  // materializa a webp — a cláusula é a única leitura de fonte, pelo caminho browser-only
  if (!/TEX\.zinco\s*=\s*lam\(\{\s*map:\s*load\('\/img\/textures\/tex_zinco\.webp',\s*3,\s*3\)/.test(fontes))
    add('tex-zinco', 'TEX.zinco não sai de tex_zinco.webp 3,3 (telhados de zinco voltaram a cor chapada)');
  return falhas;
}

let nominal;
try { nominal = validarMateriais({ muros, cru }, src); }
catch (e) { console.error(`infra: validação nominal falhou: ${e?.message ?? e}`); process.exit(3); }
if (!MUT && !FISICA) {
  console.log(JSON.stringify({ mutante: null, veredito: nominal.length ? 'RED' : 'GREEN', falhas: nominal, muros: muros.length, cru: cru.length }));
  process.exit(nominal.length ? 1 : 0);
}
// -------- nominal primeiro, ANTES de qualquer mutação --------
if (MUT) {
  if (nominal.length) { console.error('nominal já RED — mutante não prova nada (infra)'); process.exit(3); }
  let aplicou = false;
  if (MUT === 'procedural-faixas') {
    for (const m of muros) { m.map.name = 'masonry_bands'; aplicou = true; }
  } else if (MUT === 'rotacao-no-probe') {
    const t = muros[0].normalMap; t.center.set(0.25, 0.5); t.rotation = Math.PI; t.offset.set(0.15, 0.3);
    t.updateMatrix(); aplicou = true;
  } else if (MUT === 'normal-srgb') {
    for (const m of muros) { m.normalMap.colorSpace = THREE.SRGBColorSpace; aplicou = true; }
  } else if (MUT === 'repeat-diverge') {
    muros[0].normalMap.repeat.x += 0.8; aplicou = true;
  } else if (MUT === 'offset-nan') {
    muros[0].map.offset.x = NaN; muros[0].map.updateMatrix(); aplicou = true;
  } else if (MUT === 'offset-diverge') {
    muros[0].normalMap.offset.x = 0.5; muros[0].normalMap.updateMatrix(); aplicou = true;
  } else if (MUT === 'rough-srgb') {
    for (const m of cru) { m.roughnessMap.colorSpace = THREE.SRGBColorSpace; aplicou = true; }
  } else if (MUT === 'raw-double-tint') {
    cru[0].color.set(0xc98a63); aplicou = true;
  }
  if (!aplicou) { console.error(`mutação ${MUT} não alterou o mundo — mutante fantasma`); process.exit(3); }
  // mesma instância coletada: mutantes são in-place, re-coletar perde o mapa trocado
  const pos = validarMateriais({ muros, cru }, src);
  if (!pos.length) { console.error(`mutante ${MUT} passou GREEN — régua cega`); process.exit(3); }
  const obtido = contagem(pos);
  if (!mesmoConjunto(obtido, MUTANTES[MUT])) {
    console.error(`mutante ${MUT} com conjunto de falhas ≠ alvo — esperado ${JSON.stringify(MUTANTES[MUT])}, obtido ${JSON.stringify(obtido)}`);
    process.exit(3);
  }
  console.log(JSON.stringify({ mutante: MUT, veredito: 'RED', esperado: MUTANTES[MUT], obtido, falhas: pos }));
  process.exit(1); // RED por mutação detectada é o resultado NORMAL do mutante
}

// -------- --fisica: digests separados, world-space, incl instancing --------
if (FISICA) {
  const h = () => createHash('sha256');
  const buf = (hash, f32) => hash.update(new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength));
  const dColliders = h(); dColliders.update(JSON.stringify(W.colliders));

  const dOccluders = h();
  const v = new THREE.Vector3();
  // InstancedMesh de occluder entra com instanceMatrix × matrixWorld, igual ao visual.
  const aplVert = (hash, p, mat4) => {
    const arr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(mat4); arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; }
    buf(hash, arr);
  };
  for (const o of W.occluders) {
    o.updateMatrixWorld?.();
    const p = o.geometry?.attributes?.position;
    if (!p) continue;
    if (o.isInstancedMesh) { const M = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); aplVert(dOccluders, p, M.clone().premultiply(o.matrixWorld)); } }
    else aplVert(dOccluders, p, o.matrixWorld);
  }

  // amostras 2D do operacional: uma altura por coluna — não é snapshot multipavimento
  const dGround = h();
  for (let x = -24; x <= 24; x += 1) for (let z = -40; z <= 40; z += 1)
    dGround.update(`${round(W.groundHeightAt(x, z))};`);

  const serializa = (hash, obj) => { try { hash.update(JSON.stringify(obj, (k, val) => typeof val === 'function' ? '[fn]' : val)); return true; } catch { return false; } };
  const dSpawns = h(); const spawnsOk = serializa(dSpawns, W.spawns);
  const dNav = h(); const navOk = serializa(dNav, { nodes: W.waypoints?.nodes, adj: W.waypoints?.adj });
  const dCovers = h(); const coversOk = serializa(dCovers, W.tacticalCover);

  const dVisual = h();
  let meshes = 0, instanced = 0;
  for (const o of W.root.children) o.traverse?.((m) => {
    if (!m.isMesh || !m.geometry?.attributes?.position) return;
    meshes++;
    m.updateMatrixWorld?.();
    const p = m.geometry.attributes.position;
    const apply = (mat4) => aplVert(dVisual, p, mat4);
    if (m.isInstancedMesh) { instanced++; const M = new THREE.Matrix4(); for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, M); apply(M.clone().premultiply(m.matrixWorld)); } }
    else apply(m.matrixWorld);
  });

  console.log(JSON.stringify({
    colliders: { n: W.colliders.length, digest: dColliders.digest('hex') },
    occludersWorld: { n: W.occluders.length, digest: dOccluders.digest('hex') },
    groundGrid2D: { digest: dGround.digest('hex') },
    spawns: { ok: spawnsOk, digest: dSpawns.digest('hex') },
    nav: { ok: navOk, digest: dNav.digest('hex') },
    covers: { ok: coversOk, digest: dCovers.digest('hex') },
    visualWorld: { meshes, instanced, digest: dVisual.digest('hex') },
  }));
  process.exit(0);
}
