/* ============================================================================
   decal-probe.mjs — O QUE FOI COLADO NA PAREDE, ONDE E DE QUE TAMANHO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Os 179 recortes de `public/img/decals` entram nos mapas como PLANO SEM COLLIDER
   (é a regra: decalque que empurra colisor vira parede invisível — BUG-21, o ônibus
   da Brasília, 2,33 m de parede fantasma). A consequência boa é que nenhuma régua
   de geometria muda quando eles entram; a consequência ruim é que NENHUMA RÉGUA VÊ
   se eles entraram. `map-check` e `pickup-check` dão exatamente o mesmo número com
   49 decalques ou com zero.

   Esta régua fecha esse buraco pelo único caminho que sobra: os mapas nomeiam cada
   plano de decalque como `decal:<arquivo>.png`, e em node a TEXTURA nunca carrega
   mas o NOME e a GEOMETRIA existem. Então dá pra conferir, sem navegador:
     · quantas peças cada mapa cola e quantos arquivos distintos usa;
     · a posição e o `ry` de cada uma (peça virada pro lado errado aparece aqui);
     · a LARGURA × ALTURA final — que é o que o dono pediu ("num tamanho MAIOR que
       os posters atuais"): o cartaz do Piscinão tem 2,2 m, então peça abaixo disso
       numa parede alta é regressão do pedido, não detalhe.

   O QUE ELA **NÃO** MEDE, e é por isso que ela não substitui olhar:
   se a peça está DENTRO de outra malha, se caiu em cima de uma janela, se o mapa
   ficou poluído. Nada disso é número. Os mapas com prédio GLB (a Brasília inteira)
   aparecem com ZERO aqui porque em node nenhum GLB carrega e as fachadas não
   existem — conferir esses é obrigatoriamente por captura.

   Uso:
     node tools/eval/decal-probe.mjs [mapId]     # resumo por mapa
     V=1 node tools/eval/decal-probe.mjs [mapId] # + uma linha por peça
   ============================================================================ */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { paredeAtras, medirParede } from '../../public/js/map_decals.js';

const T = initTextures();
const ONLY = process.argv[2];
const VERBOSE = process.env.V === '1';
const H_CARTAZ = 2.2;   // altura do cartaz do Piscinão — a régua de tamanho do dono

/* ── PAREDE ATRÁS (04/08, reconciliada 12/08 — issue #75) ────────────────────────
   Reprovação literal do dono: "os graffites que colocaste, colocaste em lugares
   que não são parede". Esta régua repete, DEPOIS de construído, o mesmo raycast
   que os mapas rodam ANTES de desenhar — de propósito com a MESMA função
   (`public/js/map_decals.js`), pra não haver duas medidas discordando por causa do
   instrumento. Se um decalque não tem parede atrás por NENHUM critério da casa, a
   contagem sobe; é a mutação que faz a régua morder.

   ── POR QUE DUAS FUNÇÕES E NÃO UMA (issue #75) ──────────────────────────────────
   A 1ª versão media TODO mapa só com `paredeAtras` — o que estava certo enquanto
   TODO `decal()` validava com `paredeAtras`. Mas a Quebrada evoluiu (06/08): o
   `decal()` dela valida com `medirParede` (acha a face VISÍVEL do barraco GLB) e
   AINDA MOVE a peça `recuo` metros até colar nela. `paredeAtras` (25 raios, plano de
   25 cm, alcance 0,8 m) é mais DURO que `medirParede` (3×3 amostras, tolera 3 de 9
   vazias pra vão de porta/janela, degrau até 0,6 m) — então re-medir com `paredeAtras`
   uma peça que nasceu e foi colada por `medirParede` reprovava 92 peças LEGÍTIMAS,
   concentradas nas vielas de x=±21 (barraco baixo, peça no topo do muro, micro-recuo).
   Era a régua acusando a peça por causa do instrumento, não do jogo.

   O conserto NÃO é trocar uma função pela outra: se a Quebrada passasse a medir só
   com `medirParede`, o Piscinão (que valida com `paredeAtras` e NÃO move a peça)
   ganharia 6 falsos positivos no sentido inverso. O conserto é perguntar pelas MESMAS
   réguas que a casa usa pra construir: uma peça TEM parede se QUALQUER uma delas acha
   sólido atrás —
     · `paredeAtras(solids)`   — o raycast contra os sólidos DECLARADOS do mapa
       (malha `[root]` em piscina/havan/quebrada; caixas giradas no ferrovelho);
     · `paredeAtras(colliders)` — o mesmo, mas contra as CAIXAS AABB, que pegam a peça
       alta encostada num muro-caixa de 2,2 m (o topo escapa da amostra de malha, a
       caixa não);
     · `medirParede([root])`   — a face VISÍVEL, com a tolerância de vão que a Quebrada
       exige (é literalmente a função que o `decal()` dela rodou pra criar a peça).
   Peça no ar de verdade (nenhuma parede em 1,2 m) falha as três e continua acusada —
   a mutação segue mordendo. Cola um decalque a 5 m do nada e a contagem sobe.

   `decalSolids` sai do `buildWorld` e é declaração, não geometria nova: em havan,
   pool_day e quebrada ele É o `[root]`; em ferrovelho leva as duas folhas
   giradas do portão e em brasilia as empenas dos ministérios (GLB sem collider).

   LIMITE CONHECIDO: em node NENHUM GLB carrega, então os ministérios da Brasília
   não existem e o praca_poderes mede 0 decalque aqui. As 16 peças dele só aparecem no
   navegador — capturar continua sendo obrigatório. */
let total = 0, curtos = 0, semParede = 0;
for (const [id, m] of Object.entries(MAPS)) {
  if (ONLY && id !== ONLY) continue;
  const scene = new THREE.Scene();
  const W = m.build(scene, T);
  const files = new Map(), linhas = [], soltas = [];
  const solids = W.decalSolids || W.colliders || [];
  const boxes = W.colliders || [];
  // TEM parede atrás por QUALQUER régua da casa? (ver docstring — reconciliação #75)
  const temParede = (x, y, z, ry, w, h) =>
    paredeAtras(solids, x, y, z, ry, w, h)
    || paredeAtras(boxes, x, y, z, ry, w, h)
    || medirParede([W.root], x, y, z, ry, w, h) !== null;
  let n = 0, menor = Infinity, maior = 0;
  /* ── AS PEÇAS DA PASSADA NÃO SÃO MEDIDAS AQUI, E ISSO É DE PROPÓSITO (07/08) ──
     A passada de grafite (`public/js/graffiti_pass.js`) resolve a colocação NO
     NAVEGADOR, contra a malha GLB, e o resultado fica congelado em
     `public/js/graffiti_layout.js`. Este probe roda em NODE, onde NENHUM GLB carrega:
     medir `paredeAtras` numa peça que foi colada numa fachada de barraco que aqui não
     existe devolve "sem parede" para TODAS elas — 186 falsos positivos só na Quebrada
     na primeira vez que isto rodou. Reprovar por isso seria a régua acusando o
     instrumento dela mesma.
     Elas também não têm `geometry.parameters` (viram uma malha por arquivo, via
     mergeGeometries), então o tamanho vem de `userData.pecas` só pra contagem.
     Quem cobra a colocação delas é `tools/eval/graffiti-census.mjs`, que abre o mapa
     num navegador de verdade — inclusive o caso "layout velho, peça no ar". */
  let daPassada = 0;
  W.root.traverse((o) => {
    if (!o.isMesh || !String(o.name).startsWith('decal:')) return;
    if (o.userData && o.userData.pecas) { daPassada += o.userData.pecas; return; }
    const f = o.name.slice(6), g = o.geometry.parameters || {};
    const w = g.width || 0, h = g.height || 0;
    n++; files.set(f, (files.get(f) || 0) + 1);
    menor = Math.min(menor, h); maior = Math.max(maior, h);
    const p = o.getWorldPosition(new THREE.Vector3());
    if (!temParede(p.x, p.y, p.z, o.rotation.y, w, h)) {
      soltas.push(`    SEM PAREDE  ${w.toFixed(2)} × ${h.toFixed(2)} m  ry=${o.rotation.y.toFixed(2)}  `
        + `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})  ${f}`);
    }
    linhas.push(`    ${w.toFixed(2)} × ${h.toFixed(2)} m  ry=${o.rotation.y.toFixed(2)}  `
      + `(${o.position.x.toFixed(2)}, ${o.position.y.toFixed(2)}, ${o.position.z.toFixed(2)})  ${f}`);
  });
  total += n; semParede += soltas.length;
  /* Peça mais baixa que o cartaz não é erro por si: em armário de vestiário e em
     muro de 3 m com faixa pintada no topo o teto é FÍSICO. Por isso conta, não reprova. */
  const abaixo = linhas.filter((l) => parseFloat(l.split('×')[1]) < H_CARTAZ).length;
  curtos += abaixo;
  console.log(`${id.padEnd(15)} ${String(n).padStart(3)} decalque(s) à mão | ${files.size} arquivo(s) distinto(s)`
    + (n ? ` | altura ${menor.toFixed(2)}–${maior.toFixed(2)} m | ${abaixo} abaixo dos ${H_CARTAZ} m do cartaz`
      + ` | ${soltas.length} sem parede atrás` : '')
    + ` | + ${daPassada} da passada (medidas no navegador — ver graffiti-census)`);
  soltas.forEach((l) => console.log(l));      // sempre, não só no V=1: isto é defeito
  if (VERBOSE) linhas.sort().forEach((l) => console.log(l));
}
console.log(`DECALPROBE total ${total} | abaixo do cartaz ${curtos} | SEM PAREDE ${semParede}`);
if (semParede > 0) process.exitCode = 1;
