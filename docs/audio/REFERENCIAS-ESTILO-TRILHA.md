# Brief de trilha original — referências medidas, não imitadas

As faixas locais antigas são usadas somente para extrair características musicais
mensuráveis; não são enviadas a geradores, distribuídas, nem citadas no prompt por
artista/título. Toda saída precisa ter melodia, arranjo e gravação originais.

| Perfil de referência | Medida local | Brief que substitui a referência |
| --- | --- | --- |
| rap de rua menor | 78 BPM · menor harmônica · 2.723 Hz · 0,58 percussivo | break gasto, baixo elétrico baixo, piano de duas notas e espaço entre ataques |
| hardcore industrial | 161 BPM · lídio · 2.704 Hz · 0,30 percussivo | riff curto grave, caixa/tom secos, paradas mecânicas, sala de ensaio áspera |
| reggae-rock escuro | 108 BPM · frígio · 2.590 Hz · 0,14 percussivo | guitarra abafada no contratempo, baixo dub, ponte stop-start, sem clima de resort |
| mandelão escuro | 129 BPM · frígio · 923 Hz · 0,43 percussivo | tamborzão/caixa secos, subgrave único e síntese filtrada sem melodia principal |
| forró urbano | 112 BPM · jônio · 3.550 Hz · 0,29 percussivo | zabumba, triângulo, acordeon curto e baixo elétrico, sem drop de EDM |

Os prompts em `tools/generate-lyria-soundtrack-pilots.mjs` carregam essas decisões
e proíbem reggaeton, salsa, “Latin pop”, voz e imitação de artista. O objetivo é
uma paleta brasileira específica, não a etiqueta vaga “música latina”.

## Regra de aceite

1. O conjunto precisa passar pela régua de diversidade: BPM, modo, brilho e razão
   percussiva não podem convergir numa só receita.
2. A pessoa responsável escuta os cinco clipes como sequência; a régua mede
   repetição, não personalidade ou graça.
3. Só a faixa escolhida, com plano/direito comercial confirmado, segue para a
   trilha longa e para o menu derivado.
