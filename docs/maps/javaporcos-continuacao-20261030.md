# Continuação — Javaporcos, 30/10/2026

## Objetivo e aceite

Executar na ordem os sete pedidos do prompt da raiz
`PROMPT-CODEX-JAVAPORCOS-2026-10-30.md`: passada sem patinar;
gravações reais de porco; lojas reviradas contando para domínio;
pasto/mata maiores; AK47 com material correto em primeira pessoa;
time Javaporcos e wallpapers rotativos; introdução da praga pulável.
Concluir cada mudança com régua que reprove antes, mutante, A/B medido,
verificação visual no jogo real e commit por assunto. Manter tudo no PR #1160.

## Estado verificado

- Worktree `worktrees/modo-javalis-20261028`, branch `v2/invasao-javaporcos`.
- HEAD inicial `c2076a5e7524d4143f67dc57716961075e84aaee`.
- Rodada 5 presente no histórico: iluminação, rodapé, lâmpada, cupinzeiro e lixo.
- `node tools/eval/javaporcos-mapa-check.mjs` passou integralmente neste HEAD.
- Link privado de viewmodels presente. `worktrees/` não rastreado é preexistente.
- Pedido 1 validado localmente: rig procedural por indivíduo, com geometria de pesos
  compartilhada por modelo e quatro fases; apoio fica ancorado no mundo e consulta
  o chão. Descarte de corpos libera skeleton/boneTexture, sem descartar material
  ou geometria compartilhados. Ver marcos dos pedidos 2 e 3 abaixo; 4–7 seguem pendentes.

## Push concluído

O dono autorizou enviar os commits existentes. A primeira tentativa foi bloqueada
pelo hook: scripts npm selecionaram Node antigo apesar de `node -v` indicar 26.
`eval:apis` falhou por ausência de `stripTypeScriptTypes`; passou ao executar com
`PATH=/opt/homebrew/bin:$PATH`. Segunda tentativa: 80/81 portões passaram;
somente `eval:redesign` falhou, por âncoras antigas em UIR16/UIR32 que ignoravam o
wallpaper fixo do mapa. Corrigida a âncora e o mutante correspondente, sem mudar
runtime. Baseline passou; mutantes `loading-sem-wallpaper`, `loading-uma-faccao`
e `loading-wall-cover-unico` fizeram as invariantes esperadas ficarem vermelhas.
Revisão independente do diff local: sem achados. Correção em `4acda7bf2`.
Terceira tentativa: 81/81 portões passaram (359,8 s); push retornou zero.
`git ls-remote` confirmou `4acda7bf2257842b1e4aa03d7e0f2cc679f77064` no remoto.
Os commits existentes e a correção da régua foram enviados, sem pular hooks.
Relatório completo da segunda tentativa preservado em
`/tmp/javaporcos-prepush-node26-20261030.log` (temporário, fora do Git).
O primeiro hook regravou `tools/eval/map_check.json`; somente essa alteração gerada
foi restaurada, pois a árvore estava limpa antes da execução.
`eval:javaporcoswall` passou no navegador com BASE=http://localhost:4321 e browser
lock: JW1 arte do modo, JW2 rotação normal em outro mapa, JW3 HTTP 200 image/webp.
Servidor preexistente PID 35025 pertence a esta worktree (cwd confirmado); HTTP 200.
Captura 3:2 de diagnóstico concluída, saída em
`/tmp/javaporcos-evidence-20261030/`. Os quatro GLBs de fauna têm uma única malha,
sem skins ou animações; não confundir a oscilação do corpo com uma passada.

## Pedido 1 — evidência e decisões locais

Fonte geométrica: os quatro GLBs de `public/models/enemies/javaporcos/`, hashes no
`asset-manifest.json` ao lado. Pesos e amplitude usam a altura e distância entre
patas do próprio GLB; a fórmula vive em `public/js/javaporcos_passada.js`.
São parâmetros visuais do rig, sem alterar velocidade, dano ou cadência da horda.
A fase avança por distância percorrida, não por relógio.

Régua: executar `tools/eval/javaporcos-passada-check.mjs` com Node, BASE explícito
e `tools/eval/with-browser-lock.sh`. `TYPE` seleciona jovem/adulto/matriarca/
ariete; `STEP` escolhe deslocamento por quadro da sonda, sem mudar o jogo;
`OUT`, `--fotos` e `--perf` preservam artefatos. A tolerância numérica da régua verifica
contato e invariância do pé sob transformações de ponto flutuante, não autoriza
deslizamento perceptível. Duas patas precisam tocar o terreno e ficar imóveis em
todos os quadros medidos; o primeiro quadro de inicialização não é amostrado.

- Antes: 0/240 quadros; deslocamento dos pés/corpo = 1.000000.
- Primeira passada: rejeitada por esticar pernas nas fotos. Amplitude foi reduzida.
- Primeira régua: rejeitada na revisão porque ignorava altura do pé e parada.
- Jovem com régua reforçada: 240/240, razão 0.000000; parar não desloca XZ dos pés,
  patas suspensas acomodam no chão e retomada passou 120/120 quadros.
- Mutante `apoio-no-ar`: 0/240 e retomada 0/120; detecta falso apoio suspenso.
- `eval:javaporcos` e `eval:javaporcosperf` passaram com seus mutantes.
- Matriz reforçada dos quatro modelos: cada um passou 240/240 em movimento,
  parada sem deslocamento XZ, acomodação no chão e 120/120 na retomada.
- Sondas com passo menor e maior também passaram. Ensaio atualizado com 64 rigs
  reais: mediana ~0,1 ms e p95 ~0,2 ms, tanto rígido como animado, na resolução
  do relógio do navegador. Mede CPU da apresentação, não FPS completo do mapa.
- Mutante final `patina`: 0/240 e retomada 0/120; `apoio-no-ar` também reprovou.
- Sintaxe ES modules, comentários, grafo de módulos, docs e arquitetura passaram.
- Comando npm novo: `BASE=http://localhost:4321 npm run eval:javaporcospassada`;
  inclui baseline e ambos os mutantes sob um único lock de navegador.
- Revisão independente das duas correções: sem novos achados; não é aprovação
  visual humana nem revisão completa do PR.
- AK: área preta foi reproduzida no canvas, inclusive sem banner. Ocultar o root
  do viewmodel elimina a área preta. Diagnóstico do passe VM pendente no pedido 5.

Artefatos duráveis fora do Git: `artifacts/javaporcos-codex-20261030/`, com fotos,
JSON e logs selecionados; `manifest.json` contém tamanho e SHA-256 por arquivo.
Os resultados técnicos não equivalem a aprovação visual humana. Checkpoint do
pedido 1 pode ser encontrado por `git log -1 -- public/js/javaporcos_passada.js`.
Próximo: iniciar gravações reais de porco (pedido 2); pedidos 3–7 seguem pendentes.

## Pedido 2 — gravações reais

Grunhido CC0 de egomassive/Felix Blume e guincho CC0 de Jarred Gibb, com
proveniência em `public/audio/javaporcos/FONTE.md` e catálogo/hash único em
`public/js/data/javaporcos_audio.js`. Instalador reproduzível chamado pelo fetch
normal do áudio; nenhum binário é commitado. Não usa síntese como fallback.

- DSP anterior: rosnado/carga/morte/horda continham osciladores; fuçar ausente.
- DSP novo: cinco vozes usam buffers decodificados reais, zero osciladores;
  picos observados 0,31–0,80; mix de 32 pedidos ficou em 0,816 (4 aceitos pelo orçamento).
- Mutantes `sintetico` e `sem-gravacao` reprovam as seis medições.
- Régua de grafo de áudio e seus mutantes passaram; modo e seus mutantes passaram.
- Revisão encontrou e corrigiu falha do preload encurtando a barreira de assets e
  ausência de grunhido nos clientes MP. Nova cláusula integrada verifica som no
  cliente, intervalo e ausência de movimento da IA; `cliente-mudo` reprova.
- Segunda revisão somente leitura: sem novos achados.
- Comentários, grafo de módulos, docs e arquitetura passaram.
- `BASE=... npm run eval:javaporcosreal` mede DSP e integração MP com mutantes;
  execução completa final passou (log `audio/javaporcos-audio-real-wrapper-final.log`).
- Partida real: ambos os buffers carregados (1,3583 s e 1,9656 s); Sfx do jogo
  aceitou grunhido. A primeira sonda sem ANGLE Metal travou; a repetição Metal
  mediu corretamente e travou apenas ao fechar, encerrada após salvar o resultado.
- Aceite auditivo humano pendente.

## Pedido 3 — lojas

Seis comércios reais: armazém, farmácia, mercadinho, padaria, açougue e bar.
Duas casas deram lugar a farmácia/açougue; a casa de ração é o armazém.
Cada comércio tem estoque alcançável, porta corrugada com material já existente e
estados intacto/revirado. O primeiro golpe parte de fora do vão; depois o bicho
pode avançar ao estoque. Saquear todas as lojas de um setor equivale a conquistá-lo,
proporcionalmente ao HP consumido e à quantidade de lojas no setor; o defensor
pode retomar normalmente. Danos, intervalos e demais números existentes preservados.

- Antes: nenhuma das seis lojas tinha o contrato de saque completo; régua vermelha.
- Depois: seis pontos alcançáveis, consumo, estados, domínio e reset/rede verdes.
- NAV1: 6 nós presos na primeira tentativa; corrigidos movendo estoque para o lado
  da costura de navegação. Agora 0 presos/0 arestas cruzando, 6.221 nós/11.171 arestas.
- TRILHA2: seis interiores alcançados das três entradas; mapa completo verde.
- Primeira porta rejeitada: fora da fachada e caída cobrindo o vão. Corrigida para
  posição real do vão e queda quase horizontal ao lado; fotos inspecionadas.
- A suspeita de porta invisível bloqueando tiros foi rejeitada: o wrapper real
  `shot_surfaces.js` já protege visibilidade ancestral. A sincronização explícita
  continua necessária para inserir os occluders do estado revirado após o build.
- Mutantes: loja-muda, loja-intacta, saque-sem-dominio, porta-fora,
  revirado-sem-oclusao e atravessa-porta. Não confundir saída 0 do mutante detectado
  com aprovação do comportamento quebrado.
- Fotos 3:2 de três lojas, antes/depois; nas vistas medidas 626–794 chamadas e
  1,56–1,85 M triângulos. Não substitui pior vista global nem aprovação humana.
- Artefatos temporários `/tmp/javaporcos-lojas-visual/` e logs com prefixo
  `/tmp/javaporcos-lojas-`; preservar em `artifacts/javaporcos-codex-20261030/lojas`.
- Contrato de mapa, grafo de módulos, docs, arquitetura e comentários verdes.
  Revisão final sem achados após cobrir o callsite de arrombamento no updateBot.
  Portão inicialmente reprovou apenas o insumo map_check desatualizado; a nova
  medição física final passou: zero corpo dentro/penetração, folga 1,9 m e área
  contígua 53,2 m², zero occluder sem malha entre 498 medidos. Os outros 18 mapas
  foram fundidos de volta sem mudar seus resultados. Portão final verde: apenas
  duas dívidas COB2 já declaradas, nenhum vermelho novo. Checkpoint 2362bb011.

## Restrições e próximo passo

Não ler `.env`, não usar assets NC, não pular hooks, não fazer force push.
Não alterar números de game feel sem o dono. Uma captura de browser por vez,
com lock e BASE explícito. Manter budgets e preservar demais mapas em map_check.
Push dos commits anteriores confirmado em 4acda7bf2; checkpoints locais posteriores
130846748 e fa1fc3c35 ainda não publicados. Objetivo permanece os sete pedidos.
Áudio no checkpoint aab9e5237. Checkpoint das lojas por `git log -1 -- tools/eval/javaporcos-lojas-check.mjs`; depois pasto (4), AK (5),
time/wallpapers (6) e intro (7), nessa ordem.
Verificar pacotes Mint antes de gerar novamente; Sketchfab depende de token
fornecido por ambiente, sem expor ou registrar seu valor.

Sonda preparatória do pedido 4: campo real atual 7,47 m, 940 árvores. Protótipo
54/68 apenas no navegador, sem modificar o mapa: repetir orçamento com
`atualizaCortes` real, pois a primeira sonda manual omitiu esse passo.


## Pedido 4 — ampliação em validação (não concluído)

Arena ±68, cidade ±36, mata começa em 54: campo real 17,86 m, profundidade de
mata 14,14 m, 1.056 árvores (antes 7,47 m/940 árvores). Três bocas preservadas;
MATA1/2/3, NAV1, TRILHA1/2, PASTO1/2 passam no protótipo ampliado. Nova régua
`javaporcos-pasto-grande-check.mjs` reprova original e mutante pasto-curto.

- Protótipo apenas com dimensões estourava triângulos: centro 2.345.283.
- Redução uniforme da malha reprovou CHAO1: 0,43 m acima do campo no aterro.
- Revisor identificou cegueira de CHAO1 para solo abaixo dos pés. Nova régua mede
  erro absoluto e tem mutante terreno-afundado; detectou 0,478 m na mata com malha2m.
- Ajuste atual: física sempre 0,5 m; mata visual 1 m; cidade plana 2 m; pasto 2 m,
  córrego 1 m e borda de aterro 0,5 m. A diagonal segue o vinco x=z: erro máximo
  caiu de 0,346 m para 0,150 m. Mapa completo e revisão final passaram.
- Sondas iniciais de GPU variaram com armas/atores assíncronos (até 1.033 chamadas)
  e memória antes de estabilizar. A/B final esperou 6 s e GC por CDP: antes
  916/994/520 chamadas, 2,197/2,106/1,372 M tris, heap 238 MB; depois
  868/953/485 chamadas, 2,290/2,242/1,558 M tris, heap 241 MB. Materiais 99.
  Três vistas medidas dentro dos tetos; não equivale a aprovação humana.
- Scripts/logs temporários `/tmp/javaporcos-pasto-*`; fotos3:2 campo ampliado.
  Preservar artefatos e fazer map-check POR ÚLTIMO ao encerrar a fase4.

Próximo passo exato: aguardar map-check final (sessão 2499), fundir outros 18 mapas,
rodar portão fresco, preservar logs finais e fazer checkpoint 4.
Mutantes de campo curto, afundamento, diagonal antiga, mata-avanca, rota-no-muro,
boca-aberta e chao-constante detectados. Comentários, módulos, docs e arquitetura verdes.
Depois investigar AK por pixels/geometria: IBL shader já passa nos dois mapas,
portanto não alterar luz sem diagnóstico. Pedidos5/6/7 continuam obrigatórios.


Revisão de PR somente leitura: remoto4acda7bf2 tem0reviews/0threads e nenhum
comentário CodeRabbit acionável (8comentários gerais auditados com paginação).
Resumo `/tmp/pr1160-review-summary.json`. CI remoto tem falhas classify/invariantes/build,
causas ainda não investigadas; não declarar PR pronto nem revisão do HEAD local.


Sonda somente leitura da AK confirmou causa específica: com tampa de manga padrão,
retângulo preto cobre o centro; com `mangatampa=0`, AK e braços aparecem corretos.
Fotos `/tmp/javaporcos-ak-cap-true.png` e `-false.png`, meshes em
`/tmp/javaporcos-ak-diagnostico.log`. IBL não é causa. Próxima fase5 deve corrigir
`capSleeveOpenings` preservando mangas fechadas, sem esconder braço nem mudar luz.
Ainda não há correção5. Não alterar Game antes do checkpoint4.


Fechamento da geometria4: mapa completo verde, revisão sem achados e GPU A/B verde.
CI revelou VM14 real: SVD do armário norte a1,13m do chão alcançável, espremida
entre carros. Primeiro carro norte/oeste avançou de z−10,9 para−9,9, preservando
quantidade/modelo e liberando a passagem: 38/38 pickups alcançáveis depois.
Mutante carro-no-armario restaura o colisor antigo e remonta o armário.
Checagem física anterior interrompida por essa alteração legítima de geometria;
repetição final em `/tmp/javaporcos-pasto-mapcheck-carro-final.log` (sessão25243).
Relatórios pickup/map_check precisam fundir os outros mapas após executar.
Checkpoint da geometria será feito com esta pendência explícita; a sonda5 não
altera física/mapas e pode prosseguir enquanto a medição física longa termina.


## Pedido 5 — AK corrigida localmente

`capSleeveOpenings` copia atributos normalizados pelos acessores para Float32,
preservando valores decodificados e índices de ossos. Manga permanece fechada em
duas bocas e visível; luz, pose e asset privado não mudam. Antes: ROI do frame
final 100% preta; depois: 0,251% em Javaporcos e 0% na Praça dos Poderes.
Não confundir máscara direta vmScene (falso verde) com o frame real com pós.

- Nova `eval:akmangagpu`: exige pós ativo, vmPass real, AK, duas tampas e manga visível.
- Mutantes quantizacao-antiga: 100% preto em ambos os mapas; manga-oculta: visiblefalse;
  sem-pos: postfalse apesar pixels limpos. Todos detectados, processos encerraram0.
- MT1–MT8 CPU verdes; MT8 erro máximo2,94e-9 na posição decodificada. tampa-crua
  reprova tamanho, pesos e posição. IBL, módulos, comentários, docs e arquitetura verdes.
- Revisão crítica sem achado na implementação; falso verde de pipeline da régua corrigido.
- Headless às vezes trava ao fechar no Mac. Régua agora usa launchServer com prazo
  de fechamento e encerra somente o processo que criou. Nenhum browser do dono tocado.
- Fotos/scripts/logs em `artifacts/javaporcos-codex-20261030/ak/`, com manifest de hashes.
  Referência e reprodução em `docs/viewmodels/ak-manga-quantizada-20261030.md`.

Continuar pelos pedidos6 e7. Relatório físico4 ainda roda na sessão25243; fundir
18mapas de `/tmp/javaporcos-pasto-map-check-original.json` ao terminar e rodar portão.
Pickupfinal já fundiu19mapas, todos38deste mapa alcançáveis; JSON ainda não commitado.

## Fechamento dos relatórios físicos do pedido4

Map-check final com o carro já deslocado terminou: corpo dentro0, submersos0,
folga1,9m, área contígua55,7m² e occluders sem malha0/506. Os outros18 registros
foram preservados sem alteração. O pickup report original continha somente
Penitenciária (não19 mapas como anotado acima): agora preserva esse registro e
acrescenta Javaporcos38/38 alcançáveis, distância máxima0,13m, sem flutuação.
O portão global relata44 dívidas de outros mapas; a linha Javaporcos tem zeros
nas falhas de jogabilidade. Portão específico em execução: --mapa=invasao_javaporcos.
Logs /tmp/javaporcos-pasto-mapcheck-carro-final.log e
/tmp/javaporcos-pasto-pickup-relatorio.log; não há alteração adicional de geometria.

## Verificação de lançamento durante pedidos6–7

A régua launch-race antiga abortava por fixture sem playerGloveId, skins de arma,
faca e registro MAPS, embora esses campos já estivessem no nascimento do HEAD.
Fixture atualizada: régua direta10/10 verde; mutante sem-preload reprova LR7.
O npm eval:launchrace também executa menu-backdrop.test: 5/6 falham por deferred
indefinido. loadMenuBackdrop está byte a byte idêntica ao HEAD anterior a6/7;
essa falha permanece separada das alterações da apresentação. Watchdog8/8 verde.
Portão específico final do Javaporcos passou, apenas2 dívidas COB2 declaradas.

## Pedido6 validado: identidade e wallpapers

Defensores/Javaporcos no placar, HUD, banners, loading e resultado. TP resultado
usa concordância plural. A rotação reaproveita3 imagens já existentes; revisão
pegou que só mudar CSS não mudava a arte v3 sobreposta. Corrigido img TP e observer.
A régua final lê currentSrc carregado, loading real e resultado TP visível:
Javaporcos e Praça verdes; nomes-antigos e wallpaper-fixo detectados, exit0.
Outros modos preservam nomes e arte próprios. Não confundir B do atalho de câmera
com time. Logs /tmp/javaporcos-identidade-final*.log e artefatos/apresentacao.
Revisão crítica dos dois achados corrigidos concluída sem novos riscos materiais.
Pedido7 em validação final separada; ainda não publicado nenhum commit novo.

## Pedido7 validado: introdução pulável da praga

Tela curta em português, com fatos parafraseados de Ibama/Brasília Ambiental e
objetivo lido de DOMINIO.derrota (75%). Fontes e comandos em
`docs/maps/javaporcos-apresentacao-20261030.md`. Reaproveita artes existentes.
Antes: régua vermelha por ausência da tela. Depois, navegador real passou
Pular/Escape/Enter/abort; Game não nasce durante13s de leitura, preservando PREP12.
Régua de fluxo extrai o prefixo real startGame: nova SP/MP apresenta, remontagem
MP não reapresenta, outro mapa não apresenta e debug só força com hordeintro=1.
Mutante sem guarda de remontagem detectado. Browser: sem-intro, sem-pular e
limiar99% detectados. Régua exige evidência específica, não qualquer erro.

Revisão crítica corrigiu cancelamento/modal sobrevivente, repetição na troca de
vaga MP e mutante que antes alterava só CSS. Último achado de execução: splash de
boot em auto debug consumia o primeiro gesto; dismissSplash ignora intro modal.
Guarda revisado, baseline final4/4 verde em /tmp/javaporcos-intro-final.log.
Mutantes robustos em /tmp/javaporcos-intro-mutante-{pular,ausente}-final.log;
rodada confirmatória completa em /tmp/javaporcos-intro-*-real-final.log.
Desktop1440x960 e celular390x844 inspecionados: tela centralizada, leitura e
botões dentro da área visível. Capturas em artefatos/apresentacao, com hashes.
Watchdog8/8, corrida de lançamento10/10 direta, módulos, comentários, redesign,
documentação e arquitetura verdes. O agregado npm launchrace continua com
5 falhas preexistentes em menu-backdrop.test, função de produção inalterada.

## Estado de entrega dos sete pedidos

Implementação local dos pedidos1–7 concluída; aceite visual/auditivo humano
continua pendente. Novos commits não foram publicados. Remoto/preview segue
4acda7bf2, o push dos85 commits iniciais autorizado pelo dono. CI remoto ainda
não representa estas correções; falhas antigas BOT2, classificação e demais
mapas permanecem registradas, sem afirmar PR verde ou pronto para merge.
Nenhum asset NC foi usado. Mint indisponível nesta sessão; Sketchfab sem token
não fornecido; esses pacotes ficam pendentes e não substituem os sete pedidos.
Próximo passo: dono revisar jogo local e autorizar push dos checkpoints novos
para atualizar o preview. Não mergear, não deployar manualmente, não force-push.

## Push autorizado pelo dono e correções do hook

O dono autorizou o envio dos10 checkpoints até865bb7781. Primeira tentativa
interrompida antes do envio: boot-orcamento injeta main.js local sobre produção,
onde javaporcos_intro.js ainda retorna404. Com BASE dev4321, hook completo
registrou76/81 verdes; orçamento dev67,63MB/382requisições não é comparável ao
Brotli público. Outras falhas: matriz com dois links de linha+1, UIR1 presa à
expressão antiga e loaders de áudio data-URL sem resolução do novo import relativo.

Correções de integração: matriz regenerada sem alterar valores; UIR1 normaliza
somente o prefixo literal do modo dentro de tr, mantendo regex exata; mutantes
loading-sem-tr e loading-fallback-fora-tr detectados. Helper de áudio preserva
fonte/mutantes e absolutiza imports reais. Seleção de voz, rollback F/U e envelope
verdes e mutantes detectados. Voice-mix agora executa e expõe MIX11/MIX15 antigos,
fora deste hook; nenhum contrato de fala/menu foi alterado para escondê-los.
Revisão independente cobriu helper e restrição do i18n.

QA de compressão em4333 usa HTML público e arquivos public ATUAIS desta worktree,
Brotli5, confirmado content-encoding:br na produção. Fallback remoto limitado a
/_astro do shell e /api; asset public ausente retorna404 e é registrado. Script em
`artifacts/javaporcos-codex-20261030/push/serve-compressed.mjs` (ignorado).
Medição inicial5,20MB/313req e estrita3,51MB/315req, ambas abaixo dos tetos;
mutantes e hook completo vão rodar novamente neste ambiente. Isto mede boot,
não comprova build Vercel: build/commit do preview precisam ser conferidos apóspush.

Recibo de publicação e estado mais recente do remoto/preview passam a ficar em
`artifacts/javaporcos-codex-20261030/push/recibo.json`, atualizado após o envio,
sem novo ciclo de commits só para carimbar dados externos. Esse recibo e este
ledger juntos são o ponto de retomada. Browser manual agora usa Ego Lite,
TaskSpace3 `Codex root · Javaporcos PR1160 push`, página p1; não criar outra.

### Push autorizado concluído; correção do build privado preparada

Remoto confirmado em `12638394a48f010661fbf68308c62cf0b21666b7`: os11 commits
foram enviados. Hook sem bypass:81/81,373,1s no runner/386s total.
Logs preservados no diretório `artifacts/javaporcos-codex-20261030/push/`.
Vercel `dpl_DhXRqhKUbhsJ9vPrWdwc2DCCE2xi` desse mesmoSHA terminouERROR:
`audio:check` chamou de órfãos os dois MP3 novos, porque o gerador privado só
coletava folhas do manifesto, enquanto audio.js consome a tabela runtime
`data/javaporcos_audio.js` diretamente. Não são gravações antigas removíveis.

Correção local: o ramo privado coleta também os caminhos da tabela real do
runtime. Nenhuma exceção por nome/hash, remoção de arquivo ou mudança de áudio.
`tools/eval/javaporcos-audio-private-check.mjs` executa o gerador real em fixture
privada: antes vermelho com os mesmos2 órfãos; depoisJAP1 verde, mutantes órfão
novo e gravação ausente reprovados(JAP2/3). Integrada em `eval:audioprivate`, que
passou com a régua anterior. Revisão independente: sem achados, incluindo integração.
`npm run check:vercel`:8/8 em54,1s. `npm run build` bloqueado antes do Astro pela
montagem local intencional de preview privado dos viewmodels; não desmontada.
`npm run audio:check` local usa manifesto NÃOprivado e acusa DEFASADO preexistente;
não regenerado para esconder essa diferença. O build remoto não está aprovado.

Próximo passo: pedir autorização para publicar este checkpoint adicional; depois
rodar hook completo, confirmar novoSHA remoto e novo build Vercel. Não confundir
preview anteriorREADY com o buildERROR desteSHA. CI remota ainda em andamento,
com reguas-e-siteFAIL; sem afirmarCI verde. Sem merge ou publicação em produção.
EgoTaskSpace3 foi encerrada sem navegação porque não há preview novo utilizável;
nenhuma validação manual do previewERROR foi alegada. Aceite humano segue pendente.

### Rodada de feedback do dono — placar, ocupação e comportamento

Objetivo completo autorizado: consertar todas as armas em1ªpessoa; placar de um
único time defensor com números reais; loading com javaporco; apresentação com
texto rolando após seleção, na entrada da partida; mais variações visuais;
mais entradas e mata explorável maior; grupos3–4 dispersos que saqueiam lixo e
lojas sem perseguir jogadores automaticamente à distância; corpos estirados;
domínio proporcional à área ocupada, caindo ao limpar setores; relógios claros.
Plano apresentado em chat, ordem: armas/placar, domínio/relógio, apresentação,
mapa e IA/corpos. Preservar PREP12, danos18/30/42, rosnado26m e vivos64.
Ponto inicial6093aaf4d, remoto12638394a; sem autorização nova de push.
Aceite: réguas vermelhas antes dos fixes, mutantes detectados, runtime3:2 e
orçamentos; checkpoint por marco; revisão crítica antes de concluir/publicar.
Próximo passo: reproduzir ausência das armas em EgoLite e examinar o placar real.

Marco1 — placar, relógio e retomada validados. Antes, simular500PTS/3abates no
runtime mantinha0×0 genérico e duas colunas. Agora TAB chama renderScoreboard da
horda, com nomes e estatísticas reais, incluindo defensores semabates. HUD tem
só defensores, contador de abates e relógio crescente da partida; próxima onda
é rotulada separadamente. EgoSpace8(p1), URL QA4333: regua
`ego-browser nodejs < tools/eval/javaporcos-placar-ego.mjs` passou3abates/500PTS,
1:02 preservado ao trocarcombat→prep/onda2→3, inimigodisplaynone; mutante genérico
voltou2colunas e apagou500PTS. Captura inspecionada em
`artifacts/javaporcos-feedback-20261030/placar/`; badge ajustado para coluna.
`javaporcos-retomada-check.mjs`: vermelho antes, verde depois. Setor vazio perde
controle mesmo sem defensor dentro; ocupado continua subindo, vazio não cresce,
mapa limpo volta0. Core javaporcos-check baseline e mutante sem-retomada verdes.
Armas: pistola e AK vistas em frames REAIS locais. Lista26 ainda não concluída;
uma avaliação Ego longa foi rejeitada aos15s(pendente com efeitos), recarregada
antes de continuar. Próximo passo: testar arma por arma com chamadas curtas e
concluir diagnóstico; depois apresentação/loading, mapa, grupos/variação/corpos.
EgoSpace8 permanece ativa. Dev4321recusouconexão e astro recusou iniciar por
registro antigo35025; não alterado. Serve4344 iniciou, mas shellVite travou boot
comerro prévio de envio ao Viteserver; QA4333 usa shellprod+arquivosatuais.
Push continua sem nova autorização;6093aaf4d permanece local.

Marco2 — entrada após preload, texto rolante e retrato da ameaça. Régua nova
javaporcos-entrada-check ficou vermelha nas4 cláusulas antes; verde depois,
mutante sem apresentação detectado. Fluxo SP/MP/remontagem/debug e mutante
remontagem passaram; launch-race10/10. Ego8 confirmou intro com Game ainda não
criado, loading fechado, animationName ji-rolar e retrato B loading-javaporcos.webp.
Captura inspecionada /tmp/javaporcos-entrada-rolante.png. Leitura encerra watchdog
já atendido pelo preload e mantém PREP intacto; abort/generation guard preservados.
Matriz local de25 armas de fogo+faca renderizada: todas visíveis, contato inspecionado
/tmp/javaporcos-armas-contact.png e /tmp/javaporcos-knife-frame.png. Não reproduzido
sumir1ªpessoa; URL do dono ainda pendente. Resultados/logs/capturas ignorados em
artifacts/javaporcos-feedback-20261030/armas. Probe original interpretava stdout no
stderr como erro; JSON recomposto dos logs reais, faca validada separadamente.
Próximo: bandos3–4, dispersão, variações, corpos e mata explorável com novas frentes.

30/10 — ampliação explícita do dono durante implementação (NÃO substituir pelo plano
antigo): MP E×B×Javaporcos com3 placares e domínio territorial disputado; E/B podem
se matar e horda ataca ambos. SP opção player×horda ou três lados. Domínio pode
chegar100% SEM derrota territorial; derrota humana por wipe simultâneo, um vivo
mantém o time. Respawn seguro longe da horda, acesso real a laje/telhado seguro.
MP padrão proposto1000abates ou30min, SP infinito ou limites configuráveis de
abates/mortes. Perguntas assíncronas pendentes: wipe elimina só time ou encerra
partida;1000abates somados ou por time. Não presumir resposta ao decorrer do tempo.
Movimento mais orgânico (sem filas) e morte sempre lateral, nunca em pé/de ponta.
Plano atualizado em chat. Não há nova autorização de push.

Estado intermediário: bandos3–4 por frente e beco, destinos por grupo, caça apenas
perto/alerta, cinco proporções por modelo, corpos120s/cap8 implementados. Régua
bandos5cláusulas vermelha antes(4falhas), verde após; mutante real persegue-tudo
morde. Core passou após atualizar fixtures DOM/HUD e expectativas novas. CPU64
p95 1,160ms média0,567ms (teto1,5ms). Morte lateral revelou BUG REAL: rotação no
Z global tombava de ponta em yaw90°. Régua vermelha eixo longitudinaly0,989;
pivô agora herda yaw antes do attach e rola no eixo local90°, régua passou em8rumos.
Assentamento real Box3 no terreno e fila8 validados. Aceite visual NOVO ainda pendente.
Mapa: seis frentes nos quatro lados,9m de mata caminhável (antes0,6m),1018árvores,
12216nós/21992arestas,0presos/0cruzamentos,35926células alcançáveis,limite63,4m<64.
Régua completa do mapa ainda em execução /tmp/javaporcos-mata-final.log.
Render com56vivos+8corpos mediu1210calls/3,057Mtri; é ACIMA dos orçamentos e precisa
otimização. Materiais175 da cena inteira não são comparáveis aos99 só do mapa;
medir escopo igual. Heap157MB. Não declarar orçamento aprovado.
Revisão crítica achou corrida pós-preload obrigatório na intro; corrigida passando
AbortController próprio e guarda antes de efeitos. Nova intro-race: vermelho antes
(ready/hide/intro antigos), verde depois, mutante sem guarda detectado. Launch-race
10/10 e fluxo6casos verdes. Próximos: corrigir modo tri-facção/condições de fim,
movimento orgânico, spawn/lajes, otimizar e validar gameplay/render reais. Armas26
visíveis localmente; endereço do relato ainda pendente.

Mapa expandido: javaporcos-mapa-check concluiu VERDE completo em
/tmp/javaporcos-mata-final.log. CHAO4042sondas pior0,083m; todas6bocas alcançam6lojas;
pasto138/140raios livres. Simulação real5min3bots: onda4,36abates, sem vencedor,
64,1s CPU. Este marco valida terreno/navegação, não orçamento da horda cheia.

Marco de simulação tri-facção (implementação local, 30/10): E/B preservados como
humanos e64NPCs independentes J; v7 usa bit16 da facção e teto80 entidades, v2–6
mantêm teto64 e recusam J. Teste disputa13casos passou, incluindo100% sem fim,
onda9 infinita, um vivo, wipe por time/partida,1000abates/1800s, limites SP, empate
explícito e território transferível E/B. Core horda verde após inicializar defesaE/B
no snapshot. Respawn de eliminados bloqueado; NPC não usa spawn humano.
Placar triplo e títulos de resultado implementados, ainda SEM aceite no navegador.
Defaults PROVISÓRIOS enquanto perguntas sem resposta: wipe elimina só o time,
1000abates somados e vencedor por território (desempate por abates; empate explícito).
Próximos: interface configurações, verificar fim/score online de ponta a ponta,
movimento orgânico, refúgios seguros, orçamento GPU e réguas finais. Sem novo push.

Revisão crítica tri-facção corrigida no diff posterior a bdf3c289e: contagem de
abates E×B, normalização territorial após saque, empate explícito em Game/TP,
objetivo aplicado antes da transição online e vitória de J preservada. Mais dois
P1 reais corrigidos: interpolação remota J era pulada; join tardio casava animal ao
slot errado. Snapshot agora leva entityId por animal e assignar exige o ID correto;
modo consome interpolação antes de atualizar o visual. Régua disputa16casos verde,
com slot reciclado invertido e interpolação real entre dois snapshots.

Refúgios e movimento: duas lajes no pasto escolhem área sem colisores existentes,
escada18degraus + salto de0,45m para a laje. Régua física real passa subida/salto,
respawn humano no alto, exclusão do alcance da horda e desvios individuais suaves.
Bots de IA mantêm spawn de chão para não ficarem eternamente acampados na laje;
humanos remotos também recebem laje. Interface SP inclui2/3lados, infinito/abates/
mortes/minutos, regra de wipe e critério do limite. Aceite DOM/browser em execução.

Otimização em validação: construções imóveis em lotes por material/célula (fontes
mantidas só como proxies de raycast), horizonte e capim em células para culling,
limite de sombra da horda24m e boundingSphere conservadora para skins. Medição
anterior ao último ajuste do chão de horizonte: pasto64vivos913calls/2,195Mtri;
laje927calls/2,306Mtri; heap194MB. Laje ainda5,7ktri acima, novo chão distante60×60
pendente de medição. Sem aceitação de orçamento até medição final. Nenhum GLB mudou.
CPU64: média0,673ms p95 0,920ms. Core horda verde, formato-melhorde7/7verde.

Em execução: mapa completo /tmp/javaporcos-mapa-refugios-final2.log e map-check
/tmp/javaporcos-map-check-refugios-final.log. O map_check.json original foi copiado
para /tmp/javaporcos-map-check-antes-20261030.json: mesclar só invasao_javaporcos ao
final para preservar os outros18mapas. Não editar mapa até ler resultados. Últimos
vermelhos anteriores: laje cruzava trilha (reposicionada); cupim sob laje (seleção
agora evita colisores); régua MATA5 lia horizonte no lote antigo (agora percorre
lotes reais). Repetir mutantes afetados após verde. Ainda pendem revisão final,
MP end-to-end, corpos/variações em enquadramento correto, orçamento final e push
expressamente autorizado. Não houve resposta às perguntas opcionais nem novo push.

Marco adicional: sala autoritativa REAL do backend worktree objective-npc-slots
(df6ab49), copiada em fixture ignorada artifacts/javaporcos-feedback-20261030/backend-fixture,
sem editar outro checkout. Quatro humanos +64J,68 entidades,3375bytes v7, vagas E/B,
regra1000/1800s, wipe sóE mantém B e wipeambos dáJ: verde (/tmp/javaporcos-room-fixture.log).
Não equivale a backend publicado nem a sessão de dois browsers pela rede.

Revisão crítica achou perda de oclusão na otimização: fontes ocultas eram removidas
por shot_surfaces. Corrigido agrupando separadamente bloqueadores e decoração e
substituindo fontes por lotes visíveis em occluders. Régua LOTES com raycast real
através do wrapper verde; mutante sem-oclusao ainda deve ser executado.
_fimDaPartida agora respeita winner do objetivo em vez do teto genérico de rodadas;
resultado final e TP exibem parcelas territoriais e empate explícito.

MAP1 e MAP6 passaram com guardas e patamares; MAP3 escadas18degraus conforme régua.
NAV1 exclui o volume de refúgio da grade de IA, que continua no chão. Copa agora
considera relevo vizinho e tronco acompanha sua cota: mapa específico todo verde
(/tmp/javaporcos-mapa-refugios-nav-altura.log),12022nós/21565arestas, zero presos,
1018árvores,7,9%tronco pelado (teto10%). Nova divisão de lotes do horizonte128m e
capim32m precisa repetir réguas; map-check-final-lotes ainda mede versão anterior
à última divisão, sua saída deve ser mesclada só para este mapa.

PERF AINDA NÃO ACEITA:64vivos após240frames deram2,493Mtri/1022calls semLOD e
2,365Mtri/1022calls comLOD55%. Heap já caiu naturalmente de361MB temporário para
135MB em medição posterior anterior, não usar pico de carregamento como estável.
TesteLOD30% está gerando4derivados dosGLBs locais, originais intactos, apenas>18m
com histerese16m. Próximo: validar silhueta/texturas/patas eGPU com64vivos+8corpos,
mutante sem-lod, ou rejeitarLOD se qualidade falhar. Não houve novo push.
A captura /tmp/javaporcos-placar-triplo.png era cortina lima: NÃO É aceitevisual,
apenas DOM validou3colunas/avatar. Cortina já saiu naturalmente; refazer captura.

Marco GPU e corpos (Ego8/p1, canvas real):64vivos+8corpos =943calls/2.259Mtri,
heap152MB;64vivos=935calls/2.244Mtri, mutante sem-lod=2.326Mtri (mesma câmera),
heap153MB. Artefato /tmp/javaporcos-corpos-canvas-real.png inspecionado: corpos
laterais no pasto, contatos no chão, pistola visível e mata densa. Captura do
browser/CDP completa falha com Page.captureScreenshot timeout; exportar o canvas
real via Ego funcionou. Isso NÃO aceita visualmente o DOM do placar/carregamento.
LOD30%erro0,01:2243/1478/2155/2814tris vs4699/4930/4526/5054,4testes verdes;
texturas byte a byte iguais, materiais iguais, volumes<1%, rigs e histerese18/16m.
Tentativaerro0,02 REJEITADA pela régua de volume (aríete perdeu largura); regenerados
os4LOD com0,01. Originais intactos. Horizonte4cards só distante, perto14preservado;
capim em células12m, densidade3,60/m² intacta. Esses são os parâmetros finais atuais.

Revisão adicional detectou cadáveres online congelados: objective.update não roda
no cliente. Atualização mudou para updatePresentation, executado em ambos, antes
do gatecinema. Régua corpos agora testa apresentação ONLINE em yawvariados, contato,
45svisível e125slimpeza: core verde. Nova cláusula1sobrevivente/wipe verde e mutante
sem-derrota agora efetivamente acende. Novas plaquetas E/B/J no topo e carregamento
triplo (humanosE/B preservados, Javatar ao centro) aguardam conferênciaDOM apósreload.
Disputa17casos repetindo após compatibilizar placarJ com DOM headless do harness.

Último map-check acabado (anterior só à partição capim12m e cards horizonte4):
MAP1=0,MAP3ambos18degraus,MAP2Bfolga1,9m/área55,7m²,MAP4zero195occludersmedidos,
MAP6zero. Exatoestadofinalrodando /tmp/javaporcos-map-check-fecho.log (session64446).
Arquivo map_check.json foi novamente sobrescrito; ao terminar MESCLAR com backup
/tmp/javaporcos-map-check-antes-20261030.json preservando18outrosmapas. Mutantes
pasto-careca e mapa-flutuando acenderam; mata-sem-lote rodando. Ainda sem novo push.
