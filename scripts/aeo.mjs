// AEO (Answer Engine Optimization) — geração de llms-full.txt, ai-index.json,
// docs.json e espelhos .md das páginas de conteúdo, no fim do `astro build`.
//
// USA A LIB DO DONO (`aeo.js`, github.com/multivmlabs/aeo.js) — mas só os
// GERADORES, com a lista de páginas montada aqui. O porquê está medido:
//
// A `aeoAstroIntegration()` pronta varre TODO HTML da pasta de saída. Nesta
// árvore isso são 19 páginas, não 7: `public/` guarda 12 telas de laboratório
// do harness (`eval.html`, `mapeval.html`, `weapontest.html`, `vm-inspect.html`,
// `charlineup.html`, …) que o `robots.txt` bloqueia de propósito. Rodando a
// integration padrão neste repo (04/08/2026), o `ai-index.json` saiu com 32
// entradas incluindo `/eval`, `/weaponeval`, `/mounttest` e `/modelviewer` —
// e com `canonical` apontando pra `https://www.csbrasil.online/eval`, que é
// 404 (a URL real é `/eval.html`). Publicar isso é entregar pro crawler de IA
// exatamente o que o robots.txt manda ele não ler, com URL que não existe.
// A lib não tem opção de `exclude` (o `minimatch` dela só filtra o contentDir),
// então a curadoria tem que vir de fora. É o que este arquivo faz.
//
// O que TAMBÉM foi desligado, e por quê:
//   · robotsTxt / sitemap → já existem e são melhores aqui: o `robots.txt` é
//     escrito à mão (bloqueia o harness, libera GPTBot/ClaudeBot/Perplexity) e
//     o sitemap é DINÂMICO (`src/pages/sitemap.xml.ts`), porque o conteúdo que
//     escala é `/u/<id>/<nick>`, que não existe em build time.
//   · llmsTxt → `public/llms.txt` é curado à mão e é a fonte da home aqui.
//   · schema → o JSON-LD sai do `Layout.astro` com `@id` estável e dedup.
//   · injeção de <head> → a lib injeta canonical/OG/JSON-LD só quando FALTAM,
//     e aqui não faltam; sobraria só o `<link rel=alternate>`, que o Layout
//     emite direto. Reescrever o HTML do jogo em pós-build por 4 tags não paga.
//
// CUIDADO (bug da lib, aeo.js@0.0.16): `generateAEOFiles()` decide se o objeto
// recebido já é um config RESOLVIDO olhando só pra `typeof cfg.generators
// .robotsTxt === 'boolean'` (core/generate-wrapper.ts). Um config PARCIAL que
// declare `generators.robotsTxt: false` passa nesse teste, o `resolveConfig()`
// é pulado e `config.aiIndex` fica `undefined` — o ai-index.json morre com
// "Cannot read properties of undefined (reading 'maxChunkLength')". Reproduzido
// aqui em 04/08. Por isso resolvemos o config ANTES, explicitamente.
import { generateAEOFiles, resolveConfig, extractTextFromHtml, extractTitle, extractDescription } from 'aeo.js';
import { readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Páginas de CONTEÚDO. Fora ficam:
 *  · `/` (é o jogo: o texto extraível é chrome de menu — "CARREGANDO ARENA…",
 *    "CLIQUE OU PRESSIONE QUALQUER TECLA" — e não responde pergunta nenhuma).
 *    A home entra assim mesmo, mas com o texto CURADO do `llms.txt`.
 *  · `/ranking`, `/u/*`, `/mapa`: SSR, não têm HTML em build time. As duas
 *    primeiras estão `noindex` enquanto RANKING_ON for false. */
const CONTENT_PAGES = ['/armas', '/mapas', '/personagens', '/como-jogar', '/sobre', '/changelog'];

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
    content: extractTextFromHtml(html),
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
        for (const p of CONTENT_PAGES) {
          const page = readPage(clientDir, p);
          if (page) pages.push(page);
          else log.warn(`página ${p} não encontrada no build — fora do llms-full/ai-index`);
        }

        // A home entra com o texto do llms.txt (curado à mão) em vez do chrome
        // do menu. Uma fonte de verdade pro resumo do jogo, e ela é humana.
        const home = readPage(clientDir, '/');
        const llms = join(clientDir, 'llms.txt');
        if (home && existsSync(llms)) {
          home.content = readFileSync(llms, 'utf-8');
          pages.unshift(home);
        }

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
        if (res.errors.length) res.errors.forEach(e => log.error(e));
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
