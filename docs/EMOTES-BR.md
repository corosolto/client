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
