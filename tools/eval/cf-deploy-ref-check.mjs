import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const validos = new Set(['', 'staging-dispatch-arbitrario', 'prod-dispatch-arbitrario', 'prod-sem-candidato', 'prod-sem-preview-url']);
if (!validos.has(mutante)) {
  console.error('uso: cf-deploy-ref-check [--mutante=staging-dispatch-arbitrario|prod-dispatch-arbitrario|prod-sem-candidato|prod-sem-preview-url]');
  process.exit(2);
}

let staging = readFileSync('.github/workflows/cf-staging-deploy.yml', 'utf8');
let producao = readFileSync('.github/workflows/cf-prod-deploy.yml', 'utf8');
let stagingConfig = readFileSync('wrangler.staging.toml', 'utf8');
let producaoConfig = readFileSync('wrangler.prod.toml', 'utf8');
if (mutante === 'staging-dispatch-arbitrario') {
  staging = staging.replace('    branches: [staging]', '    branches: [staging]\n  workflow_dispatch:');
}
if (mutante === 'prod-dispatch-arbitrario') {
  producao = producao.replace('    branches: [main]', '    branches: [main]\n  workflow_dispatch:');
}
if (mutante === 'prod-sem-candidato') {
  producao = producao.replace('npx wrangler versions upload', 'npx wrangler versions deploy');
}
if (mutante === 'prod-sem-preview-url') {
  producaoConfig = producaoConfig.replace('preview_urls = true', 'preview_urls = false');
}

const falhas = [];
const check = (ok, id, mensagem) => { if (!ok) falhas.push(`${id} ${mensagem}`); };
const validaWorkflow = (fonte, ramo, id) => {
  check(!/^\s+workflow_dispatch:/m.test(fonte), id, 'workflow com segredo Cloudflare não pode executar YAML de ref arbitrário');
  check(new RegExp(`branches: \\[${ramo}\\]`).test(fonte), id, `deploy precisa nascer de push na ${ramo} protegida`);
  check(/ref: \$\{\{ github\.sha \}\}/.test(fonte), id, 'checkout precisa fixar o SHA do push');
  check(/id: build[\s\S]*git rev-parse HEAD[\s\S]*steps\.build\.outputs\.sha/.test(fonte),
    id, 'build e verificação precisam compartilhar o SHA realmente checado');
  const upload = fonte.indexOf('npx wrangler versions upload');
  const verifica = fonte.indexOf('node tools/cf/verifica-deploy.mjs');
  const promove = fonte.indexOf('npx wrangler versions deploy');
  check(upload >= 0 && verifica > upload && promove > verifica, id,
    'versão precisa ser enviada sem tráfego, verificada por bytes e só então promovida');
  check(/versions upload[\s\S]*--tag "\$CS_BUILD_SHA"/.test(fonte)
    && /versions deploy[\s\S]*--version-tag "\$CS_BUILD_SHA"[\s\S]*--percentage 100/.test(fonte),
  id, 'upload e promoção precisam apontar para a mesma versão identificada pelo SHA');
};

validaWorkflow(staging, 'staging', 'CFREF1');
validaWorkflow(producao, 'main', 'CFREF2');
check(/workers_dev\s*=\s*true/.test(stagingConfig) && /preview_urls\s*=\s*true/.test(stagingConfig),
  'CFREF1', 'staging precisa publicar URL imutável da versão candidata');
check(/workers_dev\s*=\s*true/.test(producaoConfig) && /preview_urls\s*=\s*true/.test(producaoConfig),
  'CFREF2', 'produção precisa publicar URL imutável da versão candidata');

for (const falha of falhas) console.error(`FAIL ${falha}`);
if (mutante && !falhas.length) {
  console.error(`mutante ${mutante}: régua cega`);
  process.exit(1);
}
if (falhas.length) process.exit(1);
console.log('PASS CF-REF: somente pushes protegidos enviam, verificam e depois promovem a versão Cloudflare');
