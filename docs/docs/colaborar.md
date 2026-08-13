---
id: colaborar
title: Como colaborar
sidebar_label: Como colaborar
sidebar_position: 6
description: Setup, como rodar o quality gate, o que um PR precisa, como adicionar arma / personagem / mapa, e as boas primeiras tarefas.
---

# Como colaborar

O número abaixo não é retórica, e não é escrito à mão: sai de `git shortlog -sn
--no-merges` descontando os autores que são agentes de IA (que assinam como `Claude` /
`Claude (gauntlet …)`).

{/* BEGIN:GERADO:pessoas — não edite à mão, rode `npm run docs` */}

**8 identidades de autoria humana** assinam commit no histórico **desta branch**: `ruben-cytonic`, `Emerson Garrido`, `Ruben`, `Ruben Marcus`, `William Oliveira`, `Juan Versolato Lopes`, `matheusgb`, `daltonfontes`. O resto dos commits é assinado por agentes de IA. Branch não é repositório: quem contribuiu num ramo que esta branch não contém **não aparece aqui**.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git shortlog -sn --no-merges (descontando autores que são agentes)`

{/* END:GERADO:pessoas */}

Não existe time, não existe comunidade, não existe fila de revisores — existem essas
pessoas e um quality gate automatizado.

:::note O bloco acima conta a BRANCH, e o projeto é maior que ela
A `main` tem um quarto contribuidor que esta branch de trabalho não contém — 13 commits
de um cliente desktop, mesclados em julho. Quem, quanto e por que isso importa para
qualquer decisão de licença está no `CONTRIBUTING.md` (seção de licença e superfícies).
:::

Isso é relevante pra você de duas formas opostas. A ruim: se o seu PR travar, pode
demorar. A boa: **quase toda a régua é máquina.** `npm run check` te dá o mesmo veredito
que o mantenedor daria, antes de você abrir o PR, sem esperar ninguém. A barreira é baixa
**de propósito** — é um dos princípios que não mudam do
[`docs/ROADMAP.md`](https://github.com/rubenmarcus/csbrasil/blob/main/docs/ROADMAP.md).
Mas a régua não é.

Resumo em uma frase: **traga o número.** Um PR que muda comportamento visível e não traz
nem uma invariante nova nem a razão de não precisar de uma vai voltar com uma pergunta.

## Setup

```bash
git clone https://github.com/rubenmarcus/csbrasil.git && cd csbrasil
npm install
npm run dev          # http://localhost:4321 — a rota raiz JÁ É o jogo
```

Opcional:

```bash
npm run fetch-audio  # pacote de áudio (sem ele: sons sintetizados)
```

Requisitos: Node 22 (é o que o CI usa, `.github/workflows/ci.yml:14`) e Python 3 para
parte do arnês (`ref-measure.py`, `char_probe.py`, `mat_shade.py` — usam numpy e PIL).

:::caution Servir `public/` NÃO roda o jogo
Não existe `public/index.html`: o HTML do jogo é `src/pages/index.astro`, na rota raiz.
Use `npm run dev`. Detalhes e prova em
[Começando](./comecando.md#a-pegadinha-que-custa-a-primeira-hora-de-todo-mundo).
:::

## Rodar o quality gate

```bash
npm run eval:vm                          # OBRIGATÓRIO ANTES — ver o aviso abaixo
node tools/eval/invariants.mjs           # o quality gate inteiro
node tools/eval/invariants.mjs --json    # saída pra máquina
npm run check                            # syntax + vm + quality gate + coice + bots
```

:::danger `eval:vm` roda ANTES de `invariants.mjs`. Sempre.
As invariantes de viewmodel (VM1–VM19) **leem** `tools/eval/vm_mint_audit.json`, que é o
`eval:vm` quem **escreve**. Rodar as invariantes com esse JSON velho mede o viewmodel de
ontem e **inventa vermelha**: em 04/08/2026 o JSON estava em `V0=80°` contra o `game.js`
em `V0=42°`, e a VM5 acusava **26/26 armas fora**; depois de `npm run eval:vm`, **3/26**.
A VM1 caiu de 26/26 para 2/26 e a VM9 ficou verde.

A ordem do `npm run check` já foi corrigida (`package.json`) — o cuidado é para quando
você chamar `node tools/eval/invariants.mjs` na mão. Detalhe: BUG-02 do
[`KNOWN-BUGS.md`](https://github.com/rubenmarcus/csbrasil/blob/main/KNOWN-BUGS.md).
:::

Custo real: numa máquina de 2 CPUs, **cerca de 10 minutos**. Ele sobe o jogo real cinco
vezes (uma por mapa), roda 60 s de simulação de bot por mapa e audita todos os GLBs de arma.
Rode antes de abrir o PR, não depois de receber a review.

Arnêses individuais, quando você quiser iterar rápido numa frente só:

```bash
node tools/eval/vm-mint-audit.mjs      # enquadramento de viewmodel (todo o arsenal)
node tools/eval/vm-solve.mjs           # existe ponto viável pras invariantes de VM?
node tools/eval/vm-solve.mjs --atual    # só as margens da config atual (instantâneo)
node tools/eval/botsim.mjs 60 all      # navegação de bots, todos os mapas, sementes fixas
node tools/eval/char-probe.mjs         # personagens (C1..C6)
node tools/eval/map-check.mjs all      # geometria de mapa (MAP1-MAP3, CTF1)
node tools/eval/mat-check.mjs          # material/luz/fog/textura
node tools/eval/pickup-check.mjs       # todo pickup é alcançável?
node tools/eval/ui-check.mjs           # UI1 contraste · UI2 poluição · UI3 área morta · UI4 ritmo
```

### Antes de dizer que consertou: mute

```bash
MUT=ui1_ctf_scrim_fraco node tools/eval/ui-check.mjs   # espera UI1 VERMELHA
```

Desfaça a sua própria correção e confira que o quality gate **fica vermelho**. Se ficar verde,
o que você mediu não é o que você consertou. É a lição mais cara deste repositório e ela
tem uma página inteira: [Teste de mutação](./quality-gates.md#teste-de-mutação-da-própria-régua).

### Se o seu PR é um conserto de bug

Use a skill `bug-hunt` (`.claude/skills/bug-hunt/SKILL.md`). Ela é o passo a passo desta
doutrina aplicado a defeito — com o caso real que comprou cada regra, o gabarito da entrada
do `KNOWN-BUGS.md` e o do relatório final, incluindo como declarar o que você **não**
verificou. Serve para agente e para gente.

## O que um PR precisa

### 1. Uma invariante nova — ou a razão de não precisar

Esta é a regra que define o projeto. Todo PR que muda **comportamento observável** traz
uma das duas coisas:

- **Uma invariante nova** em `tools/eval/invariants.mjs`, com teto que tem procedência
  (arquivo de referência + pixel medido + script que reproduz), ou
- **Uma frase na descrição do PR** dizendo por que não precisa. Razões válidas: "já é
  coberto pela invariante X" (diga qual), "é refatoração sem mudança observável — o
  quality gate dá o mesmo placar antes e depois" (cole os dois), "é conteúdo puro (texto,
  asset) sem regra de jogo associada".

Razão inválida: "testei manualmente e ficou bom".

Por quê: **intenção que não vira invariante é otimizada para fora**. Uma rodada levou o
quality gate de 16/21 para 19/21 sem afrouxar um teto sequer, e foi reprovada, porque destruiu
em silêncio uma decisão estética que nenhuma invariante codificava. Caso completo em
[O quality gate](./quality-gates.md#lei-1--intenção-que-não-vira-invariante-é-otimizada-para-fora).

### 2. O quality gate não pode piorar

Cole a saída de `node tools/eval/invariants.mjs` antes e depois. Se alguma crítica ficou
vermelha, o PR não entra. Se você **consertou** uma vermelha, diga qual e mostre.

O estado do quality gate deve ser medido ([veja como](./estado.md)); a lista viva com causa raiz está
no `KNOWN-BUGS.md`). Isso não é licença para piorar: o compromisso é *"a sua mudança não
acrescenta vermelho"*.

### 3. Números, com `arquivo:linha`

A afirmação "melhorei a iluminação" não é revisável. "O chão do `praca_poderes` estava 8 pontos
de L\* acima das paredes, causa em `map_brasilia.js:NNN`, corrigido para X" é. Essa
exigência não é estilo — é o que permite que a próxima rodada confira o seu trabalho.

### 4. Uma frente por PR

Consulte a tabela de conflito ([Arquitetura](./arquitetura.md#a-tabela-de-conflito)). Um
PR que toca armas + UI + mapa é três PRs escondidos, e vai colidir com três frentes. Em
`game.js`, edite por trecho; nunca sobrescreva o arquivo inteiro.

### 5. Higiene do repositório

- `node --check` em cada arquivo de `public/js/` que você editou (o CI faz isso primeiro,
  `.github/workflows/ci.yml:19-20`).
- Comentário **em português explicando o porquê**, não o quê. É a cultura do repo e é o
  que sobrevive ao próximo handoff.
- **Nunca delete comentário de procedência** num PR de limpeza. Aquele parágrafo longo
  explicando de onde veio o número 0,513 é o que impede a próxima rodada de repetir três
  dias perdidos.
- Mexeu em `public/js/*.js`? **Bump o `?v=` nos dois lados** — `public/js/version.js` e o
  import map de `src/pages/index.astro`. Já custou dias de "correção que não chegava".
- Mexeu em `public/js/*.js`, no `maps.js`, no `characters.js` ou numa dependência?
  **Rode `npm run docs`** e commite junto. O `docs:check` está no `check:fast` e vai
  reprovar — leva menos de um segundo e é o que impede a doc de voltar a mentir.
- Nada de asset com copyright. Nada de `service_role` key commitada.
- Nada de dependência de runtime no jogo. Three.js é vendorizado; o jogo tem que rodar
  arrastando a pasta pra um host estático.

### 6. Linha editorial

De `CONTRIBUTING.md:7-16`: o jogo não tem lado político (os dois times têm a mesma
mecânica), não incita ódio, não usa pessoas reais — só arquétipos originais, sem gore.
Contribuições que violem isso são recusadas. Não é burocracia: é o que protege o projeto
de takedown e de virar outra coisa.

## Como adicionar uma arma

O pipeline é data-driven a partir do GLB. Os GLBs de arma vivem em `public/models/weapons/`
(a contagem está no bloco gerado de [Começando](./comecando.md)).

1. **Coloque o GLB** em `public/models/weapons/<id>.glb`. Só geometria — o material vem
   do pipeline (`MAT1` exige `metallicFactor 1 / roughnessFactor 1` com mapa
   metallicRoughness, que é o padrão de todas as atuais).
2. **Declare a arma** em `public/js/weapons.js`. Os campos que o quality gate lê:
   - `len` — comprimento em metros. **`ARM4` reprova acima de 1,25 m** fora de sniper de
     ferrolho. É o campo que normaliza a escala; não é decoração.
   - `gripZ` — fração do comprimento, contada **a partir da boca**, onde fica o grip
     (ak/m4 usam 0,62 — cai no guarda-mato). É o que ancora a mão.
   - `vm` — multiplicador de escala do mesh no viewmodel. Existe porque a `m92` batia
     14,50% contra o teto medido de 13,09% da VM18b.
   - `scope: true` **exige** `spreadScope` declarado — é a `ARM1`, e ela existe por causa
     do "sniper sem zoom".
3. **Rode o auditor:** `node tools/eval/vm-mint-audit.mjs`. Ele abre o GLB com parser
   próprio, projeta o viewmodel nos dois aspectos e escreve `tools/eval/vm_mint_audit.json`.
   **Esse JSON é versionado** — sem ele, VM1–VM6/VM9/VM10 viram PULADAS, que é quality gate
   verde por ausência de dado (`.github/workflows/ci.yml:24-27`).
4. **Rode o quality gate.** Você vai enfrentar VM1, VM3, VM5, VM9, VM12, VM16, VM18, VM18b,
   VM19 — nove invariantes de enquadramento, todas com faixa medida em frame de
   referência. Se não fechar, use `node tools/eval/vm-solve.mjs` em vez de tunar no olho:
   ele lê os tetos do próprio `invariants.mjs` e diz se existe ponto viável, ou **qual par
   de invariantes se cruza vazio e por quanto**.
5. **Commite o `vm_mint_audit.json` atualizado** junto com o resto.

## Como adicionar um personagem

45 GLBs em `public/models/characters/`, 44 medidos pelo `char-probe.mjs`.

1. **GLB com rig**, na bind pose, pés no chão. `CHR3` exige `|base da bbox| ≤ 0,01 m` na
   bind pose **e em cada clipe** — o sinal separa dois defeitos: `y < 0` é pé dentro do
   chão, `y > 0` é boneco no ar.
2. **Declare** em `public/js/characters.js` / `public/js/glbchars.js`.
3. **Rode `node tools/eval/char-probe.mjs`.** O que ele vai cobrar:
   - `CHR1` — proporção antropométrica e índice de "balão". Hoje **está vermelha para o
     elenco inteiro**, então não é você que a quebrou; mas não a piore.
   - `CHR2` — altura do corpo dentro de meia hitbox de cabeça (dispersão ≤ 0,15 m). Medida
     **sem adereço**: chapéu/cabelo/mastro inflam a bbox e fazem o caminho GLB (a evidência da própria CHR2 aponta `glbchars.js:319-322`)
     encolher o corpo.
   - `CHR4` — nenhuma palma nasce enterrada no corpo.
   - `CHR5`/`CHR5B` — acabamento (normal + roughness + AO). A CHR5B **ficou verde em
     04/08**: era o "três níveis de acabamento na mesma tela" que o dono descreveu, com
     boa parte do elenco sem nenhum mapa de superfície, e hoje é zero personagem sem.
     Personagem novo **sem** normal + roughness reabre a vermelha — traga os mapas.
   - `CHR6` — nenhum par com a mesma silhueta (IoU ≤ 0,98).

## Como adicionar um mapa

Hoje mapas são **código**, não dado: cada `map_*.js` é geometria declarada à mão, e os
maiores rivalizam em tamanho com os módulos de sistema. Migrar isso para JSON é a Fase 2
conteúdo como dado do
[`docs/ROADMAP.md`](https://github.com/rubenmarcus/csbrasil/blob/main/docs/ROADMAP.md), e é a
contribuição de maior alavancagem do projeto.

O registro, gerado do `MAPS` de `public/js/maps.js`:

{/* BEGIN:GERADO:mapas — não edite à mão, rode `npm run docs` */}

| Id | Nome no menu | Abre em | Arquivo em `public/js/` | Linhas |
|---|---|---|---|---:|
| `praca_poderes` | Praça dos Três Poderes | rodadas | `map_brasilia.js` | 1.830 |
| `piscina_treta` | Piscina da Treta | rodadas | `map_piscina.js` | 810 |
| `loja_h` | Loja H (Estacionamento) | **captura** | `map_havan.js` | 1.952 |
| `ferro_velho` | Ferro Velho do Zé | **captura** | `map_ferrovelho.js` | 1.888 |
| `quebrada` | Quebrada (Rua do Baile) | **captura** | `map_quebrada.js` | 1.599 |

**5 mapas registrados** — 2 abrem em rodadas e 3 em captura. `ctfMode` **abre** o mapa em captura, não prende: o jogador troca no menu (é a `MOD1`). Há 7 arquivos `map_*.js` em `public/js/` — arquivo no disco **não** implica mapa jogável.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `objeto MAPS de public/js/maps.js`

{/* END:GERADO:mapas */}

Dois avisos que custam tempo se você não souber:

- **`praca_old` ("Praça (clássico)") NÃO existe mais.** Saiu do registro e o
  `public/js/map.js` foi apagado junto (pedido literal do dono: *"vamos apagar praça
  clássica"*). Se você encontrar `praca_old` numa saída de régua, essa saída é anterior à
  remoção — é o caso do histórico explicado em [Estado atual](./estado.md).
- **`map_piscinao_ramos.js` existe no disco e NÃO está no registro** (é a versão "Piscinão",
  fora do menu). Arquivo de mapa em `public/js/` não implica mapa jogável; quem decide é
  o objeto `MAPS`.

Para adicionar um mapa no formato de hoje:

1. **Crie `public/js/map_<nome>.js`** exportando uma função `build<Nome>()`. Use
   `map_piscina.js` como referência — é o menor dos registrados (a tabela acima traz o
   tamanho de cada um).
2. **Registre em `public/js/maps.js:8-36`** — nome exibido, `build`, e `ctfMode: true` se
   a geometria foi desenhada em volta de bandeiras. `ctfMode` **abre** o mapa em captura;
   não prende. **Não** existe mais `ctfOnly`: `MOD1` reprova qualquer mapa que force o
   modo. O jogador escolhe.
3. **Rode `node tools/eval/map-check.mjs <mapId>`.** O que ele mede, tudo por raycast
   contra o mundo real:
   - `MAP1` — nenhum spawn e nenhum chão andável com o corpo dentro de geometria sólida.
     Teto = degrau de 0,30 m (acima disso não é "passar por cima", é "estar dentro").
   - `MAP2` — cada time nasce todo no mesmo andar; respawn não visível de fora (medido com
     o `_losClear` **do jogo**, a mesma função que decide se o bot atira em você).
   - `MAP3` — escada dentro da NBR 9077 / Blondel (espelho 16–18 cm, piso 25–32 cm,
     2h+p 63–65 cm, largura ≥ 1,20 m) **e** o grafo de navegação + o flood-fill sobem por
     ela.
   - `CTF1` — bandeiras não colineares, ≥ 2 raios do spawn mais próximo, nenhuma enterrada.
4. **Rode `node tools/eval/pickup-check.mjs`** (alimenta a `VM14`): todo pickup precisa
   ser alcançável **a pé**, por flood-fill de conectividade real em grade de 0,25 m
   semeado nos spawns dos dois times. Já aconteceu de armas caírem dentro da piscina do
   `piscina_treta` com o quality gate marcando vão **0,0000 — VERDE**.
5. **Rode `node tools/eval/botsim.mjs 60 <mapId>`**: os bots precisam navegar o seu mapa
   sem travar (`BOT3` stuck ≤ 4%), sem andar de lado (`BOT1`) e sem girar parados (`BOT2`).
   Waypoint desconexo é o defeito mais comum de mapa novo, e já quebrou PRs antes
   (é o defeito que a direção "conteúdo como dado" existe para matar).

## Boas primeiras tarefas

Ordenadas por (impacto ÷ esforço). Todas são reais, verificadas nesta árvore, e nenhuma
exige entender o jogo inteiro.

### Muito boas para o primeiro PR

As tarefas de entrada moram em **[`docs/issues/`](https://github.com/rubenmarcus/csbrasil/tree/main/docs/issues)**,
uma por arquivo, cada uma com contexto, o que fazer, critério de aceite e quais arquivos
tocar. O `README.md` de lá indexa por tempo disponível (30 min / 1 h / 2-3 h) e por área
(SEO, UI, backend, CI). **Nenhuma delas exige tocar em `public/js/*.js`**, de propósito:
é o código onde os agentes de gameplay trabalham em paralelo e onde a tabela de conflito
do `tools/eval/ARCH.md` manda.

:::caution Elas ainda NÃO estão abertas no GitHub
Elas existem como arquivo, não como issue. Existe um script pronto —
`docs/issues/abrir-issues.sh`, com [`gh`](https://cli.github.com/) autenticado:

```bash
bash docs/issues/abrir-issues.sh --dry-run   # imprime título + labels, não abre nada
bash docs/issues/abrir-issues.sh --labels    # cria as 8 labels usadas
bash docs/issues/abrir-issues.sh             # abre as 15
```

Ele é idempotente (procura issue com o mesmo título antes de criar) e **nunca foi
executado**: o repositório é do dono e abrir issue é ação irreversível com o nome dele.
Ou seja, se você procurar as tarefas na aba Issues, não vai achar — leia os `.md`.
:::

:::note Esta lista já teve cinco itens, e quatro foram feitos
Ela mandava corrigir o `README.md` (feito), adicionar `arch`/`arch:check` ao
`package.json` (existem hoje), regenerar o `ARCH.md` e fazer o `tp-mount-probe` pular
quando faltasse `public/models/anims/` — pasta que **hoje está versionada** (438 arquivos
em `git ls-files public/models/anims`). Doc que manda fazer o que já foi feito queima a
primeira contribuição de alguém; por isso a lista virou ponteiro para `docs/issues/`,
que é mantida.

O único item da lista antiga que **continua valendo**: a mensagem das invariantes
PX1–PX4 manda usar `tools/eval/motion.mjs`, que não existe (`ls` confirma). Apontar para
o arnês certo, ou marcar como "arnês a escrever", é um PR de 15 minutos.
:::

### Trabalho de verdade, ainda acessível

1. **VM12 e VM1 nas armas específicas.** VM12 falha em 5 de 52 medidas (pior `famas`@3:2
   com 0,660 contra o teto 0,62); VM1 em 2 de 26 (`famas`, `uzi`). São correções por arma,
   com faixa medida e `vm-solve.mjs` disponível para provar viabilidade. *Frente:
   ARMAS/VIEWMODEL.*

2. **BOT8 — bot com linha de visão e sem atirar.** É a dívida mais barata da lista, e a
   causa raiz já está achada: `game.js:5361` avalia `const hasTurn = … this._duelToken(b)`
   **todo frame**, antes de qualquer gate de "pode atirar" — e `_duelToken` não consulta,
   ele **reserva** o token. Bot recarregando ou sem linha de tiro rouba um dos 2 tokens e
   segura; os outros atravessam o campo de visão sem disparar. A correção é mover a chamada
   para dentro do `if`. Medido na última execução registrada: **4 episódios, silêncio
   máximo 4,23 s** — e note que **piorou** desde os 2,7 / 3,03 s do baseline, o que faz
   dela também um bom A/B. *Frente: BOTS/JOGABILIDADE. Detalhe: BUG-03.*

3. **Personagens: proporção (CHR1) e mapas de superfície.** Cuidado com doc velha aqui: a
   **CHR5B ficou VERDE** em 04/08 (os 27 de 44 personagens sem mapa de superfície foram a
   **0 de 44**), então esse item específico **já foi feito** — não o refaça. O que segue
   vermelho é CHR1/CHR3/CHR4, e a causa de fundo é rig, não runtime (BUG-10). Leia o
   KNOWN-BUGS antes de pegar. *Frente: PERSONAGENS.*

4. **`setTimeout` não limpos no `dispose()`** — vazamento entre partidas, apontado em
   `RELATORIO-ANALISE.md:134`. **Os números de linha daquele relatório estão velhos** (o
   `game.js` andou ~1.000 linhas desde então); ache os atuais com
   `grep -n setTimeout public/js/game.js` e confira quais sobrevivem ao `dispose()`. Bom
   PR de higiene com efeito medível no heap. *Frente: zona vermelha `constructor`/`update`
   — coordene antes.*

### Alto valor, precisa de conversa antes

5. **Extrair `_updateBot()` (772 linhas).** Marcado como candidato a extração pelo
    próprio índice gerado. Precisa de acordo prévio sobre a partição, porque a região é
    disputada.

6. **Mapas como JSON (Fase 2).** Geometria, colliders, occluders, spawns, pickups e
    waypoints em dado, com loader único e **waypoints validados por teste**. É o que
    transforma "PR de código arriscado" em "abre um JSON". Abra uma issue primeiro.

7. **Job de CI noturno com browser** para destravar PX1–PX4. Quatro invariantes de pixel
    estão puladas desde sempre.

## Processo

1. Feature grande? **Abra uma issue antes** (veja `IDEAS.md`).
2. Fork + branch **`v2/<assunto>`** — `v2/multiplayer`, `v2/audio`, `v2/ui-hud`. O prefixo
   é o ciclo de release (topo do `CHANGELOG.md`), e a convenção nasceu de um problema
   concreto: em 04/08 a branch de trabalho ainda se chamava `feat/evio-feel` — nome de uma
   feature de julho — com **143 commits** de assuntos diferentes empilhados. Nome que não
   diz o que a branch é vira depósito. (Fonte: `CONTRIBUTING.md`.)
3. Rode `npm run check`. Cole a saída no PR.
4. PR pequeno, uma frente, descrição com números e `arquivo:linha`.
5. **Ao contribuir você licencia sob a licença que o `LICENSE` disser no momento do seu
   PR.** Qual é ela hoje e quais arquivos mudam junto numa troca: a seção de licença do
   `CONTRIBUTING.md`. Se isso
   for decisivo pra você, leia lá antes de escrever a primeira linha.

Reportando bug: o que aconteceu, o que esperava, passos pra reproduzir, navegador/SO e
print do console (F12). E se o bug for de comportamento, ele vai virar invariante — é
assim que ele nunca volta (`tools/eval/invariants.mjs:20-21`).
