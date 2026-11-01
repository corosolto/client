/* Resolve `three` e `three/addons/*` para a cópia vendida do jogo (public/vendor),
 * sem mutar node_modules (crítica estraga-codigo no #1170: o shim apagava o pacote
 * real). Registro via `node --import ./tools/eval/vm-hand-three-register.mjs`. */
import { pathToFileURL } from 'node:url';

const RAIZ = new URL('../../', import.meta.url);
const THREE = new URL('public/vendor/three.module.js', RAIZ);
const ADDONS = new URL('public/vendor/', RAIZ);

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: THREE.href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) {
    return { url: new URL(specifier.slice('three/'.length), ADDONS).href, shortCircuit: true };
  }
  return next(specifier, context);
}
