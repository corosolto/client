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
