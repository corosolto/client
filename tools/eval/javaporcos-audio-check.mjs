/* Contratos de duração, espacialização e orçamento das gravações reais.
   O grafo falso mede decisões; javaporcos-real-audio-check.mjs decodifica e renderiza os MP3 reais. */
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['voz-muda', 'voz-clonada', 'teto-ignorado', 'ruido-estourado'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

/* ── grafo falso ───────────────────────────────────────────────────────────
   Grava quem foi criado, quem liga em quem, que valor o parâmetro recebeu e em
   que instante cada fonte começou. Sem DSP: a pergunta é pela DECISÃO. */
let LOG = null;
const novoLog = () => ({ starts: [], stops: [], panners: [], criados: [] });

function param(valor = 0) {
  const p = {
    value: valor, _agenda: [],
    setValueAtTime(v, t) { p.value = v; p._agenda.push(['set', v, t]); return p; },
    exponentialRampToValueAtTime(v, t) { p._agenda.push(['exp', v, t]); return p; },
    linearRampToValueAtTime(v, t) { p._agenda.push(['lin', v, t]); return p; },
    setTargetAtTime(v, t) { p._agenda.push(['alvo', v, t]); return p; },
    cancelScheduledValues() { p._agenda.length = 0; return p; },
  };
  return p;
}
function no(tipo, extra = {}) {
  const n = {
    tipo, saidas: [],
    connect(dst) { n.saidas.push(dst); return dst; },
    disconnect() {},
    ...extra,
  };
  LOG.criados.push(n);
  return n;
}
class CtxFalso {
  constructor() {
    this.currentTime = 100;          // ≠ 0 de propósito: agendar em 0 seria indistinguível
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = no('destination');
  }
  resume() {}
  createGain() { return no('gain', { gain: param(1) }); }
  createStereoPanner() {
    const n = no('panner', { pan: param(0) });
    LOG.panners.push(n);
    return n;
  }
  createBiquadFilter() { return no('biquad', { type: 'lowpass', frequency: param(350), Q: param(1), detune: param(0) }); }
  createDynamicsCompressor() {
    return no('comp', { threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) });
  }
  createWaveShaper() { return no('shaper', { curve: null, oversample: 'none' }); }
  createConvolver() { return no('convolver', { buffer: null }); }
  createOscillator() {
    const n = no('osc', { type: 'sine', frequency: param(440), detune: param(0) });
    n.start = (t = this.currentTime) => LOG.starts.push({ tipo: 'osc', t, no: n });
    n.stop = (t) => LOG.stops.push({ tipo: 'osc', t, no: n });
    return n;
  }
  createBufferSource() {
    const n = no('src', { buffer: null, loop: false, playbackRate: param(1), detune: param(0) });
    n.start = (t = this.currentTime, offset = 0) => LOG.starts.push({ tipo: 'src', t, offset, no: n });
    n.stop = (t) => LOG.stops.push({ tipo: 'src', t, no: n });
    return n;
  }
  createBuffer(ch, n, sr) {
    const dados = Array.from({ length: ch }, () => new Float32Array(n));
    return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (i) => dados[i] };
  }
  decodeAudioData() { return Promise.resolve(this.createBuffer(1, 12000, this.sampleRate)); }
}

/* ── ambiente de navegador mínimo ─────────────────────────────────────────── */
globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://regua/' };
globalThis.AudioContext = CtxFalso;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
globalThis.Audio = class { constructor() { this.volume = 1; } addEventListener() {} pause() {} play() { return Promise.resolve(); } };
globalThis.fetch = async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });

LOG = novoLog();
const { Sfx, JAVAPORCO_LIMITES } = await import('../../public/js/audio.js');

/* Faixa que o DONO pediu, não a tabela do código: régua que copia a tabela só
   confirma que a tabela é igual a ela mesma. Medida de ponta a ponta no grafo. */
const FAIXA = { rosnado: [0.25, 0.45], morte: [0.70, 1.00], carga: [0.08, 0.30], horda: [0.90, 1.80] };

const RANDOM0 = Math.random;
let mutouAlgo = false;

/* Um Sfx por cenário: orçamento de energia e último instante por voz guardam
   estado entre chamadas, e cenário que herda estado do anterior mede o anterior. */
function novoSfx({ volume = 1 } = {}) {
  LOG = novoLog();
  const sfx = new Sfx();
  sfx.pack = { weapons: {} };
  sfx.ensure();
  sfx.setVolume(volume);
  sfx._boarSamples = new Map([
    ['grunhido', sfx.ctx.createBuffer(1, 65200, 48000)],
    ['guincho', sfx.ctx.createBuffer(1, 94350, 48000)],
  ]);
  if (mutante === 'voz-muda') {
    const base = sfx.javaporco.bind(sfx);
    sfx.javaporco = (kind, ...resto) => {
      if (kind !== 'morte') return base(kind, ...resto);
      mutouAlgo = true;
      return false;
    };
  }
  if (mutante === 'teto-ignorado') {
    sfx._javaporcoSlot = (kind, t, pico) => { mutouAlgo = true; return { kind, pico, fim: t + 1.6 }; };
  }
  if (mutante === 'ruido-estourado') {
    const base = sfx.ctx.createBufferSource.bind(sfx.ctx);
    sfx.ctx.createBufferSource = () => {
      const node = base(), start = node.start;
      node.start = t => { mutouAlgo = true; start(t, node.buffer.duration + .1); };
      return node;
    };
  }
  return sfx;
}

/* Cada chamada medida isolada: o LOG é zerado e o relógio do contexto anda, senão
   o gap por voz derrubaria a chamada seguinte e a medição viraria silêncio. */
function tocar(sfx, kind, { vol = 1, pan = 0, delay = 0, andar = 2 } = {}) {
  sfx.ctx.currentTime += andar;
  LOG = novoLog();
  if (mutante === 'voz-clonada') Math.random = () => 0.5;
  const ok = sfx.javaporco(kind, vol, pan, delay);
  Math.random = RANDOM0;
  if (mutante === 'voz-clonada' && ok) mutouAlgo = true;
  return { ok, log: LOG, t0: sfx.ctx.currentTime };
}

const duracao = (log) => {
  if (!log.starts.length || !log.stops.length) return 0;
  const ini = Math.min(...log.starts.map((s) => s.t));
  const fim = Math.max(...log.stops.map((s) => s.t));
  return fim - ini;
};
const pico = (p) => Math.max(p.value, ...p._agenda.map((a) => a[1]), 0);
/* Ganho efetivo: anda do nó que começou até o `destination` multiplicando o PICO de
   cada gain do trajeto. Gain isolado sempre parece certo; o que estoura é o produto.
   Devolve uma camada por fonte, com o intervalo em que ela está no ar — energia só
   soma entre vozes que tocam JUNTAS, e medir a soma de 3 s de horda não diz nada. */
function camadas(log) {
  const saida = [];
  for (const s of log.starts) {
    let melhor = 0;
    (function anda(n, acc, visto) {
      if (!n || !Array.isArray(n.saidas) || visto.has(n)) return;
      if (n.tipo === 'destination') { melhor = Math.max(melhor, acc); return; }
      const g = n.tipo === 'gain' ? pico(n.gain) : 1;
      for (const d of n.saidas) anda(d, acc * g, new Set([...visto, n]));
    })(s.no, 1, new Set());
    const fim = log.stops.find((p) => p.no === s.no)?.t ?? s.t;
    if (melhor > 0) saida.push({ ganho: melhor, ini: s.t, fim });
  }
  return saida;
}
/* Pior instante: varre os inícios e soma a energia de tudo que estiver no ar ali. */
function energiaDePico(cs) {
  let pior = 0;
  for (const t of cs.map((c) => c.ini)) {
    const soma = cs.filter((c) => c.ini <= t && c.fim > t).reduce((s, c) => s + c.ganho * c.ganho, 0);
    pior = Math.max(pior, Math.sqrt(soma));
  }
  return pior;
}
/* Timbre da chamada. Os instantes entram RELATIVOS ao início: tempo absoluto anda
   sozinho com o relógio do contexto e faria duas vozes idênticas parecerem diferentes. */
const assinatura = (log) => {
  const ini = log.starts.length ? Math.min(...log.starts.map((s) => s.t)) : 0;
  return log.criados
    .filter((n) => n.frequency)
    .map((n) => `${n.tipo}:${n.frequency.value.toFixed(2)}:${n.frequency._agenda.map((a) => Number(a[1]).toFixed(2)).join('/')}`)
    .join('|') + '#' + log.stops.map((s) => (s.t - ini).toFixed(4)).join(',');
};
const erros = [], notas = [];
const conferir = (id, ok, msgRuim, msgBoa) => (ok ? notas.push(`${id} ${msgBoa}`) : erros.push(`${id} ${msgRuim}`));

// ── JAV1: as quatro vozes existem ─────────────────────────────────────────
{
  const sfx = novoSfx();
  const mudas = [];
  for (const kind of ['rosnado', 'carga', 'morte', 'horda']) {
    const r = tocar(sfx, kind);
    if (!r.ok || r.log.starts.length === 0) mudas.push(kind);
  }
  conferir('JAV1', mudas.length === 0,
    `voz sem som: ${mudas.join(', ') || '—'} não produziu nó nenhum`,
    'as quatro vozes (rosnado, carga, morte, horda) tocam.');
}

// ── JAV2: duração dentro da faixa pedida ──────────────────────────────────
{
  const sfx = novoSfx();
  const fora = [];
  const medidas = {};
  const media = {};
  for (const kind of ['rosnado', 'carga', 'morte', 'horda']) {
    const ds = [];
    for (let i = 0; i < 24; i++) ds.push(duracao(tocar(sfx, kind).log));
    medidas[kind] = [Math.min(...ds), Math.max(...ds)];
    media[kind] = ds.reduce((s, d) => s + d, 0) / ds.length;
    const [a, b] = FAIXA[kind];
    if (!(medidas[kind][0] >= a && medidas[kind][1] <= b)) {
      fora.push(`${kind} ${medidas[kind][0].toFixed(3)}–${medidas[kind][1].toFixed(3)}s fora de ${a}–${b}s`);
    }
  }
  /* Média, não extremo: as faixas de sorteio quase se tocam e comparar mínimo com
     máximo transformaria um sorteio azarado em régua vermelha sem defeito nenhum. */
  if (media.carga >= media.rosnado * 0.8) fora.push('o bufo da carga não é mais rápido que o rosnado');
  conferir('JAV2', fora.length === 0,
    `duração fora do pedido: ${fora.join('; ')}`,
    `durações no pedido: rosnado ${medidas.rosnado.map((v) => v.toFixed(2)).join('–')}s, `
    + `carga ${medidas.carga.map((v) => v.toFixed(2)).join('–')}s, `
    + `morte ${medidas.morte.map((v) => v.toFixed(2)).join('–')}s, `
    + `horda ${medidas.horda.map((v) => v.toFixed(2)).join('–')}s.`);
  const instantes = tocar(sfx, 'horda').log.starts.map((s) => s.t);
  const defasados = new Set(instantes.map((t) => t.toFixed(3))).size;
  conferir('JAV2b', defasados >= 3,
    `a horda nasceu com ${defasados} instante(s) distinto(s): não é camada de fundo, é um grunhido só`,
    `a horda empilha ${defasados} grunhidos defasados.`);
}

// ── JAV3: nenhuma chamada soa igual à anterior ────────────────────────────
{
  const sfx = novoSfx();
  const fora = [];
  for (const kind of ['rosnado', 'carga', 'morte', 'horda']) {
    const vistas = new Set();
    for (let i = 0; i < 16; i++) vistas.add(assinatura(tocar(sfx, kind).log));
    if (vistas.size < 14) fora.push(`${kind}: só ${vistas.size} timbres em 16 chamadas`);
  }
  conferir('JAV3', fora.length === 0,
    `voz clonada — ${fora.join('; ')}`,
    'as vozes sorteiam duração, recorte e velocidade a cada chamada.');
}

{
  const sfx = novoSfx();
  const samples = kind => tocar(sfx, kind).log.starts.map(s => s.no.buffer);
  const grunt = sfx._boarSamples.get('grunhido'), squeal = sfx._boarSamples.get('guincho');
  const ok = samples('rosnado').every(b => b === grunt) && samples('carga').every(b => b === squeal)
    && samples('morte').every(b => b === squeal) && grunt !== squeal;
  conferir('JAV4', ok, 'grunhido e guincho não usam as gravações distintas pedidas',
    'rosnado usa grunhido; carga e morte usam guincho com recortes distintos.');
}

// ── JAV5: o teto de vozes segura a horda, e vaga livre volta a ser usada ──
{
  const sfx = novoSfx();
  let concedidas = 0;
  /* Granada no meio da horda: dezenas de mortes NO MESMO instante. `vol` baixo = bicho
     longe, então sobra energia e quem segura é a CONTAGEM de vozes simultâneas. */
  for (let i = 0; i < 60; i++) if (sfx.javaporco('morte', 0.2)) concedidas++;
  conferir('JAV5', concedidas === JAVAPORCO_LIMITES.vozes,
    `teto ignorado: ${concedidas} vozes concedidas de 60 pedidos (teto ${JAVAPORCO_LIMITES.vozes})`,
    `60 mortes no mesmo instante viraram ${concedidas} vozes (teto ${JAVAPORCO_LIMITES.vozes}).`);
  sfx.ctx.currentTime += 5;
  conferir('JAV5b', sfx.javaporco('rosnado', 0.2) === true,
    'voz encerrada não devolveu a vaga: o modo fica mudo depois da primeira onda',
    'voz que terminou devolve a vaga para a onda seguinte.');
  const seguidas = [sfx.javaporco('rosnado', 0.2), sfx.javaporco('rosnado', 0.2)];
  conferir('JAV5c', seguidas[1] === false,
    'dois rosnados no mesmo instante passaram: o intervalo mínimo por voz não existe',
    'dois rosnados no mesmo instante: o segundo é descartado pelo intervalo mínimo.');
}

// ── JAV6: ganho por caminho e energia somada dentro do teto ───────────────
{
  const sfx = novoSfx();            // master em 1: o teto é do bicho, não do volume do usuário
  LOG = novoLog();
  /* Onda inteira em cima do jogador: quatro vozes, volume cheio, tudo no mesmo punhado
     de milissegundos. É o pior caso real — horda nascendo enquanto o jogador atira. */
  for (let i = 0; i < 48; i++) sfx.javaporco(['rosnado', 'carga', 'morte', 'horda'][i % 4], 1, 0, (i % 6) * 0.03);
  const cs = camadas(LOG);
  const maior = cs.length ? Math.max(...cs.map((c) => c.ganho)) : 0;
  const energia = energiaDePico(cs);
  conferir('JAV6', maior > 0 && maior <= JAVAPORCO_LIMITES.ganho && energia <= JAVAPORCO_LIMITES.ganho,
    `ganho estourado: maior caminho ${maior.toFixed(3)}, energia simultânea ${energia.toFixed(3)} (teto ${JAVAPORCO_LIMITES.ganho})`,
    `48 pedidos colados: maior caminho ${maior.toFixed(3)} e energia simultânea ${energia.toFixed(3)} cabem no teto ${JAVAPORCO_LIMITES.ganho}.`);
  /* O teto vem do módulo, então a cláusula acima acompanharia qualquer número que
     alguém escrevesse lá — inclusive 5. Aqui ele responde pela própria sanidade. */
  const L = JAVAPORCO_LIMITES;
  conferir('JAV6b', L.ganho > 0 && L.ganho <= 1 && L.vozes >= 4 && L.vozes <= 16 && L.minPico > 0,
    `teto implausível: ganho ${L.ganho}, vozes ${L.vozes}, mínimo ${L.minPico} — teto que aceita tudo não é teto`,
    `teto declarado é plausível: ganho ${L.ganho}, ${L.vozes} vozes, pico mínimo ${L.minPico}.`);
}

{
  const sfx = novoSfx();
  const kinds = ['rosnado', 'carga', 'morte', 'horda', 'fucar'];
  const ok = kinds.every(kind => {
    const voice = tocar(sfx, kind);
    return voice.ok && voice.log.starts.length > 0 && voice.log.starts.every(s => s.tipo === 'src');
  });
  conferir('JAV4b', ok, 'voz voltou a usar oscilador ou ficou muda', 'as vozes do bicho usam somente gravações, sem oscilador.');
}

// ── JAV7: pan e delay chegam ao grafo ─────────────────────────────────────
{
  const sfx = novoSfx();
  const r = tocar(sfx, 'morte', { pan: -0.7, delay: 0.25 });
  const pan = r.log.panners[0]?.pan.value ?? 0;
  const inicio = r.log.starts.length ? Math.min(...r.log.starts.map((s) => s.t)) : null;
  conferir('JAV7', Math.abs(pan + 0.7) < 1e-6 && inicio !== null && Math.abs(inicio - (r.t0 + 0.25)) < 1e-6,
    `pan/atraso perdidos: pan ${pan}, começou em ${inicio === null ? 'lugar nenhum (voz muda)' : `${(inicio - r.t0).toFixed(3)}s`} em vez de 0.250s`,
    'pan e atraso do modo chegam intactos ao grafo.');
}

// ── JAV8: pedido impossível devolve false sem estourar ────────────────────
{
  const sfx = novoSfx();
  const longe = sfx.javaporco('rosnado', 0);
  const inventada = sfx.javaporco('oinc');
  const morto = new Sfx();
  morto.disabled = true;
  let explodiu = false;
  let mudo = true;
  try { mudo = morto.javaporco('morte') === false; } catch { explodiu = true; }
  conferir('JAV8', longe === false && inventada === false && mudo && !explodiu,
    `pedido impossível não foi descartado: longe=${longe}, inventada=${inventada}, sem contexto=${mudo}, exceção=${explodiu}`,
    'bicho longe demais, voz inexistente e contexto morto devolvem false sem exceção.');
}

// ── JAV9: o ruído do fuço cabe no buffer até o fim da voz ─────────────────
{
  const sfx = novoSfx();
  /* O buffer de ruído é CACHEADO e tocado com offset e rate sorteados: offset alto
     numa voz longa acaba o buffer no meio e o fim do guincho sai mudo. */
  const estouros = [];
  for (const kind of ['rosnado', 'carga', 'morte', 'horda']) {
    for (let i = 0; i < 24; i++) {
      const log = tocar(sfx, kind).log;
      for (const s of log.starts.filter((x) => x.tipo === 'src')) {
        const fim = log.stops.find((p) => p.no === s.no)?.t ?? s.t;
        const consumo = (fim - s.t) * s.no.playbackRate.value;
        const total = (s.offset || 0) + consumo;
        if (total > (s.no.buffer?.duration ?? 0) + 1e-9) estouros.push(`${kind} ${total.toFixed(2)}s`);
      }
    }
  }
  conferir('JAV9', estouros.length === 0,
    `gravação acaba antes da voz em ${estouros.length} fonte(s) — ex.: ${estouros.slice(0, 3).join(', ')}`,
    'offset e rate cabem na gravação até o fim de cada voz.');
}

/* Lição 8: mutação que não aplicou parece mutação que passou. */
if (mutante && !mutouAlgo) {
  console.error(`\x1b[31mmutante ${mutante} não chegou a ser aplicado\x1b[0m`);
  process.exit(1);
}

const rotulo = mutante ? `JAVAPORCOS-AUDIO [mutante=${mutante}]` : 'JAVAPORCOS-AUDIO';
for (const n of notas) console.log(`  \x1b[32m✓\x1b[0m ${n}`);
if (erros.length) {
  for (const e of erros) console.error(`  \x1b[31m✗\x1b[0m ${e}`);
  console.error(`\n${rotulo}: VERMELHO — ${erros.length} cláusula(s) caíram.\n`);
  process.exit(1);
}
console.log(`\n${rotulo}: verde — o javaporco rosna, bufa, guincha e a horda cabe no master.\n`);
