import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const validos = new Set(['', 'staging-dispatch-arbitrario', 'prod-sem-ancestria']);
if (!validos.has(mutante)) {
  console.error('uso: cf-deploy-ref-check [--mutante=staging-dispatch-arbitrario|prod-sem-ancestria]');
  process.exit(2);
}

let staging = readFileSync('.github/workflows/cf-staging-deploy.yml', 'utf8');
let producao = readFileSync('.github/workflows/cf-prod-deploy.yml', 'utf8');
if (mutante === 'staging-dispatch-arbitrario') {
  staging = staging.replace("github.event_name == 'workflow_dispatch' && 'refs/heads/staging' || github.sha", 'github.ref');
}
if (mutante === 'prod-sem-ancestria') {
  producao = producao.replace(/\n\s+git merge-base --is-ancestor HEAD origin\/main \|\| \{[\s\S]*?\n\s+\}/, '');
}

const falhas = [];
const check = (ok, id, mensagem) => { if (!ok) falhas.push(`${id} ${mensagem}`); };
check(/REF: \$\{\{ github\.event_name == 'workflow_dispatch' && 'refs\/heads\/staging' \|\| github\.sha \}\}/.test(staging),
  'CFREF1', 'dispatch de staging precisa fixar refs/heads/staging');
check(/ref: \$\{\{ env\.REF \}\}/.test(staging), 'CFREF1', 'checkout de staging precisa usar o ref validado');
check(/id: build[\s\S]*git rev-parse HEAD[\s\S]*steps\.build\.outputs\.sha/.test(staging),
  'CFREF1', 'build e verificação precisam compartilhar o SHA realmente checado');

const valida = producao.indexOf('- name: Valida tag de rollback na main');
const primeiroSegredo = producao.indexOf('${{ secrets.CF_WORKERS_TOKEN }}');
check(valida >= 0 && primeiroSegredo > valida, 'CFREF2', 'tag precisa ser validada antes de qualquer segredo Cloudflare');
check(/\^v\[0-9\]\+/.test(producao) && /refs\/tags\/\$TAG/.test(producao), 'CFREF2', 'rollback precisa aceitar somente tag semver e resolver a tag imutável');
check(/git merge-base --is-ancestor HEAD origin\/main/.test(producao), 'CFREF2', 'tag de rollback precisa pertencer à história da main');
check(/git rev-parse "refs\/tags\/\$TAG\^\{commit\}"/.test(producao), 'CFREF2', 'checkout precisa corresponder ao commit da tag');

for (const falha of falhas) console.error(`FAIL ${falha}`);
if (mutante && !falhas.length) {
  console.error(`mutante ${mutante}: régua cega`);
  process.exit(1);
}
if (falhas.length) process.exit(1);
console.log('PASS CF-REF: dispatch usa somente staging ou tag semver alcançável pela main antes dos segredos');
