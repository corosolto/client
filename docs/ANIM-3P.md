# Animação 3P: recarga visível e inclinação lateral

Decisões e números dos overlays de tronco do `CharController` (`public/js/glbchars.js`).
A régua é `tools/eval/tp-anim3p-check.mjs` (`npm run eval:tpanim3p`).

## O problema (levantado em 21/10/2026)

O controlador 3P era sólido no que tinha — 11 clipes, crossfade de 0,16 s, histerese
walk/run, `timeScale` anti-deslize (medido: bot a 4,14 m/s com `run@1,97×`), IK de mão de
apoio, pitch de cabeça em malha fechada. Mas duas leituras que o jogador precisa fazer no
corpo do outro não existiam:

1. **Recarregar era invisível.** Não há estado `reload`, não há `reload.glb` no acervo dos
   ~45 personagens (confirmado no manifesto `public/models/anims/index.json`), e `game.js`
   nunca avisava o controlador. Em 1ª pessoa o jogador vê a própria recarga; a do inimigo,
   não — e "ele está recarregando" é janela de push num FPS.
2. **Strafe não existia.** Movimento lateral tocava o `run` frontal: corpo de frente,
   deslizando de lado. Clipe lateral autoral custa 1 clipe × ~45 personagens — decisão de
   custo que segue aberta; o que entrou é a leitura barata: inclinação de peso.

## O que entrou

### Recarga procedural (`ctrl.reload(dur)`)

Sem clipe novo. Sobre o clipe corrente (parado ou andando), na janela da recarga:

- **tronco mergulha** 0,20 rad (Spine02) + 0,10 rad (Spine01) em torno da DIREITA do corpo
  em espaço de mundo — medido na régua: cabeça vai ~10–12 cm à frente e 1–4 cm abaixo no
  pico, e volta a <0,5 cm da origem;
- **mão esquerda vai ao pente** pelo MESMO `solveCCDIK` da mão de apoio, com alvo
  interpolado do guarda-mão para o ponto do pente (abaixo e atrás do fore grip, no espaço
  da arma). Medido: 15–21 cm de curso, distância ao pente cai pela metade, retorno
  <1 cm. Arma de 1 mão: alvo no coldre (quadril direito), mesmo solver.

A duração é a da tabela de armas (`WEAPONS[w].reload`), o mesmo relógio que devolve a
munição — os dois terminam no mesmo quadro, como o GUNFEEL já faz na 1ª pessoa.
`game.js` chama `ctrl.reload` no `_startReload` do jogador em 3ª pessoa e nos DOIS
caminhos de recarga de bot (clássico e NN).

### Lean lateral (6º argumento de `ctrl.update`)

`update(dt, moving, hasTarget, speed, back, lateral)`: `lateral` é a velocidade no eixo da
DIREITA do corpo (R̂ = F̂×Ŷ, F̂ = (−sin yaw, −cos yaw)). O tronco inclina até 0,12 rad,
suavizado a 8/s, proporcional a `lateral/4,5`. Medido: 3,5 m/s lateral desloca a cabeça
~5 cm no eixo da direita; sem lateral volta a <0,5 cm; corpo morto não inclina.
Jogador 3P e bots clássicos alimentam; caminho NN segue sem (flag de laboratório).

## As duas armadilhas que a régua existe para impedir de voltar

- **Undo ANTES do mixer.** O overlay usa deltas aditivos em ossos que os clipes podem ou
  não animar. Se o delta do quadro anterior for removido DEPOIS do `mixer.update`, ele é
  subtraído de uma pose de clipe NOVA (que nunca o carregou) e o novo delta só repõe o que
  o undo tirou — efeito líquido zero a partir do 2º quadro. Foi exatamente o primeiro bug
  desta implementação, reproduzido quadro a quadro antes do conserto.
- **Eixo em espaço de MUNDO via quadro do pai.** Os rigs doados têm convenção de eixo
  própria (eixo do osso é Y); girar em torno de X/Z locais produzia ~0,4° onde se
  esperava 9°. O delta é construído no quadro do pai a partir do eixo de mundo do grupo e
  aplicado com `premultiply` (rotação no espaço do pai, não do osso).

## Segunda rodada: o que mais o corpo passou a dizer

| Lacuna | O que entrou | Medido na régua |
|---|---|---|
| Levar tiro não movia nada | `ctrl.flinch(dir, forca)`: cede na direção do disparo por 0,18 s (AN6) | cabeça desloca 13–18 cm e volta a <0,3 cm |
| Agachado atirando era estátua (`shoot()` saía cedo no crouch) | recuo aditivo de 0,12 s sem trocar de clipe (AN7) | 2,4 cm de recuo mantendo a pose `crouch` |
| No ar o clipe acabava e o corpo voltava a CORRER | `setAr()` segura a pose de salto e amortece 0,14 s no pouso (AN8) | estado `jump` no ar, `crouch` no pouso |
| Giro instantâneo (manequim girando) | quadril atrasa até 0,61 rad e alcança a ~3,2/s (AN9) | 0,48 rad de atraso após giro de 2 rad, alcança em 0,01 |
| Mira vertical só na cabeça | coluna assume 45% do `aimPitch` (teto 0,35 rad) | cabeça percorre 9 cm com `aimPitch` 0,5 |
| Todo mundo caía igual | `die(dir)` enviesa o tombo pela direção do tiro | tombo medido em 1,4 m de deslocamento |
| Bot longe custava o mesmo que perto | LOD: 20 Hz acima de 25 m, 10 Hz acima de 45 m, IK e malha de cabeça desligadas (AN10) | 17 chamadas contra 120 em 2 s |

O LOD é o item que paga no celular: com 8 bots, a maior parte deles passa o tempo longe da
câmera, e cada um custava mixer + IK de mão + malha fechada de cabeça a 60 Hz.

## Fallbacks declarados (AN5)

Todo personagem do manifesto tem os 8 clipes base. Os opcionais (`idle1h`, `walk1h`,
`walkfire`) faltam hoje apenas em `ue2`, que cai nas variantes de duas mãos por design do
`OPT_STATES`. A régua reprova qualquer personagem novo sem base E qualquer encolhimento
silencioso do conjunto de opcionais fora da lista registrada.

## Fora de escopo, declarado

Morte segue sendo o clipe `death` a 1,8× (sem ragdoll — escolha estilística vigente).
Strafe com clipe autoral e pitch de torso na mira continuam abertos como decisão de custo.
