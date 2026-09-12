# Escadão R3: rua, vegetação e fiação

## Resultado

A rua recebeu três volumes residenciais sobre a laje existente, com alturas de
2,85 a 3,35 m. Duas alas usam a casa gerada nesta rodada no Mint; o volume central
mantém reboco e janelas domésticas. A passagem sob a laje e os quatro pilares
permanecem. Os novos volumes têm colisão fechada e oclusão pela malha real.

As plantas facetadas foram substituídas por seis samambaias Mint do acervo,
apoiadas em prateleiras. Quinze tufos de grama Mint existente ocupam bordas dos
degraus e encontros com paredes na qualidade alta; dez na baixa. Os 28 ramais
elétricos têm curvatura e ancoragem em fachadas ou postes. Trechos distantes usam
linhas de um pixel para reduzir a fragmentação observada na revisão anterior.

O crítico independente aprovou escala residencial, apoio dos vasos, grama nas
bordas, terminações dos cabos e leitura do adversário. Há serrilhado leve em fios
distantes, aceito nessa revisão. Essa aprovação é visual, não de desempenho.

## Mint e candidatos rejeitados

Projeto: <https://mint.gg/project/zd72r64gkq3d9k3v8349cp6yt98dwvx4>.
O login foi concluído e dois GLBs foram gerados com a franquia existente, sem
compra ou upgrade. A casa integrada tem 4.146 triângulos, um material, três mapas
WebP de 1024 pixels e 403.196 bytes. SHA256:
`9bceba38acb38726b1df871b4a22697d5cb988f10e6cde13a972bdbf4eeb3a4b`.

O mato novo foi rejeitado: original e candidatos corrigidos apresentavam manchas
triangulares nas folhas. Permanece apenas nos artefatos privados. As plantas
reutilizadas não tiveram seus arquivos alterados. Proveniência, termos e processo
estão em [ESCADAO-MINT-R3.md](ESCADAO-MINT-R3.md), `mint-assets.json` e
`public/models/props/FONTE.md`.

O primeiro candidato também falhou com 22 interseções de folhas no corpo. As
prateleiras afetadas foram elevadas antes da validação final. Não houve exclusão
da vegetação da régua física. Pontas de cabos sem apoio receberam postes.

## Evidência final

Worktree: `/Users/ruben/csbrasil/worktrees/escadao-visual`, branch
`codex/escadao-visual`. Baseline R2: `45e0a29f98b2c0192f08e8e17df3715c8efa90a5`.
Implementação R3: `e0be5162`. Todos os recibos abaixo estão sob
`artifacts/escadao-visual/refinement-r3/`.

| Verificação | Resultado | Recibo |
|---|---|---|
| A/B no jogo real | 13 pares, 1536 × 1024, FOV 70, qualidade alta; mesma fixture | `comparison-final/` |
| Corpo e linha de visão | 8/8 | `runtime-final/runtime.json` |
| Anéis | 3/3 | `ring-final/runtime.json` |
| Subida e retorno com KeyW | PASS, 875 posições finitas, topo em y = 6,12 m | `motion-final/after/motion.json` |
| Mutações causais | 13/13 detectadas | `mutants/runs.json` |
| Contratos e checks locais | 17/17, incluindo mapa, rotas, fachada, GLB e grafite | `node-final/runs.json` |
| Revisão visual independente | Aprovada, com serrilhado distante residual | `independent-review.txt` |
| Build | Aprovado | `build-final.log` |
| Documentação, arquitetura e comentários | DOCS1, ARCH1 e COMENTARIO aprovados | `closing-checks.json` |

O arnês aguarda o arsenal GLB completo e fixa disposição de itens e placar em
ambos os lados da comparação. Remove halos de bots ocultos. Cancelamentos dos
dois wallpapers do menu só são recuperados após decodificação explícita e
registro de suas dimensões; falhas de assets do jogo continuam reprovando.

Builder SHA256:
`4d71b860b9c820b199f7845ecf83dd990a78e4cee3b0c8b994e220521b196d12`.
Layout de grafite SHA256:
`0223f92b48e6f18d57481a86f2df874921428cc0f5991306f4014bf5b6e1706f`.
`game.js`, `mapprops.js`, `ambientlife.js` e `glbchars.js` permanecem intactos;
seus hashes estão em `delivery-summary.json`.

## Custo e pendências

Contadores do renderizador, incluindo passes da cena e personagens, em cinco
frames por vista. Eles não medem FPS nem demonstram aprovação de desempenho.

| Vista | Chamadas antes → depois | Triângulos antes → depois |
|---|---:|---:|
| Subida | 1.169 → 1.200 | 1.082.991 → 1.164.763 |
| Rua | 1.304 → 1.342 | 1.083.559 → 1.205.249 |
| Mirante | 1.202 → 1.232 | 1.054.534 → 1.171.994 |
| Comércio | 744 → 751 | 923.899 → 960.137 |

O detalhamento aumentou o custo geométrico. FPS segue pendente de janela exclusiva
de GPU. AM7 continua pendente herdado: a fauna permanece idêntica na comparação,
com 11 animais, 25 malhas e 41.568 triângulos. Esta rodada não repetiu a suíte
completa de fauna nem declara esse orçamento aprovado.

Galeria local: <http://127.0.0.1:58555/gallery.html>, 13 pares sem divergência de
câmera; versão anterior preservada em `references-r2/gallery-r2.html`. Vídeo de
18,24 segundos em `motion-final/after/movement.webm`, incluindo carregamento e
percurso. Imagens dos extremos em `motion-top.png` e `motion-return.png`.

Não houve push, merge ou deploy. Permanecem para a próxima etapa a avaliação do
usuário, medição exclusiva de FPS, resolução do orçamento AM7 e integração do PR.
