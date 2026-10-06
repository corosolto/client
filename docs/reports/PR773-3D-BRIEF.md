# PR #773 — brief para refazer os modelos políticos

Este brief prepara a etapa visual pendente de [PR #773](https://github.com/corosolto/client/pull/773). A geração 3D e o consumo de créditos aguardam acesso/autorização do dono; os modelos originais continuam no jogo. Estado operacional e testes: [PR773-CONTINUATION.md](PR773-CONTINUATION.md).

## Fontes e problema medido

- Identidade, roupa, paleta e armas: `public/models/characters/{barbudo,capitao,dama,professor,senador,ministro,deputado,juiz}.glb`, `public/js/characters.js`, e a descrição do PR #773. Os GLB atuais são a referência de identidade, não de proporção.
- Sonda reproduzível: `node tools/eval/char-probe.mjs`. No elenco atual de 61, a mediana de cabeça/altura é **0,210** e a de largura do tronco/altura é **0,217**. Isto é comparação interna, não teto absoluto. Entre os políticos: Barbudo **0,285 / 0,348**, Dama **0,295 / 0,213**, Ministro **0,299 / 0,310** (cabeça / tronco). O excesso de tronco de Barbudo e Ministro e a cabeça/cabelo da Dama aparecem nas capturas 3:2.
- Evidência visual no jogo: `tools/eval/asset-evidence/pr773/dama-orbit-{side,front}.png`; retratos atuais em `tools/eval/asset-evidence/pr773/avatars-3d.jpg`. O crítico independente aprovou a correspondência dos avatares com os GLB e reprovou silhueta e cabelo. Os ternos escuros também exibem arestas/brilhos brancos fortes.
- O próprio PR já havia reprovado o Ministro por brilho na toga, arma ausente no still e mão de apoio aberta no vídeo. A tentativa de rig offline por doador foi rejeitada no PR por braços esticados e toga rasgada. A compressão posterior de vértices também foi rejeitada nesta continuação porque não resolveu a silhueta e piorou C3. Não repetir esses atalhos.
- `mint-assets.json` não registra os oito políticos atuais, apesar de o PR descrever geração Mint. Registrar o ID, prompt, referência, versão, custo e resultado de qualquer geração nova para recuperar a procedência.

## Ordem de produção

1. **Dama:** conservar rosto satírico, brincos, roupa vermelha e identidade reconhecível. Refazer o cabelo a partir da referência visual escolhida pelo dono, reduzindo o volume elevado/enrolado que domina testa e perfil. Ajustar tamanho da cabeça contra corpo e elenco; conferir frente, perfil, corrida, tiro e agachamento. Sem referência aprovada, não inferir o penteado final do nome do personagem.
2. **Barbudo:** conservar barba branca, faixa presidencial e terno; reduzir largura de ombros/tronco e cabeça sem encolher braços, mãos, faixa ou arma. A silhueta precisa manter pernas e pés legíveis em 1200×800.
3. **Ministro:** conservar toga escura com detalhes vermelhos, rosto e identidade. Reduzir tronco/ombros e cabeça, manter gola/toga íntegros em movimento, reduzir brilho branco nos materiais, corrigir contato da mão de apoio com shotgun e conferir arma no still. C3 de walk/run já é suspeito no original; não aceitar candidato que piore o desvio.
4. **Capitão, Professor, Senador, Deputado e Juiz:** comparar um a um com a mediana do elenco e com as capturas reais. Professor tem cabeça/altura 0,280; os demais variam de 0,214 a 0,252. Preservar distinção de rosto, roupa e postura; evitar que a normalização transforme os cinco na mesma silhueta.

## Contrato de geração e aceite

- Mint 3D, quando habilitado: gerar `riggable_character` em T-pose de mãos vazias; rigar com um clipe do serviço; usar o `rigged_character_glb` e os 11 clipes retargetados no esqueleto Meshy do elenco. Confirmar nomes de juntas, orientações, escala em metros e material PBR. É o pipeline documentado em `docs/docs/stack.md` e usado pelo PR, sujeito ao custo e à revisão de cada tentativa.
- Produzir **um candidato por vez**, começando por Dama. Não substituir o GLB rastreado antes de renderizar candidato no jogo e verificar C1, C3, arma, animações, colisão/hitbox e textura. Tratar erro de carregamento ou fallback procedural como reprovação.
- Antes/depois em 1200×800 no jogo real: frente, perfil, costas, idle, walk/run, shoot, crouch e tela de seleção/resultado. Olhar a figura, não só a sonda. Rodar crítica adversarial independente em imagens sem a justificativa de quem criou.
- Após aceitar um GLB: regenerar avatar 3D (`tools/render-politicos-avatars.mjs`), stills (`tools/eval/char-result-stills.mjs`), vídeos de seleção/vitória/derrota (`tools/eval/char-native-vids.mjs`), sonda completa (`tools/eval/char-probe.mjs`), offsets (`tools/gen-foot-offsets.mjs`) e manifesto de animação (`tools/gen-anim-manifest.mjs`). Validar as saídas na UI e atualizar este relatório com IDs e hashes; manter credenciais e URLs assinadas fora do Git.
