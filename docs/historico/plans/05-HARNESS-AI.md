# v2.1 — HARNESS, SKILLS E AI ENGINEERING

> Este plano é **v2.1**. Nada aqui muda o jogo — muda a velocidade com que você o muda,
> e é a matéria-prima dos posts de blog do plano `06`.

---

## 1. Onde você está (auditado)

Você tem, hoje, uma das infraestruturas de agente mais completas que eu já vi num repo de 1 dev:

- **~106 scripts em `tools/eval/`**, Playwright + Chromium headless, com convenções universais
  (`CHROME_BIN`, `node tools/eval/serve.mjs 8123`, hooks `window.__game` e `window.__step`).
- **A linhagem "sem browser"** — `botsim.mjs` (roda a `Game` real em Node puro), `vm-mint-audit.mjs`
  (parser GLB próprio, projeta vértices reais), `tp-mount-probe.mjs`, `vmrig-test.mjs`.
  Isso é raro e é o que faz o loop rodar em segundos em vez de minutos.
- **A camada Python fotométrica** — `r3_sim.py` simula o composite AgX do `bloom.js` em NumPy;
  `tone_calib.py` inverte o pipeline para prever L*; `p0-pix.py` isola a arma por diff.
- **`invariants.mjs`** — 24 invariantes (SYN, VM1-6, RIG, TPM1-3, BOT1-7, ARM1-5, ESP1, MOD1),
  exit 1 em falha crítica.
- **A skill `gauntlet-fps`** — crítico adversarial → builders paralelos → captura medida →
  verificação A/B → caçador de regressões, com a regra certa: *quem constrói nunca dá a nota*.

**E cinco furos que anulam boa parte disso:**

1. **`invariants.mjs` diz que serve de gate em CI, e não está no CI.** O `.github/workflows/ci.yml`
   só faz syntax check + `astro build`. Nenhum eval roda automaticamente.
2. **Nenhum script do harness está no `package.json`.** 106 arquivos, zero descoberta via
   `npm run`, sem `tools/eval/README.md`.
3. **`tools/eval/ARCH.md` diz que `game.js` tem 3.234 linhas. Tem 5.361.** Todos os `arquivo:linha`
   da tabela de conflito estão deslocados — e essa tabela é exatamente o que impede seus agentes
   paralelos de colidirem. **É a peça de infra mais desatualizada e mais perigosa do repo.**
4. **`vm_mint_audit.json` mede um enquadramento que não existe** (detalhado em
   [`01-ARMAS-VIEWMODEL.md`](01-ARMAS-VIEWMODEL.md) §1.6).
5. **Duplicação geracional não aposentada** — 5 `audio-probe*`, 3 `p1-menu*`, `g2r7`+`g2r7b`+`g2r8`,
   `g2r6-bots`+`bots2`+`botsim`. Nada marcado como obsoleto. `__pycache__/` versionado.

**Diagnóstico: você construiu a régua e parou de usá-la.** Os itens 1, 3 e 4 explicam por que
o viewmodel foi refeito três vezes "com medição".

---

## 2. As correções de base (meio dia, ganho imediato)

### 2.1 `ARCH.md` tem que ser gerado, não escrito
É um índice por número de linha. Escrever à mão garante que desatualiza. Script de 30 linhas que
varre `game.js` por marcadores de seção e regenera a tabela, rodando no `pre-commit`.

### 2.2 Expor o harness no `package.json`
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "eval:serve": "node tools/eval/serve.mjs 8123",
    "eval:invariants": "node tools/eval/invariants.mjs",
    "eval:vm": "node tools/eval/vm-mint-audit.mjs",
    "eval:bots": "node tools/eval/botsim.mjs 120 all",
    "eval:shots": "node tools/eval/gl-shots.mjs /tmp/shots all",
    "eval:ui": "node tools/eval/g2ui-verify.mjs",
    "arch": "node tools/gen-arch.mjs"
  }
}
```

### 2.3 `tools/eval/README.md`
Catálogo dos 106 arquivos em tabela, com coluna **OBSOLETO** marcando as gerações anteriores.
Um agente novo hoje não sabe se usa `g2r7-sweep` ou `g2r8-sweep`.

### 2.4 Tirar os caminhos absolutos
`/root/shots`, `/root/csb`, `/opt/pw-browsers/chromium-1194` hardcodados. Env var com fallback.

---

## 3. CI que vira o caçador de regressões

**Repositórios públicos com runners padrão do GitHub Actions são gratuitos e ilimitados.**
Seu custo de CI é literalmente zero. Não otimize o que já é grátis — o custo real do pipeline
são os tokens.

### 3.1 O que colocar no CI, em ordem
```yaml
# .github/workflows/ci.yml — adicionar aos jobs existentes
- run: npm run eval:invariants          # exit 1 em invariante crítica → gate real
- run: npm run eval:vm                  # 2s, sem browser
- run: npm run eval:bots                # sem browser
- run: npm run check                    # astro check (hoje não existe)
```
Os três primeiros rodam **sem browser**, em segundos. É o gate que você já escreveu e nunca ligou.

### 3.2 WebGL headless — a parte frágil
Para as capturas visuais (`gl-shots`, `g2ui-verify`), Playwright com SwiftShader:
```js
launchOptions: { args: [
  '--headless=new', '--no-sandbox',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'
]}
```
Isso roda o jogo a ~0,3 FPS — 4 a 6 min por captura de mapa. **Não coloque captura de mapa em
todo PR.** Coloque num workflow `schedule` noturno, ou disparado por label.

### 3.3 Regressão visual
`toHaveScreenshot` do Playwright + `odiff` (mais rápido que pixelmatch) para o diff.
Determinismo é o que quebra: trave seed, trave `dt` (use o `window.__step` que você já tem),
desative animações de UI, e capture sempre no mesmo tick — não no mesmo tempo de relógio.

---

## 4. O Gauntlet 2.0

A skill `gauntlet-fps` está certa no princípio. O que mudou no ecossistema desde que você a
escreveu, e que vale incorporar:

### 4.1 Worktrees são nativos agora
Você provavelmente faz `git worktree add` na mão. Não precisa mais:
```bash
claude --worktree feature-hud       # cria .claude/worktrees/feature-hud/
```
E no frontmatter do subagent:
```yaml
---
name: builder-graphics
description: Implementa melhorias de shader/render
isolation: worktree
model: sonnet
---
```
Três configurações que mudam o seu setup:
- **`worktree.baseRef: "head"`** em settings — para o Gauntlet você quer que os builders partam
  do trabalho em progresso, não do `main` (o default é `"fresh"`).
- **`.worktreeinclude`** na raiz (sintaxe .gitignore) copia arquivos gitignored para cada
  worktree novo. Crítico aqui: `public/audio/`, `.env`.
- Adicione `.claude/worktrees/` ao `.gitignore`.

### 4.2 Skills bundled que fazem o que você escreveu à mão
| Skill | O que faz |
|---|---|
| `/run-skill-generator` | Grava a receita de subir o jogo como skill. **Rode isso uma vez** — elimina a classe inteira de falha "o agente não conseguiu subir o jogo" |
| `/run` e `/verify` | Sobem e dirigem o app para confirmar a mudança, sem cair de volta em teste/typecheck |
| `/code-review` | Revisa o diff atual num subagent fresco |
| `/goal` | Define uma condição que um **avaliador separado** re-checa após cada turno |

E **Stop hooks** como gate determinístico: bloqueiam o fim do turno até seu script passar.
É a forma de fazer "não me diga que terminou até `invariants.mjs` sair 0".

### 4.3 A regra de authoring que a sua skill viola
Regra oficial: **SKILL.md ≤ 500 linhas** e **referências a apenas 1 nível de profundidade**
(`SKILL.md → BAR.md` ✅, `SKILL.md → BAR.md → outro.md` ❌ causa leitura parcial).

Sua `gauntlet-fps/SKILL.md` manda ler `HANDOFF-KIMI.md` (**84 KB**) → `BAR.md` (60 KB) →
`ARCH.md`. Isso é ~150 KB de leitura obrigatória antes de qualquer trabalho, com o
`HANDOFF-KIMI.md` sendo um log append-only fazendo papel de estado.

**Correção:** `STATUS.md` curto (≤100 linhas, o estado de hoje) substitui o topo do
`HANDOFF-KIMI.md`; o resto vira `docs/historico/`. A skill lê `STATUS.md` + `BAR.md`, e ponto.

### 4.4 Estrutura alvo
```
.claude/
├── CLAUDE.md                      # só: comandos, convenções, gotchas de WebGL. Enxuto
├── skills/
│   ├── run-fps/SKILL.md           # gerado por /run-skill-generator
│   ├── gauntlet-fps/
│   │   ├── SKILL.md               # ≤500 linhas
│   │   ├── RUBRIC.md              # a régua
│   │   └── scripts/               # capture.mjs, measure.mjs, judge.mjs
│   ├── weapon-authoring/SKILL.md  # como adicionar uma arma (hoje é conhecimento tácito)
│   └── char-pipeline/SKILL.md     # Mint → rig → retarget → registry (hoje: 6 passos não escritos)
├── agents/
│   ├── critic-adversarial.md      # tools: Read, Grep, Glob, Bash — SEM Write
│   ├── builder-graphics.md        # isolation: worktree
│   ├── builder-gameplay.md        # isolation: worktree
│   └── regression-hunter.md       # isolation: worktree, model: haiku
└── workflows/
    └── gauntlet.js
```

**A regra de decisão skill vs script vs doc** (oficial):
- múltiplas abordagens válidas → **markdown** ("como criticar o feel de uma arma")
- existe padrão preferido → **pseudocódigo** ("como adicionar uma arma")
- operação frágil, consistência crítica → **script executável** (capturar screenshot,
  calcular SSIM, medir FPS) — *e script economiza tokens, porque o código não entra no contexto*

**Duas skills que faltam e que você paga caro por não ter:** `weapon-authoring` e
`char-pipeline`. Hoje esses dois processos existem só na sua cabeça e em comentários espalhados;
todo agente novo redescobre. O `char-pipeline` tem 6 passos com scripts reais
(`rig-from-donor` → `finger-curl` → `optimize-tribos` → `retarget-glb` → `check-clip` →
registry em 3 arquivos) e não está escrito em lugar nenhum.

---

## 5. Code review automatizado (você pediu "tipo CodeRabbit")

**Stack de três camadas, custo total: US$ 0.**

### Camada 1 — CodeRabbit
**Grátis para sempre em repos públicos**, sem setup além de instalar o GitHub App e autorizar.
Cobre linters + SAST + chat agêntico + autofix. É a rede de segurança de base.
https://www.coderabbit.ai/pricing

### Camada 2 — Claude Code Action com prompt de gamedev
É aqui que você ganha o que nenhum SaaS te dá: revisão que entende Three.js.
```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review
on: { pull_request: { types: [opened, synchronize] } }
jobs:
  review:
    runs-on: ubuntu-latest
    permissions: { pull-requests: write, contents: read }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            Revise este PR de um FPS em Three.js. Foque APENAS em:
            1. Vazamento de GPU: geometry/material/texture sem .dispose()
            2. Alocação por frame no render loop (new Vector3 dentro de rAF)
            3. Crescimento de draw call: merges desfeitos, instancing quebrado
            4. Correção de shader: precision, branching, uniforms não usados
            5. Divergência entre client tick e render tick
            NÃO comente sobre estilo, nomes de variável ou formatação.
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          track_progress: true
```
Atalho: `claude /install-github-app` no terminal (requer admin do repo).

### Camada 3 — local, antes do push
Skill `/code-review` + Stop hook rodando `invariants.mjs`. Custo zero de CI, feedback instantâneo.

**Alternativas avaliadas:** Greptile Starter é grátis para não-comercial **MIT ou Apache** (o seu
é MIT hoje — mas veja a decisão de licença no plano `06`); Sourcery Pro é grátis para OSS;
Copilot code review vem incluso no Free/Pro mas **sempre deixa review do tipo "Comment", nunca
"Approve" ou "Request changes"** — não serve como gate.
**Não vale pagar Greptile ou Qodo** para 1 dev com repo público.

---

## 6. Roteamento de modelo — onde estão os US$ 500

O ponto que importa: **você não economiza rodando Opus mais barato. Você economiza tirando 90%
das chamadas de cima do Opus.**

### 6.1 A cascata
| Fase do Gauntlet | Modelo | Por quê |
|---|---|---|
| Arquitetura, shader difícil, decisão de design | **Opus 5** (assinatura Claude Code, não API) | É o topo do Arena de webdev. Não roteie isso |
| Builders paralelos | Sonnet / Kimi | Volume médio, código conhecido |
| **Crítica visual em lote** | `google/gemini-3.1-flash-lite` (~$0,25/M in, $1,50/M out) | **Este é o corte de 90%.** Julgar screenshot contra rubrica não precisa de frontier |
| Caçador de regressão | Haiku / `qwen3.7-plus` | Mecânico |
| Geração de prompt de arte, tradução, falas de bot | Batch API (**-50%**) | Nada disso é interativo |

### 6.2 As três alavancas de custo, em ordem
1. **Prompt caching** — o maior ganho isolado para agentes de código, que reenviam o mesmo
   contexto de repo a cada turno. Reduções relatadas de até 90% no input cacheado.
2. **Batch API** — 50% de desconto em tudo que não é interativo.
3. **`CLAUDE_CODE_SUBAGENT_MODEL`** — env var que sobrescreve o modelo de todos os subagents.
   É o botão de emergência para jogar uma sessão inteira de builders em modelo barato.

### 6.3 O item de maior ROI do plano inteiro: créditos grátis de OSS
- **Claude for Open Source** → 6 meses de Claude Max 20× grátis (~US$ 1.200).
  Cinco trilhas de elegibilidade; a sua é a **trilha 4 — "Community Builder: um repo com 20+
  contribuidores externos únicos com PRs merged nos últimos 12 meses"**.
  20 contribuidores num jogo de memes brasileiro com 30k seguidores é atingível em 3-6 meses se
  você estruturar `good-first-issue` (mapas, armas, skins, tradução, falas de bot).
  **Isso vira meta operacional, não sonho.** https://claude.com/contact-sales/claude-for-oss
- **Codex for Open Source** → 6 meses de ChatGPT Pro + Codex. Critério declarado é frouxo e a
  página convida quem não se encaixa a aplicar mesmo assim.
  https://openai.com/form/codex-open-source-fund/
- **GitHub Copilot Pro grátis para mantenedores de repo popular**, reavaliado mensalmente.
  Custo de tentar: zero.
- Infra: Vercel for OSS (US$ 3.600 em créditos), Cloudflare Project Alexandria, Sentry OSS,
  JetBrains OSS. Catálogo com 54 programas: https://www.ossperks.com/

⚠️ **Atenção:** o critério "non-profit basis" da Cloudflare pode conflitar com anúncios no jogo.
Considere separar a entidade/repo do motor open source do site comercial (ver plano `06` §1).

---

## 7. Avaliação visual automatizada

Arquitetura de três camadas, e a ordem importa porque cada uma filtra a próxima:

1. **Métricas objetivas em Node/Python** (grátis, determinístico) — você **já tem isso** e é a
   parte mais rara: `r2_audit.py`, `r3_color.py`, `r3_depth.py`, `tone_calib.py`, `p0-pix.py`.
   Histograma, contraste local, L*, saturação, máscara por diff.
2. **Diff de regressão** (`odiff`/pixelmatch contra baseline) — pega o que quebrou.
3. **VLM como juiz contra rubrica** — só para o que passou por 1 e 2.

Para a camada 3, **promptfoo** com assertion `llm-rubric` e `threshold` é o encaixe certo —
declarativo em YAML, grader configurável por assertion.
https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/

**As regras que fazem o juiz visual funcionar** (e sem elas ele vira gerador de elogio):
- Um critério por chamada. Não peça "avalie esta tela".
- Sempre com a referência lado a lado, e o juiz **não sabe** o que foi mudado.
- Escala de 1-5 com âncora textual por nota, não "de 0 a 10".
- Peça o **número medido** junto com a nota — se o juiz não consegue citar um número, a nota é ruído.
- Modelo barato, muitas amostras, mediana. Não um julgamento caro.

---

## 8. Ordem de execução (v2.1, ~2 dias)

```
[2h]  §2 — ARCH.md gerado, npm scripts, README do harness, tirar caminhos absolutos
[1h]  §5 — CodeRabbit + Claude Code Action (é literalmente instalar e colar um YAML)
[2h]  §3 — invariants + vm-audit + botsim no CI; captura visual num workflow noturno
[3h]  §4 — STATUS.md, Gauntlet 2.0 com worktree nativo, /run-skill-generator
[2h]  §4.4 — skills weapon-authoring e char-pipeline (o conhecimento tácito mais caro)
[1h]  §6.3 — aplicar aos programas de crédito OSS
```

E as `good-first-issue` do §6.3 não são burocracia — **elas são o caminho para os US$ 1.200 de
crédito e para o sinal de carreira do plano `06`.** Estruture-as no mesmo dia.
