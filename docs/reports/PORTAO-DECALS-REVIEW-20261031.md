# Pacote público de grafites antes do portão

O workflow `portao-browser` não instalava os decalques gitignored que a medição usa. Na WT limpa da QA88fc, 196 de 197 nomes do acervo estavam ausentes; dos 75 nomes de decalque citados pelo layout, 70 faltavam. HTTP do arquivo real `tags-treino-02.png` respondeu 404.

Correção: depois de npm ci, o job executa o `scripts/fetch-decals.sh` existente e `assets-check.mjs --so=decals`, antes de servir ou medir. O novo modo pula apenas áudio; mantém a lista real `initTextures().decalFiles` e o contrato de referências do layout. Default, audio e runtime-audio preservados; modo vazio/desconhecido/repetido reprova com exit 2. Sem mudar Game, CI principal, package ou teto de 45 min.

O gatilho agora reconhece fetch/assert e o fecho importado; o padrão JSON legado permanece. PG6 valida comandos/ordem no próprio job, rejeita bootstrap condicional ou erro ignorado e cobra que os caminhos acordem o portão. PG2 também reconhece bash/sh direto no workflow. O `asset-fetch-check` existente ganha fixtures pelo consumidor real: lista completa sem áudio, nome ausente com contagem de cache completa, restauração, áudio no default e opções inválidas. Essas fixtures testam existência, não decode de imagens.

Provas no audit externo `audits/2026-10-31-visual-consistency/`:

- `PORTAO-DECALS-R1-BASELINE.json`, `HTTP-before.json`, `R1-ASSERT-BEFORE.stderr`: RED físico e assert196/197; `PG6-RED-R2.log`: fetch/assert ausentes, antes da edição do workflow.
- `PORTAO-DECALS-FETCH-R2.log`: download público real na WT antes vazia. Zip de 9396293 B, SHA256 `826417d20ee89fbdec279355c3187d230d833d4f1bd28dbb2286bb6bd6a19cae`.
- `PORTAO-DECALS-PHYSICAL-PROOF-R2.json`:352/352 pedidos e 75/75 nomes do layout presentes,352 assinaturas PNG de 8 bytes corretas. Nove cenários esperados. Fixture com 197 PNGs faz fetch pular pela sentinela, mas assert reprova o nome solicitado ausente; restaurá-lo recupera GREEN. Default ainda exige áudio, --so=audio passa sua fixture e runtime-audio preserva piso/3 estados.
- `HTTP-after.json`: mesmo arquivo físico respondeu 200/20679 B. Servidor HTTP de prova encerrado; nenhum browser.
- `PORTAO-DECALS-FOCAL-R2.json`:18/18 resultados esperados, com 10 mutantes PG1–6, nominal, asset-fetch, portaointeiro, wfsecret/wflocal/wftimeout/wfcheckout/security.
- `PORTAO-DECALS-ASSET-CAUSAL-R2.json`:3 mutantes do assert detectados por DEC2/4/5: ignorar nome ausente, pular áudio no default, aceitar modo desconhecido. `ASSET-FETCH-NOMINAL-R3.log` e `ASSET-FETCH-NODE22-R3.log` repetem o contrato final com fixture adaptável ao tamanho da lista e quatro opções inválidas. `PG-NODE22-R3.log` confirma o contrato do workflow no Node22.

GLM-5.3 OMP gerou um parcial em 6 min e encerrou por deadline. Seu gate incompleto e a remoção acidental do padrão JSON foram rejeitados; Codex completou o contrato e as provas. Não contar a tentativa como revisão independente bem-sucedida.

Limites: prova local Node22/macOS e arquivos/HTTP; sem decode completo, arte, browser ou execução hostedCI. Revisão independente solicitada, mas não iniciada por limite de 4 agentes; root deve cobrir estes cinco arquivos na revisão consolidada antes de fechar o finding. Sem push, reply ou resolução remota nesta lane. Os 196 arquivos baixados permanecem ignorados e fora dos commits.
