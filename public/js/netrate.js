// Medidor de taxa de rede por relógio DO SERVIDOR (BUG-160 / #1122).
// Motivo, aritmética do defeito e provas: tools/eval/net-rate-check.mjs.

/** Janela de medida. 1 s é o que o painel de rede sempre leu. */
export const JANELA_MS = 1000;
/* Piso da duração usada no divisor. Nos primeiros milissegundos da sessão a
   janela ainda não cobriu tempo nenhum; sem piso, `n / 0` = Infinity. */
export const MIN_JANELA_MS = 200;
/* Relógio do servidor andando para trás (sala reiniciada, troca de nó, ajuste de
   hora) ou saltando para frente: a fila antiga não descreve mais a sessão atual.
   Recomeçar é honesto; podar com um eixo trocado produz número inventado. */
const RECUO_MAX_MS = 2000;
const SALTO_MAX_MS = 60000;
/* Compactação da fila: a poda anda uma cabeça lógica (O(1) por amostra) em vez de
   `shift()` (O(n) por amostra, e a rajada de uma travada tem centenas). */
const COMPACTA_EM = 128;

export class MedidorDeTaxa {
  constructor(janelaMs = JANELA_MS) {
    this.janelaMs = janelaMs > 0 ? janelaMs : JANELA_MS;
    this.hz = 0;
    this.kbps = 0;
    this._tm = [];      // eixo de MEDIDA, em ms (servidor quando há; local quando não)
    this._bytes = [];
    this._i = 0;        // cabeça lógica da fila
    this._soma = 0;     // bytes vivos na fila (sem varrer tudo a cada leitura)
    this._primeiroTm = 0;
    this._ultimoTm = 0;
    this._ultimoLocal = 0;
    this._eixoServidor = false;
    this._vivo = false;
  }

  /** Esquece a janela e recomeça do zero (sessão nova, eixo novo). */
  reiniciar() {
    this._tm.length = 0; this._bytes.length = 0;
    this._i = 0; this._soma = 0; this._vivo = false;
    this.hz = 0; this.kbps = 0;
  }

  /** Registra um snapshot que CHEGOU: `bytes`, `tServidorS` (snapshot.t em s, null = protocolo
   *  antigo) e `tLocalMs` (performance.now() da drenagem, só referência de avanço). */
  amostra(bytes, tServidorS, tLocalMs) {
    const temSrv = Number.isFinite(tServidorS);
    const tm = temSrv ? tServidorS * 1000 : tLocalMs;
    if (!Number.isFinite(tm) || !Number.isFinite(tLocalMs)) return;
    if (!this._vivo || temSrv !== this._eixoServidor
      || tm < this._ultimoTm - RECUO_MAX_MS || tm > this._ultimoTm + SALTO_MAX_MS) {
      this.reiniciar();
      this._eixoServidor = temSrv;
      this._primeiroTm = tm;
      this._vivo = true;
    }
    const b = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    this._tm.push(tm); this._bytes.push(b); this._soma += b;
    this._ultimoTm = tm; this._ultimoLocal = tLocalMs;
  }

  /** Recalcula `hz`/`kbps` da janela que termina AGORA. `tLocalMs` = performance.now(). */
  atualizar(tLocalMs) {
    if (!this._vivo) { this.hz = 0; this.kbps = 0; return this; }
    /* O fim da janela não é o último pacote: é agora. Quem decide o avanço é o
       relógio local, que continua andando com a aba oculta e com a rede muda. */
    const avanco = Number.isFinite(tLocalMs) ? Math.max(0, tLocalMs - this._ultimoLocal) : 0;
    const fim = this._ultimoTm + avanco;
    const corte = fim - this.janelaMs;
    const tm = this._tm, bytes = this._bytes;
    let i = this._i;
    /* Janela SEMIABERTA `(corte, fim]`. Com as duas bordas fechadas, um segundo de
       uma sala de 30 Hz cabe 31 pacotes sempre que a fase bate redondo, e o painel
       mostra 31 Hz numa sala de 30 — viés de +1 constante, não arredondamento. */
    while (i < tm.length && tm[i] <= corte) { this._soma -= bytes[i]; i++; }
    if (i >= tm.length) { tm.length = 0; bytes.length = 0; i = 0; this._soma = 0; }
    else if (i >= COMPACTA_EM) { tm.splice(0, i); bytes.splice(0, i); i = 0; }
    this._i = i;
    const n = tm.length - i;
    /* Sessão mais nova que a janela: divide pelo que existe, não por 1 s presumido
       — senão os primeiros 200 ms de uma sala de 30 Hz reportam 6 Hz. */
    const inicio = Math.max(this._primeiroTm, corte);
    const seg = Math.max(MIN_JANELA_MS, Math.min(this.janelaMs, fim - inicio)) / 1000;
    this.hz = +(n / seg).toFixed(1);
    this.kbps = +(this._soma / 1024 / seg).toFixed(2);
    return this;
  }
}
