# Composição das mãos e hooks Three R897

Objetivo: preservar o controlador forte R826, a dívida de arte nomeada e as
ancestrias de Hands88d71f9960a1232532ff98bc4fd5f046ff2534d6 e
staging7cb43e7cb3d190b1bfd7bea4e32cf15601ce3560, com resolução Three pelo vendor
em leitura, sem criar ou alterar node_modules. A missão global visual/PR/release
continua, #1158 excluído e UI/social depois.

Lane: worktrees/tp-hands-hooks-compose-r897-20261101, branch homônima com prefixo
codex/. O checkpoint que contém este ledger é um merge local normal com esses
dois pais, preservando #1212/08b4023 e #1211/0cae42d. W821 permanece de Root.
Browser/GH/push/merge remoto não fazem parte desta autoria.

## Composição aceita

Conflitos somente em package/checker, conservando a lógica R826. Os hooks da
staging são recebidos sem alteração e entram em hashHandInputs. O controlador
continua como alias normal; cada filho recebe --import explícito. O alias estrito
standalone recebe o mesmo preload e permanece fora de check:vm. O pai não precisa
registrar hooks porque só importa módulos internos Node/support.

ensureLocalThree mantém sua assinatura interna, mas passa a validar somente o
vendor com lstat/realpath. Todo acesso/escrita/criação/adoção/reparo de shim em
node_modules foi retirado. O checker confere a resolução real de three, GLTFLoader
e SkeletonUtils antes dos imports. Ausência do hook ou addon fora do vendor é
INFRA3. CLI inválida continua2 antes do bootstrap, sem escrita.

O corpo semântico do checker, desde o import de THREE até EOF, é byte-exato ao
88. O controlador só ganha o preload do filho. O sufixo dos testes de protocolo
é byte-exato; o helper child passa o preload. Ownership obsoleto foi substituído
por topologias aceitas sem alteração, imports reais do vendor e recusa de vendor
faltante/symlink, mantendo testes de survivor/CLI/import/I/O/timeout/nonce/fontes.
MÃO1–MÃO4, RIG, dívida, application, hashes de assets, exit e failsets permanecem.

public/js/map_piscina.js, public/js/graffiti_layout.js e tools/gen-graffiti-layout.mjs
são byte-exatos à staging7cb. Não houve edição autoral em public/runtime/models,
pose, armas, mãos, HUD ou assets. O package preserva também a nova definição de
Piscina e as duplicatas de grafite vindas da staging, sem reserialização JSON.

## Antes e depois medidos

Baseline do helper antigo, em fixtures próprias: RED sem erro de infraestrutura.
Sem node_modules ele criava shim; pacote npm e parent symlink eram recusados.
Depois, os mesmos casos aceitam e mantêm bytes/links. Nenhuma dependência alheia
foi alterada ou apagada. Uma instalação real Three0.182.0 foi usada em leitura:
resolução normal apontava para npm; com hooks, three/addons importaram o vendor
r160. Hashes de todos os arquivos desse pacote ficaram iguais.

Node22 final, fonte congelada (recibos FINAL-*): focais19/19PASS; controlador
privado GREEN em13,337s; alias estrito GREEN em2,395s, 26 armas/40 rotas medidas,
1.037 cláusulas, zero NÃO MEDIDA, zero vermelho novo e a mesma dívida
RIG:pistol@pintura/f468adc9279d. O controlador conserva os sete casos e seus
failsets; luva-crua m4 tem48RED, incluindo12MÃO4, com30 aplicações nas duas rotas.
Controlador sem catálogo GREEN em9,365s, com24 rotas NÃO MEDIDA explícitas.
Strict ausente, hook ausente e cada addon estrangeiro retornam INFRA3, sem kill.

A fonte privada foi somente CSBRASIL_VM_ASSET_ROOT=/Volumes/Zenith/Assets/game/corosolto/private-assets/generated.
Nenhum GLB foi copiado, montado ou exportado; não usar o overlay default AWP/SVD
antigo como aceite. Os paths/bytes/SHA reais estão no manifesto externo.

## Modelo, evidência e limites

Uma consulta OMP zai/glm-5.3 low, tools0/MCPfalse, sem retry/fallback/compaction,
30,586s. RAW/ANSWER selados antes da leitura. Native aceitou readonly vendor,
hashbindings e preloads, conservou a assinatura ensureLocalThree e evitou preload
redundante no pai. GLM auxiliou proposta; Codex implementou/adjudicou/mediu. Sem
crédito de crítico independente. A primeira medição foi repetida após atualizar
somente a instrução de CLI no cabeçalho para fixar todos os hashes finais.

Prefixo A/VM-HANDS-HOOKS-COMPOSE-R897-: REPORT.md, MANIFEST.json, WHOLE.diff,
DELTA-GUARD, baseline/after readonly, REAL-NPM, FINAL-MEASUREMENTS, focais,
controladores, strict e controles de fronteira. stdout/stderr separados. O
manifesto externo guarda commit/pais, fontes, assets e aceitos/descartados.

Dívida externa R900, preservada por orientação Root: staging7cb trouxe chaves
//eval:grafite-fiel/eval:grafite-fiel duplicadas e alias Piscina com negação de
mutante cuja aceitação é investigada noutra lane. Este trabalho não corrige nem
aprova esse contrato. Root fará driver/fix separado; nenhum check:deploy foi
rodado aqui. As cópias recebidas são preservadas literalmente.

Próximo: Root lê/rebinda e adota a composição após seu ciclo de #1208, trata R900,
roda gates de integração e solicita review do head atual. Sem browser/headless,
build/suíte global, nova CI, publicação, aceite de arte/anatomia/contato, movimento,
MP, mobile físico ou release nesta lease. HEAD deve ficar estável até handoff.

## Root R910: adoção e validação local

Root leu integralmente o relatório e o diff whole R897, conferiu 145 pins de
fonte/asset/artefato sem drift e cinco arquivos protegidos byte-exatos à staging
7cb43e7. Adotou 330a6c1 via fast-forward no W821 preservando os dois pais.
Node22: 19 focais PASS em2,415s; controlador privado PASS em10,283s; estrito
26armas/40rotas PASS em1,467s, sem stderr. Catálogo privado generated igual
ao contrato R826. Recibos externos VM-HANDS-HOOKS-ROOT-R910-{REBIND,ADOPTION}.json
e três pares stdout/stderr. Nenhum GLB copiado ou alterado.

A dívida RIG da pistola pintada permanece; censo anatômico read-only R909 é
outra investigação e não muda este resultado. Antes do próximo push normal,
incorporar o retry corrente #1208 e a correção isolada R906 do alias grafite.
Depois recolher review formal do head publicado e crítico whole independente.
Ainda sem aceite Game3:2, anatomia/contato, MP humano ou mobile físico.
