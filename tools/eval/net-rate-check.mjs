/* ============================================================================
   net-rate-check.mjs — A TAXA DE REDE INDEPENDE DO FPS? (BUG-160, issue #1122)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ESTA RÉGUA EXISTE PARA IMPEDIR

   O painel de rede do cliente media snapshots/s contando as mensagens carimbadas
   com `performance.now()` do handler `onmessage` e tomando a contagem da janela
   de 1 s como taxa (`public/js/net.js`, antes deste conserto):

       const now = performance.now(), cut = now - 1000;
       while (this._snapT.length && this._snapT[0] < cut) this._snapT.shift();
       this.stats.hz = this._snapT.length;

   Esse carimbo não é a hora em que o pacote chegou: é a hora em que o QUADRO de
   render liberou a thread e o navegador drenou a fila. Com o quadro durando ΔF,
   cada drenagem entrega R·ΔF snapshots com carimbos quase idênticos, e a janela
   retém até uma drenagem a mais do que devia — erro de até ΔF (1/FPS): +3,3% a
   30 fps, +6,7% a 15 fps, +50% a 2 fps. Quando ΔF passa de 1 s (travada de GPU),
   a janela inteira cabe numa drenagem e a taxa vira R·ΔF: a travada de ≈9,1 s do
   registro deu `snap 274 Hz /30` e `band 191,9 KB/s` num nó que mandava 30 Hz e
   20,8 KB/s. O instrumento acusava tempestade de rede no cenário em que o
   problema era de GPU.

   COMO ELA MEDE

   Executa o MÓDULO DE PRODUÇÃO (`public/js/netrate.js`) contra um servidor
   sintético: R snapshots por segundo, B bytes cada, relógio de servidor próprio,
   latência fixa. O cliente é simulado como quadros de render: entre dois quadros
   a thread está presa, e ao acordar drena TUDO que chegou, com um carimbo local
   só. O mesmo tráfego é passado por 60, 30, 15 e 2 fps e por uma travada de 9,1 s.
   Se a taxa reportada depender do FPS, as médias divergem e a régua acende.

   Os mutantes reescrevem o FONTE do módulo (não uma cópia do algoritmo) e são
   importados de verdade — portão que não cai com a mutação é portão cego.

   Uso: node tools/eval/net-rate-check.mjs [--json] [--mutante=<nome>]
        mutantes: eixo-de-quadros | conta-sem-dividir | janela-parada
   ============================================================================ */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const FONTE = path.join(ROOT, 'public', 'js', 'netrate.js');
const JSON_OUT = process.argv.includes('--json');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  // Volta a carimbar a amostra pelo instante da DRENAGEM — o defeito original.
  'eixo-de-quadros': [
    'const tm = temSrv ? tServidorS * 1000 : tLocalMs;',
    'const tm = tLocalMs;',
  ],
  // Volta a tomar a CONTAGEM da janela como taxa, sem dividir pela duração coberta.
  'conta-sem-dividir': [
    'this.hz = +(n / seg).toFixed(1);',
    'this.hz = n;',
  ],
  // Janela que só anda quando chega pacote: aba oculta congela no último valor bom.
  'janela-parada': [
    'const avanco = Number.isFinite(tLocalMs) ? Math.max(0, tLocalMs - this._ultimoLocal) : 0;',
    'const avanco = 0;',
  ],
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

async function carregaMedidor() {
  const src = readFileSync(FONTE, 'utf8');
  if (!MUT) return (await import(pathToFileURL(FONTE).href)).MedidorDeTaxa;
  const [de, para] = MUTANTES[MUT];
  if (!src.includes(de)) throw new Error(`âncora do mutante '${MUT}' sumiu de netrate.js: ${de}`);
  const dir = mkdtempSync(path.join(tmpdir(), 'netrate-mut-'));
  const alvo = path.join(dir, 'netrate.js');
  writeFileSync(alvo, src.replace(de, para));
  return (await import(pathToFileURL(alvo).href)).MedidorDeTaxa;
}

/* ---------------- servidor e cliente sintéticos ---------------- */
const R = 30;            // snapshots por segundo que o nó manda
const B = 710;           // bytes por snapshot (30 × 710 / 1024 = 20,80 KB/s — o número real do registro)
const LAT_MS = 25;       // latência constante; só desloca a chegada, não muda a taxa
const T0_SRV = 1234.5;   // relógio do servidor começa longe do local, de propósito
const ALVO_KBPS = +((R * B) / 1024).toFixed(2);

/**
 * Roda o medidor contra o tráfego sintético visto por um cliente que renderiza a
 * `fps` quadros por segundo, com uma travada opcional.
 * @returns {{leituras: Array<{t:number,hz:number,kbps:number}>, fimTravada:number}}
 */
function simula(Medidor, { fps, travadaEmMs = null, travadaMs = 0, duracaoMs = 8000, comRelogioServidor = true, silencioApos = null }) {
  const medidor = new Medidor();
  const dtQuadro = 1000 / fps;
  const intervalo = 1000 / R;
  const leituras = [];
  let t = 0, k = 0, travou = false, fimTravada = 0;
  while (t < duracaoMs) {
    const presa = travadaEmMs != null && !travou && t >= travadaEmMs;
    if (presa) { travou = true; t += travadaMs; fimTravada = t; } else t += dtQuadro;
    // a thread acordou: drena TUDO que chegou enquanto ela estava presa, num carimbo só
    for (;;) {
      const tSrv = T0_SRV + k * (intervalo / 1000);
      const chegadaLocal = k * intervalo + LAT_MS;
      if (chegadaLocal > t) break;
      if (silencioApos != null && chegadaLocal > silencioApos) break;
      medidor.amostra(B, comRelogioServidor ? tSrv : null, t);
      k++;
    }
    medidor.atualizar(t);
    leituras.push({ t, hz: medidor.hz, kbps: medidor.kbps });
  }
  return { leituras, fimTravada };
}

const media = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN);
const regime = (leituras, desde) => leituras.filter((l) => l.t >= desde);

/* ---------------- invariantes ---------------- */
const falhas = [];
const linhas = [];
const cobra = (ok, texto) => { (ok ? linhas : falhas).push(texto); return ok; };

const Medidor = await carregaMedidor();

// NR1/NR2 — o mesmo tráfego visto com quatro orçamentos de quadro
const CENARIOS = [60, 30, 15, 2];
const porFps = new Map();
for (const fps of CENARIOS) {
  const { leituras } = simula(Medidor, { fps });
  const estavel = regime(leituras, 2000);
  porFps.set(fps, {
    hz: +media(estavel.map((l) => l.hz)).toFixed(3),
    kbps: +media(estavel.map((l) => l.kbps)).toFixed(3),
    pico: Math.max(...estavel.map((l) => l.hz)),
  });
}
for (const fps of CENARIOS) {
  const m = porFps.get(fps);
  cobra(Math.abs(m.hz - R) <= 0.5,
    `NR1 · a ${fps} fps a taxa medida é ${m.hz} Hz para ${R} Hz reais (tolerância 0,5)`);
}
const medias = CENARIOS.map((f) => porFps.get(f).hz);
const espalhamento = +(Math.max(...medias) - Math.min(...medias)).toFixed(3);
cobra(espalhamento <= 0.1,
  `NR2 · a taxa INDEPENDE do FPS: ${CENARIOS.map((f) => `${f}fps=${porFps.get(f).hz}Hz`).join(' · ')} (espalhamento ${espalhamento} ≤ 0,1)`);

const mediasKb = CENARIOS.map((f) => porFps.get(f).kbps);
const espalhamentoKb = +(Math.max(...mediasKb) - Math.min(...mediasKb)).toFixed(3);
cobra(Math.abs(media(mediasKb) - ALVO_KBPS) <= 0.4 && espalhamentoKb <= 0.1,
  `NR3 · a banda INDEPENDE do FPS: ${CENARIOS.map((f) => `${f}fps=${porFps.get(f).kbps}KB/s`).join(' · ')} (alvo ${ALVO_KBPS}, espalhamento ${espalhamentoKb} ≤ 0,1)`);

// NR4 — a travada de 9,1 s do registro: é ela que produzia os 274 Hz
const TRAVADA_MS = 9100;
const { leituras: comTravada, fimTravada } = simula(Medidor, { fps: 2, travadaEmMs: 3000, travadaMs: TRAVADA_MS, duracaoMs: 20000 });
const picoTravada = Math.max(...comTravada.map((l) => l.hz));
const picoBanda = Math.max(...comTravada.map((l) => l.kbps));
const esperadoDefeito = Math.round((R * TRAVADA_MS) / 1000);
cobra(picoTravada <= R * 1.1,
  `NR4 · travada de ${(TRAVADA_MS / 1000).toFixed(1)} s não infla a taxa: pico ${picoTravada} Hz (teto ${+(R * 1.1).toFixed(1)}; o medidor por quadros dava ~${esperadoDefeito} Hz)`);
cobra(picoBanda <= ALVO_KBPS * 1.1,
  `NR4b · travada não infla a banda: pico ${picoBanda} KB/s (teto ${+(ALVO_KBPS * 1.1).toFixed(2)}; o medidor por quadros dava ~${Math.round((esperadoDefeito * B) / 1024)} KB/s)`);
const depois = regime(comTravada, fimTravada + 2000);
cobra(depois.length > 0 && Math.abs(media(depois.map((l) => l.hz)) - R) <= 0.5,
  `NR4c · depois da travada a taxa volta ao real: ${+media(depois.map((l) => l.hz)).toFixed(2)} Hz`);

// NR5 — aba em segundo plano: quadros param, o tempo não. A taxa tem que CAIR, não congelar.
const { leituras: oculta } = simula(Medidor, { fps: 60, duracaoMs: 14000, silencioApos: 4000 });
const fim = oculta[oculta.length - 1];
const finitos = oculta.every((l) => Number.isFinite(l.hz) && Number.isFinite(l.kbps) && l.hz >= 0);
cobra(finitos, 'NR5 · nenhuma leitura virou NaN/Infinity/negativo durante o silêncio');
cobra(fim.hz === 0 && fim.kbps === 0,
  `NR5b · 10 s sem pacote nenhum zera a leitura em vez de congelar no último valor bom (${fim.hz} Hz · ${fim.kbps} KB/s)`);

// NR6 — primeiros 300 ms de sessão: a janela ainda não cobriu 1 s, e dividir pela
// janela presumida faria o painel anunciar "a rede caiu" na entrada da partida.
const { leituras: inicio } = simula(Medidor, { fps: 60, duracaoMs: 400 });
const aos300 = inicio.filter((l) => l.t >= 280 && l.t <= 400);
const hz300 = aos300.length ? +media(aos300.map((l) => l.hz)).toFixed(2) : NaN;
cobra(Number.isFinite(hz300) && Math.abs(hz300 - R) <= 3,
  `NR6 · janela parcial não mente na entrada: aos ~300 ms reporta ${hz300} Hz para ${R} Hz reais`);

// NR7 — protocolo sem relógio de servidor: degrada para o relógio local sem quebrar.
const { leituras: semT } = simula(Medidor, { fps: 60, comRelogioServidor: false });
const semTEstavel = regime(semT, 2000);
cobra(semTEstavel.every((l) => Number.isFinite(l.hz)) && Math.abs(media(semTEstavel.map((l) => l.hz)) - R) <= 0.5,
  `NR7 · snapshot sem \`t\` (protocolo antigo) cai para o relógio local e segue medindo: ${+media(semTEstavel.map((l) => l.hz)).toFixed(2)} Hz`);

/* ---------------- saída ---------------- */
if (JSON_OUT) {
  console.log(JSON.stringify({
    mutante: MUT || null, falhas, ok: linhas,
    porFps: Object.fromEntries(CENARIOS.map((f) => [f, porFps.get(f)])),
    picoTravada, picoBanda, alvoKbps: ALVO_KBPS,
  }, null, 2));
} else {
  console.log(`\nTAXA DE REDE · independência de FPS${MUT ? ` · MUTANTE '${MUT}'` : ''}`);
  for (const l of linhas) console.log(`  \x1b[32m✓\x1b[0m ${l}`);
  for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
}

if (MUT) {
  const acendeu = falhas.length > 0;
  if (!JSON_OUT) {
    console.log(acendeu
      ? `  \x1b[32m✓\x1b[0m MUTAÇÃO '${MUT}' acendeu ${falhas.length} cláusula(s) — a régua enxerga`
      : `  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nada — portão cego`);
  }
  process.exit(acendeu ? 0 : 1);
}
process.exit(falhas.length ? 1 : 0);
