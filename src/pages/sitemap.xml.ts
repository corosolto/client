// GET /sitemap.xml - sitemap DINÂMICO.
//
// ESTA ROTA NUNCA TINHA SIDO SERVIDA. Havia um `public/sitemap.xml` estático,
// de 17/07, com 4 URLs e host SEM `www`. Como o `.vercel/output/config.json`
// começa com `{"handle":"filesystem"}`, o arquivo estático ganha da rota antes
// de o `^/sitemap\.xml$` → `_render` ser sequer avaliado. Medido em produção
// em 04/08/2026:
//
//   $ curl -sI https://www.csbrasil.online/sitemap.xml
//   content-disposition: inline; filename="sitemap.xml"   ← arquivo, não função
//   etag: "90ac1bba8ccd641fa3de0d8325bab852"
//   $ curl -s  https://www.csbrasil.online/sitemap.xml | grep -c www
//   0                                        ← 4 URLs, todas no host errado
//
// Efeito colateral medido: `aeo.js check https://www.csbrasil.online` rastreou
// **4 páginas** - porque o sitemap só entregava 4. O arquivo estático foi
// removido; a partir daqui o sitemap é este.
//
// POR QUE NÃO `@astrojs/sitemap`
// (a) a integration não está instalada e esta máquina não tem rede pra
//     `npm install`; (b) mais importante: ela só enxerga rotas conhecidas em
// build time, e o conteúdo que escala aqui é `/u/<id>/<nick>` - uma página por
// jogador, criada em runtime. Um sitemap que lista 8 páginas fixas e ignora os
// perfis deixa de fora exatamente o que faz o site crescer.
//
// Fixas + perfis de `player_points`, que só tem público e não hidden: o conjunto que /u
// serve a anônimo (backend migrations 048/049, test/ranking-cutover.mjs). Sem Supabase, só as fixas.
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../lib/supabase';
import { SITE, RANKING_ON } from '../lib/site';
import { PT_EN_PAIRS } from '../lib/i18n-pairs';
import { GRUPOS, MAPAS } from '../data/jogo';
import { ROTAS_HUB } from '../../public/js/rotas.js';
import {
  POR_PAGINA, numeroDePaginas, offsetDaPagina, xmlUrlset, xmlIndex,
  type Entrada,
} from '../lib/sitemap';

export const prerender = false;

// prioridade/frequência: sinal fraco pro Google, mas o Bing e os crawlers de
// IA ainda leem. Custa nada e ajuda a ordenar o rastreio.
//
// Só URL final e indexável: `/ranking` (hub) entra só com RANKING_ON; os
// perfis `/u/*` só entram com `RANKING_ON`. Sem data real de modificação, sem <lastmod>.
export const STATIC: [string, string, string][] = [
  ['/',            '1.0', 'daily'],
  ['/como-jogar',  '0.8', 'weekly'],
  ['/personagens', '0.8', 'weekly'],
  /* Os grupos saem do mesmo catálogo de /personagens e ganham recortes próprios. */
  ...GRUPOS.map((g) => [`/grupos/${g.id}`, '0.7', 'weekly'] as [string, string, string]),
  ['/mapas',       '0.8', 'weekly'],
  /* Uma página por arena (ADR 0008), do mesmo MAPAS de /mapas. */
  ...MAPAS.map((m) => [`/mapas/${m.id}`, '0.6', 'weekly'] as [string, string, string]),
  ['/armas',       '0.8', 'weekly'],
  ['/sobre',       '0.7', 'monthly'],
  ['/apoie',       '0.5', 'monthly'],
  ['/criadores',   '0.6', 'monthly'],
  ['/privacidade', '0.3', 'monthly'],
  ['/excluir-dados', '0.3', 'monthly'],
  ['/mapa',        '0.6', 'daily'],
  /* Rotas fixas do hub marcadas indexáveis em public/js/rotas.js (/loja, /comunidade).
     As outras telas do hub são estado do app e ficam fora (noindex). ADR 0008. */
  ...ROTAS_HUB.filter((r) => r.indexavel && (!r.dependeDoRanking || RANKING_ON)).map((r) => [r.caminho, '0.6', 'daily'] as [string, string, string]),
  ['/changelog',   '0.5', 'weekly'],
  ...PT_EN_PAIRS.map(([, en]) => [en, '0.5', 'weekly'] as [string, string, string]),
];

export const GET: APIRoute = async () => {
  const fixas: Entrada[] = STATIC.map(([path, prio, freq]) => ({
    loc: `${SITE}${path}`, changefreq: freq, priority: prio,
  }));

  /* QUANTOS PERFIS EXISTEM. Precisa saber ANTES de decidir entre urlset e
     índice, e um `count` com `head: true` não traz linha nenhuma - é bem mais
     barato que puxar 5.000 registros só pra contar. */
  let totalPerfis = 0;
  if (RANKING_ON && supabaseAdmin) {
    const { count } = await supabaseAdmin
      .from('player_points')
      .select('id', { count: 'exact', head: true });
    totalPerfis = count ?? 0;
  }

  const total = fixas.length + totalPerfis;

  /* MODO ÍNDICE. Só quando o conteúdo passa de uma página - ver o comentário de
     estratégia em src/lib/sitemap.ts. Abaixo do teto, a resposta é idêntica à
     de antes desta mudança. */
  if (total > POR_PAGINA) {
    const n = numeroDePaginas(total);
    return xmlResposta(xmlIndex(
      Array.from({ length: n }, (_, i) => ({ loc: `${SITE}/sitemap-${i + 1}.xml` })),
    ));
  }

  const entradas = fixas.concat(await perfis(0, POR_PAGINA - fixas.length));
  return xmlResposta(xmlUrlset(entradas));
};

/** Uma fatia dos perfis, já como entradas de sitemap. Usada pelas duas rotas. */
export async function perfis(offset: number, limite: number): Promise<Entrada[]> {
  if (!RANKING_ON || !supabaseAdmin || limite <= 0) return [];
  const out: Entrada[] = [];
  // O PostgREST do Supabase corta cada resposta em max-rows (1.000) sem erro.
  for (let de = offset, fim = offset + limite; de < fim;) {
    const { data } = await supabaseAdmin
      .from('player_points')
      .select('id,nick')
      .order('id', { ascending: true })
      .range(de, fim - 1);
    const linhas = (data ?? []) as any[];
    if (!linhas.length) break;
    de += linhas.length;
    for (const p of linhas) {
      if (!p?.id || !p?.nick) continue;
      out.push({
        loc: `${SITE}/u/${p.id}/${encodeURIComponent(p.nick)}`,
        changefreq: 'weekly',
        priority: '0.6',
      });
    }
  }
  return out;
}

export function xmlResposta(xml: string): Response {
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // 1h no CDN: crawler não precisa de sitemap fresco ao segundo, e sem
      // isso cada rastreio vira um SELECT de 5000 linhas no Supabase.
      'cache-control': 'no-store',
    },
  });
}
