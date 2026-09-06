# Produção CSBrasil — coordenação e janela de 24 horas

## Objetivo e decisões do dono

Ruben autorizou em 06/09/2026 reorganizar globalmente as frentes para reduzir consumo,
preservar qualidade e concluir os trabalhos abertos. Logo depois esclareceu que quer
concluir todas as frentes nas próximas 24 horas, mantendo a capacidade visual do Astra.
Janela operacional: 06/09 05:55 UTC a 07/09 05:55 UTC (06:55 Lisboa).
É meta de entrega, não garantia nem autorização para afrouxar critérios, comprar
créditos, aprovar visuais automaticamente ou fazer merge/deploy sem aprovação concreta.

O catálogo completo de armas continua no objetivo; áudio, menus, mapas e personagens
não podem desaparecer da fila. Escopo não especificado deve ser identificado antes de
implementar. O prazo não transforma trabalhos desconhecidos em concluídos.

### Prioridade refinada pelo dono: primeiro pacote

Em 06/09 Ruben esclareceu: o PRIMEIRO pacote a fechar é **time novo + mapas +
viewmodels das armas**. Escadão e Lajes incluem fixes, não apenas acabamento visual.
O pacote compreende Míticos/Lendas, mapas atuais Amazônia/Sertão/Escadão/Lajes com suas
correções abertas e viewmodels. Armas são prioridade de entrega junto com o time novo;
não podem ficar indefinidamente atrás da fila de mapas. M4 é marco inicial do catálogo,
não substitui nem encerra o escopo integral registrado no ledger de viewmodels.

**Depois desse pacote:** Sítio Atibaia e Mansão do Joá têm PRs abertos segundo o dono;
Campo do Morro e demais mapas em espera também ficam na fila seguinte. Identificadores
e estado desses PRs ainda não verificados; não despachar revisão ou implementação agora.
Áudio e menus adicionais permanecem no backlog; correções necessárias para o pacote
continuam consideradas. Não abrir escopo novo enquanto o primeiro pacote não estiver fechado.

Lajes: BUG141 de performance, candidato PR517. Escadão: passagens/lateral, divergências
de conectividade e horizonte. São entregas funcionais e devem constar do aceite do pacote.
Para fechar o pacote, registrar por componente implementação, validação, aprovação humana,
integração e publicação; não declarar pronto somando somente PRs ou gates verdes.

## Operação

- Coordenador: tarefa `01a073e4-50fa-7c52-9ac7-729a088fc976`, lane
  `vm-prep-precisao`, branch `codex/vm-prep-precisao`. Este arquivo é a fila global;
  evidências detalhadas ficam nos ledgers de cada frente, sem repetir investigações.
- Astra mantém direção visual, decisões difíceis e revisão de marcos. Terra executa
  tarefas delimitadas; Luna/scripts servem para rotinas. Não migrar tudo sem comparar
  resultados em um marco real. Nenhum modelo compra créditos ou aumenta gasto máximo.
- Transição por checkpoints seguros, sem descartar ou arquivar frentes. Iniciar com
  duas frentes de produção; reavaliar capacidade após o primeiro marco para o prazo.
  Mais paralelismo exige arquivos/recursos independentes, não apenas modelos livres.
- Um escritor por lane, um browser/captura por vez. Asset worker M4 permanece offline.
  Runtime de armas/mãos/câmera/HUD segue exclusivo da integradora vm-astra-pistol.
- Cada despacho define artefatos, critério de pronto e limite de tentativas. Após duas
  tentativas sem progresso, salvar e escalar uma pergunta técnica com evidências.
- Construtor não aprova seu resultado. Crítica independente em contexto delimitado;
  aprovação do dono preservada. Não reabrir aparência/poses aceitas sem defeito novo.
- Acompanhamento usa metadados e snapshots compactos. Não ler turnos inteiros/logs
  JSONL. Revisões/render/testes só quando mudança ou falha concreta justificar.
- Priorizar terminar candidatos próximos da entrega antes de iniciar melhorias novas.
  Separar implementado, validado, aprovado, pronto para release e publicado.
- Checkpoints do prazo: T+2h inventário/bloqueios, T+8h primeiras entregas, T+16h
  foco em integração/pendências, T+22h congelar novos incrementos para validação final.
  Não prometer catálogo completo antes de medir esforço restante.

## Fila e checkpoints

| Frente / tarefa exata | ID | Estado observado / próximo passo |
|---|---|---|
| Preparar frente Snipers e Precisão | 01a073e4-50fa-7c52-9ac7-729a088fc976 | Coordenação; catálogo integral no ledger específico abaixo |
| Prepare a frente Rifles do CSBrasil. Leia integralmente: /V… | 01a073e3-1632-73d3-9683-e1394339fa8e | DESPACHADA Terra/high: M4 tactical do checkpoint Claude, somente offline, aguardando início confirmado |
| Elevar visual do Escadão | 01a073e5-b003-7993-afd6-41d31e25d98d | PAUSADO ada21d8d, codex/escadao-passagens-horizonte limpa; duas divergências do grafo e horizonte pendentes; próximo marco45–90min, R5 estimado2–4h; Astro8148/PID94385 ativo sem captura |
| Elevar visual de Lajes | 01a073e5-35e9-7312-b6a7-7beecc8df714 | PR517 integrado como b64aa886 às 08:06:31Z após CI/Vercel verdes. Sem deploy novo; integração liberou Sertão |
| Elevar visual da Amazônia | 01a073de-ee16-74a1-8deb-c92763271450 | PR439 integrado em alpha.228; hotfix CTF2 PR521 integrado como 3d4fdaa, release main bee6d13e alpha.230. Gates remotos verdes; nenhuma pendência de integração desta correção |
| Elevar visualmente o mapa Sertão | 01a073c0-b824-7503-b28a-f7522cececcc | RETOMADA após Lajes: atualizar PR516 contra b64aa886, investigar falhas remotas no head d8b7584d, validar e publicar head limpo. Merge/deploy só após nova CI verde |
| Revisar e shipar PR Miticos | 01a07485-2ddf-7052-b858-f814cabc30f7 | Cuca IK candidata reprovada no checkpoint 7c116d97: converge ao alvo projetado, mas não segura a arma e piora o custo; sem mudança pública. Zumbi textura/integração e outros personagens pendentes; PR481 conflitante |
| Corrigir modo CTF na home | 01a07540-471d-7a60-9448-2692d52ab8dd | Implementado 4abeaa40; relato build/browser3:2 aprovados; não publicado; três falhas gerais fora do menu |
| Estabilizar CSBR antes de expandir | 01a069ad-894d-7fb0-80d4-21b00fa1e60d | Último turno interrompido preparando laboratório de áudio na home para escuta; tracer separado do PR; recuperar escopo/ledger antes de produção |
| Corrigir data dos gráficos | 01a073dd-418d-73b1-8583-ce2560742795 | Última resposta relata aplicado em produção, PR508/admin6/backend21; histórico ausente não retropreenchido. Não reabrir sem defeito novo |
| Corrigir contagem de players online | 01a06d45-7570-7501-b75b-eaffd629ad5b | Último turno completed sem resposta textual; não contar como resolvido sem evidência |
| Mais áudio, menus e mapas em espera | escopo a consolidar | Não inventar novas entregas; recuperar backlog existente e sinalizar itens ainda indefinidos |
| Sítio Atibaia, Mansão do Joá, Campo do Morro e outros mapas em espera | PRs a identificar | ETAPA2 por decisão explícita do dono; sem despacho antes do primeiro pacote |

Míticos: ledger `/Users/ruben/csbrasil/worktrees/miticos-visual/docs/reports/MITICOS-VISUAL-CONTINUATION.md`.
Checkpoint recebido confirma servidores 8191/8192/8193 encerrados, crítico interrompido,
sem captura própria ativa, sem automação; aguarda novo despacho.

### Novos defeitos reportados pelo dono — 06/09

O dono relata travadas na Amazônia acima de 5x5, mesmo depois do fechamento de PR439.
Não assumir que tem a mesma causa de Lajes. PR517/Lajes é referência de método: nele a
visão dos bots em 8x8 caiu de 6.059.736 para 22.056 testes de triângulos preservando a
sequência de impactos; a correção é específica de Lajes até reproduzirmos outra causa.
Frente Amazônia recebeu investigação primeiro, offline: matriz de carga para todos os
mapas, separando visão/oclusão, colisão, render e GC, com 5x5 e 8x8 quando suportados.
Não mudar runtime ou mapas sem uma régua que reprove o estado atual e uma hipótese medida.

Também investigar cabanas/palafitas da Amazônia: escada voltada ao lado de respawn com
visão desobstruída para o rio, e madeiras aparentemente flutuando sem estaca/contato com
o solo. Primeiro localizar coordenadas/nós e relações com spawn/linha de visão; árvores
podem permanecer. Não remover cobertura nem editar geometria por inferência. Auditoria
inicial sem browser; imagens/validação de gameplay terão reserva exclusiva quando houver
candidato concreto.

PR516/Sertão foi elevado pelo dono a prioridade explícita. Página pública confirma PR aberto
de `codex/sertao-main` para `main` e candidato documenta validação local; ela não expôs um
estado de merge confiável na consulta anônima. A lane deve resolver contra `origin/main`
atual, registrar os conflitos e as decisões por arquivo, regenerar só derivados necessários
e validar o head resultante. Remotos locais confirmados: `origin` é corosolto/client e
`nfvelten` também existe; nenhum push pode ir ao segundo. Após novo head MERGEABLE, manter
o PR aguardando reserva de integração, sem canário/deploy até Lajes concluir.

Em 06/09 a verificação autenticada confirmou `main` em `5b029b64`, enquanto a resolução
local preservada está em `b9c5e88b` (integra somente alpha.228) e PR516 ainda aparece
`DIRTY`. O gate `portao-browser` do head público `ca8d569f` também falhou. A próxima
execução deve atualizar essa resolução com a `main` que já contenha o hotfix CTF2
independentemente revisado, executar novamente a matriz final e só então publicar o head
em `origin`. Isso mantém Lajes -> Sertão -> Escadão como ordem de integração.

### Bloqueio de integração: CTF2 Amazônia

Durante o fechamento de Lajes, CI/shared main reprova CTF2 somente porque Amazônia tem uma
rota nos pares B→E, B→MID e B→B; Lajes tem duas. O candidato Lajes (`ec40d26b`, base
alpha.228) passou LRP1, contratos/mapas, build, DCO, ratchet, versão, Vercel, smoke e
portão-browser. Seu diff não toca Amazônia nem CTF; não esconder a regressão em PR517.
Lajes foi preservada limpa no checkpoint `2af96c261534461c7870f88e0ef34a2db15af855`,
sem merge/deploy. A frente Amazônia pausa inventário 5x5/palafitas e prioriza localizar
nós, colisores ou oclusores que removem rotas, corrigir o mínimo e provar CTF2 ≥2 para
cada par afetado, com contraprova/mutante. Sertão pode resolver seu conflito, mas não
declara checks finais nem entra em merge antes de main corrigida; integração continua
sequencial Lajes → Sertão → Escadão.

Revisão independente final aceitou o contrato de navegação para publicação de branch/PR,
sem aprovar merge ou release: commit `24397a04`, fonte SHA-256
`a2996b7268089930e739df99962a40857469fd602714b6a1564b7fa8a39cb1d7`, 24 nós/25 ligações,
exatamente os conectores `[362,310]` e `[385,250]`, maior segmento 2,263 m e bots 71/71.
A contraverificação percorreu continuamente os 26 pontos nos dois sentidos, com colisão
real e sem recuperação. Recibos fixed/mutant foram regenerados contra esta fonte final:
duas rotas nos seis pares; o mutante reduz B→E/B→MID/B→B a uma. Há degrau de
aproximadamente 0,406 m junto ao pontão; a prova é de transitabilidade, não suavidade.
O branch `origin/codex/amazonia-ctf2-hotfix` e PR521 foram publicados; `check:deploy`
passou 37/37 com o Node do workspace. Em 06/09 às 07:13:27Z o PR foi integrado como
`3d4fdaa22358f373c3fb08d01df21af700c98f07`; `main` recebeu a release alpha.230
`bee6d13e`. Build global (11m48s), portão, smoke, DCO, CodeQL e Vercel passaram. A fila
de integração foi liberada para Lajes, depois Sertão e Escadão.

## Viewmodels e substituição Claude

`VIEWMODEL-CATALOGO-ORQUESTRACAO.md` conserva catálogo, controles, critérios e release.
Os parágrafos históricos que mandavam retomar Claude após cota estão SUPERADOS pela
autorização de redistribuição. Não retomar a sessão Claude automaticamente às 09:50.
Sessão e insumos ficam preservados; não cancelar outros Claudes fora desta frente.
Confirmado em 06/09: PID antigo não corresponde ao worker, exit1 por cota. Scripts novos
continuam na lane rifles, não versionados. Artefatos/revisão salvos na coordenação.
Terra deve começar pela revisão M4, preservar controles e produzir progresso verificável.

## Continuidade e automação

Automação existente `coordenar-cat-logo-de-viewmodels-com-claude` foi renomeada para
`Coordenar produção CSBrasil — 24 horas`, com prompt global sem retomada Claude.
Reativada após despachar M4 + Amazônia, a cada15min, somente mudanças acionáveis.
Coordenação operacional configurada para Terra/medium no próximo turno desta tarefa;
Astra permanece disponível para revisões/decisões delimitadas. Não criar duplicata nem
deixar mecanismo antigo lançar Claude. As duas tarefas despachadas já aparecem active
em novos turnos; modelo configurado via ferramenta, sem observação independente do runtime.
A janela de 24h não encerra silenciosamente o objetivo: no prazo, informar entregues,
pendentes e bloqueios com artefatos. Continuar objetivo autorizado conforme prioridades.

## Próximo passo

M4 tactical segue offline. Amazônia aguarda somente os recibos CTF2 atualizados e o commit
local final; até ele ser revisado e integrado, Lajes/PR517, Sertão/PR516 e Escadão/R5 não
avançam ao merge. A fila poderá avançar enquanto M4 trabalha offline, sem abrir mais
produção concorrente. Atualizar tabela por retorno.
Registrar modelo configurado separadamente do modelo efetivamente observado quando possível.

Decisão Astra `/root/decisao_cuca_pacote1` despachada em contexto limpo: somente leitura,
até quatro imagens existentes, uma hipótese/experimento mínimo para Terra, sem browser,
renders ou alterações. Preparação de decisão não ocupa escritor de produção. Preservar
parecer em artifacts/viewmodels/prep/precisao/orquestracao/ antes de despachar correção.
Após fechamento dos mapas prontos, liberar produção de personagens com esse parecer;
manter uma frente de armas avançando por marcos durante o primeiro pacote.

Parecer Astra Cuca: os dados não sustentam alterar pesos nem mount. Crouch anterior tinha
gap L máximo 1,00 mm e mínimo global -325,82 mm; raised reduziu cauda no chão para
-8,68 mm, mas elevou gap L a 164,46–238,42 mm (crouchwalk 76,35 mm). A hipótese útil é
alvo esquerdo fora de alcance após a nova relação tronco/braço/shotgun, possivelmente
ampliada pelo clamp frontal do braço direito. Terra deve primeiro sondar apenas crouch
raised, amostra17 (~0,591667s): juntas/palma/alvo L no mundo, clamp R e retornos pedido,
alcance e resíduos do IK. Aceita a hipótese se recorte de alcance e resíduo projetado
<=1mm; caso contrário investigar convergência/transformações. Esta sonda não aprova Cuca.

Sonda Terra concluída no checkpoint `fa883ed6`: crouch raised/amostra17 aplicou clamp R;
alvo L pós-clamp pediu 662,193 mm para alcance de 457,494 mm. Resíduo L ficou 241,616 mm
ao alvo original e 36,917 mm ao projetado após oito iterações. Há recorte de alcance, mas
o solver ainda não converge no alvo projetado; não atribuir a falha a pesos, contato ou
`rightGap`. Segunda e última investigação antes de nova decisão: comparar 8/16/32 iterações
na mesma cadeia/espaço, registrar juntas e rotações. Sem asset/pose/runtime/browser.

Segunda sonda Cuca fechada em `814271a7`: reproduzindo escala anatômica 1,06832273 e
clamp local do runtime, cadeia LeftArm→LeftForeArm→LeftHand gira em todas as rodadas;
resíduo projetado cai de 37,550 mm (8) para 18,246 (16), 8,335 (32), 3,480 (64), 1,202
(128) e 0,996 mm (256). É convergência, não espaço/cadeia. Receita ainda NÃO aplicada:
parametrizar `ik.iterations` e usar256 somente para Cuca candidata, mantendo padrão8;
antes medir custo por bot/estado e submeter visual+custo a crítica independente.

Medição de custo concluída em `c9cb4942`: 16 bots explícitos, 250 warmups e 1.000
amostras; todos8 mediana/p95 0,296542/0,318206 ms por frame isolado, quinze8+Cuca256
0,584251/0,628124, delta +0,287709/+0,309918 ms. Não há orçamento formal por
personagem para comparar; custo bruto e lacuna foram preservados. Crítica independente
`/root/critico_cuca_ik` foi despachada antes de qualquer implementação restrita.

Crítica Cuca concluiu: aceitar experimento local, rejeitar conclusão de pegada resolvida.
`IK_L_SKIP` em `public/js/glbchars.js` impede criar `ikL` para Cuca, logo só aumentar
iterações seria no-op público. A candidata deve criar ikL/256 explicitamente em seu arnês,
sem remover skip global; manter8 para todos os demais. Mesmo em256, alvo original fica
~210,539 mm distante: só o resíduo do alvo projetado fecha. Antes de integração, comparar
baseline público/candidata8/candidata256 em atualização completa e partida, com contato de
superfície, ciclos/transições, armas, hitbox, corpo/cauda e p95/p99. Browser foi reservado
exclusivamente a essa validação; falha de contato, hiperextensão ou frame regressivo rejeita.

Validação restrita concluída no checkpoint `7c116d97`, sem mudança pública: o arnês criou
`ikL` somente para a candidata e comparou baseline público, candidata8 e candidata256 em
crouch/crouchwalk, quatro fases, vistas e closeups. A 256 fecha o alvo projetado (crouch
2,472–5,538 mm; crouchwalk 0,767–0,995 mm), mas a mão esquerda permanece 59,668–64,836
mm da arma no crouch e 73,241–80,506 mm no crouchwalk. O crítico reprovou dedos sob o
guarda-mão, sem envolvê-lo, e braço excessivamente esticado. Atualização completa em
crouch subiu de 0,1/0,2 ms mediana/p95 na candidata8 para 1,4/1,5 ms na256 nesta captura.
Morte/respawn e arma de uma mão foram exercitados; nenhum `pageerror`; 129 PNGs e vídeo
de 3 s estão em `artifacts/miticos-review/cuca-proxy/ik-candidate-validation/`. Como a
revisão local já falhou, não houve partida real; navegador e servidor foram encerrados.
O próximo experimento só pode atacar alvo/offset de palma/orientação dos dedos, preservando
esta prova e o `IK_L_SKIP` público.

Essa hipótese foi explorada e reprovada no checkpoint `1c435f08`, ainda só no arnês local:
o alvo `fore [-0,055, 0,075, 0,09616]` com 128 iterações reduziu a folga esquerda para
até 3,614 mm nas oito amostras crouch/crouchwalk e o resíduo CCD para até 1,463 mm. Curls
0,3/0,6/1,0/1,4 foram comparados; 1,0 foi o menos ruim, mas duas críticas independentes
reprovaram dedos em garra vertical, compressão/atravessamento e desaparecimento no receptor,
além de braços rígidos. Não há ajuste seguro só de alvo/CCD/curl. Próximo candidato exige
retarget/pose da mão esquerda (palma e falanges) e possível ajuste de mount; sem fonte,
GLB, PR, partida ou deploy público alterados. Navegador e servidor 8194 foram encerrados.

M4 tactical Terra foi rejeitada no checkpoint `29f07868`, sem tocar idle/runtime/materiais:
magazine real/readable e reimport/retorno2,4s passam, mas frames13/45 ainda expõem pele
no punho L e somente polegar fica a<=5mm do pente; indicador/médio/anel/mínimo medem
13,760/17,434/10,792/6,456mm. Três tentativas cuff sem progresso encerraram a rodada.
Diagnóstico Astra delimitado foi solicitado para escolher uma única intervenção de
topologia/skin/pose que resolva cobertura e contato sem maquiar métricas.

## Registro de consumo e limites operacionais

Snapshot da conta consultado às ~05:52 UTC: janela semanal73% usados, 5.000 créditos,
zero resets disponíveis. Não atribuir esse gasto às tarefas nem converter para dólares.
Não há novo orçamento monetário autorizado. Não acionar compra/API alternativa. A meta
24h não equivale a gasto ilimitado. Conferir consumo nos marcos relevantes e avisar
se os limites impedirem a execução. Economia virá de contexto/escopo e delegação, não
da redução dos critérios visuais. Tarifas/modelos foram verificados nesta tarefa.
