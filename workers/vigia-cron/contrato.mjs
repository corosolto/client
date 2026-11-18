/* Contrato que cada workflow alvo do vigia-cron precisa cumprir para o dispatch do Worker
   (`{"ref":"main"}`, sem inputs) dar 204: `workflow_dispatch` no `on:` e nenhum input
   obrigatório (senão o GitHub responde 422). `schedule` pode ficar: é a rede de segurança
   caso o Worker caia (docs/runbooks/vigia-cron.md). Usado pelo teste local
   (tools/ops/tests/vigia-cron.test.mjs, alvos do client) e pelo deploy (confere-alvos.mjs:
   TODOS os alvos lidos da `main` pela API, inclusive o backend). Fora do bundle do Worker:
   index.mjs não importa este arquivo. */

export function errosDoWorkflow(texto) {
  const on = /^on:[ \t]*\n([\s\S]*?)^\S/m.exec(`${texto}\n.`)?.[1] ?? '';
  const erros = [];
  if (!/^ {2}workflow_dispatch:/m.test(on)) erros.push('sem workflow_dispatch: o dispatch do Worker leva 422');
  if (/required: true/.test(on)) erros.push('tem input obrigatório, e o Worker só manda {"ref":"main"}');
  return erros;
}
