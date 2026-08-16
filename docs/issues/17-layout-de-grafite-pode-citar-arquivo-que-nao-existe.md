# O layout de grafite pode citar arquivo que não existe mais

**Dificuldade:** fácil · **Área:** build / arte · **Tempo:** ~40 min

## Contexto

`public/js/graffiti_layout.js` é gerado e guarda, por mapa, uma lista `arquivos` com
**nomes de PNG** e ~3.400 peças que apontam para essa lista por índice.

`npm run assert:assets` (`tools/eval/assets-check.mjs`) já confere que todo arquivo do
`DECAL_FILES` existe no disco. **Falta o outro lado:** que todo nome citado pelo LAYOUT
ainda exista no `DECAL_FILES`. Se alguém tirar um decalque do pacote, o layout continua
citando o nome, e `aplicarGrafite` cai neste caminho:

```js
if (i === undefined) { console.warn('[grafite] layout cita "' + nome + '", que saiu do pacote'); continue; }
```

Ou seja: um `console.warn` que ninguém lê e peças que somem da parede sem nenhum portão
reclamar. É a mesma classe de defeito que fez o dono ver parede pelada enquanto a régua
antiga jurava 334 peças.

## O que fazer

1. Em `tools/eval/assets-check.mjs`, importar `GRAFITE` de
   `public/js/graffiti_layout.js` e, para cada mapa, conferir que todo nome de
   `arquivos` está em `T.decalFiles` (ou, se começar com `poster:`, em `T.posterFiles`).
2. Falhar com contagem e exemplos, dizendo o conserto: **regerar com `npm run grafite`**.
3. Contar também quantas PEÇAS seriam perdidas, não só quantos arquivos — "1 arquivo
   faltando" e "1 arquivo faltando = 458 peças" pedem urgências diferentes.

## Critério de aceite

- [ ] `npm run assert:assets` passa no estado atual
- [ ] Tirar um nome do `DECAL_FILES` que o layout usa faz o comando sair 1
- [ ] A mensagem diz quantas peças seriam perdidas e manda rodar `npm run grafite`

## Arquivos

`tools/eval/assets-check.mjs` · lê `public/js/graffiti_layout.js`
