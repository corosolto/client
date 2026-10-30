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
