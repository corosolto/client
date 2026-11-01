# Continuação — contratos visuais/CI 2026-10-31 (frente Escadão, patch estático)

## Objetivo total (contexto)
Endurecer os contratos locais de web/mapa e física para validar o release de consistência visual.
Concluído exige: runtime no pai com Node 22/26, mutantes causais, auditoria browser dos 14 mapas reais
e portões de PR/release. **Esta tarefa é só um patch estático: nenhum GREEN de runtime foi verificado aqui.**

## Locação
- Base SHA: `7a9d47b6f5be4fe1b0fe67f49767c115167acfdd`; branch `codex/ci-visual-contracts-20261031`;
  worktree `worktrees/ci-visual-contracts-20261031`.
- Lease de 5 arquivos no total (chamadas delimitadas da mesma linha GLM incluídas): `package.json` (só o script `check:web`),
  este teste Escadão (`tools/eval/escadao-descent-check.mjs`), helper semântico/`proof-check`,
  e este ledger.

## Escopo desta frente
Reescrito apenas `tools/eval/escadao-descent-check.mjs` (escrita autorizada) e criado este ledger.
`game.js` é somente leitura (a leitura de faixas foi bloqueada pelo guard de caminho exato desta frente;
os valores usados são as constantes fixas do pedido aceito).

### Motivo
O teste antigo exigia `.5 < ápice < .7` para o salto parado. O commit humano aceito `e555cadf11`
(31/10) subiu o impulso padrão de 5.0 para 5.6 — física aprovada, teto do teste é que estava velho.
`game.js` L7085 usa `world.jumpImpulse ?? 5.6`; L7097 aplica gravidade 20.6 antes da integração de
posição em L7123. Com dt=1/60, o oráculo discreto independente dá ápice ≈ 0,71511 m e pouso no frame 32;
`v²/(2g)` contínuo não corresponde a este integrador.

### Oráculo novo (o que o teste agora prova)
- Constantes fixas do pedido aceito: impulso 5.6, gravidade 20.6, dt 1/60, 70 frames.
- Asserção de que o mundo Escadão **não** sobrepõe `jumpImpulse` (usa o padrão aprovado; nada é atribuído).
- 70 estados de referência independentes: vy inicia 5.6; por frame `vy -= 20.6*dt; h += vy*dt`;
  `h<=0` → zera h e vy e `grounded=true`; senão `grounded=false`. Nenhum valor esperado sai da trajetória do Game.
- Reset completo entre trajetórias: `g.time` para o tempo inicial capturado, snap flag, pos/vel/grounded,
  weapon/yaw/crouchF/scoped/`_spaceHeld`/`jumpBufferedUntil`/`coyoteUntil`/`mantle`/`mantleF`/`_mantleScanAt`.
  Lógica de aceitação de input do Game não é alterada.
- Ponto plano real (0,26) já testado; altura do chão capturada uma vez; compara altura relativa real vs referência;
  exige x/z imóveis (tolerância só de arredondamento).
- Um salto com snap LIGADO e outro DESLIGADO; só o frame 0 tem `jump=true`. Comparação frame a frame contra o
  oráculo (igualdade booleana exata em `grounded`) e ON vs OFF. Tolerância numérica única:
  `Number.EPSILON * 8 * 70 * 6` — limite conservador de arredondamento duplo (8 operações
  aritméticas/frame × 70 frames, magnitude ≤ 6, impulso fixo aprovado 5.6 e trajetórias abaixo
  dessa magnitude), não tolerância absoluta larga; segue muito abaixo de 1e-12.
  Asserções explícitas: primeiro frame com vy>0 e fora do chão; ápice real = ápice de referência (ambos logados);
  pouso no fim com `grounded=true` e vy=0; equivalência frame a frame ON e OFF.
- Falha se: impulso do produto for 0 (primeiro frame não sai do chão), snap forçado durante o arco
  (diverge em `grounded`/altura), ou a referência 5.6 mudar sem o oráculo acompanhar.
- `W.snapDownSteps` original capturado uma vez (`snap0`) e restaurado num `finally` de nível superior
  que cobre todo o corpo executado — reset, descida, ambos os ramos (inclusive `--mutante=sem-snap`)
  e todas as asserções, inclusive sob throw ou falha; `process.exit` só ocorre após esse finally.
  O `finally` do `runJump` e o da fixture de queda (`groundHeightAt`/`colliders`) seguem intactos.
  Reset também zera `mantle` para `null` (representação de ausência de mantle do Game), não `false`.

### Contratos existentes preservados (inalterados)
`--mutante=sem-snap` com gap>.25 e air>0; descida normal gap<.025 e air=0; subida chegando ao mirante;
pulo intencional em descida de escada gap>.5; queda real de 2m. Nenhum limiar afrouxado, nenhum caminho removido.

## Rejeitados nesta frente
- Simplesmente alargar o teto do ápice.
- Tolerância contínua ±.06 ou estética qualquer.
- Aceitar crash de setup como "verde".
- Waiver amplo de 404 de API (sem método/ação/body/initiator, não dá para atribuir).

## Estado do CI publicado (31/10, contexto do pai)
SHA `31dcb7d1d1c9599d4360fc6127f7826eab4e281c`: teto de salto velho; nova oclusão de CTA e
2 `/api/social` 404 não atribuídos (API sem method/action/body/initiator — sem ignore amplo nem endpoint
inventado). CTA/CSS, placar e atribuição de API pertencem ao pai/outros owners; nada mudado aqui.

## Achados de bot (posições registradas, sem mudança de código aqui)
1. `!cancelled()` — refutado pela documentação oficial da status function do GitHub.
2. `check:web` — válido localmente: a auditoria browser do CI já cobre os 14 mapas, mas a nominal atual
   omitia; corrigido na frente do `package.json`.
3. Economia — refutado: `compra.rearmar` precede o branch fallback "mode all weapon".
4. Córrego — refutado: `matMadeiraBruta` declarado em `map_corrego.js:149`.

## Estado das demais chamadas delimitadas desta mesma linha GLM (contexto, não verificado aqui)
Não são frentes independentes de outros owners: são chamadas delimitadas do mesmo trabalho GLM neste worktree.
- `check:web` agora pede `eval:grafite-atual` antes do proof/self-test e do `eval:select`;
  nenhuma saturação legada 90–95% restaurada.
- Helper semântico: contagem exata 10 = 9 headers nominais (novo `//eval:grafite-fiel`) + 1 header falso
  injetado por MA1/MA2; whitelist independente, contagem não derivada do filho; fixtures positivo/negativo
  adicionados, **execução pendente no pai**.
- Provas causais pendentes no pai: impulso zero, snap forçado, snap removido. Merge/release são do pai.

## Supervisão estática CONCLUÍDA (pelo supervisor, não por GLM)
- `node --check` aprovado nos 3 arquivos JS em Node v22.23.4 e v26.12.1.
- `package.json` parseia como JSON; comparação byte a byte contra HEAD mostra que a única mudança
  é o alias `check:web`.
- `git diff --check` aprovado (sem erro de whitespace).
- Supervisor leu o Game/harness do produto: gravidade 20.6 aplicada antes da posição; impulso padrão
  aceito 5.6; `testMode`/countdown/live do harness aceitam input com reset para o `g.time` inicial capturado.
  A leitura de faixas do `game.js` pelo GLM foi bloqueada pelo guard — limitação de autoria mantida aqui.

## PENDENTE de runtime (não executado, não reivindicado)
Execução de runtime no pai com Node 22/26; MA1/MA2 crus; controles físicos de impulso zero,
snap forçado e snap removido; auditoria browser real dos 14 mapas. Nenhum GREEN de runtime foi
verificado por esta linha de trabalho.

## Logs GLM desta linha (em `audits/2026-10-31-visual-consistency/`)
- `CI-CONTRACTS-GLM-AUTHOR-R17.log` — interrompido com exit 130 após uma remoção inválida de vírgula;
  estado intermediário inválido foi rejeitado, não entregue.
- `CI-CONTRACTS-GLM-CORRECTION-R17.jsonl` — exit 0; reparou o estado inválido e escreveu
  package/helper/fixtures de prova.
- `CI-CONTRACTS-GLM-ESCADAO-R17.jsonl` — exit 0; escreveu este oráculo + ledger.
- A fonte após os refinamentos deste prompt será re-checada sintaticamente pelo supervisor.

## Owners e comunicação
Contribuidores preservados: #1155 (mantle), #1160 (Javaporco), #1158 (Flávio). Nenhuma mensagem externa
enviada por esta tarefa.

## Artefatos
Pasta `audits/2026-10-31-visual-consistency`; relatórios `CI1188-TRIAGE-R17.md` e prompts/logs GLM.

## Entrega
Sem commit/push. Handoff recuperável = este patch isolado + ledger. Validação estática do supervisor:
`node --check` (3 arquivos, 2 versões de Node), parse JSON + diff byte a byte do `package.json`,
`git diff --check`. Validação de runtime explicitamente pendente (seção acima).

## Validação consolidada posterior pelo Root, 22:11 UTC

Patch aceito focalmente, sem publicação ainda. QA-ESCADAO-CAUSAL-R19.json: Node22/26, nominal e sem-snap exit0; impulsozero, legado5.0, snapforçado e gravidade20.0 reprovam por AssertionError física, marcador exato1vez, exit1. São12execuções aceitas. Loader altera apenas módulo em memória; game.js byteidêntico em disco. Root observou ápice real/ref.715111, sem-snap gap.305/77framesaéreos. Helper/MA/proof-check8execuções adicionais verdes; aliases consolidadosMA/comentário Node22/26 exit0. Crítico fresco CRITICO-CI-CONTRACTS-R19.md leu5arquivos completos e fronteiras, CLEANfocal, SHAa384ac74e0daf6622e2cdad33ced120795998fed0949711351fca230eb673458. Auditoria14mapas/check:web segue pendente de browser serial; nenhum wholePR/merge/release aprovado.
