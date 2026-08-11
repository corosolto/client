# BUGS CONHECIDOS — CORO SOLTO: Treta Suprema

> Estado revisado: **2026-08-11**. Só entra aqui defeito com **evidência**: `arquivo:linha`, saída de
> régua ou passo de reprodução. Suspeita sem medição vai para o fim, na seção
> *Relatados, ainda não reproduzidos*.
>
> Regra da casa: bug que o dono reporta vira **invariante permanente** em
> `tools/eval/invariants.mjs`. Enquanto não virar, fica aqui com o campo `Régua: nenhuma`.
>
> **Como investigar e como escrever a entrada:** skill `bug-hunt`
> ([`.claude/skills/bug-hunt/SKILL.md`](.claude/skills/bug-hunt/SKILL.md)). O gabarito da
> entrada e o do relatório final estão em
> `.claude/skills/bug-hunt/references/gabaritos.md`.

**Quality gate na data deste arquivo** (`node tools/eval/invariants.mjs`, ~10-12 min):

```
CRÍTICAS: 39/52 passam  ← VM1, VM3, VM9, VM12, VM20, VM16, VM18, VM19,
                          BOT8, CHR1, CHR3, CHR4, TEX1 VERMELHAS
AVISOS:   VM15 fora do alvo
PULADAS:  4 (exigem browser ou arnês ausente)
```

Colado de uma execução real de **05/08** (`npm run check`, que roda `eval:vm` antes das
invariantes — ver BUG-02). **Continuam 13 vermelhas**, e continuam todas de viewmodel,
personagem e textura: o total foi de 49 para 52 porque entraram invariantes novas, e os
nomes mudaram (VM5/VM18b viraram VM9/VM20). Nada da rodada de captura/spawn de 05/08
(BUG-06, BUG-32) aparece aqui — as duas réguas novas moram no `check:fast`.

Duas reprovações do `check:fast` que **não são defeito de código de jogo** e que cortam a
corrente de `&&` se ficarem no meio dela: `anims:check` (BUG-15, `public/models/anims/`
não versionado) — por isso ele foi para o FIM do `check:fast` em 05/08 — e `feet:check`,
que reprova enquanto houver mudança de personagem não regenerada na árvore
(`npm run feet`).

Mudou em 04/08: **CHR5B saiu do aviso e ficou VERDE** (27/44 personagens sem mapa de
superfície → 0/44) e entrou a **CHR7** (convenção de skin), verde — daí 49 e não 48.
**TEX1 ficou vermelha** por 10 superfícies grandes e claras sem albedo, **todas no
`fy_quebrada`**, que é mapa em obra — não é regressão de personagem.
CHR1/CHR3/CHR4 seguem exatamente como estavam (conferido personagem a personagem: a
lista de "balão" do CHR1 tem os mesmos 13 antes e depois).

---

## P0 — quebram o jogo ou mentem para quem mede

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

### BUG-39 · site fora do ar: edge servindo main.js de um deploy com fparms.js de outro

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

---

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

### BUG-36 · Ctrl+W fecha a aba no meio da partida (Windows/Linux)

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

**Duas saídas; a primeira foi MEDIDA E DESCARTADA.** `plans/02-BOTS-E-MODELS.md:285`
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

### BUG-01 · Bandeiras de CTF aparecem no HUD em partida de rodadas

**Sintoma (do dono):** mapas em modo *rounds* mostram a faixa de bandeiras no HUD, sem existir
captura nenhuma.

**Causa raiz — confirmada.** `#ctf-hud` nasce escondido (`src/pages/index.astro:589`,
`class="hidden"`) e `_updateCtfHud()` faz `classList.remove('hidden')`
(`public/js/game.js:4161`) **sem nenhuma guarda**. Não existe, em lugar nenhum do repo,
um `add('hidden')` para esse elemento — `grep -rn "ctfHud\|ctf-hud" public/ src/` devolve 5
ocorrências e nenhuma esconde. O `if (this.ctf)` de `game.js:2011` protege só a *criação* das
bandeiras (`_initCTF`), não a visibilidade do HUD.

**Reprodução:** jogar uma partida de CTF → voltar ao menu → iniciar partida de *rounds*
**sem recarregar a página**. A faixa continua visível, com o HTML da partida anterior.
Efeito colateral visível: `public/style.css:578` (`#ctf-hud:not(.hidden) ~ #killfeed{top:114px}`)
empurra o killfeed 38 px para baixo no modo errado.

**Correção:** guardar a exibição por modo em `_updateCtfHud()` e esconder + limpar o
`innerHTML` na saída de partida (junto do bloco `game.js:6112-6124`, que já esconde 12 outros
elementos e esqueceu este).

**Régua:** nenhuma. `tools/eval/mode-check.mjs` passa 16/16 porque compara *modo escolhido ×
modo jogado*, não *modo jogado × HUD desenhado*. Precisa de cláusula nova (`UI`), com mutação.

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

### BUG-03 · BOT8 — bot com linha de visão no jogador por segundos, sem atirar

**Medido:** `4 episódios | maior silêncio 4,23 s | 690 s em condição`. Vermelha desde o
baseline, nunca atacada (era C9 no handoff anterior, com 2,7 episódios / 3,03 s — **piorou**).

**Causa raiz — confirmada.** `public/js/game.js:5361`:

```js
const hasTurn = !(BOT_FAIR && e.isPlayer) || this._duelToken(b);
```

Essa `const` é avaliada **todo frame, para todo bot cujo alvo é o jogador**, antes de qualquer
gate de "pode atirar" (o `if` só vem em `game.js:5363`). E `_duelToken` não consulta: ele
**reserva** o token por `BOT_TOKEN_HOLD`. Um bot em atraso de reação, recarregando, ou sem
linha de tiro, rouba um dos 2 tokens e o segura. Os outros recebem `hasTurn === false`,
continuam avançando e **atravessam o campo de visão sem disparar**.

**Correção:** mover a chamada para dentro do `if`, depois dos gates de munição/LOS/mira.

**Régua:** BOT8 já existe e morde. Basta rodar depois.

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
   numa resolução. A correção certa é escala fluida (`clamp()`/`vh`), e ela **está bloqueada pela
   régua**: `caixaDe()` (`tools/eval/ui-check.mjs:563`) lê `font-size` com `parseFloat`, e a UI3
   só isenta elemento de canto ancorado em PX (`emPx`, mesma linha de raciocínio em :637).
   Com `vh`/`clamp()` a UI3 mede caixa de 3,9 px e fica **cega**. **Ordem correta: ensinar
   `px()`/`caixaDe()` a resolver `clamp()/min()/max()/vh` — com mutação — e só depois tornar a
   escala fluida.**
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
- **CHR3** — pés fora do chão: 24 afundando, 32 flutuando.
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

### BUG-15 · `public/models/anims/` não é versionado

`git ls-files` devolve vazio para o caminho. `TPM1` falha em qualquer clone limpo e o CI fica
vermelho por motivo que não é código. **Sem a pasta no deploy, todo personagem congela em
T-pose** — e `glbchars.js:196-209` engole a falha em silêncio.

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

### BUG-18 · O trabalho de duas semanas nunca saiu desta máquina · **o mais grave da lista**

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

## Relatados, ainda não reproduzidos

- **BUG-41 · `crypto.randomUUID` derruba presença em navegador incompatível (#143).**
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

- **BUG-37 · Tarja vermelha de CRASH por um erro que não é crash.** Print do dono, 07/08,
  com o menu de pausa aberto (`RESUME ▶` no canto):
  *"⚠ CRASH (promise): The fetching process for the media resource was aborted by the user
  agent at the user's request."*
  **Régua: nenhuma.**
  Essa mensagem é o `AbortError` padrão de um `<audio>` cujo `play()` estava pendente
  quando alguém chamou `pause()` ou trocou o `src` — acontece em toda troca de faixa e em
  todo fade de saída. **O defeito não é o áudio: é o overlay de crash tratar isso como
  crash.** O handler está em `src/pages/index.astro:27` e mostra QUALQUER
  `unhandledrejection` numa tarja vermelha pedindo print. Um jogador levando "CRASH" na
  cara por causa de música que trocou é ruído que ainda por cima treina todo mundo a
  ignorar a tarja — inclusive quando ela for de verdade.
  **O que já foi conferido e NÃO é a origem:** os `play()` do `startMenuMusic`
  (`main.js:206-216`) têm todos tratamento de rejeição, e o `_sample` do `audio.js:46`
  também (`.catch(() => off())`). Falta achar quem produz a promessa solta — o
  `stopMenuMusic` pausa por fade (`main.js:222-228`) e é candidato, mas não foi medido.
  **Próximo passo:** régua que abra a rota, force troca de faixa/pausa e exija zero
  `unhandledrejection`; depois filtrar `AbortError` de mídia no overlay, mantendo tudo o
  mais visível.

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
