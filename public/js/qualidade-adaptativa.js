// ESCADA DE QUALIDADE ADAPTATIVA — política pura, sem three e sem DOM, para ter régua.
// O porquê, os limiares e o veto de jogabilidade estão em docs/QUALIDADE-ADAPTATIVA.md.

/* Do mais bonito ao mais leve. `dpr` é multiplicador do DPR base; os outros são passes que o
   EffectComposer liga e desliga em runtime (pass.enabled), sem reconstruir nada. */
export const DEGRAUS = Object.freeze([
  { nome: 'cheio', dpr: 1, ssao: true, aa: true, sombra: 'alta', charmask: true },
  { nome: 'dpr-', dpr: 0.85, ssao: true, aa: true, sombra: 'alta', charmask: true },
  { nome: 'sem-ao', dpr: 0.85, ssao: false, aa: true, sombra: 'alta', charmask: true },
  { nome: 'dpr--', dpr: 0.7, ssao: false, aa: true, sombra: 'alta', charmask: true },
  { nome: 'sem-aa', dpr: 0.7, ssao: false, aa: false, sombra: 'alta', charmask: true },
  { nome: 'sombra-', dpr: 0.7, ssao: false, aa: false, sombra: 'baixa', charmask: true },
  { nome: 'minimo', dpr: 0.6, ssao: false, aa: false, sombra: 'baixa', charmask: false },
]);

// Nenhum degrau pode mexer em JOGABILIDADE (arma no chão, alcance, inimigo legível, HUD):
// quem perde quadro não pode perder também a informação de que precisa para jogar.
export const CAMPOS_PERMITIDOS = Object.freeze(['nome', 'dpr', 'ssao', 'aa', 'sombra', 'charmask']);

export const JANELA_S = 1;          // agrega por segundo: um quadro ruim não é um jogo ruim
export const DESCE_APOS_S = 3;      // sofrer 3 s seguidos é problema; 3 quadros é uma granada
export const SOBE_APOS_S = 12;      // subir é 4× mais lento que descer, de propósito
export const MARGEM_DESCE = 1.15;   // acima de 115% do orçamento
export const MARGEM_SOBE = 0.75;    // só volta a subir com 25% de folga — a faixa morta entre
export const CARENCIA_S = 4;        // as duas é o que impede o vaivém
export const VIAGENS_MAX = 2;       // depois de 2 idas e voltas, o degrau vira teto da sessão

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

  /* A catraca: descer DUAS vezes até o mesmo degrau prova que o de cima não se sustenta nesta
     máquina, e ele vira o piso da sessão. Sem ela o vaivém é eterno, e imagem que troca de
     nitidez a cada 15 s é pior que jogar um degrau abaixo o tempo todo. */
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
