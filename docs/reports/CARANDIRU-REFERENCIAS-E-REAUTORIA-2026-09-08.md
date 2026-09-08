# Carandiru — referências dos anos 1990 e receita de reautoria jogável

## Decisão

O nome exibido do mapa passa a ser **Carandiru**. O identificador técnico
`penitenciaria` permanece para não quebrar URLs, saves, telemetria e contratos. A
mudança de nome entra pelo integrador em `public/js/maps.js`, textos de seleção e
metadados; a reautoria fica no arquivo e nos assets exclusivos do mapa.

O recorte é a Casa de Detenção de São Paulo em funcionamento nos anos 1990. A
representação deve reconhecer que este é um patrimônio difícil e local de violência de
Estado. Não encenar o massacre, não reproduzir vítimas ou pessoas reais e não usar
vestígios humanos como decoração. A identidade vem da arquitetura, do uso cotidiano,
da deterioração e da memória do lugar.

## O que as fontes sustentam

- O conjunto era percebido de fora como uma muralha cinzenta extensa, marcada por
  postos de vigia, diante de um pórtico com a inscrição **CASA DE DETENÇÃO**. Fotografias
  dos anos 1990 documentam o pórtico, a muralha e os pavilhões. Fonte: [artigo da revista
  Tempo/Scielo](https://www.scielo.br/j/tem/a/vGCjxkSVpLkbnV9YxSkC5gP/?lang=pt).
- A Casa de Detenção tinha pavilhões cinzentos de cinco andares, planta quadrada, pátio
  interno central e galerias que davam a volta no pavimento. As janelas internas davam
  para o pátio; as externas, para fora do bloco. Paredes altas separavam os pavilhões e
  uma via asfaltada ampla, a **Radial**, ligava os blocos. A entrada dos pavimentos usava
  gaiolas de duas portas junto às escadas. Fonte descritiva contemporânea ao recorte:
  [Estação Carandiru, 1999](https://copyfight.noblogs.org/gallery/5220/Drauzio%2BVarella%2B-%2BEsta%C3%A7%C3%A3o%2BCarandiru.pdf),
  pp. 15–20.
- A Divinéia era um pátio amplo em forma de funil entre a entrada e os pavilhões. O
  Pavilhão 6 ficava em posição central; 2, 5 e 8 se alinhavam de um lado, e 4, 7 e 9 do
  outro. O mesmo relato registra bosque, caminho asfaltado, jardim e fonte nesse espaço,
  além de quadra e campo junto aos blocos.
- O Pavilhão 6 concentrava cozinha geral, auditório/cinema, administração e galerias de
  celas nos pavimentos superiores. O Pavilhão 7 reunia oficinas e trabalho. Fonte:
  [Cadernos PROARQ 11, UFRJ](https://cadernos.proarq.fau.ufrj.br/public/docs/cadernosproarq11.pdf),
  pp. 68–70.
- O valor arquitetônico reconhecido oficialmente inclui muralha, torres de controle,
  portal, edifício administrativo, pavilhões, oficinas, cozinha, lavanderia e sistema de
  circulação. Fonte: [Resolução Conpresp 38/2018, consolidada em
  2020](https://legislacao.prefeitura.sp.gov.br/resolucao-secretaria-municipal-de-cultura-smc-conpresp-38-de-18-de-marco-de-2019).
- O acervo do Museu Penitenciário Paulista guarda cerca de 2.600 fotografias e objetos
  ligados ao cotidiano prisional. Uma etapa futura de fidelidade deve consultar esse
  acervo, sem tratar imagens traumáticas como textura. Fonte: [Tempo/Scielo](https://www.scielo.br/j/tem/a/vGCjxkSVpLkbnV9YxSkC5gP/?lang=pt).
- Fotografias de imprensa de 1992 mostram uma perua policial cinza, de desenho quadrado,
  diante do pórtico. Isso sustenta uma viatura brasileira de fim dos anos 1980/início dos
  1990 como marco de entrada; o modelo exato não foi confirmado. Referência visual:
  [acervo fotográfico publicado pela Jovem Pan](https://jovempan.com.br/noticias/brasil/stj-anula-decisao-e-restabelece-condenacoes-de-policiais-pelo-massacre-do-carandiru.html).

## Tradução para a planta jogável

O mapa atual já tem pátio, celas laterais, quatro torres, portão e um bloco central, mas
as escadas superiores são decorativas, a muralha não é uma rota e o pavilhão central é
um colisor sólido. A reautoria deve criar cinco zonas conectadas:

1. **Divinéia/entrada:** funil visual no portão norte, pórtico “CASA DE DETENÇÃO”,
   guaritas e viatura. É o marco do mapa, não um spawn ou corredor sem saída.
2. **Radial:** eixo de chão entre norte e sul com coberturas espaçadas, cruzamentos para
   as alas e leitura longa controlada. Deve ligar o mapa, não dominar todos os spawns.
3. **Pavilhão 6:** bloco central oco e acessível. Térreo com duas passagens, escada, uma
   galeria superior em anel e quatro grupos de janelas para o pátio. A torre/massa central
   deixa de ser obstáculo sólido e vira conflito vertical.
4. **Muralha e guaritas:** passarela contínua interna em ao menos três lados, duas subidas
   simétricas próximas aos flancos dos spawns, acesso real às guaritas e coberturas a cada
   8–12 m. Arame fica no limite externo; nunca atravessa o piso jogável.
5. **Pátios dos pavilhões:** campo/quadra, refeitório e oficinas formam bolsões de combate
   com entradas nas galerias laterais. O pátio aberto permanece, mas deixa de concentrar
   toda a partida.

### Fluxo competitivo

- Cada spawn precisa de três saídas úteis: pátio/Radial, ala de celas e subida para a
  muralha.
- Deve haver pelo menos três rotas independentes entre cada spawn e MID: baixa externa,
  interna pelo Pavilhão 6 e elevada pela muralha.
- Nenhuma guarita pode enxergar mais de dois dos quatro pontos do spawn inimigo.
- As janelas do Pavilhão 6 devem abrir fogo sobre o pátio e a Radial, mas com peitoril,
  mocheta, contracobertura e ao menos duas entradas para impedir uma posição sem resposta.
- A rota elevada deve custar tempo e expor o jogador em cruzamentos; não pode ser um anel
  seguro que contorne o mapa inteiro.
- CTF pode manter os três IDs atuais, mas `MID` deve migrar para o conflito interno/limiar
  do Pavilhão 6 depois que a topologia estiver validada.

## Assets existentes e geração Mint.gg

Já existem quatro assets recuperados do PR #441, com bytes e SHA-256 em
`docs/maps/POLISH-RECOVERY-ASSETS.json`:

- `torre_vigilancia.glb`;
- `bloco_celas.glb`;
- `portao_penitenciaria.glb`;
- `guarita_muro.glb`.

Eles devem continuar como acabamento visual. Colisão, escadas, pisos, vãos e navegação
ficam em geometria determinística do mapa; um GLB gerado não pode definir sozinho uma
rota competitiva.

Gerar no Mint.gg somente o que falta:

| Asset | Prompt de produção | Contrato |
|---|---|---|
| `carandiru_viatura_1990.glb` | Perua policial brasileira cinza de fim dos anos 1980/início dos 1990, carroceria quadrada, para-choques simples, giroflex baixo, uso severo, sem SUV moderno, sem pessoas e sem copiar número ou brasão de uma foto específica. | Até 8 mil triângulos, uma textura PBR WebP 1024, rodas fixas, origem no centro do piso; colisor simples separado no mapa. |
| `carandiru_galeria_baia.glb` | Módulo de fachada prisional brasileira dos anos 1950 já envelhecida nos anos 1990: concreto cinza, vão profundo, grade de aço, peitoril, passarela e guarda-corpo. Um único vão modular, frontal e sem fundo fechado. | Até 4 mil triângulos, dimensões declaradas, sem colisão embutida; repetição via instancing. |
| `carandiru_portico_1990.glb` | Pórtico institucional brasileiro de concreto do meio do século XX com inscrição CASA DE DETENÇÃO em letras pretas, portão metálico e guaritas laterais; aparência usada, sem cena de violência. | Até 10 mil triângulos, texto legível a 20 m, material único ou atlas 1024; manter abertura compatível com o vão existente. |
| `carandiru_escada_servico.glb` | Escada metálica de manutenção prisional, anos 1970–1990, degraus vazados, patamar e guarda-corpo industrial gasto. | Acabamento sobre rampa/cápsula procedural; até 4 mil triângulos e módulo espelhável. |

Para cada geração registrar projeto, pack, run, prompt, licença, bytes, triângulos,
texturas, SHA-256 e imagem de referência usada apenas como direção. Se o Mint não produzir
um asset que respeite escala e silhueta, manter o blockout e rejeitar o GLB.

## Régua antes da implementação

Criar `tools/eval/carandiru-jogabilidade-check.mjs` antes de editar o mapa:

- **CAR1:** nome exibido `Carandiru`; ID técnico permanece `penitenciaria`.
- **CAR2:** cápsula humana chega aos dois acessos da muralha, percorre a passarela e entra
  em pelo menos duas guaritas.
- **CAR3:** Pavilhão 6 tem duas passagens térreas, uma escada funcional, galeria superior
  conectada e quatro posições de janela com cobertura.
- **CAR4:** três rotas independentes spawn→MID e spawn→spawn; nenhuma carroceria, escada
  ou prop reduz a largura livre abaixo do contrato humano.
- **CAR5:** matriz de LOS prova proteção inicial: cada guarita vê no máximo 2/4 pontos do
  spawn inimigo e existe contrafogo de pelo menos duas rotas.
- **CAR6:** ao menos 90% da rota elevada tem piso contínuo e altura livre; arame e grades
  não atravessam a cápsula.
- **CAR7:** viatura Mint carregada no navegador e fallback/colisor preservados no arnês.
- **CAR8:** 5x5 e 8x8 mantêm custo no máximo 15% acima do baseline do #541. Referência
  provisória: 769,5 calls/quadro em med e 464 em low; qualquer teto final nasce de nova
  medição, nunca de arredondamento conveniente.

Mutantes obrigatórios: `muro-sem-acesso`, `guarita-fechada`, `pavilhao-solido`,
`escada-decorativa`, `spawn-exposto`, `arame-na-passarela`, `viatura-procedural` e
`rota-unica`. Cada mutante deve reprovar somente sua cláusula.

## Entrega e aceite

Produzir em quatro checkpoints testáveis:

1. **C1 — nome, régua e blockout:** mapa ainda feio, mas muralha, guaritas e Pavilhão 6
   já percorríveis com cápsula real.
2. **C2 — combate:** waypoints, spawns, CTF, LOS e coberturas fechados; teste 5x5/8x8.
3. **C3 — identidade:** portal, galerias, viatura Mint, materiais e iluminação integrados
   com proveniência.
4. **C4 — aceite:** capturas reais 1200×800 em 3:2 de Divinéia, Radial, galeria, muralha,
   guarita e pátio; vídeo curto percorrendo as três rotas; crítico independente e teste
   humano do dono.

Não chamar de final por gates Node. A etapa só termina depois do jogo real, captura 3:2,
8x8 e aprovação visual/jogável humana.
