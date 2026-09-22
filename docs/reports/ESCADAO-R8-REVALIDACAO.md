# Escadão R8 — revalidação contra `main`

Data: 22/09/2026. PR: #567. Branch: `codex/escadao-r6-stack`.

## Objetivo e estado

Revalidar o Escadão atual sem reaplicar a geometria antiga do PR. O histórico do PR foi preservado por merge de `origin/main` (`7bb2707ef576260b30ceb88c5973b9f6618684cd`), e a árvore do jogo ficou igual à `main` atual. O único delta de código desta rodada está nos próprios harnesses: eles voltaram a reconhecer a declaração atual do ponto CTF e o submenu atual de Single Player.

**Resultado:** a casa central, as casas do mirante e os pontos de conflito passam nos contratos físicos e nas capturas reais. A frente ainda não está pronta para merge: há dois vermelhos de bots acima do teto documentado e o checkout público não contém 32 decalques requisitados pelo mapa, impedindo um gate visual local sem 404.

## Espaço jogável confirmado

- Casa central: piso contínuo em 60 células, janela para a escada, janela oposta para a rua/respawn, tiro e revide reais, entrada e retorno físicos, rota de bot com 24 nós.
- Casa frontal: janelas opostas e rota de bot com 23 nós; todas as posições internas testadas bloqueiam linha direta aos slots de nascimento.
- Mirante/respawn superior: duas entradas independentes no abrigo central, acesso pelos dois flancos, casas laterais alcançáveis, janelas de contrajogo e retorno ao time de cima.
- Escadas e conflito: 10/10 lances levam a destino; 669/669 nós conectados; oito rotas para a Deagle; três rotas espaciais e pelo menos duas interrupções por observador alto.
- Runtime WebGL EV0–EV7: 12/12 subidas e retornos, 134/134 visitas com retorno, zero colisões de cabeça, zero amostras sem piso, 21 contatos sem travamento, zero LOS spawn×spawn/flanco e zero LOS alto→spawn.

## Gates e mutantes

Baselines Node verdes: `escadao-contract`, `rota`, `facade`, `graph`, `home`, `conflict-home`, `casa-central`, `casas-conflito`, `mirante-abrigo`, `structure`, `descent`, `details`, `mapcontrato` e `quality-mapas` (14/14 executáveis sem navegador).

Mutantes Node: 27/27 detectados. Isso inclui janela traseira vedada, janela da escada vedada, janela oposta vedada, piso reaberto, acesso superior removido, porta lateral do mirante fechada, saídas seladas, ombreiras/fundo removidos, escada morta, abrigo removido, grafo impossível, guarda ausente e orçamento de sombra literal.

WebGL real:

- EV0–EV7: 8/8 verdes.
- Mutantes `varal-na-rota`, `escada-bloqueada` e `sem-abrigo`: 3/3 mordidos.
- Anel CTF: quatro pontos entre 0,084 e 0,156 m do piso, faixa de ~0,073 m e raio 4,5 m; mutantes plano, enterrado e colapsado: 3/3 mordidos.
- `eval:webgl`: verde.
- Fluxo do menu atual chega ao jogo e movimenta o jogador; o gate termina vermelho somente ao exigir zero assets 404, pelos 32 decalques ausentes detalhados abaixo.

Evidência local ignorada pelo Git:

- `artifacts/escadao-r8/browser/r4-contact-sheet.jpg` — SHA-256 `804eae6a877f3b1ab290c022ba4e07d24ee5e5515feb56c662b30b4195c13c03` (1536×1024, 3:2).
- `artifacts/escadao-r8/browser/r4-169-contact-sheet.jpg` — SHA-256 `97baa31e842dbf4665dddbf6d9240923886710f47f3ee240ce642decf52ecff3` (1600×900, 16:9).
- `artifacts/escadao-r8/browser/runtime-fixed/runtime.json` — SHA-256 `c50db2f83080d16c599c4a46fb619eabf94cf925f32fbe84b90e6a5114f6d5f0`.
- `artifacts/escadao-r8/browser/ring/runtime.json` — SHA-256 `9aef309b1c6e7bcb0d085bb8a09911fce5e4d834d89adeefb0c2a8ca6a26f47c`.

## Carga 5×5 e 8×8

`botsim` padrão: 60 s, nove sementes, código real do jogo.

| modo | time | bots | stuck | spinRoam | eficiência | estado |
|---|---:|---:|---:|---:|---:|---|
| DM | 5×5 | 9 | 2,533% | 0,058 | 0,140 | verde |
| DM | 8×8 | 15 | **4,011%** | 0,050 | 0,135 | vermelho por 0,011 p.p. |
| CTF | 5×5 | 9 | **4,378%** | 0,088 | 0,193 | vermelho por 0,378 p.p. |
| CTF | 8×8 | 15 | 2,622% | 0,049 | 0,140 | verde |

O teto do projeto é `stuck ≤ 4%`. Nenhuma mudança de runtime foi feita nesta lane; esses dois casos ficam como bloqueio para a frente de bots/navegação.

## Performance e orçamento visual

`quality-mapas` passou 4/4 e o mutante que recoloca sombra 2048 literal foi detectado. Em Chrome headless/WebGL2, CTF 8×8 em qualidade alta completou 570 quadros úteis em ambos os aspectos: agendamento médio 8,332 ms (3:2) e 8,450 ms (16:9), p95 10 ms. Isso prova boot/render e ausência de `pageerror`; não aprova FPS de GPU real: o renderer foi reportado genericamente como `WebKit WebGL`, e a fotografia final encontrou zero bots em movimento no instante da amostra. O playtest humano continua obrigatório.

## Bloqueios locais e escopo preservado

O mapa requisita 32 PNGs de decalque que não existem em `origin/main`; o servidor devolve 404 para todos. O áudio local também não tem manifestos/pacote opcional. As capturas são válidas para geometria, acesso, janelas e enquadramento, mas não são uma reprodução visual completa da publicação. Nenhum asset ausente, privado ou Mint foi copiado para esta branch.

Nenhum runtime, material compartilhado ou asset foi alterado nesta rodada. A atualização da branch mantém a implementação atual da `main`; as mudanças novas são este relatório e dois reparos nos gates do Escadão.

## Teste humano pedido

Servidor: `http://127.0.0.1:8148/?debug=1&map=escadao&auto=B,sertanejo&ctf=1`

Revisar em 3:2 e 16:9:

1. entrar na casa central pela lateral e verificar janela para a escada e janela oposta para a rua;
2. nascer no alto, entrar nas duas casas do mirante pelas laterais e confirmar que as janelas dão contrajogo sem ler o spawn;
3. disputar os três lances, a casa central e o abrigo do mirante em 5×5;
4. repetir DM 8×8 e CTF 5×5 procurando bots parados, os dois casos vermelhos da simulação;
5. decidir se a arquitetura e os pontos de conflito estão aprovados visualmente. A ausência dos decalques deve ser tratada separadamente, sem mascarar a revisão física.
