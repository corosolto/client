# Fase da pegada no preview

O preview captura a pegada DEPOIS de torso/corpo existirem e a pose funcional assentar.
O settle inicial de dez updates (glbchars.js, construção) roda ANTES de `ctrl.torso` e
`ctrl.corpo` serem atribuídos; com `_porte1hK` ainda 0, a pegada do Canarinho/Deagle era
capturada ~16° fora da referência (16,12° medido). A causa era **wiring da captura, não
fade lento** — a explicação anterior de fade foi refutada por medição
(`PREVIEW-PHASE-ROOT-PORTE-METADATA.json`: dez updates de 1/30 s após `ctrl.corpo`
levam a fase a 0,265°). O produto roda dez updates de 1/30 s condicionados ao preview do
Canarinho, imediatamente antes da captura no bloco PV_PULSO: 16,12° → 0,26°, outros sete
casos bit-idênticos, caminho de jogo intocado. Não são os 60 updates legados, nem
frontmax, nem yaw de vitrine.

`node tools/eval/preview-grip-phase-check.mjs --json` carrega GLBs, esqueletos e clipes
reais, usando materiais neutros sem imagens. Mede oito combinações reais sem skins, em
oito amostras por combinação, com giro do menu. Não valida pixels, fidelidade dos dedos,
material, FPS, nem os três casos com skin do gate browser.

A referência é o modelo de jogo funcional, mesmo rig/arma/clips reais.
Canarinho/Deagle deve capturar a fase em até 2 graus. LA1–LA5 e deriva continuam medidos
sem elevar os limites herdados. A deriva usa a amplitude `max−min` da pegada e da
distância palma→arma, pelo helper `amplitude` compartilhado com `lobbyFalhas`.
O domínio continua nos escalares existentes: a métrica não cobre toda a transformação
relativa mão/arma nem substitui o crivo visual.

O critério anterior comparava cada amostra só à primeira. A contraprova física
MST/AK mede distância à primeira de 7,917 mm, mas amplitude de 15,815 mm: o Node
antigo passava e o validador de lobby reprovava LA5 com as mesmas amostras reais.
Scripts e JSONs: `PREVIEW-DRIFT-COORD-FEASIBILITY-R1-z` e
`PREVIEW-DRIFT-COORD-BROWSER-VERDICT-R1.json` no audit de 31/10.

## Extensão frontal: instrumento rejeitado, dívida declarada

O contrato antigo de frente foi **rejeitado como instrumento**, não afrouxado:

- `FRENTE-CONTRATO` (presença lexical da string `TP_FRONT_MAX_CHAR`) media declaração,
  não comportamento, e foi removido do veredito.
- O teto `FRENTE-Z ≤ 0,23` veio de coorte humana sem referência da asa do Canarinho
  (`0da5a7ede`); o código media **Z local do model, não metros** (escala de mundo do
  Canarinho: 1,0320 — 0,23 locais ≈ 0,237 m). Antes de #1179 o valor real era
  Zmax 0,428 local / 0,442 m com contato palma→arma ~8 mm nos mesmos GLBs. Reinstalar o
  clamp demonstrou deformação e foi rejeitado. Não há bound, razão ou limite humano
  inventado no lugar.

O que resta é **diagnóstico local, sem teto**: cada amostra registra `frenteZLocal`
(unidades locais do model), `escalaModeloM` (escala mundial XYZ) e `frenteZMundoM`
(projeção palma menos origem do model sobre o seu eixo frontal mundial normalizado,
em metros). Não pressupõe escala X igual à Z. Valores não-finitos continuam
reprovando (INVALIDA).

**Dívida artística pendente**: a asa espalmada do Canarinho encobre a Deagle no preview
(visto em `SELECT-EGO-canarinho-R4.png`, 1320×880). Fechá-la exige uma referência visual
válida — pose de pegada revisada e aceita do próprio Canarinho e um estado causalmente
ruim do mesmo rig. Este gate **não aprova** essa aparência; remover o teto sem referência
é correção de ferramenta, não waiver visual.

## Contraprovas físicas, sempre após nominal verde com inventário completo:

- `--mutante=sem-settle`: remove exatamente o settle pós-corpo do preview do Canarinho;
  reprova somente FASE (16,12°; LA1 não dispara pois o teto Canarinho é 20°).
- `--mutante=fase-inclinada`: adiciona dez graus à pegada capturada; somente FASE.
- `--mutante=arma-solta`: desloca a arma real 0,12 m no gunObj (construção, só
  Canarinho/Deagle/preview); a palma skinnada não segue e o contato reprova em LA2 e LA3.
  Substitui a antiga `frente-sem-clamp`, cujo alvo (`else if (_v.z > fzMax)`) saiu do
  fonte com o clamp rejeitado.
- `--mutante=arma-oscilante`: move o filho real da arma em Z local, ±8 mm,
  com período de 2 s, a cada update do MST/AK. A primeira amostra fica no meio do
  ciclo. Só DERIVA-M reprova; FASE, LA1–LA4 e os outros sete casos permanecem verdes.
  A palma continua skinnada, sem substituir métricas ou amostras por valores prontos.

O verificador exige o conjunto exato de casos e cláusulas. Nominal verde sai 0; nominal
 válido vermelho sai 1; uso inválido sai 2; infraestrutura sai 3. Uma contraprova sai 0
somente quando o nominal passa e sua regressão exata é medida. O JSON é a saída completa
em stdout; temporários são exclusivos por execução e removidos ao terminar. O gate de
lobby no browser mantém os onze casos completos incluindo skins, e a aprovação visual
continua separada.

A saída deixa o processo terminar naturalmente com process.exitCode após o veredito,
para drenar stdout antes do cleanup. Process.exit imediato podia truncar JSON de
subprocessos: controle com transporte real atrasado20ms dava exit0/0bytes; após reparo,
a mesma medição entrega JSON íntegro. A documentação oficial de
[process.exit](https://nodejs.org/api/process.html#processexitcode) descreve essa perda
de I/O pendente. Limpar variáveis do ambiente não é a correção do instrumento.
