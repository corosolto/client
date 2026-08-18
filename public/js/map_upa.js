// UPA 24h da Treta: pronto-socorro 100% interno (paródia), salas em cruz no corredor central.
// E na recepção (sul-oeste), B na emergência (norte-leste). Colisão só AABB. Contrato build(scene, T).
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';

export const UPA_PROPS = ['manequim', 'gondola_mercado', 'gondola_eletro', 'painel_tvs', 'caixa_cobranca', 'cooler'];

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
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // PISO: vinílico creme com ladrilho + tons por setor + FAIXAS coloridas de sinalização no chão
  function floorTex() {
    const W = 1024, H = 1229;                                   // aspecto 60:72
    const [c, x] = mkCanvas(W, H);
    const px = (wx) => (wx + HALF_X) / (HALF_X * 2) * W, py = (wz) => (wz + HALF_Z) / (HALF_Z * 2) * H;
    x.fillStyle = '#dad4c8'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d2c6b1'; x.fillRect(0, 0, px(-3.5), py(-14));            // recepção (tan)
    x.fillStyle = '#cdd2d4'; x.fillRect(0, py(14), px(-3.5), H);            // enfermaria (cinza)
    x.fillStyle = '#cdd2d4'; x.fillRect(px(3.5), py(14), W - px(3.5), H);   // emergência (cinza)
    x.fillStyle = '#cfcabb'; x.fillRect(px(3.5), 0, W - px(3.5), py(-14));  // farmácia
    x.strokeStyle = 'rgba(120,120,120,.16)'; x.lineWidth = 1;               // ladrilho ~1,2 m
    for (let wx = -HALF_X; wx <= HALF_X; wx += 1.2) { x.beginPath(); x.moveTo(px(wx), 0); x.lineTo(px(wx), H); x.stroke(); }
    for (let wz = -HALF_Z; wz <= HALF_Z; wz += 1.2) { x.beginPath(); x.moveTo(0, py(wz)); x.lineTo(W, py(wz)); x.stroke(); }
    // CADA cor é o CAMINHO até um setor: desce o corredor na sua faixa e VIRA pra dentro da porta
    // (portas do corredor em x=∓3,5, z ∈ {-25, 0, 25}). Fina e sem cruzar parede.
    const linha = (cor, pts) => { x.strokeStyle = cor; x.lineWidth = 3; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(px(a), py(b)) : x.moveTo(px(a), py(b))); x.stroke(); };
    linha('#2f9e5e', [[-2.6, -33], [-2.6, -25], [-7, -25]]);   // verde  → RECEPÇÃO (oeste-sul)
    linha('#2f6fb0', [[-1.7, -33], [-1.7, 0], [-7, 0]]);       // azul   → CONSULTÓRIOS (oeste)
    linha('#8e44ad', [[-0.8, -33], [-0.8, 25], [-7, 25]]);     // roxo   → ENFERMARIA (oeste-norte)
    linha('#e0a92a', [[2.6, -33], [2.6, -25], [7, -25]]);      // amarelo→ FARMÁCIA (leste-sul)
    linha('#e07b2a', [[1.7, -33], [1.7, 0], [7, 0]]);          // laranja→ TRIAGEM / RAIO-X (leste)
    linha('#c0392b', [[0.8, -33], [0.8, 25], [7, 25]]);        // vermelho→ EMERGÊNCIA (leste-norte)
    return tex(c);
  }
  // PAREDE: perfil vertical bicolor (rodapé escuro · creme · faixa lilás na altura do peito · branco)
  function wallTex() {
    const H = 256, [c, x] = mkCanvas(8, H);
    x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 8, H);                        // branco (topo)
    x.fillStyle = '#e8e2d4'; x.fillRect(0, H * 0.78, 8, H * 0.19);         // creme (miolo)
    x.fillStyle = '#9aa0c8'; x.fillRect(0, H * 0.74, 8, H * 0.05);         // faixa lilás (peito ~1 m)
    x.fillStyle = '#5c4d3b'; x.fillRect(0, H * 0.97, 8, H * 0.03);         // rodapé de madeira
    return tex(c);
  }

  const MAT = {
    piso: lam({ map: floorTex() }), parede: lam({ map: wallTex() }), paredeAlta: lam({ color: 0x776f66 }),
    teto: lam({ color: 0x798089 }), maca: lam({ color: 0xf2f5f7 }), aco: lam({ color: 0x9aa0a6 }),
    mesa: lam({ color: 0xc9b896 }), cadeira: lam({ color: 0x2f4a63 }), armario: lam({ color: 0xd6dbe0 }),
    verde: lam({ color: 0x3f9a86 }), vermelho: lam({ color: 0xc0392b }), vidro: lam({ color: 0x9fd0e6, transparent: true, opacity: 0.4 }),
  };
  const LUZ = new THREE.MeshBasicMaterial({ color: 0xfbfdff });

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: 0, targetH, ry }); if (o) { root.add(o); occluders.push(o); } if (hx) col(x, z, hx, hz, h); return o; }
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2), MAT.piso); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  addBox(HALF_X * 2, 0.3, HALF_Z * 2, MAT.teto, 0, CEIL, 0, { collide: false, cast: false });   // laje do teto
  for (let x = -24; x <= 24; x += 8) for (let z = -30; z <= 30; z += 8) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), LUZ); p.rotation.x = Math.PI / 2; p.position.set(x, CEIL - 0.05, z); root.add(p); const pl = new THREE.PointLight(0xf4f8ff, 0.22, 16, 2); pl.position.set(x, CEIL - 0.4, z); root.add(pl); }

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
  const maca = (x, z, ry = 0) => { addBox(0.9, 0.7, 2.0, MAT.maca, x, 0.3, z, { ry }); addBox(0.7, 0.15, 0.5, lam({ color: 0xdfe6ec }), x, 1.0, z + Math.cos(ry) * -0.7, { collide: false, ry }); };
  const soro = (x, z) => addBox(0.24, 1.5, 0.24, MAT.aco, x, 0, z);   // suporte de soro (poste)
  const mesa = (x, z, ry = 0) => { addBox(1.4, 0.75, 0.8, MAT.mesa, x, 0, z, { ry }); const cx = x + Math.sin(ry) * 0.85, cz = z + Math.cos(ry) * 0.85; addBox(0.5, 0.9, 0.5, MAT.cadeira, cx, 0, cz); };   // mesa + cadeira (cadeira colide)
  const armario = (x, z, ry = 0) => { addBox(1.2, 1.9, 0.6, MAT.armario, x, 0, z, { ry }); addBox(1.24, 0.5, 0.62, MAT.verde, x, 1.9, z, { collide: false, ry }); };
  const biombo = (x, z, ry = 0) => addBox(0.12, 1.8, 2.2, MAT.armario, x, 0, z, { ry });   // divisória/esconderijo
  const planta = (x, z) => { addBox(0.5, 0.5, 0.5, MAT.armario, x, 0, z); addBox(0.85, 1.0, 0.85, MAT.verde, x, 0.5, z, { collide: false }); };
  const banco = (x, z, ry = 0) => addBox(2.2, 0.5, 0.55, MAT.cadeira, x, 0, z, { ry });   // banco de espera (colide)
  // fileira de cadeiras de espera: o col() da faixa é o bloqueador; os assentos são só visual
  const cadeiras = (x, z, n, ry = 0) => { for (let i = 0; i < n; i++) { const dx = ry ? 0 : (i - (n - 1) / 2) * 0.7, dz = ry ? (i - (n - 1) / 2) * 0.7 : 0; addBox(0.55, 0.45, 0.55, MAT.cadeira, x + dx, 0.15, z + dz, { collide: false }); addBox(0.55, 0.6, 0.08, MAT.cadeira, x + dx, 0.65, z + dz - (ry ? 0 : 0.24), { collide: false, ry }); } col(x, z, ry ? 0.4 : n * 0.35, ry ? n * 0.35 : 0.4, 0.6); };

  const cyl = (r, h, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, o.seg || 16), mat); m.position.set(x, y + h / 2, z); if (o.rz) m.rotation.z = o.rz; if (o.rx) m.rotation.x = o.rx; m.castShadow = o.cast !== false; m.receiveShadow = true; root.add(m); occluders.push(m); return m; };
  const MTELA = lam({ color: 0x0d1722 }), GLOW_G = new THREE.MeshBasicMaterial({ color: 0x35e07a }), GLOW_R = new THREE.MeshBasicMaterial({ color: 0xff5555 }), MRODA = lam({ color: 0x15181c });
  const caster = (x, z, ry, w, d) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(0.1, 0.14, 0.1, MRODA, x + sx * w, 0, z + sz * d, { collide: false, ry, cast: false }); };
  // monitor de sinais vitais num carrinho (tela escura + traço de ECG verde)
  const monitor = (x, z, ry = 0) => { addBox(0.42, 0.9, 0.42, MAT.aco, x, 0.14, z, { ry }); caster(x, z, ry, 0.16, 0.16); addBox(0.5, 0.42, 0.12, MTELA, x, 1.06, z, { collide: false, ry }); addBox(0.4, 0.04, 0.13, GLOW_G, x, 1.09, z, { collide: false, ry }); col(x, z, 0.24, 0.24, 1.3); };
  // respirador/ventilador (gabinete alto + tela + traqueia)
  const respirador = (x, z, ry = 0) => { addBox(0.55, 1.2, 0.5, MAT.armario, x, 0.14, z, { ry }); caster(x, z, ry, 0.22, 0.18); addBox(0.46, 0.3, 0.1, MTELA, x, 1.42, z, { collide: false, ry }); addBox(0.36, 0.04, 0.11, GLOW_G, x, 1.45, z, { collide: false, ry }); cyl(0.04, 0.7, MRODA, x + 0.28, 0.9, z, { rz: 1.1, cast: false }); col(x, z, 0.3, 0.28, 1.6); };
  // carrinho de emergência vermelho (gavetas) com desfibrilador em cima
  const crashCart = (x, z, ry = 0) => { addBox(0.6, 0.95, 0.5, MAT.vermelho, x, 0.14, z, { ry }); caster(x, z, ry, 0.24, 0.18); for (let i = 0; i < 4; i++) addBox(0.62, 0.02, 0.52, MTELA, x, 0.32 + i * 0.18, z, { collide: false, ry }); addBox(0.42, 0.24, 0.34, MAT.aco, x, 1.11, z, { collide: false, ry }); addBox(0.3, 0.03, 0.1, GLOW_R, x, 1.24, z, { collide: false, ry }); col(x, z, 0.32, 0.28, 1.3); };
  // desfibrilador de bancada / DEA na parede
  const desfib = (x, y, z, ry = 0) => { addBox(0.4, 0.5, 0.16, lam({ color: 0xe0b81a }), x, y, z, { collide: false, ry }); addBox(0.3, 0.04, 0.17, GLOW_R, x, y + 0.42, z, { collide: false, ry }); };
  // cadeira de rodas (rodas grandes de verdade)
  const cadeiraRodas = (x, z, ry = 0) => { addBox(0.5, 0.12, 0.5, MAT.aco, x, 0.42, z, { collide: false, ry }); addBox(0.5, 0.55, 0.06, MAT.aco, x, 0.5, z + Math.cos(ry) * -0.22 + Math.sin(ry) * 0, { collide: false, ry }); for (const s of [-1, 1]) cyl(0.28, 0.05, MRODA, x + Math.cos(ry) * s * 0.3, 0.28, z + Math.sin(ry) * s * 0.3, { rz: Math.PI / 2 + (ry ? ry : 0), seg: 18, cast: false }); col(x, z, 0.34, 0.34, 0.9); };
  // balança com coluna e display
  const balanca = (x, z) => { addBox(0.5, 0.12, 0.62, MAT.aco, x, 0, z); addBox(0.08, 1.05, 0.08, MAT.aco, x, 0.12, z - 0.26, { collide: false }); addBox(0.32, 0.2, 0.1, MTELA, x, 1.2, z - 0.26, { collide: false }); col(x, z, 0.28, 0.33, 0.9); };
  // cilindro de oxigênio verde no carrinho
  const cilindroO2 = (x, z) => { addBox(0.42, 0.1, 0.42, MAT.aco, x, 0, z, { collide: false }); cyl(0.14, 0.95, MAT.verde, x, 0.1, z); addBox(0.12, 0.16, 0.12, MAT.aco, x, 1.05, z, { collide: false }); col(x, z, 0.2, 0.2, 1.1); };
  // negatoscópio (visor de raio-x aceso na parede)
  const negato = (x, y, z, ry = 0) => addBox(0.95, 0.72, 0.06, LUZ, x, y, z, { collide: false, ry });

  addBox(6, 1.1, 1.0, MAT.armario, -18, 0, -17); addBox(6.2, 0.1, 1.1, MAT.mesa, -18, 1.1, -17, { collide: false });   // balcão
  prop('caixa_cobranca', -15, -17, 1.1, Math.PI, 0.9, 0.5, 1.1);
  cadeiras(-24, -23, 4); cadeiras(-24, -20, 4);                                        // espera oeste (encostada na parede)
  banco(-9, -24); banco(-9, -21);                                                      // bancos perto da porta do corredor
  prop('painel_tvs', -28, -22, 2.0, -Math.PI / 2, 0.4, 1.0, 2.0);                      // TV da espera (senha)
  signMesh(2.2, 1.2, signTex('#111417', '#ff4d4d', 'SENHA', '999', 300, 260), -6, 2.4, -16, Math.PI / 2);
  for (const [mx, mz] of [[-27, -25], [-6, -18], [-21, -24]]) prop('manequim', mx, mz, 1.8, mx % 2 ? 1 : -1, 0.3, 0.3, 1.8);   // pacientes esperando
  cadeiraRodas(-7, -27, 0); planta(-28, -33); planta(-6, -33);

  for (const cz of [-7, 7]) { maca(-25, cz, 0); soro(-23, cz + 1); mesa(-9, cz, Math.PI); armario(-27, cz + 5); biombo(-16, cz); monitor(-22.5, cz); negato(-29.3, 2.1, cz, Math.PI / 2); }
  balanca(-12, -11); cadeiraRodas(-12, 11, Math.PI); prop('manequim', -21, -6, 1.8, 0, 0.3, 0.3, 1.8); planta(-6, 0);

  for (const mx of [-26, -20, -14, -8]) { maca(mx, 22, 0); soro(mx + 1.0, 20.6); }
  for (const mx of [-26, -18, -10]) { maca(mx, 30, Math.PI); soro(mx + 1.0, 31.6); }
  monitor(-23, 22); monitor(-11, 22); cilindroO2(-28, 26); cilindroO2(-6, 20); negato(-29.3, 2.1, 26, Math.PI / 2);
  prop('cooler', -28, 33, 1.3, 0, 0.8, 0.6, 1.2); biombo(-4.6, 26); planta(-28, 17);

  for (const gz of [-32, -28, -24, -20]) { prop('gondola_mercado', 11, gz, 1.9, Math.PI / 2, 1.05, 0.55, 1.9); prop('gondola_mercado', 22, gz, 1.9, Math.PI / 2, 1.05, 0.55, 1.9); }
  addBox(5, 1.1, 1.0, MAT.armario, 16, 0, -16); signMesh(2.4, 0.7, signTex('#2f6fb0', '#fff', 'RETIRE AQUI', '', 512, 150), 16, 2.0, -15.4, 0);
  cilindroO2(28, -18); cilindroO2(6, -14); planta(6, -33); planta(28, -33);

  mesa(10, -9, Math.PI); armario(27, -11); biombo(6, -9); prop('manequim', 14, -6, 1.8, Math.PI, 0.3, 0.3, 1.8);   // triagem
  balanca(20, -6); monitor(26, -7); cadeiraRodas(8, -12, 0);
  addBox(2.0, 2.4, 1.4, MAT.armario, 24, 0, 8); addBox(1.4, 2.0, 0.9, MAT.aco, 22.2, 0, 8, { collide: false }); maca(16, 8, Math.PI / 2);   // raio-x
  negato(29.3, 2.1, 8, -Math.PI / 2); respirador(8, 11); biombo(19, 10); label('RAIO-X', 12, 12, -Math.PI / 2, '#e0902a'); planta(6, 8);

  for (const mx of [8, 14, 20]) { maca(mx, 22, 0); soro(mx + 1.0, 20.6); monitor(mx - 1.2, 22); }   // macas + monitores de sinais vitais
  crashCart(24, 22); respirador(4.6, 20); desfib(29.2, 1.7, 22, -Math.PI / 2);
  addBox(4, 1.0, 1.5, MAT.armario, 27, 0, 18); biombo(6, 26); prop('gondola_eletro', 26, 16, 1.9, 0, 1.05, 0.55, 1.9);
  cadeiraRodas(8, 27, 0);
  prop('manequim', 22, 26, 1.8, 1, 0.3, 0.3, 1.8); planta(6, 33); planta(28, 33);
  signMesh(3.4, 1.0, signTex('#c0392b', '#fff', 'CADÊ O MÉDICO?', '', 512, 200), 14, 2.6, wZ - 0.5, Math.PI);

  for (const cz of [-20, -8, 8, 20]) { maca(cz % 16 ? -2.6 : 2.6, cz, 0); banco(cz % 16 ? 2.6 : -2.6, cz + 3, Math.PI / 2); }
  for (const cz of [-28, -2, 14, 28]) planta(cz % 4 ? 2.7 : -2.7, cz);

  const avisos = [['TEMPO DE ESPERA', '8 HORAS'], ['AGUARDE', 'SUA VEZ'], ['SEM MÉDICO', 'DE PLANTÃO'], ['FALTA', 'REMÉDIO']];
  avisos.forEach(([t, s], i) => signMesh(2.6, 1.0, signTex('#e0b81a', '#1a1a1a', t, s, 512, 200), 0, 2.6, [-14, -4, 8, 18][i], (i % 2) ? 0 : Math.PI));

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
    ambience,
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    // MID fora da diagonal E–B (senão o triângulo é colinear e a régua reprova): puxado pro sul do corredor.
    ctfPoints: [
      { id: 'E', label: 'RECEPÇÃO', x: -18, z: -28 },
      { id: 'MID', label: 'CORREDOR', x: 0, z: -8 },
      { id: 'B', label: 'EMERGÊNCIA', x: 18, z: 28 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 1, maxX: HALF_X - 1, minZ: -HALF_Z + 1, maxZ: HALF_Z - 1 },
  };
}
