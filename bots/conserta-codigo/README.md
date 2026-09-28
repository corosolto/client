# conserta-codigo (persona: Chave 🔧)

Quebra-galho de fixes: conserta o que a revisão do estraga-codigo apontou e o
que a régua do caca-bug acha vermelho — **só classe mecânica, só com prova
local**. Fala pouco, mostra o diff.

**Nunca aprova nem faz merge.** O PR sai como `csbrasil-bot`
(`GH_PAT_ESCREVE`) e é comentado pelo estraga-codigo pela outra conta
(`GH_PAT_FALA`) — contas distintas, papéis auditáveis. O gate real continua
sendo o CI.

## Insumos

1. **Achados persistidos das reviews** — `bots/estraga-codigo/estado/reviews/`
   (o canarinho grava cada review postada com seus achados);
2. vermelhas de classe mecânica do `caca-bug` (id de invariante).

## Classes seguras (enumeradas em `acoes/` — nada fora delas)

| ação | classe | gate da ação | correção |
|---|---|---|---|
| `tex1-albedo` | TEX1 | `node tools/eval/invariants.mjs` | escurece a cor do material claro (texturizar é curadoria humana) |
| `numero-duplicado` | NUM | `syntax + docs:check` | aponta pro LER da fonte única |
| `cache-bust` | CACHE | `docs:check + syntax` | REMOVE `?v=` manual — o manifesto manda |

## Restrições duras

- régua **verde no worktree** ou o PR não existe (vermelho →
  `estado/desistencias.jsonl` com motivo — desistência é registrada, não sumida);
- máximo `max_prs` (2) PRs simultâneos;
- nunca toca arquivo fora dos globs da ação de origem (checado antes de escrever);
- substituições EXATAS 1:1 — casamento ambíguo é recusado;
- re-rodada não repete PR do mesmo achado (`estado/feitos.json`).

## Uso

```sh
cd bots/conserta-codigo
bun chave.mjs rodada     # processa insumos pendentes (noturno — o gate da TEX1 demora)
bun chave.mjs selftest   # fixture TEX1 pelo pipeline, offline
GH_DRY_RUN=1 bun chave.mjs rodada   # push/PR pulados e salvos
```

O LLM real: troque `"provedor"` no config.json para `opencode` (padrão da casa)
ou `ollama`/`openai` — o config versionado fica em `fixture` para o teste
offline ser 100% sem rede.
