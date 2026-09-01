# Renders de arma para revisão de viewmodel

`render_glb_preview.py` abre os GLB canônicos e gera uma imagem de estúdio: fundo
escuro, três luzes de área e piso com sombra. É uma régua visual do asset; não
substitui a captura do jogo, que é a fonte de verdade para enquadramento e animação.

## Gerar

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/render_glb_preview.py -- \
  /tmp/viewmodel-studio \
  public/models/weapons/m4.glb \
  public/models/weapons/ak.glb \
  public/models/weapons/deagle.glb
```

O script aceita quantos GLB forem necessários depois do diretório de saída e produz
um PNG por arquivo, sem alterar o GLB de origem. Os renders usam EEVEE para iteração
rápida; antes de substituir arte publicada, valide também o mesmo id no viewmodel real.

## Animação

Não asse clipes para cada arma neste pipeline. O jogo usa `ViewModelRig` em
`public/js/springs.js`: idle, sway, bob, recoil, draw, holster e reload acompanham o
estado real de arma e munição. A prova visual no navegador continua obrigatória, porque
um render de estúdio não mede câmera, FOV, HUD ou recorte em 3:2.
