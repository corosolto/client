# Córrego — material de alvenaria (R4, produto)

Data: 2026-10-31. R4 fecha o P2 de UV do crítico R3
(`CRITICO-CORREGO-PBR-PRODUTO-R3.md`) e corrige o contrato de `normalScale`
que o R2 escreveu errado. Histórico completo do A/B: R1 protótipo, R2 adoção.

## Correções R4 (produto congelado nesta frente — régua-only)

- **`texelReference` 256×256 no albedo PBR** (`map_corrego.js` `pbrMaterial/slot`):
  `escalaUVporMundo` (em `public/js/vao.js`) usa a referência autorada ANTES da
  guarda de `image`, exige largura/altura finitas positivas nos dois eixos e marca
  `texelEscalada` também quando os fatores são 1 (referência aplicada a geometria
  válida). Resolve o P2: o TextureLoader devolve a textura com `image=null` antes
  do onLoad e o build síncrono gravava Vspan=1 em vez do baseline.
  Números da casa real da fileira B (corpo 3×7.35×4, repeat 2.4×1.6):
  **Vspan 2.296875, V efetivo 3.675** — igual ao ramo `directedMasonry`
  DataTexture256 do pré-PBR, comprovado byte a byte pela régua nova.
- **`normalScale` 1** (não 0.4): o protótipo R1 NÃO alterava o normalScale do
  material original (default 1). O 0.4 do R2 era erro de transcrição do próprio
  gate R2; o crítico R3 apontou o reboco liso. Produto agora em (1,1).
- **anisotropy 4 nos três mapas** (color/normal/rough): igual ao protótipo —
  o `detailFor` que elevava albedo para 8 não alcança o trio PBR.
- **Pilares**: inset .14→.07 em seção .28 — a face avança 7 cm da alvenaria e
  mata a copanaridade da quina do close. Sem collider corporal novo
  (`addBoxI` sem `opts.collide`), MAS os InstancedMesh opacos de IB entram no
  loop de occluders ⇒ **LOS de bala muda junto à face visível — intencional**.
  Pré-PBR vs R4 NÃO são idênticos em occluders; não alegar física byte-identical.
- `TEX.zinco` (`tex_zinco.webp` 3×3) preservado/restaurado, consumido pelos telhados.


## Correções R5 (réguas-only, produto intocado)

- **Conjunto exato nos dois gates**: falhas agora são `{id, msg}` com ID estável
  por cláusula; mutante só aprova com o multiset ID→contagem IDÊNTICO ao alvo —
  `pos.some(substring)` acabou. Defeito independente junto do mutante reprova
  (infra 3). Nominal continua primeiro e GREEN antes de qualquer mutação.
  `texture-reference-check` roda ainda a **contraprova**: cada mutante é
  combinado com um defeito independente em âncora distinta (remoção do lock de
  `geo.userData.texelEscalada` ou da referência) e o conjunto tem que divergir.
- **CLI**: `--mutante=` vazio é recusado (uso 2), além de duplicado/desconhecido;
  falha de build/import do experimento vira infra 3, sem crash e sem engolir
  erro semântico (provado com âncora inexistente em cópia do script).
- **`normalScale` exige finito nos dois eixos** — NaN passava por
  `Math.abs(NaN-1) > 1e-6` ser falso. Mesma cláusula `*-normalscale`.
- **Mutantes simplificados**: `procedural-faixas` só renomeia o albedo para
  `masonry_bands` (samplers/source preservados ⇒ aciona SÓ `muro-fontes-pbr`);
  `repeat-diverge` só mexe no `normalMap.repeat.x` de um material (não aciona
  tint↔repeat). Conjuntos esperados: `muro-fontes-pbr`×8, `muro-normal-srgb`×8,
  `muro-samplers`×1 mais `muro-sampler-transform`×1 no repeat, `cru-rough-srgb`×1, `cru-tint`×1 (evolução R7).
- **`--fisica`**: occluders `InstancedMesh` entram com `instanceMatrix ×
  matrixWorld` (igual ao digest visual) — o digest `occludersWorld` R5 NÃO é
  comparável ao R4; o avanço de 7 cm dos pilares permanece intencional e
  declarado. O grid do chão virou `groundGrid2D`: amostras 2D de uma altura por
  coluna, **sem claim de snapshot multipavimento** — para isso seriam probes
  por pavimento (fora do escopo R5).
- Conjunto real do mutante `missing-reference` inclui `prop-lock`:1 — o log R4
  do Root não tinha porque a cláusula do prop é posterior; a régua lê o código
  presente, não o log antigo.

## Réguas

### `tools/eval/corrego-masonry-material-check.mjs` (R7)

- Nominal: **GREEN** (8 MURO + 1 tijolo cru, 0 falhas).
- 8 mutantes, todos RED nos conjuntos exatos descritos no fechamento R7: `procedural-faixas`, `normal-srgb`, `repeat-diverge`, `offset-nan`, `offset-diverge`, `rotacao-no-probe`, `rough-srgb`, `raw-double-tint`.
- Cláusulas novas R4: `normalScale 1`, `texelReference 256x256` no albedo,
  `anisotropy 4` no trio; mantidas fontes/nomes, colorSpace por papel, fonte
  compartilhada por família, samplers alinhados, 8 tintas↔repeat correspondentes,
  tijolo cru sem tint, sem `favela_wall`, `TEX.zinco` pela leitura de fonte.
- `--fisica`: digests SEPARADOS em world-space — colliders (303), occluders (206,
  vértices transformados), groundGrid, spawns, nav, covers e geometria visual
  (489+ meshes, incl `instanceMatrix`). Infra R3 corrigida: `dGround` era usado
  sem declaração e o digest `nav` era calculado e descartado. **Não existe
  baseline sha hardcoded**: o antecedente pré-PBR difere em occluders/geometria
  pelos 7 cm planejados dos pilares — registrar digests por rodada, comparar
  material-vs-material apenas com o par correto.

### `tools/eval/texture-reference-check.mjs` (novo)

Sobe o `aoBoxGeo`/`aoMatFactory`/`escalaUVporMundo` REAIS de `public/js/vao.js`
em node puro e valida o handoff `texelReference`:

- Casa real 3×7.35×4 repeat 2.4×1.6: fria (image ausente), quente (image
  1024×512) e baseline anterior (DataTexture 256² sem ref) ⇒ buffers de UV
  **byte-idênticos**, Vspan 2.296875, V efetivo 3.675, `texelEscalada` marcada.
- Prop pequeno fator 1: 2º chamado no-op; imagem 1024×512 no 3º não reescala;
  referência removida no 4º continua no-op (o lock segura).
- Refs inválidas (0/NaN/Infinity/negativo em cada eixo): bloqueadas sem alterar
  UV e sem marcar `texelEscalada`. Legado sem ref e sem image: intocado.
- Sem contaminação cross-material (material alheio não reescala casa concluída).
- 4 mutantes em CÓPIA temp do vao.js (fonte real intocada, cleanup no finally),
  todos RED na cláusula alvo: `missing-reference` (guarda antiga que ignora a
  referência), `reference-wrong-dims` (ref declarada com aspecto errado),
  `lock-removal-factor1` (marcação de idempotência sem `|| referencia`) e `uv-nao-finito` (U[0]=NaN real).
- Nenhuma cláusula de aceitação por `source.includes`.

## Pendências (não desta frente)

- Reboco do protótipo mantinha roughness .97; produto fixa 1 — diferença menor
  apontada pelo crítico R3, sem A/B que isole o efeito.
- Bake oficial R7 concluído depois do fix de UV: Córrego51peças/0murais, total444 no layout; fingerprint fc80e82d83be4ccd. Fotos R4 do Root são pós-fix.
- A/B de pixels pós-fix não é desta frente (régua-only).


## Fechamento R7 dos gates

Os relatos GLM R5/R6 sem artefato final foram tratados como incompletos. O crítico reproduziu dois pontos cegos: UV U[0] não finito idêntico nos três buffers e transformações de sampler que coincidem em um único UV. A régua agora exige todos os componentes UV finitos em cada geometria produzida/aceita e compara as nove entradas da matriz UV efetiva de albedo, normal e roughness, com tolerância finita1e-6. Quando matrixAutoUpdate é true chama updateMatrix como o renderer; quando false preserva e mede a matriz manual. Repeat, offset, center e rotation também precisam ser finitos. Não se exige identidade: os repeats autorados permanecem.

Nominais dos dois gates GREEN. Oito mutantes de material terminam RED semântico1 com multiset exato: procedural-faixas(muro-fontes-pbr×8), normal-srgb(muro-normal-srgb×8), repeat-diverge(muro-samplers×1 e muro-sampler-transform×1), offset-nan(muro-sampler-finito×1 e muro-sampler-transform×1), offset-diverge e rotacao-no-probe(muro-sampler-transform×1 cada), rough-srgb(cru-rough-srgb×1) e raw-double-tint(cru-tint×1). O último caso de rotação evita regressão ao teste de um ponto UV.

Os quatro mutantes reais do vao também terminam1: missing-reference, reference-wrong-dims, lock-removal-factor1 e uv-nao-finito. O novo uv-nao-finito injeta NaN em U[0] da geometria real e exige quatro cláusulas uv-finita-fria/quente/baseline/prop. Nominal precede cada variante; fonte temporária é removida em finally. Nome herdado do prototype (constructor/toString) é uso2 por Object.hasOwn; exceções de preparação/import/build viram infra3. Não há equivalência entre infra3 e mutante detectado. Logs Root root-corrego-*-R7-* e root-UV-R7-* no audit da missão; crítico final pendente no momento desta redação.

Calibração final do mutante rotacao-no-probe: center(.25,.5), rotationPI, offset(.15,.3). Mantém UV(.25,.5) igual ao albedo(.4,.2), mas difere em outros pontos. Assim, restaurar o guard antigo de único UV faz o mutante sobreviver; o guard atual de matriz completa o detecta. As listas correntes acima agora refletem8material/4UV.
