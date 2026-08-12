import { readFileSync } from 'node:fs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
let page = readFileSync('src/pages/index.astro', 'utf8');
if (mutant === 'erro') page = page.replace("consoleErroNativo('Erro global não tratado'", "void ('Erro global não tratado'");
else if (mutant === 'promise') page = page.replace("consoleErroNativo('Promise rejeitada sem tratamento'", "void ('Promise rejeitada sem tratamento'");
else if (mutant) throw new Error(`mutante desconhecido: ${mutant}`);

const failures = [];
if (!/addEventListener\('error'[\s\S]{0,500}consoleErroNativo\('Erro global não tratado'/.test(page))
  failures.push('EC1 window.error não preserva a exceção no console nativo');
if (!/addEventListener\('unhandledrejection'[\s\S]{0,500}consoleErroNativo\('Promise rejeitada sem tratamento'/.test(page))
  failures.push('EC2 unhandledrejection não preserva a rejeição no console nativo');

for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (mutant && !failures.length) failures.push(`mutação ${mutant} não foi detectada`);
if (failures.length) {
  console.error(`\x1b[31mERROR-CONSOLE ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else console.error('\x1b[32mERROR-CONSOLE verde: exceções globais permanecem no console\x1b[0m');
