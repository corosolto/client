import { THREE, bootGame, initTextures } from './harness.mjs';

let ok = 0, falhas = 0;
const cobra = (cond, msg) => { if (cond) { ok++; console.log(`  ok   ${msg}`); } else { falhas++; console.log(`  FALHA ${msg}`); } };

function scenario({ surface = 'madeira', thickness = 0.2, secondWall = false, online = false } = {}) {
  const g = bootGame('praca_poderes', { textures: initTextures(), bots: 0, seed: 90125 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, thickness), new THREE.MeshStandardMaterial({ name: surface }));
  wall.name = surface; wall.position.set(0, 1.5, -5);
  const occluders = [wall];
  if (secondWall) {
    const backstop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.2), new THREE.MeshStandardMaterial({ name: 'concreto' }));
    backstop.name = 'concreto'; backstop.position.set(0, 1.5, -5.45); occluders.push(backstop);
  }
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshBasicMaterial());
  body.position.set(0, 1.5, -6); group.add(body);
  const bot = { alive: true, team: 'B', pos: new THREE.Vector3(0, 0, -6), mesh: { group, parts: { head: null } } };
  body.userData.botOwner = bot;
  g.scene.add(wall, group); for (const mesh of occluders.slice(1)) g.scene.add(mesh);
  g.scene.updateMatrixWorld(true);
  g.world.occluders = occluders; g.bots = [bot]; g.player.team = 'E'; g.playerTeam = 'E'; g.online = online;
  const damage = [];
  g._damage = (...args) => damage.push(args);
  g._puff = () => {}; g._impactSfx = () => {}; g._fleshImpact = () => {}; g._tracer = () => {};
  return { g, damage, from: new THREE.Vector3(0, 1.5, 0), dir: new THREE.Vector3(0, 0, -1) };
}

function shot(s, wid = 'awp') {
  return s.g._fireHitscan(s.g.player, s.from, s.dir, 400, true, 'AWP', wid, false);
}

console.log('\n· penetração de alto calibre');
{
  const s = scenario(); const end = shot(s);
  cobra(s.damage.length === 1 && s.damage[0][0].team === 'B', 'AWP atravessa uma tábua de 0,20 m e acerta somente o primeiro inimigo');
  cobra(s.damage[0]?.[1] === 200, `dano após madeira fina é 50% e determinístico (recebido ${s.damage[0]?.[1]})`);
  cobra(end.z < -5.6 && end.z > -6.4, 'tracer termina no alvo atrás da superfície, não no mapa inteiro');
}
{
  const s = scenario({ surface: 'vidro' }); shot(s);
  cobra(s.damage.length === 1 && s.damage[0][1] === 200, 'vidro fino usa o mesmo contrato explícito de AWP');
}
{
  const s = scenario(); shot(s, 'ak');
  cobra(s.damage.length === 0, 'AK não recebe penetração por herdar a ausência de contrato explícito');
}
{
  const s = scenario({ surface: 'concreto' }); shot(s);
  cobra(s.damage.length === 0, 'concreto bloqueia AWP mesmo fino');
}
{
  const s = scenario({ thickness: 0.5 }); shot(s);
  cobra(s.damage.length === 0, 'madeira acima de 0,28 m bloqueia AWP');
}
{
  const s = scenario({ secondWall: true }); shot(s);
  cobra(s.damage.length === 0, 'segunda parede cancela o acerto: há no máximo uma travessia');
}
{
  const s = scenario({ online: true }); const end = shot(s);
  cobra(s.damage.length === 0 && end.z > -5.2, 'cliente online não prevê travessia antes da autoridade do servidor');
}
{
  const s = scenario(); s.g._penetrationExit = () => null; shot(s);
  cobra(s.damage.length !== 1, 'mutante que remove a saída da penetração deixa a régua vermelha');
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
