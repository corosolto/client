#!/usr/bin/env node
/* Antes do deploy, com o MESMO token e o MESMO código que o Worker vai usar:
   1. lê da `main` de cada repo, pela API, o workflow que cada cron dispara e reprova se ele
      não aceitar o dispatch do Worker (contrato.mjs). O backend mora em outro repo: o teste
      local não o alcança;
   2. DISPARA cada alvo uma vez (disparaCron, o mesmo caminho do cron). Ler o YAML só prova
      leitura; só um 204 do dispatch prova Actions: write com aquele token. A rodada extra é
      inofensiva pelo mesmo motivo da rede de segurança (docs/runbooks/vigia-cron.md) e só
      acontece quando o Worker é publicado.
   Sai 1 em qualquer erro. Nunca imprime token.
   Uso (no vigia-cron-deploy.yml): GITHUB_TOKEN_CLIENT=… GITHUB_TOKEN_BACKEND=… node workers/vigia-cron/confere-alvos.mjs */
import { pathToFileURL } from 'node:url';
import { ALVOS, REF, TEMPO_MAX_MS, disparaCron } from './dispara.mjs';
import { errosDoWorkflow } from './contrato.mjs';

const UA = 'corosolto-vigia-cron-deploy/1';

export async function confereAlvos(env, fetchImpl = fetch, log = console.log) {
  let ok = true;
  const vistos = new Set();
  for (const { repo, workflow, segredo } of Object.values(ALVOS).flat()) {
    const chave = `${repo}/${workflow}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const token = env[segredo];
    if (!token) { log(`::error::${chave}: ${segredo} ausente`); ok = false; continue; }
    let r;
    try {
      r = await fetchImpl(`https://api.github.com/repos/${repo}/contents/.github/workflows/${workflow}?ref=${REF}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github.raw+json', 'user-agent': UA, 'x-github-api-version': '2022-11-28' },
        signal: AbortSignal.timeout(TEMPO_MAX_MS),
      });
    } catch (erro) { log(`::error::${chave}@${REF}: GET do workflow falhou (${erro?.message || erro})`); ok = false; continue; }
    if (!r.ok) { log(`::error::${chave}@${REF}: GET do workflow respondeu ${r.status} com ${segredo}`); ok = false; continue; }
    const erros = errosDoWorkflow(await r.text());
    for (const e of erros) log(`::error::${chave}@${REF}: ${e}`);
    if (erros.length) ok = false;
  }
  if (!ok) return false;
  for (const cron of Object.keys(ALVOS)) {
    for (const d of await disparaCron(cron, env, fetchImpl)) {
      if (d.ok) { log(`ok ${d.repo}/${d.workflow}@${REF}: dispatch 204 com o token do Worker`); continue; }
      log(`::error::${d.repo}/${d.workflow}@${REF}: dispatch respondeu ${d.status ?? 'sem resposta'} com o token do Worker; ${MOTIVO[d.status] ?? 'rede, timeout ou segredo ausente (ver a linha JSON acima)'}`);
      ok = false;
    }
  }
  return ok;
}

const MOTIVO = {
  401: 'token inválido ou expirado: renove o PAT',
  403: 'token sem Actions: write neste repo (PAT fine-grained) ou sem escopo `repo` (clássico)',
  404: 'token sem acesso ao repo ou workflow inexistente na main',
  422: 'workflow sem workflow_dispatch na main ou com input obrigatório',
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit((await confereAlvos(process.env)) ? 0 : 1);
}
