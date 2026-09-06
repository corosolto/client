# Sertão — céu e iluminação

Branch `codex/sertao-astra`, baseline `49441895bebdfa328a228de142d0015b4597db9f`. Esta frente altera apenas `LOOK.velho_oeste`, o suporte opcional de céu em `map_sky.js` e `eval:look`. Continuação geral: [SERTAO-CONTINUACAO.md](SERTAO-CONTINUACAO.md). Referências e limites: [SERTAO-REFERENCIAS.md](SERTAO-REFERENCIAS.md).

## Baseline inspecionado antes da correção

Foram vistos os frames reais `artifacts/sertao-astra/before/forro.png` e `before/praca.png`. O primeiro tem uma emenda vertical abrupta aproximadamente em x=1165; ambos mostram céu e terreno quase inteiramente laranja, com sombra marrom escura. Os frames têm 1536×1024 pixels. A régua anterior `node tools/eval/look-check.mjs` passou 4/4 com ΔE76=0: ela validava a coincidência da mediana do horizonte e fog, não continuidade nem direção visual.

`python3 tools/eval/look-horizonte.py public/img/textures/sky_sertao.webp` mediu horizonte `#a6794d` (banda y=429..440, 19596 amostras) e zênite `#676f72`. No WEBP 1774×887, comparar x=0 e x=1773 em y=0..442 produziu erro absoluto mediano RGB `[8,17,16]`. Reproduzível:

```python
from PIL import Image
import numpy as np
im = np.asarray(Image.open('public/img/textures/sky_sertao.webp').convert('RGB'), float)
print(np.median(np.abs(im[:im.shape[0]//2, 0] - im[:im.shape[0]//2, -1]), axis=0))
```

A nova régua foi rodada antes de substituir o céu, com instrumentação de origem webp: resultado **3/4**, recusando o Sertão por ainda usar panorama sem contrato de continuidade. Não foi alterado o teto ΔE76≤8 preexistente. Essa reprovação impõe a nova fonte mensurável; o erro da emenda antiga é a medição independente acima, não uma alegação de julgamento visual automatizado.

## Implementação e decisões

O Sertão agora cria uma DataTexture equiretangular RGBA sRGB de 1024×512 (2 MiB), disponível no browser e no harness. O gradiente é analítico, calculado por latitude e produto escalar da direção com o sol: topo azul acinzentado, horizonte areia clara e halo largo discreto na direção do sol. Os extremos da textura representam a mesma longitude; seu erro deve ser exatamente zero, identidade matemática e não um teto artístico inventado. O horizonte tem uma pequena faixa constante para fazer a névoa encontrar o céu sem salto. A banda efetivamente criada é lida por `eval:look`, não inferida do LOOK.

A cor do sol foi suavizada e o hemisfério recebeu luz mais neutra, preservando a posição exata do sol e sua intensidade direta. Não houve mudança de exposição, bloom global, densidade do fog, geometria, colisores ou spawns nesta frente. As cores são hipótese de direção de arte para inspeção A/B; não são alegadas como pixels medidos de uma foto de referência.

O caminho procedural elimina `scene.userData.skyUrl` e registra `skySource.kind=procedural`. Não se usa o antigo WEBP como evidência da nova imagem. Os demais mapas continuam com seu caminho webp. `eval:look` recusa origem desconhecida, modelo desconhecido, skyUrl obsoleto no procedural, textura ausente, formato/mapping/orientação/dimensões inválidos. O caminho webp ainda mede o arquivo solicitado; não comprova download ou fallback do browser, limite anterior explicitado na docstring.

A primeira geração medida isoladamente custava 327–360 ms. Uma tabela de conversão linear→sRGB e longitudes pré-calculadas reduziu três execuções de `applyLook(new THREE.Scene(), null, 'velho_oeste', {nofog:true})` a **27,35 / 19,69 / 22,78 ms** no Node desta máquina. Não é orçamento de GPU/browser. A tabela tem 4097 entradas e quantiza a conversão antes do armazenamento sRGB de oito bits.

## Validação e mutações

Após a implementação, `node tools/eval/look-check.mjs` mediu **4/4**, todos ΔE76=0, Sertão horizonte/fog `#c7b59b`, costura **0 níveis sRGB**. Os panoramas dos outros mapas mantiveram suas medianas anteriores.

| Comando | Observação real | Resultado |
|---|---|---|
| `node tools/eval/look-check.mjs --mutante=fog` | Sertão ΔE76=17,3; demais também acima do teto | Mutação reprovada |
| `node tools/eval/look-check.mjs --mutante=ceu` | Muda os bytes da textura usada para magenta; horizonte `#ff00ff`, ΔE76=123,5 | Mutação reprovada |
| `node tools/eval/look-check.mjs --mutante=costura` | Muda somente a primeira coluna do hemisfério superior; erro=143 níveis, fog/horizonte continua ΔE0 | Mutação reprovada |
| `node tools/eval/look-check.mjs --mutante=ceu-ausente` | Remove `scene.background`; a leitura da DataTexture falha | Mutação reprovada |

As mutações exigem mudança efetiva e operam na cena em memória. Não deixam alterações persistentes. O retorno zero nos modos mutantes significa que a régua detectou a quebra.

## Pendente

Captura A/B do jogo real, avaliação adversarial de sombras, bandas e leitura da iluminação ficam com o agente responsável pelo browser. Esta frente não atribui nota nem declara aprovação visual. Nenhum commit foi criado nesta subtarefa.

## Compatibilidade ST3 e significado ST4/ST6

A revisão posterior reproduziu uma incompatibilidade na régua antiga do Sertão: **somente ST3** falhava com o novo céu (R−B=44). O piso antigo R−B≥60 vinha do próprio fog laranja anterior, não de uma referência fotográfica; os frames `before/forro.png` e `before/praca.png` mostraram por que premiar essa saturação perpetuava o defeito.

Por instrução explícita do responsável pela tarefa, ST3 passa a testar a direção cromática quente **R>G>B**, sem substituí-la por outro piso numérico escolhido para a nova cor. Elevação máxima do sol e densidade máxima da névoa mantêm seus limites anteriores. O casamento com o horizonte realmente desenhado continua exclusivamente no `eval:look`, com seu teto ΔE76 intacto.

As fotografias identificadas de Catimbau e Fazenda Colônia na [ficha de referências](SERTAO-REFERENCIAS.md) orientam a comparação entre céu azul, solo e paredes separados. A ficha ainda registra ausência de inspeção de seus pixels: portanto a proposta de azul acinzentado é direção visual a conferir pelo responsável pelo browser, não cor extraída dessas fotos nem alegação de aprovação fotográfica.

`node tools/eval/sertao-check.mjs` passou as seis cláusulas: fog RGB 199/181/155, sol 21,8°, densidade 0,0056. `--mutante=ceu-frio` aplica azul RGB 159/184/204 na névoa real, verifica que a cor mudou e reprova **somente ST3**; as outras cinco permanecem verdes. A mutação assim mantém a prova isolada da cláusula.

Os textos ST4/ST6 agora distinguem acervo GLB cadastrado de corpo visual efetivamente renderizado. A família `paupique` pode conservar seu registro no acervo e usar corpo sólido autoral `casaProxy`; existência/preload do modelo aberto não provam que ele aparece no frame. Não foram alterados contagem mínima, diversidade, dominância nem verificadores dessas duas cláusulas. A substituição visual e a auditoria de geometria pertencem ao responsável pelo mapa. **Aprovação visual final continua pendente.**

## Régua legacy OE2/OE8/OE9 — revisão autorizada em 06/09

A instrução do responsável pelo mapa removeu a exigência western obsoleta de tumbleweeds com colisão e substituiu a microvida por tecidos oscilantes no forró. Antes de atualizar a régua, `node tools/eval/velho-oeste-check.mjs` reprovou **OE2 e OE8**, ambas exigindo tumbleweeds; as outras sete cláusulas passaram, inclusive o teste de corpo real em dez postes.

OE2 agora observa `rotation.x` dos objetos `tecido-forro-*` em `world.update(0,0)` e `world.update(0.9,4.7)`. Exige pelo menos três com variação maior que 0,01 rad. O valor é um limiar operacional de detecção de animação pedido nesta revisão, não um número extraído de fotografia nem garantia visual. Foram observados **6/7 tecidos** acima dele; o menor delta entre todos foi 0,007 rad, um tecido próximo de retornar à mesma fase. O contrato dos três calangos foi preservado: rajada mínima observada 1,33 m e parada confirmada pelo mesmo teste anterior.

OE8 exige ausência de tumbleweeds e igualdade exata da serialização JSON de `world.colliders` antes/depois dessa atualização. Foram observados **zero tumbleweeds e 108 colisores inalterados**. O mutante `colisao-movel` substitui o antigo `sem-colisao-movel`: ele envolve o `world.update` real e desloca um colisor existente, confirmando que o snapshot mudou. OE9 preserva o piso de oito e a chamada real `Game._collide` nos postes `varanda-*`; **10/8** bloquearam o corpo.

`parada` agora substitui `world.update` por uma função vazia no mundo e mede a consequência nos tecidos; não adultera o vetor de resultados. Produziu **0/7** tecidos movendo e somente OE2 vermelha. `colisao-movel` deixou o movimento visual intacto e produziu somente OE8 vermelha.

Verificados os dez mutantes da régua: `sem-casas`→OE1, `centro-aberto`→OE1, `obstaculos-sem-nome`→OE6, `parada`→OE2, `calango-morto`→OE2, `sem-ctf`→OE3, `rota-cortada`→OE4, `texturas-genericas`→OE5, `colisao-movel`→OE8 e `sem-colisao-varanda`→OE9. Todos reprovaram apenas a cláusula esperada. Estado normal: **9/9**. Sintaxe e `git diff --check` passaram. Sem commit ou browser nesta frente; esta régua não substitui a aprovação visual final, que permanece com o responsável pelas capturas.
