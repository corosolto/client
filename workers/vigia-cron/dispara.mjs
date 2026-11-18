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

/* Teto por chamada à API (pedido + corpo da resposta). Conexão travada não pode segurar a
   invocação até a plataforma matá-la sem log: aborta, registra `rede: …` e o cron falha. */
export const TEMPO_MAX_MS = 10_000;

/* Devolve { ok, status }: status é o HTTP do GitHub, ou null quando nem houve resposta
   (segredo ausente, rede, timeout). O confere-alvos.mjs usa o status para explicar a falha. */
async function dispara(alvo, env, fetchImpl, tempoMaxMs) {
  const base = { repo: alvo.repo, workflow: alvo.workflow, ref: REF };
  const token = env[alvo.segredo];
  if (!token) {
    console.error(JSON.stringify({ ...base, ok: false, erro: `segredo ${alvo.segredo} ausente no Worker` }));
    return { ok: false, status: null };
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
      signal: AbortSignal.timeout(tempoMaxMs),
    });
  } catch (erro) {
    console.error(JSON.stringify({ ...base, ok: false, erro: `rede: ${erro?.message || erro}` }));
    return { ok: false, status: null };
  }
  if (resposta.status === 204) {
    console.log(JSON.stringify({ ...base, ok: true, status: 204 }));
    return { ok: true, status: 204 };
  }
  const corpo = (await resposta.text().catch(() => '')).slice(0, 500);
  console.error(JSON.stringify({ ...base, ok: false, status: resposta.status, corpo }));
  return { ok: false, status: resposta.status };
}

/* Dispara todos os alvos do cron e devolve o resultado por alvo. Exportado para o
   teste; o handler `scheduled` só transforma falha em exceção. */
export async function disparaCron(cron, env, fetchImpl = fetch, tempoMaxMs = TEMPO_MAX_MS) {
  const alvos = ALVOS[cron];
  if (!alvos) {
    console.error(JSON.stringify({ cron, ok: false, erro: 'cron sem alvo: wrangler.toml e ALVOS divergiram' }));
    return [{ cron, repo: '(nenhum)', workflow: '(cron sem alvo)', ok: false, status: null }];
  }
  const resultados = [];
  for (const alvo of alvos) resultados.push({ cron, workflow: alvo.workflow, repo: alvo.repo, ...(await dispara(alvo, env, fetchImpl, tempoMaxMs)) });
  return resultados;
}
