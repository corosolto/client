// GET /api/badge/<id|nick>.png — badge com stats.
// Render: resvg-wasm (binário único servido de /wasm/) + fonte DejaVu embutida.
// Avatar: foto → unavatar(X) → personagem do jogo (SVG) → inicial.
import type { APIRoute } from 'astro';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../../lib/supabase';
import { FONT_BOLD_B64 } from '../../../lib/font-data';
import { displayTime } from '../../../lib/fmt';
import { CHARS, charSvg, charName } from '../../../lib/charsvg';
import { socialAvatar } from '../../../lib/social';

export const prerender = false;

const fontBuffers = [Buffer.from(FONT_BOLD_B64, 'base64')];
let wasmReady: Promise<unknown> | null = null;
function init(req: Request) {
  // NÃO deixar a promise rejeitada no cache: com `??=` puro, um blip de rede no
  // primeiro badge fritava TODOS os badges daquela instância morna pra sempre.
  return wasmReady ??= (async () => {
    const r = await fetch(new URL('/wasm/resvg.wasm', req.url));
    if (!r.ok) throw new Error('wasm fetch failed: ' + r.status);
    return initWasm(await r.arrayBuffer());
  })().catch(err => { wasmReady = null; throw err; });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function avatarDataUri(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const png = await sharp(buf).resize(120, 120, { fit: 'cover' }).png().toBuffer();
    return 'data:image/png;base64,' + png.toString('base64');
  } catch { return null; }
}

// lado do jogador: P > B = PETISTA, B > P = BOLSONARISTA, empate = NEUTRO
export function sideOf(mp: number, mb: number): [string, string] {
  if (mp > mb) return ['PETISTA', '#e03232'];
  if (mb > mp) return ['BOLSONARISTA', '#1faa4d'];
  return ['NEUTRO', '#ffd23f'];
}

function badgeSvg(p: any, avatarUri: string | null, charId: string | null): string {
  const kd = p.deaths ? (p.kills / p.deaths).toFixed(2) : String(p.kills);
  const [sideLabel, sideColor] = sideOf(p.matches_p, p.matches_b);
  const cName = charName(charId);

  const cells: [string, string][] = [
    ['PARTIDAS', String(p.matches)], ['VITÓRIAS', p.wins > 0 ? String(p.wins) : '—'], ['K/D', kd],
    ['KILLS', String(p.kills)], ['MORTES', String(p.deaths)], ['HEADSHOTS', String(p.headshots)],
    ['SEQUÊNCIA', `${p.best_streak}×`], ['ROUNDS', String(p.rounds)], ['TEMPO', displayTime(p)],
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
  <text x="56" y="60" font-size="22" font-weight="bold" fill="#ffd23f" font-family="DejaVu Sans" letter-spacing="5">CS BRASIL</text>
  <text x="660" y="60" font-size="16" fill="${sideColor}" font-family="DejaVu Sans" text-anchor="end" font-weight="bold">${sideLabel} · ${p.matches_p}P × ${p.matches_b}B</text>
  <text x="56" y="132" font-size="54" font-weight="bold" fill="#f2ead8" font-family="DejaVu Sans">${esc(p.nick)}</text>
  ${p.social ? `<text x="56" y="166" font-size="18" fill="#b8d94a" font-family="DejaVu Sans">${esc(p.social)}</text>` : ''}
  ${cName ? `<text x="56" y="194" font-size="16" fill="#8a8064" font-family="DejaVu Sans">joga de ${esc(cName)}</text>` : ''}
  <rect x="46" y="212" width="748" height="1.5" fill="#3a3325"/>
  ${avatar}
  ${grid}
</svg>`;
}

export const GET: APIRoute = async (ctx) => {
  try {
    return await handle(ctx);
  } catch (e: any) {
    // stack fica no log da Vercel, nunca na resposta (vazava caminho interno)
    console.error('[badge] falhou:', e);
    return new Response(JSON.stringify({ error: 'erro ao gerar a badge' }),
      { status: 500, headers: { 'content-type': 'application/json' } });
  }
};

const handle: APIRoute = async ({ params, request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });
  const parts = (params.path || '').split('/').filter(Boolean);
  let query = supabaseAdmin.from('stats').select('*, players!inner(id, nick, social_link, avatar_url)');
  const first = parts[0] || '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(first);
  const { data } = await (isUuid
    ? query.eq('players.id', first).maybeSingle()
    : query.eq('nick', first.replace(/\.png$/, '').slice(0, 14)).maybeSingle());
  if (!data) return new Response('not found', { status: 404 });
  const p = { ...data, social: (data as any).players?.social_link };
  const avatarUri = await avatarDataUri((data as any).players?.avatar_url || socialAvatar(p.social));
  await init(request);
  const resvg = new Resvg(badgeSvg(p, avatarUri, data.last_character), {
    font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
    background: '#0c0e11',
  });
  return new Response(new Uint8Array(resvg.render().asPng()), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' },
  });
};
