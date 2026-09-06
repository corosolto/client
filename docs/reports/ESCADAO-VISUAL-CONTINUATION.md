# Escadão visual — continuidade

## Estado ativo após atualização de 06/09/2026
- Branch ativa: `codex/escadao-main`, sobre `origin/main` 69555790 (alpha.223), na mesma worktree. A branch anterior `codex/escadao-visual` permanece em 072e6d71. Registros R1–R3 abaixo são históricos.
- Servidor para o usuário: Astro real em `http://127.0.0.1:8148/?map=escadao&lang=pt`; o servidor parcial de avaliação foi encerrado.
- Menu completo passou com cinco facções, escolha de personagem/adversário, todos os props carregados e movimento real. Corpo 8/8 e anéis 3/3 passaram na main. Grafo corrigido: 370/370 nós, oito rotas para a Deagle; mutação volta a isolá-la.
- Build aprovado. Recibos em `artifacts/escadao-visual/main-sync/`. A captura automática adicional foi recusada por falhas de rede em endpoints remotos de seleção/online; o teste funcional do menu passou sem erro JS ou asset visual ausente.
- Checkpoint de assets: `6a02dd1c`. Crítico independente confirmou o grafo, as arestas finais com `_walkReach` real e o registro de grafite.
- Relatório da integração: `docs/reports/ESCADAO-MAIN-SYNC.md`; runtime e menu em `6ea53653`.
- DOCS1, ARCH1, COMENTARIO e DOCSAUT passaram. Checkpoint de documentação: `828224fb`. Astro reiniciado; HTTP 200, alpha.223 e zero literais de template conferidos em `main-sync/delivery.json`.
- Próximo: revisão do usuário, FPS/GPU exclusivo, orçamento AM7 e integração do PR. Áudio privado local e régua SSR legada continuam com as limitações detalhadas no relatório; o teste jogável pelo menu está disponível. FPS e AM7 continuam pendentes. Galeria anterior é evidência histórica R3, não certificação da atualização da main.

## Objetivo e definição de concluído
Elevar Escadão (Morro) do PR #436: subida, becos e patamares de um bairro brasileiro habitado; fachadas variadas, comércio, varais e vegetação legíveis em combate. Preservar três alternativas de rota, objetivos/pickups, spawn protegido e risco/recompensa. Exigir pesquisa real, antes/depois 1536×1024 nas mesmas câmeras, GLBs carregados, corpo/Game._collide, gates e mutantes, crítica independente, medição de todos os passes e performance sem concorrência. Sem merge/deploy/push. Commits locais DCO + Agent.

## Isolamento e baseline
- Worktree criada nesta sessão: `/Users/ruben/csbrasil/worktrees/escadao-visual`, branch `codex/escadao-visual`.
- `git worktree list --porcelain` conferido: `map2/escadao` e `feat/times-e-mapas-completo` não ocupadas; nenhuma worktree existente reutilizada.
- `git fetch origin map2/escadao` executado; baseline `4dc1f9bba764d5e3031ad2c530f7640247b48c54`.
- PR aberto, head `map2/escadao`, base `feat/times-e-mapas-completo`; GitHub informa CONFLICTING/DIRTY. Checks publicados são herdados, não validação desta frente.
- Merge-tree somente leitura com ref local da base `daa9249d1952d820bf70e58745868d2a8ae59403`: conflitos em ARCH.generated.md, STATUS.md, docs/docs/comecando.md, docs/docs/quality-gates.md e traduções correspondentes. Confirmar atualidade da base antes da entrega.
- Builder ativo confirmado por `public/js/maps.js`: `buildEscadao` de `public/js/map_escadao.js`.
- Porta reservada por esta frente: 8148 (livre ao conferir); navegador próprio. Não interromper outros processos. Sem garantia de exclusividade GPU, performance não pode receber aprovação.
- Node padrão do shell é 16; usar `PATH=/opt/homebrew/bin:$PATH` (Node 23.6.0).

## Método e estado
- Lidos AGENTS.md, STATUS.md, HANDOFF.md, docs/LICOES.md, tools/eval/ARCH.md e skills csbrasil/asset-review/gauntlet-fps/regua.
- Pesquisa real iniciada, acervo local de casas/varais existente com FONTE.md. Nenhum asset novo integrado.
- Pendente: ficha de referências, diagnóstico visual ANTES, gates baseline, régua vermelha de defeitos demonstrados, correção restrita ao mapa, mutantes, comparação visual/movimento, crítica limpa, checks/build e checkpoints.
- Artefatos volumosos e logs: `artifacts/escadao-visual/` (não commitar). Referências não redistribuídas: `references/escadao-visual/`.
- Próximo passo: preparar dependências e capturar baseline com GLBs reais; registrar problemas observados antes de editar builder.

## Baseline validado
- Node: escadao-contract, escadao-rota, mapcontrato, ambience-registry, look, escala-casario e map-source: 7/7 passaram. `eval:look` cobre outros mapas, não o Escadão.
- map-check escadao: 12 degraus por lance, 0,1692 m de espelho / 0,2909 m de piso; 0 corpos submersos; ≥2 rotas CTF; spawn E 0% e B 15,6% exposição longa (ver limitação do contrato vertical). Mantle: três cláusulas verdes.
- Captura inicial `before/`: 17/17 casas GLB carregadas, seis varais Group. Zero pageerror; 51 HTTP 404 incluíam acervo privado ausente e endpoints não servidos pelo arnês.
- Copiados apenas arquivos ausentes de áudio/decalques do acervo local `/Users/ruben/csbrasil/client/public/`, preservando arquivos versionados. Recaptura completa em `baseline/` em curso.
- Crítico independente `critico_antes` (contexto limpo) REPROVOU: azulejos esticados/listrados, paredes repetidas, fios sem suporte visível, varais próximos da silhueta, mirante genérico. APROVOU apenas o protagonismo da subida. Não concluiu equilíbrio por screenshot.
- Decisão: atacar primeiro material/UV e leitura de fachadas; preservar geometria de combate, salvo defeito físico provado pelo probe.

## Correção inicial e regressão (2026-09-06)
- Baseline completo `artifacts/escadao-visual/baseline/`: oito câmeras 1536×1024, FOV 70, high, pixel ratio 1; 17/17 casas, seis varais, zero pageerror; seis HTTP 404 de endpoints fora do servidor estático.
- Gate novo `tools/eval/escadao-visual-check.mjs` usa Game._updatePlayer/_collide no navegador e GLBs reais. RED antes da alteração: EV1 três varais no envelope corporal; EV3 uma interseção na cabeça; EV2 12/12 travessias. Recibo `artifacts/escadao-visual/red/runtime.json`.
- Mudança restrita ao builder: separação concreto/espelhos pontuais, UV métrica no azulejo, quatro tons de fachada sem decalque repetido de tijolo, varais afastados/elevados, apoios da fiação e varais, placas originais e seis vasos com folhas instanciadas.
- GREEN inicial: EV1 zero varais no envelope, EV2 12/12 travessias (ida/volta, corrida/caminhada), EV3 zero headHits/sem piso. Recibo `artifacts/escadao-visual/after-check/runtime.json`. Uma tentativa anterior expirou no carregamento; repetição completou, sem alterar limiar do teste.
- Não aprovado: faltam comparação visual independente, mutantes, contratos após alteração, build e janela GPU exclusiva. Mirante ainda precisa crítica do depois.
- Próximo passo: terminar capturas `after/`, validar mutantes reais e revisar qualidade/abrangência dos probes.

## Segunda crítica e verificação ampliada
- Build intermediário passou (log `artifacts/escadao-visual/build.log`); repetir no fonte final. Oito contratos após correção inicial passaram. Sete mutantes Node morderam suas cláusulas (`mutants-node/results.json`).
- Regeneração de grafites: 387 → 242 peças; 13 sobreposições removidas. Comparação estrutural confirmou alteração somente da entrada Escadão em graffiti_layout.js. Gerador padrão SwiftShader sem saída por 12 min foi encerrado junto de seu próprio Chrome; repetição com GPU nativa completou, sem medir FPS e sem interromper outras frentes.
- A/B reproduzível `tools/eval/escadao-evidence.mjs`: intercepta builder/layout do SHA baseline; oito câmeras + combate por revisão em `artifacts/escadao-visual/comparison/`. Todos os passes contados, FPS não medido (GPU compartilhada). Dados atuais: 1111–1404 calls no baseline e 1151–1453 no depois; capturas serão atualizadas após novas correções. Não aprovar performance nem atribuir todo delta ao mapa sem controlar entidades da partida.
- Crítico limpo `critico_visual_ab` examinou 18 frames e duas referências: aprovou subida, redução de azulejo/grafites e varais nos enquadramentos. REPROVOU conjunto (5,5/10 subjetivo): becos marrons sem aberturas, plantas invisíveis, mirante genérico, anel branco sobre beco leste, avatar branco insuficiente para contraste.
- Crítica técnica independente levou a novo probe: retorno contínuo, contatos reais, raios de ombro por frame, circulação e LOS, failclosed/hashes. `after-review/runtime.json`: 12/12 escadas, LOS verde, mas EV1 184 amostras em varal leste x6.2/z9.2. EV3 também contava próximos degraus como headroom; EV4 zero contatos era hipótese inválida; EV5 planejador não contornava mesas nem aceitava alcance do pickup. Corrigir instrumento sem tratar esses erros como defeitos físicos comprovados.
- Em andamento: varal leste z9.8; reboco claro com grão fino e paleta azul/verde/terracota; módulos de porta/janela rasos nos becos; duas plantas visíveis; casario distante reposicionado no panorama; faces domésticas no mirante. Ainda não capturado/validado.
- Raycast real identificou forma branca como TorusGeometry do anel CTF, opacity .5, atravessando o ar por usar piso do centro. Régua `escadao-ring-check.mjs` criada ANTES da correção para comparar vértices com terreno. Solução planejada: world.update local do Escadão ajusta malha visual ao terreno sem mudar raio/regras nem game.js.
- Global relevante: syntax, asset-integrity, gltf-validator, props-acervo, grafitelayout, grafite-editorial, fixture, comentario, arch passaram; docs:check aponta nove blocos gerados desatualizados após inclusão de scripts. Regerar docs quando código estabilizar; não editar prosa alheia.
- Próximo: terminar ER1 vermelho, corrigir anel local + mutante, concluir planner/probes com agente técnico, regenerar grafite após geometria final, recapturar A/B/combate texturizado, crítica independente de retorno, ambience/mantle/map-check/build/docs finais e commits DCO+Agent. Performance exclusiva continua pendente.

## Terceira revisão e defeitos físicos confirmados
- A/B `comparison-final/`: 11 pares, personagem final esquerdomacho com AK e materiais carregados. Crítica independente 6,5/10: aprova subida, identidade, fachadas, vegetação presente, varais/fios e contraste nos dois casos; reprova placa oeste encoberta, fundo sem janelas na face Z e faixas CTF largas. Comércio ainda requer câmera próxima. Implementadas correções mínimas, a recapturar.
- ER1 verde após projeção do anel ao terreno; mutante `anel-plano` voltou ao máximo 2,3625 m acima do piso. ER2 novo RED: largura real de 0,405 m nos quatro anéis; correção local para 0,072 m sem mudar raio/regras, a validar.
- `after-review3`: EV0/1/2/4/6/7 passam; EV3 26 penetrações, EV5 E19/67 e B66/67. Browser confirmou GLB comercial rotacionado excedendo colisor (até 7 cm) e mesas maiores que proxy. Corrigir esses defeitos reais; não tratar como tangência nem afrouxar teste. O planejador também perde saída de componente isolado apesar de entrada real: agente corrige por breadcrumbs validados, sem teleporte.
- Build final desta rodada passou; 11/11 contratos em `final-gates.log`, docs regeneradas; map-check e mantle verdes. Repetir afetados após correções físicas. Sete mutantes Node já morderam. Mutantes visuais EV1/EV2 aguardam baseline completo verde. Ambience navegador e performance exclusiva pendentes.
- Próximo: corrigir footprint visual/corpo de casas e mesas, concluir circulação real, mutantes, A/B final e crítica, ambience e checks/build necessários, relatório e commits locais. PR continua aberto/conflitante, head/base remotos inalterados (`pr-final.json`, `remote-heads.txt`).

## Milestone final de implementação e crítica
- Crítica visual independente aprovou a melhoria localizada (7/10), 13 pares em `comparison-review/`. Delta final em `comparison-accepted/` resolveu folhas sobre placa e solo externo sob o casario; crítico confirmou os três frames, sem regressão visível.
- Captura final controla sete bots, AK, pose e slots idênticos entre baseline/depois, além de câmera/FOV/qualidade. Arquitetura fotografada com bots ocultos; custo medido com todos visíveis e fauna GLTF ativa. Ator texturizado próprio nas duas vistas de combate. HTTP inesperado/GLB/instância/fauna ausentes invalidam A/B; apenas endpoints e template Astro conhecidos do arnês são exceções explícitas.
- Físico: corrigidos proxies das mesas (1,2 → 2,13 m para GLB 2,124 m), rotação de quatro casas comerciais fora do footprint, quatro puxadinhos sem colisão, capeamento 2 cm para dentro da escada. Puxadinho leste deslocado até x6.1: corredor de 1,30 m, grade de 0,5 m e corpo real passam sem mudar limiares. `rota-final.log`: 7/7 lances; 0/953 observadores altos veem spawn.
- EV0..EV7 verdes: 12 subidas/retornos, 134/134 visitas (67 por time) com retorno, sem headHits nem piso ausente, 22 contatos normais e zero travamentos. Fauna registrada como não sólida é explicitamente excluída da sonda de headroom estático; animação/reação verificadas no gate separado. Sem afrouxar raios de corpo/pickup.
- Anel CTF: ER1 reforçado mostrou faces até +3,710/-2,783 m enquanto vértices passavam. Agora cada face é recortada nas fronteiras X/Z do terreno antes da projeção: altura +0,084..+0,156 m, faixa ~0,0733 m, raio de captura 4,5 m intacto. Mutantes plano/enterrado/colapsado mordem.
- Mutantes runtime varal-na-rota (EV1), escada-bloqueada (EV2), sem-abrigo (EV7) morderam; o último prova visada antes fechada→aberta e restauração verde. EV7 exige duas rotas com interrupção ≥ diâmetro do corpo para cada observador, além da varredura alto→spawn. Maior trecho exposto: central 22,69 m, oeste 17,63 m, leste 5,55 m; não é prova de equilíbrio competitivo completo.
- `gates-final.json`: 15/15 contratos/checks relevantes passaram. Build anterior verde; build do último solo externo em curso. Grafite final 245 peças/54 arquivos, 14 sobreposições removidas. Outros mapas preservados.
- AMBIENCE: path bug herdado `map_${id.slice(3)}.js` impedia execução (`map_es.js`); corrigido para id completo, sem mudar cláusulas. Opção `CHROME_NATIVE=1` reproduz no backend local e evita travamento SwiftShader, sem benchmark. 15/16 cláusulas verdes; AM7 vermelho herdado: fauna Escadão 11 animais/25 malhas/41.568 triângulos tanto antes quanto depois, teto antigo 6/29.000. Não elevar teto nem remover espécies obrigatórias para esconder a falha. Validar orçamento/população em integração é pendência explícita.
- Custo controlado final: subida 1313→1382 calls; descida 1295→1387; lateral 1141→1209; rua 1428→1519. Geometria rua 769.309→810.541 tris. Novas aberturas/detalhes têm custo; não atribuir ganho de FPS. Sem janela GPU exclusiva reservada: FPS e aprovação de performance continuam pendentes.
- Próximo: confirmar build, repetir controle verde após mutantes, salvar relatório final/lista de arquivos/inventário, commits locais DCO+Agent. Sem push/merge/deploy. Pendências não desaparecem com término desta rodada.


## Entrega local validada (2026-09-06)
- Implementação: `05a6514a`; réguas e mutantes: `b8e5f7b2`; correção de path do gate ambience: `625bb8b4`; ficha/baseline: `d814cb97`. Todos locais, DCO e Agent, sem push. A worktree e branch permanecem as mesmas.
- Build final confirmado PASS em `build-accepted.log`. Controle após mutantes: `restored` EV8/8 e `ring-restored` ER3/3 verdes; `ambience-accepted` mantém somente AM7 vermelho. 15/15 contratos/checks em `gates-final.json`. Documentação gerada atualizada; `docs-check-delivery.log` e `arch-check-delivery.log` passam.
- Vídeos A/B completos `artifacts/escadao-visual/motion-complete/{baseline,after}/movement.webm`: 1536×1024, 16,56/16,36 s, 1007/1006 posições amostradas. Entrada KeyW no loop normal, x1.2 e z13.6→−6.4→13.6, chegada y6.12 nos dois. Sem teleporte entre pernas; sem chamada manual de física. `verification.json` contém bytes, dimensões, duração e hashes. São registros visuais, não FPS/velocidade.
- Tentativas de vídeo rejeitadas preservadas: destino inicial z13.8 ultrapassava a folga até a cobertura existente (parada física z13.72); escolhido z13.6 para ida e retorno iguais. Outra tentativa falhou por áudio ambiente ausente. Nove arquivos já documentados em `public/audio/ambiente/FONTE.md` foram recuperados de suas URLs; `audio-restoration.json` registra hashes. Nenhum binário commitado, nenhuma exceção nova de asset no teste.
- Crítica técnica independente dos recibos de movimento: sem falso sucesso observado, altura/continuidade do trace conferidas; o script de vídeo verifica Z e finitude, portanto a régua física separada permanece necessária. FOV/qualidade do vídeo são parâmetros configurados, não leitura runtime; trace sem tempo não mede velocidade. Fotos estáticas registram câmera/qualidade runtime.
- `lajes-reference/`: duas capturas reais do mapa Lajes intacto, inspecionadas como referência de identidade. O percurso entre coberturas permanece distinto da subida em três lances do Escadão. Nenhuma aprovação de performance inferida.
- `scope-preserved.json`: seis GLBs byte a byte iguais ao baseline; apenas a entrada e fingerprint Escadão mudaram em graffiti_layout; pass comum intacto. Fontes compartilhados de jogo/look/loaders preservados.
- Estado remoto revalidado em `pr-delivery.json`/`remote-heads-delivery.txt`: PR #436 OPEN, CONFLICTING/DIRTY; head4dc1f9bb e basedaa9249d inalterados. Sem merge/rebase/push/deploy.
- Relatório de entrega: `docs/reports/ESCADAO-VISUAL-RESULTADO.md`, com diagnóstico, 13 pares finais, inventário, arquivos exatos, gates/mutantes e orçamento. A melhoria visual localizada recebeu aprovação independente; o conjunto NÃO está aprovado para produção/performance.
- Próximo passo de integração: obter janela GPU exclusiva e medir antes/depois nas vistas subida/descida/lateral/rua; conciliar fauna obrigatória com orçamento AM7 sem afrouxamento artificial; resolver conflitos contra a base vigente em uma ação de integração autorizada. Até lá, conservar commits e evidências locais.


## Revisão solicitada pelo usuário: referências de escadaria (06/09/2026)
- O usuário REPROVOU a aparência da entrega9911d554: sem aspecto de favela; camburão no meio da escada inadequado. A aprovação visual anterior não representa aceitação do dono.
- Cinco fotos recebidas: casas próximas/altas, concreto predominante, tijolo/bloco e reboco parcial, soleiras e ferragens, plantas nas bordas. Fotos somente como referência, sem licença para integrar ou extrair textura. Cópias privadas em `references/escadao-visual/user-20260906/`; inventário em `artifacts/escadao-visual/references-r2/`.
- Objetivo completo preservado: refazer composição sobre9911d554, retirar veículo da escadaria, manter3rotas/CTF/pickups/spawns/cobertura/risco, corpo real, mutantes e crítica independente. Mesma worktree/branch, porta8148; sem benchmarks concorrentes, push/merge/deploy.
- Crítico novo `referencias_favela` viu5fotos+6frames e REPROVOU monumentalidade, espaço de céu, alvenaria lisa, faixas de azulejo repetidas, infraestrutura modular e mirante vazio. Não se resolve com mais adereços soltos.
- Próximo: registrar contratoRED de veículo/cobertura, aproximar fachadas e refazer degraus de concreto; comparar com9911d554 e referências; repetir física/LOS e gates afetados. FPSexclusivo eAM7 herdados continuam pendentes.

## Revisão R2: composição e primeira validação
- Removido camburão; anexo de alvenaria conserva footprint do cover. Escada central3.6m, concreto em UV métricas; casas junto aos lances e becos com alvenaria/reboco, portas, janelas, ferragens e lajes. Tijolo reutilizado do acervo autoral Lajes, sem integrar fotos recebidas. Fundo do mirante adensado fora da arena.
- Crítico independente aprovou direção dos corredores e implantação do mirante em look-fourth/after; apontou repetição das janelas distantes, reboco serrilhado e artefatos pretos. Primeiros dois receberam acabamento localizado; artefatos ainda em diagnóstico, sem aprovação final.
- MAP1 detectou prateleira de vaso sem colisão emx-13.65,z6.4: pen1.12m. Elevada e anexada à fachada emy4.2,z7.2, folga.34m acima da cabeça. MAP1 completo anterior à última mudança dez passou zero; spotcheck independente atual passou. Recibos em references-r2/map-fourth.* e map1-plant-diagnosis.json.
- Versão anterior desta R2: contrato6/6 +6mutantes causais, rota7/7, corpo8/8 com134visitas/12lances, anel3/3,13gates e build passaram. Não são aprovação automática do fonte alterado depois; validação atual em andamento.
- Próximo: eliminar artefatos com prova no browser, regenerar grafite só Escadão, validação final/A-B/movimento, crítica, galeria, relatório e checkpoints locais. Objetivo completo/FPS exclusivo/AM7 permanecem conforme acima.

## Checkpoint visual R2, antes do fechamento físico
- Crítico confirmou em seam-look/after: junta tracejada da fachada e reboco serrilhado corrigidos; composição do mirante/corredores preservada. Residual: simplificação do casario distante; aceitação do usuário ainda não recebida.
- delivery-runtime8/8, delivery-ring3/3 e seis mutantes browser detectados; movimentoA/B concluído e ambience mantém apenasAM7vermelho. Node delivery-validation estava verde. Capturas delivery-comparison13pares.
- Revisão independente achou ponto adicional fora dospercursos: ombro emx-13.45,z11.92 pode atravessar peitoril. CHECKPOINT NÃO FECHA A FÍSICA. Próximo: réguaRED específica, colliders dos detalhes, mutante, teste no navegador e repetir afetados.
- Captura de combate ganhou metadados reais de câmera/FOV/qualidade no arnês; regenerar pares antes de entrega. Custo delivery-comparison: menos chamadas, mais triângulos; não inferir ganho deFPS. Galeria em preparação, conteúdo ainda será atualizado.

## Fechamento do contato na fachada
- Checkpoint visual recuperável53f0c6b6, somente local. Novo defeito demonstrado em facade-red/facade.json:78interseções no peitoril. BrowserKeyWtambémRED:parava emx-13.52, ombro penetrava no peitoril a0.21m do centro.
- Adicionados191colliders locais para portas/janelas agrupadas, peitoris,pilares,canos e marquises. Nenhuma colisão por barra e nenhuma expansão contínua invisível da parede. Fonte compartilhado Game intacto.
- facade-validation:3/3,110frames/110chamadasreais,75contatos,zero interseções,retorno. Mutante remove só191tags:mesmos78hits no mesmo peitoril;restauraçãoverde. FísicaR=.38mantida;raios usam epsilon1e-5m para distinguir contato exato de penetração Float32.
- facade-browser-green/after/facade-browser.json:KeyWnormal chega ax-13.35, quatroalturas de ombro livres,191colliders. Mudança0.17m emrelaçãoao contatoantigo, compatívelcomavanço do peitoril.
- Contrato6/6,rota7/7,alto→spawn0/920,map-checkzero continuamverdes nofonted834dba2. Recibosfacade-validation. Próximo:concluirúltimosmutantes/reexecuçãobrowser,galeriarelatório/builddocs ecommitfinal.

## Evidência final R2 e preflight de grafite
- Checkpoint físico local f6ac4bb3; builder final SHA256 d834dba2df537ecb0e7d1afa51d44456574f567d06ea5dbfe3a836e79cd873df.
- Captura recusou layout de grafite com fingerprint anterior aos novos colisores. Arnês agora verifica sincronização antes de abrir o navegador; RED preservado em delivery-closed/preflight-red. Regeneração manteve 262 peças e alterou apenas fingerprint Escadão.
- closing-runs.json: grafite, régua, corpo restaurado 8/8, comparação e movimento A/B passam. Capturas finais em delivery-closed/comparison, 13 pares 1536×1024; manifesto da galeria não encontrou câmera divergente nem metadados ausentes.
- Vídeos finais em delivery-closed/motion; mesmo percurso com KeyW normal. Próximo: conferir mídias e galeria no navegador, atualizar documentação gerada, concluir relatório/lista de arquivos e checks/build; commit local da entrega. AM7, FPS exclusivo, integração e aceitação do usuário permanecem pendentes.

## Entrega R2 consolidada
- Commits locais 53f0c6b6, f6ac4bb3 e dee96483 preservam composição, correção física e recusa de captura com layout antigo. Builder d834dba2 e grafite 978d450c correspondem aos 13 pares finais.
- delivery-closed/final-verification.json: contrato 6/6, fachada 3/3, rotas 7/7, MAPCHECK zero, corpo browser 8/8, anel 3/3, 13 mutantes detectados e 14 checks globais verdes. Build/docs/arch/comentários passam; mantle passa. AMBIENCE mantém somente AM7 vermelho herdado.
- Galeria regenerada dos pares finais, 31 imagens privadas embutidas; manifesto sem divergência de câmera/metadados. Browser desktop/celular: carregamento e controles passam, sem overflow ou erro. URL local http://127.0.0.1:58555/gallery.html. Porta 8149 estava ocupada por outra frente; foi escolhida porta livre sem encerrar qualquer processo.
- Vídeos finais de 17,20/17,12 segundos, 1536×1024, 1003/1009 posições finitas; subida e retorno com KeyW normal, y máximo 6,12. Recibo delivery-closed/motion/verification.json. Não são benchmark de FPS/velocidade.
- Relatório atual docs/reports/ESCADAO-REFERENCIAS-R2.md contém diagnóstico, arquivos exatos, evidências, custo e limitações. Rua 1519→1340 calls, 810541→1163895 tris; mais geometria, performance sem aprovação. Relatório anterior marcado histórico/rejeitado pelo usuário.
- Próximo passo dependente de revisão/janela externa: aceitação visual do usuário, FPS/GPU exclusivo, orçamento AM7 e integração dos conflitos do PR. Não houve push/merge/deploy nem edição de outra worktree. Conservar galeria, vídeos, recibos e commits locais.

## R3 solicitada: rua, escala, vegetação e fiação
- Usuário aprovou direção R2 (“ficou bom”), mas rejeitou escala/leitura do prédio que atravessa a rua, planta facetada e falta de mato rasteiro/fiação convincente; sugeriu modelos no mint.gg. Baseline R3: 45e0a29f, mesma worktree/branch.
- Diagnóstico: abrigo de 17,2 m com mureta de 1,25 m e janelinhas lê como pavimento achatado; folhas são esferas de 5×3 segmentos; apenas seis fios segmentados. Preservar rotas, abrigo/LOS, corpo, CTF e direção aprovada.
- Mint aberto no Chrome: pediu login; controle do navegador indisponível após abrir autenticação. Pedido assíncrono ao usuário para concluir login. Acervo já contém samambaia e mato rasteiro gerados no Mint, com fonte/registro e hashes em refinement-r3/existing-mint-assets.json. Nenhuma compra ou nova geração realizada até aqui.
- Próximo: refazer somente moradias sobre abrigo, substituir folhas e acrescentar mato baixo nas bordas, fiação ancorada/curva; prova visual A/B, corpo/LOS/gates e crítica independente, novo checkpoint local. FPS exclusivo/AM7 continuam pendentes.

## R3: primeira imagem e regressões demonstradas
- comparison/ tem 13 pares sobre 45e0a29f. Crítico limpo aprovou proporção residencial, vegetação e silhueta de combate; reprovou fios tracejados distantes. Cilindros são conectados por extremidades, mas diâmetro subpixel causava fragmentação: ajustado mínimo visual 4 cm, feixes longos 5 cm; aguarda recaptura.
- Runtime inicial 7/8: EV3 mostrou 22 interseções de folhas no corpo (20 na planta leste do lance superior, 2 junto à moradia do mirante). Elevadas essas prateleiras sobre as fachadas, sem excluir vegetação da régua. Node contrato/rota/fachada/map e nove checks globais passaram no primeiro candidato.
- Crítico detectou CTF/drops diferentes entre A/B por duração do boot. Arnês agora reinicia disposição real, fixa capturas neutras e limpa pings transitórios; ambos lados recebem mesmo controle, Game não foi editado. Novos recibos guardarão fixture, plantios e ramais.
- Usuário concluiu login Mint. Criados projeto zd72r64gkq3d9k3v8349cp6yt98dwvx4 e chat ph76fdb7fh3t30vzjz8ajv01xs8dx139; pack th7290wv39q83egs019b1g29vs8dwnr1, dois modelos TRIPO_P1 em geração. Prévias inspecionadas: casa e mato de fresta. Detalhes/briefs em ESCADAO-MINT-R3.md. Ainda não baixados nem integrados; não inventar licença/métricas.
- Próximo: validar corpo corrigido e continuidade dos fios/fixture A/B; baixar e auditar modelos Mint quando disponíveis; integração estritamente local, nova crítica/gates, galeria e commits.

## R3: pacote Mint recebido e candidato integrado
- Download concluído: ZIP 1.786.357 bytes em Downloads, cópia extraída/recibo em refinement-r3/mint-raw. Pro confirmado na conta; termos oficiais seção 4 (07/05/2026) consultados, origem documentada em FONTE e mint-assets. Nenhuma compra/upgrade.
- Casa4.146tris/403.196bytes (WebP1024), mato2.407tris/179.348bytes (WebP256). Simplificação limitada por erro preservou folhas e não atingiu meta700. Pipeline tools/optimize-escadao-r3.mjs. Blender5.2 renders em mint-preview-r2; primeiro render superexposto rejeitado.
- Duas casas Mint candidatas nas laterais da laje, com colisor de volume fechado e LOS pela malha real; centro conserva reboco/variação. Mato novo substitui grama reutilizada. Shared Game/loader intactos. Nova crítica visual e provas finais pendentes.
- comparison-r2/r3 cancelados por wallpapers do menu ERR_ABORTED, sem aceitar como evidência final. Arnês agora decodifica explicitamente os dois arquivos no navegador, registra dimensões e só recupera cancelamentos desses arquivos comprovados; qualquer asset de jogo ausente continua reprovando.

## R3: crítica do pacote e seleção
- comparison-mint PASS13pares; runtime-mint8/8; node-mint12/12. Casa/vasos/combate aprovados pelo crítico, fios próximos contínuos. Rejeições restantes: cabos do bar/mercearia terminavam no céu e alimentadores distantes ainda fragmentavam; mato Mint novo tinha facetas triangulares inclusive no original.
- Material sem normalmap/metallic, winding e normais recalculadas não deram qualidade suficiente ao mato novo: REJEITADO, mantido somente nos artefatos. Voltou a grama Mint existente, que a crítica inicial aprovou. Casa nova continua no mapa e no registro.
- Alimentadores/transversais candidatos agora usam linha WebGL de1pixel, sem engrossar os cabos junto às fachadas. Pontas distantes ganham postes/suportes físicos. Nova captura/corpo/crítica pendentes.

## R3: marco validado antes do checkpoint
- comparison-final13pares PASS, mesma fixture incluindo arsenalGLB completo, capturas neutras e halos de bots ocultos removidos. Metadados de fixture idênticos. Crítica independente aprova prédio, vasos, grama restaurada, terminações e continuidade dos cabos; serrilhado distante leve aceito.
- runtime-final8/8, ring-final3/3, motion-final subida/retorno no loop real PASS. node-final17/17 incluindo MAPCHECK, contrato/rotas/fachada, integridade/Khronos, grafite e checks compartilhados. Todos usam fonte atual; GPU/FPS pendente, faunaAM7 herdada sem alterações.
- Galeria atualizada para baseline45e0a29f,13pares, zero divergência de câmera; carregada no painel e selecionadaRua. Versão R2 anterior preservada como gallery-r2.html.
- Próximo: finalizar13mutantes, docs/build, recibo de evidências e checkpoint final.

## R3: fechamento local
- Implementação recuperável em `e0be5162`, branch `codex/escadao-visual`; builder final `4d71b860` e layout `0223f92b`. Casa Mint integrada; mato novo rejeitado e preservado só nos artefatos, grama do acervo mantida.
- Concluídos 13/13 mutantes causais, além dos 17/17 checks locais, corpo 8/8, anéis 3/3, 13 pares A/B e subida/retorno com 875 posições finitas. Build aprovado; documentação gerada atualizada para o acervo e fonte desta rodada.
- DOCS1, ARCH1 e COMENTARIO aprovados no fechamento; recibo `refinement-r3/closing-checks.json`. Bloco de autoria é derivável após merge, conforme saída de `docs:check`, e não foi declarado validado nesta branch.
- Relatório de entrega: `docs/reports/ESCADAO-RUA-VEGETACAO-R3.md`. Recibos, vídeo, crítica e custos em `artifacts/escadao-visual/refinement-r3/`; galeria continua em `http://127.0.0.1:58555/gallery.html` com a vista Rua selecionada.
- Próxima etapa: avaliação visual do usuário, janela exclusiva de GPU para FPS, orçamento AM7 herdado e integração do PR. Custo geométrico aumentou; não há aprovação de performance. Sem push, merge, deploy ou edição de outra worktree.

## Retomada: teste sobre main e menu Astro
- Relato do usuário: "ESTA desatualizada com a main e nao da pra testar". A porta 8148 era o servidor parcial de avaliação; HTML contém uma ocorrência literal de FACTIONS.map e String(index + 1). Não basta HTTP 200.
- Main consultada: 69555790 (alpha.223), 317 commits ausentes na branch. Merge simulado teria 47 conflitos. Preservar codex/escadao-visual e montar codex/escadao-main na mesma worktree a partir da main, portando somente Escadão e dependências necessárias.
- Objetivo integral preservado: mapa R3 aceito tecnicamente, agora utilizável pelo menu real; revisar runtime após integração. Evidências antigas permanecem históricas; FPS e AM7 seguem pendentes.

## Preview da seleção e nova rodada R4 (06/09/2026)
- Branch atual codex/escadao-main, base main69555790; integração/menu real documentados em ESCADAO-MAIN-SYNC.md, checkpoint anterior c6d2cc97. Original codex/escadao-visual preservada. Servidor Astro8148 é a referência; galeria58555 é histórica R3.
- Preview da seleção: JPG atual e WebM6s,640×480,24fps sem áudio gerados do builder/GLBs reais. Manifesto por hash, script capture-escadao-preview.mjs. Primeira câmera sob laje rejeitada; pose da subida corrigida.
- Réguas do hover: RED sem vídeo, GREEN com frames reais, sem download inicial, hover/foco/blur, desmontagem ao trocar tela/render, movimento reduzido, falha de mídia com poster, toque em tablet1024×768. Crítico aprovou enquadramento; losango coberto no hover corrigido com z-index. Artefatos hover-preview/. Celular baixo844×390 tem sobreposição de controles herdada; não aprovado nesse viewport.
- Nova solicitação R4: fotos04.07–04.09 mostram pisos desaparecendo por baixo, props aparentemente flutuantes, becos bloqueados e gato cúbico. Usuário mantém jogabilidade como direção, pede escadas mais íngremes, becos funcionais, casa frontal entrável com janela para atirar, ambientação/modelos Mint melhores. Isso reabre aprovação do mapa; R3 não representa aceitação final.
- Causa confirmada: topo é PlaneGeometry FrontSide sem espessura nem oclusão. Agente escadao_structure_audit implementa teste causal/fechamento e espelho .21 mantendoXZ; root cuida preview/casa/ambiente/Mint. Novos modelos gato/varanda/medidor pedidos no projeto Mint existente, ainda não recebidos nem aprovados.
- Próximo: checkpoint do preview independente, volume/corpo/rotas/interior, auditar novos assets e integrar, provas browser pelas posições das fotos + navegação/tiros/bots, crítica limpa e recapturar preview com mapaR4 final. FPS exclusivo/AM7 continuam pendentes; sem push/deploy.

## R4 — estrutura e movimento validados (candidato local)
- Branch codex/escadao-main, base main69555790, último checkpoint846006ef (previewR3). Agora espelho0,21/piso0,29, inclinação35,9°, topo7,56m; massa sólida sob topo e84degraus fecha visão por baixo. Casa frontal com acesso lateral, peitoril e janela voltada à conexão leste do primeiro patamar.
- Corpo real runtime-r3: EV0–EV7 passam,140/140séries,12/12subidas/retornos,headHits0/sem piso0/varalHits0,134visitas com retorno. Primeiro candidato tinha193headHits/58semapoio/144varalHits; varais e plantas reposicionados, margem de colisão de beirais corrigida. Snap-down opt-in Escadão resolve descida sem alterar saltos/quedas reais; RED/mutante preservados emr4/node.
- Grafo394/394,oitoDeagle,rotas8/8,0/943LOS alto→spawn. HOME250posições; crítico independente inspecionou566arestas próximas,zeroatalhos por quina/elevação. Janela tem LOS6,51m para alvo jogável(6,15;2,52;9), com alcance viaA*. Mutante porta-fechada reprova entrada.
- MintR4 final: gato4723tris/843748bytes,19ossos,idle4s/walk0,6s/run0,4s,altura0,48m e velocidades0,55/1,5m/s; varanda4453tris; medidor3470tris. Khronoszeroerros; pipeline/renders/recibos emr4/assets. Caminhada inicial com perna excessivamente esticada rejeitada. FONTE/registro preparados. No browser-r2, GLBs carregam, movimento249posições e tiro real pela janela passam; gato usa clipsdistintos e reage a tiro.
- Capturas browser-r2 REJEITADAS: update pausado também suspendia render e todas mostravam frame do spawn. Instrumento agora força render após mudar câmera e verifica avanço do renderer; browser-r3 em andamento. Não usar r2 como evidência visual.
- MAP3 conserva vermelho de norma Blondel com a escada íngreme pedida; MAP1 restante é fauna dinâmica no instrumento antigo; MAP5 mede falhas herdadas e deslocamento da mediana, sem perda dos props nos quadrantes afetados. Diagnóstico emr4/node/README.md. Sem afrouxar limites nem acrescentar cobertura só para satisfazer quociente.
- Próximo: crítica limpa dos frames efetivamente renderizados, corrigir achados, renovar grafite/preview, finalizar gates/build/docs e checkpoints. AM7/FPS exclusivo ainda não aprovados; sempush/merge/deploy.

## R4 — fechamento visual e autorização de integração
- Checkpoint dos três GLBs Mint em f5180537. runtime-delivery EV0–EV7 e ring-delivery ER0–ER2 passam; browser-delivery tem249posições, tiro real, gato animado e12capturas renderizadas. Crítica limpa confirmou piso, janela sem grafite/vidro ambíguo e sequência de retorno do beco. Interior ainda simples.
- node-final13/13, build e closing-checks4/4(DOCS/ARCH/media/grafite) passaram. PreviewR4 tem vídeo6s/24fps, hover real e procedência por hashes; mutante preview-antigo reprova. Comparison-delivery13pares passou contra846006ef com motor compartilhado atual e contadores de menu locais. Primeira tentativa falhou por telemetria remota indisponível; não é evidência aceita.
- Novo pedido explícito do usuário: adicionar ratos/baratas, terminar, atualizar com main, resolver conflitos/build e fazer merge. Autorização de push/PR/merge agora concedida; não editar outros checkouts.
- Acrescentado um rato e uma barata próximos à escada lateral da casa, total3de cada, usando GLBs existentes. Caminhos testados no corpo real sem bloqueio; prova de carregamento/movimento acrescentada ao navegador.
- origin/main avançou para a551204f(alpha.224), dois commits desde69555790. Próximo: checkpoint local do núcleo; merge da main nesta branch, resolver/regenerar docs, finalizar fauna/preview/movimento/build e integrar via PR. FPS exclusivo/AM7 permanecem limites explícitos.

## R4 — revisão antes do merge e correções causais
- Main integrada em5a6da9cf: conflitos apenas emdocsgeradas/package; scripts de ambasasfrentes preservados. Build-main passou, node-main8/8 e deploy-main37/37.
- Crítico limpo encontrou142arestas impossíveis, guarda de branch que impedia gateapósmerge e proveniência de preview sem verificar HTTP. Corrigidos os três; validação positiva e mutantes em fechamento.
- Navegação final453/453nós e zeroarestas impossíveis. Beco oeste ganha vão1,10m, recuo dianteiro e pneus fora da passagem; leste tem ligação exterior física. Fundação fecha vaziossemacesso e piso doCTF E conecta aoauxiliar a5,04m. Regresso da queda pela bordasul reproduzido e resolvido comguarda; mutante semguarda cai. Crítico independente confirmou caminhada/retorno/guardas e não encontrou novo bloqueador Node.
- Fontes congeladas para runtime/browser/preview-release. browser-main comprovou3ratos/3baratas carregados e móveis; motion-main1100posições reais. Relatório ESCADAO-R4-CIRCULACAO.md distingue esses estágios da geometria final.
- Próximo: evidênciafinal, checks/build apósúltimosajustes, push/PR/CI/merge autorizado. FPSexclusivo/AM7 seguem limitações explícitas, sem reduzir tetos.

## R4 — evidência final antes do PR
- Núcleo revisado em b310a9d4. runtime-final EV0–EV7 passa:140séries,12/12escadas,0headHits/0sem piso,67destinosporlado comretorno,0LOSspawn. browser-final-merge PASS249posições e15capturas,3ratos/3baratas e gatoMintcarregados. Crítico visual não encontrou novosbloqueadores nasvistaspatamar2/becooeste/fauna/casafrontal.
- Previewfinal JPG42.881bytes/WebM232.305bytes6s; hashesHTTP dosarquivosservidosverificados, hover-finalPASS. Fonte divergente ainda terá mutante executado antesdoPR.
- Node-release9/9 e build-releasePASS; guardamutantreproduzqueda. Novo pisoP2 eguardas passam no críticofísico; grafo453/453 ealcance32/32zonas, saídaoestediretapassa.
- origin/main avançou durantevalidação para971342e4(alpha.225). Próximo: incorporar atualizaçãooperacional/menu, regenchecks/docs, fecharA/B+mutanteproveniência, pushPR e CI/mergeautorizado.

## Integração PR515 e main alpha.226
- PR autorizado: https://github.com/corosolto/client/pull/515, branch codex/escadao-main. Main225 incorporada em67b09f03; preview-build, portão browser e smoke CI passaram. Vercel falhou por pack privado com13soundscapes semEscadão; correção683ac582 reutiliza Quebrada, preserva override curado e passa RED/GREEN do assets-check real. Revisão independente aprovada.
- Main avançou2786fa48(alpha.226) comLajes. Conflitos de áudio resolvidos mantendo os dois adaptadores; controles de preview mantidos em módulos separados para preservar testes/lifecycle de cada implementação. Metadata Mint e scripts de ambas frentes preservados; docs regeneradas.
- CI pr-fast também revelou CTF2: rotas separadas insuficientes para quatro pares. Investigação causal em andamento; não afrouxar limite nem recolocar arestas impossíveis. Próximo: corrigir CTF2, validar integração/preview/build, publicar e concluir merge com CI. FPS exclusivo e AM7 permanecem pendentes.

## CTF2 e fechamento da integração alpha.226
- Main integrada em92b68d3f. Build-main226PASS; gates Escadão/Lajes9/9 e áudio integradoPASS (fetch real com fixture, cache e unzip). Crítico independente confirmou scripts, previews e comportamento de ambas as frentes preservados. Hover-main226PASS.
- CTF2: predicado do grafo ignorava somente15cm, enquanto colisão real permite30cm; isso cortava a chegada dos dois becos. Alinhado intervalo vertical à física (1,5m/0,3m), sem alterar separação6m nem raio0,38m. Agora453nós/5012arestas, nenhuma inválida, todas as combinações com≥2rotas; crítico validou quatro travessias reais em24frames cada. Mutante restaura15cm e reprova.
- Preview recapturado após hash do builder mudar, embora geometria seja a mesma; origemHTTP verificada. Ainda faltam os checks remotos do novoHEAD e merge. FPSexclusivo/AM7 continuam pendentes.

## Entrega integrada — PR515
- PR515 MERGED em06/09/2026 05:25:11UTC, commit329ef838414929cebeff44af199c442474de8abb, confirmado emorigin/main. Conteúdo final revisadoe5dfd672; todos os checks remotos aplicáveis passaram, incluindo pr-fast34013462652, portão browser34013462665, smoke34013462711 e preview-build34013462650.
- Vercel dpl_7NL5BohhSkYQPWeFLypK11wQV8GY READY parae5dfd672. HTTP200 autenticado no site/manifest/mapa/JPG/WebM; builder e mídia idênticos ao checkout; manifesto com15soundscapes incluindoEscadão eLajes. Recibos emr4/vercel-http.json erelease-candidate.json.
- 3ratos/3baratas integrados. Casa/janela/becos/estrutura/gatoMint/preview concluídos e recuperáveis emGit. Servidor Astro8148 disponível; galeria58555 continua histórica. Nenhum outro checkout alterado.
- Limites mantidos: FPS exclusivo eAM7 não aprovados. O agregado local de invariantes terminou semfalha nova, mas map_check.json permaneceu comtimestamp28/08 após a tentativa completa; NÃO serve como medição nova doEscadão. A evidência atual de circulação/CTF2 é o gate explícito escadao-graph (453/5012/todospares≥2), mais runtime e revisão física. Essa limitação do agregador merece correção separada.
- Próximo: nenhuma implementação ou merge pendente desta entrega; somente avaliação de desempenho em janela exclusiva, já registrada como limite. Este marco documental fica emcheckpoint local após o merge.

## R5 — novo relato após merge515
- Objetivo reaberto: conectar lateral sem destino, tornar utilizáveis os vãos aparentes sob a escada/conexões e acrescentar horizonte de morro/bairro, preservando o flow aceito. Branchcodex/escadao-passagens-horizonte, derivada do checkpoint681ef523; mainf7f4402e(alpha.227) integrada. Não editar outro checkout.
- Definição de pronto: reproduzir entradas bloqueadas antes da mudança; caminhada real nos dois níveis e retorno; grafo sem atalhos verticais, CTF2 e casa preservados; horizonte comparado no browser e custo medido; preview atualizado, gates/build e revisão independente. Autorização de trabalho/integração persiste; não há aprovação nova deFPS.
- Hipótese confirmada parcialmente: lajeP1 tem vão de2,40m, mas groundHeightAt ignora yRef e trata o piso superior como único chão. Laterais exteriores terminam no muro do topo. Próximo: mapear percurso real e baseline visual; usuário foi consultado sobre o lado específico.

## PAUSADO pela coordenação — R5 em 06/09/2026
- Pedido de pausa recebido da tarefa coordenadora “Preparar frente Snipers e Precisão”: não iniciar novas melhorias/render/testes e aguardar despacho. Objetivo completo e autorização anterior preservados; nada de R5 foi publicado ou mergeado. Produção permanece na entrega PR515.
- Worktree exclusiva `/Users/ruben/csbrasil/worktrees/escadao-visual`, branch `codex/escadao-passagens-horizonte`, base anterior ao checkpointWIP `006e8bef` (merge da mainf7f4402e/alpha.227). O commit desta seção é o checkpoint recuperável; não representa aprovação.
- Arquivos da rodada: KNOWN-BUGS.md; este ledger; public/js/map_escadao.js; novo public/js/map_escadao_contour.js; tools/eval/escadao-graph-check.mjs; novos tools/eval/escadao-passages-check.mjs, escadao-contour-check.mjs e escadao-r5-browser.mjs. Nenhum arquivo alheio incluído.
- Diagnóstico confirmado por crítico independente: vão livre de2,40m sobP1/conexões bloqueado por groundHeightAt semyRef; extremos laterais acabam na contenção do topo. Bases dospuxadinhos tinham malha semcolisão. Horizonte norte capturado sócomcéu e muros próximos.
- Implementação parcial: térreo delimitado às lajes reais, mantendo fundações doslances; bases dospuxadinhos agora colidem; nóscomy/nearestWaypoint ciente de altura e opt-in layeredNavigation. Duasescadasdecontorno emx±16,4,width2,2,z4,5→−5,44,n36,topo7,56,instanciadas; guardastopo recortadas. Início4,5 escolhido para folga de pulo sob sobradooeste. Ainda não aprovado visualmente.

## R5 — retomada de contratos e horizonte (aguarda crítica visual)
- O falso negativo das duas arestas em `x=-12` foi reproduzido: a amostragem IEEE-754 chegava em `-1.9599999999999995`, enquanto o nó real é `-1.96`, na fronteira patamar/degrau. A régua agora amostra o nó final canônico; não houve afrouxamento de corpo, colisão ou limite de passo. `escadao-graph-check` passa com 600/600 nós e oito rotas para a Deagle.
- Adicionado `map_escadao_horizon.js`: morro contínuo (3.840 triângulos) e 64 casas distantes, todos sem colisão/occluder/rota. `escadao-horizon-check` confirma presença, relevo e ausência de superfície sólida; o mutante sem-horizonte falha como esperado.
- Regressões verdes: passagem inferior 1.115 posições ida/volta e camadas separadas; duas laterais 740 posições, ida/retorno/pulo livres; contratos Escadão e mapa global passam. Mutantes sem-térreo, sem-contorno e sem-conexão retornam vermelho.
- Documentação regenerada e `DOCS1`/`ARCH1` passam. `npm run build` também passa em alpha.227 (aviso herdado: Node local 23, runtime Vercel 24). Ainda falta crítica independente e captura browser comparável; não iniciar browser/servidor até a autorização da coordenação. Nenhum push, PR, merge ou deploy nesta retomada.
- Aceitos: baseline browser8capturas emr5/before; passages-red reproduz travamento em(-6,0,10,54), passages-greenPASS1115posições de ida/volta térrea, laje e camadas distintas, raycast semmalha nocaminho. contour-red reproduz lateral semdestino; contour-greenPASS740posições, duas subidas/descidas e pulo emz1 semcolisão no centrodocorpo.
- Rejeitado/pendente: graph-first acusa236arestas por medir somente altura superior; régua adaptada às camadas mede8844arestas e ainda diverge em2arestas duplicadas AUX: de(-12,5,04,1,84) para(-12,5,145,-1,96). Diferença final0,105m na fronteira do lance; determinar se é arredondamento do endpoint da régua ou erro do grafo/altura, sem afrouxarcritério. Não afirmar grafo final aprovado.
- Horizonte NÃO implementado. Referência localizada: public/js/lajes_sky.js:addLajesBackdrop (morros emmalhaúnica) e sky_rj existente. Direção: morros/casario distante fora doslimites, comcusto medido e comparação dosframesnorte/sul, preservandovisadaseflow.
- Próximo marco após despacho: resolver2divergênciasdo grafo; provar mutantes sem-térreo/contorno; validar bots/layers e travessias superiores/casa/CTF2; medir cabeça emraio0,38sobbeirais e capturar novaspassagens; implementarhorizonte; críticoA/B; atualizar preview/proveniência/scriptsCI/docs/build. Nenhuma bateria global iniciada nesta rodada; FPS exclusivo/AM7 seguemlimites herdados.
- Artefatos: artifacts/escadao-visual/r5/{before,before.log,passages-red.log,passages-green.log,passages/trace.json,contour-red.log,contour-green.log,contour/trace.json,graph-first.log,graph-layered.log,physical-edges-paused.json,separated-routes-paused.json}. Não usar main-sync/graph/graph.json como estadoR5: pode conter mediçãoR4 antiga.
- Recursos: nenhuma captura/teste/worker próprio rodando; crítico foi avisado da pausa. AstroPID94385 e shell94358 continuam servindo8148 para a aba do usuário; conteúdo é WIPR5. Não encerrar browser/servidor de outra frente. Nenhuma automação própria criada. A pergunta assíncrona sobre qual lateral ainda estava semresposta na pausa.

### Janela de redistribuição da coordenação
- Pausa é transição, não abandono. Meta informada pelo dono: concluir todas as frentes abertas até07/09 por volta de06:55Lisboa. Aguardar despacho antes de retomar produção.
- Estimativa desta frente:45–90min para resolver/validar grafo emcamadas, mutantes e regressões imediatas;2–4h para candidatoR5 completo com horizonte, navegador/A-B, crítica, preview e build, excluindo fila deCI/revisão. Base da estimativa: caminho inferior econtorno já passam gatesdedicados; restam duas divergências pontuais e uma entrega visual ainda não iniciada. Não é promessa de prazo.
- Candidato pronto para revisão final: NÃO. Bloqueios de entrega: grafo ainda não aprovado; cabeça/colisão precisam prova espacial/browser comGLBs; horizonte inexistente; preview atual correspondeàR4; documentação/CI/build ainda não atualizados. Terra pode concluir implementação e gates; Astra agrega na crítica visual e, se necessário, diagnóstico do contrato entre camadas. Nenhum worker reiniciado.
