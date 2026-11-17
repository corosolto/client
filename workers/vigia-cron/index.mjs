/* ============================================================================
   vigia-cron — O RELÓGIO DO MONITORAMENTO MORA NA CLOUDFLARE, NÃO NO GITHUB
   ----------------------------------------------------------------------------
   MEDIDO EM 11/2026 (API do GitHub): o `schedule` do GitHub Actions descarta
   disparo sob carga. O prod-watch (a cada 15 min) rodou 27 vezes em 7 dias contra
   672 previstas (~4%); o ops-diag (minuto 17 de toda hora) 32 vezes em 10 dias
   contra 240; o sync-nodes do backend (a cada 30 min) 22 vezes em 7 dias contra
   336. A vigilância de produção passava horas sem olhar o edge, e ninguém via o
   buraco.

   Este Worker só tem Cron Triggers (wrangler.toml ao lado). Cada cron dispara,
   pela API, o `workflow_dispatch` dos workflows que antes tinham `schedule`:
   o trabalho continua no GitHub Actions; só o relógio mudou de lugar.

   Segredos (instalados pelo .github/workflows/vigia-cron-deploy.yml):
     GITHUB_TOKEN_CLIENT  ← CSBRASIL_BOT_TOKEN   (Actions: write em corosolto/client)
     GITHUB_TOKEN_BACKEND ← BACKEND_DISPATCH_TOKEN (Actions: write em corosolto/backend)

   Logs: `npx wrangler tail vigia-cron` ou Observability no painel. Todo disparo
   loga o status HTTP; resposta diferente de 204 sai em console.error com o corpo
   do GitHub (mensagem de erro, nunca o token) e a invocação termina em exceção,
   que o painel conta como falha do cron.
   ============================================================================ */

import { disparaCron } from './dispara.mjs';

export default {
  async scheduled(controller, env) {
    const resultados = await disparaCron(controller.cron, env);
    const falhas = resultados.filter((r) => !r.ok);
    if (falhas.length) {
      throw new Error(`vigia-cron: ${falhas.length} disparo(s) falharam em "${controller.cron}": ${falhas.map((f) => `${f.repo}/${f.workflow}`).join(', ')}`);
    }
  },
};
