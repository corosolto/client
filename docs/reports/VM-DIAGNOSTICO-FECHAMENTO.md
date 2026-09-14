# Viewmodels — diagnóstico e continuidade do fechamento

Auditoria de 13/09/2026, solicitada por Ruben. Este documento registra a retomada;
o [prompt da frente](../../PROMPT-CODEX-VIEWMODELS.md) conserva o histórico operacional.

## Objetivo inteiro e definição de pronto

Terminar o arsenal em animação, leitura visual, escala e contato das mãos,
preservando as referências aprovadas. Cada arma precisa funcionar em idle, equip,
tiro, ADS, recarga e transições, com recarga coerente com seu mecanismo.
Aceite exige evidência nova no jogo em 3:2, crítico independente e Ruben jogando.
Presença do GLB, `golden: true` e régua estrutural verde não significam aprovação.

## Worktree e checkpoint

- Árvore: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-unificado`.
- Branch: `claude/vm-unificado`; HEAD auditado: `012add17b5ddbc6aeb7ea03758f90685368c5850`.
- Árvore limpa antes desta rodada. Implementação local em andamento; marcos e caminhos alterados abaixo.
- Servidor da porta 4361 confirmado por `lsof` com cwd nesta árvore.
- `origin/claude/vm-unificado` é apenas a referência local observada; não houve fetch nem push.
- Checkpoints relevantes: `83a6a1c3d` (ilhas), `5dfdb26bf` (âncora e régua inválida),
  `abe987d4a` (cache), `9720778ca` (doadores), `012add17b` (modelador).
- Execução de browser nesta sessão exigiu `PATH=/opt/homebrew/bin:$PATH`:
  o Node selecionado inicialmente em `/usr/local/bin` foi rejeitado pelo Playwright.
- Nenhum commit, push, deploy ou troca de branch nesta rodada.

## Retomada rápida — estado local atual

A raiz de evidências desta rodada é `artifacts/viewmodels/fechamento-ruben/`.
O histórico abaixo conserva rejeições; estas não são candidatas a promover.

- Integrados localmente: seleção de pentes M92/SCAR/M4, MD97v12,
  apoio MP5v2, apoio SVD e remoção do cilindro sobre sua luneta, Deagle e
  revólverv6 com peças móveis/tiro mecânico. Manifestos `integrar-*` guardam backups/hashes.
- SVD recarga original preservada; `svd-integrada-sem-proxy/` é captura ativa,
  sem override. Deagle ativa revisada em `deagle-integrada-live/`.
- Revólverv6 integrado por `promote-revolver-v6.py`: privado isolado SHA
  `48e5e888c33637e0770c7811a50e72b37e9522fccf9c83e539754176dcfb4091`, world
  `b553c2cce8486b442958ea834e4a1a0c5303b7009a6fc780458dcf5055279c6c`.
  `revolver-integrada-live/` captura sem overrides e crítico aceitou consistência
  de busca/pinça/equip/tiro/retorno. Assento oculto e suavidade entre PNGs não certificados.
  V1–V5 rejeitadas para aparições expostas; não executar promoção v5.
- M3 NÃO integrada: v8 tem pega/cartucho expostos aceitos visualmente, mas
  luva atravessa guarda/porta na medição. Próximo registro de polegar em
  `shotgun-push-grip/`; indicador deve liberar antes da entrada da ponta.
  `shotgun-shell-v8-diagnosis/` documenta o defeito real, não aprovação. A receita
  de polegar inclinada fica livre só até t=.213; t=.214 cruza guarda. Não estender
  esse resultado até ocultação. Novo estudo deve reorientar a mão para pressão pela ponta.
- MD97v12 integrada: `integrar-md97-v12/manifest.json`; SHA
  `95724b1bd32b0b61e79427b905218abdd29395ab1009288caef8ff24d1267e4c`.
  Transporte por frame da pega AK real; posição longitudinal escolhida em v12,
  preserva curvatura, comprimentos e esquerda. Crítico aceitou registro/silhueta/
  equip/pinça; gatilho e palma ocultos não certificados. `md97-integrada-v12-live/`
  confirma URL servida com hash novo, sem overrides. V10 ganchos/reversão rejeitada.
  Comparação antiga +22% foi invalidada; usar contornos completos do packet
  `md97-right-anatomy/grip-ak-registration/`, sem impor fechamento além da AK aceita.
- Uzi e SKS seguem pendentes de recarga apropriada e pega; candidatos anteriores
  são estudos, não integrações. Doador nativo Uzi em investigação offline
  (`uzi-native-donor/`), inclusive inconsistência de bind no bruto.
  O restante do arsenal e ADS/transições/escala
  completos continuam no objetivo, sem redução de escopo.
- Runtime: ancoragem/peças móveis, transições sem pente duplicado e cache por
  conteúdo já corrigidos localmente, com gates e mutantes próprios. Revalidar
  após próxima integração. `eval:vm` sempre antes de `invariants`.
- Preservação de candidatas verificada em `candidate-preservation.json`: revólverv6
  otimizado preserva geometria/skin e canais fora da busca de munição; MD97v11/v12
  preservam tudo fora das rotações do braço/dedos direitos. Não mede colisão visual.
- `check:fast` concluído em `check-fast-current.log`: falhas em mapid, redesign,
  documentação gerada e áudio local ausente. `npm run docs` corrigiu blocos e
  `docs-recheck.log` passa. Mapid aponta IDs antigos em docs; redesign aponta hashes
  de auditoria de mídia/personagens divergentes; não relacionados a arquivos editados
  nessa frente. Áudio não foi reconstruído com manifest vazio. Rechecagem final pendente.
- Único browser: root. Agentes só medem geometria/poses e criticam fora do browser.
  Assets privados desta worktree apontam para `.../fechamento-ruben-20260914/active-worktree`;
  famílias ainda não isoladas são symlinks: nunca escrever através delas.
- Pendem saneamento dos gates restantes, execução completa de Astro SSR, validação geral e Ruben
  jogando. Nada desta lista declara o arsenal pronto. Sem commit/push/deploy.

## Verificação da auditoria inicial

| Comando nesta árvore | Resultado e alcance |
|---|---|
| `node tools/eval/vm-autorado-vivo.mjs --porta=4361` com o PATH acima | Passou para todas as golden configuradas; verifica montagem e visibilidade, não qualidade. Usa o servidor do arnês, não uma execução completa de Astro SSR. |
| `node tools/eval/vm-cache-golden.mjs` | Passou: versões conferem com os bytes dos GLB locais. |
| `node tools/eval/vm-escala-check.mjs` | Reprovou AKM e o piloto de pistola. O piloto não é a rota ativa da pistola. |
| `node tools/eval/vm-peso-pente.mjs` | Passou; não identifica se a peça animada é o carregador correto. |
| `node tools/eval/vm-contato-mao.mjs --armas=ak` | Reprovou a própria calibração. O filtro também inclui AKM por prefixo. |

Na auditoria inicial ainda não havia captura ou crítica nova; os marcos seguintes registram as realizadas. `check:fast` e build continuam pendentes nesta rodada.
O placar geral copiado no prompt permanece herdado. Graphify não tem grafo nesta árvore;
a investigação prosseguiu por fontes e símbolos, sem reconstruir um grafo.

## Evidência visual inspecionada

Arquivos existentes em `artifacts/viewmodels/critica/`, fora do Git:

- `frames-golden/ak-idle.png`: mão de apoio envolve a região inferior/lateral do guarda-mão.
- `frames-familia/shotgun-idle.png`: fundo visível entre mão de apoio e arma.
- `frames-familia/shotgun-reload-f035.png`: arma sobe para perto da mira; mão direita aberta, sem cartucho visível neste quadro.
- `frames-golden/uzi-reload-f035.png`: tiras pontudas se projetam da arma e junto da mão.
- `frames-golden/svd-idle.png`: mão aberta elevada, sem envolver o guarda-mão.
- `bancada/bancada-reload.png`: evidencia que a peça marcada para recarga varia entre armas; mãos estão ocultas.

Estas observações descrevem os PNG existentes. Não certificam os bytes atuais de cada arma,
nem substituem uma sequência completa. Os lotes usam personagens diferentes; os JSON não
registram hashes dos assets por captura. Recapturar referências e candidatas na mesma condição.

## Achados que mudam a ordem do trabalho

1. **A medição de contato precisa de semântica, além de skinning.**
   `tools/eval/vm-contato-mao.mjs` usa posições locais. Já
   `tools/viewmodels/prep/vm-arsenal-frames.mjs` aplica ossos, mas `eMao` aceita
   `charging_handle` como mão; o erro aparece no `invMao` dos JSON de capturas.
   A distância mínima global também pode passar pela mão direita enquanto a esquerda flutua.
   Medir palma/dedos de cada mão e a superfície correspondente, por fase da ação;
   durante a retirada do carregador, soltar o guarda-mão é esperado.

2. **Escala do buffer não equivale a tamanho na tela.**
   `vm-escala-check.mjs` lê POSITION sem transformar nós, ossos ou câmera e inclui
   arquivos fora da rota ativa. Usá-lo como diagnóstico do asset; fechar escala com
   arma realmente montada, câmera/aspecto fixos e proporção mão/arma.
   O mutante `inflar` altera a medida calculada, não o asset ou seu uso pelo jogo.

3. **Separar o carregador não resolve a trajetória da recarga.**
   O construtor recebe `--doador`, mas pressupõe nomes e poses da AK, incluindo
   `Mag_metarig`, Equip e Idle. P90, bullpup, revólver, arma de alavanca, ferrolho,
   shotgun e alimentação por cinta precisam de ações próprias. Fazer a ilha certa
   seguir a trajetória errada continua sendo defeito visível.

4. **O inventário de doadores é um ponto de partida.**
   Leitura direta dos GLB confirmou os clipes citados e encontrou arquivos duplicados
   por SHA-256. Comparar topologia útil, bind pose, eixos, influência dos ossos nas mãos,
   trajetórias e mecanismo. Total de ossos semelhante não prova compatibilidade;
   nomes diferentes não descartam mapeamento semântico. Avaliar também preservar o rig
   do doador e adaptar um pacote completo, antes de impor retarget para o rig da AK.
   `animated_shotgun.glb` possui fases distintas de recarga; é candidata a prova offline,
   ainda sem avaliação de movimento/procedência suficiente para integração.

5. **Resolver contradições antes de distribuir tarefas.**
   O prompt põe LMG tanto na fila de pente removível quanto em alimentação interna;
   `vmconfig.js` declara `belt`. A receita e o help do construtor também divergem sobre MD97.
   O prompt afirma que somente caixa resolve SCAR/M92, mas o modelador propõe cirurgia
   topológica. Essa cirurgia precisa de prova; erro residual não é aceite obrigatório.
   A aprovação da M4 é declarada no prompt; AK, pistola e faca permanecem referências
   herdadas. Nenhuma aprovação nova foi concedida nesta auditoria.

## Divisão proposta e próxima execução

| Responsável | Entrega delimitada | Limite |
|---|---|---|
| Astra, integrador | Contrato de contato/escala, escolha de mecanismo por família, piloto difícil e integração | Único editor do conjunto runtime, mãos, animação, câmera, ADS e HUD. |
| Operador de malha conforme `modelador-vm.md` | Candidatas offline de SCAR/M92; investigar solução de MP5/MD97 | Cópias isoladas dos GLB; preservar arma no chão/mundo, orientação e escala. Não escrever no destino compartilhado. |
| Operador de doadores | Desduplicação, anatomia do rig, clipes, poses e prova de uma família | Artefatos/relatório offline; sem tentar adaptar todo o arsenal simultaneamente. |
| Operador de execução | Builds com receitas fechadas, hashes e relatórios de diferença | Escalar decisões novas ao integrador; sem ajustar números para fechar placar. |
| Crítico independente | Julgar sequências e regressões com contexto limpo | Receber imagens, sem justificativa do construtor. Um único operador de browser. |

Começar corrigindo o alvo da medição e capturando a referência estável. Em seguida,
resolver uma arma de caminho conhecido e uma família que exponha o limite da AK:
UZI (geometria/recarga) e shotgun (contato e cartuchos), sequencialmente na integração.
Preparação offline de malha e avaliação de doador podem acompanhar sem disputar arquivos.
Só expandir a receita após uma ação completa melhorar na revisão independente.

Pendências: crítica nova; cobertura das famílias que não são golden; ADS e transições;
reconstrução reproduzível; escolha de modelar ou doar a peça ausente de MP5/MD97;
aceite do dono. Não iniciar geração paga ou incorporação de material sem procedência resolvida.
O critério de platô e as regras de publicação permanecem no prompt da frente.

## Execução autorizada — lista do dono

Ruben pediu para prosseguir até terminar. A lista mais recente tem precedência sobre
aprovações antigas, inclusive da M4. Registro literal e aceite em
`KNOWN-BUGS.md`, entrada `BUG-VM-FECHAMENTO-RUBEN`. Nenhuma arma dessa lista foi
declarada resolvida nesta retomada.

Primeira captura atual: `artifacts/viewmodels/fechamento-ruben/baseline-m4/`, com AK
e M4 em jogo. Comando: `PATH=/opt/homebrew/bin:$PATH node
tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=4361 --aspecto=32
--modo=autorado --mapa=brasilia --armas=ak,m4
--out=artifacts/viewmodels/fechamento-ruben/baseline-m4`.
Próxima ação: crítica independente da sequência e diagnóstico da peça antes de reconstruir.

### Medição e primeira candidata offline

`vm-action-evidence.mjs` captura poses congeladas dos clipes carregados pelo jogo,
com personagem fixo, hash do GLB e câmera real. Não certifica transições, ADS ou
sequências de recarga das famílias. Baseline: `artifacts/viewmodels/fechamento-ruben/poses-baseline/`.
A classificação de mãos agora consulta `entry.handMeshes`; o nome `charging_handle`
não entra como mão. A captura terminou sem falhas; a mutação `--mutante=mao-nome`
reintroduz o classificador antigo e sai com código 1 (`mutante-mao-nome/`).

Crítica independente das ilhas identificou Uzi: carregador roxo #8, punho azul #3;
AK: punho ciano #6. Nas capturas atuais da Uzi o punho que permanece não é sobra de
carregador. A mão direita, contudo, permanece atrás do punho. A seleção correta do
carregador não basta para aprovar a recarga. Na M4, a peça extraída sai parcialmente
do enquadramento; a crítica não pôde certificar a peça inteira.

`uzi-rebuild/` reproduz a receita vigente offline. O construtor agora aceita pular
renders e registra argumentos no relatório. Foi detectado que o `.blend` perdia
as ações sem usuário; a retenção por `use_fake_user` foi acrescentada e aguarda
verificação por reabertura. `pilot-grip.py`/`uzi-grip-v1/` são experimento offline de
registro pelo punho identificado, sem substituir GLB público. Próxima ação:
comparar pose e integridade do braço, rejeitar alongamento e só incorporar uma
solução validada. Nenhum defeito do dono está encerrado.

### Continuidade após inspeção das candidatas

Baseline da lista do dono: `poses-lista-ruben/` sob a mesma raiz de artefatos.
As famílias Deagle, revólver e shotgun não possuem clipe `shoot` com esse nome;
o capturador registrou essas amostras como ausentes. Seus PNGs de idle/recarga
existem, mas não se deve interpretar a execução como teste completo de tiro.
`poses-pack-reference/` mostra os modelos originais do pack apenas para diagnosticar
o encaixe, sem alteração de assets públicos.

Uzi: `uzi-grip-v1` foi rejeitada pela crítica (mão aproxima, braço deforma).
`uzi-grip-v2` fecha a cadeia cotovelo/pulso; `uzi-grip-v3` foi rejeitada pelo próprio
solver por alcance impossível no frame 67 de Reload. `uzi-grip-v4` inclui o ombro
na cadeia e alinha a direção principal dos punhos de AK/Uzi. A mão ainda parece
pinçar o cabo e a esquerda continua aberta: candidata não promovida. Scripts e
logs por tentativa estão preservados, inclusive falhas. Não confundir continuidade
numérica das juntas com pegada visual correta. Reabertura do `.blend` confirmou
as ações preservadas (`reopen-actions.log`).

MP5/MD97: preparação offline em `malha-pentes/RELATORIO.md`; crítica das vistas
reimportadas achou os carregadores inteiros e nos poços corretos, com ressalvas de
acabamento e simplificação da MD97. Não há aprovação animada. O construtor passou
a aceitar `--malhapente` para selecionar a peça pelo nome e recusa entradas com
malhas extras ignoradas. Isso permite gerar apenas o viewmodel sem trocar a entrada
do mundo, que já recebe carregador procedural e duplicaria a peça. Builds animados
em `mp5-pente-v1/` e `md97-pente-v1/` estão em avaliação.

Frentes independentes: operador de malha prepara `malha-scar-m92/`; investigador
analisa somente leitura o encaixe das famílias em `familias-encaixe/`. Root continua
único integrador e operador de browser. Próxima ação: medir/capturar os builds com
pente nomeado, conferir que só essa peça acompanha Mag, e corrigir contato antes
de promover qualquer candidata. Todo o arsenal e a lista do dono permanecem no escopo.

### Marco integrado: peça extraída de M92 e SCAR

A crítica independente comparou as sequências `poses-pentes-v1/` com a baseline e
aceitou localmente a mudança da peça em M92/SCAR, sem piora identificada de escala,
corpo ou mãos. Desaparecem madeira/apêndices na M92 e lâminas/tiras indevidas na SCAR.
Pegadas abertas, enquadramento e tampas simplificadas continuam pendentes. Esta
aceitação delimitada não encerra as armas nem certifica continuidade entre quadros.

Integração local pelo `publicar-hires.mjs`, após ensaio válido. Backup e hashes de
antes/depois: `artifacts/viewmodels/fechamento-ruben/integrar-pentes/manifest.json`;
backup dos GLBs em `backup-public/`. Modificados apenas os dois GLBs de primeira
pessoa e `public/js/data/goldenver.js`; entradas de arma do mundo preservadas.
Cache pelos bytes e pesos rígidos dos pentes passaram. Captura de ações do jogo
em movimento concluída em `pentes-integrados-live/`: quadros inspecionados mostram canos/poços preservados, carregador parcialmente fora da tela e mãos ainda abertas. Sem commit, push ou deploy.

### MP5 integrada; MD97 reprovada

Crítica independente aceitou somente o carregador inteiro da MP5 em `poses-pentes-v1/`, sem regressão evidente de corpo/escala. Continua com mão direita atrás do punho, apoio frouxo e acabamento simples. Integração local pelo publicador, backup e manifesto no mesmo caminho acima; captura viva concluída em `mp5-integrada-live/`.

MD97 não promovida: carregador atravessa a palma em reload035 e fica junto ao pulso, abaixo da pinça, em reload065. A nova peça revelou contato incorreto e não deve ser instalada antes da correção.

Régua `check_arm_continuity.py` aceita somente `.blend`: glTF não serializa os tails dos ossos, e medir os tails reconstruídos pelo importador produz falhas artificiais. Uzi v4 passa na autoria; baseline v1 e mutação que afasta o pulso reprovam. Isso não aprova dedos nem pele.

Famílias: `vmweapon-neutral-bbox-v2.js` corrige o acesso interleaved da tentativa anterior; capturas em `poses-familias-neutral-v2/` aguardam crítica. Cópias experimentais não alteram runtime público. Próxima ação: fechar contato MD97, revisar encaixe Deagle/revólver e estender AUD1 antes de integrar mudança no caminho autorado. Todo o arsenal permanece no escopo.

### Encaixe autorado em validação

Runtime local alterado apenas para Deagle/revólver via `anchor: neutral_bone` em
`vmconfig.js`; `vmweapon.js` usa corpo deformado e caixa no espaço do socket,
retirando o giro adicional isolado da Deagle. Pistola e shotgun conservam suas
rotas. Primeira versão tinha bind inverso antigo no primeiro attach: revisão
independente reproduziu com GLBs reais antes de renderizar; corrigido com dispatch
de `updateMatrixWorld`. A fixture também passou a reproduzir esse ciclo.

`authored-attach-check.mjs --mutantes` passa e detecta as mutações; AUD1A integrada
à seção meta das invariantes em processo separado para não contaminar caches.
Prova real de carregamento/clone/attach em `familias-encaixe/runtime-audit.json`.
AABB mundial convertida após calcular o centro foi hipótese rejeitada: não é
covariante para a geometria assimétrica. A versão final mede pontos no socket.

Capturador `vm-action-evidence.mjs --sequencia-real` percorre o controlador com
passos fixos, recarga vazia e três munições nas armas em laço; registra clipes
visitados, fila e estado. Inclui tiro procedural/pump e não exige clipe `shoot`.
Sequência da primeira versão em `sequencias-encaixe-integrado/` é diagnóstico,
não aceite da última revisão. Captura atual em `sequencias-encaixe-v3/`.
`eval:vm` regenerado antes de `eval:invariants`; execução terminou reprovada.
AUD1/AUD1A passaram; placar atual somente no cabeçalho de `KNOWN-BUGS.md`, com log.
Não confundir com um `check:fast` ou build completo.

MD97: diagnóstico em `malha-pentes/DIAGNOSTICO-CONTATO-MD97.md` mostra a mesma
pose mão→Mag da AK sobre superfície deslocada e menor. Transladar só a mão piora
a penetração da palma; precisa registro de contato e articulação dos dedos sem
mover o poço. Nenhuma candidata MD97 promovida.

### Revisão visual do encaixe aceita; mecanismos candidatos reconstruídos

Crítico inspecionou `sequencias-encaixe-v3/` inteira e aceitou somente a melhora
do encaixe direito de Deagle/revólver. Não viu inversão de cano, escala explosiva
ou deformação grosseira. Deagle ainda baixa/cortada; recargas com pinça esquerda
vazia e tambor fechado continuam abertas. Mudança de fase não é comparação válida
entre a captura antiga de clipe isolado e a sequência real.

Causa dos mecanismos: joints raiz exportados incoerentes com inverseBind; Deagle
ativa sem normalização de tempo e revólver ativo ainda com composição/raw antigos
do Assimp. `familias-encaixe/mechanism-rebuild.md` registra prova e receita. Root
gerou bases rebaseadas e rodou assembler atual em cópias privadas isoladas:
`/Users/ruben/csbrasil-private-assets/generated/viewmodels-candidates/fechamento-ruben-20260914/`.
Script `rebase-family.mjs` sob a raiz de artefatos; manifesto da candidata isola
raw-clips e reports, além dos GLBs. Nenhum arquivo privado ativo foi substituído.

Roundtrip independente em `familias-encaixe/candidate-roundtrip.md`: Idle/bind,
clone, pivôs, duração comum dos canais e movimentos fiéis ao raw Blender conferem.
Captura do pack original corrigido em `poses-pack-mecanica-v1/` é diagnóstico.
A Mint da Deagle recebe carregador nomeado somente na cópia de runtime experimental
`vmweapon-deagle-parts-v1.js`, com geometria em `malha-deagle/`; o conjunto superior
ainda inclui cano/ferrolho, não separar como se fosse ferrolho pronto.

### Experimentos de contato atuais

MD97 `md97-contact-v2/`: braço inteiro passa na continuidade autoral. Crítica vê
melhora real da pega, mas mantém ressalva de penetração azul na face do pente em
025/035 e indicador afastado em 065. Não promovida; script `md97-contact.py`, versão
v1 preservada. Próxima correção: superfície de contato dos dedos, preservando poço.

MP5: alvo de registro de superfície em `malha-pentes/MP5-STRONG-GRIP-REPORT.md`.
Candidata `mp5-grip-v1/`, script `mp5-grip.py`: mão forte registrada ao punho medido,
indicador ajustado ao gatilho, braço resolvido sem escala. Captura junto com a
Deagle mecânica em `poses-mp5-grip-deagle-mech-v1/`; ainda não aceita/integrada.
Próximo passo: olhar esses PNGs, revisão independente, fechar contato MD97 e
mecanismos. SVD continua intocada para preservar sua recarga; todo o arsenal segue
no objetivo, incluindo Uzi/SKS/M3 e as demais armas fora deste lote.

### Peças nomeadas e continuidade dos braços

`vmweapon.js` agora suporta `namedParts` após âncora e trim completos, ainda sem
arma pública habilitada. AUD1A estendida reproduziu falha antes do conserto:
peça não seguia joint, reaparecia na troca e não estava registrada no cache.
Depois passa montagem preservada, movimento, reequipar e visibilidade. Mutantes
sem joint, sem inversa e separação antes da âncora reprovam; evidências em
`familias-encaixe/named-parts-{before,after,mutants}.json`. Não muda a rota
anterior de recorte das outras famílias.

MP5 `mp5-grip-v2/` corrige continuidade do braço esquerdo mantendo alvo da mão;
ambos os braços passam no .blend. MD97 `md97-contact-v3/` corrige dedos por
superfície do pente e também passa continuidade. Captura conjunta
`poses-contato-v3/`; aguardando crítica, nenhuma das duas promovida.
Crítica anterior aceitou posição direita MP5, mas dedos ainda abertos. Deagle
com mecanismo candidato põe pente na mão em 035; descarte 015 e reinserção
não foram demonstrados pelos frames parciais.

Revólver: `familias-encaixe/revolver-parts/README.md` prova tambor fundido ao
corpo por arestas. Discos de câmaras não são cartuchos completos. Reconstrução
offline iniciada; nada integrado. Apoio MP5/SVD em análise geométrica separada;
recarga SVD permanece preservada.

### Reprovação visual e preservação SVD

Crítica `poses-contato-v3/`: MD97 reduz recortes azuis no pente, mas pinça continua
aberta. MP5 grip-v2 reprovada: manga termina dentro do quadro em reload085,
apesar da continuidade matemática. Causa investigada: solver articulava ombro
sem necessidade; alvo alcançável só com braço/antebraço. Candidatas grip-v3 e
support-v2 mantêm ombro, ainda sem captura/aceite. support-v1 move apoio para
o guarda-mão (`poses-mp5-support-m4/`), mas herda solver anterior.

SVD: publicado é idêntico a `artifacts/viewmodels/e3/svd/ak-hires-pilot.glb`; o
.blend hires-v3 perdeu Idle/Equip ao salvar. `restore-svd-actions.py` recupera
poses do GLB pelo delta de skin para o rig autoral. `svd-support.py` altera
somente apoio em Idle/Equip/Shoot. `splice-svd-support.mjs` copia exclusivamente
canais de ombro/braço/antebraço/mão esquerdos desses clipes para o GLB publicado.
`svd-support-v1/splice-report.json` confirma arrays da recarga, todos os demais
canais e toda a geometria idênticos. Captura em `poses-svd-support-v1/`; nenhuma
integração SVD.

Deagle: sequência real vazia afastada para inspeção em
`deagle-mecanica-sequencia/`, com matrizes de peça/osso por fase; sem alteração
de escala no jogo. Revólver ganhou candidata estática reconstruída, faces
internas e mecanismos em `familias-encaixe/revolver-parts/RECONSTRUCTION.md`;
versão source para weaponModel em SOURCE-FRAME.md. Aguarda crítica/retarget.
SKS: prova de que o pente fantasma era um triângulo da soleira da coronha,
`malha-sks/sks-golden-false-mag-triangle.png`; reconstrução de alimentação offline
em andamento, sem animação ou asset ativo alterado. M4: diagnóstico do poço
fechado em andamento; não declarar a reclamação resolvida pela ilha correta.

### Integrações locais e transição de volta à pose de repouso

MP5 support-v2 instalada localmente, com backup da versão só-pente em
`backup-public/mp5-antes-apoios.glb`. Crítica aceita posicionamento do punho e
apoio sob guarda-mão; fechamento dos dedos ainda pendente. O solver preserva
ombros, eliminando a manga cortada dentro do quadro da v2 anterior.
M4: seis tampas indevidas do corpo removidas, conservando aro original e toda
animação. Crítica aceita figura do poço e sequência no jogo; instalada localmente.
Manifesto e hashes das duas em `integrar-apoios/manifest.json`. Cache por conteúdo
regenerado e `eval:vm-cache` verde. Nenhuma delas recebe aprovação completa.

Defeito reproduzido no controlador: `finished` chamava `_continue` dentro de
`AnimationMixer.update`; estado dizia Idle, mas esqueleto golden retinha pose
final da recarga. `authored-transition-check.mjs` usa métodos reais de produção e
prova falha antes em visível/oculto/utilitário. Correção adia troca de ação para
fora do update, sem mudar os clipes. Retorno oculto usa Idle imediato para não
abandonar fade pausado. AUD1B adicionada a `invariants.mjs`; régua corrigida passa
e mutação que remove adiamento reprova. Evidências `transitions-{before,after}.json`.
Captura real de SVD candidata, MD97 v4 e MP5 publicada em andamento em
`transicoes-corrigidas/`. Recarga SVD continua byte a byte preservada.

Geometrias candidatas, sem promoção: revólver reconstruído e pivôs retargetados
em `familias-encaixe/revolver-parts/`; Deagle ferrolho em `deagle-slide/` ainda sob
crítica de seleção. SKS alimentação individual em `malha-sks/` evita colisão do
clip com luneta, ainda sem animação. Shotgun em `malha-shotgun/RELATORIO.md` tem
pump nomeado e medidas das mãos; porta de alimentação e assento não resolvidos.
Próximo passo: fechar revisão do controlador, olhar transições novas, retomar
mecanismos e contato por arma. Objetivo inteiro permanece no início deste arquivo.

### Revisão de transições e mecanismos

`transicoes-corrigidas/`: crítico leu o trio SVD/MD97/MP5 completo e aceita
retorno Idle/equip sem ruptura nova de mangas. MD97 e MP5 ainda têm pinça aberta
na recarga e punho direito exposto; isso permanece pendente. SVD apoio inicial e
retorno aceitos, mantendo recarga original. A amostragem revelou necessidade de
medir continuidade no instante final: golden ignorava fade solicitado por
`_continue`. Novo caso falha antes (`idle-continuity-before.json`) e passa após
respeitar fade (`idle-continuity-after.json`), junto com mutante que remove blend.
Revisão independente anterior também acrescentou troca de arma/fila/granada real
à régua. Nova inspeção visual de retorno suave e referências em andamento.

M3: família privada candidata reconstruída por rebase + assembler em diretório
privado isolado. `familias-encaixe/shotgun-roundtrip.json` confirma skin rígido,
clones independentes e fase normalizada. `deagle-shotgun-mech-v1/` mostra eixo
corrigido com anchor neutral_bone candidato, mas mãos ainda fora do pump/punho;
nada instalado dessa arma. `retarget-private-grip.mjs` é solver experimental ainda
sem execução/alvo validado. Deagle ferrolho e revista completos são candidatos
na mesma captura; `mecanismos-sequencia-v2/` adiciona tiro e revólver reconstruído.
M3 porta interna em reconstrução offline por referência visual do manual oficial
Benelli; não confundir geometria simples de jogo com projeto mecânico funcional.

### Checkpoint: retorno sem peças fantasmas e tiro mecânico

MD97 v4 instalada localmente com backup/hashes em `integrar-apoios/manifest.json`.
Aceite limitado: pente restaurado, mangas/retorno preservados; pinça e punho
continuam pendentes. Diagnóstico de pads em `md97-grip-diagnosis/README.md` prova
que mínimo da falange inteira enganava a v4; há targets anatômicos para correção.

**Rejeitado** `retorno-suave-v1/`: fade de clipe inteiro fez carregadores
reaparecerem durante o retorno de SVD/AK (e lote em crítica). Reproduzido pela
régua em `rigid-idle-before.json`. Nova `_goldenParts` separa por ossos com pesos
reais nas meshes da arma: peças rígidas usam Idle imediato e apenas braços
interpolam. `rigid-idle-after.json` passa e mutante que mistura peças reprova.
`retorno-suave-rigido-v2/` nova captura completa: root viu AK103/SVD103 com pentes
assentados; aguardando crítica. SVD asset candidata ainda NÃO instalada.

Montador pago descartava Fire.FBX da arma quando faltava clipe Character. Fontes
Deagle/revólver têm esse caso. `assemble_paid_family.mjs` agora aceita tiro
mecânico com braços constantes no primeiro Idle e recuo procedural existente.
`mechanical-fire-check.json` compara antes sem shoot e depois com movimento
mecânico, braços idênticos. Novos privados `*-runtime-shoot.glb`; revólver também
`revolver-runtime-mint-pivots-shoot.glb`. Capturas reais em `mecanismos-shoot-v3/`.
Nenhum privado/world-model novo foi promovido ao caminho ativo.

M3 `shotgun-runtime-grip-v1.glb` privada candidata usa translação L medida no
neutral/socket, solver braço/antebraço sem mexer no ombro. Receita e script
`shotgun-grip-recipe-v1.json`, `retarget-private-grip.mjs`. Corrigida amostragem
para resetar mixer a cada frame: cache de canais constantes deixava acumular a
edição da amostra anterior. Solver passa alcance/escala; auditoria independente
GLB e captura `shotgun-grip-v1-live/` em andamento. Porta geométrica candidata
`familias-encaixe/shotgun-port/README.md`, ainda sem crítica/integração.

Execução `eval:vm` seguida de `eval:invariants` atualizou o placar somente em
KNOWN-BUGS.md. AUD1/AUD1A/AUD1B passaram; demais falhas já listadas persistem.
Audits JSON volumosos copiados a `audit-generated-transitions/` e restaurados no
working tree (estavam limpos no início). **Regenerar eval:vm antes de nova
execução manual de invariants**, conforme regra da casa. Nenhum commit/push.

### Continuação: aceite delimitado do retorno e troca de referência M3

Crítico independente inspecionou `retorno-suave-rigido-v2/` e aceitou retorno de
AK/SVD/MP5/M4 sem pente fantasma ou ruptura nova de mangas. Régua ampliada em
`familias-encaixe/transition-review/reviewed.json` verifica o ramo real com meshes
da arma; mutações de fadeIn/fadeOut também reprovam. SVD support-v1 instalada
localmente; backup e SHA em `integrar-apoios/manifest.json`, cache validado.
Sua recarga original continua preservada; cilindro herdado acima da luneta e
demais contatos do arsenal permanecem pendentes.

M3 v1 rejeitada por frame errado (neutral versus socket); v2 corrige frame e
preserva comprimentos, mas `shotgun-grip-v2-live/` mostra mão sobre cano e direita
afastada. V3 com rotação rígida completa falha alcance em pump_empty, sem saída.
Não promover nenhuma. Próximo caminho: examinar o doador fornecido pelo dono
`~/Downloads/animated_shotgun.glb`; diagnóstico estrutural e plano em
`shotgun-donor-analysis/`, preservando identidade dos braços do jogo.

MD97 pad-v5 é candidata, não instalada: `md97-contact-v5/` preserva continuidade
dos braços, mas ajuste dos dedos exige captura e crítica antes de aceitar.
`md97-pad-v5-live/` registra o teste real. Deagle/revólver com tiro mecânico em
`mecanismos-shoot-v3/` seguem em crítica. Mesmo branch/HEAD; sem commit/push.

### Continuação: cache completo e doador M3 recuperado

`gen-weaponver.mjs` gera revisões por bytes para fontes world e famílias privadas;
`weapons.js` e `authoredvm.js` consomem essas revisões. Antes, ambos repetiam URL
apesar de GLB novo (`cache-assets-before.json`). `vm-cache-assets.mjs` intercepta
o loader real e cobre inventário e consumo de família, mesmo sem binários privados.
Revisão independente encontrou e fechou três cegueiras iniciais: só ler tabela,
ignorar uso no CI sem privado e aceitar catálogo parcial no gerador. Evidências
`cache-assets-review.md` e `cache-assets-review-revalidated-summary.json`.
Integrado ao `eval:vm-cache`, que passou. Gerar novamente após trocar qualquer
world/família privada: `node tools/viewmodels/gen-weaponver.mjs`.

Deagle: crítico aceita recuo/retorno do ferrolho e trajetória visível de descarte
do pente na v3; contatos/acionamento encobertos não certificados. Revólver: tambor
inteiro abre/fecha e cão se move, mas pinça do cartucho segue reprovada. Régua
reproduzível `tools/viewmodels/check-mechanical-fire.mjs` mede movimento no GLTF
real; antes/depois e mutações em `mechanical-fire-review/`. Nenhum desses assets
foi integrado ao caminho ativo.

MD97 v6 aproxima punho direito e polpas esquerdas, aceite limitado da pinça em
`md97-grip-v6-live/`. V7 fecha apoio esquerdo em Idle/retorno e dedos direitos;
`md97-grip-v7-live/` em crítica. Ainda instalada v4, sem promover tentativas.

M3 doador: `shotgun-donor-analysis/bind-repair-report.md` prova POSITION 100×
no corpo/Pump; correção offline de 0.01 alinha malha às mãos, sem alterar bones.
Shell exige registro próprio. `landmarks.json` mede eixos/dimensões/contatos;
Shoot@0 é referência estável, Shoot já contém pump completo. Novo adaptador
experimental `retarget-shotgun-donor.mjs` preserva malha/bind da família UE e
gera somente Idle/Shoot da candidata privada `shotgun-runtime-donor-v1.glb`.
`shotgun-donor-v1-live/` é captura de viabilidade, NÃO família completa: recarga,
dedos, cartucho e alcance/ombro precisam validação antes de avançar integração.

### Checkpoint: Deagle servida e M3 com movimento completo do corpo

Deagle integrada **só localmente**: `integrar-deagle/manifest.json` guarda antes,
depois e backups. Família otimizada pelo `optimize_paid_family.mjs --familia=deagle`
para reutilizar texturas compartilhadas; geometria e clipes preservados. Config
nomeia pente/ferrolho/forro/cão. `deagle-integrada-live/report.json` confirma sem
overrides requests world `?v=bae90ee89d` e privado `?v=9716c72881`, sem pageerrors;
`authored-attach-check.mjs` passou. Contatos encobertos ainda não certificados.

**Isolamento privado:** descoberto symlink compartilhado em
`public/private-assets/viewmodels`. A cópia inicial alcançou o catálogo comum;
foi restaurada imediatamente, com SHA original conferido e registrado no
manifesto. Agora somente esta worktree aponta para
`~/csbrasil-private-assets/generated/viewmodels-candidates/fechamento-ruben-20260914/active-worktree`.
Essa pasta contém Deagle isolada e links para os demais arquivos originais.
Antes de promover outra família, criar sua pasta/cópia isolada: nunca escrever
através dos links das famílias ainda compartilhadas. Nenhum deploy/push/commit.

M3 donor-v1: crítico aceita eixo, apoio L e retorno, reprova manga cortada e
indicador R em U. `shotgun-sleeve/` mede corte na câmera e fornece extensão por
patch de geometria; v1 rejeitada por UV esticado, `build-extension-v2.mjs`
preserva tecido e precisa receber GLB sem extensão prévia. Doador v2 acrescenta
Take/ReloadStart/Reload/ReloadEnd; v3 transfere dedos por frames anatômicos, mas
foi rejeitada por corpo parado enquanto Pump seguia animação. V4 anima também
`RIG_WEAPON_SHOTGUN`, que é o socket real do holder Mint. Captura
`shotgun-donor-v4-live/` já mostra corpo/Pump juntos; cartucho ainda não existe.
Indicador pendurado confirmado por raycast no pixel (939,910), faces de luva
com pesos index_03_r/index_02_r; próximo ajuste em `shotgun-trigger/`.
Essas candidatas continuam privadas e não instaladas.

MD97 v7: esquerda Idle/retorno aceita, direita rejeitada como gancho. V8 usa
somente esquerda v7 e novo registro rígido direito medido por outro agente em
`md97-right-registration/` (braço alcançável em keys/meios, sem escala).
`md97-grip-v8-live/` captura candidata; v9 testa flexão com um eixo por falange
para evitar torção livre da v7. Não promover por loss/alcance: olhar e criticar.
Instalada MD97 ainda é v4; arma inteira segue pendente.

### Continuação: Deagle revisada e indicador M3

Crítico independente leu todos os quadros de `deagle-integrada-live/`: montagem,
equipagem, eixo, mangas e retorno preservados; pente sai inteiro. Assentamento
final e parte dos gestos continuam ocultos. Aceite limitado da integração local,
sem promoção externa nem aprovação integral do arsenal. Cache, attach e transições
passaram novamente após essa integração; não substituem a crítica visual.

`shotgun-trigger/` mede pad real do indicador direito e alvo no gatilho: a v4
fica distante; `shotgun-index-fit.mjs` resolve os dois primeiros segmentos e
orienta a falange distal, sem alterar mão ou comprimentos. Candidata v5 com patch
de manga em `shotgun-donor-v5-live/`, ainda privada; aguarda crítica. Mão esquerda
na recarga e cartucho continuam pendentes. Não promover pela coincidência do pad.

Revólver: `revolver-grip-diagnosis/` detecta registro do cartucho deslocado em
relação à pinça longitudinal já existente. Corrigir só a fase em que está na mão,
preservando o assento no tambor; nenhum ajuste novo aplicado ainda.

### Checkpoint: mão M3 anatômica, cartuchos do revólver e SVD

M3 v5 recebeu aceite limitado do índice direito. Na investigação seguinte,
`shotgun-reload-hand/` provou que o registro geométrico anterior invertia a mão
esquerda contra a anatomia do doador. V6 usa o frame anatômico correto e conserva
o alvo de apoio; `shotgun-donor-v6-live/` mostra a nova candidata, ainda privada.
`README-v6.md` e `comparison-v6.json` comparam deformação real: colapso do punho
em Reload045/065 resolvido sem rotação artificial do twist. Idle ainda tem roll
residual; crítica visual pendente. `shotgun-shell-contact/` mede os pads e prova
que só inserir cartucho entre dedos abertos não fecha alimentação. Shell do doador
possui hide/reset por escala e geometria absoluta inválida: não copiar às cegas.

Revólver: `revolver-contact-fit.mjs` gera `revolver-runtime-contact-v1.glb` privado.
Só translação/rotação dos seis Cartridge no Reload mudam, em janelas de pega
medidas; cedem à inserção e zeram no assento. `revolver-contact-v1-live/` inclui
quadros densos da inserção. `revolver-grip-after-v1/` repete medição com montagem
real e mostra aproximação dos pads, preservando as demais trilhas. Em crítica;
ainda não integrado ao caminho ativo.

SVD: removido apenas o cilindro sintético de AK que flutuava acima da luneta.
`svd-remove-proxy-handle.mjs` conserva todos os accessors; recarga intacta.
Crítico aceitou a remoção sem regressão nos oito quadros de `svd-no-proxy-live/`.
Integrado localmente pelo publicador, com backup/hashes em
`integrar-svd-sem-proxy/manifest.json`; não fecha contatos herdados nem arsenal.
Mesmo branch/HEAD, sem commit/push/deploy.

### Continuação: alimentação M3 e entrada da pinça do revólver

Crítica da M3 v6 aceita a melhora do punho/apoio e preservação do índice direito,
com limite explícito: ainda não havia alimentação. V7 acrescenta cartucho ligado
a Gauge e aproxima a mão do receiver; `shotgun-donor-v7-live/` foi rejeitada para
alimentação porque luva/corpo ocultam o cartucho. Inspeção diagnóstica em
`shotgun-donor-v7-under/` não constitui aprovação na câmera do jogador.
`shotgun-shell-v7-diagnosis/` investiga a trajetória real; primeiro resultado
confirma bind/contato dos pads, mas cartucho dentro da casca antes da entrada.
Próximo passo: medir passagem pela porta inferior e corrigir a trajetória, sem
reverter anatomia v6, indicador ou manga. V7 não está instalada.

Revólver v1 melhora a pega, mas crítica rejeita a aproximação em043 e não
certifica assentamento oculto no tambor. `revolver-entry-grip/` comprova os pads
compartilhados com a M3 e mede abertura insuficiente nessa entrada. V2 antecipa
a aproximação do cartucho e abre temporariamente o polegar; preserva demais
trilhas fora do recorte e mantém o assentamento original. Medição de alcance
passou, captura `revolver-contact-v2-live/` em andamento: não aceito/promovido.
A pasta privada `revolver-promote/` ainda contém v1 e não deve ser instalada.

MD97 v8/v9: crítica aceita retirada do gancho direito, mas reprova a pegada aberta;
v9 não traz fechamento convincente. `md97-right-anatomy/` identifica traseira
aberta do punho que invalida alvos de contato naquela superfície. Patch offline
mínimo de geometria em preparação pelo agente; ativa continua v4. Não corrigir
os dedos contra uma parede inexistente nem chamar alcance numérico de aceite.

### Checkpoint: passagem inferior M3, pega mantida e superfície MD97

SVD foi capturada novamente pelo caminho ativo, sem overrides, em
`svd-integrada-sem-proxy/`: requisições com hash novo, sem erros. Inspeção confirma
remoção do cilindro sobre a luneta; recarga aprovada pelo dono foi preservada.

Revólver v2 rejeitado pela crítica: a043 melhorou, mas42_5 ainda mostrava cartucho
separado abaixo da mão. Tentativa de antecipar IK diretamente foi rejeitada por
alcance, não gerou candidato utilizável. `revolver-hold-approach-v3.mjs` parte de
v2 e mantém pose da pinça + cartucho relativo à mão durante a subida, com blends
antes da exposição e até a fase já revisada. `revolver-contact-v3-live/` captura
entradas densas; root vê pega em21_5/42_5/63_5, crítica em andamento. Nenhuma versão
do revólver instalada. Staging privado `revolver-promote/` contém v2 agora.

M3: diagnóstico independente v7 provou bind correto, ocultação por penetração.
`shotgun-shell-v7-diagnosis/integration-recipe.json` mede corredor pela porta
inferior e hide somente após oclusão pelo receiver. V8 aplica essa passagem,
adiciona joint Elevator sem pesos e inclina a placa para cima; não prolonga a
trajetória através da parede interna simplificada. `shotgun-donor-v8-live/`
mostra cartucho vermelho entre dedos045 e entrada sob receiver046. Limites:
colisão da luva/apoio e revisão visual independente em andamento; não instalada.
`shotgun-shell-fit-v8.mjs` é fonte atual da candidata; o gerador Python anterior
não contém os últimos ajustes manuais de corredor/keytimes.

MD97: tampa mínima offline concluída em `md97-right-anatomy/grip-back-closure/`,
com originais preservados. `GLTF-CONTACT.md` e `gltf-contact-frames.json` corrigem
frames/normais e reprovam alvo antigo do mínimo por alcance real HEAD01→HEAD03.
`md97-contact-v10.mjs` testa IK de dedos sobre superfície corrigida e mantém o
restante da animação. Polegar ainda recebe dobra excessiva; não aceitar por
resíduo do pad. Captura `md97-grip-v10-live/` e busca de alvo melhor em andamento.
Ativa continua MD97v4. Mesmo branch/HEAD; sem commit/push/deploy.
