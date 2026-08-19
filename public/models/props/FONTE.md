# Props de cenário

Acervo de props estáticos dos mapas. O legado (carros, casas do lajes, mobiliário)
chegou antes da régua de registro existir — regularização fora do escopo da v2.1.
A partir da frente E da v2.1 (`plans/13-VISUAL-V2.1.md`), todo prop novo entra com
`source.frente: "v21-e-models"` no `mint-assets.json` e linha aqui — cobrado pelo
`eval:props-acervo` (mutantes: sem-fonte, sem-sha, arquivo-sumido).

## v2.1 — lote 1: vegetação de córrego (frente B)

Pedido do dono (18/08/2026): *"faltou tambem usar os glbs de grama"*. Mint
text-to-3D (Meshy), licença de uso do assinante Mint Pro (asset original gerado
por prompt, sem copyright de terceiros). Pipeline reproduzível:
`node tools/optimize-props-v21.mjs` (dedup/prune + WebP 256²), a partir dos GLBs
brutos em `references/glb/` (não versionados). Convenção do acervo: GLB
normalizado ~1 m, pivô central — escalar no call-site como já se faz com
`caixa_dagua.glb`. Evidência visual (render node, Y corrigido — ver nota do
render no fim): `tools/eval/asset-evidence/props-v21/`.

- `grama_corrego_01.glb` — "Arching Guinea Grass Tuft", tufo de capim alto de
  margem (capim-colonião) com palhas secas na base. 4.142 tris. Chat:
  <https://mint.gg/chat/ph71dz35n7h5sygreq303bjye58crhzj>. Registro:
  `grama-corrego-01`. Escala sugerida ~0,72 ⇒ ~0,70 m.
- `grama_corrego_02.glb` — "Urban Creekside Weeds", moita rasteira amarelada
  com folhas de mato. 4.046 tris. Chat:
  <https://mint.gg/chat/ph78r1m1pa8zyrhsvw0nwz4b1x8crrg2>. Registro:
  `grama-corrego-02`. Escala sugerida ~0,6 ⇒ ~0,60 m largo.
- `planta_corrego_taboa.glb` — "Brown Spike Cattail", taboa (Typha) com duas
  espigas. 4.861 tris. Chat:
  <https://mint.gg/chat/ph72y6pxj76ky56x90cwrc1h7h8cs718>. Registro:
  `planta-corrego-taboa`. Escala sugerida ~1,4 ⇒ ~1,40 m.

## v2.1 — lote 2: caixa d'água (frente A)

Pedido do dono: *"a caixa da agua ta horrivel [...] na laje tao bons, fazer
variacoes"*. Variações estilo favela da `caixa_dagua.glb` (Tripo, 18,7k tris) —
as novas ficam em ~4,6-4,8k tris com WebP 512².

- `caixa_dagua_azul.glb` — "Blue Ribbed Water Tank", tanque azul de polietileno
  com tampa azul-escura e bocal, sobre tábua e blocos de concreto. 4.636 tris.
  Chat: <https://mint.gg/chat/ph7c3scfqprd8jp9bn92279kwx8csbkq>. Registro:
  `caixa-dagua-azul`. Escala sugerida ~1,4 ⇒ ~1,40 m com a base.
- `caixa_dagua_preta.glb` — "Ribbed Black Water Tank", tanque preto com tampa e
  extravasor, sobre anel de concreto. 4.802 tris. Chat:
  <https://mint.gg/chat/ph75dwttq4rqsgn45418bf3m458cs3kv>. Registro:
  `caixa-dagua-preta`. Escala sugerida ~1,2 ⇒ ~1,20 m.

---

> Nota de ferramenta (19/08/2026): `tools/render-fauna-soft.mjs` projeta com o
> vetor "up" invertido (produto vetorial left-handed) — **toda saída dele é
> espelhada em Y**, inclusive a evidência de fauna já commitada. Os renders
> `*-corrigido.png` desta pasta de evidência foram desespelhados com
> `sharp .flip()`. Consertar o renderer é frente do arnês, não da E.
