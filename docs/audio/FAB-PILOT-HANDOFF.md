# Piloto de áudio Fab — handoff

Atualizado em 2026-09-04 (segunda rodada: bloqueadores da revisão independente).

## Objetivo e definição de pronto

Substituir sons de procedência insegura por um primeiro conjunto licenciado e audivelmente
coerente, sem reabrir o arsenal inteiro nem distribuir o pacote fonte.

O piloto só fica pronto quando estes eventos estiverem aprovados no jogo real:

- AK em primeira pessoa: tiro, carregador sai, carregador entra e ferrolho;
- passos em concreto;
- morte corporal;
- impactos em concreto e metal.

O restante continua usando o fallback sintetizado até passar pelo mesmo processo.

**A etapa concluída nesta rodada não é o piloto.** É a pipeline que o recebe: as réguas que
reprovam antes de um arquivo sem procedência chegar ao jogador, e os dois defeitos que a
integração ia herdar calada.

## Branch e limites

- worktree: `/Users/ruben/csbrasil/worktrees/audio-fab-pilot`;
- branch: `claude/audio-fab-pilot`;
- base: `origin/main` em `dcd8858edc7ed5141d3f3227b74946b0f951166b`;
- não fazer push, merge, deploy ou release sem aprovação do dono;
- não tocar em `/Users/ruben/csbrasil/worktrees/viewmodel-blender`;
- não usar a lane divergente `feat/audio-voices-test` como base de merge.

### Commits desta rodada

| Commit | O que é |
|---|---|
| `e3e8792f` | handoff inicial (antes desta rodada) |
| `d84dbca5` | régua de alcance do empacotamento (ALC) — **vermelha**, 17 de 17 |
| `fd4481ef` | conserto: ambiente entra no manifest e no pack — ALC verde |
| `e86bb393` | régua espacial do tiro por sample (ESP) — **3 cláusulas vermelhas** |
| `b4065a67` | conserto: tiro por sample entra no grafo — ESP 7 de 7 verde |
| `d7a38530` | contrato de procedência por asset (PRV) + PRV5 no `assert:assets` |
| `4f6e7361` | inventariador local do staging privado + `.gitignore` |
| `7ec05c95` | conserto de defeito **introduzido** pelo `b4065a67`, achado pela ESP7 |
| `1462c8d0` | BUG-126 e BUG-127 no `KNOWN-BUGS.md` |
| `86cebd8d` | **ALC2 era falso-verde** — o empacotador morria em toda execução |
| `a35e3bd1` | sample que não carrega cai no synth, não em silêncio (ESP8) |
| `fa513890` | **P0**: trava de redistribuição Fab + PRV5 volta a poder disparar |
| `2b66bc80` | a decisão do ledger controla o gerador (PRV7) |
| `c9f5e49f` | shortlist por metadado e escuta A/B local |

## Fonte e licença

Fonte comprada pelo dono: [Action Game Sounds Pack](https://www.fab.com/listings/4950a0c3-ace9-4cce-86dc-ce551263b6ce),
de PlaceHolder Inc., sob Fab Standard License.

Os arquivos fonte devem ficar fora do Git público. Não publicar os WAVs nem um ZIP que
funcione como redistribuição standalone. A build pode receber apenas derivados selecionados,
convertidos, renomeados por conteúdo e incorporados ao projeto.

A listagem está marcada como `Allows usage with AI: No`. Claude pode trabalhar no contrato,
no código, nos testes e em metadados, mas não deve receber os WAVs brutos como entrada.
**Nenhum byte de áudio entrou em nenhuma medição desta rodada:** as réguas rodam sobre
fixtures geradas na hora (arquivos de texto de 44 bytes na ALC, `ArrayBuffer` de 32 bytes
na ESP, WAVs de ruído gerados pelo próprio autoteste no inventariador).

## O caminho real do áudio, mapeado

Antes de qualquer conserto, o inventário do caminho que um som percorre hoje:

| Etapa | Arquivo | O que faz |
|---|---|---|
| disco | `public/audio/` | **gitignored**; não existe em clone limpo |
| manifesto | `tools/gen-audio-manifest.mjs` | varre a pasta e escreve `manifest.json`; `cs/weapons/general/weaponSamples` são curados e preservados do manifest anterior |
| empacotamento | `scripts/build-audio-pack.mjs` | copia **só o que o manifest nomeia** (+ `menu-music/`), renomeia por sha-1 do conteúdo e monta o zip |
| instalação | `scripts/fetch-audio.sh` | baixa a release e descompacta em `public/audio/`; cai no `manifest.example.json` se o zip não trouxer manifest |
| portão de build | `tools/eval/assets-check.mjs` | piso de 250 caminhos + todo caminho existe no disco |
| runtime SFX | `public/js/audio.js` | `loadManifest` → `weaponSamples` liga o caminho por sample; synth é o primário |
| runtime ambiente | `public/js/soundscape.js` | `AMB_LOOPS` + `BIOME_SHOTS`; `map_corrego.js` é o único mapa com `world.sound` hoje |
| chamador | `public/js/game.js:3035` e `:6336` | player = distância 0; bot = distância, pan e `dist/343` |

Foi esse mapa que produziu os dois defeitos abaixo — registrados como **BUG-126** e
**BUG-127** no `KNOWN-BUGS.md`. Os dois eram invisíveis: um só aparece em produção, o outro
só aparece depois que o pack de samples é ligado.

**O segundo é LATENTE, e isso muda o risco desta rodada.** `grep -rn weaponSamples` acha a
leitura em `audio.js`, a preservação em `gen-audio-manifest.mjs:54` e as sondas
aposentadas, que o forçam a `false` — **nada no repositório liga o caminho por sample**. O
jogo de hoje roda o sintetizado, então a única mudança de `public/js/audio.js` que alcança
produção agora é o `duck(dist < 12 ? 0.3 : 0.55)` virar `duck(Sfx.duckTiro(dist))`: a mesma
expressão, com nome. Todo o resto do conserto está no caminho que o piloto vai ligar.

## Réguas escritas, e a mutação de cada uma

Toda régua foi escrita **antes** do conserto e commitada vermelha, com a medição no corpo
do commit. As mutações rodaram **depois** do conserto, contra o código já verde.

### `eval:audioalcance` (ALC) — o som que o código nomeia chega na build?

`soundscape.js` nomeia 17 arquivos de ambiente. Nenhum era alcançado: o gerador não tinha
regra para `ambiente/`, então eles entravam como órfãos, não viravam folha do manifest, e o
empacotador — que copia só o que o manifest nomeia — não os punha no zip. Em produção, 404
que `soundscape.js:59` engole com um `console.warn`.

A régua arma uma fixture sintética e roda o gerador e o empacotador **reais** contra ela
(`--raiz=`), em vez de depender do pacote privado: régua que só roda na máquina de quem já
tem tudo é o furo da lição 12.

| Execução | Resultado |
|---|---|
| antes do conserto | ALC1 17/17 fora do manifest · ALC2 17/17 fora do pack |
| depois | verde, 17/17 |
| `--mutante=nome-trocado` | ALC1 e ALC2 vermelhas por 1 — prova que lê por NOME (lição 14) |
| `--mutante=sem-copia` | só ALC2 vermelha, ALC1 verde — separa gerador de empacotador |

Conserto: regra `ambiente` no gerador (a pasta é a verdade, igual às outras famílias) e
cláusula irmã no `assets-check`, que mede o **pacote instalado** enquanto a ALC mede a
**pipeline**. As duas leem a lista da mesma fonte, `soundscape.js` (lição 2).

Por que a cláusula de produção é nominal e não entra no piso de 250: medido nesta árvore,
com uma fixture de 317 caminhos e a chave `ambiente` removida do manifest, o piso e a
cláusula de "existe no disco" ficam **verdes** e só a cláusula nova acende, por 17 de 17.

### `eval:audioespacial` (ESP) — o tiro por sample ouve a distância?

`game.js:6336` entrega distância, pan e `dist/343` em todo tiro de bot. O caminho por
sample descartava os três:

```js
if (this.pack?.weaponSamples) { … this.duck(0.3, 0.16); this._sample(f, vol); return; }
```

`_sample` é `new Audio(...).play()`: sem grafo, sem pan, sem agendamento. Bot a 40 m às
suas costas soaria igual a bot a 2 m à sua frente — a informação de jogo que o dono cobrou
("não vejo de onde vem o tiro, parece cheater") existe no synth e sumiria no instante em
que o pack Fab fosse ligado. O `duck` de `0.3` fixo era a lição 2 em miniatura: o synth
ducka `dist < 12 ? 0.3 : 0.55`.

A régua planta um `AudioContext` falso que grava o grafo e importa o `audio.js` **de
produção**.

| Cláusula | Antes | Depois |
|---|---|---|
| ESP1 cache frio não silencia | verde | verde |
| ESP2 pan chega a um `StereoPanner` | **vermelha** | verde |
| ESP3 som começa em `currentTime + propDelay` | **vermelha** | verde |
| ESP4 duck pela mesma regra do synth (40 m) | **vermelha** | verde |
| ESP4b mesma regra a 0 m | verde | verde |
| ESP5 IRMÃ: o synth continua espacializando | verde | verde |
| ESP6 fallback synth intacto | verde | verde |
| ESP7 volume do usuário entra uma vez | não existia | **vermelha** no `b4065a67`, verde no `7ec05c95` |

ESP4b passava no código quebrado porque a 0 m os dois valores coincidem em 0,3 — é
exatamente por isso que ESP4 mede a 40 m. E ESP5 existe porque, sem ela, apagar a
espacialização dos **dois** caminhos deixaria ESP2/ESP3 verdes por ausência de comparação
(lição 1).

| Mutação | Resultado |
|---|---|
| `--mutante=sem-pan` | ESP2 e ESP5 vermelhas |
| `--mutante=sem-propagacao` | ESP3 e ESP5 vermelhas |
| `--mutante=duck-fixo` | ESP4 vermelha |

**A ESP7 nasceu de um defeito que EU introduzi.** Revisando o próprio diff do
`b4065a67`, o ganho do `_shotSample` aplicava `this.vol` e o `master` aplicava de novo —
`_sample` multiplica na mão porque HTMLAudio não passa pelo `master`, e um `BufferSource`
passa. Medido com vol 0,5, `this.vol` 0,7 e `GUN_VOL` 0,62: ganho até o destino **0,1519**
onde a conta certa é **0,2170** — o sample sairia 30% mais baixo que antes do conserto,
sem erro nenhum no console. Cada nó, isolado, parecia certo; só o produto do trajeto
inteiro mostra. A cláusula roda com `?gunvol=1` para fazer a conta sem copiar o `0,62`
para dentro da régua, e repor o ganho antigo a deixa vermelha por 0,2450 contra 0,3500.

Isso é o corolário do `AGENTS.md` em ação e também o seu limite: a régua pegou o defeito
porque alguém foi olhar o diff, não porque o portão estava verde. **Quem construiu não deu
a nota — e continua sem poder dar.**

As duas primeiras acendem a irmã junto, e isso é o esperado: elas mutam a entrada do `Sfx`,
então o synth também para de espacializar. A primeira versão do mutante `sem-propagacao`
**não acendia nada** — ela zerava o valor que a própria cláusula usava como referência, e
mutação que se auto-anula parece mutação que passou (lição 8). A interceptação foi movida
para dentro do `Sfx`, com o valor pedido preservado na cláusula, e uma guarda que sai 2
quando a mutação não intercepta nenhuma chamada.

Conserto: `_shotSample` decodifica uma vez por arma e toca por
`BufferSource → gain → StereoPanner → master`, agendado em `currentTime + propDelay`. O duck
virou `Sfx.duckTiro(dist)`, chamado pelos dois caminhos. Cache frio toca pelo `_sample`
antigo — sem pan, mas audível — e falha de rede grava `null` e não retenta.

### `eval:audioproc` (PRV) — asset sem origem não entra numa build

`.gitignore` protege o git e **só** o git: o pacote é montado à parte e servido em
produção, então um arquivo de procedência desconhecida chega ao jogador sem passar por
commit nenhum. É o caminho que o BUG-23 abriu nos decalques, e o piloto Fab o percorre
inteiro.

- ledger: `docs/audio/proveniencia.json` — metadado, nenhum byte de som;
- contrato: `docs/audio/PROVENIENCIA.md` — o que cada campo significa e por quê;
- `eval:audioproc` cobra a forma (PRV1–PRV4); `assert:assets` cobra a build (PRV5:
  todo caminho sob `audio/piloto/` tem entrada no ledger com sha-256 batendo com o disco).

**PRV2 é a regra que não se negocia:** `aprovacao: "aprovado"` exige `escutaAB` com quem
ouviu e quando. Nenhuma régua desta base ouve som — elas provam que o arquivo chegou
inteiro e veio de onde diz que veio. Quem aprova é o dono, no jogo real, A/B contra o synth.

| Mutação | Resultado |
|---|---|
| `--mutante=aprovado-sem-escuta` | PRV2 vermelha |
| `--mutante=derivado-sem-fonte` | PRV4 vermelha |
| `--mutante=evento-sem-decisao` | PRV3 vermelha |

PRV5 foi medida numa fixture local de 301 caminhos: caminho sob o prefixo sem entrada no
ledger **reprova**; com hash correto **passa**; com o hash trocado **reprova** por "o
arquivo que a build serve não é o que foi aprovado".

## Os cinco bloqueadores da revisão independente — todos fechados

Cada um com teste vermelho antes do conserto. Dois deles eram defeitos **nas minhas
próprias réguas da rodada anterior**, e é isso que o corolário do `AGENTS.md` prevê: quem
constrói não dá a nota.

### ALC2 era falso-verde — a régua tinha dentro o defeito que ela caça

A régua engolia o código de saída do empacotador com um `catch {}` e um comentário que
racionalizava a escolha. Medido com `--verboso`: **o empacotador quebrava com `ENOENT` em
`menu-music` em TODA execução**, nunca gerava o zip, e a ALC2 declarava verde — ela lia o
`pack/manifest.json` que o builder escreve *antes* de morrer. O "ALC2 verde" do commit
`fd4481ef` nunca mediu um build inteiro. Lição 5, escrita por mim, dentro da régua da
lição 5. Conserto: cláusula ALC3 (código de saída 0 **e** zip existe), fixture com
`menu-music/`, e o builder diz o que falta em vez de cuspir stack. Mutação:
`--mutante=sem-menu-music`.

### PRV5 era letra morta — filtrava por prefixo que o empacotador apaga

A cláusula filtrava folhas do manifest por `audio/piloto/`, e o empacotador reescreve todo
caminho para `audio/a/<sha1>`. Medido rodando o empacotador real: no manifest que o jogador
recebe, o filtro casa **zero**. Cláusula estruturalmente incapaz de ver o defeito que ela
nomeia — lição 1. Conserto: casa por **sha-256**, que é o que sobrevive ao rename. Provado
com um derivado Fab instalado como `audio/a/b1b3d9230e48b0a1.wav`: acende e ainda mapeia o
nome hasheado de volta para a entrada do ledger.

### O fallback nunca chegava ao synth

`_shotSample` devolvia `true` mesmo depois de gravar a falha de fetch/decode, então
`shotWeapon` retornava antes do synth e o jogo repetia `new Audio()` numa URL que acabou de
dar 404 — silêncio a cada tiro, para sempre. Conserto: as duas saídas sem buffer devolvem
`false`. Cláusula ESP8, com o limiar **medido** (o mesmo tiro pelo synth puro é o controle):

| | 1ª chamada | 2ª chamada | HTMLAudio |
|---|---|---|---|
| antes | 0 disparos | 0 | 1, numa URL morta |
| depois | 11 | 11 | 0 |
| controle (synth puro) | 11 | — | — |

### O ledger não controlava nada

`decisao` e `aprovacao` estavam declarados e ninguém lia. Com `weaponSamples: true` o
runtime sorteia por `_pick(pack.weapons[w])` e toca qualquer caminho que esteja lá.
Conserto: o gerador poda dos curados todo caminho cujo sha-256 case derivado não aprovado,
ou cujo evento esteja em `synth` — e **relata** o que barrou. PRV7 monta três derivados do
mesmo evento (aprovado, pendente, rejeitado) com `weaponSamples: true`: antes saíam os 3,
depois sobra 1. Cláusula irmã junto — se o aprovado também sumisse, reprova.

### P0: o empacotador aceitava derivado que não pode ser redistribuído

Ver o bloqueio 1. PRV6 é a régua end-to-end com o builder real, e traz a irmã: sem o
derivado Fab, o mesmo empacotador tem que **aceitar** — senão um builder que recusasse tudo
passaria sem proteger nada.

## Shortlist do pacote — o que ele tem e o que ele não tem

Gerada por `npm run audio:shortlist`, só de metadado, com 14 arquivos barrados pelo veto de
gore (sangue, osso, grito).

| Evento | Candidatos | Famílias |
|---|---|---|
| `ak.shot` | 43 | `Gunshot_1` … `Gunshot_8` |
| `ak.shot.distante` | 16 | `Gunshot_Distant_1/2/3` |
| `ak.magOut` | 6 | `Unload_1` |
| `ak.magIn` | 9 | `Insert_Ammo_1`, `Loading_Ammo_1` |
| `passo.concreto` | 24 | `Concrete_Walk_1`, `Concrete_Run_1` |
| `morte.corpo` | 4 | `Body_Falling_1/2` |
| `ak.bolt` | **sem candidato** | — |
| `impacto.concreto` | **sem candidato** | — |
| `impacto.metal` | **sem candidato** | — |

**Nenhum arquivo do pacote identifica a arma.** Os 43 candidatos de tiro são "gunshot"
genéricos em 8 famílias numeradas; qual soa como AK é pergunta para o ouvido, não para o
nome. É por isso que a shortlist preserva o número da família — colapsar `Gunshot_3-5` em
`Gunshot` apagaria exatamente a comparação que decide.

**Os três sem candidato têm motivo, e não foram forçados.** O pacote de combate é corpo a
corpo e medieval — arco, flecha, escudo, estocada — e **não tem impacto de projétil em
superfície**: `Hit_Generic` é pancada de luta, não bala em parede. E o ferrolho que existe
é de revólver (`Hammer_Back`, `Spinning_Cylinder`), bombeada (`Pumping`) e alavanca
(`Loading_Gate`), não de fuzil. Forçar um casamento aqui seria inventar procedência sonora
— o mesmo erro do contrato de licença, com outra roupa.

Achado útil de graça: as 3 famílias `Gunshot_Distant_` são matéria-prima pronta para o
bloqueio 2 (lei de distância), por camada em vez de curva inventada.

## Seleção reversível e o fallback

`derivados` está **vazio** e os 8 eventos do piloto estão em `decisao: "synth"`. Esse é o
estado correto: o pacote não foi baixado, e preencher hash e origem de arquivo que ninguém
viu seria inventar a procedência que o contrato existe para impedir.

O A/B é uma palavra no ledger: `synth` ↔ `derivado` por evento. No runtime, o interruptor
que já existia continua valendo — `weaponSamples` no manifest liga o caminho por sample, e
sem ele (ou para arma fora de `weapons`) o synth toca. ESP6 é a régua que impede o fallback
de morrer calado.

## Portões: baseline herdado × regressão nova

Baseline medido nesta árvore **antes** de qualquer alteração:

```
npm run check:fast   ->  69/70 passaram (91,5 s)
                         falhou: audio:check
```

`audio:check` é vermelho **por ambiente, não por regressão**: `public/audio/` é gitignored e
esta worktree nunca rodou `fetch-audio.sh`, então o gerador vê 0 arquivos no disco e acusa
"manifest DEFASADO". `assert:assets` reprova pelo mesmo motivo, mais os 196 decalques do
acervo. Nenhum dos dois é medível aqui sem baixar os pacotes, o que está fora do escopo
desta rodada.

Depois das alterações, com os 4 passos novos no `check:fast`:

```
npm run check:fast   ->  73/74 passaram (107,6 s)   [1ª rodada]
                         falhou: audio:check

npm run check:fast   ->  74/75 passaram ( 92,7 s)   [2ª rodada]
                         falhou: audio:check
```

**Nenhuma regressão nova em nenhuma das duas.** Os 5 passos acrescentados no total
(`eval:audioalcance`, `eval:audioespacial`, `eval:audioproc`, `audio:inventario:autoteste`,
`audio:shortlist:autoteste`) entram verdes, os 69 do baseline continuam passando, e o único
vermelho é sempre o mesmo, pelo mesmo motivo de ambiente. `docs:check` e `arch:check`
verdes com os blocos regerados.

As nove mutações das três réguas foram rodadas contra o código já verde e **todas as nove
saem 1**: ALC `nome-trocado|sem-copia|sem-menu-music`, ESP `sem-pan|sem-propagacao|duck-fixo`,
PRV `aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao`.

## Resultados aceitos e rejeitados

Aceito:

- começar por um piloto pequeno, comparável e reversível;
- manter fallback synth para todo evento ainda não aprovado;
- guardar fontes em staging privado fora do repositório;
- usar análise determinística local (`ffprobe`, waveform, loudness e duração), sem enviar os
  WAVs ao Claude;
- corrigir os dois defeitos de pipeline **antes** de o pacote entrar, com régua vermelha
  commitada antes de cada conserto.

Rejeitado:

- trocar todas as armas e eventos de uma vez;
- publicar os arquivos fonte ou o pacote bruto;
- reutilizar referências de Valve/CS, Sounddogs ou captura de YouTube;
- declarar sucesso só porque manifesto e testes passam, sem escuta no jogo real;
- **inventar a lei de volume por distância do sample** — ver o bloqueio 2 abaixo.

## Limitações desta rodada

- **Nenhuma escuta humana aconteceu.** Nem uma. Todas as réguas provam alcance,
  espacialização, procedência, recusa de redistribuição e determinismo — **nenhuma delas
  ouve nada**. O único registro de escuta gravado foi um teste de fumaça do servidor, e ele
  foi apagado justamente para que ninguém confunda smoke test com aprovação.
- **Nenhum byte de áudio entrou no modelo.** O que foi lido foi `catalog.json` e
  `inventory.json` — nome, hash, duração, canais, taxa, pico, loudness. A listagem diz
  `Allows usage with AI: No` e isso foi respeitado.
- **O caminho por sample nunca rodou num navegador.** `_shotSample` foi medido num
  `AudioContext` falso; `decodeAudioData` real e latência real seguem não medidos.
- **A página A/B nunca foi aberta por uma pessoa.** Ela responde 200 e grava a linha; se a
  comparação é *útil* para decidir, só o Ruben responde.
- **`audio:check` e `assert:assets` seguem vermelhos nesta worktree**, por ausência de
  insumo (`public/audio/` é gitignored e o `fetch-audio.sh` nunca rodou aqui).
- **O pacote publicado é anterior à regra `ambiente`**, e agora também é anterior à trava de
  redistribuição. Regerar o pack é obrigatório antes de qualquer deploy.

## Bloqueios

### 1. Como o derivado Fab chega ao jogador — P0, ABERTO

**Este é o bloqueio que trava o piloto.** O `audio-pack.zip` é publicado como asset de
release (`fetch-audio.sh` aponta para `audio-pack-v8`) e é um arquivo **só de áudio**:
qualquer pessoa baixa um pacote de sons navegável, sem o jogo. É literalmente a forma que a
Fab Standard License proíbe — `redistribuicao: proibida-standalone`. **Nome hasheado não
resolve**: o que é redistribuído é o conteúdo, não o nome.

O que está feito é a **proibição**, em duas camadas, para que nada vaze por engano:

| Camada | Onde | O que faz |
|---|---|---|
| trava | `scripts/build-audio-pack.mjs` | recusa por sha-256 e sai 1 **antes** de o zip existir |
| 2ª camada | `tools/eval/assets-check.mjs` | reprova o pacote instalado que contenha derivado proibido |

**O que NÃO está decidido, e não foi inventado:** como o derivado chega ao jogador sem ser
redistribuído como pacote separado. As opções — servir individualmente a partir do build,
zip privado fora de release pública, ou não usar Fab e ficar no synth/fonte livre — têm
implicações jurídicas que não são minhas para escolher. Estão escritas em
[`PROVENIENCIA.md`](PROVENIENCIA.md). **Decisão do dono.**

### 2. Lei de volume por distância do sample — exige ouvido

O caminho por sample honra pan, propagação e duck; **não** honra atenuação de nível por
distância. O synth não atenua nível, troca timbre, e o chamador manda `vol` fixo em `0.45`
para bot de qualquer distância. Um sample é plano e não tem esse mecanismo.

Novidade desta rodada: **o pacote tem 16 arquivos `Gunshot_Distant_` em 3 famílias**, que é
matéria-prima pronta para resolver isto por camada em vez de por curva inventada. Continua
sendo decisão de ouvido — teto sem procedência é opinião (lei 2 do `AGENTS.md`).

### 3. Rajada com `BufferSource` — exige navegador

Em full-auto, 8 bots podem disparar ~50 tiros/s (`game.js:6329`). Cada um cria
`BufferSource + gain + panner`. O synth já criava mais nós que isso por tiro, então o custo
tende a cair — mas isso é raciocínio, não medição.

### 4. Três eventos do piloto sem candidato no pacote

`ak.bolt`, `impacto.concreto` e `impacto.metal` não têm som semanticamente bom no Action
Game Sounds Pack (ver a seção da shortlist). Não foram forçados. Ou saem do piloto, ou
saem de outra fonte, ou ficam no synth. **Decisão do dono.**

## Próximo passo concreto

1. ~~mapear o caminho real de áudio e registrar o baseline~~ **feito**;
2. ~~fechar o alcance do empacotamento~~ **feito**;
3. ~~fechar a espacialização do tiro por sample~~ **feito**;
4. ~~contrato de procedência e ferramenta de inventário~~ **feito**;
5. ~~baixar o pacote~~ **feito pelo dono** — 900/900 WAVs, PCM estéreo 44,1 kHz/16 bits,
   2022 s no total, em staging privado fora do Git;
6. ~~fechar os cinco bloqueadores da revisão independente~~ **feito** (ver a tabela de
   commits);
7. ~~shortlist por metadado e página de escuta A/B~~ **feito**;
8. **[bloqueado — decisão do dono]** escolher a forma de incorporação do bloqueio 1. Nada
   de Fab pode entrar numa build antes disso, e a trava garante que não entre;
9. **[para o Ruben, de manhã]** abrir a escuta A/B e decidir:

   ```bash
   npm run audio:ab -- /Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack --por=ruben
   ```

   Comparar cada candidato contra o synth (lado B). As perguntas abertas são: qual das 8
   famílias de `Gunshot_` soa como AK; se `Load_1` serve de ferrolho ou não; e o que fazer
   com os três eventos sem candidato (bloqueio 4);
10. só depois disso escrever as entradas de `derivados` no ledger, com os dois hashes e
    `escutaAB` preenchido — a PRV2 reprova `aprovado` sem escuta;
11. regerar o pack e rodar `assert:assets` contra ele: é lá que a cláusula de ambiente e a
    PRV5 saem de fixture e viram medição de produção;
12. medir o custo de rajada num navegador antes de expandir para outras armas.

## Comandos de validação

```bash
npm run eval:audioalcance      # ALC1-ALC3  pipeline alcança o que o código nomeia
npm run eval:audioespacial     # ESP1-ESP8  pan, propagação, duck, fallback, volume
npm run eval:audioproc         # PRV1-PRV7  ledger, redistribuição, controle do gerador
npm run audio:inventario:autoteste
npm run audio:shortlist:autoteste
npm run check:fast             # os cinco acima entram aqui
npm run assert:assets          # PRV5 + ambiente contra o pacote instalado (precisa do pack)
```

Mutações que provam que cada uma morde:

```bash
node tools/eval/audio-alcance-check.mjs --mutante=nome-trocado|sem-copia|sem-menu-music
node tools/eval/audio-espacial-check.mjs --mutante=sem-pan|sem-propagacao|duck-fixo
node tools/eval/audio-proveniencia-check.mjs --mutante=aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao
```

## Estado privado e hashes

Fora do Git, ignorado por `.gitignore` (`private-assets/`):

```
/Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack/
  extracted-wav/catalog.json   sha256 51de2264a7c764053bda638d0eb40a852d2eb9942a54de0f3840c60a8b2dbea1
  inventory.json               sha256 cde11d7759e2f81f6909035991999d08266537b777cb761a42e8b775283c27c6
  shortlist-piloto.json        gerado por `npm run audio:shortlist`
  decisoes-escuta.jsonl        criado pela página A/B (não existe até alguém escutar)
```

Os dois primeiros hashes foram conferidos nesta rodada e batem com o estado declarado.
900 WAVs, PCM estéreo 44,1 kHz/16 bits, 2022 s. Categorias: Combat 146, Doors 50,
Environment 103, Explosions 70, Footstep 168, Guns 127, Human_Vocalizations 66,
Interface 92, Misc 78.
