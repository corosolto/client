# PR #773 — gate de silhueta da seleção

## Objetivo e definição de pronto

Resolver a falha de `eval:select` no candidato `d07749f4162a76e6d7eb0f5bff5ee87f658fdb8b` sem aumentar o teto geométrico global. O portão deve aceitar o lote visualmente aprovado e reprovar personagem novo fora do teto ou qualquer piora dos personagens que ainda carregam dívida.

Lane: `worktrees/fix-pr773-select-gate-20261009`, branch `codex/fix-pr773-select-gate-20261009`. A lane parte exatamente do candidato acima e não publica nem faz merge.

## Reprodução

- Comando: `npm run eval:select`, Node 23.6.0, servidor real de `tools/eval/serve.mjs` e Chrome com SwiftShader.
- Antes: **22/63** fora do teto global `p99 <= 0,675` e `ruins/1e4 <= 23,6`; saída 1.
- A base `f3576db59884e4b6b702a09fd45ef625f9a8ca93` já tinha 12/53 devedores. Os dez personagens adicionados pelo PR eram exatamente os dez novos devedores.
- Entre os políticos: Ministro 1,261/135,7; Barbudo 1,134/127,5; Julia 1,101/122,1; Deputado 1,067/114,7; Marina 0,948/89,5; Juiz 0,917/79,2; Dama 0,852/73,7; Senador 0,834/64,8; Professor 0,696/56,3; Capitão 0,758/55,7.
- O artefato do run remoto do PR confirma a mesma lista e os mesmos números: `/tmp/pr773-portao-failure-4g8W1y/portao-browser-artifacts/home/runner/work/client/client/tools/eval/select_inflate.json`, 58.097 bytes, SHA-256 `9bbb4f55ba976a6a03581d8fcd431a6343b70554a7e1a944aaa8e5f1c5a908f8`.

## Diagnóstico e evidência visual

- `--diagnose` atribui as arestas ruins principalmente a `Arm`, `Shoulder`, `ForeArm`, `Spine` e peças de roupa. A rotação usada para portar a arma expõe a pintura de pele diferente dos dois modelos de referência.
- `--mutate=semik`, `--mutate=semtrans` e `--mutate=semtudo` não retiram nenhum dos dez do vermelho. Portanto, IK, translação do clipe e curl não são a causa.
- Capturas locais preservadas fora do Git: `/tmp/pr773-select-before/fotos/`, `/tmp/pr773-select-before/contact-sheet.jpg` e `/tmp/pr773-select-before/video-contact-sheet.jpg`. A captura do próprio `select-inflate` e os quatro quadros por vídeo não mostram balão, rasgo de silhueta ou membro solto nos dez. Os vídeos servidos continuam em `public/video/chars/<id>.webm`.
- Em 09/10/2026 o dono aprovou visualmente os PRs. Isso aprova o resultado exibido e não transforma os números acima em meta de qualidade.

## Correção do portão

O contrato antigo aceitava “até 12” reprovados quaisquer. Ele não percebia troca de um devedor por outro nem piora dentro da lista. `tools/eval/select_inflate_debt.json` congela `p99` e `ruins1e4` por personagem para as 12 dívidas anteriores e para os dez modelos aprovados do PR #773.

O teto global continua `0,675/23,6`. Um personagem sem baseline que ultrapasse qualquer teto reprova. Um personagem com dívida também reprova se qualquer métrica ultrapassar o próprio baseline. A lista só deve encolher quando um rig for corrigido.

O modo normal também compara o teto recalculado com `tetoGlobalPreservado`; se Mandrake ou Pagodeiro mudarem a referência, a execução sai 2 e exige revisão explícita da referência e da dívida no mesmo diff.

## Mutação e validação

- Mutante da própria dívida: `node tools/eval/select-inflate.mjs ministro --mutate=skin`. Ele devolve o erro de pintura do antebraço, muda Ministro de `1,261/135,7` para `1,502/165,0` e precisa sair 1 na cláusula “DÍVIDA PIOROU”.
- Mutante de referência existente: `npm run eval:select:mutate` continua exigindo vermelho em Mandrake e Pagodeiro, sem baseline de dívida.
- `npm run eval:select`: verde, **0/63 bloqueadores e 22/63 dívidas congeladas**.
- `npm run eval:select:mutate`: vermelho esperado, 2/2 bloqueadores.
- `node tools/eval/select-inflate.mjs ministro --mutate=skin`: vermelho esperado, `DÍVIDA PIOROU`, 1/1 bloqueador.
- `npm run eval:smoke`: verde.
- `npm run eval:boot`: B1–B9 verdes no jogo Astro real em Chrome.
- `npm run check:deploy`: **47/47 verdes em 30 s**.
- `.githooks/pre-push origin </dev/null`: verde em 36 s.
- `git diff --check`: verde.

## Limites

O ajuste não corrige a pintura de pele dos dez modelos. Ele preserva a aprovação visual atual e impede piora numérica. Refazer os rigs continua sendo trabalho de qualidade de asset e precisa do fluxo da fábrica de personagens, com antes/depois no jogo real.

Próximo passo: aplicar este commit sobre o topo coordenado do PR #773, publicar pela lane raiz e deixar o `portao-browser` remoto repetir `eval:select` no runner Linux.
