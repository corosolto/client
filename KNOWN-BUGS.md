# BUGS CONHECIDOS — CORO SOLTO: Treta Suprema

> Estado revisado: **2026-08-18**. Só entra aqui defeito com **evidência**: `arquivo:linha`, saída de
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
DÍVIDAS:  VM1, VM3, VM9, VM12, VM20, VM16, VM18, VM19, BOT8, CHR1, CHR3,
          CHR4, CTF1 (KNOWN-RED.json — não reprovam, mas continuam devidas)
AVISOS:   VM15, BOT2, CHR5B fora do alvo
PULADAS:  4 (exigem browser ou arnês ausente)
```

Colado de uma execução real de **17/08** (`npm run check`, que roda `eval:vm` antes das
invariantes — ver BUG-02). **Zero vermelhas reprovando**: as 13 antigas viraram dívida
declarada em `KNOWN-RED.json` (continuam devidas, não reprovam), TEX1 ficou VERDE (as 10
superfícies do fy_quebrada ganharam albedo) e a VM14 saiu do vermelho em 17/08 quando as
duas armas do fundo do canal do corrego subiram para as cabeceiras das pontes. Na mesma
rodada a wave 3 do BUG-54 fechou: `eval:occluders` 0/0/0 nos 10 mapas.

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

### BUG-51 · erro de extensão ou beacon virava bug do jogo

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

### BUG-40 · Míticos deformados, semanticamente errados e sem grip funcional — ABERTO 10/08

**Sintoma (do dono, com 49 capturas da tela real):** *"TEM Varios problemas nos
personagens, o boto ta com as maos esquisitas nenhum segura as maos dieito na arma,
varios tao com formato de balao um bug antigo"*. Nas figuras, Boto é um homem de terno
com mãos alongadas em vez do golfinho rosa; Lobisomem é um homem comum; Cuca tem a malha
rasgada; armas flutuam, atravessam mãos ou ficam presas fora da pegada em vários membros
do time. A descrição antiga de lobo-guará foi explicitamente revogada pelo dono: a
referência válida é o lobo preto, forte e dentuço em `references/mitico/lobisomem/`.
Prévia Mint nova aprovada em 10/08: *"agora sim o lobisomen ficou top"*; o GLB foi
integrado e passou pela captura do runtime, mas a frente Mítica continua aberta pelos
outros personagens e pelos portões descritos abaixo.

**Evidência automática inicial:** `node tools/eval/mythic-character-check.mjs` mede
9/9 GLB e 9/9 PBR, mas só 8/9 com skin; `bandeirante` tem zero skins. O resultado prova
também que a régua vigente está incompleta: ela aprova identidade visual errada e não
mede o grip que aparece na seleção.

**Régua antes do conserto:** `tools/eval/mythic-character-check.mjs` para arquivo/skin/PBR;
`tools/eval/select-inflate.mjs` para deformação GPU no caminho da seleção;
`tools/eval/select-mount.mjs` para montagem da arma no mesmo caminho. Falta acrescentar
uma sonda de identidade/proveniência e provar as mutações antes de trocar os assets.

**Lobisomem, estado medido em 10/08.** O auditor do Blender
(`tools/blender-character-audit.py`) confirma skin nativa e bind com os pés no chão; a
`Icosphere` vista pelo importador foi refutada como hipótese — é helper do Blender e não
existe na cena glTF. No caminho real da seleção, `select-mount` passa a shotgun nas duas
mãos; o mutante `--mutate=tras` reprova o contato da mão de apoio. A captura nova da
`select-inflate --fotos` mostrou outro defeito que o enquadramento antigo escondia: o
plano `y=0` cortava as duas pernas porque os cinco clipes afundavam o corpo (pior caso
medido: `-0,2692 m`). O gerador de `foot-offsets.json` agora aceita acima do teto **só**
os pares do Lobisomem conferidos em imagem; `npm run feet:check` sai 0 e
`--mutante=semverificados` sai 1 recolocando os cinco na lista de suspeitos. A revisão
adversarial aprovou o item de engine depois do A/B: antes não havia patas; depois, patas,
dedos e garras aparecem inteiros sobre o piso.

**Ainda não está verde por decreto.** `select-inflate` mede `32,6` arestas ruins/10 mil
contra teto `23,6`, embora a figura posada não mostre o antigo formato de balão; a hipótese
de morfologia foi localizada com `--diagnose`: as arestas que dobram se concentram em
`Head`, `LeftHand` e `Curl_R/L`; perna, quadril e torso não aparecem entre os oito ossos
dominantes. Isso refuta balão corporal, mas ainda não autoriza exceção sem uma referência
monstruosa aprovada. A revisão adversarial também reprovou a
brasilidade: a silhueta lê como lobisomem de fantasia genérico, e
`references/mitico/lobisomem/` ainda não tem `FONTE.md`. Não afrouxar o teto nem inventar
adereço sem decisão do dono.


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

### BUG-59 · 18 personagens desta branch sem mídia do redesign (avatar/webm/resultado) — ABERTO 17/08

**Evidência:** `eval:redesign` UIA1/UIA4/UIR1 vermelhas desde o merge da main (alpha.147,
17/08). A régua da main exige avatar `.webp`, vídeo de seleção `.webm` e artes de
vitória/derrota para TODO o elenco — os 18 personagens que esta branch acrescentou
(mítico + facções novas: boto, cuca, curupira, saci, lampião, gilbomes, camera-roxa…)
não têm o lote. UIR1 cobra i18n nos textos dinâmicos novos.

**Onde fecha:** na branch de místicos/models que o dono pediu em 17/08 ("uma das branchs
colocar os misticos so e remodelar tudo que tiver errado com os models") — o pipeline é o
da `faction-pipeline`. Não afrouxar a régua: ela está certa, a mídia é que falta.

### ~~BUG-61 · Merge de 17/08 quebrou o build do site e nenhuma régua viu~~ · RESOLVIDO 18/08

**Sintoma:** `npm run build` (e o dev server) falham com *Closing tag '</div>' has no matching
opening tag* em `src/pages/index.astro:997`.

**Causa raiz:** o merge `0040c73` achatou o `set-preview-wrap` da main (que tinha dois divs
internos) num `aside` vazio desta branch e sobrou um `</div>` sem abertura. Antes do merge o
painão de settings era 41/41 divs balanceado; depois, 8 abre × 9 fecha.

**Por que um dia de build quebrado passou em branco:** `npm run build` **não está no
`check:fast`** — o portão mede o jogo e as docs, não o deploy. Evidência: a vermelha apareceu
em 18/08 no primeiro build manual pós-merge. A régua que faltou acender: **build como passo do
portão** (candidato a entrar no `check:fast`).

**Antes × depois (18/08):** antes — `astro build` morre em CompilerError. Depois — remoção do
`</div>` órfão, `Server built in 8.49s`, prune roda. Commit `60604fa`. A mutação que prova a
régua futura é o próprio estado quebrado: um merge que perde uma abertura de tag tem que
reprovar o portão no mesmo dia, não no próximo build manual.

### ~~BUG-60 · Regen de grafite de UM mapa apaga os outros nove do layout~~ · RESOLVIDO 18/08

**Sintoma:** `public/js/graffiti_layout.js` ficou com **1 de 10 mapas** (só `ferro_velho`) no
meio do regen pós-merge de 17/08. `tools/eval/graffiti-layout-check.mjs` M1 vermelha para 9
mapas ("chama grafitar mas não está no layout").

**Causa raiz:** `tools/gen-graffiti-layout.mjs` extraía o JSON do `GRAFITE` da primeira `{`
até o `lastIndexOf('}')` do arquivo — que desde a issue #82 é o fechamento do `GRAFITE_FP` no
rodapé, não do `GRAFITE`. `JSON.parse` lança (*Unexpected non-whitespace character after
JSON*), o `catch` vazio zera `anterior` ("recomeça") e o regen de um mapa só grava aquele
mapa. A feature "preservar os outros" (comentário do próprio tool) nunca funcionou com o
rodapé FP no arquivo; ninguém notou porque os regens anteriores eram sempre de TODOS os mapas.

**Antes × depois (18/08):** antes — layout 1/10 mapas · 413 peças · M1 9× vermelha ·
`check:fast` 72/83. Conserto: fim do JSON por casamento de chaves (string-aware), rejeitando
o rodapé. Depois — regen **individual** dos 9 mapas (cada execução exercita o preserve: 829 →
1156 → 1204 → … → 2993 peças acumulando, nunca perdendo mapa), check **10/10 mapas ·
2993 peças · manifesto fresco** verde, `check:fast` **76/83** sem vermelha nova. A mutação
que prova a régua foi a própria árvore quebrada de 18/08: a saída do tool com o defeito É o
vermelho que a M1 acusa.

### BUG-55 · Escala dos barracos/models errada no Lajes e no Córrego — ABERTO 17/08

**Sintoma literal do dono (teste de 17/08):** lajes — *"o melhor em textura. mas barracos
e model estao com escala errada"*; córrego — *"melhor em questao de mapa, mas mesmo erro
de escala, e sem muito detalhes"*.

**Régua: nenhuma ainda.** A candidata: medir a razão entre a altura do barraco/porta no
GLB posicionado e a referência humana (porta 2,00–2,20 m, pé-direito de barraco 2,4–2,8 m
— `references/favela/lajes-rio/FONTE.md` tem o cálculo de largura; estender para altura).
O harness já resolve bounding box por prop (`asset-integrity`), falta a cláusula de
escala relativa ao jogador (1,70 m de olho). Escrever a régua ANTES de reescalar.

### BUG-56 · Mansão do Joá é o mapa mais low-poly — jogabilidade boa, visual reprovado — CORRIGIDO EM ARQUIVO 18/08, aguardando olho do dono

**Sintoma literal do dono:** *"esta bom como mapa pessimo visualmente mais lowpoly de
todos, usar carros que temos em glbs e tambem gerar models no mint gg pro jardim, casa"*.

**Conserto (worktree swarm/bug56-mansao):** a frota procedural virou GLB do acervo
(Delorean DMC-12, Mini Cooper S, Golf R32 — os mesmos ids/fichas do `map_havan.js`,
escala de fábrica, colisor das 3 vagas preservado, `carroGenerico` rebaixado a fallback
de `?glb=0`/node) e o pack Mint "Mansão do Joá — jardim e casa" (6 props: banco
modernista, poste, escultura, vaso tropical, lounge, lampião de fachada) foi integrado
com colisor próprio por prop. Registro: `mansao_jardim_pack` em `mint-assets.json`.

**Réguas:** `tools/eval/mansao-glb-fit.mjs` (NOVA) mede a bbox real de cada GLB escalada
como o jogo escala e compara com o colisor declarado — 8/8 verde; mutante `--mutante=glb2x`
(dobra a malha medida) → 8/8 ESTOURA, exit 1. O primeiro vermelho dela foi o vaso
(base rígida 0,67 m sobre colisor 0,60 m): colisor corrigido para 0,70 m — malha ≤ col +2 cm
continua valendo, teto não afrouxou. O contrato `mansao-water-check` ganhou 6 cláusulas de
frota GLB e 4 mutantes novos (`carros-glb-ausentes`, `carro-glb-clonado`, `carro-glb-gigante`,
`vaga-sem-colisor`), todos mordendo a cláusula certa, exit 1 comprovado. Verdes preservadas:
`map-check fy_mansao` (MAP1 dentro 0, CTF2 ≥2 rotas), `pickup-check` (sem alcance 0),
`eval:map-new`, `eval:asset-integrity` (pack segue a forma dos 4 packs existentes: sem
`finalSha256`, proveniência no `source`), validador Khronos ad hoc 6/6 GLBs 0 erros.

**Antes×depois (3:2, `tools/eval/asset-evidence/bug56-{antes,depois}/fy_mansao/`, A/B por
`tools/eval/ab-pixel.py`):** `cars-front-close` 9,4% dos pixels mudados concentrados no
terço central (os 3 carros GLB); `garden-eye` 3,1% (postes/bancos/vasos no caminho de
pedras); `facade-garden` 1,1% no centro (lampiões na fachada); `interior` 0,0% (intocado,
como esperado). A métrica de bordas do `ab-pixel.py` foi consertada: contava
`len(getdata())` = todos os pixels, sempre 100%/100% — réguas decorativas não entram.

**Dívidas declaradas:** (1) o pedido "casa" foi atendido na FACHADA (lampiões) — o interior
segue procedural (contrato verde, mas sem props Mint); (2) `grafite-layout-check` VERMELHO
em fy_mansao até o regen do integrador (`npm run grafite fy_mansao` é dele); (3) o vermelho
preexistente de `camera-roxa` no asset-integrity não é desta frente (arquivo e registro
intactos no diff); (4) o A/B é quantitativo — **nenhum agente desta sessão olhou as figuras**
(modelo sem visão): a aprovação visual é do dono, por screenshot, como sempre.

### BUG-57 · Ambiência real só existe no Lajes — todos os mapas precisam — ABERTO 17/08

**Sintoma literal do dono:** *"ele tem ambiencia real coisa que nenhum dos outros mapas
tem, horizonte, animais, animacoes no ceu, precismoa disso em todos os mapas"*. Também:
córrego — *"precisa gerar jacare no mintgg e a capivara, pode usar glbs de mesa de bar"*;
lajes — *"falta colocar uns cachorro caramelo e mais animais como ratos"*.

**Régua: parcial.** `eval:ambience` (AM1-AM10) cobre fy_lajes/fy_corrego/fy_escadao.
Falta: (1) estender o contrato para os 10 mapas do registro — mapa sem `ambience`
declarada reprova; (2) horizonte (`makeHorizon`) e vida de céu viram cláusula; (3) fauna
por bioma (jacaré+capivara no córrego, caramelo+ratos a mais no lajes).

### BUG-58 · Lajes é a régua visual de favela, mas está labiríntico e grande demais — ABERTO 17/08

**Sintoma literal do dono:** *"mapa esta muito labirintico e confuso apesar que os becos
estao reais"*; *"talvez deixar becos e escadas, melhorar a escalas dos barracos de favela,
e simplificar o mapa, nao fazer tao grande"*; e a consagração: *"o lajes e a regua de
favela visualmente ... e o mais bonito de todos"*. Campinho: *"otimo como mapa, precisa
ser estruturado visualmente como o lajes"*.

**Leitura:** manter becos/escadas (reais), reduzir a extensão total e o número de
ramais; a decisão de arte do lajes vira o padrão dos mapas de favela. A régua de
circuito (LC1-LC6) já mede conectividade — falta um teto de COMPLEXIDADE (nº de ramais /
área total / decisões por travessia) medido contra o que o dono aprovar na versão
simplificada.

### BUG-54 · Lajes tem pele de favela sobre planta de caixas e perdeu a jogabilidade roof-first — ABERTO 16/08

**Sintoma literal do dono, após jogar a R18:** *"a textura e de favela, mas o mapa nao,
ainda parece um monte de caixa amontuada sem nexo nenhum"*; *"a ideia era o mapa ser de
sinper e todo mundo jogar de lages, mas tb poder cair por becos apertados"*; *"as escadas
estao esdruxulas, nenhuma favela tem escada assim"*. Na rodada seguinte ele explicitou que
o fluxo entre lajes precisa de acessos de madeira e de um pulo mais alto.

**Reprodução:** screenshots 3:2 do teste do dono em 16/08 mostram os dois spawns no chão,
um corredor central de 7,2 m, três ilhas superiores sem rede contínua e três lances retos
de 30 degraus tratados como objetos soltos. A régua antiga ficou verde porque contava três
acessos, três escadas e detalhe cultural; ela não media qual camada domina a travessia nem
a largura e o encaixe urbano do caminho inferior.

**Referências e regra:** `references/favela/lajes-rio/FONTE.md` registra becos publicados
de 0,8–1,5 m, rede local proposta de 2 m, usos sociais da laje e a gramática de navegação
vertical do guia oficial de Favela. A tradução jogável está em `plans/10-LAJES.md`.

**Régua vigente:** `eval:lajes-spatial` reprovou o estado recebido em 6/6 cláusulas e
agora mede no `Game` real: spawns a 5,20 m, duas rotas superiores independentes, caminho
curto 100% acima de 4 m, becos p50 1,81 m/p90 1,86 m, três escadas de dois lances e ápice
local de 0,806 m contra 0,586 m no controle. Os mutantes `spawn-beco`, `rota-unica`,
`beco-avenida`, `escada-reta` e `pulo-global` ficam vermelhos. `eval:lajes-gap` mede as
13 passarelas na `Box3`; `map-check fy_lajes` confirma dez níveis alcançáveis pelo corpo
e pelo A*, zero penetração e zero borda alta aberta.

**Estado:** corrigido em arquivo, aguardando o teste visual/jogável do dono. As seis
capturas 3:2 vigentes estão em `tools/eval/asset-evidence/maps/fy_lajes/`; o bug não fecha
por placar nem por nota de quem construiu.

**Teste do dono, R26 em 16/08 — visual aprovado, gameplay reaberto:** *"visualmente o
mapa está incrivel. esta muito proximo do que queriamos"*. Essa aprovação preserva a
direção de arquitetura, materiais, fiação, pipas, pombos e ratos. No mesmo teste ele
reportou quatro bloqueadores: *"o mapa ta em boxes procedurais eu atiro pra frente e bate
tiros no ar"*; *"tem um ponto que eu ficava caindo pra cima da laje de novo e depois no
chao tem um bug ali"*; *"nao da pra saber os limites do mapa"*; e o fluxo entre a rota de
lajes e o ataque inferior ficou confuso. Evidência: screenshots 3:2 em
`/Users/ruben/Desktop/screenshots/Screenshot 2026-08-16 at 17.* (2).png`.

**Leitura do fonte, ainda sem régua de reprodução:** `map_lajes_authored.js:128-137`
coloca toda caixa invisível `MAT.proxy` também em `world.occluders`, e
`game.js:2923-2928` atira contra essa lista; portanto portas, janelas e recortes visuais
dos GLB continuam sólidos para a bala. `map_lajes_authored.js:321-337` ignora o `yRef`
que `_updatePlayer` passa em `game.js:4857-4882`, então uma consulta feita por quem está
abaixo ainda pode devolver a laje de 5,20 m. Os limites físicos terminam em x ±15,5 / z
−39..39, mas o casario visível continua fora deles (`map_lajes_authored.js:491-511`),
criando caminho que parece aberto e termina no clamp invisível. As caixas independentes
dos segmentos de beco (`:194-219`) também podem se sobrepor nos retornos; localizar os
pares exatos em que isso bloqueia a passagem ainda depende de um probe caminhando com o
`_collide` real.

**Régua ausente que impede consertar por palpite:** falta um gate que (1) compare o
primeiro hit dos proxies com a superfície visível carregada no navegador; (2) caminhe o
térreo com `_collide` e `groundHeightAt(..., yRef=0)`; (3) mute a camada para reproduzir
o salto térreo→laje; e (4) prove que todo limite aparente tem fechamento físico visível.
Os portões atuais medem o grafo declarado, não esses quatro comportamentos.

**Rodada R27 (16/08, noite) — réguas escritas, estado vermelho medido, conserto em
andamento nesta mesma árvore (não commitado):**

- **Régua de bala (browser):** `npm run eval:occluders` sonda raios dos waypoints a
  0,5/1,3/1,62 m comparando o primeiro hit de `world.occluders` com a primeira malha
  VISÍVEL. Estado recebido: **977 raios tiro-no-ar em fy_lajes (33%)** e vermelho nos
  10 mapas (ferro_velho 36,3%, loja_h 17,5%, quebrada 18,6%, praca 38 grupos-letra-morta
  + escadão 34). Mutantes `occluder-invisivel|proxy-inflado|grupo-sem-raycast|vao-fechado`
  aplicam e ficam vermelhos.
- **Régua de circuito (node):** `npm run eval:lajes-circuito` — o térreo tinha **14
  componentes conexos** e os pés das três escadas em três ilhas; `groundHeightAt`
  ignorava o `yRef` (sob tábua/mirante devolvia 5,20 m para quem estava no chão e o
  snap de gravidade teleportava o corpo para cima — o "caindo pra cima da laje" do dono,
  reproduzido em harness). Mutantes `ignora-yref|ramal-fechado|rota-inferior-partida`.
- **Conserto em Lajes:** occluder = malha visível (casas instanciadas do PropBatch entram
  em `occluders`; corpo dos blocos vira collider puro; muros de beco/escada/perímetro
  agora são malha visível); `groundHeightAt(x,z,yRef)` multinível pela regra da Havan;
  mirantes viraram pilotis com túnel andável de 2,1 m; esquinas por mitra de muros
  (fim da caixa independente por trecho); muro de perímetro visível nos 4 lados; faixas
  de fachada do chão à laje em cada bloco (empilhamento); fascia/remendos nas bordas;
  caixas d'água com variação preta/azul + PVC; cachorro caramelo (Quaternius CC0 tingido)
  no circuito inferior. Resultado medido: **tiro-no-ar 977→0, atravessa-parede→0**,
  circuito 96-97% contíguo, LS1-LS6 e LC1-LC5 verdes com os 8 mutantes mordendo.
- **Fecha só com o dono:** a rodada de capturas 3:2 e o crítico adversarial estão na
  evidência (`tools/eval/asset-evidence/maps/fy_lajes/`); o teste jogável é dele.

**Rodada de 17/08 — wave 3 fechada e commitada:** `eval:occluders` **VERDE 0/0/0 nos 10
mapas**. fy_mansao 123+35→0 (vidro sai de occluders, carros/brises/ripados/pote entram),
fy_campomorro 64→0 (o TERRENO do morro passa a parar bala; ruas, portas salientes,
arquibancada e traves idem), fy_corrego 2→0, piscina_treta 1→0, quebrada já media 0.
Padrão novo nos addBox dos 4 mapas: `opts.bala` registra occluder visível sem colisor
próprio. VM14 saiu do vermelho (as 2 armas do fundo do canal do corrego subiram para as
cabeceiras das pontes). O grafite do fy_lajes voltou (a chamada morreu na troca de builder
— audit 0 no ar/0 tapadas) e `eval:ambience` rodou pela primeira vez com o cachorro,
13/13. Segue aguardando o teste jogável do dono.

### ~~BUG-52 · Loja H: fachada sem tinta acima da linha do olho~~ · RESOLVIDO 13/08
> **Numeração em colisão (merge 17/08):** as entradas abaixo vieram da `main`, que
> numerou BUG-52..57 em paralelo a esta branch. Os números da main foram mantidos
> com o sufixo `(main)` — não confundir com os BUG-52..58 desta árvore.

### ~~BUG-54 (main) · wallpaper do loading quebra em alta resolução (#292)~~ · RESOLVIDO 16/08

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

### BUG-53 (main) · O redesign novo tinha mídia completa, mas integração e régua continuam erradas

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

### ~~BUG-52 (main) · O indicador de dano apontava 180° pro lado errado~~ · RESOLVIDO 12/08

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

### ~~BUG-53 (main) · Loja H: fachada sem tinta acima da linha do olho~~ · RESOLVIDO 13/08

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
a zero. Com a correção: **57,5% · 28% · 54,4%** (49/90 a 5,0 m). Auditoria irmã: no-ar
reais 20 (controle) → 26, todos na classe pré-existente de peça em base de coluna/poste
(y ≤ 1,7); zero peça flutuante nas faixas novas. Piso da `graffiti-census` para loja_h
subiu 43 → 50 (o censo varia ±6 pontos entre execuções). Fotos olhadas: pixo correndo na
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

### ~~BUG-53 · Mansão: 18 peças de pixo MORTE fósseis no layout, e duas réguas que liam ausência como saúde~~ · RESOLVIDO 14/08

**Sintoma (medido):** `graffiti-audit` reportava `OK fy_mansao 0 peças` — verde com zero
peças medidas. Atrás disso: `map_mansao.js` importava `grafitar` mas **nunca chamava**
(o chamado original, `c3ede3e`, foi removido quando o pool tinha `folha-pixaca-01.png`,
o pixo que lê "MORTE"), e o `gen-graffiti-layout.mjs`, ao não achar passada, **mantinha
a entrada anterior** — então o layout assado seguiu com 18 peças do pixo vetado,
meses depois da fonte limpa, invisível para o `grafite-editorial` (que só media o MORTE
na fonte, não no assado).

**Causa (a mesma classe, três instrumentos):** degradação calada. O gerador preservava
fóssil (`continue` silencioso), a auditoria lia `0 peças` como OK, e o editorial não
medeia o assado da mansão. Qualquer um dos três sozinho teria denunciado; os três juntos
deixaram o veto editorial valendo só no papel.

**Correção:** (1) `map_mansao.js` volta a chamar `grafitar` com pool sem o pixo-01
(`folha-pixaca-03/04/05`, mesma banda e chance do chamado original); (2) o gerador agora
**apaga a entrada** de mapa sem passada e sai com código 1 listando os mapas
(`sem passada` vira erro alto, não aviso); (3) a auditoria marca RUIM qualquer mapa com
**0 peças medidas** — ausência nunca mais lê como saúde; (4) o editorial mede o MORTE no
layout assado da mansão, com mutante `--mutante=morte` que reprova (prova de que morde:
exit 1 no mutante, exit 0 no real após o rebake — 15 peças, pool limpo).

**Bônus medido na mesma rodada:** as faixas de pano penduradas em arame na Quebrada
("ETERNAMENTE", "DA LESTE VIVE") eram nomeadas `mural:` e a auditoria as cobrava como
arte de parede — 100% no ar por construção (é pano no arame, decisão de arte de 06/08).
Renomeadas para `faixa:` (`map_quebrada.js:1199`), com `faixa` incluída no `NAO_PINTA`
e na varredura de vagas ocupadas da passada.

### BUG-47 · Doidinho: P90 vira blob/pistola e desaparece no medium — CORRIGIDO EM ARQUIVO, AGUARDA RECAPTURA 11/08

**Sintoma (laudo externo limpo, 0/2):** *"a P90 não existe nos pixels como P90"* e
*"em `medium` a arma é invisível"*. No `grip`, o crítico não encontrou carregador superior
longitudinal, corpo bullpup/trilho, arco fechado do punho dianteiro nem contato verificável da
mão dianteira.

**Palpite refutado:** a P90 raw não estava ausente nem remodelada como pistola. O Blender mostra
carregador superior e dois arcos; o GLB preserva os spans desses marcadores. O caminho real usava
o porte funcional de `4°`, quase na direção da câmera do capturador: os `0,52 m` projetavam só
`0,110 m`, enquanto a M4 aprovada no mesmo quadro projetava `0,178 m`.

**Correção mínima:** somente o mount visual de `doidinho-bairro` usa yaw `-18°`; roster, GLB,
escala e balística permanecem intactos. A projeção medida sobe para `0,292 m`. A prova Blender
3/4/walk/crouch mostra carregador, corpo bullpup, dois arcos e mão dianteira no arco.

**Régua:** `npm run eval:pilot-system` mede marcadores, projeção contra a M4 aprovada, ID e
contato da mão; `npm run eval:pilot-grip` recalcula SHA e distâncias Blender. Seis mutantes
causais ficam vermelhos. Evidência em `tools/eval/asset-evidence/doidinho-bairro/grip/`.
Sem browser nesta passada: o arquivo está pronto para recaptura, não autoaprovado.

**Bloqueador adicional do segundo crítico limpo:** P90, rig, clipes e roupa passaram, mas a
gambiarra grande e branca no ombro leu como disco placeholder. A extensão da régua ficou
vermelha antes do passe (`luma 1,000`, `0,203×0,397 m`, centro lateral `0,113 m`).
`tools/blender-doidinho-meter-prop.py` compactou só a gambiarra em `0,72×`, levou-a ao centro
traseiro da mochila e retexturizou carcaça teal + aro cobre + dial escuro + seletor vermelho.
Depois: luma `0,165`, chroma `0,180`, projeção `0,101×0,262 m`, centro `0,065 m` e frente
`-0,042 m`. Os mutantes `doidinho-disco-branco` e `doidinho-prop-ombro` ficam vermelhos.

### BUG-46 · Programador: caneca/mouse mudam peito→ar→quadril e ocultam a mão de apoio — CORRIGIDO EM ARQUIVO, AGUARDA RECAPTURA 11/08

**Sintoma (laudo externo limpo, 0/2):** *"a mesma caneca aparece agora na altura do
quadril/coxa, também sem ponto de fixação visível"* e *"caneca e mouse aparecem colados no meio
do peito, ocupando [...] exatamente a região onde a mão de apoio deveria aparecer"*. A M4 e a
mão traseira foram aprovadas e não devem ser reabertas.

**Causa medida:** caneca, mouse, trackball e cabo estavam no plano frontal e pesados em
`Spine02`, portanto orbitavam com o peito e cobriam a mão de apoio. A primeira execução de
`eval:pilot-system` ficou vermelha: frente `+0,243 m` e `0%` dos vértices rigidamente em Hips.

**Correção mínima:** `tools/blender-programador-prop-sockets.py` move somente esses props para
o quadril lateral/traseiro e atribui seus vértices a `Hips:1`. Depois: frente máxima
`-0,027 m` e `100%` de `2.396` vértices rígidos. A M4, teclado, corpo e rig ficaram fora da
seleção. A figura Blender 3/4 mostra a mão dianteira no handguard; o A/B desloca só a arma.

**Régua:** `npm run eval:pilot-system` + `npm run eval:pilot-grip`; mutantes `prop-peito`,
`prop-solto` e `arma-deslocada` ficam vermelhos. Recibo, backup e figuras em
`tools/eval/asset-evidence/programador-virado/`. Sem browser nesta passada: aguarda recaptura
e nota externa.

### BUG-45 · Motoca: capacete ainda lê como blob/lâmina e telefone como slab — CORRIGIDO EM ARQUIVO, AGUARDA RECAPTURA 11/08

**Palavras do reporte:** *"pixel reprovou queixeira como lâmina preta horizontal/projeção
frontal apesar HARD verde."*

**Reprodução antes do conserto:** `npm run eval:charhard` passa 7/7 porque HARD4 mede apenas
a largura da faixa frontal. No GLB servido, a ponta projetada da queixeira tem razão frontal
largura/altura 3,10; a vista frontal do Blender mostra a placa preta atravessando o queixo.
O preto não é erro de shader: o material `CS_HARD_` e o albedo quase preto já passam HARD1–3.
Régua nova deve medir forma/projeção frontal e ficar vermelha antes de remodelar o capacete.

**Antes × depois medido:** HARD8 entrou primeiro e reprovou o canônico em `3,10:1`.
`tools/blender-motoca-front-profile.py` selecionou somente 127 vértices da ponta frontal do
material `CS_HARD_Motofrete_Helmet_Black`, compactou X em `0,52×` e recuou Y em 4 mm; bag,
telefone, demais materiais e rig não foram tocados. O canônico novo mede `1,61:1`, largura
frontal `0,051 m`, mantém casco `0,240 m`, aro `0,255 m` e visor em chroma `0,007`.
Recibo: `tools/eval/asset-evidence/motoca-cachorro-loko/front-profile-receipt.json`;
antes/depois e vistas Blender ficam no mesmo diretório.

**Régua e mutação:** `npm run eval:charhard` passa HARD1–HARD8. O mutante
`--mutante=queixeira-frontal-lamina` amplia apenas a projeção medida e reprova HARD8; os cinco
mutantes anteriores também reprovam suas cláusulas próprias (inclusive
`queixeira-lamina`, recalibrado para recompor os ~0,30 m depois da compactação). Khronos valida
o GLB com zero erros e a integridade confere o SHA
`56011f4a77d4d5726c32c8257de39db36c7b8121a7b7ba2d86076b4c6957f9ce`.

**Reaberto por nota externa limpa:** a primeira compactação passou HARD8, mas os pixels ainda
mostraram *"placa cinza chapada"*, *"massa preta amorfa envolvendo mandíbula/nuca"* e telefone
como *"retângulo ciano chapado"*. Isso provou que razão geométrica isolada continuava cega.

**Segunda régua, antes do segundo conserto:** a máscara frontal Blender `360×463` passou a
medir abertura facial, continuidade da silhueta e corpo/suporte/tela do telefone. O estado
anterior ficou vermelho por não ter peças explícitas de shell/chin/hinge/mount e por tela com
luma `0,655`. `tools/blender-motoca-rebuild-helmet-phone.py` removeu somente os triângulos
antigos desses artefatos e criou calota contínua, queixeira espessa em U, viseira levantada
ligada por dobradiças e telefone escuro menor com tela fraca, berço e correia. Bag, jaqueta,
M4, corpo e rig ficaram fora da seleção.

**Depois medido:** abertura facial `65,6%`, maior componente do casco/queixeira `100%`,
silhueta do capacete `63×143 px` no frame de prova, corpo/suporte do telefone `91,5%` dos
pixels e luma da tela `0,030`. `npm run eval:charhard` passa 8/8; `eval:motoca-visual` passa
8/8. Os seis mutantes geométricos anteriores e três novos (`casco-fechado`,
`casco-rompido`, `telefone-slab`) ficam vermelhos. Recibo, backup, máscara e vistas Blender
estão em `tools/eval/asset-evidence/motoca-cachorro-loko/`.

**Limite declarado:** as figuras offline foram olhadas pelo builder, não aprovadas por ele.
A correção só fecha visualmente depois da recaptura do runtime e de nova nota adversarial.

### BUG-41 · Time Mítico aparece como caixas ou T-pose na seleção

**Palavras de quem reportou** (Ruben, screenshot 09/08): *"tem varios personagens que
estao low poly ainda e os mapas tambem. esta ruim. especialmente esse time de miticos"*.

**Evidência visual.** Com Lampião selecionado, o palco 3D mostra cabeça, tronco e membros
como paralelepípedos; a arma também é procedural. A lista lateral mistura esse fallback
com miniaturas detalhadas em T-pose, portanto o defeito não é direção de arte uniforme.

**Censo antes do conserto.** Os nove arquivos existiam, mas `GLB_CHARS` cadastrava só seis.
Todos os seis Mint tinham material PBR e `0 skins`; Lampião, Lobisomem e Zumbi eram raws sem
normal, UV, material ou textura, com centenas de milhares de triângulos. Ativá-los como
estavam só trocaria caixa por malha branca/preta pesada.

**Estado medido depois da recuperação (09/08).** `GLB_CHARS` cadastra `9/9`; todos têm PBR
e ficam entre 4,4k e 5,0k triângulos. O rig de doador retirou o fallback cúbico de oito:
`8/9` têm skin. O Bandeirante permanece sem skin e sem arma animada, então o portão continua
vermelho. A captura de 09/08 também reprovava o conteúdo que a contagem não enxerga:
Boto ainda é um homem de terno em vez do golfinho rosa pedido,
Lobisomem era humano e a arma da Cuca cruzava o torso. Esses assets exigiam nova
geração/rig no Mint; o Lobisomem já foi substituído pelo lobo preto
aprovado, mas permanece com as pendências de régua/proveniência do BUG-40. Meshy está
vetado porque seus GLBs já renderizaram
pretos e sem anexo de arma neste loader. O MCP Mint desta máquina ainda não oferece escopo
de escrita, portanto isso não está resolvido.

**Régua:** `npm run eval:mitico` (`tools/eval/mythic-character-check.mjs`). Cobra `9/9`
cadastrados, com skin, PBR completo e orçamento de `2,5k–40k` triângulos. Mutações:
`--mutante=fallback|semrig|sempbr`. Estado atual: `9/9 GLB · 8/9 rig · 9/9 PBR`, vermelho
em `bandeirante: 0 skins`.


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

### ~~BUG-42 · "a UI continua a mesma de sempre"~~ · RESOLVIDO 11/08

**Sintoma (palavras do dono, olhando o QA da alpha.58):** *"eu vi seu teste de QA da UI e
ela continua a mesma de sempre"*.

**Reproduzido, e não é cache.** As capturas julgadas mostram o chrome `CORO SOLTO //
TRANSMISSÃO` e a versão `alpha.58`, portanto carregaram o CSS e o módulo novos. Mesmo assim,
o fluxo preserva as composições antigas: menu em coluna à esquerda, facções em cartões,
personagem em filmstrip vertical + ficha + preview, mapa em cabeçalho + foto + strip e
configurações no mesmo painel tabulado. O diff confirma a causa: a rodada acrescentou a
classe `.cine-surface` às telas, 164 linhas de CSS decorativo e um chrome persistente, mas
não substituiu a estrutura dos fluxos principais.

**Falha da régua:** `tools/eval/cinematic-ui-contract-check.mjs` mede presença de chrome,
metadados de capítulo, superfície, foco e movimento reduzido. Todas podem ficar verdes sobre
a mesma composição antiga; portanto o portão respondeu "cinematográfica" quando só provou
"tem decoração cinematográfica". O APROVADO visual anterior fica retirado.

**Ordem do conserto:** primeiro uma régua estrutural que fique vermelha neste estado e uma
mutação que restaure uma composição antiga; depois substituir de fato as composições do
menu, facção, personagem, mapa e configurações; por fim capturar novamente em 3:2 e entregar
as imagens a um crítico sem contexto. Não afrouxar o BUG-05: contraste, margem, legibilidade
e navegação continuam valendo dentro da nova estrutura.

**Fechado por composição e captura.** O menu virou deck cinematográfico; setup ganhou
briefing; facções mostram a grade inteira sem rolagem e com adversário estável; personagem
usa palco+dossiê+rail; mapa ficou full-bleed; configurações ocupam o quadro como sistema.
A régua estrutural fica verde e os mutantes `composicao-antiga` e `faccao-rolavel`
derrubam somente suas cláusulas. Um crítico sem contexto aprovou as capturas finais em
3:2, inclusive a passagem adicional em 1280×720. A evidência persistente mora em
`tools/eval/asset-evidence/ui-cinematic/`; não voltar a usar os contatos temporários da
alpha.58 como baseline visual.

### ~~BUG-43 · Quatro mapas novos passaram os contratos e falharam no pixel~~ · RESOLVIDO 11/08

**Sintoma (asset-review independente, 17 PNGs em 1536×1024):** Campo tem
*"teto, piso e paredão quase no mesmo preto"* no galpão; Lajes tem vãos que leem como
*"placa escura contínua"* e um decal reconhecível como Rick Sánchez; Córrego tem capivara
em *"escala sofá/carro"* intersectando pneus e só dois ratos legíveis como ovais; Mansão
tem jardim/interior pobres e três carros reconhecíveis como Mustang, DeLorean e BMW.

**Evidência:** `tools/eval/asset-evidence/maps/fy_campomorro/galpao-interior.png`,
`fy_lajes/{jump-link,roof-route}.png`, `fy_corrego/{capivara,rats}.png` e
`fy_mansao/{facade-garden,interior}.png`. O `eval:map-evidence` estava verde porque mede
frescor, câmera e integridade dos arquivos — não iluminação, silhueta, composição ou veto
editorial.

**Régua antes do conserto:** estender os contratos de Campo, Lajes, Córrego e Mansão com
marcadores da cena real e mutantes nomeados; estender `graffiti-editorial-check.mjs` para
os identificadores protegidos. **Correção mecânica em 11/08:** contratos verdes e todos os
mutantes mordidos; Campo preserva 92% na `field-mouth`, Córrego mede capivara ≤1,85 m e
ratos de 12–15 cm, Lajes mede 8/8 bordas + 3/3 rotas, Mansão mede 3 carros genéricos,
8 bromélias, 2 palmeiras e o interior. **Continua aberto até a recaptura 3:2 e o novo
asset-review independente**; essa etapa pertence ao agente único de browser.

**Reaberto pelo pixel externo (alpha.60).** Um Claude Opus 5 via OpenRouter recebeu apenas
o contato 3:2 e as perguntas editoriais, sem justificativa do builder; recibo literal em
`tmp/map-alpha60-openrouter-review.json`. Reprovou 4/4: no Campo o piso era *"uma cor cinza
uniforme sem textura"* e as faixas laranja pareciam flutuar; em Lajes ainda leu
marinheiro/Popeye, Fusca/VW e pousos sem borda frontal; no Córrego a capivara leu urso/hamster,
os ratos eram clones e o pôster religioso/vulgar permaneceu; na Mansão os carros estavam
distantes, a cunha vermelha lembrava Countach/Testarossa, o jardim parecia catálogo simétrico
e o interior continuava blockout. As novas cláusulas precisam reprovar exatamente esses
estados e seus mutantes antes da segunda correção; evidência fresca e nova nota externa são
obrigatórias para fechar.

**Reaberto novamente pelo mesmo crítico limpo (alpha.61).** No Córrego, escala e folga dos
pneus passaram, mas a capivara ainda era *"corpo elipsoide + 4 cilindros finos + cabeça que
é uma caixa"*; ratos continuaram blobs sem apoio/contexto e o córrego leu como quadra na
mesma cota. Na Mansão, as marcas reais saíram, mas o close revelou carros sem leitura de
roda/vidro/grade, a ilha continuou ambígua, o pergolado flutuava e água/jardim seguiam
chapados. As cláusulas novas medem a geometria servida (não só o marcador): junta e membros
da capivara, paredes de profundidade e contexto dos ratos; peças frontais e três famílias
de carro, distribuição real dos maciços, pilares/vigas, cozinha funcional e home theater.
O bug permanece aberto até recaptura seletiva 3:2 e outra nota externa.

**QA de evidência camera2:** a ilha gourmet finalmente ficou inteira, mas o frame dos
ratos provou que dois animais nasciam dentro dos próprios sacos de lixo e a animação por
`performance.now()` mudava a pose entre máquinas. A régua nova mede interseção real de
`Box3`; o trio foi afastado apenas para a faixa livre junto da mesma manilha e fica estável
quando `mapview` abre com `?capture=<sha>`. O mutante `ratos-sob-lixo` restaura as posições
reprovadas e fica vermelho. Como o fonte de Córrego mudou, os seis frames dele precisam de
recaptura; Mansão não deve ser recapturada nesta passagem.

**Terceiro crítico limpo, após a recaptura:** ratos, canal, jacaré, carros, lounge,
gourmet e theater passaram, mas a capivara ainda leu porco/tapir; a ponte norte era uma
prancha uniforme; `ashtar-meme.jpg` expôs um retrato reconhecível de Vladimir Putin; o
jardim da Mansão permaneceu axial/raro e a piscina transparente mostrava o gramado sob a
água. As réguas novas ficaram vermelhas nesses cinco estados. A correção troca a capivara
por corpo de cilindro com tampas arredondadas, cabeça/focinho rombos e patas curtas; separa
a ponte em tábuas empenadas com lacunas; retira `ashtar*.{jpg,png}` do pool; cria três
maciços tropicais densos e uma cuba opaca acima do gramado. Mutantes: `capivara-tapir`,
`ponte-prancha`, `putin`, `jardim-raro` e `piscina-sem-cuba`. Continua sem aprovação até
recaptura integral ligada aos novos SHAs e outro crítico limpo.

**Fechado pelo pixel, não pelo contrato.** A última captura integral ficou ligada aos
fontes e câmeras atuais; o mutante de `camera-drift` continuou vermelho. O crítico final
sem contexto aprovou Campo, Lajes e Escadão e, numa passagem focal separada, aprovou a
capivara com quatro apoios distintos no chão, a ponte sem rosto/pessoa real e a piscina
com cuba opaca contínua, sem jardim visível sob a lâmina. Os mutantes finais
`capivara-dois-apoios`, `rostos-carecas` e `piscina-cuba-curta` restauram exatamente os
três pixels interceptados na última rodada e ficam vermelhos. Evidência canônica:
`tools/eval/asset-evidence/maps/manifest.json` e os PNGs de `fy_corrego`/`fy_mansao`.

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

#### BUG-25 (5º ciclo) · re-rig dos 10 piores via `rig-meshy.mjs` — 1 verde, 3 melhores, 6 sem caminho (13/08)

Fila dos 10 piores do `select-inflate` (JSON de 12/08, 23/62 reprovados) submetida a
**rig novo do Meshy sobre a MESMA malha** (`tools/rig-meshy.mjs` — 5 créditos/personagem,
esqueleto de 24 juntas idêntico ao das referências mandrake/pagodeiro, texturas
restauradas por `rig-tex-restore`, otimização textura-only 1024/webp). Teto da régua:
p99 ≤ 0,675 · ruins/1e4 ≤ 23,6.

| destino | quem | número |
|---|---|---|
| **verde** | boto | p99 9,90 → **0,611** · ruins 778 → **21,6** |
| melhorou, segue vermelho | curupira 4,70→0,598/32,1 · mariabonita 2,55→0,731/47,5 · lampiao 1,64→1,121/121,5 | ablação `semik` não move: é peso de pele, não IK |
| **revertido** (rig novo PIOR) | cuca 310→1040 ruins · gilbomes 57→373 · esbirro 44→87 | auto-rig piora o que já estava perto do teto |
| **revertido** (rig novo pior NO OLHO) | saci 4,29/607 → 1,34/189 no número, mas a perna virou fita torcida na figura | foto ganha de raciocínio: número melhor, imagem pior |
| não rigável por este caminho | profeta-calcada (Meshy 422 "pose estimation failed") · programador-virado (7 materiais, fora do padrão Mint de 1; o restore interno do `rig-meshy` aborta) | precisam de outra rota (pose/malha primeiro) |

**Lição da rodada:** re-rig automático é alavanca grande só para rig catastrófico
(p99 > ~2); abaixo disso ele troca um skin ruim por outro e pode piorar — medir e OLHAR
cada um, não rodar em lote cego. Placar da régua: **23/62 → 22/62** (baseline completo
re-escrito em `tools/eval/select_inflate.json`).

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

### ~~BUG-44 · `eval:gltf-validator` tenta abrir concepts WebP do `mint-assets` como glTF~~ · RESOLVIDO 11/08

**Palavras do reporte:** *"`eval:gltf-validator` tenta abrir concepts WebP do mint-assets
como glTF."*

**Reprodução antes do conserto:** `npm run eval:gltf-validator` selecionava toda entrada com
`processing.finalSha256`; tentava entregar quatro WebP ao Khronos e saía 1, embora os seis GLB
registrados tenham zero erros. Régua: o próprio `tools/eval/gltf-validator-check.mjs` ainda
não distingue o tipo do artefato. O conserto não pode remover concepts do registro nem
afrouxar a validação dos GLB.

**Causa raiz e conserto:** `finalSha256` descreve integridade, não formato. Os dois gates
usavam essa propriedade para enumerar assets, e o Khronos inferia glTF por posição na lista.
Cada artefato final agora declara `artifactType`; `final-asset-registry.mjs` valida o tipo
contra `files[0]` e fornece a mesma enumeração para integridade e Khronos. Integridade segue
cobrando concepts e modelos; Khronos seleciona apenas `model/gltf-binary`.

**Antes × depois:** antes, quatro WebP falhavam e os seis GLB passavam; depois,
`npm run eval:asset-integrity` confere os onze artefatos finais e
`npm run eval:gltf-validator` confere os seis GLB, com zero erros. Mutações:
`--mutante=inclui-imagem` recoloca os WebP no escopo e sai 1; `--mutante=cabecalho`
corrompe o primeiro GLB e sai 1. Custo declarado: todo novo artefato com hash final precisa
de tipo explícito; tipo ausente ou extensão divergente falha fechado.

### ~~BUG-40 · `npm run dev` não abre outra porta quando já existe um servidor~~ · RESOLVIDO 09/08

**Palavras de quem reportou** (Ruben, 09/08): *"precisamos por um fix na hora de rodar
dev que se a porta tiver usendo usado ele serve de outra porta"*.

**Reprodução antes do conserto.** Com o Astro do próprio projeto vivo em `:4321`,
`npm run dev` encerra com código 0 e imprime apenas `Dev server already running at
http://127.0.0.1:4321`; nenhuma segunda URL é criada. A porta estava ocupada por PID vivo,
portanto não era lock órfão.

**Causa raiz.** O Astro 7 detecta este ambiente de agente e daemoniza automaticamente. O
processo em background consulta `.astro/dev.json` antes de o Vite tentar abrir o socket;
ao encontrar lock vivo, encerrava com código 0. Portanto a capacidade nativa do Vite de
avançar `4321 -> 4322` nunca chegava a rodar.

**Conserto.** `scripts/dev.mjs` inicia o CLI Astro em foreground com `--ignore-lock`. É um
lançador Node, em vez de `VAR=valor` no script npm, para continuar funcionando no Windows.
O Vite segue escolhendo a porta: no caso real, com `4321` ocupada, anunciou e serviu
`http://localhost:4322/`. A instância extra fica deliberadamente fora do lock do Astro e é
encerrada por `Ctrl+C`; `astro dev stop` continua controlando só a instância original.

**Régua:** `npm run eval:devport` (`tools/eval/dev-port-check.mjs`). Planta lock vivo e
socket ocupado num projeto Astro temporário, executa o `scripts.dev` real e exige uma URL
em outra porta. Antes: saída 1, nenhuma segunda URL. Depois: porta ocupada `58402` ->
servidor `58403`, saída 0. Mutação `--mutante=semlock`: saída 1 e mensagem do Astro dizendo
apenas que o servidor do lock já estava vivo. A régua entra no `check:fast` antes dos
portões que podem cortar a corrente.
### ~~BUG-57 (main) · Régua casava literal de formatação e travou TODO deploy da main por meio dia~~ · RESOLVIDO 16/08

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

## Relatos recentes e resolução

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
