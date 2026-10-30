# Operação Flávio e resolução dos 47 PRs

## Autorização e objetivo
Em 2026-10-30 Ruben autorizou implementar Operação Flávio com GLM pelo OMP e resolver os 47 PRs, mantendo o HQ em http://127.0.0.1:9180/#live atualizado. Javaporcos é de outro terminal Codex: acompanhamento somente, sem editar sua worktree. Novo pedido: telas inteiras antes do lobby anunciando modos com capturas reais, e material de gameplay/trailers para edição conjunta. Publicação, merge e deploy não foram autorizados por este pedido.

## Definição de pronto
Flávio com contrato de rede compatível, HUD/cinemática/reset conectados, testes e mutações pertinentes, revisão independente e validação visual. Cada um dos 47 PRs deve ter destino e evidência no head atual; pronto para revisão não equivale a merge. Capturas automatizadas não equivalem a partidas humanas. Telas de anúncio e trailers exigem revisão visual e editorial.

## Estado inicial e arquivos reservados
Branch `v2/operacao-flavio`, base `25e807fa0f86104d1f3ce43bc493d49ea63b3ced`, PR client#1158. Único item anterior não rastreado: `worktrees/`, preservar.
- GLM-02 via OMP: propor patch apenas em `public/js/mode_operacao_flavio.js`, reset do avião. Codex aplica patch após conferir base e valida.
- Codex: régua independente `tools/eval/operacao-flavio-reset-check.mjs`, integração em package.json, arquivos compartilhados game/main/netcodec, backend e coordenação dos PRs. GLM não altera esses arquivos.
- Javaporcos: nenhum arquivo cedido a esta lane; PR #1160 acompanha o proprietário externo.

## Milestones
Régua de reset criada por Codex antes do reparo. GLM ainda não executou o reparo. Evidência de vermelho/verde e mutação será acrescentada após execução.

## Fontes e painel
Plano anterior em `corosolto-roadmap/reports/2026-10-30-revisao/`; auditoria em `csbrasil/audits/2026-10-30-roadmap/`; HQ em `csbrasil/operations/corosolto-hq-20261026/`. Runtime local do HQ guarda status do GLM e dos PRs, sem credenciais.

## Próximo passo
Executar régua vermelha, despachar GLM-02 no OMP com patch restrito e sem fallback, ligar os estados de execução ao HQ, atualizar revisões dos 47 PRs.

### Régua vermelha validada
Node v26.12.1, `node tools/eval/operacao-flavio-reset-check.mjs` falhou na asserção específica: posição z=68 após prepareRound, esperada origem z=55. Código original SHA256 2ec852fdebb784f122072e94c928d1eee0ebfe38367050bc8690964f25265cee. GLM-02 recebe esse caso e três fontes em leitura, produz patch JSON para aplicação pelo integrador.

### GLM-02 recebido e verificado
OMP zai/glm-5.3 concluiu 23:52:44 UTC, sem fallback, leitura apenas, patch JSON. Base e trecho literal conferidos antes da aplicação. Régua ficou verde offline/online, duas rodadas por origem padrão/não padrão, derrota e prop ausente. Mutante que preserva posição deslocada aplicou e voltou a falhar na asserção z=68 versus z=55. Validação lógica local, sem alegar captura visual ou multiplayer humano.
