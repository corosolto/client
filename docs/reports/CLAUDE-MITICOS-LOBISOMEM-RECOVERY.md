# Recuperação do patch de Lobisomem (cauda curta + mídia) — análise pré-edição

Worktree: `worktrees/claude-miticos-lobisomem`
Branch: `claude/miticos-lobisomem-scoped`
Base: `origin/main` = `42c01175` (`chore(release): v2.0.0-alpha.235`)
Data da análise: 06/09/2026

## Veredito

**BLOQUEADO. Nenhuma alteração de runtime foi feita.**

O patch aprovado não pode ser reaplicado como diff limitado sobre a `main` atual porque
os arquivos que ele modifica **não existem na `main`**. `f05edaf9` e `e4f52162` são
commits de *substituição* de binários já versionados na branch `codex/miticos-visual`;
na `main` não há Lobisomem algum — nem GLB, nem vídeos, nem pôsteres, nem avatar, nem
registro no runtime. Reaplicar o conteúdo significaria **introduzir o personagem inteiro
e sua facção**, o que é explicitamente fora de escopo.

## Arquivos candidatos e origem

Conteúdo integral dos dois commits de referência:

| Arquivo | Origem | Blob no branch | Existe em `main` |
| --- | --- | --- | --- |
| `public/models/characters/lobisomem.glb` | `f05edaf9` | `229754f5` | **NÃO** |
| `public/video/chars/lobisomem.webm` | `f05edaf9` | `215bb26e` | **NÃO** |
| `public/video/resultado/lobisomem-derrota.webm` | `f05edaf9` | `97e4021b` | **NÃO** |
| `public/video/resultado/lobisomem-vitoria.webm` | `f05edaf9` | `380a6126` | **NÃO** |
| `public/img/chars/avatars/lobisomem.webp` | `e4f52162` | `9675a565` | **NÃO** |
| `public/img/resultado/lobisomem-derrota.webp` | `e4f52162` | `94b7aa10` | **NÃO** |
| `public/img/resultado/lobisomem-vitoria.webp` | `e4f52162` | `94b7aa10` | **NÃO** |
| `docs/reports/MITICOS-VISUAL-CONTINUATION.md` | ambos | — | fora de escopo (texto cobre Cuca, Boto, Zumbi, Lampião, Maria, Curupira) |

Os dois commits são pequenos e bem delimitados: 5 e 4 arquivos, sendo o único arquivo
de texto o relatório de continuação — que documenta todos os Míticos, não só Lobisomem,
e portanto não entra num patch escopado.

## Checks executados (somente leitura)

1. `git rev-parse HEAD:<path>` para os sete binários → **todos MISSING**.
2. `git ls-files | grep -i lobisomem` → **0 arquivos** no tree da `main`.
3. `git log HEAD -- public/models/characters/lobisomem.glb` → **histórico vazio**; o
   arquivo nunca existiu em nenhum ancestral da `main`.
4. `git log --all --diff-filter=A -- .../lobisomem.glb` → adicionado em `4e198dfd`
   (*"9 models 3D do Time Mítico gerados no Mint MCP"*, 09/08), que
   **não é ancestral de `HEAD`**.
5. `git branch --contains f05edaf9` → apenas `codex/miticos-visual`.
6. `git merge-base f05edaf9 HEAD` → `dc634392` (`v2.0.0-alpha.201`). A base comum
   **também não contém** `lobisomem.glb`: a linha inteira dos Míticos é exclusiva da
   branch de trabalho.
7. `git grep -lni lobisomem HEAD -- '*.js' '*.mjs' '*.json' '*.ts' '*.html'` → nenhuma
   referência de runtime. `public/js/glbchars.js` na `main` **não** lista `lobisomem`
   no `GLB_CHARS`; a entrada foi criada em `4e198dfd`, que não chegou à `main`.
8. Facções: não há facção Mítico na `main` (`public/img/faccoes/` só tem funkeiros,
   palhaços, time-b, time-e, tribos). As únicas ocorrências de "mitico" na `main` são
   `tools/gerar-vozes-miticos.mjs`, `docs/audio/ROTEIRO-VOZES-MITICOS.md` e grafites de
   mapa (`map_corrego.js`, `map_escadao.js`, `textures.js`, `graffiti_layout.js`) —
   nenhuma delas carrega o personagem.
9. Ferramentas de validação citadas na evidência: `eval:posters`
   (`tools/eval/poster-aspect-check.mjs`) existe na `main`; **`eval:mitico` não existe**
   na `main` — era tooling exclusivo da branch. Não há gate de asset específico do
   Lobisomem para rodar na base atual.

## Por que o diff não pode ser limitado

O relatório de decisão exige "diff limitado ao Lobisomem e sua mídia derivada; sem mapas,
sistemas, facções ou runtime compartilhado". Sobre a `main` atual isso é impossível:

- **Runtime compartilhado seria obrigatório.** Sem `lobisomem` no `GLB_CHARS` de
  `public/js/glbchars.js`, o GLB não é carregado — o personagem cairia no fallback de
  caixa procedural, quando existisse. Editar esse Set é alterar runtime compartilhado,
  vetado no escopo.
- **Facção seria obrigatória.** O personagem não está em nenhum roster/seleção da `main`.
  Sem a facção Mítico não há tela de seleção, partida, pôster de resultado ou avatar que
  consumam os arquivos. Os sete binários entrariam como assets órfãos: +2,9 MB de peso
  sem nenhum caminho de código que os referencie, e sem possibilidade de validar
  "seleção e uma partida real carregam o GLB e a mídia corretos".
- **O GLB não é o delta da cauda.** `lobisomem.glb` passou por 6 commits entre a base
  comum e `f05edaf9` (`4e198dfd` → `fbed2fc7` → `03fdf24d` → `9b80d299` → `eb1491b2` →
  `f05edaf9`), saindo de 1.007.904 para 2.755.204 bytes. Trazer o arquivo "só com a cauda
  curta" traria junto regeração por Meshy/Mint, retarget e retextura acumulados na branch
  — trabalho que **não** foi certificado por este patch. A aprovação registrada é
  incremental (66 vértices de cauda, 3547 preservados) sobre o estado da branch, não
  sobre a `main`.

Em resumo: o "patch pequeno" é pequeno **relativo à branch `codex/miticos-visual`**. Em
relação à `main` ele é a introdução de um personagem e de uma facção inteira.

## Riscos secundários observados

- `lobisomem-derrota.webp` e `lobisomem-vitoria.webp` compartilham o mesmo blob
  (`94b7aa10`) — pôsteres idênticos. A evidência reconhece ("mesmo idle nos dois"), mas
  numa integração futura isso deve ser decisão consciente, não acidente.
- A evidência afirma explicitamente "nenhuma partida validada ainda" para os vídeos e
  "esta aceitação é de cauda/enquadramento; não aprova empunhadura nem release". O gate
  de partida real do relatório de decisão nunca foi cumprido, nem mesmo na branch.

## Recomendação

Não há caminho para um patch escopado hoje. As opções, todas fora do escopo desta tarefa
e dependentes de decisão do dono:

1. **Integração do personagem/facção Mítico** em PR própria, com o wiring de
   `glbchars.js` e roster, e então validar seleção + partida real. É o único veículo em
   que os assets de `f05edaf9`/`e4f52162` fazem sentido.
2. **Rebase da `codex/miticos-visual` sobre a `main`** e reavaliação do que sobrevive —
   trabalho grande, com os bloqueios de Cuca/Saci/Lampião/Maria/Curupira/Zumbi ainda de pé.

Nada disso é executado aqui. Esta worktree permanece sem alteração de runtime.
