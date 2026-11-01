# Acabamento do Ferro Velho e Campo do Morro

Parte M2 da [métrica](METRICA.md). O tijolo procedural da casa B ampliava blocos
e furos como desenho; o Campo repetia terra e reboco sobre caixas de tamanhos
diferentes, com densidade variável. As capturas reais finais ainda são um gate
separado desta medição de materiais e UV.

No Ferro, a casa usa o par cor/normal `lajes_tijolo_baiano` já existente no acervo.
O período de 1,2 × 2 m vem de `brick` em `public/js/lajes_houses.js`, aplicado
por face sobre o UV métrico, inclusive no `aoBoxGeo` subdividido. A marca
`texelEscalada` impede que `vao.js` aplique uma segunda escala — o Campo agora
sinaliza o mesmo travão no `uvRebocoMetros`. Cor e AO de vértice continuam
independentes da textura. Se o download do tijolo falhar, o `onError` do `bind`
limpa só o slot que falhou **em todos os materiais dependentes** — o original
`MAT.office` e o clone que o `aoMatFactory` entrega à casa (é ele quem desenha;
o clone compartilha a referência da textura, então a limpeza precisa alcançá-lo
explicitamente). A parede fica na cor chapada `0xc18b71`, nunca num sampler sem
imagem (parede preta).

No Campo, o reboco usa cor/normal/roughness `pbr_paintedplaster017`, com o período
de 2 m do material correspondente no Lajes. A terra usa `soilSurface`, como o
Ferro, com a contagem inteira de tiles mais próxima da densidade medida no seu
terreno: 52 × 43 para a área de 72 × 60 m. Não há normal derivada do albedo.

## Tint mineral do solo do Campo (causa, escala, física, custo, limite)

O crítico visual R2 reprovou o solo bege: a troca do albedo para
`packed-junkyard-earth` (média nominal `#786D5F`) jogou fora a identidade
vermelha do baseline. O tint local `0xC0702D` recupera essa identidade sem
voltar no `dirt_field` de 9 m/tile, sem losango/xadrez e sem tocar
`soilSurface`/Ferro (que seguem sem tint, guardados pela própria régua).
Procedência do número, não gosto: média do `dirt_field.webp` medida em sRGB
(150, 101, 54) × tint do baseline `0x9a7a4c` (HEAD `ad696fb87`) ÷ média nominal
do canvas, tudo no domínio linear; o produto mira a média do solo do baseline.
É decisão **candidata**: paridade de média não é aprovação visual — as fotos
reais em 3:2 do root decidem. Escala: o período de grão (1,38 m/tile, 52 × 43)
não muda, o tint multiplica o mesmo canvas. Física: nenhuma — tint é hex de
material, sem geometria, colisor ou occluder. Custo: zero (hex, sem textura
nova). Limite: node não renderiza cor; a cláusula compara o hex efetivo do
material (`getHex` sRGB), o resto é foto.

O albedo externo só substitui o fallback após carregar. O callback também
atualiza clones criados antes do carregamento, preservando seus repeats e
pareando normal/roughness com a nova fonte. O detalhe explícito do reboco tem
precedência sobre derivados do bitmap anterior. Falha no albedo conserva o
fallback; ausência de detalhe não autoriza reaproveitar mapas incompatíveis.

## Capim × balcão do escritório

O clump `[-8,-34]` nascia dentro do escritório (casa B) e um tufo de capim
alto atravessava o balcão (`addBox(3.2, 1, 1.4)` em `(-8, -31.5)`) nos níveis
med e low — reprovação do crítico R2 confirmada pelo probe de triângulos
reais. O clump mudou para `[-14,-34]`, fora da casa: mesma contagem, mesmo
consumo de RNG e nenhum colisor envolvido — capim nunca registrou colisão.
A régua é por geometria: todo triângulo efetivo (instância × malha de folhagem
`nonSolidSurface`+`alphaTest`) que cruza o **volume sólido** do balcão reprova,
sem depender de nome de clump ou de malha. **Mesh comum conta como instância
única** sob sua `matrixWorld` — os planos de capim/trepadeira que o mapa cria
fora do `InstancedMesh` entram na mesma varredura (21 malhas comuns no Ferro,
invisíveis para a versão anterior da régua). Roda em med (em processo) e low
(subprocesso, porque LOWQ é const de import). Balcão ausente/ambíguo ou
folhagem não encontrada é RED — régua
cega não passa; invasor de cada classe (instanced e Mesh) é exercitado pelo
mesmo acceptance.

## Decisões locais pendentes de foto (não corrigir sem prova)

- `normalScale` do reboco em `.4` (heurística mineral) contra `.65` do Lajes:
  desvio **decidido localmente e observável** — mesma família e período, relevo
  1,6× mais fraco que a referência citada. Não é quebra de contrato da doc;
  fecha na rodada de foto se o root quiser paridade.
- Mural do baile como plano single-sided (face oeste) e placas da guarda com
  reboco sub-tile: ambos **pendentes de captura real**. Nada de `DoubleSide`
  ou material liso sem a foto que prove o defeito.

## Evidência e reprodução

`external-surface-binding-check.mjs --self-test` executa os callbacks reais com
loader controlado: fallback, troca de albedo, descarte de detalhe antigo,
detalhe explícito, clone anterior ao load, sampler próprio e o fallback de 404
do tijolo do Ferro em DOIS níveis com a MESMA aceitação: (1) unidade — o clone
do material é feito pelo `aoMatFactory` real e registrado como dependente do
bind, exatamente como o `addBox` faz; (2) build real — `buildFerroVelho` sobe
com o `TextureLoader` patchado que captura (e depois executa) o `onError`
entregue pelo produto, e a cláusula inspeciona o material que as 4 paredes da
casa realmente desenham. O loader nunca engole erro: mutante sem `onError`
entregue aborta `NAOAPLICOU`, não fabrica RED. Mutantes `tijoloSemFallback`
(callback no-op capturado e executado), `tijoloSemPropagar` (limpa só o
original — o defeito P2-1 do crítico R2) e `tijoloSemOnErr` (abort honesto).
Mutante só existe com alvo único no fonte (`replaceOnce`): 0 ou mais de 1
ocorrência é erro de régua cega, não mutante.

`map-material-finish-check.mjs` constrói os dois mapas pelo harness e mede os
UVs em suas faces. Compara o período esperado com uma folga numérica de
64 ULPs relativas de Float32 (`64 × 2^-23 × referência`), sem banda de gosto
de 5%. **Cobertura completa**: cada face vertical esperada (0,1,4,5) de cada
parede precisa de grupo presente, todos os UVs usados finitos e span finito
positivo — face colapsada ou NaN reprova com parede/face identificada, não
sai da lista em silêncio. Só PlaneGeometry, como o mural, tem contrato separado;
caixa sem grupos reprova. Os grupos devem particionar exatamente o index range
desenhado, sem lacunas/sobreposição/ranges inválidos. Todos os UVs referenciados
nesse range precisam ser finitos, inclusive fora dos grupos: material único
desenha o range inteiro no renderer. Não se fixa uma ordem artificial de índices.

**Malhas estáticas mescladas (material único)**: as fachadas R23 juntam muitas caixas por material
(`pecaR23`/`batchR23` → `mergeParts`), e `normalizeGeo` descarta groups sem recriá-los —
sem groups é legítimo nesse caso, porque material único desenha o drawRange inteiro no
renderer. O contrato usa atributos Three com `position.itemSize=3`, `uv.itemSize=2` e índice
escalar quando existe; aridades incompatíveis reprovam. A régua lê TODOS os triângulos efetivamente desenhados
(indexado ou não, respeitando o drawRange, inclusive as últimas peças — cauda não cai em
silêncio), valida drawRange inteiro/limites, índice dentro de posição/UV, posição e UV
finitos, rejeita triângulo de área zero e UV de rank colapsado, e mede por triângulo o
Jacobiano UV→mundo com `updateWorldMatrix(true,false)` e a `matrixWorld` real: os módulos
de p_u/p_v dão os períodos físicos U/V e o cosseno entre eles detecta cisalhamento com a
mesma folga `epsilonUV(1)` (sem novo épsilon geométrico arbitrário; zero e não-finito
exatos são RED). Atributos ausentes, aridades incompatíveis e geometria vazia ou degenerada reprovam.
Esse aceite cobre as Mesh estáticas construídas pelo R23; instancing, skinning e morphs
ficam fora desta medição.
Se groups existem nessa malha, exige a mesma partição exata do contrato de caixa — não
confia nem ignora ranges inválidos. Nenhum nome de malha ou tag de piloto isenta nada;
malha multi-material segue exigindo groups como antes. Limites: node é contrato métrico —
não acrescenta aceitação de arte, iluminação nem desempenho móvel (esses continuam
UNKNOWN até foto/dispositivo). Seis mutantes novos agem sobre uma malha reboco mesclada
REAL, selecionada por estrutura (BufferGeometry sem groups): `reboco-mesclado-periodo`
(período num triângulo da última peça), `reboco-mesclado-nan` (UV NaN no último desenhado),
`reboco-mesclado-cisalha` (U/V não ortogonais no mundo), `reboco-mesclado-indice`
(último índice fora dos limites), `reboco-mesclado-drawrange` (range incompleto) e
`reboco-mesclado-posicao` (posição desenhada não finita); sem alvo real o mutante aborta
NAOAPLICOU, não fabrica RED.
O UV métrico baked pressupõe canal0 e matriz de textura identidade em cor, normal e
roughness realmente usados. A régua atualiza a matriz como o renderer quando
auto-update está ativo e verifica parâmetros/matriz finitos; repeat, matriz manual
ou canal alternativo não podem mudar o período medido. A comparação com identidade
usa64 ULPs de Float64, sem banda visual. O mutante repeat3 foi GREEN antes
desta aceitação e passa a RED pela transformação real do sampler.
Exige AO finito e variável, detalhe
explícito, família/densidade do solo, tint mineral do Campo, solo do Ferro
sem tint e capim (instanced E Mesh comum) fora do volume do balcão em med e low.
Os vinte e dois mutantes são `tijolo-8m`, `reboco-3x`, `solo-losango`,
`reboco-sem-detalhe`, `ao-branco`, `solo-sem-tint`, `capim-no-balcao`,
`capim-mesh-no-balcao`, `tijolo-face-colapsada`, `reboco-face-nan`,
`tijolo-sem-grupos`, `reboco-grupo-truncado`, `tijolo-repeat`,
`tijolo-offset-nan`, `tijolo-matriz` e `tijolo-canal` — mais os seis
`reboco-mesclado-*` da malha mesclada real acima; cada um deve sair1 pela cláusula
correspondente. O wrapper `map-material-finish-mutations-check.mjs` exige baseline
GREEN, exit1+JSON RED e cláusula específica de cada mutante; crash não é detecção.
Mutante desconhecido é erro.
`--solo-vegetacao` + `--quality=low` é o modo interno do subprocesso low.

As contagens de materiais/texturas do harness são diagnósticas e cobrem todos
os slots de textura realmente usados (`map`, `normalMap`, `roughnessMap`,
`aoMap`, `emissiveMap`, `metalnessMap`) — ainda não é `renderer.info`. Não
criamos tetos arredondados a partir do próprio candidato: custo e desempenho
móvel continuam UNKNOWN até medição no navegador/dispositivo relevante. Node
não executa upload nem comprova qualidade de iluminação ou antialiasing.

O diff de curadoria no mesmo Campo mantém um único mural no galpão e remove
cópias decorativas sem colisão; é conferido também no inventário de arte. A
comparação física normalizada preservou colliders, occluders, spawns e pickups
antes do acabamento. Repetir a comparação após a versão final e conferir
capturas com o renderer real do jogo antes de aceitar o componente.
