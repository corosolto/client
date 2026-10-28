// TRETA$ da partida dentro do Game: carteira, recompensas, menu de compra (B) e HUD.
// Regras em economia-partida.js; nada aqui lê ou escreve a carteira do menu.
import { WEAPONS } from './data/weapons.js';
import { charWeapon } from './characters.js';
import { GRUPOS_COMPRA, itensDoGrupo } from './compra-catalogo.js';
import {
  ECONOMIA, novaCarteira, creditar, recompensaKill, recompensaRodada, proximaSequencia,
  precoDe, distanciaAoSpawn, comprar,
} from './economia-partida.js';
import { frase, tr } from './i18n.js';

const fmt = (v) => String(Math.max(0, v | 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const GANHO_MS = 1600;

export class CompraPartida {
  constructor(game) {
    this.game = game;
    this.compraAte = -Infinity;
    this.seqDerrotas = { E: 0, B: 0 };
    this.aberto = false;
    this.grupo = null;
    this.aviso = '';
    this._hudTxt = '';
    game.player.carteira = novaCarteira();
    this._montarDom();
  }

  get carteira() { return this.game.player.carteira; }
  assinatura() { return charWeapon(this.game.playerCharId); }

  _montarDom() {
    const hud = this.game.el?.hud;
    const base = document.getElementById('hud-bottom-left');
    // o #hud sobrevive à partida: sem limpar, a revanche empilharia um segundo saldo
    for (const id of ['hud-treta', 'compra-menu']) document.getElementById(id)?.remove?.();
    this.elSaldo = document.createElement('div');
    this.elSaldo.id = 'hud-treta';
    this.elSaldo.innerHTML = '<span class="ht-moeda">TRETA$</span><b>0</b><em class="ht-ganho"></em><small class="ht-dica"></small>';
    if (base?.prepend) base.prepend(this.elSaldo); else hud?.appendChild?.(this.elSaldo);
    this.elMenu = document.createElement('div');
    this.elMenu.id = 'compra-menu';
    this.elMenu.className = 'hidden';
    // no body e não no #hud: o z-index 20 do #hud prende o menu atrás do #touch-ui (30)
    document.body?.appendChild?.(this.elMenu);
  }

  descartar() {
    this.elSaldo?.remove?.();
    this.elMenu?.remove?.();
    this._btnToque?.remove?.();
  }

  // Modo sem rodada (arena) abre a janela a cada renascimento; o de rodada só no começo.
  abrirJanela(extraS = 0) { this.compraAte = this.game.time + extraS + ECONOMIA.tempoCompraS; }

  distSpawn() {
    const p = this.game.player;
    return distanciaAoSpawn(p.pos, this.game.world?.spawns?.[p.team]);
  }

  podeComprar() {
    const g = this.game, p = g.player;
    return p.alive && (g.state === 'live' || g.state === 'countdown')
      && g.time <= this.compraAte && this.distSpawn() <= ECONOMIA.raioCompraM;
  }

  alternar() {
    if (this.aberto) { this.fechar(); return; }
    if (!this.podeComprar()) return;
    this.aberto = true; this.grupo = null; this.aviso = '';
    this._render();
    this.game.sfx?.uiClick?.();
  }

  fechar() {
    this.aberto = false; this.grupo = null;
    this.elMenu?.classList?.add('hidden');
  }

  // Teclado no menu aberto: 1-9 escolhem, 0 volta/fecha. Devolve true se consumiu a tecla.
  tecla(code) {
    if (!this.aberto) return false;
    if (code === 'Escape' || code === 'KeyB') { this.fechar(); return true; }
    const n = /^(?:Digit|Numpad)(\d)$/.exec(code);
    if (!n) return false;
    this._escolher(+n[1]);
    return true;
  }

  _escolher(n) {
    if (n === 0) { if (this.grupo) { this.grupo = null; this._render(); } else this.fechar(); return; }
    if (!this.grupo) {
      const g = GRUPOS_COMPRA[n - 1];
      if (g) { this.grupo = g.id; this.aviso = ''; this._render(); this.game.sfx?.uiClick?.(); }
      return;
    }
    const it = itensDoGrupo(this.grupo)[n - 1];
    if (it) this.comprar(it.id);
  }

  comprar(id) {
    const g = this.game, p = g.player;
    const r = comprar(this.carteira, {
      id, agora: g.time, compraAte: this.compraAte, distSpawn: this.distSpawn(), vivo: p.alive,
      possui: [p.primary, p.secondary].filter(Boolean), assinatura: this.assinatura(),
    });
    if (!r.ok) {
      this.aviso = frase('compraRecusa', r.motivo);
      if (this.aberto) this._render();
      return r;
    }
    const antiga = r.item.slot === 'primaria' ? p.primary : (p.secondary !== 'pistol' ? p.secondary : null);
    if (antiga && antiga !== id) g._largarArma(p, antiga);
    p.ammo[id] = { mag: WEAPONS[id].mag, res: WEAPONS[id].reserve };
    g._switchWeapon(id, { pickup: true });
    this.aviso = '';
    this.fechar();
    return r;
  }

  aoAbate(vitima, autor, weap) {
    if (vitima === this.game.player) vitima._desarmado = true;
    if (!autor?.carteira || autor === vitima) return;
    const arma = weap === 'FRAG' ? 'frag' : weap === 'FACA' ? 'knife' : autor.weapon;
    const v = creditar(autor.carteira, recompensaKill(arma, { mesmoTime: autor.team === vitima.team }));
    if (autor === this.game.player && v) this._ganho(`+${fmt(v)}`);
  }

  aoFimDaRodada(vencedor) {
    for (const t of ['E', 'B']) {
      const res = t === vencedor ? 'vitoria' : 'derrota';
      this.seqDerrotas[t] = proximaSequencia(this.seqDerrotas[t], res);
      const valor = recompensaRodada(res, this.seqDerrotas[t]);
      for (const c of this.game.combatants) {
        if (c.team !== t || !c.carteira) continue;
        const v = creditar(c.carteira, valor);
        if (c === this.game.player && v) this._ganho(`+${fmt(v)}`);
      }
    }
  }

  // Morreu: perde o que comprou (CS). Volta com faca e pistola.
  rearmar(p) {
    if (!p._desarmado) return;
    p._desarmado = false;
    p.primary = null;
    p.secondary = 'pistol';
  }

  _ganho(txt) {
    const em = this.elSaldo?.querySelector?.('.ht-ganho');
    if (!em) return;
    em.textContent = txt;
    em.classList?.add('on');
    clearTimeout(this._ganhoT);
    this._ganhoT = setTimeout(() => em.classList?.remove('on'), GANHO_MS);
  }

  tick() {
    const pode = this.podeComprar();
    if (this.aberto && !pode) this.fechar();
    const resta = Math.max(0, Math.ceil(this.compraAte - this.game.time));
    const dica = pode ? frase('compraDica', this.game.mobile, resta) : '';
    const txt = `${this.carteira.saldo}|${dica}`;
    if (txt !== this._hudTxt) {
      this._hudTxt = txt;
      const b = this.elSaldo?.querySelector?.('b'), sm = this.elSaldo?.querySelector?.('.ht-dica');
      if (b) b.textContent = fmt(this.carteira.saldo);
      if (sm) sm.textContent = dica;
      if (this.aberto) this._render();
    }
    this._toque(pode);
  }

  _toque(pode) {
    const root = this.game._touchUi;
    if (!root) return;
    if (!this._btnToque) {
      const b = document.createElement('button');
      b.className = 'touch-btn touch-compra hidden';
      b.setAttribute('aria-label', tr('Comprar'));
      b.textContent = '$';
      b.addEventListener('touchstart', (e) => { e.preventDefault(); this.alternar(); }, { passive: false });
      root.appendChild(b);
      this._btnToque = b;
    }
    this._btnToque.classList.toggle('hidden', !pode);
  }

  _render() {
    const m = this.elMenu;
    if (!m) return;
    if (!this.aberto) { m.classList.add('hidden'); return; }
    const saldo = this.carteira.saldo, p = this.game.player, assin = this.assinatura();
    const cab = `<div class="cm-cabeca"><span>${frase('compraTitulo')}</span><b>TRETA$ ${fmt(saldo)}</b></div>`;
    let corpo;
    if (!this.grupo) {
      corpo = GRUPOS_COMPRA.map((g, i) =>
        `<button type="button" class="cm-linha" data-n="${i + 1}"><i>${i + 1}</i><span>${tr(g.rotulo)}</span></button>`).join('');
    } else {
      corpo = itensDoGrupo(this.grupo).map((it, i) => {
        const preco = precoDe(it.id, { assinatura: assin });
        const tem = p.primary === it.id || p.secondary === it.id;
        const sem = saldo < preco;
        const destaque = it.id === assin;
        const cls = `cm-linha cm-item${sem || tem ? ' off' : ''}${destaque ? ' assinatura' : ''}`;
        const cheio = destaque && preco !== it.preco ? `<s>${fmt(it.preco)}</s>` : '';
        return `<button type="button" class="${cls}" data-n="${i + 1}"><i>${i + 1}</i>`
          + `<img src="/img/weapons/${it.id}.webp" alt="" draggable="false">`
          + `<span>${WEAPONS[it.id].short}${destaque ? ` <em>${frase('compraSuaArma')}</em>` : ''}</span>`
          + `<b>${cheio}${fmt(preco)}</b></button>`;
      }).join('');
    }
    const pe = `<div class="cm-pe">${this.aviso ? `<span class="cm-aviso">${this.aviso}</span>` : ''}`
      + `<button type="button" class="cm-linha cm-voltar" data-n="0"><i>0</i><span>${frase(this.grupo ? 'compraVoltar' : 'compraFechar')}</span></button></div>`;
    m.innerHTML = cab + corpo + pe;
    m.classList.remove('hidden');
    for (const b of m.querySelectorAll?.('button[data-n]') || []) b.onclick = () => this._escolher(+b.dataset.n);
  }
}
