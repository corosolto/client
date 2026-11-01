# Continuação Mansão R625

Objetivo integral: integrar PRs elegíveis e acompanhar release; melhorar mapas, UI, personagens, mãos, armas, movimento e skins conforme PDF/roadmap/Complexo Favela. Flavio #1158 excluído; fluxos UI/social posteriores; owners Javaporco/itens preservados. Esta frente só corrige o instrumento de Mansão.

Base: `2f2e51f3d3433a24cbef1cfd8f82192867a5ca7e`; branch `codex/mansao-fixture-r625-20261101`. Lajes R602 permanece congelada; Root mantém outras lanes e GH/browser.

## Estado e definição de concluído

Implementação, provas focais e consulta GLM concluídas; revisão Native independente ainda pendente. Runtime, vãos e CTF passaram no primeiro alias pós-patch. Node16 foi INFRA no quarto passo; Node26 revelou contrato antigo de rótulo em mansao-load-check:33 (espera TME/TMB, produtor E/B). O alias agregado ainda não está verde; esse segundo instrumento está fora deste lease. A próxima prova focal usa Node22.23.4, igual à versão major do CI. Concluído nesta frente exige nominal do alias real, mutantes causais com falhas exatas e controles de infraestrutura separados, checkpoint DCO/Agent e revisão Native independente do Root. Não concede aprovação de arte, navegador, FPS, mobile, MP, loja ou release.

## RED e procedência

O alias `npm run --silent eval:mansao` em 2026-11-01 falhou em 0,942 s com ENOENT de `docs/maps/MANSAO-RECOVERY-ASSETS.json`; os dez passos seguintes não foram executados. Recibo `audits/2026-10-31-visual-consistency/MANSAO-FIXTURE-R625-BASELINE.{json,log}`.

O manifesto original, criado no commit `1e84c8cc296cb5e80327e35f2245d30e266c6452`, blob `879a79292dcc5474fb676a9af3378f37768800c0`, tem 7483 B e SHA256 `da599b643ff56bbb4b8e10d6c29ea368a2c67cbac651df9176383c8f8562ce1c`. A cópia em `progress/archive/docs/maps/` e o fonte Git anterior à remoção `7dd1c2bba6a817e3579c00c6d83c2ff6e36b656c` são idênticos. Todos os 22 assets seguem rastreados e têm os mesmos hashes. A nova fixture projeta só path/SHA256 e a referência imutável do manifesto; não restaura o documento arquivado nem altera assets. `sourceRef` mutável e metadados redundantes foram omitidos. Preflight externo `MANSAO-FIXTURE-R625-PREFLIGHT.json`.

## Teto e unidade

O teste antigo comparava distância de um raio em y6,15 (já perto do olho) com olho1,62 + ápice contínuo v5 + folga0,10. Em Game real: piso4,5, teto8,950000003, pulo padrão5,6 gera ápice relativo0,738 e câmera máxima6,858 após 120 passos de1/120 s. O mutante antigo que baixava1,52 deixa teto7,43: 0,572 acima da câmera; sua reprovação era falsa. Controle externo `MANSAO-FIXTURE-R625-CEILING-PROBE.{mjs,json,log}`.

A referência física é `Game._moveEntity` (impulso padrão aprovado5,6, commit `e555cadf11e0ff4697eabd71cd6023327841ae1e`; gravidade20,6 aplicada antes da integração) e `Game._updatePlayer` (olho em pé1,62, sem bob no ar). `addBox` em map_mansao usa y como base, e `groundHeightAt` declara mezanino4,5. O instrumento agora mede o pulo/câmera reais na posição8,-11 e compara ambos os pontos em coordenadas mundiais, conservando a folga0,10. O teto-baixo move só o oclusor em memória até olho em pé + folga, abaixo da câmera de salto; confirma que a geometria foi alterada.

Para v5,6, g20,6 e dt1/120, y_n = n v dt - g dt² n(n+1)/2. O máximo discreto pertence a [U - g dt²/8, U], U=(v-g dt/2)²/(2g); isto inclui a quantização sem epsilon inventado. O ápice do pé e o da câmera precisam respeitar esse intervalo independente. O offset do olho é contado uma vez. Procedência detalhada do impulso já registrada no checkpoint pai R602; nenhuma mudança de física/mapa foi feita.

## Provas focais

Node22.23.4 (`/Users/ruben/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node`), nominal antes dos mutantes: runtime exit0,22 assets,545 nós/7218 arestas,2 rotas separadas, nenhuma falha; ápice0,738 e câmera6,858. Os nove mutantes existentes produziram RED semântico exit1. Falhas exatas: spawn-solido4 (ocupação/orientação/folga/âncora), grafo-partido131 (130 rotas ausentes + jardim/MEZZO0/2), camada assertion hall térreo, spawn-invertido8 orientações, suporte0/4, poste folga0,80, flanco1/2, parede assertion exterior e teto-baixo somente invasão do olho.

Outros16 controles em memória: fixture ausente/JSON inválido/vazia/duplicada/procedência errada/path traversal/SHA inválido, asset ausente, pulo NaN/throw, mutante desconhecido e mutação removida saem2(INFRA). Asset alterado em memória e impulso5 saem1 com a falha exata. O antigo teto rebaixado1,52 agora passa legitimamente. Remover o oráculo de teto faz o mutante real sobreviver com exit0: sobrevivente explícito, sem crédito de kill. Construtores com0/2 ocorrências são recusados antes do SUT. Recibos externos `MANSAO-FIXTURE-R625-PROOFS.json`, `-EXACT-FAILSETS.json` e fontes/logs individuais; todos16 resultados externos corresponderam à saída esperada.

As regiões originais de spawn/rotas (5722B) e paredes (485B) permaneceram byte idênticas ao pai, conforme `MANSAO-FIXTURE-R625-PRESERVATION.json`. O ENOENT original não é contado como mutante morto; falhas de import/compilação fora da validação focal também não recebem crédito semântico.

## Revisão e limites

Uma consulta OMP SDK `zai/glm-5.3` low terminou em137,837s,1dispatch,0tools/0retries,6000tokens máximos (5765 produzidos),893 palavras finais. MCP/tools/fallback/compaction desabilitados; RAW e ANSWER0444 antes da leitura do operador. Prefixo externo `MANSAO-FIXTURE-R625-GLM-`. Literal REVIEW_REQUIRED com2LOW+1INFO e nenhum bloqueio afirmado, sem promoção automática do parecer.

O autor refutou F1 como defeito introduzido: assert de hash e saída1 já existiam; divergência de bytes é RED semântico intencional, insumo ausente é INFRA2. F2 não sustenta o cenário alegado: Raycaster ordena distância, teto movido6,22 precede superfícies altas e o vidro em x0 não cobre o raio x8. A identidade do oclusor verifica aplicação causal. Nenhum patch decorreu do parecer. F3 aceito: a igualdade histórica da projeção22path/SHA é demonstrada pelos recibos Git externos, não por consulta Git em runtime. A fixture cobre os22 assets recuperados, não pretende inventariar todos os assets atuais do mapa. Adjudicação do autor não substitui Native independente.

## Próximo passo

Root deve revisar o checkpoint completo com Native independente. O alias agregado Node22 continua exit1 no contrato herdado de rótulo do teste de carga (passos1-3 passam; passos5-11 UNRUN), sem alterar aquele arquivo nesta frente. Sem push/GH/browser/produto/asset. A branch isolada e o relatório externo registram o checkpoint DCO/Agent; nada nesta frente aprova visual, MP ou release.

## Continuação Root R651/R655/R657/R664

Root ampliou a frente para os dois instrumentos herdados seguintes, mantendo
mapa, física, assets e predicados numéricos intactos. R651 reproduziu o rótulo
TME/TMB antigo; botsim fixa jogadorE e o produtor Game imprime E/B. O matcher
agora exige a linha completa com os tamanhos reais e pedidos correspondentes.
Carga5×5/8×8 passou; times-fixos continua RED1 por placar incorreto.

A primeira cadeia pós-rótulo passou quatro passos e parou por dependência local
@gltf-transform/core ausente (INFRA, sem crédito de produto). npm ci normal em
Node22.23.4 resolveu a instalação. R655 então passou cinco passos e encontrou
G4 do jardim: o matcher reconhecia PB.add e ignorava PB_FOLHAS.add real.
R657 leu produtor/fábrica, carregou os oito GLBs locais reais em CPU e comprovou
os dois lotes e a publicação de todas as espécies. Remover o template heliconia
impede seu add/build; remover todos os usos de cada espécie produz exatamente
uma ausência nos oito controles. Os cinco comandos restantes também passaram
individualmente. Nenhuma alteração de produto foi necessária.

A consulta GLM R657 propôs reconhecer o segundo lote. Root leu a resposta inteira
e rejeitou o alias genérico PB[A-Z_]* e o mínimo arbitrário de duas ocorrências;
foram preservados os limites existentes. A sugestão de que carga não foi medida
contradiz JOA CARGA no log; contagens imprecisas do modelo não foram adotadas.
O reparo aceita somente PB e PB_FOLHAS, mantendo preload e disco/material.

R664: jardim nominal passou; jardim-primitivo saiu RED1 somente em G4/preload.
O controller esperava incorretamente DETECTED/0 e marcou expected:false; o recibo
original foi preservado. A adjudicação R666 fixa o exit e failset reais conforme
o footer do instrumento, sem transformar erro de protocolo em detecção.
A cadeia oficial completa eval:mansao finalmente passou em Node22.23.4, todos
os onze comandos, em39,356s. Recibos externos R651/R655/R657/R664/R666 em
`audits/2026-10-31-visual-consistency/` na raiz agregadora.

Próximo: crítica Native independente dos cinco paths atuais e publicação normal
sobre Lajes. O alias verde é técnico; não concede aprovação visual, browser,
mobile físico, MP ou release. A missão integral e os owners continuam preservados.
