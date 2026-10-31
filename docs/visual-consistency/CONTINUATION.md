# Consistência visual e release, 31/10/2026

## Missão completa e pronto

Ruben autorizou uma janela de dez horas em worktree novo para acompanhar os
merges e o release, reaproveitar PRs abertos e investigar/corrigir inconsistências
de mapas, interface, personagens, skins e animação 1P/3P. Operação Flávio está
excluída desta missão. A melhoria posterior dos fluxos UI e páginas sociais só
começa depois da estabilidade visual. Não reduzir a missão à triagem ou a um mapa.

Direção: PDF `COROSOLTO - Planos e Ideias.pdf`, ROADMAP existente, plano de
30/10, referências públicas e vídeos locais de Complexo Favela. Consistência,
leitura em combate e acabamento humano, respeitando mobile e identidade cultural.

Requisitos explícitos: grafites sem repetição; Ferro Velho só na casa de respawn
B; Piscina só em parede branca, incluindo posters; melhor acabamento das favelas;
personagens fiéis, superfície menos facetada, poses e movimentos realistas;
arma reage ao andar; ADS/tiro da AK alinhados; skins legíveis no jogo e mapas.

Pronto por correção: defeito reproduzido, régua antes/depois e mutante quando
aplicável, captura real comparável em 3:2 e móvel, revisão independente e
regressões relevantes verdes. Pronto na integração: head atual revisado, dívida
acionável resolvida, CI verde e merge rastreável. Release exige SHA implantado,
health e caminho real do jogador verificados. Evidência parcial fica declarada.

## Checkout e ownership

- Lane: `worktrees/consistencia-visual-release-20261031`.
- Branch: `codex/consistencia-visual-release-20261031`.
- Base inicial: `364be45bb0e380dc67db6171282db8fb8ff12066` (main).
- Ego: TaskSpace 32, `Codex consistencia visual e release 20261031`, p1 referência,
  p2 jogo local. Servidor próprio em `http://127.0.0.1:4367`.
- Run Estragacodigo: `worktrees/estragacodigo-review-gate-20261031`, leitura.
- Run Javaporcos: `worktrees/modo-javalis-20261028`, leitura; PR #1160.
- Personagens: #1179, head observado `fd553b310bbe92743db6db0b19d07c615f9d9d82`,
  incorpora #1171 e #1155. Ruben apontou explicitamente para este PR e autorizou
  empilhar novos PRs com microcommits.
- Não escrever em lanes alheias nem disputar arma/mão/ADS/HUD entre agentes.
- GLM usa `zai/glm-5.3` pelo OMP; nada de fallback silencioso pago.

## Fontes recuperadas e marcos validados

- Agregador não é repo Git; nova lane criada limpa por `git worktree add`.
- Regras: AGENTS.md, docs/LICOES.md, skills regua/bug-hunt/gauntlet-fps,
  BAR-CONSISTENCIA.md e ref-measure.py. Skills Ego/PDF/PR-hardening aplicadas.
- PDF localizado em `/Volumes/Zenith/Archives/downloads/Downloads/` (três páginas,
  texto extraído e três páginas renderizadas e vistas nesta missão).
- Plano anterior: `progress/docs/DIRECAO-PROCESSO-CONTINUATION-20261030.md` e
  `corosolto-roadmap/reports/2026-10-30-revisao/CONTINUATION.md`.
- Fila remota coletada; #1179 lido. Estado é snapshot, reconsultar antes de merge.
- Javaporcos tem release autorizada após gates, integração local em curso e CI
  MAPAUD sob diagnóstico; não iniciar segundo integrador nessa lane.
- Referência pública encontrada no Ego: Google Play
  `https://play.google.com/store/apps/details?id=com.BrunoSanta.OComplexo` e
  gameplay `https://www.youtube.com/watch?v=bx8DlVC0uFY`.
- Métrica operacional em `METRICA.md`, checkpoint `8689725f1`.
- #1179 integrado apenas nesta lane por merge `ad696fb87`, sem conflitos. Ainda
  sem aprovação técnica/visual nova nem merge remoto desta missão.
- Setup: Node 26 em `/opt/homebrew/bin/node`, node_modules compartilhado somente
  como dependência, viewmodels privados por symlink; `assets-check` verde. Áudio
  público v8 com fallback padrão de ambientes, não é aceite dos takes privados.
- Baseline antes de #1179: Piscina 475 peças assadas/47 artes, Ferro 206/37 no
  layout. Repetição confirmada no fonte gerado; cena e fontes manuais ainda exigem
  inventário cruzado. GLM reconheceu mapas somente leitura; sugestões de zona
  larga/raio de 9 m não satisfazem a regra atual de casa B/zero repetição.
- Artefatos e logs fora do Git em `../../audits/2026-10-31-visual-consistency/`:
  scouts GLM, PDF, referência local, setup e primeira captura Piscina. Captura
  inicial inclui overlay de debug e tamanho não 3:2; não conta como aceite.
- #1179 no jogo real: Piscina aplica 451 peças/46 malhas, captura 1320×880 vista,
  ainda com repetição visual forte. Overlay Vite local registrado e ocultado na
  captura; não é evidência de produção. Régua cruzada de curadoria em construção.
- Lease GLM de motion: somente `public/js/authoredvm.js`, contexto de movimento no
  `_updatePlayer` de `public/js/game.js` e `tools/eval/authored-locomotion-check.mjs`.
  Não mudar ADS, tiro, HUD, assets ou package.json. Root mantém mapas/grafite;
  um único navegador em TaskSpace 32. GLM devolve RED/GREEN/mutantes, sem commit.
- #1173 reaproveitado: cherry-pick do hardening `c097933d7` em `a63182820`, preserva
  autoria e cancela bake com entrada faltante. Revisão/execução desta integração
  ainda pendente. Não incorporamos o mapa antigo inteiro por cima do #1179.
- Régua real de curadoria RED: Piscina 465 peças/49 artes, 45 artes repetidas,
  165 fora do branco previsto; Ferro 207/38, 30 repetidas, 172 fora da casa.
  JSONs `*-1179-curation-red.json` nos audits. Primeira correção local Ferro
  mediu 21 peças/21 artes, zero fora e zero sem suporte, ainda sem novo bake.
- #1179 CI falha na economia: EJ22 ainda espera 30 s, runtime oferece 50 s;
  EJ12 também vermelho, investigar no log. Não está pronto para merge remoto.
- Protocolo vigente recuperado em `operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md`:
  CodeRabbit não está habilitado; Ruben autorizou GLM via OMP + crítico independente.
  O pedido anterior ao CodeRabbit foi redundante, não repetir. Estraga-codigo é o
  revisor real em restauração. Dispensa não significa revisão recebida ou limpa.
- Lease GLM de testes grafite: `tools/eval/graffiti-curation-check.mjs` (novo),
  fixtures afetadas de `graffiti-support-check.mjs` e
  `piscina-graffiti-batch-check.mjs`; sem produto, package, browser ou commit.
- Gerador ganhou backend Ego que reutiliza apenas Space 32/p2. Régua original
  de fidelidade passou: Loja H 43 peças idênticas byte a byte em duas rodadas;
  bloquear statue_liberty.glb cancela. Mutante real removendo a trava reprovou G2
  (43 peças com entrada faltante), arquivo temporário restaurado pelo arnês.
- Diagnósticos vivos: Ferro 24 peças/24 arquivos únicos, Piscina 42/42, antes de
  gravar novo layout. Bake completo em curso no Ego, log `ego-bake-all.log`.
  Não alterar produtor/mapas durante esse bake. Fotos finais ainda pendentes.
- Auditoria SHA-256 dos arquivos de decals/posters: nenhum arquivo binário
  duplicado com outro nome. Não equivale a inspeção semântica de todas as artes.
- Novas leases GLM: economia somente `economia-jogo-check.mjs` e
  `ECONOMIA-PARTIDA.md`; atualizar EJ12/EJ22 à decisão de 50 s/recompra no respawn
  documentada no #1179, sem editar runtime. Censo personagens/skins é somente
  leitura de fontes/assets, resultados fora Git nos audits GLM-PERSONAGENS-*.
- Snapshot 09:05 UTC: main permanece `364be45bb`; #1180 avançou a `20cdff5c7`,
  bloqueado por CHANGES_REQUESTED/checks em fila. Não mergear por status antigo.
  Nesta branch são ancestrais os heads #1179/#1171/#1165/#1162/#1161/#1156/#1155/
  #1152/#1150; isso não comprova revisão/aceite dessas mudanças.
- 09:21 UTC: bake real dos 14 mapas concluído pelo Ego (445 peças), inclusive
  checkpoints de entradas e erro por asset ausente. `graffiti-layout-check`
  fresco; não é aceite visual. Baseline imutável `ad696fb87` servido em 4368,
  worktree `consistencia-visual-baseline-1179-20261031`; lane atual em 4367.
- Capturas comparáveis 1320×880: Ferro passou de 207 peças/38 artes, 30 artes
  repetidas e 172 peças fora da casa B para 24/24, zero repetição/fora/sem suporte.
  Piscina passou de 465/49, 45 artes repetidas para 52/52, zero fora do branco e
  sem suporte. Refinamento da régua usa a textura branca real e cobertura inteira:
  baseline são 100 fora do branco; 165 era proxy geométrico impreciso, descartado.
  O batch de props perdia exclusão e foi corrigido, não apenas o batch de paredes.
- Inventário independente cruza todas as texturas de arte, inclusive malhas sem
  nomes decal/mural/poster: encontrou Campo do Morro com a mesma colagem em 16
  superfícies que a régua anterior não enxergava. RED salvo em
  `campomorro-full-inventory-red.json`. Correção local mantém um mural no galpão,
  remove cópias decorativas sem colisão e conserva a geometria das paredes; bake
  do Campo concluído, nova captura/cobertura e verificação de física pendentes.
- Crítico visual independente examinou 14 capturas: nenhuma aprovação integral.
  Piscina está coerente no recorte; Ferro precisa escala/acabamento de tijolos;
  Campo precisa solo/reboco; Escadão tem padrão diagonal suspeito nos parapeitos;
  Lajes repete coroamentos e tijolo em topo; Córrego repete desgaste/torres;
  Quebrada repete pneus. Quatro câmeras inválidas serão recapturadas; não inferir
  defeito de navegação a partir de foto dentro de parede. M4 permanece UNKNOWN.
- Primeiro builder de motion terminou; refinamento GLM exclusivo dos mesmos
  arquivos acrescenta prova com sway real e tolerâncias derivadas da dinâmica.
  Sem aceite ADS/contato/tiro por browser ainda. Economia e censo seguem ativos.
  Builder de testes grafite atingiu deadline com diff parcial: retomar e validar,
  nunca tratar saída parcial como sucesso.


- 09:35 UTC: inventário cruzado no Ego concluído nos 14 mapas. Todas as artes
  conhecidas estão classificadas, sem duplicação por mapa e sem suporte inválido;
  Ferro 24/24, Piscina 52/52, Campo 5/5. Logs `all-map-curation-ego.log` e
  `curation-full-inventory-ego.log`; não equivalem a aceite visual integral.
- Campo após mural único: comparação física normalizada preservou 99 colliders,
  125 occluders e 11 contratos (spawns, pickups, CTF, rotas, terreno e bounds).
  `campomorro-physical-normalized.json` é a prova válida; comparação anterior
  divergia por UUID de material dos pickups e foi rejeitada como comparação final.
- Economia: GLM alinhou somente documentação/régua ao contrato do #1179, sem
  mudar produto. 23/23 casos, 20/20 mutantes e economia pura 14/14 passaram.
  Revisão GLM independente e crítico independente dos dois arquivos em curso.
- Motion 1P: régua com sway real e cinco mutantes passou, mas crítico encontrou
  dois P2: contribuição de gait fica presa ao entrar em throw segurando utilitário;
  fixture de transição não inicia gait e deixa NaN passar. Não aceito ainda.
  Correções ficam na fila até o único writer de AK devolver sua lease.
- AK no jogo real baseline: traçante coincide com muzzle, mas alça/massa ficam em
  y=591/485 para cruz y=440 em 1320x880. Experimento apenas em memória com
  `ads.linha=true` centralizou ambas sem mudar hip/tiro físico. Builder GLM
  exclusivo vmconfig AK + ads1p-linha-check + AK-ADS.md deve provar geometria real
  e mutante, sem relaxar limites. Fotos pretas descartadas; captura contínua válida
  `ak-linha-experiment-continuous.png`. Correção de produto ainda em curso.
- Leases adicionais: acabamento GLM somente map_campomorro/map_ferrovelho e doc,
  mantendo curadoria/física; testes grafite retomados em três arquivos de testes.
  Antes de novo bake aguardar devolução dos dois mapas e validar UV/assíncrono.
- Censo somente leitura: 63 personagens registrados/arquivos, 26 skins e 56 luvas;
  faltas de normal/rough em quatro personagens e caminhos de luva sem flags/FX
  são pistas, não defeitos visuais comprovados. Resultados nos audits GLM-PERSONAGENS-*.
- Main avançou a 602c0fe35 (#1169). #1179 remoto agora DIRTY; integrar main após
  checkpoint dos componentes e revisão, sem disputar owners #1180/#1160.
  #1160 ainda falha em relatório MAPAUD fresco; owner possui correções locais.
  Gate select-inflate do #1179 acusa drift de referência: investigar causa,
  sem elevar teto congelado ou dívida apenas para obter verde.


- 09:43 UTC: revisão adversarial REABRIU a régua de curadoria: cenas mutantes reais
  no Ego (clone baked, translação geometry 1000m, poster sem prefixo) ficaram
  falsamente GREEN. `curation-drawn-mutations.json` confirma a brecha; os números
  anteriores não são mais gate final. Lease GLM exclusiva measure + inventory +
  novo graffiti-drawn-check/doc para geometria efetivamente desenhada e
  reconciliação de metadados; repetição/allowlist do produto não foi relaxada.
- Revisores GLM e crítico independentes não acharam P1/P2 no microdiff economia;
  conferência contou 23 mutantes reais, não 20 do relatório anterior. GLM recebe
  followup para nitpicks e compra real após respawn (EJ23), seguida de gate inteiro.
- Censo luvas: achado de sombras/FX foi REFUTADO. attachGloves vem antes do passe
  de materiais em buildCharacterModel; runtime com esquerdomacho equipado confirmou
  castShadow=true, receiveShadow=true e shaderHook do corpo. Não corrigir algo já
  correto. Fotos iniciais de personagens com overlay GO/recorte preto rejeitadas;
  versões `character-surface-*-pool-clear.png` são 3:2 válidas na luz/cena real da
  Piscina, atores comparativos injetados com loader/controlador reais. Não são
  partida natural nem aceite integral; Lampião/controle mostram facetas no corpo.
- Nova investigação GLM readonly de normais/topologia dos personagens/skins e
  outra do drift select-inflate; nenhuma mudança de asset autorizada por hipótese.
  Ablacões de albedo/normal/vertexColor do Escadão em curso somente em memória.

## Aceites, rejeições e limites

### Conferência de 10:07 UTC

- GLM-MOTION-P2 devolveu a lease: locomotion 16/16 + seis mutantes;
  transition 28/28 + nove mutantes. Root ainda deve conferir os logs/patch final,
  revisão GLM independente e crítico, além do movimento real em 3:2.
- A régua desenhada de grafite acusava UNKNOWN para paredes texturizadas comuns.
  Fixture nova reproduziu exatamente `unknown:[parede]`; correção restringe a
  decomposição em quads aos overlays nomeados e mantém inventário independente
  para arte sem prefixo. Node 19 cláusulas voltou GREEN; mutantes reais no Ego
  ainda pendentes. Evidências anteriores ficam preservadas, sem sobrescrever.
- Próxima lease sequencial de arma: GLM-AK-FECHAR, apenas config AK, régua ADS e
  AK-ADS.md; restaurar retorno da medição e provar ponto frontal pela geometria,
  mantendo o teto de quatro pixels. Nenhuma mudança em tiro, asset ou hip.
- Mutantes reais `curation-drawn-mutations-AFTER2.json`: cena limpa Piscina
  52/52, clone sobe a 53/52 e reprova repetição, translação reprova suporte e
  branco, poster sem prefixo reprova inventário. Esses são os resultados aceitos.
- Nova varredura achou posters manuais omitidos: Brasília tem três cópias do leão
  e quatro posters a 30 cm da fachada; Posto repete outdoor com a passada e fica
  no limite geométrico de suporte. Provas após nomear só em memória estão em
  `*-manual-poster-probe.json`. Nova lease GLM-POSTERS-MANUAIS: só os dois mapas,
  régua focada nova e doc; Root conserva inventário/medidor/gerador/layout.
- Quebrada NÃO tem quatro faixas repetidas: são duas faces opostas coplanares de
  cada uma das duas faixas aprovadas em 06/08, com texto legível dos dois lados.
  Medidor deve reconhecer o objeto físico sem ignorar clones em outro lugar.
  Não remover faixas nem mudar a solução de leitura já aprovada.
- A/B Ego select-inflate isolou limite de alcance duplicado: Mandrake head
  p99 .551/22.9 ruins, sem apenas clamp geral .540/18.9 (referência exata).
  Sem yaw .547/22.9; Pagodeiro .414/9.5 nas quatro variantes. Config de teto e
  dívida não mudaram. Correção 3P fica SEQUENCIAL, depois de devolver lease AK;
  preservar proteção de recarga/Juiz, comprovar porte e contato reais.
- GLM acabamento atingiu deadline novamente; escreveu binding-clones e nova
  régua, não entregou doc. Root assume fechamento e verifica antes do bake.
- Root fechou UV/solo com tolerância numérica Float32 e contagem inteira mais
  próxima da densidade, eliminando tetos de custo arbitrários. Gate GREEN;
  cinco mutantes saem 1 pelas respectivas cláusulas. Binding + mutantes GREEN.
  Comparação física final mantém spawns/colliders/occluders/pickups dos dois mapas
  em relação ao PRE e POST2 (`root-map-finish-physical-final.log`). Contagem de
  navNodes/pickups do snapshot antigo usa campos ausentes: não serve como prova
  de navegação; preservar essa limitação. Fotos reais A/B em execução.
- GLM motion revisão completa não achou P1/P2, mas deixou cinco P3 acionáveis
  (comentários, citação, alocação, fixture, cobertura declarada). Fila sequencial
  após AK: corrigir os válidos, repetir gates e obter crítico no ponto final.
- Crítico da curadoria achou nova lacuna concreta: reconstrução canônica perde
  winding original de um triângulo e pode contar um quad parcialmente culled.
  GLM-CURADORIA-FACES assume measure/inventory/drawn-check/doc GRAFITE-REGUA para
  provar mutante causal e tratar as duas faces das faixas sem isenção por nome.

### Conferência de 09:54 UTC

- Escadão: as faixas diagonais vistas no mapview NÃO se reproduzem no renderer
  real do jogo. `escadao-real-game-original.png` usa PCFSoft + normalBias .03
  normal do jogo; mapview usava PCF e normalBias 0. Não mudar sombras de produto
  para corrigir artefato do arnês. Mapview fica para bake/geometria; acabamento
  final exige o jogo real com pós. As quatro câmeras inválidas ainda precisam
  ser recapturadas.
- GLM AK e acabamento encerraram por deadline, sem entrega completa. Conferência
  independente reprovou ambos: `massaNaImagem` da régua ADS ficou sem return e
  `external` do Campo quebrou o gate existente de binding. Nenhum GREEN aceito.
  Lease de acabamento devolvida e redistribuída a GLM-ACABAMENTO-FECHAR (2 mapas,
  binding-check, régua focada e doc); lease sequencial de arma agora GLM-MOTION-P2
  (authoredvm/locomotion/transition/doc), sem tocar config AK até devolução.
- Economia: followup fortaleceu recompra pós-respawn, mas fixture nova de remoto
  mudou arma lógica sem remontar malha. Root reproduziu EJ12 RED e alinhou a
  pré-condição pela função real `_armarBot` antes de marcar remoto. Gate inteiro
  `root-economia-fixture-corrigida.log` em curso; resultados anteriores não valem
  como aceitação desta revisão. Não houve mudança de produto de economia.
- Normais: diagnóstico GLM readonly e A/B real Root identificam normais gravadas
  por face em Zumbi/Caipora/Lampião/Esquerdomacho. Experimento in-memory 60 graus,
  agrupando posição e influências de skin canônicas, suavizou corpo nas imagens
  `character-normals-*-original-vs-smooth60.png`; getters provaram preservação de
  posição/UV/skin/índices (inclusive atributos interleaved). Primeira tentativa
  com leitura crua de interleaved foi descartada e corrigida antes desta prova.
  Nenhum GLB/produto mudou; crítico visual independente pendente. Saci tem causa
  diferente (normais já suaves), não aplicar automaticamente a mesma solução.
- Skins: quatro comparações reais em Piscina, arquivos por ID da skin em
  `character-skins-*-pool.png`; diferenças de escala/contato são pistas para
  investigar no rig/pose, não bug automaticamente confirmado.
- Dependências isoladas preparadas por npm ci foraGit em `isolated-deps` do audit.
  Ainda NÃO substituídas durante writers/testes ativos; own node_modules segue
  symlink inicial. Lockfiles diferem do root, então isolamento é pendência para
  gates finais. Three é shim vendorizado criado pelo harness, não dependência npm.
- Fila remota: main `bee715af8` inclui #1140 por outro integrador. #1180 avançou
  a `249ffac6c`, classify falha; #1160 segue `ff0a52097` com MAPAUD/aggregator RED.
  #1167 `d4e0ccfda` CLEAN, revisão GLM integral ativa antes do crítico e possível
  integração. Respeitar owners e reconsultar head/CI antes de merge.

- 09:58 UTC: revisão GLM integral #1167 achou um P2 (SKIP sobrescreve falha já
  medida), dois itens menores (prioridade no mutante SB7, timeout/sinal) e cleanup
  de temporários antes do exit. Não integrar só pelo CI verde. Nova lane isolada
  `consistencia-review-1167-20261031` corrige/revalida esses itens antes do crítico
  integral no ponto final. Não tocar na branch original do autor.
- Crítico independente dos quatro personagens liberou a candidata de normais
  para validação de movimento, incluindo rostos aceitáveis e corpo mais contínuo.
  Comparação rigorosa usa SkeletonUtils com MESMA pose, capturas front/back/face
  individuais e `character-normals-*-identical-contact-sheet.jpg`; não usar os
  pair.png posteriores à primeira câmera (reset ausente). Ferramenta offline GLM
  em curso, sem escrever GLBs; versão final deve preservar singleton/arestas e
  repetir imagens/movimento antes de aplicação. Corpo estático não é aceite final.

Correções de produto locais acima ainda sem commit ou aprovação integral. Head do #1179 contém
afirmações de melhorias e limitações contraditórias no corpo: tratar como pistas,
nunca como aceite. Não usar status histórico alpha.7 como versão atual.
Não há permissão inferida para interromper processos, remover locks, comprar
recursos ou publicar mensagens externas. Merge/release scoped pelo pedido atual;
gates e ownership continuam obrigatórios. Não chamar resultado técnico de visual.

## Próximo passo concreto

Economia fechada em 09:59 UTC: régua23/23 e24mutantes causais RED, exit0
`root-economia-fixture-corrigida.log`, syntax/diff-check verdes. Crítico independente
revisou diff integral dos2arquivos após fix da fixture e não achou P1/P2. Checkpoint
seletivo somente régua+doc; nenhum comportamento novo de economia neste commit,
nenhum aceite do PR1179 inteiro. Demais leases e validações seguem pendentes.

Receber testes grafite, revisão de economia, builder AK e acabamento GLM. Corrigir
os dois P2 de motion depois de liberar a lease de AK; validar movimento e ADS no
jogo real. Revisar UV/acabamento, repetir física e bake dos mapas alterados e
recapturar os quatro pontos inválidos. Fechar checkpoints por componente, revisar
diff inteiro e integrar main antes de abrir PRs empilhados. Continuar personagens,
skins, mapas restantes e acompanhamento de merges/release durante a janela completa.

### Conferência Root 10:22 UTC

- Novas fotos reais v2 Campo/Ferro concluídas12/12, oficina1 e actual mapId conferidos. Sheets map-finish-real-v2-{campomorro,ferro_velho}-sheet.jpg. V1Campo descartado (fallback Praça). Ferro tijolo melhor em escala/relevo; Campo limpo porém solo perdeu vermelho, revisão visual independente em curso; sem aceite final.
- Normais builder deadline: lease devolvida,20/20 gate repetido Root GREEN em root-normal-tool-check.log. Nenhum GLB de produto alterado. Tool/doc/régua inteiros em revisão GLM readonly; repetir A/B nos outputs e movimento antes de aplicar.
- SB7 builder devolveu lease,10/10 gate Root GREEN, wire novo eval:sondafilho em fast/deploy no WT isolado. Revisão GLM do PR inteiro+fix em curso.
- Revisões GLM readonly14min para acabamento, normais e SB7 iniciadas10:20; writers AK/posters/curadoria ainda ativos. Crítico achou UV repetida e textura sem pixels além do winding; relatório R2 disponível à curadoria.

### Conferência Root 10:38 UTC

- Main remoto `00e746b5ad91526d498060c07811c5e36e58cf31` inclui #1180; Estraga-código voltou a reviewer padrão. Skill nova lida no Git: review no SHA atual, zero achado válido aberto, checks verdes e smoke real antes de merge. Release consultado permanece alpha.130, sem release novo confirmado.
- GLM curadoria devolveu lease: régua42/42 inclui winding, UV repetida, imagem sem pixels e duas faixas físicas com duas faces legíveis cada. Revisão independente R3 ativa; repetir survey real dos14 mapas. Nada aprovado só pelo Node.
- Normais: comparação real dos outputs v3 tem72PNGs (9vistas ×2variantes ×4personagens), hashes conferidos. Crítico prefere weld60 no corpo e não achou regressão nova nos frames; rostos preservados. Movimento contínuo/transições/cintilação UNKNOWN. Nenhum GLB de produto trocado. R2 GLM corrige guardas, fixtures, docs da ferramenta, sem mudar algoritmo dos4outputs.
- AK GLM devolveu lease e régua6/6: socket corrigido para topo real da massa e linha:true; tiro/hip/GLB não alterados. Revisão integral e ADS no Ego ainda pendentes. Writer sequencial de arma/mãos/movimento segue GLM-MOTION-FECHAR-R3, lease22933; Root não edita esses arquivos.
- SB7 no WT isolado segue GLM-SB7-FECHAR-R2 (40849), corrigindo achados integrais inclusive docs geradas e prioridade falha→SKIP. Normais60196; curadoria terminou87263. Não sobrepor writers.
- Acabamento visual: Ferro tijolo melhora; Campo solo bege rejeitado por perda de identidade vermelha. Crítico apontou vegetação atravessando balcão Ferro; probe de triângulos reais confirmou RED em med e low. Ainda não corrigido. Revisão GLM integral de acabamento expirou sem relatório: não conta como revisão limpa.
- Posters: builder expirou parcial. Root reproduziu ReferenceError norte e corrigiu declaração; gate passou a cinco SUPORTE RED. Probe investiga auto-interseção do cartaz no raycaster antes de deslocar geometria. Fonte das paredes e suporte físico precisam ser conferidos no jogo real.
- Baseline1179 agora possui node_modules isolado por clone APFS e serve4368 novamente. esbuild nativo/API JS verificados. WT principal ainda tem symlink de dependências e será isolado com writers quietos. Não atribuir falha HMR anterior a essa causa sem prova.

### Preparação do prop e devolução de leases

- Ficha FERRO-VELHO-ACABAMENTO-20261031 validada `spec:check`, procedência e prompt próprios. Experimento proposto Modeler Low com teto2.000créditos existentes, sem compra/revisão paga automática. Só balcão fechado dentro do envelope3.2×1×1.4m existente; sem autorização inferida para trocar colisão. Sessão própria no Mint em Space32p1; não operar sessões do Javaporco.
- Normais R2 devolvido60196: Root repetiu23/23GREEN e outputs byte-idênticos aos4GLBs v3. Revisão GLM integral R3 readonly60899 em curso. Produto ainda não trocado.
- Auto-interseção de poster comprovada: antesRED, depoisGREEN ignorando só mesh alvo. Default de suporte preservado. Fixture suspenso/outro poster à frente RED e self-test de guardas GREEN. Cinco posters Praça/Posto agora suporteGREEN no Node; fotos reais e arte/overlap seguem pendentes. Builder GLM-POSTERS-FECHAR-R2 lease55857 nos2mapas/manualgate/doc, sem browser.
- Reviews readonly ativos: AK64779, acabamento84197 (retry com relatório incremental). Primeiro review acabamento expirado continua inválido. Próximo: receber crítico de curadoria e fechar seus falsosGREEN, sem relaxar critérios.

### Conferência Root 10:59 UTC

- Dependências deste WT agora isoladas por clone APFS do npm ci do lock correto; hash lock83568f84, esbuild nativo/API JS verificados. Só o symlink próprio foi substituído. Servidor próprio4367 reiniciado (session53172); baseline4368 permanece isolado.
- Movimento real `_updatePlayer`: gait ligado produz roll pico0.02204rad a4.708m/s, parado decai a2.74e-7rad em1s e ADS cheio zera. Kill-switch produz zero. Tiro AK realmente consumiu munição e tracer coincidiu com muzzle projetado (~0.000028px),1320x880/1280x720. Não atribuir correção do tiro ao patch: baseline1179 já alinha. Capturas motion-r3 e motion-ak-real-r3.json no audit.
- Rejeição visual nova: bloco preto em hip também existe no baseline1179. Ablation real isola mangas, não arma/luvas/DOM; MeshBasicMaterial remove o defeito, Physical original o reproduz. Causa fina em investigação; não chamar motion visualmente aprovado.
- Movimento R3 crítico:3P2 (AUD1C aceita JSON GREEN+exit1; wire Game→ctx sem mutante; NaN parcial escapa) e3P3 (velocidade parcial/ar/moving; speed pré-colisão; estado sobrevive respawn). Lease weapon livre, próximo writer sequencial deve fechar esses e AK após diagnóstico mangas. AK review2P2+5P3, acabamento1P2+7P3, todos pendentes. Wire package será Root único depois de scripts estáveis.
- Normais R4:25/25 e4hashes iguais v3 declarados builder; crítico código independente ainda encontrou guardas/régua abertas. Não trocar GLBs antes de fechar. Imagens72 anteriores continuam evidência dos quatro outputs, não de qualquer GLB arbitrário.
- SB7 R2 expirou sem relatório final e deixou mutante `if(false)` no guard localpath. Root capturou SFS11 RED, restaurou guard exato e repetiu15/15 GREEN mais docs25blocos/32marcadores. Logs root-sb7-R2-{final,restored-guard,docs}. Não confiar em GREEN anterior ao hash final. Próximo revisão integral readonly e crítico, sem repetir mutantes que escrevem produto sem finally.
- Mint: enviado UMA geração Modeler LOW própria às10:43UTC para balcão fechado, teto2k créditos existentes. Aguardar resultado em Space32p1; não duplicar pedido. Ficha/prompt/fontes privados ignorados pelo Git, ledger rastreia caminhos.
- Posters55857 expirou parcial sem validação final (log Deadline exceeded); dois mapas/manualgate/doc devolvidos, precisam fechamento. Córrego31438 e curadoria83711 ainda writers exclusivos. Acabamento sem writer: próxima lease corrige solo Campo/grama Ferro e achados integrais. PR1160 f8fab3a4 tem build/preview/version verdes, outros gates ainda em curso; sem merge/release nosso confirmado.

- Diagnóstico manga afinado: material não era a causa final. `capSleeveOpenings` recalcula NORMAL em Int16normalized e deixou293vetores zero; MeshBasic/flatShading mascaram, Float32+recompute no jogo conserva PBR e resolve. GLM-MANGA-NORMAL-FIX lease40044 só vmsleeve/manga-tampa/doc até12min. Motion/AK/3P aguardam writer sequencial. Fotos hip-black-normals-* sustentam causalidade, não aceitar remoção de relevo como conserto.
- Mint original pronto por698créditos,58.616bytes sha256 dabc0f95b5e31ecd8460358f6ce247c443d2aa9b7c6dccf00a0df5d40b4f5b57. Privado generated/ferrovelho-balcao-20261031/mint-original.glb,24meshes/5materiais/608faces/semtexturas. Medida browser3.20000005×1×1.39999998m. Só injetado em runtime baseline4368, collider antigo preservado e visual antigo oculto, oito fotos counter-context-v1. Foto longe-7m original INVÁLIDA (câmera fora da casa); substituir por longe-7m-interior. Assetreview independente a seguir antes de integrar.
- Leases novas: acabamento70567 nos2mapas/binding/finish/doc; normaisR5 49828 tool/régua/doc; postersR3 43346 nos2mapas/manualgate/doc (R2 deixou SyntaxError confirmado); curadoria83711 ainda ativa. Córrego31438 devolvido:1painel/UV1x1, med+low/selftest3causais GREEN declarados, Root/crítico pendentes. SB739989 review integral readonly e crítico independente em paralelo; crítico achou3P2 de fail→SKIP e1P3 de mensagem, não integrar ainda.
- Fila remota: #1160 avançou00cede9c6c, checks reexecutando e CHANGES_REQUESTED. #1179 fd553b310b DIRTY/3gatesRED/reviewchanges; #1167 d4e0ccfda3CLEAN/CIgreen/reviewerEstraga solicitado mas semreviewentregue. Última release seguealpha.130.

### Fechamentos e próximas integrações — 11:15 UTC

- MANGA40044 devolvida exit0: GLB real reproduz293/5090 normais zero antes e0 depois, sem mudar material/atlas. Float32 no acumulador; MT8 nova. Crítico independente revisa fonte completa; Root ainda repetirá visual real. Não aceitar a guarda por nome do mutante MT8 como causalidade: retirar se confirmada redundância.
- Writer sequencial seguinte89302: motion+AK/game/invariants/réguas/docs, fecha crítico R3 (3P2+3P3) e review AK (2P2+5P3). vmsleeve/manga congelados durante revisão. Economia/flash#1179 e3P aguardam devolução.
- Curadoria Root provou RED do doubleRepeat fracionado e corrigiu: UV2×repeat0.6=1.2,67conferências GREEN. Crítico R5 fechou9pontos anteriores e abriu wireframe/reflexão/UVNaN (3P2) e docforaescopo(P3); GLM70409 fecha só esses, sem alterar mapas. PostersR3 devolvidos43346, baseline+3mutantes GREEN declarados; Root/crítico independente pendentes.
- Balcão Mint passou revisão independente CRITICO-BALCAO-V1: proporção/envelope, portas fechadas, legibilidade3/7m, semgrafos/posters/texto. Foto7m válida é longe-7m-interior; a original fora da casa foi rejeitada. Integração real/fallback/colisão/custo pendentes após liberar lease acabamento70567.
- Acabamento70567 já relata solo Campo com tint baseado na referência e grama Ferro movida para fora do balcão,7mutantes e binding15 verdes; aguardar saída real e repetir fotos/física antes de integrar prop. NormaisR5 49828 ainda writer; não trocar4GLBs até revisão final.
- SB7 próprio isolado checkpoint7169fc5b9 sóledger;10309 fecha3P2 fail→SKIP e docs/coberturaP3, sem tocar autor. Córrego60840 fecha aceitação/mutantes, produto já1painelUV1x1.
- Outro owner B2 tem checkpoints locais em lote-gustavo-20261029 (7baa88385), sem push recente: PR1171 ainda7e60e8ff remoto. Ler/reusar commits focados e suas provas; não editar lane alheia nem importar remoção de racks sem avaliar escopo/decisão do dono. UI visual inicial encontrou overlay de erro no dev baseline4368; diagnóstico antes de captura.

### Marco validado: mangas, 11:19 UTC

- Fix Float32 confirmado no jogo1320×880 em hip/ADS, material original e demais5meshes quantizados preservados; JSON manga-fix-real registra5090normais/zero0/bad0. Root olhou fotos clean. Overlay HMR Vite fechado por clique; não era o bug de produto.
- MT8 perdeu rejeição por nome: cópia audit sem aplicar mutação mantém nome e sai0; antes saía1 (logs Root RED→GREEN). Mutante aplicado sai1/36zeros, npm baseline+3mutantes exit0; vm-manga-oca26armas tambémGREEN. GLM revisão integral R2 CLEAN semP1/P2, residual descrição npm corrigida; crítico independente R1 não encontrou regressão de produto e seus3achados foram fechados.
- Checkpoint seletivo desta frente inclui só vmsleeve/MT8/doc e duas chaves npm; motion/AK continuam uncommitted do writer89302. Não confundir checkpoint com merge/release. SCRIPTS.md está no repo progress de outro owner: não editado nesta lane; descrição canônica está no package/doc.
- Normais31115 concluiu26/26 e4outputs-v5 iguaisv3; crítico independente R5 em curso. Balcão63169 integra visual/fallback/colisão e procedência; termos seção4 confirmados ao vivo viaEgo em31/10, sem nova geração ou compra. Posters57329 sógate/doc; curadoria70409 devolvida73/73, críticoR6 em curso.

### Fechamento de leases — 11:31 UTC

- Curadoria Root fechou UV não finita em ocorrência não indexada e rotationNaN: RED→GREEN,77/77; críticoR7 CLEAN focal. Survey real dos14mapas e bake final ainda pendentes.
- SB7 Root repetiu20/20 GREEN no ponto final; revisão GLM integralR4 CLEAN e crítico independente integralR4 CLEAN, hashes estáveis. Preparar checkpoint/CI antes de integração; sem merge nosso ainda.
- Balcão63169 devolvido: asset/registro/fallback implementados, mas24draws e gate incompleto. Próxima lease deve agrupar5materiais e validar física/fallback/custo med+low.
- Motion89302 devolveu PARCIAL. Lease sequencial R5 assume só1P/AK/game/réguas: probe Game→ctx isolado, AUD1C erro+stdoutGREEN, speed pós-colisão sem threshold12 arbitrário e vertical AK específica. Economia/flash/3P aguardam. Manga3a176b0fb permanece congelada.
- Normais59463 R6 ainda exclusiva para finitude/ângulo e referência de qualidade durável, sem trocarGLB. Complementos readonly1179 produto10100 e gates83459 ativos.
- Retificação da métrica3P: “head” no JSON de ablação é variante HEAD do fonte, não cabeça. ruins1e4 é contagem por10.000arestas, não porcentagem. SemClamp melhora p99 Mandrake .551→.540 mas piora máximo2.80→3.43; não é aceite. Crítico descobriu offset palma local somado a distâncias mundo (escala~.01) e proxy cabeça sincronizado cedo; diagnóstico salvo, fix futuro sequencial.

- 11:33 UTC: normais59463 devolvida,28/28 e qualitygate4/4 em temporários; originais RED esperado. Sem swap até revisão. Lease balcãoR2 só trecho Ferro/maps/gate/proveniência: PropBatch5draws e contratos reais de fallback/física med+low. Survey5 já concluiuFerro antes da lease; curadoria não muda.

### Revisões de fechamento — 11:37 UTC

Survey5 real14mapas concluiu (últimos3 por job assíncrono Ego, timeout15s anterior não virouGREEN). Todos medidos com0duplicadas/unsupported/unknown/divergent. Quebrada tem2faixas físicas/4faces válidas consolidadas pelo contrato; inventário bruto rotula4faces unclassified, mas medição reconcilia as2peças físicas. Semcapturasneste survey, nãoaceitevisual.

Posters críticoR4 achou1P2: CONTAGEM_MANUAL não entra noSet queverifica mutante. Root reproduziuRED exit1 e acrescentoucláusula; GREEN e5mutantes pendentes. NormaiscríticoR6 fechou finitude/F2mas novoqualitygate deixa flipconjunto/NORMAL fora grupos passarem e falta baselinepós-swap; R7 fecha sóesses+parser, semswapdeGLB. Córrego críticoR2 achou3bypassesnaregua (DoubleSide/UVdobrada/reflexão) ecausalidadeguardoff; R3lease fecha semalterarprodutoatual.

MotionR5 devolvido: AKnovaL1v realmenteRED +7px nas2proporções, nãoUNKNOWN. Socketsna cruz não provam ponta visível; próximaetapa precisa conferir oclusão da alça e corrigiraltura físicamínima. Probe Game→ctx atualainda fraco (nãoexercitaparede,diagonalrotuladaéstrafe,morte sólêamostraanterior), necessáriofecharcausalmenteantesaprovar. Foto manga hipclean é válida; ADS clean mostra canvaspreto e estáREJEITADAcomoaceite deADS (normais0zero continuammedidos). Repetircaptura pelo rendercompleto real.

- UI crítico visual R1: EN/PT incompleto e chip+44px sobre rosto em844×390; scroll existe, não perda de conteúdo. GLM UI R2 lease só textos seleção/carteira e dimensão visual do pin mantendo alvo44px. Nenhum fluxo novo, HUD/arma/compra/API preservados. Root repetirá PT/EN e coarse nas2orientações.

### Normais aplicadas e SB7 remoto — 11:51 UTC

- Root repetiu28/28 da transformação sobre originais extraídos de ad696fb87 e4/4 sobre outputs v5; crítico integral R7 CLEAN de fonte. Aplicados os quatro GLBs públicos (zumbi/caipora/lampiao/esquerdomacho), hashes iguais ao manifesto v3. Gate de produto público4/4 GREEN; revisão de72frames prefere esses mesmos bytes. Movimento contínuo ainda pendente, não aceite de release. assetver atualizado só para esses4assets, sem invalidar áudio. Novo gate de produto ligado a fast/deploy; régua manual preserva baseline explícito.
- PR#1181 aberto no SHA03008374bb8b5f9fbf4c91698273d67686956dc5 após pre-push435s GREEN; Estraga-código solicitado pela API. CI reguas-e-site/preview/classify verdes; invariantes ainda executando e nenhum review publicado na consulta11:50UTC. Não mergeado.
- Fotos Campo v4 com atores, efeitos transitórios e marcadores CTF ocultos concluídas6/6 em1320×880, mesmo enquadramento/qualidade med. Substituem v3 com fumaça. Root prefere solo vermelho sem padrão losango e menos colagem repetida; fachadas continuam muito retangulares, M4 não aprovado. Ferro fallback e régua ainda têm achados independentes R2, lease de fechamento seguinte.
