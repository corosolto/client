# 0002. Jogo em `public/`, site em `src/`, fronteira medida

Status: aceita

## Contexto

Dois runtimes convivem no mesmo repo: o jogo (browser, zero build) e o
site (Astro com SSR, rotas `/api/*` com credencial de serviço). A
fronteira mal definida já deixou credencial chegar ao cliente e já fez
agente editar o lado errado.

## Decisão

`public/` é o jogo; `src/` é o site; `tools/` é o arnês. A regra da
fronteira: `service_role` só no servidor, framework é bem-vindo só em
`src/`. O tamanho de cada zona e a existência (ou não) de
`public/index.html` são **bloco gerado** pelo `tools/gen-docs.mjs`
publicado no `AGENTS.md`, não texto escrito à mão.

## Consequências

- Números de zona nunca envelhecem em prosa: divergência reprova o
  `docs:check` do gate.
- `public/` não pode ganhar dependência de runtime nem passo de build
  (ver ADR 0001).
- Mexer na fronteira é mexer em três lugares ao mesmo tempo: código,
  bloco gerado e a régua que mede os dois.
