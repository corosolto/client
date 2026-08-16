# Página 404 personalizada

**Dificuldade:** fácil · **Área:** UI / SEO · **Tempo:** ~1 h

## Contexto

O site não tem `src/pages/404.astro`. Quem erra a URL — e isso acontece muito
com `/u/<nick>` digitado à mão — recebe a página padrão da Vercel: fundo branco,
tipografia de sistema, zero relação com o jogo, e nenhuma saída.

## O que fazer

Criar `src/pages/404.astro` usando o `<Layout>`, com:

- `noindex` (a prop já existe no Layout)
- humor no tom do jogo, sem ser irritante
- **saídas úteis:** Jogar, Ranking, Como jogar
- se a URL começa com `/u/`, uma dica explícita: "procurando um jogador? o
  perfil fica em `/u/<id>/<nick>` — a lista completa está no
  [ranking](/ranking)"

## Critério de aceite

- [ ] `/qualquer-coisa` mostra a 404 com o visual do site
- [ ] A resposta tem status **404**, não 200
- [ ] `<meta name="robots" content="noindex, follow">` presente

## Arquivos

`src/pages/404.astro` (novo)
