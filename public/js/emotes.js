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
const PASSOS = {
  /* PASSINHO — passo-base sabará: um pé sustenta e o outro alterna FRENTE e ATRÁS,
     rápido, com o tronco respondendo. Fonte: Red Bull/Wikifavelas (docs/EMOTES-BR.md). */
  passinho(t, dur, ossos) {
    const fase = t / dur;
    const p = tri(fase * 2);          // pés alternam duas vezes por ciclo
    const q = tri(fase * 2 + 0.5);
    ossos.push(
      ['RightUpLeg', 'r', p * 0.62], ['RightLeg', 'r', -Math.max(0, p) * 0.60],
      ['LeftUpLeg', 'r', q * 0.62], ['LeftLeg', 'r', -Math.max(0, q) * 0.60],
      ['Hips', 'u', sin(fase * 2) * 0.16],
      ['Spine01', 'u', -sin(fase * 2) * 0.20], ['Spine01', 'r', -0.08],
      // braços soltos, contrariando a perna (o passinho é de pé, braço só acompanha)
      ['RightArm', 'r', 0.20 - p * 0.26], ['LeftArm', 'r', 0.20 + p * 0.26],
      ['RightArm', 'f', -0.16], ['LeftArm', 'f', 0.16],
      ['RightForeArm', 'r', -0.70], ['LeftForeArm', 'r', -0.70],
      ['Head', 'u', sin(fase * 2) * 0.12],
    );
    return Math.abs(sin(fase * 4)) * 0.045;
  },
  /* SAMBA NO PÉ — joelhos alternando rápido com o quadril solto; o peso troca de pé
     e o ombro contraria o quadril. */
  samba(t, dur, ossos) {
    const fase = t / dur;
    const p = sin(fase * 3), q = sin(fase * 3 + 0.5);
    ossos.push(
      ['RightUpLeg', 'r', p * 0.40], ['RightLeg', 'r', -Math.max(0, p) * 0.75],
      ['LeftUpLeg', 'r', q * 0.40], ['LeftLeg', 'r', -Math.max(0, q) * 0.75],
      ['Hips', 'u', sin(fase * 3) * 0.16],
      ['Spine01', 'f', sin(fase * 1.5) * 0.12], ['Spine01', 'u', -sin(fase * 3) * 0.14],
      // braços na altura do peito, abrindo e fechando no contratempo
      ['RightArm', 'r', 0.55], ['LeftArm', 'r', 0.55],
      ['RightArm', 'f', -0.30 + sin(fase * 1.5) * 0.22], ['LeftArm', 'f', 0.30 - sin(fase * 1.5) * 0.22],
      ['RightForeArm', 'r', -1.05], ['LeftForeArm', 'r', -1.05],
      ['Head', 'u', sin(fase * 1.5) * 0.10],
    );
    return Math.abs(sin(fase * 6)) * 0.030;
  },
  /* GINGA — base da capoeira: mão à frente do rosto com a perna do MESMO lado atrás,
     troca no toque. Fonte: Guerreiros do Abaeté / material didático (docs/EMOTES-BR.md). */
  ginga(t, dur, ossos) {
    const fase = t / dur;
    const lado = sin(fase);
    const recuaD = Math.max(0, -lado), recuaE = Math.max(0, lado);
    ossos.push(
      ['RightUpLeg', 'r', -recuaD * 0.48 + recuaE * 0.22], ['LeftUpLeg', 'r', -recuaE * 0.48 + recuaD * 0.22],
      ['RightLeg', 'r', -recuaD * 0.85], ['LeftLeg', 'r', -recuaE * 0.85],
      ['Hips', 'u', lado * 0.30],
      ['Spine01', 'r', -0.18], ['Spine01', 'u', -lado * 0.18],
      // guarda: a mão do lado que RECUA sobe à frente do rosto
      ['RightArm', 'r', 0.55 + recuaD * 0.75], ['RightForeArm', 'r', -1.45],
      ['LeftArm', 'r', 0.55 + recuaE * 0.75], ['LeftForeArm', 'r', -1.45],
      ['RightArm', 'f', -0.25], ['LeftArm', 'f', 0.25],
      ['Head', 'u', lado * 0.14],
    );
    return (0.5 + 0.5 * Math.cos(fase * TAU * 2)) * 0.075;
  },
  /* FREVO — frenético: agacha e levanta, perna sobe alta e um braço fica EM CIMA
     (onde moraria a sombrinha). Fonte: IPHAN/UNESCO (docs/EMOTES-BR.md). */
  frevo(t, dur, ossos) {
    const fase = t / dur;
    const p = tri(fase * 2), alta = Math.max(0, p), outra = Math.max(0, -p);
    ossos.push(
      ['RightUpLeg', 'r', alta * 1.20], ['RightLeg', 'r', -alta * 1.35],
      ['LeftUpLeg', 'r', outra * 1.20], ['LeftLeg', 'r', -outra * 1.35],
      ['Hips', 'u', p * 0.22],
      ['Spine01', 'r', -0.16], ['Spine01', 'u', -p * 0.16],
      // braço da sombrinha ACIMA da cabeça; o outro aberto, mais baixo
      ['RightArm', 'f', -3.00], ['RightArm', 'r', 0.18], ['RightForeArm', 'r', -0.25],
      ['LeftArm', 'f', 0.80 + outra * 0.25], ['LeftArm', 'r', 0.30], ['LeftForeArm', 'r', -0.75],
      ['Head', 'r', -0.10],
    );
    return (0.35 + 0.65 * Math.abs(p)) * 0.11;
  },
  /* FORRÓ "DOIS PRA LÁ, DOIS PRA CÁ" — base lateral do xote: dois apoios pra um lado, */
  forro(t, dur, ossos) {
    const fase = t / dur;
    const tempo = Math.floor(fase * 4) % 4;
    const dentro = (fase * 4) % 1;
    const lado = tempo < 2 ? 1 : -1;                   // dois pra lá, dois pra cá
    const passo = Math.sin(dentro * Math.PI);
    ossos.push(
      ['RightUpLeg', 'r', lado > 0 ? passo * 0.45 : -passo * 0.15],
      ['LeftUpLeg', 'r', lado > 0 ? -passo * 0.15 : passo * 0.45],
      ['RightLeg', 'r', -(lado > 0 ? passo : 0) * 0.35],
      ['LeftLeg', 'r', -(lado < 0 ? passo : 0) * 0.35],
      ['Hips', 'u', lado * 0.12],
      ['Spine01', 'f', lado * passo * 0.14], ['Spine01', 'r', -0.10],
      // porte de par: braço esquerdo erguido segurando a mão de alguém, direito abraçando
      ['LeftArm', 'r', 1.05], ['LeftArm', 'f', 0.45], ['LeftForeArm', 'r', -0.95],
      ['RightArm', 'r', 0.75], ['RightArm', 'f', -0.15], ['RightForeArm', 'r', -1.15],
      ['Head', 'u', lado * 0.10],
    );
    return Math.abs(passo) * 0.025;
  },
  /* QUADRADINHO — o rebolado circular virado QUADRADO: quatro arestas, uma por tempo,
     com virada seca em cada canto. Fonte: TCC UFSC sobre dança funk. */
  quadradinho(t, dur, ossos) {
    const fase = t / dur;
    const lateral = tri(fase + 0.25), frontal = tri(fase);
    ossos.push(
      ['Hips', 'r', frontal * 0.18], ['Hips', 'f', lateral * 0.20],
      ['Spine', 'r', -frontal * 0.12], ['Spine', 'f', -lateral * 0.14],
      ['RightUpLeg', 'r', 0.12 + lateral * 0.10], ['LeftUpLeg', 'r', 0.12 - lateral * 0.10],
      ['RightLeg', 'r', -0.35], ['LeftLeg', 'r', -0.35],
      // mãos na cintura: braço pouco à frente e cotovelo bem fechado
      ['RightArm', 'r', 0.20], ['LeftArm', 'r', 0.20],
      ['RightArm', 'f', -0.45], ['LeftArm', 'f', 0.45],
      ['RightForeArm', 'r', -1.35], ['LeftForeArm', 'r', -1.35],
      ['Head', 'f', -lateral * 0.08],
    );
    return 0.035;
  },
  /* SARRADA NO AR — impulso de quadril pra frente com as mãos indo à pelve, uma vez só.
     Estilizado de propósito (ver nota de classificação em docs/EMOTES-BR.md). */
  sarrada(t, dur, ossos) {
    const prep = pulso(t, 0.00, 0.45), golpe = pulso(t, 0.40, 0.95);
    ossos.push(
      ['Hips', 'r', prep * 0.20 - golpe * 0.30],
      ['Spine01', 'r', -prep * 0.25 + golpe * 0.45],   // agacha à frente e joga o tronco atrás
      ['RightUpLeg', 'r', prep * 0.35 - golpe * 0.15],
      ['LeftUpLeg', 'r', prep * 0.35 - golpe * 0.15],
      ['RightLeg', 'r', -prep * 0.65], ['LeftLeg', 'r', -prep * 0.65],
      ['RightArm', 'r', 0.35 + golpe * 0.45], ['LeftArm', 'r', 0.35 + golpe * 0.45],
      ['RightArm', 'f', -0.30], ['LeftArm', 'f', 0.30],
      ['RightForeArm', 'r', -0.55 - golpe * 0.85], ['LeftForeArm', 'r', -0.55 - golpe * 0.85],
      ['Head', 'r', -golpe * 0.20],
    );
    return prep * 0.09 - golpe * 0.02;
  },
  /* SALVE — o braço sobe à frente do peito e a cabeça acena junto. A intenção era o */
  salve(t, dur, ossos) {
    const sobe = Math.min(1, t / 0.30);
    const desce = t > dur - 0.30 ? Math.max(0, (dur - t) / 0.30) : 1;
    const k = sobe * desce;
    const balanco = pulso(t, 0.35, 0.95);
    ossos.push(
      ['RightArm', 'r', k * 0.95], ['RightArm', 'f', k * 0.55],
      ['RightForeArm', 'r', -k * 1.50],
      ['RightShoulder', 'f', k * 0.20],
      ['Spine01', 'u', -k * 0.14], ['Spine01', 'r', -k * 0.08],
      ['Head', 'r', -balanco * 0.18],      // o aceno que acompanha o joinha
      ['LeftArm', 'r', k * 0.18],
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
