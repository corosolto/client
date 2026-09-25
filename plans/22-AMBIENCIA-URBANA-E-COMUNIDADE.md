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
| Pipa voando (animação) | fy_lajes (12 pipas estáticas de 2 tris, `map_lajes_authored.js:957-975`) | sway/deriva senoidal no `update` do builder (precedente: `map_parque.js:368-373`; `game.js:6931` já chama `world.update`) | sonda: pipa se move, não atravessa laje |
| Helicóptero | mapas de favela (lajes, corrego, escadao, quebrada) | model 3D + rota em órbita alta, rotor animado | visível do chão, som ambiente opcional |
| Avião com faixa de praia | mansão do Joá (fy_mansao); cabe no balneário (plans/18) | model 3D + travessia reta + faixa `PlaneGeometry` com `CanvasTexture` (padrão `signTex`) | texto da faixa legível, tema praia/Joá |
| Pombas voando | vários | o `pigeon_flight.glb` existia e voava, mas era **arte estática de asas abertas** — removido na frente D a pedido do dono. Volta só com pássaro riggado de verdade (não existe CC0; rig Mint é humanoid-only) | régua de voo com flap visível |
| Ratos, gatos, fauna urbana | todos os mapas | pipeline Quaternius da frente D (gato/galinha/vaca entregues em `v21/d-fauna`) | AR/AM existentes + espécie por bioma |

## Estado medido pela sondagem (19/08, contra a base 7125566)

Três achados da sondagem **já estão resolvidos nas branches v21 aguardando integração** —
não reabrir: (1) gato/galinha/vaca e ambience nos 14 mapas → frente D (`v21/d-fauna`,
AR1-5 verde); (2) jacaré/capivara GLB no córrego → frente B (`v21/b-corrego`, BUG-57);
(3) preload de fauna com lista vazia → frente D. Achados que seguem ABERTOS em qualquer
branch: céu fotográfico ausente em 6 mapas, `makeHorizon` sem call-site vivo (o único
está no `map_lajes.js` morto — deletar, plans/13), helicóptero/avião inexistem, som
ambiente por mapa não existe, 7 mapas sem `low: LOWQ` na fauna.

**"Mapas da comunidade" = mapas de FÃS (decisão do dono, 19/08).** Hoje não existe
nenhum (`map_json.js`, o loader de mapa-como-dado, tem zero mapas registrados). Então o
ciclo tem duas pernas: (1) **preview v2 de mapa existente** — o dono escolheu
**`fy_campomorro`** como primeiro (pior arte com folga — MATERIAL 1/5 no audit,
*"precisa ser estruturado visualmente como o lajes"*, campo sem um tufo de mato);
(2) **habilitar mapas de fãs** — o pipeline `map_json.js` (issue #210) é o habilitador:
quando a v2 do campomorro provar o padrão de arte, o mesmo padrão vira o contrato de
qualidade para mapa da comunidade externa.

## Tabela de lore × ambiência (sondagem 19/08 — tabela completa em `docs/lore-mapas.md`)

> Resumo do encaixe por mapa; a série de assets detalhada (5-10 por mapa, com call-site)
> está no relatório da sondagem e em `docs/lore-mapas.md`.

| Mapa | Lore/tema | Prioridade de encaixe |
|---|---|---|
| fy_lajes | comunidade carioca 2 camadas — **a régua visual** | pipa animada, helicóptero, horizonte de morro, caixa d'água nova |
| fy_corrego | favela SP sobre córrego — *"o mais brasileiro"* | grama de margem (lote E ✓), água com onda (frente B ✓), varal GLB, helicóptero |
| fy_escadao | escadaria Selarón genérica + caveirão | helicóptero (lore perfeita), azulejo variante, cabos com catenária, caramelo |
| fy_campomorro | campo de várzea + galpão do baile — **pior arte** | **preview v2 primeiro**: mato no campo, material muro≠chão≠galpão, bandeirinhas |
| quebrada | rua do baile SP | captura 3:2 (dívida), varal, letreiros de comércio, helicóptero |
| fy_mansao | ultra-luxo Joá | avião-faixa, oceano vivo, gaivota (fauna 2), heliponto do spec |
| posto_treta | rodovia + greve | urubu circling, faixa GREVE, céu golden hour |
| upa_24h | pronto-socorro indoor | painel de senha animado, TV da espera, ventilador de teto |
| obras_prefeitura | canteiro eterno | placa "PREVISÃO: 2031", gancho do guindaste com sway |
| atacadao_treta | galpão atacado | empilhadeira, painel de oferta, céu |
| loja_h | varejista greco-romana | bandeiras com sway, TV animada, urubu no poste |
| ferro_velho | cânion de sucata | urubu pousado, gancho com sway, captura do cânion |
| praca_poderes | Brasília em sítio | avião comercial alto, bandeira com sway, espelho d'água vivo |
| piscina_treta | homenagem fy_pool_day (sem tema BR, decisão) | boia.glb (órfão no acervo!), placas de clube, pomba→rato indoor |
| parque_treta | parque de diversão | pipa (parque+pipa=BR), balão perdido, quiosque aberto |
| velho_oeste | faroeste de madeira | urubu no saloon, cavalo, tumbleweed cruzando a rua |
| penitenciaria | presídio | holofote varrendo o pátio, varal de uniforme, bola de basquete |

## Réguas novas (Lei 1 — antes de gerar)

- **Céu vivo**: todo item da tabela acima tem sonda node que o vê mover (mutante congela
  → vermelho). Estende a família AM do `ambience-check` ou vira `eval:sky-ambience`.
- **Lore-cobertura**: todo mapa do registro tem linha na tabela de lore com ao menos um
  encaixe aprovado (mutante: mapa sem linha → vermelho).
- Por asset: `FONTE.md` + SHA + `asset-review` (já vigente da frente E).

## Vida de cena (dono, 19/08 — segunda leva literal)

> *"ate ter outros personagens third tipo veios no bar jogando domino, jogando sinuca,
> os buildings serem entraveis com bar, quiosques, restaurantes, lanchonetes etc, cena
> comuns do dia-dia animais urbanos como gatos, cachorros, papagaio, com audio inclusive,
> pombos, ratos, baratas, tatu"*

O precedente que prova o valor: a galinha do cs_italy é o mapa mais lembrado da
franquia — vida de cena é o que separa "arena" de "lugar".

**Lote vida 1 — fauna urbana 2 + áudio ambiente (o sistema que não existe).**
A sondagem mediu: zero som ambiente por mapa (`public/audio/game/` só tem tiro/faca/
killstreak; `audio.js` sem hook de ambiente). Sistema novo: loop posicional por cena
(balada do bar, rádio de obra, chuva) + one-shot aleatório por bioma (latido, galo,
pássaro, panela). Fonte **CC0 com FONTE.md** (Pixabay/Freesound), nunca rip. Fauna 2:
tatu e barata (Mint 3D + locomoção procedural rasteira, padrão do rato); papagaio de
poleiro (Mint + balanço procedural de cabeça/corpo — pássaro riggado não existe CC0, a
dívida da pomba; poleiro não precisa de voo). Régua: hook de áudio por mapa (mutante
silencia → vermelho) + espécie por bioma estendendo AR4.

**Lote vida 2 — NPCs de cena (third, não-jogáveis).** O pipeline já existe: 62
personagens GLB animados + rig Mint humanoid. Cena 1: véios do dominó no bar (sentado +
gestos idle + mesa GLB); cena 2: sinuca. Sem clipe custom no início — sentado/idle do
acervo já vende; régua: NPC reage a tiro próximo (abaixa/olha — mutante manequim →
vermelho), nunca bloqueia rota de combate (colisor nonSolid + fora do circuito A*).

**Lote vida 3 — buildings entráveis (1 por mapa, com playtest do dono).** Interior muda
gameplay (ângulo, camper, rota) — por isso um por vez: piloto 1 bar do escadão, piloto
2 quiosque do parque. Réguas vigentes estendidas junto: anti-trap (o interior entra no
flood), circuito, largura de porta ≥ corpo, spawn fora de sólido. Nunca em lote fechado.

## Sequência

1. Sondagem de lore (read-only) → `docs/lore-mapas.md` + esta tabela preenchida. ✔
2. Lote céu: pipa animada (lajes), helicóptero (favelas), avião-faixa (mansão).
3. Lote fauna 2 + vida 1 (áudio ambiente): continua a frente D.
4. Água viva (plans/23 RC2): Joá → **córrego** (pedido explícito 19/08) → Brasília →
   piscina.
5. Preview v2 do fy_campomorro (após RC1+RC4 do plans/23).
6. Vida 2 (NPCs de cena) e vida 3 (entráveis), nessa ordem, um piloto por vez.
7. Série de assets por mapa, na ordem da tabela.

## Vetos herdados (não se negociam)

- Régua antes do conserto; mutante que morde; figura gerada e OLHADA; quem constrói não
  dá a nota.
- Nada com copyright, nada de pessoa real, nada de writer/grife real (linha editorial).
- Mint só 3D/rig; 2D só OpenRouter. Fauna prefere CC0 (Quaternius) antes de geração paga.
- Merge só com `check:fast` sem vermelha nova + playtest do dono por frente.
