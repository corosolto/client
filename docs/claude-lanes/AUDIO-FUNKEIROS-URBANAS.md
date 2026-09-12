# Claude Opus 5 — restaurar vozes de Funkeiros e Tribos Urbanas

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-audio-rollback`, branch
`claude/audio-funkeiros-urbanas-rollback`, PR #531. Preserve o histórico e a documentação já
produzidos.

## Objetivo

Localizar fontes verificáveis das vozes antigas de Funkeiros e Tribos Urbanas e restaurá-las no
lugar das vozes sintéticas rejeitadas. Procure Git, tags, releases locais, caches, backups,
pacotes privados autorizados e manifests. Não invente autoria, licença ou substitutos.

## Estado a retomar

A busca anterior não encontrou a string `ememe` no histórico e mostrou que reverter o manifesto
inteiro removeria também vozes Míticas. Portanto faça recuperação por arquivos e hashes, não
rollback amplo. Se nenhuma fonte aparecer, documente exatamente quais identificadores ou amostras
o dono precisa fornecer.

## Aceite

- Cada arquivo restaurado tem origem, hash e autorização registradas.
- Manifesto muda apenas nas entradas F/U necessárias; outras facções permanecem idênticas.
- Checks de character voice, mix, processamento, capacidade, privado/local e documentação passam.
- Comparação auditiva fica explicitamente pendente para aprovação humana.

Não abra navegador, não gere novas vozes, não faça merge e não publique áudio ou release.
