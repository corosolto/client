# Viewmodels finais — catálogo integral

## Objetivo e definição de pronto

Entregar as 26 armas do jogo com uma linguagem visual única em primeira pessoa. O release só
fecha quando cada arma apresenta modelo correto, mãos completas, pega e contatos coerentes,
mecanismo próprio, disparo, recarga, ADS quando aplicável, enquadramento 16:9 e 3:2, HUD/munição
corretos e aprovação visual humana no jogo real. Resultado offline, still isolado ou “candidato”
não é versão final.

Durante a integração, o fallback atual permanece como proteção contra asset ausente. Ele não é
aceite para a campanha: misturar famílias novas com armas antigas quebra a uniformidade pedida.

## Checkout de integração

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final`;
- branch: `codex/viewmodels-catalog-final`;
- base: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb` (`v2.0.0-alpha.246`);
- integrador único: Codex;
- produtores externos trabalham em worktrees próprios e entregam commits pequenos; não editam
  `game.js`, `weapons.js`, `vmattach.js`, `fparms.js`, ADS ou HUD nesta lane.

## Catálogo obrigatório

| Família | Armas |
|---|---|
| Controles | AK-47, PT-38, faca |
| Pistolas | Deagle, revólver .38 |
| Fuzis | M4, M92, AKM, G3, MD97, carabina, SCAR, Tavor, FAMAS |
| Submetralhadoras | MP5, Uzi, P90 |
| Precisão | AWP, M400, Mosin, Remington 700, SVD, G3SG1, SKS |
| Pesadas | LMG, shotgun |

Fonte derivável: `WEAPONS` em `public/js/data/weapons.js` e `WEAPON_IDS` em
`public/js/weapons.js`. A contagem é regenerada pela documentação do projeto; este relatório
registra a obrigação de cobertura, não substitui a fonte.

## Fontes que serão extraídas

- controles: PR #549, preservando os checkpoints já aprovados pelo dono;
- DMR/precisão: PR #544 e preparação #513;
- fuzis: preparação #509 e evidência específica da M4;
- LMG: PR #546 serve como diagnóstico reprovado; sua saída visual não é promovida;
- infraestrutura histórica: PRs #464/#468 apenas como fonte de contratos e pequenos trechos
  comprovados, sem transportar a pilha de commits.

Nenhum cherry-pick amplo começa antes do inventário de arquivos e conflitos contra esta base.

## Gates por arma

1. **Identidade:** ID, malha, escala, orientação e materiais correspondem à arma.
2. **Mãos:** duas mãos quando a mecânica exige, dedos sem atravessar e pega estável.
3. **Ações:** começo/meio/fim de idle, tiro, recarga, equip e ADS; transições sem salto.
4. **Mecanismo:** ferrolho, slide, carregador, clip, cartucho ou tambor conforme a arma.
5. **Câmera:** 16:9 e 3:2, hip e ADS, sem cortar mãos nem dominar a tela.
6. **Jogo:** HUD, munição, áudio, muzzle, pickup e terceira pessoa sem regressão.
7. **Desempenho:** lazy load, descarte GPU, tamanho do asset e fallback medidos.
8. **Aceite:** captura/contact sheet e revisão humana no runtime real.

Toda régua nova precisa reprovar o estado anterior ou um mutante que quebre a invariante. A ordem
do projeto é `npm run eval:vm` antes das invariantes; gates técnicos não substituem a imagem.

## Ordem de integração

1. medir e congelar AK, PT-38 e faca como referência;
2. portar a infraestrutura mínima necessária sobre alpha.246;
3. integrar as famílias, uma por vez: controles → pistolas → fuzis → submetralhadoras → precisão
   → pesadas;
4. após cada família: commit recuperável, gates específicos e capturas;
5. depois das 26: regressão cruzada, duas proporções, HUD, terceira pessoa, build limpo e revisão
   adversarial;
6. abrir um único PR final sobre `main` e mapear cada PR-fonte incorporada.

## Estado inicial — 10/09

- worktree criada limpa na alpha.246;
- inventário paralelo das branches/PRs e do catálogo atual concluído;
- nenhum código de runtime portado ainda;
- próximo passo: comparar os commits aprovados de #549 contra a base e materializar a primeira
  régua de uniformidade que fique vermelha com o catálogo misto.

### Baseline reproduzido

- produção usa `WEAPON_ONLY` por padrão; mãos só entram com `?hands=1`;
- os 26 GLBs existem, mas cada um está achatado em um node e zero animações;
- recarga, recoil, draw e ADS atuais movem a raiz; `magDrop` não produz ação visual;
- não há slide, ferrolho, pump, tambor, clip ou cartucho móvel no caminho atual;
- somente oito armas têm fallback procedural; as outras dezoito podem ficar invisíveis quando o
  GLB falha;
- a suíte aceita dívidas VM conhecidas e não possui matriz 26 × ações/contatos/sincronização.

### Decisão de extração

Os PRs-fonte estão entre 537 e 645 commits atrás desta base. Nenhum será mesclado ou
cherry-picked integralmente. A espinha sai da linhagem #468 até `d35c6658`, portada por símbolos
para preservar multiplayer, combate e Míticos do `game.js` atual.

Ordem comprovada pelo inventário:

1. fundação autorada de #468/`d35c6658`;
2. correções transversais de #464: ausência sem AWP substituta, visibilidade só após malha,
   escala do pente e trims efetivos;
3. gates de #549 e congelamento dos três controles aprovados;
4. Rem700/G3SG1 de #544, ainda sujeitos à revisão visual;
5. M4 aprovada em idle, conclusão da recarga e produção dos demais fuzis;
6. Mosin/SVD/SKS, corrigindo primeiro o desaparecimento intermitente da SVD;
7. LMG refeita; o resultado anteriormente reprovado não entra;
8. AWP, shotgun, SMGs e curtas, que ainda não possuem saída final aprovada nas fontes auditadas.

Checkpoint documental: `41113d742`; `npm run check:deploy` passou 39/39 com Node 23 depois de
instalar as dependências do worktree. Draft de acompanhamento: client#572.

O censo das dezoito worktrees anteriores, incluindo conteúdo local não enviado e assets ignorados,
está em [`VM-WORKTREES-CENSUS-2026-09-10.md`](VM-WORKTREES-CENSUS-2026-09-10.md). Ele substitui
a suposição inicial de que os sete PRs continham todas as fontes relevantes.
