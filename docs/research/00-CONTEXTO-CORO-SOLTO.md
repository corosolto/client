# CONTEXTO — o que é o CS BRASIL / CORO SOLTO

> **Como usar:** cole este bloco inteiro como PRIMEIRA mensagem no ChatGPT, antes de
> qualquer um dos outros arquivos (`01-VIEWMODEL`, `02-MAPAS`, `03-MULTIPLAYER`).
> Ele existe só para dar o mundo; a pergunta de pesquisa está nos outros.
>
> **Procedência:** revisado em 19/09/2026 contra o repositório. Cada número diz de onde veio.
> O bloco "estado do negócio" é o único sem arquivo versionado por trás — está marcado.

---

## O produto

**CORO SOLTO: Treta Suprema** (repositório `csbrasil`, ex-"CS Brasil", o dono ainda chama
assim) é um **FPS gratuito de navegador**, escrito em **Three.js r160** e servido como
**módulos ES nativos** — sem download, sem instalação, sem cadastro. O site, as rotas de API e
as páginas públicas são **Astro + Vercel**; ranking e telemetria são **Supabase**. Licença
**AGPL-3.0**. O servidor autoritativo de multiplayer vive em outro repositório
(`corosolto/backend`, privado, pasta `game/`).

É um jogo **satírico brasileiro**: facções caricatas (funkeiros, palhaços, míticos do
folclore), mapas que são lugares reais do Brasil (Praça dos Três Poderes, favela de SP, posto
de beira de estrada, UPA 24h, atacadão, penitenciária, parque de diversão) e armas com nomes e
modelos próprios.

**Números do acervo** — bloco gerado por script (`README.md`, seção `GERADO:numeros`). Duas
fotografias, porque o repo tem branches muito divergentes:

| O que | branch da frente de viewmodel (`alpha.175`, 09/09) | `main` publicada (`alpha.255`, 17/09) |
|---|---:|---:|
| Código do jogo | 45.882 linhas em 64 módulos JS | 47.591 em 96 |
| `game.js` (o módulo central) | 7.401 linhas | 7.483 |
| Armas com GLB | 27 (26 no catálogo + mosquete) | 26 |
| Personagens jogáveis | 62, em 10 facções (4 facções só nesta branch) | 53, em 6 |
| GLBs de personagem | 63 | 55 |
| Props em GLB | 151 | 171 |
| Arquivos de animação versionados | 681 (~678 GLB + 3 índices) | — |
| Mapas no registro | 17 | 17 |
| Scripts de avaliação (`tools/eval/`) | ~310 | 374 |
| Comandos npm | 195 | — |

## Como este projeto é construído — e por que isso importa para a pesquisa

O jogo é feito **em par com agentes de IA**. Cada commit declara qual modelo o escreveu
(trailer `Agent:`, obrigatório por hook e por CI). Passaram por aqui Claude (Opus/Fable),
Codex/GPT, Kimi (que criou o jogo), e — pelos badges do README — GLM e Gemini (arte 2D), além
de geradores 3D (Tripo3D, Meshy, mint.gg) e o pacote pago KINEMATION.

Isso produz uma característica que **muda a natureza do problema** descrito nos outros
arquivos: o trabalho acontece em **muitas branches/worktrees paralelas** ("lanes", ~113
worktrees registrados), cada uma com um agente diferente, e a **integração é o gargalo real**
— não a produção. Em todas as três frentes existe muito mais trabalho *feito* do que trabalho
*entregue*: a `main` publicada tem **zero** viewmodel autorado, **nenhum** dos 31 PRs de mapa
foi mesclado, e a rodada de conserto de mapas de 13/09 **não está commitada**.

## A cultura de "régua" (a palavra mais importante do repositório)

O texto oficial é `AGENTS.md` (§"As quatro leis"), e diz, resumido:

1. **A régua vem antes do conserto.** Antes de mexer no defeito, escreve-se o instrumento que
   o mede.
2. **Teto sem procedência é opinião.** Todo limite numérico diz de onde veio.
3. **Toda invariante vem com a mutação que a faz ficar vermelha.** Se você quebra o código de
   propósito e o número não se mexe, a régua é cega.
4. **Gere a figura e OLHE.** Número verde não substitui a imagem.

Mais o corolário: **quem constrói nunca dá a nota** — aprovação visual exige crítico
adversarial de contexto limpo + o dono.

Três lições que não estão na lista mas aparecem repetidas nos relatórios:

- **Régua cega fica verde para a arquitetura errada** (`KNOWN-BUGS.md`, BUG-75) — é o erro
  que mais custou nesta frente.
- **Medir no jogo real, não no render offline.** Render do Blender, contagem de ossos e
  distância até socket são "checagens auxiliares, não aprovação visual"
  (`docs/reports/VM-PIPELINE-RECEITA.md`).
- **Falha silenciosa tem assinatura** (skill `bug-hunt`). Vários dos bugs descritos nos outros
  arquivos não lançam erro nenhum: o jogo continua, o console fica limpo, e o que quebra muda
  a cada partida.

Existe um portão rápido (`npm run check:fast`, 101 passos; uma medição de 13/09 numa árvore
não commitada deu 91/101, com 7 dos 10 vermelhos sendo dívida pré-existente ou configuração
de máquina) e portões pesados que exigem navegador (Playwright) e ficam fora dele — e é
justamente nesses buracos que os defeitos moram. **Nenhum workflow de CI chama `check:fast`.**

## O estado do negócio (para calibrar prioridade) — SEM ARQUIVO DE PROCEDÊNCIA

Os números abaixo foram declarados como "medidos direto no banco de produção em
12–13/09/2026" por uma sessão anterior. **Nenhum deles existe em relatório, migration ou
documento versionado**; o ledger de consolidação de 04/09 diz que D1/D7 "continuam não
computáveis sem nova instrumentação". Trate-os como **declaração do dono**, com ordem de
grandeza plausível, não como fato auditado:

- **DAU ~57/dia.** Pico histórico ~552 em 13/08 — queda de ~90%.
- **D7 ≈ 0% em toda coorte desde 20/08.** D1 ~3%. De ~4.710 jogadores únicos, ~448 (9,5%)
  voltaram algum dia.
- **Mediana de partida: ~108 segundos.** ~74% das partidas terminam em `quit`. (O dado É
  gravado por `/api/match` — `p_result`, `p_seconds` — mas "ninguém lê por mapa".)
- FPS mediana ~61, **p10 ≈ 20**; ~20% das amostras abaixo de 30 FPS (o PR #589 cita "20%").
- Multiplayer em produção desde ~30/08–02/09, **mas vazio**: ~184 partidas autoritativas no
  total; pico de **12 jogadores simultâneos** no nó brasileiro em 14 dias (este último está
  no README do backend e no PR #28 — é o único número deste bloco com arquivo).
- Aquisição: ~45% histórico vem do LinkedIn do dono. Zero campanhas rastreadas.

**Tradução:** o gargalo é **retenção**, não aquisição nem capacidade. O jogador entra, joga
~2 minutos e some. É por isso que "o jogo parecer profissional na primeira meia hora" —
viewmodel da arma, leitura do mapa — é tratado como problema de produto, não de vaidade.

---

**Próximo passo:** cole agora o arquivo da frente que você quer pesquisar
(`01-VIEWMODEL-O-PROBLEMA.md`, `02-MAPAS.md` ou `03-MULTIPLAYER.md`).
