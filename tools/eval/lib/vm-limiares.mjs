/* ============================================================================
   vm-limiares.mjs — OS LIMIARES DAS RÉGUAS DE IMAGEM DO VIEWMODEL, NUM LUGAR SÓ
   ----------------------------------------------------------------------------
   Regra da casa (skill `regua`, pergunta 3): quem mede a mesma coisa usa o
   mesmo limiar. Aqui moram os números que as réguas eval:vm-mira,
   eval:vm-cobertura, eval:vm-pistola-ref, eval:vm-maos e eval:vm-carregador
   usam, e o texto do crítico cego (.claude/agents/critico-visual-vm.md) cita
   estes mesmos valores. Mudar um número aqui muda a régua E a tolerância que o
   crítico declara; não mude um sem o outro.

   Calibração: revisão L1 de 23/09 (artifacts/review-L1, crítico r2 cego,
   AK golden + PT-38 como referência), medida no quadro 1440 de largura.
   ============================================================================ */

// Largura do quadro do dono. Com FOV horizontal constante (game.js,
// vmFovForAspect) 1 px horizontal vale o mesmo ângulo em 3:2 e 16:9, então os
// limiares em px são dados nesta largura e escalados por largura.
export const LARGURA_REF = 1440;

/* MIRA (eval:vm-mira). Distância entre a cruz (centro do quadro) e o aparelho
   de pontaria VISTO: centro do aro (alça de dioptro/óptica) ou topo da massa.
   Crítico r2 + A/B do ADS: aceitou pistola (20 px medidos aqui), uzi ("5–10 px"
   no olho, 25 px aqui) e lmg (3 px); reprovou mp5 (≈40 no olho / 53 aqui), md97
   (55 / 54), p90 (50–55 / 60), shotgun (65 / 67), m92 (70 / 79), akm (90 / 107).
   O corte fica entre o pior aprovado (25) e o melhor reprovado (43, m4, que o
   crítico não viu): 30 px a 1440 de largura. */
export const MIRA_MAX_PX = 30;
// ADS tombado: eixo coronha→boca (pela profundidade) a mais de 12° da vertical.
// Mesmo teto do ângulo em quadril (COBERTURA_ANGULO_MAX): mesma grandeza.
export const MIRA_INCLINACAO_MAX = 12;

/* COBERTURA (eval:vm-cobertura), em quadril, contra o retrato da AK golden
   APROVADA (tools/eval/vm-ak-aprovada.json, medido antes do #631). `tamanho` = raiz(área da arma ÷ área da AK) — tamanho LINEAR na tela,
   a mesma grandeza que o crítico dá em "uns 60% da AK".
   Faixas por classe: arma longa 0,80–1,25 (shotgun 1,61 e akm 0,71 reprovam;
   carbine/scar 1,20 passam no limite); compacta (mp5/uzi/p90) 0,50–1,00, porque
   o crítico aceitou uzi "~55% da AK, escala ok" e mp5 "70–80%, ok"; lmg herda a
   faixa PRÓPRIA do vm-frame-calibra (RATIO_BANDS.lmg 0,65–0,85) — mesmo conceito,
   mesma faixa. */
export const COBERTURA_FAIXA = {
  longa: { min: 0.80, max: 1.25 },
  compacta: { min: 0.50, max: 1.00 },
  lmg: { min: 0.65, max: 0.85 },
};
// Braço: área renderizada de braço+mão ≤ 1,4× a da AK. É o BRACO_MAX do
// vm-frame-calibra (R2), agora medido na imagem em vez de vértice.
export const COBERTURA_BRACO_MAX = 1.4;
// Cruz livre no quadril: nenhum pixel de arma/braço a menos de 3% da largura do
// centro (43 px) — "inspeção cobre a cruz" e "arma atravessa a tela" do crítico.
export const COBERTURA_CRUZ_RAIO = 0.03;
// Câmera dentro da arma: a parte mais perto da arma que aparece (percentil 2 da
// profundidade) a ≥ 0,6 palma do olho. Produtos K medidos em 23/09: shotgun 0,37
// ("tubo octogonal oco", FILA item 2) e rem700 0,54; o resto ≥ 0,77 (mosin),
// m4 1,36. A AK golden é de outro rig (palma 2× maior) e fica fora deste item; a AK em K
// (#631) entra.
export const COBERTURA_OLHO_MIN = 0.6;
// Ângulo na tela: eixo coronha→boca (pela profundidade, vm-analise eixoNaTela)
// em quadril a ±12° do da AK. Crítico r2: mp5 "pitch ~39° vs 26° da AK" (13°,
// reprovada), md97 "mais horizontal com a traseira alta".
export const COBERTURA_ANGULO_MAX = 12;
// ADS: arma+braço cobrem no máximo 1,5× o que a AK cobre em quadril (12,3% → 18,5%).
// O crítico reprovou o shotgun no ADS por "cobrir ~40% da tela".
export const COBERTURA_ADS_MAX_VS_AK = 1.5;

/* PISTOLA-REF (eval:vm-pistola-ref): armas curtas contra a PT-38 aprovada.
   `tamanho` por metro (mesmo conceito do vm-frame: uma Deagle maior que uma
   pistola), faixa 0,80–1,25 como a longa. Posição: centro da arma a no máximo
   6% da largura (86 px) do centro da pistola. ADS: arma visível ≥ 50% da área
   da pistola em ADS (o revólver deixa "40 px acima das luvas"). */
export const PISTOLA_FAIXA = { min: 0.80, max: 1.25 };
export const PISTOLA_POS_MAX = 0.06;
export const PISTOLA_ADS_MIN = 0.5;

/* MÃOS (eval:vm-maos): distância dos dedos da mão de APOIO à superfície da malha
   da arma, em comprimentos de palma (junta hand→middle_01; a escala de cena
   varia por produto). Aprovadas no olho: m4 0,00, mp5 0,01, p90 0,06, pistola
   0,10, lmg 0,13, e a AK golden APROVADA 0,19 (rig metarig); m92 (mão fechada no
   ar, crítico r2) 0,70. Corte 0,20 palma (≈2–2,5 cm de palma real): a referência
   aprovada tem de passar. */
export const MAOS_DEDOS_MAX = 0.2;

/* CARREGADOR (eval:vm-carregador), em comprimentos de palma:
   na arma = deslocado ≤ 0,25 do repouso no referencial do corpo E o repouso
   encosta no corpo (≤ 0,12); na mão = ≤ 0,7 de uma JUNTA de mão (a junta fica no
   meio do osso: pente preso na ponta dos dedos fica a ~0,5; as referências
   aprovadas medem até 0,66 — PT-38 trazendo o pente novo — e 0,46 na AK golden;
   o p90 que "nunca aparece na mão" mede 1,05, a uzi 2,2, o clipe da sks 4+).
   Fora dos dois = "recarrega com objeto no meio do ar", salvo se está CAINDO
   (desce ≥ 0,5 palma entre amostras: pente vazio largado, como na PT-38).
   Fora do quadro com a mão de apoio NA tela e sem o pente = "mão vazia".
   Fantasma: a peça maior que 60% da arma é a arma, não o pente (uzi 100%).
   Toco: na mão, a parte visível do pente nunca passa de 35% dele sozinho em
   repouso (mp5 16%; m4 62%, m92 69%, md97 50% — o crítico aceitou a mecânica
   da md97). Na tela = ≥ 30 px visíveis. */
// Saindo do encaixe: até 0,6 palma do repouso E ainda encostado no corpo conta como na arma.
export const CARREGADOR = { deslocMax: 0.25, encaixeMax: 0.6, encostaMax: 0.12, maoMax: 0.7, fantasmaMax: 0.6, quedaMin: 0.5, pxMin: 30, tocoMin: 0.35 };
