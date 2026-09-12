# Lajes V4 — circulação térrea e escala doméstica

O pedido desta rodada foi atendido com uma implantação nova: nascer embaixo, entender os caminhos e reconhecer casas em escala humana. Não é aceite estético do usuário nem declaração de acabamento final. Trabalho restrito ao worktree `lajes-visual`, branch `codex/lajes-visual`; sem push, merge ou deploy.

## O que mudou

- Oito vagas de respawn no térreo, orientadas para a saída e protegidas por cobertura lateral. As16 visadas entre times continuam bloqueadas.
- Três caminhos principais: praça, beco oeste e beco leste. A camada superior reúne quatro conjuntos contínuos, duas pontes e quatro escadas retas, acessíveis sem salto.
- Doze casas principais com6m de frente e3,1m de altura; portas0,90×2,05m. Dois quartos recuados, coberturas de varal, janelas distintas e corrimãos interrompem a silhueta uniforme. Não se comprimiu um prédio inteiro para caber numa casa.
- Bar com toldo próprio, balcão e engradados; mercearia distinta, bancos, menos floreiras repetidas, caixas d'água, fiação, fauna e sons localizados. Nove sons já existentes foram restaurados no disco deste worktree com procedência e hash, sem importar material externo novo.

## Prova no jogo real

Chrome efêmero próprio,1536×1024, perfil med, CTF,7bots reais. `artifacts/lajes-visual/v4/browser-approved/` contém nove câmeras, GLBs carregados e rastros; o nome da pasta foi escolhido antes da crítica e não determina o veredito. A terceira revisão independente, [LAJES-V4-CRITICA-3.md](LAJES-V4-CRITICA-3.md), aprovou o conjunto de correções; as duas reprovações anteriores estão preservadas.

| Verificação | Resultado final |
|---|---|
| Spawn observado antes de posicionar câmera | y=0; posição[-3,0718,0,-28,0780] |
| GLBs carregados |79 URLs distintas com HTTP200 |
| Erros JavaScript observados no boot |0 |
| Portas / pisos / setas / proteção de spawn |12/12,4/4,4/4,16/16 |
| Praça, beco oeste, beco leste |3/3 percorridos por `_updatePlayer`; y=0 em todas as amostras |
| Circuitos superiores oeste e leste |2/2; quatro escadas e duas pontes; y entre0 e3,1m |
| Colisões reais nos cinco percursos |9.218 chamadas a `_collide`; sem salto ou mantle; sem teletransporte intermediário |
| Sons ambiente HTTP |9/9,2.340.394 bytes; bytes recebidos idênticos aos arquivos locais |
| Demais mutantes locais |24/24 aplicados e reprovados; restauração verde |
| Mutantes da régua visual |4/4 aplicados e reprovados: seta, porta, oclusores e builder |

Cada percurso começa numa posição declarada; as fotos reposicionam a câmera para inspeção. Essa captura não simula uma partida humana completa. Artefato consolidado: `artifacts/lajes-visual/v4/runtime-summary.json`.

O servidor estático ainda retorna404 para APIs que dependem de backend, o manifesto geral de áudio, uma música de menu e um endereço de brasão legado malformado. Isso não foi ocultado: URLs em `boot.json`. Os nove sons de ambiente foram verificados separadamente; a restauração não equivale à hidratação de todo o áudio do jogo nem à aprovação auditiva.

## Réguas e limites

A planta V3 falhou primeiro nas quatro cláusulas novas (spawns altos,22plataformas,63frentes estreitas e nenhum spawn conectado à praça pelo chão). O V4 passa em oito spawns reais no chão, quatro plataformas, doze frentes6m e oito conexões físicas. [Contrato de migração](LAJES-V4-CONTRATOS-PLANO.md) distingue novos requisitos de critérios preservados.

A primeira revisão reprovou ambiência/escala; a segunda aprovou caminhos e escala, mas reprovou composição repetida e corrimão fragmentado. O toldo/engradados, a retirada de floreiras duplicadas e corrimãos contínuos foram implementados e recapturados. A terceira aprovou essas correções, mantendo ressalva sobre repetição modular, beco austero e fundo em caixas. Não chamar o cenário de naturalista ou acabamento definitivo.

A simulação de bots ainda concentrou96,3% das amostras de combate no térreo e0,50% nas escadas. O instrumento registra isso sem cláusula comportamental; rotas acessíveis não provam equilíbrio ou uso suficiente das lajes em partidas. Essa calibragem permanece para avaliação jogando.

A medição soma os passes de um `Game.update`, incluindo sombras, por câmera:723–1.066 draw calls e1.308.177–1.558.239 triângulos. Lajes não tem teto próprio em `cena-tetos`. Referências históricas documentadas: Havan360calls/1,410Mtri, Ferrovelho620/1,170M e Piscinão860/0,870M; não são uma nova comparação controlada e o custo de Lajes ainda pede orçamento próprio. Não existe variação dia/noite configurada neste mapa. Não houve janela exclusiva de GPU; não há aprovação de FPS nem comparação temporal controlada contra V3.

[Contratos globais](LAJES-V4-CONTRATOS-GLOBAIS.md) preservam os vermelhos oficiais herdados: assets/manifesto de áudio incompletos e teste SSR procurando caminho antigo. A sonda do handler atual passou, mas não substitui o SSR oficial. O indicador MAP5 de densidade de props ficou0,29× abaixo do alvo0,35; o script não transforma isso em falha, e o relatório não o apresenta como aprovado. O gate global de escadas confirmou quatro escadas com piso0,300m, espelho0,1722m e Blondel0,644m. Os gates locais confirmaram685nós conectados, zero nós/3.581arestas ocupados e7.987/7.987células de anti-trap alcançáveis. A atualização de docs e os checkpoints são registrados no ledger de continuidade.

## Teste local

Servidor deste worktree na porta8147:

```sh
cd /Users/ruben/csbrasil/worktrees/lajes-visual
PATH=/opt/homebrew/bin:$PATH node tools/eval/serve.mjs 8147
```

Se a porta já estiver servindo este worktree, apenas abrir `http://127.0.0.1:8147/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1` e recarregar sem cache (Cmd+Shift+R). Para prova automatizada: `npm run eval:lajes-browser -- --movement --fotos=9 --out=artifacts/lajes-visual/reteste` com esse servidor ativo. O áudio ambiente usa o volume da configuração local; os arquivos de mídia ignorados pelo Git estão hidratados neste worktree, não embutidos nos commits.

## Arquivos exatos desta rodada

Comparação com checkpoint anterior`b3afbcb1`; mídia ignorada e artefatos volumosos não entram nos commits.

- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/maps/LAJES-V4-CONTRATOS-GLOBAIS.md`
- `docs/maps/LAJES-V4-CONTRATOS-PLANO.md`
- `docs/maps/LAJES-V4-CRITICA-3.md`
- `docs/maps/LAJES-V4-CRITICA-FINAL.md`
- `docs/maps/LAJES-V4-CRITICA.md`
- `docs/maps/LAJES-V4-DIRECAO.md`
- `docs/maps/LAJES-V4-ENTREGA.md`
- `docs/maps/LAJES-V4-ESCALA.md`
- `docs/maps/LAJES-VISUAL-CONTINUIDADE.md`
- `package.json`
- `public/js/lajes_houses.js`
- `public/js/lajes_navigation.js`
- `public/js/map_lajes_authored.js`
- `tools/eval/lajes-antitrap-check.mjs`
- `tools/eval/lajes-authored-check.mjs`
- `tools/eval/lajes-bots-check.mjs`
- `tools/eval/lajes-browser-check.mjs`
- `tools/eval/lajes-circuito-check.mjs`
- `tools/eval/lajes-ctf-surface-check.mjs`
- `tools/eval/lajes-gap-check.mjs`
- `tools/eval/lajes-layout-check.mjs`
- `tools/eval/lajes-nav-occupancy-check.mjs`
- `tools/eval/lajes-rooftop-check.mjs`
- `tools/eval/lajes-spatial-check.mjs`
- `tools/eval/lajes-vertical-check.mjs`
- `tools/eval/lajes-visual-check.mjs`
- `tools/eval/lajes-visual-measure.mjs`
