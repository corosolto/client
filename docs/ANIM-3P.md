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

### Dados já disponíveis para remotos

O segmento interpolado fornece velocidade lateral no referencial do corpo. Eventos `hit`
e `kill` usam a diferença entre posições de vítima e autor; sem autor, a morte preserva
o fallback sem direção. Se o evento chegar depois do snapshot de morte, acrescenta a
direção sem reiniciar o clipe; um `kill` atrasado não anima corpo já vivo após respawn.
Trocas de arma entre snapshots disparam saque procedural breve,
sem tocar no protocolo; o overlay é omitido no LOD distante e cancelado na morte.
O suporte da arma é reorientado após o saque, antes do IK da mão de apoio.
O backend só emite `hit` não fatal para vítima humana; bots remotos não recebem flinch.
Mesmo para humanos, `hit` pode ser descartado sob carga. `npm run eval:remotos3p`
mede as entradas e seus mutantes; não substitui a inspeção visual do corpo.

O arnês `charvideo.html?remote=1&wpn=ak` expõe `REMOTEVID.init`, `snapshot`, `event`,
`step`, `view`, `state` e `grab`. `snapshot` recebe entidades e lotes de eventos;
para morte, envie `alive: false` no mesmo snapshot do `kill`. `step` avança o relógio
sintético. O arnês usa GLBs reais e não simula socket, HUD, áudio nem sangue.

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

### Braço no ombro (10/11): rigs Studio com o joint do braço no punho

Com pistola, Clóvis, Bebezão, Coronel e Boneca da Cristaleira abriam os braços em T nos packs
0.2.0/0.2.1, e o overlay acima não mudava nada (`?porte1h=0` dava a mesma imagem). Nos nós do
GLB (bind) o joint `*Arm` tinha nascido quase no punho: clavícula 0,28–0,45 m contra braço de
0,06–0,09 m (razão clavícula/braço 3,9–7,5; legado ≤ 0,87, outros Studio ≤ 2,16). A malha do
braço pesava no `*Shoulder`, o clipe girava um toco de 6 cm e o +50° do overlay girava o braço-T
em torno do próprio eixo.

O client chegou a compensar com uma mira da clavícula no porte de 1 mão (89 dos 93 corpos com
braços bit a bit iguais; elevação ombro→mão 85–92° → 47–49°), com `IK_L_SKIP` e arma inicial
de uma mão. O conserto de verdade veio no rig: os packs 0.2.2 desses quatro têm o ombro na axila
e o cotovelo no meio (razão 0,7–2,1), e a compensação saiu do `glbchars.js`. Com o rig novo, a
palma L no guarda-mão (idle de jogo) mede 5,3 cm no Clóvis (shotgun) e 3,1 cm no Bebezão (lmg),
que voltaram às armas originais e ao IK. O Coronel mede 10,3 cm com a md97 e segue com pistola e
em `IK_L_SKIP`.

Bebê Reborn: a palma do `idle1h` dela nasce na altura do pescoço, e a faixa vizinha do perfil
do tronco pegava a cabeça de boneca (raio 0,37 m contra 0,09–0,13 do tronco). O empurrão
`TP_CLEAR` era de 0,152 e tirava a pistola da palma. Com `TORSO_SEM_CABECA` (pescoço/cabeça fora
do perfil, só nela) o empurrão vai a 0. O Saci também mudaria (0,094 → 0 com a mp5), mas legado
não muda; os outros 92 corpos ficam com empurrão idêntico.

Gate: `npm run eval:porte-braco:browser` (`tools/eval/porte-braco-browser.mjs`, precisa de
`STUDIO_PACK_ROOT`; sem ele sai 78, NÃO MEDIDO). PB1 `BRAÇO-T` exige que a mão da pistola saia
do ombro para baixo ou para a frente (piso 0,075 da cadeia; os T mediam −0,02…0,05, o pior corpo
são, esbirro, 0,10). PB2 `FOLGA` limita o empurrão a 0,12. PB3 `JUNTA` reprova rig com
clavícula/braço > 3 (maior hoje: 2,16). Mutantes `junta-no-punho` (PB3) e `torsocabeca` (PB2).
Imagens antes/depois: `private-assets/porte-1h-fora-do-ar-20261110/`.

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

**Dívida, não perdão.** Os casos restantes estão em `DIVIDA` dentro da régua, visíveis no
veredito: personagem NOVO que quebrar reprova o CI; entrada da lista que for consertada e não
removida também reprova ("dívida paga: tire da lista"). A lista encolhe, nunca cresce escondido.
Os três antigos casos de tremor (`lobisomem`, `mariabonita`, `lampiao`) passaram na medição de
09/11/2026 após a revisão do idle de faca e saíram da lista. Exceção de CORPO (não de defeito)
também é declarada com motivo: `dollynho`, `gotinha`, `et`, `canarinho` — mascotes.

A fila de revisão, com o que cada um quebra hoje:

| Personagem | Cláusula | Medida | Caminho de conserto |
|---|---|---|---|
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

## Estados extras com pack compartilhado (09/11/2026)

**Decisão de custo:** um único `public/models/anims/extras.glb` (526.696 bytes, 21 clipes),
carregado uma vez no primeiro strafe/back, recarga, saque, hit, granada, faca ou cerimônia.
Não há `models/anims/<id>/<extra>.glb`: multiplicar os 21 estados pelo elenco repetiria o mesmo
esqueleto. `index.json.extras` é derivado dos nomes dentro do GLB; `extras.SOURCES.md` guarda os
IDs do catálogo. `draw_pistol` e `holster_pistol` não existem na biblioteca convertida e caem no
comportamento atual sem erro. Falha ou ausência de qualquer outro clipe também usa o fallback
procedural/base; o primeiro saque fica pendente e é reproduzido quando o pack resolve. A granada pedida
antes do pack também fica pendente: guarda o fim do arremesso no relógio do mixer e, quando o pack chega,
toca em fase com ele (EX7b: 0,2 s corridos → clipe começa em 0,2 s e termina em 1,05 s). Se faltam
≤0,1 s ou o arremesso já acabou, não toca; morte, revive, recarga nova e cerimônia descartam o pendente.
LOD≥2 não inicia extras.

O `ctrl.update` deriva o componente frente de `speed`, `back` e `lateral`, percorre quatro setores
(frente→direita→trás→esquerda) e mistura os DOIS clipes vizinhos pelo ângulo. Cardinals ficam com
peso 1; diagonais usam pesos complementares. Velocidades naturais medidas no catálogo: strafe rifle
1,5304 m/s, walk-back 0,8707 m/s, run-back 3,8261 m/s, strafe pistola ≈1,8 m/s, walk-back pistola
1,1644 m/s. `strafe_*_pistol` e `walk_back_pistol` entram em armas de uma mão; a faca tem
`knife_idle` e `knife_stab`, nunca o `shoot` de rifle quando o clipe existe.

Recarga, saque/guarda, hits, granada e golpe usam clipes filtrados no load: `Hips`, pernas, pés e
dedos do pé saem das tracks; `Spine*`, ombros, braços, mãos, pescoço e cabeça ficam. Assim a
locomoção continua dona das pernas. O IK de apoio e os overlays procedurais antigos são suspensos
somente enquanto a camada correspondente está ativa; sem clipe eles continuam sendo o fallback.
`knife_idle` é a exceção medida: fica apenas em `neck`/cabeça sobre `idle1h`, porque usar
braços/coluna do take derrubou a postura de 32 rigs; com a máscara restrita, 63/63 voltaram a
passar fora da dívida e os três casos antigos de tremor foram baixados. `ctrl.grenade(1.05)` preserva a janela de `ANIM_ARREMESSO`. Na troca de arma o corpo novo executa
`holster_rifle` curto (0,45 s) seguido de `draw_rifle` (0,65 s): não ficam duas malhas sobrepostas.
`ctrl.ceremony(vitoria)` usa corpo inteiro e é chamado por `_cerimoniaCorpos` nos dois fins de
rodada locais; o worker de rede pode chamar o mesmo método sem conhecer o pack.

### Medição compartilhado × retarget por personagem

Comando: `tools/retarget-glb.mjs` para os 21 clipes, depois
`studio-work/animation-conversion-20261109/tools/characters/rig-pose-test.mjs --samples=8`
nos cinco rigs Blender. Relatórios: `csbrasil/local/estados-extras-3p-20261109/`.
Teto: corpo/costas 3,5×, mãos 2,5×, seams 5 mm.

| Rig | Compartilhado pior corpo | Retarget pior corpo | Mãos L/R finais | Resultado |
|---|---:|---:|---:|---|
| capitao-caveira | 3,194× | 3,194× | 1,216/1,363× | passa |
| nanica | 2,866× | 2,866× | 2,284/2,365× | passa |
| dama-creepy | 3,146× | 3,146× | 2,078/1,868× | passa |
| coronel-arrego | 2,682× | 2,682× | 1,943/2,682× | mão R 2,682×: residual |
| teletreco-sinal-fraco | 2,261× | 2,261× | 1,377/1,454× | passa |

Os deltas compartilhado×retarget foram **zero** nos cinco relatórios iniciais: gerar packs por
personagem não melhora esses clipes. Gauntlet limitado a 3 rodadas: `knife_stab` na dama foi
4,201× → 3,985× (troca de take) → 2,249× no corpo (retirar Head/neck, que o aim já controla);
`reload_pistol` caiu de mão R 2,547×/2,744× para 1,127×/1,137× em nanica/coronel ao deixar o
punho dominante com o clipe-base. Residual após a 3ª rodada: `knife_stab` ainda mede mão R 2,682×
no coronel (teto 2,5×), sem vantagem do retarget individual. Não foi afrouxado teto nem criado
pack específico para esconder esse caso.

A régua runtime é `npm run eval:estados3p` (EX1–EX11, 23 cláusulas), incluída no `check:fast`. Ela usa os GLBs e
`AnimationMixer` reais e prova: uma só requisição lazy, strafe e diagonal, pernas idênticas ao
controle durante recarga andando, quatro direções + cabeça, holster→draw, faca, granada 1,05 s,
vitória/derrota (e que a vitória segura 30 quadros parado, sem o idle voltar por cima) e LOD/fallback.
EX4c/EX4d cobram o overlay procedural do flinch quando o clipe de hit não está tocando: segundo hit em
LOD 2 depois de um hit com clipe, e hit cujo clipe é trocado pela recarga dentro da janela de 0,18 s
(`_hitClip` passa a seguir o clipe dono do trem superior em `_playUpper`/`_stopUpper`).
EX10a–e sobem o `Game` real (posto_treta, barbudo × capitão) com o `CharController` espionado no
protótipo e disparam as transições: `_damage` no bot e no jogador (flinch com direção, dano/100 e
cabeça), `_throwNade` (grenade 1,05), troca de arma do jogador e `_syncRemoteWeapon` do bot (draw no
corpo novo) e `_endRound` (ceremony false no perdedor, true no vencedor). Mutantes: `strafe-mudo`,
`reload-perna-congelada`, `hit-sem-direcao`, `saque-mudo`, `faca-usa-rifle`, `vitoria-muda`,
`cerimonia-vira-idle`, `flinch-preso-no-hit`, `granada-perdida-lazy` e oito que reescrevem `game.js` e têm de reprovar só a cláusula EX10/EX11 do ponto alterado:
`jogo-flinch-mudo`, `jogo-flinch-sem-cabeca`, `jogo-granada-muda`, `jogo-saque-tp-mudo`,
`jogo-saque-bot-mudo`, `jogo-cerimonia-muda`, `jogo-cerimonia-invertida`, `bot-strafe-espelhado`.
EX11 anda o bot do single-player 2 m/s para cada lado pelo `_updateBot` real (posição e yaw
roteirizados): a lateral chega +2,00 à direita com `strafe_right` e −2,00 à esquerda com
`strafe_left`. Antes o bot projetava em +X local e trocava os dois lados (−2,00 → `strafe_left`
andando à direita), invertendo também a inclinação de strafe, que lê o mesmo valor.

Caminho de clipe e fallback procedural são medidos separados, nunca como alternativa aceita nem
por flag forçada. Em `eval:tpanim3p`, AN1/AN2/AN6 rodam num corpo de outra instância de
`glbchars.js` (`?sempack=1`, pack nunca resolvido no laço síncrono; a cláusula exige 0 quadro com
clipe) e AN12/AN13 medem `reload_*` e `hit_*` com o pack carregado num corpo em LOD 0 (13 partidas
medidas: recarga leva a mão 21,4–38,5 cm e a cabeça 3,6–45,6 cm; hit leva a cabeça 4,8–49,6 cm; tudo
volta a ≤0,27 cm). Mutantes `reload-sem-clipe` e
`hit-sem-clipe`. `eval:tp-world-contract` separa `[reload]` (clipe, RC1 com reloadK 0) de
`[reload-procedural]` (módulo com `extras.glb` ausente). `eval:mprecuo` e `eval:tpbackpedal`
exigem o clipe dominante autoral com o pack (`run_back`, `strafe_*`) e cobram o fallback sem pack
em cláusulas próprias; o remoto do MP e o bot do single-player recebem a lateral com o sinal do jogador local
(`strafe_right` anda para −X local do corpo, medido pelo deslize do pé de apoio).
