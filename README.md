# CORO SOLTO: Treta Suprema

[![Licença: AGPL-3.0](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-blue)](LICENSE)
[![CI](https://github.com/corosolto/client/actions/workflows/ci.yml/badge.svg?branch=v2%2Falpha-release)](https://github.com/corosolto/client/actions/workflows/ci.yml)
[![Three.js](https://img.shields.io/badge/jogo-Three.js-000000?logo=three.js)](https://threejs.org)
[![Astro](https://img.shields.io/badge/site-Astro-ff5d01?logo=astro)](https://astro.build)

![CORO SOLTO: Treta Suprema — FPS satírico de navegador com facções brasileiras](public/og-image.jpg)

**FPS gratuito de navegador**, feito em Three.js e jogado direto na aba. Escolha uma facção, personagem, arena e modo; enfrente bots em rounds ou Capture the Flag. Não há download, instalação nem cadastro.

▶ **Jogue:** <https://www.csbrasil.online>

O jogo antes se chamava **CS BRASIL**. Esse nome permanece como nome alternativo para busca; a identidade atual é **CORO SOLTO: Treta Suprema**.

## Estado do produto

- O cliente canônico é web para desktop, com mouse e teclado. Não há aplicativo nativo para celular publicado.
- Partidas são contra bots. Multiplayer entre pessoas, servidor autoritativo e servidores criados por usuários ainda não estão implementados.
- O ranking global está desligado enquanto o resultado de uma partida puder ser forjado pelo cliente. A telemetria continua ativa; veja [`STATUS.md`](STATUS.md).
- O conteúdo jogável, as regras atuais e os mapas registrados são derivados do código e estão em [`docs/docs/comecando.md`](docs/docs/comecando.md), não copiados aqui.

Isso é uma alpha: a página pública não promete recursos em desenvolvimento como se já estivessem disponíveis.

## Rodar localmente

```bash
git clone https://github.com/corosolto/client.git
cd client
npm ci
npm run fetch-audio  # opcional; sem o pacote o jogo usa sons sintetizados
npm run dev          # http://localhost:4321
```

O jogo está em `/`, servido pelo Astro. `public/` contém módulos ES nativos e assets, mas **não** contém um `index.html`; servi-lo como site estático não abre o jogo completo.

```bash
npm run build
npm run preview
```

Variáveis de ambiente são opcionais para jogar localmente. Sem a configuração de servidor, ranking e telemetria degradam de modo explícito; instruções e limites ficam em [`.env.example`](.env.example) e [`docs/seguranca.md`](docs/seguranca.md).

## Arquitetura em uma página

| Parte | Responsabilidade |
|---|---|
| `public/` | jogo em JavaScript vanilla e Three.js vendorizado; sem etapa de build no runtime |
| `src/` | site Astro, renderização no servidor e rotas `/api/*` |
| `supabase/` | schema e migrations privados do backend |
| `tools/` | pipeline de assets, geradores e quality gates |
| `docs/` | documentação de desenvolvimento em Docusaurus |

Leia [`AGENTS.md`](AGENTS.md) antes de alterar o jogo. O índice por símbolo e as faixas seguras para trabalho paralelo estão em [`tools/eval/ARCH.md`](tools/eval/ARCH.md).

## Verificar uma mudança

```bash
npm run docs:check
npm run arch:check
npm run check:fast
npm run build
```

`check:fast` é a porta rápida; resultados datados e dívidas conhecidas pertencem a [`KNOWN-BUGS.md`](KNOWN-BUGS.md), não a este README. Mudanças visuais ou de gameplay têm regras adicionais em [`docs/docs/quality-gates.md`](docs/docs/quality-gates.md).

## Contribuir

1. Comece em [`STATUS.md`](STATUS.md) para o estado de hoje.
2. Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) para preparar um PR e os trailers de commit.
3. Consulte [`docs/issues/`](docs/issues/) para tarefas com escopo e critério de aceite.
4. Para backend, leia primeiro [`docs/seguranca.md`](docs/seguranca.md). Para mapas, armas ou personagens, siga os contratos em [`docs/docs/`](docs/docs/).

O projeto é feito em colaboração humana e com agentes de IA. Cada commit declara o agente ou a pessoa responsável no trailer `Agent:`.

## Publicação, SEO e AEO

A página pública usa canonical, Open Graph, JSON-LD, sitemap dinâmico, `robots.txt` e arquivos de leitura por máquinas. O contrato, as limitações e como verificar o HTML gerado estão em [`docs/SEO-AEO.md`](docs/SEO-AEO.md).

O conteúdo de `public/audio/` não é versionado no repositório. Só inclua áudio com procedência e direito de distribuição comercial confirmados; samples originais de Counter-Strike não são distribuídos aqui.

## Licença

<!-- BEGIN:GERADO:licenca — não edite à mão, rode `npm run docs` -->

O código está sob **AGPL-3.0** (GNU Affero General Public License, versão 3) — é o que vale hoje, e a fonte é o arquivo `LICENSE` na raiz do repositório. Nenhum outro arquivo tem autoridade sobre isso.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `título lido do texto do LICENSE, conferido contra o campo license do package.json`

<!-- END:GERADO:licenca -->

Arte, marca e dependências de terceiros têm regras próprias em [`docs/LICENCA.md`](docs/LICENCA.md). O jogo é uma paródia independente e não é afiliado à Valve; Counter-Strike é marca da Valve Corporation.
