# Movimento 1P do viewmodel autorado (gait + sway)

Dono do assunto: este arquivo. Procedência de número, leis do comportamento,
comandos e histórico RED/GREEN do motion 1P do caminho autorado vivem AQUI — o
código (`public/js/authoredvm.js`) aponta para cá. Frente P3 da
[`METRICA.md`](METRICA.md): "bob/sway ligados à velocidade real, ADS estável e
sem deriva acumulada".

## O que é

O `AuthoredViewModels.update` consome o ctx de movimento que `game.js` passa
(`stepPhase`, `moving`, `speed`, `grounded`, `sway` — game.js:7265-7268) e soma
offsets ADITIVOS de locomotion no `mount`, por último na composição
`frame∘draw∘recoil∘ADS`. O pacote inteiro mão+arma anda junto (filhos rígidos);
o gait trava no `p.stepPhase`, o MESMO contador que dispara o som de passo.
Kill-switch de A/B sem deploy: `?vmlocomotion=0`.

## Procedência dos números (nada inventado aqui)

| Número | Valor | Fonte | Observação |
|---|---|---|---|
| bob Y | 0,010 rad/m | `game.js:7183` | consumidor legado do bob de viewmodel (Lissajous 1:2 sobre stepPhase) |
| bob X | 0,008 | `game.js:7184` | idem |
| amplitude | `min(1, sp/6.6)` | `game.js:7181`; 6,6 = `runSpeed` do rig (`springs.js:106`) | sprint normaliza |
| envelope sobe | tau 0,10 s | `springs.js:224` (rise do `bobAmp` do rig) | literal no rig; não exportado em `VM_TIMES` |
| envelope cai | `VM_TIMES.bobStopTau` = 0,085 s | `springs.js:91` (C16) | **LIMIAR COMPARTILHADO** — `authoredvm.js` importa `VM_TIMES`, não duplica |
| roll rz | 0,030 | `springs.js:231` (`bobR` do rig) | ver aviso abaixo |
| envelope ADS | `(1 - adsAmount)` | `game.js:7195-7199` (`a` smoothstep da rampa dt/0,11) | mesmo blend do FOV/pose |

### AVISO: roll 0,030 é aplicação NOVA

A constante existe no rig (`springs.js:231`), mas a produção roda o rig com
`bobGain: 0` (`game.js:1520` e `:1928`) — o bob/roll do rig **nunca foi
renderizado**; o consumidor legado (`game.js:7183-7184`) só somava Y/X, sem
roll. O roll no caminho autorado é **aplicação inédita**, não coberta por
histórico: a existência da constante **não** aprova o uso. Exige captura/A-B
visual (`?vmlocomotion=0`) e avaliação do Root — pendente.

### Por que o sway ganhou o envelope `(1-adsAmount)` a mais

As molas de sway do rig (`springs.js:109-111`) têm o alvo escalado por
`hip = 1-adsK` (`springs.js:236-238`), mas o **valor** decai
assintoticamente — nunca chega a zero. No quadro em que o ADS autorado chega a
1, o resíduo da mola ainda desloca a mira (medido: 2,0e-4 rad de roll, 6,0e-6
m em X, com giro antes da transição). O envelope contínuo `(1-adsAmount)`
aplicado no mount **amortecimento adicional deliberado sobre o alvo do rig**:
é o que garante alinhamento final EXATO (mira ≡ pose sem movimento). Não é
dupla amortização do mesmo efeito — é a única ponta que zera; o `hip` do rig
continua dono da curva durante a transição.

## Invariantes (o gate mede por diferença entre corridas, não lê constante)

1. **Causal**: offset do gait == `sin(stepPhase)`/`sin(2·stepPhase)` × ganhos
   legados × envelope; muda com a fase passada no ctx.
2. **Sem acúmulo**: frames idênticos → transform idêntico (aditivo sobre
   composição absoluta, nunca `+=` persistente).
3. **ADS cheio**: gait+sway = zero EXATO (bit a bit: andando ≡ parado, e giro
   pré-ADS ≡ nunca ter girado, com rig REAL).
4. **ADS parcial causal**: contribuição de gait e de sway em `ads=a` é
   exatamente `(1-a)` da contribuição em `ads=0` — reduz, não desloca.
5. **Lei do envelope na parada** (sem teto visual): com fase constante, cada
   frame de parada decai o offset EXATAMENTE por
   `exp(-dt/VM_TIMES.bobStopTau)`, monotonicidade estrita e concordância com a
   forma fechada `RATE^N`. Tolerância numérica ULP: `64 · Number.EPSILON ·
   (|frame.x|+|frame.y|+AMP.y)` ≈ 2,3e-15 — cobre o arredondamento da cadeia
   de composição (medido: 5,7e-18/frame), não é limiar de aparência.
6. **Sway só pelas molas**: `swayX/Y/R.value`; o agregado `rg.pos/rot`
   (reload/draw/kick/respiração) NUNCA — o runtime autorado já toca esses
   arcos (camada dupla). O gate injeta poison pill.
7. **Pacote rígido**: filho (arma simulada) sob o mount mantém offset local
   invariante e bloco de rotação idêntico durante o gait, com o mount em
   excursão real (> AMP.y/2) — sem tautologia.
8. **Reload íntegro** e **kill-switch** `?vmlocomotion=0`.

9. **Granada sem locomotion**: o mount da utilidade (porte HELD ou arremesso)
   não recebe gait NEM sway — pose ≡ `frame∘draw∘recoil∘ADS` bit a bit em
   qualquer fase de passo, durante todo o arremesso e no retorno, sem offset
   residual e sem salto (P2 #1 da revisão de 31/10: o arremesso retorna antes
   da recomposição e o offset do último passo congelava ~1,05 s; o held,
   ao contrário do que esta doc dizia, RECEBIA a contribuição).

10. **Finitude**: position/quaternion/scale de TODOS os mounts finitos após o
   pior caminho (andar, porte, troca durante o porte, arremesso, retorno) — o
   estado que faltar aparece como NaN no gate, não como crash.
11. **Troca de arma durante o porte com gait ativo** (interseção
   troca×utility×gait, P3 #5 da revisão): parar durante o porte e devolver
   recompõe a arma NOVA na pose de parado exata (tol ULP) — o envelope decai
   no porte e o offset do último passo não congela.

12. **CTX causal e velocidade efetiva**: `_updatePlayer` passa `stepPhase`, `moving`,
   `grounded` e a velocidade medida pelo DESLOCAMENTO XZ dentro da própria física
   (antes da integração → depois da correção de colisão, ÷ dt, limitada ao maxSp).
   Corpo bloqueado em parede/limits devolve speed 0 (moving false) e o teleporte/
   reconciliação do chamador — que acontece fora de `_moveEntity` — não vira marcha.
   Prova: `authored-game-ctx-check.mjs` (Game real) + mutante `vel-pre-colisao`.
13. **Finitude por update**: TODO update da régua passa por um único wrapper que
   audita position/quaternion/scale de TODOS os mounts imediatamente após o update;
   NaN transitório (saneado no frame seguinte) reprova — inclusive quaternion no
   caminho reload+ADS parcial+sway (mutante `nan-quaternion-reload`).
14. **Reset de lifecycle**: `resetLocomotion()` zera envelope em morte
   (`_abortarArmaNaMorte`), respawn/volta à base (`_voltarPraBase`) e início de
   round (`_resetPositions`). A fase `p.stepPhase` tem dono ÚNICO (Game) e é zerada
   nos eventos de reposicionamento (round e `_voltarPraBase`); troca normal e
   utility NÃO resetam. Morte de MP por snapshot não passa por `_kill` — fora do
   escopo desta régua (netcode).

## Comandos
```bash
/opt/homebrew/bin/node tools/eval/authored-locomotion-check.mjs              # 27 checks
/opt/homebrew/bin/node tools/eval/authored-locomotion-check.mjs --mutantes   # + 14 mutantes
/opt/homebrew/bin/node tools/eval/authored-game-ctx-check.mjs               # 21 checks (Game real)
/opt/homebrew/bin/node tools/eval/authored-game-ctx-check.mjs --mutantes    # + 6 mutantes
/opt/homebrew/bin/node tools/eval/authored-transition-check.mjs             # irmão: fila/troca/granada
/opt/homebrew/bin/node tools/eval/authored-transition-check.mjs --mutantes  # + 9 mutantes
```

O probe `authored-game-ctx-check.mjs` (AUD1C, alongside) sobe o Game REAL em node,
exerce W livre, W+D normalizado, Shift, bounds bloqueado, slide parcial, ar, mantle,
teleporte, morte (`_kill`), respawn (`_respawnPlayer`) e round (`_resetPositions`),
e aceita por propriedade física — nunca por nome de check.

No `package.json` desde a R3: `eval:authored-locomotion` e `eval:authored-transition`
(baseline+mutantes) no `check:vm`, e o locomotion também vira **AUD1C** no
`tools/eval/invariants.mjs` (mesmo padrão finitude/erro-propagação de AUD1A/B,
pré-warm compartilhado). `authored-ads-check` é gate de browser (proibido na
lane; Root executa via Ego).

## Mutantes (cada um acende só as cláusulas da sua frente)

| Mutante | Mutação | Cláusulas que acendem |
|---|---|---|
| `gait-mudo` | `if (VM_LOCOMOTION && !this.held)` → `if (false && …)` | causal ×3, parcial, lei-envelope, reload, sway-molas, sway-parcial, filho-rígido (9) |
| `sway-agregado` | `this._gait.x + (sway?.swayX?.value \|\| 0) * hip` → `…(sway?.pos?.x \|\| 0) * hip` | só `sway-so-molas` (poison) |
| `gait-sem-ads-damp` | `* (1 - this.adsAmount)` → `* 1` | `ads-completo-zero`, `ads-parcial-reduz` |
| `sway-sem-ads-damp` | `const hip = 1 - this.adsAmount;` → `const hip = 1;` | só `sway-parcial-causal` + `ads-rig-real-zero` |
| `bob-stop-tau-torto` | `VM_TIMES.bobStopTau` → `0.17` | só `parada-lei-envelope` |
| `gait-na-granada` | `if (VM_LOCOMOTION && !this.held)` → `if (VM_LOCOMOTION)` | só `granada-held-*` ×2 + `granada-throw-sem-offset` |
| `gait-congelado-no-porte` | `this._stepGait(step, ctx);` → `if (!this.utility && !this.held) …` | só `troca-durante-porte-sem-offset` |
| `nan-quaternion-reload` | `rotation.z +=` ganha `rotation.x = NaN` em reload+ADS 0,5+sway | `reload-ads-parcial-finito` + `mounts-finitos-por-frame` (quaternion transitório) |

Mutantes do PROBE (game.js mutado em memória, data: URL; mesma aceitação):

| Mutante | Mutação | Cláusulas que acendem |
|---|---|---|
| `fase-desconectada` | `stepPhase: p.stepPhase` → `0` | `fase-finita-e-igual`, `fase-avanca-com-movimento` |
| `vel-pre-colisao` | deslocamento/dt → `hypot(p.vel)` (código pré-R6) | `bounds-bloqueado-speed0`, `slide-parcial` |
| `reset-morte-fora` | tira `resetLocomotion` do `_abortarArmaNaMorte` | `morte-reset-envelope` |
| `reset-round-fora` | tira `resetLocomotion` do `_resetPositions` | `round-reset-locomotion` |

## Histórico


**Rodada 1** (patch inicial, logs `audits/2026-10-31-visual-consistency/GLM-MOTION-[1-5]-*.log`):
RED na head (6 checks, ctx guardado sem consumir) → GREEN 10/10 → 3 mutantes
mortos pelos checks certos → mutante em disco RED → restaurado md5 idêntico →
transition-check verde.

**Rodada 2 — refino pós-revisão do Root** (`GLM-MOTION-REFINE-[1-3]-*.log`):
- Comentários do produto/teste reduzidos a ≤2 linhas; procedência movida para cá.
- `bobStopTau` passou a ser `VM_TIMES` importado (limiar compartilhado).
- Teto visual da parada (0,006/1e-3) trocado pela lei matemática do envelope
  (invariante 5) + mutante `bob-stop-tau-torto`.
- **RED provado antes do fix**: com rig REAL, sway residuo deslocava a mira no
  ADS cheio (`ads-rig-real-zero` dx=-6,0e-6 dy=1,2e-6 drz=2,0e-4) e não reduzia
  causalmente no parcial (`sway-parcial-causal` dev 2,9e-2 em ads=0,5) →
  aplicado envelope `(1-adsAmount)` no sway do mount → GREEN 13/13; mutante
  `sway-sem-ads-damp` acende exatamente as duas cláusulas novas.
- Filho arma (mesh simulada sob o mount) verificado rígido no gait (drift
  2,9e-17 m, rotação 0 elemento a elemento, excursão do mount 0,020).
- transition-check verde após o refino.

**Rodada 3 — dois P2 da revisão independente de 31/10** (`GLM-MOTION-P2-*.log`):
- **P2 #1 (held/throw com locomotion)**: RED provado antes do fix — held fase 0,7
  deslocava dx=+0,0172 dy=+0,0039 drz=+0,0493 (= gait+sway somados), e no
  held→throw o offset congelava (pior=0,060) e saltava no retorno (salto=0,0164).
  Fix: guarda `!this.held` no bloco LOCOMOTION (utility já retornava antes da
  recomposição). GREEN 16/16; mutante `gait-na-granada` (guarda fora) acende
  exatamente as 3 cláusulas novas; `gait-mudo` segue acendendo as 9 originais.
- **P2 #2 (fixture do transition-check sem `_gaitEnv`/`_gait`)**: `Object.create`
  sem construtor → `approach(undefined,…)` = NaN → `mount.position/quaternion`
  NaN (16.740 violações medidas) invisíveis ao gate, que só lia estado/ossos.
  Check `mounts-finitos` (position/quaternion/scale de todos os mounts após cada
  update) provado RED na fixture velha; fix: fixture constrói instância real
  (`new AuthoredViewModels()`). Mutante `fixture-sem-estado` (fixture volta a
  `Object.create`) acende SÓ `mounts-finitos` — RED por não-finito, sem crash.
  A âncora do mutante `arma-oculta-apos-granada` ficou ambígua quando
  `releaseUtility` ganhou a mesma linha; desambiguada por contexto.

**Rodada 4 — os 5 P3 da revisão independente** (`GLM-MOTION-R3-*.log`):
- Citação da linha do smoothstep corrigida (`game.js:7195-7199`); comentário do
  bloco LOCOMOTION reduzido à estrofe do ADS (a da granada mora na inv. 9).
- `_stepGait` sem alocação por frame (escrita in-place; a closure `sw` virou
  `hip` inline). Âncoras `sway-agregado`/`sway-sem-ads-damp` reancoradas sem
  mudar semântica; `fixture-sem-estado` continua acendendo SÓ `mounts-finitos`
  (a guarda lazy do `_gait` preserva o modo NaN — sem crash).
- Fixture do locomotion passou a `new Runtime()` como o irmão de transição.
- Interseção troca×porte×gait (P3 #5) fechada com régua direta: check
  `troca-durante-porte-sem-offset` + `mounts-finitos` + mutante
  `gait-congelado-no-porte` que acende só ele. 18 checks + 7 mutantes na R4; totais atuais nos comandos acima.
- Gates no `package.json` (`check:vm`) e AUD1C no `invariants.mjs`, wire
  provado por probe extract-and-run (execução real, erro propagado, chave de
  pré-warm idêntica à do bloco).

**Rodada 6 — P2-1/P2-2/P2-3/P3-1 do crítico R5** (`GLM-MOVIMENTO-R6-*.log`):
- **P2-1**: `_moveEntity` passou a medir a velocidade efetiva pelo DESLOCAMENTO XZ
  interno (antes da integração → depois de `_collide`, ÷dt, clamp maxSp). RED provado
  pelo mutante `vel-pre-colisao` (= código antigo): no limite do mapa com D segurado o
  corpo não anda mas o ctx antigo reportava speed>0 com moving true.
- **P2-2**: probe reescrito com cenários reais (W, W+D, Shift, bounds, slide, ar,
  mantle por `_beginMantle`, teleporte, `_kill`, `_respawnPlayer`, `_resetPositions`);
  fase exigida finita/igual ao `p.stepPhase`/avançando com o passo — mutante
  `fase-desconectada` RED pelas cláusulas de fase.
- **P2-3**: TODO update do gate passa por um wrapper que audita position/quaternion/
  scale de todos os mounts por frame; mutante `nan-quaternion-reload` (NaN transitório
  em rotation.x só em reload+ADS 0,5+sway) acende `reload-ads-parcial-finito`.
- **P3-1**: `_resetPositions` agora chama `resetLocomotion` e zera `p.stepPhase`
  (também em `_voltarPraBase`); contrato da fase: dono único Game, zerada nos
  reposicionamentos. Mutantes `reset-round-fora`/`reset-morte-fora` RED.
- **AUD1C-CTL** (`invariants.mjs`): aceitação do filho auditor extraída para
  `aud1Filho`/`aud1Classifica` e exercida por 4 filhos sintéticos (GREEN/exit0,
  JSON GREEN+exit1, JSON RED, erro sem JSON).

## Fechamento R9 (31/10, revisão independente R8)

A retomada em `_voltarPraBase` preserva a limpeza de utilidade (`abortUtility`,
`p.nade`, busy/next), restaura a visibilidade da arma e zera gait/fase/rig antes
novamente renderizar. O probe observa a diagonal ANTES do clamp, para não
mascarar velocidade física excessiva. Ambos têm mutantes próprios
`revive-limpeza-fora` e `diagonal-sem-normalizar` (nomes exatos no gate).

O caminho A/B desligado também audita todos os mounts após cada um dos 800
updates. O mutante `nan-kill-switch` injeta scale.z=NaN antes da guarda de
locomotion, somente com o A/B desligado. Uma pré-condição independente observa a
transformação finita tornar-se NaN; só depois a aceitação exige finitude. Remover
apenas essa aceitação faz o mutante sobreviver e a suíte sair1
(`root-motion-R9-finite-guardoff.log`). A tentativa R8 injetava dentro do ramo
inativo e NÃO aplicava: essa prova foi rejeitada, não integra o aceite.

Evidência final Root: `root-motion-R9-locomotion-final.log` (27 checks e14
mutantes), `root-motion-R9-game-baseline.log` (21 checks/862 chamadas),
`root-motion-R9-game-final.log` (6 mutantes). Revisão integral independente:
`CRITICO-MOVIMENTO-INTEGRAL-R8.md`, sem P1/P2/P3 novos na fonte final. Os arquivos
de evidência estão no audit local de31/10; não são captura visual nem release.

## Limites declarados

- **Sem validação visual** — nada aqui foi olhado em browser/captura; A/B
  `?vmlocomotion=0` e captura 3:2 são do Root. Roll 0,030 pendente de aceite.
- Gait/sway **não** aplicados ao porte/arremesso de granada (invariante 9): o
  held É recomposto por-frame, mas sem locomotion — o utility branch retorna
  antes da recomposição e o offset congelava ~1,05 s até saltar no retorno.
- O gate roda o fixture de THREE (padrão do transition-check), não o GLB real
  por família; alinhamento ADS fino (sockets/mint) segue na frente AK e no gate de browser.
- `game.js` bob legado (`:7183-7184`) segue somando só no ramo legado.
