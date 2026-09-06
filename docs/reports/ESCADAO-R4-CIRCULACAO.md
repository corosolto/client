# Escadão R4 — circulação, casa e modelos Mint

O relato de 06/09 reabriu a entrega visual: o usuário mostrou pisos vistos por baixo, objetos aparentemente suspensos, passagens pouco claras e o gato cúbico. Pediu escadas mais íngremes, becos jogáveis e acesso à casa frontal com uma janela para atirar. A direção de jogabilidade existente foi preservada.

Trabalho local em `codex/escadao-main`, com a main `2786fa48` (alpha.226), incluindo a integração de Lajes. A branch visual anterior continua preservada. O servidor de teste é `http://127.0.0.1:8148/`; a galeria na porta 58555 é histórica, da R3. O usuário autorizou push/PR/merge em 06/09; os recibos de integração ficam no ledger.

## Mudanças

- O topo ganhou massa de terreno e os degraus ganharam fechamento inferior. Eles deixam de funcionar como planos sem espessura vistos por baixo.
- O espelho passou de 17 para 21 cm, mantendo piso de 29 cm e a implantação horizontal. Os lances chegam a 35,9°, com patamares em 2,52, 5,04 e 7,56 m.
- Varais do mirante foram colocados em telhados. As alturas das samambaias centrais passam a acompanhar o piso. A margem física dos beirais acompanha sua geometria chanfrada.
- A casa frontal tem escada lateral, porta aberta, interior e janela com peitoril. A janela cobre a conexão leste do primeiro patamar; não oferece visão panorâmica dos spawns.
- O grafo inclui a casa e impede atalhos pela quina da porta ou pelas laterais elevadas da escada. Um vazio sem saída entre as fundações foi fechado fisicamente.
- A descida do jogador acompanha passos de até 30 cm, somente no opt-in do Escadão. Saltos voluntários e quedas maiores continuam livres.
- O gato foi substituído por modelo Mint rajado, com rig e três ciclos. Cadeira, vasos, pano e medidor elétrico completam o conjunto doméstico. A alteração da fauna é restrita ao Escadão.
- As janelas frontais usam material escuro de vidro e ficam excluídas da pintura automática. A laje antiga foi recortada onde havia piso novo, eliminando sobreposição.

## Modelos

Checkpoint dos modelos: `f5180537`. Origem, termos e hashes completos em `mint-assets.json` e `public/models/props/FONTE.md`. Projeto Mint `zd72r64gkq3d9k3v8349cp6yt98dwvx4`, pack `th71b3y03ksncsfj8wzt08w5hh8dxjpk`, run `vd7cw36hdpbv3zxwkt19km2d6h8dwz6j`.

| Modelo | Triângulos | Bytes |
|---|---:|---:|
| Gato | 4.723 | 843.748 |
| Cadeira e vasos | 4.453 | 484.012 |
| Medidor elétrico | 3.470 | 377.552 |

PBR WebP 1024, sem erros no validador Khronos. O gato tem 19 ossos; idle de 4 s, walk de 0,6 s a 0,55 m/s e run de 0,4 s a 1,5 m/s. Altura de referência de 0,48 m. O ciclo inicial de caminhada de 0,8 s foi rejeitado por alongar demais a perna dianteira, apesar de passar no contato dos pés. O gerador agora também verifica alcance anatômico.

A inspeção do GLB reimportado confirma fechamento dos ciclos e contato dos vértices das patas. Isso não equivale a aprovação de todas as transições, curvas e recuperação do controlador durante uma partida. Os recibos `artifacts/escadao-visual/r4/assets/` preservam essas limitações e os avisos do validador.

## Evidência e regressões

- `r4/runtime-delivery`: EV0–EV7 passam; 140 séries finitas, 12 travessias de escada, nenhuma interseção com varal/cabeça nem perda de apoio. Cada lado percorreu 67 destinos e retornou. Não houve visada direta entre spawns ou de áreas elevadas para os spawns.
- `r4/node-final.log`: 13/13 checks passaram, incluindo contrato, rotas, fachada, grafo, casa, massa estrutural, descida, props, cache/shader, menu, sintaxe e golden de movimento.
- Grafo: 394/394 nós alcançáveis, oito rotas de spawn até a Deagle. Rotas: oito destinos úteis e 0/943 visadas elevadas para spawn.
- Casa: 250 posições no motor Node e 249 no navegador, com subida, entrada, aproximação da janela e retorno ao chão. O crítico verificou mais 566 arestas próximas, sem passagem incompatível com o raio físico.
- Janela: olho interno `(6.15,4.37,15.5)` enxerga o alvo alcançável `(6.15,4.02,9)`, a aproximadamente 6,51 m. A régua no navegador também chama o tiro real e exige que ele ultrapasse essa distância.
- Gato: GLB skinned carregado, clips walk/run distintos, caminhada medida a 0,55 m/s e reação de fuga após tiro real. Os detalhes Mint precisam carregar; fallback reprova.

RED e mutações permanecem em `r4/node/`: retirar a massa reabre vazamentos, desligar o snap-down restaura os saltos involuntários, fechar a porta impede a entrada, duplicar o piso restaura a sobreposição e registrar o Group em vez das malhas quebra o raycast não recursivo dos tiros.

As primeiras capturas de `browser-r2` foram rejeitadas: pausar update também suspendia render, conservando um frame do spawn. O instrumento passou a exigir render após alterar a câmera. Em `browser-r3`, o crítico encontrou a sobreposição do piso e dúvidas de enquadramento. Em `browser-final`, confirmou piso corrigido, entrada, janela com alvo visível e gato desobstruído. Essas capturas são cenas controladas do jogo; o personagem na janela foi posicionado para demonstrar a linha de visão.

## Limites preservados

O instrumento antigo MAP3 continua acusando a fórmula normativa de Blondel com o degrau de 21 cm solicitado. MAP1 inclui um cachorro dinâmico na sondagem de arquitetura; a régua de corpo real identifica explicitamente as exclusões de fauna. MAP5 conserva falhas herdadas e alguns cruzamentos do limiar relativo após a mediana mudar com a casa: não houve remoção de props nos quadrantes afetados. A comparação e as áreas navegáveis estão em `r4/node/README.md`; os limites não foram afrouxados.

O interior ainda é simples. A qualidade visual do conjunto melhorou, mas isso não converte automaticamente todo o casario procedural em um cenário fotorealista. AM7 e FPS com GPU exclusiva continuam pendentes. Não foi validada partida multiplayer contra servidor remoto nem feita aprovação competitiva do novo ângulo de tiro.

A atualização final de grafite, mídia da seleção, navegador e build é registrada no ledger `ESCADAO-VISUAL-CONTINUATION.md`; recibos finais ficam sob `artifacts/escadao-visual/r4/`.

## Revisão adversarial antes do merge

A revisão detectou 142 arestas aceitas pelo grafo mas incompatíveis com o corpo real, incluindo uma subida de 6,62 m. O filtro agora verifica toda aresta a cada 15 cm com raio de 38 cm e limite de passo de 30 cm. A conexão externa leste ganhou amostras; centros de linha que entravam 3 cm nos props foram corrigidos pelo raio físico.

O puxadinho oeste foi recuado em x e z: o vão lateral passou de 45 cm para 1,10 m e a passagem dianteira deixou de ser bloqueada. Os pneus saíram do vão. Vazios térreos fechados ganharam fundação; o objetivo PATAMAR 2 conserva x/z, com piso contínuo a 5,04 m conectado à escada auxiliar. Guardas nas bordas impedem a queda em um recuo sem saída.

`graph-ctf-final` confirma453/453nós, zero arestas inválidas e destinos físicos dentro das quatro zonas a partir dos oito spawns. O centro do piso novo também é alcançado diretamente. A checagem de guarda caminha180frames no motor real; o mutante sem-guarda-p2 reproduz a queda. As zonas R/P existentes conservam seus centros geométricos próximos das construções; a prova é de chegada a pontos livres dentro do raio, sem mudar esses objetivos.

A régua de grafo passou a integrar o CI explicitamente. O gate visual registra a branch sem recusar main/detachedHEAD. A captura do preview compara hashes dos corpos HTTP de JS e GLB com o checkout antes e depois da gravação; uma origem divergente deve reprovar.

Há três ratos e três baratas usando os GLBs do acervo, com um novo trajeto de cada espécie junto ao acesso da casa. `browser-main` confirma carregamento, movimento, piso e ausência de colisão; também registra1100posições de subida/retorno no loop normal em `motion-main`. Essa gravação precede o ajuste final do grafo/patamar. `comparison-delivery` é a comparação anterior ao último ajuste; não deve ser apresentada como captura da geometria final.

O build sobre main e check:deploy37/37 passaram antes das correções finais da revisão. Os recibos posteriores com sufixo release são a referência do fechamento, conforme o ledger.
