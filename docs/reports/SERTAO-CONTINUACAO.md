# Sertão: continuação da revisão do PR #445

## Objetivo e aceite
Elevar visual e tecnicamente o Sertão preservando layout, três rotas, objetivos, spawns, pickups e desempenho. Aprovação exige captura real 3:2, movimento, contratos e mutações, comparação antes/depois e revisão adversarial humana. Não fazer merge nem deploy. A entrega autorizada pode ser commits locais prontos para integração.

## Isolamento
Worktree criada exclusivamente em `/Users/ruben/csbrasil/worktrees/sertao-astra`, branch `codex/sertao-astra`, origem `49441895bebdfa328a228de142d0015b4597db9f` de `origin/map2/velho-oeste`. Nenhuma worktree existente usada para implementação. `git worktree list` verificou que a branch original estava livre. O diretório agregado `csbrasil` não é raiz Git.

## Diagnóstico antes de alterar o mapa
Evidência: `artifacts/sertao-astra/before/` contém sete PNG 1536×1024, câmera FOV 70 e metadados em `capture.json`. Chrome/ANGLE Metal Apple M4 Pro, sem SwiftShader. Fonte: baseline acima. Todas as imagens foram abertas pelo responsável; revisão independente em andamento.

- Bom: igreja branca reconhecível, poço, caminhão antigo, três famílias de fachadas fechadas e porte de vila. Há cobertura central, flancos e objetivos definidos.
- Reprovado visualmente: casas pau-a-pique são pavilhões abertos de madeira; folha inexistente no juazeiro; cerca de ranch, carroças e tumbleweeds reforçam western; amarelo/laranja domina luz e solo; costura vertical do céu no quadro forró; plano acaba no vazio; planta invade o palco; placas se sobrepõem e não há venda/forró identificáveis.
- Escala/colisão: igreja visível mede cerca de 4.35×6.30 m no chão, mas seu colisor ocupa 8.8×13.4 m. No ramo GLB a rotação do prop não chega ao grupo usado no cálculo do colisor. Alpendres são caixas sólidas invisíveis até 2.6 m de altura. É hipótese de impacto jogável a medir, não aprovação da geometria.
- Repetição: mesmo mandacaru e esqueleto arbóreo por todo perímetro. Nenhum fundo em camadas.
- Performance baseline: 503 calls / 320181 tris na aérea, 86 texturas / 117 geometrias. Build 64 ms. Captura estática não prova FPS de partida; medição em movimento pendente.
- Gates frescos iniciais: `eval:sertao`, `eval:velhooeste`, `eval:mapcontrato`, `eval:ambience-registry`, `eval:look` passaram. `eval:ambience` não executou por dependência ausente, resolvida com `npm ci --ignore-scripts` na worktree. Essa falha não conta como reprovação do mapa.
- PR remoto: `CONFLICTING/DIRTY`; merge virtual apontou seis conflitos em documentação gerada, sem conflito de runtime. O merge virtual não alterou checkout/index. Não incorporar toda a base nesta entrega para não misturar outras frentes.

## Decisões
Pesquisa de referências e acervo em `SERTAO-REFERENCIAS.md`; crítico independente em `SERTAO-CRITICA-BASELINE.md`. Não comprar nem gerar assets pagos. Reusar acervo com procedência verificável e modelagem procedural própria quando o molde não satisfaz a silhueta. Preservar posições das casas, spawns, bandeiras e armas. Corrigir falsos bloqueios e correspondência de colisão com geometria visível. Remover tumbleweeds por decisão explícita do dono de eliminar western; substituir a exigência antiga de colisão móvel por régua de microvida sem bloqueio competitivo. Não baixar áudio de origem incerta.

## Em andamento / próximo passo
Criar réguas antes da correção para textura íntegra, vegetação não obstrutiva, semântica ligada à malha, correspondência física e três rotas. Corrigir céu, casario e entorno; recapturar e testar. Registrar commits e resultado integral dos gates antes da entrega. Nenhum resultado visual está aprovado.

## Marco técnico — 06/09
Checkpoint de diagnóstico/procedência: `727f3c84`. Alterações de runtime permanecem nesta branch exclusiva. As réguas espaciais passam 8/8 com 11 mutantes isolados; runtime GLB passa 5/5 e quatro mutantes isolados, incluindo varanda falsa, corpo ausente, batching desligado e spawn exposto. Semântica dos GLBs ligada à malha real; 10 postes finos substituem bloqueios de varanda; igreja corresponde ao footprint observado. Quatro abrigos novos eliminam LOS entre olhos dos spawns opostos sem mover coordenadas.

Custo mapview intermediário: máximo 420 calls / 354401 tris; comparação baseline 503 / 320181. Folga de tris de 15% declarada conforme cena-tetos; não é FPS de partida. A revisão adversarial de uma iteração rejeitou copas/texto/fundo; versões corrigidas aguardam nova crítica. Capturas correntes em `artifacts/sertao-astra/runtime/`; relatório crítico tem hashes para distinguir a iteração avaliada.

`check:fast` fresco: 100/104; falhas docs:check, audio:check, skills:check, eval:docsautoria. Pacotes oficiais audio-v6 e decals-v2 baixados apenas nesta worktree: assert:assets agora passa. Sync local de skills e docs geradas executados; recheck pendente. Pacote audio-v6 tem manifesto incompatível com o gerador atual e não contém a pasta ambiente; não reescrever o manifesto removendo falas para forçar verde. `eval:ambience` tinha path `map_${id.slice(3)}.js` inexistente; corrigido para mapa real, execução de browser pendente.

Próximos passos: movimento real antes/depois e mapa pesado de referência; terminar ambiência/global/build; recapturar após correção do solo contínuo; revisão adversarial; commits pequenos e relatório de integração. Não houve push, PR novo, merge ou deploy. Nada está aprovado visualmente.

## Prompts para frentes paralelas — solicitação adicional do dono
Preparados em `artifacts/sertao-astra/prompts/{amazonia,lajes,escadao}.md`, completos e independentes. PRs conferidos: Amazônia #439 (`map2/amazonia`), Lajes #438 (`map2/lajes`), Escadão #436 (`map2/escadao`), todos com base `feat/times-e-mapas-completo`. Cada prompt exige worktree nova, portas distintas e benchmark GPU sem concorrência. Nenhuma nova task/worktree foi criada por esta solicitação.

O objetivo completo do Sertão permanece pendente. Último checkpoint: `d1ff3d60` (céu). Alterações posteriores de mapa/paisagem/réguas ainda não commitadas. Último runtime validado: 5/5, quatro mutantes; SP 8/8, 11 mutantes. A cláusula RV6 e seu mutante `emenda-solo`, acrescentados para material contínuo entre solo e entorno, ainda precisam executar e recapturar. O relatório crítico final existente corresponde à iteração anterior, identificada por hashes, e não aprova a última versão.

Movimento real de 30 s em 1536×1024, sete bots, Chrome Metal, com todos os passes: baseline p50/p95 9.5/14.5 ms; depois 12.5/19.2 ms; referência Loja H 23.5/42.7 ms. Distâncias percorridas 101.97/99.74/95.03 m, sem completar todos os waypoints. Calls médios 885.79/817.65/875.07; triângulos médios 819469/745258/1760443. Relatórios em `artifacts/sertao-astra/motion-{before-velho_oeste,after-velho_oeste,reference-loja_h}/report.json`. Há piora medida de frame time: não alegar ganho de FPS com base na queda de draw calls. Ambiente não isolado e pequena correção posterior de material exigem validação final; preservar todos os resultados.

Próximo passo concreto: congelar a última iteração, rodar runtime/RV6 e mutante, examinar sete imagens atuais, pedir nova crítica independente, finalizar ambience/build/docs e repetir medição controlada antes de qualquer conclusão de performance. Só então checkpoint pequeno de runtime e relatório final. Sem push, merge, deploy ou aprovação visual.

## Marco de continuação — iteração polish4
Retomado explicitamente por instrução do dono para finalizar Sertão. HEAD ainda d1ff3d60; toda implementação posterior é exclusiva desta worktree. Casas autorais fechadas, copas instanciadas, mandacarus autorais sem pedestal, correção dos volumes físicos, abrigos de spawn e solo/entorno contínuos implementados. Captura polish4: RV1–RV9 9/9, máximo 470 calls / 264829 tris, solo ROI desvio 11.04. Não é aprovação visual: crítica independente nova em andamento. A polish3 também passou nos números, mas foi REJEITADA pelo autor por ondas repetidas no chão e faixas triangulares; substituída por ruído contínuo não direcional e removidas faixas. Preservados os artefatos rejeitados.

Sete gates Node frescos passaram: sertao, velhooeste, sertao-spatial, mapcontrato, asset-integrity, maptex, map-source (logs/polish3-gates.log). Ambience em Chrome Metal passou 16 cláusulas (logs/ambience-final.log); esse teste global não aprova áudio Sertão. Sete áudios CC0 existentes foram recuperados das fontes exatas, com tamanho/SHA/duração em audio-restored.json e FONTE.md; sanfona continua ausente e distribuição no pacote é pendência. Não houve substituição musical de procedência incerta.

Próximo: testar sensibilidade atual de todos os mutantes, circulação física pelas três rotas, captura com personagens, desempenho final comparável, crítica dos pixels e correções necessárias, build/global e commits pequenos. Não houve push/merge/deploy.

Circulação real validada em Chrome Metal, Game._updatePlayer a60Hz determinísticos (não FPS): oeste114.48m/22.77s,centro109.28m/21.77s,leste127.28m/25.33s, três chegadas a<.35m do destino, sem erros. Mutação de barreira pendente. ST1 antigo comprovadamente cego (49elementos/19tipos após remover flora); reparo restringe elenco primário e mantém pisos. Quatro preloads sem corpo visual removidos. Checkpoint de runtime preparado após estes marcos; ainda não aprovado visualmente.

## Marcos seguintes — circulação e crítica
Commits locais b4f96183 (casario/física/flora inicial) e035d0a9f (réguas espaciais/identidade). Três rotas completadas no Game._updatePlayer sem teletransporte no percurso; mutante barreira impede todas e reprova exclusivamente TR1. Crítico polish4 deu6/10; após solo pedregoso, venezianas e copa lateral, polish8 recebeu6.8/10: revisável por humano, ainda com entorno exposto, padrões distantes no piso e diferença de acabamento entre famílias. Não confundir revisão possível com aprovação do mapa.

Runtime polish8:10/10;485calls/266269tris;10mutantes isolados passaram. GLB fallback ainda não era medido explicitamente: revisão técnica solicitou reparo RV1 e mutação de falha real de download. OESTE5 também reteve exigência de bump removido; atualização deve manter obrigação de chão detalhado via RV9 e mutação de materiais reais. Build fresco passou; refazer após congelar shader final. Áudio probe inicial usou quatro nomes sem hífen incorretos: corrigir o instrumento e repetir, não tratar como falta dos arquivos recuperados.

## Congelamento visual para entrega à revisão
Os sete PNG after/ foram examinados pelo responsável e pelo crítico independente:7/10, aptos à revisão adversarial humana, com refinamentos restantes em piso/entorno/alvenaria. Nenhuma aprovação de publicação. Runtime10/10 antes do último agrupamento de venezianas/rodapés:487calls/277033tris. Agrupamento reduz5calls, preserva matrizes e material; mutante de falha real deGLB agora reprova somenteRV1 (500calls no fallback). Anteriormente sobrevivia; logantespreservado.

Node final pelo revisor:24execuções verdes — Sertão normal+6mutantes, VelhoOeste normal+10mutantes, Spatial8contratos+11mutantes, Look4mapas+4mutantes. Flora/MC: auditoria encontrou que algumas mutações tinham efeitos colaterais ocultos pelo runner; reparo instrumental em andamento, não alegar isolamento anterior. Áudio7arquivosHTTP200+decodeWebAudio, sanfona404. Build passou antes dos últimos acabamentos; recheckfinal pendente. Benchmarkpartidas ABBA em andamento, comparação com elenco/armas fixos a seguir; depoisglobal/build/commits/galeira.

## Fechamento técnico — descoberta adversarial de oclusão

A revisão final encontrou que tiros e LOS não recursivos ignoravam67Groups visíveis, incluindo igreja/casas. A falha também existe em49441895; não foi aceita como verde herdado. Correção local expande só oclusores registrados em Mesh únicas, sem mudar Game, pais ou pixels; copas/tecidos flexíveis ficam fora. Runtime atual11/11 e13mutantes isolados, incluindo retirada dos oclusores da igreja, todos verdes. Capturas after/ recapturadas:482calls/277033tris/84texturas; aparência igual à criticada7/10. Régua Node OC1–4 com mutações em fechamento.

Commits adicionais5458d9c5(runtime/travessia),0ada9243(flora com efeitos exatos),c10ed7ff(críticas/áudio). FL8/8 com10mutações isoladas+2multialvo; MC5/5 com6isoladas+2multialvo, prova isolada para todas as cláusulas. A versão anterior escondia colaterais; manter histórico rejeitado.

Runner global executado105/108: falhasaudio:check herdada,comentário de3linhas próprio e docsautoria por documento gerado ainda não commitado. Comentário encurtado; após registrar oclusão e docs, repetir global. Build eassert:assets passaram. Benchmark de custo da nova oclusão em andamento, com elenco/arma fixos; não usar medições pré-oclusão como resultado final. Próximo passo: concluir benchmark/OC, commit pequeno, regenerar/commitar docs, globalfinal e relatório SERTAO-ENTREGA.md. Sem push/merge/deploy.

Oclusão validada: OC1–4 verdes, sete mutantes isolados; RV1–11 verdes, treze mutantes isolados. Duas partidas pós-correção p95=10.0/10.1ms, semerros, contra9.5ms semcorreção na rodada controlada. Browser:379Mesh oclusores, zeroGroups; casters351→228 e meshes502→481. Contratos/implementação prontos para checkpoint. Resta mapcheck pós-oclusão, docs geradas commitadas, globalfinal e fechar relatório; nenhuma nova alteração visual prevista.

Última correção física: barril no centroCTFB deslocado[12,34]→[14,34], coordenadas doCTF preservadas. SP9mede _collide e sonda vertical:zero deslocamento/penetração nos3pontos. SP9/9 e14mutantesisolados; RV12/12 e14mutantesisolados; travessia ebarreira repetidas:3rotasverdes, leste131.76m/26.25s apósodesvio. Produto congelado novamente para registrofinal, sem nova alteração prevista. Runnerglobal107/109falhouaudioherdado edocsautoriapor linha de mapa alterada duranteexecução; regenerar/commitar docs antesdoúltimorun.

## Resultado final dos gates

Produto final486cc3cd; índices/documentaçãoa53ec67c. Runner fresco sobre estado congelado:108/109, únicafalhaaudio:check(manifestoherdadoDEFASADO). Docs/autoria/comentário corrigidos e verdes. Build5.83s, assert:assets e eval:maptex verdes. Artefatosclosed-global-runs.json e logs/closed-*.log. Runtime12/12,14mutantes; Spatial9/9,14mutantes; OC4/4,7mutantes; trêsrotas físicas e barreiravalidadas. Nenhuma alteração restante de produto. Relatório final/galeria e amostra final de desempenho em fechamento documental.

## Entrega e próximo passo

Amostrafinal pósbarril: p50=8.3/p95=10.0ms,7bots,30s,sem erros; motion-final-controlled-velho_oeste/report.json. Capturasafter/atuais eCTFBexaminadas; notaindependente7/10 permanece atribuídaàiteraçãoanterioraosajustesfinais, semaprovaçãoautomática. Entrega documental emSERTAO-ENTREGA.md:47arquivoslistados, gates,mutantes,rejeições,referências,pendências. Galeria emartifacts/sertao-astra/review.html; port8145continua disponívelpara revisão local.

Implementaçãoautorizada econtraprovas encerradas nesta entrega; próximo passo é revisãoadversarialhumana do mapa e dos commits locais, seguida de decisão sobre refinamentosvisuais. Antesdepublicar:resolver sanfona/distribuição/manifestodeáudio,termos/procedênciadoacervoherdado econflitosdoPR445. Nenhum push,PRnovo,mergeoudeploy. Não interpretarbranchlocalcomoaprovaçãofinaldojogo.
