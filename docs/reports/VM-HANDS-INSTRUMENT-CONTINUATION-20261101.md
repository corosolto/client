# Continuação: instrumento das mãos por arma (R805)

## Objetivo e definição de feito

Preservar a missão COROSOLTO: consistência visual de mapas, personagens e skins,
movimento/armas/ADS e acompanhamento de PRs/release/backend. Flavio #1158 excluído;
UI e redes sociais ficam para depois. Esta frente corrige somente o instrumento
herdado de #1170. Não certifica arte, contato, anatomia, movimento, mobile, MP ou release.

Feito desta autoria: ownership antes de writes, CLI antes de bootstrap, alias sem
negação de shell, nominal e seis mutantes com nonce/fontes/aplicação/failsets/exit/JSON,
negativos sem crédito de kill, evidências e checkpoint local recuperável.
Revisão independente, integração e publicação pertencem ao Root.

## Estado e procedência

- Branch: `codex/tp-hands-instrument-r805-20261101`.
- Base exata: `7f492da11b912c3ed9e83837e931d3e446f4089d` (#1170).
- WT própria: `worktrees/tp-hands-instrument-r805-20261101`.
- Autor: Codex. Sem GLM nesta lease; não herdar tentativas/pareceres da frente S4.
- R797: os dois P2 de ownership e `! node` são válidos. Alegação catálogo/CI refutada.
  O alias estrito `eval:vm-maos-armas-catalogo` continua literal.
- Checkpoint: o commit que contém este ledger; SHA exato no manifesto externo R805.

## Marcos validados

1. Baseline do bootstrap original, executado só em duas pastas fixture próprias:
   pacote externo fixture sobrescrito e `addons/keep` apagado. A negação de shell
   aceitou erros reais de CLI/importação/I/O/infra. Nenhum pacote alheio foi tocado.
2. `lstat`/`realpath`, pacote e filhos verificados antes de writes. Somente shim
   marcado próprio pode receber filhos ausentes; nunca sobrescrever/remover conteúdo.
   Legado exato local do harness/invariants é usado SOMENTE EM LEITURA, sem adoção,
   marcador ou reparo. Vendor local validado mesmo quando index já existe.
3. Controlador serial exige nominal antes de seis mutantes, nonce único, hashes de
   fonte, denominador e inputs iguais, aplicação positiva, exit1/RED e failset exato.
   Dívida é o mesmo objeto com chave/hash da pistola, movido sem alteração.
4. Node22.23.4: nominal 437 cláusulas, 26 armas, 40 rotas, 16 medidas e 24 NÃO MEDIDAS;
   zero vermelho novo e uma dívida `RIG:pistol@pintura`, hash `f468adc9279d`.
5. Seis mutantes V2: luva-por-arma15RED/aplicações5; pbr-por-arma10/5;
   troca-rig m4 1/1; troca-rig knife7/1; luva-crua m4 24/12;
   divida-paga zero RED novo/uma dívida quitada/aplicação1. Todos exit1.
6. Focais V2: 21/21 em 1.549s. Ownership externo/desconhecido recusado sem alteração;
   CLI precede bootstrap; survivor e não aplicado são RED; CLI/import/I/O/infra/
   timeout/nonce ou fonte incorretos são INFRA, nunca kill.
7. Após adicionar somente o ramo legado read-only, nominal final mantém os números.
   Execução real com shim legado local e links absolutos: GREEN; before=after em
   bytes/links, sem marcador criado; shim próprio restaurado em finally.
   Os seis mutantes não foram repetidos por orientação do Root: causalidade e corpo
   do checker/controlador permaneceram iguais; a diferença é só o suporte de legado.
8. Catálogo ausente com `--exigir-catalogo`: exit3/INFRA, 24 rotas ERRO, zero NÃO MEDIDA.
   Nenhum asset privado foi montado/copiado/gerado; strict não recebeu crédito de kill.

## Rejeitados e limites

- CONTROL-V1 rejeitado: failset esperado da faca incluía cache, mas o código real
  falha troca de time. Probe preservado e expectativa corrigida; nenhum teto mudou.
- FOCALS-V1 (18/18), NOMINAL-V1 e CONTROL-V2 antecedem o ramo legado read-only.
  NOMINAL-V2, LEGACY-CONTROL e FOCALS-V2 vinculam as fontes finais.
- Catálogo privado completo UNRUN. 24 rotas não medidas continuam explícitas.
- Suite global/browser/visão3:2/MP/build/push/merge/GH e aprovação de arte UNRUN.
- Sem produto, manifest, assets, dependências compartilhadas ou outra WT alterados.
- O novo shim local ignorado é exclusivo desta WT e resolve o vendor desta WT.

## Evidências e próximo passo

Prefixo externo: `audits/2026-10-31-visual-consistency/TP-HANDS-INSTRUMENT-R805-`.
BASELINE(.mjs/.json/.log), PREFLIGHT.json, CONTROL-V1/V2(.json/.log),
LUVA-PROBE.json, NOMINAL-V1/V2(.json/.log), FOCALS-V1/V2.log,
STRICT-MISSING(.json/.log), LEGACY-CONTROL(.mjs/.json/.log), REPORT.md,
MANIFEST.json e WHOLE.diff. Logs grandes ficam fora da árvore versionada.

Reprodução focal: Node22 `--test tests/vm-hand-continuity-control.test.mjs`.
Alias normal: `npm run eval:vm-maos-armas` (nominal+6, serial). O alias catálogo
permanece separado e estrito. Root deve ler delta completo e realizar crítica
independente antes de integrar aliases atuais e publicar. Não há permissão de push
nesta lease.

## Hashes de fonte desta entrega

- `tools/eval/vm-hand-continuity-check.mjs`: `51a7ee96360567110f9b89740d64dd2306279f6b85e57b13baaffa76ece990bc`.
- `tools/eval/vm-hand-continuity-support.mjs`: `b65ebbad95d5a2c0286028493cf8f045f04594a2d8cf5305b0edb0da4064d538`.
- `tools/eval/vm-hand-continuity-control.mjs`: `a2e52427ec61a226bd819586a44b7350351d79bfa7062d43a4b766cb80ef5629`.
- `tests/vm-hand-continuity-control.test.mjs`: `e4e99b65b18ee82d96509d0f831caeea7097c0749371f32673de585335845bc4`.
- `package.json`: `ee886d7fabceec06ab98ad5a71bbd810a19b9e57529bd0305aba2708aa151b67`.

## Integração Root R821/R826

- Nova WT `worktrees/tp-hands-integration-r821-20261101`, branch
  `codex/tp-hands-integration-r821-20261101`; a WT autoral R805 permaneceu intacta.
- Composição com `fa521531b976faaee6c007660c5cfb1fd2a504ae` (#1208).
  O package preserva todos os campos/aliases atuais e aplica somente os cinco
  scripts intencionais de #1170/R805; produto público byte-exato ao pai atual.
- R826 Node22: 21 focais PASS (2,038s), controlador nominal+seis mutantes PASS
  (10,704s), nominal estrito PASS (1,441s). O controlador usou também as rotas
  privadas reais, sem copiar/montar assets. Estrito: 1.037 cláusulas, 26 armas,
  40 rotas medidas, zero não medida, zero vermelho novo e a mesma dívida nomeada
  `RIG:pistol@pintura` / `f468adc9279d`.
- R822 vinculou as 24 rotas fab por SHA completo/bytes/URL em
  `/Volumes/Zenith/Assets/game/corosolto/private-assets/generated`; o catálogo
  geral de 63 permanece parcial e o overlay default tem AWP/SVD antigos.
  Essa fonte foi definida somente no ambiente dos comandos, sem assets no Git.
- Evidências externas `TP-HANDS-INTEGRATION-R821-*`,
  `TP-HANDS-INTEGRATION-R826-*` e `VM-PRIVATE-CATALOG-R822-*`.
- Falta: publicação ordinária da integração, review atual e crítica independente.
  Este resultado mede consistência estrutural; não aprova anatomia/contato visual,
  movimento, mobile físico, MP ou lançamento, e não fecha a dívida #1128.
