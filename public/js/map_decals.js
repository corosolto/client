/* ============================================================================
   map_decals.js — AS DUAS COISAS QUE TODO MAPA PRECISA ANTES DE PINTAR PAREDE
   ----------------------------------------------------------------------------
   1. `decalIds(T, nomes)`  — pool de decalque por NOME de arquivo, não por índice.
   2. `paredeAtras(...)`    — raycast que confirma que existe sólido atrás da peça.

   ── POR QUE (1): ÍNDICE É PONTEIRO PRA LISTA GERADA ──────────────────────────
   Os pools nasceram como `const D_MURAL = [157, 158, ...]`: índices dentro do
   `DECAL_FILES` que `tools/gen-graffiti-decals.mjs` REESCREVE no textures.js. Ou
   seja, qualquer arquivo que entre ou saia do pacote de recortes renumera tudo
   que vem depois dele — e os 5 mapas passam a apontar pra arte errada SEM ERRO
   NENHUM, porque o índice continua válido. Aconteceu de verdade nesta rodada: a
   remoção de 3 recortes com fundo não removido (lobo-mau, gato-rosa, smiley-dedo)
   deslocou 80 índices. Nome de arquivo não desliza; índice desliza calado.

   ── POR QUE (2): "GRAFFITE EM LUGAR QUE NÃO É PAREDE" ────────────────────────
   Reprovação literal do dono (04/08): "os graffites que colocaste, colocaste em
   lugares que não são parede". A rodada anterior consertou dois casos na mão
   (mural cruzando a divisa de dois barracos de alturas diferentes; peça em fita
   de vidro fumê na Brasília) e sobraram outros — porque conserto caso a caso não
   fecha a classe do defeito, só os que aparecem na captura daquele dia.

   O decalque é PLANO SEM COLLIDER (regra da casa: decalque que empurra colisor
   vira parede invisível — BUG-21). Isso o desacopla da geometria de um jeito que
   nenhuma outra régua enxerga: dá pra colar uma peça de 5 m no meio do ar e todo
   portão continua verde. `paredeAtras` fecha esse buraco no ÚNICO momento em que
   dá pra fechar — antes de desenhar: 25 raios saindo do quad para TRÁS, e se
   qualquer um deles não encontrar sólido em 0,8 m, a peça não é criada.

   Isso mata a classe inteira:
     · peça no ar (nada atrás)                     -> nenhum raio bate
     · peça atravessando a divisa de dois volumes  -> a metade de fora não bate
     · peça passando do topo do muro               -> a fileira de cima não bate
     · peça em vão de porta / recuo de fachada     -> as amostras do vão não batem

   ── E MESMO ASSIM ELE VIU PEÇA EM LUGAR ERRADO (05/08) ───────────────────────
   Reprovação nº 2, com o portão VERDE: `decal-probe` dizia "0 sem parede atrás"
   nos 5 mapas e ele continuou vendo grafite onde não há parede. Ele estava certo:
   a régua media contra a LISTA DE SÓLIDOS DECLARADOS (`colliders` / `caixaDeBox3`),
   e caixa declarada MENTE de três jeitos diferentes, todos medidos no navegador:

     · **praca_poderes — 16 de 16 peças NO AR.** O ministério é um GLB sobre PILOTIS: o
       térreo é vazado, com colunas. `caixaDeBox3(Box3.setFromObject(b))` é a caixa
       do prédio INTEIRO, então o vão aberto entra como "parede". Capturado: a peça
       flutua entre as colunas e dá pra ver o gramado através dela.
       (`scratchpad/shots/awp_map_01_25de25_*.png`)
     · **quebrada — 21 de 47 sem malha nenhuma atrás** e 3 TAPADAS, com sólido
       a 1-5 cm NA FRENTE (a peça nasce do lado errado da parede: existe, é
       desenhada, e ninguém nunca vai ver).
     · vidro conta como parede — era um limite declarado desta régua.

   O critério certo não é uma lista: é a MALHA QUE O JOGADOR VÊ. Por isso
   `paredeAtras` passou a aceitar **Object3D** no lugar de caixa e a medir com
   raycast na geometria desenhada, com três cláusulas:
     1. os 25 raios ATRÁS batem em malha VISÍVEL e OPACA dentro de `alcance`;
     2. nenhum raio bate em nada nos 25 cm À FRENTE (peça tapada = peça invisível);
     3. a profundidade dos 25 acertos não varia mais que 25 cm (é UM plano, não
        duas paredes em degrau).
   Malha invisível (as caixas-occluder de bala, `material.visible = false`) e malha
   transparente (vidro, água) deixam de contar — que é a resposta pro limite que
   esta docstring declarava e nunca fechava.

   O caminho antigo de CAIXAS continua aqui e continua valendo pra quem passa
   caixa: é ele que atende o Ferro Velho (folhas giradas do portão) e qualquer
   sólido que não tenha malha própria.
   ============================================================================ */
import * as THREE from 'three';

/* Índices de `T.decals` a partir dos nomes de arquivo. Nome que não existe no
   pacote é AVISO ALTO e não entra no pool: pool vazio desenha nada (visível),
   pool com `undefined` desenha textura errada (invisível). */
export function decalIds(T, nomes) {
  const files = T && T.decalFiles;
  if (!files || !files.length) return [];
  const out = [];
  for (const n of nomes) {
    const i = files.indexOf(n);
    if (i < 0) { console.warn('[decals] "' + n + '" não existe em public/img/decals — fora do pool'); continue; }
    out.push(i);
  }
  return out;
}

/* Caixa GIRADA como sólido de decalque. As caixas de `colliders` são AABB de
   mundo e não sabem de `ry`; quem é girado (as duas folhas do portão do Ferro
   Velho, ry = ∓0,9) precisa entrar por aqui, senão o raio sai pela lateral da
   AABB não-girada e a peça certa é reprovada. `y` é a BASE, igual `addBox`. */
export function caixaGirada(w, h, d, x, y, z, ry = 0) {
  return { obb: true, cx: x, cy: y + h / 2, cz: z, hx: w / 2, hy: h / 2, hz: d / 2, ry };
}

/* Sólido a partir de um Box3 já calculado (fachada de GLB, que não tem collider
   quando o prédio é vazado por baixo — o caso dos ministérios sobre pilotis). */
export function caixaDeBox3(bb, folga = 0) {
  return {
    minX: bb.min.x - folga, maxX: bb.max.x + folga, minY: bb.min.y - folga, maxY: bb.max.y + folga,
    minZ: bb.min.z - folga, maxZ: bb.max.z + folga,
  };
}

// slab test: t de entrada do raio numa AABB, ou -1
function _aabb(ox, oy, oz, dx, dy, dz, b, tmax) {
  let t0 = 0, t1 = tmax;
  const eixo = (o, d, mn, mx) => {
    if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
    let a = (mn - o) / d, c = (mx - o) / d;
    if (a > c) { const s = a; a = c; c = s; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    return t0 <= t1;
  };
  if (!eixo(ox, dx, b.minX, b.maxX)) return -1;
  if (!eixo(oy, dy, b.minY, b.maxY)) return -1;
  if (!eixo(oz, dz, b.minZ, b.maxZ)) return -1;
  return t0;
}

function _bate(solids, px, py, pz, dx, dz, alcance) {
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (s.obb) {
      // leva o raio pro referencial da caixa (gira -ry em torno do centro)
      const c = Math.cos(-s.ry), si = Math.sin(-s.ry);
      const ax = px - s.cx, az = pz - s.cz;
      const lx = ax * c + az * si, lz = -ax * si + az * c;
      const ldx = dx * c + dz * si, ldz = -dx * si + dz * c;
      if (_aabb(lx, py, lz, ldx, 0, ldz,
        { minX: -s.hx, maxX: s.hx, minY: s.cy - s.hy, maxY: s.cy + s.hy, minZ: -s.hz, maxZ: s.hz }, alcance) >= 0) return true;
    } else if (_aabb(px, py, pz, dx, 0, dz, s, alcance) >= 0) return true;
  }
  return false;
}

/* TEM PAREDE ATRÁS?  (x, y, z) é o CENTRO do quad; `ry` a rotação dele.
   25 amostras (5×5) no quad encolhido 6% — a margem existe porque o decalque
   costuma ir encostado na quina e 6% evita reprovar por meio pixel de borda.
   `alcance` é curto de propósito (0,8 m): parede a mais de 0,8 m atrás do plano
   não é a parede daquele decalque, é outra coisa lá longe, e a peça está
   flutuando na frente dela. */
export function paredeAtras(solids, x, y, z, ry, w, h, alcance = 0.8) {
  if (!solids) return false;
  const lista = Array.isArray(solids) ? solids : [solids];
  if (!lista.length) return false;
  // Object3D na lista = medir a MALHA DESENHADA (o critério honesto). Ver docstring.
  const raizes = lista.filter((s) => s && s.isObject3D);
  if (raizes.length) return _paredeMalha(raizes, x, y, z, ry, w, h, alcance);
  const nx = Math.sin(ry), nz = Math.cos(ry);      // normal (a face que aparece)
  const ux = Math.cos(ry), uz = -Math.sin(ry);     // eixo horizontal do quad
  const N = 5, INSET = 0.94;
  for (let a = 0; a < N; a++) {
    const su = (a / (N - 1) - 0.5) * w * INSET;
    const px = x + ux * su, pz = z + uz * su;
    for (let b = 0; b < N; b++) {
      const py = y + (b / (N - 1) - 0.5) * h * INSET;
      if (!_bate(lista, px, py, pz, -nx, -nz, alcance)) return false;
    }
  }
  return true;
}

/* ── O CRITÉRIO CONTRA A MALHA DESENHADA ─────────────────────────────────────
   FRENTE_LIVRE: 25 cm. Peça com sólido na frente é peça que ninguém vê — foram 3
   assim na Quebrada, com a parede a 1 cm do quad (nascidas do lado de dentro).
   PLANO: 25 cm de variação de profundidade entre os 25 acertos. Mais que isso não
   é uma parede, são duas — a peça está em degrau e metade dela flutua. */
const FRENTE_LIVRE = 0.25, PLANO = 0.25;
const _rc = new THREE.Raycaster();
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3();
const _centro = new THREE.Vector3();

/* Malha serve de parede? Tem que ser DESENHADA (visível) e OPACA. Caixa-occluder de
   bala (`material.visible = false`) e vidro/água (`transparent`) não são parede pra
   tinta — o cartaz em vidro era a reclamação nº 1 do dono e era limite declarado. */
function _pintavel(o) {
  if (!o.isMesh || !o.visible || !o.material) return false;
  if (String(o.name).startsWith('decal:')) return false;
  const teste = (m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9));
  return Array.isArray(o.material) ? o.material.some(teste) : teste(o.material);
}

/* MEDIR SEM DEIXAR MARCA. `Mesh.raycast` (e o filtro por distância aqui) COMPUTA e
   GUARDA `geometry.boundingSphere` — e essa esfera vira cache velho se a geometria for
   transformada depois, o que num mapa em construção acontece o tempo todo (batch,
   merge, normalizeGeo). Efeito medido: só de rodar esta régua, o `botsim` do Piscinão
   saía de 15,94 latFlips / 1,42% stuck para 14,00 / 3,51% — com os MESMOS 72 decalques,
   conferidos peça a peça. Uma régua que muda o que mede é a Lei 1 da casa ao contrário.
   Por isso guardamos quem estava com a esfera nula e devolvemos ao estado anterior. */
function _alvos(raizes, x, y, z, raio, limpar) {
  _centro.set(x, y, z);
  const out = [];
  for (const r of raizes) {
    r.traverse((o) => {
      if (!_pintavel(o)) return;
      const g = o.geometry;
      if (!g) return;
      if (!g.boundingSphere) { g.computeBoundingSphere(); limpar.add(g); }
      const bs = g.boundingSphere;
      if (!bs) return;
      _c.copy(bs.center).applyMatrix4(o.matrixWorld);
      const e = o.matrixWorld.getMaxScaleOnAxis();
      if (_c.distanceTo(_centro) > raio + bs.radius * e) return;   // longe: nem entra no raycast
      out.push(o);
    });
  }
  return out;
}

function _tiro(alvos) {
  const hits = _rc.intersectObjects(alvos, false);
  for (const h of hits) if (h.distance > 1e-4) return h.distance;
  return null;
}

function _paredeMalha(raizes, x, y, z, ry, w, h, alcance) {
  const limpar = new Set();
  for (const r of raizes) r.updateMatrixWorld(true);
  try {
    const alvos = _alvos(raizes, x, y, z, Math.hypot(w, h) / 2 + alcance + 0.5, limpar);
    if (!alvos.length) return false;
    const nx = Math.sin(ry), nz = Math.cos(ry);
    const ux = Math.cos(ry), uz = -Math.sin(ry);
    const N = 5, INSET = 0.94;
    let dmin = Infinity, dmax = -Infinity;
    for (let a = 0; a < N; a++) {
      const su = (a / (N - 1) - 0.5) * w * INSET;
      for (let b = 0; b < N; b++) {
        _o.set(x + ux * su, y + (b / (N - 1) - 0.5) * h * INSET, z + uz * su);
        _rc.far = alcance;
        _rc.set(_o, _d.set(-nx, 0, -nz).normalize());
        const t = _tiro(alvos);
        if (t == null) return false;                       // nada atrás: peça no ar
        if (t < dmin) dmin = t;
        if (t > dmax) dmax = t;
        _rc.far = FRENTE_LIVRE;
        _rc.set(_o, _d.set(nx, 0, nz).normalize());
        if (_tiro(alvos) != null) return false;            // tapada: nasceu do lado errado
      }
    }
    return dmax - dmin <= PLANO;
  } finally {
    for (const g of limpar) g.boundingSphere = null;       // devolve o mapa ao estado de antes
  }
}

/* ── MEDIR A FACE VISÍVEL E PUXAR A PEÇA PRA ELA (06/08) ─────────────────────
   Por que existe: com os barracos GLB no mapa, o `paredeAtras` matava ~80% dos
   decalques da Quebrada NO NAVEGADOR (em node, com a caixa procedural, passava
   tudo) — o GLB desenha a parede alguns centímetros fora do plano declarado e
   com micro-recuos que estouram o PLANO de 25 cm. O dono via parede pelada:
   15 decalques na tela de 75 colocados.
   A régua certa não é rejeitar a peça: é achar a face que o jogador VÊ e colar
   nela. Devolve quanto a peça deve RECUAR ao longo da normal (negativo = avança)
   pra ficar 3 cm à frente do ponto mais orgulhoso da parede — ou null se não há
   parede visível na faixa [-0,5 m à frente … +1,2 m atrás] (aí é peça no ar e
   morre mesmo). Varredura: 3 colunas × 3 alturas; variação > 0,6 m entre colunas
   é degrau de verdade (duas paredes), não jag — também null. */
export function medirParede(raizes, x, y, z, ry, w, h) {
  const limpar = new Set();
  for (const r of raizes) r.updateMatrixWorld(true);
  try {
    const alvos = _alvos(raizes, x, y, z, Math.hypot(w, h) / 2 + 2.0, limpar);
    if (!alvos.length) return null;
    const nx = Math.sin(ry), nz = Math.cos(ry);
    const ux = Math.cos(ry), uz = -Math.sin(ry);
    /* ── QUANTO DÁ PRA RECUAR SEM SAIR DO OUTRO LADO DO BECO (07/08) ─────────
       O raio nascia SEMPRE 1,5 m à frente do plano nominal, pra alcançar a face
       orgulhosa de um GLB. Numa VIELA isso é fatal: as vielas da Quebrada têm
       1,3 m de vão, então o ponto de partida cai ATRÁS da parede de enfrente, o
       primeiro acerto é ela, e o `recuo` calculado joga a peça no meio do beco.
       Medido pela `graffiti-audit`: 451 peças no ar na Quebrada, e 34 das 40
       piores eram justamente as coladas à mão nas vielas (x ≈ ±20,7) e nos muros
       externos (±25).

       O conserto não é encurtar o alcance pra todo mundo — quem tem espaço na
       frente continua precisando dele. É PERGUNTAR primeiro: um raio pra frente
       diz onde está o obstáculo, e a partida recua pra 5 cm antes dele. Rua
       aberta segue com 1,5 m; beco de 1,3 m usa o que tem. */
    let frente = 1.5;
    _rc.far = 1.5;
    _rc.set(_o.set(x, y, z), _d.set(nx, 0, nz).normalize());
    const dFrente = _tiro(alvos);
    if (dFrente != null) frente = Math.max(0.12, dFrente - 0.05);

    let orgulhoso = Infinity, recuado = -Infinity, vazias = 0;
    for (const su of [-0.4, 0, 0.4]) {
      for (const sv of [-0.35, 0, 0.35]) {
        _o.set(x + ux * su * w + nx * frente, y + sv * h, z + uz * su * w + nz * frente);
        _rc.far = frente + 1.2;                            // o que couber à frente + 1,2 atrás
        _rc.set(_o, _d.set(-nx, 0, -nz).normalize());
        const t = _tiro(alvos);
        if (t == null) { vazias++; continue; }             // esta coluna não tem parede
        const recuo = frente - t;                          // >0: parede atrás do plano nominal
        if (recuo < orgulhoso) orgulhoso = recuo;
        if (recuo > recuado) recuado = recuo;
      }
    }
    if (orgulhoso === Infinity) return null;               // nenhuma coluna achou parede
    /* ── QUANTO BURACO A PEÇA PODE TER ATRÁS (07/08) ────────────────────────
       Antes, amostra sem parede era só `continue`: bastava UMA das nove achar
       parede para a peça nascer. Foi assim que o pixo do beco oeste ficou 100% no
       ar por cima do vão da porta — medido pela `graffiti-audit` e visto na foto
       (`/tmp/graffiti-audit/quebrada/00_vao100.png`): a peça atravessa a viga e
       continua sobre o recuo da porta, com parede só numa ponta.
       3 de 9 é a folga que sobra: caixilho de janela e vão de porta abrem buraco
       legítimo no meio de um muro pichado, e reprovar por causa deles trocaria um
       defeito por outro. Acima disso não é parede com furo, é peça pendurada. */
    if (vazias > 3) return null;
    if (recuado - orgulhoso > 0.6) return null;            // degrau: duas paredes, não uma
    if (orgulhoso > 1.2) return null;                      // parede longe demais: peça flutuaria
    return orgulhoso - 0.03;                               // 3 cm à frente da face mais orgulhosa
  } finally {
    for (const g of limpar) g.boundingSphere = null;
  }
}
