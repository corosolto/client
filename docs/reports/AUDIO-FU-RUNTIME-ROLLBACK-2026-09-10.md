# Rollback de runtime — Funkeiros e Tribos Urbanas

Data: 10/09/2026

Branch: `codex/audio-fu-runtime-rollback`, baseada em `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`.

## Resultado

O rollback anterior, PR #531, localizou e documentou os packs v7/v8, mas não mudou o
runtime nem o pack. A auditoria atual do manifesto servido encontrou uma regressão real:
as 36 vozes Gemini dos nove Funkeiros continuavam alcançáveis e tinham prioridade sobre
os takes históricos. O resolvedor agora restringe `F` e `U` aos pools exatos do v7 e
ignora `characterVoice` estruturado nessas duas facções.

Nenhum áudio, manifest privado ou música foi editado ou publicado. Os bytes rejeitados
podem continuar armazenados no pack existente, mas o jogo não os seleciona. A procedência
também revoga a autorização de incorporá-los em builds privados futuros.

## Estado medido antes do rollback

Fonte de runtime auditada: `https://www.csbrasil.online/audio/manifest.json`, sem baixar
ou reproduzir arquivos de áudio.

| Camada | Funkeiros (`F`) | Tribos Urbanas (`U`) | Consequência anterior |
| --- | ---: | ---: | --- |
| `voice` servido | 69 | 15 | incluía 45/11 refs v7 mais anexos Fish; todos podiam ser sorteados |
| `characterVoice` | 9 personagens × 4 eventos | 0 | 36 takes Gemini de F venciam o pool em select/kill/radio/round |
| refs v7 ainda presentes | 44 únicas, 45 posições históricas | 11 | bytes antigos continuavam disponíveis no pack |

O v7 repete `audio/a/e76ae10d7b6c30b0.mp3` duas vezes para ponderação; o manifest vivo
mantém uma ocorrência. Todos os 44 arquivos únicos de F e os 11 de U do v7 continuam
referenciados. A auditoria não atribui esses arquivos a “Ememe”: essa autoria não foi
encontrada em Git ou no ledger. A aprovação recuperável é a publicação anterior do pack
v7, e os hashes/caminhos já estavam registrados no relatório do PR #531.

Bordões históricos com identidade fixa:

- `funkraiz`: `audio/a/d5b87c3d2638e166.mp3`;
- `clubber`: `audio/a/08290068f8d9935f.mp3`;
- `reggae`: `audio/a/f180be207d0b440b.mp3`.

O v8 também preserva candidatos Fish de `mandrake`, `oakley`, `trapfunk`, `funkraiz` e
`pagodeiro`. Eles não foram escolhidos porque o pedido atual é retornar ao estado v7 sem
as vozes de personagem geradas por IA.

## Mudança de runtime

`public/js/audio.js` contém uma allowlist fechada com os 44 caminhos únicos de F e os 11
de U do manifest v7; a fixture registra também as 45 posições históricas de F, incluindo
a repetição usada como peso. `_voicePool(team)` mantém a ordem e as duplicatas do manifest
recebido, mas remove qualquer caminho que não pertença à allowlist.

Os quatro caminhos que antes podiam escapar foram fechados:

1. `voice(team)` filtra o pool F/U;
2. `radioVoice(team)` filtra o pool F/U;
3. `characterVoice(characterId, event, fallbackFaction)` ignora `characterVoice` próprio
   em F/U e usa somente o pool v7 filtrado;
4. `characterSelectVoice(characterId, faction, roster)` ignora entradas estruturadas de
   F/U, preserva os três bordões históricos conhecidos e usa somente o pool v7 no resto.

Se o manifest trouxer apenas takes novos/rejeitados, F/U ficam em silêncio. Não existe
Web Speech, `SpeechSynthesisUtterance` ou voz genérica criada no cliente. Facções fora de
F/U mantêm as vozes próprias e pools existentes.

## Manifesto e proveniência

O arquivo `docs/audio/proveniencia.json` conserva o lote Gemini no histórico, mas muda
`deployPrivado.build` para `false` e registra a revogação do dono em 10/09/2026. Isso
impede que um build privado futuro trate os 36 takes como autorizados.

O pack privado atual não foi aberto, reconstruído ou publicado nesta lane. O rollback é
efetivo no resolvedor mesmo antes de uma futura limpeza física do Blob.

## Gates

Novo gate: `npm run eval:audiofurollback`.

Cláusulas:

- `FU1/FU2`: fixture v7 preserva 45 posições de F e 11 de U, sem anexos;
- `FU3/FU4/FU5`: Mandrake, Funkraiz e Pagodeiro retornam ao pool/bordões v7;
- `FU6`: pack apenas com take novo falha fechado em silêncio;
- `FU7`: outra facção mantém voz própria;
- `FU8`: Web Speech continua ausente;
- `FU9`: ledger revoga o lote Gemini em novos builds;
- `FU10/FU11`: modo opcional contra o manifest vivo confirma 9×4 estruturadas F, zero U,
  filtra o pool para v7 e mede a resolução final.

Mutante `--mutante=fu-ia-volta` remove o filtro e reativa as entradas estruturadas. Foi
detectado por seis cláusulas do gate novo, duas de `eval:audiovoicemix` e uma de
`eval:charvoice`.

Comandos principais:

```bash
npm run eval:audiofurollback
node tools/eval/audio-fu-rollback-check.mjs --mutante=fu-ia-volta
node tools/eval/audio-fu-rollback-check.mjs \
  --manifest-url=https://www.csbrasil.online/audio/manifest.json
npm run eval:audiovoicemix
npm run eval:charvoice
npm run eval:audioproc
npm run eval:audiocapacidade
npm run eval:audioprivate
npm run eval:menumusicreview
```

O teste `audio:check` continua dependente do pack privado ausente em checkout limpo e não
deve ser transformado em um falso verde por regeneração local.

## PRs e worktrees relacionados

- PR #531: mergeado; documentação, staging e scripts de decisão. Não fez o rollback de
  runtime. Agora é histórico/supersedido por esta implementação.
- PR #520: removeu fallback de voz sintetizada/Web Speech; sua proteção continua válida.
- `worktrees/claude-audio-rollback`: HEAD local `5eae10f8e`, 66 commits atrás do remoto da
  própria branch. Não deve receber implementação nova.
- `worktrees/audio-no-synthetic-fallback`: lane histórica do fail-closed; não foi alterada.

## Critério de aceite

- nenhum dos 36 caminhos Gemini de F é retornado por select/kill/radio/round;
- os 44 arquivos únicos de F e 11 de U do v7 continuam alcançáveis;
- Funkraiz, Clubber e Reggae mantêm os bordões fixos do v7;
- manifest só com paths novos deixa F/U em silêncio;
- outras facções, música, armas e ambiente não mudam;
- gate causal, mutantes, build e checks do repositório passam.
