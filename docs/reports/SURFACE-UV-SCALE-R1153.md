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
mirante fallback7,111/7,407pxm. Um warning de inicialização do harness/imports Three foi
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

## Milestone2: reparo e guarda ligada

Só as duas fontes de mapa mudam o UV: planoUV/metrosPorUV existentes nas calçadas;
no mirante, a UVbase0–1 é restaurada antes de cada recomposição. O callback local
no material conserva a assinatura external4args e captura apenas a geometria,
sem reter o Mesh/parent scene. Nada muda no material/textura global compartilhado.

O checker external-surface-binding existente, já no check:fast, agora importa o
probe real e exige as12cláusulas UV/lifecycle mais os fingerprints exatos da
baseline. Os seis controles causais desativam UV das calçadas, inicialização do
mirante, callback onLoad, reset da base, leitura de repeat e leitura de dimensões.
Cada um exige failset semântico exato; exceção/NAOAPLICOU não vira detecção.
Os probes anteriores de Campomorro/Escadão/clones/Ferro não foram afrouxados;
o NAOAPLICOU honesto legado do onError ausente continua explícito.

Foco final no código congelado: exit0 em32,064s, doze cláusulas e preservação
PASS, seis mutantes novos RED exatos. Os três planos medem128px/m nos dois eixos,
inclusive fallback, onLoad, notificação duplicada e1024×256/repeat2×3. Fonte do
alvo é texel-tetos, independente do export usado pela implementação. Final
SB1–SB7/cache de conteúdo: exit0 em36,332s. Ambos stdout/stderr preservados em A,
zero timeout/stderr; executados concorrentemente, tempos não são benchmark.
Docs geradas em modoPR:0arquivos alterados; docs --check PASS3,019s (estrutura,
contagens/autoria de main/release ficam para seu fluxo). Diff --check PASS.

SIM_HASH oficial: release.yml chama scripts/sim-hash.mjs --write. Depois do
freeze, gerador oficial e --list entregaram6adc8f9a35cf3eb1/160arquivos, conferido
independentemente por SHA256(path\0bytes\0). O literal713a9105f2c02115 anterior e
recibo intermediário2ee2 foram preservados. VERSIONalpha135 não muda; não há
repinbackend. O filho com Hnovo não herda aceite runtime/CI do pai713.

Este filho parte de9414 e não incorpora a555. Root fará merge normal dessa
ancestralidade atual e coordenará publicação/novo pinbackend/H. Nenhum push,
GH, browser/Ego/Chromium, build ou fullgate foi executado nesta lease. Assets e
proveniência desconhecida do WebP preservados; visual/MUP/Game/mobile/MP humano
continuam UNKNOWN. Próximo: Root lê diff/recibos/pins e decide adoção do checkpoint.

## Composição Root R1188

Root leu o diff final integral e o relatório do autor. O recibo
A/SURFACE-UV-SCALE-ROOT-R1187.json confere todos os artefatos, blobs de origem,
contratos e grafo publicado sem divergência. Isso é revisão para adoção local;
formal do bot, crítico independente e QA visual do jogo ainda estão pendentes.

O merge normal f5ed6744a860d963dc99e818297c98f7fdb665f4 incorpora o pai atual
a555a255f8bd9a2eef24c6b64333d68e6d53be3d. Apenas a fixture mobile e seu ledger
entram por essa ancestralidade. A árvore public/ continua byte-exata ao checkpoint
autoral b60c4b520d571236d2cd5621e4e3430452ded5ec, com SIM_HASH
6adc8f9a35cf3eb1. Nenhum arquivo do worktree W842 foi alterado.

Próximo: gates normais e publicação em stack sobre o PR1214, depois review atual
e crítico independente. O backend ainda fixa BD/H713; a mudança de hash deste
filho exige repin e validação pareada antes de qualquer rollout. Sem push,
migração persistente, merge em produção ou release desta composição até aqui.
