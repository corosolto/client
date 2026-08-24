/* Fonte unica das cameras de evidencia dos cinco mapas novos.

   O capturador e as reguas importam este mesmo objeto. Antes, somente a camera
   `field-mouth` vivia aqui; as outras estavam duplicadas dentro do capturador e o
   manifest podia continuar verde com vetores antigos. A ordem abaixo tambem e o
   roteiro deterministico da recaptura (mapa por mapa, sempre em 3:2). */
export const CAMPO_FIELD_MOUTH = {
  name: 'field-mouth',
  from: [-23, 1.45, 0],
  look: [0, 1, 0],
  proves: 'campo, traves, alambrado e arquibancada enquadrados pela boca oeste',
};

export const MAP_EVIDENCE_SHOTS = Object.freeze({
  escadao: [
    { name: 'bottom-up', from: [0, 2.2, 27], look: [0, 4.2, -5], proves: 'tres lances monumentais vistos da base' },
    { name: 'top-down', from: [0, 14, -15], look: [0, 2.2, 18], proves: 'desnivel completo e rua da base vistos do mirante' },
    { name: 'caveirao', from: [4.5, 7.2, 5.5], look: [-2.2, 5.25, 0.54], proves: 'casco monovolume, frente inclinada, para-lamas e torre baixa do caveirao' },
  ],
  campomorro: [
    CAMPO_FIELD_MOUTH,
    { name: 'field-eye', from: [-4, 1.57, 5], look: [18, 1.57, -2], proves: 'leitura do campo, redes e marcos na altura de olhos 1,65 m acima da varzea' },
    { name: 'galpao-interior', from: [32, 2.7, -24], look: [24, 1.5, -18], proves: 'interior jogavel do galpao, paredao e duas saidas' },
    { name: 'galpao-eye', from: [30.5, 2.65, -23.5], look: [22, 2.65, -20.5], proves: 'piso, forro, fill e batentes a 1,65 m acima do piso do galpao' },
    { name: 'field-overview', from: [0, 18, 28], look: [0, -0.2, -4], proves: 'convergencia dos becos para o campo central' },
  ],
  lajes: [
    { name: 'spawn-sul', from: [0, 6.85, 32.3], look: [0, 5.35, 24], proves: 'spawn sul nasce na laje e enquadra as duas saidas de madeira oeste e leste' },
    { name: 'spawn-norte', from: [0, 6.85, -32.3], look: [0, 5.35, -24], proves: 'spawn norte nasce na laje e enquadra as duas saidas de madeira oeste e leste' },
    { name: 'escadaria', from: [5.35, 13, -7.9], look: [5.35, 1.8, -7.9], proves: 'Escadaria encaixada entre fachadas, com dois lances, giro e patamar vistos de cima' },
    { name: 'beco-varal', from: [-2, 1.65, 17], look: [-1.9, 1.15, 12.2], proves: 'Beco do Varal estreito, com drenagem no piso, fachadas proximas e GLB de referencia' },
    { name: 'laje-caixa', from: [-11.7, 6.85, -21], look: [-10.5, 5.6, -26], proves: 'Laje da Caixa ocupada, reservatorio, antena, parapeto e tábua ancorada' },
    { name: 'overview', from: [28, 24, 34], look: [0, 4.2, -4], proves: 'duas rotas superiores continuas, miolo denso e beco inferior sinuoso' },
  ],
  corrego: [
    { name: 'bridge-eye', from: [-12, 1.65, -18], look: [0, .55, -22], proves: 'canal e tablado assentado vistos a 1,65 m da margem' },
    { name: 'water-bridge', from: [-12, 7, -5], look: [0, -0.2, 0], proves: 'agua poluida e ponte central dominando a rota' },
    { name: 'animals', from: [-4, 5, -15], look: [0.8, -0.1, -7], proves: 'jacare decorativo reduzido no canal, sem bloquear a passagem' },
    { name: 'capivara', from: [-8.2, 1.65, -38], look: [-5.2, 0.55, -38], proves: 'perfil da capivara a 1,65 m: corpo arredondado, cabeca larga e romba, quatro patas curtas apoiadas e folga dos pneus' },
    { name: 'rats', from: [-15.35, 0.48, -2.45], look: [-17.08, 0.06, -2.35], proves: 'trio estabilizado na captura e visto pelo lado livre: corpos, orelhas, patas e caudas na frente da manilha/lixo' },
    { name: 'canal-overview', from: [18, 19, 32], look: [0, 0, 0], proves: 'canal continuo, tres travessias e palafitas' },
  ],
  mansao: [
    { name: 'garden-eye', from: [3, 1.65, 27.2], look: [0, 1.5, 8], proves: 'maciços tropicais assimetricos e pergolado ancorado vistos a 1,65 m dentro do jardim' },
    { name: 'cars-front-close', from: [0, 1.55, 16.4], look: [0, .68, 11], proves: 'três carros do acervo em GLB (BUG-56) de frente na garagem: Delorean, Mini Cooper S e Golf R32 em escala de fábrica dentro das vagas' },
    { name: 'facade-garden', from: [0, 6, 38], look: [-1.4, 2.2, 2], proves: 'jardim tropical assimetrico, espelho deslocado e fachada modernista' },
    { name: 'interior', from: [11.5, 2.4, 4.8], look: [-4, 1.1, -7.5], proves: 'dois grupos de estar, piso de placas grandes, divisoria e mezanino jogaveis' },
    { name: 'gourmet-eye', from: [-13.2, 1.65, -8.15], look: [-8, 1.05, -10], proves: 'ilha gourmet inteira vista de dentro da cozinha, sem parede/escada no primeiro plano: bancada, cooktop, cuba, torneira, tres banquetas e pendentes' },
    { name: 'theater-eye', from: [4.2, 1.65, -7.2], look: [9, 1.1, -13.8], proves: 'home theater com tela, console, quatro recliners e paineis acusticos' },
    { name: 'infinity-pool', from: [0, 4.2, -19], look: [0, 0.2, -44], proves: 'piscina infinita alinhada ao oceano do panorama original' },
  ],
});

export const MAP_EVIDENCE_ORDER = Object.freeze(Object.keys(MAP_EVIDENCE_SHOTS));
