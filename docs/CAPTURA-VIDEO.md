# Dança por vídeo: pipeline, prova e o que ele ainda não prova

Ferramentas: `tools/video-pose.py` (extrai) · `tools/eval/pose-verdade.mjs` (mede o erro)

## Por que este caminho

Decisão de 22/10: refazer as danças com captura **nossa**, em vez de acervo de terceiros.
Motivos registrados em `docs/EMOTES-BR.md`: a ToS 6.2.E da Adobe proíbe bibliotecas de
conteúdo Mixamo (os mirrors públicos estão sendo removidos), e extrair pose de vídeo de
terceiro copia a performance de alguém — o mesmo risco do caso Hanagami.

Ferramenta escolhida: **MediaPipe Pose Landmarker** (Apache 2.0, roda local, sem conta e
sem nuvem). Os modelos de qualidade superior (4D-Humans, WHAM e parentes) são baseados no
corpo **SMPL, cuja licença é não-comercial** — ficariam fora do jogo de qualquer forma.

## Como o vídeo vira animação

1. `video-pose.py` lê o vídeo e escreve, por quadro, a **direção de cada osso**
   (ombro→cotovelo, quadril→joelho…), não ângulos. Direção não depende do tamanho de quem
   dançou nem do personagem que recebe — é a mesma ideia do overlay de emote.
2. O runtime aponta cada osso do personagem na direção gravada, convertendo do espaço de
   mundo para o quadro do pai — exatamente o `_deltaMundo` que já existe no `glbchars.js`.
   Por isso uma captura serve os 63 bonecos sem retarget por personagem.

## O que a prova de verdade conhecida mostrou

`node tools/eval/pose-verdade.mjs --clipe=walk --seg=4` renderiza um clipe que o jogo já
tem, guarda a direção real de cada osso, passa o vídeo pelo extrator e compara.

| Medida | Resultado |
|---|---|
| Extração roda ponta a ponta | 120/120 quadros, **0 sem pose** |
| Convenção de eixos (descoberta por varredura das 8 combinações) | `x- y+ z-`; sem isso o erro ia de 34,6° para 60,5° |
| Erro médio por osso, no nosso boneco | **34,6°** — alto demais para virar animação |
| Padrão do erro | **viés constante** (mediana ≈ média), não ruído |

**O que isso quer dizer, honestamente:** o pipeline está ligado e a convenção de eixos
está medida, mas o número **não mede a qualidade com um dançarino de verdade**. O teste
roda em cima dos nossos personagens, que são cartoon (cabeça enorme, ~4 cabeças de
altura) em pose de porte de fuzil — exatamente o tipo de imagem fora da distribuição em
que o MediaPipe foi treinado (gente real). O antebraço, que erra ~150°, é o caso extremo:
o modelo não acha o pulso de um boneco segurando uma arma invisível.

Em outras palavras: **esta prova reprova o boneco como dançarino, não o pipeline.**

## O que falta para decidir (custa 10 segundos de vídeo)

Antes da sessão de filmagem de verdade, basta **um clipe curto de uma pessoa real** —
pode ser você acenando e dando dois passos. Com ele eu meço o que importa:

- estabilidade quadro a quadro (tremor em graus por segundo);
- plausibilidade (joelho e cotovelo dobrando para o lado certo);
- como fica no boneco, lado a lado com o vídeo.

## Guia de filmagem (vale para o teste e para a sessão)

- **Enquadramento**: corpo inteiro com folga — pés e mãos nunca saem do quadro, nem no
  passo mais aberto. Câmera na altura do quadril, celular na horizontal.
- **Distância**: 3 a 4 m. Grande angular perto deforma o corpo e o modelo erra junta.
- **Fundo**: liso e contrastante com a roupa. Nada de porta/listras atrás.
- **Roupa**: justa ou de contorno visível. Roupa larga esconde joelho e cotovelo.
- **Luz**: frontal e difusa. Contraluz (janela atrás) é o pior caso.
- **Ritmo**: 60 fps, 6 a 10 s por dança, **começando e terminando na mesma pose** (é o que
  fecha o laço sem solavanco).
- **Ângulo**: de frente. Uma segunda tomada em 3/4 ajuda a corrigir profundidade.
- **Um corpo só** no quadro.

## Reproduzir

```bash
pip install mediapipe opencv-python-headless        # Python 3.10
curl -sLo /tmp/mp-modelos/pose_landmarker_full.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task

python3.10 tools/video-pose.py entrada.mp4 /tmp/pose.json   # vídeo -> direções de osso
node tools/eval/pose-verdade.mjs --clipe=walk --seg=4       # prova contra verdade conhecida
```
