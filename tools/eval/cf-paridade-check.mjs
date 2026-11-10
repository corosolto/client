#!/usr/bin/env node
/* ============================================================================
   cf-paridade-check.mjs — O SPIKE NO WORKERS RESPONDE COMO A PRODUÇÃO NA VERCEL
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Fase 1 da migração (docs/runbooks/MIGRACAO-CLOUDFLARE.md) termina quando um deploy em
   *.workers.dev devolve os mesmos status e headers que www.corosolto.com.br nas rotas
   que importam. Comparar à mão é como a CSP perde um `frame-ancestors` sem ninguém ver.

   O QUE MEDE: para cada rota da lista, `HEAD`/`GET` nos dois hosts; imprime tabela com
   rota, status na produção, status no alvo e os headers que diferem entre os
   COMPARADOS (content-security-policy, strict-transport-security, cache-control,
   x-content-type-options, referrer-policy, permissions-policy, content-type, location).
   Headers de plataforma (x-vercel-*, cf-ray, server, date, etag, age) ficam de fora.

   Sai 1 quando algum status ou um header comparado difere. A avaliação das divergências
   conhecidas fica em `cf-paridade-allowlist.json`, aplicada pelo workflow de staging.


   NORMALIZAÇÕES (diferenças de plataforma, não do site; cada uma documentada no runbook):
   - `s-maxage` e `stale-while-revalidate`: a Vercel consome e tira da resposta; o Workers
     repassa. Compara o que o navegador vê (os dois sem essas diretivas).
   - `; charset=utf-8` em `content-type` de asset: o asset layer do Workers não anexa; o
     HTML leva `<meta charset>`. Compara o tipo sem o charset.
   - Resposta 3xx: compara só status e `location` (a Vercel resolve redirect antes das
     regras de header; no Workers o `_headers` ainda se aplica, e sai um superconjunto).

   Uso: node tools/eval/cf-paridade-check.mjs --alvo https://csb-spike.<conta>.workers.dev
        [--prod https://www.corosolto.com.br] [--json]
   ============================================================================ */
const arg = (n) => { const i = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`)); if (i < 0) return ''; const a = process.argv[i]; return a.includes('=') ? a.split('=').slice(1).join('=') : process.argv[i + 1] || ''; };
const ALVO = (arg('alvo') || '').replace(/\/$/, '');
const PROD = (arg('prod') || 'https://www.corosolto.com.br').replace(/\/$/, '');
if (!ALVO) { console.error('uso: --alvo https://<worker>.workers.dev'); process.exit(2); }

const COMPARADOS = ['content-security-policy', 'strict-transport-security', 'cache-control', 'x-content-type-options',
  'referrer-policy', 'permissions-policy', 'content-type', 'location', 'x-robots-tag'];

import { ROTAS } from './cf-paridade-routes.mjs';

/* Divergências conhecidas são avaliadas por tools/eval/cf-paridade-allowlist-check.mjs.
   Esta régua continua estrita: o workflow captura o JSON mesmo quando ela sai 1. */
async function pedir(base, { rota, metodo = 'HEAD' }) {
  const inicio = performance.now();
  try {
    const r = await fetch(base + rota, { method: metodo, redirect: 'manual', headers: { 'user-agent': 'cf-paridade-check' }, signal: AbortSignal.timeout(20000) });
    if (metodo === 'GET') await r.arrayBuffer();
    const headers = {};
    for (const h of COMPARADOS) { const v = r.headers.get(h); if (v !== null) headers[h] = v; }
    return { status: r.status, headers, ms: Math.round(performance.now() - inicio) };
  } catch (e) {
    return { status: 0, headers: {}, erro: e?.name || String(e), ms: Math.round(performance.now() - inicio) };
  }
}

/* Location absoluta difere só pelo host entre os dois: compara o caminho. */
function normaliza(chave, valor, base) {
  if (valor == null) return valor;
  if (chave === 'location') return valor.startsWith(base) ? valor.slice(base.length) : valor;
  if (chave === 'cache-control') return valor.split(',').map((d) => d.trim()).filter((d) => !/^(s-maxage|stale-while-revalidate)=/.test(d)).join(', ');
  if (chave === 'content-type') return valor.split(';')[0].trim();
  return valor;
}

const linhas = [];
let reprova = 0;
for (const r of ROTAS) {
  const [prod, alvo] = await Promise.all([pedir(PROD, r), pedir(ALVO, r)]);
  const diferentes = [];
  const soLocation = prod.status >= 300 && prod.status < 400 && alvo.status >= 300 && alvo.status < 400;
  for (const h of soLocation ? ['location'] : COMPARADOS) {
    const a = normaliza(h, prod.headers[h], PROD);
    const b = normaliza(h, alvo.headers[h], ALVO);
    if (a !== b) diferentes.push(`${h}: prod=${JSON.stringify(a ?? null)} alvo=${JSON.stringify(b ?? null)}`);
  }
  const igual = prod.status === alvo.status && diferentes.length === 0;
  if (!igual) reprova++;
  linhas.push({ rota: r.rota, prod: prod.status, alvo: alvo.status, ms: alvo.ms, msProd: prod.ms, diferentes, ok: igual });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ prod: PROD, alvo: ALVO, linhas }, null, 1));
} else {
  const largura = Math.max(...linhas.map((l) => l.rota.length));
  console.log(`prod=${PROD}\nalvo=${ALVO}\n`);
  console.log(`| ${'rota'.padEnd(largura)} | prod | spike | ms spike | headers que diferem |`);
  console.log(`|${'-'.repeat(largura + 2)}|------|-------|----------|---------------------|`);
  for (const l of linhas) {
    const marca = l.ok ? '' : ' ✗';
    console.log(`| ${l.rota.padEnd(largura)} | ${String(l.prod).padEnd(4)} | ${String(l.alvo).padEnd(5)} | ${String(l.ms).padEnd(8)} | ${l.diferentes.join('; ') || (l.prod === l.alvo ? 'nenhum' : '')}${marca} |`);
  }
  console.log(`\n${reprova ? '✗' : '✓'} cf-paridade: ${linhas.length} rotas, ${linhas.filter((l) => l.ok).length} idênticas, ${reprova} divergência(s)`);
}
process.exit(reprova ? 1 : 0);
