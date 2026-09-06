# Sertão: casas jogáveis da praça e pôr do sol

## Escopo

Mudança isolada em `velho_oeste` (Sertão). Não muda mecânica de arma, runtime compartilhado, materiais compartilhados nem outro mapa.

## Diagnóstico

As casas que já existiam no arraial são `sertao-casa-*`: cada uma registra um colisor único que ocupa toda a planta. Elas funcionam como fachadas/cobertura externa e não oferecem rota interna. A régua espacial anterior provava três rotas entre bases, mas não provava entrada em uma casa ou tiro através de janela.

A captura do jogador reporta um ponto inacessível, mas não contém coordenada, cursor ou identificador do objeto. A grade de rotas atual não aponta uma ruptura E→B: depois da mudança, `SP4` mantém três rotas disjuntas. Esta entrega resolve a ausência estrutural de interiores na praça; não declara que identificou a coordenada exata da captura sem uma reprodução localizada.

## Produção

- Duas casas autorais no setor norte da Praça da Matriz: `sertao-praca-casa-interior-0/1`.
- Cada casa tem entrada sul de 1,9 m, interior, janela norte voltada à rota do Forró e janelas laterais. Paredes e vãos têm colisores separados; não há caixa invisível fechando o interior.
- O tom do horizonte/fog específico de `velho_oeste` passou de `#c7b59b` para `#d7a477`. O fog continua derivado da mesma cor do horizonte (ΔE76=0), preservando a transição e o contraste técnico de leitura.
- `eval:sertao-interiors` passa a provar a rota cápsula de fora da porta ao centro e o raycast limpo pelo vão da janela. O mutante `fechar-porta` derruba somente `IN1`.

## Evidências executadas

- `npm run eval:sertao-interiors` → `IN1/IN2` verdes; duas entradas com deslocamento máximo `0` e duas janelas sem hit.
- `npm run eval:sertao-interiors -- --mutante=fechar-porta` → somente `IN1` vermelho, deslocamento máximo `0.38` na primeira porta.
- `node tools/eval/sertao-spatial-check.mjs --self-test` → `SP1–SP9` verdes e 14 mutantes mordidos; `SP4` preserva 385 nós e três rotas disjuntas.
- Mutantes selecionados de identidade e gameplay: `ceu-frio→ST3`, `sem-sertao→ST1`, `sem-igrejinha→ST4`, `rota-cortada→OESTE4`, `sem-ctf→OESTE3`, `sem-colisao-varanda→OESTE9`.
- `npm run eval:sertao-sky-lifecycle` → `SK1/SK2` verdes.

## Limitações para revisão

Não foi aberto navegador por restrição desta frente. Ainda falta captura WebGL 3:2 e revisão humana para confirmar que o novo laranja mantém silhuetas de inimigos legíveis na Praça e que a coordenada exata do relato de inacessibilidade não é outro ponto do mapa. `node tools/eval/look-check.mjs` continua com falha herdada: o assado de `sky_amazonia.webp` está ausente/desatualizado; os três pares fog/horizonte medidos, inclusive Sertão, ficam em ΔE76=0.
