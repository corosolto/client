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
