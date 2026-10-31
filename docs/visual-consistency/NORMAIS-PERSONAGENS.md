# Normais de personagens — solda offline (NORMAIS-PERSONAGENS)

> Ferramenta: `tools/characters/smooth-normals.mjs` · régua:
> `tools/eval/character-normal-weld-check.mjs`. Diagnóstico que motivou (31/10/2026):
> `audits/2026-10-31-visual-consistency/GLM-NORMAIS-RESULTADO.md` (no checkout principal,
> fora do Git deste repo) — zumbi, caipora,
> lampiao e esquerdomacho têm a faceta **gravada no atributo NORMAL do GLB** (normais
> por face em posições duplicadas), não é pipeline do jogo.

## O que a ferramenta faz

Reparo **determinístico e offline** no GLB: solda a normal de vértices que compartilham
**posição exata** (bits do FLOAT32) e **influências de skin canônicas** (pares
joint:peso com peso > 0, ordenados por joint). A normal soldada é a **média das faces
incidentes ponderada por área** (produto vetorial não normalizado acumulado por vértice),
gravada de volta **apenas nos 12 bytes FLOAT32 de NORMAL de cada vértice** — respeitando
bufferView interleaved (stride 52/56 dos arquivos reais, normal no offset 12), sem
rebuild do glTF: JSON, índice, POSITION, UV, JOINTS, WEIGHTS, material, imagens e
animação ficam byte-idênticos, comprimento preservado, hashes antes/depois reportados.

Guardas:

- **Ângulo** (`--max-angle`, default 60): só entra na média a cópia cuja normal original
  divergence <= ângulo do vértice corrente. Pares ortogonais/opostos e vincos >60° não
  colapsam — a régua prova em fixture (90° e 180°) e nos arquivos reais (vértices sem
  par compatível ficam byte-idênticos).
- **Skin**: posições coincidentes com influências diferentes não soldam (corpo/peça
  sobrepostos preservados).
- **Singleton não é recalculado**: sem pelo menos 2 cópias e 2 contribuições compatíveis,
  a normal original fica como está — diferença deliberada em relação à prova inicial
  in-memory, que recalculava singleton.
- **Candidato degenerado rejeitado**: soma de faces que cancela (zero) ou NaN mantém o
  original. No aceite APÓS, toda NORMAL de grupo originalmente totalmente compatível
  também precisa ser finita e ter norma positiva antes da normalização; normal original
  degenerada continua fora do contrato.
- **WEIGHTS_0 tem que ser VEC4 FLOAT**: U8/U16 normalizado é rejeitado — a chave de skin
  deixaria de ser canônica por valor e não existe fixture do caminho (os 4 alvos são FLOAT).
- **Escrita de NORMAL não pode tocar bytes de outro consumidor**: antes de escrever, a
  ferramenta mapeia TODOS os consumidores do BIN (atributos de qualquer primitiva,
  inclusive *skipped*, índices, animação, `skins.inverseBindMatrices`, imagens) e recusa
  qualquer interseção — alias de NORMAL com TEXCOORD/POSITION/qualquer atributo na mesma
  primitiva, em primitiva *skipped* ou com dados de animação/imagem é **rejeitado**, não
  processado (layout compartilhado sem necessidade real = fail-closed; não existe
  remapeador). Accessor NORMAL/POSITION exclusivo por primitiva segue valendo.
- **Buffer único embutido**: `bufferView.buffer != 0`, mais de um buffer ou buffer 0 com
  URI (externo/data-URI) são rejeitados — nada é lido ou escrito fora do chunk BIN.
- **Índices e triângulos completos**: cada índice precisa estar em `[0, POSITION.count)`;
  `indices.count` (e `POSITION.count` sem índices) precisa ser múltiplo de 3 — cauda
  solta ou índice OOB (NaN silencioso) são rejeitados com a posição no stderr.
- **Só conjunto _0 de skin**: `JOINTS_1`/`WEIGHTS_1` (e qualquer `JOINTS_n`/`WEIGHTS_n`
  com n≠0) é rejeitado explicitamente — conjunto adicional não entra na chave em silêncio.

Falha **explícita** (nunca silenciosa) em: compressão (`extensionsRequired`), accessor
`sparse`, morph targets, `TANGENT` (solda sem reortogonalizar arrisca integridade),
`WEIGHTS_0` não-FLOAT, `JOINTS_0`/índices com componentType fora de 5121/5123/5125
(ex.: 5122 é inválido por spec e não é lido em silêncio), counts de `JOINTS_0`/`WEIGHTS_0`
divergentes de POSITION, accessor NORMAL/POSITION compartilhado entre primitivas, **alias
de NORMAL com qualquer consumidor do BIN** (guarda acima), **buffer externo/URI/
bufferView≠0**, **índice fora de `[0,n)` ou count não múltiplo de 3** (com ou sem
índices), **`JOINTS_n`/`WEIGHTS_n` com n≠0**, GLB sem chunk BIN, accessor sem bufferView,
`mode` não-triângulos, layouts de accessor fora do especificado. CLI: `-o/--out`/
`--max-angle` sem valor, seguido de opção, **ou opção desconhecida** (ex.: `-o --jsonx`)
→ usage + exit 2 (nunca dry-run silencioso). Sem `.env`, sem rede.

Segurança de escrita: sem `-o` é **dry-run** (só relatório). Com `-o`, exige arquivo
**diferente** da entrada (mesmo inode via symlink/hardlink é recusado antes de tocar a
fonte), valida tudo em memória, escreve com temp+rename e confere o resultado.
**Nunca** escreve em `public/` por conta própria — a fonte fica intacta.

## Limites conhecidos

- Compatibilidade angular é **por vértice** (matemática do experimento A/B que o crítico
  já avaliou in-memory): grupos com vizinhança compatível assimétrica podem manter
  resíduo >1° entre membros compatíveis. É comportamento aceito, não bug.
- Banda de altura não identifica peça: o arquivo tem uma malha só (`char1`). Olho/pálpebra
  coincidentes com a mesma skin e <=60° **seriam** soldados — nenhuma promessa de
  preservação facial; a conferência é visual (pendência abaixo).
- Não gera normal de albedo, não subdividi, não mexe em tesselação (o defeito do saci é
  outro: malha chunky, normais já suaves).

## Por que offline e por que 60°

- **Offline, custo zero em runtime**: o cálculo roda uma vez por arquivo; no cliente não
  entra nenhum passo novo de load (o carregamento do GLB não muda). Ver lição 11 de
  `docs/LICOES.md` no repo irmão `progress` — `../../progress/docs/LICOES.md` a partir
  do worktree, `../progress/docs/LICOES.md` a partir do checkout principal (fora do Git
  daqui): cálculo caro e determinístico pergunta se precisa rodar no cliente — aqui não.
- **60° é parâmetro do experimento**, herdado da prova A/B in-memory validada visualmente
  (screenshots front/back/face 1320×880 e sheets idênticos), **não é aprovação autoral de
  qualidade nem teto de invariante** (Lei 2: número sem procedência é opinião). Trocar o
  valor é `--max-angle N` + re-rodar a régua.
## Régua

```bash
# régua manual de transformação (baseline EXPLÍCITO de originais):
mkdir -p /tmp/normal-baseline && for n in zumbi caipora lampiao esquerdomacho; do \
  git show ad696fb87:public/models/characters/$n.glb > /tmp/normal-baseline/$n.glb; done
node tools/eval/character-normal-weld-check.mjs --baseline-dir /tmp/normal-baseline
# gate de produto (default: public/models/characters):
node tools/eval/character-normal-quality-check.mjs --models-dir /caminho/dos/outputs-v5
```

`character-normal-weld-check.mjs` exige os **originais**: confere o SHA-256 dos 4 GLB do
`--baseline-dir` (default `public/models/characters`) contra a referência e **falha com
instrução de extração** se o diretório já contém os produtos soldados (pós-swap) — o piso
RED de 500 nunca é baixado. Baseline durável dos originais: commit
`ad696fb87` (`public/models/characters`), extraído com `git show` como acima; opção
desconhecida, `--baseline-dir` sem valor ou diretório sem os 4 arquivos => usage/exit
explícito (2/1). A régua não entra no `check:fast` depois do swap.

O gate de produto usa a referência `tools/eval/refs/character-normal-smooth-groups.json`
(**versão 2**) e não a atualiza sozinho. Geração explícita, somente após revisar os
originais e o output determinístico (nunca a partir do produto corrente sem revisão):

```bash
node tools/eval/character-normal-quality-check.mjs \
  --from-dir /tmp/normal-baseline \
  --approved-dir audits/2026-10-31-visual-consistency/character-normals-output-v5 \
  --write-ref
```

A referência v2 guarda, por modelo: SHA da fonte original (proveniência), fingerprint de
todos os bytes protegidos (NORMAL zerada), quantidade de vértices, grupos por posição +
skin com normais originalmente compatíveis e **`normalSha` — o fingerprint NORMAL COMPLETO
(todas as ocorrências, dentro e fora dos grupos) do output aprovado**. O aceite exige
TUDO junto: bytes protegidos e contagem idênticos, `normalSha` idêntico (reprova flip
conjunto de todas as normais, zero/NaN ou mudança de direção em qualquer vértice,
incluindo singletons e vincos fora dos grupos) e a métrica real de grupos (NORMAL finita,
norma positiva, divergência <=1° entre cópias). Não é um gate só hash: a métrica de
grupos continua medida. Fonte inesperada na geração (output que altera bytes fora de
NORMAL, contagem divergente ou byte-idêntico ao original) é rejeitada antes de gravar.
O leitor de JOINTS_0 é tipado (U8/U16/U32, stride tightly packed) e um selfTest interno
com fixtures tightly packed roda em toda execução do gate.

Fixtures independentes (costura UV suave, vinco 90°/par oposto, skin diferente,
singleton, soma-zero, índices U32 > 65535, layout interleaved stride 52 e 56), 24
variantes de rejeição `unsupported` (draco, TANGENT com e sem alias de bytes, sparse,
morph, mode, WEIGHTS U8, sem BIN, sem bufferView, accessor compartilhado por ID e por
faixa sob ID diferente, indices/JOINTS componentType 5122, counts de JOINTS/WEIGHTS !=
POSITION, alias NORMAL×TEXCOORD/POSITION na mesma primitiva (com solda efetiva) e
×POSITION de primitiva skipped, bufferView buffer≠0, buffer 0 com URI, JOINTS_1/
WEIGHTS_1, índice fora de `[0,n)`, indices/POSITION count não múltiplo de 3 — cada uma
exigindo causa explícita no stderr, exit != 0 e nenhum arquivo criado), 10 malformações
de CLI exigindo exit 2 (incl. `-o --jsonx` e opção desconhecida) sem sobrescrever output
antigo — o sentinel é relido **byte a byte após cada controle**, `skippedPrims` explícito
no `--json`, medição RED/DEPOIS nos 4 arquivos reais (leitura only; DEPOIS é invariante
matemática com predicado centralizado `weldAcceptance`: exige resíduo 0, cobertura >0 e
NORMAL finita/norma positiva — o mesmo predicado reprova mutantes 3-de-4, zero e NaN),
integridade byte a byte fora dos offsets de NORMAL, e seis mutantes de causalidade:
sem guarda de skin, sem guarda de ângulo, escrita no offset errado, sem guarda de
TANGENT, solda de só 3 de cada 4 grupos e NORMAL degenerada em output real — cada um
tem que ser pego pela cláusula correta. O placar é reportado pela execução, não fixado
na documentação.

## Estado — aplicado; movimento contínuo capturado
- **Referência v2 (31/10/2026, R7)**: gerada dos originais extraídos de `ad696fb87` +
  output aprovado v5 (revisado em v3, hashes idênticos); a determinismo foi reconferida
  rodando `smooth-normals.mjs` sobre os originais do commit — os 4 hashes batem com v5.
  Com a referência v2, o gate é **RED sobre `public/models/characters` (originais) até o
  swap** e fica **VERDE depois do swap** para exatamente os bytes aprovados; qualquer
  alteração de NORMAL fora dos grupos (flip conjunto, zero, NaN, singleton, vinco) reprova.
  Nada aqui é aceite de release.
- **Aplicação autorizada em31/10/2026**: os quatro outputs v5 foram copiados para
  `public/models/characters/` após28/28 da transformação e4/4 do gate de produto,
  repetidos pelo Root, e revisão integral independente R7 CLEAN. Os originais
  permanecem recuperáveis em `ad696fb87`. Outputs R5 (audit fora do Git): `audits/2026-10-31-visual-consistency/character-normals-output-v5/{zumbi,caipora,
  lampiao,esquerdomacho}.glb` — sha256 de cada um conferido **igual** ao manifest
  `character-normal-output-v3-sha256.json` (regenerado após as guardas R2/R4/R5). As
  guardas não mudaram o algoritmo; os frames/imagens v3 continuam descrevendo exatamente
  estes bytes.
- **A/B no navegador recapturado pelo Root (31/10/2026, v3)**: `character-normal-output-v3-*-*.png`
  no mesmo audit (fora do Git) — 4 personagens × idle front/back/face + walk A/B + run A/B
  + reload front/back, par original/soldado na mesma pose (NORMAL do GLB copiado ao clone),
  controller walk/run conferido e reload com keyframe > 0. v1 rotulou walk com controller
  em run (só diagnóstico); v2 falhou por HMR; **v3 é a válida**.
- **Crítico de asset com contexto limpo ENTREGUE (31/10/2026, `CRITICO-NORMAIS-OUTPUT-V3.md`
  no audit, escopo frames v3)**: preferiu weld60 nos 4 personagens, sem regressão nova,
  rostos preservados — **não é aceite de release**.
- **Runtime público contínuo**: vídeos8,5s emPiscina/Ferro com os quatro personagens,
  CharController real, fases idle/walk/run/reload/stop,501+493frames finitos.
  Roots fixos: isso valida a apresentação temporal do controller, sem testar física
  de deslocamento. Viewport1320×880; drawingbufferlow990×660, sem ampliar o vídeo.
  `character-normal-public-{piscina_treta,ferro_velho}-continuous.webm` eJSONs no audit.
  Crítico `CRITICO-NORMAIS-PUBLICO-CONTINUO-R1.md` aprovou o recorte amostrado dos
  quatro personagens; cintilação em todo o vídeo permanece UNKNOWN. Não é release.

## Compatibilidade com a medição de cabeça em integração

O WT integral também contém a medição de cabeças do PR#1179, ausente da main usada nesta entrega isolada. Nele, os quatro GLBs antigos e novos foram medidos no Ego com o corpo exato do gerador: geometria e silhueta deram o mesmo resultado. Apenas quatro registros de SHA/frescor precisaram atualizar; hitboxes públicas permaneceram iguais.

Essa atualização da tabela pertence à integração com#1179; não há tabela nova nem mudança de hitbox nesta branch. Provas na auditoria privada: headshot-four-{real,baseline}-Ego.json, headshot-four-freshness-provenance.json e root-headshot-normal-all-final.log.

## Exceção de equivalência NORMAL-only no fit de eyewear (31/10/2026, R1)

A entrega dos outputs v5 trocou os bytes de `esquerdomacho.glb` e deixou o
`face-landmarks.json` histórico apontando o corpo antigo (`51bd7a1a…`), quebrando a
identidade `bodyId+bodySha256` do `eyewear-fit-check`. A identidade permanece o default;
a única exceção aceita é a declarada em `tools/characters/normal-only-equivalence.mjs`:
legacy == sha do ORIGINAL congelado na ref v2 (`character-normal-smooth-groups.json`,
arquivo verificado por sha próprio), público atual == output EXATO aprovado
(`5a615784…`), e fingerprints `protectedSha`/`normalSha`/contagem iguais aos da ref —
ou seja, byte-idêntico fora de NORMAL. O gate `normal-only-fit-equivalence-check.mjs`
prova isso e mata mutantes de 1 byte em POSITION, JOINTS, JSON, NORMAL (primeira e
última), além de legacy retargetado e bodyId desconhecido. Qualquer outra divergência
recusa com motivo específico; nada de "NORMAL não importa". Capturas históricas do
fit-matrix continuam declarando o hash original.

R1 do crítico fechou duas brechas de integração (2 P2): o `eyewear-fit-check` agora exige
`landmark.bodyId === character:<chave>` e o caminho exato esperado do corpo (o declarado na
tabela congelada para a exceção; `/models/characters/<chave>.glb` para os demais), e chama
`proveNormalOnlyEquivalence` **sempre** que o modelo tem exceção declarada — inclusive quando
o sha do landmark já iguala o atual, o que mata o retarget coerente de landmark+perfis+rows.
Para os demais corpos, identidade estrita `bodySha256 == hash do público` permanece. Mutantes
integrados novos: `integrated-retarget-historical-shas` e `exception-borrowed-by-barbudo`.
O positivo "old" do gate de equivalência extrai o ORIGINAL do commit de proveniência
`ad696fb87` via `git show` (sha conferido contra o legacySha antes de provar identidade);
em clone shallow sem o objeto o gate registra a nota `legacy-buffer-unavailable-shallow-clone`
e informa `identity-positive-not-exercised` com `identityVerified: false`. O positivo de identidade
não é exercitado nesse clone; o gate nunca fabrica o sha do original.
