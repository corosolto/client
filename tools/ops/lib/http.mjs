/* ============================================================================
   http.mjs — sondas HTTP da camada operacional (tools/ops).
   ----------------------------------------------------------------------------
   Regras que todas as sondas remotas seguem, para que o relatório compare igual
   com igual:
     · só GET/HEAD/Range — a diagnose NUNCA escreve em produção (nada de POST em
       /api/*; telemetria de sonda viraria ruído no painel do dono);
     · `accept-encoding: identity`, para que tamanho medido seja o do arquivo e
       não o da representação comprimida do edge (medido em 06/09: ak.glb 163 586
       comprimido vs 275 892 no disco — comparar sem isso acusa todo GLB);
     · timeout curto e erro CLASSIFICADO (timeout, dns, tls, conexão, proxy) —
       "não sei" tem que custar o mesmo que "está errado" (docs/LICOES.md §5),
       então a sonda que não alcança o alvo devolve status 0 e o motivo, nunca
       um `null` silencioso.
   ============================================================================ */

export const UA = 'csbrasil-ops-diag/1 (+tools/ops/diagnose.mjs)';

export function atrasDeProxy(env = process.env) {
  return !!(env.NODE_USE_ENV_PROXY || env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy);
}

export function classificaErro(e, env = process.env) {
  const msg = String(e?.cause?.message || e?.message || e || '');
  const code = String(e?.cause?.code || e?.code || e?.name || '');
  if (/TimeoutError|AbortError/.test(code) || /timeout|aborted/i.test(msg)) return 'timeout';
  if (/ENOTFOUND|EAI_AGAIN/.test(code) || /getaddrinfo/i.test(msg)) return 'dns';
  if (/CERT|SSL|TLS|certificate/i.test(code + msg)) return 'tls';
  if (/ECONNREFUSED|ECONNRESET|EPIPE|EHOSTUNREACH|ENETUNREACH/.test(code)) return 'conexao';
  if (/proxy|tunnel|403/i.test(msg) && /CONNECT|proxy/i.test(msg)) return 'proxy';
  // o undici devolve "Request was cancelled" quando o proxy recusa o CONNECT
  if (/cancell?ed/i.test(msg)) return atrasDeProxy(env) ? 'proxy' : 'conexao';
  return `outro:${(code || msg).slice(0, 80)}`;
}

/* Uma resposta: status, latência, cabeçalhos em minúsculas e bytes. `status: 0`
   significa que a rede não respondeu; `erro` diz por quê. */
export async function sonda(url, opts = {}) {
  const { method = 'GET', headers = {}, timeoutMs = 10_000, range = null, redirect = 'follow', maxBytes = Infinity } = opts;
  const h = { 'user-agent': UA, 'accept-encoding': 'identity', ...headers };
  if (range) h.range = range;
  const t0 = performance.now();
  try {
    const r = await fetch(url, { method, headers: h, redirect, signal: AbortSignal.timeout(timeoutMs) });
    let bytes;
    if (method === 'HEAD') bytes = new Uint8Array(0);
    else if (maxBytes === Infinity) bytes = new Uint8Array(await r.arrayBuffer());
    else bytes = await lerAte(r, maxBytes);
    return {
      url, status: r.status, ok: r.ok, ms: Math.round(performance.now() - t0),
      headers: Object.fromEntries([...r.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])),
      bytes, texto: () => new TextDecoder().decode(bytes), erro: null,
    };
  } catch (e) {
    return { url, status: 0, ok: false, ms: Math.round(performance.now() - t0), headers: {}, bytes: new Uint8Array(0), texto: () => '', erro: classificaErro(e) };
  }
}

async function lerAte(r, maxBytes) {
  const reader = r.body?.getReader?.();
  if (!reader) return new Uint8Array(await r.arrayBuffer());
  const partes = []; let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    partes.push(value); total += value.length;
  }
  try { await reader.cancel(); } catch { /* corpo já encerrado */ }
  const out = new Uint8Array(Math.min(total, maxBytes)); let pos = 0;
  for (const p of partes) { const fatia = p.subarray(0, Math.max(0, out.length - pos)); out.set(fatia, pos); pos += fatia.length; if (pos >= out.length) break; }
  return out;
}

/* Executa `fn` sobre os itens com no máximo `n` em voo. Ordem do resultado = ordem
   dos itens, para o relatório ser determinístico. */
export async function paralelo(itens, fn, n = 6) {
  const out = new Array(itens.length); let i = 0;
  const worker = async () => { while (i < itens.length) { const k = i++; out[k] = await fn(itens[k], k); } };
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, worker));
  return out;
}

export function percentil(valores, p) {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const idx = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[idx];
}

/* Total de bytes de uma resposta Range (`content-range: bytes 0-15/275892`). */
export function totalDoContentRange(headers) {
  const m = /\/(\d+)\s*$/.exec(headers?.['content-range'] || '');
  return m ? Number(m[1]) : null;
}

export function pareceHtml(bytes) {
  const s = new TextDecoder().decode(bytes.subarray(0, 64)).trimStart().toLowerCase();
  return s.startsWith('<!doctype') || s.startsWith('<html') || s.startsWith('<head') || s.startsWith('<body');
}

export const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
