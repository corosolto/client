# Continuação da revisão 8ee — R73, 01/11/2026

Objetivo integral da operação: consistência de mapas/UI/personagens/skins/armas,
integração revisada em PR, merge e release verificado. #1158 permanece excluída;
Javaporco, itens protegidos e O1 faca/palma/luva pertencem a outras frentes.
Esta lane cobre somente autoridade documental de grafite pós-alias, filtro local de
pickups e refutação de áudio. Não declara `8ee224e48` aprovado nem release concluído.

Base exata: `8ee224e48b1f435d0076817b42bf0635846350e6`.
Branch: `codex/review-r71-fixes-20261101`.
Worktree: `worktrees/review-r71-fixes-20261101`, isolado e inicialmente limpo.
Commit documental validado: `dd197f5c25657b7c7ea388fd7b01d157244389a7`.
Checkpoint de pickup/régua: o commit que adiciona este ledger. O SHA exato posterior
à matriz fica em `E/FINAL-MANIFEST.json`; consulte também `git log -1` desta branch.

Auditoria privada persistente (A): `audits/2026-10-31-visual-consistency`.
Evidência desta lane (E): `A/review-r71-fixes-r73/`.
Esses caminhos partem do aggregate `/Volumes/Zenith/Projects/game/corosolto/csbrasil`,
não do worktree Git. Os `audits/` citados aqui e nos contratos são evidência externa
local; não existem sob este WT, não são links GitHub e não há promessa de upload.
CodeRabbit foi dispensado pelo dono em
`operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md`;
crítico independente e QA pertinente continuam obrigatórios e pertencem ao Root.

## Autoria e limites de ferramenta

OMP `zai/glm-5.3` iniciou às 04:30:41Z; limite externo fixo às 04:36:41Z interrompeu
a rodada com exit130. Não houve diff de produto. `GLM-ADJUDICATION.json` registra
REJECTED_INCOMPLETE; medições anteriores são preservadas sem crédito de implementação.
Raw, lease, scripts e diff vazio foram congelados antes de checks nativos em
`E/author-freeze/manifest.json` (04:37:10Z). Não houve nova rodada GLM.
Após autorização explícita do Root, Codex assumiu implementação e testes nativos.

## Achados aceitos e mudanças

Grafite: a documentação promovia SURVEY6 anterior ao alias como atual. Os três
contratos agora apontam Ego14 R21 pós-alias: 14 mapas, 458 peças, cinco contadores
zero e preferências restauradas. `E/preflight-r21-pins.json` reconferiu os 14 hashes raw
e os seis pins de fonte de `A/critico-curation-ego14-r21/coherence.json` contra a base.
`A/CRITICO-CURATION-EGO14-R21-COERENCIA-R1.md` verificou 597 relações. SURVEY6/R6/R4
anteriores ao alias são históricos; o bake 437/fingerprint `161c4394b4a2247a` já existia.
O log R21 só conserva GREEN: envelope bruto e hashes de JS efetivamente servidos
naquela navegação não existem nessa prova. Não foram reconstruídos nem certificados.

Pickup: o constructor com economia OFF preservava IDs proibidos e desconhecidos.
O filtro local agora conserva somente chave própria de `WEAPONS` aceita pelo modo,
removendo lista e malha dos demais antes do refresh real. A guarda ecoON original,
`_pickupAllowed` global, economia, combate e drops de abate foram preservados.
`E/historical-off-filter.json` ancora o comportamento anterior em `origin/main`
local `4cf8dd99d813fe7caa323b5e9567df3c86957f1a`: guarda de ID, modo e lista de válidos.

Medição anterior, Game real `8ee224e48` (`E/before-pickup-quebrada.json`):
12 pickups, uma AWP, duas deagle, 12 malhas anexadas, economia OFF.
As expectativas do gate são anteriores ao fix, não derivadas do resultado filtrado.
Root confirmou o RED complementar no Ego normal, modo SÓ AWP:
`A/PICKUP-AWP-ACTUAL-BEFORE-R73.json/png` contém 12 pickups e 11 proibidos na cena.
Sem claim de movimento ou de todos os 11 visíveis simultaneamente na câmera.

`E/native-ruler-before.log` ficou RED antes de editar game.js em
PM5/PM7/PM8/PM9–PM12. A fixture all anterior também reteve quatro desconhecidos,
incluindo `toString`, `__proto__` e `constructor`, na lista e na cena antes do refresh
real (`E/native-own-key-before.json`, exit1). A régua não substitui o método de
produção: o wrapper registra a entrada e delega integralmente ao original.

Após o fix, nominal Node22: all12/AWP1/pistolas2/faca0; PM1 limpa com loja ON;
PM2–PM4 mantêm all legítimo; PM6 mantém nascimento de drop (38→39 nessa execução).
PM9–PM12 verificam lista, malha e referências válidas em quatro modos.
O mutante sem-filtro-off detectou exatamente o RED anterior e a nova execução
nominal ficou GREEN. Matriz focal Node22/26 concluída, todos os casos finais abaixo
com exit0. Nas variantes de detecção, exit0 significa que as falhas exatas foram
observadas; os mutantes permanecem semanticamente RED.

- Nominal: `native-nominal-r2-22.log`, `native-nominal-r2-26.log`.
- Baseline final: `native-baseline-final-22.log`, `native-baseline-final-26.log`.
- Clear-all e consumidor `npm run eval:match-pickups`: `native-consumer-22.log` e
  `native-consumer-26.log`; inclui o autoteste de modelos iniciais, com mutante
  sem-refresh RED em PIM2/PIM4 e CLI inválida exit2.
- OFF removido: `native-sem-filtro-22.log`, `native-sem-filtro-26.log`; falhas exatas
  PM5/PM7/PM8/PM9–PM12, seguidas de `native-revert-nominal-22.log`/`26.log` GREEN.
- Unknown com chaves herdadas: `native-own-key-22.log` e `native-own-key-26.log`.
- Sintaxe de game/régua em ambos os Nodes; `docs:check` e `arch:check` em dia.
  Os geradores em modo PR preservam as contagens para o release e não produziram diff.

A primeira e a segunda tentativas de baseline ficaram falsamente RED em PM12 por
exigir observação de uma chamada que o constructor histórico não fazia. O método
`refreshPickupModels` já existia em `f4bcffdf2` (uma ocorrência, só a declaração).
Logs `native-baseline-{22,26}.log` e `native-baseline-r2-{22,26}.log` foram preservados
como falhas do instrumento, sem crédito de detecção. Apenas esse SHA fixo dispensa a
observação temporal; mantém a mesma fixture real e exigências de lista/malha/referências
finais. Nominal e mutantes atuais exigem callback real. No subconjunto original PM1–PM6,
baseline e clear-all continuam falhando exatamente PM2–PM5; a extensão acrescenta
PM7/PM9/PM10/PM11. A prova antiga não foi reescrita. Resultado final agregado:
`E/native-verification-final.json`.

## Áudio: achado refutado, fonte inalterada

Em `public/js/audio.js`, `_beep` recebe `direct` no sétimo argumento (linha350 na base);
`_bus` (341) escolhe master somente para `true`, ou usa o próprio AudioNode recebido.
`flashPop` (951) passa o bus como sétimo argumento, encaminhando volume/pan corretamente.
Inserir `true` e passar bus no oitavo encaminharia ao master e descartaria esse oitavo
argumento. Nenhuma alteração de áudio nem teste/limiar inventado.

## Próximo passo

Root despacha crítico fresco somente leitura sobre todo o diff e suas fronteiras,
usando o checkpoint e `E/FINAL-MANIFEST.json`, e faz o QA que julgar pertinente.
A definição de pronto desta lane inclui essa crítica e a adjudicação do Root, ainda
pendentes; testes locais verdes não encerram a missão integral. Esta lane não abriu browser/headless,
não rodou full107, não fez push/PR/GitHub mutation/Mint e não tocou outros worktrees.
Sem aprovação artística geral, produção/mobile/MP/FPS ou autorização inferida de release.

## Adjudicação focal Root R77

O crítico independente `CRITICO-REVIEW-FIXES-R75.md` leu os sete arquivos e todas
as fronteiras afetadas; não evidenciou P1/P2 de produto. Root conferiu 17 bindings
do relatório/manifesto e aceitou os seis limites do instrumento sem ampliar o crédito.
O único P3, ambiguidade da lista de CLI PM, foi corrigido explicitando
`--mutante=sem-filtro-off`. Fonte do jogo e régua permanecem byte a byte no freeze.
Root repetiu essa contraprova no schema final em Node22/26: nominal anterior GREEN,
RED exato PM5/PM7/PM8/PM9–PM12 detectado, exit0 natural e WT limpo
(`A/ROOT-PICKUP-FINAL-SCHEMA-R76.json`). Browser final e revisão atual da PR
ainda pendem; esta crítica focal não substitui a crítica final integral.
