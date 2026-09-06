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

  mansao: {   // Joá: sol de fim de tarde sobre o mar
    /* r2: o sky_joa da r1 NÃO era panorama — era foto retilínea de varanda de mansão
       (deck de pedra, piscina, espreguiçadeira, coqueiro) esticada para 2:1. Como
       equirretangular isso vira mobília do tamanho do mundo na altura do olho, que é
       o "efeito muito estranho" que o dono viu no horizonte. Trocado por panorama de
       mar aberto sem primeiro plano; medida e limiar em tools/eval/sky-foreground-check.mjs. */
    sky: '/img/textures/sky_joa.webp',
    horizonte: 0xe9c58c,   // look-horizonte.py sobre sky_joa.webp (banda 322-334 de 672)
    zenite: 0x718ca2,
    sol: { cor: 0xffefd8, i: 1.8, pos: [15, 30, -15] },
    hemi: { ceu: 0xf6f3ea, chao: 0x665c50, i: 1.02 },
    neblina: { d: 0.0068, solDir: [30, 32, 24], forca: 0.94 },
    grade: { exposicao: 1.36, piso: 0.0043, expAces: 1.46 },
    /* Horizonte 3D: az=atan2(z,x) (-pi/2 = norte), `dist` presa entre o far=400 e a
       névoa. Setor, camadas e tetos: tools/eval/mansao-beach-check.mjs, H1-H3. */
    horizonte3d: {
      ilhas: [{ az: -1.02, dist: 128, r: 20, h: 14, cor: 0x3f5a42, mistura: 0.10, praia: 0xc0b49b }],
      morros: [
        { az: -2.55, dist: 172, r: 50, h: 28, cor: 0x3a5540, mistura: 0.16 },
        { az: -0.38, dist: 158, r: 44, h: 25, cor: 0x3a5340, mistura: 0.13 },
        { az: -1.95, dist: 258, r: 90, h: 62, cor: 0x445c46, mistura: 0.36 },
        { az: -0.82, dist: 222, r: 74, h: 46, cor: 0x3d5742, mistura: 0.28 },
        { az: -1.42, dist: 298, r: 115, h: 84, cor: 0x4a604c, mistura: 0.46 },
      ],
      // bruma quente: mediana do sky_joa.webp na banda do equador (re-amostrada na r2)
      bruma: { cor: 0xe2be89, y: 2.4, raio: 330, altura: 17, opacidade: 0.34 },
    },
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
  fy_campomorro: {   // várzea do RJ: azul aberto, terra quente
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
};
