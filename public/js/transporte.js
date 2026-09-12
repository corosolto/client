// Transporte da sessão de jogo atrás de uma interface pequena. O cabeçalho do net.js promete
// isso desde sempre; até 12/09 ele falava `this.ws` direto em nove pontos. Ver docs/TRANSPORTE.md.
import { MAX_SNAPSHOT_BYTES, SNAPSHOT_PROTOCOLS } from './netcodec.js';

export class TransporteWS {
  constructor(url) { this.url = url; this.ws = null; }

  // `manipuladores` = { aberto, mensagem, erro, fechado }. Quem decide o que fazer é o NetClient.
  abrir(manipuladores) {
    const h = manipuladores || {};
    this.ws = new WebSocket(this.url, SNAPSHOT_PROTOCOLS);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => h.aberto?.();
    this.ws.onerror = () => h.erro?.(new Error('ws_error'));
    this.ws.onclose = () => h.fechado?.();
    this.ws.onmessage = (ev) => {
      const binario = typeof ev.data !== 'string';
      const bytes = binario ? (ev.data?.byteLength ?? ev.data?.size ?? 0) : ev.data.length;
      // o teto é cobrado ANTES de alocar ou decodificar: frame hostil não vira memória
      if (binario && bytes > MAX_SNAPSHOT_BYTES) { this.fechar(1009, 'snapshot_too_large'); return; }
      h.mensagem?.(ev.data, binario, bytes);
    };
    return this.ws;
  }

  get pronto() { return !!this.ws && this.ws.readyState === 1; }
  get protocolo() { return (this.ws && this.ws.protocol) || ''; }
  // datagrama não existe em WebSocket: aqui o "não confiável" é o confiável mesmo. É este
  // método que o transporte de QUIC troca — e é por isso que ele existe já.
  enviarInseguro(dados) { return this.enviar(dados); }
  enviar(dados) { if (this.pronto) { this.ws.send(dados); return true; } return false; }
  fechar(codigo = 1000, motivo = '') { try { this.ws?.close(codigo, motivo); } catch { /* já fechado */ } }
}

/* WebTransport: mesma interface, outro cano. O gateway (backend/wt) termina o QUIC e fala
   WebSocket com a sala, então a sala não sabe que este caminho existe. Ver docs/TRANSPORTE.md. */
const TEXTO = 0, BINARIO = 1;

export class TransporteWT {
  constructor(url, { hashes = null } = {}) {
    this.url = url; this.hashes = hashes; this.wt = null; this._pronto = false;
    // o subprotocolo viaja na query (`sp`), porque aqui não há handshake para negociá-lo
    try { this._sp = new URL(url, 'https://x').searchParams.get('sp') || ''; } catch { this._sp = ''; }
  }

  abrir(manipuladores) {
    const h = manipuladores || {};
    const opcoes = this.hashes ? { serverCertificateHashes: this.hashes } : {};
    this.wt = new WebTransport(this.url, opcoes);
    this._escritor = null;
    this.wt.closed.then(() => { this._pronto = false; h.fechado?.(); },
      () => { this._pronto = false; h.fechado?.(); });
    this.wt.ready.then(async () => {
      // o gateway ABRE o stream confiável; o cliente aceita. Um só, e é o contrato.
      const leitor = this.wt.incomingBidirectionalStreams.getReader();
      const { value: stream } = await leitor.read();
      if (!stream) throw new Error('sem stream');
      this._escritor = stream.writable.getWriter();
      this._pronto = true;
      h.aberto?.();
      this._lerStream(stream.readable.getReader(), h);
      this._lerDatagramas(h);
    }).catch((e) => h.erro?.(e instanceof Error ? e : new Error('wt_error')));
    return this.wt;
  }

  // quadros prefixados por 4 bytes: stream é fluxo de bytes, e sem prefixo não há quadro
  async _lerStream(r, h) {
    let buf = new Uint8Array(0);
    for (;;) {
      const { value, done } = await r.read().catch(() => ({ done: true }));
      if (done) return;
      const junto = new Uint8Array(buf.length + value.length);
      junto.set(buf); junto.set(value, buf.length); buf = junto;
      for (;;) {
        if (buf.length < 4) break;
        const n = new DataView(buf.buffer, buf.byteOffset, 4).getUint32(0);
        if (n > MAX_SNAPSHOT_BYTES || buf.length < 4 + n) break;
        this._entrega(buf.subarray(4, 4 + n), h);
        buf = buf.subarray(4 + n);
      }
    }
  }

  async _lerDatagramas(h) {
    const r = this.wt.datagrams.readable.getReader();
    for (;;) {
      const { value, done } = await r.read().catch(() => ({ done: true }));
      if (done) return;
      if (value && value.length <= MAX_SNAPSHOT_BYTES) this._entrega(value, h);
    }
  }

  // primeiro byte diz se é texto ou binário — o WebSocket distinguia, o WebTransport não
  _entrega(quadro, h) {
    const corpo = quadro.subarray(1);
    if (quadro[0] === TEXTO) h.mensagem?.(new TextDecoder().decode(corpo), false, corpo.length);
    else h.mensagem?.(corpo.slice().buffer, true, corpo.length);
  }

  // mesma forma do TransporteWS: quem consome não pode saber qual dos dois está no cano
  get pronto() { return this._pronto && !!this._escritor; }
  get protocolo() { return this._sp || ''; }
  enviar(dados) {
    if (!this.pronto) return false;
    const b = typeof dados === 'string' ? new TextEncoder().encode(dados) : new Uint8Array(dados);
    const q = new Uint8Array(4 + b.length);
    new DataView(q.buffer).setUint32(0, b.length);
    q.set(b, 4);
    this._escritor.write(q).catch(() => {});
    return true;
  }
  // input tolera perda: é o que justifica o datagrama existir
  enviarInseguro(dados) {
    if (!this._pronto) return false;
    const b = typeof dados === 'string' ? new TextEncoder().encode(dados) : new Uint8Array(dados);
    if (b.length > 1100) return this.enviar(dados);
    const w = this.wt.datagrams.writable.getWriter();
    w.write(b).catch(() => {}).finally(() => w.releaseLock());
    return true;
  }
  fechar(codigo = 0, motivo = '') { try { this.wt?.close({ closeCode: codigo, reason: motivo }); } catch { /* já fechado */ } }
}
