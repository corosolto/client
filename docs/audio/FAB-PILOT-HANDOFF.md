# Piloto de áudio Fab — handoff

Atualizado em 2026-09-04.

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
npm run check:fast   ->  73/74 passaram (107,6 s)
                         falhou: audio:check
```

**Nenhuma regressão nova.** Os 4 passos acrescentados (`eval:audioalcance`,
`eval:audioespacial`, `eval:audioproc`, `audio:inventario:autoteste`) entram verdes, os 69
que passavam continuam passando, e o único vermelho é o mesmo do baseline, pelo mesmo
motivo de ambiente. `docs:check` e `arch:check` verdes com os blocos regerados.

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

- **Nenhum som foi ouvido.** Oito cláusulas verdes não são um som bom. Elas provam alcance,
  espacialização, procedência e determinismo — nenhuma delas é evidência estética.
- **O caminho por sample nunca rodou num navegador.** `_shotSample` foi medido num
  `AudioContext` falso; `decodeAudioData` real, latência real e o custo de uma rajada de
  full-auto com `BufferSource` por tiro continuam não medidos.
- **`audio:check` e `assert:assets` seguem vermelhos nesta worktree**, por ausência de
  insumo. A cláusula de ambiente do `assets-check` e a PRV5 foram provadas em fixture local,
  não contra o pacote de produção.
- **Só `map_corrego.js` declara `world.sound` hoje.** O conserto do alcance vale para os
  17 caminhos que o código nomeia; quantos deles existem no pacote publicado é uma pergunta
  que só o `assert:assets` com o pack instalado responde.
- **O pacote publicado é anterior à regra `ambiente`.** Mesmo com o gerador consertado, a
  release `audio-pack-v8` que o `fetch-audio.sh` aponta não contém `ambiente/`. O ambiente
  só chega ao jogador depois de regerar o pack e publicar uma release nova.

## Bloqueios

### 1. Download do pacote (herdado, não resolvido)

Falta autorização do dono para executar o código comunitário fixado do `epic-fab` e concluir
o OAuth da conta Epic. A execução proposta usa um `XDG_CONFIG_HOME` temporário, baixa somente
o asset comprado para staging privado e apaga o token local ao terminar.

Auditoria estática já feita, no commit `d9721b9a178df161f42d876881ef0fe75444ec0b`: sem
dependência de runtime, listener, subprocesso ou telemetria; token gravado com modo `0600`;
downloads verificam SHA-1. A ferramenta é nova, pouco usada, sem testes funcionais, com
commit não assinado e um pequeno erro de versão — **não deve ser executada sem aprovação
explícita**.

### 2. Lei de volume por distância do sample (novo, exige ouvido)

O caminho por sample agora honra pan, propagação e duck. **Não** honra atenuação de nível
por distância, e isso é deliberado: o synth não atenua nível — ele troca o timbre (perto =
crack, longe = boom) — e o chamador manda `vol` fixo em `0.45` para bot de qualquer
distância. Um sample é plano e não tem esse mecanismo, então alguma lei de nível
provavelmente é necessária.

Qual lei é decisão de ouvido, não de teste, e teto sem procedência é opinião (lei 2 do
`AGENTS.md`). Precisa de escuta A/B do dono, com um bot atirando a 5, 20 e 40 m, antes de
virar número. A régua ESP declara essa ausência no cabeçalho em vez de fingir que mediu.

### 3. Rajada com `BufferSource` (novo, exige navegador)

Em full-auto, 8 bots podem disparar ~50 tiros/s (`game.js:6329`). Cada um agora cria
`BufferSource + gain + panner`. O synth já criava mais nós que isso por tiro, então o custo
tende a cair — mas isso é raciocínio, não medição. Precisa de uma rodada com `eval:boot` ou
captura de navegador antes de o pack entrar em produção.

## Próximo passo concreto

Ordem, com o que já está pronto marcado:

1. ~~mapear o caminho real de áudio e registrar o baseline dos portões~~ **feito**;
2. ~~fechar o alcance do empacotamento, com régua vermelha antes~~ **feito**;
3. ~~fechar a espacialização do tiro por sample, com régua vermelha antes~~ **feito**;
4. ~~contrato de procedência por asset e ferramenta de inventário~~ **feito**;
5. **[bloqueado]** autorizar e executar o `epic-fab` fixado, sem instalação global,
   autenticando só em endpoints oficiais da Epic/Fab;
6. baixar para `/Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack`
   (já ignorado pelo git);
7. `node tools/audio/inventariar.mjs <staging> --saida=<fora-do-repo>.json` — metadado, sem
   mandar áudio a modelo;
8. selecionar candidatos cegos pelos metadados, converter, e escrever a entrada de cada
   derivado em `docs/audio/proveniencia.json` com os dois hashes;
9. regerar o pack (`node scripts/build-audio-pack.mjs <out>`) e publicar a release nova —
   é o que finalmente leva `ambiente/` e os derivados ao jogador;
10. rodar `assert:assets` contra o pack instalado: é lá que a cláusula de ambiente e a PRV5
    saem de fixture e viram medição de produção;
11. **escuta A/B do dono no jogo real**, incluindo a decisão do bloqueio 2 (lei de volume
    por distância). Só depois disso um evento sai de `synth` para `derivado`;
12. medir o custo de rajada num navegador antes de expandir para outras armas.
