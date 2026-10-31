# Pose de cabeça autorada e proxy final

O comando `head-yaw-check.mjs` mantém o nome para preservar o wiring, mas o
contrato atual **não exige yaw80%**. A integração rejeita explicitamente esse
algoritmo novo do #1179 por regressão de deformação; não aprova visualmente o rosto
nem considera a meta artística de alinhamento resolvida.

## Contrato atual

Em estado neutro (`aimPitch === undefined`, sem emote), o quaternion LOCAL do Head
segue os clipes autorados, inclusive quando o AnimationMixer otimiza tracks
constantes ou quando não existe track de rotação. Giro do grupo, rotação/escala de
ancestrais e overlays de tronco não autorizam yaw extra no Head. O proxy coincide
com a posição mundial FINAL do osso em cada frame medido.

Pitch definido e gestos de emote continuam legítimos. Os ensaios próprios permitem
esse movimento e exigem que ele tenha efeito: pitch melhora erro ao alvo tanto
contra o mixer neutro do mesmo frame quanto contra o frame anterior à mira, com
mudança local do Head; emote movimenta Neck ou Head através do driver explícito.
Depois do gesto/mira, o clipe animado retoma a pose. Não se impõe ganho80%, direção
física de rosto por eixo+Z, nem um novo teto artístico.

## Oráculo e cobertura

A régua importa somente o controlador real em cópia temporária fora da árvore
pública; imports retornam aos módulos reais. Um **AnimationMixer independente**,
sem segundo CharController, toca clones das mesmas fixtures conforme uma sequência
explícita de ações. O oráculo avança com o mesmo dt e verifica o nome da ação.
Além da comparação com o mixer, repouso constante/sem track compara diretamente
com o quaternion autorado não nulo (+0,5/−0,5rad mais pitch/roll da fixture).

São30 casos/27.520frames medidos: tracks constantes, animadas e ausentes; clipe
animado pausado; repouso longo; grupo girando; pais com yaw/pitch/escala0,01;
30/60/120Hz, dt0 e hitch0,3s; idle/idle1h/walk/walk1h/run/crouch; métodos reais
shoot/jump/die/revive; morte→revive sem frame intermediário; LOD; emotes Neck/Head;
pitch positivo/negativo definido e retorno neutro; guards de pitch em morte/LOD2. As pequenas cenas usam as velocidades naturais
legadas0,84/2,08m/s para controlar o tempo do clipe. O oráculo não executa nem
copia update(): define explicitamente controles de playback de fixture (fade0,16,
shoot0,06, jump0,08, death1,8× e velocidades limitadas0,45–3). Essas premissas
seguem a política atual e exigem revisão separada se ela for alterada; não são
valores de pose ou ganho de cabeça derivados do resultado do controlador.
Todos frames medidos verificam proxy final e finitude. Tolerância1e−6 é numérica.

## Execução e falhas fechadas

```sh
node tools/eval/head-yaw-check.mjs
node tools/eval/head-yaw-check.mjs --autoteste
```

Nominal RED sai1. `--autoteste` primeiro exige nominal GREEN e só então prova que
os seis mutantes falham: `yaw80` (delta removido antes do mixer),
`yaw-acumulativo`, `proxy-antes-pose`, `sem-pitch`, `sem-emote` e `pitch-fora-guarda`. O proxy antecipado
produz witness com erro e rotação do Neck/Head no mesmo frame. Cada mutante morto
imprime RED com exit0; sobrevivente sai1. CLI inválida, inclusive mutante vazio ou
desconhecido, sai2. Falta de fonte/clipe, erro de import ou adaptação temporária
ambígua sai3; infra não conta como mutante detectado. O autoteste também exercita
argumento desconhecido e execução sem produto num diretório temporário vazio.

## Checkpoint histórico preparado antes da retirada do yaw

Esta alteração de contrato foi preparada em lane isolada **sem editar produto ou
package**. Naquela fonte o nominal era RED causal enquanto yaw permanecia ativo.
O gate não foi aceito sozinho como correção do produto. A integração real abaixo
retirou a feature; os comandos nominais, sem flag, são os válidos no consolidado.

```sh
node tools/eval/head-yaw-check.mjs --proposta-sem-yaw
node tools/eval/head-yaw-check.mjs --proposta-sem-yaw --autoteste
```

Esse modo de preparação remove SOMENTE o bloco yaw61 da cópia temporária, registra
`proposal:true` e o SHA256 da fonte, e não altera glbchars. Depois da retirada real,
a opção deve falhar por bloco ausente; os comandos nominais são os válidos para CI.
GREEN proposto não é GREEN do produto nem aprovação visual.

## Histórico preservado

- `1906b2da8`/#1179 introduziu recentro yaw80%/clamp0,5rad/6s⁻¹, sem prova do eixo
  físico do rosto. A introdução causa onze bloqueadores do select após corrigir
  referências; distribuição cervical50/50 e100% foi medida e rejeitada.
- #1188 inline`4432950826`, revisão`5724445885`, base`21f264c519`: feedback real
  foi reproduzido, inclusive track constante otimizado pelo mixer.
  `5d0548a9a`/integração`6cc50e854` e `61afae0ad`/integração`96dce2261` corrigiram
  corretamente undo/transições enquanto a feature existia. O gate antigo protegia
  esse comportamento ativo; ele foi substituído junto da decisão explícita de
  rejeitar a feature, não para esconder produto ainda ativo.
- Evidências antigas ficam nos commits e audit externo: `HEAD-YAW-RED-R1.json`,
  `HEAD-YAW-GREEN-R7.json`, `HEAD-YAW-AUTOTESTE-R2.log`. Relatórios de atribuição:
  `docs/reports/SELECT-CI-CAUSE-20261031.md` e `SELECT-CI-BLOCKERS-20261031.md`.

O select e seu teto/dívida permanecem intactos. A régua nova não mede pixels,
face física, todos GLB/armas/skins ou mobile. Browser/Ego, revisão artística,
consumidor real e integração permanecem com o root.


## Integração do produto rejeitando yaw

A lane consolidada integrou a retirada real em8ff1098c0 (fonteb7a66871f), junto
com este contrato em e7ceff47d. O checkpoint preparado acima descreve a lane de
origem antes da retirada. O nominal válido agora roda sem flag; prova real fonteb7
GREEN30casos/27.520frames e6mutantes, sem variante. O consumidor select no Chromium
passou0/63bloqueadores com22dívidas históricas, referências0,675/23,6 intactas.
Isso preserva a pose; não aprova artisticamente rosto/pegada ou todosGLB/skins.
