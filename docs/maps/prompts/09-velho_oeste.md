# Sertão da Treta — prompt de execução

Copie o bloco abaixo para GLM; ele também funciona no outro modelo se houver um único responsável pelo mapa.

```text
Você é o responsável por aprofundar visualmente Sertão da Treta no CSBrasil, usando pesquisa real, acervo existente e Mint.gg quando necessário. Entregue implementação e evidência, não apenas planejamento.

CONTEXTO E FONTE
#516 integrado; #526 astra/sertao-praca-casas-por-do-sol aberto; #445 histórico fechado. Ler plans/16-SERTAO.md.
O repositório agregador /Users/ruben/csbrasil não é Git root. Leia AGENTS.md, docs/LICOES.md e docs/maps/POLISH-CATALOGO-CONTINUIDADE.md na lane codex/mapas-polish-integral. Verifique branch, HEAD, status e PRs ao vivo; não confunda ausência na main com inexistência do mapa.

ISOLAMENTO
Um builder por mapa. Não edite primary, checkout alheio nem a worktree integradora em paralelo. Parta do checkpoint integrado citado no índice e use worktree própria para este mapa; se já houver dono ativo, coordene a posse antes de editar. Seu escopo é public/js/map_velho_oeste.js, helpers exclusivos, assets exclusivos e gates/docs deste mapa. maps.js, game.js, main.js, look.js, mapprops.js, package.json e registros compartilhados exigem integração sequencial: entregue patch separado ao integrador. Não altere core, armas, HUD ou áudio como efeito colateral.

DIREÇÃO VISUAL
Vila do sertão brasileiro: praça, igreja, casas acessíveis, comércio, caatinga e pôr do sol. Não voltar a faroeste americano. Refinar arquitetura e atmosfera do trabalho existente.
Pesquise fotografias/referências confiáveis do lugar, registre URLs e traduza em arquitetura, escala, materiais, vegetação e contexto. Não basta trocar cores, aumentar bloom ou adicionar caixas ao horizonte. Não afirmar semelhança sem comparar imagens.

ACERVO E MINT.GG
Kit de casas, flora e fauna já existente. Mint somente para lacunas regionais documentadas: portas/janelas, varanda, mobiliário de praça ou detalhe de comércio; evitar cactus genéricos de deserto americano.
Leia mint-assets.json e FONTE.md, procure assets nos PRs/branches e confirme os bytes antes de gerar. Use ferramentas Mint disponíveis ou a interface autorizada; não invente nomes de APIs. Para cada lacuna necessária, escreva um prompt específico de asset modular com dimensões em metros, pivô no chão, orientação, material, função e orçamento derivado do jogo. Não gere mapa monolítico, texto ilegível ou arquitetura que promete portas transitáveis falsas. Preserve chatUrl, assetId, prompt, termos de uso, arquivo original, derivados, SHA256 e transforms de exportação. Inspecione o GLB real: escala, UVs, materiais, transparência, normais, triângulos e meshes. Se Mint estiver indisponível, registre o bloqueio exato e avance no que usa acervo existente; não afirme geração concluída. Nenhuma compra de crédito, merge ou publicação faz parte deste trabalho.

CONTRATOS A PRESERVAR
Casas/janelas de conflito do #526, rotas, fauna, calango, criação e horizonte já medidos. Não mexer fauna e materiais simultaneamente sem separar evidências.
Capture o estado atual antes de modificar. Mudança funcional necessária deve ser medida e isolada; nunca trocar colisão por aparência sem documentar. Faça gate que reprova antes e mutante que prova que ele detecta a quebra. Não recalibre hash/teto só para deixar verde.

VERIFICAÇÃO
Use Node compatível com o projeto; nesta máquina PATH=/opt/homebrew/bin:$PATH. Confirme scripts disponíveis antes de executar: eval:sertao; eval:velhooeste; localizar família eval:sertao-* em package.json. Acrescente contratos/spawns/CTF pertinentes. Um único browser pesado por vez no conjunto das frentes: reserve sua vez com o integrador. Capturas reais 1200×800, GLBs de fato carregados, ângulos repetíveis: praça inteira, igreja, casas por dentro e janelas, rua e horizonte; não somente atrás do cover de spawn.
Compare antes/depois em med e low, luz de personagem e leitura de inimigos; meça custo real sem confundir último passe do bloom com draw calls totais. Não esconda 404, erro JS, clipping, asset flutuando ou ausência de áudio. Separe problema herdado de regressão.

ENTREGA
Não pare ao atingir contagem de objetos. Itere até o lugar e acabamento estarem visivelmente melhores e a crítica independente não apontar regressão. Atualize um ledger com origem/PRs, mudanças, commits, assets, tentativas rejeitadas, testes, imagens, limites e próximo passo. Faça commits pequenos e recuperáveis com Agent/DCO; nunca inclua artefatos volumosos ou segredos. Entregue patch, capturas e pontos que ainda dependem do dono. Gates e crítica de IA não equivalem à aprovação humana. Sem merge/release.
```

## Prompt de revisão para o outro modelo

```text
Revise Sertão da Treta independentemente. Primeiro abra as capturas reais antes/depois da execução acima; só depois leia o builder. Não receba a justificativa do autor como prova. Compare a direção visual descrita neste arquivo com referências reais, confirme GLBs carregados e examine praça inteira, igreja, casas por dentro e janelas, rua e horizonte; não somente atrás do cover de spawn. Priorize: escala/encaixe, fidelidade ao lugar, cobertura verdadeira, rotas, leitura de inimigos e custo. Confira especialmente: Casas/janelas de conflito do #526, rotas, fauna, calango, criação e horizonte já medidos. Não mexer fauna e materiais simultaneamente sem separar evidências. Registre até cinco problemas concretos com imagem/câmera e arquivo:linha, separando regressão de aprofundamento ainda ausente. Não aceite pelo número de testes ou assets. Não edite simultaneamente com o builder; devolva correções delimitadas ou assuma o mapa somente após handoff explícito. Se precisar de Mint, confira o inventário antes para não duplicar geração. Declare o que não foi demonstrado.
```
