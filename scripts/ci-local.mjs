#!/usr/bin/env node
/* Ambiente do CI antes do veredito: exit 78 (EX_CONFIG) significa "não mediu".
   Uso: node scripts/ci-local.mjs [--setup|--diagnose|--selftest] [script-npm] */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SAIDA_AMBIENTE = 78;
const NODE_CI = 22;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(RAIZ);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const NPM_CI = pkg.packageManager?.split('@')[1] || '';
const PW_CI = lock.packages?.['node_modules/playwright']?.version || '';
if (!NPM_CI || !PW_CI) throw new Error('packageManager npm e Playwright do lock são obrigatórios');

function bibliotecasAusentes(texto) {
  return [...new Set(String(texto).split('\n')
    .map((linha) => linha.match(/^\s*(\S+)\s+=>\s+not found\s*$/)?.[1])
    .filter(Boolean))];
}

function erroNativoNavegador(texto) {
  return /error while loading shared libraries|Host system is missing dependencies|missing dependencies|ERR_DLOPEN_FAILED/i.test(String(texto));
}

function ambienteFilho(base, chromeBin) {
  return { ...base, CHROME_BIN: chromeBin };
}

function executa(cmd, args, opcoes = {}) {
  const r = spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', ...opcoes });
  if (r.error) console.error(`[ambiente] ${cmd}: ${r.error.message}`);
  return r.status ?? 1;
}

function captura(cmd, args) {
  return spawnSync(cmd, args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function versaoLocal(nome) {
  try { return JSON.parse(readFileSync(path.join('node_modules', nome, 'package.json'), 'utf8')).version; }
  catch { return ''; }
}

function rootGlobal() {
  const r = captura('npm', ['root', '--global']);
  return r.status === 0 ? r.stdout.trim() : '';
}

function validarRuntime(problemas) {
  const nodeOk = process.versions.node.split('.')[0] === String(NODE_CI);
  console.log(`  ${nodeOk ? '✓' : '✗'} Node ${process.versions.node} (CI: ${NODE_CI}.x)`);
  if (!nodeOk) problemas.push(`Node ${NODE_CI} é obrigatório; abra o Dev Container ou instale a versão do CI`);
  const r = captura('npm', ['--version']);
  const npm = r.status === 0 ? r.stdout.trim() : '';
  const npmOk = npm === NPM_CI;
  console.log(`  ${npmOk ? '✓' : '✗'} npm ${npm || 'não encontrado'} (packageManager: ${NPM_CI})`);
  if (!npmOk) problemas.push(`npm ${NPM_CI} é obrigatório; o Dev Container instala a versão de packageManager`);
}

async function diagnosticar() {
  console.log('\nCI-ENV: diagnóstico do ambiente (nenhum teste executado ainda)');
  const problemas = [];
  validarRuntime(problemas);

  const astro = existsSync('node_modules/astro/package.json');
  const pwLocal = versaoLocal('playwright');
  const depsOk = astro && pwLocal === PW_CI;
  console.log(`  ${depsOk ? '✓' : '✗'} dependências da worktree${pwLocal ? ` (Playwright ${pwLocal})` : ''}`);
  if (!depsOk) problemas.push('dependências ausentes ou divergentes do lock; rode `node scripts/ci-local.mjs --setup`');

  const globalRoot = rootGlobal();
  const globalPkg = globalRoot ? path.join(globalRoot, 'playwright', 'package.json') : '';
  let pwGlobal = '';
  let chromium;
  try {
    pwGlobal = JSON.parse(readFileSync(globalPkg, 'utf8')).version;
    const modulo = await import(pathToFileURL(path.join(globalRoot, 'playwright', 'index.js')).href);
    chromium = modulo.chromium || modulo.default?.chromium;
  } catch { /* diagnosticado abaixo sem transformar import ausente em falha de teste */ }
  const globalOk = pwGlobal === PW_CI && !!chromium;
  console.log(`  ${globalOk ? '✓' : '✗'} Playwright global ${pwGlobal || 'não encontrado'} (lock: ${PW_CI})`);
  if (!globalOk) problemas.push(`Playwright global ${PW_CI} ausente; rode \`node scripts/ci-local.mjs --setup\``);

  let chromeBin = process.env.CHROME_BIN || '';
  if (chromium) {
    try { if (!chromeBin) chromeBin = chromium.executablePath(); }
    catch (e) { problemas.push(`Chromium não resolveu: ${e.message}`); }
  }
  let chromeOk = false;
  if (chromeBin) {
    try { accessSync(chromeBin, constants.X_OK); chromeOk = true; } catch { /* reportado abaixo */ }
  }
  console.log(`  ${chromeOk ? '✓' : '✗'} CHROME_BIN ${chromeBin || 'não resolveu'}`);
  if (!chromeOk) problemas.push('Chromium ausente ou não executável; rode `node scripts/ci-local.mjs --setup`');

  let nativasOk = chromeOk;
  if (chromeOk && process.platform === 'linux') {
    const ldd = captura('ldd', [chromeBin]);
    const ausentes = bibliotecasAusentes(`${ldd.stdout}${ldd.stderr}`);
    nativasOk = ausentes.length === 0;
    console.log(`  ${nativasOk ? '✓' : '✗'} bibliotecas nativas do Chromium${ausentes.length ? `: ${ausentes.join(', ')}` : ''}`);
    if (ausentes.length) problemas.push(`bibliotecas nativas ausentes (${ausentes.join(', ')}); rode \`node scripts/ci-local.mjs --setup\` para instalar os pacotes do sistema`);
  }

  if (chromeOk && chromium && nativasOk) {
    try {
      const browser = await chromium.launch({ executablePath: chromeBin, headless: true, timeout: 15_000 });
      await browser.close();
      console.log('  ✓ Chromium abriu e fechou sem executar uma régua');
    } catch (e) {
      const detalhe = String(e.message || e).slice(0, 1600);
      const nativo = erroNativoNavegador(detalhe);
      console.error(`  ✗ Chromium não abriu (${nativo ? 'dependência nativa/sistema' : 'configuração de processo'})\n${detalhe}`);
      problemas.push(`Chromium não abriu; ${nativo ? 'instale as dependências nativas com `node scripts/ci-local.mjs --setup`' : 'corrija a configuração antes de rodar testes'}`);
    }
  }

  if (problemas.length) {
    console.error(`\n⊘ SKIP CI-ENV não medido: ${problemas.length} problema(s) de ambiente`);
    for (const p of problemas) console.error(`  - ${p}`);
    console.error('Nenhuma falha acima é veredito de teste.');
  } else {
    console.log(`\nCI-ENV ok. Para terminais já abertos: export CHROME_BIN=${JSON.stringify(chromeBin)}`);
  }
  return { ok: problemas.length === 0, chromeBin };
}

async function preparar() {
  const runtime = [];
  validarRuntime(runtime);
  if (runtime.length) {
    for (const p of runtime) console.error(`  - ${p}`);
    return SAIDA_AMBIENTE;
  }
  let status = executa(process.execPath, ['scripts/setup.mjs']);
  if (status) return SAIDA_AMBIENTE;
  status = executa('npm', ['install', '--global', '--no-audit', '--no-fund', `playwright@${PW_CI}`]);
  if (status) return SAIDA_AMBIENTE;
  const cli = path.join(rootGlobal(), 'playwright', 'cli.js');
  const args = [cli, 'install', ...(process.platform === 'linux' ? ['--with-deps'] : []), 'chromium'];
  status = executa(process.execPath, args);
  if (status) return SAIDA_AMBIENTE;
  return (await diagnosticar()).ok ? 0 : SAIDA_AMBIENTE;
}

function selftest() {
  assert.deepEqual(bibliotecasAusentes('\tlibatk-1.0.so.0 => not found\nlibx.so => /lib/libx.so (0x1)\nlibatk-1.0.so.0 => not found'), ['libatk-1.0.so.0']);
  assert.equal(erroNativoNavegador('error while loading shared libraries: libnss3.so'), true);
  assert.equal(erroNativoNavegador('Expected button to be visible'), false);
  const env = ambienteFilho({ PATH: '/bin' }, '/opt/chrome');
  assert.equal(env.CHROME_BIN, '/opt/chrome');
  assert.equal('PREPUSH' in env, false);
  assert.equal(ambienteFilho({ PREPUSH: '1' }, '/opt/chrome').PREPUSH, '1');
  assert.equal(lock.packages['node_modules/playwright'].version, PW_CI);
  console.log('CI-ENV selftest ok: parsing nativo, classificação e ambiente filho cobertos.');
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  if (args.includes('--setup')) return preparar();
  if (args.includes('--diagnose')) return (await diagnosticar()).ok ? 0 : SAIDA_AMBIENTE;
  if (args.some((a) => a.startsWith('-')) || args.length > 1) {
    console.error('Uso: node scripts/ci-local.mjs [--setup|--diagnose|--selftest] [script-npm]');
    return 64;
  }
  const script = args[0] || 'check:fast';
  if (!pkg.scripts?.[script]) {
    console.error(`[ambiente] script npm inexistente: ${script}`);
    return 64;
  }
  const diag = await diagnosticar();
  if (!diag.ok) return SAIDA_AMBIENTE;
  console.log(`\n[testes] npm run ${script}`);
  const status = executa('npm', ['run', script], { env: ambienteFilho(process.env, diag.chromeBin) });
  if (status) console.error(`[testes] ${script} terminou com ${status}; o ambiente já havia passado no diagnóstico.`);
  return status;
}

process.exitCode = await main();
