# STATUS - onde o projeto está agora

<!-- BEGIN:GERADO:status_atual — não edite à mão, rode `npm run docs` -->

- **Versão:** `2.0.0-alpha.248`
- **Conteúdo jogável:** 6 facções, 53 personagens, 17 mapas e 26 armas com GLB
- **Código do jogo:** 46.892 linhas em 93 módulos JavaScript
- **Automação:** 231 comandos npm, 363 scripts de avaliação e 75 scripts de pipeline

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `package.json · CHARACTERS · MAPS · public/models/weapons · public/js · tools/`

<!-- END:GERADO:status_atual -->

## Produto

O jogo é um FPS de navegador em Three.js, servido como módulos ES nativos. O site, as
rotas de API e as páginas públicas usam Astro e Vercel. O modo principal continua sendo
single-player contra bots, com rodadas e captura de bandeiras.

## Frente atual — Sertão PR #526 (08/09/2026)

Branch exclusiva `astra/sertao-praca-casas-por-do-sol`, atualizada com `main`
alpha.240. Casas dos spawns têm entrada, janela tática e saída lateral; carroças
usam colisores coerentes; interiores são agrupados por material. A validação
WebGL 3:2 passa RV1–RV12 com 499 draw calls, 349.175 triângulos e 82 texturas.
Duas cabras, uma galinha e três pintinhos animados estão presentes e medidos por
LG1–LG8. IN1–IN11 e 14 mutantes cobrem circulação, linhas de tiro, bolsões e
cobertura. Evidência e limitações: `docs/reports/SERTAO-CASAS-SUNSET.md`.

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
