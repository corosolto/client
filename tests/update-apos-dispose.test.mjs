import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('../tools/eval/harness.mjs');

/* #1407/#1408: "jogar de novo" descarta o Game velho e ele segue em `game` durante o preload
   do novo; o rAF continuava chamando update() e o `puffFx` já nulo derrubava o loop. */
test('update depois do dispose não lança', () => {
  const g = H.bootGame('campomorro', { textures: H.initTextures(), bots: 0 });
  g.update(1 / 60, true);
  g.dispose();
  assert.equal(g.puffFx, null, 'o dispose solta o puffFx, que é o que o update tocava');
  assert.doesNotThrow(() => g.update(1 / 60, true));
});
