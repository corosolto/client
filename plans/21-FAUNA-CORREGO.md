<!-- spec:time -->
# 21 — Fauna do córrego (BUG-57 parte 2)

> Pedido literal do dono (17/08, KNOWN-BUGS BUG-57): *"precisa gerar jacare no mintgg
> e a capivara, pode usar glbs de mesa de bar"*. Frente B do swarm de 18/08: ENTREGA
> ASSETS; integração no fy_corrego é de outra mão. Esta ficha é curta porque os
> "personagens" são fauna decorativa do `ambientlife.js` — o pipeline de portões
> (spec → compose → generate → review) vale igual.

## 1. Jacaré-do-córrego — morador do canal

- **Visual:** jacaré-de-papo-amarelo (*Caiman latirostris*) estilizado low-poly
  cartoon, compatível com `dog_caramelo.glb` (Quaternius CC0, ~2k tris): cores chapadas
  sem realismo fotográfico, verde-oliva no dorso, papo amarelado, focinho curto e
  largo (silhueta caiman, não crocodilo). Escala-alvo: ~1,8 m de comprimento (média
  da espécie é ~2 m — levemente reduzido para caber no canal de 6 m com margem
  visual). Procedência: Wikipédia *Jacaré-de-papo-amarelo* ("Mede em média cerca de
  2 metros"; habita corpos d'água urbanos — Rio, BH, Floripa).
- **Papel:** sátira ambiente — "tem jacaré no córrego da favela" (plans/13-CORREGO.md
  § Fauna). Fica parado na água do canal, centros de interoperabilidade nenhuma.
- **Arma:** nenhuma (fauna decorativa, não combatente).
- **Mecânica:** idle imóvel na água (spec do mapa: "modelo estático no centro do
  córrego"); se vier com clipes no GLB, valida swim/idle para uso futuro — consumo
  pelo padrão `dog` do `ambientlife.js` (clipMap por sufixo `|Idle`/`|Walk`).
- **Nota:** NÃO é colisor, não bloqueia tiro nem movimento (régua de aceite do
  plans/13-CORREGO.md). Sem gore, sem sangue, sem pessoa real.

## 2. Capivara da margem — a vizinha

- **Visual:** capivara (*Hydrochoerus hydrochaeris*) estilizada low-poly cartoon,
  mesmo estilo do caramelo: corpo em barril marrom-avermelhado, cabeça grande e
  reta, orelhas pequenas, pernas curtas. Escala-alvo: 1,0-1,1 m de comprimento ×
  ~0,5 m de cernelha (real: até 1,2 m × 0,6 m — Wikipédia *Capivara*, "maior roedor
  do mundo"). Levemente abaixo do real para ler como vizinha pequena ao lado do
  jogador de 1,7 m de olho.
- **Papel:** fauna de margem alagada do fy_corrego (plans/13-CORREGO.md: "Capivara
  fica ali", margens/trechos alagados).
- **Arma:** nenhuma.
- **Mecânica:** idle (olha em volta) + walk lento de pastoreio pela margem; flee ao
  tiro próximo se a integração seguir o padrão `dog` (estado já existe no
  controlador).
- **Nota:** sem gore, sem pessoa real. Capivara é meme nacional — leitura instantânea.

## 3. Mesa de boteco — reuso, não geração

- **Visual:** mesa de boteco brasileira simples.
- **Papel:** set dressing de bar das pontes/margens do córrego (dono: "pode usar
  glbs de mesa de bar").
- **Arma:** nenhuma.
- **Mecânica:** prop estático, reuso do acervo.
- **Nota:** JÁ EXISTE no acervo: `public/models/props/mesa_guardasol.glb` (Mint
  asset-pack "Piscinão de Ramos — props", mint-assets.json `piscinao_pack`), usado
  em 7 mapas (lajes, corrego, escadao, posto, mansao, piscinao, quebrada). O próprio
  `map_corrego.js:78` já o declara no PROPS do córrego. Reuso antes de gerar — não
> se gera mesa nova enquanto a existente cobre o pedido.

## Vetos (portão 3)

- [x] Nenhuma pessoa real contemporânea (animais e prop).
- [x] Nenhum asset com copyright (Mint gera original; registro de procedência em
  `public/models/ambient/FONTE.md`).
- [x] Nenhum gore (fauna é decorativa, não alvo).

## Régua de aceite do ASSET (a integração é outra frente)

- GLB carrega no `GLTFLoader` do jogo com texturas embutidas e 0 erro no validador
  Khronos (`npm run eval:gltf-validator`).
- Estilo compatível com a fauna existente: tris na ordem de 2-5k (dog_caramelo =
  1950 tris), texturas pequenas, sem PBR de fotorealismo.
- Escala de mundo documentada e conferida por bounds (jacaré ~1,8 m comp;
  capivara ~1,0-1,1 m comp, ~0,5 m cernelha).
- Clipes de animação nomeados/durados validados; relação de consumo pelo padrão
  `ambientlife.js` (clipMap sufixo) documentada para quem integrar.
- Figura capturada no tamanho servido + crítico adversarial (`asset-review`) com
  veredito APROVADO por item antes de dar a frente como pronta.
- Procedência: entrada nova em `public/models/ambient/FONTE.md` + SHA-256 no
  `mint-assets.json` (mesmo contrato `mint-model` do bozo, com `finalSha256` para
  cair no `eval:asset-integrity`/`eval:gltf-validator`).

## Fora do time (banco de reservas)

- Garças/Biguá no canal, tatú-no-laje — futuros, fora do pedido literal do dono.
