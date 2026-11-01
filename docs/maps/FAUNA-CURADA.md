# Fauna curada no mapa

O Escadão usava `galinha_campo.glb` sem albedo; Lajes usava `cat_telhado.glb` com atlas256. A presença dos modelos Mint no acervo não impedia esse resultado. O perfil automático mobile também pulava o preload da fauna.

As referências em `tools/eval/map-fauna-curated.json` vinculam conceito, mapa, arquivo, hash, registro de origem, canais de textura e cadência do rig. Elas escolhem o material desta rodada; não certificam beleza por quantidade de triângulos. Os GLBs permanecem intactos. O gato mantém caminhada0,55m/s e fuga1,5m/s. As listas dos dois mapas carregam somente espécies instanciadas, incluindo pipas em Lajes. Os outros mapas mantêm sua política anterior. No menu, a fauna continua sendo carregada depois dos props em qualquer perfil. A opção `mobileAmbience` limita apenas o início da partida e a pré-carga do próximo mapa no perfil automático mobile.

Os dois animais curados usam a mesma sombra radial de contato dos personagens (`public/js/contact-shadow.js`), com opacidade fixa 0,45 e o afastamento do piso já usados no jogo. O override `csop` continua específico dos personagens. O diâmetro acompanha a altura normalizada do modelo. Cada sombra acrescenta um plano de dois triângulos, acompanha a raiz e não recebe raycast. Seu material é descartado com a ambiência; textura e geometria compartilhadas permanecem reutilizáveis. A sombra melhora a referência visual de apoio e não certifica contato físico nem corrige o rig.

`npm run eval:map-fauna-curated` confere os builders reais, registros de preload e procedência. Executa os trechos reais de início de partida e pré-carga do próximo mapa para detectar o retorno do skip mobile. Mutações do auditor recusam modelo antigo, fallback, remoção da fauna, textura ausente/não decodificada, clipe ausente e movimento sem deformação local. O campo `declaredPreload` registra a lista declarada do mapa; a origem do clone, materiais e clipes medem o modelo usado. Os testes dos dois callers verificam a chamada efetiva de preload mobile. Os dados sintéticos desses testes exercitam o auditor; não aprovam a qualidade do jogo. Os cinco mutantes do menu também são executados pelo comando de CI: um mutante sobrevivente reprova o comando.

Para medir os GLBs realmente carregados, leia o guia atual com `ego-browser skill`, use a TaskSpace desta tarefa e o servidor real do checkout:

```sh
npm run eval:serve -- 8545
node tools/eval/map-fauna-curated-browser.mjs --space ID --page p2 --base http://127.0.0.1:8545 --out /caminho/absoluto --fotos 2
```

No CI, `eval:map-fauna-curated:runtime` roda no `portao-browser` com Chromium/SwiftShader e servidor reais. Usa exatamente o mesmo coletor do Ego, carrega os dois mapas e audita os JSONs produzidos nesta execução. Captura ausente, erro de navegador, fallback, textura não decodificada ou rig parado reprovam o passo; artefatos incluem os quatro PNGs e os relatórios. As réguas unitárias permanecem no `pr-fast`; não substituem esse portão runtime. O censo exige uma única amostra de cada mapa esperado e recusa mapas desconhecidos, duplicados ou ausentes antes da auditoria individual.

O comando reusa a Space fornecida e navega a página indicada. Não cria nem escolhe outra Space. `--fotos` limita quantos mapas recebem um par de imagens; 2 cobre ambos e 1 cobre só o primeiro. Mede materiais e texturas decodificadas, origem do clone, clipes e deslocamento com alterações locais nos ossos pelo controlador real. Gera JSON e capturas em distância de jogador e close. Os ticks determinísticos não provam pisada em velocidade normal. Uma crítica independente deve olhar as imagens e um vídeo em velocidade normal antes da aceitação visual.

O mapview preloada fauna por conta própria: ele não prova a partida mobile. A aceitação inclui iniciar a partida pela UI com o perfil automático mobile ativo e conferir o modelo/material e o movimento no RAF natural. Toque emulado, conta local controlada, aparelho físico, produção e multiplayer humano são evidências distintas.

A amostra cobre galinha do Escadão e gato de Lajes. Outros animais, props e superfícies sem textura continuam no censo e precisam de referências e avaliação próprias. Material simples de metal/vidro não falha apenas por não ter albedo. Ausência de medição não recebe aprovação global.

Os gatos curados dos dois mapas e a galinha do Escadão limitam o giro ao menor arco a 6rad/s, inclusive na fuga. A reversão de rota antes atribuía uma meia-volta em um frame; o controle agora distribui essa orientação no tempo, preservando caminho, velocidade e clipes. A opção é local às três instâncias e não altera os outros animais. O limite numérico de giro não certifica animação de virar no lugar, contato dos pés ou fluidez percebida: essas continuam exigindo avaliação em movimento.

O menu guarda o mundo do cenário atual e descarta a ambiência ao reconstruí-lo. Cada material de sombra anterior é liberado, preservando textura e geometria compartilhadas; callbacks de mapas antigos não descartam o cenário atual. O contrato usa os builders reais dos dois mapas e controles que removem o descarte ou a retenção do mundo.
