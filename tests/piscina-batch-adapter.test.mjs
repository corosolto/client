import test from 'node:test';
import assert from 'node:assert/strict';
import { bindings } from '../tools/eval/piscina-graffiti-batch-check.mjs';
import { traduzirResultado } from '../tools/eval/piscina-mutante-adapter.mjs';
import { aceitaResultado } from '../tools/eval/mutante-semantico-proof.mjs';

const mutant = 'lote-sem-permissao', clause = 'authored-batch-permission';
const names = ['piscina_escada', 'piscina_armarios', 'piscina_banco', 'piscina_espreguicadeira']
  .map(id => `piscina:${id}:batch`).sort();
const cases = ['piscina-editorial', 'actual-final-geometry', 'colliders-parity',
  'spawns-parity', 'pickups-parity', 'shot-parity', clause];
const expected = { nonce: '12345678-1234-1234-1234-123456789abc', mutante: mutant, sources: bindings() };
function fixture(change = () => {}) {
  const rec = { schema: 'cs-piscina-batch/1', nonce: expected.nonce, mutante: mutant,
    cases, sourcesBefore: structuredClone(expected.sources), sourcesAfter: structuredClone(expected.sources),
    batches: [...names], pintaveis: [...names], error: 'ContractViolation', failed: [clause],
    application: { target: 'batchAuthoredProps.graffitiSupportExcluded', count: 1,
      sourceBefore: expected.sources.map, sourceAfter: 'b'.repeat(64) } };
  change(rec);
  const gates = cases.map(gate => ({ gate, ...(gate === clause ? { lotes: rec.batches.length, pintaveis: rec.pintaveis } : {}) }));
  return { status: 1, signal: null, error: null, stderr: '', stdout:
    'Piscina batch gate: real geometry, order mutation, exclusion and physics parity passed\n'
    + gates.map(g => JSON.stringify(g)).join('\n') + '\nPISCINA-BATCH ' + JSON.stringify(rec) + '\n' };
}

test('recibo exato dos quatro lotes atravessa os dois juízes', () => {
  const verdict = traduzirResultado(fixture(), expected);
  assert.equal(verdict.ok, true);
  assert.equal(aceitaResultado({ status: 1, stdout: `Mutação aplicada: ${mutant}\n${JSON.stringify(verdict.report)}` },
    { mutant, clause, cases: 1 }), true);
});

for (const [name, change] of [
  ['três lotes ausentes', r => { r.batches = r.batches.slice(0, 1); r.pintaveis = [...r.batches]; }],
  ['somente um lote pintável', r => { r.pintaveis = r.pintaveis.slice(0, 1); }],
  ['nonce antigo', r => { r.nonce = 'antigo'; }],
  ['fonte anterior divergente', r => { r.sourcesBefore.map = 'a'.repeat(64); }],
  ['fonte final divergente', r => { r.sourcesAfter.map = 'a'.repeat(64); }],
  ['aplicação cega', r => { r.application.sourceAfter = r.application.sourceBefore; }],
  ['aplicação duplicada', r => { r.application.count = 2; }],
  ['cláusula errada', r => { r.failed = ['legacy-control']; }],
  ['censo incompleto', r => { r.cases = [clause]; }],
]) test(`não traduz ${name} como prova semântica`, () => {
  assert.equal(traduzirResultado(fixture(change), expected).ok, false);
});

for (const [name, change] of [
  ['sucesso sem violação', r => { r.status = 0; }],
  ['falha de setup', r => { r.status = 3; }],
  ['processo interrompido', r => { r.signal = 'SIGTERM'; }],
  ['erro de transporte', r => { r.error = new Error('indisponível'); }],
  ['stderr inesperado', r => { r.stderr = 'erro'; }],
  ['recibo ausente', r => { r.stdout = ''; }],
  ['recibo duplicado', r => { r.stdout += r.stdout; }],
]) test(`não traduz ${name}`, () => {
  const result = fixture(); change(result);
  assert.equal(traduzirResultado(result, expected).ok, false);
});

test('adapter recusa pedido nominal e contrato ausente', () => {
  assert.equal(traduzirResultado(fixture(), { ...expected, mutante: '' }).ok, false);
  assert.equal(traduzirResultado(fixture(), null).ok, false);
});
