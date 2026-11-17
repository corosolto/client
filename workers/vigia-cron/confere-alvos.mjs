#!/usr/bin/env node
/* Antes do deploy: lê da `main` de cada repo, pela API e com o MESMO token que o Worker vai
   usar, o workflow que cada cron dispara, e reprova se ele não aceitar o dispatch do Worker
   (contrato.mjs). Cobre o que o teste local não alcança: o backend mora em outro repo.
   Sai 1 em erro. Nunca imprime token.
   Uso (no vigia-cron-deploy.yml): GITHUB_TOKEN_CLIENT=… GITHUB_TOKEN_BACKEND=… node workers/vigia-cron/confere-alvos.mjs */
import { ALVOS, REF } from './dispara.mjs';
import { errosDoWorkflow } from './contrato.mjs';

const UA = 'corosolto-vigia-cron-deploy/1';
let falhou = false;
const vistos = new Set();
for (const { repo, workflow, segredo } of Object.values(ALVOS).flat()) {
  const chave = `${repo}/${workflow}`;
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  const token = process.env[segredo];
  if (!token) { console.log(`::error::${chave}: ${segredo} ausente`); falhou = true; continue; }
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/.github/workflows/${workflow}?ref=${REF}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github.raw+json', 'user-agent': UA, 'x-github-api-version': '2022-11-28' },
  });
  if (!r.ok) { console.log(`::error::${chave}@${REF}: GET do workflow respondeu ${r.status} com ${segredo}`); falhou = true; continue; }
  const erros = errosDoWorkflow(await r.text());
  for (const e of erros) console.log(`::error::${chave}@${REF}: ${e}`);
  if (erros.length) falhou = true;
  else console.log(`ok ${chave}@${REF} aceita o dispatch do Worker`);
}
process.exit(falhou ? 1 : 0);
