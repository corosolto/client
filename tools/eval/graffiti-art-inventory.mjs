// As funções são serializadas no browser; a procedência não depende de OCR.
export function identifyGraffitiTexture(texture, canvasSources) {
  const image = texture?.source?.data || texture?.image;
  const canvas = image && canvasSources?.get(image);
  if (canvas) return { ...canvas, kind: 'canvas' };
  const src = typeof image?.src === 'string' ? image.src : '';
  if (!src) return null;
  let path;
  try { path = new URL(src, 'http://inventory.invalid/').pathname; } catch { return null; }
  if (/\/img\/decals\//.test(path)) return { kind: 'image', path, family: 'decal' };
  if (/\/posters\//.test(path)) return { kind: 'image', path, family: 'decal' };
  if (/\/img\/textures\/(corrego_streetart_pixo|campomorro_streetart_baile)\.webp$/.test(path))
    return { kind: 'image', path, family: 'painted-texture' };
  return null;
}

export function inventoryGraffitiMaterials(root, THREE, predicate, identify, canvasSources) {
  const entries = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position || !(mesh.layers.mask & 1)) return;
    for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    const geometry = mesh.geometry, count = geometry.index?.count ?? geometry.attributes.position.count;
    const start = geometry.drawRange.start, end = Math.min(count, start + geometry.drawRange.count);
    if (end - start < 3 || (mesh.isInstancedMesh && !mesh.count)) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const ancestors = []; let declared = false;
    for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) {
      ancestors.push({ name: ancestor.name, type: ancestor.type,
        nonSolidSurface: !!ancestor.userData.nonSolidSurface,
        graffitiSupportExcluded: !!ancestor.userData.graffitiSupportExcluded });
      if (/^(decal:|mural:|poster:)/.test(ancestor.name || '')) declared = true;
    }
    for (let materialIndex = 0; materialIndex < materials.length; materialIndex++) {
      const material = materials[materialIndex], artwork = identify(material?.map, canvasSources);
      // Opacity0 com NoBlending ou NormalBlending opaco ainda escreve RGB.
      // Mesmo predicado da medição; contrato em GRAFITE-REGUA.md.
      const desenhaRGB = material.opacity > 0 || material.blending === THREE.NoBlending
        || (material.blending === THREE.NormalBlending && material.transparent === false);
      if (!artwork || material.visible === false || material.colorWrite === false || !desenhaRGB) continue;
      const drawn = !Array.isArray(mesh.material) || geometry.groups.some(g => g.materialIndex === materialIndex
        && Math.min(end, g.start + g.count) - Math.max(start, g.start) >= 3);
      if (!drawn) continue;
      const classification = declared ? 'declared-overlay'
        : artwork.family === 'decal' || geometry.type === 'PlaneGeometry' ? 'unclassified-overlay' : 'painted-surface';
      const bbox = new THREE.Box3().setFromObject(mesh);
      const image = material.map?.source?.data || material.map?.image;
      const pixels = { width: image?.naturalWidth ?? image?.videoWidth ?? image?.width ?? 0,
        height: image?.naturalHeight ?? image?.videoHeight ?? image?.height ?? 0 };
      entries.push({ mesh: mesh.name, meshUUID: mesh.uuid, materialUUID: material.uuid, materialIndex,
        geometry: geometry.type, instances: mesh.isInstancedMesh ? mesh.count : 1, artwork,
        pixels, visibleArtwork: pixels.width >= 1 && pixels.height >= 1 && material.map?.userData?.faltou !== true,
        classification, eligibleSurface: predicate(mesh), ancestors,
        needsWallReview: classification === 'unclassified-overlay',
        bbox: bbox.isEmpty() ? null : { min: bbox.min.toArray(), max: bbox.max.toArray() } });
    }
  });
  return entries;
}

export function trackGraffitiCanvases(ranges) {
  const sources = globalThis.__graffitiCanvasSources ||= new WeakMap();
  const checkedStroke = new WeakSet();
  for (const prototype of [globalThis.CanvasRenderingContext2D?.prototype,
    globalThis.OffscreenCanvasRenderingContext2D?.prototype].filter(Boolean)) {
    for (const method of ['stroke', 'fillText', 'strokeText', 'drawImage']) {
      const original = prototype[method];
      if (typeof original !== 'function' || original.graffitiInventoryWrapped) continue;
      const wrapped = function (...args) {
        if (this.canvas && !sources.has(this.canvas)) {
          let provenance = method === 'drawImage' && sources.get(args[0]);
          if (!provenance && (method !== 'stroke' || !checkedStroke.has(this.canvas))) {
            if (method === 'stroke') checkedStroke.add(this.canvas);
            const stack = new Error().stack || '';
            const line = Number(stack.match(/\/textures\.js(?:\?[^:\s)]*)?:(\d+):/)?.[1]);
            const producer = /\bpixacaoTex\b/.test(stack) ? 'pixacaoTex'
              : /\bpixoLine\b/.test(stack) ? 'pixoLine'
                : line >= ranges.graffitiStart && line <= ranges.graffitiEnd ? 'T.graffiti' : null;
            if (producer) provenance = { producer, source: 'canvas-draw-call', line: line || null };
          }
          if (provenance) sources.set(this.canvas, provenance);
        }
        return original.apply(this, args);
      };
      wrapped.graffitiInventoryWrapped = true;
      prototype[method] = wrapped;
    }
  }
}
