# 24 — ORÇAMENTO DE ASSETS: TRIÂNGULOS E MEGABYTES

> Prompt de trabalho para uma lane dedicada. Colar inteiro no início da sessão.
> Medições feitas em 21/08/2026 no `~/game` (alpha.159). Confirme antes de apagar, não remeça o resto.

---

## Contexto medido — não precisa levantar de novo

`public/` tem **825 MB e 3.020 arquivos**. O teto da CrazyGames é **250 MB e 1.500 arquivos**.

Em `public/models`: **937 GLB, 8,2M triângulos, 378 MB**. O peso não está espalhado — **três arquivos
carregam 5,7M triângulos (69%) e 161 MB (43%)**:

| arquivo | MB | triângulos | usado? |
|---|---|---|---|
| `props/favela_house/*-pbr_model.glb` | 55,0 | 1.865.278 | **zero referências** |
| `props/trave_futebol/*-pbr_model.glb` | 53,9 | 1.936.760 | **zero referências** |
| `props/caixa_dagua/*-pbr_model.glb` | 52,5 | 1.875.081 | **vivo** — `map_corrego.js`, `map_escadao.js`, `map_lajes_authored.js` |

Os outros 932 GLB somam 2,1M triângulos e 217 MB — saudáveis, não são o problema.
As texturas desses três somam ~2 MB cada: **o peso é malha crua do Meshy, nunca decimada.**

Nenhum dos 937 usa `KHR_draco_mesh_compression` nem `EXT_meshopt_compression`.

**Dois moldes certos já existem no repo — copie deles, não invente:**

- `props/wall_of_cars.glb` — 242k triângulos, textura WebP via `EXT_texture_webp`.
- `shells/lajes_completa.glb` — 48k triângulos **com lightmap assado** (`lajes_completa_lm.webp`).
  É a pipeline profissional inteira, feita certo, neste repositório.

---

## Tarefas, nesta ordem. Um commit por tarefa.

### 1. Apagar os dois mortos — com prova antes

`favela_house` e `trave_futebol`. **Não apague sem provar que estão mortos.** Prova aceita:

```bash
for n in favela_house trave_futebol; do
  grep -rl "$n" public/js src public/maps public/data tools scripts 2>/dev/null \
    | grep -v node_modules | grep -v "models/props/$n"
done
npm run build && grep -rl "favela_house\|trave_futebol" dist/ 2>/dev/null
```

Zero saída nas duas = mortos. Qualquer saída = pare e reporte, não apague.

**Aceite:** −108 MB, −3,8M triângulos, `npm run check:fast` verde.

### 2. Decimar a `caixa_dagua` — com bake, não sem

Esta é a única das três que custa FPS, e a única que exige cuidado.

- Alvo: **10k–20k triângulos**, mesma silhueta.
- **Asse o detalhe da malha alta para um normal map** antes de decimar. Decimar sem assar é
  perder qualidade de verdade — é isso que a gente está evitando, não o contrário.
- Textura em WebP via `EXT_texture_webp`, como o `wall_of_cars`.
- Guarde a malha alta **fora de `public/`** (ela é matéria-prima, não asset publicado).

**Aceite:** ≤20k triângulos, ≤3 MB, e nos três mapas afetados a peça continua legível
a 3 m e a 30 m. Sem regressão em `eval:look`, `eval:lajes-visual`, `eval:shaderbudget`.

### 3. Publicar só o WebP dos lightmaps

`shells/` tem `*_lm.png` (6,6 MB) e `*_lm.webp` (1 MB) lado a lado. Tire os PNG do bundle
publicado — mantenha-os fora de `public/` se forem fonte.

**Aceite:** −11 MB, zero diferença de pixel no resultado.

### 4. Draco ou meshopt nos 932 restantes

Só depois das três acima. **Prefira meshopt**: descomprime muito mais rápido que Draco,
e o custo de CPU no carregamento importa num jogo de navegador.

Isto encolhe **download, não FPS** — a GPU recebe a mesma malha. Não venda como ganho de frame.

**Aceite:** −40% a −60% em `public/models`, tempo de carregamento medido antes/depois,
`eval:boot` verde.

---

## Regras

- **Rode `tools/snapshot-lanes.sh` antes de começar.** Congela tudo, não toca em nada.
- **Não encoste em `public/audio`** — é outra lane, roda em paralelo de propósito.
- **Nenhuma remoção sem a prova da tarefa 1.**
- `npm run check:fast` verde ao fim de cada commit. `ratchet-check` não pode crescer.
- Não faça retopologia manual dos 932 saudáveis, não mude art direction, não crie asset novo.
  Escopo é orçamento, não redesign.

## Verificação

Use o **gauntlet-fps** para a parte visual: captura medida e A/B dos três mapas afetados
(`corrego`, `escadao`, `lajes`) antes e depois da tarefa 2.

Feche com uma tabela de números reais:

| | antes | depois |
|---|---|---|
| `public/` total | 825 MB | |
| arquivos em `public/` | 3.020 | |
| triângulos em `public/models` | 8,2M | |
| `public/models` | 378 MB | |

Meta de saída: **≤250 MB e ≤1.500 arquivos em `public/`**, que é o teto da plataforma.
