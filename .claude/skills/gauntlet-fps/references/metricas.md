# Métricas do Gauntlet

Toda afirmação do loop precisa de um número. Estas são as medidas que já provaram valer a pena,
com o motivo de cada uma. PIL está instalado; nada aqui precisa de browser.

## Máscara: o que excluir

Meça sempre **excluindo HUD e céu**, senão o HUD (que é quase preto e quase branco) e o gradiente do
céu dominam a estatística e escondem o cenário.

- HUD: as bordas fixas (topo ~140px, canto inferior esquerdo/direito, radar) — ou, melhor, os pixels
  idênticos entre os 4 ângulos **que estão fora da região do viewmodel**.
- Céu: profundidade ~1.0, ou na prática o que estiver acima da linha do horizonte com saturação baixa
  e luminância alta contínua.

## L\* (CIE) — a medida de valor

sRGB → linear → XYZ → L\*. É perceptual; média de RGB não é e mente em cena escura.

O que olhar e por quê:

| Medida | Alvo | O que denuncia |
|---|---|---|
| L\* médio da cena | 42–52 | fora disso a imagem está sub ou superexposta |
| % pixels em L\* < 3 | 0,5–1,5% | 0% = imagem leitosa sem âncora de preto; >5% = sombra crushada sem informação |
| % pixels em L\* > 97 | 0,2–0,6% | 0% = não existe highlight na imagem inteira |
| p1 / p95 / p99 | p1 em L\* 2–4 | p1 alto = piso de ambiente exagerado |

**Calibre pela média dos 8 frames de cada mapa, nunca pelo frame mais escuro.** Uma rodada calibrou
pelo pior frame e inverteu a ordem entre os mapas — o Piscinão, mapa de praia com céu aberto, virou o
mapa mais escuro do jogo.

## Blocos chapados (critério B6)

Divida o frame em blocos de 16×16 e conte a fração com desvio-padrão de L\* < 2. Nenhuma região maior
que 5% do frame deveria ser chapada.

Foi assim que se provou que o muro da Havan era placeholder puro (95,05% dos blocos) e que o paredão
branco de Brasília ocupava 67,3% do frame sem informação nenhuma. É a medida que pega "superfície com
cor sólida e nenhuma textura" sem depender de olho.

## Contato parede-chão (critério A1)

Nos 15 cm finais da junção, a queda de L\* precisa ser monotônica e ≥ 8. Gradiente zero = o prop
parece adesivo colado. Foi o argumento que justificou escrever SSAO à mão.

## Separação personagem × fundo (critério C1)

ΔL\* entre a silhueta e o fundo local, **medido no pior canto do mapa**, alvo ≥ 20. Medido em 10,8, o
que significa que o inimigo some no cenário — e é por isso que rim light modulado por distância é
requisito, não enfeite. "O mapa está bem iluminado" não passa neste critério.

## Saturação

Média de S (HSV) e % de pixels com S > 0,55. Cenário competitivo fica em S médio 0,10–0,30 com ≤5%
acima de 0,55 — espaço de cor livre para o personagem e para os elementos de gameplay.

Cuidado com o efeito colateral: empurrar exposição para o ombro do AgX **dessatura**. Uma rodada
perdeu 30–64% de saturação sem nenhuma mudança deliberada de cor.

## Contraste da mira (WCAG)

Razão de contraste na janela de ~44×42 px em volta do centro da tela, em vários frames com fundos
diferentes. Alvo ≥ 3:1 em todos.

Mira branca medida em **1,28:1** contra uma parede clara é uma mira invisível — e clarear a cena
piora o problema. Ciano com contorno preto sobrevive a fundo claro e escuro.

## Viewmodel: máscara por invariância

Não precisa de máscara manual. Os 4 ângulos `a/b/c/d` do mesmo mapa/aspecto têm cenário diferente e
viewmodel **idêntico** — a interseção dos pixels iguais é a arma (mais o HUD fixo, que você recorta
pelas bordas).

Com a máscara, meça em fração da largura da tela:

| Medida | Alvo | Por quê |
|---|---|---|
| borda esquerda | 0,62–0,65 | referência CS2: a arma fica inteiramente à direita, sem sujar o centro-baixo |
| borda direita | ≥ 0,99 | o antebraço tem que **sair** pela borda; se termina dentro do frame vira um toco/cotovelo |
| área da tela | ~8–10% | acima disso é a reclamação "as armas tomam a tela" |
| ângulo | 11–14° | `atan(pos.x / pos.z)`; acima disso é o "mira num lugar, a arma aponta pro outro" |

## Custo (o alarme de OOM)

Por mapa, depois de 30s de jogo: `renderer.info.render.calls`, `.triangles`, `renderer.info.memory.textures`,
`.geometries`, `renderer.info.programs.length`, e `performance.memory.usedJSHeapSize`.

Referências reais deste projeto: heap de boot foi de 322MB para 110MB depois de matar o preload; o
crash "Aw Snap" acontecia acima disso. Contagem de texturas subindo de 288 para 482 numa única rodada
é o precursor — texturas de canvas geradas por mapa se multiplicam rápido e cada uma é VRAM.

Meça também o **tempo até `live`**. Sob SwiftShader ele é ~30× o tempo real, mas serve como gate
relativo entre rodadas: +35% de tempo até jogar é regressão de custo mesmo que em GPU seja invisível.
