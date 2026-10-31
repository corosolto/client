/* canarinho.mjs — revisor de PR/commit da casa, advisory, LLM local.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: uma conta-bot (estraga-codigo) que escuta PRs e pushes diretos
   no repo do jogo, roda cada diff por AÇÕES de revisão estreitas (aca/*.md,
   cada uma mira uma classe de defeito que esta base já pagou — ver KNOWN-BUGS)
   e posta o veredito como review no GitHub. Achado grave vira REQUEST_CHANGES e
   fio não resolvido trava o merge (branch protection da main exige conversa resolvida).

   O QUE NÃO FAZ, DE PROPÓSITO: não repete o que as réguas determinísticas já
   pegam de graça no CI (sintaxe, docs, ARCH, travessão). O canarinho é o 30%
   semântico — falso verde, limiar duplicado, invariante sem mutação.

   COMANDOS:
     node canarinho.mjs poll              daemon: comentários, PRs e pushes na main
     node canarinho.mjs review 300        revisa no primeiro repo e POSTA
     node canarinho.mjs review 300 --repo=corosolto/backend
     node canarinho.mjs replay 300        idem, mas NÃO posta (calibração)
     node canarinho.mjs commits           revisa pushes diretos na main não-merge
     node canarinho.mjs selftest          fixture mínima pelo pipeline inteiro
   ───────────────────────────────────────────────────────────────────────────── */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { perguntar } from '../lib/llm.mjs';
import { criarCliente } from '../lib/gh.mjs';
import { meuEstadoDir } from '../lib/estado.mjs';
import { carregarPersona, cabecalho, assinatura, instrucaoDeTom } from '../lib/persona.mjs';
import { alerta, barra, codigo, grafoMermaid } from '../lib/formatacao.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));

function reposDoConfig(cfg) {
  if (!Array.isArray(cfg.repos) || cfg.repos.length === 0)
    throw new Error('config.json precisa de "repos": ["owner/repo", ...]');
  const repos = [...new Set(cfg.repos.map((repo) => String(repo).trim()).filter(Boolean))];
  if (repos.some((repo) => !/^[^/\s]+\/[^/\s]+$/.test(repo)))
    throw new Error('cada item de "repos" precisa estar no formato owner/repo');
  return repos;
}
const REPOS = reposDoConfig(CFG);
const REPO_PRINCIPAL = REPOS[0];
const chavePr = (repo, n) => `${repo}#${n}`;
const chaveComentario = (repo, id) => `${repo}#${id}`;
const ASSOCIACOES_AUTORIZADAS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

function comandosPendentes(repo, comentarios, processados) {
  return comentarios
    .filter((comentario) => ASSOCIACOES_AUTORIZADAS.has(comentario.author_association))
    .filter((comentario) => String(comentario.body || '').split(/\r?\n/).some((linha) =>
      linha.trim().toLowerCase() === '@estraga-codigo full review'))
    .filter((comentario) => !processados.has(chaveComentario(repo, comentario.id)))
    .map((comentario) => ({
      id: comentario.id,
      key: chaveComentario(repo, comentario.id),
      number: Number(String(comentario.issue_url || '').match(/\/issues\/(\d+)$/)?.[1]),
    }))
    .filter((comando) => Number.isInteger(comando.number) && comando.number > 0)
    .sort((a, b) => b.id - a.id);
}
const PERSONA = carregarPersona(RAIZ);
/* Estado FORA do volume externo: sob launchd o node leva EPERM ao abrir para
 * escrita qualquer coisa em /Volumes/Zenith (TCC), e sem gravar o head revisado
 * o canarinho re-revisava o mesmo PR para sempre. ESTADO_DIR manda; o padrão é
 * ~/.local/state/corosolto/estraga-codigo/ — ver bots/lib/estado.mjs. */
const ESTADO_DIR = meuEstadoDir('estraga-codigo', {
  legado: join(RAIZ, 'estado'),
  migrar: ['estado.json', 'reviews', 'dry-run'],
});
if (!existsSync(join(ESTADO_DIR, 'reviews'))) mkdirSync(join(ESTADO_DIR, 'reviews'), { recursive: true });
const ESTADO_ARQ = join(ESTADO_DIR, 'estado.json');
const estadoLido = existsSync(ESTADO_ARQ) ? JSON.parse(readFileSync(ESTADO_ARQ, 'utf8')) : {};
const estado = {
  prs: estadoLido.prs || {},
  main: typeof estadoLido.main === 'object' && estadoLido.main !== null
    ? estadoLido.main
    : { [REPO_PRINCIPAL]: estadoLido.main || null },
  comandos: estadoLido.comandos || {},
};
const estadoPr = (repo, n) =>
  estado.prs[chavePr(repo, n)] || (repo === REPO_PRINCIPAL ? estado.prs[n] : undefined);
const salvar = () => writeFileSync(ESTADO_ARQ, JSON.stringify(estado, null, 2));

/* Cliente GitHub da casa: PAT por pat_env (config.json), keychain de fallback
 * (compat com o token já instalado na máquina) e GH_DRY_RUN opcional para
 * calibração manual — ver bots/lib/gh.mjs. */
const { gh, api, gq, dry } = criarCliente({
  patEnv: CFG.pat_env || 'GH_PAT_FALA',
  keychain: CFG.keychain || null,
  estadoDir: ESTADO_DIR,
  repo: REPO_PRINCIPAL,
});
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);

/* ── ações: cada aca/*.md é frontmatter (nome, quando: globs) + prompt ───────── */
import { carregarAcoes, picomatchLite } from '../lib/acoes.mjs';
const acoes = carregarAcoes(join(RAIZ, 'acoes'));

const acoesPara = (arquivos) => acoes.filter((a) =>
  a.quando.some((g) => g === '**' || arquivos.some((f) => picomatchLite(g, f))));

/* ── diff e contexto ────────────────────────────────────────────────────────── */
/* bots/ não se revisa: o bot mora no repo que revisa e o caminho interno
 * vazaria contexto dos próprios payloads (o motivo do extinto repo externo).
 * public/docs/ é BUILD do Docusaurus (bundle minificado e HTML gerado): o
 * LLM "lê" versão dentro de minificado e inventa defeito — o falso grave do
 * e-mail de 18/08 sobre o bump .155. Fonte se revisa, artefato não. */
const IGNORAR = /^(tools\/eval\/ARCH\.md|graphify-out\/|docs\/.*gerado|public\/docs\/|bots\/)/;

/* O humor do contrato às vezes vaza prosa ao redor do JSON: fence ```json,
 * olá-eu-sou-o-bot, reticências… Extrai o PRIMEIRO objeto balanceado (contagem
 * de chaves) em vez de regex gulosa — dois blocos de código na resposta
 * costumavam virar um JSON inválido colado. */
function extraiJson(texto) {
  const fence = texto.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const base = fence ? fence[1] : texto;
  let prof = 0, ini = -1, emStr = false, esc = false;
  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = emStr; continue; }
    if (c === '"') { emStr = !emStr; continue; }
    if (emStr) continue;
    if (c === '{') { if (prof === 0) ini = i; prof++; }
    else if (c === '}') { prof--; if (prof === 0 && ini >= 0) {
      try { return JSON.parse(base.slice(ini, i + 1)); } catch { ini = -1; }
    } }
  }
  return null;
}

function diffDoPr(repo, n) {
  /* `gh pr diff` morre em 406 acima de 300 arquivos — cai pra API de files
   * (paginada) e monta um diff equivalente por patch. */
  try {
    const diff = gh(['pr', 'diff', String(n), '-R', repo]);
    const arquivos = [...diff.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((m) => m[2]);
    return { diff, arquivos };
  } catch {
    const arquivos = []; const pedacos = [];
    for (let pag = 1; pag <= 10; pag++) {
      const fs = api(`repos/${repo}/pulls/${n}/files?per_page=100&page=${pag}`);
      if (!fs.length) break;
      for (const f of fs) { arquivos.push(f.filename); pedacos.push(`diff --git a/${f.filename} b/${f.filename}\n${f.patch || '(binário/sem patch)'}`); }
      if (fs.length < 100) break;
    }
    return { diff: pedacos.join('\n'), arquivos };
  }
}

const CONTRATO = `
Você é o estraga-codigo, revisor de código do repositório CS BRASIL / CORO SOLTO —
um bot piazão de feira de projeto brasileiro de sátira. Você fala PORTUGUÊS BRASILEIRO
com humor de rua: debochado, direto, sem formalidade de enterprise — mas o CONTEÚDO
da revisão é técnico e cirúrgico. A piada mora no RÓTULO, nunca no lugar do achado.

${instrucaoDeTom(PERSONA)}

Responda SOMENTE com um bloco JSON válido, sem prosa antes ou depois:
{"resumo":"1-3 frases: O QUE este diff faz (para quem só viu o título). Sem julgamento, sem piada aqui","risco":"baixo|médio|alto — risco do diff INTEIRO para a produção (raio de blast: o que quebra, para quem, quando)","nota":<0 a 10: qualidade global do diff como está hoje>,"impactoCruzado":["quem consome o que mudou e pode quebrar — SÓ o que o diff e a lista de importadores fornecida sustentam; vazio se nada"],"descobertas":[{"arquivo":"caminho","linha":<número da linha NOVA do diff ou null>,"severidade":"major"|"minor","confianca":"baixa"|"média"|"alta","titulo":"<=60 chars. Técnico e específico; UMA sátira no máximo em TODO o review, e só se nascer natural do defeito","corpo":"2-5 frases TÉCNICAS: o defeito, a consequência REAL (o que quebra, quando, para quem). Sem piada aqui","conserto":"PROMPT DE CORREÇÃO acionável: 1-3 frases imperativas dizendo EXATAMENTE o que mudar/rodar para consertar (quem ler copia e executa). Obrigatório quando o conserto é conhecido; null só quando não houver conserto honesto","patch":"snippet do conserto em formato unified diff MINÚSCULO (2-8 linhas, prefixo - na linha removida, + na adicionada, extraídas do diff) ou null","mutacao":"como reintroduzir o defeito, se aplicar"}]}

VOCABULÁRIO DA CASA (português, sempre): portão (nunca "gate"), régua (nunca "check"),
invariante, portão verde/vermelho, arnês. Nome de ferramenta fica como é (diff, PR,
commit, workflow, build, smoke) — e NUNCA dentro de piada: termo técnico e graça
não dividem frase.

FLUXO: antes de concluir, siga o fluxo — quem chama o que mudou, em que ordem,
com que estado. Defeito de fluxo (chamada antes da inicialização, efeito colateral
em módulo importado, ordem de declaração no boot do main.js) é achado como outro
qualquer, com severidade honesta.

VOZ: seca, direta, cirúrgica. O título descreve o defeito com precisão ("regex só
casa 'postgres' minúsculo") e a graça, quando existe, é consequência do defeito —
nunca rótulo engraçado procurando defeito pra enfeitar. Piada forcida é pior que
silêncio: "achado engraçado sem defeito embaixo" vira ruído e mata revisor.

LIMITES DO HUMOR: nada de xingamento real, politicamente incorreto, pessoa real
(político, jogador de futebol, youtuber), copyright. Sátira de situação, nunca de
pessoa. Na dúvida, técnico e seco.

REGRAS DE CONFIANÇA (falso positivo custa mais que silêncio):
- ANTES de reportar, CONFIRA a afirmação contra o próprio diff. Exemplo real de
  erro que não se repete: dizer que /postgres(?:ql)?/i "não casa postgresql" é
  falso — ela casa. Se a alegação depende de comportamento que você não consegue
  verificar letra a letra no diff, NÃO reporte.
- Comente só o que você defenderia de olho: defeito de lógica, invariante furada,
  regressão de caso documentado, risco real de quebra. Pergunta de gosto não é achado.
- NADA de estilo, formatação ou pergunta retórica.
- Comentário longo de régua em tools/ NÃO é violação: é o padrão da casa (procedência mora no cabeçalho).
- Linha deve existir no lado NOVO do diff. Sem certeza da linha exata: linha null.
- Confiança "alta" só quando o defeito, a linha e a correção podem ser defendidos
  diretamente pelo diff. Dúvida, dependência externa ou hipótese = média/baixa.
- Achou nada? {"resumo":"...","descobertas":[]}. Não invente. Defeito nenhum = sem piada.`;

/* Fatia o diff em pedaços ALINHADOS A ARQUIVO (nunca corta um arquivo no meio).
 * Motivo medido no PR #301: 413 arquivos · 697 KB de patch — o `slice(0,120k)`
 * antigo mostrava 17% do diff ao LLM e os achados moravam todos na fatia
 * alfabética que ele alcançava. Cada pedaço carrega sua lista de arquivos. */
const KB = 1024;
function fatiaDiff(diff, tamanho = 100 * KB) {
  const partes = diff.split(/^(?=diff --git )/m).filter((p) => p.trim());
  const pedacos = [];
  let atual = [], bytes = 0;
  for (const p of partes) {
    if (bytes + p.length > tamanho && atual.length) { pedacos.push(atual.join('\n')); atual = []; bytes = 0; }
    atual.push(p); bytes += p.length;
  }
  if (atual.length) pedacos.push(atual.join('\n'));
  return pedacos;
}
const arquivosDoPedaco = (pedaco) =>
  [...pedaco.matchAll(/^diff --git a\/\S+ b\/(\S+)$/gm)].map((m) => m[1]);

/* Grafo de importação de public/js: mora em bots/lib/grafo.mjs (compartilhado
 * com o podador); reexportado daqui porque os testes e o fix importam daqui. */
export { grafoDeImports, importadoresDe } from '../lib/grafo.mjs';
import { importadoresDe } from '../lib/grafo.mjs';


async function revisar({ diff, arquivos }, { rotulo }) {
  const ativas = acoesPara(arquivos);
  const pedacos = fatiaDiff(diff);
  const conhecidos = new Set(arquivos);
  const achados = [];
  const importadores = importadoresDe(arquivos);
  const blocoGrafo = importadores.length
    ? `\n\n=== IMPACTO CRUZADO — grafo local de public/js (quem importa os arquivos mudados) ===\n${importadores.map((i) => `${i.modulo} ← ${i.importadores.join(', ')}`).join('\n')}`
    : '';
  let resumo = '';
  let risco = null;
  const notas = [];
  const impacto = [];
  for (const a of ativas) {
    /* cada ação só vê pedaços com arquivo do seu interesse — a genérica (**)
     * vê tudo, mas com teto de pedaços pra não virar sopro de tokens */
    const meus = pedacos.filter((p) => {
      const fs = arquivosDoPedaco(p);
      return a.quando.some((g) => g === '**' || fs.some((f) => picomatchLite(g, f)));
    }).slice(0, a.quando.includes('**') ? (CFG.max_pedacos || 8) : 4);
    if (!meus.length) continue;
    process.stderr.write(`  [${rotulo}] ação ${a.nome} (${meus.length}/${pedacos.length} pedaço(s))… `);
    let daAcao = 0;
    for (const pedaco of meus) {
      try {
        /* contexto cruzado: ações seguintes sabem o que as primeiras já pegaram
         * — a duplicata da regex do postgres (PR #299, 2 ações, mesmo achado)
         * morre aqui em vez de virar ruído na review */
        const feitos = achados.length ? `\n\n=== JÁ APONTADOS (não repita, nem reformulado) ===\n${achados.map((x) => `- ${x.arquivo}: ${x.titulo}`).join('\n')}` : '';
        const prompt = `${CONTRATO}\n\n=== AÇÃO: ${a.nome} ===\n${a.prompt}\n\n=== ARQUIVOS DESTE PEDACO ===\n${arquivosDoPedaco(pedaco).join('\n')}${feitos}${blocoGrafo}\n\n=== DIFF (PARCIAL DO PR) ===\n${pedaco}`;
        const r = await perguntar(prompt, { cfg: CFG, dirBot: RAIZ });
        const d = extraiJson(r);
        if (d && typeof d.resumo === 'string' && d.resumo.trim() && !resumo) resumo = d.resumo.trim();
        if (d && typeof d.risco === 'string' && RISCO_ORDEM[d.risco.toLowerCase()] !== undefined
          && (risco === null || RISCO_ORDEM[d.risco.toLowerCase()] > RISCO_ORDEM[risco])) risco = d.risco.toLowerCase();
        if (d && typeof d.nota === 'number' && d.nota >= 0 && d.nota <= 10) notas.push(d.nota);
        if (d && Array.isArray(d.impactoCruzado)) for (const x of d.impactoCruzado) if (typeof x === 'string' && x.trim()) impacto.push(x.trim());
        if (d && Array.isArray(d.descobertas)) {
          for (const x of d.descobertas) {
            if (!x || !x.titulo) continue;
            /* arquivo tem que existir no PR — nome forjado de pedaço truncado
             * é alucinação (o fio "arquivo i" do #301) e morre aqui */
            if (!conhecidos.has(x.arquivo)) continue;
            if (x.severidade !== 'major' && x.severidade !== 'minor') continue;
            if (IGNORAR.test(x.arquivo)) continue;
            achados.push({ ...x, acao: a.nome });
            daAcao++;
          }
        }
      } catch (e) { process.stderr.write(`✗(${String(e.message).split('\n')[0].slice(0, 60)}) `); }
    }
    process.stderr.write(`${daAcao} achado(s)\n`);
  }
  /* dedupe por arquivo+titulo parecido e teto global — veredito legível > sopro de dados */
  const vistos = new Set();
  const lista = achados
    .sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === 'major' ? -1 : 1))
    .filter((x) => {
      const k = x.linha ? `${x.arquivo}|L${x.linha}` : `${x.arquivo}|${(x.titulo || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32)}`;
      if (vistos.has(k)) return false; vistos.add(k); return true;
    })
    .slice(0, CFG.max_descobertas);
  const nota = notas.length ? +(notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : null;
  return { resumo, achados: lista, risco, nota, impacto };
}
const RISCO_ORDEM = { baixo: 0, médio: 1, medio: 1, alto: 2 };

export function decisaoPublicacao(achados = []) {
  const bloqueadores = achados.filter((x) => x.severidade === 'major'
    && /^(alta|high)$/i.test(String(x.confianca || ''))
    && Number.isInteger(x.linha) && x.linha > 0
    && typeof x.conserto === 'string' && x.conserto.trim().length > 0);
  return {
    publicar: bloqueadores.length > 0,
    achados: bloqueadores,
    observacoes: achados,
    silenciados: achados.length - bloqueadores.length,
    motivo: bloqueadores.length ? 'bloqueador grave, verificável e acionável' : 'nenhum bloqueador com confiança alta'
  };
}

/* Mapa da mudança (estilo walkthrough): área → quantos arquivos, com exemplos.
 * Determinístico, do próprio diff — nada de LLM pra contar arquivo. */
const AREA = (f) => /^public\/js\/map_/.test(f) ? 'mapas' : /^public\/js\//.test(f) ? 'jogo' : /^src\/(pages\/api|lib)/.test(f) ? 'backend' : /^src\//.test(f) ? 'site' : /^(\.github|scripts\/ci)/.test(f) ? 'CI' : /^tools\//.test(f) ? 'arnês' : /\.(md)$/.test(f) ? 'docs' : /^(public\/(models|img|audio))/.test(f) ? 'assets' : 'outros';
function mapaDaMudanca(arquivos) {
  const por = new Map();
  for (const f of arquivos) { const a = AREA(f); if (!por.has(a)) por.set(a, []); por.get(a).push(f); }
  const linhas = [...por.entries()].sort((x, y) => y[1].length - x[1].length)
    .map(([a, fs]) => `- **${a}** (${fs.length}): ${fs.slice(0, 4).map((f) => `\`${f.split('/').pop()}\``).join(', ')}${fs.length > 4 ? ' …' : ''}`);
  return `### mapa da mudança\n${linhas.join('\n')}`;
}

/* Títulos de review limpa: rotaciona pra não virar spam visual. */
const LIMPO = [
  'pente fino passado: nenhum achado que eu defenda em voz alta',
  'nada aqui que quebre amanhã. amanhã é outro diff',
  'limpo pelos critérios das minhas ações desta rodada',
];

/* Corpo da revisão: mapa + resumo + veredito em caixa + achados (grave/leve) +
 * impacto cruzado com GRAFO mermaid. Cada peça do GitHub que renderiza bem é
 * usada no que ela é: caixa colorida pro veredito, grafo pro relacionamento,
 * citação pra mutação — e nenhuma piada divide frase com termo técnico. */
function corpoReview(achados, { resumo = '', arquivos = [], risco = null, nota = null, impacto = [] } = {}) {
  const mapa = arquivos.length ? `\n${mapaDaMudanca(arquivos)}\n` : '';
  const oquee = resumo ? `${alerta('nota', `**o que faz:** ${resumo}`)}\n\n` : '';
  const por = { major: [], minor: [] };
  for (const x of achados) por[x.severidade].push(x);
  const riscoFinal = (risco && RISCO_ORDEM[risco] !== undefined ? risco
    : por.major.length >= 2 ? 'alto' : por.major.length === 1 ? 'médio' : 'baixo');
  const notaFinal = typeof nota === 'number' ? nota
    : Math.max(0, Math.min(10, 10 - 2 * por.major.length - 0.5 * por.minor.length));
  const caixaRisco = { alto: 'perigo', 'médio': 'atencao', baixo: 'dica' }[riscoFinal] || 'nota';
  const veredito = alerta(caixaRisco, `**Risco ${riscoFinal.toUpperCase()}** · nota ${notaFinal}/10 \`${barra(notaFinal)}\`${por.major.length ? `\n${por.major.length} achado(s) grave(s) — resolve antes do merge.` : ''}`);
  const importadores = importadoresDe(arquivos);
  const arestas = importadores.slice(0, 6).flatMap((i) => i.importadores.slice(0, 3).map((de) => ({ de, para: i.modulo })));
  const linhasImpacto = impacto.filter(Boolean).slice(0, 6).map((x) => `- ${x.replace(/^-\s*/, '')}`);
  const blocoImpacto = (arestas.length || linhasImpacto.length)
    ? `\n### impacto cruzado\n\n${arestas.length ? `${grafoMermaid(arestas)}\n\n` : ''}${linhasImpacto.join('\n')}${linhasImpacto.length ? '\n' : ''}\n*(grafo local de \`public/js\`, uma rodada atrás do head do PR.)*\n`
    : '';

  if (!achados.length) {
    return `${cabecalho(PERSONA)}\n\n${mapa}\n${oquee}${veredito}\n\n${LIMPO[Math.floor(Math.random() * LIMPO.length)]}\n\n> Revisão de bot — fio não resolvido TRAVA o merge (a main exige conversa resolvida). Resolve ou refuta.\n\n${blocoImpacto}---\n${assinatura(PERSONA)}`;
  }
  /* patch do LLM só sobe se PARECE diff (tem linha +/-): fence solto sem
   * sintaxe não pinta nada no GitHub — a cor do conserto vem da linguagem. */
  const sanitizaPatch = (p) => {
    const t = String(p || '').replace(/^```diff\s*|```\s*$/g, '').trim();
    return /^[+-]/m.test(t) ? t : null;
  };
  const item = (x) => {
    const onde = `\`${x.arquivo}${x.linha ? ':' + x.linha : ''}\``;
    const mut = x.mutacao ? `\n  > mutação sugerida: \`${x.mutacao}\`` : '';
    const conserto = x.conserto ? `\n  💡 **conserto:** ${x.conserto}` : '';
    const patch = sanitizaPatch(x.patch) ? `\n  ${codigo(sanitizaPatch(x.patch), 'diff')}` : '';
    return `- **${x.titulo}** — ${onde} _(ação: ${x.acao})_\n  ${x.corpo}${conserto}${patch}${mut}`;
  };
  const abre = por.major.length
    ? `**${por.major.length} grave${por.major.length > 1 ? 's' : ''} · ${por.minor.length} leve${por.minor.length === 1 ? '' : 's'}**`
    : `**${por.minor.length} leve${por.minor.length === 1 ? '' : 's'}**`;
  const blocos = [];
  if (por.major.length) blocos.push(`### 🔴 graves (${por.major.length})\n\n${por.major.map(item).join('\n')}`);
  if (por.minor.length) blocos.push(`### 🟡 leves (${por.minor.length})\n\n${por.minor.map(item).join('\n')}`);
  return `${cabecalho(PERSONA)}\n\n${mapa}\n${oquee}${abre}\n\n${veredito}\n\n> Revisão de bot — fio não resolvido TRAVA o merge (a main exige conversa resolvida). Resolve ou refuta.\n\n${blocos.join('\n\n')}\n${blocoImpacto}\n---\nResolve ou refuta nos fios — refutado com razão, eu caio fora.\n\n${assinatura(PERSONA)}`;
}

function postaReview(repo, n, pr, meta, arquivos, { marcador = '' } = {}) {
  const { achados } = meta;
  const body = `${corpoReview(achados, { ...meta, arquivos })}${marcador ? `\n\n${marcador}` : ''}`;
  const rotuloSev = { major: 'grave', minor: 'leve' };
  /* REQUEST_CHANGES com achado grave: com a main protegida por "require
   * resolved conversations", fio do bot não resolvido TRAVA o merge — era o
   * contrato antigo "comenta, não bloqueia", aposentado a pedido do dono. */
  const evento = achados.some((x) => x.severidade === 'major') ? 'REQUEST_CHANGES' : 'COMMENT';
  /* comentário inline no diff: o conserto viaja junto — [!TIP] renderiza
   * caixa VERDE e o fence diff pinta as linhas. É o prompt de correção que
   * o dono pediu: quem lê copia e executa, não decifra. */
  const comments = achados.filter((x) => x.linha).map((x) => {
    const corpo = `**[${rotuloSev[x.severidade]}] ${x.titulo}**\n\n${x.corpo}`;
    const conserto = x.conserto ? `\n\n${alerta('dica', `**conserto:** ${x.conserto}`)}` : '';
    const patch = (() => {
      const t = String(x.patch || '').replace(/^```diff\s*|```\s*$/g, '').trim();
      return /^[+-]/m.test(t) ? `\n\n${codigo(t, 'diff')}` : '';
    })();
    const mut = x.mutacao ? `\n\n> mutação: \`${x.mutacao}\`` : '';
    return { path: x.arquivo, line: x.linha, body: corpo + conserto + patch + mut };
  });
  try {
    api(`repos/${repo}/pulls/${n}/reviews`, 'POST', { commit_id: pr.headRefOid, body, event: evento, comments });
  } catch {
    /* linha fora do diff (422): publica tudo no corpo — fio não se perde por causa de índice */
    api(`repos/${repo}/pulls/${n}/reviews`, 'POST', { commit_id: pr.headRefOid, body, event: evento });
  }
}

function registraReview(repo, n, pr, meta, decisao, publicada) {
  const quando = new Date().toISOString();
  estado.prs[chavePr(repo, n)] = { head: pr.headRefOid, quando, publicada };
  // Só bloqueadores qualificados alimentam o conserta-codigo. Todo o resto
  // fica como observação local para calibrar o revisor sem poluir GitHub.
  const nomeRepo = repo.replace('/', '-');
  writeFileSync(join(ESTADO_DIR, 'reviews', `${nomeRepo}-pr-${n}.json`), JSON.stringify({
    repo,
    pr: n,
    head: pr.headRefOid,
    quando,
    achados: decisao.achados,
    observacoes: meta.achados,
    publicacao: { publicada, silenciados: decisao.silenciados, motivo: decisao.motivo }
  }, null, 2));
  salvar();
}

async function reviewPr(repo, n, {
  seco = false,
  forcar = false,
  permitirDraft = false,
  publicarSempre = false,
  marcador = '',
} = {}) {
  const pr = gh(['pr', 'view', String(n), '-R', repo, '--json', 'number,title,headRefOid,isDraft,baseRefName'], { json: true });
  if (pr.isDraft && CFG.pular_drafts && !permitirDraft) return console.log(`${repo} PR ${n} é draft — pulado`);
  const ja = estadoPr(repo, n)?.head === pr.headRefOid;
  if (ja && !seco && !forcar) return console.log(`${repo} PR ${n} head ${pr.headRefOid.slice(0, 8)} já revisado`);
  console.log(`${repo} PR ${n}: ${pr.title}`);
  const { diff, arquivos } = diffDoPr(repo, n);
  const meta = await revisar({ diff, arquivos }, { rotulo: `${repo} PR ${n}` });
  console.log(corpoReview(meta.achados, { ...meta, arquivos }));
  /* O replay existe para CALIBRAR, e calibrar sem saber se aquilo iria ao ar é
   * meio exercício: o que decide a publicação não é o achado, é o filtro de
   * decisaoPublicacao (major + confiança alta + linha + conserto). Mostra o
   * veredito que teria acontecido, e a ficha crua de cada achado. */
  if (seco) {
    const d = decisaoPublicacao(meta.achados);
    for (const x of meta.achados) console.log(`  · ${x.severidade}/${x.confianca} L${x.linha ?? '—'} ${x.arquivo}: ${x.titulo}`);
    console.log(`(replay: nada foi postado — a decisão real seria ${d.publicar ? 'POSTAR' : 'SILÊNCIO'}: ${d.motivo}; ${d.achados.length} bloqueador(es), ${d.silenciados} silenciado(s))`);
    return;
  }
  const decisao = decisaoPublicacao(meta.achados);
  if (decisao.publicar || publicarSempre) {
    postaReview(repo, n, pr, { ...meta, achados: decisao.achados }, arquivos, { marcador });
    registraReview(repo, n, pr, meta, decisao, true);
    console.log(`→ review ${decisao.publicar ? 'bloqueante ' : ''}postada em ${repo}#${n}`);
  } else {
    registraReview(repo, n, pr, meta, decisao, false);
    console.log(`→ silencioso no GitHub: ${decisao.silenciados} observação(ões) registrada(s) localmente`);
  }
}

/* Pushes DIRETOS na main (não-merge) também são diff — comentário no commit. */
async function reviewCommits(repo, { seco = false } = {}) {
  const ultimo = estado.main[repo];
  if (!ultimo) {
    estado.main[repo] = gh(['api', `repos/${repo}/commits/main`], { json: true }).sha;
    salvar();
    return;
  }
  const lista = gh(['api', `repos/${repo}/commits?sha=main&per_page=15`], { json: true })
    .filter((c) => c.sha !== ultimo)
    .filter((c) => c.parents.length === 1)   // merge tem 2 pais: veio de PR revisada
    /* bump de release é commit de MÁQUINA (gerado por tools/gen-docs no CI):
     * revisá-lo é auto-revisão de pipeline — o e-mail com falso grave do
     * 18/08 (bump .155) nasceu aqui. O que ele contém volta como PR depois. */
    .filter((c) => !/^chore\(release\):/.test(c.commit.message))
    .reverse();
  for (const c of lista) {
    /* estado.main avança por commit processado, DENTRO do loop: um erro no
     * meio não pode deixar o mesmo commit re-revisado (e re-comentado) pra
     * sempre — era o loop infinito do "poll: achados is not defined". */
    try {
      console.log(`${repo} commit direto ${c.sha.slice(0, 8)}: ${c.commit.message.split('\n')[0]}`);
      const det = gh(['api', `repos/${repo}/commits/${c.sha}`], { json: true });
      const arquivos = det.files.map((f) => f.filename);
      const diff = det.files.map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch || ''}`).join('\n');
      const meta = await revisar({ diff, arquivos }, { rotulo: `${repo} ${c.sha.slice(0, 8)}` });
      const decisao = decisaoPublicacao(meta.achados);
      if (decisao.publicar && !seco)
        api(`repos/${repo}/commits/${c.sha}/comments`, 'POST', { body: corpoReview(decisao.achados, { ...meta, arquivos }) });
      else if (meta.achados.length) console.log(corpoReview(meta.achados, { ...meta, arquivos }));
      console.log(`→ ${meta.achados.length} observação(ões), ${decisao.achados.length} publicável(is)`);
    } catch (e) { console.error(`  commit ${c.sha.slice(0, 8)}: ${String(e.message).split('\n')[0]}`); }
    estado.main[repo] = c.sha;
    salvar();
  }
  estado.main[repo] = gh(['api', `repos/${repo}/commits/main`], { json: true }).sha;
  salvar();
}

const marcadorComando = (id) => `<!-- estraga-codigo:full-review:${id} -->`;

async function processaComandos(repo, numerosAbertos) {
  const comentarios = api(`repos/${repo}/issues/comments?sort=created&direction=desc&per_page=100`);
  const pendentes = comandosPendentes(repo, comentarios, new Set(Object.keys(estado.comandos)));
  for (const comando of pendentes) {
    if (!numerosAbertos.has(comando.number)) continue;
    const marcador = marcadorComando(comando.id);
    const reviews = api(`repos/${repo}/pulls/${comando.number}/reviews?per_page=100`);
    if (reviews.some((review) => String(review.body || '').includes(marcador))) {
      estado.comandos[comando.key] = { pr: comando.number, quando: new Date().toISOString() };
      salvar();
      continue;
    }
    log(`comando full review: ${repo}#${comando.number} (comentário ${comando.id})`);
    try {
      await reviewPr(repo, comando.number, {
        forcar: true,
        permitirDraft: true,
        publicarSempre: true,
        marcador,
      });
      estado.comandos[comando.key] = { pr: comando.number, quando: new Date().toISOString() };
      salvar();
    } catch (e) {
      console.error(`comando ${repo}#${comando.number}:`, String(e.message).split('\n')[0]);
    }
  }
}

async function pollRepo(repo) {
  try {
    const prs = gh(['pr', 'list', '-R', repo, '--state', 'open', '--limit', '100', '--json', 'number'], { json: true });
    const numerosAbertos = new Set(prs.map(({ number }) => number));
    await processaComandos(repo, numerosAbertos);
    for (const { number } of prs) await reviewPr(repo, number);
    await reviewCommits(repo);
  } catch (e) {
    console.error(`poll ${repo}:`, String(e.message).split('\n')[0]);
  }
}

async function poll() {
  console.log(`canarinho poll: ${REPOS.join(', ')} a cada ${CFG.intervalo_min} min (Ctrl+C para)`);
  for (;;) {
    await Promise.all(REPOS.map(pollRepo));
    await new Promise((r) => setTimeout(r, CFG.intervalo_min * 60_000));
  }
}

/* selftest: fixture com DUAS violações reais das leis da casa — o pipeline tem
   que devolver JSON com pelo menos 1 major. Não posta nada. */
async function selftest() {
  const diff = `diff --git a/tools/eval/foo-check.mjs b/tools/eval/foo-check.mjs
@@ -10,6 +10,9 @@
+const TETO = 7;   // 7 portões hoje — atualizar quando mudar
+if (falhas.length) process.exit(1);
+// Esta régua nasceu porque em 12/08 três PRs passaram verde com o portão
+// quebrado; a investigação completa está descrita aqui e levou dois dias.
diff --git a/public/js/game.js b/public/js/game.js
@@ -1,3 +1,4 @@
+const BALAS = 26;   // 26 armas no registro`;
  const { achados } = await revisar({ diff, arquivos: ['tools/eval/foo-check.mjs', 'public/js/game.js'] }, { rotulo: 'selftest' });
  const ok = achados.length >= 1 && achados.some((x) => x.severidade === 'major');
  console.log(achados.map((x) => `  ${x.severidade}: ${x.titulo} (${x.arquivo})`).join('\n') || '  (nenhum achado)');
  console.log(ok ? '✓ SELFTEST verde' : '✗ SELFTEST: fixture com defeito conhecido passou — revisor cego');
  process.exit(ok ? 0 : 1);
}

/* ══ MODO FIX: revisa, CORRIGE o que der, valida nas réguas locais e abre PR ════
 * Fluxo: review normal → achados major acionáveis → LLM recebe o arquivo COMPLETO
 * + o achado e devolve substituições EXATAS (antigo→novo) → aplica num WORKTREE
 * isolado (nunca na árvore de trabalho de ninguém) → roda o gate do config
 * (syntax/docs/arch, segundos) → verde: branch estraga/fix-<n> + PR filho
 * referenciando o original. Vermelho ou edição que não casa: descarta e fica só
 * o comentário. O bot NÃO força nada: se o conserto não passa nas réguas da
 * casa, ele não sobe. */
async function corrigirEdits(achados, { getArquivo }) {
  const alvos = achados.filter((x) => x.severidade === 'major' && x.arquivo && x.corpo).slice(0, CFG.fix_max || 3);
  const edits = [];
  for (const x of alvos) {
    const conteudo = await getArquivo(x.arquivo);
    if (conteudo === null || conteudo.length > 120_000) continue;   // arquivo gigante: só comenta
    const prompt = `Você conserta UM defeito num arquivo do repositório CS BRASIL / CORO SOLTO.
Regras da casa no conserto: comentário novo no máx 2 linhas (só invariante que nomes não expressem); sem narrativa; sem mudar código fora do defeito; português.

DEFEITO APONTADO NA REVISÃO: ${x.titulo}
${x.corpo}

ARQUIVO COMPLETO \`${x.arquivo}\`:
\`\`\`
${conteudo}
\`\`\`

Responda SOMENTE JSON: {"substituicoes":[{"antigo":"trecho EXATO do arquivo, copiado byte a byte, único no arquivo","novo":"trecho corrigido"}]}
Mínimo de substituições que resolve o defeito. Se o defeito não é real ou não dá pra consertar assim: {"substituicoes":[]}`;
    process.stderr.write(`  [fix] ${x.arquivo}: pedindo edição… `);
    const r = await perguntar(prompt, { cfg: CFG, dirBot: RAIZ });
    const d = extraiJson(r);
    if (d && Array.isArray(d.substituicoes)) {
      for (const s of d.substituicoes) {
        if (typeof s.antigo === 'string' && typeof s.novo === 'string' && s.antigo && s.antigo !== s.novo)
          edits.push({ arquivo: x.arquivo, antigo: s.antigo, novo: s.novo, titulo: x.titulo });
      }
      process.stderr.write(`${d.substituicoes.length} substituição(ões)\n`);
    } else process.stderr.write('sem JSON — pulado\n');
  }
  return edits;
}

async function fixar(n, pr, achados) {
  execFileSync('git', ['fetch', 'origin', `refs/heads/${pr.headRefName}`], { stdio: 'ignore' });
  const getArquivo = async (f) => {
    try { return execFileSync('git', ['show', `${pr.headRefName}:${f}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); }
    catch { return null; }
  };
  const edits = await corrigirEdits(achados, { getArquivo });
  if (!edits.length) { console.log('nada acionável pra consertar — review advisory fica valendo'); return; }

  /* worktree isolado: a árvore de trabalho de quem estiver no repo não é tocada */
  const wt = `/tmp/estraga-wt/pr-${n}-${Date.now()}`;
  const branch = `estraga/fix-${n}`;
  execFileSync('git', ['worktree', 'add', '-b', branch, wt, pr.headRefName], { stdio: 'ignore' });
  try {
    const aplicadas = [];
    for (const e of edits) {
      const p = join(wt, e.arquivo);
      if (!existsSync(p)) continue;
      const t = readFileSync(p, 'utf8');
      const ocorre = t.split(e.antigo).length - 1;
      if (ocorre !== 1) { process.stderr.write(`  [fix] pulado (antigo casa ${ocorre}× em ${e.arquivo})\n`); continue; }
      writeFileSync(p, t.replace(e.antigo, e.novo));
      aplicadas.push(e);
    }
    if (!aplicadas.length) { console.log('nenhuma edição casou 1:1 — nada a subir'); return; }

    /* gate local: as réguas da casa decidem se o conserto sobe */
    const gate = spawnSync('sh', ['-c', CFG.gate_cmd || 'npm run syntax'], { cwd: wt, encoding: 'utf8', timeout: 900_000, maxBuffer: 32 * 1024 * 1024 });
    if (gate.status !== 0) {
      console.log(`gate VERMELHO no worktree — conserto descartado (o comentário da revisão fica no PR):\n${(gate.stdout || gate.stderr || '').split('\n').slice(-6).join('\n')}`);
      return;
    }

    const bot = api('user');
    const mail = `${bot.id}+${bot.login}@users.noreply.github.com`;
    const msg = `fix(pr#${n}): ${aplicadas[0].titulo.slice(0, 60)}\n\nConserto do estraga-codigo a partir da revisão advisory do PR #${n}.`;
    const envG = { ...process.env, GIT_AUTHOR_NAME: bot.login, GIT_AUTHOR_EMAIL: mail, GIT_COMMITTER_NAME: bot.login, GIT_COMMITTER_EMAIL: mail };
    execFileSync('git', ['add', '-A'], { cwd: wt, env: envG });
    execFileSync('git', ['commit', '-m', msg, '-s', '--trailer', `Agent: estraga-codigo`], { cwd: wt, env: envG });
    try {
      if (dry()) { log(`   [dry-run] push de ${branch} pulado — GH_DRY_RUN ativo`); return; }
      execFileSync('git', ['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: wt, env: envG });
    } catch {
      log('   ✗ push falhou — o bot precisa de role WRITE no repo (hoje: read) e PAT com scope repo');
      log('     convide em: Settings → Collaborators → estraga-codigo → role Write');
      log('     (o comentário da revisão já foi postado; o conserto ficou no worktree descartado)');
      return;
    }
    const prFilho = api(`repos/${REPO_PRINCIPAL}/pulls`, 'POST', {
      title: `fix(pr#${n}): ${aplicadas[0].titulo.slice(0, 60)}`,
      head: branch, base: pr.headRefName,
      body: `Conserto automático do **estraga-codigo** para ${aplicadas.length} achado(s) **major** da revisão advisory do #${n}.\n\n${aplicadas.map((e) => `- ${e.titulo} (\`${e.arquivo}\`)`).join('\n')}\n\nGate local no worktree: \`${CFG.gate_cmd || 'npm run syntax'}\` verde.\n\n---\nRevisão de humano ainda vale — o bot passou pelas réguas, não pelo teu olho.`,
    });
    log(`   → PR filho aberto: ${prFilho.html_url}`);
    return prFilho;
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', wt], { stdio: 'ignore' });
  }
}

async function fixPr(n) {
  const pr = gh(['pr', 'view', String(n), '-R', REPO_PRINCIPAL, '--json', 'number,headRefName,headRefOid,baseRefName'], { json: true });
  log(`fix ${REPO_PRINCIPAL} PR ${n} (head ${pr.headRefOid.slice(0, 8)})`);
  const { diff, arquivos } = diffDoPr(REPO_PRINCIPAL, n);
  const { achados } = await revisar({ diff, arquivos }, { rotulo: `fix ${REPO_PRINCIPAL}#${n}` });
  return fixar(n, pr, decisaoPublicacao(achados).achados);
}

/* ══ WAR-ROOM: a noite inteira escaneando PR por PR, fio por fio ═════════════
 * Cada passada por PR mostra: CI, fios abertos de REVISOR-BOT (CodeRabbit,
 * Greptile, nós mesmos), revisão própria, conserto com gate e PR filho.
 * --uma-rodada faz UMA passada (cron/launchd-friendly) e sai. */
const BOTS_REVISOR = /^(coderabbitai|greptile-apps|greptile|estraga-codigo)(\[bot\])?$/i;

async function threadsDoPr(n) {
  const [owner, repo] = REPO_PRINCIPAL.split('/');
  const q = `query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:50){nodes{id isResolved comments(first:30){nodes{author{login} body replies(first:30){nodes{author{login}}}}}}}}}}`;
  return gq(q, { o: owner, r: repo, n })?.data?.repository?.pullRequest?.reviewThreads?.nodes || [];
}

async function varre(n, { seco = false } = {}) {
  const pr = gh(['pr', 'view', String(n), '-R', REPO_PRINCIPAL, '--json', 'number,title,headRefOid,isDraft,baseRefName,statusCheckRollup'], { json: true });
  log(`── ${REPO_PRINCIPAL} PR #${n} · ${pr.title.slice(0, 64)} (${pr.headRefOid.slice(0, 8)})`);
  if (pr.isDraft && CFG.pular_drafts) return log('     draft — pulado');
  const roll = pr.statusCheckRollup || [];
  const vermelhos = roll.filter((c) => c.conclusion === 'FAILURE' || c.state === 'FAILURE').length;
  log(`     CI: ${roll.length - vermelhos}/${roll.length} verde${vermelhos ? ` · ${vermelhos} VERMELHO` : ''}`);
  const threads = await threadsDoPr(n).catch(() => []);
  const abertos = threads.filter((t) => !t.isResolved);
  const esperando = abertos.filter((t) => {
    const nos = [...(t.comments?.nodes || []), ...(t.comments?.nodes || []).flatMap((c) => c.replies?.nodes || [])];
    const ultimo = nos[nos.length - 1];
    return BOTS_REVISOR.test(ultimo?.author?.login || '');
  });
  log(`     fios: ${abertos.length} aberto(s) · ${esperando.length} com revisor-bot na última palavra`);
  const { diff, arquivos } = diffDoPr(REPO_PRINCIPAL, n);
  const meta = await revisar({ diff, arquivos }, { rotulo: `varre ${REPO_PRINCIPAL}#${n}` });
  const achados = meta.achados;
  const decisao = decisaoPublicacao(achados);
  log(`     revisão: ${achados.length} achado(s)${achados.length ? ' — ' + achados.map((x) => `[${x.severidade}] ${x.titulo.slice(0, 40)}`).join(' · ') : ' 🎉'}`);
  if (seco) return log('     (seco: sem post, sem push)');
  const novo = estadoPr(REPO_PRINCIPAL, n)?.head !== pr.headRefOid;
  if (novo && decisao.publicar) {
    postaReview(REPO_PRINCIPAL, n, pr, { ...meta, achados: decisao.achados }, arquivos);
    registraReview(REPO_PRINCIPAL, n, pr, meta, decisao, true);
    log('     → review bloqueante postada');
  } else if (novo) {
    registraReview(REPO_PRINCIPAL, n, pr, meta, decisao, false);
    log(`     → GitHub silencioso (${decisao.silenciados} observação(ões) local(is))`);
  }
  if (decisao.achados.length) await fixar(n, pr, decisao.achados);
}

async function warroom({ umaRodada = false, seco = false } = {}) {
  console.log('\x1b[2m' + '═'.repeat(72) + '\x1b[0m');
  console.log('  ESTraga-código WAR-ROOM · ' + REPO_PRINCIPAL + (umaRodada ? ' · 1 rodada' : ' · Ctrl+C para sair') + (seco ? ' · SECO (sem post)' : ' · REAL (posta e corrige)'));
  console.log('\x1b[2m' + '═'.repeat(72) + '\x1b[0m');
  for (;;) {
    try {
      const prs = gh(['pr', 'list', '-R', REPO_PRINCIPAL, '--state', 'open', '--limit', '30', '--json', 'number'], { json: true });
      log(`${prs.length} PR(s) aberto(s)`);
      for (const { number } of prs) await varre(number, { seco }).catch((e) => log(`  erro PR ${number}: ${String(e.message).split('\n')[0]}`));
      await reviewCommits(REPO_PRINCIPAL, { seco }).catch((e) => log('  erro commits:', String(e.message).split('\n')[0]));
    } catch (e) { log('rodada falhou:', String(e.message).split('\n')[0]); }
    if (umaRodada) break;
    log(`zZZ — próxima rodada em ${CFG.intervalo_min} min`);
    await new Promise((r) => setTimeout(r, CFG.intervalo_min * 60_000));
  }
}

const [cmd, arg, ...flags] = process.argv.slice(2);
const seco = flags.includes('--seco') || cmd === 'replay';
const repoCli = flags.find((flag) => flag.startsWith('--repo='))?.slice('--repo='.length) || REPO_PRINCIPAL;
/* Guard de CLI: importado pelo teste, não dispara comando nenhum. */
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (!REPOS.includes(repoCli)) throw new Error(`repo não configurado: ${repoCli}`);
  if (cmd === 'poll') await poll();
  else if (cmd === 'review') await reviewPr(repoCli, Number(arg), { forcar: flags.includes('--force'), permitirDraft: flags.includes('--force'), publicarSempre: flags.includes('--force') });
  else if (cmd === 'replay') await reviewPr(repoCli, Number(arg), { seco: true });
  else if (cmd === 'fix') await fixPr(Number(arg));
  else if (cmd === 'varre') await varre(Number(arg), { seco: flags.includes('--seco') });
  else if (cmd === 'warroom') await warroom({ umaRodada: flags.includes('--uma-rodada'), seco: flags.includes('--seco') });
  else if (cmd === 'commits') await reviewCommits(repoCli, { seco });
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: canarinho.mjs poll|review <n> [--repo=owner/repo] [--force]|replay <n> [--repo=owner/repo]|fix <n>|varre <n>|warroom [--uma-rodada]|commits [--repo=owner/repo]|selftest'); process.exit(2); }
}

/* Exportados para o teste offline (testes/teste.mjs) — tudo puro ou local. */
export { extraiJson, corpoReview, fatiaDiff, arquivosDoPedaco, acoesPara, acoes, IGNORAR, reposDoConfig, chavePr, comandosPendentes };
