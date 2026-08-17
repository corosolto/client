// CÓRREGO (fy_corrego) — spec plans/13-CORREGO.md: favela de São Paulo sobre um córrego
// a céu aberto. Água escura corta o mapa no meio; pontes de madeira ligam os dois lados.
// Casas de madeira com telhado de zinco, antena parabólica, caixas d'água. Jacaré no
// córrego, capivara na margem, ratos no lixo. É o mapa mais brasileiro do elenco.
//
// PLANTA (eixo longo = z; norte = -z).
//   MARGEM O  x ∈ [-24, -3]   spawn B (casas de madeira, vielas)
//   CÓREGO    x ∈ [-3, 3]     água a y=-0,3; intransponível (colisor)
//   MARGEM L  x ∈ [3, 24]     spawn E (espelho do oeste)
//   3 pontes em z = -22, 0, 22
//   Alagado em z ∈ [-40,-34] e [34,40] (chão com textura de água)
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch, StaticBatch, InstBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { GRAFITE } from './graffiti_layout.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 24, HALF_Z = 40;
export const CORREGO_AMBIENCE = FAVELA_AMBIENCE_ASSETS;
const CORREGO_W = 10;         // eixo largo o bastante para dominar a leitura aérea e em FPS
const CORREGO_X0 = -CORREGO_W / 2, CORREGO_X1 = CORREGO_W / 2;

/* ===================== O CANAL TEM FUNDO =====================
   Relato do dono, literal: "O CORREGO NAO TEM ALTURA NENHUMA, QUANDO SE CAI TRAVA, E
   DEVIA CAIR E TER ALTURA". As duas metades da frase são o MESMO defeito, e ele era de
   código, não de arte:

     · `groundHeightAt` devolvia −0,4 dentro do canal (chão logo abaixo da margem), e ao
       mesmo tempo um `col(CORREGO_X0, CORREGO_X1, −2,0, −0,12, …)` enchia o vão inteiro
       de sólido. Quem caísse da ponte pousava em y = −0,4 DENTRO desse colisor: o
       `_collide` do game.js (`pos.y + 1,5 > minY && pos.y + 0,3 < maxY`) empurrava o
       corpo lateralmente todo frame sem nunca resolver. Isso é o "quando se cai trava".
     · E como o vão era sólido, o canal não tinha profundidade nenhuma para o jogador:
       era um muro pintado de água. Isso é o "não tem altura nenhuma".

   Agora o canal é um VAZIO REAL: piso andável em CANAL_FUNDO, paredes verticais de
   concreto como colisor (só as paredes), e rampas de acesso para sair. Cair nele é uma
   rota, não um bug.

   POR QUE 1,85 m E NÃO OS ~3 m DA FOTOGRAFIA (foto_001): o `map-check.mjs` define
   QUEDA_ANDAR = 2,0 m como a fronteira entre "queda tática" e "passagem para o avesso da
   camada", e cobra guarda-corpo acima disso (MAP6). Um canal com guarda-corpo nos 80 m
   das duas margens é justamente o que impede de cair — mataria o pedido. 1,85 m fica do
   lado tático dessa fronteira POR CONSTRUÇÃO, e continua 23 cm acima da linha do olho
   (1,62 m): de dentro do canal não se enxerga a margem, que é a leitura que interessa.
   Isto é uma limitação declarada, não um número escolhido para ficar verde — ver o
   relatório. */
const CANAL_ABERTURA = 6;                       // vão livre: x ∈ [−3, 3]
const CANAL_X0 = -CANAL_ABERTURA / 2, CANAL_X1 = CANAL_ABERTURA / 2;
/* −1,75 e não −1,85: a PONTE fica a y = 0,15, então a queda ponte→fundo é 0,15 − FUNDO.
   Com −1,85 essa conta dava exatamente 2,00 m e o MAP6 acusou 64 bordas (medido). O teto
   que manda aqui é o da queda a partir da superfície MAIS ALTA que dá no vão, não o da
   margem. Continua 13 cm acima da linha do olho (1,62 m). */
const CANAL_FUNDO = -1.75;
const CANAL_AGUA = CANAL_FUNDO + 0.14;          // lâmina rasa: anda-se DENTRO dela
/* Rampas de contenção, paralelas ao canal (é assim que córrego canalizado de verdade dá
   acesso — ver foto_001: a parede é vertical, quem desce desce pela ponta). Cada rampa
   ocupa a faixa da parede (|x| ∈ [3, 5]) e desce ao longo de z: 1,85 m em 6 m = 17°,
   bem abaixo do DEGRAU de 0,30 m/0,25 m da grade do map-check, então a sonda de
   alcançabilidade atravessa e o fundo do canal conta como piso alcançável de verdade. */
const RAMPAS = [
  { lado: -1, zAlto: -33, zBaixo: -27 },
  { lado: 1, zAlto: -13, zBaixo: -7 },
  { lado: -1, zAlto: 9, zBaixo: 15 },
  { lado: 1, zAlto: 29, zBaixo: 35 },
];
const RAMPA_X0 = CANAL_X1, RAMPA_X1 = CORREGO_X1;   // 3 → 5

export const CORREGO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som', 'fav_house',
  /* Kit de favela que estava no disco sem nenhum mapa consumindo. `fav_house` já era
     pré-carregada e nunca colocada — peso de download por nada. Agora as três entram
     como VOLUME de fundo (ver o bloco FILEIRA C) e as duas pequenas como vocabulário. */
  'fav_brasileira', 'caixa_dagua', 'botijao_gas', 'uno_mille', 'fiat_uno', 'kombi'];

export const CORREGO_ARTE_SUBSTITUICOES = Object.freeze({
  'folha-person-02.png': 'or-mitico-mural.png',
  'personagens-graffiti-01.png': 'or-mitico-mural.png',
  'poster:despisque-leao.jpg': 'poster:or-quebrada-vive.jpg',
  'poster:ashtar-meme.jpg': 'poster:or-quebrada-vive.jpg',
  'poster:ashtar.png': 'poster:or-quebrada-vive.jpg',
  'personagens-graffiti-02.png': 'or-graf-treta.png',
  'personagens-graffiti-03.png': 'or-graf-treta.png',
});
for (const [antes, depois] of Object.entries(CORREGO_ARTE_SUBSTITUICOES)) {
  const arquivos = GRAFITE?.fy_corrego?.arquivos || [];
  for (let i = 0; i < arquivos.length; i++) if (arquivos[i] === antes) arquivos[i] = depois;
}

export function buildCorrego(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };

  // Texturas reais no browser, canvas fallback em node
  let TEX = {
    dirt: lam({ map: T.dirt }), concrete: lam({ map: T.concrete }),
    asphalt: lam({ map: T.asphalt }), concreteDark: lam({ map: T.concreteDark }),
    wall: lam({ map: T.dirt, color: 0x9a7658 }),
    tijolo: lam({ map: T.dirt, color: 0xb98a63 }),
    zinco: lam({ color: 0x77746d, metalness: 0.4, roughness: 0.6 }),
    agua: lam({ color: 0x42543b, roughness: 0.24, metalness: 0.12 }),
    pixo: lam({ map: T.concreteDark, roughness: 0.98 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 4, ry = 4) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    TEX.dirt = lam({ map: load('/img/textures/dirt_field.webp', 5, 8), roughness: 1.0 });
    TEX.wall = lam({ map: load('/img/textures/tex_madeira.webp', 2, 2) });         // tapume/compensado
    /* Alvenaria. Mesma textura que escadão/campomorro/lajes já consomem — o córrego era
       o único mapa de favela que não a usava (ver o bloco ALVENARIA mais abaixo). */
    TEX.tijolo = lam({ map: load('/img/textures/favela_wall.webp', 2, 2), roughness: 0.97 });
    TEX.zinco = lam({ map: load('/img/textures/tex_zinco.webp', 3, 3), metalness: 0.4, roughness: 0.6 });
    TEX.asphalt = lam({ map: load('/img/textures/asphalt_br.webp', 5, 8) });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 3, 5) });
    TEX.agua = lam({ map: load('/img/textures/tex_agua_poluida.webp', 2, 6), color: 0x42543b, roughness: 0.24, metalness: 0.12 });
    TEX.pixo = lam({ map: load('/img/textures/corrego_streetart_pixo.webp', 2, 2), roughness: 0.98 });
  }

  /* ── SUPERFÍCIE: UM MATERIAL POR FAMÍLIA, E TODO ELE COM MAPA ────────────────
     O relato do dono jogando foi "o do corrego esta horrivel, sem textura
     nenhuma", e a medida (tools/eval/corrego-superficie-check.mjs) deu 66% dos
     materiais do mapa sem `map`, contra 32% de média dos 5 mapas maduros: as três
     lâminas de água, 24 caixas d'água, 18 parabólicas, geladeira, pneu, limo e os
     pilares de ponte eram COR PURA. Superfície sem mapa nem entra na conta de
     densidade do texel-check ("fora da conta"), então era justamente a pior parte
     do mapa que nenhuma régua alcançava.

     Duas coisas se resolvem no mesmo lugar:
     (a) TEXTURA — cada família passa a consumir o catálogo que JÁ EXISTE em
         textures.js (T.concrete, T.dirt, T.metal, T.asphalt, T.crate) e os webp
         que o mapa já carrega. Nenhuma textura nova nasce aqui: subir densidade
         de texel é frente de outro agente, e este arquivo só consome a API dele.
     (b) REPETIÇÃO — material COMPARTILHADO por família, em vez de um `lam()`
         dentro do laço. 24 caixas d'água eram 24 materiais distintos (medido:
         186 materiais no mapa, agora 106). Isso NÃO derruba draw call por si só —
         cada malha continua sendo uma chamada — mas derruba troca de estado e de
         programa na GPU, e é pré-requisito para qualquer merge futuro, que exige
         material idêntico. `aoMatFactory` (vao.js:281) tem cache POR MATERIAL de
         origem: com um `lam()` por peça, ele clonava um AO material por peça.

     Caixa e prop NÃO levam `repeat` na mão: `aoBoxGeo`+`aoMat` (vao.js) escalam a
     UV pelo tamanho de mundo até ALVO_PXM, então dar o mapa já basta. Quem precisa
     de `repeat` explícito é plano de `addFloor`, que não passa pelo vao — por isso
     só as lâminas de água abaixo clonam a textura com `repeat` calculado. */
  const srcAgua = TEX.agua.map || T.dirt;
  const mapaAgua = (rx, ry) => {
    const t = srcAgua.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  };
  // caixa d'água de polietileno: grão do concreto tingido de azul lê como plástico
  // encardido de laje, que é o que ela é — e não como plástico de brinquedo.
  const matCaixaAgua = lam({ map: TEX.concrete.map || T.concrete, color: 0x3f7f9c, roughness: 0.82 });
  const matParabolica = lam({ map: T.metal, color: 0xc8ccce, metalness: 0.55, roughness: 0.42 });
  const matEletro = lam({ map: T.metal, color: 0xd6d3cb, metalness: 0.15, roughness: 0.48 });
  const matPneu = lam({ map: T.asphalt, color: 0x6d6a66, roughness: 0.95 });
  const matSofa = [0x9a6f56, 0x7a6248].map((color) => lam({ map: T.dirt, color, roughness: 0.95 }));
  const matMadeiraBruta = lam({ map: TEX.wall.map || T.dirt, color: 0x8a6a4e, roughness: 1 });
  const matLimo = lam({ map: T.dirt, color: 0x3e5c40, roughness: 1 });
  const matHaste = lam({ map: T.metal, color: 0x6e6e6e, metalness: 0.5, roughness: 0.55 });
  /* Peça pequena e orgânica NÃO leva mapa (ver o comentário do jacaré): ela fica com
     UV 0→1 sobre a textura inteira e estoura a dispersão do texel-check. O que estas
     ganham aqui é deixar de nascer DENTRO do laço — cada `lam()` repetido era um
     material a mais, e material a mais é draw call que nenhum merge junta. */
  const matCabo = lam({ color: 0x8a8a8a });
  /* Mesma regra, e ela mordeu de novo nesta rodada: as peças finas que entraram com a
     favela (prumada de cano 7 cm, ferro de espera 5 cm, cavalete 10 cm, braço de poste
     14 cm, roupa de varal 2 cm) tinham textura, e uma face de 7 cm com a textura inteira
     mede ~3.000 px/m contra a mediana de 162 do mapa — o `texel-check` acusou TEXEL3b em
     18,5× (teto 4×). Vara fina com textura de metal não acrescenta um pixel de informação
     a 3 m de distância e destrói a dispersão. Cor pura, e o custo em SUP1/SUP2 é
     desprezível porque a ÁREA dessas peças é minúscula (medido: 311 m² de superfície sem
     textura no mapa inteiro, contra um teto de 6% da área). */
  const matCano = lam({ color: 0xd6d3cb, roughness: 0.5 });
  const matVerga = lam({ color: 0x7c6a52, roughness: 0.85 });
  const matRipa = lam({ color: 0x8a6a4e, roughness: 1 });
  const matConcretoFino = lam({ color: 0x9d968a, roughness: 0.95 });
  const matPupila = lam({ color: 0x080806 });
  const matOlhoEscuro = lam({ color: 0x15100d });
  const matFocinhoCap = lam({ color: 0x211b17, roughness: .8 });

  /* ── ALVENARIA: O VOCABULÁRIO QUE FALTAVA ───────────────────────────────────
     Achado desta rodada, e ele explica sozinho metade do "barracos genéricos" do
     dono: `/img/textures/favela_wall.webp` (reboco descascado com tijolo aparente
     por baixo) JÁ EXISTE no disco e é consumida pelo escadão, pelo campo do morro e
     pelo lajes — mas NÃO pelo córrego, que mandava TODA parede de casa para
     `TEX.wall` = `tex_madeira.webp`. Trinta barracos com a mesma prancha bege é
     exatamente o que se vê no frame de referência desta rodada.

     Nas 18 fotos de `references/favela/fotos-reais/` não existe uma parede de
     madeira dominante: o que domina é (a) tijolo baiano aparente sem reboco,
     (b) reboco cinza cru na parte de baixo com o tijolo aparecendo acima — a
     "faixa" horizontal é a assinatura visual mais forte do conjunto (foto_001,
     foto_005) — e (c) pintura saturada e desbotada (foto_040: verde, amarelo,
     turquesa; foto_012: azul, verde).

     Por isso a família abaixo COMPARTILHA uma fonte só (uma textura na GPU) e varia
     por TINTA e por escala de repetição. Custo: zero textura nova, zero download.
     Ganho medido no relatório: `superf_chapada` e `superf_sd` do foto-vs-render são
     dois dos quatro descritores não-cegos, e os dois medem exatamente isto. */
  const _srcTijolo = TEX.tijolo.map;
  const tijoloTex = (rx, ry) => {
    if (!_srcTijolo) return null;
    const t = _srcTijolo.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  };
  /* As cores saem das fotos, não de paleta de designer: bege de reboco velho, o
     rosa-terra do tijolo lavado, e os quatro tons de pintura que aparecem em
     foto_040/foto_012. `0xffffff` = a textura crua, sem tinta. */
  const CORES_ALVENARIA = [0xffffff, 0xe6d4b4, 0xc9a883, 0xb9c9b4, 0xd9c78e, 0xa9c2c6, 0xd8b3a2, 0xcdc4ae];
  const MURO = CORES_ALVENARIA.map((color, i) =>
    lam({ map: tijoloTex(1.6 + (i % 3) * 0.4, 1.6 + (i % 2) * 0.5) || T.dirt, color, roughness: 0.97 }));
  // Pavimento de cima sem reboco nenhum: tijolo cru, mais vermelho e mais miúdo.
  const matTijoloCru = lam({ map: tijoloTex(2.4, 2.0) || T.dirt, color: 0xc98a63, roughness: 1 });
  // Reboco liso: o embasamento de concreto que sobe da água (foto_001) e as platibandas.
  const matReboco = lam({ map: TEX.concrete.map || T.concrete, color: 0xb4ada0, roughness: 0.96 });
  const matRebocoSujo = lam({ map: TEX.concrete.map || T.concrete, color: 0x8d8579, roughness: 0.98 });
  // Pilar de concreto aparente — em foto_005 eles cortam a alvenaria em faixas verticais.
  const matPilar = lam({ map: TEX.concrete.map || T.concrete, color: 0x9d968a, roughness: 0.95 });
  // Ferro de espera: laje inacabada esperando o próximo andar. Está em quase toda foto.
  const matFerro = lam({ map: T.metal, color: 0x7c6a52, metalness: 0.35, roughness: 0.8 });
  /* Vão de janela/porta: o interior escuro visto de fora. É o que dá ESCALA à parede —
     sem ele um bloco de 8 m lê como muro. Textura de concreto muito escurecida em vez de
     preto chapado, senão volta a ser superfície sem mapa (SUP1). */
  /* TENTATIVA DESCARTADA, registrada para ninguém repetir: passar este material para cor
     pura (na hipótese de que as faces finas do vão fossem o pico do texel-check) NÃO moveu
     o TEXEL3b — continuou 5,4× — e levou a área sem textura de 1,5% para 3,4%. Custo sem
     efeito, revertido. O pico de 876 px/m está em outro grupo do lote mesclado. */
  const matVao = lam({ map: TEX.concrete.map || T.concrete, color: 0x2b2a27, roughness: 1 });

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  /* ── COLISOR GIRADO ─────────────────────────────────────────────────────────
     Portado de `map_brasilia.js:110` (colRot/foraDaCaixaGirada) em vez de inventado
     aqui — é o padrão que a base já tem para o mesmo problema.

     Ele passa a ser OBRIGATÓRIO neste mapa a partir desta rodada. O portão
     `mapa-novo-gate.mjs` cobra ≥ 15% da massa fora da grade de 3° (ORT1) e as casas
     agora nascem giradas de 3° a 28°. Com colisor AABB, um bloco de 6 × 5 m girado
     28° projeta canto ~1,1 m para FORA da caixa registrada: o jogador entraria
     dentro da malha visível e o `MAP1` (corpo dentro de sólido) do map-check
     acusaria — melhoria de ângulo que quebra colisão é regressão, não melhoria. */
  const alinhado = (ry) => Math.abs(Math.sin(2 * ry)) < 1e-6;
  function colRot(cx, cz, hx, hz, minY, maxY, ry) {
    if (!ry || alinhado(ry)) {
      const troca = ry ? Math.abs(Math.cos(ry)) < 0.5 : false;
      const ax = troca ? hz : hx, az = troca ? hx : hz;
      colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az });
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az, ry, cx, cz, hx, hz, cos: cs, sin: sn });
  }
  // Mesmo teste do lado do A*: sem isto o bot planeja pela AABB e contorna ar.
  const foraDaCaixaGirada = (c, x, z, inf) => {
    const wx = x - c.cx, wz = z - c.cz;
    const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
    return Math.abs(lx) > c.hx + inf || Math.abs(lz) > c.hz + inf;
  };
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0);
      occluders.push(m);
    }
    return m;
  }

  const SB = new StaticBatch({ name: 'favela' });
  /* Peça estática de alvenaria: mesma semântica de `addBox` (colisor, saia de contato,
     bandas de AO), mas a MALHA vai para o lote em vez de virar um Mesh próprio.
     `aoBoxGeo` tem de ser chamado imediatamente antes de `aoMat` — o vao passa a UV
     por um handoff de módulo, e inverter a ordem escala a caixa errada. */
  const _mtx = new THREE.Matrix4(), _eul = new THREE.Euler();
  function addBoxSB(w, h, d, mat, x, y, z, opts = {}) {
    const geo = aoBoxGeo(w, h, d, { low: LOWQ, base: (onGround(y, h) && !opts.ry) ? undefined : BASE_FLOATING });
    const m = aoMat(mat);
    _eul.set(opts.rx || 0, opts.ry || 0, 0, 'YXZ');
    _mtx.makeRotationFromEuler(_eul).setPosition(x, y + h / 2, z);
    SB.add(geo, _mtx, m, { cast: opts.cast !== false, receive: true });
    if (onGround(y, h) && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    if (opts.collide !== false) colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0);
  }
  /* ── PEÇA INSTANCIADA ────────────────────────────────────────────────────────
     O lote estático resolve draw call e CEGA O PORTÃO. `mapa-novo-gate.mjs` mede o
     ângulo de cada massa pela MATRIZ DE MUNDO do objeto; `StaticBatch` assa a matriz
     nos vértices e devolve uma malha com rotação identidade. Medido: com toda a
     alvenaria mesclada, o censo caiu de 339 para 158 massas e os ângulos distintos
     ficaram em 13 — não porque as casas estejam de esquadro (elas não estão), mas
     porque o instrumento perdeu a informação. Número que some não é número que melhora.

     `InstBatch` resolve os dois: 1 draw call por (geometria, material) E uma matriz
     POR CÓPIA, que é exatamente o que o portão lê — o próprio cabeçalho dele diz que
     passou a ler `instanceMatrix` justamente para instancing não virar jeito barato de
     fazer o número dizer o que se quiser. Então tudo que CARREGA o ângulo da casa e se
     repete muito (pilar, telhado, caixa d'água, cavalete, ferro de espera, entulho)
     passa por aqui, e só a alvenaria maciça — que tem o MESMO ângulo dos pilares que a
     cercam — fica no lote mesclado.

     LIMITAÇÃO DECLARADA: a alvenaria em si continua invisível para o ORT1. O conserto
     certo é o portão medir NORMAL DE TRIÂNGULO em vez de matriz de objeto, o que muda
     o número dos 10 mapas e não cabe numa prova de conceito. Está no relatório. */
  const IB = new InstBatch({ bucket: 0 });
  const _geoI = new Map();
  /* Geometria memoizada por (tamanho, material): o `aoBoxGeo`+`aoMat` escala a UV pelo
     tamanho de mundo E pela textura, então as duas coisas fazem parte da chave. */
  function geoInst(w, h, d, mat) {
    const k = `${w}|${h}|${d}|${mat.uuid}`;
    let e = _geoI.get(k);
    if (!e) { const g = aoBoxGeo(w, h, d, { low: LOWQ, base: BASE_FLOATING }); e = { g, m: aoMat(mat) }; _geoI.set(k, e); }
    return e;
  }
  function addBoxI(w, h, d, mat, x, y, z, opts = {}) {
    const e = geoInst(w, h, d, mat);
    _eul.set(opts.rx || 0, opts.ry || 0, opts.rz || 0, 'YXZ');
    _mtx.makeRotationFromEuler(_eul);
    if (opts.sx || opts.sz || opts.sy) _mtx.scale(new THREE.Vector3(opts.sx || 1, opts.sy || 1, opts.sz || 1));
    _mtx.setPosition(x, y + h / 2, z);
    IB.add(e.g, e.m, _mtx, null, { cast: opts.cast !== false });
    if (opts.collide) colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0);
  }
  /* Placa inclinada (telhado, beiral, marquise). `rx`/`rz` inclinam; é a inclinação que
     faz DUAS chapas vizinhas se cruzarem na imagem, e é disso que `juncao_dens` é feita.
     Nunca tem colisor: telhado não é piso neste mapa.
     UMA geometria de referência escalada por cópia: a chapa ondulada tolera ±25% de erro
     de UV, e em troca 90 telhados custam UM draw call em vez de 90. */
  const PLACA_REF = [3.4, 0.1, 5.6];
  function addPlacaSB(w, h, d, mat, x, y, z, ry = 0, rz = 0, rx = 0) {
    const e = geoInst(PLACA_REF[0], PLACA_REF[1], PLACA_REF[2], mat);
    _eul.set(rx, ry, rz, 'YXZ');
    _mtx.makeRotationFromEuler(_eul);
    _mtx.scale(new THREE.Vector3(w / PLACA_REF[0], h / PLACA_REF[1], d / PLACA_REF[2]));
    _mtx.setPosition(x, y, z);
    IB.add(e.g, e.m, _mtx, null, { cast: true });
  }

  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });

  function paredeTex(pint, crua, seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = pint; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {
      if (rnd() > crua) continue;
      const px = rnd() * S, py = rnd() * S, w = 40 + rnd() * 90, h = 30 + rnd() * 80;
      x.save(); x.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, r = 0.5 + rnd() * 0.6; const fx = px + Math.cos(a) * w * r, fy = py + Math.sin(a) * h * r; k ? x.lineTo(fx, fy) : x.moveTo(fx, fy); }
      x.closePath(); x.clip();
      x.fillStyle = '#8d8377'; x.fillRect(px - w, py - h, w * 2, h * 2);
      for (let r2 = -3; r2 < 4; r2++) for (let k = -2; k < 3; k++) {
        const bx = px + k * 60 + (r2 % 2 ? 30 : 0), by = py + r2 * 30, v = rnd();
        x.fillStyle = `rgb(${146 + v * 44 | 0},${84 + v * 32 | 0},${56 + v * 24 | 0})`; x.fillRect(bx, by, 54, 24);
        x.fillStyle = 'rgba(40,26,20,0.5)'; for (let h2 = 0; h2 < 3; h2++) x.fillRect(bx + 6 + h2 * 15, by + 6, 9, 12);
      }
      x.restore();
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  const PAREDES = [paredeTex('#c4a87a', 0.3, 301), paredeTex('#a89d8a', 0.4, 502),
    paredeTex('#8d6e5a', 0.5, 703), paredeTex('#b0a06a', 0.35, 904)];

  const PB = new PropBatch({ bucket: 24 });
  const GLB_ON = QP.get('glb') !== '0';
  function propComFallback(id, x, z, h, ry, fallback) {
    const proxy = fallback();
    if (!GLB_ON || !hasProp(id)) return proxy;
    const o = placeProp(id, { x, z, targetH: h, ry });
    if (!o) return proxy;
    proxy.visible = false; // collider/LOS continuam idênticos no A/B procedural.
    root.add(o);
    /* Bala bate na malha visível: o proxy fica só com o corpo (collider) e o GLB
       assume o occluder — proxy 0,2-0,3 m mais gordo que o GLB era o tiro-no-ar medido. */
    const pi = occluders.indexOf(proxy); if (pi >= 0) occluders.splice(pi, 1);
    o.traverse((m) => { if (m.isMesh && !(m.material && m.material.transparent && (m.material.opacity === undefined || m.material.opacity < 0.9))) occluders.push(m); });
    return proxy;
  }

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xb9a08a);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_corrego');
  const hemi = new THREE.HemisphereLight(0xd8b89a, 0x4a3830, 0.85); scene.add(hemi);   // mais quente/amarelado
  const sun = new THREE.DirectionalLight(0xffc888, 1.7); sun.position.set(20, 35, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO DAS MARGENS =====================
     O plano começa em |x| = 5, NÃO em 3: a faixa [3, 5] é o topo da parede do canal e
     as rampas de acesso, que descem. Enquanto o asfalto ia até x = 3 ele ficava
     pairando 1,7 m acima de quem descia a rampa, e o map-check acusou 31 pontos com o
     corpo dentro de sólido — plano de chão que ignora o relevo é a forma mais barata
     de reintroduzir o defeito que este mapa acabou de tirar. */
  addFloor(HALF_X - 5, HALF_Z * 2, -(5 + HALF_X) / 2, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);
  addFloor(HALF_X - 5, HALF_Z * 2, (5 + HALF_X) / 2, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);

  /* ===================== O CÓRREGO =====================
     Canal de concreto com FUNDO ANDÁVEL (ver o bloco "O CANAL TEM FUNDO" no topo).
     O vão de 6 m entre as paredes é uma rota baixa de 80 m: dá pra cair dentro, dá
     pra andar nele por baixo das pontes, e dá pra sair pelas quatro rampas e pelas
     duas pontas alagadas. As PONTES passam por cima. */
  // Piso do canal: laje de concreto suja, é onde o corpo pousa.
  const matFundoCanal = lam({ map: TEX.concrete.map || T.concrete, color: 0x6f6f61, roughness: 1 });
  addFloor(CANAL_ABERTURA, HALF_Z * 2, 0, 0, matFundoCanal, CANAL_FUNDO);
  // Lodo escuro na calha central — foto_001: a água corre numa faixa estreita no meio.
  {
    const calha = addFloor(2.2, HALF_Z * 2 - 2, 0, 0, lam({ map: T.dirt, color: 0x3c4436, roughness: 1 }), CANAL_FUNDO + 0.02);
    calha.userData.nonSolidSurface = true;
  }
  // água (plano baixo com textura poluída) — agora a 14 cm do fundo: anda-se DENTRO dela
  const aguaViva = lam({ map: TEX.agua.map || null, color: 0xa0b49a, roughness: .12, metalness: .18,
    emissive: 0x16281d, emissiveIntensity: .28 });
  const lamina = addFloor(CANAL_ABERTURA, HALF_Z * 2, 0, 0, aguaViva, CANAL_AGUA);
  lamina.userData.nonSolidSurface = true; lamina.userData.corregoWaterSurface = 'base';
  // Uma segunda lâmina translúcida devolve o céu e impede que o canal leia como asfalto verde.
  // As três lâminas de cima eram COR PURA (766 m² + 316 m² + 81 m² sem mapa nenhum),
  // e é o maior naco de superfície chapada do mapa. O `repeat` é calculado para dar
  // ~130 px/m no plano de 5,7 × 79 m — plano de `addFloor` não passa pelo vao, que é
  // quem normaliza densidade nas caixas. Escala de tile diferente da lâmina base faz
  // as duas camadas se moverem em fases distintas em vez de imprimirem a mesma mancha.
  const reflexoAgua = lam({ map: mapaAgua(1.5, 20), color: 0x8fc4b4, transparent: true, opacity: .24, roughness: .06,
    metalness: .32, emissive: 0x14372f, emissiveIntensity: .24, depthWrite: false });
  const reflexo = addFloor(CANAL_ABERTURA - .35, HALF_Z * 2 - .6, 0, 0, reflexoAgua, CANAL_AGUA + 0.015);
  reflexo.userData.nonSolidSurface = true; reflexo.userData.corregoWaterSurface = 'reflection'; reflexo.renderOrder = 2;
  // Poças paradas encostadas no pé da parede: a lâmina não é uma faixa uniforme.
  const aguaRasa = lam({ map: mapaAgua(0.55, 20), color: 0x73927a, transparent: true, opacity: .78, roughness: .12, metalness: .18,
    emissive: 0x172d20, emissiveIntensity: .26, depthWrite: false });
  for (const x of [-2.2, 2.2]) {
    const m = addFloor(1.4, HALF_Z * 2 - 1, x, 0, aguaRasa, CANAL_FUNDO + 0.04);
    m.userData.nonSolidSurface = true; m.renderOrder = 2;
  }
  // Reflexos compridos quebram a faixa uniforme sem aumentar o custo de geometria.
  const brilho = lam({ map: mapaAgua(1, 6), color: 0xc2e0d5, emissive: 0x315d50, emissiveIntensity: .35,
    transparent: true, opacity: .28, roughness: .04, depthWrite: false });
  for (const [x,z,w,d,ry] of [[-1.6,-27,1.0,12,.035],[1.8,-12,.75,9,-.045],[-1.3,4,.9,13,.025],[1.65,22,.8,12,-.035]]) {
    const r = addBox(w, .012, d, brilho, x, CANAL_AGUA + 0.03, z, { collide: false, cast: false, skirt: false, ry });
    r.userData.nonSolidSurface = true; r.renderOrder = 3;
  }
  /* ── PAREDES DO CANAL ────────────────────────────────────────────────────────
     Vertical, de CANAL_FUNDO até y = 0, na faixa |x| ∈ [3, 5]. É o colisor que
     segura o corpo dentro do canal — e é SÓ ele: o vão continua vazio, que é a
     diferença entre "canal" e "muro pintado de água".

     Quem anda em cima delas (o topo é o passeio da beira, 2 m de largura) não
     colide: `_collide` do game.js exige `pos.y + 0,3 < c.maxY`, e com os pés em
     y = 0 e maxY = 0 a conta dá falso. Isso é do jogo, não uma folga inventada aqui.

     O laço pula os trechos de RAMPA — onde a parede seria, o concreto desce. */
  const matParedeCanal = lam({ map: TEX.concrete.map || T.concrete, color: 0x8f8b80, roughness: 0.97 });
  for (const lado of [-1, 1]) {
    const cortes = RAMPAS.filter((r) => r.lado === lado)
      .map((r) => [Math.min(r.zAlto, r.zBaixo), Math.max(r.zAlto, r.zBaixo)])
      .sort((a, b) => a[0] - b[0]);
    let z0 = -HALF_Z;
    const trechos = [];
    for (const [a, b] of cortes) { if (a > z0) trechos.push([z0, a]); z0 = b; }
    if (z0 < HALF_Z) trechos.push([z0, HALF_Z]);
    for (const [a, b] of trechos) {
      const parede = addBox(RAMPA_X1 - RAMPA_X0, -CANAL_FUNDO, b - a, matParedeCanal,
        lado * (RAMPA_X0 + RAMPA_X1) / 2, CANAL_FUNDO, (a + b) / 2);
      parede.userData.corregoDepthWall = lado < 0 ? 'oeste' : 'leste';
    }
    /* Rampa de acesso: laje inclinada de 6 m. `rotation.x` inclina em torno de X, e o
       comprimento da laje é a HIPOTENUSA (√(6² + 1,85²)), senão sobra degrau na ponta.
       Sem colisor: quem manda na altura aqui é `groundHeightAt`, e um colisor com a
       AABB da laje inclinada bloquearia justamente quem está descendo por ela. */
    for (const r of RAMPAS.filter((x) => x.lado === lado)) {
      const L = Math.abs(r.zBaixo - r.zAlto), hip = Math.hypot(L, -CANAL_FUNDO);
      /* SINAL: rotação em X leva o local (0,0,L) para o mundo (y = −L·senθ, z = L·cosθ),
         logo dy/dz = −tanθ. A rampa quer dy/dz = FUNDO/Δz, então θ = atan2(−FUNDO, Δz).
         A primeira versão usava atan2(FUNDO, Δz) — a laje subia em vez de descer, e o
         map-check acusou 43 pontos com o corpo dentro dela (pior 1,398 m).
         E vai pelo LOTE (portanto por `aoBoxGeo`/`aoMat`) em vez de ser um `Mesh` cru:
         sem a normalização de UV do vao a laje herdava o `repeat` da textura de origem
         — pensado para um piso de 80 m — e o `texel-check` mediu ~3.000 px/m contra a
         mediana de 162 do mapa. */
      addBoxSB(RAMPA_X1 - RAMPA_X0, 0.22, hip, matParedeCanal,
        lado * (RAMPA_X0 + RAMPA_X1) / 2, CANAL_FUNDO / 2 - 0.22, (r.zAlto + r.zBaixo) / 2,
        { collide: false, skirt: false, rx: Math.atan2(-CANAL_FUNDO, r.zBaixo - r.zAlto) });
      // Mureta baixa do lado do vão: a rampa é uma calçada, não um trampolim.
      addBox(0.22, 0.5, hip * 0.94, matReboco, lado * (RAMPA_X0 + 0.11), CANAL_FUNDO / 2 - 0.2, (r.zAlto + r.zBaixo) / 2,
        { collide: false, skirt: false });
    }
  }
  for (const x of [CANAL_X0 - 0.18, CANAL_X1 + 0.18]) addBox(0.36, 0.08, HALF_Z * 2, matLimo, x, -0.04, 0, { collide: false, cast: false });
  /* Limo na linha d'água, 1,7 m abaixo do passeio — em foto_001 é a faixa escura que
     marca até onde o córrego sobe quando chove. */
  for (const x of [CANAL_X0 + 0.06, CANAL_X1 - 0.06]) addBox(0.12, 0.5, HALF_Z * 2 - 2, matLimo, x, CANAL_AGUA - 0.1, 0, { collide: false, cast: false, skirt: false });
  // Espuma, sacolas e garrafas quebram a lâmina reta; tudo flutua sem colisão.
  const espuma = lam({ color: 0xf0ecd3, emissive: 0x4b4a35, emissiveIntensity: .28, transparent: true, opacity: 0.9, roughness: 0.72 });
  for (const [x, z, w, d, ry] of [[-1.2,-31,3.2,.82,.3],[1.35,-25,2.7,.7,-.4],[-.65,-16,3.5,.78,.15],[1.2,-9,2.9,.72,-.25],[-1.2,7,3.4,.76,.2],[1.05,15,3.2,.82,-.15],[-.8,28,3.1,.74,.35]])
    addBox(w, 0.018, d, espuma, x, CANAL_AGUA + 0.02, z, { collide: false, cast: false, skirt: false, ry });
  for (const [x,z,s] of [[-2.8,-19,.5],[2.7,-12,.42],[-2.9,12,.48],[2.85,24,.4]]) {
    const bolha = new THREE.Mesh(new THREE.CircleGeometry(s, 12), espuma);
    bolha.rotation.x = -Math.PI / 2; bolha.position.set(x, CANAL_AGUA + 0.06, z); root.add(bolha);
  }
  // sacola e garrafa boiando: o grão do engradado dá vinco de plástico amassado
  const lixoAgua = [0xc74c36, 0xe0d59a, 0x47709a, 0xddd7c9, 0x5b7546].map(color => lam({ map: T.crate, color, roughness: 0.82 }));
  for (const [i, x, z, ry] of [[0,-1.8,-27,.5],[1,1.6,-18,-.3],[2,-1.1,-9,.8],[3,1.8,5,-.7],[4,-1.5,13,.4],[0,1.2,26,-.5]])
    addBox(0.32, 0.045, 0.18, lixoAgua[i], x, CANAL_AGUA + 0.04, z, { collide: false, cast: false, skirt: false, ry });
  /* NÃO existe mais colisor enchendo o vão do córrego. Ele era a linha
       col(CORREGO_X0, CORREGO_X1, −2,0, −0,12, −HALF_Z+6, HALF_Z−6)
     e era a causa direta do "quando se cai trava": o piso do canal ficava DENTRO
     dele. Quem segura o corpo agora são as paredes verticais, e o vão é vazio. */
  // ALAGADO nas pontas (não tem colisor — anda por cima, só é visual de água rasa)
  // norte
  addFloor(CORREGO_W + 4, 6, 0, -HALF_Z + 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  addFloor(CORREGO_W + 4, 6, 0, HALF_Z - 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  // remover colisor do córrego nos trechos alagados (substituir por chão andável)
  // — o col() acima já exclui as 6m de cada ponta ([-HALF_Z+6, HALF_Z-6])
  // Escadarias de contenção: descem da margem até a lâmina rasa nas duas pontas.
  for (const sz of [-1, 1]) for (let i = 0; i < 4; i++) {
    addBox(1.8, 0.04, 0.34, matConcretoFino, sz * (3.55 - i * 0.42), -i * 0.11, sz < 0 ? -36.2 : 36.2,
      { collide: false, skirt: false });
  }
  /* ASSOREAMENTO DAS PONTAS — o canal não termina num degrau de 1,85 m.
     Nas duas pontas o fundo sobe até o alagado raso: é onde o córrego "sai" da calha,
     e é a quinta e a sexta saída do canal (as outras quatro são as rampas). Sem isto
     quem andasse pelo fundo bateria numa parede invisível em |z| = 32.
     32° de inclinação: dentro do DEGRAU de 0,30 m por 0,25 m da grade do map-check, ou
     seja, a sonda de alcançabilidade sobe por aqui de verdade. */
  const matAssoreado = lam({ map: T.dirt, color: 0x6b6350, roughness: 1 });
  for (const sz of [-1, 1]) {
    const L = 3.4, hip = Math.hypot(L, -CANAL_FUNDO + 0.05);
    addBoxSB(CANAL_ABERTURA, 0.24, hip, matAssoreado, 0, (CANAL_FUNDO + 0.05) / 2 - 0.24, sz * 33.4,
      { collide: false, skirt: false, rx: -sz * Math.atan2(0.05 - CANAL_FUNDO, L) });   // mesmo sinal da rampa
  }

  /* ===================== JACARÉ (decoração no córrego) ===================== */
  {
    const jx = 0.8, jz = -7;
    const gJacare = new THREE.Group();
    /* O jacaré era o pior bicho do mapa: crânio e focinho eram BoxGeometry, e caixa
       não tem a única coisa que identifica um jacaré à distância — o focinho LONGO,
       BAIXO e AFUNILADO. Medido antes, 35% da área do bicho era caixa; a régua
       corrego-superficie-check cobra ≤ 12%.
       Aqui o crânio vira esfera achatada, o focinho e a mandíbula viram cilindros
       afunilados (raio da ponta menor que o da base) e a boca ganha dentes, que é o
       que devolve a leitura de réptil sem passar de 30 malhas.
       O COURO CONTINUA EM COR PURA, e isso é decisão medida, não esquecimento:
       tentei o grão do concreto tingido de verde e o texel-check saltou de 2,9× para
       266× de dispersão (TEXEL3b). Textura que tila é feita para superfície plana de
       tamanho conhecido; num bicho as peças variam de 0,02 m² (escudo dorsal) a 7 m²
       (tronco) com UV 0→1, então um material compartilhado espalha a densidade por
       duas ordens de grandeza. Pele de animal precisa de textura COM UV PRÓPRIA — ou
       seja, de asset real (ver o relatório). Cor pura é o estado honesto até lá. */
    const matJ = lam({ color: 0x5d7040, roughness: .92 });
    const matBarriga = lam({ color: 0x939a6a, roughness: 1 });
    const matOlho = lam({ color: 0xe7c84b, emissive: 0x574200, emissiveIntensity: .35 });
    // escudo lateral: um tom acima do couro, para a fileira aparecer sem virar listra
    const matEscudo = lam({ color: 0x7f8f55, roughness: .85 });
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(.58, 14, 8), matJ);
    corpo.scale.set(1.15,.48,2.25); corpo.position.z = -.25; gJacare.add(corpo);
    // crânio: esfera achatada, testa arredondada e mais estreita que o tronco
    const cab = new THREE.Mesh(new THREE.SphereGeometry(.47, 14, 9), matJ);
    cab.scale.set(.98,.40,1.02); cab.position.set(0,.05,1.16); gJacare.add(cab);
    /* Focinho: CylinderGeometry com o raio da PONTA menor que o da BASE — é o
       afunilamento que a caixa não tinha. O eixo do cilindro é Y; `rotation.x =
       +PI/2` leva +Y para +Z (frente), então o topo estreito fica na ponta da fuça
       e não no crânio. O `scale.z` local vai para o eixo vertical do mundo depois da
       rotação, e é ele que achata a fuça: jacaré tem focinho baixo, não tubo. */
    const foc = new THREE.Mesh(new THREE.CylinderGeometry(.20,.34,1.30,12), matJ);
    foc.rotation.x = Math.PI / 2; foc.scale.set(1,1,.52); foc.position.set(0,.02,2.05); gJacare.add(foc);
    // mandíbula: mais estreita e mais baixa, e desce ABAIXO da linha do focinho —
    // é o degrau entre as duas que devolve "boca" no lugar de bloco único.
    const jaw = new THREE.Mesh(new THREE.CylinderGeometry(.17,.29,1.16,10), matBarriga);
    jaw.rotation.x = Math.PI / 2; jaw.scale.set(.94,1,.30); jaw.position.set(0,-.15,1.98); gJacare.add(jaw);
    for (const ex of [-.075,.075]) {
      const nar = new THREE.Mesh(new THREE.SphereGeometry(.038,6,5), matJ);
      nar.scale.set(1,.6,1); nar.position.set(ex,.10,2.58); gJacare.add(nar);
    }
    /* Escudo lateral: fica NA BORDA da silhueta do tronco (meia-largura .667), que é
       a única posição em que peça pequena de bicho aparece de fato. Dente foi tentado
       e descartado — em qualquer posição plausível ele nasce dentro da mandíbula ou
       do focinho, e cone branco escondido é custo sem imagem. */
    for (const [sx, sz] of [[-1,-1.15],[1,-1.15],[-1,-.35],[1,-.35],[-1,.45],[1,.45]]) {
      const esc = new THREE.Mesh(new THREE.SphereGeometry(.10,7,5), matEscudo);
      esc.scale.set(.45,.42,1.05); esc.position.set(sx * .60, -.02, sz); gJacare.add(esc);
    }
    const cauda = new THREE.Mesh(new THREE.ConeGeometry(.42,2.45,10), matJ);
    cauda.rotation.x = -Math.PI / 2; cauda.position.set(.12,-.03,-2.35); gJacare.add(cauda);
    for (const [lx,lz,rz] of [[-.58,.45,-.45],[.58,.45,.45],[-.56,-.75,.5],[.56,-.75,-.5]]) {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.72,7), matJ);
      pata.rotation.z = rz; pata.position.set(lx,-.2,lz); gJacare.add(pata);
    }
    for (const ex of [-.28,.28]) {
      const ol = new THREE.Mesh(new THREE.SphereGeometry(.09,8,6), matOlho); ol.position.set(ex,.28,1.45); gJacare.add(ol);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(.035,6,4), matPupila); pup.position.set(ex,.31,1.52); gJacare.add(pup);
    }
    // crista dorsal irregular: escudo igual em fila lê como serra de brinquedo
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(.08,.2,5), matJ);
      const k = 1 - Math.abs(i - 3) * .11;
      d.scale.set(k, k, k); d.position.set(((i % 2) ? .035 : -.03), .35, -1.2 + i * .36); gJacare.add(d);
    }
    gJacare.scale.set(1.05,1.05,1.05);
    // O canal tem fundo agora: o jacaré deitou nele, meio submerso na lâmina rasa.
    gJacare.position.set(jx, CANAL_AGUA - .18, jz); gJacare.rotation.y = .22;
    gJacare.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    // Entra no censo de fauna do corrego-contract-check junto com capivara e ratos:
    // ele não tem collider nenhum (nada aqui passa por addBox), e era o único bicho
    // do mapa que nenhuma régua olhava.
    gJacare.userData.fauna = 'jacare'; gJacare.userData.nonCollider = true;
    root.add(gJacare);
  }

  /* ===================== CAPIVARA (na margem alagada sul) ===================== */
  {
    const cx = -5.2, cz = -38;
    const gCap = new THREE.Group();
    // Cor pura de propósito, pelo mesmo motivo do jacaré: textura que tila espalha a
    // densidade de texel por duas ordens de grandeza num bicho (TEXEL3b). Pelo de
    // capivara pede textura com UV própria, que é asset real e não existe aqui.
    const matC = lam({ color: 0x6a4a3a, roughness: 0.9 });
    // Barril afunilado contínuo: o eixo do CylinderGeometry vira longitudinal.
    // O estado anterior (esfera + caixa + cilindros-pino) foi reprovado no pixel
    // mesmo com escala correta; as peças abaixo se sobrepõem de propósito na junta.
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(.43,.48,1.25,16,2), matC);
    corpo.rotation.x = Math.PI / 2; corpo.position.set(0,-.01,-.16);
    corpo.userData.capivaraPart='rounded-body-core'; gCap.add(corpo);
    for(const z of [-.78,.46]) {
      const tampa=new THREE.Mesh(new THREE.SphereGeometry(.47,14,9),matC);
      tampa.scale.set(1,.91,.58); tampa.position.set(0,-.01,z);
      tampa.userData.capivaraPart='body-cap'; gCap.add(tampa);
    }
    const garupa = new THREE.Mesh(new THREE.SphereGeometry(.44,12,8),matC);
    garupa.scale.set(1.04,.96,.72); garupa.position.set(0,.08,-.72);
    garupa.userData.capivaraPart='raised-rump'; gCap.add(garupa);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(.38,14,9), matC);
    cab.scale.set(1,.8,.92); cab.position.set(0,.06,.70);
    cab.userData.capivaraPart='blunt-head'; gCap.add(cab);
    const focinho = new THREE.Mesh(new THREE.SphereGeometry(.23,12,8), matC);
    focinho.scale.set(1,.72,.58); focinho.position.set(0,-.02,1.04);
    focinho.userData.capivaraPart='blunt-muzzle'; gCap.add(focinho);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(.075,8,5), matFocinhoCap); nariz.position.set(0,-.01,1.18); gCap.add(nariz);
    for (const ex of [-.22,.22]) { const olho = new THREE.Mesh(new THREE.SphereGeometry(.048,7,5), matOlhoEscuro); olho.position.set(ex,.27,.78); olho.userData.capivaraPart='high-eyes'; gCap.add(olho); }
    for (const ex of [-0.21, 0.21]) { const orelha = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), matC); orelha.scale.set(1,.45,.72); orelha.position.set(ex,.34,.52); orelha.userData.capivaraPart='high-ears'; gCap.add(orelha); }
    // A tomada lateral olha ao longo de X: quatro Z distintos evitam que os pares
    // dianteiro/traseiro se fundam em apenas dois apoios no pixel.
    for (const [lx, lz] of [[-0.3, -0.30], [0.3, -1.05], [-0.3, 0.20], [0.3, 1.0]]) {
      const perna = new THREE.Mesh(new THREE.CylinderGeometry(.065,.085,.24,8), matC);
      perna.position.set(lx,-.43,lz); perna.userData.capivaraPart='short-leg'; gCap.add(perna);
      const pata = new THREE.Mesh(new THREE.SphereGeometry(.10,8,6), matC);
      pata.scale.set(.78,.42,.82); pata.position.set(lx,-.575,lz+.018);
      pata.userData.capivaraPart='rounded-foot'; gCap.add(pata);
    }
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(1.0,20),lam({ color:0x15130f,transparent:true,opacity:.38,depthWrite:false }));
    sombra.rotation.x=-Math.PI/2; sombra.scale.set(.62,1.05,1); sombra.position.y=-.63;
    sombra.userData.capivaraPart='contact-shadow'; sombra.userData.nonSolidSurface=true; gCap.add(sombra);
    // 45% da escala reprovada: comprimento 3,94 → ~1,78 m. A posição deixa folga
    // real para o pneu em (-6,-36), sem tirar a capivara da margem oeste alagada.
    gCap.scale.set(.665, .665, .665);
    gCap.position.set(cx, .43, cz);
    // Três-quartos leve + passada escalonada: os quatro apoios aparecem na tomada
    // lateral, sem deslocar o animal da margem nem alongar as pernas.
    gCap.rotation.y = .35;
    gCap.userData.fauna = 'capivara';
    gCap.userData.nonCollider = true;
    gCap.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    root.add(gCap);
  }
  // Contexto material do trio: manilha e sacos no canto evitam a leitura de três
  // objetos soltos no meio de uma esplanada limpa.
  {
    const contexto = new THREE.Group(); contexto.position.set(-18.05,0,-3.05);
    contexto.userData.corregoRatContext='manilha-e-lixo';
    const concretoManilha=lam({color:0x77726a,roughness:1});
    const tubo=new THREE.Mesh(new THREE.TorusGeometry(.34,.075,7,14,Math.PI*1.55),concretoManilha);
    tubo.rotation.y=Math.PI/2; tubo.position.set(-.78,.34,.12); tubo.userData.nonSolidSurface=true; contexto.add(tubo);
    for(const [x,z,s,c] of [[.35,.28,.42,0x252925],[.72,-.12,.34,0x3d4435],[.18,-.42,.3,0x24211f]]) {
      const saco=new THREE.Mesh(new THREE.DodecahedronGeometry(s,1),lam({color:c,roughness:1}));
      saco.scale.set(.75,1,.62); saco.position.set(x,s*.62,z); saco.userData.nonSolidSurface=true; contexto.add(saco);
    }
    root.add(contexto);
  }
  /* ===================== PONTES DE MADEIRA =====================
     3 pontes cruzando o córrego. Cada uma é um tablado de madeira a y=0.1. */
  function ponte(z, largura = 3, comGuarda = false) {
    // Colisão contínua invisível mantém a rota justa; a malha servida são tábuas
    // independentes com lacunas, empeno e desalinhamento. O tablado é colisor de CORPO
    // apenas — occluder são as tábuas (a bala enxerga as lacunas que o olho enxerga).
    const matMadeira = TEX.wall || lam({ color: 0x8a6a4a, roughness: 0.9 });
    const tablado = addBox(CORREGO_W + 2, .18, largura, new THREE.MeshBasicMaterial({visible:false}), 0, 0, z,{skirt:false,collide:false});
    colRot(0, z, (CORREGO_W + 2) / 2, largura / 2, 0, .18, 0);
    tablado.userData.bridgeReadable = `ponte-${z}`; tablado.userData.grounded = true;
    tablado.userData.corregoBridgeCollider=z===-22?'norte':`ponte-${z}`;
    let i=0;
    for(let bx=-5.55;bx<=5.55;bx+=.74,i++) {
      if(z===-22&&(i===4||i===11)) continue;
      const y=.035+(i%3)*.022, dz=((i%4)-1.5)*.065, d=largura-.16-(i%3)*.09;
      const board=addBox(.64,.16,d,matMadeira,bx,y,z+dz,{collide:false,skirt:false,ry:(i%2?1:-1)*.012});
      board.userData.corregoBridgeBoard=z===-22?'norte':`ponte-${z}`;
      occluders.push(board);
    }
    // Estaca e guarda-corpo são madeira bruta como o tablado; antes eram cor pura,
    // e `lam()` dentro do laço criava um material novo por peça (6 e 2 materiais).
    for (const x of [-CORREGO_W/2-.65,CORREGO_W/2+.65])
      addBox(.18,.42,largura-.18,matMadeiraBruta,x,-.2,z,{ collide:false,cast:false });
    // guarda-corpo opcional
    if (comGuarda) {
      for (const gx of [CORREGO_X0 - 1.15, CORREGO_X1 + 1.15]) {
        addBox(0.08, 0.9, largura, matMadeiraBruta, gx, 0.15, z);
      }
    }
  }
  ponte(-22, 3.0, true);    // norte: larga, com guarda-corpo (rota principal)
  ponte(0, 1.8, false);     // central: estreita, sem guarda (risco)
  ponte(22, 3.0, false);    // sul: passagem coberta por uma palafita
  addBox(CORREGO_W + 2.8, 0.12, 3.8, TEX.zinco || lam({ color: 0x77746d }), 0, 2.5, 22);
  for (const px of [-3.6, 3.6]) addBox(0.16, 2.5, 0.16, TEX.concrete, px, 0, 22);

  /* ═══════════════════ A FAVELA ═══════════════════════════════════════════════
     O QUE ESTAVA ERRADO, e é uma coisa só: 26 caixas soltas em duas fileiras retas,
     de 5 a 7 m uma da outra, todas com 3 a 4 m de altura, todas de esquadro, todas
     com a mesma prancha de madeira. Da posição de spawn (x = ±21) o jogador via um
     corredor de asfalto vazio e um muro de 3 m coberto de cartaz. É o "SEM DENSIDADE
     DE FAVELA E BECOS DIREITO, SEM DETALHES" do dono, e o `foto-vs-render` diz a
     mesma coisa em número: `juncao_dens` (densidade de junção — quantos pontos da
     imagem têm 3+ orientações de aresta se cruzando) a −2,3 sigmas da fotografia.
     É o ÚNICO descritor em que os 10 mapas ficam abaixo de TODAS as 18 fotos.

     O QUE AS 18 FOTOS TÊM E ISTO NÃO TINHA (`references/favela/fotos-reais/`)
       foto_063 (beco visto de cima) — é a foto que define o problema: dois PLANOS DE
         TELHADO se sobrepõem em quase todo pixel, cada um num ângulo diferente, e o
         beco tem 2 m entre paredes de 6 a 8 m. Densidade de junção não vem de "mais
         objetos"; vem de PLANO NA FRENTE DE PLANO.
       foto_001 (o córrego) — as casas ficam EM CIMA da parede do canal, e a parede
         delas é o próprio muro de arrimo; mãos-francesas de madeira saem da parede
         sobre a água; laje com ferro de espera; a faixa horizontal de reboco cinza
         embaixo e tijolo aparente acima.
       foto_005 — casas ESCALONADAS, cada uma um pouco girada em relação à vizinha,
         pilar de concreto aparente cortando a alvenaria.
       foto_040 (beco com escada) — 1,5 m entre paredes pintadas de verde/amarelo,
         caixa d'água azul na laje, poste com prumada de canos.
       foto_012 — beiral avançando 1 m sobre a rua, varal atravessado na frente.

     A TRADUÇÃO EM PLANTA (por margem; a oeste tem o mesmo esquema com deslocamento
     de z, para as duas não lerem como espelho):
       |x| 5,0 → 6,8   passeio da beira do canal (1,8 m entre a queda e a parede)
       |x| 6,8 → 12,4  FILEIRA A, de 2 a 3 lajes, fundos sobre o canal
       |x| 12,4 → 14,2 BECO 1 (1,8 m, paredes de 6 a 9 m dos dois lados)
       |x| 14,2 → 19,0 FILEIRA B, de 2 a 3 lajes, sacadas avançando sobre o beco
       |x| 19,0 → 22,6 rua do spawn (3,6 m)
       |x| 22,6 → 23,8 FILEIRA C, barracos encostados no muro externo
     e becos TRANSVERSAIS ligando os três eixos, senão a margem vira dois corredores
     paralelos sem escolha.

     CUSTO — e este é o motivo de tudo aqui passar por `StaticBatch`. Medido ANTES:
     559 malhas visíveis para 16.168 triângulos, ou seja ~559 draw calls no passe
     principal + 341 no de sombra, contra o teto documentado de 300-800. O mapa já
     estava estourado sem ter geometria nenhuma — 559 chamadas para 16 mil triângulos
     é a definição de "muito caixa". Uma casa desta rodada tem ~14 peças; 40 casas à
     moda antiga seriam +560 chamadas. Com o lote estático, TODA a alvenaria do mapa
     vira ~1 chamada POR MATERIAL. Ver o número medido no fim do arquivo. */
  /* ÂNGULOS — tabela EXPLÍCITA, não sorteio.
     O portão cobra ≥ 20 ângulos DISTINTOS (arredondados ao grau, dobrados em 0-45°
     porque caixa é simétrica a cada 90°) e ≥ 15% da massa fora da grade de 3°.
     Sorteio uniforme não GARANTE 20 valores distintos: dois sorteios caem no mesmo
     grau e o número passa a depender da semente. Aqui cada peça recebe um grau seu,
     e a tabela é a prova de que o número não veio de sorte.

     Duas tabelas, e a separação é geométrica, não cosmética: casa de fileira só pode
     girar pouco, senão a AABB dela come o beco de 1,8 m (uma caixa de 4,4 × 5,4 m a
     28° cresce 1,2 m de cada lado). Quem carrega os ângulos grandes é o que é pequeno
     e realmente nasce torto — puxadinho, barraco de fundo, tapume, banca. Somadas dão
     26 graus distintos.
     O sinal alterna: para o portão só |a| conta, mas para o olho o que importa é a
     fileira não pender toda para o mesmo lado. */
  const GRAUS_FILEIRA = [4, 6, 8, 9, 11, 12, 13, 5, 7, 10, 14, 3];
  const GRAUS_ANEXO = [16, 18, 20, 22, 24, 26, 28, 17, 19, 21, 23, 25, 27, 15];
  const RAD = Math.PI / 180;
  let _nF = 0, _nA = 0;
  const angFileira = () => { const i = _nF++; return GRAUS_FILEIRA[i % GRAUS_FILEIRA.length] * (i % 2 ? -1 : 1) * RAD; };
  const angAnexo = () => { const i = _nA++; return GRAUS_ANEXO[i % GRAUS_ANEXO.length] * (i % 2 ? -1 : 1) * RAD; };

  const PISO = 2.8;          // laje a laje, medido na proporção de foto_001/foto_063
  let _casa = 0;
  /* Uma casa = embasamento de reboco + corpo de alvenaria + 4 pilares + faixa de laje
     por pavimento + cobertura + beiral. Cada uma dessas peças existe porque aparece na
     fotografia E porque produz aresta numa orientação diferente da caixa. */
  function casa(x, z, w, d, andares, opts = {}) {
    const i = _casa++;
    const ry = opts.ry !== undefined ? opts.ry : angFileira();
    const h = andares * PISO;
    const mur = MURO[(i * 5 + andares) % MURO.length];
    const cs = Math.cos(ry), sn = Math.sin(ry);
    // ponto no referencial da casa → mundo
    const px = (a, b) => x + a * cs + b * sn;
    const pz = (a, b) => z - a * sn + b * cs;

    // (1) EMBASAMENTO — a faixa de reboco cinza da base. É a assinatura de foto_001.
    addBoxSB(w + 0.16, 1.05, d + 0.16, opts.baseSuja ? matRebocoSujo : matReboco, x, 0, z, { ry, skirt: false });
    // (2) CORPO — alvenaria. O último pavimento fica em tijolo CRU (obra parada).
    addBoxSB(w, Math.max(0.9, h - 1.05) - (andares > 1 ? PISO : 0), d, mur, x, 1.05, z, { ry, skirt: false });
    if (andares > 1) addBoxSB(w - 0.06, PISO, d - 0.06, opts.cru === false ? mur : matTijoloCru, x, h - PISO, z, { ry, skirt: false });
    solids.push({ x0: x - w / 2 - 0.4, x1: x + w / 2 + 0.4, z0: z - d / 2 - 0.4, z1: z + d / 2 + 0.4 });

    // (3) PILARES de concreto aparente nos quatro cantos, saindo 7 cm da alvenaria.
    for (const a of [-w / 2 + 0.14, w / 2 - 0.14]) for (const b of [-d / 2 + 0.14, d / 2 - 0.14])
      addBoxI(0.28, h + 0.12, 0.28, matPilar, px(a, b), 0, pz(a, b), { ry });
    // (4) FAIXA DE LAJE por pavimento: 12 cm avançando, é a linha horizontal de sombra.
    for (let k = 1; k < andares; k++)
      addBoxSB(w + 0.24, 0.18, d + 0.24, matReboco, x, k * PISO - 0.09, z, { ry, collide: false, skirt: false });

    // (5) COBERTURA. Duas famílias, e a alternância é o que impede a fileira de
    //     virar pente: telha ondulada em duas águas com BEIRAL LARGO (foto_012,
    //     foto_063), ou laje plana com platibanda e ferro de espera (foto_001).
    const beiral = 0.85 + (i % 3) * 0.18;
    if (i % 3 === 2) {
      // laje plana + platibanda: o topo fica utilizável e a silhueta fica reta
      addBoxSB(w + 0.3, 0.2, d + 0.3, matReboco, x, h, z, { ry, collide: false, skirt: false });
      for (const [a, b, ww, dd] of [[0, -d / 2, w + 0.3, 0.16], [0, d / 2, w + 0.3, 0.16], [-w / 2, 0, 0.16, d + 0.3], [w / 2, 0, 0.16, d + 0.3]])
        addBoxI(ww, 0.42, dd, matRebocoSujo, px(a, b), h + 0.2, pz(a, b), { ry });
      // ferro de espera: a obra "vai continuar". Está em quase toda foto.
      for (let k = 0; k < 5; k++) {
        const a = -w / 2 + 0.4 + k * (w - 0.8) / 4, b = (k % 2 ? -1 : 1) * (d / 2 - 0.35);
        addBoxI(0.05, 0.62 + (k % 3) * 0.16, 0.05, matVerga, px(a, b), h + 0.2, pz(a, b), { ry: ry + k * 0.2, cast: false });
      }
    } else {
      // duas águas em telha ondulada, com o beiral avançando sobre o beco
      const incl = 0.19 + (i % 4) * 0.035;
      for (const lado of [-1, 1])
        addPlacaSB(w * 0.58 + beiral, 0.1, d + beiral * 1.4, TEX.zinco,
          px(lado * w * 0.25, 0), h + 0.3, pz(lado * w * 0.25, 0), ry, lado * incl);
      // cumeeira: a peça que fecha as duas águas e cria a terceira orientação
      addPlacaSB(0.34, 0.12, d + beiral * 1.4, matRebocoSujo, x, h + 0.55, z, ry, 0);
    }

    // (6) CAIXA D'ÁGUA sobre cavalete — azul de polietileno, foto_040.
    if (i % 3 !== 1) {
      const a = w / 4, b = -d / 4;
      for (const [ca, cb] of [[a - 0.5, b - 0.5], [a + 0.5, b - 0.5], [a - 0.5, b + 0.5], [a + 0.5, b + 0.5]])
        addBoxI(0.1, 0.55, 0.1, matRipa, px(ca, cb), h + 0.4, pz(ca, cb), { ry, cast: false });
      addBoxI(1.35, 1.3, 1.35, matCaixaAgua, px(a, b), h + 0.95, pz(a, b), { ry: ry + 0.25 });
    }
    // (7) ANTENA PARABÓLICA na quina da laje
    if (i % 4 === 0) {
      const a = -w / 3, b = d / 3;
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.44, 8, 4, 0, Math.PI), matParabolica);
      dish.position.set(px(a, b), h + 1.0, pz(a, b)); dish.rotation.set(-Math.PI / 3, ry, 0);
      root.add(dish);
      addBoxI(0.05, 0.55, 0.05, matVerga, px(a, b), h + 0.45, pz(a, b), { ry, cast: false });
    }
    // (8) JANELA E PORTA: vãos escuros recuados. Baratos e são o que dá ESCALA à
    //     parede — sem eles um bloco de 8 m lê como muro, não como prédio de 3 lajes.
    for (let k = 0; k < andares; k++) {
      const yv = k * PISO + 1.15;
      for (const s of [-1, 1]) {
        addBoxSB(0.1, 1.0, 1.0, matVao, px(s * (w / 2 + 0.02), (k % 2 ? 0.9 : -0.9)), yv, pz(s * (w / 2 + 0.02), (k % 2 ? 0.9 : -0.9)), { ry, collide: false, skirt: false, cast: false });
        addBoxI(0.14, 0.12, 1.2, matConcretoFino, px(s * (w / 2 + 0.04), (k % 2 ? 0.9 : -0.9)), yv + 1.0, pz(s * (w / 2 + 0.04), (k % 2 ? 0.9 : -0.9)), { ry, cast: false });
      }
      addBoxSB(1.0, 1.0, 0.1, matVao, px(0.6, d / 2 + 0.02), yv, pz(0.6, d / 2 + 0.02), { ry, collide: false, skirt: false, cast: false });
    }
    return { ry, h };
  }

  /* PUXADINHO — anexo pequeno, torto de verdade (tabela de ângulo grande), telhado
     próprio numa inclinação diferente da casa vizinha. É a peça que mais rende em
     `juncao_dens` por metro cúbico: dois telhados quase encostados em ângulos
     diferentes produzem junção onde uma caixa sozinha produz uma aresta. */
  function puxadinho(x, z, w, d, h, opts = {}) {
    const ry = opts.ry !== undefined ? opts.ry : angAnexo();
    /* ALVENARIA POR PADRÃO, madeira em 1 de cada 4. A primeira versão sorteava meio a
       meio e o frame de spawn voltou a ser exatamente o que o dono reprovou: uma parede
       de tábua bege coberta de cartaz a 1,5 m do rosto. Nas 18 fotos a tábua aparece em
       remendo e em barraco isolado (foto_029, foto_012) — nunca como material dominante
       de uma fileira inteira. */
    const _sorte = Math.abs(Math.round(x * 3 + z * 7));
    /* E a madeira SAIU de vez do corpo do barraco. Segunda captura desta rodada: com
       1 em 4 de tábua, o quadro de um dos yaws ainda era `tex_madeira.webp` ocupando a
       tela inteira — uma mancha bege sem grão a 2 m do olho, que é literalmente o "sem
       textura nenhuma". Nas fotos o barraco leve é de CHAPA ONDULADA (foto_029,
       foto_012); a madeira aparece em ripa de remendo, e as ripas continuam aqui logo
       abaixo. Chapa 1 em 4, alvenaria no resto. */
    const mat = opts.mat || (_sorte % 4 === 0 ? TEX.zinco : MURO[_sorte % MURO.length]);
    addBoxSB(w, h, d, mat, x, opts.y || 0, z, { ry, skirt: opts.y ? false : undefined });
    addPlacaSB(w + 0.7, 0.09, d + 0.6, TEX.zinco, x, (opts.y || 0) + h + 0.16, z, ry + 0.12, 0.16 + (Math.abs(Math.round(x)) % 3) * 0.05);
    if (!opts.semTapume)
      for (let k = -1; k <= 1; k++)
        addBoxI(0.09, h * 0.7, d * 0.8, matMadeiraBruta, x + k * 0.5, (opts.y || 0) + h * 0.15, z + d * 0.5,
          { ry: ry + k * 0.09, cast: false });
    if (!opts.semSolido) solids.push({ x0: x - w / 2 - 0.3, x1: x + w / 2 + 0.3, z0: z - d / 2 - 0.3, z1: z + d / 2 + 0.3 });
  }

  /* ─── FILEIRAS ───────────────────────────────────────────────────────────────
     Os centros em z são DERIVADOS dos becos transversais, não escritos à mão. A
     primeira versão desta rodada escreveu a lista à mão com passo de 6,8 m e casas de
     até 6,5 m de profundidade — esquecendo que uma caixa de 4,8 × 6,5 m girada 14°
     ocupa 7,5 m em z, não 6,5. Os becos transversais nasceram com 0,3 m de vão, o
     grafo de waypoints partiu em 23 componentes desconexas e o `CTF2` do map-check foi
     a 0 rotas em TODOS os 8 pares spawn↔bandeira. Foi o defeito mais caro da rodada e
     é do tipo que só aparece medindo: no render as casas ficam bonitas.

     Agora o vão do beco é entrada da conta, e a fileira preenche o que sobra. */
  const BECOS_Z = [-21.0, -8.7, 11.1, 24.3];
  const SPAWN_Z = [-25, -5, 15, 35];   // usado pelo largo do spawn e pela fileira C
  const MEIO_BECO = 1.3;                       // metade do vão LIVRE do beco transversal
  function centrosFileira(meiaProf, dz) {
    const faixas = [];
    let a = -HALF_Z + 2.5;
    for (const b of BECOS_Z) { faixas.push([a, b + dz - MEIO_BECO - meiaProf]); a = b + dz + MEIO_BECO + meiaProf; }
    faixas.push([a, HALF_Z - 2.5]);
    const out = [];
    for (const [z0, z1] of faixas) {
      const L = z1 - z0;
      if (L < 2 * meiaProf) continue;
      const n = Math.max(1, Math.round(L / (2 * meiaProf + 0.25)));
      for (let i = 0; i < n; i++) out.push(z0 + meiaProf + (L - 2 * meiaProf) * (n === 1 ? 0.5 : i / (n - 1)));
    }
    return out;
  }
  /* meia-profundidade JÁ COM O GIRO: az = (w/2)·|sen ry| + (d/2)·|cos ry|, no pior
     ângulo da tabela de fileira (14°). A é mais funda que B de propósito — as duas
     fileiras não podem cair no mesmo passo, senão o beco 1 lê como corredor de hotel. */
  const MEIA_A = 3.15, MEIA_B = 2.80;
  for (const lado of [-1, 1]) {
    // deslocamento de z por margem: as duas fileiras não podem ser espelho uma da outra
    const dz = lado > 0 ? 0 : 3.7;
    const FILEIRA_A = centrosFileira(MEIA_A, dz), FILEIRA_B = centrosFileira(MEIA_B, dz);
    for (let i = 0; i < FILEIRA_A.length; i++) {
      const z = FILEIRA_A[i];
      if (Math.abs(z) > HALF_Z - 3) continue;
      const w = 4.0 + (i % 3) * 0.4, d = 4.4 + (i % 3) * 0.4;
      const andares = i % 4 === 1 ? 2 : (i % 5 === 0 ? 3 : 2) + (i % 7 === 3 ? 1 : 0);
      casa(lado * 9.75, z, w, d, Math.min(3, andares), { baseSuja: true });
    }
    for (let i = 0; i < FILEIRA_B.length; i++) {
      const z = FILEIRA_B[i];
      if (Math.abs(z) > HALF_Z - 3) continue;
      /* LARGO DO SPAWN — onde a fileira B cruza um ponto de spawn, ela NÃO é
         construída: a rua alarga de 3,1 m para 7,7 m e vira o largo onde o time
         nasce. Não é decisão de estética, é o `MAP2B`: ele mede a área ANDÁVEL
         CONTÍGUA num disco de 5 m de raio e cobra ≥ 40 m². Uma rua de 3,1 m atravessando
         esse disco entrega no máximo ~31 m² — medido exatamente isso (30,9) antes deste
         corte. Rua estreita é o objetivo do mapa; spawn em fresta é regressão. */
      if (SPAWN_Z.some((s) => Math.abs(z - s) < 4.2)) continue;
      const w = 3.0 + (i % 3) * 0.3, d = 4.0 + (i % 3) * 0.4;
      /* A FILEIRA DE DENTRO É A ALTA, e isso vem da fotografia: em foto_001 e foto_024 o
         que está na beira d'água é o barraco velho de 1-2 lajes, e o que sobe para 3-4
         lajes é o que está atrás, longe da cheia. É também o que resolve o ALT1 do
         portão (h90 ≥ 9 m) SEM inflar pé-direito: 3 lajes de 2,8 m dão 8,4 m e 4 dão
         11,2 m — dentro dos "9-12 m" que o próprio teto cita como referência. */
      const andares = i % 3 === 0 ? 4 : 3;
      const c = casa(lado * 16.95, z, w, d, andares);
      /* SACADA sobre o BECO 1 — volume do 2º pavimento avançando 1,2 m no vão. É o
         que a foto_063 mostra e o que a caixa isolada nunca dá: um plano PASSANDO
         POR CIMA do corredor por onde se anda. Fica a 3,9 m, acima da cabeça. */
      if (i % 2 === 0) {
        addBoxSB(1.3, 2.1, d * 0.7, MURO[(i + 3) % MURO.length], lado * (16.95 - (w / 2 + 0.6)), PISO + 0.4, z + 0.4,
          { ry: c.ry, collide: false, skirt: false });
        addPlacaSB(1.9, 0.09, d * 0.8, TEX.zinco, lado * (16.95 - (w / 2 + 0.9)), PISO + 2.6, z + 0.4, c.ry, lado * 0.2);
      }
      /* MARQUISE SOBRE A RUA. A tentativa anterior foi um puxadinho AVANÇANDO 1,4 m
         na rua para quebrar os 80 m de corredor reto; ele estrangulou a passagem para
         0,78 m entre a fileira C e o anexo, o `CTF2` caiu de 2 para 1 rota separada em
         4 pares e a folga do spawn foi a 1,4 m. Recorte que fecha rota é regressão.
         A marquise faz o mesmo recorte SEM tocar no chão: laje de 1,9 m saindo da
         fachada a 3,3 m de altura, com telha por cima. */
      if (i % 3 === 1) {
        addPlacaSB(1.9, 0.16, d * 0.9, matRebocoSujo, lado * 20.0, 3.3, z + 0.6, c.ry, lado * 0.06);
        for (const k of [-1, 1])
          addBoxI(0.12, 3.3, 0.12, matConcretoFino, lado * 20.7, 0, z + 0.6 + k * d * 0.35, { ry: c.ry, cast: false });
      }
    }
    /* ─── FILEIRA C · barracos encostados no muro externo ────────────────────
       Existe por uma razão jogável antes de estética: o spawn ficava de costas
       para 80 m de muro liso de 3 m coberto de cartaz, e era ESSE o quadro que o
       dono viu. Os vãos de z respeitam os quatro pontos de spawn (±25, ±5, 15, 35)
       com 3 m de folga, para o `MAP2B` (folga ≥ 1,2 m, área contígua ≥ 40 m²) não
       cair — spawn apertado é regressão, não densidade. */
    for (const z0 of [-37, -32, -20, -15, -10, 0, 5, 10, 21, 26, 31]) {
      const z = z0 + dz * 0.5;
      // a folga é medida no z FINAL, não no de partida — foi assim que um barraco
      // encostou no spawn oeste e o MAP2B foi a 0,75 m de folga (medido).
      if ([-25, -5, 15, 35].some((s) => Math.abs(z - s) < 3.6)) continue;
      /* ry pequeno de propósito: barraco encostado em muro nasce alinhado COM o muro, e
         um giro de 28° faria a caixa atravessar o muro externo e invadir a rua do spawn. */
      puxadinho(lado * 23.05, z, 1.0, 2.6 + (Math.abs(z0) % 3) * 0.4, 2.4 + (Math.abs(z0) % 4) * 0.45, { semTapume: true, ry: angAnexo() * 0.28 });
    }
    /* ─── BECOS TRANSVERSAIS ─────────────────────────────────────────────────
       Onde a fileira A tem um vão maior, o beco atravessa da beira do canal até a
       rua do spawn. Cada travessia recebe um PÓRTICO: laje ligando as duas casas
       por cima do beco, com 2,4 m de vão livre. É passagem coberta — a coisa que
       mais aparece nas fotos de beco e a que mais rende profundidade na imagem. */
    for (const z of BECOS_Z) {
      const zz = z + dz;
      addPlacaSB(9.0, 0.22, 2.0, matRebocoSujo, lado * 13.4, 3.9, zz, lado * 0.05, 0.02);
      for (const bx of [12.6, 14.2]) addBoxI(0.24, 3.9, 0.24, matPilar, lado * bx, 0, zz - 0.9, { ry: angAnexo() * 0.2 });
      // Telha solta cobrindo o resto do beco, mais baixa e noutro ângulo
      addPlacaSB(3.2, 0.08, 2.6, TEX.zinco, lado * 10.2, 3.35, zz + 1.2, lado * 0.09, 0.13);
    }
  }

  /* ─── PALAFITAS SOBRE O CANAL ────────────────────────────────────────────────
     Em foto_001 as casas não param na margem: elas AVANÇAM sobre a calha, apoiadas
     em estaca, com mão-francesa de madeira saindo da parede. É a leitura que dá
     nome ao mapa, e o vão embaixo continua atravessável (2,2 m livres). */
  /* |x| ≈ 5,4 e não 6,5: a palafita tem de AVANÇAR sobre a calha, e não ficar atrás
     dela. Com o centro em 6,5 a mão-francesa caía em x ≈ 4,2 — em cima do passeio, na
     altura do peito, sem colisor — e o map-check acusou o corpo dentro de geometria
     visível (1 ponto, 0,987 m). Com o centro em 5,4 a casa fica sobre o vão, a escora
     fica sobre a ÁGUA (onde o piso está 1,75 m abaixo e ninguém encosta a cabeça) e o
     passeio da beira passa POR BAIXO dela, entre as estacas — que é a foto_001. */
  for (const [x, z, w, d, h] of [
    [-5.4, -27, 4.4, 4.2, 3.1], [5.5, -19, 4.6, 4.4, 3.4],
    [-5.6, 18, 4.5, 4.0, 3.0], [5.3, 24, 4.3, 4.6, 3.6],
    [-5.2, 4.5, 4.4, 4.2, 3.2], [5.45, -34, 4.2, 4.0, 3.0],
  ]) {
    const ry = angAnexo(), baseY = 2.2;
    for (const px2 of [-w * .40, w * .40]) for (const pz2 of [-d * .40, d * .40])
      addBoxI(.18, baseY, .18, matPilar, x + px2, 0, z + pz2, { ry, collide: true });
    addBoxSB(w, h - 0.4, d, MURO[Math.abs(Math.round(x + z)) % MURO.length], x, baseY, z, { skirt: false, ry });
    for (const lado of [-1, 1])
      addPlacaSB(w * 0.6 + 0.7, 0.09, d + 0.8, TEX.zinco, x + lado * w * 0.25, baseY + h - 0.1, z, ry, lado * 0.21);
    /* Mão-francesa: escora diagonal saindo da parede do canal para segurar o
       puxadinho. Diagonal pura — nenhuma outra peça do mapa tem esta orientação,
       e é justamente aresta oblíqua que o `obliqua_10`/`juncao_dens` medem. */
    for (let k = -1; k <= 1; k++)
      addPlacaSB(0.12, 0.12, 2.4, matRipa, x - Math.sign(x) * (w / 2 + 0.5), baseY - 0.5, z + k * (d / 3), ry, 0, 0.72);
    // Tapume de compensado remendando a fachada que dá para a água
    for (let k = -1; k <= 1; k++)
      addBoxI(0.09, 1.3 + (k & 1) * 0.4, d * 0.62, TEX.wall, x - Math.sign(x) * (w / 2 + 0.06), baseY + 0.4, z + k * 1.2,
        { ry: ry + k * 0.05 });
  }

  /* ─── ENTULHO: O QUE ENCHE O CANAL E O BECO ──────────────────────────────────
     Duas razões, e as duas são medidas.

     (a) FOTOGRAFIA. Em foto_029 e foto_001 não existe um metro quadrado de chão
         limpo: manilha de concreto largada, tambor, pilha de tijolo, entulho de obra,
         carcaça de eletrodoméstico. "SEM DETALHES" é literalmente isto.
     (b) RÉGUA. Abrir o fundo do canal acrescentou ~430 m² de chão andável SEM UMA
         PEÇA DE COBERTURA, e o `MAP5` do map-check (densidade de prop por quadrante)
         saltou de 6,8 m de espaçamento para 10,6 m, contra um teto de 7. Corredor
         de 80 m sem nada onde se abrigar é galeria de tiro, não rota.

     Tudo entra no lote estático; o colisor de cada peça tem ≥ 0,60 m de altura útil,
     que é o que o MAP5 conta como prop, e é também o que serve de cover de agachado. */
  /* REPEAT CALCULADO, não herdado. Estes dois são CILINDROS e não passam pelo
     `aoBoxGeo`/`aoMat` — ou seja, ninguém normaliza a UV deles pelo tamanho de mundo, e
     eles herdariam o `repeat` da textura de origem (pensada para um piso). Medido: a
     manilha ficou a 876 px/m contra a mediana de 204 do mapa e era o pico que segurava o
     TEXEL3b em 4,3× (teto 4×). A UV de um cilindro do three vai de 0 a 1 na
     circunferência e de 0 a 1 na altura, então basta repeat = ALVO_PXM × medida ÷ 512
     (as três texturas do mapa são 512²; conferido no disco). ALVO_PXM = 128, manilha
     Ø 1,10 m (circunferência 3,46 m) × 1,50 m de comprimento; tambor Ø 0,60 m
     (circunferência 1,88 m) × 0,88 m. */
  const repetir = (tex, u, v) => { if (!tex) return null; const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(u, v); return t; };
  const matManilha = lam({ map: repetir(TEX.concrete.map, 0.87, 0.38) || T.concrete, color: 0x8a867c, roughness: 0.98 });
  const matTambor = lam({ map: repetir(T.metal, 0.47, 0.22) || T.metal, color: 0x7a5a3c, metalness: 0.3, roughness: 0.85 });
  const matEntulho = lam({ map: TEX.concrete.map || T.concrete, color: 0x9a8f7e, roughness: 1 });
  const geoManilha = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12, 1, true);
  const geoTambor = new THREE.CylinderGeometry(0.3, 0.3, 0.88, 10);
  function pecaSB(geo, mat, x, y, z, ry, rx = 0) {
    _eul.set(rx, ry, 0, 'YXZ');
    _mtx.makeRotationFromEuler(_eul).setPosition(x, y, z);
    SB.add(geo, _mtx, mat, { cast: true, receive: true });
  }
  /* Manilha DEITADA: cilindro tombado, que é como ela sempre está. `rotation.x = π/2`
     põe o eixo na horizontal; o colisor é a AABB dela (1,5 × 1,1), altura útil 1,1 m. */
  function manilha(x, z, ry, base) {
    pecaSB(geoManilha, matManilha, x, base + 0.55, z, ry, Math.PI / 2);
    colRot(x, z, 0.75, 0.55, base, base + 1.1, ry);
  }
  function tambor(x, z, base) { pecaSB(geoTambor, matTambor, x, base + 0.44, z, 0); colRot(x, z, 0.3, 0.3, base, base + 0.88, 0); }
  // pilha de tijolo: 3 fiadas desencontradas — três orientações, não uma caixa
  function pilhaTijolo(x, z, ry, base) {
    for (let k = 0; k < 3; k++)
      addBoxI(1.1 - k * 0.14, 0.3, 0.8 - k * 0.1, matTijoloCru, x + k * 0.06, base + k * 0.3, z - k * 0.05, { ry: ry + k * 0.14 });
    colRot(x, z, 0.62, 0.46, base, base + 0.9, ry);
  }
  function entulho(x, z, ry, base, h) {
    addBoxI(1.5, h, 1.2, matEntulho, x, base, z, { ry, collide: true });
    addBoxI(0.7, 0.5, 0.9, matEntulho, x + 0.5, base + h, z - 0.3, { ry: ry + 0.5 });
  }
  /* NO FUNDO DO CANAL. Encostadas nas paredes (|x| ≥ 1,7) para o corredor central
     continuar passável, e distribuídas nos 80 m para nenhum quadrante ficar deserto. */
  for (let k = 0; k < 22; k++) {
    const z = -35 + k * 3.3, lado = k % 2 ? 1 : -1, x = lado * (1.75 + (k % 3) * 0.25);
    const base = Math.abs(z) > 32 ? CANAL_FUNDO + (Math.abs(z) - 32) / 3 * 1.8 : CANAL_FUNDO;
    if (Math.abs(z) > 33.5) continue;
    if (k % 4 === 0) manilha(x, z, angAnexo(), base);
    else if (k % 4 === 1) entulho(x, z, angAnexo(), base, 0.95 + (k % 3) * 0.2);
    else if (k % 4 === 2) pilhaTijolo(x, z, angAnexo(), base);
    else tambor(x, z, base);
  }
  /* Pilares das três pontes descendo até o fundo — em foto_001 a passarela se apoia
     no leito. Cover no meio do canal e a coisa que dá ESCALA à profundidade nova. */
  for (const bz of [-22, 0, 22]) for (const px of [-1.5, 1.5])
    addBoxSB(0.5, -CANAL_FUNDO + 0.1, 0.5, matParedeCanal, px, CANAL_FUNDO, bz, { skirt: false });
  /* NOS BECOS E NO PASSEIO DA BEIRA. Encostado nas paredes; o vão livre do beco
     (1,9 m) não pode cair abaixo do corpo + folga. */
  for (const lado of [-1, 1]) {
    for (let k = 0; k < 13; k++) {
      const z = -34 + k * 5.7 + (lado > 0 ? 0 : 2.4);
      if (Math.abs(z) > 36) continue;
      const eixo = k % 3 === 0 ? 6.05 : (k % 3 === 1 ? 13.65 : 21.0);
      const x = lado * (eixo + (k % 2 ? 0.55 : -0.55));
      if (SPAWN_Z.some((s) => Math.abs(z - s) < 2.6 && eixo > 20)) continue;
      if (k % 5 === 0) tambor(x, z, 0);
      else if (k % 5 === 1) pilhaTijolo(x, z, angAnexo(), 0);
      else if (k % 5 === 2) manilha(x, z, angAnexo(), 0);
      else if (k % 5 === 3) entulho(x, z, angAnexo(), 0, 0.85);
      else addBoxI(0.7, 0.95, 0.7, matEntulho, x, 0, z, { ry: angAnexo(), collide: true });   // saco de cimento/caixa
    }
  }

  /* ─── POSTE E EMARANHADO DE FIOS ─────────────────────────────────────────────
     Está em TODAS as 18 fotos, sem exceção, e é o elemento que mais atravessa o
     quadro de ponta a ponta em ângulos que nenhuma parede tem. Poste de concreto
     com braço, prumada de canos e o feixe de gatos saindo em várias direções. */
  const fio = lam({ color: 0x1d1b19, roughness: 0.72 });
  const POSTES = [[-6.6, -31], [7.1, -12], [-7.2, 6], [6.8, 29], [-13.3, -24], [13.3, -3], [-13.3, 16], [13.3, 30], [-20.6, -34], [20.6, -18], [-20.6, 12], [20.6, 22]];
  for (let i = 0; i < POSTES.length; i++) {
    const [x, z] = POSTES[i];
    const ry = angAnexo();
    // 9,4 m é a altura de poste de distribuição de verdade; com 8,2 m ele sumia atrás
    // da fileira de 4 lajes e o emaranhado de fios deixava de cruzar o quadro.
    addBoxSB(0.26, 9.4, 0.26, matPilar, x, 0, z, { ry: ry * 0.4, skirt: false });
    addBoxI(1.9, 0.14, 0.14, matConcretoFino, x, 8.7, z, { ry, cast: false });
    addBoxI(1.4, 0.12, 0.12, matConcretoFino, x, 8.0, z, { ry: ry * 0.5 + 0.5, cast: false });
    // prumada de canos brancos descendo o poste (foto_040)
    for (const k of [-1, 1]) addBoxI(0.07, 5.4, 0.07, matCano, x + k * 0.17, 0.6, z + 0.16, { cast: false });
    // caixa de energia
    addBoxI(0.42, 0.6, 0.3, matEletro, x + 0.2, 3.1, z - 0.2, { ry });
  }
  /* Gatos: cada fio liga dois postes quaisquer, em alturas e ângulos diferentes.
     Deliberadamente NÃO paralelos — feixe paralelo lê como pauta de caderno. */
  for (let i = 0; i < POSTES.length; i++) for (const j of [(i + 1) % POSTES.length, (i + 5) % POSTES.length]) {
    const a = POSTES[i], b = POSTES[j];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > 34) continue;
    const ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const cable = addBox(0.03, 0.03, L, fio, (a[0] + b[0]) / 2, 6.4 + (i % 4) * 0.42, (a[1] + b[1]) / 2,
      { collide: false, cast: false, skirt: false, ry });
    cable.rotation.z = ((i % 3) - 1) * 0.012;
  }
  // Varal atravessado no beco, com roupa — foto_012. Plano pequeno e colorido no meio do vão.
  // cor pura: 2 cm de espessura com textura é o pior caso do texel-check (ver matCano)
  const matRoupa = [0xd8d2c4, 0x8fa9c8, 0xc06a6a, 0xd8c46a, 0x7f9e78, 0xc9a2c2].map((color) => lam({ color, roughness: 1 }));
  for (const lado of [-1, 1]) for (const [z, xv] of [[-18.4, 13.65], [-3.2, 13.65], [16.8, 13.65], [28.4, 13.65], [-29.0, 6.0], [9.6, 6.0]]) {
    addBox(0.02, 0.02, 4.2, matCabo, lado * xv, 3.2, z, { collide: false, cast: false, skirt: false });
    for (let k = 0; k < 6; k++)
      addBoxI(0.02, 0.62 + (k % 3) * 0.14, 0.44, matRoupa[(k + Math.abs(z | 0)) % matRoupa.length],
        lado * xv, 2.5 - (k % 3) * 0.1, z - 1.8 + k * 0.66, { ry: (k - 2.5) * 0.05 + angAnexo() * 0.12, cast: false });
  }

  /* ===================== COVER NAS MARGENS ===================== */
  // sofá velho, geladeira, pneus
  // Sofá, geladeira e pilha de pneu eram cor pura — e são cover na altura do peito,
  // ou seja, exatamente o que o jogador encosta o nariz. Cada família com um material
  // compartilhado e com mapa do catálogo de textures.js.
  /* Cover MOVIDO: as peças moravam em |x| = 5, que agora é a beirada da queda de 1,75 m
     do canal — cover em cima de precipício é cover que ninguém usa. Foram para o passeio
     da beira (|x| ≈ 5,9) e para os becos, que é onde há tráfego. */
  for (const [i, x, z] of [[0, 5.9, -15], [1, -5.9, 15]])
    addBox(2.0, 0.8, 0.8, matSofa[i], x, 0, z, { ry: angAnexo() * 0.4 });
  addBox(1.5, 1.8, 1.5, matEletro, 5.9, 0, 10);   // geladeira encostada na parede do canal
  addBox(1.5, 1.8, 1.5, matEletro, -5.9, 0, -10);
  for (const [x, z] of [[13.65, -5], [-13.65, 5]]) { addBox(1.4, 1.0, 1.4, matPneu, x, 0, z); } // pneus no beco
  // barraca de camelô, agora no cruzamento do beco transversal
  addBox(1.6, 2.0, 1.6, PAREDES[2], 13.65, 0, -2, { ry: angAnexo() });
  solids.push({ x0: 12.7, x1: 14.6, z0: -3.1, z1: -0.9 });
  addBox(1.6, 2.0, 1.6, PAREDES[0], -13.65, 0, 2, { ry: angAnexo() });
  solids.push({ x0: -14.6, x1: -12.7, z0: 0.9, z1: 3.1 });
  /* Botijão e caixa d'água avulsos, do kit `references/favela/` — vocabulário que
     nenhum mapa consumia. Ficam no chão do beco e na beira, que é onde aparecem nas
     fotos (foto_012, foto_029). */
  for (const [x, z, h] of [[13.65, -25.4, 0.75], [-13.65, 21.6, 0.75], [6.1, 12.4, 0.75], [-6.1, -8.6, 0.75]])
    propComFallback('botijao_gas', x, z, h, angAnexo(), () => addBox(0.42, h, 0.42, matEletro, x, 0, z));
  for (const [x, z] of [[13.65, 8.2], [-13.65, -12.8]])
    propComFallback('caixa_dagua', x, z, 1.25, angAnexo(), () => addBox(1.1, 1.25, 1.1, matCaixaAgua, x, 0, z));
  /* CARRO POPULAR ENCOSTADO NA RUA — foto_024 e foto_055: a rua da favela é uma fila
     de carro velho de um lado só. Serve de cover de agachado e, junto com o
     puxadinho que avança, é o que recorta os 80 m de rua reta. Três modelos, para a
     fila não ler como cópia; entram no `PropBatch` (1 call por material, por bloco). */
  /* Ficam DENTRO do largo (|x| ≈ 17,8), não na pista de 3,1 m: um carro de 1,7 m numa
     rua de 3,1 m deixa 1,0 m de vão e foi assim que a primeira tentativa cortou rota.
     E ficam a ≥ 5,5 m do ponto de spawn, fora do disco que o MAP2B mede. */
  for (const [id, x, z, ry] of [
    ['uno_mille', 17.8, -30.6, 0.55], ['fusca', 17.8, -10.6, -0.5], ['fiat_uno', 17.8, 20.6, 0.45],
    ['fusca', -17.8, 29.4, 2.6], ['uno_mille', -17.8, 0.6, 3.6], ['kombi', -17.8, -19.4, 2.55],
  ]) if (!PB.add(id, { x, z, targetH: id === 'kombi' ? 2.0 : 1.42, ry })) addBox(1.7, 1.4, 4.0, matEletro, x, 0, z, { ry });
    else colRot(x, z, 0.85, 1.95, 0, 1.42, ry);

  // Props pequenos distribuídos por quadrante: identidade e cover sem alterar o proxy físico.
  const propsRua = [
    ['dumpster', -20.5, -33, 1.35, 0], ['moto_cg', -20.5, -12, 1.05, 0.4],
    ['pilha_pneus', -20.5, 10, 1.1, 0], ['stall', -20.5, 30, 2.3, 0],
    ['tires', 20.5, -31, 0.8, 0], ['moto_cg', 20.5, -10, 1.05, -0.5],
    ['dumpster', 20.5, 12, 1.35, Math.PI], ['stall', 20.5, 31, 2.3, Math.PI],
    ['tires', -6, -36, 0.8, 0], ['pilha_pneus', 6, -36, 1.1, 0],
  ];
  for (const [id, x, z, h, ry] of propsRua) {
    propComFallback(id, x, z, h, ry, () => addBox(1.35, h, 1.35, PAREDES[(Math.abs(z) / 10 | 0) & 3], x, 0, z));
  }

  /* Empenas de pixação SP. MOVIDAS de |x| = 23,72 (atrás da fileira C, onde ninguém
     mais vê) para as empenas altas das fileiras que dão para os becos — pixo de
     empena existe justamente onde há parede cega alta e alguém para olhar. */
  if (TEX.pixo) for (const [x, z, ry] of [[23.72, -28, -Math.PI / 2], [-23.72, 24, Math.PI / 2], [23.72, 8, -Math.PI / 2], [-23.72, -12, Math.PI / 2]])
    addBox(0.05, 4.6, 6.0, TEX.pixo, x, 1.4, z, { collide: false, ry, skirt: false });

  /* ===================== MUROS EXTERNOS =====================
     De 3 m para 8 m, e de concreto liso para alvenaria. Dois motivos, os dois medidos:

     (a) O muro de 3 m era a maior superfície LISA e CONTÍNUA do mapa (80 m × 3 m × 2
         lados = 480 m²) e por isso era onde a passada de grafite despejava a maior
         parte das 425 peças assadas. O frame de referência desta rodada mostra o
         spawn de frente para uma parede bege com seis cartazes lado a lado — é
         literalmente o "BARRACOS GENERICOS CHEIO DE POSTER NADA VE".
     (b) Com 3 m o horizonte do mapa era o CÉU logo acima da cabeça em toda direção
         que não fosse o canal. Em foto_024 e foto_063 nunca se vê o horizonte: o que
         fecha o quadro é sempre outra construção mais alta atrás.

     8 m é a altura da fileira mais alta (3 lajes = 8,4 m com platibanda), então ele
     fecha o fundo sem virar caixa de sapato. A fileira C fica NA FRENTE dele. */
  /* EM SEGMENTOS DE 8 m, não numa caixa de 80 m. Duas razões, e a primeira é um defeito
     que a captura pegou: uma face de 80 × 8 m não completa uma volta de UV na vertical
     (com a textura de alvenaria a volta dá ~8,4 m), então o vao cai no caminho de "tile
     puro" e ESTICA a imagem inteira sobre os 8 m de altura enquanto a repete 12 vezes na
     horizontal. Na tela isso é uma mancha bege listrada — exatamente o "sem textura
     nenhuma" do dono, e foi o que apareceu num dos yaws da captura desta rodada.
     A segunda razão é fotográfica: muro de arrimo de favela é remendo (foto_005,
     foto_040), cada trecho de uma cor e de uma altura. Segmento por segmento sai de
     graça no lote (mesmo material = mesma malha mesclada) e a altura varia 7,4-8,6 m. */
  const SEG = 8;
  for (const sx of [-HALF_X, HALF_X]) {
    for (let k = 0; k < (HALF_Z * 2) / SEG; k++) {
      const z = -HALF_Z + SEG / 2 + k * SEG, h = 7.4 + (k % 4) * 0.4;
      addBoxSB(0.5, h, SEG, MURO[(k * 3 + (sx > 0 ? 1 : 5)) % MURO.length], sx, 0, z, { skirt: false });
      // Coroamento: quebra a linha reta do topo e recebe a sombra do sol rasante.
      addBoxSB(0.86, 0.24, SEG, matRebocoSujo, sx, h, z, { collide: false, skirt: false });
    }
  }
  for (const sz of [-HALF_Z, HALF_Z]) {
    for (let k = 0; k < (HALF_X * 2) / SEG; k++) {
      const x = -HALF_X + SEG / 2 + k * SEG, h = 7.6 + (k % 3) * 0.45;
      addBoxSB(SEG, h, 0.5, MURO[(k * 5 + (sz > 0 ? 2 : 6)) % MURO.length], x, 0, sz, { skirt: false });
      addBoxSB(SEG, 0.24, 0.86, matRebocoSujo, x, h, sz, { collide: false, skirt: false });
    }
  }

  /* ===================== GROUND HEIGHT ===================== */
  function groundHeightAt(x, z) {
    const ax = Math.abs(x);
    /* ORDEM IMPORTA, e é a ordem física: o tablado da ponte está POR CIMA do vão, o
       assoreamento das pontas está por cima do fundo, a rampa está no lugar da parede. */
    const ponte = ax <= CORREGO_W / 2 + 0.2 && (Math.abs(z + 22) <= 1.6 || Math.abs(z) <= 1.0 || Math.abs(z - 22) <= 1.6);
    if (ponte) return 0.15;
    if (ax <= 5 && Math.abs(z) >= HALF_Z - 6) return 0.05;
    // rampa de acesso: faixa da parede (|x| ∈ [3, 5]) descendo ao longo de z
    if (ax >= RAMPA_X0 && ax <= RAMPA_X1) {
      for (const r of RAMPAS) {
        if (Math.sign(x) !== r.lado) continue;
        const t = (z - r.zAlto) / (r.zBaixo - r.zAlto);
        if (t >= 0 && t <= 1) return CANAL_FUNDO * t;
      }
      return 0;                       // topo da parede = passeio da beira, 2 m de largura
    }
    if (ax < CANAL_X1) {
      // pontas assoreadas: o fundo sobe de CANAL_FUNDO (|z| ≤ 32) até o alagado (|z| ≥ 35)
      const az = Math.abs(z);
      if (az >= 35) return 0.05;
      if (az > 32) { const t = (az - 32) / 3; return CANAL_FUNDO * (1 - t) + 0.05 * t; }
      return CANAL_FUNDO;             // fundo do canal — vazio de verdade, andável
    }
    return 0;
  }

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    const g = groundHeightAt(x, z);
    for (const c of colliders) {
      if (!(x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15)) continue;
      // colisor girado: sem este teste o bot planeja pela AABB e contorna ar (map_brasilia:127)
      if (c.ry && foraDaCaixaGirada(c, x, z, inf)) continue;
      return true;
    }
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  /* ── LANES ────────────────────────────────────────────────────────────────────
     A grade regular de 3,4 m acima NÃO acha beco de 1,8 m: ela cai dentro de casa e
     o nó morre. Quem descreve a planta são as linhas abaixo, e elas passam pelos
     MESMOS eixos que a planta declara no bloco A FAVELA. Beco sem waypoint é beco em
     que bot não entra — e beco em que bot não entra é beco que não existe pro jogo. */
  // adensamento nas 3 pontes (passo apertado — corredor estreito)
  for (const bz of [-22, 0, 22]) linha(0, bz - 2, 0, bz + 2, 1.0);
  /* FUNDO DO CANAL — a rota baixa nova. Passo curto porque é um corredor de 6 m com
     parede dos dois lados; e ela precisa EXISTIR no grafo, senão o bot cai lá e não
     sabe sair (o `stuck%` do botsim é justamente isso). */
  for (const cx of [-1.4, 1.4]) linha(cx, -31, cx, 31, 2.4, 0.3);
  // rampas de acesso: ligam o fundo à margem. Sem nó aqui as duas rotas ficam ilhadas.
  for (const r of RAMPAS) {
    const rx = r.lado * (RAMPA_X0 + RAMPA_X1) / 2;
    linha(rx, r.zAlto + 0.6, rx, r.zBaixo - 0.6, 1.6, 0.28);
    linha(rx, r.zBaixo - 0.6, r.lado * 1.6, r.zBaixo + 1.2, 1.4, 0.28);   // pé da rampa → fundo
    linha(rx, r.zAlto + 0.6, r.lado * 6.0, r.zAlto - 1.2, 1.4, 0.3);      // topo da rampa → passeio
  }
  // passeio da beira do canal (entre a queda e a fileira A)
  for (const mx of [-5.9, 5.9]) linha(mx, -HALF_Z + 4, mx, HALF_Z - 4, 2.4, 0.3);
  // BECO 1, entre as fileiras A e B
  for (const mx of [-13.65, 13.65]) linha(mx, -HALF_Z + 4, mx, HALF_Z - 4, 2.2, 0.26);
  // rua do spawn, entre a fileira B e a C
  for (const mx of [-21.0, 21.0]) linha(mx, -HALF_Z + 3, mx, HALF_Z - 3, 2.6, 0.3);
  // becos TRANSVERSAIS: ligam beira ↔ beco 1 ↔ rua. São as mesmas cotas dos pórticos.
  for (const lado of [-1, 1]) for (const z of BECOS_Z) {
    const zz = z + (lado > 0 ? 0 : 3.7);
    linha(lado * 5.9, zz, lado * 21.0, zz, 1.8, 0.26);
  }
  // travessias largas nas margens (as antigas, agora começando fora do canal)
  for (const bz of [-30, -15, 0, 15, 30]) { linha(6, bz, HALF_X - 3, bz, 3.0); linha(-6, bz, -HALF_X + 3, bz, 3.0); }
  // trechos alagados (andáveis)
  for (const bz of [-37, 37]) linha(-4, bz, 4, bz, 2.0);
  // ligação alagado ↔ fundo do canal pelo assoreamento das pontas
  for (const sz of [-1, 1]) linha(0, sz * 35.5, 0, sz * 30.5, 1.6, 0.3);

  /* ARESTA TAMBÉM PRECISA SER SUBÍVEL, não só desimpedida.
     O canal andável quebrou a premissa antiga de que este mapa era plano. Sem a
     cláusula de altura, o A* liga um nó do FUNDO (y = −1,75) a um nó do PASSEIO
     (y = 0) porque em 2D não há colisor entre eles — a parede tem topo em y = 0 e o
     `blocked` a descarta corretamente para quem está EM CIMA dela. O bot então anda
     contra 1,75 m de concreto até o fim do round. É a mesma família do "quando se cai
     trava", só que do lado da IA. 0,55 m é o `STEP_H` do game.js: o mesmo degrau que
     o corpo sobe de um passo, para os dois não discordarem sobre o que é subível. */
  const DEGRAU_WP = 0.55;
  const segClear = (a, b) => {
    let y0 = groundHeightAt(a.x, a.z);
    for (let i = 1; i <= 6; i++) {
      const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (i < 6 && blocked(x, z, 0.25)) return false;
      const y = groundHeightAt(x, z);
      if (Math.abs(y - y0) > DEGRAU_WP) return false;
      y0 = y;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n);
    g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1;
    while (oc > 0) {
      let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break;
      if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; }
      open[cur] = 0; oc--;
      for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } }
    }
    return [fromIdx];
  }

  /* ===================== SPAWNS ===================== */
  /* YAW INVERTIDO — defeito antigo que só ficou VISÍVEL agora. A convenção de frente
     nesta base é `(-sen yaw, -cos yaw)` (ver `tools/eval/spawn-facing-check.mjs:15`).
     Com `yaw = -π/2` em x = +21 a frente dava (+1, 0): o time LESTE nascia de COSTAS
     para o mapa, olhando para o muro externo. Enquanto o muro estava a 3 m e a margem
     tinha 21 m de largura ninguém reparou; com a fileira C encostada na rua o primeiro
     quadro do round virou uma parede a 1,5 m do rosto — e foi exatamente o que apareceu
     na captura desta rodada. Invertido, os dois times nascem olhando PARA o córrego,
     que é a leitura que dá nome ao mapa e a direção em que há profundidade. */
  const spawns = {
    E: [-25, -5, 15, 35].map(z => ({ x: 21, z, yaw: Math.PI / 2 })),
    B: [-25, -5, 15, 35].map(z => ({ x: -21, z, yaw: -Math.PI / 2 })),
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'OESTE',   x: -13.65, z: -15 },
    { id: 'C', label: 'PONTE C', x: -4,  z: 8 },
    { id: 'P', label: 'LESTE',   x: 13.65,  z: 15 },
    { id: 'B', label: 'PONTE N', x: 4,   z: -22 },
  ];

  /* ===================== ARSENAL ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.userData.nonSolidSurface = true; m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // margem leste
  /* O arsenal MUDOU DE EIXO junto com a planta: os x antigos (8, 10, 12, 15, 18)
     caíam onde agora há fileira A (6,8-12,4) e fileira B (14,2-19). Arma dentro de
     parede é arma que ninguém pega. Os novos x são os três eixos andáveis da margem
     — passeio da beira (5,9), beco 1 (13,3) e rua do spawn (20,8) — mais duas no
     FUNDO DO CANAL, que é a rota nova e precisava de motivo para se descer nela. */
  place('ak', 13.65, -28);   place('m4', 5.9, -15);
  place('shotgun', 13.65, 0); place('mp5', 5.9, 12);
  place('awp', 21.0, -5);   place('deagle', 5.9, 28);
  // margem oeste
  place('ak', -13.65, 28);   place('m4', -5.9, 15);
  place('shotgun', -13.65, 0); place('mp5', -13.65, -15);
  place('m400', -21.0, 15);  place('deagle', -5.9, -28);
  // pontes e fundo do canal
  place('mp5', 0, -22);     place('mp5', 0, 22);
  place('m400', 1.4, -11);  place('awp', -1.4, 17);

  /* PB (carros) e IB (caixas instanciadas) viram occluders: são a malha visível com
     colisor — sem isto a bala atravessava carro e palafita que o corpo respeita. */
  const _antesBatch = new Set(root.children);
  PB.build(root);
  SKIRT.build(root);
  /* LOTE ESTÁTICO — toda a alvenaria vira ~1 malha por material (ver o custo medido
     no bloco A FAVELA). As malhas resultantes entram em `occluders`: bala e linha de
     visão continuam batendo na parede, e o MAP4 do map-check continua enxergando
     superfície de verdade porque a malha mesclada tem os mesmos triângulos. */
  for (const m of SB.build(root)) occluders.push(m);
  IB.build(root);
  for (const c of root.children) if (!_antesBatch.has(c) && c.isInstancedMesh) {
    const ms = Array.isArray(c.material) ? c.material : [c.material];
    if (ms.every((m) => m && m.transparent && (m.opacity === undefined || m.opacity < 0.9))) continue;   // vidro de GLB não é superfície (mesma doutrina do gate)
    occluders.push(c);
  }

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'or-graf-treta.png', 'personagem-muro.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'fy_corrego',
    root, T, waypoints: nodes, seed: 13007, passo: 0.95, alcance: 9, cobre: 0.025, minLarg: 0.3,
    /* ZONA LIMPA nos oito largos de spawn. O primeiro frame que o jogador vê é o do
       spawn, e com a fileira C encostada na rua ela virou a parede mais próxima de todo
       waypoint de spawn — ou seja, a que mais recebia peça. Parede pichada é o mapa;
       parede pichada colada no rosto no segundo zero é a reclamação. */
    limpo: [-25, -5, 15, 35].flatMap((z) => [
      { x0: 18.0, x1: HALF_X, z0: z - 4.5, z1: z + 4.5 },
      { x0: -HALF_X, x1: -18.0, z0: z - 4.5, z1: z + 4.5 },
    ]),
    murais: { texturas: (T && T.muraisHom) || [], nomes: (T && T.muraisHomNomes) || [], seed: 13, separacao: 15 },
    bandas: [
      /* chance 30 → 12. "BARRACOS GENERICOS CHEIO DE POSTER NADA VE": o cartaz é a
         única banda que o dono nomeou como excesso, e era a de maior chance depois do
         pixo. Não é o cartaz que some, é a frequência dele — de ~1 em cada 3 âncoras
         para ~1 em cada 8. As outras três bandas (pixo, mural, tag) ficam como estavam. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 12, fonte: 'poster',
        pool: ((T && T.posterFiles) || []).map((nome, i) => [nome, i]).filter(([nome]) => !['despisque-leao.jpg','ashtar-meme.jpg','ashtar.png'].includes(nome)).map(([,i]) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6], chance: 45,
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0], chance: 38,
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], chance: 28, planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  const ambience = createFavelaAmbience(root, {
    map: 'fy_corrego', low: LOWQ,
    rats: [
      { pos: [-16.95, groundHeightAt(-16.95, -2.25), -2.25], to: [-16.45, groundHeightAt(-16.45, -1.55), -1.55], phase: .2 },
      { pos: [-16.95, groundHeightAt(-16.95, -2.85), -2.85], to: [-17.55, groundHeightAt(-17.55, -3.35), -3.35], phase: 1.37 },
      { pos: [-17.35, groundHeightAt(-17.35, -1.95), -1.95], to: [-18.05, groundHeightAt(-18.05, -1.5), -1.5], phase: 2.54 },
      { pos: [17.5, groundHeightAt(17.5, 16.6), 16.6], to: [18.25, groundHeightAt(18.25, 17.4), 17.4], phase: 3.2 },
    ],
    pigeons: [
      { mode: 'ground', pos: [8.2, groundHeightAt(8.2, -15), -15], phase: .6 },
      { mode: 'flight', pos: [-8, 7.4, -5], radius: [4.7, 3.4], phase: 1.3 },
    ],
  });

  const slowAt = (x, z) => Math.abs(z) >= HALF_Z - 6 && Math.abs(x) <= CORREGO_W / 2 + 2;

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups, ctfPoints, ambience,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
