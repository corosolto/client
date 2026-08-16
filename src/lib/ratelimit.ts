// Rate limit durável, contado no Postgres.
//
// POR QUE NÃO O `new Map()` QUE ESTAVA AQUI ANTES
// Os contadores viviam em variáveis de módulo (`regHits` em register.ts,
// `hits` em submit-match.ts). Numa função serverless isso não é um limite:
//   - cada instância de lambda tem a própria cópia do Map;
//   - a Vercel abre instâncias novas sob concorrência e recicla as ociosas;
//   - logo, N requests paralelos = N orçamentos independentes, e uma pausa
//     entre rajadas já basta pra cair numa instância zerada.
// O único limite durável que o projeto tinha era o do RPC submit_match, e ele
// só cobre o submit - /api/register, /api/heartbeat e /api/avatar ficavam nus.
//
// A ALTERNATIVA SEM INFRA NOVA é a que está aqui: um bucket contado numa tabela
// do Postgres que o projeto JÁ tem. Custo de 1 upsert por chamada, em índice
// primário. Nada de Redis/Upstash/KV, nada de conta nova, nada de env nova.
//
// FAIL-OPEN, DE PROPÓSITO: se o RPC não existir (banco ainda sem a migration
// 011) ou o banco estiver fora, a função libera. Um rate limit que derruba o
// registro do jogo inteiro quando o banco tosse é pior que o problema que
// resolve - as validações de verdade (token, tetos, consistência física)
// continuam no RPC submit_match e não dependem disto.
import type { SupabaseClient } from '@supabase/supabase-js';

export async function rateLimit(
  db: SupabaseClient,
  bucket: string,
  subject: string,
  limit: number,
  windowSecs: number,
): Promise<boolean> {
  if (!subject || subject === 'unknown') return true;
  try {
    const { data, error } = await db.rpc('rl_take', {
      p_bucket: bucket, p_subject: subject, p_limit: limit, p_window_secs: windowSecs,
    });
    if (error) return true;          // migration 011 ainda não aplicada
    return data !== false;
  } catch {
    return true;
  }
}
