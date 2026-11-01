# QA mobile — o jogo se mede sozinho no aparelho

`public/js/qa-mobile.js` roda um roteiro determinístico de 20 s dentro de uma partida viva,
pelos mesmos eventos de toque que o HUD consome, e devolve um relatório com FPS, degrau da
escada, custo de desenho e erros. A régua que o cobra é `tools/eval/qa-mobile-check.mjs`
(`npm run eval:qamobile`, dentro do `check:fast`).

## Por que existe

O app da loja (repo `corosolto/mobile`) é uma WebView apontada para a produção, que recebe
vários deploys por dia sem revisão de loja. "O jogo está bom no celular?" dependia de alguém
pegar um aparelho e jogar: não havia nenhuma medição automatizada de gameplay nem de custo
gráfico em aparelho, só o perfil de qualidade medido em bancada (`perfil-mobile-browser.mjs`).

## Como ligar

| Porta | Quem usa |
|---|---|
| `?qa=mobile` na URL | operador, navegador, régua |
| `window.__CS_QA__` definido antes da carga | o shell nativo, que injeta antes da WebView abrir |

O `main.js` só faz `import('./qa-mobile.js')` atrás desse portão. Em sessão normal o arquivo
**não é baixado** — a cláusula QAM4 da régua abre a mesma partida sem `?qa=mobile` e prova que
`/js/qa-mobile.js` não aparece em nenhuma requisição.

## O roteiro (20 s, prazos absolutos)

`olha-direita` 1,6 s · `anda-frente` 2,6 s · `atira` 2,4 s · `recarrega` 2,6 s · `mira` 1,6 s ·
`troca-pistola` 1,4 s · `troca-faca` 1,2 s · `troca-primaria` 1,4 s · `agacha` 1,2 s ·
`olha-esquerda` 1,6 s · `anda-tras` 2,4 s.

O passo *i* termina em `t0 + soma(0..i)`, nunca em "agora + duração". Num Pixel 5 emulado um
`setTimeout(100)` volta em 400 ms, e com prazo relativo o atraso se somava passo a passo: o
roteiro de 20 s terminava em **31,3 s** (medido). Com prazo absoluto, o atraso de um passo é
absorvido pelo seguinte e a medida real fecha em 20,0 s.

Os toques são `Touch`/`TouchEvent` reais despachados nos elementos do `#touch-ui` que o
`game.js` cria: `.touch-look` (arraste de mira), `.touch-joy-l` (somente andar),
`.touch-reload`, `.touch-ads`, `.touch-crouch`, `.touch-wep[data-wep=…]`. O gatilho preferido é
o `.tp-toque-atira` do HUD Treta Pop; sem ele, `.touch-fire` do HUD legado.
Elemento com caixa zero é ignorado: o Treta Pop esconde o stick direito com
`display:none`, e tocar nele seria um gesto que nenhum jogador consegue dar.

## O relatório

Publicado em `window.__CS_QA_RESULT__`, no evento `cs-qa-mobile` e, quando a ponte existe, em
`ReactNativeWebView.postMessage(JSON.stringify({source:'coro-qa', kind:'relatorio', relatorio}))`
— o mesmo canal que o `src/game-injection.ts` do app já usa com `coro-game-diagnostic`.

| Campo | Fonte |
|---|---|
| `fps.p50`, `fps.p5`, `fps.travadas`, `fps.congeladas` | `window.__csbOps.resumo()` (ops.js) |
| `escada.inicial`, `escada.final`, `escada.nome` | `window.__escada.escada.degrau` |
| `render.dpr` | `renderer.getPixelRatio()` |
| `render.drawCalls`, `render.triangulos`, `render.quadros` | `renderer.info.render` (ver abaixo) |
| `erros.js`, `erros.rejeicoes`, `erros.mensagens` | contados só durante o roteiro |
| `duracaoMs`, `roteiroMs`, `passos[]` | relógio do próprio roteiro |
| `identificacao` | mapa, modo, `VERSION`, userAgent, tela |
| `interacao` | tiros, munição antes/depois, giro acumulado, metros andados, armas |

### Consentimento

O `ops.js` só mede com analytics permitido (`privacy-preferences.js`). O harness liga o
consentimento para o roteiro e **devolve a escolha anterior** no fim, inclusive o caso "nunca
escolheu". Medir em modo QA não pode virar decisão de privacidade tomada pelo jogo.

### Draw calls: por que não dá para ler direto

Ler `renderer.info.render` num `requestAnimationFrame` qualquer devolve **zero** no celular, e
não é defeito do three. Na qualidade baixa o `game.js` desenha o mundo e **depois** o viewmodel
numa segunda `renderer.render` (overlay sem pós-processamento). Como `info.autoReset` zera os
contadores no início de cada render, o que sobra ao fim do quadro é só a passada do viewmodel,
que num aparelho sem viewmodel carregado é 0.

Então o harness desliga o `autoReset`, deixa acumular o roteiro inteiro e divide pelos quadros
que o jogo realmente desenhou (`game._rafFrames`). O número publicado é custo **por quadro
desenhado**, somando todas as passadas, e o `autoReset` volta como estava. O
`tools/eval/smoke-pos-deploy.mjs` usa a mesma conta.

## O que a régua cobra

| Cláusula | O que mede |
|---|---|
| QAM1 | relatório completo, com número plausível: FPS > 0, draw calls > 0, duração entre 95% e 160% do roteiro declarado |
| QAM2 | o roteiro **mexeu** no jogo: munição caiu pelo gatilho de toque e a câmera girou. Relatório que não prova interação é carimbo |
| QAM3 | zero erro de JS e zero rejeição durante o roteiro |
| QAM4 | custo zero: a mesma partida sem `?qa=mobile` não publica relatório nem pede o arquivo |

O giro é somado **em módulo passo a passo**. A primeira versão comparava o ângulo do começo com
o do fim da partida, e como o roteiro olha para os dois lados o resultado dava 0,001 rad: a
cláusula reprovava um roteiro que tinha funcionado.

Mutante `roteiro-mudo`: o dispatch de toque vira no-op. O relatório continua saindo completo
(QAM1, QAM3 e QAM4 seguem verdes) e só QAM2 acende. É o que separa "mediu" de "preencheu campos".

## Rodando

```bash
npm run eval:qamobile                      # sobe e derruba o serve.mjs sozinho na 9312
BASE=http://127.0.0.1:9312 node tools/eval/qa-mobile-check.mjs
node tools/eval/qa-mobile-check.mjs --mutante=roteiro-mudo
```

Um navegador por vez: rode sob `tools/eval/with-browser-lock.sh` quando houver outra régua de
Chrome na fila.
