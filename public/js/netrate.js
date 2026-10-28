/* ============================================================================
   MEDIDOR DE TAXA DE REDE (snapshots/s e banda) — conserto do BUG-160
   ----------------------------------------------------------------------------
   O QUE ESTAVA ERRADO (medido, não suposto)

   O medidor antigo vivia em `net.js` e era isto:

       const now = performance.now(), cut = now - 1000;
       while (this._snapT.length && this._snapT[0] < cut) this._snapT.shift();
       this.stats.hz = this._snapT.length;                        // ← a taxa
       this.stats.kbps = this._byteT.reduce((s, x) => s + x.b, 0) / 1024;

   A janela parece de relógio, mas o CARIMBO de cada amostra (`now`) é o instante
   em que o handler `onmessage` RODOU — isto é, o instante em que o quadro de
   render liberou a thread e o navegador drenou a fila. A abscissa é o render,
   não a rede. Com o quadro durando ΔF segundos, cada drenagem entrega R·ΔF
   snapshots com carimbos praticamente iguais, e a janela de 1 s retém

       ⌈1/ΔF⌉ drenagens × R·ΔF snapshots ≈ R · ΔF · ⌈1/ΔF⌉ ≥ R

   O excedente é SEMPRE de até uma drenagem inteira, ou seja, R·ΔF snapshots a
   mais — erro relativo de até ΔF (= 1/FPS):

       60 fps → +1,7%    30 fps → +3,3%    15 fps → +6,7%    2 fps → +50%

   E quando ΔF passa de 1 s (travada de GPU/compilação de shader) a janela cabe
   dentro de UMA drenagem: a taxa reportada vira R·ΔF e o instrumento oscila
   entre 0 Hz (janela entre drenagens) e R·ΔF. Foi o que o registro mediu: uma
   travada de ≈9,1 s com R = 30 Hz e 0,70 KB por snapshot dá 30×9,1 = 273 Hz e
   273×0,70 = 191 KB/s — o `snap 274 Hz /30` e `band 191,9 KB/s` do BUG-160,
   contra os 30 Hz / 20,8 KB/s reais do mesmo nó com GPU de verdade.

   O QUE ESTE MÓDULO FAZ DIFERENTE

   O eixo da medida é o RELÓGIO DO SERVIDOR que carimbou o snapshot (`snapshot.t`,
   f64 em segundos — ver `netcodec.js`). Esse eixo não encolhe quando o render
   engasga: trezentos snapshots drenados no mesmo quadro continuam espalhados por
   dez segundos de servidor, e a janela de 1 s retém só os trinta que são de
   verdade do último segundo. Snapshot sem `t` (protocolo antigo) cai para o
   relógio local, que é o comportamento que havia — pior, mas não inventado.

   A divisão é pela DURAÇÃO REALMENTE COBERTA pela janela, nunca por "1 s"
   presumido nem por contagem de quadros. E o fim da janela anda com o relógio
   LOCAL mesmo sem pacote nenhum: aba em segundo plano para de renderizar mas não
   para o tempo, então a taxa tem que CAIR para zero, não congelar no último valor
   bom. O piso de `MIN_JANELA_MS` é o que impede divisão por zero no primeiro
   instante da sessão (uma amostra só cobre duração zero).

   NÃO É CAMINHO DE ENVIO. Este módulo não vê, não toca e não decide nada sobre o
   que o cliente manda: ele conta bytes e tempos de coisas que já chegaram.

   Régua: `tools/eval/net-rate-check.mjs` (npm run eval:netrate).
   ============================================================================ */

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
    this.hz = 0;        // snapshots por segundo na janela
    this.kbps = 0;      // KB/s na janela
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

  /**
   * Registra um snapshot que CHEGOU.
   * @param {number} bytes      tamanho do quadro recebido
   * @param {number|null} tServidorS  `snapshot.t` em segundos; null/NaN = protocolo sem relógio
   * @param {number} tLocalMs   `performance.now()` da drenagem (só serve de referência de avanço)
   */
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

  /**
   * Recalcula `hz`/`kbps` da janela que termina AGORA.
   * @param {number} tLocalMs `performance.now()` da leitura
   */
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
