# Continuação das famílias de viewmodel

**Estado atual (06/09): marco 31 no final.** Continuidade e proporção da faca
implementadas no produto local, com evidências novas sem override. Não retomar
as tentativas históricas v3/v4 abaixo como se fossem o estado atual.

## Objetivo e autorização — 05/09/2026

Ruben aprovou a pistola com yaw 15° e pediu avançar a próxima série de armas,
preservando a continuidade caso a cota do Codex termine. Não autorizou novos
gastos, publicação nem transferência automática para outro serviço.

Objetivo completo: consolidar AK e pistola, depois os pilotos **faca →
sniper/AWP → escopeta**, conforme `docs/development/VIEWMODEL-1P-PROFISSIONAL.md`,
antes de ampliar ao restante do arsenal. Em 05/09 Ruben pediu explicitamente
continuar **até terminar todas as armas**. O objetivo inclui a matriz completa
do catálogo, não termina nos pilotos. A frente ativa é continuidade faca/pistola.
Cada piloto exige evidência real em 3:2/16:9, mãos/arma legíveis, ações corretas,
retorno natural ao idle, revisão independente e aprovação visual do Ruben.
Não marcar tudo pronto só porque testes estruturais passam.

## Checkout e preservação

- Worktree exclusivo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`.
- Branch `codex/vm-astra-pistol`; início desta rodada em `1afbf01e`, limpo.
- Checkpoint da aprovação da pistola e do prompt: `946cd4c6`.
- Integração D e primeira identidade por time (revisão ainda pendente): `2bd18e04`.
- Calibração de aspecto e acabamento v3 candidato: `961c70d2`.
- Mãos/enquadramento da faca e BUG-84 validados: `6d0b02b2`.
- Correção da transição da faca, capturador e testes: `a60c0f3e`.
- Não trabalhar em `primary`, Fable, retarget ou outros checkouts.
- `export PATH=/opt/homebrew/bin:$PATH` (Node 23); Node 16 sombreia o ambiente sem isso.
- `node_modules` é symlink para dependências Fable, somente leitura.
- `public/private-assets/viewmodels/` é clone APFS **local**. Builders devem
  receber esta pasta explicitamente; nunca usar o `privateRoot` compartilhado
  padrão nem reotimizar `shared/` por acidente.
- Um navegador por vez; não encerrar browsers/processos do usuário.
- Evidências novas: `artifacts/viewmodels/astra-series/`; pistola anterior:
  `artifacts/viewmodels/astra-pistol/`. Fora do Git, sem copiar dados brutos no prompt.

## Controles aprovados e dívida preservada

- AK: `public/models/viewmodels/coro/ak-hires.glb`, SHA-256
  `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
- Pistola: `public/private-assets/viewmodels/pistol/pistol-runtime.glb`, SHA-256
  `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`.
- Pistola aprovada: x 0,100; y -0,100; z -0,220; FOV 55°; rotação
  `[0, 15, -5]`; drawDrop 0,34. Só yaw mudou. O histórico causal completo
  está em `VIEWMODEL-ASTRA-PISTOL-HANDOFF.md`.
- Gauntlet anterior 3:2: 15° sem falhas, diagonal 12,15%, mãos/arma 3,890×.
  10° foi visualmente preferido pelo crítico, mas barrado por diagonal 11,85%
  abaixo de 12%; não reaplicar. B/C anteriores também foram rejeitados.
- **P4 em 16:9 segue pendente:** amostra insuficiente de contato mão/pente,
  tanto 20° (18 px máximos) quanto 15° (38 px), filtro >2000 px. Distância
  é `null`, não significa mão desconectada e não autoriza reduzir o filtro.
  A aprovação do enquadramento não converte essa medição em verde.
- Não foram validados todos os blends contínuos, celulares ou ultrawide.
- Último `check:fast` antes desta rodada: 63/66; vermelhos reproduzidos na
  Fable limpa: `eval:mapid`, `audio:check`, `feet:check`. Contrato geral
  `eval:authored-vm`: quatro falhas de catálogo/rota preexistentes. Reavaliar
  qualquer falha nova, sem misturar mapas/áudio nesta frente.

## Marcos desta rodada

1. Contrato da pistola atualizado para cobrar yaw 15° e conferir também o
   frame do relatório do browser. Antes de mudar o runtime ficou vermelho
   especificamente em `orientação-base divergiu (0, 20, -5)`;
   `astra-pistol/approved-frame-before.json`.
2. `FAMILY_FRAME.pistol` recebeu os 15° autorizados. Recaptura sem overrides
   em `astra-pistol/approved-runtime/`: 27 frames, sem erros; folha inspecionada.
   `approved-contract-final.json` passou. Os dois mutantes
   `--mutante-quadro-antigo` e `--mutante-runtime-quadro-antigo` ficaram
   vermelhos pelas causas esperadas. AK e GLB da pistola mantêm os hashes acima.
3. Próximo piloto confirmado: `KnifeMeleeViewModel` em `public/js/meleevm.js`,
   asset versionado `public/models/viewmodels/coro/melee/knife-hires.glb`.
   Não passa por `__authoredVm`; não chamar golden-ak-runtime com knife.
   Existe `tools/eval/melee-vm-check.mjs`, mas cobre estrutura, não movimento
   nem pixels. Primeiro capturar a implementação existente antes de alterar.
4. Inventário da faca em `astra-series/knife-inventory.json`: 52 joints, dois
   materiais, quatro clipes e câmera; `knife-contract.log` verde. GLB inicial
   SHA-256 `62119f066951cf8f98fbaa86bbe62f98800602b0ffaabfa83af45e2e61dc18b0`.
   Ataques quick/heavy usam Stab por intenção já documentada no controlador;
   Slash é clipe de biblioteca, não exigir sua troca sem evidência/autorização.
5. Build da pistola passou (`astra-pistol/approved-build.log`), incluindo os
   módulos servidos por hash. `check:fast`: 62/66 antes de regenerar docs;
   `eval:shaderbudget` passou, `docs:check` foi corrigido por `npm run docs`
   e os outros três vermelhos são os herdados acima. `arch:check` passou.
6. Capturador dedicado `tools/eval/melee-runtime.mjs`: controles reais em
   `astra-series/knife-runtime-3x2/` e `knife-runtime-16x9/`, 19 fotos cada,
   sem erros e 15 verificações de estado/retorno passaram. Não confundir isso
   com aprovação da faca. Ele avança `Game.update` real em passos <=1/120 s,
   incluindo blends, relógio e retorno `finished`; não é vídeo em tempo real.
   A tentativa inicial `knife-baseline-3x2/` é **inválida para timing**:
   `setDuration` não atualiza `getEffectiveTimeScale` antes de um tick; o
   capturador agora faz tick zero antes de ler duração. A régua detectou a
   própria amostragem errada (Draw/quick já em Idle no suposto meio). Não é
   falha do controlador de produção. Os dois controles corretos acima a substituem.
7. Inspeção inicial e crítico independente detectaram empunhadura/mão forte
   cortadas e mão livre pouco articulada; não promover a faca. Experimento
   **somente em memória**, pacote inteiro em z=-0,25, demais valores/lente/GLB
   intactos: `knife-depth-candidate-3x2/`. O crítico confirmou melhora clara:
   dedos/cabo mais legíveis, sem regressão visível de silhueta/mira. Ainda
   falta mostrar contato inteiro sem borda/HUD. O padrão permanece z=0.
8. A revisão também encontrou bind pose no término do saque/ataques. A régua
   `melee-motion-check.mjs` reproduziu quatro falhas antes de alterar runtime:
   três ações com contribuição caindo a zero e evento obsoleto encerrando
   ação nova. `meleevm.js` agora usa clamp da pose final no crossfade e filtra
   `finished` pela ação atual. Depois: 7/7; mutante sem-clamp falha em 3,
   evento-antigo falha em 1. `npm run eval:melee-vm` incorpora a régua, também
   executada pelo CI e `check:vm`. Não depende de assets privados.
9. Recapturas com correção + candidata z=-0,25:
   `knife-fixed-candidate-3x2/` e `knife-fixed-candidate-16x9/`, 19 fotos cada,
   15 verificações cada, sem erros. Crítico conferiu os quadros 100% e os
   retornos e aprovou **somente esse recorte**: sumiu a mão aberta/baixa,
   enquadramento 16:9 melhor, nenhuma nova regressão visível. Isso não
   certifica o movimento entre fotos nem o contato 3D. BUG-83 registra a causa.
10. Mutante de browser `knife-mutant-no-attack/` fica vermelho em quick/heavy
    no meio da ação, sem erros: o capturador detecta ataque realmente desligado.
    Mutante estrutural sem-construtor também falhou na cláusula certa;
    versão normal voltou a passar. Build, sintaxe e shaderbudget passaram.
    AK, pistola e faca conservam os três hashes registrados acima.
11. Fechamento: `check-fast-final.log` = **63/66**, somente `eval:mapid`,
    `audio:check`, `feet:check` herdados. Docs e arquitetura em dia. Build
    `astra-series/build.log` passou. Não há navegador/servidor/captura próprios
    ativos. Nenhum GLB alterado; nenhum push, merge, deploy ou envio ao Claude.
12. Retomada em `fd7d9c53`. Ruben disse **"aprovo as maos da faca"** em
    05/09, após a pergunta sobre o enquadramento candidato. Aplicado somente
    `PACKAGE_OFFSET.z=-0,25`, preservando malha, pose, escala e lente.
    Recapturas **sem override** `knife-approved-{3x2,16x9}/`: 19 fotos e
    16 verificações em cada aspecto, sem erros. Inspeção da folha confirma
    a candidata aprovada como padrão real, com centro livre e retornos coerentes.
13. Guarda de enquadramento em `melee-motion-check.mjs`: antes, três falhas
    (wrapper real voltando a z=0); depois 10/10. Mutante `quadro-antigo`
    reintroduz as três falhas. Logs `knife-approved-frame-{before,after,mutant}.json`.
    `eval:melee-vm` e `eval:shaderbudget` passaram; nova recaptura de browser
    também cobra o wrapper servido, não só o texto da constante.
14. Inspeção isolada no Blender, sem alterar GLB nem sessão do usuário:
    `knife-blender-inspection/`. GLB importado e deformado nas fases exatas
    de idle/Draw/Stab, 3:2 e 16:9. Oito quadros; maior divergência de limites
    projetados Blender/browser = 0,000005903 da tela (<0,009 px em 1440 px).
    Workbench usa cores diagnósticas; não é comparação de materiais.
    Distâncias até superfície por dedo estão no JSON, **não certificam
    penetração nem empunhadura integral**. Primeiro close ficou ocluído e
    não serve como prova de contato. Crítico novo não viu defeito estático
    demonstrável nos pares nem no close externo mais aberto, mas manteve
    superfícies internas ocultas como inconclusivas.
15. Vídeo contínuo `knife-approved-motion-{3x2,16x9}/`: 225 frames por
    aspecto, 7,5 s a 30 fps, oito comandos reais aceitos (troca, tiro,
    recarga, saque, ataques), sem erros. Tempo SIMULADO, não benchmark de
    desempenho/áudio. Crítico inspecionou transições e detectou clarões
    locais causados por tiros de bots. BUG-84: `_flash` agora só reacende
    a luz de primeira pessoa com `fpCls`. Fixture real: antes 1 falha,
    depois 14/14; mutante `flash-externo` volta a falhar. Browser normal
    `knife-final-motion-3x2/`: 21 fotos mais 225 frames, sem falhas/erros.
    Esses vídeos documentam o movimento ANTIGO, rejeitado no marco 16.
16. Ruben rejeitou explicitamente o ataque: "só dá uma batidinha com a
    ponta". Pedido atual: **esquerdo = estocada frontal; direito = levantar
    a faca e apunhalar de cima para baixo**, interpretação comunicada a
    partir da referência anexada. Isso substitui a pergunta antiga sobre
    slash/stab. Mãos e enquadramento permanecem aprovados; não reconstruí-los.
    Ambos ainda usam Stab; a nova animação NÃO está implementada.
17. Novo requisito: **uma skin de mãos/braços por TIME**, não por personagem.
    IDs conferidos em `public/js/factions.js`: C branca (Palhaços), F preta sem dedos
    (Funkeiros), B camuflada, E com estrela, U Tribos Urbanas. M/Míticos
    existe, mas ainda não recebeu direção visual específica do dono.
    Direção para U aceita pelo dono em seguida: luva preta sem dedos com
    quadriculado no punho para diferenciar de F, que TAMBÉM é sem dedos.
    A proposta inclui desgaste e pequeno detalhe roxo; aprovação de direção
    não é aprovação de uma textura/render ainda não produzidos. Inspirações de construção,
    sem baixar/copiar texturas, marcas ou malhas:
    [Dents Gripper](https://de.dentsgloves.com/products/men-s-the-suited-racer-fingerless-water-resistant-leather-driving-gloves)
    e [Vans Checkerboard](https://www.vans.com/en-us/p/shoes/icons/classic-slip-on-5315/classic-slip-on-checkerboard-shoe-VN000EYEX1L).
    Inspecionar UVs antes de colocar estrela/punho; preservar normal/ORM e
    separar material de luva/manga/pele. Hoje a faca usa um material único
    e textura por personagem; authored pode sobrescrever mapas ao carregar
    o pack compartilhado. Não anunciar skins como implementadas.
18. `knife-approved-check-fast.log`: 63/66, apenas os três vermelhos
    herdados (`eval:mapid`, `audio:check`, `feet:check`). Não misturar sua
    regeneração nesta frente.
19. BUG-84 fechado localmente: browser mutante
    `knife-flash-mutant-runtime/` falha só o pulso alheio (1,6 em vez de 0).
    Par de fotos inspecionado confirma a luz indevida; normal preserva a mão.
    `knife-checkpoint-{contract,cache,build}.log`: contrato, cache e build
    passam. Nenhum GLB mudou. Inspeção UV da faca em
    `knife-blender-inspection/uv-{faces,summary}.json`: os dois braços
    reutilizam o atlas, mãos aproximadamente v>0,54, mangas abaixo.
    Delimitar punho/dedos com regiões reais antes de pintar.
20. Ataques, candidato A **rejeitado**: criado em Blender isolado,
    `knife-motion-candidate-a/`. Preview real com override explícito em
    `knife-motion-candidate-a-runtime-3x2/`: esquerda avança, direita levanta
    e desce, porém o antebraço deforma/ocupa demais e encobre lâmina/mão livre.
    Crítico independente confirmou esses defeitos; não publicar. Versão
    `knife-animation-only.glb` incorpora APENAS Stab/Slash novos ao GLB de
    controle; `preservation.json` verifica buffers originais, meshes, nodes,
    skins, materiais, câmera, Idle e Draw intocados. Vídeo dessa versão em
    `knife-animation-only-runtime-3x2/` passou estado, não qualidade visual.
    Capturador `--asset-candidate` registra que é experimento, incluindo
    quick=Stab / heavy=Slash apenas nesta página; produção continua antiga.
21. Candidato B em `knife-motion-candidate-b/`: ombro/cotovelo/punho
    resolvidos juntos com comprimentos do rig existente, sem esticar o braço
    inteiro para alcançar a pose. `build-knife-motion-candidate.py` e
    `merge-knife-animation-candidate.mjs knife-motion-candidate-b` ficam em
    `artifacts/viewmodels/astra-series/`; .blend recuperável e GLB local.
    Preview `knife-motion-candidate-b-runtime-3x2/` passou estado, mas foi
    rejeitado visualmente: resolveu volume do braço, ainda esconde a lâmina.
22. Candidato C: corrige ponta legível no rápido e altura da descida.
    `knife-motion-candidate-c-runtime-3x2/` tem fotos/vídeo, porém a ponta
    aparenta atingir os dedos da mão livre. Rejeitado para promover.
    Candidato D recolhe a mão livre durante o pesado, preservando Idle e
    Draw; `knife-motion-candidate-d/knife-animation-only.glb`, com a mesma
    verificação de preservação. Preview D em andamento, ainda não aprovado.
    O script Blender local agora gera D; fontes A/B/C permanecem nos .blend
    e relatórios de suas pastas, não no script sobrescrito.
23. Skins: atlas UV real fotografado em `knife-blender-inspection/uv-regions.png`,
    derivado dos triângulos da malha (não concept art). Mãos e mangas ocupam
    ilhas separadas, os lados compartilham UV. É possível manter malha e rig
    e fazer textura por time, mas dedos sem luva exigem máscara própria.
    Esse atlas diagnóstico NÃO é textura final nem implementação das skins.
24. D em `knife-motion-candidate-d-runtime-retry-3x2/`: 19 fotos, 225 frames,
    comandos aceitos, sem erros. Crítico independente aprovou APENAS poses:
    ataques distintos, lâmina inteira, mão livre não cruza golpe, idle/retorno
    preservados. Ressalva: estocada rápida ainda discreta/diagonal. Não houve
    aprovação de timing nem do Ruben. Captura 16:9 concluída no marco 26.
    Primeira tentativa D (`knife-motion-candidate-d-runtime-3x2/`) é INVÁLIDA:
    zero frames; GLB carregou, mas sumiu da lista limitada de Resource Timing.
    Capturador agora registra URL da resposta real de rede no evento response,
    sem depender desse buffer. Não atribuir falha do diagnóstico ao jogo.
25. Medição de preservação de pegada em `knife-motion-candidate-d/grip-preservation.json`:
    dez poses no Blender, vértices por dedo no espaço da arma comparados ao
    Idle original. Indicador/médio/anelar/mínimo desviam <=0,001 mm; região do
    polegar até 4,234 mm e palma até 2,029 mm, por influência do rig durante
    a flexão. Não é transformação perfeitamente rígida de toda a mão nem
    certificado de contato/ausência de penetração. Não editar geometria para
    apagar essa diferença sem demonstrar defeito visual.
26. D também capturado em `knife-motion-candidate-d-runtime-16x9/`: 19 fotos,
    225 frames, 26 verificações, zero erros. Ambos os browsers receberam o
    mesmo candidato SHA-256 `bb349ccd19413159943fa84fe15aab82af4978f7453121699bb1239b72705ab2`,
    conferido contra o arquivo local. Folha 16:9 inspecionada: mantém lâmina
    legível, recolhe mão livre e retorna. Crítico reviu em 3:2 os quadros
    118–150, 156–180, 220–224 e overview espaçado: sem sumiço, salto evidente,
    mão cruzando lâmina ou clarão alheio nesse recorte. Não assistiu ao MP4,
    não conferiu todos os 225 quadros nem o 16:9. Sensação temporal pendente.
27. Revisão para o dono: `artifacts/viewmodels/astra-series/knife-motion-review.html`
    (autocontido, dois vídeos e três fotos; `make-knife-motion-review.mjs`).
    Verificado no browser: ambos vídeos 7,5 s, resoluções 960×640/960×540,
    sem erro, preview em `knife-motion-review-preview.png`. Declara claramente
    que é candidato e que skins ainda não estão aplicadas. Contrato da faca
    e docs continuam passando (`knife-candidate-tools-{contract,docs}.log`);
    sintaxe/diff limpos. Nenhum processo próprio de browser, servidor ou
    Blender permanece ativo. Os GLBs públicos/privados aprovados mantêm hashes.

## Revisão visual / limites da próxima família

### Aprovação e novo requisito de continuidade — 05/09

Ruben aprovou o movimento D: "os ataques a faca estao bom". A aprovação é
dos ataques, não da troca de luvas ou das proporções entre famílias. Novo relato:
"a luva muda da pistola pra faca? tem que ser a mesma luva?" e "a pistola
parece menor que a favca". Mesma facção deve manter a identidade de luva,
dedos e manga ao trocar de arma. Medir escala aparente e mão/arma nas duas
rotas; não presumir dimensões reais universais nem aumentar arma sem revisar
contato. Baseline visual: `knife-motion-candidate-d-runtime-retry-3x2/overview-sheet.png`.
Ataques promovidos localmente com nomes QuickThrust/HeavyStab e biblioteca
original preservada. A sincronização de impacto continua pendente: o dano do
Game ainda é imediato. Testar continuidade antes de ampliar o catálogo;
preservar AK e poses/mãos aprovadas.

### Marco 28 — integração D e identidade por time (local, em revisão)

- `tools/viewmodels/promote-knife-motion.mjs` verifica os hashes do original
  em `8f7c7280` e do D aprovado; conserva malhas, rig, câmera, materiais,
  buffer original e quatro clipes, acrescentando QuickThrust/HeavyStab.
  GLB promovido: 1.131.064 bytes, SHA-256
  `264eeee9e8f5dfcfa40d84f5e2d6a4ed2df681375b8074faaa078f2d1eb76acb`.
- Controlador real usa quick=.36 s, heavy=.62 s, sem avanço procedural extra.
  Régua nova: 4/6 falhavam antes; 6/6 passam depois; mutante mesmo-golpe falha.
  `hand-continuity/first-runtime-3x2/`: 19 fotos, 225 frames contínuos em tempo
  simulado, 26/26 verificações e zero erros; GLB servido com o hash acima.
- `vmhands.js` centraliza C branca, F preta sem dedos, B camuflada, E estrela,
  U sem dedos/quadriculado. Dois atlas UV diferentes, não duas identidades.
  `Game._switchTeam` atualiza ambos os controladores, inclusive armas já carregadas.
  O bind tardio de texturas compartilhadas não sobrescreve a identidade.
  31/31 verificações de continuidade/refresh; mutante falha em 15/31.
- Atlas próprios gerados por `tools/viewmodels/inspect-hand-continuity.py`
  (Blender isolado) e `build-team-hand-textures.mjs`: 24 WebP, 843.928 bytes.
  Dados intermediários ficam em `hand-continuity/`; não versionar malhas privadas.
  As superfícies ainda precisam de revisão visual por time, inclusive dedos,
  punho e relevo. Teste de identidade não certifica aparência idêntica de dois rigs.
- AK golden, GoldSrc e retarget ficam explicitamente fora desta primeira aplicação
  de atlas: não usar UV de KINEMATION neles sem inspeção. A extensão a TODAS as
  armas permanece no objetivo, não foi declarada pronta.
- Escala ainda em calibração. FOV carregado da faca = 29,241747° (32° era
  apenas fallback do controlador); pistola usa 55° de referência 16:9, convertido
  para o aspecto da tela. `vm-hand-continuity-runtime.mjs --sweep` captura as
  duas proporções e mede punho→base do dedo médio no Game; não mede comprimento
  físico universal nem certifica contato entre mão e arma.
- O usuário autorizou instalar Blender MCP se necessário. CLI Blender funciona;
  nada foi instalado e a sessão Blender do usuário não foi tocada.

### Marco 29 — calibração de tela e acabamento (06/09, candidatos)

- `lens-sweep-v2/`: 12 fotos reais, 3:2 e 16:9, câmera nativa/40/45/50/55°.
  Crítico independente prefere 50°, aceita 45° como alternativa de idle;
  rejeita a 29,24° como dominante e cortada. Não são medidas físicas de armas reais.
- `melee-framing-check.mjs` chama `Game.onResize` real: regra antiga falha
  em 1/2 verificações; correção e mutante demonstram preservação de largura
  em 3:2, 16:9 e 20:9. A câmera vem do GLB; nenhum segundo FOV oculto no runtime.
- Candidato `hand-continuity/knife-frame-50.glb`: apenas FOV exportado alterado,
  escala .0135 e offset [.18,-.12,-.25] preservados; SHA-256
  `3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621`.
  `motion50-3x2/`: 19 fotos, 225 frames, 26/26; clipes semânticos do controlador
  real, sem override de ataque. Caixa completa da faca em idle passou de
  x/W [.6432,1.0687] para [.5801,.8181]; vértices visíveis 4.329→5.262/5.262.
  O enquadramento 50° ainda é candidato local; não foi aprovado pelo Ruben.
- `teams-frame45/` e `teams-frame50-finish2/`: 20 fotos e 41 verificações por
  rodada. Crítico aprovou cor/identidade básica E/C/F, mas reprovou a superfície
  lisa da segunda tentativa e a borda sem dedos serrilhada. B precisa rever
  escala aparente do padrão; E/U precisam mostrar punhos da pistola.
- Acabamento v3 candidato: costura/dobra/bainha em atlas e height map próprios,
  sem normal/ORM gasto de outro donor. `bindSharedArmTextures` mantém o tratamento
  original somente em GoldSrc/retarget. Native não baixa os nove mapas descartados.
  Nova régua de acabamento: 5 falhas antes, depois zero; mutante PBR por arma falha.
  Não confundir este teste com aprovação visual. Recarga e inspeção de punho em
  `vm-hand-continuity-runtime.mjs --reload --inspection`; inspect sobe o pacote
  .14 m SOMENTE em QA, não representa o enquadramento normal do jogo.
  `teams-frame50-finish3/`: 60 fotos, 121 verificações, zero erros; visual em revisão.
  Inspeção do construtor identificou uma faixa de pele no punho da pistola E,
  ausente na faca; corrigir classificação dessa parte do atlas antes de aprovar.
- Fila completa atualizada em `VIEWMODEL-INVENTARIO.md`: 20 armas nesta lane,
  incluindo faca. Remoções de seis duplicatas foram decisão do dono em `84f691d1`;
  não ressuscitar a tabela de 26 da referência main. AWP e escopeta ainda não
  começaram nesta rodada; aguardam fechamento da revisão da faca.

- Abrir `artifacts/viewmodels/astra-series/review.html`, autocontido, e
  `knife-comparison.png` (antes/candidata 3:2). Gerador local `make-review.mjs`.
- Enquadramento e mãos aprovados pelo Ruben e aplicados (marco 12).
- Mão livre ainda tem acabamento anatômico simples; contato da mão forte
  parcialmente oculto por borda/HUD. Não chamar a família de golden.
- Mecânica rejeitada pelo Ruben: ver marco 16. Nova direção é estocada
  frontal / apunhalada de cima para baixo, preservando empunhadura.
- Comparação Blender→GLB→browser registrada no marco 14. Ainda falta concluir
  contato nas partes ocultas e revisar vídeo contínuo. A aprovação das mãos
  não é aprovação automática de toda mecânica/animação. Não substituir isso
  por caixas projetadas ou por pesos de ações.
- `tools/blender/viewmodels/inspect_knife_registration.py` aponta o donor
  `/Users/ruben/Downloads/knife_animated.glb` (existe, 5,3 MB). O builder exato
  do pacote atual não foi localizado entre os scripts versionados; não assumir
  que `tools/blender/goldsrc/knife.blend` é sua fonte nem reconstruir às cegas.
- Nos relatórios, peso isolado não significa contribuição: ações nunca
  iniciadas podem manter `weight=1`. A prova de transição usa a fixture animada
  e a inspeção das fotos, não a soma ingênua dos pesos.

## Comandos históricos para reproduzir (substituídos pelo marco 31)

```sh
export PATH=/opt/homebrew/bin:$PATH
npm run eval:melee-vm
node tools/eval/melee-motion-check.mjs --mutante=sem-clamp
node tools/eval/melee-motion-check.mjs --mutante=evento-antigo
node tools/eval/melee-runtime.mjs --porta=8347 --quadro-z=-0.25 \
  --saida=artifacts/viewmodels/astra-series/knife-review-new-3x2
node tools/eval/melee-runtime.mjs --porta=8347 --quadro-z=-0.25 \
  --largura=1440 --altura=810 --saida=artifacts/viewmodels/astra-series/knife-review-new-16x9
```

Os comandos com mutantes DEVEM sair 1; normal sai 0. Omitir `--quadro-z`
captura o padrão real. Não sobrescrever controles/artefatos de antes do conserto.

## Próxima ação concreta

### Marco 30 — fechamento solicitado, acabamento v5 e proporção local (06/09)

- Ruben pediu "vamos concluir a faca entao". Ataques D continuam aprovados;
  não reconstruir mãos/rig nem mudar sua mecânica visual. Objetivo completo de
  terminar o arsenal permanece, com AWP e escopeta na sequência canônica.
- Crítico novo, sem justificativas anteriores (`knife_finish4_critic`), examinou
  os 60 PNGs `teams-frame50-finish4/`: aprovou identidade/cobertura estática dos
  times e redução da ampliação da faca. Variações de UV B/U e estrela E parcialmente
  escondida na pistola não foram consideradas bloqueantes. Não certificou movimento.
- Inspeção adicional mediu a exceção restante F/U: landmarks UV do punho da
  pistola ainda tinham RGB [182,137,104]. O mesh `GEO_FP_SK_Hand` só alcança
  y=0,2211 no referencial punho→base do dedo médio; pontas articuladas estão no
  mesh `Glove`. Retirada a exceção que pintava esse mesh inteiro como pele.
  `vm-hand-atlas-check.mjs` lê WebPs públicos: v4 com 4/12 falhas, v5 com 12/12;
  mutantes de punho descoberto/dedos cobertos falham em 6/12 cada. Prova pixels
  amostrados, não toda superfície ou estética. Acrescentado a `eval:melee-vm`.
- V5: 48 mapas gerados, 1.257.526 bytes; sem editar UVs, rig ou animações.
  `vmhands.js` usa `team-hands-5`. AK e GLB da pistola mantêm seus hashes do
  início deste ledger. Rigs continuam distintos, não prometer a mesma malha 3D.
- `promote-knife-motion.mjs --fov=50` promoveu a lente ao GLB público local,
  sem alterar buffers originais ou clipes aprovados. SHA-256
  `3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621`;
  URL `knife-motion-d-frame50-2`. A aprovação visual do dono ainda é necessária.
- Tentativas `motion50-finish4-3x2/` e `final-default-3x2/` falharam antes de
  produzir frames: `page.goto: Timeout 180000ms exceeded`. Havia captura Amazônia
  simultânea; não atribuir a causa exclusivamente a ela sem diagnóstico adicional.
  Não reciclar estes relatórios falhos como evidência. Pedido assíncrono de
  coordenação enviado ao dono; nenhuma tarefa alheia foi interrompida.
- Novo gerador `tools/viewmodels/build-knife-final-review.mjs` preparado;
  recusa relatórios incompletos ou hashes diferentes do GLB público. Ainda não
  executado. Espera `final-default-3x2/`, `final-default-16x9/` e `final-teams/`.
- `check:fast` desta rodada: 61/66, 1.973,7 s; falhas mapid, docs:check,
  audio:check, feet:check e docsautoria. Log `finish4-check-fast.log` em
  `hand-continuity/`; não alterar dados de mapa/áudio/personagens para esta frente.
  Regenerar documentação após estabilizar fontes e repetir os checks afetados.

Próximo passo: revisar v5 no Game padrão, sem override, em 3:2/16:9 (um browser
por vez), rever vídeo e relatório com crítico, gerar `knife-final-review.html`,
guardar checkpoint e mostrar ao Ruben. Se um destino de captura acima já tiver
frames, preservar e usar diretório novo, atualizando o gerador. Conferência de
dano: Game ainda chama `_meleeHit` na aceitação do ataque; não foi introduzido
atraso/rebalanceamento nem mudança de protocolo multiplayer nesta correção visual.

### Checkpoint histórico — pedido de prompts paralelos, 06/09, antes do marco 30

- Ruben pediu prompts para abrir outras frentes. Preparados em
  `PROMPTS-PARALELOS-VIEWMODELS.md`: AWP, escopeta e Deagle/revólver, somente
  pré-produção offline em worktrees próprios. Nenhuma tarefa foi criada ou
  disparada aqui. Não altera o portão sequencial nem distribui o runtime/browser.
- Ampliação pedida em seguida: cada frente com worktree/branch próprios; prompts
  de rifles e precisão acrescentados ao mesmo documento. Rifles ficam com M4,
  MD97, carabina, SCAR, FAMAS e M92; precisão com Mosin, SVD e SKS. AWP continua
  exclusiva de sua frente. Instruções exigem conferir destinos reais de symlinks
  para não escrever em assets/dependências de outra lane. Nenhum worktree ou
  chat foi criado pela tarefa integradora nesta atualização; o escopo continua
  pré-produção offline, com incorporação e aprovação sequenciais.
- Revisão independente v3 concluída: reprovou a continuidade dos punhos nos
  times inspecionados; a pistola expunha pele entre luva e manga, diferente da faca.
  Esta rejeição substitui o estado "visual em revisão" do marco 29.
- Candidato de acabamento v4 gerado: fecha essa faixa pela classificação do atlas,
  reforça costura/bainha e inclui estrela/quadriculado também no painel da mão.
  A geometria e os ataques aprovados não foram reconstruídos. Fonte e texturas
  v4 permanecem modificados **sem commit**, fora do checkpoint documental dos prompts.
- `hand-continuity/teams-frame50-finish4/report.json`: captura encerrada normalmente,
  60 fotos, 121 verificações passando, zero erros; 48 texturas geradas,
  1.195.938 bytes. Isso prova carregamento/identidade, não aprovação visual.
  O candidato FOV 50 continua interceptado apenas na página de teste; o GLB público
  continua com FOV 29,241747°. Nenhum vídeo v4 está certificado.
- Processo próprio 52205 terminou; não há captura desta rodada aguardando polling.
  Retomar pela inspeção das fotos v4, depois revisão independente, movimento contínuo
  3:2/16:9, testes e checkpoint de implementação. Não regenerar antes de olhar.
  Inspeção QA `inspect-pistol` eleva o pacote .14 m e não é frame normal do Game.
- Verificação deste checkpoint documental: `git diff --check` e `arch:check`
  passam. `docs:check` aponta sete arquivos com blocos gerados desatualizados
  na árvore atual; não foram incluídos no commit dos prompts. Após fechar v4,
  executar `npm run docs` e repetir a checagem antes do checkpoint de implementação.

### Marco 31 — produto local recapturado e conferido, 06/09

- Branch `codex/vm-astra-pistol`, base desta conclusão `1ffbc452`. Mudanças
  limitadas à lane; nenhum push, merge, deploy, gasto ou instalação de MCP.
  AK e pistola mantêm os hashes do início. Comparação GLB anterior/atual confirma
  que **só `cameras[0].perspective.yfov` mudou**, 29,241747° → 50°:
  todos os buffers, rig, geometria, materiais e animações D são idênticos.
- Chrome instalado, perfil temporário/headless, `--browser=chrome`, resolveu
  a captura neste host. Não concluir que a concorrência era a causa única dos
  timeouts do Chromium/SwiftShader. `final-default-3x2-r2` foi interrompido
  explicitamente no processo próprio e não é prova de deadlock. Nenhuma sessão
  do usuário ou de outra tarefa foi encerrada. O pedido de coordenação não
  precisou ser executado: a outra captura terminou sozinha.
- `hand-continuity/final-chrome-{3x2,16x9}/runtime-report.json`: **27/27** cada,
  21 stills + 225 frames contínuos (7,5 s simulados) cada, oito comandos aceitos,
  zero erros. GLB público SHA `3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621`,
  sem candidato ou deslocamento experimental. Os MP4 não são benchmark FPS/áudio.
- `final-teams/` falhou antes de fotos: ausência da URL no buffer Resource Timing
  (`Cannot read properties of undefined (reading 'name')`). Capturador agora
  registra a resposta real por evento antes da navegação; não depende de um
  histórico finito. `final-teams-r2/report.json`: **60 fotos, 121/121**, zero
  erros; cinco times × dois formatos × idle/recarga/inspeção. As fotos
  `inspect-pistol` elevam y em .14 m só para QA; os pares da prévia são idle real.
- Crítico independente de movimento aprovou os dois aspectos: estocada e ataque
  elevado distintos, troca sem quadro vazio, retornos 172–174 e 220–224 sem salto,
  clarões antigos ausentes em 176–178/222–224. A lâmina cruza a mira brevemente
  no golpe pesado; idle deixa o centro livre. Revisou seis folhas e vizinhos
  críticos, não todos os 450 quadros individualmente nem contatos internos.
  O crítico dos materiais examinou **todos os 60 PNGs v5** e aprovou os cinco
  times nos dois formatos, inclusive dedos abertos F/U e continuidade dos
  punhos. Variação de densidade B/U e pequena exposição da estrela E na pistola
  continuam limitações de UV/pose, sem correção obrigatória nesta rodada.
- Blender 5.2 em background: `verify-final-knife.py` reutiliza o método de
  `knife-blender-contact.py`, sem alterar o GLB/sessão do dono. Oito renders e
  16 comparações de bounds deformados: máximo **0,0000023518 da tela** (<0,003 px
  em 960 px), limiar .0001. Relatório `hand-continuity/final-blender/report.json`.
  Cores Workbench diagnósticas, não materiais de jogo; não certifica penetração.
- `knife-final-review.html` (4.084.149 bytes) reúne antes/depois, vídeos e pares
  por time. Gerador recusa hashes divergentes e overrides. `final-review-page.json`:
  **7/7**, 28 imagens decodificadas, dois vídeos 960 px/7,5 s, reprodução e botões
  3:2/16:9 funcionando, zero erros. O antes/depois histórico difere em câmera
  de cenário, luz e renderizador; serve para enquadramento, não comparação de cor.
- `eval:melee-vm`, sintaxe dos scripts, `docs:check`, `arch:check`, shaderbudget
  SB1–SB7 e build passaram. Build em `finish5-build.log`; teste da faca repetido
  com exit 0 em `finish5-unit-final.log`. Atlas v5 **12/12**, mutantes falham
  conforme marco 30. `check:fast` completo anterior foi 61/66; docs regeneradas
  depois. `eval:docsautoria` requer docs commitadas (`DOCSAUT não dá para medir`),
  repetir após checkpoint. Mapid/audio/feet são falhas herdadas, não reparadas aqui.
- Dano continua imediato na aceitação de `_tryKnifeAttack`; nenhum atraso,
  balanceamento ou protocolo MP foi alterado. P4 de contato da pistola em 16:9
  continua insuficiente; mãos de AK/GoldSrc/retarget não receberam essas skins.

Reprodução (usar outro destino se já existir evidência):

```sh
export PATH=/opt/homebrew/bin:$PATH
npm run eval:melee-vm
node tools/eval/melee-runtime.mjs --browser=chrome --porta=8347 --largura=960 --altura=640 --video --flash-check --saida=artifacts/viewmodels/astra-series/hand-continuity/recheck-3x2
node tools/eval/melee-runtime.mjs --browser=chrome --porta=8347 --largura=960 --altura=540 --video --flash-check --saida=artifacts/viewmodels/astra-series/hand-continuity/recheck-16x9
node tools/eval/vm-hand-continuity-runtime.mjs --browser=chrome --reload --inspection --saida=artifacts/viewmodels/astra-series/hand-continuity/recheck-teams
node tools/viewmodels/build-knife-final-review.mjs
```

**Próximo passo:** checkpoint recuperável e `docsautoria` pós-commit;
mostrar `knife-final-review.html` ao Ruben. Só falta a aprovação
visual humana da **nova proporção e acabamento/continuidade**, não dos ataques
ou geometria já aprovados. Depois AWP → escopeta → catálogo inteiro; não retomar
a remodelagem da faca nem declarar o arsenal pronto. Nenhuma captura própria
ou Blender ficou ativo após estes relatórios. Atualizar este ledger por marco.

Prompt pronto para outra ferramenta: `PROMPT-CLAUDE-VIEWMODELS.md`.
