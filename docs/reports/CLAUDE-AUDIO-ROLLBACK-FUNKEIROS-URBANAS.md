# Rollback seletivo das vozes de Funkeiros e Tribos Urbanas — investigação

Data: 2026-09-06

Branch: `claude/audio-funkeiros-urbanas-rollback` (base `origin/main` em `42c01175`)

Resultado: **BLOQUEADO — nenhum manifesto foi alterado**

## Pedido

O dono relatou que os áudios de personagem gerados por IA de Funkeiros (facção `F`) e
Tribos Urbanas (facção `U`) estão ruins, e pediu o rollback seletivo das referências
para "as vozes antigas aprovadas atribuídas ao **ememe**".

O rollback não foi executado porque a autoria citada não existe no repositório e porque
não há, no Git, nenhum estado anterior de referência de voz de `F` ou `U` para o qual
voltar. As duas condições de parada combinadas estão detalhadas abaixo.

## Fontes examinadas

Cobertura do histórico: 2753 commits alcançáveis, 568 refs (todas as branches locais e
remotas presentes na worktree).

| Fonte | Comando | Resultado |
| --- | --- | --- |
| Mensagens de commit | `git log --all -i --grep='ememe'` | 0 |
| Conteúdo de diffs | `git log --all -S'ememe' --pickaxe-regex -i` | 0 |
| Todos os blobs de todos os commits | `git grep -I -l -i 'ememe' $(git rev-list --all)` | 0 |
| Autores/committers | `git log --all --format='%an <%ae>' \| sort -u` | 0 (nenhum `ememe`) |
| Árvore de trabalho | `grep -ri 'ememe'` | 0 (único acerto é ruído binário em `public/models/props/construction_rubble.glb`) |

Commits e arquivos lidos na investigação:

- `6c667acd` `fix(audio): associa bordoes aos personagens` — cria
  `CHARACTER_SELECT_VOICE` em `public/js/audio.js`, com os únicos bordões de `F`/`U`
  versionados.
- `9c2900ff` `fix(audio): troca voz do Faria Limer` — única troca posterior no mapa, e é
  do time `B` (fora de escopo).
- `0643fc76`, `4c8b3642`, `c79dee67` — pilotos, falas finais e recibos dos Funkeiros
  (lane `feat/audio-voices-test`; `c79dee67` **não** é ancestral do HEAD).
- `d9b444a2`, `4921a9d4`, `3abd9072` — elenco Mítico e "upgrade dos funkeiros"; pack v7→v8.
- `bf6fd5f0`, `40f3481a`, `42d4570a`, `9d2ac2a3`, `5001874b` — lane das vozes Míticas.
- `ad063029` (não ancestral) e `c9e17bc9` `fix(audio): restaurar vozes aprovadas e remover
  falas genericas (#510)` — estado atual de `F`.
- `1a53d0ba` / `7fb0510f` `fix(audio): remover fallback de voz sintetica`.
- `1284ab42` `fix(factions): remove cancelled additional teams and their assets` — esvazia
  `content/voice-lines.json`; **não** é ancestral do HEAD (o arquivo não existe no HEAD).
- Arquivos: `public/js/audio.js`, `scripts/fetch-audio.sh`, `tools/gen-audio-manifest.mjs`,
  `tools/audio/stage-approved-character-voices.mjs`, `tools/audio/fab-game-local.mjs`,
  `docs/audio/proveniencia.json`, `docs/audio/PROVENIENCIA.md`, `docs/TRIBOS-URBANAS.md`,
  `public/audio/manifest.example.json`, `tools/eval/character-select-voice-check.mjs`,
  `tools/eval/audio-voice-mix-check.mjs`.

## Onde as vozes de `F` e `U` moram hoje

Os bytes de áudio **não estão no Git** em nenhum momento da história. O runtime monta as
vozes de três origens, e só a primeira é versionada:

1. `public/js/audio.js:17-24` — `CHARACTER_SELECT_VOICE`, seis bordões por hash. Deles,
   `F` tem um (`funkraiz`) e `U` tem dois (`clubber`, `reggae`).
2. Pool por facção do manifesto de runtime (`voice.F`, `voice.U`), gerado **do disco** por
   `tools/gen-audio-manifest.mjs:51` (`tribos → U`, `funkeiros → F`) a partir de
   `public/audio/<facção>/ingame/`, que vem do pacote privado baixado por
   `scripts/fetch-audio.sh` (release `audio-pack-v8`). Nada disso é versionado — o
   `public/audio/manifest.example.json` versionado só tem `P` e `B`.
3. `characterVoice.<id>` estruturado dos Funkeiros, espelhado de staging privado por
   `tools/audio/stage-approved-character-voices.mjs`, fora do repositório.

## Mapeamento personagem → voz: por que não há candidato

| Facção | Personagem | Referência versionada | Última mudança | Candidato "antigo aprovado" |
| --- | --- | --- | --- | --- |
| F | `funkraiz` | `audio/a/d5b87c3d2638e166.mp3` (`public/js/audio.js:23`) | `6c667acd` (2026-08-16) | nenhum — valor nunca mudou |
| F | demais 8 (`mandrake`, `raul`, `oakley`, `criarj`, `chave`, `trapfunk`, `fluxo`, `ostentacao`) | nenhuma | — | nenhum — as falas vivem em staging privado |
| U | `clubber` | `audio/a/08290068f8d9935f.mp3` (`public/js/audio.js:21`) | `6c667acd` (2026-08-16) | nenhum — valor nunca mudou |
| U | `reggae` | `audio/a/f180be207d0b440b.mp3` (`public/js/audio.js:22`) | `6c667acd` (2026-08-16) | nenhum — valor nunca mudou |
| U | demais 7 (`emo`, `blackmetal`, `metaleiro`, `punk`, `skatista`, `rapper`, `pagodeiro`) | nenhuma | — | nenhum — sem catálogo por personagem |

`git log --all -S'funkraiz' -- public/js/audio.js` e `git log --all -S'clubber' --
public/js/audio.js` retornam **um único commit cada** (`6c667acd`). Não existe versão
anterior dessas referências: elas nasceram com o valor atual e nunca foram trocadas.

## Bloqueios

**B1 — a autoria "ememe" não existe.** Nenhum commit, blob, autor ou campo de procedência
menciona `ememe` em toda a história. A procedência das vozes de personagem dos Funkeiros
está registrada em `docs/audio/proveniencia.json:195-211` como
`character-voices-openrouter-gemini`, autor `"CS BRASIL / CORO SOLTO via OpenRouter e
Google Gemini TTS"`, licença `gemini-api-generated-content-...`, autorizada por `"Ruben"`
em 2026-09-06. O recibo de geração (`c79dee67`) confirma `provider: openrouter`,
`modelId: google/gemini-3.1-flash-tts-preview`, "nenhuma clonagem". Nenhuma das demais
entradas de procedência (`PlaceHolder Inc.`, `BOOM Library`, `Ben Jaszczak et al.`,
`fish-audio-mortal-kombat-public-model`, `menu-main-alpha218`, `legado-nominal-cs-valve-ut`)
atribui autoria a `ememe`. Sem isso não há como identificar "o asset aprovado" pedido.

**B2 — não há alvo de rollback versionado.** Como as vozes de `F` e `U` são pools gerados
do disco a partir do pacote privado, um `git revert` de manifesto não restaura timbre
nenhum. As três referências versionadas de `F`/`U` são idênticas desde 2026-08-16, então
"voltar ao estado anterior" seria um no-op.

**B3 — o único gatilho de versão disponível é destrutivo e fora de escopo.** A única
alavanca versionada que muda os pools é `scripts/fetch-audio.sh:14` (`audio-pack-v8`).
Voltar para `audio-pack-v7` foi descartado por três motivos: (a) o v8 é descrito em
`3abd9072` como aditivo (`pool F 45→69 e U 11→15`, "nada removido"), então o v7 não contém
nenhuma voz de `F`/`U` que o v8 tenha perdido; (b) o v7 não tem o pool `voice.M`, o que
apagaria as vozes do time Mítico — áudio de outra facção, explicitamente fora de escopo;
(c) `tools/eval/character-select-voice-check.mjs` fixa o v8 em `VOICE12`/`VOICE13` e tem o
mutante `pack-antigo` justamente para reprovar essa regressão.

## Decisão

Nenhum manifesto, referência de áudio ou catálogo foi alterado. Este commit contém apenas
este relatório.

## Como destravar

Basta uma das duas informações do dono:

1. Quem é `ememe` (pessoa, provedor, modelo ou nome de lote) e onde o lote aprovado está —
   se for um pacote privado, a versão/URL do release ou o hash dos arquivos; ou
2. Os hashes/caminhos exatos das falas antigas desejadas por personagem de `F` e `U`, que
   viram um patch curto em `CHARACTER_SELECT_VOICE` (`public/js/audio.js:17-24`) e/ou um
   pacote `audio-pack-v9` que preserve `voice.M` intacto.

## Validação executada

Réguas de áudio e manifesto rodadas nesta worktree, sem alteração de código de runtime:

| Comando | Resultado |
| --- | --- |
| `npm run eval:charvoice` | verde |
| `node tools/eval/character-select-voice-check.mjs --mutante=pack-antigo` | mata (2 cláusulas vermelhas) |
| `node tools/eval/character-select-voice-check.mjs --mutante=manifest-antigo` | mata (1 cláusula vermelha) |
| `npm run eval:audiovoicemix` | verde |
| `node tools/eval/audio-voice-mix-check.mjs --mutante=sem-voz-propria` | mata (1 cláusula vermelha) |
| `node tools/eval/audio-voice-mix-check.mjs --mutante=memes-historicos-silenciados` | mata (1 cláusula vermelha) |
| `npm run eval:audioproc` | verde (PRV1-PRV14) |
| `npm run eval:audiocapacidade` | verde (CAP1-CAP5) |
| `npm run eval:audioprivate` | aprovado |
| `npm run eval:audiofablocal` | verde (36 vozes próprias, staging privado preservado) |
| `npm run audio:check` | vermelho **pré-existente e de ambiente** — ver nota |

O mutante `pack-antigo` é a prova executável do bloqueio **B3**: trocar `audio-pack-v8` por
`audio-pack-v7` deixa `VOICE12`/`VOICE13` vermelhas.

Nota sobre `audio:check`: esta worktree não tem o pacote privado baixado, então
`public/audio/` está vazio e o comando reporta `voice E:0 B:0 U:0 C:0 F:0` e
"manifest.json DEFASADO em relação ao disco". É condição de ambiente, independente deste
commit (que só adiciona um `.md`), e é também a evidência direta do bloqueio **B2**: os
pools `voice.F` e `voice.U` não existem no Git — vêm do disco alimentado pelo pacote privado.
