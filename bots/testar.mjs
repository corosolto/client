/* testar.mjs — roda os testes 100% offline de todos os bots.
   ─────────────────────────────────────────────────────────────────────────────
   Cada bot declara testes/teste.mjs com `export async function testar(t)`.
   O contrato: SEM rede (LLM por fixture, GitHub por dry-run/mock), sai 1 se
   qualquer assert falha. Uso: bun testar.mjs [nome-do-bot...] */

import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const filtro = process.argv.slice(2);

function descobrir() {
  const alvos = [];
  const lib = join(RAIZ, 'lib', 'testes', 'teste.mjs');
  if (existsSync(lib)) alvos.push({ nome: 'lib', dir: join(RAIZ, 'lib'), arq: lib });
  for (const f of readdirSync(RAIZ, { withFileTypes: true })) {
    if (!f.isDirectory() || f.name === 'lib' || f.name.startsWith('.')) continue;
    const arq = join(RAIZ, f.name, 'testes', 'teste.mjs');
    if (existsSync(arq)) alvos.push({ nome: f.name, dir: join(RAIZ, f.name), arq });
  }
  return filtro.length ? alvos.filter((a) => filtro.some((f) => a.nome.includes(f))) : alvos;
}

let falhas = 0;
for (const alvo of descobrir()) {
  console.log(`\n▶ ${alvo.nome}`);
  const resultados = [];
  const t = {
    ok(cond, msg) { resultados.push([!!cond, msg]); },
    igual(a, b, msg) { resultados.push([Object.is(a, b), `${msg} (${JSON.stringify(a)} !== ${JSON.stringify(b)})`]); },
    contem(haystack, needle, msg) {
      const achou = String(haystack ?? '').includes(needle);
      resultados.push([achou, achou ? msg : `${msg} — esperava encontrar ${JSON.stringify(needle)} em:\n${String(haystack).slice(0, 400)}`]);
    },
  };
  try {
    const mod = await import(alvo.arq);
    await mod.testar(t, { dir: alvo.dir });
  } catch (e) {
    resultados.push([false, `exceção: ${e.message}\n${(e.stack || '').split('\n').slice(0, 3).join('\n')}`]);
  }
  let verdes = 0;
  for (const [passou, msg] of resultados) {
    if (passou) { verdes++; console.log(`  ✓ ${msg}`); }
    else { console.log(`  ✗ ${msg}`); }
  }
  if (resultados.length - verdes > 0) falhas += resultados.length - verdes;
  console.log(`  ${verdes}/${resultados.length} verde${verdes === resultados.length ? '' : ' — VERMELHO'}`);
}

console.log(falhas ? `\n✗ ${falhas} assert(s) vermelho(s)` : '\n✓ todos os testes verdes');
process.exit(falhas ? 1 : 0);
