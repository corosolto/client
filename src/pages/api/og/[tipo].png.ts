// GET /api/og/<tipo>.png - og:image própria de /mapas, /armas e /personagens.
//
// POR QUE: as três caíam na og-image.png genérica. Um card que diz "5 ARENAS" e
// lista os nomes converte muito mais que a mesma arte pra todo o site.
//
// REAPROVEITA A MÁQUINA DA BADGE, sem dependência nova: resvg-wasm + a DejaVu
// embutida em src/lib/font-data.ts. O SVG em si mora em src/lib/og-card.ts, pra
// ser renderizável em node puro - ver o comentário de lá e tools/eval/og-check.mjs.
//
// O WASM E A FONTE VÊM DE src/lib/png.ts, partilhados com a badge e o profile-card
// (Vercel: /wasm/resvg.wasm ou node_modules; Workers: módulo compilado).
import type { APIRoute } from 'astro';
import { renderPng } from '../../../lib/png';
import { CARDS, cardSvg, routeCard } from '../../../lib/og-card';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const tipo = String(params.tipo || '').replace(/\.png$/, '');
    const url = new URL(request.url);
    const caminho = url.searchParams.get('rota') || '/';
    const titulo = url.searchParams.get('titulo') || undefined;
    const monta = tipo === 'pagina' ? () => routeCard(caminho, titulo) : CARDS[tipo];
    // 404 e não 500: tipo desconhecido é URL errada, não falha do servidor.
    if (!monta) return new Response('not found', { status: 404 });

    const png = await renderPng(request, cardSvg(monta()), '#0c0e11');
    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // 1 dia no browser, 7 no CDN: o card só muda quando entra mapa ou arma
        // nova, e o crawler de rede social repuxa a imagem com frequência.
        'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (e: any) {
    // Nem mensagem nem stack pro cliente: rota pública e sem auth, mesmo
    // tratamento da badge. O detalhe vai pro log da função.
    console.error('[og] render falhou:', e?.stack || e);
    return new Response(JSON.stringify({ error: 'render_failed' }),
      { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
