/* RÉGUA DA TELEMETRIA DE CAMPO — o que o jogo conta ao servidor sobre o desempenho dele.

   O painel de admin diz que 20% das amostras de FPS ficam abaixo de 30, e que há sessões
   inteiras a 4-8 FPS. A pergunta seguinte — "em QUE mapa?" — não tem resposta hoje, e não é por
   falta de coleta: `public/js/ops.js` já amostra FPS por segundo numa janela de 300 s, já
   separa p50 de p5, já conta quadro travado (>100 ms) e congelado (>1 s), e já sabe em que mapa
   a partida está (`estado.partida.mapa`). O que falta é o caminho: o beacon não leva o mapa, e o
   ingestor do backend não lê o bloco `ops`.

   É o mesmo defeito do BUG-55, de outra forma: instrumento que mede uma coisa e responde outra.
   Lá o "FPS p50" do painel media o jank de BOOT; aqui ele mede um segundo de uma sessão inteira
   e não diz onde.

   Esta régua cobra o CONTRATO do lado do cliente. O lado do servidor (persistir o que chega) é
   cobrado por `api/reguas/perf-ops-check.mjs`, no repositório do backend.

   Uso: node tools/eval/perf-campo-check.mjs
        node tools/eval/perf-campo-check.mjs --mutar=sem-mapa   # tira o mapa do beacon
*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const failset = new Set(), mutacoes = [];
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; failset.add(m.split(' · ')[0]); console.log(`  FALHA ${m}`); } };
const sha = (s) => createHash('sha256').update(s).digest('hex');
const infra = (fase, error) => {
  console.error(JSON.stringify({ gate: 'perfcampo', escopo: 'Node', estado: 'INFRA', fase,
    erro: String(error?.message || error), mutante: MUTAR || null, mutacoes, failsetParcial: [...failset] }));
  process.exit(2);
};
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !['--mutar=sem-mapa', '--mutar=sem-contexto', '--mutar=dpr-dispositivo'].includes(args[0])))
  infra('argumentos', 'use somente --mutar=sem-mapa|sem-contexto|dpr-dispositivo');

let ops, main;
try { ops = fs.readFileSync(path.join(JS, 'ops.js'), 'utf8'); main = fs.readFileSync(path.join(JS, 'main.js'), 'utf8'); }
catch (error) { infra('leitura', error); }
const fontes = { main: sha(main), ops: sha(ops) };

/* ÂNCORA. Se o corpo destas duas funções mudar de nome, a régua não pode passar calada —
   passar calada é como uma régua vira carimbo (LIÇÃO 1). */
const trecho = (fonte, marca, arquivo) => {
  const i = fonte.indexOf(marca);
  const n = fonte.split(marca).length - 1;
  if (n !== 1) infra('recorte', `${arquivo}: ${marca} encontrada ${n}x`);
  return fonte.slice(i, i + 2000);
};

if (MUTAR === 'sem-mapa') {
  const linhas = [...ops.matchAll(/^\s*mapa: [^\n]*\n/gm)];
  if (linhas.length !== 1) infra('mutação', `sem-mapa: alvo encontrado ${linhas.length}x`);
  ops = ops.replace(linhas[0][0], '');
  mutacoes.push({ nome: MUTAR, aplicacoes: 1, fonteAntes: fontes.ops, fonteDepois: sha(ops) });
  console.log('\n  [MUTANTE: sem-mapa] — a régua TEM que reprovar');
}

const beacon = trecho(ops, 'function resumoBeacon()', 'ops.js');
const perf = trecho(main, 'function _perfFinish(', 'main.js');

console.log('\n· o beacon de desempenho responde "onde" e "quão ruim"');

// PCAMPO1 · sem o mapa, "20% abaixo de 30 FPS" não vira ação nenhuma
cobra(/\bmapa:/.test(beacon) && /\bmodo:/.test(beacon),
  'PCAMPO1 · o beacon leva o mapa e o modo da partida');

// PCAMPO2 · distribuição, não uma média de um segundo
cobra(/fps50:/.test(beacon) && /fps5:/.test(beacon) && /travadas:/.test(beacon) && /congeladas:/.test(beacon),
  'PCAMPO2 · leva a distribuição de FPS (p50, p5) e os quadros travados/congelados');

// Formato de topo suportado e limites explícitos; não é parser geral de JS.
// Contrato e provas pendentes: docs/reports/PERF-CONTEXT-GATE-CONTINUATION-20261101.md.
const extrai = (nome, parametros, fronteira) => {
  const assinatura = `function ${nome}(${parametros}) {\n`;
  const declaracoes = [...main.matchAll(new RegExp(`\\bfunction\\s+${nome}\\s*\\(`, 'g'))].length;
  const inicios = main.split(assinatura).length - 1, finais = main.split(fronteira).length - 1;
  const i = main.indexOf(assinatura), j = main.indexOf(fronteira);
  if (declaracoes !== 1 || inicios !== 1 || finais !== 1 || j <= i || (i > 0 && main[i - 1] !== '\n'))
    throw new Error(`${nome}: declaração=${declaracoes}, assinatura=${inicios}, fronteira=${finais}, ordem/formato inválido`);
  const codigo = main.slice(i, j + 2);
  if ((codigo.match(/^}/gm) || []).length !== 1) throw new Error(`${nome}: fechamento de topo ambíguo`);
  new vm.Script(codigo, { filename: `${nome}.extraido.js` });
  return codigo;
};
let contextoReal, perfReal;
try {
  contextoReal = extrai('_clientSessionContext', '', '\n}\n// FUNIL (017):');
  perfReal = extrai('_perfFinish', 'bootMs, frames', '\n}\n// MATCH EVENT (016):');
} catch (error) { infra('extração/compilação', error); }
const extratosOriginais = { contexto: sha(contextoReal), perf: sha(perfReal) };
const aplicaUma = (codigo, de, para) => {
  const n = codigo.split(de).length - 1;
  if (n !== 1) infra('mutação', `${MUTAR}: alvo encontrado ${n}x`);
  const depois = codigo.replace(de, para);
  if (depois === codigo) infra('mutação', `${MUTAR}: fonte não mudou`);
  mutacoes.push({ nome: MUTAR, aplicacoes: n, fonteAntes: sha(codigo), fonteDepois: sha(depois) });
  return depois;
};
if (MUTAR === 'sem-contexto') perfReal = aplicaUma(perfReal, '..._clientSessionContext(),', '');
if (MUTAR === 'dpr-dispositivo') contextoReal = aplicaUma(contextoReal, 'return renderer.getPixelRatio();', 'return devicePixelRatio;');
const casos = [
  { nome: 'renderer-0.75', consent: true, rendererDpr: 0.75, esperado: 0.75 },
  { nome: 'renderer-1', consent: true, rendererDpr: 1, esperado: 1 },
  { nome: 'renderer-lança', consent: true, lanca: true, esperado: null },
  { nome: 'consent-false', consent: false, rendererDpr: 0.75 },
];
const resultados = [];
for (const caso of casos) {
  try {
    const codigo = `
      globalThis.window = globalThis;
      const envios = []; let rendererAcessos = 0, pixelRatioChamadas = 0, contextChamadas = 0;
      const navigator = { userAgent: 'Node-PCAMPO3', platform: 'Linux', maxTouchPoints: 0,
        hardwareConcurrency: 8, deviceMemory: 8, connection: { effectiveType: '4g' } };
      const screen = { width: 1920, height: 1080 }, TOUCH = false;
      const innerWidth = globalThis.innerWidth = 960, innerHeight = globalThis.innerHeight = 640;
      const devicePixelRatio = 2, VERSION = 'versao-PCAMPO3', _perfLoadMs = 4321;
      const getAnonId = () => 'anon-PCAMPO3', getSessionId = () => 'sessao-PCAMPO3';
      const versaoComOrigem = v => v, sinaisDeBuild = () => ({ buildSha: 'build-PCAMPO3', cohort: 'qa' });
      const analyticsAllowed = () => caso.consent, settings = { quality: 'medium' };
      const telemetryGameContext = { gameType: null, node: null, roomId: null, roomOfficial: null, createdRoom: null };
      const rendererStub = { getContext() { contextChamadas++; return null; },
        getPixelRatio() { pixelRatioChamadas++; if (caso.lanca) throw new Error('renderer controlado'); return caso.rendererDpr; } };
      Object.defineProperty(globalThis, 'renderer', { get() { rendererAcessos++; return rendererStub; } });
      globalThis.__csWebgl = { softwareEstado: 'desconhecido', tier: null };
      globalThis.__csbOps = { resumoBeacon: () => null };
      function sendJsonKeepalive(rota, payload) { envios.push({ rota, payload }); }
      ${contextoReal}
      ${perfReal}
      _perfFinish(1234, 57);
      const erros = [], p = envios[0]?.payload;
      if (!caso.consent) {
        if (envios.length !== 0) erros.push('consent-envios');
        if (rendererAcessos !== 0) erros.push('consent-renderer');
      } else {
        if (envios.length !== 1) erros.push('envios');
        if (envios[0]?.rota !== '/api/perf') erros.push('rota');
        if (!p || typeof p !== 'object') erros.push('payload');
        else {
          if (!Object.hasOwn(p, 'dprEfetivo')) erros.push('dprEfetivo-ausente');
          if (p.dprEfetivo !== caso.esperado) erros.push('dprEfetivo-valor');
          if (p.dpr !== 2) erros.push('dpr-dispositivo');
          if (p.bootMs !== 1234 || p.fps !== 57 || p.loadMs !== 4321) erros.push('sentinelas');
        }
      }
      JSON.stringify({ nome: caso.nome, passou: erros.length === 0, erros, esperado: caso.esperado,
        envios, rendererAcessos, pixelRatioChamadas, contextChamadas,
        dprEfetivo: p ? { proprio: Object.hasOwn(p, 'dprEfetivo'), tipo: typeof p.dprEfetivo,
          nulo: p.dprEfetivo === null, finito: Number.isFinite(p.dprEfetivo) } : null });
    `;
    resultados.push(JSON.parse(vm.runInNewContext(codigo, { caso }, { timeout: 500, filename: `PCAMPO3-${caso.nome}.js` })));
  } catch (error) { infra(`VM/${caso.nome}`, error); }
}
console.log(JSON.stringify({ gate: 'PCAMPO3', escopo: 'Node/funções-reais', fontes, extratosOriginais,
  extratosExecutados: { contexto: sha(contextoReal), perf: sha(perfReal) }, mutacoes, casos: resultados }));
cobra(resultados.every(r => r.passou),
  'PCAMPO3 · o payload real envia DPR efetivo (0.75/1/null) e respeita consentimento na VM Node');

/* PCAMPO4 · renderer por software é a hipótese mais provável para 4-8 FPS, e o `glcontext.js`
   já sabe disso. Três estados, porque no Firefox a extensão que revela a GPU fica atrás de
   flag: afirmar "não é software" quando não deu para ler é inventar dado. */
cobra(/software/.test(perf) && /(desconhecido|null)/.test(perf),
  'PCAMPO4 · leva o estado do renderer com "desconhecido" possível (não afirma o que não leu)');

// PCAMPO5 · o que se coleta e não se envia é trabalho por quadro jogado fora
const coletado = ['fps50', 'fps5', 'travadas', 'congeladas', 'liveMs', 'readyMs'];
const faltando = coletado.filter((k) => !new RegExp(`\\b${k}\\b`).test(beacon));
cobra(faltando.length === 0,
  `PCAMPO5 · tudo que o ops coleta chega ao beacon${faltando.length ? ` — falta ${faltando.join(', ')}` : ''}`);

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
const alvoMutante = MUTAR === 'sem-mapa' ? 'PCAMPO1' : MUTAR ? 'PCAMPO3' : null;
console.log(JSON.stringify({ gate: 'perfcampo', escopo: 'Node', ok, falhas, infra: 0, failset: [...failset],
  mutante: MUTAR || null, mutacoes, alvoMutante, deteccao: alvoMutante ? (failset.has(alvoMutante) ? 'ALVO_RED' : 'NO_DETECTION') : null }));
process.exit(falhas ? 1 : 0);
