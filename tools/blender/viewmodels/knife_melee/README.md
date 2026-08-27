# Piloto de faca/melee

Pipeline exclusivo da família melee. Ele gera um GLB com a faca própria do jogo,
duas mãos e antebraços autorados no projeto, câmera 3:2 e as ações `Idle`, `Draw`,
`Slash` e `Stab`.

## Reproduzir

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  artifacts/viewmodels/knife-melee-pilot/knife-melee-pilot.blend \
  --python tools/blender/viewmodels/knife_melee/validate_blend.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/validate_glb.py
python3 tools/blender/viewmodels/knife_melee/contact_sheet.py
```

O builder nunca importa `~/Downloads/knife_animated.glb`. Esse arquivo serve só
como referência local de ritmo, rig e composição; nenhuma malha, textura, material
ou skin dele entra na cena. A arma visível vem de
`public/models/weapons/knife.glb`; mãos, dedos, punhos, mangas e rig são gerados
pelo próprio script.

## Portões e falhas registradas

A primeira passada foi reprovada por pele/manga estouradas, punho sem leitura e
dois quadros iniciais vazios no draw. A luz, os materiais e a entrada da animação
foram corrigidos antes da evidência versionada.

- `tools/eval/asset-evidence/knife-melee/contact-sheet.png`: sequência Blender.
- `tools/eval/asset-evidence/knife-melee/export-truth.png`: GLB reimportado.
- `tools/eval/asset-evidence/knife-melee/*-gate.json`: estrutura, pixel e export.

Os números são auxiliares. A inspeção visual confirma lâmina legível, mão forte
fechada no cabo, mão livre como contrapeso e arcos distintos de corte e estocada.
Os gates também foram provados com mutações controladas: remover `Draw`, retirar
um render da sequência e trocar o aspecto exportado de 3:2 para 1.6 fizeram,
respectivamente, os três validadores ficarem vermelhos antes da execução final.

## Limitações deliberadas

- O asset não está ligado ao runtime; esta frente não edita JavaScript nem HUD.
- Não houve captura no jogo ou comparação Blender↔navegador, porque navegador está
  fora do escopo desta frente.
- Falta revisão adversarial independente e aprovação do dono. Portanto este piloto
  não libera arremessáveis nem pode ser chamado de pronto para produção.
- O exportador repete o aviso de múltiplos nós de imagem do material original da
  faca; o reimport preserva as texturas empacotadas e o resultado visual, mas uma
  revisão futura pode simplificar esse material na fonte.
