// Regras do TRETA$ da partida: vale só naquela partida e nunca toca a carteira do menu
// (treta-store.js). Funções puras; o porquê de cada número em docs/ECONOMIA-PARTIDA.md.
import { itemDaCompra, RECOMPENSA_FORA_DO_CATALOGO } from './compra-catalogo.js';
import { WEAPONS } from './data/weapons.js';

export const ECONOMIA = Object.freeze({
  saldoInicial: 800,
  teto: 16000,
  /* 30 -> 50 s (relato do dono, 31/10): janela maior para comprar ao renascer no meio
     da rodada; as réguas eval:economia e eval:economia-jogo leem daqui. */
  tempoCompraS: 50,
  raioCompraM: 9,
  vitoria: 3250,
  derrotaSeguida: Object.freeze([1400, 1900, 2400, 2900, 3400]),
  descontoAssinatura: 0.1,
  recompensaKillPadrao: 300,
});

// Multiplayer fica sem loja até o nó autoritativo validar a compra (contrato no doc).
export const ECONOMIA_NO_MP = false;

export function economiaLigada({ busca = '', online = false, dedicado = false, wpnMode = 'all' } = {}) {
  if (dedicado || (online && !ECONOMIA_NO_MP)) return false;
  if ((wpnMode || 'all') !== 'all') return false;
  return new URLSearchParams(busca).get('economia') !== '0';
}

// 'rodada': compra no começo da rodada; 'respawn': modo sem rodada, compra a cada renascimento.
export const modoDeCompra = ({ semRodada = false } = {}) => (semRodada ? 'respawn' : 'rodada');

export const novaCarteira = () => ({ saldo: ECONOMIA.saldoInicial });

export function creditar(carteira, valor) {
  const antes = carteira.saldo;
  const v = Number.isFinite(valor) && valor > 0 ? Math.round(valor) : 0;
  carteira.saldo = Math.min(ECONOMIA.teto, antes + v);
  return carteira.saldo - antes;
}

// O `_kill` recebe o rótulo curto ('AK', 'FACA', 'M3'); aceita o id ou o rótulo.
const ID_DO_ROTULO = Object.fromEntries(Object.entries(WEAPONS).map(([id, w]) => [w.short, id]));
ID_DO_ROTULO.FACA = 'knife';

export function recompensaKill(arma, { mesmoTime = false } = {}) {
  if (mesmoTime) return 0;
  const armaId = WEAPONS[arma] ? arma : (ID_DO_ROTULO[arma] || arma);
  const it = itemDaCompra(armaId);
  if (it && it.slot !== 'equipamento' && it.slot !== 'municao') return it.recompensaKill;
  return RECOMPENSA_FORA_DO_CATALOGO[armaId] ?? ECONOMIA.recompensaKillPadrao;
}

// `derrotasSeguidas` já conta a rodada que acabou de ser perdida (1 = primeira derrota).
export function recompensaRodada(resultado, derrotasSeguidas = 1) {
  if (resultado === 'vitoria') return ECONOMIA.vitoria;
  const t = ECONOMIA.derrotaSeguida;
  return t[Math.min(t.length, Math.max(1, derrotasSeguidas | 0)) - 1];
}

export const proximaSequencia = (seq, resultado) => (resultado === 'vitoria' ? 0 : (seq | 0) + 1);

export function precoDe(id, { assinatura = null, equip = null } = {}) {
  const it = itemDaCompra(id);
  if (!it) return null;
  // CS2: o kit cobra só a parte que falta (colete cheio paga o capacete; com capacete, o colete)
  if (id === 'colete-capacete' && equip && equip.colete >= 100 && !equip.capacete) return itemDaCompra('capacete').preco;
  if (id === 'colete-capacete' && equip && equip.capacete && equip.colete < 100) return itemDaCompra('colete').preco;
  if (assinatura !== id) return it.preco;
  return Math.round((it.preco * (1 - ECONOMIA.descontoAssinatura)) / 50) * 50;
}

export function distanciaAoSpawn(pos, spawns) {
  let d = Infinity;
  for (const s of spawns || []) d = Math.min(d, Math.hypot(pos.x - s.x, pos.z - s.z));
  return d;
}

// Equipamento: `equip` = { colete (0-100), capacete, flashes }. Sem `equip` legível não vende.
function recusaDoEquipamento(it, equip) {
  const colete = equip?.colete, flashes = equip?.flashes;
  if (!Number.isFinite(colete) || !Number.isFinite(flashes)) return 'item';
  if (it.id === 'colete') return colete >= 100 ? 'ja-tem' : null;
  if (it.id === 'colete-capacete') return colete >= 100 && equip.capacete ? 'ja-tem' : null;
  if (it.id === 'capacete') return equip.capacete ? 'ja-tem' : (colete > 0 ? null : 'sem-colete');
  if (it.limite) return flashes >= it.limite ? 'limite' : null;
  return null;
}

// Número que não dá para ler (NaN, undefined) recusa: compra nunca passa por omissão.
export function motivoRecusa({
  id, saldo, agora, compraAte, distSpawn, vivo, possui, assinatura = null,
  equip = null, municao = null, desligados = [],
}) {
  const it = itemDaCompra(id);
  if (!it || desligados.includes(it.chave)) return 'item';
  if (vivo !== true) return 'morto';
  if (!(agora <= compraAte)) return 'tempo';
  if (!(distSpawn <= ECONOMIA.raioCompraM)) return 'zona';
  if (it.slot === 'equipamento') {
    const m = recusaDoEquipamento(it, equip);
    if (m) return m;
  } else if (it.slot === 'municao') {
    if (!Number.isFinite(municao?.atual) || !Number.isFinite(municao?.max)) return 'item';
    if (municao.atual >= municao.max) return 'limite';
  } else if ((possui || []).includes(id)) return 'ja-tem';
  if (!(saldo >= precoDe(id, { assinatura, equip }))) return 'saldo';
  return null;
}

// Bot: compra a arma sorteada para ele quando o saldo cobre; sem saldo, segura a pistola (eco).
export function compraDoBot({ saldo, alvo, jaTem = false }) {
  if (jaTem || !itemDaCompra(alvo)) return null;
  return saldo >= precoDe(alvo) ? alvo : null;
}

// Bot já armado gasta a sobra em colete: com 1000 leva o kit, com 650 só o colete. Bot sem a
// arma dele não gasta (guarda para comprá-la), e `desligados` respeita ?armadura=0.
export function equipamentoDoBot({ saldo, armado, colete = 0, capacete = false, desligados = [] }) {
  if (!armado || desligados.includes('armadura')) return null;
  const equip = { colete, capacete };
  if (!(colete >= 100 && capacete) && saldo >= precoDe('colete-capacete', { equip })) return 'colete-capacete';
  if (colete < 100 && saldo >= precoDe('colete')) return 'colete';
  return null;
}

export function comprar(carteira, pedido) {
  const motivo = motivoRecusa({ ...pedido, saldo: carteira.saldo });
  if (motivo) return { ok: false, motivo };
  const preco = precoDe(pedido.id, pedido);
  carteira.saldo -= preco;
  return { ok: true, preco, item: itemDaCompra(pedido.id) };
}
