# Procedência do áudio — o contrato

> O ledger é `docs/audio/proveniencia.json`. Este arquivo diz **o que cada campo significa
> e por que ele existe**. Quem declara é o JSON; quem cobra são as réguas.

O repositório é público e `public/audio/` é ignorado (`.gitignore`, seção Áudio). Isso
protege o git, e **só o git**: o pacote de áudio é montado à parte e servido em produção,
então um arquivo de procedência desconhecida pode chegar ao jogador sem nunca ter passado
por um commit. Este contrato é o que fecha esse caminho.

Ele existe pelo mesmo motivo do `assert:assets`: **não saber tem que custar o mesmo que
estar errado** (lição 5 de [`docs/LICOES.md`](../LICOES.md)). Asset sem origem declarada
não é "asset ainda não catalogado" — é asset que não pode entrar numa build.

## As réguas

| Régua | O que cobra | Onde roda |
|---|---|---|
| `npm run eval:audioproc` | PRV1–PRV4: forma do ledger, aprovação, cobertura do piloto | `check:fast` (node puro) |
| `npm run assert:assets` | PRV5: nenhum arquivo instalado casa (por sha-256) derivado proibido ou não aprovado | build da Vercel |
| `npm run eval:audioproc` | PRV6: o empacotador recusa derivado `proibida-standalone` — fixture end-to-end | `check:fast` |
| `npm run eval:audioproc` | PRV7: a decisão do ledger controla o gerador · PRV8: `sha256Fonte` conferido contra o arquivo real · PRV9: o legado CS/Valve/UT catalogado | `check:fast` |
| `npm run eval:audioproc` | PRV10–PRV13: fail-closed nas três camadas, cada uma medida pelo script real contra fixture, com irmã | `check:fast` |
| `npm run eval:audioproc` | PRV14: raízes locais Fab/BOOM/Fish/legado fora de `audio/piloto/` também obedecem à licença; CC0 livre passa | `check:fast` |
| `npm run eval:audiocapacidade` | CAP1–CAP5: só se aprova evento que o runtime sabe tocar especificamente | `check:fast` |

`eval:audioproc --mutante=aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao` é a
prova de que elas mordem.

## `fontes`

Uma entrada por origem, incluindo a obra própria (`synth`). Sem fonte declarada, nenhum
derivado é aceito.

O laboratório também pode apontar para uma geração Fish feita somente de texto. O modelo
público escolhido nesta rodada é rotulado pelo próprio provedor como “Mortal Kombat”; estar
visível na biblioteca não prova licença para publicar a voz em um jogo. Por isso o staging
declara `rights-review-required`, permanece fora do Git e não pode entrar no pacote de áudio.

| Campo | O que é |
|---|---|
| `titulo`, `autor`, `url` | de onde veio, com link verificável |
| `licenca` | o nome exato da licença sob a qual foi adquirido |
| `redistribuicao` | `livre` · `proibida-standalone` · `proibida` — o que **não** pode ser republicado |
| `usoComIA` | `sim` ou `nao`, copiado da listagem. `nao` proíbe o arquivo como entrada de modelo |
| `stagingPrivado` | onde a fonte mora FORA do git, ou `null` quando não há arquivo |
| `notas` | o que um humano precisa saber antes de mexer |

`redistribuicao: "proibida-standalone"` é o caso da Fab Standard License: o som pode ser
incorporado ao jogo, e **não** pode ser publicado como pacote de sons. Na prática isso
proíbe o WAV solto num release, num zip navegável e no repositório.

`raizesRuntime` liga os diretórios criados pelo instalador local às respectivas fontes. Eles
não ficam sob `prefixoDerivado`; sem essa ligação, Fab, BOOM, Fish e callouts legados
atravessavam o empacotador como caminhos "fora do contrato". O contexto local continua
permitido para escuta. O contexto de pack público herda `redistribuicao` da fonte e recusa.

## `derivados`

Uma entrada por arquivo que chega ao jogador. Hoje a lista está **vazia**, e isso é o
estado correto **mesmo com o pack já baixado** (04/09, 900 WAVs em staging privado): o
take fonte `Gunshot_1-1.wav` foi aprovado pelo dono dentro do laboratório local, mas nenhum
arquivo de release foi criado, transformado e aprovado. Aprovação de fonte para teste não
vira derivado nem autorização de publicação. Campo de asset preenchido com palpite é pior
que campo ausente.

| Campo | O que é |
|---|---|
| `arquivo` | o caminho como o manifest o nomeia (`audio/piloto/…`) |
| `evento` | qual evento do jogo ele serve — o mesmo nome usado em `piloto` |
| `fonte` | chave de `fontes` |
| `origemNoPack` | caminho relativo do arquivo dentro do pacote fonte |
| `sha256` | hash do arquivo **derivado**, o que vai para a build |
| `sha256Fonte` | hash do arquivo **fonte**, para provar de qual arquivo ele saiu |
| `transformacao` | corte, ganho, conversão, taxa — o que foi feito entre um e outro |
| `aprovacao` | `pendente` · `aprovado` · `rejeitado` |
| `escutaAB` | quem ouviu, quando e o que achou — `null` enquanto ninguém ouviu |

Os dois hashes existem porque são perguntas diferentes: `sha256` responde "é este o arquivo
que está na build?", e `sha256Fonte` responde "ele veio mesmo do pacote que a gente
comprou?". Com um só, trocar o arquivo fonte por outro passaria despercebido.

`origemNoPack` e `sha256Fonte` são preenchidos pelo
`node tools/audio/inventariar.mjs`, que lê o staging privado e emite **só metadado**.

## `escutasLocais`

Registra uma decisão humana sobre o arquivo **fonte** tocado diretamente pelo symlink do
laboratório. Ela fixa evento, origem e `sha256Fonte`, além de quem ouviu, quando e em qual
contexto. Não é a mesma coisa que `derivados[].escutaAB`: ainda não existe um asset de
release para comparar e aprovar.

Por isso toda escuta local declara `publicacaoAutorizada: false` e
`derivadoRelease: null`. A PRV2b reprova se uma automação tentar inferir publicação ou
derivado a partir da frase de aprovação do dono. A PRV8b confere o hash da fonte contra o
staging quando ele está presente, sem entregar bytes do WAV a modelo algum.

## O bloqueio da redistribuição pública e o canal privado

**O `audio-pack.zip` público não pode levar derivado Fab.** Um asset de GitHub Release é um
arquivo **só de áudio** disponível separadamente do jogo:
qualquer pessoa baixa um pacote de sons navegável, sem o jogo. Essa é literalmente a forma
que a Fab Standard License proíbe — `redistribuicao: proibida-standalone`. **Nome hasheado
não resolve**: o que é redistribuído é o conteúdo, não o nome, e um zip de 300 WAVs com
nomes opacos continua sendo um pacote de sons.

O que está implementado é a **proibição**, em três camadas e **fail-closed**:

| Camada | Onde | O que faz |
|---|---|---|
| autoria | `tools/gen-audio-manifest.mjs` | não deixa entrar no manifest local |
| **decisiva** | `scripts/build-audio-pack.mjs` | recusa e sai 1 **antes** de o zip existir |
| 2ª linha | `tools/eval/assets-check.mjs` | reprova o pacote instalado |

As três chamam `tools/audio/politica.mjs` — a mesma função, não três cópias da decisão
(lição 2). A camada decisiva é o empacotador porque ele roda **antes** do rename para
`audio/a/<sha1>` e ainda vê o caminho.

**Sem ledger, as três abortam.** O gerador era a exceção até a 5ª rodada: ele fazia
`return null` e seguia, então com o ledger ausente saía 0 e mantinha o não catalogado no
manifest. "Não consigo verificar" virava "pode passar". Agora aborta nos dois modos,
inclusive `--check`, que é o que roda no portão.

**As três têm prova automatizada** — PRV10 (empacotador), PRV11/PRV12 (gerador) e PRV13
(`assets-check`), cada uma rodando o script real contra fixture, e cada uma com cláusula
irmã que impede "recusar tudo" de passar por proteção. Até a 5ª rodada a do `assets-check`
era manual, e prova manual não roda no portão.

**A regra é ALLOWLIST.** Até a 4ª rodada era denylist, montada de `ledger.derivados`: um
arquivo não catalogado sob `audio/piloto/` não casava hash nenhum, não era barrado, e o
empacotador saía **0** gerando o zip com ele dentro. A régua perguntava "é um mau
conhecido?" quando o estado ruim era "desconhecido" — lição 1. Agora, sob o prefixo
derivado, o silêncio do ledger é recusa.

Em 05/09 apareceu a mesma falha numa segunda borda: os diretórios do instalador não viviam
sob esse prefixo. O builder real montou 161 MB e saiu 0 mesmo contendo raízes que o ledger
declarava proibidas. A PRV14 fecha essa borda por origem de runtime e prova também a irmã
CC0 livre.

**Limites declarados, não cobertos:** pós-rename o prefixo some e um derivado não
catalogado é indistinguível de qualquer outro áudio; e o legado é barrado por NOME, porque
não há hash — renomear um arquivo legado o faria escapar.

### Canal escolhido pelo dono

Em 05/09/2026 o dono escolheu manter o pacote de transporte em um Vercel Blob **privado**,
acessível apenas pelo build, e incorporar seus arquivos ao produto web. O modo padrão de
`build-audio-pack.mjs` continua sendo público e mantém todas as recusas acima. O modo
`--private-build` é uma segunda fronteira, fail-closed: somente uma raiz de runtime cuja
fonte declare `deployPrivado.build: true` atravessa. Caminho desconhecido e raiz sem decisão
explícita reprovam.

O fetch reconhece somente o host `*.private.blob.vercel-storage.com`, exige
`BLOB_READ_WRITE_TOKEN` e `AUDIO_PACK_SHA256`, envia o bearer apenas para esse host e
verifica o SHA-256 antes de extrair. Assim, o ZIP não é um asset público navegável e uma URL
adulterada não recebe a credencial. `eval:audioprivate`, `eval:assetfetch` e
`eval:audioruntimeassets` medem allowlist, transporte e cobertura dos mapas, com mutantes que
retiram autorização, autenticação, hash ou o override de um mapa.

Essa decisão permite Fab e BOOM conforme as licenças de incorporação registradas no ledger;
não libera qualquer origem marcada apenas para armazenamento. Fish permanece
`deployPrivado.build: false`: foi preservado no Blob privado, mas não é entregue ao jogador
porque os direitos da voz pública rotulada “Mortal Kombat” não foram verificados. A
[documentação oficial da Fish](https://docs.fish.audio/developer-guide/best-practices/voice-cloning)
atribui ao usuário a responsabilidade de obter permissão para a voz clonada. Os callouts
legados permanecem excluídos.

## O legado que esta lane NÃO resolveu

`public/audio/manifest.example.json` é **versionado** e é o que o `fetch-audio.sh` copia
quando o zip não traz manifest. Medido: **45 de 62** caminhos dele são nomes que apontam
para Valve e Epic — `awp-cs-1-6`, `usp_unsil`, `knife_slash`, `half-life`,
`ut-double-kill`, `m4a1_unsil`. O próprio `public/js/audio.js:2` diz que sample real de CS
não pode ser embutido.

**Esta branch não substituiu nenhum deles.** Dizer o contrário seria a mentira mais fácil de
contar aqui, então há uma régua que impede: a PRV9 cobra que eles estejam catalogados como
`bloqueado-por-procedencia-desconhecida`, com a fonte marcada `redistribuicao: "proibida"`,
e reprova se alguém marcar essa fonte como `livre` ou declarar que a PRV5 os cobre.

**A PRV5 não os cobre, e isso está escrito no ledger** (`legado.cobertoPorPRV5: false`): ela
casa por sha-256 e estes arquivos não existem em clone limpo. Sem hash não há o que casar.
A cobertura por conteúdo só passa a existir quando alguém inventariar o pacote real.

A catalogação é por PADRÃO, recomputada do manifest a cada execução — lista de 45 caminhos
escrita à mão envelheceria no primeiro som novo. A PRV9 cobra nos dois sentidos: caminho
suspeito sem padrão declarado reprova, e padrão declarado que não casa nada também, porque
padrão morto dá falso conforto de "está catalogado".

## A regra que não se negocia

**`aprovacao: "aprovado"` exige `escutaAB` preenchido.** Manifesto verde e régua verde não
aprovam som: PRV1–PRV5 provam que o arquivo chegou inteiro, que veio de onde diz que veio e
que a pipeline o alcança — nenhuma delas ouve nada. A aprovação é do dono, no jogo real,
comparando A/B contra o synth. É por isso que a régua reprova o `aprovado` sem escuta em
vez de confiar em quem editou o JSON.

O caminho reversível existe para isso: enquanto o evento está em `decisao: "synth"`, o jogo
toca o sintetizado; trocar para `derivado` liga o arquivo. Voltar é editar uma palavra.
