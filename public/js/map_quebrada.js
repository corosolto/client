// QUEBRADA (quebrada) — spec literal do dono (HANDOFF A0.10): uma RUA RETA E COMPRIDA com
// rotunda do BAILE numa ponta (2 carros tunados + caixas de som) e CAMPINHO DE TERRA na outra
// (respawn do outro time); ônibus parado com ponto, bar brasileiro com cadeira de plástico na
// calçada, barricadas, casas majoritariamente de BARRACO, comércio (adega, açaí, sorveteria,
// móveis/eletrônicos, lanchonete) e — o item que NÃO é decoração — VIELAS E BECOS.
//
// POR QUE AS VIELAS SÃO REQUISITO E NÃO ENFEITE: a régua CTF2 (tools/eval/map-check.mjs) exige
// ≥ 2 rotas separadas por ≥ 6 m entre CADA spawn e CADA bandeira. Uma rua reta é UMA fita: todo
// bot percorre o mesmo corredor e o mapa vira duelo de sniper. As duas vielas de fundo (x = ∓23)
// ficam a 23 m do eixo da rua — quase 4× a separação mínima — e são o que faz a CTF2 fechar.
//
// PLANTA (eixo longo = z; norte = -z). Faixas em x, simétricas:
//   asfalto  x ∈ [-7, 7]      calçadas x ∈ [∓12,5, ∓7]     blocos x ∈ [∓21, ∓12,5]
//   vielas   x ∈ [∓25, ∓21]   fundo (barracos) x ∈ [∓28, ∓25]
//   PRAÇA DO BAILE z ∈ [-43, -20] · RUA z ∈ [-20, 24] · TRAVESSA z ∈ [24, 28] · CAMPINHO z ∈ [28, 46]
//   vila do baile (spawn P) x ∈ [-25, -12,5], z ∈ [-46, -38]
//
// Contrato buildWorld idêntico ao map_ferrovelho.js / map_havan.js.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds, paredeAtras, medirParede } from './map_decals.js';   // pool por NOME + medição de parede
import { grafitar, esconderSeFaltar } from './graffiti_pass.js';   // cobertura medida, não coordenada à mão
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';


const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 28, HALF_Z = 47;
// props GLB reaproveitados (o mapa NUNCA depende deles: todo `gprop` tem fallback procedural,
// senão o mapa quebraria em node — onde nenhum GLB carrega — e nas réguas).
export const QUEBRADA_PROPS = ['pilha_pneus', 'tires', 'jersey_barrier', 'stall', 'tent', 'caixa_som',
  'arquibancada', 'churrasqueira', 'mesa_guardasol', 'guarda_sol', 'moto_cg', 'kombi', 'uno_mille',
  'fusca', 'saveiro', 'dumpster', 'arara_roupas', 'drinkstand',
  /* ACABAMENTO (ver bloco "ACABAMENTO GLB" lá embaixo). Dois lotes com procedências
     diferentes, e a diferença importa:
     — `fav_*`, `tiara_gt83`, `botijao_gas`, `vw_9150` vêm de `references/favela/` (o dono:
       "quero o padrão visual desses GLBs"). São eles que DITAM o estilo do mapa: textura
       fotográfica de tijolo/reboco, paleta lavada, 780-16 k triângulos.
     — `onibus_sptrans`, `fachada_comercio` e `caixa_som_baile` foram gerados no Tripo
       (tools/gen-asset.mjs) só onde a referência não tinha peça: não há ônibus na pasta
       (o `delivery_volkswagen_9.150` é CAMINHÃO BAÚ, conferido na imagem — virou o caminhão
       de entrega da adega, não o ônibus) nem fachada de comércio nem paredão texturizado
       (`speaker_..._paredao` é geometria boa mas SEM textura, sairia cinza chapado). */
  'fav_house', 'fav_brasileira', 'fav_modular', 'tiara_gt83', 'botijao_gas', 'vw_9150',
  'fachada_comercio', 'onibus_sptrans', 'caixa_som_baile'];

export function buildQuebrada(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];   // footprints de edificação — o gerador de waypoints não põe nó lá dentro
  const root = new THREE.Group(); scene.add(root);

  // PBR de superfície pelo mesmo caminho do ferro velho: normal+rough derivados do próprio
  // albedo por Sobel (textures.js). Em quality 'low' `detailFor` devolve null e nada muda.
  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };
  const MAT = {
    asphalt: lam({ map: T.asphalt }),
    concrete: lam({ map: T.concrete }),
    concreteDark: lam({ map: T.concreteDark }),
    dirt: lam({ map: T.dirt }),
    grass: lam({ map: T.grass }),
  };

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
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
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(m);
    }
    return m;
  }
  // colisor sem malha (fecha vão entre peças que já têm malha própria); NUNCA vira occluder,
  // então não pode produzir "marca de tiro no ar" (MAP4).
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const gprop = (id, x, z, h, ry = 0) => { const o = placeProp(id, { x, z, targetH: h, ry }); if (o) { root.add(o); o.traverse((m) => { if (m.isMesh) occluders.push(m); }); } return !!o; };

  /* ===================== ACABAMENTO GLB =====================
     O dono reprovou a 1ª versão deste mapa com estas palavras: "está tudo lowpoly, a
     qualidade está muito baixa — os prédios, comércios, ônibus, carros". Ele está certo e o
     defeito é literal: barraco, ônibus, carro tunado e fachada de comércio eram CAIXA E PLANO
     com textura de canvas. Os quatro grupos que ele nomeou viraram GLB gerado no Tripo
     (tools/gen-asset.mjs).

      A REGRA DESTA TROCA, e é o que a torna reversível e segura: **o GLB entra só na IMAGEM**.
      A caixa procedural continua sendo criada e continua registrada em `colliders` e
      `solids` — ela só deixa de ser DESENHADA (`visible = false`). Em node (réguas) nada
      muda: GLB nenhum carrega e o mapa medido continua sendo o procedural de sempre.

      BUG-54 (R27) tirou o fallback escondido de `occluders`: a caixa cobria porta e janela
      do GLB e a bala morria no ar antes da superfície vista (546 raios neste mapa na régua
      `eval:occluders`). Desde então a bala raycasta a malha visível (traverse do gprop/gpropC
      + lote do PB no build); o custo é por evento, não por frame — números no BUG-54.

     `?glb=0` desliga tudo e devolve o mapa procedural — é o A/B que o capturador usa para
     provar que a troca é só de pixel. Em node (réguas) nenhum GLB carrega, `hasProp` é
     falso, e o mapa medido é o procedural de sempre. */
  const GLB_ON = QP.get('glb') !== '0';
  const useGlb = (id) => GLB_ON && hasProp(id);
  const hide = (m) => { if (m) m.visible = false; return m; };
  // lote de instâncias dos props repetidos (barraco e fachada). bucket de 24 m mantém o
  // frustum culling vivo — um InstancedMesh único cobrindo o mapa inteiro nunca sai da tela.
  const PB = new PropBatch({ bucket: 24 });
  /* Proporção em planta do GLB, medida UMA vez a partir do próprio template: o
     `placeProp` normaliza só a ALTURA, então largura e profundidade dependem do modelo.
     Sem isto o encaixe no lote seria número mágico que quebra se o asset for regerado. */
  const _asp = new Map();
  function glbAspect(id) {
    if (_asp.has(id)) return _asp.get(id);
    let a = null;
    const o = placeProp(id, { targetH: 1 });
    if (o) {
      const b = new THREE.Box3().setFromObject(o);
      a = { w: b.max.x - b.min.x, d: b.max.z - b.min.z, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2 };
    }
    _asp.set(id, a);
    return a;
  }
  /* CENTRAGEM EM X/Z — defeito de integração que custou uma captura inteira.
     `placeProp` (mapprops.js) só corrige o EIXO Y: `o.position.set(x, y - box.min.y*s, z)`.
     Em X e Z ele usa a origem que o modelo trouxe do autor. Modelo cuja origem está numa
     quina — que é a maioria dos GLB de cenário — nasce deslocado de até meio prédio. Foi o
     que a captura `after2` mostrou: os barracos do quarteirão leste invadiram a calçada e o
     beco de x = 11 apareceu EMPAREDADO, com tijolo dos dois lados onde deveria haver rua.
     Aqui a correção é local (`mapprops.js` não é meu arquivo) e usa a mesma conversão de
     giro do `colRot`: world = (lx·cos + lz·sen, −lx·sen + lz·cos). */
  function centro(id, x, z, s, ry) {
    const a = glbAspect(id);
    if (!a) return [x, z];
    const lx = a.cx * s, lz = a.cz * s, cs = Math.cos(ry), sn = Math.sin(ry);
    return [x - (lx * cs + lz * sn), z - (-lx * sn + lz * cs)];
  }
  // gprop centrado: mesma assinatura do `gprop`, mas o modelo fica com o CENTRO em (x,z).
  const gpropC = (id, x, z, h, ry = 0) => {
    if (!useGlb(id)) return false;
    const [px, pz] = centro(id, x, z, h, ry);
    const o = placeProp(id, { x: px, z: pz, targetH: h, ry });
    if (o) { root.add(o); o.traverse((m) => { if (m.isMesh) occluders.push(m); }); }
    return !!o;
  };
  // idem para o lote instanciado
  const pbAdd = (batch, id, o) => {
    const [px, pz] = centro(id, o.x, o.z, o.targetH, o.ry || 0);
    return batch.add(id, { ...o, x: px, z: pz });
  };
  /* Lote SEPARADO para os carros: o `paintTest` do PropBatch pinta por instância, e um teste
     que serve pra lataria (clarear e multiplicar pela cor da instância) não pode valer para
     tijolo de barraco. O corte por luminância deixa pneu, vidro e borracha escuros de fora —
     senão os dois carros do baile saem monocromáticos, que foi o que a captura mostrou:
     dois cupês BRANCOS idênticos numa praça que a spec pede "2 carros tunados". */
  const PBC = new PropBatch({ bucket: 0, tag: 'car', paintTest: (m) => !!m.color && (m.color.r + m.color.g + m.color.b) / 3 > 0.32 });

  /* COLISOR DE PROP GIRADO — BUG-21 (KNOWN-BUGS.md), medido no ônibus da Brasília.
     O motor NÃO tem collider rotacionado em lugar nenhum (nem `_collide`, nem o A* dos bots):
     `col()` só aceita AABB. Uma caixa única alinhada aos eixos para um retângulo girado é o
     retângulo "achatado" — sobra nas quinas e falta nas laterais. No ônibus de 0,55 rad isso
     deu 12,9 m² de bloqueio onde não havia lataria e uma PAREDE INVISÍVEL a 2,33 m dela.
     Correção medida (2,33 m -> 0,68 m): decompor o retângulo numa grade nx×nz no espaço LOCAL
     do objeto e empurrar a AABB exata de cada célula — uma escada de caixas na diagonal. */
  function colRot(cx, cz, w, d, y0, y1, ry, nx = 6, nz = 3) {
    const cs = Math.cos(ry), sn = Math.sin(ry), sx = w / nx, sz = d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const lx = -w / 2 + sx * (i + 0.5), lz = -d / 2 + sz * (j + 0.5);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const dx of [-sx / 2, sx / 2]) for (const dz of [-sz / 2, sz / 2]) {
        const px = lx + dx, pz = lz + dz;
        const wx = cx + px * cs + pz * sn, wz = cz - px * sn + pz * cs;
        x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz);
      }
      col(x0, x1, y0, y1, z0, z1);
    }
  }

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_quebrada.webp', 0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('quebrada');
  const hemi = new THREE.HemisphereLight(0xeeeef0, 0x544f48, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffefd8, 1.65); sun.position.set(38, 30, -22); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 160; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* TERREIRO VIZINHO — cenário sem física, rebaixado 12 cm. O chão jogável acabava em
     x=±28/z=±47 e revelava uma borda retangular contra o céu; este avental prolonga a terra
     da comunidade até o horizonte próximo sem criar rota, collider ou occluder. */
  addFloor(76, 116, 0, 0, MAT.dirt, -0.13);

  // chão base: terra/laje batida sob tudo (a rua, a praça e o campinho pintam por cima)
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt, -0.01);

  /* ===================== BARRACO — a unidade construtiva do mapa =====================
     O dono pediu "as casas seriam de barraco a maioria". Barraco é caixa e plano: laje
     inacabada, 2º pavimento MENOR e deslocado (a silhueta em escada que faz uma favela ler
     como favela), caixa d'água em cima.
     DUAS DECISÕES DE COLISÃO, cada uma com o número que a justifica:
     (a) o módulo é SÓLIDO (uma caixa, um colisor) e não uma casca de 4 paredes. Nenhum
         interior é acessível neste mapa, então casca só multiplicaria colisor — e a lista de
         colisores é caminho quente (`_collide` varre TODOS a cada passo do jogador, do bot e
         de cada célula do flood-fill das réguas: ~85 mil células por mapa).
     (b) o módulo tem no MÁXIMO ~6 m de frente, então a pegada fica ≤ 8,5 × 6 = 51 m², abaixo
         do teto de 60 m² com que a MAP5 distingue "peça de cobertura" de "estrutura". Um
         quarteirão inteiro numa caixa só sairia da conta de densidade e o quadrante
         apareceria DESERTO tendo prédio em cima — régua mentindo por causa da geometria.
     A laje e o 2º pavimento ficam com colisor (minY ≥ 2,7 m, acima do 1,5 m que o `_collide`
     testa: não bloqueiam o andar) porque colisor é o que a BALA usa — laje sem colisor é
     telhado que o tiro atravessa. */
  /* TEXTURA DE BARRACO — a diferença entre "caixa colorida" e "barraco" é a PROPORÇÃO DE
     ACABAMENTO. Um quarteirão inteiro rebocado e pintado lê como conjunto habitacional; um
     quarteirão inteiro de bloco cru lê como obra abandonada. O que existe de verdade é a
     mistura: uma parte pintada, uma parte com o reboco caindo e o bloco cerâmico aparecendo
     por baixo, escorrido de chuva descendo das lajes e limo na base onde bate água.
     `crua` = fração de bloco aparente; `pint` = a cor da tinta quando há tinta. */
  function paredeTex(pint, crua, seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = pint; x.fillRect(0, 0, S, S);
    // manchas de reboco caído com bloco cerâmico por baixo (fiadas + os 6 furos)
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
        x.fillStyle = 'rgba(40,26,20,0.5)';
        for (let h2 = 0; h2 < 3; h2++) x.fillRect(bx + 6 + h2 * 15, by + 6, 9, 12);
      }
      x.restore();
    }
    for (let i = 0; i < 14; i++) {   // escorrido de chuva a partir da laje
      const px = rnd() * S; const g = x.createLinearGradient(0, 0, 0, 60 + rnd() * 150);
      g.addColorStop(0, 'rgba(48,44,38,0.42)'); g.addColorStop(1, 'rgba(48,44,38,0)');
      x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 8, 60 + rnd() * 150);
    }
    const g2 = x.createLinearGradient(0, S * 0.72, 0, S);   // limo/umidade na base
    g2.addColorStop(0, 'rgba(62,70,50,0)'); g2.addColorStop(1, 'rgba(62,70,50,0.5)');
    x.fillStyle = g2; x.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.2); return t;
  }
  const CORES_BARRACO = ['#c8bda6', '#a8814f', '#a9bcb6', '#d0c08d', '#8f857a', '#bd8f77', '#9fb0bd', '#d4cbb6'];
  const MAT_BARRACO = CORES_BARRACO.map((c, i) => lam({ map: paredeTex(c, i % 3 === 1 ? 0.85 : 0.32, 41 + i * 733), roughness: 0.97 }));
  /* TELHA ONDULADA DE FIBROCIMENTO — o par obrigatório da laje inacabada. Metade das casas
     tem laje de concreto (esperando o próximo andar, que é o que a caixa d'água em cima
     conta) e a outra metade fecha com fibrocimento: onda larga e macia, cinza-esverdeado,
     limo escuro nas juntas. A onda é o que pega o sol rasante — telhado chapado some. */
  function telhaTex(seed = 907) {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i * 20 < S; i++) {
      const g = x.createLinearGradient(i * 20, 0, (i + 1) * 20, 0);
      g.addColorStop(0, '#6d716b'); g.addColorStop(0.5, '#a5a89e'); g.addColorStop(1, '#62655e');
      x.fillStyle = g; x.fillRect(i * 20, 0, 20, S);
    }
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.12 + rnd() * 0.3; x.fillStyle = rnd() > 0.5 ? '#4b5840' : '#3d413b'; const r = 5 + rnd() * 20; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * 0.5, 0, 0, 6.3); x.fill(); }
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
  }
  const MAT_LAJE = lam({ map: T.concreteDark, color: 0xa39c90, roughness: 0.95 });
  const MAT_TELHA = lam({ map: telhaTex(), roughness: 0.72, metalness: 0.1 });
  /* PIXAÇÃO — letra reta, alta e angular de rolinho, preta ou prata, uma passada só. Nada a
     ver com grafite colorido: pixo é traço, não desenho, e é o que mais rápido diz "isto é
     periferia brasileira, não subúrbio genérico". Vai como decal transparente na fachada. */
  function pixoTex(seed = 555) {
    const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.clearRect(0, 0, W, H);
    x.strokeStyle = rnd() > 0.5 ? '#15151a' : '#98a0a6'; x.lineCap = 'square';
    for (let g = 0; g < 7; g++) {
      const bx = 16 + g * 33 + (rnd() - 0.5) * 8, top = 20 + rnd() * 12, bot = H - 20 - rnd() * 10;
      x.lineWidth = 5 + rnd() * 4;
      x.beginPath(); x.moveTo(bx, top); x.lineTo(bx + (rnd() - 0.5) * 6, bot); x.stroke();
      x.beginPath(); x.moveTo(bx, top + rnd() * 10); x.lineTo(bx + 11 + rnd() * 10, top + rnd() * 22); x.stroke();
      if (rnd() > 0.4) { x.beginPath(); x.moveTo(bx, bot); x.lineTo(bx + 9 + rnd() * 12, bot - 8 - rnd() * 14); x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  const MAT_PIXO = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: pixoTex(311 + i * 977), transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3 }));
  const MAT_CXDAGUA = lam({ color: 0x2f5fa0, roughness: 0.5 });
  // hash de avalanche (mesma razão do ferro velho: `i % n` com passo divisível cai sempre no
  // mesmo balde e o quarteirão inteiro sai da MESMA cor/altura — o "chapado" do BAR §4.4)
  const mix32 = (n) => { let v = (n * 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0; v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0; return (v ^ (v >>> 16)) >>> 0; };

  /* ===================== DECALQUE DE RUA (public/img/decals) =====================
     Pedido literal do dono (04/08): "aplicar na textura de todos mapas onde faz sentido:
     laterais de prédios, portas, portões, carros, pilastras, paredes ... e num tamanho MAIOR
     que os posters atuais para serem bem visíveis". Os cartazes do Piscinão têm 2,2 m de
     altura; o mural daqui vai a 3,4 m e a tag do muro a 2,4 m.

     CINCO DECISÕES QUE NÃO SÃO ESTILO — cada uma tem um defeito real atrás:
     1. `T.decals[i]` é GETTER MEMOIZADO (textures.js:696-709): ler por ÍNDICE baixa UM PNG.
        Spread ou `.map()` no array acordaria os 179 de uma vez (7 MB) por nada. Por isso os
        pools abaixo são listas de ÍNDICE e a textura só nasce quando a parede é construída.
     2. `transparent: true` é obrigatório: o PNG tem alpha e sem isso o fundo vira retângulo
        preto colado na parede (textures.js:511).
     3. É PLANO SEM COLLIDER. Decalque que empurra colisor vira parede invisível — foi o
        BUG-21 do ônibus da Brasília, 2,33 m de parede fantasma.
     4. 6-7 cm de afastamento da face: coplanar com o reboco é z-fighting garantido.
     5. ESCOLHA DETERMINÍSTICA por posição (mix32 de x,z quantizados). `Math.random()` no
        build faria o mapa mudar a cada carregamento — e o `botsim` é determinístico.

     POR QUE O POOL 'alfabeto' (47 dos 179 arquivos) FICOU DE FORA: são folhas de estudo de
     letra recortadas em UMA letra — traço fino, quase todas em tinta clara. Uma letra solta
     de 3 m na parede não lê como pixo, lê como sujeira, e a 10 m some (BAR-CONSISTENCIA
     §2.1: "nenhum detalhe de textura pode ser invisível a 10 m"). Ruído de parede foi o que
     REPROVOU o Piscinão de Ramos ("muito poluído, não dá pra entender nada"), então o que
     entra aqui é só o que tem contorno preto fechado e silhueta reconhecível de longe. */
  const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png',
    'personagens-graffiti-02.png', 'personagens-graffiti-03.png', 'personagens-graffiti-04.png',
    'personagens-graffiti-05.png', 'personagens-graffiti-06.png', 'personagens-graffiti-07.png',
    'peca-bolha.png', 'bandeira-vira-lata.png',
    'or-graf-treta.png', 'or-graf-coro.png',                // originais OpenRouter versionados
    'or-stencil-capivara.png', 'or-stencil-pomba.png']);    // (únicos vivos em prod)
  /* CARAS: só as folhas que têm OLHOS + BOCA na mesma peça. O pacote tem ~50 recortes de
     olho ou boca SOLTOS ('olhos-bocas-*', e 'caras-cartoon-14'/'caras-vintage-04' são um
     olho só): ampliados a 3 m viram uma mancha preta abstrata na parede — foi o que
     apareceu na 1ª captura. Cara inteira lê como mural; fragmento lê como borrão. */
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png',
    'caras-cartoon-11.png', 'caras-cartoon-17.png', 'caras-cartoon-20.png', 'caras-cartoon-23.png',
    'caras-vintage-01.png', 'caras-vintage-07.png', 'caras-vintage-11.png', 'caras-vintage-14.png',
    'caras-vintage-16.png']);
  const D_FACHADA = D_MURAL.concat(D_CARA);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png',
    'tag-pingo.png', 'tag-selvagem.png', 'tags-treino-02.png', 'tags-treino-05.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png',
    'dont-overthink.png', 'gratidao-sol.png', 'meio-ano.png', 'pra-gringo.png']);
  /* LEVA NOVA (06/08, gerada no Mint como folha e recortada pelo gen-graffiti-decals):
     pixação SP em pé (a escrita da cidade real), throw-ups coloridos, personagens de
     grafite e a cartazera de lambes. O dono, olhando o mapa: "tem que meter muito mais
     grafites e posters nos mapas, especialmente o quebrada — todas as casas tem que
     estar cheias de grafites e os muros de proteção então mete ainda mais". Ele decide:
     a regra de contenção de 05/08 (§2.1/C23) fica registrada acima e foi SUPERADA por
     esta. O que se mantém: nada no anel de bandeira nem na boca de beco (§2.4 — ler
     inimigo continua à frente de parede carregada). */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png',
    'folha-pixaca-04.png', 'folha-pixaca-05.png', 'folha-pixaca-06.png', 'folha-pixaca-07.png',
    'folha-pixaca-08.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png',
    'folha-throwu-04.png', 'folha-throwu-05.png', 'folha-throwu-06.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-02.png', 'folha-person-03.png',
    'folha-person-04.png', 'folha-person-05.png', 'folha-person-06.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  /* ADESIVO: peça PEQUENA (0,5–0,95 m) pro resgate da passada — canto de muro, faixa
     entre porta e janela, lateral de caixa d'água. Só recorte de silhueta fechada, que
     é o que aguenta ser lido a 0,5 m sem virar borrão; os `olhos-bocas-*` do pacote
     ficam de fora aqui pelo mesmo motivo de sempre (fragmento vira mancha). */
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png',
    'tags-treino-04.png', 'tags-treino-05.png', 'tags-treino-06.png', 'tag-pingo.png',
    'tag-money.png', 'tag-selvagem.png', 'or-stencil-capivara.png', 'or-stencil-pomba.png',
    'coelho-rosa.png', 'bola-amarela.png']);
  /* PORTA DE AÇO: pool de tinta CLARA (a chapa é 0x2b2926) e SÓ peça em pé (aspecto < 1).
     Porta tem ~1,3-2,3 m de vão: arte deitada encolhe pra caber na largura e sobra uma
     tarja de 1,1 m no meio de uma porta de 2,1 m — pequena e sem intenção. */
  const D_PORTA = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-02.png',
    'personagens-graffiti-04.png', 'personagens-graffiti-06.png', 'tags-treino-06.png']);
  const _dmat = new Map(), _usados = [];
  const decalMat = (i) => {
    let m = _dmat.get(i);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        map: T.decals[i], transparent: true, alphaTest: 0.22, roughness: 0.98, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      });
      _dmat.set(i, m);
    }
    return m;
  };
  /* `alt` é a altura pedida e `larg` o TETO de largura: a peça encolhe inteira (nunca estica)
     pra caber no módulo de parede, com o aspecto original de `T.decalAspects`. Arte esticada
     é a primeira coisa que denuncia decalque colado no automático. */
  function decal(pool, x, y, z, ry, alt, larg = 99) {
    if (!T.decals || !T.decalAspects || !pool.length) return null;
    /* HASH EM DUAS PASSADAS. A 1ª versão era `round(x*10)*73856093 ^ round(z*10)*19349663`:
       os dois produtos estouram 2^32, o `^` do JS trunca pra int32 e o resultado colide —
       a MESMA arte saía 3× na mesma parede da viela. Passar x pelo mix32 antes de somar z
       tira a correlação (x é CONSTANTE ao longo de uma parede, então tudo depende de z). */
    const k = mix32(mix32(Math.round(x * 10) + 9973) + Math.round(z * 10) * 131 + 7);
    /* ANTI-REPETIÇÃO LOCAL. O hash espalha bem, mas com pool de 6-12 peças e 6 vagas por
       parede o paradoxo do aniversário cobra: na 1ª medição a MESMA arte saiu 3× na mesma
       viela, a ~10 m uma da outra. Arte repetida PERTO lê como falha de asset, não como
       cidade. Se a peça sorteada já está a menos de 14 m, anda uma casa no pool — continua
       100% determinístico (mesma ordem de construção → mesmo resultado). */
    let i = pool[k % pool.length];
    for (let t = 0; t < pool.length; t++) {
      const j = pool[(k + t) % pool.length];
      if (!_usados.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 14)) { i = j; break; }
    }
    const a = T.decalAspects[i] || 1;
    let h = alt, w = alt * a;
    if (w > larg) { w = larg; h = larg / a; }
    /* PAREDE MEDIDA, NÃO DECLARADA (06/08). Com os barracos GLB no mapa, o paredeAtras
       (25 raios, plano de 25 cm) reprovava ~80% das peças NO NAVEGADOR — o GLB desenha a
       parede centímetros fora do plano procedural e com micro-recuos. O dono via parede
       pelada: 15 peças na tela de 75 colocadas. `medirParede` acha a face VISÍVEL e a peça
       recua/avança até 3 cm dela; sem face visível em 1,2 m, ou degrau > 0,6 m entre
       colunas, a peça morre como antes (peça no ar continua proibida).
       Vem antes do `_usados` de propósito: peça reprovada não gasta vaga da anti-repetição. */
    const recuo = medirParede([root], x, y + h / 2, z, ry, w, h);
    if (recuo === null) return null;
    x -= Math.sin(ry) * recuo; z -= Math.cos(ry) * recuo;   // cola na face que o jogador vê
    _usados.push({ i, x, z });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(i));
    m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.renderOrder = 2;
    // nome = quem é o arquivo: em node a textura nunca carrega, então esta é a ÚNICA forma
    // de uma régua conferir POSIÇÃO e TAMANHO do que foi colado (tools/eval/decal-probe).
    m.name = 'decal:' + (T.decalFiles ? T.decalFiles[i] : i);
    esconderSeFaltar(m, T.decals[i]);   // PNG 404 em prod vira BRANCO CHAPADO se não sumir (ver graffiti_pass.esconderSeFaltar)
    /* recebe sombra, não projeta: tinta na parede escurece junto com a parede. Sem
       `receiveShadow` o mural fica ACESO dentro da sombra do prédio e denuncia o adesivo;
       com `castShadow` ele projetaria um retângulo no chão, que é pior ainda. */
    m.receiveShadow = true;
    root.add(m);   // NÃO entra em `occluders` nem em `colliders`: é tinta, não é peça
    return m;
  }
  /* Mural na FACHADA DE UM LOTE: a altura sai do barraco que está ATRÁS do ponto, não de uma
     constante. Sem isso o mural de 3,4 m sobra pra fora do telhado das casas de 2,70 m —
     arte flutuando no céu, que nenhuma régua numérica pega. */
  const LOTES = [];   // {x0,x1,z0,z1,h} de cada módulo de barraco já construído
  const loteEm = (x, z) => { for (const L of LOTES) if (x >= L.x0 && x <= L.x1 && z >= L.z0 && z <= L.z1) return L; return null; };
  /* y0 = 0,30 m e não 0,55, e a folga de topo é 0,12 m e não 0,30: com os valores antigos o
     mural na casa mais BAIXA do elenco (2,70 m) saía com 1,85 m de altura — MENOR que os
     2,2 m dos cartazes do Piscinão, que é exatamente o contrário do que foi pedido. Com
     0,30/0,12 o pior caso vira 2,28 m e o melhor 3,40 m. A folga de topo pode ser pequena
     porque a laje/telha ainda avança 0,22 m à frente da parede e esconde a emenda. */
  function decalFachada(pool, x, z, ry, larg, y0 = 0.3, altMax = 3.4) {
    const L = loteEm(x - Math.sin(ry) * 0.4, z - Math.cos(ry) * 0.4);
    if (!L) return null;
    const alt = Math.min(altMax, L.h - y0 - 0.12);
    if (alt < 0.8) return null;
    /* A PEÇA NÃO PODE CRUZAR A DIVISA DO MÓDULO. Cada barraco de um quarteirão tem altura
       própria (2,70 a 4,38 m): um mural centrado em cima da divisa fica metade colado na
       casa alta e metade PENDURADO ACIMA DO TELHADO da casa baixa ao lado. Largura e centro
       são grampeados no lote — é o que mantém a arte colada numa parede só. */
    const emZ = Math.abs(Math.sin(ry)) > 0.5;                        // a parede corre em z?
    const a0 = emZ ? L.z0 : L.x0, a1 = emZ ? L.z1 : L.x1;
    const w = Math.min(larg, a1 - a0 - 0.5);
    if (w < 0.8) return null;
    const c = Math.min(Math.max(emZ ? z : x, a0 + w / 2 + 0.25), a1 - w / 2 - 0.25);
    return decal(pool, emZ ? x : c, y0, emZ ? c : z, ry, alt, w);
  }

  let _bi = 0;
  function barraco(x0, x1, z0, z1, o = {}) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const k = mix32(++_bi + (o.seed || 0));
    const h = o.h || (2.7 + (k % 5) * 0.42);
    solids.push({ x0, x1, z0, z1 });
    LOTES.push({ x0, x1, z0, z1, h });
    /* GLB: quando os barracos do Tripo carregam, TODA a malha procedural deste módulo some
       da tela (`vis`) e o volume passa a ser desenhado pelos GLB do `barracoGlb` abaixo.
       Colisor, occluder e `solids` ficam onde estavam — ver "ACABAMENTO GLB". */
    const glb = o.glb !== false && BARRACOS_GLB.length > 0;
    /* userData.glbFallback: marca "isto é o proxy que some quando o GLB carrega".
       O TEX1 (mat-check superficiesLisas) pula malha marcada — no node nenhum GLB
       carrega e o proxy fica visível de material cru, o que enchia o TEX1 de
       superfície branca que jogador nenhum vê. A marca é estática (independe do
       GLB ter carregado) justamente para valer no node. */
    /* GLB carregado = fallback sai de `occluders` junto com a tela (BUG-54): a bala
       passa a testar a malha visível do lote/fachada. Colisor continua sendo a caixa. */
    const vis = (m) => {
      m.userData.glbFallback = true;
      if (!glb) return m;
      const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1);
      return hide(m);
    };
    vis(addBox(w, h, d, o.mat || MAT_BARRACO[k % MAT_BARRACO.length], cx, 0, cz));
    const temUp = o.up !== false && (k >> 3) % 3 !== 0;
    /* LAJE ou FIBROCIMENTO, e a escolha não é sorteio decorativo: quem vai levantar outro
       andar deixa LAJE (e é ela que segura a caixa d'água); quem parou de construir fecha
       com TELHA ONDULADA. Amarrar o material ao `temUp` faz a silhueta contar essa história
       sozinha — laje sempre embaixo de um 2º pavimento, telha sempre em casa térrea. */
    vis(addBox(w + 0.44, temUp ? 0.18 : 0.14, d + 0.44, temUp ? MAT_LAJE : MAT_TELHA, cx, h, cz));
    // PIXO na face virada pra fora do quarteirão (a que o jogador vê da rua ou da viela).
    // Em modo GLB o pixo procedural não é nem criado: ele é uma casca a 0,03 m da caixa que
    // acabou de sumir, e ficaria flutuando na frente do barraco novo.
    if (!glb && (k >> 15) % 3 === 0) {
      const p = MAT_PIXO[(k >> 17) % MAT_PIXO.length], alt = Math.min(1.5, h * 0.5), y0 = h * 0.28;
      if (d >= w) for (const s of [-1, 1]) addBox(0.04, alt, Math.min(d * 0.8, 4), p, cx + s * (w / 2 + 0.03), y0, cz, { collide: false, cast: false, vao: false });
      else for (const s of [-1, 1]) addBox(Math.min(w * 0.8, 4), alt, 0.04, p, cx, y0, cz + s * (d / 2 + 0.03), { collide: false, cast: false, vao: false });
    }
    if (temUp) {                                                                  // 2º pavimento parcial
      const uh = 2.3 + ((k >> 5) % 4) * 0.3, uw = w * 0.68, ud = d * 0.74;
      const ox = ((k >> 7) % 3 - 1) * (w - uw) * 0.4, oz = ((k >> 9) % 3 - 1) * (d - ud) * 0.4;
      vis(addBox(uw, uh, ud, MAT_BARRACO[(k >> 11) % MAT_BARRACO.length], cx + ox, h + 0.18, cz + oz));
      vis(addBox(uw + 0.36, 0.16, ud + 0.36, MAT_LAJE, cx + ox, h + 0.18 + uh, cz + oz));
      if ((k >> 13) % 2) vis(addBox(1.0, 1.0, 1.0, MAT_CXDAGUA, cx + ox + uw * 0.28, h + 0.34 + uh, cz + oz, { collide: false }));
    } else if ((k >> 4) % 2) vis(addBox(1.0, 1.0, 1.0, MAT_CXDAGUA, cx + w * 0.25, h + 0.18, cz, { collide: false }));
    if (glb) barracoGlb(x0, x1, z0, z1, k);
    return { cx, cz, h, w, d };
  }
  /* LADRILHAMENTO DO LOTE COM O BARRACO GLB.
     O `placeProp` escala UNIFORME (só a altura é livre), então um modelo de proporção fixa
     nunca preenche um retângulo qualquer. A saída é ladrilhar: a escala é escolhida para o
     lote FECHAR EXATO no eixo X (nenhuma sobra invadindo a calçada, que é o defeito que
     produziria malha visível sem colisor embaixo) e o eixo Z é coberto por N cópias com
     sobreposição para dentro — favela real tem casa encostada em casa, então a junta some.
     A ALTURA SAI DA LARGURA DO LOTE (5,3 m de frente → ~5,5 m de altura): é o que dá
     variação de gabarito de quarteirão sem sortear número, e é a mesma história que o
     `temUp` já contava. As duas variantes alternam por hash — um único modelo repetido 50
     vezes é o "chapado" que a base já documentou no BAR §4.4. */
  /* AS DUAS CASAS SÃO DA PASTA DE REFERÊNCIA, e a escolha é do dono: "quero o padrão visual
     desses GLBs". Elas também são MUITO mais baratas que o que um gerador entrega —
     `fav_house` tem 1.070 triângulos e `fav_brasileira` 780, contra ~4.000 de um barraco
     gerado no Tripo com a mesma silhueta. Com ~100 instâncias no mapa isso é a diferença
     entre +100 mil e +400 mil triângulos no passe de sombra, que é o passe que desenha o
     mapa INTEIRO todo quadro (o frustum não corta sombra). Máquina fraca é requisito.
     `fav_house` é a casa de dois pavimentos com escada externa e laje; `fav_brasileira` é o
     bloco de tijolo cru, que é o que preenche fundo de quarteirão sem chamar atenção. */
  const BARRACOS_GLB = ['fav_house', 'fav_brasileira'].filter(useGlb);
  function barracoGlb(x0, x1, z0, z1, k) {
    const w = x1 - x0, d = z1 - z0;
    const nx = Math.max(1, Math.round(w / 4.6));               // ~4,6 m de frente por casa
    for (let i = 0; i < nx; i++) {
      const id = BARRACOS_GLB[(k >> (2 + i)) % BARRACOS_GLB.length];
      const a = glbAspect(id);
      if (!a) continue;
      /* `a.w` é largura/altura do modelo, então a altura sai do encaixe: o barraco de dois
         pavimentos (estreito e alto) chega a ~6 m com 4,6 m de frente e o barraco térreo
         (largo e baixo) chega a ~3,3 m com a MESMA frente. É o modelo que decide o gabarito,
         não um número sorteado — e é o que faz o quarteirão ter recorte de altura de verdade. */
      const s = w / nx / a.w;                                  // altura = escala (aspecto medido a targetH=1)
      const nz = Math.max(1, Math.ceil(d / (s * a.d)));
      for (let j = 0; j < nz; j++)
        pbAdd(PB, id, {
          x: x0 + w * (i + 0.5) / nx, z: z0 + d * (j + 0.5) / nz,
          targetH: s * (1 + (((k >> (5 + j)) & 3) - 1.5) * 0.03),   // ±4,5% de gabarito
          ry: ((k >> (7 + i + j)) & 1) ? Math.PI : 0,
        });
    }
  }
  /* QUARTEIRÃO: fatia um lote comprido em módulos de ~5,6 m. É o que impede o "mesmo módulo
     repetido" e o que mantém cada pegada abaixo do teto de 60 m² da MAP5. */
  function quarteirao(x0, x1, z0, z1, seed = 0) {
    const dx = x1 - x0, dz = z1 - z0;
    if (dz >= dx) { const n = Math.max(1, Math.round(dz / 5.6)); for (let i = 0; i < n; i++) barraco(x0, x1, z0 + dz * i / n, z0 + dz * (i + 1) / n, { seed: seed + i * 17 }); }
    else { const n = Math.max(1, Math.round(dx / 5.6)); for (let i = 0; i < n; i++) barraco(x0 + dx * i / n, x0 + dx * (i + 1) / n, z0, z1, { seed: seed + i * 23 }); }
  }

  /* ===================== A RUA =====================
     14 m de asfalto (x ∈ [-7,7]) e calçadas de 5,5 m (x ∈ [∓12,5, ∓7]) de z = -20 (boca da
     praça) a z = 24 (travessa do campinho). A calçada é LARGA de propósito: é onde cabem a
     mesa do bar, o ponto de ônibus, a barraca e a barricada sem estrangular o corredor —
     e cada uma dessas peças é uma unidade de cover que a MAP5 conta.
     A calçada sobe 0,02 m e o meio-fio tem 0,14 m: os dois ficam ABAIXO do degrau de 0,30 m
     que o corpo sobe (game.js `_collide` só bloqueia colisor com maxY > 0,30), então nem o
     jogador nem o flood-fill das réguas tropeçam neles. Por isso o meio-fio vai com
     `collide:false`: dar-lhe colisor não mudaria o andar e só engordaria a lista quente. */
  const RUA_Z0 = -20, RUA_Z1 = 24, RUA_D = RUA_Z1 - RUA_Z0, RUA_ZC = (RUA_Z0 + RUA_Z1) / 2;
  addFloor(14, RUA_D, 0, RUA_ZC, MAT.asphalt);
  for (const sx of [-1, 1]) {
    addFloor(5.5, RUA_D, sx * 9.75, RUA_ZC, MAT.concrete, 0.02);
    addBox(0.22, 0.14, RUA_D, MAT.concreteDark, sx * 7.11, 0, RUA_ZC, { collide: false, cast: false });
  }
  // faixa de pedestre nas duas bocas da rua (praça e travessa) — leitura de "rua de verdade"
  const faixaMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const fz of [-18.5, 22.5]) for (let i = -3; i <= 3; i++) addFloor(0.8, 3.2, i * 1.9, fz, faixaMat, 0.012);

  /* POSTES DE LUZ com braço e fiação aparente — o poste é o prop mais barato que existe
     (2 caixas) e é cover DE PÉ: 0,22 m de largura não esconde ninguém, mas quebra a linha
     de tiro do corredor reto, que é o defeito nº 1 de rua comprida. */
  const posteMat = lam({ color: 0x8f8b84, roughness: 0.7 });
  const POSTES = [];
  for (let pz = -16; pz <= 22; pz += 9.5) POSTES.push([-12.1, pz], [12.1, pz + 4.75]);
  for (const [px, pz] of POSTES) {
    addBox(0.24, 6.4, 0.24, posteMat, px, 0, pz);
    addBox(1.5, 0.14, 0.16, posteMat, px + (px < 0 ? 0.75 : -0.75), 6.2, pz, { collide: false, cast: false });
    addBox(0.5, 0.16, 0.3, lam({ color: 0xcfc9b4, emissive: 0x2a2418 }), px + (px < 0 ? 1.4 : -1.4), 6.05, pz, { collide: false, cast: false });
  }

  /* ===================== QUARTEIRÕES, VIELAS E BECOS =====================
     Os vãos que NÃO recebem barraco são a malha de circulação, e ela é o coração da CTF2:
       VIELA OESTE  x ∈ [-25,-21], z ∈ [-38, 28]  (nasce na vila do baile, morre na travessa)
       VIELA LESTE  x ∈ [ 21, 25], z ∈ [-40, 28]  (nasce na passagem leste da praça)
       BECOS oeste  z ∈ [-12,-9] · [1,4] · [15,18]   (atravessam o bloco x ∈ [-21,-12,5])
       BECOS leste  z ∈ [-5,-2] · [9,12] · [19,22]   (atravessam o bloco x ∈ [12,5, 21])
     Os becos dos dois lados são DESENCONTRADOS de propósito (nenhum par no mesmo z): beco
     alinhado com beco vira uma travessa reta que atravessa a rua inteira — outra linha de
     tiro de ponta a ponta, exatamente o que este mapa não pode ter. Desencontrados, quem sai
     de um beco cai na calçada oposta sem ninguém já mirando o vão.
     Separação medida: eixo da rua x = 0 contra eixo da viela x = ∓23 → 23 m, quase 4× o
     mínimo de 6 m da CTF2. */
  quarteirao(-28, -25, -46.5, 28, 101);          // fundo oeste (fecha o mapa atrás da viela)
  quarteirao(25, 28, -46.5, 28, 211);            // fundo leste
  quarteirao(-12.5, 21, -46.5, -43, 251);        // perímetro norte da praça
  quarteirao(-25, -12.5, -46.5, -45, 271);       // fundo da vila do baile (atrás do spawn P)
  quarteirao(21, 25, -46.5, -40, 281);           // tampa norte da viela leste
  // bloco OESTE — 4 lotes, 3 becos
  quarteirao(-21, -12.5, -38, -12, 301);
  quarteirao(-21, -12.5, -9, 1, 311);
  quarteirao(-21, -12.5, 4, 15, 321);
  quarteirao(-21, -12.5, 18, 24, 331);
  // bloco LESTE — 5 lotes, 3 becos + a passagem da praça pra viela leste (z ∈ [-40,-36])
  quarteirao(12.5, 21, -43, -40, 401);
  quarteirao(12.5, 21, -36, -5, 411);
  quarteirao(12.5, 21, -2, 9, 421);
  quarteirao(12.5, 21, 12, 19, 431);
  quarteirao(12.5, 21, 22, 24, 441);
  // fundos do campinho
  quarteirao(-28, -22, 28, 46.5, 501);
  quarteirao(22, 28, 28, 46.5, 551);
  /* MURO DA VILA — anteparo solto de 6 m no meio do pátio do spawn P, NÃO uma parede que o
     fecha. A diferença é a MAP2B: emparedar o respawn zera a exposição e reprova do outro
     lado (folga ≥ 1,20 m e ≥ 40 m² de chão CONTÍGUO num raio de 5 m — foi assim que a fresta
     do depósito da Havan passou verde e ficou péssima). Solto, ele corta a visada direta da
     praça pros slots e ainda deixa contornar pelos dois lados. */
  // 5 m em x ∈ [-20,5, -15,5]: cobre a diagonal que vem do miolo da praça (é ela que dá visada
  // aos slots do fundo) e sai da frente do slot de x = -14,5, cujo disco de 5 m estava sendo
  // cortado pelo próprio muro — 39,3 m² contíguos contra o piso de 40 m² da MAP2B.
  addBox(5, 2.4, 0.35, lam({ map: T.concrete, color: 0x9c9488 }), -18, 0, -40);

  /* ===================== A ROTUNDA DO BAILE =====================
     "uma rotunda no final onde teria 2 carros tunados e caixas de som". A praça é o largo
     x ∈ [-12,5, 12,5] × z ∈ [-43,-20] com a ilha da rotunda no meio. O meio-fio da ilha tem
     0,16 m — abaixo do degrau de 0,30 m do `_collide` — então a ilha é PISÁVEL e o baile
     acontece em cima dela; quem dá cobertura ali são os carros e o paredão, que são
     colisores de verdade. */
  addFloor(25, 23, 0, -31.5, MAT.asphalt);
  {
    const ilha = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.9, 0.16, 24), MAT.concreteDark);
    ilha.position.set(0, 0.08, -31.5); ilha.receiveShadow = true; root.add(ilha);
  }

  /* CARRO TUNADO e CAIXA DE SOM são PROCEDURAIS (caixa e plano, como o resto do mapa).
     ANOTADO NO RELATÓRIO: os dois são candidatos naturais a GLB depois — nenhum dos 99 props
     de public/models/props é um carro rebaixado de som nem uma torre de caixas.
     COLISÃO — BUG-21: o carro fica em ÂNGULO com o eixo (é o que faz a roda ler como "parou
     de qualquer jeito no meio da rotunda"), e o motor não tem collider rotacionado. Cada
     peça girada vai com `collide:false` + `colRot`, e a malha é empurrada À MÃO pra
     `occluders` — senão a bala atravessa o carro (occluder é o que a bala testa, não o
     colisor). */
  const occ = (m) => { if (m.visible !== false) occluders.push(m); return m; };   // fallback escondido não é occluder (BUG-54)
  const MAT_PNEU = lam({ color: 0x1c1e22, roughness: 0.9 });
  const MAT_VIDRO = lam({ color: 0x1b2430, roughness: 0.22, metalness: 0.4 });
  function carroTunado(cx, cz, ry, cor) {
    /* GLB `tiara_gt83` (references/favela — cupê rebaixado). Ele já vem em ESCALA DE MUNDO
       (4,17 × 1,22 × 1,74 m) e com o comprimento no X local, que é a mesma convenção da
       caixa procedural (4,4 × 0,62 × 1,82) — então não há rotação de correção, e a 1,25 m de
       altura ele dá 4,28 × 1,79 m, praticamente o volume que o `colRot` já cobria. */
    const glbCar = useGlb('tiara_gt83');
    const vis = (m) => { m.userData.glbFallback = true; if (!glbCar) return m; const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1); return hide(m); };  // ver barraco()
    if (glbCar) pbAdd(PBC, 'tiara_gt83', { x: cx, z: cz, targetH: 1.25, ry, color: cor });
    const pint = lam({ color: cor, roughness: 0.28, metalness: 0.55, envMapIntensity: 1.6 });
    occ(vis(addBox(4.4, 0.62, 1.82, pint, cx, 0.28, cz, { ry, collide: false })));        // lataria rebaixada
    occ(vis(addBox(2.3, 0.58, 1.66, MAT_VIDRO, cx, 0.90, cz, { ry, collide: false })));   // cabine/vidros
    occ(vis(addBox(2.1, 0.10, 1.70, pint, cx, 1.48, cz, { ry, collide: false })));        // teto
    /* AEROFÓLIO — a peça tem que sair pela TRASEIRA, que é o -x LOCAL do carro. A 1ª versão
       usava `cx - sin(ry)*1.9`, que é o deslocamento em +z local: o aerofólio nascia 1,9 m ao
       LADO do carro, fora da malha coberta pelo `colRot`, e a MAP1 acusou dois pontos de chão
       com o corpo DENTRO de sólido a 1,24 m de penetração — geometria visível sem colisor
       nenhum embaixo, exatamente o defeito "submerso embaixo da estátua". A conversão certa é
       a mesma do `colRot`: world = (cx + lx·cos + lz·sen, cz − lx·sen + lz·cos). */
    occ(vis(addBox(1.1, 0.34, 1.30, pint, cx - 1.55 * Math.cos(ry), 0.90, cz + 1.55 * Math.sin(ry), { ry, collide: false }))); // aerofólio/mala
    // rodas procedurais: o GLB já traz as dele. Sem este `if` sobravam quatro cilindros
    // pretos boiando em volta do carro novo — foi o que a captura `after1` mostrou.
    if (!glbCar) for (const [lx, lz] of [[1.5, 0.85], [1.5, -0.85], [-1.5, 0.85], [-1.5, -0.85]]) {
      const wx = cx + lx * Math.cos(ry) + lz * Math.sin(ry), wz = cz - lx * Math.sin(ry) + lz * Math.cos(ry);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.24, 12), MAT_PNEU);
      r.rotation.set(Math.PI / 2, 0, ry); r.position.set(wx, 0.30, wz); r.castShadow = true; root.add(r);
    }
    colRot(cx, cz, 4.4, 1.82, 0, 1.55, ry, 6, 3);   // grade 6×3 no espaço local (BUG-21)
  }
  /* PAREDÃO: torre de caixas empilhadas. GLB `caixa_som` quando carrega, caixa preta com
     cone quando não (e em node NUNCA carrega, então o fallback é o que as réguas medem). */
  const MAT_CAIXA = lam({ color: 0x17171a, roughness: 0.72 });
  const MAT_CONE = lam({ color: 0x6b6257, roughness: 0.85 });
  /* PROPORÇÃO DO PAREDÃO, medida no `caixa_som_baile` com tools/_tmp/propshot.mjs:
     largura/altura = 0,44 e profundidade/altura = 0,99. Ela vira CONSTANTE aqui — e não uma
     leitura do GLB em tempo de execução — porque o colisor tem que ser idêntico no browser e
     em node, senão as réguas medem um mapa que ninguém joga. O fallback procedural é montado
     dentro da MESMA pegada, então os dois modos colidem igual.
     A 1ª versão colidia 1,0 × 0,72 m com o GLB ocupando 1,25 × 2,82: 2,1 m de torre de som
     sem nada embaixo — a mesma família de defeito do BUG-21, só que ao contrário (malha
     visível que o corpo atravessa em vez de parede invisível). */
  const PAR = { w: 0.44, d: 0.99 };
  function paredao(cx, cz, ry, n = 3) {
    const H = n * 0.95, W = PAR.w * H, D = PAR.d * H;
    /* `caixa_som_baile` (Tripo) é a TORRE inteira, não uma caixa avulsa: entra UMA vez, com a
       altura do empilhamento (1,9 m com n=2, 2,85 m com n=3 — o paredão de rua de verdade).
       ISTO TAMBÉM CONSERTA UM DEFEITO REAL do caminho antigo: `gprop` não recebe `y`, então
       as N cópias de `caixa_som` eram todas plantadas em y = 0, uma DENTRO da outra — o que
       aparecia na captura como uma caixinha solta no chão em vez de um paredão. */
    if (!gpropC('caixa_som_baile', cx, cz, H, ry)) for (let i = 0; i < n; i++) {
      const y = i * (H / n);
      occ(addBox(W, H / n, D, MAT_CAIXA, cx, y, cz, { ry, collide: false }));
      occ(addBox(W * 0.62, W * 0.62, 0.06, MAT_CONE, cx + Math.sin(ry) * (D / 2 + 0.03), y + H / (n * 2) - W * 0.31, cz + Math.cos(ry) * (D / 2 + 0.03), { ry, collide: false, cast: false }));
    }
    colRot(cx, cz, W, D, 0, H, ry, 2, 3);
  }
  carroTunado(-4.5, -33.5, 0.82, 0xd8232a);     // rebaixado vermelho, atravessado na ilha
  carroTunado(-1.2, -27.6, -0.55, 0x1f66c4);    // azul-elétrico
  paredao(2.4, -35.2, 0.35, 3);
  paredao(-6.8, -28.6, -0.9, 2);
  paredao(4.6, -35.9, 0.35, 2);

  /* ===================== O CAMPINHO DE TERRA (respawn do time B) =====================
     "do outro lado no final da rua seria um campinho de terra de futebol onde seria o
     respawn do outro time". Terra batida x ∈ [-22,22] × z ∈ [28,46], travessa de 4 m ligando
     rua + as duas vielas ao campo.
     O MURO DE 2,2 m NA BOCA DO CAMPO (z = 28) É O QUE SALVA O RESPAWN. Sem ele o campinho é
     um descampado de 18 m no fim de uma rua reta de 44 m: qualquer ponto da rua tem visada
     limpa até quem nasce, que é exatamente o "respawn visível de fora" que a MAP2 mede. O
     muro é maciço em x ∈ [-9,9] — bem em cima do eixo da rua — e abre em DOIS portões
     (x ∈ [-15,-9] e [9,15]). Dois portões, não um: além de cortar a visada do eixo, eles
     dão as duas entradas separadas por 24 m que a CTF2 cobra na bandeira do campinho. */
  addFloor(44, 18, 0, 37, MAT.dirt);
  addFloor(50, 4, 0, 26, MAT.concreteDark, 0.015);              // travessa (asfalto gasto)
  {   // linhas de cal (só pintura — nada de colisor)
    const cal = new THREE.MeshStandardMaterial({ color: 0xd9d3c4, roughness: 0.95, transparent: true, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const lz of [29.5, 44.5]) addFloor(30, 0.22, 0, lz, cal, 0.02);
    for (const lx of [-15, 15]) addFloor(0.22, 15, lx, 37, cal, 0.02);
    const circ = new THREE.Mesh(new THREE.RingGeometry(4.3, 4.55, 32), cal);
    circ.rotation.x = -Math.PI / 2; circ.position.set(0, 0.02, 37); root.add(circ);
  }
  const MAT_MURO = lam({ map: T.concrete, color: 0xb5aa99, emissive: 0x25180d, emissiveIntensity: 0.45, roughness: 0.97 });
  for (const [mx0, mx1] of [[-22, -15], [-9, 9], [15, 22]])
    addBox(mx1 - mx0, 2.2, 0.34, MAT_MURO, (mx0 + mx1) / 2, 0, 28);
  // Da linha do spawn, o anteparo central lia como um bloco preto sem saída. Os dois
  // painéis deixam explícitos os portões laterais que já existem e mantêm a proteção MAP2.
  const rotaMuro = (lado) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 192;
    const x = c.getContext('2d');
    x.fillStyle = lado < 0 ? '#0d5266' : '#a94122'; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#f2c94c'; x.lineWidth = 14; x.strokeRect(10, 10, 492, 172);
    x.fillStyle = '#f7e7b1'; x.textAlign = 'center'; x.font = '900 60px Impact,sans-serif';
    x.fillText(lado < 0 ? '← BECO' : 'BECO →', 256, 118);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t });
  };
  for (const lado of [-1, 1]) {
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.55), rotaMuro(lado));
    placa.position.set(lado * 5.2, 1.12, 28.19); root.add(placa);
  }
  addBox(18.4, 0.16, 0.42, lam({ color: 0xe0b632, emissive: 0x4a3000, emissiveIntensity: 0.35 }), 0, 2.2, 28, { collide: false, cast: false });
  // TRAVES — dois postes e um travessão por gol. O poste é fino (0,14 m) e não esconde
  // ninguém, mas é peça de cobertura pra MAP5 e referência de leitura do campo.
  const MAT_TRAVE = lam({ color: 0xe6e2d6, roughness: 0.8 });
  for (const gz of [29.9, 44.1]) {
    for (const gx of [-2.6, 2.6]) addBox(0.16, 2.2, 0.16, MAT_TRAVE, gx, 0, gz);
    addBox(5.36, 0.16, 0.16, MAT_TRAVE, 0, 2.2, gz, { collide: false });
  }
  /* ALAMBRADO PARCIAL nas laterais: mourões a cada 4 m com painel de tela. A tela é
     `collide:false` de propósito — o campo tem que continuar ligado às margens (é de lá que
     sai a 2ª rota pra bandeira do campinho); quem conta como cover são os mourões. */
  const MAT_TELA = new THREE.MeshStandardMaterial({ color: 0x6e7a6a, roughness: 0.9, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
  for (const sx of [-16.4, 16.4]) for (let mz = 30; mz <= 46; mz += 4) {
    addBox(0.16, 2.6, 0.16, posteMat, sx, 0, mz);
    if (mz < 46) { const t = addBox(0.05, 2.4, 4, MAT_TELA, sx, 0, mz + 2, { collide: false, cast: false }); t.receiveShadow = false; }
  }
  // arquibancada da margem oeste (GLB do Mint quando carrega; degraus de concreto quando não)
  if (!gprop('arquibancada', -19.4, 36, 2.4, Math.PI / 2))
    for (let i = 0; i < 3; i++) addBox(3.2 - i * 0.9, 0.5 + i * 0.5, 9, MAT.concreteDark, -20.6 + i * 1.05, 0, 36);
  // pilhas de pneu marcando o encostado do campo + um par de barracas na margem leste
  for (const [tx, tz] of [[-13, 32.5], [13, 41], [-8, 45], [18.6, 33]])
    if (!gprop('pilha_pneus', tx, tz, 1.1)) addBox(1.4, 1.1, 1.4, MAT_PNEU, tx, 0, tz);
  for (const [sx2, sz2] of [[19, 39.5], [-19.4, 43.5]])
    if (!gprop('stall', sx2, sz2, 2.3)) addBox(2.4, 2.3, 2.0, MAT_BARRACO[3], sx2, 0, sz2);
  /* POVOAMENTO DO CAMPO (MAP5). Medido na 1ª passada: os dois quadrantes do campinho tinham
     4 e 5 peças de cobertura em ~295 m² andáveis, o que dá espaçamento médio de 8,54 m — mais
     que as duas arestas de grafo (7,0 m) que a régua usa como teto. Um descampado de 44 × 18 m
     não é "estilo de mapa", é o mesmo defeito do "a loja fica vazia dos cantos": quem atravessa
     não tem em que se encostar. As peças abaixo são todas de campo de várzea de verdade —
     banco de reserva, pneu de canto, monte de terra, barraca de bebida na beira. */
  for (const [tx, tz] of [[-12.5, 31.5], [-12.5, 43], [12.5, 31.5], [12.5, 43], [-6.5, 25.6], [6.5, 25.6]])
    if (!gprop('tires', tx, tz, 0.75)) addBox(1.15, 0.75, 1.15, MAT_PNEU, tx, 0, tz);
  for (const bx2 of [-9.2, 9.2]) {   // banco de reserva coberto
    addBox(2.8, 0.5, 0.8, MAT.concreteDark, bx2, 0, 37.5);
    addBox(2.8, 0.62, 0.16, MAT.concreteDark, bx2, 0.5, 37.5 + (bx2 < 0 ? -0.32 : 0.32), { collide: false });
  }
  // os montes ficam no MIOLO do campo, longe da fileira de respawn: em (4,2 , 40,5) o monte
  // encostava no slot B de (4,5 , 41,5) e a folga de parede da MAP2B caía pra 0,15 m — o
  // corpo tem 0,38 m de raio, o jogador nascia dentro do monte.
  for (const [mx2, mz2] of [[-4.2, 34], [4.6, 33.2]])   // monte de terra/entulho no meio do campo
    addBox(1.8, 0.85, 1.8, lam({ map: T.dirt, color: 0x9a8b74 }), mx2, 0, mz2);
  for (const [sx3, sz3] of [[-11.4, 26.4], [11.4, 26.4]])
    if (!gprop('drinkstand', sx3, sz3, 2.2)) addBox(2.2, 2.2, 1.6, MAT_BARRACO[4], sx3, 0, sz3);
  for (const [px2, pz2] of [[-16.9, 31], [16.9, 43]]) {   // refletor de campo de várzea
    addBox(0.26, 7.2, 0.26, posteMat, px2, 0, pz2);
    addBox(1.2, 0.5, 0.22, lam({ color: 0xcfc9b4 }), px2 + (px2 < 0 ? 0.6 : -0.6), 6.8, pz2, { collide: false, cast: false });
  }

  /* ===================== COMÉRCIO =====================
     A lista é literal do dono: açaí, sorveteria, móveis/eletrônicos, ADEGA ("principalmente")
     e lanchonete. O que identifica comércio de quebrada não é a loja: é a PLACA PINTADA À MÃO
     e o TOLDO. Letreiramento vernacular brasileiro tem baseline irregular, letra que aperta no
     fim da linha e espacejamento desigual — fonte digital limpa e centralizada lê como praça
     de alimentação de shopping. Por isso cada letra é desenhada com jitter próprio. */
  function placaTex(txt, bg, fg) {
    const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let seed = 1337 + txt.length * 97; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.globalAlpha = 0.05 + rnd() * 0.1; x.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000'; x.fillRect(rnd() * W, rnd() * H, 30 + rnd() * 160, 3 + rnd() * 8); }
    x.globalAlpha = 1;
    const size = 74; x.font = `900 ${size}px "Arial Black",Impact,sans-serif`;
    const wch = [...txt].map((ch) => x.measureText(ch).width * 0.8);
    const total = wch.reduce((a, b) => a + b, 0), sx = Math.min(1, (W - 40) / total);
    let px = 20 + (W - 40 - total * sx) / 2;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (ch !== ' ') {
        x.save(); x.translate(px, H * 0.74 + (rnd() - 0.5) * size * 0.13); x.rotate((rnd() - 0.5) * 0.08);
        x.transform(sx * 0.8, 0, -0.13, 0.92 + rnd() * 0.18, 0, 0);
        x.lineWidth = size * 0.1; x.strokeStyle = '#120c08'; x.strokeText(ch, 0, 0);
        x.fillStyle = fg; x.fillText(ch, 0, 0); x.restore();
      }
      px += wch[i] * sx;
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /* FACHADA DE COMÉRCIO: banda de placa + toldo + porta/vitrine. Tudo `collide:false` — o
     barraco atrás já tem o colisor, e duplicar aqui só engordaria a lista quente. O toldo
     fica a 2,5 m: acima do 1,5 m que o `_collide` testa, então nem se fosse colisor
     estorvaria alguém. */
  const TOLDO = [0xb8322c, 0x1f7a4c, 0xd7a021, 0x2c5aa8, 0xa2481f];
  function comercio(side, z0, z1, txt, bgHex, bgCss, fgCss) {
    const fx = side * 12.5, d = z1 - z0, cz = (z0 + z1) / 2, out = side * 0.06;
    const placa = new THREE.MeshStandardMaterial({ map: placaTex(txt, bgCss, fgCss), roughness: 0.85 });
    /* A PLACA FICA — mesmo em modo GLB. O letreiro pintado à mão é o que diz que ali é uma
       ADEGA e não "uma loja qualquer", e nenhum modelo generativo escreve português legível.
       O que sai é o corpo da loja: toldo (uma laje chapada de 0,1 m), porta e vitrine viram
       o GLB `fachada_comercio`, que traz toldo de lona, porta de enrolar e geladeira.
       A PORTA DE AÇO CONTINUA SENDO CRIADA em qualquer modo: o decalque de pixo (`decal`)
       é ancorado nela, e escondê-la deixaria a pichação flutuando na calçada. */
    const glbFach = useGlb('fachada_comercio');
    const visC = (m) => { m.userData.glbFallback = true; if (!glbFach) return m; const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1); return hide(m); };  // ver barraco()
    addBox(0.12, 0.95, d * 0.94, placa, fx + out, 2.62, cz, { collide: false, cast: false });
    visC(addBox(1.5, 0.1, d * 0.9, lam({ color: bgHex, roughness: 0.8 }), fx - side * 0.75, 2.5, cz, { collide: false }));
    addBox(0.1, 2.1, d * 0.42, lam({ color: 0x2b2926, roughness: 0.6, metalness: 0.3 }), fx + out, 0, cz, { collide: false, cast: false });   // porta de aço
    visC(addBox(0.1, 1.3, d * 0.34, MAT_VIDRO, fx + out, 0.85, cz + d * 0.3, { collide: false, cast: false }));                               // vitrine
    if (glbFach) {
      /* Encaixe: o modelo tem a parede correndo em Z (profundidade 1,07 por unidade de altura
         contra largura 0,81), que é a orientação certa para uma loja em x = ∓12,5. A frente
         fica RENTE ao plano do quarteirão (`fx`) e o corpo entra pra dentro do lote — assim
         não sobra malha visível sobre a calçada, que seria geometria sem colisor embaixo. */
      const a = glbAspect('fachada_comercio');
      if (a) {
        const s = 2.55, n = Math.max(1, Math.round(d / (s * a.d)));
        for (let i = 0; i < n; i++)
          pbAdd(PB, 'fachada_comercio', { x: fx + side * (s * a.w) / 2, z: z0 + d * (i + 0.5) / n, targetH: s, ry: side > 0 ? 0 : Math.PI });
      }
    }
    /* PIXO NA PORTA DE AÇO — comércio de rua no Brasil tem a porta pichada assim que fecha, e
       é a superfície mais visível da calçada (2,1 m de altura na altura do olho). Vai com o
       pool CLARO porque a porta é 0x2b2926: tinta escura sobre chapa escura não existiria. */
    decal(D_PORTA, fx - side * 0.05, 0.22, cz - d * 0.05, -side * Math.PI / 2, 1.62, d * 0.36);
  }
  comercio(-1, -25, -19.5, 'ADEGA DO ZÉ', 0xb8322c, '#b8322c', '#f4ecd6');
  comercio(-1, -7.5, -3, 'AÇAÍ DA JU', 0x5b2a8a, '#5b2a8a', '#e8d94a');
  comercio(-1, 5.5, 10, 'SORVETERIA', 0x1f7a4c, '#1f7a4c', '#f6f2e2');
  comercio(-1, 10.8, 14.5, 'MÓVEIS E ELETRO', 0xd7a021, '#d7a021', '#241a10');
  comercio(1, -30, -25, 'ELETRÔNICOS ZL', 0x2c5aa8, '#2c5aa8', '#f2f0e6');
  comercio(1, -1.5, 2.5, 'LANCHONETE', 0xa2481f, '#a2481f', '#f4ecd6');
  comercio(1, 3.5, 8.5, 'BAR DO CANTO', 0x1f7a4c, '#1f7a4c', '#f6f2e2');

  /* ===================== BAR DE ESQUINA COM MESA NA CALÇADA =====================
     "um bar bem brasileiro com cadeiras de plástico na calçada". Mesa e cadeira de monobloco
     branco são cover BAIXO: 0,75 m de tampo e 0,85 m de encosto. Vale a pena serem colisores
     (o `_collide` bloqueia tudo com maxY > 0,30) porque cover baixo é o que falta numa
     calçada — quem se agacha atrás de uma mesa some, e o corredor deixa de ser corrida limpa.
     A FAIXA z ∈ [4,5 , 7,5] FICA VAZIA DE PROPÓSITO: é onde mora a bandeira do bar, e anel de
     captura com mesa dentro vira anel que ninguém pisa. */
  const MAT_PLAST = lam({ color: 0xe9e6dc, roughness: 0.55 });
  function mesaBar(mx, mz) {
    addBox(0.86, 0.72, 0.86, MAT_PLAST, mx, 0, mz, { cast: true });
    for (const [dx, dz] of [[0.78, 0], [-0.78, 0], [0, 0.78], [0, -0.78]]) {
      addBox(0.44, 0.44, 0.44, MAT_PLAST, mx + dx, 0, mz + dz);                        // assento
      occ(addBox(0.44, 0.46, 0.08, MAT_PLAST, mx + dx, 0.44, mz + dz + (dz > 0 ? 0.18 : -0.18), { collide: false, cast: false }));   // encosto: bala para, corpo degrau
    }
  }
  mesaBar(9.6, 2.2); mesaBar(9.6, 9.0); mesaBar(11.2, 10.6);
  // engradado de cerveja empilhado e churrasqueira na porta do bar (leitura + cover)
  const MAT_ENGRADADO = lam({ color: 0xc4302b, roughness: 0.8 });
  for (let i = 0; i < 4; i++) addBox(0.5, 0.3, 0.36, MAT_ENGRADADO, 12.0, i * 0.3, 4.0, { collide: i === 0 });
  if (!gprop('churrasqueira', 11.9, 7.6, 1.1)) addBox(1.2, 1.1, 0.8, MAT.concreteDark, 11.9, 0, 7.6);
  // guarda-sol de cerveja: só silhueta, sem colisor (fica a 2,1 m)
  for (const [ux, uz] of [[9.6, 2.2], [9.6, 9.0]]) {
    addBox(0.09, 2.1, 0.09, posteMat, ux, 0.72, uz, { collide: false, cast: false });
    addBox(2.9, 0.12, 2.9, lam({ color: 0xd8262a, roughness: 0.8 }), ux, 2.74, uz, { collide: false });
  }

  /* ===================== ÔNIBUS PARADO + PONTO =====================
     "teria um ônibus parado com ponto de ônibus".
     O ÔNIBUS É DE SÃO PAULO: BRANCO COM FAIXA VERMELHA (padrão SPTrans). NÃO é o Amarelinho
     amarelo do DF que mora no map_brasilia.js — este mapa é quebrada paulistana, e o GLB
     `bus` de lá é o carro do Distrito Federal. Aqui a carroceria é feita de FAIXAS
     horizontais de caixa (branco / vermelho / branco / vidro / branco): sai a leitura certa
     sem depender de GLB nenhum, e como não há textura de lateral não há o problema de a
     mesma arte aparecer esticada na traseira.
     COLISÃO — a decisão que evita o BUG-21 na origem: o ônibus fica PARALELO À GUIA, ou seja,
     ALINHADO AOS EIXOS. Prop girado exige `colRot` (grade no espaço local) porque o motor não
     tem collider rotacionado — no ônibus da Brasília, a 0,55 rad, a caixa única deixou 2,33 m
     de parede invisível. Alinhado, UMA AABB é exata: erro zero, um colisor só. Ônibus
     estacionado de banda pra guia não existe no mundo real e custaria 18 colisores aqui.
     Por isso as faixas vão com `collide:false` + occluder à mão, e a colisão é um `col` só. */
  {
    /* MEDIDAS DO ÔNIBUS SAEM DO MODELO, E SÃO CONSTANTES.
       O GLB `onibus_sptrans` (Tripo) tem proporção 2,825 : 1 : 0,737 (comprimento : altura :
       largura). A 3,1 m de altura ele dá 8,76 × 2,28 m em planta — mais curto que os 12,4 m
       da 1ª versão. As duas saídas eram esticar o modelo em 42% (roda vira elipse: defeito
       visível) ou encolher o volume. Encolher ganhou.
       O QUE NÃO SE PODE FAZER É DERIVAR ISTO DO GLB EM TEMPO DE EXECUÇÃO: em node nenhum GLB
       carrega, e um colisor que muda de tamanho conforme o asset carregou faria as réguas
       medirem um mapa que o jogador não joga. Por isso BL/BW são número fixo, iguais nos dois
       modos, e o GLB é que é encaixado neles. */
    const BX = -5.6, BZ = -6, BW = 2.28, BL = 8.76, BH = 3.1;
    const glbBus = useGlb('onibus_sptrans');
    const visB = (m) => { m.userData.glbFallback = true; if (!glbBus) return m; const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1); return hide(m); };  // ver barraco()
    if (glbBus) {
      // ry = +π/2: o comprimento do modelo está no X local e a rua corre em Z.
      gpropC('onibus_sptrans', BX, BZ, BH, Math.PI / 2);
    }
    const branco = lam({ color: 0xf2f0ec, roughness: 0.45, metalness: 0.15 });
    const vermelho = lam({ color: 0xc4161c, roughness: 0.42, metalness: 0.15 });
    const vidro = lam({ color: 0x20303c, roughness: 0.18, metalness: 0.5 });
    const preto = lam({ color: 0x1a1c1f, roughness: 0.8 });
    //           w    h     d       mat        y-base
    const faixas = [
      [BW, 0.55, BL - 0.5, preto, 0.30],       // saia inferior / chassi
      [BW, 0.62, BL, branco, 0.85],
      [BW, 0.34, BL, vermelho, 1.47],          // A faixa vermelha do SPTrans
      [BW, 0.22, BL, branco, 1.81],
      [BW, 0.78, BL - 0.3, vidro, 2.03],       // janelas
      [BW, 0.28, BL - 0.2, branco, 2.81],      // friso do teto
    ];
    for (const [w, h, d, m, y] of faixas) occ(visB(addBox(w, h, d, m, BX, y, BZ, { collide: false })));
    occ(visB(addBox(BW - 0.1, 0.16, BW - 0.1, branco, BX, 3.09, BZ - BL / 2 + 1.4, { collide: false, cast: false })));
    if (!glbBus) for (const wz of [BL / 2 - 1.6, -BL / 2 + 1.8, -BL / 2 + 3.0]) for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 14), MAT_PNEU);
      r.rotation.set(Math.PI / 2, 0, Math.PI / 2); r.position.set(BX + sx * (BW / 2 - 0.12), 0.46, BZ + wz);
      r.castShadow = true; root.add(r);
    }
    col(BX - BW / 2, BX + BW / 2, 0, BH, BZ - BL / 2, BZ + BL / 2);   // AABB EXATA (alinhado)
  }
  /* PONTO DE ÔNIBUS — abrigo de calçada. O teto fica a 2,4 m (acima do 1,5 m que o `_collide`
     testa: não estorva ninguém) e o banco a 0,45 m entra como cover baixo. A bandeira do
     ponto mora em (-10,-6), 1,0 m livre do banco: o anel de captura tem que ser PISÁVEL. */
  {
    const teto = lam({ color: 0x2f6f8a, roughness: 0.6, metalness: 0.25 });
    addBox(0.16, 2.05, 8.0, MAT_VIDRO, -11.85, 0, -6, { collide: false });          // costas de vidro
    for (const pz of [-9.7, -2.3]) for (const px of [-11.85, -8.7]) addBox(0.14, 2.4, 0.14, posteMat, px, 0, pz);
    addBox(3.5, 0.14, 8.4, teto, -10.3, 2.4, -6, { collide: false });
    addBox(0.55, 0.12, 6.2, lam({ color: 0x6b5a44, roughness: 0.9 }), -11.35, 0.45, -6);   // banco de madeira
    addBox(0.5, 2.6, 0.5, lam({ map: placaTex('8022', '#1c4f8a', '#f4ecd6'), roughness: 0.8 }), -8.2, 0, -1.4);   // totem da linha
  }

  /* ===================== BARRICADAS =====================
     "barricadas na rua". Elas não são enfeite nem só tema: uma rua reta de 44 m com 14 m de
     largura é uma linha de tiro contínua, e o que quebra linha de tiro sem fechar passagem é
     obstáculo ALTERNADO — barricada encostada num lado, a próxima no outro, formando chicane.
     Assim o corredor continua andável de ponta a ponta (a CTF2 precisa dele) mas ninguém
     enxerga da praça até o campinho de uma vez só.
     As peças ficam ALINHADAS AOS EIXOS pela mesma razão do ônibus: AABB alinhada é exata e a
     girada precisaria de `colRot` (o motor não tem collider rotacionado — BUG-21). Quando o
     ângulo importa pra leitura, é a MALHA que gira e o `colRot` acompanha. */
  const MAT_MADEIRA = lam({ color: 0x8a6a44, roughness: 0.95 });
  const MAT_TAMBOR = lam({ color: 0xb4542a, roughness: 0.85, metalness: 0.3 });
  function barricada(cx, cz, larg, ry) {
    if (ry) {
      occ(addBox(larg, 1.05, 0.7, MAT_MADEIRA, cx, 0, cz, { ry, collide: false }));
      colRot(cx, cz, larg, 0.7, 0, 1.05, ry, 4, 2);
    } else addBox(larg, 1.05, 0.7, MAT_MADEIRA, cx, 0, cz);
    for (let i = 0; i < 3; i++) {
      const tx = cx - larg / 2 + 0.5 + i * (larg - 1) / 2;
      if (!gprop('tires', tx, cz + 1.0, 0.72)) addBox(1.1, 0.72, 1.1, MAT_PNEU, tx, 0, cz + 1.0);
    }
    addBox(0.62, 0.92, 0.62, MAT_TAMBOR, cx + larg / 2 + 0.6, 0, cz);
  }
  barricada(-4.2, -14.0, 5.0, 0.22);     // encosta no lado oeste
  barricada(4.6, -2.5, 4.6, -0.18);      // devolve pro leste
  barricada(-3.6, 9.0, 4.4, 0.15);
  barricada(4.0, 18.5, 5.2, -0.24);
  /* CACAMBA, ENTULHO E VARAL nas vielas e becos. As vielas são corredores de 4 m: sem nada
     dentro elas viram tubos, e o quadrante inteiro aparece DESERTO na MAP5 (o teto é
     espaçamento médio ≤ 7,0 m entre peças de cobertura, = duas arestas do grafo de 3,4 m). */
  /* ONDE O ENTULHO **NÃO** PODE FICAR — medido, não estimado. A 1ª versão pôs caçamba de
     1,9 m no CENTRO da viela de 4 m e entulho no CENTRO do beco de 3 m. Resultado no grafo:
     a fileira de nós (x = ∓23 na viela, z do beco no meio) caía DENTRO da peça, os nós eram
     rejeitados, e o `segClear` entre os nós dos dois lados atravessava a peça — a viela
     virava três componentes conexas separadas. Medição: 8 componentes, a viela oeste partida
     em comp 1 / 3 / 0, e a CTF2 despencou pra 1 rota em 5 dos 8 pares spawn↔bandeira.
     Corredor estreito só aceita obstáculo ENCOSTADO NA PAREDE, e o vão que sobra tem que ser
     maior que a inflação da fileira (0,35 m) — aqui sobra 0,55 m no pior caso, e 2,7 m de
     passagem livre pro corpo de 0,38 m de raio. */
  const MAT_CACAMBA = lam({ color: 0x5e6a52, roughness: 0.85, metalness: 0.25 });
  for (const [cx, cz] of [[-24.15, -30], [-24.15, -6], [-24.15, 12], [24.15, -26], [24.15, 2], [24.15, 20]])
    if (!gprop('dumpster', cx, cz, 1.35)) addBox(1.2, 1.35, 2.6, MAT_CACAMBA, cx, 0, cz);
  for (const [cx, cz] of [[-24.3, -18], [-21.7, 3], [-24.3, 22], [24.3, -12], [21.7, 10], [24.3, -34]])
    addBox(1.0, 1.0, 1.0, MAT_BARRACO[5], cx, 0, cz);   // pilha de tijolo/sacaria, colada no muro
  // entulho na BOCA de cada beco (na calçada, não dentro dele): dá cover a quem sai do beco
  // sem estrangular a passagem que a CTF2 depende.
  for (const [bx, bz] of [[-11.6, -8.0], [-11.6, 5.0], [-11.6, 13.6], [11.6, -6.4], [11.6, 13.2], [11.6, 23.2]])
    addBox(1.15, 1.15, 1.15, MAT_BARRACO[1], bx, 0, bz);
  /* varais entre os barracos — só silhueta, a 2,6 m e sem colisor.
     O ARAME (`MAT_ARAME`) NÃO É ENFEITE. Sem ele o varal é um punhado de retângulos bege de
     3 cm pendurados no nada, e no fundo da viela, recortados contra o céu, é exatamente isso
     que se vê: está na captura que o dono mandou (issues/5, 09.10.36 — cinco quadrados
     boiando no ar) e foi uma das coisas que ele chamou de "lugar que não é parede". Custa uma
     caixa fina por varal e resolve a leitura inteira. */
  const MAT_ROUPA = new THREE.MeshStandardMaterial({ color: 0xd7cfc0, roughness: 0.95, side: THREE.DoubleSide });
  const MAT_ARAME = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, fog: true });
  for (const [vx, vz] of [[-23, -22], [-23, 8], [23, -18], [23, 14], [-16.6, 6], [16.6, 15]]) {
    addBox(3.2, 0.025, 0.025, MAT_ARAME, vx - 0.15, 2.64, vz, { collide: false, cast: false });
    for (let i = 0; i < 4; i++) addBox(0.5, 0.62, 0.03, MAT_ROUPA, vx - 0.9 + i * 0.6, 2.0, vz, { collide: false, cast: false });
  }
  // camelô e caçamba na praça (o largo é grande: sem peça no meio ele vira arena de sniper)
  /* AS DUAS BARRACAS DO FUNDO DA PRAÇA SAÍRAM (pedido do dono, 04/08: "no mapa da quebrada
     não precisa ter barracas no respawn primeiro (o do time inverso do campinho)"). Eram as
     de (-9,8, -39) e (9,4, -38,5): as duas caíam DENTRO da faixa de respawn do P (a vila do
     baile é z ∈ [-46,5; -38] e os 4 pontos de nascimento estão em z = -42,5), ou seja, o
     jogador nascia e a primeira coisa na frente dele era uma barraca. As duas de z ≈ -25
     ficam, porque estão no MEIO da praça e não no respawn — o pedido foi "não precisa ter",
     não "tire as barracas do mapa". Efeito medido em map-check está no relatório da rodada. */
  for (const [sx2, sz2, ry2] of [[-9.4, -24.5, 0.3], [9.6, -25.5, -0.4]])
    if (!gprop('tent', sx2, sz2, 2.4, ry2)) { occ(addBox(3.0, 2.4, 2.4, MAT_BARRACO[2], sx2, 0, sz2, { ry: ry2, collide: false })); colRot(sx2, sz2, 3.0, 2.4, 0, 2.4, ry2, 3, 2); }
  if (!gprop('kombi', -7.5, -21.5, 2.0, 0.1)) addBox(2.0, 2.0, 4.6, MAT_BARRACO[6], -7.5, 0, -21.5);

  /* ===================== MERCADORIA (o dono: "as barracas não tem nada") =====================
     Barraca de camelô com o tabuleiro vazio é uma mesa com toldo — o olho lê "cenário
     inacabado", não "comércio". O que enche barraca de rua no Brasil é engradado, caixa de
     feira, fruta e BOTIJÃO (o GLB `botijao_gas` veio de references/favela).
     Tudo aqui é BAIXO (≤ 0,9 m) e fica ENCOSTADO na peça que já existe: mercadoria no meio da
     calçada viraria obstáculo novo no corredor, e este mapa já pagou o preço de pôr volume no
     lugar errado (ver a nota do entulho das vielas, que partiu o grafo em 8 componentes).
     O empilhamento é determinístico — índice do laço, nunca Math.random(): `botsim` roda 9
     sementes fixas e mapa que muda a cada carregamento é defeito, não variedade. */
  const MAT_CAIXOTE = lam({ color: 0xb08b52, roughness: 0.92 });
  const MAT_FRUTA = [lam({ color: 0xd9762b, roughness: 0.6 }), lam({ color: 0x7fa93c, roughness: 0.6 }), lam({ color: 0xc23b2e, roughness: 0.6 })];
  const GEO_FRUTA = new THREE.SphereGeometry(0.09, 7, 5);
  /* Tabuleiro de barraca: duas fileiras de caixotes e a fruta POR CIMA deles. `collide` só na
     fileira de baixo — a de cima está acima de 0,30 m mas empilhar colisor aqui só engordaria
     a lista quente que o `_collide` varre a cada passo de cada bot. */
  function mercadoria(mx, mz, ry, n = 3) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) / 2) * 0.62;
      const wx = mx + lx * cs, wz = mz - lx * sn;
      const alt = 1 + (i % 2);                                    // 1 ou 2 caixotes de altura
      /* TODO caixote empilhado é COLISOR, inclusive o de cima. Não é preciosismo: a MAP1
         mede chão andável com geometria acima de 0,30 m e SEM colisor embaixo — o "submerso
         embaixo da estátua". Caixote que só o de baixo colide deixa o de cima pairando sobre
         chão livre, e foi assim que esta rodada tirou a MAP1 de 0 para 4 antes de consertar. */
      for (let j = 0; j < alt; j++) addBox(0.58, 0.36, 0.44, MAT_CAIXOTE, wx, j * 0.36, wz, { ry });
      for (let f = 0; f < 3; f++) {
        const m = new THREE.Mesh(GEO_FRUTA, MAT_FRUTA[(i + f) % 3]);
        m.position.set(wx + (f - 1) * 0.16 * cs, alt * 0.36 + 0.09, wz - (f - 1) * 0.16 * sn);
        m.castShadow = true; root.add(m);
      }
    }
  }
  // as 2 barracas da praça e as 2 do campinho ganham tabuleiro cheio + botijão do lado
  // (as 2 que ficavam no respawn do P saíram junto com as barracas — ver o bloco do camelô)
  for (const [sx2, sz2, ry2, k] of [[-9.4, -24.5, 0.3, 0], [9.6, -25.5, -0.4, 1]]) {
    mercadoria(sx2 + Math.sin(ry2) * 1.15, sz2 + Math.cos(ry2) * 1.15, ry2, 3 + (k % 2));
    if (!gpropC('botijao_gas', sx2 - Math.sin(ry2) * 1.2, sz2 - Math.cos(ry2) * 1.2, 0.62, ry2 + k))
      addBox(0.36, 0.62, 0.36, MAT_TAMBOR, sx2 - Math.sin(ry2) * 1.2, 0, sz2 - Math.cos(ry2) * 1.2);
  }
  for (const [sx2, sz2] of [[19, 39.5], [-19.4, 43.5]]) mercadoria(sx2, sz2 + 1.2, 0, 3);
  // ADEGA e LANCHONETE: engradado empilhado e botijão na porta é o que identifica os dois
  for (const [ax, az, ary] of [[-11.7, -22.0, Math.PI / 2], [11.7, 0.4, -Math.PI / 2]]) {
    /* TODOS colidem, não só o de baixo. O engradado tem 0,30 m e o `_collide` só bloqueia
       colisor com maxY > 0,30 — o de baixo é DEGRAU, não parede. Com só ele colidindo, o chão
       continua andável e os quatro de cima ficam pairando: MAP1 acusou exatamente isto em
       (11,5 · 0,5), 1,2 m de penetração. (A pilha antiga do bar, em 12,0 · 4,0, tem o mesmo
       `collide: i === 0` e só escapa porque nenhuma amostra de 1 m cai em cima dela.) */
    for (let i = 0; i < 5; i++) addBox(0.5, 0.3, 0.36, MAT_ENGRADADO, ax, i * 0.3, az);
    if (!gpropC('botijao_gas', ax, az + 1.0, 0.62, ary)) addBox(0.36, 0.62, 0.36, MAT_TAMBOR, ax, 0, az + 1.0);
  }
  // SORVETERIA / AÇAÍ: freezer de porta de vidro na calçada (cover baixo de 1,0 m)
  for (const [fx2, fz2] of [[-11.6, -5.2], [-11.6, 7.4]]) {
    addBox(0.7, 1.0, 1.5, lam({ color: 0xe8e6e0, roughness: 0.5, metalness: 0.15 }), fx2, 0, fz2);
    occ(addBox(0.72, 0.34, 1.3, MAT_VIDRO, fx2, 0.62, fz2, { collide: false, cast: false }));
  }
  // MÓVEIS E ELETRO: mercadoria na calçada é o cartão de visita da loja
  if (!gprop('arara_roupas', -11.5, 12.2, 1.7)) addBox(1.1, 1.7, 1.6, MAT_CAIXOTE, -11.5, 0, 12.2);
  addBox(0.9, 1.9, 0.6, lam({ color: 0x8a6a44, roughness: 0.9 }), -11.7, 0, 13.6);   // guarda-roupa em pé

  /* ===================== OS BECOS, UM POR UM =====================
     O dono: "os becos não podem ser iguais, tem que ser diferentes". Ele está certo e o
     motivo é de JOGO, não de decoração: num mapa cujo eixo é uma rua reta, o beco é o que dá
     ORIENTAÇÃO — se os seis são a mesma receita, o jogador que sai de um não sabe em qual
     está, e a segunda rota (que é o ponto do desenho deste mapa) não é usada porque não é
     memorável. Cada beco recebe uma RECEITA diferente, escolhida pelo índice.
     ONDE A PEÇA PODE FICAR: encostada na parede, nunca no eixo. A fileira de waypoints do
     beco corre em z = bz com inflação de 0,35 m; tudo aqui começa em |dz| ≥ 0,95 m do eixo,
     ou seja ≥ 0,6 m de folga além da inflação, e deixa ≥ 1,9 m de passagem livre para um
     corpo de 0,38 m de raio. Foi exatamente isso que a 1ª versão do mapa errou ao pôr caçamba
     de 1,9 m no CENTRO da viela: 8 componentes conexas e a CTF2 caiu para 1 rota. */
  const MAT_LONA = new THREE.MeshStandardMaterial({ color: 0x3f6f8f, roughness: 0.9, side: THREE.DoubleSide });
  function beco(x0, x1, bz, k) {
    const xm = (x0 + x1) / 2, L = x1 - x0;
    if (k === 0) {
      // ESCADA EXTERNA de laje — o degrau é o cartão-postal do beco de favela
      // cada degrau colide: degrau em balanço sobre chão livre é MAP1 (ver `mercadoria`)
      for (let i = 0; i < 6; i++) addBox(1.0, 0.19, 0.26, MAT.concreteDark, x0 + 1.2, i * 0.19, bz + 1.28 - i * 0.26);
      if (!gpropC('botijao_gas', x1 - 1.4, bz + 1.15, 0.62)) addBox(0.36, 0.62, 0.36, MAT_TAMBOR, x1 - 1.4, 0, bz + 1.15);
    } else if (k === 1) {
      // ENGRADADO EMPILHADO ATÉ O ALTO contra a parede sul + varal baixo cruzando
      for (let i = 0; i < 6; i++) addBox(0.5, 0.3, 0.36, MAT_ENGRADADO, xm - 1.6 + (i % 2) * 0.52, ((i / 2) | 0) * 0.3, bz - 1.25);
      addBox(3.1, 0.025, 0.025, MAT_ARAME, x0 + 1.6 + 2 * 0.56, 2.72, bz, { collide: false, cast: false });   // o arame (ver varais)
      for (let i = 0; i < 5; i++) addBox(0.46, 0.58, 0.03, MAT_ROUPA, x0 + 1.6 + i * 0.56, 2.1, bz, { collide: false, cast: false });
    } else if (k === 2) {
      // OBRA PARADA: pilha de tijolo, betoneira improvisada e caixa d'água no chão
      for (let i = 0; i < 3; i++) addBox(0.9, 0.42, 0.62, MAT_BARRACO[5], x0 + 1.0 + i * 0.5, i * 0.42, bz + 1.2);
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 0.9, 12), MAT_CXDAGUA);
      cd.position.set(x1 - 1.5, 0.45, bz - 1.15); cd.castShadow = true; root.add(cd);
      occ(cd);
      col(x1 - 2.0, x1 - 1.0, 0, 0.9, bz - 1.65, bz - 0.65);
    } else if (k === 3) {
      // LONA AZUL esticada por cima (só silhueta, a 2,7 m) + tambor de lixo queimado
      addBox(L * 0.8, 0.04, 2.6, MAT_LONA, xm, 2.7, bz, { collide: false, cast: false });
      addBox(0.62, 0.92, 0.62, MAT_TAMBOR, x0 + 1.1, 0, bz - 1.2);
      addBox(0.62, 0.92, 0.62, MAT_TAMBOR, x1 - 1.2, 0, bz + 1.2);
    } else if (k === 4) {
      // PASSARELA/LAJE ligando os dois lados por cima — a 2,9 m não estorva ninguém e é a
      // silhueta mais reconhecível que um beco pode ter visto da rua
      addBox(L, 0.22, 1.5, MAT_LAJE, xm, 2.9, bz, { collide: false });
      for (const sd of [-1, 1]) addBox(0.18, 2.9, 0.18, MAT.concreteDark, xm + sd * (L / 2 - 0.4), 0, bz + sd * 1.35);
    } else {
      // MOTO E FERRAMENTA: oficina de fundo de quintal encostada na parede norte
      if (!gprop('moto_cg', x0 + 1.6, bz + 1.15, 1.05, 1.4)) addBox(0.6, 1.05, 1.7, MAT_PNEU, x0 + 1.6, 0, bz + 1.15);
      if (!gprop('tires', x1 - 1.3, bz - 1.2, 0.72)) addBox(1.0, 0.72, 1.0, MAT_PNEU, x1 - 1.3, 0, bz - 1.2);
      addBox(0.8, 0.75, 0.5, MAT_CAIXOTE, xm + 0.9, 0, bz - 1.2);
    }
  }
  // oeste: becos em z = -10,5 · 2,5 · 16,5 | leste: z = -3,5 · 10,5 · 20,5 (os mesmos eixos
  // das fileiras de waypoint declaradas lá embaixo — a receita muda, o corredor não)
  beco(-20.6, -12.8, -10.5, 0); beco(-20.6, -12.8, 2.5, 2); beco(-20.6, -12.8, 16.5, 4);
  beco(12.8, 20.6, -3.5, 1); beco(12.8, 20.6, 10.5, 3); beco(12.8, 20.6, 20.5, 5);

  /* MURAIS DEDICADOS nos becos (pedido do dono, 06/08): as duas peças grandes fictícias de
     `textures.js` ("ETERNAMENTE EM NOSSOS CORAÇÕES" e "DA LESTE VIVE"), uma por lado do mapa.

     POR QUE FAIXA ATRAVESSANDO O BECO E NÃO PAREDE: as duas tentativas de colar na parede
     falharam no navegador, com medida (levantamento por raycast no mapview, 06/08):
       · a parede do beco é desenhada pelo GLB do barraco, não pela caixa procedural — a
         primeira versão (z grampeado na face declarada) nasceu ENGOLIDA pelo GLB;
       · e a face do GLB NÃO É PLANA: na norte do beco oeste 0 ela oscila de z=-11,64 a
         -12,31 no mesmo trecho; na do leste 5 há um recuo de 4 m (z=21,34 → 25,51). Plano
         de 4,2 m ali ou flutua 70 cm ou some na parede.
     A faixa esticada de ponta a ponta do corredor é o formato que a periferia usa de
     verdade pra memorial ("ETERNAMENTE...") e pra orgulho de quebrada ("DA LESTE VIVE") —
     e não precisa de parede nenhuma. Precedente no próprio mapa: o varal do beco k=1 e a
     lona do k=3 já atravessam o corredor assim. Altura: corda a 3,3 m (laje do k=4 está a
     2,9 e "não estorva ninguém"), borda de baixo a 1,7 m — faixa de beco desce até a
     cara mesmo, e sem colisor ela não empurra ninguém (é pano, não parede — BUG-21).
     Leitura: de frente pra boca do beco, que é de onde o jogador vê — uma por lado do mapa. */
  {
    const FH = 1.58, FW = FH * 1.8333, FY = 3.3 - FH / 2;   // 1408×768 medido; corda a 3,3 m
    /* O X E O Z DE CADA FAIXA SAÍRAM DE UM SCAN POR RAYCAST no mapview (06/08), não da
       planta: o corredor declarado (bz±1,5) não é onde o GLB põe a parede. Medida
       (distância à parede norte/sul a 1,45 m de altura, a cada 0,6 m):
         · oeste 0 (escada): paredes a ~1,3/1,3 m no corredor inteiro — faixa no eixo;
         · leste 3 (lona): só x ≥ 17 tem corredor fechado (~1,5/1,2 m); x < 16,6 tem uma
           parede a 0,4 m do EIXO. A faixa fica em x=20,1 — x ≥ 17,2 é o trecho bom, e
           18,7 ficava FURADO pela lona da receita (ela cobre x 13,6–19,8 a 2,7 m de altura,
           exatamente onde a corda de 3,3 m passaria). O z=10,65 é o centro MEDIDO do
           corredor naquele x (paredes em z≈9,3 e ≈12,0), não o bz declarado (10,5).
         · leste 1 e 5 têm um lado ABERTO (recuo de 5-7 m) — faixa ali fica com uma ponta
           no ar, pendurada em nada. */
    for (const [texM, nome, fx, fz] of [
      [T.muralEternamente, 'eternamente', -16.7, -10.5],   // beco oeste 0 (o da escada)
      [T.muralLesteVive,  'leste-vive',    20.1,  10.65],  // beco leste 3 (o da lona)
    ]) {
      if (!texM) continue;
      addBox(0.025, 0.025, FW + 0.2, MAT_ARAME, fx, 3.3, fz, { collide: false, cast: false });   // a corda
      /* DUAS FACES, cada uma lendo certo (reprovação do dono, 06/08: de um lado o texto
         saía ESPELHADO — "ƎTƎRNAMƎNTƎ" — e faixa de memorial ao contrário lê quebrado,
         não lê pano). Um plano DoubleSide mostra o verso espelhado por construção; a
         solução é a do lambe-lambe real: dois planos FrontSide colados, um por lado.
         Mesma posição — o culling garante que só uma face aparece de cada lado. */
      for (const ry of [Math.PI / 2, -Math.PI / 2]) {
        const mm = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), lam({ map: texM }));
        mm.position.set(fx, FY, fz); mm.rotation.y = ry; mm.renderOrder = 2;
        mm.name = 'faixa:' + nome;   // pano pendurado em arame: não é mural de parede (audit/census leem decal:/mural:)
        mm.receiveShadow = true;
        root.add(mm);
      }
    }

    /* GALERIA DE HOMENAGENS PÓSTUMAS (dono, 07/08): Chorão, Champignon, Tim Maia,
       Rita Lee, Raul Seixas, Sabotage, Marcelo Yuka e Chico Science, pintados em
       murais de tijolo (or-mural-*.jpg, gerados via OpenRouter — obra própria,
       VERSIONADOS, os únicos que existem em prod). Os dois muros compridos do mapa
       viram a galeria: 3 na face da travessa do campinho, 3 na face do campo
       (respawn olha direto pra elas) e 2 no muro do baile. Plano 2 cm à frente da
       face do muro (sem z-fight), sem colisor — muro continua sendo o colisor. */
    if (T.muraisHom && T.muraisHom.length >= 8) {
      /* ESPALHADOS (correção do dono, 07/08: "colocou tudo no mesmo lugar — a ideia
         era espalhado"): um por REGIÃO do mapa, pra topar com eles JOGANDO, não
         numa galeria só. Cada vaga passa pelo mesmo `medirParede` dos decalques:
         empena sem parede real naquele ponto → mural não cola (nada de arte no ar). */
      const GW = 3.9, GH = 2.0, GY = 1.12;
      const vagas = [
        [0, -12.43, GY, -30, Math.PI / 2],   // Chorão — fachada oeste da avenida, ponta do baile
        [1, -21.07, GY, -18, -Math.PI / 2],  // Champignon — viela oeste
        [2, 12.43, GY, -8, -Math.PI / 2],    // Tim Maia — fachada leste da avenida, meio
        [3, 24.93, GY, 8, -Math.PI / 2],     // Rita Lee — muro externo leste
        [4, 0, GY, 27.72, Math.PI],          // Raul — travessa do campinho (a vaga aprovada no print)
        [5, -24.93, GY, -2, Math.PI / 2],    // Sabotage — muro externo oeste
        [6, -14, GY, -39.72, 0],             // Yuka — muro do baile
        [7, 21.07, GY, 18, Math.PI / 2],     // Chico Science — viela leste
      ];
      for (const [i, gx, gy, gz, ry] of vagas) {
        const rec = medirParede([root], gx, gy, gz, ry, GW, GH);   // gy JÁ é o centro do plano
        if (rec === null) continue;
        const g = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), lam({ map: T.muraisHom[i] }));
        g.position.set(gx - Math.sin(ry) * rec, gy, gz - Math.cos(ry) * rec);
        g.rotation.y = ry; g.renderOrder = 2;
        g.name = 'mural:homenagem-' + i;
        g.receiveShadow = true;
        root.add(g);
      }
    }
  }

  /* CAMINHÃO BAÚ DE ENTREGA na porta da adega (`vw_9150`, references/favela — é caminhão, não
     ônibus, conferido na imagem). Ele não é enfeite: o ônibus encolheu de 12,4 m para 8,76 m
     ao virar GLB (ver "MEDIDAS DO ÔNIBUS"), e essa diferença abriu 8,4 m de linha de tiro na
     bandeira do PONTO (map-check CTF1: linha 51,5 m → 59,9 m). O caminhão devolve o volume,
     na mesma faixa da rua, e ainda conta a história da carga da adega.
     ALINHADO AOS EIXOS de propósito: o comprimento do modelo já está em Z, que é a direção da
     rua, então UMA AABB é exata e não há `colRot` nem parede invisível (BUG-21). */
  {
    const TX = -5.6, TZ = 3.2, TH = 3.0, TW = 1.96, TL = 6.19;   // 3,0 m de altura × aspecto medido
    const glbT = gpropC('vw_9150', TX, TZ, TH);
    // a caixa existe como fallback visível (node) e some quando o GLB carrega; a bala
    // testa quem está na tela — o baú GLB entrou em `occluders` pelo gpropC (BUG-54)
    const bau = addBox(TW, TH, TL, lam({ color: 0xdcdad4, roughness: 0.55, metalness: 0.2 }), TX, 0, TZ, { collide: false });
    bau.userData.glbFallback = true;  // ver barraco(): proxy que some quando o GLB carrega
    if (glbT) hide(bau);
    occ(bau);
    col(TX - TW / 2, TX + TW / 2, 0, TH, TZ - TL / 2, TZ + TL / 2);
  }

  /* ===================== GAMBIARRA, LUZ DE BAILE E MATO =====================
     Três acabamentos baratos que fazem mais pela leitura do lugar do que qualquer polígono a
     mais nas casas. Todos SEM colisor e SEM luz nova: fiação e varal ficam a 4,8 m (o
     `_collide` só olha até 1,5 m), as lâmpadas são quads emissivos e não PointLight — luz
     dinâmica extra é o jeito mais caro de decorar e a máquina fraca é requisito do projeto. */
  const MAT_FIO = new THREE.MeshBasicMaterial({ color: 0x141414, fog: true });
  const fio = (x0, z0, x1, z1, y) => {   // catenária pobre: 3 segmentos com barriga no meio
    const pts = [[x0, y, z0], [(x0 + x1) / 2, y - 0.55, (z0 + z1) / 2], [x1, y, z1]];
    for (let i = 0; i < 2; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 4), MAT_FIO);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize());
      m.frustumCulled = true; root.add(m);
    }
  };
  for (let i = 0; i < POSTES.length - 2; i += 2) fio(POSTES[i][0], POSTES[i][1], POSTES[i + 2][0], POSTES[i + 2][1], 5.6);
  for (const [px, pz] of POSTES) { fio(px, pz, px < 0 ? -12.4 : 12.4, pz + 3, 5.2); fio(px, pz, px < 0 ? -12.4 : 12.4, pz - 4, 5.0); }
  // varal de lâmpada colorida cruzando a rotunda — o "baile" que dá nome à praça
  const CORES_LAMP = [0xff4d3d, 0x4dff8a, 0x4d9dff, 0xffd24d, 0xd94dff];
  for (const [ax, az, bx, bz] of [[-11, -38, 11, -25], [-11, -25, 11, -38], [-11, -31.5, 11, -31.5]]) {
    fio(ax, az, bx, bz, 5.0);
    for (let i = 1; i < 10; i++) {
      const t = i / 10, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
      const c = CORES_LAMP[i % CORES_LAMP.length];
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: c, fog: true }));
      b.position.set(lx, 5.0 - 0.55 * Math.sin(Math.PI * t) - 0.18, lz); root.add(b);
    }
  }
  // MATO nas frestas: capim no pé dos muros das vielas e nas quinas do campinho. Cruzeta de
  // dois quads com alpha; sem colisor, sem sombra — é o detalhe que tira o ar de maquete.
  if (QP.get('mato') !== '0' && !LOWQ) {
    const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S; const cx2 = cv.getContext('2d');
    let sd = 401; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 22; i++) {
      cx2.strokeStyle = rn() > 0.85 ? 'rgba(178,166,86,0.95)' : `rgba(${62 + rn() * 40 | 0},${112 + rn() * 52 | 0},${52 + rn() * 30 | 0},0.95)`;
      cx2.lineWidth = 1.4 + rn() * 1.8; cx2.lineCap = 'round';
      const px = 4 + rn() * (S - 8), h = S * (0.45 + rn() * 0.45);
      cx2.beginPath(); cx2.moveTo(px, S); cx2.quadraticCurveTo(px + (rn() - 0.5) * 10, S - h * 0.5, px + (rn() - 0.5) * 20, S - h); cx2.stroke();
    }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const matoMat = new THREE.MeshStandardMaterial({ map: tx, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const geo = new THREE.PlaneGeometry(0.9, 0.65);
    let ms = 9161; const rr = () => (ms = (ms * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < 190; i++) {
      const lado = rr();
      const x = lado < 0.5 ? (rr() < 0.5 ? -21.4 : -24.6) : (rr() < 0.5 ? 21.4 : 24.6);
      const z = -38 + rr() * 66, y = 0.32;
      for (const rot of [0, Math.PI / 2]) { const m = new THREE.Mesh(geo, matoMat); m.position.set(x + (rr() - 0.5) * 0.5, y, z); m.rotation.y = rot + rr(); m.userData.nonSolidSurface = true; root.add(m); }
    }
  }

  /* ===================== ONDE OS DECALQUES VÃO =====================
     ATUALIZAÇÃO DE 06/08 — O DONO MUDOU A REGRA. A versão de 05/08 era contida de
     propósito (mural espaçado, "marco de orientação é o que NÃO se repete", §2.1/C23).
     Ele olhou o resultado e pediu o OPOSTO, em palavras: "tem que meter muito mais
     grafites e posters nos mapas, especialmente o quebrada — todas as casas tem que
     estar cheias de grafites e os muros de proteção então mete ainda mais grafites".
     Ele decide — como no Piscinão, onde a contenção anterior também virou encher.
     O que SOBREVIVE da regra velha, e é inegociável: NENHUM decalque entra no anel de
     captura das 4 bandeiras nem na boca de beco — são os pontos onde o jogador precisa
     ler INIMIGO, e parede carregada atrás de silhueta é o defeito de contraste que a
     BAR-CONSISTENCIA §2.4 mede. E a anti-repetição de 14 m continua valendo (peça
     repetida colada lê como falha de asset, não como cidade).

     A geografia da densidade:
     · RUA: mural grande na faixa alta (3,4 m) + a faixa BAIXA nova com pixo em pé e
       throw-up — é assim que uma fachada de periferia se lê: peça grande em cima,
       escrita embaixo.
     · VIELA (corredor de 4 m): denso era e ficou mais denso — pixo e personagem
       intercalados com o que já havia.
     · MURO / PORTÃO: tag larga + pixo + throw-up, cheio dos dois lados. */
  // --- fachadas da rua (x = ∓12,5): oeste e leste alternando, fora das vagas de comércio ---
  /* Um z só no lote [18,24] do oeste: ele é fatiado em X (o lado comprido é o x), então os
     dois módulos compartilham o MESMO intervalo de z e dois murais pedidos em 20 e 23 caíam
     grampeados a 0,5 m um do outro — arte sobreposta. Módulo curto, mural único. */
  for (const z of [-35, -30, -26, -16, -1, 21]) decalFachada(D_FACHADA, -12.43, z, Math.PI / 2, 5.0);
  for (const z of [-34, -22, -17, -11, 15, 25]) decalFachada(D_FACHADA, 12.43, z, -Math.PI / 2, 5.0);
  /* DENSIDADE NOVA (dono, 06/08 — "todas as casas cheias de grafites"): a faixa BAIXA
     das fachadas ganha a escrita da rua de verdade — pixo em pé e throw-up entre os
     murais grandes, mais a cartazera de lambes. Posições INTERCALADAS às de cima,
     pra nenhuma peça cair em cima de outra. */
  for (const z of [-37, -32, -28, -21, -8, 2, 9, 17]) decalFachada(D_PIXO, -12.43, z, Math.PI / 2, 2.4, 0.35, 1.9);
  for (const z of [-36, -31, -24, -13, -6, 4, 12, 19]) decalFachada(D_PIXO, 12.43, z, -Math.PI / 2, 2.4, 0.35, 1.9);
  for (const z of [-33, -19, -3, 14]) decalFachada(D_THROW, -12.43, z, Math.PI / 2, 1.9, 0.9, 1.5);
  for (const z of [-29, -15, 1, 22]) decalFachada(D_THROW, 12.43, z, -Math.PI / 2, 1.9, 0.9, 1.5);
  decalFachada(D_CARTAZERA, -12.43, -12, Math.PI / 2, 2.6, 0.5, 2.2);
  decalFachada(D_CARTAZERA, 12.43, 8, -Math.PI / 2, 2.6, 0.5, 2.2);
  // --- vielas (x = ∓23): as duas paredes de cada corredor, longe das caçambas e das pilhas ---
  for (const z of [-35, -25, -14, -7, 12, 21]) decalFachada(D_MURAL, -21.07, z, -Math.PI / 2, 3.4, 0.5, 2.8);
  for (const z of [-38, -27, -15, -2, 15, 25]) decalFachada(D_TAG, -24.93, z, Math.PI / 2, 3.4, 0.8, 2.4);
  for (const z of [-34, -24, -14, 5, 16, 25]) decalFachada(D_MURAL, 21.07, z, Math.PI / 2, 3.4, 0.5, 2.8);
  for (const z of [-40, -30, -20, -8, 8, 14]) decalFachada(D_TAG, 24.93, z, -Math.PI / 2, 3.4, 0.8, 2.4);
  // viela densa também na leva nova: pixo e personagem nas posições intercaladas
  for (const z of [-31, -18, -10, 2, 17]) decalFachada(D_PIXO, -21.07, z, -Math.PI / 2, 2.2, 0.35, 1.8);
  for (const z of [-36, -22, -11, 1, 11, 21]) decalFachada(D_PIXO, 21.07, z, Math.PI / 2, 2.2, 0.35, 1.8);
  for (const z of [-29, -17, 7, 18]) decalFachada(D_PERSO, -21.07, z, -Math.PI / 2, 1.8, 0.9, 1.5);
  for (const z of [-27, -13, 3, 19]) decalFachada(D_PERSO, 21.07, z, Math.PI / 2, 1.8, 0.9, 1.5);
  // --- muro do campinho (2,2 m de alto): o dono mandou ENCHER os muros de proteção ---
  for (const x of [-18.5, 0, 18.5]) decal(D_TAG, x, 0.35, 27.76, Math.PI, 1.5, x === 0 ? 8.0 : 5.6);
  for (const x of [-17, 5]) decal(D_TAG, x, 0.35, 28.24, 0, 1.5, 5.6);
  for (const x of [-14, -7, 8, 15]) decal(D_PIXO, x, 0.3, 27.74, Math.PI, 1.5, 3.2);
  for (const x of [-13, -3, 11]) decal(D_THROW, x, 0.35, 28.26, 0, 1.3, 2.6);
  for (const x of [-11, 2, 14]) decal(D_PERSO, x, 0.35, 27.72, Math.PI, 1.4, 2.4);
  decal(D_MURAL, -18, 0.4, -39.75, 0, 1.7, 4.4);
  decal(D_PIXO, -12, 0.35, -39.75, 0, 1.5, 3.0);   // muro da vila do baile também entra na leva
  decal(D_THROW, -23, 0.4, -39.75, 0, 1.2, 2.4);
  /* TERCEIRA LEVA (dono, 07/08: "encher mais de posters, pixações e grafites").
     Mesma gramática das levas anteriores — peça grande na faixa alta, escrita na
     baixa — e posições INTERCALADAS às duas levas acima (nenhum z repete numa
     mesma parede). O que esta leva acrescenta de novo é a CARTAZERA (lambe-lambe/
     stencil = os "posters" do pedido), que só existia em 2 vagas no mapa todo. */
  for (const z of [-39, -23, -13, 6, 13]) decalFachada(D_CARTAZERA, -12.43, z, Math.PI / 2, 1.7, 0.5, 1.9);
  for (const z of [-38, -26, -8, 7, 23]) decalFachada(D_CARTAZERA, 12.43, z, -Math.PI / 2, 1.7, 0.5, 1.9);
  for (const z of [-24, -10, 5, 24]) decalFachada(D_CARA, -12.43, z, Math.PI / 2, 2.0, 1.1, 1.8);
  for (const z of [-19, -4, 10, 18]) decalFachada(D_CARA, 12.43, z, -Math.PI / 2, 2.0, 1.1, 1.8);
  for (const z of [-29, -12, 0, 19]) decalFachada(D_THROW, -12.43, z, Math.PI / 2, 1.9, 0.9, 1.5);
  for (const z of [-25, -9, 6, 24]) decalFachada(D_THROW, 12.43, z, -Math.PI / 2, 1.9, 0.9, 1.5);
  // vielas: cartazera + tag nas vagas que sobraram
  for (const z of [-33, -20, -5, 9, 23]) decalFachada(D_CARTAZERA, -21.07, z, -Math.PI / 2, 1.6, 0.5, 1.8);
  for (const z of [-30, -18, -4, 13, 23]) decalFachada(D_CARTAZERA, 21.07, z, Math.PI / 2, 1.6, 0.5, 1.8);
  for (const z of [-21, -9, 4, 20]) decalFachada(D_TAG, -24.93, z, Math.PI / 2, 2.6, 0.8, 2.2);
  for (const z of [-35, -25, -13, 2, 18]) decalFachada(D_TAG, 24.93, z, -Math.PI / 2, 2.6, 0.8, 2.2);
  // muro do campinho e muro do baile: fecha os vãos que sobraram das levas 1-2
  for (const x of [-17.5, -10, 4, 12, 17]) decal(D_PIXO, x, 0.32, 27.78, Math.PI, 1.4, 2.8);
  for (const x of [-9, 1, 8]) decal(D_CARTAZERA, x, 0.5, 28.22, 0, 1.4, 2.0);
  for (const x of [-26, -15, -8]) decal(D_PIXO, x, 0.32, -39.73, 0, 1.4, 2.6);
  decal(D_CARTAZERA, -20.5, 0.5, -39.73, 0, 1.5, 2.2);

  /* ===================== COBERTURA PROCEDURAL (dono, 07/08) =====================
     "70-80% das superfícies tomadas — pixação, grafite, bombs, stencils, posters;
     parede branca é desperdício, o mapa tem que passar clima urbano degradado."
     As listas de coordenada acima nunca chegariam lá: são ~40 vagas escolhidas à
     mão num mapa com ~100 lotes. Aqui a régua vira código: varre TODO lote
     (`LOTES` guarda {x0,x1,z0,z1,h} de cada barraco construído), acha as faces
     EXPOSTAS (face colada em outro lote a <0,6 m é divisa — peça lá é invisível
     e só gasta draw call) e ladrilha a cada ~2,3 m com a gramática de rua:
     pixo na faixa baixa, tag/throw-up no meio, lambe/stencil em altura de colar,
     personagem/peça na faixa alta de lote alto. ~20% das vagas ficam vazias de
     propósito (parede 100% coberta lê como papel de parede, não como rua).
     O `decal()` continua passando por `medirParede`: peça sem parede real atrás
     (vão, janela, recuo do GLB) morre em silêncio — o gerador pode propor à
     vontade que só cola o que tem muro. */
  {
    const exposta = (lado, c, a0, a1) => {
      for (const O of LOTES) {
        if (lado === 'x-' && Math.abs(O.x1 - c) < 0.6 && O.z0 < a1 && O.z1 > a0) return false;
        if (lado === 'x+' && Math.abs(O.x0 - c) < 0.6 && O.z0 < a1 && O.z1 > a0) return false;
        if (lado === 'z-' && Math.abs(O.z1 - c) < 0.6 && O.x0 < a1 && O.x1 > a0) return false;
        if (lado === 'z+' && Math.abs(O.z0 - c) < 0.6 && O.x0 < a1 && O.x1 > a0) return false;
      }
      return true;
    };
    let ck = 7, coladas = 0;
    const TETO = 520;   // além disto é draw call queimada: o frustum não corta o passe de sombra
    for (const L of LOTES) {
      if (coladas >= TETO) break;
      const faces = [
        ['x-', L.x0, L.z0, L.z1, -Math.PI / 2],
        ['x+', L.x1, L.z0, L.z1, Math.PI / 2],
        ['z-', L.z0, L.x0, L.x1, Math.PI],
        ['z+', L.z1, L.x0, L.x1, 0],
      ];
      for (const [lado, c, a0, a1, ry] of faces) {
        const len = a1 - a0;
        if (len < 1.8 || !exposta(lado, c, a0, a1)) continue;
        for (let t = a0 + 1.0; t < a1 - 0.9 && coladas < TETO; t += 2.3) {
          const k = mix32(++ck * 2246822519 ^ ((t * 8) | 0));
          if (k % 10 < 2) continue;   // o respiro
          const jit = ((k >> 4) % 7 - 3) * 0.11;
          const x = lado[0] === 'x' ? c : t + jit;
          const z = lado[0] === 'x' ? t + jit : c;
          const r = k % 100;
          let ok = null;
          if (r < 36) ok = decal(D_PIXO, x, 0.22 + ((k >> 5) % 3) * 0.12, z, ry, 1.25 + ((k >> 7) % 3) * 0.22, 2.0);
          else if (r < 56) ok = decal(D_TAG, x, 0.45, z, ry, 1.55, 1.9);
          else if (r < 72) ok = decal(D_THROW, x, 0.75, z, ry, 1.35, 1.8);
          else if (r < 84) ok = decal(D_CARTAZERA, x, 0.5, z, ry, 1.5, 1.4);
          else if (L.h > 2.9) ok = decal(D_MURAL, x, 0.85, z, ry, Math.min(2.1, L.h - 1.1), 1.9);
          else ok = decal(D_PERSO, x, 0.7, z, ry, 1.3, 1.6);
          if (ok !== null && ok !== undefined) coladas++;
        }
      }
    }
  }
  /* O ABRIGO DO PONTO DE ÔNIBUS PERDEU OS DOIS LAMBE-LAMBES. Eles estavam colados nas
     COSTAS DE VIDRO do abrigo (`MAT_VIDRO`, x = -11,85, `collide: false`) — ou seja, em
     vidro e sem sólido nenhum atrás. É literalmente a reclamação do dono ("colocaste em
     lugares que não são parede") e o `paredeAtras` já os reprovaria em silêncio; estão
     removidos daqui para a lista dizer a verdade sobre o que o mapa cola. */
  /* O ÔNIBUS FICOU DE FORA DE PROPÓSITO. Ele é o único volume do mapa cuja malha visível
     passou a vir de um GLB (`onibus_sptrans`) encaixado por ALTURA — a largura e o
     comprimento são os do modelo, não os BW/BL do colisor. Decalque colado em ∓BW/2 ficaria
     flutuando ao lado da lataria assim que o GLB carregasse, e o defeito só apareceria no
     navegador (em node nenhum GLB carrega). Pixo em ônibus volta quando a flange do modelo
     for medida, não antes. */

  // ===== ground height: o mapa é PLANO (nenhum degrau, nenhum mezanino) =====
  const groundHeightAt = () => 0;

  // ===== waypoints + A* (grade 3,4 m, o mesmo passo dos outros mapas) =====
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < 1.6 && c.maxY > 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  /* ADENSAMENTO — sem ele o mapa NÃO FUNCIONA, e o motivo é aritmético: a grade nasce em
     x = -HALF_X + 2 com passo 3,4 m, então as colunas caem em x = -26, -22,6, -19,2, -15,8,
     -12,4 … NENHUMA delas cai dentro da viela oeste (x ∈ [-25,-21], centro -23) com folga de
     0,5 m para as duas paredes. Uma viela sem nó é uma viela que o A* não conhece: os bots
     nunca a usam, a CTF2 volta a achar 1 rota só e as duas alternativas ao corredor central
     — o ponto inteiro do desenho deste mapa — desaparecem do jogo sem aparecer em nada.
     Por isso cada corredor estreito ganha uma FILEIRA declarada, com inflação menor (0,35 m:
     ainda maior que o raio do corpo, 0,38 m é o corpo, então nó em fileira é nó em chão que
     cabe gente). Mesma técnica do map_havan.js (rampa e depósito). */
  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  linha(-23, -36.5, -23, 27);                   // viela oeste inteira
  linha(23, -38.5, 23, 27);                     // viela leste inteira
  for (const bz of [-10.5, 2.5, 16.5]) linha(-20.6, bz, -12.8, bz);   // becos oeste
  for (const bz of [-3.5, 10.5, 20.5]) linha(12.8, bz, 20.6, bz);     // becos leste
  linha(13, -38, 24, -38);                      // passagem praça -> viela leste
  linha(-24.5, 26, 24.5, 26, 2.6);              // travessa do campinho
  for (const gx of [-12, 12]) linha(gx, 26.5, gx, 31, 2.0);           // os dois portões do muro
  for (let vz = -44.4; vz <= -38.6; vz += 2.4) linha(-24, vz, -13.4, vz);   // pátio da vila (spawn P)

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
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

  // spawns: P na VILA DO BAILE (norte, olhando pra praça → yaw π/2); B no CAMPINHO (sul,
  // olhando pra rua → yaw π). Convenção do game.js: forward = (-sin yaw, -cos yaw).
  const spawns = {
    /* [-23,-20.5,-18,-15.5] -> [-22,-19.5,-17,-14.5] (invariante MAP2B). O slot de x = -23
       ficava a 2,0 m do muro de fundo da vila e o disco de 5 m em volta dele batia na parede
       oeste: 40,2 m² de chão contíguo, contra um piso de 40 m². Dois metros a leste e o pior
       slot vai pra ~50 m² sem mexer em nenhuma parede. */
    E: [-22, -19.5, -17, -14.5].map(x => ({ x, z: -42.5, yaw: Math.PI / 2 })),
    /* z 41,5 -> 40,5: o armário do spawn (game.js `_resetPositions`) monta duas fileiras
       ATRÁS de quem nasce, a 1,6 m e 3,6 m. Com o slot em 41,5 a fileira de trás caía em
       44,1 e o `_freeSpot` empurrava uma arma até z = 46, a 0,94 m do chão alcançável mais
       próximo — teto da pickup-check é 1,0 m, ou seja, passava raspando por causa do
       clamp de `bounds`. Um metro ao norte devolve 1,9 m de folga até a borda do campo. */
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 40.5, yaw: Math.PI })),
  };

  /* ===================== AS 4 BANDEIRAS =====================
     Lista literal do dono: "1 no campinho do respawn, outra no bar de esquina, outra mais pra
     frente perto do ponto de ônibus, e a final na praça onde é o baile".
     ONDE ELAS **NÃO** PODEM FICAR, e por quê (CTF1, tools/eval/invariants.mjs):
     (a) COLINEARES. O raio de captura é 4,5 m; se a altura do triângulo de qualquer trio for
         menor que isso, o caminho mais curto entre as duas pontas passa DENTRO do anel do
         meio — é o mecanismo do "os bots ficam todos na bandeira do meio". Num mapa que é uma
         RUA RETA isso é o risco natural: quatro bandeiras no eixo da rua têm altura ZERO.
         Por isso elas alternam de lado — campinho a OESTE do eixo (x -6), bar a LESTE (+9,5),
         ponto a OESTE (-10), baile a LESTE (+5). Menor altura de triângulo medida: 10,4 m,
         mais do que o dobro do raio de captura.
     (b) A MENOS DE 2 RAIOS (9 m) DO SPAWN MAIS PRÓXIMO — capturável de dentro do respawn.
         A do campinho é a crítica: fica a 11,6 m do slot B mais próximo, com o gol entre elas. */
  const ctfPoints = [
    { id: 'R', label: 'BAILE', x: 5, z: -30.5 },
    { id: 'E', label: 'PONTO DE ÔNIBUS', x: -10, z: -6 },
    { id: 'B', label: 'BAR DA ESQUINA', x: 9.5, z: 6 },
    { id: 'C', label: 'CAMPINHO', x: -6, z: 30 },
  ];

  /* ARSENAL NO CHÃO — mesma colocação do ferro velho (caixa deitada a 0,10 m: a base da malha
     fica 0,04 m do chão, dentro do teto de 0,05 m da pickup-check). Rifles no miolo da rua e
     nos becos, snipers nas duas vielas (que são as linhas longas do mapa), curtas nas bocas. */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', 0.5, -13);         place('m4', 2.5, 12);
  place('shotgun', -16.6, 2.5);  place('mp5', 16.6, -3.5);
  place('awp', -23, 16);         place('m400', 23, -14);
  place('deagle', -8, -25);      place('shotgun', 8, -35);
  place('ak', 10.5, 34);         place('m4', -10.5, 40);
  place('mp5', -20, 26);         place('deagle', 20, 26);

  const preLote = new Set(root.children);
  PBC.build(root);      // carros pintados por instância
  PB.build(root);       // instancia barraco e fachada: 1 draw call por (material, bloco de 24 m)
  SKIRT.build(root);
  /* O lote nasce InstancedMesh visível em root e FORA de `occluders`: sem isto a bala
     atravessaria barraco/fachada/carro que o corpo respeita — e era isso que o proxy
     glbFallback tapava (BUG-54). Transparente fica de fora, mesmo teste da régua. */
  for (const c of root.children) {
    if (preLote.has(c) || !c.isInstancedMesh) continue;
    const ms = Array.isArray(c.material) ? c.material : [c.material];
    if (ms.some((m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9)))) occluders.push(c);
  }

  /* ═══ A PASSADA DE GRAFITE — E POR QUE ELA VEM DEPOIS DO `PB.build` ═══════════
     Este mapa colava ~334 decalques e o dono, andando nele, contou "10-15% de arte
     urbana". As duas medidas estavam certas e a régua nova (graffiti-census, que
     mede NO NAVEGADOR) explicou a diferença: 96 peças na tela, cobertura 12,7%.

     O que matava as outras 238 é esta linha, o `PB.build(root)` logo acima. Os
     barracos são InstancedMesh e nascem AQUI, no fim; a casca procedural de cada
     lote fica `visible = false` assim que existe GLB. Então todo `decalFachada`
     lá de cima roda num mundo onde a fachada AINDA NÃO EXISTE: o `medirParede` não
     acha malha, devolve null, e a peça morre em silêncio. Em node o GLB nunca
     carrega, a casca procedural continua visível e as 334 passam — que é por que
     o `decal-probe` jurava que estava tudo lá.

     Depois do `PB.build` a parede existe, e aí não é preciso adivinhar coordenada:
     a passada acha parede por raio a partir dos waypoints (por onde se anda de
     fato — "vc anda pelos becos e avenidas principais e não tem") e pinta o que
     achar, em três faixas de altura. As chamadas à mão acima continuam: elas são
     as vagas escolhidas a dedo (porta de aço, muro do baile, travessa do campinho)
     e agora quase todas sobrevivem, porque a passada não depende delas. */
  grafitar({
    id: 'quebrada',
    root, T, waypoints: nodes, seed: 4021, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
    /* HOMENAGENS: peça de primeira classe, 5,4 × 2,8 m (eram 3,9 × 2,0 numa vaga
       fixa que o navegador reprovava), na melhor parede medida de cada região. */
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 91, separacao: 15 },
    bandas: [
      /* CARTAZ DA COLEÇÃO (07/08). Reprovação: "tem diversos posters da minha coleção
         e tb que vc gerou que não estão em nenhum mapa". Eram 30 arquivos vivendo em
         2 dos 5 mapas, e mesmo nesses só ~6 entravam por rodada (a vaga era fixa).
         Aqui eles entram como lambe-lambe: banda do olho, tamanho de papel colado, e
         `chance` baixa de propósito — cartaz é tempero, parede de cartaz vira outdoor. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      // banda do olho: a escrita da rua — pixo em pé, throw-up, tag, lambe
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6],
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      // banda de peito de muro alto: personagem e peça, que é o que lê de longe
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0],
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      // banda de empena: só onde a parede realmente sobe (sobrado, muro do baile)
      { y0: 4.2, y1: 7.6, larg: 4.8, alturas: [2.2, 1.5, 1.0], chance: 78,
        pool: D_MURAL.concat(D_THROW, D_TAG) },
      /* RESGATE. As três bandas acima só sabem colar peça de 1 m pra cima, e sobrava
         412 âncora sem NADA: canto de muro, trecho entre porta e janela, lateral de
         caixa d'água. Muro de quebrada de verdade é justamente ali que tem mais tag
         miúda. Esta banda existe pra esses restos — peça pequena, largura curta, e
         ela roda por último, então só ocupa o que as outras não quiseram. */
      /* `planura` folgada aqui e só aqui: o que sobrava pelado depois das três bandas
         era parede de tijolo aparente e chapa ondulada, onde os 28 cm padrão de
         variação de profundidade reprovam tudo. Peça de meio metro em tijolo torto é
         exatamente o que existe na rua — o limite apertado protege MURAL, não tag. */
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
