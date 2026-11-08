// Arquivos AEO derivados do HTML público: PT/EN, grupos, apoio e FAQ da home.
// O mapa ao vivo exporta apenas explicações estáveis, nunca contagens de presença.
// Curadoria exclui os laboratórios bloqueados em robots.txt. Schema, sitemap e
// robots continuam sob suas fontes próprias. resolveConfig evita o atalho da lib
// que trata um config parcial com generators.robotsTxt como já resolvido.
import { generateAEOFiles, resolveConfig, extractTextFromHtml, extractTitle, extractDescription } from 'aeo.js';
import { readFileSync, existsSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVE_MAP } from '../src/data/live-map.mjs';

const CONTENT_PAGES = ['/armas', '/mapas', '/personagens', '/como-jogar', '/sobre', '/changelog', '/en', '/weapons', '/maps', '/characters', '/how-to-play', '/about', '/whats-new', '/apoie'];

function readPage(clientDir, pathname) {
  const file = pathname === '/'
    ? join(clientDir, 'index.html')
    : join(clientDir, pathname.slice(1), 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf-8');
  return {
    pathname,
    title: extractTitle(html) || undefined,
    description: extractDescription(html) || undefined,
    content: extractTextFromHtml(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? ''),
  };
}

export function aeoCurado({ site, title, description }) {
  return {
    name: 'aeo-curado',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const log = logger.fork('aeo');
        const clientDir = fileURLToPath(dir);

        const pages = [];
        const groupDir = join(clientDir, 'grupos');
        const groupPages = readdirSync(groupDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `/grupos/${e.name}`);
        for (const p of [...CONTENT_PAGES, ...groupPages]) {
          const page = readPage(clientDir, p);
          if (page) pages.push(page);
          else throw new Error(`Página ${p} ausente do build AEO`);
        }

        const homeHtml = readFileSync(join(clientDir, 'index.html'), 'utf8');
        const nodes = [...homeHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
          .flatMap(m => { const data = JSON.parse(m[1]); return data['@graph'] ?? [data]; });
        const game = nodes.find(n => n['@type'] === 'VideoGame');
        const faq = nodes.find(n => n['@type'] === 'FAQPage');
        if (!game?.description || !faq?.mainEntity?.length) throw new Error('Home sem descrição e FAQ para AEO');
        const links = [...CONTENT_PAGES, ...groupPages, LIVE_MAP.pathname].map(p => `- [${p}](${site}${p})`).join('\n');
        const faqTxt = faq.mainEntity.map(q => `## ${q.name}\n\n${q.acceptedAnswer.text}`).join('\n\n');
        const summary = `# ${title}\n\n${game.description}\n\n` + faqTxt;
        writeFileSync(join(clientDir, 'llms.txt'), `# ${title}\n\n${game.description}\n\nSite: ${site}\n\n` + faqTxt + '\n\n## Páginas\n\n' + links + '\n');
        pages.unshift({ pathname: '/', title, description: game.description, content: summary });
        pages.push({ ...LIVE_MAP, content: `# ${LIVE_MAP.title}\n\n${LIVE_MAP.description}\n\n` + LIVE_MAP.faq.map(([q, a]) => `## ${q}\n\n${a}`).join('\n\n') });

        const res = await generateAEOFiles(resolveConfig({
          title, description, url: site,
          outDir: clientDir,
          contentDir: 'src/content-inexistente', // nada pra copiar: o conteúdo vem das páginas
          pages,
          widget: { enabled: false },
          generators: {
            robotsTxt: false, sitemap: false, schema: false, llmsTxt: false,
            llmsFullTxt: true, rawMarkdown: true, manifest: true, aiIndex: true,
          },
        }));
        if (res.errors.length) throw new Error(res.errors.join('\n'));
        log.info(`${res.files.length} arquivo(s) de ${pages.length} página(s): ${res.files.join(', ')}`);

        // O adapter da Vercel copia `dist/client/` pra `.vercel/output/static/`
        // no PRÓPRIO `astro:build:done`. A ordem observada em 04/08 é favorável
        // (o aeo roda antes), mas ordem entre integrations é frágil demais pra
        // um artefato de deploy depender dela — então espelha explicitamente se
        // a pasta já existir. Idempotente: mesmo conteúdo, mesmo destino.
        const vercelStatic = join(process.cwd(), '.vercel', 'output', 'static');
        if (existsSync(vercelStatic)) {
          let n = 0;
          for (const f of readdirSync(clientDir)) {
            if (!/\.(md|txt|json)$/.test(f)) continue;
            if (!existsSync(join(clientDir, f))) continue;
            copyFileSync(join(clientDir, f), join(vercelStatic, f));
            n++;
          }
          log.info(`espelhados ${n} arquivo(s) em .vercel/output/static/`);
        }
      },
    },
  };
}
