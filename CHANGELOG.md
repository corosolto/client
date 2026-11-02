# Changelog

> ## Como este projeto versiona (decidido em 04/08/2026)
>
> ```
> 2.0.0-alpha.N   bug conhecido em aberto; o portão de qualidade pode estar vermelho
> 2.0.0-beta.N    zero P0 no KNOWN-BUGS.md E `node tools/eval/invariants.mjs` saindo 0
> 2.0.0           beta rodando em produção sem P0 novo
> ```
>
<!-- BEGIN:GERADO:versao_atual — não edite à mão, rode `npm run docs` -->

**O jogo está em `2.1.0-alpha.133`.** Prerelease do semver ordena sozinho
(`alpha` < `beta` < release), e o fluxo automático cuida do bump.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `grep VERSION public/js/version.js · node -p "require('./package.json').version"`

<!-- END:GERADO:versao_atual -->
>
> **Renumeração:** as entradas abaixo marcadas `[3.x]` foram publicadas como `2.0.0-alpha.N`
> — o contador tinha saltado de `1.15.0` para `3.1.0` sem nenhum release no meio, e **nenhuma
> das três tem tag git** (a última tag é `v1.12.4`). "v3" nunca existiu como coisa publicada.
> O conteúdo e as datas das entradas continuam intactos; só o rótulo mudou, porque chamar de
> 3.3.0 um build com P0 em aberto promete ao jogador uma estabilidade que ele não tem.

## Não lançado — 2026-10-19

### Adicionado
- Dá para dançar no meio da partida: a tecla T abre uma roda com os oito passos, a câmera se afasta para você se ver dançando e qualquer passo cai no instante em que você anda, atira ou morre.
- O personagem agora dança no lobby: oito passos brasileiros — passinho, samba no pé, ginga, frevo, dois pra lá, quadradinho, sarrada no ar e um salve — direto na tela de escolha, sem baixar nada a mais para quem não pedir.
- Quem joga pelo aplicativo passa a ver aviso de manutenção e, quando houver, o caminho alternativo para continuar jogando, sem precisar esperar uma atualização na loja.
- O jogo agora sabe se testar sozinho no celular: uma partida curta automática mede desempenho, travadas e erros no próprio aparelho, para o problema aparecer antes do jogador reclamar.
- O mapa ao vivo mostra cidades, partidas e rounds por agregado geográfico, sem publicar nick, jogador, IP ou posição individual.
- Visitantes que concluem uma partida multiplayer podem vincular a recompensa TRETA$ ao entrar na conta. O pagamento usa o resultado confirmado pelo nó e aceita o vínculo uma vez.
- Mudanças de nível exibem uma chamada visual com som. O ranking ganhou filtro por Time E e Time B.

### Alterado
- O ranking público usa somente partidas verificadas e aceita exclusões auditadas. A atividade pública respeita a configuração do perfil, e a lista de amigos separa quem está online agora.
- O multiplayer envia os abates da rodada por time no protocolo v6. O placar usa a foto social do jogador e mantém o retrato certo quando uma célula é reutilizada.
- Atualização do jogo não baixa de novo o que não mudou. Cada modelo, animação e som agora é identificado pelo próprio conteúdo, então só o que foi realmente alterado desce outra vez — no celular e no aplicativo isso corta centenas de MB por atualização, e quem já jogou entra direto.
- As telas de carregamento agora mostram o elenco inteiro: os 19 personagens entram em tela cheia, cada um com a sua arte e a marca CORO SOLTO no canto, no lugar do lote antigo de seis.

### Corrigido
- A Piscina deixa de repetir grafites ou pintá-los sobre a faixa azul; armários não engolem a câmera, e armas estáticas deixam os mapas com a loja ligada. Esquerdomacho segura pistola e faca sem disputar duas poses, recebe colete proporcional, e a AK volta ao tamanho certo em primeira pessoa. O menu de compra ocupa a tela, B fica exclusivo da loja, N troca a câmera, o saldo vai para a direita, a janela de compra fica mais longa e vírgula/ponto compram munição extra.
- A arma equipada volta a aparecer no celular. Se o modelo animado ainda estiver carregando ou falhar, uma arma alternativa continua visível também no desktop.
- Canarinho e suas três skins deixam de carregar uma cauda maior que quase metade do corpo. A pistola fica à frente do tronco, com cotovelo dobrado e montagem recalculada depois da pose de uma mão.
- A contagem diária de visitantes cobre todas as páginas públicas. Antes, só a entrada do jogo emitia a visita e deixava de fora quem chegava por conteúdo, perfil ou documento legal.
- Perfis públicos continuam visíveis quando o bootstrap da conta falha ou a sessão expira. Links do ranking usam o handle público, o histórico do navegador restaura a lista, e perfis sem totais aparecem com zero.
- O contador online voltou ao topo em desktop e celular. O rodapé móvel usa ícones quadrados com nome acessível, e a tela de privacidade preserva a foto com checkbox de 20 px.
- A câmera em terceira pessoa considera filhos de modelos importados e segura o último bloqueio por 80 ms. Armas autoradas não reativam malhas antigas, e o HUD volta a mostrar a arte da arma equipada.
- Celulares entram no perfil gráfico leve desde a abertura, limitam texturas e evitam carregar música, personagem 3D e cenário escondidos antes do primeiro toque.
- Levar tiro move o corpo do alvo, e quem atira agachado deixa de ficar estátua: o recuo aparece sem sair da pose.
- Quem está no ar fica em pose de salto em vez de correr em queda livre, e amortece ao tocar o chão.
- Girar no lugar deixa o quadril para trás e os pés alcançam depois, em vez de o corpo inteiro teleportar junto com a mira.
- Personagens distantes animam com menos frequência, devolvendo quadros ao celular sem mudar o que se vê de perto.
- Recarregar ficou visível de fora: em terceira pessoa, a mão livre vai ao carregador e o corpo mergulha durante a recarga, do jogador e dos bots — dá saber quando o adversário está vulnerável.
- Piscina da Treta volta a carregar sua ambiência.
- O placar reaproveita cada retrato em vez de baixar o mesmo avatar seis vezes.
- O guia inicial mostra movimento, tiro e recarga por 15 segundos; a ajuda completa continua no ALT.
- Os spawns do Escadão e do Ferro Velho deixam a primeira rota livre; a fauna do Ferro Velho nasce fora dos colisores.
- Andar de lado entorta o corpo na direção do movimento, em vez de deslizar de frente parado.
- Durante a partida, o perfil móvel começa com resolução de 60%, limita a cadência a 60 FPS no jogo e 30 FPS nos menus, reduz partículas, cápsulas e marcas conforme o aparelho sofre e recupera o último degrau sustentável na sessão seguinte.
- No celular, a barra de armas mostra a arma de verdade em vez de um desenho genérico, e a imagem muda junto com o que está na mão.
- No celular, virar ficou três vezes mais rápido: meia-volta cabe em uma passada de polegar, dá para mirar arrastando o próprio botão de atirar sem soltar o tiro, e Configurações ganhou um controle só para a sensibilidade do toque.

## Não lançado - 2026-10-18

### Adicionado
- Cada rota do hub abre pelo HTML inicial, sem splash, enquanto o cenário 3D carrega em segundo plano. Os cards Open Graph usam o título e o caminho da página em imagens 1200×630.
- Convites agora confirmam a chegada pelo link, mostram vínculos, recompensas e pendências na loja e na Comunidade, e atualizam o estado depois da primeira partida válida.

### Alterado
- Clãs, páginas estáticas, perfil, configurações, privacidade, ranking e loja usam o mesmo vocabulário visual Treta Pop. O catálogo público reflete 63 personagens, 12 mapas jogáveis e 26 armas.
- Partidas usam somente Time E e Time B. Os antigos agrupamentos continuam como categorias editoriais do elenco.
- A loja coloca as formas de ganhar TRETA$ antes do catálogo, prioriza visuais equipados, adquiridos e compatíveis com o saldo, e mostra quanto falta para cada compra.

### Corrigido
- JOGAR aceita visitante sem nick e oferece login ou cadastro depois da primeira partida. O botão ganhou chamada animada, a carteira usa a moeda do Saci, o personagem perdeu a base escura e o logo volta à tela inicial.
- O botão de convite pede login antes de prometer uma cópia quando a pessoa ainda não tem conta.

## Não lançado — 2026-10-17

### Adicionado
- A fábrica de wearables registra o boné procedural versionado e perfis candidatos por hash para Capitão, Esquerdomacho e Barbudo. A mesma régua importa os marcos e ajustes medidos dos óculos 33–36 para Capitão e Esquerdomacho, gera folhas frente/¾/perfil por pose e bloqueia qualquer par sem certificação humana; os itens 37/38 e a loja de acessórios continuam fechados.
- A loja TRETA$ ganha vinte skins de arma para AK e pistola: oito políticas, quatro com expressões brasileiras sobre o corpo original, duas Camo Selva, duas Tropicalente, ouro por T$ 900 e prata por T$ 500. O armário equipa uma skin por arma; as mãos continuam visíveis segurando o modelo, e a tecla `I` mostra sua lateral completa durante a partida.
- A loja TRETA$ ganha doze luvas de primeira pessoa por T$ 350, incluindo Emo Xadrez, Arquibancada, Bandeira do Brasil, Bandeira dos EUA e MAGA. Cada produto tem molde 3D isolado na loja e equipa a luva em todas as armas.
- Dez packs coordenados — Caveira Urbana, Brasil Neon, Liberdade 1776, MAGA 47, Emo Xadrez, Barbudo 13, Capitão 22, Selva Camo, Dourado e Prateado — reúnem AK, pistola, luvas e faca por T$ 2.000 cada. O MAGA amplia novamente “MAGA” no cano e “47” no punho.
- Cada skin de AK e pistola passa a ter seu próprio vídeo isolado em movimento. O detalhe de pack alterna clipes identificados de AK e pistola; nenhum desses vídeos inclui arma, mãos, braços ou HUD de outra skin.

### Alterado
- As oito skins políticas deixam de usar uma placa sobreposta: o símbolo agora é uma pintura metálica ajustada à lateral real da malha, e as frases seguem à esquerda ou centralizadas no cano/ferrolho. Os textos Brasil 22 e Estrela Vermelha ficam maiores sobre áreas azul e branca; os símbolos Trabalho 13, Estrela Verde e Brasil 22 ganham escala e posição legíveis.
- Nas pistolas políticas, as frases sobem para o ferrolho/cano e ganham escala sem sair da arma. A Tropicalente usa somente um coqueiro maior sobre o ferrolho cinza; a Trabalho 13 troca foice e martelo por uma estrela amarela.
- O Gauntlet visual diferencia Tamo Junto de É Nóis sem depender do texto, normaliza a escala do Camo Selva e a paleta do Emo Xadrez entre AK e pistola, e troca o brilho plástico de ouro e prata por acabamento metálico escovado controlado.
- As dezoito variações de AK e pistola com frases usam letras cerca de 20% maiores e margens menores, mantendo a pintura dentro do cano e do ferrolho.
- Nicks de exibição aceitam de 2 a 32 caracteres no cadastro, comunidade, chat, partida, perfil, badge e cartões compartilhados. Killfeed e painel de morte tratam o nome como texto.
- A contagem agregada de abertura, carga, entrada, partida e sessão envia somente evento, versão e faixas. O fluxo não usa identificador, cookie ou storage e fica desligado em automação e depuração.

### Corrigido
- O ranking completo volta a rolar até as últimas posições.
- Convidados antigos conseguem recuperar o login sem perder o progresso local.

## Não lançado — 2026-10-12

### Alterado
- Os 19 wallpapers de Políticos e Míticos recebem o acabamento ilustrado das artes antigas, com pele, pelagem, tecidos e luz mais detalhados. Identidade, figurino e armas permanecem reconhecíveis; o enquadramento conserva o personagem inteiro em 3:2 e 16:9.

## Não lançado — 2026-10-11

### Adicionado
- Políticos e Míticos ganham 19 wallpapers na rotação dos menus. As artes mantêm 3:2; os seis loadings usam 16:9 exato, e o palhaço vermelho recebe uma composição mais larga para preencher a tela 5K sem faixas laterais.
- Políticos e Míticos ganham 19 sprites animados no cabeçalho, com transparência, proporção quadrada e versão estática para movimento reduzido. Os fundos dos menus e os sprites alternam a cada 20 segundos enquanto a tela está visível.

### Corrigido
- Acabamento dos mapas: materiais minerais menos brilhantes, paletas mais coerentes e terreno das Obras com escala de textura uniforme. As texturas compartilhadas recebem manchas amplas sem alterar a resolução ou o sorteio dos mapas. Três pixações pretas descartam o quadriculado claro no shader, preservando os arquivos originais. Comparação visual local e regressões ainda em validação.
- A documentação deixou de apontar para o guia interno BotBrain removido e usa o domínio com `www` para abrir o jogo. A imagem de fallback do personagem recebe `src` somente quando há uma URL válida; o CI verifica links e URLs vazias no HTML publicado.
- **Multiplayer:** removida a caixa fixa de diagnóstico com FPS, snapshots, jitter, banda e ping. A coleta continua alimentando a telemetria de qualidade por sessão.
- **#696 — `assert:assets` reprovava com o pacote público mesmo depois do fetch.** O `audio-pack-v8` (445 entradas, medido em 04/10/2026 no diretório central do zip) não tem pasta `ambiente/` nem a chave `mapSoundscapes`, e o conserto — `prepare-public-preview.mjs` — era chamado SÓ pelo workflow de preview. `scripts/fetch-audio.sh` agora termina a preparação em todo caminho público (`ensure-map-soundscapes.mjs`, que instala `mapSoundscapes` nos 18 mapas com o hum que o jogo sintetiza; o pack privado não passa por ele, porque ambiência real que falta tem de reprovar o build). `eval:audioruntimeassets` passa a provar os TRÊS estados do contrato — cru = vermelho, preparado = verde, parcial = vermelho — chamando o `assert:assets` real.
- **#741 — a `graffiti-editorial-check` media layouts que ninguém vê.** O `TypeError` de `fy_corrego` (id que virou `corrego`) era a ponta visível: as cláusulas `religioso-vulgar`, `putin` e `rostos-carecas` comparavam com `fy_corrego` e passavam verdes sem medir nada — os três mutantes eram cegos. `NOVOS` passou a listar os ids que o jogo pede no `grafitar({id})` (`escadao`, `campomorro`), e a exigência de tabela nominal em Lajes saiu: o layout assado tem 4 tags e nenhum decal vetado. Sobraram 4 vermelhos, todos de conteúdo — ver a issue.

### Adicionado
- O topo da home agora permite desligar e religar a música do menu; a escolha fica salva no navegador. A rotação da intro usa apenas `m11`, `m14`, `m16`, `m17` e `m22`, retirando as três faixas com voz da seleção anterior.
- Contador central de SEQUÊNCIA mostra os abates da vida atual confirmados pelo jogo/servidor, com identidade visual do CSBrasil; morte, round e reconexão o zeram sem apagar o total da partida. Régua `eval:killstreak` cobre SP e MP com seis mutantes.
- Contador de ABATES do jogador no HUD, na coluna de estado dele: algarismo grande com rótulo miúdo, conta a PARTIDA (não o abate do time nem o da rodada) e não zera na virada de round — antes o número pessoal só existia atrás do TAB. Régua `eval:abateshud` com quatro mutantes, no `check:fast`.
- Sertão da Treta substitui o Velho Oeste: casario de taipa, Caatinga, Canudos, calango quadrúpede, aves, cabras e galinha com pintinhos. Preview real com vídeo silencioso ao passar o mouse; criação com caminhada e pausas. O memorial de Padre Cícero permanece fora desta entrega.
- Camada operacional (`tools/ops/`, `npm run ops:diag`): o jogo diagnostica boot, deploy, assets no edge, APIs, telemetria, ranking e partida sintética e explica cada achado com causa provável, evidência, impacto e próximo passo; separa "tecnicamente verde" de "pronto para lançamento". Mutantes em `ops:selftest` e unidades em `ops:test`, os dois no `check:fast`.
- `public/js/ops.js`: sinais da sessão no navegador (marcos de boot, FPS em partida, falhas de carga, contexto WebGL, erros de partida, abandono) expostos em `window.__csbOps` e como migalhas do relatório de erro — sem endpoint novo, sem desenhar nada.
- Runbook `docs/runbooks/operacao-autonoma.md`: como diagnosticar, recuperar por classe de achado e reverter site, edge, backend e banco.
- `npm run ops:aquecer` e o passo no `prod-watch.yml`: depois do purge de cada deploy, o edge é aquecido com os módulos e todos os assets que a produção pede (111 MISS de 112 logo após a alpha.224 → HIT).
- `ops-diag.yml`: a diagnose com navegador roda a cada hora e vira issue `ops-diag` em vermelho; `portao-browser.yml` passa a rodar `eval:boot` e as provas de navegador da camada operacional em PR que toca o boot.
- O beacon de `/api/perf` leva o resumo do `ops.js` (boot, FPS p50/p5, falhas de carga, sessão anterior) e o relatório de crash diz onde a sessão anterior parou; a sonda de navegador usa a GPU do Mac sozinha e o elenco é sondado pelo `glbchars.js` que a produção serve.

### Corrigido
- O Campinho da Quebrada ganha cobertura nos dois portões e nas laterais, placar de várzea e navegação contínua nas quinas, preservando duas rotas separadas em CTF e partidas 5x5/8x8.
- Funkeiros e Tribos Urbanas voltam a usar somente os pools de voz históricos da v7. As 36 falas Gemini rejeitadas deixam de ser alcançáveis pelos resolvers de evento, rádio e seleção; se o pack contiver apenas takes novos sem aprovação, o runtime fica em silêncio. Voz genérica, Web Speech e música removida continuam ausentes.
- Lobisomem Mítico deixa de puxar aliados de outras facções, passa a resolver M nas telas de inspeção, usa luva M distinta no viewmodel, ganha animação própria com pés no chão e volta a publicar os retratos de resultado aprovados, que tinham saído do quadro medido no elenco.
- O pack integrado do Lobisomem passa a servir os clipes próprios na sequência do runtime, com o fallback compartilhado preservado só para comparação e regressão.
- No Sertão, as três carroças deixam passagem pelos dois flancos e as cinco casas diante dos respawns passam a ter porta, saída lateral, janela com revide e navegação intencional para bots.
- As casas abertas da Praça da Matriz no Sertão preservam cobertura nas laterais das janelas, circulação interna livre e passagem dos bots junto aos esteios.
- Em rodada de FACA os bots passam a jogar de faca: fecham até o alcance real da arma (medido 5,98 m e zero golpes em 60 s antes; 1,24 m, 18 golpes e 9 abates depois) e o golpe sai como faca — sem traçante, fogacho de cano nem som de tiro. A banda de distância de arma de fogo continua valendo na rodada normal. Régua `eval:botfaca` com três mutantes, no `check:fast`.
- O headshot do jogador não arranca mais a câmera da primeira pessoa: a replay orbital e o hit-stop do #364 saíram, e o abate continua contando com hitmarker, dano, killfeed e locutor. Régua `eval:replaycam` passou a medir o contrário, com quatro mutantes.
- Single Player voltou a abrir o submenu de MATA-MATA e CAPTURE A BANDEIRA (CTF), que segue para a seleção de mapas com o modo escolhido.
- `eval:boot` voltou a rodar: a fixture do `boot-check.mjs` ancorava na assinatura antiga de `_startGame` (mudada no #489) e reprovava antes de medir; agora ancora no nome da função.
- Os contadores do menu (`/api/online` e `/api/map-plays`) tentam de novo no cold start do backend (503 na primeira chamada, medido 06/09) em vez de ficar vazios.
- O proxy da rede de segurança do site repassa a geo da borda (`x-vercel-ip-*`); a diagnose distingue `city` parado com `presence` viva (ingestão parada, corosolto/backend#22) de "ninguém jogou".
- O build privado volta a carregar os 16 anúncios Fish, as 36 falas finais dos nove Funkeiros e somente as oito músicas aprovadas do menu.
- Palhaços e Funkeiros sem take próprio deixam de tocar dublagem genérica; os Funkeiros preservam somente as 36 falas aprovadas.
- A primeira fala de kill não é mais bloqueada por uma seleção ou chamada de rádio imediatamente anterior.
- O empacotador limpa saídas anteriores e reconhece uma AWP CC0 catalogada sem confundi-la com áudio legado pelo nome.
- Tiros ficam abaixo das vozes e a contingência original restaura falas, rounds e kill streaks em single-player e multiplayer.
- O multiplayer reconhece inputs por sequência e suaviza correções sem apagar movimento pendente.
- Arma, slots, pente, reserva e recarga passam a ser autoritativos no protocolo snapshot v4.
- Trocas de arma remotas remontam a malha visível; clientes lentos não acumulam snapshots obsoletos.
- A qualidade envia magnitude das correções para diagnóstico por sessão e round.
- Multiplayer não vaza mais para a partida single-player depois de voltar ao menu.
- O primeiro spawn e o respawn online obedecem imediatamente à posição autoritativa.
- Captura de bandeira passa a receber placar, progresso, donos e relógio pelo snapshot v3.
- Slots abandonados voltam à IA e as salas oficiais passam de 5v5 para 4v4.
- O catálogo in-game usa a mesma versão v8 do pacote de áudio baixado no build.

## [2.1.0-alpha.135] — 2026-11-01

### Mudado
- fix: fauna curada 5 mapas/10 animais + censo honrado em mobile (follow-up #1192) (#1193)
- Colete e capacete estilo CS (mecânica, sem loja) (#1159)
- Adiciona a granada flash com cegueira estilo CS (#1163)
- Tiro sai da boca da arma na tela (3P, bots, remotos, 1P) (#1164)
- Ajusta a hitbox de cabeça à malha de cada personagem (#1166)
- fix: preserva Arena nos três eventos de telemetria (#1195)
- Quebrada: orientar fachadas e espaçar a vegetação (#1196)
- fix: alinha origem dos efeitos ao cano físico da AK (#1194)
- release: publicar fauna, Quebrada, AK e telemetria (#1199)
- test(vm): rejeita amostra trocada após respawn
- fix: valida grafites da Quebrada com a fauna integrada
- fix: regenera grafites da Quebrada nas fachadas atuais
- fix: mede placares da AK após calibrar a boca física
- fix: cure manchas de mato nas vielas da Quebrada
- test: recuse argumentos inválidos na telemetria
- docs: registre validação da boca física da AK
- fix: preserve modo Arena na telemetria
- fix: ancora o flash da AK na face física do cano
- test: rejeita prova vazia na régua da Quebrada
- fix: orienta três casas para a viela da Quebrada
- fix: keep curated fauna census under low quality on real devices
- Align Escadao curated fauna with the rendered terrace
- Expand curated fauna census to all cats and hens in five maps
- Bind curated fauna to supported routes in three more maps
- Fix authored fauna height during movement and recovery
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)

## [2.1.0-alpha.134] — 2026-11-01

### Mudado
- fix(hud): separa infraestrutura de detecção de mutantes (#1186)
- fix(issues-bot): triagem idempotente e bootstrap que pula de verdade (#1134)
- [REA] Quitar a dívida de cobertura dos viewmodels (#1141)
- fix(ci): exigir prova semântica dos mutantes (#1182)
- Corrige veredito do runner para erro com status zero (#1189)
- fix: usar fauna curada no Escadão e em Lajes (#1192)
- Integra a composição visual b808 revisada, incluindo #1179, #1190, #1191 e #1192. Operação Flávio #1158 excluída. CI aplicável passou, revisão atual adjudicada,17 fios resolvidos e crítica independente Native CLEAN_SCOPED. Limites de arte, mobile/MP, suíte ampliada e release permanecem na descrição e no ledger. (#1188)
- docs: registra integração revisada da fauna e próxima publicação
- Registre a composição visual e as provas de boot
- Registre a validação real do coletor de boot
- Aguarde os recibos exatos do relatório de boot
- Ajuste a escala dos tijolos nas duas fachadas da Quebrada
- Registre as correções visuais e os gates pendentes
- Evite repetir cartazes na Brasília pequena
- Meça a entrega de KeyW no evento do chat
- Ajuste o punho livre no preview do Esquerdomacho
- Clarify runtime fauna gate browser-error coverage
- Reject fauna turn rates that consume the full escape alert
- Atualize links gerados após filtro de pickups
- fix: keep Lajes cat escapes clear of roof obstacles
- fix: require explicit server origin for fauna CI capture
- Registre a validação do filtro e a fila visual atual
- docs: clarify fauna menu behavior on automatic mobile
- Esclareça o comando de contraprova de pickups
- fix: walk curated fauna back along its recovery heading
- Restaure o filtro de pickups por modo
- test: pin curated fauna pivot action and rate contract
- Atualize a prova de grafite para R21
- fix: align curated fauna before translating into a turn
- fix: smooth curated animal turns across route reversals
- test: cover fauna registry and bound local capture timeout
- test: audit instantiated fauna in the browser CI gate
- fix: reject incomplete and duplicate fauna map census
- Registra composição visual e prova de compatibilidade
- fix: mostra o aviso de prévia indisponível no hub
- fix(eval): align isolated fixtures with fauna lifecycle
- fix: preserva preview sem Object.hasOwn
- docs: qualifica evidência histórica de boca do cano
- fix: avisa quando a flash pública fica indisponível
- fix(menu): dispose retired backdrop ambience on rebuild
- test: fechar controles da fauna e do menu
- docs: registra composição visual e provas R63
- fix: settle lobby poster before releasing model handoff
- Liga armadura e consumidor real de ADS à CI pública
- Registra composição revisada e verificação real de previews
- fix: synchronize lobby dances with motion preference
- Exige aridade real dos atributos nas fachadas Campo
- fix: retain legacy preview visibility and avoid idle redraws
- fix: mantém identificação do equipamento no cartão do lobby
- Registra composição de skins e estado atual do inventário
- fix: preserva a identidade da skin quando o preview 3D falha
- Traduz as legendas dinâmicas do preview de skins
- Registra correção do verificador e validação de toque
- Meça o UV das fachadas mescladas do Campo
- fix: acorda o boot após reposição do inventário na compra
- Registra o gate de grafite e a pistola ativa no preview
- Aceita linha vazia na stack do cancelamento
- Mede módulos locais sem depender do status remoto
- Serve dependências locais no orçamento de boot
- Registra a consolidação visual e a verificação do preview
- Atualiza a integração linear do acabamento visual
- Registra a composição da stack de acabamento visual
- Consolida o acabamento das fachadas do Campo
- fix(qa): provar falhas de grafite sem aceitar erros de infraestrutura
- Evita retarget do PR para o próprio commit
- Ancora fauna no piso e corrige os contratos de captura
- Usa fauna texturada do acervo em Escadão e Lajes
- Corrige a chamada do auditor visual e o timeout de visão
- Alinha o changelog e o contrato da grade ao jogo atual
- Alinha fixture da loja ao cancelamento compatível
- Corrige a prova do perfil próprio no orçamento de boot
- Mantém manifesto de skins compatível com navegadores mobile
- Evita esperar manifesto para equipamento inutilizável
- Atualiza as pendências já encerradas das facas
- Recupera o contrato estrutural do Ferro Velho
- Invalida callbacks de ciclos anteriores do retrato compacto
- Cancela o retrato anterior quando a skin não tem pôster
- Evita sobreposição do personagem nos controles mobile
- fix(ui): release hidden preview images on navigation
- fix(mobile): restore compact equipment preview and pose control
- Carrega só os props usados pela Praça
- Invalida cartões ao navegar e exige posse na apresentação equipada
- Reconcilia mídia visível e congela prévia com movimento reduzido
- Contém renderizadores no mobile compacto e restaura o preview 3D
- fix(boot): carregar apenas a fauna usada na Praça
- Mostra o equipamento em cartões estáticos no mobile deitado
- Preserva a skin no preview mobile e invalida mídia antiga
- Fornece AbortSignal à fixture da loja
- Aguarda manifesto da skin equipada no boot
- test: alinha contrato da grade ao layout validado
- docs: registra falha do contrato UI e staging pendente
- fix(ci): classify only confirmed absent guest profiles
- docs: record independent visual and gate findings
- docs: checkpoint visual capture and cancellation evidence
- fix(ui): keep character confirmation accessible in short viewports
- docs: checkpoint visual rejections and causal proofs
- test(vm): fechar catálogo completo em 16:9 com entradas atuais
- fix(ci): medir salto aprovado e auditar grafite nominal no check web
- test(vm): renovar placar completo em 3:2 sem ampliar aceites
- docs: registrar bloqueios medidos da integração visual
- docs: registrar integração revisada e baseline atual do Campo
- fix(mapas): restaurar layout da Piscina após exceção
- docs: registrar reparo isolado da ponte local Three
- docs: checkpoint antes do push consolidado
- fix(qa): medir e exercer armas visiveis no toque
- Registre a integração do HUD e a validação local
- Registre as contraprovas do colete e do pulso
- Registra instalação própria do HUD com Node 22
- Registre a instalação local e o reinício dos portões
- Reutilize a leitura da flag de headshot
- Registra revisão independente e preparo do PR de HUD
- Valide a whitelist e decodifique o caminho do CLI
- Alinhe a deriva do preview ao lobby
- Registra a base integrada para revisão do seguimento HUD
- Exige o efeito real do PING no contrato de toque
- Restaura o PING móvel junto do controle de câmera
- Congela a pose inteira na câmera de inspeção
- Aponta o mutante móvel para o touch-fire real
- Captura a pegada após ligar o porte do preview
- Registra blocker de integração do mutante mobile do HUD
- Registra aceite focal das guardas e contraprovas 3P
- Prototipe acabamento das guardas do Córrego
- Corrige fixtures de boot após integração mobile
- Registra smoke da alpha 133 e revisões da fila
- Registra bloqueios medidos antes de republicar o lote visual
- Corrige comparação causal do recuo agachado
- Corrige veredito de filhos e exige sonda no CI
- Registra contraprova 3P sobrevivente antes da publicação
- Registra bootstrap revisado e build da integração visual
- Fecha os escapes de parsing e execução no portão de decalques
- Registra rejeições e provas da seleção consolidada
- Prepara contrato da pose de cabeça autorada
- Preserva poses autoradas e remove deformações da seleção
- Usa modelos em cache nos pickups iniciais
- Instala e confere decalques públicos antes do portão
- Assenta pickups do mapa antes do preload
- Registra paridade de memória e contexto na QA
- Isole mutantes de economia para evitar OOM no CI
- Preserva stdout JSON do contexto autorado
- test: exige autoteste causal completo do yaw
- Limpa yaw antes da morte e prova transições
- test: liga regressões de yaw ao contrato TP
- Mantém réguas independentes após falha no CI
- Evita acúmulo no recentro da cabeça
- fix: emite efeitos FP na pose final da arma
- docs: registrar investigação parcial do tiro AK
- Registra a validação do boot coerente antes da integração
- Mede o boot com grafo local coerente e instante real de entrada
- Registra estado recuperável da missão visual e bloqueios reais
- Preserva continuidade integral da missão visual
- Carrega somente a arma escolhida no preview
- Registra merge das normais e prova atual de curadoria
- ci: preservar identidade editorial no contrato público
- ci: ligar contratos visuais atuais ao portão público
- fix(mapas): contar identidade editorial dos grafites
- Mede a curadoria atual de grafite no portão de CI
- Registra o checkpoint QA antes da integração de Campo e faca
- Orienta o texto da faca no comprimento da lâmina
- fix(skins): prende marcas à lâmina real em primeira e terceira pessoa
- fix(mapas): mantém escala métrica no acabamento do Campo
- Registra bloqueios reais do push visual e a próxima integração
- Captura a pegada do preview após assentar a pose funcional
- fix(hud): separa infraestrutura de deteccao de mutantes
- Valida a curadoria atual nos mapas pelo navegador real
- Endurece os gates visuais herdados e atualiza fixtures TP
- Sustenta o outdoor do Posto e atualiza o bake oficial dos mapas
- Integra os degraus do perímetro e contratos físicos das favelas
- Preserva skins equipadas e enquadra o corpo ao morrer
- Aplica acabamento PBR consistente no Córrego
- Faz a grade de personagens caber em tela horizontal
- Mantém IK e proxy de cabeça nas unidades e pose finais
- Vincula equivalência de normais às referências de personagem
- fix(issues-bot): serializa bootstrap e preserva branch remota
- Registra provas visuais e bloqueios de integração da tarde
- Registra revisão das normais e fechamento das frentes visuais
- Atualiza imports do arnês da loja e gatilhos do censo
- Preserva pickups fora da economia e respeita flash desligada
- docs: sincroniza comandos gerados dos gates visuais
- docs: sincroniza comandos gerados dos gates visuais
- docs: registra revisão causal e próximas correções visuais
- docs: registra entrega isolada e pendências visuais
- test(grafite): mede contagem crua e falha de carga no Ego
- fix(vm): alinha os sockets da AK ao ADS real
- test: exige falha causal nas réguas de gameplay
- Corrige a curadoria de grafites e o acabamento do Ferro e Campo
- docs: registra bake e evidências visuais parciais
- test: mantém a falha de mutação cega reconhecível
- Liga movimento do viewmodel à física e limpa estados no respawn
- Atualiza frescor das quatro cabeças remediadas
- Corrige textos e toque na seleção de personagens
- Corrige apoio e repetição dos cartazes manuais
- Suaviza costuras de iluminação em quatro personagens
- test: exigir falha semântica nos mutantes declarados
- fix(viewmodel): preservar normais finas das mangas quantizadas
- docs: registrar fechamento das mangas e leases visuais
- docs: registrar causa da manga e prop em contexto
- docs: preservar diagnostico real e retornos das leases
- docs: registrar ficha privada e leases da rodada
- docs: registrar review restaurado e comparacoes reais
- docs: registrar validacoes reais e revisoes por componente
- docs: manter pendencias de faces e validacao de acabamento
- docs: registrar provas de curadoria e drift de pose
- test(economia): validar recompra paga apos o renascimento
- docs: registrar revisao do SB7 e limite do aceite de normais
- docs: registrar provas reais e entregas parciais rejeitadas
- Reabre régua de curadoria após mutantes no desenho real
- Registra curadoria completa e limites de motion e ADS
- Registra curadoria medida e crítica visual independente
- Registra leases GLM e dependências da fila de PRs
- Registra protocolo real de revisão e bake reproduzível no Ego
- Registra régua vermelha e reaproveitamento do PR 1173
- O bake de grafite cancela quando falta entrada na cena
- Registra integração local do PR 1179 e baseline
- Define avaliação por mapa, UI e personagem
- Registra missão de consistência visual e release
- style: comentários inline do clampAlcanceIK no teto da régua
- docs: históricos da rodada 31/10 no ANIM-3P; comentários inline no teto de 2 linhas
- fix(ci): execute every announced mutant
- fix(personagens): cabeca alinhada, recarga sem braco atras e capa do Juiz
- fix(personagens): banda do curl afinada no meio (0,55-0,95)
- fix(personagens): teto de frente só no Canarinho; lobisomem volta ao porte alto
- fix(personagens): dedos fecham de verdade na arma (curl 0,35-0,80 - 0,55-1,10)
- fix(personagens): teto de frente por corpo puxa arma colada à mão
- fix(personagens): pistola do Canarinho deixa de flutuar 50cm à frente
- chore(gauntlet): enquadramento com folga (3.0 m, alvo 0.92)
- docs(economia): 30 - 50 s de compra com reabertura por renascimento
- feat(jogo): pulo padrão 5.0 - 5.6
- fix(lobby+seleção): fim do flicker e grade do elenco
- chore(gauntlet): arnês de gauntlet visual por personagem x arma
- feat(compra): modal compacto, ícones, moeda TRETA$ e 50s no respawn
- fix(morte): cadáver para de se debater pra trás
- fix: recalibrar cobertura limpa da Piscina
- feat: concluir compra e munição da partida
- fix: corrigir personagem e Piscina
- chore(docs): regenera bloco derivado (autofix)
- Encurta o comentário da armadura por chumbo
- Atualiza o HUD da flash na morte
- Aplica o colete por parte na rajada do bot
- Regenera matriz e ARCH depois da loja
- Documenta o equipamento da loja
- Faz o bot gastar a sobra em colete
- Vende colete, capacete e flash na loja da partida
- Regenera arquivos gerados do lote
- test(lobby): régua cobre mascotes e usa porta livre
- test(lobby): chave ?pvpivo=0 para o mutante do pivô
- fix(lobby): gira o pulso só no porte parado
- fix(lobby): mede a pegada depois da folga do corpo
- Atualiza a prancha para o foco alinhado das pistolas
- Liga os mutantes que o cabeçalho da central de mensagens prometia
- Dá 3 min à captura da régua mira-alinhada
- Re-mede o placar de viewmodel das pistolas
- Regenera a matriz de armas
- Registra a procedência da flash do Mint
- Carrega a flash do Mint de public/models
- Aponta o otimizador da armadura para models/armadura
- Carrega colete e capacete de models/armadura
- Versiona o modelo da flash do Mint em public/models
- Versiona colete e capacete do Mint em models/armadura
- Aplica a revisão na régua mira-alinhada
- Regenera a matriz de armas com as linhas do game.js
- Atualiza o doc dos bots com as regras novas
- Cobre gancho de malha e recompra dos bots na régua
- Bot não paga para trocar primária do chão
- Deixa pistolas no foco alinhado abaixo da cruz
- Cobra a altura da arma só no ADS em linha de mira
- Dá _participanteHumano ao jogo falso do eyewear
- Aperta o teto de vazamento de perfil para 0,40
- Cobra humano, pescoço e mira do bot na régua
- Regenera a matriz de armas com as linhas do game.js
- Regenera o ARCH.md com as linhas novas do game.js
- Roda a régua da economia no jogo no CI
- Atualiza o doc da compra com as regras novas
- Cobre teclado, pickup e varredura na régua do jogo
- Conta só L1-L3 como mordida do mutante foco
- Mede pistola e Desert Eagle por padrão no ads1p-linha
- Mira o bot na base da cabeça justa do alvo
- Gira a cabeça de humano pelo corpo também no nó
- Ignora tecla repetida no menu de compra
- Troca arma do chão pelo mesmo slot com loja
- Esconde o slot de primária vazio no toque
- Põe o menu de compra acima da mira do toque
- Mede curva da tela e reset da cegueira na régua
- Regenera matriz de armas
- Cobra respawn e HUD de morto na régua do colete
- Esconde o colete do HUD quando o jogador morre
- Re-equipa a armadura na troca de time
- Não mede o corpo quando ninguém veste colete
- Esconde colete com a câmera 3P dentro do corpo
- Regenera a matriz de armas
- Roda a régua da economia no CI
- Corrige o contrato do MP no doc da economia
- Cobra eco online e ramo GLB na eval:boca-cano
- Prende números do doc na régua de economia
- Recusa compra sem 'vivo' explícito
- Aceita o rótulo curto na recompensa por kill
- Remoto com eventos acende um clarão só
- Dá ícone ao slot da flash no HUD
- Esconde o slot da flash quando ela está desligada
- Limpa o overlay da flash ao sair da partida
- Eco do tiro local só some se houve clarão local
- Pendura a régua de pichação no portão
- Roda a régua de pichação com caminho codificado
- Arma escondida no emote não vira origem do tiro
- Anexa a prancha antes e depois das cabeças
- Cobra a cabeça justa com régua e mutante
- Usa a cabeça justa de cada personagem no tiro
- test(lobby): régua sobe o próprio servidor
- style(lobby): encurta comentários do pulso no preview
- Aceita cabeça elipsoidal na entrada do tiro
- Mede a cabeça da malha de cada personagem
- docs(lobby): prancha antes/depois da arma na mão
- fix(lobby): gira o pulso em torno da palma
- test(lobby): régua da arma na mão do preview
- fix(lobby): gira o pulso, não a arma, no preview
- Regenera a matriz de armas
- Anexa prancha antes e depois da sangria da tinta
- Regenera a matriz de armas
- Anexa prancha e medidas da boca do cano
- Adiciona prancha antes/depois da boca do cano
- Anexa a prancha antes/depois do ADS das pistolas
- Enxuga comentários da flash ao teto de duas linhas
- Tira FLASH_ON do método recortado do HUD
- Mantém a AK golden no ADS de foco aprovado
- Mede no jogo o cano da arma contra o raio da mira
- Anexa prancha antes e depois do colete
- Troca o colete provisório pelo modelo do Mint
- Cria otimizador do colete e capacete do Mint
- Documenta a compra dos bots
- Cobre a compra dos bots na régua do jogo
- Faz os bots comprarem com o TRETA$ da partida
- Adiciona a regra de compra dos bots
- Anexa a prancha antes e depois da compra
- Deixa o fundo do menu de compra opaco
- Centraliza o menu de compra no toque
- Adiciona prints da flash no jogo
- Regenera o ARCH.md do game.js
- Cobra o traçante 1P autorado na eval:boca-cano
- Traçante 1P autorado no pixel do cano
- Troca a flash provisória pelo modelo do Mint
- Reassina o layout de grafite sem reassar
- Tira o fator do offset de profundidade da tinta
- Mede pichação descolada ou vazando da parede
- test: isolar throttle entre beiradas
- fix: fechar o mantle no multiplayer
- Documenta a compra dentro do jogo
- Adiciona régua da economia dentro do jogo
- Liga a compra de armas na partida
- Estiliza o menu de compra da partida
- Adiciona as frases do menu de compra
- Encurta o comentário de adsEfetivo para 2 linhas
- Dá script eval:ads1p-linha com o mutante foco
- Alinha ADS 1P da Desert Eagle à linha de mira
- Faz eval:vm-mira ler o estilo efetivo do ADS
- Cria régua Node do ADS 1P na linha de mira
- Alinha ADS 1P da AK e pistola à linha de mira
- Atualiza índice do ARCH.md
- Adiciona régua eval:boca-cano
- Tiro remoto sai da boca da arma do corpo
- Traçante 1P legado no mesmo pixel do cano
- Clarão e traçante do bot saem da boca da arma
- Tiro em 3ª pessoa sai da boca da arma do corpo
- Documenta a economia de partida
- Adiciona régua da economia de partida
- Cria regras do TRETA$ da partida
- Cria catálogo de compra da partida
- Adiciona régua da flash com mutantes
- Desliga a flash online sem suporte do servidor
- Adiciona a granada flash com cegueira estilo CS
- Adiciona estalo e surdez da flash ao áudio
- Cria régua de dano com armadura e mutantes
- Regenera ARCH e matriz de armas
- Veste colete e capacete provisórios no corpo 3P
- Mostra colete e capacete no HUD da vida
- Aplica colete e capacete no dano da partida local
- Cria regra pura de dano com colete e capacete
- Adiciona tabela de penetração de colete por arma
- feat: soltar movimento e escalar beiradas
- test: atualizar trajetória dourada do movimento
- Adiciona modelo de cegueira da flashbang
- chore(viewmodel): remover dívida de cobertura quitada
- fix(issues-bot): triagem idempotente e bootstrap que pula de verdade

## [2.1.0-alpha.133] — 2026-10-31

### Mudado
- Corrige SB7 e preserva reprovações antes de SKIP (#1181)
- Corrige mãos e traçante nas 26 armas mobile/desktop, posse exclusiva do gatilho e reset de entrada em todo ciclo de vida. PING passa a alternar câmera. Boot móvel aguarda a arma equipada e compartilhados, com regressões obrigatórias no CI. (#1187)
- Assenta arma do servidor antes de ativar viewmodel
- Limita carga inicial móvel à arma equipada
- Corrige fixture de lançamento com cosméticos atuais
- Cancela entrada entre vidas e rodadas locais e online
- Libera gatilho e dedos ao morrer e renascer online
- Mede o cano do modelo sem reutilizar a origem do traçante
- Trata saída truncada do executor como teste não medido
- Lê catálogo de armas no navegador do gate de mãos
- Executa liberação real de entrada na régua de pausa
- Atualiza matriz gerada para o runtime mobile
- Permite renderização por software no gate de mãos
- Mede mãos após terminar a animação de equipar
- Corrige mãos e disparo involuntário no mobile
- fix(eval): preservar reprovações medidas quando um filho não executa
- docs: preservar estado da revisao integral SB7
- docs(contributing): npm ci é passo obrigatório por worktree
- fix(eval): aplica os três desfechos nos outros 13 pontos da classe
- fix(sb7): para de acusar cache-bust quando falta dependência
- feat(eval): separa "não consegui medir" de "medi e reprovou"

## [2.1.0-alpha.132] — 2026-10-31

### Mudado
- Suaviza a iluminação de quatro personagens sem mudar geometria (#1184)
- Registra sincronização das normais com hotfix de armas
- Preserva equivalência histórica dos corpos com normais corrigidas
- docs: registra revisão da entrega de normais
- docs: gera comandos da entrega de normais
- docs: registra evidência contínua dos quatro personagens
- Suaviza costuras de iluminação em quatro personagens

## [2.1.0-alpha.131] — 2026-10-31

### Mudado
- fix(ci): mede a causa da splash sem travar o M4 (#1177)
- [REA] Liberar a primeira rota dos spawns (#1142)
- Liga os mutantes que o cabeçalho da central de mensagens prometia (#1169)
- [REA] Encurtar o guia inicial (#1140)
- [REA] Deduplicar avatares no placar (#1139)
- fix(ci): restaura o estraga-codigo como reviewer padrão (#1180)
- fix: mantém arma visível no mobile e desktop (#1183)

## [2.1.0-alpha.130] — 2026-10-31

### Mudado
- Conta visitantes em todas as páginas públicas (#1176)
- fix: conte visitantes em todas as páginas

## [2.1.0-alpha.129] — 2026-10-30

### Mudado
- Envie a identidade persistente ao funil (#1175)
- Envie a identidade persistente ao funil

## [2.1.0-alpha.128] — 2026-10-30

### Mudado
- Presença passa a ler cidade da Cloudflare (#1174)
- fix: ler geolocalização da Cloudflare

## [2.1.0-alpha.127] — 2026-10-29

### Mudado
- fix: granada x recarga x morte, e o braco da AK (#1103)
- fix: chat e mensagens param de falhar em silencio (#1130)
- Envie o funil diário de jogadores únicos (#1172)
- Preserve o contrato das rotas geográficas
- Mantenha contagem única no proxy do site
- Explique a atividade autenticada no funil
- Envie o funil diário de jogadores únicos
- ci(portao): o filtro do PR deixa de morrer no checkout
- feat(comunidade): mandar mensagem para qualquer cadastrado
- docs(armas): regenera a matriz com as linhas novas de game.js
- fix(comunidade): a DM explica qual portão barrou, e a régua volta a medir
- fix(chat): a tecla do chat para de morrer calada
- docs(armas): regenera a matriz com as linhas novas de game.js
- docs(bugs): a história dos cinco relatos sai do código
- docs(arch): regenera o mapa com os métodos novos de game.js
- chore(eval): registra as réguas dos relatos de 26/10
- fix(gameplay): granada, recarga e morte param de se atropelar
- fix(viewmodel): tampa da manga colapsava a malha quantizada da AK

## [2.1.0-alpha.126] — 2026-10-25

### Mudado
- perf(boot): Sobel 6,9x, cartaz sob demanda e fauna fora do caminho critico (#1099)
- feat(funil): marcos de boot e lobby, rotulo de aparelho (#1098)
- feat(hud): HUD final da tela 05 e escala de texto Treta Pop (#1100)
- Cobre o HUD final na régua do HUD v3
- Fecha o HUD final da tela 05
- Mostra rounds ganhos no placar do HUD v3
- Adiciona a escala de texto da Treta Pop

## [2.1.0-alpha.125] — 2026-10-25

### Mudado
- fix: correct ranking, tracers, and bot movement (#1097)
- test: gate reported gameplay regressions
- fix: correct ranking, tracers, and bot movement

## [2.1.0-alpha.124] — 2026-10-25

### Mudado
- fix(perfil): abrir perfil não recarrega o jogo inteiro (#1094)
- fix: loading do jogo some com o cache antigo (URLs novas loading-20..38) (#1096)
- feat(funil): manda o tipo da partida e não conta automação (#1095)
- fix(regua): contagem-check acompanha a assinatura de _funnel
- fix(splash): aponta slots e refs para loading-20..38
- fix(media): move o loading para URLs novas (loading-20..38)
- feat(funil): manda o tipo da partida e nao conta automacao
- fix(perfil): abrir perfil nao recarrega o jogo inteiro

## [2.1.0-alpha.123] — 2026-10-24

### Mudado
- fix(gravacao): folha volta para a paleta e para o escopo da v3 (#1092)

## [2.1.0-alpha.122] — 2026-10-24

### Mudado
- fix(perfil): presenca leva o cs_anon para ligar o navegador a conta (#1090)
- feat(perfil): historico desenha a partida solo com rotulo proprio (#1091)
- fix(canarinho): corrige cauda e empunhadura (#1089)
- fix(canarinho): preserva silhueta na seleção
- chore(canarinho): atualiza previews das skins
- fix(canarinho): reduz caudas dos modelos
- fix(canarinho): corrige porte da pistola

## [2.1.0-alpha.121] — 2026-10-24

### Mudado
- release: lote 2026-10-24 (loading elenco, splash, creator kit, capturas) (#1074)
- docs(changelog): anota o loading do elenco
- feat(splash): roda as 19 artes do elenco no splash v3
- feat(media): troca o loading pelo elenco em 16:9
- site: follow public copy punctuation rule
- site: add creator kit for real multiplayer sessions
- film: verify existing capture bucket policy
- film: proxy gameplay submissions to private backend
- film: add opt-in gameplay capture library
- fix: stop splash sync after DOM removal

## [2.1.0-alpha.120] — 2026-10-24

### Mudado
- fix(loja): vence cache antigo do manifesto de skins (#1069)
- fix(loja): versiona manifesto de skins

## [2.1.0-alpha.119] — 2026-10-24

### Mudado
- fix(prod): limpa manifesto de skins no edge (#1066)
- fix(ranking): logado não vê convite de nick, e a lista rola por página (#1067)
- fix(ranking): logado nao ve convite de nick, e a lista rola por pagina
- fix(prod): purge skin manifest after deploy

## [2.1.0-alpha.118] — 2026-10-24

### Mudado
- Dança: guarda a arma, solta os braços e abre o passo (#1057)
- feat(lobby): skin comprada vira personagem + convite de 1.000 T$ para anônimo com nick (#1061)
- feat(ranking): placar vira tela de topo, com card no lobby (#1058)
- fix(deps): fecha as 5 vermelhas do DEP1 (zod e undici) (#1062)
- feat(ui): movimento único e ambiência do palco (Treta Pop fases 2 e 3) (#1052)
- feat(loja): adiciona treze skins míticas (#1063)
- fix(skins): reforça visual do Mandrake Cyborg
- feat(skins): integra quatro cyborgs adicionais
- fix(loja): remove faixa dos cards de personagem
- feat(loja): unifica vitrine de personagens
- feat(skins): integra nove rigs míticos
- fix(deps): undici 8.12.3 por override, a ultima vermelha do DEP1
- docs: bloco gerado de scripts com as reguas novas
- feat(convite): anonimo com nick ve o bonus de 1.000 T$ do cadastro
- feat(lobby): skin comprada vira personagem selecionavel
- fix(postura): skip declarado para canarinho e bonzo; dívida atualizada
- fix(postura): JSON do gate só com JSON=1 (CS4)
- docs: regenera blocos derivados (autofix)
- feat(postura): contrato de postura e movimento para quem segura arma
- fix(3p): porte de 1 mao — a pistola sai da ponta dos dedos
- fix(dancas): porta fechada ate o dono validar os passos
- Pipeline de danca por video: extrator, prova e o que ela nao prova
- Danca: guarda a arma, solta os bracos e abre o passo

## [2.1.0-alpha.117] — 2026-10-22

### Mudado
- fix(granada,faca): utilitário equipável, porte de lâmina em 3P e portão da AK enxergando meshopt (#1047)
- fix(skins,inspect): pintura na arma inteira (1P e 3P) e inspeção virando a arma de lado (#1048)
- 3P: o corpo denuncia recarga, tiro, queda e giro (+LOD de animação) (#1049)
- fix(inspect): calibra o giro para 0,70 rad, knob de A/B e diagnóstico da manga oca (#1050)
- fix(viewmodel): fecha a boca da manga do pacote golden (fim do "leque" no punho) (#1051)
- Dança no lobby: oito passos brasileiros sem asset novo (#1054)
- Dança na partida: tecla T, roda de 8 passos e o botão do lobby que estava escondido (#1055)
- ops(nos): um no so — us e eu saem do cliente (#1056)
- docs: regenera a matriz de armas
- Danca na partida: tecla T, roda de 8 passos e camera que mostra
- Dança no lobby: 8 passos brasileiros sem asset novo
- fix(viewmodel): fecha a boca da manga do pacote golden
- fix(inspect): calibra o giro para 0,70 rad e expõe o knob de A/B
- docs: regenera blocos derivados apos o rebase na main
- 3P: flinch, recuo agachado, pose de ar, giro com quadril e LOD
- 3P: o corpo denuncia a recarga e inclina no strafe
- fix(skins,inspect): pintura na arma inteira e inspeção de lado em 1ª pessoa
- chore(docs): regenera bloco derivado (autofix)
- fix(granada,faca): utilitário equipável e porte de lâmina em 3ª pessoa

## [2.1.0-alpha.116] — 2026-10-21

### Mudado
- QA mobile: o jogo se mede sozinho no aparelho, e um smoke depois do deploy (#1042)
- revisão de asset por arquivo: release novo para de rebaixar o acervo inteiro (#1038)
- feat(lobby): luva equipada no personagem + gauntlet de 50 skins (#1044)
- feat(loja): Pack Selo Ácido + conserto P0 da luva no lobby (#1046)
- Controles de toque: a arma aparece na barra e o dedo consegue virar (#1045)
- fix(deps): vite 8.3.5 fecha o DEP1 high do portao
- feat(loja): Pack Selo Acido e conserto da luva no lobby
- A barra de armas mostra a arma, e o dedo consegue virar
- fix(regua): ativar a mira antes da captura no jogo
- feat(lobby): luva equipada no personagem e gauntlet de skins
- Regenera os blocos de docs com assetrev e qamobile juntos
- As outras tres reguas da fauna leem o mapa gerado
- LA4 passa a ler o mapa gerado, nao a tabela escrita a mao
- catálogo da régua nova e a nota do jogador no changelog
- régua asset-rev: AR1–AR5, três mutantes, e o mapa gerado no build
- os consumidores de GLB pesado passam a usar assetUrl()
- revisão de asset por arquivo: gerador, mapa e helper de URL
- Mede o roteiro deitado, que e como o celular joga
- Afrouxa o teto de duração do QAM1 para 1,6×
- Tira a narrativa do código e põe em docs/mobile/QA-MOBILE.md
- Regenera os blocos de docs com o check:fast novo
- Documenta as duas réguas novas e quando rodar o smoke
- Cobra o harness de QA mobile e o smoke pós-deploy
- Publica o mobile-config.json que o app de loja lê
- Mede o jogo no celular com um roteiro de 20 s

## [2.1.0-alpha.115] — 2026-10-20

### Mudado
- feat(lobby): o personagem segura a arma equipada, com a pintura (#1043)
- feat(lobby): o personagem segura a arma equipada, com a pintura

## [2.1.0-alpha.114] — 2026-10-20

### Mudado
- fix(csp): liberar wasm-unsafe-eval para o decoder meshopt (#1039)
- fix(csp): liberar wasm-unsafe-eval para o decoder meshopt

## [2.1.0-alpha.113] — 2026-10-20

### Mudado
- feat(loja): personagens como aba inicial e luvas em categoria própria (#1030)
- fix(mobile): manter JOGAR AGORA visível em paisagem (#1014)
- feat(lobby): widget de novidades de skins (#1031)
- feat(loja): histórico de compras na carteira (#1032)
- Corrige abertura do próprio perfil e configurações (#1035)
- Perf: sessões móveis estáveis no Galaxy A25 (#1036)
- feat(lobby): faixa EQUIPADO junto do personagem (#1033)
- feat(treta): lane rio em produção — arte + colorways M4/SCAR (#1034)
- fix(vm): decoder meshopt no loader — AK invisível em primeira pessoa (#1037)
- fix(vm): registrar decoder meshopt no loader do viewmodel autorado
- Loja sem nome real e vídeos da lane rio
- perf: estabiliza sessões móveis longas
- Corrige abertura e abas do perfil
- feat(treta): colorways M4 Ondas Cariocas e SCAR Mosaico Paulista na loja
- feat(lobby): faixa EQUIPADO junto do personagem
- feat(loja): histórico de compras na carteira
- feat(lobby): widget de novidades de skins
- feat(loja): personagens como aba inicial e luvas em categoria própria
- feat(treta): ampliar textos das skins
- feat(treta): ampliar packs e previews de armas
- fix(cosmetics): align Caveira, Liberdade, and MAGA packs
- fix(cosmetics): contain weapon decals and refine Emo skull
- fix(cosmetics): strengthen MAGA and Emo pack art
- docs(mobile): registrar draft e gate de entrega
- test(mobile): aguardar modal completo na regua
- fix(mobile): mostrar acao de jogar em paisagem
- test(treta): cover categorized store tabs
- feat(treta): add coordinated weapon packs
- feat(treta): add eight first-person glove skins
- fix(weapons): improve pistol mark placement
- chore: refresh expanded weapon skin evidence
- fix: refresh readable political skin previews
- feat: expand and refine weapon skins
- chore: refresh fitted weapon skin evidence
- fix: fit political marks to weapon geometry
- feat: sell and inspect weapon skins
- feat: add weapon skin asset collection
- chore: repin weapon skin evidence
- fix: keep club crests visible ingame
- feat: add regional and club weapon skin previews

## [2.1.0-alpha.112] — 2026-10-19

### Mudado
- Corrige o gauntlet de perfil, comunidade e multiplayer (#1020)
- Conta: convite de 1.000 T$, feedback no perfil e ícone de música (#1022)
- perf: melhorar hot paths e telemetria mobile (#1021)
- perf: adicionar degrau mobile de sobrevivência e vínculo Android (#1026)
- feat(treta): lançar skins e packs de armas (#1028)
- test(vm): alinhar mutante ao modo de revisão
- test(viewmodel): inicializar perfil na régua autorada
- fix(treta): usar nomes dos personagens nos packs
- feat(treta): lançar skins e packs de armas
- feat: prepare app Android para links verificados
- perf: adicione degrau de sobrevivência mobile
- fix: tolerate resize before effects initialize
- perf: improve mobile hot paths and telemetry

## [2.1.0-alpha.111] — 2026-10-19

### Mudado
- fix: alivia boot e partida no celular (#1019)
- test: remove network fetch from mobile gate
- fix: alivia boot e partida no celular

## [2.1.0-alpha.110] — 2026-10-18

### Mudado
- fix: encerra backlog operacional da alpha.108 (#1010)
- Ativa Treta Pop por padrão e limpa convite de sala (#1018)

## [2.1.0-alpha.109] — 2026-10-18

### Mudado
- feat(treta): guia convites e progresso da loja (#1011)
- feat(treta): guide invitation and store progress

## [2.1.0-alpha.108] — 2026-10-18

### Mudado
- fix(ui): painel de ranking alto rola em vez de cortar o VOLTAR (#822)
- Integra o candidato final do fim de semana (#1004)
- feat(analytics): medir funil de convites (#1007)
- Integra entrada anônima e navegação Treta Pop (#1009)
- test: acompanha a entrada direta nas réguas
- test: alinha smoke ao jogo anônimo
- feat: integra a experiência visual do jogo
- fix(analytics): preservar referência em convites de sala
- feat(analytics): medir funil de convites
- test: refresh viewmodel scoreboards
- fix: clear integration candidate gates
- fix: preserve profile and legacy browser gates
- fix: alinha gates ao carregamento lazy
- test(items): refresh per-body fit evidence
- fix(items): require per-character wearable profiles
- fix: fecha fit urbano em todos os jogáveis
- docs: registra evidência do catálogo urbano
- test: fecha cobertura do catálogo urbano
- feat: captura matriz urbana candidata
- feat: monta cena urbana nos corpos
- fix: adapta proxies aos esqueletos reais
- fix(items): refit red Oval 90
- feat: complete procedural rigid catalog families
- chore: correct rigid preview agent attribution
- Adiciona catálogo urbano e fila Mint
- feat: add procedural urban apparel fit proxies
- feat: add procedural urban rigid previews
- test(items): reject missing landmarks explicitly
- test(items): recapture corrected eyewear fits
- fix(items): calibrate eyewear to visible eye line
- test(items): pin candidate fit evidence
- test(items): add hash-pinned fit matrix gate
- feat(wearables): version procedural cap candidate
- feat(items): import measured eyewear candidates
- fix(camera): impede oclusão do jogador local
- fix: aguarda mapa sob demanda no botdiag
- fix(viewmodels): mantém faca pública sem catálogo privado
- Mantém o ping legível em sala lotada
- Evita sobreposição da resenha no lobby
- Torna réguas de perfil e social resilientes
- Torna a régua da loja resiliente ao servidor local
- Faz o mutante de sobreposição cobrir o resultado
- Destrava retorno da régua do lobby
- fix(integration): preserva contrato canônico dos viewmodels
- test(viewmodels): record firearm framing measurements
- test(viewmodels): enforce side-view firearm contract
- feat(viewmodels): centralize firearm framing
- test: cobre ordem do carregamento lazy
- fix: carrega mapas antes de construir cenas
- Atualiza índice de arquitetura da cadência
- test: fecha pipeline de skins rastreáveis
- feat: unifica receitas de skins de arma
- feat: cria motor determinístico de skins
- feat(gloves): publish complete glove manifest
- feat(gloves): add final rig packages
- feat(gloves): add fifth 3p rig package batch
- feat(gloves): add fourth 3p rig package batch
- feat(gloves): add third 3p rig package batch
- feat(gloves): add second 3p rig package batch
- feat(gloves): add first 3p rig package batch
- feat(gloves): add census verifier and mutants
- feat(gloves): add deterministic rig extractor
- Alinha capturas sociais à Treta Pop
- Fecha paleta e escopo da tela de servidores
- docs(character-kit): registra fronteiras da fábrica vestível
- feat(character-kit): generaliza ciclo de vida por slot
- feat(character-kit): censa famílias e matriz de wearables
- Regenera índices da integração social
- Liga réguas sociais ao portão focado
- Isola pedido de amizade no placar Treta Pop
- Fecha convite social real na Treta Pop
- Trava legado e identidade no botão do placar
- Faz a régua exercer o compartilhamento nativo
- Adiciona pedido de amizade pelo placar
- Adiciona convite de amigos por rede social
- Regenera as contagens da documentação
- Adiciona pedido de amizade pelo placar
- docs: registra gates finais do incidente de login
- test: estabiliza aceite browser do convite de login
- docs(social): close main reconciliation checkpoint
- docs(social): record PR and deploy gate result
- docs: refresh generated source counts for social recovery
- docs(social): record guest recovery checkpoint
- fix(social): recover from stale guest proof without duplicate actions
- Regenera as contagens da documentação
- Adiciona convite de amigos por rede social
- Measure the two-line nick on the new profile card
- Add nick limit and 32-W layout rulers
- Wrap long nicks in community cards
- Ellipsize long names in the killfeed
- Wrap long killer names in the death panel
- Document the 32-character nick limit
- Fit 32-character nicks on badge and profile card
- Accept nicks up to 32 characters in the client
- Escape player names in killfeed and death panel
- Regenerate docs after the header trim
- Fit the contagem.js header in two lines
- Regenerate docs for contagem.js
- Count five main.js call sites in contagem CT9
- Gate contagem with a mutant-checked regua
- Count load, splash, match and MP milestones
- Add contagem.js aggregate counter with no identifier
- Route /api/count straight to the backend

## [2.1.0-alpha.107] — 2026-10-18

### Mudado
- feat(analytics): medir funil de convites (#1007)
- fix(analytics): preservar referência em convites de sala
- feat(analytics): medir funil de convites

## [2.1.0-alpha.106] — 2026-10-18

### Mudado
- fix(ui): painel de ranking alto rola em vez de cortar o VOLTAR (#822)
- Integra o candidato final do fim de semana (#1004)
- test: refresh viewmodel scoreboards
- fix: clear integration candidate gates
- fix: preserve profile and legacy browser gates
- fix: alinha gates ao carregamento lazy
- test(items): refresh per-body fit evidence
- fix(items): require per-character wearable profiles
- fix: fecha fit urbano em todos os jogáveis
- docs: registra evidência do catálogo urbano
- test: fecha cobertura do catálogo urbano
- feat: captura matriz urbana candidata
- feat: monta cena urbana nos corpos
- fix: adapta proxies aos esqueletos reais
- fix(items): refit red Oval 90
- feat: complete procedural rigid catalog families
- chore: correct rigid preview agent attribution
- Adiciona catálogo urbano e fila Mint
- feat: add procedural urban apparel fit proxies
- feat: add procedural urban rigid previews
- test(items): reject missing landmarks explicitly
- test(items): recapture corrected eyewear fits
- fix(items): calibrate eyewear to visible eye line
- test(items): pin candidate fit evidence
- test(items): add hash-pinned fit matrix gate
- feat(wearables): version procedural cap candidate
- feat(items): import measured eyewear candidates
- fix(camera): impede oclusão do jogador local
- fix: aguarda mapa sob demanda no botdiag
- fix(viewmodels): mantém faca pública sem catálogo privado
- Mantém o ping legível em sala lotada
- Evita sobreposição da resenha no lobby
- Torna réguas de perfil e social resilientes
- Torna a régua da loja resiliente ao servidor local
- Faz o mutante de sobreposição cobrir o resultado
- Destrava retorno da régua do lobby
- fix(integration): preserva contrato canônico dos viewmodels
- test(viewmodels): record firearm framing measurements
- test(viewmodels): enforce side-view firearm contract
- feat(viewmodels): centralize firearm framing
- test: cobre ordem do carregamento lazy
- fix: carrega mapas antes de construir cenas
- Atualiza índice de arquitetura da cadência
- test: fecha pipeline de skins rastreáveis
- feat: unifica receitas de skins de arma
- feat: cria motor determinístico de skins
- feat(gloves): publish complete glove manifest
- feat(gloves): add final rig packages
- feat(gloves): add fifth 3p rig package batch
- feat(gloves): add fourth 3p rig package batch
- feat(gloves): add third 3p rig package batch
- feat(gloves): add second 3p rig package batch
- feat(gloves): add first 3p rig package batch
- feat(gloves): add census verifier and mutants
- feat(gloves): add deterministic rig extractor
- Alinha capturas sociais à Treta Pop
- Fecha paleta e escopo da tela de servidores
- docs(character-kit): registra fronteiras da fábrica vestível
- feat(character-kit): generaliza ciclo de vida por slot
- feat(character-kit): censa famílias e matriz de wearables
- Regenera índices da integração social
- Liga réguas sociais ao portão focado
- Isola pedido de amizade no placar Treta Pop
- Fecha convite social real na Treta Pop
- Trava legado e identidade no botão do placar
- Faz a régua exercer o compartilhamento nativo
- Adiciona pedido de amizade pelo placar
- Adiciona convite de amigos por rede social
- Regenera as contagens da documentação
- Adiciona pedido de amizade pelo placar
- docs: registra gates finais do incidente de login
- test: estabiliza aceite browser do convite de login
- docs(social): close main reconciliation checkpoint
- docs(social): record PR and deploy gate result
- docs: refresh generated source counts for social recovery
- docs(social): record guest recovery checkpoint
- fix(social): recover from stale guest proof without duplicate actions
- Regenera as contagens da documentação
- Adiciona convite de amigos por rede social
- Measure the two-line nick on the new profile card
- Add nick limit and 32-W layout rulers
- Wrap long nicks in community cards
- Ellipsize long names in the killfeed
- Wrap long killer names in the death panel
- Document the 32-character nick limit
- Fit 32-character nicks on badge and profile card
- Accept nicks up to 32 characters in the client
- Escape player names in killfeed and death panel
- Regenerate docs after the header trim
- Fit the contagem.js header in two lines
- Regenerate docs for contagem.js
- Count five main.js call sites in contagem CT9
- Gate contagem with a mutant-checked regua
- Count load, splash, match and MP milestones
- Add contagem.js aggregate counter with no identifier
- Route /api/count straight to the backend

## [2.1.0-alpha.105] — 2026-10-18

### Mudado
- fix(analytics): medir entrada direta na loja (#1006)

## [2.1.0-alpha.104] — 2026-10-18

### Mudado
- feat(analytics): medir loja e criativos (#1005)

## [2.1.0-alpha.103] — 2026-10-17

### Mudado
- feat: restaurar Analytics e classificar agentes de IA (#988)

## [2.1.0-alpha.102] — 2026-10-17

### Mudado
- Regenera blocos gerados após a main da UI v3 (#964)
- Lote: peso (lixo/mobile/mapas/meshopt) + cadeia visual 3P (#1002)
- Fiação do carregaMapa: boot, partida, menu e páginas de mapa
- Réguas acompanham mapas sob demanda e a golden meshopt
- Matriz do arsenal regenerada no lote visual+peso
- Lote visual+peso: pontas soltas do merge
- fix: reject unaligned mesh vertex strides
- feat: add offline mesh part partition tool
- Document measured jump validation and release limits
- Corrija retorno após interromper salto do corpo
- Documente validação e sincronização do tiro local
- fix: acionar tiro local e retomar pose parada em 3p
- docs: registrar validação local da biblioteca de roupas
- docs: show synthetic garment attach and dispose preview
- fix: execute garment generator through directory aliases
- feat: add synthetic garment attachment library
- Registre os gates próprios da camada de recuo
- fix: encaminha recuo local ao controlador de terceira pessoa
- docs: fecha validacao e reconcilia base da stack de ownership
- docs: registra gate completo da camada de ownership
- docs: distingue ferramentas dos experimentos de animacao
- docs: registra compatibilidade do elenco na segunda camada
- fix: preserva selecao das maos ao adicionar articulacoes
- docs: atualiza gate de personagens no guia em ingles
- docs: registra gate completo e falhas herdadas da fábrica
- docs: registra validação da fábrica e próxima autoria de mão
- test: Integra a fábrica draft nos gates obrigatórios
- feat: Inspeciona bind e pesos reais dos GLBs
- feat: Separa perfis draft de empunhadura por rig
- feat: Valida pacotes draft de personagens
- A/B lê o original de origin/main, não de HEAD
- Corrige mutante do perfil e comentário do clamp
- Mutante do teto de GLB deixa de citar a si mesmo
- Regenera as contagens da documentação
- Converte os 15 viewmodels golden para meshopt
- Liga Meshopt nos viewmodels golden
- Regenera as contagens da documentação
- Carrega módulos de mapa sob demanda
- Regenera as contagens da documentação
- Adiciona perfil mobile com teto de textura
- Regenera as contagens da documentação
- Tira GLBs PBR crus da Mint de public
- Adiciona régua de GLB grande sem referência

## [2.1.0-alpha.101] — 2026-10-17

### Mudado
- Canal de fontes da faca: release privada vm-fontes-faca (#999)
- Treta Pop: a UI v3 completa (9 frentes) atrás de ?ui=v3 (#964)
- Regenera blocos gerados após a main da UI v3 (#964)
- Lote: balística do arsenal + relato de gameplay de out/2026 (#1000)
- Release tolera arquivo da lista que saiu do repo (#1003)
- Release tolera arquivo da lista que saiu do repo
- Kit coerente: tokens no ping e escopo v3 nos guards de tela
- i18n sem chaves duplicadas (UIR5)
- Regenera blocos gerados da integração Treta Pop
- Integração Treta Pop: nove frentes + fiação e réguas fechadas
- Servidores: régua ganha 16 mutantes novos (SV2b..AJ10)
- Perfil/carreira: Medalhas, arena favorita e string não-compartilhado
- Resultado: centra nome na caixa opaca da arte e aperta régua
- Matriz do arsenal acompanha a cadência de semi
- Regenera blocos do lote balística+feedback
- Auto-fire único na união do lote
- Round 1 anuncia melhor de N e primeiro a X
- Régua: banner do round 1 declara o formato
- Frag volta a cada 3 abates na rodada (teto 1)
- Régua: granada de volta por sequência de abates
- Semi no piso do gênero: PT-38 0,17 s e Deagle 0,24 s
- Régua: cadência de pistola com faixa e ordem de TTK
- Câmera de 3ª pessoa para antes do prop e do varal
- Régua: o boom da câmera não entra em prop
- Round novo nasce com o loadout cheio
- Régua: munição entre rounds reprova na main
- Atualiza os blocos gerados e os ponteiros da matriz
- Registra as evidências do QA autorado
- Alinha o agachamento dos bots e registra o QA do arsenal
- Mede o BOT4 pelo dano efetivo desde HP cheio
- Recalcula a rota quando o destino se torna inalcançável
- Mantém as fichas compatíveis com navegadores antigos
- Regenera as contagens da documentação
- Aperta a régua do convite do lobby
- Avisa quando o convite não encontra servidor
- Regenera as contagens da documentação
- Aperta a régua da loja: ícone por quest e sublinhado com dono certo
- Põe ícone por quest na loja Treta Pop
- Regenera as contagens da documentação
- Aperta a régua da resenha e do convite
- Monta a resenha e o convite Treta Pop atrás de ?ui=v3
- Traduz a resenha e o convite Treta Pop
- Desenha a resenha e o convite Treta Pop
- Regenera as contagens da documentação
- Monta o HUD Treta Pop atrás de ?ui=v3
- Desenha o HUD Treta Pop
- Traduz o HUD Treta Pop
- Abre três ganchos cirúrgicos no radar e no placar
- Mede o HUD Treta Pop no Chrome
- Regenera as contagens da documentação
- Aperta a régua do carregamento VS
- Monta o carregamento VS da Treta Pop atrás de ?ui=v3
- Desenha o carregamento VS da Treta Pop
- Traduz o carregamento VS da Treta Pop
- Expõe o elenco sorteado para a Treta Pop
- Regenera as contagens da documentação
- Aperta a régua do lobby Treta Pop
- Monta o lobby Treta Pop atrás de ?ui=v3
- Desenha o lobby Treta Pop
- Aponta dois mutantes do resultado para a cláusula certa
- Aperta a régua de Modo e mapa
- Mantém o campo de código inteiro em 1280 px
- Registra o diagnóstico visual da geometria balística
- Posiciona o alvo da UPA pela entrada do torso
- Monta o fim de partida Treta Pop atrás de ?ui=v3
- Tira o ＋ da escalação de cima do nome
- Monta a tela Modo e mapa da Treta Pop
- Desenha a tela Modo e mapa da Treta Pop
- Traduz a tela Modo e mapa da Treta Pop
- Expõe o estado da partida para a Treta Pop
- Repete a busca do mutante quando o servidor cai
- Traduz as strings do lobby Treta Pop
- Posiciona as fixtures pela entrada física e preserva o ouvinte
- Monta loja e armário Treta Pop atrás de ?ui=v3
- Traduz a loja e o armário Treta Pop
- Não abre a carteira T$ sozinha na Treta Pop
- Expõe o recorte da loja para a Treta Pop
- Conta sublinhado por sombra na régua da loja
- Ajusta a régua do resultado à leitura do placar
- Atualiza as referências da matriz na consulta compartilhada
- Traduz perfil e carreira Treta Pop
- Expõe os dados do perfil à Treta Pop
- Mede perfil e carreira Treta Pop no Chrome
- Completa a procedência histórica das famílias AW e G3
- Sincroniza as referências da matriz após integrar a cadência
- Resolve os pellets dos bots sem multiplicar o piso de dano
- Atualiza os portões documentados da geometria
- Compartilha a entrada física dos tiros entre os combatentes
- Mede a tela Modo e mapa da Treta Pop no Chrome
- Adiciona a régua do lobby Treta Pop
- Gera QR code do convite sem dependência
- Mede no Chrome a resenha e o convite da Treta Pop
- Soma Mira, Acessibilidade e Privacidade aos ajustes
- Monta a tela de servidores Treta Pop
- Grava ajustes da v3 nas settings do jogo
- Publica nós e salas do multiplayer para a v3
- Mede servidores e ajustes da Treta Pop no Chrome
- Mede o carregamento VS da Treta Pop no Chrome
- Aplica o erro de mira do bot neural ao raio e ao rastro
- Mede a loja e o armário Treta Pop no Chrome
- Mede o fim de partida Treta Pop no Chrome
- Restringe a travessia a caixas completas com espessura verificada
- Separa referências físicas das escolhas de gameplay das armas
- Escreve o contrato de backend da Treta Pop
- Regenera as contagens da documentação
- Reserva uma faixa por tela no dicionário
- Estende a régua da Treta Pop às folhas por tela
- Carrega folhas e módulos por tela da Treta Pop
- Preserva o calendário dos tiros durante a rajada
- Restaura os perfis de recuo que caíam no padrão
- Corrige a queda de dano entre os extremos da curva
- Regenera as contagens da documentação
- Monta o splash Treta Pop atrás de ?ui=v3
- Avisa quando a música do menu fica tocável
- Traduz o ARENA PRONTA do splash
- Adiciona a régua do splash Treta Pop
- Regenera as contagens da documentação
- Adiciona a bancada do kit Treta Pop fora do deploy
- Liga a Treta Pop com ?ui=v3 antes do primeiro paint
- Adiciona tokens e componentes da Treta Pop
- Adiciona as fontes da Treta Pop
- Adiciona a régua da camada Treta Pop

## [2.1.0-alpha.100] — 2026-10-14

### Mudado
- Lote automação: fila de merge e contagens fora dos PRs (#975)
- Regenera os blocos gerados do lote de automação
- Regenera blocos gerados depois da mescla da main
- Lê o on: do MGQ1 linha a linha, com forma inline
- Junta o cabeçalho duplicado da RLS10
- Roda a régua das contagens no pr-fast
- Exige a régua das contagens no pr-fast (PI3)
- Adiciona mutante que aceita marcador de conflito
- Reprova marcador de conflito no bloco gerado do ARCH.md
- Reprova marcador de conflito em qualquer bloco gerado
- Cobra na régua marcador de conflito em bloco gerado
- Isola o git da cópia da régua do GIT_DIR do hook
- Alinha valor volátil sem cursor no modo PR
- Cobra na régua que mover um método não reescreve o ARCH.md
- Mede a régua das contagens numa cópia da árvore
- Reprova o ratchet quando o git log do lote falha
- Tira portão e smoke do lote da fila
- Cobra portão e smoke fora do lote da fila
- Regenera os blocos gerados em modo release
- Atualiza o comentário do autofix para o modo PR
- Confere gerado inteiro só no commit do release
- Regenera os blocos gerados em modo release no trem
- Deixa linhas e tamanhos do ARCH.md para o release
- Deixa contagens voláteis do gen-docs para o release
- Adiciona régua das contagens geradas fora do PR
- Regenera blocos gerados com a régua da fila
- Proíbe segredo e escrita em workflow do lote da fila
- Filtra portão e smoke pelo diff do lote da fila
- Cobra o filtro do lote da fila no gatilho do portão
- Roda versao-bumpada e ratchet no lote da fila
- Roda build e dco no lote da fila de merge
- Adiciona régua da fila de merge nos checks obrigatórios

## [2.1.0-alpha.99] — 2026-10-14

### Mudado
- Agent: Claude (#955)
- Agent: Claude (#953)
- Agent: Claude (#957)
- Lote: vitrine de skins no menu e convite de login pós-partida (#962)
- Regenera as contagens da documentação
- Caber o título da vitrine acima da DICA
- Exigir o título da vitrine inteiro no celular
- Deixar claro o estado e a rolagem da vitrine
- Cobrir a vitrine na régua de nomes reais
- Regenera as contagens da documentação
- Convite com T$ absorve a apresentação da loja
- Convite mostra os T$ que a conta rende
- Recusa do convite vira "Agora não"
- Bloco de T$ no convite pós-partida
- Fim de partida diz se foi solo ou multiplayer
- Régua: convite pós-partida mostra os T$ da campanha
- Regenerar contagens da documentação
- Mostrar as skins da loja na aba JOGAR
- Exportar da loja o que a vitrine reaproveita
- Rodar a régua da vitrine no portão de navegador
- Medir a vitrine de skins do menu no navegador
- Regenera as contagens da documentação
- Contrato E02 segue a abertura sem modal
- B7 mede modal na abertura em vez de fechá-lo
- Apresentação da loja abre depois do convite
- Convite de login só abre depois da 1ª partida
- Passo de entrada não abre sozinho para visitante
- Régua: nenhum modal antes da 1ª partida

## [2.1.0-alpha.98] — 2026-10-14

### Mudado
- Agent: Claude (#948)
- Agent: Claude (#949)
- Agent: Claude (#950)
- Lote perfil: /u no hub, adicionar amigo e saldo T$ (#956)
- Regenera as contagens da documentação
- Regenera docs
- Abas de conta e do perfil só para o dono
- ADICIONAR AMIGO com o estado da amizade
- Conserta a sintaxe do eval:rotas
- ADR 0008: /u/perfil é o hub
- Regenera docs e ARCH
- Tira o ABRIR PERFIL PÚBLICO do perfil no hub
- Serve /u/perfil como o hub do jogo
- Regenera docs
- Régua do saldo TRETA$ no perfil
- Mostra o saldo TRETA$ no perfil
- Hub aceita head próprio de rota
- Guarda a aba do perfil na rota do hub
- Calcula a revisão do CSS do hub no build

## [2.1.0-alpha.97] — 2026-10-14

### Mudado
- Agent: Claude (#918)
- Agent: Claude (#945)
- Agent: Claude (#946)
- Agent: Claude (#947)
- Agent: Claude (#946)
- Lote loja: moedas, nomes das skins, LOJA e privacidade (#951)
- Dar nomes de paródia às skins das primeiras-damas
- Regenera as contagens da documentação
- Regenerar contagens da documentação
- Medir o rótulo da aba da loja com mutantes
- Trocar o rótulo LOJA T$ do hub por LOJA
- Regenerar contagens da documentação
- Reprovar nome de político real na loja
- Dar às skins o nome do personagem do jogo
- Regenerar contagens da documentação
- Medir as sete moedas da loja com mutantes
- Mostrar as sete moedas com arte na loja
- Adicionar arte das seis moedas TRETA$ que faltavam
- Recortar moeda TRETA$ crua no formato da do Saci
- Renomear a moeda Zé Gotinha para Zé da Gotinha
- Disclose anonymous aggregate counting in privacy

## [2.1.0-alpha.96] — 2026-10-14

### Mudado
- Agent: Claude (#930)
- Agent: Claude (#931)
- Agent: Claude (#933)
- Agent: Claude (#934)
- Agent: Claude (#935)
- Agent: Claude (#939)
- Agent: Claude (#940)
- Agent: Claude (#936)
- Lote rotas fixas: ADR 0008 e PRs #930-#940 (#941)
- Regenera as contagens da documentação
- Merge corosolto/main into claude/rotas-cla-20261014
- Merge claude/rotas-base-20261014 into claude/rotas-perfil-20261014
- Reprova link de marcação na forma antiga /?secao=
- Aponta o Ver perfil do topo para /comunidade
- Regenera blocos gerados da documentação
- Adiciona régua das páginas de arena com mutantes
- Lista as páginas de arena no sitemap
- Liga cada arena de /mapas à página dela
- Cria uma página por arena em /mapas/id
- Regenera blocos gerados da documentação
- Adiciona régua do head do clã com mutantes
- Põe tag, nome e descrição do clã no head de /clans/id
- Regenera blocos gerados da documentação
- Mede no navegador a aba RANKING em /ranking
- Ajusta as réguas ao /ranking do hub
- Redireciona com 301 o link antigo ?secao=ranking
- Abre a aba RANKING do hub em /ranking
- Dá o compartilhar ao arnês da loja OFF
- Regenera blocos gerados da documentação
- Adiciona régua dos pontos de compartilhar
- Liga o compartilhar do clã
- Liga o compartilhar do perfil na comunidade
- Liga o compartilhar da skin na loja
- Liga os pontos de compartilhar do hub
- Cria botão único de compartilhar com Web Share
- Dá as funções de rotas.js ao arnês da loja OFF
- Regenera blocos gerados da documentação
- Mede no navegador a aba da loja e o voltar
- Grava a aba da loja em /loja/aba
- Regenera blocos gerados da documentação
- Mede no navegador o perfil em /u/perfil e o voltar
- Adiciona abas ao perfil público em /u/perfil/aba
- Leva o perfil aberto no hub para /u/perfil
- Regenera blocos gerados da documentação
- Adiciona régua de rotas fixas com mutantes
- Serve as rotas fixas do hub no servidor de eval
- Lista /loja e /comunidade no sitemap
- Redireciona com 301 os links antigos com ?secao=
- Aponta os links da comunidade para as rotas novas
- Grava o guia aberto em /guia/slug
- Grava a aba da comunidade no caminho
- Navega o hub por caminho em vez de query
- Serve uma cópia estática do hub por rota fixa
- Cria tabela de rotas fixas do hub
- Propõe ADR de rotas fixas para cada tela

## [2.1.0-alpha.95] — 2026-10-14

### Mudado
- Lote CI 2: automerge, checkout leve e retry do release (#937)
- Regenerate generated blocks for lote CI 2
- Regenerate generated blocks for lote CI 2
- Atualiza comentários do release que citavam o pull --rebase
- Executa a pr_fast_verde do release na RLS17
- Publica o release só sobre SHA com pr-fast verde
- Renumera a cláusula do retry para RLS17 e cobra o SHA aprovado
- Faz checkout leve no job autofix
- Cobra checkout leve no job autofix
- Tira o job autofix do checkout leve deste PR
- Devolve a eval:wfcheckout ao package.json depois do merge da main
- Mede a defesa do WSEC1 por job
- Tenta de novo o push do trem de release
- Cobra retry limitado no push do trem de release
- Troca o job bot-token do automerge por passo de guarda
- Cobra a guarda do token do automerge como passo
- Roda a eval:wfcheckout no pr-fast
- Faz checkout leve nos jobs que só leem histórico
- Cobra checkout leve nos jobs que só leem histórico

## [2.1.0-alpha.94] — 2026-10-14

### Mudado
- Agent: Claude (#906)
- Agent: Claude (#910)
- Agent: Claude (#913)
- Agent: Claude (#911)
- Agent: Claude (#923)
- Agent: Claude (#924)
- Agent: Claude (#929)
- Agent: Claude (#926)
- Agent: Claude (#927)
- Agent: Claude (#928)
- Agent: Claude (#925)
- Lote 4: conta, convite de login, loja, vitória e perfil (#938)
- Regenera as contagens da documentação
- Regenera contagem de linhas nas docs
- Login do convite sai do quadro como o da conta
- Põe o onReady do convite depois do onSession
- Alinha o convite aos botões oficiais do #910
- Adiciona régua da arte de resultado no check:fast
- Pula o convite no perfil compartilhado
- Medir que a loja não volta a mostrar a fila
- Rerenderiza a arte de resultado de cinco Míticos
- Devolve a derrota do Barbudo e da Julia ao par
- Medir vídeo de hover da loja com mutantes
- Tocar o vídeo da skin no hover do card
- Adicionar vídeos de hover das 12 skins aprovadas
- Gerar vídeo de hover das skins pelo GLB real
- Vestir skin da loja no gerador de vídeo
- Regenerate generated docs blocks
- Check the profile weapons display with mutants
- Show the most used weapons on the profile
- Regenerate generated docs blocks
- Check the hidden character copy with mutants
- Explain a hidden character on the public profile page
- Explain a hidden character on the in-game profile
- Regenerate generated docs blocks
- Check profile achievements with mutants
- Say why profile activity is empty
- Base profile achievements on the shown totals
- Regenerate generated docs blocks
- Check friend request feedback with mutants
- Explain a friend request beside the button
- Tirar a fila de novas skins da loja
- Espera o convite abrir e diz por que não abriu
- Tira o falso verde do LB4 e do LB9
- Check the 390px chip cascade in hub-identity
- Fit the identity chip in the 390px hub header
- Marca a apresentação da loja como vista na régua
- Regenera contagem de linhas nas docs
- Não abre o convite sobre outro diálogo
- Abre o passo de entrada sozinho só sem nick
- Marca o convite pronto só depois da splash
- Regenera contagem de linhas nas docs
- Sinaliza a decisão do convite para a régua
- Encurta comentário do convite de login
- Exempt the TRETA wallet from the one-account check
- Keep the FAQ parser inside one details block
- Add community header gate with mutants
- Turn community tabs into an underlined tablist
- Drop the duplicate account card on community
- Greet by @handle on the community page
- Regenera docs e ARCH com o convite de login
- Adiciona régua do convite de login
- Mostra convite de login na abertura do jogo
- Expõe ícones e prontidão do passo de entrada
- Keep account modal edits off lobby PR lines
- Add account modal gate with mutants
- Greet by @handle and keep one primary action
- Show linked logins as state rows
- Use official provider buttons in account entry
- Add hub identity gate with mutants
- Show @handle or profile invite in lobby header

## [2.1.0-alpha.93] — 2026-10-14

### Mudado
- Lote CI: portão filtrado, jobs paralelos e réguas no pr-fast (#932)
- Regenerate generated blocks for lote CI
- Faz o mutante agregador-cego mirar a checagem do laço
- Regenera os blocos derivados
- Põe o job do Sertão sob o decide do portão
- Lista o diff do decide com nome cru e separado por NUL
- Roda as invariantes do pr-fast em job paralelo
- Cobra o build do pr-fast como agregador que não pula
- Regenera os blocos derivados
- Roda o chat desktop do smoke em job paralelo
- Cobra a partição exata do smoke em dois jobs
- Roda o Sertão do portão em job paralelo
- Cobra o Sertão em job próprio sem perder passo do portão
- Regenera os blocos derivados
- Roda a eval:portaogatilho no pr-fast
- Filtra o portão e o smoke pelo job decide
- Cria o gatilho do portão e a régua que o mede
- Roda as réguas de workflow no pr-fast
- Cobra que as réguas de workflow rodem no pr-fast

## [2.1.0-alpha.92] — 2026-10-14

### Mudado
- Lote 3: perfil e lobby no jogo, card OG, rodadas e próximo mapa do MP, time pelo lado (#919)
- Medir espera do chat no relógio do jogo
- Regenerate generated blocks for lote 3
- Mandar pronto mesmo com erro na troca e limpar o aviso
- Cobrar pronto em qualquer caminho e onProximo sem erro solto
- Regenerate docs counts
- Focus the guide frame after it is shown
- Leave mailto links in embedded pages to the browser
- Route embedded /?secao= links to the requested hub section
- Open the clans page inside the lobby
- Cover links inside embedded legal pages and CLÃS
- Fit the social links comment in two lines
- Paint the MP player's team with its side color
- Fit the faction grid on narrow screens
- Measure faction grid fit at 390, 780 and 1536 px
- Measure radar ally vs amber contrast by hue
- Add MP team color ruler for the player's own side
- Drop perfil from the URL when switching social tab
- Check that switching social tab drops perfil from the URL
- Fix stale _teamName note in the faction name map
- Derive the loading chip's enemy side from the player's side
- Raise the MP CTF flag of the owning side, not the body
- Regenerate generated docs blocks
- Regenerate generated docs blocks
- Check profile social links with mutants
- Show social icons on the public profile page
- Show social icons on the in-game profile
- Add public social links with icons for profiles
- Check profile views display with mutants
- Show profile views on the public profile page
- Show and count profile views in the game
- Strip control characters from card nickname
- Show NÍVEL — when the profile has no level
- Wrap long nicknames instead of shrinking them
- Require legible long nicknames on profile card
- Check the served profile card carries the logo
- Show game logo and rank badge on profile OG card
- Require logo and level badge in profile card contract
- Pré-carregar o próximo mapa durante o placar
- Regenerate generated docs blocks
- Check the profile page opens in game with SEO intact
- Open the public profile page inside the game
- Send social login out of a same-origin frame
- Collapse the account panel on a shared profile
- Skip the account prompt on a shared profile arrival
- Avisar o nó quando o mapa novo estiver montado
- Cobrar próximo mapa no placar no cliente
- Regenerate docs counts for the FAQ maps check
- List all playable maps in the home FAQ
- Add check that the home FAQ names every map
- Open hub footer legal links inside the lobby
- Cover hub footer links in the lobby links check
- Usar teto de rodadas da sala no HUD online
- Cobrar teto de rodadas do servidor no HUD online
- Name the MP player's team by its side, not its body
- Regenerate docs counts for the profile link check
- Open player profiles in the lobby community pane
- Add browser check for player profile links in the lobby
- Regenerate docs counts for the faction grid check
- List every playable group in the lobby about panel
- Add browser check for lobby faction grid
- Regenerate docs counts for the new lobby check
- Open privacy and terms pages inside the lobby
- Add browser check for lobby about-panel links
- Add MP team label ruler for the player's own side

## [2.1.0-alpha.91] — 2026-10-14

### Mudado
- feat(treta): separar itens para revisão gradual, desativados por padrão (#825)
- Preservar personagem da skin equipada ao recarregar (#831)
- Adicionar clãs, convites e tags no perfil e placar (#817)
- fix(treta): publicar primeiro a loja só com personagens aprovados (#824)
- Trigger release on batch PR merge instead of cron (#893)
- Require merge commit for batch PRs in contributing
- Warn when a main push has no associated PR
- Never cancel a release bump in progress
- Regenerar SIM_HASH após o merge da main
- Keep plain merges out of the release concurrency group
- Describe batch release in contributing and comments
- Trigger release on batch PR merge instead of cron
- Cover batch release triggers in eval:release
- Regenerar SIM_HASH após o merge da main
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenerar SIM_HASH após o merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenerar SIM_HASH após o merge da main
- Corrigir número da migration dos clãs no registro
- Regenerar docs e contagens
- Registrar estado dos clãs após a limpeza da fila
- Mostrar tag do clã no perfil público
- Adicionar régua de sessão dos clãs
- Pedir clã da conta Auth sem exigir convidado
- Rotear clãs pelo proxy com sessão do site
- Pass eyewear id into launch-race spawn fixture
- Fix equipped skin character after reload
- docs(treta): record split items validation and regenerate inventories
- assets(treta): preserve six eyewear candidates without fit approval
- test(treta): guard disabled items and preserve cosmetic contracts
- feat(treta): isolate eyewear runtime with default-off activation
- docs(treta): record character-only store validation
- fix(treta): keep store focused on approved character skins
- test: cobrir explicação TRETA na jornada de convidado
- fix: exibir avisos TRETA fora dos menus ocultos
- fix(treta): indicar API indisponível durante rollout
- fix(treta): apply 250 daily cap and preserve private profile responses
- feat(treta): show authoritative quests in the skin store
- chore(shop): move internal process artifacts out of product (4/4)
- chore(shop): move internal process artifacts out of product (3/4)
- chore(shop): move internal process artifacts out of product (2/4)
- chore(shop): move internal process artifacts out of product (1/4)
- docs(shop): checkpoint common item research publication
- docs(shop): plan 30 common wearables and character fitting
- Registrar drafts pareados de clãs
- docs(shop): record clothing category preview checks
- feat(shop): include clothing and sneaker accessory proposals
- docs(shop): checkpoint verified local TRETA game integration
- test(shop): verify real skin commerce and SP MP integration
- feat(shop): connect TRETA skins and classic coin to game
- feat(shop): add real skin portraits and classic Saci coin art
- feat(shop): add rigged TRETA skin runtime assets
- docs(shop): record final UI review handoff
- fix(shop): expose retry and validate skin previews
- feat(shop): organize skins, wallet and proposed packs
- docs(shop): checkpoint authorized game integration
- docs(shop): record owner feedback and verified asset inventory
- feat(assets): preserve classic Saci style proof and sampled review
- fix(assets): engrave coin reverse and preserve Rodin matrix review
- docs(shop): preserve rejected Mint conversion and recovery route
- docs(shop): record approved Mint profile study and single model job
- docs(shop): adopt classic profile coin direction and preserve rejected study
- feat(shop): prototype minted Saci coin after design rejection
- docs(shop): reject coin design and define minted relief revision
- docs(shop): record final portrait coin review and validation
- assets(shop): replace seven coins with portrait and value faces
- feat(shop): mint portrait coins with denomination on reverse
- docs(shop): verify and package eight Mint rigs with Idle
- docs(shop): checkpoint eight rigged GLB exports and UI handoff
- docs(shop): prepare isolated UI and currency pack workflow
- docs: deliver eight final Mint skins and forty eight completed clips
- docs: checkpoint seven completed animation batches with final asset links
- docs: checkpoint eight approved final models and last animation jobs
- docs: checkpoint six completed Mint animation batches and download permission blocker
- docs: checkpoint model reviews corrections and six Mint animation requests
- docs: preserve Mint batch two preview review and model requests
- docs: checkpoint eight Mint cyborg and mandrake skin requests
- docs: entregue cinco skins Mint rigadas e trinta clipes
- docs: confirme correntes pesadas no modelo Mint
- docs: registre quatro pacotes Mint rigados concluídos
- docs: confirme lentes corrigidas no modelo Mint
- docs: confirme grillz dourados no modelo Mint
- docs: registre primeiro GLB rigado e seis clipes Mint
- docs: registre acabamento e animações Mint em andamento
- docs: registra entrega dos cinco modelos Mint e revisão visual
- docs: registra cinco modelos TRETA em geração no Mint
- docs: registra geração 3D e correções faciais no Mint
- docs: checkpoint da revisão das prévias Mint
- docs: checkpoint five authorized Mint skin preview requests
- docs: record validated Treta checkpoints and remaining asset work
- feat: add Treta skin store, wallet and animated reward receipts
- Feche o checkpoint local dos clãs com evidências e pendências
- Sincronize índices após o ajuste do carregamento
- Registre evidência local e continuidade dos clãs
- Espere leituras completas antes de liberar ações do clã
- Atualize os índices gerados para as páginas de clãs
- Mostre a tag do clã no perfil e no placar
- Adicione criação e gestão de clãs na comunidade
- docs: registrar escopo da loja TRETA

## [2.1.0-alpha.90] — 2026-10-14

### Mudado
- Agent: Claude (#850)
- Agent: Claude (#852)
- Agent: Claude (#856)
- Agent: Claude (#832)
- Agent: Claude (#877)
- Agent: Claude (#878)
- Agent: Claude (#820)
- Lote: armas, render, bots, IBL no viewmodel e wallpapers (#884)
- Lote final: lote 2, lote CI, #873 e lote bb (#890)
- Tighten the probe ping check so measuring after the wait fails
- Run ui-regression for scripts, tsconfig and its own workflow, and fail when the diff fails
- Regenerate generated blocks for the final batch
- Passa root ao render da comunidade na régua do ranking
- Stop promising live presence in the /mapa title
- Drop the stale arena count from the home FAQ
- Regera as contagens da documentação do lote bb
- Regera blocos de invariantes no quality-gates
- Regenera as contagens da documentação
- Atualiza o SIM_HASH depois do merge da main
- Aceita quebra de linha no matchRoster do netcode-check
- Fecha o select da home quando o foco sai pelo teclado
- Tira de novo o gerador de grafite do check:fast
- Regenera as contagens da documentação
- Traduz os rótulos dos selects da home
- Enxuga o cabeçalho do workflow gauntlet-captura
- Deixa a captura horária vermelha sem foto ou sem live
- Recusa hora inválida no rodízio da captura
- Adiciona régua do payload de build SHA e coorte
- Tira software da coorte de telemetria
- Deriva as contagens do FAQ da home dos dados do jogo
- Alinha o FAQ do mapa ao vivo com a presença só para amigos
- Corrige a nota dos Políticos no catálogo
- Encurta o comentário de sinaisDeBuild para duas linhas
- Usa o host de site-origin no game-pages-check
- Declara o host canônico no llms.txt gerado
- Regenera as contagens da documentação
- Mede o fallback do ping no fim da resposta
- Regenerate docs
- Use full width for community profile and settings
- Add nick rename field to community profile settings
- Remove verified solo button from community account
- Regenera as contagens da documentação
- AF8 cobre o cenário A/B do merge limpo
- Autofix regenera na árvore mesclada sem subir merge à toa
- RLS10 exige a condição exata da autoria
- WC2 exige concurrency nos workflows que não cancelam
- Regenera blocos gerados depois do merge da main
- Invariantes em paralelo com 2 vagas por padrão
- Regenera blocos gerados depois do merge da main
- Régua RLS10: gerado velho não trava o trem
- Gerado velho no push da main não trava o trem
- Regenera as contagens da documentação na main
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenera as contagens da documentação
- Mede os selects da home no navegador
- Troca as opções da home por selects que abrem
- Atualiza o SIM_HASH depois do merge da main
- Regenera as contagens da documentação
- Mede a regra do personagem com nó local
- Cobra a regra do personagem no check:fast
- Registra a regra do personagem escolhido (ADR 0007)
- Respeita o personagem escolhido no multiplayer
- Decide o personagem do MP numa função pura
- Devolve o personagem do SP ao sair da sala
- Regenera as contagens da documentação
- Ignora o modo de armas do menu no multiplayer
- Regenera as contagens da documentação
- Mede o SP depois de uma sala com nó local
- Cobra a devolução do mapa do SP no check:fast
- Devolve o mapa do SP ao sair do multiplayer
- Regenera as contagens da documentação
- Mantém a troca de arma até o input sair no MP
- Roda as sub-simulações das invariantes em paralelo
- Planta as pontes do three antes das sub-simulações
- Regenera as contagens da documentação
- Tira os comentários de fim de linha das constantes do bot
- Regenera as contagens da documentação
- Encurta os comentários dos sentidos do bot
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Tira do passo Lajes as réguas que as invariantes rodam
- pr-fast reaproveita o botsim das invariantes
- Grava a saída das sub-simulações sob demanda
- Reaproveita sub-simulação repetida nas invariantes
- Mede e imprime o tempo de cada sub-simulação
- freshReport aceita auditor assíncrono
- Régua DG4: só o pr-fast responde pelo contexto build
- Renomeia o job do preview-build para preview
- Régua AF8: autofix só traz a base com conflito
- Autofix não traz a base quando não há conflito
- Varredura do autofix dispara só para CONFLICTING
- Adiciona régua de concurrency por PR nos workflows
- Agrupa preview-deploy por PR e cancela o velho
- Agrupa automerge por PR e cancela o run velho
- Cancela pr-gates velho do mesmo PR
- Cancela smoke-web velho do mesmo PR
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenera as contagens da documentação
- Encurta o comentário do IBL no viewmodel
- Regenera as contagens da documentação
- Mede na GPU o IBL só no viewmodel
- Atualiza o SIM_HASH depois do IBL no viewmodel
- Regenera as contagens da documentação
- Aplica o IBL só ao viewmodel
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Untrack the wallpapers roster plan
- Regenerate docs and ARCH for eval:menuwallboot
- Add boot check for the menu wallpaper swap
- Keep the hub home wallpaper when the manifest loads
- fix(gauntlet): captura sobre o build de produção, sem a faixa de debug na foto
- docs: regenera blocos derivados (novo workflow e ferramenta do gauntlet)
- feat(gauntlet): captura horária de um mapa em rodízio para o agente de gráficos
- docs: regenera blocos derivados
- docs: regenera blocos derivados
- feat(telemetria): build SHA e coorte em perf, partida e erro
- feat(bots): cone de visão de 120° e audição do jogador
- ci(ui-regression): só sobe os dois servidores quando o PR mexe em tela
- fix(ci): fecha o loop de crash e corta ruído dos bots
- Cobra desenho no teto de subpassos no passo-sim
- Desenha o quadro quando o teto de subpassos esgota
- Regenerate docs and ARCH after the fallback fix
- Check wallpaper fallback against the manifest
- Sync menu wallpaper fallback with the manifest
- Regenera docs e ARCH com a régua do rIC ocioso
- Cobra o teto do rIC ocioso das armas no check:fast
- Põe teto de 5 s no preload ocioso das armas
- Restringe o pós-processamento à cena desenhada na tela
- docs(media): Registra o draft e limites de entrega
- docs(media): Registra checks e comparação com a base
- Conferir cache de módulos públicos quando o layout os utiliza
- Validar cache do Three apenas no layout que importa o módulo
- fix(media): Ilustra o elenco no estilo dos wallpapers
- Expandir guias e padronizar avatares dos personagens
- fix(media): Define acabamento ilustrado para o elenco novo
- fix(media): Resolve masters entre checkouts e registra validação final
- feat(media): Adiciona wallpapers do elenco e corrige loading em 5K
- Integrar páginas e guias ao visual do lobby
- docs(media): Document roster rotation and generation handoff
- feat(media): Add political and mythical header sprites
- feat(media): Rotate menu art and prepare roster assets

## [2.1.0-alpha.89] — 2026-10-13

### Mudado
- Lote: consentimento tardio, check sem escrita, recuo MP, rajada 3P e brasão versionado (#885)
- Regenerate docs counts for the batch
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenera as contagens da documentação
- Atualiza o manifesto de versões dos brasões
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Regenerate docs counts after merging main
- Roda eval:brasao-versao no pr-fast
- Project MP remote velocity on the segment's yaw
- Cover strafe while turning in MP backpedal check
- Cobra a gravação do JSON só com JSON=1 na régua
- Aceita o ?v= do brasão no screen-query do placar
- Tira o gerador de grafite do check:fast
- Grava graffiti_audit.json só com JSON=1
- Exige BASE explícito nos arnêses de grafite
- Play backpedal for MP remotes moving backward
- Add MP remote backpedal animation check
- Require shoot frames in the 3P burst check
- Keep shoot weight across a 3P burst
- Add 3P burst animation weight check
- Enviar aquisição e land no consentimento tardio
- Versiona por conteúdo o brasão da bandeira e do placar

## [2.1.0-alpha.88] — 2026-10-13

### Mudado
- Comprimir pôsteres, logo e decal da capivara (#866)
- Levar a origem do convite de sala até a aquisição (#839)
- Torna www.corosolto.com.br o host canônico (#845)
- Faz o hreflang dos docs apontar para página real (#843)
- Ícones oficiais nos botões de login (#857)
- Regenerate docs
- Show official brand icons on login buttons
- Compress heavy PNG posters, logo and capivara decal
- Cover an existing public profile in the host check
- Keep builder paths out of the docs bundle
- Regenerate docs blocks and public/docs
- Point the dev docs at the canonical host
- Declare hreflang on public profiles
- Derive profile links from SITE
- Move the canonical host to www.corosolto.com.br
- Add canonical host check for the built site
- Declara o sitemap EN dos docs no robots.txt
- Regenera o build versionado dos docs
- Redireciona as URLs EN antigas dos docs
- Usa o mesmo slug dos docs em pt e en
- Mede se o hreflang dos docs aponta para página real
- Levar a origem do convite de sala até a aquisição

## [2.1.0-alpha.87] — 2026-10-13

### Mudado
- Mede o ping dos servidores pela rede (#871)
- feat(release): trem de release 2×/dia — produção só sai com a main verde (#854)
- Corrigir cache dos assets estáticos (#863)
- Reduzir os 5 brasões pesados para 256 px (#864)
- Regenera as contagens da documentação
- Lê o ping da rede pelo PerformanceObserver
- Regenera as contagens da documentação
- Mede o ping dos servidores pela rede
- Shrink five faction crests to 256px
- Fix static asset cache headers
- feat(release): trem de release 2×/dia — produção só sai com a main verde

## [2.1.0-alpha.86] — 2026-10-13

### Mudado
- Deixa jogar quando o nó roda outra versão (#869)
- Regenera as contagens da documentação
- Deixa jogar quando o nó roda outra versão

## [2.1.0-alpha.85] — 2026-10-13

### Mudado
- Preparar privacidade, exclusão e aceite do chat para mobile (#813)
- Medir páginas legais no LegalPage com um só contato
- Remover exceção de prestador sem uso na política
- Remover SUPPORT_EMAIL sem uso
- Exibir regras de uso no modelo LegalPage
- Exibir exclusão de dados no modelo LegalPage
- Alinhar smoke do chat ao aceite obrigatório das regras
- Permitir divulgação restrita de prestador na política
- Atualizar blocos gerados para páginas de privacidade e chat
- Exigir aceite das regras antes de publicar no chat
- Add public privacy and data deletion request pages

## [2.1.0-alpha.84] — 2026-10-13

### Mudado
- Adiciona captura local de gameplay com caminho confinado (#851)
- Regenera docs com os scripts da captura local
- Cobra confinamento do proxy de captura no CI
- Confina take e áudio da captura à pasta de cada um
- Adiciona ferramenta local de captura de gameplay

## [2.1.0-alpha.83] — 2026-10-13

### Mudado
- feat(partida): times de tamanho livre, rounds 1-15 e escalação manual (#809)
- Atualiza o SIM_HASH depois do merge da main
- Atualiza o SIM_HASH depois do merge da main
- Make roster cards fill their lineup cell
- Keep the server's round cap in online matches
- docs(partida): regenera ARCH e zonas após o formato livre
- feat(partida): times de tamanho livre, rounds 1-15 e escalação manual

## [2.1.0-alpha.82] — 2026-10-13

### Mudado
- Restaura UPA com assets Mint e corrige tiros e grafites (#816)
- Libera o pós-processamento da cena descartada (#833)
- Atualiza o SIM_HASH depois do merge da main
- Supre a anisotropia na régua do fundo de menu
- Remede as linhas de base de superfície após o reasse
- Remede a paridade de RNG do cache das Lajes após o reasse
- Tira a ficha da UPA da árvore pública
- Lê o inventário da UPA do registro de procedência
- Regera a documentação com as contagens novas
- Grava o SIM_HASH da simulação deste candidato
- Grava a saída do censo de grafite do reasse
- Remede os pisos do censo de grafite com suporte estrito
- Reassa os grafites com o deslize e as fachadas novas
- Não conta duas vezes peça única no censo de grafite
- Testa o suporte estrito em cada deslize do grafite
- Inclui casas e fachadas faltantes no apoio de grafite
- Deixa a categoria decidir o apoio do Ministério
- Regenera as contagens da documentação
- Libera o pós da cena descartada no estilizado
- Cobre a liberação do pós no fundo de menu
- Libera o pós-processamento da cena descartada
- test(lajes): remedir paridade RNG do cache pós-merge da base
- fix: preservar identidade do construtor sob oclusão
- fix: aguardar a ponte three no contrato dos mapas
- docs: preparar evidência visual para o PR da UPA
- fix(maps): restore ground detail and contain surface highlights
- chore(maps): bake graffiti against R2 surface sources
- feat(maps): refine local floor and surface materials
- fix(maps): keep external albedo and detail maps paired
- fix(mapas): renovar layout de grafites após upgrade visual
- fix: aplica samplers ao LOW automático e mudanças de qualidade
- fix: limpa tinta filtrada e aplica samplers nos perfis reais
- feat: refina materiais e texturas dos mapas para revisão visual
- docs: registrar validação integrada dos assets Mint da UPA
- docs: atualizar continuidade do lote clínico Mint integrado
- fix: reassar grafites dos catorze mapas com suporte integral
- test: vincular auditoria aos bytes dos modelos públicos
- test: registrar fontes de materiais e props na auditoria de grafites
- test: verificar carregamento obrigatório dos nove props UPA
- refactor: condensar comentários das invariantes de grafites
- test: integrar portões Mint e grafites no check fast
- feat(upa): integrar equipamentos clínicos Mint com geometria real
- feat: adicionar nove props clínicos gerados no Mint
- docs: registrar origem e tratamento dos props clínicos Mint
- docs(maps): record Lajes alpha pilot and pending rebake
- test(maps): bind graffiti receipts to artwork detector
- fix(maps): preserve alpha in Lajes graffiti mural
- test(upa): preparar contrato para mobiliário clínico Mint
- fix(mapas): montar pixo do Córrego no muro e excluir estátua como apoio
- test(maps): audit painted textures and Córrego wall mounting
- fix: limita suporte de grafite a fachadas nos props GLB
- docs: prepare os props Mint da UPA
- Registre validação dos mapas e gate completo Ferro
- Verifique cada grafite assado do Ferro em low
- Fixe os mourões low no subconjunto do Ferro med
- fix(ferro): manter capim low como subconjunto sem deslocar a pintura
- Teste suporte de grafites no Ferro em med e low
- fix(grafite): reassar 14 mapas após normalização dos recortes
- fix(mapas): preservar paredes pintadas na qualidade baixa e aguardar texturas no auditor
- fix(grafite): normalize clipped polygon edges
- fix(mapas): reassar grafites com suporte no desenho final dos 14 mapas
- docs: tornar legível o relatório de suporte dos grafites
- docs: registrar causas e validação dos grafites sobre superfícies reais
- test(mapas): reprovar arte declarada que não é desenhada no navegador
- docs: registrar réguas finais da piscina e manter comentários em português
- fix(mapas): validar grafites sobre os vértices finais da parede e da arte
- Registra validação pareada dos tiros nos mapas
- Protege geração e auditoria contra grafites ausentes
- Corrige tiros nos vãos e mantém a massa visível dos mapas
- Exercite o auditor independente de área dos grafites
- Mantenha comentários da validação de grafite em português
- Preserve obstáculos de Brasília em toda qualidade gráfica
- Valide a área inteira mesmo em superfícies subdivididas
- Audite suporte e visibilidade da arte nos mapas
- Exija parede visível sob toda a área dos grafites
- Faça os tiros seguirem a geometria visível dos mapas
- Restaure UPA e feche a fresta junto às macas

## [2.1.0-alpha.81] — 2026-10-13

### Mudado
- Para de abrir partículas a cada dano no online (#836)
- Dar orçamento próprio a cada passo do smoke do chat (#846)
- Conta corosolto.com.br como host próprio na versão da telemetria (#860)
- Tira do sitemap o /ranking em 302 e o lastmod do dia (#841)
- Treat corosolto.com.br as an own host
- Require corosolto.com.br as an own host in VO1
- Medir o teto do job de smoke em 40 min
- Dar orçamento próprio a cada passo do smoke do chat
- Omite o lastmod que era só a data do pedido
- Tira do sitemap o /ranking que responde 302
- Mede se o sitemap lista só URL final e data real
- Para de abrir partículas a cada dano no online

## [2.1.0-alpha.80] — 2026-10-13

### Mudado
- Pagina os perfis do sitemap além de 1.000 linhas (#842)
- Pagina os perfis do sitemap além de 1.000 linhas
- Mede o sitemap contra o max-rows do PostgREST

## [2.1.0-alpha.79] — 2026-10-13

### Mudado
- Corrige a view que o sitemap diz filtrar perfis (#840)
- Corrige a view que o sitemap diz filtrar perfis

## [2.1.0-alpha.78] — 2026-10-13

### Mudado
- Remover plans/ do repo público (#835)
- Remove plans/ from public tree

## [2.1.0-alpha.77] — 2026-10-13

### Mudado
- Remover marketing/october-2026 do repo público (#834)
- Remove marketing/october-2026 from public tree

## [2.1.0-alpha.76] — 2026-10-13

### Mudado
- Adicione as redes oficiais no rodapé do jogo (#827)
- fix(awp): luneta engatada fecha o cone; traçado em 3ª pessoa sai da arma (#828)
- fix(awp): luneta engatada fecha o cone na hora do gatilho; traçado em 3ª pessoa sai da arma
- Adicione as redes oficiais no rodapé do jogo

## [2.1.0-alpha.75] — 2026-10-13

### Mudado
- docs: remove defasagens de comandos, números e features (#826)
- docs: remove defasagens de comandos, números e features do README e páginas

## [2.1.0-alpha.74] — 2026-10-13

### Mudado
- docs(changelog): rodada do cronista (2026-10-11) (#814)
- docs(changelog): rodada do cronista — 187 commits
- docs(changelog): rodada do cronista — 13 commits
- docs(changelog): rodada do cronista — 12 commits

## [2.1.0-alpha.73] — 2026-10-13

### Mudado
- feat: integrar comunidade e conta Supabase ao jogo (#807)
- Navegador do portão de boot consente com a medição
- Contrato do /ranking aceita o redirect para o hub da comunidade
- Sincroniza o lockfile com o package.json da composição
- Fecha os gates sociais demonstrados no check:fast do candidato
- Protege os estados da home do ranking no portão
- Alinha estado do ranking à resposta da API
- Atualiza a arte dos emails com personagens armados
- Add GPT character artwork for email templates
- Add career badges to rankings and profiles
- docs: refresh inventories after profile hierarchy adjustment
- fix(social): prioritize ranking and simplify profile metrics
- docs: atualizar catalogo de modulos do perfil publico
- feat(social): mostrar perfil publico com ultimo personagem confirmado
- docs: atualizar inventario de modulos apos selo de conta
- feat(social): exibir selo de conta confirmada no perfil e ranking
- docs: refresh module inventory for community inbox
- feat: add community missions and private messages
- docs: refresh module inventory and privacy gate
- feat(auth): link social identities and separate optional choices
- fix: use verified official contact and simplify legal heading
- feat: align legal pages with the current hub design
- feat: add privacy and terms pages for launch review
- feat(ranking): adiciona aba semanal com calendário do servidor
- docs(ranking): refresh generated module and test inventories
- fix(ranking): preserve player links and present current team scores
- fix(social): 404 upstream das rotas sociais vira 503 no proxy
- docs(social): registra checkpoint e repetição do gate
- feat(social): amplia personagem no cartão público
- fix(social): refresh eval URLs after module edits
- fix(social): render the CI entry and enter as guest
- test(social): declare profile card route and verify preview isolation
- docs(social): record profile share validation and regenerate counts
- feat(social): share public handles and verified profile cards
- feat(social): reuse game portraits for public profile cards
- docs: consolidar aceite local do candidato social reconciliado
- fix: preservar fronteira pública da conta e revisar reconciliação
- docs: registrar retomada da reconciliação social
- fix: liberar comunidade em retrato no celular
- test: medir entrada social e documentar configuração real
- feat: trazer comunidade e entrada de conta para a UI do jogo
- Explain moderated sessions and record paired social reviews
- Document social rollout and verify private community flows
- feat(social): abra a comunidade integrada ao jogo
- feat(social): integre sessão e feche leituras privadas no site
- docs(social): registre objetivo e isolamento

## [2.1.0-alpha.72] — 2026-10-13

### Mudado
- Reusar geometria do entorno de Lajes na virada (#815)
- Matricula a régua de cache das Lajes no portão
- docs: refresh generated map build counts
- fix: reuse Lajes background geometry during map build

## [2.1.0-alpha.71] — 2026-10-13

### Mudado
- feat(marketing): kit social com personagens estilizados e fade para preto (#811)
- docs(marketing): confirmar envio do checkpoint do PR
- docs(marketing): registrar dependências e estado do PR
- chore(marketing): redisparar deploy do preview
- docs(marketing): registrar entrega do layout de altura inteira
- docs(marketing): registrar revisão do fade e altura inteira
- feat(marketing): usar personagens de altura inteira e fade para preto
- docs(marketing): registrar revisão dos personagens e variantes
- feat(marketing): ampliar personagens e adicionar caricaturas políticas
- Record failed remote marketing preview
- Record draft marketing delivery and next step
- Record marketing review and delivery checks
- Invalidate stale marketing approvals on edits
- Prepare reviewable October channel queue
- Prepare October copy and community calendar
- Add editable October cards and approval queue tool
- Add sourced assets for October marketing kit

## [2.1.0-alpha.70] — 2026-10-13

### Mudado
- fix: libere a entrada sem esperar fauna decorativa (#812)
- fix: libere a entrada sem esperar fauna decorativa

## [2.1.0-alpha.69] — 2026-10-13

### Mudado
- Corrige quickstart e contexto para novos devs (#810)
- Aponta convite de devs ao domínio aprovado
- Ancora runtime na instalação conferida
- Corrige entrada de devs no clone público

## [2.1.0-alpha.68] — 2026-10-13

### Mudado
- Corrige links públicos nas docs e na home (#808)
- docs(site): rebuild das docs publicadas com os links corrigidos
- Corrige links públicos nas docs e na home

## [2.1.0-alpha.67] — 2026-10-10

### Mudado
- fix(gate): pickup, personagem e material também exigem relatório fresco (#652)
- chore(docs): bloco de invariantes com o número desta árvore (#652)
- fix(gate): pickup, personagem e material também exigem relatório fresco (#652) (#805)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco de invariantes que o autofix deixou passar
- chore(docs): regenera bloco derivado (autofix)

## [2.1.0-alpha.66] — 2026-10-10

### Mudado
- fix(ci): workflow-timeout-check sai do limbo e entra no portão (#497)
- fix(ci): workflow-timeout-check sai do limbo e entra no portão (#497) (#804)

## [2.1.0-alpha.65] — 2026-10-10

### Mudado
- fix(mp): o lado de quem lança a partida online é o do servidor (#785)
- fix(mp): o lado de quem lança a partida online é o do servidor (#785) (#803)

## [2.1.0-alpha.64] — 2026-10-10

### Mudado
- fix(crash): EvalError de CSP em script blob: injetado não é bug do jogo (#798)
- fix(crash): EvalError de CSP em script blob: injetado não é bug do jogo (#798) (#802)

## [2.1.0-alpha.63] — 2026-10-10

### Mudado
- fix(ci): autofix mede o invariants.mjs do PR, não o da base (#805)
- fix(ci): autofix mede o invariants.mjs do PR, não o da base (#805) (#806)

## [2.1.0-alpha.62] — 2026-10-09

### Mudado
- fix(lados): alinhar carta azul e criação de sala ao contrato E×B (#770)
- feat(elenco): integra personagens, Piscina e qualidade multiplayer (#773)
- fix(eval): congela dívida por personagem
- docs(pr773): registrar candidato final com multiplayer
- docs(mp): registrar candidatos pareados finais
- fix(mp): remover facções ignoradas da sala por convite
- docs(pr773): fecha candidato integrado
- docs(ci): registra prova de desempenho do portão
- perf(ci): evita varrer assets no gerador de docs
- docs(piscina): fecha validação da pilha visual
- docs(pr773): registra smoke e gates alpha.61
- docs(piscina): registra integração visual
- test(piscina): mede geometria construída
- test(piscina): trava separação dos acabamentos
- Corrige import dos metadados do site
- test(chat): preservar cliques reais no smoke
- fix(piscina): elimina cintilação das faixas azuis
- test(chat): observar avisos transitorios sem corrida
- Troca os nomes reais de Julia e Marina por apelidos
- Registra a skill da fábrica de personagens e skins
- Adiciona as thumbnails de seleção que faltavam
- Regenera as contagens geradas de docs
- Regera a mídia dos dez políticos dos modelos novos
- Registra a rodada da fábrica no ledger do PR #773
- Troca Xandão, Professor e Juiz pela segunda geração
- Troca sete políticos pelos modelos da fábrica
- Adiciona desvirador de triângulos invertidos
- Seleciona vermelho, claro e mapa no retoque de textura
- Regenera as contagens geradas de docs
- Retargeta a clavícula em delta, não em absoluto
- Adiciona OMB1: clavícula do idle perto do repouso
- Assenta a morte só onde o corpo atravessa o chão
- Troca o modelo da Dama pelo gerado do concept novo
- Adiciona retoque de textura por faixa do corpo
- feat(piscina): usa a água viva no lugar da lâmina fosca
- feat(piscina): mobiliário Mint sobre os colisores de sempre
- assets(piscina): mobiliário Mint dos contratos do plano 25
- Trava o rosto do retrato pelo concept da ficha
- Adiciona os concepts 2D dos outros nove políticos
- Adiciona as fichas de concept dos dez políticos
- Adiciona gerador de concept de personagem por ficha
- Regenera as contagens geradas de docs e ARCH
- Adiciona o concept 2D da Dama para o modelo 3D
- Corrige o enquadramento das artes de resultado
- Pinta o contorno dos políticos com a cor do lado
- fix(chat): keep status notices visible longer
- fix(chat): keep status notices visible longer
- fix(deps): update sharp lock for CI
- fix(deps): update sharp lock for CI
- fix(deps): update sharp lock for CI
- fix(deps): preserve Linux optional npm peers
- fix(deps): preserve Linux optional npm peers
- fix(deps): preserve Linux optional npm peers
- docs: regenerate after main sync
- fix(deps): atualiza sharp para versao corrigida
- docs(mp): registra reparo do gate de dependencias
- fix(deps): atualiza sharp para versao corrigida
- docs(mp): registra correcao de dependencias
- fix(deps): atualiza sharp para versao corrigida
- chore(pr773): atualiza recibo de midia
- chore(pr773): atualiza snapshot de escala
- docs(pr773): atualiza recibos de Julia e Marina
- chore(personagens): atualiza mídia da Marina
- fix(personagens): troca Marina para vestido midi
- chore(personagens): atualiza mídia da Julia
- fix(personagens): remodela as pernas da Julia
- docs(pr773): registra checkpoint da Julia
- fix(personagens): refina silhueta da Julia
- fix(eval): estabiliza semente da simulacao
- fix(deps): preserva entradas opcionais do lockfile
- fix(deps): atualiza sharp para versao corrigida
- docs(pr773): registra merge da main e gates verdes
- docs(pr773): registra retarget das novas politicas
- fix(personagens): retarget clipes da Julia e Marina
- docs: atualizar checkpoint da fila de prs
- docs(prs): atualizar merge da fila
- docs(prs): registrar estado da fila de merge
- feat(personagens): publicar midia de Julia e Marina
- docs(pr773): atualizar próximo passo e checkpoint
- test(personagens): atualizar sonda com Julia e Marina
- docs: regenerar índices do elenco com main
- chore(docs): regenera bloco derivado (autofix)
- docs: regenerar autoria da branch MP
- docs(mp): atualizar handoff do painel NET
- fix(mp): remove o overlay de diagnóstico
- docs(pr773): registra roster politico 5-5
- fix(personagens): restringe Xandao ao Time E
- docs(pr773): anota checkpoint de Julia e Marina
- feat(personagens): adiciona Julia e Marina ao elenco político
- Record Mint MCP enablement for PR 773 continuation
- Record Mint Dama rig review and credit observations
- Record Mint Dama previews and guarded 3D candidate
- Prepare reviewed Mint prompts for PR773 characters
- Save review-mode Mint prompt for PR773 Dama
- Record PR773 full body style baseline and Mint regeneration brief
- Document PR773 local hair rejection and 3D gate
- Prepara brief verificavel para refazer modelos politicos
- Baixa a camera orbitada e atualiza capturas da Dama
- Registra estado e evidencia visual do PR 773
- Renderiza avatares politicos a partir dos GLB do jogo
- Remove Agitador do elenco e dos assets
- Permite orbitar a camera sem desviar a mira em terceira pessoa
- fix(mp): manter painel de rede fora dos controles moveis
- fix(mp): reopen reachable exit from isolated bot route
- docs(mp): record stacked integration PR
- docs(mp): record combined browser gauntlet
- docs(mp): record identity PR checkpoint
- feat(mp): show server-assigned character identity
- fix(mp): adapt remote interpolation to repeated snapshot jitter
- docs(mp): record browser FPS gauntlet and rejected optimizations
- docs(mp): clarify legacy embedded client SHA in baseline
- fix(mp): aggregate reconciliation quality from correction events
- docs(mp): record seven-day quality baseline and cohort limits
- Dá fuzil à Dama e ao Senador
- Assenta os políticos no chão com offset de pé por clipe
- Regenera os blocos de docs e o índice do game.js
- docs(mp): sync architecture index after ticket fix
- fix(mp): keep tickets for official node selection
- Regenera os blocos de docs e o índice do game.js
- Leva a escolha de personagem para o multiplayer
- fix(mp): measure snapshot gap p95 per active window
- Traduz os blurbs e a categoria dos políticos para inglês
- Adiciona artes e vídeos de seleção e resultado dos 9 políticos
- Adiciona os avatares dos 9 personagens políticos
- Põe os 9 políticos no elenco com lados travados
- Adiciona os modelos e clipes dos 9 personagens políticos
- fix(mp): honor explicit node without public ticket
- Pede e recebe troca de personagem no protocolo multiplayer
- Adiciona Game._trocarPersonagem para a escolha no meio da partida
- Atualiza a régua dos Míticos para o roster por lado
- fix(site): reflect Esquerda and Direita in public metadata
- fix(mp): match room creator with fixed sides contract
- fix(ui): align Direita selector card with blue palette
- Regenera os blocos de docs e o índice do game.js
- docs(mp): record alpha.48 browser and paired image
- chore(mp): pair gauntlet with alpha.48 and Córrego routes
- docs(mp): record paired browser gate and hotfix release
- docs(mp): record alpha.47 base and hotfix gate
- test(chat): stabilize spectator smoke across round transition
- docs(mp): track Córrego CTF regression and isolated hotfix
- docs(mp): record alpha.46 browser gate and parity incident
- chore(mp): pair candidate with alpha.46 simulation
- docs(mp): record three-client candidate gate
- test(mp): capture candidate gameplay at 3:2
- test(mp): restore browser shot gate for hub navigation
- docs(mp): record alpha.45 deploy gate
- docs(mp): refresh alpha.45 generated blocks
- docs(mp): record restored parity and green smoke
- docs(mp): record alpha.43 gates and parity recovery
- chore(mp): refresh paired hash on alpha.43
- fix(chat): hold mobile input through dismiss gesture
- docs(mp): registrar gauntlet de telemetria no navegador
- docs(mp): checkpoint RTT sampling and alpha.41 pair
- fix(mp): aggregate websocket RTT across active windows
- docs(mp): checkpoint RTT gauntlet evidence
- chore(mp): retain sim hash on alpha.40
- fix(mp): dispatch release to node sync
- chore(mp): rebase Escadao gauntlet onto alpha.39
- chore(mp): preserve sim hash on alpha.37 and checkpoint gauntlet
- docs: record alpha.36 parity and review gates
- fix: satisfy map review and generated documentation gates
- docs: record alpha.35 rebase and validation
- fix: orient Escadao team E spawns toward center exit
- Tira a etapa de escolher o adversário do fluxo legado
- Pinta a coluna da Direita de azul no placar
- Troca o filtro de facção do hub por abas de lado
- Embaralha o pool do elenco antes de sortear o time
- Veste cada personagem com a cor do lado
- Usa o lado escolhido no single-player
- Escala o elenco de cada lado pelo pool único
- Troca o brasão da Direita pela estrela azul e amarela
- Renomeia os lados para Esquerda e Direita
- Pinta o lado B de azul (Direita)

## [2.1.0-alpha.61] — 2026-10-09

### Mudado
- feat(sertao): reboco e pedra reais projetados em metros (#792)
- feat(sertao): reboco e pedra reais projetados em metros
- tools: emenda textura gerada no tom do mapa

## [2.1.0-alpha.60] — 2026-10-08

### Mudado
- feat(chat): aviso de retenção na tela de denúncia (#789)
- Mark the report retention notice as done
- Show retention notice on the chat report screen

## [2.1.0-alpha.59] — 2026-10-08

### Mudado
- feat(mp): JOGAR COM AMIGOS cria sala de convite num clique (#788)
- chore(docs): regenerate derived line-count blocks
- feat(mp): add one-click JOGAR COM AMIGOS room
- feat(mp): share the room link on WhatsApp from the modal
- feat(mp): record whether a node gates invite-only rooms
- feat(mp): join invite-only rooms by code, no password

## [2.1.0-alpha.58] — 2026-10-08

### Mudado
- feat(mobile): prepare installable PWA beta (#786)
- docs: align mobile PWA branch with current main
- feat: localize mobile PWA install guidance
- feat: prepare mobile PWA install beta
- feat(mobile): present touch controls as web beta
- feat(pwa): add mobile install manifest

## [2.1.0-alpha.57] — 2026-10-08

### Mudado
- fix(piscina): cartaz da coleção longe dos batentes (#793)
- fix(piscina): cartaz da coleção longe dos batentes
- feat(grafite): margem opcional de parede inteira por banda

## [2.1.0-alpha.56] — 2026-10-07

### Mudado
- perf(mp): skip graffiti pass on dedicated server (#787)
- chore(docs): regenerate derived line-count blocks
- chore(grafite): re-sign layout fingerprint for pass
- perf(mp): skip graffiti pass on dedicated server

## [2.1.0-alpha.55] — 2026-10-07

### Mudado
- fix(deps): update sharp and lockfile peers (#784)

## [2.1.0-alpha.54] — 2026-10-07

### Mudado
- fix(docs): corrigir dependencias vulneraveis (#781)
- docs(changelog): rodada do cronista — 12 commits (#782)

## [2.1.0-alpha.53] — 2026-10-06

### Mudado
- docs(ui): roadmap visual e bot de regressão (#756)
- chore(docs): regenera bloco derivado (autofix)
- docs(ui): fechar continuidade apos CI hospedada
- docs(ui): registrar primeiro run hospedado
- docs(ui): registrar runtime do portao local
- docs(ui): atualizar blocos gerados para capturador
- docs(ui): registrar checkpoint e proxima validacao
- docs(ui): auditar interface e adicionar portao de regressao

## [2.1.0-alpha.52] — 2026-10-06

### Mudado
- fix(deps): corrigir CVE alta em source-map-js (#780)
- fix(deps): preservar opcionais do lockfile
- fix(deps): corrigir CVE de source-map-js

## [2.1.0-alpha.51] — 2026-10-06

### Mudado
- docs(changelog): rodada do cronista (2026-10-05) (#779)
- docs(veto): exceção de sátira política para pessoa real (#769)
- feat(ranking): Esquerda e Direita no lugar de Petista e Bolsonarista (#768)
- docs(changelog): rodada do cronista — 24 commits
- Abre a exceção de sátira política no veto de pessoa real
- Renomeia os lados do ranking para Esquerda e Direita

## [2.1.0-alpha.50] — 2026-10-04

### Mudado
- fix(release): bot não cancela dispatch em andamento (#765)
- fix(release): keep bot push from canceling dispatch

## [2.1.0-alpha.49] — 2026-10-04

### Mudado
- fix(gate): exigir relatório fresco da auditoria de mapas (#766)
- fix(gate): allow full map audit to finish on CI runners
- docs: record alpha.48 map audit rebase
- docs: record fresh CI failure and promotion gates
- docs: checkpoint map audit PR and validation
- fix(gate): require fresh map audit report

## [2.1.0-alpha.48] — 2026-10-04

### Mudado
- fix(corrego): restaurar rotas CTF nas pontes estreitas (#764)
- docs(corrego): record alpha.47 rebase and CI gate
- test(chat): make spectator smoke independent of round transition
- test(corrego): report CTF route summary only on pass
- fix(corrego): restore separate CTF routes on narrow bridges

## [2.1.0-alpha.47] — 2026-10-04

### Mudado
- Dispatch backend node sync after client release (#752)

## [2.1.0-alpha.46] — 2026-10-04

### Mudado
- fix(corrego): as 3 pontes baixas em escala — malha, colisor e navegação na mesma medida (#681)
- fix(corrego): as 3 pontes baixas em escala — malha, colisor e navegação na mesma medida (#681) (#761)
- chore: reavalia contra a main atual
- docs: regenera blocos derivados (regua eval:corrego-ponte entra no check:fast)

## [2.1.0-alpha.45] — 2026-10-04

### Mudado
- fix(679): porta a visibilidade de alvo do catálogo para o check:fast (#750)
- docs: regenera blocos derivados (novo gate eval:vm-placar no check:altera a contagem)
- fix(679): porta a visibilidade de alvo do catálogo para o check:fast

## [2.1.0-alpha.44] — 2026-10-04

### Mudado
- docs(changelog): rodada do cronista (2026-10-04) (#762)
- docs(changelog): rodada do cronista — 21 commits

## [2.1.0-alpha.43] — 2026-10-04

### Mudado
- fix(assets): contrato de ambiência do áudio é do jogo, não do pacote (#696) + régua de grafite medindo o que se vê (#741) (#747)
- fix(assets): o contrato de ambiência do áudio é do jogo, não do pacote (#696, #741)

## [2.1.0-alpha.42] — 2026-10-04

### Mudado
- feat(audio): menu instrumental com botão de música (#759)
- docs(audio): fechar preflight do pacote instrumental
- docs(audio): registrar revisão visual e condição de merge
- docs(audio): registrar pacote instrumental e limites da revisão
- fix(audio): validar pacote privado instrumental no build
- docs(audio): registrar checkpoint da intro instrumental
- feat(audio): manter instrumentais e alternar música do menu

## [2.1.0-alpha.41] — 2026-10-04

### Mudado
- docs(security): registrar fechamento dos alertas (#760)

## [2.1.0-alpha.40] — 2026-10-04

### Mudado
- fix(security): limitar profundidade do braces na documentação (#758)

## [2.1.0-alpha.39] — 2026-10-04

### Mudado
- fix(amazonia): acesso da água às escadas que nasciam dentro do igarapé (#680) (#753)
- docs: regenera blocos derivados (regua AME entra no check:fast)
- fix(amazonia): abrir acesso da água às escadas que nasciam dentro do igarapé

## [2.1.0-alpha.38] — 2026-10-04

### Mudado
- fix(security): atualizar dependências do exemplo Vite (#757)

## [2.1.0-alpha.37] — 2026-10-04

### Mudado
- fix(security): limitar token dos workflows a leitura (#754)

## [2.1.0-alpha.36] — 2026-10-04

### Mudado
- fix(security): atualizar árvore de dependências de docs (#751)

## [2.1.0-alpha.35] — 2026-10-04

### Mudado
- fix(security): atualizar http-cache-semantics para 4.3.0 (#749)

## [2.1.0-alpha.34] — 2026-10-04

### Mudado
- fix(deps): tira da lista as isenções que viraram letra morta (#746)
- fix(deps): tira da lista as isencoes que viraram letra morta

## [2.1.0-alpha.33] — 2026-10-04

### Mudado
- docs(changelog): rodada do cronista (2026-10-03) (#745)
- fix(crash): viewmodel pago ausente do deploy não é crash de código (#658 #656 #657) (#660)
- docs(changelog): rodada do cronista — 50 commits
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(crash): viewmodel pago ausente do deploy não é crash de código (#658 #656 #657)

## [2.1.0-alpha.32] — 2026-10-03

### Mudado
- chore: reavalia o build contra a main com a isencao da CVE (#743)
- chore: reavalia o build contra a main com a isencao da CVE (#743)
- fix(game): recarga automática ao consumir a última bala (#678)
- fix(pkg): tira marcador de conflito do package.json (npm ci quebrava em 30s)
- chore: reavalia contra a main atual
- merge(main): base atual e blocos gerados
- docs: atualizar contagem da nova regua de recarga
- fix(game): recarregar ao consumir ultima bala

## [2.1.0-alpha.31] — 2026-10-03

### Mudado
- Telemetria marca versão@host fora dos nossos domínios; /mapa com Esri (#721)
- docs: regenera blocos derivados
- fix(pkg): union da lista do check:fast com a regua de versao com origem
- merge(main): base atual e blocos gerados
- merge(main): base atual e blocos gerados
- chore: devolve pickup_check.json (artefato do check:fast entrou por engano)
- fix(telemetria): build fora dos domínios próprios marca versão@host; mapa com Esri

## [2.1.0-alpha.30] — 2026-10-03

### Mudado
- fix(gameplay): tiro no pulo espalha, pulo agachado sem boost e reload que não reseta (#733)
- chore(docs): regenera bloco derivado (autofix)
- fix(gameplay): tiro no pulo espalha, pulo agachado sem boost e reload que não zera mais

## [2.1.0-alpha.29] — 2026-10-03

### Mudado
- fix(ui): corrigir proporção, carrossel e tipografia do hub (#713)
- merge(main): base atual e blocos gerados
- chore(docs): regenera bloco derivado (autofix)
- docs(ui): registrar PR e portão de push
- docs(ui): registrar evidência e limites do PR do hub
- fix(ui): conciliar composição do hub com a home atual
- feat(ui): refinar composição e páginas do hub
- fix(ui): preservar proporção do personagem no hub
- fix(ui): estabilizar escala do hub em telas diferentes

## [2.1.0-alpha.28] — 2026-10-03

### Mudado
- fix(mapa): Lajes volta a ter grafite — o grafitar morreu no rewrite authored (#722)
- fix(mapa): Lajes volta a ter grafite — o grafitar morreu no rewrite authored (#722) (#740)

## [2.1.0-alpha.27] — 2026-10-03

### Mudado
- feat(grafite): censo dos 11 abertos + órfã e densidade — triagem MA1 (45 órfãs, classe @0,0,0, lajes 0%) (#665)
- merge(main): base atual e blocos gerados
- fix(mapcat): régua lê os 18 mapas do registro e a cor com CSS real
- fix(mapcat): cor do rótulo AMAZONIA no cartão + régua C5
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- feat(grafite): censo dos 11 abertos + cláusulas de órfã e densidade — a triagem do MA1 (plans/26)
- docs: regen de docs/arch depois das evidências MA4 (capturar.mjs e HTML entraram depois do regen anterior)
- fix(mapcat): amazonia deixa de ser FAVELA, corrego sai do fallback ARENA — com régua eval:mapcat (MA4 do plans/26)
- docs(plan): frente MA5 — fim do low-poly herança nos mapas abertos
- docs(plan): frentes MA1-MA4 dos mapas abertos — graffiti, ferro velho, padrão tupi e classificação

## [2.1.0-alpha.26] — 2026-10-03

### Mudado
- fix(deps): isenta a cadeia do GHSA-ch52-4w7c-c8xp — sem versão corrigida (#743)
- fix(deps): isenta a cadeia do GHSA-ch52-4w7c-c8xp — sem versao corrigida

## [2.1.0-alpha.25] — 2026-10-03

### Mudado
- fix(boot): watchdog do menu para de acusar quem navega no hub (#671)
- fix(boot): watchdog do menu para de acusar quem navega no hub (#671) (#738)
- fix(astro): devolve o catch do listener do watchdog (build quebrou na.alpha.23)
- docs(boot): sem travessão no comentário do watchdog (travessao:check)

## [2.1.0-alpha.24] — 2026-10-02

### Mudado
- docs(changelog): rodada do cronista (2026-10-02) (#737)
- fix(vm): indisponibilidade de asset pago não vira crash de launch (#720/#736) (#742)
- fix(vm): indisponibilidade de asset pago não vira crash de launch (#720/#736)
- docs(changelog): rodada do cronista — 40 commits

## [2.1.0-alpha.23] — 2026-10-02

### Mudado
- Accept MP nodes by simulation fingerprint, not release version (#739)
- docs(changelog): rodada do cronista (2026-09-30) (#725)
- docs(changelog): rodada do cronista (2026-10-01) (#731)
- Regenerate derived docs blocks
- Write SIM_HASH on every release
- Accept nodes by simulation fingerprint, not release
- Add simulation fingerprint of the node's module graph
- docs(changelog): rodada do cronista — 10 commits
- docs(changelog): rodada do cronista — 21 commits

## [2.1.0-alpha.22] — 2026-10-02

### Mudado
- docs(chat): contrato v1 do chat de sala (#686)
- test(chat): régua eval:chat vermelha para o chat de sala (#686)
- feat(net): ramos e envio do chat de sala no NetClient (#686)
- feat(chat): módulo puro do chat de sala com limites, normalização e estado (#686)
- test(chat): mutantes do módulo puro (sem-nfkc, bloqueio-proprio, tabela-torta) (#686)
- feat(chat): painel do chat de sala (view, marcação, CSS e i18n) (#686)
- feat(game): guardas de entrada para o chat de sala (Y/U, trava, pausa) (#686)
- feat(main): liga o chat de sala à sessão multiplayer (#686)
- fix(chat): destruir() destrava o jogo e desliga a meta (#686)
- test(chat): smoke Playwright do painel e eval:chat no check:fast (#686)
- fix(chat): fechar o compositor devolve o foco ao jogo, mesmo vindo de uma linha (#686)
- fix(game): o clique que fecha o compositor do chat não atira (#686)
- test(chat): eval:chat-mp, o chat de sala de ponta a ponta com nó e três navegadores (#686)
- fix(chat): Y/U abrem o chat no fim de partida e o stick não anda com o compositor aberto (#686)
- fix(chat): normalizarTexto numa passagem só, igual ao nó (#686)
- fix(chat): fechar sem teclado, aviso com fundo, corte com reduzir movimento e redesenho sem ressuscitar linha (#686)
- fix(chat): carenciaEspectadorMs no contrato e em CHAT_LIMITES, e doc alinhado às correções do nó (#686)
- fix(chat): Esc fecha o compositor no toque mesmo com o keydown engolido pelo navegador (#686)
- fix(chat): ZWJ depois de seletor e tom de pele, espera do nack conferida e chat destruído na recusa de mapa parado (#686)
- fix(chat): fechar o compositor não devolve o foco ao #chat-toque (#686)
- test(chat): contraste do chat vira portão próprio UI1C (eval:ui-chat) no check:fast (#686)
- docs(chat): contrato cobre a segunda aba na arquibancada e as contagens da rota de denúncia (#686)
- feat(chat): botões Y SALA/U TIME na HUD abrem o compositor por clique ou toque (#686)
- test(chat): CC8 tranca os botões da HUD, UI1C mede o contraste e o smoke clica (#686)
- fix(chat): 'Bloquear também?' não morre com o timer do aviso (#686)
- feat(mp): chat de texto da sala com identidade do servidor e controles de abuso (#686) (#726)
- chore(docs): regenera bloco derivado (autofix)

## [2.1.0-alpha.21] — 2026-10-02

### Mudado
- feat: trocar de arma pela rodinha do mouse + 3 crashes de produção (rádio, TDZ do MP, Object.hasOwn) (#732)
- feat(jogo): trocar de arma pela rodinha do mouse, como no CS
- fix(menu): boot no fim do main.js e sem Object.hasOwn
- fix(rádio): religa o ping de rota que derrubava todo comando de rádio

## [2.1.0-alpha.20] — 2026-10-02

### Mudado
- fix(deps): devalue high do npm audit — bump no lockfile, DEP1 volta ao verde (#735)

## [2.1.0-alpha.19] — 2026-09-30

### Mudado
- fix(fx): tiro sem fumaça + smoke de granada visível (BUG-185/186) + PR #704 (#716)
- fix(vm): clarão sutil na boca real e teto de tamanho da arma (BUG-188, BUG-189)
- fix(fx): traçado visível e impacto de bala sem fumaça (BUG-187)
- chore(docs): blocos gerados com a régua eval:smoke e comentário das faíscas em 2 linhas
- fix(fx): tiro sem fumaça e granada de smoke volta a fazer smoke (BUG-185, BUG-186)
- Align revolver ADS with its sight
- Stabilize ADS review target rendering
- Fit ADS comments within project budget
- Refresh generated docs for ADS checks
- Keep scoped weapons distinct from focus ADS
- Fix ADS target tracking and weapon recoil

- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.1.0-alpha.19).
- fix(chat): ZWJ depois de seletor e tom de pele, espera do nack conferida e chat destruído na recusa de mapa parado (#686)
- feat(jogo): trocar de arma pela rodinha do mouse, como no CS
- fix(deps): devalue high do npm audit — bump no lockfile, DEP1 volta ao verde (#735)
- fix(chat): 'Bloquear também?' não morre com o timer do aviso (#686)
- test(chat): CC8 tranca os botões da HUD, UI1C mede o contraste e o smoke clica (#686)
- feat(chat): botões Y SALA/U TIME na HUD abrem o compositor por clique ou toque (#686)
- fix(menu): boot no fim do main.js e sem Object.hasOwn
- fix(rádio): religa o ping de rota que derrubava todo comando de rádio
- docs(chat): contrato cobre a segunda aba na arquibancada e as contagens da rota de denúncia (#686)
- test(chat): contraste do chat vira portão próprio UI1C (eval:ui-chat) no check:fast (#686)
- fix(chat): fechar o compositor não devolve o foco ao #chat-toque (#686)
- fix(chat): Esc fecha o compositor no toque mesmo com o keydown engolido pelo navegador (#686)
- fix(chat): carenciaEspectadorMs no contrato e em CHAT_LIMITES, e doc alinhado às correções do nó (#686)
- fix(chat): fechar sem teclado, aviso com fundo, corte com reduzir movimento e redesenho sem ressuscitar linha (#686)
- fix(chat): normalizarTexto numa passagem só, igual ao nó (#686)
- fix(chat): Y/U abrem o chat no fim de partida e o stick não anda com o compositor aberto (#686)
- test(chat): eval:chat-mp, o chat de sala de ponta a ponta com nó e três navegadores (#686)
- fix(game): o clique que fecha o compositor do chat não atira (#686)
- fix(chat): fechar o compositor devolve o foco ao jogo, mesmo vindo de uma linha (#686)
- test(chat): smoke Playwright do painel e eval:chat no check:fast (#686)
- fix(chat): destruir() destrava o jogo e desliga a meta (#686)
- feat(main): liga o chat de sala à sessão multiplayer (#686)
- feat(game): guardas de entrada para o chat de sala (Y/U, trava, pausa) (#686)
- feat(chat): painel do chat de sala (view, marcação, CSS e i18n) (#686)
- test(chat): mutantes do módulo puro (sem-nfkc, bloqueio-proprio, tabela-torta) (#686)
- feat(chat): módulo puro do chat de sala com limites, normalização e estado (#686)
- feat(net): ramos e envio do chat de sala no NetClient (#686)
- test(chat): régua eval:chat vermelha para o chat de sala (#686)
- docs(chat): contrato v1 do chat de sala (#686)
- fix(mapa): Lajes volta a ter grafite — o grafitar morreu no rewrite authored (#722)
- fix(mapcat): régua lê os 18 mapas do registro e a cor com CSS real
- fix(telemetria): build fora dos domínios próprios marca versão@host; mapa com Esri
- docs(plan): frente MA5 — fim do low-poly herança nos mapas abertos
- docs(plan): frentes MA1-MA4 dos mapas abertos — graffiti, ferro velho, padrão tupi e classificação
- fix(ui): preservar proporção do personagem no hub
- fix(pkg): tira marcador de conflito do package.json (npm ci quebrava em 30s)
- chore: reavalia contra a main atual
- chore: reavalia o build contra a main com a isencao da CVE (#743)
- chore: reavalia o build contra a main com a isencao da CVE (#743)
- fix(deps): isenta a cadeia do GHSA-ch52-4w7c-c8xp — sem versao corrigida
- docs: regenera blocos derivados
- fix(pkg): union da lista do check:fast com a regua de versao com origem
- merge(main): base atual e blocos gerados
- merge(main): base atual e blocos gerados
- merge(main): base atual e blocos gerados
- merge(main): base atual e blocos gerados
- merge(main): base atual e blocos gerados
- fix(astro): devolve o catch do listener do watchdog (build quebrou na.alpha.23)
- fix(vm): indisponibilidade de asset pago não vira crash de launch (#720/#736)
- docs(boot): sem travessão no comentário do watchdog (travessao:check)
- Regenerate derived docs blocks
- Write SIM_HASH on every release
- Accept nodes by simulation fingerprint, not release
- Add simulation fingerprint of the node's module graph
- fix(boot): watchdog do menu para de acusar quem navega no hub (#671)
- docs(changelog): rodada do cronista — 40 commits
- fix(gameplay): tiro no pulo espalha, pulo agachado sem boost e reload que não zera mais
- docs(changelog): rodada do cronista — 10 commits
- fix(mapcat): cor do rótulo AMAZONIA no cartão + régua C5
- chore: devolve pickup_check.json (artefato do check:fast entrou por engano)
- docs(ui): registrar PR e portão de push
- docs(ui): registrar evidência e limites do PR do hub
- fix(ui): conciliar composição do hub com a home atual
- feat(ui): refinar composição e páginas do hub
- fix(ui): estabilizar escala do hub em telas diferentes
- docs: atualizar contagem da nova regua de recarga
- fix(game): recarregar ao consumir ultima bala
- feat(grafite): censo dos 11 abertos + cláusulas de órfã e densidade — a triagem do MA1 (plans/26)
- docs: regen de docs/arch depois das evidências MA4 (capturar.mjs e HTML entraram depois do regen anterior)
- fix(mapcat): amazonia deixa de ser FAVELA, corrego sai do fallback ARENA — com régua eval:mapcat (MA4 do plans/26)
- fix(amazonia): abrir acesso da água às escadas que nasciam dentro do igarapé
- fix(crash): viewmodel pago ausente do deploy não é crash de código (#658 #656 #657)
- docs(security): registrar fechamento dos alertas (#760)
- fix(security): limitar profundidade do braces na documentação (#758)
- fix(security): atualizar dependências do exemplo Vite (#757)
- docs: regenera blocos derivados (regua AME entra no check:fast)
- fix(security): limitar token dos workflows a leitura (#754)
- fix(security): atualizar árvore de dependências de docs (#751)
- fix(security): atualizar http-cache-semantics para 4.3.0 (#749)
- fix(deps): tira da lista as isencoes que viraram letra morta
- docs(changelog): rodada do cronista — 50 commits
- fix(gate): allow full map audit to finish on CI runners
- docs: record alpha.48 map audit rebase
- docs: record fresh CI failure and promotion gates
- docs: checkpoint map audit PR and validation
- fix(gate): require fresh map audit report
- fix(corrego): restore separate CTF routes on narrow bridges
- fix(assets): o contrato de ambiência do áudio é do jogo, não do pacote (#696, #741)
- fix(corrego): as 3 pontes baixas em escala — malha, colisor e navegação na mesma medida (#681)
- fix(release): keep bot push from canceling dispatch
- docs(corrego): record alpha.47 rebase and CI gate
- test(chat): make spectator smoke independent of round transition
- test(corrego): report CTF route summary only on pass
- Dispatch backend node sync after client release (#752)
- docs: regenera blocos derivados (regua eval:corrego-ponte entra no check:fast)
- docs(audio): fechar preflight do pacote instrumental
- docs(audio): registrar revisão visual e condição de merge
- docs(audio): registrar pacote instrumental e limites da revisão
- fix(audio): validar pacote privado instrumental no build
- docs(audio): registrar checkpoint da intro instrumental
- feat(audio): manter instrumentais e alternar música do menu
- docs: regenera blocos derivados (novo gate eval:vm-placar no check:altera a contagem)
- fix(679): porta a visibilidade de alvo do catálogo para o check:fast
- fix(deps): corrigir CVE de source-map-js
- docs(ui): fechar continuidade apos CI hospedada
- docs(ui): registrar primeiro run hospedado
- docs(ui): registrar runtime do portao local
- docs(ui): atualizar blocos gerados para capturador
- docs(ui): registrar checkpoint e proxima validacao
- docs(ui): auditar interface e adicionar portao de regressao
- fix(deps): preservar opcionais do lockfile
- docs(changelog): rodada do cronista — 24 commits
- Abre a exceção de sátira política no veto de pessoa real
- Renomeia os lados do ranking para Esquerda e Direita
- chore(docs): regenerate derived line-count blocks
- chore(grafite): re-sign layout fingerprint for pass
- perf(mp): skip graffiti pass on dedicated server
- fix(deps): update sharp and lockfile peers (#784)
- docs(changelog): rodada do cronista — 12 commits (#782)
- fix(docs): corrigir dependencias vulneraveis (#781)
- test(piscina): mede geometria construída
- test(piscina): trava separação dos acabamentos
- fix(piscina): elimina cintilação das faixas azuis
- fix(piscina): cartaz da coleção longe dos batentes
- Seleciona vermelho, claro e mapa no retoque de textura
- feat(sertao): reboco e pedra reais projetados em metros
- feat(piscina): usa a água viva no lugar da lâmina fosca
- feat(piscina): mobiliário Mint sobre os colisores de sempre
- tools: emenda textura gerada no tom do mapa
- fix: satisfy map review and generated documentation gates
- fix: orient Escadao team E spawns toward center exit
- assets(piscina): mobiliário Mint dos contratos do plano 25
- Troca os nomes reais de Julia e Marina por apelidos
- Registra a skill da fábrica de personagens e skins
- Adiciona as thumbnails de seleção que faltavam
- Regera a mídia dos dez políticos dos modelos novos
- Troca Xandão, Professor e Juiz pela segunda geração
- Troca sete políticos pelos modelos da fábrica
- Troca o modelo da Dama pelo gerado do concept novo
- Pinta o contorno dos políticos com a cor do lado
- chore(personagens): atualiza mídia da Marina
- fix(personagens): troca Marina para vestido midi
- chore(personagens): atualiza mídia da Julia
- fix(personagens): remodela as pernas da Julia
- fix(personagens): refina silhueta da Julia
- fix(eval): estabiliza semente da simulacao
- fix(personagens): retarget clipes da Julia e Marina
- feat(personagens): publicar midia de Julia e Marina
- fix(personagens): restringe Xandao ao Time E
- feat(personagens): adiciona Julia e Marina ao elenco político
- Prepare reviewed Mint prompts for PR773 characters
- Renderiza avatares politicos a partir dos GLB do jogo
- Remove Agitador do elenco e dos assets
- feat(mp): show server-assigned character identity
- Dá fuzil à Dama e ao Senador
- Adiciona artes e vídeos de seleção e resultado dos 9 políticos
- Adiciona os avatares dos 9 personagens políticos
- Põe os 9 políticos no elenco com lados travados
- Adiciona os modelos e clipes dos 9 personagens políticos
- Escala o elenco de cada lado pelo pool único
- fix(eval): congela dívida por personagem
- docs(pr773): registrar candidato final com multiplayer
- docs(mp): registrar candidatos pareados finais
- fix(mp): remover facções ignoradas da sala por convite
- docs(pr773): fecha candidato integrado
- docs(ci): registra prova de desempenho do portão
- perf(ci): evita varrer assets no gerador de docs
- docs(piscina): fecha validação da pilha visual
- docs(pr773): registra smoke e gates alpha.61
- docs(piscina): registra integração visual
- Corrige import dos metadados do site
- test(chat): preservar cliques reais no smoke
- test(chat): observar avisos transitorios sem corrida
- Mark the report retention notice as done
- Show retention notice on the chat report screen
- Regenera as contagens geradas de docs
- Registra a rodada da fábrica no ledger do PR #773
- feat(grafite): margem opcional de parede inteira por banda
- Adiciona desvirador de triângulos invertidos
- Regenera as contagens geradas de docs
- Retargeta a clavícula em delta, não em absoluto
- Adiciona OMB1: clavícula do idle perto do repouso
- Assenta a morte só onde o corpo atravessa o chão
- Adiciona retoque de textura por faixa do corpo
- Trava o rosto do retrato pelo concept da ficha
- Adiciona os concepts 2D dos outros nove políticos
- Adiciona as fichas de concept dos dez políticos
- Adiciona gerador de concept de personagem por ficha
- Regenera as contagens geradas de docs e ARCH
- Adiciona o concept 2D da Dama para o modelo 3D
- feat(mp): add one-click JOGAR COM AMIGOS room
- feat(mp): share the room link on WhatsApp from the modal
- feat(mp): record whether a node gates invite-only rooms
- feat(mp): join invite-only rooms by code, no password
- Corrige o enquadramento das artes de resultado
- docs: align mobile PWA branch with current main
- feat: localize mobile PWA install guidance
- feat: prepare mobile PWA install beta
- feat(mobile): present touch controls as web beta
- feat(pwa): add mobile install manifest
- fix(chat): keep status notices visible longer
- fix(chat): keep status notices visible longer
- fix(deps): update sharp lock for CI
- fix(deps): update sharp lock for CI
- fix(deps): update sharp lock for CI
- fix(deps): preserve Linux optional npm peers
- fix(deps): preserve Linux optional npm peers
- fix(deps): preserve Linux optional npm peers
- docs: regenerate after main sync
- fix(deps): atualiza sharp para versao corrigida
- docs(mp): registra reparo do gate de dependencias
- fix(deps): atualiza sharp para versao corrigida
- docs(mp): registra correcao de dependencias
- fix(deps): atualiza sharp para versao corrigida
- chore(pr773): atualiza recibo de midia
- chore(pr773): atualiza snapshot de escala
- docs(pr773): atualiza recibos de Julia e Marina
- docs(pr773): registra checkpoint da Julia
- fix(deps): preserva entradas opcionais do lockfile
- fix(deps): atualiza sharp para versao corrigida
- docs(pr773): registra merge da main e gates verdes
- docs(pr773): registra retarget das novas politicas
- docs: atualizar checkpoint da fila de prs
- docs(prs): atualizar merge da fila
- docs(prs): registrar estado da fila de merge
- docs(pr773): atualizar próximo passo e checkpoint
- test(personagens): atualizar sonda com Julia e Marina
- docs: regenerar índices do elenco com main
- docs: regenerar autoria da branch MP
- docs(mp): atualizar handoff do painel NET
- fix(mp): remove o overlay de diagnóstico
- docs(pr773): registra roster politico 5-5
- docs(pr773): anota checkpoint de Julia e Marina
- Record Mint MCP enablement for PR 773 continuation
- Record Mint Dama rig review and credit observations
- Record Mint Dama previews and guarded 3D candidate
- Save review-mode Mint prompt for PR773 Dama
- Record PR773 full body style baseline and Mint regeneration brief
- Document PR773 local hair rejection and 3D gate
- Prepara brief verificavel para refazer modelos politicos
- Baixa a camera orbitada e atualiza capturas da Dama
- Registra estado e evidencia visual do PR 773
- Permite orbitar a camera sem desviar a mira em terceira pessoa
- fix(mp): manter painel de rede fora dos controles moveis
- fix(mp): reopen reachable exit from isolated bot route
- docs(mp): record stacked integration PR
- docs(mp): record combined browser gauntlet
- docs(mp): record identity PR checkpoint
- fix(mp): adapt remote interpolation to repeated snapshot jitter
- docs(mp): record browser FPS gauntlet and rejected optimizations
- docs(mp): clarify legacy embedded client SHA in baseline
- fix(mp): aggregate reconciliation quality from correction events
- docs(mp): record seven-day quality baseline and cohort limits
- Assenta os políticos no chão com offset de pé por clipe
- Regenera os blocos de docs e o índice do game.js
- docs(mp): sync architecture index after ticket fix
- fix(mp): keep tickets for official node selection
- Regenera os blocos de docs e o índice do game.js
- Leva a escolha de personagem para o multiplayer
- fix(mp): measure snapshot gap p95 per active window
- Traduz os blurbs e a categoria dos políticos para inglês
- fix(mp): honor explicit node without public ticket
- Pede e recebe troca de personagem no protocolo multiplayer
- Adiciona Game._trocarPersonagem para a escolha no meio da partida
- Atualiza a régua dos Míticos para o roster por lado
- fix(site): reflect Esquerda and Direita in public metadata
- fix(mp): match room creator with fixed sides contract
- fix(ui): align Direita selector card with blue palette
- Regenera os blocos de docs e o índice do game.js
- docs(mp): record alpha.48 browser and paired image
- chore(mp): pair gauntlet with alpha.48 and Córrego routes
- docs(mp): record paired browser gate and hotfix release
- docs(mp): record alpha.47 base and hotfix gate
- test(chat): stabilize spectator smoke across round transition
- docs(mp): track Córrego CTF regression and isolated hotfix
- docs(mp): record alpha.46 browser gate and parity incident
- chore(mp): pair candidate with alpha.46 simulation
- docs(mp): record three-client candidate gate
- test(mp): capture candidate gameplay at 3:2
- test(mp): restore browser shot gate for hub navigation
- docs(mp): record alpha.45 deploy gate
- docs(mp): refresh alpha.45 generated blocks
- docs(mp): record restored parity and green smoke
- docs(mp): record alpha.43 gates and parity recovery
- chore(mp): refresh paired hash on alpha.43
- fix(chat): hold mobile input through dismiss gesture
- docs(mp): registrar gauntlet de telemetria no navegador
- docs(mp): checkpoint RTT sampling and alpha.41 pair
- fix(mp): aggregate websocket RTT across active windows
- docs(mp): checkpoint RTT gauntlet evidence
- chore(mp): retain sim hash on alpha.40
- fix(mp): dispatch release to node sync
- chore(mp): rebase Escadao gauntlet onto alpha.39
- chore(mp): preserve sim hash on alpha.37 and checkpoint gauntlet
- docs: record alpha.36 parity and review gates
- docs: record alpha.35 rebase and validation
- Tira a etapa de escolher o adversário do fluxo legado
- Pinta a coluna da Direita de azul no placar
- Troca o filtro de facção do hub por abas de lado
- Embaralha o pool do elenco antes de sortear o time
- Veste cada personagem com a cor do lado
- Usa o lado escolhido no single-player
- Troca o brasão da Direita pela estrela azul e amarela
- Renomeia os lados para Esquerda e Direita
- Pinta o lado B de azul (Direita)
## [2.1.0-alpha.18] — 2026-09-30

### Mudado
- docs(changelog): rodada do cronista (2026-09-29) (#719)
- docs(changelog): rodada do cronista — 21 commits

## [2.1.0-alpha.17] — 2026-09-29

### Mudado
- fix(mp): exclude inactive sessions from quality telemetry (#714)
- docs(mp): record quality fix PRs and rollout gates
- fix(mp): exclude inactive sessions from quality telemetry

- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.1.0-alpha.17).
## [2.1.0-alpha.16] — 2026-09-29

### Mudado
- Corte do knip e ADRs (parte 2 da limpeza) (#701)
- Reescreve o package-lock com npm 10 (node 22 do CI)
- Remove artefatos de sessão, sondas aposentadas e infra local
- Adiciona ADRs das decisões de arquitetura
- Remove mortos apontados pelo knip e adiciona o knip.json

## [2.1.0-alpha.15] — 2026-09-29

### Mudado
- style(home): equilibrar tipografia e ritmo do hub (#689)
- fix(hub): show every tab on narrow phones
- fix: keep play tab visible in mobile hub
- style(home): equilibrar tipografia e ritmo do hub

## [2.1.0-alpha.14] — 2026-09-29

### Mudado
- fix(map): acesso aos pontões da Amazônia na alpha.8 (#703)
- test(amazonia): verify water-to-high-deck access
- docs: atualizar contagens geradas da Amazonia na alpha.8
- fix(map): abrir acesso da agua aos pontoes na alpha.8

## [2.1.0-alpha.13] — 2026-09-28

### Mudado
- fix(profile): salvar e remover redes sociais com confirmação (#710)
- fix(profile): confirm socials and show zero-score profiles
- fix(profile): salvar nick e redes antes de avancar

## [2.1.0-alpha.12] — 2026-09-28

### Mudado
- fix(profile): manter upload de foto com redes sociais (#690)
- test(entrada): medir splash invisivel e foco do hub
- fix(profile): manter upload de foto com redes sociais

## [2.1.0-alpha.11] — 2026-09-28

### Mudado
- test(bots): medir loops na Praça sobre alpha.8 (#702)
- docs: refresh generated bot diagnostic counts on alpha.8
- test(bots): add target context to moving loop diagnostics
- test(bots): detect moving loops in simulated trajectories

## [2.1.0-alpha.10] — 2026-09-28

### Mudado
- docs(changelog): rodada do cronista (2026-09-28) (#705)
- docs(changelog): rodada do cronista — 1 commits

## [2.1.0-alpha.9] — 2026-09-28

### Mudado
- feat(home): clarify controls and bound hub layout (#709)
- feat(home): clarify controls and bound hub layout

## [2.1.0-alpha.8] — 2026-09-28

### Mudado
- Move docs internas para o repo privado progress (#698)
- Limpa docs internas e cliente Godot da árvore pública

- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.1.0-alpha.8).
## [2.1.0-alpha.7] — 2026-09-28

### Mudado
- fix(vm): liberar a mira ADS no catálogo padrão (#693)
- docs(vm): sincronizar blocos gerados da fábrica
- test(vm): estabilizar capturas ADS dos Funkeiros
- test(vm): medir catálogo da fábrica em 3:2 e 16:9
- fix(vm): abrir ADS no catálogo da fábrica
- fix(vm): abrir janela central de mira na fábrica

- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.1.0-alpha.7).
## [2.1.0-alpha.6] — 2026-09-28

### Mudado
- docs(geo): estado real de 28/09 e ordem revisada do runbook geo (#691)
- docs(geo): estado real de 28/09 e ordem revisada — redeploy do client virou obrigatório

## [2.1.0-alpha.5] — 2026-09-28

### Mudado
- feat: lançar hub e armas com ADS legível, MGX5 e SVD restaurada (#670)
- fix: cobrir navegação da nova home nos portões
- fix: alinhar ADS das armas e atualizar réguas visuais
- fix(viewmodel): restore SVD silhouette and AWP reload
- fix(viewmodel): clear ADS sight picture on all weapons
- docs: refresh generated ADS gate counts
- wip(viewmodel): widen ADS view across camera modes
- fix(viewmodel): make MGX5 scope functional
- feat(ui): make hub default and finish multiplayer flow
- docs(re-ui): registrar merge da câmera e tutorial MP
- docs(game): ensinar multiplayer e corrigir texto obsoleto
- docs(re-ui): registrar lane de lançamento e sincronizar docs gerados
- docs(ui): registrar checkpoint e pendências do hub
- feat(ui): reorganizar hub e dar URLs compartilháveis às seções
- feat(ui): montar prévia do hub da home com abas e personagem
- fix(ui): preencher wallpapers da home em qualquer proporção

## [2.1.0-alpha.4] — 2026-09-27

### Mudado
- feat(ranking): reativar ranking único por pontos sem alterar a home (#663)
- docs(ranking): record guarded API merge
- fix(ranking): render badge in protected Vercel deployment
- chore(docs): regenera bloco derivado (autofix)
- docs(ranking): checkpoint alpha.2 gates and production env
- docs(ranking): resume after weapons release base
- docs(ranking): wait for weapons merge before release
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(ranking): checkpoint API nodes and Vercel dependency
- docs(ranking): sync generated symbol index
- docs(ranking): checkpoint database and image builds
- feat(ranking): prepare isolated points release without hub UI

## [2.1.0-alpha.3] — 2026-09-27

### Mudado
- feat(camera): terceira pessoa visível no HUD e configurações (#668)
- chore(docs): regenera bloco derivado (autofix)
- docs(camera): regenera métricas e arquitetura
- feat(camera): expõe três modos e restaura mãos da fábrica

## [2.1.0-alpha.2] — 2026-09-27

### Mudado
- viewmodel: mãos novas da fábrica por padrão nas 26 armas (#669)
- viewmodel: publicar manifesto do Blob privado
- docs: registrar check vm completo verde
- docs: registrar build privado e portão de hashes
- viewmodel: permitir build com runtime privado conferido
- viewmodel: registrar aceite visual exato para lançamento
- docs: distinguir alertas visuais de armas reprovadas
- viewmodel: validar manifesto Blob no CI sem binários privados
- test(viewmodel): verifica rotas efetivas no Astro
- test(viewmodel): remede placar 16x9 sem novas dividas
- test(viewmodel): remede placar 3x2 do lancamento
- test(viewmodel): cobre lançamento padrão das famílias
- docs(viewmodel): registra lançamento padrão e entrega privada
- feat(viewmodel): ativa mãos novas por padrão sem flags

## [2.1.0-alpha.1] — 2026-09-27

### Mudado
- viewmodel: fábrica de armas integrada (26 armas + mãos por time), atrás do VM_LAUNCH — v2.1.0 (#667)
- docs(vm): registra PR substituto com DCO regularizado
- chore(docs): regenera bloco derivado (autofix)
- viewmodel: integra árvore da fábrica com autoria regularizada

## [2.1.0-alpha.0] — 2026-09-26

### Adicionado
- Fábrica de armas do viewmodel: as 26 armas em primeira pessoa (24 produtos da fábrica a partir do pack KINEMATION, variantes e plano B; AK golden aprovada com ADS alinhado), mãos por time nos três rigs de braço e as réguas da fábrica. Tudo atrás da chave `VM_LAUNCH` (desligada): sem `?vmauthored=1` a produção segue no viewmodel legado. Bump de minor pedido pelo dono para marcar a linha 2.1.

## [2.0.0-alpha.300] — 2026-09-26

### Mudado
- fix(mp): cliente recusa mapa parado servido por nó desatualizado (#662)
- fix(mp): cliente recusa mapa parado servido por no desatualizado

## [2.0.0-alpha.299] — 2026-09-26

### Mudado
- feat(mapas): estaciona 7 mapas para retrabalho e abre a oficina (?oficina=1) (#659)
- fix(arnes): serve.mjs morria no primeiro request e levava o portao junto
- chore(docs): regenera derivados apos o merge do autofix
- chore(docs): regenera blocos derivados depois da remocao do wall-27
- chore(arte): apaga de vez o wallpaper da Cuca — a personagem nao existe no elenco
- chore(docs): regenera bloco derivado (autofix)
- feat(mapas): estaciona 7 mapas para retrabalho e abre a oficina (?oficina=1)

## [2.0.0-alpha.298] — 2026-09-25

### Mudado
- feat(obras): cria corredores, cobertura e rotas multinível (#579)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(maps): record inherited prefeitura gate debt
- docs(maps): record prefeitura alpha262 evidence
- fix(maps): close prefeitura collision and budget gaps
- docs(obras): revalida candidata na alpha.252
- fix(obras): libera spawns e rotas CTF
- docs(obras): registra draft PR da lane
- docs(obras): fecha recibo técnico da candidata
- chore(docs): regenera blocos após gates de obras
- chore(obras): registra gates nos documentos gerados
- test(obras): fixa régua causal e recibo WebGL
- feat(obras): fecha miolo e cria rotas multinível

## [2.0.0-alpha.297] — 2026-09-25

### Mudado
- viewmodel: entrega privada em produção (Blob) — recriado do #623 com sign-off (#655)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- viewmodel: entrega privada em produção (Blob) — recriado do #623 com sign-off

## [2.0.0-alpha.296] — 2026-09-25

### Mudado
- fix(git): mailmap devolve a autoria dos 39 commits que saíram como 't@t' (#654)
- chore(docs): regenera bloco derivado (autofix)
- fix(git): mailmap devolve a autoria dos 39 commits que sairam como 't@t'

## [2.0.0-alpha.295] — 2026-09-25

### Mudado
- feat(combat): sequência autoritativa de abates (#581)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(combat): record PR and validation handoff
- docs: refresh generated project ledgers
- feat(combat): add authoritative kill streak HUD

## [2.0.0-alpha.294] — 2026-09-25

### Mudado
- fix(maps): recupera raiz #540 sobre main e corrige VM14 (#554)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)

## [2.0.0-alpha.293] — 2026-09-25

### Mudado
- fix(ci): chave de concorrência por commit na main (a main não tinha rodada de invariantes garantida) (#651)
- fix(ci): chave de concorrencia por commit na main, nao por branch

## [2.0.0-alpha.292] — 2026-09-25

### Mudado
- feat(maps): restaura escala do Posto e Atacadão (#562)
- feat(maps): integra UV e vãos da Penitenciária sobre #554 (#555)
- feat(maps): restaura Madureira no degrau 542 (#560)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(carandiru): remove as reguas C1-C4 da lane superada
- chore(docs): regenera bloco derivado apos integrar a raiz
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado apos o merge da alpha.267
- chore(docs): regenera bloco derivado (autofix)
- docs: refresh generated repository inventory
- docs(carandiru): record overnight browser evidence
- test(carandiru): harden wall and pavilion acceptance
- fix(ci): refresh Carandiru dependency lock
- fix(carandiru): tornar guaritas e pavilhao jogaveis
- docs: refresh Carandiru stair authorship
- fix(carandiru): make all stairs traversable

## [2.0.0-alpha.291] — 2026-09-25

### Mudado
- fix(upa): devolve a segunda rota do setor de emergência (CTF2 fora do fio da navalha) (#650)
- fix(upa): devolve a segunda rota do setor de emergencia

## [2.0.0-alpha.290] — 2026-09-25

### Mudado
- test(escadao): revalidar casas e conflitos na main (#567)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(escadao): atualizar hashes finais de evidencia
- style(escadao): encurtar comentarios do ajuste
- docs(escadao): fechar evidencias alpha 262
- fix(escadao): destravar spawns e objetivo CTF
- docs(escadao): registrar base main do PR
- chore(escadao): reexecutar CI contra main
- test(escadao): validar equipes em dois formatos
- fix(ci): refresh Escadao dependency lock
- docs(escadao): registrar reteste jogavel do r7
- fix(deps): normalizar lock para npm 10
- chore(deps): corrigir auditoria do build
- fix(escadao): torna casas do mirante acessiveis
- docs(escadao): registrar correção do gate de spawn
- fix(escadao): liberar folga dos spawns inferiores
- docs(escadao): registrar pr r6
- docs(escadao): registrar evidencias r6
- fix(escadao): abrir casas e contrajogo do mirante

## [2.0.0-alpha.289] — 2026-09-25

### Mudado
- feat(atacadao): cria corredores e rotas de atacarejo (#582)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(atacadao): refresh final evidence hashes
- chore(atacadao): satisfy comment density gate
- docs(atacadao): record alpha.262 replay and review debt
- perf(atacadao): batch rack geometry and index LOS
- docs(atacadao): revalida candidata na alpha.252
- docs(atacadao): isola vermelho global do CI
- docs(atacadao): registra PR draft
- docs(atacadao): registra limites dos gates
- docs: sincroniza contagens da revisão
- fix(atacadao): ajusta comentário de instancing
- docs: atualiza blocos gerados do Atacadão
- test(atacadao): registra WebGL e continuidade
- test(atacadao): mede estrutura e rotas
- feat(atacadao): cria rotas de atacarejo
- feat(atacadao): restaura kit licenciado

## [2.0.0-alpha.288] — 2026-09-25

### Mudado
- fix(audio): restaura vozes v7 de Funkeiros e Urbanas (#576)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado após restaurar a união
- fix(merge): restaura a união perdida na rodada anterior
- chore(docs): regenera bloco derivado
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- merge(main): realinha com v2.0.0-alpha.279
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): restaura pools v7 de Funkeiros e Urbanas

## [2.0.0-alpha.287] — 2026-09-25

### Mudado
- fix(corrego): torna rota baixa e camada vertical jogáveis (#599)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(corrego): record alpha262 validation
- fix(corrego): reduce diffuse vegetation scene cost
- docs(corrego): registra draft PR 599
- docs(corrego): registra carga, WebGL e continuidade
- test(corrego): mede travessia, janelas e decisões táticas
- fix(corrego): torna rotas baixa e vertical jogáveis

## [2.0.0-alpha.286] — 2026-09-25

### Mudado
- feat(ferro velho): passarela e rotas táticas (#600)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(ferro-velho): link review draft
- feat(ferro-velho): add elevated scrap routes

## [2.0.0-alpha.285] — 2026-09-25

### Mudado
- feat(parque): reautora Parque Madureira com rotas e ambiência (#597)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(parque): registra UIR15 herdada
- docs(parque): registra alpha.262 e bloqueios reais
- test(parque): cobre matriz real 5x5 e 8x8
- docs(parque): fecha evidencias e dividas herdadas
- fix(parque): respeita contratos globais do catalogo
- feat(parque): reautora Madureira com rotas e ambiencia

## [2.0.0-alpha.284] — 2026-09-25

### Mudado
- feat(quebrada): reconstruir rotas e cobertura do Campinho (#602)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(quebrada): record alpha262 playtest evidence
- test(quebrada): expand Campinho browser matrix
- fix(quebrada): reassar grafites do Campinho
- docs(quebrada): vincular draft substituto
- docs(quebrada): registrar portao herdado
- docs(quebrada): atualizar blocos gerados
- feat(quebrada): reconstruir rotas e cobertura do Campinho

## [2.0.0-alpha.283] — 2026-09-25

### Mudado
- feat(mobile): controles de toque + UI responsiva pro app Web (#496)
- feat(mobile): controles de toque + UI responsiva (recriado do #496) (#647)
- chore(docs): regenera bloco derivado (autofix)
- fix(eval): arnes local resolve builtin do Node no frontmatter
- chore(docs): regenera bloco derivado (autofix)

## [2.0.0-alpha.282] — 2026-09-24

### Mudado
- feat(audio): kill-shouts do time Mítico via ElevenLabs (#486)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- feat(audio): fechamento do elenco Mítico e upgrade dos funkeiros
- feat(audio): elenco misto Fish+ElevenLabs e pilotos de upgrade dos times
- feat(audio): sotaque de Pernambuco empurrado no design de Lampião e Maria Bonita
- feat(audio): rodada final dos míticos — redesigns, expressões do cangaço e SFX do lobo
- feat(audio): dossiê de sotaques e Voice Design dos míticos reprovados
- feat(audio): kill-shouts do time Mítico via ElevenLabs

## [2.0.0-alpha.281] — 2026-09-24

### Mudado
- fix(eval): arnês local resolve qualquer define:vars do index.astro (#648)
- fix(eval): arnês local resolve qualquer define:vars do index.astro

## [2.0.0-alpha.280] — 2026-09-24

### Mudado
- feat(upa): cria setores clínicos e amplia rotas (#605)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(upa): registrar segunda critica independente
- docs(upa): fechar replay dos gates
- docs(upa): registrar revalidacao alpha.262
- chore(upa): resumir justificativa das margens
- fix(upa): afastar rotas de obstaculos clinicos
- docs(upa): registra gate herdado de deploy
- docs(upa): atualiza evidencias do candidato
- feat(upa): cria setores clinicos e amplia rotas

## [2.0.0-alpha.279] — 2026-09-24

### Mudado
- feat(config): CLARÃO DOS TIROS nas configurações - normal/reduzido/mínimo (BUG-174) (#614)
- feat(mp): seletor de JOGADORES POR TIME no criar sala - X1 sem bots (BUG-173) (#613)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(fx): comentario do clarao em duas linhas para o portao eval:comentario
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- feat(config): CLARÃO DOS TIROS nas configurações - normal/reduzido/mínimo (BUG-174)
- chore(docs): regenera bloco derivado (autofix)
- feat(mp): seletor de JOGADORES POR TIME no criar sala — X1 sem bots (BUG-173)

## [2.0.0-alpha.278] — 2026-09-24

### Mudado
- fix(maps): corrige orçamento e nome do Carandiru (#615)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(carandiru): record independent review
- docs(carandiru): refresh final evidence ledger
- docs(maps): record Carandiru PR integrity repair
- chore(maps): keep Carandiru follow-up scoped
- docs(maps): record Carandiru follow-up state
- fix(maps): centralize Carandiru shadow budget

## [2.0.0-alpha.277] — 2026-09-24

### Mudado
- feat(praca): qualificar flancos, água e horizonte (#616)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(generated): refresh praca bot gate index
- docs(map): record praca causal revalidation
- fix(map): close praca cover and evidence blockers
- docs(praca): registrar draft PR
- docs(praca): registrar gate herdado
- docs: realinhar inventario da Praça R2
- docs(praca): alinhar hashes finais
- style(praca): adequar comentarios ao gate
- docs(praca): registrar candidato e evidencias
- docs: regenerar inventario da Praça R2
- test(praca): cobrir matriz WebGL e evidencias
- feat(praca): qualificar flancos e espelho d'agua
- docs(praca): registrar baseline e escopo R2

## [2.0.0-alpha.276] — 2026-09-24

### Mudado
- feat(loja-h): abre terceira rota e conecta navegação (#601)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(loja-h): regenera blocos derivados apos merge da alpha.263
- docs(loja-h): registra pendencia de indices gerados
- feat(loja-h): abre terceira rota e conecta navegacao

## [2.0.0-alpha.275] — 2026-09-24

### Mudado
- fix(telemetria): saída do MP conta uma vez, game_started no banco, build do navegador no join (backend#22) (#626)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): blocos gerados contam a régua nova (379 scripts de avaliação)
- fix(telemetria): saída do MP conta, uma vez só; início de partida no banco; build do navegador no join

## [2.0.0-alpha.274] — 2026-09-24

### Mudado
- fix(ci): grafo de módulos da árvore vira portão antes do deploy (#524)
- fix(ci): grafo de módulos da árvore vira portão antes do deploy (#524) (#642)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)

## [2.0.0-alpha.273] — 2026-09-24

### Mudado
- feat(mansao): prévia em vídeo no hover do card do Joá (#585)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs: regenera blocos derivados depois da base alpha.247
- docs(mansao): registra a prévia em vídeo, as réguas e a pendência do poster
- test(mappreview): réguas cobram mídia real e card ligado ao allow-list
- fix(mapas): card de mapa ligava a prévia por id cravado, não pelo allow-list
- feat(mansao): grava a prévia de 12 s do Joá a partir do mapa servido
- fix(mapid): relatório do Joá derrubava a régua de id na main

## [2.0.0-alpha.272] — 2026-09-24

### Mudado
- fix(bot): files:null de PR grande derrubava o classify e o automerge (#644)
- fix(bots): respeitar alcance real da faca (#580)
- docs: inventário medido dos seis mapas legados (#538)
- fix(classify): files:null derrubava o comentário do bot, e o job inteiro junto
- fix(automerge): PR grande devolve files:null e a régua morria de TypeError
- docs(bots): registrar PR e checkpoint da lane
- fix(bots): respeitar alcance real da faca
- docs: substitui o esboço dos mapas legados por inventário medido
- docs: add legacy maps status ledger
- docs: inclui lote Emerson na frente de mapas
- docs: define frente Claude para mapas legados

## [2.0.0-alpha.271] — 2026-09-24

### Mudado
- fix(autofix): package.json prendia PR em CONFLICTING para sempre (#646)
- fix(ci): dco e agente_check param de cobrar commit de merge (#645)
- fix(autofix): package.json prendia PR em CONFLICTING para sempre
- fix(hooks): pre-push para de cobrar trailer em commit de merge
- fix(ci): dco e agente_check param de cobrar commit de merge

## [2.0.0-alpha.270] — 2026-09-24

### Mudado
- test(lajes): fechar aceite de bots e WebGL (#604)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(lajes): registrar replay na alpha.262
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(lajes): registrar draft e gate final
- docs: atualizar contagem dos gates de Lajes
- test(lajes): fechar aceite de bots e browser

## [2.0.0-alpha.269] — 2026-09-24

### Mudado
- feat(mapa): revalidar Piscina da Treta na main (#612)
- test(escadao): fechar evidências R5 na main (#558)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(piscina): record inherited UI gate
- docs(piscina): refresh generated inventories
- docs(piscina): record final performance evidence
- perf(piscina): batch static geometry and restore graffiti budget
- docs(piscina): registrar gate herdado da alpha.262
- docs(piscina): regenerar blocos após isolamento
- docs(piscina): registrar sucessor do PR 566
- test(piscina): revalidar rotas e orçamento na main
- docs(piscina): registrar reteste de rotas e escala
- fix(ci): regenerate Piscina lock cleanly
- test(piscina): validate current 8x8 architecture
- feat(mapa): rebuild Piscina architectural layout
- feat(mapa): polish Piscina visual finish
- docs: record Piscina stacked PR validation
- fix(mapa): isolate Piscina graffiti layout
- docs: regenera derivados da piscina empilhada
- fix(mapa): validar travessia e captura da piscina
- fix(mapa): cobrir superficies novas da piscina
- feat(mapa): concluir rework da piscina
- test: add red Piscina rework ruler
- docs: prepare Piscina rework pilot
- docs(maps): registra crítica adversarial do degrau 548
- feat(maps): aplica UV em metros em três mapas
- fix(maps): aplica anisotropia nas fábricas locais
- docs(maps): fecha recibo runtime do degrau 545
- feat(maps): restaura escala do Posto e Atacadão
- feat(maps): restaura Madureira no degrau 542
- docs: refresh Carandiru C4 authorship
- test(carandiru): record C4 route evidence
- test(carandiru): gate C4 route evidence
- docs: refresh Carandiru authorship
- feat(carandiru): deepen C3 institutional identity
- assets(carandiru): add traced Mint patrol wagon
- test(carandiru): gate C3 Mint identity
- test(escadao): fechar evidências R5
- docs: refresh generated authorship
- docs(carandiru): checkpoint C2 evidence
- feat(carandiru): close competitive C2 routes
- test(carandiru): prove C2 mutation operators
- docs(mapas): fecha evidência técnica do C1 Carandiru
- docs(mapas): registra checkpoint C1 do Carandiru
- feat(mapas): abre blockout jogável do Carandiru
- test(mapas): cria régua vermelha do Carandiru
- docs(mapas): fecha gates pré-push da #541
- docs(mapas): registra integração do degrau #541
- feat(maps): UV em metros e vão fundo das janelas na Penitenciária
- docs(mapas): registra integração alpha.240
- docs(mapas): prepara publicação da raiz v2
- docs(mapas): fecha próximo passo da raiz
- docs(bugs): desambigua VM14 como BUG-145
- docs(mapas): registra checkpoint da raiz #540
- chore(docs): atualiza gerados após encurtar os comentários
- style(maps): encurta comentários novos ao teto do CM1
- fix(maps): corrige contagem de draw calls do capturador e registra retomada
- docs(maps): registra parada recuperável e validação dos candidatos
- docs(maps): prepara prompts individuais do restante do catálogo
- docs(maps): prepara prompts GLM Claude Mint dos lotes prioritários
- chore(maps): substitui passe básico e prepara capturas dos candidatos
- fix(maps): integra candidatos recuperados ao catálogo
- test(maps): valida fachadas e vida da Penitenciária
- fix(maps): recupera Penitenciária e corrige fachadas e refletores
- fix(maps): recupera Parque e eleva copas fora das rotas
- test(maps): restaura contratos e contexto do Campinho
- fix(maps): recupera Campinho do Morro como mapa independente
- feat(maps): recupera acervo dos PRs de Parque e Carandiru com origem
- docs(maps): corrige Campinho independente e recupera contexto dos PRs
- docs(maps): fecha evidências e continuidade do primeiro lote
- docs(maps): atualiza contadores gerados do lote visual
- feat(maps): aplica primeiro passe de superfícies e entorno urbano
- docs(maps): inventaria catálogo e organiza passes de polish

## [2.0.0-alpha.268] — 2026-09-24

### Mudado
- feat(posto): loja jogável, bombas e três rotas por spawn (#596)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs(posto): fecha contagem e divida herdada
- docs(posto): registra candidato alpha 262
- fix(eval): renderiza variaveis Astro no servidor local
- fix(posto): libera corredores sem perder cobertura
- docs(posto): atualiza blocos gerados apos sync
- docs(posto): registra evidências e receita de produção
- perf(posto): instancia decoração repetida
- chore(posto): mantém catálogo de scripts compartilhado intacto
- feat(posto): fecha rotas carga e captura WebGL
- test(posto): régua eval:posto com 6 cláusulas e 6 mutações
- chore(posto): proveniência dos dois moldes do kit posto_obras_r3
- feat(posto): molde de bomba e de loja, cobertura metálica e pátio menos aberto

## [2.0.0-alpha.267] — 2026-09-24

### Mudado
- feat(frota): a camada que INTEGRA — fila por risco, ledger entre turnos e travas no PATH (#583)
- fix(frota): trava para o mutante órfão que um turno morto deixa na árvore
- fix(frota): a fila não via PR empilhado em PR, e mentia sobre o que está pronto
- feat(frota): o runner que fecha o laço 24/7
- feat(frota): missão derivada da classe, com a mutação que prova cada trava
- feat(frota): a trava é o PATH, não o prompt
- feat(frota): ledger que sobrevive ao turno e lock do recurso de um agente só
- feat(frota): a fila ordenada por risco de apodrecer

## [2.0.0-alpha.266] — 2026-09-24

### Mudado
- fix(régua): UIR15 media a sincronia da troca de lado, não o texto de uma linha (#620)
- fix(pre-push): o motivo do bloqueio apontava uma régua que PASSOU (#622)
- fix(classify): PR grande devolve files:null e a régua morria de TypeError (#624)
- fix(autofix): PR de fork regenerava a doc com o manifesto da BASE — DOCS1 preso em vermelho (#621)
- fix(telemetria): rotas de geo pelo proxy do site, com a geo certa e prova de origem (backend#22) (#625)
- docs(míticos): registra bloqueio da recuperação do Lobisomem (#528)
- chore(docs): regenera bloco derivado (autofix)
- fix(classify): PR grande devolve files:null e a régua morria de TypeError
- fix(api-proxy): prazo no fetch, cidade já codificada passa, ordem de publicação explícita
- chore(docs): blocos gerados contam a régua nova (379 scripts de avaliação)
- fix(pre-push): o motivo do bloqueio apontava uma régua que PASSOU
- fix(autofix): PR de fork regenerava a doc com o manifesto da BASE — DOCS1 preso em vermelho
- fix(régua): UIR15 media o texto de uma linha, não a sincronia da troca de lado
- docs(api): a geo tinha se perdido; runbook do remendo e do conserto definitivo
- fix(telemetria): rotas de geo pelo proxy do site, com a geo certa e prova de origem
- docs(miticos): documenta bloqueio da recuperacao do patch de Lobisomem

## [2.0.0-alpha.265] — 2026-09-23

### Mudado
- fix(crash): lançamento de partida que perde a corrida desiste em vez … (#627)
- chore(docs): regenera blocos derivados com o eval:launchrace do PR
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera blocos derivados sobre a alpha.264
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera blocos derivados com o package.json do PR (243 scripts)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera blocos derivados (DOCS1) para o novo script
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera blocos derivados (DOCS1/ARCH1)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera blocos derivados do eval:launchrace
- chore(docs): regenera bloco derivado (autofix)
- fix(crash): lançamento de partida que perde a corrida desiste em vez de mexer em `game` nulo (#609, #608)

## [2.0.0-alpha.264] — 2026-09-23

### Mudado
- fix(loop): #char-select ausente congelava o jogo a cada quadro (BUG-177) (#619)
- chore(docs): regenera bloco derivado (autofix)
- fix(loop): #char-select ausente congelava o jogo a cada quadro (BUG-177, #617)

## [2.0.0-alpha.263] — 2026-09-22

### Mudado
- fix(amazonia): estabiliza 8x8 e apoia palafitas (#603)
- docs(amazonia): registrar revalidacao alpha.262
- docs(amazonia): record final gate status
- chore(amazonia): satisfy comment and docs gates
- docs(amazonia): refresh generated references
- fix(amazonia): stabilize medium 8x8 and ground palafitas

## [2.0.0-alpha.262] — 2026-09-22

### Mudado
- feat(maps): reconstrói Carandiru sobre a main atual (#611)
- fix(maps): keep Carandiru bot graph connected
- docs(maps): close Carandiru validation ledger
- docs: refresh generated metrics for Carandiru
- docs(maps): refresh Carandiru alpha.261 evidence
- fix(maps): normalize Carandiru map-local identity
- docs(maps): record Carandiru reconstruction evidence
- test(maps): add Carandiru causal and WebGL gates
- feat(maps): reconstruct Carandiru map-local

## [2.0.0-alpha.261] — 2026-09-17

### Mudado
- fix(miticos): chapéu pintado no braço tirava 14 reprovados no portão de seleção (BUG-171) (#607)
- fix(boot-check): B5 injeta erro em callback de timer, não direto no evaluate (BUG-172)
- fix(miticos): chapéu pintado no braço tirava 14 reprovados no portão de seleção (BUG-171)

## [2.0.0-alpha.260] — 2026-09-17

### Mudado
- fix(crash): arnes de automacao apontado para producao nao e crash do … (#587)
- fix(crash): arnes de automacao apontado para producao nao e crash do jogo (#573, #574)

## [2.0.0-alpha.259] — 2026-09-17

### Mudado
- fix(crash): queda de rede do jogador não é defeito de código — para de abrir issue automática (#592)
- fix(crash): queda de rede do jogador não é defeito de código — para de abrir issue automática (#592) (#606)

## [2.0.0-alpha.258] — 2026-09-17

### Mudado
- docs(crash): global opaco injetado nao tem conserto por classificacao (#568)
- docs(crash): global opaco injetado nao tem conserto por classificacao… (#569)

## [2.0.0-alpha.257] — 2026-09-17

### Mudado
- Publicação 2.0.0-alpha.257

## [2.0.0-alpha.256] — 2026-09-17

### Mudado
- docs(lajes): corrige estado do BUG-141 para integrado na main (#539)
- docs(lajes): corrige estado do BUG-141 para integrado na main

## [2.0.0-alpha.255] — 2026-09-13

### Mudado
- feat(mp): o jogo passa a mandar o jogador para onde tem GENTE, não para o nó mais vazio (#598)

## [2.0.0-alpha.254] — 2026-09-13

### Mudado
- revert(nos): br2 sai da lista — o pico real do br é 12 simultâneos, não 275 (#595)

## [2.0.0-alpha.253] — 2026-09-13

### Mudado
- fix(mp): "SERVIDORES FORA DO AR" com os quatro nós de pé — o prazo contava tempo congelado (#594)

## [2.0.0-alpha.252] — 2026-09-13

### Mudado
- fix(erros): os 2 defeitos reais do painel de 13/09 — watchdog de lançamento e playerDef undefined (#593)

## [2.0.0-alpha.251] — 2026-09-13

### Mudado
- feat(nos): br2 entra na lista de servidores (#591)

## [2.0.0-alpha.250] — 2026-09-12

### Mudado
- perf: qualidade adaptativa, orçamento dos 17 mapas, tiro justo e 34% menos banda

## [2.0.0-alpha.249] — 2026-09-12

### Mudado
- fix(discord): convite do rodapé estava expirado e a porta da comunidade fechada (#590)
- fix(discord): convite do rodapé estava expirado e a porta da comunidade fechada

## [2.0.0-alpha.248] — 2026-09-12

### Mudado
- fix(multiplayer): a correção de posição não era rede — cinco defeitos, com laço fechado para medir; e escolher os mapas da sala (#588)
- feat(multiplayer): escolher a dedo os mapas da sala que você cria
- fix(multiplayer): comando com duração, ack do que foi simulado e corpo de gente sem empurrão

## [2.0.0-alpha.247] — 2026-09-10

### Mudado
- feat(mansao): reconstruir Joá sobre a main atual (#578)
- docs(mansao): registrar CI remoto após correção
- docs(mansao): registrar recaptura após correção
- docs(mansao): atualizar índices após rota leste
- chore(mansao): resumir comentário de rota
- docs(mansao): registrar correção dos gates remotos
- fix(mansao): separar rota CTF e liberar spawn
- docs(mansao): registrar reconstrução limpa e fila humana
- test(mansao): validar Chrome real em 3:2 e 16:9
- docs(mansao): regenerar contratos na base atual
- test(mansao): portar gates causais do Joá
- feat(mansao): integrar Joá ao jogo atual
- feat(mansao): portar cenário e assets do Joá

## [2.0.0-alpha.246] — 2026-09-09

### Mudado
- feat(míticos): time Mítico completo — 9 personagens jogáveis (#570)
- chore(docs): regenera bloco derivado (autofix)
- fix(deps): lockfile idêntico ao da main, sem npm install por cima
- fix(deps): regenera o lockfile inteiro para o npm ci do CI voltar a instalar
- fix(deps): npm audit fix zera as 5 vulnerabilidades que travavam o portão
- feat(miticos): Caipora entra no lugar da Cuca e o time fecha em 9
- docs(miticos): a última tentativa da Cuca — 333,4 - 187,0, e ainda não passa
- feat(miticos): Saci e Zumbi entram consertados, e os avatares viram retrato de verdade
- fix(regua): a revisão de browser cravava o elenco de M de ontem
- docs(miticos): Saci é de uma perna, e a viabilidade foi medida antes de decidir
- feat(miticos): auditoria visual do dono aprova os 7, e a mídia órfã sai do disco
- fix(miticos): tira os webm de render que a folha de contato deixou para trás
- fix(miticos): mídia do Lampião regerada do modelo novo, e o enquadramento certo
- docs(miticos): a regeração da Cuca piorou, e BUG-150 registra o número
- chore(miticos): tira scratchpad e a costura de peso que não entrou, e registra BUG-150
- feat(miticos): time Mítico vai de 1 para 7 personagens jogáveis
- feat(miticos): CHR7 pega quem flutua, aterramento vira genérico e Zumbi ganha clipe próprio
- docs(miticos): fecha BUG-147 e registra o placar real do portão
- fix(audio): Lobisomem entra no perfil físico, e comentários voltam ao orçamento
- fix(miticos): a tela de carregamento respeitava só cinco facções
- feat(regua): CHR7 — nenhuma malha atravessa o chão na pose assentada
- chore(docs): bloco derivado e evidência de layout do Lajes
- fix(menu): portão de browser volta a rodar e o badge de modo troca o painel inteiro
- fix(miticos): tira do clipe os ossos de curl e devolve o portão de seleção
- fix(miticos): devolve os retratos de resultado aprovados do Lobisomem
- fix(miticos): integrate lobisomem assets and review
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- docs: regenera índices após candidato Mítico
- feat(miticos): integra Lobisomem como candidato isolado
- feat(miticos): adiciona mídia aprovada do Lobisomem

## [2.0.0-alpha.245] — 2026-09-09

### Mudado
- fix(sertao): libera carroças e casas dos respawns (#559)
- docs(sertao): vincula draft pr 559
- docs(sertao): registra correcao pos-merge
- fix(sertao): libera carrocas e casas dos respawns
- test(sertao): reproduz rejeicao pos-merge

## [2.0.0-alpha.244] — 2026-09-09

### Mudado
- fix(deps): desbloquear auditoria dos PRs (#571)
- fix(deps): atualizar smol-toml seguro
- fix(deps): corrigir auditoria do build

## [2.0.0-alpha.243] — 2026-09-09

### Mudado
- docs(áudio): registra bloqueio do rollback F/U (#531)
- docs(viewmodels): registrar bloqueio da recarga M4 (#534)
- feat(audio): comparativo A/B v7×v8 e rollback determinístico de F/U
- docs(audio): fontes das vozes antigas de F/U localizadas fora do Git
- docs(audio): corrige cobertura do rollback de vozes
- docs(viewmodels): registrar diagnóstico da recarga M4
- docs(audio): bloqueio do rollback de vozes de Funkeiros e Tribos Urbanas

## [2.0.0-alpha.242] — 2026-09-08

### Mudado
- feat(escadao): abre duas janelas e casas jogáveis no mirante (#529)
- chore(escadao): regenerar layout de grafites
- feat(escadao): abrir casas dos dois lados
- test(escadao): exigir janelas na mesma sala
- test(escadao): registrar baseline vermelha das casas
- docs(escadao): regenera blocos derivados após encurtar comentários
- style(escadao): comentários da casa central dentro do orçamento de 2 linhas
- docs(escadao): regenera blocos derivados após o commit da régua
- docs(escadao): registra a rodada da casa central e o falso positivo
- test(escadao): régua da casa central exercendo a branch GLB_ON
- fix(escadao): shell procedural autoritativo na casa central da laje
- docs(escadao): fecha portoes de push e mede nao-regressao da rota
- docs(escadao): registra checkpoint de publicacao
- docs(escadao): registra evidências e limites do PR 529
- fix(escadao): valida janelas e cobertura a partir do corpo real
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- feat(escadao): cria abrigo disputável no mirante
- chore(docs): regenera bloco derivado (autofix)
- feat(escadao): abre janela da casa para a rua

## [2.0.0-alpha.241] — 2026-09-08

### Mudado
- feat(sertao): finaliza casas, fauna e por do sol com reguas WebGL (#526)
- chore(docs): sincroniza indices finais do Sertao
- style(sertao): reduz comentarios de implementacao
- test(sertao): reposiciona mutante de folga
- fix(sertao): abre gargalo da rota oeste
- perf(sertao): agrupa interiores e mede contraste
- fix(sertao): abre fuga lateral nas casas dos spawns
- chore(docs): regenera bloco derivado (autofix)
- docs(sertao): fecha BUG-91 no ledger e regenera blocos gerados
- test(sertao): verifica captura offline do BUG-91 por raio no enquadramento
- test(sertao): contrato de interiores estendido às casas dos spawns
- fix(sertao): platibanda-1 e pedra-7 viram interiores jogáveis (BUG-91)
- fix(sertao): colisor da carroça espelha a geometria visível (BUG-91)
- test(sertao): régua das carroças WA1-WA4 reprova o HEAD
- docs(sertao): registra BUG-91, rejeição humana das carroças e casas fechadas
- docs(sertao): registra IN7 e restaura limitações pendentes
- test(sertao): expõe resultado do mutante bolsao
- test(sertao): cobre mutante bolsao no check de interiores
- docs(sertao): fecha ledger das casas da praça
- fix(sertao): preserva folga dos obstáculos fora das casas
- chore(docs): inclui ferramentas offline no inventário versionado
- chore(docs): sincroniza índices da validação offline
- fix(sertao): libera circulação e fecha frestas nas casas
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- feat(sertao): abre casas da praça ao combate

## [2.0.0-alpha.240] — 2026-09-08

### Mudado
- fix(audio): prevent zero exponential envelopes (#552)
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): prevent zero exponential envelopes

## [2.0.0-alpha.239] — 2026-09-07

### Mudado
- feat(combate): contador de abates, headshot em 1ª pessoa e bot de faca que joga de faca (#536)
- chore(docs): regenera bloco derivado (autofix)
- docs(handoff): fecha o ledger com o que foi medido, o que ficou vermelho e o que falta
- chore(docs): regenera bloco derivado (autofix)
- docs(gerado): sincroniza índices após feedback de combate
- docs(combate): registra evidência e mutantes dos três defeitos
- docs(combate): enxuga o comentário de _meleeRange
- fix(combate): bot de faca fecha e golpeia; HANDOFF sem build verde falso
- feat(combate): contador de abates no HUD, headshot em 1ª pessoa e bot de faca

## [2.0.0-alpha.238] — 2026-09-06

### Mudado
- perf(amazonia): reduz custo 8x8 e vira escada do respawn (#527)
- chore(amazonia): regenera blocos pós-merge e encurta comentário da estação A
- docs(amazonia): registra validação pós-merge
- docs(amazonia): registra resolução dos conflitos
- fix(amazonia): abre as cabeças da ponte norte e fecha a VM14
- docs(amazonia): fecha relatório 8x8 com A/B, mutantes e portões
- docs(amazonia): atualiza scripts e blocos gerados
- docs(amazonia): atualiza recibo final da simulação
- test(amazonia): fortalece a simulação final
- docs(amazonia): atualiza blocos gerados e ledger final
- test(amazonia): integra réguas de visão e escadas no portão
- perf(amazonia): acelera visão dos bots e valida todas as escadas
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(amazonia): otimiza rota 8x8 e vira escada B

## [2.0.0-alpha.237] — 2026-09-06

### Mudado
- feat(combat): add bounded AWP penetration (#535)
- feat(combat): add bounded AWP penetration

## [2.0.0-alpha.236] — 2026-09-06

### Mudado
- fix(sertao): restaura grafo de módulos do preview (#525)
- chore(docs): regenera bloco derivado (autofix)
- fix(sertao): separa revisão de mídia do preview

## [2.0.0-alpha.235] — 2026-09-06

### Mudado
- feat(sertao): vila de caatinga com criação animada e preview real (#516)
- fix(sertao): estabiliza captura da criação no CI
- chore(docs): regenera bloco derivado (autofix)
- docs: registra validação alpha.233 do Sertão
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(sertao): restaura loader e índices após rebase
- fix(sertao): preserva procedência e revisão da criação após rebase
- fix(maps): regenera grafite e previews após integrar main227
- fix(audio): inclui Escadão no gerador do laboratório local
- docs(sertao): registra portões finais e submissão para merge
- docs(sertao): sincroniza índices e autoria na submissão limpa
- docs(sertao): registra integração preservada e correção adversarial
- feat(sertao): preserva menu main e preview real junto ao de Lajes
- fix(sertao): reutiliza céu procedural por configuração de luz
- ci(sertao): conecta contratos e evidência de runtime aos portões
- docs(sertao): registra procedência e pendências explícitas
- docs(sertao): registra céu horizonte e animação regional
- docs(sertao): preserva críticas adversariais por rodada
- docs(sertao): registra referências e régua espacial
- docs(sertao): registra continuidade e entrega validada
- docs(sertao): preserva capturas e medições da revisão de mapa
- docs(sertao): preserva comparações visuais de fauna e horizonte
- docs(sertao): preserva evidência visual da criação animada
- build(sertao): preserva derivação reproduzível do calango
- test(sertao): registra régua de luz e contraste
- test(sertao): verifica animais e orçamento no jogo servido
- test(sertao): mede fauna rig e integração sem ampliar preload
- test(sertao): verifica rotas vegetação e oclusores
- test(sertao): mede identidade e cobertura competitiva
- feat(sertao): transforma o arraial preservando rotas e objetivos
- feat(sertao): integra fauna animada e criação com contato
- feat(sertao): compõe arquitetura e horizonte de caatinga
- feat(sertao): adiciona fauna Mint com rig e procedência
- feat(sertao): adiciona acervo de arquitetura e caatinga

## [2.0.0-alpha.234] — 2026-09-06

### Mudado
- Escadão: casa frontal conectada e horizonte (#522)
- docs(escadao): registrar ajuste de passarela
- fix(escadao): preservar lance sob passarela
- docs(escadao): registrar casa de disputa R5
- feat(escadao): abrir casa frontal aos dois lados
- docs(escadao): registrar contratos R5
- feat(escadao): adicionar horizonte de morro
- docs(escadao): registrar prazo e marco para redistribuição
- wip(escadao): preservar passagens R5 antes da pausa coordenada
- docs(escadao): registrar merge e evidência final

## [2.0.0-alpha.233] — 2026-09-06

### Mudado
- fix(lajes): evita travamentos ao aumentar a partida para 8x8 (#517)

## [2.0.0-alpha.232] — 2026-09-06

### Mudado
- fix(menu): restore Single Player mode submenu (#518)
- test(smoke): open Single Player before mode
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(skylife): skip bird preload in Node probes
- chore(docs): regenera bloco derivado (autofix)
- test(boot): follow Single Player submenu
- docs: regenerate architecture index
- docs: update CTF menu checkpoint
- fix(menu): restore single-player mode submenu
- docs: record CTF home verification and remaining gates
- fix(menu): restore direct CTF entry on home

## [2.0.0-alpha.231] — 2026-09-06

### Mudado
- fix(audio): remover fallback de voz sintetica (#520)
- docs(audio): atualiza índices após rebase
- fix(audio): restaurar memes e rounds historicos
- fix(audio): remover fallback de voz sintetica
- fix(audio): restaurar memes e rounds historicos
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): remover fallback de voz sintetica

## [2.0.0-alpha.230] — 2026-09-06

### Mudado
- fix(amazonia): restaura rota alternativa do spawn B (#521)

## [2.0.0-alpha.229] — 2026-09-06

### Mudado
- fix(audio): revalidar manifesto ingame por release (#519)
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): revalidar manifesto ingame por release

## [2.0.0-alpha.228] — 2026-09-06

### Mudado
- feat(amazonia): integrar mapa ribeirinho jogável

## [2.0.0-alpha.227] — 2026-09-06

### Mudado
- feat(escadao): integrar mapa com becos, casa acessível e fauna (#515)
- fix(escadao): manter chegada dos becos no grafo físico
- fix(escadao): completar ambiência do pacote publicado
- chore(escadao): finalizar mídia e registrar validação do mapa
- fix(escadao): validar rotas físicas e proteger o patamar do objetivo
- docs(escadao): atualizar inventário e gates da rodada R4
- feat(escadao): preview real e provas de navegação e fauna
- fix(escadao): fechar pisos e abrir casa com circulação e janela
- feat(escadao): preserve Mint cat rig and domestic props
- feat(menu): preview atual do Escadão com vídeo sob demanda
- record verified Astro preview on current main
- refresh generated documentation for Escadao integration
- preserve Escadao evidence and main integration report
- integrate Escadao on main and validate real menu and bot routes
- import approved Escadao assets onto current main

## [2.0.0-alpha.226] — 2026-09-06

### Mudado
- feat(lajes): comunidade com becos estreitos, ambiência e preview

## [2.0.0-alpha.225] — 2026-09-06

### Mudado
- feat(ops): rodada 2 — GPU no Mac, edge aquecido, diagnose agendada, eval:boot no CI, beacon, retry no menu, elenco servido (#514)

## [2.0.0-alpha.224] — 2026-09-06

### Mudado
- feat(ops): camada de autonomia operacional — diagnose que explica, ops.js e runbook (#512)

## [2.0.0-alpha.223] — 2026-09-06

### Mudado
- fix(audio): restaurar vozes aprovadas e remover falas genericas (#510)

## [2.0.0-alpha.222] — 2026-09-06

### Mudado
- fix(telemetry): make browser delivery reliable (#508)
- chore(docs): regenera bloco derivado (autofix)
- fix(boot): keep early telemetry fail-silent
- chore(docs): regenera bloco derivado (autofix)
- fix(telemetry): make browser delivery reliable

## [2.0.0-alpha.221] — 2026-09-05

### Mudado
- fix(audio): renovar cache do manifesto privado (#507)
- fix(audio): renovar cache do manifesto privado

## [2.0.0-alpha.220] — 2026-09-05

### Mudado
- feat(audio): incorporar pack aprovado via Blob privado (#506)
- fix(ci): desacoplar gate de assets do three
- fix(ci): preservar preview sem segredo
- docs: sincronizar inventario de gates
- docs(audio): registrar canal privado
- feat(audio): buscar pack privado no build

## [2.0.0-alpha.219] — 2026-09-05

### Mudado
- feat(audio): consolidar arsenal e feedback tatil no jogo (#504)
- docs(audio): fechar handoff do gate de publicação
- fix(audio): impedir pack restrito fora da allowlist
- docs(audio): fechar handoff pos-merge
- docs(audio): registrar seleção e continuação da lane
- fix(audio): consolidar curadoria e feedback de combate
- docs(audio): registrar bloqueio do preview
- docs: atualizar autoria da locucao Fish
- docs(audio): registrar locucao e bloqueio de direitos
- feat(audio): adicionar locucao Fish local
- docs(audio): registrar PR e validacao final
- docs: registrar gate de eventos de audio
- docs: sincronizar contratos de audio
- feat(audio): completar feedback tatil local
- fix(audio): preservar fallbacks e balancear boom
- fix(audio): tornar boom padrao no laboratorio
- docs(audio): registrar boom guns designed para escuta
- feat(audio): integrar boom guns designed em ab local
- docs(audio): registrar arsenal cc0 para escuta
- feat(audio): mapear arsenal para gravacoes cc0
- docs(audio): registrar rejeicoes da escuta
- fix(audio): remover sobreposicao e distinguir pistolas
- docs(audio): registrar escuta de eventos e mapas
- feat(audio): dar identidade a armas mapas e eventos
- docs(audio): registrar cobertura e validacao local
- feat(audio): cobrir arsenal e eventos no jogo local
- docs(audio): registrar escuta Fab no jogo local
- feat(audio): ligar laboratorio Fab ao jogo local
- feat(audio): ampliar escuta local para biblioteca segura
- test(audio): isolar ledger da fixture PRV13
- docs(audio): 5ª rodada — BUG-138/139, três camadas com prova automatizada
- test(audio): prova automatizada do assets-check contra fixture (PRV13)
- fix(audio): ledger ausente aborta o gerador, nos dois modos (PRV12)
- docs(audio): resultados da 4ª rodada e audio:check registrado como vermelho
- docs(audio): registra o escape P0 e corrige o que os docs superdeclaravam
- fix(audio): P0 fail-closed — allowlist no prefixo derivado, nas três camadas
- docs(audio): estados por evento, BUG-132..136 e handoff da 3ª rodada
- feat(audio): legado CS/Valve/UT catalogado e bloqueado, sem fingir substituição
- feat(audio): gate de capacidade — só se aprova o que o runtime sabe tocar
- fix(audio): sha256Fonte exige formato E é conferido contra o arquivo real (PRV8)
- fix(audio): inventariador sinaliza falha POR ARQUIVO, e sai 1
- fix(audio): rajada com cache frio faz uma requisição, não uma por tiro (ESP9)
- docs(audio): handoff da 2ª rodada e BUG-128..131 no KNOWN-BUGS
- feat(audio): shortlist por metadado e escuta A/B local, sem aprovar nada sozinho
- fix(audio): a decisão do ledger passa a controlar o gerador (PRV7)
- fix(audio): P0 trava a redistribuição Fab e PRV5 volta a poder disparar
- fix(audio): sample que não carrega cai no synth, não em silêncio (ESP8)
- fix(audio): ALC2 era falso-verde — o empacotador morria em toda execução
- docs(audio): BUG-126 e BUG-127 no KNOWN-BUGS, com régua e reprodução
- docs(audio): handoff do piloto Fab, SCRIPTS.md e blocos regerados
- fix(audio): volume do usuário entra uma vez no caminho por sample (ESP7)
- feat(audio): inventariador local do staging privado — só metadado
- feat(audio): contrato de procedência por asset — origem, licença, hash e aprovação
- fix(audio): tiro por sample entra no grafo — pan, propagação e duck do synth
- test(audio): régua espacial do tiro por sample (ESP) — 3 cláusulas vermelhas
- fix(audio): ambiente entra no manifest e no pack — ALC 17/17 verde
- test(audio): régua de alcance do empacotamento (ALC) — vermelha por 17 de 17
- docs(audio): iniciar piloto Fab

## [2.0.0-alpha.218] — 2026-09-05

### Mudado
- fix(multiplayer): reconcile authoritative state and quality telemetry (#505)

## [2.0.0-alpha.217] — 2026-09-03

### Mudado
- feat(multiplayer): granadas online — o 4/5 pede ao servidor, nade/boom desenham sem dano local (fase 3) (#503)
- feat(multiplayer): granadas online — o 4/5 pede ao servidor, `nade`/`boom` desenham sem dano local (fase 3)

## [2.0.0-alpha.216] — 2026-09-03

### Mudado
- feat(multiplayer): drops de arma online — cria e some por id do servidor, E pede pick (fase 2) (#502)
- chore(docs): regenera bloco derivado (autofix)
- feat(multiplayer): drops de arma online — cria e some por id do servidor, E pede `pick` (fase 2)

## [2.0.0-alpha.215] — 2026-09-03

### Mudado
- feat(multiplayer): eventos do servidor no cliente — arco, killfeed e painel de morte com o autor real (BUG-90, fase 1) (#501)
- chore(docs): regenera bloco derivado (autofix)
- feat(multiplayer): consome os eventos do servidor — arco, killfeed e painel de morte com o autor real (BUG-90, fase 1)

## [2.0.0-alpha.214] — 2026-09-03

### Mudado
- fix(ci): substitui a action local fantasma do issues-bot pelos passos reais (PR #490 do nfvelten) (#500)
- chore(docs): regenera blocos com o package.json do PR (eval:wflocal)
- chore(docs): regenera bloco derivado (autofix)
- Merge origin/main (alpha.212) em conserta-action-fantasma-issues-bot e regenera blocos
- chore(docs): regenera bloco derivado (autofix)
- ci: dispara os checks obrigatórios no head do autofix (PR #490)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(ci): substitui a action local fantasma do issues-bot pelos passos reais

## [2.0.0-alpha.213] — 2026-09-03

### Mudado
- docs(known-bugs): fechar BUG-117..124, BUG-18 e BUG-41 com o estado real (#499)
- docs(known-bugs): fechar BUG-117..124 com release e deploy, e as entradas velhas BUG-18 e BUG-41

## [2.0.0-alpha.212] — 2026-09-03

### Mudado
- fix(multiplayer): paridade com o single player — acerto previsto, killfeed, respawn, fim de partida, viewmodel e [BOT] (BUG-119, 121-124) (#498)
- fix(multiplayer): paridade com o single player — acerto previsto, killfeed, respawn, fim de partida, caixa do viewmodel e [BOT] (BUG-119, 121-124)

## [2.0.0-alpha.211] — 2026-09-02

### Mudado
- feat(analytics): correlate player journey and online presence (#495)
- fix(online): register presence before refreshing count
- feat(analytics): attach gameplay context to telemetry

## [2.0.0-alpha.210] — 2026-09-02

### Mudado
- fix(multiplayer): remotos no relógio do servidor e espectador em 3ª pessoa (BUG-117, BUG-118) (#494)
- fix(multiplayer): remotos no relógio do servidor e espectador em 3ª pessoa (BUG-117, BUG-118)

## [2.0.0-alpha.209] — 2026-09-02

### Mudado
- fix(multiplayer): virada de partida, animação dos remotos, viewmodel tardio, fim de round, pausa e sons (BUG-110..116) (#493)
- chore(docs): regenerar blocos gerados e ARCH.md (game.js 7220 linhas)
- chore(multiplayer): comentários novos no teto de 2 linhas (histórico no KNOWN-BUGS)
- fix(multiplayer): morte de remoto com som e kill confirm no online
- fix(multiplayer): pausa não devolve o corpo à IA (input parado a cada 2 s)
- fix(multiplayer): virada de partida, animação dos remotos, viewmodel tardio e fim de round

## [2.0.0-alpha.208] — 2026-09-02

### Mudado
- fix(multiplayer): smooth sessions and report client quality (#492)
- fix(multiplayer): smooth sessions and report client quality

## [2.0.0-alpha.207] — 2026-09-02

### Mudado
- fix: keep prod watch green during legitimate player idle (#491)
- fix: do not page on idle telemetry

## [2.0.0-alpha.206] — 2026-09-02

### Mudado
- fix(multiplayer): estabiliza sessão, bots, CTF e áudio (#489)

## [2.0.0-alpha.205] — 2026-08-30

### Mudado
- feat(audio): pack v8 — vozes do time Mítico e upgrade dos funkeiros (#487)
- feat(audio): pack v8 — vozes do time Mítico e upgrade dos funkeiros

## [2.0.0-alpha.204] — 2026-08-30

### Mudado
- feat(audio): roteiro e gerador de vozes do time Mítico (#485)
- feat(audio): roteiro e gerador de vozes do time Mítico

## [2.0.0-alpha.203] — 2026-08-30

### Mudado
- chore: APIs saem do cliente (#462 + main) (#474)
- fix(smoke): contrato de /api/leaderboard vira o da rede de segurança — 307 pro backend
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado após o merge da alpha.201
- fix(ci+boot): import do apibase que faltava e workflows apontam para as réguas que restaram
- chore(docs): regenera bloco derivado após o merge
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(api): as 18 rotas de banco saem do cliente e vão para o backend privado

## [2.0.0-alpha.202] — 2026-08-29

### Mudado
- fix(chr3): régua mede o PÉ (não a bbox); tabela compensa crouch constante — afundando 5 → 2 (#482)
- fix(chr3): régua mede o PÉ (não a bbox); tabela compensa crouch constante — afundando 5 → 2

## [2.0.0-alpha.201] — 2026-08-29

### Mudado
- Dois P0 saem da lista: BUG-36 (Ctrl+W) e BUG-03 (bot mudo) rebaixados com medição (#480)
- docs(bugs): BUG-36 e BUG-03 saem do P0 — mitigação/conserto já na main, rebaixados com medição

## [2.0.0-alpha.200] — 2026-08-29

### Mudado
- fix(eval): régua de UI deixa de ser cega a font-size fluida (BUG-05) (#479)
- fix(eval): régua de UI deixa de ser cega a font-size fluida (BUG-05)

## [2.0.0-alpha.199] — 2026-08-29

### Mudado
- fix(edge+telemetria): os dois P0 — /js/ sai do TTL de 1 mês no edge (BUG-39) e BUG-51 fecha com evidência (#476)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(edge+telemetria): /js/ sai do TTL de 1 mês no edge e o BUG-51 fecha com evidência

## [2.0.0-alpha.198] — 2026-08-29

### Mudado
- feat(audio): músicas do menu trocadas pela leva Suno — audio-pack-v7 (#473)
- feat(audio): menu 100% Suno — pack v7 no ar e a URL aponta pra ele

## [2.0.0-alpha.197] — 2026-08-29

### Mudado
- fix(armas): o preload do corpo (tecla B) puxava as 26 armas bloqueando (BUG-85) (#478)
- fix(armas): o preload do corpo (tecla B) puxava as 26 armas bloqueando (BUG-85)

## [2.0.0-alpha.196] — 2026-08-29

### Mudado
- docs: fecha BUG-01 — HUD de CTF já tem guarda, limpeza e régua (5/5) (#475)
- docs: fechar BUG-01 — a faixa de CTF ja tem guarda de modo, limpeza e regua

## [2.0.0-alpha.195] — 2026-08-29

### Mudado
- fix(three): render() pergunta ao driver se o contexto vive — a corrida da perda no meio do frame (#420)
- fix: invariantes MAT2/TEX1, poster duplicado e check de posters (#365 + main) (#470)
- fix(crash): perda de contexto WebGL no meio do frame (#444 + main) (#472)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(crash): perda de contexto no meio do frame é recuperável — TypeError do WebKit não abre issue nem derruba o launch (#419 #420)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- fix: invariantes MAT2/TEX1, poster duplicado, check de posters e limpeza de PNGs

## [2.0.0-alpha.194] — 2026-08-29

### Mudado
- feat(docs): como criar mapa com IA (#373 com DCO) (#469)
- fix(csp): connect-src passa a casar wss — sem isto o multiplayer nao conecta (#471)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Documentação de como criar mapa com IA.

## [2.0.0-alpha.193] — 2026-08-29

### Mudado
- fix(crash): erro que o próprio three ENGOLE não é bug do jogo — WebGLState fica na telemetria (#465)
- chore(docs): regenera bloco derivado (autofix)
- fix(mobile): a promessa do orientation.lock chega com catch — a rejeição para de derrubar o launch (#431 #432)

## [2.0.0-alpha.192] — 2026-08-28

### Mudado
- map: Córrego entra na main sozinho — e paga a dívida do prefixo fy_ (#460)

## [2.0.0-alpha.191] — 2026-08-28

### Mudado
- feat: fumaça do cano + tranco e cápsulas mais fortes no tiro (#405)

## [2.0.0-alpha.190] — 2026-08-28

### Mudado
- fix(autofix): branch da mesma casa mantém as ferramentas do PR (#434)
- fix(ci): o bootstrap do issues-bot leva o trailer Agent, e a AF7 varre todos os workflows (#451) (#455)

## [2.0.0-alpha.189] — 2026-08-27

### Mudado
- fix(crash): ponte injetada pelo navegador não é bug do jogo — __gCrWeb para de abrir issue (#428) (#433)

## [2.0.0-alpha.188] — 2026-08-27

### Mudado
- feat(i18n): gêmea EN do /changelog e idioma honesto nas rotas EN (#400)

## [2.0.0-alpha.187] — 2026-08-27

### Mudado
- fix(crash): carteira cripto injetada não é bug do jogo — window.ethereum para de abrir issue (#403) (#406)

## [2.0.0-alpha.186] — 2026-08-26

### Mudado
- fix(crash): redações do WebKit e do Firefox pt-BR entram no CACHE_SPLIT_RE (#443) (#448)

## [2.0.0-alpha.185] — 2026-08-26

### Mudado
- fix(ci): o commit "regenera bloco derivado" leva o trailer Agent, e a AF7 volta a morder (#450) (#452)

## [2.0.0-alpha.184] — 2026-08-24

### Mudado
- chore(portao): co-autoria de agente de IA não entra mais na mensagem (#430)

## [2.0.0-alpha.183] — 2026-08-23

### Mudado
- fix(site): /discord levava para um convite que não é mais o nosso (#429)

## [2.0.0-alpha.182] — 2026-08-22

### Mudado
- fix(ci): o artefato de preview perdia os arquivos ocultos (#427)

## [2.0.0-alpha.181] — 2026-08-22

### Mudado
- perf(vram): armas param de custar 259 MB de textura — 96 MB a menos por partida (#407)

## [2.0.0-alpha.180] — 2026-08-22

### Mudado
- fix(ci): extrai a trava logo depois do fetch, antes do FETCH_HEAD virar outro (#426)

## [2.0.0-alpha.179] — 2026-08-22

### Mudado
- fix(ci): o merge limpo do bot também leva os trailers (destrava o #406) (#425)

## [2.0.0-alpha.178] — 2026-08-22

### Mudado
- fix(ci): o bot para de reprovar o PR que ele acabou de consertar (#424)

## [2.0.0-alpha.177] — 2026-08-22

### Mudado
- feat(ci): o que ficou de fora do #408 — fase 5, varredura pós-release e preview sem token (#422)

## [2.0.0-alpha.176] — 2026-08-22

### Mudado
- fix(ci): classify não reprova PR de fork por secret que o gatilho não pode ter (#408)

## [2.0.0-alpha.175] — 2026-08-22

### Mudado
- fix(régua): prova de mordida que não morde passa a REPROVAR (#416)

## [2.0.0-alpha.174] — 2026-08-22

### Mudado
- fix(regua): DOCSAUT deixa de reprovar branch de PR com autor novo (#415)

## [2.0.0-alpha.173] — 2026-08-21

### Mudado
- perf(armas): a partida carrega as armas dela — 26 no bloqueante viram 9 (#410)

## [2.0.0-alpha.172] — 2026-08-21

### Mudado
- fix: importmap do Layout e CVEs altas nas dependências (#363)

## [2.0.0-alpha.171] — 2026-08-21

### Mudado
- feat: kill replay cam com hit-stop (#364)

## [2.0.0-alpha.170] — 2026-08-21

### Mudado
- feat(tela-04): duas colunas na escolha de mapa e varredura do i18n (#401)

## [2.0.0-alpha.169] — 2026-08-21

### Mudado
- fix(boot): falha de carregamento do módulo chega com evidência (#387)

## [2.0.0-alpha.168] — 2026-08-21

### Mudado
- fix(portao): autoria não vota em clone raso - Vercel e produção vermelhas desde o #398 (#402)

## [2.0.0-alpha.167] — 2026-08-21

### Mudado
- fix(crash): abort de mídia é recuperável — play() cortado por pause() não abre issue (#390)

## [2.0.0-alpha.166] — 2026-08-21

### Mudado
- fix(docs): o portão de autoria cobra de quem pode consertar, não do PR seguinte (#398)

## [2.0.0-alpha.165] — 2026-08-21

### Mudado
- docs(gerados): re-deriva o bloco de autoria após o squash do #392 (DOCS1) (#395)

## [2.0.0-alpha.164] — 2026-08-21

### Mudado
- fix(botbrain): separa treino e avaliação com sementes holdout (#392)

## [2.0.0-alpha.163] — 2026-08-20

### Mudado
- feat: sangue CS 1.6, controles mobile (CoD-like), perf auto e ajustes de menu (#368)

## [2.0.0-alpha.162] — 2026-08-20

### Mudado
- fix(home): home estática de volta; idioma por país via /api/geo-lang (Stateloop) (#388)

## [2.0.0-alpha.161] — 2026-08-19

### Mudado
- fix(telemetria): console.error com string é log, não bug do jogo (#382) (#385)

## [2.0.0-alpha.160] — 2026-08-19

### Mudado
- chore(ci): consolida bots de issue em issues-bot.yml (#378)

## [2.0.0-alpha.159] — 2026-08-19

### Mudado
- fix(release): perdedor da corrida não toca na release — edit apagava o crédito dos colaboradores (#374)

## [2.0.0-alpha.158] — 2026-08-19

### Mudado
- fix(mapa): arma 'smg' não existe — crash de todo quadro no _updatePickups (#366) (#367)

## [2.0.0-alpha.157] — 2026-08-18

### Mudado
- fix(ci): guarda de dedupe na shell — triage não morre mais em issue não-crash (#358)

## [2.0.0-alpha.156] — 2026-08-18

### Mudado
- fix(ci): classify serializa por PR, posta como csbrasil-BOT e dedupa por marcador (#351)
- fix(eval): vm-kick-sim importa WEAPONS e REC_DEG em vez de parsear fonte (#352)
- ci(portao-browser): caminho do viewmodel entra no gatilho de browser (#353)
- feat(ci): comentários do bot legíveis — caixa colorida, mapa da mudança e ficha de triagem (#354)
- fix(release): criação de release idempotente — corrida tag×main não pinta mais vermelho (#355)

## [2.0.0-alpha.155] — 2026-08-18

### Mudado
- docs: handoff da 2a sessao de 18/08 — ruleset ativo, bot no ar, planos 1/2/6 concluidos (#350)

## [2.0.0-alpha.154] — 2026-08-18

### Mudado
- ci(release): run mais novo cancela o velho no ar (atomic push failed da .152) (#349)

## [2.0.0-alpha.153] — 2026-08-18

### Mudado
- ci(release): push do bump autentica como csbrasil-BOT para passar no ruleset da main (#343)

## [2.0.0-alpha.152] — 2026-08-18

### Mudado
- fix(eval): changelog conta squash-merge e foot-offsets volta a bater com a sonda (#348)
- chore(scripts): documentacao dos // sai do package.json para SCRIPTS.md (#347)

## [2.0.0-alpha.151] — 2026-08-18

### Mudado
- fix(ci): portao build verde de novo: eval:deps + vm-kick-sim le data/weapons.js (#344)

## [2.0.0-alpha.150] — 2026-08-18

### Mudado
- docs: handoff para proxima sessao (plano completo de 7 frentes)

## [2.0.0-alpha.149] — 2026-08-17

### Mudado
- fix(input): preventDefault em pointer lock impede Quick Find do Firefox

## [2.0.0-alpha.148] — 2026-08-17

### Mudado
- chore(portões): travas locais, agrupamento de crash por classe, timeouts e vulnerabilidades (#209)

## [2.0.0-alpha.147] — 2026-08-17

### Mudado
- ci: liga as réguas de navegador ao portão (portao-browser) (#232) (#339)
- feat(mapa): adiciona "Obras da Prefeitura" (terreno ondulado) (#256) (#338)

## [2.0.0-alpha.146] — 2026-08-17

### Mudado
- feat(mapa): adiciona "UPA 24h da Treta" (pronto-socorro interno) (#257) (#337)

## [2.0.0-alpha.145] — 2026-08-17

### Mudado
- docs: atualiza placar do quality gate (51/51) e corrige gen-arch WEAPONS

## [2.0.0-alpha.144] — 2026-08-17

### Mudado
- fix: adiciona texturas faltantes do mapa Velho Oeste
- fix: adiciona arquivos faltantes do mapa Velho Oeste (map_velho_oeste.js, eval)
- feat(mapa): adiciona Penitenciária e Velho Oeste da Treta (#335)

## [2.0.0-alpha.143] — 2026-08-17

### Mudado
- Publicação 2.0.0-alpha.143

## [2.0.0-alpha.142] — 2026-08-17

### Mudado
- feat(mapas): categoria COMUNIDADE — mapas de autoria de fora da casa (#334)
- feat(mapa): adiciona e estabiliza Parque da Treta (#333)
- fix(grafite): fachada da Loja H pintável acima da linha do olho (BUG-53) (#267)
- refactor(core): extrai WEAPONS para data/weapons.js e quebra o ciclo do BotBrain (#332)
- fix(eval): SG6 — régua do teto de kills do submit_match (issue #116, BUG-54) (#288)

## [2.0.0-alpha.141] — 2026-08-17

### Mudado
- fix(telemetry): FPS do painel mede PARTIDA, não jank de boot (BUG-55) (#291)

## [2.0.0-alpha.140] — 2026-08-17

### Mudado
- feat(release): notas consolidadas por faixa de tag + domínio canônico corosolto/client (#323)

## [2.0.0-alpha.139] — 2026-08-17

### Mudado
- chore: limpeza e instrumentação — cache split, portas, GPU shots, readiness
- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.0.0-alpha.139).

## [2.0.0-alpha.138] — 2026-08-17

### Mudado
- docs(contributing): divisão de bots — estraga-codigo conserta, regras de fork (#324)

## [2.0.0-alpha.137] — 2026-08-16

### Mudado
- fix(client): bundle público não nomeia o backend — régua eval:backendhints (#299)

## [2.0.0-alpha.136] — 2026-08-16

### Mudado
- fix(audio): troca voz do Faria Limer

## [2.0.0-alpha.135] — 2026-08-16

### Mudado
- ci: gate de review-bot enxerga o estraga-codigo (reviews, nao so comments)

## [2.0.0-alpha.134] — 2026-08-16

### Mudado
- docs: BUG-57 - regua casava literal de formatacao e travou deploy por 14h

## [2.0.0-alpha.133] — 2026-08-16

### Mudado
- fix(eval): UIA6 aceita o fatiador de dt do #300 - regex exigia literal 'update(dt)'

## [2.0.0-alpha.132] — 2026-08-16

### Mudado
- fix(webgl): contexto perdido na abertura da arena tenta se recuperar (16a22c40) (#303)

## [2.0.0-alpha.131] — 2026-08-16

### Mudado
- fix(game): FPS baixo não desacelera mais o relógio do jogo (issue #295, BUG-56) (#300)

## [2.0.0-alpha.130] — 2026-08-16

### Mudado
- fix(audio): associa bordões aos personagens

## [2.0.0-alpha.129] — 2026-08-16

### Mudado
- feat(ui): fecha redesign AAA, loading e seleção de mapas

## [2.0.0-alpha.128] — 2026-08-16

### Mudado
- chore: plans/ - docs/historico/plans/ (arquivo morto, não estado atual)

## [2.0.0-alpha.127] — 2026-08-16

### Mudado
- chore: remove symlink node_modules commitado por engano + fecha a brecha do gitignore

## [2.0.0-alpha.126] — 2026-08-15

### Mudado
- chore: confirma auto-deploy Vercel pós-org corosolto

## [2.0.0-alpha.125] — 2026-08-15

### Mudado
- chore: verifica integração Vercel após transfer p/ org corosolto

## [2.0.0-alpha.124] — 2026-08-15

### Mudado
- feat: adicionar apoio nacional e internacional

## [2.0.0-alpha.123] — 2026-08-15

### Mudado
- fix(bots): fumaça estica o grace de alvo p/ 4s (#281) (#290)

## [2.0.0-alpha.122] — 2026-08-15

### Mudado
- feat(ui): opcao de inverter o eixo vertical do mouse (#280) (#289)

## [2.0.0-alpha.121] — 2026-08-15

### Mudado
- chore(release): v2.0.0-alpha.120

## [2.0.0-alpha.120] — 2026-08-15

### Mudado
- fix(webgl1): skinning compila no WebGL1 - getBoneMatrix bifurca por __VERSION__ (#275) (#287)

## [2.0.0-alpha.119] — 2026-08-14

### Mudado
- feat(ci): CodeRabbit no lugar do Greptile como revisor de PR (#272)

## [2.0.0-alpha.118] — 2026-08-14

### Mudado
- fix(gameplay): modo arma-única fecha slots, pickup não recarrega, lastinv (Q) (#279)

## [2.0.0-alpha.117] — 2026-08-14

### Mudado
- fix(boot): watchdog distingue rede lenta de travamento (#265) (#278)

## [2.0.0-alpha.116] — 2026-08-14

### Mudado
- feat(mapa): Atacadão da Treta (8º mapa) — supersedes #253 (#271)

## [2.0.0-alpha.115] — 2026-08-14

### Mudado
- fix(eval): mat_shade guard de numpy — build de fork PR volta a passar

## [2.0.0-alpha.114] — 2026-08-14

### Mudado
- fix(api): client de dados com timeout no fetch — acaba com os 504 de 300s (#269)

## [2.0.0-alpha.113] — 2026-08-14

### Mudado
- feat(site): redes sociais no rodapé, atalhos /discord e /telegram, e SEO/GSC pendente (#263)

## [2.0.0-alpha.112] — 2026-08-14

### Mudado
- fix(mapa): adiciona preview do Posto da Treta (sumiu no merge do #250) (#255)

## [2.0.0-alpha.111] — 2026-08-13

### Mudado
- fix(grafite): placement pula caixa procedural + tool tira fundo branco do decal (#260)

## [2.0.0-alpha.110] — 2026-08-13

### Mudado
- chore(release): v2.0.0-alpha.109

## [2.0.0-alpha.109] — 2026-08-13

### Mudado
- fix: música de menu vira pool do manifesto de áudio (#225)

## [2.0.0-alpha.108] — 2026-08-13

### Mudado
- fix(grafite): reassa o layout — loja_h volta de 39,7% para 51,8% (#254)

## [2.0.0-alpha.107] — 2026-08-13

### Mudado
- feat(mapa): adiciona Posto da Treta (6º mapa) — #250 (#250)

## [2.0.0-alpha.106] — 2026-08-13

### Mudado
- feat(portões): régua que casa tag, main e versão (#252)

## [2.0.0-alpha.105] — 2026-08-13

### Mudado
- fix(eval): char-floor skipa CHR8 graciosamente quando magick falta (build fork PR)

## [2.0.0-alpha.104] — 2026-08-13

### Mudado
- fix(build): error-console preserva a exceção antes do guard Script-error (#251)

## [2.0.0-alpha.103] — 2026-08-13

### Mudado
- fix: marcador de registro de tiro na hud (#248)

## [2.0.0-alpha.102] — 2026-08-13

### Mudado
- fix: trata bundles /_vercel/ como terceiro na proveniência de crash (#229)

## [2.0.0-alpha.101] — 2026-08-13

### Mudado
- fix(telemetria): descarta "Script error." cross-origin opaco no coletor de crash (#221)

## [2.0.0-alpha.100] — 2026-08-13

### Mudado
- fix(hud): indicador de dano aponta pra onde o tiro veio (BUG-52)

## [2.0.0-alpha.99] — 2026-08-13

### Mudado
- chore: remove a rota /editor do build público (bancada WIP com problemas) (#220)

## [2.0.0-alpha.98] — 2026-08-13

### Mudado
- fix(eval): mapa-id ignora .worktrees e isenta atribuição histórica da LICENCA

## [2.0.0-alpha.97] — 2026-08-13

### Mudado
- fix(eval): os 4 apontamentos do Greptile na régua de contrato — e um defeito real que o MC3 achou (#242)

## [2.0.0-alpha.96] — 2026-08-13

### Mudado
- feat(portões): pre-push roda o CI antes do push, e o cache para de raspar o teto (#243)

## [2.0.0-alpha.95] — 2026-08-13

### Mudado
- test(eval): contrato de mapa vira régua — o que o game.js consome (#240)

## [2.0.0-alpha.94] — 2026-08-13

### Mudado
- fix(release): push atômico de commit+tag — destrava pr-fast e release (#239)

## [2.0.0-alpha.93] — 2026-08-13

### Mudado
- feat(seguranca): verifica hashes do skills-lock.json na instalação (#230)

## [2.0.0-alpha.92] — 2026-08-12

### Mudado
- fix(eval): reconcilia decal-probe com o medirParede da Quebrada (#75) (#231)

## [2.0.0-alpha.91] — 2026-08-12

### Mudado
- fix(piscina): molde lowpoly da arma não some debaixo do GLB (#211)

## [2.0.0-alpha.90] — 2026-08-12

### Mudado
- fix(havan): veículos em escala de fábrica (a moto era a maior do pátio) (#212)

## [2.0.0-alpha.89] — 2026-08-12

### Mudado
- feat(armas): reserva infinita nos modos de arma única (#213)

## [2.0.0-alpha.88] — 2026-08-12

### Mudado
- feat(armas): arma do morto cai no chão, com prazo e teto (#214)

## [2.0.0-alpha.87] — 2026-08-12

### Mudado
- chore(hooks): todo commit diz quem escreveu, e commit grande pede motivo (#207)

## [2.0.0-alpha.86] — 2026-08-12

### Mudado
- docs: atribuição multiagente, identidade pós-CS 1.6 e licença fora do site (#205)

## [2.0.0-alpha.85] — 2026-08-12

### Mudado
- feat(menu): rotação de mapas na sugestão inicial — menos awp_map, mais exposição (#204)

## [2.0.0-alpha.84] — 2026-08-12

### Mudado
- fix(webgl): WeakMap do drawBuffers não derruba mais o loop (issue #171, BUG-50) (#203)

## [2.0.0-alpha.83] — 2026-08-12

### Mudado
- fix(crash): erro externo não vira mais bug do jogo (BUG-51) (#202)

## [2.0.0-alpha.82] — 2026-08-12

### Mudado
- Custo de cena vira portão, e cor de facção passa a ter origem única (#198)

## [2.0.0-alpha.81] — 2026-08-11

### Mudado
- fix(deploy): não anunciar módulos podados (#199)

## [2.0.0-alpha.80] — 2026-08-11

### Mudado
- fix(shader): fit WebGL1 varying budget (#194)

## [2.0.0-alpha.79] — 2026-08-11

### Mudado
- fix(ci): keep production deploy fallback manual (#193)

## [2.0.0-alpha.78] — 2026-08-11

### Mudado
- fix(three): tolerate null shader logs (#192)

## [2.0.0-alpha.77] — 2026-08-11

### Mudado
- fix(webgl): ampliar compatibilidade no Linux (#191)

## [2.0.0-alpha.76] — 2026-08-11

### Mudado
- fix(webgl): add Linux compatibility mode

## [2.0.0-alpha.75] — 2026-08-11

### Mudado
- fix(site): restore live counts for all five factions

## [2.0.0-alpha.74] — 2026-08-11

### Mudado
- feat(botbrain): bots com rede neural que aprende com jogadores

## [2.0.0-alpha.73] — 2026-08-11

### Mudado
- chore(eval): aposenta 5 famílias de evals obsoletos (G2-R6/R7/R8/R14, R7x, P1/P0) (#43)

## [2.0.0-alpha.72] — 2026-08-11

### Mudado
- fix(eval): censo de grafite mede em 3 alturas, não só na do olho (#76)

## [2.0.0-alpha.71] — 2026-08-11

### Mudado
- fix(identity): migrar autenticação de jogador para UID

## [2.0.0-alpha.70] — 2026-08-11

### Mudado
- docs: atualiza estado e audita backlog

## [2.0.0-alpha.69] — 2026-08-11

> Saldo agrupado das versões `alpha.33` a `alpha.69`. A partir daqui o release automático
> abre uma seção para toda versão publicada, e `docs:check` reprova se o topo divergir do jogo.

### Corrigido - abertura e recuperação do jogo
- O botão JOGAR deixou de ficar inerte por erro de inicialização; falhas de abertura agora
  voltam ao menu com mensagem amigável, tentativa de novo e erro preservado no console.
- O watchdog passou a separar navegação do carregamento 3D, reduzindo falsos timeouts em
  desktop e celular sem esconder travamentos reais.
- UUIDs anônimos ganharam compatibilidade com navegadores sem `crypto.randomUUID`, sem cair
  em identificadores previsíveis.

### Adicionado - telemetria e operação
- Eventos anônimos de partida, funil, aquisição e performance passaram a registrar mapa,
  modo, personagem, arma, resultado e as cinco facções; `/api/health` e o monitor de
  produção tornam falhas de ingestão visíveis.
- Erros públicos de API deixaram de expor detalhes internos; o diagnóstico usa UID anônimo,
  enquanto cooldown e mensagens úteis continuam chegando ao jogador.
- O pipeline ganhou triagem de issues e PRs, previews controlados, smoke de produção,
  ratchet de dívidas, mutation testing e commits automáticos assinados via DCO.

### Adicionado - jogo, HUD e ferramentas
- HUD mobile em retrato, menu de armas no modo `?vmlab=1`, tabela comparativa das 26 armas
  e editor unificado de viewmodel/mapa com alinhamento, recuo e teste no jogo.
- O boot passou a carregar animações mescladas e wallpapers WebP, reduzindo centenas de
  requests; bancadas e viewmodels de laboratório ficam fora do pacote publicado.
- Cartazes tiveram proporção validada, grafites órfãos passaram a reprovar o build e as
  gerações antigas de probes de áudio foram aposentadas.

### Mudado - releases e documentação
- Releases automáticos preservam créditos nativos do GitHub, usam tags anotadas e assinam
  o commit do bot com DCO. O Graphify passou a documentar dependências e zonas de conflito.
- Textos públicos deixaram de usar travessão e a documentação gerada acompanha versão,
  arquitetura, colaboradores e contagens do código.

## [2.0.0-alpha.32] — 2026-08-07

> Primeira entrada da linha `alpha` desde a `.4`. As 27 versões do meio existiram como
> commit e não como release; o que está aqui é o saldo delas, agrupado pelo que mudou
> para quem joga, para quem contribui e para quem publica.

### Adicionado — arte urbana medida, não declarada
- **A parede dos 5 mapas passou a ser pintada por medição.** O jeito antigo era lista de
  coordenadas escrita à mão (`for (const z of [-34, -22, -17, …])`), e ela tem três
  doenças que esforço não cura: só cobre a parede de que alguém lembrou, não sabe se a
  peça sobreviveu, e não escala. `public/js/graffiti_pass.js` inverteu a pergunta — em
  vez de declarar ONDE pintar, ele **descobre onde há parede**, por raycast a partir dos
  waypoints (por onde se anda de fato), e pinta em faixas de altura.
- **A régua que faltava**: `npm run eval:grafite` abre cada mapa num navegador de verdade
  e conta quantas placas de parede VISÍVEL têm tinta. Foi escrita ANTES do conserto e
  reproduziu a queixa do dono com um ponto de erro — ele disse "10-15% de arte urbana na
  Quebrada"; ela mediu **12,7%**.

  | mapa | antes | depois |
  |---|---|---|
  | Piscina | 42,1% | **99,1%** |
  | Loja H | — | **95,6%** |
  | Brasília | **0,0%** | **87,1%** |
  | Quebrada | 12,7% | **87,1%** |
  | Ferro Velho | — | **70,5%** |

  A Brasília tinha literalmente **zero** peça na tela: as 16 dos ministérios nasciam no
  vão do pilotis e eram, corretamente, reprovadas uma a uma.
- **A colocação é assada** (`public/js/graffiti_layout.js`, via `npm run grafite`). A
  passada custa ~9 s na Quebrada e o build inteiro do Piscina custa 88 ms; como a
  colocação é função pura de (geometria, semente), ela roda uma vez no navegador — o único
  lugar onde os GLB existem — e o jogo só monta a geometria pronta, em 6 ms.
- **Direção de arte por declaração**: `limpo` (zona sem tinta — a Loja H só é pichada por
  fora) e `evitar` (tipo de superfície — no Ferro Velho, lataria e mato não recebem tinta).
  As duas viajam no layout, então a régua não cobra dívida de parede que ninguém quer
  pintada.
- **Galeria de homenagens póstumas** em mural de tijolo de 5,4 × 2,8 m: Chorão, Champignon,
  Tim Maia, Rita Lee, Raul Seixas, Sabotage, Marcelo Yuka e Chico Science. A vaga de cada
  uma é **medida** — a passada procura a maior parede livre de cada região. Antes elas
  existiam como adesivo de 1 m dentro de um pool de tags, e por isso só apareciam num mapa.
- Os **cartazes da coleção** deixaram de viver em 2 dos 5 mapas. Nenhum ficou órfão.

### Corrigido — o que quebrava calado
- **Decalque morria em silêncio.** Os barracos da Quebrada são `InstancedMesh` criados na
  penúltima linha do build; todo decalque era colado ANTES disso, num mundo onde a fachada
  ainda não existia. `medirParede` não achava malha, devolvia `null`, e a peça sumia sem
  aviso: **96 peças na tela de 334 pedidas**. Em node o GLB nunca carrega, então o probe
  antigo jurava que estava tudo lá.
- **PNG que dá 404 virava retângulo branco.** Só 12 dos 209 decalques estão no git (o resto
  é gitignored por procedência); textura que falha no three não some — fica sem `image` e o
  material desenha branco chapado. Agora a peça some junto com o arquivo.
- **O pacote de decalques publicado estava atrás do jogo**: `decals-pack-v1` tinha 174
  arquivos e o `DECAL_FILES` já pedia 196. Os 22 `folha-*` davam 404 em produção — **513
  das 4.671 peças sumiam, 30% da Quebrada**. Publicado o `decals-pack-v2`.
- **Peça no ar**: toldo, marquise e lona passavam no teste de encaixe (a face de um toldo É
  plana) e liam como pintura pairando. Duas regras novas — a parede tem que descer até o
  chão, e lona não é parede.

### Adicionado — o build reprova antes de publicar coisa quebrada
- **`npm run assert:assets`** entra no `buildCommand` da Vercel. `scripts/fetch-audio.sh`
  terminava com `|| cp manifest.example.json manifest.json`: zip sem manifest = build
  **verde** com o jogo mudo, no áudio sintetizado. E isso nunca aparecia na máquina de quem
  desenvolve, porque os dois fetch scripts começam com early-exit — o caminho de download
  só roda na Vercel. Bug invisível por construção.
- **154 MB de viewmodel Tripo fora do publicado** (`scripts/prune-dist.mjs`). Só carregam
  atrás de `?tripovm=1` e `?tvm=1`. `dist/client` 625 → 488 MB.
- **O atalho do `three` do arnês mudou de casa.** Era plantado UM NÍVEL ACIMA do projeto,
  logo compartilhado por todo checkout debaixo daquele pai — um clone velho em `/tmp`
  deixou o link pendurado e qualquer checkout novo nascia com as ~150 réguas de
  `tools/eval` quebradas, em silêncio (`existsSync` num symlink quebrado devolve `false`,
  e um `try{}catch{}` engolia o `EEXIST`).

### Adicionado — jogo e interface
- **Inglês no jogo**: detecção pelo navegador, seletor em CONFIGURAÇÕES e `?lang=`. As
  páginas estáticas ganharam gêmeas EN, com nav e rodapé por idioma.
- **FEEDBACK no menu** (era MAPA): texto livre, email e consentimento explícito de
  newsletter em coluna própria — só entra na lista quem marcou.
- **Placar** com brasão por time, duas colunas alinhadas e bandeirinha na cor do time.
- **Menu mobile em retrato** consertado. O HUD em pé continua devendo.
- Spawn nasce no chão do mapa (fim do teleporte de 3,40 m na Loja H); colisores na altura
  do corpo em Brasília; bandeira de CTF com o nome do próprio mapa.
- **Áudio** com nomes binários, fechando o BUG-19 (produção servia o pack de julho e todo
  som novo dava 404).

### Adicionado — site, SEO e acessibilidade
- `hreflang` pt-BR + `x-default`; sitemap vira índice paginado acima de 5.000 URLs;
  `og:image` própria por página; uma página por facção em `/faccoes/<id>`; 404 no visual do
  jogo; âncoras e busca por versão no `/changelog`.
- Skip link, foco visível universal e auditoria de contraste.
- Página de armas com as **26 renderizadas do GLB do jogo**, não geradas por IA.

### Mudado — licença e governança
- **AGPL-3.0** aplicada em 8 superfícies, num commit só.
- Produção passa a sair **só por Release** — a Vercel deixou de auto-deployar a `main`.
- Portões de PR, banco fora do repo público (schema e migrations viram acervo privado) e
  ratchet de dívidas conhecidas no portão de invariantes.

### Conhecido — o que continua devendo
- Quebrada em 87,1% contra a meta de 90%. As placas que faltam estão num trecho escalonado
  do muro oeste onde a régua enxerga uma face 0,6 m à frente daquela em que a peça
  encaixou; densidade maior não move o número.
- Brasília recebeu **1** mural de homenagem: é praça aberta sobre pilotis e não tem 8
  paredes de 4 m livres. As vagas são medidas, não declaradas.
- Os murais do Chorão e do Yuka são "no espírito de", não retrato — semelhança de verdade
  precisa de foto de referência local (`tools/gen-image.mjs --ref`).
- `013_feedback.sql` é aplicada **à mão** na base de produção; até lá o form responde
  "indisponível".
- 13 dívidas críticas seguem no `tools/eval/KNOWN-RED.json` e o BOT8/BUG-03 continua aberto.

## [2.0.0-alpha.4] — 2026-08-04
### Mudado — ranking DESLIGADO, medição LIGADA
- **`RANKING_ON = false`** (`src/lib/site.ts`, fonte única). `/ranking` e `/u/*` respondem
  **200 com aviso + `noindex`** — não 404, porque as URLs estão indexadas, são o que a badge
  PNG referencia nas redes, e vão voltar. O link sai do nav e do rodapé;
  `/api/leaderboard` responde `{disabled:true}` e o painel do jogo mostra "desligado" em vez
  de "indisponível" (escolha ≠ defeito, e o jogador lê a diferença). O FAQ e o JSON-LD da home
  pararam de prometer ranking global. **Religar é uma linha.**
- **Telemetria anônima** (`migrations internas 012` + `POST /api/telemetry`): quanto tempo se
  joga e em que mapa/modo, agregado por dia em `map_daily` e `player_daily`. `anonId` é UUID
  no `localStorage` — identifica navegador, não pessoa; nenhum IP é gravado. **Não passa pelo
  rate limit do `submit_match`** (1 partida/90 s por nick), que existe contra ranking forjado
  e aqui só apagaria dado real. Cobre também quem **não digita nick** — que era invisível para
  o banco e é o caminho de menor atrito, logo o mais comum.

### Adicionado — chão multinível no motor
- `groundHeightAt(x, z)` virou `groundHeightAt(x, z, yRef)`: o mapa responde *"qual superfície
  é o chão de quem está nesse Y"* em vez de "a de cima, sempre". **Dá pra andar debaixo da
  escada da Havan** — antes o vão era visível e o motor tratava a escada como o chão dali,
  então a boca da escada era uma parede invisível. Pé-direito é parte da regra
  (`ALTURA_LIVRE = 1,95 m`): só abre embaixo onde cabe gente em pé. Sem `yRef` devolve o topo,
  o comportamento antigo — nenhuma régua mudou. **Falta a metade dos bots:** o A* é grafo de
  `(x,z)` sem camada, então o bot ainda não planeja rota por baixo.
- **Cartazes no Piscinão** (12, das 4 paredes): os 18 arquivos de `public/posters/` já eram
  carregados e só a Brasília usava. O Piscinão era azulejo branco de parede a parede, sem
  referência de direção.

### Mudado — jogo
- **Round de single player não tem mais teto de abates.** Fechava no alvo (4v4 → 12 abates),
  cortando a rodada quando ela estava boa, sem o jogador ter escolhido isso em lugar nenhum
  do menu. Agora termina por relógio ou eliminação, como no CS. `?pace=1` devolve o alvo.
  O CTF não muda: lá o alvo é de bandeiras, é a mecânica do modo.
- **Tiro 4,2 dB mais baixo** (`GUN_VOL = 0.62`, `?gunvol=N`). Baixar o master abafaria voz,
  passo e rádio junto — e passo é informação de jogo. O desequilíbrio era da arma contra o
  resto, então o fator mexe só no tiro e preserva a hierarquia de calibre.
- **Fala in-game tem teto de 8 s.** O "coe rapaziada" dos funkeiros tinha **28 s** (o segundo
  mais longo da facção tem 5,8 s) e ficava na frente do tiroteio inteiro. Cortado com
  fade-out e renomeado. `npm run audio` agora reporta toda fala de `ingame/` acima do teto —
  sobraram 3 (bolsonaro 13,0 s, petista 12,5 s e 8,2 s).

### Corrigido — áudio: a pasta virou a verdade
- **O manifest de áudio agora é GERADO do disco** (`tools/gen-audio-manifest.mjs`,
  `npm run audio`, com `npm run audio:check` no portão). Era escrito à mão, então toda leva de
  som novo dependia de alguém lembrar — e não lembrava. **Os funkeiros ganharam a própria voz
  (40 ingame + 20 round; usavam a dos Tribos)**, petista foi de 11+7 para 17+14, bolsonaro de
  13+6 para 16+14. Os 289 caminhos foram conferidos contra o disco: 0 quebrados, e os nomes com
  espaço e parêntese saem codificados (sem isso o som simplesmente não toca).
- **Ordem do portão** (`npm run check`): `eval:vm` roda **antes** de `eval:invariants`. Na
  ordem antiga o `&&` cortava no primeiro vermelho e o JSON do viewmodel nunca era regenerado —
  o portão media o dia anterior e inventava vermelha.
- **Removidos três PDFs pessoais de dentro de `public/`** — tudo ali é servido pelo site.
  Não chegaram a ficar expostos em produção; um `vercel deploy` local os publicaria.

### Corrigido
- **O build estava quebrado e ninguém sabia**, porque `npm run build` nunca havia rodado nesta
  árvore. `changelog.astro` lia o `CHANGELOG.md` por caminho relativo a `import.meta.url`, que
  no bundle aponta para `dist/server/` — ENOENT derrubando o prerender inteiro. Agora usa
  `?raw` (Vite embute no bundle). No mesmo build nasceu **`public/wasm/resvg.wasm`**, que
  faltava para o og:image das páginas de jogador.
- **`/mapa`:** o nome da cidade era etiqueta permanente — 40+ rótulos amarelos empilhados
  sobre o Sudeste, escondendo os próprios círculos que rotulavam. Agora a cidade aparece no
  **clique**, e no hover.
- **Arte nova não aparecia.** `wall-9.png` e `loading-6.png` estavam no disco e eram
  ignorados em silêncio: as listas de `main.js` paravam em `wall-8` e `loading-5`. Os dois
  entraram; o conserto de fundo (manifesto gerado em build) está em KNOWN-BUGS.md BUG-08.

### Mudado
- **Versionamento** passa a distinguir alpha/beta/release (bloco acima).
- **`references/` e `issues/` saíram do git** — a construção é local. Os 2,5 GB de captura de
  rodada e as telas-alvo da UI ficam na máquina; o que sobrevive ao clone são os números
  medidos, em `tools/eval/ref_ui.json`.

### Documentação
- **`KNOWN-BUGS.md`** (novo): 17 defeitos com `arquivo:linha`, causa raiz e reprodução.
- `HANDOFF.md` e `PROMPT.md` atualizados: estado do portão, ordem de trabalho e a armadilha
  do `npm run check`, que media o viewmodel com JSON de ontem e inventava vermelha.

## [3.3.0] — 2026-08-02 *(publicada como `2.0.0-alpha.3`)*
### Adicionado — Funkeiros: 5ª facção jogável (9 personagens GLB da Mint)
- **Roster** (`characters.js`, `team:'F'` + `tribe:'funkeiros'`): Mandrake, Raul da
  Franja, Oakley, Cria RJ, Chave SP, Funk Raiz, Trap Funk, Fluxo, Ostentação.
  Selecionável no menu (card novo `btn-team-f`, dourado) em qualquer lado — joga no
  lado P, como Tribos e Palhaços. Rim dourado (`TEAM_RIM.F`), cor/nome/tag no HUD e
  CTF (`game.js`), armas próprias no `CHAR_WEAPON`.
- **Mandrake é o antigo "funkeiro" dos Tribos** — o visual (boné + Juliet vermelho)
  sempre foi de mandrake; só estava na facção errada. `funkeiro.glb`/`anims/funkeiro/`
  viraram `mandrake.glb`/`anims/mandrake/` (originais mantidos no disco, fora do registry).
- **Pagodeiro** (GLB novo, roupa branca + platinado) cobre o slot dele nos Tribos Urbanas.
- **Pipeline**: Raul/Oakley/Cria RJ/Chave regerados na Mint com as referências de
  `references/funkeiros/` (o Raul agora tem franja açucarada + cordões; o Oakley tem o
  chapéu Medusa; o Cria RJ tem o cabelo zebrado platinado); Pagodeiro é novo; os 4
  restantes vieram do pack original. Nenhum GLB da Mint veio riggado — todos passaram
  por `tools/rig-from-donor.mjs` (esqueleto do mst + auto-skin), `optimize-tribos.mjs`
  e `retarget-glb.mjs` (11 clipes por personagem em `models/anims/<id>/`, validados com
  `check-clip.mjs`: 0 ossos faltantes, durações e root motion idênticos ao pack mixamo).
- Voz/round da facção: `manifest.json` local ganha chave `F` espelhando a dos Tribos
  (pack próprio de funk fica como follow-up; sem a chave o fallback já é gracioso).
- Bump de cache: `VERSION` 3.3.0 + import map do `index.astro`.

## [3.2.0] — 2026-08-02 *(publicada como `2.0.0-alpha.2`)*
### Mudado — viewmodel: o look final é CS 1.6 (escolha do dono)
- Medido frame a frame no vídeo de referência (aim_ak-colt): arma BAIXA (boca do cano a
  ~0,66H, abaixo da mira), flanco aparecendo, coronha inteira no canto inferior-direito.
  `VM_FOV_DEFAULT` 92→80, `recuoZ` 0,75→1,10, `nearX` 1,35→1,05, `tanH` 0,80→0,67,
  `VM_OFF` y −0,10→−0,23. O look Quake 4 (3.1.0) fica reproduzível por querystring —
  ver o bloco de comentário no `VM_FRAME` (vmattach.js). Cano continua exatamente
  paralelo à mira (`rotation.set(0,0,roll)`, checado em runtime nas 6 classes).

### Adicionado — Ferro Velho: cânion BECO OESTE (imagem-conceito do dono)
- O flanco oeste vira um cânion reto de z=+32 a z=-24: muros DUPLOS de carros (~5,6 m)
  contínuos, duas saídas laterais de 5,6 m pro miolo, placa suspensa "BECO OESTE" na
  boca sul e a bandeira W (agora 'BECO OESTE') no miolo do beco. Kill-switch `?beco=0`
  restaura o layout antigo. A*/waypoints e LOS spawn↔spawn verificados
  (`tools/eval/fv-verify.mjs`: 4 bandeiras alcançáveis dos 2 spawns nos dois modos).
- **Clima de fim de tarde**: sol mais baixo e quente (sombras longas), silhueta de
  FAVELA nova nos cartões de skyline do fundo norte, chão de barro úmido com poças de
  chuva espelhadas no vão do beco, e o capim alto sai do vão (barro limpo como na
  referência — o verde×ferrugem do BAR segue no resto do pátio).
- Harness novo: `public/fveval.html` + `tools/eval/fv-capture.mjs` (7 ângulos do mapa)
  e `tools/eval/fv-verify.mjs` (A*/LOS).

## [3.1.0] — 2026-08-01 *(publicada como `2.0.0-alpha.1`)*
### Corrigido — enquadramento do viewmodel no nível Quake 4 / UT / Halo
- **Look refeito** (refs do dono: Quake 4, Halo Infinite, UT): lente do VM 64°→92°,
  arma mais perto do olho (`recuoZ` 1,35→0,75), coronha CORTADA pela borda direita
  (`nearX` 0,80→1,35), `tanH` 0,46→0,80 (compensa a lente aberta puxando a arma pro
  centro), cano 12,5°→16,7° abaixo do eixo, e arma 10 cm mais alta (`VM_OFF` y
  −0,20→−0,10) pra coronha cruzar a borda direita dentro do quadro em vez de sumir
  por baixo. Cano continua exatamente paralelo à mira (`rotation.set(0,0,roll)`).
- **Bug do re-frame**: o `_vmFrame` rodava uma única vez ANTES da `vmCamera` existir —
  a trava de borda calculava com o fallback de 62° pra sempre e a lente real (e o
  `?vmfov=`) nunca afetavam o enquadramento. Agora há re-frame forçado após a criação
  da `vmCamera`.
- **Código morto removido**: `?vmlook=quake|halo|cs` (tunava o pipeline Tripo, inativo
  desde que o padrão é MINT_VM — os presets renderizavam idênticos).
- **5 knobs ao vivo** por querystring: `?vmfov= ?vmzmul= ?vmnearx= ?vmtanh= ?vmtanb=`
  (mais o `?vmoff=` que já existia).
- Harness novo: `tools/eval/vm-quake-capture.mjs` (máscara exata do VM via on/off da
  vmScene), `tools/eval/vm_quake_measure.py` (6 métricas do look) e
  `tools/eval/vm-quake-scen.mjs` (regressão: flash na boca, ADS, reload, look-down).

## [1.15.0] — 2026-07-20 (branch feat/evio-feel)
### Adicionado — feel ev.io
- **Movimento crocante**: aceleração 55/12 (era 42/8), atrito contínuo com parada
  suave, air control real no ar, landing dip proporcional ao impacto, bob de
  câmera escalonado pela velocidade
- **Recoil com retorno**: acumula por tiro e recupera suave (padrão por arma),
  em vez da subida permanente
- **Sway do viewmodel**: a arma fica defasada ao mouse (ev.io feel)
- **Indicador direcional de dano**: cunha vermelha na tela apontando a origem do
  tiro (ângulo relativo à câmera)
- **Contraste ACES**: hemi 1.05→0.82, sol 1.5→1.65 (mais estrutura sem perder o
  claro de Brasília)

### Infra
- `STUDIO_CONSTITUTION.md` (10 princípios) e `QUALITY.md` (barra ev.io mensurável)
- `studio benchmark` (FPS/p95/draw calls/tris numa partida real) e `studio validate`

## [1.14.0] — 2026-07-20
### Corrigido
- **Bots empunham de verdade**: idle agora é pose de empunhadura (frame de passagem do
  clipe de andar, pés juntos no chão — sem perna levantada "flutuando") e a cabeça
  sobe 2° em runtime (adeus "cabeça baixa")
- **Bots exploram o mapa todo**: direção de roam derivada do layout dos spawns (a troca
  P<->B tinha invertido o lado), 40% dos alvos são distantes, repick ao CHEGAR ao nó
  (não por tempo), e lane preferida por bot — o time se espalha
- **Strafe deslizante em combate**: juke lateral menor + bot fica em idle quando está
  quase parado (sem "andar no lugar")
- **Estátua A Justiça**: grafite "PERDEU, MANÉ" agora NO PEITO da estátua (medido por
  raycast), não flutuando ao lado
- **Palácio do Planalto**: assentado NO TOPO do plinto (antes afundava no chão)
- **Posters**: nas pontas cinzas dos Ministérios, grandes (DOLLYNHO, ET, Chupacabra,
  Saci e os demais memes da pasta public/posters)
- **Armas só no respawn**: fileira alinhada de 8 por spawn (snipers primeiro), sem
  scatter pelo mapa; bots não devoram a rack
- **Viewmodel 1ª pessoa**: mãos com dedos de 2 segmentos e palma mais fina
- **Cache de assets**: GLBs carregam com ?v=VERSION (sem versão velha presa no cache)

### Adicionado
- **Ônibus do DF gerado no Mint** (amarelinho de verdade, não caixas) atravessado no
  CENTRO da Esplanada como cover
- **Barraquinha de bebida gerada no Mint**: quiosque + guarda-sol grande + cadeiras de
  plástico + engradados (mini-bar de rua)
- **Zastava M92 e HK G3 gerados no Mint**: a M92 (AK curto iugoslavo, madeira +
  receiver preto) substitui a Type 56, e a G3 (battle rifle alemã, coronha oliva)
  entra no arsenal — ambas com sons próprios (takes PD do AK-47 e do 50 Cal)
- **Caixas Correios/SEDEX** no lugar das caixas "FRÁGIL TRETA" (que eram do outro mapa)

## [1.13.0] — 2026-07-20
### Corrigido
- **Bots "de skate/moonwalk"**: cadência das pernas agora segue a velocidade real do
  chão por clipe (refs medidos no harness: walk 0.79, run 1.92, crouch 0.83 m/s),
  escolha walk↔run por velocidade com histerese, e backpedal toca o clipe de andar
  revertido (recuar não é mais moonwalk)
- **Congresso invertido**: torres gêmeas agora atrás, cúpula do Senado à esquerda e
  tigela da Câmara à direita (vista cartão-postal a partir da Esplanada)
- **Palácio do Planalto "flutuando"**: plinto de pedra medido do footprint real do
  prédio, aterrando os pilotis
- **Vidros da Catedral**: vitral azul entre as costelas (perfil medido do modelo),
  em vez do cilindro atravessado na coroa
- **Posters flutuando**: colados na face real de cada Ministério (medida por bbox)
- **Mãos em 1ª pessoa**: mão do gatilho no cabo real da arma e mão de apoio no
  guarda-mão (derivado de len/gripZ de cada arma) — pistola não fica mais sem mão
- **Pop-in no seletor**: não aparece mais o personagem em blocos antes do GLB —
  o modelo anterior fica na tela até o novo chegar

### Adicionado
- **Ônibus quebrado do DF** ("amarelinho", pneu murcho, caído pro lado) como cover
  grande no meio da Esplanada + **barricada improvisada** (bloco, chapa, tábuas)
- **Estátua A Justiça v2**: bandeira do Brasil como faixa no peito (mesh) +
  grafite "PERDEU, MANÉ" pequeno no peito, como na referência do 8/1
- **Sons reais de armas em produção**: pack CC0/domínio público (gravações reais,
  qubodup/Freesound) commitado — AWP/snipers, AK, M16, LMG, escopeta, pistola, SMG
  e reload tocam de verdade no ar; o manifest local com sons do CS segue tendo
  prioridade em dev
- **Harness de eval** (tools/eval + public/*eval.html): captura headless de mapa,
  personagem, viewmodel e gameplay com telemetria — verificação local antes de mostrar

## [1.12.3] — 2026-07-18
### Corrigido
- **Modo de armas também filtra o mapa**: em SÓ PISTOLAS/FACA/AWP os pickups
  incompatíveis somem do chão (não só da mão do jogador)
- Home: RANKING/COMO JOGAR/CONFIG viraram botões laterais menores; dropdown
  de armas agora é custom com **ícones SVG das armas** (mesmo CSS do dropdown
  de mapa)

## [1.12.2] — 2026-07-18
### Mudado
- **Nick obrigatório** pra jogar: sem nome, o JOGAR não deixa passar (campo
  treme, fica vermelho e pede "DIGITE UM NICK PRIMEIRO!")

## [1.12.1] — 2026-07-18
### Adicionado
- **Modo de armas** (dropdown ao lado do mapa): TODAS / SÓ PISTOLAS (pistola +
  deagle nos pickups) / SÓ FACA (sem armas nem pickups) / SÓ AWP (sem pistola,
  pickups só de AWP) — afeta loadout inicial e quais pickups o jogador pode
  pegar com E (bots seguem no padrão AWP)

## [1.12.0] — 2026-07-18
### Adicionado
- **Arsenal completo**: AK-47, M4A1, MP5, Escopeta M3 e Deagle jogáveis
  (auto-fire com bloom, 8 pellets na M3, viewmodels próprios, sons reais da
  pasta `audio/weapons/`) além da AWP, pistola e faca
- **Captura com E** + hint `[E] PEGAR <ARMA>` (bots continuam pegando andando)
- **M mostra a seleção de personagem** do novo time antes de trocar de lado
- **Dropdown de mapas** na home (depois dos campos, antes do JOGAR)
- Mais obstáculos no Piscinão (pilares, bancos, boxes de chuveiro, lixeiras)
  e no Sítio (fardos de feno, trator, poço, bebedouro, cercas extras)

## [1.11.0] — 2026-07-18
### Adicionado
- **Mapa fy_pool_day "Piscinão da Treta"** (cherry-pick do PR #3 de
  [@daltonfontes](https://github.com/daltonfontes) 🎉) + registro de mapas
  (`js/maps.js`) e seletor MAPA no menu — estilo "full weapons" com 22
  pickups de arma no chão
- **Weapon drop**: morto larga a arma no chão (CS clássico); passar por cima
  pega + munição cheia — drops somem ao ser pegos, pickups do mapa respawnam
- **Dificuldade 1.5x**: precisão ×1.5 (c/ bônus de posição parada), reação e
  cadência dos bots 1.5× mais rápidas, dano 42→63; jogador com troca de arma
  e scope mais responsivos
- **Bots mais espertos**: caçam quem atirou neles mesmo sem ver o atacante
- **+2 personagens**: Jovem Místico (P — faixa, cristal, aura calibrada) e
  Coach Quântico (B — blazer, headset, "DESPROGRAME-SE"); roster 5×5, 4×4
  mantido em campo

## [1.10.0] — 2026-07-18
### Adicionado
- **Anti-trainer (servidor)**: consistência física no RPC — kills ≤ 45/round
  e ≥ 80s/round (impossível pra trainer de speed/autoshot), rate limit por IP
  via `submit_log` (60s + 200/dia), flags automáticas (3 = sai do ranking)
  — migration 009
- **Paginação no /ranking** (25/página) e view com limite de 500 jogadores
- **Ícones de marca reais** (simple-icons CC0) nos chips sociais
- URLs sociais auto-normalizadas (conserta links quebrados de dados antigos)
- `SECURITY.md`: modelo de segurança honesto + SQL de moderação

## [1.9.0] — 2026-07-18
### Adicionado
- **Tema terminal Y2K/Half-Life** no site: âmbar em fundo escuro, monospace,
  cantos retos, scanlines, tabelas e cards terminal (Layout + páginas)
- **Multi-redes sociais** (até 3) no card de perfil do menu, com extração
  automática de handle ao colar URL e validação — `players.socials` (jsonb,
  migration 008)
- **Chips de rede** (ícones X/GH/IG/in/TT/YT) no ranking e perfil em vez da URL crua
- **Personagem como fallback de ícone** no ranking e no perfil (charSvg
  compartilhado via `src/lib/charsvg.ts`)
- **Botões no HUD durante o jogo**: ⚙ configurações e 🔊/🔇 liga-desliga falas
  (só memes — vitória/UT/arma continuam), também nas configurações

## [1.8.1] — 2026-07-18
### Mudado
- Botões de login social removidos do menu (OAuth fica pra era multiplayer)
- Upload de foto agora fica **na tela principal**, visível quando a rede não é
  X/GitHub (esses puxam avatar sozinhos)
- Logo menor e mais pra cima no menu

## [1.8.0] — 2026-07-18
### Adicionado
- **Seletor de rede social** no menu (X, GitHub, Instagram, LinkedIn, TikTok,
  YouTube, site próprio) + handle — sem precisar de login; campo de usuário
  fica desabilitado até escolher a rede
- **Avatar do GitHub automático** (oficial, `github.com/handle.png`) além do X
- **Upload de foto sem login** (`POST /api/avatar`, validado por nick+token,
  resize 128×128 no servidor) — cobre Instagram/LinkedIn/TikTok, que não têm
  fetch público de avatar

### Mudado
- OAuth social passa a ser opcional/dormant (volta na era multiplayer)

## [1.7.6] — 2026-07-18
### Adicionado
- Mapa: nome da cidade sempre visível (tooltip amarelo permanente) e popup com
  **lista de jogadores + total por cidade** (via presence, cidades com 0
  partidas mas com jogadores também aparecem)

## [1.7.5] — 2026-07-18
### Corrigido
- Proporções do card de badge: cabeçalho compacto, grade 3×3 com margem real,
  skyline removida (colidia com a última linha de stats)

## [1.7.4] — 2026-07-18
### Adicionado
- **Mortes (deaths)** no ranking, perfil, painel local e badge (agora em grade
  3×3 com MORTES entre KILLS e HEADSHOTS)

## [1.7.3] — 2026-07-18
### Mudado
- Vitórias zeradas aparecem como "—" (não parece mais bug) no ranking, perfil,
  badge e painel local

## [1.7.2] — 2026-07-18
### Corrigido
- Submits rejeitados pelo rate limit de 90s (abandono + partida em seguida)
  agora entram numa fila local e são reenviados automaticamente — nenhuma
  partida se perde mais por janela de rate limit

## [1.7.1] — 2026-07-18
### Adicionado
- Placar geral no `/mapa`: total de jogadores, partidas e kills + barra de
  proporção % petistas × % bolsonaristas

## [1.7.0] — 2026-07-18
### Adicionado
- **Personagem como avatar**: sem foto/X, a badge usa o personagem escolhido no
  jogo (SVG por id) e mostra "joga de &lt;personagem&gt;" — `last_character`
  gravado por partida (rode o schema.sql pra criar a coluna)
- **NEUTRO**: empate de lados (1P × 1B) vira terceiro estado no card
- **Site imersivo**: páginas do Astro agora têm o fundo 3D do jogo (o mundo
  real orbitando, mesmo código do menu) com overlay escuro
- **Botões de canto** no menu do jogo: RANKING ↗ MAPA ↗ SOBRE ↗

### Mudado
- Redesign do card de badge: stat-cards arredondados, glow na cor do lado,
  skyline de Brasília no rodapé

## [1.6.3] — 2026-07-18
### Mudado
- "Abates" vira "kills" em toda a UI (placar, ranking, perfil, badge, docs)

## [1.6.2] — 2026-07-18
### Corrigido
- Heartbeat/submit usam o nick **registrado** na sessão (editar o nick no menu
  não quebra mais o token) e param de tentar após 403

## [1.6.1] — 2026-07-17
### Corrigido
- `submit-match` auto-recuperável: se a função do banco está desatualizada
  (sem p_seconds/p_rounds/p_team), grava o núcleo dos stats mesmo assim e
  responde com aviso pra rodar o schema.sql atual

## [1.6.0] — 2026-07-17
### Adicionado
- **Stats de abandono**: quem sai da partida no meio (botão sair ou fechar a
  aba) também entra no ranking — submit parcial ao sair + sendBeacon no unload
- **Mapa com histórico total** por cidade (partidas + rounds), não só 7 dias
- **Social link clicável** no perfil e no /ranking
- **Avatar automático do X/Twitter** via unavatar.io quando o social link é um
  handle do X (badge, perfil e ranking; fallback: inicial)
- city_daily agora soma rounds também (migration 005)

## [1.5.3] — 2026-07-17
### Corrigido
- Badge sem texto em produção: o binding nativo Linux do `resvg-js` ignorava
  fontes em buffer — render migrado pra `@resvg/resvg-wasm` (binário único
  embutido, determinístico em qualquer serverless)

## [1.5.2] — 2026-07-17
### Corrigido
- Links de perfil com `undefined` quando a view não tem `id` (fallback /u/nick)

## [1.5.1] — 2026-07-17
### Corrigido
- Falhas de envio pro ranking (função desatualizada, rate limit, token) eram
  engolidas em silêncio — agora aparecem na tela de fim de partida e no console

## [1.5.0] — 2026-07-17
### Mudado
- URL de perfil agora é canônica `/u/<id>/<nick>` (estável mesmo com troca de
  nick e pronta pra nicks duplicados no futuro); `/u/<nick>` redireciona (301)
- Badge aceita id ou nick (`/api/badge/<id>.png`)
- Leaderboard expõe `players.id` (migration 004)

## [1.4.3] — 2026-07-17
### Corrigido
- Tempo "0min" em partidas anteriores ao tracking: agora estima pelos rounds
  (`~Xh Ymin` = estimado, ~99s/round) na badge, perfil, /ranking e painel local

## [1.4.2] — 2026-07-17
### Corrigido
- Página `/mapa` quebrada: o Layout não tinha `<slot name="head"/>` — o CSS do
  Leaflet (e o JSON-LD da landing e as meta do perfil) eram descartados
- Tiles do mapa agora escuros (CARTO dark), combinando com o tema do site

## [1.4.1] — 2026-07-17
### Adicionado
- Avatar do usuário na badge compartilhável (círculo com anel na cor do time;
  fallback: inicial do nick) e no topo do perfil `/u/[nick]`

## [1.4.0] — 2026-07-17
### Adicionado
- **Tempo de jogo** por usuário (min/horas/dias): contado por partida no client
  e somado no ranking — aparece na badge compartilhável, no perfil `/u/[nick]`,
  na página `/ranking` e no painel local do jogo
- Badge agora tem 8 stats (entra TEMPO e ROUNDS)

## [1.3.1] — 2026-07-17
### Corrigido
- Badge de perfil renderizava texto como caixas (□□□): serverless da Vercel
  não tem fontes de sistema — render agora via `@resvg/resvg-js` com
  DejaVu Sans Bold embutida no bundle
- og:image do perfil era sobrescrita pela padrão do Layout (crawler pegava a
  imagem errada) — `ogImage` agora é prop do Layout e `/u/[nick]` usa a badge

## [1.3.0] — 2026-07-17
Fase 3: login social, avatar e mapa ao vivo.

### Adicionado
- Login com **Google, GitHub, LinkedIn e X** (auth própria) — botões no menu
  principal; avatar do provedor entra no perfil automaticamente
- **Upload de foto de perfil** (tela RANKING): redimensiona pra 128×128 no
  client e sobe pro bucket `avatars` com policy por dono
- **Mapa da treta** (`/mapa`): jogadores online agora + partidas por cidade
  nos últimos 7 dias, via Leaflet/OpenStreetMap. Geo aproximado (cidade) dos
  headers da Vercel — IP nunca é armazenado
- Heartbeat de presença a cada 30s durante o jogo (`/api/heartbeat`)
- `city_daily`: histórico agregado de partidas por cidade
- `GET /api/config`: entrega URL + anon key (públicas) pro client ligar OAuth

## [1.2.0] — 2026-07-17
Ranking global (Fase 2) — código completo, ativa ao configurar o servidor de ranking.

### Adicionado
- Stats novos por jogador: rounds jogados e partidas como Petista × Bolsonarista
- Página pública de perfil `/u/[nick]` com badge de stats compartilhável
  (PNG dinâmica em `/api/badge/[nick].png`, aparece no card ao postar o link)
- Página `/ranking` com o leaderboard global (top 100)
- Tela RANKING do jogo mostra o top 10 global sem sair do canvas, com links
  pro ranking completo e pro perfil
- Registro automático de nick no primeiro jogo (token UUID no navegador) e
  envio automático de stats ao fim de cada partida via `/api/*` (SSR, sem
  chave no client)

## [1.1.0] — 2026-07-17
O jogo agora é a rota principal (`/`), menu redesenhado e troca de time livre.

### Adicionado
- Troca de time a qualquer momento com **M** (respawn no outro lado + um bot
  deserta pro time oposto, mantendo o 4×4)
- Landing Astro com FAQ e SEO movida para `/sobre`

### Mudado
- Jogo movido de `/game/` para `/` — URL principal é o jogo
- Menu com botões menores em grid (nick e link social lado a lado)

## [1.0.2] — 2026-07-17
### Corrigido
- Pointer lock: sem ele, tiros/mouse/ESC eram ignorados em silêncio. Agora o
  jogo mostra "clique para ativar a mira" e qualquer clique re-tenta o lock.

## [1.0.1] — 2026-07-17
### Corrigido
- Arma travava inclinada ao trocar de arma no meio da recarga (reload dip
  resetado + decaimento de segurança).

## [1.0.0] — 2026-07-17
Primeira release pública.

### Incluído
- Jogo completo: FPS estilo CS 1.6 com AWP/pistola/faca, bots com IA, rounds,
  placar, radar, rádio de voz, multikills estilo UT e headshots
- 8 personagens satíricos originais (Petistas × Bolsonaristas), mapa
  awp_map brasileiro procedural, 100% vanilla JS + Three.js, zero build
- Site Astro (landing, personagens, como-jogar) + API routes SSR pro ranking
- Ranking local com nick + link social; schema do backend pronto (Fase 2)
- SEO/AEO: JSON-LD, sitemap, robots, llms.txt, og-image
