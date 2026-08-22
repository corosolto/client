# Handoff visual e jogável — Lajes R26 (16/08/2026)

Trabalhe em `/Users/ruben/game`, branch `feat/times-e-mapas-completo`. Tudo está
**não commitado**; não reverta sujeira alheia e não faça commit sem autorização explícita
do Ruben. Leia `AGENTS.md`, `docs/LICOES.md`, `STATUS.md`, `KNOWN-BUGS.md` BUG-54 e
`plans/10-LAJES.md` antes de tocar no mapa. O operacional está em
`scratchpad/PROMPT-pipeline2.md`.

## Veredito mais recente do dono — esta é a verdade vigente

> "visualmente o mapa está incrivel. esta muito proximo do que queriamos"

O salto visual foi aprovado. Não volte ao mapa cinza/low-poly, não troque a arquitetura
por caixas e não gaste a próxima rodada recalibrando cor/exposição. As screenshots 3:2 do
teste estão em:

- `/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.13.26 (2).png`
- `/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.13.13 (2).png`
- `/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.12.51 (2).png`
- `/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.12.43 (2).png`
- `/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.10.13 (2).png`

O que funcionou no pixel: densidade de fachadas, tijolo/reboco/zinco, fiação emaranhada,
varais, pipas, pombos, ratos, silhueta da comunidade vista das lajes e atmosfera geral.
Pombos e ratos foram elogiados nominalmente. Preserve isso.

## O que ainda reprova — palavras e sintomas do dono

1. *"o mapa ta em boxes procedurais eu atiro pra frente e bate tiros no ar"*.
2. O layout ficou confuso: a proposta precisa ser legível como duas estratégias — dominar
   as lajes ou atacar pelo circuito inferior — sem depender do minimapa para descobrir.
3. *"tem um ponto que eu ficava caindo pra cima da laje de novo e depois no chao tem um
   bug ali"*.
4. *"nao da pra saber os limites do mapa"*; vários becos parecem passagem e estão
   bloqueados.
5. No chão, o empilhamento não corresponde à construção real: módulos parecem suspensos,
   apoiados no vazio ou empilhados sem continuidade de fachada.
6. Caixas d'água ainda leem low-poly e bordas das lajes continuam quadradas.
7. Falta o cachorro caramelo. Não há modelo de cachorro em `references/glb/` nem em
   `public/models/ambient/`; precisa nascer pelo pipeline de asset, com procedência.

## Causas encontradas no fonte — não chamar de conserto ainda

- `public/js/map_lajes_authored.js:128-137`: `addBox()` adiciona caixas invisíveis
  `MAT.proxy` aos `occluders`. `public/js/game.js:2923-2928` faz o hitscan exatamente
  contra essa lista. A bala encontra a caixa inteira mesmo quando o GLB mostra porta,
  janela ou vão. É a causa direta mais forte do tiro no ar.
- `map_lajes_authored.js:321-337`: `groundHeightAt(x,z)` ignora `yRef`.
  `_updatePlayer` passa `p.pos.y` em `game.js:4857-4882`, mas Lajes sempre escolhe o teto
  dentro do footprint. Isso explica a subida térreo→laje durante a queda.
- `map_lajes_authored.js:194-219`: cada segmento do beco ganha duas caixas proxy
  independentes. Nos cotovelos e ramais elas podem se cruzar e fechar passagem. Ainda é
  preciso localizar os pares exatos com uma sonda que use `_collide` real.
- `map_lajes_authored.js:491-511` desenha casario além de `bounds` x ±15,5 / z −39..39.
  O jogador vê continuidade, mas `game.js:4465-4467` o prende num clamp invisível.
- Os portões verdes existentes medem o grafo declarado, encaixe de tábuas e reachability
  de níveis; nenhum compara bala/proxy com a superfície visual nem anda o térreo camada a
  camada. O defeito é da régua, não do relato.

## Primeiro entregável da próxima sessão: régua vermelha

Antes de corrigir, estenda/crie uma régua específica de Lajes que:

1. em navegador, carregue os GLB e compare o primeiro hit do proxy com o primeiro hit da
   arquitetura visível numa grade de raios a altura de peito; diferença grande ou proxy
   sem superfície visível reprova;
2. caminhe o térreo chamando o `_collide` de produção e confirme um circuito contínuo entre
   as três escadas, sem becos que parecem abertos e acabam em caixa invisível;
3. consulte o mesmo footprint com `yRef=0` e `yRef=5.2`, depois use um mutante que ignora
   `yRef` para reproduzir o salto de camada;
4. prove que toda aproximação aos `bounds` termina em obstáculo visível antes do clamp;
5. gere screenshots 3:2 no nível do jogador, não só overview/mapview.

Mutantes mínimos sugeridos: `occluder-caixa-inteira`, `ignora-yref`,
`ramal-fechado` e `limite-invisivel`. Não afrouxe gates existentes.

## Direção de correção depois da régua

- Separe colisão de corpo de oclusão de bala. Proxies simples podem continuar para o corpo,
  mas a bala/LOS precisa raycastar as malhas visíveis do `PropBatch` e pisos/degraus reais.
- Faça Lajes escolher a superfície alcançável pelo `yRef`, preservando a laje quando a queda
  vem de cima e o térreo quando o corpo já está abaixo.
- Redesenhe o negativo do térreo: um loop principal inequívoco, ramais curtos e três retornos
  verticais. Feche saídas falsas com fachada, portão de zinco, desnível ou obra visível.
- Garanta apoio até o chão nas casas vistas por baixo. Nada de volume grande suspenso em
  coluna fina ou fachada que começa no segundo pavimento sem estrutura.
- Depois de estabilizar os bugs, mas ainda nesta mesma rodada: trocar caixa d'água por GLB
  com tampa/frisos/PVC, quebrar bordas de laje com fascia/bevel/remendo, corrigir todos os
  apoios/empilhamentos vistos do térreo e gerar o cachorro caramelo animado. O mapa não
  fecha sem esses quatro entregáveis.

## O comentário do Claude — auditado contra esta árvore

Use como backlog, não como diagnóstico da R26:

- `du -sh dist/client` mediu **779 MiB em 16/08**, portanto a dívida de distribuição é real
  e maior que os 469 MB citados.
- Já existem medidores: `tools/studio.mjs` e `tools/eval/gl-metrics.mjs` medem frame time,
  FPS e `renderer.info`. A frase “não existe medição” está desatualizada.
- O renderer já usa ACES no caminho simples e AgX custom no composer
  (`main.js:56-90`, `bloom.js`), e Three r160 já entrega saída sRGB por padrão. A imagem
  aprovada desta rodada não autoriza mexer nisso sem A/B do jogo e do vídeo publicado.
- Já existe IBL HDR procedural + PMREM em `game.js:1192-1254` e SSAO half-res em
  `bloom.js`. Não implemente de novo.
- KTX2 ainda é dívida válida; LUT e lightmap por mapa podem ser investigados depois de
  medir custo/benefício. A luz assada já foi o caminho visual aprovado em rodada anterior.

## Estado honesto

O mapa atingiu a direção visual de favela pela primeira vez, mas **não está pronto**.
BUG-54 fica aberto até o dono testar: bala atravessa os vãos corretos, queda não troca de
camada, circuito inferior é jogável e limites são visíveis. Nota externa anterior 7,2/10
avaliou screenshots, não esses comportamentos; ela não fecha o bug.
