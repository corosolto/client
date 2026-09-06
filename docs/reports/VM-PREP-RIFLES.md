# Preparação offline dos rifles

## Resultado e definição de pronto

Preparação de M4, MD97, carabina, SCAR, FAMAS e M92, em 06/09/2026.
Os insumos existem, mas nenhuma das seis armas está certificada. Os GLBs
próprios são estáticos; os pacotes B/C contêm fragmentos inadequados chamados
`MINT_WEAPON_MAG_*`. A carabina tem alavanca e tubo sob o cano; FAMAS é
bullpup; MD97 não tem carregador no GLB bruto. Portanto a receita M4 não
pode ser aplicada automaticamente a esta família de configuração.

Definição de pronto **desta preparação**: inventário com hashes, diagnóstico
reproduzível, separação entre evidência e hipótese, receita por arma, dependências,
plano de validação e checkpoint somente deste relatório e dos scripts próprios.
Produção, Game/browser, incorporação e aprovação visual continuam na integradora,
na ordem faca/pistola → AWP → escopeta → demais armas. AK golden preservada.

## Continuação, checkout e insumos

- Worktree físico exclusivo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles`.
- Branch: `codex/vm-prep-rifles`.
- Entrada: `961c70d20a41336a53ba3b9abcc2068d3e7f9eb0`; commit confirmado antes da criação.
- Fonte integradora somente leitura: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`.
  HEAD observado na entrada: `1ffbc452caad15836cb557b94c70d5755416444b`.
- `git worktree list`, branch, HEAD e status conferidos: destino/branch não existiam;
  criados do checkpoint, sem reset nem cópia do acabamento v4 modificado.
- `docs/reports`, `tools/viewmodels/prep` e `artifacts/viewmodels/prep/rifles`
  resolvem dentro desta lane, sem symlinks. `node_modules` e assets privados
  ausentes aqui. Nenhuma instalação. Dependências da integradora resolvem para
  Fable, mas não foram usadas nem alteradas.
- `public/private-assets/viewmodels` da integradora é diretório físico local.
  FBXs pagos: `/Users/ruben/csbrasil-private-assets/generated/extracted`, realpath
  `/Volumes/Zenith/Assets/game/corosolto/private-assets/generated/extracted`.
  Somente leitura; nenhum builder com `privateRoot` padrão executado.
- Lidos integralmente prompts, AGENTS, LIÇÕES, contrato profissional e os dois
  ledgers vivos na integradora. Os ledgers globais não foram editados.

Abreviações deste relatório: **R** = worktree Rifles acima; **I** = integradora;
**P** = `I/public/private-assets/viewmodels`; **A** =
`R/artifacts/viewmodels/prep/rifles`. Caminhos abaixo usam essas raízes explícitas.
`A/inventory.json` registra caminho absoluto, realpath, tamanho e SHA-256 completo
por insumo, inclusive fontes FBX/anim, fontes de família, código e documentos lidos.

### Fontes e procedência

| Armas | Fonte concreta | Evidência e limite de licença |
|---|---|---|
| M4 | `R/public/models/weapons/m4.glb`, nó `assault_m4` | Asset próprio descrito como Mint em `weapons.js:1`; introdução `adab1e6d` |
| MD97/carbine | respectivos GLBs em `R/public/models/weapons/` | Introdução `fffafd7f`; modelos próprios, não o doador de animação |
| SCAR/FAMAS | respectivos GLBs em `R/public/models/weapons/` | Introdução `12604c7b` |
| M92 | `R/public/models/weapons/m92.glb`, nó `Wood Booster Draco` | Asset Mint existente; nome interno não é rig nem comprovação de modelo exato |
| ar | `P/ar/ar-runtime.glb`; fontes `ar.blend`, `ar.glb` | `paid-pack-manifest.json:3`: KINEMATION, Fab Standard License, `redistributableAsSource:false` |
| ak usada pela M92 | `P/ak/ak-runtime.glb`; fontes `ak.blend`, `ak.glb` | Mesma declaração do manifest; não é a AK golden |
| B / C | `P/goldsrc-vm/<id>-runtime.glb` / `P/retarget-vm/<id>-runtime.glb` | B: `public/models/viewmodels/FONTE.md:43` registra declaração CC0 do dono e hashes dos ZIPs; C agrega braços pagos |

`docs/LICENCA.md:189` aponta `mint-assets.json`, mas a busca por caminho exato
não encontrou entradas das seis armas nesse registro. Procedência por commit e
arquivo está identificada; recibo/assetId individual não foi localizado. Não
inventar licença individual nem atribuir AGPL automaticamente aos insumos pagos.
A licença do pack acima é **declaração local**, não uma nova auditoria jurídica.
Nenhum asset pago, malha privada, FBX ou dump de vértices entra no Git.

Para ar, as fontes efetivamente localizadas estão em
`extracted/Assets/KINEMATION/FPSAnimationPack/Animations/MX16A4/`:
`Character/A_FP_MX16A4_{Pose,Reload_Tac,Reload_Empty}.FBX`,
`Weapon/MX16A4.FBX`, `Weapon/A_W_MX16A4_{Pose,Reload_Tac,Reload_Empty}.FBX`.
Para M92, o pacote AK contém `Weapon/AK-200.FBX`,
`Character/A_FP_AKX_{Idle,Reload_Tac,Reload_Empty}.FBX` e as recargas de arma
`A_W_AKX_Reload_Tac.FBX` / `A_W_AKX200_Reload_Empty.FBX`.
Existem também arquivos Unity `A_W_MX16A4_Fire.anim` e `A_W_AKX_Fire.anim`;
isso não significa que haja `shoot` pronto no GLB nem um FBX equivalente de braços.
Os caminhos completos e hashes de cada fonte estão nas chaves `source/` do inventário.

### Hashes dos produtos inspecionados

| ID | Mint próprio | B GoldSrc | C retarget |
|---|---|---|---|
| m4 | `e0904b474581b66168d2ec6c190e32528ce7c5ad80a98329da1622f548795932` | `75b4ea4edbacdd4857d656af8aecb255ea9c10e1ad2676b19a7720f7eb769ea0` | `be9754cec5c148fdec427976e0f140f2a58a1de842bd86c5a94d8197f8d897aa` |
| md97 | `16dd73c34583cd96ec6bfe71771ad32fe98caadf3966bb70f15c6d43d67ec9d5` | `6b25d186bc5a37dba5751ac27039a5835c6fd1a05854c6a3e10acb553eea5797` | `951372c459b7b6266a8cf7e290cbeae0bc4e08e38f5ff8b17c1de21e70c13c6f` |
| carbine | `9bbed4fec57b56c9a0aafe50a74bc4df6c3a138f2671dbb15c0d5cc6a27d4f3f` | `ebe15464776dc570f340a546e478e1499e2777a676e42699977712f8e63bde16` | `1df41c435fba3747f8d2bcfb8511850525ce51bb9f8b41b34a61ba6a0b45aa25` |
| scar | `16f0bc90aba6cb1c236e95e45acd51d6e9f1fdf6fd328b313ab46d033eebd99f` | `226bbfb751b2866594a87bfb70337d9126e656b2e4a5fccce60f7b9a99f3ad8e` | `353dcbea56850aa7a5529d9daaa76c3f4dffec07890a2f673cbed698577f9f16` |
| famas | `159c0750b378252a7c5da16837b1e4c584e900416a2085dfd662cb38ea60405a` | `278ad5f7ee386a96c0b79fab109828544685cb3f3826dcfe00e9e0c23efe45ea` | `0d20920ca8c94cd61785667a82ffc005be7ee5c5a702a028a798bc261f223b7c` |
| m92 | `575ff58ae569392386edd2d8147904dd9e9dd75cb8979c1a95196457dbf70230` | `49c23cbf2905d4e526e52f930c6fbfc82df1a1e8f6e1e06bfa0b554e8781d26c` | `86f1bfe2a21d74c463f2a1620aba4fee31ffc03b5bececb87e95a696c128a261` |

Native ar: `fdebe0e1eea609e2dc7974fe96b86d0a45735542f433162992e53a4c2f648a30`.
Native ak: `2a2d5d470d0eef17476ed1add1dd2f98dfc52dd496dba9c3adb25d457db25626`.
Controle AK golden: `I/public/models/viewmodels/coro/ak-hires.glb`,
`3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
Controle pistola: `P/pistol/pistol-runtime.glb`,
`edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`.

## Medições e limites do instrumento

`rifles-inventory.py` lê chunks e accessors reais dos GLBs; não usa contagens
históricas de build. `rifles-blender.py` importa em Blender 5.2.0 LTS isolado,
dois threads, inspeciona estado e produz Workbench 720×360, sem material novo
salvo e sem exportar assets. Cores cinza/vermelho são apenas diagnóstico.
`rifles-gltf-state.py` avalia TRS, interpolação, hierarquia e inverse bind matrices
originais via NumPy, sem browser. Amostras de idle/recargas em 0/18/35/50/62/75/86/100%.

**Limitação descoberta e registrada:** Blender cria auxiliares Icosphere e pode
reinterpretar armatures aninhadas. No ar, `Mag` em recarga inicial apareceu no
Blender em `[-0.6000,112.2356,1.1004]`; a avaliação original glTF deu
`[-0.59985,1.10056,-0.07641]` (outro eixo up). A diferença excede conversão de eixos.
Distâncias nativas/C de `blender.json` ficam **rejeitadas como prova de contato**.
Usar `gltf-state.json` para transforms animados; imagens B comprovam seleção de
fragmentos, não certificam a montagem nativa ou a paridade final Blender→Game.
A causa exata da divergência de importação permanece pendente, sem imputá-la ao Game.

### Geometria própria, normalizada pelo contrato vigente

Os seis GLBs têm um nó mesh sem TRS explícito (identidade), uma primitiva,
`TEXCOORD_0`, zero skins, zero câmeras, zero ações e nenhum socket nomeado.
O maior eixo bruto mede aproximadamente 0,998047 unidades. As dimensões abaixo
aplicam yaw e `CFG.len` por `weaponModel` (`weapons.js:330`), grip em Z conforme
`CFG.gripZ`; são **unidades de jogo normalizadas**, não medidas de arma real.
Não incluem `vm`, transform de câmera nem o carregador procedural do MD97.

| ID | Família / ready herdado | Vértices GLB | Largura × altura × comprimento | yaw / gripZ / vm |
|---|---|---:|---|---|
| m4 | ar / false | 7.468 | 0,08055 × 0,29096 × 0,84000 | 90° / 0,62 / 1 |
| md97 | ar / false | 6.462 | 0,08425 × 0,24863 × 1,05000 | 270° / 0,62 / 0,87 |
| carbine | ar / false | 5.311 | 0,04795 × 0,20137 × 0,98000 | 0° / 0,60 / 0,92 |
| scar | ar / false | 7.017 | 0,12153 × 0,26595 × 0,90000 | 90° / 0,62 / 1 |
| famas | ar / false | 6.532 | 0,07585 × 0,29002 × 0,76000 | 90° / 0,50 / 0,87 |
| m92 | ak / true | 6.811 | 0,10857 × 0,36438 × 0,76000 | 270° / 0,60 / 0,90 |

Fonte: `vmconfig.js:49`, `:56`, `:60`; `weapons.js:46`, `:87`, `:97`;
medições em `A/summary.json` e 20 seções longitudinais por arma em `blender.json`.
A razão altura/comprimento da M92 é 0,47945; M4 0,34638. Isso explica por que
escalar todos como M4 é inadequado; não autoriza mudar agora o enquadramento.

### Pacotes, rig, UV e câmera

- Nativo ar: 4 meshes, skins de 67 juntas de braços + 10 da arma; AK nativo:
  4 meshes, 67 + 4. `RIG_FP_ARMS` tem escala 0,01; preservar a hierarquia,
  não multiplicar novamente por 100. Matrizes e lista completa dos ossos no inventário.
- ar: `Bolt`, `BoltRelease`, `ChargingHandle`, `DustCover`, `FireSelector`,
  `Mag`, `Cartridge`, `MagRelease`, `Trigger`, `neutral_bone`.
  ak: `Charge`, `Mag`, `Safety`, `neutral_bone`. São peças do **doador**;
  não provam peças correspondentes na Mint visível.
- Câmera nativa ar/ak: `VIEWMODEL_CAMERA`, posição glTF
  `[0.012,1.654,0.060]`, VFOV 80°, aspecto 16:9, near 0,01, far 50.
  B/C: VFOV 84°, near 0,1, far 1000; matrizes completas por GLB no inventário.
  `cameraSpacePackage` (`authoredvm.js:287`) usa a inversa exportada, mas
  `FAMILY_FRAME` (`:202`) substitui ar/ak por FOV 84 e offsets/rotações.
  Logo câmera presente não equivale à projeção profissional de fonte única.
- B: rigs por arma 44/52/44/43/52/42 juntas na ordem da tabela acima;
  C acrescenta o rig pago de 67. B contém `SOCKET_MINT_MUZZLE` e
  `SOCKET_MINT_SIGHT`. Falta o contrato semântico completo `weapon_root`,
  `grip_r`, `support_l`, `magazine_insert`, `shell_eject` e operação específica.
  Nativo tem `SOCKET_WEAPON_AR/AK`, mas não esse conjunto completo.
- As três malhas de mão ar/ak/pistola têm sequências UV **idênticas** por hash:
  Cloth `085b2973534715c83b3a663640db9fadc65795937f632ccd6ae3acc13c127aa2`,
  Glove `3111784faad6afc4b5a741e1526841a2b873e07cad67cb7395c36b599ef80f99`,
  Hand `a0beeb9ac51a7fe900ea8b25800c398b5cbc52f4b9792bf9289411265a6882c0`.
  Contagens respectivas 2.836/9.830/1.052. Há base concreta para reutilizar o
  layout `pistol`, com `CoroSolto_FP_Cloth/Glove/Hand` sem criar luva por arma.
- `tintHandMaterial` (`authoredvm.js:271`) já chama
  `applyTeamHandMaterial(...,'pistol')` na rota nativa. `vmhands.js:3,38`
  centraliza time/papel. GoldSrc/retarget e golden usam tratamento distinto
  (`authoredvm.js:344`); mesmo UV no C não elimina o bloqueio de anatomia/pose.
  O v4 central em revisão não foi copiado nem regenerado. Identidade de atlas
  não prova continuidade visual do punho, costura, dedos ou deformação.

## Clipes reais, relógio do Game e eventos

Nativo ar: idle 1,08 s, tactical 2,666667 s, empty 3,166667 s.
Nativo ak: idle 0,08 s, tactical 2,533333 s, empty 3,066667 s.
Ambos sem `shoot`, `equip` ou `inspect` próprios. `P/shared/general-runtime.glb`
contém `equip_rifle` 1 s, `unequip_rifle` 0,666667 s, walk, sprint e outros;
o saque pode vir dele, mas precisa ser revisado com a arma concreta.
B/C têm seis nomes: `equip_rifle`, `idle`, `reload_tactical`, `shoot`,
`shoot2`, `shoot3`; não têm reload_empty distinto nem inspect.
Duração armazenada de cada um dos seis clipes: B M4/MD97/carbine/FAMAS 2,4 s,
SCAR 2,533333 s, M92 1,9 s; C respectivamente 2,416667 / 2,541667 / 1,916667 s.
Nome de clipe e duração comum não provam evento mecânico correto.

| ID | Capacidade / intervalo tiro | Recarga Game | Escala temporal native tactical / empty | Áudio saída / inserção / ferrolho (s) |
|---|---|---:|---|---|
| m4 | 30 / 0,09 s auto | 2,4 s | 1,1111 / 1,3194 | 0,432 / 1,488 / 2,064 |
| md97 | 20 / 0,12 s auto | 2,6 s | 1,0256 / 1,2179 | 0,468 / 1,612 / 2,236 |
| carbine | 10 / 0,50 s não auto | 2,8 s | 0,9524 / 1,1310 | 0,504 / 1,736 / 2,408 |
| scar | 20 / 0,11 s auto | 2,5 s | 1,0667 / 1,2667 | 0,450 / 1,550 / 2,150 |
| famas | 25 / 0,075 s auto | 2,4 s | 1,1111 / 1,3194 | 0,432 / 1,488 / 2,064 |
| m92 | 30 / 0,10 s auto | 2,5 s | 1,0133 / 1,2267 | 0,450 / 1,550 / 2,150 |

`data/weapons.js:7,16,18,19,33,36`; fator = duração original / duração Game.
`Game._startReload` (`game.js:3133`) passa esse relógio ao authored, que o
respeita em `reload` (`authoredvm.js:726`). Conclusão: duração final sincronizada
por desenho do código; **não** prova de sincronismo dos eventos dentro do clipe.
`_reloadLayers` (`game.js:3155`) agenda eventos em 18/62/86%, independente de
marcadores do GLB. As animações examinadas não trazem extras de eventos.
A amostragem nesses percentuais é diagnóstico, não uma alegação de que a mão
alcança o pente nesses instantes. Autoragem deve confrontar esses três tempos.

O Game devolve munição ao completar `reloadUntil` (`game.js:5593`), sem recarga
cartucho a cartucho da carabina. Trocar arma cancela `reloadUntil` (`:3075`).
Não alterar balanceamento para acomodar animação. Carabina exige decidir com a
integradora como representar alimentação tubular nesse relógio, sem inventar
um carregador removível. Saque Game é 0,42 s com GUNFEEL ou 0,28 s sem ele,
mas `draw` usa `cs16.draw=1` para rifle (`authoredvm.js:696`): verificar transição
e bloqueio de tiro. Estado visual `cs16.shoot` 1,5 s ar / 0,8 s ak também
não é o intervalo balístico da tabela; exige teste de rajadas e interrupções.

## Defeitos medidos e matriz por arma

Prioridade de produção: primeiro corrigir isolamento geométrico e montagem;
depois contato/animação; depois câmera e revisão de acabamento. Não reaproveitar
os GLBs B/C como solução pronta. O builder B escolhe ilhas pela caixa do doador
(`build_goldsrc_vm.py:315,379–433`), sem garantir significado mecânico.
A transferência automática para C conserva esse problema.

| ID | Peça B / vértices | Defeito observado | Reaproveitamento seguro | Adaptação / contato crítico |
|---|---|---|---|---|
| m4 | Bone54 / 598 | “mag” é receiver, gatilho e empunhadura; pente visível permanece no corpo | Mint e UV de braços ar como insumos | Separar pente real; mão forte não pode sair com o receiver; apoio no grip vertical |
| md97 | CLIP / 1.148 | “mag” contém alça, partes de coronha e punho; GLB não tem pente | Corpo próprio e especificação MAG já existente | Construir carregador offline próprio; poço fica à frente do gatilho, não atrás como FAMAS |
| carbine | Bone54 / 1.377 | “mag” contém alavanca, gatilho e parte do receiver; não é um pente | Silhueta própria, rig/UV de mãos como base | Separar alavanca e ferrolho; mão forte acompanha ciclo; apoio fica na madeira dianteira |
| scar | Bone25 / 113 | Fragmento fino de receiver e pedaços do pente; não o volume inteiro | Corpo, coronha articulada visual e braço ar | Pente completo; mão de apoio visita comando lateral sem atravessar receiver |
| famas | CLIP / 903 | Fragmento de pente/receiver; no meio da recarga permanece superfície cinza na posição original | Corpo bullpup e UV comum; estudar ritmo do molde FAMAS | Pente integral atrás do punho, apoio recua até ele; não usar trajetória frontal M4 |
| m92 | Bone50 / 90 | Casca parcial curva e faixa sob guarda-mão se deslocam; pente cinza permanece | Corpo M92 e braços/UV do AK nativo | Pente completo com encaixe por arco; mão retorna ao apoio curto; alavanca própria |

Evidência visual: `A/comparison.png` (perfil próprio × B idle), `A/details.png`
(fragmento isolado × B recarga a 50%). São imagens **olhadas**, sem textura
produtiva e sem Game. As posições originais, contagens e caixas da peça estão
em `inventory.json`; centros animados no GLB original em `gltf-state.json`.
A presença de superfícies cinza e vermelha no pente FAMAS/M92 comprova separação
incompleta visualmente. Se vier de preenchimento de costura (`holes_fill`, linha
430), seleção de ilha ou ambos ainda é hipótese; não foi executado rebuild.

| ID | Máxima excursão centro da peça relativa ao centro do corpo / span do corpo | Resíduo recarga final vs idle / span | C: origem hand_l → vértice mais próximo da peça, intervalo |
|---|---:|---:|---|
| m4 | 0,6259 | 0,0233 | 0,0524–0,4304 |
| md97 | 0,3766 | <0,0001 | 0,2290–0,4163 |
| carbine | 0,6900 | 0,0149 | 0,0765–0,4718 |
| scar | 0,5294 | 0,0085 | 0,1662–0,4119 |
| famas | 0,4030 | <0,0001 | 0,2514–0,4070 |
| m92 | 0,3005 | 0,0072 | 0,0484–0,2641 |

Derivado por `rifles-summary.py`. Excursão mede movimento do fragmento errado,
não qualidade de recarga. É diferença de centros no mundo, normalizada pelo
maior eixo da caixa do corpo em idle; inclui rotação, não é distância de encaixe.
A última coluna usa unidades do GLB C, origem do osso e **vértices**, não pele
até superfície/penetração. Serve para triagem; não equivale a contato 3D nem
é comparável diretamente ao teto de 1 cm da golden. Não foi criado teto novo.

## Receita de produção específica

### M4: primeiro caso, após os pilotos obrigatórios

1. Abrir a Mint `m4.glb` e o rig ar no Blender de produção da integradora,
   com fonte/saída explícitas e cópias locais autorizadas. Resolver primeiro a
   divergência de importação de rigs aninhados; comparar com `gltf-state.json`.
   Usar yaw 90° e comprimento de contrato 0,84 como entrada, não compensar
   contato com `FAMILY_FRAME` ou escala isolada da mão.
2. Preservar receiver, gatilho e empunhadura no `weapon_root`. Selecionar por
   superfície o **pente canelado à frente do punho**, até sua boca; `Bone54` e
   a caixa atual estão rejeitados. Conferir que o pente deixa um poço e que
   não sobra uma tampa em sua silhueta. Nomear `magazine` e `magazine_insert`.
3. A geometria tem grip vertical dianteiro. Autorizar pose própria da esquerda
   nele; não aceitar apoio genérico no cano. Marcar `support_l` na superfície,
   `grip_r` no punho e dedos em volume, com indicador no gatilho. Fotografar
   faces internas que a visão normal oculta. Nenhum socket inferido por bbox
   conta como contato certificado.
4. Separar/rigar peças correspondentes a `ChargingHandle`, `Bolt` e comando
   de liberação; localizar abertura de ejeção na geometria pelo outro lado.
   O pacote ar oferece esses bones, mas não a peça Mint pronta. Criar `muzzle`,
   `shell_eject` e `sight` sobre a arma própria, sem modificar atlas comum.
5. Refazer tactical com mão esquerda soltando apoio, extraindo e inserindo o
   pente **real**, voltando ao grip vertical. Empty acrescenta operação de
   ferrolho/comando conforme peça preparada. Ajustar a sequência ao total
   2,4 s e confrontar eventos 0,432/1,488/2,064 s; medir divergências antes de
   propor mudança em áudio. Mão forte permanece no punho.
6. Autorizar fire e retorno (0,09 s entre tiros), equip com arma presente,
   inspect e blends. Não aceitar somente a mola procedural nem o fire Unity
   como clipe de braços pronto. Exportar conjunto arma/mãos/peças/câmera/sockets
   em candidato próprio M4; nenhum arquivo de família compartilhado é destino.

### MD97: carregador ausente e doador bullpup incompatível

Usar `md97.glb` (yaw 270°, len 1,05), nunca o split CLIP. A imagem mostra
coronha fixa, alça superior, guarda-mão dianteiro e ausência de pente. O Game
acrescenta `MAG.md97` (`weapons.js:180`): corpo 0,040×0,150×0,074 centrado em
`[0.009,-0.050,0.040]`, base 0,046×0,014×0,082 em `[0.009,-0.121,0.049]`, rake
−7°, no espaço final de arma. Essa é a especificação existente para transportar
à montagem offline; não são dimensões físicas verificadas. Recriar a peça com
acabamento compatível e encaixe no vazio à frente do guarda-mato. Conferir
silhueta contra o Game antes de retirar qualquer complemento procedural.
Mão de apoio no guarda-mão horizontal; soltura para o carregador frontal e
retorno. Reautorar comandos de ferrolho após identificar seu lado e pivô:
nenhum bone ou peça móvel do bruto os identifica. Total 2,6 s, 20 tiros,
intervalo 0,12 s. Não movimentar alça/coronha durante recarga. Ar nativo pode
fornecer mãos, não a recarga pronta; molde FAMAS não é reaproveitamento seguro.

### Carabina: alavanca e alimentação tubular

`carbine.glb`, yaw 0°, len 0,98, tem coronha de madeira, alavanca ampla sob
o receiver, cão e tubo paralelo sob o cano. Não há carregador caixa visível.
Não transformar alavanca em magazine destacável. Separar alavanca, gatilho,
ferrolho e cão conforme continuidade geométrica; determinar pivô na junção
alavanca/receiver. Mão forte fecha/abre o arco com dedos plausíveis; mão de
apoio estabiliza a madeira dianteira. Criar ciclo extração/ejeção/fechamento
entre disparos, respeitando intervalo 0,50 s sem alterar a cadência.

A porta e o gesto de alimentação ainda não foram confirmados nesta inspeção
lateral; esse é **bloqueio específico** para autorar reload. Inspecionar ambos
os lados/tampa do tubo antes de escolher municiamento; não inventar uma porta.
Planejar reload de 2,8 s para a máquina atual, que repõe munição em bloco e não
fornece loop interrompível por cartucho. Proposta de adaptação por arma vai à
integradora, sem alterar aqui `reloadStyle:'mag'` herdado. Não usar mag-out/M4
para fingir alimentação tubular. Equip/idle podem reaproveitar rig e gramática
visual, sempre com pose dedicada.

### SCAR: corpo largo e comando lateral

`scar.glb`, yaw 90°, len 0,90; largura normalizada 0,12153, maior que M4.
Há pente frontal, guarda-mão com trilho e dobradiça de coronha. O fragmento de
113 vértices é reprovado: selecionar o volume do pente inteiro e excluir
receiver/miudezas. Não animar coronha na recarga por existir dobradiça. Localizar
alavanca lateral, curso e ejeção no próprio mesh; não substituir por puxada
traseira de M4 sem a peça existir. Poses ar são ponto de partida; esquerda
apoia o guarda-mão e precisa liberar espaço ao visitar comando lateral.
Manter direita no punho, conferir polegar junto aos controles e largura da
palma. Total 2,5 s, 20 tiros, intervalo 0,11 s; tactical e empty distintos.

### FAMAS: carregador atrás da mão forte

`famas.glb`, yaw 90°, len 0,76, gripZ 0,50. O perfil prova carregador atrás do
punho e alça alta. O split CLIP chega ao pente, mas conserva superfície do
pente no corpo e leva parte do receiver: refazer o corte e fechar só a boca
de encaixe, sem recriar uma parede sobre o pente. Mão direita mantém a
empunhadura central; esquerda sai do apoio dianteiro e recua até o pente
traseiro, sem atravessar braço direito/coronha. Criar `magazine_insert` nesse
poço traseiro. Inspecionar comando superior sob a alça para empty e evitar
mão passando através dela. Molde FAMAS informa topologia de gesto, não prova
qualidade de mãos nem autoriza sua promoção. Total 2,4 s, 25 tiros, 0,075 s
entre disparos: rajada exige recuperação curta e não pode reiniciar reload.

### M92: pacote próprio, preservando a golden

`m92.glb`, yaw 270°, len 0,76; proporção alta, apoio curto e pente curvo.
A fonte nativa é **AK-200**, não a golden. Seu rig oferece `Mag` e `Charge`,
mas a superfície do pente próprio está em uma só malha com a arma. Rejeitar
os 90 vértices B/C (casca e faixa do guarda-mão); separar pente inteiro e
confirmar encaixe por arco com pivô no lábio, em vez de simples translação
vertical de M4. Direita firme no punho, esquerda sai do apoio curto, manipula
pente e visita alavanca identificada, depois retorna sem colidir com cano.
A existência/curso exato do mecanismo deve ser marcada no mesh antes de
reaproveitar `Charge`. Total 2,5 s, 30 tiros, 0,10 s entre tiros.
Candidato futuro deve ser exclusivo M92: nunca gravar `ak-runtime.glb`,
`ak-hires.glb`, builder ou parâmetros da AK golden para acomodá-la.

## Propostas mínimas por símbolo, para a integradora

- Futuro builder de rifle por arma: importar fontes explícitas, separar por
  superfícies reais e autorar contatos, mecânica, câmera e sockets juntos.
  `build_paid_family.py:transfer_fbx_action` é referência de aquisição dos
  clipes; `build_goldsrc_vm.py:main` e sua seleção de ilhas precisam de revisão
  antes de reaproveitamento. Não executar `build_goldsrc_all.mjs`: SAIDA está
  fixa no armazenamento compartilhado (`:16`). `build_retarget_all.mjs:PRIVADO`
  também usa fontes compartilhadas e herda mecânica incorreta.
- `VM_WEAPON.<id>`: após aprovação, candidato baked **por arma** evita
  `attachMintWeapon` (`vmweapon.js:128`), que hoje oculta donor e centraliza
  a Mint pelo bbox, com `parts:null` nas seis entradas. M4 poderia usar a rota
  já existente `ar/m4-baked-runtime.glb`; M92 `ak/m92-baked-runtime.glb`.
  São destinos propostos, não arquivos produzidos por esta frente.
- `familyFor/entryKeyFor` (`authoredvm.js:233`): liberação precisa ser por arma
  para não abrir as cinco ar de uma vez. Não alterar `VM_FAMILY.ar.ready` como
  atalho. M92 já herda ready da família, mas não tem `golden:true`.
- `AuthoredViewModels.reload/draw/shoot`: apenas propostas de semântica por
  arma, especialmente carabina, saque e loop de tiro; manter relógios do Game.
  `Game._reloadLayers` precisa ser comparado aos eventos visuais, não alterado
  nesta preparação. Ejeção por fallback de bbox (`authoredvm.js:690`) não
  substitui `shell_eject` autorado.
- `cameraSpacePackage/FAMILY_FRAME`: validar câmera de candidato com projeção
  exportada antes de remover offsets legados; não recalibrar câmera comum.
  `applyTeamHandMaterial/refreshTeamHands` permanecem centrais e intocados.

## Plano de validação Blender → GLB → Game

Na integradora, após autorização sequencial do piloto: começar M4 e só depois
M92/SCAR, MD97, FAMAS e carabina (as últimas exigem soluções próprias).
A ordem entre rifles é sugestão, não promoção.

1. Blender: pose dedicada com arma real, direita/esquerda, recarga tática e
   vazia, fire, equip, inspect e retorno. Fotografar interior das mãos/poço,
   pivôs e extremos; separar distância de osso, superfície da pele e penetração.
   Corrigir importação antes de confiar em paridade; não usar o estado nativo
   importado nesta preparação como fonte de produção aprovada.
2. GLB: hashes, seleção de peças completa, sem superfícies duplicadas, rig/UV
   mantidos, clipes/eventos presentes, sockets semânticos e câmera exportada.
   Comparar matrizes e poses com Blender nos mesmos tempos, incluindo entradas
   e saídas dos blends; conservar um baseline imutável.
3. Game real 1440×960 (3:2) e 1440×810 (16:9), browser único da integradora:
   asset servido por hash, idle/equip, tiro isolado/rajada, tactical/empty,
   troca durante recarga, falta de munição, ADS, inspeção e retorno. Capturar
   18/62/86%, extremos adicionais medidos e sequência contínua sem cortes.
   Confirmar tiro disponível versus fim de equip, munição versus inserção,
   alavanca carbine a cada tiro, nada de arma apenas abaixada para recarregar.
4. Continuidade: mesmo time ao trocar pistola/faca/rifle, incluindo F/U sem
   dedos e punhos E/U; comparação normal e close em QA. Não deduzir aprovação
   visual de igualdade de UV ou de testes verdes. Regressão AK golden e yaw
   15° da pistola obrigatória sem editar seus controles.
5. Crítico independente e aprovação do Ruben. Contagem de ossos, bbox,
   estado de animação ou ready herdado não liberam nenhuma linha do arsenal.

## Reprodução, artefatos e checkpoint de continuidade

Todos os comandos a seguir são offline, com cwd **R**:

```sh
export PATH=/opt/homebrew/bin:$PATH
python3 tools/viewmodels/prep/rifles-inventory.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/rifles-blender.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/rifles-blender.py -- --detail
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 tools/viewmodels/prep/rifles-gltf-state.py
python3 tools/viewmodels/prep/rifles-summary.py
```

Dependências já disponíveis: Python 3, NumPy 2.4.4, Pillow, Blender 5.2.0 LTS.
`inventory.json` e `gltf-state.json` preservam dados numéricos; `blender.json`
registra importação e seções geométricas; `blender-detail.json` documenta B.
`summary.json` deriva as tabelas; `comparison.png` e `details.png` mostram os
problemas. PNGs individuais têm prefixos `raw-` e `goldsrc-vm-`. Logs em A.
Nenhuma malha foi exportada ou salva; nada desses artefatos privados vai ao Git.

Marcos concluídos: isolamento verificado; inventário e fontes localizados;
20 GLBs importados para inspeção; 14 pacotes avaliados numericamente no glTF;
24 imagens individuais e duas folhas; defeitos/limites registrados e receitas
por arma. Rejeitados: distâncias nativas/C do import Blender, splits B/C como
solução pronta, transplante M4→carbine/FAMAS/MD97, equip/fire presumidos pelo nome.

Checkpoint de ferramentas: `b802ff672681b18740f44a4ca409798a77427cc3`,
com Signed-off-by e `Agent: Codex (GPT-6)`. Este relatório e o complemento de
inventário entram no checkpoint documental seguinte, recuperável por
`git log -1 -- docs/reports/VM-PREP-RIFLES.md`.

Revisão independente de contexto limpo concluída: sem bloqueadores documentais;
conferiu os quatro scripts, relatório, duas folhas, hashes atuais de 21 GLBs e
reproduziu excursão/resíduo das seis armas. Não certificou contato, sincronismo,
acabamento, licença individual ou Game. Verificação local em `A/validation.json`:
35 hashes de insumos GLB/código preservados no fechamento das ferramentas;
centros da peça B em Blender versus glTF original divergem no máximo 0,000156
unidade nas 48 amostras, corroborando a leitura das imagens B. Sintaxe dos
scripts e `git diff --check` passaram. Não rodado `check:fast`/build/gauntlet:
esta faixa é documentação e inspeção offline, sem implementação no Game.

Preparação encerrada; **produção permanece pendente**: portões anteriores,
importação aninhada, contato 3D integral, alimentação da carabina, procedência
individual Mint e revisão das mãos centrais. Próximo comando concreto de retomada:
`python3 tools/viewmodels/prep/rifles-summary.py`, depois ler esta matriz e abrir
os insumos M4 já identificados, quando a integradora liberar a produção.


### Continuação: publicação do PR

Ruben autorizou abrir PR desta frente após a preparação. Checkpoint documental
concluído: `bb7bda10`; descrição preparada em `A/pr-body.md`. Na verificação de
06/09/2026, nem `codex/vm-astra-pistol` nem uma branch remota contendo a base
`961c70d2` estavam disponíveis. A branch remota `vm-cs16-gabarito` deixaria entrar
33 commits anteriores da integradora no diff. Publicação adicional de uma base
congelada `codex/vm-prep-base-961c70d2` foi proposta a Ruben e aguarda resposta;
a alternativa é aguardar a integradora publicar a base. Nenhum push ou PR feito
neste checkpoint. A produção das armas continua fora desta frente.

Sintaxe, escopo dos cinco arquivos e `git diff --check` reconferidos; hashes dos
seis modelos próprios, pacotes nativos ar/ak/pistol e AK golden preservados.
Próximo passo: conferir a resposta de Ruben e os refs remotos, publicar a branch
Rifles e abrir o PR contra a base autorizada usando `A/pr-body.md`; confirmar que
o diff remoto contém somente o relatório e os quatro scripts de preparação.
