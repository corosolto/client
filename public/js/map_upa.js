// UPA 24h da Treta: pronto-socorro 100% interno (paródia), salas em cruz no corredor central.
// E na recepção (sul-oeste), B na emergência (norte-leste). Colisão só AABB. Contrato build(scene, T).
import * as THREE from 'three';
import { placeProp, InstBatch, mergeParts } from './mapprops.js';
import { aoBoxGeo, aoMatFactory, VAO_BANDS, BASE_FLOATING, onGround } from './vao.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

export const UPA_PROPS = ['manequim', 'gondola_mercado', 'gondola_eletro', 'painel_tvs', 'caixa_cobranca', 'cooler', 'kombi'];

const HALF_X = 30, HALF_Z = 36, CEIL = 4.2, WH = 4.2, WT = 0.3, DH = 2.4;   // pé-direito 4,2 m; porta 2,4 m

function signTex(bg, fg, title, sub, W = 512, H = 160) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = W * 0.02; x.strokeRect(W * 0.015, H * 0.05, W * 0.97, H * 0.9);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  const pad = W * 0.08;
  const fit = (t, base, fam) => { let fs = base; x.font = `bold ${fs}px ${fam}`; while (x.measureText(t).width > W - pad && fs > 8) { fs -= 2; x.font = `bold ${fs}px ${fam}`; } };
  fit(title, H * 0.42, '"Arial Black",Impact,sans-serif'); x.fillText(title, W / 2, sub ? H * 0.4 : H * 0.5);
  if (sub) { fit(sub, H * 0.2, 'Arial,sans-serif'); x.fillText(sub, W / 2, H * 0.72); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildUpa(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  /* RepeatWrapping é PRÉ-REQUISITO da escala por metro: sem ele o escalaUVporMundo do
     vao.js:68 desiste e nenhuma UV é escalada. NearestFilter é a decisão de arte travada
     em textures.js:17. */
  const tex = (c, rx = 1, ry = null) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry === null ? rx : ry);
    return t;
  };
  /* Grão de pintura/plástico/aço, base BRANCA: o `color` de cada material continua sendo a
     paleta de antes e a superfície sai da conta de chapada (SUP1/SUP2). 128 px = 1,0 m. */
  const graoTex = (grao, W = 128, brush = false) => {
    const [c, x] = mkCanvas(W, W);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, W);
    x.fillStyle = grao;
    for (let k = 0; k < W * 3; k++) {
      const i = (k * 53) % W, j = (k * 97) % W;
      if (brush) x.fillRect(i, j, 6 + (k % 23), 1); else x.fillRect(i, j, 2, 2);
    }
    return tex(c);
  };

  // PISO vinílico TILÁVEL (placa de 0,25 m, veio, rejunte): 256 px = 2,0 m → 128 px/m.
  // Era UM plano de 60×72 m com o canvas da planta esticado a 17 px/m.
  function pisoTex() {
    const [c, x] = mkCanvas(256, 256);
    x.fillStyle = '#e4ded2'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 32) {
      x.fillStyle = (i / 32) % 2 ? '#ded7c9' : '#e8e2d6'; x.fillRect(i, 0, 31, 256);
      x.fillStyle = 'rgba(118,110,96,.12)';
      for (let k = 0; k < 46; k++) x.fillRect(i + 2 + ((k * 11) % 27), (k * 37) % 256, 1, 8);
    }
    x.strokeStyle = 'rgba(94,88,78,.20)'; x.lineWidth = 1;
    for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, 256); x.stroke(); }
    for (let j = 0; j <= 256; j += 128) { x.beginPath(); x.moveTo(0, j + .5); x.lineTo(256, j + .5); x.stroke(); }
    return tex(c);
  }
  /* PAREDE: o perfil inteiro de 4,2 m (rodapé · barra de choque de PVC a 0,90 m · faixa
     lilás · branco) num tile de 2,0 m de largura. 256×512 = 128 px/m na horizontal e
     122 px/m na vertical; era um canvas de 8×256 esticado, 4,4 px/m nas paredes de 21 m. */
  function wallTex() {
    const H = 512, [c, x] = mkCanvas(256, H);
    const v = (m) => H - (m / WH) * H;                                        // metro de parede → linha
    x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 256, H);                        // branco (topo)
    x.fillStyle = '#e8e2d4'; x.fillRect(0, v(1.55), 256, v(0.10) - v(1.55));  // creme (miolo)
    x.fillStyle = '#9aa0c8'; x.fillRect(0, v(1.60), 256, v(1.45) - v(1.60));  // faixa lilás
    x.fillStyle = '#c9ced5'; x.fillRect(0, v(1.02), 256, v(0.90) - v(1.02));  // barra de choque
    x.fillStyle = '#9b9fa6'; x.fillRect(0, v(1.02), 256, 2);
    x.fillStyle = '#5c4d3b'; x.fillRect(0, v(0.10), 256, H - v(0.10));        // rodapé de madeira
    x.fillStyle = 'rgba(150,146,138,.28)'; x.fillRect(0, 0, 2, v(0.10));      // junta de placa (2 m)
    x.fillStyle = 'rgba(140,134,124,.10)';
    for (let k = 0; k < 760; k++) x.fillRect((k * 53) % 256, (k * 199) % H, 2, 2);
    return tex(c);
  }
  /* FORRO acústico modular: placa de 0,50 m + junta de 1,5 cm + microperfuração e mancha de
     infiltração. 256 px = 2,0 m → 128 px/m. A junta é ESCURA de propósito: ela é uma fresta
     de sombra de 1,5 cm, e é o único traço que faz 8.719 m² de laje lerem como forro e não
     como chapa (a laje era `MAT.teto` cor chapada, 86,7% da área sem textura do mapa). */
  function forroTex() {
    const [c, x] = mkCanvas(256, 256);
    x.fillStyle = '#8b9298'; x.fillRect(0, 0, 256, 256);                      // junta (perfil T)
    for (let i = 0; i < 256; i += 64) for (let j = 0; j < 256; j += 64) {
      x.fillStyle = ((i + j) / 64) % 2 ? '#f0f3f4' : '#e2e7e9';
      x.fillRect(i + 2, j + 2, 60, 60);
      x.fillStyle = 'rgba(108,118,126,.22)';                                  // microperfuração
      for (let k = 0; k < 34; k++) x.fillRect(i + 6 + ((k * 17) % 50), j + 6 + ((k * 29) % 50), 2, 2);
      x.fillStyle = 'rgba(150,132,96,.16)';                                   // mancha de infiltração
      if (((i * 3 + j) / 64) % 5 === 0) x.fillRect(i + 10 + (j % 16), j + 8, 34, 26);
    }
    return tex(c);
  }
  // LUMINÁRIA de sobrepor: moldura + 2 tubos + aleta do difusor (1 peça por painel, não tila)
  function luzTex() {
    const [c, x] = mkCanvas(256, 256);
    x.fillStyle = '#d8dde2'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#eef2f6'; x.fillRect(12, 12, 232, 232);
    x.fillStyle = '#ffffff'; x.fillRect(34, 40, 188, 68); x.fillRect(34, 148, 188, 68);
    x.fillStyle = 'rgba(152,162,174,.5)';
    for (let i = 34; i < 222; i += 14) x.fillRect(i, 116, 7, 24);
    return tex(c);
  }
  // ARMÁRIO de melamina: 2 portas + puxador (tile de 1,0 m)
  function melaminaTex() {
    const [c, x] = mkCanvas(128, 128);
    x.fillStyle = '#f4f6f8'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(120,128,138,.28)'; x.fillRect(62, 6, 4, 116);
    x.strokeStyle = 'rgba(120,128,138,.22)'; x.lineWidth = 2; x.strokeRect(6, 6, 116, 116);
    x.fillStyle = '#aeb6bd'; x.fillRect(50, 58, 8, 22); x.fillRect(70, 58, 8, 22);
    x.fillStyle = 'rgba(130,138,148,.08)';
    for (let k = 0; k < 200; k++) x.fillRect((k * 37) % 128, (k * 61) % 128, 2, 2);
    return tex(c);
  }
  // TELA de equipamento: vidro escuro com scanline
  function telaTex() {
    const [c, x] = mkCanvas(128, 128);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(40,48,60,.35)';
    for (let j = 0; j < 128; j += 3) x.fillRect(0, j, 128, 1);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(8, 8, 112, 14);
    return tex(c);
  }
  // NEGATOSCÓPIO: caixa de luz com duas chapas foscas (sem imagem de corpo)
  function negatoTex() {
    const [c, x] = mkCanvas(256, 192);
    x.fillStyle = '#fbfdff'; x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#d9e2e8'; x.fillRect(16, 20, 104, 152); x.fillRect(136, 20, 104, 152);
    x.fillStyle = 'rgba(120,136,150,.35)';
    for (let k = 0; k < 60; k++) x.fillRect(20 + ((k * 23) % 96), 24 + ((k * 41) % 144), 6, 3);
    x.strokeStyle = '#9aa4ad'; x.lineWidth = 3; x.strokeRect(4, 4, 248, 184);
    return tex(c);
  }

  const GRAO = graoTex('rgba(58,62,68,.10)');                    // pintura / plástico
  const ESCOVADO = graoTex('rgba(66,72,80,.16)', 128, true);      // aço escovado
  const PANO = graoTex('rgba(176,188,200,.30)');                  // lençol / travesseiro
  const pisoSrc = pisoTex();
  const MAT = {
    parede: lam({ map: wallTex() }), paredeAlta: lam({ map: GRAO, color: 0xf2f0ea }),
    teto: lam({ map: forroTex() }), maca: lam({ map: PANO, color: 0xf2f5f7 }), aco: lam({ map: ESCOVADO, color: 0x9aa0a6 }),
    // travesseiro IÇADO do helper maca(): dentro dele eram 17 materiais distintos sem `map`
    travesseiro: lam({ map: PANO, color: 0xdfe6ec }),
    mesa: lam({ map: GRAO, color: 0xc9b896 }), cadeira: lam({ map: GRAO, color: 0x2f4a63 }), armario: lam({ map: melaminaTex() }),
    verde: lam({ map: GRAO, color: 0x3f9a86 }), vermelho: lam({ map: GRAO, color: 0xc0392b }),
    vidro: lam({ color: 0x9fd0e6, transparent: true, opacity: 0.4 }),
    negato: new THREE.MeshBasicMaterial({ map: negatoTex() }),
  };
  const LUZ = new THREE.MeshBasicMaterial({ map: luzTex() });
  const aoMat = aoMatFactory();

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    /* aoBoxGeo + aoMat: é o par que escala a UV por metro (vao.js:75) e grava a faixa de AO
       de contato. `base` explícito só para o forro, que é a fonte de luz do prédio. */
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const base = opts.base != null ? opts.base : (onGround(y, h) ? undefined : BASE_FLOATING);
    const geo = vao ? aoBoxGeo(w, h, d, { base }) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) {
      let hx = w / 2, hz = d / 2;
      if (opts.ry) { const cs = Math.abs(Math.cos(opts.ry)), sn = Math.abs(Math.sin(opts.ry)); hx = w / 2 * cs + d / 2 * sn; hz = w / 2 * sn + d / 2 * cs; }   // AABB gira com o mesh (senão o corpo entra na quina)
      colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz }); occluders.push(m);
    }
    return m;
  }
  const col = (x, z, hx, hz, h) => colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: h, minZ: z - hz, maxZ: z + hz });
  // occluder por MALHA, nunca Group: o raycast da bala não é recursivo (game.js:2611), então
  // Group na lista = prop que o corpo respeita e a bala atravessa.
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: 0, targetH, ry }); if (o) { root.add(o); o.traverse((m) => { if (m.isMesh) occluders.push(m); }); } if (hx) col(x, z, hx, hz, h); return o; }
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(w, h);
    const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); f.position.z = 0.02;
    const bk = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); bk.position.z = -0.02; bk.rotation.y = Math.PI;
    g.add(f, bk); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g;
  };
  // PAREDE ao longo de Z (em x fixo) com VÃOS de porta; verga acima da porta (não barra o player)
  function wallZ(x, z0, z1, doors = []) {
    let zc = z0; const ds = [...doors].sort((a, b) => a[0] - b[0]);
    for (const [d0, d1] of ds) { if (d0 > zc) addBox(WT, WH, d0 - zc, MAT.parede, x, 0, (zc + d0) / 2); addBox(WT, WH - DH, d1 - d0, MAT.paredeAlta, x, DH, (d0 + d1) / 2, { collide: false }); zc = d1; }
    if (z1 > zc) addBox(WT, WH, z1 - zc, MAT.parede, x, 0, (zc + z1) / 2);
  }
  // PAREDE ao longo de X (em z fixo) com vãos
  function wallX(z, x0, x1, doors = []) {
    let xc = x0; const ds = [...doors].sort((a, b) => a[0] - b[0]);
    for (const [d0, d1] of ds) { if (d0 > xc) addBox(d0 - xc, WH, WT, MAT.parede, (xc + d0) / 2, 0, z); addBox(d1 - d0, WH - DH, WT, MAT.paredeAlta, (d0 + d1) / 2, DH, z, { collide: false }); xc = d1; }
    if (x1 > xc) addBox(x1 - xc, WH, WT, MAT.parede, (xc + x1) / 2, 0, z);
  }
  const label = (txt, x, z, ry, cor = '#3f9a86') => signMesh(3.4, 0.7, signTex(cor, '#ffffff', txt, '', 512, 130), x, 3.1, z, ry);

  scene.background = new THREE.Color(0x14181c); scene.fog = null;
  /* PISO em 7 planos SEM SOBREPOSIÇÃO (não em 1 plano de 60×72): cada um leva um clone da
     MESMA textura com o `repeat` do seu tamanho, então a densidade é 128 px/m em todos e a
     cor de setor continua sendo a leitura de orientação do mapa. */
  const pisoMat = (w, d, cor) => { const t = pisoSrc.clone(); t.repeat.set(w / 2, d / 2); return lam({ map: t, color: cor }); };
  const setorCinza = pisoMat(26.5, 22, 0xcdd2d4), setorMeio = pisoMat(26.5, 28, 0xdad4c8);
  const chao = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  chao(26.5, 22, -16.75, -25, pisoMat(26.5, 22, 0xd2c6b1));    // RECEPÇÃO (tan)
  chao(26.5, 22, 16.75, -25, pisoMat(26.5, 22, 0xcfcabb));     // FARMÁCIA
  chao(26.5, 22, -16.75, 25, setorCinza);                      // ENFERMARIA
  chao(26.5, 22, 16.75, 25, setorCinza);                       // EMERGÊNCIA
  chao(26.5, 28, -16.75, 0, setorMeio); chao(26.5, 28, 16.75, 0, setorMeio);   // consultórios / triagem
  chao(7, HALF_Z * 2, 0, 0, pisoMat(7, 72, 0xdad4c8));         // corredor central
  /* CADA cor é o CAMINHO até um setor: desce o corredor na sua faixa e VIRA pra dentro da
     porta (x=∓3,5, z ∈ {-25, 0, 25}). Tira de 0,12 m a 12 mm do piso — desenhada no canvas
     do piso ela era uma linha de 3 px borrada em 60 m. */
  const faixaSrc = graoTex('rgba(0,0,0,.10)', 32);
  function faixa(cor, pts) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.12;
      const t = faixaSrc.clone(); t.repeat.set(0.48, len * 4);
      const q = chao(0.12, len, (x0 + x1) / 2, (z0 + z1) / 2, lam({ map: t, color: cor }), 0.012);
      q.rotation.z = Math.atan2(x1 - x0, z1 - z0);
    }
  }
  faixa(0x2f9e5e, [[-2.6, -33], [-2.6, -25], [-7, -25]]);   // verde  → RECEPÇÃO (oeste-sul)
  faixa(0x2f6fb0, [[-1.7, -33], [-1.7, 0], [-7, 0]]);       // azul   → CONSULTÓRIOS (oeste)
  faixa(0x8e44ad, [[-0.8, -33], [-0.8, 25], [-7, 25]]);     // roxo   → ENFERMARIA (oeste-norte)
  faixa(0xe0a92a, [[2.6, -33], [2.6, -25], [7, -25]]);      // amarelo→ FARMÁCIA (leste-sul)
  faixa(0xe07b2a, [[1.7, -33], [1.7, 0], [7, 0]]);          // laranja→ TRIAGEM / RAIO-X (leste)
  faixa(0xc0392b, [[0.8, -33], [0.8, 25], [7, 25]]);        // vermelho→ EMERGÊNCIA (leste-norte)
  addBox(HALF_X * 2, 0.3, HALF_Z * 2, MAT.teto, 0, CEIL, 0, { collide: false, cast: false, base: 1 });   // forro
  /* 56 painéis de luminária em 1 draw call (InstBatch) e 12 PointLight em vez de 56: 56 luzes
     dinâmicas num Lambert era o sombreamento mais caro do arquivo, e o painel é MeshBasic
     (auto-iluminado) — quem acende o forro é ele, não a luz pontual. */
  const IB = new InstBatch();
  const geoPainel = new THREE.PlaneGeometry(2.6, 2.6);
  const dummy = new THREE.Object3D(); dummy.rotation.x = Math.PI / 2;
  for (let x = -24; x <= 24; x += 8) for (let z = -30; z <= 30; z += 8) { dummy.position.set(x, CEIL - 0.05, z); IB.add(geoPainel, LUZ, dummy, null, { cast: false }); }
  for (const x of [-16, 0, 16]) for (const z of [-30, -14, 2, 18]) { const pl = new THREE.PointLight(0xf4f8ff, 0.22, 16, 2); pl.position.set(x, CEIL - 0.4, z); root.add(pl); }

  const wX = HALF_X - 0.4, wZ = HALF_Z - 0.4;
  // perímetro (entrada principal no sul)
  wallZ(-wX, -wZ, wZ); wallZ(wX, -wZ, wZ);
  wallX(-wZ, -wX, wX); wallX(wZ, -wX, wX);   // perímetro SÓLIDO (mapa interno, sem vão pro vazio)
  // portas de vidro (entrada sul · saída de ambulância norte): encostadas na face interna, sem buraco pro escuro
  const portaVidro = (z, sgn) => {
    const zf = z - sgn * 0.18;
    for (const px of [-3, 0, 3]) addBox(0.16, 2.5, 0.16, MAT.aco, px, 0, zf);
    addBox(6.3, 0.16, 0.16, MAT.aco, 0, 2.5, zf, { collide: false });
    for (const px of [-1.5, 1.5]) addBox(2.7, 2.4, 0.06, MAT.vidro, px, 0, zf, { collide: false });
  };
  portaVidro(-wZ, -1); portaVidro(wZ, 1);
  // (a faixa lilás + rodapé de madeira já vêm na textura da parede)
  // corredor central longitudinal (x = ∓3,5) com portas pras salas. A ponta SUL é
  // HALL aberto (sem parede em z < −23): sem isso, todo caminho B→E afunilava no
  // bico do corredor e a CTF2 via rota única.
  wallZ(-3.5, -wZ, wZ, [[-wZ, -23], [-2, 2], [23, 27]]);   // portas: hall sul · consultórios · enfermaria
  wallZ(3.5, -wZ, wZ, [[-wZ, -23], [-2, 2], [23, 27]]);    // portas: hall sul · triagem/raio-x · emergência
  // divisórias das salas (z = ∓14) nos dois lados, com passagem interna
  wallX(-14, -wX, -3.5, [[-24, -20]]); wallX(14, -wX, -3.5, [[-24, -20]]);   // oeste
  wallX(-14, 3.5, wX, [[20, 24]]); wallX(14, 3.5, wX, [[20, 24]]);           // leste
  // sub-divisória dos consultórios (oeste-meio) e triagem/raio-x (leste-meio)
  wallX(0, -wX, -3.5, [[-24, -21]]); wallX(0, 3.5, wX, [[21, 24]]);

  // largura 6 (não 9): senão as pontas do letreiro somem ATRÁS das paredes do corredor (x=∓3,5)
  signMesh(6, 1.5, signTex('#c0392b', '#ffffff', 'UPA 24H DA TRETA', 'PRONTO-SOCORRO', 640, 160), 0, 3.35, -wZ + 0.3, 0);
  label('RECEPÇÃO', -3.3, -25, Math.PI / 2); label('CONSULTÓRIOS', -3.3, 0, Math.PI / 2); label('ENFERMARIA', -3.3, 25, Math.PI / 2);
  label('FARMÁCIA', 3.3, -25, -Math.PI / 2, '#2f6fb0'); label('TRIAGEM', 3.3, 0, -Math.PI / 2, '#e0902a'); label('EMERGÊNCIA', 3.3, 25, -Math.PI / 2, '#c0392b');

  // móveis: todo helper sai com collider REAL — sem colisor, o corpo atravessa o móvel.
  const maca = (x, z, ry = 0) => { addBox(0.9, 0.7, 2.0, MAT.maca, x, 0.3, z, { ry }); addBox(0.7, 0.15, 0.5, MAT.travesseiro, x, 1.0, z + Math.cos(ry) * -0.7, { collide: false, ry }); };
  const soro = (x, z) => addBox(0.24, 1.5, 0.24, MAT.aco, x, 0, z);   // suporte de soro (poste)
  const mesa = (x, z, ry = 0) => { addBox(1.4, 0.75, 0.8, MAT.mesa, x, 0, z, { ry }); const cx = x + Math.sin(ry) * 0.85, cz = z + Math.cos(ry) * 0.85; addBox(0.5, 0.9, 0.5, MAT.cadeira, cx, 0, cz, { ry }); };   // mesa + cadeira (cadeira colide)
  const armario = (x, z, ry = 0) => { addBox(1.2, 1.9, 0.6, MAT.armario, x, 0, z, { ry }); addBox(1.24, 0.5, 0.62, MAT.verde, x, 1.9, z, { collide: false, ry }); };
  const biombo = (x, z, ry = 0) => addBox(0.12, 1.8, 2.2, MAT.armario, x, 0, z, { ry });   // divisória/esconderijo
  const planta = (x, z, ry = 0) => { addBox(0.5, 0.5, 0.5, MAT.armario, x, 0, z, { ry }); addBox(0.85, 1.0, 0.85, MAT.verde, x, 0.5, z, { collide: false, ry: ry * 1.7 }); };
  const banco = (x, z, ry = 0) => addBox(2.2, 0.5, 0.55, MAT.cadeira, x, 0, z, { ry });   // banco de espera (colide)
  /* fileira de cadeiras de espera: o col() da faixa é o bloqueador; os assentos são só visual
     (é por eles estarem DENTRO do col() que nenhuma célula andável fica debaixo de malha —
     MAP1). 44 cadeiras em 2 draw calls: assento e encosto entram no InstBatch.
     `eixoZ` separa a DIREÇÃO da fila do `ry`: sem isso um ry de 3° virava fila girada 90°. */
  const geoAssento = new THREE.BoxGeometry(0.55, 0.45, 0.55), geoEncosto = new THREE.BoxGeometry(0.55, 0.6, 0.08);
  const dInst = new THREE.Object3D();
  const cadeiras = (x, z, n, ry = 0, eixoZ = false) => {
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) * 0.7, dx = eixoZ ? 0 : t, dz = eixoZ ? t : 0;
      dInst.position.set(x + dx, 0.375, z + dz); dInst.rotation.set(0, ry, 0); IB.add(geoAssento, MAT.cadeira, dInst);
      dInst.position.set(x + dx - (eixoZ ? 0.24 : 0), 0.95, z + dz - (eixoZ ? 0 : 0.24));
      dInst.rotation.set(0, ry + (eixoZ ? Math.PI / 2 : 0), 0); IB.add(geoEncosto, MAT.cadeira, dInst);
    }
    col(x, z, eixoZ ? 0.4 : n * 0.35, eixoZ ? n * 0.35 : 0.4, 0.6);
  };

  const cyl = (r, h, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, o.seg || 16), mat); m.position.set(x, y + h / 2, z); if (o.rz) m.rotation.z = o.rz; if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; m.castShadow = o.cast !== false; m.receiveShadow = true; root.add(m); occluders.push(m); return m; };
  const MTELA = lam({ map: telaTex(), color: 0x0d1722 }), GLOW_G = new THREE.MeshBasicMaterial({ color: 0x35e07a }), GLOW_R = new THREE.MeshBasicMaterial({ color: 0xff5555 }), MRODA = lam({ map: GRAO, color: 0x15181c });
  // 44 rodízios de carrinho em 1 draw call; o `repeat` do clone põe a peça de 10 cm em
  // 128 px/m (sem ele a UV 0→1 de uma caixa de 10 cm dá 1.280 px/m e estoura o TEXEL3b).
  const rodaTex = GRAO.clone(); rodaTex.repeat.set(0.12, 0.12);
  const MRODA_LOTE = lam({ map: rodaTex, color: 0x15181c });
  const geoRodizio = new THREE.BoxGeometry(0.1, 0.14, 0.1);
  const caster = (x, z, ry, w, d) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) { dInst.position.set(x + sx * w, 0.07, z + sz * d); dInst.rotation.set(0, ry, 0); IB.add(geoRodizio, MRODA_LOTE, dInst, null, { cast: false }); } };
  // monitor de sinais vitais num carrinho (tela escura + traço de ECG verde)
  const monitor = (x, z, ry = 0) => { addBox(0.42, 0.9, 0.42, MAT.aco, x, 0.14, z, { ry }); caster(x, z, ry, 0.16, 0.16); addBox(0.5, 0.42, 0.12, MTELA, x, 1.06, z, { collide: false, ry }); addBox(0.4, 0.04, 0.13, GLOW_G, x, 1.09, z, { collide: false, ry }); col(x, z, 0.24, 0.24, 1.3); };
  // respirador/ventilador (gabinete alto + tela + traqueia)
  const respirador = (x, z, ry = 0) => { addBox(0.55, 1.2, 0.5, MAT.armario, x, 0.14, z, { ry }); caster(x, z, ry, 0.22, 0.18); addBox(0.46, 0.3, 0.1, MTELA, x, 1.42, z, { collide: false, ry }); addBox(0.36, 0.04, 0.11, GLOW_G, x, 1.45, z, { collide: false, ry }); cyl(0.04, 0.7, MRODA, x + 0.28, 0.9, z, { rz: 1.1, cast: false }); col(x, z, 0.3, 0.28, 1.6); };
  // carrinho de emergência vermelho (gavetas) com desfibrilador em cima
  const crashCart = (x, z, ry = 0) => { addBox(0.6, 0.95, 0.5, MAT.vermelho, x, 0.14, z, { ry }); caster(x, z, ry, 0.24, 0.18); for (let i = 0; i < 4; i++) addBox(0.62, 0.02, 0.52, MTELA, x, 0.32 + i * 0.18, z, { collide: false, ry }); addBox(0.42, 0.24, 0.34, MAT.aco, x, 1.11, z, { collide: false, ry }); addBox(0.3, 0.03, 0.1, GLOW_R, x, 1.24, z, { collide: false, ry }); col(x, z, 0.32, 0.28, 1.3); };
  // desfibrilador de bancada / DEA na parede
  const desfib = (x, y, z, ry = 0) => { addBox(0.4, 0.5, 0.16, lam({ map: GRAO, color: 0xe0b81a }), x, y, z, { collide: false, ry }); addBox(0.3, 0.04, 0.17, GLOW_R, x, y + 0.42, z, { collide: false, ry }); };
  // cadeira de rodas (rodas grandes de verdade)
  const cadeiraRodas = (x, z, ry = 0) => { addBox(0.5, 0.12, 0.5, MAT.aco, x, 0.42, z, { collide: false, ry }); addBox(0.5, 0.55, 0.06, MAT.aco, x, 0.5, z + Math.cos(ry) * -0.22 + Math.sin(ry) * 0, { collide: false, ry }); for (const s of [-1, 1]) cyl(0.28, 0.05, MRODA, x + Math.cos(ry) * s * 0.3, 0.28, z + Math.sin(ry) * s * 0.3, { rz: Math.PI / 2, ry, seg: 18, cast: false }); col(x, z, 0.34, 0.34, 0.9); };
  // balança com coluna e display
  const balanca = (x, z, ry = 0) => { addBox(0.5, 0.12, 0.62, MAT.aco, x, 0, z, { ry }); addBox(0.08, 1.05, 0.08, MAT.aco, x, 0.12, z - 0.26, { collide: false, ry }); addBox(0.32, 0.2, 0.1, MTELA, x, 1.2, z - 0.26, { collide: false, ry }); col(x, z, 0.28, 0.33, 0.9); };
  // cilindro de oxigênio verde no carrinho
  const cilindroO2 = (x, z) => { addBox(0.42, 0.1, 0.42, MAT.aco, x, 0, z, { collide: false }); cyl(0.14, 0.95, MAT.verde, x, 0.1, z); addBox(0.12, 0.16, 0.12, MAT.aco, x, 1.05, z, { collide: false }); col(x, z, 0.2, 0.2, 1.1); };
  // negatoscópio (visor de raio-x aceso na parede)
  const negato = (x, y, z, ry = 0) => addBox(0.95, 0.72, 0.06, MAT.negato, x, y, z, { collide: false, ry });

  addBox(6, 1.1, 1.0, MAT.armario, -18, 0, -17); addBox(6.2, 0.1, 1.1, MAT.mesa, -18, 1.1, -17, { collide: false });   // balcão
  // mureta de acrílico do guichê com vão de atendimento no meio (sobre o tampo do balcão)
  for (const sx of [-1, 1]) addBox(2.9, 0.9, 0.06, MAT.vidro, -18 + sx * 1.6, 1.2, -17, { collide: false });
  prop('caixa_cobranca', -15, -17, 1.1, Math.PI, 0.9, 0.5, 1.1);
  cadeiras(-24, -23, 4, 0.08); cadeiras(-24, -20, 4, -0.05);                            // espera oeste
  banco(-9, -24, 0.18); banco(-9, -21, -0.11);                                          // bancos perto da porta do corredor
  prop('painel_tvs', -28, -22, 2.0, -Math.PI / 2, 0.4, 1.0, 2.0);                      // TV da espera (senha)
  signMesh(2.2, 1.2, signTex('#111417', '#ff4d4d', 'G-042', 'GUICHÊ 3', 300, 260), -6, 2.4, -16, Math.PI / 2);   // senha eletrônica
  for (const [mx, mz] of [[-27, -25], [-6, -18], [-21, -24]]) prop('manequim', mx, mz, 1.8, mx % 2 ? 1 : -1, 0.3, 0.3, 1.8);   // pacientes esperando
  cadeiraRodas(-7, -27, 0.34); planta(-28, -33, 0.28); planta(-6, -33, 0.12);
  /* MOBÍLIA ENCOSTADA (MAP5): no hall as faixas x∈[-11;-4], x∈[+4;+11] e a boca do corredor
     x∈[-3,4;+3,4] são zona de NÃO-CONSTRUIR — medido, mobília solta ali derruba a CTF2 de
     2 rotas para 1. Tudo abaixo encosta na fachada de vidro ou na parede. */
  cadeiras(-19.0, -35.0, 5, 0.05); cadeiras(-12.5, -35.0, 5, 0.06); cadeiras(-6.0, -35.0, 5, -0.06);
  cadeiras(6.0, -35.0, 5, 0.07); cadeiras(12.5, -35.0, 5, -0.09); cadeiras(19.0, -35.0, 5, -0.05);
  cadeiras(-28.4, -29.0, 6, 0.14, true);                                                // fila contra a parede oeste
  maca(-4.3, -25.5, 0.05); maca(4.3, -25.5, -0.05);                                      // macas no corredor do hall (clichê BR)
  addBox(0.8, 0.12, 1.9, MAT.travesseiro, 4.3, 0.7, -25.5, { collide: false, ry: -0.05 });   // lençol de quem está esperando desde ontem
  armario(-13.2, -18.3, 0.22); armario(-28.6, -19.2, 0.08); armario(28.6, -19.2, -0.08);   // -18,3 (não -19,5): a 2 m da bandeira E
  addBox(0.6, 1.5, 0.6, MAT.aco, 14, 0, -19, { ry: 0.44 }); cyl(0.19, 0.46, MAT.vidro, 14, 1.5, -19);   // bebedouro + galão de 20 L
  prop('gondola_mercado', 28.4, -30.5, 1.9, 1.74, 1.05, 0.55, 1.9);                      // gôndola extra da farmácia

  maca(-25, -7, 0.07); soro(-23, -6); mesa(-9, -7, Math.PI + 0.56); armario(-27, -2, 0.36); biombo(-16, -7, 0.23); monitor(-21.2, -8.5, 0.09); negato(-29.3, 2.1, -7, Math.PI / 2);
  maca(-25, 7, 0.11); soro(-23, 8); mesa(-9, 7, Math.PI + 0.29); armario(-27, 12, 0.14); biombo(-16, 7, 0.33); monitor(-21.2, 5.5, 0.14); negato(-29.3, 2.1, 7, Math.PI / 2);
  /* ESTANTES DO EIXO DE PORTA DE SERVIÇO (x=∓22,5): é ESTE eixo que dava a linha de 70,5 m
     limpos do spawn, não o corredor — os vãos de z=-14/0/+14 estão todos em x∓(20..24).
     2,0 m é o mínimo: o olho está em 1,62 m, peça de 1,15 m não corta visada. */
  addBox(3.0, 2.0, 0.6, MAT.armario, -22.5, 0, -7.0, { ry: 0.10 }); addBox(3.0, 2.0, 0.6, MAT.armario, -22.5, 0, 7.0, { ry: -0.13 });
  addBox(3.0, 2.0, 0.6, MAT.armario, 22.5, 0, -7.0, { ry: -0.16 }); addBox(3.0, 2.0, 0.6, MAT.armario, 22.5, 0, 7.0, { ry: 0.12 });
  balanca(-12, -11, 0.51); cadeiraRodas(-12, 11, Math.PI + 0.43); prop('manequim', -21, -6, 1.8, 0, 0.3, 0.3, 1.8); planta(-6, 0, 0.45);

  for (const [mx, ry] of [[-26, 0.16], [-20, 0.21], [-14, 0.26], [-8, 0.30]]) { maca(mx, 22, ry); soro(mx + 1.0, 20.6); }
  for (const [mx, ry] of [[-26, 1.45], [-18, 0.35], [-10, 0.40]]) { maca(mx, 30, Math.PI + ry); soro(mx + 1.0, 31.6); }
  monitor(-23, 22, 0.18); monitor(-11, 22, 0.38); cilindroO2(-28, 26); cilindroO2(-6, 20); negato(-29.3, 2.1, 26, Math.PI / 2);
  prop('cooler', -28, 33, 1.3, 0, 0.8, 0.6, 1.2); biombo(-4.6, 26, 0.42); planta(-28, 17, 0.33);

  for (const gz of [-32, -28, -24, -20]) { prop('gondola_mercado', 11, gz, 1.9, Math.PI / 2, 1.05, 0.55, 1.9); prop('gondola_mercado', 22, gz, 1.9, Math.PI / 2, 1.05, 0.55, 1.9); }
  addBox(5, 1.1, 1.0, MAT.armario, 16, 0, -16); signMesh(2.4, 0.7, signTex('#2f6fb0', '#fff', 'RETIRE AQUI', '', 512, 150), 16, 2.0, -15.4, 0);
  cilindroO2(28, -18); cilindroO2(6, -14); planta(6, -33, 0.20); planta(28, -33, 0.55);

  mesa(10, -9, Math.PI + 0.68); armario(27, -11, -0.22); biombo(6, -9, 0.52); prop('manequim', 14, -6, 1.8, Math.PI, 0.3, 0.3, 1.8);   // triagem
  balanca(20, -6, 0.31); monitor(26, -7, 0.47); cadeiraRodas(8, -12, 0.58);
  addBox(2.0, 2.4, 1.4, MAT.armario, 24, 0, 8); addBox(1.4, 2.0, 0.9, MAT.aco, 22.2, 0, 8, { collide: false }); maca(16, 8, Math.PI / 2 + 0.44);   // raio-x
  negato(29.3, 2.1, 8, -Math.PI / 2); respirador(8, 11, 0.27); biombo(19, 10, 0.61); label('RAIO-X', 12, 12, -Math.PI / 2, '#e0902a'); planta(6, 8, 0.38);

  for (const [mx, ry, rm] of [[8, 0.49, 0.56], [14, 0.54, 0.65], [20, 0.59, 0.79]]) { maca(mx, 22, ry); soro(mx + 1.0, 20.6); monitor(mx - 1.2, 22, rm); }
  crashCart(24, 22, 0.17); respirador(4.6, 20, 0.37); desfib(29.2, 1.7, 22, -Math.PI / 2);
  addBox(4, 1.0, 1.5, MAT.armario, 27, 0, 18); biombo(6, 26, 0.70); prop('gondola_eletro', 26, 16, 1.9, 0, 1.05, 0.55, 1.9);
  cadeiraRodas(8, 27, 0.24);
  prop('manequim', 22, 26, 1.8, 1, 0.3, 0.3, 1.8); planta(6, 33, 0.60); planta(28, 33, 0.15);
  signMesh(3.4, 1.0, signTex('#c0392b', '#fff', 'CADÊ O MÉDICO?', '', 512, 200), 14, 2.6, wZ - 0.5, Math.PI);

  /* POSTO DE ENFERMAGEM no miolo do corredor: mata a reta de 70 m de (-2,-35) a (-2,35) e
     deixa 1,14 m de passagem de cada lado (o corpo tem 0,76 m). O balcão de fórmica avança
     31 cm além do colisor — menos que o raio do corpo, então nenhuma célula andável fica
     debaixo dele (MAP1). */
  addBox(3.4, 2.3, 4.4, MAT.armario, 0, 0, 0, { ry: 0.26 });
  addBox(3.9, 0.1, 4.9, MAT.mesa, 0, 1.1, 0, { collide: false, ry: 0.26 });
  for (const [mx, ry, bz] of [[-20, 0.13, 0.26], [-8, 0.19, -0.14], [8, 0.24, 0.31], [20, 0.29, -0.20]]) { maca(-2.6, mx, ry); banco(2.6, mx + 3, Math.PI / 2 + bz); }
  for (const [cz, ry] of [[-28, 0.25], [-2, 0.42], [14, 0.50], [28, 0.65]]) planta(cz % 4 ? 2.7 : -2.7, cz, ry);
  // placa de setor suspensa sobre o cruzamento (usa o signTex que já existe)
  signMesh(3.2, 0.45, signTex('#2f6fb0', '#fff', '← CONSULTÓRIOS · TRIAGEM →', '', 640, 96), 0, 2.9, -9, 0);
  signMesh(3.2, 0.45, signTex('#c0392b', '#fff', '← ENFERMARIA · EMERGÊNCIA →', '', 640, 96), 0, 2.9, 9, 0);

  const avisos = [['TEMPO DE ESPERA', '8 HORAS'], ['AGUARDE', 'SUA VEZ'], ['SEM MÉDICO', 'DE PLANTÃO'], ['FALTA', 'REMÉDIO']];
  avisos.forEach(([t, s], i) => signMesh(2.6, 1.0, signTex('#e0b81a', '#1a1a1a', t, s, 512, 200), 0, 2.6, [-14, -4, 8, 18][i], (i % 2) ? 0 : Math.PI));

  /* BRASILIDADE — fila de balizador, cartaz de campanha, ventilador de parede, quadro de
     cortiça, cadeira de plástico monobloco e a Kombi-ambulância da doca. Tudo em InstBatch
     ou prop do catálogo: nenhum asset novo. */
  signMesh(1.2, 0.8, signTex('#f2c200', '#12301f', 'VACINE-SE', 'CAMPANHA DE INVERNO', 384, 256), -29.3, 2.0, -24, Math.PI / 2);
  signMesh(1.2, 0.8, signTex('#1e5fa8', '#fff', 'ATENDIMENTO', 'É SEU DIREITO', 384, 256), 29.3, 2.0, -24, -Math.PI / 2);
  prop('painel_tvs', 28, -24, 2.0, Math.PI / 2, 0.4, 1.0, 2.0);                          // 2ª TV (jornal da tarde)
  { const g = new THREE.PlaneGeometry(1.6, 1.0); const m = new THREE.Mesh(g, lam({ map: T.corkboard })); m.position.set(-29.28, 1.9, -30); m.rotation.y = Math.PI / 2; root.add(m); }   // quadro de avisos
  /* fila de balizador de fita retrátil: colisor REAL (barreira de fila barra mesmo), 1 draw
     call. Fita de 3 cm, grade e haste do ventilador ficam SEM `map` de propósito: peça
     instanciada não passa pelo aoBoxGeo e uma UV 0→1 nessa escala mede 38 px/m — abaixo da
     banda. Cor lisa sai da conta de densidade e entra na de área chapada, que sobra. */
  const MFITA = lam({ color: 0xc0392b }), MGRADE = lam({ color: 0x9aa0a6 });
  const MFERRO = lam({ map: ESCOVADO, color: 0x9aa0a6 });
  const MPLAST = lam({ map: (() => { const t = GRAO.clone(); t.repeat.set(0.45, 0.45); return t; })(), color: 0xf0f2f4 });
  const geoBaliza = new THREE.CylinderGeometry(0.045, 0.16, 1.0, 10);
  const geoFita = new THREE.BoxGeometry(0.03, 0.05, 1);
  const dz2 = new THREE.Object3D();
  const FILA = [[-8.5, -31.5], [-6.5, -30.0], [-8.5, -28.5], [-6.5, -27.0], [-4.5, -31.0], [-4.5, -28.0]];
  for (const [bx, bz] of FILA) { dz2.position.set(bx, 0.5, bz); dz2.rotation.set(0, 0, 0); dz2.scale.setScalar(1); IB.add(geoBaliza, MFERRO, dz2); col(bx, bz, 0.06, 0.06, 1.0); }
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [4, 5]]) {
    const [x0, z0] = FILA[a], [x1, z1] = FILA[b], len = Math.hypot(x1 - x0, z1 - z0);
    dz2.position.set((x0 + x1) / 2, 0.86, (z0 + z1) / 2); dz2.rotation.set(0, Math.atan2(x1 - x0, z1 - z0), 0); dz2.scale.set(1, 1, len);
    IB.add(geoFita, MFITA, dz2, null, { cast: false });
  }
  dz2.scale.setScalar(1);
  // ventilador de parede oscilante (grade + haste), 2 unidades em lote
  const geoGrade = new THREE.CylinderGeometry(0.225, 0.225, 0.07, 14), geoHaste = new THREE.BoxGeometry(0.07, 0.07, 0.3);
  for (const vx of [-14, 14]) {
    dz2.position.set(vx, 2.6, -35.05); dz2.rotation.set(Math.PI / 2, 0, 0); IB.add(geoGrade, MGRADE, dz2, null, { cast: false });
    dz2.position.set(vx, 2.6, -35.25); dz2.rotation.set(0, 0, 0); IB.add(geoHaste, MGRADE, dz2, null, { cast: false });
  }
  /* cadeira de plástico monobloco: 8 unidades, 8 ângulos, 1 draw call. Colisor real — sem
     ele o corpo atravessa a cadeira E a sonda do MAP1 acha corpo dentro de sólido. */
  const geoMono = mergeParts([
    new THREE.BoxGeometry(0.45, 0.05, 0.45).translate(0, 0.42, 0),
    new THREE.BoxGeometry(0.42, 0.42, 0.05).translate(0, 0.64, -0.2),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.BoxGeometry(0.04, 0.42, 0.04).translate(sx * 0.19, 0.21, sz * 0.19))),
  ]);
  for (const [cx, cz, ry] of [[-22.5, -29.8, 0.12], [-16.2, -27.4, 0.31], [-25.5, -12.8, 0.45], [-13.0, -11.5, 0.58],
    [10.5, -12.5, 0.22], [24.5, -4.5, 0.66], [-8.5, 20.5, 0.37], [18.5, 26.5, 0.51]]) {
    dz2.position.set(cx, 0, cz); dz2.rotation.set(0, ry, 0); IB.add(geoMono, MPLAST, dz2); col(cx, cz, 0.26, 0.26, 0.85);
  }
  // Kombi-ambulância na doca do norte (paródia: sem sigla nem marca protegida)
  prop('kombi', 0, 32.4, 2.0, Math.PI / 2 + 0.26, 1.6, 2.6, 2.0);
  signMesh(1.8, 0.5, signTex('#ffffff', '#c0392b', 'AMBULÂNCIA 199', '', 512, 142), 0, 2.5, 29.6, Math.PI);
  /* O lote nasce InstancedMesh visível e FORA de `occluders`: sem isto a bala atravessa o
     prop que o corpo respeita (BUG-54, cláusula atravessa-parede). */
  const preLote = new Set(root.children);
  IB.build(root);
  for (const c of root.children) if (!preLote.has(c) && c.isInstancedMesh) occluders.push(c);

  const GM = { black: lam({ color: 0x1b1d21 }), steel: lam({ color: 0x9aa0a6 }), wood: lam({ color: 0x7a5326 }), tan: lam({ color: 0xb39a63 }), green: lam({ color: 0x16432a }) };
  const gbox = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  const gcyl = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; };
  function buildGun(kind, x, z, yaw) {
    const g = new THREE.Group(); const add = (...ms) => ms.forEach(m => g.add(m));
    switch (kind) {
      case 'awp': add(gbox(0.11, 0.1, 1.35, GM.green, 0, 0.09, 0.05), gbox(0.11, 0.16, 0.36, GM.green, 0, 0.1, 0.6), gcyl(0.05, 0.36, GM.black, 0, 0.19, 0.05)); break;
      case 'ak': add(gbox(0.1, 0.1, 1.05, GM.black, 0, 0.09, 0), gbox(0.11, 0.13, 0.34, GM.wood, 0, 0.1, 0.46), gbox(0.09, 0.24, 0.14, GM.black, 0, -0.02, -0.02)); break;
      case 'm4': add(gbox(0.09, 0.1, 1.0, GM.black, 0, 0.09, 0), gbox(0.1, 0.14, 0.32, GM.black, 0, 0.1, 0.45), gbox(0.08, 0.2, 0.13, GM.black, 0, 0, -0.05)); break;
      case 'mp5': add(gbox(0.09, 0.11, 0.62, GM.black, 0, 0.09, 0), gbox(0.09, 0.1, 0.22, GM.black, 0, 0.09, 0.36), gbox(0.07, 0.22, 0.1, GM.black, 0, 0, -0.02)); break;
      case 'shotgun': add(gbox(0.1, 0.11, 1.0, GM.black, 0, 0.11, 0), gbox(0.1, 0.09, 0.9, GM.wood, 0, 0.02, 0.02), gbox(0.11, 0.15, 0.34, GM.wood, 0, 0.1, 0.5)); break;
      case 'deagle': add(gbox(0.09, 0.13, 0.4, GM.steel, 0, 0.1, 0), gbox(0.09, 0.2, 0.11, GM.tan, 0, 0.02, 0.15)); break;
      default: add(gbox(0.08, 0.12, 0.3, GM.black, 0, 0.09, 0), gbox(0.08, 0.16, 0.1, GM.black, 0, 0.03, 0.11));
    }
    g.position.set(x, 0.02, z); g.rotation.y = yaw; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(g); return g;
  }
  const place = (kind, x, z, yaw = 0) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  const ARSENAL = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  ARSENAL.forEach((k, i) => place(k, -25 + i * 3, -34, 0));    // recepção (Time E), faixa junto à parede sul
  ARSENAL.forEach((k, i) => place(k, 25 - i * 3, 34, Math.PI)); // emergência (Time B), faixa junto à parede norte
  place('ak', -1.6, 3, 0); place('m4', 1.6, -3, 0);            // disputadas no cruzamento central

  const hemi = new THREE.HemisphereLight(0xf4f8ff, 0xb8c0c8, 1.45); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.95);
  sun.position.set(6, 30, -8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -36; sun.shadow.camera.right = 36; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.camera.far = 90; sun.shadow.bias = -0.0004; scene.add(sun);

  const groundHeightAt = () => 0;
  const slowAt = () => false;

  const nodes = [], adj = [];
  const STEP = 2.8;
  const blocked = (x, z, inflate) => { for (const c of colliders) if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15) return true; return false; };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP) for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP) if (!blocked(gx, gz, 0.45)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.22)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz; if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1); const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) { const n = q.shift(); for (const m of adj[n]) if (prev[m] === -1) { prev[m] = n; if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; } q.push(m); } }
    return [fromIdx];
  }

  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-selvagem.png', 'or-graf-treta.png', 'or-graf-coro.png']);
  grafitar({
    id: 'upa_treta', root, T, waypoints: nodes, seed: 7373, passo: 2.2, alcance: 6, cobre: 0.04, minLarg: 0.35,
    bandas: [
      { y0: 0.6, y1: 2.6, larg: 2.2, alturas: [1.4, 1.0, 0.7], chance: 38, pool: D_TAG },
      { y0: 0.9, y1: 2.4, larg: 1.6, alturas: [1.2, 0.9], chance: 16, fonte: 'poster', pool: (T.posterFiles || []).map((_, i) => i) },
    ],
  });

  const spawns = {
    E: [-25, -20, -15, -10].map(x => ({ x, z: -31, yaw: 0 })),
    B: [10, 15, 20, 25].map(x => ({ x, z: 31, yaw: Math.PI })),
  };

  /* BUG-57: UPA é interna — rato de corredor, sem pombo (não há céu). */
  const ambience = createFavelaAmbience(root, {
    map: 'upa_24h',
    rats: [
      { pos: [-20, 0, -28], to: [-17.5, 0, -25.5], phase: .3 },
      { pos: [20, 0, 28], to: [17.5, 0, 25.5], phase: 1.4 },
      { pos: [-3, 0, 2], to: [-.5, 0, 4.5], phase: 2.3 },
    ],
    pigeons: [],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.hum,pos:[0,3,0],radius:45,vol:.22}],bioma:'indoor'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    /* MID fora da diagonal E–B (senão o triângulo é colinear e a régua reprova): puxado pro
       sul do corredor. E e B saíram de (∓18,∓28) — 3,61 m do PRÓPRIO spawn, piso 9 m — e
       foram para dentro da ala. MEDIDO: em (∓16,∓20) o par E→B cai para 1 rota separada
       (CTF2 reprova); (∓14,∓20) com MID em (0,-11) dá 2 rotas em todos os 6 pares,
       distSpawn 11,05 m e triângulo de 6,31 m. */
    ctfPoints: [
      { id: 'E', label: 'RECEPÇÃO', x: -14, z: -20 },
      { id: 'MID', label: 'CORREDOR', x: 0, z: -11 },
      { id: 'B', label: 'EMERGÊNCIA', x: 14, z: 20 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 1, maxX: HALF_X - 1, minZ: -HALF_Z + 1, maxZ: HALF_Z - 1 },
  };
}
