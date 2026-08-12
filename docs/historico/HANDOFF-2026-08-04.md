# CORO SOLTO: Treta Suprema — handoff para continuar o trabalho

> Cole isto inteiro como primeiro prompt numa sessão nova de CLI, na raiz do repo
> (`/Users/ruben/game`). Ele é auto-contido: assume que você não viu nada do que veio antes.

---

## O QUE É

FPS de navegador em **Three.js r160 vanilla, zero-build**, em `public/`, servido por um site
**Astro com SSR** na raiz (`src/`), com **Supabase** para ranking. Sátira cultural brasileira:
petistas, bolsonaristas, tribos urbanas, palhaços, funkeiros. 44 personagens, 26 armas, 4 mapas.

A v1 chegou a 1000 jogadores/dia com gráfico nível Minecraft. A v2 quer o nível de
**jogabilidade, uniformidade e animação do CS 1.6** — não é fidelidade de CoD, é consistência.
Frase do dono: *"sem padrão visual, consistência gráfica e de movimentos e animações não
adiantaria de nada"*.

O dono se chama Ruben. Ele responde em português, joga em **3:2**, e revisa olhando screenshot.
**Ele está certo com muito mais frequência do que a métrica.** Quando ele diz que algo está
errado e o quality gate está verde, o defeito é do quality gate.

---

## AS DUAS LEIS DA CASA — leia antes de escrever uma linha

Elas não são estilo. Cada uma custou dias e está documentada no código com o caso real.

### Lei 1 — Intenção que não vira invariante é otimizada para fora
Uma rodada levou o quality gate de **16/21 para 19/21 sem afrouxar um único teto** e mesmo assim foi
reprovada pelo dono: para fechar duas invariantes, ela zerou em silêncio o `VM_OFF` e destruiu o
look que ele havia escolhido e comparado lado a lado. Ver `tools/eval/invariants.mjs` (bloco da
VM12), que nasceu exatamente disso.

### Lei 2 — Teto sem procedência é opinião
Três dias foram gastos resolvendo contra números **asseridos**: *"a boca do cano fica em
y ≥ 0,66"* e *"a coronha inteira no canto"*. Quando os frames de referência foram finalmente
**medidos** (`tools/eval/ref-measure.py`), os dois estavam errados: no CS 1.6 a boca fica em
**0,513–0,598** e a coronha **SAI pela quina inferior direita**. O solver tinha "provado" que a
área era inviável porque estava empurrando a arma para baixo para satisfazer um teto que a
referência contradiz.

**Regra que ficou: todo teto novo cita arquivo de referência + pixel medido + o script que
reproduz o número.** Leia a docstring de `tools/eval/ref-measure.py` — ela é o padrão de
qualidade desta base.

### Corolário — teste de mutação da própria régua
Um quality gate que não se mexe quando você quebra o código de propósito está **cego**. Caso real: um
mutante que desfazia inteiramente a correção do enquadramento passava **20/22 VERDE**, porque a
invariante lia a *declaração* de uma constante e não o *uso*. Outros três buracos iguais foram
achados depois (rotação da faca, pose de ADS, escala por arma).

**Toda invariante que você escrever ou alterar tem que vir com uma mutação que a faz ficar
vermelha.** Se ela não morde, ela não existe.

### Protocolo de trabalho
- **Régua antes do conserto.** Escreva a medição, prove que ela reprova o estado atual, só então
  conserte. Foi isso que destravou armas, personagens e mapas depois de rodadas perdidas.
- **Quem constrói nunca dá a nota.** Antes de considerar uma frente pronta, rode um crítico
  adversarial com contexto limpo, cuja tarefa é REFUTAR.
- **Faixas de linha disjuntas** quando houver trabalho paralelo (ver `tools/eval/ARCH.md`).

---

## ESTADO DO PORTÃO (última execução completa — 04/08)

```
CRÍTICAS: 36/48 passam  ← VM1, VM3, VM5, VM12, VM16, VM18, VM18b, VM19,
                          BOT8, CHR1, CHR3, CHR4 VERMELHAS
AVISOS:   BOT1, CHR5B fora do alvo
PULADAS:  4 (exigem browser)
```

> ### ARMADILHA — leia antes de acreditar em qualquer vermelha de VM
>
> **`npm run check` mede o viewmodel com JSON velho.** A ordem é
> `syntax && eval:invariants && eval:vm`, mas as invariantes de VM **leem** o
> `tools/eval/vm_mint_audit.json` que o `eval:vm` **escreve** — e como as invariantes saem 1,
> o `&&` corta antes de regenerar. O JSON congela.
>
> Em 04/08 ele estava em `V0=80° / vmOff=[0.03,-0.23,0]` contra o `game.js` em
> `V0=42° / VM_OFF=[0.03,-0.10,0]`. Efeito: **VM5 acusava 26/26 armas fora (1,1-4,5% de tela);
> depois de `npm run eval:vm`, 3/26 (6,3-12,8%)**. VM1 caiu de 26/26 para 2/26 e VM9 ficou verde.
>
> **Rode `npm run eval:vm` ANTES de `node tools/eval/invariants.mjs`. Sempre.** Quem pegou isso
> foi a `AUD1` — é por isso que ela é intocável (ver VETOS). Consertar a ordem é o BUG-02.

`node tools/eval/invariants.mjs` leva ~10-12 min. Outras réguas: `char-probe.mjs`,
`map-check.mjs`, `mode-check.mjs`, `ui-check.mjs`, `mat-check.mjs`, `pickup-check.mjs`,
`botsim.mjs` (determinístico, 9 sementes), `vm-solve.mjs`, `ref-measure.py`, `ref-overlay.py`,
`ref-ui.py`, `ref-body.py`, `vm-project.mjs`, `vm-orto.mjs`.

---

## O QUE FAZER — em ordem

> **Todo defeito com evidência mora em [`KNOWN-BUGS.md`](KNOWN-BUGS.md)**, com `arquivo:linha`,
> causa raiz e passo de reprodução. Aqui fica só a **ordem** e o que é decisão, não defeito.

### A0. O que o dono pediu em 04/08 (nenhum item começou)

**A0.1 — UI não bate com as telas de referência.** `references/telas/` (9 PNGs do GPT) é o
alvo; o medido está em `tools/eval/ref_ui.json`. Dois desvios sistemáticos: **cor** (tokens
`--bg-*` azuis h≈253° contra marrom-neutro h 84-129° da referência) e **escala** (corpo 1,8%
da altura contra 1,17% medido; margens 1,4-2,2% contra 4,5/3,1/3,5%). O bloqueio conhecido é
que metade dos scrims do HUD é `rgba(5,8,11,…)` **literal** no CSS — token e literal mudam no
mesmo commit ou a tela fica bicolor. Exige browser para conferir overflow. → BUG-05.

**A0.2 — `.gitignore`. FEITO em 04/08.** Decisão do dono: *"podem ficar local o references
porque vamos construir local"*. `references/` e `issues/` (2,5 GB) agora são ignorados, e os 28
arquivos que estavam versionados em `references/` foram **destrackeados** (`git rm --cached`;
seguem no disco). Consequência a não esquecer: **quem clonar não tem as telas-alvo da UI**. O
que sobrevive ao clone são os NÚMEROS medidos delas — `tools/eval/ref_ui.json` e
`ref_viewmodel.json`. Se um dia a régua da UI precisar rodar em CI, é daí que ela lê.

**A0.3 — Formulário de feedback que cai no e-mail do dono.** Não existe nada: `src/pages/api/`
tem `avatar, badge, config, heartbeat, leaderboard, register, submit-match` e mais nada.
Decisões antes de codar: provedor de envio (Resend é o de menor atrito no runtime da Vercel),
onde o formulário aparece (tela de pausa e fim de partida pegam o jogador com o problema fresco;
página do site pega quem já saiu), e **anti-spam** — a rota vai ser abusada, então reusar
`src/lib/ratelimit.ts` (já conta no Postgres, não em memória de lambda) em vez de inventar outro.

**A0.4 — Link do GitHub dentro do jogo.** Já existe no **site**
(`src/layouts/Layout.astro:222`, `src/pages/sobre.astro:99`), **não existe no jogo**:
`src/pages/index.astro` não tem um único link externo. Quem entra pelo link direto nunca vê o
repositório. Lugar natural: rodapé do menu principal + tela de pausa. Atenção: o rodapé diz
"Código (MIT)" e essa string morre com o A0.7.

**A0.5 — Multiplayer por WebRTC, com servidor próprio.** Frente nova e a maior de todas: o
usuário cria um servidor, escolhe entre **público (entra numa lista) ou por código (só
convidado)**. Não existe nenhum netcode no repo — `grep -rl "WebSocket\|geckos\|socket.io"` em
`public/js/` e `src/` devolve vazio, e o modelo hoje é client-authoritative com o anti-cheat
vivendo no RPC `submit_match`. Isto **contradiz o plano `plans/03`**, que assumia servidor
autoritativo 4v4. Antes de escrever código, três decisões: (a) topologia — malha P2P ou
host-autoritativo com um par fazendo de servidor; (b) o que faz o *signaling* e a lista de
servidores públicos (é serviço com custo e com moderação, não é detalhe); (c) o que acontece
com o ranking — partida P2P **não pode** submeter no `submit_match` sem repensar o anti-cheat,
ou o ranking morre no primeiro fim de semana.

**A0.6 — `KNOWN-BUGS.md`.** Feito: [`KNOWN-BUGS.md`](KNOWN-BUGS.md), 17 bugs com evidência.
Mantenha vivo — bug que o dono reporta entra lá **e** vira invariante.

**A0.7 — Trocar a licença para AGPL.** Decisão do dono, e **reverte** a recomendação de
`plans/06 §1.2` (que argumentava MIT por causa de Steamworks e de programas de crédito de IA).
Precisa ir junto, no mesmo commit: `LICENSE`, o badge de `README.md:3`, `README.md:155` e `:177`,
`CONTRIBUTING.md:138` (o texto que faz o contribuidor concordar com MIT) e
`src/layouts/Layout.astro:235` ("Código (MIT)"). **Antes de mexer:** licença só troca
retroativamente com consentimento de quem já contribuiu — se houver PR de terceiro mesclado,
isso é levantamento, não linha de comando.

**A0.8 — Revisar `README.md` e `CONTRIBUTING.md`.** Depende do A0.7 (as duas citam MIT), do
A0.5 (o README descreve um jogo só contra bots) e do A0.9 (README e FAQ prometem ranking
global).

**A0.9 — Ranking OFF, telemetria ON. FEITO em 04/08** (`RANKING_ON` em `src/lib/site.ts`,
`supabase/migrations/012_telemetria.sql`, `POST /api/telemetry`, `sendTelemetry()` em
`main.js`). **Falta aplicar a 012 no banco** — junto com a 011, que também nunca subiu.
O contexto que motivou o desenho continua valendo e está abaixo. Decisão do dono em 04/08: *"vamos desabilitar o ranking
por enquanto, depois a gente ajeita; vamos usar o supabase pra monitorar os usuários"* — mais
**quanto tempo cada jogador joga** e **que tipo de mapa**. Não é remoção: é uma **flag**, porque
"depois a gente ajeita" tem que custar uma linha.

O que já existe e o que falta, medido:

| Precisa | Estado |
|---|---|
| tempo jogado | **existe** — `stats.play_seconds` + `p_seconds` no `submit_match` |
| mapa jogado | **não existe no Supabase.** O payload de `main.js:1030` não tem mapa nem modo |
| mapa jogado (Vercel) | **já vai** — `main.js:450` manda `game_start{team,character,map}` |
| facção | **quebrado** — `stats` só tem `matches_p`/`matches_b`; as facções U/C/F caem em nulo |
| cobertura | **parcial** — `if (nick && ...)` (`main.js:443`): quem não digita nick não registra, não manda heartbeat e não submete. É invisível |

O último item é o que decide o desenho: telemetria presa ao nick mede **só quem se registrou**,
e a amostra fica enviesada exatamente para o jogador mais engajado. O caminho recomendado é um
**id anônimo de sessão** no `localStorage`, com o nick anexado quando existir — cobre 100% e
continua servindo o ranking quando ele voltar.

Cuidado que já morde: o `submit_match` tem rate limit de **1 partida a cada 90 s por nick** e
**60 s por IP**. Para ranking isso é anti-cheat; para telemetria é **perda de dado silenciosa**.
Partida curta ou dois irmãos no mesmo IP somem da medição. Se a escrita de telemetria passar
pelo mesmo RPC, ela herda o buraco.

**Páginas `/u/`: desligam junto** (decisão do dono, 04/08), e quando voltarem é **sem nick na
URL** — nick tem caractere especial e vira URL feia e frágil. Metade disso já está pronto e
ninguém usa: a rota canônica **já é `/u/<id>/<nick>`**, com `/u/<nick>` legado respondendo
301 (`src/pages/u/[...path].astro:30`). Quem ainda monta o link legado é o **cliente**:
`main.js:1139` faz `/u/${encodeURIComponent(nick)}`. Ao religar, monte a partir do `id` — que é
o que a migration `004_leaderboard_id` criou justamente para isso.

### O CORTE ALPHA × BETA (decisão do dono, 04/08)

Perguntado sobre o que do plano original entra agora, ele cortou assim:

| Frente | Ciclo |
|---|---|
| **Multiplayer WebRTC** | **ALPHA — P0.** Subiu de "frente nova" para prioridade máxima |
| UI/HUD AAA (`plans/04`) | alpha |
| Bots, viewmodel, áudio, telemetria | alpha |
| **Harness / skills de IA (`plans/05`)** | **beta** — sai do caminho crítico |

Duas consequências que não são óbvias:

1. **Multiplayer P0 e `plans/03` contraditos ao mesmo tempo.** O plano de multiplayer que
   existe defende servidor autoritativo (é o título da §1: *"Por que servidor autoritativo e
   não P2P"*). A decisão é P2P/WebRTC com servidor do usuário. Não dá para "seguir o plano 03
   com prioridade alta": ele precisa ser reescrito antes de virar tarefa.
2. **Não vai pro ar ainda.** O objetivo declarado é **testar local** se as correções de
   personagens, armas, mapas, áudio e UI estão de pé. Rode com `npm run dev`; o
   `public/audio/` completo só existe nesta máquina (ver BUG-19).

### A0.10 — MAPA NOVO: "QUEBRADA" (spec do dono, 04/08)

Rua reta e comprida, cheia de becos e vielas para cobertura. Nas duas pontas:

- **Rotunda do baile** (uma ponta): 2 carros tunados + caixas de som. É a praça.
- **Campinho de terra** (outra ponta): respawn do time oposto.
- Ao longo da rua: **ônibus parado com ponto**, **bar brasileiro com cadeira de plástico na
  calçada**, **barricadas**, casas majoritariamente de **barraco**, e comércio — açaí,
  sorveteria, móveis/eletrônicos, **adega** (principal) e lanchonete.
- **CTF com 4 bandeiras**: campinho · bar de esquina · perto do ponto de ônibus · praça do baile.

**Precisa de Mint/Tripo? Não para o mapa.** Os 5 mapas existentes são geometria procedural
em Three.js (`map_havan.js` e `map_ferrovelho.js` têm ~1.700 linhas cada) — rua, barraco,
beco, calçada, campinho e rotunda são caixa e plano, que é exatamente o que esses arquivos
já fazem. O que vem de GLB são **props**, e boa parte já existe: o **ônibus** é o mesmo da
Brasília (`putBuilding('bus')`), pneu de barricada idem, barraca de camelô idem. Os únicos
props que não existem hoje são **carro tunado** e **caixa de som** — e aí sim vale Tripo.

**Ordem certa de construção** (a mesma que os outros mapas seguiram, e o motivo de eles
passarem nas réguas): planta e colisão primeiro, waypoints e A* depois, arte por último.
`tools/eval/map-check.mjs`, `fv-verify.mjs` (A*/LOS) e as invariantes MAP1-MAP5 + CTF1/CTF2
existem e vão cobrar espaçamento de cover, rotas separadas e bandeira alcançável.
**Cuidado que o mapa já tem:** rua reta e comprida é corredor de sniper — CTF2 exige ≥2 rotas
separadas por ≥6 m entre cada spawn e cada bandeira, e é para isso que servem as vielas.

### Depois disso — a fila longa que o dono já enxerga

**Mapas novos**, **telemetria de verdade** (além do mínimo do A0.9), **automações**, **SDK**.
A ordem entre eles não foi decidida e não deve ser antes de o KNOWN-BUGS.md zerar os P0 — é o
que separa o alpha do beta (ver o topo do [`CHANGELOG.md`](CHANGELOG.md)).

### A. As 4 tarefas anteriores do dono, ainda NÃO feitas (verificadas em 04/08)

Detalhe, causa raiz e `arquivo:linha` de cada uma estão em [`KNOWN-BUGS.md`](KNOWN-BUGS.md).
O que **não** cabe lá, e que você precisa saber antes de mexer:

**A1. Alvo do CTF derivado do número de bandeiras** (BUG-06). `Math.floor(n/2) + 1`
(3→2, 4→3, 5→3), mantendo **dominação (todas ao mesmo tempo) como vitória imediata**. A `UI4`
de `tools/eval/ui-check.mjs` tem cláusula "ALVO DECLARADO" — **atualize a régua junto**, senão
ela passa a mentir, e prove com mutação.

**A2. Áudio dos funkeiros** (BUG-07). Aponte a chave `F` para as pastas certas e **compare
disco × manifest nas 5 facções** — as outras podem estar defasadas do mesmo jeito. Confira
também `captureByTeam`.

**A3. Listas de mídia hardcoded** (BUG-08). `wall-9` e `loading-6` foram remendados à mão em
04/08; **a música de menu ainda para em 26**. O conserto certo é manifesto gerado em build,
lido com fallback — e vale para as três listas de uma vez.

**A4. Tirar o bloom dos personagens** (BUG-09). Bloom **seletivo por layer**, com kill-switch
(`?charbloom=1` volta). Não quebre o `vmPass` (o viewmodel recebe bloom/AgX de propósito,
`bloom.js:872`) nem o caminho `quality:'low'` / `?bloom=0`, que não tem pós-processamento.
**Meça o custo** se o caminho escolhido exigir render extra — máquina fraca é requisito.

### B. Antes do deploy — três coisas que NÃO puderam ser feitas sem rede

**B1. FEITO em 04/08 — e achou um build quebrado.** `npm run build` rodou pela primeira vez
nesta árvore e falhou com `ENOENT .../dist/server/CHANGELOG.md`: o `changelog.astro` lia o
markdown por caminho relativo a `import.meta.url`, que no bundle aponta para `dist/server/`.
O prerender morria e **derrubava o build inteiro** — o deploy do site estava quebrado e
ninguém sabia, porque ninguém tinha rodado o build. Corrigido com `?raw` (Vite embute).
No mesmo build, `scripts/copy-wasm.mjs` gerou o **`public/wasm/resvg.wasm`** que faltava.
Ver BUG-14 do KNOWN-BUGS.md.

**B2.** `npm run arch` e commitar. O `tools/eval/ARCH.md` está desatualizado (diz 5.509 linhas,
`game.js` tem ~5.900) e `npm run arch:check` reprova. No CI o passo está com
`continue-on-error: true` — **remova a linha** depois de regenerar, pra virar gate.

**B3.** Migration **`supabase/migrations/011_*`** (segurança) em staging → testar `/ranking`,
`/u/<id>/<nick>`, `/api/badge/<id>.png` e uma partida → produção. Ela fecha dois furos reais:
`players.token` legível pela anon key, e **todos os RPCs chamáveis pela anon key** (um `curl` em
`/rest/v1/rpc/_flag` escondia qualquer jogador do ranking, sem token). Há também
`supabase/opcional/012_ofuscacao_schema.sql` **com rollback, deliberadamente NÃO aplicada** —
é atrito, não controle de acesso; a trava é a 011.

### C. Dívidas técnicas abertas, em ordem de impacto

**C1. Re-rig de 18 personagens — é a maior, e só roda na máquina do dono.**
Os 18 modelos de 28 juntas (todos os funkeiros menos o mandrake, o jozo, os palhaços)
**compartilham UM único esqueleto**: a impressão digital é idêntica byte a byte, é o esqueleto
do `mst` transplantado por auto-skin. As outras duas famílias têm um esqueleto por personagem.
Consequência medida: **raio de skin** mandrake 0,087 m contra 0,135–0,171 nos outros
(**1,55× a 1,97×**) — cada grau de rotação empurra a malha o dobro pra fora, e é isso que lê
como "balão" quando anima. **Não tem conserto em runtime.**
Critério de aceite objetivo: `node tools/eval/char-probe.mjs`, seção C7 → **esqueletos
distintos ≠ 1** e **raioSkin50 ≤ 0,10 m**. Ferramenta: `tools/rig-from-donor.mjs` (já ganhou
`MAX_R`, que faltava). Faça **um** personagem primeiro e confira em imagem antes dos 18.

**C2. Postura do coach quântico e do dollynho.** Abdução do braço na bind: **coach 36,0°**,
**dollynho 66,9°**, contra mediana do elenco **86,5°** — mais ninguém desvia mais de 15°. A
correção certa é retarget com delta de rest pose, e exige os clipes.

**C3. `public/models/anims/` não é versionado.** `git ls-files` devolve vazio para esse caminho.
Por isso `TPM1` falha em qualquer clone limpo e o CI fica vermelho por motivo que não é código.
**Confirme que a pasta está no deploy** — sem ela todo personagem congela em T-pose, e
`glbchars.js:196-209` engole a falha em silêncio.

**C4. VM18 / VM18b — a silhueta da arma.** 12 das 26 armas têm espessura perpendicular
**abaixo do piso medido no CS 1.6** (shotgun 0,269 · carbine 0,296 · sks 0,343 contra piso
0,427). **Nenhum parâmetro de câmera engorda uma malha.** Duas buscas em grade (768 e 1280
pontos) e a hipótese de escorço (varredura sobre a curva de área constante, `vm-orto.mjs`)
foram todas refutadas com número. **O caminho é malha nova ou outra família de pose** — não
gaste rodada procurando parâmetro, já foi procurado. *(Detalhe completo: BUG-15 e BUG-11 de
[`KNOWN-BUGS.md`](KNOWN-BUGS.md).)*

**C5. `fy_pool_day` sem normal/roughness map** — é `MeshLambert`, que não suporta. Converter
para `Standard` tem custo real em máquina fraca e ninguém mediu. Os outros 3 mapas estão em
113 normalMap/roughnessMap.

**C6. Dollynho com braços quebrados.** `public/models/dollynho_dance.glb` — ele já foi tirado do
placar (`?dolly=1` volta), mas o rig continua errado.

**C7/C8** (fundos do HUD e escala tipográfica) foram promovidos: são o **A0.1**, porque o dono
pediu a UI batendo com `references/telas/`. Medições em `tools/eval/ref_ui.json`, detalhe em
BUG-05.

**C9. BOT8** — agora **4 episódios, silêncio máximo 4,23 s** (era 2,7 / 3,03 s: **piorou**).
Vermelha desde o baseline, nunca foi atacada, e a causa raiz está identificada há dias —
`game.js:5361`, BUG-03. É a dívida mais barata de fechar da lista inteira.

**C10** virou o rodapé de [`KNOWN-BUGS.md`](KNOWN-BUGS.md) (relatado, não reproduzido).

**C11. 15 good-first-issues** estão escritas em `docs/issues/` e nunca foram abertas no GitHub.

**C12. O build do Docusaurus (`docs/`) nunca rodou.** `cd docs && npm install && npm start`.
A config é mínima e defensiva de propósito; se quebrar, será nela, não no conteúdo.

---

## VETOS DO DONO — não viole

- **Não reduza o número de armas no chão.** *"não pode deixar todas, porque é a única forma do
  usuário escolher armas — hoje não temos menu de compra."*
- **Não afrouxe teto de invariante** para fechar placar. Se achar que um teto está errado,
  **meça na referência e mostre o pixel**.
- **AUD1 tem que ficar verde.** Ela é a invariante que garante que o auditor mede o que o jogo
  desenha (`vmOffY(` chamado, `vmPitch`/`vmYaw` presentes, `vmAdsRot` chamado, `_adsPose` lida e
  conferida numericamente, escala por arma lida do `game.js`). Foi ela que pegou o quality gate
  mentindo. Se você mexer no caminho do viewmodel, **estenda a AUD1 junto e prove com mutação**.

---

## VERIFICAÇÃO ANTES DE ENTREGAR QUALQUER COISA

```bash
npm run syntax           # parse dos 25 arquivos de public/js
npm run eval:vm          # OBRIGATÓRIO ANTES DAS INVARIANTES — regenera vm_mint_audit.json.
                         # Pular isto mede o viewmodel de ontem e inventa vermelha. Ver BUG-02.
node tools/eval/invariants.mjs      # ~10-12 min; nenhuma verde pode virar vermelha
node tools/eval/botsim.mjs 60 all   # determinístico; divergência sem explicação = regressão
node tools/eval/ui-check.mjs all
node tools/eval/pickup-check.mjs    # 246 pickups, 0/0/0
```

E, para qualquer coisa visual: **gere a figura, olhe a figura, e descreva o que você viu.**
Número sem imagem já enganou este projeto quatro vezes.
