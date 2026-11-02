# Falha select do #1188: diagnóstico RO

Candidato investigado: `21f264c519aac547148ea1bab3c5c64d847e8290`.
Job remoto: `124629497254`, `eval:select`, log
`PR1188-job-124629497254-21.log:565` no audit externo da missão31/10.
A régua saiu2 com teto recalculado0,689/28,6 contra contrato0,675/23,6.
Nenhum teto, baseline, dívida, asset ou produto foi alterado nesta investigação.
O integrador mantém a autoria exclusiva de combate e browser.

## Resultado reproduzido e causa

O kernel exato de `page.evaluate` de `tools/eval/select-inflate.mjs` foi executado
em Node com os GLB reais, AnimationMixer e Three vendorizado. Só as texturas foram
trocadas por DataTexture branca, sem alterar vértices/rig/clipes. O resultado
reproduziu exatamente o arredondamento do CI:

| Variante | Mandrake P99/ruins1e4 | Pagodeiro P99/ruins1e4 | Teto refs |
|---|---|---|---|
| QA21 | 0,551/22,9 | 0,414/9,5 | 0,689/28,6 |
| Fonte glbchars #1179, deps QA | 0,551/22,9 | 0,414/9,5 | 0,689/28,6 |
| #1179 + handik #1179 | 0,551/22,9 | 0,414/9,5 | 0,689/28,6 |
| Yaw final61af | 0,551/22,9 | 0,414/9,5 | 0,689/28,6 |
| QA21 sem clamp extra da mão de apoio | 0,540/18,9 | 0,414/9,5 | 0,675/23,6 |
| QA21 com comprimento mundial da palma no clamp | 0,540/18,9 | 0,414/9,5 | 0,675/23,6 |

A mudança causal está no uso de `clampAlcanceIK(ik.chain, ik.end, _ikTgt)` adicionado
por `1906b2da8`: o alvo é o centro da palma, indicado por `ik.endOffset`, mas o
helper limita o alcance ao punho (`end`). Com isso, projeta para dentro um alvo
que a palma ainda alcançaria. O solver `solveCCDIK` já recebe `endOffset`; o helper
novo não o recebia. Retirar apenas esse clamp ou contar corretamente a palma
restaura os números originais do Mandrake, sem afrouxar nada.

A correção mundial de `handik.js` em `cdc770eb8` não é a causa: o controle com
handik anterior mantém o mesmo vermelho. A correção antifeedback de yaw do #1188 também não muda a
métrica das referências; isso não compara a introdução original do yaw com sua ausência. O resultado não aponta divergência de Linux/Chrome/SwiftShader: o kernel
CPU com geometria real reproduz o CI, ainda que isso não aprove o pixel.

Os nove blobs relevantes de modelos/clipes das duas referências são idênticos
em f3576db5, d07749f4, fd553b310 e QA21. Lista e hashes Git em
`SELECT-ASSET-PROVENANCE-R1.json`. Portanto, não há evidência de drift do asset ou
de erro de unidade nos GLB das referências. A dívida congelada exige revisão de
qualidade de pose/código, sem atualizar os números para aceitar esta regressão.

## Proposta para o integrador (não aplicada)

`clampAlcanceIK` aceita quarto argumento opcional `endOffset`. Depois de calcular
o comprimento dos segmentos até o punho, soma a distância em mundo entre o punho
e `end.localToWorld(endOffset)`, antes de multiplicar pelo mesmo fator0,95:

```js
let alcance = braco + _alcB.distanceTo(_alcA);
if (endOffset) {
  _alcB.copy(endOffset); end.localToWorld(_alcB);
  alcance += _alcB.distanceTo(_alcA);
}
alcance *= 0.95;
```

`_alcA` ainda contém a origem mundial do punho. `_alcB` pode ser reutilizado:
a parcela do antebraço já foi somada e a linha seguinte recaptura a base do clamp.
Isso preserva zero alocação por frame e não modifica o vetor `endOffset`.
Passar `ik.endOffset` na chamada de apoio normal e `this.ikL.endOffset` na chamada
de apoio durante reload. Chamadas que miram a origem do osso permanecem sem offset.
Não remover a proteção do alcance para recuperar o teto.

Proposta de régua, antes de implementá-la: estender TP-WORLD com o helper real
exportado somente na cópia temporária, sem duplicar seu algoritmo. Braço0,6m com
palma0,1m: alvo0,64m é alcançável pela palma e não pode ser puxado para0,57m
(limite do punho). Repetir a mesma cena em centímetros×scale0,01, com ancestrais
girados, e conferir também o clamp de um alvo além do alcance e a preservação dos
vetores de entrada. Valores vêm da fixture geométrica, não de um teto artístico.
Instrumentar o helper na cópia temporária e chamar os controladores reais em
idle/reload para conferir a passagem do mesmo endOffset do IK. Mutantes: omitir
o argumento em cada caller; usar comprimento local; omitir a parcela da palma;
desativar o clamp. `eval:select` existente permanece a prova do consumidor completo.
Nenhum arquivo de régua/package foi criado ou editado sem o lease do integrador.

## A próxima camada continua vermelha

O protótipo privado com palma também rodou o kernel nos63 personagens. O teto das
referências volta ao contrato, mas a comparação estrita com a dívida congelada
ainda acusa14 bloqueadores, em QA21 e no yaw61af. Nove dívidas não pioraram.
Exemplos: Canarinho0,740/57,9 contra0,655/37; Professor0,722/57,3 contra0,696/56,3;
Zumbi0,685/19 sem entrada na dívida. Lista completa em
`SELECT-YAW61-PALM-ALL-NODE-R1-verdict.json` e
`SELECT-QA21-PALM-ALL-NODE-R2-verdict.json`.

Isso não fecha `eval:select`. O gate original para antes da tabela de personagens
quando o teto muda, então esses bloqueadores só aparecem na investigação seguinte.
A correção proposta restaura a referência geométrica; não torna o restante do
elenco aprovado e não justifica aumentar dívida/teto. A observação visual do root
sobre a palma/face do Professor segue aberta e precisa A/B no jogo real.

## Reprodução e artefatos

Todos no audit externo `audits/2026-10-31-visual-consistency/`:

- `SELECT-KERNEL-NODE-R1.mjs`: kernel original importado, módulos temporários limpos no exit.
- `SELECT-QA21-NODE-R2.json`: reprodução exata do vermelho remoto.
- `SELECT-1179-OLDIK-NODE-R1.json`: controle do solver anterior.
- `SELECT-QA21-NO-SUPPORT-CLAMP-R1.json`: ablação causal de uma única chamada.
- `SELECT-QA21-PALM-SUPPORT-CLAMP-R1.json`: protótipo da geometria correta.
- `SELECT-YAW61-PALM-ALL-NODE-R1.json`: medição completa privada após o protótipo.
- `SELECT-QA21-PALM-ALL-NODE-R2.json`: repetição completa com resumo refs correto.

A primeira tentativa NodeR1 importou instâncias diferentes de Three/GLTFLoader e
falhou no carregamento. Foi rejeitada; R2 usa o mesmo pacote-ponte do harness e não
apresenta esse problema. O primeiro resumo all-R1 usou máximo de todos os modelos;
metadados foram corrigidos sobre linhas brutas preservadas, e all-R2 foi medido de
novo com refs filtradas. Só os artefatos acima sustentam as conclusões.

Sem browser nesta lane, sem alteração de material/rig/asset, sem push nem resolução
remota. Proposta aguardando implementação e validação visual pelo integrador.

## Adjudicação GLM e continuidade

GLM-5.3 real via OMP concluiu a análise RO em `SELECT-GLM-CAUSE-R1.md`,
sem medições próprias. Sua leitura de que o gate para antes da tabela e de que
Mandrake determina o teto confere com o kernel. Sua hipótese prioritária
`cdc770eb8`/handik e a hipótese de yaw como causa do TETO DAS REFERÊNCIAS foram
refutadas pelos controles medidos acima: trocar o solver para o anterior ou aplicar yawfinal não altera o vermelho.
A recomendação condicional de rever teto/dívida não foi aceita. O resultado causal
é o clamp extra punho versus palma, demonstrado pela ablação de uma chamada.
Nenhuma conclusão do GLM sobre aprovação visual foi utilizada.

O root ampliou o diagnóstico RO para os14 bloqueadores restantes: medir all-roster
nas bases main491, #1179 e QA/yaw, com clamp antigo, palma e sem clamp, e separar
overlay1H, clamp e worldIK/yaw. Produto, package, gates, assets e dívida continuam
sob lease do integrador. A próxima etapa é a matriz de ablação com o mesmo kernel
real e texturas stub declaradas; nenhuma correção desta etapa está aplicada.


A etapa seguinte demonstrou que a INTRODUÇÃO ORIGINAL do yaw em1906b2da8 é causal
para onze dos14 bloqueadores, mesmo que não mova o teto das referências. A correção
antifeedback61af continua válida e neutra frente ao yaw #1179. Ver o diagnóstico
completo em `SELECT-CI-BLOCKERS-20261031.md`; não confundir as duas comparações.
