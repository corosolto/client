# ROADMAP — próximos passos

> Atualizado em **07/08/2026** (`2.0.0-alpha.32`). Este arquivo é a VISTA DE CIMA:
> a ordem e o porquê. O detalhe de execução mora em [`TRILHA-V2.md`](TRILHA-V2.md)
> (T1–T32, com critério de aceite por tarefa) e nos planos por frente em
> [`PLANS/`](PLANS/). Defeito aberto é [`KNOWN-BUGS.md`](KNOWN-BUGS.md); tarefa de
> entrada pra contribuidor é [issue no GitHub](https://github.com/rubenmarcus/csbrasil/issues)
> + [`docs/issues/`](docs/issues/). Quando um item daqui fechar, ele sai daqui —
> histórico é o git, não este arquivo.

## Agora (fecha o release v2)

1. **REPUBLICAR O PACOTE DE DECALQUES** — *bloqueia deploy*. O `decals-pack-v1`
   tem **174** arquivos e o `DECAL_FILES` do textures.js pede **196**: os 22
   `folha-*` (pixação, throw-up, stencil, lambe, personagem) nunca foram
   republicados. Em produção eles dão 404 hoje — **513 das 4.671 peças de grafite
   somem, 30% da Quebrada**. Quem achou foi a asserção do T1 no build limpo; antes
   dela ninguém tinha como ver. O zip corrigido já monta com
   `node -e` a partir de `public/img/decals` (196 arquivos, 9,4 MB). Falta: subir
   como `decals-pack-v2` e apontar `scripts/fetch-decals.sh` pra ele. Enquanto não
   subir, `npm run assert:assets` reprova o build — de propósito.
   *(O manifest de áudio publicado também está 2 caminhos atrás: 306 contra 308.
   Passa no piso de 250, então não bloqueia.)*
2. **Paridade de grafite em produção** — o acervo é gitignored por procedência, então
   prod depende do pacote acima. Caminho de longo prazo continua: gerar levas `or-*`
   via OpenRouter (`tools/gen-image.mjs`) até aposentar o acervo baixado da web.
   A cobertura procedural fechou em 07/08 (`graffiti_pass.js` + layout assado):
   piscina 99,1% · ferrovelho 95,7% · loja H 89,6% · quebrada 88,7% · brasília 88,5%,
   medido por `npm run eval:grafite`.
3. **Aplicar a migration `013_feedback.sql` no Supabase de prod** — o form de
   FEEDBACK do menu (semente da newsletter) responde "indisponível" até isso.
4. **BOT8 / BUG-03** — bot com linha de visão no jogador por segundos sem atirar.
   Última dívida de *jogabilidade* de verdade; régua existe, botsim reproduz.
5. **Blocos 2–7 da trilha, na ordem** — AI engineering (mutation testing, portão
   por severidade, CI comentando placar), telemetria, canais, primeira impressão,
   repo de colaborador, release. T25 (form de feedback) **já caiu em 07/08**;
   T23 (captura mobile) e T28 (issues no GitHub) estão meio andados.

## Depois do release

- **Multiplayer 4×4 com servidor autoritativo** — a maior frente; decisão de
  02/08, plano em [`PLANS/03-MULTIPLAYER-4V4.md`](PLANS/03-MULTIPLAYER-4V4.md). É v3.
- **Dívidas do portão** ([`tools/eval/KNOWN-RED.json`](tools/eval/KNOWN-RED.json)) —
  13 críticas conhecidas que não reprovam o CI mas continuam devidas:
  enquadramento de viewmodel (VM1/3/9/12/16/18/19/20), antropometria do elenco
  (CHR1/3/4), CTF1. Quitar uma → remover da lista (o portão avisa).
- **Braços FP** — rig sem forma; padrão hoje é arma sozinha (`?hands=1` religa).
- **HUD mobile retrato** — o menu foi consertado (07/08); o HUD in-game em pé
  ainda é um amasso. Mobile continua "aviso + dá pra entrar".
- **Newsletter de verdade** — o funil: exportar `feedback where newsletter=true`,
  escolher provedor, primeira edição (capturas em `newsletter/`, fora do git).
- **Monetização** — doações + anúncios próprios + portais (CrazyGames/itch:
  `frame-ancestors` já liberado, falta o pacote de submissão).

## Bloco 1 — FECHADO em 07/08

T1, T2 e T3 entregues e provados. O que ficou de pé:

- **T1** `npm run assert:assets` (`tools/eval/assets-check.mjs`) no `buildCommand` da
  Vercel, entre os fetches e o build. Conta FOLHA DE STRING no manifest (o método
  importa mais que o número: o mesmo arquivo dá 309 por item de lista e 9 por chave de
  topo; por folha dá 308 no real e 62 no exemplo — piso 250). Decalques saem do módulo
  importado em node, não de parse de linha, e com diagnóstico por classe (`or-*` do git
  × acervo do pack). Provado com um zip SEM manifest servido em localhost: o
  `fetch-audio.sh` diz "Pronto" e sai 0, e a régua reprova nomeando a linha 23.
- **T2** `scripts/prune-dist.mjs` no fim do build: `models/fpvm` sai do `dist/client`
  E do espelho `.vercel/output/static` (154,3 MB em cada). `dist/client` 625 → 488 MB.
  Custo declarado: `?tripovm=1` e `?tvm=1` só valem em dev. `KEEP_FPVM=1` desliga.
- **T3** feito em clone descartável (Vercel-símile), que é o que achou os dois defeitos
  reais desta rodada: o pacote de decalques desatualizado (item 1 do "Agora") e o
  atalho do `three` que o harness plantava FORA do projeto — um clone velho em
  /tmp deixava o link pendurado e qualquer checkout novo nascia com as 150 réguas de
  `tools/eval` quebradas, em silêncio.

## Como contribuir

Comece por [`CONTRIBUTING.md`](CONTRIBUTING.md) e pelas
[issues abertas](https://github.com/rubenmarcus/csbrasil/issues) — cada uma tem
arquivo, linha e critério de aceite. As de entrada estão espelhadas em
[`docs/issues/`](docs/issues/). Regras que não se negociam:
régua antes do conserto, mutação que prova a régua, nenhuma crítica verde vira
vermelha (`npm run check`), e comentário explica o *porquê*.
