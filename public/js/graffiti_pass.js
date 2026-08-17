/* ============================================================================
   graffiti_pass.js — PINTAR A PAREDE QUE EXISTE, NÃO A QUE ESTÁ NA PLANTA.
   ----------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE (reprovação do dono, 07/08)

   "literalmente no mapa da quebrada se tem 10-15% de arte urbana e é muito. eu
    queria algo entre 90-95% das interfaces de paredes, muros, objetos, caixas,
    obstáculos cheios de graffiti, pixos, homenagens, stencils, posters."

   E o `decal-probe` dizia 334 peças na Quebrada. As duas coisas eram verdade:

     · o probe roda em NODE, onde NENHUM GLB carrega. Sem os barracos, o
       `medirParede` mede contra a caixa procedural e aceita tudo;
     · no NAVEGADOR o barraco GLB desenha a parede fora do plano declarado, o
       `medirParede` devolve null e a peça morre em `return null` — calada.

   Mas o defeito de fundo é mais velho que isso, e é de MÉTODO: cada mapa tinha
   uma lista de coordenadas escrita à mão (`for (const z of [-34, -22, -17, …])`).
   Lista à mão tem três doenças que nenhuma delas some com mais esforço:
     1. só cobre a parede de que alguém lembrou — beco novo nasce pelado;
     2. não sabe se a peça sobreviveu: quem escreve a lista não vê o `null`;
     3. não escala. 90% de cobertura em 5 mapas são ~1.500 coordenadas na mão.

   A saída é inverter: em vez de declarar ONDE pintar, DESCOBRIR onde há parede —
   com o mesmo instrumento que a régua usa pra cobrar (`tools/eval/graffiti-census`).
   Raio que acha parede pinta parede; raio que não acha não inventa. Fachada GLB,
   muro procedural, armário, caixa e contêiner entram do mesmo jeito, porque todos
   são malha vertical no caminho do raio.

   ── COMO ACHA ONDE PINTAR ───────────────────────────────────────────────────
   Ponto de vista = WAYPOINT do mapa, não a bounding box. É por onde bot e jogador
   andam; medir da caixa premiaria empena de fundo que ninguém vê e deixaria o beco
   pelado — que é exatamente a reclamação ("vc anda pelos becos e avenidas
   principais e não tem"). De cada waypoint saem raios horizontais em 2 alturas; o
   primeiro acerto em malha VISÍVEL, OPACA e de face QUASE VERTICAL vira âncora.
   Âncoras caem numa grade de `CEL` metros (célula + octante da normal), então a
   mesma empena vista de 8 waypoints é UMA âncora, não oito.

   ── COMO DECIDE O TAMANHO ───────────────────────────────────────────────────
   Não decide: tenta. Para cada âncora percorre as alturas candidatas da banda, da
   maior pra menor, e a primeira que passar no `medirParede` (o MESMO da casa: face
   visível, nada na frente, sem degrau) é a que fica. Peça que não cabe encolhe;
   parede que não existe não recebe nada. Nunca estica — arte esticada é a primeira
   coisa que denuncia decalque no automático.

   ── SOBREPOSIÇÃO É PERMITIDA, MISTURA NÃO ───────────────────────────────────
   Muro bombardeado de verdade TEM camada: tag por cima de peça, cartaz rasgado por
   cima da tag. Por isso o teste de vaga não é "não encostar", é "não cobrir": duas
   peças podem invadir até 25% uma da outra. Acima disso vira borrão e o jogador lê
   sujeira de render, não parede pichada.

   ── POR QUE ELE JUNTA TUDO NO FIM (`_juntar`) ───────────────────────────────
   Com 90% de cobertura os 5 mapas passam de ~600 para ~2.600 peças. 2.600 Mesh são
   2.600 draw calls num jogo que roda em celular. Cada peça é um quad e todas as
   peças do MESMO arquivo dividem material, então elas viram UMA malha por arquivo
   (~60 no total). O que se perde é frustum culling por peça; o que isso custa é
   ~2 triângulos por peça fora da tela, que o clip descarta antes do fragmento.
   As réguas continuam enxergando peça a peça porque a malha junta carrega
   `userData.pecas` com o retângulo de cada uma — ver `graffiti-census.mjs`.
   ============================================================================ */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { medirParede } from './map_decals.js';
import { GRAFITE } from './graffiti_layout.js';

/* ── POR QUE A COLOCAÇÃO É ASSADA E NÃO CALCULADA NO LOAD ────────────────────
   A passada medida custou 8,9 s na Quebrada. O build INTEIRO do Piscina custa 88 ms.
   Não há micro-otimização que feche 100× de diferença: o custo é ~35.000 raycasts
   contra malha de verdade (InstancedMesh de quarteirão inclusive), a ~0,15 ms cada,
   e o número de raios é o que dá a cobertura. Baixar raio é baixar cobertura.

   Mas a colocação é FUNÇÃO PURA da geometria do mapa e da semente — ela só muda
   quando alguém edita o mapa. Então ela roda UMA vez, no `tools/gen-graffiti-layout.mjs`
   (que abre o mapa no navegador de verdade, onde os GLB existem), e o resultado é
   versionado em `public/js/graffiti_layout.js`. No jogo, `aplicarGrafite` só monta a
   geometria já resolvida: 10 ms.

   O layout guarda NOME DE ARQUIVO, nunca índice — índice desliza quando o
   `gen-graffiti-decals` renumera o pacote e o mapa passa a apontar pra arte errada
   sem erro nenhum (a lição que está no cabeçalho do map_decals.js).

   E o risco novo que isso cria — layout velho depois de mexer no mapa, com peça
   pendurada no ar — é justamente o que a `graffiti-census` mede: ela conta arte SEM
   PAREDE ATRÁS na cena real. Layout obsoleto aparece lá como número, não como
   surpresa no jogo. */

/* determinístico de ponta a ponta: o `botsim` compara corridas e um sorteio com
   Math.random faria duas corridas do MESMO commit divergirem. */
const r3 = (v) => Math.round(v * 1000) / 1000;

/* ── NORMAL DE MUNDO, INCLUSIVE EM InstancedMesh ─────────────────────────────
   `h.face.normal` vem no espaço da GEOMETRIA. Pra malha comum, `matrixWorld` basta.
   Pra InstancedMesh não: o three devolve `object = a InstancedMesh` e a matriz da
   instância fica só no `instanceId`. Aplicar só o `matrixWorld` numa instância
   girada dá uma normal torta — e os barracos da Quebrada são instanciados COM
   rotação. O efeito não era peça atravessada (o `_encaixar` atira ao longo da
   normal e reprova quando ela está errada), era peça QUE NUNCA NASCE: a fachada
   girada simplesmente não recebia tinta e virava buraco de cobertura. */
const _mi = new THREE.Matrix4();
export function normalMundo(h, out) {
  const n = (out || new THREE.Vector3()).copy(h.face.normal);
  if (h.object.isInstancedMesh && h.instanceId !== undefined) {
    h.object.getMatrixAt(h.instanceId, _mi);
    n.transformDirection(_mi);
  }
  return n.transformDirection(h.object.matrixWorld).normalize();
}

/* Esconde a peça se o PNG dela der 404. Exportado porque as vagas coladas à mão
   (porta de aço, muro do baile, armário do Piscinão) correm o MESMO risco: prod
   builda de clone puro e 197 dos 209 decalques são gitignored por procedência.
   Textura que falha no three não some — ela desenha BRANCO CHAPADO. */
export function esconderSeFaltar(mesh, tex) {
  if (!mesh || !tex) return mesh;
  if (tex.userData.faltou) mesh.visible = false;
  else {
    const antes = tex.userData.aoFaltar;
    tex.userData.aoFaltar = () => { if (antes) antes(); mesh.visible = false; };
  }
  return mesh;
}

/* ============================================================================
   grafitar — A PORTA ÚNICA QUE OS 5 MAPAS CHAMAM.
   ----------------------------------------------------------------------------
   Existe pra que a escolha "layout assado × passada viva" seja feita em UM lugar.
   Ela é feita 5 vezes se cada mapa decidir sozinho, e aí um mapa fica pra trás na
   próxima mudança — foi assim que o `decalFachada` da Quebrada virou uma regra que
   só a Quebrada tinha.

   Assado é o padrão (10 ms). Vivo só quando `window.__grafiteLive` (o
   `?grafite=vivo` do mapview, que é como o gerador colhe) ou quando o mapa ainda
   não tem layout assado — dev roda e vê arte, não parede pelada.
   ============================================================================ */
export function grafitar(cfg) {
  const { id, root, T, waypoints, bandas, murais } = cfg;
  const _t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
  const assado = GRAFITE && GRAFITE[id];
  const vivo = (typeof window !== 'undefined' && window.__grafiteLive) || !assado;
  let pass, hom;
  if (!vivo) {
    const porNome = {};
    if (murais) (murais.nomes || []).forEach((n, i) => { if (murais.texturas[i]) porNome[n] = murais.texturas[i]; });
    const r = aplicarGrafite(root, T, assado, porNome);
    pass = { pecas: r.pecas, malhas: r.malhas, assado: true };
    hom = { murais: r.murais, assado: true };
  } else {
    /* ORDEM: MURAL PRIMEIRO. Ele é a peça grande e escolhida a dedo; a tag é o
       preenchimento. Com a passada rodando antes, o mural caía por cima do que já
       estava pintado e a `graffiti-audit` acusava sobreposição de 200%+ — quad
       menor inteiro dentro do maior. Invertido, a passada recebe as vagas dos
       murais em `ocupado` e desvia. */
    hom = murais
      ? pendurarMurais(Object.assign({ root, T, waypoints, limpo: cfg.limpo, evitar: cfg.evitar }, murais))
      : { murais: 0, layout: [] };
    const vagasMural = (hom.layout || []).map(([, x, y, z, ry, w, h]) => ({ x, y, z, ry, w, h }));
    pass = pintarParedes(Object.assign({}, cfg, { ocupado: vagasMural }));
  }
  if (typeof window !== 'undefined') {
    window.__grafite = {
      pass, hom, mapa: id,
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - _t0),
    };
  }
  return { pass, hom };
}

function mix32(n) {
  let v = (n * 2654435761) >>> 0;
  v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0;
  v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}

/* Malha serve de parede pra tinta? Mesma cláusula do `map_decals._pintavel`, mais
   um filtro por NOME: vidro/água/tela já caem por `transparent`, mas placa de
   trânsito, faixa de bandeira e tela de TV são opacas e pintá-las lê como bug. */
const NAO_PINTA = new RegExp([
  'vidro|glass|window|janela',            // vidro: cartaz em vidro foi a reclamação nº 1
  'agua|water|pool_water',
  'flag|bandeira|placa_|sign|tela|screen|led|farol|light|lamp',
  'decal:|mural:|faixa:|sky|ceu',
  /* ── LONA NÃO É PAREDE (07/08, os 12 prints do dono) ──────────────────────────
     "alguns estão renderizados no ar, e não em prédios de verdade". Medido na
     Quebrada: 15 peças na tenda de cúpula, 3 no guarda-sol do boteco, 3 na
     arquibancada e 1 na barraca de feira. Todas passavam no `_encaixar` — a face de
     um toldo É plana e sólida — e todas leem como pintura pairando, porque abaixo
     delas não há prédio. A regra do chão (`_temChao`) pega o caso geral; esta lista
     pega o caso em que a lona VAI até o chão e mesmo assim ninguém picharia. */
  'tent|tenda|barraca|umbrella|guarda_sol|sombrinha',
  'stall|banca|toldo|awning|canopy|marquise|lona|tarp',
  'arquibancada|bleacher|palco|stage',
  /* platibanda de laje e guarda de tábua (lajes, 14/08): a peça nessa faixa estreita
     fica recortada contra o céu e lê como tinta no ar cortando o vão — o dono mediu
     nos prints. Pinta-se o corpo da parede, não a borda do telhado. */
  'platibanda|guarda_tabua',
].join('|'), 'i');

function _pintavel(o) {
  if (!o.isMesh || !o.visible || !o.material || !o.geometry) return false;
  /* Testa a CADEIA de nomes, não só o da malha: num GLB do Tripo a malha se chama
     `tripo_node_<uuid>` e quem carrega `Weathered_Green_Dome_Tent` é o grupo pai.
     Testando só `o.name`, metade da lista de exclusão nunca casaria. */
  if (NAO_PINTA.test(_cadeia(o))) return false;
  const teste = (m) => m && m.visible !== false
    && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9));
  return Array.isArray(o.material) ? o.material.some(teste) : teste(o.material);
}

/* TUDO QUE O JOGADOR VÊ, opaco, inclusive o que não se pinta. É a lista da pergunta
   INVERTIDA ("o que está na frente do plano?"): porta orgulhosa, marquise, letreiro
   e pele de fachada saem de `alvos` pelo nome (`NAO_PINTA`), então a sonda de trás
   as atravessa e a peça nascia atrás delas — desenhada e invisível (a "tapada" da
   graffiti-audit). O predicado é o MESMO dos `opacos` da régua. */
function _oclusores(root) {
  const out = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.material || !o.geometry) return;
    const n = String(o.name);
    if (n.startsWith('decal:') || n.startsWith('mural:')) return;
    let vis = true;
    o.traverseAncestors((a) => { if (!a.visible) vis = false; });
    if (!vis) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9))) out.push(o);
  });
  return out;
}

/* ============================================================================
   pintarParedes — a passada. Devolve o relatório (quantas âncoras, quantas peças).

   root       Object3D do mapa JÁ MONTADO (com os GLB dentro — a passada tem que
              rodar DEPOIS dos props, senão ela não vê fachada nenhuma).
   T          textures.js
   waypoints  [{x,z}] — de onde o jogador olha. Sem isso a passada não roda: pintar
              sem ponto de vista é voltar a pintar a planta.
   bandas     [{ y0, y1, pool, alturas }] — faixa de altura → pool de arquivos.
   alcance    até onde o raio procura parede (m). 7 é a distância de leitura de um
              beco; acima disso a peça fica pequena demais na tela pra valer.
   passo      lado da célula de âncora (m). Menor = mais peça, mais denso.
   ============================================================================ */
export function pintarParedes(opts) {
  const {
    root, T, waypoints, bandas,
    alcance = 7, passo = 2.2, raios = 16, cobre = 0.25,
    excluir = null, limpo = null, evitar = null, seed = 1, maxLarg = 5.2, minLarg = 0.45,
    exigeChao = true, ocupado = null, olhos = null,
  } = opts;
  /* ZONA LIMPA — parede que o dono quer SEM tinta, declarada em coordenada.
     Nasceu da Loja H (07/08): "pode tirar os graffitis de dentro da loja, pode deixar
     só na parte de fora que ficou boa". 74% das peças do mapa estavam lá dentro.
     Ela é declarada UMA vez, no `grafitar` do mapa, e viaja no layout assado — a
     `graffiti-census` lê de lá pra não cobrar tinta de parede que ninguém quer
     pintada. Duas listas separadas (uma no mapa, outra na régua) virariam duas
     verdades sobre a mesma decisão, e a régua acusaria dívida eterna. */
  const _naZona = (x, z) => !!limpo && limpo.some((b) =>
    x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
  /* SUPERFÍCIE QUE NÃO SE PICHA — por tipo, não por lugar (Ferro Velho, 07/08:
     "não faz sentido grafite nos carros e na grama, só nas paredes em volta e no
     escritório"). A zona limpa resolve "aqui não"; isto resolve "nisto não", que é
     outra pergunta: a lataria empilhada está NO MEIO do pátio que deve ser pichado.
     O teste é na CADEIA de nomes (malha + ancestrais) porque a malha de um GLB se
     chama `tripo_node_<uuid>` e quem carrega o nome do prop é o grupo pai. */
  if (!root || !T || !T.decals || !T.decalAspects || !waypoints || !waypoints.length) {
    return { ancoras: 0, pecas: 0 };
  }

  const _t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
  root.updateMatrixWorld(true);
  const alvos = [];
  root.traverse((o) => { if (_pintavel(o)) alvos.push(o); });
  if (!alvos.length) return { ancoras: 0, pecas: 0 };

  /* ── 1. ÂNCORAS ───────────────────────────────────────────────────────────
     Duas alturas de olho e não uma: a 1,55 m o raio acha o muro e o armário; a
     3,10 m ele acha a empena ACIMA do armário, que da altura do olho está tapada
     e é justamente a parte alta que ficava pelada. `olhos` no cfg adiciona faixas
     (a Loja H precisa de 5,25 m pra cornija da fachada virar âncora). */
  const OLHOS = olhos || [1.55, 3.1];
  const rc = new THREE.Raycaster(); rc.far = alcance;
  const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  const ancoras = new Map();
  /* Grade GROSSA pros raios de descoberta: eles vão até `alcance` (8 m), e as
     células de 12 m ± 1 cobrem no mínimo 12 m em torno de qualquer ponto da célula
     do meio — então nenhum acerto possível fica de fora. Continua sendo prefiltro
     exato, não amostragem. */
  const longe = _grade(alvos, Math.max(12, Math.ceil(alcance * 1.5)));
  for (const wp of waypoints) {
    const vizWp = longe(wp.x, wp.z);
    for (const eye of OLHOS) {
      for (let a = 0; a < raios; a++) {
        const ang = (a / raios) * Math.PI * 2 + (mix32(a * 7 + seed) % 100) / 3000;
        rc.set(o3.set(wp.x, (wp.y || 0) + eye, wp.z),
          d3.set(Math.sin(ang), 0, Math.cos(ang)).normalize());
        const hits = rc.intersectObjects(vizWp, false);
        let h = null;
        for (const x of hits) if (x.distance > 0.35) { h = x; break; }
        if (!h || !h.face) continue;
        const nw = normalMundo(h);
        if (Math.abs(nw.y) > 0.4) continue;                 // chão, telhado, laje: não é parede
        if (nw.dot(d3) > 0) nw.negate();                    // a face que o jogador vê
        const ry = Math.atan2(nw.x, nw.z);
        const k = `${Math.round(h.point.x / passo)}|${Math.round(h.point.z / passo)}|`
          + `${Math.round(ry / (Math.PI / 4))}`;
        if (ancoras.has(k)) continue;
        if (_naZona(h.point.x, h.point.z)) continue;
        if (evitar && evitar.test(_cadeia(h.object))) continue;
        if (excluir && excluir(h.point.x, h.point.y, h.point.z, nw, h.object)) continue;
        ancoras.set(k, { x: h.point.x, z: h.point.z, ry, teto: 0, olho: h.point.y, quem: _cadeia(h.object) });
      }
    }
  }

  /* ── 1b. ATÉ ONDE A PAREDE SOBE ───────────────────────────────────────────
     Os raios da descoberta são HORIZONTAIS, então `h.point.y` é a altura do olho,
     não a da parede — usar aquilo como teto punha peça alta em muro de 2 m e a
     peça flutuava acima do muro (era o defeito que o `decalFachada` da Quebrada
     resolvia na mão, lote a lote). Aqui a pergunta é feita direto: de 0,6 m à
     frente da face, um raio por degrau de altura; o último que ainda bate na MESMA
     parede (±0,4 m de profundidade) é o topo. */
  const _ms = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const tempo = { descobrir: Math.round(_ms() - _t0), teto: 0, pintar: 0, juntar: 0 };
  let _t = _ms();
  /* Grade FINA (3 m) pro encaixe: os raios dele têm 0,85 m, então 3 células de 3 m
     já sobram. Célula menor = lista menor por consulta = o `pintar` sai de 10,4 s. */
  const perto = _grade(alvos, 3);
  const pertoFrente = _grade(_oclusores(root), 3);
  for (const A of ancoras.values()) A.teto = _alturaParede(perto(A.x, A.z), rc, A);
  tempo.teto = Math.round(_ms() - _t); _t = _ms();
  // Caixa/dumpster não é parede: exige _alturaParede ≥ 1,8 m (pessoa em pé; crate ~1,2 m, muro ≥ 2 m — medido por _alturaParede).
  // Reproduz: eval:grafite (conta peças antes/depois do corte).
  const MIN_ALT_PAREDE = 1.8;
  for (const [k, A] of ancoras) if ((A.teto || 0) < MIN_ALT_PAREDE) ancoras.delete(k);
  const _dbg = (typeof window !== 'undefined' && window.__grafiteDebug)
    ? [...ancoras.values()]
      .map((A) => ({ x: +A.x.toFixed(2), z: +A.z.toFixed(2), teto: +A.teto.toFixed(2), quem: A.quem.slice(0, 40) }))
    : null;

  /* ── 2. PINTAR ────────────────────────────────────────────────────────────
     Ordem determinística por hash da célula (não pela ordem de descoberta, que
     depende da ordem dos waypoints e mudaria a arte a cada mexida no grafo). */
  const lista = [...ancoras.entries()].sort((A, B) => mix32(_h(A[0]) + seed) - mix32(_h(B[0]) + seed));
  /* Vagas JÁ OCUPADAS entram na lista antes da primeira peça. Sem isto o mural de
     homenagem — que é a peça grande, a que o olho procura — nascia por baixo de tag
     e cartaz: a `graffiti-audit` mediu 1.152 sobreposições na Quebrada, três delas
     com o quad menor INTEIRO dentro do maior (223%, 212%, 211%). A ordem certa é o
     mural primeiro e a passada depois, desviando dele. */
  const postas = (ocupado || []).map((p) => ({
    x: p.x, y: p.y, z: p.z, ry: p.ry, hw: p.w / 2, hh: p.h / 2, i: -1, semente: true,
  }));
  /* ── O QUE JÁ ESTÁ NA PAREDE TAMBÉM É VAGA OCUPADA ──────────────────────────
     Os 5 mapas colam decalques À MÃO antes desta passada rodar (porta de aço, muro
     do baile, parede de armários do Piscinão). A passada não sabia deles, e o
     resultado saiu na `graffiti-audit`: 274 sobreposições no Piscina, 107 na Loja H
     — a passada pintando por cima da vaga escolhida a dedo, que é justamente a que
     não deveria ser coberta.
     Varrer o `root` aqui resolve pros cinco de uma vez, sem fiação por mapa: quem
     colar peça nova antes do `grafitar` fica protegido automaticamente. */
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = String(o.name);
    if (!n.startsWith('decal:') && !n.startsWith('mural:') && !n.startsWith('faixa:')) return;
    const g = o.geometry && o.geometry.parameters;
    if (!g || !g.width) return;                       // malha junta de outra passada
    o.updateMatrixWorld(true);
    const pos = o.getWorldPosition(new THREE.Vector3());
    postas.push({
      x: pos.x, y: pos.y, z: pos.z, ry: o.rotation.y,
      hw: g.width / 2, hh: g.height / 2, i: -1, semente: true,
    });
  });
  const porArquivo = new Map();                             // i -> [geometrias]
  let n = 0;
  /* CONTADOR DE RECUSA. Cobertura baixa tem 5 causas possíveis e elas pedem
     correções OPOSTAS (banda errada × parede lombada × peça grande demais). Sem
     separar, "43% e não sei por quê" vira tentativa e erro. Sai no relatório. */
  const rec = { semTeto: 0, sorteio: 0, curta: 0, semParede: 0, cobria: 0, noAr: 0, vazia: 0 };
  const vazias = [];

  for (const [, A] of lista) {
    const antes = n;
    const amostra = _amostrador(perto(A.x, A.z), rc, A, pertoFrente(A.x, A.z));
    for (const B of bandas) {
      if (!B.pool || !B.pool.length) continue;
      // a banda só existe se o raio ACHOU parede na altura dela: âncora de muro de
      // 2 m não recebe a banda alta (a peça sairia flutuando acima do muro)
      const yc0 = (B.y0 + B.y1) / 2;
      if (B.exigeAltura !== false && A.teto < B.y0 - 0.25) { rec.semTeto++; continue; }
      const k = mix32(Math.round(A.x * 13) + Math.round(A.z * 71) * 131 + B.y0 * 977 + seed);
      if ((k % 100) >= (B.chance === undefined ? 100 : B.chance)) { rec.sorteio++; continue; }

      let posta = false;
      for (const alt of B.alturas) {
        if (alt > B.y1 - B.y0 + 0.6) continue;
        const i = _escolher(B.pool, k, A.x, A.z, postas, T);
        /* CARTAZ É OUTRA FONTE. `T.posterImgs` é a coleção do dono (lambe-lambe de
           verdade, JPG opaco) e vive num array separado de `T.decals`. Sem isto ela
           só existia em 2 dos 5 mapas — reprovação: "tem diversos posters da minha
           coleção e tb que vc gerou que não estão em nenhum mapa". */
        const cartaz = B.fonte === 'poster';
        const asp = (cartaz ? T.posterAspects[i] : T.decalAspects[i]) || 1;
        let h = alt, w = alt * asp;
        const teto = Math.min(maxLarg, B.larg || maxLarg);
        if (w > teto) { w = teto; h = teto / asp; }         // encolhe inteiro, nunca estica
        if (w < minLarg || h < 0.3) { rec.curta++; continue; }
        const yc = Math.min(yc0, A.teto - h / 2 - 0.05);
        if (yc - h / 2 < B.y0 - 0.35) { rec.curta++; continue; }
        /* DESLIZAR ANTES DE DESISTIR. A âncora cai numa grade de `passo` metros, então
           ela pode nascer na última mão de parede antes do vão entre dois barracos —
           e aí duas das cinco amostras furam e a peça é reprovada com a parede inteira
           livre 40 cm ao lado. Medido: 133 placas de parede REAL continuavam peladas
           por isso, e são elas que seguravam a cobertura em 78,7%. O deslize testa o
           mesmo tamanho meio metro pra cada lado; o cache de amostra faz isso custar
           quase nada. */
        let recuo = null, du = 0;
        for (const d of [0, -0.5, 0.5, -1.0, 1.0]) {
          recuo = _encaixar(null, rc, A, yc, w, h, amostra, d, B.planura);
          if (recuo !== null) { du = d; break; }
        }
        if (recuo === null) { rec.semParede++; continue; }
        const ax = A.x + Math.cos(A.ry) * du, az = A.z - Math.sin(A.ry) * du;
        const px = ax - Math.sin(A.ry) * recuo, pz = az - Math.cos(A.ry) * recuo;
        if (_cobreDemais(postas, px, yc, pz, A.ry, w, h, cobre)) { rec.cobria++; continue; }
        if (exigeChao && B.exigeChao !== false && !_temChao(amostra, du, w, yc - h / 2)) { rec.noAr++; continue; }
        postas.push({ i, cartaz, x: px, y: yc, z: pz, ry: A.ry, hw: w / 2, hh: h / 2, quem: A.quem });
        const g = new THREE.PlaneGeometry(w, h);
        g.rotateY(A.ry); g.translate(px, yc, pz);
        const chave = (cartaz ? 'p' : 'd') + i;
        if (!porArquivo.has(chave)) porArquivo.set(chave, []);
        porArquivo.get(chave).push(g);
        n++; posta = true; break;
      }
      if (posta && B.exclusiva) break;
    }
    if (n === antes) {                 // âncora que não recebeu NADA: é a que faz o buraco
      rec.vazia++;
      if (vazias.length < 40) vazias.push([r3(A.x), r3(A.z), r3(A.ry), r3(A.teto)]);
    }
  }

  tempo.pintar = Math.round(_ms() - _t); _t = _ms();
  const meshes = _juntar(porArquivo, T, root, postas.filter((p) => !p.semente));
  tempo.juntar = Math.round(_ms() - _t);
  /* `layout` é o que o `gen-graffiti-layout` assa. Arredondado a 3 casas: o layout
     de 5 mapas passa de 900 KB pra ~200 KB e 1 mm não move peça nenhuma. */
  const arquivos = [], mapa = new Map();
  /* SEMENTE FORA. As vagas de mural entram em `postas` só para a passada desviar
     delas; elas já foram desenhadas por `pendurarMurais` e não têm arquivo de
     decalque. Sem este filtro, `T.decalFiles[-1]` vira `undefined`, o JSON grava
     `null` em `arquivos`, e o `aplicarGrafite` do próximo carregamento estoura em
     `nome.startsWith` — que foi exatamente o que aconteceu. */
  const pecas = postas.filter((p) => !p.semente).map((p) => {
    const f = p.cartaz ? ('poster:' + ((T.posterFiles || [])[p.i] || p.i))
      : (T.decalFiles ? T.decalFiles[p.i] : String(p.i));
    let a = mapa.get(f);
    if (a === undefined) { a = arquivos.length; arquivos.push(f); mapa.set(f, a); }
    return [a, r3(p.x), r3(p.y), r3(p.z), r3(p.ry), r3(p.hw * 2), r3(p.hh * 2)];
  });
  return {
    ancoras: ancoras.size, pecas: n, malhas: meshes, recusa: rec, tempo,
    alvos: alvos.length, layout: { arquivos, pecas, limpo: limpo || undefined },
    /* EM QUE SUPERFÍCIE A TINTA CAIU. Diagnóstico, não decoração: o dono reprovou
       "peça no ar" e a regra de chão só pegou 26 de 1.547 — sem saber o NOME do que
       está recebendo tinta não dá pra distinguir "toldo de barraca" de "empena". */
    superficies: Object.entries(postas.reduce((a, p) => {
      const k = (String(p.quem || '').match(/[A-Za-z_]{4,}/g) || ['?']).slice(0, 2).join('/');
      a[k] = (a[k] || 0) + 1; return a;
    }, {})).sort((x, y) => y[1] - x[1]).slice(0, 18), vazias,
    ...(_dbg ? { ancDetalhe: _dbg } : {}),
  };
}

/* ============================================================================
   aplicarGrafite — MONTAR O LAYOUT JÁ RESOLVIDO (o caminho do jogo).
   ----------------------------------------------------------------------------
   `layout` = { arquivos: ['tag-flop.png', …], pecas: [[a, x, y, z, ry, w, h], …],
                murais:  [['homenagem-chorao', x, y, z, ry, w, h], …] }
   `a` indexa `arquivos`, que são NOMES — o índice do pacote de decalques não entra
   aqui justamente porque ele desliza (map_decals.js, cabeçalho).
   Devolve o mesmo relatório da passada viva, pra régua não precisar saber qual dos
   dois caminhos rodou.
   ============================================================================ */
export function aplicarGrafite(root, T, layout, muraisTex) {
  if (!root || !T || !layout || !T.decalFiles) return { pecas: 0, murais: 0 };
  const idx = new Map(), idxP = new Map();
  T.decalFiles.forEach((f, i) => idx.set(f, i));
  (T.posterFiles || []).forEach((f, i) => idxP.set(f, i));
  const porArquivo = new Map(), postas = [];
  for (const [a, x, y, z, ry, w, h] of (layout.pecas || [])) {
    const nome = layout.arquivos[a];
    /* Nome ausente = layout corrompido (aconteceu: uma semente de mural entrou na
       lista de peças com índice -1 e virou `null` no JSON). Um mapa inteiro não pode
       cair por causa de uma entrada ruim — pula, avisa alto, e o resto do grafite
       aparece. Silêncio aqui seria pior; queda também. */
    if (typeof nome !== 'string') {
      console.warn('[grafite] entrada', a, 'do layout sem nome de arquivo — regere com `npm run grafite`');
      continue;
    }
    // `poster:` no nome = veio da coleção do dono, não do pacote de decalques
    const cartaz = nome.startsWith('poster:');
    const i = cartaz ? idxP.get(nome.slice(7)) : idx.get(nome);
    if (i === undefined) { console.warn('[grafite] layout cita "' + nome + '", que saiu do pacote'); continue; }
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(ry); g.translate(x, y, z);
    const chave = (cartaz ? 'p' : 'd') + i;
    if (!porArquivo.has(chave)) porArquivo.set(chave, []);
    porArquivo.get(chave).push(g);
    postas.push({ x, y, z, ry, hw: w / 2, hh: h / 2, f: nome });
  }
  const malhas = _juntar(porArquivo, T, root, postas);

  let murais = 0;
  for (const [nome, x, y, z, ry, w, h] of (layout.murais || [])) {
    const t = muraisTex && muraisTex[nome];
    if (!t) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({
      map: t, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
    }));
    m.position.set(x, y, z); m.rotation.y = ry;
    m.renderOrder = 2; m.receiveShadow = true;
    m.name = 'mural:' + nome;
    root.add(m);
    murais++;
  }
  return { pecas: postas.length, malhas, murais, assado: true };
}

/* ── A PAREDE TEM QUE CHEGAR AO CHÃO ─────────────────────────────────────────
   Reprovação do dono (07/08, com 12 prints): "ficou muito bom, mas alguns estão
   renderizados no ar, e não em prédios de verdade; eu sei que muitos modelos GLB
   têm a área quadrada, mas visualmente fica ruim".

   Ele descreveu a causa junto: o `_encaixar` só pergunta "tem superfície plana ATRÁS
   deste quad?". Toldo, lona, marquise, laje de arquibancada e a face lisa da caixa
   de um GLB respondem SIM — são superfície plana de verdade. Só que abaixo delas não
   há prédio nenhum, e o jogador lê uma pintura pairando.

   A pergunta que faltava é vertical: DESCE ATÉ O CHÃO? Da base da peça pra baixo, de
   45 em 45 cm, o mesmo amostrador confere se ainda há superfície na mesma faixa de
   profundidade. Três colunas, e bastam 2 chegarem — porta e janela abrem vão legítimo
   embaixo de muro pichado, e reprovar por causa de uma porta seria trocar um defeito
   por outro. Custa quase nada: o amostrador é cacheado por âncora.

   `exigeChao: false` (global ou por banda) é pra pele suspensa que o mapa QUEIRA
   pichada — a fachada greco-romana da Loja H (banner e cornija têm ar embaixo por
   construção). A régua irmã (`graffiti-audit`) continua cobrando parede atrás. */
function _temChao(amostra, du, w, yBase) {
  if (yBase <= 0.9) return true;                 // já nasce rente ao chão
  let colunas = 0;
  for (const su of [-0.35, 0, 0.35]) {
    let desce = true;
    for (let y = yBase - 0.45; y >= 0.45; y -= 0.45) {
      if (amostra(du + su * w, y) === null) { desce = false; break; }
    }
    if (desce) colunas++;
  }
  return colunas >= 2;
}

/* Nome da malha + o de todos os ancestrais, colado. É onde mora o id do prop:
   `placeProp('junk_car')` devolve um grupo com esse nome e a malha dentro dele se
   chama `tripo_node_<uuid>`, que não diz nada. */
function _cadeia(o) {
  let n = String(o.name || '');
  for (let p = o.parent; p; p = p.parent) n += '/' + String(p.name || '');
  return n;
}

function _h(s) { let v = 0; for (let i = 0; i < s.length; i++) v = (v * 31 + s.charCodeAt(i)) | 0; return v >>> 0; }

/* ── GRADE ESPACIAL: DE 45 s DE BUILD PARA 3 s ───────────────────────────────
   A 1ª versão media 45,6 s só de passada na Quebrada — carregamento de mapa, não
   ferramenta offline. A conta explica: ~9.000 tentativas de encaixe × 9 raios cada,
   e CADA raio testava a lista inteira de malhas pintáveis do mapa (centenas, várias
   delas InstancedMesh de quarteirão). 81.000 varreduras da cena.

   Os raios de encaixe são CURTOS (≤ 0,9 m): a única malha que eles podem acertar
   está a menos de um metro da âncora. Então a lista completa é desperdício puro.
   Esta grade indexa cada malha pelas células de 6 m que a caixa dela cruza, e o
   encaixe só testa as 9 células ao redor. O resultado é o mesmo — é prefiltro
   geométrico, não aproximação: malha fora do raio de 1 m não tinha como ser
   acertada mesmo. */
/* Exportada porque a `graffiti-audit` faz a MESMA conta ao contrário (para cada
   peça, o que há atrás dela) e tropeçou no mesmo custo: 48 mil raycasts contra a
   lista inteira de malhas. Duplicar o prefiltro daria duas versões da mesma
   geometria discordando por bug de cópia. */
export function gradeEspacial(alvos, cel = 6) { return _grade(alvos, cel); }

function _grade(alvos, cel = 6) {
  const g = new Map(), bb = new THREE.Box3(), cache = new Map();
  for (const o of alvos) {
    bb.setFromObject(o);
    if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) continue;
    const x0 = Math.floor(bb.min.x / cel), x1 = Math.floor(bb.max.x / cel);
    const z0 = Math.floor(bb.min.z / cel), z1 = Math.floor(bb.max.z / cel);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) continue;      // malha de mapa inteiro: fica de fora do índice
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const k = x + ',' + z;
        let l = g.get(k); if (!l) { l = []; g.set(k, l); }
        l.push(o);
      }
    }
  }
  return (x, z) => {
    const cx = Math.floor(x / cel), cz = Math.floor(z / cel), k = cx + ',' + cz;
    let out = cache.get(k);
    if (out) return out;
    const s = new Set();
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = g.get((cx + a) + ',' + (cz + b));
      if (l) for (const o of l) s.add(o);
    }
    out = [...s]; cache.set(k, out);
    return out;
  };
}

/* ============================================================================
   pendurarMurais — AS HOMENAGENS, GRANDES, NA MELHOR PAREDE QUE O MAPA TIVER.
   ----------------------------------------------------------------------------
   Reprovação do dono (07/08): "as homenagens aos outros artistas ficaram muito
   pequenas e só no mapa piscina".

   As duas coisas tinham a mesma causa. Elas existiam de dois jeitos:
     · como DECALQUE (`or-hom-*.png`) dentro do pool de bomba — ou seja, do tamanho
       de uma tag e sorteadas contra 15 outras artes. Homenagem que sai 1,1 m no
       meio de um muro não é homenagem, é adesivo;
     · como MURAL de vaga fixa (`or-mural-*.jpg`) só na Quebrada, em 8 coordenadas
       escritas à mão que o `medirParede` reprovava quase todas no navegador.

   Aqui elas viram peça de primeira classe: tamanho de mural (5,4 × 2,8 m, contra
   os 3,9 × 2,0 de antes), textura FIXA por artista (nada de sorteio — homenagem
   não rotaciona), e a vaga é ESCOLHIDA POR MEDIÇÃO: a passada mede largura e
   altura livres de cada âncora e fica com as maiores, separadas entre si, pra
   caírem em regiões diferentes do mapa. Mapa que não tiver parede grande recebe
   as que couberem, e isso aparece no relatório em vez de sumir.
   ============================================================================ */
export function pendurarMurais(opts) {
  const {
    root, T, waypoints, texturas, nomes = [], alcance = 9, passo = 3.0,
    larg = 5.4, alt = 2.8, minLarg = 3.0, separacao = 14, seed = 7, excluir = null, limpo = null,
    evitar = null,
  } = opts;
  const _naZona = (x, z) => !!limpo && limpo.some((b) =>
    x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
  /* SUPERFÍCIE QUE NÃO SE PICHA — por tipo, não por lugar (Ferro Velho, 07/08:
     "não faz sentido grafite nos carros e na grama, só nas paredes em volta e no
     escritório"). A zona limpa resolve "aqui não"; isto resolve "nisto não", que é
     outra pergunta: a lataria empilhada está NO MEIO do pátio que deve ser pichado.
     O teste é na CADEIA de nomes (malha + ancestrais) porque a malha de um GLB se
     chama `tripo_node_<uuid>` e quem carrega o nome do prop é o grupo pai. */
  if (!root || !texturas || !texturas.length || !waypoints || !waypoints.length) return { murais: 0 };

  root.updateMatrixWorld(true);
  const alvos = [];
  root.traverse((o) => { if (_pintavel(o)) alvos.push(o); });
  if (!alvos.length) return { murais: 0 };

  const rc = new THREE.Raycaster(); rc.far = alcance;
  const o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  const cand = new Map();
  const longe = _grade(alvos, Math.max(12, Math.ceil(alcance * 1.5)));
  for (const wp of waypoints) {
    const vizWp = longe(wp.x, wp.z);
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      rc.far = alcance;
      rc.set(o3.set(wp.x, (wp.y || 0) + 1.8, wp.z), d3.set(Math.sin(ang), 0, Math.cos(ang)).normalize());
      let h = null;
      for (const x of rc.intersectObjects(vizWp, false)) if (x.distance > 1.2) { h = x; break; }
      if (!h || !h.face) continue;
      const nw = normalMundo(h);
      if (Math.abs(nw.y) > 0.4) continue;
      if (nw.dot(d3) > 0) nw.negate();
      const ry = Math.atan2(nw.x, nw.z);
      const k = `${Math.round(h.point.x / passo)}|${Math.round(h.point.z / passo)}|${Math.round(ry / (Math.PI / 4))}`;
      if (cand.has(k)) continue;
      if (_naZona(h.point.x, h.point.z)) continue;
      if (evitar && evitar.test(_cadeia(h.object))) continue;
      if (excluir && excluir(h.point.x, h.point.y, h.point.z, nw, h.object)) continue;
      cand.set(k, { x: h.point.x, z: h.point.z, ry });
    }
  }

  /* MEDIR CADA VAGA. Quem escolhe é a parede: `_alturaParede` diz até onde ela sobe
     e `_larguraParede` até onde ela corre sem degrau. Nota = área livre; empate
     desempata pelo hash, pra ficar determinístico. */
  const perto = _grade(alvos);
  const pertoFrente = _grade(_oclusores(root), 3);
  const notas = [];
  for (const A of cand.values()) {
    const viz = perto(A.x, A.z);
    const hP = _alturaParede(viz, rc, A);
    if (hP < alt + 0.5) continue;
    const wP = _larguraParede(viz, rc, A, Math.max(1.6, Math.min(hP - 0.6, alt)) / 2 + 0.4);
    if (wP < minLarg) continue;
    notas.push({ A, hP, wP, nota: Math.min(wP, larg + 2) * Math.min(hP, alt + 2) });
  }
  notas.sort((a, b) => (b.nota - a.nota) || (mix32(Math.round(a.A.x * 7) + seed) - mix32(Math.round(b.A.x * 7) + seed)));

  const postas = [], feitos = [];
  for (const c of notas) {
    if (feitos.length >= texturas.length) break;
    if (postas.some((p) => Math.hypot(p.x - c.A.x, p.z - c.A.z) < separacao)) continue;
    const w = Math.min(larg, c.wP - 0.5), h = Math.min(alt, w * alt / larg, c.hP - 0.7);
    if (w < minLarg || h < 1.4) continue;
    const yc = Math.min(1.15 + h / 2, c.hP - h / 2 - 0.35);
    /* Mural pairando é pior que tag pairando — ele é grande e o olho vai nele. Mesma
       regra de chão da passada (ver `_temChao`). */
    const am = _amostrador(perto(c.A.x, c.A.z), rc, c.A, pertoFrente(c.A.x, c.A.z));
    const rec = _encaixar(null, rc, c.A, yc, w, h, am);
    if (rec === null) continue;
    if (!_temChao(am, 0, w, yc - h / 2)) continue;
    const px = c.A.x - Math.sin(c.A.ry) * rec, pz = c.A.z - Math.cos(c.A.ry) * rec;
    const i = feitos.length;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({
      map: texturas[i], polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
    }));
    mesh.position.set(px, yc, pz); mesh.rotation.y = c.A.ry;
    mesh.renderOrder = 2; mesh.receiveShadow = true;
    mesh.name = 'mural:' + (nomes[i] || ('homenagem-' + i));
    root.add(mesh);
    postas.push({ x: px, z: pz });
    feitos.push([nomes[i] || ('homenagem-' + i), r3(px), r3(yc), r3(pz), r3(c.A.ry), r3(w), r3(h)]);
  }
  return { murais: feitos.length, vagas: notas.length, layout: feitos };
}

/* ── CABE AQUI? ──────────────────────────────────────────────────────────────
   Por que NÃO é o `medirParede` do map_decals.js, que é o critério da casa:

   Ele foi escrito pra vaga DECLARADA — uma coordenada da planta, que pode estar
   longe da parede desenhada. Por isso ele nasce o raio 1,5 m À FRENTE do plano
   nominal e varre 2,7 m pra achar a face. Aqui isso faz duas coisas erradas:

   1. NO BECO ELE MEDE A PAREDE DE TRÁS. As vielas da Quebrada têm 1,3 m de vão
      (medido, ver map_quebrada §murais). Um raio que começa 1,5 m à frente da face
      já nasce DO OUTRO LADO do beco: ele atravessa a parede oposta, e a primeira
      coisa que acerta é ela. Foi a recusa nº 1 medida — 3.009 de 5.400 tentativas,
      e concentradas exatamente onde o dono disse que faltava arte ("vc anda pelos
      becos e não tem").
   2. AQUI A VAGA NÃO É DECLARADA, É MEDIDA. A âncora saiu de um raycast: o ponto
      JÁ ESTÁ na superfície. Procurar a face 1,5 m antes dela é refazer, pior, um
      trabalho que já está feito.

   Então este teste só confirma o que a âncora promete: as MESMAS 15 amostras da
   `graffiti-audit` no quad (5 × 3), raio nascendo 0,30 m à frente (menos que meio
   beco), profundidade medida em relação ao plano da âncora. Aceita se ≥ 13 das 15
   acharem parede — vão de porta e caixilho de janela abrem buraco legítimo no meio
   de um muro pichado — e se a variação de profundidade for ≤ `planura`, que é o que
   separa uma parede de duas. E pergunta o que está NA FRENTE: qualquer amostra com
   superfície opaca orgulhosa do plano reprova (a "tapada" da régua — porta,
   marquise, letreiro, pele de fachada, todas invisíveis pra sonda de trás porque
   saem de `alvos` pelo nome). Devolve o recuo (3 cm à frente da face mais
   orgulhosa), igual o `medirParede`. */
const _ea = new THREE.Vector3(), _ed = new THREE.Vector3();

/* As 15 posições de amostra do quad — as MESMAS da `graffiti-audit`, com a mesma
   folga (2 vazias de 15). Antes a passada amostrava 9 pontos em posições próprias:
   aprovava o que a régua reprovava, e o "no ar" não descia depois de consertos que
   deveriam tê-lo derrubado. Duas réguas com pontos e limiares diferentes medindo a
   mesma coisa é o instrumento discordando de si mesmo. */
const AMOSTRAS_15 = [];
for (const _su of [-0.45, -0.22, 0, 0.22, 0.45]) {
  for (const _sv of [-0.4, 0, 0.4]) AMOSTRAS_15.push([_su, _sv]);
}

/* CACHE DE AMOSTRA POR ÂNCORA. A mesma âncora é testada até 12 vezes (4 bandas × 3
   tamanhos), e as quinas de um quad de 2,0 m caem quase em cima das de um de 1,5 m.
   A chave é o ponto EXATO: qualquer arredondamento desloca a amostra da posição que
   a `graffiti-audit` mede, e a passada aprova o que a régua reprova — a 1/4 de
   metro colapsava as 5 colunas da grade em 3 para peça miúda, e a 1/16 ainda
   deixou ~60 peças residuais de vão 0,2 (13/08, medido nos 10 mapas). */
function _amostrador(alvos, rc, A, frente) {
  const nx = Math.sin(A.ry), nz = Math.cos(A.ry);
  const ux = Math.cos(A.ry), uz = -Math.sin(A.ry);
  const FRENTE = 0.30, cache = new Map();
  const amostra = (u, v) => {
    const k = u + ':' + v;
    if (cache.has(k)) return cache.get(k);
    rc.far = FRENTE + 0.55;
    rc.set(_ea.set(A.x + ux * u + nx * FRENTE, v, A.z + uz * u + nz * FRENTE),
      _ed.set(-nx, 0, -nz).normalize());
    let d = null;
    for (const x of rc.intersectObjects(alvos, false)) if (x.distance > 1e-3) { d = x.distance - FRENTE; break; }
    cache.set(k, d);
    return d;
  };
  /* SONDA DO LADO DE CÁ: o primeiro oclusor opaco À FRENTE DA PEÇA — não da âncora.
     A peça pode nascer RECUADA do plano da âncora (parede em reentrância), e um
     raio ancorado no plano não enxerga o que ficou entre os dois (medido 13/08 no
     Ferro Velho: oclusor 4,6 cm à frente da peça, invisível da âncora). Mesmo raio
     da régua: de 2 cm à frente da peça, 0,25 m para fora. Sem cache — o recuo muda
     a cada tentativa. */
  amostra.frente = !frente ? null : (u, v, recuo) => {
    rc.far = 0.25;
    rc.set(_ea.set(A.x + ux * u + nx * (0.02 - recuo), v, A.z + uz * u + nz * (0.02 - recuo)),
      _ed.set(nx, 0, nz).normalize());
    for (const x of rc.intersectObjects(frente, false)) if (x.distance > 1e-3) return x.distance;
    return null;
  };
  return amostra;
}

function _encaixar(alvos, rc, A, yc, w, h, amostra, du = 0, planura = 0.28) {
  const nx = Math.sin(A.ry), nz = Math.cos(A.ry);
  const ux = Math.cos(A.ry), uz = -Math.sin(A.ry);
  const FRENTE = 0.30;
  let dmin = Infinity, dmax = -Infinity, achou = 0;
  if (amostra) {
    for (const [su, sv] of AMOSTRAS_15) {
      const prof = amostra(du + su * w, yc + sv * h);
      if (prof === null) continue;
      if (prof < dmin) dmin = prof;
      if (prof > dmax) dmax = prof;
      achou++;
    }
    /* 2 vazias de 15: a folga exata da régua, pro vão de porta e pro caixilho de
       janela — buraco legítimo em muro pichado. */
    if (achou < 13) return null;
    if (dmax - dmin > planura) return null;
    const recuo = dmin - 0.03;
    /* TAPADA: qualquer oclusor opaco nos 0,25 m à frente da peça — a mesma pergunta
       da `graffiti-audit`, nos mesmos pontos. Uma amostra coberta já lê como erro de
       render: qualquer uma reprova, e o deslize tenta a vaga ao lado. */
    if (amostra.frente) {
      for (const [su, sv] of AMOSTRAS_15) {
        if (amostra.frente(du + su * w, yc + sv * h, recuo) !== null) return null;
      }
    }
    return recuo;
  }
  /* 5 amostras (centro + 4 quinas): quina é onde a parede acaba — é lá que o degrau
     aparece. Sem folga nenhuma: uma vazia já é ponta pendurada. */
  for (const [su, sv] of [[0, 0], [-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
    const px = A.x + ux * su * w, py = yc + sv * h, pz = A.z + uz * su * w;
    rc.far = FRENTE + 0.55;
    rc.set(_ea.set(px + nx * FRENTE, py, pz + nz * FRENTE), _ed.set(-nx, 0, -nz).normalize());
    let t = null;
    for (const x of rc.intersectObjects(alvos, false)) if (x.distance > 1e-3) { t = x.distance; break; }
    if (t === null) continue;
    const prof = t - FRENTE;                   // 0 = no plano da âncora; >0 = recuado
    if (prof < dmin) dmin = prof;
    if (prof > dmax) dmax = prof;
    achou++;
  }
  if (achou < 5) return null;                  // buraco demais: não é parede, é vão
  if (dmax - dmin > 0.28) return null;         // duas paredes em degrau, não uma
  return dmin - 0.03;                          // 3 cm à frente da face mais orgulhosa
}

/* Até onde a parede CORRE sem degrau, a partir da âncora. Mesmo método da altura:
   passos de 0,45 m pra cada lado, raio de 0,6 m à frente pra trás, e enquanto a
   profundidade bater com a da âncora (±0,4 m) é a mesma parede. Devolve a largura
   TOTAL utilizável (esquerda + direita), que é o que decide se cabe um mural. */
function _larguraParede(alvos, rc, A, dy) {
  const nx = Math.sin(A.ry), nz = Math.cos(A.ry);
  const ux = Math.cos(A.ry), uz = -Math.sin(A.ry);
  const y = 1.15 + dy;
  const mede = (su) => {
    rc.far = 1.4;
    rc.set(_pa.set(A.x + ux * su + nx * 0.6, y, A.z + uz * su + nz * 0.6),
      _pd.set(-nx, 0, -nz).normalize());
    for (const x of rc.intersectObjects(alvos, false)) if (x.distance > 0.05) return x.distance;
    return null;
  };
  const base = mede(0);
  if (base === null) return 0;
  let esq = 0, dir = 0;
  for (let s = 0.45; s <= 4.2; s += 0.45) { const d = mede(-s); if (d === null || Math.abs(d - base) > 0.4) break; esq = s; }
  for (let s = 0.45; s <= 4.2; s += 0.45) { const d = mede(s); if (d === null || Math.abs(d - base) > 0.4) break; dir = s; }
  return esq + dir;
}

/* Topo da parede naquele ponto. Sai de 0,6 m À FRENTE da face e atira PRA TRÁS a
   cada 0,4 m de altura; enquanto a distância bater com a da base (±0,4 m) é a mesma
   parede. Para no 1º degrau que falha — é isso que distingue muro de 2,1 m de
   empena de 6 m sem precisar saber de qual dos dois o mapa é feito. */
const _pa = new THREE.Vector3(), _pd = new THREE.Vector3();
function _alturaParede(alvos, rc, A) {
  const nx = Math.sin(A.ry), nz = Math.cos(A.ry);
  const bx = A.x + nx * 0.6, bz = A.z + nz * 0.6;
  rc.far = 1.4;
  /* Pele suspensa (banner, cornija): a sonda de base a 1,0 m passa POR BAIXO dela e
     devolveria teto 1,2 — mas a âncora existe porque um raio BATEU nela na altura
     `olho`. Base cai pra altura do acerto antes de desistir (Loja H, 13/08: 16
     âncoras de banner com teto 1,2 e fachada pelada acima de 2,8 m). */
  let y0 = 1.0, base = null;
  for (const yb of (A.olho > 1.4 ? [1.0, A.olho] : [1.0])) {
    rc.set(_pa.set(bx, yb, bz), _pd.set(-nx, 0, -nz).normalize());
    for (const x of rc.intersectObjects(alvos, false)) if (x.distance > 0.05) { base = x.distance; break; }
    if (base !== null) { y0 = yb; break; }
  }
  if (base === null) return 1.2;
  let topo = y0;
  for (let y = y0 + 0.4; y <= 8.2; y += 0.4) {
    rc.set(_pa.set(bx, y, bz), _pd.set(-nx, 0, -nz).normalize());
    let d = null;
    for (const x of rc.intersectObjects(alvos, false)) if (x.distance > 0.05) { d = x.distance; break; }
    if (d === null || Math.abs(d - base) > 0.4) break;
    topo = y;
  }
  return topo + 0.2;
}

/* ANTI-REPETIÇÃO LOCAL. O hash espalha, mas com pool de 10 e 6 vagas numa parede o
   paradoxo do aniversário cobra e a MESMA arte sai 3× no mesmo muro — que lê como
   falha de asset, não como cidade. Se a sorteada já está a menos de 9 m, anda uma
   casa no pool. Continua 100% determinístico. */
function _escolher(pool, k, x, z, postas, T) {
  let i = pool[k % pool.length];
  for (let t = 0; t < pool.length; t++) {
    const j = pool[(k + t) % pool.length];
    if (!postas.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 9)) { i = j; break; }
  }
  return i;
}

/* Cobrir até `frac` da área da vizinha é CAMADA (tag por cima de peça, que é o que
   muro real tem). Acima disso é borrão. Só compara peça no MESMO plano — peça na
   parede de trás não disputa vaga com esta. */
function _cobreDemais(postas, x, y, z, ry, w, h, frac) {
  const ux = Math.cos(ry), uz = -Math.sin(ry), nx = Math.sin(ry), nz = Math.cos(ry);
  for (const p of postas) {
    if (Math.abs(Math.cos(p.ry - ry)) < 0.9) continue;              // outro plano
    const dx = x - p.x, dy = y - p.y, dz = z - p.z;
    if (Math.abs(dx * nx + dz * nz) > 0.45) continue;               // parede diferente
    const du = Math.abs(dx * ux + dz * uz), dv = Math.abs(dy);
    const ou = (w / 2 + p.hw) - du, ov = (h / 2 + p.hh) - dv;
    if (ou <= 0 || ov <= 0) continue;
    if (ou * ov > frac * Math.min(w * h, p.hw * p.hh * 4)) return true;
  }
  return false;
}

/* UMA MALHA POR ARQUIVO. Ver o bloco `_juntar` da docstring: 2.600 Mesh viram ~60.
   `userData.pecas` guarda o retângulo de cada peça pra régua continuar enxergando
   peça a peça depois da junção. */
function _juntar(porArquivo, T, root, postas) {
  let malhas = 0;
  /* chave = 'd<i>' (decalque) ou 'p<i>' (cartaz da coleção). Duas fontes, dois
     arrays de textura e dois materiais: decalque é PNG com alpha e precisa de
     `alphaTest` (sem ele o fundo transparente vira retângulo preto na parede);
     cartaz é JPG opaco e com `alphaTest` perderia as partes escuras da arte. */
  for (const [chave, geos] of porArquivo) {
    const cartaz = String(chave)[0] === 'p';
    const i = +String(chave).slice(1);
    const g = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!g) continue;
    const tex = cartaz ? (T.posterImgs || [])[i] : T.decals[i];
    if (!tex) continue;
    const m = new THREE.MeshLambertMaterial(Object.assign({
      map: tex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }, cartaz ? {} : { transparent: true, alphaTest: 0.24 }));
    const mesh = new THREE.Mesh(g, m);
    /* PNG que dá 404 some junto com a peça. Em prod (clone puro do git) 197 dos 209
       decalques não existem — são gitignored por procedência — e textura que falha no
       three vira BRANCO CHAPADO, não vira nada. Sem isto, o mapa em produção
       apareceria com centenas de retângulos brancos na parede. Ver o `faltou` no
       getter de `T.decals` (textures.js). */
    esconderSeFaltar(mesh, tex);    // ENCADEIA o callback; atribuir direto apagava o
                                    // guarda das peças coladas à mão que usam o mesmo PNG
    mesh.renderOrder = 2;
    mesh.receiveShadow = true;      // tinta escurece junto com a parede
    mesh.matrixAutoUpdate = false;  // geometria já está em mundo
    mesh.name = (cartaz ? 'decal:poster:' : 'decal:')
      + (cartaz ? ((T.posterFiles || [])[i] || i) : (T.decalFiles ? T.decalFiles[i] : i));
    mesh.userData.pecas = geos.length;
    root.add(mesh);
    malhas++;
  }
  // retângulo de cada peça, na malha-mãe do grupo, pra régua ler depois da junção
  if (malhas) {
    const raiz = root.userData;
    raiz.graffitiPecas = (raiz.graffitiPecas || []).concat(postas.map((p) => ({
      x: p.x, y: p.y, z: p.z, ry: p.ry, w: p.hw * 2, h: p.hh * 2,
      /* o NOME do arquivo vai junto: depois da junção a régua não tem como saber
         quantas artes distintas entraram (todas as peças viram uma malha por PNG), e
         "353 peças de 3 arquivos" é um alarme falso que custou meia hora. */
      f: p.f || (p.i !== undefined && T.decalFiles ? T.decalFiles[p.i] : 'peça'),
    })));
  }
  return malhas;
}
