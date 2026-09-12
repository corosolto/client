# Preview real do Sertão

`velho_oeste.jpg` e `velho_oeste.mp4` são capturas WebGL da cena do próprio jogo,
produzidas por `tools/capture-sertao-preview.mjs`. Substituem a ilustração anterior
a pedido do dono. Sem geração de imagem, composição de cenário externo ou áudio.

`velho_oeste.capture.json` registra câmera, viewport 3:2, hashes dos módulos e
assets efetivamente carregados e SHA-256 das duas mídias. O vídeo dura seis segundos,
em 960×640 a24fps; `map_preview_media.js` fornece revisão por conteúdo ao cliente.

Autoria do cenário e dos assets herdados mantém os respectivos registros em
`public/models/props/FONTE.md`, `public/models/ambient/FONTE.md` e `mint-assets.json`.
Capturar o jogo não elimina as pendências de licença documentadas nesses arquivos.
Não atribuir às capturas uma licença externa ou autoria humana não comprovada.
