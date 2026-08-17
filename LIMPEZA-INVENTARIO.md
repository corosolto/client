# FASE 0 — Inventário de segurança e repositório

_Data: 2026-08-17_  
_Repo: `/Users/ruben/corosolto/client`_  
_Head: `9db03fd4 [main]`_

---

## 0.1 Segredo exposto (`msy_`)

| Arquivo/cenário | Resultado |
|---|---|
| `.claude/settings*.json` na árvore atual | `settings.json` = `{}`; **não existe `settings.local.json`** |
| `msy_` em qualquer arquivo da worktree | 1 ocorrência: `docs/historico/HANDOFF-KIMI.md:350` — **menção textual**, não chave ("Chaves Tripo (`tsk_`) e Meshy (`msy_`): o dono TEM — NÃO gravar em arquivo") |
| `git log --all -S "msy_" --oneline` | `821e33d2 baseline v2.2.0 (sessao Kimi) — checkpoint antes do gauntlet` |
| `.claude/settings.local.json` em `821e33d2` | Conteúdo: `{ "permissions": { "allow": ["Bash(npx --version)"] } }` — **sem token** |
| `.claude/settings.local.json` no `main` (HEAD) | Inexistente no índice/atual (removido em `fcd7164c`) |

**Conclusão:** nenhum bearer token `msy_` vaza na árvore atual nem no histórico do git. A única ocorrência é a nota de mão do handoff. Você pode rotacionar o token se quiser por precaução, mas não encontrei exposição real.

---

## 0.2 Inventário geral

### Worktrees

```
/Users/ruben/corosolto/client  9db03fd4 [main]
```

- **Worktrees vivos:** 1 (apenas `main`, na própria pasta do repo).
- **Worktrees órfãos/prunable:** 0.
- **Worktree em `/private/tmp/...`:** nenhum encontrado.

### Maiores diretórios (sem `node_modules` — diretório inexistente)

```
625M	.git/
273M	public/
 34M	.xfer/
7.9M	graphify-out/
6.2M	tools/
3.7M	godot/
2.5M	docs/
1.5M	src/
908K	.agents/
184K	.claude/
164K	.scripts/
116K	.codex/
112K	.opencode/
104K	.kimi/
 88K	.github/
 60K	tests/
 40K	specs/
 16K	.vscode/
 12K	.githooks/
4.0K	docker/
4.0K	.kimi-code/
```

### Peso do repositório

```
count: 0
size: 0 bytes
in-pack: 19150
packs: 1
size-pack: 621.59 MiB
prune-packable: 0
garbage: 0
size-garbage: 0 bytes
```

- **.git total:** `625M`
- **Objetos packed:** `621.59 MiB`
- **Arquivos rastreados no índice:** `2570`
- **Arquivos rastreados em `public/`:** `1436`

### Remotes

```
origin	https://github.com/corosolto/client.git (fetch)
origin	https://github.com/corosolto/client.git (push)
```

### Scripts `package.json`

```
105 scripts reais
```

---

## 0.3 O que está rastreado que não deveria (candidatos)

| Item | Tamanho | Situação | Recomendação preliminar |
|---|---|---|---|
| `graphify-out/graph.json` | 7.4M | Rastreado | Gerado; adicionar a `.gitignore` e `git rm --cached` |
| `graphify-out/GRAPH_REPORT.md` | 96K | Rastreado | Idem |
| `graphify-out/graph.html` | ? | Rastreado | Idem |
| `.xfer/log`, `.xfer/tree.tgz` | 34M dir | Rastreados | Transferência entre máquinas; perguntar antes de mover |

### Diretórios esperados pelo roteiro que **não existem**

- `xferwork/`
- `_xfer/`
- `_to_delete/`
- `--help/`
- `tmp/`
- `scratchpad/`
- `node_modules/`

Nenhum deles apareceu em `git status --ignored`, portanto não há lixo declarado nem pendente na worktree atual.

---

## 0.4 Estado da worktree

```
$ git status --porcelain --ignored
(nada — working tree limpa)
```

Não há alterações pendentes, não há untracked e não há ignored materializados.
