// Catálogo do menu de compra da partida (TRETA$ da partida). Dado puro, sem DOM nem rede.
// Preços e recompensas seguem o CS2; procedência e regras em docs/ECONOMIA-PARTIDA.md.

// Grupos na ordem do menu: a tecla do grupo é o índice + 1, como no menu de compra do CS.
export const GRUPOS_COMPRA = Object.freeze([
  { id: 'pistolas', rotulo: 'PISTOLAS' },
  { id: 'pesadas', rotulo: 'PESADAS' },
  { id: 'smg', rotulo: 'SUBMETRALHADORAS' },
  { id: 'fuzis', rotulo: 'FUZIS' },
  { id: 'precisao', rotulo: 'SNIPERS' },
]);

// `slot` diz o que a compra substitui; 'equipamento' fica reservado para colete, capacete e
// flashbang, que entram em PRs próprios (docs/ECONOMIA-PARTIDA.md#o-que-entra-depois).
export const SLOTS_COMPRA = Object.freeze(['primaria', 'secundaria', 'equipamento']);

const item = (id, grupo, slot, preco, recompensaKill) => Object.freeze({ id, grupo, slot, preco, recompensaKill });

export const CATALOGO_COMPRA = Object.freeze([
  item('deagle', 'pistolas', 'secundaria', 700, 300),
  item('revolver38', 'pistolas', 'secundaria', 600, 300),
  item('shotgun', 'pesadas', 'primaria', 1050, 900),
  item('lmg', 'pesadas', 'primaria', 5200, 300),
  item('uzi', 'smg', 'primaria', 1050, 600),
  item('mp5', 'smg', 'primaria', 1500, 600),
  item('p90', 'smg', 'primaria', 2350, 300),
  item('carbine', 'fuzis', 'primaria', 1800, 300),
  item('famas', 'fuzis', 'primaria', 2050, 300),
  item('m92', 'fuzis', 'primaria', 2500, 300),
  item('md97', 'fuzis', 'primaria', 2600, 300),
  item('ak', 'fuzis', 'primaria', 2700, 300),
  item('m4', 'fuzis', 'primaria', 2900, 300),
  item('scar', 'fuzis', 'primaria', 3000, 300),
  item('mosin', 'precisao', 'primaria', 1700, 300),
  item('sks', 'precisao', 'primaria', 2300, 300),
  item('awp', 'precisao', 'primaria', 4750, 100),
  item('svd', 'precisao', 'primaria', 5000, 300),
  item('g3sg1', 'precisao', 'primaria', 5000, 300),
]);

// Armas que não estão à venda mas matam (faca, pistola de nascença, pickup de mapa).
export const RECOMPENSA_FORA_DO_CATALOGO = Object.freeze({
  knife: 1500, pistol: 300, akm: 300, g3: 300, m400: 300, rem700: 300, tavor: 300,
});

export const itemDaCompra = (id) => CATALOGO_COMPRA.find((i) => i.id === id) || null;
export const itensDoGrupo = (grupo) => CATALOGO_COMPRA.filter((i) => i.grupo === grupo);
