# GLM 5.3 — áudio que some e fallback sintético

Audite as worktrees `audio-ingame-disappeared` e `audio-no-synthetic-fallback` sem misturar o
rollback de vozes. A segunda contém mudanças locais: preserve e faça checkpoint. Escolha uma
única worktree de implementação depois de comparar ancestry e diffs; não copie duas soluções.

Reproduza áudio que desaparece durante a partida, manifest/cache-bust, autoplay, transições de
round/mapa, unload, concorrência e 404. Remova fallback sintético apenas onde houver política e
asset aprovado; silêncio explícito é melhor que voz/efeito errado. Não redistribua pacote
privado ou asset sem proveniência.

Crie testes/mutantes de lifecycle e manifest, A/B local quando houver áudio, rode gates/build,
commit, push e PR. Registre o que foi ouvido pelo dono separadamente do que só passou em teste.

