#!/usr/bin/env node
// Confirma chamadas ao consumidor real e remove sua correção só em memória.
// Contratos, códigos de saída e uso: docs/visual-consistency/AK-ADS.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PERMITIDAS = new Set(['mutante', 'armas', 'asset-root', 'fotos']);
const ruim = process.argv.slice(2).find((a) => a.startsWith('--') && (!PERMITIDAS.has(a.slice(2).split('=')[0]) || a === `--${a.slice(2).split('=')[0]}`));
if (ruim) { console.error(`flag desconhecida ou sem valor: ${ruim}`); process.exit(2); }
const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const mutant = process.argv.includes('--mutante=consumidor');
process.argv = process.argv.filter((a) => a !== '--mutante=consumidor');   // o checker não conhece este mutante
const ARMAS = arg('armas', 'pistol,deagle,ak').split(',').filter(Boolean);
if (!ARMAS.length || new Set(ARMAS).size !== ARMAS.length) { console.error(`--armas vazio ou duplicado: '${ARMAS.join(',')}'`); process.exit(2); }
// Mesmo ambiente do checker (vmfabrica=1) ANTES do import do consumidor real.
if (typeof window === 'undefined') globalThis.window = { location: { search: '?vmfabrica=1' } };
const { AuthoredViewModels } = await import(pathToFileURL(path.join(ROOT, 'public/js/authoredvm.js')).href);

const original = AuthoredViewModels.prototype.update;
let update = original, calls = 0;
if (mutant) {
  const url = new URL('../../public/js/authoredvm.js', import.meta.url);
  const before = 'adsEfetivo(cfgArma(this.weapon)?.ads, ADS1P_FIX)';
  let source = readFileSync(url, 'utf8');
  if (source.split(before).length !== 2) { console.error('MUTACAO NAO APLICADA: âncora única não encontrada no consumidor real'); process.exit(4); }
  source = source.replace(before, 'cfgArma(this.weapon)?.ads')
    .replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  const m = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  update = m.AuthoredViewModels.prototype.update;
  console.log('Mutação aplicada: consumidor (adsEfetivo retirado do update real)');
}
AuthoredViewModels.prototype.update = function (...args) { calls++; return update.apply(this, args); };

const exit = process.exit, log = console.log, error = console.error, lines = [];
class CheckerExit extends Error { constructor(code) { super('checker exit ' + code); this.code = code; } }
process.exit = (code) => { throw new CheckerExit(code); };
console.log = (...a) => { lines.push(a.join(' ')); log(...a); };
console.error = (...a) => { lines.push(a.join(' ')); error(...a); };
let result = null;
try { await import('./ads1p-linha-check.mjs'); result = 0; }
catch (e) {
  if (e instanceof CheckerExit) result = e.code;
  else { process.exit = exit; console.log = log; console.error = error; console.error('CRASH no checker:', e); exit(3); }
}
finally { process.exit = exit; console.log = log; console.error = error; AuthoredViewModels.prototype.update = original; }

// Classificação do checker vem ANTES das asserções: seleção inválida (2) e
// lote incompleto por setup/asset (5) não são falha geométrica nem detecção.
if (result === 2) { console.error('checker recusou o lote (arma inválida/CLI)'); process.exit(2); }
if (result === 5) { console.error('checker recusou o lote (setup/asset) — lote incompleto não avalia causalidade'); process.exit(5); }
try {
  assert.equal(calls, ARMAS.length, `cada arma (${ARMAS.join(',')}) deve passar exatamente 1 vez pelo update real — chamadas: ${calls}`);
  const mordida = lines.some((s) => / L[123]v? /.test(s));
  if (mutant) {
    assert.equal(result, 1, 'retirar adsEfetivo do consumidor real deve reprovar a régua');
    assert(mordida, 'mordida deve ser geometria/imagem L1–L1v/L2/L3, não setup');
    assert(!lines.some((s) => /NÃO SEI MEDIR|não sei medir|TypeError|ReferenceError|SyntaxError/.test(s)), 'setup não é evidência');
  } else {
    assert.equal(result, 0, 'baseline com consumidor real deve passar');
  }
} catch (e) { console.error(e.message); process.exit(1); }
console.log(JSON.stringify({ mutant: mutant ? 'consumidor' : null, realUpdateCalls: calls, armas: ARMAS, checkerExit: result, pass: true, browserQA: false }));
