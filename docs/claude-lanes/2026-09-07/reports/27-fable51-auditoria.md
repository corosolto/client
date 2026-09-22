# Lane 27 — Auditoria do candidato histórico de pistola (`claude/vm-fable51-pistol`)

Prompt: [`27-VIEWMODEL-PISTOLA-FABLE.md`](../27-VIEWMODEL-PISTOLA-FABLE.md) ·
Destino da decisão: [`10-VIEWMODEL-CONTROLES.md`](../10-VIEWMODEL-CONTROLES.md)
Data: 2026-09-07 · Agente: Claude Opus 5 (headless, orquestrado por GLM 5.3)

**Rodada somente leitura.** Nenhum merge, cherry-pick, commit, push, PR ou rebuild foi
executado. A única escrita foi este arquivo. Nenhuma worktree foi alterada; o único
processo executado contra a worktree alvo foi um leitor de GLB com saída em `/tmp`.

---

## Veredicto (resumo executivo)

**A branch `claude/vm-fable51-pistol` não tem nada a extrair. Ela já está inteiramente
dentro do checkpoint `d35c6658`, por ancestralidade direta, e foi superada nele.**

- `fd58f492` (HEAD da lane) **é ancestral** de `d35c6658`. `git rev-list --left-right
  --count HEAD...d35c6658` = **`0 19`**: zero commits exclusivos da branch, 19 commits
  a mais no checkpoint.
- Os 7 commits da lane estão no checkpoint com **os mesmos hashes**. Nenhum arquivo
  criado por ela foi apagado; o handoff da lane é **o mesmo blob** nos dois lados.
- Os 3 arquivos que divergem entre `fd58f492` e `d35c6658` divergem **para frente**: o
  checkpoint substituiu a decisão de enquadramento da lane (yaw 20° → **15°, aprovado
  pelo Ruben em 05/09**) e refatorou o diagnóstico de contato para uma lib compartilhada.
- O enquadramento H da lane Fable virou literalmente **mutante** no contrato atual
  (`--mutante-quadro-antigo`, `--mutante-runtime-quadro-antigo` = yaw 20°).

**Ação recomendada para a lane 10:** partir de `d35c6658` (ou sucessor conferido) e
**ignorar a branch** — não há extração seletiva a fazer. O que a lane 10 herda da Fable
já chega pela base. A branch deve ser tratada como marco histórico, mantida para
rastreabilidade, sem PR.

Ressalva de escopo honesta: **não rodei gates de navegador nem gerei contact sheet**.
Eles exigem escrita dentro de worktree (servidor de dev + cache + `artifacts/`), o que
esta rodada proíbe. Estão registrados como pendências com os comandos exatos em
[§8](#8-pendências-gates-que-exigem-escrita-para-a-lane-10-executar). A medida causal
central foi, essa sim, **reverificada hoje de forma independente** ([§4](#4-medidas)).

---

## 1. Estado real da branch

| item | valor |
|---|---|
| Worktree | `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-fable51-pistol` |
| Branch | `claude/vm-fable51-pistol` |
| HEAD | `fd58f492bc39f528781f1b10e7496cdc93ab20f4` — `docs(viewmodel): handoff da lane Fable 5.1 da pistola` (04/09/2026 03:00) |
| Upstream | **nenhum** (`fatal: no upstream configured`) — nunca houve push nem PR |
| `git status` | **limpo**; só 3 diretórios ignorados (`artifacts/`, `node_modules/`, `public/private-assets/`). Zero arquivos não rastreados. |
| Base de criação | `6451ecaf` (reflog `@{7}`: `branch: Created from 6451ecaf`), vinda de `vm-cs16-gabarito` — a linhagem do **PR #468**, que o `18-VIEWMODELS-HISTORICOS.md` classifica como conflitante e enorme |
| Reflog | 8 entradas, todas de 04/09; nenhuma reescrita, nenhum commit órfão, nenhum stash da lane |

### Diff contra o checkpoint `d35c6658`

```
git merge-base HEAD d35c6658          → fd58f492…   (= o próprio HEAD)
git merge-base --is-ancestor HEAD d35c6658 → verdadeiro
git rev-list --left-right --count HEAD...d35c6658 → 0    19
git diff --stat d35c6658 fd58f492     → 96 arquivos, 470 (+) / 3487 (−)
```

Ou seja: voltar da base atual para a branch **removeria** 96 arquivos/3 487 linhas de
trabalho posterior (faca, luvas por time, piloto Astra, réguas de captura) e não traria
nenhuma linha nova. Esse é o custo real de qualquer merge ou continuação da branch.

Contexto que a lane 10 precisa saber: **`d35c6658` não é ancestral de `main`**
(`origin/main` = `38803801` v2.0.0-alpha.239). Toda a trilha autoral está fora da main —
`public/js/authoredvm.js`, `tools/eval/vm-gauntlet.mjs`, `tools/eval/pistol-viewmodel-contract.mjs`,
`tools/eval/vm-glb-inventory.mjs`, `tools/eval/vm-legend.mjs` e
`tools/viewmodels/assemble_paid_family.mjs` **não existem em `main`**. Isso é assunto do
`11-VIEWMODEL-INTEGRACAO.md`, não desta lane, mas invalida qualquer leitura de "a pistola
já está em produção".

---

## 2. Commits e arquivos únicos, com hashes

**Commits exclusivos da branch: nenhum.** Os 7 abaixo estão em `d35c6658` com hash
idêntico. Autoria uniforme: `rubenmarcus <rubenmarcus.dev@gmail.com>`, trailers
`Signed-off-by` + `Agent: Claude Code (Fable 5.1)`, 04/09/2026 02:12–03:00.

| # | hash | assunto | arquivos | estado em `d35c6658` |
|---|---|---|---|---|
| 1 | `86ae9925` | test: inventário estrutural do GLB e legenda por peça/lado | `tools/eval/vm-glb-inventory.mjs` (+245), `tools/eval/vm-legend.mjs` (+313) | presentes, íntegros |
| 2 | `95935669` | fix: socket da pistola herda a rotação de filho-de-bone | `tools/viewmodels/assemble_paid_family.mjs` (+4/−1) | **idêntico**, comentário e `Math.SQRT1_2` verbatim (linhas 443–448) |
| 3 | `d4e394b7` | test: contrato da pistola mede a orientação do cano | `tools/eval/pistol-viewmodel-contract.mjs` (+37) | invariantes preservadas; 2 mutantes novos acrescentados por cima |
| 4 | `4b1c2671` | test: gauntlet mede luva por lado e o ângulo do cano | `tools/eval/vm-gauntlet.mjs` (+105/−11) | `LUVA_MIN_PX`, `P1 duas mãos`, `P2 cano`, mutantes `cano-vertical` e `sem-mao-apoio` todos vivos |
| 5 | `16af2d36` | fix: pistola nivelada — escala 1,0, sem pose de apoio e frame medido | manifesto, `authoredvm.js`, contrato, `optimize_paid_family.mjs --familia`, 10 blocos gerados | escala/`supportGrip` preservados; **frame substituído** (§5) |
| 6 | `1d64af1c` | test: gauntlet projeta o pente com a matriz certa e fotografa após o render | `tools/eval/vm-gauntlet.mjs` (+28/−1), `ARCH.generated.md` | `updateMatrixWorld(true)` e os dois `requestAnimationFrame` presentes |
| 7 | `fd58f492` | docs: handoff da lane Fable 5.1 | `docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md` (+342) | **mesmo blob** (`git rev-parse fd58f492:… == d35c6658:…`) |

**Arquivos exclusivos da branch: nenhum.** Verificado item a item:

```
tools/eval/vm-glb-inventory.mjs            PRESENTE em d35c6658
tools/eval/vm-legend.mjs                   PRESENTE
tools/eval/pistol-viewmodel-contract.mjs   PRESENTE
tools/eval/vm-gauntlet.mjs                 PRESENTE
docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md  PRESENTE (blob idêntico)
```

Só 3 arquivos tocados pela lane divergem entre `fd58f492` e `d35c6658`, todos porque o
checkpoint avançou: `public/js/authoredvm.js` (+24/−19), `tools/eval/pistol-viewmodel-contract.mjs`
(+9/−5), `tools/eval/vm-gauntlet.mjs` (+6/−8).

---

## 3. Proveniência

- **Asset de origem:** pack pago KINEMATION, família `X18`/G18 (`A_FP_X18_Pose.FBX`,
  `A_X18_Reload_Tac.FBX`), declarado em `tools/viewmodels/paid-pack-manifest.json`.
  Fora do Git, em `/Users/ruben/csbrasil-private-assets/`. Nenhum asset de terceiros
  protegido foi copiado; a referência CS 1.6 foi usada só como alvo de composição.
- **Cadeia de build:** `build_paid_catalog.py --family pistol` (Blender + assembler) →
  `optimize_paid_family.mjs --familia=pistol` → `validate_paid_catalog.mjs`. O handoff
  registra que o rebuild devolveu o GLB montado com SHA `4e33ff58…`, **idêntico** ao
  montado à mão — cadeia determinística.
- **Artefato servido:** `pistol-runtime.glb`, SHA-256
  `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`, **3 005 712 bytes**.
  Verificado hoje no acervo: mesmo hash, mesmo tamanho, mtime `2026-09-04 02:29` —
  **não foi tocado desde a lane Fable**.
- **Predecessor preservado:** `pistol-runtime.glb.pre-optimize.bak`, SHA `f90d2878…`,
  22 222 412 bytes, mtime `2026-09-01 22:39` (o GLB de cano vertical).
- **Rastreio humano:** a lane declara explicitamente que **não** houve aprovação visual
  ("Quem aprova visualmente e declara golden é o Ruben; este arquivo não declara nada").
  A aprovação visual só veio depois, na lane Astra, e foi **para o yaw 15°**, não para o
  candidato H desta lane (`VIEWMODEL-ASTRA-PISTOL-HANDOFF.md`, seção "Aprovação e
  aplicação — 05/09/2026").
- **Continuidade documentada:** `codex/vm-astra-pistol` declara base `fd58f492`
  (`claude/vm-fable51-pistol`) — a linhagem foi assumida, não abandonada. É por isso que
  a ancestralidade fecha.

---

## 4. Medidas

### 4.1 Verificação independente feita hoje (somente leitura)

Rodei o próprio instrumento da lane contra o GLB servido, com saída em `/tmp`:

```
node tools/eval/vm-glb-inventory.mjs public/private-assets/viewmodels/pistol/pistol-runtime.glb \
  --pose=idle:0 --saida=/tmp/lane27-inventory-pistol.json
```

| medida | valor medido hoje | valor alegado no handoff (04/09) | confere |
|---|---|---|---|
| `SOCKET_WEAPON_PISTOL` rotação local | `[0.7071, 0, 0, 0.7071]` | `[√½, 0, 0, √½]` | ✅ |
| AABB do slide `CoroSolto_finish_dark` (x·y·z, m) | `0,0260 · 0,0341 · 0,1855` | `0,026 · 0,034 · 0,186` | ✅ |
| eixo longo do slide | **Z** (0,1855) — cano horizontal | Z | ✅ |
| boca − slide (centro Z) | `0,3493 − 0,3194` = **+0,0299 m** | +0,030 m | ✅ |
| bytes do GLB | 3 005 712 | 3 005 712 | ✅ |
| rigs | `RIG_FP_ARMS` 67 joints · `RIG_WEAPON_PISTOL` 8 joints | 67 / 8 | ✅ |
| clips | idle 0,4667 s, reload_tactical, reload_empty, shoot | idem | ✅ |

**O conserto causal da lane é real, está no asset servido e é reproduzível.** Isso é o
que a auditoria confirma — e é exatamente o que a base atual já herdou.

### 4.2 O que o checkpoint mediu depois, e por que H caiu

Do `VIEWMODEL-ASTRA-PISTOL-HANDOFF.md` (piloto Astra, 05/09), teste de yaw isolado com
tudo o mais fixo (x 0,100 / y −0,100 / z −0,220 / FOV 55 / pitch 0 / roll −5, mesmo GLB):

| aspecto / yaw | diagonal | mãos/arma | borda esq. | gauntlet |
|---|---:|---:|---:|---|
| 3:2 / **20°** (= candidato H da Fable) | 12,55 % | 3,779× | 0,5111 | sem falhas |
| 3:2 / **15°** (**aprovado**) | 12,15 % | 3,890× | 0,5403 | sem falhas |
| 3:2 / 10° | 11,85 % | 3,952× | 0,5674 | **P2 tamanho** (mínimo 12 %) — vetado |
| 16:9 / 20° | 13,15 % | 2,046× | — | **P4** amostra insuficiente mão/pente |
| 16:9 / 15° | 12,73 % | 2,122× | — | **P4**, mesmo defeito |

Os dois passam as réguas em 3:2; a escolha entre eles foi **visual**, e o Ruben escolheu
15° em 05/09. Não há medida que reabra H.

### 4.3 Estado final medido pela própria lane Fable (evidência local, 04/09)

`artifacts/viewmodels/golden-pistol/fable51-gauntlet-final/relatorio.json` — pistol,
**falhas: `[]`**; recarga: excursão da arma 0,25, excursão do pente 1,02, pente visto,
mão↔pente **0 px**; tiro: excursão 0,305.
`fable51-contract/final.json` — `ok: true`, `failures: []`, SHA servido `edb77908…`,
`frame.rotDeg: [0, 20, -5]` ← **é aqui que a evidência ficou velha**.

Regressão da AK golden na época (baseline `regressao-ak-golden-v1` → lane Fable): arma
5,96 % → 5,97 % do quadro, mão/arma 0,771 → 0,768, caixa idêntica, tiro 9,2 % → 9,2 %,
recarga 1,3 s 58 907 + 21 510 px → 58 791 + 21 583 px, `ak-hires.glb` intocado
(`3b6ca23d…`). Sem regressão detectável — e essa AK é justamente um dos controles da
lane 10.

---

## 5. Regressões

**Nenhuma regressão causada pelo checkpoint sobre a lane.** Nada que a Fable produziu foi
apagado. As três divergências são substituições deliberadas e documentadas:

1. **Enquadramento da pistola — substituído (não é regressão).**
   `public/js/authoredvm.js`: `pistol: … rotDeg: [0, 20, -5]` → **`[0, 15, -5]`**
   (`946cd4c6`, 05/09, `Agent: Codex (GPT-6 Astra)`), com o comentário trocado de
   "candidato H da varredura medida" para "Yaw 15° aprovado em 05/09".
   `tools/eval/pistol-viewmodel-contract.mjs`: `FRAME_BASE.rotDeg` `'0,20,-5'` →
   `'0,15,-5'`, e o valor da Fable foi **rebaixado a mutante** — `--mutante-quadro-antigo`
   e `--mutante-runtime-quadro-antigo` injetam `[0, 20, -5]` para provar que a régua
   morde. O contrato também ganhou uma checagem nova: o frame efetivo do browser precisa
   bater com o aprovado ("recapture sem overrides").
2. **Diagnóstico de contato do pente — refatorado.** O bloco inline da Fable em
   `vm-gauntlet.mjs` (filtro `pentePx > 2000`, distância `-1` traduzida como ">192 px")
   saiu para `tools/eval/lib/vm-contact-diagnostic.mjs`
   (`summarizeMagazineSupportContact`). O piloto Astra achou um defeito real no
   comportamento antigo: `-1` significava **amostra insuficiente**, e era reportado como
   mão desconectada. O portão continua vermelho, mas agora por ausência de medição, sem
   inventar distância. É melhoria, não perda.
3. **Materiais de mão — reescritos.** `tintHandMaterial` virou caminho `legacy` e o
   padrão passou a `applyTeamHandMaterial`/`refreshTeamHands` de `vmhands.js` (luvas por
   time). Os pesos `PESO_TINT` da Fable saíram; GoldSrc/retarget (`gs#`/`rt#`) ficaram no
   caminho antigo até terem rodada própria. Fora do escopo da pistola.

**Regressões e dívidas herdadas que continuam abertas** (não introduzidas por esta
auditoria, mas que a lane 10 vai encontrar):

- **P4 em 16:9 vermelho** para a pistola nos dois yaws — amostra insuficiente de contato
  mão/pente. Documentado, sem relaxamento de limiar. **BUG-75 continua aberto.**
- **Composição baixa:** a caixa começa em y/H 0,70; a referência VAL-1 mede 0,58.
- **Pistola pequena no quadro** (0,73 % da área, diagonal 12,6 % contra 44 % da AK) — é a
  escala real do X18, sem `weaponScale`.
- **Contato certificado por um único frame elegível** por execução em 3:2 — não cobre a
  animação toda.
- **Células `draw-*` do `golden-ak-runtime.mjs`** mostravam pose pronta; a lane Astra
  corrigiu o capturador (`e242dc12`), mas o gate P1 antigo segue sensível a frame
  duplicado.
- **`eval:authored-vm` com 4 falhas preexistentes** (26 armas/15 famílias esperadas
  contra catálogo 20/14, e rota golden da pistola) e **`check:fast` 63/66** (`eval:mapid`,
  `audio:check`, `feet:check`) — reproduzidas na lane Fable limpa, ou seja, **não são
  culpa da pistola**. A lane 10 não deve tentar consertá-las de dentro do escopo dela.

---

## 6. Valor real para a lane de controles (`10-VIEWMODEL-CONTROLES.md`)

**Extração seletiva a fazer: nenhuma.** Não existe um único hunk na branch que não esteja
em `d35c6658`. Qualquer cherry-pick seria um no-op; qualquer merge seria uma reversão de
96 arquivos.

O que a lane 10 **herda pela base** e deve usar (tudo já em `d35c6658`):

| ferramenta / régua | onde | serve à lane 10 para |
|---|---|---|
| `tools/eval/vm-glb-inventory.mjs` | herdado da Fable | nomear nó/skin/joint/material e medir AABB em world com skinning avaliado — é o instrumento que liga pixel a osso, e funciona para **AK e faca** também, não só pistola |
| `tools/eval/vm-legend.mjs` | herdado da Fable | pintar peça e **lado** (luva esq./dir.) e contar pixels — resolve "mão de apoio sumiu" sem achismo |
| `P1 duas mãos` + `LUVA_MIN_PX` no gauntlet | herdado | auditoria de mãos/braços exigida pelo prompt 10 |
| `P2 cano` (≤ 60° do eixo óptico) | herdado | invariante de runtime da orientação da arma |
| invariante de socket + boca do cano no contrato | herdado | contrato estrutural por arma |
| `updateMatrixWorld(true)` antes de projetar + 2 RAF no `shot()` | herdado | **as duas correções que impediam a régua de mentir**; se a lane 10 escrever sonda nova, precisa dos dois |
| `optimize_paid_family.mjs --familia=<f>` | herdado | reotimizar **só** a família reconstruída, deixando `shared/` e as outras 14 intactas — obrigatório em worktree compartilhada |
| `tools/eval/lib/vm-contact-diagnostic.mjs` | do checkpoint (pós-Fable) | contato do pente sem inventar distância |
| mutantes `cano-vertical`, `sem-mao-apoio`, `pente-estatico`, `sem-arma`, `sem-pente`, `draw-idle`, `tiro-estatico`, `perfil-estreito`, `quadro-antigo`, `runtime-quadro-antigo` | herdados + 2 novos | prova de mordida pronta; a lane 10 não precisa reinventar |

O que a lane 10 herda como **conhecimento** (leitura obrigatória, ~15 min):

- `docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md` — a causa raiz (socket com rotação
  identidade) e a varredura de 15 quadros A–O com falhas por candidato. **Evita repetir a
  varredura de câmera**: está medido que pitch positivo (J–N) leva mão/arma a 5–6× e que
  FOV 60 sobre o mesmo quadro reabre "arma some" (candidato O).
- `docs/reports/VIEWMODEL-ASTRA-PISTOL-HANDOFF.md` — a decisão de 15°, os vetos de B/C e
  10°, e o P4 16:9 aberto.
- `docs/reports/VIEWMODEL-SERIES-HANDOFF.md` e `PROMPT-CLAUDE-VIEWMODELS.md` (ambos em
  `946cd4c6`) — a continuação oficial da série.

**Único valor que existe fora do Git e não está na base:** os ~182 MB de evidência
gitignored em `vm-fable51-pistol/artifacts/viewmodels/golden-pistol/fable51-*` (26
diretórios: `fable51-inventory`, `fable51-legend-antes/depois/socket90/v3-neutro`,
`fable51-grid` com os 15 candidatos + `MUT-*`, `fable51-contract`, `fable51-runtime-final`,
`fable51-antes-depois`, `fable51-ak-regressao`, `fable51-draw-probe`, 8 `fable51-mutante-*`).
Valor **histórico e documental**, não operacional:

- é a prova de mordida dos mutantes e a origem da tabela A–O;
- **está velha**: foi medida com `rotDeg [0, 20, -5]`. `fable51-contract/final.json`
  registra literalmente `"rotDeg": [0, 20, -5]`. Contra o padrão atual (15°) essas folhas
  **reprovariam** no contrato (`frame efetivo do browser diverge do enquadramento aprovado`);
- a evidência equivalente e **atual** já existe em
  `vm-astra-pistol/artifacts/viewmodels/astra-pistol/approved-runtime/` (27 frames,
  05/09 10:12, sem overrides, contrato verde).

→ **Não copie as folhas `fable51-*` para a lane 10.** Se precisar delas, referencie o
caminho e a data, deixando explícito que são de yaw 20°.

---

## 7. Itens perigosos

1. **🔴 `public/private-assets/viewmodels` na worktree Fable é um SYMLINK para o acervo
   compartilhado.**
   ```
   public/private-assets/viewmodels -> /Users/ruben/csbrasil-private-assets/generated/viewmodels
   ```
   Rodar `build_paid_catalog.py`, `optimize_paid_family.mjs` ou qualquer builder **dentro
   de `vm-fable51-pistol` reescreve o acervo que todas as outras lanes servem**, incluindo
   o `pistol-runtime.glb` `edb77908…` que hoje é a referência de SHA de três handoffs. O
   piloto Astra já tinha detectado isso e adotou **cópia APFS local** em vez de symlink; a
   `vm-controles-final` também tem diretório real (não symlink). **Nunca reconstruir
   asset a partir da worktree Fable.**
2. **🔴 Merge ou rebase da branch = reversão.** `git merge claude/vm-fable51-pistol` na
   lane 10 é no-op (é ancestral), mas qualquer `reset`, `revert` ou "voltar para o estado
   da Fable" derruba 96 arquivos e 3 487 linhas: a faca fechada, as luvas por time, o
   piloto Astra inteiro e o yaw aprovado. Não existe cenário legítimo para isso.
3. **🟠 Reaplicar o candidato H (yaw 20°) por engano.** Ele hoje é a definição de dois
   mutantes. Se a lane 10 copiar números do handoff da Fable para `FAMILY_FRAME.pistol`,
   torna o contrato vermelho e desfaz uma decisão humana explícita de 05/09.
4. **🟠 Base da branch vem de `vm-cs16-gabarito` (`6451ecaf`), a linhagem do PR #468**,
   marcado como conflitante e enorme no `18-VIEWMODELS-HISTORICOS.md`. Isso reforça: não
   se aproxime dessa branch por merge; a ponte correta já foi feita e é `d35c6658`.
5. **🟠 `vm-controles-final` (`glm/vm-controles-final`, HEAD `d35c6658`) tem um diretório
   não rastreado `artifacts-audit/`** (07/09 01:57) e `node_modules` + cópia local de
   `private-assets`. Há sinal de outro agente trabalhando ali. Antes de escrever, confirmar
   `git status` e **não limpar** esse diretório.
6. **🟡 Node v16 em `/usr/local/bin` sombreia o Node 23 do Homebrew.** `sharp` e
   `import … with { type: 'json' }` exigem ≥ 22. Sem `export PATH=/opt/homebrew/bin:$PATH`
   os gates falham por motivo errado e o diagnóstico se perde.
7. **🟡 Asset privado sem proveniência em Git.** O GLB servido é output da lane Fable e
   vive só no acervo, referenciado por SHA em documentos. Se alguém rodar um rebuild não
   determinístico, três handoffs passam a apontar para um hash inexistente. O `validate`
   e o contrato conferem SHA — mantenha-os no caminho.

---

## 8. Pendências: gates que exigem escrita (para a lane 10 executar)

Não rodados nesta auditoria por exigirem escrita em worktree (servidor de dev, cache de
build e `artifacts/`). Rodar **de `vm-controles-final`**, nunca de `vm-fable51-pistol`,
sempre com `export PATH=/opt/homebrew/bin:$PATH` e **um navegador por vez**:

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-controles-final
export PATH=/opt/homebrew/bin:$PATH

# 1. captura de runtime da pistola SEM overrides (tem de sair no yaw 15 aprovado)
node tools/eval/golden-ak-runtime.mjs --arma=pistol --modo=kinemation \
  --porta=8347 --largura=1440 --altura=960 \
  --saida=artifacts/viewmodels/controles/pistol-3x2

# 2. contrato contra essa captura (deve ficar verde, SHA servido = edb77908…)
node tools/eval/pistol-viewmodel-contract.mjs \
  --runtime-report=artifacts/viewmodels/controles/pistol-3x2/runtime-report.json

# 3. mutantes que provam que a régua morde o quadro antigo (= o candidato H da Fable)
node tools/eval/pistol-viewmodel-contract.mjs \
  --runtime-report=… --mutante-quadro-antigo          # esperado: VERMELHO
node tools/eval/pistol-viewmodel-contract.mjs \
  --runtime-report=… --mutante-runtime-quadro-antigo  # esperado: VERMELHO
node tools/eval/pistol-viewmodel-contract.mjs --runtime-report=… --mutante-cano-vertical  # VERMELHO

# 4. gauntlet da pistola + mutantes causais
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol \
  --largura=1440 --altura=960 --frames --out=artifacts/viewmodels/controles/pistol-gauntlet
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --mutante=cano-vertical --out=…  # VERMELHO
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --mutante=sem-mao-apoio  --out=…  # VERMELHO

# 5. controle de regressão obrigatório: AK golden intocada
node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak --largura=1440 --altura=960 --frames --out=…
node tools/eval/ak-viewmodel-contract.mjs

# 6. contact sheet 3:2 e 16:9 para a revisão visual do Ruben
#    (repetir o passo 1 com --largura=1920 --altura=1080)
```

Baselines contra as quais comparar (não regenerar, só ler):
`vm-astra-pistol/artifacts/viewmodels/astra-pistol/approved-runtime/` (yaw 15, 05/09) e
`.../final-ak-control/`. AK: `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
Pistola: `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`.

Esperar **P4 vermelho em 16:9** (BUG-75) e as 4 falhas preexistentes de
`eval:authored-vm` / 3 de `check:fast`. Se aparecerem, **não são regressão da lane 10**.

---

## 9. Comandos de verificação desta auditoria (reproduzíveis)

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-fable51-pistol

# estado da branch
git rev-parse HEAD                                    # fd58f492bc39f528781f1b10e7496cdc93ab20f4
git rev-parse --abbrev-ref --symbolic-full-name @{u}  # fatal: no upstream
git status --porcelain --ignored                      # 3 linhas, todas '!!'
git reflog show claude/vm-fable51-pistol              # 8 entradas; @{7} = Created from 6451ecaf

# a prova central da auditoria
git merge-base --is-ancestor HEAD d35c6658 && echo "contido no checkpoint"
git rev-list --left-right --count HEAD...d35c6658     # 0    19
git diff --stat d35c6658 fd58f492 | tail -1           # 96 files, 470 (+), 3487 (−)

# nada da lane foi perdido
git rev-parse fd58f492:docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md \
              d35c6658:docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md   # dois blobs iguais
git show d35c6658:tools/viewmodels/assemble_paid_family.mjs | grep -n SQRT1_2
git show d35c6658:tools/eval/vm-gauntlet.mjs | grep -c LUVA_MIN_PX        # 4
git show d35c6658:tools/eval/pistol-viewmodel-contract.mjs | grep -o "hasMutant('[a-z-]*')" | sort -u

# o que o checkpoint mudou por cima
git diff fd58f492 d35c6658 -- public/js/authoredvm.js \
    tools/eval/pistol-viewmodel-contract.mjs tools/eval/vm-gauntlet.mjs
git log -1 --format='%s%n%an' 946cd4c6   # apply approved pistol yaw / Codex (GPT-6 Astra)

# asset servido (leitura; saída em /tmp)
shasum -a 256 public/private-assets/viewmodels/pistol/pistol-runtime.glb
export PATH=/opt/homebrew/bin:$PATH
node tools/eval/vm-glb-inventory.mjs public/private-assets/viewmodels/pistol/pistol-runtime.glb \
  --pose=idle:0 --saida=/tmp/lane27-inventory-pistol.json

# fora da main
git merge-base --is-ancestor d35c6658 main || echo "d35c6658 NAO esta na main"
git cat-file -e main:public/js/authoredvm.js || echo "authoredvm.js ausente na main"
```

---

## 10. Próximos passos recomendados

1. **Lane 10 (`vm-controles-final`, já em `d35c6658`): siga sem olhar para trás.** Confirme
   `git status` (há `artifacts-audit/` não rastreado de outro agente), confirme ancestry
   com `git merge-base --is-ancestor d35c6658 HEAD`, e trate esta auditoria como o
   fechamento do item "candidato histórico de pistola". **Não abra PR para a Fable.**
2. **Leia os dois handoffs antes de tocar no enquadramento da pistola.** A varredura A–O
   e o teste de yaw isolado já eliminaram 17 candidatos com medida. Repetir varredura de
   câmera é gastar rodada em espaço fechado.
3. **Primeira medição da lane 10 na pistola deve ser o P4 em 16:9 (BUG-75)** — é a única
   dívida técnica viva da família, e o piloto Astra já apontou o caminho: medir contato
   de **superfícies deformadas** (mão esquerda, `Mag`, `Cartridge` em reload .52/.60/.68),
   não distância entre pivôs. Régua antes do conserto, mutante vermelho, depois o normal.
4. **Trate `edb77908…` como asset congelado.** Nenhum rebuild sem necessidade provada; se
   houver, faça-o com `privateRoot` explícito apontando para cópia local, jamais pelo
   symlink da worktree Fable, e com `--familia=pistol`.
5. **Destino da branch `claude/vm-fable51-pistol`: manter local, sem PR, como marco
   histórico.** Ela é ancestral da base e o handoff dela já está versionado em
   `d35c6658` — o conhecimento está preservado mesmo se a branch for apagada. Apagar ou
   não é decisão do dono; não há urgência nem risco em mantê-la.
6. **A evidência `fable51-*` (182 MB) pode ser arquivada ou descartada** a critério do
   dono. Se for descartada, o que se perde são folhas de contato de um enquadramento que
   hoje é mutante; a evidência vigente está em `astra-pistol/approved-runtime/`.
7. **Não confundir com integração:** nada disso está em `main`. A promoção da trilha
   autoral inteira é assunto do `11-VIEWMODEL-INTEGRACAO.md` / `28-RELEASE-PACOTE-1.md`.

---

*Auditoria somente leitura concluída em 2026-09-07. Nenhum merge, cherry-pick, commit,
push, PR, rebuild ou alteração de worktree. Gates de navegador e contact sheet não
executados por exigirem escrita — comandos exatos em §8. Nenhuma aprovação humana é
alegada aqui.*
