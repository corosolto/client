# Teste de fumaça das rotas do site no CI

**Dificuldade:** média · **Área:** CI / qualidade · **Tempo:** ~3 h

## Contexto

O CI tem quatro portões excelentes **para o jogo** (invariantes, viewmodel,
coice, bots) e um `astro build` para o site. Build passando não prova nada sobre
o site: `/ranking` pode 500 por causa de uma coluna renomeada, `/sitemap.xml`
pode sair vazio, `/u/*` pode entrar em loop de redirect — e o build fica verde
em todos esses casos.

Esta release mexeu em quase toda página do site. É o momento certo de fechar
esse buraco.

## O que fazer

Criar `tools/eval/site-smoke.mjs` que:

1. Sobe o preview (`npm run build` já roda antes no CI).
2. Bate em cada rota e checa contrato, **sem** Supabase configurado — que é o
   caso do CI, e é justamente o caminho de degradação que ninguém testa:

| Rota | Esperado sem envs |
|---|---|
| `/` | 200, `<title>` contém "CORO SOLTO" |
| `/ranking` | 200, texto "não configurado", **não** 500 |
| `/como-jogar`, `/mapas`, `/armas`, `/personagens`, `/sobre`, `/changelog` | 200 |
| `/sitemap.xml` | 200, XML válido, ≥ 9 `<loc>` |
| `/robots.txt`, `/llms.txt` | 200 |
| `/api/leaderboard` | 503 `not_configured` |
| `/naoexiste` | 404 |

3. Validar que **todo** bloco `application/ld+json` de toda página faz
   `JSON.parse` sem erro. JSON-LD quebrado é invisível: some do resultado rico
   e ninguém percebe por meses.
4. Adicionar o passo ao `.github/workflows/ci.yml`, depois do `astro build`.

**Sem dependência nova:** `fetch` e `JSON.parse` do próprio Node resolvem. Se
precisar de DOM, extraia os `<script type="application/ld+json">` com regex — é
suficiente pra esse contrato.

## Critério de aceite

- [ ] `node tools/eval/site-smoke.mjs` sai 0 no repo atual
- [ ] Quebrar um JSON-LD de propósito faz sair 1 com mensagem clara
- [ ] Roda no CI e é **bloqueante**

## Arquivos

`tools/eval/site-smoke.mjs` (novo) · `.github/workflows/ci.yml` · `package.json`
