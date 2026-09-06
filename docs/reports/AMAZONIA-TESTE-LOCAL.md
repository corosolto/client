# Amazônia: teste local integrado com a main

Abra <http://127.0.0.1:8157/?map=amazonia&perfilauto=0&lang=pt> e atualize com
Cmd+Shift+R. Esta porta serve a worktree integrada com maina551204f. O snapshot antigo
foi substituído;8156 também serve a mesma árvore atual.

No menu, escolha SINGLE PLAYER, facção, personagem e adversário. Para o preview:
<http://127.0.0.1:8157/?tela=maps&map=amazonia&lang=pt&perfilauto=0>.
O card mostra uma captura real e reproduz um clipe silencioso no hover.

Suba as escadas, atravesse a varanda e entre pela porta aberta. As cabanas têm
paredes de proteção, peitoris e janelas abertas para atirar. Confira o tucano
no suporte, a onça sobre a madeira e a família de galinhas no quintal leste.
A animação de cabeça/respiração mantém os apoios; a onça deitada não caminha.
Jacaré fica na margem; peixes saltam, araras voam e a rabeta navega ao sul.
A água rasa mantém a velocidade normal e os sons de passos aquáticos.

Se o servidor parar, confira que8157 está livre e execute:

```sh
cd /Users/ruben/csbrasil/worktrees/amazonia-visual
ASTRO_DEV_BACKGROUND=0 /opt/homebrew/opt/node/bin/node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 8157 --ignore-lock
```

Não encerre servidores de outras frentes. As capturas e os testes estão em
`artifacts/amazonia-visual/cabin-round/`. Histórico e próximos passos:
[AMAZONIA-VISUAL-CONTINUATION.md](AMAZONIA-VISUAL-CONTINUATION.md).
