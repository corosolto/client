# R1153: escala UV dos três pisos

Objetivo: corrigir somente UV das duas calçadas Quebrada e piso do mirante Escadão,
com fallback/onLoad idempotentes e dimensões/repeat adotados. Posições, normais,
índices, colisão, navegação, materiais/texturas compartilhados e assets preservados.
Base9414b56cedcdc80383becb448b6fc621ab6a3339 em branch própria
codex/surface-uv-scale-r1153-20261101; W842/backend/owners não recebem writes.

## Milestone1: instrumento e antes

Probe executa MAPS.build reais pelo harness e captura TextureLoader na fronteira,
sem renderer/rede/asset privado. Medição antes do fix, em2,059s: sete cláusulas UV
vermelhas nos três planos e ramos externos, exit1 esperado. Quebrada46,545/5,818pxm;
mirante fallback7,111/7,407pxm. Um warning herdado de múltiplas instâncias Three foi
preservado. Nenhum score MUP ou relação pixel/causa é inferido.

A fixture versionada guarda os hashes reais de geometria/UV nãoalvo/material
(compartilhamento incluído), colliders/spawns/nav/pickups, texturas de chão
compartilhadas e cursor RNG. UV dos três alvos é a única exclusão do hash; sua
correção será medida por derivadas independentes contra TEXEL_ALVO128 vigente.
Este checkpoint introduz instrumento/referência; a ligação ao gate e o reparo
vêm no próximo milestone, sem mudar o runtime nesta etapa.

Uma GLM5.3low/max8000, registro runtime-only da API registry.lookup.override,
stop,18087input/5992output e custo reportadoUSD0,0516866, tools/retry0. Raw/answer
selados antesleitura. Native aceita hook local+base imutável e rejeita escopo
inválido/hardcodes/afirmação de caller no literal proposto. Autoria qualificada,
sem crédito de crítico independente. Recibos em
A/SURFACE-UV-SCALE-R1153-* (A=audits/2026-10-31-visual-consistency).

Próximo: aplicar mínimo nos dois builders, ligar probe ao gate existente de
external-surface-binding, provar nominal e mutantes causais sem alterar asserções
anteriores e atualizar este ledger. WebP de proveniência desconhecida permanece.
Root publica; nenhuma publicação nesta lease. Missão visual/PR/release integral,
Flavio1158 excluído/UI-social depois, Game3:2/Ego/mobile/MP humano/arte UNKNOWN.
