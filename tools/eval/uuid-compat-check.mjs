import fs from 'node:fs';
import vm from 'node:vm';

const file = new URL('../../public/js/main.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const mutant = process.argv.includes('--mutante=chamada-direta');

if (mutant) {
  source = source.replace('a = clientUuid()', 'a = crypto.randomUUID()');
  source = source.replace('t = clientUuid()', 't = crypto.randomUUID()');
}

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} nao encontrado`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} incompleto`);
}

const uuidFn = functionSource('clientUuid');
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function run(crypto) {
  const context = vm.createContext({ crypto, Uint8Array, Math });
  vm.runInContext(`${uuidFn}; globalThis.result = clientUuid()`, context);
  return context.result;
}

const native = '11111111-2222-4333-8444-555555555555';
if (run({ randomUUID: () => native }) !== native) throw new Error('nao usa randomUUID quando disponivel');
if (!uuidRe.test(run({ getRandomValues: bytes => bytes.fill(0xab) }))) throw new Error('fallback getRandomValues invalido');
try {
  run(undefined);
  throw new Error('sem Web Crypto gerou token fraco');
} catch (error) {
  if (error?.message === 'sem Web Crypto gerou token fraco') throw error;
}

for (const name of ['getAnonId', 'getToken']) {
  if (!functionSource(name).includes('clientUuid()')) throw new Error(`${name} ainda chama randomUUID diretamente`);
}
if (source.includes('crypto.randomUUID()')) throw new Error('chamada direta a crypto.randomUUID permanece');

console.log('UUID1 PASS: IDs continuam UUID v4 sem depender de crypto.randomUUID');
