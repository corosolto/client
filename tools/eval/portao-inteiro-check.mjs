#!/usr/bin/env node
/* ============================================================================
   portao-inteiro-check.mjs — PORTÃO NÃO PODE CITAR PASSO QUE NÃO EXISTE
   ----------------------------------------------------------------------------
   `check:fast` e `check:deploy` são listas de nomes de script. Se um nome citado
   ali não está definido em `scripts`, o npm morre com "missing script" e o portão
   inteiro para no meio - os passos DEPOIS do nome quebrado nunca rodam.

   DOIS CASOS REAIS, os dois em 22/08/2026:
   · o PR #372 citava `eval:gelo` no `check:fast` e nunca definiu o script. A régua
     `treta-gelo-check.mjs` existia e simplesmente não estava ligada em lugar nenhum;
   · resolvendo o conflito de `package.json` do #408, eu fiquei com a linha do
     `check:` de um lado e perdi as DEFINIÇÕES do outro. Três réguas viraram nome
     órfão de uma vez - e conflito de `package.json` é justamente o que mais
     acontece, porque todo PR que acrescenta régua mexe na mesma linha.

   PI1 · todo nome citado em `check:fast`/`check:deploy` existe em `scripts`.
   PI2 · todo script `eval:*` aponta para arquivo que existe em disco.
   PI3 · as réguas de workflow (e as de node puro que guardam contrato de CI) rodam
         no pr-fast, não só no `check:fast`. Medido em 14/10/2026: `eval:wfsecret`,
         `wflocal`, `wftimeout`, `wfconcurrency`, `deploygate`, `autofix`, `mutcega`,
         `portaointeiro`, `privacy` e `noescolha` só existiam no `check:fast`, que roda
         na máquina de quem lembra de rodar. Um PR que quebrasse workflow passava no CI
         verde. Somam menos de 2 s em node puro, sem `npm ci`.

   PI4 · independentes rodam após falha; erro fica vermelho, cancelamento e setup
         incompleto impedem execução (#1188). Mutantes: sucesso-implicito, always,
         erro-ignorado e setup.

   Uso: node tools/eval/portao-inteiro-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';
import { SUITES } from './suites.mjs';
import { COLLIDER_SHARDS } from './operacao-flavio-proof-check.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'passo-orfao': 'PI1', 'regua-fantasma': 'PI2', 'regua-fora-do-pr-fast': 'PI3', 'sucesso-implicito': 'PI4', 'always': 'PI4', 'erro-ignorado': 'PI4', 'setup': 'PI4', 'sem-armadura-ci': 'PI4', 'sem-ads1p-runtime-ci': 'PI4', 'sem-piscina-batch-ci': 'PI4', 'contrato-visual-duplicado': 'PI4' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = { ...pkg.scripts };
const passosPorPortao = { 'check:fast': [...SUITES.fast], 'check:deploy': [...SUITES.deploy] };
if (MUT === 'passo-orfao') passosPorPortao['check:fast'].push('eval:nao-existe');
if (MUT === 'regua-fantasma') scripts['eval:fantasma'] = 'node tools/eval/nao-existe-check.mjs';

const falhas = [];
const PORTOES = ['check:fast', 'check:deploy'];

/* ---- PI1: nome citado tem de estar definido ---- */
for (const portao of PORTOES) {
  const linha = scripts[portao];
  const suite = portao.slice('check:'.length);
  if (!linha) { falhas.push(`PI1 o portão \`${portao}\` não existe em scripts`); continue; }
  if (linha !== `node tools/eval/runner.mjs --suite=${suite}`) {
    falhas.push(`PI1 ${portao} precisa expandir --suite=${suite} pelo runner`);
  }
  for (const passo of passosPorPortao[portao]) {
    if (!scripts[passo]) {
      falhas.push(`PI1 ${portao} cita \`${passo}\`, que não está definido em scripts — o npm morre em "missing script" e os passos seguintes NÃO rodam`);
    }
  }
}

for (const indice of COLLIDER_SHARDS) {
  const nome = `eval:operacao-flavio-collider-${indice + 1}`;
  const esperado = `node tools/eval/operacao-flavio-proof-check.mjs collider:${indice}`;
  if (scripts[nome] !== esperado) falhas.push(`PI1 ${nome} precisa executar exatamente "${esperado}"`);
}
for (const [nome, familia] of [['eval:operacao-flavio-collider', 'collider'], ['eval:operacao-flavio-menu', 'menu']]) {
  const esperado = `node tools/eval/operacao-flavio-proof-check.mjs ${familia}`;
  if (scripts[nome] !== esperado) falhas.push(`PI1 ${nome} precisa executar a família completa com "${esperado}"`);
}

/* ---- PI2: régua citada tem de existir em disco ---- */
for (const [nome, cmd] of Object.entries(scripts)) {
  if (nome.startsWith('//')) continue;              // chave de documentação, não é script
  const m = String(cmd).match(/node\s+(tools\/[^\s]+\.mjs)/);
  if (m && !existsSync(m[1])) {
    falhas.push(`PI2 \`${nome}\` aponta para ${m[1]}, que não existe em disco`);
  }
}

/* ---- PI3: as réguas de workflow rodam no pr-fast ---- */
const REGUAS_PR_FAST = [
  'eval:wfsecret', 'eval:wflocal', 'eval:wftimeout', 'eval:wfconcurrency', 'eval:deploygate',
  'eval:autofix', 'eval:mutcega', 'eval:portaointeiro', 'eval:release', 'eval:privacy', 'eval:noescolha',
  'eval:contagens-pr',
  'eval:mergequeue', 'eval:wfpurge',
];
let ci = existsSync('.github/workflows/ci.yml') ? readFileSync('.github/workflows/ci.yml', 'utf8') : '';
if (MUT === 'sucesso-implicito') ci = ci.replace(/(- name: Contratos visuais[^\n]*\n)        if:[^\n]*\n/, '$1');
if (MUT === 'always') ci = ci.replace(/(- name: Contratos visuais[^\n]*\n        if: )[^\n]*/, '$1${{ always() }}');
if (MUT === 'setup') ci = ci.replace(/(- name: Contratos visuais[^\n]*\n        if: )[^\n]*/, "$1${{ !cancelled() }}");
if (MUT === 'contrato-visual-duplicado') ci = ci.replace(' eval:grafite-curation', ' eval:grafite-curation eval:knife-skin-markings');
if (MUT === 'erro-ignorado') ci = ci.replace(/(- name: TRETA\$ da partida segue o CS[^\n]*\n)/, '$1        continue-on-error: true\n');
const CI_CRU = existsSync('.github/workflows/ci.yml') ? readFileSync('.github/workflows/ci.yml', 'utf8') : '';
const ALVO_ALIAS = { 'sem-armadura-ci': 'eval:armadura', 'sem-ads1p-runtime-ci': 'eval:ads1p-runtime-public', 'sem-piscina-batch-ci': 'eval:piscina-graffiti-batch' }[MUT] || '';
if (ALVO_ALIAS) {
  const esc = ALVO_ALIAS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let aplicacoes = 0;
  ci = ci.replace(/^        run:.*$/gm, (linha) => {
    return linha.replace(new RegExp(`\\s${esc}(?=\\s|$)`, 'g'), () => {
      aplicacoes++;
      return '';
    });
  });
  if (aplicacoes !== 1 || ci === CI_CRU) {
    console.error(`PI-MUTANTE ${JSON.stringify({ name: MUT, aplicado: false, removed: ALVO_ALIAS })} MUTAÇÃO NÃO APLICADA`);
    process.exit(4);
  }
  console.log(`PI-MUTANTE ${JSON.stringify({ name: MUT, aplicado: true, removed: ALVO_ALIAS })}`);
}
const CI_MUTADO = MUTANTES[MUT] === 'PI4' && ci === (existsSync('.github/workflows/ci.yml') ? readFileSync('.github/workflows/ci.yml', 'utf8') : '');
if (MUT === 'regua-fora-do-pr-fast') ci = ci.replace(/ eval:wfsecret\b/g, '');
/* Só linha de comando conta: o nome citado em comentário não roda. */
const comandosCi = ci.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
for (const regua of REGUAS_PR_FAST) {
  if (!scripts[regua]) { falhas.push(`PI3 \`${regua}\` não está definido em scripts`); continue; }
  const citada = new RegExp(`(?:npm run|runner\\.mjs[^\\n]*)\\s${regua.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'm');
  if (!citada.test(comandosCi)) falhas.push(`PI3 \`${regua}\` não roda no pr-fast (ci.yml) — régua de workflow que só o check:fast roda não segura PR nenhum`);
}

/* ---- PI4: falha de régua não pula consumidores independentes (#1188).
   Semântica de status: docs.github.com/en/actions/reference/workflows-and-actions/expressions. */
if (CI_MUTADO) falhas.push(`PI4 mutação '${MUT}' não aplicou no ci.yml — ajustar o alvo`);
/* [jobDono, prefixoDoPasso, comandos]: cada grupo pertence a exatamente um
   job real da seção jobs:, e a unicidade dos aliases eval:/mut: é cobrada
   GLOBALMENTE — duplicata em qualquer outro job, inclusive job novo
   desconhecido, reprova. */
const GRUPOS_COLLIDER_PI4 = COLLIDER_SHARDS.map((indice) => [
  `operacao-flavio-collider-${indice + 1}`,
  `Operação Flávio, collider ${indice + 1}`,
  [`eval:operacao-flavio-collider-${indice + 1}`],
]);
const GRUPOS_PI4 = [
  ['economia-ak-hud', 'TRETA$ da partida segue o CS', ['eval:economia']],
  ['economia-ak-hud', 'TRETA$ da partida dentro do Game real', ['eval:economia-jogo']],
  ['contratos-visuais-personagens-camera', 'Contratos visuais de personagens', ['eval:shot-final-pose', 'eval:authored-locomotion', 'eval:character-normal-quality', 'eval:normal-only-fit-equivalence', 'eval:tp-world-contract', 'eval:skin-profile-flow', 'eval:death-camera-consistency', 'eval:knife-skin-markings']],
  ['contratos-visuais-ferro-balcao', 'Contrato visual de ferro e balcão', ['eval:ferro-balcao']],
  ['contratos-visuais-mapas-materiais', 'Contratos visuais de mapas', ['eval:map-material-finish']],
  ['contratos-visuais-visual-map', 'Contratos visuais de geometria e UV', ['eval:visual-map-contracts']],
  ['contratos-visuais-campo-uv', 'Contrato visual de campo UV', ['eval:campo-uv']],
  ['contratos-visuais-gameplay-grafite', 'Contratos visuais de gameplay', ['eval:grafite-curation', 'eval:match-pickups', 'eval:net-flash-disable', 'eval:grafite-atual:prova', 'eval:piscina-graffiti-batch']],
  ['economia-ak-hud', 'Flash, fluidez e ADS da AK pública', ['eval:flashbang', 'mut:flashbang', 'eval:movimento-fluidez', 'eval:ads1p-public', 'eval:posto-board-support', 'eval:preview-grip-phase', 'eval:armadura', 'eval:ads1p-runtime-public']],
  ['economia-ak-hud', 'Câmera, atalhos e HUD', ['eval:cameraoclusao', 'tools/eval/camera-oclusao-mutate.mjs', 'tools/eval/camera-hud-check.mjs']],
  ['soundscape', 'Loops de áudio de todos os mapas', ['eval:soundscape-contract']],
  ['operacao-flavio-core', 'Operação Flávio, núcleo', ['eval:operacao-flavio-core', 'eval:operacao-reset', 'eval:operacao-duration', 'eval:operacao-clock', 'eval:operacao-boarding', 'eval:character-owned', 'eval:objective-codec-contract', 'eval:operacao-npc']],
  ...GRUPOS_COLLIDER_PI4,
  ['operacao-flavio-menu', 'Operação Flávio, menu', ['eval:operacao-flavio-menu', 'eval:mode-announcements', 'eval:ctflabels', 'eval:tpreloadpaired']],
  ['operacao-flavio-online', 'Operação Flávio, online', ['eval:operacao-online']],
  ['operacao-flavio-integracao', 'Operação Flávio, integração', ['eval:operacao-flavio-integracao']],
  ['operacao-flavio-comportamento', 'Operação Flávio, comportamento', ['eval:operacao-flavio-comportamento']],
  ['operacao-flavio-escolta', 'Operação Flávio, escolta', ['eval:operacao-flavio-escolta']],
  ['reguas-e-site', 'Suites preservam cobertura', ['tests/eval-suites.test.mjs']],
  ['reguas-e-site', 'Todo mapa devolve o que o game.js consome', ['eval:mapcontrato']],
  ['mapas-e-site', 'Pichação colada na parede', ['eval:pichacao-parede']],
  ['mapas-e-site', 'Amazônia acessível', ['eval:amazonia']],
  ['mapas-e-site', 'Escadão — circulação', ['eval:escadao-graph', 'eval:escadao-home', 'eval:escadao-structure', 'eval:escadao-descent', 'eval:escadao-details']],
  ['mantle', 'Validar fluidez, território e rede do mantle', ['eval:mantle-fluidez', 'mut:mantle', 'eval:mantle-network']],
  ['mapas-e-site', 'Escadão — compatibilidade', ['tools/eval/escadao-audio-pack-check.mjs']],
];
const COMANDOS_VISUAIS_BASE = Object.freeze([
  'eval:shot-final-pose', 'eval:authored-locomotion', 'eval:character-normal-quality', 'eval:grafite-curation',
  'eval:map-material-finish', 'eval:ferro-balcao', 'eval:match-pickups', 'eval:net-flash-disable',
  'eval:normal-only-fit-equivalence', 'eval:tp-world-contract', 'eval:skin-profile-flow', 'eval:death-camera-consistency',
  'eval:visual-map-contracts', 'eval:knife-skin-markings', 'eval:campo-uv', 'eval:grafite-atual:prova',
  'eval:piscina-graffiti-batch',
]);
function passosDoJob(texto, job) {
  const bloco = texto.match(new RegExp(`^  ${job}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|$(?![\\s\\S]))`, 'm'))?.[1];
  if (!bloco) throw new Error(`PI4 job ${job} ausente`);
  return bloco.split(/^      - /m).slice(1).map((b) => {
    const p = {};
    for (const l of b.split('\n')) {
      const m = /^(?:        )?([\w-]+):\s*(.*)$/.exec(l);
      if (m) p[m[1]] = m[2];
      else if (/^          \S/.test(l) && p.run !== undefined) p.run += `\n${l.trim()}`;
    }
    p.name ||= p.run || p.uses;
    if (!p.name) throw new Error('PI4 parser perdeu um passo');
    return p;
  });
}
function avaliaIf(cond, c) {
  const e = String(cond || 'success()').replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
  const temStatus = /\b(?:always|success|failure|cancelled)\s*\(/.test(e);
  const x = e
    .replace(/steps\.([\w-]+)\.outcome\s*(==|!=)\s*'(success|failure|cancelled|skipped)'/g,
      (_m, id, op, v) => String(op === '==' ? c.steps[id]?.outcome === v : c.steps[id]?.outcome !== v))
    .replace(/github\.event_name\s*(==|!=)\s*'(push|pull_request|merge_group)'/g,
      (_m, op, v) => String(op === '==' ? c.event === v : c.event !== v))
    .replace(/startsWith\(github\.event\.head_commit\.message,\s*'([^']*)'\)/g,
      (_m, pref) => String(c.commitMsg.startsWith(pref)))
    .replace(/\b(always|success|failure|cancelled)\(\)/g, (_m, f) => String(c.status[f]));
  if (!/^(?:true|false|&&|\|\||!|\(|\)|\s)+$/.test(x)) throw new Error(`PI4 if fora da gramática: ${e}`);
  const valor = Boolean(Function(`"use strict"; return (${x});`)());
  return valor && (temStatus || c.status.success);
}
function simula(passos, { falhaEm = -1, cancelarAntes = -1, pularEm = -1 } = {}) {
  const steps = {}, executados = new Set(), outcomes = [];
  let falhou = false, cancelado = false;
  for (const [i, p] of passos.entries()) {
    if (i === cancelarAntes) cancelado = true;
    const c = { status: { success: !falhou && !cancelado, failure: falhou, cancelled: cancelado, always: true }, steps, event: 'pull_request', commitMsg: '' };
    let outcome = 'skipped';
    if (avaliaIf(p.if, c) && i !== pularEm) {
      executados.add(i);
      outcome = i === falhaEm ? 'failure' : 'success';
      if (outcome === 'failure' && p['continue-on-error'] !== 'true') falhou = true;
    }
    outcomes.push(outcome);
    if (p.id) steps[p.id] = { outcome };
  }
  return { executados, outcomes, conclusao: cancelado ? 'cancelled' : falhou ? 'failure' : 'success' };
}
let casosPI4 = 0;
try {
  /* Unicidade GLOBAL: enumera TODOS os jobs reais da seção top-level `jobs:`
     (ignora on. e comentários), inclusive os não simulados — duplicata em
     qualquer job, ou job dono inexistente, reprova. */
  const secaoJobs = ci.match(/^jobs:\n([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1] || '';
  const TODOS_JOBS = [...secaoJobs.matchAll(/^  ([\w-]+):(?=\s*$)/gm)].map((m) => m[1]);
  if (!TODOS_JOBS.length) throw new Error('PI4 seção jobs: ausente ou sem jobs reais no ci.yml');
  const passosGlobais = Object.fromEntries(TODOS_JOBS.map((j) => [j, passosDoJob(ci, j)]));
  const tokensPorPasso = TODOS_JOBS.flatMap((job) => passosGlobais[job].map((p) => ({ job, nome: p.name, tokens: (p.run || '').split(/\s+/) })));
  const comandosMonitorados = [...new Set(GRUPOS_PI4.flatMap(([, , comandos]) => comandos).filter((cmd) => /^(?:eval|mut):/.test(cmd)))];
  const DUPLICACAO_PERMITIDA = new Set(['eval:movimento-fluidez']);
  for (const comando of comandosMonitorados) {
    if (DUPLICACAO_PERMITIDA.has(comando)) continue;
    const donos = tokensPorPasso.filter((p) => p.tokens.includes(comando));
    const total = donos.reduce((n, p) => n + p.tokens.filter((token) => token === comando).length, 0);
    if (total !== 1) falhas.push(`PI4 ${comando}: esperado uma execução no CI, encontradas ${total} em [${donos.map((p) => `${p.job}:${p.nome}`).join(', ')}]`);
  }
  const gruposVisuais = GRUPOS_PI4.filter(([job]) => job.startsWith('contratos-visuais-'));
  const comandosVisuais = gruposVisuais.flatMap(([, , comandos]) => comandos);
  const coberturaOrdenada = [...comandosVisuais].sort((a, b) => COMANDOS_VISUAIS_BASE.indexOf(a) - COMANDOS_VISUAIS_BASE.indexOf(b));
  if (new Set(comandosVisuais).size !== COMANDOS_VISUAIS_BASE.length
      || JSON.stringify(coberturaOrdenada) !== JSON.stringify(COMANDOS_VISUAIS_BASE)) {
    falhas.push(`PI4 contratos visuais: esperada a união ordenada de ${COMANDOS_VISUAIS_BASE.length} comandos da base; encontrados ${comandosVisuais.length} comandos (${new Set(comandosVisuais).size} únicos) em ${gruposVisuais.length} shards`);
  }
  for (const [job, , comandos] of gruposVisuais) {
    const ordemGlobal = COMANDOS_VISUAIS_BASE.filter((comando) => comandos.includes(comando));
    if (JSON.stringify(comandos) !== JSON.stringify(ordemGlobal)) {
      falhas.push(`PI4 ${job}: ordem local ${comandos.join(', ')} viola a ordem global ${ordemGlobal.join(', ')}`);
    }
  }
  const gruposPorJob = {};
  for (const [jobDoGrupo, prefixo] of GRUPOS_PI4) {
    if (!TODOS_JOBS.includes(jobDoGrupo)) throw new Error(`PI4 ${prefixo}: job dono ${jobDoGrupo} não existe na seção jobs`);
    const donos = TODOS_JOBS.filter((j) => passosGlobais[j].some((p) => p.name.startsWith(prefixo)));
    const total = donos.reduce((n, j) => n + passosGlobais[j].filter((p) => p.name.startsWith(prefixo)).length, 0);
    if (donos.join() !== jobDoGrupo || total !== 1) throw new Error(`PI4 ${prefixo}: esperado exatamente um passo em ${jobDoGrupo}, encontrados ${total} em [${donos.join(', ')}]`);
    (gruposPorJob[jobDoGrupo] ||= []).push(prefixo);
  }
  /* Cada grupo é simulado no SEU job dono: falha anterior não pula consumidor
     independente; setup pulado, falho ou cancelado impede execução. */
  for (const [jobDoGrupo, prefixos] of Object.entries(gruposPorJob)) {
    const passos = passosGlobais[jobDoGrupo];
    const unico = (pred, alvo) => {
      const indices = passos.flatMap((p, i) => pred(p) ? [i] : []);
      if (indices.length !== 1) throw new Error(`PI4 ${alvo} (${jobDoGrupo}): esperado um passo, encontrados ${indices.length}`);
      return indices[0];
    };
    const grupos = prefixos.map((prefixo) => {
      const i = unico((p) => p.name.startsWith(prefixo), prefixo);
      const comandos = GRUPOS_PI4.find(([, pre]) => pre === prefixo)[2];
      const tokens = (passos[i].run || '').split(/\s+/);
      const faltantes = comandos.filter((cmd) => !tokens.includes(cmd));
      if (faltantes.length) throw new Error(`PI4 ${prefixo} (${jobDoGrupo}): consumidores ${faltantes.join(', ')} não executam no run`);
      const aliases = comandos.filter((cmd) => /^(?:eval|mut):/.test(cmd));
      const ordemReal = tokens.filter((token) => aliases.includes(token));
      if (JSON.stringify(ordemReal) !== JSON.stringify(aliases)) {
        falhas.push(`PI4 ${prefixo} (${jobDoGrupo}): ordem ${ordemReal.join(', ')}; esperada ${aliases.join(', ')}`);
      }
      return i;
    });
    const deps = unico((p) => p.run?.trim() === 'npm ci', 'npm ci');
    if (!passos[deps].id) falhas.push(`PI4 ${jobDoGrupo}: npm ci precisa de id para guardar setup concluído`);
    const ids = passos.map((p) => p.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error(`PI4 ${jobDoGrupo}: ids de steps duplicados`);
    const checkout = unico((p) => p.uses?.startsWith('actions/checkout@'), 'checkout');
    const node = unico((p) => p.uses?.startsWith('actions/setup-node@'), 'setup-node');
    const antes = grupos[0] - 1;
    const cenarios = [
      { nome: `sucesso (${jobDoGrupo})`, conclusao: 'success', roda: () => true },
      { nome: `npm ci pulado (${jobDoGrupo})`, pularEm: deps, conclusao: 'success', roda: () => false },
      // Falha independente exige passo REAL não-setup entre setup e o primeiro grupo.
      ...[antes, ...grupos].filter((i) => ![checkout, node, deps].includes(i)).map((i) => ({ nome: `falha: ${passos[i].name}`, falhaEm: i, conclusao: 'failure', roda: () => true })),
      ...[checkout, node, deps].map((i) => ({ nome: `setup falhou (${jobDoGrupo}): ${passos[i].name}`, falhaEm: i, conclusao: 'failure', roda: () => false })),
      ...[grupos[0], grupos[grupos.length - 1]].map((i) => ({ nome: `cancelamento antes de ${passos[i].name}`, cancelarAntes: i, conclusao: 'cancelled', roda: (j) => j < i })),
    ];
    for (const s of cenarios) {
      const r = simula(passos, s); casosPI4++;
      if (r.conclusao !== s.conclusao) falhas.push(`PI4 ${s.nome}: conclusão ${r.conclusao}, esperada ${s.conclusao} — falha engolida`);
      if (s.falhaEm !== undefined && r.outcomes[s.falhaEm] !== 'failure') falhas.push(`PI4 ${s.nome}: falha não foi injetada no consumidor real`);
      for (const i of grupos) if (r.executados.has(i) !== s.roda(i)) falhas.push(`PI4 ${s.nome}: ${passos[i].name} ${r.executados.has(i) ? 'rodou' : 'não rodou'} indevidamente`);
    }
  }
} catch (e) { falhas.push(String(e.message)); }

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) {
  const total = PORTOES.reduce((n, p) => n + passosPorPortao[p].length, 0);
  console.log(`  \x1b[32m✓\x1b[0m PI4 ${GRUPOS_PI4.length} grupos independentes × ${casosPI4} cenários de status`);
  const gruposVisuais = GRUPOS_PI4.filter(([job]) => job.startsWith('contratos-visuais-'));
  const totalVisuais = gruposVisuais.reduce((n, [, , comandos]) => n + comandos.length, 0);
  console.log(`  \x1b[32m✓\x1b[0m PI4 ${totalVisuais} contratos visuais únicos, ordenados e cobertos pelos ${gruposVisuais.length} shards`);
  console.log(`  \x1b[32m✓\x1b[0m PI todo passo dos dois portões está definido e aponta para arquivo que existe (${total} citações)`);
}
if (MUT && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula ${MUTANTES[MUT]} — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);
