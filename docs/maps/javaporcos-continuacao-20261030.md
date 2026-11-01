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

Checkpoint local 2c7b78d49 recuperável: disputa E/B/J, regras configuráveis,
refúgios, lotes com oclusão, LOD e corpos online. Sem push. Map-check final exato
terminou verde (/tmp/javaporcos-map-check-fecho.log); saída mesclada preservando
os18outrosmapas. Mutantes mata-sem-lote, pasto-careca e mapa-flutuando acenderam.

Mint confirmou quatro variantes prontas no pack th7f82d138zgbc9bzs2c3032f58h9f8g,
chat ph73ry10s4j7w9gtzw6k8vqqqx8h8jmk: leitão listrado, velho cicatrizado, ruivo,
malhado. Downloads originais via Ego8/p2 para artifacts/javaporcos-feedback-20261030/mint
(ignorados), sem conversões pagas. Leitão é um mesh/um material,4760tris,3texturas2048,
6,1MB; as9partes da interface já vêm reunidas. Próximo: otimizar texturas localmente,
validar orientação/rig, acrescentar aparências determinísticas e repetir GPU.

Variantes Mint integradas:8aparências totais,4novos originaisruntime+LOD, texturas512
WebPquality90 como os4anteriores, geometria perto intacta. Proveniência/hashes/receitas
em asset-manifest.json; fontes ignoradas references/glb. Imagem frontal real inspecionada
/tmp/javaporcos-oito-variantes-frente.png: listras/manchas/ruivo/velho, orientação correta.
LOD8e passada real numérica perto/longe verdes:2patas imóveis no chão >94% dos quadros.
Regra redução aceita>=30% por modelo preservando erro0,01; novos listrado/velho reduzem
só~33%, melhor conservar silhueta que elevar erro (tentativa anterior0,02 rejeitada).

Ego64vivos+8corpos mistos:966calls/2.214Mtri/141MB SEM as2fumaças já ativas na partida.
Com as2fumaças:1014calls/2.214Mtri/141MB (+48sprites). Registrar ambos: teto1000calls
ultrapassado em1,4% nesse cenário com efeitos; basecomparável dentro. Nenhuma mudança
na densidade/colisões do mapa. Tentativa reduzir raio de sombra não ajudou e foi revertida.

Revisão crítica encontrou correlação ordinal%3: todosadultos viravamruivo. Corrigido
com mistura inteira determinística do ordinal; nova régua percorre composição REAL
das8ondas e exige8aparências, mutantevariantes-correlacionadas. Captura plantada sozinha
não provaria variedade real. PlacarTAB DOM confirmou3colunas e64vivos; loading DOM
confirmou rostersE/B eJavatar central. CapturaDOM continua falhandoCDP timeout, nãoaceita.

Fecho deste marco:coreverde com cobertura8aparências em ondas reais; mutante de
correlação acendeu. Revisão crítica releu hash e não encontrou novos problemas.
RegraLOD/passada8modelos verde; sem-lod falha como esperado. ContratoMC1/MC2/MC3verde;
comentários verdes. Assetrev1724binários. CatálogoMint e FONTE também registrados.
Próximo trabalho: baixar/catalogar os12propscidade+10vegetação prontos do prompt,
sem trocar geometria física já validada do mapa indiscriminadamente. Depois conferir
opçõesSP/fluxointro e fechar checkpoint. Sem push/merge/deploy; preview/MPWS continuam
pendentes e armas26locais visíveis não provam o problema remoto relatado resolvido.

Checkpoint variantes13eb85754. Novo achado de contrato no limite de mortesSP: interface
fala "mortes do seu time", mas somavaE+B. Corrigido recebendo playerTeam e contando
apenas essa equipe (compatívelE/B). Disputa18casos verde; mutante mortes-todos esperado
vermelho. PacoteMintcidade12originais baixado porDownloadobject/UI do pack, semgastos.
Vegetação10tambémpronta; downloadsseguintes. Arquivosignorados em artifacts/.../mint-cidade.

Marco final de menu e catálogo: integração REALv3 encontrada ausente e corrigida
em mainAPI/tp/modos. Ego verificou painelvisível;2ladosescondeinimigos,3ladosmostra;
limitesaparecemconformefim; semintro duranteescolha. MutanteAPIsemhelper não cria
controle e acende; restaurado volta. Relatório persistente
artifacts/javaporcos-feedback-20261030/opcoes-v3-ego.json. Input.dispatchMouseEvent
no p1 às vezes expira apesar de aplicar o clique; para essa conferência foram usados
HTMLElement.click/dispatchEvent pelo Ego após inspeçãoDOM e falha do wrapper. Isso
valida DOM/fluxo, não substitui captura visual completa (CDP screenshot ainda falha).

Os12cidade+10vegetação estão baixados, otimizados, normalizados uniformemente e
CATALOGADOS, sem inserção indiscriminada no mapa. Receitaproveniente
 tools/javaporcos-mint-packs.mjs,22runtimeGLB,registroMint/FONTE, fontes ignoradas
references/glb/javaporcos-mint-packs. Procedência por pack+nome escolhido noUI (não
inventar childassetID a partir dos resultados duplicados do chat). PAC77propsverde,
integridade151hashesverde, assetrev1746. Quatroboarsnovos tambémtêmfinalSha256.

Regressões finais: netcodec30/30, netcode209/209, formato7/7, UIv3 10/10, introfluxo6/6,
arch/comments/syntax/diffcheck verdes. Revisão crítica de menu/mortes/catálogo sem
novosachados. Evidências antesem/tmp foram copiadas para
artifacts/javaporcos-feedback-20261030/fecho (capturas3D+logs relevantes).

PONTO DE ENTREGA LOCAL, NÃO PUBLICADO: trêsfacções/território real, sobrevivência,
limitesSP/MP,refúgios,mataexpandida/entradas,bandos,morteslaterais,8aparências,
loading/intro/placares implementados. Armas26aparecem localmente; bug remoto semURL
não reproduzido, não declarar corrigido em produção. Preview novo e MP com dois
clientes reais pendentes. Backendfixture verde não equivale a WSpublicado; cliente
v7J e backend devem sair coordenados. CodeRabbit/CI atuais só após push autorizado.
Sketchfab26aguarda token por ambiente;NCnão usado. Não ler .env.
Próximo: apresentar checkpoint e pedir autorização de push conforme promptlinha8;
se autorizado executarhooknormal, acompanharpreview/CI e validar armas/MP de verdade.
EgoTaskSpace8 continua ativo para essa continuação; não operar espaços de terceiros.
Checkpoint de menu/mortes b38602641; checkpoint de variantes13eb85754; estrutura/rede
2c7b78d49. Catálogo22props no checkpoint seguinte, sem mudar geometria de runtime.

Continuação de publicação: o dono autorizou o push com “sim”. Primeiro envio de
916f3146e iniciou hook normal e encontrou boot/matriz vermelhos; nada foi enviado
nessa tentativa. A régua de boot sobrepunha main.js local à produção, onde os módulos
novos intro/opções/apresentação respondem404. Passou a servir esses módulos locais
com status200/MIME JavaScript, mantendo contagens e tetos. Execução corrigida:
5.096ms por assets,7,44MiB/318requisições; ORC1–3 verdes. Cartaz-ansioso reprovou
ORC1/2 (10,99MiB); fauna-cedo reprovou ORC1/3. Não houve afrouxamento de orçamento.

CI anterior em12638394 também falhava Lajes: fixture de fetch-audio não copiava o
instalador javaporcos-samples e sua tabela. Reproduzido MODULE_NOT_FOUND antes;
agora fixture executa instalador real com duas amostras determinísticas, hashes e
curl restrito às URLs de teste, conferindo cache e unzip sem rede. LSA1–10 verdes;
mutante sem-lajes vermelho. Matriz de armas regenerada: apenas dois links de linha
mudaram. Revisor adversarial releu os três arquivos sem novos achados.
Logs em artifacts/javaporcos-feedback-20261030/fecho/bootcorrigido.log,
lajes-antes.log,lajes-depois.log,lajes-mutante.log e weapon-matrix-push.log.
Próximo: concluir hook inicial, checkpoint dessas correções, repetir push normal,
acompanhar CI/preview do SHA novo. Publicação coordenada do backend e dois clientes
WS continuam pendentes; não confundir fixture com multiplayer publicado.

Checkpoint de fixtures87467392b. Segundo push normal: boot/mutações e matriz verdes,
mas eval:redesign/UIR1 bloqueou envio. A leitura dos últimos trechos do runner não
mostrou esse vermelho intermediário; registrar e consultar todos os FALHOU, não
apenas tail. Rótulo triplo de showLoading escapava tr(); agora tr envolve o ternário
inteiro. Régua normaliza o ramo somente dentro de tr e ganhou mutante
loading-triplo-fora-tr que reproduz o antes: UIR1 vermelha. Redesign final verde,
mutantes loading-sem-tr/loading-fallback-fora-tr/sem-i18n também detectados.
O mutante sem-i18n ainda apontava MAP_IDS; atualizado para o uso real MAPAS_MENU
antes de validar, pois antes falhava como MUTAÇÃO IMPOSSÍVEL, sem medir o defeito.
Revisão adversarial dos dois arquivos sem achados. Nada enviado nas duas tentativas;
próximo checkpoint e terceiro push normal, depois CI/preview do SHA exato.

PUSH CONFIRMADO: terceiro hook passou81/81 (394,7s; hook408s), sem bypass.
Treze commits enviados, remoto/PR confirmados em
cf2348b4449a6a17b6532867a3210cdc509f989f. Runner completo preservado em
artifacts/javaporcos-feedback-20261030/fecho/prepush-terceiro-check-deploy.log.
CI novo pr-fast41147454413 e preview-build41147454446 iniciados. Vercel correto:
projeto csbrasil/prj_TWb3W0xgVwsqRA3WEI06p8caAUAz, rubenmarcus-projects;
deploy dpl_EBxh6PH1TSbd2WKntYBhZXWuB5rB,
https://csbrasil-oky3haskc-rubenmarcus-projects.vercel.app em BUILDING inicialmente.
O .vercel/project.json local aponta outro projeto e não foi alterado. Próximo:
aguardar resultados do SHA exato, validar preview/armas no EgoTaskSpace8.

PREVIEW READY no deploy acima. Build remoto passou áudio privado (1066referências,
834únicas), check:vercel e Astro. EgoTaskSpace8 abriu a URL exata: loading com
Defensores/Javaporcos e avatar de javaporco; depois intro rolável/pulável antes de
criar Game. Captura completa observada em fecho/preview-intro.png. Entrada normal
pelo botão Defender a cidade abriu partida, relógio/onda e domínio separados.

Armas conferidas no PREVIEW:25fogo com malha da arma projetada visível e faca
renderizada; contato visual revisado. Capturas/relatório em
artifacts/javaporcos-feedback-20261030/preview-armas, resultados.json e contato-25.png.
AK com madeira/metal visíveis em fecho/preview-ak-3x2.png (1320x880,aspect1,5),
sem silhueta preta. Procedimento inicial usava um update(.5), mas authoredvm limita
passo a.05: capturava saque incompleto e gerava falsos zeros. Conferência final
avançou40passos de.05 do VM e projetou vértices COM skinning/getVertexPosition.
Contagens só da arma (weaponMeshes), não mãos. A faca foi observada em imagem.
Screenshot wrapper restaura viewport do host; captura3:2 válida usa CDP clip e
renderer1320x880, não a imagem inicial preview-jogo-3x2.png (nome não prova proporção).
Isso confirma visibilidade neste preview, não reprodução/correção universal do
relato original sem URL. MPWS publicado e aprovação humana de gameplay pendentes.

Fecho em 2026-10-31 UTC: preview também validado pela seleção real de três lados.
Escolha E × B × JAVAPORCOS mostra inimigos e não abre introdução durante escolha;
JOGAR mostra loading E/B + javaporcos e só depois a introdução. Entrada normal
criou regras.times=3, sete bots humanos e64NPCs (71bots), infinito/wipe=time.
HUD e TAB exibem E, B e Javaporcos, domínio/abates separados e avatar da horda.
Captura observada fecho/preview-triplo-placar.png (1320x880); contém pausa ao fundo,
portanto serve para conferir estrutura do placar, não aprovação visual final.
EgoTaskSpace8 concluído com keep=[]; não tentar retomar espaço encerrado.

Última consulta do CI: reguas-e-site, build, DCO, smoke/chat-desktop e classify
verdes; invariantes, serta o portao-browser (jobs sertao/portao) ainda pendentes,
sem falhas observadas. PR reviews=[] nesta consulta: CodeRabbit não revisou o HEAD.
Não declarar PR pronto ou multiplayer publicado. Próximo passo: consultar os jobs
41147454413/41147454327 e corrigir somente falhas comprovadas; depois obter revisão
no HEAD. Backend objetivo/NPC e teste real WS de dois clientes seguem pendentes.
Runtime remoto permanece cf2348b4449a6a17b6532867a3210cdc509f989f; este checkpoint
é apenas documentação local e não inicia outro push/preview. Nenhum merge realizado.

Rodada nova autorizada em 31/10: dono aprovou visual e pede foco no lixo antes da
perseguição, animações legíveis de ataque/fuçar, entradas diferentes no mesmo lado,
mais pontos de armas e respawn, salto/acesso a telhados e muros, wallpaper de ataque
à cidade, card de Invasão no lobby e multiplayer real. Definição de pronto: caminho
real exercitado, evidência visual 3:2, invariantes/mutantes afetados e crítico externo;
MP requer dois clientes WS e backend compatível, não apenas fixture. Preservar
limites de dano/onda/64NPCs e demais armas; sem merge ou publicação de backend implícita.
Base runtime publicada cf2348b44, documentação local 4d6aac2c8. Próximo: medir
prioridade do lixo/variação de entradas e animação antes de mudar o comportamento.

Ampliação e esclarecimento do dono em31/10: três mapas do mesmo modo Caça ao
Javaporco, com padrão visual comum; Cidade Invadida, Distrito Rural e Vila da Mata
(casas portuguesas). Mint autorizado para edifícios/estruturas das cidades, não
um pedido novo de modelos de javaporcos. Direção e prompts preparados em
docs/maps/caca-javaporco-direcao-visual.md. Casas com interior/andar superior,
mercearia aberta/polos de comida, placar em contêiner, card do javaporco no loading
e comportamento intencional da horda permanecem no objetivo. Nenhum mapa novo
ou lote Mint gerado nesta etapa. Consulta pelo EgoTaskSpace16/p2 ao resultado
Mint exibiu Sign in to view results; login deve ser feito pelo dono. Não contornar
autenticação. Próximo: completar validação do diff de movimentação e mostrar
javaporco no LoadingCharacterStage, que ainda recebe currentFaction; integrar
casas/mercearia/placar, depois expansão dos mapas e prova MP de dois clientes.

Login Mint confirmado pelo dono e retomado no EgoTaskSpace16 em31/10. Antigo
pacote Cidade do interior está succeeded. Três pilotos de arquitetura enviados
com referência conceito-a-aerea.webp e qualidade Medium (até8.000 créditos cada):
- Mercearia: https://mint.gg/app?session=rh79dvjgfvavgjz3kdtey1yax18haf1k
- Celeiro/ração: https://mint.gg/app?session=rh74z2tyc8phr2eh4adahej1658hbhaj
- Casa portuguesa: https://mint.gg/app?session=rh78kz6zkxad8ragw7qr54y4kx8hb72n
Todos aceitos/Generating, ainda sem GLB inspecionado ou integrado. Reserva de
24.000 créditos; UI mostrou27.089 disponíveis depois do terceiro pedido. Não
comprar créditos nem regenerar automaticamente. Prompts exatos em
docs/maps/javaporcos-arquitetura-20261031/pedidos.json; ficha
docs/maps/javaporcos-arquitetura-20261031/ficha.md passou spec:check.
Primeira tentativa de anexar conceito-d-rua foi rejeitada pelo site com This
content cannot be submitted; não houve geração. Referência aérea foi aceita.
FONTE local em docs/maps/javaporcos-arquitetura-20261031/FONTE.md.

Revalidação local da intenção: seis casos verdes, incluindo queda sobre telhado
a20/30/60/120Hz. Três mutantes finais lixo-depois/entrada-fixa/sem-ataque derrubam
somente o caso esperado e são detectados. Isto não substitui revisão visual de
animação ou validação MP. Próximo imediato: javaporco no LoadingCharacterStage;
manter o restante do objetivo acima, acompanhar os três pedidos e inspecionar os
modelos antes de considerá-los aproveitáveis.

31/10 — correção local da morte humana se retorcendo: CharController agora
restaura a pose base antes de reaplicar a inclinação direcional e antes de
reviver. O mixer com clamp deixava a rotação adicional acumular a cada quadro.
Régua tools/eval/morte-pose-estavel-check.mjs usa controlador e AnimationMixer
reais: desvio após assentamento passou de3.14140899rad para0.00000004rad em10s;
reviver/morrer novamente estável. Mutante acumula reproduz e detecta o defeito.
No navegador local, Gotinha/Curupira/Funkraiz ficaram estáveis após o clipe
(desvio máximo2.98e-8rad). Captura3:2:
artifacts/javaporcos-feedback-20261031/morte-gotinha-assentada-3x2.png.
Revisão independente review_morte_loading não encontrou regressão funcional na
correção. Ainda local, sem publicação no preview. Outros diffs de loading,
placar, movimentação e arquitetura continuam em andamento; não confundir com
esta validação. Próximo: fechar cobertura de carregamento frio/cancelamento e
revisão visual móvel do loading, acompanhar os três pilotos Mint e seguir as
pendências de interiores/mapas/MP registradas acima.

31/10 — instrução persistente do dono: sempre atualizar o preview após validar
cada entrega para permitir teste no jogo, sem pedir nova autorização de push.
Não implica merge nem publicação do backend. Push da correção0b2fee102 em curso;
diffs ainda não validados permanecem locais. Estado dos mapas: Cidade Invadida
jogável; Distrito Rural e Vila da Mata ainda não implementados, com pilotos de
arquitetura pedidos ao Mint. Reabertura do EgoTaskSpace16 falhou com task space
not found; não abrir outro espaço para contornar, nem afirmar status novo do Mint.
Push0b2fee102 confirmado após pre-push completo verde(757s). Deploy Vercel
DZYd4FrQQShGEDM8fzKF5E41Bs8V, SHA0b2fee102b6ccd0cd2df96ef6e51f299c80e136e,
em BUILDING na consulta inicial; URL própria
https://csbrasil-pau16p6n8-rubenmarcus-projects.vercel.app e alias fixo
https://csbrasil-git-v2-invasao-javaporcos-rubenmarcus-projects.vercel.app.
Não considerar READY antes de confirmar o estado e o JS servido.
Deploy confirmado READY. HTTP autenticado por vercel curl confirmou a correção
_restaurarPoseMorte no glbchars.js publicado(77.559 caracteres); alias fixo serve
os mesmos bytes do URL único. Proteção Vercel preservada. EgoTaskSpace16 ausente
impediu repetir QA visual remoto nesta rodada; revisão visual local já registrada.
Estado entregue: correção da morte publicada; três mapas não estão prontos,
Cidade Invadida é o único jogável e dois layouts novos seguem pendentes.

Produção autorizada pelo dono: produzir os três mapas e atualizar preview antes
do teste humano. Interiores locais agora têm dois sobrados(OS-oo/LS-oo), escada,
janela e mercearia aberta, mais quatro polos baixos de alimento. Baseline da
régua nova falhou por0 interiores/mercearia fechada; após implementação cinco
casos passam incluindo percurso real até janela e salto sob loft. Crítico
review_interiores encontrou expulsão6.255m no salto e pilha visual0.418m com
colisor0.25m. Corrigidos com superfícies/teto opt-in e escala por Box3; nova
revisão solicitada. Sem-teto reproduz cabeça atravessando loft, removendo a
correção. Imagens atuais de interiores ainda pendentes, não entregar como
visualmente aprovado. Pedido assíncrono ao dono autoriza recriar EgoSpace
perdido16; resposta ainda não chegou. Avançar código independente desse acesso.

Checkpoint de produção31/10 (ainda não publicado): os três mapas existem no
registro e carregam a mecânica horde. Cidade11845 nós/25 alimentos; Rural13126/10;
Vila12919/11. Régua diferencia ocupação física AABB/OBB, não rótulo do layout.
Rural usa celeiros/pátios/silos; Vila usa encosta, casas brancas com cantos azuis,
praça e telhados de duas águas. Mesma família de materiais existente. Nenhum dos
três pilotos Mint foi baixado/integrado nesta rodada; acesso ao Ego ainda pendente.
Main, loading, intro e opções reconhecem objectiveMode=horde nos três IDs.
Interiores:5/5 testes funcionais na cidade; revisão independente repetiu5/5 no
Rural e Vila, sem novo bloqueador. Olho/cabeça compartilham altura com câmera,
teto limita subida/queda e levantar de agachamento. Redesign verde. Loading
exercita cache, ramo frio, hide e resposta atrasada após trocar J→E; mutante humano
é detectado. Mutantes de interiores e três mapas e contratos amplos em execução,
resultados finais ainda não declarados. Logs /tmp/jav-{interiores,tres,lojas,intro,
contratos,map-rural,map-vila}.log. Docs/assetrev regenerados; arch em execução.
Objetivo completo preservado: três mapas com QA visual real3:2, modelos Mint
inspecionados se disponíveis, preview atualizado e teste humano; demais pendências
anteriores de multiplayer real e parâmetros de partida continuam abertas.
Próximo: terminar réguas/revisão crítica, corrigir achados, obter autorização
pendente para novo EgoSpace, inspecionar três mapas + loading móvel, revisar assets,
e então push/confirmar READY e bytes publicados. Não confundir checkpoint local
com entrega pronta ou aprovação visual. Último preview ainda SHA0b2fee102.

Checkpoint ed7ffb5d3 preservou a produção local. Revisão crítica seguinte achou
via rural com largura girada errada, rua da Vila cruzando casas e tampa do silo
sem oclusão/piso. Corrigidos: via orientada pelo segmento, casas/loja/muro fora
dos eixos, tampa cone16 registrada em occluders e altura física por faceta.
Crítico independente confirmou0 expulsões laterais>0.1m a cada0.5m dos eixos
nos dois mapas. Régua três mapas atual passa e compara raycast real do silo
contra piso em três raios. Mutantes via-obstruida e silo-transparente detectam
as falhas certas; os anteriores layout-copiado/sem-horda também foram detectados.
Interiores baseline+4mutantes verdes (falhas injetadas na cláusula esperada).
Loading cache/frio/hide/troca de facção verde+mutante humano detectado. Fluxo da
intro verde nos três mapas; mutante remontagem detectado. A parte browser de
npm eval:javaporcosintro não executou: BASE obrigatório, sem browser aberto.
Cards dos dois mapas novos usam temporariamente arte comum do modo, documentada
em FONTE; não são imagens dos layouts. Substituição por screenshot real pendente.
Mapid varria checkout worktrees/ (só ignorava .worktrees/), corrigido sem tocar
outras lanes. Execução antiga foi interrompida e precisa ser substituída pelo
resultado /tmp/jav-mapid-21.log. Contratos amplos e map-check continuam em curso;
logs temporários citados acima. Próximo: confirmar contratos/pre-push, publicar
preview de teste autorizado (sem alegar aprovação visual/Mint/MP real), recuperar
Ego somente com resposta ao pedido pendente para QA visual e pilotos Mint.

Correções de vias/silos e cards recuperáveis no commit df967a57c. Crítico asset
review_asset_loading aprovou o retrato no cartão da captura desktop3:2 existente;
não cobre móvel nem screenshots posteriores. Contratos amplos: sintaxe, mapas
sob demanda, contrato, rotação, mapas pausados e comentários verdes. Mapid continua
vermelho por12 aliases legados em arquivos fora desta entrega; M2/M3 atuais verdes
com os21 mapas. Não tratar esse vermelho como regressão dos novos IDs.
Primeiro push foi interrompido somente na árvore de processos própria: o boot
check padrão usa produção, intercepta main local e mistura imports novos com
maps.js antigo (produção não exporta ehMapaJavaporcos, conferido por HTTP).
Reiniciado sem bypass com BASE=http://127.0.0.1:4333 para testar o worktree certo.
Push atual: /tmp/jav-push-local-20261031.log, sessão80731. Não afirmar push/READY
antes de retorno. Map-check geral Rural/Vila segue no processo próprio98585,
sessão48295 e logs /tmp/jav-map-{rural,vila}.log; ainda sem resultado final.
Boot-orcamento no pre-push local passou(99.6s); sintaxe91.1s também verde.
Processo do hook atual17132; log interno /tmp/prepush-17132.log (temporário).
Servidor4333 continua vivo no PID3152; curl do sistema não decodifica Brotli,
portanto erro61 do curl com --compressed não significa servidor indisponível.

Nova regressão capturada antes da publicação: MAPCHECK Rural terminou com12
pontos dentro de degrau-interior, pior1.375m. Relatório rejeitado salvo em
/tmp/jav-map-rural-result.json; não substituir o relatório consolidado por uma
execução de mapa único. Vila continua medindo o estado anterior ao conserto.
Baseline da régua dirigida /tmp/jav-escada-baseline.log reproduz: consulta de
chão sem yRef devolvia térreo no volume da escada. Conserto: degrau sólido até
solo e superfície de escada independente de yRef, mantendo loft/telhado por
camada. tryAxis bloqueia acesso lateral alto em vez de teleportar. Nova cláusula
mede24degraus/casa, raio de corpo e tentativa lateral. Cidade6/6 verde; Rural/Vila
em execução na sessão25014; mutante escada-vazada e raycast sessão50300.
Revisão crítica independente solicitada. Push80731 também interrompido (somente
árvore própria17094) para incluir este fix e regenerar docs/ARMAS-MATRIZ.md:
weapon-matrix reprovou apenas por referência de linha desatualizada do game.js.
Não há push ativo nosso agora. Retomar: concluir testes dirigidos/criticidade,
regenerar matriz/docs/arch/assetrev, commit e novo push com BASE4333 e hooks ativos.
Não repetir push sem BASE local nem alegar mapas publicados enquanto falha local.
Probe independente de10telhados da Vila/30raios:0falhas, normais superiores
positivas, diferença máxima físico/visual4.77e-8m. Sem aprovação visual dos mapas.

Revisão seguinte identificou que o raio da cápsula ainda atravessava lateral
0.375m e que a régua usava yaw inicial errado. Corrigidos: yaw0/reset e exigência
de aproximação+folga0.38m; colisores somente nas faces laterais/final da escada,
correspondentes ao degrau sólido, sem travar a subida. Raio nos24degraus revelou
muro de1.8m cruzando casa OS-oo; vizinha também sobrepunha1.325m ao interior.
Reorganizados só os2blocos abertos: um sobrado central com fachada livre, sem
props de quintal no interior; sorteios de casas omitidas/muro/quintal preservados.
Cidade/Rural/Vila7/7 verdes nos logs /tmp/jav-interiores-replanejados.log,
/tmp/jav-{rural,vila}-laterais.log. Crítico independente confirmou e não achou
novo bloqueador funcional. Suite baseline+7mutantes em curso sessão88214;
mutante escada-sem-lateral remove somente faces físicas mantendo o piso. Nova
checagem3mapas+intencao/refugios/lojas sessão12670. Matriz de armas regenerada:
apenas referências game.js4053→4054 e4107→4108, sem mudança de dano/arsenal.
Suite final de interiores baseline+7mutantes terminou verde(exit0), sessão88214.
Inclui escada-sem-lateral detectando só folga da cápsula e vizinha-invasora só
sala térrea. Três mapas/intencao/refugios/lojas após replanejamento também
terminaram verdes(exit0), sessão12670. Docs/arch/assetrev regenerados sem novo
diff. Checkpoint corrigido5a6748534. Novo push com BASE4333 está ativo na
sessão71046, log /tmp/jav-push-final-20261031.log; hook42589/log interno
/tmp/prepush-42589.log. Ainda não enviado nem READY; aguardar resultado real.

MAPCHECK amplo iniciado antes de5a terminou: relatório Rural rejeitado em
/tmp/jav-map-rural-result.json; Vila rejeitada em /tmp/jav-map-vila-pre5a-result.json.
Vila antiga:14corpos em sólido e2escadas de refúgio com Blondel0.612/0.616
(contrato0.62), portanto não aprovada. Correção5a cobre interiores, não altera
a proporção dos refúgios na encosta; este ajuste permanece pendente. Restaurado
o consolidado tools/eval/map_check.json a partir de /tmp/jav-map-check-before.json
para preservar todos os outros mapas. Não publicar relatório parcial como aceite.
Preview desta entrega é versão para teste, sem aceite visual/varredura ampla atual.

Push5a terminou verde816s, remoto confirmado. Deploy dpl_AzBYG1V4k13ikMViDxFKCRA9j971
ERRO: assert:assets no pack de build não cobre distrito_rural/vila_da_mata.
Correção tools/audio/extend-map-soundscapes.mjs preenche os dois somente ausentes
com clone da ambiência existente da invasão; configs curadas preservadas.
Nova régua javaporcos-audio-pack-check reproduz RED e GREEN pelo mesmo assets-check,
com idempotência/preservação/sem doador. Escadão e Mansão regressões verdes.
Local public/audio/manifest.json é instalação antiga incompleta73refs sem
mapSoundscapes; assert:assets local e audio:check reprovam por essa instalação,
não pelo pack que a Vercel baixa. Não alterar/gravar pacote privado no Git.
Refúgios agora y>=baseEscada+3.55: subida útil>=3.10, espelho>=.1722,
Blondel>=.6244. Régua três mapas mede18degraus por12refúgios com raycast real,
proporção e piso coincidindo com malha; verde. Régua refúgios movimento verde.
Revisão crítica independente dos2fixes sem bloqueios. Docs/arch/assetrev
regenerados sem diff. Próximo: commit e push normal BASE4333, aguardar READY
novo, verificar JS real do preview; não considerar deploy5a publicado.

Push49eb verde393s/remoto confirmado; deploy dpl_6o9XZqTVU1Yr6VYngEHMHpBttv7K
passou assets/audio, mas ERRO Astro /maps: MAP_EN sem novosids. Corrigido
src/pages/maps.astro com traduções2mapas e remoção da descrição obsoleta8ondas.
MAPCHECK atualRural exit0:corpo0/submersos0/escadasok, relatório
/tmp/jav-map-atual-distrito_rural.json. Vila49eb reprovou10pontos terreno
.345m: malha central passo2 ignorava plataformas do campo.5. Correção somente
novosambientes malha central passo.5; originalCidade preservada. Teste3mapas
verde nos10pontos e mutante terreno-deslocado detectado como esperado(exit0).
Crítico independente90amostras, inclusive±.25m, erro0m; sem novo bloqueador.
Custo central+38880tris/+19656vértices, semdrawcallnovo; orçamento real pendente.
Compilação Astro completa verde26.19s, /maps gerado com2novosnomes no HTML.
npm run build local interrompido pela montagem privada de viewmodels existente;
ela foi preservada e npx astro build validou páginas sem remover a montagem.
Nova MAPCHECK ampla Vila terreno corrigido ativa sessão22355, log
/tmp/jav-map-vila-terreno-final.log, JSON futuro /tmp/jav-map-vila-terreno-final.json;
wrapper restaura consolidado. Próximo: commit+push normal+READY+verificar servido.

Milestone validado: MAPCHECK amplo Vila corrigida exit0(sessão22355), corpo0,
submersos0 e4escadas no contrato. Relatórios persistidos em
artifacts/javaporcos-feedback-20261031/mapcheck-distrito-rural-49eb66e58.json
(12655B SHA2568d8b068842fa72fc1906da2842a81128b142bae52fb3f35a828d3bedf9b352f6)
e mapcheck-vila-da-mata-dce8b50a2.json
(13185B SHA256953a6657d64f1d23dd475dbf6297a10ed3b4478a29c8db93541b65219dab7032).
Consolidado map_check.json preservado integralmente. Ambos amplos exit0;
MAP5 ainda registra avisos de espaçamento/densidade nos terrenos abertos, sem
alterar limiares; não é aceite visual ou de orçamento global. Novo HEADdce8b50a2,
push em execução sessão73650/hook84283, /tmp/jav-push-terreno-final-20261031.log.

ENTREGA PARA TESTE: pushdce8b50a2 aprovado396s/remoto SHA confirmado.
Vercel Git não criou novo deploy automaticamente; preview-build41163863637
verde e preview-deploy41164006709 verde (pipeline padrão). Para manter o alias
habitual do projeto csbrasil, criado preview via conexão Git pelo MCP, do mesmo
SHA dce8b50a2cb227ae31af33e65705459cd95b1009, semuploadlocal nemprodução.
Deploy dpl_Be3p7qSESU5F2mLtUj7PvZLVYWMU READY:
https://csbrasil-9ilpxlgox-rubenmarcus-projects.vercel.app
Alias https://csbrasil-git-v2-invasao-javaporcos-rubenmarcus-projects.vercel.app
Verificação autenticada via Vercel MCP:200 em maps.js deambos, conteúdoJS
idêntico18617caracteres com3ids/helper; alias serve wrappersRural/Vila200,
refúgios comcota3.55 e superfíciesescada200, terreno comPASSO200, /maps200
comRural District/Forest Village. Nenhumsharetoken/credencial salvo noGit.
Técnico pronto para teste do usuário; NÃO aceite visual/fps global ou MP real.
Pendentes preservadas: recuperação do EgoTaskSpace16 aguarda resposta já pedida;
semcriaroutro/tocarspacesalheios. Isso bloqueia inspeção/integração dos3pilotos
Mint e capturas reais3:2 dosnovosmapas/mobileloading. Pilotos apenas solicitados,
não baixados. Previews JPG novos ainda artecompartilhada temporária, semcapturas.
Próximo: usuário testa o preview; com autorização de recuperação Ego, retomar
Mint+QAvisual/orçamento dos3mapas; depoismultiplayer realE/B/J e restante do
objetivo amplo no topo do ledger. Semmerge, semdeploybackend/producão.

## Nova prioridade do dono — Gauntlet Cidade (31/10/2026)
Substitui a frente de3mapas: Rural/Vila ficam adiados e fora da seleção/rotação,
preservados no registro/oficina. Trabalhar só Cidade Invadida.
Objetivo completo: torre existente acessível por escada e tiro3lados; casas com
entrada/janelas úteis; materiais das rampas laterais melhores; armas espalhadas
na cidade; horda inteligente com trajetória curva/imprevisível e animação viva;
silenciar falas políticas/vinhetas nesse modo; card visível no lobby, wallpaper
novo com GPT, modal de anúncio na entrada; sala oficial exclusiva Javaporcos,
4–8jogadores, kills+avatar da horda no placar. SP4–8defensores com bots explícitos,
MP4–8humanos conforme contrato backend. Publicar preview ao concluir marcos.
Definition of done: RED→fix→GREEN+mutantes, revisão crítica independente, QA
real3:2/movimento (não só Node), previewREADY/JS servido confirmado; sala real
validada com clientes e sem anunciar disponível quando protocolo incompatível.
Baseline ef8d4ab75, preview runtime dce8b50a2. Três frentes isoladas por símbolo:
cidade_geometria possui módulos cidade/interiores/refúgios/map_invasao integração;
horda_inteligencia possui moverPara/steering/animação mode_javaporcos; root possui
UI/áudio/maps/main/game integração/placar(montarHudDominio/atualizaHud/renderScoreboard).
servidor_javaporcos prepara backend em csbrasil-backend/wt/javaporcos-oficial-20261031,
branch feat/javaporcos-oficial-20261031 baseadaorigin/main2e96f71+3commitsNPClegados.
Backendroot sujo e laneNPC pronta são preservados. Sembackendprodução até revisão.
Servidor ativo observado temprotocolos1–6, cliente horda exige7: não confundir
previewfrontend com sala funcionando. Nova autorização Ego solicitada (espaço16
perdido); aguardar resposta, sem recriar/tocar outro espaço como atalho.

### Marco de integração local — Cidade31/10, antes do checkpoint

Geometria: torre36degraus/2lances/plataforma6.20m com subida+descida sem salto e3raios livres;4casas abertas. Novo percurso físico completo das4casas expôs caçamba diante da LS-oo; deslocada x27.6→31.2 com saque ainda alcançável. Baseline5/5+5mutantes e interiores7/7 verdes; relatório `docs/maps/javaporcos-gauntlet-cidade-20261031/geometria.md`.24pickups/10zonas, rampas madeira comUVpor metro. Ainda sem aceitação visual real.

Root: seleção/rotação pública sóCidade; Rural/Vila preservados parados. Sfx por modo silencia falas/vinhetas sem desativar efeitos; restauração do modo normal testada. Placar coop temJ comavatar/reais kills; MPwelcome.cooperative configura2lados e roster ignoraJ nos personagens humanos. Novidade do lobby+card usam novo wallpaperGPT. SP4–8 explícitos você+bots com corpos reais4/8 medidos, sem alterar settings de outros modos.

Validação root:6/6 syntax/mapasparados/mapcontrato/sonda/personagem-escolhido/audiofurollback, `npx astro build`20.41s verde, interface com corpos4/8/avatar/kills/silêncio/seleção verde e3mutantes detectados, redepersonagemJ baseline/mutante verdes. Logs `/tmp/jav-cidade-focused.log`, `/tmp/jav-cidade-ui-corpos.log`, `/tmp/jav-cidade-netpersonagem-final.log`, `/tmp/jav-cidade-astro-build.log`.

IA: percurso/flancos/obstáculos/apoios e intenção verdes, corrigido teste de rumo que comparava destinos diferentes. Perf integrada `/tmp/jav-cidade-perf-integrada.log` REPROVADA(.784ms média,1.670ms p95 com64); reaberta otimização estrutural, semafrouxar limites. Não aceitar só repetição verde.

Arte: `public/img/javaporcos-cidade-gpt-20261031.webp`1920×1080/hash emFONTE.md. OpenRouterGPTfalhou2vezes; saída verdadeira éGPTImage nativo da sessão, modelo exato nãoexposto, original preservado. Inspeção de arquivo concluída; ainda falta asset-review comcaptura naUI.

Backend preparado em943f4a3e67a20d80620f092ee399d1fbdfec3157 (local,sem push/deploy), árvoreprópria limpa, contrato salaJAVA/cidade/E8/NPC64/min4/pausa/v7 ecompatnormal1–6. TestesHTTP+9WSverdes, revisãoadversarial emcurso. GCP inventário falhou Reauthenticationfailed; usuário avisado para `gcloud auth login`. NóBRnormal permaneceintacto. TelemetriaDBainda normaliza horda comorounds, nãoalegar lançamento completo.

Bloqueios: recuperação EgoTaskSpace16 ainda aguarda autorização já solicitada; sem criarspace substituto/tocaralheios. Nãoequivaler Node/astro a captura real3:2/GLBsmovendo/orçamentoWebGL. Próximo: findings dos2críticos, perf IA, MAPCHECK Cidade amplo preservando consolidado, docsgerados, checkpoints/microcommits, gates/push/previewREADY.

Checkpoint áudio: `3ae3ae3a2`, política Sfx por modo + integração Game. Gate focado de áudio/interface e restauração normal verdes. Sem push ainda. Logs root preservados em `artifacts/javaporcos-cidade-gauntlet-20261031/integracao/`.

Checkpoint cidade: `1c41cc026`, geometria+teste5/5/5mutantes, independenteP2resolvido. MAPCHECKamploCidade emexecução; backup consolidado em `artifacts/javaporcos-cidade-gauntlet-20261031/map_check-before.json`. Checkpoint opções/solo/catálogo segueHEADatual, testeGamecorpos4/8verde; P3 resumoatualizado confirmado porreviewer.

Checkpointsroot: `af2ec6df1` seleçãoCidade/elenco4–8/settingscoop; `be1aed6d4` arteGPT/anúncio/card. CapturaUIreal/asset-reviewaindapendentes, commits preservam trabalho semdeclaração deaceite. Integraçãorede+personagensJ emcheckpointseguinte. Crítico clientconcluiu todosruntime+direçãoFIFO semfindingadicional, P3resolvido. PerfIApareada baseline1.336/p953.608 versusnova1.051/p952.365ambasRED; hostbunOMPexterno~700%. Não repetir atépassar, manterRED/UNKNOWN. FIFO4planos evita starvation64/64atéframe15; gatepersistenteemfinalização.

Checkpoint rede: `ebb7f985d`, roster/eventos J mantêm javaporcos e coop sóentradaE/DEFENSORES. Checkpoint IA/HUD/gates noHEADseguinte: direção7/7,horda36/36,5mutantesFIFO incluído; revisãoindependentefinal zeroachados pendentes. Teto deplanejamento4/quadro,FIFO64/64em16quadros. PerfRED/UNKNOWNpreservada, semaceitefinal/merge. UIcontroleB/aliadosgenéricos oculto no modo paraelenco4–8próprio.

Checkpoint IA/HUD: `00b4fa4b6`,7/7direção+36/36horda+5mutantes, FIFO persistente emteste. Gateinterface final incluindo3mutantes ecorpos4/8 passou69.9s na integração. RootMAPCHECKamploemexecução; suítes deacesso/interiores/intenção/passada emsequência. Autenticação Ego inventariada novamente: espaço16ausente, apenasspacesusuário/alheios; nãoadotados. Bloqueio visualpermanece.

### Gauntlet reaberto: MAP6 torre (antes da publicação)
MAPCHECK amplo Cidade terminou REPROVADO: MAP1 dentro0/submersos0,6escadas passam, MAP2/2B/4/5 passam; MAP6duasbordas de6.2m semguarda em[-17.5,-9.25],[-17.25,-9.25]. Tentativa de push foi interrompida antesdepublicar(db96ef763); somente8processosdescendentesdaGitpushprópria encerrados. Nenhum processo/lock alheio tocado. Falha preservada em `artifacts/javaporcos-cidade-gauntlet-20261031/mapcheck-cidade-bordas-red.{json,log}`; consolidado original19mapas restaurado byteabyte. Builder geometria reaberto para guarda+regressãoreal, depois MAPCHECKamplo novamente e gatespushinteiros.

Rootregressões:5gatesNode verdes(interface69.9s/acesso33.2s/rede11.7s/interiores44.2s/intenção22.0s). GatepassadaBrowser da primeira suíte foi cancelado durante esperadolock porque BASE nãohavia sido definido; não é falha funcional. Nova execução comBASE4333 eOUTpersistente estáaguardandolockglobal, pertencenteaoutratarefa e preservado. Não declarar6/6.

Backend final preparado/revisado em `3fa8c52d1ec92b897d2cc469b81f64af5364ec0a`: reviewer independente confirmou3findings resolvidos, nenhum novo evidenciado. Fixes e6a83f9(pausa),80e1c79(quickPvP),3fa8c52(horde nó/API/RPC/SQL). Migration `db/migrations/202610310001_horde_mp_mode.sql` PG14descartávelGREEN+3mutantes, nuncaaplicadaexternamente. OrdemDDL→API→canárioCLIENT_REFfinal→4browsers. GCPauth eEgoespaços aguardamrespostausuário; a pergunta 'o que preciso responder?' foi respondida comessasduas solicitações, seminferirconsentimento.

### Desbloqueio autorizado e QA real — 31/10
Usuário autorizou criar novo espaço Ego e confirmou login gcloud. Inventário readonly GCP passou: coro-solto-br RUNNING em southamerica-east1-a/e2-small; nenhuma alteração externa. Novo espaço exclusivo Ego29 `Codex · Javaporcos Cidade Gauntlet 31-10`, p1, substituição explicitamente autorizada. Reutilizar29, não criar outro.

Torre pós-fix: plataforma6m/vãos2lances/pisosDeclarados preservam solo comyRef; baseline6/6+6mutantes, interiores7/7, refúgios4/4, revisão independente sem achado. MAPCHECK amplo novamente em execução `/tmp/jav-cidade-mapcheck-torre-fix.log`, sessão73356; backup19mapas preservado, aguardar antes de merge do relatório.

QA real modal/lobby/loading/partida iniciou. Captura1320×880 `artifacts/javaporcos-cidade-gauntlet-20261031/modal-1320x880.png` recebeu asset-review independente aprovado no escopo desktop (sem alegar móvel/partida). Visual real revelou modal deslocado por reset global margin0 e seletores de lobby tradicionais: root corrigiu centralização explícita e controles horde4–8. Navegador confirmou seleção8 persistida, loading com8defensores e avatar Javaporcos; listas INIMIGOS/ROUNDS ocultas. Revisão independente do delta em curso. Captura inicial partida tem viewmodel visível, mas não é gate3:2 (viewport resetou); não aceitar orçamento/movimento com essa captura.

Regressão headless de passada comBASE4333 terminou bloqueada após12min aguardando lock global alheio. Não removeu lock nem iniciou browser próprio; não é falha funcional nem aprovação. PerfIA continua RED/UNKNOWN. Backend permanece local3fa8c52, sem DDL/API/deploy; plano canário isolado em preparação readonly.

Checkpoints pós-QA: ad95c9fb6 guarda/patamar e sexto mutante; f948b59ae controles lobby e centralização, revisão independente sem achado. Interface Node baseline+3mutantes terminou exit0; contrato de todos mapas MC1/2/3 verde. Registros `/tmp/jav-cidade-interface-pos-qa.log` e `/tmp/jav-cidade-contrato-torre.log`. Navegador alcançou torre real sem salto: pés6.380000007 vsalvo6.380000007,334subpassos pelo movimento real; vista1320×880 `torre-sul-final-1320x880.png`. As primeiras capturas 3lados usaram render direto e uma ficoupreta; não são aprovação3lados. Três linhas de tiro permanecem medidas no gatefísico. `horda-real-1320x880.png` mostraGLBs namata/arma/HUD;60RAFobservados jovem x52.387,z14.960→x44.007,z12.546 yaw−2.222→−1.555,sem provarqualidadefinal sóporvalores.
Backend plano readonly versionado1e9de6c (runtime3fa8c52), VPCnova proposta porque VPCexistente permiteSSH/RDPglobais. Ainda sem infraestrutura/DDLexecutados. Custo regional pendente de catálogo oficial.

Continuidade após QA: HEADa4ab30a19, frontend ainda NÃO publicado. EspaçoEgo29/p1 foi temporariamente para about:blank para descarregar cena e liberar recursos, não finalizado/recriado; reutilizar. Modalcentralizado real medido x200,y72.6875,w920,h734.625 em1320×880, captura `modal-centralizado-1320x880.png`. MAPCHECKfix PID72817/sessão73356 segueexecutando sobcargaforte (14minwall/57sCPU), log ainda sóboot; não encerrar nem declararverde. Aguardar, depois salvarresultado/mergecidadeem19mapas, gatespushBASE4333 e previewSHA novo.

Plano backend recebeu P2 independente: MP_OFFICIAL_ROOMS não bloqueiaPOST/rooms dePvP; builder instruído a adicionar restrição explícita nódedicado comRED→GREEN, preservandonormal. CotaçãoAPIcatálogo emcurso semativarserviços. Backendnão estálive e nãoháautorizaçãoinferida paraDDL/criaçãodeVM.

Backend após revisão final: runtime `c03b85f4b7c24a1b82e3de4de9f60a62a60e319f`, documentação em `28a4c164528e8b6e68288e0eec0f06a45874b0fa`. A política `MP_DEDICATED_MODE=horde` bloqueia POST /rooms antes de alocar Game, fixa JAVA/Cidade e restringe quick play, catálogo e health. O comportamento normal misto permanece. Régua HTTP leve: RED 200 indevido → GREEN 403, com mutantes detectados; revisão independente sem novo achado.

O plano e o JSON de preços estão em `docs/JAVAPORCOS-CANARIO-PLANO-20261031.md` e `docs/JAVAPORCOS-CANARIO-PRECOS-20261031.json` no worktree do backend. Estimativa derivada dos SKUs oficiais de São Paulo: US$26,06/730h, aproximadamente US$0,86/dia, sem tráfego, logs, build e impostos. A autorização para recursos faturáveis foi solicitada e permanece pendente; nenhum recurso externo foi criado. CLIENT_REF candidato: `a4ab30a19c473f524ac76f5c4a5b22ecbea887be`, condicionado ao MAPCHECK e à publicação no Git remoto.

O MAPCHECK amplo ficou cerca de 59 minutos de relógio para 1m25s de CPU, com NI0 e política de segundo plano. Root aplicou `taskpolicy -B -p 72817` somente ao PID próprio verificado (`node tools/eval/map-check.mjs invasao_javaporcos`); a utilização de CPU subiu. Nenhum processo ou política alheia foi alterado. A régua continua ativa, ainda sem resultado final. Próximo passo: aguardar MAPCHECK → preservar relatório e atualizar apenas Cidade no consolidado de 19 mapas → commit → push com hook completo e BASE4333 → confirmar preview READY e JavaScript do SHA novo.

### MAPCHECK amplo aprovado após correção da torre
Execução final terminou exit0: MAP1 dentro0/submersos0; seis escadas MAP3 aprovadas; MAP2/2B/4/5 aprovados; MAP6 zero bordas altas sem guarda. Evidências persistentes: `artifacts/javaporcos-cidade-gauntlet-20261031/mapcheck-cidade-torre-green.{json,log}`. Atualizado somente o registro Cidade no consolidado de19mapas, preservando os outros18 e todos os critérios. Próximo: commit do relatório e gate completo de push, sem bypass.

### Preview publicado e régua de CPU encerrada — 31/10

Push autorizado concluído sem bypass: hook completo aprovado em 415s; remoto `v2/invasao-javaporcos` confirmado em `a8892e1e2564e41a0556944db0db302ccbb3bc70`. Log persistente: `artifacts/javaporcos-cidade-gauntlet-20261031/integracao/push-final.log`. Snapshot parcial dos gates individuais preservado como `prepush-progresso.log`; o hook removeu seu log ao terminar, portanto esse snapshot não contém a conclusão. O log final do push confirma aprovação integral.

Vercel READY: `dpl_Cynq1YHuas6LWP2JK2NEiKbqE67i`, projeto csbrasil, target preview/null, SHA exato a8892e1e2. Alias: https://csbrasil-git-v2-invasao-javaporcos-rubenmarcus-projects.vercel.app . Fetch autenticado confirmou HTTP200 e conteúdo novo de main, torre, modal e version/SIM_HASH. Metadados seguros em `artifacts/javaporcos-cidade-gauntlet-20261031/preview-ready.json`. Nenhum deploy de produção ou merge.

Uma única nova medição de CPU foi justificada pela mudança observada de política de execução: shell próprio em foreground (`taskpolicy -B -p $$`), mantendo limites e código. `npm run eval:javaporcosperf` terminou exit0: 64 vivos, média0.516ms/p95 0.928ms, dentro dos limites0.75/1.5; mutante teto-furado256 vivos reprovou p95 5.865ms como esperado. Log persistente `integracao/perf-foreground-final.log`. RED anteriores sob restrição de background permanecem na evidência; esta conclusão vale para o arnês sintético de CPU do modo, não FPS/render/rede em máquina de jogador.

Limites visuais: o espaço Ego29 desapareceu ao tentar abrir o preview publicado. Não foi recriado, adotado outro espaço nem houve fallback de navegador. Guia `ego-browser skill` exige “stop and ask the user” para substituir espaço inesperado. Capturas e interações locais reais já descritas continuam válidas; abertura visual no preview remoto, escada/rampas em múltiplas vistas, fluidez integral e aprovação humana do dono permanecem pendentes. Regressão headless de passada ficou bloqueada pelo lock global de outra tarefa (não removido). Não declarar Gauntlet visual inteiro ou PR pronto para merge; CodeRabbit do novo HEAD também não está concluído.

Servidor: runtime backend c03b85f; plano/ledger com CLIENT_REF final a8892e1e2 no checkpoint documental932be8e. GCP autenticado, inventário somente leitura; canário pago (~US$26.06/730h mais tráfego/logs/build/impostos) aguardando autorização explícita já solicitada na UI. Não houve VM, DNS, API, DDL ou deploy de backend. Próximo passo dependente: autorização do canário, então seguir plano revisado e validação real de4clientes. Próximo passo visual: dono testa o preview; para retomar automação Ego, solicitar autorização de substituição do espaço desaparecido conforme guia.

### Checagem visual publicada — 31/10, TaskSpace30

Pedido explícito de checagem autorizou substituir o espaço desaparecido. Preview a8892e1e2 aberto no Ego30/p1 com acesso protegido do conector; nenhuma configuração alterada. Capturas reais 1320×880 em `artifacts/javaporcos-visual-preview-20261031/`, relatório `docs/maps/javaporcos-gauntlet-cidade-20261031/visual-preview.md`. Modal/lobby/placar/AK estabilizada aprovados no escopo observado. Torre alcançada sem salto pela física real (6.38m), quatro interiores alcançados (3m); pilares e janela para parede vizinha limitam a comprovação de posições de tiro. Crítico independente confirmou os limites. Loading capturado cedo demais foi rejeitado; fluidez/ataque/lixo/loop de morte e demais armas continuam sem aprovação visual completa. Espaço30 finalizado. Nenhum runtime alterado, preview permanece a8892e1e2; checkpoint apenas documental local. Canário pago continua aguardando autorização, sem qualquer ação GCP/DDL/backend. Próximo: corrigir/validar campos de tiro e completar captura contínua de animação/loading; manter restante do objetivo e gates já registrados.

### Release autorizada após gates — 31/10

Dono autorizou merge e release condicionados à aprovação das pendências. PR1160 foi redirecionado de fix/boot-gate-cause-20261028 (PR1157 fechado sem merge) para main. Integração local 58a13cfba preserva 17 commits atuais da main, versão alpha.130, client-id e diagnóstico de boot; conflitos resolvidos só em version.js e boot-orcamento-check. Não houve merge remoto/release ainda. CodeRabbit não tinha reviews/comments/threads; solicitada revisão completa em issuecomment6541263396, ainda aguardando.

CI remoto a8892e1e2 está RED em MAPAUD: subprocesso map-check morto em900.1s sem relatório fresco. Não é falha geométrica identificada. Revisor readonly confirmou freshReport correto e ausência de perfil. Instrumentação mínima início/fim por mapa adicionada localmente; perfil completo em execução sessão86134, log artifacts/javaporcos-release-20261031/map-profile.log, backup do consolidado map_check-before-profile.json. Não executar outro escritor desse relatório em paralelo. Não aumentar timeout sem medição nem reduzir critérios.

Novo espaço Ego31 exclusivo da release (Ego30 foi finalizado normalmente), p1 no preview atual a8892e1e2. Capturas válidas 01-loading.png com avatar Javaporcos e 02-intro-automatica.png, entrada automática comprovada antes de existir window.__game com debug=1&hordeintro=1. Debug sozinho pula introdução por design. Amostragem contínua do movimento em curso; primeira tentativa não tinha boars ainda e foi rejeitada, sem aprovação. Espaço31 ativo, reutilizar. Próximo: concluir perfil e movimento, corrigir CI, push integral sem bypass, CodeRabbit no HEAD final e crítico adversarial do diff inteiro; só então merge e release pelo workflow release.yml com main verde. Canário pago GCP continua sem autorização financeira específica e sem ação.

Milestone visual adicional: loading e introdução reais capturados e vistos. Retrato Bandeirante terminou carregado no fallback avatars256px; captura anterior apanhou o carregamento transitório. Movimento real mostrou ataque, dano100→5→morte e respawn100; não prova fluidez completa. Ícone de rifle no ataque PRESA foi reproduzido no jogo e na régua nova javaporcos-killfeed-check (RED preservado); corrigido para duas presas em SVG, baselineGREEN e mutante arma-de-fogoRED esperado. Navegador local4333 confirmou HTML e captura03-presas-feed-local.png; servidor3152 pertence a esta worktree. SIM_HASH regenerado c3c81fa7eb7f3da7; contrato backend congelado anterior está agora obsoleto, deve ser atualizado antes de qualquer build multiplayer. Push inicial foi cancelado por root para incluir correção visual; nenhum bypass de hooks. Perfil geométrico continua ativo e exclusivo.

### Parada da passada: RED real e correção validada

Régua no Ego31 reproduziu deslizamento XZ ao parar nas quatro variantes (0.0000286–0.0024773m). O corpo ainda acomodava a pose e a pata em balanço era reprojetada pela transformação nova. Agora cada rig preserva a última posição mundial das patas e só baixa Y durante a acomodação. Não foram alteradas tolerâncias. Corrigido também o instrumento: fixar LOD próximo antes de selecionar vértices e rejeitar troca de geometria durante a medição.

Jogo real local: quatro variantes × baseline e três mutantes, todas as baselines com apoio240/240, retomada120/120, acomodação verdadeira e deslocamento parado <4e-15m; todos os mutantes detectados, incluindo parada-desliza que restaura o defeito anterior. Mais oito cenários com passos0.005/0.013 passaram, máximo4.45e-15m. Evidências: artifacts/javaporcos-release-20261031/passada-{red-corrigida,cache,fases,perf}.json. CPU visual sintética de64: mediana0.1ms/p950.2ms, igual ao comparador rígido nessa resolução; não representa FPS completo. SIM_HASH novo b42d756be1b220ca, backend congelado continua obsoleto.

Correção da evidência anterior: 03-presas-feed-local.png foi rejeitada por transição verde; 04-presas-feed-local.png comprova apenas o ícone UI, com cena preta porque o render foi pausado cedo. Não usar essas imagens como aprovação visual integral. Perfil MAPAUD continua ativo e exclusivo em lajes; nenhum merge ou release enquanto CI/revisões estiverem pendentes. Próximo: terminar perfil, corrigir gargalo com critérios preservados, push completo, CodeRabbit e crítico adversarial, CI/preview e release autorizada. Canário pago continua pendente de autorização financeira.

### Push das correções e nova CI

Remoto confirmado ff0a520973d176f64664a40950e6f50ee39a6d8f após hook completo552s, sem bypass. Log push-passada.log. Nova Vercel dpl_F62MdYwg3B3yfy5jvdzt2Md8BGLj em build; nova CI em execução. Revisão CodeRabbit solicitada novamente no HEAD em issuecomment6541470257, ainda sem resposta. PR1160 atualizado para o escopo Cidade Invadida e limites de multiplayer/validação atuais.

Perfil remoto da main364be45bb: CI41184913064 verde e map-check687.1s (exit1 geométrico existente, invariantes verde). Perfil local ainda executando: Lajes921.37s de relógio nesta máquina sob carga; amostra CPU apontou raycasts do MAP4, linha586. Experimento isolado calcula boundingBox de malhas estáticas, sem mexer no código versionado ou no relatório compartilhado: map-bbox-candidate.mjs lajes, saída map-bbox-lajes.json em artifacts/javaporcos-release-20261031. Não adotar antes de comparar resultados. Perfil original6322 continua único escritor do consolidado. Inspector local9229 foi aberto só no PID próprio para obter stack/CPU, sem alterar estado do jogo auditado.

Capturas controladas de passada-aberta-{0,1,2,3}.png vistas: javaporco reconhecível, poses de patas distintas e apoio estável na rua, 1320×880. As tentativas passada-real e passada-controlada tiveram câmera coberta pela casa ou reposicionada pelo loop e foram rejeitadas para aprovar a animação. São poses controladas, não prova de fluidez contínua. Ego31 local está pausado; recarregar antes de jogo normal. Próximo: concluir auditorias, CI e revisão atual, crítico adversarial completo após CodeRabbit, então merge e release autorizados.

### Arsenal em primeira pessoa verificado

No jogo real local4333, API de QA existente equipou cada uma das26 armas do catálogo e avançou60frames reais antes da captura. Todas apresentaram mount autorado ativo (25 armas) ou melee dedicado ativo (faca), com scopeCovered=false e fallback=false. Capturas1320×880 arma-{id}.png, estados armas-visibilidade.json e folha armas-contato.jpg em artifacts/javaporcos-release-20261031. Folha vista integralmente: todos os modelos aparecem, AK com material visível; esta validação cobre arma estabilizada em hip, não todas as animações/ADS/recarga.

Preview do SHA ff0a520973d176f64664a40950e6f50ee39a6d8f está READY em dpl_F62MdYwg3B3yfy5jvdzt2Md8BGLj, alias habitual. CI41187084729 iniciou invariantes e réguas/site. Nenhum merge/release ainda. Próximo: comprovar o mesmo preview e concluir MAPAUD/CI/revisões.

Preview ff0a52097 foi aberto no mesmo Ego31/p1 e executou o jogo com24 javaporcos. Import real version.js confirmou SIM_HASH b42d756be1b220ca. Repetida a régua com GLBs reais no preview: quatro variantes, apoio240/240, retomada120/120, acomodação verdadeira, deslizamento parado máximo2.67e-15m. Evidência passada-preview.json. O callback da régua pausou e substituiu g.update; recarregar p1 antes de jogar normal. CodeRabbit ainda tem0 reviews e não respondeu às duas solicitações; nenhum sinal verde inferido dessa ausência.

### Comparador MAPAUD estático sem afrouxar critérios

Experimento de boundingBox em Lajes terminou exit0:725.09s de auditoria/725.98s real,170.23s CPU, contra921.37s real na execução original sob carga. Não é benchmark isolado de runner. O objeto inteiro do relatório de Lajes é idêntico ao consolidado anterior (isDeepStrictEqual=true,0campos diferentes). Adotado apenas o cálculo de boundingBox para Mesh estático sem skin/morph antes das sondas; isso ativa o descarte exato que Mesh.raycast do Three já implementa. Sem trocar triângulos, diminuir sondas ou mudar tolerâncias. Perfil original continua usando a versão já carregada, em Cidade, e é o único escritor do consolidado. Evidências map-bbox-lajes.{json,log}, candidato isolado e map-hotspot.cpuprofile.

Revisor adversarial readonly /root/reviewer começou cobertura integral de276 arquivos e limites do PR enquanto CodeRabbit está sem itens/resposta. Essa antecipação não representa review do CodeRabbit e deve ser atualizada depois de eventuais achados novos; entrega ainda exige as duas etapas. Réguas/site da CI41187084729 já verde; invariantes em execução.

### Revisão adversarial integral: seis achados confirmados

/root/reviewer cobriu todo inventário/diff e limites (276 arquivos), incluindo consumidores/proveniência dos binários. Achados: P1 HUD MP congelado; P2 mordida atravessava parede; P2 marcha ignorava master; P2 filtros CTF omitiam Praça/Piscina; P2 mutante intro-race caía em ReferenceError da fixture; P2 OBJ3 confundia estado local com snapshot recebido. Nenhum sétimo achado. Sem execução própria de testes/browser; isso não substitui CodeRabbit, ainda sem review. Solicitarei rechecagem das correções finais.

HUD: updatePresentation online agora atualiza HUD sem passoHorda. RED em teste e preview (state38%/7, DOM17%/3); GREEN em teste e navegador local (DOM38%/7, aguardando3/4, barra38%, estado inalterado). Mutante hud-rede-congelado detectado. Capturas hud-rede-corrigido/render comprovam UI somente: cena preta após resize com update pausado, não aprovação de render integral.

Mordida: raycast reutilizado do focinho ao corpo contra world.rayOccluded/occluders, antes do dano. Parede fechadaRED reproduzido antes da correção; GREEN parede bloqueia e vão aberto atinge. Mutante morde-parede detectado. Navegação continua se bloqueado, sem consumir cooldown de ataque.

Áudio: marcha liga os72 gains em sfx.master, preservando volume e limiter; AudioContext ou master ausente degrada para silêncio. RED do grafo antigo preservado, baselineGREEN e mutante marcha-sem-master detectado. Evidências hud-rede-{red,green,mutante},mordida-{red,green,mutante},marcha-{red,green,mutante}.log em artifacts/javaporcos-release-20261031. Push da otimização db foi cancelado antes de enviar para incluir esses achados. Remoto/preview aindaff0a52097; nenhum merge/release.

Cobertura CTF restaurada: !objectiveMode substitui ctfMode (que é apenas modo inicial). Baseline ctf-labels e ctf-win exit0 incluindo Praça/Piscina. Mutante vaza antes exit0 indevido; depois exit1 e CTFL1 em Piscina como esperado. Logs ctf-{labels-green,win-green,vaza-antes,vaza-depois}.log. Intro-race recebeu fixture ehMapaJavaporcos, valida localização do trecho e exige eventos ready/hide/intro no mutante; baseline0, mutante0 detectado corretamente, sem ReferenceError. As duas correções afetam instrumentos, não gameplay.

### OBJ3 e ligação das regressões à régua

OBJ3 agora instrumenta somente a resposta de netgame.js no navegador de QA: registra o payload e o resultado depois da chamada real de applyNetState, no mesmo tick. Não há métrica/campo de produção. Estado local inicial idêntico ao payload não basta. Novo teste executa a classe real em VM: consumo1 passa, omissão0 falha; tick errado e objetivo vazio rejeitados. Sintaxe do arnês passou. Partida MP real não foi executada nesta etapa. Os três mutantes HUD/parede/master e o teste OBJ3 foram ligados a eval:javaporcos. SIM_HASH runtime atual97f50aeceda56123; referência de backend anterior continua obsoleta.

CI41187084729 confirmou novamente MAPAUD sem relatório após900s; restantes réguas/site e DCO verdes. Não é evidência de regressão geométrica. Perfil local original continua ativo, agora em distrito_rural, único escritor do consolidado. Nenhum merge/release executado. Próximo: revisor no HEAD corrigido, sondas reais parede/master, terminar perfil e resolver orçamento/CI com critérios preservados, push completo e reviews, então merge/release autorizados.

Rechecagem do revisor aceitou cinco correções e detectou OBJ3 comparando evidência com a própria cópia antiga. Corrigido o call-site para capturar net.snap atual e evidência sincronamente; polling até15s aguarda consumo do tick atual. Unidade executa o mesmo coletor e rejeita snapshot tick8 com consumo tick7. Incluído sem-objetivo na whitelist do arnês. Baseline unidade/sintaxe verdes; MP real ainda não rodado.

Sondas no Ego31 local, SIM97f50aeceda56123: parede sólida da primeira casa bloqueia mordida=false e porta real permite=true. Grafo AudioNode real com volume0:72gains,72conexões ao master,0diretas ao destination, master.gain=0. Instrumentação restaurada depois; sem prova auditiva de qualidade a partir desse teste.

### Orçamento da auditoria completa

CIff0 gastou358.62s só em Lajes e morreu aos900.2s durante Cidade; main17mapas levou687.1s. Perfil original local também confirmou novos custos separados (Cidade627.91s, Rural468.22s, Vila ainda executando sob carga compartilhada). Ampliado apenas timeout do subprocesso para1500s e job de invariantes para30min (teto da casa), mantendo todos21mapas, amostras, limiares e falha de relatório ausente. AABBs estáticos já comparados sem nenhuma diferença em Lajes. Testes fresh-report5/5 e workflow-timeout verdes. CI real no novo HEAD decidirá se orçamento basta; não inferir verde local. CodeRabbit ainda sem review.

### Régua da horda no CI e mutante de contorno atualizado

Adicionada eval:javaporcos ao job reguas-e-site: as novas regressões deixam de depender de execução manual. O comando integral revelou sem-contorno inoperante: desligava apenas a recuperação antiga, enquanto direcaoDaHorda ainda planejava desvios. Atualizado o mutante no caminho fluido real. A fixture anterior também permitia trocar de alimento e creditava comida tocada por outro bicho; agora mede moverPara/revirar do mesmo animal até a feira fixa através do muro. Baseline passou sem alterar prazo10s, limiarz13.4 ou dano esperado. Mutante agora falha exatamente nessa cláusula (para emz14.58); não é defeito de gameplay baseline. A fixture de limite8KB sempre enche a horda completa, sem encolher sob horda-magra e gerar TypeError por falta do10ºanimal. Testes workflow-timeout e segurança verdes. Push anterior foi cancelado antes de enviar para incluir essas garantias. Suite completa será repetida no novo HEAD; nenhum merge/release.

Captura cidade-final-runtime.png foi vista em1320×880 com render normal, arma/HUD/cidade/horda visíveis e34javaporcos vivos. Não confundir com as capturas anteriores de UI sobre canvas preto.

A repetição integral também detectou falso verde em sem-desistencia: a fixture contava qualquer passagem por setor, mesmo antes de tentar o alimento cercado. Agora esgota outros alimentos após abrir a onda, limpa memória pré-teleporte, fixa o ponto cercado e só conta quem marcou esse alvo como evitado e depois foi ao setor. BaselineGREEN; mutanteRED exatamente0/11desistentes em20s. Nenhum limiar afrouxado, nem nova alteração no runtime. Mutantes restantes do domínio/rede foram executados em sequência sem parar no primeiro e estão detectados. SIM atual80a8daee19ed11da. Push anterior cancelado antes de enviar; suíte integral e novo push completos a seguir.

### Perfil geométrico concluído e regressões expostas

Auditoria original terminou21mapas sem erro de carga:3729.46s real sob concorrência,921.60s CPU. Log map-profile.log; relatório preservado map-profile-final.json. Cidade e demais mapas de cenário (exceto Ferro integrado da main) idênticos ao baseline anterior; Rural/Vila agora medidos. map-check exit1 agrega dívidas geométricas existentes, não é o veredito do portão. Aplicação isolada das cláusulas reais ao relatório apontou duas críticas novas: MAP2 Vila/E Δ.32m e MAP4 três telhados; CTF1/MAP2B continuam dívidas registradas. Essa análise usa LSP1 anterior e não equivale à CI integral. Artefato geometria-relatorio-vereditos.json. O relatório compartilhado foi restaurado ao baseline depois de preservar a medição, sem outro escritor ativo.

Correção do diagnóstico inicial de MAP4: não eram caixas invisíveis além do telhado. Os occluders eram as próprias malhas visíveis; amostras exatamente na aresta (u+v=1) perdiam o hit após transform inverso por precisão numérica. Diagnóstico real roof-diagnose.log reproduz misses na própria face. Novo amostraBaricentrica mantém grade e quantidade e recua só margens<1e-7 baricêntrico para dentro do mesmo triângulo; alcance0.7m, tolerância0.35m e limiar10% preservados. Unidade usa geometriaFloat32 real rotacionada/transladada:900hits corretos e controle borda-exata reproduz falha. Diagnóstico corrigido com amostragemMAP4 mostrou0/38misses nos4telhados sondados. Teste ligado à régua da horda/CI. Não foram alterados telhados/colisores.

MAP2: último slotE da Vila z17→16.4, só ambientevila, preserva Cidade/Rural. Baseline tres-mapasGREEN e mutante spawn-desnivelado restabelecendo17 detectado no teto.30m, exit0 após checar causa esperada. fresh-report5/5 verdes. Revisor readonly não encontrou achado no delta inteiro. Tentativa de URL de Vila no navegador redirecionou para Praça, como esperado porque mapas extras continuam indisponíveis no produto; não declarar aprovação visual da Vila. Perfil isolado pósfix34778 em execução, escreve somente artifact map-vila-corrigida.json.

Suíte integral da horda no HEAD30aadb487 terminou exit0: baseline,28mutantes e OBJ3 (horda-final-completa-4.log). Novo delta contém só spawn condicionado/instrumento e seus testes; CI repetirá o comando integral. Push de30 foi cancelado antes de enviar porque a auditoria revelou esses bloqueios. Nenhum merge/release; próximo push completo, perfil pósfix/CI/CodeRabbit/preview, depois merge/release autorizados. Canário financeiro permanece pendente.

### Release: checkout limpo e auditoria corrigida (31/10)

- Push `3a268b87b` publicado após hook completo de 549 s. MAPAUD corrigido da Vila terminou com zero bloqueios invisíveis e desnível máximo de respawn E 0,29 m/B 0,18 m. Relatórios preservados em `artifacts/javaporcos-release-20261031/map-vila-corrigida.json` e `geometria-posfix-vereditos.json`; esta combinação local não substitui CI integral.
- CI `41190783773` expôs `ERR_MODULE_NOT_FOUND: three` no novo passo da horda: checkout limpo não tinha a ponte vendorizada criada anteriormente por outras réguas. O preparo foi extraído do arnês para `tools/eval/three-node.mjs`, compartilhado pelo arnês e pelas duas réguas que precisam dele. Sem mudança em runtime, mapas ou protocolo.
- Baseline da horda, OBJ3, amostras MAP4 e importação do arnês com 21 mapas passaram após a extração. Cópia isolada em `/private/var/tmp`, previamente confirmada sem resolução de `three`, iniciou a suíte completa com sucesso; aguardar seu resultado em `artifacts/javaporcos-release-20261031/horda-clean-completa.log`.
- Revisor independente leu o delta do bootstrap e a compatibilidade com `main` em `bee715af8`, sem achados. CodeRabbit solicitado em `3a268b87b`, ainda sem revisão. Próximo: publicar correção, conferir CI/preview no novo HEAD, resolver revisão e só então merge/release autorizados. Canário pago e multiplayer remoto continuam separados e pendentes.

- CI `41190783773`: job `invariantes` aprovado, incluindo MAPAUD amplo; `portao-browser` também aprovado. A falha no passo da horda já tem correção em `af3aefa5f` e suíte integral isolada exit0.
- Push de `af3aefa5f` foi bloqueado pelo hook: splash da régua híbrida não abriu em 180 s. Reprodução isolada confirmou a falha. Ela servia código local com status/MIME 404 da produção e omitira dependências novas (`maps`, equipe e áudio), misturando APIs de versões diferentes. A régua agora serve os dez módulos locais necessários com status 200/MIME JavaScript. Continua excluindo os mesmos módulos dos bytes de ambos os lados e mantém os tetos/ordem.
- Baseline corrigido: splash via assets em 3.879 ms, 7,16 MB/321 requisições, dentro de 7,82 MB/340. Referência baixou 22 cartazes contra zero sob demanda. Ambos os mutantes foram detectados nas cláusulas pretendidas: `cartaz-ansioso` ORC1/ORC2, `fauna-cedo` ORC1/ORC3. Log `artifacts/javaporcos-release-20261031/boot-localmod-final.log`, exit0. Revisor leu os dez módulos e não encontrou novo risco. Próximo: repetir push completo, CI e preview finais; revisão CodeRabbit segue pendente.

- O hook seguinte aprovou boot e demais checagens, mas PG1 bloqueou o novo helper: o fecho de imports do portão passou a incluir `three-node.mjs`. Incluído no gatilho do portão em `scripts/ci/gatilho.mjs`. Reprodução PG1 vermelha antes; baseline verde depois (261 arquivos do portão/235 do smoke), controle `tira-caminho` continua vermelho PG1/PG2.
- A `main` avançou para `00e746b5` via PR1180: removeu configuração CodeRabbit e restaurou `estraga-codigo` como reviewer padrão. Seguir a skill do projeto `.claude/skills/estragacodigo-loop/SKILL.md` do novo `main`: revisão real do HEAD, zero threads válidas e checks verdes. A solicitação de `estraga-codigo` já existe no PR1160; renovar após push. Crítico independente permanece como verificação adicional após revisão limpa.

## Revisão estraga-codigo 5722378083: publicação NC

Achado 4431420700 confirmado: embora sem uso no runtime, Saveiro Robust e BYD
novos estavam em public/. Ambos retirados da publicação, de mint-assets.json,
assetver e JOBS do gerador. Originais preservados somente na quarentena ignorada
artifacts/javaporcos-release-20261031/quarentena-nc/ com registro e SHA originais.
FONTE mantém autor, licença e URL, agora marcando uso não autorizado/quarentena.
Gol G2/Fusca legados dos outros mapas não foram alterados; seguem excluídos deste modo.
PAC6 reproduziu vermelho antes da retirada; baseline com 75 props passou depois.
Mutantes nc-publicado e sem-licenca reprovaram. Manifesto de assetrev atualizado
pelo gerador oficial e --check verde. Não é uma declaração de licença do acervo inteiro.

## Revisão estraga-codigo: contrato documental

4431420704: ficha corrigida para 136×136 m e bounds ±68, iguais a HALF=68 do relevo.
4431420709: tabela completada com oeste/nordeste/sudeste, mantendo as seis frentes
reais e suas rotas derivadas de EIXOS; nenhuma frente foi removida do runtime.
4431420715: brief de 29/10 explicitamente histórico/superado, com aviso de que áreas,
densidades e dez bocas antigas não são contrato atual; links levam à ficha/layout
ativos com seis frentes e arena ±68. spec check da ficha e diff --check verdes.

## Revisão estraga-codigo: resultado e regressão de empate

4431420689 refutado no fluxo real: _endMatch resolve objective.state.winner antes
 de roundsWon e sincroniza win/lose/draw antes de expor a tela. No preview, winner E
com rounds E0/B9 mostrou VITÓRIA e Defensores venceram; dados() não calcula vitória
pelas rodadas. Porém a investigação revelou outro defeito: observer v3 ignorava draw.
Régua resultado-estado-check executa o callback real extraído: vermelho antes,
verde depois; mutante sem-empate reprova. Compartilhar empate também reproduzido
vermelho e corrigido, com tradução EN. Régua ligada ao eval:ui-v3.
No jogo local real via Ego31/p1, _endMatch draw exibiu card visível EMPATE em 1320×880;
captura empate-local-depois.png no diretório ignorado de release. Tentativa anterior
de hotpatch blob no preview foi bloqueada por CSP e NÃO é evidência de sucesso.
UI-v3 revelou duas cores do card novo fora da paleta: substituídas pelos tokens
existentes painel/âmbar, sem mudar geometria. Baseline UI 10/10 e dez mutantes
passaram. Revisão independente achou compartilhamento e quebra de tabela; ambos corrigidos.
Merge/release ainda não feitos; aguardam push, CI e revisão do novo HEAD.

## Segunda revisão estraga-codigo 5722453835

Quatro achados sobre 00cede9c6. 4431484854/4857 confirmados: contrato ainda tinha
3 clareiras e grade233. Corrigido para seis ids explícitos e273×273 Float32,
298.116 bytes, derivados de HALF68/PASSO0,5. Medição antes divergente/depois igual;
restaurar grade233 ou três clareiras em memória reprova a comparação. spec verde.
4431484848 refutado: importAudioProbe converte relativos em file: absolutos, que
são importáveis de data:. Node26 importou Sfx real; envelope/rollback/seleção de voz
passaram. Mix carregou e falhou MIX11/MIX15, reproduzidas identicamente com fontes
da main00e746b5 em diretório temporário; não são erro de importação nem novos
registros KNOWN-RED. Não alterar música aprovada para satisfazer expectativa antiga.
4431484852: filtro sugerido não executaria AK GPU, pois workflowUbuntu não chama
essa régua Metal/macOS. Validação GPU local e três mutantes estão no pedido5 e em
docs/viewmodels/ak-manga-quantizada-20261030.md. Não alegar cobertura GPU em CI.
Revisor independente confirmou ambas as refutações e as duas correções documentais.
Régua completa de mapa agora repetida: CHAO1/HORDA1 verdes; JANELA1/TRILHA3 vermelhas.
Investigação em curso: janelas reais substituíram decorativas e consulta de terreno
sem yRef pode retornar laje. Não declarar régua integral verde enquanto não corrigida.

## Régua atualizada para casas abertas e refúgios

RED preservado em review2-mapa.log: 31 janelas decorativas contra piso40; sete
retalhos comparados à superfície elevada, pior3,93m. Causa confirmada por fonte e
sondas: quatro casas acessíveis substituem decorativas por20 aberturas físicas.
JANELA1 agora verifica nove raios livres por vão e testemunhos sólidos no peitoril
/verga; mantém piso40 no total, vidro1:1 nas decorativas, grades/recuo/passo intactos.
TRILHA3 consulta terrainHeightAt, o mesmo campo de altura que constrói os decalques,
sem confundir chão sob refúgio com laje. groundHeightAt/física existentes preservados.
Novo contrato documentado. Nove sondas e tolerância0,12m mantidas.
Régua completa exit0: 31 decorativas+20 vãos,25 gradeadas,834 retalhos,pior0,080m.
Mutantes janela-real-cega,janela-cega e trilha-degrau detectados: o último deixou
729/834 retalhos fora, pior1,84m. Logs no diretório ignorado de release.
Diagnóstico separado por raycast da malha visual coarser chegou a0,147m em dez
retalhos; não é o contrato de campo testado por TRILHA3 nem aprovação visual exata.
Ficha também atualizada com quantidades medidas: seis lojas,25 comidas(11 ração)
e11.832 nós/21.158 arestas. Revisor read-only sem achados nesta correção.
SIM_HASH regenerado oficialmente:4eb60379c5b2650a. Servidor dedicado antigo precisa
acompanhar esse ref antes de build/deploy posterior. Merge/release ainda pendentes.
