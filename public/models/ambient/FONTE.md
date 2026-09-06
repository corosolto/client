# Fauna ambiente

Derivados otimizados das referências locais; texturas WebP 256², sem quantização
de malha skinned.

- `rat_animated.glb` — “Rat Animated”, Lobbyvictor,
  [Sketchfab](https://sketchfab.com/3d-models/rat-animated-cba5c3b8a946499083b4adfbb6d568b8),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- `pigeon_ground.glb` — “Pigeon”, kenchoo,
  [Sketchfab](https://sketchfab.com/3d-models/pigeon-ddd5ef4a94eb4159937a9de25c45697c),
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- ~~`pigeon_flight.glb`~~ — **removido na v2.1** (frente D, BUG-57): pombo de asas
  abertas parado no céu. Pedido do dono, 18/08: “a pomba que nao esta com bracos
  avertos deveria ficar so na ponta das lajes ou no chao”. O acervo Quaternius/Poly
  Pizza não tem pássaro riggado com voo animado (varedura 19/08), então a presença
  aérea acabou — pombo anda no chão e pousa na ponta das lajes (régua AM11/AR5).
- `dog_caramelo.glb` — “Shiba Inu” (Ultimate Animated Animals Pack), Quaternius,
  [quaternius.com](https://quaternius.com/packs/ultimateanimatedanimals.html),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  Tingido para caramelo no pipeline (`Main` #C68642, `Main_Light` #E4C59A) —
  o original é marrom escuro com marcações cinzas. `skin.skeleton` inválido do
  export original foi removido (hint que o three.js ignora).
- `cat_telhado.glb` — “Cat”, Quaternius (Ultimate Animated Animals), espelhado no
  [Poly Pizza](https://poly.pizza/m/qKICY6xla2), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1 frente D (BUG-57): gato de telhado das favelas; clipes Idle/Walk/Run no
  controlador `cat` do `ambientlife.js`.
- `galinha_campo.glb` — “Chicken”, Quaternius (Ultimate Animated Animals),
  [Poly Pizza](https://poly.pizza/m/ineV9pU5VL), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1: galinha do campinho (fy_campomorro) e de quintal (fy_corrego); clipes
  Idle/Walk (o pack não traz Walk+Run separados — flee usa o Walk).
- `vaca_campo.glb` — “Cow”, Quaternius (Ultimate Animated Animals),
  [Poly Pizza](https://poly.pizza/m/26zM1outCr), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
  v2.1: vaca da várzea do fy_campomorro; clipes podados para Idle/Walk/Gallop
  (o pack traz 24 — `keepClips` do pipeline corta os que o controlador não toca).
- `jacare_corrego.glb` — “Blocky Belly Caiman”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (pedido do dono: “precisa gerar jacare no mintgg”).
  Chat: <https://mint.gg/chat/ph71907xmzehws02vnam630e6n8cpypj> · licença de uso
  do assinante Mint Pro (asset original gerado por prompt, sem copyright de
  terceiros). Otimizado no pipeline (WebP 256²) a partir de
  `references/glb/jacare_corrego_mint.glb`; registro com SHA em `mint-assets.json`
  (`jacare-corrego`). Estático — o pipeline de animação Mint é humanoid-only.
  **Dívida v2.1 (frente D):** não existe jacaré riggado CC0 — Quaternius não tem
  réptil em nenhum pack (enumerados 19/08: Animated Animals = 12 mamíferos,
  Farm = 7) e o Poly Pizza só oferece caimãs estáticos (busca “alligator”/
  “crocodile”/“caiman” 19/08, todos `anim=False`). Integração do GLB estático é
  da frente B (call-site do córrego).
- `capivara_corrego.glb` — “Sleepy Brown Rodent”, Mint text-to-3D (Meshy), gerado
  18/08/2026 para o BUG-57 (idem). Chat:
  <https://mint.gg/chat/ph74kf2engyr4skt5kxkwxxrgd8cqmqt>. Mesma licença e
  pipeline; textura clareada ×1,45 (`brighten`) porque o Mint entregou lum 69 e
  o estilo da fauna é lum 86-165 (dog). Registro em `mint-assets.json`
  (`capivara-corrego`). Estático, idem — mesma dívida de rig da frente D (busca
  “capybara”/“capybara animated” no Poly Pizza: só estáticos).
- `tatu_campo.glb` — “Segmented Tatu Walker”, Mint text-to-3D, gerado 19/08/2026
  para a vida 1 (plans/22). Chat: <https://mint.gg/chat/ph763essssxnfef5n923a7gn5d8crckr>.
  Mesma licença do jacaré/capivara; registro em `mint-assets.json` (`tatu-campo`).
  Estático — anda pelo `_updateQuad` do `ambientlife.js`. Tatu não existe em
  nenhum pack Quaternius (a varredura 19/08 acima cobre: 12 mamíferos + farm,
  nenhum xenartro). Call-sites: fy_campomorro, praca_poderes (AR4).
- `papagaio_poleiro.glb` — “Yellow Chevron Parrot”, Mint text-to-3D, 19/08/2026
  (vida 1). Chat: <https://mint.gg/chat/ph73z314p21j55zt11pa040frh8cstk4>.
  Registro `papagaio-poleiro`. Estático de poleiro (a barra faz parte da malha)
  com balanço procedural `_updateParrot` — poleiro não precisa de voo, o que
  contorna a dívida de pássaro riggado CC0 registrada na pomba. Call-sites:
  fy_mansao (balaustrada do terraço), parque_treta (AR4).
- `arara_voo.glb` — “Arara em voo”, Mint text-to-3D, 27/08/2026 (lote céu).
  Chat: <https://mint.gg/chat/ph7ajvsqfqtnafkh23jjd5dpsh8d6709>. Registro
  `arara-voo`. **Paga a dívida registrada acima na pomba**: a presença aérea
  acabou na v2.1 porque o `pigeon_flight.glb` era ave de asas abertas PARADA, e o
  plans/22 condicionou a volta a "pássaro riggado de verdade". O rig do Mint
  continua sendo só humanoid, então a solução foi a mesma do tatu e da pipa —
  **asa vira NÓ, o bater é procedural**: `tools/split-props-v21.mjs arara_voo`
  separa `asa-esquerda`/`asa-direita` com pivô na raiz (regra medida no bruto:
  |z| > 0,10 é asa; 512/515 tris cada, simétrico), e o `skylife.js` gira as duas
  em sentidos opostos, curso ~33°. Nariz em −X (`BIRD_FORWARD_X`), medido pela
  densidade de triângulos: a ponta −x tem a cabeça compacta, a +x afina no rabo.
  2.951 tris após `simplify .6`. Call-sites: fy_corrego (bando de 3), fy_lajes
  (par). NÃO é fauna de chão: não entra no `ambientlife.js` nem no censo do
  `ambience-registry` — vive no `skylife.js`, sem colisão e sem reação a tiro.
- `barata_urbana.glb` — Mint text-to-3D, 19/08/2026 (vida 1). Barata de esgoto
  do córrego e da doca do atacadão; darta pelo `_updateRat`. Registro
  `barata-urbana`. (Primeira geração bloqueada pela moderação do Mint;
  regenerada com prompt de "garden beetle".)

Pipeline reproduzível: `node tools/optimize-ambient-fauna.mjs` (filtre por
`quaternius_cat`/`quaternius_chicken`/`quaternius_cow` para regenerar as
espécies v2.1). Referências de silhueta/procedência de medidas:
`references/fauna-corrego/FONTE.md`; ficha: `plans/21-FAUNA-CORREGO.md`;
evidência e revisão: `tools/eval/asset-evidence/fauna/`.

## Sertão — lote existente, registro documental de 05/09/2026

Procedência dos GLBs existentes: [mint-assets.json](../../../mint-assets.json), entradas listadas abaixo. O registro declara geração Mint text-to-3D a partir de prompt próprio do projeto, sem referência de terceiro; o texto integral do prompt não está arquivado no manifesto. `source.notes` registra o propósito e o pipeline, `source.chatUrl`/`source.assetId` identificam a geração, e `processing.finalSha256` identifica o arquivo final. Não reconstruir o prompt de memória.

**Licença específica e autor humano de cada geração: pendentes de documentação.** A declaração Mint Pro dos outros lotes não substitui termos específicos destes registros. Não declarar CC0, autoria individual, licença comercial verificada nem atribuição dispensada. Nenhum asset externo novo foi baixado para esta revisão.

Hashes abaixo são snapshot extraído do manifesto e conferido contra os arquivos em 05/09/2026. O manifesto permanece a fonte canônica; método de reprodução e inventário técnico em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).

| Arquivo / registro | Chat de geração / assetId | SHA-256 final conferido |
|---|---|---|
| [`lagarto_sertao.glb`](lagarto_sertao.glb) / `lagarto-sertao` | [chat](https://mint.gg/chat/ph70g5cch8yt9tqm4aj55n2t9d8d59sj) / `ks7b9n65cxtmvfkxcc8a3rm93d8d4p9j` | `5ef08bdcf2390e44a0e1956568392b2f5885fd450257c077257a50c3b5b4650a` |
| [`calango.glb`](calango.glb) / `calango-sertao` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks77c1dphgsvbxfar88b6080jh8d7bf2` | `0dcb851d6d1a20e9c9161fc2b559175a10e264b91bfbdf0f0b441a5617cc3d07` |

As fotografias de Maranguape e da capela da Fazenda Colônia foram apenas referências de observação do agente principal no Chrome; não foram incorporadas aos GLBs nem copiadas como textura nesta revisão. Créditos, observações atribuídas e limites em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).

### Calango: derivado corretivo de 06/09/2026

`calango.glb` conserva a geração, textura e autoria pendente do registro `calango-sertao`. Foi removida apenas a face ordinal 1118 (índices 1409/1410/1411), um triângulo preto que atravessava o vão sob o corpo. Não houve regeneração, mudança de material, escala, pose ou substituição por outro animal. Os três vértices dessa face eram usados apenas por ela no índice; duas posições coincidem com costuras de outros vértices. O diagnóstico visual e geométrico está em `docs/reports/SERTAO-FAUNA-VOO.md`.

- Original: SHA-256 `0dcb851d6d1a20e9c9161fc2b559175a10e264b91bfbdf0f0b441a5617cc3d07`.
- Derivado: SHA-256 `2088f293ac3ef5c6f1779fb3e45b1193173629001a0687d3956bef81a0a8e2c1`.
- Reprodução: `node tools/repair-calango-surface.mjs`, que aceita somente o hash original; original recuperável no commit `018806e2d11a1eb10b118da0d5afa5ce35869375`.
- Validação: `node tools/eval/calango-surface-check.mjs` compara a superfície e o hash dos buffers não relacionados ao índice; a mutação `recoloca-triangulo` restaura a face original em memória.

A correção local não resolve nem altera a pendência dos termos específicos de licença e da autoria humana da geração Mint. O snapshot de 05/09 acima identifica o original, enquanto `mint-assets.json` identifica o derivado final.

## Calango quadrúpede — derivado local, 06/09/2026

`calango_quadrupede.glb` deriva exclusivamente do `lagarto_sertao.glb` acima,
Mint asset`ks7b9n65cxtmvfkxcc8a3rm93d8d4p9j`, mesmo chat/origem. A ferramenta
`tools/derive-calango-quadruped.mjs` retira a pedra, ajusta quatro apoios, orienta+Z
e acrescenta morphs e cicloRun autorais. Texturas preservadas byte a byte.
608.484bytes/4.795tris; SHA256`78cc644d948de4a98da962edf084116c2c124ec5c8284a5cc53075d0e2ef8233`.
Licença específica e autoria humana herdadas continuam pendentes. Não é CC0 nem
animação fornecida pelo Mint. Registro `mint-assets.json`, relatório
`docs/reports/SERTAO-CALANGO-QUADRUPEDE.md`. O calango bípede anterior permanece
no acervo como evidência, mas foi rejeitado para a fauna em movimento pelo dono.

## Criação do Sertão — outputs próprios Mint, 06/09/2026

`sertao_cabra.glb`, `sertao_galinha.glb` e `sertao_pintinho.glb` vêm do projeto
[Sertão — fauna e memória](https://mint.gg/project/zd7d9mfmgv0b80ezp3xbykp1ns8dw47r),
pack `th78004y9j8g2kd0mkd45xq65x8dw112`, output
`vd7azjz400t2sy4g2h4z14ff318dx0mb`,
[chat de geração](https://mint.gg/chat/ph7b9m9y8gfz5j83vkxqsrbvzs8dxgba).
Prompt original integral e recibo do ZIP em
[`SERTAO-FAUNA2-ASSETS.md`](../../../docs/reports/SERTAO-FAUNA2-ASSETS.md).
Geração por IA, TRIPO_P1 identificado pela UI Mint; não atribuir autoria humana
ao gerador. Nenhuma imagem, malha de terceiro, marca ou pessoa usada no prompt.

Base de uso: [termos oficiais Mint](https://docs.mint.gg/terms-of-service),
atualizados em 07/05/2026, consultados em 06/09/2026. A seção 4 cede ao usuário os
direitos que Mint tiver no output criado para ele, sujeitos aos termos e direitos
de terceiros; a seção 6 exige revisão antes de uso/distribuição. Não é CC0 nem
garantia de exclusividade. Não há exigência específica de atribuição nesses
termos; o projeto preserva estes créditos e os IDs de procedência.

Os originais eram estáticos. `tools/animate-sertao-livestock.py` cria localmente
rigs animais e clipes `Walk`/`Idle`, normaliza metros/Y-up/frente+Z e conserva
albedo Mint em JPEG1024. Galinha e cabra mantêm a geometria original normalizada;
o pintinho foi reduzido de4.910 para3.190 tris e comparado em quatro vistas.
Não são animações fornecidas pelo Mint. Nenhuma textura externa acrescentada.

| Arquivo | Triângulos | Bytes | SHA-256 final |
|---|---:|---:|---|
| `sertao_cabra.glb` | 4.790 | 495.836 | `a89410b7f899a14e19d8955cd5935e2222b3f764d36abc48f42f59e68eac0eea` |
| `sertao_galinha.glb` | 5.078 | 498.484 | `d07aa63bea9db19f4df54fe10495b08821f446706c3e253e8ceecc91f8e65b17` |
| `sertao_pintinho.glb` | 3.190 | 288.400 | `a2f144c8b9de0ff140a2cde29fccc619dd6a2620b7b62d1948b52d94e924bbc0` |

Fonte canônica de hashes/transformações: entradas `sertao-*-animada` em
[`mint-assets.json`](../../../mint-assets.json). Esta verificação documenta
estes três downloads próprios; não atribui retrospectivamente autoria aos lotes
antigos com lacunas acima.
