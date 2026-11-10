/* Proxies de movimento permanecem físicos; a bala registra somente superfícies renderizadas. */
// Indexador injetado pelo game.js: este módulo fica sem `three` no grafo (réguas o importam antes do harness).
let indexStaticRaycast = null;
export const usarIndiceEstatico = (fn) => { indexStaticRaycast = fn; };
// ?occindex=0 devolve o raycast linear (A/B e mutante da régua bots-perf).
const INDICE_OCCLUDER = new URLSearchParams(globalThis.location?.search || '').get('occindex') !== '0';
// O proxy do índice nasce com UUID do three (Math.random): não pode gastar o sorteio semeado
// das réguas e do servidor — senão spawn e arma mudam só por indexar.
let _passo = 0;
const semSorteio = () => (_passo = (_passo + 0.6180339887498949) % 1);
const guarded = new WeakSet();
const construtores = new WeakMap();
const renders = material => material && material.visible !== false && material.colorWrite !== false && (material.opacity ?? 1) > 0;
const visibleNode = object => {
  for (let node = object; node; node = node.parent) if (node.visible === false) return false;
  return true;
};
export function isVisibleShotObject(object) {
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  return visibleNode(object) && materials.some(renders);
}
export function withVisibleShotOccluders(build) {
  const registrado = construtores.get(build);
  if (registrado) return registrado;
  const wrapped = (...args) => {
    const world = build(...args);
    const meshes = [], seen = new Set();
    const include = object => {
      if (!seen.has(object) && isVisibleShotObject(object)) { seen.add(object); meshes.push(object); }
    };
    for (const object of world.occluders) {
      if (object.material) include(object);
      else object.traverse?.(node => { if (node.isMesh) include(node); });
    }
    world.occluders = meshes;
    for (const object of world.occluders) {
      if (guarded.has(object)) continue;
      // Malha sem raycast próprio ganha o índice estático: mesmos acertos, menos triângulos testados.
      if (INDICE_OCCLUDER && indexStaticRaycast && object.isMesh && !Object.prototype.hasOwnProperty.call(object, 'raycast')) {
        const sorteio = Math.random;
        Math.random = semSorteio;
        try { indexStaticRaycast(object); } finally { Math.random = sorteio; }
      }
      const raycast = object.raycast;
      object.raycast = function (raycaster, hits) {
        if (!visibleNode(this)) return;
        const start = hits.length; raycast.call(this, raycaster, hits);
        let next = start;
        for (let index = start; index < hits.length; index++) {
          const hit = hits[index];
          const materials = hit.object.material;
          const material = Array.isArray(materials) ? materials[hit.face?.materialIndex ?? 0] : materials;
          if (renders(material)) hits[next++] = hit;
        }
        hits.length = next;
      };
      guarded.add(object);
    }
    return world;
  };
  Object.defineProperty(wrapped, 'name', { value: build.name });
  construtores.set(build, wrapped);
  return wrapped;
}
