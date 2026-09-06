/* ESCADAO CASA CENTRAL — regressão do relato humano de 07/09 em 3:2 (PR #529):
   "a casa central fechada, sem janela útil voltada à escada ou ao respawn, e um
   grande vazio no piso interior".

   CAUSA (map_escadao.js, laje da boca do escadão): com GLB_ON (default do
   navegador) a geminada oeste virava o molde fechado `escadao_casa_r3` +
   colisor monolítico + `continue`; as paredes segmentadas com portas e janelas
   só existiam no fallback. Toda régua anterior rodava em node, onde o GLB não
   carrega — media o fallback e passava verde (Lição 3 da LICOES.md).

   Aqui o molde fechado é REGISTRADO antes do boot via `registerPropTemplate`
   (BUG-72): a branch GLB_ON executa de verdade e a medição vê o mundo que o
   navegador serve. O template é um sólido fechado — a silhueta fiel do molde
   que o dono viu fechado.

   Cláusulas:
   1. Nenhum prop `escadaoMint` mora nas geminadas da laje — o shell procedural
      é autoritativo no runtime.
   2. Janela REAL na face norte da geminada leste (a que encosta na boca do
      escadão): olho ocupável dentro, alvo ocupável na escada, tiro livre por
      malha visível E occluders; fechado fora da abertura.
   3. Piso interior contínuo: groundHeightAt == 2.75 em toda a planta das
      geminadas, cápsula 0.38 parada em pé e malha visível sob os pés (o vazio
      que o dono viu era a cauda da geminada leste sem laje).
   4. Entrada alcançável: cadeia _retaAndavel (r=0.38, degrau 0.30) do patamar
      pela passarela até o interior da geminada oeste, ida e volta.
   5. Sem spawn-to-spawn: olhos do interior não leem slot de nascimento.

   MUTANTES (têm que acender a cláusula certa):
     --mutante=glb-fechado  recoloca o molde fechado sobre a janela (o estado
                             que o `continue` produzia) → cláusulas 1 e 2 vermelhas
     --mutante=sem-piso     derruba o interior das geminadas para a rua (a laje
                             que o groundHeightAt não conhecia) → cláusulas 3 e 4
 */
import assert from 'node:assert/strict';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
if (mutant && !['glb-fechado', 'sem-piso'].includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);

// Silhueta fechada do escadao_casa_r3: sólido que preenche o envelope após o
// placeProp normalizar a altura e o mapa reescalar x/z.
const molde = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
registerPropTemplate('escadao_casa_r3', molde);

const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;

/* Planta das geminadas da laje (map_escadao.js, LAJE_Z=15.5, LAJE_D=2.6, piso=2.75):
   oeste x -8.6..-3.35, leste x -3.35..1.35 — encostando na casa frontal (ESCADAO_HOME.x0). */
const PISO = 2.75;
const GEMINADA = { x0: -8.6, x1: 1.35, z0: 14.2, z1: 16.8 };
// Janela da escada: face norte da geminada leste, vão x -2.2..-0.7, banda y PISO+1..PISO+2.2.
const JANELA = { x0: -2.2, x1: -0.7, y0: PISO + 1, y1: PISO + 2.2, z: 14.2 };

const ghOriginal = W.groundHeightAt;
if (mutant === 'sem-piso') {
  W.groundHeightAt = (x, z, yRef) => {
    const g = ghOriginal(x, z, yRef);
    if (g === PISO && x >= GEMINADA.x0 && x <= GEMINADA.x1 && z >= GEMINADA.z0 && z <= GEMINADA.z1) return 0;
    return g;
  };
  assert.notEqual(W.groundHeightAt(-1.4, 15.3), ghOriginal(-1.4, 15.3), 'Mutante sem-piso precisa mudar o chão do interior');
}
if (mutant === 'glb-fechado') {
  // Sem tag `escadaoMint` de propósito: a cláusula 1 continua verde e é a
  // CLÁUSULA DE JANELA que tem que morder a malha fechada sobre o vão.
  const sealed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, .3), new THREE.MeshStandardMaterial());
  sealed.position.set((JANELA.x0 + JANELA.x1) / 2, (JANELA.y0 + JANELA.y1) / 2, JANELA.z + .15);
  W.root.add(sealed);
  W.occluders.push(sealed);
}
W.root.updateMatrixWorld(true);

const ray = new THREE.Raycaster();
const clearAcross = (from, to) => {
  ray.set(from, to.clone().sub(from).normalize());
  ray.far = from.distanceTo(to);
  return ray.intersectObjects(W.occluders, true).length === 0;
};
const ocupa = (x, z, r = .38) => {
  const feet = new THREE.Vector3(x, W.groundHeightAt(x, z), z), resolved = feet.clone();
  game._collide(resolved, r);
  return resolved.distanceTo(feet) < 1e-6;
};

/* 1 — o molde fechado não mora mais na casa tática */
const mints = [];
W.root.traverse(o => { if (o.userData?.escadaoMint) mints.push(o); });
assert.equal(mints.length, 0, `Shell procedural é autoritativo: esperado 0 prop escadaoMint na laje, achei ${mints.length} (branch GLB_ON com continue)`);

/* 2 — janela real para a escada */
const olho = new THREE.Vector3(-1.4, PISO + 1.62, 15.3);
assert.ok(ocupa(-1.4, 15.3), 'Olho da janela é posição de pés ocupável (cápsula 0.38)');
const alvos = [
  ['escada central', 0, 11],
  ['patamar 1', 1.5, 8.5],
];
for (const [nome, tx, tz] of alvos) {
  const alvo = new THREE.Vector3(tx, W.groundHeightAt(tx, tz) + 1.5, tz);
  assert.ok(ocupa(tx, tz), `Alvo ${nome} é posição ocupável`);
  assert.ok(clearAcross(olho, alvo), `Janela da escada enxerga ${nome} — abertura real, não vidro decorativo`);
  assert.ok(clearAcross(alvo, olho), `Revide: quem está no ${nome} vê a janela`);
}
const visible = [];
W.root.traverseVisible(o => { if (o.isMesh && (Array.isArray(o.material) ? o.material.some(m => m.visible) : o.material.visible)) visible.push(o); });
ray.set(olho, new THREE.Vector3(0, W.groundHeightAt(0, 11) + 1.5, 11).sub(olho).normalize());
ray.far = olho.distanceTo(new THREE.Vector3(0, 3.78, 11));
assert.equal(ray.intersectObjects(visible, false).length, 0, 'Caixilho e decoração também deixam enxergar pela janela');
for (const x of [-3, -2.6, -.4, 0]) for (const y of [3.3, 5.3])
  assert.ok(!clearAcross(new THREE.Vector3(x, y, 15.3), new THREE.Vector3(x, y, 13)),
    `Fechamento contínuo fora da abertura: ${x}@${y}`);

/* 3 — piso interior contínuo */
let celulas = 0;
for (let x = GEMINADA.x0 + .45; x <= GEMINADA.x1 - .35; x += .4)
  for (let z = GEMINADA.z0 + .55; z <= GEMINADA.z1 - .45; z += .4) {
    if (!ocupa(x, z)) continue; // células dentro de parede/pilares não medem piso
    celulas++;
    assert.equal(W.groundHeightAt(x, z), PISO, `Piso do interior em ${x.toFixed(1)},${z.toFixed(1)} deve ser ${PISO}`);
    ray.set(new THREE.Vector3(x, PISO + 1, z), new THREE.Vector3(0, -1, 0)); ray.far = 1.2;
    const hit = ray.intersectObjects(visible, false).find(h => Math.abs(h.point.y - PISO) < .02);
    assert.ok(hit, `Piso VISÍVEL sob os pés em ${x.toFixed(1)},${z.toFixed(1)} — sem vazio na laje`);
  }
assert.ok(celulas > 40, `Varredura mediu o interior de verdade (${celulas} células)`);

/* 4 — entrada alcançável: cápsula 0.38 nos trechos internos e caminante real do
   jogo na cadeia inteira (a porta da passarela é o mesmo corredor que o
   eval:escadao-home já prova com _moveEntity). */
const rotaInterna = [[1.0, 14.9], [-1.4, 15.05], [-2.85, 15], [-4.2, 15], [-5.975, 15.05]];
for (let i = 1; i < rotaInterna.length; i++) {
  assert.ok(game._retaAndavel(...rotaInterna[i - 1], ...rotaInterna[i], .38, .3), `Entrada livre ${rotaInterna[i - 1]}→${rotaInterna[i]}`);
  assert.ok(game._retaAndavel(...rotaInterna[i], ...rotaInterna[i - 1], .38, .3), `Retorno livre ${rotaInterna[i]}→${rotaInterna[i - 1]}`);
}
const walker = game.player;
walker.pos.set(-.3, W.groundHeightAt(-.3, 10.12), 10.12); walker.vel.set(0, 0, 0);
walker.grounded = true; walker.mantle = null;
const rota = [[.9, 10.12], [.9, 12], [.9, 14.4], [1.0, 14.9], ...rotaInterna.slice(1)];
for (const [x, z] of [...rota, ...rota.slice().reverse().slice(1)]) {
  let frames = 0;
  while (Math.hypot(x - walker.pos.x, z - walker.pos.z) > .15 && frames++ < 300) {
    walker.yaw = Math.atan2(walker.pos.x - x, walker.pos.z - z);
    game.time += 1 / 60;
    game._moveEntity(walker, { ax: 0, az: -1, jump: false, crouch: false, shift: false }, 1 / 60);
  }
  assert.ok(frames < 300, `Entrada/retorno travou rumo a ${x},${z}: ${walker.pos.toArray()}`);
}
assert.ok(walker.pos.y >= 2.5, 'Interior das geminadas mantém a cota 2,75 da laje');
const interior = W.nearestWaypoint(-1.4, 15.3);
const caminho = W.findPath(W.nearestWaypoint(0, 26), interior);
assert.ok(caminho.length > 1, 'Bots alcançam a casa central a partir do respawn da rua');
for (let i = 1; i < caminho.length; i++) {
  const a = W.waypoints.nodes[caminho[i - 1]], b = W.waypoints.nodes[caminho[i]];
  assert.ok(game._retaAndavel(a.x, a.z, b.x, b.z, .38, .3), 'Cada aresta da casa central é caminhável');
}

/* 5 — sem spawn-to-spawn */
let raios = 0;
for (const x of [-1.4, -5.975]) for (const altura of [1.05, 1.62])
  for (const slot of Object.values(W.spawns).flat())
    for (const th of [.5, 1.05, 1.62]) {
      const alvo = new THREE.Vector3(slot.x, W.groundHeightAt(slot.x, slot.z) + th, slot.z);
      assert.ok(!clearAcross(new THREE.Vector3(x, PISO + altura, 15.3), alvo),
        `Casa central não lê slot de nascimento: ${x} -> ${slot.x},${slot.z}`);
      raios++;
    }

console.log(`ESCADAO CASA CENTRAL PASS: ${celulas} células de piso, ${raios} raios de spawn bloqueados, rota bot ${caminho.length} nós`);
