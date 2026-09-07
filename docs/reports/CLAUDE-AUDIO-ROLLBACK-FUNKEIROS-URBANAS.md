# Rollback seletivo das vozes de Funkeiros e Tribos Urbanas — investigação

Data: 2026-09-06 (2ª rodada; a 1ª está preservada na seção "Histórico da 1ª rodada")

Branch: `claude/audio-funkeiros-urbanas-rollback` (base `origin/main` em `42c01175`)

Resultado: **FONTES ENCONTRADAS E VERIFICADAS — nenhum arquivo foi movido nem manifesto
alterado, porque o passo que restaura é build/deploy privado, fora do que esta lane pode
executar.**

## Pedido

O dono relatou que os áudios de personagem gerados por IA de Funkeiros (facção `F`) e
Tribos Urbanas (facção `U`) estão ruins, e pediu o rollback seletivo para as vozes antigas
aprovadas. A 1ª rodada parou por não achar a autoria citada ("ememe") no Git e concluiu que
não havia estado anterior para o qual voltar.

**Essa segunda conclusão estava errada e é corrigida aqui.** A busca da 1ª rodada foi feita
só dentro do Git; as vozes antigas de `F` e `U` nunca moraram no Git. Elas estão em packs de
release que existem, íntegros, em disco local — e os bytes conferem por sha-256 entre duas
fontes independentes.

## O que foi encontrado (fontes verificáveis)

| # | Fonte | Onde | Identificador / integridade |
| --- | --- | --- | --- |
| 1 | **Pack v7 descompactado** | `worktrees/escadao-visual/public/audio/` e `worktrees/amazonia-visual/public/audio/` | `manifest.json` com `voice.U` 11 / `voice.F` 45 e `characterVoice` plano de 6; 292 arquivos em `a/`; **0 refs ausentes** nos pools `F` e `U` |
| 2 | **Pack v8 (zip)** | `/tmp/csbrasil-audio-restore.QZXwty/v8.zip` | sha256 `009e0125820764a231ddf921b4ad865170aec39262ebf18d6cdcaf38394aebf8` |
| 3 | **Procedência do v8** | `~/Music/PROVENANCE-v8.md` (local, fora do Git — citado por `3abd9072`) | provedor + id de modelo por personagem `F`/`U`, com as decisões do dono |
| 4 | **Tags de release** | `legacy/game2/.git` | `audio-pack-v7` → `c45bfc74`; `audio-pack-v8` → `79c72696` (v1…v8 presentes) |
| 5 | **Pack vivo (produção)** | `/tmp/csbrasil-prod-audio-manifest.json` + zip `48a97edb…` | manifesto servido, para o diff contra 1 e 2 |

A string `ememe` continua sem existir como autoria: além dos 2753 commits/568 refs da 1ª
rodada, a varredura desta rodada em `private-assets/` deu um único acerto, e é ruído binário
(`emEmemF` dentro de `menu-main-alpha218/m26.mp3`), não metadado. **Nenhuma autoria foi
inventada para preencher essa lacuna.**

## As três camadas de `F`/`U`, medidas

| Camada | v7 (29/08) | v8 (30/08) | vivo hoje |
| --- | --- | --- | --- |
| `voice.F` (pool) | 45 | 69 (+24 Fish TTS) | 69 |
| `voice.U` (pool) | 11 | 15 (+4 Fish TTS) | 15 |
| `characterVoice` `F` | `funkraiz` plano | `funkraiz` trocada + `mandrake`, `oakley`, `trapfunk` (Fish) | **9 Funkeiros × 4 eventos (Gemini)** |
| `characterVoice` `U` | `clubber`, `reggae` planos | + `pagodeiro` (Fish) | **nenhum** |

Duas medições mudam o diagnóstico da 1ª rodada:

1. **Os pools de `F` e `U` não regrediram.** Os 45 refs de `voice.F` e os 11 de `voice.U` do
   v7 estão, hoje, no pack vivo — com bytes e com referência: `0` sem bytes, `0` fora do
   pool. Os memes históricos de Funkeiros e Urbanas continuam tocando.
2. **A regressão está toda em `characterVoice`.** É a camada que o `public/js/audio.js:120`
   e `:141` consultam ANTES do pool, então ela sombreia o que existe embaixo.

Consequências no runtime servido hoje:

- `clubber` e `reggae` ainda tocam os bordões antigos — não pelo manifesto (que perdeu as
  entradas), mas pelo resgate versionado em `public/js/audio.js:159`, que aceita o
  `CHARACTER_SELECT_VOICE` quando o hash está no pool (`voice.U[0]` e `voice.U[9]`).
- `funkraiz` **não** toca o bordão antigo: `d5b87c3d2638e166` está em `voice.F[36]`, mas o
  take estruturado do Gemini vence em `audio.js:141`.
- `pagodeiro` perdeu o bordão: `b902671ec7cb5cbf` não está no pack vivo. Cai no pool `U`.
- **Não existe voz sintética de personagem viva em Tribos Urbanas.** O lote Gemini é
  exclusivamente `F` (`tools/audio/fab-game-local.mjs:163-165`).

## Candidatos a restauro, com origem e hash

sha-256 do conteúdo. Os três compartilhados batem **byte a byte entre o v7 em disco e o zip
do v8** — duas fontes independentes, mesma verificação.

| Facção | Personagem | Arquivo | sha-256 | Camada de origem | Autorização registrada |
| --- | --- | --- | --- | --- | --- |
| F | `funkraiz` | `a/d5b87c3d2638e166.mp3` | `ec346c5706998f081715933e378c63774c0a2afbd932233014445f517c9bfcd6` | v7 (e v8) | release `audio-pack-v7` publicada pelo dono; **procedência do arquivo não reconstituída** |
| U | `clubber` | `a/08290068f8d9935f.mp3` | `583dbee1e54324a2864a518791d22b0efa33d2ae2a904709feb256f660238339` | v7 (e v8) | idem |
| U | `reggae` | `a/f180be207d0b440b.mp3` | `013f23ce3b09ec917f6ab270139cf471b8b425a35584974657cdaf033a215e52` | v7 (e v8) | idem |
| F | `funkraiz` (v8) | `a/d92c5f1644b8a249.mp3` | `a6c3d7d77d8b7e7ea48a05f6918ff7f6e6bd24d3f11a88cd19fdc72ca74b685e` | v8 | `PROVENANCE-v8.md`: Fish Audio TTS, modelo `8ccdb95bd1f3415d8a4004ff13b95c3c` |
| F | `mandrake` | `a/5a358d37cd9fbb0b.mp3` | `19675b6f0376b3c5eb25e258da7f39b2cffb62fcb2f3bd2ad3251e38329f7c77` | v8 | Fish Audio TTS, `6a27a3ab74af45cb8890a6974e9eeb06` |
| F | `oakley` | `a/d19d12bf1ccd0ee1.mp3` | `c8aad92239ea71f7ebc067ce93349b0be87ba30b02f55b51411639f9a434b1cf` | v8 | Fish Audio TTS, `0c5d8d65ded6439a8466e3ca8ec73a50` |
| F | `trapfunk` | `a/d06aa48d289d4fd5.mp3` | `2640c24071a7a3718ace41b4221ba143605ad59f9659d56d6564c67850ef74ff` | v8 | Fish Audio TTS, `b1355c5151eb43d88df3efe2e1bad5c7` |
| U | `pagodeiro` | `a/b902671ec7cb5cbf.mp3` | `fd9ad2bc5c4f8193c6994927f990f4f7c7e62fe7d0f50364d43d271f22a99507` | v8 | Fish Audio TTS, `c481e5eba6254be49de0f33af6736085` |

Os 45 arquivos de `voice.F` e os 11 de `voice.U` do v7 não entram nesta tabela porque **não
precisam ser restaurados**: já estão no pack vivo, íntegros.

## Por que nada foi alterado nesta branch

**R1 — o gatilho das vozes rejeitadas não é versionado.** Nenhum script, workflow ou
`package.json` passa `--character-voices=`. O lote Gemini entra no pack porque o operador
passa esse flag para `tools/audio/fab-game-local.mjs` na hora do build privado, e sobe o
Blob. Tirar `F` do pack é, portanto, **rebuild + reupload do pacote privado** — exatamente o
que esta lane está proibida de fazer ("não publique áudio ou release"). Não há edição de
arquivo neste repositório que produza o rollback.

**R2 — escolher entre v7 e v8 seria escolher um substituto no lugar do dono.** Existem dois
estados anteriores recuperáveis, e eles são incompatíveis entre si:

- **v7** tira toda a voz de personagem gerada por IA de `F` e `U`. `funkraiz` volta ao
  bordão antigo e os outros 8 Funkeiros caem no pool de memes históricos. Custo zero de
  bytes: tudo já está no pack vivo. Mas a procedência desses arquivos nunca foi
  reconstituída — o cabeçalho de `scripts/build-audio-pack.mjs:4` registra que os originais
  "carregam NOME de faixa/meme", e a decisão do dono de 20/08 citada em
  `PROVENANCE-menu-v7.md` foi "gíria é livre, gravação não".
- **v8** devolve bordões que também são TTS (Fish Audio). Restaurá-los troca um lote
  sintético por outro — o que colide com o motivo declarado da rejeição.

O pedido diz "vozes antigas" sem dizer qual das duas. Decidir aqui seria inventar
substituto, e a instrução proíbe.

**R3 — o lote rejeitado está registrado como aprovado pelo próprio dono.**
`docs/audio/proveniencia.json:195-211` traz `character-voices-openrouter-gemini` com
`autorizadoPor: "Ruben"`, `data: 2026-09-06`, escopo "9 Funkeiros, com um take final de
select, kill, radio e round por personagem". Três réguas versionadas foram escritas para
proteger justamente isso (`MIX9b`, `MIX9c`, `MIX12` em `audio-voice-mix-check.mjs`;
`VOICE10` do caso `funkraiz` em `character-select-voice-check.mjs`). Revogar uma
autorização assinada pelo dono, e esvaziar por dentro as réguas que a defendem, não é
decisão de agente.

## O que o dono precisa decidir (uma linha)

**Qual estado anterior de `F` vale: v7 (sem IA nenhuma) ou v8 (bordões Fish)?**

Com a resposta, o restauro é mecânico e já está verificado:

- **Se v7** — rebuild do pack privado **sem** `--character-voices=`. Nenhum byte novo, nenhum
  arquivo copiado, nenhuma licença nova: `funkraiz` volta por `audio.js:159` e os outros 8
  Funkeiros voltam ao pool. `U` não muda (já não tem voz sintética). Depois: revogar a
  entrada `character-voices-openrouter-gemini` no ledger e reescrever `MIX12` para cobrar o
  estado novo, em vez de deixá-la verde à toa.
- **Se v8** — extrair do zip `009e0125…` os cinco arquivos da tabela (hashes acima),
  reencaixá-los como `characterVoice` plano de `mandrake`, `oakley`, `funkraiz`, `trapfunk`
  (F) e `pagodeiro` (U), e registrar a fonte Fish Audio no ledger com os ids de modelo do
  `PROVENANCE-v8.md`.

Em ambos os casos, as demais facções (`E`, `B`, `C`, `M`) ficam idênticas: o lote Gemini é
só de `F`, e os pools de `E`/`B`/`C`/`M` não são tocados por nenhuma das duas opções.

## Comparação auditiva — PENDENTE

**Nada aqui foi ouvido.** Toda a verificação desta rodada é de bytes, hash, referência e
estrutura de manifesto. Se o timbre do v7 ou do v8 é o que o dono chama de "voz antiga
aprovada" é julgamento humano e **fica explicitamente pendente**. Os arquivos das duas
opções estão íntegros em disco e podem ser tocados lado a lado antes de qualquer build.

## Validação executada

Sem alteração de código de runtime nesta branch — apenas este relatório.

| Comando | Resultado |
| --- | --- |
| `npm run eval:charvoice` | verde |
| `npm run eval:audiovoicemix` | verde |
| `npm run eval:audioproc` | verde (PRV1-PRV14) |
| `npm run eval:audiocapacidade` | verde (CAP1-CAP5) |
| `npm run eval:audioprivate` | aprovado |
| `npm run eval:audiofablocal` | verde (36 vozes próprias, staging privado preservado) |
| `character-select-voice-check --mutante=pack-antigo` | mata (2 cláusulas) |
| `character-select-voice-check --mutante=manifest-antigo` | mata (1 cláusula) |
| `audio-voice-mix-check --mutante=sem-voz-propria` | mata (1 cláusula) |
| `audio-voice-mix-check --mutante=memes-historicos-silenciados` | mata (1 cláusula) |
| `audio-voice-mix-check --mutante=fala-sintetica-volta` | mata (1 cláusula) |
| `npm run audio:check` | vermelho **pré-existente e de ambiente** — ver nota |

Nota sobre `audio:check`: esta worktree não tem o pacote privado baixado, então
`public/audio/` está vazio e o comando reporta `voice E:0 B:0 U:0 C:0 F:0`. É condição de
ambiente, independente deste commit (que só toca um `.md`).

## Histórico da 1ª rodada (preservado)

A 1ª rodada varreu o Git e concluiu bloqueio por dois motivos. O primeiro **continua
válido**: `ememe` não existe como autoria em nenhum commit, blob, autor ou campo de
procedência (2753 commits, 568 refs; mensagens, diffs, blobs e autores = 0).

O segundo — "não há estado anterior para o qual voltar" — **está corrigido acima**: havia,
e está em disco. O erro foi restringir a busca ao Git quando o próprio repositório declara,
em `scripts/fetch-audio.sh:2-3`, que os bytes ficam fora dele.

Também continua válido o descarte do rollback amplo levantado na 1ª rodada: trocar
`audio-pack-v8` por `audio-pack-v7` em `scripts/fetch-audio.sh` apagaria o pool `voice.M`
(vozes do time Mítico, fora de escopo) e é reprovado pelo mutante `pack-antigo`. O restauro
correto é por entrada de `characterVoice`, como descrito acima — nunca por troca de pack.

Fontes lidas nas duas rodadas: `public/js/audio.js`, `scripts/fetch-audio.sh`,
`scripts/build-audio-pack.mjs`, `tools/gen-audio-manifest.mjs`,
`tools/audio/fab-game-local.mjs`, `tools/audio/stage-approved-character-voices.mjs`,
`docs/audio/proveniencia.json`, `tools/eval/character-select-voice-check.mjs`,
`tools/eval/audio-voice-mix-check.mjs`, `~/Music/PROVENANCE-v8.md`,
`~/Music/CORO SOLTO Audio/PROVENANCE-menu-v7.md`, e os commits `6c667acd`, `3abd9072`,
`c9e17bc9`, `c800bc8a`, `1a53d0ba`.
