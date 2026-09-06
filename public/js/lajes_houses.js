import * as THREE from 'three';
import { StaticBatch, PROP_BATCH } from './mapprops.js';
import { indexLajesRaycast } from './lajes_raycast_index.js';

// Dimensões e materiais: docs/maps/LAJES-V4-ESCALA.md; cada porta mantém sua escala.
export function lajesArchitecture(root, colliders, occluders, T) {
  const batch = PROP_BATCH ? new StaticBatch({ name: 'lajes-alvenaria' }) : null;
  const backgroundBatches = new Map(); let activeBatch = batch;
  const disposeRaycasts = [];
  const textures = new Map(), materials = new Map(), doors = [], signMaterials = new Set();
  const texture = (path, color = true) => {
    if (typeof document === 'undefined') return T.concrete;
    if (!textures.has(path)) {
      const t = new THREE.TextureLoader().load(path);
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4; textures.set(path, t);
    }
    return textures.get(path);
  };
  const material = (name, color, path = '', tile = [2, 2], roughness = .92) => {
    if (!materials.has(name)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness,
        map: path ? texture(`/img/textures/${path}`) : null });
      if (/^(pbr_concrete046|pbr_paintedplaster017|lajes_tijolo_baiano)_color/.test(path)) {
        m.normalMap = texture(`/img/textures/${path.replace('_color', '_normal')}`, false);
        m.normalScale.set(.65, .65);
        if (path.startsWith('pbr_')) m.roughnessMap = texture(`/img/textures/${path.replace('_color', '_rough')}`, false);
      }
      m.name = name; m.userData.tile = tile; materials.set(name, m);
    }
    return materials.get(name);
  };
  const M = {
    concrete: material('concrete', 0xc4bbae, 'pbr_concrete046_color.webp', [3, 3]),
    brick: material('brick', 0xc18b71, 'lajes_tijolo_baiano_color.webp', [1.2, 2]),
    ground: material('ground', 0xc5a181, 'velho_oeste/dirt-real-v1.webp', [2.8, 2.8]),
    paving: material('paving', 0xd0ac85, 'velho_oeste/dirt-real-v1.webp', [2.8, 2.8]),
    steel: material('steel', 0x4a554f, '', [1, 1], .7),
    dark: material('recess', 0x242d30, '', [1, 1], .75),
    timber: material('timber', 0x755335), blue: material('tank', 0x21698d),
    zinc: material('zinc', 0xa0a7a2, 'tex_zinco.webp', [2, 2], .78),
    cream: material('cream', 0xe1d2b5, 'pbr_paintedplaster017_color.webp'),
    adobe: material('adobe', 0xc0a78c, 'pbr_paintedplaster017_color.webp'),
    ochre: material('ochre', 0xc3a675, 'pbr_paintedplaster017_color.webp'),
    rose: material('rose', 0xc8a69a, 'pbr_paintedplaster017_color.webp'),
    sage: material('sage', 0xaca288, 'pbr_paintedplaster017_color.webp'),
  };
  function box(w, h, d, x, y, z, mat, options = {}) {
    const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position, n = g.attributes.normal;
    const uv = g.attributes.uv, tile = mat.userData.tile || [1, 1];
    for (let i = 0; i < p.count; i++) {
      const u = Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i);
      const v = Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i);
      uv.setXY(i, u / tile[0], v / tile[1]);
    }
    const mesh = new THREE.Mesh(g, mat); mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = options.cast !== false; mesh.receiveShadow = true;
    if (options.tag) mesh.userData[options.tag] = true;
    if (options.solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2,
      minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2, ...options.collider });
    if (activeBatch && !options.keep) {
      mesh.updateMatrix(); activeBatch.add(g, mesh.matrix, mat, { cast: mesh.castShadow }); g.dispose();
    } else { root.add(mesh); if (options.bullet !== false) occluders.push(mesh); }
    return mesh;
  }
  function sign(text, w, h, x, y, z, yaw = 0, bg = '#254e50', fg = '#f3e6c9') {
    let mat = M.cream;
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = 768; c.height = Math.round(768 * h / w);
      const ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.min(c.height * .42, 92)}px sans-serif`;
      ctx.fillText(text, c.width / 2, c.height / 2, c.width - 44);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshStandardMaterial({ map: t, roughness: .93 }); signMaterials.add(mat);
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; root.add(mesh); return mesh;
  }
  function home({ x, z, w, d, h, color, facing, number, shop = '', stories = 1, roofSlab = 0, frontEnabled = true }) {
    const wall = M[color], sx = Math.sign(facing), front = x - sx * w / 2;
    const body = box(w, h - roofSlab, d, x, 0, z, wall, { solid: true,
      collider: { maxY: h, casa: 'lajes-unidade-terrea', casaH: h, casaFrente: d, casaFundo: w, casaRy: sx * Math.PI / 2 } });
    const side = (depth, height, length, offset, y, mat, options = {}) =>
      box(depth, height, length, front - sx * offset, y, z, mat, options);
    if (frontEnabled) {
    side(.035, .38, d, .015, 0, M.concrete);
    for (const dz of [-d / 2 + .08, d / 2 - .08])
      box(.11, h, .14, front - sx * .025, 0, z + dz, M.concrete);
    side(.15, .16, d, .035, h - .18, M.concrete);
    const variant = number % 3, flip = variant === 1 ? -1 : 1;
    const doorZ = z - d * .28 * flip, windowZ = z + d * .19 * flip;
    if (color !== 'brick' && number % 4 === 0) for (let patch = 0; patch < 5; patch++)
      box(.028, .34 + ((patch + number) % 3) * .16, d / 5 + .01,
        front - sx * .035, .32, z - d / 2 + (patch + .5) * d / 5, M.brick);
    box(.10, 2.18, 1.06, front - sx * .025, .01, doorZ, M.concrete);
    const door = box(.035, 2.05, .90, front - sx * .095, .035, doorZ, M.steel,
      { keep: true, tag: 'lajesDoor' });
    door.userData.facadeNormal = [-sx, 0, 0];
    doors.push(door);
    for (let t = 0; t < (variant === 2 ? 3 : 6); t++) box(.045, .018, .78, front - sx * .12, .20 + t * (variant === 2 ? .58 : .29), doorZ, M.dark);
    box(.05, .14, .045, front - sx * .14, .93, doorZ + .31, M.cream);
    box(.40, .07, 1.1, front - sx * .15, 0, doorZ, M.concrete);
    const windowW = [1.1, 1.35, .95][variant], windowH = [1.05, .95, 1.20][variant];
    if (!shop) {
    box(.12, windowH + .18, windowW + .2, front - sx * .025, .87, windowZ, M.concrete);
    box(.045, windowH, windowW, front - sx * .10, .97, windowZ, M.dark);
    for (const dz of (variant === 1 ? [-.5, .5] : [-.4, 0, .4])) box(.06, windowH, .027, front - sx * .13, .96, windowZ + dz, M.steel);
    for (const yy of (variant === 1 ? [1.08, 1.72] : [1.03, 1.50, 1.98])) box(.06, .028, windowW, front - sx * .13, yy, windowZ, M.steel);
    box(.30, .07, windowW + .28, front - sx * .12, .87, windowZ, M.concrete);
    if (variant === 1) for (const dz of [-.92, .92])
      box(.08, 1.15, .48, front - sx * .10, .96, windowZ + dz, M.timber);
    } else {
      box(.05, 1.55, 2.65, front - sx * .10, .85, windowZ, M.dark);
      box(.45, .10, 2.85, front - sx * .22, .86, windowZ, M.timber);
      box(.1, .18, 2.80, front - sx * .12, 2.36, windowZ, M.zinc);
      if (shop.startsWith('MERCEARIA')) for (let i = 0; i < 7; i++)
        box(.09, .08, 2.62, front - sx * .14, 1.79 + i * .08, windowZ, M.steel);
      for (let i = 0; i < 5; i++) box(.12, .22 + (i % 2) * .06, .1,
        front - sx * .18, .96, windowZ - .85 + i * .40, [M.ochre, M.adobe, M.rose][i % 3]);
    }
    if (variant === 2 && !shop) {
      box(.76, .07, 2.4, front - sx * .28, 2.25, windowZ, M.zinc);
      for (const dz of [-1.08, 1.08]) box(.045, .40, .045, front - sx * .57, 1.91, windowZ + dz, M.steel);
    }
    box(.10, .26, .22, front - sx * .10, 1.50, z - d * .05, M.steel);
    box(.032, h - 1.65, .035, front - sx * .12, 1.65, z - d * .05, M.steel);
    box(.8, .07, shop ? d - .35 : 1.45, front - sx * .34, 2.29, shop ? z : doorZ, M.zinc);
    const yaw = -sx * Math.PI / 2;
    sign(shop || `${number}`, shop ? d - .35 : .24, shop ? .40 : .19,
      front - sx * .14, shop ? 2.65 : 1.95, shop ? z : z - .1, yaw,
      shop ? '#385d55' : '#d9d6c5', shop ? '#f0deae' : '#25322e');
    }
    // Os fundos também dão para o beco: vãos, vergas e instalações em escala humana.
    const back = x + sx * w / 2;
    box(.08, 1.16, 1.4, back + sx * .025, .91, z + .8, M.concrete);
    box(.035, .99, 1.2, back + sx * .09, 1.0, z + .8, M.dark);
    for (const dz of [-.5, 0, .5]) box(.04, 1.0, .025, back + sx * .12, 1, z + .8 + dz, M.steel);
    box(.20, .08, 1.45, back + sx * .07, .91, z + .8, M.concrete);
    box(.07, 2.07, .94, back + sx * .05, .02, z - 1.5, M.timber);
    for (const dz of [-d / 2 + .08, d / 2 - .08]) box(.12, h, .16, back + sx * .01, 0, z + dz, M.concrete);
    for (let floor = 1; frontEnabled && floor < stories; floor++) {
      const y = floor * 3.0, finish = [M.brick, M.cream, M.ochre, M.adobe][(number + floor) % 4];
      side(.025, 2.78, d - .20, .045, y + .12, finish);
      side(.19, .19, d, .06, y - .05, M.concrete);
      for (const dz of [-d * .26, d * .26]) {
        box(.13, 1.3, 1.45, front - sx * .09, y + .83, z + dz, M.concrete);
        box(.035, 1.12, 1.23, front - sx * .17, y + .92, z + dz, M.dark);
        box(.055, 1.13, .035, front - sx * .20, y + .92, z + dz, M.steel);
        box(.32, .07, 1.5, front - sx * .15, y + .81, z + dz, M.concrete);
        if ((number + floor) % 2) {
          box(.50, .08, 1.7, front - sx * .22, y + 2.22, z + dz, M.zinc);
          for (const k of [-.55, 0, .55]) box(.04, .62, .025, front - sx * .36, y + .88, z + dz + k, M.steel);
          box(.045, .03, 1.2, front - sx * .36, y + 1.48, z + dz, M.steel);
        }
      }
    }
    if (frontEnabled && stories > 1) {
      side(.16, .27, d, .04, h - .12, M.concrete);
      for (const dz of [-d / 2 + .12, d / 2 - .12]) {
        box(.16, h, .18, front - sx * .07, 0, z + dz, M.concrete);
        for (const shift of [-.04, .04]) box(.012, .48, .012, front - sx * .07 + shift, h, z + dz, M.steel);
      }
    }
    return body;
  }
  function backgroundHome({ x, y, z, w, d, floors, side, seed, axis = 'x' }) {
    const previousBatch = activeBatch, key = `${Math.floor(x / 24)}:${Math.floor(z / 24)}`;
    if (batch) {
      if (!backgroundBatches.has(key)) backgroundBatches.set(key, new StaticBatch({ name: `lajes-entorno-${key}` }));
      activeBatch = backgroundBatches.get(key);
    }
    const nx = axis === 'x' ? -side : 0, nz = axis === 'z' ? -side : 0;
    const ux = axis === 'z' ? 1 : 0, uz = axis === 'x' ? 1 : 0;
    const depth = axis === 'x' ? w : d, frontWidth = axis === 'x' ? d : w;
    const facade = (width, height, thick, u, yy, n, mat) => box(axis === 'x' ? thick : width,
      height, axis === 'x' ? width : thick, x + nx * n + ux * u, yy, z + nz * n + uz * u, mat);
    const colors = [M.brick, M.cream, M.brick, M.rose, M.ochre, M.adobe, M.sage];
    for (let f = 0; f < floors; f++) {
      const setback = f === floors - 1 && seed % 3 ? .45 : 0, level = y + f * 2.85;
      box(w - setback, 2.85, d - setback, x, level, z, colors[(seed + f * 2) % colors.length]);
      const face = (depth - setback) / 2;
      facade(frontWidth - setback, .14, .15, 0, level + 2.70, face + .025, M.concrete);
      for (const u of [-frontWidth * .26, frontWidth * .26]) {
        const width = 1.0 + (seed % 3) * .09, sill = .88 + (seed % 2) * .08;
        facade(width + .16, 1.23, .10, u, level + sill - .08, face + .035, M.concrete);
        facade(width, 1.08, .035, u, level + sill, face + .105, M.dark);
        facade(.035, 1.08, .055, u + (seed % 2 ? .18 : 0), level + sill, face + .13, M.steel);
        if ((seed + f) % 3 === 0) {
          facade(width + .35, .07, .55, u, level + sill - .10, face + .20, M.concrete);
          facade(width + .30, .03, .05, u, level + sill + .42, face + .43, M.steel);
          for (const shift of [-.45, 0, .45]) facade(.025, .5, .035, u + shift, level + sill - .07, face + .43, M.steel);
        }
      }
      if (seed % 2) facade(.18, 2.85, .15, -frontWidth / 2 + .12, level, face + .02, M.concrete);
    }
    const roof = y + floors * 2.85;
    box(w + .16, .12, d + .16, x, roof, z, M.concrete);
    if (seed % 3 === 0) {
      box(w * .65, 1.8, d * .48, x + w * .10, roof + .12, z, M.brick);
      box(w * .7, .09, d * .55, x + w * .10, roof + 1.92, z, M.zinc);
    }
    for (const u of [-frontWidth / 2 + .12, frontWidth / 2 - .12])
      facade(.025, .45, .025, u, roof, depth / 2, M.steel);
    activeBatch = previousBatch;
  }
  function flush() {
    if (batch) for (const mesh of batch.build(root)) {
      occluders.push(mesh); disposeRaycasts.push(indexLajesRaycast(mesh));
    }
    for (const background of backgroundBatches.values()) occluders.push(...background.build(root));
    // Os lotes imóveis usam também AABB antes da interseção dos triângulos.
    for (const mesh of occluders) mesh.geometry?.computeBoundingBox();
  }
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    for (const disposeRaycast of disposeRaycasts) disposeRaycast();
    for (const m of signMaterials) { m.map?.dispose(); m.dispose(); }
    for (const t of textures.values()) t.dispose();
    for (const m of materials.values()) m.dispose();
  };
  return { M, box, home, sign, material, backgroundHome, flush, doors, dispose };
}
