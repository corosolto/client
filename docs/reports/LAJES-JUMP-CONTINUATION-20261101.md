# Continuação: régua do salto de Lajes (R602)

## Objetivo e limite

Reancorar somente LS6 no salto global 5.6 aprovado e no impulso local 5.85,
medidos por Game real a 1/120 s. Preservar LS1–5 e demonstrar mutações causais.
Não modificar física, mapa, assets, baseline global, UI, arma ou mãos.

Missão do dono preservada: integrar PRs elegíveis e acompanhar release/backend;
consistência de mapas, grafites, personagens, skins e movimento/ADS conforme
PDF/roadmap/referências e revisão humana 3:2. Flávio #1158 excluído; UI/social
depois. Este reparo de instrumento não aprova arte/mobile/MP/loja/release.

## Estado e procedência

- Branch `codex/lajes-jump-r602-20261101`, base staging
  `de28d3a13a91731b99675e5d13724ff3743c8ac7`, WT isolada de mesmo nome.
- Alterações permitidas: `tools/eval/lajes-spatial-check.mjs` e este ledger.
- Normas lidas: AGENTS, skills regua/bug-hunt/pr-hardening, ref-measure,
  quality-gates, docs/LICOES no repo irmão progress e ledger central da missão.
  Revisão Native independente será coordenada pelo Root; não houve GH/browser.
- Referência de produto: `e555cadf11e0ff4697eabd71cd6023327841ae1e`
  aprovou salto padrão 5.0→5.6; `Game._moveEntity` aplica gravidade 20.6 m/s²
  antes de integrar Y. `map_lajes_authored.js` declara 5.85 m/s.
- LS6 mede deslocamento vertical dos pés em metros a partir do chão do spawn;
  não mede altura da câmera nem soma o offset dos olhos.

## Evidência atual

Em 2026-11-01, `node tools/eval/lajes-spatial-check.mjs` original nesta WT:
exit 1 em 3.797 s; LS1–5 PASS, LS6 RED com Lajes .806 m e controle .738 m.
Recibos externos em `audits/2026-10-31-visual-consistency/`:
`LAJES-JUMP-R602-BASELINE.{json,log}`. Hash do checker antes:
`86b48f0eef4a626719148742b520cc1a3a1f1f8568d74ad75aa6c7c487451ec0`.

## Contrato discreto e reparo

Com v em m/s, g=20.6 m/s², dt=1/120 s e pés começando em y0, Game faz
v_n=v-n·g·dt e y_n-y0=n·v·dt-g·dt²·n(n+1)/2. Completando o quadrado, o
máximo contínuo nos índices n é U=(v-g·dt/2)²/(2g). O inteiro mais próximo
está a no máximo 1/2 passo desse máximo, logo o ápice amostrado pertence a
[U-g·dt²/8,U]. A largura deriva do passo do integrador; não há epsilon extra.
Os impulsos esperados são pins independentes do mundo medido. A medição e a
fórmula compartilham PASSO_PULO e o probe continua chamando Game._updatePlayer.

Em 2026-11-01, o nominal mediu Lajes 0.806319 m e controle 0.738000 m. As
janelas derivadas são [0.806268,0.806447] e [0.737832,0.738011] m (exibição
arredondada; comparação usa doubles sem arredondar). São deslocamentos dos pés
relativos ao chão inicial. Sem input direcional, não se aciona a busca de mantle.
120 passos cobrem o voo completo desses impulsos. LS6 também exige vantagem local.

O probe reinicia p._spaceHeld, campo consumido por _moveEntity, e rejeita medida
não finita. O controle recusa override do mapa para exercitar o fallback global.
pulo-global exige impulso local aprovado e confere a atribuição antes de imprimir
aplicação. Carga dinâmica e exceções fatais saem 2 (INFRA); falhas das linhas LS
saem 1; nominal ou mutante sobrevivente saem 0. Sobrevivente mantém aviso explícito.
Falha de parse antes de instalar o guard continua sendo INFRA do lançador externo.

Uma proposta GLM SDK zai/glm-5.3 low levou 74.12 s: um despacho, tools[], MCP
desabilitado, cap6000 no streamFn, sem retry/fallback/compaction. RAW/ANSWER foram
selados 0444 antes da leitura. Aceita a matemática; rejeitados epsilon 1e-6 sem
necessidade, comentários longos e suposta prova de survivor por rejeição de nome
desconhecido. Codex aplicou a proposta parcialmente e acrescentou as fronteiras
de aplicação/INFRA/reset descritas acima. Isso é adjudicação de autoria, não
revisão independente do patch final.

## Provas focais em Node (2026-11-01 UTC)

`node tools/eval/lajes-spatial-check.mjs` corrigido: 6/6 PASS, exit 0, 4.193 s.
Matriz pelo arquivo real, com exatamente as falhas abaixo e demais LS PASS:

| mutante | falhas exatas | exit |
|---|---|---|
| spawn-alto | LS1, LS2, LS3 | 1 |
| rota-unica | LS2 | 1 |
| rota-bloqueada | LS4 | 1 |
| escada-bloqueada | LS5 | 1 |
| pulo-global | LS6 | 1 |

Pulo-global aplica 5.85 ao controle e mede 0.806319 m nos dois mapas; isso fica
fora da janela aprovada do controle. LS1–5 (núcleo e linhas de resultado)
permaneceram byte-idênticos à base, ver PRESERVATION.json externo.

Controles em memória com o mesmo harness real: movimento com controle 5.0,
perda do override local, passo de medição dobrado e reset antigo com Space já
segurado reprovam só LS6. Space previamente segurado passa com o reset correto.
Ápice não finito, produtor que lança, harness ausente, nome desconhecido,
pulo-global sem atribuição/sem impulso local e controle com override saem INFRA2.
Suprimir somente o assert LS6 faz o pulo-global real sobreviver: seis LS PASS,
exit0 e aviso de sobrevivência. Não houve crédito falso de kill. Builders com
zero ou dois anchors foram rejeitados antes de executar SUT.

Resultados válidos: 19 casos (2 GREEN, 9 RED semânticos, 7 INFRA, 1 survivor), mais
dois controles do builder sem SUT. V1 foi parcialmente rejeitada: três comandos
stdin com argumentos não tinham o marcador `-`, portanto não carregaram o checker.
Os rótulos GREEN desses três no JSON V1 estão errados e foram explicitamente
reclassificados em V1-REJECTED.json, sem crédito. V2 corrigiu esses três e provou
as duas fronteiras novas de reset antigo/override do controle. Produto e checker
mantiveram os mesmos bytes durante toda a matriz.

Recibos externos: `LAJES-JUMP-R602-VERIFY-RESULTS.json`,
`LAJES-JUMP-R602-VERIFY-V1-REJECTED.json`,
`LAJES-JUMP-R602-VERIFY-V2-RESULTS.json`,
`LAJES-JUMP-R602-PRESERVATION.json` e `LAJES-JUMP-R602-GLM-*` em
`audits/2026-10-31-visual-consistency/`. Sources dos controles são externos;
nenhum arquivo de produto foi alterado para executá-los.

## Checkpoint e próximo passo

O checkpoint DCO/Agent é o HEAD desta branch isolada; o report/manifest externo
R602 registra seu SHA. Próximo: Root rebinda os pins e pede revisão Native
independente integral deste diff e fronteiras. Ainda pendentes: essa revisão,
eventual publicação/CI/merge pelo Root. Sem push/GH, browser, build geral,
check:fast, FPS, MP, imagem, asset ou aprovação artística nesta frente.
Root continua único autor das demais frentes; nenhuma WT alheia editada.

R626 repetiu nominal e cinco mutantes uma vez em Node22.23.4: seis PASS causais,
zero INFRA. R619 fez crítica independente integral; R626 fez revisão GLM integral
do checkpoint final. GLM encontrou um guard herdado de escada: o acesso a z ocorria
antes da validação de s. R637 comprovou TypeError com stairs vazio, ainda INFRA2,
e moveu somente esse acesso para depois do guard. Não mudou LS1–5 ou a física.
R637 preservou INFRA2 com diagnóstico específico e sem TypeError no controle
stairs vazio; o mutante real continua RED somente LS5, outras cinco GREEN.
Crítica independente do whole atualizado e publicação permanecem pendentes.
