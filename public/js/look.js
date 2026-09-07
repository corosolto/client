/* look.js — LOOK por mapa (RC1 do plans/23): céu, névoa, sol e grade nascem do MESMO
   lugar e bloom.js deriva desta tabela. Cores medidas por tools/eval/look-horizonte.py. */
export const LOOK = {
  amazonia: {   // equador úmido: céu lavado de água, névoa verde densa
    sky: '/img/textures/sky_amazonia.webp',
    horizonte: 0xc9d0cd,   // look-horizonte.py sobre sky_amazonia.webp (banda 429-441 de 887)
    zenite: 0x7c919f,
    sol: { cor: 0xfff2dc, i: 1.45, pos: [12, 38, 10] },
    hemi: { ceu: 0xdfe8e4, chao: 0x3d4a33, i: 1.05 },
    neblina: { d: 0.0112, solDir: [12, 38, 10], forca: 0.18 },
    grade: { exposicao: 1.50, piso: 0.0050, expAces: 1.60 },
  },

  fy_mansao: {   // Joá: sol de fim de tarde sobre o mar
    sky: '/img/textures/sky_joa.webp',
    horizonte: 0xc7a378,   // look-horizonte.py sobre sky_joa.webp (banda 498-510 de 1024)
    zenite: 0x7fadc7,
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
  velho_oeste: {   // sertão (map2 retheme): fim de tarde quente, sol baixo raspando, ar seco
    sky: { kind: 'procedural', model: 'dry-afternoon', horizonHold: 0.10, curve: 0.55,
      halo: 0xe9d0aa, haloStrength: 0.48, haloFocus: 7 },
    horizonte: 0xc7b59b,   // eval:look mede a banda da DataTexture usada pelo jogo
    zenite: 0x7896ad,
    sol: { cor: 0xffe0b5, i: 1.9, pos: [-30, 14, -18] },
    hemi: { ceu: 0xdce6ee, chao: 0x7e6a50, i: 1.16 },
    neblina: { d: 0.0056, solDir: [-30, 14, -18], forca: 0 },
    grade: { exposicao: 1.48, piso: 0.0050, expAces: 1.58 },
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

  penitenciaria: {   // fim de tarde de presídio: azul-chumbo, glow de vapor de sódio; os holofotes quentes carregam a cena
    sky: '/img/textures/sky_penitenciaria.webp',
    horizonte: 0x567186,   // look-horizonte.py sobre sky_penitenciaria.webp (banda 498-510 de 1024)
    zenite: 0x5e85a3,
    sol: { cor: 0x9db8d8, i: 0.55, pos: [25, 40, -18] },
    hemi: { ceu: 0x5e7f9d, chao: 0x2a2b26, i: 0.5 },
    neblina: { d: 0.0085, solDir: [25, 40, -18], forca: 0.6 },
    /* grade calibrada por medição (25/08): com 1,50 a média dos 4 frames 3:2 media
       L* 20,1 — buraco preto. Alvo noturno L* ≈ 37 (mapa de dia mira 42-48);
       piso·exposicao ≈ 0,022 segura blk < 1 % (mesma receita do loja_h R9). */
    grade: { exposicao: 2.60, piso: 0.0085, expAces: 2.80 },
  },

};
