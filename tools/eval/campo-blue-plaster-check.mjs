// Carga anterior ou posterior ao clone: UV1, PBR e samplers da fonte preservados.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../../public/vendor/three.module.js';
const original = readFileSync(new URL('../../public/js/map_campomorro.js', import.meta.url), 'utf8');
const extract = (src, name, indent) => {
  const r = new RegExp('const ' + name + ' = (\\([^\\n]*?=> \\{[\\s\\S]*?\\n' + ' '.repeat(indent) + '\\});');
  const found = src.match(r)?.[1];
  if (!found) throw Error('INFRA: função não localizada ' + name);
  return found;
};
const sampler = t => t ? { channel: t.channel, repeat: t.repeat.toArray(), offset: t.offset.toArray(), wrapS: t.wrapS, wrapT: t.wrapT } : null;
function measure(src, loadedFirst) {
  const fallback = new THREE.Texture(), oldNormal = new THREE.Texture(), oldRough = new THREE.Texture();
  const mat = new THREE.MeshStandardMaterial({ map: fallback, normalMap: oldNormal, roughnessMap: oldRough, roughness: .94, metalness: 0 });
  const normal = new THREE.Texture(), rough = new THREE.Texture(), final = new THREE.Texture();
  mat.userData.detalhe = { normalMap: normal, roughnessMap: rough };
  const callbacks = [], loader = { load(_url, cb) { callbacks.push(cb); return final; } };
  const external = new Function('loader', 'detailFor', 'THREE', `return (${extract(src, 'external', 4)})`)(loader, () => null, THREE);
  const lam = opts => new THREE.MeshStandardMaterial({ roughness: .94, metalness: 0, ...opts });
  const repetido = new Function('lam', 'THREE', `return (${extract(src, 'repetido', 2)})`)(lam, THREE);
  external(mat, '/probe.webp', 1, 1);
  assert.equal(callbacks.length, 1, 'INFRA: um callback real é necessário');
  if (loadedFirst) callbacks[0]();
  const refs = [fallback, oldNormal, oldRough, normal, rough, final];
  const before = JSON.stringify(refs.map(sampler));
  const create = new Function('MAT', 'repetido', 'THREE', `return (${extract(src, 'criarRebocoAzul', 2)})`)({ wall: mat }, repetido, THREE);
  const blue = create();
  const sourceSamplers = before === JSON.stringify(refs.map(sampler));
  const initialChannel = ['map', 'normalMap', 'roughnessMap'].every(k => blue[k]?.channel === 1);
  const alreadyLoadedPBR = !loadedFirst || (blue.normalMap !== normal && blue.normalMap?.source === normal.source && blue.roughnessMap !== rough && blue.roughnessMap?.source === rough.source);
  if (!loadedFirst) callbacks[0]();
  const slots = { map: final, normalMap: normal, roughnessMap: rough };
  return {
    sourceSamplers,
    initialChannel,
    alreadyLoadedPBR,
    finalChannel: Object.keys(slots).every(k => blue[k]?.channel === 1),
    finalPBR: Object.entries(slots).every(([k, t]) => blue[k] !== t && blue[k]?.source === t.source),
    finalSampler: Object.keys(slots).every(k => blue[k]?.repeat.equals(new THREE.Vector2(1, 1)) && blue[k]?.offset.equals(new THREE.Vector2()) && blue[k]?.wrapS === THREE.RepeatWrapping && blue[k]?.wrapT === THREE.RepeatWrapping),
    normalScale: blue.normalScale.equals(mat.normalScale),
    registered: mat.userData.clones.filter(m => m === blue).length === 1,
  };
}
const rows = src => [false, true].map(loadedFirst => ({ loadedFirst, clauses: measure(src, loadedFirst) }));
const red = results => results.flatMap(r => Object.entries(r.clauses).filter(([, v]) => !v).map(([k]) => `${r.loadedFirst ? 'loaded' : 'pending'}:${k}`));
const replaceOnce = (src, from, to) => { assert.equal(src.split(from).length - 1, 1, 'INFRA: âncora mutante única'); return src.replace(from, to); };
try {
  const nominal = rows(original); assert.deepEqual(red(nominal), []);
  console.log(JSON.stringify({ nominal, scope: 'funções reais; transporte de imagem simulado; não aprova pixels' }));
  const cases = [
    ['callback-canal', src => replaceOnce(replaceOnce(src, 'if (c.userData.uvChannel != null) c.map.channel = c.userData.uvChannel;', ''), 'if (c.userData.uvChannel != null) d.channel = c.userData.uvChannel;', ''), 'pending:finalChannel'],
    ['criacao-canal', src => replaceOnce(src, 'm[slot].channel = 1;', ''), 'loaded:initialChannel'],
    ['criacao-pbr', src => replaceOnce(src, "if (slot !== 'map') m[slot] = t.clone();", "if (slot !== 'map') continue;"), 'loaded:alreadyLoadedPBR'],
    ['cache-sampler', src => replaceOnce(src, "if (slot !== 'map') m[slot] = t.clone();", "if (slot !== 'map') m[slot] = t;"), 'loaded:sourceSamplers'],
    ['repeat', src => replaceOnce(src, 'm[slot].repeat.set(1, 1);', 'm[slot].repeat.set(2, 2);'), 'loaded:finalSampler'],
  ];
  for (const [name, mutate, expected] of cases) {
    const failures = red(rows(mutate(original)));
    assert(failures.includes(expected), `${name}: cláusula causal ausente ${expected}: ${failures}`);
    console.log(`${name} DETECTADO: ${expected}`);
  }
} catch (e) { console.error(e.stack); process.exitCode = 1; }
