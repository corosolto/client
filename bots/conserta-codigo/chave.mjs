/* chave.mjs — conserta-codigo: fixes mecânicos com prova local, PR com persona.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: complemento do estraga-codigo. Lê (a) os ACHADOS persistidos das
   reviews (bots/estraga-codigo/estado/reviews/) e (b) vermelhas de classe
   mecânica, e conserta SÓ as classes enumeradas em acoes/*.md (TEX1, número
   duplicado, cache-bust). Pra cada achado elegível:
     branch fix/<classe>-<slug> → LLM devolve substituições EXATAS (antigo→novo,
     casamento 1:1) → worktree isolado → gate da ação (régua local) →
     VERDE: PR citando o achado de origem · VERMELHO: descarta e registra em
     estado/desistencias.jsonl com o motivo.

   RESTRIÇÕES DURAS (do plano, não estilo):
     · régua não verde ⇒ NUNCA abre PR;
     · máximo N PRs simultâneos (config max_prs, começa em 2);
     · nunca toca arquivo fora dos globs da ação de origem;
     · NUNCA aprova nem faz merge. PR sai como csbrasil-bot (GH_PAT_ESCREVE) e
       é comentado pelo estraga-codigo pela OUTRA conta (GH_PAT_FALA) — papéis
       auditáveis; o gate real continua sendo o CI.

   COMANDOS:
     bun chave.mjs rodada           processa insumos pendentes
     bun chave.mjs selftest         fixture TEX1 pelo pipeline (offline)
*/
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { perguntar } from '../lib/llm.mjs';
import { criarCliente } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { carregarAcoes, picomatchLite } from '../lib/acoes.mjs';
import { alerta } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = join(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);

const ACAO_POR_CLASSE = () => {
  const acoes = carregarAcoes(join(RAIZ, 'acoes'));
  return new Map(acoes.map((a) => [a.cfg.classe, a]));
};

/* ── insumos ───────────────────────────────────────────────────────────────── */
export function achadosDoEstraga(dirBots) {
  const dir = join(dirBots, 'estraga-codigo', 'estado', 'reviews');
  if (!existsSync(dir)) return [];
  const jaFeitos = new Set(feitos().map((f) => f.origem));
  return readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => {
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    return (r.achados || []).map((a) => ({ ...a, origem: `review PR #${r.pr}`, origemArquivo: f }));
  }).filter((a) => !jaFeitos.has(origemKey(a)));
}

const ESTADO_FEITOS = () => join(ESTADO_DIR, 'feitos.json');
function feitos() { return existsSync(ESTADO_FEITOS()) ? JSON.parse(readFileSync(ESTADO_FEITOS(), 'utf8')) : []; }

/* chave estável do achado: arquivo+ação+título — re-rodada não repete PR */
export function origemKey(a) {
  return `${a.arquivo}|${a.acao || ''}|${(a.titulo || '').toLowerCase().slice(0, 50)}`;
}

/* ── elegibilidade: classe mecânica + glob da ação ─────────────────────────── */
export function elegiveis(achados, acaoPorClasse) {
  return achados.filter((a) => {
    if (!a.arquivo) return false;
    const acao = acaoPorClasse.get(classeDe(a));
    if (!acao) return false;
    return acao.quando.some((g) => g === '**' || picomatchLite(g, a.arquivo));
  }).map((a) => ({ ...a, acao: acaoPorClasse.get(classeDe(a)) }));
}

/* classe do achado: TEX1 vem do caca-bug/invariante; do estraga, o nome da ação
 * da revisão (leis-da-casa acusa número duplicado; frontend-publico, cache-bust). */
export function classeDe(a) {
  if (/^TEX\d/i.test(a.id || '')) return 'TEX1';
  const titulo = a.titulo || '';
  if (/albedo|superf[íi]cie clara|sem textura/i.test(titulo)) return 'TEX1';
  if (/n[úu]mero.*(m[ãa]o|duas|duplicad)|duplicad.*n[úu]mero/i.test(titulo)) return 'NUM';
  if (/cache|\?v=|version\.js diverg/i.test(titulo)) return 'CACHE';
  return null;
}

/* ── prompt e aplicação de edições ─────────────────────────────────────────── */
export function promptDeCorrecao(arquivo, conteudo, achado) {
  return `Você conserta UM defeito mecânico num arquivo do repositório CS BRASIL / CORO SOLTO.
Regras da casa no conserto: comentário novo no máx 2 linhas; sem narrativa; sem mudar código fora do defeito; português.

DEFEITO APONTADO NA REVISÃO: ${achado.titulo}
${achado.corpo || ''}

ARQUIVO COMPLETO \`${arquivo}\`:
\`\`\`
${conteudo}
\`\`\`

Responda SOMENTE JSON: {"substituicoes":[{"antigo":"trecho EXATO do arquivo, copiado byte a byte, único no arquivo","novo":"trecho corrigido"}]}
Mínimo de substituições que resolve o defeito. Se não é esta classe ou não dá pra consertar com substituição exata: {"substituicoes":[]}`;
}

export function aplicarEdicoes(texto, substituicoes) {
  const aplicadas = [];
  for (const s of substituicoes) {
    if (typeof s.antigo !== 'string' || typeof s.novo !== 'string' || !s.antigo || s.antigo === s.novo) continue;
    const ocorre = texto.split(s.antigo).length - 1;
    if (ocorre !== 1) continue;   // 1:1 ou nada
    texto = texto.replace(s.antigo, s.novo);
    aplicadas.push(s);
  }
  return { texto, aplicadas };
}

/* ── PR com persona citando a origem ───────────────────────────────────────── */
export function corpoPR(e, { gate, log: logGate }) {
  const miolo = `## Conserto mecânico — classe \`${e.acao.cfg.classe}\`

**Origem:** ${e.origem} · achado _"${e.titulo.slice(0, 80)}"_.

${e.aplicadas.map((s) => `- \`${s.antigo.slice(0, 60)}\` → \`${s.novo.slice(0, 60)}\``).join('\n')}

${alerta('dica', `**Prova local:** \`${gate}\` verde no worktree — a régua da classe decidiu que este PR existe.`)}

\`\`\`
${(logGate || '').split('\n').slice(-6).join('\n')}
\`\`\`

Arquivos tocados dentro dos globs da ação \`${e.acao.nome}\` (\`${e.acao.quando.join(', ')}\`) — nada fora deles.
Revisão do Palhaço Mal e o CI continuam sendo o portão: este PR é proposta, não aprovação.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

const desistencia = (motivo) => appendFileSync(join(ESTADO_DIR, 'desistencias.jsonl'),
  JSON.stringify({ quando: new Date().toISOString(), motivo }) + '\n');

async function prsAbertosDoBot() {
  const prs = gh(['pr', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '50', '--json', 'number,headRefName,author'], { json: true });
  return prs.filter((p) => (p.author?.login || '') === 'csbrasil-bot' || (p.headRefName || '').startsWith('fix/'));
}

/* ── rodada ────────────────────────────────────────────────────────────────── */
async function rodada() {
  const acaoPorClasse = ACAO_POR_CLASSE();
  const abertos = await prsAbertosDoBot().catch(() => []);
  if (abertos.length >= (CFG.max_prs || 2)) { log(`${abertos.length} PR(s) aberto(s) — teto de ${CFG.max_prs}; rodada para por aqui`); return; }
  const achados = elegiveis(achadosDoEstraga(join(RAIZ, '..')), acaoPorClasse);
  log(`${achados.length} achado(s) elegível(is) de classe mecânica`);
  let vagas = (CFG.max_prs || 2) - abertos.length;
  for (const e of achados) {
    if (vagas <= 0) { log('teto de PRs simultâneos atingido — o resto fica pra próxima'); break; }
    const conteudo = (() => { try { return readFileSync(join(REPO_DIR, e.arquivo), 'utf8'); } catch { return null; } })();
    if (conteudo === null || conteudo.length > 120_000) { desistencia({ origem: origemKey(e), motivo: 'arquivo ausente ou gigante' }); continue; }
    log(`consertando ${e.arquivo} (${e.acao.cfg.classe})…`);
    const r = await perguntar(promptDeCorrecao(e.arquivo, conteudo, e), { cfg: CFG, dirBot: RAIZ });
    let edits = [];
    try { edits = JSON.parse(r).substituicoes || []; } catch { edits = []; }
    if (!edits.length) { desistencia({ origem: origemKey(e), motivo: 'LLM devolveu sem substituições' }); log('  sem substituições — registrado e pulado'); continue; }

    const { texto, aplicadas } = aplicarEdicoes(conteudo, edits);
    if (!aplicadas.length) { desistencia({ origem: origemKey(e), motivo: 'nenhuma substituição casou 1:1' }); log('  nada casou 1:1 — desistido'); continue; }
    const gate = e.acao.cfg.gate || CFG.gate_padrao;

    const branch = `fix/${e.acao.cfg.classe.toLowerCase()}-${e.arquivo.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
    const wt = `/tmp/conserta-wt/${Date.now()}`;
    spawnSync('git', ['-C', REPO_DIR, 'fetch', '-q', 'origin', 'main'], { encoding: 'utf8' });
    execFileSync('git', ['-C', REPO_DIR, 'worktree', 'add', '-q', '--detach', wt, 'origin/main'], { stdio: 'ignore' });
    try {
      const caminho = join(wt, e.arquivo);
      /* hard: arquivo fora do glob da ação NÃO é tocado nem lido */
      if (!e.acao.quando.some((g) => g === '**' || picomatchLite(g, e.arquivo))) throw new Error('arquivo fora dos globs — abortado antes de escrever');
      writeFileSync(caminho, texto);
      const g = spawnSync('sh', ['-c', gate], { cwd: wt, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 32 * 1024 * 1024 });
      if (g.status !== 0) {
        desistencia({ origem: origemKey(e), motivo: `gate VERMELHO (${gate})` });
        log(`  gate VERMELHO — conserto descartado, registrado`);
        continue;
      }
      const bot = { login: 'csbrasil-bot' };
      const envG = { ...process.env, GIT_AUTHOR_NAME: bot.login, GIT_AUTHOR_EMAIL: 'csbrasil-bot@users.noreply.github.com', GIT_COMMITTER_NAME: bot.login, GIT_COMMITTER_EMAIL: 'csbrasil-bot@users.noreply.github.com' };
      execFileSync('git', ['add', e.arquivo], { cwd: wt, env: envG });
      execFileSync('git', ['commit', '-q', '-m', `fix(${e.acao.cfg.classe.toLowerCase()}): ${e.titulo.slice(0, 60)}`, '-s', '--trailer', `Agent: conserta-codigo`], { cwd: wt, env: envG });
      if (process.env.GH_DRY_RUN) { log(`  [dry-run] push/PR de ${branch} pulados`); }
      else {
        execFileSync('git', ['push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { cwd: wt, env: envG });
        gh(['pr', 'create', '-R', CFG.repo, '--base', 'main', '--head', branch,
          '--title', `fix(${e.acao.cfg.classe.toLowerCase()}): ${e.titulo.slice(0, 60)}`,
          '--body', corpoPR({ ...e, aplicadas }, { gate, log: (g.stdout || '') })]);
      }
      const f = feitos(); f.push({ origem: origemKey(e), branch, quando: new Date().toISOString() });
      writeFileSync(ESTADO_FEITOS(), JSON.stringify(f, null, 2));
      vagas--;
      log(`  → ${process.env.GH_DRY_RUN ? '(dry-run) ' : ''}PR ${branch}`);
    } finally {
      execFileSync('git', ['-C', REPO_DIR, 'worktree', 'remove', '--force', wt], { stdio: 'ignore' });
    }
  }
}

async function selftest() {
  /* fixture TEX1: arquivo com cor clara, revisão apontando, substituição exata,
   * gate simulado verde, PR com persona — tudo offline (provedor fixture). */
  const acoes = carregarAcoes(join(RAIZ, 'acoes'));
  const classe = new Map(acoes.map((a) => [a.cfg.classe, a]));
  const achado = { arquivo: 'public/js/map_teste.js', titulo: 'parede clara gigante sem albedo', corpo: 'BoxGeometry 12m sem textura com cor #eeeeee.', acao: 'mapas', origem: 'review PR #999' };
  const elegivel = elegiveis([achado], classe);
  const okEleg = elegivel.length === 1 && elegivel[0].acao.cfg.classe === 'TEX1';
  const fora = elegiveis([{ ...achado, arquivo: 'src/pages/index.astro' }], classe);
  const okFora = fora.length === 0;
  const conteudo = 'const teto = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0xeeeeee }));\n';
  const r = await perguntar(promptDeCorrecao(achado.arquivo, conteudo, achado), { cfg: CFG, dirBot: RAIZ });
  let subs = [];
  try { subs = JSON.parse(r).substituicoes; } catch { }
  const { texto, aplicadas } = aplicarEdicoes(conteudo, subs);
  const okEdit = aplicadas.length >= 1 && texto !== conteudo && !texto.includes('0xeeeeee');
  const corpo = corpoPR({ ...achado, acao: classe.get('TEX1'), aplicadas }, { gate: 'npm run syntax', log: 'ok verde' });
  const okPR = corpo.includes('**Chave**') && corpo.includes('review PR #999') && /— \*.*\* 🔧/.test(corpo);
  console.log(`  TEX1 elegível pelo glob do mapa: ${okEleg ? '✓' : '✗'}`);
  console.log(`  arquivo fora do glob NÃO é elegível: ${okFora ? '✓' : '✗'}`);
  console.log(`  substituição exata aplicada (1:1): ${okEdit ? '✓' : '✗'}`);
  console.log(`  PR com persona e origem citada: ${okPR ? '✓' : '✗'}`);
  const tudo = okEleg && okFora && okEdit && okPR;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: chave.mjs rodada|selftest'); process.exit(2); }
}
