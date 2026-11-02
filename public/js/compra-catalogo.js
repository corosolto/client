// Catálogo do menu de compra da partida (TRETA$ da partida). Dado puro, sem DOM nem rede.
// Preços e recompensas seguem o CS2; procedência e regras em docs/ECONOMIA-PARTIDA.md.

// Grupos na ordem do menu: a tecla do grupo é o índice + 1, como no menu de compra do CS.
/* `icone`: imagem representativa do botão (relato do dono, 31/10: "os botões de opções
   com imagens representativas"). Armas usam a arte lateral de /img/weapons; equipamento
   e munição usam os SVGs de /img/compra/. */
export const GRUPOS_COMPRA = Object.freeze([
  { id: 'pistolas', rotulo: 'PISTOLAS', icone: '/img/weapons/deagle.webp' },
  { id: 'pesadas', rotulo: 'PESADAS', icone: '/img/weapons/shotgun.webp' },
  { id: 'smg', rotulo: 'SUBMETRALHADORAS', icone: '/img/weapons/mp5.webp' },
  { id: 'fuzis', rotulo: 'FUZIS', icone: '/img/weapons/ak.webp' },
  { id: 'precisao', rotulo: 'SNIPERS', icone: '/img/weapons/awp.webp' },
  { id: 'equipamento', rotulo: 'EQUIPAMENTO', icone: '/img/compra/colete.svg' },
  { id: 'municao', rotulo: 'MUNIÇÃO', icone: '/img/compra/municao.svg' },
]);

// `slot` diz o destino: equipamento soma proteção/flash; munição repõe a reserva, sem trocar arma.
export const SLOTS_COMPRA = Object.freeze(['primaria', 'secundaria', 'equipamento', 'municao']);

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

// Equipamento (CS2): não é arma, não paga kill. `chave` é o kill-switch que tira o item da loja
// (?armadura=0, ?flash=0); `limite` é o estoque máximo; capacete sozinho só para quem já tem colete.
const equip = (id, preco, rotulo, chave, extra = {}) =>
  Object.freeze({ id, grupo: 'equipamento', slot: 'equipamento', preco, recompensaKill: 0, rotulo, chave, ...extra });

export const EQUIPAMENTO_COMPRA = Object.freeze([
  equip('colete', 650, 'COLETE', 'armadura', { icone: '/img/compra/colete.svg' }),
  equip('colete-capacete', 1000, 'COLETE + CAPACETE', 'armadura', { icone: '/img/compra/colete-capacete.svg' }),
  equip('capacete', 350, 'CAPACETE', 'armadura', { icone: '/img/compra/capacete.svg' }),
  equip('flash', 200, 'FLASH', 'flash', { limite: 2, icone: '/img/compra/flash.svg' }),
]);

const municao = (id, preco, rotulo, armaSlot) =>
  Object.freeze({ id, grupo: 'municao', slot: 'municao', preco, recompensaKill: 0, rotulo, armaSlot, icone: '/img/compra/municao.svg' });


export const MUNICAO_COMPRA = Object.freeze([
  municao('municao-primaria', 200, 'MUNIÇÃO PRIMÁRIA', 'primary'),
  municao('municao-secundaria', 100, 'MUNIÇÃO SECUNDÁRIA', 'secondary'),
]);

// Armas que não estão à venda mas matam (faca, pistola de nascença, pickup de mapa).
export const RECOMPENSA_FORA_DO_CATALOGO = Object.freeze({
  knife: 1500, pistol: 300, akm: 300, g3: 300, m400: 300, rem700: 300, tavor: 300,
});

export const itemDaCompra = (id) => CATALOGO_COMPRA.find((i) => i.id === id)
  || EQUIPAMENTO_COMPRA.find((i) => i.id === id)
  || MUNICAO_COMPRA.find((i) => i.id === id)
  || null;
// `desligados`: chaves com kill-switch ligado ('armadura', 'flash'); o item some do menu.
export const itensDoGrupo = (grupo, { desligados = [] } = {}) =>
  [...CATALOGO_COMPRA, ...EQUIPAMENTO_COMPRA, ...MUNICAO_COMPRA]
    .filter((i) => i.grupo === grupo && !desligados.includes(i.chave));
