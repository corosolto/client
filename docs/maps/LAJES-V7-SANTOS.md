# Santos Dumont sobre Lajes — V7

Modelo autorado em `public/js/lajes_santos_dumont.js`, sem GLB ou fetch adicional.
A ficha está em `plans/24-LAJES-SANTOS-DUMONT.md`.

## Referência e resultado verificável

A foto do 14-bis no MUSAL, vista na [página AM Aero](https://amaero.com.br/musal/),
mostra caixas biplanas de tecido claro, montantes finos, treliça, cesta de vime
escura e rodas raiadas. No arquivo local de 800×600 px, a asa esquerda ocupa
aproximadamente x24–459/y127–409; montantes separam os compartimentos, em vez de
uma asa maciça. É uma vista em perspectiva: não foi usada para inferir medidas
ortográficas. A foto oficial localizada pela [FAB](https://www.fab.mil.br/noticias/mostra/27013/RIO%202016%20%E2%80%93%20Museu%20da%20FAB%20%C3%A9%20parte%20do%20roteiro%20cultural%20da%20Olimp%C3%ADada)
não abriu; não foi tratada como referência visual examinada.

O [Museu Virtual Santos=Dumont](https://www.museuvirtualsantosdumont.com.br/14-bis.html)
registra 12 m de envergadura e 10 m de comprimento. A geometria mede
12,052 × 4,028 × 10,146 m: desvios de 0,43% e 1,46% nos dois eixos publicados,
incluindo tubos exteriores e hélice. Isso verifica a escala geral, não fidelidade
1:1. A altura não recebeu nota histórica.

O [retrato de 1902](https://commons.wikimedia.org/wiki/File:Alberto_Santos-Dumont_portrait.jpg),
de Zaida Ben-Yusuf/Library of Congress, foi inspecionado: rosto estreito, cabelo
escuro, bigode e colarinho branco. O piloto é estilizado para distância de jogo,
em pé, com chapéu de aba curta. Não é reprodução fotográfica desse retrato.
Referências ficam em `references/lajes-santos/` com FONTE, fora do conteúdo servido.

## Integração e custo

Importar `attachLajesSantosDumont` e chamar `(ambience, root, {low})` ao final da
composição de céu. A API retorna `group` e `snapshot()`; também fica em
`ambience.lajesSantosDumont`. Repetir a chamada retorna o mesmo objeto.
Encadeia update/dispose, respeita `ambience.paused` e `lajessky=0`, remove o grupo
e libera geometrias/materiais no descarte. Nenhuma peça entra em colisão.

Trajetória elíptica de 96 s, raios 52/66 m, altitude 30,4–33,6 m. Canard aponta
para a tangente; hélice traseira gira. É uma trajetória de ambiência artística,
sem reivindicação de simulação aerodinâmica histórica.

- Med/high: 16 meshes e 12.168 triângulos.
- Low: 16 meshes e 6.408 triângulos, preservando compartimentos e piloto.
- Oito materiais reutilizados, sem textura adicional, sem sombras dinâmicas.
- Draw calls declaradas pelo número de meshes; FPS depende da medição runtime.

## Régua e evidência

`node tools/eval/lajes-santos-check.mjs` e `--low`: cinco cláusulas (escala,
canard/piloto, movimento/hélice, pausa e descarte com eventos de recursos).
Antes da implementação, reprovou com `14-bis ausente no céu`.
Mutantes `escala`, `sem-canard`, `sem-piloto`, `parado`, `sem-pausa` e
`sem-dispose` alteram a geometria ou execução e precisam reprovar.

Artefatos em `artifacts/lajes-visual/v7/santos/`: JSONs das execuções,
`geometry.json` exportado da malha efetiva com `--export`, renders offline
por `tools/render-lajes-santos.py`. O render usa posições, materiais e índices
reais do módulo; não reconstrói outro avião em Blender.

O render quarter de 1500×1000 px foi aberto e inspecionado: seis células grandes
distribuídas entre as duas asas, canard frontal menor à esquerda da imagem, tecido creme,
montantes castanhos, cesta com piloto e duas rodas raiadas. Essa observação é do
construtor, sem nota de aprovação. Os três renders (quarter, underside e side)
foram abertos. A vista inferior preserva piloto/canard; na lateral estrita, as
paredes das células ocultam boa parte do piloto, como esperado da geometria em
caixas. O orbit precisa ser revisto no jogo para avaliar sua leitura ao longo
da passagem. Blender encerrou com sucesso e salvou o .blend de revisão.

Captura no jogo e aprovação de crítico independente ainda precisam constar na
entrega V7. Render isolado e escala verde não certificam legibilidade no horizonte.

## Validação integrada final

A primeira passagem sobrepunha o helicóptero e foi rejeitada pelo crítico. As
órbitas agora usam fases separadas com mesmo período; `eval:lajes-airspace` mede
silhuetas por esferas conservadoras nas câmeras do mapa e reprova o mutante que
coloca as aeronaves na mesma posição. `v7/life-final/santos-voo.webm` mostra a
passagem real da laje norte. A crítica final aprovou a silhueta e o movimento; o
piloto permanece um detalhe distante, sem rosto legível na câmera normal.
