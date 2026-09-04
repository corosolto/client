# SCRIPTS.md — o porquê de cada comando npm

Extraído das chaves `//nome` do `package.json` (migração de 18/08/2026).
O comando completo e sempre o valor da chave homônima no `package.json`;
aqui mora só a documentação — intenção, dependências e armadilhas.

## `prune-dist`

T2. Roda no fim do build, tira as bancadas locais e, salvo KEEP_FPVM=1, models/fpvm do publicado. Poda dist e o espelho .vercel/output/static.

> script homônimo não existe mais no `package.json` — doc mantida por histórico

## `release`

Bump + CHANGELOG + tag num comando. A versão vive em package.json e version.js, e o ?v= do import map sai do package.json — este script mantém os dois em sincronia por construção. Existe porque com commit direto na main o `versao-bumpada` do pr-gates (que só roda em pull_request) passa ao largo, e o código chegou a alpha.35 com a última tag em v2.0.0-alpha.32. NÃO faz push: publicar é ação pra fora. Recusa árvore suja. `--seco` mostra sem escrever.

```bash
npm run release
```

## `setup`

T26. UM comando do `git clone` ao jogo inteiro: deps, wasm, pacote de áudio, acervo de decalques, e a asserção do T1 por cima. NÃO é cadeia de && — cada passo roda, o estado de todos é impresso junto, e a mensagem final diz o que fazer. Existe porque quem clona pega jogo mudo e com parede pelada (public/audio, public/img/decals e references ficam fora do git por procedência), e quem a gente quer atrair não debuga setup: fecha a aba.

```bash
npm run setup
```

## `prepare`

Ativa o hook nativo que acrescenta Signed-off-by com user.name/user.email em todo commit. Evita DCO vermelho por esquecimento sem trazer Husky; preserva core.hooksPath preexistente e mantém o CI como portão para clones sem o hook.

```bash
npm run prepare
```

## `docs`

Blocos NUMÉRICOS do README.md e de docs/ gerados do código (contagem de linhas, elenco, mapas, versões da stack, invariantes, skills). Existe porque um SKILL.md afirmava 3.234 linhas de game.js quando o arquivo tinha 6.427 — corrigir à mão dura um commit. `--check` está no check:fast: gerador sem portão desatualiza em uma semana.

```bash
npm run docs
```

## `prod:coherence`

Mede o que o EDGE está servindo, não o repo: baixa o HTML de produção, segue o import map e verifica que todo import nomeado existe como export no módulo alvo. Nasceu do apagão de 08/08 (cache split-brain: main.js de um deploy com fparms.js de outro — BUG-39). NÃO entra no check:fast (precisa de rede e de produção no ar); quem roda é o prod-watch.yml a cada 15 min. `--selftest` é a mutação que prova que morde.

```bash
npm run prod:coherence
```

## `eval:release`

Release preserva nome/créditos, DCO, docs e um único deploy automático pela main; o CLI fica manual. Mutantes: nome-antigo|semcreditos|semdco|semdocs|semrollback|deploy-duplo.

```bash
npm run eval:release
```

## `eval:drop`

procedência de DROP_TTL/DROP_MAX: acúmulo de armas no chão em regime

```bash
npm run eval:drop
```

## `eval:deps`

npm audit --omit=dev: alta/crítica fora da lista de isenção reprova (isenções nominais e datadas no deps-check.mjs). Precisa de rede — passo de CI, não do check:deploy.

```bash
npm run eval:deps
```

## `eval:escala`

procedência da escala dos veículos do estacionamento: bbox real do glb contra ficha de fábrica

```bash
npm run eval:escala
```

## `eval:prune`

KEEP_FPVM preserva só models/fpvm; as bancadas continuam podadas dos dois destinos publicados. --mutante=early-exit prova a restrição.

```bash
npm run eval:prune
```

## `eval:mapjson`

A régua do formato 'mapa como dado' (issue #210): sobe o mapa JSON pelo three do harness e confere grafo de waypoints conexo, aresta bidirecional e spawn na área jogável. --mutante=grafo|aresta|spawn prova que morde.

```bash
npm run eval:mapjson
```

## `eval:mapcontrato`

Todo mapa DO REGISTRO devolve o que o game.js CONSOME. Irma da eval:mapjson, que valida um spec JSON antes do build: esta valida o registro inteiro, inclusive os mapas escritos a mao. A lista de chaves nao e opiniao — obrigatorio = o jogo desreferencia SEM guarda (waypoints game.js:4157, nearestWaypoint :4292, findPath :4298); opcional = ha guarda com fallback (slowAt, groundHeightAt). Mutacao: --mutante=sem-waypoints. Mapa ainda nao registrado: --extra=arquivo.js

```bash
npm run eval:mapcontrato
```

## `eval:pickuparma`

Toda arma no chão é uma arma que EXISTE (BUG-70, crash em produção #366: um mapa declarava `weapon:'smg'`, que é CLASSE de arma e não chave de `WEAPONS`, e o prompt do [E] fazia `WEAPONS[w].short` sem guarda a cada quadro dentro do `update()` — olhar pra ela congelava a partida). PA1 lê a lista CRUA de `MAPS[id].build()`, antes da guarda de entrada do Game, mais o armário do spawn, e exige que todo id resolva em `WEAPONS` com `short`/`name`/`mag`/`reserve` (os campos desreferenciados sem guarda). PA2 planta o jogador em cima de cada pickup e chama o `_updatePickups()` de produção — a linha exata do stack. Mutantes: `smg|sem-short|sem-pickups`.

```bash
npm run eval:pickuparma
```

## `eval:parquewheel`

A roda-gigante gira em torno do cubo; assentos não invadem lateral, base nem aro. Mede pivô, deriva e folgas durante a animação; mutantes: pivo-base|lateral-verde|altura-baixa|aro-no-assento.

```bash
npm run eval:parquewheel
```

## `eval:velhooeste`

O mapa Velho Oeste preserva marcos, janelas de madeira abertas/fechadas, gênero, perigo e recompensas dos cartazes, retratos, densidade, colisões, spawns e rota. Mutantes: sem-saloon|sem-carrocas|sem-tumbleweed|sem-obstaculos-centrais|centro-aberto|sem-cartazes|sem-retratos|cartaz-sobre-janela|genero-unico|janela-verde|todas-fechadas|perigoso-unico|recompensa-repetida|sem-colisao-varanda|sem-colisao-movel|parada|texturas-genericas.

```bash
npm run eval:velhooeste
```

## `eval:penitenciaria`

Contrato jogável da penitenciária: celas abertas, pátio sem campo, arsenal central, caixas texturizadas, obstáculos densos, quatro guaritas e colisão. Mutantes: fecha-celas|sem-guaritas|sem-obstaculos|centro-aberto|sem-textura-municao.

```bash
npm run eval:penitenciaria
```

## `eval:vminspect`

O default do vm-inspect precisa ser uma arma publicada, existente e versionada. Nasceu do #141: o caminho antigo dava 404; a primeira correção apontava para o corpo do doador e mostrava pernas/botas. --mutante=fantasma|corpo prova as duas cláusulas.

```bash
npm run eval:vminspect
```

## `eval:pegada`

Colisor de prop na ALTURA DO CORPO (Brasília): recomputa a pegada dos GLBs (tent/stall/drinkstand/bus) e acusa deriva da tabela PEGADA_CORPO / PEGADA_BUS. Nasceu da reprovação de 05/08 ('box do ônibus e barracas') com o obb-check VERDE — ele compara contra a caixa declarada e não vê caixa mais gorda que a malha.

```bash
npm run eval:pegada
```

## `eval:dmgdir`

O arco de dano na borda da tela (_dmgArc) tem que apontar pro atacante, não pro lado oposto. Nasceu do relato do dono (BUG-52): tiro na frente desenhava o arco embaixo (COSTAS). Executa _dmgArc de game.js com o atacante nas 4 direções cardeais em 7 yaws da vítima; --mutante=ordem-trocada reintroduz a troca de operandos do atan2.

```bash
npm run eval:dmgdir
```

## `eval:ctflabels`

Bandeira com nome do PRÓPRIO mapa, declarada pelo mapa (defeito de 06/08: 'CONGRESSO' jogando na piscina — o fallback do game.js vazava os nomes de Brasília). --mutante=vaza prova que morde.

```bash
npm run eval:ctflabels
```

## `eval:faccao`

Cor de facção tem UMA origem (public/js/paleta.js) e ela cobre o elenco. Nasceu do dono jogando em 07/08: 'quando captura bandeira não pinta de vermelho e nem põe o brasão' — o rename Time E (06/08) trocou a letra em BRASAO e no arquivo e esqueceu COR_TIME, então bandeiraTextura('E') devolvia null e o pano saía sem cor e sem brasão. O mesmo rename passou batido em TEAM_RIM (contorno branco) e na faixa do peito (braçadeira azul). Nenhum dos três dá erro no console. Os três espelhos ACABARAM: game.js, brasoes.js e characters.js importam de paleta.js, e F2 impede espelho novo de nascer. Estava fora de TODO portão até agora — régua escrita e não pendurada é régua que não roda; entrou no check:fast, que é o gatilho certo (node puro, milissegundos). `--mutar=sem-e|espelho` prova que morde.

```bash
npm run eval:faccao
```

## `eval:mapid`

Id de mapa é NOSSO, e id antigo não morre calado. Os ids eram herança do CS 1.6 (awp_map e fy_pool_day são nomes literais de lá; fy_ é convenção de lá) enquanto os nomes exibidos já eram brasileiros — só o id carregava o CS, e id VAZA: vai gravado no banco (match.ts manda p_map em toda partida) e viaja em link (?map=fy_quebrada). Como resolveMapId devolve o mapa padrão para id desconhecido, link antigo não daria erro: abriria a Praça no lugar da Quebrada, calado — a mesma falha silenciosa do rename Time E, que apagou a bandeira sem uma linha no console. M1 nenhum id no estilo CS (fy_/de_/aim_/awp_) sobrevive no código vivo; M2 todo id antigo resolve para mapa que existe; M3 todo mapa tem a prévia em disco com o nome do id (renomear id sem renomear a imagem dá 404 no menu, não erro de build). CHANGELOG, KNOWN-BUGS e docs/historico ficam fora: são registro do passado, e o alias é o que os mantém verdadeiros E navegáveis. `--mutar=id-cs|sem-alias|sem-preview` provam que morde.

```bash
npm run eval:mapid
```

## `eval:maprotate`

Rotação de mapas: link ?map= manda, escolha explícita fica, e sem escolha a rotação percorre o registro. O check:fast citava este nome sem o script existir — portão morto na corrente. A régua real é tools/eval/map-rotation-check.mjs.

```bash
npm run eval:maprotate
```

## `eval:submitguard`

A trava anti-fraude do banco não pode recusar partida que o jogo produz. Issue #87 (maurodesouza): 'stats não enviados: partida rápida demais pra ser verdade' numa partida de CAPTURA legítima no quebrada. A cláusula exigia 80 s por rodada — número que veio do ABATE, onde a rodada é uma janela de 99 s; no CAPTURA a rodada não tem janela nenhuma. Medido: 6 de 50 partidas de captura jogadas até o fim eram recusadas, mais 4 de 50 abandonos, E a cláusula chamava _flag() antes de recusar (3 strikes escondem o jogador do ranking). FORA DO `check` DE PROPÓSITO, pelo mesmo motivo do eval:boot: o piso é LIDO de ~/db-privado (o banco não mora neste repo, .gitignore:145-148) e sem esse insumo a régua não sabe medir — e não saber custa o mesmo que estar errado, então ela fica VERMELHA em vez de passar calada. É passo de pré-deploy. SG1 (física)/SG4 (sem strike)/SG5 (default brando) rodam em segundos; SG2/SG3 sobem o motor e pedem --amostra (~10 min). `--mutante=piso80|comflag|defaultduro` provam que morde.

```bash
npm run eval:submitguard
```

## `eval:ctrlw`

Agachar andando pra frente não pode fechar a aba. Relato do Daniel Diniz (07/08): 'quando fica muito tempo com a tecla Control pressionada a página fecha' — no Windows, não no Mac. Não é o Control: agachar é ControlLeft/Right e andar pra frente é W, então agachar avançando É Ctrl+W (no Mac o atalho é Cmd+W, por isso não reproduzia aqui). preventDefault não alcança atalho reservado; quem resolve é a Keyboard Lock API em tela cheia, com a confirmação de saída do beforeunload como segunda camada pra Firefox/Safari. CW3 cobra o SILÊNCIO no menu — confirmação que aparece sempre vira praga e é arrancada inteira depois, levando o conserto junto. EXIGE BROWSER: fora do `check`, passo de pré-deploy. `--mutante=semlock|semprompt|promptsempre` provam que morde, e a régua morre se o mutante não casar o texto.

```bash
npm run eval:ctrlw
```

## `eval:boot`

O JOGO ABRE E FALHA DE FORMA ACIONÁVEL? No Chrome real, exige zero pageerror, o `onclick` do #btn-jogar ligado e uma falha injetada no início da partida voltando ao menu com modal amigável, telemetria automática/manual, erro preservado no console e detalhe técnico só em ?debug=1. Nasceu do BUG-34 (TDZ deixava JOGAR inerte) e do BUG-42 (erro bruto assustava o jogador sem dar recuperação). EXIGE BROWSER: fica fora do `check` e é passo obrigatório antes de deploy. `--mutante=tdz|sem-amigavel|vaza-detalhe|sem-console-watchdog` prova as cláusulas.

```bash
npm run eval:boot
```

## `eval:ssr`

PÁGINA SSR ENTREGA CORPO, medido no ARTEFATO do build. Nasceu do dono em 12/08: 'a pagina mapa online (aovivo) esta quebrada'. Eram as TRÊS páginas prerender=false (/mapa, /ranking, /u/<perfil>) devolvendo 200 com 0 bytes em produção e no preview, desde 3e5b0ea (#194, 11/08 23:23) — que pôs moduleCacheManifest() no escopo do módulo do Layout.astro. Ele faz readdirSync('public/js') relativo ao cwd: no build o diretório existe, dentro da função da Vercel NÃO, e como o Astro faz streaming o 200 já tinha saído quando o ENOENT estourou. 500 teria sido barulhento; 200 com casca vazia passou um dia no ar. O eval:site cobre /ranking e checa corpo, e passou o tempo todo porque sobe um astro dev LOCAL, onde public/js existe — LIÇÃO 3, a régua media outro mundo. Esta aqui entra no diretório da função e chama o handler construído, que é o cwd de produção. EXIGE BUILD, não exige browser nem rede: passo de pré-deploy junto do eval:boot. `--mutante=corpo-vazio|lanca` provam que morde; `--mutante=sem-publicjs` é asserção de que a leitura de disco em tempo de renderização continua morta.

```bash
npm run eval:ssr
```

## `eval:cena`

CUSTO DE CENA TEM TETO. tools/eval/gl-metrics.mjs já media calls/triângulos reais por frame desde a rodada 3 — e ninguém reprovava: `grep -nE 'calls|tris|draw' tools/eval/invariants.mjs` não devolvia uma linha, e o único teto escrito no repo era prosa no comentário de mapprops.js:15-17 ('300-800 calls e 500 k tris'). Número medido sem consequência envelhece sem avisar: foi assim que loja_h chegou a 4.347 calls e 3,65 M triângulos antes de alguém olhar. A sonda antiga também cobria só 4 mapas — faltava o quinto, que é justamente o pior (1.8k calls, metade do fps dos outros). O teto mora em tools/eval/cena-tetos.mjs, compartilhado com as cláusulas CENA do invariants (LIÇÃO 2: dois limiares para o mesmo conceito é o instrumento discordando de si). EXIGE BROWSER: fica fora do `check` e do `check:fast`, igual ao eval:boot, e é passo de pré-deploy. Backend padrão é o do sistema e não swiftshader — `info.render` é contabilidade do three, não do driver, então trocar backend não move calls/tris (move fps, que é reportado e NÃO tem teto); medido, swiftshader levou 79 s até `live` e derrubou o processo de GPU no meio, contra 8,3 s do padrão. `--gl=swiftshader` para CI sem GPU. `--mutante=estoura` desliga instancing e culling no módulo servido e prova que morde.

```bash
npm run eval:cena
```

## `eval:site`

Contrato das 13 rotas do site SEM Supabase (o estado do CI): status, corpo, XML do sitemap e JSON-LD parseável. `astro build` verde não prova nada disso — /ranking pode dar 500 e o build passa. Sobe o astro dev sozinho; SITE_URL aponta pra um alvo externo. --mutante=jsonld prova que morde.

```bash
npm run eval:site
```

## `eval:identity`

UID é a identidade estável, token é a prova e nick é atributo. Cobra cliente + APIs + fallback temporário e tem mutantes semuid-client|nick-auth|semcanonical.

```bash
npm run eval:identity
```

## `eval:error-console`

Exceções globais e promises rejeitadas continuam visíveis no console nativo além da telemetria. Mutantes: erro|promise.

```bash
npm run eval:error-console
```

## `eval:error-origin`

Erros de extensão e scripts cross-origin continuam brutos, mas não acionam watchdog, dispatch ou issue do jogo. Mutantes: sem-extensao|sem-cross-origin|filtro-amplo|sem-api|sem-early-return|sem-workflow|abre-externo|sem-cliente|cliente-mensagem-url|sem-teto-externo|debug-externo|console-sem-origem|cache-antes-origem|sem-recuperavel|sem-opaco|opaco-sem-guarda|sem-vercel-helper|sem-vercel-cliente|sem-webgl|sem-fingerprint|escala-incoerente|grava-forjado|receita-imul|cliente-hash-bruto|cliente-sem-retrim|sem-log|log-amplo|log-sobre-tudo|log-nao-corta|sem-teto-console|pilha-so-no-primeiro|times-sem-erro|onerror-sem-src|boot-sem-migalha|payload-sem-migalhas|issue-sem-migalhas|sem-midia|midia-ampla|sem-cota-midia|cache-sem-binding|cache-so-ingles|cache-sem-especificador|sem-ponte|ponte-ampla|ponte-insensivel|sem-ponte-cliente|jogo-com-ponte|sem-webglstate|webglstate-amplo|sem-capacidade|capacidade-ampla|lock-sem-catch.

```bash
npm run eval:error-origin
```

## `eval:webgl`

Compatibilidade Linux/WebGL: executa a factory real com contextos controlados, exige degradação sem falso crash, fundo opcional, recuperação, qualidade temporária, zero sondas extras e shader de personagem válido em renderers distintos. Mutantes: alto-primeiro|sem-webgl1|erro-provisorio|contexto-extra|fundo-fatal|sem-context-loss|qualidade-persistida|canvas-reusado|preview-null|texture-lod-ext.

```bash
npm run eval:webgl
```

## `eval:webglguard`

Roteamento sem WebGL em main.js: retorno nulo de criaRenderer vira painel avisaSemWebgl() e aborta o boot com throw, sem tocar num renderer nulo. Fecha #105/#115/#215/#217/#104. Mutantes: sem-guard|sem-aviso|sem-throw|uso-antes.

```bash
npm run eval:webglguard
```

## `eval:shaderlog`

Logs WebGL nulos viram string vazia antes de trim; framebuffer nulo não derruba o WeakMap de drawBuffers; o render() consulta gl.isContextLost() além da flag assíncrona (perda de contexto no meio do frame, #419/#420); rotas usam versão, arnêses usam hash do core e addons sem URL própria revalidam na origem/CDN. Mutantes: sem-guardas|sem-cache-bust|addons-immutable|cloudflare-vendor|framebuffer-nulo|sem-contexto-sincrono.

```bash
npm run eval:shaderlog
```

## `eval:shaderbudget`

Todas as primitivas da urna precisam caber nos 8 varying vectors mínimos do WebGL1; deriva materiais, instancing, sombras/cookies, protege fog/triplanar e o grafo publicado completo do cache-bust. Mutantes: fog-separado|tri-separado|tri-varying|tri-helper-varying|sem-install|sem-patch|tri-flat|lam-flat|urna-color|urna-clearcoat|urna-anisotropy|urna-instancing|urna-segunda|sombra-extra|sombra-condicional|sombra-pontual|sombra-reativada|spot-map|cache-antigo|cache-omitido|cache-constante|cache-podado|cache-entry-site.

```bash
npm run eval:shaderbudget
```

## `eval:og`

Renderiza e MEDE os 3 cards de og:image (1200×630) em node puro. Não dá pra testar pela rota: o dev server não carrega resvg-wasm porque src/lib/font-data.ts (996 KB de base64) estoura o parser de TS — a rota da badge quebra igual em dev. Também confere se a fonte decodificada tem tamanho plausível: extração truncada rendia card SEM TEXTO passando por 1200×630.

```bash
npm run eval:og
```

## `eval:sitemap`

Prova o fatiamento do sitemap com totais falsos (0, 5000, 5001, 12000). O modo índice é código que NINGUÉM alcança pedindo a URL — perfis só entram com RANKING_ON e precisariam de 5000+ jogadores. Checa páginas contíguas sem buraco, teto por página, XML bem formado nos dois modos e escape de & no nick.

```bash
npm run eval:sitemap
```

## `eval:ratchet`

O ratchet de dívidas (KNOWN-RED.json) só anda pra frente: entrada NOVA reprova o PR, a menos que o corpo justifique com `ratchet: +ID porque <motivo>`; entrada REMOVIDA é quitação e passa. Sem régua, quebrar uma invariante nova e pingar o ID na lista era a forma de deixar o portão verde — virou lista de desculpas.

```bash
npm run eval:ratchet
```

## `eval:mutate`

Mutation testing do viewmodel: regenera a auditoria, aplica cada mutante de tools/eval/mutantes.json, roda a régua alvo e restaura. MATOU = régua morde; SOBREVIVEU = invariante cega; PULADO = avaliação inconclusiva. Ctrl-C/SIGTERM restauram na hora.

```bash
npm run eval:mutate
```

## `eval:vmlabhud`

O sidebar 1–5 existe no HUD real, com ou sem ?vmlab=1. Executa _updateWeaponHud com loadout completo, sem granadas, munição infinita e arma repetida; --mutante=escondido|duplicado-ativo prova presença e um único slot ativo.

```bash
npm run eval:vmlabhud
```

## `bot:record`

BOTBRAIN: gera o dataset bootstrap (estado→ação) gravando os bots roteirizados no botsim — o professor da rede enquanto não há dado de jogador. Usa `TRAIN_SEEDS`, separadas das sementes do gate funcional. Uso: [segundos] [mapId|all].

```bash
npm run bot:record
```

## `bot:train`

BOTBRAIN: treina o MLP com o dataset bootstrap e/ou o Supabase (--from-supabase), exportando public/models/bot-brain/. REQUER tfjs-node local (npm i -D @tensorflow/tfjs-node) — é nativa pesada, fora das deps do projeto. Uso: [--epochs=40] [--data=...].

```bash
npm run bot:train
```

## `bot:brain:check`

BOTBRAIN (régua Fase D): a rede é um controlador funcional (move+atira+mata, não congela) em `EVAL_SEEDS` fora do dataset bootstrap. `--mutante=zero` zera os pesos e a régua reprova.

```bash
npm run bot:brain:check
```

## `eval:botbrain`

Contrato de produção do BotBrain: coleta opt-in autenticada por UID, limites confiáveis, objetivo CTF, cache bust dos módulos, usuário não-root, balanceamento do corpus remoto e avaliação sem sobreposição de sementes com o treino. Mutantes: anonimo|ctf|optout|cache|root|poison|eval-leak|eval-usa-treino|treino-usa-eval.

```bash
npm run eval:botbrain
```

## `eval:i18ntwins`

Pares PT↔EN numa tabela só (`src/lib/i18n-pairs.ts`): hreflang, `html lang`, og:locale, sitemap e o parser único do changelog. A gêmea do `/changelog` é `/whats-new`; o cromo é EN e o corpo continua o `CHANGELOG.md`. Mutantes: sem-par|sem-redirect|chrome-pt|lang-pt|sem-sitemap|parser-dup.

```bash
npm run eval:i18ntwins
```

## `eval:posters`

O aspecto declarado de cada cartaz em POSTER_FILES (textures.js) bate com o pixel do arquivo em public/posters/? Erro >6% = arte esticada na parede (issue #79). `--mutate` estraga um número e prova que a régua morde.

```bash
npm run eval:posters
```

## `eval:comentario`

A regra do orçamento de comentário (CONTRIBUTING "Código não é relatório", AGENTS "orçamento quase zero") nunca teve régua: quem cobrava era revisor humano ou bot de PR, sempre DEPOIS do push. Em 12/08 o greptile reprovou um comentário de 4 linhas EM INGLÊS no error-provenance.mjs - duas violações da mesma regra, num PR com 17 portões verdes. Mede só o que o diff ACRESCENTA contra a base (ratchet, não faxina) em public/js e src; tools/eval fica fora porque cabeçalho longo de régua é o padrão da casa. --mutante=bloco-longo|comentario-ingles provam que morde.

```bash
npm run eval:comentario
```

## `eval:fixture`

A lei 3 sempre valeu para tools/eval e nunca para scripts/ci - que decide automerge, dedupe de crash, triagem e roteamento de PR. Em 12/08 dois bugs moraram exatamente lá: um filtro que nunca casava e um separador de registro que colidia com o dado; os dois morreriam na primeira fixture. Cobra --selftest em todo scripts/ci/*.py TOCADO pelo diff. Ratchet: a dívida herdada (11 scripts) está listada e só pode encolher. --mutante=lista-cresce|selftest-quebrado.

```bash
npm run eval:fixture
```

## `eval:ui`

As 5 réguas de UI (UI1 contraste WCAG do HUD sobre o pior fundo medido, UI2 poluição, UI3 área morta sobre mira/viewmodel, UI4 ritmo por modo, UI5 paleta contra ref_ui.json). O arquivo existe desde a fase 5 do roadmap mas NÃO tinha script: nenhum `npm run` chamava, então ela só rodava quando alguém lembrava — justo a régua que o redesign AAA mais precisa. NÃO está em check:fast/check:deploy de propósito: o UI4 (ritmo do modo ABATE) está VERMELHO desde antes do redesign, e pendurar isso na cadeia bloqueante reprovaria o build por defeito alheio. Baseline de 13/08/2026: 4 de 5 passam.

```bash
npm run eval:ui
```

## `eval:redesign`

Contrato do redesign: resultados estáticos com alpha, loading GLB ao vivo por facção, mapa full-bleed com carrossel visual, HUD 1–5 em máscaras 2D, seleção, i18n, preview 3D, configurações e placar. Cada cláusula tem mutante próprio.

```bash
npm run eval:redesign
```

## `eval:screenquery`

Cada tela visual, inclusive placar, vida baixa, vitória e derrota, abre isoladamente por ?tela=nome ou número sem percorrer o funil. Valida aliases, parâmetros e integração no boot; os mutantes removem cada consumo real.

```bash
npm run eval:screenquery
```

## `eval:screenquery:browser`

Abre mapas, loading 3D, vitória, derrota, HUD normal/vida baixa e placar por ?tela=; captura em 3:2 e mede carrossel, ações GLB, mira, sidebar 1–5 e ausência de sobreposição. Exige Chrome e servidor já no ar, por isso fica fora dos gates rápidos.

```bash
npm run eval:screenquery:browser
```

## `eval:loadingwall`

Issue #292: abre splash/loading em 16:9 e 3:2, DPR 1 e 2; exige arte inteira em contain sobre preenchimento cover e grava as oito capturas. Exige Chrome e servidor no ar.

```bash
npm run eval:loadingwall
```

## `eval:matchoptions`

Opções do mapa em tela cheia precisam atravessar o estado e governar o Game real; testa 1/3/5/7 rounds nos dois modos e os padrões históricos.

```bash
npm run eval:matchoptions
```

## `eval:charvoice`

O clique no avatar toca uma fala determinística e exclusiva; bordões declarados mantêm a identidade mesmo se o pool mudar. A seleção automática abre muda. Mutantes: sem-clique|auto-fala|mesmo-som|sem-identidade|troca-clubber-rasta|faria-volta-lula|pack-antigo.

```bash
npm run eval:charvoice
```

## `eval:seo`

LÊ dist/client/ — o HTML publicado, não o .astro. Rode `npm run build` antes, ou use `npm run check:seo`, que já faz os dois. `--mutate` prova que a régua morde.

```bash
npm run eval:seo
```

## `eval:jsonld`

Valida o JSON-LD publicado contra o vocabulário OFICIAL do schema.org. Baixa 1,5 MB na primeira execução (cache em tools/eval/.cache/, git-ignorado); `--refresh` rebaixa. NÃO substitui o Rich Results Test do Google: requisito de rich result é política do Google, não do schema.org.

```bash
npm run eval:jsonld
```

## `eval:select`

BALÃO NA TELA DE SELEÇÃO. Exige BROWSER e o servidor no ar: `npm run eval:serve &` antes. Mede o caminho REAL do preview (buildCharacterModel + arma + IK + curl + ctrl.update), que é onde o defeito mora — a pose-inflate lê o GLB do disco e é cega pra ele (KNOWN-BUGS BUG-25). ~4 min pros 44. Fora do `check` de propósito: `check` roda sem browser.

```bash
npm run eval:select
```

## `assert:assets`

REPROVA O BUILD se o pacote de áudio/decalques não chegou inteiro ou se o layout gerado cita arte que saiu do pacote. Os fetches falham em silêncio; e, sem o contrato inverso da issue #77, peças somem da parede com só um console.warn. Roda no buildCommand da Vercel entre os fetches e o build. Mutações: AUDIO_PACK_URL inválida com public/audio vazio; `node tools/eval/assets-check.mjs --mutante=grafite-orfa`.

```bash
npm run assert:assets
```

## `strip:decalbg`

Alpha-key do branco dos decals de grafite (alfabeto-*.png etc.) depois do fetch-decals.sh. Fundo da folha virava retângulo branco atrás da letra em prod (13/08). Limiar alto (≥248) pra não comer conteúdo claro; STRIP_DECAL_BG=0 pula. Roda no buildCommand da Vercel.

```bash
npm run strip:decalbg
```

## `grafite`

ASSA a colocação do grafite dos 5 mapas. Roda a passada de graffiti_pass.js NO NAVEGADOR (único lugar onde os GLB existem) e congela o resultado em public/js/graffiti_layout.js. Exige `npm run eval:serve` no ar. REGERE depois de mexer em geometria de mapa, pool de decalque ou bandas — layout velho vira peça no lugar errado, e quem cobra isso é o eval:grafite.

```bash
npm run grafite
```

## `eval:grafitelayout`

O LAYOUT ASSADO (public/js/graffiti_layout.js) não envelhece em silêncio (issue #82). Node puro, milissegundos, no check:fast — o eval:grafite mede cobertura no NAVEGADOR e por isso fica fora do check. Esta cobra MANIFESTO (todo nome de arquivo/mural do layout ainda existe no pool vivo, sem nome morto, peça bem formada, mapa nem a mais nem a menos) e FRESCOR (hash das entradas — fonte de cada map_*.js e da passada, gravado no layout via graffiti-fingerprint.mjs — bate com o de hoje; mexeu em parede/banda/passada sem regerar → VERMELHO, mande rodar `npm run grafite`). Escolhi o hash das entradas em vez do job de navegador do #82 porque roda em TODO PR por milissegundos. `--mutante=orfao|morto|mapa|vazio|mural|geometria|passada` prova que morde; `--duplo` prova o determinismo.

```bash
npm run eval:grafitelayout
```

## `eval:audioalcance`

O som que o código nomeia chega na build? `public/js/soundscape.js` nomeia os arquivos de ambiente e nenhum deles era alcançado pela pipeline: o gerador não tinha regra para `ambiente/` (entravam como órfãos), o empacotador copia só o que o manifest nomeia, e o que falta no zip vira 404 que `soundscape.js:59` engole com um warn — lição 5 e lição 12 juntas. A régua ARMA uma fixture sintética em pasta temporária e roda o gerador e o empacotador REAIS contra ela (`--raiz=`), em vez de depender do pacote privado, que não existe em clone limpo. ALC1 mede o gerador, ALC2 o pack; sem `zip` no PATH a ALC2 se declara NÃO MEDIDA e a régua reprova assim mesmo. A irmã de produção é a cláusula de ambiente do `assert:assets`, que mede o pacote instalado e lê a lista da mesma fonte. `--mutante=nome-trocado|sem-copia` prova que morde.

```bash
npm run eval:audioalcance
```

## `eval:audioespacial`

O tiro por sample ouve a distância? `game.js:6336` calcula distância, pan e atraso de propagação em todo tiro de bot; o caminho por sample (`weaponSamples: true`, que é o que o piloto Fab liga) descartava os três e tocava por HTMLAudio, que não tem grafo nem `start(t)`. Bot a 40 m às suas costas soava igual a bot a 2 m à sua frente. A régua planta um `AudioContext` falso que grava o grafo e importa o `public/js/audio.js` de produção — nenhum WAV entra, `fetch` devolve 32 bytes sintéticos. ESP1 cache frio não silencia, ESP2 pan, ESP3 propagação, ESP4 duck pela mesma regra do synth, ESP5 é a cláusula IRMÃ (o synth continua espacializando — sem ela, apagar os dois lados ficaria verde) e ESP6 o fallback synth intacto. A LEI DE VOLUME por distância fica de fora de propósito: é decisão de ouvido, e vira bloqueio no `docs/audio/FAB-PILOT-HANDOFF.md`. `--mutante=sem-pan|sem-propagacao|duck-fixo` prova que morde.

```bash
npm run eval:audioespacial
```

## `eval:audioproc`

Asset sem origem declarada não entra numa build. O `.gitignore` protege o GIT e só ele: o pacote de áudio é montado à parte e servido em produção, então arquivo de procedência desconhecida chega ao jogador sem passar por commit nenhum. Cobra a forma do ledger `docs/audio/proveniencia.json` — PRV1 campos obrigatórios, PRV2 `aprovado` exige `escutaAB` (nenhuma régua desta base ouve som: quem aprova é o dono, A/B no jogo real), PRV3 todo evento do piloto com decisão declarada (`synth` ou `derivado`), PRV4 fonte citada existe e nenhum áudio está rastreado pelo git. A cláusula de build é a PRV5 do `assert:assets`, que confere sha-256 contra o pacote instalado. O contrato inteiro está em `docs/audio/PROVENIENCIA.md`. `--mutante=aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao` prova que morde.

```bash
npm run eval:audioproc
```

## `audio:inventario`

Metadado do staging privado, e só metadado. O pacote fonte do piloto mora fora do git e a listagem diz `Allows usage with AI: No` — abrir os WAVs com um agente no meio é o que a licença proíbe. Lê o áudio LOCALMENTE com ffprobe/ffmpeg e emite nome, sha-256, formato, codec, duração, canais, taxa, bits, pico e loudness. Não copia, não converte, não move um WAV, não fala com a rede e RECUSA `--saida=` dentro do repositório. O `sha256` liga ao `sha256Fonte` do ledger de procedência. Campo que a máquina não sabe medir vem `null`, com `ferramentas.naoMedido` dizendo qual e por quê — zero disfarçado de medição é a lição 5.

```bash
npm run audio:inventario -- <dir> --saida=<fora-do-repo>.json
```

## `audio:inventario:autoteste`

A fixture do inventariador: WAVs gerados na hora com ruído determinístico. Prova saída idêntica entre duas execuções, arquivo não-áudio de fora, hashes distintos para conteúdos distintos, e nenhum campo de nível preenchido quando a ferramenta falta. Está no check:fast porque ferramenta de decisão sem fixture é o furo que o `eval:fixture` existe para fechar.

```bash
npm run audio:inventario:autoteste
```

## `eval:backendhints`

O BUNDLE PÚBLICO NÃO NOMEIA O BACKEND. Decisão do dono (15/08): quem abre o jogo vê o JOGO — 'sem dar pistas se usamos supabase, postgres o que'. Mede no fonte (sem build) toda superfície servida crua: public/js, public/llms.txt, src/pages (corpo .astro, fora do frontmatter de servidor), CHANGELOG.md (renderizado em /changelog). A doc Docusaurus fica FORA, como dívida declarada — virar neutra é decisão editorial. Em 15/08 a primeira corrida achou 8 vazamentos, um deles TEXTO DE UI ('envs do Supabase pendentes'). --mutante=inject prova que morde; lista de padrões vazia se denuncia sozinha.

```bash
npm run eval:backendhints
```

## `changelog:check`

A seção do CHANGELOG da versão corrente é a NOTA do release — não pode linkar o release nela mesma (o ponteiro circular vivia no topo de toda entrada desde o início e apontava pro domínio pré-migração), não pode citar rubenmarcus/csbrasil (o repo é corosolto/client desde a migração; redirect existe, mas régua se escreve no domínio canônico) e, quando há tags locais, a contagem de (#N) tem que bater com os merges reais do git na faixa vAnterior..vAtual — entra no release.yml via sync-changelog e o que é gerado por robô se verifica por robô. Clone sem tags (build da Vercel): a contagem PULA declarada, a estrutura morde igual. Mutantes: --mutante=selflink|dominio-velho|pr-sumido.

```bash
npm run changelog:check
```

## `eval:grafite`

COBERTURA DE PAREDE PINTADA, medida no navegador. A decal-probe roda em node, onde nenhum GLB carrega, e por isso jurava 334 peças na Quebrada enquanto o dono via 12,7% de parede com arte. Esta abre cada mapa num Chrome de verdade, atira 16 raios de cada waypoint e conta quantas placas de parede visível têm tinta. Exige `npm run eval:serve` no ar.

```bash
npm run eval:grafite
```

## `eval:grafite:ar`

A régua IRMÃ da cobertura, e ela existe porque cobertura é cega pro defeito oposto: peça flutuando não derruba o número, ela MELHORA (cobre a placa de trás). Mede peça a peça — vão atrás, tapada na frente, sobreposta. Exige navegador e `npm run eval:serve` no ar. `--fotos N` fotografa as piores: quando o número não move depois de um conserto que deveria movê-lo, é a foto que resolve.

```bash
npm run eval:grafite:ar
```

## `check:web`

O PORTÃO LENTO, o de NAVEGADOR — o que o `check` de node é cego para medir. eval:grafite e eval:select abrem os mapas/personagens num Chrome de verdade (onde os GLB existem) e cobram cobertura de parede pintada e a silhueta da tela de seleção; foi essa classe que deixou 238 decalques morrerem calados (a decal-probe em node jurava 334 peças). FORA do `check`/`check:fast` DE PROPÓSITO: SwiftShader roda ~0,3 FPS e cada mapa custa minutos, então este grupo é o job separado `portao-browser.yml` (só na main e em PR que toque mapa/personagem), nunca a corrente rápida. EXIGE `npm run eval:serve` no ar e CHROME_BIN apontando pro Chromium do Playwright. runner.mjs roda os dois mesmo que o primeiro caia — número diz que caiu, e a foto do eval:grafite:ar diz por quê.

```bash
npm run check:web
```

## `anims`

ÍNDICE de quais personagens têm clipe retargetado próprio (models/anims/index.json). Sem ele o jogo pedia os 11 clipes dos 44 e disparava 88 404 por partida — o barulho que enterrava exceção de verdade no console. `--mutante=sobrando|faltando|semguarda|semfetch` prova que a régua morde.

```bash
npm run anims
```

## `anims:merge`

MESCLA os clipes por pasta em 1 GLB com clipes nomeados (<pasta>.glb). Medido pelo boot-waterfall em 07/08: o boot frio fazia ~520 requests de clipe (1 por estado por personagem) — o custo não era byte, era round trip, e é o que fazia o online abrir muito mais lento que o local. As pastas-fonte continuam no disco (retarget, feet, fallback de runtime). `--check` exige mesclado em dia E versionado — mesclado só local vira 404 no deploy e o ganho evapora em silêncio (mesma armadilha da A4 do anims:check).

```bash
npm run anims:merge
```

## `walls:check`

Os arrays WALLS/LOADING_WALLS do main.js apontam pra arquivo que EXISTE no disco e é .webp. Nasceu de dois achados: o 404 do wall-1.png em produção (KNOWN-BUGS BUG-08, lista hardcoded que engole arte) e a conversão WebP de 07/08 (22 MB de PNG no boot, medido pelo boot-waterfall) — PNG é fonte, o jogo serve webp, e sem portão o peso volta em silêncio. `--mutante=fantasma|png` prova que morde.

```bash
npm run walls:check
```

## `verify:skills`

Supply chain (issue #42): recalcula o SHA-256 de cada skill de terceiro instalada em .agents/skills/ e compara com o skills-lock.json — sem isso o lock é texto que ninguém confere e não detecta skill que mudou depois de travada. Algoritmo canônico (UTF-8, sem BOM, LF, um \n final) documentado no topo do script. Sem .agents/skills/ (o conteúdo saiu do git nesta release, reinstalado do lock) PULA e sai 0. `--update` regrava os hashes das instaladas.

```bash
npm run verify:skills
```

## `menuwalls`

Variantes 3:2 preservam o wallpaper inteiro no formato usado pelo dono; o manifesto liga fonte, receita e saída.

```bash
npm run menuwalls
```

## `travessao:check`

Nenhum travessão `—` (nem en-dash `–`) no texto público (src/). O em-dash é a marca de texto gerado por IA — num jogo que se vende como original, título/meta/OG/descrições cheios de `—` entregam a origem. A regra (use ` - `) está no CONTRIBUTING.md; esta é o portão pra ninguém reintroduzir. Escopo só src/ (o site); comentários de dev e docs geradas ficam de fora. `--mutante=inject` prova que morde.

```bash
npm run travessao:check
```

## `eval:medianet`

Tranca os dois crashes do alpha.41 já consertados no upstream. #117: todo `.play()` de HTMLMediaElement (só nos módulos que constroem mídia — hoje audio.js e main.js) tem `.catch()` ou é Promise capturada e tratada; sem tratador, a rejeição de autoplay virava 'Uncaught (in promise)' e derrubava o boot. #125: o wrapper central `api()` de main.js embrulha o fetch em try/catch e RETORNA do catch (fail-silent) — sem isso, `TypeError: network error` volta a estourar. Estática (grep estruturado), sem browser nem rede: entra no `check`. Os `.play()` de THREE.AnimationAction ficam de fora porque animação e áudio moram em módulos separados (game.js/glbchars.js/fparms.js não constroem mídia). `--mutante=play|fetch` provam que morde.

```bash
npm run eval:medianet
```

## `eval:ctfround`

A RODADA de captura fecha por OBJETIVO, não pela rede de segurança de 480 s. `--mutante=pace` reproduz o defeito do dono (1º fecho NUNCA, partida evapora aos 487 s).

```bash
npm run eval:ctfround
```

## `eval:regen`

Regeneração fora de combate VETADA pelo dono em 05/08. `--mutante=ligado` devolve o 40 -> 100 hp que ele reportou.

```bash
npm run eval:regen
```

## `eval:ctfwin`

O alvo da rodada de captura é TODAS as bandeiras do mapa, não uma constante. Nasceu do dono jogando: 'na loja H está com 3 capturas quando a vitória tem que ser as 4'. `--mutante=constante` devolve o alvo fixo em 3 (a rodada fecha na 3ª de 4); `--mutante=menos1` prova que a cláusula do FECHO mede o motor e não a declaração.

```bash
npm run eval:ctfwin
```

## `eval:spawn`

Ninguém nasce no ar nem no andar errado: |y(frame 30) − y(frame 0)| < 0,25 m em TODO spawn de TODO mapa, jogador e bot, pelo caminho real de respawn. Nasceu do dono jogando: 'o respawn do time dentro da loja, eles começam embaixo do mezanino e do nada sobem'. `--mutante=y0` devolve o y literal 0 e acende os 3,40 m de teleporte da Havan.

```bash
npm run eval:spawn
```

## `check:deploy`

O PORTÃO QUE RODA NO BUILD DA VERCEL, entre o assert:assets e o astro build. Existe porque a integração Git da Vercel publica em PARALELO com o CI: commit vermelho vai pro ar do mesmo jeito (aconteceu em 07/08, arch:check quebrado deployado). Aqui, vermelho = não publica. É subconjunto do check:fast de propósito — só o que foi PROVADO em clone descartável, sem navegador e sem rede. O eval:invariants ficou de FORA por medição: 376 s no clone limpo, e 6 min em todo deploy compram pouco (ele já roda no CI). Entram aqui só passos baratos e determinísticos: sintaxe, telemetria, identidade, poda do build, HUD do vmlab, default do vm-inspect, ARCH, docs geradas, manifesto de mídia e animação, texto público e aspecto dos cartazes.

```bash
npm run check:deploy
```

## `check:fast`

O runner percorre TODOS os passos e só reprova no fim; nenhum vermelho pode esconder os portões seguintes. A ordem ainda é deliberada: docs:check vem antes de arch:check para diagnosticar documentação derivada primeiro, e eval:redesign roda antes dos checks de mídia/animação porque também verifica o contrato entre fonte e assets.

```bash
npm run check:fast
```

## `check`

eval:vm ANTES de eval:invariants: as invariantes de VM LEEM o vm_mint_audit.json que o eval:vm ESCREVE. Na ordem antiga o && cortava no primeiro vermelho e o JSON nunca era regenerado — o portão media o viewmodel de ontem e inventava vermelha (26/26 armas 'fora' que viraram 3/26 depois de regenerar). Ver KNOWN-BUGS.md BUG-02.

> script homônimo não existe mais no `package.json` — doc mantida por histórico

## `check` — REMOVIDO em 18/08/2026

Cadeia com `&&` substituída pelo `check:fast` (o runner percorre TODOS os passos
mesmo com vermelho no meio; `&&` parava no primeiro erro e escondia os portões seguintes).

```bash
(REMOVIDO) npm run syntax && npm run audio:check && npm run eval:medianet && npm run eval:ctfhud && npm run eval:vm && npm run eval:invariants && npm run eval:kick && npm run eval:bots
```

## `eval:tags`

Tag, main e versao contam a MESMA historia. Nasceu de defeito real: push nao atomico de dois refspecs deixou a v2.0.0-alpha.93 apontando pra commit que nunca chegou na main, e a sequencia pulou .92 -> .94. O versao-bumpada compara arquivo x arquivo e o eval:release valida gatilho; ninguem olhava o grafo do git. TM3 exige rede e gh: rode com --rede fora do portao rapido. Mutacoes: --mutante=tag-orfa|versao-atrasada|release-faltando|tag-fora-do-padrao

```bash
npm run eval:tags
```

## `eval:simclock`

FPS baixo não pode desacelerar o relógio do jogo (issue #295). O clamp de 50 ms era TETO POR FRAME: abaixo de 20 FPS cada frame de 100 ms entregava 50 ms à simulação e a partida andava na metade do relógio de parede — relato de jogador em câmera lenta. O loop agora FATIA o frame em passos de ≤ 50 ms (mesma semântica por passo) com teto de 4 fatias (guard de espiral: máquina que não acompanha descarta o excesso) e só a última fatia renderiza. Estática estrutural (mesmo contrato do eval:medianet): SC1 fatio do delta real · SC2 teto com VALOR lido (nome existindo com 1e9 passava — furo do mutante) · SC3 clamp solto proibido. --mutante=clamp-frame|sem-teto.

```bash
npm run eval:simclock
```
