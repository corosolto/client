<!-- spec:mapa -->
# 02 — caca-javaporco-pilotos-arquitetura-20261031

> Lugar aberto sem cover deliberado vira sniper fest. O spec mostra onde o
> jogador se esconde ANTES de qualquer geometria existir.

## Local real

Três ambientes ficcionais definidos pelo dono em31/10/2026: cidade brasileira,
distrito rural e vila de arquitetura portuguesa junto à mata. Sem reprodução de
edifício protegido ou lugar real específico, pessoas, marcas ou gore. A vila
portuguesa é uma decisão artística, não uma alegação de reconstrução histórica.

## Layout

Lote piloto de três estruturas independentes: mercearia aberta da Cidade
Invadida; celeiro com depósito de ração do Distrito Rural; casa portuguesa com
dois pisos da Vila da Mata. Reutilizar os outros assets já catalogados. Cada
estrutura precisa de portas realmente abertas, interior e acesso superior;
prateleiras/sacos de comida são peças removíveis. Os mapas continuam distintos,
com uma linguagem comum de materiais e escala. Esta ficha cobre os pilotos,
não a conclusão dos três mapas.

## Cobertura (cover)

Paredes com aberturas intencionais, escada, piso superior e janelas. Jogadores
conseguem recuar para dentro e alcançar uma posição elevada; boars acessam o
térreo pela porta. Colisão e navegação serão autoradas e testadas no jogo,
separadas das malhas visuais, sem bloquear os vãos.

## Linhas de visão

Janelas de cima permitem observar a rua/pátio. Porta e balcão não fecham a visão
nem toda a passagem do térreo. Telhado removível permite conferir o interior.
As estruturas não definem sozinhas o layout nem autorizam corredores sem cover.

## Referências

Direção do dono em docs/maps/caca-javaporco-direcao-visual.md. Referência visual
comum: docs/maps/arte-javaporcos/conceito-a-aerea.webp, imagem de projeto com
procedência descrita em docs/maps/arte-javaporcos/README.md. Não copiar carros,
armas, javaporcos ou letreiros da imagem: usar somente materialidade/arquitetura.
Registro local em docs/maps/javaporcos-arquitetura-20261031/FONTE.md.
Prompts exatos em docs/maps/javaporcos-arquitetura-20261031/pedidos.json.

## Régua de aceite

Inspecionar imagem real dos resultados e coerência entre os três. Conferir GLB,
materiais, escala, orçamento e vãos antes da integração. Depois exercitar entrada,
escada, piso superior e janela no Game real; capturar em3:2 e submeter ao crítico
independente. Provar mutantes das invariantes afetadas. Nenhum piloto é aprovado
por simples status succeeded no provedor. Teto de geração: Medium, até8.000
créditos por piloto, três solicitações no máximo; não comprar créditos nem fazer
regerações automáticas. Registrar URL e estado de cada solicitação no ledger.
