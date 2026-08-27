/* ============================================================================
   escala-favela-glb-check.mjs — A CASA DE MOLDE TEM TAMANHO DE CASA.
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   Dono, 26/08/2026, duas frases: "os mapas de favela so o lajes tem cordao de roupas
   do model, os outros nao e tudo generico low poly" e "tem que ver a escala dos
   predios sempre". A segunda é a que cria régua: prop de casa entra no mapa por um
   `targetH` escrito à mão, e `targetH` errado não reprova nada — a `eval:escala-favela`
   (BUG-55) mede os barracos PROCEDURAIS (malha de vão, colisor de puxadinho, palafita)
   e não tem como ver um GLB, porque em node o GLB nem carrega.

   E tem o buraco específico desta frente, que já cavou uma régua morta antes: o molde
   do Mint chega normalizado num CUBO de ~1 m (medido: casa_favela_azul 0,955 × 0,998 ×
   0,764 m). Com escala uniforme, 4,4 m de fachada obrigam 4,6 m de pé-direito — casa de
   gigante. A tentativa anterior desta frente "resolveu" isso declarando `fachada: 4.6`
   num manifesto e conferindo o manifesto contra ele mesmo: número que não vem de
   geometria nenhuma. Régua que lê a própria declaração não mede, ecoa.

   ── COMO ELA MEDE (mundo, não declaração) ──────────────────────────────────
   1. lê os BOUNDS REAIS do binário (accessor POSITION de meshes[].primitives[] — o
      mesmo critério do corrego-contract-check e do shader-budget);
   2. planta esses bounds como template via `registerPropTemplate` (mapprops.js) —
      o GLTFLoader TRAVA em node no caminho de textura (EXT_texture_webp →
      ImageBitmap/DOM), limitação já registrada e coberta pelo eval:gltf-validator;
   3. sobe o mapa DE VERDADE (`bootGame`) e mede a TRANSFORM RESULTANTE de cada casa
      colocada, no referencial do próprio objeto (o giro é desfeito antes de medir,
      senão a AABB de uma casa girada 8° mede fachada que não existe).

   ── AS CLÁUSULAS ───────────────────────────────────────────────────────────
   ESCGLB1 · o mapa coloca >= 16 casas de molde, com os DOIS moldes e nenhum abaixo
             de 30% — fileira de clone é "tudo genérico low poly" com outro nome;
   ESCGLB2 · pé-direito POR PAVIMENTO (altura medida ÷ pavimentos) em 2,60–3,20 m;
   ESCGLB3 · fachada (eixo X do molde, que é o que o placer escala para `larg`)
             >= 4,00 m e profundidade >= 3,00 m em TODA casa;
   ESCGLB4 · variação real de pavimento: >= 4 casas de 1 e >= 4 de 2 pavimentos,
             e >= 6 giros distintos (senão é a mesma casa cinco vezes);
   ESCGLB5 · 3–5 varais de molde por mapa, cordão >= 1,85 m do apoio (o olho do
             jogador está a 1,62 m — varal na testa não é varal) e vão >= 2,0 m.

   ── AS MUTAÇÕES QUE PROVAM (mordem o MUNDO medido, depois do boot) ─────────
     --mutar=ana ............ escala 0,6 em toda casa colocada  → ESCGLB2 e ESCGLB3
     --mutar=molde-unico .... troca todo molde pelo primeiro    → ESCGLB1
     --mutar=laje-unica ..... todo mundo vira 1 pavimento       → ESCGLB4
     --mutar=varal-baixo .... desce o varal 0,6 m               → ESCGLB5
   Mutante desconhecido sai com código 2 (não é falha do mundo, é erro de uso).

   REPRODUZ: node tools/eval/escala-favela-glb-check.mjs [--mutar=ana]
   ESCOPO: `corrego`. Escadão e campomorro são OUTRAS frentes (worktrees próprias) —
   mapa novo entra aqui acrescentando o id em MAPAS, e a régua cobra sozinha.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { THREE, initTextures, bootGame } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const MAPAS = ['corrego'];
const MOLDES = ['casa_favela_azul', 'casa_favela_tijolo'];
const VARAL = 'varal_roupas';

const PE_MIN = 2.60, PE_MAX = 3.20;     // pé-direito por pavimento (pedido do dono, 26/08)
const FACHADA_MIN = 4.00;               // fachada de casa, não de guarita
const PROF_MIN = 3.00;                  // e tem fundo: parede de 1 m é cenário, não casa
const CORDAO_MIN = 1.85;                // olho do jogador = 1,62 m (game.js)
const VAO_MIN = 2.00;                   // vão útil de varal
const CASAS_MIN = 16, VARAL_MIN = 3, VARAL_MAX = 5;

const MUTANTES = new Set(['ana', 'molde-unico', 'laje-unica', 'varal-baixo']);
const mutar = (process.argv.find((a) => a.startsWith('--mutar=') || a.startsWith('--mutante=')) || '').split('=')[1] || null;
if (mutar && !MUTANTES.has(mutar)) {
  console.error(`mutante desconhecido: ${mutar} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

/* Bounds do binário: mesmo leitor do corrego-contract-check (glTF 2.0, chunk JSON). */
function glbBounds(file) {
  const d = readFileSync(file);
  if (d.readUInt32LE(0) !== 0x46546c67 || d.readUInt32LE(4) !== 2) throw new Error(`${file}: GLB 2.0 inválido`);
  let offset = 12, json = null;
  while (offset + 8 <= d.length) {
    const length = d.readUInt32LE(offset), type = d.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(d.subarray(offset + 8, offset + 8 + length).toString('utf8'));
    offset += 8 + length;
  }
  if (!json) throw new Error(`${file}: chunk JSON ausente`);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) for (const prim of mesh.primitives || []) {
    const acc = json.accessors[prim.attributes?.POSITION];
    if (!acc?.min || !acc?.max) throw new Error(`${file}: accessor POSITION sem min/max`);
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], acc.min[k]); mx[k] = Math.max(mx[k], acc.max[k]); }
  }
  if (!isFinite(mn[0])) throw new Error(`${file}: nenhuma primitiva com POSITION`);
  return { mn, mx };
}

/* Stub com os BOUNDS DO BINÁRIO no lugar do template do GLTFLoader. O que fica coberto:
   registro, clone, escala por eixo, posição, giro — todo o código do JOGO. O que NÃO
   fica: o parse do binário (é do eval:gltf-validator) e a leitura visual (browser). */
for (const id of [...MOLDES, VARAL]) {
  const b = glbBounds(`public/models/props/${id}.glb`);
  const size = [0, 1, 2].map((k) => b.mx[k] - b.mn[k]);
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial());
  mesh.position.set((b.mn[0] + b.mx[0]) / 2, (b.mn[1] + b.mx[1]) / 2, (b.mn[2] + b.mx[2]) / 2);
  scene.add(mesh);
  registerPropTemplate(id, scene);
  console.log(`molde ${id}: ${size.map((v) => v.toFixed(3)).join(' × ')} m no binário`);
}

const T = await initTextures();
const cx = (x) => x.toFixed(2).replace('.', ',');
const _box = new THREE.Box3(), _v = new THREE.Vector3();

/* Medida no referencial do OBJETO: o giro é desfeito antes da Box3, senão a AABB de
   uma casa girada 8° devolve fachada de 5,2 m onde a parede tem 4,4 m (o giro é o que
   a régua QUER que exista — não pode ser ele a pagar a cláusula). */
function medir(o) {
  const ry = o.rotation.y;
  o.rotation.y = 0; o.updateMatrixWorld(true);
  _box.setFromObject(o);
  const dim = _box.getSize(_v).clone();
  const baseY = _box.min.y;
  o.rotation.y = ry; o.updateMatrixWorld(true);
  return { larg: dim.x, alt: dim.y, prof: dim.z, baseY, ry };
}

const checks = [];
let falhas = 0;
for (const mapa of MAPAS) {
  const game = bootGame(mapa, { textures: T, ctf: true, seed: 13007 });
  const casas = [], varais = [];
  game.world.root.traverse((o) => {
    if (o.userData?.casaGlb) casas.push(o);
    if (o.userData?.varalGlb) varais.push(o);
  });

  /* ---- mutações: mexem no MUNDO, depois de construído ---- */
  if (mutar === 'ana') for (const o of casas) o.scale.multiplyScalar(0.6);
  if (mutar === 'molde-unico') for (const o of casas) o.userData.casaGlb.molde = MOLDES[0];
  if (mutar === 'laje-unica') for (const o of casas) o.userData.casaGlb.pavimentos = 1;
  if (mutar === 'varal-baixo') for (const o of varais) o.position.y -= 0.6;
  if (mutar && !casas.length) { console.error(`MUTANTE ${mutar} NÃO APLICOU: nenhuma casa de molde em ${mapa}.`); process.exit(2); }
  game.world.root.updateMatrixWorld(true);

  /* A DECLARAÇÃO ENTRA PRIMEIRO E A MEDIDA POR CIMA: ao contrário, `baseY` declarado
     do varal cobria o `baseY` MEDIDO e o mutante varal-baixo sobrevivia (aconteceu —
     foi a mutação que achou). Da declaração só se usa `molde` e `pavimentos`, que são
     rótulos; toda distância vem do mundo. */
  const med = casas.map((o) => ({ ...o.userData.casaGlb, ...medir(o) }));
  const varMed = varais.map((o) => ({ ...o.userData.varalGlb, ...medir(o) }));

  const porMolde = Object.fromEntries(MOLDES.map((m) => [m, med.filter((c) => c.molde === m).length]));
  const peOk = med.filter((c) => {
    const pe = c.alt / Math.max(1, c.pavimentos);
    return pe >= PE_MIN - 1e-6 && pe <= PE_MAX + 1e-6;
  });
  const fachOk = med.filter((c) => c.larg >= FACHADA_MIN - 1e-6 && c.prof >= PROF_MIN - 1e-6);
  const umaLaje = med.filter((c) => c.pavimentos === 1).length, duasLajes = med.filter((c) => c.pavimentos === 2).length;
  const giros = new Set(med.map((c) => Math.round(c.ry * 100))).size;
  const varOk = varMed.filter((v) => v.baseY >= CORDAO_MIN - 1e-6 && Math.max(v.larg, v.prof) >= VAO_MIN - 1e-6);

  const pes = med.map((c) => c.alt / Math.max(1, c.pavimentos));
  console.log(`\n[${mapa}] casas de molde: ${med.length} · varais de molde: ${varMed.length}`);
  if (med.length) {
    console.log(`  pé-direito medido: ${cx(Math.min(...pes))}–${cx(Math.max(...pes))} m` +
      ` · fachada: ${cx(Math.min(...med.map((c) => c.larg)))}–${cx(Math.max(...med.map((c) => c.larg)))} m` +
      ` · profundidade: ${cx(Math.min(...med.map((c) => c.prof)))}–${cx(Math.max(...med.map((c) => c.prof)))} m`);
    console.log(`  moldes: ${MOLDES.map((m) => `${m}=${porMolde[m]}`).join(' · ')} · pavimentos: 1×${umaLaje} 2×${duasLajes} · giros distintos: ${giros}`);
  }
  if (varMed.length) console.log(`  varal: cordão a ${varMed.map((v) => cx(v.baseY)).join(' · ')} m · vão ${varMed.map((v) => cx(Math.max(v.larg, v.prof))).join(' · ')} m`);

  checks.push(
    [`ESCGLB1 ${mapa}: >= ${CASAS_MIN} casas de molde, dois moldes, nenhum < 30%`,
      med.length >= CASAS_MIN && MOLDES.every((m) => porMolde[m] >= med.length * 0.3),
      `${med.length} casas · ${MOLDES.map((m) => `${m}=${porMolde[m]}`).join(' ')}`],
    [`ESCGLB2 ${mapa}: pé-direito por pavimento em ${cx(PE_MIN)}–${cx(PE_MAX)} m`,
      med.length > 0 && peOk.length === med.length,
      med.length ? `${peOk.length}/${med.length} na faixa (medido ${cx(Math.min(...pes))}–${cx(Math.max(...pes))} m)` : 'nenhuma casa — régua sem alvo'],
    [`ESCGLB3 ${mapa}: fachada >= ${cx(FACHADA_MIN)} m e profundidade >= ${cx(PROF_MIN)} m`,
      med.length > 0 && fachOk.length === med.length,
      med.length ? `${fachOk.length}/${med.length} na faixa` : 'nenhuma casa — régua sem alvo'],
    [`ESCGLB4 ${mapa}: variação real (>= 4 de 1 pav, >= 4 de 2 pav, >= 6 giros)`,
      umaLaje >= 4 && duasLajes >= 4 && giros >= 6,
      `1 pav ×${umaLaje} · 2 pav ×${duasLajes} · ${giros} giros`],
    [`ESCGLB5 ${mapa}: ${VARAL_MIN}–${VARAL_MAX} varais de molde, cordão >= ${cx(CORDAO_MIN)} m, vão >= ${cx(VAO_MIN)} m`,
      varMed.length >= VARAL_MIN && varMed.length <= VARAL_MAX && varOk.length === varMed.length,
      `${varMed.length} varais · ${varOk.length} na faixa`],
  );
}

console.log('');
for (const [nome, ok, det] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} — ${det}`); }

if (mutar) {
  if (falhas) { console.log(`MUTANTE ${mutar} MORDIDO (${falhas}/${checks.length} cláusulas vermelhas)`); process.exit(0); }
  console.error(`MUTANTE ${mutar} SOBREVIVEU — a régua não morde.`);
  process.exit(1);
}
if (falhas) { console.error(`ESCALA-FAVELA-GLB FALHA: ${falhas}/${checks.length}`); process.exit(1); }
console.log(`ESCALA-FAVELA-GLB OK — ${checks.length} cláusulas`);
