// Regras do TRETA$ da partida: vale só naquela partida e nunca toca a carteira do menu
// (treta-store.js). Funções puras; o porquê de cada número em docs/ECONOMIA-PARTIDA.md.
import { itemDaCompra, RECOMPENSA_FORA_DO_CATALOGO } from './compra-catalogo.js';

export const ECONOMIA = Object.freeze({
  saldoInicial: 800,
  teto: 16000,
  tempoCompraS: 20,
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

export function recompensaKill(armaId, { mesmoTime = false } = {}) {
  if (mesmoTime) return 0;
  const it = itemDaCompra(armaId);
  if (it) return it.recompensaKill;
  return RECOMPENSA_FORA_DO_CATALOGO[armaId] ?? ECONOMIA.recompensaKillPadrao;
}

// `derrotasSeguidas` já conta a rodada que acabou de ser perdida (1 = primeira derrota).
export function recompensaRodada(resultado, derrotasSeguidas = 1) {
  if (resultado === 'vitoria') return ECONOMIA.vitoria;
  const t = ECONOMIA.derrotaSeguida;
  return t[Math.min(t.length, Math.max(1, derrotasSeguidas | 0)) - 1];
}

export const proximaSequencia = (seq, resultado) => (resultado === 'vitoria' ? 0 : (seq | 0) + 1);

export function precoDe(id, { assinatura = null } = {}) {
  const it = itemDaCompra(id);
  if (!it) return null;
  if (assinatura !== id) return it.preco;
  return Math.round((it.preco * (1 - ECONOMIA.descontoAssinatura)) / 50) * 50;
}

export function distanciaAoSpawn(pos, spawns) {
  let d = Infinity;
  for (const s of spawns || []) d = Math.min(d, Math.hypot(pos.x - s.x, pos.z - s.z));
  return d;
}

// Número que não dá para ler (NaN, undefined) recusa: compra nunca passa por omissão.
export function motivoRecusa({ id, saldo, agora, compraAte, distSpawn, vivo = true, possui = [], assinatura = null }) {
  if (!itemDaCompra(id)) return 'item';
  if (!vivo) return 'morto';
  if (!(agora <= compraAte)) return 'tempo';
  if (!(distSpawn <= ECONOMIA.raioCompraM)) return 'zona';
  if (possui.includes(id)) return 'ja-tem';
  if (!(saldo >= precoDe(id, { assinatura }))) return 'saldo';
  return null;
}

export function comprar(carteira, pedido) {
  const motivo = motivoRecusa({ ...pedido, saldo: carteira.saldo });
  if (motivo) return { ok: false, motivo };
  const preco = precoDe(pedido.id, pedido);
  carteira.saldo -= preco;
  return { ok: true, preco, item: itemDaCompra(pedido.id) };
}
