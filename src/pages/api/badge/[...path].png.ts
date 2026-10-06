// GET /api/badge/<id|nick>.png - badge com stats.
// Render: resvg nativo no servidor + fonte DejaVu embutida.
// Avatar: foto → unavatar(X) → personagem do jogo (SVG) → inicial.
import type { APIRoute } from 'astro';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/ratelimit';
import { FONT_BOLD_B64 } from '../../../lib/font-data';
import { displayTime } from '../../../lib/fmt';
import { CHARS, charSvg, charName } from '../../../lib/charsvg';
import { socialAvatar } from '../../../lib/social';
import { fetchAvatar } from '../../../lib/safe-url';
import { RANKING_ON } from '../../../lib/site';
import { emptyPlayerScore } from '../../../lib/empty-player-score';

export const prerender = false;

const fontBuffers = [Buffer.from(FONT_BOLD_B64, 'base64')];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ANTI-SSRF: o fetch cru que morava aqui aceitava qualquer URL vinda do banco
// (players.avatar_url e o link social são escritos pelo próprio usuário em
// /api/register) - dava pra apontar pra 169.254.169.254, 127.0.0.1 ou 10.x e
// usar a badge pública como sonda da rede interna. `fetchAvatar` só sai pra
// https em host de avatar conhecido, revalida cada redirect e limita bytes.
// Ver src/lib/safe-url.ts.
async function avatarDataUri(url?: string | null): Promise<string | null> {
  const buf = await fetchAvatar(url);
  if (!buf) return null;
  try {
    const png = await sharp(buf).resize(120, 120, { fit: 'cover' }).png().toBuffer();
    return 'data:image/png;base64,' + png.toString('base64');
  } catch { return null; }
}

// lado do jogador: matches_p conta a Esquerda e matches_b a Direita (colunas legadas)
export function sideOf(mp: number, mb: number): [string, string] {
  if (mp > mb) return ['ESQUERDA', '#e03232'];
  if (mb > mp) return ['DIREITA', '#3355ff'];
  return ['NEUTRO', '#ffd23f'];
}

function badgeSvg(p: any, avatarUri: string | null, charId: string | null): string {
  const kd = p.deaths ? (p.kills / p.deaths).toFixed(2) : String(p.kills);
  const [sideLabel, sideColor] = sideOf(p.matches_p, p.matches_b);
  const cName = charName(charId);

  const cells: [string, string][] = [
    ['PONTOS', String(p.points)], ['KILLS', String(p.kills)], ['K/D', kd],
    ['PARTIDAS', String(p.matches)], ['VITÓRIAS', p.wins > 0 ? String(p.wins) : ' - '], ['HEADSHOTS', String(p.headshots)],
    ['MORTES', String(p.deaths)], ['SEQUÊNCIA', `${p.best_streak}×`], ['TEMPO', displayTime(p)],
  ];
  const grid = cells.map(([label, v], i) => {
    const x = 46 + (i % 3) * 260, y = 228 + Math.floor(i / 3) * 70;
    return `<rect x="${x}" y="${y}" width="248" height="62" rx="10" fill="#12160e" stroke="#2a2e20"/>
    <text x="${x + 16}" y="${y + 38}" font-size="27" font-weight="bold" fill="#ffd23f" font-family="DejaVu Sans">${v}</text>
    <text x="${x + 16}" y="${y + 53}" font-size="11" fill="#8a8064" font-family="DejaVu Sans" letter-spacing="1">${label}</text>`;
  }).join('');

  const avatar = avatarUri
    ? `<defs><clipPath id="cav"><circle cx="748" cy="96" r="56"/></clipPath></defs>
       <image href="${avatarUri}" x="692" y="40" width="112" height="112" clip-path="url(#cav)"/>
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
  <text x="660" y="60" font-size="16" fill="${sideColor}" font-family="DejaVu Sans" text-anchor="end" font-weight="bold">${sideLabel} · ${p.matches_p}E × ${p.matches_b}D</text>
  <text x="56" y="132" font-size="54" font-weight="bold" fill="#f2ead8" font-family="DejaVu Sans">${esc(p.nick)}</text>
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
  if (supabaseAdmin && !(await rateLimit(supabaseAdmin, 'badge', ip, 60, 60)))
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

const handle: APIRoute = async ({ params }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });
  const parts = (params.path || '').split('/').filter(Boolean);
  const first = parts[0] || '';
  const key = first.replace(/\.png$/, '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(key);
  const nick = key.slice(0, 14);
  // A badge antiga continua operando antes da migration; a flag só liga junto
  // da view nova, após o rollout coordenado.
  const query = RANKING_ON
    ? supabaseAdmin.from('player_points').select('*')
    : supabaseAdmin.from('stats').select('*, players!inner(id, nick, social_link, avatar_url)');
  const { data } = await (isUuid
    ? query.eq(RANKING_ON ? 'id' : 'players.id', key).maybeSingle()
    : query.eq('nick', nick).maybeSingle());
  let score: any = data;
  if (RANKING_ON && !score) {
    const players = supabaseAdmin.from('players').select('id,nick,social_link,socials,avatar_url');
    const { data: player } = await (isUuid
      ? players.eq('id', key).maybeSingle()
      : players.eq('nick', nick).maybeSingle());
    if (player) score = emptyPlayerScore(player);
  }
  if (!score) return new Response('not found', { status: 404 });
  const p = RANKING_ON
    ? { ...score, social: score.social_link }
    : { ...score, points: score.kills, social: score.players?.social_link };
  const avatarUrl = RANKING_ON ? score.avatar_url : score.players?.avatar_url;
  const avatarUri = await avatarDataUri(avatarUrl || socialAvatar(p.social));
  const resvg = new Resvg(badgeSvg(p, avatarUri, score.last_character), {
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
    background: '#0c0e11',
  });
  return new Response(new Uint8Array(resvg.render().asPng()), {
    // `s-maxage` faltava: sem ele a CDN não guarda e todo hit paga o WASM de novo.
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  });
};
