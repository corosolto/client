// ============================================================================
// PISCINA DA TRETA — homenagem ao fy_pool_day do CS 1.6, com o LAYOUT MEDIDO.
//
// POR QUE ESTE ARQUIVO VOLTOU (31/07)
// A versão temática "Piscinão de Ramos" (1.887 linhas, agora em map_piscinao_ramos.js)
// foi reprovada pelo dono depois de jogar: "é o pior mapa de todos. Muito poluído,
// não dá pra entender nada, a água está feia, o mapa está feio... tudo em volta e
// as coisas no meio do mapa estão tudo confuso". Decisão dele: voltar para a
// piscina anterior, sem tema.
//
// Este é o mapa original (commit 7871a7b): um salão FECHADO de piscina azulejado,
// compacto e legível — um material por superfície (BAR-CONSISTENCIA §2/§3).
//
// LAYOUT MEDIDO do fy_pool_day.bsp (frente map2/piscina): proporções de
// tools/eval/piscina_bsp.json, cobradas pela régua eval:piscina-bsp (±20%).
// ============================================================================
// piscina_treta homage — the classic CS 1.6 "full weapons" map: a COMPACT INDOOR
// tiled swimming-pool hall. Same buildWorld contract as map.js.
import * as THREE from 'three';
import { decalIds, paredeAtras } from './map_decals.js';
import { grafitar, esconderSeFaltar } from './graffiti_pass.js';   // cobertura medida, não coordenada à mão
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { createWater } from './water.js';
import { AMB_LOOPS } from './soundscape.js';

/* Medidos do BSP (piscina_bsp.json): salão 35,99x47,24 m -> 36,0x47,2;
   fatores por eixo do jogo divergem 11% da âncora, um só fator por área. */
const HALF_X = 18, HALF_Z = 23.6;   // interior half-extents (walls sit just outside)
const WALL_H = 7, CEIL = 7;
/* spawns a 33,8 m entre centróides (PB5); ±16,9 simétrico por fair play. */
const SPAWN_Z = 16.9;

/* GLBs que ESTE mapa instancia (main.js dá preload pelo slot `ambience` do
   registro — sem ele a fauna caía toda no fallback procedural, BUG-57). O pardal
   é procedural (não há GLB no acervo) e não precisa de preload. */
export const PISCINA_AMBIENCE = Object.freeze(['rat', 'pigeonGround', 'dog']);

/* ---------- inline procedural tile textures ---------- */
function mkTex(c, rx = 1, rz = 1, clamp = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.repeat.set(rx, rz);
  return t;
}
function tileTex(base, line, n, rx, rz) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = line; x.lineWidth = 3;
  const s = 128 / n;
  for (let i = 0; i <= n; i++) {
    x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 128); x.stroke();
    x.beginPath(); x.moveTo(0, i * s); x.lineTo(128, i * s); x.stroke();
  }
  for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(120,140,160,${Math.random() * 0.05})`; x.fillRect(Math.random() * 128, Math.random() * 128, 4, 4); }
  return mkTex(c, rx, rz);
}
function signTexture(bg, fg, title, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
  x.textAlign = 'center'; x.fillStyle = fg;
  x.font = 'bold 44px "Arial Black",Impact,sans-serif'; x.fillText(title, 256, 60);
  if (sub) { x.font = 'bold 20px Arial,sans-serif'; x.fillText(sub, 256, 96); }
  return mkTex(c, 1, 1, true);
}

export function buildPoolDay(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.rz) m.rotation.z = opts.rz;
    root.add(m);
    if (opts.collide !== false) {
      const pad = opts.pad || 0;
      const ex = (opts.ry || opts.rz) ? Math.max(w, d) / 2 : w / 2;
      const ez = (opts.ry || opts.rz) ? Math.max(w, d) / 2 : d / 2;
      colliders.push({ minX: x - ex - pad, maxX: x + ex + pad, minY: y, maxY: y + h, minZ: z - ez - pad, maxZ: z + ez + pad });
      occluders.push(m);
    } else if (opts.bala) occluders.push(m);   // visível dentro de colisor alheio: a bala para nele (BUG-54)
    return m;
  }
  function addPlane(w, h, mat, x, y, z, ry = 0, rx = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx;
    m.receiveShadow = true; root.add(m); return m;
  }

  const TEX = {
    wall: tileTex('#eef3f6', '#c2d0d8', 4, 8, 3),
    floor: tileTex('#e7ecef', '#ccd6dd', 4, 12, 16),
    pool: tileTex('#33c6e0', '#7fe4f2', 4, 4, 5),
  };
  const MAT = {
    wall: lam({ map: TEX.wall }), floor: lam({ map: TEX.floor }), pool: lam({ map: TEX.pool }),
    navy: lam({ color: 0x24407a }), white: lam({ color: 0xf2f5f7 }),
    locker: lam({ color: 0xc2ccd4 }), lockerDark: lam({ color: 0x94a3af }),
    chair: lam({ color: 0x2f4f9e }), steel: lam({ color: 0x8a9096 }),
    /* TEX1 — o forro eram 4 lajes de 105 a 180 m² de cor CHAPADA (0xe4ebef, luminância de
       albedo 0,82): quatro retângulos brancos lisos ocupando o topo inteiro do quadro, que é
       literalmente o "retângulo branco grande e liso" que o dono descreveu. O caminho certo
       já existia neste arquivo desde sempre — `tileTex`, o mesmo gerador do piso e das
       paredes; o forro é que nunca tinha passado por ele. Placa de forro modular de 60 cm com
       junta: n=4 divisões no canvas de 128², repeat 10×6 no maior painel (~0,6 m por placa).
       Custo: UM canvas 128² a mais no boot do mapa (os outros três já existiam). */
    ceil: lam({ map: tileTex('#e4ebef', '#c6cfd6', 4, 10, 6) }),
  };

  /* ENTORNO DO CLUBE — cenário puro, 18 cm abaixo do salão. Antes as paredes externas
     terminavam diretamente no céu e o mapa aéreo lia como uma caixa branca flutuante.
     Estes dois planos não têm collider nem waypoint; servem apenas de chão para o horizonte. */
  {
    const grassTex = T.grass.clone(); grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(18, 22);
    const courtTex = T.concreteDark.clone(); courtTex.wrapS = courtTex.wrapT = THREE.RepeatWrapping; courtTex.repeat.set(10, 20);
    const grassMat = lam({ map: grassTex, color: 0x77935d });
    const courtMat = lam({ map: courtTex, color: 0xa7aaa8 });
    const patch = (w, d, x, z, y, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m);
    };
    // Anéis, nunca planos inteiros: o miolo precisa ficar vazio porque a piscina desce 1,5 m.
    for (const sz of [-1, 1]) patch(76, 20, 0, sz * 34, -0.20, grassMat);
    for (const sx of [-1, 1]) patch(20, 48, sx * 29, 0, -0.20, grassMat);
    for (const sz of [-1, 1]) patch(48, 9, 0, sz * 28.6, -0.16, courtMat);
    for (const sx of [-1, 1]) patch(5, 48, sx * 21.5, 0, -0.16, courtMat);
    // Coqueiros e coroas de folhas dão escala de clube tropical à caixa vista do exterior.
    const trunk = lam({ color: 0x76552f });
    const leaf = new THREE.MeshBasicMaterial({ color: 0x285b38, side: THREE.DoubleSide });
    for (const [px, pz] of [[-29, -33], [29, -33], [-29, 33], [29, 33]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 5.8, 8), trunk);
      t.position.set(px, 2.7, pz); t.castShadow = true; root.add(t);
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.65), leaf);
        f.position.set(px, 5.65, pz); f.rotation.x = -Math.PI / 2; f.rotation.z = i * Math.PI / 3; root.add(f);
      }
    }
  }

  /* piscina 13,5x9 ATRAVESSADA no eixo curto, +1,1 m leste/norte: medido do BSP
     (régua eval:piscina-bsp). Rampa e 1,5 m de fundo são gameplay nossos. */
  const POOL = { cx: 1.1, cz: 1.1, hx: 6.75, hz: 4.5, m: 2.5, depth: 1.5 };
  const OUTX = POOL.hx + POOL.m, OUTZ = POOL.hz + POOL.m;
  const nX = POOL.cx + OUTX, sX = POOL.cx - OUTX, nZ = POOL.cz + OUTZ, sZ = POOL.cz - OUTZ;
  function poolDepth(x, z) {
    const ox = Math.abs(x - POOL.cx), oz = Math.abs(z - POOL.cz);
    if (ox > OUTX || oz > OUTZ) return 0;
    const penX = Math.min(1, Math.max(0, (OUTX - ox) / POOL.m));
    const penZ = Math.min(1, Math.max(0, (OUTZ - oz) / POOL.m));
    return -POOL.depth * Math.min(penX, penZ);
  }

  /* ---------------- floor tiles framing the pool hole ---------------- */
  const addFloor = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.floor); m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; root.add(m); };
  addFloor(HALF_X * 2, HALF_Z - nZ, 0, (nZ + HALF_Z) / 2);
  addFloor(HALF_X * 2, sZ + HALF_Z, 0, (sZ - HALF_Z) / 2);
  addFloor(HALF_X - nX, nZ - sZ, (nX + HALF_X) / 2, POOL.cz);
  addFloor(sX + HALF_X, nZ - sZ, (sX - HALF_X) / 2, POOL.cz);

  /* ---------------- the pool ---------------- */
  let aguaPiscina = null;
  {
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(POOL.hx * 2, POOL.hz * 2), MAT.pool);
    fl.rotation.x = -Math.PI / 2; fl.position.set(POOL.cx, -POOL.depth + 0.02, POOL.cz); fl.receiveShadow = true; root.add(fl);
    const ang = Math.atan2(POOL.depth, POOL.m), L = Math.hypot(POOL.depth, POOL.m);
    addBox(POOL.hx * 2, 0.1, L, MAT.pool, POOL.cx, -POOL.depth / 2, POOL.cz + POOL.hz + POOL.m / 2, { collide: false, rx: -ang, cast: false });
    addBox(POOL.hx * 2, 0.1, L, MAT.pool, POOL.cx, -POOL.depth / 2, POOL.cz - POOL.hz - POOL.m / 2, { collide: false, rx: ang, cast: false });
    addBox(L, 0.1, POOL.hz * 2, MAT.pool, POOL.cx + POOL.hx + POOL.m / 2, -POOL.depth / 2, POOL.cz, { collide: false, rz: ang, cast: false });
    addBox(L, 0.1, POOL.hz * 2, MAT.pool, POOL.cx - POOL.hx - POOL.m / 2, -POOL.depth / 2, POOL.cz, { collide: false, rz: -ang, cast: false });
    /* água viva do water.js (córrego/mansão): amp 0,05, DoubleSide (entrável). */
    aguaPiscina = createWater(scene, T, 'piscina_treta', {
      nivel: -0.4, centro: [POOL.cx, POOL.cz], tamanho: [OUTX * 2 - 0.3, OUTZ * 2 - 0.3], segmentos: 16,
      raso: 0x36cde4, fundo: 0x1a7f96, profEscala: 1.5, espumaFaixa: 0.3, espumaMiolo: 0.12,
      profFallback: 0.5, ampEscala: 0.05, parent: root,
    });
    aguaPiscina.mesh.userData.nonSolidSurface = true;
    aguaPiscina.material.side = THREE.DoubleSide;
    // navy tile border
    addBox(OUTX * 2 + 0.7, 0.16, 0.5, MAT.navy, POOL.cx, 0, nZ + 0.15, { collide: false });
    addBox(OUTX * 2 + 0.7, 0.16, 0.5, MAT.navy, POOL.cx, 0, sZ - 0.15, { collide: false });
    addBox(0.5, 0.16, OUTZ * 2 + 0.7, MAT.navy, nX + 0.15, 0, POOL.cz, { collide: false });
    addBox(0.5, 0.16, OUTZ * 2 + 0.7, MAT.navy, sX - 0.15, 0, POOL.cz, { collide: false });
    for (const lx of [-6, -2, 2, 6])
      addPlane(0.2, POOL.hz * 2 - 1, MAT.navy, POOL.cx + lx, -POOL.depth + 0.04, POOL.cz, 0, -Math.PI / 2);
    // ladders
    for (const sx of [1, -1]) {
      const lx = POOL.cx + sx * (OUTX - 0.1);
      // z = sx*3: as duas escadas ficam simétricas pela ROTAÇÃO DE 180° em torno do centro,
      // que é a simetria real do mapa (TIME E em -z, BOL em +z). Antes as duas estavam em z=+3,
      // ou seja, o lado do BOL tinha as duas saídas da piscina mais perto.
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), MAT.white); r.rotation.z = Math.PI / 2; r.position.set(lx, -0.15 - i * 0.28, POOL.cz + sx * 3); root.add(r); }
      for (const dz of [-0.35, 0.35]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), MAT.white); r.position.set(lx, -0.05, POOL.cz + sx * 3 + dz); root.add(r); }
    }
  }

  /* ---------------- diving board (north end over the water) ----------------
     Os PÉS em nZ+1,7: fora da primeira fileira de waypoints do deck (o inflate
     0,5 m do `blocked()` não pode comer nó de navegação de nenhum dos lados —
     a prancha não vale atalho só para o time do norte). */
  addBox(0.3, 1.3, 0.3, MAT.steel, POOL.cx - 0.8, 0, nZ + 1.7);
  addBox(0.3, 1.3, 0.3, MAT.steel, POOL.cx + 0.8, 0, nZ + 1.7);
  addBox(1.4, 0.15, 4.0, MAT.white, POOL.cx, 1.3, nZ - 0.4, { collide: false, bala: true });

  /* ---------------- walls: white tile + navy accent band ---------------- */
  const wX = HALF_X + 0.5, wZ = HALF_Z + 0.5;
  addBox(HALF_X * 2 + 2, WALL_H, 1, MAT.wall, 0, 0, -wZ);
  addBox(HALF_X * 2 + 2, WALL_H, 1, MAT.wall, 0, 0, wZ);
  addBox(1, WALL_H, HALF_Z * 2 + 2, MAT.wall, -wX, 0, 0);
  addBox(1, WALL_H, HALF_Z * 2 + 2, MAT.wall, wX, 0, 0);
  // embasamento externo fecha visualmente a caixa do clube sem alterar sua colisão.
  addBox(HALF_X * 2 + 3, 1.0, 1.4, MAT.navy, 0, -0.85, -wZ, { collide: false, cast: false });
  addBox(HALF_X * 2 + 3, 1.0, 1.4, MAT.navy, 0, -0.85, wZ, { collide: false, cast: false });
  addBox(1.4, 1.0, HALF_Z * 2 + 3, MAT.navy, -wX, -0.85, 0, { collide: false, cast: false });
  addBox(1.4, 1.0, HALF_Z * 2 + 3, MAT.navy, wX, -0.85, 0, { collide: false, cast: false });
  for (const [w, h, d, x, z] of [[HALF_X * 2 + 2, 0.6, 0.12, 0, -HALF_Z], [HALF_X * 2 + 2, 0.6, 0.12, 0, HALF_Z], [0.12, 0.6, HALF_Z * 2 + 2, -HALF_X, 0], [0.12, 0.6, HALF_Z * 2 + 2, HALF_X, 0]])
    addBox(w, h, d, MAT.navy, x, 2.0, z, { collide: false });
  // clock + signage on the north wall
  {
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 20), MAT.white);
    clock.rotation.x = Math.PI / 2; clock.position.set(-8, 4.6, HALF_Z); root.add(clock);
    addPlane(1.5, 1.5, MAT.white, -8, 4.6, HALF_Z - 0.06, Math.PI);
    addPlane(1.1, 1.1, MAT.navy, -8, 4.6, HALF_Z - 0.08, Math.PI);
    addPlane(6, 2.2, signTexture('#1b3566', '#dff2ff', 'PISCINÃO DA TRETA', 'CLUBE AQUÁTICO PIXELÂNDIA'), 6, 4.4, HALF_Z - 0.06, Math.PI);
  }

  /* ---------------- cartazes nas paredes de azulejo (pedido do dono, 04/08) -------------
     "precisamos meter posters da pasta posters em todos os mapas especialmente na piscina".

     Os 18 arquivos de `public/posters/` já eram carregados por textures.js (`T.posterImgs`
     + `T.posterAspects`) e só a Brasília usava — nas fachadas dos ministérios. Aqui eles
     resolvem um problema que a régua já apontava: o Piscinão é o mapa mais VAZIO de leitura,
     azulejo branco de parede a parede, sem nada que dê referência de direção. Cartaz em
     parede lisa é o truque mais antigo de level design pra isso — e de graça, porque a
     textura já está na memória.

     REGRAS DE COLOCAÇÃO
     · y = 2,6 m com 2,2 m de altura: acima da cabeça (não vira cover falso) e abaixo da
       faixa navy, que é a linha de leitura do mapa;
     · 6 cm à frente do azulejo, o mesmo afastamento do relógio e da placa daqui;
     · `collide:false` por construção — `addPlane` não empurra collider, então cartaz nunca
       vira parede invisível (a lição do ônibus da Brasília, BUG-21);
     · nada em x ∈ [3, 9] na parede norte: é onde moram o relógio e a placa PISCINÃO;
     · aspecto vem de `T.posterAspects` — esticar cartaz de protesto real fica óbvio. */
  {
    const imgs = T.posterImgs || [], asp = T.posterAspects || [];
    if (imgs.length) {
      const HBASE = 2.2, Y = 2.6, OFF = 0.06;
      // [x, z, ry] de cada cartaz, já virado pra dentro do salão
      const vagas = [
        [-13, HALF_Z - OFF, Math.PI], [-3, HALF_Z - OFF, Math.PI], [11, HALF_Z - OFF, Math.PI],
        [-11, -HALF_Z + OFF, 0], [0, -HALF_Z + OFF, 0], [12, -HALF_Z + OFF, 0],
        [-HALF_X + OFF, -14, Math.PI / 2], [-HALF_X + OFF, 2, Math.PI / 2], [-HALF_X + OFF, 16, Math.PI / 2],
        [HALF_X - OFF, -16, -Math.PI / 2], [HALF_X - OFF, -2, -Math.PI / 2], [HALF_X - OFF, 14, -Math.PI / 2],
      ];
      vagas.forEach(([px, pz, ry], i) => {
        const ti = i % imgs.length, A = asp[ti] || 0.72, escP = (T.posterEscala || [])[ti] || 1;
        addPlane(HBASE * escP * A, HBASE * escP, lam({ map: imgs[ti], side: THREE.DoubleSide }), px, Y, pz, ry);
      });
    }
  }

  /* ---------------- murais dedicados na parede dos armários (pedido do dono, 06/08) ------
     As duas peças grandes fictícias de `textures.js` (becos da Quebrada levam as mesmas).
     ONDE: paredes leste/oeste, centradas em z=6, base a 2,2 m — exatamente ACIMA da parede
     de armários (topo a 2,1 m, face em ±15,95), que é a vaga que o dono nomeou. O z=6 não
     é sorteado: fica no vão entre os cartazes de z=-2 e z=14 (cada um com ±0,8 m) e entre
     os bancos de armário de z=0 e z=11. Topo a 4,5 m, abaixo da faixa navy de leitura.
     São as únicas peças COLORIDAS grandes do salão — exceção deliberada do dono à regra
     "só pixação" deste mapa; ficam na lateral, fora do plano de fundo do duelo axial. */
  {
    const MH = 2.3, MW = MH * 1.8333, MY = 2.2 + MH / 2, MOFF = 0.06;   // 1408×768 medido
    // nome = quem é o arquivo: em node a textura nunca carrega e o nome é a única régua
    if (T.muralEternamente) { const a = addPlane(MW, MH, lam({ map: T.muralEternamente, side: THREE.DoubleSide }), -HALF_X + MOFF, MY, 6, Math.PI / 2); a.name = 'mural:eternamente'; }
    if (T.muralLesteVive) { const b = addPlane(MW, MH, lam({ map: T.muralLesteVive, side: THREE.DoubleSide }), HALF_X - MOFF, MY, 6, -Math.PI / 2); b.name = 'mural:leste-vive'; }
  }

  /* Segunda leva de decalque (pilastra/armário/guarita). Preenchida pelo bloco abaixo e
     DISPARADA depois que esses volumes existem — ver o comentário dentro do bloco. */
  let pintaCobertura = null;
  /* ---------------- DECALQUE RECORTADO (public/img/decals) ----------------
     Pedido do dono (04/08): aplicar os recortes de `public/img/decals` "na textura de
     todos mapas onde faz sentido: laterais de prédios, portas, portões, carros, pilastras,
     paredes, armários etc" e "num tamanho MAIOR que os posters atuais".

     ── A INVERSÃO DE 04/08, e por que ela vale mais que o comentário que estava aqui ──
     A rodada anterior CONTEVE este mapa de propósito (14 peças) porque a versão temática
     deste salão ("Piscinão de Ramos", map_piscinao_ramos.js) tinha sido reprovada pelo dono com
     "é o pior mapa de todos. Muito poluído, não dá pra entender nada". O dono olhou o
     resultado contido e pediu o OPOSTO, explicitamente: "tem que encher de mais grafite,
     especialmente na piscina, em todas as pilastras, armários e paredes". Ele decide. As
     14 viraram ~66.

     O QUE A CONTENÇÃO ANTERIOR ACERTOU E CONTINUA VALENDO — poluição não é quantidade, é
     COMPETIÇÃO DE LEITURA. O que reprovou o pool_ramos foi mural COLORIDO grande no plano
     de fundo do duelo. Então o que entra aqui é PIXAÇÃO: traço preto sobre azulejo branco,
     que é o que existe em piscina pública de verdade, e que some atrás de uma silhueta em
     vez de brigar com ela (BAR-CONSISTENCIA §2.4). Nada de mural colorido, nada no piso,
     nada dentro do vão da piscina, nada no vidro da clarabóia.

     ONDE — as três superfícies que o dono nomeou, e uma banda nova:
       · PAREDES: a banda baixa (0,40-3,40 m) é a antiga e continua desviando dos 12
         cartazes; a banda ALTA (3,90-6,50 m) é nova e não podia colidir com nada, porque
         acima de 3,7 m só existe azulejo — é onde writer real empilha peça, e resolve o
         "encher a parede" sem mexer em uma vaga de cartaz sequer.
       · PILASTRAS: as 8 de concreto (x = ∓13,6). Elas levam LETRA, não tag: a face tem
         1,10 m e uma tag deitada (aspecto 1,3-1,5) sairia com 0,75 m de altura — some. Uma
         letra de alfabeto (aspecto ~0,7) sai com 1,36 m em pé, que é exatamente como uma
         coluna pichada se lê na vida real. É também o único uso bom que este pacote tem
         para as folhas de alfabeto, que em parede grande foram descartadas por sumirem.
       · ARMÁRIOS: os 6 bancos laterais levam 3 adesivos cada (um por porta) e os 8 bancos
         de respawn levam 1. Adesivo, não lambe-lambe: 1,0-1,25 m.
       · GUARITA do salva-vidas: as duas laterais (a frente tem vidro, e cartaz em vidro é
         justamente a reclamação nº 1 do dono).

     REGRAS (cada uma com defeito real atrás): pool por NOME via `decalIds` (índice desliza
     quando o gerador renumera — ver map_decals.js); `T.decals[i]` lido por ÍNDICE, que é
     getter memoizado (textures.js) e spread acordaria os 174 PNG de uma vez;
     `transparent: true`, senão o alpha vira retângulo preto no azulejo; `addPlane`, que NÃO
     empurra collider (decalque com colisor vira parede invisível — BUG-21, o ônibus da
     Brasília); `paredeAtras` antes de desenhar; 6-8 cm de afastamento; e escolha
     determinística por posição, porque o `botsim` é determinístico. */
  /* Os pools nascem DENTRO do bloco abaixo, mas a passada de grafite roda no fim do
     build (depois dos waypoints, que é de onde ela mira). `POOLS` é a única ponte —
     copiar as listas lá embaixo faria duas verdades sobre o mesmo pacote de arte. */
  let POOLS = null;
  {
    const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png',
      'tag-pingo.png', 'tag-selvagem.png', 'tags-treino-02.png', 'tags-treino-05.png', 'peca-bolha.png',
      'or-stencil-capivara.png', 'or-stencil-pomba.png']);   // originais versionados
    /* LETRA DE PILASTRA — e a RESOLUÇÃO é o critério, não o estilo. A 1ª captura desta
       rodada colocou `alfabeto-reto`/`alfabeto-gotico` na pilastra e a peça saiu como um
       borrão embaçado com franja clara: MEDIDO, esses recortes têm 22 a 47 px de lado (as
       folhas de origem são miniaturas de ~340 px, e uma letra é um pedacinho delas). Esticar
       25 px para 1,0 m é 25 px/m — o jogador passa a 1 m da pilastra no corredor e vê a
       interpolação, não a letra.
       Só três recortes de alfabeto têm resolução para isso: as duas folhas de letra-bolha
       (306×512 e 284×512) e o `alfabeto-grosso-01` (92×86). As duas primeiras são tinta CLARA
       (`claro: 1`), o que aqui é a favor e não contra: elas não vão no azulejo branco, vão no
       concreto cinza da pilastra, e bomba branca em coluna de concreto é o que existe. */
    const D_LETRA = decalIds(T, ['alfabeto-bolha.png', 'alfabeto-bolha2.png', 'alfabeto-grosso-01.png']);
    /* CARTAZ (o "pôster na pilastra" que o dono pediu). Vem do tipo `cartaz` do pacote —
       são os 7 únicos recortes RETRATO (aspecto 0,64-0,84) e os únicos que leem como papel
       colado e não como tinta. `decalsDoTipo` em vez de lista à mão porque cartaz novo no
       pacote tem que entrar sozinho (é a mesma lição do BUG-08: lista fixa ignora arquivo
       novo em silêncio) — e se o tipo não existir, o pool fica vazio e nada é desenhado. */
    const D_CARTAZ = (T.decalsDoTipo ? T.decalsDoTipo('cartaz') : []);
    /* BOMBA de parede: letra-bolha + peça, o "bombs" do pedido. Só vai na BANDA ALTA
       (acima de 3,90 m), onde não briga com a silhueta do inimigo no plano do duelo —
       a contenção que reprovou o pool_ramos continua valendo (BAR-CONSISTENCIA §2.4). */
    const D_BOMBA = decalIds(T, ['peca-bolha.png', 'alfabeto-bolha.png', 'alfabeto-bolha2.png',
      'alfabeto-grosso-01.png', 'tag-flop.png', 'tags-treino-04.png',
      'or-graf-treta.png', 'or-graf-coro.png']);   // originais versionados
    // adesivo de armário: peça pequena e fechada, que aguenta 1 m sem virar borrão
    const D_ADESIVO = decalIds(T, ['tags-treino-02.png', 'tags-treino-03.png', 'tags-treino-05.png',
      'tags-treino-06.png', 'tag-money.png', 'tag-selvagem.png', 'alfabeto-reto-05.png',
      'alfabeto-reto-07.png', 'alfabeto-grosso-01.png']);
    POOLS = { D_TAG, D_LETRA, D_CARTAZ, D_BOMBA, D_ADESIVO };
    const _dmix = (n) => { let v = (n * 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0; v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0; return (v ^ (v >>> 16)) >>> 0; };
    const _dmat = new Map(), _usados = [];
    /* raio da anti-repetição: 6 m, era 12 m. Com 66 peças num salão de 34 × 50 m, 12 m
       esgotava o pool em toda chamada e a busca caía sempre no mesmo primeiro índice —
       ou seja, o teto grande produzia MAIS repetição, não menos. */
    const decal = (pool, x, y0, z, ry, alt, larg) => {
      if (!T.decals || !T.decalAspects || !pool.length) return null;
      const k = _dmix(_dmix(Math.round(x * 10) + 9973) + Math.round(z * 10) * 131 + 7);
      let i = pool[k % pool.length];
      for (let t = 0; t < pool.length; t++) {
        const j = pool[(k + t) % pool.length];
        if (!_usados.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 6)) { i = j; break; }
      }
      const a = T.decalAspects[i] || 1;
      let h = alt, w = alt * a;
      if (w > larg) { w = larg; h = larg / a; }    // encolhe inteiro; NUNCA estica
      /* lambe em cima de lambe no MESMO plano lê como bug (audit: 29 pares > 50% em
         14/08): mesma parede, retângulos se mordendo → a vaga já tem dona, pula. */
      const nx = Math.sin(ry), nz = Math.cos(ry), lx = Math.cos(ry), lz = -Math.sin(ry);
      const yc = y0 + h / 2, sc = x * lx + z * lz, dc = x * nx + z * nz;
      if (_usados.some((u) => Math.abs(u.d - dc) < 0.3
        && Math.abs(u.s - sc) < (u.w + w) / 2 - 0.02
        && Math.abs(u.y - yc) < (u.h + h) / 2 - 0.02)) return null;
      // parede atrás ANTES de desenhar (map_decals.js) — sem sólido, não vira tinta
      /* `[root]` e não `colliders`: o critério mede a MALHA DESENHADA (map_decals.js). A
         lista de caixas declarava parede onde havia vão de piloti e onde havia vidro —
         as 72 peças daqui passam nos dois critérios, e é isso que prova que o novo não
         mata peça boa: medido antes 72, depois 72. */
      if (!paredeAtras([root], x, y0 + h / 2, z, ry, w, h)) return null;
      _usados.push({ i, x, z, w, h, y: yc, s: sc, d: dc });
      let m = _dmat.get(i);
      if (!m) {
        m = new THREE.MeshLambertMaterial({
          map: T.decals[i], transparent: true, alphaTest: 0.22,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        _dmat.set(i, m);
      }
      const q = addPlane(w, h, m, x, y0 + h / 2, z, ry);
      q.renderOrder = 2;
      q.name = 'decal:' + (T.decalFiles ? T.decalFiles[i] : i);
      esconderSeFaltar(q, T.decals[i]);   // PNG 404 em prod vira BRANCO CHAPADO se não sumir (ver graffiti_pass.esconderSeFaltar)
      return q;
    };
    const OFFD = 0.08;
    // --- BANDA BAIXA das 4 paredes (0,40-3,40): as 8 vagas medidas contra os 12 cartazes
    for (const x of [6, 15]) decal(D_TAG, x, 0.4, HALF_Z - OFFD, Math.PI, 3.0, 5.2);        // norte
    for (const x of [-16, 6]) decal(D_TAG, x, 0.4, -HALF_Z + OFFD, 0, 3.0, 5.2);            // sul
    for (const z of [-20, 9]) decal(D_TAG, -HALF_X + OFFD, 0.4, z, Math.PI / 2, 3.0, 5.2);  // oeste
    for (const z of [-9, 20]) decal(D_TAG, HALF_X - OFFD, 0.4, z, -Math.PI / 2, 3.0, 5.2);  // leste
    /* --- BANDA ALTA (3,90-6,50) — a que "enche a parede". Acima de 3,70 m não há cartaz,
       nem faixa azul, nem placa: o relógio (y 3,7-5,5 em x=-8) e o letreiro PISCINÃO
       (y 3,3-5,5 em x ∈ [3,9]) são os DOIS únicos objetos altos, os dois na parede norte,
       e por isso o norte leva 2 vagas e as outras três levam 5, 6 e 6. */
    for (const x of [-15, 15]) decal(D_TAG, x, 3.9, HALF_Z - OFFD, Math.PI, 2.6, 5.0);
    for (const x of [-14, -7, 0, 7, 14]) decal(D_TAG, x, 3.9, -HALF_Z + OFFD, 0, 2.6, 5.0);
    for (const z of [-21, -13, -5, 4, 13, 21]) decal(D_TAG, -HALF_X + OFFD, 3.9, z, Math.PI / 2, 2.6, 5.0);
    for (const z of [-21, -13, -4, 5, 13, 21]) decal(D_TAG, HALF_X - OFFD, 3.9, z, -Math.PI / 2, 2.6, 5.0);
    /* --- SEGUNDA FILEIRA DA BANDA ALTA (y 5,10-6,40) — "coloque mais graffitis" (05/08).
       É BOMBA (letra-bolha e peça), não tag: nesta altura a peça é vista de longe e de
       baixo, e letra fina some. Entra ENTRE as vagas da fileira de 3,90 (offset de meia
       vaga) pra ler como parede bombardeada em camadas, e não como grade. Fica ACIMA da
       linha do duelo, então não disputa leitura com a silhueta do inimigo. */
    for (const x of [-11, -3, 4, 11]) decal(D_BOMBA, x, 5.1, -HALF_Z + OFFD, 0, 1.3, 3.4);
    for (const x of [-19, 10]) decal(D_BOMBA, x, 5.1, HALF_Z - OFFD, Math.PI, 1.3, 3.4);
    for (const z of [-17, -9, 0, 9, 17]) decal(D_BOMBA, -HALF_X + OFFD, 5.1, z, Math.PI / 2, 1.3, 3.4);
    for (const z of [-17, -8, 1, 9, 17]) decal(D_BOMBA, HALF_X - OFFD, 5.1, z, -Math.PI / 2, 1.3, 3.4);
    /* --- CARTAZ NA PAREDE, na altura do olho: o lambe-lambe de vestiário. Vai nas vagas
       da banda baixa que sobraram entre os 12 cartazes de propaganda do mapa — por isso são
       poucas e escolhidas, e por isso passam pelo `paredeAtras` como qualquer outra. */
    for (const z of [-21, 16]) decal(D_CARTAZ, -HALF_X + OFFD, 0.9, z, Math.PI / 2, 1.7, 1.3);
    for (const z of [-21, 21]) decal(D_CARTAZ, HALF_X - OFFD, 0.9, z, -Math.PI / 2, 1.7, 1.3);
    for (const x of [-11, 11]) decal(D_CARTAZ, x, 0.9, -HALF_Z + OFFD, 0, 1.7, 1.3);
    /* PILASTRA, ARMÁRIO E GUARITA SÓ NASCEM ~150 LINHAS ABAIXO (bloco "COBERTURA"), e o
       `paredeAtras` mede a geometria que EXISTE no instante da chamada. Colar aqui devolvia
       null nas 42 peças, em silêncio — não é teoria: foi o que aconteceu na primeira
       versão desta rodada, e a régua acusou 26 em vez das ~66. Então a segunda leva vira
       função e é chamada no fim do bloco de cobertura. */
    pintaCobertura = () => {
      /* --- PILASTRAS: as 8 de concreto (1,10 m de face, 6,50 m de altura).
         PEDIDO LITERAL DO DONO (05/08): "pode pôr pôsteres na pilastra, e use também bombs
         e graffitis pra pôr nas paredes e pilastras, coloque mais graffitis".
         Então a pilastra deixou de ter 2 peças e passou a ter as QUATRO FACES usadas, com
         três linguagens diferentes — que é o que uma coluna de piscina pública tem:
           · face virada pra PISCINA  — TAG (fonte de 186-256 px, a única nítida a 1 m)
             + uma segunda TAG mais alta (y 2,9), porque writer empilha
           · face de z A              — BOMBA de letra (throw-up)
           · face de z B              — CARTAZ colado (o pôster que ele pediu)
           · face virada pra FORA     — CARTAZ ou TAG, alternado por pilastra
         O CARTAZ é o pool `cartaz` do pacote (7 recortes, aspecto 0,64-0,84 = RETRATO):
         numa face de 1,02 m ele sai com 1,3-1,6 m de altura, que é lambe-lambe de poste
         de verdade. Tag deitada (aspecto 1,3-1,5) na mesma face sairia com 0,7 m e sumiria
         — é a mesma conta que já tinha escolhido letra em vez de tag aqui. */
      for (const sx of [-1, 1]) for (const [n, pz] of [-17, -6.5, 6.5, 17].entries()) {
        const px = sx * 13.5;
        const dentro = sx > 0 ? -Math.PI / 2 : Math.PI / 2;      // face virada pra piscina
        decal(D_TAG, px - sx * 0.61, 1.35, pz, dentro, 1.1, 1.02);
        decal(D_TAG, px - sx * 0.61, 2.90, pz, dentro, 0.9, 1.02);
        // faces de z: bomba de um lado, cartaz do outro, alternando o lado por pilastra
        const s2 = n % 2 ? 1 : -1;
        decal(D_LETRA, px, s2 > 0 ? 0.75 : 1.5, pz + s2 * 0.61, s2 > 0 ? 0 : Math.PI, 1.9, 1.02);
        decal(D_CARTAZ, px, s2 > 0 ? 1.5 : 0.9, pz - s2 * 0.61, s2 > 0 ? Math.PI : 0, 1.55, 1.02);
        // face de fora (o corredor de trás): cartaz nas pares, tag nas ímpares
        decal(n % 2 ? D_TAG : D_CARTAZ, px + sx * 0.61, n % 2 ? 1.4 : 1.1, pz, sx > 0 ? Math.PI / 2 : -Math.PI / 2,
          n % 2 ? 1.1 : 1.6, 1.02);
      }
      /* --- ARMÁRIOS. Bancos laterais (x = ∓16,3, z = -11/0/11): 3 portas de 1,30 m ao
         longo de z, um adesivo em cada. A porta tem 2,10 m de altura, então o adesivo vai
         com 1,25 m — MENOR que o cartaz, e é o certo: o que se cola em porta de armário de
         vestiário é adesivo, não lambe-lambe de 3 m. */
      for (const sx of [-1, 1]) for (const bz of [-11, 0, 11]) for (const dz of [-1.3, 0, 1.3])
        decal(D_ADESIVO, sx * 16.19, 0.5, bz + dz, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 1.25, 1.05);
      /* Bancos de respawn (anteparos das faixas de nascimento): 1 adesivo por banco, na
         face virada pro CENTRO do salão — a outra fica de costas pro time que nasce ali. */
      for (const sz of [-1, 1]) {
        for (const bx of [-9, 9]) decal(D_ADESIVO, bx, 0.5, sz * (13.5 - 0.41), sz > 0 ? Math.PI : 0, 1.2, 1.05);
        for (const bx of [-3, 3]) decal(D_ADESIVO, bx, 0.5, sz * (14.2 - 0.41), sz > 0 ? Math.PI : 0, 1.2, 1.05);
        // GUARITA do salva-vidas (2,80 × 3,00 × 2,40): as duas laterais. A FRENTE tem o
        // vidro em z = ∓17,28 e decalque em vidro é a reclamação nº 1 do dono — não vai.
        for (const sx of [-1, 1]) decal(D_TAG, sx * 1.46, 0.45, sz * 19.6, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 1.9, 2.0);
      }

      /* ADENSAMENTO PROCEDURAL (dono, 07/08: "parede branca é desperdício — 70-80%
         das superfícies tomadas, clima urbano degradado"). As listas acima são vagas
         escolhidas; isto aqui varre as 4 paredes perimetrais em TRÊS faixas de altura
         (pixo embaixo, lambe/stencil no olho, bomb em cima) num passo de ~2,6 m com
         jitter e ~25% de respiro. Tudo passa no `paredeAtras`: porta, vidro e vão
         continuam limpos porque a peça sem sólido atrás morre antes de nascer. */
      {
        let ck = 31;
        const bandas = [
          [D_ADESIVO, 0.35, 1.2],
          [D_TAG, 0.5, 1.6],
          [D_CARTAZ, 1.0, 1.5],
          [D_BOMBA, 3.7, 1.35],
          [D_BOMBA, 5.1, 1.3],
        ];
        const paredes = [
          ['z', -HALF_X + OFFD, Math.PI / 2],
          ['z', HALF_X - OFFD, -Math.PI / 2],
          ['x', -HALF_Z + OFFD, 0],
          ['x', HALF_Z - OFFD, Math.PI],
        ];
        for (const [eixo, c, ry] of paredes) {
          const lim = (eixo === 'z' ? HALF_Z : HALF_X) - 2.2;
          for (let t = -lim; t <= lim; t += 2.6) {
            const k = _dmix(++ck * 733 + ((t * 8) | 0));
            if (k % 100 < 25) continue;   // o respiro
            const [pool, y0, alt] = bandas[k % bandas.length];
            if (!pool || !pool.length) continue;
            const jit = ((k >> 5) % 5 - 2) * 0.18;
            const x = eixo === 'z' ? c : t + jit;
            const z = eixo === 'z' ? t + jit : c;
            decal(pool, x, y0, z, ry, alt, 2.2);
          }
        }
      }
    };
  }

  /* ---------------- glass skylight roof (keeps it enclosed) ---------------- */
  {
    const oX = 10.5, oZ = 14;
    addBox(HALF_X * 2 + 2, 0.35, HALF_Z - oZ, MAT.ceil, 0, CEIL, (oZ + HALF_Z) / 2, { collide: false, cast: false });
    addBox(HALF_X * 2 + 2, 0.35, HALF_Z - oZ, MAT.ceil, 0, CEIL, -(oZ + HALF_Z) / 2, { collide: false, cast: false });
    addBox(HALF_X - oX, 0.35, oZ * 2, MAT.ceil, (oX + HALF_X) / 2, CEIL, 0, { collide: false, cast: false });
    addBox(HALF_X - oX, 0.35, oZ * 2, MAT.ceil, -(oX + HALF_X) / 2, CEIL, 0, { collide: false, cast: false });
    // translucent glass panel + beams over the opening
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(oX * 2, oZ * 2), new THREE.MeshLambertMaterial({ color: 0xcfe8f2, transparent: true, opacity: 0.35 }));
    glass.rotation.x = Math.PI / 2; glass.position.set(0, CEIL - 0.05, 0); root.add(glass);
    for (let z = -oZ; z <= oZ; z += 3.75) addBox(oX * 2, 0.2, 0.2, MAT.steel, 0, CEIL - 0.15, z, { collide: false, cast: false });
    for (const x of [-oX / 2, 0, oX / 2]) addBox(0.2, 0.2, oZ * 2, MAT.steel, x, CEIL - 0.15, 0, { collide: false, cast: false });
    const roofLogo = new THREE.MeshBasicMaterial({ map: signTexture('#1b3566', '#f6d24a', 'PISCINÃO', 'CLUBE DA TRETA'), side: THREE.DoubleSide });
    addPlane(14, 3.4, roofLogo, 0, CEIL + 0.22, 19.5, 0, -Math.PI / 2);
  }

  /* ---------------- spawns' end signage ---------------- */
  for (const s of [1, -1]) {
    const label = s < 0 ? signTexture('#c62f2f', '#ffffff', 'PETISTAS', 'VESTIÁRIO A') : signTexture('#1faa4d', '#ffd23f', 'BOLSONARISTAS', 'VESTIÁRIO B');
    addPlane(8, 2.4, label, 0, 4.4, (HALF_Z - 0.06) * s, s < 0 ? 0 : Math.PI);
  }

  /* ---------------- lockers: cover on the decks ---------------- */
  function lockerBank(x, z, n, along, ry = 0) {
    for (let i = 0; i < n; i++) {
      const bx = x + (along === 'x' ? (i - (n - 1) / 2) * 1.35 : 0);
      const bz = z + (along === 'z' ? (i - (n - 1) / 2) * 1.35 : 0);
      addBox(along === 'x' ? 1.3 : 0.7, 2.1, along === 'z' ? 1.3 : 0.7, MAT.locker, bx, 0, bz, { ry, pad: -0.02 });
      addBox(along === 'x' ? 0.95 : 0.08, 1.5, along === 'z' ? 0.95 : 0.08, MAT.lockerDark, bx, 0.3, bz + (along === 'x' ? 0.36 : 0), { collide: false });
    }
  }
  /* As CHAMADAS de lockerBank(), as espreguiçadeiras e os boxes de chuveiro saíram daqui e
     foram para o bloco "COBERTURA" mais abaixo, junto com pilares, lixeiras e o resto.
     Motivo em duas partes:
       1. TUDO junto é a única forma de garantir simetria PET × BOL por construção — espalhado
          em 4 blocos era exatamente como o mapa acabou com armário no meio do deck do BOL
          (z=18) e nas laterais do deck do PET (z=-19), que é a assimetria que a MAP2 media
          (exposição 0,6% em x=±6 no PET contra 69-73% no BOL, e o espelho no outro lado).
       2. ORDEM: o bloco de cobertura ficava DEPOIS da geração de waypoints. Ver o comentário
          lá embaixo — o A* não enxergava pilar, banco nem chuveiro. */

  /* ---------------- fy_ weapons: rows of guns on the deck ---------------- */
  const GM = { black: lam({ color: 0x1b1d21 }), steel: lam({ color: 0x9aa0a6 }), wood: lam({ color: 0x7a5326 }), tan: lam({ color: 0xb39a63 }), green: lam({ color: 0x16432a }) };
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  const cyl = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; };
  function buildGun(kind, x, z, yaw) {
    const g = new THREE.Group(); const add = (...ms) => ms.forEach(m => g.add(m));
    switch (kind) {
      case 'awp': add(box(0.11, 0.1, 1.35, GM.green, 0, 0.09, 0.05), box(0.11, 0.16, 0.36, GM.green, 0, 0.1, 0.6), cyl(0.05, 0.36, GM.black, 0, 0.19, 0.05), box(0.08, 0.18, 0.16, GM.black, 0, 0.03, -0.15)); break;
      case 'ak': add(box(0.1, 0.1, 1.05, GM.black, 0, 0.09, 0), box(0.11, 0.13, 0.34, GM.wood, 0, 0.1, 0.46), box(0.11, 0.12, 0.24, GM.wood, 0, 0.1, -0.12), box(0.09, 0.24, 0.14, GM.black, 0, -0.02, -0.02)); break;
      case 'm4': add(box(0.09, 0.1, 1.0, GM.black, 0, 0.09, 0), box(0.1, 0.14, 0.32, GM.black, 0, 0.1, 0.45), box(0.08, 0.06, 0.3, GM.black, 0, 0.17, 0.02), box(0.08, 0.2, 0.13, GM.black, 0, 0, -0.05)); break;
      case 'mp5': add(box(0.09, 0.11, 0.62, GM.black, 0, 0.09, 0), box(0.09, 0.1, 0.22, GM.black, 0, 0.09, 0.36), box(0.07, 0.22, 0.1, GM.black, 0, 0, -0.02)); break;
      case 'shotgun': add(box(0.1, 0.11, 1.0, GM.black, 0, 0.11, 0), box(0.1, 0.09, 0.9, GM.wood, 0, 0.02, 0.02), box(0.11, 0.15, 0.34, GM.wood, 0, 0.1, 0.5)); break;
      case 'deagle': add(box(0.09, 0.13, 0.4, GM.steel, 0, 0.1, 0), box(0.09, 0.2, 0.11, GM.tan, 0, 0.02, 0.15)); break;
      default: add(box(0.08, 0.12, 0.3, GM.black, 0, 0.09, 0), box(0.08, 0.16, 0.1, GM.black, 0, 0.03, 0.11));
    }
    g.position.set(x, 0.02, z); g.rotation.y = yaw; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(g); return g;
  }
  const RIFLES = ['awp', 'ak', 'm4', 'shotgun', 'mp5'];
  const place = (kind, x, z, yaw) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  let ri = 0;
  /* x = ±15,15: o MEIO da alameda das armas (pilar face ±14,05 · armário face ±16,25).
     Nenhuma arma saiu do chão (veto do dono); contagem inalterada desde o fy_ original. */
  for (const sx of [-1, 1]) { const x = sx * 15.15; for (const z of [-8, -4, 0, 4, 8]) place(RIFLES[ri++ % RIFLES.length], x, z, sx > 0 ? Math.PI / 2 : -Math.PI / 2); }
  for (const s of [-1, 1]) { const z = 21.8 * s; ['deagle', 'pistol', 'pistol', 'deagle'].forEach((k, i) => place(k, [-6, -2, 2, 6][i], z, s > 0 ? Math.PI : 0)); }
  /* As quatro do deck ficam entre a borda da piscina (z ±8,1) e o banco de respawn
     (z ±13,5): em (±3, ±16) elas caíam DENTRO do banco que protege a faixa x=±3. */
  place('awp', -7, 11.8, 0); place('ak', 7, 11.8, 0); place('m4', -7, -11.8, 0); place('shotgun', 7, -11.8, 0);

  /* ============ COBERTURA: RESPAWN E CORREDORES (pedido do dono, 04/08) ==================
     "no mapa da piscina precisamos de mais proteções especialmente no respawn, e o respawn
      tinha que ser maior, assim como os corredores laterais"

     POR QUE ESTE BLOCO ESTÁ AQUI E NÃO NO FIM DO ARQUIVO (que é onde ele estava):
     a geração de waypoints vem logo abaixo e trabalha em cima da lista `colliders`. Com o
     bloco de obstáculos DEPOIS dela, os nós e as arestas do A* eram calculados sobre um mapa
     que ainda não tinha pilar, banco de vestiário, chuveiro nem lixeira: o bot planejava rota
     ATRAVESSANDO essas peças e só descobria a peça no `_collide`, moendo contra ela. Subir o
     bloco é o conserto; é também a razão de qualquer peça nova ter que entrar AQUI.

     A RÉGUA QUE COBRA ISTO é a MAP5 (`tools/eval/map-check.mjs`): espaçamento médio entre
     peças de cobertura ≤ 7,0 m por quadrante, numa grade 4×4 sobre os bounds. Cada quadrante
     deste mapa tem ~100 m² andáveis, e √(100/d) ≤ 7 exige d ≥ 2,04 peças/100 m² — ou seja
     **≥ 3 peças por quadrante**, e é esse o número que dimensionou tudo abaixo. Antes: dois
     quadrantes com espaçamento 99 m (nenhuma peça) e o resto no máximo 10,05 m.

     NADA AQUI É GIRADO. `addBox` empurra um AABB e o motor não tem colisor rotacionado
     (BUG-21 do KNOWN-BUGS.md — o ônibus da Brasília a 31° criava parede invisível a 2,33 m
     da lataria). Peça girada exigiria decompor o colisor em grade; peça alinhada não. */
  const COV = {
    concreto: lam({ map: T.concrete }),          // 1 material para os 8 pilares (antes era 1 por pilar)
    caixa: lam({ color: 0x8fa3b3 }),
    lixo: lam({ color: 0x3a5a8f }),
    cabine: lam({ color: 0xd8d4cc }),
  };

  /* --- 1. CORREDORES (PB6: oeste 12,4 m > leste 10,1 m — piscina descentrada):
     promenade sem colisor · pilar · alameda das armas (x ±15,15) · armários. */
  for (const sx of [-1, 1]) {
    for (const pz of [-17, -6.5, 6.5, 17]) addBox(1.1, 6.5, 1.1, COV.concreto, sx * 13.5, 0, pz);
    for (const bz of [-11, 0, 11]) lockerBank(sx * 16.6, bz, 3, 'z');
    // caixas de material da piscina: cobertura de 1,15 m na alameda das armas (peito agachado)
    for (const cz of [-6, 6]) addBox(1.0, 1.15, 1.0, COV.caixa, sx * 15.2, 0, cz);
    // espreguiçadeiras: base é cover baixo de verdade (MAP1); encosto dentro da pegada.
    // Linha desigual de propósito: segue a borda da piscina, descentrada (BSP).
    for (const cz of [-9, -4.5, 4.5, 9]) {
      const cx = sx > 0 ? 11.6 : -10.6;
      addBox(0.85, 0.25, 1.9, MAT.chair, cx, 0.2, cz);
      const back = addBox(0.85, 0.85, 0.2, MAT.chair, cx, 0.2, cz - 0.85, { collide: false }); back.rotation.x = -0.5;
      occluders.push(back);   // encosto visível DENTRO do colisor da base: a bala tem que parar nele
    }
  }

  /* --- 2. RESPAWN: anteparos escalonados à frente de cada faixa (x ±9 em z ±13,5,
     x ±3 em z ±14,2 com folga 2,4 m do spawn, guarita em z ±19,6) — mata a visada
     axial sem emparedar (MAP2B ≥ 1,2; lições do loja_h em KNOWN-BUGS). */
  for (const sz of [-1, 1]) {
    for (const bx of [-9, 9]) lockerBank(bx, sz * 13.5, 3, 'x');
    for (const bx of [-3, 3]) lockerBank(bx, sz * 14.2, 3, 'x');
    addBox(2.8, 3.0, 2.4, MAT.wall, 0, 0, sz * 19.6);   // guarita do salva-vidas
    addBox(3.2, 0.25, 2.8, MAT.navy, 0, 3.0, sz * 19.6, { collide: false });
    addBox(2.5, 0.7, 0.06, lam({ color: 0x9fd4e6 }), 0, 1.5, sz * 18.38, { collide: false });
    for (const tx of [-10, 10]) addBox(0.9, 1.1, 0.9, COV.lixo, tx, 0, sz * 22.4);
    // boxes de chuveiro: um em cada canto (antes existiam só os dois do canto SE, e as chapas
    // da frente eram collide:false — dava pra atravessar a parede que se enxergava).
    for (const sx of [-1, 1]) {
      addBox(2.8, 2.6, 0.16, COV.cabine, sx * 15.3, 0, sz * 21.9);
      addBox(0.16, 2.6, 2.6, COV.cabine, sx * 13.9, 0, sz * 20.7);
      addBox(0.16, 2.6, 2.6, COV.cabine, sx * 16.7, 0, sz * 20.7);
      for (const d of [-0.7, 0.7]) addBox(0.4, 0.4, 0.18, MAT.steel, sx * (15.3 + d), 2.15, sz * (21.9 - 0.14), { collide: false });
    }
  }
  // AGORA pilastra, armário e guarita existem — só aqui o `paredeAtras` deles acha sólido.
  if (pintaCobertura) pintaCobertura();
  // blocos de partida: espelho exato dos pés da prancha (|z| = 13,7), para o deck do PET ter
  // a mesma peça que o do BOL nesse ponto. Sem isso o quadrante q1,0/q2,0 ficava com 1 peça
  // a menos que o q1,3/q2,3, o que a MAP5 lê como assimetria de cobertura.
  for (const bx of [-0.8, 0.8]) addBox(0.6, 0.75, 0.6, MAT.white, bx, 0, sZ - 1.7);

  /* --- 3. DENTRO DA PISCINA: divisórias submersas ------------------------------------
     A piscina é ANDÁVEL (1,5 m de fundo, rampa de 31°) e as três bandeiras de CTF caem
     dentro dela — mas ela não tinha uma única peça de cobertura. Na MAP5 isso aparecia como
     `prop 0×` / espaçamento 99 m em dois quadrantes inteiros; jogando, aparece como "quem
     pula na água morre".
     As muretas têm 1,00 m sobre um fundo em -1,50: topo em -0,50, ou seja 0,10 m ABAIXO da
     lâmina d'água (-0,40). Consequências que importam:
       · a silhueta do salão não muda — de pé no deck não se vê peça nova nenhuma, e a
         legibilidade limpa é a razão de este arquivo existir (ver cabeçalho);
       · `_collide` do game.js é ciente de Y (`pos.y+1.5 > c.minY && pos.y+0.3 < c.maxY`):
         com o jogador no deck (y=0) o teste 0,3 < -0,5 é FALSO, então isto NÃO vira parede
         invisível no deck. Só existe para quem está dentro da piscina (y=-1,5). */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addBox(2.6, 1.0, 0.55, MAT.pool, sx * 2.4 + POOL.cx, -POOL.depth, POOL.cz + sz * 2.9);
    addBox(0.55, 1.0, 2.6, MAT.pool, sx * 5.2 + POOL.cx, -POOL.depth, POOL.cz + sz * 1.5);
    addBox(2.6, 1.0, 0.55, MAT.pool, sx * 4.8 + POOL.cx, -POOL.depth, POOL.cz + sz * 3.4);
  }

  /* ---------------- lighting: bright, even, indoor ---------------- */
  setMapSky(scene, T, '/img/textures/sky_pool.webp', 0x9fd4ee);
  scene.fog = null;
  const hemi = new THREE.HemisphereLight(0xf2fbff, 0xb9c6d0, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 45, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 110; sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfeeff, 0.55);
  fill.position.set(-15, 35, 15); scene.add(fill);

  /* ---------------- ground height ---------------- */
  function groundHeightAt(x, z) { return poolDepth(x, z); }

  /* ---------------- waypoints (deck + rampas + fundo da piscina) ---------------- */
  const nodes = [], adj = [];
  const STEP = 3.4;
  const blocked = (x, z, inflate) => {
    const g = groundHeightAt(x, z);
    for (const c of colliders) {
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    }
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => {
    let prevY = groundHeightAt(a.x, a.z);
    for (let i = 1; i < 6; i++) {
      const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, 0.25)) return false;
      const y = groundHeightAt(x, z);
      if (Math.abs(y - prevY) > 0.40) return false;
      prevY = y;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) {
    adj.push([]);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz;
      if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j);
    }
  }
  function nearestWaypoint(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1);
    const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) {
      const n = q.shift();
      for (const m of adj[n]) if (prev[m] === -1) {
        prev[m] = n;
        if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; }
        q.push(m);
      }
    }
    return [fromIdx];
  }

  /* spawns z ±16,9 medidos do BSP (PB5: 33,8 m); bandeiras declaradas em ctfPoints. */
  const mk = s => [-9, -3, 3, 9].map(x => ({ x, z: SPAWN_Z * s, yaw: s < 0 ? 0 : Math.PI }));
  const spawns = { E: mk(-1), B: mk(1) };

  // Jogador e bots usam o mesmo chão, A* e penalidade dentro d'água.
  const slowAt = (x, z) => groundHeightAt(x, z) < -0.35;

  /* ═══ PASSADA DE GRAFITE (07/08) ══════════════════════════════════════════
     Reprovação do dono: "na piscina ainda tem muito muro e obstáculos e armários
     sem". A régua nova (`tools/eval/graffiti-census.mjs`, que mede NO NAVEGADOR)
     confirmou: 42,1% das placas de parede visíveis tinham arte — as 66 vagas à mão
     acima cobrem as 4 paredes grandes e param aí.
     A passada acha parede por raio a partir dos waypoints e pinta o que achar, então
     armário, pilastra, bloco de partida e mureta entram sem ninguém escrever
     coordenada. Ver `public/js/graffiti_pass.js` pro porquê de ser assado. */
  grafitar({
    id: 'piscina_treta',
    root, T, waypoints: nodes, seed: 7717, passo: 0.9, alcance: 9, cobre: 0.06, minLarg: 0.3,
    bandas: [
      /* CARTAZ DA COLEÇÃO (07/08). Reprovação: "tem diversos posters da minha coleção
         e tb que vc gerou que não estão em nenhum mapa". Eram 30 arquivos vivendo em
         2 dos 5 mapas, e mesmo nesses só ~6 entravam por rodada (a vaga era fixa).
         Aqui eles entram como lambe-lambe: banda do olho, tamanho de papel colado, e
         `chance` baixa de propósito — cartaz é tempero, parede de cartaz vira outdoor. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 28, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      // banda do olho: azulejo e concreto do deck — tag, cartaz e letra
      { y0: 0.3, y1: 2.5, larg: 3.4, alturas: [2.0, 1.5, 1.1, 0.8, 0.6],
        pool: POOLS.D_TAG.concat(POOLS.D_CARTAZ, POOLS.D_LETRA) },
      // banda alta das 4 paredes do salão: bomba, que é o que lê do outro lado da piscina
      { y0: 2.4, y1: 4.6, larg: 4.6, alturas: [2.2, 1.6, 1.1],
        pool: POOLS.D_BOMBA.concat(POOLS.D_TAG) },
      { y0: 4.5, y1: 7.4, larg: 4.8, alturas: [2.2, 1.5, 1.0], chance: 75,
        pool: POOLS.D_BOMBA },
      // resgate: canto de armário, pilastra fina, lateral de bloco de partida
      { y0: 0.3, y1: 2.9, larg: 1.6, alturas: [0.9, 0.7, 0.5, 0.38], planura: 0.5,
        pool: POOLS.D_ADESIVO.concat(POOLS.D_TAG) },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 53, separacao: 11 },
  });

  /* BUG-57 + frente map2/piscina: rato de vestiário, pombo de borda de piscina,
     PARDAL no beiral das guaritas (y 3,25) e caramelo passeando no deck sul. */
  const ambience = createFavelaAmbience(root, {
    map: 'piscina_treta',
    rats: [
      { pos: [-14, 0, -20], to: [-12, 0, -17.5], phase: .4 },
      { pos: [13.5, 0, 19], to: [11.5, 0, 21.5], phase: 1.6 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-13, 0, 10], phase: .3 }, { mode: 'ground', pos: [12, 0, -12], phase: 1.4 },
      { mode: 'ground', pos: [-11.8, 0, 9], phase: .8 },
    ],
    dogs: [{ pos: [-11.5, 0, -11], to: [-11.5, 0, -19], phase: .2 }],
    pardals: [
      { pos: [1.2, 3.25, 19.2], phase: .5 }, { pos: [-1.2, 3.25, -19.2], phase: 1.9 },
    ],
  });

  return {
    /* a água viva anda no relógio do jogo (game.js chama world.update?.(dt)) */
    update(dt) { aguaPiscina?.update(dt); },
    ambience,sound:{loops:[{src:AMB_LOOPS.piscina,pos:[1.1,-.4,1.1],radius:30,vol:.3},{src:AMB_LOOPS.hum,pos:[0,3,0],radius:40,vol:.18}],bioma:'indoor'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    /* CTF declarada em marcos do mapa (o fallback caía na água): triângulo 13 m, sem
       bandeira a <4,5 m de spawn. */
    ctfPoints: [
      { id: 'E', label: 'PARTIDA', x: 0, z: -13.5 },
      { id: 'MID', label: 'ARMÁRIOS', x: 13, z: 0 },
      { id: 'B', label: 'TRAMPOLIM', x: 0, z: 12 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
