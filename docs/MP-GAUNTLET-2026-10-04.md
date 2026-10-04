# Gauntlet multiplayer — cliente, 04/10/2026

## Objetivo

Melhorar a experiência real do multiplayer até pelo menos 90% de sessões boas/ótimas em sete dias comparáveis, com paridade da simulação entre site e nós, partida de dois humanos, leitura visual e diagnóstico de FPS, RTT, gaps e correções. Não alterar a régua só para elevar o percentual. O objetivo permanece aberto.

## Lane e marcos

- Worktree `client/worktrees/mp-quality-rootcause-20261004`, branch `codex/mp-quality-rootcause-20261004`, base `8e4a64ab0b7db590d45c2588aa96bc3836e26c8d` (alpha.34). Backend pareado em `csbrasil-backend/wt/mp-gauntlet-20261004`, branch `codex/mp-gauntlet-compat-20261004`; ledger detalhado `docs/MP-GAUNTLET-2026-10-04.md` naquela lane.
- Baseline `node tools/eval/netcode-check.mjs` com Node 23: 190/190; log `/tmp/mp-gauntlet-netcode-base-node23.log`. Entrada em partida oficial EU no Chrome de produção confirmada, mas FPS variou ~10–49 e RTT no WS ~111–153 ms no teste curto; isso não mede a população.
- A/B de `charbloom=1` com pixelRatio fixo 1, Amazônia 5×5, 1536×1024, 10 s: p95 de quadro 32,9 ms com máscara e 33,6 ms sem; efeito inconclusivo. Não alterar o passe. Capturas locais mostram fallback de asset privado ausente; não são gate visual. Artefatos `/tmp/mp-gauntlet-perf-fixed-20261004/`.
- Defeito encontrado em Escadão: a parede protetora em z=25 bloqueava W nos quatro spawns E após 0,445 m/1,5 s; lado B andava ~7,72 m. A nova orientação E aponta 45° para o vão central, preserva a cobertura e avança ~6,35–6,53 m no mesmo ensaio. Teste `tools/eval/escadao-spawn-egress-check.mjs` falhou antes e passou 8/8 depois. `escadao-contract`, `escadao-home`, `escadao-graph` passaram. Captura 3:2 local `/tmp/mp-gauntlet-escadao-spawn-facing-center.png`; visual limitado por asset privado ausente.
- `scripts/sim-hash.mjs --write` atualizou SIM_HASH para `08b37d3037d7bf88`; `mp-paridade-check` passou. Este client **não** está publicado. Os nós em rollout ainda executam alpha.34 / SIM_HASH `6c7a6d76929eeef5`. Publicar a mudança de mapa exige nova imagem de nó com o commit deste client e rollout coordenado.
- Regressão adicionada ao `check:fast` como `eval:escadao-spawn-egress`; passou 8/8. `netcode-check` após o patch: 190/190, log `/tmp/mp-gauntlet-netcode-mapfix-20261004.log`. A imagem backend `gauntlet-148c36c-client8e4a64a` foi validada em US/EU/BR com alpha.34 e hash antigo; a mudança local de mapa permanece isolada.
- Em 04/10 o site público passou a alpha.35 (`origin/main@12510a25a`) sem alterar o SIM_HASH antigo. A branch isolada foi rebaseada sobre esse commit; checkpoint `efd63d1fe`, VERSION alpha.35 e SIM_HASH novo `08b37d3037d7bf88`. O teste de saída passou 8/8 e `netcode-check` passou 190/190 novamente (log `/tmp/mp-gauntlet-netcode-alpha35.log`). O backend público ainda usa o hash antigo e continua compatível com o site atual; o patch de Escadão continua fora de produção.
- O pre-push com Node 16 falhou em `check:deploy`. Repetição com Node 23 expôs três portões: `eval:comentario` cobrou comentário de no máximo 2 linhas, `docs:check` exigiu os blocos gerados e `eval:docsautoria` ficou sem base válida enquanto os docs estavam velhos. Comentário encurtado e `npm run docs` executado; o SIM_HASH final mudou para `8f7816379baade92` porque a receita inclui o conteúdo JS. Gate específico ainda deve ser repetido após o commit, pois `eval:comentario` mede `origin/main...HEAD`, não modificações soltas.

## Próxima ação

Revisar a captura real em build com assets privados e o caminho de saída E com pessoa no navegador. Preparar release pareado client/backend sem deixar o site novo apontar para a física antiga. Depois medir sessões reais por nó por sete dias e priorizar a causa dominante; dois humanos e aprovação visual ainda pendentes.
