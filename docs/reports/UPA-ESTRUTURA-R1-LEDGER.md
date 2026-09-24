# UPA 24h — estrutura R1

## Escolha e definição de pronto

- Worktree: `client/worktrees/upa-estrutura-r1`
- Branch: `codex/upa-estrutura-r1`
- Base original: `origin/main@dffcf1f5815342e1ae26e5d79beeaf54b833a2df` (`v2.0.0-alpha.255`). Sincronizada por merge normal com `origin/main@60ad7501323ef076263f645bfca341e2454fce6b` (`v2.0.0-alpha.262`) no commit `da307ba87`, sem rebase ou force-push.
- Mapa escolhido: `upa_24h` (`public/js/map_upa.js`).
- Motivo: no catálogo ROADMAP #28, UPA é o mapa prioritário em `MAIN_REVIEW` sem PR estrutural aberto. Lajes está em outra lane; Parque, Posto, Atacadão, Obras, Córrego, Loja H, Ferro Velho, Piscina, Escadão, Amazônia, Joá, Quebrada e Carandiru já têm candidatos ou lanes identificadas.
- Autoria preservada: mapa original de Emerson Garrido no PR #257; recuperação integrada por Ruben no PR #337.
- Definição de pronto: eliminar leitura de loja/manequins, tornar recepção, triagem, consultórios, observação e emergência legíveis; elevar acessos, cobertura e decisões de rota; preservar arsenal, CTF e bots; medir 5×5/8×8 em mata-mata e CTF; capturar WebGL real em 3:2 e 16:9; provar a régua com mutantes; publicar draft PR e URL local.

## Baseline alpha.255

- `map-check upa_24h`: MAP1–MAP4 e CTF1/CTF2 verdes; MAP5 reprova espaçamento máximo de props (`8,64 m > 7 m`) em dois quadrantes do spawn sul.
- CTF2 encontra somente duas rotas separadas em todas as travessias longas.
- `botsim 20 upa_24h`: sete bots, `stuckPct=7,167`, `eff=0,675`, `laneSpread=0,64`, `roamDepthSpread=0,116`.
- Fonte publica seis famílias de prop comercial: `manequim`, `gondola_mercado`, `gondola_eletro`, `painel_tvs`, `caixa_cobranca` e `cooler`. O interior já tem macas, monitores, respirador, cilindro de O2, crash cart, consultórios e sinalização; portanto o defeito é composição/reuso inadequado, não ausência total de equipamento clínico.
- Instrumento `agent-browser` não está instalado (`command not found`); a verificação visual usa o Playwright global do próprio repositório com Chrome/WebGL real e registra a limitação.

## Restrições

- Mudanças somente em `map_upa.js`, gates específicos, evidências e documentação gerada.
- Sem runtime, materiais compartilhados, Mint/Astra, asset privado, merge, deploy ou force-push.
- Nenhum aceite visual humano será presumido.

## Implementado

- A farmácia deixou de usar gôndolas e itens de supermercado; a recepção deixou de usar caixa comercial, painel de TVs e manequins. Todos os substitutos são geometria procedural local e materiais já pertencentes ao mapa.
- Seis setores clínicos ficaram declarados e legíveis: recepção, triagem, consultórios, observação, emergência e dispensário clínico.
- As quatro divisórias transversais passaram de um para três vãos cada. A régua percorre as faixas oeste, central e leste usando a colisão real do mapa.
- Há doze acessos internos medidos e 52 pontos de cobertura clínica. As ilhas baixas e o mobiliário adicional corrigiram os dois quadrantes vazios do spawn sul.
- Os 56 painéis de teto viraram uma única instância; as 56 luzes pontuais viraram seis luzes setoriais. A sombra solar dinâmica foi removida porque todo o mapa é coberto.

## Evidência validada

- `node tools/eval/upa-structure-check.mjs`: UPA1–UPA5 verdes sobre a malha e os colisores reais. A régua encontra 6/6 placas visíveis, 12/12 vãos com batentes, três decisões separadas por quadrante e 52/52 coberturas com `Box3` coincidente com seu colisor; cada setor tem ao menos sete coberturas.
- `node tools/eval/upa-structure-check.mjs --self-test`: cinco mutantes causais mortos. `reintroduz-loja`, `apaga-setor` e `remove-cover` derrubam somente UPA1, UPA2 e UPA5; `fecha-acesso` derruba UPA3/UPA4; `comprime-rotas` mantém os 12 vãos físicos e derruba somente UPA4.
- `node tools/eval/map-check.mjs upa_24h`: MAP1–MAP5 e CTF1/CTF2 verdes; espaçamento máximo caiu de 8,64 m para 6,79 m.
- `node tools/eval/botsim.mjs 20 upa_24h`: `stuckPct=3,178`, contra 7,167 na alpha.255; `eff=0,678`, `laneSpread=0,64`.
- `node tools/eval/ctf-win-check.mjs upa_24h`: as três bandeiras encerram a rodada na terceira captura.
- `npm run build`, `git diff --check` e `npm run arch:check`: verdes.
- `npm run docs:check` fica verde depois da regeneração dos blocos derivados nesta branch.
- `npm run check:fast`: 141/145 verdes. Três falhas não foram introduzidas pela UPA: `eval:mapid` (a string `fy_mansao` no relatório Joá), `eval:redesign` (UIR15) e `audio:check` (checkout sem o lote privado) reproduzem byte a byte na `alpha.255`. A quarta, `eval:docsautoria`, era o fechamento deliberado sobre documentos sem commit; depois do checkpoint Git, `npm run docs`, `npm run docs:check` e `npm run eval:docsautoria` ficaram verdes.
- O pre-push executou `npm run check:deploy`: 39/40 portões verdes; somente o mesmo `eval:redesign`/UIR15 herdado falhou. Como a falha foi reproduzida sem diferença na `alpha.255`, a publicação da branch usa a exceção documentada `--no-verify`; nenhuma falha da UPA foi suprimida.

### Chrome/WebGL real

A matriz final em `artifacts/upa-r1/webgl-menu-r3/` cobre 3:2 e 16:9, 5×5 e 8×8, mata-mata e CTF. Cada uma das oito execuções entrou pelo fluxo real do menu (Single Player → modo → UPA → facção → personagem → adversário), usou Chrome/WebGL2, qualidade média, DPR 1 e confirmou 9 ou 15 bots reais. Todas ficaram com zero erro inesperado, zero resposta HTTP desconhecida, zero falha de requisição desconhecida e zero quadro acima de 100 ms. O P95 ficou entre 9,6 e 9,9 ms; o pior caso mediu 662 draw calls e 1.019.401 triângulos, abaixo dos tetos explícitos de 20 ms, 800 calls e 1,1 milhão de triângulos. Todas registram o mesmo mapa `sha256=31cddb1e00dda1c50dc939a9faeda6e89ef6115d799795b5e1f2e2d5b9174fc0` e o mesmo diff de runtime `sha256=01422e9d5decd5550c4bdab994d67f82e0ad1829c3538f3e06639c03a864d52a`.

`PATH=/opt/homebrew/bin:$PATH node tools/eval/upa-browser-check.mjs --self-test` prova separadamente que o gate rejeita `pageerror`, console desconhecido, HTTP 500, falha de requisição, P95 acima do teto, qualquer quadro acima de 100 ms, 801 draw calls e 1.100.001 triângulos. A allowlist aceita somente ausências locais já inventariadas, o `SUPPORT_URL_BR` herdado e o backend remoto bloqueado por CORS; um erro desconhecido não vira verde por conter texto genérico.

O A/B fresco contra `dffcf1f58` usou processo e porta separados:

| Perfil | alpha.255 P95 / calls / tris | candidata P95 / calls / tris |
|---|---:|---:|
| 5×5 CTF, 3:2 | 10,1 ms / 357 / 885.184 | 9,8 ms / 597 / 835.060 |
| 8×8 CTF, 16:9 | 10,0 ms / 396 / 1.038.237 | 9,9 ms / 630 / 966.714 |

Os draw calls aumentam pela fragmentação das paredes e coberturas, mas ficam abaixo do teto local de 800; os triângulos caem e a cadência não regride na amostra. Esta é uma amostra local curta, não garantia universal de FPS.

Capturas representativas:

- 3:2: `artifacts/upa-r1/webgl-menu-r3/3x2-5-ctf/`.
- 16:9: `artifacts/upa-r1/webgl-menu-r3/16x9-8-ctf/`.
- Baseline fresco: `artifacts/upa-r1/baseline-menu-r2/3x2-5-ctf/` e `artifacts/upa-r1/baseline-menu-r2/16x9-8-ctf/`.

Cada JSON registra SHA, URL, porta, fluxo e instante. O baseline foi servido por checkout destacado limpo em `8203`; a candidata por esta worktree em `8202`. O baseline usa o fluxo automático porque a interface `alpha.255` não expõe o mesmo menu atual; a candidata, que é a unidade sob teste, entra pelo menu real.

Inspeção desta lane: a alpha.255 mostra uma loja com gôndolas de alimento e manequins; a candidata mostra recepção, chamada de senha, dispensário e equipamentos clínicos. Os seis enquadramentos cabem em 3:2 e 16:9 e o HUD permanece visível. Isso comprova a mudança, mas não substitui o aceite visual do dono nem a crítica adversarial independente.

## Revalidação sobre alpha.262

A atualização para a release `alpha.262` preservou os seis setores, os doze acessos, as quatro famílias de rota com três decisões cada e as 52 coberturas. O replay de `upa-structure-check` e seus cinco mutantes continuou causalmente verde, assim como `map-contrato-check` (`361/361` nós alcançados, `1.800` arestas) e `ctf-win-check`.

O replay de bots revelou uma regressão que o relatório antigo não expunha. Com a branch pré-correção, o CTF travava `18,533%` no 5×5 e `8,389%` no 8×8, contra `2,311%` e `1,644%` na base limpa `alpha.262`. A causa eram segmentos tangentes às macas e biombos: o grafo aceitava margem de `0,22 m`, menor que o raio de colisão de `0,4 m` do bot. O commit `e5a6e980b` elevou as margens locais do mapa para `0,65 m` nos nós e `0,45 m` nas arestas; `b9459693a` apenas reduziu o comentário aos dois versos aceitos pelo gate de comentários. Nenhum runtime compartilhado foi alterado.

| Perfil, 30 s × 9 sementes | alpha.262 limpa: stuck / eff | candidata antes da correção | candidata final |
|---|---:|---:|---:|
| 5×5 DM | 4,144% / 0,516 | 6,467% / 0,513 | 1,978% / 0,483 |
| 5×5 CTF | 2,311% / 0,555 | 18,533% / 0,506 | 1,344% / 0,394 |
| 8×8 DM | 4,433% / 0,523 | 5,089% / 0,506 | 2,133% / 0,423 |
| 8×8 CTF | 1,644% / 0,549 | 8,389% / 0,454 | 0,233% / 0,375 |

O travamento final fica abaixo do teto local de 4% nos quatro perfis e melhora causalmente sobre a base. A eficiência líquida cai porque o grafo mantém mais folga dos obstáculos e evita os atalhos tangentes; isso deve ser observado no playtest, sem ocultar o número.

### WebGL final, fonte congelada

A matriz `artifacts/upa-r1/alpha262-r5/` foi refeita depois da correção e do gate de comentários. As oito combinações entram pelo menu real, usam Chrome/WebGL2, confirmam 9 ou 15 bots e não registram erro inesperado nem quadro acima de 100 ms.

| Aspecto | Equipes | Modo | P95 | Calls máx. | Triângulos máx. |
|---|---:|---|---:|---:|---:|
| 3:2 | 5×5 | DM | 9,9 ms | 624 | 864.131 |
| 3:2 | 5×5 | CTF | 9,8 ms | 572 | 855.799 |
| 3:2 | 8×8 | DM | 9,7 ms | 649 | 1.009.583 |
| 3:2 | 8×8 | CTF | 10,0 ms | 623 | 1.024.044 |
| 16:9 | 5×5 | DM | 10,1 ms | 626 | 864.810 |
| 16:9 | 5×5 | CTF | 9,9 ms | 577 | 865.330 |
| 16:9 | 8×8 | DM | 9,8 ms | 717 | 1.011.439 |
| 16:9 | 8×8 | CTF | 9,9 ms | 633 | 1.010.449 |

- Fonte auditada: `b9459693a0c3cf7916cbfdf4056d106b57ead558`.
- `public/js/map_upa.js`: `sha256=ca51ae928e0d0f167dfa7940553c80ce4b0dfcdfccfca0d6bffbe5c9ff54431d` em todos os recibos; servidor e worktree conferem.
- Oito recibos JSON concatenados: `sha256=3bebe6ea9eb2ec088c9c1a2b6c02493cedc9cac39f184c54e8875eb4cc2ee983`.
- Contato 3:2: `artifacts/upa-r1/alpha262-r5/contact-3x2.jpg`, `sha256=01126f7f46a545ed7500e960d5079ad9af795e5a8dbcc3b5a4d5af7c3249b4d8`.
- Contato 16:9: `artifacts/upa-r1/alpha262-r5/contact-16x9.jpg`, `sha256=fc8418fb21451bc525bf6e55971d6d6d25ee0e2458b0e587ca635cdd609a35fe`.
- `eval:select`, contra o servidor local: 12/53 casos rejeitados, exatamente o teto versionado. Como o diff desta lane não toca seletor, montagem ou runtime compartilhado, essa dívida é herdada e não foi maquiada.
- `npm run build`, `arch:check`, `map-contrato-check`, sintaxe e os gates/mutantes UPA passam na `alpha.262`. O replay final de `check:deploy` passa 39/40 portões; `eval:redesign` continua falhando somente em UIR15, reproduzido na base e fora do escopo map-local.

### Aceite humano mínimo pendente

1. Percorrer recepção, dispensário, consultórios, triagem, observação e emergência nos dois aspectos e confirmar que cada setor se distingue durante combate real.
2. Cruzar os doze acessos e contornar macas/biombos em 8×8, procurando colisão ou hesitação que a simulação não represente.
3. Jogar uma rodada DM e uma CTF, observando se a maior folga do grafo reduz a fluidez apesar de eliminar os travamentos medidos.
4. Confirmar contraste do piso/teto muito claros, leitura das coberturas e ausência de clipping do HUD; as capturas técnicas não são aceite visual.

## Reproduzir e continuar

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/client/worktrees/upa-estrutura-r1
PATH=/opt/homebrew/bin:$PATH npm run dev -- --host 127.0.0.1 --port 8202
```

Abrir `http://127.0.0.1:8202/?debug=1&auto=E,mst&map=upa_24h&perfilauto=0`. A primeira crítica independente bloqueou gates autodeclarados, DM artificial, ausência de tetos de performance e A/B sem origem auditável. Todos os quatro bloqueios foram corrigidos. A segunda crítica independente deu GO técnico no HEAD `596655ffa`; o draft PR permanece aguardando CI e o aceite visual/jogável humano.
