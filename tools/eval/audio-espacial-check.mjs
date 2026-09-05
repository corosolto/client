/* ============================================================================
   audio-espacial-check.mjs — O TIRO POR SAMPLE OUVE A DISTÂNCIA? (ESP)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   `game.js:6336` calcula três coisas por tiro de bot e entrega para o áudio:

       this.sfx.shotWeapon(b.weapon, _sd, 0.45, _pan, Math.min(0.25, _sd / 343));
                                      ↑          ↑     ↑
                                   distância    pan   atraso de propagação

   O caminho SINTETIZADO (`_gunshot`) usa os três: mistura near/far por distância,
   põe um `StereoPanner` quando o pan não é zero, e agenda tudo em
   `currentTime + propDelay`. O caminho por SAMPLE, que é o que o piloto Fab vai
   ligar (`weaponSamples: true` no manifest), fazia isto:

       if (this.pack?.weaponSamples) { … this.duck(0.3, 0.16); this._sample(f, vol); return; }

   `_sample` é `new Audio(...).play()`: HTMLAudio, sem grafo, sem pan, sem
   agendamento. Os três números que o jogo calculou eram descartados na entrada.
   Efeito no jogo: bot atirando às suas costas a 40 m soa exatamente igual a bot
   atirando à sua frente a 2 m. É a informação de jogo que o dono cobrou em
   `game.js:6331` ("não vejo de onde vem o tiro, parece cheater") — resolvida no
   synth e perdida assim que o pack de samples entrasse.

   E o `duck` de `0.3` fixo é a lição 2 em miniatura: o synth ducka
   `dist < 12 ? 0.3 : 0.55`. Duas rotinas para o mesmo conceito, dois limiares.

   ── COMO ELA MEDE: GRAFO FALSO, CÓDIGO DE PRODUÇÃO REAL ────────────────────
   Não há navegador aqui e não há WAV: o pack do piloto é privado e a listagem
   proíbe uso com IA. Então a régua planta um `AudioContext` FALSO que grava o
   grafo (nós criados, ligações, ganhos, `pan`, instantes de `start`) e importa
   `public/js/audio.js` **de verdade**. O que se mede é a rotina de produção
   decidindo — não uma imitação dela.

   A fixture de áudio é sintética: `fetch` devolve um ArrayBuffer de 32 bytes e
   `decodeAudioData` devolve um buffer falso de 0,25 s. Nenhum byte do pack Fab
   entra aqui, hoje ou depois.

     ESP1  cache frio não silencia: o primeiro tiro toca de algum jeito.
     ESP1b pré-carga da partida: o primeiro tiro real usa um único BufferSource
           do WAV, sem synth de contingência nem camadas sobrepostas.
     ESP2  pan: `pan` ≠ 0 vira um `StereoPanner` com esse valor no caminho sample.
     ESP3  propagação: o som começa em `currentTime + propDelay`, não em zero.
     ESP4  duck: o caminho sample ducka pela MESMA regra do synth (`<12 ? .3 : .55`).
     ESP5  IRMÃ (lição 1): o caminho SYNTH continua satisfazendo ESP2 e ESP3.
           Sem ela, apagar a espacialização dos dois lados deixaria a régua verde.
     ESP6  fallback preservado: sem `weaponSamples`, ou com a arma fora de
           `weapons`, o synth toca. O veto do dono é que o fallback não morra.
     ESP8  sample que não carrega (404/decode) cai no SYNTH — na primeira chamada
           e em todas as seguintes —, nunca em HTMLAudio numa URL morta.
     ESP9  rajada com cache frio faz UMA requisição, não uma por tiro.
     ESP10 rajada com buffer quente limita caudas simultâneas do mesmo sample.
     ESP7  o volume do usuário entra UMA vez. `_sample` aplica `this.vol` na mão
           porque HTMLAudio não passa pelo `master`; um BufferSource passa, e
           repetir a conta ali derruba o sample em `this.vol`× sem erro nenhum.
           Foi assim que a própria régua pegou um defeito introduzido pelo
           conserto da ESP2/ESP3 — o ganho até o destino dava 0,1519 onde a conta
           certa é 0,2170 (medido com vol 0,5, this.vol 0,7, GUN_VOL 0,62).

   ── O QUE ELA NÃO MEDE, E POR QUÊ ──────────────────────────────────────────
   A LEI DE VOLUME POR DISTÂNCIA fica de fora de propósito. O synth não atenua o
   nível com a distância — ele troca o TIMBRE (perto = crack, longe = boom), e o
   chamador manda `vol` fixo em 0,45 para bot de qualquer distância. Escolher
   quanto um sample de 40 m deve perder é decisão de ouvido, não de teste, e teto
   sem procedência é opinião (lei 2 do `AGENTS.md`). Fica como bloqueio explícito
   no `docs/audio/FAB-PILOT-HANDOFF.md`, para escuta A/B do dono.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=sem-pan          zera o pan na entrada do Sfx  -> ESP2 e ESP5 vermelhas
     --mutante=sem-propagacao   zera o propDelay na entrada   -> ESP3 e ESP5 vermelhas
     --mutante=duck-fixo        devolve o duck ao 0.3 fixo    -> ESP4 vermelha

   As três mutam a ENTRADA ou a saída observada, nunca o arquivo em disco: mutante
   que não aplica parece mutante que passou (lição 8), então cada uma confere que
   mudou alguma coisa antes de medir.

   Uso: node tools/eval/audio-espacial-check.mjs [--mutante=…]
   ============================================================================ */
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['sem-pan', 'sem-propagacao', 'duck-fixo'].includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

/* ── grafo falso ───────────────────────────────────────────────────────────
   Grava o suficiente para responder às cláusulas e nada além: quem cria nó,
   quem liga em quem, que valor o parâmetro recebeu e em que instante um nó
   começou. Sem simular DSP — a régua pergunta pela DECISÃO, não pelo som. */
let LOG = null;
const novoLog = () => ({ starts: [], stops: [], panners: [], html: [], ducks: [], nos: 0 });

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
  LOG.nos++;
  const n = {
    tipo, saidas: [],
    connect(dst) { n.saidas.push(dst); return dst; },
    disconnect() {},
    ...extra,
  };
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
    n.stop = () => {};
    return n;
  }
  createBufferSource() {
    const n = no('src', { buffer: null, loop: false, playbackRate: param(1), detune: param(0) });
    n.start = (t = this.currentTime) => LOG.starts.push({ tipo: 'src', t, no: n });
    n.stop = (t) => LOG.stops.push({ t, no: n });
    return n;
  }
  createBuffer(ch, n, sr) {
    const dados = Array.from({ length: ch }, () => new Float32Array(n));
    return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (i) => dados[i] };
  }
  decodeAudioData() { DECODES++; return Promise.resolve(this.createBuffer(1, 12000, this.sampleRate)); }
}

/* ── ambiente de navegador mínimo ─────────────────────────────────────────── */
globalThis.window = globalThis;
/* `?gunvol=1` neutraliza o GUN_VOL (0.62 por padrão) para a ESP7 poder fazer a
   conta exata sem copiar o número para cá — teto copiado é teto que envelhece. */
globalThis.location = { search: '?gunvol=1', href: 'http://regua/' };
globalThis.AudioContext = CtxFalso;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
globalThis.setTimeout = globalThis.setTimeout;
class AudioFalso {
  constructor(src) { this.src = src; this.volume = 1; this.playbackRate = 1; LOG.html.push(this); }
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { this.tocou = true; return Promise.resolve(); }
}
globalThis.Audio = AudioFalso;
/* `FETCH_404` deixa a régua simular o pacote que não chegou — release trocada, zip
   parcial, caminho errado no manifest. É o cenário da ESP8. */
let FETCH_404 = false;
let FETCHES = 0, DECODES = 0;
globalThis.fetch = async () => {
  FETCHES++;
  return FETCH_404
    ? { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }
    : { ok: true, arrayBuffer: async () => new ArrayBuffer(32) };
};

const { Sfx } = await import('../../public/js/audio.js');

const ARMA = 'ak', SRC = 'audio/fab/ak-1p-shot.wav';
const PERTO = { dist: 0, pan: 0, prop: 0 };
const LONGE = { dist: 40, pan: -0.8, prop: 40 / 343 };

/* Um Sfx por cenário: cache de buffer e round-robin guardam estado entre tiros,
   e cenário que herda estado do anterior mede o anterior. */
let mutouAlgo = false;
async function tiro({ samples, dist, pan, prop, arma = ARMA, aquecer = true, vol = 1, fetch404 = false }) {
  FETCH_404 = fetch404;
  LOG = novoLog();
  const sfx = new Sfx();
  sfx.pack = samples ? { weaponSamples: true, weapons: { [ARMA]: [SRC] } } : { weapons: {} };
  const ducks = [];
  const duck0 = sfx.duck.bind(sfx);
  /* `duck-fixo` observa o duck como ele era antes do conserto (0.3 constante).
     Muta o ponto de OBSERVAÇÃO, não o arquivo — e só quando o caminho medido é o
     do sample, senão a mutação apagaria também a cláusula irmã. */
  sfx.duck = (amt, hold) => {
    ducks.push({ amt: mutante === 'duck-fixo' && samples ? 0.3 : amt, hold });
    return duck0(amt, hold);
  };
  sfx.ensure();
  /* A mutação entra DENTRO do Sfx e a cláusula continua cobrando o valor PEDIDO.
     Mutar o valor pedido seria mutação que se auto-anula: com propDelay 0 dos dois
     lados, "começou cedo demais" nunca acontece e a régua ficaria verde num código
     quebrado — lição 8. */
  const p = pan, d = prop;
  if (mutante === 'sem-pan' || mutante === 'sem-propagacao') {
    const s0 = sfx.shotWeapon.bind(sfx);
    sfx.shotWeapon = (w, dd, vv, pp, tt) => {
      mutouAlgo = mutouAlgo || (mutante === 'sem-pan' ? pp !== 0 : tt !== 0);
      return s0(w, dd, vv, mutante === 'sem-pan' ? 0 : pp, mutante === 'sem-propagacao' ? 0 : tt);
    };
  }
  if (aquecer) {
    /* Primeiro tiro = cache frio (ESP1). O segundo é o que ESP2/ESP3 medem: é o
       regime do jogo, onde a mesma arma dispara centenas de vezes por partida. */
    sfx.shotWeapon(arma, dist, vol, p, d);
    for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
  }
  const frio = { html: LOG.html.slice(), starts: LOG.starts.slice() };
  LOG = novoLog();
  const t0 = sfx.ctx.currentTime;
  ducks.length = 0;
  sfx.shotWeapon(arma, dist, vol, p, d);
  await new Promise((r) => setImmediate(r));
  return { sfx, t0, frio, log: LOG, ducks, panAplicado: p, propAplicado: d };
}

/* Ganho efetivo do caminho por sample: percorre o grafo do BufferSource até o
   `destination` multiplicando todo `gain.value` do trajeto. É a única forma de ver
   `this.vol` aplicado duas vezes — cada nó isolado parece certo. */
function ganhoAteDestino(log) {
  const raiz = log.starts.find((s) => s.tipo === 'src')?.no;
  if (!raiz) return null;
  let melhor = null;
  (function anda(n, acc, visto) {
    if (visto.has(n)) return;
    if (n.tipo === 'destination') { melhor = melhor === null ? acc : Math.max(melhor, acc); return; }
    const g = n.tipo === 'gain' ? n.gain.value : 1;
    for (const d of n.saidas) anda(d, acc * g, new Set([...visto, n]));
  })(raiz, 1, new Set());
  return melhor;
}

const erros = [], notas = [];
const conferir = (id, ok, msgRuim, msgBoa) => (ok ? notas.push(`${id} ${msgBoa}`) : erros.push(`${id} ${msgRuim}`));

// ── ESP1: cache frio não silencia ─────────────────────────────────────────
{
  const r = await tiro({ samples: true, ...LONGE, aquecer: false });
  const tocou = r.log.html.some((a) => a.tocou) || r.log.starts.length > 0;
  conferir('ESP1', tocou,
    'o PRIMEIRO tiro por sample (cache de buffer frio) não produziu som nenhum —'
    + ' trocar HTMLAudio por WebAudio não pode custar o tiro que abre a partida.',
    'cache frio não silencia: o primeiro tiro toca.');
}

// ── ESP1b: partida pré-carregada não cai no synth nem soma fontes ─────────
{
  FETCHES = 0; DECODES = 0; FETCH_404 = false;
  LOG = novoLog();
  const sfx = new Sfx();
  sfx.pack = { weaponSamples: true, weapons: { [ARMA]: [SRC] } };
  sfx.ensure();
  await sfx.preloadWeaponSamples([ARMA]);
  LOG = novoLog();
  sfx.shotWeapon(ARMA, PERTO.dist, 1, PERTO.pan, PERTO.prop);
  const fontes = LOG.starts.filter((s) => s.tipo === 'src').length;
  const tons = LOG.starts.filter((s) => s.tipo === 'osc').length;
  conferir('ESP1b', FETCHES === 1 && DECODES === 1 && fontes === 1 && tons === 0,
    `depois do preload houve ${FETCHES} fetch(es), ${DECODES} decode(s), ${fontes} BufferSource(s)`
      + ` e ${tons} oscilador(es). O primeiro tiro da partida deve ser só o WAV já decodificado,`
      + ' sem synth de cache frio e sem ataque/sub sobreposto.',
    'pré-carga deixa o primeiro tiro com uma única fonte WAV, sem synth sobreposto.');
}

// ── ESP2 / ESP3 / ESP4: o caminho sample honra pan, propagação e duck ─────
{
  const r = await tiro({ samples: true, ...LONGE });
  const panners = r.log.panners.filter((n) => Math.abs(n.pan.value) > 0.001);
  conferir('ESP2', panners.some((n) => Math.abs(n.pan.value - r.panAplicado) < 0.01),
    `o caminho por sample não pôs o pan ${r.panAplicado} em nenhum StereoPanner.`
    + ' `game.js:6334` calcula a direção do bot e ela é descartada — o jogador não'
    + ' ouve de que lado vem o tiro. O synth (`_gunshot`) já faz isso.',
    `pan ${r.panAplicado} aplicado no caminho por sample.`);

  const cedo = r.log.starts.filter((s) => s.t < r.t0 + r.propAplicado * 0.5);
  conferir('ESP3', r.log.starts.length > 0 && cedo.length === 0,
    (r.log.starts.length === 0
      ? 'o caminho por sample não agendou nada no grafo — toca por HTMLAudio, que não tem `start(t)`.'
      : `o caminho por sample começou ${cedo.length} de ${r.log.starts.length} disparos antes de`
        + ` currentTime + ${r.propAplicado.toFixed(3)}s.`)
    + ' O atraso de propagação que `game.js:6336` calcula (dist/343) é descartado —'
    + ' tiro de 40 m chega junto com o clarão.',
    `propagação de ${r.propAplicado.toFixed(3)}s respeitada no caminho por sample.`);

  const esperado = LONGE.dist < 12 ? 0.3 : 0.55;
  const visto = r.ducks.map((d) => d.amt);
  conferir('ESP4', visto.some((a) => Math.abs(a - esperado) < 0.001),
    `o caminho por sample duckou em ${visto.join('/') || '(nada)'} a ${LONGE.dist} m;`
    + ` o synth ducka ${esperado} nessa distância (\`dist < 12 ? 0.3 : 0.55\`).`
    + ' Duas rotinas para o mesmo conceito com limiar diferente é a lição 2.',
    `duck ${esperado} igual ao do synth a ${LONGE.dist} m.`);

  const perto = await tiro({ samples: true, ...PERTO });
  const esperadoPerto = 0.3;
  conferir('ESP4b', perto.ducks.some((d) => Math.abs(d.amt - esperadoPerto) < 0.001),
    `a ${PERTO.dist} m o caminho por sample duckou em ${perto.ducks.map((d) => d.amt).join('/') || '(nada)'},`
    + ` e o synth ducka ${esperadoPerto}. Um duck constante não é "igual ao synth": é coincidir num ponto.`,
    `duck ${esperadoPerto} igual ao do synth a ${PERTO.dist} m — a regra é a mesma, não o número.`);
}

// ── ESP7: o volume do usuário entra UMA vez ───────────────────────────────
{
  const r = await tiro({ samples: true, ...LONGE, vol: 0.5 });
  const g = ganhoAteDestino(r.log);
  const esperado = 0.5 * r.sfx.vol;   // GUN_VOL neutralizado por ?gunvol=1: sobra vol × this.vol
  conferir('ESP7', g !== null && Math.abs(g - esperado) < 1e-6,
    `o ganho do caminho por sample até o destino deu ${g === null ? '(sem caminho)' : g.toFixed(4)},`
    + ` e ${esperado.toFixed(4)} é vol × this.vol. HTMLAudio não passa pelo \`master\`, então \`_sample\``
    + ' aplica `this.vol` na mão; o BufferSource passa, e repetir a conta ali deixa o sample'
    + ` ${r.sfx.vol}× mais baixo que antes. O synth (\`_gunshot\`) não multiplica por this.vol.`,
    `volume do usuário aplicado uma vez só (ganho ${g?.toFixed(4)} = ${esperado.toFixed(4)}).`);
}

// ── ESP8: sample que não carrega cai no SYNTH, não em silêncio ────────────
{
  const r = await tiro({ samples: true, ...LONGE, fetch404: true });
  /* Primeira chamada: o buffer ainda não existe. Segunda: o `_shotBuf` já guarda a
     falha. As duas têm que tocar, e por synth — repetir HTMLAudio numa URL que
     acabou de dar 404 é tocar silêncio com cara de som. */
  /* O limiar não é escolhido: é MEDIDO. O mesmo tiro pelo caminho synth puro, na
     mesma distância, é o controle — o 404 tem que produzir o mesmo tanto de som,
     porque é literalmente o synth que assume. */
  const controle = (await tiro({ samples: false, ...LONGE })).log.starts.length;
  const nosFrio = r.frio.starts.length;
  const nosDepois = r.log.starts.length;
  const htmlDepois = r.log.html.length;
  conferir('ESP8', controle > 0 && nosFrio === controle && nosDepois === controle && htmlDepois === 0,
    `com o sample em 404, a 1ª chamada agendou ${nosFrio} disparo(s) e a 2ª ${nosDepois},`
    + ` contra ${controle} do synth puro na mesma distância, e ${htmlDepois} HTMLAudio criado(s).`
    + ' O esperado é o synth nas duas e ZERO HTMLAudio:'
    + ' `_shotSample` devolvia `true` mesmo depois de gravar a falha, então `shotWeapon`'
    + ' retornava antes do synth e o jogo repetia `new Audio()` numa URL que não existe —'
    + ' silêncio a cada tiro, para sempre, com um warn só no console.',
    `sample em 404 cai no synth na 1ª e nas seguintes (${nosFrio} e ${nosDepois} disparos,`
    + ` iguais aos ${controle} do synth puro), sem nenhum HTMLAudio.`);
}

// ── ESP9: rajada com cache frio faz UMA requisição, não uma por tiro ──────
{
  /* `_shotBuf.set(url, undefined)` era sentinela que não sentinelava: `.get()`
     devolve `undefined` tanto para chave ausente quanto para chave posta como
     undefined. Em full-auto (8 bots, ~50 tiros/s no `game.js:6329`) cada tiro
     antes do decode terminar reabria fetch e decode do MESMO arquivo. */
  FETCHES = 0; DECODES = 0; FETCH_404 = false;
  LOG = novoLog();
  const sfx = new Sfx();
  sfx.pack = { weaponSamples: true, weapons: { [ARMA]: [SRC] } };
  sfx.ensure();
  const RAJADA = 10;
  for (let i = 0; i < RAJADA; i++) sfx.shotWeapon(ARMA, LONGE.dist, 1, LONGE.pan, LONGE.prop);
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
  conferir('ESP9', FETCHES === 1 && DECODES === 1,
    `rajada de ${RAJADA} tiros com cache frio disparou ${FETCHES} fetch(es) e ${DECODES} decode(s)`
    + ' do MESMO arquivo; o esperado é 1 e 1. Sem estado in-flight, `_shotBuf.get()` devolve'
    + ' `undefined` tanto para ausente quanto para carregando, e cada tiro reabre o download.',
    `rajada de ${RAJADA} tiros com cache frio: ${FETCHES} fetch, ${DECODES} decode.`);
}

// ── ESP10: caudas longas não acumulam dezenas de vozes por arma ───────────
{
  LOG = novoLog();
  const sfx = new Sfx();
  sfx.pack = { weaponSamples: true, weapons: { [ARMA]: [SRC] } };
  sfx.ensure();
  sfx._shotBuf = new Map([[SRC, { duration: 3.5 }]]);
  const RAJADA = 12;
  for (let i = 0; i < RAJADA; i++) sfx.shotWeapon(ARMA, PERTO.dist, 1, PERTO.pan, PERTO.prop);
  const ativas = sfx._shotVoices?.filter((v) => v.url === SRC).length ?? RAJADA;
  const cortesImediatos = LOG.stops.filter((s) => s.t === undefined || s.t <= sfx.ctx.currentTime).length;
  conferir('ESP10', ativas <= 4 && cortesImediatos >= RAJADA - 4,
    `rajada de ${RAJADA} tiros com cauda de 3,5 s deixou ${ativas} vozes do mesmo sample ativas`
    + ` e fez ${cortesImediatos} corte(s) imediato(s). O teto é 4 por sample; sem ele, automáticas`
    + ' acumulam dezenas de BufferSources e mascaram passos, granadas e vozes.',
    `rajada de ${RAJADA} tiros manteve ${ativas} vozes do sample e cortou ${cortesImediatos} caudas antigas.`);

  LOG = novoLog();
  const mistura = new Sfx(); mistura.ensure();
  const urls = Array.from({ length: 20 }, (_, i) => `audio/fab/arma-${i}.wav`);
  mistura._shotBuf = new Map(urls.map((url) => [url, { duration: 3.5 }]));
  for (const url of urls) mistura._shotSample(url, 20, 1, 0, 0);
  const totalAtivas = mistura._shotVoices?.length ?? urls.length;
  const cortesGlobais = LOG.stops.filter((s) => s.t === undefined || s.t <= mistura.ctx.currentTime).length;
  conferir('ESP10b', totalAtivas <= 16 && cortesGlobais >= urls.length - 16,
    `mistura de ${urls.length} samples deixou ${totalAtivas} vozes ativas e fez ${cortesGlobais} cortes imediatos;`
    + ' o teto global é 16 para bots com armas diferentes não contornarem o teto por take.',
    `mistura de ${urls.length} samples respeitou o teto global (${totalAtivas} ativas, ${cortesGlobais} cortes).`);
}

// ── ESP5: cláusula IRMÃ — o synth continua espacializando ─────────────────
{
  const r = await tiro({ samples: false, ...LONGE });
  const temPan = r.log.panners.some((n) => Math.abs(n.pan.value - r.panAplicado) < 0.01);
  const cedo = r.log.starts.filter((s) => s.t < r.t0 + r.propAplicado * 0.5);
  conferir('ESP5', temPan && r.log.starts.length > 0 && cedo.length === 0,
    'o caminho SYNTH deixou de espacializar (pan '
    + `${temPan ? 'ok' : 'AUSENTE'}, ${cedo.length} de ${r.log.starts.length} disparos cedo demais).`
    + ' Esta é a cláusula irmã: sem ela, apagar a espacialização dos DOIS caminhos'
    + ' deixaria ESP2/ESP3 verdes por ausência de comparação (lição 1).',
    'o synth continua pondo pan e respeitando a propagação — a comparação tem lado bom.');
}

// ── ESP6: fallback synth preservado ───────────────────────────────────────
{
  const semPack = await tiro({ samples: false, ...PERTO });
  const armaSemSample = await tiro({ samples: true, ...PERTO, arma: 'mosin' });
  conferir('ESP6', semPack.log.nos > 20 && armaSemSample.log.nos > 20,
    `sem \`weaponSamples\` (${semPack.log.nos} nós) ou com a arma fora de \`weapons\``
    + ` (${armaSemSample.log.nos} nós) o synth tinha que tocar. Veto do dono: o fallback`
    + ' sintetizado não morre quando o piloto Fab entra.',
    'fallback synth intacto sem `weaponSamples` e para arma fora do pack.');
}

/* Lição 8: mutação que não aplicou parece mutação que passou. A conferência é no
   fim porque só os cenários com pan/propagação não-zero têm o que mutar. */
if ((mutante === 'sem-pan' || mutante === 'sem-propagacao') && !mutouAlgo) {
  console.error(`mutante ${mutante} não interceptou nenhuma chamada com valor não-zero — não aplicou.`);
  process.exit(2);
}
if (mutante === 'duck-fixo' && Sfx.duckTiro(40) === 0.3) {
  console.error('mutante duck-fixo não muda nada: o duck do synth a 40 m já é 0.3 — não aplicou.');
  process.exit(2);
}

const rotulo = mutante ? `ESPACIAL-AUDIO [mutante=${mutante}]` : 'ESPACIAL-AUDIO';
for (const n of notas) console.log(`  ✓ ${n}`);
if (erros.length) {
  console.error(`\n${rotulo}: ${erros.length} cláusula(s) vermelha(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}
console.log(`\n${rotulo}: verde — o tiro por sample honra pan, propagação e duck, e o synth segue de pé.\n`);
