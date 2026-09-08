# Sertão — correção pós-merge das carroças e casas dos respawns

Data: 08/09/2026. Branch `codex/sertao-respawn-wagons-fix`, criada em worktree
exclusiva a partir de `origin/main` alpha.242 (`e67addf4`). Esta frente corrige a
rejeição humana do PR #526 e não faz merge ou deploy.

## Diagnóstico antes

O relato foi preservado literalmente no BUG-145: “carroças ainda bloqueiam
passagem e as casas diante dos dois spawns continuam fechadas/inúteis”. As réguas
anteriores estavam verdes porque WA2 aceitava somente um flanco e IN1/IN2 cobriam
casas já abertas, sem exigir todas as fachadas diante dos spawns.

Na base `e67addf4`, WA5 ficou vermelho: a carroça central e a norte tinham apenas
um flanco contínuo. IN12/IN13 também ficaram vermelhos: `platibanda-0` e
`pedra-8` estavam ausentes de `interiorHouses`, com deslocamentos de 3,68 m e
3,43 m na entrada. A inspeção visual mostrou ainda a geminada central fechada.
Recibos: `artifacts/sertao-respawn-fix/wagon-baseline-red.json` e
`interiors-baseline-red.json`.

## Mudança

- `platibanda-0`, `pedra-8` e a geminada central ganharam planta autoral aberta,
  porta diante do respawn, saída lateral e janela oposta. As duas casas de pedra
  usam o volume original da família, 6,1×6,2 m.
- A carroça central foi reorientada e a norte recuada para liberar os dois
  flancos sem remover a cobertura visível.
- O grafo deixa de aceitar pontos aleatórios da grade dentro dos interiores e
  cria centro e soleira intencionais. Isso recuperou o golden de bots que ficou
  vermelho na primeira tentativa.
- A geminada mantém dois pavimentos, reboco ocre/caiado e quatro janelas altas;
  a primeira captura denunciou um painel superior escuro e ele foi removido.

## Evidência depois

WA1–WA5 passam. As três carroças têm flanco oeste e leste contínuos; a travessia
traseira é 4,9 m nas três. IN1–IN13 passam. As cinco casas das fileiras têm
entrada e saída lateral sem deslocamento da cápsula de raio 0,38 m, e LOS de
janela livre nos dois sentidos. A varredura alcança 79.079/79.079 células livres,
sem bolsões.

SP4 preserva três rotas disjuntas entre objetivos, com 31/34/29 nós e 23/18/20
nós no miolo. `eval:botsim-golden` voltou a passar depois do conserto do grafo.
Em 60 s × nove sementes, o 5x5 criou nove bots, `stuckPct=1,267`, e o 8x8 criou
15 bots, `stuckPct=0,756`; ambos mantiveram `laneSpread=0,64`.

O runtime WebGL real foi capturado em 1536×1024. RV1–RV12 passam, sem erro de
página, com máximo de 500 draw calls e 340.530 triângulos. Caminhos principais:

- `artifacts/sertao-respawn-fix/runtime-final-source/spawn-e-casas.png`
- `artifacts/sertao-respawn-fix/runtime-final-source/spawn-b-casas.png`
- `artifacts/sertao-respawn-fix/runtime-final-source/carroca-sul.png`
- `artifacts/sertao-respawn-fix/runtime-final-source/carroca-centro.png`
- `artifacts/sertao-respawn-fix/runtime-final-source/carroca-norte.png`
- `artifacts/sertao-respawn-fix/runtime-final-source/report.json`

As imagens foram abertas em resolução original. Elas mostram portas vazadas nas
três casas do respawn B, nas duas do E e espaço visível em torno das carroças. A
captura é evidência de composição; a sensação de atravessar sob combate ainda é
julgamento humano.

## Mutantes

Os mutantes novos ficam vermelhos isoladamente:

- `carroca-bloqueadora` → WA5;
- `fechar-casa-respawn` → IN12;
- `fechar-janela-respawn` → IN13.

Também foram mordidos os 13 mutantes anteriores de interiores, os dois anteriores
de carroça e os 14 mutantes de `sertao-spatial-check --self-test`. Recibos em
`artifacts/sertao-respawn-fix/mutants-final/`.

## Gates e limitação

Passaram: `eval:sertao`, `eval:velhooeste`, `eval:mapcontrato`, `eval:spawn`,
`eval:sertao-spatial -- --self-test`, `eval:sertao-interiors`,
`eval:sertao-wagon`, travessia offline, flora, oclusão, fauna, calango, horizonte,
aves distantes, criação, integração, ciclo do céu, assets, assets de áudio, CTF e
o golden de bots. Os gates WebGL de contraste e criação também passaram no
servidor local.

`look-check.mjs` permanece vermelho somente porque o horizonte assado da Amazônia
está ausente. A mesma falha foi reproduzida na base `e67addf4`; o Sertão passa sua
cláusula com fog e horizonte `#d7a477`, ΔE76=0,0. Esta frente não altera a
Amazônia. Logs completos: `artifacts/sertao-respawn-fix/gates/`.

O build Astro/Vercel passa. `check:fast` fechou 129/132; os gates do Sertão e o
golden dos bots passaram dentro do agregado. Os três vermelhos não são do diff:
`audio:check` requer a árvore-fonte privada e rejeita os órfãos presentes no pack
público materializado; `feet:check` também reprova na base `e67addf4`; e
`eval:docsautoria` recusa documentação ainda não commitada. `assert:assets`, que
valida o pacote efetivamente servido, passa com 470 referências presentes e 16
mapas com override de ambiência.

## Playtest adversarial

No mapa `velho_oeste`, testar primeiro os quatro spawns de cada time. Entrar nas
casas à esquerda, centro e direita da fileira B, sair pela lateral e trocar tiro
pela janela do fundo. Repetir nas duas fachadas da fileira E. Depois contornar as
carroças sul, central e norte pelos dois lados e cruzar atrás de cada uma. Fechar
com CTF em 5x5 e 8x8, procurando spawn trap, gargalo na soleira e bot oscilando
dentro das casas.
