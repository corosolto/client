---
id: construtor-de-mapas
title: Construtor de mapas (sem código)
sidebar_label: Construtor de mapas
sidebar_position: 8
description: O editor visual /construtor.html e o formato "mapa como dado" (map_json.js) — crie uma arena jogável, valide na mesma régua do jogo e exporte um JSON pronto para registrar.
---

# Construtor de mapas (sem código)

Mapa aqui sempre foi **código**: cada `public/js/map_*.js` é geometria declarada à mão, e os
maiores rivalizam com os módulos de sistema. O formato **mapa como dado** troca isso por um
**descritor JSON** que o loader `public/js/map_json.js` transforma no mesmo contrato de
world que um `build*()` entrega — colisores, occluders, spawns, bandeiras, pickups, grafo de
waypoints, `groundHeightAt`, `slowAt` e luzes. Você descreve o mapa; o código é um só.

O **Construtor da Treta** é o editor visual desse formato. Abre numa aba, roda a **mesma
régua que o jogo** ao vivo e exporta o JSON. Sem Blender, sem GLB, sem escrever geometria.

## Abra e use

```bash
npm run dev           # http://localhost:4321
# editor: http://localhost:4321/construtor.html
```

O editor é vanilla e zero-build, servido de `public/construtor.html` — o mesmo Three.js
vendorizado do jogo. Fluxo:

1. **Escolha uma ferramenta** (caixa, plataforma, rampa, água, prop, spawn, bandeira, arma)
   e **clique no mapa** para colocar. A ferramenta **Selecionar** move e edita.
2. O **Inspetor** edita cada objeto por número (posição, tamanho, altura, cor, sentido).
3. A **Validação** roda `validatePlan` a cada mudança e mostra em verde ou vermelho — é a
   régua do jogo, não um lint do editor. O **grafo de waypoints** (o que o bot anda) é
   desenhado por cima.
4. **Pré-ver 3D** constrói a cena de verdade com `buildMapFromJSON`.
5. **Baixar .json** exporta o mapa. **Copiar snippet de registro** dá as linhas para
   colocá-lo no menu.

## O formato

A fonte da verdade é o cabeçalho de `public/js/map_json.js`. Em resumo, o descritor tem:

| Campo | O que é |
|---|---|
| `bounds` | semi-eixos `x`/`z`; o interior jogável é `[-x,x] × [-z,z]` |
| `floor` / `walls` | cor do piso; altura, espessura e cor do muro perimetral (gerado, fechado) |
| `boxes` | obstáculo = colisor + occluder. `walkable: true` faz o **topo** virar piso do jogador |
| `ramps` | superfície inclinada andável: `x,z,w,d,rise,dir` (`dir` ∈ `+x -x +z -z`, o lado que sobe) |
| `slow` | retângulos de água/lama — `slowAt` freia quem pisa |
| `props` | GLB decorativo por `id` (`placeProp`); `solid: true` adiciona colisor quando o asset existe |
| `spawns` | `E` e `B`, cada um uma lista de `x,z,yaw` |
| `ctf` | bandeiras `id,label,x,z` — **a quantidade define o alvo da rodada** |
| `pickups` | arma no chão `weapon,x,z` (o `weapon` tem que existir em `WEAPONS`) |
| `waypoints` | `step` e `inset` da grade do grafo de bots |

### Relevo: uma superfície por coluna

`groundHeightAt(x,z)` devolve **uma** altura por ponto — o máximo entre o piso (0), as rampas
e os topos das caixas `walkable`. É de propósito que **não há andares sobrepostos** (mezanino
sobre piso no mesmo `x,z`): isso exige navegação em camadas autorada à mão, como em
`map_havan.js`, e fica fora do formato de dado.

Duas regras práticas que isso cria:

- **Rampa dá elevação de verdade** — bot e jogador sobem. Rampa íngreme demais vira parede
  e a régua reprova (R4): mantenha `rise / comprimento` baixo (o teto é medido em
  `map_json.js`, `RAMPA_GRADE_MAX`).
- **Topo de caixa `walkable` é piso só do jogador** — o bot contorna, como em qualquer mapa
  plano de hoje. Para o bot subir a um patamar, ligue os níveis por **rampa**, não por caixa.

## A régua nasce junto do formato

Nada disso é promessa: o mesmo `validatePlan` do editor roda em node, com mutantes que
provam que ela morde, e há a prova **dentro do motor**:

```bash
npm run eval:mapjson        # R1 conexo · R2 bidirecional · R3 spawn jogável · R4 rampa subível
                            # (+ mutantes grafo/aresta/spawn/rampa/plataforma)
node tools/eval/mapjson-check.mjs caminho/arena.json  # valida o JSON exportado
npm run eval:mapjsonboot    # sobe a arena num Game REAL: relevo e bots navegando (+ mutante relevo)
npm run eval:construtor-input # entradas inválidas falham sem travar; teclado preserva campos de texto
```

`eval:mapjson` está no `check:fast`. O `eval:mapjsonboot` é a prova in-engine — rode ao mexer
no loader ou num mapa com relevo.

`bounds` e o passo dos waypoints precisam ser números finitos e positivos; o `inset`
precisa ficar dentro dos limites do mapa. A validação recusa grades cujo custo estimado
excede o orçamento de navegação antes de alocar nós. Se isso acontecer, reduza a arena
ou ajuste o espaçamento. O erro aparece no editor e na CLI, que sai com código 1.
Delete/Backspace só apagam o objeto selecionado quando o foco está fora de campos editáveis.

## Registrar no menu

O editor exporta um `.json`; o menu precisa de um **módulo-casca de 3 linhas** e **3 linhas de
registro** (o botão **Copiar snippet de registro** gera tudo com os nomes certos):

1. `public/js/map_<id>.js` — importa `buildMapFromJSON`, guarda o `SPEC` (o conteúdo do `.json`)
   e exporta `build<Nome>` + `<ID>_PROPS` (via `propIdsFromSpec`).
2. Em `public/js/maps.js`, três registros: a entrada em `MAPS` (nome, `ctfMode`, `props`), o
   import em `MODULOS` e os nomes de export em `EXPORTS`.

:::caution Registrar liga o quality gate completo
Um mapa no menu é varrido por **todas** as réguas de mapa (`map-check` MAP1-MAP6/CTF1-CTF2,
`botsim`, `spawn-settle`, `pickup-check`) e precisa espelhar em `src/data/jogo.ts` (`MAPAS`) +
`npm run docs` + `npm run check:seo`. É a barreira certa: arena greybox mínima costuma reprovar
na densidade de cobertura (MAP5) antes de reprovar em qualquer outra coisa. Comece pelo
`eval:mapjson`/`eval:mapjsonboot`, que são o contrato do formato, e trate o menu como o último
passo — quando o mapa merece ser jogado por todo mundo.
:::

## Onde isto encaixa

- A **intenção de gameplay** (rotas, cobertura, o que o jogador decide nos primeiros segundos)
  vem antes do editor — a ficha de [Criar mapa usando IA](./criar-mapa-com-ia.md) serve igual
  aqui.
- O formato, a régua e a tabela de conflito de edição estão em [Como colaborar](./colaborar.md).
- Relevo em camadas de verdade (mezanino sobre piso) continua sendo mapa **autorado** em
  `map_*.js` — o formato de dado é para arenas de superfície única, que é a maioria.
