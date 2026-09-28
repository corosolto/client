# cenografo (persona: Skatista 🛹)

Grafite dos mapas: mantém a cobertura de parede pintada acima do piso gerando
levas `or-*` — obra própria via OpenRouter, o caminho do ROADMAP pra aposentar
o acervo baixado da web.

**A régua é quem decide.** O PR só existe se a cobertura SUBIU no re-measure;
não subiu, o worktree é descartado e a desistência fica registrada.

## O ciclo de uma rodada

1. `eval:serve` no ar (o census só existe no navegador);
2. `eval:grafite` → cobertura por mapa (`pintadas/placas` do
   `tools/eval/graffiti_census.json`);
3. mapa abaixo do piso (config `pisos`, default = as META do census:
   35/76/43/46/67) → gera até `imagens_por_mapa` peças com
   **`tools/gen-image.mjs`** (reuso — não existe segunda chamada de API no
   bot), convenção `or-graf-<semana>-<n>.png`, 512 px, PNG, prompt de grafite
   brasileiro **sem marca e sem pessoa real** (linha editorial);
4. alpha-key do fundo (`strip-decal-bg.mjs`) + entrada no bloco `or-*` do
   `DECAL_FILES` do `textures.js` (o bloco separado do gerado é de propósito);
5. `npm run grafite` re-assa o layout com o pool novo;
6. re-measure: subiu → PR (`cenografo/grafite-<data>`) com **antes/depois no
   corpo**; não subiu → desistencia registrada, árvore limpa.

## Orçamento de tinta

`max_por_rodada` (6) e `max_por_semana` (24) no config; o gasto mora em
`estado/gasto.json` por semana ISO. Estourou, a leva fica pra próxima e o
estado registra.

## Uso

```sh
cd bots/cenografo
bun pichacao.mjs rodada    # ciclo completo (abre servidor + navegador; noturno)
bun pichacao.mjs medir     # só o census → tabela de cobertura
bun pichacao.mjs selftest
GH_DRY_RUN=1 bun pichacao.mjs rodada    # push/PR pulados e salvos
```

Credencial: `GH_PAT_ESCREVE` (abre PR). Chave do OpenRouter:
`OPENROUTER_API_KEY` no `bots/.env` (o `gen-image.mjs` lê do env/`.env` da
raiz — mesmo padrão).

## Limites declarados

- O gen-image falha (rede/cota): a peça é pulada, a rodada segue com as que
  deram — e o orçamento só paga as que entraram.
- O census e o assado exigem navegador e servidor: rodada é noturna, não é
  por-PR.
- Prompt é tempero do processo, não curadoria: a régua aprova ou o PR não
  existe.
