import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import cloudflare from '@astrojs/cloudflare';
import { adaptadorAlvo } from './scripts/adaptador.mjs';
import { aeoCurado } from './scripts/aeo.mjs';
import { moduleCacheManifest } from './scripts/module-cache.mjs';
import { studioPackVitePlugin } from './scripts/studio-pack-serving.mjs';
import {readFileSync,existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import { SITE } from './src/lib/site-origin.mjs';
import { fileURLToPath } from 'node:url';

const roster=readFileSync('public/js/characters.js','utf8').match(/export const CHARACTERS = ([\s\S]*?\n\]);/);
if(!roster)throw Error('Catálogo de personagens indisponível');
const SOCIAL_CHARACTERS=Object.fromEntries([...roster[1].matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g)].map(m=>[m[1],{id:m[1],nome:m[2]}]));
/* 63 retratos inline somam 13 MB gzip no bundle SSR, acima do teto do Workers (10 MB):
   no Cloudflare viram arquivos em public/img/social-card e a rota lê pelo asset binding. */
const RETRATOS_EM_ARQUIVO = adaptadorAlvo() === 'cloudflare';
if (RETRATOS_EM_ARQUIVO) mkdirSync('public/img/social-card', { recursive: true });
const SOCIAL_PORTRAITS={};
for(const id of Object.keys(SOCIAL_CHARACTERS)){
 if(!/^[a-z0-9_-]+$/.test(id))throw Error('ID de personagem inválido');
 const file=`public/img/resultado/${id}-vitoria.webp`;
 if(!existsSync(file))throw Error(`Arte vertical de personagem indisponível: ${id}`);
 const png=await sharp(readFileSync(file)).trim({threshold:1}).resize({height:630}).png().toBuffer();
 if (RETRATOS_EM_ARQUIVO) {
  writeFileSync(`public/img/social-card/${id}.png`, png);
  SOCIAL_PORTRAITS[id]=`/img/social-card/${id}.png`;
 } else SOCIAL_PORTRAITS[id]='data:image/png;base64,'+png.toString('base64');
}

const SOCIAL_LOGO='data:image/png;base64,'+(await sharp(readFileSync('public/logo.png')).trim({threshold:10}).resize({height:150}).png().toBuffer()).toString('base64');

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
const MANIFESTO_VENDOR = moduleCacheManifest('public/vendor');
MANIFESTO_JS.vendorModules = MANIFESTO_VENDOR.modules;
MANIFESTO_JS.vendorRevision = MANIFESTO_VENDOR.revision;
const PWA_REV = createHash('sha256')
  .update(MANIFESTO_JS.revision)
  .update(MANIFESTO_JS.vendorRevision)
  .update(readFileSync('public/sw.js'))
  .digest('hex')
  .slice(0, 12);
/* Revisão dos CSS do hub pelo CONTEÚDO, calculada aqui pelo mesmo motivo do manifesto:
   o hub também é renderizado no SSR de /u/<perfil>, e lá não existe `public/`. */
const revisaoCss = (arquivo) => createHash('sha1').update(readFileSync(arquivo)).digest('hex').slice(0, 8);
const CSS_REV = { style: revisaoCss('public/style.css'), social: revisaoCss('public/social.css'), treta: revisaoCss('public/treta.css') };
/* Folhas da Treta Pop (uma por tela): a página só as liga com ?ui=v3; a revisão cobre todas juntas. */
const TP_CSS_ARQUIVOS = readdirSync('public/css/tp').filter((f) => f.endsWith('.css')).sort();
const TP_CSS = { arquivos: TP_CSS_ARQUIVOS, rev: createHash('sha1').update(TP_CSS_ARQUIVOS.map((f) => readFileSync(`public/css/tp/${f}`)).join('\n')).digest('hex').slice(0, 8) };

export default defineConfig({
  output: 'static',
  /* ADAPTER=cloudflare troca o alvo do deploy (spike da migração, docs/runbooks/MIGRACAO-CLOUDFLARE.md);
     sem a variável continua Vercel, então main e CI não mudam. */
  adapter: adaptadorAlvo() === 'cloudflare'
    ? cloudflare({ prerenderEnvironment: 'node', imageService: 'passthrough' })
    : vercel(),
  session: adaptadorAlvo() === 'cloudflare' ? false : undefined,
  server: {
    port: Number(process.env.PORT) || 4321,
  },

  vite: {
    /* Uma implementação por borda (src/lib/borda/*): `#borda` (IP, waitUntil) e `#borda-imagem`
       (wasm do resvg, avatar). O alias troca o arquivo inteiro, sem `if` de runtime no bundle. */
    resolve: {
      alias: {
        '#borda': fileURLToPath(new URL(`./src/lib/borda/${adaptadorAlvo()}.ts`, import.meta.url)),
        '#borda-imagem': fileURLToPath(new URL(`./src/lib/borda/${adaptadorAlvo()}-imagem.ts`, import.meta.url)),
      },
    },
    define: {
      __MANIFESTO_JS__: JSON.stringify(MANIFESTO_JS),
      __PWA_REV__: JSON.stringify(PWA_REV),
      __CSS_REV__: JSON.stringify(CSS_REV),
      __TP_CSS__: JSON.stringify(TP_CSS),
      __SOCIAL_PORTRAITS__: JSON.stringify(SOCIAL_PORTRAITS),
      __SOCIAL_CHARACTERS__: JSON.stringify(SOCIAL_CHARACTERS),
      __SOCIAL_LOGO__: JSON.stringify(SOCIAL_LOGO),
      __ADAPTADOR__: JSON.stringify(adaptadorAlvo()),
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
    // Pacotes do Studio instalados fora de public/: /packs/ lê STUDIO_PACK_ROOT (sem a
    // variável, 404). Mesmo handler do tools/eval/serve.mjs; docs/studio-character-release.md.
    plugins: [studioPackVitePlugin()],
  },

  // AEO: llms-full.txt, ai-index.json, docs.json e espelhos .md das páginas de
  // conteúdo. Usa os geradores da `aeo.js` com a lista de páginas curada —
  // o porquê da curadoria (12 telas de laboratório que o robots.txt bloqueia)
  // está medido em scripts/aeo.mjs.
  integrations: [
    aeoCurado({
      site: SITE,
      title: 'CORO SOLTO: Treta Suprema',
      description:
        'FPS gratuito de navegador estilo CS 1.6: arena de sniper satírica numa ' +
        'Brasil fictício, com facções originais, bots e multiplayer beta.',
    }),
  ],

  // Host canônico: src/lib/site-origin.mjs. O Layout monta canonical e hreflang com
  // `new URL(pathname, Astro.site)`; régua: tools/eval/canonical-host-check.mjs.
  // `trailingSlash` fica no default ('ignore'); a barra final é normalizada no Layout.
  site: SITE,
});
