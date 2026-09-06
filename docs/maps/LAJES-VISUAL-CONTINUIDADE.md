# Lajes visual — continuidade

## Estado corrente: PAUSADO por coordenação; correção pronta no PR517

Checkpoint de transição 06/09/2026: coordenação pediu pausa para redistribuir todas
as frentes e concluir até 07/09 aproximadamente 06:55 Lisboa. Objetivo e aprovações
anteriores preservados; não iniciar trabalho, merge ou deploy até novo despacho.

- Branch `codex/lajes-performance`; head de produção e remoto PR517
  `c26a40cfe0416232c33653de6a189bb843dff6ad`, incorpora main `f7f4402e`/alpha.227.
  Árvore limpa antes deste registro; somente este ledger alterado no checkpoint.
- Push final confirmado; hooks locais, docs e autoria passaram. PR517 OPEN e
  MERGEABLE. Snapshot remoto: dco, ratchet, versão e um build verdes; outro build,
  portao e smoke ainda em execução. CI não acompanhado após pausa. Sem merge.
- Candidato pronto para revisão: correção `c1397d67`, quatro mutantes causais,
  stress 220/220 e 189 raios sem divergências; revisão independente sem bloqueante.
  Visual V6/V7 aceito preservado, nenhuma simplificação nesta correção. Protótipo
  de índice com folhas maiores foi rejeitado pelo orçamento e substituído.
- Browser real 8×8: cerca de 7 para 56 FPS neste equipamento; amostra final 60 s,
  P95 33,3 ms, um hitch isolado 441,2 ms, zero erros JS. Não validado online.
  Build pós-main e seis contratos afetados verdes; demais dívidas detalhadas abaixo.
- Artefatos: `artifacts/lajes-performance/`; relatório `LAJES-PERFORMANCE.md`.
  Histórico visual e vídeos preservados em `artifacts/lajes-visual/`.
- Servidor próprio PID68351/porta8147 encerrado; nenhum browser, worker ou despacho
  automático próprio ativo. CI remoto já disparado pode terminar autonomamente.
- Próximo marco após despacho: conferir CI/reviews e drift da main, atualizar corpo
  do PR com integração alpha.227/invariants, integrar com head conferido se verde,
  registrar recibo. Estimativa 15–30 min se CI verde e main sem novo conflito;
  falha nova de CI exige diagnóstico antes de estimar. Não há bloqueio de código
  conhecido; entrega depende de CI final e despacho do coordenador.
- Retomar servidor se necessário: `node tools/eval/serve.mjs 8147` neste worktree.

Pedido de 06/09/2026 após revisão V6: manter ruas estreitas e apenas campo amplo;
remover casas azuis, trazer terra e gramados, ratos e baratas, mais pipas e Santos
Dumont voando (interpretação comunicada: 14-bis com piloto). Criar thumbnail real
com vídeo no hover, atualizar com main e atualizar/mergear PR se não houver
conflitos e builds/checks passarem. Esta autorização substitui a restrição local
anterior. Não publicar resultado parcial nem ignorar falhas.

- Baseline aceita: `1878dc01`, branch `codex/lajes-visual`, worktree isolado.
- Main consultada: `a551204f`; PR438 ainda em `map2/lajes`/base antiga.
- Auditoria independente constatou centenas de commits alheios no histórico antigo.
  Integração preservará a árvore moderna da main e somente arquivos/hooks Lajes,
  com ancestralidade de ambas as branches e diff final revisável contra main.
- Próximo passo: integração, régua V7 vermelha, ambiência/14-bis/hover, captura real,
  crítica independente, gates atuais, build, atualização PR e merge condicionado.
- Evidências V6 ficam em `artifacts/lajes-visual/v6/`. Artefatos V7 em `v7/`.

## Retomada: desempenho acima de 5×5 — 06/09/2026

Relato literal: “fiz um teste no lajes e acima de 5x5 players mesmo no single player o mapa trava. fiz comparacao com o mapa piscina na treta que funciona numa boa em 8x8...”.
Ainda não reproduzido. Objetivo: medir Lajes/Piscina sob carga equivalente, corrigir a causa
sem perder o visual/ruas aceitos, provar antes/depois e regressão, validar build e revisão.
Próximo: branch isolada `codex/lajes-performance` a partir da main alpha.226;
comparação no Game real e browser, CPU por subsistema e crescimento 5×5/8×8.
Frente principal: MAPAS/MUNDO e BOTS/JOGABILIDADE, somente após perfil identificar causa.
Artefatos novos: `artifacts/lajes-performance/`. Régua: nenhuma neste marco.

## BUG-141: reprodução e correção em validação

- Branch `codex/lajes-performance`, main alpha.226; marcos de retomada `90870a07` e `9b1f151f`.
- Browser Chrome/M4 Pro, 1536×1024, med, single player real: Piscina8×8 RAF P95
  16,9ms; Lajes5×5 199,3ms e Lajes8×8 391,6ms. Amostras12s em
  `artifacts/lajes-performance/browser-*.json`; não representam estabilidade longa.
- Node confirmou CPU LOS dominante; alvenaria agrupada testa milhares de triângulos
  por consulta. Índice de faixas12tri (uma caixa original), sem alterar render/collider:
  6.059.736→22.056 testes em189raios,166comimpacto; sequência de impactos idêntica.
  Mutantes linear e sem-parede vermelhos. Primeiro browser corrigido8×8 P95 58,2ms:
  melhora real, ainda insuficiente para encerrar investigação.
- Perfil browser residual: varais GLB, custo alto calculando obstáculos além da
  primeira parede. Hook opcional só Lajes `rayOccluded` agora encerra consulta no
  primeiro obstáculo; `_losClear` conserva fumaça e demais mapas.189/189consultas
  comparadas ao Three linear, sem divergências. Novo browser em execução.
- Crítica independente inicial sem bloqueante no formato estático atual; desempates
  passaram a preservar ordem original. Falta: stress near/far/transformações, browser
  prolongado e refutação visual, integração gates/docs, build e checkpoint final.
- Métricas render.calls=1/draw.triangles=1 dos primeiros scripts são pós-processamento,
  não custo da cena; não usar como prova de GPU nem de geometria equivalente.

## BUG-141: comportamento e carga prolongada validados

- LRP1 verde: 189 raios, impactos em sequência idênticos; trabalho 6.059.736 → 22.056
  triângulos. Hook da visão exercitado em 190 chamadas incluindo fumaça. Nenhuma
  consulta depois do primeiro obstáculo. Stress ampliado 220/220, inclusive troca
  de geometry/index, needsUpdate, materiais múltiplos, recorte e descarte.
- Quatro mutantes vermelhos: linear, sem-parede, sem-consulta e sem-parada.
- Browser sequencial de 60 s: Lajes 8×8, 3.393 quadros / 60,238 s, cerca de 56 FPS,
  P95 33,3 ms, zero erros JS. Piscina 8×8 P95 25,3 ms nesta rodada. Um intervalo
  RAF isolado de 441,2 ms permanece registrado; maior update 80,8 ms, sem atribuir
  esse evento a LOS. Não declarar FPS constante ou validação online.
- Revisão independente aprovou o código sem bloqueantes. Detalhes e reprodução
  em `LAJES-PERFORMANCE.md`. Check:fast em execução; próximo build, VM/invariants,
  restauração dos dados gerados, docs, checkpoint e integração da correção.

## BUG-141: portões locais concluídos e atualização da main

- Checkpoint de produção/régua `c1397d67`; documentação gerada `48f703a2`.
- Build passou. Check:fast 105/108 no passe inicial; IDs passaram na visão de todos
  os arquivos-fonte (falso positivo era artefato histórico V7), autoria passou após
  checkpoint. Somente audio:check permanece limitado ao pack privado incompleto.
- VM regenerado antes de invariants; auditoria completa terminou com nenhuma falha
  crítica nova. Dívidas herdadas permanecem no KNOWN-RED, sem afrouxar portões.
  Dados JSON/overlays gerados preservados em `artifacts/lajes-performance/generated/`
  e restaurados na árvore de código. Logs build/check-fast/invariants no mesmo diretório.
- PR517 aberta: https://github.com/corosolto/client/pull/517. Main avançou para
  `f7f4402e`/alpha.227 (Escadão). Próximo: merge normal, conflitos de documentos/
  scripts resolvidos preservando a main, regeneração, checks afetados/build e CI final.

## BUG-141: main alpha.227 incorporada

- Merge normal de `f7f4402e`, preservando Escadão, previews e descida de escadas
  opt-in. Conflitos de documentos resolvidos a partir da main e regeneração;
  manifesto preserva todos os scripts novos da main e acrescenta somente LRP1.
- Pós-merge: LRP1, integração Lajes, respawn físico, contrato de mapas, contrato
  Escadão e descida de escada passaram (6/6); build passou novamente.
- Próximo: envio final para PR517, conferir checks remotos e integração. Artefatos
  `gates-main.log`, `build-main.log` e `merge-plan.txt` em `artifacts/lajes-performance/`.

## Encerramento V7 — 06/09/2026

- PR438 saiu de draft e foi mergeada por squash, sem bypass, às 05:01:53 UTC.
  Commit na main: `70f524937f428ec242177ffd98892062a9e30049`.
  Head aprovado: `fce94272deb0e1b0591790cd205f1ad32ca5d7b0`, incorporando
  main `971342e4`/alpha.225. Worktree permanece em `codex/lajes-visual`.
- Checks obrigatórios build, dco, versao-bumpada e ratchet verdes; portao-browser,
  smoke-web, CodeQL e Vercel verdes. pr-fast final `34012603547` concluiu com
  sucesso, incluindo LSP1 (8/8 saídas físicas, 1.334 sondas), MAP2B e Astro build.
- Preview final: `dpl_EamoAminoc95PFRsk2NVSiWZdWze`, READY. Browser anônimo
  redireciona ao login da Vercel; não declarar hover remoto validado. Hover local
  9/9 já validado. Deploy automático de produção pós-merge não foi validado aqui.
- Recibos e log CI: `artifacts/lajes-visual/v7/merge-receipt.json`,
  `checks-before-merge.json` e `gates/pr-fast-final.log`. Histórico original segue
  preservado em `codex/lajes-v7-history-backup`; artefatos V6/V7 mantidos.
- Vídeo pedido para redes entregue em `/Users/ruben/Downloads/Santos-Dumont-Lajes.mp4`:
  H.264, 1536×1024, 7,952 s, 2.723.276 bytes. Nenhuma postagem social realizada.
- Objetivo autorizado concluído: ambiência, preview, integração, conflitos, build,
  atualização e merge. Limites de GPU, repetição modular e validação local global
  com JSON antigo permanecem descritos na entrega; não são alegados como resolvidos.

## Marco V7: integração e primeira validação

- Árvore baseada em main `a551204f`, somente Lajes e hooks locais no diff. Registro
  catálogo e créditos portados; módulos modernos áudio/multiplayer/sky preservados.
- Build inicial passou; npm ci sem scripts 409 pacotes/zero vulnerabilidades.
- Contrato14 mapas passou; Lajes612 nós conexos sem dívida. LRU mantém raio1,087m.
- V7: terra com textura existente no acervo da main, paleta sem azul, gramados, quatro
  ratos/quatro baratas, oito pipas (quatro low), 14-bis autorado com piloto.
- RED V7 LAM1–5 preservado; GREEN e quatro mutantes. Santos5/5 med/low e6mutantes.
- Integração Game: spawn yaw antes RED jogador/bots/respawn; agora GREEN. Pulo
  local antes0,586m, agora0,806m (controle0,586m); nearest recebealtura. Navegação
  em camadas opt-in só Lajes evita alcançar nó superior pelo mesmo x/z.
- Preview real capturado960×640,12s WebM, sem erros JS. Primeira captura tinha arma
  no quadro e foi rejeitada; recapturada com vmScene oculta. Publicação ainda pendente.
- Crítico: cenário inicial7/10,14-bis isolado8/10. Junta no piso removida e gramados
  elevados; ainda exigem captura final, fauna em movimento e avaliação céu no jogo.
- Próximo: checkpoint recuperável, browser final/percursos/hover, crítica, suíte main,
  docs, build final, push/retarget PR438 para main e merge condicionado aos checks.

## Marco V7: revisão final e preparação do merge

- Usuário reiterou terminar, atualizar com main, resolver conflitos/build e mergear.
- Checkpoints preservados: `2ef38428` integração, `992d0b91` hooks locais e descarte,
  `5540db4d` índices gerados. Base moderna `a551204f`.
- Revisão independente aprovou cenário e preview; rejeitou sobreposição do 14-bis
  com helicóptero. Fases de voo separadas; régua mede 735 vistas/instantes da órbita,
  zero sobreposições após correção, mutante sobreposto reprova todas. Capturas do voo
  sob marquise e entre fachadas rejeitadas como evidência; usar passagem da laje norte.
- Quinze capturas med, boot low, cinco percursos físicos no Game sem salto obrigatório,
  GLBs/PBR carregados e nenhum erro JS. Hover real nove cenários verdes, Node onze.
- Gates de geometria/navegação e V7 verdes, com mutantes. Build final passou.
  Suíte geral: falha local de audio:check por pacote privado ausente, manifesto e
  gerador iguais à main; não apagar referências para fazer esse inventário passar.
- DCO encontrou 25 commits antigos sem assinatura no histórico herdado. Preservar
  o histórico numa branch local de segurança antes de criar commit limpo sobre main;
  não inventar assinatura para commits de terceiros. Push deve usar lease no SHA
  remoto observado, para não sobrescrever trabalho concorrente.
- Comparação: `artifacts/lajes-visual/v7/comparacao-v6-v7.html`; provas em `v7/gates/`,
  `browser-final/`, `browser-low-final/`, `life-final/` e `preview/`.
- Próximo: concluir invariants/kick, restaurar dados gerados dos testes, checkpoint e
  documentação, limpar histórico com backup, verificar DCO, push/retarget PR438,
  aguardar CI/preview do SHA final e mergear sem bypass se os checks passarem.

## Marco V7: histórico limpo e revisão encerrada

- `4978ff4c` encerrou produção, mídia, réguas e crítica final8/10 sem P1 visual.
- Histórico integral preservado em `codex/lajes-v7-history-backup` nesse commit.
  Entrega limpa `3b4eb6de` sobre main `a551204f` tem somente o diff final de Lajes;
  a reconstrução preservou a árvore, sem assinar commits antigos de terceiros.
- DCO e trailer Agent passaram no intervalo main→HEAD. Autoria gerada recalculada
  após a limpeza, conforme contrato da documentação. Build final, SEO6/6, hover9/9,
  boot low e crítica independente final passaram. Nenhum bloqueante na revisão
  independente do diff de produção/CI. Piloto é detalhe distante na câmera normal.
- Próximo: push com lease para map2/lajes e retarget PR438 para main; acompanhar
  checks do SHA final e mergear se verdes. Invariants/kick locais ainda em execução.

## Marco V7: PR atualizada e bloqueios remotos corrigidos

- PR438 agora base main e head `fa5658f0`, sem conflitos. Push inicial falhou no
  transporte HTTP; repetição com HTTP1.1/buffer maior passou, lease preservado.
- Primeira Vercel falhou por soundscape Lajes ausente no pack privado13mapas.
  Adaptação explícita reutiliza somente a entrada externa de Quebrada existente;
  dez contratos e três mutantes, seis gates de áudio/procedência verdes.
- Invariants local saiu0, mas MAP usou JSON anterior após timeout; não é evidência
  válida dessa família. Map-check Lajes isolado fresco336,95s confirmou MAP2/4 e
  CTF1/2; MAP2B exige pátio incompatível com V6 aceita. Contrato LSP1 mantém
  slots livres, separados e saída térrea física ao campo. Demais mapas conservam
  MAP2B; KNOWN-RED intacto. Docs de áudio/respawn explicam evidências e mutantes.
- Dono aprovou clip do 14-bis e recebeu MP4 em Downloads/Santos-Dumont-Lajes.mp4.
- Próximo: checkpoint destes ajustes, docs/portões, novo push para disparar CI
  com base main, conferir builds/preview do SHA final e merge sem bypass.

## Marco V7: contratos finais antes de nova main

- LSP1 normal/restauração8/8 saídas,1.334sondas; três mutantes reprovam nas
  cláusulas corretas. Consumo MAP2B: baseline fresco vermelho, LSP1 válido verde,
  LSP1 inválido vermelho; troca do mesmo relatório para loja_h mantém vermelho.
- Soundscape: dez casos e três mutantes; fetch real de fixture e seis gates verdes.
- Main avançou para `d0edc586` (PR514 operacional). Próximo checkpoint seguido de
  merge normal dessa main, preservando retry do menu e novos checks/ops. Não usar
  reconstrução de árvore nesta atualização pequena. Depois CI/preview/mergePR438.

## Marco V7: nova main incorporada

- Merge normal de `d0edc586`: conflitos apenas em documentação gerada, resolvidos
  a partir dos textos atuais da main e regeneração. Retry/telemetria do menu e
  novas ferramentas operacionais preservados; hooks de preview continuam locais.
- Revisão independente LSP1/consumidor sem bloqueante. Áudio e respawn integrados
  no check:fast e passo Lajes do CI. Próximo: build/checks pós-merge, push normal,
  revisar preview e checks obrigatórios no SHA final; mergear PR438 sem bypass.

## Marco V7: Vercel verde e sincronização de release

- Head `37c7cb78` passou build Vercel após adaptação do áudio; deployment
  `dpl_8k7qwwJ9ThzkxbYGVuEyqmSdJkpQ`. Nenhum fio de review aberto.
- Main publicou `971342e4`/alpha.225 durante o envio. Merge de release tem
  conflito somente em STATUS.md gerado; resolvido por regeneração. Versões
  package/lock/runtime sincronizadas, sem alterar novamente geometria/preview.
- Próximo: push do merge de release para disparar CI sem conflito; validar todos
  os checks exigidos, smoke do preview final e merge da PR438.

## Marco anterior: V6 entregue localmente

Pedido de06/09/2026 concluído localmente: ruas no chão muito estreitas, somente
campo central amplo. O dono rejeitou as larguras V5; o dono aceitou a V6 na mensagem seguinte. Resumo completo, comandos e limites: `LAJES-V6-ENTREGA.md`.

- Branch `codex/lajes-visual`, base `1621a6d8`. Checkpoints: `5bc91913` produção,
  `227b3017` réguas/browser e `71637e1c` sonda LC6. Sem push/merge/deploy.
- LRU baseline vermelho2.738/4.795; V6 zero/1.148 pontos largos. Raio máximo
  5,510→1,087 m. Cortes físicos/visuais2.264 sem divergência; três mutantes
  derrubam cláusulas corretas. LID lateral1,8425–2,10 m visual; teto apertado2,2.
- Quinze imagens finais med e boot low, céu GLB preservado, zero erros JS.
  Crítica independente final: estreiteza9/10/conjunto8/10; empenas e nova câmera
  confirmadas nos pixels. Repetição modular continua opcional para polimento.
- Cinco percursos reais em `v6/browser-first`,9.094 chamadas `_collide`, sem
  salto obrigatório/mantle.612/612 nós,0/3.728 arestas obstruídas; anti-trap
  3.251/3.251 células. Quatro escadas e objetivos acessíveis.
- Sequência Node22 passes, um mutante esperado e baseline LC6 inválida preservada.
  LC6 agora parte de espaço livre;34 colisores removidos pelo mutante fazem as
  oito aproximações atingir clamp; restauração verde. Os três gerados de mapa
  foram preservados como artefatos e restaurados no Git.
- MAP2B abaixo do alvo genérico (folga1,05/1,2 m e área16,1/40 m²), consequência
  registrada dos spawns estreitos, sem alterar limiares. MAP5 agora0,42/0,35.
  Predomínio de bots no chão permanece sem cláusula comportamental; sem aceite
  de FPS/GPU. Dívidas de áudio/SSR/API herdadas não foram declaradas resolvidas.
- Comparação `artifacts/lajes-visual/v6/comparacao-v5-v6.html`;15 hashes em
  `image-manifest.json`, câmeras registradas. Cinco poses iguais e quatro
  deslocadas explicitamente; não é comparação controlada de desempenho.

Próximo passo: revisão do dono na comparação e no jogo local8147; preservar esta
V6 e suas evidências ao aplicar qualquer novo feedback. Não retomar V5 como aceita
nem reabrir ruas para satisfazer o indicador genérico de área de spawn.

## Objetivo e definição de pronto

Executar o pedido anexado de 06/09/2026: elevar visual e tecnicamente Lajes como
comunidade brasileira habitada, preservando praça, disputa cima×baixo, três rotas,
retorno ao térreo, objetivos acessíveis e leitura competitiva. Pesquisa real antes
de editar; baseline e depois em 1536×1024 nas mesmas câmeras; circulação no Game
real com GLBs; régua vermelha antes do conserto e mutante real; gates do mapa,
contratos, build e checks relevantes; crítica independente e desempenho honesto.
Entrega originalmente local; pedido V7 acima autoriza update e merge condicionado da PR. Commits DCO/Agent.

## Isolamento e baseline

- Worktree criada exclusivamente para esta frente:
  `/Users/ruben/csbrasil/worktrees/lajes-visual`, branch `codex/lajes-visual`.
- Base obtida por `git fetch origin map2/lajes`:
  `bb37c0486442ccd3d1c9177a9ff108b78960177a`.
- `git worktree list --porcelain` conferido antes da criação: `map2/lajes` não
  estava ocupada nesta família. Não foi necessário sufixo alternativo.
- PR #438: aberto, head `map2/lajes`, base `feat/times-e-mapas-completo`;
  GitHub informou `CONFLICTING` / `DIRTY`. Checks históricos não validam esta rodada.
- Registro confirmado: `public/js/maps.js` importa `buildLajes` de
  `public/js/map_lajes_authored.js`. `map_lajes.js` não é o builder ativo.
- Leitura integral dos arquivos exigidos no prompt concluída; ARCH regenerado sem
  diff. Skills gauntlet-fps/regua/csbrasil/asset-review aplicadas ao escopo do mapa.
- Artefatos volumosos locais: `artifacts/lajes-visual/` (não commitar).

## Milestones e decisões

- Inspeção dos documentos `LAJES-PRACA.md` e `LAJES-BOTS.md`: o PR deixa aberto
  BUG-75 (combate distante paralisa circulação) e admite ausência de validação
  visual de oclusão por GLBs. Reproduzir antes de escolher correção.
- Porta proposta 8147 estava livre na inspeção inicial. Não interromper servidores.
- Dependências instaladas com scripts desativados para evitar alterações na
  configuração Git compartilhada. Shell selecionou Node 16 inicialmente; usar
  `/opt/homebrew/bin/node` e PATH correspondente nas execuções seguintes.
- Pesquisa delegada a agente independente, restrita ao documento de referências;
  apenas o agente principal executa navegador.
- Há outros processos Chrome ativos: FPS/GPU sem janela exclusiva não poderá ser
  aprovado. Não interromper processos de terceiros.

## Baseline validado

- Nove capturas reais em `artifacts/lajes-visual/baseline/`, 1536×1024, FOV70,
  qualidade med. `cameras.json` contém poses reproduzíveis; `boot.json` registra
  WebGL2/Metal Apple M4 Pro, 78 respostas GLB200 e nenhum pageerror. Primeira
  tentativa com overlay de pausa foi invalidada e substituída por estas capturas.
- Crítica independente: `LAJES-VISUAL-CRITICA-ANTES.md`, reprovado visualmente4/10.
  Fachadas negativas cegas, escadarias como lâminas altas, ramais elétricos soltos,
  varal cruzando spawn e mobiliário excessivamente cúbico são defeitos observados.
- Nove scripts Lajes executados; sete exit0, circuito/antitrap geometria verde mas
  exit1 por biblioteca sharp de overlay ausente. Dependência local corrigida;
  repetir estes scripts. Logs em `baseline/gates/summary.json`.
- Régua visual antiga media `map_lajes.js`: verde histórico não valida o ativo.
  Nova régua mede MAPS.lajes/Game: setas inclinadas, pneus/troncos sem oclusão e
  16/16 visadas de spawn livres reproduzidos vermelhos antes de editar builder.
- PR apresenta seis conflitos de documentação gerada com a base; nenhum conflito
  no builder detectado pelo merge-tree somente leitura. Nenhum merge realizado.
- Pesquisa e inventário em `LAJES-VISUAL-REFERENCIAS.md`; duas fotografias reais
  inspecionadas pelo integrador, nenhuma mídia externa integrada.

## Pendências e próximo passo

Implementar somente os defeitos demonstrados após régua vermelha; provar mutantes,
repetir gates e capturas, medir no navegador com GLBs, percorrer rotas no corpo
real, executar crítica independente e registrar custo de todos os passes.
Desempenho permanece sem aprovação por falta de exclusividade de GPU.


## Primeiros consertos e contraexemplo em movimento

- Checkpoint de baseline/referências: `f8dada79`.
- Seis cláusulas LVA verdes em Node e navegador GLB: setas planas, pneus/troncos
  com oclusão coincidente, 0/16 visadas livres entre spawns, quatro fachadas com
  relevo na face exposta. Removidos quatro ramais elétricos sem suporte; varal
  sul deslocado para fundo doméstico do spawn. Nove eval:lajes-* exit0.
- A/B inicial em `artifacts/lajes-visual/after/`; repetir após demais alterações.
- Movimento real reprovou as três tentativas seguindo o grafo: nó oeste dentro
  da piscina (-10.3,5.2,3.65), nó do corrimão sul (4.133,5.2,28), nó do acesso da
  descida norte (7.4,5.2,-26). `movement-after/movement.json` registra _updatePlayer,
  trajetórias e milhares de chamadas de _collide; nenhuma teleportação intermediária.
  LB1 ignora pontas sólidas, portanto verde não provava rotas completas.
- Combate continua sem circulação no térreo (0/21 bots nesta rodada). Não aprovado.
- Baseline de custo somando passes: até4142calls/1.929Mtri. Lajes não possui teto
  próprio em cena-tetos; Havan360/1.410M é comparação histórica, não certificação.
- Contratos expõem dívidas herdadas: assets ignorados ausentes e capture-map-evidence
  resolve escadao como map_adao.js. Relatório separado em LAJES-VISUAL-CONTRATOS.md.

Próximo passo: corrigir navegação com régua que não ignore nós sólidos, percorrer
as rotas novamente e melhorar reboco/escadarias contra as fotos, mantendo escopo local.


## Segunda passagem visual/técnica

- Checkpoint dos primeiros consertos: `9c798af9`. Seis mutantes LVA reprovaram
  cláusulas pretendidas; restauração verde. Resumo em `after/gates/summary.json`.
- Réguas LN1/LN2 novas não ignoram pontas: baseline15 nós sólidos/28 arestas ruins.
  Correção em andamento; primeira poda isolou spawns e foi rejeitada pelos gates.
  Passagem piscina↔tanque oeste mede0,75m, menor que corpo0,76m: permitido microajuste
  conjunto de mesh/colisor, nunca apagar colisor de objeto visível.
- Crítica V2 independente em `LAJES-VISUAL-CRITICA-V2.md`: praça reconhecível, mas
  painéis repetidos/acessos e faixas brancas ainda reprovados. Sem aprovação própria.
- Pixels das faixas brancas identificaram torus/disco CTF. LCTF1 vermelho:
  1612/3232 triângulos sobre vãos, anel0,405m de espessura. Adaptador local
  `lajes_ctf_surface.js` recorta superfícies nas lajes e usa pintura plana; verde
  0/702 triângulos sobre vão, mesmo raio real4,5m. Mutante remove adaptador e volta
  ao defeito. Game ganha apenas chamada opcional world.configureCTFPoint; nenhum
  outro mapa a fornece. Revisão independente do hook em andamento.
- Materiais: cache passou a usar o repeat UV que já calculava, evitando clones
  equivalentes. Sonda da cena Node:143→54 materiais com map,130→41 texturas;
  grupos visuais equivalentes continuam46. Nenhum limiar/UV reduzido.
- StaticBatch apenas nas juntas das pontes; convés/corrimãos/colisão preservados.
  Reboco PaintedPlaster017 e concreto Concrete046 CC0 locais separam construção
  do piso térreo. Paleta/remate dos spawns diferenciam as duas pontas.
- Prova de guarda corrigida em `physical-v2/guard-jump-fall.json`: caminhando
  parou em x7,85,y5,2; salto passou a borda; queda terminou no térreo y0.
  Tentativa anterior (`visual-v2/physical.json`) começou sobre vão e está rejeitada
  para guarda/queda. Mantle na escada nessa tentativa foi válido, sete amostras
  durante mantle.12/12 pickups possuem amostras livres a0,8m (alcance real1,9/2,6m).

Próximo passo: terminar e validar navegação real, repetir A/B final com CTF corrigido,
crítica independente, custo completo e build; não marcar pronto enquanto faltarem.

## Terceira passagem e congelamento técnico

- Hook CTF revisado independentemente: UVs/normais/reuso/descarte e quatro contratos
  CTF verdes, controles de outros mapas preservados. Checkpoint `efaeef08`.
- Navegação: tanque oeste x−12,05→−12,25 e piscina z3,9→3,7, mesh e colisor juntos.
  Corrimãos aparados somente em junções apoiadas. LN1 0/682 nós ocupados; LN2
  0/1512 arestas bloqueadas; 11 gates Lajes e map-check verdes. Mutante piscina
  e seis mutantes LVA vermelhos, restaurações verdes. LV1 máximo1,49×/limite1,50×.
- V3: nove capturas reais em `artifacts/lajes-visual/visual-v3/`, mesmas câmeras.
  Crítica independente `LAJES-VISUAL-CRITICA-V3.md`: materiais, degraus e CTF
  melhoraram; conjunto ainda REPROVADO por repetição, acessos e laje vazia.
- Primeiro planejamento browser final falhou antes de mover: praça→pé da DESCIDA
  SUL não conectado por nós baixos. As duas rotas superiores existem. Agente
  verifica rota térrea por ACESSO SUL; não declarar três percursos ainda.
- Build final e syntax passaram. Docs geradas em sincronização. SSR oficial ainda
  aponta caminho antigo do adaptador; probe do artefato real em andamento.
- Custo refeito pelo mesmo `cost.mjs` em `runtime-after/`. V3 usa CTF explícito e
  NÃO serve de comparação direta com runtime-baseline sem esse parâmetro. Contagem
  de chamadas caiu, mas população/animação não congeladas impedem atribuir todo
  delta à mudança; FPS/GPU continuam sem aprovação. BUG-75 continua aberto.

Próximo passo: concluir movimento real e relatório final, guardar commits locais
pequenos; manter reprovação visual e limitações de contratos/performance explícitas.

## Entrega local encerrada — evidência final

- Produção no checkpoint `d041b2ba`; navegador reproduzível em `91f2916c`.
  Três percursos reais completos, sem teleportes intermediários ou Space: oeste
  79,33m, leste78,81m, térreo128,23m. Térreo desceu a0 e voltou a5,2, com mantle
  automático em oito amostras. Saída em `movement-final-driver/`, exit0.
- DESCIDA SUL: sonda de corpo real encontrou fuga de40,60m pelo quintal externo,
  excluído intencionalmente do grafo. Não havia aresta curta livre a acrescentar.
  Não alterada a arquitetura para esconder esta limitação; rota validada usa
  ACESSO SUL. Arquivo `after/gates/descida-sul-local-route.json`.
- Build/syntax/docs/ARCH/skills finais verdes. SSR oficial continua vermelho por
  caminho legado; probe do handler real passou três rotas200 e rejeitou mutante
  corpo-vazio. Assets/evidence oficiais seguem vermelhos pelas causas documentadas.
- Contratos/críticas em `767dfc0b`; índices gerados em `138d3b40`. Todos DCO/Agent.
- Diagnóstico, nove pares antes/depois, custo, resultados e lista de arquivos em
  `LAJES-VISUAL-ENTREGA.md`. Artefatos em `artifacts/lajes-visual/`, fora do Git.
- Estado: melhoria técnica validada no escopo listado; NÃO aprovado para integração.
  Reprovação visual independente, BUG-75, circuito descida sul, assets/contratos
  herdados, contraste/skyline completo e janela exclusiva de performance pendentes.
  Servidor local8147 permanece disponível; nenhum servidor alheio foi encerrado.

Próxima ação de revisão: abrir entrega e comparar as nove vistas; resolver composição
e acessos mantendo estes percursos e réguas. Não repetir investigação já registrada,
não alterar branch original, não fazer publicação a partir desta entrega.

## V4 — revisão solicitada após teste local

Ruben rejeitou o mapa na jogada local: ambiência insuficiente, caminhos complicados,
respawn deve ser EMBAIXO e escala dos barracos ruim. Retomada sobre b3afbcb1, árvore
limpa e branch codex/lajes-visual confirmadas. Mesmo isolamento e sem publicação.
Nova direção em LAJES-V4-DIRECAO.md. Spawn alto deixa de ser requisito; testes que
o exigem serão substituídos explicitamente. Próxima ação: régua vermelha do novo
contrato, medição do kit e construção de layout simplificado antes da crítica.

### 2026-09-06 — V4 após rejeição visual do usuário

Objetivo integral em LAJES-V4-DIRECAO.md. Builder ativo refeito: quatro conjuntos de casas, três caminhos no térreo, quatro escadas retas; oito respawns no chão. Casas6m de frente e3,1m altura; portas2,05m. Baseline anterior reprovou as quatro cláusulas do layout; primeiro V4 passou (artefatos `v4/layout-first.json`). Crítica independente `LAJES-V4-CRITICA.md` reprovou primeira imagem; correções posteriores já aplicadas, sem aceite visual ainda. Réguas visuais atualizadas explicitamente:12portas,4pisos,4setas,16visadas verdes (`v4/visual-second.json`). Áudio ambiente9arquivos restaurado somente neste worktree, com hash/proveniência em `v4/audio-restoration.json`; sem declaração de aprovação auditiva. Próximo: circulação real e imagens finais, crítica e gates V4/globais; revisar documentação gerada e checkpoint do builder. PR sem push/merge/deploy.

### V4 — circulação e crítica concluídas

Checkpoints MAIN: `2ce1509b` casas/direção/escala; `06cf9ecb` substituição do builder (exceção documentada de tamanho pela remoção de1.651linhas); `a13247be` browser/régua visual/package. Cinco percursos físicos passaram na planta final,9.218chamadas de colisão e nenhum mantle; três ruas sóy=0, dois circuitos superioresy=0–3,1. Nove imagens1536×1024,79GLBs200,0errosJS no boot. Registros em `artifacts/lajes-visual/v4/browser-approved/` e `runtime-summary.json`.

Terceira crítica independente `LAJES-V4-CRITICA-3.md`: aprovou as correções de spawn/caminho/escala/ambiência, mantendo acabamento modular como limitação. Primeira e segunda reprovações preservadas. Sem aceite estético do usuário. Nove sons HTTP200,2.340.394bytes, hash/bytes coincidentes com arquivos locais; sem aprovação auditiva. Final global encontrou gato dentro do quarto recém-criado: movido de z12–16 para16–18 emx−10; AR1–6 voltaram a verde. Essa correção só da trajetória do gato é posterior às nove fotos.

Build final passou, assim como syntax, mapcontrato, ARCH e skills. Falhas herdadas do pack geral/SSR e404 de APIs do servidor estático permanecem explícitas em `LAJES-V4-ENTREGA.md`. Nenhuma aprovação de FPS em GPU compartilhada. Próximo: concluir checkpoints das réguas/nav, regenerar docs, verificar árvore limpa e entregar URL local.

### V4 — réguas fechadas

`1f808abd`: navegação + layout + plano de migração; `3824d692`: dez checks migrados. Todos os gates locais executados passaram,24mutantes causais da frente de navegação/layout +4visuais reprovaram corretamente, com restauração verde. Navegação685nós conectados,0ocupados/3.581arestas bloqueadas; anti-trap7.987/7.987. MAP3 piso0,300/espelho0,1722/Blondel0,644/desvio0. Gerados de mapa/overlays preservados em `v4/gates/generated-final/` e restaurados. MAP5 densidade0,29 abaixo do indicador0,35 e comportamento de bots96,3% no térreo permanecem ressalvas, não aprovações. Falta apenas checkpoint de entrega e índices gerados, mantendo branchisolada.

### V4 — entrega local concluída

`01f0ca25` atualizou13arquivos gerados. `npm run docs:check` passou (26blocos/33marcadores); autoria pós-merge segue fora desse check por definição. Build de entrega repetido após o ajuste do gato passou (`v4/final-global/build-delivery.log`). Relatório `LAJES-V4-ENTREGA.md` contém os40arquivos desta rodada, dados e comandos; críticas1/2/3preservadas. Servidor8147 entrega a versão atual. Próxima ação: revisão humana jogando com spawn térreo; avaliar acabamento modular e concentração do combate no chão. Nenhuma publicação autorizada/realizada. Pacote geral de áudio/decalques, ferramenta SSR legada e orçamento exclusivo de GPU permanecem pendências explícitas, sem impedir o teste local do mapa.

### V5 — retomada após rejeição explícita da V4

Base688765c0 limpa, branchisolada confirmada. Usuário rejeitou simplificação, becos largos, aspecto lowpoly e perda de horizonte; pediu pesquisa visual de favelas RJ/SP e reprodução. Fotos de Paraisópolis e Providência inspecionadas, direção em LAJES-V5-DIRECAO.md. Régua nova mediu largura5,96m (120/120cortes vermelhos),1.219amostras de percurso livres; duas pipas existem mas heli ausente. Helpers e pesquisa em LAJES-V5-CEU.md/REGUA.md. Próximo: densidade construída, materiais PBR e céu integrado; depois imagens/movimento/crítica. Nenhum aceite visual V5, nenhuma publicação.

### V5 — terceiro conjunto visual e movimento real

Pesquisa comparativa gerou correções em sequência: novas fachadas exteriores estreitaram os becos; crítica1 reprovou ainda padronização/torres de pedra; terceiro conjunto substituiu primeiro plano do horizonte por casas contíguas autoradas com aberturas, tijolo/reboco, alturas/recuos variados. Kit licenciado fica somente distante. Texturas locais ganharam normal/roughness reais; folhas curvas substituem volumes facetados; rede elétrica recebe ramais. Escala da vela da pipa foi separada da rabiola e a orientação passa a seguir a âncora física; helicóptero GLB real com rotores e órbita. Dois quartos adicionais variam a linha das lajes.

Evidência atual: `artifacts/lajes-visual/v5/browser-third/`, nove câmeras1536×1024 e duas vistas complementares de horizonte em pisos reais. Browser:74GLBs200, zeroerrosJS,59ocorrênciasmateriais com normalmap carregado; portas24/setas4/pisos4/16visadas verdes. Cinco percursos por `_updatePlayer` passaram,9.118chamadas `_collide`, sem mantle. Céu: helicóptero real4.933triângulos, doisrotores, movimento e pausa comprovados; duas pipasGLB. Nove passes completos692–1.038calls/1.053.218–1.228.796triângulos; não é aprovação de FPS/GPU. Primeira crítica preservada; segunda com contexto limpo em andamento. Gates finais em andamento. Próximo: relatório, revisão independente, índices gerados e checkpoints locais; sem integração/publicação.

### V5 — correções após crítica2

Checkpoint97861946 registra arquitetura/identidade/céu. Crítica2 reconheceu recuperação de identidade, beco e objetos de céu, mantendo variedade e continuidade urbana parciais. Detectou estrias de piso: LRO1 reproduziu duas faces coplanares em16/16amostras; tampas das casas agora terminam0,16m abaixo do piso real, sem alterar collider/altura de apoio. LRO16/16verde; mutante duplicar-piso reprova4/16 e restauraçãoverde. Pirâmide clara atribuída inicialmente ao morro era domo390m cruzando far400m: raio415,32m no pixel apontado; domo330m com limite367,51m resolve clipping. Fotos `browser-final/` atualizadas, 5percursos físicos novamente verdes antes do ajuste exclusivo do domo; mesmos9.118collidecalls/nenhummantle. Lajes background foi separado em lotes espaciais24m para impedir que um único bounding-volume torne todo raycast central candidato a todas as fachadas distantes. Comparação CPU dos bots e gates em execução; não FPS. Próximo: concluir documentação/artefatos e checkpoint de entrega, mantendo repetição arquitetônica como limitação aberta.

### V5 — fechamento técnico

Lotes espaciais + caixas AABB preservaram interseções e o bot-check passou novamente:272,930 s no baseline e45,701 s após as mudanças, mesmos argumentos/seeds. O baseline coexistiu com browser, portanto não atribuir todo fator5,97 à otimização. Ensaio alternado de192raios isolou a etapa AABB: mesmas interseções,347,3 ms versus463,4 ms medianos. Build e globais enumerados em LAJES-V5-ENTREGA.md verdes; low também carregou GLBs/PBR/céu sem erros JS. Comparação visual independente em `artifacts/lajes-visual/v5/comparacao-v4-v5.html`. Crítica2/adendo confirmou remoção de estrias e falso triângulo do céu; variedade construtiva/continuidade urbana permanecem parciais. Próximo: conferir commits/árvore e entregar link local para revisão humana, sem publicação.

### V5 — entrega local concluída

`df6341b2` registra correções de piso/céu e custo; `744e1f22` registra as réguas, integração no check:fast e provas. Fechamento30execuções verdes/8mutantesvermelhosesperados semfalha inesperada, maismutanteLRO1manual. Geradosmapa/overlays preservados comhash e restaurados. Docs/ARCHregenerados e docs:check finalverde após a última linha deprodução. Arquivos exatos e restrições em LAJES-V5-ENTREGA.md (26arquivos nesta rodada);11imagenscomhash ecomparaçãoHTMLforaGit. Estado: versão local disponível, sem aceiteestético do dono; repetiçãoarquitetônica/continuidadeurbana e janelaexclusivaFPS pendentes. PR438OPEN/CONFLICTING consultado, sempush/merge/deploy. Próximaação: revisãohumana jogando e comparandoV4/V5, preservando os percursos e réguas.
