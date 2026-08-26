// Treta no Gelo: festa junina de inverno na serra do sul — arena CTF simétrica (180°), procedural.
// Frente USANTOS (régua: tools/eval/gelo-check.mjs). NÃO é a fortaleza do PR #372 (rejeitado).
import * as THREE from 'three';
import { InstBatch, mergeParts, placeProp } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

/* os moldes Mint (quentão, galpão) substituem o procedural no browser; no arnês placeProp devolve
   null e o procedural cobre (lição 3). Sem GLB publicado: sem slot props (eval:props-acervo). */
export const GELO_PROPS = ['gelo_quentao', 'galpao_festival'];
export const GELO_AMBIENCE = ['rat', 'pigeonGround', 'dog', 'chicken', 'cow'];

const HALF_X = 32;
const HALF_Z = 42;

export function buildGelo(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  root.name = 'treta-no-gelo';
  scene.add(root);

  function surfaceTexture(kind, base, accent, repeat = 4) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    let seed = Array.from(kind).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (kind === 'neve' || kind === 'nevefofa') {
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      ctx.globalAlpha = kind === 'neve' ? 0.22 : 0.12;
      for (let i = 0; i < 260; i++) {
        const x = rand() * 128, y = rand() * 128;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 6, y + (rand() - 0.5) * 3); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (kind === 'neve') {
        /* pegadas em pares e trilha de trenó: neve pisada de festival, não campo limpo */
        ctx.fillStyle = 'rgba(118,138,160,.5)';
        for (let i = 0; i < 26; i++) {
          const x = rand() * 128, y = rand() * 128, a = rand() * Math.PI;
          for (const p of [-2.2, 2.2]) {
            ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * p, y + Math.sin(a) * p, 1.6, 2.6, a, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.strokeStyle = 'rgba(110,130,155,.45)'; ctx.lineWidth = 2;
        for (const off of [-3, 3]) {
          ctx.beginPath();
          for (let x = 0; x <= 128; x += 4) { const y = 64 + off + Math.sin(x * 0.07) * 5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(rand() * 128, rand() * 128, 2 + rand() * 5, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (kind === 'terra') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 600; i++) { ctx.globalAlpha = 0.15 + rand() * 0.3; ctx.fillRect(rand() * 128, rand() * 128, 0.6 + rand() * 2.2, 0.6 + rand() * 2.2); }
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(238,244,250,.55)';
      for (let i = 0; i < 90; i++) ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 2, 1 + rand() * 2);
    } else if (kind === 'calcada') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      for (let y = 0; y <= 128; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + (rand() - 0.5) * 3); ctx.stroke(); }
      for (let y = 0; y < 128; y += 16) for (let x = (y % 32 ? 8 : 20); x < 128; x += 28) { ctx.beginPath(); ctx.moveTo(x + (rand() - 0.5) * 3, y); ctx.lineTo(x + (rand() - 0.5) * 3, y + 16); ctx.stroke(); }
      ctx.fillStyle = 'rgba(240,246,252,.5)';
      for (let i = 0; i < 120; i++) ctx.fillRect(rand() * 128, rand() * 128, 1.5, 1.5);
    } else if (kind === 'madeira') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      for (let y = 8; y < 128; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + y) * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(50,24,12,.3)'; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc(rand() * 128, rand() * 128, 1 + rand() * 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 'lona' || kind === 'lona2') {
      ctx.fillStyle = accent;
      for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 128);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 15; x < 128; x += 32) ctx.fillRect(x, 0, 2, 128);
      ctx.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 1);
    } else if (kind === 'palha') {
      ctx.strokeStyle = accent; ctx.lineWidth = 1;
      for (let i = 0; i < 500; i++) {
        const x = rand() * 128, y = rand() * 128, a = (rand() - 0.5) * 0.9;
        ctx.globalAlpha = 0.35 + rand() * 0.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (5 + rand() * 7), y + Math.sin(a) * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'pedra') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
      for (let y = 0; y <= 128; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 128; x += 16) ctx.lineTo(x, y + (rand() - 0.5) * 5); ctx.stroke(); }
      for (let y = 0; y < 128; y += 22) for (let x = (y % 44 ? 12 : 30); x < 128; x += 34) { ctx.beginPath(); ctx.moveTo(x + (rand() - 0.5) * 4, y); ctx.lineTo(x + (rand() - 0.5) * 4, y + 22); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.09)'; for (let i = 0; i < 90; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 2);
    } else if (kind === 'casca') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
      for (let x = 4; x < 128; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= 128; y += 8) ctx.lineTo(x + Math.sin(y * 0.11 + x) * 2.5, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(28,14,6,.4)'; for (let i = 0; i < 14; i++) ctx.fillRect(rand() * 128, rand() * 128, 2 + rand() * 3, 5 + rand() * 9);
    } else if (kind === 'folha') {
      ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
      for (let i = 0; i < 300; i++) {
        const x = rand() * 128, y = rand() * 128, a = rand() * Math.PI;
        ctx.globalAlpha = 0.3 + rand() * 0.45;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (4 + rand() * 5), y + Math.sin(a) * (4 + rand() * 5)); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(235,242,250,.35)';
      for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 128, rand() * 128, 1.5, 1.5);
    } else if (kind === 'metal') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.08 + rand() * 0.16; ctx.fillRect(rand() * 128, rand() * 128, 0.5 + rand() * 2, rand() * 7 + 1); }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const x = rand() * 128, y = rand() * 128; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 16, y + rand() * 3); ctx.stroke(); }
    } else if (kind === 'lata') {
      ctx.strokeStyle = accent; ctx.lineWidth = 3;
      for (let x = 6; x < 128; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.20)'; ctx.lineWidth = 1.5;
      for (let x = 11; x < 128; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,34,38,.35)'; for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 128, rand() * 128, 1.5, 1.5);
    } else if (kind === 'carvao') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(rand() * 128, rand() * 128, 3 + rand() * 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,96,26,.85)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 22; i++) {
        const x = rand() * 128, y = rand() * 128;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 14, y + (rand() - 0.5) * 14); ctx.stroke();
      }
    } else if (kind === 'serra') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 400; i++) { ctx.globalAlpha = 0.1 + rand() * 0.22; ctx.fillRect(rand() * 128, rand() * 128, 0.6 + rand() * 2.4, 0.6 + rand() * 2.4); }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(230,238,248,.5)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 26; i++) {
        const x = rand() * 128, y = rand() * 50;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 10, y + 6 + rand() * 12); ctx.stroke();
      }
    } else if (kind === 'fumaca') {
      const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(255,255,255,.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 4;
    texture.name = `gelo-${kind}`; return texture;
  }

  const SURFACE = {
    neve: surfaceTexture('neve', '#dde8f2', '#b9cbdd', 12), nevefofa: surfaceTexture('nevefofa', '#eef4fa', '#cfdeee', 3),
    terra: surfaceTexture('terra', '#7a6a58', '#93826a', 6), calcada: surfaceTexture('calcada', '#9aa4ae', '#6e7884', 6),
    madeira: surfaceTexture('madeira', '#8a5a36', '#57301c', 4), lona: surfaceTexture('lona', '#e8506a', '#fff2e2', 2),
    lona2: surfaceTexture('lona2', '#3f9e58', '#fff7e8', 2), palha: surfaceTexture('palha', '#d9b45a', '#a8823a', 3),
    pedra: surfaceTexture('pedra', '#8e939a', '#5f656d', 4), casca: surfaceTexture('casca', '#5f4430', '#3a2716', 2),
    folha: surfaceTexture('folha', '#274d3a', '#3f7355', 2), metal: surfaceTexture('metal', '#7e8a96', '#454f5a', 3),
    lata: surfaceTexture('lata', '#7f8c94', '#4a545c', 2), carvao: surfaceTexture('carvao', '#241d18', '#141010', 2),
    serra: surfaceTexture('serra', '#46586f', '#37465a', 5), fumaca: surfaceTexture('fumaca', '#000000', '#000000', 1),
  };
  const material = (color, surface, roughness = 0.62, metalness = 0) => new THREE.MeshStandardMaterial({ color, map: surface, roughness, metalness });
  const MAT = {
    neve: material(0xffffff, SURFACE.neve, 0.94), nevefofa: material(0xffffff, SURFACE.nevefofa, 1),
    terra: material(0xffffff, SURFACE.terra, 1), calcada: material(0xffffff, SURFACE.calcada, 0.9),
    madeira: material(0xffffff, SURFACE.madeira, 0.85), lona: material(0xffffff, SURFACE.lona, 0.72),
    lona2: material(0xffffff, SURFACE.lona2, 0.72), palha: material(0xffffff, SURFACE.palha, 0.95),
    pedra: material(0xffffff, SURFACE.pedra, 0.9), casca: material(0xffffff, SURFACE.casca, 0.95),
    folha: material(0xffffff, SURFACE.folha, 1), metal: material(0xffffff, SURFACE.metal, 0.45, 0.35),
    lata: material(0xffffff, SURFACE.lata, 0.5, 0.3),
    brasa: new THREE.MeshStandardMaterial({ map: SURFACE.carvao, emissive: 0xff5a1e, emissiveMap: SURFACE.carvao, emissiveIntensity: 1.2, roughness: 1 }),
    serra: material(0xffffff, SURFACE.serra, 1),
    serraLonge: material(0x9fb2cc, SURFACE.serra, 1),
  };

  const fogueiras = [];
  const geometryCache = new Map();
  const boxGeometry = (w, h, d) => {
    const key = `b:${w}:${h}:${d}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geometryCache.get(key);
  };
  const cylinderGeometry = (r, h, segments = 14) => {
    const key = `c:${r}:${h}:${segments}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(r, r, h, segments));
    return geometryCache.get(key);
  };

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    if (opts.ry) mesh.rotation.y = opts.ry;
    (opts.parent || root).add(mesh);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(mesh);
    }
    return mesh;
  }

  function addFloor(w, d, mat, x, z, y = 0.01) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }

  function addCylinder(r, h, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylinderGeometry(r, h, opts.segments || 14), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = true;
    (opts.parent || root).add(mesh);
    if (opts.collide !== false) {
      colliders.push({ minX: x - r, maxX: x + r, minY: y, maxY: y + h, minZ: z - r, maxZ: z + r });
      occluders.push(mesh);
    }
    return mesh;
  }

  function signTexture(id, title, subtitle, bg, fg) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = fg; ctx.lineWidth = 14; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
    ctx.font = 'bold 76px "Arial Black", sans-serif'; ctx.fillText(title, canvas.width / 2, 94);
    ctx.font = 'bold 32px Arial, sans-serif'; ctx.fillText(subtitle, canvas.width / 2, 174);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.name = `gelo-placa-${id}`;
    return texture;
  }

  /* Look de crepúsculo de inverno (LOOK.gelo): céu/fog/sol/hemi de uma fonte só;
     o shadow fica no builder porque ele conhece os limites do mapa. */
  const { hemi, sun } = applyLook(scene, T, 'gelo');
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 54; sun.shadow.camera.bottom = -54;
  sun.shadow.camera.far = 220; sun.shadow.bias = -0.0005;

  // Chão: neve pisada de festival; rotas L/C/R em terra batida gelada, praça em calçada.
  addFloor(HALF_X * 2, HALF_Z * 2, MAT.neve, 0, 0);
  for (const x of [-14, 0, 14]) addFloor(5, HALF_Z * 2 - 4, MAT.terra, x, 0, 0.02);
  {
    const praca = new THREE.Mesh(new THREE.CircleGeometry(8.6, 28), MAT.calcada);
    praca.rotation.x = -Math.PI / 2; praca.position.set(0, 0.035, 0); praca.receiveShadow = true; root.add(praca);
  }

  // Cerca de fazenda contendo a arena: duas tábuas corridas + mourões instanciados.
  for (const sz of [-1, 1]) {
    addBox(HALF_X * 2, 0.24, 0.14, MAT.madeira, 0, 0.55, sz * 41.6, { collide: false });
    addBox(HALF_X * 2, 0.24, 0.14, MAT.madeira, 0, 1.0, sz * 41.6, { collide: false });
    addBox(0.14, 0.24, HALF_Z * 2, MAT.madeira, sz * 31.6, 0.55, 0, { collide: false });
    addBox(0.14, 0.24, HALF_Z * 2, MAT.madeira, sz * 31.6, 1.0, 0, { collide: false });
    colliders.push({ minX: -32, maxX: 32, minY: 0, maxY: 1.2, minZ: sz * 41.6 - 0.4, maxZ: sz * 41.6 + 0.4 });
    colliders.push({ minX: sz * 31.6 - 0.4, maxX: sz * 31.6 + 0.4, minY: 0, maxY: 1.2, minZ: -42, maxZ: 42 });
  }
  {
    const mouraoBatch = new InstBatch({ name: 'gelo-mouroes' });
    const dummy = new THREE.Object3D();
    for (let x = -30; x <= 30; x += 4) for (const sz of [-1, 1]) {
      dummy.position.set(x, 0.7, sz * 41.6); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      mouraoBatch.add(boxGeometry(0.22, 1.4, 0.22), MAT.casca, dummy.matrix);
    }
    for (let z = -40; z <= 40; z += 4) for (const sx of [-1, 1]) {
      dummy.position.set(sx * 31.6, 0.7, z); dummy.updateMatrix();
      mouraoBatch.add(boxGeometry(0.22, 1.4, 0.22), MAT.casca, dummy.matrix);
    }
    mouraoBatch.build(root);
  }
  // Pilhas de neve no rodapé da cerca (baixas de propósito: o corpo passa por cima — MAP1).
  for (const [x, z, s] of [[-24, -40.6, 1.4], [-6, 40.7, 1.2], [12, -40.5, 1.6], [26, 40.6, 1.3], [-30.6, -18, 1.5], [30.6, 14, 1.4], [-30.7, 26, 1.2], [30.7, -28, 1.5], [4, 41, 1.1], [-14, -41, 1.3]]) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 7), MAT.nevefofa);
    mound.scale.set(s, s * 0.16, s * 0.8); mound.position.set(x, 0, z);
    mound.receiveShadow = true; root.add(mound);
  }

  /* Galpão de festival (base E): palco de forró no fundo, laterais meio-abertas,
     telhado de duas águas com neve acumulada na cumeeira e nos beirais. No browser
     o GLB Mint galpao_festival cobre o visual; colisores idênticos nos dois mundos. */
  {
    const g = new THREE.Group(); g.name = 'gelo-galpao'; g.userData.molde = 'galpao_festival'; root.add(g);
    const ocBase = occluders.length;
    const proc = new THREE.Group(); g.add(proc);
    for (const sx of [-1, 1]) for (const z of [-36.8, -30.75, -24.7]) addBox(0.36, 4.5, 0.36, MAT.madeira, sx * 13.2, 0, z, { parent: proc });
    addBox(28, 4.2, 0.4, MAT.madeira, 0, 0, -37.7, { parent: proc });
    for (const sx of [-1, 1]) addBox(0.3, 2.4, 7, MAT.madeira, sx * 13.9, 0, -34, { parent: proc });
    const agua = (zc, ye, sinal) => {
      const comp = Math.hypot(7.4, 2.1);
      const roof = new THREE.Mesh(boxGeometry(29.6, 0.16, comp), MAT.lata);
      roof.position.set(0, (6.35 + ye) / 2 + 0.1, (-30.85 + zc) / 2);
      roof.rotation.x = sinal * Math.atan2(2.1, 7.4);
      roof.castShadow = true; proc.add(roof);
      const neveBeiral = new THREE.Mesh(boxGeometry(29.6, 0.09, 1.1), MAT.nevefofa);
      neveBeiral.position.set(0, ye + 0.22, zc); neveBeiral.rotation.x = sinal * Math.atan2(2.1, 7.4); proc.add(neveBeiral);
    };
    agua(-38.15, 4.25, -1); agua(-23.55, 4.25, 1);
    const cumeeira = new THREE.Mesh(boxGeometry(29.8, 0.34, 0.9), MAT.nevefofa);
    cumeeira.position.set(0, 6.55, -30.85); cumeeira.castShadow = true; proc.add(cumeeira);
    // Palco de forró: tablado, caixas de som e sanfona de mentira no cavalete.
    addBox(10, 0.7, 4.6, MAT.madeira, 0, 0, -34.4, { parent: proc });
    addBox(10.4, 0.18, 5, MAT.casca, 0, 0.7, -34.4, { parent: proc, collide: false });
    for (const sx of [-1, 1]) {
      addBox(1.1, 1.9, 0.9, MAT.metal, sx * 6.2, 0, -33.6, { parent: proc });
      addBox(0.7, 0.7, 0.2, MAT.lata, sx * 6.2, 1.15, -33.05, { parent: proc, collide: false });
    }
    addBox(0.9, 0.6, 0.4, MAT.lona, 1.6, 0.88, -34.6, { parent: proc, collide: false });

    const glb = placeProp('galpao_festival', { x: 0, y: 0, z: -30.85, targetH: 6.7, targetLen: 28.4 });
    proc.visible = !glb;
    if (glb) {
      occluders.length = ocBase; // peça escondida não oclui (padrão gelo-quentao)
      /* O molde normalizado (~1 m) estica até o volume do procedural: fachada 28,4 m cobre
         os colisores laterais (±14,05), profundidade 14,6 m = águas -38,15..-23,55, cumeeira
         6,7 m, deck a 0,12 m do chão. Medidas nativas lidas do accessor POSITION do GLB. */
      const NAT = { minY: -0.3721, maxY: 0.3721, deckY: -0.205, eaveY: 0.045, sizeX: 0.998, sizeZ: 0.9707 };
      const sy = (6.7 - 0.12) / (NAT.maxY - NAT.deckY);
      glb.scale.set(28.4 / NAT.sizeX, sy, 14.6 / NAT.sizeZ);
      glb.position.y = 0.12 - NAT.deckY * sy;
      g.add(glb);
      glb.updateMatrixWorld(true);
      /* Neve refeita sobre o telhado do GLB (a procedural esconde junto): cumeeira no topo
         do Box3, beirais na altura medida NAT.eaveY, inclinados no slope derivado. */
      const bb = new THREE.Box3().setFromObject(glb);
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      const eaveY = glb.position.y + NAT.eaveY * sy;
      const meia = (bb.max.x - bb.min.x) / 2;
      const slope = Math.atan2(bb.max.y - eaveY, meia);
      const comp = (bb.max.z - bb.min.z) * 0.98;
      const cum = new THREE.Mesh(boxGeometry(1.1, 0.34, comp), MAT.nevefofa);
      cum.position.set(cx, bb.max.y + 0.1, cz); cum.castShadow = true; g.add(cum);
      for (const s of [-1, 1]) {
        const bx = s * (meia - 0.55);
        const beiral = new THREE.Mesh(boxGeometry(1.3, 0.1, comp), MAT.nevefofa);
        beiral.position.set(cx + bx, bb.max.y - Math.tan(slope) * Math.abs(bx) + 0.1, cz);
        beiral.rotation.z = -s * slope;
        g.add(beiral);
      }
    }
  }

  /* Fogueiras: anel de pedras, troncos, brasa emissiva e PointLight quente sem
     sombra (o SB2 já está 8/8 no piso WebGL1) com flicker no update — GL3. */
  function fogueira(nome, x, z, escala, fase) {
    const g = new THREE.Group(); g.name = nome; root.add(g);
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      const pedra = new THREE.Mesh(boxGeometry(0.5, 0.34, 0.4), MAT.pedra);
      pedra.position.set(x + Math.cos(a) * 1.5 * escala, 0.17, z + Math.sin(a) * 1.5 * escala);
      pedra.rotation.y = a; pedra.castShadow = true; g.add(pedra);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + 0.4;
      const tronco = new THREE.Mesh(cylinderGeometry(0.11, 1.5 * escala, 8), MAT.casca);
      tronco.position.set(x + Math.cos(a) * 0.42, 0.5, z + Math.sin(a) * 0.42);
      tronco.rotation.z = Math.cos(a) * 0.85; tronco.rotation.x = -Math.sin(a) * 0.85;
      tronco.castShadow = true; g.add(tronco);
    }
    const brasa = new THREE.Mesh(cylinderGeometry(0.85 * escala, 0.22, 16), MAT.brasa.clone());
    brasa.position.set(x, 0.14, z); g.add(brasa);
    const luz = new THREE.PointLight(0xff8c3a, 14, 16 * escala, 2);
    luz.position.set(x, 1.15, z); g.add(luz);
    const fumaca = [];
    for (let i = 0; i < 4; i++) {
      const sm = new THREE.SpriteMaterial({ map: SURFACE.fumaca, color: 0xaab6c4, transparent: true, opacity: 0.22, depthWrite: false });
      const sprite = new THREE.Sprite(sm);
      sprite.position.set(x, 1.6, z); sprite.scale.setScalar(1.2);
      g.add(sprite); fumaca.push({ sprite, mat: sm, off: i * 0.8, x, z });
    }
    colliders.push({ minX: x - 1.7 * escala, maxX: x + 1.7 * escala, minY: 0, maxY: 0.85, minZ: z - 1.7 * escala, maxZ: z + 1.7 * escala });
    fogueiras.push({ luz, brasa, base: 14, fase, fumaca });
  }
  fogueira('gelo-fogueira-central', 0, 0, 1.35, 0);
  fogueira('gelo-fogueira-oeste', -18, -10, 1.0, 2.1);
  fogueira('gelo-fogueira-leste', 18, 10, 1.0, 4.2);

  /* Barracas juninas: balcão, toldo listrado e placa. Quatro delas formam as
     rotas L/C/R sem virar labirinto (espelhadas 180°). */
  function barraca(nome, x, z, lonaMat, id, titulo, subtitulo, bg) {
    const g = new THREE.Group(); g.name = nome; root.add(g);
    const frente = z < 0 ? 1 : -1;
    addBox(4.4, 1.05, 0.7, MAT.madeira, x, 0, z + frente * 1.5, { parent: g });
    addBox(4.4, 1.7, 0.28, MAT.madeira, x, 0, z - frente * 1.6, { parent: g });
    for (const sx of [-1, 1]) {
      addBox(0.28, 1.35, 2.6, MAT.madeira, x + sx * 2.1, 0, z, { parent: g });
      addCylinder(0.06, 2.7, MAT.casca, x + sx * 2.05, 0, z + frente * 2.1, { parent: g, collide: false, segments: 8 });
    }
    const toldo = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.6), new THREE.MeshStandardMaterial({ map: lonaMat, roughness: 0.72, side: THREE.DoubleSide }));
    toldo.position.set(x, 2.62, z + frente * 0.35); toldo.rotation.x = frente * 1.18; toldo.castShadow = true; g.add(toldo);
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.05), new THREE.MeshLambertMaterial({ map: signTexture(id, titulo, subtitulo, bg, '#fff7e8') }));
    placa.position.set(x, 2.15, z + frente * 1.78); placa.rotation.y = z < 0 ? 0 : Math.PI; g.add(placa);
    for (const dx of [-1.2, 0.9]) addBox(0.9, 0.55, 0.7, MAT.palha, x + dx, 0, z - frente * 0.6, { parent: g, collide: false });
  }
  barraca('gelo-barraca-pastel', -13, -16, SURFACE.lona, 'pastel', 'PASTEL', 'FRANGO · QUEIJO · CALDO DE CANA', '#b3342e');
  barraca('gelo-barraca-pescaria', 13, 16, SURFACE.lona2, 'pescaria', 'PESCARIA', 'PESQUE E GANHE O PRÊMIO', '#1f5e8f');
  barraca('gelo-barraca-correio', 13, -16, SURFACE.lona2, 'correio', 'CORREIO ELEGANTE', 'MANDE SEU BILHETE', '#6b3fc5');
  barraca('gelo-barraca-doce', -13, 16, SURFACE.lona, 'doce', 'MAÇÃ DO AMOR', 'BOLO DE MILHO · PÉ DE MOLEQUE', '#c96a1f');

  /* Caminhão de quentão: cobertura-âncora do flanco B. GLB do Mint quando
     publicado; procedural caprichado cobre enquanto isso (colisores iguais). */
  {
    const g = new THREE.Group(); g.name = 'gelo-quentao'; g.userData.molde = 'gelo_quentao'; root.add(g);
    colliders.push({ minX: -3.4, maxX: 3.4, minY: 0, maxY: 2.2, minZ: 26.9, maxZ: 29.1 });
    const glb = placeProp('gelo_quentao', { x: 0, y: 0, z: 28, targetH: 2.6, targetLen: 6.8, ry: Math.PI / 2 });
    if (glb) g.add(glb);
    const proc = new THREE.Group(); proc.visible = !glb; g.add(proc);
    if (!glb) {
      const pecas = [];
      pecas.push(addBox(3.7, 1.15, 1.95, MAT.lata, -1.05, 0.72, 28, { parent: proc, collide: false }));
      pecas.push(addBox(1.8, 1.35, 1.9, MAT.metal, 2.35, 0.62, 28, { parent: proc, collide: false }));
      pecas.push(addBox(1.7, 0.75, 1.7, MAT.metal, 2.4, 1.97, 28, { parent: proc, collide: false }));
      pecas.push(addBox(4.1, 0.12, 2.2, MAT.lona, -1.0, 2.42, 28, { parent: proc, collide: false }));
      for (const sx of [-1, 1]) for (const px of [-2.2, 0.4]) {
        const post = new THREE.Mesh(cylinderGeometry(0.045, 0.6, 8), MAT.casca);
        post.position.set(px, 2.15, 28 + sx * 0.95); proc.add(post);
      }
      for (const wx of [-2.1, 0.5, 2.5]) for (const wz of [26.95, 29.05]) {
        const roda = new THREE.Mesh(cylinderGeometry(0.42, 0.26, 12), MAT.pedra);
        roda.rotation.x = Math.PI / 2; roda.position.set(wx, 0.42, wz); proc.add(roda);
      }
      for (const [px, pr] of [[-1.9, 0.3], [-1.1, 0.24], [-0.35, 0.27]]) {
        const panela = new THREE.Mesh(cylinderGeometry(pr, 0.3, 12), MAT.metal);
        panela.position.set(px, 1.45, 28.35); proc.add(panela);
      }
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.95), new THREE.MeshLambertMaterial({ map: signTexture('quentao', 'QUENTÃO', 'CANJICA · VINHO QUENTE', '#8f2a1f', '#ffe9b8') }));
      faixa.position.set(-1.0, 1.75, 29.06); proc.add(faixa);
      occluders.push(...pecas);
    }
  }

  // Fardos de palha instanciados: cobertura baixa espalhada pelos quatro cantos.
  {
    const fardoGeo = new THREE.CylinderGeometry(0.78, 0.78, 1.25, 14);
    fardoGeo.rotateX(Math.PI / 2);
    const fardoBatch = new InstBatch({ name: 'gelo-palha-lote' });
    const dummy = new THREE.Object3D();
    for (const [x, z, ry] of [[9, -26, 0.4], [-9, 26, 2.2], [24, -6, 1.1], [-24, 6, 2.8], [20, 18, 0.2], [-20, -18, 1.9], [-22, -30, 0.9], [22, 30, 2.5], [9, -33, 1.5], [-9, 33, 0.6], [-9, -33, 2.9], [9, 33, 1.2]]) {
      dummy.position.set(x, 0.78, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      fardoBatch.add(fardoGeo, MAT.palha, dummy.matrix);
      colliders.push({ minX: x - 0.8, maxX: x + 0.8, minY: 0, maxY: 1.56, minZ: z - 0.65, maxZ: z + 0.65 });
    }
    occluders.push(...fardoBatch.build(root));
  }

  // Mesas de festa e bancos: cobertura de cintura rente à praça.
  for (const [x, z] of [[7, -12], [-7, 12], [-7, -12], [7, 12], [-9, 32], [9, -32]]) {
    addCylinder(0.62, 0.08, MAT.madeira, x, 0.72, z, { collide: false, segments: 12 });
    addCylinder(0.08, 0.72, MAT.casca, x, 0, z, { collide: false, segments: 8 });
    colliders.push({ minX: x - 0.62, maxX: x + 0.62, minY: 0, maxY: 0.8, minZ: z - 0.62, maxZ: z + 0.62 });
    for (const s of [-1, 1]) addBox(1.5, 0.42, 0.4, MAT.madeira, x + s * 1.25, 0, z, { collide: true });
  }
  for (const [x, z, ry] of [[-6, 9, 0.3], [6, -9, -2.8], [-6, -9, -0.4], [6, 9, 2.9]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (const lx of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(boxGeometry(0.12, 0.44, 0.5), MAT.casca); leg.position.set(lx, 0.22, 0); leg.castShadow = true; g.add(leg);
    }
    for (let p = 0; p < 2; p++) {
      const plank = new THREE.Mesh(boxGeometry(1.7, 0.06, 0.2), MAT.madeira);
      plank.position.set(0, 0.47, -0.12 + p * 0.24); plank.castShadow = true; g.add(plank);
    }
    colliders.push({ minX: x - 0.9, maxX: x + 0.9, minY: 0, maxY: 0.52, minZ: z - 0.35, maxZ: z + 0.35 });
  }
  // Pilhas de lenha perto das fogueiras.
  for (const [x, z] of [[-4.5, -21], [4.5, 21], [-16, 2], [16, -2]]) {
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(cylinderGeometry(0.13, 1.2, 8), MAT.casca);
      log.rotation.z = Math.PI / 2; log.position.set(x, 0.14 + Math.floor(i / 3) * 0.24, z - 0.3 + (i % 3) * 0.3);
      log.castShadow = true; root.add(log);
    }
    colliders.push({ minX: x - 0.65, maxX: x + 0.65, minY: 0, maxY: 0.6, minZ: z - 0.55, maxZ: z + 0.55 });
  }

  // Bandeirinhas juninas cruzando os caminhos (instanciadas, sem colisor).
  {
    const cordas = [
      [[-10, 3.3, -18], [10, 3.2, -14]], [[10, 3.3, 18], [-10, 3.2, 14]],
      [[-14, 3.5, -22], [-14, 3.1, -4]], [[14, 3.5, 22], [14, 3.1, 4]],
      [[-6, 3.7, -25], [6, 3.6, -21]], [[6, 3.7, 25], [-6, 3.6, 21]],
      [[-12.5, 4.1, -26], [12.5, 4.1, -26]],
    ];
    const CORES = [0xe8506a, 0xffd84d, 0x3f9e58, 0x22a7e8, 0x7b55d9];
    const flagGeo = new THREE.ConeGeometry(0.16, 0.42, 3);
    flagGeo.rotateZ(Math.PI);
    const flagBatch = new InstBatch({ name: 'gelo-bandeirinha-lote' });
    const dummy = new THREE.Object3D();
    let fi = 0;
    for (const [a, b] of cordas) {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const p = va.clone().lerp(vb, t); p.y -= Math.sin(Math.PI * t) * 0.55;
        pts.push(p);
        if (i > 0 && i < 16) {
          dummy.position.copy(p); dummy.position.y -= 0.22;
          dummy.rotation.set(0, (fi * 1.7) % Math.PI, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
          flagBatch.add(flagGeo, MAT.lona, dummy.matrix, CORES[fi++ % CORES.length]);
        }
      }
      const corda = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.015, 4, false), MAT.casca);
      corda.castShadow = false; root.add(corda);
    }
    flagBatch.build(root);
  }

  /* Araucárias e pinheiros da serra no perímetro: tronco com colisor fino,
     copa sem colisor (o grafo nasce dos colisores no fim do build). */
  {
    const arauTrunk = new THREE.CylinderGeometry(0.2, 0.3, 3.2, 8).translate(0, 1.6, 0);
    const arauCanopy = mergeParts([
      new THREE.ConeGeometry(1.9, 1.3, 9).translate(0, 2.9, 0),
      new THREE.ConeGeometry(1.5, 1.2, 9).translate(0, 3.7, 0),
      new THREE.ConeGeometry(1.1, 1.1, 9).translate(0, 4.5, 0),
      new THREE.ConeGeometry(0.7, 1.0, 9).translate(0, 5.2, 0),
    ]);
    const pinTrunk = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 7).translate(0, 1.1, 0);
    const pinCanopy = new THREE.ConeGeometry(1.35, 3.6, 8).translate(0, 3.9, 0);
    const batArauT = new InstBatch({ name: 'gelo-arvores-araucaria' });
    const batArauC = new InstBatch({ name: 'gelo-copas-araucaria' });
    const batPinT = new InstBatch({ name: 'gelo-arvores-pinheiro' });
    const batPinC = new InstBatch({ name: 'gelo-copas-pinheiro' });
    const CORES_COPA = [0x2e5d43, 0x35684a, 0x2a5240, 0x4a7360];
    const dummy = new THREE.Object3D();
    let ni = 0;
    for (const z of [-36, -24, -12, 0, 12, 24, 36]) for (const sx of [-1, 1]) {
      const x = sx * 29;
      dummy.position.set(x, 0, z); dummy.rotation.set(0, ni * 1.31, 0);
      const s = 0.9 + (ni % 4) * 0.12; dummy.scale.set(s, s * (0.92 + (ni % 3) * 0.1), s); dummy.updateMatrix();
      batArauT.add(arauTrunk, MAT.casca, dummy.matrix);
      batArauC.add(arauCanopy, MAT.folha, dummy.matrix, CORES_COPA[ni % CORES_COPA.length]);
      colliders.push({ minX: x - 0.24, maxX: x + 0.24, minY: 0, maxY: 2.4, minZ: z - 0.24, maxZ: z + 0.24 });
      ni++;
    }
    for (const sz of [-1, 1]) for (const x of [-24, -16, 16, 24]) {
      const z = sz * 40.6;
      dummy.position.set(x, 0, z); dummy.rotation.set(0, ni * 1.31, 0);
      const s = 0.85 + (ni % 3) * 0.14; dummy.scale.set(s, s, s); dummy.updateMatrix();
      batPinT.add(pinTrunk, MAT.casca, dummy.matrix);
      batPinC.add(pinCanopy, MAT.folha, dummy.matrix, CORES_COPA[(ni + 1) % CORES_COPA.length]);
      colliders.push({ minX: x - 0.2, maxX: x + 0.2, minY: 0, maxY: 2.2, minZ: z - 0.2, maxZ: z + 0.2 });
      ni++;
    }
    occluders.push(...batArauT.build(root));
    batArauC.build(root);
    occluders.push(...batPinT.build(root));
    batPinC.build(root);
  }

  /* A serra em camadas no horizonte: PAREDES de crista recortada (matte painting
     unlit + fog), não cones — o cone de 5 lados lia como pirâmide de primário na
     captura 3:2 (crítica 25/08). Fora dos bounds, sem colisor. */
  {
    const serraWall = SURFACE.serra.clone(); serraWall.repeat.set(0.05, 0.05); serraWall.needsUpdate = true;
    const matPerto = new THREE.MeshBasicMaterial({ map: serraWall, color: 0x6d81a0, side: THREE.DoubleSide });
    const matLonge = new THREE.MeshBasicMaterial({ map: serraWall, color: 0xa8b9d2, side: THREE.DoubleSide });
    let si = 0;
    const ridge = (x, z, w, h, mat) => {
      let seed = 11 + si * 37;
      const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0);
      const n = 6 + (si % 3);
      for (let i = 0; i <= n; i++) {
        const px = -w / 2 + (w * i) / n;
        const py = i === 0 || i === n ? h * 0.28 : h * (0.45 + rand() * 0.55);
        shape.lineTo(px, py);
        if (i < n) shape.lineTo(px + w / n / 2, h * (0.3 + rand() * 0.35));
      }
      shape.lineTo(w / 2, 0); shape.closePath();
      const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      wall.position.set(x, -0.5, z); wall.rotation.y = Math.atan2(-x, -z);
      wall.castShadow = wall.receiveShadow = false;
      root.add(wall); si++;
    };
    ridge(-42, -66, 74, 17, matPerto); ridge(0, -74, 96, 22, matLonge); ridge(46, -64, 68, 15, matPerto);
    ridge(70, -28, 60, 13, matLonge); ridge(74, 8, 70, 16, matPerto); ridge(64, 46, 56, 12, matLonge);
    ridge(42, 66, 74, 17, matPerto); ridge(0, 74, 96, 22, matLonge); ridge(-46, 64, 68, 15, matPerto);
    ridge(-70, 28, 60, 13, matLonge); ridge(-74, -8, 70, 16, matPerto); ridge(-64, -46, 56, 12, matLonge);
  }

  const GM = { black: material(0x202735, SURFACE.metal, 0.4, 0.5), steel: material(0xaab4c0, SURFACE.metal, 0.35, 0.6), wood: MAT.madeira, green: material(0x315b43, SURFACE.metal, 0.5, 0.3) };
  const gbox = (w, h, d, mat, x, y, z) => { const mesh = new THREE.Mesh(boxGeometry(w, h, d), mat); mesh.position.set(x, y, z); return mesh; };
  function buildGun(kind, x, z, yaw) {
    const g = new THREE.Group();
    const long = ['awp', 'ak', 'm4', 'shotgun', 'mp5'].includes(kind);
    g.add(gbox(0.1, 0.1, long ? 1.0 : 0.38, kind === 'awp' ? GM.green : GM.black, 0, 0.1, 0));
    g.add(gbox(0.11, 0.18, long ? 0.28 : 0.12, kind === 'shotgun' ? GM.wood : GM.steel, 0, 0.03, long ? 0.38 : 0.12));
    g.position.set(x, 0.06, z); g.rotation.y = yaw; root.add(g); return g;
  }
  const place = (kind, x, z, yaw = 0) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  /* `kind` é ID de arma (chave de WEAPONS), não CLASSE — BUG-70 / #366. */
  const arsenal = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol', 'uzi'];
  for (const sz of [-1, 1]) arsenal.forEach((kind, i) => place(kind, -11.9 + i * 3.4, sz * 39.6, sz < 0 ? 0 : Math.PI));
  place('ak', 4, -6, 0.5); place('m4', -4, 6, -2.6);

  const blocked = (x, z, inflate = 0.45) => colliders.some(c => c.minY < 1.6 && c.maxY > 0.15 && x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate);
  const bounds = { minX: -HALF_X + 0.9, maxX: HALF_X - 0.9, minZ: -HALF_Z + 0.9, maxZ: HALF_Z - 0.9 };
  const nodes = [], adj = [], STEP = 3.2;
  for (let x = bounds.minX + 1; x <= bounds.maxX - 1; x += STEP) for (let z = bounds.minZ + 1; z <= bounds.maxZ - 1; z += STEP) if (!blocked(x, z)) nodes.push({ x, z });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.2)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) {
    adj.push([]);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz < STEP * STEP * 2.45 && segClear(nodes[i], nodes[j])) adj[i].push(j);
    }
  }
  function nearestWaypoint(x, z) { let best = 0, bd = Infinity; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1), queue = [fromIdx]; prev[fromIdx] = fromIdx;
    while (queue.length) {
      const n = queue.shift();
      for (const next of adj[n]) if (prev[next] === -1) { prev[next] = n; if (next === toIdx) { const path = [next]; let cur = n; while (cur !== fromIdx) { path.unshift(cur); cur = prev[cur]; } path.unshift(fromIdx); return path; } queue.push(next); }
    }
    return [fromIdx];
  }

  /* Flicker das fogueiras (GL3): luz e brasa oscilam juntas; a fumaça sobe em
     laço e desvanece com a altura. */
  function update(dt, time) {
    for (const f of fogueiras) {
      const osc = Math.sin(time * 9.1 + f.fase) * 0.55 + Math.sin(time * 23.7 + f.fase * 2.3) * 0.45;
      f.luz.intensity = f.base * (1 + 0.3 * osc);
      f.brasa.material.emissiveIntensity = 1.2 + 0.55 * osc;
      for (const s of f.fumaca) {
        const t = (time * 0.42 + s.off) % 2.6;
        s.sprite.position.set(s.x + Math.sin(time * 0.7 + s.off * 3) * 0.35, 1.4 + t * 2.1, s.z);
        s.sprite.scale.setScalar(1 + t * 1.15);
        s.mat.opacity = 0.22 * Math.max(0, 1 - t / 2.6);
      }
    }
  }

  /* BUG-57: galinha de quintal, caramelo sem coleira, vaca da serra — e os
     pombos da praça comem a pipoca que cai do galpão. */
  const ambience = createFavelaAmbience(root, {
    map: 'gelo',
    rats: [
      { pos: [-26, 0, -38.5], to: [-23.5, 0, -36], phase: .4 },
      { pos: [26, 0, 38.5], to: [23.5, 0, 36], phase: 1.6 },
    ],
    pigeons: [
      { mode: 'ground', pos: [6, 0, 4], phase: .2 }, { mode: 'ground', pos: [-6, 0, -4], phase: 1.0 },
      { mode: 'ground', pos: [5.2, 0, 6.6], phase: 1.9 },
    ],
    dogs: [{ pos: [-4, 0, 18], to: [4, 0, 18], phase: .5 }],
    chickens: [
      { pos: [-8, 0, -21], to: [-6.5, 0, -19.5], phase: .8 },
      { pos: [10, 0, 22], to: [8.5, 0, 20.5], phase: 2.2 },
    ],
    cows: [
      { pos: [-24, 0, -33], phase: 1.1 },
      { pos: [24, 0, 33], phase: 2.7 },
    ],
  });

  return {
    ambience, sound: { loops: [{ src: AMB_LOOPS.vento, pos: [0, 3, 0], radius: 70, vol: .24 }, { src: AMB_LOOPS.grilos, pos: [0, 3, 0], radius: 70, vol: .14 }], bioma: 'campo' },
    root, colliders, occluders, decalSolids: [root], groundHeightAt: () => 0, slowAt: () => false, update, sun, hemi, pickups,
    spawns: {
      E: [-9, -3, 3, 9].map(x => ({ x, z: -38.9, yaw: 0 })),
      B: [-9, -3, 3, 9].map(x => ({ x, z: 38.9, yaw: Math.PI })),
    },
    ctfPoints: [
      { id: 'E', label: 'GALPÃO', x: 0, z: -31 },
      { id: 'MID', label: 'FOGUEIRA', x: 0, z: 7 },
      { id: 'B', label: 'QUENTÃO', x: 0, z: 31.5 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds,
  };
}
