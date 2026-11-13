/* Fonte única de quais retratos existem em disco; tools/eval/retrato-hero-check.mjs
   cobra os dois sentidos contra public/img/chars-hero/ e public/img/chars/. */
export const HERO_IDS = new Set([
  'adjim', 'ancap', 'blackmetal', 'bombado', 'bonzo', 'cadequinha', 'caminhoneiro', 'canarinho',
  'chave', 'clubber', 'coach', 'criarj', 'dollynho', 'doutora', 'emo', 'esbirro', 'esquerdomacho',
  'et', 'farialimer', 'fluxo', 'funkraiz', 'gotinha', 'hipster', 'jozo', 'lobisomem', 'mandrake',
  'metaleiro', 'mistico', 'mst', 'oakley', 'ostentacao', 'padata', 'padati', 'pagodeiro',
  'palhacomal', 'proerd', 'punk', 'rapper', 'raul', 'reggae', 'sertanejo', 'sindicato', 'skatista',
  'titica', 'trapfunk',
  /* Fora do Ar: render do pack Studio (tools/gen-pack-media.mjs). */
  'capitao-caveira', 'teletreco-sinal-fraco', 'bebe-reborn', 'chupa-cabra', 'teletreco-antenao',
  'assombracao-lanhouse', 'dracula', 'boneca-da-cristaleira', 'satanista-talkshow',
  'clovis-fora-do-ar', 'teletreco-chiadinho', 'bicho-do-bueiro', 'coronel-arrego',
  'sorridente-onibus', 'bebezao-de-feira', 'boneco-falante-87', 'padre-parapsicologo',
  'muro-de-caco', 'teletreco-fora-do-ar', 'coelho-pascoa-shopping', 'pm-arrego', 'nanica',
  'roqueiro-mistico-70', 'profeta-auditorio', 'bicheiro-barracao', 'prata', 'dom-pedro-i',
  'tiradentes', 'corisco', 'vlad',
]);
/* Recorte do modelo (/img/chars/<id>.webp): o folclore só tem o busto de avatars/. */
export const RECORTE_IDS = new Set([
  'adjim', 'ancap', 'barbudo', 'blackmetal', 'bombado', 'bonzo', 'cadequinha', 'caminhoneiro',
  'canarinho', 'capitao', 'chave', 'clubber', 'coach', 'criarj', 'dama', 'deputado', 'dollynho',
  'doutora', 'emo', 'esbirro', 'esquerdomacho', 'et', 'farialimer', 'fluxo', 'funkraiz', 'gotinha',
  'hipster', 'jozo', 'juiz', 'julia-zanatta', 'mandrake', 'marina-silva', 'metaleiro', 'ministro',
  'mistico', 'mst', 'oakley', 'ostentacao', 'padata', 'padati', 'pagodeiro', 'palhacomal', 'proerd',
  'professor', 'punk', 'rapper', 'raul', 'reggae', 'senador', 'sertanejo', 'sindicato', 'skatista',
  'titica', 'trapfunk',
  /* Fora do Ar: render do pack Studio (tools/gen-pack-media.mjs). */
  'capitao-caveira', 'teletreco-sinal-fraco', 'bebe-reborn', 'chupa-cabra', 'teletreco-antenao',
  'assombracao-lanhouse', 'dracula', 'boneca-da-cristaleira', 'satanista-talkshow',
  'clovis-fora-do-ar', 'teletreco-chiadinho', 'bicho-do-bueiro', 'coronel-arrego',
  'sorridente-onibus', 'bebezao-de-feira', 'boneco-falante-87', 'padre-parapsicologo',
  'muro-de-caco', 'teletreco-fora-do-ar', 'coelho-pascoa-shopping', 'pm-arrego', 'nanica',
  'roqueiro-mistico-70', 'profeta-auditorio', 'bicheiro-barracao', 'prata', 'dom-pedro-i',
  'tiradentes', 'corisco', 'vlad',
]);

/* URLs sem query: cada chamador mantém a convenção de ?v= que já usava. */
export const heroUrl = (id) => (HERO_IDS.has(id) ? `/img/chars-hero/${id}.webp` : null);
export const recorteUrl = (id) => (RECORTE_IDS.has(id) ? `/img/chars/${id}.webp` : null);
export const bustoUrl = (id) => `/img/chars/avatars/${id}.webp`;
/* Só fontes que existem, na ordem hero → recorte → busto (o busto cobre todo personagem). */
export const retratoFontes = (id) => [heroUrl(id), recorteUrl(id), bustoUrl(id)].filter(Boolean);
