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

`eval:audioproc --mutante=aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao` é a
prova de que elas mordem.

## `fontes`

Uma entrada por origem, incluindo a obra própria (`synth`). Sem fonte declarada, nenhum
derivado é aceito.

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

## `derivados`

Uma entrada por arquivo que chega ao jogador. Hoje a lista está **vazia**, e isso é o
estado correto: o pack ainda não foi baixado, e campo de asset inexistente preenchido com
palpite é pior que campo ausente.

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

## O bloqueio da redistribuição — P0, e sem solução inventada

**O `audio-pack.zip` não pode levar derivado Fab.** Ele é publicado como asset de release
(`scripts/fetch-audio.sh` aponta para `audio-pack-v8`), e é um arquivo **só de áudio**:
qualquer pessoa baixa um pacote de sons navegável, sem o jogo. Essa é literalmente a forma
que a Fab Standard License proíbe — `redistribuicao: proibida-standalone`. **Nome hasheado
não resolve**: o que é redistribuído é o conteúdo, não o nome, e um zip de 300 WAVs com
nomes opacos continua sendo um pacote de sons.

O que está implementado é a **proibição**, em duas camadas:

| Camada | Onde | O que faz |
|---|---|---|
| trava | `scripts/build-audio-pack.mjs` | recusa por sha-256 e sai 1 **antes** de o zip existir |
| segunda camada | `tools/eval/assets-check.mjs` | reprova o pacote instalado que contenha um derivado proibido |

A trava é no empacotador porque é ele que monta o zip, e ele tem os bytes. A régua do
`assets-check` casa por **sha-256**, não por caminho — o empacotador reescreve todo caminho
para `audio/a/<sha1>`, e a versão anterior desta cláusula filtrava por prefixo
`audio/piloto/`, o que casava **zero** no manifest que o jogador recebe.

### O que NÃO está decidido

**Como o derivado Fab chega ao jogador sem ser redistribuído como pacote separado é uma
questão em aberto, e este documento não a responde.** As opções que existem têm implicações
legais e de arquitetura que não são minhas para escolher:

- servir os arquivos individualmente a partir do build do jogo, sem zip navegável;
- manter o zip, mas privado e fora de release pública (bucket com credencial de build);
- não usar Fab para o piloto e ficar no synth ou em fonte `livre`.

Nenhuma delas foi escolhida, nenhuma foi implementada, e a diferença entre "incorporado ao
jogo" e "redistribuído" nesses cenários é julgamento jurídico. **O piloto fica bloqueado
neste ponto** até o dono decidir — ver o bloqueio 1 de
[`FAB-PILOT-HANDOFF.md`](FAB-PILOT-HANDOFF.md). Enquanto isso, a trava garante que nada
vaze por engano.

## A regra que não se negocia

**`aprovacao: "aprovado"` exige `escutaAB` preenchido.** Manifesto verde e régua verde não
aprovam som: PRV1–PRV5 provam que o arquivo chegou inteiro, que veio de onde diz que veio e
que a pipeline o alcança — nenhuma delas ouve nada. A aprovação é do dono, no jogo real,
comparando A/B contra o synth. É por isso que a régua reprova o `aprovado` sem escuta em
vez de confiar em quem editou o JSON.

O caminho reversível existe para isso: enquanto o evento está em `decisao: "synth"`, o jogo
toca o sintetizado; trocar para `derivado` liga o arquivo. Voltar é editar uma palavra.
