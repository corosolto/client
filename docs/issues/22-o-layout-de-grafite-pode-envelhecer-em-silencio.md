# O layout de grafite pode envelhecer em silêncio

**Dificuldade:** média · **Área:** automação / arnês · **Tempo:** ~3 h

## Contexto

A colocação do grafite dos 5 mapas é **assada**: `public/js/graffiti_layout.js` guarda
~3.400 retângulos, gerados por `npm run grafite`, que roda a passada num navegador de
verdade (é o único lugar onde os GLB existem). O jogo só monta a geometria pronta, em 6 ms
— sem isso o build de mapa custaria 9 s.

O preço desse ganho está escrito no cabeçalho do `graffiti_pass.js`: **layout velho é peça
no lugar errado**. Mexeu na geometria de um mapa e não regerou? A tinta continua colada
onde a parede estava ontem. E nada no portão percebe: `npm run check` não roda navegador,
e `decal-probe` roda em node, onde nenhum GLB carrega.

Hoje isso depende de alguém lembrar de rodar `npm run grafite`. Memória de pessoa não é
mecanismo.

## O que fazer

1. Um job de CI (precisa de navegador — ver `tools/eval/graffiti-census.mjs`, que já usa
   playwright) que:
   - sobe `npm run eval:serve`;
   - roda o gerador num arquivo TEMPORÁRIO, não no versionado;
   - **compara** com `public/js/graffiti_layout.js` e falha se divergir.
2. A comparação tem que ser por CONTEÚDO, não por bytes: o gerador arredonda em 3 casas e
   ordena por hash, então a saída é determinística — mas confirme isso rodando duas vezes
   antes de confiar. Se não for, o achado É a issue.
3. Rodar só quando o diff toca `public/js/map_*.js`, `graffiti_pass.js` ou `textures.js` —
   é caro (~40 s por mapa) e não faz sentido em PR de documentação.
4. A mensagem de falha manda rodar `npm run grafite` e commitar.

**Alternativa mais barata, se o job ficar caro demais:** um hash das entradas (geometria
declarada dos mapas + pools + bandas) gravado no próprio layout, e uma régua que só
compara o hash. Perde precisão, custa milissegundos. Escreva no comentário qual dos dois
você escolheu e por quê.

## Critério de aceite

- [ ] Rodar o gerador duas vezes no mesmo commit dá saída idêntica (determinismo provado)
- [ ] Com o layout atual, o job passa
- [ ] Mexer numa coordenada de parede de mapa sem regerar faz o job falhar
- [ ] O job não roda em PR que não toca mapa nem passada

## Arquivos

`.github/workflows/ci.yml` · `tools/gen-graffiti-layout.mjs` · `public/js/graffiti_layout.js`
