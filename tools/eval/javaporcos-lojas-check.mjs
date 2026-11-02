import assert from 'node:assert/strict';
import { THREE, initTextures, bootGame } from './harness.mjs';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (!['', 'loja-muda', 'loja-intacta', 'saque-sem-dominio', 'porta-fora', 'revirado-sem-oclusao', 'atravessa-porta'].includes(mutante)) throw Error('mutante desconhecido');
const game = bootGame('invasao_javaporcos', { textures: initTextures(), seed: 77 });
const world = game.world, mode = game.objective;
const nomes = ['armazem', 'farmacia', 'mercearia', 'padaria', 'acougue', 'boteco'];
let failures = 0, applied = !mutante;
for (const nome of nomes) {
  try {
    const shop = world.lojas.find(l => (l.comercio || l.papel) === nome);
    assert.ok(shop, `falta ${nome}`);
    const spot = world.foodSpots.find(s => s.loja === nome);
    assert.ok(spot, `sem ponto de saque: ${nome}`);
    const mesh = world.foodMesh(spot.id);
    assert.ok(mesh?.getObjectByName('inteiro') && mesh?.getObjectByName('revirado'), 'faltam os dois estados');
    const near = world.nearestWaypoint(spot.x, spot.z), node = world.waypoints.nodes[near];
    assert.ok(Math.hypot(node.x - spot.x, node.z - spot.z) <= spot.r, 'saque fora da navegação');
    game.scene.updateMatrixWorld(true);
    const normal = new THREE.Vector3(shop.eixo === 'x' ? shop.sinal : 0, 0, shop.eixo === 'z' ? shop.sinal : 0);
    const centro = new THREE.Vector3(shop.porta.vao[0], mesh.position.y + 1.6, shop.porta.vao[1]);
    const ray = new THREE.Raycaster(centro.clone().add(normal), normal.clone().negate(), 0, 1.2);
    const fechada = mesh.getObjectByName('porta-fechada');
    if (mutante === 'porta-fora' && !shop.aberta) { fechada.position.addScaledVector(normal, 1.21); game.scene.updateMatrixWorld(true); applied = true; }
    if(shop.aberta) assert.equal(ray.intersectObjects(world.occluders,false).length,0,'mercearia aberta tampada');
    else assert.ok(ray.intersectObjects(world.occluders, false).some(h => h.object === fechada), 'porta intacta não bloqueia o raio');
    const before = [...mode.state.controle];
    mode.state.foodHp[spot.id] = spot.hp;
    if (mutante === 'loja-muda') { spot.loja = null; applied = true; }
    const bot = { pos: new THREE.Vector3(spot.x, 0, spot.z), vel: new THREE.Vector3(), _boarType: 'ariete', _boarAttackAt: 0, _objectiveNpc: 'javaporco', _boarId: nome, alive: true };
    const marcar = mode.marcarComida.bind(mode);
    if (mutante === 'loja-intacta') { mode.marcarComida = () => {}; applied = true; }
    const atualizar = mode.saquearLoja?.bind(mode);
    if (mutante === 'saque-sem-dominio') { mode.saquearLoja = () => {}; applied = true; }
    mode.aterrar = () => {}; mode.rosnar = () => {}; mode.emitir = () => {};
    const alvo = { kind: 'comida', spot, x: spot.x, z: spot.z };
    const porta=spot.porta||{x:shop.porta.vao[0],z:shop.porta.vao[1]};
    bot.pos.x = porta.x + normal.x; bot.pos.z = porta.z + normal.z;
    if (mutante === 'atravessa-porta') { mode.arrombar = () => false; applied = true; }
    const contexto = mode.contexto.bind(mode), mover = mode.moverPara.bind(mode);
    mode.contexto = () => ({ world: { ...world, foodSpots: [spot] }, state: mode.state, jogadores: [], tempo: 0 });
    let moveu = false;
    mode.moverPara = () => { moveu = true; };
    mode.teimosia = () => false; mode.cansaco = () => 0;
    mode.game.time = 0;
    mode.updateBot(bot, 1 / 60);
    mode.contexto = contexto; mode.moverPara = mover;
    if(!shop.aberta){
      assert.equal(moveu, false, 'avançou antes de arrombar o vão');
      assert.ok(mode.state.foodHp[spot.id] < spot.hp, 'updateBot não atingiu porta a partir de fora');
    } else assert.equal(moveu,true,'mercearia aberta não deixa avançar');
    assert.equal(mode.arrombar(bot, alvo, 1), false, 'porta já arrombada segura o avanço para o interior');
    for (let i = 0; i < 20; i++) mode.revirar(bot, { spot, x: spot.x, z: spot.z }, i);
    assert.equal(mode.state.foodHp[spot.id], 0, 'loja não pode ser consumida');
    assert.equal(mesh.getObjectByName('inteiro').visible, false, 'loja permanece intacta');
    assert.equal(mesh.getObjectByName('revirado').visible, true, 'não espalhou mercadoria/porta');
    const ativas = mesh.userData.foodOccluders.revirado;
    if (mutante === 'revirado-sem-oclusao') {
      for (const malha of ativas) { const i = world.occluders.indexOf(malha); if (i >= 0) world.occluders.splice(i, 1); }
      applied = true;
    }
    assert.ok(ativas.every(m => world.occluders.includes(m)), 'estado revirado não participa dos raycasts');
    game.scene.updateMatrixWorld(true);
    assert.ok(!ray.intersectObjects(world.occluders, false).some(h => h.object === fechada), 'porta invisível bloqueia o vão');
    assert.ok(mode.state.controle.some((v, i) => v > before[i]), 'saque não conta para domínio');
    mode.marcarComida = marcar; if (atualizar) mode.saquearLoja = atualizar;
    console.log(`✓ LOJA ${nome}: alcançável, revirada e domínio`);
  } catch (e) { failures++; console.error(`✗ LOJA ${nome}: ${e.message}`); }
}
if (!mutante) {
  try {
    const net = mode.netState();
    mode.prepareRound();
    for (const spot of world.foodSpots.filter(s => s.loja)) assert.equal(world.foodMesh(spot.id).getObjectByName('inteiro').visible, true);
    mode.game.online = true;
    mode.applyNetState(net);
    assert.equal(mode.state.foodRevirada, nomes.length, 'contador de saque não acompanha rede');
    for (const spot of world.foodSpots.filter(s => s.loja)) assert.equal(world.foodMesh(spot.id).getObjectByName('revirado').visible, true);
    console.log('✓ LOJA estados restaurados na nova partida e aplicados no cliente MP');
  } catch (e) { failures++; console.error(`✗ LOJA rede/reset: ${e.message}`); }
}
if (mutante && !applied) throw Error('MUTANTE NÃO APLICOU');
process.exitCode = mutante ? (failures ? 0 : 1) : (failures ? 1 : 0);
