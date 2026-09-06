# STATUS - onde o projeto está agora

<!-- BEGIN:GERADO:status_atual — não edite à mão, rode `npm run docs` -->

- **Versão:** `2.0.0-alpha.227`
- **Conteúdo jogável:** 5 facções, 44 personagens, 15 mapas e 26 armas com GLB
- **Código do jogo:** 41.058 linhas em 72 módulos JavaScript
- **Automação:** 201 comandos npm, 281 scripts de avaliação e 61 scripts de pipeline

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `package.json · CHARACTERS · MAPS · public/models/weapons · public/js · tools/`

<!-- END:GERADO:status_atual -->

## Produto

O jogo é um FPS de navegador em Three.js, servido como módulos ES nativos. O site, as
rotas de API e as páginas públicas usam Astro e Vercel. O modo principal continua sendo
single-player contra bots, com rodadas e captura de bandeiras.

O ranking está desligado por `RANKING_ON`. A telemetria anônima continua ativa e registra
funil, performance, partidas, mapas, modos, personagens, armas e facções. O mapa público
mostra presença aproximada por cidade e as cinco facções sem publicar IP.

Nas rotas de jogador, UID é a identidade estável, token autentica a sessão e nick é
atributo de exibição. O fallback por `nick + token` existe apenas para a transição de
clientes e banco antigos.

## Fontes vivas

- versão e histórico público: `CHANGELOG.md` e `/changelog`;
- saúde de produção: `/api/health` e `.github/workflows/prod-watch.yml`;
- dívida conhecida: `KNOWN-BUGS.md` e `tools/eval/KNOWN-RED.json`;
- trabalho aberto e prioridade: issues do GitHub;
- arquitetura e conflitos: `tools/eval/ARCH.md` e `graphify-out/graph.json`;
- documentação publicada: `docs/docs/` e o build versionado em `public/docs/`.

## Antes de publicar

```bash
npm run docs:check
npm run arch:check
npm run check:fast
npm run build
```

Checks que exigem navegador ou produção ficam fora do ciclo rápido. Use `eval:boot` para
a abertura do jogo, `eval:site` para as rotas e `prod:coherence` para o edge publicado.

## Riscos que não devem ser escondidos

- O schema e as migrations do Supabase são privados e precisam ser aplicados fora deste
  repositório; código novo deve tolerar banco atrasado e tornar a degradação observável.
- Assets de áudio e parte dos decalques não estão no Git por procedência. O build precisa
  baixar os pacotes e `assert:assets` deve reprovar conteúdo incompleto.
- O jogo ainda concentra bastante lógica em módulos grandes. Edite por símbolo, consulte
  o grafo antes de mudanças amplas e transforme regressões reproduzíveis em régua.
