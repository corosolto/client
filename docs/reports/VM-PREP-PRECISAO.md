# Pré-produção offline: Mosin, SVD e SKS

## Resultado, definição de pronto e continuidade

Preparação investigada, sem produção de piloto: armas próprias, doadores, mecânica,
contatos, clipes, projeção e relógios foram examinados separadamente. AWP está fora.
A definição de pronto desta frente é entregar evidência reproduzível, receita por arma,
bloqueios explícitos e revisão independente; não inclui liberar `ready`, browser ou
aprovação visual. **Nenhuma destas três armas está certificada para produção.**

- Worktree exclusivo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao`.
- Branch: `codex/vm-prep-precisao`.
- Commit de entrada: `961c70d20a41336a53ba3b9abcc2068d3e7f9eb0`.
- Checkpoint inicial desta frente: `3a2c0a1a`.
- Checkpoint dos seis scripts de inspeção: `ca11c5a6`.
- Checkpoint de entrega: commit de documentação subsequente nesta branch, localizável
  por `git log -1 -- docs/reports/VM-PREP-PRECISAO.md`.
- Fonte integradora, somente leitura: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`, observada em `1ffbc452` na entrada.
- Autoridades lidas integralmente na integradora: `AGENTS.md`, `docs/LICOES.md`,
  `docs/development/VIEWMODEL-1P-PROFISSIONAL.md`, `VIEWMODEL-SERIES-HANDOFF.md`,
  `VIEWMODEL-INVENTARIO.md` e `PROMPTS-PARALELOS-VIEWMODELS.md`.
- Skills aplicadas: inspeção Blender/estado de movimento; revisão adversarial exigida
  pelo AGENTS. A restrição offline do pedido prevalece sobre workflows de browser.

O destino foi criado da base exigida após conferir worktrees/branch/HEAD/status.
Relatório, scripts e artefatos resolvem nesta lane, sem symlinks. Assets privados e
`node_modules` não foram instalados nesta frente. O private-assets da integradora é
local; seu `node_modules` resolve na Fable e não foi usado para escrita. Os FBX e o
unitypackage resolvem em `/Volumes/Zenith/Assets/game/corosolto/private-assets/` e foram
somente lidos. Havia mais de 1 TB livre. Não foi preciso copiar insumos pagos.

Marcos validados: inventário com hashes; vistas próprias; rejeição da importação Blender
padrão; nova inspeção com conferência direta glTF; identificação do desencontro temporal;
comparação de UV/skin; revisão independente. Aceitas como evidência técnica as medições
corrigidas, sem aprovação estética. Capturas da importação padrão são **rejeitadas**.
Runtime, materiais, atlas, fontes, GLBs servidos, câmera/HUD e ledgers globais intactos.
A preparação até `11975d47` foi local, sem navegador, servidor, reinstalação, compra,
push, merge ou deploy.

## Insumos, procedência e reprodução

Neste relatório, `A` é `artifacts/viewmodels/prep/precisao/` neste worktree;
`P` é `public/private-assets/viewmodels/` na integradora somente leitura.
`A/inventario.json` contém caminhos absolutos e reais, bytes, SHA-256, hierarquia,
transforms locais glTF, skins, materiais, accessors, câmera e biblioteca completa.
Inclui GLBs base/runtime/GoldSrc/retarget, `.blend` e todos os FBX encontrados por família.
Não se executaram builders. `.blend` foi inventariado/hasheado, não reexportado.

<!-- BEGIN:PRECISAO:insumos -->

| Arma / insumo | Caminho relativo | Bytes | SHA-256 |
|---|---|---:|---|
| mosin / own | `public/models/weapons/mosin.glb` | 283652 | `bea36493dc9005436e9e65d969ef3d9e480dedba6c76564200dc534d48ae39a9` |
| mosin / native | `P/bolt/bolt-runtime.glb` | 4267200 | `a6b2a701ac5419e84d74649625ab841d6ff9cdfd5619c05d75483d469b5ecebf` |
| svd / own | `public/models/weapons/svd.glb` | 427228 | `8ef2fe292c39a6a46a40500cdaf65900c7f3b1671d970ee382ab85b11de6b337` |
| svd / native | `P/svd/svd-runtime.glb` | 3938240 | `651820b606849f395eb2ca282e866813999af2cf0710706b71cf9ca1819bae12` |
| sks / own | `public/models/weapons/sks.glb` | 434328 | `5c88a3ab53e236f0557bf974cff79d63351cf5331ba3e710a0698f5045a8936a` |
| sks / native | `P/marksman/marksman-runtime.glb` | 4338692 | `bc4e8a11cc977583e93b15258bcafc9de750fac2c8a348b5e93ef3e50daebe3b` |

<!-- END:PRECISAO:insumos -->

Fontes próprias: `public/models/weapons/{mosin,svd,sks}.glb`. Histórico de introdução:
Mosin `fffafd7f`; SVD `85eb32bc`; SKS `c1179845`. `public/js/weapons.js:1` declara o
pack Mint; os dois últimos commits descrevem geração própria no Mint. Isso é procedência
registrada pelo projeto, não uma auditoria de recibos/termos individuais. Não foi encontrado
um documento de licença específico de cada arma nessa pasta. Não inferir uma licença de
arte a partir da AGPL do código; a promoção deve conservar a procedência do integrador.

Manifesto pago: `tools/viewmodels/paid-pack-manifest.json:3` declara KINEMATION,
`Fab Standard License` e `redistributableAsSource:false`. Não houve revalidação jurídica
externa. Pacote local `fpsanimationpack_ultimate.unitypackage`:
SHA-256 `7676907d1f278c611219fb5b97a2edc87e7e58ec2f26d50f5c8e08d4387fde55`.
Não versionar pacote, FBX, malhas ou intermediários privados.

Os FBX ficam sob `/Users/ruben/csbrasil-private-assets/generated/extracted/Assets/KINEMATION/FPSAnimationPack/Animations/`:

| Arma | Família / subdiretório | Fonte concreta principal | Correspondência declarada |
|---|---|---|---|
| Mosin | `bolt` / `Kar98K` | `Character/A_FP_Kar98K_Pose.FBX`, `Weapon/A_W_Kar98K_Pose.FBX` | `close`, outra arma |
| SVD | `svd` / `SVD` | `Character/A_FP_SVD_Pose.FBX`, `Weapon/SVD.FBX` | `exact` no manifesto, sem identidade geométrica comprovada com Mint |
| SKS | `marksman` / `Mk14EBR` | `Character/A_FP_MK14_Idle.FBX`, `Weapon/MK14.FBX` | `proxy`, outra arma |

As três variantes `<arma>-baked-runtime.glb` estão ausentes. GoldSrc e retarget existem
por arma, com hashes e clipes em `inventario.json`; não são o caminho nativo nem solução
certificada. `build_goldsrc_all.mjs:22` associa Mosin a scout e SVD/SKS a g3sg1.
A declaração CC0 do dono para os moldes é histórica em `public/models/viewmodels/FONTE.md`;
não foi tratada como autorização para copiar conteúdo novo ou alterar a trilha bloqueada.

### Método e limites observados

`precisao-inventario.py` lê os chunks GLB; `precisao-blender.py` importa em processo isolado,
mede malhas deformadas/BVH, bones e projeção e produz Workbench de baixa resolução.
`precisao-gltf.py` avalia TRS e samplers diretamente, independentemente de bpy;
`precisao-resumo.py` compara accessors e percorre todos os keyframes mecânicos.
`precisao-fontes.py` apenas importa três FBX e lê FPS/faixas, sem exportar.
`precisao-verificar.py` compila os scripts, confere hashes de insumos e medições
esperadas e grava o manifesto de saídas; não substitui inspeção visual.

Blender 5.2.0 LTS, dois threads por processo, execuções sequenciais. A opção padrão
`bone_heuristic=BLENDER` gerou arma cerca de 112 unidades distante das mãos. A leitura
binária do GLB contradisse esse resultado. `TEMPERANCE` preservou as posições dos joints;
`A/import-temperance.log`, `gltf-matrizes.json` e os campos `gltf_joint_position_errors`
registram a conferência em todas as poses amostradas. A causa exata do importador não foi
corrigida. **Não confundir artefato de importação com defeito no Game.** A pasta
`A/importacao-blender-default-invalida/` preserva as capturas/JSONs rejeitados.

<!-- BEGIN:PRECISAO:medidas -->

| Arma própria | Extensão X / Y / Z | Vértices | Ilhas por índice | Poses nativas | Erro máximo joint glTF ↔ Blender |
|---|---|---:|---:|---:|---:|
| mosin | 0.998047 / 0.099609 / 0.251953 | 6478 | 897 | 42 | 3.6084278e-06 |
| svd | 0.998047 / 0.087891 / 0.208984 | 6444 | 963 | 21 | 3.3050023e-06 |
| sks | 0.998047 / 0.076172 / 0.224609 | 6969 | 1141 | 21 | 3.3255812e-06 |

| Doador em idle / luva inteira | Mediana esquerda / direita | P95 esquerda / direita |
|---|---|---|
| mosin | 0.013378 / 0.031545 | 0.045719 / 0.067775 |
| svd | 0.016620 / 0.010708 | 0.052935 / 0.050196 |
| sks | 0.008978 / 0.014140 | 0.046716 / 0.042132 |

<!-- END:PRECISAO:medidas -->

Unidades acima são de cena, em Blender Z-up, sem inferência física pelo FOV. A extensão
principal das próprias é normalizada; `CFG.len` prescreve escala do jogo, não comprova
medida física da arma. As vistas ortográficas autoenquadram cada arma e **não** comparam
comprimento aparente entre elas. Fragmentos por conectividade de índices não são peças:
seams/duplicações de vértices geram centenas de ilhas.

As distâncias medem superfícies do **doador**, não a montagem da arma própria. Mediana
sobre toda a região da luva não é mediana de pontos que deveriam encostar. A distância
sem sinal não demonstra ausência de penetração; mínimo quase zero não demonstra pegada.
`piece_distances` restringe faces pelos pesos da peça e mede origem dos bones da mão;
isso localiza uma investigação, não certifica contato dos dedos. Não há contato 3D
certificado da Mosin/SVD/SKS própria: faltam montagem e ações autoradas com elas presentes.

Sete fases por clipe (0/.18/.35/.5/.62/.86/1) são amostras, não varredura contínua.
Por isso o resumo lê **todos** os keyframes e fornece extremos/futuros frames críticos.
`projection_native` conta vértices, não pixels, e seus bounds não recortam o near plane;
extremos enormes perto da câmera não são caixas de pixels. Não usar esses bounds para
aprovar enquadramento. Workbench não valida texturas, reflexos ou lente óptica.

## Relógios e rota existente

As três famílias têm `ready:false` em `public/js/data/vmconfig.js:16`; o jogo normal
permanece no legado. `familyFor`, `entryKeyFor` e `urlForKey`
(`authoredvm.js:232`) descrevem o caminho nativo eventual/override. As três entradas
herdam `parts:null`, sem `baked`. `attachMintWeapon` (`vmweapon.js:132`) oculta o pack,
monta a própria rígida pelo centro das caixas e só chama `splitParts` se configurado.
**Os bones mecânicos do donor não animam automaticamente as peças próprias.**

| Arma | Capacidade | Intervalo entre tiros | Recarga total | Relógio visual herdado do tiro |
|---|---:|---:|---:|---:|
| Mosin | 5 | 1,50 s | 3,40 s | 1,286 s de estado; clipe `shoot` nativo 1,50 s |
| SVD | 10 | 0,28 s | 3,00 s | 0,50 s de estado; sem `shoot` nativo |
| SKS | 10 | 0,18 s | 2,60 s | 0,50 s de estado; sem `shoot` nativo |

Fonte reproduzível: `rg -n 'mosin:|svd:|sks:' public/js/data/weapons.js` e
`VM_FAMILY`, `AuthoredViewModels.shoot` (`authoredvm.js:765`). SVD/SKS têm `auto:true`
no Game; isso é comportamento do jogo, não uma descrição da arma real. Não mudar
balanceamento nesta frente. Não acrescentar gesto manual de ferrolho após cada tiro nelas.

`Game._startReload` (`game.js:3133`) fixa o deadline; `_updatePlayer` (`:5593`) entrega
munição no fim, sem evento por cartucho, inclusive percorrendo todos os slots de munição.
`_tryShoot` (`:3219`) bloqueia disparo durante recarga; `_switchWeapon` (`:3075`) zera
reloadUntil. Não há aqui recarga parcial interrompível por disparo. `_reloadLayers`
(`:3155`) dispara sons em .18/.62/.86 da duração, sem vínculo com os keyframes.

`AuthoredViewModels.reload` (`:725`) repete o loop da Mosin conforme faltamBalas;
mesmo vazia, `bolt_loop` prefere start/loop/end à ação `reload_empty` disponível.
Tempos nativos da sequência: 1,266667 + N × 0,766667 + 1,966667 s.
Com N=1, total 4,00 s; com N=5, 7,066667 s; `_sequence` comprime tudo para 3,40 s.
Os fatores de playback são 1,17647 e 2,07843. Alimentação vista e munição do Game
precisam continuar distintas no relatório de validação, sem prometer munição por loop.

`draw` usa `equip_rifle` de `shared/general-runtime.glb` se disponível, ou arco procedural.
Nenhum pacote próprio destas três traz equip ou inspect. A trava de saque do Game com
GUNFEEL é 0,45 s (`game.js:3072`); o ramo CS16 pede saque visual de 1 s. Validar a janela
entre tiro liberado e mãos ainda em saque. A biblioteca General não foi certificada aqui.

### Desencontro temporal comprovado no GLB disponível

<!-- BEGIN:PRECISAO:tempos -->

| Arma / ação nativa | Última key dos braços (s) | Última key da arma (s) |
|---|---:|---:|
| mosin / `reload_empty` | 4.666667 | 2.350000 |
| mosin / `reload_start` | 1.266667 | 0.650000 |
| mosin / `reload_loop` | 0.766667 | 0.400000 |
| mosin / `reload_end` | 1.966667 | 1.016667 |
| mosin / `shoot` | 1.500000 | 0.766667 |
| svd / `reload_tactical` | 3.166667 | 1.600000 |
| svd / `reload_empty` | 3.500000 | 1.766667 |
| sks / `reload_tactical` | 2.666667 | 2.683333 |
| sks / `reload_empty` | 3.316667 | 3.333333 |

<!-- END:PRECISAO:tempos -->

`A/resumo.json → channel_timing` mede o último input de canais dos joints de cada skin.
SVD/Mosin encerram a parte mecânica perto da metade do tempo dos braços; SKS difere em
um frame a 60 Hz. Isso não prova sozinho em qual frame o contato falha, mas impede
assumir sincronismo. Escalar a ação inteira para o deadline do Game preserva a diferença.

`A/fbx-fps.json` confirma Mosin firing e SVD reload_empty importados em 30 fps; SKS
reload_empty em 60 fps. O conversor `convert_weapon_clip_fbx.py:18` muda para 60 após
importar, sem retimar keys. **Hipótese de origem**, não causalidade fechada: o
`mergeSamples` atual (`assemble_paid_family.mjs:395`) já normaliza cada sample pela
sua duração, e os GLBs observados não refletem esse alinhamento. Antes de modificar o
conversor, rastrear a versão que produziu estes GLBs e verificar saída nova do montador
em destino isolado. Não executar o builder antigo sobre a pasta compartilhada.

## Mosin: receita específica

Evidências: `A/mosin-own-{lateral,superior}.png`, `mosin-native-idle-720x480.png`,
`mosin-native-shoot-0.5.png`, `mosin-native-reload_empty-0.62.png` e JSONs correspondentes.
A própria tem coronha, luneta, alavanca lateral e volume inferior integrado. O donor
Kar98K possui `Bolt`, `StaticBolt`, `Trigger`, `Cartridge`, `Clip` e cinco CartridgeClip;
a vista nativa não mostra a luneta da própria. Não há carregador removível ou pente
separado comprovado na Mosin própria. A capacidade de cinco vem do Game.

Defeito comprovado: corpo próprio monolítico, sem peça acionável ou contatos nomeados;
trilha temporal do donor dessincronizada. Hipótese a resolver: acesso superior limitado
pela luneta e seu suporte. Não importar `Clip` e cartuchos do Kar98K como geometria final.

Receita mínima, depois dos pilotos obrigatórios:

1. Abrir cópia de trabalho explicitamente local da arma própria pelo hash; preservar
   silhueta/UV. Delimitar visualmente alavanca e conjunto do ferrolho, sem usar as ilhas
   de vértices como peças. Criar pivôs separados somente para regiões comprovadas;
   curso e eixo são medidas da geometria ainda pendentes, não valores do Kar98K.
2. Autorar `weapon_root`, `grip_r`, `support_l`, `muzzle`, `shell_eject`, `sight`,
   `bolt` e acesso de alimentação. Marcar `magazine` como não aplicável até a solução
   de alimentação estar comprovada. Posicionar sockets sobre superfícies reais.
3. Manter esquerda no apoio durante a operação; direita sai da empunhadura, chega à
   alavanca, levanta/recua/avança/fecha e retorna. Conferir polegar/indicador e luneta
   em vista externa. O gesto do donor serve de referência, não encaixe automático.
4. Para recarga, testar acesso de cartucho individual primeiro como **candidata**,
   condicionado à abertura e à passagem da mão. Se obstruído, registrar bloqueio de
   geometria; não mudar a luneta nem inventar um pente para satisfazer um clipe.
   O donor oferece reload_loop e reload_empty com pente, mas só o primeiro pode ser
   candidato ao contrato atual bolt_loop após revisão concreta.
5. Resolver primeiro o tempo relativo arma/braços, depois distribuir start/N loops/end
   nos 3,40 s do Game. Preservar o deadline e testar N=1 e N=5, reserva menor e troca.
   Autorar equip/inspect específicos e impedir pop no retorno ao idle.

Frames críticos a 60 Hz de referência: disparo em 0,0; 0,28333 s (rotação de Bolt,
f17); 0,35 s (recuo máximo de StaticBolt, f21); 0,75 s (f45); 1,50 s (f90).
São extremos do GLB atual, **não alvos aprovados de timing**. A rotação relativa do
Bolt atinge aproximadamente 80,88° nos keyframes; não transferir esse ângulo ao modelo
próprio sem conferir seu eixo. Reload_start: f19/rotação de Bolt; loop: f5/extremo de Cartridge;
reload_end: f17 e f21; reload_empty: 1,65 s/pente máximo e 1,75 s/rotação.
Conferir ainda antes/depois de cada loop e 3,40 s/+0,15 s no relógio do Game.

Enquadramento: avaliar comprimento do cano, parte posterior, luneta e mão direita em
3:2/16:9. O donor corta grande parte da empunhadura no quadro; a mão de apoio aparece
junto à arma. Essa imagem não resolve a luneta própria nem o contato oculto.

## SVD: receita específica

Evidências: `A/svd-own-{lateral,superior}.png`, `svd-native-idle-720x480.png`,
`svd-native-reload_empty-0.62.png` e JSONs. A própria tem luneta, coronha vazada,
empunhadura e carregador saliente identificável. Ainda é uma malha única. O rig do
pack oferece `Bolt`, `Mag`, `MagRelease`, `Safety`, `Trigger`, `neutral_bone`.
Não há clipe nativo shoot/equip/inspect; não tratar Bolt como ação manual obrigatória
entre tiros. A luneta própria não está validada pelo enquadramento do donor.

1. Separar, em cópia local futura, o carregador que está desenhado e a alavanca/conjunto
   móvel identificado no receptor. Preservar encaixe e orientar pivô pelo asset.
   Criar `magazine`, `magazine_insert`, `bolt` e os sockets comuns sobre peças reais.
2. Usar reload_tactical como estudo de retirada/substituição, mantendo a mão forte
   presa à empunhadura. A esquerda deve sair do apoio, visitar a trava se aplicável,
   retirar o carregador, inserir e voltar. Não aceitar palma próxima de qualquer
   ponto da arma como prova de segurar o carregador.
3. Na vazia, conferir a ação adicional da alavanca/Bolt existente no donor; na tática,
   não acrescentar esse gesto por costume. Corrigir tempo relativo antes de retarget;
   ajustar os clipes resultantes para 3,00 s sem mexer na munição/cadência do Game.
4. Autorar ciclo visual de disparo/ejeção específico para a SVD própria e recuperação
   que comporte tiros a cada 0,28 s, sem visita manual da mão a cada tiro. Equip,
   inspect e retorno da esquerda exigem autoria com a coronha/carregador concretos.

Frames críticos nativos: tactical Mag 0,466667 s (f28) e rotação 0,50 s (f30);
empty Mag 0,466667 s e Bolt 1,166667 s (f70); comparar fases correspondentes dos braços
aproximadamente duas vezes depois, antes de retimar. Na ação final: trava, retirada
completa, primeira entrada, assentamento, alavanca na vazia, regrip, deadline 3,00 s
mais blend. Validar tática e vazia separadamente, não apenas suas durações.

Enquadramento: deixar reconhecíveis empunhadura/coronha vazada e espaço da luneta;
medir mão no carregador durante retirada e inserção nas duas proporções. O idle do donor
esconde a mão forte e a recarga 62% mostra uma mão à direita sem provar contato com
carregador. Exigir close externo com identificação de superfície para explicar esse frame.

## SKS: receita específica e decisão ainda bloqueada

Evidências: `A/sks-own-{lateral,superior}.png`, `sks-native-idle-720x480.png`,
`sks-native-reload_empty-0.62.png` e JSONs. A própria tem luneta, abertura superior,
ressalto/alavanca no receptor, volume inferior curto e conjunto longitudinal sob o cano
(histórico Mint chama de baioneta dobrável; nenhuma articulação está implementada).
O volume inferior **não comprova carregador removível** nem pente de alimentação.

O proxy Mk14EBR fornece `Bolt`, `Handle`, `Mag`, `ReleaseHandle`, `Sight`, `Trigger` e
recargas de carregador. Não há shoot/equip/inspect. Proximidade de nomes de família não
resolve a diferença entre coronha SKS e chassi/empunhadura do donor.

1. Primeiro identificar no modelo próprio a boca de alimentação, limites do volume
   inferior e acesso com a luneta. Este é um **bloqueio de decisão geométrica** para
   produção, não ausência de arquivo. Documentar desenho/seleção das regiões antes
   de escolher carregador destacável ou alimentação superior.
2. Se a geometria sustentar alimentação superior, autorizar gesto/cartuchos compatíveis
   e exigir ação própria; não há loop SKS certificado nem pente existente a reutilizar.
   Se sustentar caixa destacável, separar apenas aquela peça com encaixe medido e
   reautorizar a trajetória. Se nenhuma solução estiver demonstrada, manter bloqueada.
3. Em qualquer ramo, mão direita precisa aderir à empunhadura da coronha concreta;
   mão esquerda migra do guarda-mão para o ponto efetivo de alimentação. O rig/UV comum
   pode ser reutilizado, mas os clipes Mk14 de Mag não são receita final da SKS.
4. Preservar Game com dez munições, recarga total 2,60 s e intervalo 0,18 s. `auto:true`
   é o comportamento atual, não tarefa para rebalancear. Criar disparo visual de ciclo
   próprio sem ferrolho manual a cada tiro e ações equip/inspect/regrip específicas.

Frames críticos do proxy para diagnóstico: tactical Mag 1,133333 s (f68), empty Mag
0,55 s (f33) e rotação 0,566667 s (f34), Bolt/Handle 2,516667 s (f151). Esses frames
localizam a incompatibilidade a estudar; não devem ser copiados como eventos SKS.
Após decidir a alimentação: contato de entrada, cada inserção ou assentamento,
fechamento, retorno ao apoio e 2,60 s/+0,15 s do Game.

Enquadramento: medir a luneta própria, coronha tradicional e conjunto sob o cano sem
usar o comprimento aparente do MK14. A mão forte também fica cortada no idle nativo;
nenhuma das imagens permite inferir ausência de colisão durante a recarga própria.

## Integração mínima proposta por símbolo, para depois do portão

| Local / símbolo | Ação futura mínima e motivo |
|---|---|
| Novo builder por arma com entradas/saídas explícitas | Separar peças reais, autorar contatos/ações e exportar câmera/sockets junto; não espalhar offsets compensatórios |
| `assemble_paid_family.mjs::mergeSamples` | Conferir que a saída usa a normalização já existente; rastrear versão dos GLBs antes de propor outro remendo |
| `convert_weapon_clip_fbx.py` | Investigar FPS das fontes com `fbx-fps.json`; só corrigir se a normalização final não resolver fase/contato |
| `vmconfig.js::VM_WEAPON` | Incorporar pacote próprio quando aprovado; não transformar `parts:null` em caixas adivinhadas nem liberar ready nesta preparação |
| `vmweapon.js::attachMintWeapon/splitParts` | Montagem rígida por AABB não satisfaz o contrato; preferir pacote próprio autorado offline em vez de retarget ao vivo |
| `authoredvm.js::reload/shoot/draw/_continue` | Verificar N loops, retorno, tiros rápidos, ação de saque e ausência de clipe; não presumir que relógio de estado é duração mecânica |
| `game.js::_startReload/_reloadLayers/_updatePlayer` | Documentar entrega de munição/sons versus eventos visuais e testar cancelamento; qualquer mudança funcional cabe à integradora |
| `authoredvm.js::cameraSpacePackage/FAMILY_FRAME` | Resolver câmera exportada versus override em produção, mantendo a projeção única exigida pelo contrato |
| `vmhands.js::applyTeamHandMaterial` | Reutilizar identidade central por time e atlas do layout pistol após aprovação central; sem nova luva por arma |

Câmeras dos três natives: yfov 80°, aspect 16:9, near 0,01/far 50, mesma transformação
exportada. `FAMILY_FRAME` (`authoredvm.js:214`) usa fov84 e offsets próprios de bolt/svd/
marksman; `cameraSpacePackage` devolve o fov do frame, e `fov` (`:500`) conserva a
meia-tangente horizontal por aspecto. As fotos Blender nativas não reproduzem esses
overrides ou a montagem Mint. Não ajustar câmera compartilhada a partir delas.

No Game, as três têm `scope:true`; `_zoomFov` fornece 20/30/32 para Mosin/SVD/SKS.
`_scope`/`_updatePlayer` usam máscara de luneta e ocultam a VM quando a máscara supera
.55 (`game.js:5590`); não é visão óptica através do mesh. Mosin sai da mira ao disparar
(`:3300`); SVD/SKS permanecem. Validar ida/volta da máscara e centro da mira, além do mesh.

## Identidade das mãos e dependências

`A/resumo.json → uv` compara accessors decodificados, não apenas hashes de bufferView:
TEXCOORD_0, índices, JOINTS_0 e WEIGHTS_0 são iguais à pistola nas três malhas
`Plane.004`, `Plane.005`, `Hand-Tool1.008`; materiais Cloth/Glove/Hand correspondem ao
classificador central. O rig dos braços tem as mesmas 67 joints, inclusive dedos/twists.
Isso sustenta reaproveitar o layout de atlas. Não garante poses, anatomia, oclusão,
aparência idêntica ou aprovação dos punhos. Acabamento v4 continua na integradora e
não foi copiado. AK golden e yaw15° da pistola permanecem preservados.

Depois de aprovado, o piloto AWP pode fornecer o procedimento de validação de arma
longa, lente/retorno de ADS, nomeação de sockets e disciplina de contato no ferrolho.
Não fornece escala, offsets, luneta, carregador ou animação pronta para nenhuma destas
armas. Mosin exige sua operação manual e alimentação; SVD e SKS exigem seus próprios
ciclos/recargas. AWP e escopeta ainda dependem do portão sequencial da integradora.

## Validação futura Blender → GLB → Game

1. Confirmar hash da geometria e licença/procedência da cópia de trabalho; medir partes,
   eixos, superficies de contato e câmera antes de animar. Fail-fast se faltar insumo.
2. No Blender: idle/equip/tiro/recarga/inspect, mão forte/apoio/peça em vistas externas,
   dedos e faces internas; amostrar extremos reais dos keyframes e transições. Medir
   distância com sinal ou interseção e contato da peça correta, não só osso→arma.
3. Exportar/reimportar GLB verificando matriz de câmera, skin, UV, sockets, clipes e
   sincronismo de cada canal. Usar conferência glTF independente para evitar repetir
   o artefato do Blender. Confirmar frames de regrip e fronteiras de loops/blends.
4. Integradora, único browser: Game real em 1440×960 e 1440×810, mesma pose e projeção
   do Blender. Mostrar hands por time, luneta, troca, tiros, recarga tática/vazia,
   reserva curta e cancelamento por troca; vídeo sem cortes, erros e GLB servido/hash.
5. Verificar ciclos no deadline e tiro imediato após saque/recarga. Mosin N=1/N=5,
   SVD disparos a cada .28 s, SKS .18 s. Não aceitar sumiço/abaixar arma como recarga.
   Regressão de AK/pistola/faca, revisão adversarial e aprovação de Ruben por último.

## Verificações desta entrega e próximo comando

Inspeções GLB e Blender executadas; FPS FBX conferido; accessors de luvas comparados;
leitura independente glTF conferida em todas as poses coletadas. Revisão adversarial
com contexto limpo confirmou geometria observável, restrições das métricas e divergência
arma/braços; corrigiu a hipótese simplista de culpar apenas o conversor e a afirmação de
igualdade temporal exata na SKS. Registro em `A/revisao-independente.md`.
Checks finais e hashes de saídas: `A/verificacao.json`, `A/artefatos-sha256.json`.
Resultado: seis scripts compilados, 63 insumos com SHA-256 inalterado e 84 poses
conferidas; erro máximo de posição de joint inferior a 0,000004 unidade de cena.
As três famílias preservam UV, índices e pesos da referência pistol examinada.
Não se rodou a suíte global, pois ela produz saídas fora da faixa e inclui rotas alheias;
a validação desta entrega cobre os scripts e os insumos examinados, não o Game.

Para reproduzir, no worktree exclusivo (Python/NumPy e Blender já disponíveis):

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao
export PATH=/opt/homebrew/bin:$PATH
python3 tools/viewmodels/prep/precisao-inventario.py
python3 tools/viewmodels/prep/precisao-gltf.py
for arma in mosin svd sks; do
  for tipo in own native; do
    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python-exit-code 1 --python tools/viewmodels/prep/precisao-blender.py -- --arma "$arma" --tipo "$tipo" --render
  done
done
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python-exit-code 1 --python tools/viewmodels/prep/precisao-fontes.py
python3 tools/viewmodels/prep/precisao-resumo.py --relatorio > artifacts/viewmodels/prep/precisao/resumo.log
python3 tools/viewmodels/prep/precisao-verificar.py
```

`--tipo own` produz as vistas da arma própria; `precisao-fontes.py` confere FPS.
Inspeções reescrevem apenas os artefatos próprios; `--relatorio` atualiza as três tabelas
geradas deste relatório. Arquivar uma rodada antes de comparar versões.
Não executar `bake_family.mjs`: contém PRIVATE_ROOT fixo compartilhado. O assembler
aceita output, mas `rawRoot` vem do manifesto: output sozinho não isola o builder.

Próximo passo de produção, **da integradora após os pilotos**: rastrear o build dos
natives temporalmente antigos, fixar os insumos e autorar primeiro a solução concreta
de cada mecanismo. SVD tem carregador visualmente delimitável; Mosin exige acesso sob
a luneta; SKS permanece bloqueada na decisão de alimentação. Esta frente encerra na
pré-produção e preserva esses bloqueios, sem promover o arsenal.

## Encaminhamento para PR

Ruben autorizou continuar e abrir um PR desta worktree. A preparação está concluída;
as pendências de animação e validação no Game pertencem à produção da integradora.
Em nova conferência de 06/09, a frente de rifles já publicou a base comum
`codex/vm-prep-base-961c70d2` em `corosolto/client`, exatamente no checkpoint
`961c70d20a41336a53ba3b9abcc2068d3e7f9eb0`. Isso resolve a pendência anterior:
não é necessário criar outra referência de base ou publicar a branch integradora.

Publicar `codex/vm-prep-precisao` e abrir PR em rascunho contra essa base, com somente
este relatório e os seis scripts próprios. Conferir base/head, os sete arquivos e
nenhum auto-merge. Assets e evidências brutas continuam locais em `A/`; o corpo
preparado fica em `A/pr-body.md`. Registrar número/URL do PR após a criação.

O hook `pre-push` chama `eval:mapcontrato`, cujo harness (`tools/eval/harness.mjs:116`)
cria `node_modules/three` fora da faixa de escrita autorizada. Esta publicação de
preparação usa sua opção documentada `PREPUSH=0`, preservando a faixa. Conferir
separadamente diff, autoria dos commits e integridade offline; os gates globais,
build e Game não são declarados aprovados. O rascunho evita o preview automático
de runtime herdado (`preview-build.yml` ignora drafts).
