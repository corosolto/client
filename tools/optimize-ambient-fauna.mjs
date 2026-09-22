/* Otimiza os três GLBs de fauna sem quantizar skinned meshes.
   Uso: node tools/optimize-ambient-fauna.mjs */
import { mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, simplify, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const outDir = 'public/models/ambient';
mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: 'references/glb/rat_animated.glb', out: `${outDir}/rat_animated.glb`, skinned: true },
  { src: 'references/glb/pigeon.glb', out: `${outDir}/pigeon_ground.glb`, skinned: true },
  // pigeon_flight.glb saiu na v2.1 (dono: pombo de asas abertas estáticas no céu não
  // existe mais) — o acervo Quaternius não tem pássaro riggado com voo animado
  // tint: sRGB #C68642/#E4C59A em linear — Shiba original é marrom escuro com marcações cinzas
  { src: 'references/glb/quaternius_shiba_inu.glb', out: `${outDir}/dog_caramelo.glb`, skinned: true, fixSkin: true,
    tint: { Main: [.564, .238, .055, 1], Main_Light: [.775, .557, .322, 1] } },
  // BUG-57 fauna do córrego: Mint já entrega low-poly (4,9-5k tris); só comprime textura
  { src: 'references/glb/jacare_corrego_mint.glb', out: `${outDir}/jacare_corrego.glb`, skinned: false, noDecimate: true },
  // brighten 1.45: textura Mint saiu lum~69 vs dog_caramelo ~86-165 — ficaria blob
  // escuro na margem do canal; clareia mantendo o marrom-avermelhado (padrão do tint do dog)
  { src: 'references/glb/capivara_corrego_mint.glb', out: `${outDir}/capivara_corrego.glb`, skinned: false, noDecimate: true, brighten: 1.45 },
  // v2.1 frente D (BUG-57): espécies novas Quaternius CC0 via Poly Pizza; keepClips
  // corta os clipes que o controlador nunca toca (a vaca traz 24 e pesa 1 MB crua)
  { src: 'references/glb/quaternius_cat.glb', out: `${outDir}/cat_telhado.glb`, skinned: true, fixSkin: true,
    keepClips: /(^|\|)(Idle|Walk|Run)$/ },
  { src: 'references/glb/quaternius_chicken_a.glb', out: `${outDir}/galinha_campo.glb`, skinned: true, fixSkin: true,
    keepClips: /(^|\|)(Idle|Walk)$/ },
  { src: 'references/glb/quaternius_cow.glb', out: `${outDir}/vaca_campo.glb`, skinned: true, fixSkin: true,
    keepClips: /^(Idle|Walk|Gallop)$/ },
  // vida 1 (plans/22): fauna 2 Mint, estáticos — a locomoção é procedural no
  // ambientlife.js (tatu anda, papagaio balança no poleiro). Mesma licença dos
  // anteriores: asset original gerado por prompt, assinante Mint Pro.
  // simplify: o Mint entrega ~5k tris por bicho — o dobro do padrão Quaternius
  // (2,4-2,9k) e o AM7 é por mapa. Barata 0,4 (14 cm na tela), tatu/papagaio 0,6.
  { src: 'references/glb/tatu_campo_mint.glb', out: `${outDir}/tatu_campo.glb`, skinned: false, noDecimate: true, simplify: .6 },
  { src: 'references/glb/papagaio_poleiro_mint.glb', out: `${outDir}/papagaio_poleiro.glb`, skinned: false, noDecimate: true, simplify: .6 },
  { src: 'references/glb/barata_urbana_mint.glb', out: `${outDir}/barata_urbana.glb`, skinned: false, noDecimate: true, simplify: .4,
    // o Mint entregou vermelho glossy de brinquedo: sob o sol laranja do córrego
    // o albedo vermelho satura ainda mais (medido na captura). Dessatura pro
    // marrom de barata americana sem perder o lê-no-chão
    brighten: .85, saturate: .5 },
  /* vida 2 (14/09): 8 bichos que JÁ ESTAVAM PAGOS na conta Mint e nunca tinham sido
     baixados — o acervo tinha 418 assets e 33 no jogo. Todos estáticos pela mesma razão
     dos de cima, agora com a causa confirmada por medição: `list_model_animation_options`
     devolve catálogo Meshy de 673 clipes e TODOS são `humanoid animation`. Quadrúpede e
     ave não têm animação no pipeline — por isso a seleção abaixo é só de bicho cuja POSE
     PARADA é natural (ave pousada, bode de cabresto, cavalo pastando, lagarto em muro).
     simplify 0,6 é o mesmo do tatu/papagaio e o que a casa já usa na frota (medido:
     ratio 0,6 reproduz byte a byte o arquivo servido). */
  { src: 'references/glb/galinha_hen_mint.glb', out: `${outDir}/galinha_hen.glb`, skinned: false, noDecimate: true, simplify: .6 },
  { src: 'references/glb/pintinho_mint.glb', out: `${outDir}/pintinho.glb`, skinned: false, noDecimate: true, simplify: .58 },
  { src: 'references/glb/galinha_angola_mint.glb', out: `${outDir}/galinha_angola.glb`, skinned: false, noDecimate: true, simplify: .6 },
  /* o "Pato do lago" é o asset que a §2 do fauna.md REPROVOU por ter a água do lago assada
     dentro da malha (31,7% da área em laje horizontal). O `dropFlatSlab` tira a laje e o
     que sobra é o pato nadando — que é a pose certa para espelho d'água. 4.664 -> 4.462
     crus -> 2.677 servidos, acima do piso POLY1 de 2.500. */
  { src: 'references/glb/pato_lago_mint.glb', out: `${outDir}/pato_lago.glb`, skinned: false, noDecimate: true, simplify: .6, dropFlatSlab: true },
  { src: 'references/glb/cavalo_sitio_mint.glb', out: `${outDir}/cavalo_sitio.glb`, skinned: false, noDecimate: true, simplify: .6 },
  { src: 'references/glb/cabra_caatinga_mint.glb', out: `${outDir}/cabra_caatinga.glb`, skinned: false, noDecimate: true, simplify: .6 },
  { src: 'references/glb/calango_mint.glb', out: `${outDir}/calango.glb`, skinned: false, noDecimate: true, simplify: .55 },
  { src: 'references/glb/carcara_mint.glb', out: `${outDir}/carcara.glb`, skinned: false, noDecimate: true, simplify: .6 },
];

const filtroArgs = process.argv.slice(2);
for (const job of jobs) {
  // `node tools/optimize-ambient-fauna.mjs jacare` roda só jobs cujo src casa algum termo
  if (filtroArgs.length && !filtroArgs.some((t) => job.src.includes(t))) continue;
  let input = job.src;
  if (!job.skinned && !job.noDecimate) {
    input = '/tmp/csbr-pigeon-flight-decimated.glb';
    const blender = process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
    const run = spawnSync(blender, ['--background', '--python', 'tools/blender-decimate-static.py', '--', job.src, input, '0.015'],
      { stdio: 'inherit' });
    if (run.status !== 0) throw new Error(`Blender falhou ao decimar ${job.src}`);
  }
  const doc = await io.read(input);
  if (job.tint) {
    for (const material of doc.getRoot().listMaterials()) {
      const color = job.tint[material.getName()];
      if (color) material.setBaseColorFactor(color);
    }
  }
  // skin.skeleton do Quaternius aponta para nó que não é raiz comum (erro Khronos); three.js ignora o hint
  if (job.fixSkin) for (const skin of doc.getRoot().listSkins()) skin.setSkeleton(null);
  if (job.keepClips) for (const clip of doc.getRoot().listAnimations()) {
    if (!job.keepClips.test(clip.getName())) clip.dispose();
  }
  if (job.brighten || job.saturate) {
    /* só a textura de COR (baseColor das materiais) — modulate em Normal/ORM
       destrói o mapa (o brighten da capivara não tinha ORM/Normal no GLB) */
    const deCor = new Set(doc.getRoot().listMaterials().map((m) => m.getBaseColorTexture()).filter(Boolean));
    for (const texture of deCor) {
      const boosted = await sharp(Buffer.from(texture.getImage()))
        .modulate({ brightness: job.brighten ?? 1, saturation: job.saturate ?? 1 }).png().toBuffer();
      texture.setImage(boosted, 'image/png');
      texture.setMimeType('image/png');
    }
  }
  /* `dropFlatSlab`: o Mint assa a ÁGUA dentro do modelo de bicho aquático — no pato são
     3 componentes conexos 100% horizontais (94+68+40 tri crus) que somam 31,7% da área da
     malha e viram um disco branco de plástico em volta da ave (medido em
     docs/maps/mint/fauna.md §2 e reconferido aqui). Só saem componentes CONEXOS cuja área
     é ≥95% de normal ±Y e cuja espessura em Y é <25% da altura do modelo: asa (26% plana)
     e corpo (20%) não se enquadram. Roda ANTES do simplify para o orçamento de triângulo
     ir todo para o pato. */
  if (job.dropFlatSlab) for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    if (!pos || !idx) continue;
    const nv = pos.getCount(), nt = idx.getCount() / 3;
    const chave = new Map(), rep = new Int32Array(nv), pai = new Int32Array(nv);
    const p = [0, 0, 0];
    for (let i = 0; i < nv; i++) {
      pos.getElement(i, p);
      const k = `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)},${Math.round(p[2] * 1e4)}`;
      if (!chave.has(k)) chave.set(k, i);
      rep[i] = chave.get(k); pai[i] = i;
    }
    const acha = (a) => { while (pai[a] !== a) { pai[a] = pai[pai[a]]; a = pai[a]; } return a; };
    const une = (a, b) => { a = acha(a); b = acha(b); if (a !== b) pai[b] = a; };
    for (let i = 0; i < nt; i++) { une(rep[idx.getScalar(i * 3)], rep[idx.getScalar(i * 3 + 1)]); une(rep[idx.getScalar(i * 3)], rep[idx.getScalar(i * 3 + 2)]); }
    const grupo = new Map();
    let minY = Infinity, maxY = -Infinity;
    const tri = [];
    for (let i = 0; i < nt; i++) {
      const ids = [idx.getScalar(i * 3), idx.getScalar(i * 3 + 1), idx.getScalar(i * 3 + 2)];
      const P = ids.map((id) => pos.getElement(id, [0, 0, 0]));
      for (const q of P) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }
      const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]];
      const e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const area = Math.hypot(cr[0], cr[1], cr[2]) / 2;
      const r = acha(rep[ids[0]]);
      let g = grupo.get(r);
      if (!g) { g = { area: 0, plana: 0, y0: Infinity, y1: -Infinity }; grupo.set(r, g); }
      g.area += area;
      if (area > 1e-12 && Math.abs(cr[1]) / (2 * area) > .9) g.plana += area;
      for (const q of P) { if (q[1] < g.y0) g.y0 = q[1]; if (q[1] > g.y1) g.y1 = q[1]; }
      tri.push({ ids, g: r });
    }
    const alturaModelo = maxY - minY || 1;
    const fora = new Set([...grupo.entries()]
      .filter(([, g]) => g.plana / g.area >= .95 && (g.y1 - g.y0) < alturaModelo * .25)
      .map(([r]) => r));
    if (!fora.size) continue;
    const mantidos = tri.filter((t) => !fora.has(t.g));
    /* recompacta os vértices: índice novo só com quem sobrou (vértice órfão não é
       removido nem por `prune` nem por `dedup` — vira KB morto no deploy). */
    const remap = new Map();
    const novoIdx = [];
    for (const t of mantidos) for (const id of t.ids) {
      if (!remap.has(id)) remap.set(id, remap.size);
      novoIdx.push(remap.get(id));
    }
    const ordem = [...remap.keys()];
    for (const nome of prim.listSemantics()) {
      const attr = prim.getAttribute(nome);
      const n = attr.getElementSize();
      const dados = new Float32Array(ordem.length * n);
      const buf = new Array(n);
      ordem.forEach((id, i) => { attr.getElement(id, buf); dados.set(buf, i * n); });
      prim.setAttribute(nome, attr.clone().setArray(dados));
    }
    prim.setIndices(idx.clone().setArray(new Uint32Array(novoIdx)));
    console.log(`  dropFlatSlab: ${fora.size} componente(s) horizontal(is) fora — ${nt} -> ${mantidos.length} tri`);
  }
  if (job.simplify) await doc.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio: job.simplify, error: 0.01 }),
  );
  if (job.skinned) {
    await doc.transform(
      resample(),
      dedup(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
      prune(),
    );
  } else {
    await doc.transform(
      dedup(),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [256, 256] }),
      prune(),
    );
  }
  await io.write(job.out, doc);
  const root = doc.getRoot();
  const triangles = root.listMeshes().flatMap((mesh) => mesh.listPrimitives()).reduce((sum, primitive) => {
    const accessor = primitive.getIndices() || primitive.getAttribute('POSITION');
    return sum + (accessor ? accessor.getCount() / 3 : 0);
  }, 0);
  console.log(`${job.out}: ${Math.round(statSync(job.out).size / 1024)} KiB · ${Math.round(triangles)} tri · ${root.listAnimations().map((clip) => clip.getName()).join(', ') || 'estático'}`);
}
