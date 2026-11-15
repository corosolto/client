/* Metadados compartilhados pelo codec e pelo servidor; sem carregar coreografia.
   A ordem é o contrato dos IDs binários v9 (zero significa sem emote). */
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
