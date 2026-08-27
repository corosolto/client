/* TRANSPORTE DE REDE. WebSocket puro atrás de uma interface pequena (trocável por
   WebTransport). Daqui só sai INPUT. Nós por região e ping: docs/MULTIPLAYER.md. */

/* NÓS OFICIAIS. Cada um é um processo do servidor numa região. Acrescentar região é
   acrescentar uma linha aqui e subir a VM com o mesmo script de deploy. */
// Registro de nós em nos.js: a página de convite do site lê a MESMA lista.
export { NOS, parseConvite, linkDeConvite, httpDoNo } from './nos.js';
import { NOS } from './nos.js';

// URLs de lobby e jogo a partir do menu/URL: '1' = local, 'host:porta', ou 'wss://...'
export function mpUrls(v) {
  const host = (typeof location !== 'undefined' && location.hostname) || 'localhost';
  if (/^wss?:\/\//.test(v)) {
    const wsBase = v.replace(/\/ws.*$/, '');
    return { http: wsBase.replace(/^ws/, 'http'), ws: wsBase + '/ws' };
  }
  const hp = v === '1' ? `${host}:8787` : v;
  return { http: `http://${hp}`, ws: `ws://${hp}/ws` };
}

const j = async (url, opt) => {
  const r = await fetch(url, { cache: 'no-store', ...opt });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return r.json();
};
export const listRooms = (httpBase) => j(`${httpBase}/rooms`).then((x) => x.rooms || []);
// Uma sala pelo código do convite. 404 vira null: sala que acabou não é erro, é sala que acabou.
export const salaPorConvite = (httpBase, codigo) =>
  j(`${httpBase}/sala/${encodeURIComponent(codigo)}`).then((x) => x.sala).catch(() => null);
export const listMaps = (httpBase) => j(`${httpBase}/maps`).then((x) => x.maps || []);
export const health = (httpBase) => j(`${httpBase}/health`);
export const createRoom = (httpBase, cfg) => j(`${httpBase}/rooms`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cfg),
});

/* Sonda TODOS os nós em paralelo e devolve cada um com ping e lotação. É a coluna de ping do
   server browser — sem ela o jogador não tem como saber que o nó da Europa é o dele. Nó que
   não responde volta com ping null e NÃO some da lista: sumir esconde a queda do servidor. */
export async function sondarNos(nos = NOS, timeoutMs = 2500) {
  return Promise.all(nos.map(async (no) => {
    const { http } = mpUrls(no.url);
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const h = await j(`${http}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      return { ...no, http, ping: Math.round(performance.now() - t0), online: true, jogadores: h.players | 0, salas: h.rooms | 0 };
    } catch {
      return { ...no, http, ping: null, online: false, jogadores: 0, salas: 0 };
    }
  }));
}

export class NetClient {
  constructor(url, { nome = null, room = null, codigo = null, pw = '', team = 'auto' } = {}) {
    const qs = new URLSearchParams({ team, ...(codigo ? { codigo } : room ? { room } : {}), ...(pw ? { pw } : {}), ...(nome ? { nome } : {}) });
    this.url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
    this.ws = null;
    this.connected = false;
    this.yourEnt = null;     // id do combatente que ESTE cliente controla (null = espectador)
    this.yourTeam = null;
    this.espectador = true;
    // welcome (meta) + os dois últimos snapshots, que é o que a interpolação consome.
    this.meta = null;
    this.snap = null;
    this.prev = null;
    this.seq = 0;
    this.onWelcome = null; this.onSnapshot = null; this.onSlot = null; this.onClose = null;
    // ── diagnóstico de rede (overlay do jogo) ──
    this.stats = { hz: 0, kbps: 0, gapMax: 0, sinceLast: 0, ents: 0, tick: 0, ping: 0, snaps: 0, bytes: 0 };
    this._snapT = []; this._byteT = []; this._lastSnapT = 0;
    this._pingTimer = null;
  }

  computeStats() {
    const now = performance.now(), cut = now - 1000;
    while (this._snapT.length && this._snapT[0] < cut) this._snapT.shift();
    while (this._byteT.length && this._byteT[0].t < cut) this._byteT.shift();
    this.stats.hz = this._snapT.length;
    this.stats.kbps = this._byteT.reduce((s, x) => s + x.b, 0) / 1024;
    this.stats.sinceLast = this._lastSnapT ? now - this._lastSnapT : 0;
    return this.stats;
  }

  /* RTT medido no PRÓPRIO canal do jogo (ping/pong pelo WS). O módulo antigo media por
     `fetch /health`: outra conexão, outro caminho, sem a fila do WebSocket — dava um número
     bonito e errado, justamente quando o socket estava congestionado (que é quando importa). */
  startPing(intervalMs = 1500) {
    if (this._pingTimer) return;
    const bate = () => { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'ping', t: performance.now() })); };
    bate();
    this._pingTimer = setInterval(bate, intervalMs);
  }
  stopPing() { if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; } }

  connect() {
    return new Promise((resolve, reject) => {
      let done = false;
      try { this.ws = new WebSocket(this.url); } catch (e) { reject(e); return; }
      this.ws.onopen = () => { this.connected = true; };
      this.ws.onerror = () => { if (!done) { done = true; reject(new Error('ws_error')); } };
      this.ws.onclose = () => { this.connected = false; this.onClose?.(); if (!done) { done = true; reject(new Error('closed')); } };
      this.ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === 'welcome') {
          this.meta = m; this.yourEnt = m.yourEnt; this.yourTeam = m.yourTeam; this.espectador = !!m.espectador;
          this.onWelcome?.(m);
          if (!done) { done = true; resolve(m); }
        } else if (m.type === 'error') {
          if (!done) { done = true; reject(new Error(m.error || 'erro')); }
        } else if (m.type === 'pong') {
          this.stats.ping = performance.now() - m.t;
        } else if (m.type === 'slot') {
          // entrou em campo / virou espectador (o servidor confirma; a UI nunca decide sozinha)
          this.yourEnt = m.yourEnt; this.yourTeam = m.yourTeam; this.espectador = !!m.espectador;
          this.onSlot?.(m);
        } else if (m.type === 'snapshot') {
          this.prev = this.snap; this.snap = m;
          const now = performance.now(), bytes = (ev.data && ev.data.length) || 0;
          this.stats.tick = m.tick | 0; this.stats.ents = (m.ents && m.ents.length) || 0;
          if (this._lastSnapT) { const gap = now - this._lastSnapT; this.stats.gapMax = Math.max(gap, this.stats.gapMax * 0.92); }
          this._lastSnapT = now;
          this._snapT.push(now); this._byteT.push({ t: now, b: bytes });
          this.stats.snaps++; this.stats.bytes += bytes;
          this.onSnapshot?.(m);
        }
      };
    });
  }

  // input compacto — o servidor sanitiza tudo de novo (cliente = território inimigo).
  sendInput(inp) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'input', seq: ++this.seq, ...inp }));
  }
  // pedir vaga num time ('E' | 'B' | 'auto'); o servidor responde com `slot`.
  pedirTime(team = 'auto') { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'time', team })); }
  // sair de campo e assistir: o corpo volta a ser bot e a partida segue cheia.
  espectar() { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'espectar' })); }

  close() { this.stopPing(); try { this.ws?.close(); } catch { /* já fechado */ } }
}
