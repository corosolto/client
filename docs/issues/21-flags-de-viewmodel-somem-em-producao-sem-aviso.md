# `?tripovm=1` e `?tvm=1` somem em produção sem avisar

**Dificuldade:** fácil · **Área:** DX · **Tempo:** ~30 min

## Contexto

`scripts/prune-dist.mjs` tira `models/fpvm` (154 MB) do build publicado — decisão certa,
já que os dois consumidores estão atrás de flag de depuração:

- `public/js/fparms.js:107` — `if (!TRIPO_VM) return`, com `TRIPO_VM = ?tripovm=1`
- `public/js/game.js:1902` — `this._tvm = qp.get('tvm') === '1'`

O efeito colateral é que, **em produção**, quem abrir o jogo com uma dessas flags recebe
404 no GLB. Os dois caminhos tratam a falha (o `fparms` tem `.catch` com aviso, o `tvm` é
opcional por construção), então nada quebra — mas a pessoa fica olhando uma tela sem
mudança nenhuma, sem saber se errou a flag, se o modelo sumiu ou se o jogo ignorou.

## O que fazer

1. Nos dois pontos, quando a flag está ligada e o GLB dá 404, escrever um aviso que diga
   **a causa e a saída**: "os viewmodels Tripo não são publicados (scripts/prune-dist.mjs);
   rode local com `npm run dev`, ou `KEEP_FPVM=1 npm run build`".
2. Documentar as duas flags onde as outras já estão documentadas — hoje elas só existem
   num comentário dentro do `game.js`.

**Não** reverter a poda: 154 MB para duas provas manuais é o que a T2 resolveu.

## Critério de aceite

- [ ] Com o build podado servido, `?tripovm=1` escreve um aviso que nomeia a causa e a saída
- [ ] Idem `?tvm=1`
- [ ] Sem as flags, nenhum aviso novo aparece no console
- [ ] As duas flags estão documentadas fora do código

## Arquivos

`public/js/fparms.js` · `public/js/game.js` · doc de flags
