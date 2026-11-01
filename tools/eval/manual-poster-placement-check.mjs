// Cartazes: arquivo único, suporte físico e ausência de sobreposição.
// Contrato e mutantes: docs/visual-consistency/POSTERS-MANUAIS.md.
import { THREE, MAPS, initTextures } from './harness.mjs';
import { preloadPropGeometry } from './prop-geometry-fixture.mjs';
import { criarSuporteGrafite, GRAFFITI_SUPPORT_DISTANCE } from '../../public/js/graffiti_surface.js';
import { retanguloGrafiteDesenhado, gradeEspacial } from '../../public/js/graffiti_pass.js';
import { hasProp } from '../../public/js/mapprops.js';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MUTANTES = ['arte-repetida', 'afastado', 'sobreposto', 'peca-encolhida', 'material-escondido', 'modulo-ministerios'];
const argv = process.argv.slice(2);
if (argv.length > 1 || argv.some((a) => !a.startsWith('--mutante=') || a === '--mutante=')) { console.error('uso: node tools/eval/manual-poster-placement-check.mjs [--mutante=NOME]'); process.exit(2); }
const MUTANTE = argv[0]?.slice('--mutante='.length) || null;
if (MUTANTE && !MUTANTES.includes(MUTANTE)) {
  console.error(`manual-poster-placement: mutante desconhecido: ${MUTANTE} (válidos: ${MUTANTES.join(', ')})`);
  process.exit(1);
}

const MINIMO_MANUAL = { praca_poderes: 4, posto_treta: 1 };
const ALVO_MUTANTE = {
  arte_repetida: 'UNICO_ARQUIVO',
  afastado: 'SUPORTE',
  sobreposto: 'SEM_OVERLAP',
  peca_encolhida: 'SEM_OVERLAP',
  material_escondido: 'CONTAGEM_MANUAL',
};

// Tolerância igual à quantização mm/mrad do bake; derivação na documentação.
const EPS_GEOM = 1e-3;
const EPS_ANG = 1e-3;
const SEP_PLANO = 2 * GRAFFITI_SUPPORT_DISTANCE;

const falhas = [];

function medirMapa(id, build = MAPS[id].build) {
  const T = initTextures();
  const scene = new THREE.Scene();
  const root = build(scene, T).root;
  const m = { id, root, T };
  coletar(m);
  return m;
}

/* coleta REAL (baseline e pós-mutação pelo MESMO caminho): o que não está na
   cena medida não entra nos arrays — nenhum aplicador empurra peça à mão. */
function coletar(m) {
  const { root, T } = m;
  root.updateMatrixWorld(true);

  /* textura → arquivo: identidade de objeto, funciona sem rede (imagem ausente) */
  const texParaArquivo = new Map();
  (T.posterFiles || []).forEach((f, i) => { if (T.posterImgs[i]) texParaArquivo.set(T.posterImgs[i], f); });

  const manuais = [], posterPieces = [], outrasArtes = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || !(mesh.layers.mask & 1)) return;
    for (let n = mesh; n; n = n.parent) if (!n.visible) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((material) => !material || material.visible === false || material.colorWrite === false || (material.transparent === true && material.blending !== THREE.NoBlending && !(material.opacity > 0)))) return;
    const arquivo = texParaArquivo.get(materials[0]?.map);
    const doBake = /^(decal:|mural:)/.test(mesh.name) || Number.isFinite(mesh.userData.pecas);
    if (arquivo && !doBake) {
      const rect = retanguloGrafiteDesenhado(mesh.geometry, mesh.matrixWorld);
      manuais.push({ mesh, rect, arquivo, nome: mesh.name });
      if (rect) posterPieces.push({ arquivo, rect });
    } else if (/^(decal:|mural:|poster:)/.test(mesh.name)) {
      const rect = retanguloGrafiteDesenhado(mesh.geometry, mesh.matrixWorld);
      if (arquivo) posterPieces.push({ arquivo, rect });
      if (rect) outrasArtes.push({ arquivo, rect });
    }
  });
  /* inventário assado do bake: pós-junção, carrega o nome do arquivo em `f` */
  const falhasBake = [];
  root.traverse((node) => {
    for (const p of node.userData.graffitiPecas || []) {
      const poster = String(p.f || '').startsWith('poster:');
      if (![p.x, p.y, p.z, p.ry, p.w, p.h].every(Number.isFinite)) {
        if (poster) falhasBake.push(`UNKNOWN_FORMATO: ${m.id} peça de bake "${p.f}" com campos não finos — fail-closed, conferir o formato do graffitiPecas.`);
        continue;
      }
      const rect = { x: p.x, y: p.y, z: p.z, ry: p.ry, w: p.w, h: p.h };
      outrasArtes.push({ arquivo: poster ? p.f.slice(7) : null, rect });
      if (poster) posterPieces.push({ arquivo: p.f.slice(7), rect });
    }
  });
  m.manuais = manuais;
  m.posterPieces = posterPieces;
  m.outrasArtes = outrasArtes;
  m.falhasBake = falhasBake;
}

// Duas representações só identificam a mesma arte se o quad inteiro coincidir.
function mesmaArte(a, b) {
  const dy = Math.abs(a.ry - b.ry) % Math.PI;
  const paralelos = dy < EPS_ANG || dy > Math.PI - EPS_ANG;
  return paralelos
    && Math.abs(a.x - b.x) <= EPS_GEOM && Math.abs(a.y - b.y) <= EPS_GEOM && Math.abs(a.z - b.z) <= EPS_GEOM
    && Math.abs(a.w - b.w) <= EPS_GEOM && Math.abs(a.h - b.h) <= EPS_GEOM;
}

// Interseção coplanar usa a margem de suporte e de quantização documentadas.
function sobrepoe(a, b) {
  const dy = Math.abs(a.ry - b.ry) % Math.PI;
  if (!(dy < EPS_ANG || dy > Math.PI - EPS_ANG)) return false;
  const dx = a.x - b.x, dz = a.z - b.z;
  if (Math.abs(dx * Math.sin(a.ry) + dz * Math.cos(a.ry)) > SEP_PLANO) return false;
  const u = dx * Math.cos(a.ry) - dz * Math.sin(a.ry);
  return Math.abs(u) < (a.w + b.w) / 2 + EPS_GEOM && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + EPS_GEOM;
}

function avaliarUnicidade(m) {
  const porClause = new Set();
  const { id, posterPieces } = m;
  const posicoes = new Map();
  for (const p of posterPieces) {
    if (!p.rect) continue;
    const vistas = posicoes.get(p.arquivo) || [];
    if (!vistas.some((r) => mesmaArte(r, p.rect))) vistas.push(p.rect);
    posicoes.set(p.arquivo, vistas);
  }
  for (const [arquivo, vistas] of posicoes) {
    if (vistas.length > 1) {
      porClause.add('UNICO_ARQUIVO');
      falhas.push(`UNICO_ARQUIVO: ${id} "${arquivo}" aparece em ${vistas.length} posições distintas (manual + bake). Escolher arquivo distinto — o POSTER_FILES tem tombstones do mesmo arquivo nos índices 0..3, então escolha por índice repete arte.`);
    }
  }
  return porClause;
}

function avaliar(m) {
  const porClause = avaliarUnicidade(m);
  const { id, root, manuais, outrasArtes } = m;

  /* NOME_CANONICO — o graffiti_pass (artesPresentes) só reserva a arte pelo nome
     `poster:<arquivo>`; sem ele o bake volta a repetir o arquivo. */
  for (const p of manuais) {
    if (p.nome !== `poster:${p.arquivo}`) {
      porClause.add('NOME_CANONICO');
      falhas.push(`NOME_CANONICO: ${id} cartaz em (${p.mesh.position.toArray().map((v) => +v.toFixed(2))}) nome=${JSON.stringify(p.nome)} — esperado "poster:${p.arquivo}".`);
    }
  }

  /* SUPORTE — parede opaca a ≤5 cm atrás do quad TODO (amostras + cobertura, as
     MESMAS funções do prod; ignorarMesh = o próprio cartaz não é parede dele). */
  for (const p of manuais) {
    if (!p.rect) {
      porClause.add('SUPORTE');
      falhas.push(`SUPORTE: ${id} "${p.arquivo}" não é um quad desenhado medível (retanguloGrafiteDesenhado = null).`);
      continue;
    }
    if (!criarSuporteGrafite(root, gradeEspacial, p.mesh)(p.rect)) {
      porClause.add('SUPORTE');
      const { x, y, z, w, h } = p.rect;
      falhas.push(`SUPORTE: ${id} "${p.arquivo}" em (${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}) ${w.toFixed(2)}x${h.toFixed(2)} sem parede opaca a ≤5 cm (GRAFFITI_SUPPORT_DISTANCE). Montar a 2–3 cm da face real — cartaz no ar lê como adesivo flutuante.`);
    }
  }

  /* SEM_OVERLAP — cartaz manual não cobre outra arte; a própria representação
     assada (mesmaArte) não conta como rival. */
  for (const p of manuais) {
    if (!p.rect) continue;
    const rivais = manuais.filter((o) => o !== p && o.rect).map((o) => ({ arquivo: o.arquivo, rect: o.rect }))
      .concat(outrasArtes)
      .filter((o) => !(o.arquivo === p.arquivo && mesmaArte(o.rect, p.rect)));
    for (const o of rivais) {
      if (sobrepoe(p.rect, o.rect)) {
        porClause.add('SEM_OVERLAP');
        falhas.push(`SEM_OVERLAP: ${id} "${p.arquivo}" (${p.rect.x.toFixed(2)},${p.rect.y.toFixed(2)},${p.rect.z.toFixed(2)}) sobrepõe peça em (${o.rect.x.toFixed(2)},${o.rect.y.toFixed(2)},${o.rect.z.toFixed(2)}) ${o.rect.w.toFixed(2)}x${o.rect.h.toFixed(2)} no mesmo plano. Mover — quem entra a dedo escolhe vaga; o preenchimento desvia.`);
        break;
      }
    }
  }

  if (manuais.length < MINIMO_MANUAL[id]) {
    porClause.add('CONTAGEM_MANUAL');
    falhas.push(`CONTAGEM_MANUAL: ${id} tem ${manuais.length} cartazes manuais, mínimo ${MINIMO_MANUAL[id]}.`);
  }
  return porClause;
}

// Mutantes alteram a cena; a mesma coleta da baseline mede o resultado.
function aplicarMutante(m) {
  if (!MUTANTE || MUTANTE === 'modulo-ministerios') return null;
  const alvo = m.manuais[0];
  if (!alvo?.rect) return null;
  if (MUTANTE === 'arte-repetida') {
    const clone = alvo.mesh.clone();
    const u = new THREE.Vector3(Math.cos(alvo.rect.ry), 0, -Math.sin(alvo.rect.ry));
    clone.position.addScaledVector(u, alvo.rect.w + 0.2);
    (alvo.mesh.parent || m.root).add(clone);
    m.root.updateMatrixWorld(true);
    coletar(m);
    const rectClone = retanguloGrafiteDesenhado(clone.geometry, clone.matrixWorld);
    if (!rectClone || !clone.parent || Math.hypot(rectClone.x - alvo.rect.x, rectClone.z - alvo.rect.z) < alvo.rect.w) {
      throw new Error('MUTANTE NÃO APLICOU: clone não foi deslocado na cena');
    }
    return ALVO_MUTANTE.arte_repetida;
  }
  if (MUTANTE === 'afastado') {
    const n = new THREE.Vector3(Math.sin(alvo.rect.ry), 0, Math.cos(alvo.rect.ry));
    alvo.mesh.position.addScaledVector(n, 0.12);   // 12 cm > 5 cm de GRAFFITI_SUPPORT_DISTANCE
    alvo.mesh.updateMatrixWorld(true);
    m.root.updateMatrixWorld(true);
    coletar(m);
    const medido = retanguloGrafiteDesenhado(alvo.mesh.geometry, alvo.mesh.matrixWorld);
    if (!medido || Math.hypot(medido.x - alvo.rect.x, medido.z - alvo.rect.z) < 0.11) {
      throw new Error('MUTANTE NÃO APLICOU: a re-coleta não mediu o cartaz afastado');
    }
    return ALVO_MUTANTE.afastado;
  }
  if (MUTANTE === 'sobreposto') {
    const vitima = m.manuais.find((o) => o !== alvo && o.rect);
    if (!vitima) return null;
    alvo.mesh.position.x += vitima.rect.x - alvo.rect.x;
    alvo.mesh.position.y += vitima.rect.y - alvo.rect.y;
    alvo.mesh.position.z += vitima.rect.z - alvo.rect.z;
    alvo.mesh.rotation.y = vitima.mesh.rotation.y;
    alvo.mesh.updateMatrixWorld(true);
    m.root.updateMatrixWorld(true);
    coletar(m);
    const medido = retanguloGrafiteDesenhado(alvo.mesh.geometry, alvo.mesh.matrixWorld);
    if (!medido || Math.hypot(medido.x - vitima.rect.x, medido.y - vitima.rect.y, medido.z - vitima.rect.z) > 0.01) {
      throw new Error('MUTANTE NÃO APLICOU: a re-coleta não mediu o cartaz sobre a vítima');
    }
    return ALVO_MUTANTE.sobreposto;
  }
  if (MUTANTE === 'peca-encolhida') {
    /* negativo manual+bake: mesma arquivo/centro/ângulo, dimensões menores —
       duas peças sobrepostas, não duas representações da mesma peça. */
    const r = alvo.rect;
    (m.root.userData.graffitiPecas ||= []).push({
      f: `poster:${alvo.arquivo}`, x: r.x, y: r.y, z: r.z, ry: r.ry, w: r.w / 2, h: r.h / 2,
    });
    coletar(m);
    const encolhida = m.root.userData.graffitiPecas.some((o) => o.f === `poster:${alvo.arquivo}` && o.w === r.w / 2 && o.h === r.h / 2 && o.x === r.x && o.z === r.z);
    if (!encolhida) throw new Error('MUTANTE NÃO APLICOU: a re-coleta não encontrou a peça assada encolhida');
    return ALVO_MUTANTE.peca_encolhida;
  }
  if (MUTANTE === 'material-escondido') {
    const escondiveis = m.manuais.filter((p) => p.mesh.material);
    if (!escondiveis.length) return null;
    for (const p of escondiveis) {
      const mats = Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material];
      for (const mat of mats) { mat.visible = false; }
    }
    coletar(m);
    const ainda = escondiveis.flatMap((p) => Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material]).filter((mat) => mat.visible !== false).length;
    if (ainda > 0) throw new Error(`MUTANTE NÃO APLICOU: ${ainda} materiais continuam visíveis`);
    return ALVO_MUTANTE.material_escondido;
  }
}

const ARTES_BRASILIA = ['despisque-leao.jpg', 'New Project (1).png', 'or-baile.jpg', '25c9112229edfcfbb1eae4137ecc151a.jpg'].sort();
function medirQuery(query, build = MAPS.praca_poderes.build) {
  const anterior = location.search;
  try { location.search = query; return medirMapa('praca_poderes', build); }
  finally { location.search = anterior; }
}
function inventarioVariante(label, query, build = MAPS.praca_poderes.build) {
  const m = medirQuery(query, build), inicioFalhas = falhas.length;
  m.id += '/' + label;
  const clauses = avaliarUnicidade(m);
  const arquivos = m.manuais.map(p => p.arquivo).sort();
  const esquerda = m.manuais.filter(p => p.rect?.x < 0).length;
  const direita = m.manuais.filter(p => p.rect?.x > 0).length;
  if (JSON.stringify(arquivos) !== JSON.stringify(ARTES_BRASILIA)) {
    clauses.add('ARTES_VARIANTE'); falhas.push(`ARTES_VARIANTE: ${label} deve desenhar as quatro artes originais uma vez, medido ${JSON.stringify(arquivos)}.`);
  }
  if (esquerda !== 2 || direita !== 2) {
    clauses.add('BALANCO_VARIANTE'); falhas.push(`BALANCO_VARIANTE: ${label} mediu ${esquerda}/${direita}, esperado 2/2 nos assets atuais.`);
  }
  if (m.manuais.some(p => !p.rect || p.nome !== `poster:${p.arquivo}`)) {
    clauses.add('FORMA_VARIANTE'); falhas.push(`FORMA_VARIANTE: ${label} contém quad ilegível ou nome não canônico.`);
  }
  falhas.push(...m.falhasBake);
  const descritores = m.manuais.map(p => ({ arquivo: p.arquivo, nome: p.nome, rect: p.rect,
    matrix: p.mesh.matrixWorld.toArray(), side: p.mesh.material.side, roughness: p.mesh.material.roughness,
    metalness: p.mesh.material.metalness, color: p.mesh.material.color.getHex(),
    geometry: Object.fromEntries(Object.entries(p.mesh.geometry.attributes).map(([k,a]) => [k,
      createHash('sha256').update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength)).digest('hex')])) }));
  console.log('POSTER_VARIANT ' + JSON.stringify({ label, query, count: m.manuais.length, arquivos, esquerda, direita,
    descriptorSHA256: createHash('sha256').update(JSON.stringify(descritores)).digest('hex'), descritores,
    clauses: [...clauses], errors: falhas.length - inicioFalhas, scope: 'uniqueness/inventory only; nominal physical checks stay separate' }));
  return { m, clauses };
}
async function moduloBuild() {
  const url = new URL('../../public/js/map_brasilia.js', import.meta.url);
  const source = readFileSync(url, 'utf8');
  const fix = `    const limite = Math.min(ARQUIVOS.length, ministries.length);
    for (let i = 0; i < limite; i++) {
      putPoster(ministries[Math.floor(i * ministries.length / limite)], ARQUIVOS[i]);
    }`;
  if (source.split(fix).length !== 2) throw new Error('MUTANTE NÃO APLICOU: seleção única não encontrada uma vez');
  const mutated = source.replace(fix, '    ministries.forEach((b, i) => putPoster(b, ARQUIVOS[i % ARQUIVOS.length]));');
  const resolved = mutated.replace(/from '([^']+)'/g, (all,p) => p === 'three'
    ? `from '${new URL('../../public/vendor/three.module.js', import.meta.url)}'`
    : p.startsWith('.') ? `from '${new URL(p,url)}'` : all);
  const dir = mkdtempSync(path.join(tmpdir(), 'poster-modulo-'));
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'map_brasilia.mjs'); writeFileSync(file, resolved);
  return (await import(pathToFileURL(file))).buildBrasilia;
}

if (hasProp('ministerio')) throw new Error('FALLBACK: fixture deve começar sem o ministério carregado');
const fallback = medirQuery('');
if (fallback.manuais.length !== 0) throw new Error('FALLBACK: desenho de cartaz sem geometria de ministério');
console.log('POSTER_FALLBACK ' + JSON.stringify({ count: 0, ministryLoaded: false, status: 'NO_MANUAL_GEOMETRY_NOT_ART_ACCEPTANCE' }));
let alvoMutante = null;
const clausesVistas = new Set();
for (const id of ['praca_poderes', 'posto_treta']) {
  await preloadPropGeometry(MAPS[id].props);
  const anterior = location.search; let m;
  try { location.search = ''; m = medirMapa(id); } finally { location.search = anterior; }
  alvoMutante = alvoMutante || aplicarMutante(m);
  falhas.push(...m.falhasBake);
  for (const c of avaliar(m)) clausesVistas.add(`${id}:${c}`);
}

if (!hasProp('ministerio')) throw new Error('VARIANTES: ministério GLB real não carregou');
for (const [label,query] of [['default',''],['small','?bigscale=0'],['minsq0','?minsq=0']]) inventarioVariante(label,query);

if (MUTANTE === 'modulo-ministerios') {
  if (falhas.length) { console.error('modulo-ministerios: nominal não verde; mutação não executada'); process.exit(1); }
  const { m, clauses } = inventarioVariante('mutante-modulo-small','?bigscale=0',await moduloBuild());
  if (m.manuais.length !== 8 || !clauses.has('UNICO_ARQUIVO')) {
    console.error('modulo-ministerios: fonte revertida deve desenhar oito cartazes e reprovar UNICO_ARQUIVO'); process.exit(1);
  }
  console.log('mutante modulo-ministerios: fonte real reprovou em UNICO_ARQUIVO no small como esperado'); process.exit(0);
}

if (MUTANTE) {
  if (!alvoMutante) {
    console.error(`MUTANTE ${MUTANTE} NÃO APLICOU em nenhum mapa — a régua não mediu nada.`);
    process.exit(1);
  }
  if (![...clausesVistas].some((c) => c.endsWith(':' + alvoMutante))) {
    console.error(`MUTANTE ${MUTANTE} PASSOU VERDE — a régua não mede o que diz (esperava ${alvoMutante}).`);
    console.error(falhas.join('\n'));
    process.exit(1);
  }
  console.log(`mutante ${MUTANTE}: reprovou em ${alvoMutante} como esperado`);
  process.exit(0);
}

for (const f of falhas) console.error(`VERMELHO ${f}`);
console.log(`manual-poster-placement: ${falhas.length === 0 ? 'VERDE' : `${falhas.length} reprovações`}`);
process.exit(falhas.length ? 1 : 0);
