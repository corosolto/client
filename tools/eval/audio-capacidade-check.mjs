/* ============================================================================
   audio-capacidade-check.mjs — O RUNTIME SABE TOCAR ISSO? (CAP)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   O ledger lista 8 eventos do piloto e deixa qualquer um deles virar
   `decisao: "derivado"` com um derivado `aprovado`. Só que o runtime **não tem
   caminho específico para a maioria deles**:

     · `shotWeapon(w, …)` recebe a arma  -> `weapons.ak` é específico da AK;
     · `bolt()`, `reloadStart()`, `reloadEnd()` NÃO recebem arma — leem
       `cs.bolt` / `cs.reload` / `cs.reloadend`, que valem para o arsenal inteiro;
     · `step(surface)` agora consulta `cs.footstepsBySurface[surface]`;
     · `death()` agora consulta `cs.death` como evento próprio;
     · `impact(surface, ...)` consulta `cs.impactsBySurface[surface]`.

   Aprovar um "passo em concreto" hoje aprovaria um passo que toca em grama,
   metal e água igual. Aprovar um "ferrolho da AK" poria o mesmo ferrolho em 26
   armas. "Morte corporal" e impactos hoje têm caminho próprio; a régua impede
   que essa capacidade volte a ser global ou silenciosa.

   ── COMO ELA MEDE: SONDA CAUSAL, NÃO DECLARAÇÃO ────────────────────────────
   Ler a assinatura de `step(surface)` e concluir "é específico por superfície"
   seria ler a DECLARAÇÃO e não o USO — o buraco da lição 3, que nesta base já
   deixou um mutante passar 20/22 VERDE.

   Então a régua INSTALA uma chave de pack que um caminho específico usaria e
   dispara o evento, olhando o que de fato tocou:

     `arma`    a chave específica da arma toca, e trocar a arma troca o arquivo;
     `superficie` trocar o piso troca o arquivo;
     `evento`  o método consulta a chave exclusiva daquele evento;
     `global`  toca uma chave compartilhada, e a chave específica NUNCA é lida;
     `nenhum`  nenhuma chave de pack é lida — só sai synth.

     CAP1  todo evento declara caminho em arma|superficie|evento|global|nenhum.
     CAP2  o declarado bate com o que a sonda mede (impede a declaração de
           envelhecer sem ninguém notar).
     CAP3  só caminho específico (arma|superficie|evento) pode virar derivado.
           Global e nenhum ficam em `synth`, bloqueados.
     CAP4  IRMÃ: a sonda tem que achar PELO MENOS um `arma`. Sem isso, uma sonda
           quebrada mediria `nenhum` para tudo e bateria com um ledger todo
           `nenhum` — verde por cegueira dos dois lados (lição 1).

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=declara-errado   troca o `caminhoRuntime` de um evento -> CAP2
     --mutante=aprova-sem-caminho  põe `derivado` num evento sem caminho -> CAP3

   Uso: node tools/eval/audio-capacidade-check.mjs [--mutante=…]
   ============================================================================ */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { motivoDeRecusa } from '../audio/politica.mjs';

const LEDGER = 'docs/audio/proveniencia.json';
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['declara-errado', 'aprova-sem-caminho'].includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

/* ── grafo falso: só o suficiente para o `audio.js` rodar em node ────────── */
let TOCADOS = [];
const param = (v = 0) => ({ value: v, setValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; },
  linearRampToValueAtTime() { return this; }, setTargetAtTime() { return this; }, cancelScheduledValues() { return this; } });
const no = (extra = {}) => ({ connect() { return this; }, disconnect() {}, start() {}, stop() {}, ...extra });
class CtxFalso {
  constructor() { this.currentTime = 10; this.sampleRate = 48000; this.state = 'running'; this.destination = no(); }
  resume() {}
  createGain() { return no({ gain: param(1) }); }
  createStereoPanner() { return no({ pan: param(0) }); }
  createBiquadFilter() { return no({ type: '', frequency: param(350), Q: param(1), detune: param(0) }); }
  createDynamicsCompressor() { return no({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) }); }
  createWaveShaper() { return no({ curve: null, oversample: '' }); }
  createConvolver() { return no({ buffer: null }); }
  createOscillator() { return no({ type: '', frequency: param(440), detune: param(0) }); }
  createBufferSource() { return no({ buffer: null, loop: false, playbackRate: param(1), detune: param(0) }); }
  createBuffer(ch, n, sr) { const d = Array.from({ length: ch }, () => new Float32Array(n));
    return { numberOfChannels: ch, length: n, sampleRate: sr, duration: n / sr, getChannelData: (i) => d[i] }; }
  decodeAudioData() { return Promise.resolve(this.createBuffer(1, 12000, this.sampleRate)); }
}
globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://regua/' };
globalThis.AudioContext = CtxFalso;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(0), 0);
globalThis.Audio = class { constructor(src) { TOCADOS.push(decodeURIComponent(src)); this.volume = 1; }
  addEventListener() {} removeEventListener() {} pause() {} play() { return Promise.resolve(); } };
/* Os DOIS caminhos de sample contam: `_sample` faz `new Audio(url)` e
   `_shotSample` faz `fetch(url)` para decodificar no grafo. Gravar só o primeiro
   deixava `ak.shot` medir `nenhum` — e foi a cláusula irmã CAP4 que pegou isso. */
globalThis.fetch = async (url) => { TOCADOS.push(decodeURIComponent(String(url)));
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(32) }; };

const { Sfx } = await import('../../public/js/audio.js');

const ESP = 'ESPECIFICO.wav', GLB = 'GLOBAL.wav', OUTRA = 'OUTRA-ARMA.wav';

/* Cada evento diz: que pack instalar, como disparar, e qual chave seria a
   ESPECÍFICA se o runtime tivesse uma. A sonda não pergunta ao código o que ele
   faz — ela instala as duas chaves e olha qual tocou. */
const SONDAS = {
  'ak.shot': {
    pack: { weaponSamples: true, weapons: { ak: [ESP], m4: [OUTRA] } },
    dispara: (s) => s.shotWeapon('ak', 0, 1, 0, 0),
    disparaOutra: (s) => s.shotWeapon('m4', 0, 1, 0, 0),
    caminhoEspecifico: 'arma',
  },
  'ak.magOut': {
    pack: { weaponSamples: true, cs: { reload: [GLB] }, weapons: { ak: [ESP] }, weaponFoley: { ak: { magOut: [ESP] } } },
    dispara: (s) => s.reloadStart(),
  },
  'ak.magIn': {
    pack: { weaponSamples: true, cs: { reloadend: [GLB] }, weaponFoley: { ak: { magIn: [ESP] } } },
    dispara: (s) => s.reloadEnd(),
  },
  'ak.bolt': {
    pack: { weaponSamples: true, cs: { bolt: [GLB] }, weaponFoley: { ak: { bolt: [ESP] } } },
    dispara: (s) => s.bolt(),
  },
  'passo.concreto': {
    pack: { cs: { footsteps: [GLB], footstepsBySurface: { concrete: [ESP], metal: [OUTRA] } } },
    dispara: (s) => s.step('concrete'),
    disparaOutra: (s) => s.step('metal'),
    caminhoEspecifico: 'superficie',
  },
  'morte.corpo': {
    pack: { cs: { death: [ESP], morte: [ESP] }, general: { death: [ESP] }, death: [ESP] },
    dispara: (s) => s.death(1, 0, 0),
    caminhoEspecifico: 'evento',
  },
  'impacto.concreto': {
    pack: { cs: { impactsBySurface: { concrete: [ESP], metal: [OUTRA] } } },
    dispara: (s) => s.impact('concreto'),
    disparaOutra: (s) => s.impact('metal'),
    caminhoEspecifico: 'superficie',
  },
  'impacto.metal': {
    pack: { cs: { impactsBySurface: { metal: [ESP], concrete: [OUTRA] } } },
    dispara: (s) => s.impact('metal'),
    disparaOutra: (s) => s.impact('concreto'),
    caminhoEspecifico: 'superficie',
  },
};

function sondar(evento) {
  const d = SONDAS[evento];
  if (!d) return { caminho: null, motivo: 'sem sonda escrita para este evento' };
  const novo = () => { const s = new Sfx(); s.pack = JSON.parse(JSON.stringify(d.pack)); s.ensure(); return s; };
  TOCADOS = [];
  d.dispara(novo());
  const tocou = TOCADOS.slice();
  if (!tocou.length) return { caminho: 'nenhum', motivo: 'nenhuma chave de pack foi lida; só saiu synth' };
  if (!tocou.includes(ESP)) return { caminho: 'global', motivo: `tocou ${tocou[0]}, e a chave específica nunca foi lida` };
  /* Tocou a chave específica. Ela é MESMO específica? Só é se trocar o
     discriminador trocar o arquivo. Sem `disparaOutra` não há como variar — e
     não poder variar já é a resposta: o caminho não distingue. */
  if (!d.disparaOutra) {
    if (d.caminhoEspecifico === 'evento') return { caminho: 'evento', motivo: 'tocou a chave exclusiva do evento' };
    return { caminho: 'global', motivo: 'tocou a chave, mas a chamada não aceita discriminador' };
  }
  TOCADOS = [];
  d.disparaOutra(novo());
  const outros = TOCADOS.slice();
  if (outros.includes(OUTRA) && !outros.includes(ESP)) {
    return { caminho: d.caminhoEspecifico || 'arma', motivo: 'trocar o discriminador trocou o arquivo' };
  }
  return { caminho: 'global', motivo: `trocar o discriminador não trocou o arquivo (${outros.join(',') || 'nada'})` };
}

let L;
try { L = JSON.parse(readFileSync(LEDGER, 'utf8')); } catch (e) {
  console.error(`CAPACIDADE: ${LEDGER} não é JSON válido (${e.message}).`);
  process.exit(1);
}

const CAMINHOS = ['arma', 'superficie', 'evento', 'global', 'nenhum'];
const CAMINHOS_ESPECIFICOS = ['arma', 'superficie', 'evento'];
const erros = [], notas = [];
const piloto = L.piloto || [];

if (mutante === 'declara-errado') {
  const alvo = piloto.find((p) => p.caminhoRuntime);
  if (!alvo) { console.error('mutante declara-errado: nenhum evento declara caminhoRuntime — não aplicou.'); process.exit(2); }
  alvo.caminhoRuntime = alvo.caminhoRuntime === 'arma' ? 'nenhum' : 'arma';
}
if (mutante === 'aprova-sem-caminho') {
  const alvo = piloto.find((p) => p.caminhoRuntime && !CAMINHOS_ESPECIFICOS.includes(p.caminhoRuntime));
  if (!alvo) { console.error('mutante aprova-sem-caminho: nenhum evento global/sem caminho — não aplicou.'); process.exit(2); }
  alvo.decisao = 'derivado';
}

const medido = new Map();
for (const p of piloto) medido.set(p.evento, sondar(p.evento));

// ── CAP1 / CAP2 ───────────────────────────────────────────────────────────
for (const p of piloto) {
  const m = medido.get(p.evento);
  if (!CAMINHOS.includes(p.caminhoRuntime)) {
    erros.push(`CAP1 evento \`${p.evento}\` não declara \`caminhoRuntime\` em ${CAMINHOS.join('|')}`
      + ` (veio ${JSON.stringify(p.caminhoRuntime)}). A sonda mediu \`${m.caminho}\`: ${m.motivo}.`);
    continue;
  }
  if (m.caminho && p.caminhoRuntime !== m.caminho) {
    erros.push(`CAP2 evento \`${p.evento}\` declara \`${p.caminhoRuntime}\` e a sonda mediu`
      + ` \`${m.caminho}\` — ${m.motivo}. Declaração que não bate com o uso envelhece sem avisar.`);
  }
}
if (!erros.length && piloto.length) {
  const por = piloto.reduce((a, p) => (a[p.caminhoRuntime] = (a[p.caminhoRuntime] || 0) + 1, a), {});
  notas.push(`CAP1/CAP2 ok: ${piloto.length} evento(s) com caminho declarado e conferido por sonda — `
    + Object.entries(por).map(([k, v]) => `${v} em ${k}`).join(', ') + '.');
}

// ── CAP3: só caminho específico pode virar derivado ──────────────────────
{
  const semCaminho = piloto.filter((p) => p.decisao === 'derivado' && !CAMINHOS_ESPECIFICOS.includes(p.caminhoRuntime));
  if (semCaminho.length) {
    erros.push(`CAP3 ${semCaminho.length} evento(s) marcados \`derivado\` sem caminho de runtime específico`
      + ` (${semCaminho.map((p) => `${p.evento}:${p.caminhoRuntime}`).join(', ')}).`
      + ' O derivado ficaria aprovado no papel e o jogo tocaria outra coisa — ou nada.');
  }
  const aprovadosRuins = (L.derivados || []).filter((d) => {
    const p = piloto.find((x) => x.evento === d.evento);
    return d.aprovacao === 'aprovado' && p && !CAMINHOS_ESPECIFICOS.includes(p.caminhoRuntime);
  });
  if (aprovadosRuins.length) {
    erros.push(`CAP3 ${aprovadosRuins.length} derivado(s) APROVADOS para evento sem caminho específico`
      + ` (ex.: ${aprovadosRuins.slice(0, 3).map((d) => d.arquivo).join(', ')}).`);
  }
  if (!semCaminho.length && !aprovadosRuins.length) {
    notas.push('CAP3 ok: nenhum evento sem caminho específico foi marcado como derivado ou aprovado.');
  }
}

// ── CAP4: a sonda enxerga ─────────────────────────────────────────────────
{
  const achouArma = [...medido.values()].some((m) => m.caminho === 'arma');
  if (!achouArma) {
    erros.push('CAP4 IRMÃ: a sonda não achou NENHUM caminho `arma`. Uma sonda cega mede `nenhum`'
      + ' para tudo e bate com um ledger todo `nenhum` — verde pelos dois lados errados.'
      + ' `ak.shot` passa por `shotWeapon(w, …)` e tem que medir `arma`.');
  } else {
    notas.push('CAP4 ok: a sonda enxerga — `ak.shot` mede `arma` porque trocar a arma troca o arquivo.');
  }
  const achouSuperficie = [...medido.values()].some((m) => m.caminho === 'superficie');
  if (!achouSuperficie) erros.push('CAP4b IRMÃ: a sonda não achou caminho `superficie`; passos poderiam voltar ao pool global sem alarme.');
  else notas.push('CAP4b ok: trocar concreto por metal troca o arquivo de passo observado.');
}

// ── CAP5: a política de publicação reconhece os mesmos caminhos específicos ─
{
  const rel = 'audio/piloto/fixture.wav';
  const bytes = Buffer.from('fixture capacidade específica\n');
  const sha = createHash('sha256').update(bytes).digest('hex');
  const testar = (caminhoRuntime) => motivoDeRecusa(rel, bytes, {
    prefixo: 'audio/piloto/', legadoRes: [],
    porHash: new Map([[sha, { arquivo: rel, evento: 'fixture', fonte: 'propria', aprovacao: 'aprovado' }]]),
    fontes: { propria: { redistribuicao: 'livre' } },
    evento: new Map([['fixture', { decisao: 'derivado', caminhoRuntime }]]),
  }, 'manifest');
  const especificos = CAMINHOS_ESPECIFICOS.filter((c) => testar(c) === null);
  const globaisBarrados = ['global', 'nenhum'].every((c) => testar(c) !== null);
  if (especificos.length !== CAMINHOS_ESPECIFICOS.length || !globaisBarrados) {
    erros.push(`CAP5 a política aceitou ${especificos.join(', ') || 'nenhum'} dos caminhos específicos`
      + ' e/ou deixou global/nenhum passar. A sonda e a allowlist precisam usar a mesma definição.');
  } else notas.push('CAP5 ok: política aceita arma, superfície e evento; continua barrando global e nenhum.');
}

const rotulo = mutante ? `CAPACIDADE [mutante=${mutante}]` : 'CAPACIDADE';
for (const n of notas) console.log(`  ✓ ${n}`);
if (erros.length) {
  console.error(`\n${rotulo}: ${erros.length} cláusula(s) vermelha(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}\n`);
  console.error('  sonda: ' + piloto.map((p) => `${p.evento}=${medido.get(p.evento)?.caminho}`).join(' ') + '\n');
  process.exit(1);
}
console.log(`\n${rotulo}: verde — o ledger só deixa aprovar o que o runtime sabe tocar especificamente.\n`);
