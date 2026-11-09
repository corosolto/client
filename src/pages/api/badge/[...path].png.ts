// GET /api/badge/<id|nick>.png - badge com stats.
// Render: resvg-wasm (src/lib/png.ts) + fonte DejaVu embutida; avatar quadrado por `#borda-imagem`.
// Avatar: foto → unavatar(X) → personagem do jogo (SVG) → inicial.
import type { APIRoute } from 'astro';
import { bordaImagem } from '#borda-imagem';
import { supabaseAdmin, NOT_CONFIGURED } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/ratelimit';
import { renderPng } from '../../../lib/png';
import { fmtTime } from '../../../lib/fmt';
import { CHARS, charSvg, charName } from '../../../lib/charsvg';
import { fetchAvatar } from '../../../lib/safe-url';

export const prerender = false;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ANTI-SSRF: o fetch cru que morava aqui aceitava qualquer URL vinda do banco
// (players.avatar_url e o link social são escritos pelo próprio usuário em
// /api/register) - dava pra apontar pra 169.254.169.254, 127.0.0.1 ou 10.x e
// usar a badge pública como sonda da rede interna. `fetchAvatar` só sai pra
// https em host de avatar conhecido, revalida cada redirect e limita bytes.
// Ver src/lib/safe-url.ts.
async function avatarDataUri(url?: string | null, id?: string): Promise<string | null> {
  let buf:Buffer|null=null;
  if(id && url===`/api/social-avatar?id=${id}`){
    const {data}=await supabaseAdmin()!.storage.from('avatars').download(`${id}.png`);
    if(data)buf=Buffer.from(await data.arrayBuffer());
  }else buf=await fetchAvatar(url);
  if (!buf) return null;
  return bordaImagem.avatarDataUri(buf);
}

// matches_p/matches_b são colunas legadas; a interface publica apenas os times E/B.
export function sideOf(mp: number, mb: number): [string, string] {
  if (mp > mb) return ['TIME E', '#e03232'];
  if (mb > mp) return ['TIME B', '#3355ff'];
  return ['NEUTRO', '#ffd23f'];
}

function badgeSvg(p: any, avatarUri: string | null, charId: string | null): string {
  const kd = p.deaths ? (p.kills / p.deaths).toFixed(2) : String(p.kills);
  const sideColor = '#ffd23f';
  const cName = charName(charId);
  // 600 px até o avatar (x=692); o W da DejaVu Bold mede 0,96 em.
  const nickSize = Math.min(54, 600 / Math.max(1, Array.from(String(p.nick)).length));

  const cells: [string, string][] = [
    ['PONTOS', String(p.points)], ['KILLS', String(p.kills)], ['K/D', kd],
    ['PARTIDAS', String(p.matches)], ['RODADAS GANHAS', String(p.wins)], ['HEADSHOTS', String(p.headshots)],
    ['MORTES', String(p.deaths)], ['RODADAS', String(p.rounds)], ['TEMPO', fmtTime(p.play_seconds)],
  ];
  const grid = cells.map(([label, v], i) => {
    const x = 46 + (i % 3) * 260, y = 228 + Math.floor(i / 3) * 70;
    return `<rect x="${x}" y="${y}" width="248" height="62" rx="10" fill="#12160e" stroke="#2a2e20"/>
    <text x="${x + 16}" y="${y + 38}" font-size="27" font-weight="bold" fill="#ffd23f" font-family="DejaVu Sans">${v}</text>
    <text x="${x + 16}" y="${y + 53}" font-size="11" fill="#8a8064" font-family="DejaVu Sans" letter-spacing="1">${label}</text>`;
  }).join('');

  const avatar = avatarUri
    ? `<defs><clipPath id="cav"><circle cx="748" cy="96" r="56"/></clipPath></defs>
       <image href="${avatarUri}" x="692" y="40" width="112" height="112" preserveAspectRatio="xMidYMid slice" clip-path="url(#cav)"/>
       <circle cx="748" cy="96" r="56" fill="none" stroke="${sideColor}" stroke-width="4"/>`
    : (charId && CHARS[charId] ? charSvg(charId, sideColor)
    : `<circle cx="748" cy="96" r="56" fill="${sideColor}" opacity="0.25"/>
       <circle cx="748" cy="96" r="56" fill="none" stroke="${sideColor}" stroke-width="4"/>
       <text x="748" y="118" font-size="64" font-weight="bold" fill="${sideColor}" font-family="DejaVu Sans" text-anchor="middle">${esc((p.nick[0] || '?').toUpperCase())}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="440" viewBox="0 0 840 440">
  <rect width="840" height="440" fill="#0c0e11"/>
  <circle cx="748" cy="96" r="200" fill="${sideColor}" opacity="0.07"/>
  <rect width="840" height="6" fill="#e03232"/><rect y="434" width="840" height="6" fill="#1faa4d"/>
  <text x="56" y="60" font-size="22" font-weight="bold" fill="#ffd23f" font-family="DejaVu Sans" letter-spacing="5">CORO SOLTO</text>
  <text x="660" y="60" font-size="16" fill="${sideColor}" font-family="DejaVu Sans" text-anchor="end" font-weight="bold">DADOS VERIFICADOS</text>
  <text x="56" y="132" font-size="${nickSize}" font-weight="bold" fill="#f2ead8" font-family="DejaVu Sans">${esc(p.nick)}</text>
  ${p.social ? `<text x="56" y="166" font-size="18" fill="#b8d94a" font-family="DejaVu Sans">${esc(p.social)}</text>` : ''}
  ${cName ? `<text x="56" y="194" font-size="16" fill="#8a8064" font-family="DejaVu Sans">joga de ${esc(cName)}</text>` : ''}
  <rect x="46" y="212" width="748" height="1.5" fill="#3a3325"/>
  ${avatar}
  ${grid}
</svg>`;
}

export const GET: APIRoute = async (ctx) => {
  /* ── RATE LIMIT + CACHE DE CDN (07/08, com o site no ar) ────────────────────
     Esta rota roda `resvg` A CADA REQUISIÇÃO e aceita QUALQUER nick no
     caminho, então o cache por URL não protege: quem varia o nick gera trabalho
     novo toda vez. E o `cache-control` só tinha `max-age` (navegador), sem
     `s-maxage` - a CDN não guardava nada e todo hit chegava na função.
     60/min por IP é folgado pro uso real (a badge é embutida em README e perfil,
     um hit por visita) e corta a varredura. Mesmo helper das outras rotas. */
  const ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const db = supabaseAdmin();
  if (db && !(await rateLimit(db, 'badge', ip, 60, 60)))
    return new Response('rate limited', { status: 429 });

  try {
    return await handle(ctx);
  } catch (e: any) {
    // NÃO devolver mensagem nem stack pro cliente: esta rota é pública e sem
    // auth, e o stack entregava caminhos internos, versões de lib e nomes de
    // arquivo de graça pra quem estivesse mapeando o alvo. O detalhe vai pro
    // log da função (visível no dashboard da Vercel), o cliente vê genérico.
    console.error('[badge] render falhou:', e?.stack || e);
    return new Response(JSON.stringify({ error: 'render_failed' }),
      { status: 500, headers: { 'content-type': 'application/json' } });
  }
};

const handle: APIRoute = async ({ params, request }) => {
  const db = supabaseAdmin();
  if (!db)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });
  const parts = (params.path || '').split('/').filter(Boolean);
  const first = parts[0] || '';
  const key = first.replace(/\.png$/, '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(key);
  const nick = key.slice(0, 32);
  const query=db.from('player_points').select('*');
  const {data:score,error}=await (isUuid?query.eq('id',key):query.eq('nick',nick)).maybeSingle();
  if(error) return new Response('unavailable',{status:503,headers:{'cache-control':'no-store'}});
  if(!score) return new Response('not found',{status:404,headers:{'cache-control':'no-store'}});
  const p={...score,social:score.social_link};
  const avatarUri=await avatarDataUri(score.avatar_url,score.id);
  const png = await renderPng(request, badgeSvg(p, avatarUri, score.last_character), '#0c0e11');
  return new Response(png, {
    // `s-maxage` faltava: sem ele a CDN não guarda e todo hit paga o WASM de novo.
    headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
  });
};
