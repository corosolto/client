# QA visual — piloto de faca no runtime

## Ambiente

- Jogo real servido localmente pelo Astro e aberto no Chrome externo em 1512 × 721.
- Captura com `?debug=1&bloom=0&meleeqa=1`; `meleeqa=1` só alonga os mesmos clips para
  amostragem determinística. Geometria, material, câmera, mixer e poses são os do runtime.
- Asset servido por `/models/viewmodels/coro/melee/knife-hires.glb?v=knife-pilot-12`.
- Mãos, UV, material e rig vêm do `pistol-hires` aprovado; a faca visível continua sendo
  `public/models/weapons/knife.glb`.

## Estado visual honesto

Esta prancha é candidata à aprovação, não uma aprovação automática. A mão dominante
mantém polegar e indicador fechados no cabo. A mão de apoio fica relaxada à esquerda,
com palma e três dedos legíveis em todos os checkpoints; somente o punho/antebraço entra
pela borda inferior, como nos demais viewmodels. Ela não cruza a lâmina. A escala caiu
11,7% em relação à revisão anterior (`0.030` → `0.0265`) e o pacote foi registrado à direita.

Os picos foram capturados pelo tempo autorado: `Slash` em 9/22 do clip e `Stab` em
10/24. O corte é horizontal e move somente braço dominante+faca; a estocada avança com
a lâmina vertical. As duas silhuetas são inequívocas. A lâmina não entra na coluna de
armas nem nos textos do HUD. `return-idle.jpg` registra o mesmo idle após a conclusão
integral da estocada, sem desaparecimento, teleporte ou pose residual.

O material usa a mesma textura procedural, paleta e resposta de rugosidade do
`pistol-pilot-14`, com compensação linear para a iluminação mais clara desta branch.
O resultado mantém o tom vinho do personagem e separa punho, dedos e costuras; não usa
material da faca doadora.

## Evidência

- `idle.jpg`: grip fechado; palma e três dedos do apoio legíveis.
- `draw.jpg`: entrada contínua de baixo, antes do assentamento.
- `slash.jpg`: pico horizontal determinístico (frame 9/22).
- `stab.jpg`: pico vertical/avançado determinístico (frame 10/24).
- `return-idle.jpg`: retorno limpo após o mixer concluir a estocada.
- `production-return.jpg`: ataque no timing normal de 0,52 s, já em idle aos 0,70 s.
- `contact-sheet.png`: os cinco checkpoints na ordem do fluxo.
- `../knife-melee/contact-sheet.png`: 20 checkpoints Blender.
- `../knife-melee/export-truth.png`: reimportação do GLB exportado.

## Ressalvas

- A arena contém bots e o cenário muda entre frames; isso é ruído do jogo, não do asset.
- O punho/antebraço do apoio entra pela borda inferior, mas palma e dedos permanecem inteiros;
  nenhuma ponta de dedo é cortada nos cinco checkpoints.
- Frames isolados não substituem vídeo para toda a curva temporal; as sequências completas
  foram observadas no jogo, e a prancha registra os checkpoints determinísticos.
- O retorno também foi repetido sem `meleeqa`: `production-return.jpg` foi capturado
  0,70 s após o clique, com 100 de vida e sem morte/respawn, confirmando o timing normal.
- O builder depende do `pistol-hires.glb` aprovado. Em branches separadas, use
  `CORO_VM_APPROVED_PISTOL`; após o merge, o caminho público padrão basta.
- A revisão do dono ainda é o gate de promoção. Não propagar para outras melees ou
  arremessáveis antes dela.
