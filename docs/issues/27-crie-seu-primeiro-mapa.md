# Crie seu primeiro mapa no Construtor da Treta

**Dificuldade:** fácil · **Área:** conteúdo / mapas · **Tempo:** ~1 h

## Contexto

Mapa neste repo sempre foi código — geometria à mão em `public/js/map_*.js`, o
trabalho de maior alavancagem e o mais arriscado de revisar. Agora existe o formato
**mapa como dado** (`public/js/map_json.js`) e um editor visual, o **Construtor da
Treta** (`public/construtor.html`): você desenha a arena no navegador e exporta um
JSON que o jogo constrói sem nenhum código novo.

Esta tarefa é a porta de entrada: fazer **uma arena jogável** do zero e provar que ela
passa na régua do formato. Não exige tocar em `public/js/*.js`.

## O que fazer

1. `npm run dev` e abra `http://localhost:4321/construtor.html`.
2. Desenhe uma arena **simétrica** (os dois times precisam das mesmas chances):
   - spawns A e B em lados opostos, 2 a 4 de cada;
   - cobertura espalhada (caixas) — nenhum corredor reto de spawn a spawn;
   - se for captura, 3 bandeiras **não colineares**;
   - 1 ou 2 armas no chão, alcançáveis;
   - opcional: uma **rampa** até uma **plataforma** (`walkable`) e uma zona de **água**.
3. A validação no painel tem que ficar **verde**. Se ficar vermelha, o próprio texto diz
   o que corrigir (grafo desconexo, spawn fora da área, rampa íngreme demais).
4. **Baixar .json** e salvar o arquivo no PR (em `docs/issues/exemplos/` ou anexado à
   descrição).
5. Rode a régua do formato no arquivo exportado e cole a saída no PR.

## Critério de aceite

- [ ] O `.json` exportado existe no PR
- [ ] `node tools/eval/mapjson-check.mjs` adaptado ao seu arquivo sai **verde** (grafo
      conexo, arestas bidirecionais, spawns na área jogável, rampas subíveis)
- [ ] A arena é simétrica e, se CTF, tem 3+ bandeiras não colineares
- [ ] Uma captura de tela do **Pré-ver 3D** do editor

> Registrar o mapa no menu (`maps.js`) **não** é escopo desta issue — isso liga o quality
> gate completo (`map-check`, `botsim`) e o espelho de `src/data/jogo.ts`. Aqui o
> objetivo é dominar o formato e o editor. Ver
> [Construtor de mapas](../docs/construtor-de-mapas.md).

## Arquivos

Nenhum de código — só o seu `.json`. Leitura: `public/construtor.html`,
`public/js/map_json.js`, `docs/docs/construtor-de-mapas.md`.
