// ESCADA DE QUALIDADE ADAPTATIVA — política pura, sem three e sem DOM, para ter régua.
// O porquê, os limiares e o veto de jogabilidade estão em docs/QUALIDADE-ADAPTATIVA.md.

// Do mais bonito ao mais leve. `dpr` multiplica o DPR base; o resto são passes que o
// EffectComposer liga e desliga em runtime, sem reconstruir nada.
export const DEGRAUS = Object.freeze([
  { nome: 'cheio', dpr: 1, ssao: true, aa: true, sombra: 'alta', charmask: true, mato: 1, efeitos: 1 },
  { nome: 'dpr-', dpr: 0.85, ssao: true, aa: true, sombra: 'alta', charmask: true, mato: 1, efeitos: 1 },
  { nome: 'sem-ao', dpr: 0.85, ssao: false, aa: true, sombra: 'alta', charmask: true, mato: 0.8, efeitos: 0.9 },
  { nome: 'dpr--', dpr: 0.7, ssao: false, aa: true, sombra: 'alta', charmask: true, mato: 0.7, efeitos: 0.8 },
  { nome: 'sem-aa', dpr: 0.7, ssao: false, aa: false, sombra: 'alta', charmask: true, mato: 0.6, efeitos: 0.7 },
  { nome: 'sombra-', dpr: 0.7, ssao: false, aa: false, sombra: 'baixa', charmask: true, mato: 0.45, efeitos: 0.55 },
  { nome: 'minimo', dpr: 0.6, ssao: false, aa: false, sombra: 'baixa', charmask: false, mato: 0.3, efeitos: 0.35 },
  { nome: 'sobrevivencia', dpr: 0.5, ssao: false, aa: false, sombra: 'baixa', charmask: false, mato: 0.2, efeitos: 0.2 },
]);

/* No toque, 60 FPS sustentados valem mais que um pico de 120 Hz que aquece e degrada. */
export const PERFIL_MOBILE = Object.freeze({
  degrauInicial: 6, texturaMax: 1024, fpsJogo: 60, fpsMenu: 30, chaveDegrau: 'cs_mobile_degrau_v1',
});

export function tetoTextura({ pointerCoarse = false, maxTextureSize = Infinity } = {}) {
  if (!pointerCoarse) return 0;
  return Math.max(1, Math.min(PERFIL_MOBILE.texturaMax, maxTextureSize || Infinity));
}

export function perfilInicial({ pointerCoarse = false, software = false, degrauSalvo = null } = {}) {
  if (software) return DEGRAUS.length - 1;
  if (!pointerCoarse) return 0;
  const salvo = degrauSalvo === null || degrauSalvo === '' ? NaN : Number(degrauSalvo);
  return Number.isInteger(salvo) && salvo >= 0 && salvo < DEGRAUS.length ? salvo : PERFIL_MOBILE.degrauInicial;
}

// Nenhum degrau pode mexer em JOGABILIDADE (arma no chão, alcance, inimigo legível, HUD):
// quem perde quadro não pode perder também a informação de que precisa para jogar.
export const CAMPOS_PERMITIDOS = Object.freeze(['nome', 'dpr', 'ssao', 'aa', 'sombra', 'charmask', 'mato', 'efeitos']);

// Limiares da histerese: agrega por segundo, desce rápido, sobe devagar, e a faixa morta
// entre as duas margens é o que impede o vaivém. Os porquês estão no documento.
export const JANELA_S = 1;
export const DESCE_APOS_S = 3;
export const SOBE_APOS_S = 12;
export const MARGEM_DESCE = 1.15;
export const MARGEM_SOBE = 0.75;
export const CARENCIA_S = 4;
export const VIAGENS_MAX = 2;
export class LimitadorCadencia {
  constructor() {
    this.fps = 0;
    this.proximo = 0;
  }

  aceita(agoraMs, fps) {
    if (!(fps > 0) || !Number.isFinite(agoraMs)) return true;
    const intervalo = 1000 / fps;
    if (this.fps !== fps) {
      this.fps = fps;
      this.proximo = agoraMs;
    }
    if (agoraMs + 0.5 < this.proximo) return false;
    this.proximo += intervalo;
    if (this.proximo < agoraMs - intervalo) this.proximo = agoraMs + intervalo;
    return true;
  }
}

export class EscadaAdaptativa {
  constructor({ orcamentoMs = 1000 / 60, degrau = 0, teto = DEGRAUS.length - 1 } = {}) {
    this.orcamentoMs = orcamentoMs;
    this.degrau = Math.max(0, Math.min(teto, degrau | 0));
    this.teto = teto;
    this.tetoSessao = 0;            // degrau mais RASO a que a sessão ainda pode voltar
    this.viagens = new Map();
    this.mudancas = 0;
    this._acc = 0; this._n = 0; this._pior = 0;
    this._sofrendo = 0; this._folgado = 0; this._carencia = 0;
  }

  // recebe o tempo de UM quadro; devolve o degrau novo quando muda, senão null
  quadro(dtMs) {
    if (!(dtMs > 0) || dtMs > 5000) return null;   // aba em segundo plano não é sintoma
    this._acc += dtMs; this._n++; this._pior = Math.max(this._pior, dtMs);
    if (this._acc < JANELA_S * 1000) return null;
    const media = this._acc / this._n;
    const segundos = this._acc / 1000;
    this._acc = 0; this._n = 0; this._pior = 0;
    return this._janela(media, segundos);
  }

  _janela(mediaMs, segundos) {
    if (this._carencia > 0) { this._carencia -= segundos; return null; }
    const alto = mediaMs > this.orcamentoMs * MARGEM_DESCE;
    const baixo = mediaMs < this.orcamentoMs * MARGEM_SOBE;
    this._sofrendo = alto ? this._sofrendo + segundos : 0;
    this._folgado = baixo ? this._folgado + segundos : 0;
    if (this._sofrendo >= DESCE_APOS_S && this.degrau < this.teto) return this._mover(+1);
    if (this._folgado >= SOBE_APOS_S && this.degrau > this.tetoSessao) return this._mover(-1);
    return null;
  }

  // Catraca: descer duas vezes ao mesmo degrau prova que o de cima não se sustenta aqui, e
  // ele vira o piso da sessão — vaivém eterno é pior que um degrau abaixo o tempo todo.
  _mover(passo) {
    const antes = this.degrau;
    this.degrau = Math.max(0, Math.min(this.teto, antes + passo));
    if (this.degrau === antes) return null;
    this._sofrendo = 0; this._folgado = 0; this._carencia = CARENCIA_S; this.mudancas++;
    if (passo > 0) {
      const n = (this.viagens.get(this.degrau) || 0) + 1;
      this.viagens.set(this.degrau, n);
      if (n >= VIAGENS_MAX) this.tetoSessao = Math.max(this.tetoSessao, this.degrau);
    }
    return this.degrau;
  }

  get atual() { return DEGRAUS[this.degrau]; }
}
