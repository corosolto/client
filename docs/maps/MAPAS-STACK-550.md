# Mapas stack 550 — UV em metros

## Objetivo e fronteira

Reaplicar somente a escala UV por metros em Córrego, Quebrada e Ferro Velho sobre
`origin/codex/mapas-stack-548-v2`; gerar o layout de grafite no servidor desta
worktree. Não avançar #551, não fazer merge nem deploy.

## Estado validado

- Branch: `codex/mapas-stack-550-v2`; base: `9113ed82`.
- Baseline #548 / corrigido: Córrego `262 / 7.23x` -> `128 / 1.03x`;
  Quebrada `114 / 2.22x` -> `128 / 1.00x`; Ferro `71 / 1.45x` -> `128 / 1.00x`
  (mediana / p95-mediana do `texel-check`).
- Mutantes reversíveis restabeleceram Córrego `262 / 7.23x`, Quebrada
  `114 / 2.22x` e Ferro `71 / 1.80x`; foram restaurados antes dos gates.
- Vermelhos assumidos, não escondidos: Córrego `TEXEL3b 5.2x`; Quebrada
  `TEXEL5 9.1%` sem medida; Ferro `TEXEL3b 29.6x`, a tampa minúscula vermelha
  legítima preservada.
- `campomorro` já existia no fingerprint na base #548; o hunk de #550 o
  duplicava sem efeito. A declaração herdada foi preservada, sem duplicata.
- A regeneração global de grafite não é aceitável: o CI do PR #565 reprovou
  Praça dos Poderes (`30,5% < 35%`) e Ferro Velho (`45,6% < 46%`). A reprodução
  limpa em Node 22 separou a causa: na base #548, Praça foi `394/1027` (`38,4%`)
  e Ferro `751/1529` (`49,1%`); no head regenerado, foram respectivamente
  `310/1027` (`30,2%`) e `697/1529` (`45,6%`). Os denominadores idênticos provam
  que não houve alteração nas placas/cobertura de parede pelo UV; perderam-se
  peças do layout assado. A Praça não é herdada, pois não reproduz
  byte-identicamente na base. Recibos temporários: `/tmp/mapas550-ci-repro/`.
- O layout preservado da base recompõe o censo, mas não é uma correção publicável:
  `eval:grafitelayout --duplo` aponta seis F2 já vencidos na própria base. O
  mecanismo atual faz hash do arquivo inteiro do mapa, confundindo UV com entrada
  espacial, e seu rodapé global pode aparentar frescor depois de passe parcial.
  Não atualizar os FPs sem uma assinatura de superfícies observada no navegador;
  isso mascararia o defeito conhecido de `impressao()`.
- Gates que estavam verdes antes da reprodução: `syntax`, `eval:grafitelayout`,
  `eval:mapcontrato`, `eval:spawn` (276), `eval:ctfround`, `eval:ctfwin`,
  `eval:shaderbudget`, `eval:corrego-contract`, `eval:preload`. O estado atual
  do head não passa `eval:grafite` no Node 22 do CI; não declarar o portão local
  completo verde até haver correção real.

## Runtime e performance

Capturas Chrome/ANGLE SwiftShader 1200x800 em
`artifacts/mapas-stack-550-v2/runtime/`: pares 5x5/8x8 de cada mapa, sem page
errors. Recibos: `runtime-receipt.json` e `perf-fresh-processes.json`.

Crítica adversarial das seis imagens: Córrego perde becos/coberturas sob névoa e
fundo externo; Quebrada deixa muito céu vazio e expõe repetição no campo; Ferro
perde materiais e layout sob névoa azul. Os 8x8 são crops horizontais que não são
comparáveis aos 5x5. São enquadramentos aéreos de `mapview`, sem POV, bots reais
ou movimento; não provam rotas ao nível do jogador, anisotropia em ângulo rasante
ou qualidade final. A aprovação humana 3:2 continua pendente e requer POVs de
rota, ângulos rasantes e sequência temporal.

Em processos Chrome frescos, os contadores de cena foram Córrego 7.567.041
triângulos/486 calls, Quebrada 661.722/1.516 e Ferro 528.891/741. São contadores
SwiftShader, não FPS de GPU. Portanto a alegação histórica de 11M triângulos e
qualquer queda abaixo de vsync em Córrego/Quebrada permanece bloqueio explícito
para um benchmark de GPU real; não foi otimizado fora deste escopo nem convertido
em aprovação visual.

## Entrega e próximo passo

- Commit publicado: `c5e0be715`. Não há correção adicional publicada enquanto a
  assinatura semântica de grafite não for implementada e coberta por mutante de
  parede; a árvore de trabalho não deve carregar o layout-base como se fosse novo.
- PR empilhado: #565, base `codex/mapas-stack-548-v2`, sem merge/deploy e sem #551.
- `npm run check:deploy` passou 37/37 depois do commit; checks remotos estavam
  em fila na abertura do PR.

O próximo trabalho autorizado deve ser apenas a revisão humana/benchmark GPU dos
bloqueios acima; não avançar a stack automaticamente.
