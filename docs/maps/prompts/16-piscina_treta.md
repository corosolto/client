# Piscina da Treta — prompt de execução

Copie o bloco abaixo para Claude; ele também funciona no outro modelo se houver um único responsável pelo mapa.

```text
Você é o responsável por aprofundar visualmente Piscina da Treta no CSBrasil, usando pesquisa real, acervo existente e Mint.gg quando necessário. Entregue implementação e evidência, não apenas planejamento.

CONTEXTO E FONTE
#566 codex/piscina-rework-stack é a lane atual. Em 09/09/2026 o dono reprovou o layout de ilhas/mirante/muretas submersas e reabriu a arquitetura. O contrato vigente é plans/25-PISCINA-DA-TRETA-REWORK.md, seção "Reabertura arquitetural". map_piscinao_ramos.js é candidato diferente: não trocar sem decisão de escopo.
O repositório agregador /Users/ruben/csbrasil não é Git root. Leia AGENTS.md, docs/LICOES.md e docs/maps/POLISH-CATALOGO-CONTINUIDADE.md na lane codex/mapas-polish-integral. Verifique branch, HEAD, status e PRs ao vivo; não confunda ausência na main com inexistência do mapa.

ISOLAMENTO
Um builder por mapa. Não edite primary, checkout alheio nem a worktree integradora em paralelo. Parta do checkpoint integrado citado no índice e use worktree própria para este mapa; se já houver dono ativo, coordene a posse antes de editar. Seu escopo é public/js/map_piscina.js, helpers exclusivos, assets exclusivos e gates/docs deste mapa. maps.js, game.js, main.js, look.js, mapprops.js, package.json e registros compartilhados exigem integração sequencial: entregue patch separado ao integrador. Não altere core, armas, HUD ou áudio como efeito colateral.

DIREÇÃO VISUAL
Refinar o mapa preservando piscina central limpa, bordas, azulejos, água e luz. A organização espacial deve remeter à leitura clássica de fy_pool_day: salão central, dois corredores laterais fechados e vestiários de spawn protegidos por paredes com três acessos largos. Não reintroduzir ilhas soltas, guaritas no fluxo, mirante ou divisórias submersas. Não declarar Piscinão de Ramos aplicado pela existência de arquivo.
Pesquise fotografias/referências confiáveis do lugar, registre URLs e traduza em arquitetura, escala, materiais, vegetação e contexto. Não basta trocar cores, aumentar bloom ou adicionar caixas ao horizonte. Não afirmar semelhança sem comparar imagens.

ACERVO E MINT.GG
Reusar acervo atual e kit do #447. Mint para mobiliário, equipamentos e detalhes de arquitetura; piscina/água permanecem geometria e shader controlados.
Leia mint-assets.json e FONTE.md, procure assets nos PRs/branches e confirme os bytes antes de gerar. Use ferramentas Mint disponíveis ou a interface autorizada; não invente nomes de APIs. Para cada lacuna necessária, escreva um prompt específico de asset modular com dimensões em metros, pivô no chão, orientação, material, função e orçamento derivado do jogo. Não gere mapa monolítico, texto ilegível ou arquitetura que promete portas transitáveis falsas. Preserve chatUrl, assetId, prompt, termos de uso, arquivo original, derivados, SHA256 e transforms de exportação. Inspecione o GLB real: escala, UVs, materiais, transparência, normais, triângulos e meshes. Se Mint estiver indisponível, registre o bloqueio exato e avance no que usa acervo existente; não afirme geração concluída. Nenhuma compra de crédito, merge ou publicação faz parte deste trabalho.

CONTRATOS A PRESERVAR
Piscina/borda, spawns, CTF e arsenal. Preservar os dois corredores x=±17..21, os portais laterais z=-11/0/+11 e as paredes de vestiário z=±15 com portais x=-12/0/+12. Não mover arquitetura aprovada para encaixar um GLB. Zero cover dentro da água e zero ilha solta entre spawn e piscina.
Capture o estado atual antes de modificar. Mudança funcional necessária deve ser medida e isolada; nunca trocar colisão por aparência sem documentar. Faça gate que reprova antes e mutante que prova que ele detecta a quebra. Não recalibre hash/teto só para deixar verde.

VERIFICAÇÃO
Use Node compatível com o projeto; nesta máquina PATH=/opt/homebrew/bin:$PATH. Confirme scripts disponíveis antes de executar: eval:mapcontrato; eval:spawn; gates do #447 após recuperação seletiva. Acrescente contratos/spawns/CTF pertinentes. Um único browser pesado por vez no conjunto das frentes: reserve sua vez com o integrador. Capturas reais 1200×800, GLBs de fato carregados, ângulos repetíveis: tanque por dentro/fora, bordas, entradas, vestiários e linha d’água em low/med.
Compare antes/depois em med e low, luz de personagem e leitura de inimigos; meça custo real sem confundir último passe do bloom com draw calls totais. Não esconda 404, erro JS, clipping, asset flutuando ou ausência de áudio. Separe problema herdado de regressão.

ENTREGA
Não pare ao atingir contagem de objetos. Itere até o lugar e acabamento estarem visivelmente melhores e a crítica independente não apontar regressão. Atualize um ledger com origem/PRs, mudanças, commits, assets, tentativas rejeitadas, testes, imagens, limites e próximo passo. Faça commits pequenos e recuperáveis com Agent/DCO; nunca inclua artefatos volumosos ou segredos. Entregue patch, capturas e pontos que ainda dependem do dono. Gates e crítica de IA não equivalem à aprovação humana. Sem merge/release.
```

## Módulos Mint.gg — prompts independentes

Gerar separadamente; nenhum módulo pode alterar o layout se falhar ou atrasar.

```text
LOCKER WALL MODULE — Crie um banco modular de 2,70 m de largura × 0,55 m de profundidade × 2,10 m de altura, com 6 portas de armário metálico de vestiário público brasileiro, chapa pintada azul acinzentada, ventilação estampada, puxadores e desgaste contido. Realista estilizado, não cartoon, sem texto/logos, costas planas para encostar numa parede, pivô central no chão, frente olhando para +Z, escala em metros. GLB estático, UV sem sobreposição destrutiva, materiais PBR simples, até 12 mil triângulos e 2 materiais. Não criar corredor, parede, banco ou porta transitável.

TILED BENCH MODULE — Crie banco fixo de vestiário/piscina pública, 2,40 m × 0,60 m × 0,58 m, base de alvenaria revestida com azulejo branco e assento azul antiderrapante. Costas planas para montagem em parede, cantos chanfrados seguros, sujeira só em juntas, sem objetos soltos. Pivô central no chão, frente +Z, metros, GLB estático, até 6 mil triângulos e 2 materiais.

SHOWER PARTITION MODULE — Crie divisória modular de chuveiro de piscina pública, 1,20 m × 1,80 m × 2,60 m, paredes laterais de azulejo branco, perfil metálico, ralo e chuveiro industrial simples. Frente totalmente aberta e transitável; não criar porta falsa. Pivô central no chão, abertura +Z, metros, GLB estático, até 10 mil triângulos e 3 materiais.

POOL PORTAL FRAME — Crie somente uma moldura arquitetônica de portal para parede azulejada, vão livre exato de 3,00 m de largura × 3,10 m de altura, profundidade total 0,60 m. Azulejo branco, faixa azul-marinho e cantoneira metálica; nenhum painel, vidro ou porta ocupando o vão. Pivô no centro do vão ao nível do chão, frente +Z, metros, GLB estático, até 5 mil triângulos e 2 materiais.

POOL LADDER DETAIL — Crie escada/rail de piscina pública em aço inox escovado, largura 0,55 m, 4 degraus, altura útil 1,35 m, duas curvas superiores e placas de fixação. Pivô no centro entre as placas ao nível do deck, descida em +Z, metros, GLB estático, até 5 mil triângulos e 1 material. Não criar piscina nem piso.
```

## Prompt de revisão para o outro modelo

```text
Revise Piscina da Treta independentemente. Primeiro abra as capturas reais antes/depois da execução acima; só depois leia o builder. Não receba a justificativa do autor como prova. Compare a direção visual descrita neste arquivo com referências reais e examine tanque por dentro/fora, os dois corredores, os seis portais laterais, os dois vestiários, as seis portas de spawn e a linha d’água em low/med. Priorize: escala/encaixe, cobertura arquitetônica verdadeira, rotas, leitura de inimigos e custo. Confira especialmente: piscina sem maze, nenhum prop solto substituindo arquitetura, vãos visualmente transitáveis e colisão concordando com parede. Registre até cinco problemas concretos com imagem/câmera e arquivo:linha, separando regressão de aprofundamento ainda ausente. Não aceite pelo número de testes ou assets. Não edite simultaneamente com o builder; devolva correções delimitadas ou assuma o mapa somente após handoff explícito. Se precisar de Mint, confira o inventário antes para não duplicar geração. Declare o que não foi demonstrado.
```
