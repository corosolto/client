# Piloto de faca/melee

Pipeline exclusivo da família melee. O GLB combina a faca própria de
`public/models/weapons/knife.glb` com o mesh, o material e o rig de mãos já
aprovados no `pistol-hires`. O resultado contém uma câmera 3:2 e somente as ações
`Idle`, `Draw`, `Slash` e `Stab`.

## Reproduzir

O builder usa por padrão o `pistol-hires.glb` versionado. Para testar outro
asset de mãos sem mudar a fonte, defina `CORO_VM_APPROVED_PISTOL`:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  artifacts/viewmodels/knife-melee-pilot/knife-melee-pilot.blend \
  --python tools/blender/viewmodels/knife_melee/validate_blend.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/validate_glb.py
python3 tools/blender/viewmodels/knife_melee/contact_sheet.py
export PATH="/opt/homebrew/opt/node@23/bin:$PATH"
npm run eval:melee-vm
```

Para o override opcional:

```bash
CORO_VM_APPROVED_PISTOL=/caminho/para/pistol-hires.glb \
  /Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/build.py
```

`~/Downloads/knife_animated.glb` é apenas referência local de ritmo e composição.
O builder não o importa. Nenhuma malha, textura, skin ou material dessa faca doadora
entra no `.blend` ou no GLB. A única arma visível vem do acervo do projeto.

## Portões e falhas registradas

As primeiras versões foram rejeitadas visualmente: mãos procedurais simplificadas,
apoio em leque estático, recoloração vermelha chapada, escala excessiva e picos de
`Slash`/`Stab` quase iguais. O piloto atual herda a topologia e o rig da pistola. O
corte move braço dominante e faca num arco horizontal; a estocada move o mesmo
conjunto para a frente com eixo vertical; a mão de apoio fica baixa/esquerda e tem
contramovimento separado.

- `tools/eval/asset-evidence/knife-melee/contact-sheet.png`: 20 frames Blender.
- `tools/eval/asset-evidence/knife-melee/export-truth.png`: GLB reimportado.
- `tools/eval/asset-evidence/knife-melee/*-gate.json`: estrutura, pixels e export.
- `artifacts/viewmodels/knife-main-runtime/`: inspeção retida do runtime integrado.

Os números são auxiliares e não aprovam o visual. O GLB desta família está integrado;
o contrato runtime vigente é `tools/eval/melee-vm-check.mjs`.

## Limitações deliberadas

- O modo `?meleeqa=1` só alonga a duração dos mesmos clips para capturar exatamente os
  frames de pico; o caminho normal mantém 0,28 s no draw e 0,52 s nos ataques.
- Nenhuma outra melee ou arremessável foi criada ou ligada.
- O exportador repete o aviso de múltiplos nós de imagem do material original da faca;
  o reimport preserva as texturas empacotadas, mas a fonte da arma ainda pode ser
  simplificada em uma frente própria.
