# As réguas que precisam de navegador estão fora do portão

**Dificuldade:** média · **Área:** automação / CI · **Tempo:** ~3 h

## Contexto

`npm run check` é o portão: syntax, áudio, ctfhud, vm, invariants, kick, botsim. **Todas
rodam em node.** As réguas que precisam de navegador ficaram de fora, e não é por descuido
— elas exigem servidor no ar e playwright:

- `npm run eval:grafite` — cobertura de parede pintada (a que mediu 12,7% na Quebrada)
- `npm run eval:select` — o balão da tela de seleção
- e o próprio `npm run grafite`, que gera o layout

O problema é que **o que roda em node é cego para o que os GLB fazem**. Foi exatamente
isso que deixou 238 decalques morrerem em silêncio: `decal-probe` jurava 334 peças porque
em node os barracos não carregam. Uma classe inteira de defeito não tem portão.

## O que fazer

1. Um job separado no CI (`portao-browser`), com `npx playwright install chromium`,
   subindo `npm run eval:serve` em background.
2. Rodar `eval:grafite` e `eval:select`, e falhar com base nas metas que as próprias
   réguas já declaram (`META` no `graffiti-census.mjs`).
3. **Não** juntar com o `check` de node: o portão rápido tem que continuar rápido. Este é
   o portão lento, e pode rodar só na `main` e em PR que toque mapa/personagem.
4. Guardar as capturas como artifact quando falhar — número diz que caiu, imagem diz por quê.

## Critério de aceite

- [ ] O job passa no estado atual da `main`
- [ ] Baixar uma meta do `META` de propósito faz o job falhar com a mensagem certa
- [ ] O `npm run check` de node continua com o mesmo tempo de hoje
- [ ] Falha anexa captura

## Arquivos

`.github/workflows/ci.yml` · `package.json` · `tools/eval/graffiti-census.mjs`
