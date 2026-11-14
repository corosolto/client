import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codigoDeSaida } from '../lib/report.mjs';

test('código de saída separa verde, vermelho e não medido', () => {
  assert.equal(codigoDeSaida({ inconclusivo: false, tecnicamenteVerde: true }), 0);
  assert.equal(codigoDeSaida({ inconclusivo: false, tecnicamenteVerde: false }), 1);
  assert.equal(codigoDeSaida({ inconclusivo: true, tecnicamenteVerde: false }), 78);
  assert.equal(codigoDeSaida({ inconclusivo: true, tecnicamenteVerde: true }), 78);
});
