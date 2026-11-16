import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const validos = new Set([
  '', 'staging-dispatch-arbitrario', 'prod-dispatch-arbitrario', 'prod-sem-candidato',
  'prod-sem-preview-url', 'prod-promove-por-tag', 'prod-percentual-com-simbolo',
  'preview-sem-provisionamento', 'preview-base-arbitraria', 'staging-sem-bootstrap',
  'prod-sem-bootstrap', 'preview-sem-bootstrap', 'staging-mantem-obsoleto',
  'prod-mantem-obsoleto', 'staging-sem-head-guard', 'prod-sem-head-guard',
  'prod-gate-head-message',
  'prod-bootstrap-comentado', 'prod-job-if-false', 'prod-verifica-condicional',
  'prod-verifica-continua-erro', 'prod-verifica-decoy',
]);
if (!validos.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
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
  producao = producao.replace('"$VERSION_ID@100"', '--version-tag "$CS_BUILD_SHA" --percentage 100');
}
if (mutante === 'prod-percentual-com-simbolo') {
  producao = producao.replace('"$VERSION_ID@100"', '"$VERSION_ID@100%"');
}
if (mutante === 'preview-sem-provisionamento') {
  preview = preview.replace('npx --yes wrangler@4.158.0 triggers deploy --config wrangler.preview.toml', ':');
}
if (mutante === 'preview-base-arbitraria') {
  preview = preview.replace(" && (github.event.workflow_run.pull_requests[0].base.ref == 'staging' || github.event.workflow_run.pull_requests[0].base.ref == 'main')", '');
}
if (mutante === 'staging-sem-bootstrap') {
  staging = staging.replace('bash tools/cf/bootstrap-worker.sh csb-staging', ':');
}
if (mutante === 'prod-sem-bootstrap') {
  producao = producao.replace('bash tools/cf/bootstrap-worker.sh csb-prod', ':');
}
if (mutante === 'preview-sem-bootstrap') {
  preview = preview.replace('bash tools/cf/bootstrap-worker.sh csb-preview', ':');
}
if (mutante === 'staging-mantem-obsoleto') {
  staging = staging.replace('cancel-in-progress: true', 'cancel-in-progress: false');
}
if (mutante === 'prod-mantem-obsoleto') {
  producao = producao.replace('cancel-in-progress: true', 'cancel-in-progress: false');
}
if (mutante === 'staging-sem-head-guard') {
  staging = staging.replace('node tools/cf/assert-branch-head.mjs --branch=staging --sha="$CS_BUILD_SHA"', ':');
}
if (mutante === 'prod-sem-head-guard') {
  producao = producao.replace('node tools/cf/assert-branch-head.mjs --branch=main --sha="$CS_BUILD_SHA"', ':');
}
if (mutante === 'prod-gate-head-message') {
  producao = producao.replace('  deploy:\n', "  deploy:\n    if: startsWith(github.event.head_commit.message, 'chore(release):')\n");
}
if (mutante === 'prod-bootstrap-comentado') {
  producao = producao.replace('          bash tools/cf/bootstrap-worker.sh csb-prod',
    '          # bash tools/cf/bootstrap-worker.sh csb-prod');
}
if (mutante === 'prod-job-if-false') {
  producao = producao.replace('  deploy:\n', '  deploy:\n    if: false\n');
}
if (mutante === 'prod-verifica-condicional') {
  producao = producao.replace('      - name: Verifica versão candidata (build, áudio e viewmodels)\n',
    '      - name: Verifica versão candidata (build, áudio e viewmodels)\n        if: false\n');
}
if (mutante === 'prod-verifica-continua-erro') {
  producao = producao.replace('      - name: Verifica versão candidata (build, áudio e viewmodels)\n',
    '      - name: Verifica versão candidata (build, áudio e viewmodels)\n        continue-on-error: true\n');
}
if (mutante === 'prod-verifica-decoy') {
  producao = producao.replace('      - name: Verifica versão candidata (build, áudio e viewmodels)\n',
    '      - run: echo "node tools/cf/verifica-deploy.mjs"\n'
    + '      - name: Verifica versão candidata (build, áudio e viewmodels)\n        if: false\n');
}

const falhas = [];
const check = (ok, id, mensagem) => { if (!ok) falhas.push(`${id} ${mensagem}`); };
const semComentariosShell = (run) => run.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
const leWorkflow = (fonte, id) => {
  try {
    const doc = parse(fonte), job = doc?.jobs?.deploy;
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    const linhas = [];
    steps.forEach((step, stepIndex) => {
      if (typeof step?.run !== 'string') return;
      semComentariosShell(step.run).split('\n').map((line) => line.trim()).filter(Boolean)
        .forEach((line) => linhas.push({ line, step, stepIndex, order: linhas.length }));
    });
    const comandos = linhas.map(({ line }) => line).join('\n');
    return { doc, job, steps, linhas, comandos };
  } catch (error) {
    falhas.push(`${id} YAML inválido: ${error.message}`);
    return { doc: {}, job: null, steps: [], linhas: [], comandos: '' };
  }
};
const validaWorkflow = (fonte, ramo, id) => {
  const workflow = leWorkflow(fonte, id);
  const gatilhos = workflow.doc?.on || {};
  check(!Object.hasOwn(gatilhos, 'workflow_dispatch'), id,
    'workflow com segredo Cloudflare não pode executar YAML de ref arbitrário');
  check(Array.isArray(gatilhos?.push?.branches) && gatilhos.push.branches.includes(ramo),
    id, `deploy precisa nascer de push na ${ramo} protegida`);
  const checkout = workflow.steps.find((step) => typeof step?.uses === 'string'
    && step.uses.startsWith('actions/checkout@'));
  check(checkout?.with?.ref === '${{ github.sha }}', id, 'checkout precisa fixar o SHA do push');
  const build = workflow.steps.find((step) => step?.id === 'build');
  check(typeof build?.run === 'string' && build.run.includes('git rev-parse HEAD')
    && JSON.stringify(workflow.steps).includes('steps.build.outputs.sha'),
  id, 'build e verificação precisam compartilhar o SHA realmente checado');
  const alvo = ramo === 'main' ? 'prod' : 'staging';
  const especificacoes = [
    ['build', /^CS_BUILD_SHA="\$\(git rev-parse HEAD\)"$/],
    ['bootstrap', new RegExp(`^bash tools/cf/bootstrap-worker\\.sh csb-${alvo}$`)],
    ['provisionamento', new RegExp(`^npx wrangler triggers deploy --config wrangler\\.${alvo}\\.toml$`)],
    ['upload', /^npx wrangler versions upload \\$/],
    ['verificação', /^node tools\/cf\/verifica-deploy\.mjs --base="\$CANDIDATE_URL" --sha="\$CS_BUILD_SHA" \| tee -a "\$GITHUB_STEP_SUMMARY"$/],
    ['vigência do ramo', new RegExp(`^node tools/cf/assert-branch-head\\.mjs --branch=${ramo} --sha="\\$CS_BUILD_SHA"$`)],
    ['promoção', /^npx wrangler versions deploy "\$VERSION_ID@100" \\$/],
  ];
  const incondicional = ({ step } = {}) => step && !Object.hasOwn(step, 'if')
    && (!Object.hasOwn(step, 'continue-on-error') || step['continue-on-error'] === false);
  const comandosCriticos = especificacoes.map(([nome, padrao]) => {
    const encontrados = workflow.linhas.filter(({ line }) => padrao.test(line));
    check(encontrados.length === 1, id,
      `${nome} precisa ter exatamente um comando executável; encontrados ${encontrados.length}`);
    check(encontrados.length === 1 && incondicional(encontrados[0]), id,
      `${nome} precisa executar sem if/continue-on-error`);
    return encontrados[0];
  });
  if (comandosCriticos.every(Boolean)) {
    check(comandosCriticos.every((comando, index) => index === 0
      || comando.order > comandosCriticos[index - 1].order), id,
    'bootstrap, provisionamento, upload, verificação e promoção precisam manter a ordem segura');
  }
  const vigencia = comandosCriticos[5];
  check(vigencia?.step?.env?.GITHUB_TOKEN === '${{ github.token }}'
    && vigencia?.step?.env?.CS_BUILD_SHA === '${{ steps.build.outputs.sha }}',
  id, 'vigência do ramo precisa consultar GitHub com o SHA candidato imediatamente antes da promoção');
  check(/Worker Version ID:[\s\S]*echo "version_id=\$VERSION_ID"/.test(workflow.comandos)
    && JSON.stringify(workflow.steps).includes('steps.upload.outputs.version_id')
    && /versions deploy "\$VERSION_ID@100"/.test(workflow.comandos)
    && !/versions deploy "\$VERSION_ID@100%"/.test(workflow.comandos),
  id, 'promoção precisa usar o ID único retornado pelo upload com percentual numérico válido');
  return workflow;
};

const stagingWorkflow = validaWorkflow(staging, 'staging', 'CFREF1');
const producaoWorkflow = validaWorkflow(producao, 'main', 'CFREF2');
check(producaoWorkflow.job && !Object.hasOwn(producaoWorkflow.job, 'if'), 'CFREF2',
  'todo push protegido na main precisa publicar o SHA, inclusive merge commit de release');
check(stagingWorkflow.doc?.concurrency?.['cancel-in-progress'] === true,
  'CFREF1', 'push novo em staging precisa cancelar qualquer promoção obsoleta em voo');
check(producaoWorkflow.doc?.concurrency?.['cancel-in-progress'] === true,
  'CFREF2', 'push novo na main precisa cancelar qualquer promoção obsoleta em voo');
check(stagingWorkflow.comandos.includes('bash tools/cf/bootstrap-worker.sh csb-staging'),
  'CFREF1', 'staging precisa inicializar exatamente csb-staging');
check(producaoWorkflow.comandos.includes('bash tools/cf/bootstrap-worker.sh csb-prod'),
  'CFREF2', 'produção precisa inicializar exatamente csb-prod');
check(/workers_dev\s*=\s*true/.test(stagingConfig) && /preview_urls\s*=\s*true/.test(stagingConfig),
  'CFREF1', 'staging precisa publicar URL imutável da versão candidata');
check(/workers_dev\s*=\s*true/.test(producaoConfig) && /preview_urls\s*=\s*true/.test(producaoConfig),
  'CFREF2', 'produção precisa publicar URL imutável da versão candidata');
const previewWorkflow = leWorkflow(preview, 'CFREF3');
const previewBootstrap = previewWorkflow.comandos.indexOf('bash tools/cf/bootstrap-worker.sh csb-preview');
const previewProvisiona = previewWorkflow.comandos.indexOf('wrangler@4.158.0 triggers deploy --config wrangler.preview.toml');
const previewUpload = previewWorkflow.comandos.indexOf('wrangler@4.158.0 versions upload');
check(previewBootstrap >= 0 && previewProvisiona > previewBootstrap && previewUpload > previewProvisiona,
  'CFREF3', 'preview de PR precisa inicializar o Worker antes de provisionar e enviar a versão');
check(/workers_dev\s*=\s*true/.test(previewConfig) && /preview_urls\s*=\s*true/.test(previewConfig),
  'CFREF3', 'configuração confiável do preview precisa habilitar URLs imutáveis');
check(typeof previewWorkflow.job?.if === 'string'
  && previewWorkflow.job.if.includes("base.ref == 'staging'")
  && previewWorkflow.job.if.includes("base.ref == 'main'")
  && previewWorkflow.steps.some((step) => step?.with?.ref === '${{ github.event.workflow_run.pull_requests[0].base.sha }}'),
  'CFREF3', 'configuração tokenizada precisa vir somente da base protegida main ou staging');

for (const falha of falhas) console.error(`FAIL ${falha}`);
if (mutante && !falhas.length) {
  console.error(`mutante ${mutante}: régua cega`);
  process.exit(1);
}
if (falhas.length) process.exit(1);
console.log('PASS CF-REF: somente pushes protegidos enviam, verificam e depois promovem a versão Cloudflare');
