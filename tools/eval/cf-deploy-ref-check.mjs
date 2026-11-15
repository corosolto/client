import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const validos = new Set(['', 'staging-dispatch-arbitrario', 'prod-dispatch-arbitrario', 'prod-sem-candidato', 'prod-sem-preview-url', 'prod-promove-por-tag', 'preview-sem-provisionamento', 'preview-base-arbitraria']);
if (!validos.has(mutante)) {
  console.error('uso: cf-deploy-ref-check [--mutante=staging-dispatch-arbitrario|prod-dispatch-arbitrario|prod-sem-candidato|prod-sem-preview-url|prod-promove-por-tag|preview-sem-provisionamento|preview-base-arbitraria]');
  process.exit(2);
}

let staging = readFileSync('.github/workflows/cf-staging-deploy.yml', 'utf8');
let producao = readFileSync('.github/workflows/cf-prod-deploy.yml', 'utf8');
let stagingConfig = readFileSync('wrangler.staging.toml', 'utf8');
let producaoConfig = readFileSync('wrangler.prod.toml', 'utf8');
let preview = readFileSync('.github/workflows/cf-preview-deploy.yml', 'utf8');
let previewConfig = readFileSync('wrangler.preview.toml', 'utf8');
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
if (mutante === 'prod-promove-por-tag') {
  producao = producao.replace('"$VERSION_ID@100%"', '--version-tag "$CS_BUILD_SHA" --percentage 100');
}
if (mutante === 'preview-sem-provisionamento') {
  preview = preview.replace('npx --yes wrangler@4.158.0 triggers deploy --config wrangler.preview.toml', ':');
}
if (mutante === 'preview-base-arbitraria') {
  preview = preview.replace(" && (github.event.workflow_run.pull_requests[0].base.ref == 'staging' || github.event.workflow_run.pull_requests[0].base.ref == 'main')", '');
}

const falhas = [];
const check = (ok, id, mensagem) => { if (!ok) falhas.push(`${id} ${mensagem}`); };
const validaWorkflow = (fonte, ramo, id) => {
  check(!/^\s+workflow_dispatch:/m.test(fonte), id, 'workflow com segredo Cloudflare não pode executar YAML de ref arbitrário');
  check(new RegExp(`branches: \\[${ramo}\\]`).test(fonte), id, `deploy precisa nascer de push na ${ramo} protegida`);
  check(/ref: \$\{\{ github\.sha \}\}/.test(fonte), id, 'checkout precisa fixar o SHA do push');
  check(/id: build[\s\S]*git rev-parse HEAD[\s\S]*steps\.build\.outputs\.sha/.test(fonte),
    id, 'build e verificação precisam compartilhar o SHA realmente checado');
  const provisiona = fonte.indexOf('npx wrangler triggers deploy');
  const upload = fonte.indexOf('npx wrangler versions upload');
  const verifica = fonte.indexOf('node tools/cf/verifica-deploy.mjs');
  const promove = fonte.indexOf('npx wrangler versions deploy');
  check(provisiona >= 0 && upload > provisiona && verifica > upload && promove > verifica, id,
    'preview remoto precisa ser provisionado antes do upload, verificado por bytes e só então promovido');
  check(/Worker Version ID:[\s\S]*echo "version_id=\$VERSION_ID"/.test(fonte)
    && /VERSION_ID: \$\{\{ steps\.upload\.outputs\.version_id \}\}/.test(fonte)
    && /versions deploy "\$VERSION_ID@100%"/.test(fonte),
  id, 'promoção precisa usar o ID único retornado pelo mesmo upload, nunca tag ambígua');
};

validaWorkflow(staging, 'staging', 'CFREF1');
validaWorkflow(producao, 'main', 'CFREF2');
check(/workers_dev\s*=\s*true/.test(stagingConfig) && /preview_urls\s*=\s*true/.test(stagingConfig),
  'CFREF1', 'staging precisa publicar URL imutável da versão candidata');
check(/workers_dev\s*=\s*true/.test(producaoConfig) && /preview_urls\s*=\s*true/.test(producaoConfig),
  'CFREF2', 'produção precisa publicar URL imutável da versão candidata');
const previewProvisiona = preview.indexOf('wrangler@4.158.0 triggers deploy --config wrangler.preview.toml');
const previewUpload = preview.indexOf('wrangler@4.158.0 versions upload');
check(previewProvisiona >= 0 && previewUpload > previewProvisiona,
  'CFREF3', 'preview de PR precisa provisionar a URL remota antes do upload versionado');
check(/workers_dev\s*=\s*true/.test(previewConfig) && /preview_urls\s*=\s*true/.test(previewConfig),
  'CFREF3', 'configuração confiável do preview precisa habilitar URLs imutáveis');
check(/base\.ref == 'staging'[\s\S]*base\.ref == 'main'/.test(preview)
  && /ref: \$\{\{ github\.event\.workflow_run\.pull_requests\[0\]\.base\.sha \}\}/.test(preview),
  'CFREF3', 'configuração tokenizada precisa vir somente da base protegida main ou staging');

for (const falha of falhas) console.error(`FAIL ${falha}`);
if (mutante && !falhas.length) {
  console.error(`mutante ${mutante}: régua cega`);
  process.exit(1);
}
if (falhas.length) process.exit(1);
console.log('PASS CF-REF: somente pushes protegidos enviam, verificam e depois promovem a versão Cloudflare');
