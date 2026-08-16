// GET /api/og/<tipo>.png - og:image própria de /mapas, /armas e /personagens.
//
// POR QUE: as três caíam na og-image.png genérica. Um card que diz "5 ARENAS" e
// lista os nomes converte muito mais que a mesma arte pra todo o site.
//
// REAPROVEITA A MÁQUINA DA BADGE, sem dependência nova: resvg-wasm + a DejaVu
// embutida em src/lib/font-data.ts. O SVG em si mora em src/lib/og-card.ts, pra
// ser renderizável em node puro - ver o comentário de lá e tools/eval/og-check.mjs.
//
// O FALLBACK DO WASM É O MESMO DA BADGE, e existe pelo mesmo motivo: se
// /wasm/resvg.wasm não estiver publicado, lê o binário do node_modules. Uma
// og:image que devolve 500 não aparece como erro pra ninguém - o card só fica
// sem imagem, e isso passa meses sem ser notado.
import type { APIRoute } from 'astro';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { FONT_BOLD_B64 } from '../../../lib/font-data';
import { CARDS, cardSvg } from '../../../lib/og-card';

export const prerender = false;

const fontBuffers = [Buffer.from(FONT_BOLD_B64, 'base64')];
let wasmReady: Promise<unknown> | null = null;
function init(req: Request) {
  return wasmReady ??= (async () => {
    try {
      const r = await fetch(new URL('/wasm/resvg.wasm', req.url));
      if (r.ok) return await initWasm(await r.arrayBuffer());
      console.warn('[og] /wasm/resvg.wasm devolveu', r.status, ' - usando o node_modules');
    } catch (e) {
      console.warn('[og] fetch do wasm falhou - usando o node_modules:', e);
    }
    const { readFileSync } = await import('node:fs');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    let p: string | null = null;
    for (const c of ['@resvg/resvg-wasm/index_bg.wasm', '@resvg/resvg-wasm/dist/index_bg.wasm']) {
      try { p = require.resolve(c); break; } catch { /* tenta o próximo */ }
    }
    if (!p) throw new Error('resvg.wasm indisponível (nem publicado nem no node_modules)');
    return initWasm(readFileSync(p));
  })();
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const tipo = String(params.tipo || '').replace(/\.png$/, '');
    const monta = CARDS[tipo];
    // 404 e não 500: tipo desconhecido é URL errada, não falha do servidor.
    if (!monta) return new Response('not found', { status: 404 });

    await init(request);
    const resvg = new Resvg(cardSvg(monta()), {
      font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
      background: '#0c0e11',
    });
    return new Response(new Uint8Array(resvg.render().asPng()), {
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
