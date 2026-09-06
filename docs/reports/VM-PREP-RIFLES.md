# Preparação offline dos rifles

## Checkpoint do sprint de 72 h — 06/09/2026

Estado conferido a partir de `d090a1db`, branch `codex/vm-prep-rifles`, árvore
limpa antes desta atualização documental. **Nenhum dos seis rifles está
publicável como viewmodel completo.** A M4 tem aprovação de idle e incremento
de dedos aceito pelo crítico; isso não libera sua recarga. Os outros cinco
têm diagnóstico medido, mas nenhum novo Blender/GLB candidato dedicado nesta
lane nem decisão visual independente de aprovação. O PR de preparação
histórico não constitui liberação; nenhum runtime/PR foi iniciado neste checkpoint.

`A` nesta tabela é `artifacts/viewmodels/prep/rifles/` desta worktree.
Os relatórios/gates abaixo foram inspecionados, não reexecutados neste checkpoint.
Foram recalculados os hashes dos seis GLBs próprios em `public/models/weapons/`,
todos iguais à tabela de insumos, e dos controles M4/AK citados abaixo.

| Rifle | Estado / artefatos presentes | Gates e bloqueador atual | Próximo menor passo offline |
|---|---|---|---|
| M4 | Bloqueado. `A/m4-approved-2a4a189d/` e `A/m4-actions-fingers-c1/` com Blender, GLB, GIFs, contato, reimport e revisão independente; réguas novas em `A/m4-actions-wrist/` e `A/m4-actions-bolt/` | Idle aprovado pelo dono; 409 tracks protegidas e retorno real conferidos no teste registrado. Recarga reprovada pela medição de 06/09: a mão cruza o carregador em 59 de 73 frames (palma e polegar com 242 cruzamentos constantes em f012–f046, pico 585 em f049) e `bolt_release` nunca é alcançado (mínimo 50,37 mm em f057). A melhora de dedos de C1 foi medida por distância não assinada e não prova pega. Punho reclassificado: 0,00 mm² de pele visível em f013/f045 contra 76,37 mm² da idle aprovada | Reautorar `H_grasp` e `H_bolt` para contato por fora do carregador e alcance real do ferrolho; remedir o clipe inteiro com as duas réguas antes de qualquer export |
| MD97 | Bloqueado; sem novo candidato. `A/raw-md97.png`, `A/goldsrc-vm-md97-part.png` e `A/goldsrc-vm-md97-reload-half.png` | Inspeção/receita disponíveis; carregador ausente no bruto; split CLIP de 1.148 vértices inclui alça/coronha/punho. Sem gate visual de candidato ou Game | Construir só o carregador em cópia offline, usando a especificação MAG existente e verificando encaixe dianteiro; não transportar recarga bullpup |
| Carabina | Bloqueado; sem novo candidato. `A/raw-carbine.png`, `A/goldsrc-vm-carbine-part.png` e `A/goldsrc-vm-carbine-reload-half.png` | Inspeção identifica alavanca e tubo; split Bone54 de 1.377 vértices leva alavanca/gatilho/receiver. Porta e gesto de alimentação não confirmados; recarga não pode ser autorada com segurança geométrica | Inspecionar lado oposto e tampa do tubo para localizar a alimentação; registrar ausência se não houver geometria identificável |
| SCAR | Bloqueado; sem novo candidato. `A/raw-scar.png`, `A/goldsrc-vm-scar-part.png` e `A/goldsrc-vm-scar-reload-half.png` | Receita específica disponível; split Bone25 de 113 vértices é fragmento do pente/receiver. Sem aprovação visual de candidato; comando lateral ainda precisa ser marcado | Selecionar o carregador completo em cópia offline e provar separação sem carregar partes do receiver |
| FAMAS | Bloqueado; sem novo candidato. `A/raw-famas.png`, `A/goldsrc-vm-famas-part.png` e `A/goldsrc-vm-famas-reload-half.png` | Arquitetura bullpup identificada; split CLIP de 903 vértices deixa parte do pente no corpo e leva receiver. Falta referência CS 1.6 FAMAS comparável e gate visual de candidato | Refazer somente a seleção do carregador traseiro e localizar o poço atrás do punho; trajetória M4 não serve |
| M92 | Bloqueado; sem novo candidato. `A/raw-m92.png`, `A/goldsrc-vm-m92-part.png` e `A/goldsrc-vm-m92-reload-half.png` | Receita própria disponível; split Bone50 de 90 vértices é casca/faixa sob guarda-mão. `ready` herdado da família AK não é aprovação. Falta referência CS 1.6 AK comparável | Separar o pente curvo inteiro e marcar o lábio/pivô do encaixe em cópia M92 exclusiva |

Medições comuns: `A/inventory.json`, `A/gltf-state.json`, `A/summary.json`,
`A/validation.json`. O gate de preparação preservou 35 hashes e corroborou
48 amostras B; não certifica anatomia, contatos finais ou Game. As distâncias
nativas/C do import Blender continuam rejeitadas como prova, conforme a seção
de limites. Cada arma mantém comparação obrigatória com CS 1.6 por categoria.

Hashes recalculados neste checkpoint: M4 candidata tactical
`20fd7f8b69b9a88238596e1bccb089ca2bafeb5ad479f08c5ebe41f54344be06`;
M4 idle aprovada `2a4a189d89f7c3912e60660d08ab4694dc07886a775e63a265afc1f4ffd197fd`;
AK golden `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
O objetivo das seis armas permanece aberto. Decisão visual independente é
necessária antes de iniciar integração/runtime ou publicação de candidato;
nenhuma aprovação de produção foi inferida de testes offline.

## Handoff para Claude — aprovação visual local da M4

Em 06/09/2026, depois da revisão de mãos, Ruben respondeu:
**“ficou bom. como continuamos os outros rifles no claude?”**.
A aparência desta candidata M4 está aprovada pelo dono. Essa aprovação prevalece
sobre as reprovações estéticas históricas abaixo: não reabrir seu acabamento
por preferência do agente ou de outro crítico. A aprovação se refere à revisão
local de pose/mãos E; não é evidência de ações completas, Game/WebGL, outros
times ou liberação de produção. O objetivo final das seis armas segue aberto.

Snapshot privado aprovado, somente leitura:
`A/m4-approved-2a4a189d/`, incluindo Blender, GLB, imagens, medições e
`approval.json` com hashes. Treze arquivos foram copiados e conferidos contra
`A/m4-candidate/`. GLB SHA-256:
`2a4a189d89f7c3912e60660d08ab4694dc07886a775e63a265afc1f4ffd197fd`.
Código produtor: `0f28fbacc69bcebf1a5f3442e3d1e5069d1364df`.
Esses assets não estão no Git: continuar nesta máquina, ou transportar os
insumos privados por um canal próprio autorizado; apenas clonar o PR não basta.

## M4 — intervenção offline de dedos, 06/09/2026

Entrada `29f07868`, mesma worktree/branch. A decisão Astra foi ajustar apenas
as 12 rotações locais de indicador/médio/anelar/mínimo, mantendo palma,
polegar, arma, carregador, manga, trajetória e duração. Saída separada:
`A/m4-actions-fingers-c1/`; fonte `A/m4-actions-c1/` preservada. A hipótese de
abertura uniforme herdada do grip vertical foi sustentada pela melhora de
contato. A curva anterior da manga já era 1 em f013/f045: antecipar sua rampa
não constituiu teste diferente nesses quadros e não provou falha de topologia.

`rifles-m4-actions-fingers.py` ajusta regiões distais contíguas escolhidas
antes do encaixe, com palma travada. A primeira solução de distância gerou
interseções e foi rejeitada, preservada em `A/m4-actions-fingers-rejected-overlap/`.
A mesma intervenção foi recalculada com rejeição de cruzamentos reais entre
arestas da luva e triângulos do carregador; verificação independente mede também
o sentido inverso. Não se declara ausência de contenção ou sobreposição coplanar.

Medições reproduzíveis em `finger-fit.json`, `contact-check.json` e
`evidence/reload_tactical/measurements.json` da saída:

| Dedo | p05 antes → depois, mm | Região contígua até 5 mm em f013/20/43/45 |
|---|---|---|
| Indicador | 17,703 → 3,025 | 21 vértices |
| Médio | 19,852 → 1,865 | 36 vértices |
| Anelar | 12,100 → 2,137 | 59 vértices |
| Mínimo | 8,982 → 1,752 | 18 vértices |

Nos quatro quadros, nenhum cruzamento detectado nos dois sentidos nesses dedos.
Polegar conserva suas medidas. A GLB `m4-actions-runtime.glb` tem SHA-256
`20fd7f8b69b9a88238596e1bccb089ca2bafeb5ad479f08c5ebe41f54344be06`.
O reimport compara os valores de 409 tracks protegidas, sem diferença;
só as 12 tracks de quaternion dos dedos mudam, com os tempos preservados.
Retorno agora usa `LoopOnce` e a última chave real, corrigindo a limitação do
teste anterior que podia envolver ao início. Malhas inteiras retornam com delta
máximo por coordenada abaixo de `4,76e-7`; mutar a última chave do indicador
produz diferença de 0,07198 m e reprova. Ver `reimport-check.json`.

Há 25 amostras de movimento f000–f072, GIFs `reload-3x2.gif`/`reload-16x9.gif`
de 2,4 s e `reload-sheet.png`. Renders grandes incluem f013/20/43/45/62,
closes opostos e IDs de material. Os hashes da M4 aprovada e servida continuam
`2a4a189d…ffd197fd`; a GLB tática de entrada continua `6c48a225…21422cb7e`.

**Crítica independente:** melhoria local da pega aceita, recarga completa
reprovada. Persistem pele exposta no punho f013/f045 e um bloqueio herdado,
agora medido em f062: anelar/mínimo cruzam o carregador 45/94 vezes no sentido
direto e 6/13 no inverso, iguais no baseline e na candidata. Manga/pele diferem
menos de 0,000388 mm entre as cenas avaliadas; esta rodada não corrigiu o punho.
Parecer e estado estão em `independent-review.md` e `progress.json` da saída.

Próxima intervenção mínima: curvas locais de anelar/mínimo na transição ao
comando, ao redor de f062; manter a trajetória da palma. Para o punho, obter o
perfil transversal deformado com borda, seleção e pesos antes de escolher
entre cobertura ou skin. Não promover esta GLB. O objetivo das seis armas,
outras ações e validação Game permanecem abertos.

Reprodução local: Blender background/2 threads com
`tools/viewmodels/prep/rifles-m4-actions-fingers.py`; depois exportador com
`-- reload_tactical --fingers-c1 --frames=0,13,20,43,45,62,72`, verificador de
contato `rifles-m4-actions-contact.py` e Node 23 com
`rifles-m4-actions-verify.mjs --fingers-c1`. `--motion-only` no exportador gera
as sequências pequenas nas duas proporções. Nenhuma integração ou deploy.

## Histórico M4 — marco tático C1, 06/09/2026 — candidato reprovado

Escopo deste marco foi somente `reload_tactical`: não alterou o idle aprovado,
runtime, materiais compartilhados, AK golden, servidor ou navegador. A fonte é
`tools/viewmodels/prep/rifles-m4-actions-{lib,build,export,inspect,verify}.*`;
os artefatos privados ficam em `A/m4-actions-c1/`. A partir da cópia conferida
do Blender aprovado (`6925c7…e26`), o construtor separa o carregador real em
objeto próprio (313 vértices, 223 faces; corpo 7.468 → 7.155 vértices) e produz
um clipe de 72 frames/2,4 s a 30 fps. A GLB mais recente é
`A/m4-actions-c1/m4-actions-runtime.glb`, SHA-256
`6c48a225f265785cf92410dccdd69712e085b1c6dcf54f1ab4aa09221422cb7e`.

O arco é legível nas capturas 3:2 e 16:9: retirada completa em f020,
reinserção em f043 e assentamento em f045. A medição registra primeira saída
do poço em f014 e primeiro reassentamento em f045; os eventos de jogo de
0,432/1,488/2,064 s foram autorados em 0,433/1,500/2,067 s (desvios de
1,33/12,00/2,67 ms). Há `f013`, `f020`, `f043` e `f045` em 3:2, 16:9, close e
ângulo oposto em `A/m4-actions-c1/evidence/reload_tactical/`.

O reimport offline da GLB com `GLTFLoader`/`AnimationMixer` passa: duração
2,400000095 s, 211 tracks, uma track de peso da manga e delta máximo de matriz
de início/fim `3,23e-7`; o peso do morph está em zero no idle e ao fim. É prova
CPU da GLB, não certificação WebGL/Game.

### Crítica independente e bloqueio

O crítico independente reprovou a frente tática. Nos IDs de material, verde é
pele: f013 conserva fragmentos no pulso esquerdo nas duas câmeras e f045
conserva fragmentos na principal e uma ponta na oposta. f020 e f043 limparam,
mas isso não satisfaz os quatro frames críticos. A shape key local
`reload_cuff_cover_l` move 213 vértices da manga até 14 mm, é exportada no
clipe e zera nos limites; dois ajustes de sua curva/cobertura não fecharam a
fenda. Não fazer uma terceira mudança geométrica sem decisão técnica.

O contacto agora é medido por vértices deformados da luva contra BVH do
carregador, sem alegação de AABB ou ponta de osso. Só o polegar chega a
0,111 mm (72 vértices até 5 mm); indicador/médio/anelar/mínimo ficam pelo
menos a 13,761/17,434/10,792/6,456 mm. Portanto a silhueta sugere pega, mas
não a demonstra. A retirada/reinserção e o retorno offline passaram; manga e
contacto da mão reprovaram.

**Pergunta para Astra:** para o próximo e único round autorizado, prefere
modelar uma extensão de manga específica da ação que cubra a fenda mantendo
f000/f072 no zero, ou reposicionar os quatro dedos e aceitar o pulso existente
como bloqueador separado? A correção mais barata indicada pela crítica é curvar
e aproximar só os quatro dedos na fase `hold-mag`, mas ela não resolve a pele
exposta. Não integrar nem apresentar como pronto antes dessa decisão e nova
crítica independente.

### Instrução de retomada para Claude

1. Assuma esta frente sequencialmente, na mesma worktree
   `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles`,
   branch `codex/vm-prep-rifles`. Confira worktree, HEAD, status e caminhos reais
   antes de escrever. Não recrie a branch na base antiga, não use outra lane,
   não faça reset/clean nem execute outro implementador em paralelo.
2. Leia este relatório integralmente e o documento original integral em
   `../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`, aplicando
   as Instruções comuns e Frente Rifles. Leia também AGENTS, lições, contrato
   profissional, skills aplicáveis e ledgers integradores indicados ali.
   A integradora e seus insumos continuam somente leitura.
3. As instruções posteriores de Ruben ampliaram a tarefa para candidatos locais,
   teste em servidor separado e PR. Já existe o PR #509, com base congelada
   `codex/vm-prep-base-961c70d2`; mantenha esse PR. Isso não autoriza alterações
   em runtime/atlas compartilhados, merge, deploy ou abertura de navegador.
4. Preserve a M4 aprovada e a AK golden. Crie diretórios próprios por arma em
   `A/` e scripts `tools/viewmodels/prep/rifles-*.py`/`.mjs`. Não sobrescreva
   `m4-candidate/` nem o snapshot aprovado para desenvolver outra arma. Use a
   qualidade e o processo M4 como referência; não copie automaticamente sua
   pose, escala, câmera, grip vertical ou bind para uma geometria diferente.
5. Ordem sugerida: **SCAR → MD97 → M92 → FAMAS → carabina**. Comece pela SCAR:
   leia sua receita medida abaixo, abra o asset próprio e produza uma candidata
   isolada de pose com apoio no guarda-mão, corpo largo e comando lateral.
   Apresente comparação CS 1.6 antes de avançar ao próximo rifle. Não substitua
   implementação pela repetição dos diagnósticos que já estão documentados.
6. Para cada arma: confirme insumos/hashes, siga a receita específica, produza
   Blender/GLB, olhe renders 3:2 e 16:9 e compare com **CS 1.6 por categoria**.
   A M4 aprovada é controle adicional, nunca substitui CS 1.6. As imagens
   fornecidas estão em `A/cs16-reference/`; referências equivalentes de AK/M92
   e FAMAS ainda faltam, conforme o pareamento abaixo. Não invente equivalência
   de câmera, asset, mecanismo ou licença quando houver informação ausente.
7. Reaproveite os verificadores M4 como instrumento: paridade de vértices no
   carregador real em CPU, mutação que reintroduz o defeito, hashes HTTP e
   proteção dos controles. Não afrouxe tolerâncias. Faça crítica independente
   com imagens; aprovação numérica não substitui aprovação visual do dono.
8. Servidor exclusivo: `http://127.0.0.1:8160`, diretório
   `A/local-server-8160`. Verifique o processo/porta atual, sem confiar no PID
   histórico. O preview M4 usa `vmrifles=m4-c1`; essa opção **só implementa M4**.
   Trocar apenas `vmweapon` não carrega um candidato novo dos outros rifles.
   Estenda somente a montagem local sob artefatos com opção e GLB por arma,
   preservando o caminho M4. Não escreva através dos symlinks em `public/` ou
   nos privados integradores. Não abra navegador nem pare servidores de mapas.
9. Entregue os links locais para revisão manual e mantenha o objetivo no Game.
   Autore peças, saque, disparo e recargas próprias, sem transplante genérico:
   MD97 precisa do carregador ausente; M92 exige encaixe curvo exclusivo;
   FAMAS recarrega atrás do punho; carabina depende da alimentação a confirmar.
   O idle aprovado da M4 continua sem essas ações. A integração compartilhada
   e a validação visual real no Game permanecem etapas explícitas, não concluídas
   pelo HTTP/CPU. Registre proposta por símbolo se exigirem sair da faixa autorizada.
10. Atualize este ledger em cada marco com aceites, rejeições, hashes, artefatos,
    validação real e próximo passo. Faça checkpoints pequenos com Signed-off-by
    e Agent verdadeiro do Claude; atualize o PR existente. Não inclua assets
    privados, dumps ou segredos no Git. Não encerre o objetivo das seis armas
    porque um novo idle ficou bom.

## Histórico da revisão de mãos M4 antes da aprovação

Ruben disse **“muito melhor mas a mao e o braço ta bem feia ainda”**.
Isso aceita a melhora da composição, não aprova mãos, braços ou o viewmodel
completo. A revisão atual substitui os arquivos de `A/m4-candidate/` no preview
8160. O estado C1 foi preservado em `A/m4-c1-before-hands/`. A seção C1 abaixo
é histórica; seus hashes e imagens não representam mais a candidata servida.

- Comparação CS 1.6 e antes/depois: http://127.0.0.1:8160/rifles-m4/review.html.
- Teste local continua na opção `vmrifles=m4-c1`, com time E e arma M4.
- GLB atual: `A/m4-candidate/m4-baked-runtime.glb`, SHA-256
  `2a4a189d89f7c3912e60660d08ab4694dc07886a775e63a265afc1f4ffd197fd`.
- Próprio Blender: `A/m4-candidate/m4-candidate.blend`; reprodução pelos mesmos
  scripts C1, agora incluindo `rifles-m4-hands.py`, carregado pela candidata.

### Alteração e medição desta revisão

Apoio girado 40° ao redor do grip vertical, luva afinada no dorso e falanges
com redução diferenciada por dedo. Vértices a até 4 mm da superfície da arma
ficam fora dessa escultura local; isso não prova contato fechado ou ausência
de penetração de triângulos. A manga recebeu ajuste radial e avanço do punho
esquerdo de 12,98 mm. Mediana de raio no subconjunto medido da manga esquerda:
49,11 → 35,55 mm; direita: 52,43 → 38,49 mm. São distâncias à linha do antebraço
num intervalo de projeção que também pode incluir dobras/braço superior, não
uma medida anatômica de circunferência. Comprimentos ósseos: 269,75 mm por lado.

O primeiro afinamento expôs pele e foi descartado. A comparação por material
(`trigger-material-id.png`: vermelho=tecido, azul=luva, verde=pele,
cinza=arma) isolou a pele que atravessava o punho direito. A camada separada
de pele foi acomodada em direção aos eixos ponderados do esqueleto, conservando
sua malha/rig; deslocamento máximo de 62,65 mm nessa camada interna do doador.
Os fragmentos não aparecem mais nos closes examinados. Isso exige nova inspeção
quando houver movimento e validação dos demais times; o preview desta rodada
foi composto com E.

UVs de faces do punho foram remapeados para regiões correspondentes dos atlas
centrais; **UVs das mãos desta revisão não são byte a byte iguais aos C1**.
Nenhum atlas ou material central foi alterado. O render também passou a ler
os mapas de relevo centrais com distância 0,002, correspondente ao parâmetro
existente de `vmhands`; não se declara equivalência de iluminação Blender/Game.

### Evidência validada e pendências preservadas

Comparação estrutural com o GLB C1 confirma geometria/UV/índices da arma,
transformações da arma e câmera, e parâmetros de câmera **idênticos**.
A caixa do render passou de `[600,452,1024,768]` para `[585,452,1024,768]`;
a referência CS permanece `[535,458,1024,768]`. Boca e mira não se moveram.
`comparison.json` guarda essas verificações e hashes das imagens originais.

Todos os 21.338 vértices exportados conferem com o Blender em CPU, desvio
máximo 8,37e-7 unidade; a mutação de offsets reprova, com a mesma tolerância
1e-5. O aumento de vértices exportados inclui seams das UVs. HTTP 200 e hashes
conferidos para M4, runtime/config locais, mãos centrais e AK; fontes ar/Mint,
`vmhands.js` e AK golden conferem com o inventário anterior. Sintaxe Python/Node
e `git diff --check` passaram. `public/` continua sem alterações.

Revisão independente confirmou a limpeza dos fragmentos e a melhora no idle.
Ainda reprovou conclusão total por dedos arredondados, leitura aberta do punho
dominante e volume/fenda do braço superior na vista lateral. A região cinza
no diagnóstico pertence à arma. `boundary-inspection.json` registra apenas
quatro contornos abertos de sete vértices, extensão máxima 3,49 mm. Após essa
conferência, o crítico corrigiu o achado: trata-se da empunhadura exposta, não
de grande buraco na luva. O ajuste restante é de pega/pose, não preenchimento
indiscriminado da região. Esses achados permanecem pendentes; não se usa a aprovação localizada
como nota final de mãos/braços. Nenhum navegador foi aberto nesta revisão.

Próximo passo: completar pega/indicador e anatomia da M4, conferir no Game e
autorar suas ações. Depois executar MD97, carabina, SCAR, FAMAS e M92 pelas
receitas abaixo. O objetivo completo das seis armas permanece aberto. A revisão
estática não certifica ações, Game/WebGL ou qualidade final. Continuação a partir
do checkpoint `17c684d8`, branch `codex/vm-prep-rifles`, mesmo PR #509.

## Histórico C1 — candidata de pose M4, sem aprovação final

Após Ruben dizer “entao vamos lá”, foi produzida uma candidata **própria e
estática da M4**, disponível por opção de QA no servidor exclusivo 8160.
O objetivo completo continua sendo as seis armas no Game; nenhuma está
finalizada. Esta seção prevalece sobre os estados anteriores de “nenhum asset
exportado” e “servidor somente com baseline”. O baseline anterior continua
acessível sem `vmrifles=m4-c1` e continua reprovado pelo dono.

- Comparação: http://127.0.0.1:8160/rifles-m4/review.html.
- Teste da pose no Game: http://127.0.0.1:8160/?debug=1&auto=E&vmweapon=m4&map=brasilia&armaslazy=0&vmready=ar&vmrifles=m4-c1.
- Artefatos privados: `A/m4-candidate/`; fonte editável `m4-candidate.blend`,
  exportação `m4-baked-runtime.glb`, SHA-256
  `0d12f0822dbf0ebe5c5a67a4bf8a6d11ba64a0f1cc7f6503b4da4bf5895b48e7`.
- Fonte ar original somente leitura: `P/ar/ar.blend`, SHA-256
  `d85375f6b1bf6b06fa995a1cceeebcf559632f6b26da8a5c965fe8a64bd8414e`.
  A fonte Blender mostra o doador alinhado aos braços; não tem a divergência
  extrema do GLB nativo montado. Não foi reutilizada sua importação glTF defeituosa.

### O que mudou na candidata

Arma Mint normalizada a 0,84, sem reduzir as mãos. Arma, contatos e câmera foram
compostos juntos: diagonal para o centro, mira traseira visível, receptor lateral
e coronha recortada. O apoio próprio no grip vertical usa pose fechada; ombros,
cotovelos, punhos e indicador foram ajustados. A solução não copia malha ou ação
de CS 1.6. Tentativas de apenas girar o punho 90° em X/Y foram reprovadas por
flexão excessiva ou dedos abertos.

O rig mantém 67 bones, com bind dedicado à pose. A fonte tinha 950 vértices de
luva com mais de quatro influências; a candidata limita e normaliza os pesos
para quatro antes de avaliar/exportar. As escalas residuais de importação foram
normalizadas, mantendo a escala 0,01 do objeto rig. A deformação foi incorporada
ao bind da candidata, conservando skin e grupos para autoria posterior. Esse
bind não é uma base intercambiável para transplantar os clipes do doador.
Os atlas centrais E foram apenas lidos para o render; nenhum atlas/material
compartilhado foi escrito. A identidade no Game continua passando por `vmhands`.

`rifles-m4-stage.py` materializa **cópias locais** de `vmconfig.js` e
`authoredvm.js` apenas em `A/local-server-8160/public/js`. Com a opção exata
`vmrifles=m4-c1`, a M4 usa baked por arma e a câmera exportada, sem os offsets
de família. O General equip é omitido somente nesse preview, porque arrancaria
os contatos da pose própria. Sem a opção, a configuração permanece a da base.
Os fontes em `R/public`, os GLBs compartilhados e os outros servidores não
foram editados. Não houve `ready:true`, promoção, merge ou deploy.

### Evidência atual e limites

`rifles-m4-check.mjs` executa o GLTFLoader vendorizado e o `cameraSpacePackage`
da cópia servida, com materiais sem textura para inspeção CPU. Compara todos
os vértices exportados com a pose Blender no espaço da câmera, buscando o ponto
mais próximo para admitir reordenação/seams. O máximo medido foi 8,46e-7 unidade,
abaixo da tolerância numérica explícita de 1e-5; essa tolerância não é uma régua
visual CS 1.6. Reintroduzir os offsets antigos reprova a comparação. A primeira
exportação divergira até 0,001861 unidade na luva; somente limitar os pesos ainda
deixava resíduo no tecido. O bind dedicado eliminou essa divergência sem afrouxar
o teste. O controle do ramo golden preserva sua câmera; o GLB AK servido confere
com os bytes da base. Isso não substitui uma regressão visual da AK.

HTTP 200 e hashes conferidos para GLB M4, runtime/config locais, `vmhands.js`
central e AK golden. A aba antiga do servidor já não estava aberta; não foi
aberto outro navegador. Portanto **WebGL, Game visual e ações não foram
certificados nesta rodada**. Há somente `idle` com dois quadros iguais. Saque,
tiro, recargas, inspeção, ADS e contatos em movimento seguem pendentes; não
confundir o arco/recuo procedural disponível no preview com ações finalizadas.

`rifles-m4-review.py` apresenta a referência CS 1.6 ao lado do render, ambos
1024×768 sem deformação. Caixa candidata `[600,452,1024,768]` versus marca manual
`[535,458,1024,768]`: o antebraço ocupa menos largura. Socket manual da boca em
`[643,84;485,13]`, delta `[+6,84;+1,13]` px ante a marca `[637;484]` da referência.
São diferenças medidas, não aprovação ou projeções idênticas. O socket é uma
marcação na geometria e ainda exige conferência visual fina. Recortes 3:2 e
16:9 também foram renderizados; faltam referências equivalentes desses aspectos.

Crítico independente olhou a versão final: apresentável como candidata de idle,
com mais receptor/mira traseira e antebraço. Apontou apoio ainda diferente devido
ao grip, leitura arredondada das luvas e contato direito parcialmente oculto,
mesmo em `trigger-close.png`. Não certificou ausência de penetração, ações ou Game.
O material central não foi alterado para acomodar esse achado.

### Reprodução e próximo passo

No cwd R, usar Blender CLI isolado com `--background --threads 2
--python-exit-code 1 --python` nos scripts `rifles-m4-source.py` (diagnóstico),
`rifles-m4-candidate.py` e `rifles-m4-export.py`, nessa ordem. Depois:

```sh
python3 tools/viewmodels/prep/rifles-m4-stage.py
/opt/homebrew/bin/node tools/viewmodels/prep/rifles-m4-check.mjs
python3 tools/viewmodels/prep/rifles-m4-review.py
```

Marcos novos: candidata Blender/GLB; comparação CS 1.6; paridade CPU e mutação;
montagem opcional no servidor; revisão independente. Próximo passo concreto:
revisar o enquadramento no link do Game, conferir indicador/guarda-mato por
superfície e autorar peças/ações da M4 sobre este bind. MD97, SCAR, M92, FAMAS
e carabina continuam com suas receitas específicas abaixo, sem candidatos
produzidos nesta rodada. O PR #509 continua sendo preparação e candidata local,
não entrega de seis viewmodels prontos. Assets e dumps privados ficam fora do Git.

## Correção de direção do dono: CS 1.6 obrigatório por categoria

Ruben reprovou o teste local: **“está muito ruim”**. Em seguida determinou que
**a comparação seja sempre contra CS 1.6, mesmo que não seja a mesma arma,
mas da mesma categoria**. Esta instrução prevalece sobre réguas anteriores
que misturavam CS2/Valorant/ev.io como alvo visual desta frente. AK golden e
pistola continuam controles de regressão; não substituem a referência CS 1.6.
O estado servido em 8160 está reprovado pelo dono. Foi observado e capturado
na aba que o usuário já tinha aberta, sem navegar, abrir browser ou alterar
o Game. Ainda não há delta quantitativo válido entre aspectos/ações equivalentes.

O diagnóstico anterior identificou defeitos mecânicos, mas não fechou a comparação
visual obrigatória. HTTP 200, `ready`, clipes existentes e hashes iguais não
avaliam esse critério. O objetivo no Game permanece aberto; este complemento
registra referências e critério, sem declarar uma correção de aparência aplicada.

### Referências fornecidas e medidas reproduzíveis

Originais preservados sem alteração apenas em `A/cs16-reference/`:

| Arquivo | Dimensões | Uso | SHA-256 |
|---|---|---|---|
| `cs16-rifle-detail.png` | 436×236, RGBA | detalhe de arma/mãos; recorte, sem viewport ou fase de ação confirmados | `ca47b55bce2cdef721ac97867a9f6bd9bf20d0d4c4af2b777717f324388c8c4a` |
| `cs16-rifle-game.png` | 1024×768, RGB, 4:3 | composição do rifle no jogo conforme referência enviada | `deadbccca62e18bb41a1379a5deeb704116b684ceac64c7eafcd3762a8ee7bb9` |

Reprodução: `python3 tools/viewmodels/prep/rifles-cs16-reference.py`.
O script verifica os hashes e normaliza **marcações manuais**, registrando a
incerteza de leitura. Não segmenta automaticamente nem estima câmera/contato 3D.
Resultados: `reference_manifest.json`, `source_analysis/game.json`,
`source_analysis/detail.json` e `validation/front_mask_validation.json` nesse
subdiretório. Overlay, IoU e SSIM estão explicitamente pendentes por falta de
frame comparável do Game e máscaras revisadas. Não preencher com zero ou verde.

Na imagem de jogo, com origem superior esquerda:

| Medida | Pixel marcado | Fração da tela | Limite |
|---|---|---|---|
| Caixa arma + braços | `[535,458,1024,768]` | largura 0,47754; altura 0,40365 | bordas direita/baixo exclusivas; esquerda/topo aproximados ±6 px |
| Boca do cano | `[637,484]` | `[0,62207;0,63021]` | leitura aproximada ±6 px |
| Topo da massa de mira frontal | `[684,459]` | `[0,66797;0,59766]` | leitura aproximada ±5 px |
| Região visível de contato do apoio | `[691,548]` | `[0,67480;0,71354]` | marca de região, ±12 px; não centro anatômico ou socket |

A caixa ocupa cerca de 19,3% da tela, mas isso **não é área da silhueta**.
O conjunto entra pelas bordas inferior/direita; o centro `[512,384]` fica livre.
O cano aponta para a região central a partir da direita; a parte traseira sai
do enquadramento. Não tentar mostrar toda a coronha. A mão de apoio envolve a
arma; mão forte e faces internas não ficam integralmente visíveis neste frame.
O recorte de detalhe ajuda a ler dedos/contato e material escuro com detalhes,
mas não determina tamanho na tela. As fontes foram fornecidas como CS 1.6;
configuração, FOV e estado exato da animação não estão documentados.

São medidas **desse frame**, não tolerâncias universais. A faixa de boca
`0,51–0,60` comentada em `ref-measure.py` vem de outras imagens; não mudar esta
marca de 0,63021 para caber naquela faixa. O script antigo mistura fontes de
outros jogos e não será executado como aprovação visual desta frente.

### Evidência do estado rejeitado no Game

`A/cs16-reference/game-observed-rejected.png`: 1512×755, SHA-256
`bc941eb6cc959bbd79f9660928f296727590b715a680f57859f80cc8b1f0fce1`.
Captura somente leitura da aba existente em 8160 com `vmweapon=m4&vmready=ar`;
HUD confirma `M4A1 REQUINTE` e `vm: AUTORADO (ar)`. O rifle aparece quase
vertical, com vista superior dominante. Na referência enviada, a arma apresenta
a lateral em diagonal para o centro a partir do canto inferior direito. Essa
orientação precisa ser corrigida junto da pose; reduzir tamanho sozinho não
resolve. Não há prova nesta captura de qual transformação causa o problema.

A câmera do mundo está olhando para o céu; não foi alterada. O aspecto é
1512:755, diferente de 4:3, e a fase do mixer não foi instrumentada. Portanto
esta é triagem visual do estado real rejeitado, não comparação quantitativa
controlada, paridade de projeção ou aprovação de idle/animação. Metadados em
`source_analysis/game-observed-rejected.json`; overlay controlado segue pendente.

### Pareamento por categoria e correção da receita

| Arma própria | Referência visual CS 1.6 | Adaptação que continua obrigatória |
|---|---|---|
| M4 | M4 enviada | Apoio no grip vertical próprio; não forçar dedos na pose de guarda-mão horizontal |
| MD97 | M4 como rifle de carregador frontal | Completar carregador ausente e localizar comandos próprios |
| SCAR | M4 como rifle de carregador frontal | Largura, apoio e comando lateral da própria SCAR |
| M92 | AK como rifle com pente curvo | Referência AK comparável ainda precisa ser anexada; pacote M92 exclusivo |
| FAMAS | FAMAS como rifle bullpup | Referência comparável ainda precisa ser anexada; recarga atrás do punho |
| Carabina | Rifle CS 1.6 para composição geral | Não há equivalente de alavanca confirmado; a categoria visual não autoriza recarga de M4 |

Primeiro passo visual de M4: alinhar perspectiva, tamanho aparente e diagonais
com a referência de jogo, com a geometria própria e pose de apoio dedicada.
Medir arma e braços separadamente, posição de boca/mira, relação de tamanho
mão/guarda-mão e recorte das bordas. Não corrigir o conjunto apenas encolhendo
mãos, deslocando sockets, escondendo carregador ou trazendo a coronha toda à tela.

Toda apresentação de candidato deve incluir **CS 1.6 ao lado do Game real**,
com categoria declarada e ação comparável. Antes/depois próprio é auxiliar.
O frame enviado é 4:3: comparar inicialmente sem deformação em 4:3; obter
referências CS 1.6 correspondentes para o aceite final em 3:2 e 16:9. Não
esticar a imagem para fingir igualdade de aspecto. FOV desconhecido impede
alegar projeções idênticas. Medir desvios sem impor IoU pixel a pixel entre
armas diferentes ou importar os limiares de mascote/logotipo da skill.

Idle, equip, tiro e recargas precisam de sequência CS 1.6 da categoria e
sequência contínua do candidato; as duas imagens estáticas não demonstram
timing nem retorno. Contato, deformação, recorte, centro livre e identidade
visual são revisados em conjunto, por crítico independente e por Ruben.
Nenhum material/mesh/animação de CS 1.6 será copiado para os assets próprios.

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

Aplicar antes o pareamento CS 1.6 por categoria e o critério visual no início
deste relatório; as etapas abaixo continuam necessárias para a mecânica própria.

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


### Continuação: PR aberto e objetivo completo no jogo

Ruben autorizou a publicação da base congelada e reforçou: “precisamos finalizar
o view model tambem no jogo”. A preparação é um marco concluído; o objetivo
completo passa a incluir M4, MD97, carabina, SCAR, FAMAS e M92 produzidas,
integradas e validadas no Game real, com aprovação visual. Esta seção prevalece
sobre expressões anteriores de encerramento quando se referirem à tarefa inteira.

- PR de preparação: https://github.com/corosolto/client/pull/509.
- Base remota congelada: `codex/vm-prep-base-961c70d2`, em
  `961c70d20a41336a53ba3b9abcc2068d3e7f9eb0`, publicada com autorização de Ruben.
- Head: `codex/vm-prep-rifles`; checkpoints de preparação `b802ff67`, `bb7bda10`
  e `7cfd18af`. O PR contém apenas este relatório e scripts próprios de preparação.
- Publicação feita com `PREPUSH=0`: o hook amplo executa verificações fora da
  faixa de inspeção desta frente. Não declarar `check:deploy`, `check:fast` ou
  build verdes; as verificações específicas estão registradas acima e no PR.
- Nenhum merge, deploy, alteração de runtime/material compartilhado ou browser.

Leitura atual da integradora em 06/09: HEAD `1ffbc452`, com alterações locais de
faca/luvas v5, runtime e documentação. O marco 30 do ledger integrador ainda
exige capturas válidas no Game padrão em 3:2/16:9 e aprovação visual da faca;
AWP e escopeta permanecem depois desse portão. Não copiar nem commitar essas
alterações nesta branch. Um pedido de definição de responsabilidade foi enviado
a Ruben: integração permanece na `vm-astra-pistol` ou esta tarefa assume a
etapa no jogo. A proibição inicial de runtime/materiais/browser não foi tratada
como transferência automática de responsabilidade entre tarefas.

Definição de pronto final das seis armas: candidato dedicado por arma, peças
completas, câmera/sockets exportados, contatos e ações coerentes, carregamento
real por hash, preservação da AK/pistola e identidade central das mãos. Cada
arma precisa da sequência Blender→GLB→Game descrita acima, nas duas proporções,
com disparo/recargas/trocas contínuos, revisão independente e aprovação do Ruben.
Nenhuma arma desta frente satisfaz ainda essa definição.

Próximo passo: conferir a resposta de responsabilidade e os portões da
integradora; quando liberada a etapa, produzir M4 pela receita medida, validar
no Game e avançar individualmente nas demais. A carabina mantém o bloqueio
específico de identificação da alimentação. Não marcar a tarefa completa pela
abertura ou pelo merge deste PR documental.


### Servidor local exclusivo para teste manual

Ruben pediu outro servidor local para não disputar os servidores dos mapas.
Iniciado em `http://127.0.0.1:8160`, PID inicial `70216`, usando o servidor
existente `tools/eval/serve.mjs`, sem dependências novas. Diretório de execução:
`A/local-server-8160`; log `server.log`, PID em `server.pid`, fontes em
`server.json` e respostas verificadas em `http-smoke.json` dentro desse diretório.
Código público e página vêm desta worktree; somente `public/private-assets`
é lido da integradora. Os symlinks de montagem estão apenas nos artefatos desta
frente; nenhuma origem compartilhada foi escrita e nenhum servidor alheio foi
interrompido. Este é o arnês do Game existente, sem rotas SSR/API do Astro.

Teste padrão M4: `http://127.0.0.1:8160/?debug=1&auto=E&vmweapon=m4&map=brasilia&armaslazy=0`.
Acrescentar `&vmready=ar` inspeciona o pacote nativo experimental por override
local de QA, sem alterar a configuração persistida. Para as demais armas, trocar
`vmweapon` por `md97`, `carbine`, `scar`, `famas` ou `m92`.

HTTP 200 confirmado para página, módulos main/authoredvm/vmhands, Three.js,
M4 própria, AK golden e pacote ar; os sete arquivos conferem com os hashes das
fontes. Abertura manual, boot WebGL, contatos e ações não foram verificados nesta
etapa: nenhum browser automático aberto. O servidor oferece o estado atual,
não candidatos de rifle finalizados. Para reiniciar após conferir porta livre:
`cd artifacts/viewmodels/prep/rifles/local-server-8160` e executar Node com o
caminho absoluto de `R/tools/eval/serve.mjs 8160`.

Revisão independente das referências e das marcações: sem bloqueadores
documentais; não certifica armas nem procedência além das imagens do dono.

## M4 — sonda C2 de transição anelar/mínimo, 06/09/2026 — **rejeitada**

Esta rodada começou de `A/m4-actions-fingers-c1/`, sem modificar runtime,
M4 idle aprovada, arma, carregador, palma, polegar, manga ou relógio. A régua
primeiro reprovou C1 em f062: anelar tinha 45 cruzamentos de aresta contra o
carregador (6 no sentido inverso) e mínimo 94 (13 inversos), medidos em
`A/m4-actions-fingers-c2/transition-fit.json`. C1 é também a mutação concreta:
reintroduzi-lo ao lugar de C2 restaura esses contadores.

A sonda isolada `tools/viewmodels/prep/rifles-m4-actions-fingers-c2.py` tentou
somente os seis quaternions `ring_0[123]_l`/`pinky_0[123]_l` entre 1,60 e 2,32 s,
com endpoints f000/f072 preservados. O export C2 zera os dois sentidos no f062
e o reimport do GLB confirma 415 tracks protegidas idênticas em relação a C1,
retorno de malha abaixo de `4,76e-7` e mutação de dedo detectada. A evidência
reproduzível está fora do Git em `A/m4-actions-fingers-c2/`:
`transition-fit.json`, `contact-check.json`, `reimport-check.json` e
`evidence/reload_tactical/f062-{close-hand,close-hand-opposite,material-id*}.png`.

**Não aceitar C2:** a única solução que fecha o mínimo requer `pinky_01_l =
-83°` (anelar `-45°`). Embora os cruzamentos sejam zero, esse deslocamento é
maior do que uma correção local defensável e não prova uma pega física. Além
disso, C2 não toca no outro bloqueio: a pele ainda é exposta no punho em f013 e
f045 em `A/m4-actions-fingers-c1/evidence/reload_tactical/*-material-id*.png`.
Portanto, nenhum candidato de recarga M4 passa anatomia, contatos e cobertura
em conjunto; não houve integração, PR, runtime ou commit desta sonda.

Próximo passo mínimo, antes de qualquer nova animação: medir no Blender o
perfil transversal deformado da borda manga/pele nos f013/f045 (seleções,
pesos e distância assinada), e decidir se existe uma cobertura de manga
específica à ação que zera nos endpoints. Se isso não for possível sem mexer
na malha/rig comum, a recarga M4 permanece bloqueada e o caminho correto é
novo asset de mão/roupa, não ampliar a rotação do mínimo.

## M4 — réguas de punho e de contato mão/carregador, 06/09/2026 — **C1 e C2 rejeitados**

Rodada somente de medição sobre `A/m4-actions-fingers-c1/m4-actions.blend`
(`2955150a…`), sem tocar em runtime, idle aprovada, arma, malhas ou rig, e sem
exportar nenhum GLB. Duas réguas novas, ambas com controle que falha de
propósito:

- `tools/viewmodels/prep/rifles-m4-actions-wrist.py`: perfil transversal
  assinado da borda manga/pele ao longo do eixo punho→cotovelo e área de pele
  realmente visível pela `VIEWMODEL_CAMERA`, com oclusão por tecido, luva, arma,
  carregador e pelo próprio antebraço, nos 73 frames e na idle, em 3:2 e 16:9.
- `tools/viewmodels/prep/rifles-m4-actions-bolt.py`: cruzamentos exatos de
  aresta/triângulo nos dois sentidos, por região da mão, contra o carregador
  posado, em todos os frames, mais o alcance dos dedos até `bolt_release`.

### O bloqueio "pele exposta em f013/f045" não se sustenta

Pela câmera do jogo, a pele visível é **0,00 mm² em f013 e em f045**, nos dois
aspectos. A idle aprovada mostra **76,37 mm² em 3:2** (0,00 em 16:9) — mais pele
do que os frames que estavam bloqueando a recarga. Em 16:9 nenhum frame do clipe
mostra pele. A faixa verde citada antes vem da câmera de diagnóstico (0,28 m,
40 mm, lado oposto), que enquadra uma região que a câmera do jogador não vê
nesses frames; contando pixels nos próprios material-id, a idle tem 2.147 px
verdes (0,957% do opaco) contra 1.530 em f045 e 910 em f013.

A cobertura de manga autorada existe e funciona: desligá-la recua a borda da
manga de 2,19 mm para 13,08 mm em f013 e acrescenta 283,9 mm² (f013) e
316,8 mm² (f045) de pele descoberta, além de colocar 19,35 mm² dentro do quadro
3:2 em f045. Esse é o mutante da régua.

Fica um item real e novo, que ninguém tinha registrado: **f050–f057 em 3:2**,
acima da idle, com pico de **216,40 mm² em f053** (2,8× a idle), durante o
trajeto para o ferrolho. E o perfil transversal em f045 mostra a manga *dentro*
da pele nas estações 8 mm e 12 mm (folga −4,35 mm e −4,42 mm), que é a origem
dos pontos verdes isolados sobre o tecido.

### O motivo real da reprovação é muito maior que f062

A mão cruza o carregador em **59 dos 73 frames**. Limpos apenas f000–f008 e
f068–f072.

| Janela | Regiões | Cruzamentos | Além da superfície |
|---|---|---|---|
| f012–f046 | palma + polegar | 242 constantes | até 6,09 mm |
| f048–f050 | as seis regiões | pico 585 em f049 | até 8,70 mm |
| f059–f065 | palma, anelar, mínimo | até 274 | até 8,49 mm |

Ou seja, durante toda a fase em que a mão "segura" o carregador (f012–f046) a
palma e o polegar atravessam a parede dele; f062, o frame que C1 e C2
disputaram, não é o pior nem é especial (236 cruzamentos). E o ferrolho nunca é
alcançado: o dedo pressionador mais próximo fica a **50,37 mm em f057** e a
**67,57 mm em f062**, que é justamente o evento `bolt` do jogo em 2,064 s.
`H_bolt` põe o *centro da palma* a 20 mm da paleta, então nenhum dedo pressiona
nada.

Isso explica C2 sem recorrer a anatomia: o otimizador precisou de
`pinky_01_l = -83°` porque estava compensando uma mão posicionada dentro do
carregador. Nenhuma curva de dedo conserta isso.

**Consequência para o incremento de dedos aceito em C1:** ele foi medido por
distância não assinada até a superfície, então uma palma 6 mm além da parede
lê como contato excelente. A melhora de proximidade é real, mas não prova pega;
o critério usado era insuficiente.

### Validação das réguas

A primeira versão da régua de contato media profundidade por paridade de raios.
O autoteste reprovou o método: o carregador separado é uma casca **aberta**
(313 arestas de borda em 491), então nenhuma afirmação de contenção ou
profundidade assinada é legítima. A régua foi trocada, e o relatório publica
apenas cruzamentos exatos e o comprimento além da superfície. Controles da
régua final: a pose limpa f072 dá 0/0, e a mesma pose com o carregador
transladado 144,35 mm sobre a palma dá 238/179.

### Veredito

**C1 e C2 rejeitados**, e o bloqueio do punho reclassificado. Nenhum GLB
candidato foi gerado ou publicado nesta rodada; nada entrou em runtime.
Evidência fora do Git em `A/m4-actions-wrist/wrist-profile.json` e
`A/m4-actions-bolt/bolt-press.json`.

Próximo passo mínimo, e não é curva de dedo: reautorar `H_grasp` e `H_bolt` em
`rifles-m4-actions-build.py` para que a mão toque a superfície do carregador por
fora e o dedo pressionador alcance `bolt_release`, e só então remedir o clipe
inteiro com as duas réguas antes de qualquer render ou export. Enquanto a
recarga estiver reprovada, o item de manga f050–f057 fica atrás dessa correção,
porque a trajetória que o produz vai mudar.
