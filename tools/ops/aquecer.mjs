#!/usr/bin/env node
/* ============================================================================
   aquecer.mjs — AQUECE O EDGE DEPOIS DO DEPLOY.
   ----------------------------------------------------------------------------
   Cada release muda o `?v=` de todo módulo e asset, e o prod-watch ainda purga
   /js/* no deploy: o edge nasce vazio e os primeiros jogadores de cada alpha
   pagam a origem em tudo (medido em 06/09/2026, logo após a alpha.224: 111 MISS
   de 112 assets, p50 336 ms, p95 608 ms por pedido). Este script pede, com a
   MESMA URL que o runtime monta, tudo que a diagnose sonda — módulos do import
   map, todas as armas e todo o elenco dos registros que a produção serve, props
   e prévias — e confere numa segunda passada que virou HIT.

   Range GET basta: o edge busca o objeto inteiro na origem e guarda (medido
   06/09/2026: `bytes=0-15` MISS na 1ª chamada, HIT em 78 ms na 2ª).

   Uso: node tools/ops/aquecer.mjs [https://www.csbrasil.online] [--esperada=2.0.0-alpha.N]
        [--espera=300000] [--concorrencia=8] [--json]
   Sai 1 se algum pedido falhou (404/5xx/rede) ou se a raiz não serviu a versão
   esperada dentro da espera; "frio" depois de duas passadas é informação, não erro
   (sem Cloudflare, ex.: preview da Vercel, não há cf-cache-status).
   ============================================================================ */
import { pathToFileURL } from 'node:url';
import { sonda, paralelo, percentil, dorme } from './lib/http.mjs';
import { extraiImportMap, extraiVersaoHtml } from './probes/boot.mjs';
import { registroServido } from './probes/assets.mjs';
import { amostraDeAssets, REGISTROS, RAIZ_PADRAO } from './lib/repo.mjs';

// 60 s: num MISS o edge baixa o objeto INTEIRO da origem antes de responder ao Range — um GLB de
// prop grande passou de 20 s em 06/09/2026 (rav4, ministerio, pipa) e virava falha falsa
export async function aquecer(base, { raiz = RAIZ_PADRAO, esperada = null, esperaMs = 300_000, pausaMs = 5000, concorrencia = 8, timeoutMs = 60_000, log = () => {} } = {}) {
  const t0 = Date.now();
  let versao = null; let importMap = null; let html;
  for (;;) {
    html = await sonda(`${base}/`, { timeoutMs });
    const texto = html.status === 200 ? html.texto() : '';
    versao = texto ? extraiVersaoHtml(texto) : null;
    importMap = texto ? extraiImportMap(texto) : null;
    if (versao && importMap && (!esperada || versao === esperada)) break;
    if (Date.now() - t0 >= esperaMs) return { ok: false, motivo: `a raiz serve ${versao || html.status || html.erro}${esperada ? `, esperava ${esperada}` : ''}${importMap ? '' : ' (sem import map)'}`, versao, total: 0, itens: [], falhas: [], duracaoMs: Date.now() - t0 };
    log(`raiz em ${versao || html.status || html.erro}; esperando ${esperada}…`);
    await dorme(pausaMs);
  }
  const urls = new Set();
  for (const [chave, alvo] of Object.entries(importMap)) if (chave === 'three' || chave.startsWith('./js/')) urls.add(new URL(alvo, `${base}/`).href);
  const registros = {};
  for (const nome of Object.keys(REGISTROS)) registros[nome] = await registroServido(base, nome, { registroUrl: importMap[REGISTROS[nome].modulo] || null, versao, timeoutMs });
  for (const a of amostraDeAssets(raiz, { limite: Infinity, armas: registros.armas.ids, personagens: registros.personagens.ids })) urls.add(`${base}/${a.caminho}?v=${encodeURIComponent(versao)}`);
  const lista = [...urls];
  const passada = (rotulo, alvo = lista) => paralelo(alvo, async (u) => {
    const r = await sonda(u, { range: 'bytes=0-15', timeoutMs, maxBytes: 64 });
    return { url: u.split('?')[0], status: r.status, ms: r.ms, cf: r.headers['cf-cache-status'] || null, erro: r.erro, passada: rotulo };
  }, concorrencia);
  const primeira = await passada(1);
  log(`1ª passada: ${primeira.length} pedidos, ${primeira.filter((i) => /HIT/i.test(i.cf || '')).length} já em HIT`);
  let segunda = await passada(2);
  // um soluço de rede (status 0) na 2ª passada não é asset frio: pede de novo, uma vez
  const urlCompleta = (caminho) => lista.find((u) => u.split('?')[0] === caminho) || caminho;
  segunda = await Promise.all(segunda.map(async (i) => (i.status === 0 ? (await passada('2-retry', [urlCompleta(i.url)]))[0] : i)));
  // REVALIDATED = servido do edge depois de conferir a origem (style.css, max-age=0): quente
  const ehHit = (i) => /HIT|REVALIDATED/i.test(i.cf || '');
  const falhas = segunda.filter((i) => i.status === 0 || i.status >= 400).map((i) => `${i.url} (${i.status || i.erro})`);
  const frios = segunda.filter((i) => i.status > 0 && i.status < 400 && !ehHit(i)).map((i) => `${i.url} (${i.cf || 'sem cf-cache-status'})`);
  return {
    ok: falhas.length === 0, versao, total: lista.length, registros: Object.fromEntries(Object.values(registros).map((r) => [r.nome, r.origem])),
    primeira: { hit: primeira.filter(ehHit).length, p95ms: percentil(primeira.map((i) => i.ms), 95) },
    segunda: { hit: segunda.filter(ehHit).length, p95ms: percentil(segunda.map((i) => i.ms), 95) },
    frios, falhas, itens: segunda, duracaoMs: Date.now() - t0,
  };
}

export function renderAquecimento(r) {
  const L = [`aquecer ${r.versao || '?'}: ${r.ok ? 'ok' : 'FALHOU'}${r.motivo ? ` — ${r.motivo}` : ''}`];
  if (r.total) L.push(`  ${r.total} URLs · 1ª passada ${r.primeira.hit} HIT, p95 ${r.primeira.p95ms} ms · 2ª passada ${r.segunda.hit} HIT, p95 ${r.segunda.p95ms} ms · registros ${JSON.stringify(r.registros)} · ${Math.round(r.duracaoMs / 100) / 10} s`);
  if (r.falhas.length) L.push(`  falhas (${r.falhas.length}): ${r.falhas.slice(0, 10).join(' · ')}`);
  if (r.frios?.length) L.push(`  ainda frios após 2 passadas (${r.frios.length}): ${r.frios.slice(0, 5).join(' · ')}`);
  return L.join('\n');
}

const ehMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (ehMain) {
  const argv = process.argv.slice(2);
  const val = (k, d) => { const v = (argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('='); return v === '' ? d : v; };
  const base = (argv.find((a) => !a.startsWith('--')) || 'https://www.csbrasil.online').replace(/\/$/, '');
  const r = await aquecer(base, { esperada: val('esperada', null), esperaMs: Number(val('espera', 300_000)), concorrencia: Number(val('concorrencia', 8)), log: (m) => console.error(m) });
  console.log(argv.includes('--json') ? JSON.stringify(r, null, 2) : renderAquecimento(r));
  process.exit(r.ok ? 0 : 1);
}
