/* Props realistas da Invasão dos Javaporcos: Sketchfab (biblioteca local do dono) e Poly Haven
   (CC0, baixado para references/polyhaven). Recorta a variante, decima com Meshopt, põe o pivô
   no chão, escala em metros, WebP e prune. Procedência e licença: public/models/props/FONTE.md.

   Uso: node tools/javaporcos-realista-assets.mjs [filtro...] [--registra]
   --registra grava/atualiza as entradas `frente: javaporcos-realista` no mint-assets.json. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { center, clearNodeTransform, compactPrimitive, dedup, flatten, join, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;

const LIB = '/Volumes/Zenith/Assets/game/corosolto/glb';
const PH = 'references/polyhaven';
const OUT = 'public/models/props';
const CC0 = { license: 'CC0 1.0', licenseUrl: 'https://polyhaven.com/license' };

/* Teto por classe (pedido do dono 30/10: carro <= ~60 k tris e 1,5 MB; prop pequeno <= 10 k).
   Poste/árvore ficam na classe "estrutura". A régua é tools/eval/props-acervo-check.mjs (PAC5). */
export const TETO = {
  carro: { tris: 60000, bytes: 1_500_000 },
  pequeno: { tris: 10000, bytes: 600_000 },
  vegetacao: { tris: 10000, bytes: 600_000 },
  estrutura: { tris: 20000, bytes: 1_000_000 },
};

const sk = (file, autor, licenca, url, titulo) => ({ src: `${LIB}/${file}`, kind: 'sketchfab-model', autor, licenca, url, titulo });
const ph = (asset, autor) => ({ src: `${PH}/${asset}/${asset}.gltf`, ph: asset, kind: 'polyhaven-model', autor, licenca: CC0.license, url: `https://polyhaven.com/a/${asset}`, titulo: asset });

export const JOBS = [
  // --- carros (rua) ---
  { id: 'chevette_sl76', classe: 'carro', comp: 4.12, tex: 512, alvo: 38000, uso: 'rua',
    ...sk('chevrolet_chevette_sl_76.glb', 'Laerte.Hubaleque', 'CC-BY-4.0', 'https://sketchfab.com/3d-models/chevrolet-chevette-sl-76-2322139894c545b6838000f08d853662', 'Chevrolet Chevette sl 76') },
  { id: 'carro_batido_scan_03', classe: 'carro', permissivo: true, comp: 4.2, tex: 1024, alvo: 40000, uso: 'rua/beco',
    ...sk('destroyed_car_03_raw_scan.glb', 'Renafox', 'CC-BY-4.0', 'https://sketchfab.com/3d-models/destroyed-car-03-raw-scan-483fe7f26336463fba66638ca4200c5a', 'Destroyed Car 03 (Raw Scan)') },
  { id: 'carro_batido_scan_07', classe: 'carro', permissivo: true, comp: 4.0, tex: 1024, alvo: 40000, uso: 'rua/beco',
    ...sk('destroyed_car_07_raw_scan.glb', 'Renafox', 'CC-BY-4.0', 'https://sketchfab.com/3d-models/destroyed-car-07-raw-scan-916b51c7e5644eb2a6c9b3797ebb08cf', 'Destroyed Car 07 (Raw Scan)') },
  { id: 'perua_pichada_scan', classe: 'carro', permissivo: true, teto: 1.75, comp: 4.5, tex: 1024, alvo: 40000, uso: 'rua/pasto',
    ...sk('graffitid_toyota_wagon_raw_scan.glb', 'Renafox', 'CC-BY-4.0', 'https://sketchfab.com/3d-models/graffitid-toyota-wagon-raw-scan-cb1a538a5e84460e8dfeb4cfff109653', "Graffiti'd Toyota Wagon (Raw Scan)") },
  // --- rua / beco: lixo, sujeira, mobiliário ---
  { id: 'saco_lixo', classe: 'pequeno', tex: 512, uso: 'rua/beco', ...ph('trashbag', 'Benny Weimer') },
  { id: 'caixa_papelao', classe: 'pequeno', tex: 512, alvo: 5000, uso: 'rua/beco', ...ph('cardboard_box_01', 'Poly Haven') },
  { id: 'engradado_plastico', classe: 'pequeno', tex: 512, uso: 'praça/rua', ...ph('plastic_crate_02', 'Poly Haven') },
  { id: 'caixote_madeira', classe: 'pequeno', tex: 512, uso: 'praça (feira)', ...ph('wooden_crate_01', 'Poly Haven') },
  { id: 'pneu_velho', classe: 'pequeno', tex: 512, uso: 'praça/rua', ...ph('old_tyre', 'Poly Haven') },
  { id: 'cadeira_plastico', classe: 'pequeno', tex: 512, uso: 'rua (bar)', ...ph('plastic_monobloc_chair_01', 'Poly Haven') },
  { id: 'saco_cimento', classe: 'pequeno', tex: 512, uso: 'beco/rua', ...ph('cement_bag', 'Poly Haven') },
  { id: 'tambor_metal', classe: 'pequeno', tex: 512, uso: 'beco/pasto', ...ph('barrel_03', 'Poly Haven') },
  { id: 'tampa_bueiro', classe: 'pequeno', tex: 512, alvo: 3000, uso: 'rua', ...ph('water_manhole_cover', 'Poly Haven') },
  { id: 'lixeira_metal', classe: 'pequeno', tex: 512, uso: 'beco', pick: ['metal_trash_can_rust', 'metal_trash_can_rust_handle_left', 'metal_trash_can_rust_handle_right', 'metal_trash_can_rust_lid'], ...ph('metal_trash_can', 'Poly Haven') },
  { id: 'lata_enferrujada', classe: 'pequeno', tex: 256, alvo: 1500, uso: 'beco/rua', ...ph('can_rusted', 'Poly Haven') },
  { id: 'caixa_energia', classe: 'pequeno', tex: 512, uso: 'beco', ...ph('utility_box_01', 'Poly Haven') },
  { id: 'porta_aco', classe: 'pequeno', tex: 1024, uso: 'rua (comércio fechado)', pick: ['rollershutter_door'], ...ph('rollershutter_door', 'Poly Haven') },
  { id: 'porta_aco_pichada', classe: 'pequeno', tex: 1024, uso: 'rua/beco', pick: ['rollershutter_door_graffiti'], ...ph('rollershutter_door', 'Poly Haven') },
  { id: 'barreira_concreto', classe: 'pequeno', tex: 512, alvo: 8000, uso: 'praça (barricada)', ...ph('concrete_road_barrier', 'Poly Haven') },
  { id: 'luminaria_parede', classe: 'pequeno', tex: 512, alvo: 8000, uso: 'praça (fachada da igreja)', ...ph('street_lamp_02', 'Poly Haven') },
  // --- postes (rua/praça) ---
  { id: 'poste_transformador', classe: 'estrutura', tex: 512, alvo: 12000, uso: 'rua/praça', prefixo: 'preset_01_', ...ph('modular_electricity_poles', 'Poly Haven') },
  { id: 'poste_fiacao', classe: 'estrutura', tex: 512, alvo: 12000, uso: 'rua/beco', prefixo: 'preset_02_', ...ph('modular_electricity_poles', 'Poly Haven') },
  { id: 'poste_luz_praca', classe: 'estrutura', tex: 512, alvo: 12000, uso: 'praça', ...ph('street_lamp_01', 'Poly Haven') },
  // --- mato, mata e pasto ---
  { id: 'capim_touceira_a', classe: 'vegetacao', tex: 512, uso: 'pasto/mata', pick: ['grass_medium_02_d'], ...ph('grass_medium_02', 'Poly Haven') },
  { id: 'capim_touceira_b', classe: 'vegetacao', tex: 512, uso: 'pasto/calçada', pick: ['grass_medium_02_b'], ...ph('grass_medium_02', 'Poly Haven') },
  { id: 'mato_erva', classe: 'vegetacao', tex: 512, uso: 'calçada/beco', pick: ['weed_plant_02_a_LOD0'], ...ph('weed_plant_02', 'Poly Haven') },
  { id: 'arbusto_mata_a', classe: 'vegetacao', tex: 512, uso: 'mata/pasto', pick: ['shrub_02_c'], ...ph('shrub_02', 'Poly Haven') },
  { id: 'arbusto_mata_b', classe: 'vegetacao', tex: 512, uso: 'mata/praça', pick: ['shrub_02_a'], ...ph('shrub_02', 'Poly Haven') },
  { id: 'samambaia_mata', classe: 'vegetacao', tex: 512, uso: 'mata', pick: ['fern_02_b'], ...ph('fern_02', 'Poly Haven') },
  { id: 'calathea_mata', classe: 'vegetacao', tex: 512, uso: 'mata', pick: ['calathea_orbifolia_01_a'], ...ph('calathea_orbifolia_01', 'Poly Haven') },
  { id: 'galhos_secos', classe: 'vegetacao', tex: 512, uso: 'mata/pasto', pick: ['dry_branches_medium_01_a'], ...ph('dry_branches_medium_01', 'Poly Haven') },
  { id: 'toco_arvore', classe: 'vegetacao', tex: 512, alvo: 8000, uso: 'pasto/mata', ...ph('tree_stump_01', 'Poly Haven') },
  { id: 'tronco_caido', classe: 'vegetacao', tex: 512, alvo: 8000, uso: 'mata/pasto', ...ph('dead_tree_trunk', 'Poly Haven') },
  { id: 'pedra_mata', classe: 'pequeno', tex: 512, alvo: 4000, uso: 'pasto/mata', ...ph('rock_07', 'Poly Haven') },
];

const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives()
  .reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const ph_get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': 'csbrasil-assets' } }); if (!r.ok) throw new Error(`${u} ${r.status}`); return r; };

async function baixaPolyHaven(asset) {
  const alvo = `${PH}/${asset}/${asset}.gltf`;
  if (existsSync(alvo)) return;
  const g = (await (await ph_get(`https://api.polyhaven.com/files/${asset}`)).json()).gltf['1k'].gltf;
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, Buffer.from(await (await ph_get(g.url)).arrayBuffer()));
  for (const [p, v] of Object.entries(g.include || {})) {
    mkdirSync(dirname(`${PH}/${asset}/${p}`), { recursive: true });
    writeFileSync(`${PH}/${asset}/${p}`, Buffer.from(await (await ph_get(v.url)).arrayBuffer()));
  }
}

// Scan de fotogrametria: o atlas de UV corta a malha em ilhas e o simplify comum para na costura.
function simplificaPermissivo(doc, ratio) {
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const idx = p.getIndices(), pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0');
    if (!idx || !pos) continue;
    const alvo = Math.max(3, Math.floor((idx.getCount() * ratio) / 3) * 3);
    const posArr = new Float32Array(pos.getArray());
    const [novo] = uv
      ? MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(idx.getArray()), posArr, 3, new Float32Array(uv.getArray()), 2, [0.5, 0.5], null, alvo, 1, ['Permissive'])
      : MeshoptSimplifier.simplify(new Uint32Array(idx.getArray()), posArr, 3, alvo, 1, ['Permissive']);
    idx.setArray(novo);
    compactPrimitive(p);
  }
}

// Fragmento solto do scan flutuando acima do teto do carro inflava a altura e a escala do placeProp.
function cortaAcima(doc, y) {
  const v = [0, 0, 0];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), idx = p.getIndices(), a = idx.getArray(), fica = [];
    for (let i = 0; i < a.length; i += 3) if ([a[i], a[i + 1], a[i + 2]].some((j) => pos.getElement(j, v)[1] <= y)) fica.push(a[i], a[i + 1], a[i + 2]);
    idx.setArray(new Uint32Array(fica));
    compactPrimitive(p);
  }
}

async function processa(job) {
  if (job.ph) await baixaPolyHaven(job.ph);
  const doc = await io.read(job.src);
  const root = doc.getRoot();
  const cena = root.getDefaultScene() || root.listScenes()[0];
  for (const a of root.listAnimations()) a.dispose();
  for (const s of root.listSkins()) s.dispose();
  if (job.pick || job.prefixo) {
    const fica = (n) => (job.pick ? job.pick.includes(n.getName()) : n.getName().startsWith(job.prefixo));
    for (const n of cena.listChildren()) if (!fica(n)) { n.traverse((c) => c !== n && c.dispose()); n.dispose(); }
    await doc.transform(prune());
  }
  // TANGENT é ~30 % do GLB e o mapprops.normalizeGeo descarta no merge; three deriva no shader.
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) p.setAttribute('TANGENT', null);
  // Sketchfab entrega em escala arbitrária: um nó raiz recebe escala (carro pelo comprimento) e giro (comprimento em Z).
  const pai = doc.createNode('raiz');
  for (const n of cena.listChildren()) { cena.removeChild(n); pai.addChild(n); }
  cena.addChild(pai);
  let b = getBounds(cena);
  let [dx, , dz] = [0, 1, 2].map((k) => b.max[k] - b.min[k]);
  if (job.classe === 'carro' && dx > dz) { pai.setRotation([0, Math.SQRT1_2, 0, Math.SQRT1_2]); [dx, dz] = [dz, dx]; }
  if (job.comp) pai.setScale([job.comp / dz, job.comp / dz, job.comp / dz]);
  await doc.transform(center({ pivot: 'below' }), flatten());
  // Scan vem girado em diagonal no nó: sem assar o giro, a caixa do placeProp infla 30 %.
  for (const n of root.listNodes()) if (n.getMesh()) clearNodeTransform(n);
  if (job.teto) cortaAcima(doc, job.teto);
  const bruto = tris(doc);
  const passos = [dedup(), weld()];
  if (job.alvo && bruto > job.alvo && job.permissivo) { await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld()); simplificaPermissivo(doc, job.alvo / bruto); }
  else if (job.alvo && bruto > job.alvo) passos.push(simplify({ simplifier: MeshoptSimplifier, ratio: job.alvo / bruto, error: job.erro ?? 0.02 }));
  passos.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [job.tex, job.tex] }), prune());
  await doc.transform(...passos);
  const out = `${OUT}/${job.id}.glb`;
  await io.write(out, doc);
  b = getBounds(doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]);
  const dim = [0, 1, 2].map((k) => +(b.max[k] - b.min[k]).toFixed(2));
  return { id: job.id, out, bruto, tris: tris(doc), bytes: statSync(out).size, dim, sha256: sha(out) };
}

function registra(job, r) {
  const reg = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
  const autorUrl = job.kind === 'sketchfab-model' ? `Sketchfab: ${job.autor}` : `Poly Haven: ${job.autor}`;
  reg.assets[`jp-${job.id.replaceAll('_', '-')}`] = {
    artifactType: 'model/gltf-binary',
    files: [r.out],
    source: {
      kind: job.kind, url: job.url, displayName: job.titulo, author: autorUrl,
      license: job.licenca, licenseUrl: job.kind === 'polyhaven-model' ? CC0.licenseUrl : licencaUrl(job.licenca),
      frente: 'javaporcos-realista', classe: job.classe,
      notes: `Invasão dos Javaporcos (${job.uso}). ${r.tris} tris (bruto ${r.bruto}), ${r.dim.join(' x ')} m, pivô no chão.`,
    },
    processing: { tools: ['tools/javaporcos-realista-assets.mjs'], finalSha256: r.sha256 },
  };
  writeFileSync('mint-assets.json', `${JSON.stringify(reg, null, 2)}\n`);
}
const licencaUrl = (l) => `https://creativecommons.org/licenses/${l.replace(/^CC-/, '').replace(/-4\.0$/, '').toLowerCase()}/4.0/`;

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const args = process.argv.slice(2);
  const filtro = args.filter((a) => !a.startsWith('--'));
  for (const job of JOBS) {
    if (filtro.length && !filtro.includes(job.id)) continue;
    const r = await processa(job);
    const teto = TETO[job.classe];
    const ok = r.tris <= teto.tris && r.bytes <= teto.bytes ? 'ok' : 'ACIMA DO TETO';
    console.log(`${r.id}: ${r.tris} tris (bruto ${r.bruto}), ${(r.bytes / 1024) | 0} KB, ${r.dim.join('x')} m — ${ok}`);
    if (args.includes('--registra')) registra(job, r);
  }
}
