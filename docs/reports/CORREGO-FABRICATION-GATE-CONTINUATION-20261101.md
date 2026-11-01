# Córrego — continuidade do contrato de fabricação local

O seletor pré-PBR foi substituído pela CLI dedicada que já mede os materiais
atuais. Produto, assets e checker dedicado permanecem iguais. Este reparo não
aprova a aparência do mapa.

## Estado e procedência

Lane `codex/corrego-fabrication-gate-r503-20261101`, parent
`abcfdf248322a1deebbccdf3444b7d5800b77e2b` (checkpoint de telemetria).
O lease Córrego cobre este ledger e `tools/eval/map-local-fabrication-check.mjs`.
O parent foi incorporado por fast-forward, preservando os dois arquivos locais.
A publicação pode empilhar os dois microcommits sobre a correção da Piscina
`4d23731b540a27b27d6d38b6f2be837f5dbcbb97`; isso não muda a staging do release.

Autoria Native R504, reutilizando a proposta GLM R449 já adjudicada, sem nova
chamada de modelo. Root executou R511/R513/R517. Os recibos e fontes dos
controladores ficam em `audits/2026-10-31-visual-consistency`, na raiz agregadora
do projeto. O manifesto R504 preserva o estado anterior à validação.

## Contrato

O ramo Córrego chama `corrego-masonry-material-check.mjs` por
`process.execPath`, com caminho e cwd derivados de `import.meta.url`, sem shell.
Timeout de 60 s, buffers de até 1 MiB e SIGKILL são limites de recursos do
subprocesso; não são limiares artísticos.

Nominal exige exit 0, um único objeto JSON no stdout, os campos atuais,
`mutante: null`, GREEN, falhas vazias e as contagens autoradas do dedicado.
O self-test só concede crédito a `repeat-diverge` com exit 1, RED e multiset
exato `muro-samplers: 1` e `muro-sampler-transform: 1`, consistente em
`esperado`, `obtido` e `falhas`, com mensagens não vazias.

Erro de processo, sinal, JSON/schema inválido, exit de uso/infra ou conjunto
divergente abortam o pai com exceção e recibo limitado, sem crédito de mutante
morto. O antigo `map = null` foi removido do Córrego porque não alcançaria o
mundo do filho. Os outros ramos preservam seletores, medidas, mutações e ordem.

## Validação real

- R511: checker antigo reprovou em `Cannot measure runtime material: corrego`
  após Escadão, Mansão e Penitenciária passarem; Amazônia não foi visitada.
  Somente três imports foram relocados para executar a cópia externa, com o
  produto atual inalterado.
- R513: Node22, instalação limpa, CLI dedicada nominal GREEN/exit 0 e mutante
  exato RED/exit 1. Genérico nominal passou nos cinco mapas. O alias oficial
  `npm run eval:map-local-fabrication` passou com os cinco mapas e os cinco
  créditos de mutação esperados. Fontes permaneceram iguais durante as provas.
- R517: função/ramo reais extraídos para VMs novas, com `spawnSync` controlado
  na fronteira. Os dois controles positivos aceitaram os recibos reais. Os
  controles negativos rejeitaram JSON, schema, identidade, contagens, conjunto,
  mensagens, status, sinal e erros de timeout/buffer inválidos, sem crédito de
  mutante. Comando, argumentos, cwd e opções também foram conferidos.
- Sintaxe já passou na autoria; documentação, arquitetura, comentários e
  whitespace passaram no ponto funcional R513. O ledger final ainda deve passar
  por whitespace antes do checkpoint.

R513 V1 foi rejeitado como instrumento: o controlador juntou o diagnóstico de
boot do stderr ao JSON do stdout e falhou no parse. Streams separados corrigiram
o controlador; o dedicado e o produto não mudaram. A instalação válida anterior
foi reutilizada. R517 injeta resultados de timeout/sinal/buffer; não mede uma
expiração real de 60 s.

## Limites e continuação

O contrato mede materiais/samplers do harness Node. `texelReference` é referência
UV autorada, não largura da imagem carregada. Não prova pixels, bytes PBR servidos,
aparência, mobile físico, física global ou release. As contraprovas dedicadas
continuam existindo sem alteração.

Pronto para publicação exige crítica independente do diff final, checkpoint
recuperável e push normal; pronto para merge exige CI e revisão formal atuais.
Os recibos posteriores ficam no ledger canônico da missão e nos relatórios da
fila, sem antecipar aceitação neste documento.

A missão integral permanece: PRs/release/backend, mapas, personagens, skins e
movimento 1P/3P/AK ADS. Flávio #1158 está excluído; fluxos de UI e redes sociais
ficam para a fase seguinte. O próximo passo local é revisar o diff completo dos
microcommits de telemetria e Córrego, mantendo a base da Piscina.
