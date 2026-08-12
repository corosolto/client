# v2 — trilha de tarefas para fechar o release

> Cole isto inteiro como primeiro prompt numa sessão nova do Claude CLI, na raiz do repo
> (`/Users/ruben/game`, branch `v2/alpha`). É auto-contido.
> Estado do scan: `2.0.0-alpha.25`, portão **39/52**.

---

## CONTEXTO MÍNIMO

FPS de navegador em **Three.js r160 vanilla, zero build** (`public/`), site **Astro SSR**
(`src/`), **Supabase** para ranking, deploy na **Vercel**. Sátira cultural brasileira.
44 personagens, 26 armas, 5 mapas. A v1 fez 1000 jogadores/dia.

**Este projeto tem dois produtos e os dois fecham nesta trilha:** o jogo, e a
**instrumentação de IA que o constrói**. O segundo não é acessório — é o que está
documentado em `/docs`, é o que atrai contribuidor e é o assunto que o dono apresenta em
público. Bloco 2 é ele.

Item que não bloqueia nenhum dos dois vai para `KNOWN-BUGS.md`, não para o diff.

### Regras da casa (não viole, cada uma custou dias)

1. **Régua antes do conserto.** Escreva a medição, prove que ela reprova o estado atual, só
   então conserte.
2. **Teto de invariante só entra com procedência**: arquivo de referência, número medido, e o
   script que reproduz. Número sem medição é opinião. Padrão em `tools/eval/ref-measure.py`.
3. **Toda invariante nova ou alterada vem com uma mutação que a faz ficar vermelha.** Régua
   que não morde não existe.
4. **Nenhuma crítica verde pode virar vermelha.** Rode o portão antes e depois.
5. **Não reduza o número de armas no chão** (veto do dono: é a única forma de escolher arma).
6. **`AUD1` tem que ficar verde.** É ela que garante que o auditor mede o que o jogo desenha.

### Comandos

```bash
npm run check          # portão completo, 10-12 min
npm run check:fast     # cadeia rápida
npm run eval:ctfhud    # 0,4 s     npm run eval:pegada   # 0,4 s
npm run eval:spawn     # 5 s       npm run audio:check   # 4,5 s
```

### NÃO TOQUE (outro agente está nisso agora)

A migração **MIT → AGPL**, que envolve 16 ocorrências em 8 superfícies: `LICENSE`,
`package.json`, `README.md`, `CONTRIBUTING.md`, `src/pages/index.astro`,
`src/pages/sobre.astro`, `public/llms.txt`, `docs/docusaurus.config.js`.

### Decisões já tomadas pelo dono (não relitigar)

- **As vozes de meme são a identidade do jogo e ficam.** Não proponha substituir.
- **A trilha musical é outra coisa** e pode ser trocada (T10).
- Mobile mostra aviso em vez de jogo, e isso está certo.
- Multiplayer (WebRTC ou servidor autoritativo) é **v3**. Fora desta trilha.

---

# BLOCO 1 — O que quebra calado em produção

## T1. Asserção pós-fetch no áudio e nos decalques

**Problema medido.** `scripts/fetch-audio.sh` começa com
`if [ -f "$DEST/manifest.json" ]; then exit 0; fi`. Na máquina do dono o arquivo sempre
existe, então **o caminho de download nunca roda e o bug é invisível**. Na Vercel é checkout
limpo toda vez. Se o `curl` falhar, o fallback copia `manifest.example.json` e **o build
passa**, com o jogo sem tiro real e sem voz, caindo no sintetizado, sem erro nenhum. Mesma
estrutura em `fetch-decals.sh`, com 175 decalques virando 404. Já é BUG-19.

**Faça.** Depois do fetch, conte arquivos e chaves do manifest e **falhe o build** abaixo do
esperado, com mensagem dizendo o que faltou.

**Aceite.** Aponte a URL para um endereço inválido e mostre o build **reprovando**. Se
passar, a tarefa não está feita.

## T2. Tirar os 163 MB de código morto do publicado

`dist/client/models/fpvm` = **163 MB**, maior que props (112 MB) e characters (24 MB). Só
carregam com `?tripovm=1` — `public/js/fparms.js:106` faz `if (!TRIPO_VM) return` antes de
baixar.

**Aceite.** `du -sh dist/client` antes e depois. Jogo abre normal sem `?tripovm=1`.

## T3. Build limpo, do zero

`rm -rf dist .astro node_modules && npm ci && npm run build`, com as asserções da T1 ativas.

**Aceite.** Confira no `dist`: `models/anims` (sem ela todo personagem congela em T-pose e o
loader engole a falha em silêncio), `wasm/resvg.wasm` (sem ele toda `/u/*` sai sem
og:image), `audio/` com manifest real, `img/decals/`.

---

# BLOCO 2 — AI ENGINEERING (a instrumentação é produto)

> Contexto: são **150 scripts** em `tools/eval`, **52 invariantes**, **32 skills** em
> `.claude/skills`, e um `/docs` público que já explica o loop. O que falta abaixo é o que
> transforma isso de "método que funciona na cabeça do dono" em **infraestrutura que
> sobrevive a ele** — e é o material que ele apresenta em público.

## T4. `tools/eval/mutate.mjs` — mutation testing automatizado

**Por quê.** A técnica que mais pegou defeito neste repo: **quatro invariantes cegas**
achadas quebrando o código de propósito. A pior lia a *declaração* de uma constante em vez
do *uso*, e um mutante que desfazia a correção inteira passava **20/22 VERDE**. Hoje cada
mutação é feita **à mão, uma por vez**, o que significa que o portão pode apodrecer sem
ninguém notar.

**Faça.** Um catálogo de mutantes por invariante (um arquivo declarativo: invariante →
patch → qual régua deveria ficar vermelha). O script aplica, roda, restaura, e reporta:

- mutantes que **mataram** a régua correspondente (bom)
- mutantes que **sobreviveram** — ou seja, **invariante cega** (o achado)

**Aceite.** Rodando hoje, ele acha pelo menos os buracos já conhecidos e documentados
(`knifeRot`, pose de ADS, escala por arma). Se não achar, o catálogo está incompleto.

**Feito (issue #86, 08/2026).** `tools/eval/mutate.mjs` + catálogo declarativo
`tools/eval/mutantes.json`: `npm run eval:mutate` aplica cada mutante, roda a régua alvo
(`AUD1`) e restaura em `finally` — SIGINT/SIGTERM restauram via handler, provado com
`--demo-interrompe` (git fica limpo). Catálogo atual: 3/3 mutantes MATAM a AUD1
(`knifeRot`, `_adsPose.pistol`, escala por arma) — os três buracos documentados mordem.
Mutante novo = edit só no JSON, zero mudança no motor.

## T5. Skill `regua` — irmã do `bug-hunt`

**Por quê.** `.claude/skills/bug-hunt` já codifica *"bug que o dono reporta vira invariante
permanente"*, com gabarito. Falta a metade que ensina **como escrever a invariante**: a lei
da procedência, o teste de mutação obrigatório, e o formato da evidência (evidência com
número, não passa/falha seco).

**Faça.** `.claude/skills/regua/SKILL.md` + `references/gabaritos.md`, no mesmo padrão do
`bug-hunt`, com os casos reais desta base como exemplo (a VM12 medida em pixel, a VM9 que
sobreviveu não-medida, a AUD1 que nasceu do mutante).

**Aceite.** Um agente novo lendo só essa skill consegue escrever uma invariante que passa nos
critérios 2 e 3 das regras da casa.

## T6. `docs/LICOES.md` — memória entre sessões

**Por quê.** Todo agente novo redescobre as mesmas armadilhas. Hoje isso mora espalhado
entre `AGENTS.md` (215 linhas) e comentário no código.

**Faça.** Arquivo curto, **uma linha por lição + o caso real que a gerou**, lido no começo
de toda sessão. Mínimo a incluir:

- intenção que não vira invariante é otimizada para fora (16/21 → 19/21, look destruído)
- teto sem procedência é opinião (3 dias contra y ≥ 0,66; medido era 0,51–0,60)
- régua que não morde está cega (4 invariantes cegas, mutante passando 20/22)
- `game.js` é campo minado (6.525 linhas, 26% do código — faixas disjuntas)
- número sem imagem já enganou este projeto quatro vezes
- `VM18` é malha, não parâmetro (duas grades, 768 e 1280 pontos, refutadas)

**Aceite.** Referenciado no `AGENTS.md` e no `CONTRIBUTING.md` como leitura obrigatória.

## T7. Log de custo por frente

**Por quê.** Não existe registro de quanto custa cada frente, então **não dá para decidir
onde vale gastar**. A página de custo do `/docs` é colada à mão de execuções reais; isso a
torna número vivo.

**Faça.** Registre por frente: **tokens, chamadas de ferramenta, e delta de invariante**
(quanto o portão mexeu). Formato simples — um JSONL em `tools/eval/custo.jsonl` serve.

**Aceite.** Uma frente registrada com as três medidas. Frente que gasta 300 K e não mexe no
portão fica visível como o que é: frente que produziu texto.

## T8. `tools/eval/README.md` — contrato vs arqueologia

**Por quê.** 150 scripts, com várias gerações aposentadas convivendo (`audio-probe1..5`,
`g2r7`/`g2r7b`/`g2r8`, `p1-*`). Agente novo não sabe o que é contrato e o que é ruína.

**Faça.** Catálogo marcando cada script: **contrato** (roda no portão), **ferramenta**
(usada sob demanda) ou **arqueologia** (mantida por histórico). Os JSON de contrato são
versionados de propósito — explique por quê.

**Aceite.** Todo `.mjs` e `.py` de `tools/eval` classificado.

## T9. O portão deixa de ser tudo-ou-nada

**Problema.** O portão leva **10-12 minutos** e roda tudo sempre, então na prática ele roda
no fim do dia em vez de a cada mudança. E `check:fast` é uma **cadeia de 14 `&&`**: um passo
instável no meio (`anims:check`, `feet:check`) esconde tudo o que vem depois — tanto que
esses dois já foram empurrados para o fim por causa disso.

**Faça.** Duas coisas:

- `--only VM,CHR,MAP` para rodar subconjunto, e **cache por hash de entrada** (não reavaliar
  personagem se nenhum GLB mudou)
- trocar a cadeia de `&&` por um runner que roda **todos** e reporta sumário no fim

**Aceite.** Rodar só `VM` leva segundos. Um passo falhando não esconde os outros treze.

## T10. Job `portao` no CI, comentando o placar no PR

**Problema.** `ci.yml` roda só `syntax`, `arch:check` e `build`. **As 52 invariantes,
`botsim`, `ui-check` e `mode-check` não rodam em PR nenhum.**

**Faça.** Job que roda `npm run check` e **comenta no PR**: `39/52 → 41/52`, com o diff de
quais invariantes mudaram de estado.

**Por que importa mais do que parece:** é isso que remove discussão de gosto da revisão. Pro
especialista que se quer atrair, saber que o PR dele é julgado por número é o maior atrativo
do repo.

**Aceite.** Um PR de teste recebe o comentário com o placar.

## T11. O bot cruza `docs/issues/` com o diff do PR

**Por quê.** Pedido explícito do dono: *"conferir quais issues já são resolvidas nesse PR"*.
É possível **porque as 15 issues deste repo já foram escritas com critério de aceite
objetivo** (`char-probe C7`, `TEX1`, `pegada-check`). Sem isso, seria adivinhação.

**Faça.** No `preview-bot.yml`, um passo que:

1. lê `docs/issues/*.md` e extrai de cada uma o critério de aceite e os `arquivo:linha`
2. cruza com os arquivos tocados pelo PR (`gh api .../files`)
3. para as issues cujo critério é uma régua, roda a régua **antes e depois**
4. comenta: *"toca 3 das 15; a #7 passa a régua (TEX1 verde), a #9 e a #12 continuam
   vermelhas"*

**Segurança, não relaxar:** o job de avaliação usa `pull_request_target` e **nunca** pode dar
checkout no código do fork. A allowlist atual (reprova qualquer toque em `.github/`,
`scripts/`, `package*.json`, `vercel.json`, `src/pages/api/`, `supabase/`, `.env`, ou > 3000
linhas) fica como está.

**Aceite.** Testado num PR real, com o comentário correto.

## T12. `skills:check` — o hash que ninguém confere

`skills-lock.json` tem SHA-256 por skill e **nada verifica**. É a issue 12 do próprio repo.
Enquanto isso, o lock é documentação, não garantia.

**Aceite.** Altere uma skill de propósito e mostre reprovando. Entra no `check:fast`.

## T13. Playwright destravando o que está pulado

**Por quê.** Playwright já é dependência, já tem `playwright.config.mjs` e `tests/web`, e
**quase não é usado**. É a peça que destrava, de uma vez: as 4 invariantes `PX1`–`PX4`
puladas, o `gl-metrics` (T15), o teste de layout em EN (T21) e captura visual automática.

**Faça.** Escolha **duas** das `PX*` e implemente. Não as quatro — o objetivo é abrir o
caminho, não fechar a categoria.

**Aceite.** Duas `PX*` saem de "pulada" para verde ou vermelha por mérito.

## T14. Régua de game feel

**Por quê.** Não existe número para o que define se o jogo é CS ou é outra coisa. E o
`botsim` é determinístico e já simula partidas — ele consegue produzir isso hoje.

**Faça.** Meça, sem definir teto ainda (regra 2 — medir antes): time-to-kill por arma, tempo
de saque, tempo até o primeiro tiro, distância média de engajamento. Grave a tabela.

**Aceite.** Tabela publicada. Teto só na próxima rodada, com a referência na mão.

## T15. `gl-metrics` na corrente do portão

São 52 invariantes e **nenhuma mede tempo de frame**. `tools/eval/gl-metrics.mjs` existe, já
usa Playwright + Chromium, e não está nem no `check` nem no `check:fast`.

**Faça.** Ligue na corrente com teto por mapa. **Meça primeiro, escolha o teto depois.**

**Aceite.** Vermelha quando você degrada de propósito, verde no estado atual.

## T16. `ferramental-e-custo` entra no `/docs`

Existe uma página escrita (modelos, ferramentas, MCPs, skills, custo medido) que **não está
no site**. O `/docs` explica *como* o trabalho é feito e não diz *com o quê* nem *quanto
custa* — que é justamente a parte que ninguém publica.

**Aceite.** Publicada, no sidebar, com o build do Docusaurus rodando.

---

# BLOCO 3 — Medir antes de escalar

## T17. Quatro campos novos na telemetria

A rota `/api/telemetry` e a migration 012 já existem. Falta o que coletar:

1. **bytes até o primeiro frame jogável** — soma de `transferSize` de
   `performance.getEntriesByType('resource')`
2. **FPS mediano da sessão** e o **percentil 10**
3. **string da GPU** — `WEBGL_debug_renderer_info`
4. **tier de qualidade efetivo**, e se caiu para `low`

Sem PII, sem nick. Respeite o rate limit existente.

**Aceite.** Uma partida local grava as quatro colunas.

---

# BLOCO 4 — Destravar canais

## T18. Auditar os 30 arquivos da trilha

`public/audio/soundtrack/` tem 30 arquivos, 104 MB, incluindo instrumentais de música
comercial (*Charlie Brown Jr — Lugar Ao Sol*, *Chief Keef — Faneto*, *Blitzkrieg Bop*). É o
que o **Content ID do YouTube e da Twitch** pega — e o prejuízo é do **streamer** que jogar,
o que sabota o canal de divulgação por criador.

**Faça.** Tabela dos 30: `livre` / `licenciado` / `substituir`, com a fonte de cada
julgamento, em `public/audio/soundtrack/SOURCES.md`, no formato de
`public/audio/cc0/SOURCES.md` (que já é o padrão da casa). Para os de substituir, proponha
alternativa livre.

**NÃO TOQUE nas vozes de personagem.** Decisão do dono.

## T19. Rate limit nas três rotas que não têm

`badge/[...path].png.ts` (147 linhas, roda resvg-wasm, foi a rota do SSRF), `leaderboard.ts`
e `online.ts` não chamam `rateLimit`. As outras seis chamam. A `badge` é a que mais vai
receber crawler.

**Aceite.** Rajada recebe 429 nas três. Cache agressivo na `badge`.

## T20. `hreflang` e sitemap por idioma

O i18n EN entrou com rotas por idioma e sem `hreflang`, então PT e EN competem entre si.
`Cache-Control` já foi feito em `/ranking`, `/u/*`, `leaderboard`, `online` e `config` — não
refaça.

**Faça.** `hreflang` recíproco, sitemap dos dois idiomas, `og:locale`. Estenda
`tools/eval/seo-check.mjs` para `/characters` EN e `/docs`.

---

# BLOCO 5 — Primeira impressão

## T21. Varredura de layout em EN

O i18n entrou e **a UI nunca foi olhada em inglês**. `.cs-setup` tem largura fixa,
`#btn-jogar` é sticky. Estouro de layout em EN é o defeito mais provável do release.

**Aceite.** Menu, HUD, placar e resultado conferidos em EN, em duas resoluções.

## T22. Tela de erro

Se um GLB falhar ou o contexto WebGL cair, hoje o jogador vê preto. Mensagem e botão de
recarregar, em PT e EN, cobrindo `webglcontextlost` e falha de GLB.

## T23. A tela de mobile vira captura

`main.js:253` e `:475` detectam mobile e mostram aviso. Metade do tráfego de LinkedIn abre
no celular, e hoje isso é **100% de perda**. Vídeo curto, botão de Discord, campo de e-mail.

## T24. Controles no primeiro minuto

Não existe tela de controles nem tutorial. Overlay na primeira partida, dispensável, com
`localStorage`.

## T25. Formulário de feedback e link do GitHub

Dois pedidos antigos do dono que nunca entraram.

**Feedback:** rota `POST` em `src/pages/api/`, honeypot, rate limit (**reaproveite o que já
existe**, não invente outro), destino por variável de ambiente. **Se a variável faltar,
responda 503 com mensagem clara** — não finja que enviou. Documente em `.env.example`.

**GitHub:** link no rodapé do site, no menu do jogo e no README.

---

# BLOCO 6 — Repo pronto para colaborador

## T26. `npm run setup`

Quem clona pega um jogo **sem som e com textura faltando** (`public/audio/`,
`public/img/decals/` e `references/` estão no `.gitignore` por decisão do dono). Está
documentado — mas documentar não conserta a primeira impressão, e o especialista que
interessa fecha a aba em vez de debugar setup.

**Faça.** `install` → `fetch-audio` → `fetch-decals` → `copy-wasm` → `check:fast`, e ao fim
**imprime o que faltou e por quê**.

## T27. `ASSETS.md` — procedência

Modelador 3D profissional **não contribui arte** para repo com asset de origem duvidosa.
Hoje há sample do CS, modelo Mint/Tripo, e o `.gitignore` admite graffiti de "procedência
incerta".

**Faça.** O que é CC0, o que é gerado, o que é de terceiro e sob que termo, o que é meme e
fica só no pacote local. Onde não souber, escreva `procedência não verificada`.

## T28. Issues no GitHub + seção WANTED

As **15 good-first-issues** estão em `docs/issues/` e nunca foram abertas. E falta o outro
lado: especialista não quer "adicione um botão".

**Faça.** Abra as 15. E crie **WANTED** no `CONTRIBUTING.md` com os três problemas que
precisam de especialista, cada um com a medição, o critério e **o que já foi descartado** —
é isso que faz um profissional confiar que não vai perder tempo:

- **CHR1** — 18 personagens compartilham UM esqueleto (o do `mst`, transplantado por
  auto-skin). Raio de skin: mandrake 0,087 m contra 0,135–0,171 nos outros, **1,55× a
  1,97×**. Aceite: `char-probe` C7, esqueletos distintos ≠ 1 e raioSkin50 ≤ 0,10.
- **VM18/VM20** — 12 armas com espessura abaixo do piso medido no CS 1.6 (shotgun 0,269 ·
  carbine 0,296 · sks 0,343 contra piso 0,427). **Já refutado com número:** duas buscas em
  grade (768 e 1280 pontos) e a hipótese de escorço (`vm-orto.mjs`). É malha, não parâmetro.
- **`fy_pool_day` em MeshLambert**, que não aceita normalMap. Precisa de alguém que **meça**
  o custo de converter para Standard em máquina fraca.

## T29. Discord

Jogo multiplayer sem comunidade não retém, e é onde os primeiros 100 fiéis vão morar. Link
no menu do jogo, no site e no README.

---

# BLOCO 7 — Release

## T30. Rollback

Em `docs/RELEASE.md`: URL do deploy anterior fixado, comando exato de reversão, e o que
conferir depois de reverter.

## T31. Soft launch de 24 h

Suba em produção **sem anunciar**. Peça para os 5 contribuidores e uns 20 amigos jogarem.
Fique olhando a telemetria da T17.

**Aceite.** Relatório curto: bytes por sessão (mediana e p90), FPS mediano e p10,
distribuição de GPU, taxa de erro, e onde as pessoas param de jogar.

**É este relatório que decide** se os assets precisam sair da Vercel para um CDN de egress
zero. Estimativa de hoje: ~60 MB por sessão × 10 mil jogadores/dia ≈ 18 TB/mês, que na banda
da Vercel sai na casa de US$ 2.500/mês e num CDN de egress zero sai perto de zero. **Não
decida por estimativa — decida por esse relatório.**

## T32. `KNOWN-BUGS.md` no fim

Placar real do portão e o que ficou de fora, com motivo. Deve estar registrado:

- re-rig dos 18 personagens (CHR1) — precisa de asset novo
- VM18/VM20 — precisa de malha nova
- postura do coach quântico (36,0°) e do dollynho (66,9°) contra mediana 86,5° do elenco
- BOT8 — bot com linha de visão > 1,5 s sem atirar
- `fy_pool_day` sem normal/roughness (MeshLambert)
- destino do cliente Godot (382 arquivos versionados)
- multiplayer — é v3
- refatorar `game.js` (6.525 linhas, 26% do código) — depois do release, com portão verde
  antes e depois

---

# ORDEM E CRITÉRIO DE PARADA

Faça **na ordem dos blocos**. O Bloco 1 é o único que, se ficar de fora, quebra o release em
silêncio — e silêncio é o pior modo de falha, porque o jogador não reclama, ele fecha a aba.

O Bloco 2 é o que fecha o **outro** produto. Ele não bloqueia o deploy, mas é o que o dono
apresenta em público e o que faz o repo receber contribuição boa. Não trate como opcional.

Depois de cada bloco: `npm run check`, e reporte `CRÍTICAS: n/52` antes e depois.

**Se só der para fazer cinco:** T1, T2, T15 (o jogo não quebra e o dono fica protegido depois
que postar) e T4, T10 (o método para de depender da memória de quem estava presente).
