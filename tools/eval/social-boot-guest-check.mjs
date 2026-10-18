// B7 do boot-check: a 1ª visita chega ao menu sem nenhum modal (dono, 14/10/2026: conta e loja só depois da 1ª partida).
// Roda o trecho real da jornada B7 contra um navegador falso. Mutantes: --mutante=sem-contagem | clica-convidado | clica-treta
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

let source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', '0de819c42:tools/eval/boot-check.mjs'], { encoding: 'utf8' })
  : await readFile(new URL('./boot-check.mjs', import.meta.url), 'utf8');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) {
  const contagem = "    const modaisAbertura = await jornada.locator('dialog[open]').count();\n";
  const changes = {
    'sem-contagem': [contagem, '    const modaisAbertura = 0;\n'],
    'clica-convidado': [contagem, contagem + "    await jornada.locator('#account-entry-dialog .account-guest').click();\n"],
    'clica-treta': [contagem, contagem + "    await jornada.getByRole('button', { name: 'ENTENDI. BORA JOGAR.', exact: true }).click();\n"],
  };
  assert(changes[mutant], 'mutante desconhecido');
  const changed = source.replace(...changes[mutant]);
  assert.notEqual(changed, source, 'mutação não aplicada');
  source = changed;
}
const start = source.indexOf('    await jornada.goto(`${BASE}/?nav=1&home=legacy&ui=legacy`');
const end = source.indexOf("    await jornada.locator('#ms-continue').click();", start);
assert(start >= 0 && end > start, 'jornada B7 ausente');
const body = source.slice(start, end);
const veredito = source.match(/b7 = entradaOk[^;]*;/)?.[0] || '';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
try {
  assert.match(veredito, /modaisAbertura === 0/, 'B7 não reprova modal na abertura');
  for (const abertos of [0, 1, 2]) {
    let modes = 0;
    const jornada = {
      goto: async () => {}, waitForTimeout: async () => {}, waitForFunction: async () => {},
      getByRole() { return { async click() { throw new Error('jornada fura modal da loja em vez de medir'); } }; },
      locator(selector) {
        return {
          async dispatchEvent() {},
          async waitFor() {},
          async count() { return selector === 'dialog[open]' ? abertos : 1; },
          async evaluate(fn) { return fn({ classList: { contains: c => c === 'hidden' } }); },
          async click(options) {
            assert(!options?.force, 'não furar modal com force');
            if (/account-entry|treta-info/.test(selector)) throw new Error('jornada fecha modal de conta em vez de medir');
            modes++;
          },
        };
      },
    };
    const medido = await new AsyncFunction('jornada', 'BASE', `${body}\nreturn modaisAbertura;`)(jornada, 'http://127.0.0.1');
    assert.equal(medido, abertos, `B7 mediu ${medido} modais com ${abertos} abertos`);
    assert.equal(modes, 2, 'jornada não usou menu e modo reais');
  }
  console.log('PASS B7 executável: conta os modais da abertura, não fecha nenhum, segue pelo menu real');
} catch (error) {
  console.error(`RED social-boot-guest: ${error.message}`);
  process.exitCode = 1;
}
