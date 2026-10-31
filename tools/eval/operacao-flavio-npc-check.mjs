import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THREE } from './harness.mjs';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
async function load(path, before, after) {
  const url = new URL(path, import.meta.url);
  let s = readFileSync(url, 'utf8');
  assert.equal(s.split(before).length - 1, 1, 'alvo do mutante único');
  s = s.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) =>
    'from '+JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
}
const netEdits={
  'sem-reserva':['const vipLocal = vipValido ? game.objective?.vip : null;','const vipLocal = null;'],
  'limite-reserva16':['vipId <= 0xffffffff','vipId <= 65535'],
};
const modeEdits={
  'sem-id':['snap.vipId = nid;','void nid;'],
  'limite-id16':['nid <= 0xffffffff','nid <= 65535'],
};
if (mutante && !Object.hasOwn(netEdits,mutante) && !Object.hasOwn(modeEdits,mutante)) throw new Error('Mutante desconhecido');
const { makeNetcode } = netEdits[mutante]
  ? await load('../../public/js/netgame.js', ...netEdits[mutante])
  : await import('../../public/js/netgame.js');
const { OperacaoFlavio } = modeEdits[mutante]
  ? await load('../../public/js/mode_operacao_flavio.js', ...modeEdits[mutante])
  : await import('../../public/js/mode_operacao_flavio.js');
if (mutante) console.log('Mutação aplicada: '+mutante);

let failures = 0;
const check = (name, run) => { try { run(); console.log('✓ '+name); } catch (e) { failures++; console.error('✗ '+name+': '+e.message); } };
const body = team => ({ team, def: { id: 'senador' }, pos: new THREE.Vector3(), _meshWeapon: 'knife', alive: true });
for (const reverse of [false, true]) {
  const vip = body('B'), remote = body('B');
  const game = { bots: [vip, remote], player: body('E'), online: true, dedicated: true, el: {},
    world: { escortPath: [{ x: 0, z: 0 }, { x: 0, z: 5 }] },
    _trocarPersonagem() {}, _syncRemoteWeapon() {} };
  game.objective = new OperacaoFlavio(game, { id: 'senador' });
  vip._nid = 3;
  const net = { meta: { roster: [{ id: 2, team: 'B', char: 'senador' }, { id: 3, team: 'B', char: 'senador' }] },
    yourEnt: 1, startPing() {}, stopPing() {} };
  const mp = makeNetcode(game, net);
  try {
    check('snapshot do objetivo identifica VIP pelo id autoritativo', () => assert.equal(game.objective.netState().vipId, 3));
    check('corpos com o mesmo personagem preservam NPC e humano, ordem '+(reverse ? 'VIP primeiro' : 'humano primeiro'), () => {
      const ents = [{ id: 2, team: 'B', bot: false, name: 'Jogador', x: 9, y: 0, z: 8, yaw: 0 },
        { id: 3, team: 'B', bot: true, name: 'Flávio Bolsonaro', x: 0, y: 0, z: 1, yaw: 0 }];
      if (reverse) ents.reverse();
      mp._casar({ objective: { vipId: 3 }, ents });
      assert.equal(mp._netMap.get(3), vip, 'entidade VIP usa o corpo reservado');
      assert.equal(mp._netMap.get(2), remote, 'humano não toma o corpo do NPC');
      assert.equal(game.objective.vip, vip);
    });
    check('estado publica apenas identificadores inteiros dentro do contrato', () => {
      for (const id of [0, 65535, 65536, 0xffffffff]) { vip._nid = id; assert.equal(game.objective.netState().vipId, id); }
      for (const id of [undefined, null, -1, 0x100000000, 1.5, '3', NaN, Infinity]) {
        vip._nid = id; assert.equal(Object.hasOwn(game.objective.netState(), 'vipId'), false);
      }
    });
    check('recepção uint32 reserva VIP mesmo com humano de mesma skin, ordem '+(reverse ? 'VIP primeiro' : 'humano primeiro'), () => {
      for (const id of [65536, 0xffffffff]) {
        mp._netMap.clear();
        const ents=[{id:2,team:'B',bot:false,name:'Jogador',x:9,y:0,z:8,yaw:0},
          {id,team:'B',bot:true,name:'Flávio Bolsonaro',x:0,y:0,z:1,yaw:0}];
        if(reverse)ents.reverse();
        mp._casar({objective:{vipId:id},ents});
        assert.equal(mp._netMap.get(id),vip,'uint32 authoritativo reserva o NPC');
        assert.equal(mp._netMap.get(2),remote,'humano mantém seu corpo');
      }
    });
    check('sem objetivo preserva casamento legado por personagem e time', () => {
      const objective = game.objective;
      game.objective = null;mp._netMap.clear();
      try {
        mp._casar({ ents: [{ id: 5, team: 'B', bot: true, x: 0, y: 0, z: 0, yaw: 0 }] });
        assert.equal(mp._netMap.get(5), vip);
      } finally { game.objective = objective; }
    });
  } finally { mp.dispose(); game.objective.dispose(); }
}
if (failures) process.exitCode = 1;
