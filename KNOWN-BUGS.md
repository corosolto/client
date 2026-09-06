# BUGS CONHECIDOS — CORO SOLTO: Treta Suprema

> Estado revisado: **2026-09-05**. Só entra aqui defeito com **evidência**: `arquivo:linha`, saída de
> régua ou passo de reprodução. Suspeita sem medição vai para o fim, na seção
> *Relatos recentes e resolução*.
>
> Regra da casa: bug que o dono reporta vira **invariante permanente** em
> `tools/eval/invariants.mjs`. Enquanto não virar, fica aqui com o campo `Régua: nenhuma`.
>
> **Como investigar e como escrever a entrada:** skill `bug-hunt`
> ([`.claude/skills/bug-hunt/SKILL.md`](.claude/skills/bug-hunt/SKILL.md)). O gabarito da
> entrada e o do relatório final estão em
> `.claude/skills/bug-hunt/references/gabaritos.md`.

**Quality gate na data deste arquivo** (`npm run check`, com `eval:vm` antes das invariantes):

```
CRÍTICAS: 42/55 passam  ← nenhuma falha nova
DÍVIDAS:  VM1, VM3, VM9, VM12, VM20, VM16, VM18, VM19, BOT8,
          CHR1, CHR3, CHR4, CTF1
AVISOS:   VM15 e BOT2 fora do alvo
PULADAS:  4 (exigem browser ou arnês ausente)
```

Colado de uma execução real de **17/08**. As 13 dívidas continuam todas identificadas em
`KNOWN-RED.json` e não reprovam o processo; o gate terminou com código 0. `AUD1` passou
depois do refresh do JSON de viewmodel. Na mesma árvore, o `check:fast` percorreu os **51
passos** pelo runner e todos passaram — inclusive os novos `eval:parquewheel`,
`eval:velhooeste`, `eval:penitenciaria`, `eval:backendhints` e `changelog:check`.

Mudou em 04/08: **CHR5B saiu do aviso e ficou VERDE** (27/44 personagens sem mapa de
superfície → 0/44) e entrou a **CHR7** (convenção de skin), verde — daí 49 e não 48.
**TEX1 ficou vermelha** por 10 superfícies grandes e claras sem albedo, **todas no
`fy_quebrada`**, que é mapa em obra — não é regressão de personagem.
CHR1/CHR3/CHR4 seguem exatamente como estavam (conferido personagem a personagem: a
lista de "balão" do CHR1 tem os mesmos 13 antes e depois).

---

## P0 — quebram o jogo ou mentem para quem mede

### ~~BUG-86 · no multiplayer o corpo TP do próprio jogador ficava DEITADO depois do respawn, arrastado pelo mundo~~ · RESOLVIDO 30/08 (PR #483)

**Sintoma (literal, testador do preview MP contra o nó br, 30/08):** *"o personagem estava
bugado, depois de morrer ficava deitado"*. **Evidência:** frames `f01–f05` do vídeo do
testador (scratchpad `mp-video/`) — em modo de câmera 3ª pessoa, o corpo do próprio jogador
segue na pose de morte (de costas, pernas pro ar) na MESMA posição de tela por 8 s de partida
(relógio 1:00 → 0:52), ou seja, colado ao jogador enquanto ele anda.

**Causa raiz — o desarme da pose de morte não existia.** `_tpDeath` (`public/js/game.js:4966`)
arma `_tpDead = true` e toca `ctrl.die()` — cujo clipe segura o último quadro em peso cheio
para sempre (`public/js/glbchars.js:705-708`). Nenhum caminho desarmava: `_tpDead` tinha
**3 ocorrências no arquivo e nenhuma o zerava**, e `ctrl.revive()` nunca era chamado no corpo
TP do jogador. No online morde SEMPRE porque o respawn chega por snapshot
(`netgame.js playerRespawned`) e não passa pelo `_respawnPlayer`; em 3ª pessoa o
`_updatePlayerTP` segue copiando `p.pos` todo frame — o cadáver anda junto. Em 1ª pessoa o
cadáver ficava visível e abandonado no ponto da morte (o `_tpDeath` força
`group.visible = true` e ninguém revertia). O mesmo defeito NÃO existe para remotos: o
`updateRemoteBot` (`netgame.js:277`) já chama `revive()` na transição morto→vivo.

**Conserto:** `_tpRevive()` (`public/js/game.js:4984`) — zera `_tpDead`, chama
`ctrl.revive()` e devolve a visibilidade ao contrato do `camView`. Chamado do
`_respawnPlayer` (SP, `game.js:5644`) e do `playerRespawned` (MP, `netgame.js:241`).

**Régua:** `tools/eval/netcode-check.mjs` (`npm run eval:netcode`), bloco BUG-86 — morte e
respawn por snapshot no harness; mutante que remove o reset (`_tpRevive` no-op) deixa a régua
vermelha. Antes: 2 cláusulas FALHA; depois: 47/47 ok. Custo declarado: nenhum.

### ~~BUG-87 · "Lags": a interpolação de remotos congelava a cada snapshot atrasado (sem buffer)~~ · RESOLVIDO 30/08 (PR #483)

**Sintoma (literal, mesmo relato):** *"Lags"*. **Refutação do palpite óbvio:** a hipótese
"não há interpolação nenhuma" é FALSA — o cliente já interpolava (cláusulas verdes no
`netcode-check`). O defeito era o ESQUEMA: viajar prev→cur no gap de CHEGADA (~50 ms) com
`a = (now − arrCur)/span` clampado em 1 — qualquer pacote atrasado deixava o boneco
CONGELADO no último ponto até o próximo pacote. A 20 Hz com jitter real (o próprio overlay
de rede amarela em gap > 70 ms), isso lê como lag mesmo com rede boa.

**Conserto:** buffer de interpolação de **120 ms** (`netgame.js:18`, `interpAtrasoMs`) —
amostras em arrays planos por eixo (cap 10, zero objeto por snapshot no hot path), render do
remoto no passado com clamp nas duas pontas (nunca extrapola), teleporte esvazia o buffer.
`renderTime()` (`netgame.js:41`) passou a mapear o MESMO instante renderizado para o relógio
do servidor — o rewind do lag comp cai exatamente no que a tela mostrou (janela do servidor é
0,25 s; 120 ms cabem). Só visual de REMOTOS: física local e predição intactas
(`movimento-golden` OK, trajetória idêntica).

**Régua:** `netcode-check.mjs`, bloco BUG-87 — relógio estubado (`_now`), snapshot atrasado
50 ms fabricado; cobra posição INTERMEDIÁRIA entre dois snapshots e movimento contínuo
durante o atraso; mutante `interpAtrasoMs = 0` deixa a régua vermelha. Antes: 2 FALHA
(x clampado em 11.00; renderTime fora do segmento); depois: x=10.50, renderTime=500.025,
47/47. **Custo declarado:** remotos são vistos ~70 ms mais no passado que antes (120 ms vs
~50 ms) — compensado no hit reg pelo `rt`, mas quem foge de você ganha esses ms na sua tela.

### ~~BUG-88 · "Problemas na hora de jogar": connect() sem prazo e sem feedback — nó mudo deixava o clique em ENTRAR "não fazer nada"~~ · RESOLVIDO 30/08 (PR #483)

**Sintoma (literal, mesmo relato):** *"Problemas na hora de jogar"*. **Causa raiz:** o
`NetClient.connect()` só assentava a promessa em `welcome`/`error`/`close` — um nó que aceita
o TCP e nunca manda o `welcome` deixava o connect **pendente para sempre**, sem erro e sem
mensagem (`public/js/net.js:97`); e o `mpEntrar` limpava o `mp-erro` e esperava em silêncio —
segundos de tela parada entre o clique e o welcome numa região longe.

**Conserto:** prazo de 8 s no `connect(timeoutMs)` com `timeout` como rejeição
(`net.js:97-106`), mensagem própria no `mpEntrar` (*"O servidor demorou demais…"*), feedback
*"Conectando na sala…"* durante a espera (`main.js:2905`) e trava de reentrada
(`mpConectando`, `main.js:2715`) — dois cliques não abrem dois sockets.

**Régua:** `netcode-check.mjs`, bloco BUG-88 — WebSocket estubado que abre e fica MUDO;
cobra rejeição com `timeout` dentro do prazo; mutante sem prazo (Infinity) fica pendente e
deixa a régua vermelha. Antes: 1 FALHA (`pendente_para_sempre`); depois: 47/47. Custo
declarado: conexão legítima mais lenta que 8 s agora vira erro com "tente de novo".

### ~~BUG-80 · a promessa do `orientation.lock()` derrubava o launch — a partida abria com o painel "Falha ao abrir partida"~~ · RESOLVIDO 28/08 (issues #431 e #432)

**Sintoma (literal, issues #431 e #432, abertas pelo `crash-fix.yml` em 24/08 18:07Z):**
*"screen.orientation.lock() is not available on this device."* (fingerprint `df013498`,
origem `promise`) e *"Falha ao abrir partida: screen.orientation.lock() is not available on
this device."* (fingerprint `342e306c`, origem vazia). Alpha.183, **sem stack e sem source**,
e as migalhas das duas são **idênticas** (01:54:04 a 01:55:18, terminando em
`clique #char-confirm` / `clique #btn-team-b`): é a MESMA sessão e a MESMA rejeição. Duas
fingerprints porque o prefixo do `lancamento.fail()` muda o hash FNV — a forma da #419/#420.

**Causa raiz — defeito de código, `public/js/main.js:1037`.** A linha era
`fs.then(() => { try { screen.orientation?.lock?.('landscape'); } catch {} }).catch(() => {})`.
O `lock()` devolve **promessa**, e ela não é devolvida nem capturada: o `try/catch` ao redor
pega throw **síncrono**, e o `.catch` do fim da linha é do `requestFullscreen`, não do
`lock`. No aparelho do relato a promessa **rejeita** — a frase é redação do navegador e não
nossa (não existe essa string no repo) —, a rejeição vira `unhandledrejection`, e
`origemDoJogo(null, undefined, mensagem)` (`index.astro:180`) devolve `true`: sem stack e
sem source, nada prova terceiro. Com `interna === true`, `index.astro:347` chama
`lancamento.fail()`, e a etapa `'partida'` está
aberta desde `main.js:986` com janela de **60 s**: o painel "Falha ao abrir partida" cobre
uma partida que ia carregar sozinha. O comentário do próprio trecho afirmava que esse
navegador apenas **ignora** a trava; o relato mostra que ele **rejeita**, e ignorar em
silêncio nunca teria aberto issue nenhuma — o comentário foi corrigido junto.

**Conserto.** Uma linha: `?.catch?.(() => {})` colado na chamada do `lock()`. É o idioma
que as outras TRÊS promessas de capacidade do jogo já usavam — `main.js:998`,
`main.js:1185` e `game.js:2071`; a do `lock` era a única sem. `src/lib/error-provenance.mjs`
ganha a `CAPACIDADE_RE` com a redação exata, classificando a família como `recuperavel`:
é **rede para a janela do cache-split** (BUG-39), onde um `main.js` velho do edge ainda
roda com HTML novo — não é o conserto.

**Medido (sem browser, lendo o fonte e executando o helper real):**

| | antes | depois |
|---|---|---|
| as 2 formas de campo classificadas | `codigo` → 2 issues | `recuperavel` → 0 issues |
| `fail()` derruba o launch na rejeição | sim (#431) | não — a promessa já nasce capturada |
| sítios de capacidade com catch colado | 3 de 4 | 4 de 4 |
| fingerprints publicados reproduzidos | — | 2/2 (`df013498`, `342e306c`) |

**Custo declarado, na população real:** das **99** issues `crash-auto`
(`gh issue list --label crash-auto --state all`, 28/08), exatamente **2** são desta família
— e a busca por `not available` na mesma população devolve só essas duas. **Vizinhas que
continuam como estão, DE PROPÓSITO:** `index.astro` NÃO ganhou guarda no
`unhandledrejection` — consertada a origem, ela seria código morto, ao contrário da #420,
onde o vendor ainda lança; `screen.orientation.lock() failed because the page is not
fullscreen` (redação diferente, nunca observada) segue `codigo`; e qualquer crash que apenas
CITE "is not available" segue acionável (contra-fixture na régua, mutante `capacidade-ampla`).
Sem a trava de orientação, o overlay "gire o celular" do CSS continua sendo a rede — como
sempre foi nos navegadores que nunca tiveram a API.

**Não verificado:** sem browser nesta máquina a rejeição não foi reproduzida ao vivo, e o
aparelho não está na issue — o que o relato prova é o ramo que rodou (`pointer: coarse` com
`requestFullscreen` disponível, `main.js:1033-1037`), não a marca do navegador. A frequência
da família por sessão no Supabase fica sem número (schema privado, sem credencial). O que está medido é a forma da
guarda (EP18), os 2 fingerprints de campo e o fato de as outras 3 promessas de capacidade já
usarem o mesmo idioma.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, já no
`check:fast` e no `check:deploy` — nenhum passo novo no portão). Cláusula **EP18**: varre
`src/` e `public/js/` e exige catch **colado na chamada** das quatro APIs de capacidade que
devolvem promessa (`orientation.lock`, `requestPointerLock`, `requestFullscreen`,
`exitFullscreen`), com UMA exceção declarada — o `const fs = …requestFullscreen?.()` de
`main.js:1034`, cuja promessa os dois ramos das linhas seguintes capturam. Por linha não
serviria: no `:1037` o `.catch` do `requestFullscreen` mora na MESMA linha e aprovaria o
defeito de volta. **3 mutações novas:** `sem-capacidade`, `capacidade-ampla` e
`lock-sem-catch`.

### ~~BUG-81 · erro que o próprio three ENGOLE virava issue de crash do jogo~~ · RESOLVIDO 28/08 (issue #465)

**Sintoma (literal, issue #465, aberta pelo `crash-fix.yml` em 28/08 07:34Z):**
*"THREE.WebGLState: Type error"*, fingerprint `c2d5e2c2`, classe `codigo`, alpha.192,
**origem vazia**, com stack do WebKit terminando em
`update@…/js/loading3d.js:146:25` → `loop@…/js/main.js:2586:22`.

**Causa raiz — não é exceção, é linha de log.** `crashFingerprint('console',
'THREE.WebGLState: Type error', '')` devolve exatamente `c2d5e2c2`: o relato entrou pelo
hook do `console.error` (`index.astro:397`), não pelo `window.onerror`. E quem emite é o
**próprio three, de dentro de um `try/catch` seu**: `public/vendor/three.module.js:23761`
embrulha `gl.texImage2D` e loga `console.error('THREE.WebGLState:', error)` — são **10
irmãos** entre `:23650` e `:23785`, todos `tex*`/`compressedTex*`. O quadro **termina**: o
`uploadTexture` segue, o `render()` retorna e o jogo continua sem aquele mapa. A pilha chegou
junto porque o hook lê o argumento `Error` (`index.astro:411`, conserto do BUG-72) — e é
justamente ela que faz `isConsoleLog()` devolver `false`, o corte do BUG-72 não pegar e o
`classifyCrash` cair no `return 'codigo'` final. Pior: com pilha, o relato **não** cai no
`TETO_CONSOLE`; come 1 dos 10 slots de exceção real do `TETO_SESSAO`.

**Refutado antes de agir.** O palpite óbvio era "é a mesma textura webp da `RECOVERABLE_RE`":
os GLBs de personagem são mesmo `EXT_texture_webp` (medido: `gotinha`, `canarinho` e
`blackmetal` trazem 3 imagens `image/webp` cada, e `gotinha` é justo o modelo da tela de
carregamento, `loading3d.js:7`). **Refutado por leitura:** quando a imagem não decodifica,
`GLTFLoader.js:3178` resolve `null` e `assignTexture` (`:3290`) faz `if (!texture) return
null` — o mapa nunca é atribuído, então não existe upload e não existe `texImage2D`. A #465
**não** é a irmã tardia da #110.

**Conserto.** A redação entra na `RECOVERABLE_RE` de `src/lib/error-provenance.mjs`, ao lado
do `Couldn't load texture` que já mora lá: aviso do three que o próprio three engoliu fica na
telemetria bruta e não dispara issue. Fonte única (`jserror.ts` e `scripts/classify-crash.mjs`
no CI), então o corte vale até para cliente velho em cache. **O que NÃO foi consertado, e por
quê:** o balde do cliente continua o do BUG-72 — `console` COM pilha segue no `TETO_SESSAO`.
Mudar isso é rever a decisão do BUG-72 inteira, e uma ocorrência não paga essa conta.

**Dívida declarada.** A mensagem do three **não diz qual textura**: ele loga só o `error`, sem
nome, sem formato e sem o tipo do `image`. Por isso o relato é inacionável por construção —
não dá para consertar a origem a partir dele. Se a família voltar com frequência, o próximo
passo é instrumentar o `uploadTexture` do vendor para dizer QUAL textura falhou, e aí a linha
volta a ser acionável.

**Medido (helper real, executado do fonte, sem browser):**

| | antes | depois |
|---|---|---|
| a forma de campo da #465 classificada | `codigo` → issue automática | `recuperavel` → só telemetria |
| `THREE.WebGLState: Invalid blending:` | `codigo` | `codigo` (contra-fixture) |
| fingerprint publicado reproduzido | — | `c2d5e2c2` (EP8 mede) |
| cláusulas verdes / mutantes que mordem | 17 / 47 | 18 / 52 |

**Custo declarado, na população real:** das **99** issues `crash-auto`
(`gh issue list --label crash-auto --state all`, 28/08), exatamente **1** é desta família.
**Vizinhas que continuam como estão, DE PROPÓSITO:** `THREE.WebGLState: Invalid blending:`
(`three.module.js:23345` e `:23371`) é a ÚNICA outra mensagem com esse prefixo no bundle e é
constante inválida **nossa** — segue `codigo`, e é a contra-fixture que trava o corte; a
redação do Chrome (`Failed to execute 'texImage2D'…`) nunca foi observada e fica de fora por
decisão, não por medição; `THREE.WebGLProgram: Shader Error…` segue no corte de log do
BUG-72; e crash real dentro do vendor, com `source` same-origin, segue acionável.

**Não verificado:** qual textura falhou (a mensagem não diz — ver a dívida acima) e em qual
navegador: a issue veio sem user-agent, e `Type error` é redação do motor, não nossa. A linha
completa do `js_error`, com `hits`, segue sem número: schema privado, sem credencial aqui.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, já no
`check:fast` e no `check:deploy`). Cláusula **EP8**, agora com o payload PUBLICADO da #465
(o fingerprint tem que ser reproduzido pela receita, mesma trava do EP12/EP17) e três
contra-fixtures. **2 mutações novas:** `sem-webglstate` e `webglstate-amplo`. Matriz
completa: **52 de 52 mordidos**.

### ~~BUG-75 · a redação do WebKit para export ausente caía em `codigo` — Safari nunca acionava o purge do edge~~ · RESOLVIDO 25/08 (issue #443)

**Sintoma (literal, issue #443, aberta pelo `crash-fix.yml` em 25/08 18:05Z):**
*"SyntaxError: Importing binding name 'resolveGeoLang' is not found."*, fingerprint
`6b4fb05e`, classe `codigo`, alpha.138, **origem, stack e migalhas vazias**.

**Causa raiz — confirmada, e não é bug de código.** `resolveGeoLang` nasceu no PR #388
(commit `684c8ca9`, 20/08) e estreou na **alpha.162**; na alpha.138 (`9db03fd4`, 17/08) nem
o export (`public/js/i18n.js`) nem o import (`public/js/main.js`) existem. **Nenhum deploy
isolado produz esse erro** — ele só existe na interseção de dois deploys no edge: o
"alpha.138" do relatório é o `?v=` do HTML **em cache** no navegador (`versao()`,
`src/pages/index.astro:88-93`), servido junto de módulo de outro deploy sob a mesma URL
versionada. Reincidência exata do BUG-39 (`edge_ttl` de 1 mês da regra `assets_jogo`,
`scripts/cloudflare-setup.sh:69-77`) — desta vez na redação do **WebKit**: "Importing
binding name … is not found." é o que o Safari escreve onde V8/Gecko escrevem "does not
provide an export". O `CACHE_SPLIT_RE` (`src/lib/error-provenance.mjs:6`) não conhecia essa
redação, `classifyCrash` devolveu `codigo`, e o `crash-fix.yml` abriu issue em vez de
disparar **purge do edge + re-probe**, a remediação determinística da classe. O fingerprint
fecha: `crashFingerprint('error', <mensagem>, null)` = `6b4fb05e`.

**Conserto.** Cinco redações entram no `CACHE_SPLIT_RE`, como substrings literais:
`Importing binding name` (WebKit, export ausente — cobre também a variante "cannot be
resolved by star export entries") e as quatro de bare specifier sem import map aplicado —
`was a bare specifier, but was not remapped` (Gecko), `era um especificador simples, mas não
foi remapeado` (Gecko **em pt-BR** — a mensagem literal da #362: o navegador entrega o erro
traduzido no idioma do jogador), `Failed to resolve module specifier` (V8) e
`Module specifier, .*? does not start with` (WebKit). Quita a dívida anotada na BUG-74
("`CACHE_SPLIT_RE` só conhece inglês"). A ordem de `classifyCrash` não muda: proveniência
externa segue vencendo cache-split (a mesma mensagem vinda de `chrome-extension://` continua
`externo` — fixture nova na EP7), e cache-split vindo do console segue disparando purge
(decisão do BUG-72, `jserror.ts:78-81`).

**Medido antes do conserto:**

| | antes | depois |
|---|---|---|
| redação WebKit de export ausente (#443) | `codigo` → issue falsa | `cache-split` → purge + re-probe |
| bare specifier sem import map (#362, pt-BR) | `codigo` → issue falsa | `cache-split` → purge + re-probe |
| fingerprints publicados `6b4fb05e` / `82b4da8e` | — | reproduzidos pela receita (EP16 mede) |
| cláusulas verdes / mutantes que mordem | 15 / 39 | 16 / 42 |

**Custo declarado:** cada redação nova **alarga o gatilho do purge** (`crash-fix.yml:71-74`
purga `/js/` e `style.css` do edge), inclusive vindo de `console` — que é deliberado
(BUG-72). Mitigação: substring literal da mensagem de cada engine, contra-fixtures na régua
(crash citando o MESMO símbolo, ex. `Can't find variable: resolveGeoLang`, continua
`codigo`) e proveniência externa por cima de tudo. O pt-BR cobre UMA língua além do inglês:
outra tradução do Gecko continuará caindo em `codigo` até chegar numa issue com a mensagem
literal — decisão de não caçar redação que nunca apareceu.

**Não verificado:** a linha completa do `js_error` (hits, user-agent) — sem credencial do
Supabase nesta máquina, como já registrado na BUG-74. O que foi medido sem banco:
`node tools/eval/prod-coherence.mjs https://www.csbrasil.online` fechou **verde** em 25/08 —
o mix da alpha.138 já não está servido e não há purge pendente; o conserto é só o rótulo.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, no
`check:fast` e no `check:deploy`). Cláusula **EP16**, **3 mutações novas**:
`cache-sem-binding`, `cache-so-ingles` e `cache-sem-especificador` — cada uma apaga uma
alternativa da regex e acende EP16. Matriz completa: **42 de 42 mordidos**.
### ~~BUG-78 · carteira cripto injetada no documento abria issue de crash como se fosse bug do jogo~~ · RESOLVIDO 21/08 (issues #403 e #404)

**Sintoma (literal, issues #403 e #404, abertas pelo `crash-fix.yml` em alpha.172):**

```
TypeError: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')   #403, fingerprint ab1ad30e
TypeError: undefined is not an object (evaluating 'window.ethereum.emit')                          #404, fingerprint e32cd1e4
Origem: https://www.csbrasil.online/:1:16
Stack:  global code@https://www.csbrasil.online/:1:16
```

**Não é defeito do jogo, e a prova é tripla.** (1) `window.ethereum`, `selectedAddress` e
qualquer identificador web3 **não existem em nenhum arquivo do repositório**, e
`git log --all -S "window.ethereum"` / `-S "selectedAddress"` não devolvem um único commit —
o `mint-assets.json` é o registro do gerador de modelos 3D (mint.gg), não tem web3. (2) O
fingerprint publicado reproduz EXATAMENTE
`crashFingerprint('error', <mensagem>, 'https://www.csbrasil.online/:1:16')`, ou seja o
`e.filename` é a **própria página**, `lineno=1`, `colno=16`. (3) O único frame é
`global code@` — nenhum arquivo do jogo aparece na pilha.

É extensão de carteira cripto injetando script **inline no documento**. O próprio
`index.astro` já dizia isso em comentário desde antes: *"extensões de carteira injetam
vários"*.

**Causa raiz — confirmada.** O `isExternalCrash` (`src/lib/error-provenance.mjs`) inocenta
por **origem**. O Safari reporta script de extensão injetado no mundo da página com o
filename **da página**, então o atalho
### ~~BUG-76 · ponte injetada pelo navegador abria issue de crash como se fosse bug do jogo~~ · RESOLVIDO 24/08 (issues #428, #379, #380, #381)

**Sintoma (literal, quatro issues abertas pelo `crash-fix.yml`, todas classe `codigo`):**

```
ReferenceError: Can't find variable: __gCrWeb                                    #428, alpha.182, fingerprint d85ae7e1, origem /:1:9
ReferenceError: Can't find variable: __firefox__                                 #379, alpha.159, fingerprint 470752a2, origem /:1:12
TypeError: undefined is not an object (evaluating 'window.__firefox__.reader')   #380, alpha.159, fingerprint 7122f83c, origem /:1:19
ReferenceError: Can't find variable: DarkReader                                  #381, alpha.159, fingerprint cd468274, origem /:1:11
Stack (as quatro): global code@https://www.csbrasil.online/:1:N
```

`__gCrWeb` é a ponte JS do **Chrome para iOS**, `__firefox__` a do **Firefox para iOS**,
`DarkReader` a da extensão homônima. Nenhuma é código do jogo, e nenhuma tem conserto aqui.
As três primeiras foram fechadas **à mão** como "ruído externo" — mas nada no código as
impedia de voltar, e a #428 é a volta.

**Não é defeito do jogo, e a prova é tripla.** (1) `__gCrWeb`, `__firefox__` e `DarkReader`
**não existem em nenhum arquivo do repositório**, e `git log --all -S` não devolve um único
commit para nenhum deles. (2) Os quatro fingerprints publicados reproduzem EXATAMENTE
`crashFingerprint('error', <mensagem>, 'https://www.csbrasil.online/:1:N')`, ou seja o
`e.filename` é a **própria página**. (3) O único frame é `global code@` — nenhum arquivo do
jogo aparece na pilha.

**Causa raiz — confirmada.** O `isExternalCrash` (`src/lib/error-provenance.mjs`) inocenta
por **origem**, e o WebKit reporta script injetado no mundo da página com o filename **da
página**. O atalho

```js
if (sourceOrigin === ownOrigin) return false;
```

decidia "é nosso" antes de qualquer outra prova. Daí nenhuma das regex seguintes
(`OPAQUE_RE`, `AMBIENTE_RE`, `CACHE_SPLIT_RE`, `RECOVERABLE_RE`, `MEDIA_ABORT_RE`) mordia e
o `classifyCrash` caía no `return 'codigo'` final — que escala e abre issue.

As irmãs **#138** (`Cannot redefine property: ethereum`) e **#166**
(`Failed to connect to MetaMask`) são a mesma família, mas traziam `chrome-extension://` no
source/stack e já caíam na `EXTENSION_RE`. O que era novo em #403/#404 é a forma **sem
esquema de extensão em campo nenhum**.

**Correção, em duas camadas espelhadas** — o mesmo remédio das BUG-51/72/73:

- `src/lib/error-provenance.mjs` — `CARTEIRA_RE` e o ramo em `isExternalCrash`, na **mesma
  posição e pelo mesmo motivo da `VENDOR_RE`**: antes do atalho same-origin, porque a
  carteira roda no próprio domínio mas o código é de terceiro. Classe `externo`. A linha
  continua gravada no `js_error`; some o disparo automático, não o dado.
- `src/pages/index.astro` — a MESMA redação em `origemDoJogo`. Sem cota nova: carteira cai
  no balde do `TETO_EXTERNO` que a BUG-51 já abriu (ao contrário do `TETO_MIDIA`, que a
  BUG-73 precisou criar). Com `interna === false` o erro também deixa de virar `erroDoBoot`
  e `lancamento.fail` — hoje uma carteira que estoura durante o boot podia ser acusada de
  ter derrubado o carregamento do jogo.

O corte é **estreito de propósito**: exige o NOME do global injetado
(`window.`/`globalThis.`/`self.` + `ethereum|solana|tronWeb|…`), nunca a forma da mensagem.
`ethereum` como palavra solta num texto nosso continua `codigo`, e é isso que o mutante
`carteira-ampla` prova. Cobre a **família** de carteiras e não uma regex por incidente, que
é a crítica que a BUG-72 fez ao padrão antigo.

**Custo declarado, medido na população real e não estimado.** Reclassificando as **90**
issues `crash-auto` do repositório com o helper de antes e o de depois, exatamente **2**
mudam de classe — a #403 e a #404, `codigo -> externo`. As outras 88 ficam idênticas
(51 `codigo`, 25 `externo`, 12 `recuperavel`). **Nenhuma outra issue deixa de abrir.**

**Régua:** `EP16` em `tools/eval/error-provenance-check.mjs` (`npm run eval:error-origin`,
já no `check:fast` e no `check:deploy` — nenhum passo novo no portão). Classifica os
payloads REAIS das duas issues (com os fingerprints publicados conferidos contra a receita),
exige que 5 mensagens vizinhas continuem `codigo`, e **executa o `origemDoJogo` recortado do
fonte** — regex de fiação sozinha aprovaria `function origemDoJogo(){ return true; }`.
Carrega ainda uma **invariante de honestidade**: varre `src/` e `public/js/` e fica VERMELHA
no dia em que o jogo passar a ter um `window.ethereum` de verdade, para o corte não virar
mordaça silenciosa sobre código nosso. Mutantes novos: `sem-carteira`, `carteira-ampla` e
`sem-carteira-cliente`, todos acendendo EP16. Cláusulas 15 -> 16, matriz de mutação 42/42.

**NÃO VERIFICADO:** não há browser nesta máquina, então a reprodução com uma extensão de
carteira de verdade não foi feita — a régua mede a **classificação**, não a injeção. A
tabela `js_error` do Supabase também não foi consultada.
decidia "é nosso" antes de qualquer outra prova. Daí nenhuma das regex seguintes (`OPAQUE_RE`,
`AMBIENTE_RE`, `CACHE_SPLIT_RE`, `RECOVERABLE_RE`, `MEDIA_ABORT_RE`) mordia e o
`classifyCrash` caía no `return 'codigo'` final — que escala e abre issue. É o MESMO atalho
que a #403/#404 (carteira cripto) atravessa.

**Por que o corte é por NOME e não pela FORMA — e isto é o parágrafo que decide a entrada.**
A tentação óbvia é cortar pela forma: "pilha de frame único `global code@<própria-origem>/:1:N`
não é nossa". Ela reprova, e por medição. A linha 1 do `dist/client/index.html` tem **268
caracteres**, e o `compressHTML` do Astro cola o `<!DOCTYPE>`, o `<head>`, o comentário e o
**nosso primeiro `<script is:inline>`** (o do `define:vars` do `__SUPPORT`) todos nela — o
nosso código começa na **coluna 167 da linha 1**. Um erro ali sai como
`global code@<origem>/:1:167`: frame único, raiz, linha 1, idêntico à família. O que separa a
#428 (coluna 9) do nosso código (coluna 167) é o comprimento de um comentário HTML, que é
resíduo de build e não invariante. Além disso `global code@` é redação **só do WebKit**: a
mesma extensão no Chrome desktop continuaria abrindo issue. E o corte por forma não tem
invariante de honestidade possível — ele depende de uma propriedade do artefato buildado, que
o `check:fast` não constrói. As duas primeiras fixtures negativas do EP17 travam essa decisão
em régua: têm a MESMA forma da família com global NOSSO e continuam `codigo`.

**Correção, em duas camadas espelhadas** — o mesmo remédio das BUG-51/72/73:

- `src/lib/error-provenance.mjs` — `PONTE_INJETADA_RE` e o ramo em `isExternalCrash`, na
  **mesma posição e pelo mesmo motivo da `VENDOR_RE`**: antes do atalho same-origin, porque a
  ponte roda no próprio domínio mas o código é de terceiro. Classe `externo`. A linha continua
  gravada no `js_error`; some o disparo automático, não o dado.
- `src/pages/index.astro` — a MESMA redação em `origemDoJogo`. Sem cota nova: ponte cai no
  balde do `TETO_EXTERNO` que a BUG-51 já abriu. Com `interna === false` o erro também deixa
  de virar `erroDoBoot` e `lancamento.fail` — hoje uma ponte que estoura durante o boot podia
  ser acusada de ter derrubado o carregamento do jogo.

O corte é **estreito de propósito**, e em dois eixos: exige o NOME do global de terceiro, e
exige a **caixa** dele. Identificador JS é sensível a caixa e a mensagem o cita verbatim, então
`falha ao carregar darkreader.glb` num texto nosso continua `codigo` — é isso que o mutante
`ponte-insensivel` prova, e é uma divergência deliberada em relação às outras regex do arquivo,
que usam `/i`. `webkit` solto **não** foi comprado (só `webkit.messageHandlers`), porque o jogo
usa `window.webkitAudioContext` de verdade. E `__\w+__` genérico está **proibido**: sete globais
do JOGO são dunder (`__GEO_LANG__`, `__SUPPORT`, `__CS_MAIN_FAILED`, `__CS_MAIN_READY__`,
`__CS_BOOT_SRC`, `__gameLaunch`, `__semWebgl`) e o corte genérico calaria crash nosso — é o
mutante `ponte-ampla`. O roster cobre a **família** (ponte de WebView, extensão, hook de
devtools) e não uma regex por incidente, que é a crítica que a BUG-72 fez ao padrão antigo:
`webkit.messageHandlers`, `__REACT_DEVTOOLS_GLOBAL_HOOK__` e `__VUE_DEVTOOLS_GLOBAL_HOOK__`
entram **sem incidente**, pelo mesmo mecanismo.

**Custo declarado, medido na população real e não estimado.** Reclassificando as **96** issues
`crash-auto` do repositório (mensagem, origem e stack lidos do corpo publicado) com o helper de
antes e o de depois, exatamente **4** mudam de classe — a #428, a #379, a #380 e a #381,
`codigo -> externo`:

```
ANTES : codigo 59 · externo 25 · recuperavel 12
DEPOIS: codigo 55 · externo 29 · recuperavel 12
```

As outras 92 ficam idênticas. **Nenhuma outra issue deixa de abrir.**

**Régua:** `EP17` em `tools/eval/error-provenance-check.mjs` (`npm run eval:error-origin`, já
no `check:fast` e no `check:deploy` — nenhum passo novo no portão). Classifica os payloads
REAIS das quatro issues, confere os quatro fingerprints publicados contra a receita (fixture
"arrumada" deixa de bater e acusa; as fixtures sintéticas não têm `fp` e por isso não podem se
passar por publicadas), exige que **sete** vizinhas continuem `codigo` — duas delas com a MESMA
forma da família — e **executa o `origemDoJogo` recortado do fonte**, porque regex de fiação
sozinha aprovaria `function origemDoJogo(){ return true; }`. Carrega ainda uma **invariante de
honestidade**: varre `src/` e `public/js/` pela forma de USO (`window.X`, `X.`, `X(`, `X =`) e
fica VERMELHA no dia em que o jogo falar com uma dessas pontes de verdade, para o corte não
virar mordaça silenciosa. Ela lê o fonte **mutado**, e não o disco — sem isso nenhum mutante
conseguiria acendê-la, e régua que ninguém pode quebrar não mede nada. Mutantes novos:
`sem-ponte`, `ponte-ampla`, `ponte-insensivel`, `sem-ponte-cliente` e `jogo-com-ponte`, todos
acendendo EP17 e só ele. Cláusulas 16 -> 17, matriz de mutação 47/47.

**NÃO VERIFICADO:** não há browser nesta máquina, então a reprodução com um Chrome para iOS de
verdade não foi feita — a régua mede a **classificação**, não a injeção. A tabela `js_error` do
Supabase não foi consultada. **Pontos cegos declarados:** a invariante de honestidade não varre
`public/vendor/` (three vendorizado) nem código gerado no build, e não pega acesso por string
(`window["__gCrWeb"]`) — não existe regex honesta para isso que não acenda no literal do próprio
corte. E o corte vale em qualquer campo, inclusive na mensagem: um crash NOSSO cujo texto apenas
cite um dos seis nomes sumiria. É o mesmo furo estrutural que a `EXTENSION_RE` tem desde a
BUG-51, e a invariante de honestidade é o guarda-corpo.
### ~~BUG-82 · perda de contexto WebGL no meio do frame lançava TypeError por frame, matava o launch e abria issue — a flag do three é assíncrona~~ · RESOLVIDO 25/08 (issues #419 e #420)

**Sintoma (literal, issues #420 e #419, mesma sessão, alpha.176, WebKit):**
*"TypeError: Argument 1 ('shader') to WebGL2RenderingContext.shaderSource must be an
instance of WebGLShader"*, fingerprints `645208c8` (#420) e `9e9db234` (#419), classe
`codigo`, origem `vendor/three.module.js:19355:17`, stack
`shaderSource@[native code] → WebGLShader → WebGLProgram → acquireProgram → getProgram →
setProgram → renderObject → renderScene → update@game.js → loop@main.js`. A #419 é o
**mesmo crash** com o prefixo *"Falha ao abrir partida: "* — o handler global
(`index.astro`) chamou `lancamento.fail()` durante o launch da etapa `partida`
(`main.js:985`), e o prefixo muda o hash FNV. Duas issues pela mesma corrida.

**Causa raiz — confirmada.** O three r160 vendorizado só se protege pela flag assíncrona
`_isContextLost` (`three.module.js:28562`), setada quando o evento DOM `webglcontextlost`
é **despachado** (`:29104`); a guarda única do `render()` era `if ( _isContextLost === true )
return;` (`:29547`). Entre a perda física do contexto e o despacho do evento,
`gl.createShader()` (`:19353`, ocorrência única no bundle) devolve `null` e a chamada
tipada seguinte — `gl.shaderSource(null,…)` — lança TypeError no WebKit. Como o
`requestAnimationFrame` é a 1ª linha do loop, o jogo não morre: lança **1 TypeError por
frame** até o evento chegar. Upstream r179 conferido: idêntico ao r160 aqui — não havia
guarda oficial a portar, a guarda é autoral.

**Palpite óbvio, REFUTADO com leitura medida:** "a recuperação de contexto não existe/não
roda". Falso — `main.js:80-105` já faz `preventDefault` + `forceContextRestore()` em
0,5/1,5/4 s com fatal deliberado em 8 s (`'contexto WebGL perdido'`), e a WG7
(`webgl-compat-check.mjs`) tranca os listeners desde o #303. O defeito não era a
recuperação: era a **corrida** (a janela entre a perda e o evento), o **rótulo** (o
`classifyCrash` não batia `OPAQUE_RE`, `AMBIENTE_RE`, `CACHE_SPLIT_RE`, `RECOVERABLE_RE`
nem `MEDIA_ABORT_RE` e caía no `return 'codigo'` final, que escala) e o **painel** (o
`fail()` matava o launch por um erro que ia se recuperar 500 ms depois).

**Correção, em três camadas espelhadas.**
1. *Vendor fecha a corrida*: a guarda do `render()` consulta a verdade síncrona do driver
   além da flag — `if ( _isContextLost === true || _gl.isContextLost() === true ) return;`.
   `isContextLost()` é leitura de flag do wrapper do contexto (setada no instante da perda;
   é para isso que a API existe), não sync de GPU: 1 chamada por `render()` contra milhares
   de GL calls. Frame na janela da corrida pula o render inteiro, como o frame seguinte ao
   evento já pulava.
2. *Classificação cala o alarme falso*: `CONTEXT_LOSS_RE` estreita em
   `src/lib/error-provenance.mjs` → classe `recuperavel`. A linha continua gravada no
   `js_error`; some o disparo automático, não o dado — e o corte vale até para cliente
   velho em cache, porque `classifyCrash` é fonte única (rota `/api/jserror` e
   `scripts/classify-crash.mjs` no CI).
3. *Cliente segura só o painel*: `erroDeContexto()` em `index.astro` (mesma redação da
   regex, função SEPARADA do `erroIgnoravel` para não desviar o balde `TETO_MIDIA` nem
   tocar a EP14) guarda apenas o `lancamento.fail()` do handler de erro global. O
   `reporta()` segue enviando; o watchdog de 60 s da etapa e o fatal de 8 s continuam de
   rede de segurança — o jogador nunca fica preso.

**Medido antes do conserto (25/08, helper real executado do fonte):**

| | antes | depois |
|---|---|---|
| `classifyCrash` das 2 formas de campo | `codigo` 2/2 | `recuperavel` 2/2 |
| família abre issue automática | 2/2 (#419, #420) | 0/2 |
| `fail()` derruba o launch na corrida | sim (#419) | não (fatal de 8 s continua) |
| fingerprints publicados reproduzidos pela receita | 2/2 | 2/2 (inalterados) |
| cláusulas / mutantes que mordem | EP 15, SL 7 / 39+5 | EP 16, SL 8 / **42+6, matriz completa medida** |

**Custo declarado, na população real.** Das **97** issues `crash-auto`
(`gh issue list --label crash-auto --state all`, 25/08), exatamente **2** são desta família
(#419/#420 — a busca `label:crash-auto "must be an instance"` devolve só as duas). Vizinhas
que continuam como estão, DE PROPÓSITO: a perda **persistente** (`'contexto WebGL
perdido'`, o fatal deliberado de `main.js:100`) segue `codigo` — é o mutante
`contexto-amplo` que tranca isso; a forma Chrome (*"Failed to execute 'shaderSource'…"*)
**nunca foi observada** em campo e segue `codigo` até haver dado (largura por palpite de
regex é o arnês aprovando a si mesmo); crash real dentro do vendor segue `codigo`;
*"THREE.WebGLProgram: Shader Error…"* (#331 etc.) segue no corte de log do BUG-72. No
cliente, o erro de contexto consome 1 slot do balde de exceção (deduplicado por
fingerprint — sem balde novo). Perda que acontece DURANTE um `render()` já em andamento
ainda lança 1 vez (a guarda roda no topo do frame); essa ocorrência única fica no
`js_error` como `recuperavel`. E o `catch` de `_startGame` (`main.js:1000`) chama o
`fail()` direto, sem a guarda do handler global — hoje inalcançável para esta família
(`game.start()` não renderiza; o render vive no `update` do loop), e no pior caso o
servidor já classifica `recuperavel`: fica anotado, não trancado.

**Não verificado:** sem WebKit/browser nesta máquina, a corrida não foi reproduzida ao
vivo (o harness node não tem WebGL; `crash-watch.mjs` exige browser) — o que está medido é
a forma da guarda e a assinatura de campo das duas issues. A garantia de que
`gl.isContextLost()` é `true` na janela antes do evento é de spec, não medida aqui. A
frequência da família por sessão no Supabase fica sem número (schema privado, sem
credencial).

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, no
`check:fast` e no `check:deploy`): **EP19** executa o helper e o `erroDeContexto`
extraídos do fonte, ancora os 2 fingerprints publicados e exige as 3 vizinhas `codigo`;
mutantes `sem-contexto`, `contexto-amplo` e `fail-no-contexto` — **42 de 42 na matriz
completa**. **E `tools/eval/shader-log-check.mjs`** (`npm run eval:shaderlog`): **SL8**
tranca presença e posição da guarda síncrona no topo do `render()` (textual-posicional
como SL4-SL6 — executar o `render()` inteiro exigiria stub do renderer inteiro, e arnês
desse tamanho mede a si mesmo, lição da EP12); mutante `sem-contexto-sincrono` — 6 de 6.

### ~~BUG-74 · o watchdog de boot relatava uma paráfrase nossa e jogava fora o erro do navegador~~ · RESOLVIDO 19/08 (issue #386)

**Sintoma (literal, issue #386, aberta pelo `crash-fix.yml` em 19/08 20:51:29Z):**
*"Falha ao abrir a arena: o código do jogo não chegou (verifique a conexão)"*, fingerprint
`9703f595`, classe `codigo`, alpha.159, origem `boot-watchdog`, stack
`Error: … at https://www.csbrasil.online/:290:43`.

**Localização, medida e não estimada.** Baixando o HTML de produção e contando, a linha 290
é o `lancamento.fail(erroDoBoot || new Error('o código do jogo não chegou …` e a coluna 43
cai no `new Error(` — ou seja, `:290:43` é `src/pages/index.astro:331`. O fingerprint
também fecha: `crashFingerprint('error', <mensagem>, 'boot-watchdog')` = `9703f595`.

**Causa raiz - confirmada.** A mensagem só sai quando **`erroDoBoot` é nulo E
`window.__CS_MAIN_FAILED` está ligado**: ela é o segundo operando de um `||`. Não é o ramo
de rede lenta, que a casa separou no #265 e que deliberadamente não abre `crash-auto`. O
módulo de entrada falhou de verdade, e o motivo foi descartado em `index.astro:1215`:

```html
onload="window.__CS_MAIN_LOADED=1" onerror="window.__CS_MAIN_FAILED=1"
```

O `onerror` de `<script>` é evento de **recurso**: não borbulha, então o listener global
(`index.astro:301-307`), que é quem preenche `erroDoBoot`, nunca o vê. O handler guardava um
booleano e jogava fora o `ErrorEvent` inteiro, inclusive o `this.src` com o `?v=` - o único
dado que separaria "CDN sem o módulo daquele deploy" de "conexão caiu". Minutos depois, o
clique do jogador na splash **fabricava um `Error` novo, em português, escrito pela casa**.
O que chegava ao classificador não era a falha: era a nossa paráfrase dela.

**A consequência era cara.** `CACHE_SPLIT_RE` (`src/lib/error-provenance.mjs:6`) só conhece
frases do navegador **em inglês**. A paráfrase não casa nenhuma, a classe vira `codigo`, e
com `codigo` o `crash-fix.yml` **pula o purge do edge e o re-probe** (`crash-fix.yml:66-84`):
a remediação determinística feita exatamente para esta causa não roda.

**Descartado com medição: não foi deploy nem CDN.** A alpha.159 saiu 19h08 antes (19/08
01:43:12Z) e nada foi publicado no intervalo. O `prod-watch` (cron de 15 min) passou **verde
às 20:34:08Z, 17 minutos antes, e às 21:01:50Z, 10 minutos depois** - e o
`tools/eval/prod-coherence.mjs` baixa o HTML da raiz e **cada módulo com o `?v=` exato**,
tratando 404 como incoerência. O jogador ficou entre duas medições verdes do mesmo recurso.
O único vermelho da janela foi `csbrasil-bot-pr-classify` às 20:29:34Z, num branch de PR.

**Causa provável, ainda não provada: a #362.** Um Firefox reportando *"O especificador
'three' era um especificador simples, mas não foi remapeado para nada"* em
`main.js?v=…:2:24` - que é o `import * as THREE from 'three'`, linha 2, coluna 24. Import
map não aplicado derruba o grafo do módulo, dispara o `onerror` da tag e liga o
`__CS_MAIN_FAILED`; se esse jogador tocar na splash, ele gera exatamente a #386. Navegador
sem suporte a import map (Firefox < 108, Safari < 16.4) ou proxy que reescreve a tag
produzem isso, e o `prod-coherence` **não pegaria**, porque resolve o import map ele mesmo
em vez de observar um browser que o ignora.

O parentesco é literal: o commit que fechou a #265 (`5bbad829`, 14/08) foi o que **criou** a
linha 331. O ramo novo disparou pela primeira vez cinco dias depois.

**Correção - é instrumentação, não diagnóstico.** O `onerror` passou a guardar
`window.__CS_BOOT_SRC=this.src`; o ramo do watchdog registra três migalhas antes do `fail`
(módulo que falhou, `HTMLScriptElement.supports('importmap')` e estado da rede); e as
migalhas, que eram gravadas no banco (`jserror.ts:98`) mas **nunca entravam no
`client_payload`** (`:137`), agora atravessam até o corpo da issue. A evidência viaja na
**migalha e não na mensagem**, de propósito: o fingerprint é `kind|message|source`, e pôr o
`?v=` no texto criaria fingerprint novo a cada release, picotando o agrupamento que a
BUG-71 acabou de consertar. A cláusula EP14 amarra isso conferindo que `9703f595` não muda.

**Medido antes do conserto:**

| | antes | depois |
|---|---|---|
| evidência no relatório de falha de boot | nenhuma | módulo, import map e rede |
| migalhas chegam à issue | não | sim |
| fingerprint `9703f595` | estável | estável (EP14 mede) |
| cláusulas verdes / mutantes que mordem | 13 / 32 | 14 / 36 |

**Custo declarado, e é preciso ser franco: este conserto NÃO resolve a #386.** A causa
continua desconhecida e **a gravidade não foi medida** - o schema do Supabase é privado
(`~/db-privado/`, fora do repo) e não há ferramenta de consulta, então não sei se
`9703f595` atingiu um jogador ou muitos. O que muda é que a próxima ocorrência chega
diagnosticável. Fica também anotado, para PR próprio: **`CACHE_SPLIT_RE` só conhece
inglês**, e foi por isso que a #362 (mensagem do Firefox em pt-BR) também caiu em `codigo`
em vez de `cache-split` e perdeu o purge automático. Mexer nisso altera a classe que
dispara purge de edge e merece régua própria. *(Quitado na BUG-75, issue #443: EP16 e
três mutações próprias.)*

**Não verificado:** o caminho de ponta a ponta (módulo falha → `onerror` → migalha → issue)
exige navegador e Supabase. O que foi verificado sem navegador: a régua recorta e executa o
fonte, e o **bundle SSR gerado pelo `npm run build`** contém o `onerror` novo e as três
migalhas. O `boot-check.mjs` seria o lugar de uma cláusula que injeta falha de carregamento
de módulo, mas ele exige browser e está fora do `check` - fica como dívida declarada, e não
como cobertura fingida.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, no
`check:fast` e no `check:deploy`). EP14, **4 mutações medidas**: `onerror-sem-src`
(volta ao sinalizador pelado), `boot-sem-migalha`, `payload-sem-migalhas` e
`issue-sem-migalhas`. Todas acendem EP14; as 32 anteriores seguem nas suas -
**36 de 36 na matriz completa**. Antes deste conserto, `grep` por `__CS_MAIN_FAILED`,
`__CS_MAIN_LOADED` e `boot-watchdog` em `tools/`, `tests/` e `.github/` devolvia **zero**:
esse caminho não tinha régua nenhuma.
### ~~BUG-73 · abort de mídia virava crash de produção — o jogo cortava o `play()` de propósito e abria issue por isso~~ · RESOLVIDO 20/08 (issue #389)

**Sintoma (literal, issue #389, aberta pelo `crash-fix.yml`):**
*"The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22"*,
fingerprint `7d439dd4`, classe `codigo`, alpha.161, **origem e stack vazias**.

**Causa raiz — confirmada.** Não é defeito de áudio: é o rótulo. Essa mensagem é o
`AbortError` que o navegador devolve quando um `play()` pendente é cortado por um
`pause()`, e **o jogo corta de propósito**, em três lugares — `audio.js:97` (`radioVoice`
corta a fala anterior, comportamento CS-style), `audio.js:119` (`characterSelectVoice`
corta a voz do avatar anterior) e `audio.js:159` (`stopRound` corta a vinheta com fade).
Não é acidente nem descuido: `tools/eval/character-select-voice-check.mjs:56` **exige** a
interrupção (`VOICE8 a fala anterior não foi interrompida (pausas=3)`).

O abort chega **sem `stack` e sem `source`**. Sem nenhuma URL para inspecionar, o
`origemDoJogo` do cliente cai em `return !viuExterna` = `true` (marca como interno e come
a cota de exceção), e o `classifyCrash` não batia `OPAQUE_RE`, `AMBIENTE_RE`,
`CACHE_SPLIT_RE` nem `RECOVERABLE_RE`: caía no `return 'codigo'` final e escalava. Trocar
de faixa, clicar rápido em dois avatares ou entrar na partida por cima da vinheta abria
issue automática no GitHub.

**É a metade não terminada do BUG-37**, que já tinha o diagnóstico certo em 07/08 —
*"O defeito não é o áudio: é o overlay de crash tratar isso como crash"* — e cujo próximo
passo prescrito era exatamente *"filtrar `AbortError` de mídia"*. Desde então entrou o
`erroIgnoravel` (`index.astro:163`), mas ele só silenciava o painel de falha (`:322`):
**não cortava o `reporta()` da linha 321**, e o servidor nunca soube de nada. Medido no
`erroIgnoravel` de antes, executado do fonte: reconhecia a forma `DOMException` com
`name:'AbortError'` e **não** reconhecia a forma só-mensagem — e em nenhuma das duas
impedia o envio.

**Palpite óbvio, REFUTADO com medição.** *"Algum `play()` perdeu o `.catch()`."* Falso, e
a prova já estava no portão: `npm run eval:medianet` varre **49 `.js`, 2 módulos de mídia,
7 `play()` inspecionados**, e tranca esse contrato desde a #117 — verde antes e depois
deste conserto. Conferidos à mão os 7 sítios (`audio.js:55`, `main.js:406-409`, `:412`,
`:416`, `:449`, `:501`): todos guardados. Não há `<audio>` no HTML (só o
`<video id="char-preview-video">` de `index.astro:914`) e não existe Howler nem
`THREE.Audio` no repo. **Por isso `public/js/audio.js` e `public/js/main.js` não foram
tocados:** conserto ali deixaria a régua verde antes e depois, que é a régua que não mede
nada.

**Medido antes do conserto** (helper e `erroIgnoravel` reais, extraídos do fonte, sem browser):

| | antes | depois |
|---|---|---|
| abort de mídia classificado `recuperavel` | **0/5** | **5/5** |
| abort de mídia abre issue | **5/5** | **0/5** |
| `erroIgnoravel` do cliente reconhece as 2 formas | 1/2 | 2/2 |
| balde que o abort consome no cliente | 1 dos 10 de exceção | 1 dos 2 de mídia |
| crash real dentro de `audio.js` continua `codigo` | sim | sim |
| cláusulas verdes / mutantes que mordem | 13 / 32 | 14 / 35 |

As 5 redações medidas são as do Chrome/Firefox/Safari: `…interrupted by a call to
pause()`, `…by a new load request`, `…because the media was removed from the document`,
`The fetching process for the media resource was aborted…` (a do BUG-37) e
`AbortError: The operation was aborted.`

**Custo declarado, medido na população real.** Das **88** issues `crash-auto` do
repositório, exatamente **2** são desta família: a #389 (aberta) e a #122 (fechada, a do
BUG-37). Nenhuma outra deixa de abrir. O regex é estreito de propósito — `aborted` ou
`interrupted` soltos engoliriam crash de verdade, e é isso que o mutante `midia-ampla`
prova. A linha continua gravada no `js_error` com rótulo `recuperavel`: some o disparo
automático, não o dado.

**O que deliberadamente NÃO entrou no corte, e por quê.** Duas mensagens de mídia vizinhas
seguem `codigo`, conferidas uma a uma:

| issue | mensagem | por que continua acionável |
|---|---|---|
| #293 (aberta) | *"The media resource indicated by the src attribute … was not suitable."* | não é abort: é som que **não toca**. É o sinal do BUG-08/BUG-52 (mídia nova ignorada em silêncio), o defeito mais caro desta base em áudio |
| #117 (fechada) | *"The play method is not allowed by the user agent…"* | autoplay barrado; já tem régua no portão (`eval:medianet` nasceu dela) e o jogo já cai no fallback mudo de `main.js:407` |

**Custo declarado adicional.** Se algum dia um abort de mídia for sintoma de defeito real
(o `pause()` chegando cedo demais e cortando fala que deveria tocar inteira), ele deixa de
gritar sozinho — vai estar no `js_error` com `classification='recuperavel'`, e quem
procurar acha. É a mesma troca do BUG-72: fim do "regex por incidente" em troca de olhar a
telemetria em vez de esperar issue.

**Não verificado, e é honesto dizer:** **não há browser nesta máquina** (sem Playwright
global, sem `CHROME_BIN`), então `tools/eval/crash-watch.mjs` — o instrumento que
capturaria o `unhandledrejection` ao vivo — não rodou, e **o produtor exato da promessa
solta em produção continua sem nome**. Os 7 `play()` do fonte estão guardados, então o
candidato mais provável é bundle antigo em cache, extensão ou portal. O que este conserto
prova é que, produza quem produzir, a mensagem não vira mais crash nem issue. Quem tiver
Chrome: `npm run eval:serve &` e `node tools/eval/crash-watch.mjs`, spammando rádio e troca
de avatar. A tabela `js_error` do Supabase também não foi consultada (sem credencial aqui),
então quantos slots de `TETO_SESSAO` a família vinha comendo por sessão fica sem número. E
o stub de node (`tools/eval/harness.mjs:83`) tem `Audio.play()` devolvendo `undefined`, não
Promise: **nenhuma régua node-side consegue observar essa rejeição** — por isso a régua
mede a classificação, não a reprodução.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, já no
`check:fast` e no `check:deploy` — nenhum passo novo no portão). EP14 mede os dois lados:
classifica as 5 redações do navegador, exige que 3 mensagens vizinhas continuem `codigo`
(inclusive um crash que estoura **dentro** de `audio.js`), e **executa o `erroIgnoravel`
recortado do fonte** — regex de fiação sozinha aprovaria `function erroIgnoravel(){ return
true; }`, que calaria crash de verdade. **3 mutações medidas:** `sem-midia` (o ramo devolve
`codigo` e a #389 volta a abrir issue), `midia-ampla` (troca o regex por
`/aborted|interrupted/i` e o crash de `audio.js` vira `recuperavel`) e `sem-cota-midia`
(anula o teto e o abort volta a comer a cota de exceção). Todas acendem EP14; as 32
anteriores seguem acendendo as suas — **35 de 35 na matriz completa**.

### ~~BUG-72 · `console.error` informativo virava bug do jogo, e a pilha do idioma `(msg, e)` se perdia~~ · RESOLVIDO 19/08 (issue #382)

**Sintoma (literal, issue #382, aberta pelo `crash-fix.yml`):**
*"%c[cheat-demo] ainda sem window.__game - você está no menu. Entre numa partida (JOGAR) e
o cheat ativa sozinho. color:#ff2244;font-weight:bold"*, classe `codigo`, alpha.159,
**origem e stack vazias**.

**Causa raiz - confirmada.** Não é exceção. `cheat-demo`, `ainda sem window.__game` e
`o cheat ativa sozinho` não existem em nenhum arquivo do repositório, `git log --all -S`
não devolve commit para nenhuma delas, e não há **um único** `%c` em todo o repo. É snippet
de cheat de terceiro colado no devtools de produção; `window.__game` é o handle público que
o jogo expõe, e o `SECURITY.md:9` já assume que anti-cheat client-side é teatro.

O hook de `console.error` (`src/pages/index.astro:363-374`) junta até 4 argumentos com
`partes.join(' ')` - daí o `%c` e a CSS colados no título - e passa `source` como `null`
**hardcoded**, razão de *toda* issue deste caminho ter "Origem:" vazia. Sem source e sem
pilha, o `origemDoJogo` do cliente cai em `return !viuExterna` = `true` (marca como interno
e consome a cota de exceção) e o `classifyCrash` não bate `OPAQUE_RE`, `AMBIENTE_RE`,
`CACHE_SPLIT_RE` nem `RECOVERABLE_RE`: cai no `return 'codigo'` final e escala.

**Não era caso isolado.** De 84 issues `crash-auto`, cerca de **24 são log informativo e
não exceção**: `%c[cheat-demo]` (#382), avisos de extensão (#309, #328, #157, #156),
`Couldn't load texture` (10 issues, já contidas pela `RECOVERABLE_RE`),
`THREE.WebGLProgram: Shader Error` (9), e avisos de mídia (#293, #122, #117). O padrão da
casa vinha sendo comprar uma regex por incidente: a #110 comprou a `RECOVERABLE_RE`
sozinha. Este conserto corta a classe em vez de comprar a próxima regex.

**Segundo defeito, achado auditando o corte - e foi ele que salvou o conserto.** O corte
"console sem pilha não escala" ia silenciar **código nosso**: `main.js` chama
`console.error('falha ao abrir a partida', e)` em 4 lugares (`:959`, `:1010`, `:1102`,
`:1841`), com o erro no argumento **1**, e o hook lia só `arguments[0].stack`. Ou seja, a
pilha já estava sendo jogada fora hoje - esses relatos sempre chegaram com stack vazia - e
com o corte parariam de abrir issue. O hook agora varre os argumentos até achar pilha.

**Medido antes do conserto** (helper e hook reais, sem browser):

| | antes | depois |
|---|---|---|
| payload da #382 escala | sim (`codigo`) | não (`log`, gravado) |
| `console.error('falha ao abrir', e)` traz pilha | **não** | sim |
| `console.error(new Error(...))` escala | sim | sim |
| `cache-split` vindo do console dispara purge | sim | sim |
| cláusulas verdes / mutantes que mordem | 12 / 25 | 13 / 31 |

**O que foi DESCARTADO com medição.** Cortar só na diretiva `%c`: mata a #382 e mais nada.
As outras ~23 do mesmo grupo não têm `%c`, e o corte por formato é conserto no sintoma.

**Custo declarado, medido.** A família `THREE.WebGLProgram: Shader Error` (9 issues: #331,
#330, #294, #275, #130, #127, #121, #120, #115) deixa de abrir issue. Aceito porque shader
já tem régua **no portão**, e mais forte que issue de produção:
`tools/eval/shader-log-check.mjs` existe para que "logs WebGL anuláveis não escondam o
diagnóstico real do shader" e `tools/eval/shader-budget-check.mjs` mede o orçamento de
varyings. A linha continua na telemetria bruta. A família da textura (10 issues) não muda:
já era `recuperavel`. `glcontext.js:105` também não muda: já é `externo` pela `AMBIENTE_RE`.
**Inventário dos 6 sítios de `console.error` em `public/js/`, um a um:**

| sítio | tem pilha depois do conserto | escala |
|---|---|---|
| `main.js:959` `'falha ao abrir a partida', e` | sim (argumento 1) | sim |
| `main.js:1010` `'preload da partida falhou parcialmente', e` | sim | sim |
| `main.js:1102` `'dispose falhou ao sair pro menu', e` | sim | sim |
| `main.js:1841` `'switch team failed', e` | sim | sim |
| `glcontext.js:105` `sem_webgl: …` | não | não, e já era `externo` pela `AMBIENTE_RE` |
| `game.js:739` `TIMES DESIGUAIS` | sim, passou a carregar `Error` | sim |

Sem os dois consertos acima este patch silenciaria **cinco** sítios de sinal real de uma
vez. Com eles, zero. O `game.js:739` foi o mais perto de escapar: é o único sinal
deliberado do nosso código que só existia como `console.error` de string, **não há régua
nenhuma cobrindo composição de times** (conferido: nada em `tools/eval/` cita `teamCount`,
`teamSize` ou `TIMES DESIGUAIS`), então quem o guarda agora é a própria EP13, pelo mutante
`times-sem-erro`. Envolver em `Error` não move o agrupamento: o hook usa
`a.message ? a.message : String(a)`, então o texto reportado continua byte a byte o mesmo.

**O risco que sobra, declarado.** O `three.module.js` reporta quase tudo por `console.error`
com string literal e sem `Error` (`Shader Error`, `WebGLState: Invalid blending`,
`computeBoundingSphere(): Computed radius is NaN`). Esses deixam de abrir issue. É
exatamente o custo que se quis trocar pelo fim do "regex por incidente", e os controles
compensatórios existem, com os limites deles: `tools/eval/console-check.mjs` reprova o
portão com qualquer erro de console nas rotas publicadas em Chrome de verdade (mas só
carrega rotas, não entra em partida), `shader-log-check.mjs` guarda o diagnóstico de shader
e `shader-budget-check.mjs` o orçamento de varyings. E tudo continua gravado no `js_error`
com `kind='console'`: some o disparo automático, não o dado.

**Não verificado:** o `sendBeacon` real de uma sessão com devtools aberto, e como o `%c` se
comporta no console nativo de Firefox e Safari. A régua exercita o hook extraído do fonte,
não o navegador.

**Régua: `tools/eval/error-provenance-check.mjs`** (`npm run eval:error-origin`, no
`check:fast` e no `check:deploy`). EP13 executa o hook do console **extraído do fonte** com
os mesmos argumentos que o jogo passa - regex de fiação sozinha aprovaria uma varredura que
não varre - e mede também a cota. **6 mutações medidas:** `sem-log`, `log-amplo` (tira o
`&& !stack`, e console COM pilha pararia de escalar), `log-sobre-tudo` (rebaixaria
`cache-split` e mataria o purge), `log-nao-corta`, `sem-teto-console` e
`pilha-so-no-primeiro` (devolve o furo do `arguments[0]`). Todas acendem EP13; as 25
anteriores seguem acendendo as suas - **31 de 31 na matriz completa**.

### ~~BUG-71 · `/api/jserror` aceitava fingerprint forjado — carga sintética abria issue e calava crash real~~ · RESOLVIDO 19/08 (issue #383)

**Sintoma (literal, issue #383, aberta pelo `crash-fix.yml`):**
*"jserror-overload-2026-08-19T17-36-24-896Z | fase A (mesmo fingerprint) #1"*,
fingerprint `18084ef4`, classe `codigo`, **sem stack, sem origem e sem versão do jogo** —
enquanto #379, #380 e #381, do mesmo dia, chegaram todas com `2.0.0-alpha.159`.

**Causa raiz — confirmada.** `src/pages/api/jserror.ts` lia o `fingerprint` do corpo e o
entregava ao RPC sem conferir nada. Esse campo é ao mesmo tempo a **chave de agrupamento**
do `js_error` (o UPSERT da migration 015 vira `hits`) e a **chave de dedupe do
escalonamento** (`dispatched_at`, migration 020). Aceito na palavra do cliente ele deixa de
ser função do conteúdo, e o estrago tem dois sentidos: uma rajada com um fingerprint só (a
"fase A" da #383) funde erros DISTINTOS num grupo só e **todos menos o primeiro somem sem
nunca abrir issue**; e texto arbitrário de qualquer `curl` vira título de issue `crash-auto`.

**A medição que prova.** A receita do `digital()` de `src/pages/index.astro` é FNV-1a de 32
bits sobre `kind|message|source`. Aplicada aos fingerprints **publicados** nas três issues
legítimas de 19/08 ela os reproduz, e não reproduz o da #383 em nenhum dos três `kind`
possíveis (`127b9df5`, `5ead1108`, `00753bac` contra o `18084ef4` reivindicado):

```
ANTES   ACEITA 470752a2 #379 · ACEITA 7122f83c #380 · ACEITA cd468274 #381 · ACEITA 18084ef4 #383
DEPOIS  ACEITA 470752a2 #379 · ACEITA 7122f83c #380 · ACEITA cd468274 #381 · RECUSA 18084ef4 #383
```

**Correção, e ela mudou de forma na revisão.** A primeira versão **recusava com 400** o corpo
incoerente. Dois críticos de contexto limpo mostraram, executando o cliente real, que isso
**apagava relatório legítimo**: o cliente cortava a mensagem em 500 chars ao serializar mas
hasheava o valor BRUTO, então todo crash com mensagem acima de 500 (stack embutida,
`console.error` multi-argumento, o `'Falha ao abrir ' + etapa + ': ' + msg` do `lancamento`)
respondia 400 e sumia — inclusive no botão ENVIAR RELATÓRIO, que reenvia o mesmo corpo e
nunca fecharia. O conserto ficou nos dois lados, na causa:

- **cliente** (`src/pages/index.astro`): `corta()` espelha o `str()` do servidor, e `reporta`
  passa a hashear **exatamente o que envia**;
- **servidor** (`src/pages/api/jserror.ts`): incoerente **não é recusado** — é gravado sob a
  chave DERIVADA do conteúdo (o que desfaz a fusão do grupo) e fica fora do escalonamento,
  no mesmo early-return do `externo`.

**Armadilha da receita, e ela é real:** a multiplicação do `digital()` é em **ponto
flutuante**. `h * 16777619` passa de 2^53 e perde precisão, e é esse número lossy que está
publicado nas issues desde a alpha.1. `Math.imul`, que é a FNV-1a "correta", dá outro valor
(`cd468274` → `b7cc23a5`) e invalidaria todo fingerprint em campo. Mutante `receita-imul`.

**Régua.** EP12 de `tools/eval/error-provenance-check.mjs` (`npm run eval:error-origin`).
Ela **extrai e executa** a `digital`, a `corta` e o trecho de hash do `reporta` do
`index.astro` — recompor a receita à mão foi o furo da primeira versão, que aprovava uma
composição existente só dentro do arnês. Exige: os três fingerprints publicados reproduzidos;
o corpo real do cliente aceito **inclusive com mensagem de 900 chars, espaço nas pontas,
source de 400 chars e mensagem vazia**; o forjado da #383 recusado nos três `kind` com as 5
chaves derivadas da rajada saindo **distintas**; e a fiação conferida sobre o código **sem
comentários** — a versão anterior casava um `return` COMENTADO e ficava verde com a guarda
desativada.

**Mutantes:** `sem-fingerprint` (coerente por decreto), `escala-incoerente` (devolve o vetor
da #383), `grava-forjado` (grava sob a chave reivindicada e envenena o agrupamento),
`receita-imul`, `cliente-hash-bruto` (cliente volta a hashear o valor bruto — acende pela
mensagem comprida) e `cliente-sem-retrim` (ver abaixo). Os seis acendem EP12; os 19
anteriores seguem acendendo as suas — **25 de 25 na matriz completa**.

**Segundo defeito, achado auditando o primeiro: a régua comparava o cliente com ele mesmo.**
O `servidorAceita` da EP12 conferia o fingerprint contra o corpo que o cliente monta, sem
passar pelo `str()` de `jserror.ts:32` que a API aplica antes de conferir. Com isso a
fronteira do corte ficava cega: mensagem com espaço EXATAMENTE no caractere 500 (ou source
no 300) era cortada pelo cliente com o espaço no fim, o `trim()` do servidor o tirava, e o
fingerprint deixava de bater — crash real gravado sob chave derivada e **nunca escalado**,
em silêncio. Medido: `'a'*499 + ' ' + 'b'*50` fecha em 500 chars no cliente e em 499 no
servidor. A régua agora roda o `str()` real antes da conferência (o que a deixou vermelha,
como devia), e o `corta()` do cliente reapara depois do corte, de modo que o `trim()` do
servidor vira no-op. O mutante `cliente-sem-retrim` desfaz o reaparo e acende EP12.

**Custo declarado.** Durante a janela de cache, aba aberta com o `index.astro` antigo hasheia
o valor bruto: relatório com mensagem acima de 500 chars ou source acima de 300 continua
**gravado**, mas não escala até a aba recarregar. Fingerprint em campo muda **só** nesses dois
casos — os três publicados acima são byte a byte os mesmos. **Não verificado:** POST real
contra staging; a guarda foi exercitada pelo helper de produção, pelo trecho executado do
cliente e pela conferência de fiação, não contra o banco.

### ~~BUG-70 · crash em produção no `_updatePickups` — arma do mapa com id que não existe~~ · RESOLVIDO 18/08

**Sintoma (literal, issue #366, aberta pelo `crash-fix.yml`):**
*"Uncaught TypeError: Cannot read properties of undefined (reading 'short')"*,
fingerprint `ea71c000`, classe `codigo`, versão 2.0.0-alpha.157, em
`game.js:4849:66` → `Game._updatePickups` → `Game.update` → `loop`.

**Causa raiz — confirmada.** `map_penitenciaria.js:223` declarava o 8º pickup da fileira
central como `kind:'smg'`. **`smg` não é arma: é CLASSE de arma.** Quem mapeia arma→classe
é `recoil.js:38`, `game.js:316`, `audio.js:271` e `vmattach.js:622`, todos com
`mp5|uzi|p90 -> 'smg'`; `WEAPONS` (em `public/js/data/weapons.js`, 26 chaves) nunca teve
`smg`. O prompt do `[E]` desreferencia `WEAPONS[w].short` **sem guarda**
(`game.js:4849`), e o `_updatePickups` roda **todo quadro** dentro do `update()` — então
olhar para aquela arma não estragava o HUD, **congelava a partida**. O mapa entrou em
`f87ff467` (Penitenciária + Velho Oeste, #335), o que explica por que o crash é novo.

**Reprodução:** `node tools/eval/pickup-arma-check.mjs` (semente 12345, sem browser). A
cláusula PA2 planta o jogador em cima do pickup e chama o `_updatePickups` de produção;
a exceção sai com a mensagem literal de #366.

**Medido antes do conserto** (`node tools/eval/pickup-arma-check.mjs`, 12 mapas, 772 pickups):

| | antes | depois |
|---|---|---|
| ids de pickup fora de `WEAPONS` | **1** (`penitenciaria/mapa 'smg'`) | 0 |
| mapas em que o `_updatePickups` de produção lança | **1** (penitenciaria) | 0 |
| `_grabPickup` naquele pickup | `false` (impegável) | `true`, jogador sai com `uzi` na mão |

**O que foi DESCARTADO com medição, não com palpite.** O caminho óbvio era `WEAPONS[w]?.short`
na linha do crash. Medido: com o `?.`, o HUD passa a escrever literalmente
**`[E] PEGAR undefined`** e `_grabPickup(pk, player, true)` continua devolvendo **`false`** —
a arma segue impegável, uma caixa dourada em x=10,0 z=−2,2 no meio de 7 armas de verdade.
O `?.` não conserta o defeito: troca um crash por uma mentira. Por isso o conserto é no
**id**, e a guarda de runtime ficou na **porta de entrada**, não no `.short`.

**Correção.** Duas, em camadas diferentes:
1. `public/js/map_penitenciaria.js:223` — `'smg'` → `'uzi'` (SMG de verdade, chave de
   `WEAPONS`; `mp5` já ocupava a outra vaga de SMG da fileira). É a causa.
2. `public/js/game.js:573-581` — id que não existe em `WEAPONS` **não entra no estado do
   jogo**: o pickup é descartado na ingestão do mapa com `console.warn`. É rede, não
   conserto: mantém o defeito de dado fora do caminho quente sem escondê-lo de quem mede,
   porque a régua lê a lista **crua** do `MAPS[id].build()`, antes desta porta.

**Custo declarado, medido.**
- `check:fast` ganhou um passo: **+3,7 s** (`eval:pickuparma`), de 53 para 54 passos.
- A penitenciária ganhou uma arma jogável a mais na fileira central (a vaga já existia e
  estava morta). Posição, yaw e contagem de pickups do mapa não mudaram: **16 antes, 16
  depois**. A caixa-marcador `arma-central-uzi` passa a ser trocada pelo GLB real em
  `game.js:574`, como as 7 irmãs — **isto não foi verificado em browser**, só no harness,
  onde o carregamento de GLB é stub.

**Régua: `tools/eval/pickup-arma-check.mjs`** (`npm run eval:pickuparma`, no `check:fast`).
2 cláusulas, 3 mutações medidas:
`--mutante=smg` acende PA1 (1 id fora de `WEAPONS`) **e** PA2 (1 mapa lançando) — reproduz #366;
`--mutante=sem-short` acende PA1 nos 12 mapas (`mp5` sem `.short`);
`--mutante=sem-pickups` acende a anti-vacuidade nos 12 (0 < piso de 20).
**Resultado negativo medido e declarado no cabeçalho da régua:** `--mutante=sem-short`
**não** acende a PA2, e é de propósito — campo ausente numa arma que existe vira
`undefined` no template (mentira), não exceção. PA2 pega o crash, PA1 pega a mentira que
sobra quando alguém "conserta" o crash com `?.`.

### ~~BUG-51 · erro de extensão ou beacon virava bug do jogo~~ · FECHADO 29/08 — o que a entrada exigia já estava tudo no código (BUG-72..80), conferido cláusula a cláusula

**Evidência antes.** #138, #152, #156, #157 e #166 têm esquema
`chrome-extension://` ou `moz-extension://` na origem, stack ou mensagem. #142 e #144
apontam integralmente para `static.cloudflareinsights.com`; os offsets correspondem às
chamadas `Array.prototype.at()` do beacon Cloudflare em navegador antigo. Mesmo assim, as
sete ocorrências foram classificadas como `codigo` e abriram issues `crash-auto`.

**Causa.** O cliente preserva e envia todo erro, mas usa a proveniência apenas para decidir
parte do watchdog. A API despacha toda primeira ocorrência e o workflow trata qualquer coisa
que não seja cache inconsistente como código do jogo.

**Régua.** `tools/eval/error-provenance-check.mjs` deve executar o classificador real e
provar: esquema de extensão e URL cross-origin são externos; same-origin e sinais opacos não
são descartados; a API grava antes de filtrar o dispatch; o workflow não abre issue externa;
e o cliente não atribui erro externo ao lançamento. Mutantes cobrem cada fronteira.

**Revisão adversarial (11/08, três leituras independentes).** Quatro furos achados no
primeiro desenho, todos fechados e guardados por fixture ou mutante:

1. `CACHE_SPLIT_RE` tinha precedência sobre a proveniência: erro de extensão com
   mensagem de import dinâmico virava `cache-split` e podia acionar purge do
   Cloudflare. Proveniência agora vence (EP7 + mutante `cache-antes-origem`).
2. URL externa só na **mensagem** era tratada como proveniência: uma promise do
   próprio jogo rejeitada com texto ("falha ao carregar https://api…") calava o
   watchdog. URL http só prova origem em `source`/`stack`; esquema de extensão
   continua valendo na mensagem (#157). Vale no helper e no cliente (EP3 + EP6 +
   mutante `cliente-mensagem-url`).
3. Erros externos consumiam o teto de 10 envios da sessão: dez mensagens de
   extensão impediam um erro real de chegar ao banco. Externo agora tem cota
   própria de 3 (`TETO_EXTERNO`, mutante `sem-teto-externo`).
4. Em `?debug=1`, erro externo ainda abria o `crash-overlay`. `showDebug` agora
   só dispara para proveniência interna (mutante `debug-externo`).

A régua também mentia: EP4/EP5/EP6 aprovavam mutações comportamentais (guarda sem
`return`, `externo` como último OR da condição de issue, `origemDoJogo(){ return
true; }`). EP4 exige early-return e dispatch único; EP5 recorta a condição
inteira do step de issue; EP6 **executa** a `origemDoJogo` inline do cliente
contra oito fixtures (mutantes `sem-early-return` e `abre-externo`).

**Adendo (12/08, issues #218 e #219 · alpha.91).** Fingerprints `3c3f1990` e
`96362080`: `TypeError: Cannot assign to read only property 'pushState' of object
'#<History>'`, com origem e stack inteiramente em `/_vercel/speed-insights/script.js`
e `/_vercel/insights/script.js`. São os bundles que a Vercel injeta (Web Analytics e
Speed Insights): eles reescrevem `history.pushState` para rastrear navegação SPA, e
o `=` estoura quando o `pushState` está travado como read-only por extensão de
privacidade ou webview de app. O código é de terceiro — não temos como consertar o
script da Vercel nem destravar o `pushState` — mas o crash abriu issue `crash-auto`
porque `/_vercel/` é servido do **próprio domínio**, e a régua original dizia
"same-origin não é descartado". A proveniência agora reconhece `/_vercel/` como
terceiro mesmo sendo same-origin, no helper (`VENDOR_RE`) e no cliente (`vendor`),
provado em `source` e em `stack`. EP8 executa o classificador real e a `origemDoJogo`
inline contra o par de fixtures das duas issues e confirma que `/js/` do jogo segue
`codigo`; mutantes `sem-vercel-helper` e `sem-vercel-cliente` guardam cada lado.

**Fechamento (29/08).** A entrada estava aberta por inércia: cada exigência da régua
prescrita acima já existe no código, com cláusula e mutante — o conserto foi FECHAR com
evidência, não escrever código de novo (lei do `bug-hunt`: conferir antes de "consertar" o
que já está consertado). Conferido item a item, com `arquivo:linha`:

| exigência da entrada | onde mora | cláusula |
|---|---|---|
| esquema de extensão é externo (#138/#152/#156/#166) | `EXTENSION_RE`, `src/lib/error-provenance.mjs:1` | EP1 |
| URL cross-origin é externa (beacon Cloudflare, #142/#144) | `isExternalCrash`, `src/lib/error-provenance.mjs:64`; fixtures `static.cloudflareinsights.com` na régua | EP2 |
| esquema de extensão vale na mensagem, URL http não (#157) | `src/lib/error-provenance.mjs:69-74` | EP3 + EP6 |
| same-origin e sinal opaco não são descartados | `isOpaqueNoise`, `src/lib/error-provenance.mjs:83-85` | EP3 + EP9 |
| API grava ANTES de filtrar o dispatch, early-return único | `src/pages/api/jserror.ts:103` | EP4 |
| workflow não abre issue para externo, em nenhum OR | `.github/workflows/crash-fix.yml` (step `cls` + condição da issue) | EP5 |
| cliente não atribui externo ao lançamento, cota `TETO_EXTERNO`, overlay só interno | `origemDoJogo` inline de `src/pages/index.astro` (executada pela régua) | EP6 |

**Medido no fechamento (29/08, nesta árvore):** `npm run eval:error-origin` — **EP1..EP18
todas verdes**; matriz de mutação completa executada: **52 de 52 mutantes acendem vermelho**
(`node tools/eval/error-provenance-check.mjs --mutante=<cada um da lista do próprio
script>`), zero furos. A população que a entrada denunciava está reclassificada: as 7
ocorrências originais (extensão + beacon) têm fixture na régua e caem em `externo` sem
issue; as famílias vizinhas que a mesma entrada gerou viraram BUG-71..78/80/81, cada uma
fechada com suas próprias cláusulas. Custo declarado: nenhum novo — este fechamento não
mudou código, só mediu; os custos de cada camada estão declarados nas entradas que as
construíram (ex.: alargamento do purge na BUG-75, cota própria de externo na revisão
adversarial acima).

### ~~BUG-50 · WeakMap do Three derrubava o loop quando createFramebuffer falhava~~ · RESOLVIDO 12/08 (issue #171)

**Evidência antes.** Issue #171 (fingerprint `b598fe98`, alpha.57): `TypeError:
WeakMap keys must be objects or non-registered symbols`, stack
`drawBuffers@three.module.js:23160` ← `setRenderTarget` ← `RenderPass` do
`EffectComposer` (bloom) ← `game.update`. Reproduzida ainda na alpha.81.

**Causa.** `drawBuffers(renderTarget, framebuffer)` chama
`currentDrawbuffers.set(framebuffer, …)` sem guarda. Quando `gl.createFramebuffer()`
falha — pressão de memória GL ou perda de contexto síncrona — o framebuffer fica
nulo, o `WeakMap.set` lança e o `requestAnimationFrame` morre no meio da partida.

**Correção.** Guarda no vendor: framebuffer nulo retorna sem emitir drawBuffers.
Os três caminhos normais (alvo simples, MRT, tela) continuam emitindo os mesmos
buffers. Arnêses `public/*.html` receberam o hash novo do vendor (`?h=`).

**Régua.** SL7 do `tools/eval/shader-log-check.mjs` extrai e executa a
`drawBuffers` real do vendor: framebuffer nulo não pode lançar nem emitir, e os
caminhos normais têm os buffers comparados byte a byte. Mutante `framebuffer-nulo`
remove a guarda e acende a SL7.

### ~~BUG-49 · toda página SSR servia 200 com corpo VAZIO em produção~~ · RESOLVIDO 12/08

**Sintoma literal.** O dono, 12/08: *"a pagina mapa online (aovivo) esta quebrada"*.

**Escopo real, maior que o relatado.** Não era só o `/mapa`. As TRÊS páginas
`prerender = false` estavam assim, em produção E no preview:

| rota | tipo | antes |
|---|---|---:|
| `/mapa` (ao vivo) | SSR | **200, 0 bytes** |
| `/ranking` | SSR | **200, 0 bytes** |
| `/u/<perfil>` | SSR | **200, 0 bytes** |
| `/mapas`, `/armas` | estáticas | 200, 17-65 KB ✓ |
| `/sitemap.xml`, `/api/*` | endpoints | 200, com corpo ✓ |

**Evidência antes.** Chamando o handler construído direto no node, dentro do diretório da
função (que é o cwd de produção):

```
/mapa      status=200  corpo=0 bytes  ENOENT: scandir '<func>/public/js'
/ranking   status=200  corpo=0 bytes  ENOENT: scandir '<func>/public/js'
/sitemap.xml  status=200  2005 bytes   ← idêntico ao que produção servia
```

**Causa.** `3e5b0ea` (#194, 11/08 23:23) pôs `moduleCacheManifest()` no escopo do módulo
de `src/layouts/Layout.astro`, ou seja, em toda renderização de página. Ele faz
`readdirSync('public/js')` relativo ao cwd. Para página estática isso roda no BUILD, onde
o diretório existe. Para página SSR roda dentro da função da Vercel, que não empacota
`public/js`. E como o Astro faz STREAMING, o 200 e os headers já tinham saído quando o
`ENOENT` estourou: o resultado não é 500, é 200 com casca vazia. Status sozinho chamava
aquilo de saudável, e por isso durou um dia no ar.

**Refutados, com medição.** (a) o rename de ids de mapa do #200 — produção roda a `main`,
sem ele, e quebrava igual; (b) timeout de função — produção respondia em **0,1 s**, e
estouro daria 10-60 s; (c) a poda do `prune-dist.mjs` — ela só remove `dev.html` e
`models/fpvm`; (d) Cloudflare — o domínio da Vercel, sem CDN na frente, falhava idêntico.

**Conserto.** `astro.config.mjs` calcula o manifesto UMA vez e injeta como constante via
`vite.define`; `Layout.astro` consome `__MANIFESTO_JS__`. Nenhuma página lê disco em
tempo de requisição, então a classe inteira morre — não sobra caminho em que página
dependa de arquivo que a função não empacotou. Estática e SSR passam a servir a mesma
revisão.

**Depois.** `/mapa` 15.353 bytes · `/ranking` 11.423 · `/u/exemplo` 10.081.

**Por que nenhum portão pegou, e o que mudou.** O `eval:site` cobre `/ranking` e checa
corpo — e passou o tempo todo, porque sobe um `astro dev` LOCAL, onde `public/js` existe:
media um mundo onde o defeito não pode acontecer (LIÇÃO 3). O `/mapa` tinha ainda a
cegueira trivial de nunca ter estado na lista de rotas dele.

- régua nova: `npm run eval:ssr` (`tools/eval/ssr-render-check.mjs`) — mede o ARTEFATO do
  build, entrando no diretório da função. `--mutante=corpo-vazio|lanca` provam que morde;
  `--mutante=sem-publicjs` ficou VERDE de propósito e virou asserção de que a leitura de
  disco em tempo de renderização continua morta.
- `eval:site` passou a cobrar TAMANHO de corpo, não só status, e ganhou `/mapa`: 13 → 14
  rotas.

**Custo declarado.** O manifesto passa a ser congelado quando a config do Astro carrega.
Em `astro dev`, acrescentar ou editar módulo em `public/js` só muda a revisão depois de
reiniciar o servidor — antes recalculava a cada renderização. Build e produção não são
afetados, porque lá a config carrega uma vez por build de qualquer jeito.

### ~~BUG-55 · a home reabriu a leitura de `public/js` dentro da função SSR~~ · RESOLVIDO 16/08

**Evidência antes.** Depois do build da alpha.115, `npm run eval:ssr` deixou `/mapa`,
`/ranking` e `/u/exemplo` verdes, mas `/` lançou `ENOENT: scandir
.vercel/output/functions/_render.func/public/js`, devolveu 500 e corpo vazio. É uma
recorrência parcial do BUG-49, agora restrita à home.

**Causa.** O novo import map da home chamou `moduleCacheManifest()` diretamente no
frontmatter de `src/pages/index.astro`. Como `export const prerender = false`, esse código
roda a cada request dentro do pacote Vercel. O conserto anterior já injetava o manifesto
no build para o layout, mas a nova tela contornou essa fronteira.

**Correção.** A home consome a mesma constante `__MANIFESTO_JS__` injetada por
`astro.config.mjs`; nenhuma página SSR lê `public/js` no request. SSR3 passa a varrer todas
as fontes `prerender=false` e proíbe a chamada direta.

**Depois e mutações.** Após rebuild, `/` devolve **200 e 64.583 bytes**; as quatro rotas
passam SSR1–SSR3. `corpo-vazio`, `lanca` e `manifesto-no-request` deixam respectivamente
SSR1, SSR2 e SSR3 vermelhas. **Custo:** nenhum request ou asset adicional; o manifesto
continua congelado por build, exatamente como no BUG-49.

### ~~BUG-48 · import map anunciava módulos removidos do deploy~~ · RESOLVIDO NO BUILD 11/08

**Sintoma literal.** A issue #197 registrou `prod-watch: edge, banco ou schema de
telemetria reprovou` nos deploys das versões alpha.79 e alpha.80.

**Evidência antes.** `node tools/eval/prod-coherence.mjs https://www.csbrasil.online`
sai 1 com **12 HTTP 404**. O manifesto contém 49 módulos, dos quais 12 são
`editor/**`, enquanto `scripts/prune-dist.mjs` remove `dist/client/js/editor` e o
espelho da Vercel antes de publicar.

**Causa.** O manifesto recursivo de cache descreve todos os módulos de desenvolvimento,
mas não respeita a fronteira do que o build efetivamente publica. O import map raiz então
promete URLs válidas para arquivos deliberadamente podados.

**Correção.** `moduleCacheManifest()` exclui a bancada `editor/`, que continua disponível em
desenvolvimento mas não faz parte do site publicado. SB7 cruza o manifesto com os diretórios
JavaScript podados para impedir que as duas listas voltem a divergir.

**Medição:** manifesto **49 → 37 módulos**, anúncios `editor/**` **12 → 0**. Depois da poda,
o import map construído anuncia 37 módulos e todos os 37 existem em `dist/client`. Os mutantes
`cache-podado` e `cache-entry-site` recolocam uma bancada removida ou omitem o entrypoint do
site e acendem exatamente SB7. A entrega em produção só
fica comprovada quando `prod-coherence` sair verde contra o novo deploy.

### ~~BUG-47 · shader da urna excedia o limite mínimo do WebGL1~~ · RESOLVIDO 11/08

**Evidência.** As issues #120 e #121 registraram `Statically used varyings do not fit
within packing limits` no WebGL1. A urna do mapa Brasília conserva tangente e usa textura
base, normal, metálico/rugosidade, oclusão e emissivo; o GLTFLoader separa o mapa combinado em
`metalnessMap` e `roughnessMap`. Com uma sombra direcional, o shader real ocupava **9 vetores**,
acima dos **8 vetores mínimos** do GLSL ES 1.00.

**Causa.** O fog radial acrescentava `vFogPosV`, embora os materiais iluminados já transportem
a mesma posição em `vViewPosition`. O triplanar de Brasília também carregava posição e normal
em dois varyings próprios, reduzindo a margem de outros materiais WebGL1.

**Correção.** O fog iluminado deriva a posição de `vViewPosition`, preservando o varying
próprio apenas nos shaders que não o possuem. O triplanar reconstrói posição e normal no mundo
a partir de `vViewPosition`, `vNormal` e `viewMatrix`. A aparência e os fallbacks WebGL1 são
mantidos; não foi feito upgrade do Three porque as versões novas removem WebGL1.

**Medição:** urna **9/8 → 8/8 vetores**; triplanar **2 → 0 varyings próprios**. A régua
`tools/eval/shader-budget-check.mjs` (`npm run eval:shaderbudget`, em `check:fast` e
`check:deploy`) lê todas as primitivas, materiais, instancing e sombras reais. Os mutantes cobrem o fog,
triplanar, instalação dos chunks e evolução de cor, clearcoat, anisotropia e luzes do asset.
Um compile real no Chrome/SwiftShader com contexto WebGL1 gerou os dois programas sem erro GL.

**Limite.** O hardware Linux do relato não foi acessado. Esta correção resolve a causa exata
de #120/#121; #115, #127 e #130 permanecem abertos porque seus logs não identificam o mesmo
programa. O shader crítico fica exatamente no piso mínimo, então novos mapas devem continuar
reutilizando varyings ou aplicar o perfil seguro.

### ~~BUG-45 · log WebGL nulo derrubava o loop de render~~ · RESOLVIDO 11/08

**Evidência.** As issues #108 (alpha.41, Safari) e #169 (alpha.57, Chrome) terminavam
em `getShaderInfoLog(...).trim()` e `getProgramInfoLog(...).trim()` dentro do Three r160.
Um GL falso retornando `null` reproduz o mesmo `TypeError` nos quatro acessos do bundle.

**Causa.** A especificação WebGL permite `DOMString?` nesses dois métodos, mas o bundle
assumia string. O diagnóstico secundário escondia o erro original do shader e podia se repetir
a cada frame. O [Three #31438](https://github.com/mrdoob/three.js/commit/b62351b66fe5c44fd5612e051034c734abed2104)
corrigiu a mesma falha no r179.

**Correção.** Foi portado apenas o fallback oficial `|| ''` nos quatro acessos; atualizar
todo o Three removeria a compatibilidade WebGL1 que este jogo ainda precisa. Jogo, site e
editor acrescentam a versão do pacote ao core; os 13 arnêses HTML usam o hash do conteúdo.
Addons sem URL própria revalidam na origem e `/vendor/` não recebe mais TTL forçado no edge.
Isso faz o patch chegar a navegadores que já tinham o r160 em cache e evita misturar core e
addons de revisões diferentes.

**Limite.** A guarda preserva o diagnóstico e o loop, mas não torna um shader inválido válido.
#115, #120, #121, #127 e #130 continuam sendo a família canônica de compilação/link.

**Régua: `tools/eval/shader-log-check.mjs`** (`npm run eval:shaderlog`, em
`check:fast` e `check:deploy`). SL1–SL3 executam as quatro expressões reais com `null` e texto;
SL4 exige URL versionada, SL5 confere o hash dos arnêses e SL6 exige revalidação imediata dos
addons na Vercel e na regra Cloudflare. Os mutantes `sem-guardas`, `sem-cache-bust`,
`addons-immutable` e `cloudflare-vendor` deixam a régua vermelha.

### ~~BUG-44 · Linux não consegue abrir o WebGL~~ · RESOLVIDO NO APP 11/08

**Sintoma (do dono):** *"ok tem um erro de webgl, meu colega tem linux e nao consegue rodar, tem como consertar isso?"*

**Causa raiz confirmada.** `public/js/glcontext.js` começava por `high-performance` com
MSAA, a combinação mais frágil em Linux híbrido, e cada tentativa do Three virava
`console.error`/issue antes do próximo degrau. Mesmo depois do boot, `main.js` abria um
segundo renderer no preview e outro contexto para performance; #129 prova a falha na seleção.

**Reprodução e medição** (`npm run eval:webgl`):

| | antes | depois |
|---|---:|---:|
| cláusulas WebGL vermelhas | 7 | 0 |
| contextos descartáveis no boot | 2 | 0 |
| erros canônicos numa falha total | 3 classes | 1 |

**Descartado com medição:** não faltava WebGL1. O Three r160 já tentava
WebGL2, WebGL1 e `experimental-webgl`; repetir a mesma chamada não alcançaria outro driver.
A #181 isolada também não prova falha total: ela tem só o erro provisório, sem o
`sem_webgl` que acompanha as falhas fatais antigas.

**Correção.** A factory sonda contexto padrão primeiro, degrada MSAA/GPU e passa o contexto
real ao Three. `?safe=1` prioriza WebGL1, força qualidade baixa só na sessão e usa os 44
retratos estáticos sem renderer secundário. Capacidade de shader e telemetria reutilizam o
contexto principal; perda persistente de contexto abre recuperação acionável; fundos 3D
decorativos falham sem derrubar a página.

**Custo declarado.** WebGL1, llvmpipe e modo seguro usam DPR 0,75, sem bloom/sombras e sem
preview 3D giratório. Isso compra alcance com qualidade visual menor. Se o navegador não
criar nem WebGL1, JavaScript não consegue substituir o driver: o painel orienta driver,
aceleração e outro navegador. O hardware Linux do colega não foi acessado nesta medição.

**Régua: `tools/eval/webgl-compat-check.mjs`** (`npm run eval:webgl`, no `check:fast` e
`check:deploy`). Dez cláusulas e nove mutações: `alto-primeiro`, `sem-webgl1`,
`erro-provisorio`, `contexto-extra`, `fundo-fatal`, `sem-context-loss`,
`qualidade-persistida`, `canvas-reusado` e `preview-null` acendem WG1-WG10.

### ~~BUG-42 · Erro bruto na abertura não dava saída para o jogador~~ · RESOLVIDO 10/08

**Como aparecia.** O coletor global de `src/pages/index.astro` usava a mesma tarja vermelha
para telemetria, diagnóstico e mensagem ao jogador. Qualquer `error` ou promise rejeitada
expunha mensagem e stack, mas não oferecia nova tentativa nem confirmação de envio. Uma exceção
durante `startGame()` também não tinha fronteira própria para limpar loading, jogo parcial,
pointer lock e tela cheia antes de voltar ao menu.

**Causa raiz.** O código sabia registrar a falha, mas não sabia distinguir três perguntas:
*o erro deve ser coletado?*, *um debugger pediu o detalhe?* e *uma ação explícita do jogador
deixou de avançar?* O primeiro `show()` respondia “sim” às três. Além disso, `startGame()`
executava a abertura inteira sem `try/catch`, então não existia dono para recuperar estado.

**Régua no navegador real:** `npm run eval:boot` (`tools/eval/boot-check.mjs`), viewport
1200×800. Ela injeta uma exceção no início de `_startGame`, sem editar o arquivo em disco.

| cláusula | antes/mutação | depois |
|---|---|---|
| volta ao menu com loading fechado | sem dono da recuperação | sim |
| modal amigável e dentro da tela | **não** (`--mutante=sem-amigavel`) | sim |
| mensagem/stack técnica no modo normal | **vaza** (`--mutante=vaza-detalhe`) | não |
| relatório automático + confirmação manual | botão não confirma | **2 automáticos + 1 confirmação** |
| painel técnico com `?debug=1` | sim | sim |

As duas mutações saem 1 na cláusula B3; `sem-amigavel` também derruba B4, e
`vaza-detalhe` prova o risco adicional: a tarja técnica fica acima do modal e bloqueia o botão
de relatório. A captura servida pode ser regenerada com
`npm run eval:boot -- --foto=/tmp/coro-solto-launch-error-1200x800.png`.

**Conserto.** `src/pages/index.astro` separa coleta silenciosa, painel de `?debug=1` e modal
acionável; o modal guarda o corpo exato ligado ao código mostrado, para o botão não reenviar um
erro anterior. `public/js/main.js` tornou a abertura uma fronteira de erro, desfaz estado parcial
e marca o fim do boot. Watchdogs cobrem entrada, menu e partida que ficam pendurados sem lançar.
`public/style.css` serve o modal responsivo no topo da UI.

**Custo declarado / limite.** O watchdog da partida espera até 60 s para não acusar conexão
lenta como crash. Travamento do processo de GPU/aba inteira não executa JavaScript e continua
fora do alcance; o fallback operacional permanece `?bloom=0`. O botão TENTAR DE NOVO recarrega
a página inteira, preservando simplicidade em vez de tentar retomar um renderer possivelmente
corrompido.

---

### ~~BUG-39 · site fora do ar: edge servindo main.js de um deploy com fparms.js de outro~~ · CONSERTO NO REPO 29/08 — aplicação na zona PENDENTE (`bash scripts/cloudflare-setup.sh` com credencial)

**Evidência (08/08, ~03:14, print do jogador + curl).** Boot morto em
`https://www.csbrasil.online` com o banner vermelho:
`Uncaught SyntaxError: The requested module './fparms.js' does not provide an export named
'preloadStaticVm' @ /js/main.js:6:25`. curl no edge: `main.js` da era alpha.34 (importa
`preloadStaticVm` e `CONFIRM_MAX_MS`), `fparms.js`/`game.js` pós-`b772f88` (não exportam).
Headers: `x-vercel-cache: HIT` + `cf-cache-status: HIT`, `age: 20816`.

**Causa raiz.** A cache rule `assets_jogo` da Cloudflare
(`scripts/cloudflare-setup.sh:68-78`) segura `/js/*` no edge por **1 mês** com
`override_origin`, e o import map servido usava `?v=2` **fixo entre releases** — URL
igual para conteúdo diferente, então o edge montou a página com módulos de deploys
diferentes. O repo já tinha as duas metades do conserto (remoção do símbolo em `b772f88`,
`?v=` amarrado ao `pkg.version` em `src/pages/index.astro:20-56`) — faltava publicar e
purgar. A origem (`csbrasil.vercel.app`, alpha.37) está coerente; o veneno é só cache.

**Por que passou por tudo.** Nenhum portão media o que o edge serve: `check:fast` mede o
repo, o build mede o build. A incoerência só existe na interseção dos caches.

**Régua:** `npm run prod:coherence` (`tools/eval/prod-coherence.mjs`) — baixa o HTML de
produção, segue o import map e reprova qualquer import nomeado sem export no alvo. Na
manhã do incidente, com o site quebrado, ele saía 1 citando `CONFIRM_MAX_MS`. Mutação:
`--selftest` (export arrancado tem que sair 1 citando o símbolo). Quem roda é o
`prod-watch.yml` a cada 15 min; em vermelho, dispara `prod-crash` → `crash-fix.yml`
(purge do edge + re-probe; se não resolver, issue `crash-auto`).

**Remediação manual restante:** purge do edge (`/js/*`) com token da Cloudflare — sem o
`CF_API_TOKEN` cadastrado, o purge automático dos workflows é pulado.

**Conserto na CAUSA (29/08).** O palpite óbvio — "o manifesto por conteúdo do BUG-48 já
mitigou, é só fechar" — foi refutado com dado de campo: a **BUG-75 (issue #443, 25/08) é
reincidência exata desta classe COM o manifesto no ar** desde 11/08. O mecanismo residual:
o `?v=` por conteúdo protege quem chega com HTML novo, mas HTML velho em cache de
navegador pede a URL `?v=` antiga; quando o edge a reabastece, a origem (que ignora a
query) devolve o conteúdo NOVO sob a URL VELHA — e o `edge_ttl` de 1 mês servia esse mix
por até 30 dias. A segunda via sugerida — purge automático em todo deploy — não fecha
sozinha: o deploy normal é a integração Git da Vercel e **não passa por workflow nenhum**;
só o fallback manual (`deploy-prod.yml`) tem onde pendurar purge.

Duas mudanças versionadas, ambas travadas por régua:

1. `scripts/cloudflare-setup.sh` — a regra `assets_jogo` foi partida: `assets_midia`
   (áudio/modelos/img/fontes/posters) mantém os 2.592.000 s; **`assets_js` segura `/js/`
   por 600 s**. Qualquer mix agora se autocura em ≤ 10 min — mais curto que a volta do
   `prod-watch` (cron de 15 min), que segue como rede reativa (purge via `crash-fix.yml`).
2. `.github/workflows/deploy-prod.yml` — o fallback manual purga os prefixos `/js/` e
   `style.css` depois do `vercel deploy`, com o mesmo contrato do `crash-fix.yml`
   (sem `CF_API_TOKEN` o passo é pulado, nunca vermelho por secret).

| | antes | depois |
|---|---|---:|
| `edge_ttl` de `/js/` na config versionada | 2.592.000 s (1 mês) | 600 s |
| janela máxima de mix main.js × fparms.js no edge | ~30 dias | ≤ 10 min |
| deploy manual purga o edge | não | sim (pulado sem token) |
| régua verde / mutantes que mordem | — (nenhuma régua lia a config) | EC1..EC3 / **4 de 4** |

**Régua: `npm run eval:edgecache`** (`tools/eval/edge-cache-check.mjs`, no `check:fast` e
no `check:deploy`). Vermelha ANTES do conserto nesta árvore (EC1: `assets_jogo` com
2.592.000 s; EC3: deploy sem purge); verde depois. EC1 reprova qualquer cache rule que
cubra `/js/` com `edge_ttl > 600 s`; EC2 é a anti-vacuidade (apagar a regra de `/js/` não
aprova); EC3 exige o purge no `deploy-prod.yml`. Mutantes `ttl-mes`, `js-na-midia`,
`sem-regra-js` e `sem-purge-deploy` — cada um acende a cláusula certa e o script se
autodenuncia se a mutação passar.

**Custo declarado.** O hit-ratio de `/js/` no edge cai: cada URL versionada volta à origem
a cada 10 min em vez de 1 mês (a Vercel vira a fonte quente de `/js/`; mídia pesada segue
1 mês). E a regra nova **só vale na zona depois que alguém com credencial rodar
`bash scripts/cloudflare-setup.sh`** — até lá o edge real continua com o TTL de 1 mês e a
entrada fica em "aplicação pendente", como a migration da BUG-54.

**Não verificado:** o estado real da zona Cloudflare e a existência do `CF_API_TOKEN` nos
secrets do repo (sem credencial local, e `gh secret list` bloqueado nesta sessão); o purge
novo do `deploy-prod.yml` não foi executado (é `workflow_dispatch`). O que está medido é a
config versionada, a régua e os 4 mutantes.

---

### ~~BUG-56 · jogo em câmera lenta quando o FPS cai~~ · RESOLVIDO 16/08 (issue #295)

**Relato:** jogadores percebendo o jogo em câmera lenta com FPS baixo.

**Causa raiz.** O loop entregava `Math.min(0.05, clock.getDelta())` (`main.js`) — o clamp
de 50 ms era teto **por frame**. Em cadência sustentada abaixo de 20 FPS, cada frame real
de 100 ms entregava só 50 ms à simulação: partida, round, recarga, respawn e bots andavam
na metade do relógio de parede. (O clamp é um bom teto **por passo** — passos gigantes
estouram colisão e IA — mas como teto por frame ele descartava tempo real em silêncio.)

**Conserto.** O loop fatia o delta real em passos de ≤ 50 ms, chamando `game.update` por
fatia (mesma semântica por passo de sempre), com teto de 4 fatias por frame — guard de
espiral da morte: máquina que não acompanha descarta o excesso em vez de acumular dívida.
Só a última fatia renderiza (`update(dt, render)`) — multi-render em FPS baixo gastaria
GPU exatamente quando ela já sofre. Em 60 FPS nada muda: 1 passo de ~16 ms por frame.

**Régua.** `tools/eval/sim-clock-check.mjs` (`eval:simclock`, no `check:fast`): SC1 fatio
do delta real · SC2 teto **com valor lido da declaração** (nome existindo com `1e9`
passava na asserção de nome — furo achado pelo próprio mutante `sem-teto`) · SC3 clamp
solto por frame proibido. Mutantes `--mutante=clamp-frame` (3 vermelhas) e
`--mutante=sem-teto` (1) executados.

### ~~BUG-54 · "kills além do fisicamente possível" numa partida de captura legítima~~ · CONSERTO PRONTO 15/08, migration 024 PENDENTE de aplicação (issue #116)

**Palavras de quem reportou** (issue #116): *"A partida terminou normalmente, mas as stats
não foram enviadas e apareceu a mensagem: 'stats não enviados: kills além do fisicamente
possível'. No final da partida eu estava com 95 kills e 6 mortes."*

**Causa raiz.** A cláusula (a) do `submit_match` (`~/db-privado/supabase/schema.sql`)
exigia `p_kills ≤ 45 * p_rounds`. O comentário dizia *"respawn de 2,5s => teto teórico
~40/round"* — premissa do modo **ABATE**, onde a rodada É uma janela de 99 s. No
**CAPTURA** a partida inteira são **2 rodadas** (`CTF_ROUNDS_TO_WIN`, `game.js:114`), então
o teto dava **90 kills na partida** — numa modalidade sem janela de tempo, com respawn
contínuo por até ~960 s. É o mesmo defeito de premissa do BUG-35/#87 (migration 015), um
ramo acima: lá o piso de TEMPO, aqui o teto de KILLS. E igualmente chamava `_flag()` antes
de recusar — **três partidas boas de captura escondiam o jogador do ranking**.

**O número novo não é palpite** — é a física do jogo: no CAPTURA o limitante é o
`RESPAWN_DELAY = 2,2 s` (`game.js:88`): para matar de novo, um inimigo tem que renascer.
Teto honesto: `greatest(45 * rounds, floor(seconds / 2.2))` — o ramo por rodada continua
amarrando partida de abate de relógio travado.

| caso | teto antigo (45×rounds) | teto novo | veredito |
|---|---|---|---|
| reportado (#116): 95 kills · 2 rodadas · 480 s | 90 → **RECUSAVA** | greatest(90, 218) = 218 | passa |
| trainer: 150 kills · 30 s | 90 → recusava | greatest(90, 13) = 90 | continua recusado |
| cliente velho (seconds=0) | 90 | greatest(90, 0) = 90 | idêntico a hoje |

**Régua.** Cláusula **SG6** do `tools/eval/submit-guard-check.mjs` (lê o SQL de
`~/db-privado/`, o mesmo princípio das SG4/SG5: a fonte é o banco, não uma cópia em JS).
Vermelha no estado antigo (4 reprovações: caso #116 recusado nos 3 arquivos + `_flag` na
cláusula); verde depois; `--mutante=kills45` devolve o mundo antigo e acende nos 3.

**Falta aplicar.** `~/db-privado/supabase/migrations/024_submit_guard_kills.sql` (o
`schema.sql` e o espelho `opcional/012` já estão atualizados nesta máquina). Aplicar em
staging → produção pela ordem do `~/db-privado/COMO-MIGRAR.md`. Falsos positivos já
dados pelo caminho antigo: se um jogador reportar sumir do ranking com 3+ partidas de
captura recusadas, conferir `players.flagged_count` na mão.

### ~~BUG-35 · "partida rápida demais pra ser verdade" numa partida legítima~~ · RESOLVIDO 07/08 (issue #87)



**Palavras de quem reportou** (maurodesouza, issue #87): *"Durante uma partida no modo
Captura de Bandeira, recebi a mensagem `stats não enviados: partida rápida demais pra ser
verdade`. A partida foi totalmente legítima. Eu estava jogando no mapa Quebrada (8x8) e
fiquei de AWP cobrindo a viela. O time inimigo acabou avançando praticamente inteiro por
esse mesmo corredor, então foi uma sequência de eliminações relativamente fácil."*

**Causa raiz.** A cláusula (b) do `submit_match` (`~/db-privado/supabase/schema.sql:252`)
exigia 80 s por rodada. O objetivo escrito no comentário estava certo — *"speed hack não
produz partida instantânea"* — mas o NÚMERO veio do modo ABATE, onde a rodada É uma janela
de tempo (`ROUND_TIME = 99`, `public/js/game.js:77`). **No CAPTURA a rodada não tem janela
de tempo nenhuma**: fecha por alvo de bandeiras ou por dominação (`_ctfWin`,
`game.js:4150`), e bastam 2 rodadas pra partida (`CTF_ROUNDS_TO_WIN`, `game.js:114`). O
modo herdou uma premissa que nunca foi dele.

**A parte que a issue não viu, e é a grave.** Antes do `raise`, a cláusula chamava
`_flag(p_nick)` (`schema.sql:183-188`), que faz `flagged_count + 1` e, em
`flagged_count >= 3`, `hidden = true`. A view `leaderboard` filtra por `not p.hidden`.
**Três partidas rápidas legítimas escondiam o jogador do ranking, em silêncio.**

**Medido antes × depois** (`node tools/eval/submit-guard-check.mjs --amostra`, 5 mapas ×
10 sementes de CAPTURA jogadas até `matchEnd` no motor real, 07/08):

| | piso 80 (antes) | piso por modo (depois) |
|---|---|---|
| partidas legítimas recusadas (SG2) | **6 de 50** | 0 de 50 |
| abandonos legítimos recusados (SG3) | 4 de 50 | 0 de 50 |
| mapas onde o piso recusa o fisicamente possível (SG1) | **5 de 5** | 0 de 5 |
| a cláusula dá strike (SG4) | sim | não |

Menor s/rodada de partida inteira: 48,0 s (awp_map, semente 64). Menor rodada individual:
31,1 s (fy_pool_day, semente 99). Abandono mais curto que o jogo produz: `rounds 1,
seconds 33`. **E o simulador é o caso LENTO — o jogador dele é passivo.**

**O palpite óbvio, medido e morto.** *"É só baixar 80 para 40."* Rodado
(`--piso=40 --amostra`): a **amostra passaria** (0/50 em SG2), e mesmo assim 40 reprova
SG1 nos 5 mapas e recusa 4 de 50 abandonos. É por isso que a régua tem cláusula de FÍSICA
além da de amostra — sozinha, a amostra teria aprovado o palpite errado.

**De onde vem o número novo.** Tempo físico mínimo de uma rodada de captura: caminho ótimo
em linha reta do spawn por todas as bandeiras (força bruta sobre as permutações), a
`PLAYER_SPEED = 5,35 m/s`, mais permanência no anel com esquadrão cheio
(`CAP_NEUTRAL/2`, `game.js:4099-4112`). Ignora parede, desvio e combate — tudo que a
realidade cobra a mais. awp_map 20,1 s · fy_pool_day 12,3 s · fy_havan 35,6 s ·
fy_ferrovelho 24,6 s · fy_quebrada 24,9 s. O piso do CAPTURA ficou em **6 s/rodada**,
metade do mais apertado. O do ABATE continua 80 (lá a rodada não desce de ~99 s).

**Conserto.** `p_mode` novo no RPC (`~/db-privado/supabase/migrations/015_submit_guard_modo.sql`),
`mode: matchMode` nos dois payloads do `public/js/main.js` (fim de partida e abandono),
`p_mode` na cascata de compatibilidade de `src/pages/api/submit-match.ts`. Modo
desconhecido cai no piso BAIXO de propósito — cliente com JS em cache não pode ser punido.
Espelho `opcional/012_ofuscacao_schema.sql` atualizado junto: ele é cópia byte-a-byte, e se
ficasse pra trás, aplicar a ofuscação um dia reintroduziria este defeito.

**Anistia.** A migration zera `flagged_count`/`hidden` de todo mundo, e o motivo está
escrito nela: **não existe coluna de auditoria dizendo qual cláusula gerou cada strike**, e
punição não atribuível vinda de regra defeituosa se desfaz inteira.

**Régua nova:** `tools/eval/submit-guard-check.mjs` (`npm run eval:submitguard`). SG1
física · SG2 amostra · SG3 abandono · SG4 sem strike · SG5 o ramo default é o brando.
Mutações executadas: `--mutante=piso80` (SG1 vermelha nos 5 mapas), `--mutante=comflag`
(SG4 vermelha nos 3 arquivos), `--mutante=defaultduro` (SG5 vermelha nos 3 — é a mais
fina: sem ela dava pra "consertar" o #87 deixando no defeito quem está com JS em cache).
**Fica fora do `check`**, como o `eval:boot`: o piso é LIDO do SQL, que mora em
`~/db-privado/` (`.gitignore:145-148`), e sem esse insumo a régua fica VERMELHA em vez de
passar calada.

**Migration aplicada em 07/08** pelo dono, à mão no SQL Editor (`~/db-privado/COMO-MIGRAR.md`).
A rota mantém a cascata de compatibilidade, então cliente com JS velho continua gravando.

**NÃO VERIFICADO — e nada disto foi conferido por quem escreveu o conserto:**
- **O estado do banco DEPOIS da migration.** Não há credencial na worktree; a régua lê os
  ARQUIVOS SQL, não a função implantada. Falta o smoke escrito no rodapé da 015:
  `select proname, pronargs from pg_proc where proname='submit_match'` tem que devolver
  UMA linha com `pronargs = 13` (mais de uma = sobrecarga viva), e
  `select count(*) from players where hidden` tem que dar 0.
- **Quantos jogadores estavam escondidos.** O `raise notice` da anistia imprimiu o número
  ao aplicar; é ele que vai no comentário de fechamento da issue #87.
- A partida de captura curta de verdade, no navegador, com nick registrado. A régua mede o
  motor e o SQL, não o caminho HTTP inteiro.

### ~~BUG-29 · "o jogo tá reiniciando do nada, estava num CTF no ferro velho do Zé"~~ · RESOLVIDO 05/08

**NÃO era o BUG-00 de volta.** O menu de pausa continua consertado: `pause-check.mjs`
passa 6/6 e a `PAUSA5` (nenhum caminho automático tira uma partida ativa do jogo) segue
verde. É defeito novo, e é **do modo CAPTURA**.

**Causa raiz — confirmada.** O bloco de doutrina do modo (`game.js:84-104`) declara que
*"a RODADA fecha por ALVO DE CAPTURAS (`CTF_CAPS_TO_WIN`) ou por dominação — **nunca por
tempo**"*, e chama `CTF_MATCH_TIME` (480 s) de **rede de segurança**. Mas quem implementava
"fecha por alvo de capturas" morava dentro do `_checkPace()`, que abre com
`if (!PACE || …) return` — e `PACE = QS.get('pace') === '1'`, **desligado por padrão**.
O `_updatePlayer` ainda o chamava sob `if (PACE)`.

Ou seja: **numa partida normal de CAPTURA a condição de vitória declarada nunca era
avaliada.** A rodada 1 não fechava nunca, e a partida inteira morria de uma vez quando
`ctfMatchLeft` zerava — `_endRound()` e `_endMatch()` no mesmo frame, sem cronômetro na
tela (o relógio só materializa nos últimos `CTF_CLOCK_SHOW` = 60 s). Do lado do jogador:
você está no meio do tiroteio e a partida evapora.

**Medido no navegador antes do conserto** (`tools/eval/crash-watch.mjs`, CTF
`fy_ferrovelho`): o time B chegou a **3 capturas — o alvo** — e a rodada 1 seguiu correndo.

**Medido no motor** (`tools/eval/ctf-round-check.mjs`, semente 4242, `fy_ferrovelho`):

| | 1º fecho de rodada | fim da partida |
|---|---|---|
| **antes** (`--mutante=pace`) | **NUNCA** (488 s com capturas chegando) | 487,5 s, tudo de uma vez |
| depois | **29,1 s**, por objetivo | 79,6 s, por vitórias de rodada |

**Correção:** o alvo de bandeiras saiu do `_checkPace()` e virou `_checkCtfAlvo()`,
chamado **sem gate**. O modo de ABATE continua sob `PACE` de propósito — lá o alvo por
abates é experimento e o round já fecha pelo relógio de 99 s; no CAPTURA não existe
relógio de round, então o alvo não é ritmo, é a **única** condição de vitória.

**Régua: `tools/eval/ctf-round-check.mjs`** (`npm run eval:ctfround`, no `check:fast`).
3 cláusulas, 2 mutações medidas: `--mutante=pace` reproduz o defeito exato do dono
(1º fecho NUNCA / partida evapora aos 487 s) e `--mutante=semteto` acende a CTF-R3.
A CTF-R2 **anda o motor** em vez de ler a declaração — a UI4 não pegava isto porque ela
cobra que a *partida* feche, e ela fechava, pela rede de segurança.

### ~~BUG-30 · "a vida do 1st player volta a 100, não sei porque, isso não pode"~~ · RESOLVIDO 05/08

**NÃO É BUG, e não é regra mal aplicada ao modo** — é a regra `REGEN` (`game.js`)
funcionando como escrita, e ela dispara **igual** em rodadas e em CAPTURA. Não vem do
`_resetPositions`, nem do respawn, nem do fim de rodada do CTF: é regeneração fora de
combate, estilo CoD, **6 s sem tomar dano e 22 HP/s**, ligada por padrão desde 31/07 (num
commit grande, sem entrada no CHANGELOG).

**Reproduzida no navegador** (`tools/eval/crash-watch.mjs`, CTF `fy_ferrovelho`, amostra
de 2 em 2 s), com o jogador **vivo**, sem respawn e sem rodada nova:

```
t 25,7 s   hp  68   (hurtAt 22,1)
t 30,3 s   hp 100   (hurtAt 22,1)
```

**O defeito de verdade é que ela é invisível.** O dono disse *"não sei porque"* — não há
ícone, som, vinheta nem linha nas configurações. Regra que o jogador não percebe é
indistinguível de defeito.

**Decisão:** o padrão **inverteu** (`REGEN = QS.get('regen') === '1'`). O veto do dono
manda, e a regra continua religável por `?regen=1` — inteira, com a simetria
jogador↔bot que o desenho exige.

**Custo declarado, medido** (`botsim 300 all`, os 5 mapas): sem regeneração o bot morre
antes, então a simulação anda. latFlips/min 9,647 → 10,014 · fwdFlips/min 7,353 → 7,081 ·
stuck% 2,100 → 2,155 · eff 0,041 → 0,036.

**O que volta a doer, e quem religar tem que resolver junto:** sem cura, kit ou colete,
cada vida depois do primeiro contato já estava perdida (um tiro de bot deixa em ~40 e o
próximo mata). Foi esse problema real que a `REGEN` veio resolver. Religar por padrão sem
entregar o feedback que falta é repetir o mesmo erro.

**Régua: `tools/eval/regen-check.mjs`** (`npm run eval:regen`, no `check:fast`).
3 cláusulas, 2 mutações medidas: `--mutante=ligado` devolve **40 → 100 hp** (o número que
o dono reportou) e `--mutante=semkill` acende a REGEN3. A REGEN2 **anda o motor** — 20 s
parado com o `_damage` congelado — em vez de ler a constante.

### ~~BUG-31 · 88 requisições 404 por partida escondendo qualquer erro de verdade~~ · RESOLVIDO 05/08

**Sintoma (do dono):** *"vários erros no console"*, junto com o BUG-29.

**Medido** (`tools/eval/crash-watch.mjs`, CTF `fy_ferrovelho`, 420 s): **88 `error` de
console, todos 404**, e **zero** `pageerror` / `unhandledrejection`. Todos em
`models/anims/<id>/<clipe>.glb`, dos **8 palhaços** (`adjim, cadequinha, esbirro, jozo,
padata, padati, palhacomal, titica`) — os únicos 8 dos 44 sem pasta de clipe. 8 × 11 = 88.
O `catch` vazio de `glbchars.js` engolia tudo, então o jogo funcionava e o console mentia.

**Duas saídas; a primeira foi MEDIDA E DESCARTADA.** `docs/historico/plans/02-BOTS-E-MODELS.md:285`
previa "B7: rodar `retarget-glb.mjs` para os Palhaços". Rodado — e o retarget é um
**no-op** para essa família:

| desvio angular do clipe retargetado × pack compartilhado (walk, máx por osso) | |
|---|---|
| palhacomal / raul / mst (rig do doador `mst`) | **0,13°** · médio **0,03°** |
| doutora / ancap (rig Meshy próprio) | 170,89° / 168,01° · médio 37,42° / 40,76° |

E `pose-inflate.mjs palhacomal` dá **0,689 / 17,4 %** com pasta e **0,689 / 17,4 %** sem
pasta. Os 8 palhaços foram auto-skinnados a partir do esqueleto do `mst`
(`tools/rig-from-donor.mjs`), que é o mesmo contra o qual o pack compartilhado foi assado:
re-assar não move um vértice. Gerar 88 GLB (~3,6 MB) para não mudar nada é peso morto
contra o teto de 250 MB da CrazyGames. **O "palhaço esquisito" é a qualidade do auto-skin
(BUG-10/BUG-25, exige rig novo), não a origem do clipe.**

**Correção — manifesto:** `public/models/anims/index.json`, gerado por
`tools/gen-anim-manifest.mjs` (`npm run anims`), lido pelo `glbchars.js` **antes** de
pedir o clipe. Mesmo desenho do `audio/manifest.json` e do `foot-offsets.json`; página
estática não lista diretório, quem sabe o que existe é o build. Manifesto ausente ou
fetch falhando = comportamento antigo (pede tudo): nunca quebra.

**Medido depois:** 420 s → 120 s de CTF no mesmo mapa, **88 erros de console → 0**
(sobram 4 avisos benignos: 2 de perf do WebGL e 2 de extensão glTF desconhecida).

**E o tool `retarget-glb.mjs` estava quebrado — foi por isso que os palhaços nunca tiveram
clipe.** `[...TG.values()].filter(x => !x.parent)[0]` pegava a **primeira** raiz do glTF.
Nos 8 GLB de palhaço existem **duas** raízes e o nó da malha (`"Spiked Ringmaster Clown"`,
0 filhos) vem antes de `"Armature"`: a varredura andava só pelo nó da malha, `mappedTgt`
saía com **0 ossos**, e o tool gravava 11 clipes **sem uma única track** imprimindo
"RETARGET-GLB COMPLETO". Nos 36 personagens de raiz única o acaso acertava. Corrigido: a
raiz passou a ser o ancestral do `Hips`, e menos de 8 ossos mapeados agora **falha alto**.

**E 100 clipes estavam no disco mas não no git.** Achado pela cláusula A4 da régua nova:
10 personagens (`chave, criarj, fluxo, funkraiz, mandrake, oakley, ostentacao, pagodeiro,
raul, trapfunk`) tinham **1 de 11** clipes versionados — só o `idle1h.glb`. Num clone
limpo ou no deploy isso são **mais 100 requisições 404** e 10 personagens caindo no pack
compartilhado sem ninguém saber; o manifesto gerado do disco local prometeria arquivos que
a produção não tem. Os 100 foram versionados (4,5 MB). É o C3 do HANDOFF, agora com número.

**Régua: `tools/gen-anim-manifest.mjs --check`** (`npm run anims:check`, no `check:fast`).
4 cláusulas, **5 mutações medidas**: `sobrando` e `faltando` acendem A1/A2, `semguarda` e
`semfetch` acendem a A3 (que confere que o **jogo consulta** o manifesto antes de pedir —
sem ela o manifesto podia ficar perfeito e os 88 404 continuarem), `semgit` acende a A4.

### ~~BUG-32 · "o respawn do time dentro da loja, eles começam embaixo do mezanino e do nada sobem"~~ · RESOLVIDO 05/08

**Sintoma (palavras do dono, jogando):** *"o respawn do time dentro da loja, eles começam
embaixo do mezanino e do nada sobem, isso tá esquisito."*

**Palpite óbvio REFUTADO antes de agir nele.** A hipótese de partida era "os pontos de
spawn estão sob a pegada do mezanino e o resolvedor multinível devolve a altura errada" —
ou seja, defeito do `groundHeightAt` recém-mexido (BUG-22, 2ª rodada), com a correção
sendo mover os spawns. Medido, **não é**: o `map_havan.js/groundHeightAt(x, z, yRef)`
responde certo nos dois sentidos naquele ponto — `gh(0, −39)` = **3,40** (a laje, que é o
que o mapa declara como spawn do depósito) e `gh(0, −39, 0)` = **0,00** (o piso da loja,
para quem já está embaixo). Mover o spawn teria escondido o defeito e ele voltaria no
próximo mapa com plataforma.

**Causa raiz — confirmada, e são duas caras da mesma.** Os **cinco** lugares que colocam
alguém num spawn escreviam **`pos.set(s.x, 0, s.z)` — Y ZERO LITERAL**, sem nunca
perguntar ao mapa qual é o chão daquele (x, z): `_resetPositions`, `_switchTeam` (2×),
`_respawnPlayer` e o ramo de respawn do `_updateBot`. Enquanto todo mapa foi plano isso
foi verdade por acidente. O spawn do time da loja da Havan é o **depósito do mezanino**,
y de projeto **3,40 m** (`map_havan.js:1752`, `z: MZ.z0 + 2.4`), dentro da pegada onde o
mesmo (x, z) tem piso em 0,00 **e** em 3,40.

**Medido** (`tools/eval/spawn-settle-check.mjs`, `fy_havan`, os 4 slots do time B):

| | y(frame 0) | y(frame 1) | y(frame 30) | o que o jogador vê |
|---|---:|---:|---:|---|
| **BOT, antes** | 0,00 | **3,40** | 3,40 | nasce embaixo da laje e **sobe 3,40 m em um quadro** |
| **JOGADOR, antes** | 0,00 | 0,00 | 0,00 | nasce no **térreo**, embaixo do depósito — andar errado |
| bot e jogador, depois | 3,40 | 3,40 | 3,40 | nascem no depósito, Δ = 0,00 |

O bot sobe e o jogador não pelo mesmo motivo invertido: o realinhamento do bot
(`game.js:_updateBot`, `b.pos.y = groundHeightAt(x, z)`) é **sem `yRef` de propósito**
(o A* não tem camada — está documentado lá, com o botsim que mediu 5× mais bot travado
com camada), então ele pega a laje; o jogador é resolvido com `yRef` = o próprio y = 0 e
recebe "seu chão é o de baixo".

**Correção — no chamador, que é onde estava a causa:** `game.js:_spawnY(x, z)` pergunta a
altura ao mapa, e os cinco `pos.set` passam a usá-la. Sem `yRef` de propósito: o ponto de
spawn é uma **declaração do mapa** ("nasce aqui"), e a superfície que ele quer dizer é a
de cima daquele (x, z). No `_resetPositions` a altura é medida **depois** do jitter, e a
ordem das duas chamadas de `Math.random()` foi preservada (o harness depende dela).

**Régua: `tools/eval/spawn-settle-check.mjs`** (`npm run eval:spawn`, no `check:fast`).
3 cláusulas, 1 mutação medida. Cobre **80 colocações** — jogador **e** bot, em todo spawn
dos 5 mapas —, e usa os caminhos REAIS (`_respawnPlayer` e o ramo de respawn do
`_updateBot`, com `_pickSpawn` fixado em cada ponto), não uma reimplementação da colocação
dentro da régua. `--mutante=y0` devolve o y literal 0 e acende **13 cláusulas**, entre elas
os 3,40 m de teleporte dos 4 bots da Havan. Teto: **|y(frame 30) − y(frame 0)| < 0,25 m**,
que pega o teleporte vertical em qualquer mapa, não só na Havan.

**Verificado NO NAVEGADOR** (Playwright, `fy_havan`, jogando do lado da loja): **20 respawns
seguidos pelo `_respawnPlayer()` de verdade**, olhando o `y` quadro a quadro por 30 quadros
em cada um. Os 20 nasceram em **y = 3,40** e ficaram em 3,40; **pior Δ = 0,00 m**. E a
figura: o screenshot do spawn mostra o jogador DENTRO do depósito — piso sob os pés, rack de
armas no mesmo nível, parede do fundo à frente —, não embaixo de uma laje.

**Custo declarado, medido — e ele existe.** A/B controlado no `botsim` (`node tools/eval/botsim.mjs 60 fy_havan`,
média das 9 sementes; o "antes" é o próprio `_spawnY` devolvendo 0, aplicado e revertido):

| | latFlips/min | fwdFlips/min | stuck % | eff |
|---|---:|---:|---:|---:|
| antes (y literal 0) | 11,778 | 6,744 | **1,678** | 0,206 |
| depois (`_spawnY`) | 12,633 | 6,700 | **2,100** | 0,202 |

**+0,42 pp de bot travado na Havan, e a explicação é o próprio conserto.** Antes, no primeiro
quadro depois de renascer, o bot rodava o `_updateBot` inteiro com `pos.y = 0` — e o
`_collide` filtra colisor por altura (`pos.y + 1.5 > c.minY && pos.y + 0.3 < c.maxY`), então
naquele quadro ele **atravessava as paredes do depósito** antes de ser puxado para 3,40.
Agora ele respeita a geometria do depósito desde o primeiro quadro. É o comportamento
correto custando um pouco de fluidez, e o mesmo ponteiro de sempre: o A\* da Havan não tem
camada (a segunda metade do BUG-22 continua aberta) — resolvê-lo é o que devolve os 0,42 pp.
Ordem de grandeza muito abaixo do 5× (1,73 % → 8,98 %) que fez o `yRef` sair do
realinhamento do bot.

Nos **4 mapas planos** o `_spawnY` devolve 0 e o comportamento é idêntico por construção.
`eval:pegada`, `eval:ctfhud`, `eval:pause`, `eval:regen` e `ctf-round-check` seguem verdes.

---

### ~~BUG-00 · "o jogo reiniciou sozinho e foi pro menu principal"~~ · RESOLVIDO 04/08

**Sintoma (do dono, cinco ocorrências):** *"pela quinta vez o jogo reiniciou sozinho, eu
estava no meio de uma partida e ele foi pro menu principal sozinho"*.

**Causa raiz — confirmada, e NÃO era caminho automático.** `quitToMenu()` tem exatamente
dois chamadores (`public/js/main.js`, `#btn-quit` e `#btn-menu`) e os dois são `onclick`;
`show('main-menu')` só aparece em handlers de clique e no ESC do próprio menu (guardado por
`#map-screen` visível, impossível em partida porque `startGame` chama `show(null)`). Não há
`location.reload`, `history`, nem um `<a href>` na página do jogo. **O clique era real.** O
defeito é que o jogo põe os botões que destroem a partida debaixo da mira, sozinho:

1. `game.js:_plc` pausa a **qualquer** perda de pointer lock — alt-tab, ESC, notificação do
   SO, o Chrome tirando o foco. O jogador não pediu pausa nenhuma.
2. O menu de pausa nasce clicável no mesmo frame, centrado.
3. **Medido** (`node tools/eval/pause-check.mjs --geo`, Chromium 1536×1024, o enquadramento
   3:2 do dono, com o pause aberto):

   | sob o cursor | % da tela |
   |---|---|
   | canvas (o "clique pra voltar") | **0,00 %** |
   | `#pause-menu` (fundo) | 95,59 % |
   | os 5 botões | 4,42 % — `REINICIAR`+`SAIR` somam 1,66 % |

   E na coluna vertical do **centro da tela**, que é onde mora a mira:
   centro → `CONFIGURAÇÕES`; centro **+100 px** → `REINICIAR PARTIDA` (*"reiniciou
   sozinho"*); centro **+150 px** → `SAIR PRO MENU` (*"foi pro menu principal sozinho"*).
4. O escape hatch estava **morto**: `_md` só retomava com
   `e.target === renderer.domElement`, e com 0,00 % de canvas exposto isso nunca acontece
   pausado. O gate nasceu no G2-R2 pra consertar o inverso (*"clico em SAIR PRO MENU e não
   acontece nada"*) e, ao consertar aquilo, entregou **todo** clique pausado pros botões.

**O que foi descartado com medição, não com palpite:** o fim de partida (`_endMatch`) não
dispara cedo — `killsToWin`/`capsToWin` são `Infinity` e só são lidos sob `PACE`
(`QS.get('pace')==='1'`, desligado); 900 s headless em 5 mapas (harness `bootGame`) fecham
sempre em 5 rodadas / 530,7 s, sem transição espúria. `dispose()` só é chamado por
`startGame` e `quitToMenu`. `beforeunload`/`sendBeacon` não navegam.

**Correção** (`game.js` + `main.js`):
- `PAUSE_ARM_MS = 600` — o painel de ações nasce com `pointer-events:none`, então o tiro
  em voo não alcança botão nenhum;
- clique no **fundo** do menu (95,59 % da tela) retoma a partida — o escape hatch de volta,
  agora num alvo que existe;
- passada a guarda o painel volta a aceitar clique (senão o G2-R2 ressuscita);
- `confirmGate` (game.js) — `SAIR PRO MENU` e `REINICIAR` exigem dois toques com
  **CONFIRM_MIN_MS = 350 ms de silêncio** entre eles. Não é "clique de novo" ingênuo: a
  primeira versão desta trava foi **reprovada em Chromium por uma rajada de 8 cliques a
  60 ms no mesmo pixel** (o que a mão do jogador faz quando a arma "para de atirar"), que
  confirmou sozinha e saiu pro menu. Clique cedo demais agora **re-arma** o relógio.

**Régua: `tools/eval/pause-check.mjs`** (node puro, ~5 s, no `check:fast` e no quality gate como
invariante `PAUSA`). 6 cláusulas, **7 mutações medidas, todas fazem a cláusula certa ficar
vermelha** — inclusive `PAUSA5`, que reprova caminho automático novo fora da fronteira
delimitada de abertura (um `setTimeout(quitToMenu, 1000)` deixa o quality gate vermelho).
Duas armadilhas achadas escrevendo a própria régua e consertadas: a isenção do corpo de `quitToMenu` era por "tem `function
quitToMenu` por perto" (passava verde com a mutação colada logo abaixo da função) e a busca
era por `quitToMenu(` (não pegava `setTimeout(quitToMenu, …)`, que é justamente como se
cria um caminho automático sem escrever parênteses).

---

### ~~BUG-01 · Bandeiras de CTF aparecem no HUD em partida de rodadas~~ · RESOLVIDO 29/08

Já estava corrigido na árvore de 29/08: `_hideCtfHud()` esconde e limpa a faixa
(`public/js/game.js:4557`), `_updateCtfHud()` guarda modo e presença de bandeiras
(`public/js/game.js:4563`) e `dispose()` chama a limpeza ao sair da partida
(`public/js/game.js:7058`). `node tools/eval/ctfhud-check.mjs`: **CTFHUD 5/5 casos**;
`--mutate` removeu a guarda e derrubou **3 casos**, provando que a régua morde.

---

### ~~BUG-02 · O quality gate se auto-sabota~~ · RESOLVIDO 04/08

`package.json` passou a rodar **`eval:vm` antes de `eval:invariants`** (e ganhou
`audio:check`). O diagnóstico abaixo fica porque explica por que a ordem importa e por que
nenhuma vermelha de VM vale sem regenerar o JSON antes.

**Causa raiz — confirmada.** `package.json` define
`check = syntax && eval:invariants && eval:vm && ...`. As invariantes de viewmodel leem
`tools/eval/vm_mint_audit.json`, que é **gerado pelo `eval:vm` — que roda depois**. Como
`eval:invariants` sai 1, o `&&` corta e o JSON nunca é regenerado. Ele congela.

**Impacto medido (04/08):** o JSON no repo era de 03/08 07:39, com `V0=80°` e
`vmOff=[0.03,-0.23,0]`; o `game.js` está em `V0=42°` e `VM_OFF=[0.03,-0.10,0]`
(`game.js:436` e `game.js:480`). Resultado — antes × depois de `npm run eval:vm`:

| Invariante | com JSON velho | com JSON regenerado |
|---|---|---|
| VM5 área da arma na tela | 1,1–4,5% · **26/26 fora** | 6,3–12,8% · 3/26 fora |
| VM1 borda esquerda | **26/26 fora** | 2/26 fora |
| VM9 grip | **26/26 fora** | ✓ passa |
| AUD1 (meta-invariante) | ✗ "lente do JSON DIVERGE" | ✓ passa |

A `AUD1` — que o `HANDOFF.md` manda manter verde — detectou o problema corretamente. Ela é a
única razão de isso não ter virado três dias perseguindo um defeito que não existe.

**Correção:** inverter a ordem (`eval:vm` antes de `eval:invariants`) **ou** fazer
`invariants.mjs` recusar-se a rodar quando `vm_mint_audit.json` for mais antigo que `game.js`
(falha explícita vale mais que vermelho falso).

---

### BUG-04 · `ViewModelRig` está escrito, testado — e nunca foi importado

`public/js/springs.js:94` exporta uma máquina de estados completa de viewmodel: idle com
respiração, sway com mola, bob, **reload em 5 fases com queda de carregador**, holster+draw com
troca de malha no ponto baixo do arco, ADS. Tem teste dedicado (`tools/eval/vmrig-test.mjs`).

`public/js/game.js:11` importa **só** `RecoilAxis` de `springs.js`. O `vmrig-test.mjs` valida
código que **não roda no jogo**. Consequência de produto: o reload não tem fase visível nem
carregador caindo — o critério V5 do plano de release é impossível de atender enquanto isso não
mudar.

---

## P1 — o jogador vê

### ~~CTF sumiu do menu da home~~ · CORRIGIDO LOCALMENTE 06/09/2026

**Relato:** "o modo CTF sumiu do menu da home". O redesign removeu o botão
`data-act="ctf"` de `src/pages/index.astro`; o handler em `public/js/main.js`
continuou presente. Não era ocultação por CSS: o botão não existia no HTML.

**Correção:** restaurado o submenu de SINGLE PLAYER com MATA-MATA e CAPTURE A
BANDEIRA, com os handlers existentes. UIR26 de `npm run eval:redesign` reprovou antes e passou depois;
`--mutante=ctf-some-home` remove o acesso em memória e faz UIR26 reprovar.
`node tools/eval/mode-check.mjs` passou 60/60 casos de preservação da escolha.

**Visual:** navegador local em 1200×800: submenu legível, coluna completa e rodapé
visível. Clique em CAPTURE A BANDEIRA abre mapas em CTF. Revisão adversarial sem achados bloqueantes; a régua estática
não comprova visibilidade por si só. Publicação e acompanhamento: `HANDOFF.md`.

### BUG-36 · Ctrl+W fecha a aba no meio da partida (Windows/Linux) — MITIGADO, limite de plataforma

**REBAIXADO P0 → P1 em 29/08 — a mitigação de duas camadas JÁ ESTÁ NA MAIN e o que
resta é limite de plataforma.** Nenhum navegador deixa uma página bloquear Ctrl+W de
verdade fora do par tela-cheia + Chromium (Keyboard Lock API); o padrão dos jogos web —
confirmar no `beforeunload` com partida viva — está aplicado. Evidência, conferida linha a
linha em 29/08 na `origin/main` (a.195):

- `_travaAtalhos`/`_soltaAtalhos`: `public/js/game.js:2093-2098`, com guarda de `testMode`
  e de `fullscreenElement` na primeira linha (`game.js:2094`) — arnês e harness não ganham
  trava nem diálogo;
- armada no funil único `_requestLock` (`game.js:2072`); solta no `setPaused(true)`
  (`game.js:2636`) e no `dispose()` (`game.js:7051`) — sem vazamento de handler;
- `beforeunload` gateado por `emPartida()` (`public/js/main.js:2102-2119`; a função em
  `main.js:2081`) — no menu, nada arma.

**Medido em 29/08, contra preview construído** (`npm run build` + `python3 -m http.server
4399 -d dist/client` + `BASE=http://localhost:4399 node tools/eval/ctrlw-check.mjs`): as
QUATRO cláusulas passam — CW1 (`requestFullscreen` 1×, `keyboard.lock` 1× com
`KeyW,KeyT,KeyN,KeyR,Digit1-3`), CW2 (`countdown` → confirmação `true`), CW3 (menu →
confirmação `false`), CW4. É a primeira corrida em que CW1 e CW2 fecham nesta máquina — o
caminho era o `BASE=` num preview construído, exatamente como a entrada previa. Mutação
`--mutante=semprompt` executada na mesma corrida: CW2 **FALHA** (*"confirmação: false"*,
`✗ CTRLW 1 reprovação`) — a cláusula que faltava exercitar morde.

**Por que P1 e não fechado:** a confirmação manual em Windows + Chrome (segurar Ctrl e
andar com W numa partida, a aba não pode fechar) segue pendente — só ela fecha a entrada,
e é do Daniel Diniz, que reportou. Firefox/Safari (espera-se o diálogo, não o fechamento
seco) também seguem não testados. Diagnóstico original e histórico da régua abaixo.

**Palavras de quem reportou** (Daniel Diniz, 07/08, LinkedIn): *"quando fica muito tempo
com a tecla Control pressionada a página fecha"* · *"Testei no Windows, mas posso ver no
Mac"* · *"Não acontece no Mac 🤔, mas pode ser o chrome desatualizado!"* · *"testei em
outros Browser e tem o mesmo problema. É alguma treta do Windows mesmo"*.

**Não é treta do Windows, e não é o Control sozinho.** Agachar é
`ControlLeft`/`ControlRight` e andar pra frente é `W` (`game.js`, `wantCrouch`). **Agachar
andando pra frente É Ctrl+W**, que no Windows e no Linux fecha a aba. No Mac o atalho é
Cmd+W — por isso o dono, que joga no Mac, nunca reproduziu. Mesma família: Ctrl+1/2/3 troca
de aba do navegador, e 1/2/3 é a troca de arma.

**Por que o código já sabia e não resolvia.** O `_kd` (`game.js:1969`) engolia
`ctrlKey`/`metaKey` em pointer lock, e o comentário dele registrava a derrota: *"Ctrl+W o
Chrome não deixa prevenir, use C pra agachar"*. Ctrl+W é atalho RESERVADO — `preventDefault`
não alcança. Dizer ao jogador pra não usar a tecla padrão de FPS não é conserto, é aviso.

**Conserto, duas camadas porque nenhuma sozinha cobre todo mundo.**
1. `_travaAtalhos()` (`game.js`, dentro do `_requestLock`): `navigator.keyboard.lock()` com
   `KeyW`/`KeyT`/`KeyN`/`KeyR`/`Digit1-3`. É a única API que captura Ctrl+W — e **só
   funciona em tela cheia**, por isso a tela cheia entra junto, pedida cedo no `startGame`
   (`main.js`), enquanto o clique ainda vale como gesto do usuário: depois do
   `await sfxReady` e do `Promise.all` dos GLBs a ativação transiente já queimou. Escape
   fica fora da lista de propósito (travado, exigiria toque longo, e Escape é o menu de
   pausa). Solta no `dispose()` e no `setPaused(true)` — segurar o navegador de quem está
   tentando sair seria hostil. Chromium só.
2. O `beforeunload` do `main.js` passa a pedir confirmação **enquanto a partida está viva**.
   Cobre Firefox, Safari e todo caso em que a tela cheia não pegou.

**De quebra:** o `requestPointerLock` estava duplicado (`main.js:596` e o `_requestLock` do
`game.js`), e era a duplicata que deixava a trava sem lugar pra morar no COMEÇO da partida
— o RETOMAR passava pelo funil, o COMEÇAR não. Agora é um funil só.

**Régua nova:** `tools/eval/ctrlw-check.mjs` (`npm run eval:ctrlw`), quatro cláusulas:

| | o que mede | estado em 07/08 | mutação |
|---|---|---|---|
| CW4 | `_travaAtalhos` chama `keyboard.lock` com as teclas certas (node puro) | **VERDE** — pediu `KeyW,KeyT,KeyN,KeyR,Digit1-3` | `semtravar` → `[]`, FALHA ✓ |
| CW3 | no MENU o `beforeunload` fica calado | **VERDE** | `promptsempre` → FALHA ✓ |
| CW2 | com partida viva o `beforeunload` confirma | verde numa corrida, **não reproduzido** | `semprompt` (não executada) |
| CW1 | tela cheia + trava ao ENTRAR na partida | **não medida** | `semlock` (não executada) |

A CW3 é a que protege o conserto de si mesmo: confirmação que aparece sempre vira praga, e
praga alguém arranca inteira em duas semanas, levando o conserto junto. A CW4 nasceu porque
o caminho de navegador não fechava nesta máquina e a pergunta mais direta — *a trava chama
mesmo a API, e com quais teclas?* — não podia ficar sem resposta esperando por ele. As
mutações de arquivo servido morrem se não casarem o texto (`MUTANTE NÃO APLICOU`): mutação
que passa de largo devolve verde, e esse verde é lido como "o guarda funciona".

**O arnês fornece o ambiente, e isso está às claras no cabeçalho da régua:** Chrome
headless não concede tela cheia de verdade nem expõe `navigator.keyboard`, então a régua
planta os dois e mede o CÓDIGO DO JOGO. Ela não prova nada sobre o navegador hospedeiro.

**QUATRO DEFEITOS DE INSTRUMENTO pagos escrevendo esta régua** (lei 7 da `bug-hunt`, e os
quatro acusaram código inocente):
1. media no `state` do jogo em vez do fim do `startGame` — `game.start()` põe `countdown`
   ~20 linhas ANTES do `_requestLock`, então CW1 reprovava algo que ainda não tinha sido
   tentado;
2. `getElementById('loading')` quando o overlay é `load-overlay` — o `?.` devolvia
   `undefined` e a condição nunca fechava;
3. `waitForFunction` polla em `requestAnimationFrame` por padrão, e o rAF fica estrangulado
   justamente durante o preload pesado que se está esperando (`polling: 250` resolve);
4. `.catch(() => false)` cego no `waitForFunction`, que transformou exceção do Playwright
   em "não ficou pronto" e escondeu (3) por três corridas.

**NÃO VERIFICADO — e o primeiro item é o que fecha o defeito, não a régua:**
- **Windows + Chrome com Ctrl+W de verdade.** Só quem tem Windows fecha isto: entrar na
  partida, segurar Ctrl e andar com W por vários segundos, e a aba não pode fechar. **Pedir
  ao Daniel Diniz**, que reportou.
- Firefox e Safari: espera-se o diálogo de confirmação, não o fechamento seco. Não testado.
- CW1 e CW2 não fecharam nesta máquina: o `/` em dev leva minutos pra compilar e o preload
  do elenco derruba o renderer headless. A régua reprova por isso e **diz que reprovou** —
  não conta como aprovação. Rodar em máquina mais folgada, ou com `BASE=` apontando pra um
  preview já construído.

### BUG-03 · BOT8 — bot com linha de visão no jogador por segundos, sem atirar — REBAIXADO P0 → P1 29/08

**A entrada estava VELHA — o conserto real já mora na main, e a correção que ela
prescrevia foi REFUTADA com medição.** Conferido em 29/08 na `origin/main` (a.195):

- A prescrição antiga (*"mover a chamada do `_duelToken` pra dentro do `if`, depois dos
  gates"*) foi medida e **PIORA**: 3,8 epi | 6,73 s contra 2,6 | 5,23 do código de então
  (botdiag `SIM_SHOOTGATE`, 9 sementes × 4 mapas × 180 s). Chamada todo frame também é
  FILA — atrás do `if` ela vira DISPUTA no instante do gatilho, e quem perde come 1,6 s de
  silêncio. A refutação inteira está escrita no código: `public/js/game.js:6057-6070`.
- O conserto aplicado tem duas metades: só quem PODE atirar concorre ao token
  (`canUse && this._duelToken(b)`, `game.js:6071-6072`) e o holder que não pode mais
  atirar DEVOLVE o token na hora (`_duelToken`, `game.js:5706-5716`). Medido na época:
  2,6 epi | 5,23 s → **2,0 epi | 4,73 s**.
- **`origin/feat/times-e-mapas-completo` NÃO traz conserto adicional** (verificado 29/08):
  o diff de `game.js` contra a main troca o áudio de voz (`sfx.voice`/`radioVoice` →
  `characterVoice`) e não toca `_duelToken`, `hasTurn` nem os gates de fogo. Nada a
  cherry-pickar.

**Medido HOJE (29/08, árvore = `origin/main` a.195):**

| protocolo | episódios mudos | maior silêncio | tempo em condição | % tempo mudo |
|---|---|---|---|---|
| portão (`SIM_SHOOTGATE=1 node tools/eval/botdiag.mjs 180 all`, 3 sementes) | **1** | 3,03 s | 460 s | 1,5% |
| 9 sementes (`SIM_SEEDS=12345,777,4242,11,222,3333,44,555,6666`, idem) | **2,3** | 5,52 s | 442 s | 12% |

(Contra o `4 episódios | 4,23 s` do cabeçalho antigo desta entrada.) O motivo predominante
dos quadros mudos não é mais o token: `nextShotAt`/`focusUntil`/`reactAt` (cadência, foco e
reação — mecânicas intencionais de fairness) somam 56-64%; `hasTurn` responde por 19-27%.

**Por que P1 e não P0:** não quebra o jogo nem mente pra quem mede. BOT8 continua VERMELHA
como dívida declarada em `tools/eval/KNOWN-RED.json`, com o teto ZERO **intacto** (não foi
afrouxado — o veto do dono vale); o resíduo é evento raro (1-2,3 episódios em ~450 s de
condição de tiro, somando todos os mapas) e o caminho "óbvio" de zerá-lo já foi medido uma
vez e piora. Zerar de verdade exige redesenhar a interação token × cadência — trabalho de
`gauntlet-fps`, não de conserto.

<details><summary>Diagnóstico original (histórico — a prescrição dele foi refutada)</summary>

**Medido:** `4 episódios | maior silêncio 4,23 s | 690 s em condição`. Vermelha desde o
baseline, nunca atacada (era C9 no handoff anterior, com 2,7 episódios / 3,03 s — piorou).

**Causa raiz — confirmada.** `hasTurn = !(BOT_FAIR && e.isPlayer) || this._duelToken(b)`
era avaliada todo frame, para todo bot cujo alvo é o jogador, antes de qualquer gate de
"pode atirar" — e `_duelToken` não consulta: **reserva** por `BOT_TOKEN_HOLD`. Um bot em
atraso de reação, recarregando ou sem linha de tiro roubava um dos 2 tokens e o segurava;
os outros atravessavam o campo de visão sem disparar.

**Correção (prescrita e depois REFUTADA):** mover a chamada para dentro do `if` — piora,
ver acima.

</details>

---

### BUG-79 · Córrego: grama nunca foi servida e as rampas do canal mostram o céu

**Reportado (27/08/2026, palavras literais do dono):**

> *"o detalhe de grama que te pedi na capivara e na outra ara de grama e pelo corrego
> tambem nao refletiram"* · *"as rampas nas laterais do corrego ainda estao mostrando o
> horizonte esta super esqusiito"* · *"ter grama realistica nas beradas do corrego e
> tambem no chao do mapa ter bastante grama difusa nao só terra"* · *"num geral o mapa
> esta muito bom falta as alteracoes visuais qu eeu ja tinha pedido e nao se refletiram"*

Pedido ANTERIOR, registrado em `plans/13-VISUAL-V2.1.md:33` como frente B:
*"faltou tambem usar os glbs de grama"*. A frente entregou os GLBs e ninguém ligou.

**A · Grama: dois furos independentes, os dois silenciosos.**

| medida | valor |
|---|---|
| spots de grama reservados (`world.gramaSpots`) | 26 |
| grama SERVIDA na cena (`world.gramaServida`) | **0** |
| ids de vegetação em `CORREGO_PROPS` | **0** — nunca baixa |
| `hasProp('grama_corrego')` | **false** |
| GLBs no disco | `grama_corrego_01`, `grama_corrego_02`, `planta_corrego_taboa`, `planta_corrego_taioba` |

`map_corrego.js:443` pede `grama_corrego`; o acervo tem `grama_corrego_01`/`_02`. O `if`
nunca entra. E como `CORREGO_PROPS` não declara vegetação, o `preloadMapProps` nem baixa
— então mesmo com o id certo não apareceria nada.

**Por que o portão estava VERDE.** O `corrego-contract-check` imprime, com todas as
letras, `GRAMA: prop grama_corrego ausente no acervo — cláusula de presença DORMENTE` e
passa no `✓ grama: terreno reservado nas margens (>= 12 spots)`. Ele cobra a INTENÇÃO
(spots) e não o RESULTADO (grama na tela). A pendência que justificava a cláusula
dormente já não existia: a frente E entregou os GLBs. Régua verde medindo a coisa errada
— o corolário da lei 1 da `bug-hunt`.

**B · Rampas do canal: 40,3% dos raios saem para o céu.**

As paredes do canal são construídas em `trechos` que PULAM a faixa da rampa
(`map_corrego.js:366-377`). No lugar sobra só a laje inclinada de 0,22 m
(`addBoxSB`, `:384`) e uma mureta de 0,5 m — acima e abaixo dela o vão é aberto, e de
dentro do canal se vê o skybox.

| raio horizontal do fundo do canal para fora | furos |
|---|---|
| rampa oeste z[−33,−27] | 17/44 |
| rampa leste z[−13,−7] | 18/44 |
| rampa oeste z[9,15] | 17/44 |
| rampa leste z[29,35] | 19/44 |
| **total** | **71/176 = 40,3%** |
| **controle** (trecho sem rampa) | **0/32** |

O controle limpo refuta o palpite óbvio de *face virada / culling*: se fosse isso, o
trecho sem rampa vazaria também.

**Figura:** `/tmp/ceu/rampa-de-dentro-do-canal.png` — duas faixas de céu atravessando a
parede, exatamente o relato.

**Régua:** `eval:corrego-contract` (cláusulas novas) — e o `eval:corrego-superficie`, que
existia como ARQUIVO mas nunca esteve no `package.json`, foi ligado ao `check:fast`.


### ~~BUG-54 · wallpaper do loading quebra em alta resolução (#292)~~ · RESOLVIDO 16/08

**Evidência antes.** `BASE=http://localhost:4322 OUT=/tmp/bug292-before npm run
eval:loadingwall` abriu splash e loading reais em 16:9/3:2, DPR 1/2, e reprovou as oito
combinações. O splash computava `background-size: auto` com uma camada e, em 1920×1080,
repetia uma faixa reconhecível do logo na borda direita. O loading computava uma camada
`cover` e cortava o logo no enquadramento 3:2. O backing das capturas DPR 2 já estava correto
(3840×2160 e 3072×2048), portanto a hipótese de canvas/resolução física baixa foi refutada.

**Causa.** O `background:#141216` inline do splash zerava `size/repeat` da regra externa; no
loading, uma única camada `cover` tentava simultaneamente preencher o quadro e preservar o
assunto — duas exigências incompatíveis quando o aspecto da janela difere do arquivo.

**Correção.** Splash e loading recebem a mesma arte por `--loading-wall` em dois planos: um
`cover` ampliado, escurecido e desfocado preenche o quadro; um `contain` íntegro fica por
cima com o scrim de leitura. Assim não há esticamento, corte do personagem/logo nem cópia
reconhecível nas bordas.

**Régua e mutação.** `tools/eval/loading-wallpaper-check.mjs` mede os dois pseudo-elementos,
o quadro CSS e o PNG físico nas oito combinações e grava todas as capturas. UIR32 prende o
uso da variável e a composição no fonte; `--mutante=loading-wall-cover-unico` troca o
`contain` por `cover` e deixa UIR32 vermelha.

**Evidência depois.** A mesma matriz ficou **8/8 verde**: arte `cover, contain`, fundo
`cover blur(18px)` e dimensões físicas exatas em DPR 1/2. Foram olhadas as capturas
`splash-16x9-dpr1.png` e `loading-3x2-dpr1.png`: assunto e logo inteiros, sem repetição; as
sobras laterais são preenchimento escuro desfocado. **Custo:** a URL é baixada/decodificada
uma vez, mas pintada em dois planos; não entrou asset nem request novo, apenas um segundo
paint durante telas estáticas de espera.

### BUG-53 · O redesign novo tinha mídia completa, mas integração e régua continuam erradas

**Décima revisão do dono (16/08):** a tela cheia de mapas ganhou opções de armas, jogadores
e número de rounds sem esconder o catálogo. A escolha de 1/3/5/7 atravessa `main.js` e
governa a condição real de fim em `Game`; Mata-Mata e Capture a Bandeira guardam escolhas
independentes e preservam os padrões históricos de 5 e 3. UIR33 nasceu vermelha antes da
integração e o mutante `opcoes-mapa-decorativas` prova a ligação de produção. O novo
`eval:matchoptions` instancia o `Game` real em todos os oito pares modo/teto e o mutante
`fixo` deixa 24 cláusulas vermelhas. A captura 1536×1024 foi olhada com SÓ AWP, 6×6 e
MELHOR DE 7 visíveis no cabeçalho, sem colisão com as seis miniaturas.

**Nona revisão do dono (16/08):** *"a tela de selecao de telas fosse a default quando ele
seleciona abate ou capture a bandeira"*, *"abate tinha q ter outro nome"*, *"a tela de
vitoria e derrota ainda esta cortando a imagem dos personagens, e a imagem do personagem
nao se integra com o background"*, *"DIFICULDADE UNDEFINED [...] tirar esse label"*,
*"o punk do tribos urbanas ta como avatar do hipster alternativo"* e *"o ze gotinha no
avatar de selecao nao da pra ver muito bem"*. A mesma revisão pediu avatar aleatório do
elenco enquanto não houver foto própria, upload de foto funcional, *"suporte ao jogo"* no
menu e *"inverter o mouse vertical"* nas configurações. A reprodução encontrou contratos que
o verde anterior não cobria: os casos `sp`/`ctf` chamavam somente `openSetup()` e deixavam
a tela 04 escondida; a ficha anexava uma dificuldade sintética derivada de hash; Punk e
Hipster tinham arquivos distintos, mas ambos usavam o mesmo vocabulário de moicano curto e
camiseta, enquanto o vídeo do Punk real tem liberty spikes multicoloridos e jaqueta com
tachas; e a máscara linear ainda confinava a arte final à coluna direita. O avatar do
Gotinha também foi comparado ao vídeo real para preservar touca, cruz, olhos e silhueta em
114 px. Na medição alpha de 0,2%–99,8%, `mst-vitoria.webp` deixava 13,28% do quadro vazio
abaixo das botas e `mst-derrota.webp`, 10,55% — por isso o corpo parecia flutuar/cortado
mesmo com `contain`. UIR19 passa a decodificar os pixels e medir as margens, e UIR26–UIR28
cobrem respectivamente a entrada padrão pelo mapa, a ausência do label sem contrato e as
identidades visuais auditadas de Punk/Gotinha. UIR29–UIR31 prendem o fallback estável com
troca imediata após upload, a entrada de suporte pelo canal existente e o checkbox que
chega ao `movementY` real. Cada cláusula ganha mutante no uso de produção antes da correção.

**Oitava revisão do dono (16/08):** *"esses 2d das armas tem que mandar tambem na parte
que um jogador mata o outro"* e *"o placar em cima nao precisa de bg black com opacity"*.
O killfeed agora resolve o `short` da arma para o mesmo WebP publicado que alimenta os
slots 1–5 e usa sua transparência como máscara monocromática; o SVG anterior fica apenas
como fallback para itens sem imagem. O placar superior e o relógio passaram a flutuar sobre
a cena, sem os três retângulos pretos. A primeira versão da UIR17 deu uma falsa verde porque
lia uma declaração antiga transparente, ignorando a regra final opaca; a cláusula agora
mede as declarações efetivas do bloco de redesign. UIR25 nasceu vermelha antes da integração,
e os mutantes `killfeed-volta-svg` e `hud-score-volta-preto` derrubam respectivamente UIR25
e UIR17. Na captura 1280×720, os fundos computados dos dois blocos foram
`rgba(0, 0, 0, 0)`; a composição sem placas foi aprovada pelo dono. A captura de
navegador também dispara um abate real e exige `ak.webp` visível no killfeed com o fallback
oculto. A revisão adversarial encontrou ainda dois contratos falsamente verdes: `?tela=08`
abria vitória apesar de 08 ser o placar, e as setas percorriam o catálogo global mesmo com
a aba CIDADES ativa. O alias numérico agora abre o placar e o carrossel navega somente na
lista filtrada; o browser confirma CIDADES de `praca_poderes` para `loja_h` mantendo um card
selecionado. Os mutantes `oito-volta-vitoria` e `mapa-navega-global` mordem os dois usos reais.

**Sétima revisão do dono (16/08):** *"04 · ESCOLHA DO MAPA e a principal que precisamos
alterar, voce preciso enxergar tudo e deixar exatamente igual em fotes, elementos, cores"*;
o mesmo pedido nomeou explicitamente `05 · HUD`, `07 · CONFIGURAÇÕES` e `08 · PLACAR` do
arquivo `CORO SOLTO - Telas AAA.html`. A referência local foi lida como fonte de verdade:
Barlow Condensed no corpo, Bebas Neue nos títulos, Rajdhani nos números; mapa com abas,
ficha e carrossel visual; configurações em painel de 980 px com prévia 360×200; HUD com
estado crítico; placar com cabeçalho superior e duas tabelas.
UIR4, UIR17 e UIR22–UIR24 ficaram vermelhas antes das mudanças. A antiga UIR4 exigia
justamente a faixa textual que o dono reprovou; agora exige miniaturas, abas, setas e
paginação, e seus mutantes removem o uso de produção.

As capturas reais em 1280×720 confirmaram a nova composição do mapa e o painel de
configurações; `?tela=config` fixa a prévia em “Padrão ouro” para a comparação não depender
do `localStorage`. `?tela=placar` mostrou `RODADA 4/5 · 1:32`, JOGADOR/K/D/SCORE/PING em
duas colunas e revelou um defeito que a régua estática não via: `setPaused(true)` abria o
menu de pausa por cima. O modo direto agora congela a partida sem acender esse menu e força
o placar sem CAP., como na tela 08. `?tela=hud&vmlab=1&vida=23` mostrou mira ciano no centro,
slots 1–5, número/barra vermelhos e a vinheta de 160×50 da tela 05; antes, a vida mudava para
23 mas a vinheta permanecia com opacidade zero. A coluna de armas usa a silhueta alfa dos
WebP já publicados como máscara 2D monocromática, sem placa e sem sombreado 3D.

Loading, vitória e derrota foram recapturados no mesmo browser. `?tela=loading&time=B`
mostrou TIME B × TIME E, canvas de 86 px junto à barra, rótulo de ação escondido e GLB
orientado para o avanço. A vitória permaneceu inteira e dissolvida; a derrota ainda tinha
um retângulo preto, então `mst-derrota.webp` também passou a 1024×1536 com alpha real. UIR19
agora decodifica os dois estados, não só a vitória. `tools/eval/screen-query-browser.mjs`
foi atualizado para medir carrossel visual, qualidade da configuração, vida baixa, placar,
mira e máscaras 1–5. As mutações de mapa, fontes, painel, pausa sobre o placar, CTF extra,
vinheta baixa, alpha dos dois resultados, porte e orientação do loading fizeram suas
cláusulas alvo ficarem vermelhas.

**Sexta revisão do dono (15/08):** a vitória ainda cortava o punho levantado e exibia o
retângulo preto do arquivo como uma foto colada no layout; no loading do Time B, o personagem
deveria ficar literalmente um quinto do porte e olhar para o sentido em que a barra avança.
O defeito da vitória estava dentro do próprio `mst-vitoria.webp`: `contain` não poderia
recuperar pixels que já não existiam e UIR19 lia apenas o CSS. A cláusula ficou vermelha com
`alpha=false` antes da troca, passou a decodificar o cabeçalho VP8X/ALPH do WebP publicado e
agora prende também o quadro vertical aprovado. A arte foi estendida para incluir punho,
bandeira e botas, recebeu alpha real e foi recapturada pelo modo direto sem placa retangular.
UIR21 ficou vermelha antes de reduzir o palco e inverter o yaw; a captura de
`?tela=loading&time=B` confirmou Canarinho transparente, pequeno junto à barra e apontando
para a direita. Os mutantes `resultado-sem-alpha`, `loading-volta-grande` e
`loading-vira-esquerda` fazem as duas cláusulas voltarem a reprovar.

**Quinta revisão do dono (15/08, corrige a interpretação):** as pranchas de Metal Slug
eram referência de **vocabulário de movimento**, não pedido de sprite 2D: *"renderiza em
3d mesmo"*. Por isso os corredores PNG da quarta rodada deixam de ser produção. O loading
passa a renderizar um GLB real por facção em canvas transparente, com o mesmo
`CharController`/`AnimationMixer` do jogo alternando corrida, postura pronta, tiro, agachado,
deslocamento agachado, salto e tiro em movimento. A revisão adversarial mostrou que
“MIRA” ainda era apenas `idle`; o rótulo virou “PRONTO” e a régua passou a observar o
`AnimationAction` ativo, não o texto anunciado. O seletor abandona a grade duplicada:
há uma única imagem full-bleed e seis escolhas textuais no rodapé. O modo de inspeção ganha
`?tela=08|vitoria` e `?tela=09|derrota`, além dos aliases em inglês. Antes da correção,
UIA5, UIA6, UIR4, UIR16, SQ1 e SQ5 ficaram vermelhas; os mutantes removem canvas, uma
ação, uma facção, a composição nova, os aliases e a montagem do resultado.
No browser em 1536×1024, o canvas do Gotinha produziu 44 amostras diferentes, percorreu
o ciclo inteiro e expôs os sete clipes reais esperados, mantendo backing store 430×720
com fundo transparente.
A captura mostra o personagem sem placa sobre o wallpaper; a tela de mapa usa os 1.536 px
do quadro e a faixa contém os seis mapas sem repetir miniaturas. O mesmo ensaio abriu os
dois resultados e confirmou `vmlab=1`: mira ciano central, sidebar 1–5 vertical, cinco
silhuetas SVG e um único slot ativo.

**Quarta revisão do dono (15/08, reabre o defeito):** *"a tela de selecao de mapas ainda ta
ruim"*; *"a animacao nao esta fluida, esta muito truncada"*; *"o hud 2d da arma esta muito
3d"*; *"o gif do personagem andando, ta com fundo preto nao ta integrado ao layout"*; e
*"eu queria um modo com query string pra avaliar tela por tela, sem precisar ir no fluxo
todo"*. Emerson também pediu conferir *"o vmlab=1 com a mira ajustada"* e *"o menu 1 2 3 4
5 no sidebar"*. A afirmação de resolvido abaixo permanece como histórico da rodada anterior,
mas o portão verde não cobre estas propriedades; a régua precisa ser corrigida antes de uma
nova mudança visual.

**Evidência e correção da quarta revisão.** Os cinco PNGs publicados tinham 2.304×512 e
o preto chegava a 71,68% da borda dos quadros; a animação tinha oito poses em 0,72 s
(11,1 fps). UIA5 só exigia `alphaMin=0` e `alphaMax=255`, portanto uma faixa preta opaca
com alguns pixels transparentes passava. UIR4 exigia justamente as duas rails gigantes
reprovadas pelo dono, e UIR18 exigia o WebP detalhado da arma. As quatro cláusulas ficaram
vermelhas antes do conserto. Agora cada facção mantém seu próprio corredor em uma folha de
16 poses (4.608×512), a 20 fps; a régua mede a borda de cada quadro e encontrou no máximo
2,84% de pixels não transparentes, abaixo do teto de 5% que permite a arma ultrapassar a
lateral sem aceitar uma tarja inteira. O hash só foi atualizado depois de olhar as capturas
3:2 do modo direto e do fluxo completo. O seletor virou catálogo compacto 2×3 à esquerda e
preview delimitado à direita. O inventário 1–5 usa `_wpnIcon()` (SVG plano), volta à lateral
direita e esconde o WebP 3D de `#ammo-weapon-art`.

`public/js/screenquery.js` expõe o modo de inspeção sem atravessar o funil: `?tela=00..07`
ou `?tela=splash|loading|menu|faccao|personagem|mapas|hud|pausa|config`, com `time`, `char`
e `map` opcionais. `tools/eval/screen-query-browser.mjs` abriu mapas, loading e
`?tela=hud&vmlab=1&time=E&char=mst` diretamente. Mediu seis mapas e um selecionado,
12 posições distintas do corredor em 650 ms, viewmodel do laboratório visível, mira ciano
centralizada e os cinco slots SVG empilhados no canto direito. O smoke sem atalho abriu
ranking e voltou, percorreu facção → personagem → adversário e chegou ao HUD vivo. Ele
também revelou que personagens de pistola acendiam os slots 1 e 2 ao mesmo tempo; HUD6
ficou vermelho antes de `_updateWeaponHud()` limitar a marca ativa a um slot.

**Evidência antes.** `npm run eval:redesign` em 15/08 deixou UIR1–UIR5 vermelhas, embora
UIA1–UIA3 tenham conferido o elenco inteiro e todos os vídeos. A captura reproduzível
`OUT=/tmp/ui-169 W=1366 H=768 ONLY=04 BASE=http://127.0.0.1:8123 node tools/eval/telas-menu7.mjs`
mostra os cartões das pontas cortados; em 1536×1024 eles cabem.

**Causas medidas.** `renderMapScreen()` escrevia texto dinâmico fora de `tr()`;
`loop()` continuava chamando `pv.r.render` sob o vídeo e `show()` não pausava o decoder ao
sair da tela (`public/js/main.js:1356`, `:2202` e `:236`); `.ms-thumb` tinha 196 px e
`flex:none` (`public/style.css:1863`); o `DICT` declarava `PERSONAGENS` e `COMO JOGAR`
duas vezes (`public/js/i18n.js:24`). O capturador também seguia o fluxo antigo
(`#btn-team-p`, submenu fechado e `DOMContentLoaded` como proxy), portanto não chegava à
tela de personagem. Na inspeção dos pixels, todos os vídeos publicados eram válidos, mas o
gerador fixava `w=ak`: os loadouts não-AK mostravam arma diferente da declarada em
`CHAR_WEAPON`.
O placar CTF ganhou três números por linha, mas o cabeçalho visual ainda consultava o
contrato removido `#sb-cap-h/.sb-head`; “CAP.” não aparecia e o capturador só imprimia o
falso verde.

**Correção e figura depois.** Texto dinâmico e chrome tardio passam por `tr()`/`frase()`,
incluindo as fichas do elenco em inglês; `FACTION_NAME` cobre a chave real `E`. O preview
3D voltou a ser o caminho normal, interativo e parado em três-quartos até o arraste; o vídeo
é fallback sem WebGL e libera o decoder ao sair. A faixa usa flex shrink e o capturador mede os retângulos reais: seis
cards de 196 px dentro de 1.312 px em 1536×1024; seis de 166 px dentro de 1.056 px em
1280×720. Foram regenerados os clipes dos loadouts não-AK pelo personagem, arma e animação
do jogo real. Vitória e derrota foram recapturadas depois de ligar o resize também durante
`PLAY`: câmera, viewport e backing store agora são quadrados, em vez de um arquivo quadrado
recortar silenciosamente o renderer 3:4. O placar agora cria K/M/CAP. no cabeçalho de cada time e o
capturador reprova se os dois “CAP.” não estiverem visíveis. As pranchas finais foram
olhadas nos dois aspectos; o smoke abriu ranking, voltou, percorreu facção → personagem →
adversário e chegou ao HUD vivo sem `pageerror`.

O crítico adversarial encontrou ainda falsos verdes. UIR5 só lia a primeira chave de cada
linha e não via `JOGAR` repetido no meio de uma linha; UIA1/UIA2 provavam contêiner, não o
conteúdo aprovado; `eval:select` não usava o `preview:true` da tela e imprimia reprovação com
exit 0. As réguas agora leem toda chave literal, prendem o lote visualmente aprovado ao hash
dos vídeos e do mapa `CHAR_WEAPON` em `tools/eval/char-native-audit.json`, medem o porte real
da seleção e saem 1 quando um personagem reprova. Regenerar mídia sem nova inspeção deixa
UIA4 vermelha. O gerador também aborta em `pageerror`, timeout ou resize incompleto, em vez
de preservar artefato velho com sucesso falso.

**Segunda revisão do dono.** A tela de mapas ainda era um herói grande com uma faixa de
miniaturas; a seleção ainda tinha três colunas; a entrada trocava os wallpapers antigos por
um vídeo; loading e resultado mantinham decoders decorativos; e o Canarinho publicado tinha
um quadro horizontal pequeno com fundo opaco. A régua antiga aprovava todos esses estados. A composição agora
mostra o catálogo inteiro numa grade única, põe ficha + preview em duas colunas e o elenco na
faixa horizontal inferior, usa `loading-*` tanto na entrada quanto na espera do mapa e pinta
vitória/derrota só com os pares estáticos do personagem escolhido. O Canarinho virou sprite
PNG HD com alpha e animação CSS — nenhum decoder fica vivo por causa dele. As capturas
foram olhadas em 1536×1024 e 1600×900; `telas-capture.mjs` também confirmou o resultado
estático nos dois enquadramentos que já cobre.
O crítico limpo encontrou um último desvio: trocar de personagem com `M` atualizava a
malha jogável, mas não o `playerCharId` usado pela arte final. UIR15 foi deixada vermelha
antes da correção; `_switchTeam()` agora sincroniza a identidade e o mutante que remove a
sincronização volta a reprovar. UIA5 também decodifica o PNG e exige pixels transparentes
e opacos, em vez de confiar apenas no tipo RGBA do cabeçalho. O lote estático aprovado
e o sprite ficam presos aos hashes de `tools/eval/redesign-static-audit.json`; trocar qualquer
arte exige uma nova inspeção visual. Nessa revisão, marcas reconhecíveis nas artes de Canarinho e Chave
foram substituídas por símbolos fictícios sem mudar personagem, pose ou acabamento.

**Terceira revisão do dono.** A captura em tela baixa mostrou a faixa de avatares
encostando nos controles do preview; a captura do resultado mostrou braços cortados e uma
emenda retangular entre foto e fundo. No fonte, os avatares mantinham o tamanho anterior, o mapa
reservava a metade esquerda para a ficha, o placar abreviava K/M, e o topo do HUD tinha voltado
a uma placa preta. UIR4, UIR7, UIR13 e UIR17–UIR20 ficaram vermelhas antes da correção.
Agora o catálogo ocupa rails que mostram todos os mapas, o elenco usa miniaturas 1,5× numa faixa
central com uma linha própria, e o preview respeita a altura restante. O placar escreve
KILLS/MORTES por extenso sobre a mesma grade das linhas; o HUD superior é transparente e usa
a tipografia do pause. A arma ativa ganhou render branco detalhado e pente segmentado ao lado
da contagem. A arte final usa enquadramento integral e máscara horizontal para dissolver no
fundo. Português é o fallback; inglês automático depende do país recebido pelo SSR, com
Portugal e Espanha fora do conjunto inglês. O loading conserva o Canarinho na entrada e usa
Zé da Gotinha, Canarinho, Black Metal, Bonzo ou Mandrake conforme a facção. As pranchas
completas foram inspecionadas com passada alternada, arma nas duas mãos e alpha, e seus
bytes aprovados ficaram presos ao hash estático.

**Quarta revisão do dono (16/08).** *"essa tela de vitória/derrota eu já falei 20x,
tem que arrumar: o personagem tem que aparecer por inteiro e, se possível, encostado no
right; o bg integrado com ele como se fosse uma coisa só"*. A captura em 2048×1280 ainda
mostra cabeça/mão e pés cortados e uma moldura retangular escura atrás da arte. A revisão
anterior, portanto, não fechou o enquadramento servido.

**Resolvido na quarta revisão.** A régua de pixels ficou vermelha em **87/88** artes: os
arquivos quadrados opacos não tinham como revelar corpo inteiro com CSS. Os 44 personagens
do elenco atual foram republicados em recorte alpha 1024×1536, sem inventar personagem; Punk
e Sindicato foram conferidos nos próprios GLBs. UIR19 agora lê todos os pixels e exige folga
superior/inferior, alinhamento à direita e pelo menos 72% do eixo vertical ocupado. A tela usa
`contain`, sem máscara e sem retângulo; vitória e derrota em 1536×1024 mostram cabeça, mãos e
botas inteiras. Os mutantes de `cover`, remoção do degradê e alpha ausente deixam UIR19
vermelha. Custo: o lote de resultado passa a 7,2 MB; é carregado sob demanda, uma arte por
fim de partida.

**Régua.** A fonte única dos mutantes vigentes é `alvoPorMutante` em
`tools/eval/redesign-check.mjs`; a documentação não repete essa lista. Para esta revisão,
`loading-sem-canvas`, `loading-uma-acao`, `loading-uma-faccao` e `mapa-volta-grade`
reprovaram suas cláusulas alvo. `tools/eval/screen-query-check.mjs` cobre aliases, chamada
de boot, montagem de resultado, ordem E × B e consumo explícito de `target.map`; os mutantes
correspondentes ficam declarados no próprio script. `tools/eval/screen-query-browser.mjs`
observa um ciclo completo, compara o rótulo com o clipe ativo, abre um mapa diferente do
default, testa vitória nos dois lados e mede `vmlab=1` com mira e sidebar. Os mutantes de
sprite descritos nas revisões anteriores são históricos e deixaram de existir quando o
loading passou a GLB ao vivo.
`tools/eval/vmlab-hud-check.mjs --mutante=duplicado-ativo` protege a leitura de um único slot ativo.
`tools/eval/select-mount.mjs --mutate=sem-preview` prova que o porte funcional não pode
voltar a substituir a pose apresentada.

### ~~BUG-52 · O indicador de dano apontava 180° pro lado errado~~ · RESOLVIDO 12/08

**Sintoma (do dono):** *"O jogo está mostrando o dano recebido (e o texto do dano) em uma
posição 180 graus além da esperada. Ou seja, se eu tomo na frente, aparece que eu tomei nas
costas. Este código marcado foi colocado em outra seção, mas não resolveu."* — apontando pro
comentário de `_noteHit` (`public/js/game.js:4358-4363`).

**Causa raiz — confirmada.** Existem DOIS lugares que calculam a direção do atacante
relativa à vítima, e só um tinha o sinal certo. `_noteHit()` (o painel de texto "MORTO
POR"/"veio DA SUA FRENTE") já estava correto: `atan2(p.pos.x - by.pos.x, p.pos.z -
by.pos.z) - p.yaw` — vítima menos atacante. Mas o indicador que o jogador vê primeiro, o
arco vermelho na borda da tela (`_dmgArc()`, chamado de `_damage()` só quando
`ent.isPlayer`), reimplementava a MESMA conta com os operandos TROCADOS:
`atan2(attacker.pos.x - ent.pos.x, attacker.pos.z - ent.pos.z) - ent.yaw`
(`public/js/game.js:3035`, antes do conserto). Trocar a ordem do subtraendo nega o vetor, e
negar um vetor soma exatamente π ao resultado do `atan2` — os 180° que o dono via. O mesmo
operando trocado também existia no indicador antigo por trás do kill-switch `?dmgdir=0`
(`public/js/game.js:2991`).

**Reprodução:** `node tools/eval/dmgdir-check.mjs` contra o `game.js` de antes do conserto.

**O que foi DESCARTADO com medição, não com palpite:** o próprio dono já tinha apontado o
comentário de `_noteHit` como tentativa anterior que não resolveu. Derivar a álgebra do
`atan2` (convenção de yaw da câmera, forward=(-sin,-cos), ver comentário em
`_updatePlayer`) e alimentar o resultado de volta no código mostrou que a fórmula de
`_noteHit` já estava certa — o palpite de "reverter mais um sinal ali" teria sido
inútil, porque o defeito não morava naquele método. Morava no `_dmgArc`, uma
reimplementação irmã que ninguém tinha olhado.

**Medido antes do conserto** (`node tools/eval/dmgdir-check.mjs`, 4 direções cardeais × 7
yaws da vítima = 28 casos, ângulo real escrito em `transform: rotate(...)` do elemento do
arco):

| | antes | depois |
|---|---|---|
| casos com o arco no lado certo (FRENTE=topo, COSTAS=embaixo, DIREITA/ESQUERDA corretos) | 0/28 | 28/28 |
| desvio de FRENTE e COSTAS | exatamente π (180°) em todos os 28 casos | 0 |

**Correção.** `public/js/game.js:3035` (arco moderno) e `:2991` (fallback `?dmgdir=0`):
`ent.pos - attacker.pos`, não `attacker.pos - ent.pos`, igualando a ordem que `_noteHit`
já usava.

**Custo declarado, medido:** nenhum — a mudança troca dois operandos de subtração, sem
custo de desempenho. Não testado no navegador (browser): a régua exercita `_dmgArc` de
produção via extração de método (mesma técnica de `ctfhud-check.mjs`), não a rota `/` real;
o visual em jogo (posição do arco na borda, painel de morte) não foi conferido a olho.

**Régua: `tools/eval/dmgdir-check.mjs`** (`npm run eval:dmgdir`, no `check:fast`).
28 cláusulas (4 direções × 7 yaws), 1 mutação medida: `--mutante=ordem-trocada` devolve a
ordem de operandos do defeito original e derruba 28/28 casos.

### ~~BUG-53 · Loja H: fachada sem tinta acima da linha do olho~~ · RESOLVIDO 13/08

**Sintoma (medido, censo no navegador):** fachada externa com 22% de cobertura a 3,2 m e
**0/90 placas a 5,0 m** (quebrada 65,7/44,4 · piscina 68,5/72,7 nas mesmas faixas). As
células peladas tinham `z ≥ 0` — fora da zona limpa declarada (`z ≤ −6,4`), ou seja lacuna
real, não decisão de arte.

**Palpite refutado:** "é o StaticBatch `havan-deco` com normal/matriz de instância" (classe
do `5da7fc0`) — refutado por leitura: o batch é `Mesh` mesclada com geometria assada em
mundo (`mapprops.js:135-151`), sem `instanceId`. Também foi refutada em campo a banda de
altura 5,0–8,0 espelhando a quebrada: 51,9% contra 51,7% sem ela — ruído.

**Causa medida** (sonda `tools/eval/probe-grafite.mjs`, 102 âncoras na fachada): a pele
greco-romana (banners z=−4,1 · cornija z=−3,8) flutua 1,3–1,7 m à frente da parede
(z=−5,5) e três filtros da passada a tornavam impintável —
1. os olhos de descoberta paravam em 3,1 m: a cornija (5,0–5,55) **nunca virava âncora**
   (`graffiti_pass.js:267`);
2. `_alturaParede` sondava a base só a 1,0 m: por baixo do banner (que começa a 1,9) não
   há nada → teto=1,2 → `semTeto` em qualquer banda alta (16 âncoras de banner assim);
3. `_temChao` reprova o que sobrasse: banner e cornija têm ar embaixo por construção.
E a régua media a pele enquanto a tinta estava na parede atrás: 16 peças com topo a 5,0 m
em z≈−5,44, invisíveis ao censo porque a placa fica a 1,4 m do plano da arte e o limite é
0,6 (`graffiti-census.mjs` PERTO).

**Correção:** âncora passa a guardar a altura do acerto (`olho`); `_alturaParede` cai pra
altura do acerto quando a sonda de 1,0 m falha; olhos de descoberta configuráveis
(`olhos`, e a Loja H usa `[1.55, 3.1, 5.25]`); `exigeChao` ganha versão por banda; banda
2,5–5,2 da loja_h com `exigeChao: false` e `larg: 1.5` (o banner tem 1,9 e a auditoria
amostra os cantos — com 1,8 sobravam 5 cm de margem e 3/15 amostras caíam fora); banda
nova de cornija (`y0 5,0–5,6`, pixo fino).

**Prova com controle e mutação:** rebake do controle (sem a correção) = 45,1% · 20,6% ·
0/90 — é também a prova de que a régua morde: sem o olho de 5,25 m a faixa de 5,0 m volta
a zero. Com a correção: **57,5% · 28% · 54,4%** (49/90 a 5,0 m) na branch original; na
árvore da main (com o filtro de âncora baixa do #260, que tira a tinta de caixa
procedural do 1,6 m) o rebake mede **49,4% · 28% · 54,4%**. Auditoria irmã: no-ar
reais 20 (controle) → 26, todos na classe pré-existente de peça em base de coluna/poste
(y ≤ 1,7); zero peça flutuante nas faixas novas. Piso da `graffiti-census` para loja_h
subiu 43 → 49 (o censo varia ±6 pontos entre execuções). Fotos olhadas: pixo correndo na
cornija e peças entre colunas, nada no ar nos ângulos de jogador.

**O que NÃO foi verificado:** 3,2 m continua 28% (quebrada 65,7) — os banners recebem
peça mas a largura útil limita; e o delta de +6 no-ar não foi isolado peça a peça
(reshuffle da passada mistura a amostra).


### ~~BUG-43 · "o menu de HUD não está mostrando com vmlab=1 em produção"~~ · RESOLVIDO 10/08

**Sintoma (do dono):** *"o menu de hud nao esta mostrando com vmlab=1 em producao"*.

**Reprodução em produção (10/08):** abrir `https://www.csbrasil.online/?vmlab=1`.
O parâmetro chega como `vmlab=1`, mas o DOM publicado contém **zero** elemento
`#weapon-hud`/`#wephud` e nenhum script cujo `src` contenha `vmlab`.

**Causa raiz - confirmada.** O HUD de slots do #131 nasceu como um mock sobreposto à aba
"Testar no jogo" de `public/dev.html` (commits `78cf645`, `76f730d` e `10270bd`), com a
própria mensagem de commit dizendo que ainda precisaria ser levado ao HUD real. O #154
extraiu somente a bancada local e, corretamente, manteve `dev.html` fora do build publicado.
Na `main`, `src/pages/index.astro` não declara o menu de armas e `public/js/game.js` não lê
`vmlab`; portanto a query string não tem como materializar o protótipo em produção.

**Régua:** `tools/eval/vmlab-hud-check.mjs` (`npm run eval:vmlabhud`). Mede o método de
produção em três estados de loadout e exige que `vmlab=0` continue sem o menu. Mutação:
`--mutante=semflag` reintroduz a ausência sob `vmlab=1` e tem que deixar a cláusula HUD2
vermelha.

**Correção.** O host `#weapon-hud` foi promovido para `src/pages/index.astro` e o método
`_updateWeaponHud()` passou a desenhar, no HUD real, os slots presentes no loadout vivo:
primária, secundária, faca, fumaça e frag. O caminho é estritamente experimental: sem
`?vmlab=1`, o elemento permanece escondido e vazio. A régua também entrou em
`check:deploy`, para que a Vercel não possa publicar novamente um artefato sem esse HUD.

**Antes/depois medido.** Antes da correção: **0/4** cláusulas verdes e nenhum host no
artefato publicado. Depois: **4/4** — slots `1,2,3,4,5` no loadout completo, `1,2,3` sem
granadas, exatamente um slot ativo e menu vazio/escondido sem a flag. A mutação
`--mutante=semflag` derruba HUD2 e HUD3, provando que a régua morde.

**Visual real do build.** Em `1536×1024` (3:2), o painel mediu `270×194 px` em
`x=1218, y=662`; em `1280×720` (16:9), mediu `270×194 px` em `x=962, y=358`, com
**0 px de sobreposição** sobre o bloco de munição. Os cinco slots, ícones, munição e faixa
ativa ficaram legíveis nas duas proporções.

**Crédito/proveniência.** A direção visual vem do protótipo de Emerson Garrido no #131
(commits `78cf645`, `76f730d` e `10270bd`). A correção preserva esse crédito no commit e
no PR; ela promove apenas o menu de armas, sem trazer de volta o pacote inteiro do #131.

### ~~BUG-34 · O botão JOGAR estava INERTE em produção — o jogo não abria~~ · RESOLVIDO 07/08

**Como apareceu.** Não foi reportado: caiu no colo enquanto se media outra coisa. A régua das
bandeiras imprimiu, antes do resultado, uma linha de `pageerror` que não tinha nada a ver com
bandeira: `Cannot access 'testMode' before initialization`.

**Causa raiz.** `public/js/main.js` chamava `_pingPresenca()` **no escopo do módulo** na linha
483, e a função lê `testMode` na primeira linha — `const` declarado só na 498. `const` não é
hoisted como `var`, então a chamada lança `ReferenceError` **na avaliação do módulo**: tudo
depois da linha 483 nunca acontece, inclusive o `onclick` do `#btn-jogar` (linha ~779).

**Medido no navegador, contra `https://www.csbrasil.online`:**

| | antes | depois |
|---|---|---|
| `pageerror` no boot da rota `/` | 1 | 0 |
| `#btn-jogar` existe | sim | sim |
| `onclick` do JOGAR ligado | **não** | sim |

**Por que TODO quality gate desta casa passou verde com o jogo morto** — e esta é a parte que vale
guardar:

| quality gate | por que não viu |
|---|---|
| `npm run syntax` | TDZ é erro de **runtime**; o módulo parseia perfeitamente |
| `eval:site` | mede status HTTP e JSON-LD; a `/` respondia **200** com o HTML inteiro |
| `harness.mjs` | importa `game.js` **direto** — nunca passa por `main.js` |
| capturas visuais | usam `/?debug=1&auto=1` ou importam módulos soltos |
| `npm run build` | compila o site; não executa a página |

Faltava a pergunta mais boba da lista — *o `main.js` terminou de avaliar?* — e é sempre a mais
boba que fica sem régua.

**Régua nova:** `tools/eval/boot-check.mjs` (`npm run eval:boot`). B1 exige zero `pageerror`;
B2 exige o `onclick` do JOGAR, que mede o **efeito** e não a ausência de erro (um `catch` de
terceiro engoliria B1 com o jogo morto do mesmo jeito). Mutação executada: `--mutante=tdz`,
que injeta a leitura antecipada no `main.js` servido e devolve `B1 FALHA · B2 FALHA`, exit 1.
**Exige browser**, então fica fora do `check` (que roda sem browser) — é passo obrigatório
antes de deploy.

**Não verificado:** por quanto tempo ficou assim em produção. O `_pingPresenca()` está no
`HEAD` publicado; datar isso pede `git log -S` no bloco e cruzar com o deploy, e não foi feito.

### ~~BUG-33 · "o time é quando captura bandeira não pinta de vermelho e nem põe o brasão"~~ · RESOLVIDO 07/08

**Sintoma (palavras do dono):** *"OUTRO BUG O TIME E QUANDO CAPTURA BANDEIRA NAO PINTA DE
VERMELHO E NEM POE O BRASAO"*.

**Causa raiz — uma linha, dois sintomas.** O rename **Time E** (06/08) trocou a letra da
facção do jogador de `P` para `E` no dicionário `BRASAO` de `public/js/brasoes.js` e no
arquivo em disco (`img/brasoes/p.png` → `e.png`), e **não trocou na linha de cima**:

```js
const COR_TIME = { P: '#ff5555', ... };   // ← ficou em P
...
if (!cor || !BRASAO[fac]) return null;    // brasoes.js:126 — sai por !cor
```

Com `COR_TIME['E']` indefinido, `bandeiraTextura('E')` devolvia `null` na primeira linha, o
`_flagTexFor` caía no pano procedural (`public/js/game.js:3705-3707`) e a bandeira do time do
jogador ficava **sem cor e sem brasão ao mesmo tempo** — que é exatamente como o defeito foi
descrito. Nada disso emite erro no console: `null` é retorno previsto pelo contrato do módulo.

**O mesmo rename passou batido em mais dois espelhos**, cada um com sintoma próprio e igualmente
silencioso, achados pela régua e corrigidos no mesmo commit:

| Espelho | Sintoma | Por que não dá erro |
|---|---|---|
| `TEAM_RIM` (`characters.js`) | contorno **branco** nos 8 do elenco E, e nos 9 palhaços | `TEAM_RIM[t] \|\| 0xffffff` |
| faixa do peito (`characters.js`) | braçadeira **azul** (a de Tribos Urbanas) no time E e nos palhaços | o `else` do ternário |

**Medido** (`node tools/eval/faccao-paleta-check.mjs`):

| | antes | depois |
|---|---|---|
| espelhos de paleta cobrindo as 5 facções | 0 de 3 | 3 de 3 |
| facções faltando em `COR_TIME` / `TEAM_RIM` / faixa | `E` / `C,E` / `C,E` | nenhuma |
| `COR_TIME` × `_teamColor` (game.js) | `E` DIVERGE | 5 de 5 ok |

**Por que a régua que já existia não pegou.** O C3 do `tools/eval/brasao-check.mjs` compara
essas duas paletas e teria acusado — mas (a) ele exige Playwright, Chrome e servidor no ar, e
por isso não está no `check:fast`, e (b) ele tinha cegueira própria: o regex que extrai a
paleta do `game.js` era `f === '([PBUCF])'`, **lista de letras escrita à mão dentro de um
regex**, que deixou de casar a facção do jogador no dia do rename. Corrigido para `[A-Z]`.

**Régua nova:** `tools/eval/faccao-paleta-check.mjs` (`npm run eval:faccao`, node puro, no
`check:fast` **antes** do `anims:check` para não nascer atrás de um `&&` vermelho).
Mutações executadas: `--mutar=sem-e` (F1 e F2 vermelhas) e `--mutar=cor-errada` (F2 vermelha).

**Custo declarado.** Os palhaços ganharam contorno e braçadeira rosa que **nunca tiveram** —
é a cor deles em `_teamColor`, mas é mudança visual que ninguém pediu e que aparece na tela de
seleção. Se a intenção era palhaço sem cor de time, é reverter os dois `C` e declarar isso na
régua. **Não verificado em partida:** a correção foi medida no fonte, não capturada no
navegador — falta print do pano vermelho com brasão in-game.

### ~~BUG-21 · Parede invisível a 2,3 m do ônibus (Brasília)~~ · RESOLVIDO 05/08 (2ª rodada)

**Sintoma (do dono, com print):** *"o mapa não deixa eu andar perto do ônibus"*.

**Causa raiz.** O ônibus está girado **0,55 rad (31,5°)**. O occluder respeita a rotação
(`bx.rotation.y`), mas `col()` empurra `{minX,maxX,minY,maxY,minZ,maxZ}` e **o motor não tem
collider rotacionado em lugar nenhum** — nem `_collide`, nem o A* dos bots. A caixa única de
9,0 × 5,2 alinhada aos eixos é o retângulo girado achatado: sobra nas quinas, falta nas
laterais.

**Medido** (planta, amostragem de 2 cm):

| | antes | depois |
|---|---|---|
| bloqueio onde não há ônibus | 12,9 m² | 9,3 m² |
| **parede invisível mais distante da lataria** | **2,33 m** | **0,68 m** |
| ônibus **sem** colisão (dava pra entrar pelas quinas) | 7,6 m² | **0 m²** |

**Correção:** decompor o retângulo girado numa grade 6×3 no espaço local do ônibus e empurrar
a AABB exata de cada célula — uma escada de 18 caixas seguindo a diagonal. 0,68 m já é menor
que o raio do jogador (0,38 m) mais o passo.

**E VOLTOU A INCOMODAR — 05/08.** Palavras do dono: *"o box do ônibus não deixa você andar
perto e é como se fosse um quadrado, mas o ônibus está em diagonal. devia ser possível andar"*.
0,68 m é meio passo de parede fantasma, e meio passo se sente.

**CORREÇÃO DEFINITIVA: COLLIDER COM ROTAÇÃO NO MOTOR.** `game.js/_collideRot` testa no espaço
local do prop; o colisor leva a AABB conservadora do mundo (rejeição barata + todo consumidor
antigo continua válido) MAIS `ry/cx/cz/hx/hz/cos/sin`. Colisor sem `ry` não paga nada — o
caminho girado é um RAMO, não o caso geral.

| | 1ª rodada (18 AABBs) | agora (1 OBB) |
|---|---|---|
| parede fantasma ALÉM do raio do corpo | 2,033 m | **0,000 m** |
| lataria sem colisão | 9,08 m² | **0,00 m²** |
| colisores do ônibus | 18 | **1** |
| `_collide` (awp_map, 400 k chamadas) | 238 ns | 287 ns (+49 ns; mapa sem prop girado: sem custo) |

O mesmo conserto vale para `addBox({ry})` (era o QUADRADO circunscrito, `max(w,d)/2` nos dois
eixos) e para `putBuilding` de GLB girado (era `Box3.setFromObject` do prédio JÁ GIRADO): urna,
towner, drinkstand e as caixas da praça ganharam de graça.

**Régua: `tools/eval/obb-check.mjs`** — não confere declaração, ela ANDA: grade de 5 cm com o
`_collide` DE PRODUÇÃO e compara com a caixa real do prop. Tem inventário declarado (sem ele,
apagar o `ry` deixaria a régua verde por vacuidade) e 2 mutações medidas: `--mutante=aabb`
acende com 2,033 m de parede fantasma, `--mutante=semry` acende no inventário.

**3ª RODADA — 05/08: "ainda tem problemas com o box do ônibus e barracas", com o obb-check
VERDE.** O dono estava certo de novo, e o furo era da RÉGUA: o obb-check compara o `_collide`
com a **caixa declarada** — ele não enxerga caixa declarada mais gorda que a malha visível. E
todos esses colisores nasciam do `Box3` do **GLB inteiro, em toda altura**: guarda-sol,
telhado de barraquinha, saia de lona e retrovisor contavam como parede na altura do peito.
Medido por vértice (faixa de colisão y 0,25–2,05 m, percentil 1–99 ponderado por área):

| prop | caixa (Box3 cheio) | corpo tocável na faixa | parede fantasma |
|---|---|---|---|
| ônibus | 9,26 × 4,48 m | **8,85 × 4,21 m** | retrovisor + aba do teto |
| tenda (×12) | 3,14 × 3,14 m | **2,06 × 2,22 m** | ~0,5 m de lona/quina por lado |
| barraquinha (×4) | 2,44 × 2,12 m | **2,29 × 1,15 m** | o TELHADO dobrava a profundidade |
| drinkstand | 2,86 × 3,06 m | **2,28 × 2,52 m** | o guarda-sol |

**Correção:** tabela `PEGADA_CORPO` (frações medidas do box local) aplicada no colisor do
`putBuilding` + colRot do ônibus com `PEGADA_BUS` (map_brasilia.js). Urna e towner foram
medidos e ficaram como estão (caixa ≈ corpo). **Régua nova: `npm run eval:pegada`**
(`tools/eval/pegada-check.mjs`, no `check:fast`) — recomputa a pegada dos GLBs e acusa
deriva da tabela; mutação de +0,17 numa fração acende. `botsim 60 awp_map` depois do
conserto: stuck 1,57 %, eff 0,246 — sem regressão de rota.

**4ª RODADA — 06/08: "um problemão esta acontecendo no jogo no mapa brasilia o box do
onibus esta protegendo um espaco que devia ser vazio e esta pegando tiros"** (com print:
fumaça de impacto no AR, na frente do ônibus). Desta vez o defeito era **a bala**, não o
andar — e tanto o colisor de andar quanto o occluder de bala estavam errados do mesmo
jeito.

**Causa raiz.** O GLB do ônibus (Mint) é **torto dentro da própria caixa**: o corpo sai a
**-18,7° do eixo x do arquivo** (PCA dos triângulos da faixa 0,25–2,05 m, ponderado por
área). Tudo que derivava da caixa — a pegada da 3ª rodada inclusa — ficava ~20° fora da
lataria: parede fantasma de **3,77 m** na ponta sudoeste (medido por raycast no browser,
sonda de 32 direções × 4 alturas) e lataria descoberta na nordeste. Só apareceu pra bala
porque o jogador atravessa o mapa atirando, não abraçando o ônibus.

**Correção.** `PEGADA_BUS = { hx: 4.6, hz: 1.0, ryCorr: 0.3263 }` — o corpo medido no eixo
principal (9,2 × 2,0 m) e o delta de ângulo sobre o ry de placement. Occluder e `colRot`
passam a seguir o eixo DO CORPO (`map_brasilia.js`).

**Medido (mesma sonda, antes × depois):**

| | antes | depois |
|---|---|---|
| pior parede fantasma (bala) | **3,77 m** | **1,24 m** (só na linha do teto; na altura do corpo ≤ 0,56 m, típica ≤ 0,35) |
| lataria FURADA (bala atravessa metal visível) | 0 raios | **0 raios** (mantido) |
| residual declarado | — | faixa de vidro (janelas abertas do modelo) e a aba do teto: a caixa é sólida ali, é o "vidro não-quebrável" do CS 1.6 |

**Réguas:** `eval:pegada` agora recomputa o OBB por PCA (θ, hx, hz) — mutação de +0,1 rad
no `ryCorr` acende (medido: dθ 0,1000 VERMELHA). `obb-check` tinha o ry **0,55 grampeado
no inventário** e foi atualizado para 0,8763 (= 0,55 + 0,3263) — não é afrouxar teto, é o
inventário cobrar o colisor no eixo do corpo. `botsim 60 awp_map`: stuck 1,39 % (era
1,57 % na 3ª rodada) — o colisor mais estreito abriu o passeio em volta do ônibus.
`check:fast` sai 0.

**5ª RODADA — ainda 06/08, mesmo defeito nos outros props:** *"alguns objetos voce atira
e ele faz bala em volta ou no meio do objeto quando devia ser aberto"* (prints: fumaça de
impacto no ar ao lado da barraca verde e em cima do drinkstand). A caixa-occluder da AABB
inteira solidificava o que é ABERTO: o vão debaixo do toldo da barraquinha, o ar sob o
guarda-sol do drinkstand e a margem das estacas da barraca.

**Medido no browser (sonda de raios por prop):** a bala morria **0,94 m antes da lona**
da barraca e **1,89 m antes** da malha do drinkstand. A correção não foi afinar caixa —
foi aposentar a caixa nesses props: `putBuilding(..., occ: 'mesh')` registra a **malha
real** como alvo (o `occMesh` que o Panteão já usava), e a bala para no tecido e atravessa
o vão, como o olho promete. Aplicado em `tent` (×12), `stall` (×4), `drinkstand` e `tires`
(×8 — a AABB da pilha de pneus é bloco cheio e a pilha é piramidal; as quinas de cima
comiam tiro). **Depois: 0 raios mortos em proxy invisível** em 684 raios de teste; MAP4
inalterada (0 occluder sem malha); nada muda em node (lá nenhum GLB carrega, e nenhum
proxy existia nesses props mesmo).

### ~~BUG-22 · Não dá para andar debaixo da escada (Havan)~~ · RESOLVIDO 04/08 (metade do jogador)

**Correção: chão multinível no motor.** `groundHeightAt(x, z)` virou
`groundHeightAt(x, z, yRef)` — o mapa passou a responder *"qual superfície é o chão de quem
está nesse Y"* em vez de "a de cima, sempre". Sem `yRef` devolve o topo, que é o
comportamento antigo: nenhuma régua e nenhum chamador que ainda não passa o Y mudou.

**Pé-direito faz parte da regra** (`ALTURA_LIVRE = 1,95 m`): só abre a camada de baixo onde
cabe gente em pé. Medido na escada da Havan:

| altura da escada no ponto | jogador em y=0 | jogador em y=3,4 |
|---|---|---|
| 3,40 m · 2,98 m · 2,46 m · 1,96 m | **passa por baixo (chão 0)** | desce pela escada |
| 1,45 m · 0,77 m · 0,09 m | sobe a escada (não cabe embaixo) | desce pela escada |

Sem o pé-direito o jogador entraria embaixo do primeiro degrau — 17 cm de vão — com a cabeça
dentro da geometria.

### ~~BUG-22 (2ª rodada) · "continua impossível passar por baixo da escada"~~ · RESOLVIDO 05/08

O dono jogou de novo e reprovou, com o teste numérico VERDE. Ele estava certo, e **não era
nenhum dos quatro suspeitos**: não era colisor (o contrapiso mora em y 3,28-3,40 e o
`_collide` não morde quem anda em y=0), não era o `yRef` faltando (o `_updatePlayer` passa nos
três lugares), não era o step-up. **Era a PEGADA.**

Reproduzido andando com o `_updatePlayer` DE VERDADE (harness, não fórmula): o único acesso ao
vão da escada é POR BAIXO DO MEZANINO — e a pegada do mezanino não tinha camada nenhuma.
`groundHeightAt` devolvia 3,40 para todo mundo dentro de (x −14..14, z −41,4..−31), inclusive
para quem anda no piso da loja em y=0. O bolsão que a 1ª rodada abriu era **um quarto lacrado**,
e havia uma parede invisível de **28 m de largura** na linha z = −31, cortando a loja em duas.

| medido no harness | antes | depois |
|---|---|---|
| piso de loja sob a laje, inalcançável | **294,0 m²** | 0 m² |
| gôndolas (colisores y 0-1,80) desenhadas nesse piso | 18, nunca alcançadas | alcançáveis |
| vão sob as 2 escadas, aberto e **sem entrada** | 16,3 m² | com entrada |
| colunas de entrada que atravessam z = −31 (x −13..13) | 0 de 27 | **26 de 27** (a 27ª é o pilar em x=9) |

Andando de verdade: sob a laje → vão da escada, o corpo entra e para em z = −28,39, que é
exatamente onde o pé-direito da escada cai abaixo de ALTURA_LIVRE. Capturado no navegador
(`havan_sob_escada.png`): o jogador embaixo dos degraus, olhando o espelho por baixo.

**OS BOTS FICAM NA CAMADA DE CIMA, DE PROPÓSITO, E O PREÇO ESTÁ MEDIDO.** O `yRef` do snap de
chão do bot (`game.js`) foi retirado. Com ele o bot desce pro piso sob a laje sem plano nenhum,
porque o A* é grafo de `(x, z)` SEM CAMADA — o nó de baixo e o de cima são o mesmo ponto:

| `botsim 60 fy_havan` | latFlips | fwdFlips | stuck | eff |
|---|---|---|---|---|
| bot COM camada | 13,88 | 6,58 | **8,98 %** | 0,241 |
| bot SEM camada | 11,10 | 7,23 | **1,73 %** | 0,226 |

5× mais bot travado é regressão que o dono vê; o jogador não perde nada, porque quem usa o vão
é ele. **Grafo com camada continua sendo a segunda metade desta frente** — e é exatamente o que
falta para devolver o `yRef` ao bot.

<details><summary>Diagnóstico original, mantido porque explica por que não era collider</summary>

**Sintoma (do dono):** *"não dá pra andar debaixo das escadas do respawn da loja, de dentro"*.

**Causa raiz.** A escada **não tem collider**: os degraus são `addBox(..., { collide: false })`
e a subida é feita por `groundHeightAt(x, z)` (`map_havan.js:1507`), que devolve a altura da
rampa para todo o retângulo `RAMP`. E aí está o problema: `groundHeightAt` é um **heightfield
escalar — um único Y por (x, z)**. Não existe "embaixo" para o motor: dentro daquela pegada, o
chão *é* a escada, na altura da escada.

Visualmente, porém, os degraus são caixas finas (0,06 m) com espelho, então **o vão embaixo é
visível** — o jogador vê espaço, anda até lá e é levado pro topo da rampa. Ver espaço e não
poder usar é pior que não ter espaço.

**Duas saídas, e a escolha é de design:**
- **Fechar o vão** (saia sólida sob a escada). É o padrão da era CS — escada é bloco maciço.
  Barato, honesto, e o mapa deixa de prometer o que não entrega. **Mas você perde o espaço.**
- **Chão multinível no motor** (`groundHeightAt` devolvendo camadas, com o A* ciente delas).
  É o que dá o "embaixo da escada" de verdade, e destrava mezanino, ponte e viaduto em todos
  os mapas. É mudança estrutural e mexe no pathfinding.

</details>

### ~~BUG-27 · "grafite ainda em estrutura que não é parede"~~ · RESOLVIDO 05/08

**Sintoma (do dono, 2ª reprovação):** com o `decal-probe` dizendo **"0 sem parede atrás"** nos
5 mapas, ele continuou vendo peça em lugar errado.

**Causa raiz — a régua media contra a LISTA ERRADA DE SÓLIDOS.** `paredeAtras` recebia
`colliders` (e, na Brasília, `caixaDeBox3` da bounding box do GLB). Caixa DECLARADA mente, e
mente exatamente onde o jogador olha. Medido no navegador, contra a MALHA desenhada:

| mapa | peças | sem malha atrás | tapadas (sólido a <25 cm NA FRENTE) |
|---|---|---|---|
| **awp_map** | 16 | **16** | 0 |
| **fy_quebrada** | 47 | **22** | **8** |
| fy_pool_day · fy_havan · fy_ferrovelho | 103 | 0 | 0 |

As 16 da Brasília estavam **no ar**: o ministério é um GLB sobre PILOTIS, o térreo é vazado, e
a caixa do prédio inteiro conta o vão aberto como parede. Capturado: dá para ver o gramado
através da peça (`scratchpad/shots/awp_map_01_25de25_*.png`). A única malha perto delas é
`Pilotis_Glass_Ministry_1` — **vidro**, que a docstring da régua já admitia não saber rejeitar.
As 8 da Quebrada nasciam do lado de dentro da parede: existem, são desenhadas, ninguém vê.

**Correção — o critério passou a ser a MALHA QUE O JOGADOR VÊ.** `paredeAtras` aceita
`Object3D` no lugar de caixa e mede com raycast na geometria desenhada, com três cláusulas:
(1) os 25 raios atrás batem em malha **visível e opaca** dentro do alcance — caixa-occluder de
bala (`material.visible = false`) e vidro/água deixam de contar; (2) nada nos **25 cm à
frente**; (3) profundidade dos 25 acertos varia no máximo 25 cm (é UM plano). Os 5 mapas passam
`[root]`. O caminho antigo de caixas continua para quem não tem malha própria (as folhas
giradas do quality gate do Ferro Velho).

| | antes | depois |
|---|---|---|
| awp_map | 16 (16 erradas) | **0** — o mapa não tem parede cega na altura do olho |
| fy_quebrada | 47 (30 erradas) | **11** (0 erradas) |
| fy_pool_day | 72 (0 erradas) | **117** (0 erradas — ver BUG-28) |
| fy_havan · fy_ferrovelho | 31 (0 erradas) | 31 (0 erradas) |

Que pool_day e havan não percam **uma** peça é a prova de que o critério novo não é só mais
apertado: ele reprova o que estava errado e aprova o que estava certo.

**Fica aberto (não é meu arquivo):** das 47 da Quebrada, 17 passariam no critério novo mas só
11 nascem — as outras 6 são reprovadas porque o `decal()` roda ANTES de a parede delas existir.
É o mesmo defeito de ordem que o pool_day já resolveu adiando para `pintaCobertura()`. Uma
linha em `map_quebrada.js` devolve as 6.

### BUG-28 · O harness headless faz raycast de occluder NA ORIGEM

**Medido:** ao fim do build do `fy_pool_day`, **92 dos 92 occluders** estão com `matrixWorld`
DESATUALIZADA (identidade). No navegador isso nunca aparece, porque `WebGLRenderer.render()`
chama `scene.updateMatrixWorld()` todo quadro; no `botsim`/`harness` **não há renderer**, e
ninguém atualiza. Ou seja: a LOS dos bots na régua headless mira caixas empilhadas na origem.

Foi assim que se descobriu: o critério novo de decalque faz raycast na malha durante o build e,
de quebra, atualiza 78 dessas 92 matrizes — e o `botsim` do Piscinão mudou (latFlips 15,92 →
13,04, fwdFlips 13,98 → 10,26, stuck 1,62 → 2,96, eff 0,120 → 0,161) **com os mesmos 72
decalques, conferidos peça a peça, e com mundo idêntico** (92 colisores, 92 occluders, 22
pickups, 371 malhas, 11.460 triângulos, mesma soma de colisores, mesmos spawns de bot).

**Consequência:** toda métrica de bot que dependa de linha de visão no headless está medida
contra geometria na origem. **Correção:** `scene.updateMatrixWorld(true)` depois do build, em
`harness.mjs/bootGame` e no stub do `botsim.mjs`. Não foi feito aqui de propósito — `botsim.mjs`
é o baseline determinístico desta rodada e mexer nele no meio de um A/B é o erro clássico.

**Segundo efeito do mesmo tipo, também medido:** dentro de um `botsim ... all` os mapas
compartilham o cursor do `Math.random` através do cache preguiçoso de texturas (`T.decals[i]`
gera na primeira leitura e memoiza). Pool_day passou a usar 24 arquivos em vez de 16, e o
`fy_ferrovelho` — que **não foi tocado** — se moveu 0,2 no `all`. Rodado sozinho ele é
**byte a byte idêntico** antes e depois (13,811 · 8,544 · 1,056 · 0,227). Comparação de
`botsim all` só vale como sequência inteira.

### BUG-05 · A UI não bate com as telas de referência (`references/telas/`) — PARCIALMENTE FECHADO

Nove telas de referência medidas em `tools/eval/ref_ui.json`. Dois desvios sistemáticos, ambos
medidos:

- **Cor — FECHADO.** `--bg-900/800/700` eram azuis (h ≈ 253°) contra o marrom-neutro medido
  (h 84-129°). O que travava era o literal: **79 ocorrências de `rgba(5,8,11,…)` no CSS, nenhuma
  via token**. Consertado na causa — o token virou DERIVADO de `--bg-900-rgb` e todo scrim
  consome `rgba(var(--bg-900-rgb),α)`, então token e literal não podem mais divergir. Medido
  depois: o fundo do jogo saiu de h 260,7° para **h 81,0°** e o painel ficou em
  `#3c372f` L\* 23,2 · C\* 5,4 · h 85,1 contra `#38342e` L\* 22,0 · C\* 4,3 · h 85,5 da
  referência. Virou invariante na **UI5** (cláusula `b* >= 0`, com a mutação `ui5_fundo_azul`).
- **Escala — MARGENS FECHADAS, TIPOGRAFIA PARCIAL.** As margens do HUD saíram de 1,17% / 0,98%
  para **4,49% / 2,73%** (referência 4,69% / 7,03%) — trilho esquerdo de 68 px, direito de 48 px,
  topo/base de 36 px em 1536×1024. A tipografia subiu os três degraus de título
  (fs-700/800/900 = 40/56/76 px) e a razão título/corpo foi de 1,80-2,20 para 2,20-3,00 contra
  3,33-5,00 da referência.

**O QUE FICA ABERTO, e por quê:**

1. **A razão título/corpo não fechou.** Falta ~35%. Subir mais em px cria o problema oposto em
   tela baixa: a referência é uma FRAÇÃO da altura e o jogo é PX FIXO, então a proporção só bate
   numa resolução. A correção certa é escala fluida (`clamp()`/`vh`), e ela **estava bloqueada
   pela régua**: `caixaDe()` lia `font-size` com `parseFloat`, e com `vh`/`clamp()` a UI3 media
   caixa de 3,9 px e ficava **cega**.

   **RÉGUA DESBLOQUEADA (29/08, branch `fix/ui-check-clamp`).** `resolvePx()`
   (`tools/eval/ui-check.mjs`, ao lado de `caixaDe()`) agora resolve `clamp()/min()/max()/calc()`
   e `vh/vw/rem/em` de forma determinística contra o viewport de medição da própria régua
   (VW×VH = 1008×655; rem = 16 px, o `<html>` não declara `font-size`). Declarado-e-não-resolvível
   virou VERMELHO (cláusula `fsCego` — "não sei medir" custa o mesmo que estar errado), e 7
   `PROBAS_PX` na UI3 conferem o resolvedor a cada execução. **Mutação:**
   `node tools/eval/ui-check.mjs ui3 --mutante=cego-a-clamp` restaura o parseFloat puro e acende
   as 7 PROBAS_PX — e só elas (o CSS do HUD hoje é 100% px, então nenhum veredito de elemento
   muda; exit 1 com a mensagem certa). Com a régua nova e o CSS atual, a razão título/corpo medida
   segue **40/13 ≈ 3,08** (fs-700/fs-200, mesmos px de antes — a régua nova é no-op de veredito
   sobre CSS em px, como deve ser num PR de régua) contra **3,33-5,00** da referência: a dívida de
   ~35% está intacta e agora DESTRAVADA pra escala fluida.

   **Vermelho pré-existente encontrado nesta rodada (não é deste PR, registrado pra não se
   perder):** `npm run eval:ui` já estava vermelho na `main` por dois motivos alheios ao clamp —
   (a) **UI4**: o jogo passou a usar `roundKills.E/B` e `killsToWin = Infinity` por padrão
   (`?pace=1` devolve o alvo, game.js:742), e a régua ainda lê `roundKills.P` e cobra alvo finito
   no ABATE — 4 casos DM reprovam com `alvoDeclarado=NENHUM / maiorPlacarDeRodada=NaN`;
   (b) **UI1**: 10 itens abaixo do mínimo — `#hud-shortcuts` (1,96:1), cabeçalho/rodapé do
   `#scoreboard` novo (1,5-3,84:1), `#rounds-row` (3,84:1) e uma linha de killfeed (4,3:1).
   O `eval:ui` não é passo do `check:fast`, então esse vermelho não derrubava o gate.
2. **`corpoFracMediana` (o -20% do menor corpo) não foi perseguido de propósito.** O piso de
   11 px está documentado como "legível em 1280×720" e o desvio repousa numa banda que o próprio
   `ref-ui.py` admite medir com ±12% de erro a 512 px (docstring). Encolher legibilidade por
   ruído de instrumento seria o inverso da regra da casa.
3. **`margens.baseFrac` da tela 05 continua medindo 0,0000.** Não é o CSS (a base do HUD está em
   36 px = 3,5%): é o instrumento — `margens()` conta tinta de contraste alto, e o **viewmodel**
   encosta na borda inferior. Medir margem de HUD sobre uma tela com arma exige máscara.

**Verificação exige browser** (`#btn-jogar` é sticky, `.cs-setup` tem largura fixa — mudar
tipografia sem olhar overflow já quebrou tela antes). As 9 telas foram capturadas em
Chrome headless a 1536×1024 (3:2, o enquadramento do dono) e medidas com o mesmo `ref-ui.py`
apontado para as capturas.

### ~~BUG-06 · Alvo de capturas do CTF não deriva do número de bandeiras~~ · RESOLVIDO 05/08

**Sintoma (palavras do dono, jogando):** *"no capture the flag na loja H está com 3 capturas
quando a vitória tem que ser as 4. tem que ser todas sempre."*

**A entrada anterior classificava isto como LATENTE, e a classificação estava errada — pela
REGRA, não pela conta.** O diagnóstico de 05/08 dizia: os 3 mapas com `ctfMode` têm 4
bandeiras cada, `Math.floor(4 / 2) + 1 = 3` = `CTF_CAPS_TO_WIN`, logo a correção proposta é
no-op e "régua escrita hoje fica verde dos dois lados". A aritmética estava certa. O que
estava errado era a **regra proposta**: maioria (`floor(n/2)+1`) nunca foi o que o modo tem
que fazer. O dono definiu a regra em uma frase — **todas as bandeiras, sempre** — e com ela o
defeito deixa de ser latente e passa a ser exatamente o que ele viu: **a rodada fechando em
3 de 4**, com uma bandeira inteira do mapa fora da condição de vitória. É a lei 1 da casa
vista de outro ângulo: quando o dono diz que está errado, o defeito é do quality gate — aqui, da
regra que o quality gate ia codificar.

**Medido antes do conserto** (`tools/eval/ctf-win-check.mjs`, os 5 mapas):

| mapa | bandeiras | alvo (antes) | rodada fechava na | alvo (depois) |
|---|---:|---:|---:|---:|
| `awp_map` | 3 (layout padrão) | 3 | 3ª | 3 |
| `fy_pool_day` | 3 (layout padrão) | 3 | 3ª | 3 |
| **`fy_havan`** | **4** | **3** | **3ª** | **4** |
| **`fy_ferrovelho`** | **4** | **3** | **3ª** | **4** |
| **`fy_quebrada`** | **4** | **3** | **3ª** | **4** |

**Cuidado com o histórico, e ele foi conferido:** a condição de vitória do CAPTURA já morou
dentro do `_checkPace()`, atrás do gate `?pace=1`, e com `PACE` desligado a rodada nunca
fechava (BUG-29). O caminho consertado aqui é o que roda **hoje**: `_checkCtfAlvo()`, chamado
sem gate a partir do `_updatePlayer` (`game.js:4636`), e a cláusula CTF-W2 **anda o motor**
injetando captura por captura para descobrir em qual delas o estado sai de `live` — ela não
lê declaração nenhuma.

**Correção:** o alvo saiu da constante e passou a ser derivado onde as bandeiras existem —
`this.capsToWin = this.ctfPts.length` no fim do `_initCTF()`, que roda dentro do
`_startRound()` **antes** do banner que anuncia o alvo ao jogador. `CTF_CAPS_TO_WIN = 3`
sobrou como fallback do layout padrão (mapa que não declara `world.ctfPoints`, que tem 3
bandeiras) e está marcado como tal no código. Um mapa novo com 5 bandeiras passa a exigir 5
sem tocar em constante nenhuma. **Dominação continua vitória imediata** (`_ctfWin`), como
pedido na entrada original.

**A `UI4` não precisou de ajuste** (a entrada antiga previa que sim): `tools/eval/ui-check.mjs:831`
já lê `g.capsToWin` do objeto vivo — nunca teve o 3 escrito à mão.

**Régua: `tools/eval/ctf-win-check.mjs`** (`npm run eval:ctfwin`, no `check:fast`).
3 cláusulas, 2 mutações medidas: `--mutante=constante` devolve o defeito exato do dono
(alvo 3 nos mapas de 4, rodada fechando na 3ª — **7 cláusulas vermelhas**) e
`--mutante=menos1` (alvo = bandeiras − 1) acende **10**, provando que a CTF-W2 mede o fecho
no motor e não a declaração. A CTF-W3 lê o fonte e reprova se o alvo voltar a ser constante.

**Verificado NO NAVEGADOR** (Playwright, `fy_havan` em CTF, jogando do lado da loja, com o
renderer encolhido para 32×32 porque o que está sob julgamento é a lógica e o swiftshader
gasta ~1 s por quadro desenhando a Havan). O HUD escreve `RODADA 1/3 · BANDEIRAS (ALVO 4)`
e lista as quatro, e a rodada:

```
PÁTIO O  -> capturas 3/4 · donos "BPBB" · state=live       <- ANTES fechava AQUI
PÁTIO L  -> capturas 4/4 · donos "BBBB" · state=roundEnd    <- fecha na 4ª, com o placar 0 × 1
```

**Custo declarado, medido:** a rodada de captura ficou mais longa nos mapas de 4 bandeiras —
`ctf-round-check.mjs` (`fy_ferrovelho`, semente 4242) mede o 1º fecho de rodada indo de
**29,1 s → 54,1 s**. É o efeito pretendido (uma bandeira a mais para conquistar) e continua
muito abaixo da rede de segurança de 480 s do `CTF_MATCH_TIME`; o `eval:ctfround` segue
verde.

### ~~BUG-07 · Metade do áudio do repo nunca toca no jogo~~ · RESOLVIDO 04/08 (parcial)

O manifest passou a ser **gerado do disco** por `tools/gen-audio-manifest.mjs`
(`npm run audio`), com `npm run audio:check` no quality gate. A pasta virou a verdade: som novo
na pasta + um comando = som tocando. Ganho medido no mesmo dia:

| | antes | depois |
|---|---|---|
| voz dos **funkeiros** | 0 (usava a dos Tribos) | **40 ingame + 20 round** |
| voz do petista | 11 + 7 | **17 + 14** |
| voz do bolsonaro | 13 + 6 | **16 + 14** |
| capture | 5 | 6 |
| `soundtrack/` | invisível | 30 listadas (falta o player) |

Os 289 caminhos do manifest foram verificados um a um contra o disco: **0 quebrados**. Os
nomes com espaço e parêntese (`…olodum (1).mp3`) agora saem codificados — sem isso o
arquivo existe, o manifest aponta e o som não toca, que é o pior tipo de defeito. Servido
e conferido em `npm run dev` (HTTP 200 no arquivo com parêntese).

**O que continua aberto** está no BUG-19 (chegar em produção) e nos 176 órfãos que sobram:
132 em `weapons/` (variantes `.wav` do pack antigo; a chave `weapons` é curada 1-para-1 de
propósito), 26 em `menu-music/` (entram por `MENU_TRACKS` no código, não pelo manifest) e
**16 em `cc0/`** — sons de arma CC0 com procedência documentada em `cc0/SOURCES.md`,
comprados e nunca ligados. Esses últimos entram sem risco nenhum e ninguém ligou.

<details><summary>Diagnóstico original (04/08), mantido porque explica o desenho</summary>

**Medido em 04/08:** `find public/audio -name '*.mp3'` → **295 arquivos**. Referenciados pelo
`manifest.json` → **136**. O resto é ou som que deveria estar no jogo e não está, ou peso morto
no bundle — e hoje não dá para saber qual é qual olhando o repo.

| Pasta | Em disco | Fora do manifest | O que é |
|---|---|---|---|
| `funkeiros/` | 60 | **60** | facção inteira sem voz própria: a chave `F` aponta para `audio/tribos/…` |
| `soundtrack/` | 30 | **30** | **nenhum código referencia** — nem manifest, nem `grep` em `public/js` |
| `cc0/` | 16 | **16** | **nenhum código referencia** |
| `petista/` | 31 | 13 | manifest defasado |
| `bolsonaro/` | 30 | 12 | manifest defasado |
| `tribos/` | 27 | 1 | ok |
| `palhacos/` | 46 | 0 | **é a referência de como deve ficar** |
| `capture/`, `game/` | 29 | 2 | ok |
| `menu-music/` | 26 | 26 | esperado — entra por `MENU_TRACKS` no código, não pelo manifest |

Três defeitos diferentes escondidos num número só:

1. **Facção sem voz** (funkeiros) — é o mais visível para o jogador: 9 personagens novos
   falando com a voz de outra tribo. Cuidado ao apontar: há `.DS_Store` nas pastas e nomes com
   espaço e parêntese (`…olodum (1).mp3`), então o caminho tem que funcionar **como URL**.
2. **Manifest defasado** (petista, bolsonaro) — som gravado, pago e commitado que nunca toca.
3. **Pastas órfãs** (`soundtrack/`, `cc0/`) — 46 arquivos que nenhuma linha de código menciona.
   Ou entram (trilha in-game é decisão de design, não de bug), ou saem do bundle. Hoje são
   **peso morto que conta contra o teto de 250 MB da CrazyGames**.

</details>

### BUG-08 · Mídia nova na pasta é ignorada em silêncio (música, wallpaper, splash)

Três listas hardcoded em `public/js/main.js`, todas com o mesmo defeito: **o arquivo entra na
pasta e nada acontece, sem erro no console.**

| Lista | Código | Em disco | Ignorado |
|---|---|---|---|
| Wallpaper (`wall-*`) | array de 8 | 9 png | `wall-9.png` |
| Splash (`loading-*`) | array de 5 | 6 png | `loading-6.png` |
| Música de menu | `Array.from({ length: 26 }, …)` | 26 mp3 | nada **hoje** |

Confirmado em 04/08: o dono adicionou `wall-9.png` e `loading-6.png` e **nenhum dos dois
aparecia**. Os dois arrays foram estendidos à mão no mesmo dia (paliativo, com comentário no
código).

*Correção de um número que o handoff anterior trazia errado:* `menu-music/` tem **26** mp3 e o
array tem 26 — a lista está certa **por enquanto**. Ela é a mesma armadilha, só que ainda não
disparou: a 27ª faixa some no dia em que entrar.

**Correção de verdade:** página estática não lista diretório pelo browser, então o caminho é um
**manifesto gerado em build** (`tools/` → `public/img/walls.json`, `public/audio/menu-tracks.json`)
lido com fallback para a lista atual. Aí jogar arquivo na pasta vira um comando, não uma edição
de código — e deixa de depender de alguém lembrar.

### BUG-09 · Bloom global lava os personagens

`public/js/bloom.js:879` — `new UnrealBloomPass(…, 0.25, 0.45, 0.85)` aplicado à cena inteira.
Precisa virar bloom **seletivo por layer**, com kill-switch (`?charbloom=1` volta), **sem**
quebrar o `vmPass` (o viewmodel recebe bloom/AgX de propósito, `bloom.js:872`) nem o caminho
`quality:'low'` / `?bloom=0`, que não tem pós-processamento. Medir o custo: máquina fraca é
requisito do dono.

### ~~BUG-24 · "todos os personagens depois desses também tão ruim na cor e iluminação"~~ · RESOLVIDO 04/08

**Causa raiz — medida, e não era a textura.** O C9 (`char-color.mjs`) já tinha provado que a
diferença ENTRE personagens nasce no GLB (saturação mediana 0,390, mas gotinha 0,031 contra
canarinho 0,689 — spread de 22×) e tinha refutado resolução de textura como explicação. O que
faltava era o que o SHADER faz com essa textura. `characters.js` aplicava o piso de albedo como
um **DEGRAU por texel**: `diffuseColor.rgb *= max(1.0, csAlbMin / csMx)`, com `csAlbMin = 0,09`.

**0,09 é LINEAR — vale sRGB 0,332 = byte 85 = L\* 36.** Não é "levantar o preto": é um **cinza
médio**. Medido nas texturas reais dos 45 GLB (`tools/eval/char-floor.mjs`, C10):

| | % do albedo abaixo do piso | contraste interno perdido |
|---|---|---|
| trapfunk | **94,1 %** | **61 %** |
| palhaço mal | 90,4 % | 33 % |
| oakley | 86,6 % | 46 % |
| emo · punk | 79,2 % | 46 % · 43 % |
| coach | 74,7 % | 43 % |
| black metal | 67,3 % | 45 % |
| **padata · canarinho** | **8,4 % · 8,8 %** | 10 % · 13 % |

Ou seja: o personagem escuro inteiro colapsava num único valor (era isso o "liso, cor chapada,
parece manequim") enquanto o claro não era tocado. **Mediana do elenco: 21 % do contraste
interno comido pelo próprio piso.**

**Correção.** O piso passou a olhar o nível **REGIONAL** do albedo (`textureLod(map, vMapUv, 6)`)
e a multiplicar o texel por esse ganho. O ganho é constante dentro da região, então toda razão
entre texels sobrevive por construção — o piso levanta o NÍVEL sem tocar no contraste — e acima
do piso o ganho é 1,0 exato (personagem claro não muda um pixel). Perda mediana **21 % → 0,2 %**;
pior caso 60,9 % (trapfunk) → 7,5 %. Medido no jogo (`char-shade.mjs`, C11, Havan + Ferro Velho):
contraste interno **+19 % a +41 %** nos escuros, croma **+8 %**, e **padata/canarinho idênticos**.
Preço: os dois mais escuros ficam 4-6 L\* mais escuros — o que na Havan **melhorou** a separação
do C1 (ΔL\* mediano 7,8 → 10,6). Imagem: `tools/eval/char_piso_antes_depois.png`.

Junto foi corrigido o fill do piso de irradiância, que somava **branco** (`irradiance += vec3(csAdd)`)
e desbotava o iluminante na sombra: agora o fill herda a crominância do próprio ambiente com a
**mesma luminância** (`dot(fill*csAdd, LUMA) == csAdd`), então é impossível estourar por causa
dele. No Ferro Velho isso sozinho deu **C\* 7,2 → 7,6 com L\* byte a byte igual**.

**Régua: `tools/eval/char-floor.mjs`** (C10, node+magick, ~40 s), no quality gate como **CHR8**, com o
modo julgado LIDO DO FONTE (devolver o piso ao degrau acende a invariante sozinho) e 2 mutações
medidas (`--mutante=bloco1`, `--mutante=pisozero`), cada uma acendendo a cláusula certa.
Kill-switches: `?charalbreg=0` (volta ao degrau) e `?charambchroma=0` (volta ao fill branco).

### BUG-10 · Elenco: proporção, pés no chão e palma enterrada

Três invariantes vermelhas, todas medidas no GLB, 44/44 personagens:

- **CHR1** — mediana fora da antropometria em 3 índices (cabeça/altura 0,223 vs 0,13;
  cintura/ombro 1,081 vs 0,74; braço/altura 0,278 vs 0,44). "Balão": ancap 1,93×,
  caminhoneiro 1,58×, sindicato 1,56× (+7).
- **CHR3** — pés fora do chão. Era 24 afundando/32 flutuando; depois da tabela e da
  revisão de 30/08 (régua passou a medir o PÉ, não a bbox) restam **2 afundando**,
  ambos por clipe com a raiz oscilando — ver a subseção CHR3 abaixo.
- **CHR4** — 3 personagens com a palma nascendo **dentro** da silhueta do corpo.

A causa de fundo é o re-rig (C1 do handoff): 18 modelos compartilham **um único esqueleto**
(o do `mst`, transplantado por auto-skin), com raio de skin 1,55×–1,97× maior que o normal.
**Não tem conserto em runtime.**

#### O "BALÃO" — CAUSA RAIZ ACHADA E CORRIGIDA (04/08)

Não era proporção, não era `MAX_R` e não era o `raioSkin`. Era a **convenção de segmento**
do auto-skin: `rig-from-donor.mjs` montava o osso como `[junta → PAI]`, e num rig Meshy o
osso aponta pro filho (`LeftArm` = OMBRO, `LeftForeArm` = COTOVELO, `LeftHand` = PUNHO).
Resultado: **todo membro pintado com a junta DISTAL** — a carne do braço obedecendo ao
cotovelo, a da coxa ao joelho. Dobrar uma junta girava o membro inteiro.

Medido por `tools/eval/skin-offbyone.mjs`: **raul 15×0** para o pai, **mandrake 0×17** para
o filho. 17 dos 44 estavam invertidos (8 palhaços + 9 funkeiros).

Duas coisas que a régua antiga dizia e que são **falso positivo**, com número:

- `raioSkin` do C7 — 60% dos vértices caem no `head_end`, uma FOLHA rígida 29,5 cm acima do
  `Head`, e o C7 mede folha como PONTO. Deformação de folha rígida é idêntica à do pai
  (M_f·IBM_f = M_p·L·L⁻¹·IBM_p) e as tracks de `head_end` nos clipes são constantes
  (conferido). Remapear folha→pai leva raul de 0,171 pra 0,074 **sem mover um vértice**.
- `MAX_R` — o sweep 0,22→0,09 já tinha sido refutado, e continua irrelevante.

**Régua que enxerga o defeito:** `tools/eval/pose-inflate.mjs` — LBS na unha com os clipes
reais, esticamento de aresta em razão **simétrica** `max(L/L0, L0/L) − 1`. A primeira versão
usava `|L/L0 − 1|`, que satura em 1,0 no colapso e **premiava malha rasgada** (o jozo
marcava melhor com o tronco aberto num talho). Corrigida antes de valer nota.

Consertado por `tools/reskin-glb.mjs`, que repinta só `JOINTS_0`/`WEIGHTS_0` do GLB pronto
(malha, textura, esqueleto, IBM e clipes intactos) — **custo em disco: ZERO byte**.
Mediana do lote **1,152 → 0,535**; oakley 1,835 → 0,591; raul 1,131 → 0,424.
Referência: mandrake 0,402 (rigado no Mint), mst 0,312 (doador). `raioSkinP50` da família
transplantada: 0,150 → 0,078 (critério era ≤ 0,10). Guarda: **invariante CHR7**, teto zero.

**Continua aberto:** a POSTURA encurvada (o personagem anda dobrado pra frente) é outro
defeito, do retarget de clipe (C2 do handoff), e aparece igual antes e depois do reskin.

#### CHR3 — a régua media casaco, não pé (REVISADO 30/08, branch fix/chr3-pes-no-chao)

**Antes:** `afundando 5` — proerd -0,433 · canarinho -0,367 · ancap -0,140 · esbirro -0,138 ·
dollynho -0,098 (mínimo por personagem, já com a tabela somada). O diagnóstico vigente era
"clipe descendo a raiz inteira, não compensável". Ele estava **errado em 4 dos 5** — medido
quadro a quadro no clipe inteiro (21 amostras), com a junta dominante de cada vértice:

- **proerd/crouch e canarinho/crouch: os pés NUNCA saíram do chão.** Pé a **+0,003** e
  **-0,007** respectivamente, constantes nos 6,7 s do clipe. Quem cruza o chão é o **rabo**,
  skinado em `Hips`: bbox -0,433/-0,367. A régua lia a base da bbox e chamava de "afundando";
  o offset de +43 cm que a leitura sugeriria faria os dois **voarem**. Imagem:
  `scratchpad/shots/chr3_proerd_crouch_antes.png` — pé plantado, rabo atravessando o piso.
- **dollynho/crouch -0,098, ancap/crouch -0,140, esbirro/crouch -0,138: pé enterrado com
  desvio CONSTANTE** (amplitude ≤ 1 mm no clipe inteiro). O clipe desce a raiz um valor fixo;
  o offset constante oposto recoloca o pé no chão em todo quadro, sem criar voo. O teto de
  8 cm do gerador barrava esses três por magnitude — mas quem garante que offset grande não
  vira "boneco voando" é a **constância**, não o tamanho. Entraram na tabela.
- **ancap/walk (-0,052…-0,131), ancap/run (-0,022…-0,109), esbirro/run (-0,037…-0,134):
  raiz OSCILANDO 8-11 cm dentro do ciclo.** Constante nenhuma resolve: pelo pior ponto, a
  fase de apoio ficaria ~9 cm no ar — troca afundar por flutuar e a régua ficaria verde
  mentindo. **Defeito do clipe, exige clipe novo** (mexer no GLB é proibido). Documentados
  em `suspeitos` no `foot-offsets.json`, com a amplitude. Imagem do que restou:
  `scratchpad/shots/chr3_ancap_walk_aberto.png`.

**O que mudou no código:** a sonda (`char-probe.mjs`) mede o vértice mais baixo **entre os
de canela/pé** (`RX_PE` — 44/44 têm 1 skin e as 8 juntas mixamo de perna, conferido) e grava
a faixa `[min,max]` do pé por clipe em `faixaPorPose`; quando a bbox diverge do pé em > 5 cm
grava `corpoPorPose` (é onde o rabo do proerd/canarinho ficou registrado: -0,433/-0,367).
O gerador (`gen-foot-offsets.mjs`) compensa desvio > 8 cm **só com constância comprovada**
(amplitude ≤ 2 cm) e nomeia o resto em `suspeitos`. Runtime (`glbchars.js`) não mudou: a
tabela já era por personagem × clipe.

**Depois:** `afundando 2` [ancap -0,131 (walk), esbirro -0,134 (run)] · flutuando 0.
proerd, canarinho e dollynho **zerados**.

**Mutação (Lei 3):** `offsets.dollynho.crouch = 0` → CHR3 acende `afundando 3` com
`dollynho -0,098`. Re-gerar (`npm run feet`) volta a 2. A prova de que a régua nova não é
afrouxamento é o esbirro/crouch: pé medido a -0,138 com a bbox a -0,143 — o caminho do pé
continua mordendo quem afunda de verdade.

**Antes × depois por personagem** (mínimo efetivo, m): proerd -0,433 → 0,000 ·
canarinho -0,367 → 0,000 · dollynho -0,098 → 0,000 · ancap -0,140 → -0,131 (walk, clipe) ·
esbirro -0,138 → -0,134 (run, clipe). Depois: `chr3_ancap_crouch_depois.png` e
`chr3_esbirro_crouch_depois.png` (boneco erguido, pé na grade — o capuz encosta no HUD).

**Segue aberto:** (1) os 3 clipes de locomoção oscilantes acima; (2) o rabo do
proerd/canarinho cruzando o chão no crouch — outro defeito (malha × piso, não "pé fora do
chão"), registrado em `corpoPorPose` e sem régua própria ainda.

#### BUG-25 · O balão CONTINUA na tela de seleção, e a régua do reskin é cega para ele

**Sintoma (do dono, 04/08, depois do reskin):** *"os personagens dos funkeiros ainda estão
balãozados na tela de seleção, alguns palhaços estão esquisitos ainda também. basicamente o
mesmo erro de personagens"*.

**O conserto CHEGOU.** Descartado com hash, não com fé:

| verificação | resultado |
|---|---|
| último commit a tocar cada GLB dos 17 | `88144c4` (o próprio reskin) — nada sobrescreveu |
| `git status public/models/characters/` | limpo |
| `pose-inflate.mjs` rodado hoje | mediana dos 17 = **0,535**, idêntica à do commit |
| disco × servido × `dist/` (md5, 7 arquivos) | **iguais nos três** |

**A causa é outra, e está medida.** O que ele vê na tela de seleção NÃO é o que a
`pose-inflate.mjs` mede, por três motivos independentes:

1. **Clipe errado.** Ela roda `['walk','run','idle','crouchwalk']`. Quem carrega arma de uma
   mão (deagle/pistol/revolver38 — `raul`, `padati`, `ostentacao`, `palhacomal`,
   `cadequinha`…) usa **`idle1h`** na tela de seleção (`ctrl.oneHanded`,
   `glbchars.js:404`), que a régua nunca abriu.
2. **Pose que só existe em runtime.** Metade da deformação da tela é escrita **depois** do
   mixer, em JS, e não está em clipe nenhum: o `solveCCDIK` da mão de apoio
   (`glbchars.js:539` → `handik.js:30`, 8 iterações, **sem limite de junta**) e o
   `rotation.x += curl` dos ossos de dedo (`glbchars.js:529-531`). O GLB no disco não
   contém nada disso, então a régua do GLB não podia ver.
3. **Percentil cego.** `ostentacao` em `idle` marca `esticP95 = 0,163` — o **5º melhor de
   44** — e a imagem mostra os dois braços virados em asa de morcego. Só 2,9% das arestas
   passam de 25%: um defeito que mora acima do P97 é invisível para um P95 **por
   construção**. Prova de que é deformação e não malha: a mesma imagem em bind pose está
   limpa (`ikab3/ostentacao-Z.png` × `-C.png`).

**Régua nova: `tools/eval/select-inflate.mjs`.** Abre o jogo no Chromium, chama o MESMO
`buildCharacterModel(def, { weaponId: charWeapon(id) })` da tela de seleção, assenta com o
MESMO `ctrl.update(dt, 0, false, 0)` do loop do preview (`main.js:1527`) e mede a pele com
`applyBoneTransform` — o que a GPU desenha. Percentis altos (P99/P99,9/máx) e um contador
`ruins/1e4` (arestas que **dobraram** de tamanho por 10 mil), porque é lá que o defeito mora.

Teto com procedência: o pior dos DOIS personagens que o dono elogia, medidos pela mesma
régua no mesmo caminho, com 25% de folga — `pagodeiro` p99 0,609 / ruins 44,6 e `mandrake`
0,540 / 24,9 → **p99 ≤ 0,761 e ruins/1e4 ≤ 55,8**.

**Resultado — separação limpa, 16 × 0:**

```
REPROVADOS: 16/44   e são exatamente os 16 rigs transplantados (os 17 do reskin menos
                    o pagodeiro, que é referência e passa)
pior reprovado  padati     ruins/1e4 254,9   (4,6× o pagodeiro)
melhor reprovado funkraiz  ruins/1e4  81,0
pior aprovado   pagodeiro  ruins/1e4  44,6   <- folga de 1,8× entre os dois grupos
0 dos 27 personagens rigados no Mint reprovam
```

**O que a régua nova REFUTOU, com número:**

- **Não é o CCD IK.** `--mutate=semik` desliga o solver: os 11 transplantados com IK caem só
  5-20% (`chave` 160→158, `oakley` 142,3→133,6, `adjim` 132,7→106,2) e **todos continuam
  reprovados**. O CCD agrava, não causa. (Visualmente ele é escandaloso — o braço de apoio do
  `fluxo` vira uma folha chata — mas na malha inteira ele é minoria.)
- **Não é parâmetro do reskin.** Sweep medido pela régua nova em 4 personagens:
  `SUAVIZA=8` tira 4-23%, `LOCAL=2` **piora** o `fluxo` (152→219), `MAX_R=0,14` não fecha.
  Nada chega perto de 55,8. A pintura automática do transplante é o teto, não o ajuste.
- **ARMADILHA: reskin NÃO é idempotente.** Repintar com os mesmos parâmetros piora o
  `padati` de 254,9 para 286 (+12%). **Não rode `reskin-glb.mjs` de novo nos arquivos
  commitados** achando que é inócuo.

**Conclusão:** o que sobra é a qualidade do auto-skin do transplante
(`tools/rig-from-donor.mjs`), que é 2-6× pior que um rig do Mint na malha inteira. Fechar
isso é rig novo (Mint/Mixamo) para os 16, não mais um passe de parâmetro — e a memória do
projeto já registra que rig de dedo de verdade exige sair do Meshy.

**Régua:** `tools/eval/select-inflate.mjs` (16/44 vermelhos hoje). Morde:
`--mutate=skin` devolve o off-by-one do `88144c4` e leva as duas referências ao vermelho
(mandrake 24,9→97,7; pagodeiro 44,6→111). `--mutate=curl` leva o pagodeiro a 15,52 %>25.

#### BUG-25 (3º ciclo) · "todos estão com posturas bizarras ainda" — RESOLVIDO na parte do PORTE (05/08)

**Sintoma (do dono, 05/08, com 19 prints):** arma "flutuando" na palma aberta, arma sumida
na mão (coach/trapfunk/mandrake), revólver na ponta dos dedos apontando pro céu
(bonzo/cadequinha), jozo com a shotgun atrás do corpo.

**Três causas independentes, todas medidas:**

1. **Cache.** O print do jozo (arma atrás do corpo) era o `glbchars.js` VELHO: o clamp de
   frente via IK (`TP_FRONT_MIN`) já estava na árvore, mas o `?v=` continuava
   `2.0.0-alpha.13` — a armadilha documentada do import map, de novo. Bump → alpha.14.
2. **O porte funcional aponta o cano pra CÂMERA do preview.** Doutrina do mount v2: "a arma
   aponta pra onde o boneco olha" (−6°, 4°) — certo pro bot, mas no preview da seleção o
   cano vai reto pra lente e a arma vira um toco sem silhueta (capturas sel_now: SCAR do
   coach/trapfunk = borrão vertical). **Correção: porte de EXIBIÇÃO só no preview**
   (`opts.preview`, main.js/pvSetChar): 2 mãos atravessada no peito (−14°, 40°); 1 mão
   compensa a inclinação intrínseca do cano das pistolas (+18–21° medidos por vértice) com
   (4°, 26°). No jogo, nada muda.
3. **`GUN_POS z=0,10`**: o grip (origem do weaponModel) nascia 10 cm à frente do centro da
   palma — o revólver "na ponta dos dedos". Agora 0,04 (grip dentro da mão).

**Régua: `tools/eval/select-mount.mjs` → 0/44** (antes: 4 reprovados, todos falso positivo —
a v1 media punho→bbox e reprovava mão grande com a palma a 0,001 m do alvo do guarda-mão;
v2 mede PALMA→alvo quando o IK existe, mascote `IK_L_SKIP` isento, piso de contato 0,02 m).
Mutação `--mutate=tras` segue vermelha (mandrake MÃO-L 0,349). `select-inflate` no subconjunto:
0/5, sem regressão de deformação.

**Continua aberto (é o resto do "bizarro", e não é mount):** o clipe `idle1h` põe as duas
mãos em concha "mirando" — com rig Meshy de 24 ossos SEM dedos, nenhuma orientação faz a
mão FECHAR no punho. O caminho já decidido na memória do projeto é pose/malha (grip baked
ou rig com dedos fora do Meshy), não mais parâmetro de mount.

#### BUG-25 (4º ciclo) · "continuam todos errados" — A CAUSA RAIZ ERA NOS CLIPES · RESOLVIDO 05/08

O dono reprovou o 3º ciclo ("todos que você mostrou estão ruins, comparado com todo o
resto") e estava certo: o porte era band-aid em cima de outro defeito. Comparando o padrão
BOM (skatista/titica: duas mãos na arma, cotovelos baixos) com os piores, o separador é a
razão **mão/cabeça no BIND** (medida em todos os 44 GLBs):

```
coach 0,60 · dollynho 0,70 · trapfunk 0,70 · jozo 0,71   <- BIND EM A-POSE (os 4 piores)
todos os outros 40: 0,83–1,00                            <- T-pose
```

**Causa raiz:** o `retarget-glb.mjs` transfere rotação por DELTA
(`desiredW = srcW ⊗ srcRest⁻¹ ⊗ tgtRest`) — correto para diferença de comprimento de
osso, mas ele PRESERVA o offset do rest do alvo. Com bind em A-pose, **todo clipe sai com
o braço 30–40° fora do lugar** — por isso o defeito sobreviveu a re-rig, reskin, porte e
clamp: morava nos clipes gerados, não no GLB nem no runtime.

**Correção:** braços (`/Shoulder|Arm|Hand/`) em rotação **absoluta** no retarget; perna e
coluna seguem no delta (que é o que consertou "doutora agachada"). Para rig em T,
srcRest ≈ tgtRest e delta ≡ absoluto — **no-op medido nos 40 bons**. Clipes regenerados
para os 4; **trapfunk também foi re-riggado via Mint** (pedido do dono; o pipeline do Mint
voltou a funcionar — GLB novo 531 KB com texturas restauradas via `rig-tex-restore`).

**Medido depois:** `select-mount` **0/44**; `select-inflate` nos 4: 0/4, com o trapfunk
MELHOR que antes (21,4 → 14,6 ruins/1e4). A/B por figura na página da rodada.

### ~~BUG-32 · "mapa ctf na piscina ta com bandeiras com nome do patio brasilia"~~ · RESOLVIDO 06/08

**Sintoma (do dono, com print do preview):** faixa do CTF na Piscina da Treta mostrando
CONGRESSO · ÔNIBUS · CATEDRAL. Pediu junto: fundo da faixa transparente.

**Causa raiz:** os rótulos de Brasília moravam no FALLBACK do `_initCTF` (game.js) e vazavam
para qualquer mapa sem `world.ctfPoints` — os mapas de piscina não declaravam. Bônus achado
na correção: as 3 bandeiras do fallback caíam DENTRO da lâmina d'água da piscina (P em
−3,78/−8,82 com água até |x|7,5/|z|9,5) — capturável só da beirada, mastro flutuando.

**Correção:** `world.ctfPoints` declarado na Brasília (mesmos nomes/posições) e na piscina
(PARTIDA/ARMÁRIOS/TRAMPOLIM, as três NO DECK, em marcos reais); fallback com rótulo neutro
(BASE A/CENTRO/BASE B). Faixa `#ctf-hud` sem painel; o contraste que o painel garantia
passou pro poço da barra (.55→.80: sobre a areia do Piscinão o vermelho ia a 2,23:1; com
.80, 4,72:1 — UI1 verde de novo, 4/5 quality gates de UI; a UI4 vermelha é o alvo do DM, defeito
antigo e não relacionado). Arquivos renomeados a pedido do dono: `map_pool_day.js` →
`map_piscina.js`, `map_pool_ramos.js` → `map_piscinao_ramos.js` (IDs de mapa intactos).

**Régua: `npm run eval:ctflabels`** (`tools/eval/ctf-labels-check.mjs`, no `check:fast`):
CTFL1 todo mapa registrado declara as próprias bandeiras; CTFL2 nome de Brasília só no
awp_map; CTFL3 rótulos únicos. `--mutante=vaza` (apaga a declaração da piscina) → VERMELHA.

**No mesmo PR:** áudio ingame dos funkeiros mudo no preview era o BUG-19 (pack de julho sem
a pasta F) — o pack v2 completo já o fecha; verificado no browser contra o preview:
voice.F (40 faixas) e round.F TOCAM.

### BUG-11 · VM18 / VM18b — a silhueta é um cano, não uma arma

12 das 26 armas têm espessura perpendicular **abaixo do piso medido no CS 1.6** (shotgun 0,269 ·
carbine 0,296 · sks 0,343 contra piso 0,427). Duas buscas em grade (768 e 1.280 pontos) e a
hipótese de escorço foram **refutadas com número**. Nenhum parâmetro de câmera engorda uma
malha: o caminho é **malha nova ou outra família de pose**. Não gaste rodada procurando
parâmetro.

---

### ~~BUG-24 · "as armas estão 1,5x do tamanho que deveriam"~~ · RESOLVIDO 04/08

**Sintoma (do dono):** *"o ângulo das armas está muito bom, mas a escala está grande ainda —
digamos que estão 1,5x do tamanho que deveriam. Eu vejo isso pq o cano da arma pra mira no
centro da tela a distância é minúscula."* Reportado com o quality gate **VERDE** em VM5/VM9/VM10/VM15.

**Causa raiz — confirmada, e NÃO era área.** Medido no render (diff on/off do
`vm-quake-capture`, 1200×800 = 3:2) contra a referência (`ref_viewmodel.json`):

| | área na tela | boca → mira (altura de tela) |
|---|---|---|
| ref CS 1.6 AK / M4 / Vandal | 9,76 · 9,78 · 13,09 % | 0,103 · 0,131 · 0,277 |
| nós, escala 1,00 | ak 7,95 · m4 8,63 % | **ak 0,073 · m4 0,093** |
| nós, escala 0,67 | ak 5,44 · m4 6,30 % | ak 0,137 · m4 0,154 |

A arma **nunca** cobriu mais tela que a do CS 1.6 — ela entrava no quadro com **82,2 % da malha
FORA dele** (`foraPct` da ak, 3:2; mediana do arsenal 84,1 %), então o que aparecia era um
pedaço **ampliado** de cano e guarda-mão com a boca em cima da mira. `areaPct` não é régua de
escala quando o recorte muda — e era a única régua de tamanho que existia. A distância
boca→mira, o número que o dono nomeou, **não era medida por ninguém**: a VM12 olha só o `y` da
boca. Lei 1 da casa, ao vivo — e a faca é a prova: o `vm: 2.2` dela (`weapons.js`) foi posto
para satisfazer o piso de 6 % da VM5, e virou uma lâmina atravessando a tela inteira.

**Correção:** `VM_FRAME.recuoZ` 1,00 → **1,50** (`public/js/vmattach.js`) — encolhe o tamanho
aparente em 1/1,5 em torno do grip, que fica no mesmo pixel. Ângulo, pose, `tanBarrel` e
`knifeRot` **intocados** (eixo da silhueta no render: ak 34,8° → 33,3°). `foraPct` mediano cai
de 84,1 % para 49,6 %.

**Réguas:** **VM20** nova (distância boca→mira, faixa **0,100–0,290**, medida dos 3 frames),
VM5 e VM18b com **piso condicional** (4 % de cobertura para malha mais magra que a referência,
piso medido para malha gorda; **tetos intocados**). Mutação: com o audit do estado antigo a
VM20 acusa 14/52 fora. Capturas: `/tmp/vmscale/z{1.0,1.1765,1.3333,1.5}` e o comparativo em
`/tmp/vmscale/comparativo.png`.

**Custo declarado, medido:** VM9/VM15 ficaram **vermelhas** (grip sobe de 0,959-1,063 para
0,835-0,902 contra a faixa medida 0,90-1,08 — o `VM_OFF[1]` é deslocamento em METROS e perde
efeito quando o grip se afasta), VM1 vai de 3 para 10 armas fora e VM3 de 2 para 8. E, com
`?hands=1`, 15 armas passam a acusar "MÃO SOLTA NO AR" (folga do braço 0,174 → 0,003 m) —
invisível hoje, porque `WEAPON_ONLY` é o padrão.

---

## P2 — infra, repo e deploy

### ~~BUG-138 · Gerador de manifest falhava ABERTO quando o ledger não existia~~ · RESOLVIDO 04/09

**Sintoma.** `tools/gen-audio-manifest.mjs --ledger=<inexistente>` saía **0**, sem
diagnóstico, e mantinha `audio/piloto/nao-catalogado.wav` no manifest. Nos dois modos,
inclusive `--check`, que é o que roda no portão.

**Causa raiz.** Em `barrado()`, `if (politica.erro) return null` — "não consigo verificar"
virava "pode passar". O empacotador (`58d6dc10`) e o `assets-check` já abortavam sem
ledger; o gerador era a única das três camadas que contradizia a política escrita em
`docs/audio/PROVENIENCIA.md`. É a lição 5 de novo: não saber tem que custar o mesmo que
estar errado.

**Conserto.** Aborta com exit 1 **antes de escrever qualquer coisa**, dizendo que falta o
ledger. Medido depois: exit 1 nos dois modos, manifest intocado.

**Régua:** `eval:audioproc` PRV12, com os dois modos e a IRMÃ (com ledger válido o gerador
tem que gerar — abortar sempre não é falhar fechado, é não funcionar). Commit `6a1bc05b`.

---
### ~~BUG-139 · A prova adversarial do `assets-check` era manual~~ · RESOLVIDO 04/09

**Sintoma.** PRV10 e PRV11 rodavam o empacotador e o gerador reais contra fixture. A
terceira camada — `tools/eval/assets-check.mjs` — só tinha prova digitada à mão numa
rodada e não repetida em nenhuma outra. Prova manual não roda no portão: ela vale no dia em
que alguém a executa e envelhece no dia seguinte, e foi assim que o escape P0 sobreviveu a
duas revisões.

**Conserto.** PRV13 roda o script REAL contra fixture, nos mesmos três cenários do
empacotador: não catalogado reprova, legado reprova por nome, e o catalogado/aprovado/livre
**passa** (irmã, que impede um `assets-check` que recuse tudo de passar por proteção).

Conferido que os dois cenários vermelhos reprovam pelo motivo certo — a mensagem é a da
cláusula de procedência, não o piso de 250. O script ganhou `--raiz=`, `--ledger=` e
`--so=audio`, no padrão que gerador e empacotador já tinham; sem os flags nada muda.

**Mutação:** devolver a semântica de denylist em `tools/audio/politica.mjs` acende PRV10a,
PRV11 e PRV13a juntas — as três leem a mesma função. Commit `9f278f56`.

---

### ~~BUG-137 · P0: arquivo não catalogado sob `audio/piloto/` entrava no pacote~~ · RESOLVIDO 04/09

**Sintoma.** A trava de licença declarada fechada na 2ª rodada não estava fechada.
Reproduzido pela auditoria independente e confirmado aqui, com o empacotador real:

```
fonte `proibida-standalone`, derivados: [], manifest -> audio/piloto/nao-catalogado.wav
node scripts/build-audio-pack.mjs out --raiz=… --ledger=…
  -> PACK: 1 arquivos hasheados | exit 0 | zip gerado com o arquivo dentro
```

**Causa raiz — a FORMA da régua.** `scripts/build-audio-pack.mjs` montava uma **denylist**
a partir de `ledger.derivados`: barrava o hash conhecido e deixava passar o desconhecido.
`tools/eval/assets-check.mjs` dava `continue` em hash desconhecido, e
`tools/gen-audio-manifest.mjs` tinha a terceira cópia da mesma decisão errada.

É a lição 1 do `docs/LICOES.md` com outra roupa: a régua perguntava *"este arquivo é um mau
conhecido?"* e era **estruturalmente incapaz** de ver o estado ruim — "asset não
catalogado" era justamente o que passava.

**Conserto.** A regra virou **allowlist** e passou a morar em `tools/audio/politica.mjs`,
uma vez só para as três camadas (lição 2 — três cópias divergem na próxima edição). Sob
`prefixoDerivado`, nada atravessa sem estar no ledger com hash coerente, `aprovado`, evento
em `derivado` com `caminhoRuntime: "arma"` e fonte compatível. Legado reprova por NOME.

**Régua:** `eval:audioproc` PRV10 (empacotador, três cenários) e PRV11 (gerador), mais a
cláusula de procedência do `assets-check`. Cada uma com IRMÃ, porque um empacotador que
recusasse tudo passaria na cláusula principal sem proteger nada. Commit `58d6dc10`.

**O que NÃO ficou coberto, e está escrito:** pós-rename para `audio/a/<sha1>` o prefixo
some e um derivado não catalogado fica indistinguível de qualquer outro áudio; o legado é
barrado por nome e renomeá-lo o faria escapar. A camada decisiva é o empacotador, que roda
antes do rename.

**Lição de processo:** as rodadas 2 e 3 declararam "todos os bloqueadores fechados". A
lista estava completa **até onde aquela revisão olhou** — não é a mesma coisa. Os títulos
do handoff foram corrigidos para "fechados na Nª rodada".

---

### ~~BUG-132 · Rajada com cache frio baixava e decodificava o mesmo sample uma vez por tiro~~ · RESOLVIDO 04/09

**Causa raiz.** `public/js/audio.js`, `_shotSample` marcava "carregando" com
`this._shotBuf.set(url, undefined)` — sentinela que não sentinela, porque `.get()` devolve
`undefined` para chave ausente também. Todo tiro disparado antes do decode terminar
reentrava no ramo de carga.

**Medido** com rajada de 10 tiros e cache frio: **10 fetch e 10 decode** do mesmo arquivo.
No jogo a rajada é maior — 8 bots podem disparar ~50 tiros/s (`game.js:6329`).

**Conserto.** Mapa `_shotCarregando` separado guardando a Promise em voo, com `finally` que
limpa. Depois: 1 fetch, 1 decode. **Régua:** `eval:audioespacial` ESP9; mutação trocando a
guarda por `if (true)` volta a 10 e 10. Commit `68b9f862`.

---
### ~~BUG-133 · Inventariador mascarava falha por arquivo~~ · RESOLVIDO 04/09

**Causa raiz.** `tools/audio/inventariar.mjs` decidia "ffprobe existe?" uma vez, no começo,
e engolia a falha POR ARQUIVO num `catch {}`. Um WAV truncado saía com todos os campos
`null`, `ferramentas.ffprobe: true`, `naoMedido: []` e código de saída 0 — indistinguível de
uma medição bem-sucedida que achou null. Lição 5 dentro da ferramenta que existe para não
mentir sobre o que mediu.

**Conserto.** `medicao: {ffprobe, nivel}` por arquivo em `ok · falhou · ausente · pulado`,
mais `erro`; `falhas` e `arquivosComFalha` no topo; exit 1 salvo `--tolerante`. O `nivel()`
passou a olhar o código de saída do ffmpeg em vez de só procurar números no texto.
**Régua:** `--autoteste` INV6/INV7, com INV8 IRMÃ exigindo que os arquivos válidos continuem
medindo `ok` — marcar tudo como falha não é sinalizar falha. Commit `0ce13b40`.

---
### ~~BUG-134 · `sha256Fonte` aceitava texto livre~~ · RESOLVIDO 04/09

**Causa raiz.** A PRV1 só cobrava `sha256Fonte` como "texto não vazio". `"conferido a olho"`
passava por procedência — campo com cara de prova e conteúdo de bilhete.

**Conserto em duas camadas, porque formato não é prova.** PRV1 exige 64 hex nos dois hashes;
**PRV8** recalcula o sha-256 do arquivo em `origemNoPack` no staging privado e compara — um
hash bem formado e inventado passa na PRV1 e morre ali. Em clone limpo a PRV8 declara **NÃO
MEDIDA**, porque fingir prova é pior que não medir. E separa staging ausente (não medido) de
`origemNoPack` errado com staging presente (reprova). Commit `f8b1eb7c`.

---
### ~~BUG-135 · Ledger podia aprovar evento que o runtime não sabe tocar~~ · RESOLVIDO 04/09

**Causa raiz.** O ledger deixava qualquer um dos 8 eventos do piloto virar `derivado`
aprovado. Medido por sonda causal, só **1 de 8** tem caminho específico:

| evento | caminho | por quê |
|---|---|---|
| `ak.shot` | `arma` | `shotWeapon(w, …)` recebe a arma |
| `ak.magOut`/`magIn`/`bolt` | `global` | `reloadStart`/`reloadEnd`/`bolt` não recebem arma |
| `passo.concreto` | `global` | `step(surface)` sorteia de `cs.footsteps`, pool única |
| `morte.corpo`, impactos | `nenhum` | `death()` e `ricochet()` não consultam o pack |

Aprovar aqui poria o mesmo ferrolho em 26 armas, o mesmo passo em grama e metal, e deixaria
morte e impactos aprovados no papel e mudos no jogo — falha silenciosa com carimbo de
aprovação humana em cima.

**Conserto.** `tools/eval/audio-capacidade-check.mjs`: a sonda INSTALA a chave que um caminho
específico usaria, dispara o evento e olha o que tocou — não lê assinatura de função, que
seria ler a declaração (lição 3). CAP3 barra `derivado`/`aprovado` para evento sem caminho
`arma`. **CAP4 é a IRMÃ e pegou a própria sonda**: a primeira versão gravava só
`new Audio()` e mediu `nenhum` para tudo, o que bateria com um ledger todo `nenhum`.
Nenhum caminho de runtime novo foi implementado — o estado é bloqueado e honesto.
Commit `159d6fe7`.

---
### BUG-136 · 45 de 62 caminhos do manifest de exemplo têm nome de Valve/Epic · ABERTO, catalogado

**Evidência.** `public/audio/manifest.example.json` é versionado e é o que o
`fetch-audio.sh` copia quando o zip não traz manifest. Medido: **45 de 62** folhas citam
Counter-Strike, Half-Life ou Unreal Tournament — `awp-cs-1-6`, `usp_unsil`, `knife_slash`,
`ut-double-kill`, `m4a1_unsil`. O próprio `public/js/audio.js:2` diz que sample real de CS
não pode ser embutido.

**NÃO RESOLVIDO.** A lane do piloto Fab não substituiu nenhum deles, e substituir é frente
do tamanho do piloto inteiro. O que existe é catalogação e bloqueio: fonte
`legado-nominal-cs-valve-ut` com `redistribuicao: "proibida"` e `licenca: "DESCONHECIDA"`,
seção `legado` no ledger, e a **PRV9** cobrando por padrão (recomputado do manifest, não
lista à mão) nos dois sentidos.

**A régua admite o próprio limite:** `legado.cobertoPorPRV5: false`. A PRV5 casa por sha-256
e estes arquivos não existem em clone limpo — sem hash não há o que casar. PRV9 reprova se
alguém puser `true` ali. Commit `a6fe38c7`.

---

### ~~BUG-128 · A régua de alcance declarava verde um empacotador que morria em toda execução~~ · RESOLVIDO 04/09

**Sintoma.** `npm run eval:audioalcance` verde, e o `audio-pack.zip` nunca era gerado.

**Causa raiz.** A própria régua engolia o código de saída do empacotador com um `catch {}`
e um comentário que racionalizava a escolha ("o veredito é o pack, não o código de saída").
`scripts/build-audio-pack.mjs:66` fazia `readdirSync` numa `menu-music/` que a fixture não
criava, quebrava com `ENOENT` — e quebrava **depois** de já ter escrito o
`pack/manifest.json`. A cláusula ALC2 lia esse rastro e declarava sucesso.

Medido com `node tools/eval/audio-alcance-check.mjs --verboso`: stack de ENOENT no meio da
saída, `✓ ALC2 ok` logo abaixo. É a lição 5 dentro da régua que existe para pegar a lição 5.

**Conserto.** Cláusula ALC3 (o empacotador tem que sair 0 **e** gerar o zip), fixture com
`menu-music/`, e o empacotador diz o que falta em vez de cuspir stack depois de escrever o
manifest. `--mutante=sem-menu-music` é a mutação que prova. Commit `86cebd8d`.

---
### ~~BUG-129 · Cláusula de procedência filtrava por prefixo que o empacotador apaga~~ · RESOLVIDO 04/09

**Sintoma.** A cláusula PRV5 do `assets-check` nunca disparava em produção, em nenhum
cenário.

**Causa raiz.** Ela filtrava folhas do manifest por `f.startsWith('audio/piloto/')`, e
`scripts/build-audio-pack.mjs:49` reescreve **todo** caminho para `audio/a/<sha1>` antes de
empacotar. Medido rodando o empacotador real sobre uma fixture: no manifest que o jogador
recebe, o filtro casa **0 de 1**. Régua estruturalmente incapaz de ver o defeito que ela
nomeia — família da lição 1.

**Conserto.** A chave passou a ser o **sha-256**, que sobrevive ao rename. Provado com um
derivado Fab instalado como `audio/a/b1b3d9230e48b0a1.wav`: a cláusula acende e mapeia o
nome hasheado de volta para a entrada do ledger. Commit `fa513890`.

---
### ~~BUG-130 · Sample de tiro que não carrega repetia HTMLAudio morto; o synth nunca tocava~~ · RESOLVIDO 04/09

**Sintoma, se o caminho por sample estivesse ligado.** Release trocada, zip parcial ou
caminho errado no manifest davam 404, e o jogo ficava **sem som de tiro para sempre**, com
um `console.warn` só. O `_shotBuf` gravava `null` e cada tiro seguinte chamava
`new Audio()` na mesma URL morta.

**Causa raiz.** `public/js/audio.js`, `_shotSample` devolvia `true` nessa saída, então
`shotWeapon` retornava antes de chegar ao `_gunshot`. O comentário dizia "seguindo no
synth/HTMLAudio" e o synth nunca era alcançado.

**Conserto.** As duas saídas sem buffer (cache frio e falha permanente) devolvem `false`, e
o `shotWeapon` cai no synth — que ainda vem espacializado, melhor que o HTMLAudio de antes.

**Régua:** `npm run eval:audioespacial`, cláusula ESP8, com o limiar MEDIDO (o mesmo tiro
pelo synth puro é o controle): antes 0 e 0 disparos com 1 HTMLAudio; depois 11 e 11 com 0,
contra 11 do controle. Commit `a35e3bd1`.

---
### ~~BUG-131 · `weaponSamples` ligava derivado pendente ou rejeitado~~ · RESOLVIDO 04/09

**Sintoma.** O ledger `docs/audio/proveniencia.json` declarava `decisao` e `aprovacao`, e
**nada lia**. Com `weaponSamples: true`, o runtime sorteia por `_pick(pack.weapons[w])` e
tocaria qualquer caminho presente — inclusive um som que ninguém aprovou.

**Conserto.** `tools/gen-audio-manifest.mjs` poda dos curados (`cs`, `weapons`, `general`)
todo caminho cujo sha-256 case um derivado fora de `aprovado`, ou cujo evento esteja em
`decisao: "synth"`, e **relata** o que barrou. O runtime é controlado através do manifest,
que é o único canal que ele tem — não existe ledger no navegador.

**Régua:** `eval:audioproc`, cláusula PRV7, com fixture de três derivados do mesmo evento:
antes saíam os 3, depois sobra 1. Cláusula irmã junto (se o aprovado sumisse, reprova).
Commit `2b66bc80`.

---

### ~~BUG-126 · Áudio de ambiente nunca entrou no pack: 17 arquivos que o código nomeia dão 404~~ · RESOLVIDO 04/09

**Sintoma.** `public/js/soundscape.js` nomeia 17 arquivos em `audio/ambiente/`
(`AMB_LOOPS` + `BIOME_SHOTS`). Em produção, nenhum toca. O único sinal é um
`console.warn` por arquivo em `soundscape.js:59`, uma vez cada, e depois silêncio.

**Causa raiz — três elos, e o primeiro é uma ausência.** `tools/gen-audio-manifest.mjs`
não tinha regra para `ambiente/`: arquivo posto lá aparecia no relatório como ÓRFÃO e não
virava folha do manifest. `scripts/build-audio-pack.mjs:38` copia **só** o que o manifest
nomeia (mais `menu-music/`), então o que não estava no manifest não entrava no zip; e
`scripts/fetch-audio.sh` instala o zip. Família da lição 12 (`docs/LICOES.md`): o caminho
só é percorrido em produção, e na máquina de quem desenvolve o `public/audio/` já
populado esconde tudo.

**Por que o `assert:assets` não pegou.** O piso é de 250 caminhos e a outra cláusula
confere que todo caminho do manifest existe no disco. As duas ficam VERDES com a família
inteira ausente: se ela não está no manifest, não há o que conferir. Medido nesta árvore
com uma fixture de 317 caminhos e a chave `ambiente` removida — piso verde, "existe no
disco" verde, e só a cláusula nova acende, por 17 de 17.

**Conserto.** Regra `ambiente` no gerador (`tools/gen-audio-manifest.mjs`, a pasta é a
verdade como nas outras famílias) e cláusula NOMINAL no `tools/eval/assets-check.mjs`, que
lê a lista do próprio `soundscape.js` — mesma fonte que a régua usa (lição 2).

**Régua:** `npm run eval:audioalcance`. Arma uma fixture sintética e roda o gerador e o
empacotador reais contra ela (`--raiz=`), sem depender do pacote privado. Antes do
conserto: ALC1 17/17 fora do manifest, ALC2 17/17 fora do pack. Mutantes:
`--mutante=nome-trocado` (prova que lê por NOME, lição 14) e `--mutante=sem-copia`
(separa gerador de empacotador). Commits `d84dbca5` (régua vermelha) e `fd4481ef`.

**O que ainda NÃO está resolvido:** a release `audio-pack-v8` que o `fetch-audio.sh`
aponta é anterior à regra e não contém `ambiente/`. O jogador só ouve depois de regerar o
pack e publicar release nova — ver `docs/audio/FAB-PILOT-HANDOFF.md`.

---
### ~~BUG-127 · Tiro por sample descarta distância, pan e propagação (latente)~~ · RESOLVIDO 04/09

**Sintoma, se ligado.** Com `weaponSamples: true` no manifest, bot atirando às suas costas
a 40 m soa idêntico a bot atirando à sua frente a 2 m. É a informação de jogo que o dono
cobrou em 29/08 ("não vejo de onde vem o tiro, parece cheater"), resolvida no sintetizado
e perdida no instante em que o pack de samples entrasse.

**LATENTE, não ativo.** `weaponSamples` não é ligado em lugar nenhum do repositório —
`grep -rn weaponSamples` só acha a leitura em `audio.js`, a preservação em
`gen-audio-manifest.mjs:54` e as sondas aposentadas, que o forçam a `false`. O defeito
esperava o piloto Fab.

**Causa raiz.** `game.js:6336` calcula os três valores e os entrega
(`shotWeapon(b.weapon, _sd, 0.45, _pan, Math.min(0.25, _sd / 343))`). O caminho por sample
chamava `this._sample(f, vol)`, que é `new Audio(...).play()`: HTMLAudio não tem grafo,
então pan e `start(t)` não têm onde entrar. O `duck` era `0.3` fixo enquanto o synth
duckava `dist < 12 ? 0.3 : 0.55` — duas rotinas, mesmo conceito, limiares diferentes
(lição 2).

**Conserto.** `_shotSample` em `public/js/audio.js`: decodifica uma vez por arma e toca por
`BufferSource → gain → StereoPanner → master`, agendado em `currentTime + propDelay`. O
duck virou `Sfx.duckTiro(dist)`, chamado pelos dois caminhos. Cache frio toca pelo
`_sample` antigo — sem pan, mas audível.

**Régua:** `npm run eval:audioespacial`, com `AudioContext` falso que grava o grafo e o
`audio.js` de produção importado de verdade. Nenhum WAV entra. Antes do conserto, ESP2,
ESP3 e ESP4 vermelhas. Mutantes `--mutante=sem-pan|sem-propagacao|duck-fixo`.
Commits `e86bb393` (régua vermelha), `b4065a67` e `7ec05c95`.

**Defeito introduzido pelo próprio conserto, e pego pela régua.** O `b4065a67` aplicava
`this.vol` no ganho do `_shotSample` E o `master` aplicava de novo — `_sample` multiplica
na mão porque HTMLAudio não passa pelo `master`, e um `BufferSource` passa. Medido com
vol 0,5, `this.vol` 0,7 e `GUN_VOL` 0,62: ganho até o destino **0,1519** contra os
**0,2170** de antes, 30% mais baixo, sem erro no console. Cada nó, isolado, parecia certo;
só o produto do trajeto inteiro mostra. Virou a cláusula ESP7, que percorre o grafo do
`BufferSource` até o `destination` multiplicando todo ganho. Consertado em `7ec05c95`.

**O que NÃO foi verificado:** nada disso foi ouvido, e o caminho por sample nunca rodou num
navegador. `decodeAudioData` real, latência real e o custo de uma rajada full-auto com um
`BufferSource` por tiro seguem não medidos — bloqueios 2 e 3 do
`docs/audio/FAB-PILOT-HANDOFF.md`.

---

### ~~BUG-57 · Régua casava literal de formatação e travou TODO deploy da main por meio dia~~ · RESOLVIDO 16/08

**Sintoma.** Deploys da Vercel falhando desde `ef0a392` (16/08 ~01:52) com
`check:deploy` vermelho em `eval:redesign` — UIA6. A main ficou SEM publicar por
~14h: os merges #300 (sim-clock) e #303 (fix WebGL `16a22c40`, o "arena não
abriu" dos jogadores) estavam no git e fora do ar.

**Causa raiz — a régua lia FORMATAÇÃO, não comportamento.** A UIA6 exigia o
literal `loadingStage.update(dt)` no main.js. O rebase do #300 mudou a chamada
para `update(Math.min(0.05, dtReal))` — correto e semântica idêntica pra cláusula
(o loading continua sendo atualizado no loop) — e a regex deixou de casar.
Família do BUG-02 (régua acoplada a detalhe que não é o comportamento cobrado):
lá o JSON velho media o viewmodel de ontem; aqui a régua media a grafia de hoje.

**Por que o CI do PR não pegou.** Pegou — mas o `check:fast` do CI roda SEM o
`redesign-check` completo? Não: roda, e passou, porque o branch do #303 nasceu
do #300 já com o texto novo E a régua velha só entrou no `check:deploy` da
Vercel via `ef0a392` — que o CI do PR #303 (criado antes) não tinha. A janela:
gate novo no deploy + regex frágil + rebase no caminho = ninguém viu até o
push final. O `pr-fast` do merge-para-main roda contra a main NOVA só depois
do merge — tarde demais.

**Correção.** `redesign-check.mjs`: a cláusula passou a cobrar a CHAMADA
(`loadingStage.update(`), não a grafia do argumento. Validado local: 47/47 + UIA6.

**Régua.** A própria UIA6 agora existe e o `check:deploy` continua no
buildCommand — deploy vermelho bloqueia publicação (é o desenho). O que muda é
o que ela lê: comportamento, não formatação. Mutante da família: mudar a
formatação da chamada NÃO pode acender a cláusula (testado ao vivo: o rebase do
#300 foi o mutante involuntário e a régua nova fica verde).

**Lição (a mesma do BUG-02, agora com custo de 14h de deploy):** cláusula que
casa literal de código deve casar o MÍNIMO que expressa o comportamento. Antes
de versionar regex de fonte no `check:deploy`, perguntar: "um rebase razoável
mudaria este texto sem mudar o que eu quero garantir?" — se sim, a regex está
errada.

### ~~BUG-46 · Todo release abria um deploy de produção vermelho e redundante~~ · RESOLVIDO 11/08

**Evidência.** Os releases alpha.75, alpha.77 e alpha.78 dispararam `deploy-prod.yml` e
falharam no primeiro `vercel pull` com `Could not retrieve Project Settings`. Ao mesmo tempo,
a integração Git da Vercel publicou cada push de `main` com sucesso; a alpha.78 foi medida
em produção com health verde e import map atualizado.

**Causa.** `vercel.json` declara `deploymentEnabled.main: true`, mas o workflow descrito como
fallback manual também escutava `release.published`. Cada release criava um segundo caminho
automático dependente de credenciais CLI que não recuperam o projeto.

**Correção.** A integração Git permanece como único caminho automático. O workflow CLI
continua disponível por `workflow_dispatch` com tag explícita, sem marcar releases saudáveis
como falhos. A autenticação do fallback continua sendo validada somente quando ele é invocado.

**Régua: `tools/eval/release-check.mjs`** (`npm run eval:release`). RLS6 exige auto-deploy
da `main`, dispatch manual e ausência do gatilho de release; `--mutante=deploy-duplo` fica vermelho.

### BUG-12 · `issues/` tem 2,5 GB fora do git e fora do `.gitignore`

`du -sh issues` → **2,5 GB**; `git ls-files issues | wc -l` → **0**. Não está versionado nem
ignorado: polui todo `git status` e é um passo em falso de distância de entrar num commit.
`references/` (9,4 MB) tem 28 arquivos versionados e uma negação explícita
(`.gitignore:58`, `!references/**/*.png`) — decidir o que fica.

### BUG-13 · `tools/eval/ARCH.md` desatualizado e o CI não reprova

`npm run arch:check` falha, e no workflow o passo está com `continue-on-error: true`. Regenerar
(`npm run arch`), commitar, e **remover a linha** para virar gate de verdade.

### ~~BUG-14 · O build nunca tinha rodado — e estava quebrado~~ · RESOLVIDO 04/08

`npm run build` rodou pela primeira vez nesta árvore em 04/08 e **falhou**:

```
[ERROR] ENOENT: no such file or directory, open '.../dist/server/CHANGELOG.md'
```

`changelog.astro` lia o `CHANGELOG.md` com `readFileSync(new URL('../../CHANGELOG.md',
import.meta.url))`. Parece build-time, mas não é: no build a página vira um chunk em
`dist/server/.prerender/chunks/`, `import.meta.url` passa a apontar para lá, e o caminho
relativo resolve para um arquivo que não existe. **O prerender morria e derrubava o build
inteiro** — ou seja, o deploy do site estava quebrado e ninguém sabia, porque o build nunca
tinha sido executado.

Corrigido trocando por `import md from '../../CHANGELOG.md?raw'`, que faz o Vite embutir o
conteúdo no bundle: não há caminho para resolver em runtime.

No mesmo build, `scripts/copy-wasm.mjs` rodou e gerou **`public/wasm/resvg.wasm`** (2,4 MB) —
o arquivo que faltava para as páginas `/u/*` terem og:image. Os dois itens B1 do handoff
fecharam juntos.

### ~~BUG-15 · `public/models/anims/` não é versionado~~ · RESOLVIDO 16/08

O diagnóstico original era literal: `git ls-files` devolvia vazio e um clone limpo perdia
as animações. Hoje os GLBs individuais, os pacotes mesclados e o índice estão versionados;
`anims:check` e `anims:merge:check` passam no `check:fast`. A revisão do PR #301 encontrou
que os dois ainda não rodavam no portão específico da Vercel. RLS7 agora exige ambos em
`check:deploy`; o mutante `sem-anims-deploy` remove essa proteção e fica vermelho.

### BUG-16 · Migration de segurança pronta e não aplicada

`supabase/migrations/011_*` fecha dois furos reais (`players.token` legível pela anon key; todos
os RPCs chamáveis pela anon key — um `curl` em `/rest/v1/rpc/_flag` escondia qualquer jogador do
ranking sem token). **Está no código, não está em produção**, e sequer está commitada.

### BUG-17 · Sem link do GitHub dentro do jogo

`src/layouts/Layout.astro:222` e `src/pages/sobre.astro:99` têm o link — mas são páginas do
site. `src/pages/index.astro` (a tela do jogo: menu, pausa, fim de partida) não tem nenhum link
externo. Quem entra pelo link direto do jogo nunca vê o repositório.

---

### BUG-23 · `references/graffiti/` é material de REFERÊNCIA, não pacote de assets

Pedido do dono (04/08): decodificar as imagens da pasta, recortar os elementos com fundo
transparente e aplicar como decalque em todos os mapas.

**A pasta não pode ser aplicada como está.** 62 arquivos, 118 MB, e a amostra que abri mostra
o padrão: é acervo de inspiração baixado da web, não biblioteca licenciada.

| arquivo | o que é | pode ir pro jogo? |
|---|---|---|
| `beeaea08…jpg` | **pôster do AKIRA**, com crédito impresso na própria arte (Katsuhiro Otomo · 1998 Akira Committee · Streamline Pictures · design de Owen Roe) | **não** |
| `003de6c0…jpg` | folha de alfabeto da **Bombing Science** (loja), assinada `acmefourtune`, com logo da marca | **não** |
| `61p6GBWKMKL._AC_UF894…jpg` | peça "KING" — o nome do arquivo é ID de imagem de produto da **Amazon** (print à venda) | **não** |
| `cco_decal_-_graffiti_textures.glb` | atlas 1024² de peça wildstyle, **rotulado CC0** na origem | **sim**, com a procedência anotada |

É o mesmo padrão do `soundtrack/` (BUG-19) e pelo mesmo motivo: material recolhido para
olhar, tratado depois como material para embarcar. Aqui é pior em dois aspectos — o repo é
**público**, então a lista de arquivos é a própria denúncia, e o Akira tem titular ativo.

**O que serve, e é o que a pasta é boa pra fazer:** essas imagens são a REFERÊNCIA de estilo.
Forma de letra não é protegida — o desenho específico é. O `PIXO_GLYPHS` de `textures.js` já
nasceu assim (alfabeto próprio, medido contra a letra paulistana) e é 100% nosso. O caminho é
estender a mesma família com um gerador de *throw-up* (letra bolha com contorno), que é o que
a folha da Bombing Science ensina, e usar o decalque CC0 como peça grande pontual.

**Não apliquei nada em mapa.** O pedido foi feito com o dono indo dormir e a decisão de
licença é dele, não minha — e é irreversível na prática, porque asset entra em commit, em
build e em deploy antes de alguém revisar.

### ~~BUG-18 · O trabalho de duas semanas nunca saiu desta máquina~~ · RESOLVIDO 03/09

> Desatualizado: a main tem releases contínuos até v2.0.0-alpha.212 (03/09) e todo trabalho sobe por PR. Mantido pelo histórico.

`main` está no commit **`b4ee2b3`, de 18/07** (`v1.12.4`). A branch de trabalho tinha
**143 commits à frente** e **nenhum upstream** — nunca foi enviada. Verificado de fora:

```
https://www.csbrasil.online/js/main.js      -> 200
https://www.csbrasil.online/img/wall-1.png  -> 404   (existe e está commitado — só aqui)
```

O que **não** está em produção: personagens GLB reais, funkeiros, palhaços, o viewmodel
refeito, o Ferro Velho, os mapas novos, os wallpapers. O jogo que as pessoas jogam hoje é o
de 18 de julho.

Contribuiu para isso um `.git/index.lock` **morto desde 02/08 19:36** (0 byte, nenhum
processo segurando), que fazia qualquer commit falhar. Removido em 04/08.

A branch foi renomeada para **`v2/alpha`** e a regra `v2/<assunto>` está no
`CONTRIBUTING.md`. **Continua sem upstream de propósito** — a decisão do dono é testar
local antes de subir.

### BUG-19 · O áudio de produção é um pacote de julho, e o build baixa ele por cima

`vercel.json` roda `bash scripts/fetch-audio.sh && npm run build`. O script baixa
`audio-pack.zip` de um **release do GitHub** (`audio-pack-v1`, 199 arquivos, 4,3 MB, de
17-18/07) porque `public/audio/` é gitignored. Em disco hoje há **458 arquivos, 187 MB**.

Consequência: mesmo com o manifest consertado (BUG-07), **produção não tem os arquivos**.
Medido: `csbrasil.online/audio/manifest.json` responde 200, mas
`audio/menu-music/m01.mp3` responde **404**.

Dois problemas dentro de um:

1. **O pacote precisa ser regerado** a partir do disco e publicado como `audio-pack-v2`.
   Sem isso, todo som novo morre no deploy — inclusive os 85 que acabaram de ser ligados.
2. **187 MB não cabe.** `soundtrack/` sozinha tem **104 MB** (30 faixas inteiras) e
   `menu-music/` 49 MB, contra o teto de **250 MB da CrazyGames** somando *tudo*, com
   `public/models/` já pesado. A decisão do dono é cortar e reencodar
   (*"podemos cortá-los e renomear em outra pasta mas vão"*) — `ffmpeg` está disponível na
   máquina. Renomear resolve de quebra o outro problema: os nomes de arquivo de
   `soundtrack/` são de faixas comerciais (Sepultura, Racionais, Charlie Brown Jr, O Rappa,
   Fatboy Slim, Ramones), e num repo público eles são a própria lista de denúncia.

### ~~BUG-20 · PDFs pessoais dentro de `public/`~~ · RESOLVIDO 04/08

`public/audio/soundtrack/` continha `Numa_Interview_Pack_v1.pdf`,
`Numa_Interview_Playbook_Ruben.pdf` e `Numa_Interview_Playbook_v2.pdf` — documentos
pessoais do dono. Tudo em `public/` é servido pelo site: o build de 04/08 copiou os três
para `dist/client/audio/soundtrack/`, e um `vercel deploy` local os publicaria.

**Não chegaram a ficar expostos** (404 em produção, e não estavam no git — o deploy vem do
git). Movidos para `~/Documents/numa-interview/` e apagados do `dist/`.

Lição que fica: `public/` não é pasta de trabalho. Qualquer arquivo largado ali é
publicação em potencial, e o `.gitignore` não protege de um deploy local.

---

## Relatos recentes e resolução

- **BUG-140 · regressão de mix e vozes após o pack privado.**
  **Sintoma literal (dono, 05/09/2026, produção):** *“os sons estao ok, mas estao altos, os
  audios ingame sumiram, e os de voz round1, mult kill etc tb sumiram preciasa arrumar isso”*.
  **REPRODUZIDO 05/09 E CORRIGIDO LOCALMENTE 06/09/2026.** O pack privado de produção, SHA-256
  `c56660a4…`, entrega 558 arquivos únicos, mas `voice.E/B/U/C/F`, `round.E/B/U/C/F`,
  `general` e `roundNumbers` têm zero arquivos. O runtime não tinha contingência para nenhum
  deles; no multiplayer o countdown também não chamava `roundNumber`, e o kill streak não
  voltava à voz da facção se o callout faltasse. A primeira contingência por Web Speech foi
  rejeitada pelo dono: *“essas vozes nao sao as vozes que fizemos no fish audio”*, *“e a
  musica do menu eu tinha tirado”* e *“inclusive varios audios de funkeiros estao genericos e
  nao vozes pre aprovadas do fish audio”*. O novo pack torna obrigatórios os nove callouts +
  sete rounds Fish, os 36 takes finais dos nove Funkeiros e somente as oito músicas mantidas.
  Os takes dos Funkeiros vêm do lote Gemini TTS/OpenRouter do commit `282ff734`, sem clonagem,
  e foram preservados byte a byte; Fish é o locutor de combate/round. O ganho dos tiros caiu
  de 0,52 para 0,42. O pack local tem 823 referências, 611 arquivos únicos, zero ausente,
  zero órfão e zero legado. `eval:audiovoicemix`, `eval:audioannouncer`,
  `eval:audioprivate`, `eval:audiofablocal` e `eval:audioproc` ficam verdes. O Blob privado
  final tem SHA-256 `71e5c7fa…`; URL e hash foram confirmados nos três ambientes Vercel.
  **PENDENTE:** PR/deploy e escuta final no jogo. **Régua:** `eval:audiovoicemix`.
  **Refino de escuta (06/09):** *“ALGumas falas dos funkeiros e dos palhacos ainda estao
  genericas eu nao gosto melhor tirarmos por agora e depois refazer”*. Funkeiros ficam só com
  os 36 takes próprios; Palhaços ficam sem fala até nova dublagem aprovada. Voz genérica de
  facção/síntese para `C` e `F` é agora uma regressão coberta por mutante.

  **Reaberto (06/09, ainda local):** *“os audios ingame sumiram, nenhum dos memes que antes
  tinhamos e nem os inround está”*. A produção carregava o manifesto do runtime por
  `audio/manifest.json?v=10`, cuja resposta tinha `last-modified: 16/08`, enquanto a mesma
  produção já expunha o manifesto da release atual por `?v=2.0.0-alpha.228` (06/09). O menu
  já usava `VERSION`, mas o `Sfx` que abastece memes, callouts e início/fim de round não.
  **Régua:** `tools/eval/character-select-voice-check.mjs`: antes, as quatro cláusulas de
  revisão/revalidação estavam ausentes; depois ela exige `sfx.loadManifest(VERSION)`, a query
  da revisão e `Cache-Control: public, max-age=0, must-revalidate`. O mutante
  `--mutante=manifest-antigo` acende VOICE13. **Pendente:** deploy e escuta final; os MP3
  content-addressed continuam `immutable`.

- **BUG-141 · fallback de fala sintética toma o lugar dos memes quando o pack está vazio.**
  **Sintoma literal (dono, 06/09/2026, produção):** *“durante o jogo os audios de meme ingame
  nao reproduz, alias ele fica reproduzindo um gerado com ia ‘bora pra treta’”* e *“é horrivel
  apaga esses gerados com IA sao muito ruins”*. **Reproduzido:** o manifesto de produção da
  `alpha.229` tem `voice.E/B/U/C/F = 0` e `round.E/B/U/C/F = 0`, embora o ZIP passe no SHA-256;
  `Sfx.voice()` então chamava `speechSynthesis` e sorteava `Bora pra treta!`. O arquivo não é
  um MP3 do pacote: é a Web Speech do navegador. **Correção local:** nenhuma voz, rádio,
  personagem, callout ou número de round inventa fala quando não existe take no manifesto;
  o caminho fica silencioso e os takes Fish/personagem já presentes continuam prioritários.
  **Régua:** `npm run eval:audiovoicemix`; antes, MIX1 fica vermelho porque o runtime contém
  `speechSynthesis`; depois, o mutante `--mutante=fala-sintetica-volta` acende MIX1. **Reposição
  06/09:** o Blob privado `48a97edb…` preserva os efeitos atuais e recoloca os takes históricos:
  `voice E/B/U/C/F = 17/16/15/31/69`, `round E/B/U/C/F = 14/14/16/25/22` e sete callouts
  históricos. Os 16 arquivos Fish/números de round gerados foram retirados do novo artefato;
  o runtime voltou a aceitar takes históricos de C/F, mas continua silencioso sem arquivo real.
  **Pendente:** merge, deploy e escuta de uma partida em produção.

- **BUG-127 · estado de arma/munição/recarga ainda diverge entre cliente e servidor no multiplayer.**
  **Sintoma literal (feedback de 04/09/2026):** *“algumas armas não aparecem quando equipadas”*.
  **Evidência inicial:** `public/js/netgame.js` mantém a arma do jogador local fora da aplicação
  do snapshot; o protocolo v3 não devolve pente, reserva, recarga nem o último input processado.
  O servidor valida tiro e munição, mas a tela conserva uma segunda cópia independente desses
  estados. **CORRIGIDO LOCALMENTE 05/09/2026:** o protocolo v4 devolve arma, slots, pente,
  reserva, recarga e `ackSeq`; pickup/reload são pedidos validados pelo servidor e a troca remota
  remonta a arma visível. `eval:netcode` 178/178, `eval:netcodecbin` 18/18,
  `game/authority-check.mjs` 15/15 e smoke do servidor 86/86. O mutante que volta a confiar na
  arma declarada é detectado. **RESOLVIDO EM PRODUÇÃO 05/09/2026:** protocolo v4 publicado nos
  três nós e cliente `0090ab82`; canário v4 confirmou ACK e inventário autoritativo.

- **BUG-126 · correção de posição do jogador local não reconhece inputs processados.**
  **Sintoma literal (feedback de 04/09/2026):** *“as vezes quando vai andar para o lado agachado
  dá uma travada”*. **Evidência inicial:** `NetClient` numera o input, o servidor guarda `_lastSeq`,
  mas o snapshot v3 não devolve esse reconhecimento; `stepPlayer` ignora divergências até 2,5 m e
  então teleporta. Agachar + strafe é um roteiro determinístico da régua de movimento, portanto a
  hipótese “a física do agachamento é diferente” precisa ser separada da reconciliação de rede.
  **CORRIGIDO LOCALMENTE 05/09/2026:** o cliente guarda a predição por `seq`; o `ackSeq` v4
  corrige contra a mesma base, preserva inputs pendentes e converge suavemente. A régua reproduz
  o strafe agachado e mede 1,000 → 1,042 → 1,200 m sem teleporte; sem ack ela volta a falhar.
  As correções agora são agregadas por sessão e por round. **RESOLVIDO EM PRODUÇÃO 05/09/2026:**
  dois clientes fecharam um round com 36 janelas persistidas; o canário de correção registrou
  p95 de 0,02 m e máximo de 0,03 m sem teleporte.

- **BUG-125 · “sei que é impossível mas se desse pra abaixar ainda mais o ping, porque dessa
  forma um jogador de PT nunca vai poder jogar com um BR”** (dono, 02/09, produção).
  **RELATADO.** O RTT é geografia (Lisboa↔São Paulo ~180-200 ms de ida e volta em fibra); o que
  o jogo soma por cima é o intervalo de snapshot (33 ms a 30 Hz) + o buffer de interpolação
  (80 ms) + um quadro. Com o buffer no relógio do servidor (BUG-118) dá para MEDIR se o buffer
  pode cair sem congelar; hitscan já tem lag comp. **Régua:** nenhuma ainda.

- **BUG-124 · “no singleplayer temos que indicar que são [BOT] também”** (dono, 02/09).
  **RESOLVIDO 03/09 (v2.0.0-alpha.212).** Bot nasce `[BOT] Nome` no local (`mkBot`, game.js); online o rótulo segue vindo do snapshot, uma vez só. **Régua:** `eval:netcode` (cláusula BUG-124). No online o rótulo `[BOT]` vem do snapshot (BUG-112); no local `name` é o do
  personagem e o killfeed/placar/tela de morte mostram sem prefixo. **Régua:** nenhuma ainda.

- **BUG-123 · “quando termina partida e tem vitória temos que mostrar um load carregando
  próximo mapa pro usuário continuar no jogo, não pode ter botão jogar novamente (ele está no
  multiplayer não singleplayer)”** (dono, 02/09, produção, captura VITÓRIA com JOGAR NOVAMENTE
  e VOLTAR AO MENU). **RESOLVIDO 03/09 (v2.0.0-alpha.212).** `_endMatch` online esconde JOGAR NOVAMENTE e mostra PRÓXIMO MAPA CARREGANDO…; o `partida` do servidor remonta. **Régua:** `eval:netcode` (cláusula BUG-123). `_endMatch` é a tela do single player; no online o servidor
  gira o mapa e manda `partida` (BUG-112), então a tela tem que dizer que o próximo mapa está
  carregando e seguir sozinha. **Régua:** nenhuma ainda.

- **BUG-122 · “o kill mostrando como se o bot tivesse me matando e não o contrário”** (dono,
  02/09, produção). **RESOLVIDO 03/09 (v2.0.0-alpha.212).** Três causas: a própria morte não entrava no feed (`applySnapshot` só chamava `_feed` para remotos); `_corpoPorNome(killedBy)` não casava o apelido truncado a 16 pelo servidor (agora casa por `_meuNomeServidor`, o nome que vem no snapshot); e o painel NET cobria a coluna da vítima (`body.net-overlay #killfeed`). **Régua:** `eval:netcode` (cláusula BUG-122, mutante sem o nome do servidor). Nas capturas o painel NET cobre a coluna da vítima do
  killfeed: só o primeiro chip (`[BOT] X 🔫`) fica visível. Hipóteses a medir: (a) só
  sobreposição; (b) `_corpoPorNome(killedBy)` não casa o jogador local quando o servidor
  trunca o apelido a 16 caracteres (`room.js`), e o abate do jogador sai sem atacante.
  **Régua:** nenhuma ainda.

- **BUG-121 · “as armas sem model direito” / “nenhuma arma pode ter model low poly assim, tem
  que usar o model original da arma sempre”** (dono, 02/09, produção, capturas: AWP e MP5 como
  caixa procedural no viewmodel, AK com GLB). **RESOLVIDO 03/09 (v2.0.0-alpha.212).** O GLB que chegava depois do construtor montava DENTRO da caixa procedural e só o construtor escondia as malhas da caixa; `_vmMontarTardio` agora esconde também. Os 26 GLBs respondem 200 em produção. **Régua:** `eval:netcode` (cláusula BUG-121 com `unloadWeaponModel`/`setWeaponModel`). Os 26 GLBs existem em
  `public/models/weapons/`; a caixa é o fallback do viewmodel quando o GLB não montou
  (BUG-111 tratou a chegada tardia na troca de arma). A medir: por que AWP/MP5 seguem na caixa
  por mais de um minuto em produção. **Régua:** nenhuma ainda.

- **BUG-120 · “eu iniciei no meio do mapa com 13 de vida”** (dono, 02/09, produção).
  **RESOLVIDO 03/09 (servidor runtime-1f39881, backend PR #14).** `claimSlot` passa o corpo tomado por `_respawnEntity` quando a rodada está em live: spawn do time, 100 de vida, proteção. **Régua:** `game/partida-check.mjs` (15 ok; mutante sem respawn entrega 13 de vida). Ao tomar a vaga, o humano herda o corpo do bot como está: posição no meio da
  rodada e HP corrente. **Régua:** nenhuma ainda.

- **BUG-119 · “o jogo em single player tem uma jogabilidade 200% melhor que multiplayer.
  eles tem que ter mesma jogabilidade e parecer imperceptiveis em diferenca” / “porque em single
  player tudo funciona e é smooth e em multiplayer quebrou? temos como fazer essa comparacao
  entre os dois, e acertar ponto a ponto?”** (dono, 02/09, produção). **DECOMPOSTO; PARTE
  CORRIGIDA LOCALMENTE.** A resposta estrutural: no single player tudo roda num processo só;
  no online o cliente DESLIGA a simulação local em cinco portões (`this.online` em `game.js`:
  dano do tiro, respawn do jogador, IA dos bots, máquina de rodada, predição) e replica o
  servidor por snapshot a 30 Hz. Cada efeito colateral que `_damage`/`_kill`/`_respawnPlayer`/
  `_startRound` faziam de graça precisa de uma réplica em `netgame.js`; cada réplica que falta é
  um bug desta família. A tabela, ponto a ponto:

  | SP faz em | Efeito | Online (02/09) |
  |---|---|---|
  | `_damage` | hitmarker, número de dano | **faltava** → `_acertoPrevisto` no raio local; hp segue do snapshot |
  | `_damage` | vinheta, arco de dano ao levar tiro | **evento `hit` do servidor com autor, arma e headshot** (fase 1 do canal `ev`, 03/09); heurística só sem a flag |
  | `_kill` | sting, kill confirm, multikill, poça | replicado (BUG-116) |
  | `_kill` | killfeed | **evento `kill` do servidor** (autor, arma, caveira), uma linha por morte; `killedBy` fica só como compat sem a flag |
  | `_kill` | drop da arma do morto | **evento `drop`/`gone` por id** (fase 2, 03/09): morte e troca largam arma, E manda `pick`, rack fica |
  | `_respawnPlayer` | posição, proteção | servidor |
  | `_respawnPlayer` | munição cheia, câmera, som | **faltava** → `playerRespawned` |
  | (não existe no SP) | entrar no meio da rodada | herdava corpo com 13 de vida → BUG-120 (servidor) |
  | `_updateBot` | movimento/animação | interpolação no relógio do servidor (BUG-118), clipe pela velocidade (BUG-113) |
  | `_updateBot` | rádio/voz | pelo `voice` do snapshot |
  | `_startRound`/`_endRound` | placar, banner, sons | replicado (BUG-114) |
  | `_endMatch` | tela de fim | **botão do SP** → BUG-123 |
  | `_explodeFrag` | granada | **`nade` no input, `nade`/`boom` do servidor** (fase 3, 03/09): o cliente só desenha; dano é `hit`/`kill` com w:FRAG |
  | `_buildViewModels` | GLB da arma na mão | tardio (BUG-111) + caixa escondida (BUG-121) |
  | espectador | câmera | 3ª pessoa (BUG-117) |
  | rede | ping | geografia (BUG-125) |

  Nada desta tabela continua em "falta" depois das três fases do canal `ev` (03/09); o que
  resta é medir em produção com dois humanos (canário do fim da semana). **Régua:** `eval:netcode`
  (cláusulas BUG-119: acerto previsto com mutante `_acertoPrevisto`; respawn com munição).

- **BUG-118 · “o jogo ainda parece travado e robotico um pouco, um pouco menos mas ainda. a
  band ta 10.1kb/s é muito pouco”** (dono, 02/09, produção, depois do alpha.209).
  **RESOLVIDO 02/09 (v2.0.0-alpha.210).** A banda está REFUTADA como causa: o codec
  (`netcodec.js`) gasta ~39 bytes fixos + nome + `killedBy` por entidade e ~60 de cabeçalho;
  com 6 entidades a 30 Hz dá ~11 KB/s, e a HUD mostrava `snap 30 Hz /30` — chegam TODOS os
  snapshots. O tranco vem do RELÓGIO da interpolação: o buffer dos remotos (BUG-87) era
  indexado pelo instante de CHEGADA (`_bufAt.push(nowMs)`), e a HUD em produção mostrava
  `gap 35 ms · últ 0` e `últ 13` — pacotes em rajada. Dois snapshots que chegam no mesmo ms
  viram um salto de um tick inteiro em 0 ms, e o intervalo esticado de antes vira meia
  velocidade: o boneco anda 0,5× · salta · 1×, a 120 fps isso lê como “robótico”. O BUG-113
  mediu “deslocamento constante” numa aba com chegada regular, e por isso não viu. Correção:
  o buffer passa a ser indexado pelo TEMPO DO SERVIDOR (`snap.t`), e o instante renderizado é
  `agora − offset − atraso`, com o offset relógio-local↔servidor estimado pelo mínimo da
  janela `_tAt/_tT` (rajada atrasa pacote, nunca adianta; o mínimo ignora os atrasados). O
  `renderTime()` do lag comp usa o mesmo relógio. **Régua:** `eval:netcode` (cláusula BUG-118:
  chegada em rajada, velocidade visual constante; mutante volta ao relógio de chegada).

- **BUG-117 · “o assistir ta meio esquisito”** (dono, 02/09, produção, captura: câmera
  dentro do chapéu vermelho do bot assistido, e `[E] PEGAR SKS` na tela do espectador).
  **RESOLVIDO 02/09 (v2.0.0-alpha.210).** `Netcode.cameraEspectador` punha a câmera
  nos OLHOS do alvo (`pos.y + 1,62`) sem esconder o corpo dele — no local o corpo do jogador
  em 1ª pessoa não existe, o remoto existe, então você via o interior da cabeça. Vira câmera
  de 3ª pessoa atrás do ombro do alvo (mesma família do `camView` local, com o corpo inteiro
  visível, que é o que o dono pediu: “colocar a view do jogador em 3ª pessoa”). Não existe PR
  do Emerson com isso: dos PRs dele, o mergeado é o #364 (kill replay cam), e o aberto é o
  #449 (mobile). E `_updatePickups` rodava para o espectador, que não tem corpo nem pode
  pegar nada — o hint fica escondido enquanto `espectando()`. **Achado no meio (figura, não
  régua):** a 1ª versão da câmera mostrava o bot DE FRENTE. Há duas convenções de yaw no
  jogo: a IA anda e olha para `(sin yaw, cos yaw)` ("mesh forward is +Z", `game.js`), e o
  humano para `(-sin yaw, -cos yaw)` (câmera). O snapshot manda o yaw cru de cada um, então
  o espectador escolhe pelo `bot` do snapshot (`ent._netBot`): bot → yaw+π, humano → yaw. O
  mesmo achado expôs um defeito latente: `updateRemoteBot` girava TODO corpo remoto com
  `rotation.y = yaw`, e um humano remoto aparecia de costas para onde olha e anda (só se
  vê com 2+ humanos na sala); agora humano gira yaw+π, como o corpo TP local. **Régua:**
  `eval:netcode` (cláusula BUG-117: câmera a ≥ 1,2 m dos olhos, atrás do alvo pela
  convenção dele, segue entre snapshots; corpo do humano remoto yaw+π; hint escondido).

- **BUG-116 · “tem problemas de sons ainda” (multiplayer)** (dono, 02/09, produção).
  **PARCIALMENTE CORRIGIDO LOCALMENTE.** No online o `_kill` local não roda, então toda morte
  de remoto era MUDA: sem sting de morte (distância/pan), sem kill confirm nem multikill
  quando você mata, sem poça. `Netcode.morteRemota` replica o feedback; fim de round e início
  de rodada também ganharam os sons (BUG-114). O que o dono ouviu de errado além disso ainda
  não foi detalhado. **Régua:** `eval:netcode`.

- **BUG-115 · “dei pause e voltei: a mira não sobe, a arma sumiu”** (dono, 02/09, produção,
  multiplayer). **CAUSA IDENTIFICADA E CORRIGIDA LOCALMENTE.** Pausado, o `update()` não roda
  e nenhum input sai; após 45 s o servidor devolve o slot à IA (`releaseInactiveSlots`, defesa
  do BUG-107) e manda `slot` espectador — o jogador volta do menu ASSISTINDO outro corpo (sem
  arma própria, câmera presa). `Netcode._pulsoDePausa` manda um input parado a cada 2 s
  enquanto pausado. **Régua:** `eval:netcode`.

- **BUG-114 · “quando acabou o round ele só congelou a imagem e reiniciou do nada”** (dono,
  02/09, produção, multiplayer). **CORRIGIDO LOCALMENTE.** A máquina local de rodada está
  desligada no online e só o `state` era copiado do snapshot — nem `_endRound` nem
  `_startRound` rodavam, então sem placar, sem banner, sem tela de fim. `Netcode.transicaoDeEstado`
  replica só o feedback (vencedor sai da diferença do placar do servidor; `matchEnd` chama
  `_endMatch`). **Régua:** `eval:netcode` (roundEnd/countdown/matchEnd do servidor).

- **BUG-113 · “parece um filme com glitch lento e com lag, mesmo com ping baixo e fps alto”
  / “os bots parecem que estão deslizando”** (dono, 02/09, produção). **CAUSA MEDIDA E
  CORRIGIDA LOCALMENTE.** A interpolação estava lisa (medido na aba: 600 quadros a 8,3 ms,
  zero quadro parado, deslocamento constante). O que arrastava era o ANIMADOR: `updateRemoteBot`
  chamava `ctrl.update(dt, spd, false)` numa assinatura `(dt, moving, hasTarget, speed)` —
  `speed` ficava 0, o clipe de andar rodava a 0,45× e nunca virava corrida enquanto o corpo
  deslizava a 2-6 m/s. Agora a velocidade real dirige o clipe, a cabeça segue o pitch do
  servidor e `fire=1` toca o clipe de tiro. **Régua:** `eval:netcode` (speed no 4º argumento).

- **BUG-112 · virada de partida no servidor deixava todo cliente com ids mortos** (dono,
  02/09, produção: “assistindo esquisito”, “numa aba não mostrava nada”, “Padati” no lugar do
  jogador, `[times] PLH 4 × 3 FNK — TIMES DESIGUAIS` ao entrar num time, “ARENA DID NOT OPEN”).
  **CORRIGIDO LOCALMENTE (cliente + servidor).** `Room._novaPartida` recriava o `Game` (mapa,
  elenco e `_nid` novos) e reocupava os slots, mas não mandava NADA: o cliente ficava no mapa
  velho com `meta.roster` velho e `_netMap` casado com ids que não existem mais. Agora o
  servidor manda `partida` (mesmo conteúdo do welcome + o slot novo) e o cliente remonta a
  partida pelo mesmo caminho da entrada (`mpMontarPartida`). O nome do boneco também passa a
  vir do snapshot a cada quadro (humano que toma o slot do bot aparece com o nome dele para
  quem já estava) e bots levam `[BOT]` (pedido do dono). **Réguas:** `eval:netcode`
  (`partida`, nome, tag) e `game/partida-check.mjs` no backend.

- **BUG-111 · “as armas não aparecem no view model”** (dono, 02/09, produção, multiplayer).
  **CAUSA MEDIDA E CORRIGIDA LOCALMENTE.** Os viewmodels são montados UMA vez no construtor com
  os GLBs do preload (no online: só as armas do `roster`, 4 nesta sala). O armário oferece as
  26; `preloadWeapons()` em ocioso baixa o resto, mas nada voltava ao viewmodel. Medido na
  aba: `vm.models.akm.children = [handR, handL]` — sem `rw`. `_vmMontarTardio(id)` monta o
  GLB que chegou depois (na troca de arma e no fim do preload) e re-enquadra. **Régua:**
  `eval:netcode` (montagem tardia).

- **BUG-110 · espectador: “pistola gigante na cara”, hint de pointer lock, botões “TIME E /
  TIME B” numa sala FUNKEIROS × PALHAÇOS** (dono, 02/09, produção). **CORRIGIDO LOCALMENTE.**
  No `dedicated` o `_updatePlayer` não roda e o viewmodel ficava parado na pose de construção;
  agora `vm.root` some e o hint respeita `espectando()`. Os botões usam `meta.nomeE/nomeB`.
  **Régua:** `eval:netcode`.

- **BUG-109 · “os áudios do jogo sumiram, especialmente os in-game”** (dono, 02/09,
  produção). **REPRODUZIDO PARCIALMENTE E CORRIGIDO LOCALMENTE; falta release e escuta no
  canário.** O build baixa `audio-pack-v8`, mas `Sfx.loadManifest()` pedia
  `manifest.json?v=7`. Em produção essa chave está presa na Cloudflare ao manifesto de
  08/08: 291 arquivos únicos, contra 402 no v8 atual. O catálogo velho perde 24 vozes dos
  Funkeiros, 4 de Tribos, todas as 56 da facção Mítica e os vínculos individuais de 18
  personagens. Agora o runtime pede `?v=8`, a mesma versão de `fetch-audio.sh`.
  `eval:charvoice` passa e os mutantes `manifest-antigo`/`pack-antigo` ficam vermelhos. Uma
  amostra de 31 MP3 do manifesto velho respondeu 200: isto confirma catálogo incompleto,
  não prova que todo WebAudio esteja mudo. **Régua:** `eval:charvoice`, VOICE13.

- **BUG-108 · “captura de bandeira não está funcionando”** (dono, 02/09, produção,
  multiplayer). **CONTRATO CORRIGIDO LOCALMENTE; falta capturar um ponto no canário.** O
  servidor rodava CTF, mas o snapshot v2 não levava donos, progresso, placar ou relógio e o
  cliente online não executa a máquina local. O snapshot v3 agora carrega esse estado; v2 e
  JSON v1 continuam aceitos durante o rollout. O cliente aplica pontos, bandeiras, anéis e
  HUD autoritativos. Smoke real do servidor passou 74/74; codec 16/16; navegador local abriu
  `NET · captura`, oito entidades e HUD 1×1 visível. **Réguas:** `eval:netcodecbin`,
  `eval:netcode`, `game/smoke.mjs`.

- **BUG-107 · reconectar deixou três entradas “Rubao” simultâneas no mesmo placar** (dono,
  02/09, produção, sala `funk-x-palhaco`). **CONFIRMADO E MITIGADO LOCALMENTE; identidade
  estável ainda não existe.** A saída normal agora fecha e zera a sessão antes de desmontar o
  jogo. Como defesa para socket zumbi, cada slot registra o último input e volta à IA após
  45 s sem atividade. O smoke prova a liberação e o navegador confirmou a saída normal sem
  overlay de rede remanescente. Duas abas ativas com o mesmo nick ainda são dois jogadores de
  propósito; deduplicação imediata exigiria identidade autenticada. **Réguas:** `eval:netcode`
  e `game/smoke.mjs`.

- **BUG-106 · “acho que não precisa TANTOS bots na partida”** (dono, 02/09, produção,
  multiplayer). **AJUSTADO LOCALMENTE: oficiais 5v5 → 4v4.** As quatro salas oficiais agora
  têm oito corpos; salas criadas por jogadores continuam podendo usar dez. O smoke real
  cobra quatro vagas por lado, oito snapshots e devolução do corpo à IA. Falta aceitação de
  densidade em canário. **Régua:** `game/smoke.mjs`.

- **BUG-105 · “os bots andam parecendo que estão na lua”** (dono, 02/09, produção,
  multiplayer). **CAUSA DE ANIMAÇÃO CORRIGIDA LOCALMENTE; falta aceitação visual.** `_netSpd`
  era calculada pelo intervalo de chegada dos pacotes, portanto jitter da rede virava passada
  e animação irregulares. Agora usa o relógio do snapshot do servidor. A régua injeta jitter
  de chegada mantendo tempo autoritativo constante e passa. **Régua:** `eval:netcode`.

- **BUG-104 · “iniciei fora do respawn no meio do jogo”** (dono, 02/09, produção,
  multiplayer). **CORRIGIDO LOCALMENTE POR AUTORIDADE; falta canário.** Na transição
  morto→vivo o cliente agora teleporta para x/y/z do servidor e zera a velocidade, em vez de
  interpolar desde o cadáver/local antigo. **Régua:** `eval:netcode`.

- **BUG-103 · em mapas como Piscina e Loja H a partida às vezes inicia fora do mapa** (dono,
  02/09, produção, multiplayer). **DERIVA CLIENTE/SERVIDOR CORRIGIDA LOCALMENTE; o caso de
  produção não foi reproduzido visualmente.** O primeiro snapshot agora fixa exatamente
  x/y/z e zera a velocidade local. Os spawns headless de Piscina e Loja H ficaram dentro do
  mapa e sem penetração; isso refuta ponto-base inválido, mas ainda exige canário nesses dois
  mapas. **Réguas:** `eval:netcode` e `eval:spawn`/map-check.

- **BUG-102 · bots aparecem defasados e “não morrem” mesmo sob tiro** (dono, 02/09,
  produção, multiplayer). **PARCIALMENTE VALIDADO; jogabilidade ainda pendente.** O smoke
  controlado prova munição 30→20, HP 100→0, fogo amigo desligado e snapshots a 19,3 Hz; o
  cálculo visual de movimento deixou de usar jitter de chegada. Isso confirma que a cadeia
  autoritativa mata, mas não reproduz uma rajada humana contra bot em movimento nem fecha a
  sensação de lag. **Réguas:** `game/smoke.mjs` e `eval:netcode`; falta canário jogável.

- **BUG-101 · “eu escolho single player e ele vai pra um servidor online”** (dono, 01/09,
  produção `www.csbrasil.online`). **CORRIGIDO E CONFIRMADO NO NAVEGADOR LOCAL; falta
  release.** A causa era dupla: `quitToMenu()` não fechava/zerava `mpSessao`, e
  `_startGame(..., online=false)` lia a sessão global. A saída agora encerra o socket e a
  partida só recebe rede quando `online === true`. No fluxo real: entrou em MP, saiu pelo
  menu de pausa, abriu SP e jogou sem `#netstats`. `eval:netcode` passa 80/80 e os mutantes
  restauram as falhas. **Régua:** `tools/eval/netcode-check.mjs`, bloco BUG-101.

- **BUG-100 · os campos novos de runtime/protocolo ainda não entram na visão diária.** A
  migration incremental `~/db-privado/supabase/migrations/027_mp_runtime_protocol_metrics.sql`
  está pronta e o contrato SQL passou 11/11, inclusive mutantes de RLS e frames binários, mas
  não foi aplicada: esta máquina não tem token da CLI Supabase, senha Postgres nem navegador
  conectado com sessão administrativa. A migration 026 continua recebendo as janelas antigas —
  `/api/health` já marca `multiplayer` como fresco — e ignora com compatibilidade os campos
  extras. Até aplicar a 027, o painel publicado não consegue mostrar por dia event-loop lag,
  passos descartados, bytes, adoção binária e SHAs, embora esses valores já apareçam ao vivo em
  `/metrics` de cada nó. **Régua:** `node supabase/verify-mp-runtime-migration.mjs` na base
  privada; falta o smoke contra o banco depois do DDL.

- **~~BUG-99 · build da Vercel executava réguas que exigem o repositório Git~~ · RESOLVIDO
  31/08.** O deploy `8nDm8KfBu61ToheWiqrBaE16dYCK` recebeu o pack completo, mas cinco
  cláusulas ficaram vermelhas porque o sandbox não contém `.git` nem `origin/main`; uma delas
  chegou a dizer que `pistol.glb` não era versionado embora o arquivo esteja no Git. O
  `check:deploy` completo continua obrigatório no pre-push. A Vercel agora roda um recorte
  reproduzível de sintaxe, fetch de assets, fronteira das APIs e catálogo de nós antes do build.
  `eval:vercelbuild` reprova se o build voltar a depender do gate Git; o mutante confirma.

- **~~BUG-98 · Preview limpo confundia o manifest versionado com o pacote de áudio
  instalado~~ · RESOLVIDO 31/08.** O deploy `5DdL9r1renbn2X3VhpR9obwFojZR` parou no
  `assert:assets`: 73 caminhos contra o piso do gate. A release `audio-pack-v8` foi conferida
  separadamente e contém 445 arquivos e 434 caminhos no manifest; o defeito era o early-exit
  de `fetch-audio.sh`, acionado pelo `public/audio/manifest.json` que já vem do Git. Na Vercel
  o pacote agora é sempre baixado; em desenvolvimento o cache local continua preservado.
  `eval:assetfetch` fica no `check:deploy`, e o mutante que restaura o early-exit fica vermelho.

- **~~BUG-97 · snapshots completos em JSON repetem estado estático e ampliam tráfego e alocação
  do multiplayer~~ · RESOLVIDO 31/08.** Pedido literal do dono, 31/08: *"vamos fazer tudo [...] tirando o fly.io
  deixe tudo no gcp"*, após aprovar snapshots binários sobre o WebSocket atual. Reprodução real
  no nó brasileiro, como espectador da sala `livre`: 20 snapshots com 10 entidades deram mediana
  de 2.152 bytes, equivalentes a 42 KiB/s por cliente a 20 Hz. Um encoder-sonda com os mesmos
  campos e regras de wire compatíveis com proto3 deu 624 bytes. O codec de produção agora negocia
  `coro-snapshot-v2` no WebSocket e preserva `coro-json-v1`: no smoke com os dois clientes na mesma
  sala, o frame real caiu de 1.992 para 522 bytes (26,2%). `eval:netcodecbin` passou 13/13 e
  `game/protocol-check.mjs` passou 5/5; mutantes sem negociação, decoder, encoder e downgrade deixam
  as respectivas réguas vermelhas. O painel mede frames/bytes binários e JSON separadamente.
  Em produção, dois clientes Lisboa→Madri negociaram v2 e mediram 17,1/22,5 ms no ping aquecido;
  o nó registrou 4/4 frames binários na primeira amostra.

- **~~BUG-96 · scheduler do nó autoritativo acumula passos de 60 Hz e todas as salas oficiais
  simulam vazias~~ · RESOLVIDO 31/08.** Pedido literal do dono, 31/08: *"vamos fazer tudo [...] deixe tudo no gcp"*,
  após aceitar a correção do scheduler e suspensão de sala vazia. Reprodução estática em
  `backend/game/index.js`: `setInterval(..., 50)` envolve o acumulador de `DT=1/60`, portanto a
  volta normal executa três `room.step()` consecutivos; o laço percorre `rooms.values()` antes de
  conferir `clients.size`, então as salas oficiais vazias também avançam. Agora o scheduler de
  60 Hz tem relógio próprio, catch-up limitado a quatro passos e broadcast independente a 20 Hz;
  salas vazias permanecem publicadas, mas suspensas. `runtime-check.mjs` passou 8/8, o smoke real
  passou 70/70 e `/metrics` expõe atraso do event loop, passos executados/descartados e salas
  ativas/pausadas. Os mutantes de relógio do broadcast e simulação vazia deixam a régua vermelha.
  Os três nós GCE expõem 60/20 Hz e iniciaram com 0 salas ativas e 4 pausadas.

- **~~BUG-94 · preview da Vercel não consegue testar as APIs migradas e a ingestão
  `mp-metrics` aceita remetente sem identidade~~ · RESOLVIDO 31/08.**
  Pergunta literal do dono, 31/08:
  *"pra testarmos tudo no preview do game da vercel como faz? voce ve algum risco de
  seguranca?"* Reprodução: o cliente aponta as rotas migradas direto para o Cloud Run,
  cujo CORS aceita apenas os domínios de produção; o fallback da Vercel devolve 307, então o
  navegador termina no mesmo bloqueio cross-origin. Separadamente, um POST sem credencial a
  `/api/mp-metrics` gravou uma linha de smoke no banco de produção — CORS não autentica
  processos fora do navegador. O preview agora usa `/api` same-origin e a rota Astro faz o
  proxy no servidor sem encaminhar cookie, `Authorization` nem cabeçalhos arbitrários do
  browser. `eval:apis` cobre as rotas migradas, reprova o mutante que volta a apontar direto para o
  Cloud Run e o que vaza cookie. A ingestão exige `MP_METRICS_TOKEN`, comparado em tempo
  constante; o nó só envia com bearer e os caminhos de Cloud Run e VM recebem o mesmo segredo.
  `api/smoke.mjs`, `game/telemetry-smoke.mjs` e `deploy-check.mjs` reprovam ausência de token.
  A API está na revisão `csbrasil-backend-00004-j4g`, com SHA `71e0449f…`; POST sem identidade
  devolve 401. O Preview `dpl_6Fq25JziQQbWEUtWQb7VYxKoEypm` respondeu 200 pelo proxy e contém
  somente a anon key. Os três nós receberam a identidade dedicada e o pipeline `multiplayer`
  passou de `never` para fresco no `/api/health` depois do primeiro flush.

- **~~BUG-95 · fronteiras de segurança do multiplayer atravessam vários projetos sem um rollout
  atômico documentado~~ · RESOLVIDO 31/08.** Pedido literal do dono, 31/08: *"vamos implementar tudo isso da
  seguranca, a questao e que serao em varios projetos ne precisava entender a arquitetura"*.
  Reprodução inicial: Preview continha segredos de produção; API e nó dependiam do mesmo token
  sem versão implantada; rate limit aceita o primeiro `x-forwarded-for`; WebSocket aceita origem
  arbitrária e criação de sala não exigia ticket. **Conserto:** tickets HMAC de 60 s presos a
  região e ação, nonce descartável, Origin fechado no WebSocket, IP derivado do salto confiável,
  rate limit fail-closed para emissão e service account exclusiva das VMs. Segredos saíram da
  metadata e são lidos do Secret Manager no boot. `eval:security` e seis mutantes cobrem a cadeia;
  o smoke real recusa ausência, reuso, ação/região erradas, expiração e origem hostil. API,
  produção Vercel e os três nós foram implantados nessa ordem. O canário BR recusou criação sem
  ticket com 401 e aceitou criação+WebSocket v2 com tickets distintos; EUA e Madri só foram
  reiniciados depois. Deployments Preview antigos seguem protegidos, mas as credenciais históricas
  privilegiadas já não existem no ambiente Preview.

- **~~BUG-93 · navegador de servidores mostra ~200 ms em Madrid, mas dentro da partida o HUD
  mostra ~20 ms~~ · RESOLVIDO 31/08.** Eram duas medidas com o mesmo rótulo: `sondarNos`
  cronometrava o primeiro `/health`, incluindo DNS/TCP/TLS; o HUD cronometra `ping→pong` no
  WebSocket já aberto. Medido de Lisboa no mesmo processo: Madrid 59–89 ms no primeiro HTTP,
  21–22 ms no HTTP aquecido e 17–21 ms no WS. Brasil: 631–719 / 210–227 / 209–211 ms;
  EUA: 327–350 / 106–118 / 106–109 ms. A sonda agora aquece a conexão e publica a segunda
  amostra, sob um único prazo total. `eval:netcode` fabrica 180 ms de handshake + 20 ms de RTT:
  antes publicava 180; depois publica 20–21. Mutante de uma amostra volta a 181–182 ms.

- **~~BUG-92 · Piscina da Treta começa fora/na arena errada no multiplayer~~ · RESOLVIDO
  31/08.** Os pontos do mapa foram refutados: `eval:spawn` deixou verdes as 208 colocações de
  jogador+bot nos 13 mapas, inclusive os 16 casos da Piscina. A causa estava antes do mapa:
  `_startGame` deduzia o lado físico pela facção do personagem. Em sala FNK×PLH, por exemplo,
  o servidor podia atribuir lado B e o cliente reconstruía o jogador no lado E; o snapshot
  depois o arrastava para a posição autoritativa. Online agora confia em `welcome.yourTeam`;
  offline preserva a regra anterior. A confirmação posterior de vaga também preserva o
  callback da UI e remonta o `Game`, porque promover um espectador in-place deixava o estado
  `dedicated` sem input. `eval:netcode` cobre B+Palhaços, E+Funkeiros, troca de vaga, o caminho
  real de entrada e mutantes que retiram a autoridade do servidor ou o remount.

- **~~BUG-91 · mapas com AWPs gigantes/apontadas para cima~~ · RESOLVIDO 31/08.** Durante o
  preload tardio, `weaponModel(id)` devolvia `_cache.get(id) || _cache.get('awp')`: qualquer
  pickup cujo GLB ainda não tivesse chegado recebia uma AWP com a rotação/escala da arma
  pedida, e nunca era corrigido. Existência de malha não media identidade, então ARM2 ficava
  verde. `weaponModel` agora só devolve o modelo pedido e cada instância registra origem e
  pedido; após a carga ociosa, `refreshPickupModels()` troca os fallbacks procedurais do mapa
  e dos armários pelo GLB certo. ARM4/ARM5 ficaram em zero modelo errado ou ausente. O fallback
  procedural dos armários também compartilha as seis geometrias do molde; ARM6 reprova o
  mutante não-compartilhado, que aloca uma cópia por arma. O mutante que reintroduz a AWP deixa
  pickups com o GLB errado e reprova ARM4. Figura de navegador olhada: AK e M4 distintos,
  deitados no deck da Piscina, ambos em escala de arma de chão (`--foto=/tmp/armas.png`).

- **BUG-89 · "eu testei o singleplayer dessa branch tambem e os bots estao malucos andando em
  roda, esta tudo meio doido nessa branch"** (dono, 31/08, com screenshots de velho_oeste,
  upa_24h e piscina_treta; branch merge/461 do multiplayer #483). **NÃO REPRODUZIDO no
  instrumento — e a refutação é medida, não opinião.** `node tools/eval/botsim.mjs 180 <mapa>`
  (9 sementes, determinístico) nos 3 mapas do relato, merge/461 × origin/main (`888928f7`,
  worktrees limpos, 31/08): **todas as métricas idênticas até a 3ª casa** (velho_oeste
  spinTurns 0.199/spinRoam 0.014/latFlips 5.0/stuck 2.5%/eff 0.061; upa_24h 0.211/0.078/
  13.033/6.556%/0.06; piscina_treta 0.32/0.031/10.889/3.833%/0.04 — iguais nas duas árvores).
  O instrumento MORDE nesta árvore: mutante de deriva de rumo (3 rad/s) injetado à mão levou
  spinTurns de 0.199 → 1.847 (9×). A suspeita nº 1 (extração de `_moveEntity`/`_shotDamage`/
  `_respawnEntity` do feat/multiplayer) foi conferida linha a linha contra o `_updatePlayer`
  da main E pelo A/B acima: a extração preserva comportamento; o caminho offline dos bots não
  toca `_ip*`/`_buf*`/`_remote`. Hipóteses restantes para o que o dono viu, por ordem de
  precedente: (a) checkout velho servido na porta de teste (já aconteceu — ver memória "portas
  de medição sequestradas"); (b) defeito só-browser que o headless não vê (BUG-28 é o
  precedente); (c) o milling que JÁ existe na main (eff 0.04–0.06 é baixo nos dois lados) lido
  como novidade.

  **Reaberto pelo navegador, 31/08; resolução parcial medida.** O `bot-routes` existente
  plantava o jogador imortal no centro: 63–93% das amostras tinham alvo, então o desenho que
  parecia rota media sobretudo strafe de combate. O instrumento agora exclui o jogador e
  separa `MODE=match` de `MODE=roam`. Isso revelou duas contradições reais no `_updateBot`:
  (1) `laneX` era preenchido aleatoriamente antes do bloco que prometia distribuição ordinal,
  tornando esse bloco inalcançável — os times cobriam só 23,9–27,2% da largura; (2) as três
  profundidades de roam eram os literais 22/38/54 m, que na Piscina colapsavam na mesma fileira
  de waypoints (spread 0,043). Agora as faixas são ordinais e derivadas dos bounds (spread
  0,640), os destinos realmente escolhidos também superam o defeito congelado, e as
  profundidades são 42/65/86% da metade inimiga (Piscina 0,191). Na simulação da
  Piscina: latFlips 10,978→10,622, fwdFlips 9,344→9,000, spinRoam 0,040→0,036 e eficiência
  0,147→0,152; custo observado: stuck 4,289→5,144%. Os mutantes `faixas-aleatorias` e
  `profundidades-fixas` deixam o golden vermelho. A captura final ainda mostra voltas curtas
  ao redor de alguns destinos; portanto o relato continua **ABERTO para aceite visual**, não
  deve ser marcado como curado só pelo placar.

- **BUG-90 · MP: "os bots andam devagar" + "morri várias vezes sem ver e matei várias vezes
  sem ver"** (dono, 31/08, mesma sessão do BUG-89). **Causa raiz encontrada e medida — é o
  BUG-28 propagado ao servidor v5.** O `game/room.js` do backend constrói o `Game` direto
  (sem o `bootGame` do harness, que tem a correção) e nunca chama `updateMatrixWorld` — e o
  Dockerfile do v5 clona exatamente merge/461. Medido em 31/08 com boot igual ao do servidor
  (`dedicated:true`, 10 s de update): **velho_oeste 67/67 occluders com `matrixWorld`
  identidade** (piscina_treta 14/92, upa_24h 0/122 — mapa-dependente, pior justamente no mapa
  do screenshot). Consequência dupla: (1) a oclusão do `_scanHit` (tiro dos slots humanos)
  raycasta geometria fantasma NA ORIGEM → parede não segura tiro = "morri/matei sem ver";
  (2) a `_losClear` dos bots idem → bots em modo combate contra alvos fantasmas
  (movimento de combate é `BOT_SPEED*0.55` = "andam devagar"). Junto: `_firedSnap` só era
  setado no tiro HUMANO — todo tiro de bot chegava ao cliente sem `fire=1` (tiroteio mudo).
  **Correção na causa: backend `2d0e04f`** (`game/room.js`: `updateMatrixWorld` no boot da
  sala + wrapper de `_fireHitscan` marcando `_firedSnap` de bot; `game/smoke.mjs` 63/63 nos
  runs verdes — a trinca "movimento/dano autoritativo" flakeia COM E SEM a mudança, 1/8 no
  baseline: o smoke não é semeado). **No cliente (esta árvore):** o MP não tinha killfeed nem
  direção de dano — `_kill`/`_damage` não rodam online. `netgame.js` agora: (a) killfeed pela
  transição vivo→morto do snapshot + `killedBy`; (b) arco de dano (`_dmgArc`) e registro
  `_noteHit` atribuídos ao inimigo mais próximo que atirou há <600 ms — HEURÍSTICA, porque o
  snapshot não diz quem acertou; (c) painel de morte preserva o registro rico do `_noteHit`
  quando o assassino confere. Tela de morte com QUEM matou já existia (`playerDied` → BUG-86).
  **Pendência MP (recorte exato):** o servidor deveria mandar o evento de acerto (id do
  atacante, arma, headshot) no snapshot — aí o arco deixa de ser heurística e o killfeed ganha
  caveira de headshot. É mudança de protocolo (backend + cliente), não coube aqui. *Régua:
  `game/smoke.mjs` (backend) cobre o respawn/tiro; a atribuição de dano do cliente fica sem
  régua até o evento de acerto existir. Requer redeploy do servidor v5 para valer em produção.*

- **~~BUG-85 · `eval:armas` vermelho na main: o preload bloqueante voltou às 26 armas~~ · RESOLVIDO 30/08.**
  Palavras literais do CI (`portao-browser.yml`, vermelho desde 28/08 06:30Z, último verde
  06:17Z): `✗ ARM1 preload bloqueante com 26 armas (teto 12)` e `✗ ARM3 carga tardia não
  chegou: parou em 26 armas`. **Palpite óbvio REFUTADO:** o reporte apontava o merge do
  Córrego (`dec46d5b`, #460) — mas a janela alpha.190→alpha.191 do CI contém só o
  `1623beaa` (#405, fumaça do cano); o córrego entrou depois, na alpha.192. Medido em
  30/08 com `node tools/eval/armas-check.mjs --porta=8147` em worktrees limpos:
  `96ecadfa` (pai do #405) **VERDE, ARM1=8**; `1623beaa` **VERMELHO, ARM1=26**. Causa
  raiz: o #405 acrescentou `preloadCharacterAssets([playerCharId])` no construtor do
  `Game` (pré-carga do corpo para a tecla B) **sem** `opts.weapons` — e desde o #410 o
  `preloadCharacterAssets` chama `preloadWeapons(opts.weapons)` em TODA chamada
  (`public/js/glbchars.js:285`); `preloadWeapons(undefined)` cai em `WEAPON_IDS` inteiro
  (`public/js/weapons.js:237`) e as 26 armas entravam na janela bloqueante, sobrando zero
  para a carga tardia (por isso ARM3 caía junto). Correção na causa, sem tocar no teto:
  a chamada passa `{ weapons: [charWeapon(playerCharId)] }` (`public/js/game.js:695`),
  mesmo padrão do `loading3d.js:86`. Antes×depois na main: ARM1 26 → **6**, ARM3
  "parou em 26" → **26 em 2 s de ocioso**. Mutante existente `--mutante=sem-lazy`
  conferido no depois: ARM3 acende (parou em 8). Cláusula nova: nenhuma. Custo declarado:
  a arma do personagem entra no preload da partida — que já a continha via
  `_armasDaPartida`, logo zero request extra.

- **~~BUG-69 · triage de issue morria em toda issue não-crash~~ · RESOLVIDO 18/08.** Evidência: `csbrasil-bot-issue-triage` com **8 failures consecutivos** (17/08 23:06 → 18/08 05:42), todos em issues `[plantão]`/`[invariante]` do estraga-codigo, todos no passo "Suggest crash duplicate": `line 17: /tmp/crashes.json: No such file or directory`. Causa: o guarda `raise SystemExit(0)` dentro do heredoc python encerra o INTERPRETADOR, não o PASSO — a shell seguia para `crash_dedupe.py < /tmp/crashes.json` que jamais fora escrito. Labels e comentário de review eram aplicados antes do passo final, então o defeito passava despercebido: vermelho silencioso em toda issue de bot desde 17/08. Correção: guarda na SHELL (`if [ ! -f /tmp/crashes.json ]`) + `rm -f` pré-heredoc; aplicado no `csbrasil-bot-issue-triage.yml` e no `issues-bot.yml` (consolidação local). Mutante: remover o `if` reabre o `No such file or directory` na próxima issue não-crash.
- **~~BUG-68 · classify postava comentários repetidos como `github-actions[bot]`~~ · RESOLVIDO 18/08.** Palavras do
  dono: *"ele comenta a mesma coisa varias vezes e idealmente usaria o csbrasil-BOT"*. Evidência: PR #348 com 5
  comentários `## csbrasil-bot classification`, 4 deles num intervalo de 2 s (03:21:19–03:21:21), todos de
  `github-actions`. Duas causas encadeadas: (1) o secret `CSBRASIL_BOT_TOKEN` nunca tinha sido criado no repo e o
  fallback silencioso `|| github.token` fazia o comentário nascer com identidade trocada; (2) um review com N
  comentários dispara N gatilhos (`pull_request_review`, `pull_request_review_comment` ×3) **no mesmo segundo**: os
  runs paralelos leem a lista de comentários antes de qualquer um postar, e o dedupe por autor+marcador (que pedia
  login `csbrasil-bot`) nunca casava com `github-actions` — cada run publicava o seu. Correção: `concurrency.group:
  pr-classify-<n>` com `cancel-in-progress` serializa por PR; fallback removido com guard que derruba o job alto
  quando o secret falta; dedupe passou a casar só pelo MARCADOR no corpo (extras deletados, o primeiro atualizado);
  e os passos de rota/label/comentário migraram para REST puro porque `gh pr edit` resolve nó de user/org via
  GraphQL e exige scope `read:org` — o vermelho que a PR #350 pegou logo depois do secret entrar (PAT tem
  `repo,workflow`). Duplicatas das PRs #347/#348 deletadas na mão (sobrou 1 cada). Régua: rajada de gatilhos numa
  PR não pode produzir mais de 1 comentário com o marcador — mutante: remover o bloco `concurrency` do
  `csbrasil-bot-pr-classify.yml` reabre a corrida.
- **~~BUG-67 · revisor local re-revisava o mesmo commit para sempre~~ · RESOLVIDO 18/08.** Evidência:
  `estado/canarinho.err.log` do bot local com dezenas de `poll: achados is not defined`, sempre após revisar
  commits diretos (`68f5aff6`, `109982b3`…), reprocessando o MESMO commit a cada ciclo. Causa: `reviewCommits()`
  referenciava `achados.length` numa função onde a variável não existe (`ReferenceError`) — e como `estado.main`
  só era gravado DEPOIS do loop, o erro abortava o ciclo antes do avanço: commit re-revisado (custo de LLM a cada
  10 min) e comentário de commit **re-postado a cada ciclo** quando tinha achados. Correção (infra local do bot):
  `meta.achados.length` + try/catch por commit + `estado.main` gravado dentro do loop. Sintoma irmão: `✗(opencode
  run: )` com mensagem vazia era timeout do `spawnSync` (SIGTERM, stderr vazio) — `bots/lib/llm.mjs` agora reporta
  `signal=`/`status=`. Prova operacional: depois do restart, nenhuma linha `poll:` nova e `estado.main` avança
  commit a commit. Contrato novo junto: achado grave vira `REQUEST_CHANGES` e fio não resolvido trava o merge via
  branch protection "require resolved conversations" (antes: "comenta, não bloqueia").
- **~~BUG-66 · Faria Limer ainda fala com a voz do Lula~~ · RESOLVIDO 16/08.** Palavras do dono: *"o farialimer
  ainda tá com som do Lula; precisamos usar um do time do Bolsonaro"*. O vínculo explícito
  criado no BUG-65 aponta para `55678d5886537476`, hash do arquivo-fonte `cana_doce.mp3`:
  ele estava classificado dentro da pasta do Time B, mas o conteúdo continua sendo a voz
  errada. A substituição escolhida vem do mesmo pool B e tem fonte nominal
  `bolsonaro-acabou-porra.mp3` (`fc5bf11f5b8287f5`); os hashes SHA-1 do fonte e do asset
  publicado são idênticos. Antes, `eval:charvoice` deixava VOICE10 e VOICE12 vermelhas;
  depois, passa com o runtime e o deploy no `audio-pack-v6`. Os mutantes
  `faria-volta-lula` e `pack-antigo` reacendem uma cláusula cada. Custo declarado: nenhum
  áudio novo; só muda a reserva de um clipe que já pertencia ao pool B.

- **~~BUG-65 · bordões da seleção pertenciam à posição, não ao personagem~~ · RESOLVIDO 16/08.**
  Palavras do dono: *"o Faria Limer tá usando um áudio do Lula"*, *"o Clubber não pode ser
  bomboclaat, tem que ser o ai delícia; o bomboclaat é o Rasta"* e *"o Funk Raiz é o coé,
  rapaziada"*. `public/js/audio.js:102` usava o índice do avatar no elenco para buscar o
  pool; no elenco Urbanas, por exemplo, o índice do Clubber apontava exatamente para
  `bomboclaat`. A régua nasceu vermelha em **5 identidades**. Agora seis personagens têm
  associação explícita, os demais pulam os arquivos reservados para não compartilhar fala,
  e o pacote v5 acrescenta a vinheta de 8 s do Dollynho. `eval:charvoice` passa; os seis
  mutantes passam a deixar ao menos uma cláusula vermelha, inclusive a troca Clubber↔Rasta.

- **~~BUG-64 · wallpaper da home não preenche o 3:2 sem cortar e versão sai do canto~~ · RESOLVIDO 16/08.**
  Palavras do dono: *"a tela inicial também não está com o wallpaper cheio e a versão do
  jogo não está no canto direito"*. `cover` preenchia, mas cortava logo ou personagem dos
  wallpapers 16:9; `contain` preservava a arte, mas deixava faixas visíveis no viewport 3:2.
  Cada wallpaper ganhou uma variante 3:2 derivada exclusivamente da própria imagem: quadro
  original inteiro no centro e extensão desfocada nas áreas novas. Em 1536×1024 a captura
  mostra logo e personagem inteiros, sem faixa vazia; a versão fica fixa 14 px acima da borda
  inferior e alinhada à direita. UIR32/UIR42 passam, os mutantes `menu-wall-sem-3x2` e
  `versao-menu-volta-rodape` ficam vermelhos, e `menuwalls:check` liga fonte, receita e saída.

- **~~BUG-63 · tela final tinha emenda colorida atrás do personagem~~ · RESOLVIDO 16/08.**
  Palavras do dono: *"faltou só a parte do vitória estar preto igual o degradê final da
  imagem à esquerda pra parecer uma tela só"*. Dois pseudo-elementos desenhavam um radial
  verde e um gradiente restrito à metade direita. Ambos foram removidos: vitória e derrota
  agora usam o mesmo preto contínuo atrás do recorte alfa inteiro. Capturas reais em
  1536×1024 confirmam ausência de emenda; UIR41 passa e `resultado-emenda-volta` recoloca o
  radial, deixando a cláusula vermelha.

- **~~BUG-62 · shader dos personagens não compila no Chromium headless~~ · RESOLVIDO 16/08.** Descoberto pelo
  smoke real em 16/08: `web-assets.spec.js` carregou o GLB e a ficha, mas o overlay de debug
  bloqueou `#char-confirm` por 900 tentativas. A primeira correção trocou a amostragem por
  `texture2DLodEXT` e deixou WG11 verde, mas a régua só reconhecia o nome da função. O smoke
  Linux do PR #302 provou que a extensão estava desabilitada no renderer da vitrine; além
  disso, a variante do material dependia da capacidade global do renderer principal. A
  correção usa o bias nativo do fragment shader — `texture2D(map, vMapUv, csAlbLod)` — e não
  compartilha capacidade entre renderers. WG11 agora recusa a extensão e o estado global; o
  mutante `texture-lod-ext` devolve a extensão e deixa WG11 vermelha. O smoke também verifica o `crash-overlay`
  antes de clicar, para uma regressão de shader falhar imediatamente em vez de aguardar o
  timeout do botão.

- **~~BUG-58 · trocar de time com M quebra a tela~~ · RESOLVIDO 16/08.** Palavras do dono:
  *"o fluxo de trocar de time parece quebrado quando aperto m ele quebra a tela"*.
  O smoke reproduziu o estado inválido: depois de `KeyM` e `pointerlockchange`, `#char-select`
  estava visível **junto** com `#pause-menu` (`expected hidden, received visible`). A causa era
  sair do pointer lock antes de marcar a pausa; o evento de perda abria uma segunda camada.
  Agora a pausa ocorre primeiro, a seleção usa `enemyFaction` (não o lado físico), VOLTAR
  restaura facção/time/personagem e `_switchTeam()` troca também as duas facções. O smoke
  completo passa e `--mutante=troca-m-abre-pausa` deixa UIR40 vermelha.

- **~~BUG-59 · opção de 5 rounds encerra a partida em 3~~ · RESOLVIDO 16/08.** Palavras do dono:
  *"o jogo falava 5 rounds mas teve 3"*. A opção se
  chama “Nº DE ROUNDS”, mas `_fimDaPartida()` encerrava ao atingir maioria. A nova régua
  ficou vermelha em **8/8** combinações (1/3/5/7 × mata-mata/CTF). O contrato agora é literal:
  5 selecionado = 5 rounds disputados; só o relógio global do CTF continua como rede de
  segurança. `eval:matchoptions` passa e os mutantes `fixo` e `maioria` ficam vermelhos.

- **~~BUG-60 · aviso interno do Supabase aparece na tela final~~ · RESOLVIDO 16/08.** Palavras do dono:
  *"esses erros de supabase jamais devem aparecer no jogo"*. A captura
  mostra `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em vermelho dentro do placar final;
  `submitNote()` anexava a mensagem técnica ao `#match-stats`. Ele agora registra somente
  `console.warn('[ranking]', msg)`: não consulta DOM e não contém nomes de variáveis de
  backend. UIR38 passa; `--mutante=backend-aviso-volta` recoloca o vazamento e fica vermelho.

- **~~BUG-61 · seleção de facções abre com arte em branco~~ · RESOLVIDO 16/08.** Palavras do dono:
  *"carregando a tela de facções, ela deve ser preloaded já as imagens das facções pra não
  dar delay e espaço em branco"*. As cinco imagens CSS (403.008 bytes) agora começam a
  carregar no boot; tanto o fluxo normal quanto `?tela=faccao` aguardam o mesmo `decode()`
  antes de mostrar `#team-select`. UIR39 passa e o mutante que remove o `await` fica vermelho;
  o browser abre a facção diretamente sem espaço vazio nem skeleton.

### ~~BUG-55 · painel "FPS P50" media jank de boot vendido como FPS de jogo~~ · RESOLVIDO 15/08

**Sintoma, nas palavras do dono** (print do painel de desempenho, 15/08): *"FPS P50 1 ·
média 4 · 98% dos jogadores abaixo de 30 FPS"* — e um jogador relatando *"travando com lag"*.

**Causa raiz.** `_sendPerf()` (`main.js`) rodava no **topo do módulo**, na carga da página:
a janela de 1 s de rAF abria no primeiro segundo de vida, com a main thread parseando JS e
compilando shader. Thread ocupada não roda rAF — a contagem media **quanto o boot engasgou**,
não a partida. P50 1 FPS é o esperado nesse instrumento; o painel rotulava como "FPS".

**Conserto** (`main.js` + `api/perf.ts`): a janela passa a abrir **~4 s após
`state === 'live'`** (em partida, fora do pico de compile). As três colunas ficam honestas
sem migration: `fps` = partida · `bootMs` = tempo até **jogável** (antes media fim de parse)
· `loadMs` = carga do módulo (o ex-bootMs — coluna que existia morta na RPC `track_perf`).
**Número histórico não é comparável** com o novo: a série antiga mede boot.

**Régua.** TL11 do `tools/eval/telemetry-check.mjs` (três laços: espera por live, descanso
pós-live, loadMs no payload). Mutação `--mutante=perf-no-live` devolve a medição na carga
e acende. O lag relatado pelo jogador **não foi refutado** — com fps de jogo + connection +
quality na mesma amostra, a próxima leitura do painel separa máquina fraca de rede lenta.

- ~~**BUG-41 · `crypto.randomUUID` derruba presença em navegador incompatível (#143).**~~ · RESOLVIDO (conserto medido 0/3→3/3 já registrado abaixo; fechado em 03/09).
  O cliente chamava o método diretamente ao criar `cs_anon` e `awpbr_token`; quando
  `crypto` existia sem `randomUUID`, `getAnonId()` lançava antes do primeiro ping.
  `npm run eval:uuid` reproduz esse ambiente e exige UUID v4 nos caminhos nativo,
  `getRandomValues` e sem Web Crypto (este último reprova em vez de gerar token
  previsível com `Math.random`). Medição: **0/3 → 3/3**; a mutação
  `--mutante=chamada-direta` devolve o erro.

- **~~BUG-40 · Release atribui ao bot uma contribuição externa e usa o nome antigo~~ ·
  RESOLVIDO 09/08.** Palavras do dono: *"o nosso bot deu squash merge e tirou a
  contribuicao do emerson garrido. isso é errado"* · *"queriamos todos RELEASES
  renomeados pra CSBR"*.

  **Reprodução.** Não houve squash: os PRs #118 e #119 tinham merge commit com o commit
  reconstruído como segundo pai. O defeito estava nesses dois commits: Ruben era o autor
  principal e o trailer `Co-authored-by` do Emerson usava
  `emersongarridohotmail.com.br@MacBook-Pro-de-Emerson.local`, e-mail que nenhuma conta do
  GitHub pode verificar. Antes, **0 dos 2** trailers ligavam a `@EmersonGarrido`.

  **Conserto histórico.** Os dois trailers agora usam o noreply oficial
  `7999450+EmersonGarrido@users.noreply.github.com`; **2 dos 2** são associáveis. A
  reescrita foi atômica e com lease, e `git diff` entre as árvores finais antes/depois deu
  vazio: só os trailers e os hashes descendentes mudaram. `main` passou de `2cd8a4b` para
  `fc8e431`; as tags alpha.46/47 foram movidas junto. As notas desses dois releases citam
  explicitamente `@EmersonGarrido` e os PRs #118/#119. Releases de versão medidos em 09/08:
  **47 de 47** titulados `CSBR <tag>`; os pacotes de áudio/decalque mantêm nomes próprios.

  **Conserto futuro e régua.** Os dois caminhos de criação agora usam
  `gh release create --generate-notes --title "CSBR …"`; as notas nativas do GitHub incluem
  PRs e contribuidores. `npm run eval:release`: RLS1 **0/2 → 2/2**, RLS2 **0/2 → 2/2**.
  Mutações `--mutante=nome-antigo` e `--mutante=semcreditos`: a cláusula correspondente
  cai para **1/2** e o comando sai 1.

  **Custo declarado / não verificado.** Seis hashes mudaram e os dois merge commits
  reconstruídos perderam a assinatura `Verified` do GitHub. O GitHub documenta que o
  gráfico de contribuidores pode levar até 24 h para refletir uma reescrita; as notas dos
  releases e os trailers já são verificáveis imediatamente.

- **~~BUG-37 · Tarja vermelha de CRASH por um erro que não é crash~~ · RESOLVIDO 20/08
  pelo BUG-73** (issue #122, e a #389 é a irmã). Print do dono, 07/08, com o menu de pausa
  aberto (`RESUME ▶` no canto):
  *"⚠ CRASH (promise): The fetching process for the media resource was aborted by the user
  agent at the user's request."*
  O diagnóstico desta entrada estava certo desde 07/08 - *"o defeito não é o áudio: é o
  overlay de crash tratar isso como crash"* - e o próximo passo prescrito, *"filtrar
  `AbortError` de mídia"*, é exatamente o que o **BUG-73** fez, na mesma família de
  mensagens e na mesma classificação (`recuperavel`, sem issue, sem tarja, gravado no
  banco). Régua: EP14 de `tools/eval/error-provenance-check.mjs`, com as 3 mutações.
  Duas correções de ponteiro que esta entrada carregava velhas: o `startMenuMusic` mora
  hoje em `main.js:398-417` (não `:206-216`) e o `_sample` em `audio.js:55` (não `:46`).
  A suspeita registrada aqui - *"o `stopMenuMusic` pausa por fade e é candidato"* - foi
  **refutada com medição**: `npm run eval:medianet` inspeciona os 7 `play()` de mídia do
  fonte e todos estão guardados, o do fade inclusive. O produtor da promessa solta em
  produção continua sem nome, e o BUG-73 diz por quê (não há browser na máquina que
  consertou).

  **03/09 — pendência de protocolo fechada (fase 1 do canal `ev`).** O servidor manda
  `{type:'ev', tick, t, list:[{k:'hit'|'kill', a, v, d, h, w}]}` como TEXTO, antes do snapshot do
  tick, por um gancho único em `_damage` (`room.js _instalarGanchos`); `hit` só quando a vítima
  é gente, `kill` sempre, teto 32/tick derrubando `hit` antes de `kill`. O cliente drena por tick
  (`netgame._drenar/_evento`) e deixa de usar `_atacanteProvavel`; sem `events: 1` no welcome cai
  na heurística velha (rollout servidor-primeiro). Réguas: backend `game/eventos-check.mjs`
  (10 ok; mutantes sem-gancho, hit-e-kill, sem-teto), `game/protocol-check.mjs` (ev-binario,
  snapshot-antes, sem-flag), `game/smoke.mjs` (pela rede); cliente `eval:netcode` (arco para o
  atacante REAL com outro inimigo mais perto que atirou há 100 ms; mutante sem a flag cai na
  heurística). Fase 2 (03/09): `drop {i,x,z,w,ttl}`/`gone {i}`, `pick:<id>` no input validado a
  2,6 m, `meta.drops` para quem entra no meio, guarda `_remote` no `_updatePickups`. Fase 3 (03/09):
  `nade` no input latchado no servidor (inventário 5/1 por rodada, cooldown 0,6 s), `nade`/`boom`
  por id, o cliente só desenha e o dano vem como `hit`/`kill` com w:FRAG. Réguas: eventos-check
  DR1-DR5 e GR1-GR4 (mutantes sem-distancia, sem-latch); `eval:netcode` fases 2 e 3.

- **BUG-38 · "Andando não consigo mexer a mira, só quando para" — touchpad de notebook.**
  Palavras de quem reportou (Matheus Paz, 07/08): *"Andando não consigo mexer a mira, só
  quando para. Isso usando touchpad do notebook!"*
  **Régua: nenhuma. NÃO REPRODUZIDO** — quem investigar precisa de um notebook com
  touchpad; no mouse do dono isso não aparece.
  **Palpite óbvio, e ele precisa ser REFUTADO antes de virar conserto:** "é a supressão de
  toque enquanto digita" (Windows Precision Touchpad e macOS ignoram o trackpad enquanto
  há tecla pressionada, pra o cursor não pular no meio da digitação). Se for isso, é do
  sistema e não do jogo — mas *isso não fecha o item*, porque o jogo pode mitigar. E se
  NÃO for, o suspeito seguinte é o `_mm` (`game.js:2049`), que lê `e.movementX/Y` e só
  roda atrás de `_acceptInput()`.
  **O que NÃO foi verificado:** o sistema operacional dele, se estava em pointer lock, e
  se a mira trava com QUALQUER tecla de movimento ou só com W. Perguntar antes de medir —
  sem isso a régua nasce medindo a coisa errada.

- **~~BUG-62 · "A roda gigante deve rodar no mesmo local, igual roda gigante de verdade"~~ · RESOLVIDO 16/08.**
  O grupo girava na base, 12 m abaixo do cubo: o centro do aro derivava 8,791 m por rotação
  medida. O pivô agora coincide com o cubo e aro, raios e cabines usam coordenadas locais:
  distância pivô→aro **12,000 → 0,000 m** e deriva **8,791 → 0,000 m**.
  Régua: `npm run eval:parquewheel`; `--mutante=pivo-base` restaura os dois números antigos e
  reprova. Custo declarado: nenhum colisor, waypoint ou rota mudou; só os volumes visuais da roda.

- **~~BUG-63 · "Mova a roda gigante mais pra esquerda pois esta pegando na lateral do mapa, que parece uma grama verde"~~ · RESOLVIDO 16/08.**
  A roda, as cabines, a base e os suportes foram movidos juntos 6 m para dentro da arena.
  A menor folga do volume animado para a lateral verde foi de **-5,546 → 0,454 m**.
  Régua: `npm run eval:parquewheel`; `--mutante=lateral-verde` restaura a posição antiga,
  devolve **-5,546 m** e reprova RODA3. Custo declarado: a cobertura jogável sob a atração e
  seu colisor também se deslocaram 6 m; armas, spawns, bandeiras e limites do mapa não mudaram.

- **~~BUG-64 · "Aumente a altura da Roda Gigante pois os assentos estao pegando na base"~~ · RESOLVIDO 16/08.**
  O eixo e o topo dos suportes subiram **12,0 → 14,5 m**. Em uma volta completa, a menor
  folga dos assentos para o topo da base foi de **-2,339 → 0,161 m**.
  Régua: `npm run eval:parquewheel`; `--mutante=altura-baixa` restaura 12 m, devolve
  **-2,339 m** e reprova RODA4. Custo declarado: a silhueta da atração ficou 2,5 m mais alta;
  base, colisor, raio, velocidade, armas, spawns e rotas não mudaram.

- **~~BUG-65 · "Ajustes pois os assentos estao pegando no circulo da roda gigante"~~ · RESOLVIDO 16/08.**
  O aro e os raios foram recuados 1,2 m para um plano estrutural atrás das cabines. A folga
  em profundidade entre cabines e aro foi de **-1,070 → 0,130 m**.
  Régua: `npm run eval:parquewheel`; `--mutante=aro-no-assento` restaura o mesmo plano,
  devolve **-1,070 m** e reprova RODA5. Custo declarado: aro e raios ficaram 1,2 m atrás do
  cubo; altura, raio, cabines, base, colisores, velocidade, armas, spawns e rotas não mudaram.

- **"E vice-versa" do BUG-01** — partida de CTF *sem* a faixa de bandeiras no HUD. O caminho
  `this.ctf → _initCTF → _updateCtfHud` sempre desconde, então o mecanismo não é o mesmo do
  BUG-01. Precisa de mapa + modo + se houve recarga de página.
- **BOT1** (aviso) — bot indo de lado, 12,9 flips/min contra teto de 12/min.
- ~~**CHR5B** (aviso) — 27 dos 44 personagens com **zero** mapa de superfície~~ · **RESOLVIDO
  04/08**: `tools/char-surface-maps.mjs` deriva normal+roughness do próprio albedo do GLB
  com a MESMA fórmula do `textures.js` (Sobel + `hi+(lo−hi)·lum`), 512 px, FORÇA 1,8
  escolhida comparando imagem a 1,1/1,8/3,0. **27/44 → 0/44**, custo +1,64 MB nos 27
  arquivos (11.624.996 → 13.347.320 bytes).
  No caminho apareceu um defeito maior: `upgradeCharMaterial` (characters.js) carregava
  `map` e `normalMap` e **largava o `roughnessMap`** — os 17 personagens com
  metallicRoughnessTexture do Mint pagavam o download e a tela desenhava `roughness: 0.86`
  fixo. O CHR5B contava ARQUIVO, o jogador via CONSTANTE. Corrigido junto.
- **C10** — `_freeSpot` (`game.js`) ignora colisores com `minY ≥ 1,5`; no mezanino não empurra
  arma para fora de parede. Não mordeu ainda; é armadilha para o próximo mapa com andar de cima.

## Amazônia — revisão de cabanas/fauna e integração, 06/09/2026

Relato: fauna suspensa e parada, cabanas fechadas, bots perdidos. Baseline e
contraprovas em `docs/reports/AMAZONIA-CABANAS-FAUNA.md`; andamento do grafo
em `docs/reports/AMAZONIA-VISUAL-CONTINUATION.md`. Testes browser AMH1–4
medem apoios, interiores, circulação, tiro/parede e movimento temporal.
`npm run eval:amazonia` mede materiais, rotas, água e fauna real do quintal.

### Amazônia: bots sob palafitas (2026-09-06)

Rotas misturavam chão e piso elevado. A régua real de _updateBot foi de56/71
no baseline amplo para71/71 nas sementes7 e42. Mutante sem navegação por
camadas retorna68/71 e27arestas falhas. Correção opt-in somente Amazônia;
botsim-golden dos demais mapas verde. Detalhes em
[AMAZONIA-CABANAS-FAUNA.md](docs/reports/AMAZONIA-CABANAS-FAUNA.md).

### Amazônia — VM14: pickups na tora e na margem (corrigido, 2026-09-06)

Em `public/js/map_amazonia.js`, a MP5 da madeireira nascia dentro da pilha
de toras; o slot inicial central ancorava quatro armas do rack na margem
inclinada. `pickup-check.mjs amazonia` mediu 71 armas, uma inalcançável e
quatro abaixo do piso antes da correção. Trocar a ordem dos spawns já existentes
e posicionar a MP5 ao lado das toras preserva as 71 armas e mede zero falhas.
O loader que restaura as três linhas anteriores reproduz 1/4/0 falhas.
Evidência e próximo passo: [continuação](docs/reports/AMAZONIA-VISUAL-CONTINUATION.md).
## Menu local do Escadão — resolvido em 06/09/2026

> "ESTA desatualizada com a main e nao da pra testar"

A porta 8148 usava `tools/eval/serve.mjs`, que entrega o template Astro parcialmente
processado. O HTML continha `FACTIONS.map` e `String(index + 1)` uma vez cada.
Substituído pelo Astro real da main 69555790 (alpha.223), com o Escadão integrado
na branch `codex/escadao-main`. As duas assinaturas passaram a zero.

`tools/eval/escadao-menu-check.mjs` rejeita o HTML anterior com `--html=...` e
valida o fluxo completo sem `auto`: mapa, nick isolado de teste, facção, personagem,
adversário, GLBs e movimento. Recibos em `artifacts/escadao-visual/main-sync/`.
A régua aguarda a retirada da splash antes do primeiro clique, respeitando a
proteção contra gesto de entrada acionar o menu.

A integração encontrou cinco nós isolados junto à Deagle (-10,38). Uma linha de
waypoints no vão x=-8,5 conecta esse fundo de rua: 370/370 nós e oito rotas dos
spawns à arma. `escadao-graph-check.mjs` reprova o estado anterior;
`--mutante=sem-conexao-rua` volta a isolar a arma. Nenhuma tolerância foi ampliada.

## Escadão R4 — pisos sem espessura e circulação (06/09/2026)

Relato literal: “ver o chao de cima estando embaixo, lugates que nao da pra passar”. Fotos do usuário04.07–04.09 mostram piso superior invisível por baixo e props aparentando flutuar. O plano FrontSide do topo não fechava o volume. Massa de terreno e degraus sólidos agora bloqueia os raios inferiores; `escadao-structure-check.mjs` preserva RED e mutação sem massa.

A escada mais íngreme solicitada revelou saltos involuntários ao descer: `escadao-descent-check.mjs` mediu0,305m de separação e78frames aéreos. `Game._moveEntity` acompanha somente passos descendentes no opt-in `world.snapDownSteps`, preservando salto e queda maior que um passo. Browser real `r4/runtime-delivery` passou12/12travessias, sem perda de apoio nem interseção corporal. Porta, janela e grafo da casa são cobrados por `escadao-home-check.mjs`; porta fechada por mutação reprova. Crítica independente em `r4/browser-delivery` confirmou fechamento do piso, acesso, janela e continuidade visual do beco. Performance/FPS e orçamento AM7 continuam pendentes.

Na revisão antes do merge, o grafo aceitava142arestas incompatíveis com corpo/degrau. A régua agora percorre todas as arestas com a física real, exige chegada dentro das zonas CTF e testa180frames contra a guarda do piso novo. O filtro global de arestas, amostras da passagem exterior leste, vão oeste/pneus e piso contínuo do PATAMAR2 corrigem os casos. Mutantes parede e sem-guarda-p2 reproduzem respectivamente a ligação impossível e a queda num bolsão. A captura de preview também rejeita fonte HTTP divergente do checkout, e a régua visual aceita main/detachedHEAD.

## Regressão de Lajes — correção validada localmente

### BUG-141 · Lajes trava acima de 5×5 no single player · CORRIGIDO LOCALMENTE 06/09

Relato do dono: “fiz um teste no lajes e acima de 5x5 players mesmo no single player o mapa trava. fiz comparacao com o mapa piscina na treta que funciona numa boa em 8x8...”.

**Reprodução:** Chrome/ANGLE Metal M4 Pro, 1536×1024, qualidade med, jogo real com15bots
(8×8). Antes:83quadros em12,2s, P95391,6ms; Piscina8×8 P9516,9ms. LOS consumiu
10,88s dos12,2s no Lajes. O perfil em Node isolou a mesma causa sem render/GPU:
malhas de alvenaria agrupadas por material testavam milhares de triângulos distantes.

**Correção:** `public/js/lajes_raycast_index.js` indexa faixas de12triângulos, uma
BoxGeometry original, mantendo os lotes renderizados. `lajes_houses.js` instala e
remove o índice. `map_lajes_authored.js` oferece `rayOccluded`; `_losClear` em
`public/js/game.js` encerra a busca no primeiro obstáculo no Lajes e conserva
fumaça e caminho original nos outros mapas. Tiros continuam obtendo todos os
impactos na ordem nativa. Sem redução de arquitetura, fauna, céu ou jogadores.

**Régua:** `npm run eval:lajes-raycast`, LRP1 crítica em invariants e CI.189raios,
166comimpacto,13malhas:6.059.736→22.056testes de triângulos (−99,64%), sequência
idêntica de impactos/face/UV/normal;189consultas de visão idênticas mais fumaça.
220casos de near/far, sidedness, origem interna/aresta, transformações, drawRange,
mutação/substituição de dados e descarte. Zero consultas após o primeiro obstáculo.
Mutantes `linear`, `sem-parede`, `sem-consulta`, `sem-parada` falham nas cláusulas
respectivas. Limite de trabalho≤10% do linear é orçamento de redução de uma ordem
para a etapa que consumia~90% do frame; tempo real é medido separadamente, não é
asserção de desempenho universal no CI.

**Depois:**60s de8×8,3.393quadros/~56FPS, P9533,3ms, sem erros JS; Piscina nessa
execução longa P9525,3ms. Houve1intervalo RAF de441,2ms; o maior update medido foi
80,8ms, portanto a pausa isolada não está atribuída a LOS. Não alegar ausência total
de hitches,60FPS travados, todos os dispositivos ou multiplayer online. Primeiras
amostras de render.calls/triangles eram do pós e não servem como custo da cena.

**Custo declarado:** árvore e proxies de consulta em memória, construída uma vez por
mapa; arrays de vértices/índices compartilhados, nenhum lote de render adicional.
O browser60s ainda vê até1.041draw calls/1.248.982triângulos por frame completo;
otimização de GPU não foi o objetivo nem foi declarada pronta. Evidências e
comandos: `docs/maps/LAJES-PERFORMANCE.md`; artefatos locais em
`artifacts/lajes-performance/`. Build e invariants sem falha crítica nova. Audio:check local mantém limitação do pack privado; integração remota em andamento na PR517.
