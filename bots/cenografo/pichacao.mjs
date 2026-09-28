/* pichacao.mjs — cenografo: cobre a parede pelada que a régua apontar.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: mantém a cobertura de grafite acima do piso gerando levas `or-*`
   (obra própria via OpenRouter — o caminho do ROADMAP pra aposentar o acervo
   baixado da web). Fluxo por rodada, TODO reusando o pipeline que já existe:
     1. `npm run eval:serve` no ar (porta 8123 — o census só existe no navegador);
     2. `npm run eval:grafite` → `tools/eval/graffiti_census.json` (cobertura
        por mapa = pintadas/placas);
     3. mapa abaixo do piso (config, default = as META do census) → gera K
        imagens com `tools/gen-image.mjs` (REUSO — não existe segunda chamada
        de API aqui), convenção `or-graf-*.png`, 512px, PNG;
     4. alpha-key do fundo (`tools/strip-decal-bg.mjs`) + entrada no bloco
        `or-*` do DECAL_FILES do textures.js (o bloco separado é DE PROPÓSITO);
     5. `npm run grafite` re-ASSA o layout com o pool novo;
     6. re-rodar o census: cobertura SUBIU → PR com antes/depois; não subiu →
        descarta o worktree e registra em estado/ (a régua é quem decide).
   ORÇAMENTO: máx por rodada e por semana no config; estourou, a leva fica pra
   próxima (estado/gasto.json). A chave do OpenRouter vem do env — o padrão que
   o gen-image.mjs já lê (bots/.env da casa).

   COMANDOS:
     bun pichacao.mjs rodada     o ciclo acima (noturno; abre servidor e navegador)
     bun pichacao.mjs medir      só o census → cobertura por mapa (sem gerar)
     bun pichacao.mjs selftest   fixture mínima offline
*/
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente, seco } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { tabela } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = join(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const sh = (cmd, opts = {}) => spawnSync('sh', ['-c', cmd], { cwd: REPO_DIR, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 32 * 1024 * 1024, ...opts });

/* ── cobertura ─────────────────────────────────────────────────────────────── */
export function parseCobertura(censusJson) {
  const por = {};
  for (const [mapa, d] of Object.entries(censusJson)) {
    por[mapa] = { placas: d.placas, pintadas: d.pintadas, cobertura: d.placas ? Math.round((d.pintadas / d.placas) * 100) : 0 };
  }
  return por;
}

export function selecionaMapas(cobertura, pisos) {
  return Object.entries(pisos)
    .filter(([mapa, piso]) => (cobertura[mapa]?.cobertura ?? 100) < piso)
    .map(([mapa, piso]) => ({ mapa, piso, atual: cobertura[mapa]?.cobertura ?? 0 }));
}

/* ── orçamento de tinta ────────────────────────────────────────────────────── */
export function orcamento({ jaNaSemana = 0, jaNaRodada = 0, pedidas = 0 } = {}) {
  const vagas = Math.min(CFG.max_por_rodada - jaNaRodada, CFG.max_por_semana - jaNaSemana);
  return { vagas: Math.max(0, vagas), cabe: vagas >= pedidas };
}

const SEMANA = () => {
  const d = new Date();
  const seg = new Date(d.getFullYear(), 0, 1);
  const semana = Math.ceil((((d - seg) / 86_400_000) + seg.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${String(semana).padStart(2, '0')}`;
};

function gastoSemana() {
  const arq = join(ESTADO_DIR, 'gasto.json');
  const g = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : {};
  const s = SEMANA();
  return { arquivo: arq, semana: s, total: g[s] || 0, tudo: g };
}

/* ── dimensões de PNG (IHDR) sem dependência ───────────────────────────────── */
export function dimsPng(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/* ── entrada no DECAL_FILES (bloco or-*, separado do gerado DE PROPÓSITO) ──── */
export function entradaDecal(nome, { w, h }) {
  return `    ['${nome}', ${(w / h).toFixed(3)}, 'peca', 0],`;
}

export function registraNoTextures(tex, entradas) {
  const ancora = "  DECAL_FILES.push(\n";
  if (!tex.includes(ancora)) throw new Error('bloco or-* (DECAL_FILES.push) não encontrado no textures.js — convenção mudou, ação precisa de manutenção');
  const bloco = entradas.join('\n');
  return tex.replace(ancora, `${ancora}${bloco}\n`);
}

/* ── PR com antes/depois ───────────────────────────────────────────────────── */
const PROMPTS = [
  'pixação abstrata de letras bolha, tinta spray preta e vermelha sobre fundo transparente, estilo grafite de rua brasileiro, sem texto legível, sem marca',
  'throw-up de grafite com contorno grosso e preenchimento amarelo, pressa de madrugada, estilo rua brasileiro, sem texto legível, sem marca',
  'stencil de capivara com boné, duas camadas de tinta, spray nas bordas, grafite brasileiro, sem texto, sem marca',
  'grafite abstrato orgânico em verde e azul, respingos e pingados de spray, estilo pixo brasileiro, sem texto legível, sem marca',
];

export function corpoPR({ geradas, antes, depois }) {
  const linhas = Object.keys(antes).map((m) => [m, `${antes[m]}%`, depois[m] !== undefined ? `${depois[m]}%` : '—']);
  const miolo = `## Leva or-* — cobertura de grafite

${geradas.length} imagem(ns) gerada(s) via \`tools/gen-image.mjs\` (OpenRouter, obra própria
\`or-graf-*\`), fundo com alpha-key do \`strip-decal-bg.mjs\`, registradas no bloco
\`or-*\` do \`DECAL_FILES\` e layout re-assado com \`npm run grafite\`.

**Antes/depois medido pelo \`eval:grafite\` (census no navegador):**

${tabela({ colunas: ['mapa', 'antes', 'depois'], linhas })}

${geradas.map((g) => `- \`${g.nome}\` (${g.w}×${g.h}) — ${g.prompt.slice(0, 70)}…`).join('\n')}

> A régua é quem decidiu: este PR só existe porque a cobertura SUBIU no
> re-measure. Layout novo passa pelo \`eval:grafitelayout\` do check:fast.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

/* ── servidor e census ─────────────────────────────────────────────────────── */
function garanteServe() {
  const probe = spawnSync('curl', ['-fsS', 'http://localhost:8123/mapview.html'], { encoding: 'utf8' });
  if (probe.status === 0) return null;
  const p = spawnSync('sh', ['-c', 'npm run eval:serve >/tmp/cenografo-serve.log 2>&1 & echo $!'], { cwd: REPO_DIR, encoding: 'utf8' });
  const pid = p.stdout.trim();
  for (let i = 0; i < 60; i++) {
    if (spawnSync('curl', ['-fsS', 'http://localhost:8123/mapview.html'], { encoding: 'utf8' }).status === 0) return pid;
    setTimeout(() => {}, 1000);
  }
  throw new Error('eval:serve não subiu em 60s — ver /tmp/cenografo-serve.log');
}

export async function medir() {
  sh('npm run eval:grafite');
  const census = JSON.parse(readFileSync(join(REPO_DIR, 'tools', 'eval', 'graffiti_census.json'), 'utf8'));
  return parseCobertura(census);
}

/* ── rodada ────────────────────────────────────────────────────────────────── */
async function rodada() {
  const pidServe = garanteServe();
  try {
    const antes = await medir();
    log('cobertura: ' + Object.entries(antes).map(([m, d]) => `${m} ${d.cobertura}%`).join(' · '));
    const alvo = selecionaMapas(antes, CFG.pisos);
    if (!alvo.length) { log('todos os mapas no piso — nada a pintar'); return; }
    const gasto = gastoSemana();
    const { vagas } = orcamento({ jaNaSemana: gasto.total, jaNaRodada: 0 });
    const k = Math.min(alvo.length * (CFG.imagens_por_mapa || 3), vagas);
    if (k <= 0) { log(`orçamento de tinta esgotado (semana ${gasto.semana}: ${gasto.total}/${CFG.max_por_semana}) — leva fica pra próxima`); writeFileSync(join(ESTADO_DIR, 'orcamento-esgotado.json'), JSON.stringify({ quando: new Date().toISOString(), semana: gasto.semana, gasto: gasto.total, alvo }, null, 2)); return; }

    const geradas = [];
    for (let i = 0; i < k; i++) {
      const prompt = PROMPTS[geradas.length % PROMPTS.length];
      const nome = `or-graf-${SEMANANA_SAFE()}-${String(geradas.length + 1).padStart(2, '0')}`;
      const r = sh(`${CFG.gen_image_cmd} --id ${nome} --prompt "${prompt.replace(/"/g, '\\"')}" --out public/img/decals --fmt png --w 512`);
      if (r.status !== 0) { log(`gen-image falhou pra ${nome}: ${(r.stderr || '').slice(0, 120)}`); continue; }
      const buf = readFileSync(join(REPO_DIR, 'public', 'img', 'decals', `${nome}.png`));
      const dims = dimsPng(buf);
      if (!dims) { log(`${nome}: PNG inválido — pulado`); continue; }
      geradas.push({ nome, ...dims, prompt });
    }
    if (!geradas.length) { log('nenhuma imagem gerada — rodada encerrada sem mudança'); return; }

    /* alpha-key do fundo e registro no pool */
    sh('node tools/strip-decal-bg.mjs');
    const texPath = join(REPO_DIR, 'public', 'js', 'textures.js');
    const tex = readFileSync(texPath, 'utf8');
    writeFileSync(texPath, registraNoTextures(tex, geradas.map((g) => entradaDecal(`${g.nome}.png`, g))));
    log(`${geradas.length} imagem(ns) no pool — re-assando o layout…`);
    const assa = sh('npm run grafite');
    if (assa.status !== 0) { log('npm run grafite VERMELHO — nada publicado'); writeFileSync(join(ESTADO_DIR, 'desistencia.json'), JSON.stringify({ quando: new Date().toISOString(), motivo: 'assado do layout reprovou' }, null, 2)); return; }

    const depois = await medir();
    const subiu = Object.keys(antes).some((m) => (depois[m]?.cobertura ?? 0) > antes[m].cobertura);
    if (!subiu) {
      writeFileSync(join(ESTADO_DIR, 'desistencia.json'), JSON.stringify({ quando: new Date().toISOString(), motivo: 'cobertura não subiu no re-measure', antes, depois }, null, 2));
      log('cobertura NÃO subiu — mudanças descartadas no worktree, desistência registrada');
      sh('git checkout -- public/js/textures.js public/js/graffiti_layout.js && git clean -qf public/img/decals/');
      return;
    }

    /* PR: branch com imagens + textures + layout assado */
    const data = new Date().toISOString().slice(0, 10);
    const branch = `cenografo/grafite-${data}`;
    sh(`git checkout -q -B ${branch} origin/main`);
    sh('git add public/img/decals/or-graf-*.png public/js/textures.js public/js/graffiti_layout.js');
    const envG = { ...process.env, GIT_AUTHOR_NAME: 'csbrasil-bot', GIT_AUTHOR_EMAIL: 'csbrasil-bot@users.noreply.github.com', GIT_COMMITTER_NAME: 'csbrasil-bot', GIT_COMMITTER_EMAIL: 'csbrasil-bot@users.noreply.github.com' };
    const c = spawnSync('git', ['commit', '-q', '-m', `feat(grafite): leva or-* — cobertura sobe (${geradas.length} peça(s))`, '-s', '--trailer', 'Agent: cenografo'], { cwd: REPO_DIR, encoding: 'utf8', env: envG });
    if (c.status !== 0) { log('commit falhou: ' + (c.stderr || '').slice(0, 120)); return; }
    if (seco()) log(`[dry-run] push/PR de ${branch} pulados`);
    else {
      sh(`git push -q origin HEAD:refs/heads/${branch}`);
      gh(['pr', 'create', '-R', CFG.repo, '--base', 'main', '--head', branch,
        '--title', `feat(grafite): leva or-* — cobertura de grafite sobe`,
        '--body', corpoPR({ geradas, antes: Object.fromEntries(Object.entries(antes).map(([m, d]) => [m, d.cobertura])), depois: Object.fromEntries(Object.entries(depois).map(([m, d]) => [m, d.cobertura])) })]);
    }
    const g = gastoSemana();
    g.tudo[g.semana] = (g.tudo[g.semana] || 0) + geradas.length;
    writeFileSync(g.arquivo, JSON.stringify(g.tudo, null, 2));
    log(`rodada fechada: ${geradas.length} peça(s), PR ${seco() ? '(dry-run) ' : ''}${branch}`);
  } finally {
    if (pidServe) sh(`kill ${pidServe} 2>/dev/null`);
  }
}

const SEMANANA_SAFE = () => SEMANA().replace('-S', '-s');

async function selftest() {
  const cobertura = parseCobertura({ quebrada: { placas: 100, pintadas: 60 }, piscina_treta: { placas: 100, pintadas: 80 } });
  const alvo = selecionaMapas(cobertura, CFG.pisos);
  const okSel = alvo.length === 1 && alvo[0].mapa === 'quebrada' && alvo[0].atual === 60;
  const o1 = orcamento({ jaNaSemana: 0, jaNaRodada: 0, pedidas: 6 });
  const o2 = orcamento({ jaNaSemana: CFG.max_por_semana - 2, jaNaRodada: 0, pedidas: 6 });
  const okOrc = o1.cabe && !o2.cabe && o2.vagas === 2;
  const tex = '  DECAL_FILES.push(\n    [\'or-graf-treta.png\', 1.99, \'peca\', 0],\n';
  const tex2 = registraNoTextures(tex, [entradaDecal('or-graf-nova.png', { w: 512, h: 256 })]);
  const okTex = tex2.includes("['or-graf-nova.png', 2.000, 'peca', 0]") && !tex2.includes('DECAL_FILES.push(\n\n');
  const png = Buffer.from('89504e470d0a1a0a0000000d494844520000020000000100080600000' + '0'.repeat(20), 'hex');
  void png;
  const corpo = corpoPR({ geradas: [{ nome: 'or-graf-s01-01', w: 512, h: 512, prompt: 'pixação abstrata' }], antes: { quebrada: 60 }, depois: { quebrada: 68 } });
  const okPR = corpo.includes('**Skatista**') && /^\| quebrada\s*\| 60%\s*\| 68%\s*\|$/m.test(corpo) && /— \*.*\* 🛹/.test(corpo);
  console.log(`  mapa abaixo do piso selecionado: ${okSel ? '✓' : '✗ ' + JSON.stringify(alvo)}`);
  console.log(`  orçamento de tinta (rodada/semana): ${okOrc ? '✓' : '✗'}`);
  console.log(`  entrada no bloco or-* do DECAL_FILES: ${okTex ? '✓' : '✗'}`);
  console.log(`  PR com antes/depois e persona: ${okPR ? '✓' : '✗'}`);
  const tudo = okSel && okOrc && okTex && okPR;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'medir') { garanteServe(); const c = await medir(); console.log(tabela({ colunas: ['mapa', 'cobertura'], linhas: Object.entries(c).map(([m, d]) => [m, `${d.cobertura}% (${d.pintadas}/${d.placas})`]) })); }
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: pichacao.mjs rodada|medir|selftest'); process.exit(2); }
}
