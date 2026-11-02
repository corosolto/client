import { Game, THREE, bootGame, initTextures } from './harness.mjs';
import { alturaDoOlho } from '../../public/js/hitboxes.js';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante) {
  const nome = mutante === 'camera' ? '_miraTiroBot' : '_participanteHumano';
  const original = Game.prototype[nome].toString();
  const alterado = mutante === 'camera'
    ? original.replace('new THREE.Vector3(ent.pos.x, ent.pos.y + alturaDoOlho(ent.crouchF || 0), ent.pos.z)', 'this.camera.position.clone()')
    : mutante === 'remoto' ? original.replace("(ent._remote && ent._remote !== 'ghost' && ent._netBot !== true)", 'false')
    : mutante === 'proxy' ? original.replace("ent._remote !== 'ghost' && ent._netBot !== true", "ent._remote !== 'ghost'") : original;
  if (alterado === original) throw Error('mutante não aplicou');
  Game.prototype[nome] = new Function('THREE', 'alturaDoOlho', `return function ${alterado}`)(THREE, alturaDoOlho);
}
let falhas = 0;
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK' : 'FALHA'} ${msg}`); if (!ok) falhas++; };
function ator(z, x = 0) {
  const group = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(.35), new THREE.MeshBasicMaterial());
  body.position.set(x, 1, z); group.add(body);
  const ent = { pos: new THREE.Vector3(x, 0, z), alive: true, team: 'B', crouchF: 0, mesh: { group, parts: { head: null }, isGLB: false } };
  body.userData.botOwner = ent; return ent;
}
function jogo(alvos) {
  const g = Object.create(Game.prototype);
  g.time = 10; g.state = 'live'; g.ray = new THREE.Raycaster(); g.world = { occluders: [] }; g.bots = alvos;
  g.playerTeam = 'E'; g.player = { pos: new THREE.Vector3(100, 0, 100), team: 'E', alive: true };
  g.camera = { position: new THREE.Vector3(8, 6, -10) }; g._botDmgPlayer = 1;
  const danos = []; g._damage = (ent, valor, de, arma, head, point) => danos.push({ ent, valor, head, point });
  for (const nome of ['_fleshImpact', '_bloodSpatter', '_noteHit', '_puff', '_impactSfx', '_tracer', '_flash']) g[nome] = () => {};
  g._armoredTarget = () => false;
  for (const e of alvos) e.mesh.group.updateMatrixWorld(true);
  return { g, danos };
}
{
  const e = ator(-10), { g, danos } = jogo([e]);
  g._fireHitscan({ team: 'E' }, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), 30, false, 'AK', 'ak', false);
  cobrar(danos.length === 1 && Math.abs(danos[0].point.z + 9.55) < 1e-8, 'jogador entrega ponto da primeira entrada física, independente da esfera visual');
}
{
  const e = ator(-10), acessorio = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshBasicMaterial());
  acessorio.position.set(1, 1, -10); acessorio.userData.botOwner = e; e.mesh.group.add(acessorio);
  const { g, danos } = jogo([e]);
  g._fireHitscan({ team: 'E' }, new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 0, -1), 30, false, 'AK', 'ak', false);
  cobrar(danos.length === 0, 'arma/acessório fora do corpo não vira hitbox');
}
{
  const e = ator(-10); e.crouchF = 1; const { g, danos } = jogo([e]);
  g._fireHitscan({ team: 'E' }, new THREE.Vector3(0, 1.08, 0), new THREE.Vector3(0, 0, -1), 30, false, 'AK', 'ak', false);
  cobrar(danos.length === 1 && danos[0].head, 'jogador usa cabeça agachada mesmo sem animação na malha da fixture');
}
const randomOriginal = Math.random;
try {
  Math.random = () => .5;
  {
    const alvo = ator(-20), frente = ator(-10), { g, danos } = jogo([alvo, frente]);
    const b = { pos: new THREE.Vector3(), weapon: 'ak', mag: 10, skill: 1, team: 'E', crouchF: 0, mesh: { isGLB: false } };
    g._botShootNN(b, alvo);
    cobrar(danos.length === 1 && danos[0].ent === frente, 'NN atinge o primeiro oponente real, não necessariamente seu alvo escolhido');
  }
  {
    const p = ator(-20); p.isPlayer = true;
    const { g, danos } = jogo([]); g.player = p; let dir;
    g._flash = (_, d) => { dir = d.clone(); };
    const b = { pos: new THREE.Vector3(), weapon: 'ak', mag: 10, skill: 1, team: 'E', crouchF: 0, mesh: { isGLB: false } };
    g._botShootNN(b, p);
    cobrar(Math.abs(dir.x) < 1e-8 && danos[0]?.ent === p, 'NN mira o corpo do jogador, independente da câmera em terceira pessoa');
  }
  for (const remoto of [false, true]) {
    const alvo = ator(-20), frente = ator(-10), { g, danos } = jogo([alvo, frente]);
    frente._remote = 'slot'; frente._netBot = remoto; g._botDmgPlayer = .25;
    const b = { pos: new THREE.Vector3(), weapon: 'ak', mag: 10, skill: 1, team: 'E', mesh: { isGLB: false } };
    g._botShootNN(b, alvo);
    cobrar(danos[0]?.ent === frente && danos[0]?.valor === (remoto ? 36 : 9),
      remoto ? 'proxy de NPC não recebe multiplicador humano' : 'slot humano atingido recebe multiplicador, mesmo se alvo escolhido era NPC');
  }
  {
    const fantasma = ator(-10); fantasma._remote = 'ghost';
    const { g } = jogo([fantasma]);
    cobrar(!g._participanteHumano(fantasma), 'ghost continua classificado como NPC');
  }
  {
    const alvo = ator(-20), p = ator(-10); p.isPlayer = true;
    const { g, danos } = jogo([alvo]); g.player = p; g._botDmgPlayer = .25;
    let notas = 0; g._noteHit = () => notas++;
    const b = { pos: new THREE.Vector3(), weapon: 'ak', mag: 10, skill: 1, team: 'E', mesh: { isGLB: false } };
    g._botShootNN(b, alvo);
    cobrar(danos[0]?.ent === p && danos[0]?.valor === 9 && notas === 1,
      'jogador interveniente recebe multiplicador e HUD do ator atingido');
  }
  const g = bootGame('praca_poderes', { textures: initTextures(), bots: 3, seed: 973 });
  try {
    const [b, frente, alvo] = g.bots; g.state = 'live'; g.time = 10; g.player.alive = false;
    g.world.occluders = []; g._losClear = () => true;
    for (const bot of g.bots) bot.alive = false;
    b.pos.set(0, 0, 0); frente.pos.set(0, 0, 10); alvo.pos.set(0, 0, 20);
    Object.assign(b, { alive: true, team: 'E', yaw: 0, target: alvo, think: Infinity,
      aimErr: 0, reactAt: 0, focusUntil: 0, nextShotAt: 0, reloadUntil: 0,
      weapon: 'ak', mag: 30, skill: 1, _losLost: false });
    Object.assign(frente, { alive: true, team: 'B' }); Object.assign(alvo, { alive: true, team: 'B' });
    let atingido; g._damage = e => { atingido = e; };
    for (const nome of ['_tracer', '_flash', '_fleshImpact', '_puff']) g[nome] = () => {};
    g._updateBot(b, 0);
    cobrar(atingido === frente, 'bot normal usa o primeiro oponente geométrico no update real');
  } finally { g.dispose(); }
} finally { Math.random = randomOriginal; }
process.exitCode = falhas ? 1 : 0;
