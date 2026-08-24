# Pega de arma no rig (Blender) — receita replicável

> **Feito em:** 2026-08-23 · **Personagem-piloto:** `mandrake` · **Arma-piloto:** `pistol`
> **Objetivo:** montar, à mão no Blender, a pega correta de uma arma no rig do personagem
> (mão de lado envolvendo o cabo, cano pra frente), extrair os **números exatos** e
> deixar registrado pra replicar em outras armas e outros personagens.

Este documento é a régua da tarefa: quem replicar num segundo par (arma/personagem) tem
que chegar nos mesmos passos e nos mesmos tipos de número. Se um passo não bater, é sinal
de que o rig do novo par diverge — e isso é informação, não erro.

---

## 0. Contexto do rig (o que fez a coisa dar trabalho)

- O corpo do personagem vem em `models/characters/<id>.glb` (malha + textura + skin).
  O **rig do jogo** tem 24 ossos (Hips/Spine/…/RightHand), **sem ossos de dedo**.
- O rig usado aqui pra AUTORAR a pega veio do `Flair.fbx` (Mixamo, 65 ossos **com dedos**:
  `mixamorig:RightHandIndex1..3`, `Middle`, `Ring`, `Pinky`, `Thumb1..3`). A malha do
  mandrake dentro do FBX é a **mesma** (6129 verts, UV idêntico) — por isso deu pra aplicar
  o material texturizado nela e ver a pega com textura.
- **Escala:** o FBX Mixamo entra com `scale = 0.01` → o personagem fica com **1,7 cm**.
  Normalizar `Armature.001.scale = 1.0` deixa ele em **1,7 m** (bate com as armas e com o
  jogo). **Sempre normalize a escala antes de medir/posicionar qualquer coisa.**
- **Convenção de eixos** (personagem em pé): forward do personagem = **-Y**, up = **+Z**.

### Gotcha crítico do viewport (custou tempo, anota)
Esconder o esqueleto pelo **`hide_viewport`** (ícone monitor) **desliga a avaliação da IK**
e **congela a deformação do mesh** numa pose antiga — parece que "perdeu a pega", mas os
dados estão certos. Regras:
1. Com rig que usa **IK**, **asse a IK em FK** antes de esconder (`pose.visual_transform_apply`
   + remover as constraints de IK).
2. Pra esconder os ossos sem quebrar, use o **"olho" (`hide_set`)**, nunca o monitor.
3. Se o mesh congelar mesmo assim: **entrar e sair do Modo de Edição** do mesh força o
   recálculo do modifier (destrava na hora).

---

## 1. Passo a passo (o que foi feito, em ordem)

1. **Importar** `models/characters/mandrake.glb` (corpo+textura) e o `Flair.fbx` (rig+anim).
   Aplicar o material `Material_1` (texturas: `texture_0` albedo 1024, `mandrake_normal`,
   `mandrake_metalrough`) na malha skinada do rig Mixamo (`char1.001`). UV é idêntico.
2. **Normalizar escala** do rig: `Armature.001.scale = (1,1,1)` → personagem 1,7 m.
3. **Pose do braço** (uma mão, pistola): alvos de **IK** (empties) nas mãos + constraint de
   IK de 2 ossos em cada antebraço.
   - Mão direita (do gatilho): alvo à frente, ~altura do ombro → `(-0.05, -0.42, 1.24)`.
   - Mão esquerda (apoio, relaxada no quadril) → `(0.17, -0.05, 0.92)`.
4. **Roll da mão** direita: girar `mixamorig:RightHand` **+90° no eixo Y local** → a normal
   da palma sai de "pra baixo" (-Z) pra "de lado, pra dentro" (+X). Sem isso a palma fica
   pra baixo e a arma "deitada".
5. **Curl dos dedos** (formar o punho em volta do cabo) — rotação por falange no eixo X
   local (polegar no eixo Z local). Ângulos usados (graus):
   | dedo   | seg1 | seg2 | seg3 |
   |--------|------|------|------|
   | Index  | 38   | 45   | 35   |
   | Middle | 62   | 70   | 55   |
   | Ring   | 64   | 72   | 58   |
   | Pinky  | 60   | 66   | 52   |
   | Thumb  | 28   | 34   | 26   |
   > Index é o dedo do gatilho: fecha menos que os outros três.
6. **Assentar a arma** (o passo que "prende" a arma na mão):
   - Medir na malha da pistola o **centro do cabo** (backstrap): vértices do terço traseiro
     em X **e** metade inferior em Z → centroide `grip_hold`.
   - Medir o **centro do punho**: centroide das bases dos dedos (`*1` das 4 fingers).
   - Posicionar a arma de modo que `grip_hold` caia no centro do punho, cano em **-Y**,
     topo do slide em **+Z**, escala pro tamanho real (`CFG.pistol.len = 0.26 m`).
   - Ajuste fino pedido pelo dono: puxar a arma **+3,5 cm em Y** (pra trás, sentido oposto
     ao cano) pra o cabo assentar mais fundo, encostando no "V" do polegar.
7. **Assar IK→FK** e salvar a pose como Action **`pistol_aim_R`**.

---

## 2. Números extraídos (a saída reutilizável)

> Estes são os números que replicam a pega. O **mount** é o mais importante: é o transform
> da arma no espaço LOCAL do osso da mão — mesmo formato do mount procedural do jogo
> (`glbchars.js`, `handBone.add(mount)`).

### Mount da PISTOLA (local a `mixamorig:RightHand`)
```
loc   (m)   = (0.0389, 0.1186, 0.0095)
rot   (deg) = (-84.85, -8.58, -98.66)   # Euler XYZ
scale       = 0.2098
```

### Roll da mão direita
```
mixamorig:RightHand.rotation_quaternion = (0.7071, 0, 0.7071, 0)   # 90° em Y local
```

### Curl dos dedos (graus) — ver tabela no passo 5.

### Alvos de IK (mundo, personagem 1,72 m, forward -Y)
```
RightHand target = (-0.05, -0.42, 1.24)
LeftHand  target = ( 0.17, -0.05, 0.92)   # apoio no quadril (pose de 1 mão)
```

---

## 3. Como replicar

### Outra ARMA, mesmo personagem
1. Importar o GLB da arma (`models/weapons/<id>.glb`), escalar pra `CFG.<id>.len` (weapons.js).
2. **Rifle (2 mãos):** manter o mount da mão direita no cabo e **adicionar a mão esquerda**
   no guarda-mão (ponto `gripPoints(id).fore` — já existe no jogo). No Blender, um 2º alvo
   de IK na mão esquerda, no guarda-mão.
3. **Pistola/revólver (1 mão):** reusar direto os números da seção 2; só re-medir o
   `grip_hold` na malha da arma nova (o cabo muda de lugar).
4. Re-medir só o que muda: `grip_hold` (centro do cabo na malha) e a escala (`CFG.len`).
   Roll da mão e curl dos dedos **não mudam** por arma do mesmo tipo.

### Outro PERSONAGEM
- Se o outro personagem usa **o mesmo rig Mixamo** (mesmos nomes de osso), os números da
  seção 2 valem **iguais** — mão e dedos são função do rig, não do corpo.
- Se o rig diverge (proporção de braço/mão diferente), o **mount** e o **curl** valem, mas
  os **alvos de IK** mudam (a mão nasce em outro lugar). Re-rodar o passo 3.
- Personagens de "braço-toco" (Dollynho, ET, Canarinho, Gotinha): a palma nasce dentro do
  corpo — ver o tratamento que o jogo já faz (`torsoProfile`/`measurePalmLocal` em
  `glbchars.js`) antes de assumir que a pega "bugou".

---

## 4. Ligação com o sistema do jogo (não reinventar)

O jogo **já resolve arma-na-mão** proceduralmente; esta pega manual é a versão "à mão" do
mesmo conceito. Pontos de conexão:

- `weapons.js → gripPoints(id)`: `grip` (mão direita) e `fore` (mão esquerda no guarda-mão,
  `null` p/ 1 mão). `ONE_HANDED = {pistol, deagle, revolver38, knife}`.
- `glbchars.js → buildCharacterModel`: monta a arma no `RightHand`, IK da mão de apoio
  (`solveCCDIK`), curl dos dedos. **É o caminho da 3ª pessoa (bots).**
- `fparms.js → poseToWeapon`: braços dedicados de 1ª pessoa (`models/fparms/arms.glb`,
  **sem ossos de dedo**), travados na arma por IK a cada frame.

> **Implicação p/ 1ª pessoa:** o rig de braço FP (`arms.glb`) é diferente do Mixamo (não tem
> dedos). O que transfere direto é o **mount** (arma↔osso da mão) e a **orientação da pega**;
> o curl dos dedos não (dedos já vêm fechados na malha do `arms.glb`).

---

## 5. Câmera 3ª pessoa no jogo (implementado)

**Tecla `B`** alterna 1ª/3ª pessoa. Arquivo: `public/js/game.js`.

Como funciona (reusa o que já existia):
- O corpo 3ª pessoa do jogador é o **mesmo `buildCharacterModel` dos bots** (`glbchars.js`)
  — a arma monta na mão pelo grip procedural (mount no `RightHand` + IK da mão de apoio +
  curl dos dedos). Nada de pose nova: é o mesmo caminho que já funciona pros bots.
- Métodos: `_toggleCamView` / `_ensurePlayerTP` (lazy build + upgrade box→GLB + rebuild ao
  trocar de arma) / `_updatePlayerTP` (posição+yaw do jogador, locomoção pela velocidade,
  crouch, mira da cabeça pelo pitch, câmera atrás).
- Visibilidade: em 3ª pessoa esconde `vm.root` (braços+arma FP) e mostra o corpo TP.
- Pré-carrega o modelo do personagem do jogador no construtor (a 1ª pessoa usa `arms.glb`,
  não carrega o corpo), senão o TP cai no box.

**Limitação declarada do V1:** mira/tiro continuam saindo da CÂMERA → em 3ª pessoa a origem
do disparo fica atrás do jogador. É um **modo de visão**, não de combate. Corrigir depois:
desacoplar a origem do tiro (olho) da câmera de render.

**Como testar:** entrar numa partida, apertar **B**. Esperado: câmera vai pra trás e aparece
o mandrake segurando a pistola (o mesmo grip dos bots). Apertar B de novo volta pra 1ª pessoa.
Se o corpo aparecer virado de costas, é só o offset de yaw — trocar `p.yaw` por `p.yaw+Math.PI`
em `_updatePlayerTP`.

## 6. Próximos

- [x] Pega da pistola no mandrake (3ª pessoa, à mão) — números na seção 2, Action `pistol_aim_R`.
- [x] Toggle de **câmera 3ª pessoa** pro jogador (tecla B, reusa `buildCharacterModel`).
- [ ] Aplicar o mount à pistola na **1ª pessoa** (tunar `fparms.js`: offset/rot por arma).
- [ ] Tiro correto em 3ª pessoa (origem no olho, não na câmera).
- [ ] Replicar p/ rifle (2 mãos) e demais personagens.
