// TRETA$ da partida dentro do Game: carteira, recompensas, menu de compra (B) e HUD.
// Regras em economia-partida.js; nada aqui lê ou escreve a carteira do menu.
import { WEAPONS } from './data/weapons.js';
import { charWeapon } from './characters.js';
import { GRUPOS_COMPRA, itensDoGrupo, itemDaCompra } from './compra-catalogo.js';
import {
  ECONOMIA, novaCarteira, creditar, recompensaKill, recompensaRodada, proximaSequencia,
  precoDe, distanciaAoSpawn, comprar, compraDoBot, equipamentoDoBot, motivoRecusa,
} from './economia-partida.js';
import { frase, tr } from './i18n.js';

const fmt = (v) => String(Math.max(0, v | 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const GANHO_MS = 1600;
/* Moeda TRETA$ (relato do dono, 31/10: valor com a moedinha perto das armas). Mesma
   arte Saci que a loja usa (tp/loja.js). */
const COIN = '/img/treta/coin-classic-saci.webp';
const MOEDA_IMG = (cls) => `<img class="${cls}" src="${COIN}" alt="" aria-hidden="true" draggable="false">`;

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
    for (const b of game.bots) b.carteira = novaCarteira();
    // com loja, colete e flash são comprados: ninguém nasce com eles
    for (const c of [game.player, ...game.bots]) { c.armor = 0; c.helmet = false; }
    game.player.flashes = 0;
    this._montarDom();
  }

  get carteira() { return this.game.player.carteira; }
  // Kill-switch tira o item da loja: ?armadura=0 (ou partida sem colete) e ?flash=0.
  desligados() {
    const g = this.game, d = [];
    if (!g._armaduraLigada?.()) d.push('armadura');
    if (!g._flashLiberada?.()) d.push('flash');
    return d;
  }
  equipDe(c) { return { colete: +c.armor || 0, capacete: !!c.helmet, flashes: c.flashes | 0 }; }
  // Grupo sem item (equipamento com os dois kill-switches) some do menu.
  grupos() { const d = this.desligados(); return GRUPOS_COMPRA.filter((g) => itensDoGrupo(g.id, { desligados: d }).length); }
  assinatura() { return charWeapon(this.game.playerCharId); }

  _montarDom() {
    const hud = this.game.el?.hud;
    // o #hud sobrevive à partida: sem limpar, a revanche empilharia um segundo saldo
    for (const id of ['hud-treta', 'compra-menu']) document.getElementById(id)?.remove?.();
    this.elSaldo = document.createElement('div');
    this.elSaldo.id = 'hud-treta';
    this.elSaldo.innerHTML = `${MOEDA_IMG('ht-coin')}<b>0</b><em class="ht-ganho"></em><small class="ht-dica"></small>`;
    hud?.appendChild?.(this.elSaldo);
    this.elMenu = document.createElement('div');
    this.elMenu.id = 'compra-menu';
    this.elMenu.className = 'hidden';
    this.elMenu.addEventListener('click', (e) => { if (e.target === this.elMenu) this.fechar(); });
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

  limiteMunicao(id) {
    const reserva = WEAPONS[id]?.reserve;
    return Number.isFinite(reserva) ? reserva * 2 : 0;
  }

  municaoDe(armaSlot, c = this.game.player) {
    const id = c?.[armaSlot];
    const atual = id ? c.ammo?.[id]?.res : null;
    const max = id ? this.limiteMunicao(id) : null;
    return { id, atual, max };
  }

  comprarMunicao(armaSlot) {
    return this.comprar(armaSlot === 'primary' ? 'municao-primaria' : 'municao-secundaria');
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
  tecla(code, repete = false) {
    if (!this.aberto) return false;
    if (code === 'Escape' || code === 'KeyB') { this.fechar(); return true; }
    const n = /^(?:Digit|Numpad)(\d)$/.exec(code);
    if (!n) return false;
    if (!repete) this._escolher(+n[1]);   // segurar o 4 não pode virar compra do item 4
    return true;
  }

  _escolher(n) {
    if (n === 0) { if (this.grupo) { this.grupo = null; this._render(); } else this.fechar(); return; }
    if (!this.grupo) {
      const g = this.grupos()[n - 1];
      if (g) { this.grupo = g.id; this.aviso = ''; this._render(); this.game.sfx?.uiClick?.(); }
      return;
    }
    const it = itensDoGrupo(this.grupo, { desligados: this.desligados() })[n - 1];
    if (it) this.comprar(it.id);
  }

  comprar(id) {
    const g = this.game, p = g.player, item = itemDaCompra(id);
    const estadoMunicao = item?.slot === 'municao' ? this.municaoDe(item.armaSlot, p) : null;
    const r = comprar(this.carteira, {
      id, agora: g.time, compraAte: this.compraAte, distSpawn: this.distSpawn(), vivo: p.alive,
      possui: [p.primary, p.secondary].filter(Boolean), assinatura: this.assinatura(),
      equip: this.equipDe(p), municao: estadoMunicao, desligados: this.desligados(),
    });
    if (!r.ok) {
      this.aviso = frase('compraRecusa', r.motivo);
      if (this.aberto) this._render();
      return r;
    }
    if (r.item.slot === 'equipamento') {
      this._vestir(p, id);
      // menu fica aberto, como no CS: dá para levar colete e as duas flashes de uma vez
      this.aviso = '';
      if (this.aberto) this._render();
      return r;
    }
    if (r.item.slot === 'municao') {
      const armaId = estadoMunicao.id, ammo = p.ammo[armaId], w = WEAPONS[armaId];
      ammo.res = Math.min(estadoMunicao.max, ammo.res + w.mag);
      this.aviso = '';
      if (this.aberto) this._render();
      this.game._updateWeaponHud?.();
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

  // Entrega o equipamento: o estado é o mesmo que armadura.js (#1159) e a flash (#1163) leem.
  _vestir(c, id) {
    if (id === 'colete' || id === 'colete-capacete') c.armor = 100;
    if (id === 'capacete' || id === 'colete-capacete') c.helmet = true;
    if (id === 'flash') {
      c.flashes = (c.flashes | 0) + 1;
      if (c === this.game.player) { this.game._carregarFlashMint?.(); this.game._updateSmokeHud?.(); this.game._updateWeaponHud?.(); }
    }
  }

  aoAbate(vitima, autor, weap) {
    vitima._desarmado = true;
    // morreu, perdeu (CS): colete, capacete e flash não sobrevivem à morte
    vitima.armor = 0; vitima.helmet = false;
    if (vitima.flashes) {
      vitima.flashes = 0;
      if (vitima === this.game.player) this.game._updateSmokeHud?.();   // senão o "⚡ 2" fica na tela até a rodada nova
    }
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
        if (c === this.game.player && v) this._ganho(`+${fmt(v)}`, { moeda: res === 'vitoria' });
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

  // Começo de rodada: bot morto volta de pistola; quem tem saldo compra a arma dele.
  botsCompram() {
    for (const b of this.game.bots) {
      if (b._remote) continue;
      // morto que vai comprar remonta a malha uma vez só (pistola e já a comprada custaria dois clones)
      this._rearmarBot(b, false);
      this._botCompra(b);
      if (b._meshWeapon !== b.weapon) this._armarBot(b, b.weapon);
    }
  }

  aoRenascerBot(b) {
    if (b._remote) return;
    this._rearmarBot(b);
    /* A janela de compra reabre pra QUEM RENASCE no meio da rodada (relato do dono,
       31/10) — o bot rearma com a mesma regra do jogador, senão só um lado volta
       armado depois da morte. */
    this._botCompra(b);
  }

  _rearmarBot(b, malha = true) {
    if (!b._desarmado) return;
    b._desarmado = false;
    if (malha) this._armarBot(b, 'pistol'); else b.weapon = 'pistol';
  }

  _botCompra(b) {
    // primária pega do chão também conta: o bot não paga para trocar uma AWP grátis por escopeta
    const temPrimaria = b.weapon !== 'pistol' && itemDaCompra(b.weapon)?.slot !== 'secundaria';
    const id = compraDoBot({ saldo: b.carteira.saldo, alvo: b._armaAlvo, jaTem: b.weapon === b._armaAlvo || temPrimaria });
    if (id) {
      b.carteira.saldo -= precoDe(id);
      this._armarBot(b, id);
    }
    // sobra vira colete só para quem já está com a arma dele (ou não tem o que comprar)
    const armado = b.weapon === b._armaAlvo || temPrimaria || !itemDaCompra(b._armaAlvo);
    const eq = equipamentoDoBot({ saldo: b.carteira.saldo, armado, colete: +b.armor || 0, capacete: !!b.helmet, desligados: this.desligados() });
    if (!eq) return;
    b.carteira.saldo -= precoDe(eq, { equip: this.equipDe(b) });
    this._vestir(b, eq);
  }

  _armarBot(b, w) {
    if (b.weapon !== w || b._meshWeapon !== w) this.game._syncRemoteWeapon(b, w);
    b.mag = WEAPONS[w]?.mag || 0;
    b.reloadUntil = 0;
  }

  _ganho(txt, { moeda = false } = {}) {
    const em = this.elSaldo?.querySelector?.('.ht-ganho');
    if (!em) return;
    em.textContent = txt;
    em.classList?.add('on');
    clearTimeout(this._ganhoT);
    this._ganhoT = setTimeout(() => em.classList?.remove('on'), GANHO_MS);
    if (!moeda) return;
    /* MOEDA VIRANDO (relato do dono, 31/10): ao ganhar a rodada a moeda dá uma volta
       (CSS 3D, sem JS por frame) e toca o som de moeda. */
    this.elSaldo?.querySelector?.('.ht-moeda-anim')?.remove?.();
    const img = document.createElement('img');
    img.src = COIN; img.alt = ''; img.className = 'ht-moeda-anim';
    img.setAttribute('aria-hidden', 'true');
    this.elSaldo?.appendChild?.(img);
    setTimeout(() => img.remove?.(), 1300);
    this.game.sfx?.moeda?.();
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

  _linhaEquip(it, i, saldo, equip) {
    const preco = precoDe(it.id, { equip });
    const g = this.game;
    const recusa = motivoRecusa({ id: it.id, saldo, agora: g.time, compraAte: this.compraAte, distSpawn: this.distSpawn(), vivo: g.player.alive, equip });
    const qtd = it.limite ? ` <small>${equip.flashes}/${it.limite}</small>` : '';
    return `<button type="button" class="cm-linha cm-item cm-equip${recusa ? ' off' : ''}" data-n="${i + 1}"><i>${i + 1}</i>`
      + `<img src="${it.icone}" alt="" draggable="false">`
      + `<span>${tr(it.rotulo)}${qtd}</span><b>${MOEDA_IMG('cm-moeda')}${fmt(preco)}</b></button>`;
  }

  _linhaMunicao(it, i, saldo) {
    const municao = this.municaoDe(it.armaSlot);
    const g = this.game, arma = municao.id && WEAPONS[municao.id];
    const recusa = motivoRecusa({
      id: it.id, saldo, agora: g.time, compraAte: this.compraAte,
      distSpawn: this.distSpawn(), vivo: g.player.alive, municao,
    });
    const qtd = arma ? `<small>${municao.atual}/${municao.max}</small>` : '';
    return `<button type="button" class="cm-linha cm-item cm-municao${recusa ? ' off' : ''}" data-n="${i + 1}"><i>${i + 1}</i>`
      + `<img src="${it.icone}" alt="" draggable="false">`
      + `<span>${tr(it.rotulo)}${arma ? ` · ${arma.short}` : ''} ${qtd}</span><b>${MOEDA_IMG('cm-moeda')}${fmt(it.preco)}</b></button>`;
  }

  _render() {
    const m = this.elMenu;
    if (!m) return;
    if (!this.aberto) { m.classList.add('hidden'); return; }
    const saldo = this.carteira.saldo, p = this.game.player, assin = this.assinatura();
    const cab = `<div class="cm-cabeca"><span>${frase('compraTitulo')}</span><b>${MOEDA_IMG('cm-moeda')}TRETA$ ${fmt(saldo)}</b></div>`;
    let corpo;
    if (!this.grupo) {
      corpo = this.grupos().map((g, i) =>
        `<button type="button" class="cm-linha" data-n="${i + 1}"><i>${i + 1}</i><img src="${g.icone}" alt="" draggable="false"><span>${tr(g.rotulo)}</span></button>`).join('');
    } else {
      const desl = this.desligados(), equip = this.equipDe(p);
      corpo = itensDoGrupo(this.grupo, { desligados: desl }).map((it, i) => {
        if (it.slot === 'equipamento') return this._linhaEquip(it, i, saldo, equip);
        if (it.slot === 'municao') return this._linhaMunicao(it, i, saldo);
        const preco = precoDe(it.id, { assinatura: assin });
        const tem = p.primary === it.id || p.secondary === it.id;
        const sem = saldo < preco;
        const destaque = it.id === assin;
        const cls = `cm-linha cm-item${sem || tem ? ' off' : ''}${destaque ? ' assinatura' : ''}`;
        const cheio = destaque && preco !== it.preco ? `<s>${fmt(it.preco)}</s>` : '';
        return `<button type="button" class="${cls}" data-n="${i + 1}"><i>${i + 1}</i>`
          + `<img src="/img/weapons/${it.id}.webp" alt="" draggable="false">`
          + `<span>${WEAPONS[it.id].short}${destaque ? ` <em>${frase('compraSuaArma')}</em>` : ''}</span>`
          + `<b>${cheio}${MOEDA_IMG('cm-moeda')}${fmt(preco)}</b></button>`;
      }).join('');
    }
    const pe = `<div class="cm-pe">${this.aviso ? `<span class="cm-aviso">${this.aviso}</span>` : ''}`
      + `<button type="button" class="cm-linha cm-voltar" data-n="0"><i>0</i><span>${frase(this.grupo ? 'compraVoltar' : 'compraFechar')}</span></button></div>`;
    m.innerHTML = `<div class="cm-painel">${cab}<div class="cm-corpo">${corpo}</div>${pe}</div>`;
    m.classList.remove('hidden');
    for (const b of m.querySelectorAll?.('button[data-n]') || []) b.onclick = () => this._escolher(+b.dataset.n);
  }
}
