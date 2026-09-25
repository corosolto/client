# P0 — ARMAS E VIEWMODEL

> **Decisão do dono: só arma, estilo Quake/UT. Sem braço nem luva na v2.**
> Isso simplifica muito o plano — os braços (`fparms.js`, 360 linhas, IK que converge em 26/26)
> ficam onde estão, atrás de `?hands=1`, e viram um experimento da v2.1.
>
> Com essa decisão, o problema deixa de ser "como fazer uma mão" e vira três coisas concretas:
> **recoil, enquadramento e animação de arma.** Todas as três já têm código no repo.

---

## 1. Diagnóstico medido

### 1.1 O recoil está 4x acima de qualquer FPS moderno

Simulei o `RecoilAxis(11, 0.5, 0.28, 0.3)` de `game.js:1429` com a cadência real de cada arma,
30 tiros, dt 1/120:

| arma | vmAmp | k pico (1 tiro) | k sustentado | **pitch máx** | pull em Z | z da coronha no pico |
|---|---|---|---|---|---|---|
| ak | 0,90 | 0,77 | 1,36 | **17,1°** | 0,203 m | **+0,023** ⚠ |
| famas | 0,79 | 0,68 | 1,37 | 17,3° | 0,206 m | **+0,001** ⚠ |
| tavor | 0,81 | 0,70 | 1,32 | 16,6° | 0,198 m | **+0,004** ⚠ |
| p90 | 0,68 | 0,58 | 1,29 | 16,3° | 0,194 m | −0,007 |
| awp | **1,70** | 1,46 (1 tiro) | 1,46 | **18,4°** | 0,219 m | **+0,004** ⚠ |
| svd | 0,99 | 0,85 | 1,02 | 12,8° | 0,152 m | −0,026 |
| g3 | 0,95 | 0,81 | 1,35 | 17,0° | 0,202 m | −0,009 |
| lmg | 0,87 | 0,75 | 1,41 | 17,8° | 0,212 m | **+0,033** ⚠ |

`z > 0` significa que a coronha **atravessa o near plane** (0,01 m). Referência: CS2/Valorant
ficam em 2-4° de kick de viewmodel.

**Cinco mecanismos somados:**

1. **Amplitude absurda.** `game.js:3995-3998`: `pos.z += k*0.15`, `rot.x += k*0.22`. Com `k`
   chegando a 1,4 em rajada, isso é 0,21 m de translação e 0,31 rad de rotação.
2. **Pivô errado.** A rotação é aplicada no `vm.root` (`game.js:3996`), cuja origem está em
   `(0.03, −0.23, 0)` — praticamente no olho. A arma está a ~0,52 m dele. `0,30 rad × 0,52 m ≈
   0,15 m` de deslocamento *só da rotação*, somados aos 0,20 m de translação.
   O `springs.js:73-76` já documenta isso: girar fora do grip é "exatamente o que faz a mão
   soltar da arma" (comentário C7).
3. **Snipers batem no teto.** `game.js:2304`: `min(1.7, 0.42 + REC_DEG*0.30)` clampa AWP, Mosin
   e Rem700 em 1,70. O clamp foi calibrado num framing anterior, mais distante.
4. **Bullpups sofrem por geometria.** Em tavor e famas, `gripZ = 0.5` (`weapons.js:53-54`) →
   `back = fwd`. A coronha atrás do grip é a maior do arsenal em proporção. Como o ponto mais
   próximo da lente é a coronha, qualquer pull em Z **explode a projeção da traseira**: no
   famas a coronha vai de 0,205 m para 0,001 m de distância — fator de escala projetada de
   ~200×, antes do clipping.
5. **Acúmulo no full-auto.** `residualShare 0.3` com `residualTau 0.28 s` e cadência 0,09-0,10 s:
   o resíduo não decai entre tiros. `k` sustentado (1,3-1,4) é **quase o dobro** do pico de um
   tiro só (0,7-0,8).

### 1.2 O enquadramento tem um offset que sai da tela

`game.js:371`: `VM_OFF = [0.03, -0.23, 0]`, somado à posição do `vm.root` em `game.js:3995`.

O `_vmFrame` (`game.js:1099-1174`) foi construído para ser **invariante ao aspecto** —
`gy = -gx·tanB` garante isso. Mas o `VM_OFF` é um offset **métrico fixo** somado depois, e a
projeção dele depende do FOV vertical, que muda com o aspecto.

Recomputado, grip e boca em fração de altura de tela:

| arma | grip 16:9 | grip 3:2 | boca 16:9 |
|---|---|---|---|
| ak | (0,748, **0,946**) | (0,748, 0,876) | (0,628, 0,691) |
| tavor | (0,747, 0,922) | (0,747, 0,856) | (0,656, 0,736) |
| p90 | (0,752, **0,991**) | (0,752, 0,914) | (0,662, 0,818) |
| awp | (0,750, 0,966) | (0,750, 0,893) | (0,618, 0,702) |
| **deagle** | (0,760, **1,103**) | (0,760, 1,009) | (0,674, 0,822) |
| **faca** | (0,764, **1,161**) | (0,764, 1,058) | (0,675, 0,932) |

Três leituras:
- Nos rifles o grip está em **0,92-0,99 H** — colado na borda inferior.
- Na **deagle e na faca o grip está FORA da tela** (1,10 e 1,16 H). Elas só aparecem porque a
  parte da frente está mais longe.
- O Δ entre 16:9 e 3:2 no eixo Y é de **0,07**. A invariante VM4 (`invariants.mjs:122-131`)
  exige Δ ≤ 0,03 — e passa **só porque o auditor não aplica `VM_OFF`**. O bug de 3:2 que você
  matou no GAUNTLET 2.0 voltou pela porta dos fundos.

### 1.3 A trava de borda manda, não o `recuoZ`

`game.js:1143-1148` limita quão largo a coronha projeta (`nearX = 1.05`, `vmattach.js:394`).
Medido em 16:9:

| arma | classe | back | fwd | Zg final | **a trava mordeu?** | gx |
|---|---|---|---|---|---|---|
| ak | rifle | 0,240 | 0,393 | 0,420 | **sim** | 0,282 |
| m4 | rifle | 0,230 | 0,375 | 0,401 | **sim** | 0,269 |
| **tavor** | rifle | 0,259 | 0,259 | **0,453** | **sim** | 0,303 |
| **famas** | rifle | 0,274 | 0,274 | **0,478** | **sim** | 0,320 |
| g3 | rifle | 0,283 | 0,390 | 0,494 | **sim** | 0,331 |
| shotgun | shotgun | 0,288 | 0,432 | 0,503 | **sim** | 0,337 |
| svd | sniper | 0,238 | 0,424 | 0,417 | **sim** | 0,279 |
| p90 | smg | 0,168 | 0,206 | 0,370 | não (minz) | 0,248 |
| awp | sniper | 0,181 | 0,465 | 0,396 | não (minz) | 0,265 |
| deagle | pistol | 0,065 | 0,151 | 0,284 | não (minz) | 0,190 |

Em **10 de 18** armas, o `Zg` é decidido pela trava. Mexer em `recuoZ` nelas não faz efeito.
E note a inversão: **TAVOR (0,453) e FAMAS (0,478) ficam mais LONGE que a AK (0,420)**, sendo
armas mais curtas — porque `back` é grande. Elas parecem pequenas e distantes.

`tanH` é **0,670 uniforme nas 6 classes** (`vmattach.js:407-412`); só variam `roll` e `minz`.
Não existe classe `bullpup`: tavor e famas estão em `'rifle'` (`vmattach.js:425-426`).

### 1.4 Não existe uma única animação de arma

**Zero clipes.** Não há `AnimationMixer` no viewmodel — o único mixer do repo é o do corpo FP
(`fparms.js:233`), congelado num tempo fixo. Tudo é procedural:

| animação | existe? | onde | qualidade |
|---|---|---|---|
| sway | sim, simplificado | `game.js:3945` | decaimento `1 - dt*7`, sem mola |
| walk bob | sim | `game.js:3946-3949` | Lissajous 1:2, ok |
| recoil | sim | `game.js:3944, 3995-3998` | ver §1.1 |
| reload | **1 grau de liberdade** | `game.js:3927-3941` | `reloadDip` sobe/desce. Sem queda de carregador, sem ferrolho, sem fases |
| draw | sim, com bug | `game.js:3984` | divisor fixo em 0,28 mas `DEPLOY` da AWP é 0,45 → **`drawF ≈ 1,6`**, y −0,35, rx −0,9 |
| holster | **não** | — | troca de malha instantânea (`game.js:2116`) |
| pickup | **não** | `game.js:4151` | reusa o draw |
| inspect | **não existe** | grep "inspect" em game.js: **0 ocorrências** | — |
| idle/respiração | **não** | — | a arma fica estática parada |
| ADS de sniper | **não** | `game.js:739-744` | `_adsPose` só tem `rifle`/`shotgun`/`pistol`/`_hip`. As **7 snipers e a faca caem no `_hip`** — o ADS de sniper é a pose neutra |

### 1.5 O código morto mais caro do repositório

`springs.js:94-252` define `ViewModelRig`: máquina de estados completa com
idle / sway / bob / kick / **reload em 5 fases com `magDrop`** / holster / draw / ADS /
respiração. Documentado, testado (`tools/eval/vmrig-test.mjs`, roda em Node puro a 240 Hz),
com invariante própria (`invariants.mjs:150-163`).

**Grep no repo inteiro: `ViewModelRig` só aparece em `springs.js` e no próprio teste.**
`game.js:7` importa apenas `RecoilAxis`.

Isso significa que a invariante RIG está passando verde testando código que não roda.
E significa que o reload em fases, o holster e a respiração que você quer **já estão escritos**.

### 1.6 O auditor mede o jogo errado

`tools/eval/vm-mint-audit.mjs:172-181` (`frame()`):
- **não aplica `recuoZ`** (`VM_FRAME.recuoZ = 1.10`)
- **não aplica a trava `nearX`**
- `toView` **não soma `VM_OFF`**

E o `vm_mint_audit.json` foi gerado em 31/07 com `V0deg 62`, `tanBarrel 0.2217`, `tanH`
0,6/0,575/0,42/0,5 por classe. O código de hoje (3.2.0) tem `V0 80`, `tanBarrel 0.30`,
`tanH 0.670` uniforme. Todos os `anguloCanoGraus` do JSON dizem 12,5° quando hoje é 16,7°.

`vm-frame-check.mjs` está pior: hardcoda `V0 = 62, NEAR_X = 0.80, Zg *= 1.35` (linha 13) e
usa caminho absoluto `/root/csb/...`.

**Consequência: as invariantes VM1-VM6 certificam um estado morto.** Toda medição de viewmodel
desde 31/07 mediu a coisa errada.

---

## 2. Plano de execução

### R0 — Consertar a régua (30 min, risco ZERO, pré-requisito de tudo)

Sem isso, nada abaixo pode ser verificado.

```
tools/eval/vm-mint-audit.mjs:172-181  →  aplicar Zg *= F.recuoZ
                                          aplicar a trava nearX
                                          somar VM_OFF em toView()
tools/eval/vm-frame-check.mjs:13      →  ler as constantes de vmattach.js/game.js
                                          em vez de hardcodar; tirar /root/csb
```

Depois:
```bash
node tools/eval/vm-mint-audit.mjs        # regenera vm_mint_audit.json
node tools/eval/invariants.mjs           # VM1-VM6 vão FALHAR — é o esperado
```

As invariantes falhando são o *baseline honesto*. Anote os valores; eles são o "antes".

---

### R1 — Recoil (meio dia)

Três mudanças, em ordem de risco crescente.

**R1.a — Ganhos do kick.** `game.js:3995-3998`
```js
// hoje                      // alvo
pos.z += k * 0.15;           pos.z += k * 0.050;
pos.y += k * 0.045;          pos.y += k * 0.015;
rot.x += k * 0.22;           rot.x += k * 0.070;
rot.y  = ks * k * 0.05;      rot.y  = ks * k * 0.018;
rot.z += ks * k * 0.06;      rot.z += ks * k * 0.022;
```
Divisor ~3. Põe o pitch máximo em ~5,5° em rajada, dentro da faixa CS2.
**Risco: baixo.** É multiplicador puro. Efeitos colaterais conhecidos: `game.js:3923` usa
`this.vm.kick*20` no gap da crosshair dinâmica (o gap vai encolher junto — provavelmente
desejável, mas verifique), e os sprites de flash são filhos do `vm.root` (`game.js:723`).

**R1.b — Acúmulo em rajada.** `game.js:1429`
```js
new RecoilAxis(11, 0.5, 0.28, 0.3)   →   new RecoilAxis(11, 0.5, 0.12, 0.15)
//                    ↑     ↑                                 ↑     ↑
//          residualTau  residualShare
```
Com `residualTau 0.12` o resíduo decai entre tiros de 0,09 s. Mata o `k` sustentado de 1,4 sem
tocar na resposta do primeiro tiro. **Risco: baixo-médio** — regride o "peso" da rajada se for
longe demais; A/B com 30 tiros de AK.

**R1.c — Clamp das snipers.** `game.js:2304`
```js
// hoje
const vmAmp = Math.min(1.7, 0.42 + (REC_DEG[w] ?? 1.4) * 0.30) * (p.scoped ? 0.7 : 1);
// alvo — curva sublinear, separa sniper de rifle sem saturar
const vmAmp = (0.42 + Math.sqrt(REC_DEG[w] ?? 1.4) * 0.28) * (p.scoped ? 0.55 : 1);
```
`REC_DEG` (`game.js:228-234`): awp 4,90 · mosin 4,7 · rem700 4,8 · svd 1,90 · g3 1,75 ·
ak 1,60 · tavor 1,30 · famas 1,25 · p90 0,85.
Com a raiz: awp 1,04 · ak 0,77 · famas 0,73 · p90 0,68 — a sniper continua sendo a mais forte,
mas 40% abaixo do clamp de hoje.
**Risco: médio** — muda as 26 armas de uma vez. Existe `?gunfeel=0` (`game.js:194`) mas ele
volta ao modelo legado inteiro; adicione um knob `?vmkick=` para isolar essa linha no A/B.

**Alvos de partida por classe** (da pesquisa externa; camada B = punch de câmera, camada C =
kick de viewmodel; halflife na formulação exata de Daniel Holden, *Spring-It-On*):

| Arma | Cadência | B: pitch/tiro | halflife B | C: pos Z / pitch / roll | halflife C |
|---|---|---|---|---|---|
| Pistola | 400 RPM | −1,1° (±0,3° yaw) | 0,05 s | +0,030 m / −7° / ±3° | 0,055 s |
| SMG | 850 RPM | −0,35° | 0,045 s | +0,016 m / −3,0° / ±1,5° | 0,045 s |
| Rifle | 600 RPM | −0,60° (±0,25° yaw) | 0,06 s | +0,026 m / −5,0° / ±2,0° | 0,055 s |
| Shotgun | 70 RPM | −3,0° | 0,09 s | +0,075 m / −14° / ±4° | 0,10 s |
| Sniper | 40 RPM | −3,5° | 0,10 s | +0,090 m / −12° / ±2° | 0,12 s |

Duas regras que mudam a percepção mais que os números:
- **Em ADS, multiplique C por 0,30-0,40 e B por 0,6-0,7.**
- **Roll com sinal alternado por tiro** (`+,−,+,−`) — mata a sensação de metrônomo. O
  `ks` de `game.js:3997` já faz isso; confirme que alterna e não é aleatório puro.
- Regra da Kinemation, verificável: para 600 RPM (0,1 s entre tiros), **a curva de recoil tem
  que estar ~zero em 0,1 s**. É isso que separa uma arma que respira no ritmo do fogo de uma
  que vira ruído acumulado.

**Verificação:** re-rodar a simulação de §1.1. Alvo: **pitch máximo ≤ 6°** e **`z` da coronha
sempre ≤ −0,05** nas 26 armas.

---

### R2 — Enquadramento (meio dia)

**R2.a — `VM_OFF` vira angular.** `game.js:371` + `game.js:3995`

O offset em Y precisa escalar com `Zg`, não ser métrico fixo:
```js
// em vez de somar VM_OFF[1] à posição do vm.root:
// dentro do _vmFrame (game.js:1149), somar ao gy:
const gy = -gx * tanB + VM_OFF_ANG_Y * Zg;   // VM_OFF_ANG_Y ≈ -0.55 como ponto de partida
```
**Alvo medido: grip entre 0,84 e 0,92 H nas 26 armas, nos 2 aspectos**, e Δ 16:9 vs 3:2 ≤ 0,03.
Isso resolve a deagle e a faca saindo da tela de uma vez.
**Risco: médio** — muda o look CS 1.6 que você escolheu na 3.2.0. Faça A/B com `?vmoff=` antes
de commitar. Mas note: o look que você escolheu tem o grip da deagle **fora da tela**, então
"manter como está" não é uma opção neutra.

**R2.b — Classe `bullpup`.** `vmattach.js:407-412` e `:425-426`

Criar a classe com `tanH` menor (~0,58) e mover tavor e famas para ela. Alternativamente,
baixar `nearX` de 1,05 para ~0,95 (`vmattach.js:394`) — mas isso afeta as 26.
**Alvo:** `Zg` da tavor e da famas **abaixo** do da AK (elas são mais curtas).
**Risco: médio** — a trava existe para impedir "coronha na lente"; afrouxar sem medir volta o
bug P0.1 documentado em `game.js:1116-1130`. Meça antes e depois com o auditor corrigido.

**R2.c — `_adsPose` para sniper e faca.** `game.js:739-744`

Hoje só existem `rifle`, `shotgun`, `pistol` e `_hip`. `STATIC_CLASS` (`game.js:262`) mapeia
todas as snipers para `'awp'` e a faca para `'knife'` — **as duas caem no `_hip`**.
Adicionar entradas `awp` (arma alinhada com a luneta) e `knife`.
**Risco: baixo.** É uma tabela nova; nada regride.

---

### R3 — Plugar o ViewModelRig (1 dia — o item de maior impacto)

Isso é a diferença entre "arma flutuando" e "arma animada".

```js
// game.js:7
import { RecoilAxis, ViewModelRig } from './springs.js';
```

O `ViewModelRig` substitui, de uma vez:
- `reloadDip` (`game.js:3927-3941`) → **reload em 5 fases com `magDrop`**
- `drawF` (`game.js:3984`) → draw com arco correto, **e conserta o bug do divisor 0,28 vs
  `DEPLOY` 0,45 da AWP**
- bob (`game.js:3946-3949`) → bob que zera em 300 ms
- sway (`game.js:3945`) → sway com mola em vez de decaimento linear
- **ganha de graça:** holster com troca de malha no ponto baixo do arco, respiração no idle

**Pré-requisitos (não pule):**
1. R1 tem que estar feito. Com 17° de kick o rig não tem como parecer bom.
2. O `ViewModelRig` assume **pivô no grip**. Hoje a rotação vai no `vm.root`
   (`game.js:3996`). Isso exige um pivô intermediário — o grupo da arma (`models[id]`) já está
   no grip por construção (`game.js:1150`).
3. **`vm.root` é pai dos sprites de flash (`game.js:723`), dos braços FP (`game.js:1203`) e do
   `tvm` (`game.js:1447`)**, e `_muzzleWorld` (`game.js:2896-2901`) depende do `matrixWorld`
   dele para a origem do tracer. Mexer no pivô sem rodar `vm-quake-scen.mjs` é como o flash e
   o tracer saem do lugar.

**Risco: alto.** É a maior mudança do plano — quatro sistemas paralelos do `game.js` saem
juntos. Mas é o único caminho para reload/holster/inspect de verdade sem escrever animação.

**Verificação:**
```bash
node tools/eval/vmrig-test.mjs                    # já existe: ADS ≤120ms, bob→0 em 300ms
CHROME_BIN=... node tools/eval/vm-quake-scen.mjs /tmp/vmq ak
# cenários: flash na boca, ADS, reload, look-down
```

---

### R4 — Animações que faltam, sem animador (meio dia)

Com "só arma", você **não precisa de clipes**. Procedural cobre ~90% do que o olho lê. Mas duas
coisas valem adicionar:

**R4.a — `inspect`.** Zero ocorrências no `game.js`. É a animação de maior retorno por esforço
em FPS moderno (é o que a pessoa faz enquanto espera o round). Procedural: rotação em Y de
~35° + pitch de 15° + leve translação, 2,5 s, easing, disparado por tecla (F) e por ociosidade.

**R4.b — Idle com respiração.** A arma parada hoje é literalmente estática. Três senoides em
frequências primas (nunca repete):
```js
y     = sin(t * 1.10) * 0.0035    // metros
pitch = sin(t * 0.83) * 0.35°
yaw   = sin(t * 0.61) * 0.28°
```
O `ViewModelRig` já tem isso (`springs.js:236-239`). Se R3 for feito, sai de graça.

**Se um dia quiser clipes de verdade** (v2.1+, e só se voltar atrás na decisão de mãos), as
fontes com licença verificada são:
- **Cransh — "Animated FPS hands (rifle animation pack)"**, **CC BY 4.0**, braços+rifle riggados
  e animados com reload: https://sketchfab.com/3d-models/animated-fps-hands-rifle-animation-pack-5f2d0ed780a94724b36ab505f7564057
  (crédito triplo: Cransh + @bumstrum + @doomsentinel)
- **Matt Rafferty — FPS Arms For Games**, CC BY, anims Deploy/Idle/Walk-Run/Grab:
  https://sketchfab.com/3d-models/animation-fps-arms-for-games-c29feda751284a32b575486f53c49180
- **para — fps arms (rigged only)**, **CC0**, com IK e handle bone:
  https://opengameart.org/content/fps-arms-rigged-only

Aviso importante da pesquisa: **nenhum dos grandes packs CC0 (Mixamo, Quaternius, Kenney,
Rokoko) tem animação de viewmodel FPS** — todos são corpo inteiro em 3ª pessoa. Isso explica
por que você não achou nada. Os três links acima são as exceções reais.

E `SkeletonUtils.retarget()` do Three.js tem bugs conhecidos (off-by-one frame,
[issue #25288](https://github.com/mrdoob/three.js/issues/25288); mãos/pés invertidos com
`mixamoRig`). **Retarget offline no Blender, exporte GLB pronto — não faça em runtime.**

---

### R5 — Padrão de referência: o sistema de overlays do Halo 2

Se em algum momento você quiser qualidade de animador com custo de código, o pipeline oficial
do Halo 2 (MCC) publicou o truque:
[learn.microsoft.com/en-us/halo-master-chief-collection/h2/art/animation/animationsfpanims](https://learn.microsoft.com/en-us/halo-master-chief-collection/h2/art/animation/animationsfpanims)

Um único clipe de **10 frames de pose** (All-Base, Arms-Back, Arms-Front, Arms-Left,
Arms-Right, Gun-Left, Gun-Right, Gun-Up, Gun-Down), amostrado em tempos fixos e blendado por
input/velocidade. É um blend space barato. Em Three.js: `AnimationAction` com `paused = true`
+ `action.time` manual, ou `AnimationUtils.subclip`.

Fica anotado. Não é v2.

---

## 3. Ordem final e critérios

```
R0  30min  régua       risco ZERO      → sem isso nada é verificável
R1a  1h    kick ÷3     risco baixo     → alvo: pitch ≤ 6°
R1b  30m   resíduo     risco baixo-méd → alvo: k sustentado ≤ 1.0
R1c  1h    clamp       risco médio     → alvo: awp ≤ 1.1
R2a  2h    VM_OFF      risco médio     → alvo: grip 0.84-0.92H, Δ aspecto ≤ 0.03
R2b  2h    bullpup     risco médio     → alvo: Zg(tavor,famas) < Zg(ak)
R2c  30m   _adsPose    risco baixo     → sniper e faca com ADS de verdade
R3   1d    ViewModelRig risco ALTO     → reload 5 fases, holster, breathing
R4   4h    inspect     risco baixo     → (grátis se R3 feito)
```

**Kill-switches para A/B ao vivo** (já existem, use todos):
`?vmfov=` `?vmzmul=` `?vmnearx=` `?vmtanh=` `?vmtanb=` `?vmoff=x,y,z` `?vmwide=1`
`?gunfeel=0` `?tripovm=1` `?hands=1`
Adicione: `?vmkick=` (isola R1a) e `?vmrig=0` (isola R3).

**Verificação a cada passo:**
```bash
node tools/eval/serve.mjs 8123 &
node tools/eval/vm-mint-audit.mjs                 # sem browser, 2s
node tools/eval/invariants.mjs                     # VM1-VM6 + RIG
CHROME_BIN=... node tools/eval/vm-quake-capture.mjs /tmp/vmq ak,awp,tavor 1200,800
python3 tools/eval/vm_quake_measure.py /tmp/vmq ak,awp,tavor 0.30
CHROME_BIN=... node tools/eval/vm-quake-scen.mjs /tmp/vmq ak    # flash/ADS/reload/look-down
```

`vm-quake-capture.mjs` captura dois frames por arma (VM visível / `vm.root` escondido) e usa o
diff como **máscara exata** do viewmodel — sem máscara manual. Ele também reprova se
`pitch`/`yaw` do grupo saírem de 0.

---

## 4. O que NÃO fazer

- **Não mexa no `nearX` sem regenerar o `vm_mint_audit.json` primeiro.** Você vai medir a
  resposta errada.
- **Não ligue as mãos (`?hands=1`) antes de R1.** Com 17° de kick as mãos vão junto e a leitura
  fica pior do que sem mão. A ordem correta é R1 → R1b → mãos.
- **Não deixe a câmera seguir o kick do viewmodel.** A camada C é puramente cosmética; se ela
  mexer a mira o jogo fica injogável. O CS:GO expunha exatamente essa separação em
  `viewmodel_recoil` (0-1, cosmético) vs `weapon_recoil_scale` (gameplay).
- **Não refaça o enquadramento pela quarta vez sem baseline.** As versões 3.1.0 (Quake 4) e
  3.2.0 (CS 1.6) foram ambas "medidas frame a frame" — e ambas usaram um auditor quebrado.
