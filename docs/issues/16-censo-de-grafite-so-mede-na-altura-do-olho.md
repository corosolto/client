# O censo de grafite só mede na altura do olho

**Dificuldade:** fácil · **Área:** arnês / arte · **Tempo:** ~2 h

## Contexto

`tools/eval/graffiti-census.mjs` é a régua que diz quanto de parede tem tinta em cada
mapa. Ela atira 16 raios por waypoint — mas todos na **mesma altura**:

```js
const EYE = 1.6;                       // linha ~72
const oy = (nd.y !== undefined ? nd.y : 0) + EYE;
```

Como os raios são horizontais, **toda placa nasce em y ≈ 1,6 m**. A dedupe até tem o eixo
Y na chave (`Math.round(h.point.y / CEL)`), mas ele nunca varia, então a régua mede
*cobertura na altura do olho*, não cobertura de parede.

Consequência concreta: a passada (`public/js/graffiti_pass.js`) pinta em **três faixas de
altura**, e a de empena (4,2–7,6 m) é invisível para a régua. Ninguém sabe se ela está
cobrindo bem, mal ou nada — e "87,1% na Quebrada" é um número mais estreito do que
aparenta.

## O que fazer

1. Trocar `EYE` por uma lista de alturas (sugestão: `[1.6, 3.2, 5.0]`) e iterar.
2. Conferir que a chave da placa já separa por altura — ela separa, `CEL` é 1,5 m, então
   1,6 / 3,2 / 5,0 caem em células diferentes. **Não mexer na chave.**
3. Reportar a cobertura **por faixa**, além do total: uma parede pichada só até 2 m é um
   resultado diferente de uma pichada até o telhado, e hoje os dois dão o mesmo número.
4. Reajustar as metas de `META` (linha ~56) com o número novo medido, e **escrever no
   comentário por que a meta mudou** — meta que muda sem motivo escrito vira meta que
   ninguém respeita.

## Critério de aceite

- [ ] `npm run eval:grafite` reporta cobertura total **e** por faixa de altura
- [ ] O total de placas sobe nos 5 mapas (mais alturas = mais parede medida)
- [ ] As metas do `META` são reescritas com o número medido e o porquê
- [ ] Rodar duas vezes seguidas dá o mesmo número (a régua é determinística)

## Arquivos

`tools/eval/graffiti-census.mjs`
