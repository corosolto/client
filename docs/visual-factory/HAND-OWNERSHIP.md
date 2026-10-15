# Seleção de pesos para novas articulações

Os seletores de palma e de exclusão dos braços no perfil de torso agora incluem descendentes reais dos ossos já reconhecidos. Antes, transferir pesos de Curl para articulações filhas com nomes próprios removia esses vértices da palma e podia admiti-los no torso; o mount da arma mudava apesar de a superfície permanecer na mesma posição.

O helper usa a ancestralidade dos objetos do skeleton, preservando conjuntos legados, thresholds estritos .5/.3, primeira malha, centroid em bind, guarda de alavanca e cache. Ciclo em qualquer cadeia ou identidade duplicada retorna o conjunto legado inteiro. Não se infere anatomia pelo nome do novo osso.

Limite: um acessório ponderado na mesma malha sob Hand também participa da seleção. A fábrica precisa de máscara/linhagem explícita ou malha separada para esses casos. Essa regra não aprova fit, contato, clipping, deformação ou movimento. Nenhum GLB foi substituído nesta camada.

Verificação reproduzível:

```bash
npm run eval:tphandownership
node tools/eval/tp-hand-ownership-check.mjs --mutate=palm
node tools/eval/tp-hand-ownership-check.mjs --mutate=torso
```

O primeiro comando deve passar12/12. Os mutantes devem sair1 com10/12 e11/12, respectivamente, identificando o caller perdido; uma mutação que não encontra seu alvo também falha. O gate importa uma cópia temporária do módulo real, altera apenas imports/exports de inspeção e remove a fixture ao terminar, inclusive em exceção. As malhas são sintéticas: a evidência artística do programa continua separada no ledger de continuação.
