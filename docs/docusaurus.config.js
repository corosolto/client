// @ts-check
// Config MÍNIMA de propósito. Cada opção aqui existe por um motivo declarado —
// nada de plugin extra que ninguém consegue depurar num domingo.
//
// baseUrl '/docs/': este site é buildado PARA DENTRO do site Astro (ver README.md
// desta pasta). O Astro copia `public/` inteiro para `dist/client/`, então uma
// pasta `public/docs/` é servida em `https://.../docs/`. Se você for publicar em
// outro host (GitHub Pages num repo próprio, Netlify, etc), troque baseUrl para '/'.

// Links INTERNOS do footer por locale: o Docusaurus 3.6 não traduz `to:` — o theme JSON
// (i18n/en/docusaurus-theme-classic/footer.json) só traduz label/título/copyright. Como os
// slugs EN diferem dos ids PT (/colaborar -> /contributing etc), o `to` certo depende da
// locale do build. Sem isto, o footer do /en apontava para /docs/en/colaborar — 404 e
// build vermelho (onBrokenLinks: 'throw' valida os links do footer).
//
// POR QUE UMA FUNÇÃO: o build seta DOCUSAURUS_CURRENT_LOCALE antes de CADA locale
// (core/lib/commands/build/buildLocale.js), mas o jiti cacheia o MÓDULO na primeira
// avaliação — um `const` no top-level congela no valor da 1ª locale (medido: o log só
// imprimia uma vez, com a env undefined). Exportando uma função (config creator), o
// Docusaurus CHAMA a função a cada locale (core/lib/server/config.js), e a env é lida
// no momento certo. Sem a env (dev, ou a leitura inicial de i18n) vale o caminho PT.
function createConfig() {
const EN = process.env.DOCUSAURUS_CURRENT_LOCALE === 'en';
const L = {
  comecando: '/',
  colaborar: EN ? '/contributing' : '/colaborar',
  instrumentacao: EN ? '/ai-instrumentation' : '/instrumentacao-ai',
  qualityGates: '/quality-gates',
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  // NOTA i18n: `title`/`tagline` não passam pelos JSONs de i18n do tema no 3.6.3 —
  // o sufixo "Docs do Dev" da aba fica em PT também no /en. Consertar exige
  // upgrade do Docusaurus ou build por locale (que hoje quebra no onBrokenLinks).
  title: 'CORO SOLTO — Docs do Dev',
  tagline: 'Instrumentação de IA, quality gates e como colaborar',
  // Favicon = o MESMO arquivo do site (`public/favicon.ico`, 16/32/48), que é o canarinho.
  // Copiado, não linkado: o Docusaurus só enxerga `docs/static/`. Se o do site mudar,
  // rode `cp ../public/favicon.ico static/img/favicon.ico` — dois ícones diferentes para
  // o mesmo produto é o tipo de detalhe que faz a doc parecer de outro projeto.
  favicon: 'img/favicon.ico',

  url: 'https://www.csbrasil.online',   // www: o astro.config canonicaliza com www — divergir aqui quebrava canonicals do /docs
  baseUrl: '/docs/',

  organizationName: 'rubenmarcus',
  projectName: 'csbrasil',

  // Link quebrado é doc que mente. Aqui ele derruba o build, igual invariante vermelha.
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    localeConfigs: {
      pt: { label: 'Português' },
      en: { label: 'English' },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // docs-only: o site inteiro É a documentação, sem landing separada.
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/rubenmarcus/csbrasil/tree/main/docs/',
          showLastUpdateTime: false,
        },
        blog: false,
        pages: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Social card (og:image / twitter:image): o MESMO arquivo do site
      // (`public/og-image.jpg`, 1200×630, gerado por tools/gen-og-image.mjs),
      // copiado para `static/img/`. O Docusaurus resolve para URL absoluta com
      // url+baseUrl: https://www.csbrasil.online/docs/img/og-image.jpg.
      // Se o do site mudar, rode `cp ../public/og-image.jpg static/img/og-image.jpg`.
      image: 'img/og-image.jpg',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'CORO SOLTO · Docs',
        // O ícone da navbar é o CANARINHO (o mascote), não a logomarca: a logomarca é um
        // letreiro de 4 linhas ("CORO / SOLTO / TRETA / SUPREMA") e a 32 px de altura ela
        // vira borrão ilegível. O letreiro inteiro aparece no cabeçalho da home, onde tem
        // espaço para ser lido. Mesma divisão que o site usa: ícone pequeno, letreiro grande.
        logo: {
          alt: 'Canarinho — mascote do CORO SOLTO',
          src: 'img/canarinho-icone.webp',
        },
        items: [
          { type: 'docSidebar', sidebarId: 'dev', position: 'left', label: 'Documentação' },
          { type: 'localeDropdown', position: 'right' },
          { href: 'https://csbrasil.online/', label: 'Jogar', position: 'right' },
          { href: 'https://github.com/rubenmarcus/csbrasil', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        // A LOGOMARCA mora aqui: é o único lugar da doc com largura sobrando para um
        // letreiro de 4 linhas ser lido. Cópia DIRETA de `public/logo.png` (651×526),
        // sem recorte — a versão .webp recortada era do branding v1. Se o do site mudar,
        // rode `cp ../public/logo.png static/img/logo-coro-solto.png`.
        logo: {
          alt: 'CORO SOLTO: Treta Suprema',
          src: 'img/logo-coro-solto.png',
          href: 'https://csbrasil.online/',
          width: 200,
          height: 162,
        },
        links: [
          {
            title: 'Comece por aqui',
            items: [
              { label: 'Começando', to: L.comecando },
              { label: 'Como colaborar', to: L.colaborar },
            ],
          },
          {
            title: 'A régua',
            items: [
              { label: 'Instrumentação de IA', to: L.instrumentacao },
              { label: 'O portão (quality gates)', to: L.qualityGates },
            ],
          },
          {
            title: 'Projeto',
            items: [
              { label: 'GitHub', href: 'https://github.com/rubenmarcus/csbrasil' },
              { label: 'Issues', href: 'https://github.com/rubenmarcus/csbrasil/issues' },
            ],
          },
        ],
        // O rodapé NÃO nomeia a licença de propósito. Ele dizia "código MIT" à mão, e este
        // arquivo é uma das 8 superfícies que precisam mudar JUNTO quando a licença mudar —
        // e era a única que NENHUMA das duas listas escritas à mão (README e plans/08 §3)
        // lembrava. Superfície que não repete o nome é uma a menos para esquecer; quem quer
        // a resposta lê o `LICENSE` na raiz do repositório.
        copyright: 'CORO SOLTO: Treta Suprema — código aberto; a licença vigente está no arquivo LICENSE do repositório. Sátira ficcional.',
      },
      prism: {
        additionalLanguages: ['bash', 'json', 'diff'],
      },
    }),
};

return config;
}

module.exports = createConfig;
