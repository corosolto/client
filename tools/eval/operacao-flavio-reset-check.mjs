import assert from 'node:assert/strict';
import { OperacaoFlavio } from '../../public/js/mode_operacao_flavio.js';

// Codex escreve a régua; GLM/OMP recebe somente o reparo do modo.
class Position {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  clone() { return new Position(this.x, this.y, this.z); }
  copy(other) { return this.set(other.x, other.y, other.z); }
}

if (process.argv.includes('--mutante=sem-reset')) {
  const preparar = OperacaoFlavio.prototype.prepareRound;
  OperacaoFlavio.prototype.prepareRound = function () {
    const plano = this.game.world.objectivePlane;
    const antes = plano?.position.clone();
    preparar.call(this);
    if (antes) plano.position.copy(antes);
  };
  console.log('Mutação aplicada: rodada preserva a posição anterior do avião.');
}

for (const online of [false, true]) {
  for (const origem of [new Position(0, 0.08, 55), new Position(3, 2, 61)]) {
    const vip = { team: 'B', pos: new Position(), _meshWeapon: 'knife' };
    const game = {
      online, dedicated: false, time: 0, bots: [vip],
      world: {
        escortPath: [{ x: 0, z: 0 }, { x: 0, z: 8 }],
        groundHeightAt: () => 0,
        objectivePlane: { position: origem.clone() },
      },
      camera: { position: new Position(), lookAt() {} },
      vmScene: { visible: true },
      _trocarPersonagem() {},
      _syncRemoteWeapon() {},
    };
    const modo = new OperacaoFlavio(game, {});
    const duracao = modo.roundResult('B').duration;
    modo.prepareRound();
    for (let rodada = 0; rodada < 2; rodada++) {
      modo.startCinematic('B');
      game.time += duracao;
      modo.updatePresentation();
      assert.notDeepEqual(game.world.objectivePlane.position, origem, 'cinemática precisa mover o avião antes de testar o reset');
      modo.prepareRound();
      assert.deepEqual(game.world.objectivePlane.position, origem,
        `avião volta à posição original após rodada ${rodada + 1}, online=${online}`);
      assert.equal(modo.cinematic, null);
      assert.equal(game.vmScene.visible, true);
    }
    modo.startCinematic('E');
    game.time += modo.roundResult('E').duration;
    modo.updatePresentation();
    modo.prepareRound();
    assert.deepEqual(game.world.objectivePlane.position, origem, 'derrota também preserva a origem do avião');
    delete game.world.objectivePlane;
    assert.doesNotThrow(() => modo.prepareRound(), 'ausência do prop opcional não impede nova rodada');
    modo.dispose();
  }
}
console.log('✓ avião reinicia entre rodadas offline/online, incluindo origem não padrão e prop ausente');
