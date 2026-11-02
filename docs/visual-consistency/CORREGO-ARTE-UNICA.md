# Córrego — arte única (contrato SURVEY4)

**Procedência.** Survey real Ego 32p2 (root, 12 mapas, source freeze), 31/10/2026:
11 mapas GREEN, Córrego RED com `uv-repetido:/img/textures/corrego_streetart_pixo.webp`
(`corrego-drawn-curation-SURVEY4.json`). Causa dupla no produtor antigo:

1. `TEX.pixo` carregava `load(..., 2, 2)` — a textura ladrilhava 4× **dentro** de um
   único painel (UV span 2×2).
2. O laço manual tentava **4 painéis** com a mesma arte; o dedup novo de
   `revisarGrafiteManual` (`public/js/graffiti_pass.js`) já removia 3 no runtime e
   deixava 1 — o produtor emitia aplicação que o jogo descartia.

A régua antiga (`corrego-graffiti-mount-check.mjs`) exigia 4 painéis — contrato
incompatível com "nenhuma arte repetida em mapa nenhum". Root confirmou o RED antes
deste conserto: `root-corrego-curation-vs-mount-before.log` (`1 !== 0`, inventário
parcial sem diagnóstico).

## Contrato vigente

**1 arte de rua física (`corrego_streetart_pixo.webp`), aplicada 1 vez**, na posição
suportada já existente `[lado 1, z -28]` (x 23.738, y 5.2, 6×3.6, plano paralelo ao
muro externo). Medido no mundo construído, nunca só em `mesh.name`/declaração:

- **Identidade**: textura carregada do caminho real (fixture do `TextureLoader` +
  sha256 do asset no relatório).
- **Inventário potencial ≠ formato aceito** (CRÍTICO R2 P2-1): o inventário enumera toda
  aplicação que pode desenhar a textura — `visible` do mesh e ancestrais, layer do mundo
  (`mask & 1`), `material.visible`, `colorWrite`, e RGB visível: `opacity > 0` **ou**
  `NoBlending` **ou** `NormalBlending` com `transparent === false` — estes dois ainda
  escrevem RGB com opacity 0 (crítico R3 P2-1); **qualquer `side`** e
  `InstancedMesh` entram como candidatas — DoubleSide desliga o culling do Three, logo é
  aplicação potencialmente visível. Candidata incompatível **não é apagada do inventário**:
  o formato aceitável é cláusula de aceitação dentro do `measure()` (Mesh simples,
  `side === FrontSide`, `opacity > 0`, fail-closed para `InstancedMesh`), que reprova.
- **UV de conteúdo**: span da geometria × `|repeat|` da textura viva, em `(1e-6, 1.002]`
  — limiar e fórmula **compartilhados** com `graffiti-curation-measure.mjs:161`
  (`uv-repetido`). Fail-closed (CRÍTICO R1 P2-3): `map.channel !== 0`,
  `matrixAutoUpdate=false`, `rotation` ou `center` próprios são formato UV desconhecido →
  reprovado, sem expandir o renderer da régua; `repeat`/`offset` não finitos (NaN entra na
  matriz UV do renderer) idem — finitude antes do span (crítico R4 P2-2). **Quad UV canônico**
  (CRÍTICO R2 P2-2): o
  painel é um `PlaneGeometry` de 4 vértices — a aceitação exige as 4 correspondências UV
  canônicas reais `(0,1)(1,1)(0,0)(1,0)`; span 1×1 com triângulo dobrado (mesma meia-arte
  duas vezes) é reprovado por esta cláusula, sem relaxar o limiar 1.002.
- **Montagem plena** (inalterada do contrato anterior — nada afrouxado): apoio de
  produção (`criarSuporteGrafite`), medição independente de área
  (`measureGraffitiArea`, fullquad), e `firstHits` 5×5 com raio .07, alinhamento
  ≥ .98, profundidade ∈ [−.001, .05], parede externa |x|≈23.75. **Orientação real**
  (CRÍTICO R2 P2-3): a mesma `measure()` rejeita matriz com determinante ≤ 0 e exige
  concordância ≥ .98 entre a frente geométrica transformada (normal-matrix do `matrixWorld`)
  e a normal do contrato — `scale.x=−1` com yaw invertido preserva o quad medido, mas vira
  a face FrontSide para o muro e é reprovado aqui.

## Mutantes causais (self-test, node puro, sem render headless)

Todo mutante é **reprovado pela mesma aceitação do gate** (`measure()` real, a que
decide o GREEN do CI) com a cláusula específica casada por padrão — nunca por assert
auxiliar isolado (CRÍTICO R1 P2-1). Cada mutante restaura a cena em `finally`; o
mutante repeat usa a textura do próprio painel (`art.material.map`) e preserva o
repeat exato, então `--baseline-ref` + `--self-test` combinados são seguros (P3-1).

| mutante | aplicação esperada | cláusula que morde |
|---|---|---|
| `clone` | mesma arte num 2º centro suportado ([-1, 24]) | contagem: `1 aplicação; achei 2` |
| `repeat` | `repeat.set(2, 2)` na textura viva do painel | UV: coverage 2×2 > 1.002 |
| `uv-channel` | `map.channel=1` + uv1 escalado 2× (repeat 1×1) | fail-closed UV: formato desconhecido |
| `uv-matrix` | matriz UV manual 2×2, `matrixAutoUpdate=false` | fail-closed UV: formato desconhecido |
| `offset-nao-finito` | `offset.x=NaN` na textura viva (span e canônico seguem 1×1) | finitude UV antes do span: `uvOnce=false` |
| `instanced-0` | InstancedMesh count=0 (nada desenhado) | fail-closed: InstancedMesh não suportado |
| `instanced-2` | InstancedMesh count=2 (2ª instância deslocada) | fail-closed: InstancedMesh não suportado |
| `invisible` | `art.visible=false` | contagem do inventário potencial: `achei 0` |
| `backside` | `material.side=BackSide` (candidata potencial) | formato: `side=1 não é formato suportado` |
| `doubleside-clone` | cópia DoubleSide da arte num 2º centro ([-1, 24]) | inventário inclui a cópia; formato: `side=2 não é formato suportado` |
| `opaco-zero-clone` | cópia opacity 0 + `NormalBlending`/`transparent=false` (ainda escreve RGB) | formato: `opacity=0 não é formato suportado` |
| `uv-fold` | UV do vértice 3 dobrada na do vértice 0 (span segue 1×1, `once=true`) | quad canônico: `uvCanonica=false` |
| `reflected` | `scale.x=−1` + yaw `+PI/2` (quad medido idêntico, det=−1) | orientação: `orientacao=false` |
| `perpendicular` | `BoxGeometry(.05, 4.6, 6)` em x 23.72, y 3.7 | montagem plena: 0/1, faces falham produção E independente |

Cada mutante tem guarda `MUTANTE NAO APLICOU` que prova a aplicação **pelo estado físico
da cópia** (`visible === false`, `side === BackSide/DoubleSide`, `scale.x === −1`,
`isInstancedMesh`, UV efetivamente dobrada) — nunca consultando o enumerador sob mutação,
para o aborto não mascarar a cláusula (CRÍTICO R2 P3-1). A contagem esperada mora
exclusivamente em `measure()`; mutante não detectado → exit 1. Guardas provadas por
mutação de guarda no fonte: desligar a cláusula de quad canônico, a de orientação, o
assert de formato `side`, ou devolver a exclusão de DoubleSide/BackSide ao inventário
derruba o self-test com `NAO DETECTADO` ou `cláusula errada`.

## Baseline histórico

`--baseline-ref=c12f6416d~1` reconstrói o produtor de 4 caixas
(`addBox(0.05, 4.6, 6.0, TEX.pixo, x, 1.4, z)`) via `git show` + `data:` URL, com os
módulos atuais do disco. O baseline **deve continuar reprovado** pelo contrato novo
(`0/4`, `artRepeated=true`) — auditoria de histórico, não rebobinagem do producer.
O modo `--search` e a reconstrução automática de 4 painéis-proposta foram removidos:
eram andaime do contrato antigo de 4 painéis e afirmavam o que o contrato novo nega.

## Limites

- Node puro, geometria real (`nodeGeometryOnly`): não valida pixels renderizados —
  a prova visual é o survey Ego do root (este gate não aprova visual por Node).
- Preservado sem toque: paredes, colisão, spawns, rotas, zona limpa de spawn e o
  `grafitar` de rua (51 peças baked continuam do pass). Nenhum asset novo.
- Cache-bust por conteúdo (`module-cache.mjs`) cuida da publicação; sem bump manual.
