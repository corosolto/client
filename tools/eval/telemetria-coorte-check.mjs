/* ============================================================================
   telemetria-coorte-check.mjs — BUILD SHA E COORTE: SÓ OS DOIS CAMPOS, SÓ COM CONSENTIMENTO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O #858 pôs `buildSha` e `cohort` no /api/perf, no /api/match e no reporter de
   erro do index.astro. O PR não tinha régua do payload: um campo a mais ou uma
   coorte fora do combinado iria para o banco sem ninguém ver. Na revisão, a
   coorte `software` (SwiftShader) tirava jogador real de máquina fraca do
   `organico`; ela saiu, porque o perf já manda o campo `software`.

   O QUE ESTA RÉGUA PROVA
     TC1 `sinaisDeBuild()` (public/js/main.js), rodada numa caixa de areia com
         navegador falso, devolve exatamente {buildSha, cohort}: SHA de 40 hex
         ou null, coorte em automacao|qa|organico, numa tabela de casos
         (webdriver, ?qa, cs_qa=1, SwiftShader, storage bloqueado, sem SHA)
     TC2 o `contexto()` do reporter (src/pages/index.astro) dá a mesma coorte e
         o mesmo SHA na mesma tabela
     TC3 toda função de main.js que espalha `...sinaisDeBuild()` começa com
         `if (!analyticsAllowed()) return;`, e o reporter só chama `contexto()`
         dentro de `reporta`, que começa pela checagem de privacidade

   Uso: node tools/eval/telemetria-coorte-check.mjs
        [--mutante=campo-extra|coorte-fora|software-volta|sem-consentimento]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUTANTES = ['campo-extra', 'coorte-fora', 'software-volta', 'sem-consentimento'];
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

let main = readFileSync(path.join(ROOT, 'public/js/main.js'), 'utf8');
const index = readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
const trocar = (src, de, para) => {
  if (!src.includes(de)) throw new Error(`mutante ${mutante} não achou o alvo: ${de}`);
  return src.replace(de, para);
};
if (mutante === 'campo-extra') main = trocar(main, "|| null, cohort };", "|| null, cohort, ua: navigator.userAgent };");
if (mutante === 'coorte-fora') main = trocar(main, "cohort = 'automacao';", "cohort = 'bot';");
if (mutante === 'software-volta') main = trocar(main, "cohort = 'qa';\n", "cohort = 'qa';\n    else if (window.__csWebgl?.softwareEstado === 'sim') cohort = 'software';\n");
if (mutante === 'sem-consentimento') {
  const alvo = /(function _perfFinish\([^)]*\) \{\n)\s*if \(!analyticsAllowed\(\)\) return;\n/;
  if (!alvo.test(main)) throw new Error('mutante sem-consentimento não achou _perfFinish');
  main = main.replace(alvo, '$1');
}

const falhas = [];
const SHA = 'a'.repeat(40);
const COORTES = new Set(['automacao', 'qa', 'organico']);
const CASOS = [
  { nome: 'jogador comum', esperado: 'organico' },
  { nome: 'webdriver', webdriver: true, esperado: 'automacao' },
  { nome: '?qa', search: '?qa', esperado: 'qa' },
  { nome: 'cs_qa=1', storage: { cs_qa: '1' }, esperado: 'qa' },
  { nome: 'SwiftShader', software: 'sim', esperado: 'organico' },
  { nome: 'storage bloqueado', bloqueado: true, esperado: 'organico' },
  { nome: 'sem SHA', sha: '', esperado: 'organico', shaEsperado: null },
];
const ambiente = (caso) => {
  const localStorage = {
    getItem(k) { if (caso.bloqueado) throw new Error('SecurityError'); return (caso.storage || {})[k] ?? null; },
  };
  const window = { __CS_BUILD: { sha: caso.sha ?? SHA }, __csWebgl: { softwareEstado: caso.software || 'nao' } };
  return {
    window, localStorage, URLSearchParams,
    navigator: { webdriver: !!caso.webdriver, userAgent: 'teste' },
    location: { search: caso.search || '', pathname: '/', host: 'teste' },
  };
};

function extrair(src, inicio) {
  const i = src.indexOf(inicio);
  if (i < 0) return null;
  let nivel = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') nivel++;
    else if (src[j] === '}' && --nivel === 0) return src.slice(i, j + 1);
  }
  return null;
}

const conferir = (onde, caso, r) => {
  const chaves = Object.keys(r).sort().join(',');
  if (chaves !== 'buildSha,cohort') falhas.push(`${onde} ${caso.nome}: campos ${chaves}, esperava buildSha,cohort`);
  if (!COORTES.has(r.cohort)) falhas.push(`${onde} ${caso.nome}: coorte fora do enum (${r.cohort})`);
  else if (r.cohort !== caso.esperado) falhas.push(`${onde} ${caso.nome}: coorte ${r.cohort}, esperava ${caso.esperado}`);
  const sha = 'shaEsperado' in caso ? caso.shaEsperado : SHA;
  if (r.buildSha !== sha) falhas.push(`${onde} ${caso.nome}: buildSha ${r.buildSha}, esperava ${sha}`);
  if (r.buildSha !== null && !/^[a-f0-9]{40}$/.test(r.buildSha)) falhas.push(`${onde} ${caso.nome}: buildSha fora do formato`);
};

const fnMain = extrair(main, 'function sinaisDeBuild()');
if (!fnMain) falhas.push('TC1 sinaisDeBuild() sumiu de main.js');
else for (const caso of CASOS) {
  const r = vm.runInNewContext(`${fnMain}; sinaisDeBuild()`, ambiente(caso));
  conferir('TC1', caso, { ...r });
}

const blocoIndex = (index.match(/try\{\s*\n\s*c\.buildSha[\s\S]*?\}catch\(_\)\{[^}]*\}/) || [])[0];
if (!blocoIndex) falhas.push('TC2 o bloco de buildSha/cohort sumiu do contexto() do index.astro');
else for (const caso of CASOS) {
  const r = vm.runInNewContext(`var c = {}; ${blocoIndex}; c`, ambiente(caso));
  conferir('TC2', caso, { ...r });
}

const confereConsentimento = (padrao, ignorados = new Set()) => {
  let encontrados = 0;
  for (const m of main.matchAll(padrao)) {
    const antes = main.slice(0, m.index);
    const ini = antes.lastIndexOf('\nfunction ');
    const nome = (antes.slice(ini).match(/function (\w+)/) || [])[1];
    if (ignorados.has(nome)) continue;
    encontrados++;
    const corpo = antes.slice(ini);
    if (!/^\nfunction \w+\([^)]*\) \{\n\s*if \(!analyticsAllowed\(\)\) return;/.test(corpo)) {
      falhas.push(`TC3 ${nome || '?'} manda telemetria sem começar por analyticsAllowed()`);
    }
  }
  return encontrados;
};
const usosDiretos = confereConsentimento(/\.\.\.sinaisDeBuild\(\)/g, new Set(['_clientSessionContext']));
const usosContexto = confereConsentimento(/\.\.\._clientSessionContext\(\)/g);
const usos = usosDiretos + usosContexto;
if (usosDiretos < 1 || usosContexto < 3) {
  falhas.push(`TC3 cobertura insuficiente: ${usosDiretos} envio(s) direto(s) e ${usosContexto} via contexto`);
}
const reporta = extrair(index, 'function reporta(');
if (!reporta || !/^function reporta\([^)]*\)\{\s*\n\s*if \(!window\.__csPrivacy\?\.allowed\(\)\) return null;/.test(reporta)) {
  falhas.push('TC3 reporta() não começa pela checagem de privacidade');
}
const chamadas = (src) => [...(src || '').matchAll(/(?<!function )\bcontexto\(\)/g)].length;
if (!chamadas(reporta) || chamadas(index) !== chamadas(reporta)) falhas.push('TC3 contexto() chamado fora de reporta()');

const rotulo = mutante ? ` (mutante ${mutante})` : '';
if (falhas.length) {
  console.log(`telemetria-coorte-check: FAIL${rotulo}`);
  for (const f of falhas) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`telemetria-coorte-check: PASS (${CASOS.length} casos em main.js e index.astro, ${usos} envios com consentimento)`);
