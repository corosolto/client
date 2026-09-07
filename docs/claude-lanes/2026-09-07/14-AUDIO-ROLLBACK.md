# GLM 5.3 — preparar rollback auditável de Funkeiros e Tribos Urbanas

Use exclusivamente `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-audio-rollback`,
branch `claude/audio-funkeiros-urbanas-rollback`, PR #531. O HEAD `7b2b0e4b` estava um commit à
frente do remoto: faça push desse checkpoint antes de produzir algo novo.

A investigação já encontrou fontes v7 e v8 fora do Git. Não repita busca. Preserve hashes,
bytes, origem e direitos. Monte uma comparação local curta e nivelada: v7 sem IA versus v8 com
Fish TTS, separada por facção/personagem/ação. Não publique áudio, não gere voz nova e não troque
manifest antes de o dono ouvir e escolher. A troca v8→v7 não pode apagar vozes Míticas.

Deixe scripts determinísticos de staging/rollback, manifest verificável, teste de ausência de
fallback indevido e plano reversível prontos. Após a escolha humana, aplique apenas o lote
aprovado, rode gates, commit/push e atualize #531. Registre qualquer áudio sem proveniência como
bloqueado, nunca como aprovado.

