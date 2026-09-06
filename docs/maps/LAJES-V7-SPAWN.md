# Lajes V7 — respawn em travessa estreita

A direção humana da [V6](LAJES-V6-DIRECAO.md) exige ruas de aproximadamente
2m, travessas de respawn sem pátios e somente o campo central amplo. A medição
original MAP2B continua registrada: no SHA `fa5658f0`, todos os oito slots
mediram folga de 1,05m e área contígua de 16,1–17,3m², abaixo dos mínimos
genéricos de 1,20m e 40m². Evidência fresca em
`artifacts/lajes-visual/v7/gates/map-lajes-fresh.{log,json,meta.json}`;
execução de 336,95s, sem alterar a planta ou os limites originais.

O contrato alternativo mede a capacidade física de nascer e sair da travessa.
É exclusivo de Lajes e só pode substituir a obrigação de pátio de MAP2B quando
todas as cláusulas abaixo passam. A integração deve cobrar LSP1 de forma
independente, mesmo se o JSON geral de mapas estiver ausente ou desatualizado.
Não adicionar Lajes ou MAP2B ao KNOWN-RED. Os demais mapas conservam MAP2B.

- Duas equipes de quatro slots, todos no térreo livre e fora do campo; altura
  efetiva de nascimento conferida com `Game._spawnY`.
- O corpo usa raio de 0,38m, igual às chamadas de `Game._collide` no movimento.
  A separação entre slots de uma equipe é pelo menos o diâmetro de 0,76m.
- Cada slot admite dois corpos lado a lado: centros deslocados em ±0,38m
  sobre x ou z, com apoio no chão e sem correção da colisão real.
- Cada slot obtém `world.findPath` até o centro do campo V6
  (retângulo x ±5,1m e z ±7,5m). O caminho precisa começar e terminar nos nós
  consultados, usar arestas reais e incluir a ligação física desde o slot e
  até o destino. Todos os segmentos são caminhados em passos de até metade
  do raio (0,19m), mantendo o apoio anterior e chamando `Game._collide` a cada
  passo. Colisão, salto de altura, ausência de caminho ou piso acima de 0,30m
  reprovam; 0,30m é a faixa de degrau usada pela colisão do runtime.

`tools/eval/lajes-spawn-space.mjs` exporta `medirRespawnBeco(game)` e retorna
`{ok,evidence}`. Não carrega malhas para raycast, não aceita alturas de laje
como atalho e não grava arquivos. Tolerância de 1e-6 é apenas erro numérico.
O verificador cria o Game real pelo harness; mede geometria de colisão e apoio,
sem afirmar validação de aparência, GLBs carregados ou desempenho gráfico.

Consumo: `node tools/eval/lajes-spawn-space-check.mjs`. Somente sucesso completo
emite `✓ LSP1`; falha retorna código 1. O resultado JSON completo acompanha
o resumo. Mutantes alteram o mundo em memória e precisam derrubar a cláusula
correspondente: `--mutante=slot-dentro-parede`,
`--mutante=slots-coincidentes` e `--mutante=saida-bloqueada`.

Normal e restauração passaram: oito saídas físicas e 1.334 sondas de colisão.
Parede no slot derrubou `terreo-livre`, `dois-corpos` e `saida-terrea` (7/8
saídas); slots coincidentes derrubaram somente `separacao`; barreira entre
travessa norte e campo derrubou somente `saida-terrea` (4/8 saídas). Três
mutantes saíram com código 1, normal/restauração com 0. A sequência final
levou 5,646s / 4,886s / 4,376s / 4,042s / 3,910s por processo, incluindo
imports e boot. Evidências em
`artifacts/lajes-visual/v7/gates/spawn-beco-mutations.json` e logs
`spawn-beco-{normal,slot-dentro-parede,slots-coincidentes,saida-bloqueada,restaurado}.log`.

Estado: implementação validada localmente sobre `codex/lajes-visual`, sem
mudanças em produção. Próximo passo: integrar o consumo independente em
invariants e no CI pelo responsável da integração, preservando a direção
visual aceita; revisão independente e checks finais da integração pendentes.
