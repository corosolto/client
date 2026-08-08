<!-- spec:mapa -->
# 10 — Lajes

Comunidade carioca em duas camadas: **lajes em cima, becos embaixo**. Um time
nasce nas lajes e se move pulando de telhado em telhado (ou desce pelas
escadas); o outro nasce nos becos e domina o nível da rua. O mapa é a luta
pela vertical: quem está em cima vê longe mas se expõe; quem está embaixo tem
cover mas não vê nada.

## Local real

Lajes e becos de comunidade do Rio (referência visual: Rocinha, Vidigal,
Providência — genérico, sem copiar endereço real). Textura do lugar: caixa
d'água preta, varal, mureta baixa, tijolo aparente, reboco pela metade,
antena de TV, fio de poste cruzando o beco, grafite nas paredes. Já existe
acervo no repo em `references/favela/` — começar por lá antes de buscar fora.

## Layout

- **Camada superior (lajes):** platô contínuo de telhados com vãos puláveis
  entre prédios (1,2–1,8 m — pulo comum alcança, pulo agachado garante).
  2–3 rotas de laje, com 1–2 pontos onde o vão é maior (risco/recompensa).
- **Camada inferior (becos):** malha de vielas estreitas (1,5–2,5 m) com
  curvas em L — quase nenhuma linha reta longa.
- **Conexões:** 3–4 escadas/escadinhas entre as camadas, mais 1–2 rotas de
  "subida por dentro" (cômodo com escada). Escada é o ponto de estrangulamento
  do mapa — posições de escada têm que ser contestáveis dos dois lados.
- **Spawns:** Time A em laje no extremo norte (alto); Time B em beco no
  extremo sul (baixo). Distância de contato inicial simétrica em tempo, não
  em metros — quem desce anda menos, quem pula laje chega antes mas aparece.

## Cobertura (cover)

- **Lajes:** caixas d'água (cover alto), muretas de 1 m (cover agachado),
  varais e antenas (ruído visual, não cover), barraco de obra.
- **Becos:** portas reentrantes, janelas, carro velho, barraquinha de lanche,
  caçamba, motos encostadas.
- **Regra:** nenhum trecho de beco com mais de ~15 m sem cover; nenhuma laje
  com mais de ~10 m de exposição sem caixa d'água ou mureta.

## Linhas de visão

- **Becos:** curtas por desenho (curvas em L a cada 10–20 m) — combate de
  esquina, SMG e escopeta.
- **Lajes:** médias (20–40 m) picadas pelas diferenças de altura entre
  prédios — rifle domina.
- **Vertical:** quem está na laje enxerga trechos de beco nos cruzamentos;
  quem está no beco enxerga silhueta de laje contra o céu. Nenhuma linha de
  visão de ponta a ponta do mapa.

## Referências

- `references/favela/` (acervo local — usar primeiro).
- Pesquisa complementar: fotos aéreas de lajes (densidade, vãos), becos com
  fios cruzados, caixas d'água pretas em fileira. Toda imagem nova entra com
  `FONTE.md` (portão 2 da csbrasil).

## Régua de aceite

- Todo vão entre lajes pulável com pulo comum: medir distância máxima no
  harness (reprovar se > 1,8 m sem aviso visual de "vão grande").
- Spawn settle já coberto por `eval:spawn` — ninguém nasce no ar nem cai de
  laje no spawn.
- Nenhum pixel de parede pelada além do teto vigente do `eval:grafite` —
  beco de comunidade sem grafite é cenário de filme americano.
- Screenshot dos dois níveis + descrição do que se vê (portão 4) e nota do
  crítico adversarial (portão 5) antes de marcar como pronto.
