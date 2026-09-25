---
name: csbrasil
description: Pipeline de criação de conteúdo novo para o CS BRASIL — times de personagens, mapas de lugares reais e assets 3D. Use SEMPRE que for criar personagem, time, mapa ou asset novo; para pesquisar referências históricas/visuais de tema brasileiro; para transformar uma ficha em prompt de geração; e para gerar o asset em si. Subcomandos: `spec` (pesquisa e escreve o MD de ficha), `compose` (ficha → referências → prompts), `map` (lugar real → spec de mapa), `generate` (prompt → asset). NÃO use para consertar defeito (isso é a `bug-hunt`) nem para melhorar o que já existe (isso é a `gauntlet-fps`). Toda criação passa pelos 6 portões abaixo — pular portão é o mesmo que não usar a skill.
---

# csbrasil — pipeline de conteúdo novo

Criar coisa nova neste repositório tem o mesmo preço de consertar coisa velha: se não
virou régua e ninguém OLHOU o resultado, não está pronto. Esta skill existe para que
personagem, mapa e asset nasçam já dentro das leis da casa, em vez de serem
rebobinados depois.

Funciona em qualquer agente (Claude, Kimi, OpenCode): a fonte canônica é
`.claude/skills/csbrasil/` (como `bug-hunt` e `gauntlet-fps`), espelhada em
`.agents/skills/` por `npm run skills:sync`. O portão `skills:check`
no `check:fast` reprova se a skill existir aqui e não estiver linkada nos agentes.

## Os subcomandos

### `/csbrasil spec <tema>`

Pesquisa e **escreve a ficha**. Saída: um MD em `plans/` com o marcador
`<!-- spec:time -->` ou `<!-- spec:mapa -->` na primeira linha.

1. Pesquise o tema: história, visual, cultura. Anote a **procedência** de cada fato
   (fonte real, não memória). Referência sem procedência é palpite — lei 2.
2. Verifique os vetos do dono ANTES de escrever: nada de pessoa real contemporânea,
   nada com copyright, nada de gore. Domínio público (autor † há 70+ anos) é livre;
   registre a data de morte na ficha quando for o caso.
3. Cada personagem precisa de **uma mecânica própria** — ninguém é só skin.
4. Scaffold determinístico: `node tools/spec.mjs new time <slug>` ou
   `node tools/spec.mjs new mapa <slug>`.
5. **Portão 1:** `node tools/spec.mjs check <arquivo>` verde.

### `/csbrasil compose <ficha.md>`

Ficha → referências visuais → prompts de geração.

1. Para cada personagem/mapa da ficha, pesquise referências visuais e baixe para
   `references/<slug>/<item>/`, com um `FONTE.md` ao lado dizendo de onde veio cada
   imagem. Imagem sem procedência não entra.
2. Escreva o prompt de geração em `prompts/`, no estilo dos que já existem lá
   (`prompts/GAME.md` dita o tom: qualidade visual primeiro, restrições depois).
3. **Portão 2:** toda referência tem `FONTE.md`; todo prompt aponta para as
   referências que usa.

### `/csbrasil map <lugar real>`

Versão mapa do `spec`: pesquisa o lugar real (plantas, fotos aéreas, street view),
e escreve o spec com layout, cobertura (cover) e linhas de visão. Lugar aberto sem
cover deliberado vira sniper fest — o spec tem que mostrar onde o jogador se esconde
antes de qualquer geometria existir.

### `/csbrasil generate <ficha.md>`

Gera os assets a partir dos prompts, usando o que o projeto já tem:
skill `threejs-3d-generator` (Tripo) ou o Mint MCP. **Não reinvente geração.**

## Os 6 portões (nenhum é opcional)

| # | Portão | Como prova |
|---|---|---|
| 1 | Ficha válida | `node tools/spec.mjs check <arquivo>` verde |
| 2 | Referência com procedência | `FONTE.md` em cada pasta de `references/` |
| 3 | Vetos respeitados | checklist na própria ficha (pessoa real? copyright? gore?) |
| 4 | **Gere a figura e OLHE** | screenshot do asset + descrição do que você VÊ, não do que esperava |
| 5 | **Quem constrói não dá a nota** | skill `asset-review` com contexto limpo aprova |
| 6 | Entrou no jogo, virou régua | invariante/eval novo ou extensão de existente, **com a mutação que a faz ficar vermelha** |

Os portões 4 e 5 são os que custam caro quando pulados — número sem imagem já enganou
este projeto quatro vezes, e agente lendo o próprio resultado lê a justificativa que
construiu, não a imagem.

## O que esta skill NÃO faz

- Não edita `game.js` — integração de asset no jogo segue a tabela de conflito do
  `tools/eval/ARCH.md` (rode `npm run arch` antes).
- Não gera sem ficha. Pedido direto de "gera um Saci" vira primeiro um
  `/csbrasil spec`, mesmo que a ficha saia curta.
