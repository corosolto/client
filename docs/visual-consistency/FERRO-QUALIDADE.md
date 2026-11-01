# FERRO-QUALIDADE — régua de grafite do Ferro Velho (adaptada em 31/10)

Uma régua, um arquivo: `tools/eval/ferro-graffiti-quality-check.mjs` (`npm run
eval:ferro-graffiti-quality`). Ela constrói o mapa **real** com GLBs de verdade
(`preloadPropGeometry` + `initTextures`, `seedRandom(12345)`, `grafiteNoDedicado(true)`
para medir suporte sem tinta) em processos separados por qualidade e compara.

## Contrato vigente e por que a régua mudou

Pedido do dono (31/10, registrado em `METRICA.md` e `CONTINUATION.md`): **grafite no
Ferro Velho só na casa de respawn B**. O produtor implementa a allowlist no próprio mapa:
`addBox` marca as paredes `MAT.office` da casa com `userData.graffitiRespawnB`
(`map_ferrovelho.js`), e no fim do build toda malha sem a tag recebe
`graffitiSupportExcluded`, que `superficieGrafitavel` (`graffiti_surface.js`) recusa —
logo `quantizarGrafite` (`graffiti_pass.js`) devolve `null` fora da casa.

A régua anterior derivava **testemunhas de arte nas 211 chapas de zinco externas** e
exigia penetração de capim/postes **sobre essas artes** nos mutantes. Sob o contrato
novo isso é causalmente impossível: o quantize em chapa externa **deve** recusar. A régua
antiga morria em `visible real zinc panels must support artwork witnesses` (`actual: 0`,
log `GLM-FERRO-QUALIDADE-R1-BASELINE-RED.log`) — incompatibilidade de contrato, não bug
de prop. As propriedades aposentadas estão listadas abaixo; **nenhuma tolerância foi
afrouxada** (`GRAFFITI_SUPPORT_DISTANCE`, orçamento de área `1e-10`, subsets exatos e a
contagem de 211 chapas continuam os mesmos do gate anterior).

## O que a régua garante agora

1. **Substrato de zinco estável** — o mapa expõe exatamente um lote `InstancedMesh`
   1×1×0,05 com 211 chapas; `low` renderiza a mesma contagem e as **matrizes idênticas**
   à referência `med` (paridade med/low de geometria, não de inventário).
2. **Testemunhas positivas = os quads reais da casa B** — todo quad assado de
   `GRAFITE.ferro_velho` (`graffiti_layout.js`, gerado; contagem vem do layout, sem teto
   manual) precisa de, no root completo com GLBs: textura presente no pacote; **parede
   tagueada `graffitiRespawnB` atrás** (raio pelo centro do quad, alcance 7 cm, primeira
   malha visível); suporte nominal **e** desenhado pelo caminho de produção
   (`criarSuporteGrafite`: grade 5×5 = 25 raios + cobertura por união dos triângulos
   visíveis) e pela medição **independente** (`measureGraffitiArea`, cobertura integral e
   penetração de primeiro plano).
3. **Subsets físicos** — capim (matriz+cor por instância) e postes da cerca em `low`
   devem ser subconjunto de `med` (nenhuma instância nova).
4. **Controle `artforaBhouse` (negativo da allowlist)** — um quad 0,6×0,6 na frente de
   cada chapa de zinco, nas posições confirmadas como face real por varredura 5×5:
   `quantizarGrafite` tem que **recusar todas**. Prova positiva independente no mesmo
   processo: os quads assados da casa B são **aceitos** pelo mesmo caminho — a recusa
   fora da casa é a allowlist, não um medidor quebrado. O contrato específico também
   exige o lote de zinco `graffitiSupportExcluded` e `superficieGrafitavel === false`.
   **Crash de filho ou JSON de veredito ausente é ERRO no placar, nunca detecção.**

## Mutantes e a propriedade física que cada um prova

Cada mutante edita o fonte real do mapa em memória (o arquivo em disco é conferido
byte a byte no fim de cada worker) e tem que deixar o gate vermelho **pela cláusula
da sua propriedade**:

| mutante | mutação | propriedade provada (medida na rodada de 31/10) |
|---|---|---|
| `old-low-step` | passo do zinco `1,25 → 2,2` no low | substrato: 119 chapas (≠211) e matrizes divergentes da ref med (27 postes também saem do subset) |
| `old-quality-rng` | cadência de RNG do capim no low | subset de capim: 156 instâncias novas fora do subset med |
| `old-low-posts` | módulo dos postes `4 → 3` no low | subset de postes: 36 matrizes novas |
| `no-allowlist` | remove a traverse que marca `graffitiSupportExcluded` | o controle morde: 102 das 113 frentes de zinco **passam a aceitar** arte; a casa B continua aceitando |
| `house-wall-shift` | parede frontal da casa B anda 0,4 m | cláusula de suporte dos quads reais: 13 quads assados perdem suporte/tag |

Números desta tabela são **saída do comando** `node
tools/eval/ferro-graffiti-quality-check.mjs` (log
`audits/2026-10-31-visual-consistency/GLM-FERRO-QUALIDADE-R1-GATE.log`), não tetos
escritos à mão.

## Propriedades aposentadas (causa: brief do dono 31/10)

- Testemunha de arte em **cada chapa de zinco externa** com suporte nominal+desenhado —
  substituída pelo controle `artforaBhouse`, que exige a **recusa** nessas mesmas
  posições.
- Penetração de capim (`foreground-penetration`) e perda de suporte por postes **sobre
  artes em chapas externas** nos mutantes `old-quality-rng`/`old-low-posts` — essas
  artes não existem mais por contrato; os mutantes provam suas propriedades aplicáveis
  (subsets de capim/postes). Se arte da casa B for um dia penetrada por capim/poste, a
  medição independente do item 2 continua acusando.

## Notas de implementação

- Bare specifier do fonte mutado resolve via `createRequire(map_ferrovelho.js)` — o
  `import.meta.resolve` síncrono não existe no Node 16 do ambiente de teste.
- O gate não rega layout: `graffiti_layout.js` é GERADO e o fingerprint oficial do bake
  é responsabilidade do passe Ego do Root, não desta régua.
