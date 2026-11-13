import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avaliarGrafiteGlobal } from '../tools/eval/graffiti-global-accept.mjs';
import { carregarDoEgo } from '../tools/eval/graffiti-current-accept.mjs';
const { MAPAS } = carregarDoEgo();
function medicao(id, i) {
  const piece = { file: `/img/decals/arte-${i}.png`, x: 0, y: 2, z: 0, ry: 0, w: 2, h: 2, uvValido: true, uvLegivel: true, uvDobra: false };
  const counters = { duplicates: 0, outside: 0, unsupported: 0, unknown: 0, divergent: 0, overlayPieces: 1, arteEsperada: true, unknownMotivos: {} };
  return { curation: { id, actualMap: id, mutante: '', ...counters, unclassifiedOccurrences: 0, unique: 1, unknownAmostra: [], erros: [], invalidado: false, nominalVerde: true, silencioOk: true, nominal: { ...counters } }, raw: { nominal: { id, total: 1, overlayPieces: 1, unique: 1, unclassifiedOccurrences: 0, duplicates: [], outside: [], unsupported: [], unknown: [], divergent: [], pieces: [piece] } } };
}
const controle = () => MAPAS.map(medicao);
test('global requires actual pieces across all maps, without consulting owners', () => {
  const r = avaliarGrafiteGlobal(controle()); assert.equal(r.verde, true); assert.equal(r.pecas, 14);
  // Rendered art may differ from an editorial manifest: acceptance measures uniqueness.
  const copies = controle(); copies[1].raw.nominal.pieces[0].file = copies[0].raw.nominal.pieces[0].file + '?v=other';
  const red = avaliarGrafiteGlobal(copies); assert.equal(red.verde, false); assert.equal(red.repetidas.length, 1);
});
test('URL origins, encoding and the known tag alias cannot disguise repeats', () => {
  const rows = controle(); rows[0].raw.nominal.pieces[0].file = 'https://example.invalid/img/decals/tag-larga.png?v=1'; rows[1].raw.nominal.pieces[0].file = '/img/decals/%74ag-fina.png?v=2';
  const red = avaliarGrafiteGlobal(rows); assert.equal(red.verde, false); assert.equal(red.repetidas[0].arquivo, '/img/decals/tag-fina.png');
});
test('incomplete, repeated, empty or unknown maps fail closed', () => {
  for (const change of [r => r.pop(), r => r.push(r[0]), r => { r[1] = structuredClone(r[0]); }, r => { r[0].curation.id = 'outro'; }, r => { r[0].raw.nominal.pieces = []; }, r => { r[0].raw.nominal.pieces[0].file = 'canvas:1'; }]) {
    const rows = controle(); change(rows); assert.equal(avaliarGrafiteGlobal(rows).verde, false);
  }
});
test('geometry, UV, summary, support and runtime evidence cannot be bypassed', () => {
  for (const change of [r => { r.raw.nominal = null; }, r => { r.raw.nominal.pieces[0].w = 0; }, r => { r.raw.nominal.pieces[0].uvDobra = true; }, r => { r.raw.nominal.unknown.push('unmeasured'); }, r => { r.raw.nominal.unsupported.push('no wall'); }, r => { r.curation.erros.push('HTTP404'); }, r => { r.curation.silencioOk = false; }, r => { r.curation.unique = 2; }, r => { r.raw.nominal.unique = 2; }, r => { r.raw.nominal.pieces.push(structuredClone(r.raw.nominal.pieces[0])); }]) {
    const rows = controle(); change(rows[0]); assert.equal(avaliarGrafiteGlobal(rows).verde, false);
  }
});
