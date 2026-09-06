# 08 — RELEASE PROFISSIONAL: segurança, consistência e monetização

> Escrito em 04/08/2026 contra `v2/alpha` @ `046bc77`, com medição própria.
> **O texto integral deste plano (≈600 linhas, com toda a derivação) está no histórico da
> sessão de 04/08.** Este arquivo guarda o núcleo acionável — decisões, números medidos,
> degraus e perguntas abertas — porque a sessão principal ficou sem contexto para transcrever
> o resto. **Próxima sessão: recupere o integral antes de executar o degrau 8.**
>
> Formato herdado de [`00-RELEASE-V2.md`](00-RELEASE-V2.md): todo número tem `arquivo:linha`
> ou comando. Onde não deu para medir, está escrito **não medido**.

**A frase que reclassifica tudo, do dono:** *"o jogo tá 'pronto' pra release se fosse apenas um
jogo vibecoded. mas como pretendo tornar ele um jogo profissional, e com venda de skins e mapas,
precisamos pelo menos assegurar a segurança do jogo, a consistência"*.

Venda de item **muda o modelo de ameaça**. Trapaça de placar custa reputação; fraude de item pago
custa dinheiro e é reversível por chargeback.

---

## 0. O corte

| # | Pedido | Entra em | Por quê |
|---|---|---|---|
| — | **Subir o que existe para produção** | **DEGRAU 0** | bloqueia os 10 |
| 1 | Segurança | release (fundação) | 011 aplicada + fronteira escrita |
| 2 | Consistência (bug dos personagens) | release | é o critério de saída do alpha |
| 3 | Botão PARA DEVS | release | 1 item de nav + 1 tela |
| 4 | Doações | release | GitHub Sponsors é 0% de taxa, é config |
| 5 | Multiplayer WebRTC | release **em versão mínima, sem ranking** | §5 |
| 6 | Quebrada: rua, becos, escada+laje | **partido em dois** | laje jogável exige A* em camadas |
| 7 | Ranking 2 categorias | **SP no release, MP na v2.1** | §4 — é a contradição |
| 8 | Telemetria time/personagem/mapa/modo | release | delta de 2 campos |
| 9 | Páginas estáticas + AEO | release | páginas existem, falta o visual |
| 10 | Release GitHub com capa de IA | release | mas o CHANGELOG bloqueia (§9) |
| — | Venda de skins e mapas | **v2.2, depois de §3** | não é escopo de release |

---

## 1. TRÊS CORREÇÕES À NOSSA PRÓPRIA DOCUMENTAÇÃO

Documentação errada sobre o estado é o defeito que este projeto mais paga caro.

1. **`public/models/anims/` ESTÁ versionado** — 337 arquivos, 13,3 MB, desde o commit `a596fcb`.
   **`KNOWN-BUGS.md` BUG-15 e `HANDOFF.md` C3 afirmam o contrário e estão obsoletos.**
2. **`fpvm/` NÃO é pipeline morto.** É carregado por `fparms.js:109` (`?hands=1`) e
   `game.js:1878` (`?tvm=1`) — feature **desligada por padrão e declarada quebrada**
   (`STATUS.md:49`) custando **138 MB**. Mesma ação (sair do deploy), motivo diferente.
3. **O item 10 está bloqueado por um `awk`, não por arte.** `CHANGELOG.md` para em `alpha.4`,
   o código está em `alpha.10`, e o job `release` do `ci.yml` extrai as notas com
   `awk "/^## \[$TAG\]/"` — taggar hoje publica um release cujo corpo é *"Ver commits abaixo."*

## 1.1 Estado medido

```bash
git rev-list --count main..v2/alpha      # 234 commits
git diff --stat main..v2/alpha | tail -1 # 1308 arquivos, 185.295 inserções
git rev-parse --abbrev-ref v2/alpha@{upstream}   # fatal: no upstream configured
gh repo view --json stargazerCount       # 70 estrelas, PÚBLICO
```

| | |
|---|---|
| `public/` versionado | **350,9 MB** contra teto de 250 da CrazyGames |
| ├ `models/fpvm` | 154,4 MB (maior arquivo: `arms_pistol.glb`, 17,8 MB) |
| ├ `models/props` | 97,7 MB · `characters` 22,7 · `anims` 13,3 · `weapons` 9,3 |
| Migrations 011 e 012 | **não aplicadas** — telemetria grava em tabela ausente e falha em silêncio |
| Netcode | `grep RTCPeerConnection` → **0** |
| **CSP bloqueia o signaling** | `vercel.json`: `connect-src 'self' https:` **não casa `wss:`** |
| Portão | 36/49 críticas · **nenhuma invariante NET/SEC/TEL/DEV/DON/REL/SIZE existe** |
| Mint | 1.600 créditos, mas `readyForAssetPipeline: false` — falta o escopo `mint:projects:write` |

---

## 2. A CONTRADIÇÃO CENTRAL: ranking MP sem servidor autoritativo

**Decisão registrada** (`HANDOFF.md:137`): partida P2P **não pode** submeter ao `submit_match`.
**Pedido novo:** ranking com categoria multiplayer. São incompatíveis: num P2P host-autoritativo
**o host arbitra os próprios abates**, e nenhum teto de plausibilidade separa "jogou bem" de
"editou o placar" quando quem conta os pontos é quem ganha com eles.

**Recomendação — A + D:**

- **Agora:** duas abas. SP com dado real. **MP mostra estatísticas** (tempo, mapas, modos), com a
  frase na tela: *"Partidas em sala da comunidade não valem ranking: quem hospeda conta os próprios
  pontos."* Honesto, entregável hoje, sem prometer o que não tem lastro.
- **v2.1:** servidor headless de sala assina o resultado; a aba MP vira competição. O dado de (1)
  não se perde — vira o histórico.

**O ativo que torna isso barato já existe:** `tools/eval/botsim.mjs` roda a classe `Game` real com
os mapas reais em Node puro. O servidor autoritativo é a generalização desse stub, **não uma
reescrita da engine**.

**Consequência:** o WebRTC P2P **não entrega** ranking MP. São duas frentes com um transporte em
comum, e confundi-las gerou a contradição.

---

## 3. VENDA DE SKIN COM CLIENTE AUTORITATIVO É INSUSTENTÁVEL

Hoje não existe lógica de posse: todo personagem é selecionável, e a seleção é uma variável de JS
servida em texto plano. **Some-se o AGPL** (decidido, não aplicado): ele não impede vender skin —
você vende o direito de uso — mas **garante que qualquer um pode publicar um fork com o gate
removido, legalmente**.

| Camada | Licença | Onde mora |
|---|---|---|
| Motor, mapas base, UI, harness | **AGPL-3.0** | repo público |
| **Arte paga** | **proprietária** | **fora do repo público**, sob autorização |
| Entitlement | — | Postgres, `service_role` |

**Os 45 GLB de personagem já estão no repo público.** Se um virar pago, relicenciar é retroativo e
o histórico do git guarda a versão livre para sempre. **A decisão de onde a arte paga mora tem que
ser tomada antes de a primeira arte paga existir.**

A verdade desconfortável, para ficar no papel: o jogador sempre pode fazer a **própria** tela
mostrar qualquer skin, e **tentar impedir isso custa semanas e não funciona**. A fraude que importa
é obter o arquivo sem pagar e aparecer com ele **para os outros** — as duas são server-side e as
duas são resolvíveis.

---

## 4. OS DEGRAUS

**DEGRAU 0 — PRODUÇÃO. Bloqueia todo o resto.**
`git push -u origin v2/alpha` (nunca teve upstream) · build verde · **011 em staging → produção**
(fecha `players.token` legível pela anon key) · **012** · **verificar no BANCO que gravou**, não na
resposta HTTP (a rota esconde a falha por desenho) · **regerar o `audio-pack`** (o atual é de 17/07;
sem isso todo som novo morre no deploy) · deploy · sitemap no Search Console.

**DEGRAU 1 — PESO.** Tirar `fpvm/` de `public/`: 350,9 − 144,7 = **206,2 MB**. Não apague — mova
para um release de assets e faça `?hands=1` degradar com aviso em vez de 404.

**DEGRAU 2 — CONSISTÊNCIA.** Conceder `mint:projects:write` · **um** personagem primeiro
(`padati`, o pior: 254,9 ruins/1e4) · medir com `select-inflate.mjs` **e olhar a imagem** · se não
chegar perto do `pagodeiro` (44,6), o caminho está errado e os outros 15 não valem crédito.
**Não faça:** sweep de parâmetro (refutado), rodar `reskin-glb.mjs` de novo (não é idempotente,
piora de 254,9 para 286), culpar o CCD IK (refutado com `--mutate=semik`).

**DEGRAU 3 — SEGURANÇA (documento antes de código).** `docs/seguranca.md` com a fronteira ·
**AGPL aplicada num commit só** (`LICENSE:1`, `README.md:3,155,177`, `CONTRIBUTING.md:146`,
`Layout.astro:290`), **depois** de levantar PRs de terceiros mesclados · `LICENSE-ASSETS.md` novo ·
decidir onde a arte paga mora · decidir o provedor de conta (Supabase Auth é o de menor atrito).

**DEGRAU 4 — PARA DEVS + APOIE.** `index.astro:219-226` não tem **nenhum** link externo.
`.github/FUNDING.yml` não existe. **Abrir as 15 good-first-issues** de `docs/issues/`, senão a tela
aponta para o vazio. Link quebrado é pior que link ausente — o Docusaurus nunca rodou.

**DEGRAU 5 — TELEMETRIA: +2 campos.** `team` e `character` no payload (`main.js:406-412`), no RPC
e numa tabela `roster_daily` PK `(day, team, character, map, mode)`. **O Vercel Analytics já sabe
time+personagem** (`main.js:495`) e o Supabase não — duas fontes de verdade, e a que o dono controla
é a incompleta. Corrigir junto: `submit_match` aceita `p_team` só `'P'|'B'` — **U/C/F caem em nulo**.

**DEGRAU 6 — RANKING.** `RANKING_ON` vira `RANKING_SP_ON`/`RANKING_MP_ON` · duas abas · `/u/` a
partir do **id**, não do nick (`main.js:1139`) · `npm run check:seo` obrigatório depois.

**DEGRAU 7 — QUEBRADA parte A.** Estreitar a rua (hoje asfalto 14 m, vão 25 m) · **travessas
perpendiculares** (hoje são 2 vielas paralelas — alternativa, não emaranhado) · escada e laje como
**cobertura**, não como rota. **Precedente pago neste mapa:** caçamba no eixo do beco levou o grafo
a **8 componentes** e a CTF2 a 1 rota. Ordem: planta e colisão → waypoints → arte.
**A laje jogável não cabe:** `map_quebrada.js:1211` é `groundHeightAt = () => 0` e o A* não tem camada.

**DEGRAU 8 — MULTIPLAYER MÍNIMO.** Pré-requisito: **consertar o CSP**. Re-medir com `botsim` ·
tick fixo · **seedar 4 call-sites** (spread `2779`/`2783`, recoil `2725`/`2726` — são 4, não 83) ·
**entidade remota = bot com IA desligada** (`game.js:762-771` já tem os campos; faltam `pitch` e
`vel`) · sala por código, 2-4, sem lista pública · **sem ranking, rotulado BETA**.
**É o único degrau destacável — se atrasar, corte-o e lance sem ele.**

**DEGRAU 9 — PÁGINAS + AEO.** O visual do jogo (`cs-screen`, `cs-wallpaper`, `scanlines`) existe só
no `index.astro` — extrair para o `Layout`. `check:seo` roda contra o **build**.

**DEGRAU 10 — RELEASE.** Escrever `alpha.5`..`alpha.10` no CHANGELOG **antes** da capa ·
sincronizar `STATUS.md:3` · capa: fundo por IA + **versão desenhada por cima com o `resvg` que já
está no repo** (gerador de imagem erra texto; assim a versão é sempre certa e automatizável no CI).

---

## 5. RÉGUAS NOVAS (todas com mutação — Lei 1)

| ID | Garante | Mutação |
|---|---|---|
| **SIZE1** | `git ls-files public` ≤ 250 MB | **já está vermelha** (350,9) — régua ideal: reprova antes do conserto |
| **REL1** | versão do `package.json` tem entrada no CHANGELOG | **acende hoje** (`alpha.10` × `alpha.4`) |
| **REL2** | `version.js` == `package.json` == `?v=` do import map | mudar um só |
| **DEV1** | menu tem `data-act="devs"` **e o href resolve** | apagar o href deixando o botão — senão lê declaração, não uso |
| **DON1** | `FUNDING.yml` existe e o item tem destino | esvaziar o arquivo |
| **TEL1/TEL2** | payload e RPC têm `team`+`character`; nenhum RPC executável por `anon` | remover campo · apagar o `revoke` |
| **SEC1/SEC2/SEC3** | arte paga fora do índice · posse não vem de `localStorage` · CSP cobre `wss:` | — |
| **RNK1** | nenhuma partida MP chega ao `submit_match` | **impede a contradição de §2 voltar por descuido** |
| **MAPQ1/2** | largura do asfalto na faixa decidida · becos ≥ N e CTF2 ≥ 2 rotas | prop no eixo do beco |

**Regra de ouro:** a régua lê o **uso**, não a **declaração**. Um mutante que desfazia inteiramente
a correção do enquadramento passava 20/22 verde porque a invariante lia a declaração de uma
constante (`HANDOFF.md:48`).

---

## 6. PERGUNTAS ABERTAS PARA O DONO

1. **Ranking MP:** aba com estatísticas agora + competição na v2.1 com servidor oficial. Aceita?
2. **Paga ~€5/mês** por um VPS? É o que destrava o ranking MP. (`03:68` estimava Hetzner CX22 a
   ~€4,35 + IVA — **não re-verificado**.)
3. **Rua da Quebrada: quantos metros?** Hoje 14 m de asfalto, 25 m de vão. 8? 6?
4. **Laje jogável é v2.1?** Exige A* em camadas, que não existe.
5. **Versão do release:** `alpha.11` (honesto, portão vermelho) ou esperar os degraus 2 e 7 para
   sair `beta.1`? A escada exige zero P0 e portão saindo 0; hoje são 36/49.
6. **`?hands=1` some do deploy** para o `fpvm/` sair dos 138 MB? Já é desligado e quebrado.
7. **PARA DEVS:** rodar o Docusaurus ou apontar para `/sobre` + GitHub?
8. **Qual é o primeiro item pago?** Skin, mapa, ou os dois? Muda onde a arte mora.
9. **Conta de jogador:** Supabase Auth ou outro provedor?
10. **Concede `mint:projects:write`?** Um clique, e sem ele o degrau 2 não sai do lugar.

---

## 7. SOBRE PRAZO

Não há total em dias, e o motivo é medido: **`00-RELEASE-V2.md:27` estimou multiplayer em 3-5 dias
em 02/08; em 04/08 ele não tinha começado**, e o plano que sustentaria a estimativa foi revogado e
o substituto se perdeu antes de ser gravado. Repetir o número seria repetir o erro com mais
confiança.

- **Degrau 0 é o mais barato e o mais valioso.** Push, duas migrations, um deploy. Desbloqueia 9
  dos 10 pedidos. **Se só uma coisa for feita esta semana, é esta.**
- Degrau 1 é uma tarde, quase todo `git mv`.
- Degrau 2 tem incerteza real — depende de 16 rigs externos, e só fazendo **um** se sabe.
- Degraus 4, 5, 9 e 10 são pequenos e independentes: use-os para ter progresso visível enquanto
  2 e 8 andam.

**O corte que eu defenderia:** degraus **0, 1, 2, 4, 5, 10**. Isso é um release profissional de
verdade — está no ar, é seguro, os personagens estão certos, tem porta para a comunidade e para o
apoio, mede o que interessa, e tem release bonito no GitHub. Multiplayer e ranking MP saem duas
semanas depois, com post próprio — que é o que `00-RELEASE-V2.md:31` já recomendava e o dono já
aceitou uma vez.
