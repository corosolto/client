// HTML/JSON-LD e versão de texto partilham as mesmas respostas.
import { HOME_FAQ } from '../data/home-faq';
import { GRUPOS } from '../data/jogo';
import { BRAND_FULL, DESC_LONG, abs } from '../lib/site';
export const prerender = true;
export function GET() {
  const paths = ['/armas', '/mapas', '/personagens', '/como-jogar', '/sobre', '/changelog', '/en', '/weapons', '/maps', '/characters', '/how-to-play', '/about', '/whats-new', '/apoie', ...GRUPOS.map(g => `/grupos/${g.id}`), '/mapa'];
  const content = `# ${BRAND_FULL}\n\n${DESC_LONG}\n\n` + HOME_FAQ.map(([q, a]) => `## ${q}\n\n${a}`).join('\n\n') + '\n\n## Páginas\n\n' + paths.map(p => `- [${p}](${abs(p)})`).join('\n') + '\n';
  return new Response(content, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
