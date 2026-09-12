# Lajes V5 — céu, helicóptero e relevo de fundo

Helper implementado em `public/js/lajes_sky.js`, exclusivamente para Lajes. Usa o helicóptero GLB existente, preserva rotores separados e recebe tempo pelo `ambience.update`; não cria RAF, timer, áudio ou loader paralelo. O relevo de fundo é opcional. **Ainda não houve captura browser desta integração nem aprovação visual/FPS.**

Escopo: branch `codex/lajes-visual`, base `688765c0`, 06/09/2026. Somente o novo helper e este documento foram escritos por esta subtarefa; o builder e `ambientlife.js` pertencem ao integrador. Skill aplicada: `.claude/skills/gauntlet-fps/SKILL.md`; a captura permanece com um único agente, conforme a divisão autorizada.

## Asset real e procedência

| Item | Evidência local |
|---|---|
| Arquivo | `public/models/props/helicoptero_pm.glb` |
| Registro | `mint-assets.json`, id `helicoptero-pm`, frente `v21-e-models` |
| Origem | Mint text-to-3D, “Blue White Police Copter”, asset `ks75eehczen48e5qsvsygy4abh8cs92f` |
| Direitos registrados | Uso do assinante Mint Pro; `public/models/props/FONTE.md`, lote 3 remete à mesma licença dos lotes 1–2. Não é CC0. Confirmação documental local, sem nova consulta aos termos privados da conta |
| Página de origem | [Chat Mint](https://mint.gg/chat/ph76rk8v51359p9cd6rk249j5x8crxq0) |
| Bytes / SHA-256 | 350.504 / `47ffa24e6d2e88b74d928b0df70c00f2de7356fe29b16c550ae1c055eb4d5773`, idêntico ao registro |
| Geometria | 4.933 triângulos: corpo 4.571; rotor principal 287; rotor traseiro 75 |
| AABB original X/Y/Z | 0,998047 × 0,458984 × 0,896484 unidades, incluindo rotores e suas translações |
| `rotor_main` | pivô (0,08; 0,17; 0); gira em Y local |
| `rotor_tail` | pivô (−0,44; 0,02; −0,05); gira em Z local |

A imagem local `tools/eval/asset-evidence/props-v21/helicoptero_pm-corrigido.png` foi inspecionada: fuselagem azul/branca, cabine, cauda, rotor e trem de pouso reconhecíveis. Há aspecto facetado e artefatos no render de software; ele não certifica os materiais no WebGL atual. A anotação de fonte descreve modelo genérico sem logo/texto. O nariz aponta para +X, compatível com o rotor traseiro no extremo negativo de X.

O helper normaliza o comprimento pela AABB do clone para **9,5 m**, preservando proporção. Não usa `targetLen` como comprimento direto: essa opção do `placeProp` calcula média geométrica com altura. Materiais e geometria continuam compartilhados com o cache; o descarte remove o clone, sem destruir o asset reutilizável.

## Integração pelo MAIN

1. Importar `LAJES_SKY_PROPS`, `LAJES_KITE_CONFIGS`, `attachLajesSky` e, se desejado, `addLajesBackdrop` de `./lajes_sky.js`.
2. Acrescentar `...LAJES_SKY_PROPS` a `LAJES_PROPS`, que passa pelo preload normal. Contém apenas `'helicoptero_pm'`.
3. Manter `PIPA_ASSETS` em `LAJES_AMBIENCE`; ele carrega `models/ambient/pipa.glb`, não `models/props/pipa_papel.glb`.
4. Substituir as configurações da chamada existente de `attachPipaSky` por `LAJES_KITE_CONFIGS`, ajustando as alturas das âncoras aos telhados físicos finais.
5. Chamar `attachLajesSky(ambience, root, { low })` depois de anexar as pipas. Não adicionar o helicóptero a `PropBatch`: isso perderia os nós animáveis.
6. O fundo é opcional: `const backdrop = addLajesBackdrop(root, { low });`. Encadear `backdrop?.dispose()` no `ambience.dispose` existente, preservando a função anterior. Não adicionar suas malhas a colliders/occluders nem ao merge de geometria transitável.

A query `?lajessky=0` desliga os dois helpers novos para comparação; não desliga as pipas já controladas pela API global. `attachLajesSky` evita duplicar a própria anexação quando `ambience.lajesSky` já existe. Não altera materiais globais, névoa, iluminação ou o registro de outros mapas.

**Preload ausente ou falho:** `placeProp` devolve null. O helper cria somente um locator vazio, com `source: 'missing-glb'` e zero meshes. O céu não ganha uma imitação procedural do helicóptero. Esse estado é deliberadamente distinguível e deve reprovar a aceitação visual. Não há carregamento tardio nesta função; depois de um preload faltante, é necessário reconstruir o mapa para usar o GLB.

Inventário para os gates:

- grupo `LAJES_SKY`, filho `LAJES_HELICOPTER`; ambos têm `userData.skyLife='helicopter'`, portanto contar o carrier por nome para não duplicar uma aeronave;
- carrier: `userData.asset='helicoptero_pm'`, `source='gltf'|'missing-glb'`;
- `ambience.lajesSky.snapshot()`: source, asset, position, heading, rotorMain/rotorTail boolean, rotorAngles, length e disposed;
- fundo: `LAJES_MORRO_BACKDROP`, `skyLife='urban-hills'`;
- pipas preservam `ambience.pipaSky` e suas tags/snapshot já existentes.

## Composição inicial e decisões verificáveis

Órbita inicial: raios X62/Z84 m, centro X0/Z8, altura 38 m com oscilação de ±1,5 m, período 105 s. Um helicóptero permanece acima/fora do espaço transitável; não há projéteis, perseguição ou som inseridos pelo helper. A altura e velocidade são escolhas de composição do jogo, não afirmações sobre procedimentos reais de voo. A tangente define o rumo; os rotores avançam 39 e 64 rad/s nos eixos locais. A inspeção browser precisa verificar aliasing do rotor e não apenas que o ângulo mudou.

Pipas propostas pela constante exportada:

| Pipa | Âncora X/Y/Z | Altura absoluta | Raio horizontal | Fase / giro |
|---|---|---:|---:|---|
| Norte | −11 / 3,1 / −26 | 17 m | 22 m | 3,4 / 0,35 |
| Sul | 11 / 3,1 / 25 | 20 m | 20 m | 0,1 / 0,40 |

`ancora.y=3,1` é valor inicial para o integrador substituir pelo topo físico da laje. `alt` da API é altura absoluta, não distância acima da âncora. A API global fixa envergadura/alvo maior de X/Y em **1,35 m** e não aceita parâmetro de tamanho por configuração. Não foi alterada. O modelo existente tem autoria Mint registrada como `pipa-lajes`, 4.532 triângulos, em `public/models/ambient/FONTE.md`; ele é diferente da outra pipa disponível na pasta de props.

A escolha desloca o voo para além das extremidades das rotas, evitando concentrar tudo diretamente sobre a cabeça. Para referência geométrica: um objeto de 1,35 m a 50 m ocupa cerca de 1,55°; em viewport 1024 px de altura com FOV vertical de 70°, sua dimensão máxima projetada seria aproximadamente 20 px. É cálculo condicional de projeção, não pixel medido do jogo. O integrador deve verificar visibilidade e oclusão a olhos **1,62 e 4,72 m**, nos dois sentidos de saída dos spawns e sobre a laje. Se desaparecer, ajustar distância/altitude/contraste antes de prometer tamanho que a API não oferece.

O fundo contínuo usa seis anéis entre 72 e 285 m, altura construída por ondas suaves com variação menor de crista, normais suavizadas e cores de terra/vegetação. Uma malha: **1.600 triângulos**, ou **960 em low**; sem novas texturas, árvores isoladas, luzes ou sombras. Essa forma é uma proposta de relevo para apoiar o casario authored da frente principal. Não reproduz topografia real, não define área navegável e não recebe nota visual por ser barata. A ausência de textura será aceitável somente se a captura confirmar leitura de plano distante, sem aspecto de bloco lowpoly ou parede verde.

## Referências RJ e SP

A pesquisa consultou fontes primárias para apoiar a composição, sem baixar ou integrar imagens:

- **RJ:** [Memória Rocinha — Rocinha, São Conrado e Pedra da Gávea](https://memoriarocinha.com.br/rocinha/), projeto IMS/Museu Sankofa. O [IMS descreve seu método](https://ims.com.br/por-dentro-acervo/territorio-rocinha/): comparação de panoramas históricos e atuais a partir dos mesmos pontos de vista. Direção adotada: encosta contínua e escala de paisagem atrás do tecido urbano. Nenhuma medida do helper foi extraída dessas fotos.
- **SP:** a [Secretaria Municipal de Habitação apresenta a história de Paraisópolis](https://prefeitura.sp.gov.br/web/habitacao/paraisopolisold/historia), incluindo o adensamento de Grotão/Grotinho. É referência histórica, não cadastro atual nem licença de fotografia; não usar os números populacionais antigos para descrever o presente.
- **SP / cultura de favela:** o [acervo do Museu das Favelas](https://www.museudasfavelas.org.br/acervo/) enfatiza memória, diversidade de saberes e identidades; seu texto curatorial inclui pipas, campinhos e escadões. Apoia manter sinais de vida cotidiana em conjunto com a paisagem. Não transforma helicóptero ou precariedade em identidade única do lugar.

As páginas são referências, não licença de integração de mídia. O fundo é authored e os dois objetos de céu vêm do acervo local documentado. A distinção importa: procedência de um GLB não licencia uma fotografia usada para pesquisa.

## Validação executada e limites

`PATH=/opt/homebrew/bin:$PATH node --check public/js/lajes_sky.js`: exit 0.

Teste Node usando o harness existente e **o binário real do helicóptero**: GLTFLoader preservou geometria e hierarquia, substituindo somente materiais por placeholders para não decodificar imagens. O preload foi alimentado por esse resultado em memória e o helper real foi importado sem modificação. Resultados:

- comprimento normalizado 9,5 m; dois rotores encontrados;
- 60 updates alteraram órbita e rotores;
- pausa manteve snapshot; update anterior recebeu todos os 61 calls;
- anexação repetida não duplicou a aeronave;
- dispose removeu o grupo; zero eventos de dispose em geometrias do template compartilhado;
- sem preload: `missing-glb`, zero meshes;
- relevo com posições finitas, normais superiores orientadas para cima, 1.600/960 triângulos e descarte próprio;
- mutações em memória `orbit-static` e `ignore-pause` foram ambas reprovadas.

Os testes foram executados por stdin, sem criar novos scripts no repositório. Não verificam decodificação WebP, shader, contraste, oclusão, percepção do voo, rabiola no movimento ou FPS. O MAIN deve capturar o helper integrado, confirmar `source='gltf'`, comparar a query de desligamento e submeter os quadros à crítica independente. Não há commit desta subtarefa.

## Integração final V5

MAIN integrou os helpers no builder e confirmou os GLBs no browser. A apresentação local da pipa corrige escala da vela (1,20×1,061m) e orientação pela âncora; não modifica cache/global. O relevo usa agora25anéis/160segmentos (7.680triângulos), ou13/96 em low (2.304triângulos). A cor foi ajustada para vegetação distante.

O domo de céu usa gradiente próprio e raio330m. Um primeiro raio390m cruzava o far-plane400m nos spawns e expunha o fundo como uma pirâmide clara: raycast mediu415,32m no pixel790×340 da câmera spawn-norte. O limite conservador atual é367,51m incluindo o extremo jogável, abaixo de400m. Teste browser passa a exigir essa margem. Referências/red/prova: `sky-hit.json`, `sky-runtime.json` em `artifacts/lajes-visual/v5/` e `browser-final/`.

Browser final: corpo GLB do helicóptero e dois rotores encontrados; órbita e ângulos alteram em60updates, pausa mantém estado. Duas pipas registramfonteGLB e são visíveis nas capturas. Esses checks não aprovam frequência perceptiva em uma partida nem desempenho. `?lajessky=0` desliga a apresentação local/heli/domo/relevo; pipas de base continuam pelo módulo compartilhado. O descarte tolera helpers nulos desse desligamento.
