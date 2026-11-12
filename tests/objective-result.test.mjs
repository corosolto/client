import assert from 'node:assert/strict';
import test from 'node:test';
import { timesComTerritorio } from '../public/js/objective-result.js';

test('escort objective without territory does not become a territory scoreboard', () => {
  assert.equal(timesComTerritorio({ state: { winner: 'B', checkpoint: 4 } }), null);
});

test('match without an objective has no territory scoreboard', () => {
  assert.equal(timesComTerritorio(undefined), null);
  assert.equal(timesComTerritorio(null), null);
});

test('territory objective selects the configured factions', () => {
  assert.deepEqual(timesComTerritorio({ regras: { times: 3 }, state: { territorio: { E: 0.2, B: 0.3, J: 0.5 } } }), ['E', 'B', 'J']);
  assert.deepEqual(timesComTerritorio({ state: { territorio: { E: 0.4, J: 0.6 } } }), ['E', 'J']);
});
