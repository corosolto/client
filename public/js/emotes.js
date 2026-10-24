/* Emotes brasileiros: coreografia procedural em espaço de MUNDO (não há clipe nem
   asset). Repertório, método, fontes e limites: docs/EMOTES-BR.md. */

/* Vocabulário dos eixos: 'r' = direita do corpo, 'u' = cima, 'f' = frente.
   O controlador resolve esses três no mundo e converte pro quadro do pai do osso. */

export const EMOTES = [
  { id: 'passinho',    nome: 'Passinho',        origem: 'Funk carioca (RJ) — Patrimônio Imaterial do Rio, 2024', dur: 1.60, laco: true },
  { id: 'samba',       nome: 'Samba no pé',     origem: 'Samba — a base de pés alternados do Rio',               dur: 1.40, laco: true },
  { id: 'ginga',       nome: 'Ginga',           origem: 'Capoeira — mão à frente, perna oposta atrás',           dur: 2.00, laco: true },
  { id: 'frevo',       nome: 'Frevo',           origem: 'Frevo (PE) — Patrimônio da Humanidade, UNESCO 2012',    dur: 1.20, laco: true },
  { id: 'forro',       nome: 'Dois pra lá',     origem: 'Forró/xote — dois passos pra cada lado',                dur: 2.40, laco: true },
  { id: 'quadradinho', nome: 'Quadradinho',     origem: 'Funk — o rebolado virado quadrado, em quatro tempos',   dur: 1.60, laco: true },
  { id: 'sarrada',     nome: 'Sarrada no ar',   origem: 'Funk — impulso de quadril com as mãos à frente',        dur: 1.10, laco: false },
  { id: 'salve',       nome: 'Salve',           origem: 'Saudação de rua — o braço que sobe no lugar do aperto de mão', dur: 1.30, laco: false },
];

export const EMOTE_IDS = EMOTES.map((e) => e.id);
const POR_ID = new Map(EMOTES.map((e) => [e.id, e]));
export const emoteInfo = (id) => POR_ID.get(id) || null;

const TAU = Math.PI * 2;
const sin = (fase) => Math.sin(fase * TAU);
const cos = (fase) => Math.cos(fase * TAU);
// onda triangular: o passo de dança tem VIRADA seca, não curva de seno nas pontas
const tri = (fase) => { const x = (fase % 1 + 1) % 1; return x < 0.5 ? 4 * x - 1 : 3 - 4 * x; };
// pulso 0→1→0 dentro de [ini, fim]: usado por gesto de uma vez só
const pulso = (t, ini, fim) => {
  if (t <= ini || t >= fim) return 0;
  const x = (t - ini) / (fim - ini);
  return Math.sin(x * Math.PI);
};

/* Cada coreografia empurra pares [osso, eixo, ângulo] em `ossos` e devolve o
   agachamento em METROS por `dip` (o controlador soma na altura do modelo).
   Ângulos em radianos. Mantidos em faixa legível: braço até ~1,4; perna até ~0,8. */
/* Portes de braço medidos a partir do idle do jogo (que é PORTE DE FUZIL, braços à
   frente). Cada dança declara o porte inteiro — nunca uma base + correção, senão uma
   camada cancela a outra. Números de tools/eval/emotes-check.mjs. */
const BRACO = {
  // mão cai 48 cm abaixo do ombro, colada ao corpo
  solto: (o, k = 1) => o.push(
    // ASSIMÉTRICO de propósito: no idle a direita segura o punho e a esquerda atravessa
    // o guarda-mão, então o mesmo delta nos dois deixava um braço esticado à frente.
    ['RightForeArm', 'r', 1.40 * k], ['RightArm', 'r', -0.60 * k], ['RightArm', 'f', -0.14 * k],
    ['LeftForeArm', 'r', 1.80 * k], ['LeftArm', 'r', -0.05 * k], ['LeftArm', 'f', 0.10 * k]),
  // cotovelo fechado e aberto pro lado: silhueta de "jarra" (mão na cintura)
  cintura: (o) => o.push(
    ['RightForeArm', 'r', 0.30], ['LeftForeArm', 'r', 0.30],
    ['RightArm', 'r', -0.45], ['LeftArm', 'r', -0.45],
    ['RightArm', 'f', -0.95], ['LeftArm', 'f', 0.95]),
  // antebraços na altura do peito, abertos: samba/ginga
  peito: (o, abre = 0) => o.push(
    ['RightForeArm', 'r', 0.15], ['LeftForeArm', 'r', 0.15],
    ['RightArm', 'r', -0.15], ['LeftArm', 'r', -0.15],
    ['RightArm', 'f', -0.55 - abre], ['LeftArm', 'f', 0.55 + abre]),
};

const PASSOS = {
  /* PASSINHO — sabará: um pé sustenta e o outro cruza frente/trás, rápido, tronco
     respondendo e braço solto balançando junto ao corpo. */
  passinho(t, dur, ossos) {
    const fase = t / dur;
    const p = tri(fase * 2), q = tri(fase * 2 + 0.5);
    BRACO.solto(ossos);
    ossos.push(
      ['RightUpLeg', 'r', p * 1.00], ['RightLeg', 'r', -Math.max(0, p) * 0.95],
      ['LeftUpLeg', 'r', q * 1.00], ['LeftLeg', 'r', -Math.max(0, q) * 0.95],
      ['RightUpLeg', 'f', -0.16], ['LeftUpLeg', 'f', 0.16],
      ['Hips', 'u', sin(fase * 2) * 0.34],
      ['Spine01', 'u', -sin(fase * 2) * 0.34], ['Spine01', 'r', -0.12],
      ['RightArm', 'r', -p * 0.26], ['LeftArm', 'r', p * 0.26],
      ['RightForeArm', 'r', -p * 0.20], ['LeftForeArm', 'r', p * 0.20],
      ['Head', 'u', sin(fase * 2) * 0.22],
    );
    return (0.5 + 0.5 * sin(fase * 4)) * 0.075;
  },
  /* SAMBA NO PÉ — joelhos picados no contratempo, quadril solto, antebraços no peito
     abrindo e fechando contra o quadril. */
  samba(t, dur, ossos) {
    const fase = t / dur;
    const p = tri(fase * 3), q = tri(fase * 3 + 0.5);
    BRACO.peito(ossos, 0.25 * sin(fase * 1.5));
    ossos.push(
      ['RightUpLeg', 'r', Math.max(0, p) * 0.55], ['RightLeg', 'r', -Math.max(0, p) * 1.20],
      ['LeftUpLeg', 'r', Math.max(0, q) * 0.55], ['LeftLeg', 'r', -Math.max(0, q) * 1.20],
      ['Hips', 'u', sin(fase * 1.5) * 0.32], ['Hips', 'f', sin(fase * 3) * 0.16],
      ['Spine01', 'u', -sin(fase * 1.5) * 0.28], ['Spine01', 'f', -sin(fase * 3) * 0.12],
      ['Head', 'u', sin(fase * 1.5) * 0.18],
    );
    return (0.5 + 0.5 * sin(fase * 6)) * 0.05;
  },
  /* GINGA — base larga: a perna recua fundo e a mão do mesmo lado sobe à frente do
     rosto, trocando de lado no toque. */
  ginga(t, dur, ossos) {
    const fase = t / dur;
    const lado = tri(fase);
    const recuaD = Math.max(0, -lado), recuaE = Math.max(0, lado);
    BRACO.peito(ossos, 0.15);
    ossos.push(
      ['RightUpLeg', 'r', -recuaD * 0.95 + recuaE * 0.45], ['LeftUpLeg', 'r', -recuaE * 0.95 + recuaD * 0.45],
      ['RightUpLeg', 'f', -0.30], ['LeftUpLeg', 'f', 0.30],
      ['RightLeg', 'r', -recuaD * 0.85 - 0.25], ['LeftLeg', 'r', -recuaE * 0.85 - 0.25],
      ['Hips', 'u', lado * 0.40],
      ['Spine01', 'r', -0.20], ['Spine01', 'u', -lado * 0.30],
      // a guarda sobe do lado que recua
      ['RightArm', 'r', recuaD * 0.95], ['RightForeArm', 'r', -recuaD * 0.85],
      ['LeftArm', 'r', recuaE * 0.95], ['LeftForeArm', 'r', -recuaE * 0.85],
      ['Head', 'u', lado * 0.20],
    );
    return (0.55 + 0.45 * Math.cos(fase * TAU * 2)) * 0.13;
  },
  /* FREVO — agacha fundo, joelho alto alternado e o braço da sombrinha ESTICADO
     acima da cabeça (medido: -2,95 rad sobe 56 cm). */
  frevo(t, dur, ossos) {
    const fase = t / dur;
    const p = tri(fase * 2), alta = Math.max(0, p), outra = Math.max(0, -p);
    ossos.push(
      ['RightUpLeg', 'r', alta * 1.55], ['RightLeg', 'r', -alta * 1.70],
      ['LeftUpLeg', 'r', outra * 1.55], ['LeftLeg', 'r', -outra * 1.70],
      ['Hips', 'u', p * 0.26],
      ['Spine01', 'r', -0.18], ['Spine01', 'u', -p * 0.22],
      ['RightArm', 'f', -2.95], ['RightArm', 'r', 0.10], ['RightForeArm', 'r', 0.35],
      ['LeftArm', 'f', 1.35 + outra * 0.35], ['LeftArm', 'r', -0.20], ['LeftForeArm', 'r', 0.55],
      ['Head', 'r', -0.14],
    );
    return (0.35 + 0.65 * Math.abs(p)) * 0.17;
  },
  /* FORRÓ "DOIS PRA LÁ, DOIS PRA CÁ" — base lateral do xote no porte de par: braço
     esquerdo erguido segurando a mão de alguém, direito abraçando as costas. */
  forro(t, dur, ossos) {
    const fase = t / dur;
    const tempo = Math.floor(fase * 4) % 4;
    const dentro = (fase * 4) % 1;
    const lado = tempo < 2 ? 1 : -1;
    const passo = Math.sin(dentro * Math.PI);
    ossos.push(
      ['RightUpLeg', 'f', -0.18 - (lado > 0 ? passo * 0.55 : 0)],
      ['LeftUpLeg', 'f', 0.18 + (lado < 0 ? passo * 0.55 : 0)],
      ['RightUpLeg', 'r', lado > 0 ? passo * 0.28 : 0], ['LeftUpLeg', 'r', lado < 0 ? passo * 0.28 : 0],
      ['RightLeg', 'r', -(lado > 0 ? passo : 0.15) * 0.45], ['LeftLeg', 'r', -(lado < 0 ? passo : 0.15) * 0.45],
      ['Hips', 'u', lado * 0.18], ['Hips', 'f', lado * passo * 0.12],
      ['Spine01', 'f', lado * passo * 0.22], ['Spine01', 'r', -0.10],
      ['LeftArm', 'r', 0.55], ['LeftArm', 'f', 0.95], ['LeftForeArm', 'r', -0.15],
      ['RightArm', 'r', 0.25], ['RightArm', 'f', -0.35], ['RightForeArm', 'r', -0.45],
      ['Head', 'u', lado * 0.16],
    );
    return Math.abs(passo) * 0.05;
  },
  /* QUADRADINHO — pés plantados, joelhos dobrados, MÃOS NA CINTURA e o quadril
     percorrendo um quadrado em quatro tempos, com virada seca em cada canto. */
  quadradinho(t, dur, ossos) {
    const fase = t / dur;
    const lateral = tri(fase + 0.25), frontal = tri(fase);
    BRACO.cintura(ossos);
    ossos.push(
      ['Hips', 'r', frontal * 0.45], ['Hips', 'f', lateral * 0.45],
      ['Spine', 'r', -frontal * 0.32], ['Spine', 'f', -lateral * 0.32],
      ['Spine01', 'r', -frontal * 0.18],
      ['RightUpLeg', 'r', 0.32], ['LeftUpLeg', 'r', 0.32],
      ['RightUpLeg', 'f', -0.22], ['LeftUpLeg', 'f', 0.22],
      ['RightLeg', 'r', -0.60], ['LeftLeg', 'r', -0.60],
      ['Head', 'f', -lateral * 0.12],
    );
    return 0.055;
  },
  /* SARRADA NO AR — agacha, recolhe e joga o quadril à frente com as mãos descendo.
     Estilizado de propósito (nota de classificação em docs/EMOTES-BR.md). */
  sarrada(t, dur, ossos) {
    const prep = pulso(t, 0.00, 0.50), golpe = pulso(t, 0.45, 1.00);
    BRACO.solto(ossos, 0.8);
    ossos.push(
      ['Hips', 'r', prep * 0.30 - golpe * 0.55],
      ['Spine01', 'r', -prep * 0.40 + golpe * 0.70],
      ['RightUpLeg', 'r', prep * 0.55 - golpe * 0.30], ['LeftUpLeg', 'r', prep * 0.55 - golpe * 0.30],
      ['RightUpLeg', 'f', -0.26], ['LeftUpLeg', 'f', 0.26],
      ['RightLeg', 'r', -prep * 0.95], ['LeftLeg', 'r', -prep * 0.95],
      ['RightArm', 'r', golpe * 0.65], ['LeftArm', 'r', golpe * 0.65],
      ['RightForeArm', 'r', -golpe * 0.75], ['LeftForeArm', 'r', -golpe * 0.75],
      ['Head', 'r', -golpe * 0.28],
    );
    return prep * 0.14 - golpe * 0.04;
  },
  /* SALVE — braço direito ESTICADO acima do ombro acenando; o resto do corpo
     acompanha de leve. Sem osso de dedo no rig, o gesto é do braço. */
  salve(t, dur, ossos) {
    const sobe = Math.min(1, t / 0.28);
    const desce = t > dur - 0.28 ? Math.max(0, (dur - t) / 0.28) : 1;
    const k = sobe * desce;
    const aceno = Math.sin(t * 11) * k;
    BRACO.solto(ossos, 0.9);
    ossos.push(
      ['RightArm', 'f', -k * 2.70], ['RightArm', 'r', k * 0.55 + aceno * 0.10],
      ['RightForeArm', 'r', -k * 1.05], ['RightForeArm', 'f', -aceno * 0.40],
      ['RightShoulder', 'f', -k * 0.22],
      ['Spine01', 'u', -k * 0.18], ['Spine01', 'r', -k * 0.10],
      ['Head', 'r', -k * 0.12], ['Head', 'u', aceno * 0.10],
    );
    return 0;
  },
};

/* Avalia a coreografia no instante t. Preenche `ossos` (reusado pelo chamador, sem
   alocar por quadro) e devolve o agachamento em metros. */
export function poseEmote(id, t, ossos) {
  const passo = PASSOS[id];
  if (!passo) return 0;
  const info = POR_ID.get(id);
  const dur = info ? info.dur : 1.5;
  const tempo = info && info.laco ? t % dur : Math.min(t, dur);
  return passo(tempo, dur, ossos) || 0;
}

export const emoteDuracao = (id) => (POR_ID.get(id)?.dur ?? 0);
export const emoteLaco = (id) => !!POR_ID.get(id)?.laco;
