# Emotes brasileiros: repertório, método e limites

Régua: `tools/eval/emotes-check.mjs` (`npm run eval:emotes`) · Código: `public/js/emotes.js`

## O problema que decidiu a arquitetura

Medido em 22/10 nos arquivos do disco:

| Medida | Valor | Consequência |
|---|---|---|
| Personagens com o rig de 18 ossos | **63/63** | o esqueleto é comum |
| Divergência da POSE DE DESCANSO entre eles | até **80°** (`LeftArm`), 170° (`Hips`) | clipe assado **não** serve: rotação local significa coisas diferentes em cada corpo |
| Personagens que já rodam só com o pack compartilhado | 8 (`saci`, `lobisomem`, `cuca`, `curupira`, `boto`, `zumbi`, `lampiao`, `mariabonita`) | o jogo já toca animação alheia por nome de osso |

Por isso o emote **não é clipe**: é overlay em espaço de mundo, o mesmo mecanismo da
recarga e da inclinação (`docs/ANIM-3P.md`). A coreografia diz "gira o fêmur 0,6 rad em
torno do eixo DIREITA do corpo" e o controlador converte para o quadro do pai de cada
osso. Custo de download: **zero byte**.

A régua `EM3` existe exatamente para impedir que alguém "simplifique" isso de volta para
eixo local: o mutante `eixo-local` mantém a amplitude e muda a DIREÇÃO, e é a direção que
a cláusula cobra (cosseno entre corpos ≥ 0,8; medido 0,99).

## Repertório (o que entrou e de onde veio)

| Emote | O que o corpo faz | Origem |
|---|---|---|
| **Passinho** | passo-base *sabará*: um pé sustenta, o outro alterna frente/trás, rápido; braço só acompanha | Funk carioca, anos 2000, bailes do Jacarezinho; Patrimônio Cultural Imaterial do Rio (2024) |
| **Samba no pé** | joelhos alternando em contratempo, quadril solto, ombro contrariando | Samba |
| **Ginga** | base da capoeira: mão sobe à frente do rosto do lado da perna que recua, troca no toque | Capoeira; a ginga nasce como movimento que disfarça ataque e defesa |
| **Frevo** | agacha e levanta, perna alta alternada, braço da sombrinha acima da cabeça | Frevo do Recife; Patrimônio Cultural Imaterial da Humanidade (UNESCO, 2012), registrado pelo IPHAN em 2007 |
| **Dois pra lá** | base lateral do xote: dois apoios para um lado, dois para o outro | Forró; "coladinho" é a dois — sozinho se dança a base |
| **Quadradinho** | o rebolado circular virado quadrado, quatro arestas com virada seca | Funk |
| **Sarrada no ar** | impulso de quadril à frente com as mãos descendo à pelve | Funk |
| **Salve** | braço sobe à frente do peito, cabeça acena | Saudação de rua |

### Fontes consultadas

- Passinho — [Companhia das Letras](https://www.companhiadasletras.com.br/blogDaLetrinhas/Post/6097/a-historia-e-a-cena-do-passinho) · [Red Bull](https://www.redbull.com/br-pt/danca-dancas-de-rua-passinho) (passo *sabará*) · [Wikifavelas](https://wikifavelas.com.br/index.php/Passinho) · [Agência Brasil, patrimônio 2024](https://agenciabrasil.ebc.com.br/geral/noticia/2024-03/passinho-e-reconhecido-como-patrimonio-cultural-imaterial-do-rio)
- Quadradinho e sarrada — [TCC/UFSC sobre dança funk](https://repositorio.ufsc.br/bitstream/handle/123456789/249048/TCC_Bruna_Fernandes.pdf)
- Frevo — [IPHAN](http://portal.iphan.gov.br/noticias/detalhes/767/frevo-pernambucano-e-patrimonio-da-humanidade) · [UNESCO/ONU Brasil](https://brasil.un.org/pt-br/61217-frevo-ganha-t%C3%ADtulo-de-patrim%C3%B4nio-cultural-imaterial-da-humanidade-da-unesco)
- Forró "dois pra lá, dois pra cá" — [Diário de Pernambuco](https://impresso.diariodepernambuco.com.br/noticia/cadernos/viver/2015/05/dois-pra-la-dois-pra-ca.html) · [Forró New York](https://www.forronewyork.com/post/pt-dois-pra-la-dois-pra-ca-forro)
- Ginga — [material didático de capoeira](http://guerreirosdoabaete.blogspot.com/p/golpes-na-capoeira.html) · [Cultura afro-brasileira](https://brazilartes.com/cultura-afro-brasileira-a-historia-por-tras-do-samba-capoeira-e-candomble/)

## Autoria: por que nada aqui imita emote de outro jogo

Em *Hanagami v. Epic Games* (9º Circuito, 2023; acordo em fevereiro de 2024) a corte
decidiu que coreografia é obra protegida como um todo — "não é só uma sequência de poses,
assim como música não é só uma sequência de notas" — e deixou a ação seguir sobre **dois
segundos** de dança usados num emote. Para nós a leitura prática é direta:

- **passo base de manifestação popular** (frevo, samba, ginga, xote, passinho) não tem
  autor único: é repertório coletivo, e dois deles são patrimônio registrado;
- **coreografia assinada** (clipe de videoclipe, rotina de TikTok com autor, emote de
  outro jogo) **não entra** — nem "inspirada em".

Toda coreografia deste arquivo foi escrita em código a partir da descrição textual das
fontes acima.

## Limites declarados (o que NÃO está entregue)

1. **Dança local, não sincronizada.** Na partida a dança roda pra quem apertou (tecla `T`,
   roda de 8 passos, câmera afasta sozinha; régua `eval:emotepartida`). Os outros jogadores
   NÃO veem: o pacote de input do servidor é `{ax, az, crouch, shift, jump, yaw, pitch,
   shoot, weapon}` e não tem campo de emote. Para sincronizar falta **um campo** no
   protocolo do servidor autoritativo — mudança de backend, que é do dono.
2. **Sem polegar.** O rig não tem osso de dedo (só `Curl_L`/`Curl_R` de fechamento de
   mão). Não existe joinha possível: o gesto entregue chama **Salve** porque é isso que o
   corpo faz. Preferimos o nome honesto ao nome bonito.
3. **Procedural, não mocap.** É coreografia escrita à mão, boa o bastante para ler o
   passo e **zero** byte de asset. Mocap de verdade (Mixamo retargetado por
   `tools/retarget-mixamo.mjs`, ou captura autoral) é o passo seguinte e melhora a
   qualidade sem mudar nada do que está aqui: o controlador aceita os dois.
4. **Classificação indicativa.** A `sarrada no ar` é gesto de quadril. Está estilizada,
   mas é decisão do dono mantê-la no catálogo público, restringi-la ou removê-la — lojas
   de aplicativo olham isso. Basta tirar a linha do catálogo em `public/js/emotes.js`.

## Como se dança

| Onde | Como |
|---|---|
| Lobby (hub) | botão **DANÇAR** embaixo do personagem; abre os 8 passos. Só aparece quando há boneco 3D — em preview estático (hardware fraco/renderização por software) não há o que dançar e o botão some |
| Partida | tecla **T** abre a roda; **1-8** ou clique escolhe; **T**/**ESC** fecha; a câmera sai da 1ª pessoa e afasta 1,5 m pra você se ver |
| Sair | andar, atirar, trocar de arma, levar dano ou morrer derruba o passo na hora |

## Porta fechada em produção (23/10)

O dono viu o botão **DANÇAR** sobre os pés do personagem na tela de seleção e disse o que
importa: *"as danças ainda não estão validadas"*. Enquanto não houver aceite visual dele,
nada disso é oferecido a quem joga.

A chave é `public/js/emote-features.js` → `EMOTES_ENABLED`. Com `false` (padrão):

- o `<div class="pv-emotes">` **não é renderizado** pelo `src/pages/index.astro` — o botão
  não existe no DOM, não é um `hidden` que volta com um inspetor;
- `religaAbrirEmotes()` (`public/js/main.js`) não arma clique nenhum — segunda tranca;
- `_emoteToggle()` (`public/js/game.js`) sai na porta: a tecla **T** não abre a roda.

A mecânica continua inteira e medida. As réguas `eval:emotes` (EM8) e `eval:emotepartida`
(EP6) cobram a porta FECHADA, com o mutante `porta-aberta` provando que mordem; as demais
cláusulas da partida rodam com a flag ligada por reescrita do arquivo servido, para que
desligar a porta não vire desculpa para parar de medir o que já foi construído.

**Para validar:** `EMOTES_ENABLED = true` num preview, rodar as oito danças nos corpos que
interessam e trazer a captura. O que falta para o dono aceitar são os passos, não o botão.

## Defeitos relatados pelo dono (22/10) e o que foi feito

| Relato | Causa medida | Conserto |
|---|---|---|
| "a arma balança e entra na frente" | o clipe base do jogo e PORTE DE FUZIL: o cano seguia a mao do passo e cruzava o rosto | a arma e guardada durante o emote (cobrado por EM7) |
| "alguns personagens da glitch" | varredura de 63 personagens x 8 dancas: nenhum membro estourado, nenhum NaN. O que havia era arma visivel em quem a pendura fora do mount (canarinho, proerd) | o esconderijo passou a cobrir `arma-glb`/`arma-caixa` alem do mount |
| "do passinho ao quadradinho nenhuma e identificavel" | o overlay somava em cima do porte de fuzil: bracos esticados a frente e amplitude pequena | pose base ASSIMETRICA que solta os dois bracos (medido: mao direita desce 51 cm contra 31 do porte) e amplitudes maiores. Continua procedural - ver o limite 3 |

## Achado colateral

`public/models/dollynho_dance.glb` (552 KB, atrás de `?dolly=1`) é um download **cru** do
Sketchfab/Mixamo: ossos `mixamorig:LeftArm_09`, malha própria, **0 de 18** ossos em comum
com o rig do jogo. É a causa dos "braços quebrados" anotados em `game.js`, e o
`SOURCES.md` do próprio projeto diz que redistribuir o asset cru não é permitido — só o
derivado retargetado. Fica registrado aqui; remover ou retargetar é decisão do dono.

## Emotes de captura: capoeira, breakdance e gestos (09/11)

O limite 3 acima ("procedural, não mocap") vale para os 8 passos de dentro da roda. Desde
09/11 a roda tem um **anel de fora** com 8 emotes de captura, convertidos do Mixamo para o
esqueleto meshy-28 com QA aprovada nos rigs de prova (`emotes-mocap.SOURCES.md` lista o ID
de cada clipe no catálogo de conversão). FBX bruto não entra no repositório. Só o clipe
derivado entra, que é o uso permitido.

| Id (rede) | Nome | Clipe | Reprodução | Reserva procedural | Desbloqueio |
|---|---|---|---|---|---|
| 9 `capoeira` | Ginga | `mixamo/capoeira-pack/capoeira` | laço, 3,43 s | `ginga` | **base** |
| 10 `meia_lua` | Meia-lua de frente | `mixamo/capoeira-pack/meia-lua-de-frente` | laço, 2,47 s | `ginga` | passe |
| 11 `bencao` | Bênção | `mixamo/capoeira-pack/bencao` | laço, 1,37 s | `ginga` | passe |
| 12 `uprock` | Uprock | `mixamo/breakdance-pack/breakdance-uprock` | laço, 2,10 s | `passinho` | passe |
| 13 `freeze` | Freeze | `mixamo/breakdance-pack/breakdance-freeze-var-2` | uma vez, 4,87 s | `passinho` | passe |
| 14 `continencia` | Continência | `mixamo/loose/salute` | laço, 2,83 s | `salve` | passe |
| 15 `marra` | Marra | `mixamo/gestures-pack-basic/being-cocky` | laço, 2,87 s | `salve` | passe |
| 16 `comemoracao` | Comemoração | `mixamo/gestures-pack-basic/happy-hand-gesture` | laço, 2,73 s | `salve` | **base** |

Laço ou uma vez vem do campo `loop` do catálogo de conversão, que mede a costura do clipe.
A **Ginga** de captura convive com a `ginga` procedural: os anéis são diferentes e o id
também.

**Pack e custo.** `public/models/anims/emotes-mocap.glb` tem **304.768 bytes** (239.972
em gzip) com 8 clipes. É gerado por `node tools/build-emotes-mocap-pack.mjs
--library=<biblioteca>/index.json`, que usa a mesma mescla do `extras.glb`
(`tools/anim-pack.mjs`; o `extras.glb` regenerado saiu byte a byte idêntico). O jogo só
baixa o pack no **primeiro emote de clipe** e baixa uma vez por sessão. Dança procedural,
boot e construção de corpo não pedem nada.

**Corpo inteiro, retargetado por corpo.** O controlador toca o clipe como estado de corpo
inteiro, com fade de 0,16 s, e suspende mira de cabeça e pitch de coluna enquanto ele
manda. O pack está no esqueleto de referência; no primeiro emote de cada personagem o
`glbchars.js` monta uma cópia do clipe para o repouso daquele corpo (`emoteClipDoCorpo`,
a convenção do `tools/retarget-glb.mjs` em runtime, sem byte novo de asset):

- **Rotação.** Coluna, pernas e ombro recebem o delta de mundo do clipe sobre o próprio
  repouso; braço, antebraço e mão, a rotação de mundo absoluta da referência. Copiar a
  rotação local da referência, como antes, tombava o tronco: o `Hips` dela repousa a 30°
  em X. No roster, o erro mediano de direção de osso contra o clipe assado por corpo caiu
  de 35,1° para 14,2° (p90 de 112,8° para 29,5°). Braço em delta deixava 44 de 792 clipes
  com estica acima de 1,1× o assado; absoluto, 12.
- **Chão por contato.** Por quadro, o ponto mais baixo da malha fica na altura que o osso
  mais baixo da referência tem sobre o repouso dela, escalada pela altura de quadril. Com a
  referência em pé, quem assenta é o pé, e o resto do corpo só não atravessa o chão. No
  freeze, quem apoia é a mão. Os pontos de apoio são os extremos da malha em 26 direções
  por osso, com os 4 pesos do skinning. O `Curl_*` da mão fechada entra vivo.
- **Apêndice.** Cauda ou capa que o auto-skin pendurou a mais de uma altura de quadril do
  osso que a carrega não sustenta o corpo: cuca (1,61, na perna), lobisomem cyborg (1,48,
  na coxa) e proerd (1,43, no quadril). O pé fica no chão e a cauda atravessa. Antes, essa
  cauda erguia o corpo até 88 cm.
- **Cápsula.** O deslocamento horizontal do `Hips` é medido do eixo do grupo, não do
  repouso do quadril. Quando passa do raio do jogador (0,38 m, o `_collide(p.pos, 0.38)`
  do `game.js`), o horizontal do clipe inteiro encolhe junto. A meia-lua da referência
  viaja 0,97 m; no corpo, o quadril fica em 0,379 m. O pé desliza em vez de o corpo
  atravessar a parede.

**Escolha medida: retarget em runtime × emote assado por corpo.** O assado por corpo da
anim-conv (QA por rig) custaria 20.718.444 bytes nos 99 corpos e skins (11.120.764 em
gzip; mediana de 208.976 bytes por corpo baixado), contra 0 byte novo no runtime. O pack
único de 304.768 bytes continua sendo o único download. O assado também não traz cápsula
(quadril até 1,60 m) nem contato: tirando a cápsula, ele reprova em 7 dos 99 itens.
O runtime reprova em 5 dos 99 no critério estrito, e esses 5 são resíduos documentados
abaixo.

**Regras herdadas.** A arma some como nos procedurais. Andar, atirar, trocar de arma,
levar dano, morrer e a cerimônia de fim de rodada cancelam. O `freeze` termina sozinho;
os laços seguem até o jogador sair. Em LOD≥2 o clipe não toca: o corpo fica no idle com
a coreografia de reserva. Ao voltar para perto, o clipe retoma na fase certa. A reserva
procedural também cobre o download do pack e uma falha dele.

**Rede.** Os ids 9–16 foram **acrescentados** depois dos 8 da v9 (`public/js/data/
emote-catalog.js`, contrato de #1266). A réplica remota precisa de duas coisas: #1266 no
cliente e o nó com `CLIENT_REF` num commit que já tenha estes ids, porque o servidor
valida pelo mesmo catálogo. Antes disso, o nó trata id desconhecido como "parar" e os
outros jogadores não veem a dança de captura. `ctrl.emote(id, elapsed)` aceita a fase da
rede, e reaplicar o mesmo emote só corrige uma deriva maior que 0,25 s, sem reiniciar
clipe nem rampa.

**Risco de rollout.** O decoder v9 de #1266 rejeita id maior que o tamanho do catálogo
(`RangeError('emote')`, tratado como snapshot inválido). Uma aba aberta com o catálogo de
8 ids que receber o id 9–16 de um nó atualizado perde o snapshot. Antes de o nó publicar
esses ids, uma de duas coisas precisa existir: o nó manda 0 para as conexões cujo cliente
não conhece o id, ou os ids sobem numa versão de protocolo nova. A decisão é do dono e do
backend. Este PR não publica nada sozinho.

**Desbloqueio.** O campo `desbloqueio` (`'base'` | `'passe'`) existe para o passe de
temporada travar depois. Hoje nada é travado; a roda só marca **PASSE**. Ficam na base
**Ginga** e **Comemoração**. A Ginga é o movimento-raiz da capoeira e a versão de captura
da dança que todo mundo já tem. A Comemoração é um gesto curto e neutro para celebrar a
rodada. Vão para o passe os golpes e acrobacias (Meia-lua, Bênção, Uprock, Freeze) e os
gestos de atitude (Marra, Continência). Sem campo explícito, o emote é `'base'`, como os
8 procedurais.

**Como se dança.** **Shift+1–8** ou clique no anel de fora. 1–8 continuam no anel de
dentro.

**Réguas.** O `npm run eval:emotes-mocap` tem 15 cláusulas e 6 mutantes:
`emote-mocap-mudo`, `arma-visivel-no-emote`, `emote-nao-cancela`, `id-renumerado`,
`quadril-fora-da-capsula` (EMM12: quadril a 1,147 m do eixo) e `rotacao-local` (EMM13:
coluna a 16,9° do idle). O `npm run eval:emotes-roster` toca os 8 clipes nos 74 corpos e
nas 25 skins aprovadas pelo runtime real. Em 16 instantes por clipe, ele skinna a malha na
CPU e cobra:

- piso de −6 cm;
- vértice mais baixo a até 12 cm do chão nos clipes em pé;
- pé mais baixo a até 20 cm;
- quadril dentro da cápsula;
- estica até max(3,5; 1,1× o pior clipe de jogo do corpo; 1,1× o clipe assado no mesmo
  corpo).

O estica do assado fica congelado em `tools/eval/emotes-mocap-roster-ref.json`, porque o
assado mora fora do repo; `--assado=<legacy-out> --congela` o remede. A régua tem 4
mutantes: `rotacao-local`, `capsula-aberta`, `sem-contato` e `curl-ignorado`. Roda em
cerca de 30 s e entra no CI no job `equipamento-tp`. O `eval:emotepartida` ganhou o
**EP7**, que cobre a partida real: Shift+1 toca a Ginga de captura com clipe, arma
guardada e um único pedido do pack, e andar derruba a dança. Ele também ganhou o mutante
`captura-sem-shift`. O `eval:emotes` mede só os procedurais.

**Prova visual.** As folhas têm 8 quadros nas vistas de frente, 3/4 e perfil, num palco
com o anel da cápsula. Ficam em `artifacts/emotes-mocap/<corpo>__<emote>.jpg`, local e
fora do git, para Ginga, Freeze e Meia-lua nestes corpos:

- Canarinho, mascote;
- Zumbi, o quadril mais alto do roster (0,95 m);
- lobisomem cyborg, skin;
- cuca, de perna dobrada e cauda;
- proerd;
- fluxo, no resíduo de estica.

Antes, a folha cobria Capitão e Gotinha em partida local. O roteiro de captura fica fora
do repositório.

**Limites.** Resíduos medidos e travados na régua (o teto só desce):

- **Estica acima de 1,1× o assado:** ancap na ginga, 10,99 contra 6,89 (o ancap já
  estica 8,39 em jogo); fluxo na ginga, 5,17 contra 4,31, e na bênção, 3,94 contra 3,41.
  Os dois divergem do assado na coxa, de 31° a 57°. Na folha do fluxo não aparece.
- **Apêndice atravessando o chão:** cuca até 71,6 cm, lobisomem cyborg até 46,3 cm e
  proerd até 31,1 cm na bênção. O conserto é de pesos no Studio. O cuca nem é jogável, e o
  idle dele já afunda 49 cm.

A hitbox de cabeça acompanha o osso, como nos procedurais. A porta de produção
(`EMOTES_ENABLED`) continua fechada.
