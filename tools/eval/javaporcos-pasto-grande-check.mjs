import assert from 'node:assert/strict';
import { THREE, initTextures, bootGame } from './harness.mjs';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && !['pasto-curto', 'terreno-afundado', 'diagonal-antiga'].includes(mutante)) throw Error(`mutante desconhecido: ${mutante}`);
const game = bootGame('invasao_javaporcos', { textures: initTextures(), seed: 77 });
const world = game.world, troncos = world.root.getObjectByName('mata-troncos');
assert.ok(troncos?.isInstancedMesh && troncos.count, 'mata real ausente');
const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
const raios = [];
for (let i = 0; i < troncos.count; i++) {
  troncos.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
  if (mutante === 'pasto-curto') {
    const maior = Math.max(Math.abs(point.x), Math.abs(point.z));
    const escala = (maior - 10) / maior;
    point.x *= escala; point.z *= escala;
    matrix.setPosition(point); troncos.setMatrixAt(i, matrix);
  }
  raios.push(Math.max(Math.abs(point.x), Math.abs(point.z)));
}
const cidade = Math.max(Math.abs(world.cityBounds.minX), world.cityBounds.maxX);
const largura = Math.min(...raios) - cidade;
const profundidade = world.bounds.maxX - cidade - largura;
const terrenos = world.root.children.filter(o => /^chao-(pasto|terreno)$/.test(o.name));
if (mutante === 'diagonal-antiga') for (const o of terrenos) {
  const g = o.geometry, nx = g.parameters.widthSegments, nz = g.parameters.heightSegments;
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = ix + (nx + 1) * iz, b = a + nx + 1, c = b + 1, d = a + 1;
    [a, b, d, b, c, d].forEach((v, i) => g.index.setX((iz * nx + ix) * 6 + i, v));
  }
}
if (mutante === 'terreno-afundado') for (const o of terrenos) o.position.y -= 0.5;
world.root.updateMatrixWorld(true);
const raio = new THREE.Raycaster(), baixo = new THREE.Vector3(0, -1, 0);
let erro = 0, pior = null;
for (let x = -67.5; x <= 67.5; x += 1.5) for (let z = -67.5; z <= 67.5; z += 1.5) {
  if (Math.max(Math.abs(x), Math.abs(z)) < cidade) continue;
  const y = world.groundHeightAt(x, z);
  raio.set(new THREE.Vector3(x, y + 3, z), baixo); raio.far = 6;
  const hit = raio.intersectObjects(terrenos, false)[0];
  assert.ok(hit, `terreno ausente em ${x},${z}`);
  const delta = Math.abs(hit.point.y - y);
  if (delta > erro) { erro = delta; pior = [x, z]; }
}
let ok = true;
try {
  // Pedido 4 do PROMPT-CODEX-JAVAPORCOS: campo de 16–20 m, preservando o cinturão de mata.
  assert.ok(largura >= 16, `pasto real só ${largura.toFixed(2)} m (mínimo solicitado 16 m)`);
  assert.ok(profundidade >= 14, `mata encolheu para ${profundidade.toFixed(2)} m (cinturão anterior 14 m)`);
  assert.ok(troncos.count >= 940, `mata menor: ${troncos.count} árvores, antes 940`);
  assert.equal(world.horda.frentes.length, 6);
  // Mesma folga física de CHAO1/MAP1, cobrindo solo acima e abaixo dos pés.
  assert.ok(erro <= 0.30, `erro absoluto do chão ${erro.toFixed(3)} m em ${pior}`);
} catch (e) { ok = false; console.error(`✗ PASTO GRANDE: ${e.message}`); }
console.log(`CHÃO: erro absoluto ${erro.toFixed(3)} m em ${pior}`);
console.log(`PASTO GRANDE: largura ${largura.toFixed(2)} m, mata ${profundidade.toFixed(2)} m, ${troncos.count} árvores`);
process.exitCode = mutante ? (ok ? 1 : 0) : (ok ? 0 : 1);
