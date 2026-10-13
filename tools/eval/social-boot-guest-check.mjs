// PR807: B7 deve atravessar o modal de conta pelo gesto de convidado antes do menu.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

let source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', '0de819c42:tools/eval/boot-check.mjs'], { encoding: 'utf8' })
  : await readFile(new URL('./boot-check.mjs', import.meta.url), 'utf8');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) {
  const removals = {
    'sem-convidado': "await jornada.locator('#account-entry-dialog .account-guest').click();",
    'sem-trigger': "await jornada.locator('#hub-account-login').dispatchEvent('click');",
    'sem-readiness': "await jornada.waitForFunction(() => !!document.getElementById('hub-account-login')?.onclick);",
  };
  assert(removals[mutant], 'mutante desconhecido');
  const changed = source.replace(removals[mutant], '');
  assert.notEqual(changed, source, 'mutação não aplicada');
  source = changed;
}
const start = source.indexOf('    await jornada.goto(`${BASE}/?nav=1&home=legacy`');
const end = source.indexOf('    await jornada.evaluate(() => {', start);
assert(start >= 0 && end > start, 'jornada B7 ausente');
const body = source.slice(start, end);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
try {
  for (const [available, delayed] of [[true, false], [true, true], [false, false]]) {
    let modal = false, guests = 0, modes = 0, dismissed = false, consent = false, ready = false;
    const jornada = {
      goto: async () => {}, waitForTimeout: async () => {},
      waitForFunction: async () => { ready = true; },
      locator(selector) {
        return {
          async dispatchEvent() {
            if (selector === '#hub-account-login') {
              assert(ready, 'trigger ainda sem onclick'); modal = true;
            }
            else modal = available && !delayed;
          },
          async count() { return available ? 1 : 0; },
          async isVisible() { return modal; },
          async waitFor(options) {
            if (selector === '#account-entry-dialog' && options.state === 'hidden') {
              assert.equal(modal, false, 'modal não fechou'); dismissed = true;
            }
          },
          async evaluate(fn) { return fn({ classList: { contains: c => c === 'hidden' } }); },
          async click(options) {
            assert(!options?.force, 'não furar modal com force');
            if (selector === '#account-entry-dialog .account-guest') {
              assert(modal, 'convidado fora do modal'); modal = false; guests++; consent = true;
            } else {
              if (delayed && !consent) modal = true;
              assert(!modal, 'dialog account-entry intercepta menu B7'); modes++;
            }
          },
        };
      },
    };
    await new AsyncFunction('jornada', 'BASE', body)(jornada, 'http://127.0.0.1');
    assert.equal(modes, 2, 'jornada não usou menu e modo reais');
    assert.equal(guests, available ? 1 : 0, 'jornada ignorou escolha de convidado');
    if (available) assert(dismissed, 'não aguardou fechamento');
  }
  console.log('PASS B7 executável: gesto de convidado, fechamento, menu; alvo legado preservado');
} catch (error) {
  console.error(`RED social-boot-guest: ${error.message}`);
  process.exitCode = 1;
}
