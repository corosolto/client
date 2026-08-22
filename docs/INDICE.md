# Documentação — índice e ordem de leitura

Este diretório existe porque a raiz tinha **18 arquivos `.md`** sem hierarquia
nenhuma, e um dev novo (ou um agente) não sabia por onde entrar. Agora tem
ordem.

---

## Ordem de leitura

### 1. Chegando agora (15 minutos)

| # | Arquivo | Por quê |
|---|---|---|
| 1 | [`../STATUS.md`](../STATUS.md) | **Comece aqui.** Resumo gerado, fontes vivas, comandos de publicação e riscos atuais. |
| 2 | [`../README.md`](../README.md) | O que é o projeto, como rodar, onde fica cada coisa. |
| 3 | [`docs/stack.md`](docs/stack.md) | **Com o que isso é feito.** Three.js/WebGL sem build, Astro/Vercel, Supabase, geração de asset (mint.gg, Tripo3D, Meshy, OpenRouter), Playwright, gltf-transform, as skills e o gauntlet loop. |
| 4 | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Como abrir um PR que passa. |
| 5 | [`issues/`](issues/) | tarefas boas pra primeira contribuição, cada uma com arquivos e critério de aceite. |

### 2. Vai mexer no JOGO (`public/js/`)

| # | Arquivo | Por quê |
|---|---|---|
| 6 | [`../tools/eval/ARCH.md`](../tools/eval/ARCH.md) | **Índice por linha e tabela de conflito.** É GERADO (`npm run arch`) — nunca edite o bloco entre os marcadores. Leia antes de tocar em `game.js`. |
| 7 | [`../tools/eval/BAR-CONSISTENCIA.md`](../tools/eval/BAR-CONSISTENCIA.md) | A régua vigente: 25 critérios de consistência e flow. **Tem precedência** sobre a `BAR.md`. |
| 8 | [`../tools/eval/BAR.md`](../tools/eval/BAR.md) | A régua de fidelidade visual. Consulta, não leitura obrigatória. |
| 9 | [`../tools/eval/README.md`](../tools/eval/README.md) | Catálogo do arnês: o que cada script mede, e quais estão obsoletos. |

### 3. Vai mexer no SITE ou no BANCO

| # | Arquivo | Por quê |
|---|---|---|
| 10 | [`seguranca.md`](seguranca.md) | O que foi fechado no pré-release, onde estava e como testar. Leia antes de mexer em `/api/*` ou em `supabase/`. |
| 11 | [`../supabase/README.md`](../supabase/README.md) | Como aplicar as migrations. |
| 12 | [`../supabase/opcional/OFUSCACAO-README.md`](../supabase/opcional/OFUSCACAO-README.md) | A ofuscação de schema entregue pronta e **não aplicada**. |

### 4. Contexto e direção

| Arquivo | O que é |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | **Para onde o projeto vai**, o recorte da v2, o que foi substituído, e o risco de merge entre `main` e `v2/alpha`. Aponta para o `plans/08`; não o duplica. |
| [`../plans/08-RELEASE-PROFISSIONAL.md`](../plans/08-RELEASE-PROFISSIONAL.md) | O roadmap **executável**: degraus 0-10, com o corte defendido e as perguntas abertas para o dono. |
| [`LICENCA.md`](LICENCA.md) | A migração MIT → AGPL aplicada em 07/08/2026 e a separação código × arte paga × marca. **Não é publicado no site**: quem declara é o `LICENSE`, e a tabela de superfícies é gerada no `CONTRIBUTING.md`. |
| [`SEO-AEO.md`](SEO-AEO.md) | Contrato do que crawlers e assistentes recebem no build, as fontes de verdade e os checks antes de publicar. |
| [`IDEAS.md`](IDEAS.md) | Ideias soltas, não priorizadas. Bom lugar pra achar o que fazer. |
| [`QUALITY.md`](QUALITY.md) | Critérios de qualidade do produto. |
| [`TRIBOS-URBANAS.md`](TRIBOS-URBANAS.md) | O documento de design da facção Tribos Urbanas. |
| [`ASSETS-PROMPTS.md`](ASSETS-PROMPTS.md) | Prompts usados pra gerar os assets 3D (Mint/Tripo). Pipeline de asset. |
| [`../CHANGELOG.md`](../CHANGELOG.md) | O que mudou, versão por versão. Também renderizado em `/changelog`. |
| [`../SECURITY.md`](../SECURITY.md) | Política de reporte de vulnerabilidade. |
| [`reports/2026-08-11-open-issues-audit.md`](reports/2026-08-11-open-issues-audit.md) | Triagem das 71 issues abertas, ranking e grupos de duplicatas. |
| [`reports/2026-08-11-application-pipeline-review.md`](reports/2026-08-11-application-pipeline-review.md) | Revisão da aplicação, APIs, arquitetura, dependências e CI/CD. |

### 5. Histórico ([`historico/`](historico/))

Nada aqui descreve o estado atual. São documentos que **já foram** o estado
atual, guardados porque explicam *por que* as coisas são como são.

| Arquivo | O que era |
|---|---|
| `HANDOFF-KIMI.md` | 84 KB de log append-only de 28 sessões. Foi substituído pelo `STATUS.md`. Ainda é a melhor fonte sobre a causa raiz de decisões antigas. |
| `HANDOFF-CLAUDE-CODE.md` | Handoff de uma sessão específica. Cita arquivos e branches que não existem mais. |
| `PROMPT.md` | O prompt único que gerou a primeira versão do jogo. Valor histórico e de marketing. |
| `PROMPT-SPECS.md`, `PROMPT-ANALISE.md` | Especificações derivadas do prompt original. |
| `RELATORIO-ANALISE.md` | Auditoria de uma rodada antiga. |
| `BOOTSTRAP-STUDIO.md`, `STUDIO_CONSTITUTION.md` | Descrevem um `studio/` em Python que **nunca existiu neste repo**; só sobrou `tools/studio.mjs`. |
| `TESTE-5MIN.md` | Roteiro de 8 perguntas de teste manual usado numa rodada. |

---

## Convenções

- **Português.** Código, comentário, commit e doc.
- **Um lugar por informação.** Se um número aparece em dois arquivos, um dos
  dois está errado — e vai continuar errado. Prefira apontar para a fonte.
- **Número derivável do código não se escreve à mão.** Ele vira bloco gerado
  por `node tools/gen-docs.mjs`, entre marcadores, e `npm run docs:check`
  (dentro do `check:fast`) reprova quando envelhece. Número que aparece em dois
  arquivos e é gerado nos dois **não** pode divergir — é a única forma de a
  convenção acima sobreviver a um commit.
- **Doc que envelhece vai pro `historico/`,** não fica na raiz esperando alguém
  perceber que está mentindo.
- **`arquivo:linha`** em qualquer afirmação sobre código.
