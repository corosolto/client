# Prévia real — Treta na Amazônia

`amazonia.jpg` e `amazonia.mp4` são capturas locais do Game/Three.js servido pelo
snapshot main 69555790 com o overlay da Amazônia, não imagens ou vídeos gerados
por IA. Mantêm os materiais, luz, água, fauna e geometria do mapa. A câmera omite
somente o HUD DOM e a arma em primeira pessoa. A procedência dos assets 3D é a
registrada nos respectivos FONTEs; a captura não altera suas licenças.

Pipeline: `tools/capture-amazonia-preview.mjs`. Recibo com SHA256 das respostas
carregadas, mídia final, câmera e viewport: `amazonia.capture.json`. Saída: JPEG
960×640 e H.264 960×640, 24 fps, 6 segundos, sem faixa de áudio. Poster = quadro 0.
Frames intermediários: `artifacts/amazonia-visual/hover-capture/frames/` (locais).

O componente de reprodução deriva do trabalho do Sertão em b917cce1, adaptado à
entrada Amazônia do registro de mídia e à sincronização do snapshot. Não inclui
assets ou mudanças do mapa Sertão. Revisão: `docs/reports/AMAZONIA-HOVER.md`.
