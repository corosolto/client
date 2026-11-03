# PR1101: sólido JSON e rotação na mesma geometria

Objetivo desta lane própria: corrigir os defeitos atuais do PR1101 sem editar o checkout ou ref do autor e compor o resultado na lane de release. A missão integral continua sendo integrar PRs elegíveis e release, fora Flávio, e estabilizar mapas, personagens, skins, motion e ADS. Este checkpoint não conclui o release nem a qualidade global.

Base `7ed4f61c3a99181359b378046250661ee5b98c21`, branch `codex/sdk-solid-rotation-r1791-20261102`. Base de integração separada `5cb8fca0a059ce8dababd29455afc12004a9d5a3` em `release-arena-compose-r1749-20261102`, contendo Campo, Arena e NET. Evidências locais em `audits/2026-10-31-visual-consistency` no workspace agregado.

## Defeitos reais e resultado

O plano aceitava os25 pares inválidos de largura/profundidade mesmo para sólidos e deixava de criar o collider em silêncio. A nova validação exige cw/cd finitos e positivos antes de consultar o asset, além de altura válida quando explícita. A altura omitida continua2.4; nonsolid conserva a compatibilidade anterior. Asset ausente válido continua sem malha e sem parede fantasma. O diagnóstico usa índice numérico, sem inserir id fornecido pelo JSON no HTML de erro do editor. A interface já captura erro de validação e mantém os campos de dimensões explícitos; não se inventa um collider1x1 nem se infere proporção do GLB.

A malha girava, enquanto collider e planejamento continuavam alinhados aos eixos. O plano agora emite AABB conservadora e os campos OBB já consumidos pelo Game. Um helper local compartilhado serve à navegação e à verificação de spawn. Preserva as margens existentes de planejamento. O motor de movimento, rampas e demais mapas não foram alterados.

## Evidência

R1754 refutou a alegação de que o builder não validava rampas: rejeita R4 antes de acrescentar cena, e o mutante que remove a validação aceita a rampa. Nenhuma correção foi inferida da alegação falsa.

R1794/R1798 reproduziram66 falhas em70 casos no código original e0 no candidato: dimensões inválidas com/sem asset, bounds de0/90/45/-45graus, nós fora da malha, spawn dentro/fora e `_collide` real. O oráculo de orientação usa Matrix4 do Three, independente da fórmula do builder. R1793 continha uma asserção inadequada de sair em um frame de um centro profundamente dentro de AABB; foi corrigida antes da edição do produto para testar sobreposição contínua junto à face, com controle yaw0 passando. O transporte do probe externo também foi alinhado ao mesmo namespace Three noR1798; não se aceitou o aviso de múltiplas instâncias como evidência final.

O checker permanente `mapjson-solid-rotation-check.mjs`, no alias `eval:mapjson`, testa dimensões, altura, asset presente/ausente, builder antes da cena, orientação, navegação, spawn e motor real. Seu driver exige veredito próprio, hash da fonte estável, marcador de aplicação único e saída sem erro de infraestrutura. Quatro mutantes recolocam os defeitos de dimensões, orientação do collider, navegação por AABB e spawn por AABB. Nominal e quatro mutantes passaram no driver. R1799 passou syntax4.640s e o alias completo eval:mapjson4.444s, incluindo testes anteriores e novas mutações.

GLM1792 participou da autoria (.0441256USD, uma chamada sem ferramentas/retry/fallback). Foram recusadas a suposição de h estrito para nonsolid, a ampliação desnecessária do plano retornado, o auto-preenchimento1x1, o oráculo com inversão de rotação e mutantes que não removiam o guarda real. Autoria consultiva não conta como revisão independente.

## Próximo passo

Checkpoint normal recuperável desta lane, composição com Campo/Arena/NET na laneL, preservando os contratos mais recentes; regenerar documentos/versão oficiais. Executar build/boot/portão normal e revisão integral do head publicado, cobrindo todas as superfícies atuais. Backend final, PG/WS, release/rollback e aceites Ego/Game/humano/mobile/MP real continuam pendentes. Não declarar correção visual do editor ou aprovação humana a partir destes testes Node.

R1800 ampliou a cobertura para110 casos: largura e profundidade são recusadas também independentemente, mantendo a outra dimensão válida. O inventário exato é obrigatório no driver. O quinto mutante retira somente o guarda cd; reprova na cláusula própria. O alias eval:mapjson completo passou em4.827s, com nominal e cinco mutantes. Nenhuma interface ou game.js foi editado.
