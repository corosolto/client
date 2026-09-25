# P1 — BOTS E PERSONAGENS

Dois problemas independentes que você juntou no item 2: **bots sem senso de redor** e
**models com postura errada**. As causas raiz são completamente diferentes.

---

# PARTE A — BOTS

## A.1 O bug de "passa do lado e não atira" — causa raiz identificada

`game.js:4660`:
```js
const hasTurn = !(BOT_FAIR && e.isPlayer) || this._duelToken(b);
if (this.time > b.reactAt && this.time > (b.focusUntil || 0) && this.time > b.nextShotAt
    && this.time > (b.reloadUntil || 0) && Math.abs(dy) < 0.3 && !b._losLost
    && inRange && hasTurn) {
```

`hasTurn` é uma `const` numa statement **separada**, avaliada todo frame para todo bot cujo
alvo é o jogador — **antes e independentemente** de qualquer gate de "pode atirar".

E `_duelToken` (`game.js:4331-4342`) não consulta, ele **reserva**:
```js
if (T.has(b)) return true;
if (now < (b._tokRest || 0) || T.size >= BOT_DUEL_TOKENS) return false;
T.set(b, now + BOT_TOKEN_HOLD);   // reserva por 1,6 s
return true;
```

Com `BOT_DUEL_TOKENS = 2` (`game.js:154`) e `BOT_TOKEN_HOLD = 1.6` (`game.js:155`):

- Um bot que **acabou de te ver** e está no atraso de reação (0,47 a 1,35 s) **rouba um token
  e o segura os 1,6 s inteiros sem disparar**.
- Um bot **sem linha de visão** (`b._losLost`) também rouba — o gate `!b._losLost` vem *depois*
  na condição, mas a reserva já aconteceu.
- Um bot **recarregando** (2,4-3,1 s) idem.
- A concessão é por **ordem do array `this.bots`** — não por quem tem tiro. O bot de índice
  baixo sempre ganha a vez.
- Os outros 6 recebem `hasTurn === false`, **continuam avançando** (o `approach` das linhas
  4565-4579 roda normalmente) e atravessam seu campo de visão sem atirar.

**Correção (A1):** mover `this._duelToken(b)` para **dentro** do `if`, como último termo:
```js
if (this.time > b.reactAt && this.time > (b.focusUntil || 0) && this.time > b.nextShotAt
    && this.time > (b.reloadUntil || 0) && Math.abs(dy) < 0.3 && !b._losLost && inRange
    && (!(BOT_FAIR && e.isPlayer) || this._duelToken(b))) {
```
Só pede o token quem já pode atirar. **Maior ganho isolado do plano de bots.**

**Correção (A2):** `_duelToken` (`game.js:4331-4342`) — trocar "primeiro do array" por
prioridade (mais perto / menor `aimErr` / LOS confirmada). Considerar `BOT_DUEL_TOKENS` 2→3 e
`BOT_TOKEN_HOLD` 1,6→1,0 s.

## A.2 A zona morta de yaw a menos de 2 metros

`dy` é calculado em `game.js:4482` e o corpo gira em `:4487`:
```js
b.yaw += dy * Math.min(1, dt * (4 + 4.2 * Math.max(0.4, b.skill)));
```
Ganho `k = 4 + 4,2·skill` (skill médio 0,95 → **k ≈ 8,0 /s**). O erro de regime ao seguir um
alvo com velocidade angular ω é `dy ≈ ω/k`. Com o jogador passando a 5,35 m/s:

| distância | ω | dy de regime | passa no gate `<0.3`? |
|---|---|---|---|
| 6 m | 0,89 rad/s | 0,111 | sim |
| 3 m | 1,78 rad/s | 0,223 | sim (raspando) |
| **1,8 m** | 2,97 rad/s | **0,372** | **NÃO** |
| 1,0 m | 5,35 rad/s | 0,669 | NÃO |

**Passar a menos de ~2 m do bot cria uma zona morta geométrica onde ele nunca satisfaz o gate**,
por mais que veja perfeitamente. Bot ruim (skill 0,62, k = 6,6) tem zona morta de ~2,2 m.

Agrava: o `dy` usado no gate (`:4662`) é o valor **pré-giro** daquele frame — nunca recalculado
depois do `:4487`.

**Correção (A3):** `game.js:4662`
```js
Math.abs(dy) < Math.max(0.3, 2.5 * Math.atan2(0.5, dist))
```
Ou recalcular `dy` depois do giro.

## A.3 O tiro do jogador NUNCA alerta um bot

`alertUntil` tem exatamente **2 sites de escrita** no arquivo inteiro:
- `game.js:4396` — o bot **levou dano**
- `game.js:4745` — um **colega de time bot** disparou a menos de 30 m

`_tryShoot` do jogador (`game.js:2237-2312`) escreve `p.revealedAt = this.time` (`:2251`),
usado **só pelo radar**, e não toca em bot nenhum.

**Você pode disparar uma AK ao lado de um bot e ele não reage.** Não há percepção de passos,
de recarga, de granada.

E o que `alertUntil` faz é só **abrir o raio de visão** (`:4410-4411`), sem dar direção nem
ponto de investigação.

**Correção (A4):** em `game.js:2251`, replicar o laço de `:4743-4746`, dando `alertUntil` e um
`b._heardAt = {x, z}` aos bots num raio proporcional à arma (supressor reduz).

## A.4 Não há memória: perdeu LOS 1,2 s → esquece

`game.js:4458`: sem LOS por 1,2 s, `b.target = null`. Sem "última posição conhecida", sem
investigação, sem busca.

**Correção (A5):** guardar `b._lastKnown = {x, z, t}` ao perder LOS e, no roam, mirar esse
ponto por N segundos antes de voltar ao roam normal.

## A.5 Levar tiro pelas costas com alvo à frente = zero reação

`game.js:2488`:
```js
if (!ent.isPlayer && attacker && attacker.team !== ent.team && !ent.target && attacker.alive) {
  ent.target = attacker;
```
O `&& !ent.target` faz o bot **ignorar quem atirou nele se ele já tiver qualquer outro alvo**.

**Correção (A6):** relaxar — permitir troca quando o atacante causa mais dano ou está mais perto.

## A.6 Sobre cone de visão

**Não existe FOV de visão nos bots.** O laço de aquisição (`game.js:4412-4424`) é
omnidirecional: distância + `_losClear`, e nada mais. Geometricamente eles têm 360°.

**Não adicione um cone antes de A4 e A5.** Sem audição e sem memória, um cone deixaria os bots
cegos por trás e o jogo ficaria pior, não melhor. Se depois quiser valorizar o flanco, o lugar
é `game.js:4412-4424`, com θ ≈ 100-110°.

## A.7 Parâmetros de referência (para não mexer no escuro)

| Item | Valor | Linha |
|---|---|---|
| `BOT_VIEW` / `_SNIPER` / `_ALERT` | 45 m / 82 m / 64 m | 73-75 |
| `BOT_REACT_MIN` / `BOT_FOCUS_MIN` | 0,20 s / 0,16 s | 129-130 |
| lapso de atenção | 12% de chance, +0,28 a +0,63 s | 4434 |
| tick de decisão (`think`) | 0,10-0,22 s | 4405 |
| erro ao engatar | `0.10 + 0.07/skill` rad (skill 0,95 → **10,0°**) | 4443 |
| piso do erro (rifle) | `0.010 + 0.028/skill + vAlvo·0.006/skill` | 4643 |
| `BOT_SPRAY_K` | 1,9× o tamanho angular do alvo, clamp [0,013, 0,075] | 152, 4737 |
| `BOT_DMG_BY_DIFF` | easy 0,48 / normal 0,63 / hard 0,80 / insane 0,98 | 126 |
| `BOT_HS_MAX` | 7% | 127 |
| `BOT_SPEED` vs `PLAYER_SPEED` | 4,1 vs 5,35 m/s | 72, 163 |
| passo lateral em combate | **0** (`BOT_MOVE2` — o controller não tem clipe de strafe) | 4553 |

Exemplo que explica a sensação de "bot que não acerta de longe": bot médio no normal
(skill efetiva ~0,68) a 20 m tem `floorErr = 0,0512 rad` contra um alvo de `halfAng = 0,025 rad`
— **o erro de piso é 2× o tamanho do alvo**. A 8 m, `halfAng = 0,0624` > `floorErr` → acerta.

## A.8 Navegação: o que existe (não mexa) e o que falta

**Existe e é bom:** grafo de waypoints por mapa, A* (`_findPathLocal`, `game.js:3459-3480`),
custo de virada (`+|ângulo|·2.6`), pedágio de destino reservado (+12), filtro de componente
conexo (`_wpComp`), `_walkReach` com física real, `_pullString` verificado, `_freeYaw` com
8 sondas, anti-pirueta (4,5 rad → envenena rota), stuck em 0,35 s, `_botSeparation` com boids.

**Falta (não é v2):** cover pré-computado (hoje são 4 sondas atrás do bot, só com `hp < 40`,
`game.js:4512-4527`), navmesh, influence map, grafo de LOS. A* usa lista aberta linear `O(n²)`
(`:3466-3470`) — aceitável a 0,25-2,5 s de intervalo.

## A.9 A métrica que falta

**Nenhum dos ~106 scripts de `tools/eval/` mede o problema deste documento.** A métrica é:

> por bot, `tempo com target === player && losClear` **versus** `tiros disparados`

Cabe em ~20 linhas no `tools/eval/botdiag.mjs` e prova A1 numericamente.

**Faça isso ANTES de A1.** Sem ela você vai "consertar" e não vai saber se consertou.

## A.10 Verificação

```bash
node tools/eval/botsim.mjs 120 all     # roda o _updateBot REAL em Node puro, sem browser
SIM_DUEL=1 SIM_EV=1 node tools/eval/botdiag.mjs    # imprime a rajada que matou, tiro a tiro
node tools/eval/bot-routes.mjs         # trilhas SVG vistas de cima
```
Kill-switches: `?botfair=0` `?botmove=0` `?botcrowd=0`.

**Critério de pronto:** 0 casos de "bot com LOS no jogador por >1,5 s sem disparar" em 120 s
de simulação, nos 4 mapas.

---

# PARTE B — MODELS E POSTURA

## B.1 "Braço de balão" — pesos vazando no auto-skin

`tools/rig-from-donor.mjs:123-129` (usado nos **Palhaços e Funkeiros**, que a Mint não entregou
riggados — CHANGELOG 3.3.0):

```js
const best = [{i:0,d:1e18},{i:0,d:1e18},{i:0,d:1e18},{i:0,d:1e18}];
for (const s of segs) { const d = segDist(p, s); if (d < best[3].d) {...} }
let ws = 0; const w = best.map(b => { const x = 1/Math.pow(b.d + 1e-5, 1.5); ws += x; return x; });
```

Quatro defeitos somados:

1. **Sem raio máximo.** Todo vértice recebe 4 pesos que **somam 1**, por mais longe que os ossos
   estejam. Um vértice no meio de uma barriga larga ou de roupa folgada (funkeiro, palhaço,
   garrafa do Dollynho) fica com fração significativa de peso no `RightForeArm` só porque, na
   bind pose (braços descidos), o antebraço passa rente ao quadril. Quando o clipe levanta o
   braço, o tronco vem junto e infla. **É exatamente "braço de balão".**
2. **Bind pose com braços colados ao corpo** — o vazamento é máximo justo nos ossos que mais
   se movem.
3. **Sem partição de corpo.** O jogo já precisou de uma heurística de nomes para contornar isso
   em `glbchars.js:161` (`/arm|hand|shoulder|clavicle|curl/i`, exclui vértices com >30% de peso
   de braço do perfil de tronco). Se o auto-skin não vazasse, esse filtro não existiria.
4. **Expoente 1,5 sobre distância ao quadrado (`1/d³`)** — falloff duro demais, pinça cotovelo
   e joelho.

**Correção (B1):** em `rig-from-donor.mjs:123-129`, adicionar (i) raio máximo de influência com
renormalização, (ii) partição de corpo por nome de osso (reusar o regex de `glbchars.js:161`),
(iii) suavizar o expoente de 1,5 → ~1,0. Depois **regerar os GLBs dos Palhaços e Funkeiros**.

## B.2 "Arqueada / corcunda" — alinhamento só por altura de bbox

`tools/rig-from-donor.mjs:83-86`:
```js
const scale = donorH / (mBox.mx[1] - mBox.mn[1]);
```
O único casamento é escala uniforme pela **altura da bounding box** + pés no chão + centro X/Z.
Nada garante que o ombro fique na altura do `LeftShoulder` do doador.

- Personagem com **chapéu ou cabelo alto** (Oakley com chapéu Medusa, sertanejo com chapéu,
  palhaços com cabeleira, Raul com franja) tem a bbox inflada pelo topo → **escala menor** → o
  corpo encolhe e todas as juntas ficam **abaixo** das articulações reais. Um `Spine02` no meio
  do peito em vez de no esterno faz o clipe de empunhadura curvar o tronco: **corcunda**.
- **Mascotes** (cabeça grande, pernas curtas) têm `Hips` em altura errada, e a rotação do Hips
  aplica flexão na parte errada da malha.

Esse é o mesmo defeito que o `retarget-glb.mjs:5-8` documenta para os rigs Meshy ("doutora
squats, dollynho bends") — mas ali a solução foi reassar o clipe por personagem; no caminho do
doador **não há nada equivalente**.

**Correção (B2):** casamento por **landmarks** — escalar/transladar para que altura de ombro e
altura de quadril batam com `LeftShoulder`/`Hips` do doador, não o topo da cabeça.
Alternativa mais barata: excluir chapéu/cabelo da bbox de referência.

**Correção (B3):** `glbchars.js:247-252` — `TARGET_HEIGHT / bboxH` normaliza **todo mundo para
1,72 m de bbox total, incluindo chapéu, cabelo e antena**. Personagem com chapéu de 20 cm fica
com **1,52 m de corpo**, enquanto a arma escala pelo caminho independente
(`mount.scale = GUN_SCALE / boneScale`, `:326-328`). Resultado: personagem baixo com arma
desproporcional. Normalizar pela altura do osso `Head`, ou expor `heightMul` por personagem em
`CHARACTERS` (`characters.js:357+`).

## B.3 Postura errada segurando a arma — cinco causas

**(a) A arma segue o CORPO, o braço segue o CLIPE, e ninguém reconcilia.**
`glbchars.js:363-365`: `desired = bodyQ ⊗ carry`, com `TP_CARRY_PITCH = -6°` e
`TP_CARRY_YAW = +4°` (`:86-87`) — **iguais para os 40+ personagens**. Se o clipe põe a mão numa
orientação diferente da do corpo, a arma fica rígida no espaço do corpo e a mão gira por baixo
dela. Visualmente: **pulso torcido, cano apontando para onde o antebraço não aponta.**
O comentário (`:74-83`) explica que o método anterior dava pitch de −21° a −35° em todos os 27
personagens — a correção trocou um erro por outro.

**(b) A pose é medida UMA vez e nunca reavaliada.**
`glbchars.js:356-357`: `for (let i = 0; i < 10; i++) ctrl.update(1/30, 0, false, 0);` — 0,333 s
do clipe `idle`, e `mount.quaternion`/`mount.position` são **congelados nesse instante**
(`:367` e `:384`). Os outros 10 clipes (`walk`, `run`, `shoot`, `crouch`, `death`) usam esse
mesmo offset. **É por isso que a arma "sai do lugar" ao trocar de animação.**
→ **B5:** medir por estado, guardar `mountByState`, trocar em `_to()` (`:438-447`). No mínimo
remedir em `idle`, `shoot` e `crouch`.

**(c) `curl.rotation.x += 0.5` para 26 armas e 40 personagens.**
`glbchars.js:405-406`. **0,5 rad = 28,6°** de fechamento de dedos, idêntico para a AWP
(empunhadura larga), a UZI (estreita), a faca e o Dollynho (que nem tem mão humana). E é `+=`
aplicado uma única vez no build.
→ **B6:** por arma, lido de `gripPoints()` em `weapons.js`.

**(d) A IK do braço esquerdo hiperestende.**
`glbchars.js:411-415`: cadeia `[LeftArm, LeftForeArm]`, alvo no `gp.fore` da arma, 8 iterações
de CCD (`:579`), **sem limites de junta e sem verificação de alcance**. Se a distância
ombro→apoio exceder o comprimento do braço, a CCD converge para o braço **totalmente esticado e
torcido**, sem cotovelo. Junto com o vazamento de peso da §B.1, é o "braço inflado e reto".
A lista `IK_L_SKIP` (`:46` — `dollynho, gotinha, et, canarinho`) é o remendo manual, e cobre
4 casos de 40.
→ **B4:** checar alcance antes de resolver; se `|ombro→alvo| > 0.98·(|LeftArm|+|LeftForeArm|)`,
relaxar o alvo ao longo da direção. Adicionar limite de junta no cotovelo em `handik.js`
(72 linhas). Isso torna `IK_L_SKIP` desnecessária.

**(e) Palhaços não têm clipes próprios.**
`glbchars.js:36-38` — são os únicos que caem 100% no pack compartilhado, apesar de terem sido
auto-skinnados (o pior caso possível: skin ruim + clipe genérico).
→ **B7:** rodar `tools/retarget-glb.mjs` para os Palhaços.

## B.4 Tela de seleção

`main.js:244-278` (`ensurePreview`) e `:329-355` (`pvSetChar`).

| # | Problema | Onde | Correção |
|---|---|---|---|
| **C1** | Pose é o **`idle` de combate** em loop (`rifle_idle_1` retargetado). Sem pose de vitrine. | `main.js:1403` — `pv.ctrl.update(dt, 0, false, 0)` | Estado `showcase` ou `action.paused = true` num frame escolhido |
| **C2** | **Miniatura e preview mostram poses diferentes.** A miniatura usa `{weapon: false}` (`main.js:1122`) → todo o bloco `glbchars.js:304-417` é pulado: sem mount, sem curl, sem IK. **O personagem segura o ar.** E avança o mixer cru (`:1125`) em vez do `ctrl` | `main.js:1122, 1125` | Passar `{weaponId: charWeapon(def.id)}` e usar `ctrl.update` |
| **C3** | Câmera fixa (FOV 34°, `(0, 1.3, 3.2)`, `lookAt(0, 0.92, 0)`) calibrada para humanoide de 1,72 m. **Mascotes ficam pequenos, chapéus ficam cortados** | `main.js:260-261` | Derivar da `Box3` do modelo em `pvSetChar` |
| **C4** | Giro automático a **0,9 rad/s** = volta completa a cada 7 s. Rápido demais para ler detalhe | `main.js:1401` | ~0,35 rad/s, ou arco de ±40° |
| **C5** | `ctrl.aimPitch` fica `undefined` → a correção de pitch da cabeça é pulada (`glbchars.js:536`) e o personagem herda a cabeça inclinada ~13° do clipe de rifle | `main.js:349` | `ctrl.aimPitch = 0` |
| **C6** | Rig de luz do preview (hemi 1,1 + key 1,8 + rim 0,55) ≠ rig de jogo (`CHAR_FX`, `characters.js:47-86`) | `main.js:255-257` | Unificar ou documentar como intencional |

**C2 é o de maior impacto visual e o mais barato.** Na screenshot `issues/ui-nova/03-char.png`
dá para ver o palhaço com a pistola atravessando o corpo — isso é a soma de C2 + B3(d).

## B.5 Ordem sugerida (1 dia, na v2)

Só o que muda o que se vê nos 60 primeiros segundos:

```
[30m] Métrica nova no botdiag.mjs (§A.9)         ← antes de tudo
[1h]  A1 + A2 + A3   (o duelo e o gate de yaw)   ← conserta o bug que te incomoda
[1h]  A4 + A6        (audição do jogador, troca de alvo)
[30m] C2 + C5        (miniatura com arma, cabeça reta)
[1h]  B4             (alcance da IK esquerda — mata o braço esticado)
[2h]  B5             (mount por estado — mata a arma que sai do lugar)
```

**Para a v2.1 (exige regerar assets):** B1, B2, B3, B6, B7, A5, C1, C3, C4, C6.
São correções no pipeline de rig, e depois todos os GLBs de Palhaços e Funkeiros precisam ser
regerados com `rig-from-donor` + `optimize-tribos` + `retarget-glb` + `check-clip`.
Isso é meio dia de execução mas várias horas de máquina — não cabe na janela de release.
