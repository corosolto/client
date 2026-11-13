// Apenas recursos criados para uma instancia; templates e texturas continuam no cache.
const owned = new WeakSet();
export function ownVmResource(resource) { owned.add(resource); return resource; }
export function isVmResource(resource) { return Boolean(resource) && owned.has(resource); }
