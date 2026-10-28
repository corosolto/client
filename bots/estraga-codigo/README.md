# estraga-codigo (persona: Palhaço Mal 🤡)

Revisor de PR/commit da casa: escuta o repo do jogo, passa cada diff por **ações de
revisão estreitas** (uma por classe de defeito que esta base já pagou) rodando o LLM
local desta máquina, e posta o veredito como review no GitHub — no corpo e na voz do
**Palhaço Mal**, com a parte técnica intacta.

**Advisory, não portão.** Comenta, não bloqueia. As réguas determinísticas do CI
continuam sendo o portão — o canarinho é o 30% semântico que régua não pega: falso
verde, limiar duplicado, premissa de contexto errado.

## Como funciona

```
poll (10 min) ──▶ PR novo / push direto na main (não-merge)
                    │
                    ├─ seleciona ações cujos globs casam com os arquivos tocados
                    ├─ 1 chamada LLM por ação (diff + leis + persona + contrato JSON)
                    ├─ dedupe + teto de 6 descobertas
                    └─ POST /pulls/:n/reviews (inline com fallback pro corpo)
```

Cada arquivo em `acoes/*.md` é uma ação: frontmatter (`nome`, `quando` = globs,
`ativo`) + o prompt com as leis daquela classe. **Acoplar mais ações é criar um
arquivo** — o runner descobre sozinho.

| ação | quando roda | classe que caça (caso real) |
|---|---|---|
| `leis-da-casa` | todo diff | falso verde, limiar duplicado, número à mão (BUG-02/#87) |
| `mapas` | `public/js/map_*.js` | pickup no buraco, rota única, luz, albedo (PRs #256/#257) |
| `frontend-publico` | `public/js`, `src/pages` | zero-build, pista de backend, cache-bust (BUG-55) |
| `backend-api` | `src/pages/api`, `src/lib` | segredo, falso positivo anti-fraude, RMW (BUG-54) |
| `ci-portoes` | workflows, `scripts/ci` | cadeia de `&&`, gatilho cego, ratchet que cresce |

## Setup (uma vez)

1. **Conta** `estraga-codigo` no GitHub: convidar como **Outside Collaborator**
   com role **Read** (repo público não gera assento; Read basta pra review
   `COMMENT` — o modo fix usa o PAT, não a role). PAT fine-grained, escopada a
   `corosolto/client`: `pull-requests:read+write`, `issues:read+write`,
   `contents:read` (advisory). O PAT entra em `bots/.env` como
   `GH_PAT_FALA` — o config.json declara `"pat_env": "GH_PAT_FALA"` e o runner
   lê a credencial por esse indireto.
2. **Token na máquina** (alternativa ao .env, não no git):
   ```sh
   security add-generic-password -s estraga-codigo -a token -w '<PAT>'
   ```
3. **Usar o gh como o bot** (o "login" da pasta — nunca troca sua conta):
   ```sh
   bots/estraga-codigo/como-bot.sh api user   # prova: devolve "estraga-codigo"
   ```
4. **LLM**: padrão é o `opencode` já configurado (`modelo` no config.json).
   Alternativas: `ollama` (127.0.0.1:11434) ou endpoint compatível com OpenAI
   (`LLM_BASE_URL` + `LLM_API_KEY`).

## Uso

```sh
cd bots/estraga-codigo
bun canarinho.mjs selftest        # fixture com defeito conhecido (LLM real)
bun canarinho.mjs replay 300      # calibração: NÃO posta
bun canarinho.mjs review 300      # posta a review
bun canarinho.mjs fix 300         # revisa E CORRIGE (PR filho)
bun canarinho.mjs poll            # daemon (PRs + commits)
GH_DRY_RUN=1 bun canarinho.mjs review 300   # NÃO envia: salva o payload em estado/dry-run/
```

`GH_DRY_RUN=1` intercepta **toda** chamada mutante (review, comentário, issue,
push do modo fix): imprime e salva o payload em `estado/dry-run/` — leituras
passam normais. É o modo de validar o texto completo antes de ligar em produção.

### O modo `fix` (comenta e conserta)

1. Revisa como sempre (advisory).
2. Achados **major** acionáveis vão pro LLM com o **arquivo completo** — devolve
   substituições exatas (`antigo→novo`, casamento 1:1 ou descarta).
3. Aplica num **worktree isolado** em `/tmp` — a árvore de trabalho de quem
   estiver no repo não é tocada.
4. Roda o **gate local** (`gate_cmd` do config: syntax+docs+arch) — as réguas
   da casa decidem se o conserto sobe.
5. Verde → branch `estraga/fix-<n>` + **PR filho** no branch do PR original,
   commit assinado (`Signed-off-by` + `Agent: estraga-codigo`, DCO ok).
   Vermelho → descarta e fica só o comentário. Com `GH_PAT_FALA` (advisory) o
   push de branch não é autorizado — o modo fix completo exige PAT com
   `contents:write`; o comentário da revisão segue valendo.

O bot nunca força: conserto que não passa nas réguas não sobe.

O estado (último head revisado por PR, as reviews e os payloads de dry-run) mora
**fora do repo**: `~/.local/state/corosolto/estraga-codigo/`, ou onde `ESTADO_DIR`
mandar. Re-revisar só acontece em commit novo. Não é frescura de arrumação: o
código vive num volume externo e, sob launchd, o `node` leva `EPERM` ao abrir
arquivo para escrita lá dentro — o bot revisava o mesmo PR para sempre porque
nunca conseguia gravar o head. Ver `bots/lib/estado.mjs`.

### launchd (a cada 10 min, acorda sozinho)

```xml
<!-- ~/Library/LaunchAgents/br.corosolto.estraga-codigo.plist -->
<plist version="1.0"><dict>
  <key>Label</key><string>br.corosolto.estraga-codigo</string>
  <key>ProgramArguments</key><array>
    <string>/opt/homebrew/bin/node</string>
    <string>/Volumes/Zenith/…/bots/estraga-codigo/canarinho.mjs</string>
    <string>poll</string>
  </array>
  <key>KeepAlive</key><true/>
  <key>EnvironmentVariables</key><dict>
    <key>HOME</key><string>/Users/ruben</string>
    <key>GH_PAT_FALA</key><string>…</string>
    <!-- advisory enquanto o modelo ainda produz falso positivo com confiança
         alta; ver "modelo" abaixo. Tirar daqui é decisão medida, não palpite. -->
    <key>GH_DRY_RUN</key><string>1</string>
  </dict>
  <!-- StandardOutPath/StandardErrorPath TÊM que ficar no disco interno:
       launchd não abre arquivo em /Volumes (exit 78). -->
  <key>StandardOutPath</key><string>/Users/ruben/Library/Logs/Canarinho/canarinho.log</string>
  <key>StandardErrorPath</key><string>/Users/ruben/Library/Logs/Canarinho/canarinho.err.log</string>
</dict></plist>
```

Recarregar depois de mexer no código:
`launchctl kickstart -k gui/$(id -u)/br.corosolto.estraga-codigo`.

### O modelo

Padrão `minimax-m3.1-flash:cloud` pelo Ollama local (`OLLAMA_HOST`, 11434),
reserva `qwen3.5:4b` se o cloud cair, override por `OLLAMA_MODEL`. O 4B sozinho
foi reprovado em 28/10: no selftest da casa devolveu 2, 5 e 2 achados em três
rodadas, com import que não existe no diff e minors de comentário que o contrato
proíbe. O cloud acha o defeito real e cala no resto — mas ainda produz falso
positivo com confiança **alta** (mediu-se um no PR #1103, "setX não renormaliza",
contra um `setX` que renormaliza desde o r152). Por isso o `GH_DRY_RUN=1`
continua no plist: o filtro de publicação não separa esse caso.

Máquina desligada não perde nada: o poll revisa tudo que acumulou ao acordar.

## Persona

`persona.json` declara o personagem (palhacomal), avatar, tom e bordões. O
suporte mora em [`bots/lib/persona.mjs`](../lib/persona.mjs) — compartilhado por
todos os bots, ver [`bots/PERSONAS.md`](../PERSONAS.md). Regra dura: **persona é
tempero, não prato** — a voz entra na abertura e na assinatura; evidência,
`arquivo:linha` e veredito permanecem técnicos.

## Testes

```sh
cd bots && bun testar.mjs estraga   # 100% offline: parser, formatação, persona, ações
```

## Calibração ANTES de ligar em produção

O barulho mata um revisor (lição do CodeRabbit reclamando de cabeçalho de régua).
Rode o replay nos PRs cujos defeitos já são conhecidos e exija que a ação certa
acorde no lugar certo:

```sh
bun canarinho.mjs replay 209   # falso verde do fixture-check
bun canarinho.mjs replay 256   # VM14: pickup no buraco
bun canarinho.mjs replay 257   # CTF2/TEX1/MAT2 no UPA
bun canarinho.mjs replay 291   # TL11: régua de FPS
```

Se uma ação acender onde não devia, aperte O PROMPT da ação (não o teto global) —
teto esconde cegueira. Só depois de 2-3 replays limpos, promova a `review` real.

## Custo

~40–60k tokens por ação chamada; 1–4 ações por PR. Neste volume (~15 PRs/mês):
**≈ 3–6M tokens/mês** com modelo local/GLM. Réguas determinísticas continuam
de graça — o canarinho não as duplica.

## Limites conhecidos (declarados, não escondidos)

- Linha exata no comentário inline pode cair fora do diff (422 → fallback pro
  corpo; o fio não se perde).
- Ações leem só o diff (fatiado por arquivo, 100 KB/pedaço) + leis — não o repo
  inteiro. Contexto maior vira custo sem ganho medido (por enquanto).
- `bots/` está na lista IGNORAR: o bot não revisa o próprio código (o caminho
  interno vazaria contexto dos próprios payloads).
- Não é gate. Se um dia virar, o caminho é o mesmo do CodeRabbit: label
  `needs-canarinho-resolution` + check no automerge — só depois de calibrado.
