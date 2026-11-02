import { Game, bootGame, initTextures, THREE } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';
import { entradaCombatente } from '../../public/js/hitboxes.js';

// #968: extremos da configuração em 5b5fdba7498c; mede os consumidores reais, não só a tabela.
const curvas = [
  ['ak', 45, 95, 0.85], ['mp5', 25, 65, 0.60], ['pistol', 30, 70, 0.62],
  ['shotgun', 8, 26, 0.30], ['lmg', 40, 90, 0.80],
];
if (process.argv.includes('--mutante=curva-antiga')) {
  Game.prototype._distanceDamage = function (dmg, wid, dist) {
    const curva = curvas.find(([id]) => id === wid);
    if (!curva) return dmg;
    const [, inicio, fim, minimo] = curva;
    return dmg * Math.max(minimo, Math.min(1, 1 - (dist - inicio) / (fim - inicio)));
  };
}
let falhas = 0;
const cobrar = (ok, descricao) => { console.log(`${ok ? 'OK' : 'FALHA'} ${descricao}`); if (!ok) falhas++; };
for (const [wid, inicio, fim, minimo] of curvas) {
  const base = WEAPONS[wid].dmg;
  for (const [dist, fator] of [[0, 1], [inicio, 1], [(inicio + fim) / 2, (1 + minimo) / 2], [fim, minimo], [200, minimo]]) {
    const recebido = Game.prototype._shotDamage.call(Game.prototype, base, wid, dist, false);
    cobrar(Math.abs(recebido - base * fator) < 1e-9, `${wid} a ${dist} m: ${recebido.toFixed(4)} / ${(base * fator).toFixed(4)}`);
  }
}
const torso = Game.prototype._shotDamage.call(Game.prototype, 36, 'ak', 60, false);
const cabeca = Game.prototype._shotDamage.call(Game.prototype, 36, 'ak', 60, true);
cobrar(Math.abs(cabeca - torso * 4) < 1e-9, 'headshot preserva o multiplicador após a curva');
cobrar(Game.prototype._shotDamage.call(Game.prototype, 120, 'mosin', 200, false) === 120, 'perfil sem queda preservado');

const game = bootGame('praca_poderes', { textures: initTextures(), bots: 2, seed: 968 });
const [atirador, alvo] = game.bots;
game.state = 'live'; game.time = 10;
for (const bot of game.bots) bot.alive = false;
game.world.occluders = [];
game._losClear = () => true;
game._botEye = ent => new THREE.Vector3(0, 1.6, ent === atirador ? 0 : 60);
for (const nome of ['_tracer', '_flash', '_fleshImpact', '_puff']) game[nome] = () => {};
const randomOriginal = Math.random;
try {
  Math.random = () => 0.5;
  for (const caminho of ['_updateBot', '_botShootNN']) {
    atirador.pos.set(0, 0, 0); alvo.pos.set(0, 0, 60);
    Object.assign(atirador, { alive: true, team: 'E', yaw: 0, target: alvo, think: Infinity,
      aimErr: 0, reactAt: 0, focusUntil: 0, nextShotAt: 0, reloadUntil: 0,
      weapon: 'ak', mag: 30, skill: 1, _losLost: false });
    Object.assign(alvo, { alive: true, team: 'B', isPlayer: false });
    let usado = null, entregue = null;
    game._distanceDamage = function (...args) {
      if (process.argv.includes(`--mutante=distancia-zero-${caminho}`)) args[2] = 0;
      const valor = Game.prototype._distanceDamage.apply(this, args);
      usado = { args, valor }; return valor;
    };
    game._damage = (ent, valor) => { entregue = valor; };
    // Entrada na cabeça do personagem do alvo (cabeça justa); com a esfera antiga era 59,75 m.
    const entrada = entradaCombatente(new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0, 1), alvo.pos, 0, game._perfilCabeca(alvo)).dist;
    const queda = Game.prototype._distanceDamage.call(game, 36, 'ak', entrada);
    if (caminho === '_updateBot') game._updateBot(atirador, 0);
    else game._botShootNN(atirador, alvo);
    cobrar(usado && usado.args[0] === 36 && usado.args[1] === 'ak' && Math.abs(usado.args[2] - entrada) < 1e-9,
      `${caminho}: entrega dano, arma e distância efetivos à curva`);
    cobrar(usado && Math.abs(usado.valor - queda) < 1e-9 && queda < 36, `${caminho}: queda de AK na entrada da cabeça a ${entrada.toFixed(2)} m`);
    cobrar(entregue === Math.round(queda), `${caminho}: preserva dano arredondado de AK contra bot`);
  }
} finally { Math.random = randomOriginal; game.dispose(); }
process.exitCode = falhas ? 1 : 0;
