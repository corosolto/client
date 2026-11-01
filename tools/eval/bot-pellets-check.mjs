import { Game, THREE, bootGame, initTextures } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';
import { coneDoDisparo } from '../../public/js/game.js';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante) {
  const original = Game.prototype._dispararBot.toString();
  const trocas = { mono: ['for (const o of cone)', 'for (const o of cone.slice(0, 1))'],
    piso: ['Math.max(6, Math.round(bruto))', 'Math.max(6 * porAtor.size, Math.round(bruto))'],
    peso: ['Math.min(W.pellets, 6) * .55 / cone.length', '1'],
    cabeca: ['!!(hit.head && permiteCabeca)', '!!permiteCabeca'],
    teto: ['? 100 : 130, total *', '? Infinity : Infinity, total *'],
    fx: ['[...porAtor.keys()].some(ent => ent.isPlayer)', 'false'] };
  const troca = trocas[mutante];
  if (!troca || !original.includes(troca[0])) throw Error('mutante não aplicou');
  Game.prototype._dispararBot = new Function('THREE', 'coneDoDisparo', 'GUNFEEL', `return function ${original.replace(...troca)}`)(THREE, coneDoDisparo, true);
}
let falhas = 0;
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK' : 'FALHA'} ${msg}`); if (!ok) falhas++; };
const sorteio = Math.random;
function fixture() {
  const g = Object.create(Game.prototype), alvo = { pos: new THREE.Vector3(0, 0, -10), alive: true, team: 'B' };
  const b = { pos: new THREE.Vector3(), team: 'E', weapon: 'shotgun', mag: 8, skill: 1, mesh: { isGLB: false } };
  g.time = 10; g.player = { alive: false }; g.bots = [alvo]; g.world = { occluders: [] }; g.ray = new THREE.Raycaster();
  g._botDmgPlayer = 1; const danos = [], rastros = [], direcoes = [];
  g._damage = (ent, valor, de, arma, head) => danos.push({ ent, valor, head });
  g._tracer = (de, ate) => rastros.push({ de, ate });
  for (const k of ['_flash', '_fleshImpact', '_bloodSpatter', '_noteHit', '_puff']) g[k] = () => {};
  const query = g._consultarTiro;
  g._consultarTiro = function (...args) { direcoes.push(args[2].clone()); return query.apply(this, args); };
  return { g, b, alvo, danos, rastros, direcoes };
}
try {
  Math.random = () => .5;
  {
    const { g, b, alvo, danos, direcoes, rastros } = fixture();
    // Com Math.random fixo o cone desvia 1,2°: a 10 m passa 21 cm ao lado do queixo, ar
    // desde a cabeça justa (hitboxes.js). A 5 m ele entra na cabeça, que é o que este caso usa.
    alvo.pos.z = -5;
    g._botShootNN(b, alvo);
    cobrar(direcoes.length === 9 && direcoes.every(d => Math.abs(d.length() - 1) < 1e-9), 'NN consulta nove raios normalizados por cartucho');
    cobrar(danos.length === 1 && b.mag === 7, 'cartucho cobra munição e aplica dano uma vez por ator');
    cobrar(rastros.length === 4 && rastros.every((r, i) => r.ate.clone().sub(r.de).normalize().distanceTo(direcoes[i]) < 1e-8),
      'rastros limitados acompanham os pellets reais');
  }
  for (const dividir of [false, true]) {
    const { g, b, alvo, danos } = fixture();
    const outro = { ...alvo, pos: alvo.pos.clone(), _remote: 'humano' };
    g._botDmgPlayer = .01; alvo._remote = 'humano';
    let n = 0;
    g._consultarTiro = () => ({ ent: dividir && n++ % 2 ? outro : alvo, head: true, dist: 30, point: alvo.pos.clone() });
    g._botShootNN(b, alvo);
    cobrar(Math.abs(danos.reduce((s, d) => s + d.valor, 0) - 6) < 1e-8 && danos.length === (dividir ? 2 : 1),
      `piso de seis pertence ao cartucho inteiro (${dividir ? 'dois atores' : 'um ator'})`);
    cobrar(danos.every(d => !d.head), 'NN não ganha headshots na agregação');
  }
  {
    const { g, b, alvo, danos } = fixture();
    g._consultarTiro = () => null; g._botShootNN(b, alvo);
    cobrar(danos.length === 0, 'cartucho sem entrada não recebe piso de dano');
  }
  {
    const { g, b, alvo, danos } = fixture();
    alvo._remote = 'humano'; g._botDmgPlayer = 0;
    g._consultarTiro = () => ({ ent: alvo, dist: 0, head: false, point: alvo.pos.clone() });
    g._botShootNN(b, alvo);
    cobrar(danos.length === 0, 'multiplicador zero não recebe piso de dano');
  }
  for (const head of [false, true]) {
    const { g, b, alvo, danos } = fixture();
    g._consultarTiro = () => ({ ent: alvo, dist: 0, head, point: alvo.pos.clone() });
    g._dispararBot?.(b, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), WEAPONS.shotgun, true);
    cobrar(danos.length === 1 && danos[0].valor === (head ? 69 : 46) && danos[0].head === head,
      `peso legado do cartucho e headshot geométrico (${head ? 'cabeça' : 'torso'})`);
  }
  {
    const { g, b, alvo, danos } = fixture(), humano = { ...alvo, _remote: 'humano' };
    let n = 0;
    g._consultarTiro = () => ({ ent: n++ % 2 ? humano : alvo, dist: 0, head: false, point: alvo.pos.clone() });
    g._dispararBot?.(b, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), { ...WEAPONS.shotgun, dmg: 1000 });
    cobrar(danos.length === 2 && danos.find(d => d.ent === humano)?.valor === 100 && danos.find(d => d.ent === alvo)?.valor === 130,
      'caps de humano e NPC não redistribuem excedente');
  }
  const g = bootGame('praca_poderes', { textures: initTextures(), bots: 2, seed: 973 });
  try {
    const [b, alvo] = g.bots; g.state = 'live'; g.time = 10; g.player.alive = false;
    g.world.occluders = []; g._losClear = () => true;
    b.pos.set(0, 0, 0); alvo.pos.set(0, 0, 10);
    Object.assign(b, { alive: true, team: 'E', yaw: 0, target: alvo, think: Infinity, aimErr: 0,
      reactAt: 0, focusUntil: 0, nextShotAt: 0, reloadUntil: 0, weapon: 'shotgun', mag: 8, skill: 1, _losLost: false });
    Object.assign(alvo, { alive: true, team: 'B' });
    let raios = 0, danos = 0;
    const query = g._consultarTiro; g._consultarTiro = function (...args) { raios++; return query.apply(this, args); };
    g._damage = () => danos++;
    for (const k of ['_tracer', '_flash', '_fleshImpact', '_puff']) g[k] = () => {};
    g._updateBot(b, 0);
    cobrar(raios === 9 && danos === 1 && b.mag === 7, 'update normal resolve nove pellets e agrega um dano');
    g.player.alive = true; g.player.isPlayer = true; g.player.team = 'B'; g.player.pos.set(0, 0, 60);
    g.settings.quality = 'low';
    Object.assign(b, { nextShotAt: 0, aimErr: 0, mag: 8, _fxTick: 0, target: alvo });
    let indice = 0, rastros = 0;
    g._consultarTiro = () => { const ent = indice++ ? g.player : alvo;
      return { ent, head: false, dist: ent === alvo ? 10 : 60, point: ent.pos.clone().add(new THREE.Vector3(0, 1, 0)) }; };
    g._tracer = () => rastros++;
    g._updateBot(b, 0);
    cobrar(indice === 9 && rastros === 4, 'cartucho que também atinge jogador local conserva prioridade de FX');
  } finally { g.dispose(); }
} finally { Math.random = sorteio; }
process.exitCode = falhas ? 1 : 0;
