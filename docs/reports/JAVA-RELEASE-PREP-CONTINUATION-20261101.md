# JavaPorco — preparação do release, R997

Objetivo integral: integrar os PRs elegíveis e release; melhorar mapas, personagens, skins, movimento e ADS conforme PDF/roadmap. Flávio/#1158 excluído; UI/social depois. Root é o publicador desta composição; preservar os outros owners.

Composição congelada R958: `3f3ac95b5f825397e471624656ff99760eedd407`, com F2/Factory/S4, mãos/grafites, draw R944 e seleção de pintura R970. Seus gates focais e revisões são registrados nos ledgers importados; não equivalem a aprovação artística.

R997 integra normalmente a produção `24206a8235c6fb863e62d5b79bbb3180eca4ab02`, herdando alpha.135 e documentação de release já rastreada. Nenhum módulo de jogo muda além de version.js. O gerador oficial `scripts/sim-hash.mjs --write` produz SIM_HASH `46bf2b0dead2a8ae`; 160 arquivos do grafo conferidos byte a byte contra 3f3, e recomputação independente coincide. version.js está excluído do grafo por contrato do gerador. Evidência: audit externo JAVA-RELEASE-PREP-R997-HASH-RESULT.json. docs:check e arch:check passaram após composição.

Main observado em `f0cbe56f6a382230ce5d2ab2004f87f2416b3506` acrescenta apenas o exemplo docs/issues/exemplos/galpao_espelho.json (#1104); integrar em merge normal depois deste checkpoint, sem recalcular versão manualmente.

Próximos: congelar candidato C e grafo H; build Astro real e BOOT com origem própria; push normal atômico dos quatro refs, sem bypass; bot atual e crítico independente integral por PR; ponte real release135→backend candidato antes de rollout. Publicar/pinar C/H antes de runtime8 e frontend8. A release futura pode ter SHA diferente com o mesmo grafo H. Não alegar paridade pelo hash literal herdado nem por negociação wire7.

Pendentes: gates finais, publicação/CI/reviews/merges, backend pin/PR/migração guardada/rollout pareado, frontend e metadados. Game real 3:2, arte, skins em pixel, anatomia/contato, mobile e MP humano não aprovados. Ego Space56 ausente; pergunta de recuperação existente pendente, sem abrir Space substituta.
