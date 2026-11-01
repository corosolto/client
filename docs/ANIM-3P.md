# Animação 3P: recarga, locomoção e travessia

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
| No ar o clipe acabava e o corpo voltava a CORRER | `setAr()` segura a pose de salto; no mantle, `setMantle(f)` amarra o tempo do clipe ao progresso físico e amortece 0,14 s no pouso (AN8) | estado `jump` no ar, sombra abre no salto, `crouch` no pouso |
| Giro instantâneo (manequim girando) | quadril atrasa até 0,61 rad e alcança a ~3,2/s (AN9) | 0,48 rad de atraso após giro de 2 rad, alcança em 0,01 |
| Mira vertical só na cabeça | coluna assume 45% do `aimPitch` (teto 0,35 rad) | cabeça percorre 9 cm com `aimPitch` 0,5 |
| Todo mundo caía igual | `die(dir)` enviesa o tombo pela direção do tiro | tombo medido em 1,4 m de deslocamento |
| Bot longe custava o mesmo que perto | LOD: 20 Hz acima de 25 m, 10 Hz acima de 45 m, IK e malha de cabeça desligadas (AN10) | 17 chamadas contra 120 em 2 s |

O LOD é o item que paga no celular: com 8 bots, a maior parte deles passa o tempo longe da
câmera, e cada um custava mixer + IK de mão + malha fechada de cabeça a 60 Hz.

### Mantle com progresso físico (28/10)

`Espaço + direção` diante de uma beirada aprovada por `_mantleTarget` agora cria uma
travessia de 0,30 a 0,44 s no mesmo `_moveEntity` usado pela predição local e pelo servidor.
O corpo sobe antes de avançar, pousa apenas no apoio que a trava anti-exploit já validou e
devolve `grounded` no último quadro. O controlador 3P recebe `mantleF` e percorre o clipe
de pulo no mesmo relógio; a sombra de contato lê `_ar`, não o flag transitório `jumping`.

A régua funcional continua sendo `npm run eval:mantle` (alcance, beiradas e território).
`npm run eval:mantle-fluidez` adiciona o contrato visual: 18 a 28 quadros a 60 Hz, no máximo
0,18 m por quadro, subida antes do avanço e mutante que volta a teleportar.

## Fallbacks declarados (AN5)

Todo personagem do manifesto tem os 8 clipes base. Os opcionais (`idle1h`, `walk1h`,
`walkfire`) faltam hoje apenas em `ue2`, que cai nas variantes de duas mãos por design do
`OPT_STATES`. A régua reprova qualquer personagem novo sem base E qualquer encolhimento
silencioso do conjunto de opcionais fora da lista registrada.


## Porte de 1 mão (23/10): o clipe `idle1h` não é porte, é oferta

O dono mandou três capturas do `esquerdomacho` na tela de seleção: os dois braços
esticados à frente, as mãos juntas e abertas, a pistola flutuando na ponta dos dedos na
altura do queixo. Medido no mesmo caminho do `pvSetChar`, **não é defeito de personagem**:
o `padati`, que `select-mount.mjs` usa como referência APROVADA desde 04/08, tem a mesma
pose. O `idle1h`/`walk1h` do acervo é assim para todo mundo — e por isso nenhuma régua
reprovava: os tetos eram ancorados em personagens com o mesmo defeito.

Trocar o clipe custa re-autoração nos 63 corpos. O que entrou é overlay de MUNDO sobre o
clipe, o mesmo mecanismo da recarga e do emote (`glbchars.js`, bloco `PORTE DE 1 MÃO`):

| Osso | Delta | Efeito |
|---|---|---|
| `RightArm` | +50° no eixo DIREITA do corpo | desce o braço do horizontal |
| `RightForeArm` | −50° no mesmo eixo | fecha o cotovelo e traz a arma para o peito |
| `LeftHand` | CCD IK no quadril −0,19/−0,06/+0,02 m | tira a mão esquerda da frente da arma |

O alvo da mão esquerda sai do QUADRIL, não de uma altura absoluta: com alvo fixo o
`cadequinha` (baixo) media a mão acima do próprio quadril. Mascote de braço-toco
(`IK_L_SKIP`) fica de fora, pela mesma razão que já pula o guarda-mão de 2 mãos.
A camada só entra em `idle1h`/`walk1h`; recarga e dança mandam mais que ela. `?porte1h=0`
desliga; `?porte1h=50,-50` faz A/B.

Os primeiros valores testados (65°/−60°) ficavam melhores na foto do esquerdomacho, mas o
censo de postura (ver seção seguinte) mostrou o custo: em 7 rigs (mst, et, esbirro, padati,
rapper, dama, deputado) a mão caía ATRÁS do plano do corpo. 50°/−50° é o ponto que zera
esses casos mantendo a arma no peito.

Dois corpos ficam FORA do overlay, declarados em `P1H_SKIP` (glbchars.js): `canarinho` e
`bonzo`. O delta de braço balona a malha deles — o select-inflate passou a reprovar com o
overlay ligado — e o clipe cru, mesmo esticado, lê melhor. Conserto real é re-rig; a
exceção mora no código com nome e motivo, e o porte deles segue na dívida do contrato.

Medido em `esquerdomacho`/`padati`/`raul` no caminho da seleção (desligado → ligado):

| Medida | Antes | Depois | O que significa |
|---|---|---|---|
| `frenteZ` | 0,326–0,389 | 0,215–0,266 | a arma deixou de ser oferecida à frente |
| `maoLArma` | 0,055–0,078 | 0,200–0,304 | a mão esquerda saiu de cima da arma |
| `palmaY` | 1,22–1,30 | 1,12–1,19 | a arma desceu, do queixo para o peito |

Gate: `select-mount.mjs` ganhou `ESTICADO` (`frenteZ1hMax` 0,28) e `MÃO-L-NA-ARMA`
(`maoLArmaMin` 0,085), ambos com os números acima como procedência, e o mutante
`--mutate=porte1h` desliga a camada e reprova 9 dos 63. Imagens antes/depois em
`private-assets/porte-1h-20261023/`.

**Limite declarado:** 45 dos 63 rigs não têm osso de dedo, então a mão continua ABERTA
sobre o punho da arma. Isso é geometria do rig, não pose — fechar a pegada exige malha
nova, não parâmetro. Armas de 2 mãos não foram tocadas.

## Fora de escopo, declarado

Morte segue sendo o clipe `death` a 1,8× (sem ragdoll — escolha estilística vigente).
Strafe com clipe autoral continua aberto como decisão de custo.

## O contrato de postura (23/10): o padrão que personagem novo tem que cumprir

Pedido do dono: "o problema não é a arma, é o personagem segurando ela — temos que revisar
todos e por um padrão para novos personagens não quebrarem a postura e movimentos".

O censo que define o padrão mediu os 63 GLB × 3 classes de arma (fuzil/pistola/faca) × 4
estados (idle/walk/run/crouch), no caminho FUNCIONAL do jogo (`preview:false`), 120 quadros
por medição de movimento. Arquivo: `private-assets/postura-20261023/censo-63x3x4.json`.

**O que o censo achou antes de qualquer padrão existir:** 19/63 fora da faixa p05–p95 com
fuzil, 24/63 com pistola. E os ângulos 65°/−60° da primeira versão do porte de 1 mão
empurravam a arma ATRÁS do plano do corpo em 7 rigs — o censo pegou a regressão no mesmo
dia, antes do merge. Isso é o padrão pagando por si.

O contrato é `npm run eval:postura` (`tools/eval/postura-check.mjs`), no `check:fast`:

| Cláusula | Regra | Procedência |
|---|---|---|
| PS1 | mão da frente a ≤9 cm (1 mão) / ≤2 cm (2 mãos) da arma | contato é segurar |
| PS2 | arma à frente do plano do corpo (Z > −0,02 alturas) | regressão do porte 65/−60 |
| PS3 | arma ≥3% da altura abaixo da cabeça | corpo humano; mascote: exceção |
| PS4 | arma de 1 mão: mão esquerda ≥5 cm da arma | o defeito das "duas mãos na pistola" |
| PS5 | cotovelo 55°..150° | faixa humana; censo p05=79,8 p95=135,8 |
| PS6 | tremor ≤0,035 alturas/quadro correndo | quem passa mede ≤0,028; reprovados 0,039–0,075 |

**Dívida, não perdão.** O elenco de hoje tem 11 personagens/cláusula fora do contrato. Eles
estão em `DIVIDA` dentro da régua, visível no veredito: personagem NOVO que quebrar reprova
o CI; entrada da lista que for consertada e não removida também reprova ("dívida paga:
tire da lista"). A lista encolhe, nunca cresce escondido. Exceção de CORPO (não de defeito)
também é declarada com motivo: `dollynho`, `gotinha`, `et`, `canarinho` — mascotes.

A fila de revisão, com o que cada um quebra hoje:

| Personagem | Cláusula | Medida | Caminho de conserto |
|---|---|---|---|
| `lobisomem` | PS6 tremor | 0,075 (2× o teto) | clipe compartilhado: re-autorar ou filtrar |
| `mariabonita` | PS6 tremor | 0,039 | idem |
| `lampiao` | PS6 tremor | 0,039 | idem |
| `adjim`, `ancap`, `cadequinha`, `metaleiro` | PS3 arma na altura da cabeça | −0,008..0,017 | pose no rig ou clipe próprio |
| `bonzo` | PS3 + PS5 cotovelo 42° | — | re-rig (o overlay balona a malha dele) |
| `canarinho` | PS5 cotovelo 43° | — | mascote de braço-toco: decisão editorial |
| `marina-silva` | PS4 mão na arma de 1 mão | 0,017–0,046 | pose no rig |

Os três de tremor são os mesmos corpos que o `EMOTES-BR.md` já apontava por dependerem do
pack de animação compartilhado: o tremor está no CLIPE, não no mount — consertar é re-autorar
ou filtrar, e cada um desses caminhos é decisão de custo, não de parâmetro.

## Rodada 31/10 — gauntlet do lote #1171

Histórico e causa dos fixes desta rodada (o código aponta pra cá; comentário inline tem teto de 2 linhas).

- **Teto de frente por corpo — retirado na integração #1188**: o clamp humano da asa do Canarinho e o warm-up dependente de60updates deformavam a pele (P99 0,739/57,9 ruins por10mil arestas). A ablação sem os dois recuperou0,655/33,2. O piso legado `TP_FRONT_MIN`, orientação do mount e solver mundial permanecem. A redução isolada de frenteZ não era aceite suficiente.
- **Curl dos dedos**: a faixa0,55–0,95 rad continua nos demais62corpos. O Zumbi volta à fórmula legada completa: fallback0,5, faixa0,35–0,80 e inclinação0,45/0,06. Na AK de espessura0,189066m, o novo mínimo0,55 elevava P99 para0,685; o mínimo legado0,35 recupera0,655. Limitar só o máximo a0,80 não corrigia esse caso. Não há aprovação de todas as armas/skins por esta medição.
- **Recentro de YAW da cabeça — retirado na integração #1188**: a correção automática de80% alterava a pose autorada e causava onze regressões no roster. A retirada preserva pitch, emotes, atraso do torso e cópia final do proxy de cabeça. O contrato em `visual-consistency/HEAD-YAW.md` passa a proteger a pose autorada com um AnimationMixer independente; não exige recentro artificial.
- **Guarda extra de alcance do IK — retirada na integração #1188**: o wrapper de95% ignorava o offset mundial da palma e puxava para dentro alvos ainda alcançáveis. O teto das referências subia de0,675/23,6 para0,689/28,6. O `solveCCDIK` mantém sua proteção mundial com palma, reserva0,98 e passo angular máximo0,6; as quatro chamadas preservam seus alvos. A retirada não acrescenta limite anatômico de junta.
- **Tint 3P (`TINT_3P`)**: capa do Juiz "esbranquiçada demais" — a textura do robe é clara de fábrica (PBR verde em 74/74). Multiplicador 0x98a3c6 no material da toga; crivo final na contact sheet.
- **Morrer no meio da recarga**: `die()` cancela reload/flinch/lean/pitch. O envelope `reloadK` não era guardado por `dead` e o mergulho do tronco (spine k*0.20 pra trás) continuava sobre o clipe death clampado: o "cadáver se debatendo pra trás" do dono. Medido: reloadK 0 no cadáver.
