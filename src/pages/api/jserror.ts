// POST /api/jserror - exceção do navegador de quem está jogando.
// Ver supabase/migrations/015.
//
// POR QUE ESTA ROTA EXISTE, EM UMA FRASE: o botão JOGAR ficou inerte em produção
// (BUG-34) com o site respondendo 200, o build passando e o check:fast verde. O
// overlay de crash do `index.astro` já mostrava o erro NA TELA do jogador - e
// morria ali. Erro na máquina de quem joga é o único sinal que portão nenhum
// desta casa alcança.
//
// RATE LIMIT DE 30/MIN POR IP, e o número tem razão: o cliente já agrupa e
// segura (`fingerprint` + teto por sessão em index.astro), então 30 significa
// "trinta erros DISTINTOS num minuto", que não é jogo - é loop ou curl. Perder
// envio nesse regime não perde informação: a 31ª cópia do mesmo erro não conta
// nada que a 1ª já não tenha contado.
//
// FAIL-SILENT PARA O JOGADOR: qualquer erro daqui responde 2xx/4xx curto e o
// cliente ignora a resposta. Coletor de erro que atrapalha o jogo é pior que não
// ter coletor - e um coletor que lança dentro do handler de erro do navegador é
// como se faz um loop infinito.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';
import { classifyCrash, shouldDispatchCrash, fingerprintConfere, crashFingerprint } from '../../lib/error-provenance.mjs';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'jserror', ip, 30, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  /* `fingerprint` e `message` são os dois únicos obrigatórios: sem chave de
     agrupamento a tabela vira lixeira, e sem mensagem a linha não diz nada. */
  const fingerprint = str(body?.fingerprint, 64);
  const message = str(body?.message, 500);
  if (!fingerprint || !message) return json({ error: 'bad_payload' }, 400);

  /* A ROTA É TRUNCADA E PERDE A QUERY STRING DE PROPÓSITO. `?debug=1` é inócuo,
     mas a query é o lugar onde um dia alguém põe token - e log de erro é o
     último lugar em que se quer descobrir isso depois. */
  let route = str(body?.route, 200);
  if (route) route = route.split('?')[0].split('#')[0];

  /* Migalhas: ação de JOGO, nunca texto escrito pelo jogador (ver o topo da
     migration 015). O teto de 20 é o que cabe numa tela de admin sem virar
     rolagem infinita, e o de 120 chars corta qualquer coisa que não seja rótulo. */
  const breadcrumbs = Array.isArray(body?.breadcrumbs)
    ? body.breadcrumbs.slice(-20).map((b: unknown) => String(b).slice(0, 120))
    : null;

  const anonId = str(body?.anonId, 36);
  const matchSecs = Number.isFinite(body?.matchSecs)
    ? Math.max(0, Math.min(86400, Math.floor(body.matchSecs)))
    : null;
  const source = str(body?.source, 300);
  const stack = str(body?.stack, 4000);
  const kind = ['error', 'promise', 'console'].includes(body?.kind) ? body.kind : 'error';

  /* Chave de agrupamento do `js_error` E de dedupe do escalonamento (BUG-71). Incoerente não
     é recusado: grava sob a chave DERIVADA do conteúdo, fora do escalonamento. */
  const coerente = fingerprintConfere(fingerprint, { kind, message, source });
  const chave = coerente ? fingerprint : crashFingerprint(kind, message, source);

  const origin = new URL(request.url).origin;
  const classification = classifyCrash({ message, source, stack }, origin);

  const { error } = await supabaseAdmin.rpc('report_js_error', {
    p_fingerprint: chave,
    p_kind: kind,
    p_message: message,
    p_source: source,
    p_stack: stack,
    p_version: str(body?.version, 40),
    p_route: route,
    p_user_agent: str(request.headers.get('user-agent'), 400),
    p_anon_id: anonId && UUID_RE.test(anonId) ? anonId : null,
    p_nick: str(body?.nick, 40),
    p_map: str(body?.map, 40),
    p_mode: str(body?.mode, 20),
    p_faction: str(body?.faction, 4),
    p_match_secs: matchSecs,
    p_breadcrumbs: breadcrumbs,
  });
  if (error) return json({ error: 'indisponivel' }, 503);

  // Proveniência externa fica no banco bruto, mas não consome dispatch nem abre bug do jogo.
  if (!shouldDispatchCrash(classification) || !coerente) return json({ ok: true, escalated: false, classification });

  /* PRIMEIRA OCORRÊNCIA → repository_dispatch `prod-crash` (crash-fix.yml).
     O UPDATE condicional é atômico: duas requisições simultâneas do mesmo erro
     novo não disparam duas vezes (ver migration 020). Teto de 5 dispatch/hora
     no total - erro novo de verdade é raro; mais que isso é loop ou ataque, e
     a tabela continua recebendo os hits normalmente.
     Se o dispatch FALHA (timeout, 5xx, cota), o dispatched_at volta a null:
     marcar antes e nunca retentar transformava uma falha transitória do GitHub
     em silêncio permanente daquele fingerprint (pego na review, PR #95).
     O await tem timeout de 2 s e try/catch: GitHub fora do ar NÃO pode derrubar
     o coletor - coletor que falha dentro do handler de erro é loop infinito. */
  const dispatchToken = process.env.GH_DISPATCH_TOKEN;
  if (dispatchToken) {
    try {
      // cota ANTES da marca: quota estourada não pode aposentar o fingerprint
      if (await rateLimit(supabaseAdmin, 'ghdispatch', 'global', 5, 3600)) {
        const { data: escaladas } = await supabaseAdmin
          .from('js_error')
          .update({ dispatched_at: new Date().toISOString() })
          .eq('fingerprint', chave)
          .is('dispatched_at', null)
          .select('fingerprint');
        if (escaladas?.length) {
          const resp = await fetch(`https://api.github.com/repos/${process.env.GH_DISPATCH_REPO || 'corosolto/client'}/dispatches`, {
            method: 'POST',
            signal: AbortSignal.timeout(2000),
            headers: {
              authorization: `Bearer ${dispatchToken}`,
              accept: 'application/vnd.github+json',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'prod-crash',
              client_payload: { fingerprint: chave, message, source, stack, origin, version: str(body?.version, 40) },
            }),
          });
          if (!resp.ok) throw new Error(`dispatch ${resp.status}`);
        }
      }
    } catch {
      /* fail-silent: o erro já está na tabela, o dispatch é o cinto.
         Desfaz a marca para a próxima ocorrência retentar. */
      try {
        await supabaseAdmin.from('js_error').update({ dispatched_at: null })
          .eq('fingerprint', chave);
      } catch { /* nem o rollback - a linha segue com o erro gravado */ }
    }
  }

  return json({ ok: true });
};
