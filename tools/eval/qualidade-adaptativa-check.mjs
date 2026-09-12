/* RÉGUA DA QUALIDADE ADAPTATIVA — desce quando sofre, sobe quando folga, e NÃO fica vaivém.
   ═══════════════════════════════════════════════════════════════════════════════════
   O painel diz que 20% das amostras de FPS ficam abaixo de 30. O jogo tinha três qualidades
   fixas e uma detecção de máquina fraca que roda UMA vez, no boot, e só se o jogador nunca
   salvou preferência — depois disso, nada mais observa o quadro. Mapa caro, partida cheia e
   granada fumaça acontecem DEPOIS do boot.

   A parte difícil de uma escada adaptativa não é descer: é não virar pisca-pisca. Máquina que
   fica exatamente no limiar sobe, sofre, desce, folga, sobe de novo — e o jogador vê a imagem
   mudar de nitidez a cada poucos segundos, o que é PIOR que jogar um degrau abaixo o tempo
   todo. Por isso a política tem três defesas, e esta régua cobra as três:

     faixa morta   descer exige 115% do orçamento; subir exige 75% — entre as duas, nada.
     tempos assimétricos   3 s para descer, 12 s para subir.
     catraca   depois de 2 idas e voltas ao mesmo degrau, ele vira o piso da sessão.

   E cobra o VETO DO DONO: nenhum degrau pode mexer em jogabilidade (arma no chão, alcance,
   legibilidade do inimigo, HUD). Quem perde quadro não pode perder também a informação.

   USO
     node tools/eval/qualidade-adaptativa-check.mjs
     node tools/eval/qualidade-adaptativa-check.mjs --mutar=sem-histerese   # limiar único
     node tools/eval/qualidade-adaptativa-check.mjs --mutar=sem-catraca
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { EscadaAdaptativa, DEGRAUS, CAMPOS_PERMITIDOS, MARGEM_DESCE, MARGEM_SOBE, DESCE_APOS_S, SOBE_APOS_S } from '../../public/js/qualidade-adaptativa.js';

const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';
let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };
if (MUTAR) console.log(`\n  [MUTANTE: ${MUTAR}] — a régua TEM que reprovar`);

// o mutante desfaz a defesa no OBJETO, sem tocar no arquivo: a política é a mesma classe
function escada(opts) {
  const e = new EscadaAdaptativa(opts);
  if (MUTAR === 'sem-histerese') {
    const j = e._janela.bind(e);
    e._janela = function (mediaMs, seg) {
      // limiar ÚNICO nos dois sentidos e sem carência: o pisca-pisca que a faixa morta evita
      this._carencia = 0;
      const alto = mediaMs > this.orcamentoMs, baixo = mediaMs <= this.orcamentoMs;
      this._sofrendo = alto ? this._sofrendo + seg : 0;
      this._folgado = baixo ? this._folgado + seg : 0;
      if (this._sofrendo >= 1 && this.degrau < this.teto) return this._mover(+1);
      if (this._folgado >= 1 && this.degrau > this.tetoSessao) return this._mover(-1);
      return null;
    };
  }
  if (MUTAR === 'sem-catraca') { e._mover = EscadaAdaptativa.prototype._mover.bind(e); e.viagens = { get: () => 0, set: () => {} }; }
  return e;
}
const roda = (e, ms, segundos) => {
  const eventos = [];
  for (let s = 0; s < segundos; s++) {
    const dt = typeof ms === 'function' ? ms(s) : ms;
    for (let i = 0; i < Math.max(1, Math.round(1000 / dt)); i++) {
      const r = e.quadro(dt);
      if (r !== null) eventos.push({ s, degrau: r });
    }
  }
  return eventos;
};

console.log('\n· a escada desce quando o jogo sofre');

// QA1 · sofrimento sustentado desce (é o mínimo: sem isto a escada não existe)
const e1 = escada({});
const ev1 = roda(e1, 40, 20);
cobra(ev1.length > 0 && e1.degrau > 0, `QA1 · 40 ms por quadro desceu ${e1.degrau} degrau(s) em 20 s`);

/* QA2 · UM degrau por vez. Queda livre até o mínimo no primeiro engasgo é o que faz o jogador
   perder sombra e nitidez por causa de uma granada de fumaça. */
const passos = ev1.map((x) => x.degrau);
cobra(passos.every((d, i) => i === 0 || d === passos[i - 1] + 1),
  `QA2 · um degrau por vez, nunca queda livre (${passos.join('→')})`);

// QA3 · engasgo CURTO não mexe em nada: 3 quadros ruins não são 3 segundos ruins
const e3 = escada({});
roda(e3, (s) => (s < 1 ? 60 : 8), 10);
cobra(e3.degrau === 0, `QA3 · um segundo ruim seguido de folga não muda a qualidade (degrau ${e3.degrau})`);

console.log('\n· e não vira pisca-pisca');

/* QA4 · A CLÁUSULA QUE ESTA RÉGUA EXISTE PARA COBRAR. Máquina EXATAMENTE no limiar: alterna
   sofrer e folgar. Com faixa morta e catraca isso estabiliza; sem elas, muda para sempre. */
const e4 = escada({});
const ev4 = roda(e4, (s) => (Math.floor(s / 6) % 2 ? 40 : 9), 240);
const tarde = ev4.filter((x) => x.s > 120).length;
/* O total importa tanto quanto o fim: QUALQUER política acaba parando ao bater no degrau mais
   fundo. O que separa a boa da ruim é quantas vezes a tela mudou até lá — com faixa morta são
   ~6 mudanças; com limiar único, 20. Sem esta parte o mutante `sem-histerese` passava verde. */
cobra(tarde === 0 && ev4.length <= DEGRAUS.length + 2,
  `QA4 · alternando no limiar, a escada mudou ${ev4.length} vezes em 4 min (teto ${DEGRAUS.length + 2}) e parou aos ${ev4.length ? ev4[ev4.length - 1].s : 0} s`);

/* QA5 · A CATRACA, medida no padrão que a exige: sofrer 8 s e folgar 18 s dá tempo de subir
   E de descer, então a máquina faz idas e voltas de verdade. A catraca converge isso — cada
   par de voltas ao mesmo degrau o transforma em piso — em vez de deixar o vaivém eterno. */
const e5 = escada({});
const ev5 = roda(e5, (s) => ((s % 26) < 8 ? 40 : 8), 600);
const cedo = ev5.filter((x) => x.s <= 300).length, depois = ev5.filter((x) => x.s > 300).length;
cobra(e5.tetoSessao > 0 && depois === 0,
  `QA5 · idas e voltas viram piso de sessão e a escada assenta (piso ${e5.tetoSessao}; ${cedo} mudanças nos 5 min iniciais contra ${depois} nos 5 seguintes)`);

/* QA6 · SUBIR É MAIS LENTO QUE DESCER, e não por gosto: descer tarde custa quadros que o
   jogador sente; subir cedo custa a volta imediata. */
cobra(SOBE_APOS_S >= DESCE_APOS_S * 3 && MARGEM_SOBE < 1 && MARGEM_DESCE > 1,
  `QA6 · ${DESCE_APOS_S}s para descer contra ${SOBE_APOS_S}s para subir, com faixa morta de ${MARGEM_SOBE}–${MARGEM_DESCE}×`);

// QA7 · máquina folgada VOLTA a subir (escada que só desce é qualidade fixa com passo extra)
const e7 = escada({ degrau: 3 });
roda(e7, 6, 60);
cobra(e7.degrau < 3, `QA7 · com folga sustentada a escada sobe de volta (3 → ${e7.degrau})`);

console.log('\n· e nenhum degrau toca em jogabilidade');

/* QA8 · o veto do dono vira lista FECHADA. Um degrau que apagasse arma do chão ou encurtasse
   alcance ganharia FPS e perderia o jogo — e ninguém veria no gráfico. */
const forasteiros = DEGRAUS.flatMap((d) => Object.keys(d).filter((k) => !CAMPOS_PERMITIDOS.includes(k)));
cobra(forasteiros.length === 0,
  `QA8 · os degraus só mexem em ${CAMPOS_PERMITIDOS.length} campos de imagem${forasteiros.length ? ` — apareceu ${forasteiros.join(', ')}` : ''}`);
cobra(DEGRAUS[0].dpr === 1 && DEGRAUS[DEGRAUS.length - 1].dpr < 1 && DEGRAUS.every((d, i) => i === 0 || d.dpr <= DEGRAUS[i - 1].dpr),
  'QA9 · a escada é monótona: nenhum degrau mais fundo desenha MAIS pixels que o anterior');

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
