import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const mutante = process.argv.includes('--mutante=modo-ausente');
let source = readFileSync(new URL('../../public/js/mode-announcements.js', import.meta.url), 'utf8');
if (mutante) {
  const before = 'if (!ids.includes(c.id) || (!force && lidos().has(c.id)))';
  assert.equal(source.split(before).length - 1, 1, 'mutante tem alvo único');
  source = source.replace(before, 'if (!force && (!ids.includes(c.id) || lidos().has(c.id)))');
  console.log('Mutação aplicada: modo-ausente');
}
const { mostrarNovidadesModos } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

// A disponibilidade é condição de produto, inclusive no replay/QA.
let domAccess = 0;
globalThis.document = new Proxy({}, { get: (_, key) => {
  domAccess++;
  if (key === 'querySelector') return () => null;
  return () => { throw new Error('modo ausente não deve abrir DOM'); };
}});
globalThis.localStorage = { getItem() { throw new Error('storage bloqueado'); } };
for (const force of [false, true]) {
  let done = 0;
  domAccess = 0;
  assert.equal(mostrarNovidadesModos({mapIds: [], force, onDone: () => done++}), false);
  assert.equal(done, 1, 'fallback libera consumidor exatamente uma vez');
  assert.equal(domAccess, 0, 'force não anuncia um modo ausente do catálogo jogável');
}
console.log('✓ modo indisponível não abre anúncio nem no replay, com storage bloqueado e callback único');
