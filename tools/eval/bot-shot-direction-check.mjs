import { Game, THREE } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';
import { direcaoDesviada } from '../../public/js/ballistics.js';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante) {
  const original = Game.prototype._botShootNN.toString();
  const alterado = mutante === 'raio-central'
    ? original.replace('direcaoDesviada(from, teye, ox, oy)', 'teye.clone().sub(from).normalize()')
    : mutante === 'fim-central'
      ? original.replace('resultado?.point || from.clone().addScaledVector(dir, 120)', '(resultado?.ent ? teye : resultado?.point) || from.clone().addScaledVector(dir, 120)') : original;
  if (alterado === original) throw Error('mutante não aplicou');
  Game.prototype._botShootNN = new Function('WEAPONS', 'THREE', 'BOT_FAIR', 'BOT_DMG_PLAYER', 'BLOOD', 'direcaoDesviada', `return function ${alterado}`)(WEAPONS, THREE, true, 1, false, direcaoDesviada);
}
let falhas = 0;
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK' : 'FALHA'} ${msg}`); if (!ok) falhas++; };
const jogo = Object.create(Game.prototype);
jogo.time = 10; jogo.world = { occluders: [] }; jogo.ray = new THREE.Raycaster();
jogo.camera = { position: new THREE.Vector3(0, 1.6, -40) };
jogo._botEye = ent => ent.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
for (const nome of ['_fleshImpact', '_bloodSpatter', '_noteHit']) jogo[nome] = () => {};
let direcao, rastro, danos = 0;
jogo._flash = (_, dir) => { direcao = dir.clone(); };
jogo._tracer = (de, ate) => { rastro = [de.clone(), ate.clone()]; };
jogo._damage = () => danos++;
const bot = { pos: new THREE.Vector3(), weapon: 'ak', mag: 10, skill: 1, team: 'E', alive: true, mesh: { isGLB: false } };
const alvo = { pos: new THREE.Vector3(0, 0, -40), alive: true, team: 'B' };
jogo.bots = [alvo]; jogo.player = { alive: false, team: 'E' };
const original = Math.random;
try {
  Math.random = () => 1; jogo._botShootNN(bot, alvo);
  cobrar(Math.abs(Math.atan2(direcao.x, -direcao.z) - .05) < 1e-8, 'NN usa o desvio horizontal sorteado no raio efetivo');
  cobrar(Math.abs(Math.atan2(direcao.y, -direcao.z) - .05) < 1e-8, 'NN usa o desvio vertical sorteado no raio efetivo');
  cobrar(rastro[1].clone().sub(rastro[0]).normalize().distanceTo(direcao) < 1e-8, 'rastro acompanha a mesma direção de disparo');
  cobrar(danos === 0 && bot.mag === 9, 'erro grande mantém miss e cobrança de munição');
  // .52 desviava 11 cm a 40 m e só acertava pela esfera de 0,50 m; .505 desvia 3 cm (cabeça justa).
  Math.random = () => .505; jogo._botShootNN(bot, alvo);
  cobrar(danos === 1 && direcao.x !== 0 && rastro[1].clone().sub(rastro[0]).normalize().distanceTo(direcao) < 1e-8,
    'acerto com desvio pequeno mantém rastro na direção efetiva');
  Math.random = () => .5; jogo._botShootNN(bot, alvo);
  cobrar(direcao.x === 0 && direcao.y === 0 && direcao.z === -1 && danos === 2, 'mira sem desvio conserva tiro central e dano');
} finally { Math.random = original; }
process.exitCode = falhas ? 1 : 0;
