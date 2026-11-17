/* Mapa cron → workflow e o disparo em si (o porquê está no cabeçalho de index.mjs).
   Mora fora do index.mjs porque o runtime do Worker só aceita handlers como export
   do módulo principal: `export const REF = 'main'` lá derruba o boot do Worker. */

const API = 'https://api.github.com';
const USER_AGENT = 'corosolto-vigia-cron/1 (+https://github.com/corosolto/client/tree/main/workers/vigia-cron)';

/* cron → workflows. A string do cron é a MESMA do [triggers] do wrangler.toml
   (tools/ops/tests/vigia-cron.test.mjs cobra a igualdade). */
export const ALVOS = Object.freeze({
  '*/15 * * * *': Object.freeze([
    Object.freeze({ repo: 'corosolto/client', workflow: 'prod-watch.yml', segredo: 'GITHUB_TOKEN_CLIENT' }),
  ]),
  '17 * * * *': Object.freeze([
    Object.freeze({ repo: 'corosolto/client', workflow: 'ops-diag.yml', segredo: 'GITHUB_TOKEN_CLIENT' }),
  ]),
  '*/30 * * * *': Object.freeze([
    Object.freeze({ repo: 'corosolto/backend', workflow: 'sync-nodes.yml', segredo: 'GITHUB_TOKEN_BACKEND' }),
  ]),
});

export const REF = 'main';

async function dispara(alvo, env, fetchImpl) {
  const base = { repo: alvo.repo, workflow: alvo.workflow, ref: REF };
  const token = env[alvo.segredo];
  if (!token) {
    console.error(JSON.stringify({ ...base, ok: false, erro: `segredo ${alvo.segredo} ausente no Worker` }));
    return false;
  }
  let resposta;
  try {
    resposta = await fetchImpl(`${API}/repos/${alvo.repo}/actions/workflows/${alvo.workflow}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ ref: REF }),
    });
  } catch (erro) {
    console.error(JSON.stringify({ ...base, ok: false, erro: `rede: ${erro?.message || erro}` }));
    return false;
  }
  if (resposta.status === 204) {
    console.log(JSON.stringify({ ...base, ok: true, status: 204 }));
    return true;
  }
  const corpo = (await resposta.text().catch(() => '')).slice(0, 500);
  console.error(JSON.stringify({ ...base, ok: false, status: resposta.status, corpo }));
  return false;
}

/* Dispara todos os alvos do cron e devolve o resultado por alvo. Exportado para o
   teste; o handler `scheduled` só transforma falha em exceção. */
export async function disparaCron(cron, env, fetchImpl = fetch) {
  const alvos = ALVOS[cron];
  if (!alvos) {
    console.error(JSON.stringify({ cron, ok: false, erro: 'cron sem alvo: wrangler.toml e ALVOS divergiram' }));
    return [{ cron, repo: '(nenhum)', workflow: '(cron sem alvo)', ok: false }];
  }
  const resultados = [];
  for (const alvo of alvos) resultados.push({ cron, workflow: alvo.workflow, repo: alvo.repo, ok: await dispara(alvo, env, fetchImpl) });
  return resultados;
}
