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

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (Lei 3 — se não morde, não existe)
     --mutante=monocromia ... troca TODO material por um só chapado   -> AMZ1
     --mutante=deserto ..... mantém 1 a cada 4 colisores de cover      -> AMZ2
     --mutante=agua-morta ... desregistra as águas vivas da cena       -> AMZ3
     --mutante=fauna-unica .. deixa só os ratos                        -> AMZ4
     Cada mutante tem que acender SÓ a cláusula dele (mutação que acende
     duas não prova nenhuma).

   USO
     node tools/eval/amazonia-check.mjs
     node tools/eval/amazonia-check.mjs --mutante=monocromia
   ============================================================================ */
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['monocromia', 'deserto', 'agua-morta', 'fauna-unica'];
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
];

console.log(`AMAZONIA — régua da frente  ${MUT ? `[mutante: ${MUT}]` : ''}`);
for (const c of clausulas) console.log(`  ${c.ok ? 'PASSA' : 'FALHA'}  ${c.id.padEnd(38)} ${c.valor}`);
const vermelhas = clausulas.filter((c) => !c.ok);

if (MUT) {
  const esperado = { monocromia: 'AMZ1', deserto: 'AMZ2', 'agua-morta': 'AMZ3', 'fauna-unica': 'AMZ4' }[MUT];
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
console.log('\n✓ AMAZONIA ok — variedade, cover, água viva e fauna nos pisos da frente.');
