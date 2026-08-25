/* look.js — LOOK por mapa (RC1 do plans/23): céu, névoa, sol e grade nascem do MESMO
   lugar e bloom.js deriva desta tabela. Cores medidas por tools/eval/look-horizonte.py. */
export const LOOK = {
  mansao: {   // Joá: sol de fim de tarde sobre o mar
    sky: '/img/textures/sky_joa.webp',
    horizonte: 0xb1aca5,   // look-horizonte.py sobre sky_joa.webp (banda 429-441 de 887)
    zenite: 0x6595bf,
    sol: { cor: 0xffefd8, i: 1.8, pos: [15, 30, -15] },
    hemi: { ceu: 0xf6f3ea, chao: 0x665c50, i: 1.02 },
    neblina: { d: 0.0068, solDir: [30, 32, 24], forca: 0.94 },
    grade: { exposicao: 1.36, piso: 0.0043, expAces: 1.46 },
  },
  corrego: {   // SP abafado: céu cinza de chuva que não cai
    sky: '/img/textures/sky_sp.webp',
    horizonte: 0xd6dad9,
    zenite: 0x98a4b1,
    sol: { cor: 0xffc888, i: 1.7, pos: [20, 35, 15] },
    hemi: { ceu: 0xd8b89a, chao: 0x4a3830, i: 0.85 },
    neblina: { d: 0.0102, solDir: [20, 35, 15], forca: 0.72 },
    grade: { exposicao: 1.42, piso: 0.0054, expAces: 1.52 },
  },
  campomorro: {   // várzea do RJ: azul aberto, terra quente
    sky: '/img/textures/sky_rj.webp',
    horizonte: 0xb9daee,
    zenite: 0xa5cae9,
    sol: { cor: 0xffd9a8, i: 1.65, pos: [30, 42, 10] },
    hemi: { ceu: 0xeaf2f6, chao: 0x67584a, i: 1.16 },
    neblina: { d: 0.0082, solDir: [28, 38, 18], forca: 0.84 },
    grade: { exposicao: 1.60, piso: 0.0048, expAces: 1.70 },
  },
  parque_treta: {   // fim de tarde no parque: sol baixo a oeste, sombras longas
    sky: '/img/textures/sky_parque.webp',
    horizonte: 0x7b739a,   // look-horizonte.py sobre sky_parque.webp (banda 498-510 de 1024)
    zenite: 0x193660,
    sol: { cor: 0xffc890, i: 1.75, pos: [-38, 16, -8] },
    hemi: { ceu: 0xd9c2e0, chao: 0x4f4034, i: 1.0 },
    neblina: { d: 0.0075, solDir: [-38, 16, -8], forca: 0.88 },
    grade: { exposicao: 1.42, piso: 0.0050, expAces: 1.52 },
  },
};
