# 22 - AMBIÊNCIA URBANA TOTAL + V2 DOS MAPAS DA COMUNIDADE

> Escrito em 19/08/2026 contra `feat/times-e-mapas-completo` @ `7125566`, com as frases
> **literais** do dono. Continua o ciclo da v2.1 (plans/13): o up visual dos mapas
> existentes agora vira **vida de ambiente por lore** + **série de assets por mapa**.

## As frases que definem o ciclo

> *"temos que gerar mais animais tambem como caramelo e models de ambiencia pra todos os
> mapas, levante o lore de todos os mapas, e encaixe ambiencias"*

> *"por exemplo o lajes tem pipa mas nao tem animacao do pipa voando, podemos por
> helicoptero, aviao com faixa da praia, no caso da mansao do joa, pombas voando, ratos,
> gatos, enfim tudo isso do ambiente urbano"*

> *"uma coisa que eu queria gerar tambem e ver os mapas da comunidade e tentar regerar e
> melhorar a arte dele, talvez um preview de uma v2 dos mapas feito pela comunidade, e ai
> uma serie de assets que faz sentido pra cada mapa, desde buildings, objetos, etc, todos
> com o tema brasileiro"*

E a regra de ferramenta que passa a valer para todo o repo (já no `AGENTS.md`):

> *"vamos por uma regra no repo pra usar o mint so pra rig e assets 3d"* — arte 2D
> (pixo, grafite, cartaz, textura gerada) sai pelo OpenRouter (`tools/gen-image.mjs`).

## Princípio estrutural: lore antes do asset

A lição do BUG-57: jacaré e capivara ficaram um ciclo inteiro gerados, otimizados e
**sem call-site** — acervo órfão é dinheiro parado. Então a ordem desta vez é:

1. **Levantamento de lore por mapa** (tabela viva neste plano, preenchida pela sondagem):
   tema, bioma, época/referência, o que já tem de ambiência, o que falta.
2. **Tabela de encaixe** mapa × vida (fauna, céu, props) — cada asset nasce com o
   call-site declarado ANTES de gerar.
3. Geração em lotes, cada lote com régua + mutante + figura olhada + `FONTE.md`/SHA.
4. Crítico adversarial `asset-review` por lote — quem constrói não dá a nota.

## Vida de céu (a lista literal do dono)

| Item | Onde | Técnica | Régua |
|---|---|---|---|
| Pipa voando (animação) | fy_lajes (já tem pipa estática) | model 3D + path/sway procedural, sem rig | sonda: pipa se move, não atravessa laje |
| Helicóptero | mapas de favela (lajes, corrego, escadao, quebrada) | model 3D + rota em órbita alta, rotor animado | visível do chão, som ambiente opcional |
| Avião com faixa de praia | mansão do Joá (fy_mansao) | model 3D + travessia reta + faixa com texto | texto da faixa legível, tema praia/Joá |
| Pombas voando | vários | **BLOQUEADO**: não existe pássaro riggado CC0 (dívida FONTE.md fauna); rig Mint é humanoid-only | só entra com asset animado de verdade |
| Ratos, gatos, fauna urbana | todos os mapas | pipeline Quaternius/Mint da frente D | AR/AM existentes + espécie por bioma |

## Mapas da comunidade — v2 em preview

- **Nunca substituir direto.** Cada v2 nasce como PREVIEW (branch/worktree próprio),
  com captura 3:2 antes×depois; o dono aprova jogando.
- Por mapa: série de assets com sentido local (buildings, objetos, props) — todos com
  tema brasileiro e procedência (`FONTE.md` + SHA).
- O inventário de quais mapas são "da comunidade" e o estado de arte de cada um entra
  na tabela de lore (sondagem 1).

## Tabela de lore × ambiência (preenchida pela sondagem, 19/08)

> Viva: a sondagem preenche; cada linha ganha call-site antes de qualquer geração.

| Mapa | Lore/tema | Ambiência atual | Encaixe proposto | Call-site |
|---|---|---|---|---|
| (a preencher por `docs/lore-mapas.md`) | | | | |

## Réguas novas (Lei 1 — antes de gerar)

- **Céu vivo**: todo item da tabela acima tem sonda node que o vê mover (mutante congela
  → vermelho). Estende a família AM do `ambience-check` ou vira `eval:sky-ambience`.
- **Lore-cobertura**: todo mapa do registro tem linha na tabela de lore com ao menos um
  encaixe aprovado (mutante: mapa sem linha → vermelho).
- Por asset: `FONTE.md` + SHA + `asset-review` (já vigente da frente E).

## Sequência

1. Sondagem de lore (read-only) → `docs/lore-mapas.md` + esta tabela preenchida.
2. Lote céu: pipa animada (lajes), helicóptero (favelas), avião-faixa (mansão).
3. Lote fauna 2: mais animais por bioma (continua a frente D).
4. Preview v2 do primeiro mapa da comunidade (o pior ranqueado na sondagem de arte).
5. Série de assets por mapa, na ordem da tabela.

## Vetos herdados (não se negociam)

- Régua antes do conserto; mutante que morde; figura gerada e OLHADA; quem constrói não
  dá a nota.
- Nada com copyright, nada de pessoa real, nada de writer/grife real (linha editorial).
- Mint só 3D/rig; 2D só OpenRouter. Fauna prefere CC0 (Quaternius) antes de geração paga.
- Merge só com `check:fast` sem vermelha nova + playtest do dono por frente.
