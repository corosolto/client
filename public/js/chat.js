/* CHAT DE SALA, a parte pura: sem DOM, sem import. Contrato e vetores em docs/chat-de-sala.md;
   a tabela do §6 é a fonte destes números, e eval:chat (CC7) cobra a igualdade. */

export const CHAT_LIMITES = Object.freeze({
  maxChars: 160,
  maxUtf16: 640,
  maxMarcas: 2,
  cidMaxChars: 12,
  handleChars: 3,
  handleCharsMax: 5,
  baldeCapacidade: 5,
  baldeRecargaMs: 2000,
  repeticaoMs: 15000,
  escaladaRecusas: 8,
  escaladaJanelaMs: 30000,
  silencioMs: 60000,
  salaCapacidade: 20,
  salaRecargaPorSegundo: 4,
  maxPayloadBytes: 16384,
  bufferedAmountMax: 1048576,
  denunciasPorJanela: 5,
  denunciaJanelaMs: 600000,
  evidenciaAntes: 10,
  evidenciaDepois: 5,
  filaDenunciasMax: 500,
  loteDenuncias: 100,
  flushDenunciasMs: 30000,
  bufferMaxMensagens: 50,
  bufferMaxMs: 300000,
  salaVaziaLimpaMs: 60000,
  historicoMaxMensagens: 20,
  historicoMaxMs: 180000,
  historicoMaxBytes: 16384,
  logClienteMaxLinhas: 100,
  filaClienteMax: 64,
  bloqueiosMax: 50,
  retencaoDenunciasDias: 90,
});

export const MOTIVOS_DENUNCIA = Object.freeze(['ofensa', 'odio', 'assedio', 'spam', 'outro']);
export const CANAIS = Object.freeze(['sala', 'time']);
export const CID_RE = /^[A-Za-z0-9_-]{1,12}$/;
// a mesma regex do ticket (api/_lib/mp-ticket.mjs, NICK_TICKET_RE); o nó já revalida, aqui é cinto
export const NICK_RE = /^[A-Za-z0-9_.\-]{2,14}$/;
export const MARCA_VERIFICADO = '✓';
export const PREFIXO_ARMAZENAMENTO = 'cs_chat_bloq';

const PICTO = /^\p{Extended_Pictographic}$/u;
const codePointAntes = (s, i) => {
  if (i <= 0) return '';
  const baixo = s.charCodeAt(i - 1);
  return baixo >= 0xDC00 && baixo <= 0xDFFF && i >= 2 ? s.slice(i - 2, i) : s[i - 1];
};
const codePointDepois = (s, i) => (i < s.length ? String.fromCodePoint(s.codePointAt(i)) : '');

export const contarChars = (s) => Array.from(s).length;
export const chaveTexto = (s) => s.toLowerCase().replace(/[\s\p{P}]/gu, '');

/* Os nove passos do §3, na ordem do doc. Nunca \p{Cn}: depende do ICU e faria o navegador
   e o nó discordarem sobre o mesmo texto. */
export function normalizarTexto(txt) {
  if (typeof txt !== 'string') return { ok: false, motivo: 'invalida' };
  if (txt.length > CHAT_LIMITES.maxUtf16) return { ok: false, motivo: 'longa' };
  let s = txt.normalize('NFKC');
  s = s.replace(/[\t\n\r\f\v\u0085\u{A0}\u{2028}\u{2029}\p{Zs}]/gu, ' ');
  s = s.replace(/[\p{Cc}\p{Cf}]/gu, (ch, i, str) =>
    (ch === '\u{200D}' && PICTO.test(codePointAntes(str, i)) && PICTO.test(codePointDepois(str, i + 1)) ? ch : ''));
  s = s.replace(/[\p{Co}\p{Cs}\u{34F}\u{115F}\u{1160}\u{3164}\u{FFA0}\u{2800}]/gu, '');
  s = s.replace(/[\u{FE0E}\u{FE0F}]/gu, (ch, i, str) => (PICTO.test(codePointAntes(str, i)) ? ch : ''));
  s = s.replace(/\p{M}+/gu, (m) => Array.from(m).slice(0, CHAT_LIMITES.maxMarcas).join(''));
  s = s.replace(/ +/g, ' ').trim();
  if (!s) return { ok: false, motivo: 'vazia' };
  if (contarChars(s) > CHAT_LIMITES.maxChars) return { ok: false, motivo: 'longa' };
  return { ok: true, txt: s };
}

export function validarEnvio(ch, txt, canais = CANAIS) {
  if (!CANAIS.includes(ch)) return { ok: false, motivo: 'invalida' };
  if (!canais.includes(ch)) return { ok: false, motivo: ch === 'time' ? 'sem_time' : 'invalida' };
  return normalizarTexto(txt);
}

export function rotuloDe(msg, anonimo = 'Anônimo') {
  const nk = typeof msg?.nk === 'string' && NICK_RE.test(msg.nk) ? msg.nk : '';
  return nk ? `${nk} ${MARCA_VERIFICADO}` : `${anonimo} #${msg?.h ?? ''}`;
}

export const chaveArmazenamento = (convite, epoca) => `${PREFIXO_ARMAZENAMENTO}:${convite}:${epoca}`;

const metaValida = (meta) => !!(meta && meta.chat && meta.chat.v === 1);

/* Estado do painel sem o painel: log com teto, dedupe por id, bloqueios por handle. O storage
   é opcional e pode estourar (Safari privado, iframe sem cookies); estourou, fica em memória. */
export class ChatEstado {
  constructor({ convite = '', meta = null, storage = null, limites = CHAT_LIMITES } = {}) {
    this.convite = String(convite || '');
    this.limites = limites;
    this.storage = storage;
    this.linhas = [];
    this._ids = new Set();
    this._bloqueados = new Set();
    this._chave = '';
    this._contadorCid = 0;
    this._prefixoCid = ChatEstado._prefixoAleatorio();
    this.aoMudarMeta(meta);
  }

  static _prefixoAleatorio() {
    const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let p = '';
    for (let i = 0; i < 4; i++) p += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    return p;
  }

  aoMudarMeta(meta) {
    this.meta = metaValida(meta) ? meta : null;
    const chave = this.meta && this.meta.chat.epoca ? chaveArmazenamento(this.convite, this.meta.chat.epoca) : '';
    if (chave !== this._chave) { this._chave = chave; this._bloqueados = new Set(this._lerStorage()); }
  }

  ativo() { return !!this.meta; }
  get eu() { return this.meta?.chat?.eu || null; }
  get epoca() { return this.meta?.chat?.epoca || ''; }

  canaisPara(espectador) {
    const anunciados = (this.meta?.chat?.canais || CANAIS).filter((c) => CANAIS.includes(c));
    return espectador ? anunciados.filter((c) => c === 'sala') : anunciados;
  }

  motivosDenuncia() {
    const lista = (this.meta?.chat?.denuncia || []).filter((m) => MOTIVOS_DENUNCIA.includes(m));
    return lista.length ? lista : [...MOTIVOS_DENUNCIA];
  }

  proximoCid() {
    this._contadorCid += 1;
    return `${this._prefixoCid}${this._contadorCid.toString(36)}`.slice(0, this.limites.cidMaxChars);
  }

  receber(msg, hist = false) {
    if (!msg || !Number.isInteger(msg.id) || this._ids.has(msg.id)) return false;
    this._ids.add(msg.id);
    this.linhas.push(hist ? { ...msg, hist: true } : msg);
    const sobra = this.linhas.length - this.limites.logClienteMaxLinhas;
    if (sobra > 0) for (const velha of this.linhas.splice(0, sobra)) this._ids.delete(velha.id);
    return true;
  }

  receberHist(list) {
    let novas = 0;
    for (const m of Array.isArray(list) ? list : []) if (this.receber(m, true)) novas += 1;
    return novas;
  }

  limpar() { this.linhas = []; this._ids = new Set(); }

  linhasVisiveis() { return this.linhas.filter((l) => !this._bloqueados.has(l.h)); }

  estaBloqueado(h) { return this._bloqueados.has(h); }
  bloqueados() { return [...this._bloqueados]; }

  bloquear(h) {
    if (typeof h !== 'string' || !h || h === this.eu?.h) return false;
    if (this._bloqueados.has(h)) return true;
    if (this._bloqueados.size >= this.limites.bloqueiosMax) return false;
    this._bloqueados.add(h);
    this._gravarStorage();
    return true;
  }

  desbloquear(h) {
    if (!this._bloqueados.delete(h)) return false;
    this._gravarStorage();
    return true;
  }

  _lerStorage() {
    if (!this._chave || !this.storage) return [];
    try {
      const lista = JSON.parse(this.storage.getItem(this._chave) || '[]');
      return Array.isArray(lista) ? lista.filter((h) => typeof h === 'string').slice(0, this.limites.bloqueiosMax) : [];
    } catch { return []; }
  }

  _gravarStorage() {
    if (!this._chave || !this.storage) return;
    try { this.storage.setItem(this._chave, JSON.stringify([...this._bloqueados])); } catch { /* storage cheio ou bloqueado: fica em memória */ }
  }
}
