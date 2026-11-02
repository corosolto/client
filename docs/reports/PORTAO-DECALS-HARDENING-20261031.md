# Hardening dos três achados de cb62/fd0eb

Os três P2 do crítico foram reproduzidos antes da correção. `--so=decals=sufixo`, `audio=sufixo` e `runtime-audio=sufixo` escapavam da validação. PG6 aprovava early exit, heredoc, errexit desligado/echo e shell override. O mutante sem-fetch em inline válido retornava uma falsa mordida por erro de aplicação.

O parser agora preserva todo o restante após o primeiro '='; a fixture DEC5 exige exit2 para os três sufixos, além dos modos inválidos já cobertos. Não muda modos válidos, áudio ou limiares.

PG6 lê todas as linhas do literal YAML, incluindo as mais indentadas. Aceita somente os dois comandos diretos atuais, num step ou em dois steps adjacentes (incluindo inline). Os steps do bootstrap aceitam apenas name/id/run, sem overrides ou controle adicional; defaults/merge de execução são recusados. Assim, o shell padrão mantém errexit. A [documentação do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) especifica `bash -e` para shell não sobrescrito em Linux/macOS. Não foi adicionada dependência de parser ao gate.

Mutadores exigem alvo único e alteração real. Ausência/ambiguidade sai3 com `INSTRUMENTO`, antes das cláusulas; mutante que não produz a cláusula esperada sai4 (`MUTANTE_SOBREVIVEU`). Apenas exit1 com a cláusula semântica esperada conta como detecção. O sem-fetch agora também modifica o inline válido. O workflow permanece byte idêntico a cb62.

Provas externas no audit da missão:

- `PORTAO-DECALS-SUFFIX-RED-R3.log`: três falhas DEC5 antes do parser integral.
- `PORTAO-DECALS-REVIEW-BASELINE-R3.json`/logs: falsos GREEN e falsa mordida. A primeira fixture de indentação tinha YAML inválido; foi corrigida para inserir o comando após a primeira linha e validada pelo parser na matriz final. Não usar a versão inicial como prova de execução YAML.
- `PORTAO-DECALS-REVIEW-FOCAL-R4.json`:38/38 decisões esperadas em Node22.23.4 e26.12.1: nominal,15mutantes, fixture assets com sufixos, contrato runtime-audio e mutante desconhecido com sufixo.
- `PORTAO-DECALS-STRICT-R4.json`:40/40 decisões esperadas nas duas versões. Quatro formatos válidos, nove variantes de bypass/defaults/merge rejeitadas, cinco aplicações reais em inline e dois controles de aplicação com status3 e sem texto PG6. Fixtures YAML verificadas por js-yaml somente no programa privado de prova.
- `PORTAO-DECALS-SHELL-PROOF-R4.json`:8/8 cenários executados em Bash com comandos substitutos que falham. O bloco nominal propaga cada falha; early exit/heredoc/errexit desligado/shell override reproduzem bypasses que PG6 rejeita. Não executa downloads nem browser.

Limites: revisão local de gates e subprocessos macOS, sem hostedCI. Root fará re-review independente do novo SHA antes da integração e do prepush normal. Nenhuma edição de Game, glbchars, workflow, package ou assets nesta rodada.
