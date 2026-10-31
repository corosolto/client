// B7 do boot-check: a 1ª visita chega ao menu sem nenhum modal (dono, 14/10/2026: conta e loja só depois da 1ª partida).
// Roda o trecho real da jornada B7 contra um navegador falso. Mutantes: --mutante=sem-contagem | clica-convidado | clica-treta
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
  assert.equal(source.indexOf(contagem), source.lastIndexOf(contagem), 'âncora de mutação duplicada');
  assert.notEqual(changed, source, 'mutação não aplicada');
  source = changed;
  console.error(`MUTACAO_B7_APLICADA:${mutant}`);
}
if (process.argv.includes('--mutantes')) {
  const run = (args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  const casos = [
    { args: [], status: 0, stream: 'stdout', clause: 'PASS B7 executável' },
    { args: ['--mutante=sem-contagem'], status: 1, stream: 'stderr', clause: 'RED social-boot-guest: AssertionError: B7 mediu 0 modais com 1 abertos' },
    { args: ['--mutante=clica-convidado'], status: 1, stream: 'stderr', clause: 'RED social-boot-guest: AssertionError: jornada fecha modal de conta em vez de medir' },
    { args: ['--mutante=clica-treta'], status: 1, stream: 'stderr', clause: 'RED social-boot-guest: AssertionError: jornada fura modal da loja em vez de medir' },
  ];
  try {
    for (const caso of casos) {
      const r = run(caso.args);
      assert.ok(!r.error && !r.signal, `driver não rodou: ${caso.args.join(' ') || 'baseline'}`);
      if (caso.status === 1) assert.ok(r.stderr.includes(`MUTACAO_B7_APLICADA:${caso.args[0].split('=')[1]}`), 'mutação sem marcador de aplicação');
      assert.equal(r.status, caso.status, `status inesperado: ${caso.args.join(' ') || 'baseline'}`);
      assert.ok((caso.stream === 'stdout' ? r.stdout : r.stderr || '').includes(caso.clause), `cláusula ausente: ${caso.clause}`);
      assert.ok(!/TypeError|ReferenceError|SyntaxError|ERR_MODULE|setup/.test(`${r.stdout}${r.stderr}`), 'saída com erro de tipo/sintaxe/setup');
    }
    console.log('PASS social-boot-guest --mutantes: baseline 0 e 3 mutantes 1 com cláusula exata');
  } catch (error) {
    console.error(`RED social-boot-guest: ${error.name}: ${String(error.message).slice(0, 200)}`);
    process.exitCode = 1;
  }
} else {
const start = source.indexOf('    await jornada.goto(`${BASE}/?nav=1&home=legacy&ui=legacy`');
const end = source.indexOf("    await jornada.locator('#ms-continue').click();", start);
assert(start >= 0 && end > start, 'jornada B7 ausente');
const body = source.slice(start, end);
const veredito = source.match(/b7 = entradaOk[^;]*;/)?.[0] || '';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
try {
  assert.match(veredito, /modaisAbertura === 0/, 'B7 não reprova modal na abertura');
  for (const anuncioAberto of [false, true]) for (const abertos of [0, 1, 2]) {
    let modes = 0, anuncioFechado = !anuncioAberto, cliquesAnuncio = 0;
    const jornada = {
      goto: async () => {}, waitForTimeout: async () => {}, waitForFunction: async () => {},
      getByRole() { return { async click() { assert.fail('jornada fura modal da loja em vez de medir'); } }; },
      locator(selector) {
        return {
          async dispatchEvent() {},
          async waitFor(options) {
            if (options?.state === 'detached') assert.ok(anuncioFechado, 'anúncio seguiu aberto após o clique no botão primário');
          },
          async count() { return selector === 'dialog[open]' ? abertos + (anuncioFechado ? 0 : 1) : selector === 'dialog.cs-modes-dialog[open]' ? (anuncioFechado ? 0 : 1) : 1; },
          async evaluate(fn) { return fn({ classList: { contains: c => c === 'hidden' } }); },
          async click(options) {
            assert(!options?.force, 'não furar modal com force');
            if (/account-entry|treta-info/.test(selector)) assert.fail('jornada fecha modal de conta em vez de medir');
            assert.ok(['.cs-item[data-act="single-player"]', '.cs-item[data-act="sp"]:visible'].includes(selector), `clique inesperado: ${selector}`);
            modes++;
          },
          locator(nested) {
            assert.equal(selector, 'dialog.cs-modes-dialog[open]', 'locator aninhado pertence ao anúncio');
            assert.equal(nested, '.cs-modes-primario', 'o anúncio só fecha pelo botão primário do anúncio');
            return { async click() { anuncioFechado = true; cliquesAnuncio++; } };
          },
        };
      },
    };
    const medido = await new AsyncFunction('jornada', 'BASE', `${body}\nreturn modaisAbertura;`)(jornada, 'http://127.0.0.1');
    assert.equal(medido, abertos, `B7 mediu ${medido} modais com ${abertos} abertos`);
    assert.equal(cliquesAnuncio, anuncioAberto ? 1 : 0, 'jornada deve fechar exatamente o anúncio presente');
    assert.ok(anuncioFechado, 'anúncio presente não foi fechado');
    assert.equal(modes, 2, 'jornada não usou menu e modo reais');
  }
  console.log('PASS B7 executável: conta os modais da abertura, não fecha nenhum, segue pelo menu real');
} catch (error) {
  console.error(`RED social-boot-guest: ${error.name}: ${String(error.message).slice(0, 200)}`);
  process.exitCode = 1;
}
}
