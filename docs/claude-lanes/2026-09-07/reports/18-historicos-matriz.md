# Lane 18 — Matriz de saneamento dos PRs históricos de viewmodel (#464, #468, #534)

Data/hora: 2026-09-07 (auditoria somente leitura concluída; relatório final)
Agente: GLM 5.3 (ZCode) — lane 18 VIEWMODELS-HISTORICOS
Modo: SOMENTE LEITURA. Nenhum commit, push, cherry-pick, branch, fechamento ou comentário externo foi executado. Nenhum `git fetch` (refs locais do repo principal estavam obsoletos; estado remoto obtido via `gh api`).

---

## 1. Metodologia

1. Contexto: `README.md`, `INVENTARIO-PRS.md`, prompt `18-VIEWMODELS-HISTORICOS.md` (pacote 2026-09-07) e o ledger `docs/reports/VM-PREP-RIFLES.md` da worktree `vm-prep-rifles` (HEAD `f63e730f`).
2. Estado real dos PRs via `gh pr view`/`gh pr checks` e arquivos via `gh api pulls/N/files --paginate` (o `gh pr diff --name-only` falha com HTTP 406 acima de 20.000 linhas).
3. Heads autoritativos das branches via `gh api repos/corosolto/client/branches/<branch>` — **o campo `commits[-1]` de `gh pr view` mente quando o PR tem >100 commits** (limite da API): em #468 ele mostra `02727a0c` mas o head real é `9faf8d30`.
4. Árvore do `main` atual (`3880380165`, 2026-09-07T00:24Z) baixada via `git/trees?recursive=1` (3.594 arquivos, `truncated:false`) para teste de presença por caminho.
5. Genealogia por `git merge-base` / `merge-base --is-ancestor` sobre objetos já presentes no clone local; comparação de conteúdo por `git diff` entre heads dos PRs e checkpoints (`f63e730f`, `a988d72b`, `d35c6658`, base prep `961c70d2`) e por SHA-256 de arquivos-chave.

## 2. Descoberta estrutural (a chave de toda a matriz)

O `main` atual **não contém nada do runtime de viewmodel autorado**: não existem `public/js/authoredvm.js`, `public/js/vmweapon.js`, `public/js/data/vmconfig.js`, `public/models/viewmodels/` nem `tools/viewmodels/` no `main` (árvore conferida). Todo esse sistema vive apenas na linhagem "prep", e a genealogia verificada é:

```
feat/wallpapers-brasileiros 75eb29ad (22/08; PR #421 FECHADO sem merge)
  └─ [48 commits: pipeline pago KINEMATION/WRAD, GLBs goldsrc, coro hires,
     fp-arms, tools/viewmodels, runtime autorado inicial]
       1d33cb7b (29/08 "AK assada offline")  ← merge-base(464, 468)
       ├─ #464 feat/fps-paid-viewmodels-aaa 9f26f68e (31/08)  [+4 commits únicos]
       └─ #468 vm-cs16-gabarito 9faf8d30 (01/09, head real no GitHub)
            ├─ [gabarito CS1.6 24e51dac, trilha B, golden AK a2396697,
            │   arsenal 26→20 84f691d1, pistola, 378 commits]
            ├─ local vm-cs16-gabarito 6451ecaf (+12 commits; conteúdo JÁ
            │   contido na prep via merge — vm-frame-calibra.mjs e
            │   vm-kick-perfil.mjs presentes em f63e730f)
            └─ [piloto pistola Astra, luvas, faca] → 961c70d2 (06/09 00:10)
                "base prep" das lanes 01–10
                ├─ f63e730f  vm-prep-rifles   (M4 idle reautorada, ledger)
                ├─ a988d72b  vm-prep-precisao (fechamento rastreio C2)
                └─ d35c6658  linhagem awp/shotgun/curtas (faca confirmada)
```

**Consequência:** o head do #468 é ancestral direto da base prep `961c70d2`, e o head do #464 é ancestral lateral da mesma. Todo o conteúdo de viewmodel dos dois PRs já está contido (e evoluído) nas worktrees atuais das lanes 01–10. Nenhum dos dois pode ser "mergeado inteiro" sem regredir a integração final nem despejar frentes não-viewmodel no `main`.

Verificação de amostras de conteúdo compartilhado (head #464 → checkpoint `f63e730f`):
`vm-socket-baseline.json`, `WRAD-ARMS-LICENSE.txt`, `build_paid_catalog.py` — 0 linhas de diff; `goldsrc/ak47.glb` — SHA-256 idêntico (`d7d016b2…`); `paid-pack-manifest.json` — 13 linhas (prep evoluiu); `public/models/viewmodels/FONTE.md` — 37 linhas (prep evoluiu); `tools/viewmodels/cs16-timings.json` — 1.325 linhas (prep refinou muito).

## 3. Matriz — PR #464 (`feat/fps-paid-viewmodels-aaa` → base `feat/wallpapers-brasileiros`)

Estado: OPEN, UNSTABLE, 199 arquivos, +65.639/−14.782, 52 commits, head `9f26f68e035b636454717fcddadd83bb0575d493` (31/08). Checks agora: build/portão/smoke/Vercel/autofix **fail**. A base `feat/wallpapers-brasileiros` (`75eb29ad`) teve o PR #421 **fechado sem merge** — o PR nem mira o `main`.

Dos 52 commits, 48 são a história compartilhada do programa pago (abaixo de `1d33cb7b`) e **4 são únicos** (`1d33cb7b..9f26f68e`: `8a97d87e`, `870c6208`, `81ef7355`, `9f26f68e`).

| Item (hash do commit) | Classificação | Justificativa |
|---|---|---|
| `tools/blender/viewmodels/knife_melee/{build.py(414 l), contact_sheet.py, validate_blend.py, validate_glb.py, README.md}` (`8a97d87e`) | **[útil ainda — condicional]** | Pipeline reproduzível da faca; **ausente** em `961c70d2`/`f63e730f`/`a988d72b`/`d35c6658` (verificado por `git ls-tree`). A prep fechou a faca por outra rota (`promote-knife-motion.mjs`, `inspect_knife_registration.py`, `d35c6658` é só docs). Interessante como referência/ferramenta para a lane 10 (`10-VIEWMODEL-CONTROLES`) e 27 se a faca aprovar re-autoria; extrair apenas sob decisão da lane. |
| `public/models/viewmodels/coro/melee/FONTE.md` (+16, `8a97d87e`) | **[útil ainda]** | Proveniência da faca melee; **ausente** em `f63e730f` (o GLB `knife-hires.glb` já está lá pela história compartilhada). Pequeno, sem risco; acompanha a extração do item acima. |
| `docs/reports/VIEWMODEL-CONTINUATION-HANDOFF.md` (81 l, `81ef7355`) | **[já substituído]** | SHA-256 `181c63eb…` ≠ versão da prep `072635b9…` (idêntica à do head #468 e presente em `f63e730f`). A versão da prep é mais nova. |
| GLBs `goldsrc/*` (18), `fp-arms.glb`, `fpvm_hands.{glb,blend}`, `coro/{ak,akm,pistol}-hires.glb`, `coro/melee/knife-hires.glb` | **[já substituído]** | História compartilhada (abaixo de `1d33cb7b`), idêntica por hash à da prep (amostra `ak47.glb` = `d7d016b2…`). |
| `tools/viewmodels/*` (12 arquivos: `assemble_paid_family.mjs`, `bake_family.mjs`, `build_paid_catalog.py`, `extract_paid_unitypackage.py`, `paid-pack-manifest.json`, `validate_paid_catalog.mjs`, `vm-socket-baseline.json`, …) | **[já substituído]** | Presentes na prep; maioria idêntica, demais evoluída lá (manifest, timings). |
| `public/js/{authoredvm,game,vmweapon,fpsrig,fparms,springs,vmrecoil,vmattach,meleevm,glbchars,main}.js`, `data/vmconfig.js`, `weapons.js` | **[já substituído]** | Versões ancestrais; a prep evoluiu (ex.: `CATALOG_VERSION` `paid-aaa-2` → `paid-aaa-3`). |
| `.serena/project.yml` (229 l), `.serena/memories/viewmodel-program.md`, `.serena/.gitignore`, `.codex/config.toml`, `.claude/settings.json`, `SCRIPTS.md`, `docs/docs/instrumentacao-ai.md`, `tools/eval/context-budget-check.mjs` (`870c6208`, `9f26f68e`) | **[perigoso — fora de escopo]** | Instrumentação/config de agentes AI no repo; política de repositório, não frente de viewmodel; mesclar sem decisão do dono polui o `main`. A "memória do programa" está superada pelos ledgers das lanes. |
| `AGENTS.md`, `STATUS.md`, `README.md`, `KNOWN-BUGS.md`, `ARCH.generated.md`, `astro.config.mjs`, `package.json`, docs/site (6+5) | **[perigoso/ruído]** | Gerados e raízes de estado de 31/08; regrediriam o `main` de 07/09. `ARCH.generated.md` é gerado — nunca extrair. |
| DCO dos 4 commits únicos | OK com ressalva | Todos com `Signed-off-by`; `8a97d87e` assinado com e-mail alternativo `neburzul@gmail.com` (GitHub DCO aceitou). |

**Destino proposto #464: FECHAR COMO SUPERSEDED** (após ordem do dono). O conteúdo de viewmodel é ancestral da linhagem prep; a base é branch morta de PR fechado; CI vermelho. Antes de fechar, extração seletiva em worktree nova (nunca no histórico original): `knife_melee/*` + `coro/melee/FONTE.md`, **somente se** a lane 10/27 decidir usá-los. Nada mais tem valor único.

## 4. Matriz — PR #468 (`vm-cs16-gabarito` → base `main`)

Estado: OPEN, **DIRTY/CONFLICTING**, 1.693 arquivos, +123.753/−15.585, head real `9faf8d3011ed75c232bf487fd2a9151519f51ce8` (01/09; `gh pr view` mostra `02727a0c` pelo limite de 100 commits da API). Checks agora: `classify` **fail**. Branch local `6451ecaf` tem 12 commits não empurrados cujo conteúdo já está na base prep (verificado).

Composição do diff vs `main` (1.693 arquivos): `tools/eval` 870 (sendo 707 `asset-evidence/`), `public/img` 247, `public/models` 210 (anims 110, props 48, viewmodels 27, characters 18, shells 6), `public/video` 54, `tools/blender` 95, `public/js` 49, `tools/viewmodels` 15, `src/pages` 9, docs 15, skills/specs/tools ~40.

| Item | Classificação | Justificativa |
|---|---|---|
| Todo o sistema de viewmodel (27 `public/models/viewmodels` + 15 `tools/viewmodels` + ~60 `tools/blender/viewmodels` + `authoredvm.js`/`vmweapon.js`/`vmconfig.js`/`vmlab.js` etc.) | **[já substituído]** | O head `9faf8d30` é **ancestral direto** de `961c70d2` (base prep), donde descem `f63e730f`, `a988d72b`, `d35c6658`. As lanes 01–10 já evoluíram tudo isso (ex.: `cs16-timings.json` +1.325 linhas de evolução só do 464→prep; gabarito/`authoredvm` continuaram evoluindo depois). |
| Trilha B goldsrc (`6c78f6b5` "molde GoldSrc CC0 com arma Mint", `55f49829` "26 armas") | **[já substituído + reprovado por evidência]** | O ledger da M4 reprovou os splits B/C como solução: "o builder B escolhe ilhas pela caixa do doador, sem garantir significado mecânico" (`build_goldsrc_vm.py:315,379–433`); fragmentos errados medidos arma a arma. Não extrair. |
| Commit-título `24e51dac` (âncora CS 1.6 nas 14 famílias + recarga na raiz), `5103603d`, `e74a104b`, `fc761dfa` etc. | **[já substituído]** | Presentes na árvore ancestral da prep; a lane M4 (`f63e730f`) reautorou a pega da M4 dedo a dedo contra a referência aprovada, superando o gabarito original. |
| `84f691d1` (arsenal 26→20; decisão do dono 30/08: saem akm, tavor, g3, g3sg1, rem700, m400) | **[já substituído — mas atenção]** | Já herdado pela prep: `WEAPON_IDS` em `f63e730f` tem exatamente 20 armas (conferido). O plano de lanes de 07/09 fala em 26 armas — tensão a resolver na lane 11 (integração) com o dono, **não** via este PR. |
| `a2396697` (AK golden no runtime) + `docs/reports/GOLDEN-{AK,PISTOL}-DECISION.md` | **[já substituído]** | Golden AK é controle de regressão vigente na prep (`ak-hires.glb`, hash `3b6ca23d…` no ledger). |
| 707 `tools/eval/asset-evidence/*`, 247 `public/img/*`, 54 `public/video/chars/*.webm`, 110 `anims`/48 `props`/18 `characters`, 9 `src/pages/*.astro`, `.claude/skills/*` | **[perigoso — frentes não-viewmodel]** | Personagens/paredes/fauna/props/site: essas frentes **já chegaram ao `main` por outros PRs** (no `main` há 620 `anims`, 157 `props`, 45 `characters`, 143 `video`, 89 `img/chars`); mesclar o #468 regrediria/sobrescreveria versões mais novas — é exatamente a causa do CONFLICTING. Os `asset-evidence` são dumps de evidência (no `main` só há 38) que não precisam entrar. |
| `tools/eval/{map_check.json(+11.869), mat_check.json(−33.538/+), pickup_check.json(9.206)}`, `ARCH.generated.md` | **[perigoso — gerados]** | Artefatos regenerados em massa; ruído gigante no diff; nunca extrair — regenerar na integração. |
| 12 commits locais `9faf8d30..6451ecaf` (`vm-frame-calibra.mjs`, `vm-kick-perfil.mjs`, `build_retarget_all.mjs`, 2 docs, `authoredvm.js`) | **[já substituído]** | Conteúdo já contido na prep via merge do piloto da pistola (ferramentas presentes em `f63e730f`, verificado). Nada a extrair; a branch local pode ser descartada quando o dono decidir. |
| DCO na faixa única | OK | Amostra de 20 commits: todos com `Signed-off-by` (rubenmarcus ou deploy-bot). Check `classify` é o que falha, não DCO. |

**Destino proposto #468: FECHAR COMO SUPERSEDED** (após ordem do dono). 100% do conteúdo de viewmodel é ancestral da linhagem prep; o resto são frentes alheias já resolvidas no `main` e dumps de evidência. A chegada do sistema de viewmodel ao `main` deve ocorrer pelo fluxo novo: lanes 01–10 → `11-VIEWMODEL-INTEGRACAO` → PR novo contra `main`. Nenhum cherry-pick deste PR é necessário.

## 5. Matriz — PR #534 (`codex/vm-m4-reload-evidence` → base `main`)

Estado: OPEN, **CLEAN/MERGEABLE**, 2 arquivos, +232/−0, 6 commits (1 substantivo + 5 merges autofix). Head real `1841204c50935867ad882ea422dbf2881cafeed9` (07/09 00:24, merge autofix). Checks agora: `build` **pass** (14m07s), `dco` **pass**, CodeQL/Vercel/autofix/automerge **pass**. Branch local à frente: `4d2a99ef660964e4ca8f71cd695ca8c40c606694` (06/09 17:33) **não empurrado**.

| Item (hash) | Classificação | Justificativa |
|---|---|---|
| `tools/viewmodels/prep/rifles-m4-actions-fingers-c2.py` (195 l, `d56b5475`) | **[já substituído]** | SHA-256 `b9d3ad40c5211b0be73117644628b9e198259f0b62218fbb3010779e6d0d4ab3` **idêntico** ao da worktree `vm-prep-rifles` — já existe na integração. |
| `docs/reports/M4-RELOAD-DIAGNOSTIC-2026-09-06.md` (37 l, `d56b5475`) | **[útil ainda — evidência única]** | **Não existe em nenhum checkpoint prep** (`961c70d2`, `f63e730f`, `a988d72b`, `d35c6658` — conferido). Registra a rejeição da sonda C2: f062 com 45/6 cruzamentos (anelar) e 94/13 (mínimo); solução exigiria `pinky_01_l=−83°`/`ring_01_l=−45°` (indefensável visualmente); pele exposta no punho f013/f045 persiste; GLB privado de avaliação `c9aa6dbb…` fora do Git. Consistente com o ledger M4 (C3 sem candidato; punho = bloqueio atual). É a evidência que a lane 01 lê. |
| `4d2a99ef` (local, fora do PR): `tools/viewmodels/prep/m4-cuff-profile.py` (183 l) + `docs/reports/VIEWMODEL-SEQUENTIAL-CONTINUATION.md` (55 l) | **[útil ainda — o mais valioso]** | Ferramenta exatamente do próximo passo do bloqueio atual: mede as camadas deformadas manga/pele do punho com BVH sem editar rig/materiais aprovados; trava branch/worktree por nome, valida o GLB fonte `20fd7f8b…` por hash, suporta `--transfer-weights`. Ausente de todas as worktrees (conferido `vm-prep-rifles` e `vm-prep-precisao`). |
| Binários/segredos | **[sem risco]** | PR é só markdown+python; GLB privado declarado fora do PR; DCO verde; base `main`. |

**Destino proposto #534: ATUALIZAR PEQUENO.** Empurrar o commit local `4d2a99ef` (nova worktree, nunca escrever na branch original sem ordem), reexecutar checks e deixar o PR pronto para merge como documentação/evidência da M4 — merge somente com ordem do dono. Alternativa registrada: absorver o doc no PR da lane M4 (#509), mas manter o #534 é mais limpo porque o prompt 01 o referencia.

## 6. Riscos transversais

- **Licenças/dependências privadas:** `WRAD-ARMS-LICENSE.txt` e `paid-pack-manifest.json` (KINEMATION, Fab Standard License, `redistributableAsSource:false`) já estão na prep idênticos/evoluídos — nenhuma extração dos PRs introduz dependência privada nova no Git (FBXs permanecem fora). Trilha B GoldSrc: declaração CC0 do dono em `public/models/viewmodels/FONTE.md` (história compartilhada). Antes de usar `knife_melee/build.py`, auditar de quais fontes privadas ele lê (não executado nesta auditoria).
- **DCO:** trailers presentes nos commits únicos amostrados dos três PRs; check DCO verde (#534 confirmado agora; #464/#468 conforme inventário). Ressalva: `8a97d87e` (#464) assinado com e-mail alternativo `neburzul@gmail.com`.
- **Cache-bust:** `CATALOG_VERSION` controla os URLs `?v=` de todos os GLBs de viewmodel (`authoredvm.js:21,114,252,256,261` na prep). #464 está em `paid-aaa-2`, prep em `paid-aaa-3` — qualquer mesclagem do 464 regridiria o cache-bust. Extrações que promovam GLB exigem bump da versão na integração (lane 11).
- **Gerados:** `ARCH.generated.md`, `tools/eval/{map_check,mat_check,pickup_check}.json`, `asset-evidence/*`, páginas astro e contagens — nunca extrair; regenerar na árvore alvo.
- **Volatilidade:** `main` remoto em `3880380165` (07/09 00:24Z) está ~500 commits à frente dos pontos de fork; refs locais do repo principal estavam obsoletas (`main` local = `45581c27`, 22/08). Revalidar com os comandos abaixo antes de qualquer ação.
- **Arsenal:** a prep opera com 20 armas (decisão do dono 30/08, `84f691d1`); o plano de lanes fala em 26. Decisão da lane 11/dono, não destes PRs.

## 7. Comandos de verificação (reprodução, somente leitura)

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/client

# Estado real dos PRs (heads autoritativos pela API de branches, NÃO por commits[-1])
gh pr view 464 --json mergeStateStatus,additions,deletions,changedFiles,headRefName,baseRefName
gh pr view 468 --json mergeStateStatus,additions,deletions,changedFiles,headRefName,baseRefName
gh pr view 534 --json mergeStateStatus,additions,deletions,changedFiles,headRefName,baseRefName
gh api repos/corosolto/client/branches/vm-cs16-gabarito --jq .commit.sha        # 9faf8d30…
gh api repos/corosolto/client/branches/codex/vm-m4-reload-evidence --jq .commit.sha # 1841204c…
gh api repos/corosolto/client/branches/main --jq .commit.sha                    # 3880380165…

# Arquivos dos PRs (gh pr diff falha com 406 acima de 20k linhas)
gh api repos/corosolto/client/pulls/464/files --paginate -f per_page=100 --jq '.[].filename'
gh api repos/corosolto/client/pulls/468/files --paginate -f per_page=100 --jq '.[].filename'

# Genealogia (objetos já presentes no clone local)
git merge-base 9f26f68e 9faf8d30                 # = 1d33cb7b (fork 464/468)
git merge-base --is-ancestor 9faf8d30 961c70d2 && echo "468 contido na prep"
git merge-base --is-ancestor 961c70d2 f63e730f && echo "base prep ancestral do checkpoint M4"
git log --oneline 1d33cb7b..9f26f68e             # 4 commits únicos do 464
git log --oneline 9faf8d30..6451ecaf             # 12 commits locais não empurrados (já na prep)
git diff 9f26f68e f63e730f --stat -- tools/viewmodels public/models/viewmodels

# Identidade de conteúdo entre PR e integração
git show d56b5475:tools/viewmodels/prep/rifles-m4-actions-fingers-c2.py | shasum -a 256
shasum -a 256 ../vm-prep-rifles/tools/viewmodels/prep/rifles-m4-actions-fingers-c2.py  # = b9d3ad40…
git show 9f26f68e:public/models/viewmodels/goldsrc/ak47.glb | shasum -a 256 | cut -c1-16 # d7d016b2…
git show f63e730f:public/models/viewmodels/goldsrc/ak47.glb | shasum -a 256 | cut -c1-16 # d7d016b2…

# Presença no main atual (o runtime de viewmodel NÃO está lá)
gh api 'repos/corosolto/client/git/trees/3880380165?recursive=1' --jq '.tree[].path' | grep -cE 'authoredvm|tools/viewmodels'
git ls-tree f63e730f --name-only tools/blender/viewmodels/knife_melee/   # vazio: knife_melee é único do 464

# Commit local valioso não empurrado (534)
git show --stat 4d2a99ef    # m4-cuff-profile.py + VIEWMODEL-SEQUENTIAL-CONTINUATION.md
```

## 8. Extração seletiva recomendada (ordem de valor)

1. **`4d2a99ef` → empurrar ao #534** (worktree nova; conteúdo: `m4-cuff-profile.py` + doc de continuação). Desbloqueia a medição do punho que o ledger M4 pede como próximo passo.
2. **Doc `M4-RELOAD-DIAGNOSTIC-2026-09-06.md`** — já no PR #534; manter e mergear como evidência (com ordem do dono).
3. **`tools/blender/viewmodels/knife_melee/*` + `coro/melee/FONTE.md` do `8a97d87e`** (#464) — condicional à decisão da lane 10/27 sobre re-autoria da faca; cherry-pick em worktree nova, com teste e proveniência.

Nada mais dos três PRs precisa ser extraído: todo o restante já existe na linhagem prep (iguais ou evoluídos) ou é gerado/frente alheia.

## 9. Limites

- Nenhum script/Blender/GLB foi executado ou aberto; análise por metadados git, hashes e leitura de código/documentos.
- `git fetch` não executado (modo somente leitura); conclusões sobre o remoto usam a API do GitHub no momento da auditoria (07/09/2026) e podem envelhecer.
- Nenhum PR foi fechado, comentado ou alterado; nenhuma extração foi realizada — tudo proposto aqui depende de ordem do dono.
