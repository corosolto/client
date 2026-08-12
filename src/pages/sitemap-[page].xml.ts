// GET /sitemap-<n>.xml - uma página do sitemap, quando o conteúdo passa de
// POR_PAGINA URLs e /sitemap.xml vira índice.
//
// SÓ EXISTE PRA O MODO ÍNDICE. Enquanto o total couber numa página, /sitemap.xml
// responde o <urlset> inteiro e nada aponta pra cá - mas a rota fica de pé de
// qualquer jeito, porque um índice que aponta pra 404 é pior que não ter índice,
// e a transição entre os dois modos acontece sozinha quando o ranking liga e o
// nº de jogadores cresce.
//
// A PÁGINA 1 CARREGA AS FIXAS. Assim nenhuma URL fica fora do conjunto: o índice
// não lista /sitemap.xml (isso seria recursivo), então as 8 páginas do site
// precisam morar em alguma página numerada.
import type { APIRoute } from 'astro';
import { SITE, RANKING_ON } from '../lib/site';
import { supabaseAdmin } from '../lib/supabase';
import { POR_PAGINA, offsetDaPagina, xmlUrlset, type Entrada } from '../lib/sitemap';
import { STATIC, perfis, xmlResposta } from './sitemap.xml';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const n = Number(params.page);
  // 404 e não página vazia: /sitemap-0.xml ou /sitemap-abc.xml é URL errada, e
  // devolver XML válido pra ela ensina o crawler a pedir lixo.
  if (!Number.isInteger(n) || n < 1) return new Response('not found', { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const fixas: Entrada[] = n === 1
    ? STATIC.map(([path, prio, freq]) => ({
        loc: `${SITE}${path}`, lastmod: today, changefreq: freq, priority: prio,
      }))
    : [];

  // O offset dos perfis desconta as fixas que a página 1 consumiu, senão a
  // fronteira entre a página 1 e a 2 perderia tantos perfis quantas são as fixas.
  const offset = Math.max(0, offsetDaPagina(n) - (n === 1 ? 0 : fixasCount()));
  const entradas = fixas.concat(await perfis(offset, POR_PAGINA - fixas.length, today));

  if (!entradas.length) return new Response('not found', { status: 404 });
  return xmlResposta(xmlUrlset(entradas));
};

function fixasCount(): number {
  return STATIC.length;
}
