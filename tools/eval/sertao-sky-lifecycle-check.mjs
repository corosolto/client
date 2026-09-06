// Crítica main226: Color virou DataTexture de 2 MiB por build, sem teardown.
// Mede alocação/reuso pelo applyLook real; não estima memória de GPU nem julga pixels.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import * as THREE from '../../public/vendor/three.module.js';
import { LOOK } from '../../public/js/look.js';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const expected = { 'sem-cache': ['SK1'], 'cache-global': ['SK2'] };
if (mutant && !expected[mutant]) throw Error('Mutante desconhecido');
let source = readFileSync(new URL('../../public/js/map_sky.js', import.meta.url), 'utf8');
if (mutant) {
  const original = source;
  if (mutant === 'sem-cache') source = source.replace('proceduralSkies.get(L)', 'undefined');
  else source = source.replace('proceduralSkies.get(L)', 'proceduralSkies.get(LOOK.velho_oeste)')
    .replace('proceduralSkies.set(L, tex)', 'proceduralSkies.set(LOOK.velho_oeste, tex)');
  if (source === original) throw Error('Mutante não aplicado: acesso ao cache mudou');
}
source = source.replace(/^import .*;.*$/mg, '').replace(/^export /mg, '');
const alternate = JSON.parse(JSON.stringify(LOOK.velho_oeste));
alternate.horizonte = 0x214b8d;
alternate.zenite = 0xb4d6f0;
const looks = { ...LOOK, lifecycle_alternate: alternate };
const applyLook = runInNewContext(`${source}; applyLook`, {
  THREE, LOOK: looks, VERSION: 'lifecycle-probe',
  makeAerialFog() { throw Error('O teste precisa pedir nofog:true'); },
});
function build(id) {
  const scene = new THREE.Scene();
  const result = applyLook(scene, {}, id, { nofog: true });
  if (!result || !scene.background?.isDataTexture || !scene.background.image?.data?.byteLength) {
    throw Error('applyLook não produziu DataTexture mensurável');
  }
  if (scene.background.mapping !== THREE.EquirectangularReflectionMapping ||
      scene.userData.skySource?.kind !== 'procedural') throw Error('Binding de céu procedural ausente');
  return scene;
}
const repeated = Array.from({ length: 4 }, () => build('velho_oeste'));
const textures = new Set(repeated.map(scene => scene.background));
const first = repeated[0].background;
const alternateScenes = [build('lifecycle_alternate'), build('lifecycle_alternate')];
const again = build('velho_oeste').background;
const digest = texture => createHash('sha256').update(texture.image.data).digest('hex');
const uniqueBytes = [...textures].reduce((sum, texture) => sum + texture.image.data.byteLength, 0);
const checks = [
  { id: 'SK1', ok: textures.size === 1 && again === first, builds: repeated.length,
    returnToOriginalSame: again === first,
    uniqueTextures: textures.size, uniqueBytes, bytesPerTexture: first.image.data.byteLength,
    meaning: 'Reconstruções do mesmo LOOK reutilizam uma textura persistente.' },
  { id: 'SK2', ok: alternateScenes.every(scene => scene.background !== first) &&
      alternateScenes.every(scene => digest(scene.background) !== digest(first)),
    distinctLook: alternateScenes[0].background !== first,
    distinctPixels: digest(alternateScenes[0].background) !== digest(first),
    meaning: 'O cache preserva configurações e cores diferentes entre LOOKs.' },
];
const failed = checks.filter(check => !check.ok).map(check => check.id);
console.log(JSON.stringify({ mutant: mutant || null, checks, failed }, null, 2));
process.exitCode = mutant ? +(JSON.stringify(failed) !== JSON.stringify(expected[mutant])) : +!!failed.length;
