# Character kit offline — v1 draft

Ferramentas Node sem dependências novas. Nenhum comando modifica o jogo, publica itens,
ativa acessórios, compra geração ou concede propriedade de catálogo.

```sh
# Node moderno; neste ambiente /opt/homebrew/bin/node é 23.6.
/opt/homebrew/bin/node --test tools/character-kit/kit.test.mjs
/opt/homebrew/bin/node tools/character-kit/example.mjs /tmp/coro-character-example-UNIQUE
/opt/homebrew/bin/node tools/character-kit/cli.mjs validate /tmp/coro-character-example-UNIQUE/package.json
/opt/homebrew/bin/node tools/character-kit/cli.mjs plan /tmp/coro-character-example-UNIQUE/package.json test-glasses test-shirt
/opt/homebrew/bin/node tools/character-kit/cli.mjs inspect /absolute/path/character.glb
```

`example.mjs` gera GLBs de triângulo, manifesto e SOURCE.md **sintéticos**. A roupa e o
corpo reutilizam o mesmo triângulo por intenção de teste. Isso não é um humanoide,
produto, template artístico, licença comercial ou demonstração de fit. O comando
recusa sobrescrever qualquer arquivo de exemplo existente, inclusive symlinks
pendentes, e usa criação exclusiva (`wx`) em cada escrita.

Para contribuir: gere o exemplo numa pasta nova, troque cada asset/procedência,
preencha identidade e perfis reais, calcule SHA-256 dos GLBs e valide. Edite o
manifesto com base no contrato em [CHARACTER-KIT.md](../../docs/visual-factory/CHARACTER-KIT.md).
Não copie o digest fictício de rest pose para um asset real. O schema executável
é `validatePackage` em `kit.mjs`; campos desconhecidos são recusados. O formato de
contribuição não é o manifesto de runtime atual.

`validate` e `plan` recebem um `package.json`; sua pasta é a raiz permitida para
assets e evidência. Só arquivos locais relativos, sem `..`, absolutos, URLs,
backslashes ou symlinks para fora. O CLI imprime JSON e retorna exit code 1 em
falhas. Não importa scripts do pacote. Trabalhe sobre uma cópia estável; isto não
é um sandbox contra outro processo que altera arquivos simultaneamente.

`inspect` lê apenas container e metadados GLB v2: comprimento, BIN embutido,
nomes de joints, presença de atributos de skin, materiais, animações e extensões
requeridas. Recursos externos/data URI são recusados; não há rede nem execução de
extensões. Não decodifica texturas, compressão, pesos ou curvas; não mede polígonos,
FPS, deformação, offsets reais ou qualidade visual. Use o validador glTF de
Khronos e a suíte de poses/render para aceitação posterior. Os limites de 1 MiB
para manifesto e 256 MiB para leitura GLB são proteções de memória da ferramenta,
não budgets artísticos ou aprovação de assets grandes.

`plan` valida o pacote inteiro, combina apenas itens dessa contribuição e entrega
um plano **draft**, com ocultação proposta do corpo. Não aplica máscaras ao mesh.
Perfis incompatíveis exigem outro pacote/variante de fit. Exclusões podem nomear
IDs externos, mas o CLI não resolve catálogo global. Nenhuma saída aprova fit.

## Empunhadura humana, pata e mascote

O sidecar `cs-grip-profile/1` é opcional e separado do pacote v1. A anatomia
(`human`, `paw`, `mascot`) não determina se a mão tem fechamento assado,
atuadores ponderados ou nenhuma capacidade de fechar. O contrato fixa identidade
de corpo/fit/rig/arma, arquivos com hashes, regiões de contato declaradas,
espaços/unidades, política de apoio e fases de animação.

```sh
/opt/homebrew/bin/node tools/character-kit/grip-example.mjs /absolute/real-parent/NEW_DIRECTORY
/opt/homebrew/bin/node tools/character-kit/grip-cli.mjs /absolute/real-parent/NEW_DIRECTORY/grip-profile.json /absolute/real-parent/NEW_DIRECTORY/package.json
/opt/homebrew/bin/node --test tools/character-kit/grip-profile.test.mjs tools/character-kit/kit.test.mjs
```

O gerador exige pasta nova com ancestrais reais, sem symlinks. Produz somente
triângulos sintéticos; o mock de arma e os nomes de clipes não representam arte,
animações reais ou uma pega utilizável. Serve para testar a contribuição.

O leitor recusa JSON com chaves repetidas, inclusive escapes equivalentes,
arquivos JSON acima de 1 MiB e fontes acima de 256 MiB. A composição explícita também
valida o pacote legado; um pacote inválido não vira ausência de pacote.
Uma arma de uma mão exige pose livre da outra mão; apoio `unsupported` registra
incapacidade, sem aprovar a exigência de duas mãos. IK com constraints ainda é
recusado por esta versão.

Essa validação é **estrutural**: índices, pesos, canais, bind, receita de
normalização e contato/clipping reais não são verificados. A saída lista fases
ausentes e mantém `runtimeEnabled`, `contactApproved`, `fitApproved` e
`supportRequirementSatisfied` falsos. Rotular vértices e ter hashes corretos não
aprova o encaixe; render, deformação e revisão artística continuam necessários.

## Inspeção dos bytes de bind e pesos

`bind-inspector.mjs` lê o GLB com SHA256 esperado obrigatório e deriva fingerprints separados de bind, geometria e pesos. O hash de bind sozinho não prova correspondência dos índices de uma região. Uso, limites de leitura, mutantes e convenção numérica estão em [BIND-INSPECTOR.md](BIND-INSPECTOR.md). O digest legado `restPoseSha256` continua declarado; nenhuma migração silenciosa o converte no fingerprint novo. Contato, arte e consistência geométrica repouso/IBM continuam sem aprovação.

## Experimental synthetic garment attachment

The opt-in library in `garment/` demonstrates one exact synthetic body/attachment
pair. It does not load in Game. It has no catalog registration or body masking.
The triangles reuse `syntheticGLB()` from `example.mjs`; they are not a shirt,
human rig or wearable fit. No donor GLB or unknown-rights artwork is included.

```sh
node tools/character-kit/garment/build-example-record.mjs --check
node --test tools/character-kit/garment-*.test.mjs
# Optional local preview assets; exclusive directory creation, refuses overwrite:
node tools/character-kit/garment/build-example-record.mjs --assets
# Only when deliberately previewing: serve repository root on localhost, then open
# /tools/character-kit/garment/example-preview.html and click Load.
```

No new package, build step or CDN is required; use modern Node with registerHooks
(validated on23.6) and existing vendored Three r160. Node fixture tooling maps only
vendor-origin `three` imports to that same vendor module and deregisters the hook
after import. The browser imports ordinary relative ESM using its import map.
The preview is a synthetic ownership controller, not gameplay. It renders only
on explicit load/dispose/reattach; coplanar triangles are intentional. It is not
a benchmark, animation preview or evidence of visual quality.

`garment/node.mjs` and `garment/browser-example.mjs` expose
`prepareGarment({THREE, parseGLB, baseBytes, garmentBytes}) -> {attach}`.
`attach(ctrl, {family, fit}) -> {mesh, dispose}` defaults to the exact example
identity. Bytes must be Uint8Array. Both digests are checked before either parse;
browser uses WebCrypto on a secure origin. Node additionally inspects structural
fingerprints. Unknown top-level options (including caller trust/contract) fail.
THREE and parseGLB are trusted integration dependencies, not an untrusted-parser
sandbox. The record is a checked-in inspection result, not a digital signature.

Attach requires a cloned model owned by group/mixer, the unique named body,
exact geometry/weights/index and bind/hierarchy, and bones within that model.
It refuses morphs, source animations, textured/multi materials, foreign bones
and duplicate attachments. Geometry/material/skeleton are owned by the handle;
dispose is idempotent and permits reattach without disposing body resources.
The low-level core is an internal building block; direct calls do not authenticate
asset bytes. Do not treat it as the closed trust entry.

The browser entry imports ONE static `example-record.mjs`. To support a different
pair, author a separate entry and reviewed record: inspect bytes, derive joint
node mappings and mesh transform from the parser, verify bind and runtime recipe,
and run ownership/domain/pose tests. Do not pass a downloaded record as trust or
replace names/hashes to imply family compatibility. `--write` creates the example
record exclusively; changing source deliberately requires review and regeneration.
`--check` detects stale recipe inputs, including vendor, inspector and fixture.
All approval flags stay false and hideTriangleIDs stays empty.

Core/assert bytes originate unchanged from external experiment142. Real-profile
browser170 used different assets and actual controller normalization; its PNGs
are context only, not proof that this synthetic profile is equivalent or that
fit/art/license were approved. See the [continuation](../../docs/visual-factory/GARMENT-LIBRARY-CONTINUATION.md)
for boundaries and pending review.

Capturas locais do exemplo anexado/removido e o SHA do código observado estão em
[Preview do mecanismo](../../docs/visual-factory/evidence/garment-library/README.md).

## Partição estática por faces registradas

[Mesh parts](MESH-PARTS.md) separa uma seleção humana fixada por SHA256 em duas
malhas, preserva atributos/transformação e entrega correspondência de faces.
É ferramenta offline; sua validação CPU não aprova arte nem habilita runtime.
