/* fiscal.mjs — caca-bug: compara rodadas de invariants.mjs e mantém o KNOWN-BUGS.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: ronda noturna (a régua demora 10-12 min, não é por-PR). Roda
   `node tools/eval/invariants.mjs` no repo do jogo, compara com a última rodada
   salva em estado/ultima-rodada.json e sincroniza o KNOWN-BUGS.md:
     · VERDE → VERMELHA: entrada nova no gabarito da skill bug-hunt + issue;
     · VERMELHA → VERDE: entrada riscada como RESOLVIDA + comentário na issue;
     · id que sumiu + id novo com descrição parecida: RENAME (já aconteceu
       VM5→VM9), registrado em estado/renames.json — nunca duplica.
   FALHA RUIDOSA > ESCRITA ERRADA: o parser tolera espaçamento, mas se não
   reconhecer a estrutura da saída, NÃO escreve nada e sai 1.
   A persona (proerd) vale para issues e comentários; as ENTRADAS do
   KNOWN-BUGS.md seguem o gabarito seco, SEM voz de persona.

   COMANDOS:
     bun fiscal.mjs rodada            roda invariants no repo real e sincroniza
     bun fiscal.mjs comparar A B      offline: dois outputs salvos, imprime diff
     bun fiscal.mjs selftest          fixture mínima pelo pipeline (sem rede)
   GH_DRY_RUN=1: issue/comentário são salvos em estado/dry-run/, não enviados. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { tabela, codigo, citacao, alerta } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR);
const { gh, api } = criarCliente({
  patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo,
});
const REPO_DIR = resolve(RAIZ, CFG.repo_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);

/* ── parser: saída humana do invariants.mjs ──────────────────────────────────
 * Linha de resultado: "✓ PASSA   VM1  descrição" (id padEnd(5), evid na linha
 * de baio indentada). Tolerante a espaçamento; EXIGE estrutura conhecida. */
export function parseRodada(texto) {
  const resultados = [];
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^(✓ PASSA|✗ FALHA|≈ DÍVIDA|·· PULADO)\s+([A-Za-z0-9]+)\s+(.*)$/);
    if (m) {
      const estado = { '✓ PASSA': 'verde', '✗ FALHA': 'vermelha', '≈ DÍVIDA': 'divida', '·· PULADO': 'pulado' }[m[1]];
      resultados.push({ id: m[2], estado, desc: m[3].trim() });
    }
  }
  const resumo = texto.match(/^CRÍTICAS:.*$/m);
  if (!resultados.length || !resumo) {
    throw new Error(`saída de invariants.mjs não reconhecida (0 resultados ou sem linha CRÍTICAS) — nada foi escrito. Primeiras linhas:\n${texto.split('\n').slice(0, 5).join('\n')}`);
  }
  return { quando: new Date().toISOString(), resultados, resumo: resumo[0] };
}

/* ── comparação entre rodadas ──────────────────────────────────────────────── */
const normaliza = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => new Set(normaliza(s).split(' ').filter((t) => t.length > 2));
function parecida(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

export function comparar(antes, depois, { janela = CFG.janela_rename } = {}) {
  const mapAntes = new Map(antes.resultados.map((r) => [r.id, r]));
  const mapDepois = new Map(depois.resultados.map((r) => [r.id, r]));
  const usados = new Set();
  const renames = [];
  /* rename: id que sumiu casa com id novo de descrição parecida que surgiu */
  for (const [id, novo] of mapDepois) {
    if (mapAntes.has(id)) continue;
    let melhor = null, nota = 0;
    for (const [idV, velho] of mapAntes) {
      if (usados.has(idV) || mapDepois.has(idV)) continue;
      const n = parecida(velho.desc, novo.desc);
      if (n > nota) { nota = n; melhor = idV; }
    }
    if (melhor && nota >= janela) { renames.push({ de: melhor, para: id, nota: Number(nota.toFixed(2)) }); usados.add(melhor); }
  }
  const idDe = (id) => {
    const r = renames.find((x) => x.para === id);
    return r ? r.de : id;
  };
  const vermelhasNovas = [], resolvidas = [];
  for (const [id, novo] of mapDepois) {
    const antesDe = mapAntes.get(idDe(id));
    if (!antesDe) {
      /* invariante NOVA já nascendo vermelha: PR entrou com régua reprovando —
       * silenciar seria cegueira; reporta como transição vinda de 'nova'. */
      if (novo.estado === 'vermelha' || novo.estado === 'divida') vermelhasNovas.push({ ...novo, era: 'nova' });
      continue;
    }
    const era = antesDe.estado, esta = novo.estado;
    if (era === 'verde' && (esta === 'vermelha' || esta === 'divida')) vermelhasNovas.push({ ...novo, era });
    if ((era === 'vermelha' || era === 'divida') && esta === 'verde') resolvidas.push({ ...novo, era });
  }
  return { vermelhasNovas, resolvidas, renames };
}

/* ── entrada do KNOWN-BUGS no gabarito (voz seca, SEM persona) ─────────────── */
export function entradaKnownBugs(item, resumo) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  return `### INVAR-${item.id} · ${item.desc}

**Sintoma (régua):** invariante \`${item.id}\` ${item.era === 'nova' ? 'nasceu VERMELHA na primeira rodada em que aparece' : `passou de VERDE para ${item.estado === 'divida' ? 'DÍVIDA' : 'VERMELHA'}`} na rodada de ${hoje}.

**Evidência (saída da régua, \`node tools/eval/invariants.mjs\`):**

${codigo(`${item.id} ${item.desc}\n${resumo}`, '')}

**Causa raiz — a investigar.** Entrada aberta automaticamente pelo caca-bug a
partir da régua; a investigação (skill \`bug-hunt\`) move esta entrada para a
seção de severidade certa e preenche causa, reprodução e mutação.

**Régua: \`tools/eval/invariants.mjs\`** — acende em \`${item.id}\`.
`;
}

/* Risca o título da entrada que cita a invariante resolvida (a mais recente
 * primeiro: entradas antigas citam ids renomeados que já não valem). */
export function riscarEntradas(md, resolvidas, renomesPara) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const linhas = md.split('\n');
  for (const r of resolvidas) {
    const de = renomesPara.get(r.id) || r.id;
    const reId = new RegExp(`(^|[^A-Za-z0-9])${de}($|[^A-Za-z0-9])`);
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      if (!/^###\s/.test(l) || l.includes('RESOLVIDO')) continue;
      if (!reId.test(l)) continue;
      const titulo = l.replace(/^###\s*/, '').replace(/^~~|~~$/g, '');
      linhas[i] = `### ~~${titulo}~~ · RESOLVIDO ${hoje} (régua verde na rodada do caca-bug)`;
      break;
    }
  }
  return linhas.join('\n');
}

/* ── issue e comentário (COM persona) ──────────────────────────────────────── */
export function corpoIssue(item, resumo) {
  const miolo = `## Invariante ${item.id} vermelha — ${item.desc}

${alerta('atencao', 'Transição de estado na régua — entra como **Relatado** no KNOWN-BUGS até alguém investigar com a skill `bug-hunt`.')}

${tabela({
    colunas: ['invariante', 'antes', 'agora'],
    linhas: [[item.id, item.era === 'nova' ? '(nova nesta rodada)' : 'VERDE', item.estado === 'divida' ? 'DÍVIDA' : 'VERMELHA']],
  })}

**Saída da régua:**

${codigo(resumo)}

> A entrada correspondente já está no \`KNOWN-BUGS.md\` (seção *Relatados*), no
> gabarito seco. Registro é do arquivo; cobrança é da issue.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

export function corpoResolucao(item) {
  const miolo = `Invariante \`${item.id}\` voltou ao VERDE na rodada de hoje. Entro no
mérito do cumprimento: a entrada no \`KNOWN-BUGS.md\` foi riscada como
RESOLVIDA e o diagnóstico ficou no arquivo (é ele que impede a próxima pessoa
de tentar de novo o que já foi refutado).

${citacao(`${item.id} — ${item.desc}`)}

Fecho automático continua humano.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

/* ── sincronização do KNOWN-BUGS ───────────────────────────────────────────── */
export function aplicarNoKnownBugs(md, { vermelhasNovas, resolvidas, renomesPara }) {
  let saida = md;
  const secaoRelatados = /\n## Relatados, ainda não reproduzidos\n/;
  const bloco = vermelhasNovas.map((v) => entradaKnownBugs(v, `${v.id} ${v.desc}`)).join('\n');
  if (bloco) {
    if (secaoRelatados.test(saida)) saida = saida.replace(secaoRelatados, `\n## Relatados, ainda não reproduzidos\n\n${bloco}`);
    else saida += `\n## Relatados, ainda não reproduzidos\n\n${bloco}`;
  }
  saida = riscarEntradas(saida, resolvidas, renomesPara);
  return saida;
}

/* ── rodada real ───────────────────────────────────────────────────────────── */
async function rodada() {
  log(`rodando a régua no repo (${CFG.invariants_cmd}) — demora 10-12 min…`);
  const r = spawnSync('sh', ['-c', CFG.invariants_cmd], { cwd: REPO_DIR, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  /* status 1 é o contrato da régua (crítica vermelha reprova o gate); o que
   * mata o parse é saída VAZIA — aí o erro precisa carregar o stderr. */
  if (!(r.stdout || '').trim()) {
    throw new Error(`régua falhou (status ${r.status}) em ${REPO_DIR} — stderr:\n${(r.stderr || '(vazio)').split('\n').slice(-8).join('\n')}`);
  }
  const agora = parseRodada(r.stdout || '');
  const arqAntes = join(ESTADO_DIR, 'ultima-rodada.json');
  if (!existsSync(arqAntes)) {
    writeFileSync(arqAntes, JSON.stringify(agora, null, 2));
    log('primeira rodada registrada — baseline estabelecida, nada a comparar');
    return;
  }
  const antes = JSON.parse(readFileSync(arqAntes, 'utf8'));
  const diff = comparar(antes, agora);
  log(`vermelhas novas: ${diff.vermelhasNovas.length} · resolvidas: ${diff.resolvidas.length} · renames: ${diff.renames.length}`);

  if (diff.renames.length) {
    const arqRenames = join(ESTADO_DIR, 'renames.json');
    const hist = existsSync(arqRenames) ? JSON.parse(readFileSync(arqRenames, 'utf8')) : [];
    writeFileSync(arqRenames, JSON.stringify([...hist, ...diff.renames.map((x) => ({ ...x, quando: new Date().toISOString() }))], null, 2));
  }
  const renomesPara = new Map(diff.renames.map((x) => [x.para, x.de]));

  const kbPath = join(REPO_DIR, CFG.known_bugs);
  const kb = readFileSync(kbPath, 'utf8');
  const kbNovo = aplicarNoKnownBugs(kb, { ...diff, renomesPara });
  if (kbNovo !== kb) {
    writeFileSync(kbPath, kbNovo);
    log('KNOWN-BUGS.md atualizado (gabarito seco; persona fora do arquivo)');
  }

  const ligPath = join(ESTADO_DIR, 'ligacoes.json');
  const ligacoes = existsSync(ligPath) ? JSON.parse(readFileSync(ligPath, 'utf8')) : {};
  for (const v of diff.vermelhasNovas) {
    const { number } = gh(['issue', 'create', '-R', CFG.repo, '--title', `[invariante] ${v.id} vermelha: ${v.desc.slice(0, 60)}`, '--body', corpoIssue(v, `${v.id} ${v.desc}\n${agora.resumo}`), '--label', 'crash-auto'], { json: false });
    const n = String(number).trim();
    ligacoes[v.id] = n;
    log(`issue #${n} aberta para ${v.id}`);
  }
  for (const item of diff.resolvidas) {
    const n = ligacoes[item.id];
    if (n) { api(`repos/${CFG.repo}/issues/${n}/comments`, 'POST', { body: corpoResolucao(item) }); log(`comentário de resolução na issue #${n}`); }
  }
  writeFileSync(ligPath, JSON.stringify(ligacoes, null, 2));
  writeFileSync(arqAntes, JSON.stringify(agora, null, 2));
  log('rodada arquivada em estado/ultima-rodada.json');
}

/* comparar A B: dois arquivos de saída (calibração offline) */
async function compararCmd(a, b) {
  const diff = comparar(parseRodada(readFileSync(a, 'utf8')), parseRodada(readFileSync(b, 'utf8')));
  console.log(JSON.stringify(diff, null, 2));
}

/* selftest: fixture com as transições que importam */
async function selftest() {
  const antes = parseRodada(`
=============== INVARIANTES — CORO SOLTO ===============

✓ PASSA   VM1  viewmodel encaixa no frame
✓ PASSA   VM9  pitch da arma acompanha a mira
✗ FALHA   TEX1 superfícies claras sem albedo
✓ PASSA   CHR1 personagens com sombra

--------------------------------------------------------
CRÍTICAS: 39/52 passam
`);
  const depois = parseRodada(`
=============== INVARIANTES — CORO SOLTO ===============

✓ PASSA   VM1  viewmodel encaixa no frame
✓ PASSA   VM20 pitch da arma acompanha a mira (novo id)
✓ PASSA   TEX1 superfícies claras sem albedo
✓ PASSA   CHR1 personagens com sombra
✗ FALHA   MAP2 rota única entre spawn e bandeira

--------------------------------------------------------
CRÍTICAS: 38/52 passam
`);
  const diff = comparar(antes, depois);
  const okRen = diff.renames.length === 1 && diff.renames[0].de === 'VM9' && diff.renames[0].para === 'VM20';
  const okNovas = diff.vermelhasNovas.length === 1 && diff.vermelhasNovas[0].id === 'MAP2';
  const okRes = diff.resolvidas.length === 1 && diff.resolvidas[0].id === 'TEX1';
  console.log(`  rename VM9→VM20: ${okRen ? '✓' : '✗ ' + JSON.stringify(diff.renames)}`);
  console.log(`  vermelha nova MAP2: ${okNovas ? '✓' : '✗ ' + JSON.stringify(diff.vermelhasNovas)}`);
  console.log(`  resolvida TEX1: ${okRes ? '✓' : '✗ ' + JSON.stringify(diff.resolvidas)}`);
  const kb = `# KNOWN-BUGS\n\n## Relatados, ainda não reproduzidos\n\n### INVAR-TEX1 · superfícies claras sem albedo\n\n**Sintoma (régua):** vermelha.\n`;
  const kb2 = aplicarNoKnownBugs(kb, { ...diff, renomesPara: new Map(diff.renames.map((x) => [x.para, x.de])) });
  const okRiscado = /~~.*TEX1.*~~ · RESOLVIDO/.test(kb2) && /### INVAR-MAP2/.test(kb2);
  console.log(`  KNOWN-BUGS: MAP2 entra seco, TEX1 riscado: ${okRiscado ? '✓' : '✗'}`);
  const okSemPersona = !/Palhaço|Proerd|bordão/.test(kb2);
  const issueTemPersona = corpoIssue(diff.vermelhasNovas[0], 'x').includes('**Proerd**');
  console.log(`  issue tem persona (${issueTemPersona}) e entrada NÃO tem (${okSemPersona})`);
  const tudo = okRen && okNovas && okRes && okRiscado && okSemPersona && issueTemPersona;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd, a, b] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'comparar' && a && b) await compararCmd(a, b);
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: fiscal.mjs rodada|comparar <antes> <depois>|selftest'); process.exit(2); }
}
