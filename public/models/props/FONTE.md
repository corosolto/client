
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
- `planta_corrego_taioba.glb` — "Heart Leaf Taioba", taioba (Xanthosoma) de
  folhas cordiformes. 4.476 tris. Chat:
  <https://mint.gg/chat/ph7bt423mvd2mkq60j8xws2an58csnn4> (v2 — a primeira
  geração falhou no estágio final do Mint). Registro: `planta-corrego-taioba`.
  Escala sugerida ~0,95 ⇒ ~0,90 m.

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
- `caixa_dagua_fibra.glb` — "Weathered Favela Water Tank", fibrocimento
  amarelado com escorrido, tampa entreaberta, sobre duas vigas de concreto.
  4.542 tris. Chat: <https://mint.gg/chat/ph72pgyxr7v54g3vn5w7az62z58csyjg>.
  Registro: `caixa-dagua-fibra`. Escala sugerida ~1,2 ⇒ ~1,20 m.

## v2.1 — lote 3: varais + vida de céu

Pedidos do dono (19/08/2026): *"as roupas penduradas no corrego, quebrada e
campinho tao ruins, na laje tao bons, fazer variacoes"* e *"o lajes tem pipa mas
nao tem animacao do pipa voando, podemos por helicoptero, aviao com faixa da
praia, no caso da mansao do joa"*. Mesma licença e pipeline dos lotes 1-2, com
`tools/split-props-v21.mjs` antes do optimize nos três animáveis — o Meshy
entrega malha única fragmentada (1.155 ilhas no heli), então o split é por
centróide de triângulo com regra calibrada no render bruto, e o pivô do nó fica
no eixo de rotação/balanço (o call-site só faz `node.rotation.*`).

- `varal_roupas_01.glb` — "Colorful Laundry Varal", corda com 6 peças coloridas
  em prendedores entre ganchos. 4.773 tris. Chat:
  <https://mint.gg/chat/ph7cqm9tnn58h1sxznpq26wgax8cr51p>. Registro:
  `varal-roupas-01`. Escala sugerida ~3,0 ⇒ 3,0 m × 0,84 m.
- `varal_roupas_02.glb` — varal de chão, rack dobrável em X (o crítico corrigiu:
  não é "em T"), 2 linhas com camisetas, jeans, meias e fronha. 4.818 tris. Chat:
  <https://mint.gg/chat/ph79avg70bbmppdah59xczz0m58cr0dg>. Registro:
  `varal-roupas-02`. Escala sugerida ~1,8 ⇒ 1,8 m × 1,46 m.
- `pipa_papel.glb` — "Yellow Green Pipa", losango amarelo/verde com varetas e
  rabiola de 5 lacinhos. 4.983 tris; nó `rabiola` separado (4.452 tris) com
  pivô na ponta inferior da vela T=(0,14; -0,12; 0,02). Chat:
  <https://mint.gg/chat/ph77ctevcka9b4khfrkhkpg2wd8cr9b5>. Registro:
  `pipa-papel`. Escala sugerida ~1,6 ⇒ vela ~0,74 m.
- `helicoptero_pm.glb` — "Blue White Police Copter", JetRanger azul/branco
  genérico, **sem logo nem texto** (veto editorial). 4.933 tris; nós
  `rotor_main` (287 tris, pivô T=(0,08; 0,17; 0), rotação em Y) e `rotor_tail`
  (75 tris, pivô T=(-0,44; 0,02; -0,05), rotação em Z). Chat:
  <https://mint.gg/chat/ph76rk8v51359p9cd6rk249j5x8crxq0>. Registro:
  `helicoptero-pm`. Escala sugerida ~10 ⇒ ~10 m.
- `aviao_faixa.glb` — "Red Stripe Sky Advertiser", monomotor de aeropublicidade
  puxando faixa em branco. 4.546 tris; nó `faixa` separado (1.397 tris,
  T=(0; 0; -0,095)) — a textura do texto é arte 2D via OpenRouter, outra frente
  (regra 19/08: Mint só 3D). Chat:
  <https://mint.gg/chat/ph75y9xxqg1t82rhmfjxjkm6cx8crz6r>. Registro:
  `aviao-faixa`. Escala sugerida ~12 ⇒ envergadura ~10,7 m.

> Nota de evidência: além do espelho em Y já documentado abaixo, o
> `render-fauna-soft.mjs` também **ignora o `translation` dos nós** (cai no
> fallback identidade) — nos renders `*-corrigido.png` dos três animáveis o
> rotor/rabiola/faixa aparece levemente deslocados do encaixe. A prova de
> montagem é o `getBounds` por nó (rotor_main -0,37..0,50 × 0,15..0,23; rabiola
> -0,50..-0,12; faixa 0,0..0,50 — todos no lugar) e a árvore de nós impressa
> pelo `split-props-v21.mjs`.

---

> Nota de ferramenta (19/08/2026): `tools/render-fauna-soft.mjs` projeta com o
> vetor "up" invertido (produto vetorial left-handed) — **toda saída dele é
> espelhada em Y**, inclusive a evidência de fauna já commitada. Os renders
> `*-corrigido.png` desta pasta de evidência foram desespelhados com
> `sharp .flip()`. Consertar o renderer é frente do arnês, não da E.

## Revisão adversarial (19/08, crítico de contexto limpo — skill asset-review)

Veredito: **os 7 vão para o merge, nenhum regenera**. Conferido de fora: SHA × disco
(todos batem), texturas extraídas dos GLBs (íntegras — a mancha dos renders node é o
renderer, não o arquivo), `EXT_texture_webp` suportado pelo GLTFLoader r160 vendorizado,
folhagem OPAQUE+doubleSided, zero vetos. Ressalvas de INTEGRAÇÃO (não de asset):
grama em InstancedMesh (4k tris/tufo pesa mais que as casas se solto), caixa preta com
lum ~56 abaixo da banda 86-165 (validar in-game antes de espalhar), caixa azul esguia
(corrigir com escala X/Z no call-site se na laje parecer magra).

## Revisão adversarial do lote 3 (19/08, crítico de contexto limpo)

Veredito: **os 5 vão para o merge, nenhum regenera**. Verificado de fora: SHA × disco
nos 5, texturas extraídas (heli/avião/varais sem logo, texto ou brasão — veto editorial
limpo), plano de rotação dos rotores medido por variância de vértices (rotor_main em Y,
rotor_tail em Z — eixo fisicamente certo), nós animáveis confirmados NO ARQUIVO.
Ressalvas de INTEGRAÇÃO (não de asset):
- `varal_roupas_01`: gancho central pendurado no alto — esticado a 3 m flutua no vazio;
  esconder ou apontar para um beiral no call-site. Se parecer fino demais, escala Y no
  call-site, não prompt.
- `pipa_papel`: 89% dos tris (4.452) estão nos lacinhos de ~5 cm (sub-pixel em jogo) —
  dentro do teto, mas é o primeiro candidato a decimação.
- `aviao_faixa`: pivô da faixa z=-0,095 deixa o centro ~0,42 m fora da linha da
  fuselagem na escala 12 (o correto seria z=-0,06) — imperceptível no céu, anotado.


## v2.1 — lote 4: jardim tropical da mansão (frente C, BUG-64)

Pedido do dono (20/08/2026): *"o pior de todos é a mansão do joá, o jardim está
horrível"*. O jardim era 100% primitiva de cor chapada (pirulitos de icosaedro,
maciços de esfera achatada). Oito espécies tropicais do jardim modernista
(referência Burle Marx / Joá), mesmo Mint text-to-3D, licença e pipeline dos
lotes 1-3 (`node tools/optimize-props-v21.mjs`, WebP 512², a partir dos brutos
`references/glb/*_mint.glb` não versionados). GLB normalizado ~1 m, pivô
central — escala no call-site do `map_mansao.js` (tabela JARDIM_VEG).

- `palmeira_imperial.glb` — "Imperial Grey Palm", palmeira-imperial com tronco
  anelado cinza e crownshaft verde. 3.637 tris. Tronco escurecido no pipeline
  (`trunkShade` do optimize: material-clone fator 0,55/0,47/0,40 nos triângulos
  dos 42% inferiores — o tronco branco-liso foi reprovado pelo crítico v2.1).
  Chat: <https://mint.gg/chat/ph70gyyyc7qvvem3mm8t0a29y98cv0tw>. Registro:
  `palmeira-imperial-jardim`.
- `palmeira_ravenala.glb` — "Dramatic Fan Palm", ravenala (palmeira-leque) em
  leque vertical. 4.428 tris. Chat:
  <https://mint.gg/chat/ph7by8184sbqmx1ev8j068pvm58ctqm0>. Registro:
  `palmeira-ravenala-jardim`.
- `heliconia.glb` — "Red Claw Heliconia", brácteas vermelho-amarelas pendentes.
  4.052 tris. Chat: <https://mint.gg/chat/ph7cp8y6gyxt9gg461m4rcg8th8ctwfd>.
  Registro: `heliconia-jardim`.
- `costela_adao.glb` — "Perforated Monstera Bush", monstera de folhas
  fenestradas. 3.472 tris. Chat:
  <https://mint.gg/chat/ph7byt97jw52ykdjrzezvwhsvn8cvsje>. Registro:
  `costela-adao-jardim`.
- `bananeira.glb` — "Drooping Paddle Banana Plant", pseudocaule verde com
  folhas-pá. 4.684 tris. Chat:
  <https://mint.gg/chat/ph71fmfkb7fb4433vac33xghd58cttan>. Registro:
  `bananeira-jardim`.
- `ixora.glb` — "Crimson Ixora Bloom", arbusto com buquês vermelho-alaranjados.
  4.496 tris. Chat: <https://mint.gg/chat/ph7dcr7emj3jkafn0yq98gantx8cvtvs>.
  Registro: `ixora-jardim`.
- `agave.glb` — "Blue-Green Agave Rosette", roseta azul-esverdeada. 4.688 tris.
  Chat: <https://mint.gg/chat/ph777k51x3zm7rh2p92m2yferh8cv41j>. Registro:
  `agave-jardim`.
- `samambaia.glb` — "Emerald Feather Clump", touceira densa de samambaia.
  3.757 tris. Chat: <https://mint.gg/chat/ph738vqqdc08zxxy7912d24w1n8cteh0>.
  Registro: `samambaia-jardim`.

## Sertão — lote existente, registro documental de 05/09/2026

Procedência dos GLBs existentes: [mint-assets.json](../../../mint-assets.json), entradas listadas abaixo. O registro declara geração Mint text-to-3D a partir de prompt próprio do projeto, sem referência de terceiro; o texto integral do prompt não está arquivado no manifesto. `source.notes` registra o propósito e o pipeline, `source.chatUrl`/`source.assetId` identificam a geração, e `processing.finalSha256` identifica o arquivo final. Não reconstruir o prompt de memória.

**Licença específica e autor humano de cada geração: pendentes de documentação.** A declaração Mint Pro dos outros lotes não substitui termos específicos destes registros. Não declarar CC0, autoria individual, licença comercial verificada nem atribuição dispensada. Nenhum asset externo novo foi baixado para esta revisão.

Hashes abaixo são snapshot extraído do manifesto e conferido contra os arquivos em 05/09/2026. O manifesto permanece a fonte canônica; método de reprodução e inventário técnico em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).

| Arquivo / registro | Chat de geração / assetId | SHA-256 final conferido |
|---|---|---|
| [`sertao_mandacaru.glb`](sertao_mandacaru.glb) / `sertao-mandacaru` | [chat](https://mint.gg/chat/ph7f0hkpjjh01qcf95zt46dddd8d43ct) / `ks7epv9ghtz5c8fabqgte1j1ch8d5mra` | `7b442f1abb6ec86a800aef9594c76dd2f9052522b58a9aa8a004449357a9b83f` |
| [`sertao_macambira.glb`](sertao_macambira.glb) / `sertao-macambira` | [chat](https://mint.gg/chat/ph77kaaqh5ecv3mwaw421gabgx8d52yk) / `ks7e9pqet1sbvcwayfddb0x0318d5mw8` | `9522205f3b3f2e2a997f53f828a58b2ae4a8fc6202b71f27c47f0d1d4ca6486e` |
| [`sertao_juazeiro.glb`](sertao_juazeiro.glb) / `sertao-juazeiro` | [chat](https://mint.gg/chat/ph72w8yaxsgj6y271nvqjaxr2d8d4rr2) / `ks759j8fhf1yezybjze0qf8vg98d54bf` | `70579e4e2d8e85ffb07a0adfed0e496d99649321eadaccd6dbc033f2a441dbc9` |
| [`sertao_xique_xique.glb`](sertao_xique_xique.glb) / `sertao-xique-xique` | [chat](https://mint.gg/chat/ph7djxxjydj383me4g5t43r3ps8d5sgc) / `ks73za0ws181wynvwqsn3dap4s8d5nmv` | `1881c4c579f8fb5e93256ecbb33626ed8dc6f1643c6e8e8feb842566646e29b0` |
| [`sertao_poco_roda.glb`](sertao_poco_roda.glb) / `sertao-poco-roda` | [chat](https://mint.gg/chat/ph78jzf7pmyqqwffg89w8s664h8d41cs) / `ks74qcvmcfs2ta4ceajggjhq798d542a` | `28b3427934987e7cfeddb990decd38f9f5455f2c412bd9621ccdcc79a69ac449` |
| [`sertao_capelinha.glb`](sertao_capelinha.glb) / `sertao-capelinha` | [chat](https://mint.gg/chat/ph7e200kx20sn17p6cfmn2sc958d4c8h) / `ks735ddr0k5a30npwhwb8td67h8d5bwh` | `ee11deecc0da61f3e6559b2be67d5d02c43f700d63ad19b68228f22cdcadb07b` |
| [`sertao_palhoca_forro.glb`](sertao_palhoca_forro.glb) / `sertao-palhoca-forro` | [chat](https://mint.gg/chat/ph7dscqp85wk184t4xqw6teq6h8d56bn) / `ks7eqkc0jj7jmnbazd4yvx2me58d4f2d` | `56e823736b800f1a418dd81183b793c17a20f9f0ab708e4d81b8e8711eafc9a1` |
| [`casa_pau_a_pique.glb`](casa_pau_a_pique.glb) / `casa-pau-a-pique` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks77vk4kbf3k8k6ygs987np1658d73p5` | `d544c6e94cfc3834dc3b9a74182909a433add5dadb399c5f2f28bf90f0844e4e` |
| [`igrejinha.glb`](igrejinha.glb) / `igrejinha-sertao` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks7d2mgq7myde6mrjmtha7t1yx8d70bw` | `6e26688b5fa406f8b336fada2d263d6dbc90536b67e50c774d4a4f0857722fe5` |
| [`caminhao_antigo.glb`](caminhao_antigo.glb) / `caminhao-antigo` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks7fc2f1c7kyeqyrydgf6p33hd8d7rdx` | `e01ea2fe9ddf50f29ad2ddafae110ec28a2a2ddfc580231ddd82bda11d663b6d` |
| [`casa_pedra.glb`](casa_pedra.glb) / `casa-pedra` | [chat](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) / `ks7e1dx5vzctmbe1qesp5fmhad8d63eg` | `b1ad7443257c9e608050dd40057937a5554d3e19c5b5776eb3f04142d913a578` |
| [`casa_platibanda.glb`](casa_platibanda.glb) / `casa-platibanda` | [chat](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) / `ks77rz2hj7kenbdpgm0z9tf72d8d6yek` | `770b0dec15c3e8593c1ca338111e4e8a7b5c6cbf269dec603f90770b907be48f` |
| [`casa_geminada.glb`](casa_geminada.glb) / `casa-geminada` | [chat](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) / `ks72vcqrhyehnsm5mky7ppe5198d7pp6` | `bc7a2b9149b4139e9f446b9c5ce44807a64b4a304f28da68808542752e3f4673` |

As fotografias de Maranguape e da capela da Fazenda Colônia foram apenas referências de observação do agente principal no Chrome; não foram incorporadas aos GLBs nem copiadas como textura nesta revisão. Créditos, observações atribuídas e limites em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).
