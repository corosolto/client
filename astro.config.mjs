import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { aeoCurado } from './scripts/aeo.mjs';
import { moduleCacheManifest } from './scripts/module-cache.mjs';

/* MANIFESTO DE CACHE CALCULADO NO BUILD, E ESSE É O PONTO.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO (11-12/08, achado em produção pelo dono: *"a pagina mapa online (aovivo)
   esta quebrada"*).

   `moduleCacheManifest()` era chamado no escopo do módulo de `src/layouts/Layout.astro`,
   ou seja, em TODA renderização de página. Ele faz `readdirSync('public/js')` relativo
   ao cwd. Para página estática isso roda no build e está tudo bem. Para as três páginas
   `prerender = false` — `/mapa`, `/ranking`, `/u/<perfil>` — passou a rodar DENTRO da
   função da Vercel, cujo pacote não inclui `public/js`:

       ENOENT: no such file or directory, scandir '<func>/public/js'

   E como o Astro faz streaming, o 200 e os headers já tinham saído quando o erro
   estourou. O jogador recebia **200 com 0 bytes** — não 500. Status sozinho chamava
   aquilo de saudável, e foi assim que passou um dia no ar.

   Aqui o manifesto é calculado UMA vez, quando a config carrega, e injetado como
   constante no bundle. Nenhuma página lê disco em tempo de requisição, então a classe
   inteira do defeito morre: não sobra caminho em que uma página dependa de arquivo que
   a função não empacotou. Estática e SSR passam a servir exatamente a mesma revisão,
   que é o que o cache-busting sempre quis.

   Régua: `tools/eval/ssr-render-check.mjs` (`--mutante=sem-publicjs` reproduz o pacote
   sem `public/js` e volta a ficar vermelha). */
const MANIFESTO_JS = moduleCacheManifest();

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  server: {
    port: Number(process.env.PORT) || 4321,
  },

  vite: {
    define: {
      __MANIFESTO_JS__: JSON.stringify(MANIFESTO_JS),
    },
    // BUG-75 (achado do dono, 29/08): public/private-assets/viewmodels é symlink
    // para fora da raiz; sem fs.allow explícito um restart do dev server pode
    // passar a devolver 403 e o jogo cai no viewmodel legado EM SILÊNCIO.
    // Régua: tools/eval/authored-serving-check.mjs (sobe o astro real e cobra 200).
    server: {
      fs: {
        allow: ['.', '/Users/ruben/csbrasil-private-assets'],
      },
    },
  },

  // AEO: llms-full.txt, ai-index.json, docs.json e espelhos .md das páginas de
  // conteúdo. Usa os geradores da `aeo.js` com a lista de páginas curada —
  // o porquê da curadoria (12 telas de laboratório que o robots.txt bloqueia)
  // está medido em scripts/aeo.mjs.
  integrations: [
    aeoCurado({
      site: 'https://www.csbrasil.online',
      title: 'CORO SOLTO: Treta Suprema',
      description:
        'FPS gratuito de navegador estilo CS 1.6: arena de sniper satírica numa ' +
        'Brasília fictícia, com cinco facções e 44 personagens originais.',
    }),
  ],

  // COM `www`, E ISSO IMPORTA.
  // A produção responde em https://www.csbrasil.online, mas o `site` dizia
  // https://csbrasil.online. Como o Layout monta o canonical com
  // `new URL(pathname, Astro.site)`, TODA página servida no host com www
  // apontava o canonical pro host SEM www — canonical split clássico: o
  // buscador vê dois hosts, dilui sinal entre eles e escolhe sozinho qual
  // indexar. Nada de SEO funciona direito enquanto o canonical apontar pro
  // host errado; por isso é a primeira correção da lista.
  // Se um dia a produção virar o apex, mude AQUI e em src/lib/site.ts.
  // NOTA: `trailingSlash` fica no default ('ignore') de propósito. Mudar pra
  // 'never' mexe no roteamento do build e não dá pra validar sem `npm install`
  // (sem rede nesta máquina) — é risco desnecessário no dia do release. A
  // normalização de barra final é feita no canonical, em Layout.astro.
  site: 'https://www.csbrasil.online',
});
