// Física real do mapa com registro de templates instrumentado; sem afirmar fidelidade visual dos GLBs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THREE, initTextures } from './harness.mjs';

const url = new URL('../../public/js/map_operacao_flavio.js', import.meta.url);
let source = readFileSync(url, 'utf8');
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
const edits = {
  'fallback-solido': ['fallback[2], mats.metal, false);', 'fallback[2], mats.metal, true);'],
  'proxy-so-glb': ['const colliderDoProp = (id, x, y, z, w, h, d) => {', 'const colliderDoProp = (id, x, y, z, w, h, d) => { if (!templates.has(id)) return;'],
};
if (mutant) {
  const edit = edits[mutant];
  assert.ok(edit, 'mutante conhecido');
  assert.equal(source.split(edit[0]).length, 2, 'alvo único');
  source = source.replace(...edit);
  console.log('Mutação aplicada: '+mutant);
}
source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) =>
  'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
source += '\nexport function fixtureTemplates(template) { templates.clear(); if(template) for(const id of Object.keys(PROP_FILES)) templates.set(id,template); }';
const { buildOperacaoFlavio, fixtureTemplates } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const textures = initTextures();
const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
const world = loaded => {
  fixtureTemplates(loaded ? template : null);
  return buildOperacaoFlavio(new THREE.Scene(), textures);
};
const fallback = world(false), loaded = world(true);
const blocked = (map, x, z) => map.colliders.some(c => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.minY < 1.8 && c.maxY > .1);
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('ok '+name); }
  catch(error) { failures++; console.error('FALHA '+name+': '+error.message); }
};
try {
  check('loaded-fallback-identical-colliders', () => {
    assert.deepEqual(fallback.colliders, loaded.colliders);
  });
  for (const x of [-17, 17]) check('terminal-door-'+x, () => {
    assert.equal(blocked(loaded, x, -15.82), false, 'controle carregado abre a porta');
    assert.equal(blocked(fallback, x, -15.82), false, 'fallback também abre a porta');
  });
  check('plane-proxy-independent-of-template', () => {
    assert.equal(blocked(loaded, 5, 55), false);
    assert.equal(blocked(fallback, 5, 55), false);
    assert.equal(blocked(loaded, 0, 56), true);
    assert.equal(blocked(fallback, 0, 56), true);
  });
} finally {
  fixtureTemplates(null); fallback.dispose?.(); loaded.dispose?.();
  template.geometry.dispose(); template.material.dispose();
}
process.exitCode = failures ? 1 : 0;
