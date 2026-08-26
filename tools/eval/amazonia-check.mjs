/* ============================================================================
   amazonia-check.mjs — A RÉGUA DO "NÃO PARECE LOW POLY" DA FRENTE AMAZONIA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O PR #375 ("Treta no Vietnã") foi rejeitado pelo dono com a alegação "não
   parece low poly" — frase que, sem instrumento, vira gosto. Esta régua traduz a
   alegação em QUATRO medidas no mundo construído (bootGame real, node puro),
   escolhidas para NÃO duplicar cláusula existente (LIÇÃO 2 do docs/LICOES.md:
   dois limiares para o mesmo conceito é o instrumento discordando de si):

     AMZ1  variedade de MATERIAL: nº de materiais distintos COM textura (`map`)
           na cena. O mapa-novo-gate já cobra FRAÇÃO de materiais texturizados
           (SUP1); aqui o que se mede é DIVERSIDADE — o sintoma do "low poly"
           que dói no olho não é superfície lisa, é o MESMO material em tudo.
     AMZ2  densidade de cover por área: colisores de pé-de-chão (minY < 1,6 m,
           altura útil ≥ 0,6 m) por 100 m² dos bounds. O MAP5 do invariants.mjs
           mede desequilíbrio RELATIVO à mediana dos quadrantes (e só cobra no
           loja_h); aqui é o piso ABSOLUTO — mapa inteiro vazio também passa
           na relativa.
     AMZ3  água VIVA: o igarapé tem que ter a água do idioma do córrego
           (mesh com `aguaViva` registrado em scene.userData.waters), não um
           plano azul parado.
      AMZ4  fauna ANIMADA em população: o piso sobe com o elenco (PR #439):
             ≥ 12 espécies e ≥ 24 bichos. Medido no elenco entregue: 28 bichos
             de 14 espécies (saída deste script; a AR2 do ambience-registry
             pede 2 espécies — o piso da frente amazonia é maior porque o dono
             pediu "mata viva").
      AMZ5  palafitas ATRAVESSÁVEIS (ronda 2): o dono disse "as casas estão
             suspensas sem ser palafita, precisava o jogador conseguir subir
             na madeira pra atravessar". Medido no MUNDO (flood-fill do próprio
             map-check: gh + _collide do jogo, degrau 0,30): (a) cada estação
             tem célula ALCANÇADA no patamar a DECK_Y; (b) a rede de pranchas
             liga as duas margens — célula alcançada no patamar de A (leste),
             na platforma M (meio do igarapé) e no patamar de F (oeste);
             (c) corrimão-collider (`passarela: true`) presente: ≥2 por
             estação e ≥2 por vão de prancha. Sem (c) o deck é chão fantasma.
      AMZ6  MATA DENSA no perímetro (ronda 2): "o horizonte não é cidade, se
             não floresta". Medido no manifesto que INSTANCIA os GLBs (mesma
             fonte que desenha — declaração paralela seria segunda verdade):
             ≥18 arvore_mata no anel externo (|x|≥29 ou |z|≥41,5), cobertura
             angular sem buraco >45°, escala variada ≥1,25× e ≥10 babacus de
             sub-bosque. Em node o GLB não carrega: a cerca viva procedural
             continua lá e o manifesto é o que o browser instancia.

    PROCEDÊNCIA DOS PISOS (Lei 2 — teto sem procedência é opinião)
      AMZ1 ≥ 12 e AMZ2 ≥ 2,0/100 m²: medidos nesta frente ANTES do polimento
      (primeira build que passou no MAP1): 31 materiais texturizados distintos e
      152 colisores de pé-de-chão em 5.391 m² de bounds = 2,82/100 m² (saída
      deste script, reproduzível no commit "wip: amazonia sobe"). Os pisos ficam
      a ~39% e ~71% do medido: piso colado no valor reprova por ruído (a lição
      do ORT1 do mapa-novo-gate) e o mutante é quem prova que o piso morde.
       AMZ3 e AMZ4: binário/populacional, lidos do contrato dos módulos
       (water.js marca `aguaViva` em scene.userData.waters; ambientlife.js
       expõe `ambience.animals`). AMZ4 piso 24/12: medido 28 bichos de 14
       espécies no elenco da frente (PR #439, 9 espécies Mint + as 5 clássicas
       do mapa); a folga 4/2 absorve um indivíduo a menos por espécie sem
       deixar o mapa virar deserto de bicho.
       AMZ5: contagem structural, lida do mundo construído — 11 estações, 4
       vãos de prancha, 87 corrimões `passarela` (saída deste script na ronda 2).
       Pisos 1 célula/2 corrimões/2 por vão: o mínimo que ainda é "atravessável"
       com redundância (1 só corrimão não cerca borda nenhuma).
       AMZ6 piso 18: 22 árvores instanciadas na ronda 2 (15-25 pedidos); folga
       de 4 remoções sem abrir buraco de horizonte. Gaps e escala medidos na
       mesma saída: pior vão angular ~20° (teto 45° = mais que o dobro), escala
       7,0-11,4 m (razão 1,63 ≥ piso 1,25).

    AS MUTAÇÕES QUE A DEIXAM VERMELHA (Lei 3 — se não morde, não existe)
      --mutante=monocromia ... troca TODO material por um só chapado   -> AMZ1
      --mutante=deserto ..... mantém 1 a cada 4 colisores de cover      -> AMZ2
      --mutante=agua-morta ... desregistra as águas vivas da cena       -> AMZ3
      --mutante=fauna-unica .. deixa só os ratos                        -> AMZ4
      --mutante=palafita-morta  apaga os corrimões `passarela`          -> AMZ5
      --mutante=desmata ......... esvazia o anel de árvores do perímetro -> AMZ6
      Cada mutante tem que acender SÓ a cláusula dele (mutação que acende
      duas não prova nenhuma). Os corrimões têm 0,52 m de altura: abaixo do
      piso de cover do AMZ2 de propósito — derrubar a palafita não pode
      "desertificar" o mapa, senão o mutante acende duas cláusulas.

    USO
      node tools/eval/amazonia-check.mjs
      node tools/eval/amazonia-check.mjs --mutante=monocromia
    ============================================================================ */
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=') || a.startsWith('--mutar=')) || '').split('=')[1] || '';
const MUTANTES = ['monocromia', 'deserto', 'agua-morta', 'fauna-unica', 'palafita-morta', 'desmata'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}\nconhecidos: ${MUTANTES.join(' | ')}`);
  process.exit(2);
}

const PISO_MATS = 12;          // AMZ1 — ver procedência no cabeçalho
const PISO_COVER = 2.0;        // AMZ2 — colisores de cover por 100 m² de bounds
const PISO_FAUNA_N = 24, PISO_FAUNA_ESP = 12;   // AMZ4 — real 28/14 (elenco PR #439), folga 4/2

const SEED = 13007;            // mesma do mapa-novo-gate: mesmos props sortidos

const g = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: SEED });
const W = g.world;
W.root.updateMatrixWorld(true);
const scene = g.scene;

/* ── AMZ1: materiais distintos com textura ── */
const mats = new Map();
W.root.traverse((o) => {
  if (!o.isMesh || o.visible === false) return;
  const arr = Array.isArray(o.material) ? o.material : [o.material];
  for (const m of arr) {
    if (!m || m.visible === false) continue;
    const e = mats.get(m.uuid) || { map: !!m.map, cor: m.color?.getHex() };
    mats.set(m.uuid, e);
  }
});
let matsTexturizados = [...mats.values()].filter((e) => e.map).length;
if (MUT === 'monocromia') {
  const unico = new THREE.MeshStandardMaterial({ color: 0x6b7a5e });
  W.root.traverse((o) => { if (o.isMesh) o.material = unico; });
  matsTexturizados = 1;
}

/* ── AMZ2: densidade de cover por área de bounds ── */
const B = W.bounds;
const areaBounds = (B.maxX - B.minX) * (B.maxZ - B.minZ);
const coverDe = (lista) => lista.filter((c) => c.minY < 1.6 && c.maxY - c.minY >= 0.6
  && (c.maxX - c.minX) * (c.maxZ - c.minZ) <= 60);
let cover = coverDe(W.colliders);
if (MUT === 'deserto') cover = cover.filter((_, i) => i % 4 === 0);
const densCover = cover.length / areaBounds * 100;

/* ── AMZ3: água viva do igarapé (createWater registra em scene.userData.waters;
   a lâmina mora em world.root — não somar as duas fontes, é o mesmo mesh) ── */
let aguasVivas = (scene.userData.waters || []).length;
if (MUT === 'agua-morta') aguasVivas = 0;

/* ── AMZ4: fauna animada ── */
let animais = W.ambience?.animals || [];
if (MUT === 'fauna-unica') animais = animais.filter((a) => a.type === 'rat');
const especies = new Set(animais.map((a) => a.type)).size;

/* ── AMZ5: palafitas atravessáveis — flood-fill do próprio map-check (gh + _collide
   do jogo, degrau 0,30): a régua só acredita em célula que o CORPO alcança. ── */
const META = W.amazonia;
const STEP_G = 0.25, R_BODY = 0.38, DEGRAU = 0.30;
const nGx = Math.ceil((B.maxX - B.minX) / STEP_G) + 1, nGz = Math.ceil((B.maxZ - B.minZ) / STEP_G) + 1;
const gid = (i, j) => i * nGz + j;
const alcancado = new Uint8Array(nGx * nGz);
{
  const andavel = (i, j) => {
    if (i < 0 || j < 0 || i >= nGx || j >= nGz) return false;
    const x = B.minX + i * STEP_G, z = B.minZ + j * STEP_G, p = { x, y: W.groundHeightAt(x, z), z };
    g._collide(p, R_BODY);
    return Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6;
  };
  const altura = (i, j) => W.groundHeightAt(B.minX + i * STEP_G, B.minZ + j * STEP_G);
  const fila = [];
  for (const s of Object.values(W.spawns || {}).flat()) {
    let i = Math.round((s.x - B.minX) / STEP_G), j = Math.round((s.z - B.minZ) / STEP_G);
    let ok = andavel(i, j);
    for (let rad = 1; rad <= 8 && !ok; rad++)
      for (let di = -rad; di <= rad && !ok; di++)
        for (let dj = -rad; dj <= rad && !ok; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
          if (andavel(i + di, j + dj)) { i += di; j += dj; ok = true; }
        }
    if (ok && !alcancado[gid(i, j)]) { alcancado[gid(i, j)] = 1; fila.push(i, j); }
  }
  for (let h = 0; h < fila.length; h += 2) {
    const i = fila[h], j = fila[h + 1], y0 = altura(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nGx || b >= nGz || alcancado[gid(a, b)] || !andavel(a, b)) continue;
      if (Math.abs(altura(a, b) - y0) > DEGRAU) continue;
      alcancado[gid(a, b)] = 1; fila.push(a, b);
    }
  }
}
const noDeck = (x, z) => {
  const i = Math.round((x - B.minX) / STEP_G), j = Math.round((z - B.minZ) / STEP_G);
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
    const a = i + di, b = j + dj;
    if (a < 0 || b < 0 || a >= nGx || b >= nGz) continue;
    if (!alcancado[gid(a, b)]) continue;
    if (Math.abs(W.groundHeightAt(B.minX + a * STEP_G, B.minZ + b * STEP_G) - META.deckY) < 0.05) return true;
  }
  return false;
};
const PAT_A = 1.6;
const decksAcessiveis = META.estacoes.filter((st) => noDeck(st.patamar.x, st.patamar.z));
const margemA = META.estacoes.find((st) => st.rede && st.x > 0);
const margemF = META.estacoes.find((st) => st.rede && st.x < 0);
const travessia = margemA && margemF && noDeck(margemA.patamar.x, margemA.patamar.z)
  && noDeck(0, 6) && noDeck(margemF.patamar.x, margemF.patamar.z);
let corrimoes = W.colliders.filter((c) => c.passarela);
if (MUT === 'palafita-morta') corrimoes = [];
const perto = (c, x, z, r) => Math.hypot((c.minX + c.maxX) / 2 - x, (c.minZ + c.maxZ) / 2 - z) <= r;
const estacoesComCorrimao = META.estacoes.filter((st) => corrimoes.filter((c) => perto(c, st.patamar.x, st.patamar.z, 2.6)).length >= 2);
const distSeg = (c, p) => {
  const dx = p.bx - p.ax, dz = p.bz - p.az, L2 = dx * dx + dz * dz;
  let t = L2 ? ((c.x - p.ax) * dx + (c.z - p.az) * dz) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.ax + dx * t - c.x, p.az + dz * t - c.z);
};
const vaosComCorrimao = META.pontes.filter((p) => corrimoes.filter((c) => distSeg({ x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2 }, p) <= 1.4).length >= 2);

/* ── AMZ6: mata densa no perímetro — o manifesto que instancia os GLBs ── */
let anel = META.perimetro.arvores;
if (MUT === 'desmata') anel = [];
const noAnel = anel.every((a) => Math.abs(a.x) >= 29 || Math.abs(a.z) >= 41.5);
const angulos = anel.map((a) => Math.atan2(a.z, a.x)).sort((x, y) => x - y);
let piorVao = 0;
for (let i = 0; i < angulos.length; i++) {
  const prox = i + 1 < angulos.length ? angulos[i + 1] : angulos[0] + Math.PI * 2;
  piorVao = Math.max(piorVao, (prox - angulos[i]) * 180 / Math.PI);
}
const escalas = anel.map((a) => a.s);
const razaoEsc = anel.length ? Math.max(...escalas) / Math.min(...escalas) : 0;
const amz5ok = decksAcessiveis.length === META.estacoes.length && travessia
  && estacoesComCorrimao.length === META.estacoes.length && vaosComCorrimao.length === META.pontes.length;
const amz6ok = anel.length >= 18 && noAnel && piorVao <= 45 && razaoEsc >= 1.25 && META.perimetro.palmeiras.length >= 10;

/* ── veredito ── */
const clausulas = [
  { id: 'AMZ1 variedade de material texturizado', ok: matsTexturizados >= PISO_MATS,
    valor: `${matsTexturizados} materiais (piso ${PISO_MATS})` },
  { id: 'AMZ2 densidade de cover', ok: densCover >= PISO_COVER,
    valor: `${densCover.toFixed(2)}/100 m² de bounds · ${cover.length} colisores de pé-de-chão em ${areaBounds.toFixed(0)} m² (piso ${PISO_COVER})` },
  { id: 'AMZ3 água viva do igarapé', ok: aguasVivas >= 1,
    valor: `${aguasVivas} lâmina(s) com aguaViva (createWater da water.js)` },
  { id: 'AMZ4 fauna animada', ok: animais.length >= PISO_FAUNA_N && especies >= PISO_FAUNA_ESP,
    valor: `${animais.length} bichos de ${especies} espécies (pisos ${PISO_FAUNA_N}/${PISO_FAUNA_ESP})` },
  { id: 'AMZ5 palafitas atravessáveis', ok: amz5ok,
    valor: `${decksAcessiveis.length}/${META.estacoes.length} patamares alcançados · travessia ${travessia ? 'A→M→F ok' : 'CORTADA'} · ${estacoesComCorrimao.length}/${META.estacoes.length} estações e ${vaosComCorrimao.length}/${META.pontes.length} vãos com corrimão (${corrimoes.length} colliders)` },
  { id: 'AMZ6 mata densa no perímetro', ok: amz6ok,
    valor: `${anel.length} árvores no anel + ${META.perimetro.palmeiras.length} babacus · pior vão ${piorVao.toFixed(0)}° ≤45 · escala ${razaoEsc.toFixed(2)}× (pisos 18/10/45°/1,25×)` },
];

console.log(`AMAZONIA — régua da frente  ${MUT ? `[mutante: ${MUT}]` : ''}`);
for (const c of clausulas) console.log(`  ${c.ok ? 'PASSA' : 'FALHA'}  ${c.id.padEnd(38)} ${c.valor}`);
const vermelhas = clausulas.filter((c) => !c.ok);

if (MUT) {
  const esperado = { monocromia: 'AMZ1', deserto: 'AMZ2', 'agua-morta': 'AMZ3', 'fauna-unica': 'AMZ4', 'palafita-morta': 'AMZ5', desmata: 'AMZ6' }[MUT];
  if (vermelhas.length !== 1 || !vermelhas[0].id.startsWith(esperado)) {
    console.error(`\nMUTANTE ${MUT} ${vermelhas.length ? `acendeu ${vermelhas.map((v) => v.id.split(' ')[0]).join(', ')} em vez de ${esperado}` : 'SOBREVIVEU'} — a régua não mede o que diz medir.`);
    process.exit(1);
  }
  console.log(`\nMUTANTE MORDIDO: ${MUT} -> ${esperado}`);
  process.exit(0);
}
if (vermelhas.length) {
  console.error(`\n✗ AMAZONIA: ${vermelhas.length} cláusula(s) vermelha(s) — "low poly" tem número, e ele está aqui.`);
  process.exit(1);
}
console.log('\n✓ AMAZONIA ok — variedade, cover, água viva, fauna, madeira atravessável e mata no horizonte.');
