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
  /* 9–16: emotes de captura (Mixamo convertido para meshy-28), tocados por clipe de corpo
     inteiro do pack lazy models/anims/emotes-mocap.glb. SÓ ACRESCENTAR no fim: a posição
     é o id binário v9. `dur`/`laco` vêm do clipe convertido (emotes-mocap.SOURCES.md);
     `reserva` é a dança procedural usada enquanto o pack baixa, se ele falhar ou em LOD≥2.
     `desbloqueio`: 'base' = todo mundo tem; 'passe' = reservado ao passe de temporada
     (ainda sem trava; a loja lê este campo). Os 8 procedurais acima são 'base'. */
  { id: 'capoeira',    nome: 'Ginga',              origem: 'Capoeira — a ginga de roda, captura de movimento', dur: 3.4333, laco: true,  clipe: true, fonte: 'mixamo/capoeira-pack/capoeira', reserva: 'ginga', desbloqueio: 'base' },
  { id: 'meia_lua',    nome: 'Meia-lua de frente', origem: 'Capoeira — chute circular de frente, de dentro pra fora', dur: 2.4667, laco: true, clipe: true, fonte: 'mixamo/capoeira-pack/meia-lua-de-frente', reserva: 'ginga', desbloqueio: 'passe' },
  { id: 'bencao',      nome: 'Bênção',             origem: 'Capoeira — o chute frontal de sola que empurra', dur: 1.3667, laco: true,  clipe: true, fonte: 'mixamo/capoeira-pack/bencao', reserva: 'ginga', desbloqueio: 'passe' },
  { id: 'uprock',      nome: 'Uprock',             origem: 'Breaking — o duelo em pé antes de descer pro chão', dur: 2.1000, laco: true,  clipe: true, fonte: 'mixamo/breakdance-pack/breakdance-uprock', reserva: 'passinho', desbloqueio: 'passe' },
  { id: 'freeze',      nome: 'Freeze',             origem: 'Breaking — a pose congelada que fecha a sequência', dur: 4.8667, laco: false, clipe: true, fonte: 'mixamo/breakdance-pack/breakdance-freeze-var-2', reserva: 'passinho', desbloqueio: 'passe' },
  { id: 'continencia', nome: 'Continência',        origem: 'Gesto — mão na testa, saudação formal',          dur: 2.8333, laco: true,  clipe: true, fonte: 'mixamo/loose/salute', reserva: 'salve', desbloqueio: 'passe' },
  { id: 'marra',       nome: 'Marra',              origem: 'Gesto — o peito estufado de quem ganhou a troca', dur: 2.8667, laco: true,  clipe: true, fonte: 'mixamo/gestures-pack-basic/being-cocky', reserva: 'salve', desbloqueio: 'passe' },
  { id: 'comemoracao', nome: 'Comemoração',        origem: 'Gesto — as mãos que celebram a rodada',           dur: 2.7333, laco: true,  clipe: true, fonte: 'mixamo/gestures-pack-basic/happy-hand-gesture', reserva: 'salve', desbloqueio: 'base' },
];
export const EMOTE_IDS = EMOTES.map((e) => e.id);
const POR_ID = new Map(EMOTES.map((e) => [e.id, e]));
export const emoteInfo = (id) => POR_ID.get(id) || null;
// Sem campo explícito o emote é da base: os 8 procedurais nasceram liberados.
export const emoteDesbloqueio = (id) => (POR_ID.get(id) ? (POR_ID.get(id).desbloqueio || 'base') : null);
